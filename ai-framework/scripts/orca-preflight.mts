import { runDirect } from "./runtime/cli.mts";
import { report as policyReport } from "./orca-policy.mts";
import { createNodeDeps } from "./runtime/node.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

export const MAX_OUTPUT_BYTES = 256 * 1024;
export const CALL_TIMEOUT_MS = 5000;
export const TOTAL_TIMEOUT_MS = 20000;
export const SUPPORTED_VERSION = "1.4.222";
const CALLS = Object.freeze({
  cliGuide: ["skills", "get", "orca-cli", "--json"],
  orchestrationGuide: ["skills", "get", "orchestration", "--json"],
  status: ["status", "--json"],
});

type Env = Record<string, string | undefined>;
type Json = Record<string, unknown>;

/** The node:child_process spawnSync options an injected `run` receives (kept for compatibility). */
export interface RunOptions {
  cwd: string; env: Env; shell: false; encoding: "utf8"; timeout: number;
  maxBuffer: number; killSignal: "SIGKILL"; windowsHide: true;
}
export interface Receipt {
  status?: number | null; signal?: string | null; stdout?: unknown; stderr?: unknown; error?: { code?: string };
}
export type Run = (command: string, args: string[], options: RunOptions) => Receipt | null;
export interface ReportOptions {
  workerContext?: boolean; probe?: boolean; env?: Env; platform?: string;
  present?: (command: string, env: Env, platform: string) => boolean;
  run?: Run; now?: () => number; [key: string]: unknown;
}
interface Context { root: string; env: Env; run: Run; now: () => number; started: number }

let nodeDeps: RuntimeDeps | undefined;
const defaultDeps = (): RuntimeDeps => (nodeDeps ??= createNodeDeps());
const byteLength = (text: string): number => new TextEncoder().encode(text).length;

export function selectExecutable(env: Env, platform: string, deps: RuntimeDeps = defaultDeps()): string | null {
  if (env.ORCA_CLI_COMMAND) {
    const command = env.ORCA_CLI_COMMAND;
    // Paths may contain spaces, but an override is never interpreted as command text.
    if (typeof command !== "string" || command.length > 4096 || /[\0\r\n]/.test(command)) return null;
    if (!deps.path.isAbsolute(command) && !/^(?!\.+$)[a-zA-Z0-9._-]+$/.test(command)) return null;
    return command;
  }
  if (env.ORCA_DEV_REPO_ROOT) return "orca-dev";
  if (platform === "linux" && !env.ORCA_TERMINAL_HANDLE && !env.ORCA_AGENT_SESSION_ID) return "orca-ide";
  return ["darwin", "linux", "win32"].includes(platform) ? "orca" : null;
}

// Absolute PATH entries only, so an empty or relative entry cannot resolve to a file inside the inspected repo.
const absolutePathEntries = (env: Env, deps: RuntimeDeps): string[] =>
  (env.PATH || "").split(deps.path.delimiter).filter((directory) => deps.path.isAbsolute(directory)).slice(0, 64);

export function executablePresent(command: string, env: Env, platform: string, deps: RuntimeDeps = defaultDeps()): boolean {
  const { fs, path } = deps;
  const extensions = platform === "win32" ? ["", ".exe"] : [""];
  const directories = path.isAbsolute(command) ? [""] : absolutePathEntries(env, deps);
  for (const directory of directories) for (const extension of extensions) {
    const file = directory ? path.join(directory, `${command}${extension}`) : `${command}${extension}`;
    try {
      if (!fs.statSync(file).isFile()) continue;
      fs.accessSync(file, platform === "win32" ? fs.constants.F_OK : fs.constants.X_OK);
      return true;
    } catch { /* Missing or inaccessible executables are unavailable, never an install request. */ }
  }
  return false;
}

/**
 * Default probe runner over deps.child.runSync. The shared adapter has no maxBuffer, killSignal or error
 * code, so a timeout is recognised by a killed child (status null, signal set) after the full timeout, and
 * oversized output is caught by the byte checks in readReceipt.
 */
