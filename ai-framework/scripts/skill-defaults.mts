import { runDirect } from "./runtime/cli.mts";
import type { RuntimeDeps } from "./runtime/types.mts";
import { createNodeDeps } from "./runtime/node.mts";
import * as registryModule from "./skill-registry.mts";
import catalogJson from "../integrations/skill-defaults.json" with { type: "json" };

export interface CatalogEntry {
  id: string;
  purpose?: string;
  modes?: string[];
  defaultMode?: string;
  recommendedPhases?: string[];
  runtime?: { check: string[] };
}
export interface Catalog { schemaVersion: number; defaults: CatalogEntry[] }

export interface RegistryEntry { enabled: boolean; scope: string; phases: string[] }
export interface RegistryContext { state: string }
/** The slice of skill-registry.mts this script uses. */
export interface RegistryApi {
  context(root: string, scope: string, location?: string, deps?: RuntimeDeps): RegistryContext;
  snapshot(ctx: RegistryContext, relative: string, root?: string, deps?: RuntimeDeps): unknown;
  readRegistry(ctx: RegistryContext, deps?: RuntimeDeps): { registry: { skills: Record<string, RegistryEntry> } };
}

export interface ModesState {
  schemaVersion: 1;
  caveman?: { enabled?: boolean; default?: string; phases?: Record<string, string> };
}
export interface ResolveOptions { phase?: string; invocationArg?: string; argumentsText?: unknown }
export interface DefaultReport {
  id: string;
  purpose: string | undefined;
  installed: boolean;
  enabled: boolean | null;
  scope: string | null;
  phases: string[] | null;
  phaseGap: string[];
  runtime: "available" | "unavailable" | null;
}
export interface Report { registryError: string | null; defaults: DefaultReport[] }

export const CATALOG: Catalog = catalogJson as Catalog;
// Kept explicit rather than derived from the catalog so a malformed catalog entry can never
// silently widen what resolveMode() accepts; a test cross-checks this set against the catalog.
export const MODES: Set<string> = new Set(["lite", "full", "ultra", "wenyan-lite", "wenyan-full", "wenyan-ultra"]);
// The seven workflow phases, plus two scopes so every non-phase skill ("utility") and every
// dispatched agent ("agent") resolves through the same precedence chain.
export const PHASES: Set<string> = new Set(["shape", "critique", "plan", "build", "audit", "ship", "cooldown", "utility", "agent"]);
export const MODES_FILE = ".project/skills/modes.json";

const defaultRegistry: RegistryApi = registryModule as RegistryApi;

