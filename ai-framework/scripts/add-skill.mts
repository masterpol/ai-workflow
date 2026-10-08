import { runDirect } from "./runtime/cli.mts";
import type { RuntimeDeps } from "./runtime/types.mts";
import { createNodeDeps } from "./runtime/node.mts";
import type { FileValue, Operation, Registry, RegistryApi, RegistryContext, SkillEntry, StoredFile, Vendor, VendorsApi } from "./skill-sync.mts";
import { formatFiles } from "./skill-sync.mts";
// Shared skill helpers are imported directly as TypeScript module namespaces.
import * as sourceModule from "./skill-source.mts";
import * as vendorsModule from "./skill-vendors.mts";
import * as registryModule from "./skill-registry.mts";

export interface SourceOptions { repo?: string; ref?: string; path?: string; [key: string]: unknown }
export interface InspectedSource {
  id: string; name: string; description: string; url: string; revision: string; sourcePath: string;
  files: Record<string, FileValue>;
  license: { text: string; path: string } | null;
}
interface SourceApi {
  identity(value: unknown): { id: string };
  inspectSource(skill: unknown, options: SourceOptions): InspectedSource;
}
export interface AddSkillOptions extends SourceOptions {
  action?: string; root?: string; scope?: string; location?: string; skill?: string; phases?: string | string[];
  apply?: boolean; transaction?: unknown; json?: boolean; help?: boolean;
}
export type AddSkillResult = Record<string, unknown>;
interface ProjectLinks { schemaVersion: number; locations: unknown[] }

const { identity, inspectSource } = sourceModule as SourceApi;
const { discoverVendors, adapters } = vendorsModule as VendorsApi;
const { context, digest, json, snapshot, readRegistry, transact, recover, resolveFile } = registryModule as RegistryApi;

let nodeDeps: RuntimeDeps | undefined;
/** Lazily created Node deps, so old-signature callers need no change. */
function defaultDeps(): RuntimeDeps {
  return (nodeDeps ??= createNodeDeps());
}
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const PHASES = new Set(["shape", "critique", "plan", "build", "audit", "ship", "cooldown", "manual"]);

export function phases(value: unknown): string[] {
  const selected = typeof value === "string" ? value.split(",") : value;
  if (!Array.isArray(selected) || !selected.length || selected.some((phase) => !PHASES.has(phase)) || new Set(selected).size !== selected.length) throw new Error(`Choose --phases explicitly from ${[...PHASES].join(",")}`);
  return selected as string[];
}

function makeEntry(source: InspectedSource, ctx: RegistryContext, vendors: Vendor[], selectedPhases: string[], enabled: boolean, deps: RuntimeDeps): { entry: SkillEntry; files: Record<string, FileValue> } {
  const packagePath = `${ctx.state}/packages/${source.id}`;
  const rendered = adapters(vendors, ctx.scope, source.name, packagePath, source.description, selectedPhases, enabled);
  const files: Record<string, FileValue> = { ...rendered.files };
  for (const [relative, value] of Object.entries(source.files)) files[`${packagePath}/${relative}`] = value;
  if (source.license && !source.files["UPSTREAM-LICENSE.txt"]) files[`${packagePath}/UPSTREAM-LICENSE.txt`] = { data: Buffer.from(source.license.text), mode: 0o644 };
  // Upstream package content only, never the generated wrapper templates: formatting a wrapper
  // could fight its exact activation-instruction text. sourceHash freezes the pre-format
  // upstream digest; hash becomes the formatted baseline actually written and re-verified.
  const sourceHashes = Object.fromEntries(Object.keys(files).map((file) => [file, digest(files[file].data)]));
  const { formatter, files: formatted, changed } = formatFiles(ctx.roots.target, files, (file) => file.startsWith(`${packagePath}/`) && file !== `${packagePath}/UPSTREAM-LICENSE.txt`, deps);
  const entry: SkillEntry = {
    id: source.id, name: source.name, description: source.description, scope: ctx.scope,
    source: { url: source.url, revision: source.revision, path: source.sourcePath },
    license: source.license ? { status: "present", sourcePath: source.license.path } : { status: "not-found" },
    enabled, phases: selectedPhases, packagePath, adapters: rendered.paths,
    runtime: { status: "unverified", note: "Inspect upstream instructions for prerequisites before execution" },
    owned: Object.fromEntries(Object.entries(formatted).map(([file, value]) => [file, { hash: digest(value.data), sourceHash: sourceHashes[file], mode: value.mode }])),
  };
  if (formatter) entry.formatting = { tool: formatter, changed };
  return { entry, files: formatted };
}