function defaultRun(deps: RuntimeDeps): Run {
  return (command, args, options) => {
    const started = deps.clock.perfNowMs();
    const result = deps.child.runSync(command, args, { cwd: options.cwd, env: options.env, timeoutMs: options.timeout });
    if (result.status === null && result.signal && deps.clock.perfNowMs() - started >= options.timeout) {
      return { ...result, error: { code: "ETIMEDOUT" } };
    }
    return result;
  };
}

function readReceipt(command: string, args: readonly string[], context: Context): { reason?: string; value?: unknown } {
  const remaining = TOTAL_TIMEOUT_MS - (context.now() - context.started);
  if (remaining < 1) return { reason: "probe-time-budget" };
  let receipt: Receipt | null;
  try {
    receipt = context.run(command, [...args], { cwd: context.root, env: context.env, shell: false,
      encoding: "utf8", timeout: Math.min(CALL_TIMEOUT_MS, Math.floor(remaining)),
      maxBuffer: MAX_OUTPUT_BYTES, killSignal: "SIGKILL", windowsHide: true });
  } catch { return { reason: "probe-failed" }; }
  if (!receipt || typeof receipt.stdout !== "string" || typeof receipt.stderr !== "string") return { reason: "probe-invalid-output" };
  if (byteLength(receipt.stdout) > MAX_OUTPUT_BYTES || byteLength(receipt.stderr) > MAX_OUTPUT_BYTES) return { reason: "probe-output-limit" };
  if (receipt.error) return { reason: receipt.error.code === "ETIMEDOUT" ? "probe-timeout"
    : receipt.error.code === "ENOBUFS" ? "probe-output-limit" : "probe-failed" };
  if (receipt.status !== 0 || receipt.signal || context.now() - context.started >= TOTAL_TIMEOUT_MS) return { reason: "probe-failed" };
  try { return { value: JSON.parse(receipt.stdout) as unknown }; }
  catch { return { reason: "probe-invalid-output" }; }
}

function verifyGuide(value: unknown, name: string, markers: string[]): boolean {
  const guide = value as { name?: unknown; markdown?: unknown } | null | undefined;
  return guide?.name === name && typeof guide.markdown === "string"
    && markers.every((marker) => (guide.markdown as string).includes(marker));
}

interface Inspection { reason: string; session?: string; capabilities?: string; version?: string }

function inspectRuntime(command: string, context: Context): Inspection {
  const cli = readReceipt(command, CALLS.cliGuide, context);
  if (cli.reason) return { reason: cli.reason };
  if (!verifyGuide(cli.value, "orca-cli", ["worktree current", "terminal"])) return { reason: "cli-guide-unsupported" };
  const guide = readReceipt(command, CALLS.orchestrationGuide, context);
  if (guide.reason) return { reason: guide.reason };
  if (!verifyGuide(guide.value, "orchestration", ["worker-start", "worker_done", "orchestration check"])) return { reason: "orchestration-guide-unsupported" };
  const status = readReceipt(command, CALLS.status, context);
  if (status.reason) return { reason: status.reason };
  const body = status.value as { ok?: unknown; result?: unknown } | null | undefined;
  const result = (body?.ok === true ? body.result : null) as {
    target?: { kind?: unknown }; runtime?: { reachable?: unknown; state?: unknown; appVersion?: unknown };
    caller?: { live?: unknown; orcaSessionId?: unknown };
  } | null | undefined;
  if (!result || result.target?.kind !== "local") return { reason: "runtime-unverified" };
  if (result.runtime?.reachable !== true || result.runtime.state !== "ready") return { reason: "runtime-unreachable" };
  if (result.runtime.appVersion !== SUPPORTED_VERSION) return { reason: "runtime-version-unsupported" };
  if (result.caller?.live !== true || typeof result.caller.orcaSessionId !== "string"
    || !context.env.ORCA_AGENT_SESSION_ID || result.caller.orcaSessionId !== context.env.ORCA_AGENT_SESSION_ID) return { reason: "caller-unverified" };
  // The pinned status contract does not advertise an enabled orchestration field or validate
  // all worker capabilities. A matching live caller is evidence, never launch authority.
  return { reason: "orchestration-unverified", session: "verified", capabilities: "documented",
    version: SUPPORTED_VERSION };
}

