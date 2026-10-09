import { runDirect } from "./runtime/cli.mts";
import type { RuntimeDeps } from "./runtime/types.mts";
import { createNodeDeps } from "./runtime/node.mts";
// Shared registry and vendor helpers are imported directly as TypeScript module namespaces.
import * as registryModule from "./skill-registry.mts";
import * as vendorsModule from "./skill-vendors.mts";

export interface FileValue { data: Buffer; mode: number }
export interface OwnedFile { hash: string; sourceHash: string; mode: number }
export interface SkillEntry {
  id: string; name: string; description: string; scope: string; packagePath: string; enabled: boolean;
  phases: string[]; adapters: Record<string, string>; owned: Record<string, OwnedFile>;
  source: { url: string; revision: string; path: string };
  license: unknown; runtime: unknown; formatting?: unknown;
}
export interface Registry { skills: Record<string, SkillEntry> }
export interface StoredFile { hash: string; mode: number; data: string }
export interface RegistryContext { state: string; registry: string; scope: string; roots: { target: string; project?: string } }
export interface Operation { path: string; expected: string | null; expectedMode: number | null; value: FileValue | null; root?: string }
export interface Vendor { id: string }
export interface Rendered { files: Record<string, FileValue>; paths: Record<string, string> }
export interface RegistryApi {
  context(root: string, scope?: string, location?: string): RegistryContext;
  digest(data: Uint8Array): string;
  json(value: unknown): Buffer;
  snapshot(ctx: RegistryContext, file: string, root?: string): StoredFile | null;
  readRegistry(ctx: RegistryContext): { registry: Registry; stored: StoredFile | null };
  transact(ctx: RegistryContext, operations: Operation[], hook?: unknown): void;
  recover(ctx: RegistryContext): unknown;
  resolveFile(ctx: RegistryContext, file: string): string;
}
export interface VendorsApi {
  discoverVendors(project: string): Vendor[];
  adapters(vendors: Vendor[], scope: string, name: string, packagePath: string, description: string, phases: string[], enabled: boolean): Rendered;
}
export interface Formatter { bin: string; configPath: string; label: string }
export interface FormatResult { formatter: string | null; files: Record<string, FileValue>; changed: string[] }
export interface ReconcileOptions { apply?: boolean; root?: string; json?: boolean }
export interface SkillResult { id: string; status: string; vendors?: string[]; error?: string }
export interface ReconcileResult { status: string; skills: SkillResult[]; error?: string; applied?: boolean }

const { context, digest, json, snapshot, readRegistry, transact, resolveFile } = registryModule as RegistryApi;
const { discoverVendors, adapters } = vendorsModule as VendorsApi;

let nodeDeps: RuntimeDeps | undefined;
/** Lazily created Node deps, so old-signature callers (bundle-sync, add-skill) need no change. */
function defaultDeps(): RuntimeDeps {
  return (nodeDeps ??= createNodeDeps());
}
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Registry-owned paths must never be misclassified as "removed upstream" by bundle-sync's
// canonical-directory comparison, nor pruned. An unreadable/invalid registry protects nothing
// here; reconcile() below is the one that surfaces that incompatibility loudly.
export function ownedPaths(root: string, deps: RuntimeDeps = defaultDeps()): Set<string> {
  try {
    const ctx = context(deps.fs.realpathSync(root), "project");
    const { registry } = readRegistry(ctx);
    const owned = new Set<string>();
    for (const entry of Object.values(registry.skills)) for (const file of Object.keys(entry.owned)) owned.add(file.toLowerCase());
    return owned;
  } catch {
    return new Set();
  }
}

const CONFIG_NAMES = [".prettierrc", ".prettierrc.json", ".prettierrc.yaml", ".prettierrc.yml", ".prettierrc.json5", ".prettierrc.js", ".prettierrc.cjs", ".prettierrc.mjs", "prettier.config.js", "prettier.config.cjs", "prettier.config.mjs"];
const FORMATTABLE = /\.(md|markdown|json|ya?ml|jsx?|cjs|mjs)$/i;

// Discover a formatter from the receiving project's OWN configuration; never introduce one.
// node_modules/.bin is checked before a global PATH lookup so a project's pinned version (or a
// test fixture's fake binary) always wins over whatever happens to be globally installed.
export function discoverFormatter(root: string, deps: RuntimeDeps = defaultDeps()): Formatter | null {
  const { fs, path, child } = deps;
  let configPath: string | undefined = CONFIG_NAMES.map((name) => path.join(root, name)).find((candidate) => fs.existsSync(candidate));
  if (!configPath) {
    try {
      const pkg: unknown = JSON.parse(fs.readFileSync(path.join(root, "package.json")));
      if (pkg && Object.hasOwn(pkg as object, "prettier")) configPath = path.join(root, "package.json");
    } catch {
      // No root package.json, or invalid JSON: no formatter configured.
    }
  }
  if (!configPath) return null;
  const local = path.join(root, "node_modules/.bin/prettier");
  let bin: string | null = null;
  if (fs.existsSync(local)) bin = local;
  else {
    try {
      // execFileSync threw on a non-zero exit; runSync reports the status instead.
      if (child.runSync("prettier", ["--version"], { stdio: "ignore" }).status === 0) bin = "prettier";
    } catch {
      // Configured but not installed: report nothing to format rather than fail an install.
    }
  }
  return bin ? { bin, configPath, label: "prettier" } : null;
}