function operationsFor(ctx: RegistryContext, oldEntry: SkillEntry | undefined, files: Record<string, FileValue>, registry: Registry, stored: StoredFile | null): Operation[] {
  const operations: Operation[] = [];
  const owned = oldEntry?.owned || {};
  for (const file of new Set([...Object.keys(owned), ...Object.keys(files)])) {
    const current = snapshot(ctx, file);
    if (owned[file]) {
      if (current?.hash !== owned[file].hash || current.mode !== owned[file].mode) throw new Error(`Local modification or missing owned file: ${file}`);
    } else if (current) throw new Error(`Unowned destination collision: ${file}`);
    const value = files[file] || null;
    if (value && current?.hash === digest(value.data) && current.mode === value.mode) continue;
    operations.push({ path: file, expected: current?.hash || null, expectedMode: current?.mode || null, value });
  }
  const data = json(registry);
  if (!stored || stored.hash !== digest(data)) operations.push({ path: ctx.registry, expected: stored?.hash || null, expectedMode: stored?.mode || null, value: { data, mode: 0o644 } });
  return operations;
}

function checkNamespace(project: string, ctx: RegistryContext, name: string, previous: SkillEntry | undefined, files: Record<string, FileValue>, deps: RuntimeDeps): void {
  const { fs, path } = deps;
  const canonical = path.join(project, ".claude/skills", name, "SKILL.md");
  if (fs.existsSync(canonical) && !(ctx.scope === "project" && previous?.owned[`.claude/skills/${name}/SKILL.md`])) throw new Error(`Reserved workflow skill name: ${name}`);
  for (const target of Object.keys(files).filter((file) => !file.startsWith(`${ctx.state}/`))) {
    const directory = resolveFile(ctx, path.posix.dirname(target));
    if (!previous?.owned[target] && fs.existsSync(directory) && fs.readdirSync(directory).length) throw new Error(`Existing skill directory is not owned: ${target}`);
  }
}

function globalLink(ctx: RegistryContext, operations: Operation[]): void {
  if (ctx.scope !== "global") return;
  const file = ".project/skills/global.json";
  const old = snapshot(ctx, file, "project");
  const value = (old ? JSON.parse(Buffer.from(old.data, "base64").toString()) : { schemaVersion: 1, locations: [] }) as ProjectLinks;
  if (value.schemaVersion !== 1 || !Array.isArray(value.locations) || value.locations.some((item) => typeof item !== "string")) throw new Error("Invalid project global-skill links");
  if (!value.locations.includes(ctx.roots.target)) {
    value.locations.push(ctx.roots.target);
    // The registry remains the last commit record, after the cross-root link.
    operations.unshift({ root: "project", path: file, expected: old?.hash || null, expectedMode: old?.mode || null, value: { data: json(value), mode: 0o644 } });
  }
}

