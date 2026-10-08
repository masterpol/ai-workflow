import { runDirect } from "./runtime/cli.mts";
/*
 * Report-only status of the agent-browser default: catalog entry, registry state and whether the
 * `agent-browser` CLI is on PATH. Never installs anything.
 * Imports no node:* module at runtime: every fs/process effect goes through the injected RuntimeDeps.
 */

import type { RuntimeDeps } from "./runtime/types.mts";
import { createNodeDeps } from "./runtime/node.mts";
import * as registryModule from "./skill-registry.mts";
import { CATALOG } from "./skill-defaults.mts";

export const ENTRY_ID = "vercel-labs/agent-browser/agent-browser";

export interface RegistryContext { state: string }
/** The slice of skill-registry.mts this script uses. */
export interface RegistryApi {
  context(root: string, scope: string, location?: string): RegistryContext;
  snapshot(ctx: RegistryContext, relative: string, root?: string): unknown;
  readRegistry(ctx: RegistryContext): { registry: { skills: Record<string, { enabled: boolean; scope: string }> } };
}

export type CliState = "available" | "unavailable";
export type OverallStatus = "unsupported" | "not-installed" | "installed-disabled" | "ready";

export interface BrowserReport {
  id: string;
  purpose: string | undefined;
  installed: boolean;
  enabled: boolean | null;
  scope: string | null;
  cli: CliState;
  status: OverallStatus;
  registryError: string | null;
}

const defaultRegistry: RegistryApi = registryModule as RegistryApi;

let nodeDeps: RuntimeDeps | undefined;
/** Lazily created Node deps, so old-signature callers need no change. */
function defaultDeps(): RuntimeDeps {
  return (nodeDeps ??= createNodeDeps());
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function catalogEntry() {
  const found = CATALOG.defaults.find((item) => item.id === ENTRY_ID);
  if (!found) throw new Error(`Catalog is missing ${ENTRY_ID}`);
  return found;
}

// Presence-only check: the exact same pattern already proven in skill-sync.mts's
// discoverFormatter. Never runs `npm i -g agent-browser` or `agent-browser install` — this is
// report-only, always.
export function cliStatus(deps: RuntimeDeps = defaultDeps()): CliState {
  try {
    const result = deps.child.runSync("agent-browser", ["--version"], { stdio: "ignore", timeoutMs: 5000 });
    return result.status === 0 ? "available" : "unavailable";
  } catch {
    return "unavailable";
  }
}

// A missing CLI is a host capability fact, not a failure of this project's install state, so it
// takes priority over installed/enabled: without the CLI nothing here can run regardless of what
// the registry says. When the CLI is present, installed vs not-installed vs installed-but-
// disabled are reported distinctly, never collapsed into one another.
export function overallStatus({ installed, enabled, cli }: { installed: boolean; enabled: boolean | null; cli: CliState }): OverallStatus {
  if (cli !== "available") return "unsupported";
  if (!installed) return "not-installed";
  if (enabled === false) return "installed-disabled";
  return "ready";
}

// Read-only: never installs the skill, never invokes the CLI's own install flow. A default this
// project hasn't installed, or whose CLI hasn't been set up on this host, is reported as an
// explicit status string — never as an error, and never silently reported as "installed".
export function report(root: string, deps: RuntimeDeps = defaultDeps(), registryApi: RegistryApi = defaultRegistry): BrowserReport {
  root = deps.fs.realpathSync(root);
  const entry = catalogEntry();
  let skills: Record<string, { enabled: boolean; scope: string }> = {};
  let registryError: string | null = null;
  try {
    const ctx = registryApi.context(root, "project");
    if (registryApi.snapshot(ctx, `${ctx.state}/transaction.json`)) registryError = "Interrupted skill transaction: run add-skill recover before trusting this report";
    else skills = registryApi.readRegistry(ctx).registry.skills;
  } catch (error) {
    registryError = messageOf(error);
  }
  const installedEntry = skills[entry.id];
  const installed = Boolean(installedEntry);
  const enabled = installed ? installedEntry.enabled : null;
  const scope = installed ? installedEntry.scope : null;
  const cli = cliStatus(deps);
  return {
    id: entry.id,
    purpose: entry.purpose,
    installed,
    enabled,
    scope,
    cli,
    status: overallStatus({ installed, enabled, cli }),
    registryError,
  };
}

interface CliOptions { root: string; json?: boolean }

function cli(argv: string[], deps: RuntimeDeps): string {
  const [action, ...rest] = argv;
  const options: CliOptions = { root: deps.proc.cwd() };
  for (let index = 0; index < rest.length; index++) {
    const arg = rest[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--root" && rest[index + 1]) options.root = rest[++index];
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (action === "report") {
    const result = report(options.root, deps);
    if (options.json) return JSON.stringify(result, null, 2);
    const lines = [`${result.id}: ${result.status} (installed=${result.installed}, enabled=${result.enabled === null ? "n/a" : result.enabled}, cli=${result.cli})`];
    if (result.registryError) lines.push(`registry: ${result.registryError}`);
    return lines.join("\n");
  }
  throw new Error("Usage: node ai-framework/scripts/browser-runtime.mts report [--root /absolute/project] [--json]");
}

/** CLI entry. `argv` excludes the script path. Returns the exit code. */
export function main(argv: string[], deps: RuntimeDeps): number {
  try {
    deps.io.stdout.write(`${cli(argv, deps)}\n`);
    return 0;
  } catch (error) {
    deps.io.stderr.write(`browser-runtime: ${messageOf(error)}\n`);
    return 1;
  }
}

runDirect(import.meta.url, main);