// Formats only the files `include` selects, in a scratch directory so preview (no --apply)
// never touches the target project. Throws on formatter failure so the caller aborts before
// any write — nothing has been committed yet, so there is nothing to roll back.
export function formatFiles(root: string, files: Record<string, FileValue>, include: (file: string) => boolean = () => true, deps: RuntimeDeps = defaultDeps()): FormatResult {
  const { fs, path, os, child } = deps;
  const formatter = discoverFormatter(root, deps);
  const targets = Object.keys(files).filter((file) => include(file) && FORMATTABLE.test(file));
  if (!formatter || !targets.length) return { formatter: null, files, changed: [] };
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "skill-format-"));
  try {
    const scratchPaths = targets.map((file) => path.join(scratch, file));
    targets.forEach((file, index) => {
      fs.mkdirSync(path.dirname(scratchPaths[index]), { recursive: true });
      fs.writeFileSync(scratchPaths[index], files[file].data);
    });
    const args = ["--config", formatter.configPath, "--write", ...scratchPaths];
    let failure: string | null = null;
    try {
      const result = child.runSync(formatter.bin, args, { stdio: "pipe", timeoutMs: 30000 });
      if (result.status !== 0) failure = result.stderr || (result.signal ? `spawnSync ${formatter.bin} ETIMEDOUT` : `Command failed: ${[formatter.bin, ...args].join(" ")}`);
    } catch (error) {
      failure = messageOf(error);
    }
    if (failure !== null) throw new Error(`Formatter failed (${formatter.label}): ${failure.trim()}`);
    const updated = { ...files };
    const changed: string[] = [];
    targets.forEach((file, index) => {
      const data = Buffer.from(fs.readBytesSync(scratchPaths[index]));
      if (!data.equals(files[file].data)) { updated[file] = { ...files[file], data }; changed.push(file); }
    });
    return { formatter: formatter.label, files: updated, changed };
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

function checkCollisions(ctx: RegistryContext, entry: SkillEntry, files: Record<string, FileValue>, deps: RuntimeDeps): void {
  const { fs, path } = deps;
  for (const target of Object.keys(files).filter((file) => !file.startsWith(`${ctx.state}/`))) {
    if (entry.owned[target]) continue;
    const directory = resolveFile(ctx, path.posix.dirname(target));
    if (fs.existsSync(directory) && fs.readdirSync(directory).length) throw new Error(`Existing skill directory is not owned: ${target}`);
  }
}

// Re-renders only vendor wrapper files for one entry against the CURRENT vendor descriptors and
// wrapper template. Package content is read back unchanged, never re-fetched or re-formatted:
// reconciliation is a local metadata operation, not a source update.
function reconcileEntry(project: string, ctx: RegistryContext, entry: SkillEntry, vendors: Vendor[], deps: RuntimeDeps): { updated: SkillEntry; files: Record<string, FileValue> } {
  const { fs, path } = deps;
  const rendered = adapters(vendors, entry.scope, entry.name, entry.packagePath, entry.description, entry.phases, entry.enabled);
  const files: Record<string, FileValue> = {};
  for (const file of Object.keys(entry.owned).filter((item) => item.startsWith(`${entry.packagePath}/`))) {
    const current = snapshot(ctx, file);
    if (!current) throw new Error(`Missing owned file: ${file}`);
    files[file] = { data: Buffer.from(current.data, "base64"), mode: current.mode };
  }
  Object.assign(files, rendered.files);
  if (fs.existsSync(path.join(project, ".claude/skills", entry.name, "SKILL.md")) && !entry.owned[`.claude/skills/${entry.name}/SKILL.md`]) throw new Error(`Reserved workflow skill name: ${entry.name}`);
  checkCollisions(ctx, entry, files, deps);
  const updated: SkillEntry = {
    ...entry, adapters: rendered.paths,
    owned: Object.fromEntries(Object.entries(files).map(([file, value]) => [file, { hash: digest(value.data), sourceHash: entry.owned[file]?.sourceHash ?? digest(value.data), mode: value.mode }])),
  };
  return { updated, files };
}

// Reconciles every installed project-scope skill's vendor coverage against the vendor
// descriptors and wrapper template currently on disk (i.e. whatever bundle-sync or setup just
// synced). Global registries are never read or written here. A modified owned file, an
// unresolved vendor layout, or an invalid/incompatible registry blocks that skill (or the whole
// run) rather than silently overwriting or skipping it.
export function reconcile(root: string, options: ReconcileOptions = {}, deps: RuntimeDeps = defaultDeps()): ReconcileResult {
  const { fs, path } = deps;
  const project = fs.realpathSync(root);
  if (!fs.existsSync(path.join(project, ".project"))) return { status: "not-installed", skills: [] };
  const ctx = context(project, "project");
  if (snapshot(ctx, `${ctx.state}/transaction.json`)) return { status: "pending-transaction", skills: [] };
  let registry: Registry;
  let stored: StoredFile | null;
  try {
    ({ registry, stored } = readRegistry(ctx));
  } catch (error) {
    return { status: "incompatible", error: messageOf(error), skills: [] };
  }
  if (!Object.keys(registry.skills).length) return { status: "clean", skills: [] };
  let vendors: Vendor[];
  try {
    vendors = discoverVendors(project);
  } catch (error) {
    return { status: "coverage-unresolved", error: messageOf(error), skills: [] };
  }
  const results: SkillResult[] = [];
  const operations: Operation[] = [];
  let nextRegistry: Registry | null = null;
  for (const [id, entry] of Object.entries(registry.skills)) {
    const rendered = adapters(vendors, entry.scope, entry.name, entry.packagePath, entry.description, entry.phases, entry.enabled);
    const drift = vendors.filter((vendor) => entry.adapters[vendor.id] !== rendered.paths[vendor.id]).map((vendor) => vendor.id);
    if (!drift.length) { results.push({ id, status: "current" }); continue; }
    const edited = Object.entries(entry.owned).some(([file, owned]) => {
      const current = snapshot(ctx, file);
      return !current || current.hash !== owned.hash || current.mode !== owned.mode;
    });
    if (edited) { results.push({ id, status: "conflict", vendors: drift }); continue; }
    if (!options.apply) { results.push({ id, status: "needs-reconciliation", vendors: drift }); continue; }
    try {
      const { updated, files } = reconcileEntry(project, ctx, entry, vendors, deps);
      if (!nextRegistry) nextRegistry = structuredClone(registry);
      nextRegistry.skills[id] = updated;
      for (const [file, value] of Object.entries(files)) {
        const current = snapshot(ctx, file);
        if (current?.hash === digest(value.data) && current.mode === value.mode) continue;
        operations.push({ path: file, expected: current?.hash || null, expectedMode: current?.mode || null, value });
      }
      results.push({ id, status: "reconciled", vendors: drift });
    } catch (error) {
      results.push({ id, status: "conflict", vendors: drift, error: messageOf(error) });
    }
  }
  if (options.apply && nextRegistry) {
    const data = json(nextRegistry);
    if (!stored || stored.hash !== digest(data)) operations.push({ path: ctx.registry, expected: stored?.hash || null, expectedMode: stored?.mode || null, value: { data, mode: 0o644 } });
    if (operations.length) transact(ctx, operations);
  }
  const status = results.some((item) => item.status === "conflict")
    ? "conflict"
    : results.some((item) => item.status === "needs-reconciliation")
      ? "needs-reconciliation"
      : "clean";
  return { status, skills: results, applied: Boolean(options.apply && operations.length) };
}

/** CLI entry. `argv` excludes the script path. Returns the exit code. */
export function main(argv: string[], deps: RuntimeDeps): number {
  const [action, ...rest] = argv;
  const options = { root: deps.proc.cwd(), apply: false, json: false };
  try {
    for (let index = 0; index < rest.length; index++) {
      if (rest[index] === "--apply") options.apply = true;
      else if (rest[index] === "--json") options.json = true;
      else if (rest[index] === "--root" && rest[index + 1]) options.root = rest[++index];
      else throw new Error(`Unknown option: ${rest[index]}`);
    }
    if (action !== "reconcile") throw new Error("Usage: node ai-framework/scripts/skill-sync.mts reconcile [--root /absolute/project] [--apply] [--json]");
    const result = reconcile(options.root, options, deps);
    deps.io.stdout.write(options.json ? `${JSON.stringify(result, null, 2)}\n` : `${result.status}: ${result.skills.map((item) => `${item.id} (${item.status})`).join(", ") || "no installed skills"}\n`);
    return ["conflict", "incompatible", "coverage-unresolved", "pending-transaction"].includes(result.status) ? 1 : 0;
  } catch (error) {
    deps.io.stderr.write(`skill-sync: ${messageOf(error)}\n`);
    return 1;
  }
}

runDirect(import.meta.url, main);