export function report(root: string, vendor: string, options: ReportOptions = {}, deps: RuntimeDeps = defaultDeps()): Json {
  const policy = policyReport(root, vendor, deps) as Json & { eligible: boolean; workers: string[] };
  const result: Json = { ...policy, role: options.workerContext ? "worker" : "coordinator", candidate: false,
    runtime: "not-checked", session: "unverified", orchestration: "unverified", capabilities: "unverified",
    authentication: "unverified", vendors: {} };
  // This guard precedes even reading PATH or selecting an Orca executable.
  if (options.workerContext) return { ...result, eligible: false, reason: "worker-context" };
  if (!policy.eligible) return result;
  const env = options.env || deps.proc.env;
  const platform = options.platform || deps.proc.platform;
  const present = options.present || ((command: string, scopedEnv: Env, scopedPlatform: string) => executablePresent(command, scopedEnv, scopedPlatform, deps));
  const command = selectExecutable(env, platform, deps);
  if (!command) return { ...result, reason: "executable-selection-unsupported" };
  if (!present(command, env, platform)) return { ...result, reason: "orca-unavailable" };
  result.vendors = Object.fromEntries(policy.workers.map((worker) => [worker, present(worker, env, platform) ? "present" : "unavailable"]));
  if (!Object.values(result.vendors as Record<string, string>).includes("present")) return { ...result, reason: "no-available-workers" };
  result.candidate = true;
  if (!options.probe) return { ...result, reason: "runtime-not-probed" };
  const now = options.now || (() => deps.clock.perfNowMs());
  const context: Context = { root: deps.fs.realpathSync(root), env: { ...env, PATH: absolutePathEntries(env, deps).join(deps.path.delimiter) },
    run: options.run || defaultRun(deps), now, started: now() };
  const runtime = inspectRuntime(command, context);
  return { ...result, reason: runtime.reason, runtime: runtime.session ? "reachable" : "unverified",
    session: runtime.session || "unverified", capabilities: runtime.capabilities || "unverified",
    ...(runtime.version ? { runtimeVersion: runtime.version } : {}) };
}

function cli(argv: string[], deps: RuntimeDeps): string {
  if (argv[0] !== "report") throw new Error("invalid-invocation");
  const options: ReportOptions & { root: string; json: boolean } = { root: deps.proc.cwd(), json: false };
  const seen = new Set<string>();
  for (let index = 1; index < argv.length; index++) {
    const flag = argv[index];
    if (!["--root", "--vendor", "--json", "--probe", "--worker-context"].includes(flag) || seen.has(flag)) throw new Error("invalid-invocation");
    seen.add(flag);
    if (["--json", "--probe", "--worker-context"].includes(flag)) options[flag === "--worker-context" ? "workerContext" : flag.slice(2)] = true;
    else {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error("invalid-invocation");
      options[flag.slice(2)] = value;
    }
  }
  const result = report(options.root, options.vendor as string, options, deps);
  return options.json ? JSON.stringify(result, null, 2) : `Orca preflight: ${result.reason}; normal workflow; dispatch disabled.`;
}

export function main(argv: string[], deps: RuntimeDeps = defaultDeps()): number {
  try { deps.io.stdout.write(`${cli(argv, deps)}\n`); return 0; }
  catch { deps.io.stderr.write("orca-preflight: invalid invocation or internal failure\n"); return 1; }
}

runDirect(import.meta.url, main);
