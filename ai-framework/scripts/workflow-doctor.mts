#!/usr/bin/env node
import { runWorkflow } from "./runtime/entry.mts";
import { runDirect } from "./runtime/cli.mts";
import { inspectWorkflowEnv } from "./runtime/env.mts";
import { validateRuntimeImports } from "./runtime/validate.mts";
/*
 * Verifies that the portable workflow is complete after installation. Checks
 * run concurrently and report as they finish. --fix restores only missing
 * files from an existing .project scaffold; it never overwrites project data.
 */

import * as skillVendors from "./skill-vendors.mts";
import * as skillDefaults from "./skill-defaults.mts";
import * as orcaPolicy from "./orca-policy.mts";
import * as docsLinks from "./docs-links.mts";

import type { RuntimeDeps } from "./runtime/types.mts";

const TS_PARSE_SCRIPT = 'const m=require("module"),fs=require("fs");if(typeof m.stripTypeScriptTypes!=="function")process.exit(3);m.stripTypeScriptTypes(fs.readFileSync(process.argv[1],"utf8"));';
const BUN_PARSE_SCRIPT = 'new Bun.Transpiler({loader:process.argv[2]}).transformSync(require("fs").readFileSync(process.argv[1],"utf8"));';

/** Runs with isolated invocation state and injected host operations. */
export async function main(argv: string[], deps: RuntimeDeps): Promise<number> {
  const { externalSkillReport } = skillVendors;
  const { fs, path } = deps;
  const fsp = fs;
  const root = deps.proc.cwd();
  const fix = argv.includes("--fix");
  const json = argv.includes("--json");
  const color = !json && !argv.includes("--no-color") && !deps.proc.env.NO_COLOR;
  interface CheckResult { status: string; name: string; detail: string }
  const results: CheckResult[] = [];

  const colors: Record<string, string> = {
    pass: "\u001b[32m",
    fixed: "\u001b[36m",
    info: "\u001b[34m",
    warn: "\u001b[33m",
    fail: "\u001b[31m",
    reset: "\u001b[0m",
    heading: "\u001b[35m",
  };

  // Single source of truth: every profile below is DERIVED from the canonical file's own
  // declared model/profile, never hardcoded per agent or skill name. That's what keeps this
  // doctor honest as agents/skills are added — a new one is checked automatically, not only
  // once someone remembers to register it here.

  // Every OpenCode route uses the OpenCode Go provider (opencode-go/*) — no OpenAI models, no
  // Zen free tier. A route through an unconnected provider errors instead of falling back, so
  // connect OpenCode Go before running the workflow. `big-pickle` is deliberately unused: it only
  // exists as `opencode/big-pickle` on OpenCode Zen, and every bundled route stays on OpenCode Go.
  // Verify ids against your own installation with `opencode models | grep opencode-go` — the catalog
  // changes over time.
  const opencodeModels = {
    fast: "opencode-go/space-bunny",
    standard: "opencode-go/minimax-m3",
    deep: "opencode-go/kimi-k2.7-code",
  };

  // .claude/agents/*.md declare a concrete Claude model, not an abstract profile name — this
  // reverses that into fast/standard/deep so the OpenCode/Codex mirrors can be checked against it.
  const agentProfileByModelPrefix = [
    [/^claude-haiku-/, "fast"],
    [/^claude-sonnet-/, "standard"],
    [/^claude-opus-/, "deep"],
  ];

  // .claude/skills/*/SKILL.md declare their profile in a "> **Recommended capability profile:**
  // `X`" line — this is the single source of truth for skill profiles. Two kinds of skill can't
  // be derived purely by regex, and are named here instead of duplicating a model:
  //   - critique: a fan-out with a distinct profile per perspective (see its own dispatch table),
  //     not one command-level profile. Its command model is critique's own synthesis step.
  //   - fix / test-strategy: their declared line names two profiles ("fast for X; standard for
  //     Y") — the command defaults to the lighter one; the skill's own text documents escalation.
  const skillProfileOverrides = {
    critique: "standard",
    fix: "fast",
    plan: "standard",
    "test-strategy": "fast",
  };

  // Most OpenCode command models derive directly from their canonical capability profile. The
  // doctor and setup-validator read broad project configuration, so they use the stronger
  // standard route; changelog is fully templated, so it uses the cheapest route (see the
  // opencodeModels comment above).
  const skillModelOverrides = {
    "workflow-doctor": "opencode-go/minimax-m3",
    "setup-validator": "opencode-go/minimax-m3",
    changelog: "opencode-go/muse-spark-1.3-contributor",
  };

  // Almost every skill mirror says "Load `.claude/skills/<name>/SKILL.md` and follow it exactly."
  // workflow-doctor is the one exception: its behavior lives entirely in a script, so its mirrors
  // correctly point at that script instead of re-reading prose. Named here rather than forcing a
  // mismatched pattern onto an otherwise-correct file.
  const skillReferencePatternOverrides = {
    "workflow-doctor": /ai-framework\/scripts\/workflow-doctor\.mts/,
    "setup-validator": /ai-framework\/scripts\/setup-validator\.mts/,
    changelog: /ai-framework\/scripts\/changelog\.mts/,
    "bundle-sync": /ai-framework\/scripts\/bundle-sync\.mts/,
  };

  function absolute(relativePath: string): string {
    return path.join(root, relativePath);
  }

  function paint(status: string, text: string): string {
    return color ? `${colors[status] || ""}${text}${colors.reset}` : text;
  }

  function record(status: string, name: string, detail: string): void {
    const safe = (text: string): string => text.replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "");
    name = safe(name); detail = safe(detail);
    const result = { status, name, detail };
    results.push(result);
    if (!json) {
      deps.io.stdout.write(`${paint(status, status.toUpperCase().padEnd(5))} ${name}: ${detail}\n`);
    }
  }

  function checkRuntimeBoundary(): void {
    const sources: string[] = [];
    const skip = new Set(["node_modules", ".git", "scratchpad"]);
    const adapters = new Set(["node", "bun", "cli", "entry"].map((name) => `ai-framework/scripts/runtime/${name}.mts`));
    const testFile = (file: string): boolean => /\.test\.(mts|ts)$/.test(file);
    let visited = 0;
    const skipped: Array<{ file: string; line: number; suggestion: string }> = [];
    const refuse = (file: string, suggestion: string): void => { skipped.push({ file, line: 1, suggestion }); };
    const walk = (directory: string, depth: number): void => {
      if (depth > 64) { refuse(directory, "depth cap exceeded"); return; }
      if (visited >= 10000) { refuse(directory, "visited entry cap exceeded"); return; }
      try {
        const stat = fs.lstatSync(absolute(directory));
        if (stat.isSymbolicLink()) { refuse(directory, "directory symlink refused"); return; }
        if (!stat.isDirectory()) return;
        for (const entry of fs.readdirEntriesSync(absolute(directory)).sort((a, b) => a.name.localeCompare(b.name))) {
          if (++visited > 10000) { refuse(directory, "visited entry cap exceeded"); break; }
          if (skip.has(entry.name)) continue;
          const file = `${directory}/${entry.name}`;
          const child = fs.lstatSync(absolute(file));
          if (child.isSymbolicLink()) { refuse(file, "child symlink refused"); continue; }
          if (child.isDirectory()) walk(file, depth + 1);
          else if (child.isFile() && /\.(ts|mts)$/.test(file)) sources.push(file);
        }
      } catch { refuse(directory, "unreadable path"); }
    };
    for (const directory of ["ai-framework", ".claude", ".opencode"]) {
      if (fs.existsSync(absolute(directory))) walk(directory, 0);
    }
    const findings = validateRuntimeImports(root, sources.sort(), { adapters, testFile, includeGlobals: true }, deps);
    const imports = findings.filter((item) => item.kind !== "global" && item.kind !== "dynamic-computed" && item.kind !== "unparsed");
    const production = imports.filter((item) => !testFile(item.file));
    const tests = imports.filter((item) => testFile(item.file));
    const unparsedProduction = [...findings.filter((item) => item.kind === "unparsed"), ...skipped].filter((item) => !testFile(item.file));
    record(production.length || unparsedProduction.length ? "fail" : "pass", "Runtime boundary", `production: ${production.length} violations, ${unparsedProduction.length} unparsed${unparsedProduction.length ? `; ${unparsedProduction.slice(0, 5).map((item) => `${item.file}:${item.line} ${item.suggestion}`).join("; ")}` : ""}${production.length ? `; ${production.slice(0, 5).map((item) => `${item.file}:${item.line} imports ${item.module ?? "(non-literal)"}; use ${item.suggestion}`).join("; ")}` : ""}`);
    if (tests.length) {
      const files = [...new Set(tests.map((item) => item.file))];
      const modules = new Map<string, number>();
      for (const item of tests) {
        const module = item.module ?? "(non-literal)";
        modules.set(module, (modules.get(module) ?? 0) + 1);
      }
      const top = [...modules].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3);
      record("warn", "Runtime boundary", `tests: ${files.length} files, ${tests.length} violations; top modules: ${top.map(([name, count]) => `${name} (${count})`).join(", ")}; first files: ${files.slice(0, 5).join(", ")}`);
    }
    const unparsed = findings.filter((item) => item.kind === "unparsed").length;
    const globals = findings.filter((item) => item.kind === "global").length;
    const computed = findings.filter((item) => item.kind === "dynamic-computed").length;
    if (unparsed || globals || computed || skipped.length) record(unparsed || skipped.length ? "warn" : "info", "Runtime boundary", `advisory: ${unparsed} unparsed sources, ${globals} process globals, ${computed} computed imports, ${skipped.length} unreadable or skipped paths`);
  }

  async function exists(target) {
    try {
      await fsp.access(target);
      return true;
    } catch {
      return false;
    }
  }

  async function requireFile(relativePath) {
    if (await exists(absolute(relativePath))) {
      record("pass", relativePath, "present");
      return true;
    }
    record("fail", relativePath, "missing");
    return false;
  }

  async function matches(relativePath, expression, message) {
    if (!(await requireFile(relativePath))) return;
    try {
      const content = await fsp.readFile(absolute(relativePath));
      record(expression.test(content) ? "pass" : "fail", relativePath, message);
    } catch (error) {
      record("fail", relativePath, `could not read: ${error.message}`);
    }
  }

  // README.md is the docs index: it must link every topic doc, and every relative link must resolve.
  async function docsLinkCheck(docFiles) {
    const readme = absolute("README.md");
    const targets = [readme, ...docFiles.map((doc) => absolute(`ai-framework/docs/${doc}.md`))].filter((file) => fs.existsSync(file));
    let broken;
    try { ({ broken } = docsLinks.checkLinks(targets, deps)); } catch (error) {
      record("fail", "README.md", `docs links could not be checked: ${error.message}`);
      return;
    }
    const readmeText = await fsp.readFile(readme).catch(() => "");
    const unlinked = docFiles.filter((doc) => !readmeText.includes(`ai-framework/docs/${doc}.md`));
    if (broken.length || unlinked.length) {
      record("fail", "README.md", `docs links: ${broken.length} broken${unlinked.length ? `, not linked: ${unlinked.join(", ")}` : ""}`);
    } else record("pass", "README.md", "links every topic doc; all doc links resolve");
  }

  async function parseJson(relativePath) {
    if (!(await requireFile(relativePath))) return;
    try {
      JSON.parse(await fsp.readFile(absolute(relativePath)));
      record("pass", relativePath, "valid JSON");
    } catch (error) {
      record("fail", relativePath, `invalid JSON: ${error.message}`);
    }
  }

  // The Codex host wiring is structural: the hook file exists, the JSON is valid, and the
  // UserPromptSubmit registration points at the adapter with the exact Node runner, flags, root
  // argument, and timeout required by the coordinator contract. This is separate from live host
  // activation, which can only be verified by a trusted Codex session.
  async function checkCodexStartupWiring() {
    const name = "Codex startup wiring";
    const relativePath = ".codex/hooks.json";
    let content: string;
    try {
      content = await fsp.readFile(absolute(relativePath));
    } catch (error) {
      record("fail", name, `.codex/hooks.json missing: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      record("fail", name, `invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    if (!parsed || typeof parsed !== "object" || !("hooks" in parsed)) {
      record("fail", name, "missing top-level hooks object");
      return;
    }
    const hooks = (parsed as Record<string, unknown>).hooks;
    if (!hooks || typeof hooks !== "object") {
      record("fail", name, "hooks is not an object");
      return;
    }

    const userPrompt = (hooks as Record<string, unknown>).UserPromptSubmit;
    if (!Array.isArray(userPrompt) || userPrompt.length === 0) {
      record("fail", name, "UserPromptSubmit not registered");
      return;
    }

    const candidateHooks: unknown[] = [];
    for (const registration of userPrompt) {
      if (registration && typeof registration === "object" && Array.isArray((registration as Record<string, unknown>).hooks)) {
        candidateHooks.push(...(registration as Record<string, unknown>).hooks as unknown[]);
      }
    }

    const commandEntry = candidateHooks.find(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        typeof (entry as Record<string, unknown>).command === "string" &&
        String((entry as Record<string, unknown>).command).includes("ai-framework/hooks/scripts/orca-start-codex-hook.mts")
    );
    if (!commandEntry) {
      record("fail", name, "UserPromptSubmit does not reference ai-framework/hooks/scripts/orca-start-codex-hook.mts");
      return;
    }

    const command = String((commandEntry as Record<string, unknown>).command);
    const problems: string[] = [];
    if ((commandEntry as Record<string, unknown>).type !== "command") {
      problems.push("startup handler is not a command hook");
    }
    if (!/\bAI_WORKFLOW_RUNNER=node\s+node\s+--experimental-strip-types\s+--disable-warning=ExperimentalWarning\b/.test(command)) {
      problems.push("missing AI_WORKFLOW_RUNNER=node prefix with Node compatibility flags");
    }
    const gitRoot = "$(git rev-parse --show-toplevel)";
    const adapter = "/ai-framework/hooks/scripts/orca-start-codex-hook.mts";
    const inlineRoot = command.includes(`"${gitRoot}${adapter}" --root "${gitRoot}"`);
    const assignedRoot = command.includes("workflow_root=$(git rev-parse --show-toplevel 2>/dev/null)")
      && command.includes(`"$workflow_root${adapter}" --root "$workflow_root"`);
    if (!inlineRoot && !assignedRoot) {
      problems.push("missing trusted --root argument");
    }
    // Recognize executable registrations, not examples echoed or commented in shell text.
    // This is a conservative wiring check; host activation still needs separate evidence.
    const runner = "AI_WORKFLOW_RUNNER=node node --experimental-strip-types --disable-warning=ExperimentalWarning";
    const inlineCommand = `${runner} "${gitRoot}${adapter}" --root "${gitRoot}"`;
    const assignedCommand = `${runner} "$workflow_root${adapter}" --root "$workflow_root"`;
    const guardedAssignment = /^workflow_root=\$\(git rev-parse --show-toplevel 2>\/dev\/null\) \|\| (?:exit 2; |\{ printf '%s\\n' '[^'\u0000-\u001f]*' >&2; exit 2; \}; )$/;
    const executable = command === inlineCommand
      || command.endsWith(assignedCommand) && guardedAssignment.test(command.slice(0, -assignedCommand.length));
    if (!executable) {
      problems.push("startup command does not execute the adapter with supported wiring");
    }
    if ((commandEntry as Record<string, unknown>).timeout !== 8) {
      problems.push("timeout is not 8");
    }

    if (problems.length) {
      record("fail", name, problems.join("; "));
      return;
    }
    record("pass", name, "UserPromptSubmit wired to orca-start-codex-hook.mts with Node runner, root argument, and 8s timeout");
  }

  async function runProcess(command: string, args: string[], options: { timeout?: number } = {}): Promise<{ code?: number | null; stdout: string; stderr: string; error?: Error & { code?: string } }> {
    try {
      const result = await (command === deps.proc.execPath ? runWorkflow(deps, args, { cwd: root, timeoutMs: options.timeout ?? 15000, killSignal: "SIGTERM" }) : deps.child.run(command, args, { cwd: root, timeoutMs: options.timeout ?? 15000, killSignal: "SIGTERM" }));
      return { code: result.status, stdout: result.stdout, stderr: result.stderr };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)), stdout: "", stderr: "" };
    }
  }

  async function listDirNames(relativePath) {
    try {
      const entries = await fsp.readdirEntries(absolute(relativePath));
      return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }

  async function listMdFileStems(relativePath) {
    try {
      const entries = await fsp.readdirEntries(absolute(relativePath));
      return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
        .map((entry) => entry.name.replace(/\.md$/, ""))
        .sort();
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }

  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function extractSkillProfile(content, name) {
    if (skillProfileOverrides[name]) return skillProfileOverrides[name];
    const match = content.match(/Recommended capability profile:\*\*\s*`([a-z]+)`/);
    return match ? match[1] : null;
  }

  function extractAgentProfile(content) {
    const match = content.match(/^model:\s*(\S+)$/m);
    if (!match) return null;
    const found = agentProfileByModelPrefix.find(([prefix]) => prefix.test(match[1]));
    return found ? found[1] : null;
  }

  async function checkNode(relativePath: string): Promise<void> {
    if (!(await requireFile(relativePath))) return;
    const typed = /\.(mts|ts)$/.test(relativePath);
    // A plain .ts file in a directory without "type": "module" is read as CommonJS by --check, so parse by stripping types instead.
    const args = deps.runtime === "bun" ? ["-e", BUN_PARSE_SCRIPT, absolute(relativePath), typed ? "ts" : "js"] : typed ? ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", "-e", TS_PARSE_SCRIPT, absolute(relativePath)] : ["--check", absolute(relativePath)];
    const result = await runProcess(deps.proc.execPath, args);
    if (typed && result.code === 3) { record("info", relativePath, "TypeScript parse skipped: this Node has no module.stripTypeScriptTypes"); return; }
    const label = deps.runtime === "bun" ? "Bun" : "Node.js";
    record(result.code === 0 ? "pass" : "fail", relativePath, result.code === 0 ? `valid ${label} syntax` : result.stderr.trim() || `invalid ${label} syntax`);
  }

  async function statOrNull(target) {
    try {
      return await fsp.lstat(target);
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }

  async function isSafeProjectPath(project, target) {
    const relative = path.relative(project, target);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      record("fail", path.relative(root, target), "repair path escapes .project");
      return false;
    }
    let current = project;
    for (const part of relative.split(path.sep).filter(Boolean)) {
      if ((await statOrNull(current))?.isSymbolicLink()) {
        record("fail", path.relative(root, current), "repair refuses symbolic links");
        return false;
      }
      current = path.join(current, part);
    }
    if ((await statOrNull(current))?.isSymbolicLink()) {
      record("fail", path.relative(root, current), "repair refuses symbolic links");
      return false;
    }
    return true;
  }

  async function templatePaths(directory, relative = "") {
    const entries = await fsp.readdirEntries(directory);
    const paths = await Promise.all(entries.filter((entry) => entry.name !== ".DS_Store").map(async (entry) => {
      const child = path.join(directory, entry.name);
      const childRelative = path.join(relative, entry.name);
      return entry.isDirectory() ? [childRelative, ...(await templatePaths(child, childRelative))] : [childRelative];
    }));
    return paths.flat();
  }

  async function copyMissing(source, destination, project) {
    const entries = await fsp.readdirEntries(source);
    await Promise.all(entries.filter((entry) => entry.name !== ".DS_Store").map(async (entry) => {
      const from = path.join(source, entry.name);
      const to = path.join(destination, entry.name);
      if (!(await isSafeProjectPath(project, to))) return;
      if (entry.isDirectory()) {
        if (!(await exists(to))) {
          await fsp.mkdir(to, { recursive: true });
          record("fixed", path.relative(root, to), "created directory from template");
        }
        await copyMissing(from, to, project);
      } else if (!(await exists(to))) {
        await fsp.copyFile(from, to);
        record("fixed", path.relative(root, to), "restored missing template file");
      }
    }));
  }

  async function checkProjectScaffold() {
    const project = absolute(".project");
    const template = absolute("ai-framework/templates/project");
    const scaffoldPaths = await templatePaths(template);
    await Promise.all(scaffoldPaths.map((item) => requireFile(`ai-framework/templates/project/${item}`)));
    if (!(await exists(project))) {
      record("info", ".project", "not installed; scaffold template is ready for approved setup");
      return;
    }
    if ((await statOrNull(project))?.isSymbolicLink()) {
      record("fail", ".project", "repair refuses a symbolic-link project directory");
      return;
    }
    if (fix) await copyMissing(template, project, project);
    await Promise.all(scaffoldPaths.map((item) => requireFile(`.project/${item}`)));

    const followups = absolute(".project/pitches/_followups.md");
    if (!(await exists(followups)) && fix) {
      if (!(await isSafeProjectPath(project, followups))) return;
      await fsp.mkdir(path.dirname(followups), { recursive: true });
      await fsp.writeFile(followups, "# Followups\n");
      record("fixed", ".project/pitches/_followups.md", "created empty backlog");
    }
    await requireFile(".project/pitches/_followups.md");
  }

  // Structural, not just "valid JSON": a malformed catalog would silently strip an entry from
  // skill-defaults.mts's report()/resolveMode() rather than fail loudly (found while building the
  // caveman-modes scope — a plain parseJson() call would only catch broken syntax, not a broken
  // shape).
  async function checkSkillDefaults() {
    const relativePath = "ai-framework/integrations/skill-defaults.json";
    if (!(await requireFile(relativePath))) return;
    try {
      const catalog = JSON.parse(await fsp.readFile(absolute(relativePath)));
      const valid = catalog && catalog.schemaVersion === 1 && Array.isArray(catalog.defaults) && catalog.defaults.length > 0 &&
        catalog.defaults.every((entry) => entry && typeof entry.id === "string" && /^[^/]+\/[^/]+\/[^/]+$/.test(entry.id) && typeof entry.path === "string" && typeof entry.purpose === "string" &&
          (entry.runtime === null || entry.runtime === undefined || (Array.isArray(entry.runtime?.check) && entry.runtime.check.every((item) => typeof item === "string"))) &&
          (entry.recommendedPhases === undefined || (Array.isArray(entry.recommendedPhases) && entry.recommendedPhases.every((item) => typeof item === "string"))));
      record(valid ? "pass" : "fail", relativePath, valid ? `${catalog.defaults.length} default skill(s) declared` : "malformed catalog: schemaVersion/defaults/id/path/purpose/runtime shape invalid");
    } catch (error) {
      record("fail", relativePath, `invalid JSON: ${error.message}`);
    }
  }

  // What the caveman instruction in every skill/agent/entry file will actually do right now. The
  // instruction itself is enforced file-by-file elsewhere; this reports the live state behind it so
  // "carries the instruction" is never mistaken for "is active" — and a malformed mode file, which
  // would make every one of those instructions' commands fail loudly, is caught here first.
  async function checkCavemanState() {
    const name = "Caveman mode";
    try { skillDefaults.loadModes(root, deps); } catch (error) { record("fail", ".project/skills/modes.json", `invalid: ${error.message}`); return; }
    const modes = fs.existsSync(absolute(skillDefaults.MODES_FILE)) ? skillDefaults.loadModes(root, deps) : null;
    const status = skillDefaults.report(root, deps);
    if (status.registryError) { record("warn", name, `skill registry unreadable, cannot tell whether caveman is installed: ${status.registryError}`); return; }
    const caveman = status.defaults.find((entry) => entry.id.endsWith("/caveman"));
    if (!caveman?.installed) { record("info", name, "instruction present in every skill/agent but caveman is not installed, so it is inert; install with /add-skill juliusbrussee/caveman/caveman"); return; }
    if (!caveman.enabled) { record("warn", name, "caveman is installed but disabled in the registry; every skill/agent instruction will skip it"); return; }
    if (caveman.phaseGap.length) { record("warn", name, `installed wrapper does not list recommended phase(s): ${caveman.phaseGap.join(", ")}; it tells agents not to activate outside its listed phases (re-run add-skill update --phases ...)`); return; }
    if (modes?.caveman?.enabled === false) { record("info", name, "installed and covered, but persistently disabled in .project/skills/modes.json (enabled: false)"); return; }
    record("pass", name, `active: installed, enabled, covers all recommended phases; default ${modes?.caveman?.default || skillDefaults.CATALOG.defaults.find((entry) => entry.id.endsWith("/caveman")).defaultMode}`);
  }

  // The runner and the Orca switch come from ai_workflow_env.json (never .env). A typo there would silently fall back to
  // the defaults, so say what would actually be used.
  function checkWorkflowSettings() {
    const name = "Workflow settings";
    const result = inspectWorkflowEnv(deps.fs, deps.path, root);
    if (result.status === "missing") { record("info", name, "ai_workflow_env.json absent; defaults: runner node, Orca off (copy ai_workflow_env.example.json to set them)"); return; }
    if (result.status === "refused") { record("fail", name, `ai_workflow_env.json ignored: ${result.problems.join("; ")}`); return; }
    if (result.status === "invalid") { record("fail", name, `ai_workflow_env.json has problems and is partly or wholly ignored: ${result.problems.join("; ")}`); return; }
    const ignored = result.ignoredKeys.length ? `; ignored keys: ${result.ignoredKeys.slice(0, 5).join(", ")}` : "";
    record(result.ignoredKeys.length ? "warn" : "pass", name, `runner ${result.values.AI_WORKFLOW_RUNNER || "node (default)"}; Orca ${result.values.AI_WORKFLOW_ORCA_MULTI_AGENT?.trim().toLowerCase() === "true" ? "on" : "off"}${ignored}; process environment overrides the file`);
  }

  function checkOrcaPolicy() {
    // Optional local policy is inspected without importing preflight or touching executables.
    const result = orcaPolicy.readPolicy(root, deps);
    const details = {
      missing: "optional policy absent; normal workflow; no Orca checks",
      disabled: "policy disabled; normal workflow; no Orca checks",
      valid: "policy opted in; runtime unverified; normal workflow; dispatch disabled",
      malformed: "malformed policy; normal workflow; correct JSON and routing schema",
      "unsupported-schema": "unsupported policy schema; normal workflow; expected schemaVersion 1",
      refused: "policy path or read refused; normal workflow; use a regular local file under .project",
    };
    const status = result.status === "valid" ? "pass"
      : ["missing", "disabled"].includes(result.status) ? "info" : "fail";
    record(status, "Orca policy", details[result.status]);
  }

  async function checkOpenCodeResolution() {
    if (deps.proc.versions.bun) {
      record("info", "OpenCode", "static adapter checks completed; run with Node to resolve live OpenCode config");
      return;
    }
    const result = await runProcess("opencode", ["debug", "config"]);
    if (result.error?.code === "ENOENT") {
      record("info", "OpenCode", "not installed; static adapter checks completed");
      return;
    }
    if (result.code !== 0) {
      record("warn", "OpenCode", result.stderr.trim() || "could not resolve config");
      return;
    }
    try {
      JSON.parse(result.stdout);
      record("pass", "OpenCode", "debug config resolves");
    } catch {
      record("fail", "OpenCode", "debug config did not return JSON");
    }
  }

  async function checkKnowledgeGraph() {
    const knowledge = absolute(".project/knowledge");
    if (!(await exists(knowledge))) {
      record("info", "Knowledge graph", "knowledge scaffold not installed; templates and graph generator were validated");
      return;
    }

    const graphify = absolute("ai-framework/scripts/graphify.mts");
    const report = await runProcess(deps.proc.execPath, ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", graphify, "--check", "--json"]);
    if (report.code !== 0) {
      record("fail", "Knowledge graph", report.stderr.trim() || "graphify reported invalid knowledge entries");
      return;
    }

    let graphReport;
    try {
      graphReport = JSON.parse(report.stdout);
      const warnings = graphReport.problems?.filter((problem) => problem.level === "warn") ?? [];
      record(warnings.length > 0 ? "warn" : "pass", "Knowledge graph", warnings.length > 0 ? `graphify found ${warnings.length} warning(s)` : `graphify validated ${graphReport.stats.total} entry(ies)`);
    } catch {
      record("fail", "Knowledge graph", "graphify did not return JSON");
      return;
    }

    const graphPath = absolute("graphify-out/graph.json");
    const indexPath = path.join(knowledge, "index.md");
    const hint = "run node ai-framework/scripts/graphify.mts (needs uv: https://docs.astral.sh/uv/)";
    if (await exists(path.join(knowledge, "graph.json"))) {
      record("warn", "Knowledge graph", `legacy .project/knowledge/graph.json is still present; ${hint} to migrate it into graphify-out/graph.json`);
    }
    if (!(await exists(absolute(".graphifyignore")))) record("warn", "Graphify", `.graphifyignore is missing, so generated and archived trees would be indexed; ${hint}`);
    if (!(await exists(graphPath)) || !(await exists(indexPath))) {
      record("warn", "Knowledge graph", `graphify-out/graph.json or knowledge/index.md is missing; ${hint}`);
      return;
    }

    try {
      const graph = JSON.parse(await fsp.readFile(graphPath));
      const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
      const links = Array.isArray(graph.links) ? graph.links : [];
      const ids = new Set(nodes.map((node) => node.id));
      const knowledgeNodes = nodes.filter((node) => node.node_kind === "knowledge");
      const edgesValid = links.every((edge) => ids.has(edge.source) && ids.has(edge.target));
      const statsValid = graph.graph?.workflow?.stats?.total === knowledgeNodes.length && knowledgeNodes.length === graphReport.stats.total;
      const index = await fsp.readFile(indexPath);
      const indexValid = index.startsWith("# Knowledge Index");
      const ok = edgesValid && statsValid && indexValid;
      record(ok ? "pass" : "fail", "Knowledge graph", ok ? "graphify-out/graph.json carries every knowledge entry and its links; index is consistent" : `graphify-out/graph.json is out of date with the knowledge entries or structurally inconsistent; ${hint}`);
    } catch (error) {
      record("fail", "Knowledge graph", `could not read derived artifacts: ${error.message}`);
    }
    const uv = await runProcess("uv", ["--version"]).catch(() => ({ code: 1 }));
    record(uv.code === 0 ? "pass" : "warn", "Graphify runtime", uv.code === 0 ? "uv available; graphify runs as `uv tool run --from graphifyy`" : "uv is not installed (https://docs.astral.sh/uv/); the graph cannot be rebuilt until it is, or GRAPHIFY_BIN points at a graphify executable");
  }

  // fs.access is case-insensitive on macOS/Windows, so a `skill.md` would pass there but be
  // invisible to harnesses on case-sensitive Linux. Compare the real directory entry instead.
  async function requireExactSkillFilename(directory) {
    const entries = await fsp.readdir(absolute(directory)).catch(() => []);
    const near = entries.find((entry) => entry.toLowerCase() === "skill.md");
    if (near && near !== "SKILL.md") {
      record("fail", `${directory}/${near}`, "must be named exactly SKILL.md (case-sensitive filesystems will not discover it)");
    }
  }

  // `.project/workflow-doctor.json` lets a project own its model routing: {"schemaVersion":1,"modelRouting":"bundle"|"project"}.
  // "bundle" (the default) enforces the bundled OpenCode and Codex routes below. "project" only requires that a
  // declared route is well formed, so a deliberate local routing policy is not reported as a failure.
  let modelRouting: "bundle" | "project" = "bundle";
  async function checkModelRouting(): Promise<void> {
    const file = ".project/workflow-doctor.json";
    const name = "Model routing";
    if (!(await exists(absolute(file)))) return;
    try {
      const value: unknown = JSON.parse(await fsp.readFile(absolute(file)));
      const record_ = value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
      if (!record_ || record_.schemaVersion !== 1 || (record_.modelRouting !== "bundle" && record_.modelRouting !== "project")) {
        record("fail", name, `${file} must be {"schemaVersion":1,"modelRouting":"bundle"|"project"}; the bundled routes are enforced`);
        return;
      }
      modelRouting = record_.modelRouting;
      record("info", name, modelRouting === "project" ? "project-owned: declared OpenCode and Codex routes are checked for syntax, not against the bundled routes" : "bundled routes enforced");
    } catch (error) {
      record("fail", name, `${file} is not readable JSON (${error instanceof Error ? error.message : String(error)}); the bundled routes are enforced`);
    }
  }

  // Project-owned routing: a missing model inherits the harness configuration; a declared one must be provider/model.
  async function checkProjectOpenCodeRoute(relativePath: string): Promise<void> {
    if (!(await requireFile(relativePath))) return;
    const content = await fsp.readFile(absolute(relativePath));
    const line = content.match(/^model:[ \t]*(.*)$/m);
    if (!line) { record("pass", relativePath, "model inherits the user-selected harness configuration"); return; }
    const valid = /^[A-Za-z0-9_-]+\/\S+$/.test(line[1].trim().replace(/^(["'])(.*)\1$/, "$2"));
    record(valid ? "pass" : "fail", relativePath, valid ? "model uses provider/model syntax; runtime availability is separate" : "model must be a provider/model id");
  }

  async function checkSkill(name) {
    const canonical = `.claude/skills/${name}/SKILL.md`;
    await Promise.all([
      requireExactSkillFilename(`.claude/skills/${name}`),
      requireExactSkillFilename(`.agents/skills/${name}`),
    ]);
    if (!(await requireFile(canonical))) return;
    // Every canonical skill (registry-managed external skills are filtered out before this runs)
    // must carry the caveman-mode instruction, so a newly added skill can't silently opt out.
    await matches(canonical, /\*\*Caveman mode:\*\*/, "carries the caveman mode instruction");
    const content = await fsp.readFile(absolute(canonical));
    const referencePattern =
      skillReferencePatternOverrides[name] ?? new RegExp(`\\.claude/skills/${escapeRegExp(name)}/SKILL\\.md`);

    const codexSkill = `.agents/skills/${name}/SKILL.md`;
    await requireFile(codexSkill);
    await matches(codexSkill, referencePattern, "loads canonical skill");

    const profile = extractSkillProfile(content, name);
    if (!profile) {
      record(
        "warn",
        canonical,
        'no declared capability profile — add a "> **Recommended capability profile:** `fast|standard|deep`" line, or register an override in workflow-doctor.mts if it genuinely has more than one'
      );
      return;
    }

    const command = `.opencode/commands/${name}.md`;
    const expectedModel = skillModelOverrides[name] ?? opencodeModels[profile];
    if (modelRouting === "project") {
      await checkProjectOpenCodeRoute(command);
    } else {
      await requireFile(command);
      await matches(command, new RegExp(`^model: ${escapeRegExp(expectedModel)}$`, "m"), `expected OpenCode model (${profile} profile)`);
    }
    await matches(command, referencePattern, "loads canonical skill");
  }

  async function checkAgent(name) {
    const claude = `.claude/agents/${name}.md`;
    if (!(await requireFile(claude))) return;
    const content = await fsp.readFile(absolute(claude));

    await matches(claude, /^model: .+$/m, "declares a Claude model");
    await matches(claude, /\*\*Caveman mode:\*\*/, "carries the caveman mode instruction");
    await matches(claude, /Sub-agent dispatch:/, "documents nested sub-agent dispatch");

    const profile = extractAgentProfile(content);
    if (!profile) {
      record(
        "warn",
        claude,
        'model doesn\'t match a known claude-haiku-/claude-sonnet-/claude-opus- prefix — cannot derive its fast/standard/deep profile to validate mirrors'
      );
      return;
    }

    const opencode = `.opencode/agents/${name}.md`;
    const codex = `.codex/agents/${name}.toml`;
    if (modelRouting === "project") await checkProjectOpenCodeRoute(opencode);
    else await matches(opencode, new RegExp(`^model: ${escapeRegExp(opencodeModels[profile])}$`, "m"), `expected OpenCode model (${profile} profile)`);
    await matches(opencode, new RegExp(`\\.claude/agents/${escapeRegExp(name)}\\.md`), "loads canonical role prompt");
    if (modelRouting === "project") await requireFile(codex);
    else await matches(codex, /^model = ".+"$/m, "declares a Codex model");
    if (profile === "deep" && modelRouting !== "project") {
      // The OpenCode deep route (opencode-go/kimi-k2.7-code) declares no effort override;
      // Codex still needs its explicit effort.
      await matches(codex, /^model_reasoning_effort = "xhigh"$/m, "uses xhigh reasoning");
    }
  }

  async function validate() {
    const [skillNames, agentFiles, phaseFiles, ruleFiles] = await Promise.all([
      listDirNames(".claude/skills"),
      listMdFileStems(".claude/agents"),
      listMdFileStems("ai-framework/workflow/phases"),
      listMdFileStems("ai-framework/rules"),
    ]);

    // SETUP.md and README.md's *content* (the readmeChecks below) belong to the portable bundle
    // repo itself, not to a target project it's installed into — SETUP.md is intentionally not
    // copied per its own Step 1, and an installed project's README.md is that project's own,
    // unrelated file. Detect which context this run is in so those two checks don't misfire
    // against a real target project (found by testing this doctor against one).
    const inPortableBundleRepo = await exists(absolute("SETUP.md"));

    const coreFiles = ["AGENTS.md", "CLAUDE.md", "README.md", "ai-framework/workflow/overview.md", "ai-framework/integrations/harnesses.md", "ai-framework/rules/model-routing.md", "ai-framework/hooks/hooks.json", ".claude/settings.json", ".codex/hooks.json", ".opencode/plugins/token-consumption.ts", "ai-framework/integrations/skill-defaults.md"];
    if (inPortableBundleRepo) coreFiles.push("SETUP.md");
    // bundle-sync.mts and skill-sync.mts were missing from this list (found while adding
    // skill-defaults.mts here) — every other script this doctor knows about gets a syntax check.
    const scripts = [".claude/hooks/post-edit-check.mts", "ai-framework/hooks/scripts/pre-ship-verify.mts", "ai-framework/hooks/scripts/stuck-uphill-detector.mts", "ai-framework/hooks/scripts/token-consumption.mts", "ai-framework/hooks/scripts/token-consumption.test.mts", "ai-framework/hooks/scripts/token-report.mts", "ai-framework/hooks/scripts/token-report.test.mts", "ai-framework/hooks/scripts/opencode-plugin.test.mts", "ai-framework/hooks/scripts/orca-start-codex-hook.mts", "ai-framework/hooks/scripts/orca-start-codex-hook.test.mts", "ai-framework/scripts/graphify.mts", "ai-framework/scripts/workflow-doctor.mts", "ai-framework/scripts/setup-validator.mts", "ai-framework/scripts/entry-import.mts", "ai-framework/scripts/entry-import.test.mts", "ai-framework/scripts/add-skill.mts", "ai-framework/scripts/skill-registry.mts", "ai-framework/scripts/skill-source.mts", "ai-framework/scripts/skill-vendors.mts", "ai-framework/scripts/skill-sync.mts", "ai-framework/scripts/bundle-sync.mts", "ai-framework/scripts/skill-defaults.mts", "ai-framework/scripts/skill-compress-guard.mts", "ai-framework/scripts/browser-runtime.mts", "ai-framework/scripts/pitch-compress.mts", "ai-framework/scripts/pitch-archive.mts", "ai-framework/scripts/state-snapshot.mts", "ai-framework/scripts/state-theme.mts", "ai-framework/scripts/state-render.mts", "ai-framework/scripts/review-bench.mts"];
    scripts.push("ai-framework/scripts/docs-links.mts", "ai-framework/scripts/docs-links.test.mts");
    scripts.push("ai-framework/scripts/orca-policy.mts", "ai-framework/scripts/orca-preflight.mts");
    scripts.push("ai-framework/scripts/runtime/entry.mts", "ai-framework/scripts/runtime/cli.mts", ".opencode/plugins/token-consumption.ts");
    // The README is now an index; each documented topic lives in ai-framework/docs/.
    const docsChecks = [
      ["setup", /^# Set up$/m, "documents setup"],
      ["workflow-doctor", /^# Workflow Doctor$/m, "documents workflow diagnostics"],
      ["workflow-doctor", /--fix/, "documents safe repair"],
      ["workflow-doctor", /--json/, "documents machine-readable diagnostics"],
      ["workflow-doctor", /--no-color/, "documents plain-text diagnostics"],
      ["knowledge-graph", /^# Knowledge Graph$/m, "documents knowledge graph"],
      ["workflow-doctor", /graphify\.mts --check/, "documents knowledge dry run"],
      ["setup", /OpenCode model setup/, "documents OpenCode provider setup"],
      ["vendors", /^# One source, every vendor$/m, "documents the canonical/mirror architecture"],
      ["extending", /^# How to improve this flow$/m, "documents workflow extension"],
    ];
    const docFiles = ["setup", "token-consumption", "workflow-doctor", "setup-validator", "knowledge-graph", "versioning-and-sync", "what-you-get", "vendors", "pipeline", "extending", "design-notes"];

    // Generated `.project/rules/*.md` companions are only useful if something in the pipeline
    // actually tells an agent to read them — found by testing on a real project where /setup had
    // generated them correctly but every phase only ever named the generic ai-framework/rules/.
    // These four are where code actually gets written or reviewed; keep them honest.
    const rulesConsumers = [
      ".claude/skills/shape/SKILL.md",
      ".claude/skills/plan/SKILL.md",
      ".claude/skills/build/SKILL.md",
      ".claude/skills/audit/SKILL.md",
    ];

    // Skills installed by add-skill own wrappers under .claude/skills but are upstream content: they
    // are checked against registry ownership and vendor coverage, not canonical mirror/profile rules.
    let external;
    try {
      external = externalSkillReport(root, deps);
    } catch (error) {
      external = { managed: new Set(), results: [{ status: "fail", name: ".project/skills", detail: error.message }] };
    }
    for (const result of external.results) record(result.status, result.name, result.detail);

    await checkModelRouting();
    await Promise.all([
      ...coreFiles.map(requireFile),
      ...(inPortableBundleRepo ? docsChecks.map(([doc, expression, detail]) => matches(`ai-framework/docs/${doc}.md`, expression, detail)) : []),
      ...(inPortableBundleRepo ? [docsLinkCheck(docFiles)] : []),
      // The cross-vendor entry files are the template new installs copy: the main session agent of
      // every vendor gets its caveman instruction from here, so the source bundle must carry it.
      ...(inPortableBundleRepo ? ["AGENTS.md", "CLAUDE.md"].map((file) => matches(file, /^## Response style \(caveman mode\)$/m, "carries the caveman response-style section")) : []),
      ...phaseFiles.map((phase) => requireFile(`ai-framework/workflow/phases/${phase}.md`)),
      ...ruleFiles.map((rule) => requireFile(`ai-framework/rules/${rule}.md`)),
      ...rulesConsumers.map((file) => matches(file, /\.project\/rules/, "references the generated .project/rules companions")),
      ...skillNames.filter((name) => !external.managed.has(name)).map(checkSkill),
      ...agentFiles.map(checkAgent),
      parseJson(".opencode/opencode.json"),
      parseJson("ai-framework/hooks/hooks.json"),
      parseJson(".claude/settings.json"),
      parseJson(".codex/hooks.json"),
      matches(".claude/settings.json", /token-consumption\.mts/, "wires post-agent consumption collector"),
      matches(".claude/settings.json", /--event skill-use/, "wires skill-use counting"),
      matches(".codex/hooks.json", /SubagentStop[\s\S]*token-consumption\.mts/, "wires post-agent consumption collector"),
      matches(".opencode/plugins/token-consumption.ts", /recordEvent/, "wires post-agent consumption collector"),
      ...scripts.map(checkNode),
      checkOpenCodeResolution(),
      checkSkillDefaults(),
      checkCavemanState(),
      checkWorkflowSettings(),
      checkRuntimeBoundary(),
      checkOrcaPolicy(),
      checkCodexStartupWiring(),
    ]);
    await checkProjectScaffold();
    await checkKnowledgeGraph();
  }

  async function execute(): Promise<number> {
    if (!json) deps.io.stdout.write(`${paint("heading", "Workflow doctor: running checks concurrently...\n")}`);
    await validate();
    const failures = results.filter((result) => result.status === "fail");
    const fixed = results.filter((result) => result.status === "fixed");
    const warnings = results.filter((result) => result.status === "warn");
    if (json) {
      deps.io.stdout.write(`${JSON.stringify({ results, failures: failures.length, fixed: fixed.length }, null, 2)}\n`);
    } else {
      if (failures.length > 0) {
        deps.io.stdout.write(`\n${paint("fail", `Workflow status: NEEDS ATTENTION (${failures.length} blocking issue(s))`)}\n`);
        deps.io.stdout.write("Next: fix the listed workflow artifacts, then run the doctor again. Use --fix only to restore missing files in an existing .project scaffold.\n");
      } else if (warnings.length > 0) {
        deps.io.stdout.write(`\n${paint("warn", `Workflow status: READY WITH WARNINGS (${warnings.length})`)}\n`);
        deps.io.stdout.write("Next: review the warnings before relying on the affected harness integration.\n");
      } else {
        deps.io.stdout.write(`\n${paint("pass", "Workflow status: READY")}\n`);
        deps.io.stdout.write("All workflow contracts, adapters, hooks, model routes, and scaffold templates passed.\n");
      }
      if (fixed.length > 0) deps.io.stdout.write(`${paint("fixed", `Repairs: restored ${fixed.length} missing scaffold artifact(s).`)} Run the doctor again to confirm a clean state.\n`);
      if (results.some((result) => result.name === ".project" && result.status === "info")) {
        deps.io.stdout.write("Setup: no .project is installed yet. Run /setup in the target application and approve its generated context files before starting the pipeline.\n");
      }
      deps.io.stdout.write(`Validated ${results.filter((result) => result.status === "pass").length} checks. Use --json for machine-readable output or --no-color for plain text.\n`);
    }
    return failures.length > 0 ? 1 : 0;
  }

  try {
    return await execute();
  } catch (error) {
    const detail = error instanceof Error ? error.stack || error.message : String(error);
    deps.io.stderr.write(`Workflow doctor failed unexpectedly: ${detail}\n`);
    return 2;
  }
}

runDirect(import.meta.url, main);