let nodeDeps: RuntimeDeps | undefined;
/** Lazily created Node deps, so old-signature callers (state-snapshot, workflow-doctor, ...) need no change. */
function defaultDeps(): RuntimeDeps {
  return (nodeDeps ??= createNodeDeps());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Resolving the real path and confirming it stays under the real project root catches both a
// symlinked leaf and a symlinked ancestor directory (e.g. .project/skills/).
export function loadModes(root: string, deps: RuntimeDeps = defaultDeps()): ModesState | null {
  const { fs, path } = deps;
  const full = path.join(root, MODES_FILE);
  if (!fs.existsSync(full)) return null;
  const realRoot = fs.realpathSync(root);
  const realFull = fs.realpathSync(full);
  const relative = path.relative(realRoot, realFull);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Mode state file resolves outside the project root");
  const value: unknown = JSON.parse(fs.readFileSync(full));
  if (!isRecord(value) || value.schemaVersion !== 1) throw new Error("Unsupported or invalid mode state schema");
  const caveman = value.caveman;
  if (caveman !== undefined) {
    if (!isRecord(caveman)) throw new Error("Invalid caveman mode state");
    if (caveman.enabled !== undefined && typeof caveman.enabled !== "boolean") throw new Error("caveman.enabled must be boolean");
    if (caveman.default !== undefined && !(typeof caveman.default === "string" && MODES.has(caveman.default))) throw new Error(`Invalid caveman.default: ${String(caveman.default)}`);
    if (caveman.phases !== undefined) {
      if (!isRecord(caveman.phases)) throw new Error("caveman.phases must be an object");
      for (const [phase, mode] of Object.entries(caveman.phases)) {
        if (!PHASES.has(phase)) throw new Error(`Unknown phase in caveman.phases: ${phase}`);
        if (!(typeof mode === "string" && MODES.has(mode))) throw new Error(`Invalid mode for phase ${phase}: ${String(mode)}`);
      }
    }
  }
  return value as unknown as ModesState;
}

// A phase invocation's arguments are free-form text (e.g. "caveman=lite fix the login bug"), not
// a parsed flag set. No `caveman=` mention is not an error (falls through to instance/bundle
// defaults); a `caveman=` mention with an unrecognized value IS an error (a real typo).
export function extractInvocationArg(argumentsText: unknown): string | undefined {
  const match = typeof argumentsText === "string" ? argumentsText.match(/\bcaveman=(\S+)/i) : null;
  return match ? match[1].toLowerCase() : undefined;
}

// invocationArg is scoped to this one call and never persisted; only an explicit modes.json edit persists.
export function resolveMode(root: string, options: ResolveOptions = {}, deps: RuntimeDeps = defaultDeps()): string {
  const { phase, argumentsText } = options;
  let { invocationArg } = options;
  if (phase === undefined || !PHASES.has(phase)) throw new Error(`Unknown phase: ${String(phase)}`);
  if (invocationArg === undefined) invocationArg = extractInvocationArg(argumentsText);
  if (invocationArg !== undefined) {
    if (invocationArg !== "off" && !MODES.has(invocationArg)) throw new Error(`Choose --arg explicitly from ${[...MODES, "off"].join(",")}`);
    return invocationArg;
  }
  const caveman = loadModes(root, deps)?.caveman ?? {};
  if (caveman.enabled === false) return "off";
  const phaseMode = caveman.phases?.[phase];
  if (phaseMode) return phaseMode;
  if (caveman.default) return caveman.default;
  const fallback = CATALOG.defaults.find((entry) => entry.id.endsWith("/caveman"))?.defaultMode;
  if (fallback === undefined) throw new Error("Catalog has no caveman default mode");
  return fallback;
}

function runtimeStatus(entry: CatalogEntry, deps: RuntimeDeps): "available" | "unavailable" | null {
  if (!entry.runtime) return null;
  try {
    const [command, ...args] = entry.runtime.check;
    const result = deps.child.runSync(command, args, { timeoutMs: 5000 });
    return result.status === 0 ? "available" : "unavailable";
  } catch {
    return "unavailable";
  }
}

// Read-only: never installs, never mutates the registry. A default this project hasn't
// installed is reported "not-installed", not an error.
export function report(root: string, deps: RuntimeDeps = defaultDeps(), registryApi: RegistryApi = defaultRegistry): Report {
  root = deps.fs.realpathSync(root);
  let skills: Record<string, RegistryEntry> = {};
  let registryError: string | null = null;
  try {
    const ctx = registryApi.context(root, "project", undefined, deps);
    if (registryApi.snapshot(ctx, `${ctx.state}/transaction.json`, "target", deps)) registryError = "Interrupted skill transaction: run add-skill recover before trusting this report";
    else skills = registryApi.readRegistry(ctx, deps).registry.skills;
  } catch (error) {
    registryError = messageOf(error);
  }
  const defaults = CATALOG.defaults.map((entry): DefaultReport => {
    const installed = skills[entry.id];
    return {
      id: entry.id,
      purpose: entry.purpose,
      installed: Boolean(installed),
      enabled: installed ? installed.enabled : null,
      scope: installed ? installed.scope : null,
      phases: installed ? installed.phases : null,
      // Phases the catalog recommends that this install's wrapper does not list: the wrapper tells
      // an agent not to activate the skill outside its listed phases.
      phaseGap: installed && entry.recommendedPhases ? entry.recommendedPhases.filter((phase) => !installed.phases.includes(phase)) : [],
      runtime: runtimeStatus(entry, deps),
    };
  });
  return { registryError, defaults };
}

interface CliOptions { root: string; json?: boolean; phase?: string; arg?: string; argsText?: string }

function cli(argv: string[], deps: RuntimeDeps): string {
  const [action, ...rest] = argv;
  const options: CliOptions = { root: deps.proc.cwd() };
  for (let index = 0; index < rest.length; index++) {
    const arg = rest[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--root" && rest[index + 1]) options.root = rest[++index];
    else if (arg === "--phase" && rest[index + 1]) options.phase = rest[++index];
    else if (arg === "--arg" && rest[index + 1]) options.arg = rest[++index];
    else if (arg === "--args-text" && rest[index + 1] !== undefined) options.argsText = rest[++index];
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (action === "resolve-mode") {
    if (options.arg !== undefined && options.argsText !== undefined) throw new Error("Pass --arg (an exact mode) or --args-text (free-form invocation text), not both");
    const mode = resolveMode(options.root, { phase: options.phase, invocationArg: options.arg, argumentsText: options.argsText }, deps);
    return options.json ? JSON.stringify({ phase: options.phase, mode }, null, 2) : mode;
  }
  if (action === "report") {
    const result = report(options.root, deps);
    if (options.json) return JSON.stringify(result, null, 2);
    const lines = result.defaults.map((entry) => `${entry.id}: ${entry.installed ? `installed (${entry.enabled ? "enabled" : "disabled"}, ${entry.scope})` : "not installed"}${entry.runtime ? `, runtime ${entry.runtime}` : ""}`);
    if (result.registryError) lines.push(`registry: ${result.registryError}`);
    return lines.join("\n");
  }
  throw new Error("Usage: node ai-framework/scripts/skill-defaults.mts <resolve-mode --phase P [--arg exact-mode | --args-text free-form-invocation-text] | report> [--root /absolute/project] [--json]");
}

/** CLI entry. `argv` excludes the script path. Returns the exit code. */
export function main(argv: string[], deps: RuntimeDeps): number {
  try {
    deps.io.stdout.write(`${cli(argv, deps)}\n`);
    return 0;
  } catch (error) {
    deps.io.stderr.write(`skill-defaults: ${messageOf(error)}\n`);
    return 1;
  }
}

runDirect(import.meta.url, main);
