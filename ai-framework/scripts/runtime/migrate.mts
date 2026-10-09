import type { RuntimeDeps } from "./types.mts";

export interface EntryMigration {
  path: string;
  status: "ready" | "applied" | "manual";
  reason?: string;
}
interface Change extends EntryMigration { before: string; after: string; mode: number }
const FILES = ["AGENTS.md", "CLAUDE.md", ".claude/settings.json", ".codex/hooks.json"];
const MAX_BYTES = 1024 * 1024;
const SCRIPT_NAMES = "add-skill|browser-runtime|bundle-sync|changelog|docs-links|entry-import|graphify|orca-policy|orca-preflight|pitch-archive|pitch-compress|review-bench|setup-validator|skill-compress-guard|skill-defaults|skill-registry|skill-source|skill-sync|skill-vendors|state-render|state-snapshot|state-theme|workflow-doctor";
const REFERENCES = new RegExp(`ai-framework/scripts/(?:${SCRIPT_NAMES})\\.js\\b|ai-framework/hooks/scripts/(?:metrics-lock|pre-ship-verify|stuck-uphill-detector|token-consumption|token-report)\\.js\\b|\\.claude/hooks/post-edit-check\\.js\\b|\\.opencode/plugins/token-consumption\\.js\\b`, "g");

/** Cooperating project directories are required, as for the bundle's other managed writes. */
function regular(root: string, relative: string, deps: RuntimeDeps): string {
  let current = root;
  const parts = relative.split("/");
  for (let index = 0; index < parts.length; index++) {
    current = deps.path.join(current, parts[index]);
    const stat = deps.fs.lstatSync(current);
    if (stat.isSymbolicLink() || (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())) throw new Error("path is not a regular project file");
    if (index === parts.length - 1 && stat.size > MAX_BYTES) throw new Error("file exceeds the migration size limit");
  }
  return current;
}

function target(reference: string): string {
  return reference.replace(/\.js$/, reference.startsWith(".opencode/plugins/") ? ".ts" : ".mts");
}

function replace(value: string, sourceRoot: string, deps: RuntimeDeps): string {
  return value.replace(REFERENCES, (reference) => {
    regular(sourceRoot, target(reference), deps);
    return target(reference);
  });
}

function migrateHooks(value: unknown, sourceRoot: string, deps: RuntimeDeps): { changed: boolean; manual: boolean } {
  let changed = false;
  let manual = false;
  const visit = (item: unknown): void => {
    if (!item || typeof item !== "object") return;
    if (Array.isArray(item)) { item.forEach(visit); return; }
    const object = item as Record<string, unknown>;
    if (object.type === "command" && typeof object.command === "string") {
      const command = object.command;
      REFERENCES.lastIndex = 0;
      if (REFERENCES.test(command)) {
        // Only direct Node/Bun commands are understood. Preserve wrappers and compound shell programs.
        const direct = /^(node|bun)((?:\s+--[\w=-]+)*)(\s+)("[^"\r\n]+"|'[^'\r\n]+'|[^\s"']+)(?=\s|$)/.exec(command);
        if (!direct || /[;|\r\n]|&&/.test(command)) { manual = true; return; }
        const operand = direct[4];
        const quote = operand.startsWith('"') || operand.startsWith("'") ? operand[0] : "";
        const executable = quote ? operand.slice(1, -1) : operand;
        REFERENCES.lastIndex = 0;
        const reference = REFERENCES.exec(executable);
        // A workflow filename used as an argument is not permission to change a custom executable.
        if (!reference || reference.index + reference[0].length !== executable.length || (reference.index > 0 && executable[reference.index - 1] !== "/") || executable.startsWith("/")) { manual = true; return; }
        try {
          regular(sourceRoot, target(reference[0]), deps);
          const entry = `${quote}${executable.slice(0, reference.index)}${target(reference[0])}${quote}`;
          const flags = direct[1] === "node" && !/(?:^|\s)--experimental-strip-types(?:\s|$)/.test(direct[2]) ? `${direct[2]} --experimental-strip-types --disable-warning=ExperimentalWarning` : direct[2];
          const after = `${direct[1]}${flags}${direct[3]}${entry}${command.slice(direct[0].length)}`;
          object.command = after;
          changed ||= after !== command;
        } catch { manual = true; }
      }
    }
    Object.values(object).forEach(visit);
  };
  visit(value);
  return { changed, manual };
}

/** Return paths/statuses only: settings content and command values never enter sync output. */
export function migrateInstanceEntries(root: string, sourceRoot: string, apply: boolean, deps: RuntimeDeps): EntryMigration[] {
  const project = deps.fs.realpathSync(root);
  const source = deps.fs.realpathSync(sourceRoot);
  const result: EntryMigration[] = [];
  const changes: Change[] = [];
  for (const relative of FILES) {
    let file: string;
    try { file = regular(project, relative, deps); }
    catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") continue;
      result.push({ path: relative, status: "manual", reason: "unsafe or unreadable instance file; merge workflow paths manually" });
      continue;
    }
    try {
      const before = deps.fs.readFileSync(file);
      let after: string;
      if (relative.endsWith(".json")) {
        const parsed: unknown = JSON.parse(before);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid hook configuration");
        const migration = migrateHooks((parsed as Record<string, unknown>).hooks, source, deps);
        if (migration.manual) result.push({ path: relative, status: "manual", reason: "custom hook command or missing replacement; merge that hook manually" });
        if (!migration.changed) continue;
        after = `${JSON.stringify(parsed, null, 2)}\n`;
      } else after = replace(before, source, deps);
      if (after !== before) changes.push({ path: relative, status: "ready", before, after, mode: deps.fs.statSync(file).mode & 0o777 });
    } catch {
      result.push({ path: relative, status: "manual", reason: "invalid instance content or missing replacement; merge workflow paths manually" });
    }
  }
  for (const change of changes) {
    if (!apply) { result.push({ path: change.path, status: "ready" }); continue; }
    const temporary = `${change.path}.tmp-${deps.crypto.randomUUID()}`;
    let created = false;
    try {
      const destination = regular(project, change.path, deps);
      if (deps.fs.readFileSync(destination) !== change.before) throw new Error("instance file changed during sync");
      const fd = deps.fs.openSync(deps.path.join(project, temporary), "wx", change.mode);
      created = true;
      try { deps.fs.writeFileSync(fd, change.after); deps.fs.fchmodSync(fd, change.mode); }
      finally { deps.fs.closeSync(fd); }
      // Recheck both paths immediately before the atomic rename; never follow a replaced ancestor.
      regular(project, temporary, deps);
      regular(project, change.path, deps);
      if (deps.fs.readFileSync(destination) !== change.before) throw new Error("instance file changed during sync");
      deps.fs.renameSync(deps.path.join(project, temporary), destination);
      created = false;
      result.push({ path: change.path, status: "applied" });
    } catch {
      result.push({ path: change.path, status: "manual", reason: "instance file changed or could not be updated; merge workflow paths manually" });
    } finally {
      if (created) {
        // Cleanup is allowed only while its path still resolves through plain project directories.
        try { deps.fs.unlinkSync(regular(project, temporary, deps)); }
        catch { /* Leave an unsafe temporary path alone; the manual result above records the failure. */ }
      }
    }
  }
  return result;
}