export function run(options: AddSkillOptions = {}, deps: RuntimeDeps = defaultDeps()): AddSkillResult {
  const { fs, path } = deps;
  const action = options.action || "install";
  const project = fs.realpathSync(options.root || deps.proc.cwd());
  if (action === "inspect") {
    const source = inspectSource(options.skill, options);
    return { id: source.id, revision: source.revision, description: source.description, sourcePath: source.sourcePath, license: source.license ? "present" : "not-found", files: Object.keys(source.files), instructions: source.files["SKILL.md"].data.toString() };
  }
  if (!["install", "update", "list", "enable", "disable", "remove", "recover"].includes(action)) throw new Error(`Unknown action: ${action}`);
  // Existence is resolved before asking callers for an installation choice, without target writes.
  const source = action === "install" ? inspectSource(options.skill, options) : null;
  const ctx = context(project, options.scope, options.location);
  if (action === "recover") {
    if (!options.apply) return { action, pending: Boolean(snapshot(ctx, `${ctx.state}/transaction.json`)), applied: false };
    return { action, recovered: recover(ctx), applied: true };
  }
  if (snapshot(ctx, `${ctx.state}/transaction.json`)) throw new Error("Interrupted transaction: run recover before continuing");
  const { registry, stored } = readRegistry(ctx);
  if (action === "list") return { scope: ctx.scope, skills: Object.values(registry.skills) };
  const id = identity(options.skill).id;
  const previous: SkillEntry | undefined = registry.skills[id];
  if (action !== "install" && !previous) throw new Error(`Skill is not installed: ${id}`);
  let files: Record<string, FileValue> = {};
  let entry: SkillEntry | undefined;
  if (action === "remove") {
    delete registry.skills[id];
  } else if (action === "install" || action === "update") {
    const selectedPhases = phases(options.phases || (action === "update" ? previous.phases : undefined));
    const updated = source || inspectSource(id, { ...options, path: options.path || previous.source.path, repo: options.repo || (path.isAbsolute(previous.source.url) ? previous.source.url : undefined) });
    if (Object.values(registry.skills).some((item) => item.name === updated.name && item.id !== id)) throw new Error(`Skill name already belongs to another source: ${updated.name}`);
    ({ entry, files } = makeEntry(updated, ctx, discoverVendors(project), selectedPhases, previous?.enabled ?? true, deps));
    checkNamespace(project, ctx, updated.name, previous, files, deps);
    registry.skills[id] = entry;
  } else {
    const toggled: SkillEntry = structuredClone(previous);
    entry = toggled;
    toggled.enabled = action === "enable";
    const rendered = adapters(discoverVendors(project), ctx.scope, toggled.name, toggled.packagePath, toggled.description, toggled.phases, toggled.enabled);
    // Keep package files intact; re-render only owned vendor entry points.
    for (const file of Object.keys(toggled.owned).filter((file) => file.startsWith(`${toggled.packagePath}/`))) {
      const current = snapshot(ctx, file);
      if (!current) throw new Error(`Missing owned file: ${file}`);
      files[file] = { data: Buffer.from(current.data, "base64"), mode: current.mode };
    }
    Object.assign(files, rendered.files);
    checkNamespace(project, ctx, toggled.name, previous, files, deps);
    toggled.adapters = rendered.paths;
    toggled.owned = Object.fromEntries(Object.entries(files).map(([file, value]) => [file, { hash: digest(value.data), sourceHash: previous.owned[file]?.sourceHash || digest(value.data), mode: value.mode }]));
    registry.skills[id] = toggled;
  }
  const operations = operationsFor(ctx, previous, files, registry, stored);
  if (action !== "remove") globalLink(ctx, operations);
  if (options.apply && operations.length) transact(ctx, operations, options.transaction);
  return { action, id, applied: Boolean(options.apply), changed: operations.map((operation) => operation.path), vendors: Object.keys(entry?.adapters || previous.adapters), phases: entry?.phases || previous.phases, revision: entry?.source.revision || previous.source.revision, license: entry?.license || previous.license, runtime: entry?.runtime || previous.runtime };
}

export function cli(argv: string[], deps: RuntimeDeps = defaultDeps()): string | AddSkillResult {
  const options: Record<string, string | boolean> = {};
  const valued = new Set(["root", "scope", "location", "phases", "repo", "ref", "path"]);
  const flags = new Set(["apply", "json", "help"]);
  const positional: string[] = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (!arg.startsWith("--")) { positional.push(arg); continue; }
    const key = arg.slice(2);
    if (Object.hasOwn(options, key)) throw new Error(`Duplicate option: ${arg}`);
    if (flags.has(key)) options[key] = true;
    else if (valued.has(key) && argv[index + 1] && !argv[index + 1].startsWith("--")) options[key] = argv[++index];
    else throw new Error(`Unknown option or missing value: ${arg}`);
  }
  if (positional.length > 2) throw new Error("Expected an action and at most one skill identity");
  options.action = positional[0] || "help";
  options.skill = positional[1];
  if (options.help || options.action === "help") return "Usage: node ai-framework/scripts/add-skill.mts <inspect|install|update|list|enable|disable|remove|recover> [owner/repo/skill]\nChoose --scope project|global and --phases shape,build,... for install. Global also needs --location /absolute/user-root.\nDefault: preview. Use --apply to write. --root selects project; --repo selects an offline repository; --ref pins a commit; --path selects an exact repository SKILL.md.\n";
  return run(options as AddSkillOptions, deps);
}

/** CLI entry. `argv` excludes the script path. Returns the exit code. */
export function main(argv: string[], deps: RuntimeDeps): number {
  try {
    const result = cli(argv, deps);
    deps.io.stdout.write(typeof result === "string" ? result : `${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    deps.io.stderr.write(`add-skill: ${messageOf(error)}\n`);
    return 1;
  }
}

runDirect(import.meta.url, main);
