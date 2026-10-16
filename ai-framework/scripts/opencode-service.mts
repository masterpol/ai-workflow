import { runDirect } from "./runtime/cli.mts";
/**
 * opencode-service - free OpenCode's background-server port before the first OpenCode worker starts.
 *
 * Usage: node ai-framework/scripts/opencode-service.mts free [--json]
 *
 * A stale `opencode serve --service` left by an earlier session holds the managed port, and a new OpenCode worker
 * then fails at agent readiness while it tries to start its own server on that port. `free` asks OpenCode to stop
 * the service, then ends any `opencode serve` listener that is still running (SIGTERM, then SIGKILL), and re-checks.
 * A program other than `opencode serve` on the service port is reported and never signalled.
 *
 * Call it only when no OpenCode worker of the current Run is live: later workers share the server the first one
 * starts. `orca-run.mts dispatch` does this for vendor `opencode`. Exit 0 when the port is free (or the platform has
 * no POSIX listener inspection), 1 when a listener remains or cannot be verified.
 */
import { createNodeDeps } from "./runtime/node.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

export type FreeStatus = "free" | "held" | "foreign" | "unverified" | "unsupported";
export interface Listener { pid: number; port: number; command: string }
export interface FreeResult {
  status: FreeStatus;
  /** True when `opencode service stop` was run. */
  stopped: boolean;
  /** PIDs that received a signal. */
  signalled: number[];
  /** Listeners still present at the final check (opencode or foreign). */
  remaining: Listener[];
  reason?: string;
}
export interface FreeOptions {
  /** Grace period after SIGTERM before SIGKILL, and after SIGKILL before the final check. */
  graceMs?: number;
  /** Timeout for each external command. */
  commandTimeoutMs?: number;
}

const SERVE = /(^|\/)opencode(\s|$).*\bserve\b/;
let nodeDeps: RuntimeDeps | undefined;
const defaultDeps = (): RuntimeDeps => (nodeDeps ??= createNodeDeps());

/** The port recorded in OpenCode's service state file, or undefined when the file is absent or unreadable. */
export function servicePort(deps: RuntimeDeps): number | undefined {
  const env = deps.proc.env;
  const home = env.HOME;
  const stateHome = env.XDG_STATE_HOME || (home ? deps.path.join(home, ".local", "state") : undefined);
  if (!stateHome) return undefined;
  try {
    const url = (JSON.parse(deps.fs.readFileSync(deps.path.join(stateHome, "opencode", "service.json"))) as { url?: unknown }).url;
    const port = typeof url === "string" ? Number(new URL(url).port) : NaN;
    return Number.isInteger(port) && port > 0 && port < 65536 ? port : undefined;
  } catch { return undefined; }
}

function commandOf(pid: number, deps: RuntimeDeps, timeoutMs: number): string {
  const result = deps.child.runSync("ps", ["-o", "command=", "-p", String(pid)], { timeoutMs });
  return result.status === 0 ? result.stdout.trim() : "";
}

/** Loopback TCP listeners from `lsof -F pn`; undefined when lsof is unavailable or fails. */
export function listeners(deps: RuntimeDeps, timeoutMs = 5000): Listener[] | undefined {
  let result;
  try { result = deps.child.runSync("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN", "-Fpn"], { timeoutMs }); }
  catch { return undefined; }
  // lsof exits 1 with no output when nothing listens.
  if (result.status !== 0 && !(result.status === 1 && result.stdout.trim() === "")) return undefined;
  const found: Listener[] = [];
  let pid = 0;
  for (const line of result.stdout.split("\n")) {
    if (line.startsWith("p")) pid = Number(line.slice(1));
    else if (line.startsWith("n") && pid > 0) {
      const port = Number(line.slice(line.lastIndexOf(":") + 1));
      if (Number.isInteger(port) && !found.some((item) => item.pid === pid && item.port === port)) found.push({ pid, port, command: "" });
    }
  }
  for (const item of found) item.command = commandOf(item.pid, deps, timeoutMs);
  return found;
}

const isServe = (item: Listener): boolean => SERVE.test(item.command);

function signal(pid: number, name: string, deps: RuntimeDeps): boolean {
  try { deps.proc.kill(pid, name); return true; }
  catch (error) { if ((error as { code?: string }).code === "ESRCH") return false; throw error; }
}

export async function freeOpencodePort(deps: RuntimeDeps = defaultDeps(), options: FreeOptions = {}): Promise<FreeResult> {
  const graceMs = options.graceMs ?? 2000;
  const timeoutMs = options.commandTimeoutMs ?? 10000;
  if (deps.proc.platform === "win32") return { status: "unsupported", stopped: false, signalled: [], remaining: [], reason: "no POSIX listener inspection on Windows" };
  const port = servicePort(deps);
  const scan = (): { serve: Listener[]; foreign: Listener[] } | undefined => {
    const all = listeners(deps, timeoutMs);
    if (!all) return undefined;
    return { serve: all.filter(isServe), foreign: port === undefined ? [] : all.filter((item) => item.port === port && !isServe(item)) };
  };
  const first = scan();
  if (!first) return { status: "unverified", stopped: false, signalled: [], remaining: [], reason: "lsof unavailable" };
  if (first.serve.length === 0 && first.foreign.length === 0) return { status: "free", stopped: false, signalled: [], remaining: [] };

  let stopped = false;
  if (first.serve.length > 0) {
    try { deps.child.runSync("opencode", ["service", "stop"], { timeoutMs }); stopped = true; }
    catch { /* a missing CLI is handled by signalling the listener below */ }
    await deps.clock.sleep(Math.min(graceMs, 500));
  }
  const signalled: number[] = [];
  const afterStop = scan();
  if (afterStop) {
    for (const item of afterStop.serve) if (!signalled.includes(item.pid) && signal(item.pid, "SIGTERM", deps)) signalled.push(item.pid);
    if (signalled.length > 0) {
      await deps.clock.sleep(graceMs);
      for (const pid of signalled) signal(pid, "SIGKILL", deps);
      await deps.clock.sleep(Math.min(graceMs, 500));
    }
  }
  const last = scan();
  if (!last) return { status: "unverified", stopped, signalled, remaining: [], reason: "lsof unavailable at the final check" };
  if (last.foreign.length > 0) return { status: "foreign", stopped, signalled, remaining: [...last.serve, ...last.foreign], reason: `port ${port} is held by a program other than opencode serve` };
  if (last.serve.length > 0) return { status: "held", stopped, signalled, remaining: last.serve, reason: "an opencode serve listener survived SIGKILL" };
  return { status: "free", stopped, signalled, remaining: [] };
}

export async function main(argv: string[], deps: RuntimeDeps = defaultDeps()): Promise<number> {
  const json = argv.includes("--json");
  const command = argv.filter((arg) => arg !== "--json");
  if (command.length !== 1 || command[0] !== "free") { deps.io.stderr.write("usage: opencode-service.mts free [--json]\n"); return 2; }
  const result = await freeOpencodePort(deps);
  if (json) deps.io.stdout.write(`${JSON.stringify(result)}\n`);
  else {
    const extra = result.signalled.length ? ` (signalled ${result.signalled.join(", ")})` : "";
    deps.io.stdout.write(`opencode port: ${result.status}${extra}${result.reason ? ` - ${result.reason}` : ""}\n`);
  }
  return result.status === "free" || result.status === "unsupported" ? 0 : 1;
}

runDirect(import.meta.url, main);
