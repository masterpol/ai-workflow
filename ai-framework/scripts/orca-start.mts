import { buildWorkerEnv, evaluateLaunch } from "./orca-launch-gate.mts";
import { report as policyReport } from "./orca-policy.mts";
import { MAX_OUTPUT_BYTES, SUPPORTED_VERSION, selectExecutable } from "./orca-preflight.mts";
import type { Receipt, Run, RunOptions } from "./orca-preflight.mts";
import { createNodeDeps } from "./runtime/node.mts";
import { orcaMultiAgentEnabled } from "./runtime/select.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

export type StartState = "off" | "worker" | "bypassed" | "ready" | "blocked";
export interface StartDecision { state: StartState; reason: string; line: string; workers?: string[] }
export interface StartOptions {
  root: string;
  phase: string;
  vendor: string;
  /** Original invocation, never shell-parsed or reconstructed from argv. */
  argsText?: string;
  workerContext?: boolean;
  terminalHandle?: string;
  /** Total budget in milliseconds, not an absolute timestamp. */
  deadlineMs?: number;
  deps?: RuntimeDeps;
  run?: Run;
}
type Env = Record<string, string | undefined>;
type Obj = Record<string, unknown>;
const object = (value: unknown): value is Obj => value !== null && typeof value === "object" && !Array.isArray(value);
const blocked = (reason: string): StartDecision => ({ state: "blocked", reason,
  line: `Orca requested but not ready: ${reason}. Fix it, or re-invoke with orca=normal to run this phase without Orca.` });

/** Quoted passages are data, even when they contain an otherwise standalone token. */
export function hasNormalBypass(text: string = ""): boolean {
  let quote = "";
  let token = "";
  let quoted = false;
  let escaped = false;
  const matches = (): boolean => !quoted && token === "orca=normal";
  for (const character of text) {
    if (escaped) { token += character; escaped = false; continue; }
    if (character === "\\") { token += character; quoted = true; escaped = true; continue; }
    if (quote) {
      token += character;
      if (character === quote) quote = "";
    } else if (character === '"' || character === "'" || character === "`") {
      quote = character; quoted = true; token += character;
    } else if (/\s/u.test(character)) {
      if (matches()) return true;
      token = ""; quoted = false;
    } else token += character;
  }
  return matches();
}

class Budget {
  readonly end: number;
  failure: "timeout" | "internal" | undefined;
  readonly now: () => number;
  constructor(now: () => number, milliseconds: number) { this.now = now; this.end = now() + milliseconds; }
  remaining(): number {
    const remaining = Math.floor(this.end - this.now());
    if (!(remaining >= 1) || !Number.isFinite(remaining)) { this.failure = "timeout"; throw new Error("timeout"); }
    return remaining;
  }
}

function resolveExecutable(command: string, env: Env, deps: RuntimeDeps): string | undefined {
  const extensions = deps.proc.platform === "win32" ? ["", ".exe"] : [""];
  const directories = deps.path.isAbsolute(command) ? [""]
    : (env.PATH ?? "").split(deps.path.delimiter).filter((directory) => deps.path.isAbsolute(directory)).slice(0, 64);
  for (const directory of directories) for (const extension of extensions) {
    const file = directory ? deps.path.join(directory, command + extension) : command + extension;
    try {
      if (!deps.fs.statSync(file).isFile()) continue;
      deps.fs.accessSync(file, deps.proc.platform === "win32" ? deps.fs.constants.F_OK : deps.fs.constants.X_OK);
      return deps.fs.realpathSync(file);
    } catch { /* Missing and inaccessible PATH entries do not resolve. */ }
  }
  return undefined;
}

function valueFrom(receipt: Receipt | null): unknown {
  if (!receipt || receipt.status !== 0 || receipt.signal || receipt.error || typeof receipt.stdout !== "string"
    || typeof receipt.stderr !== "string") return undefined;
  if (new TextEncoder().encode(receipt.stdout).length > MAX_OUTPUT_BYTES
    || new TextEncoder().encode(receipt.stderr).length > MAX_OUTPUT_BYTES) return undefined;
  try { return JSON.parse(receipt.stdout) as unknown; } catch { return undefined; }
}

/** Only the observed worker-list transport identifies implicit workers; guessed env markers do not. */
function lookupWorker(command: string, terminal: string, root: string, env: Env, run: Run, budget: Budget): boolean | undefined {
  let cursor: string | undefined;
  const cursors = new Set<string>();
  for (let page = 0; page < 32; page++) {
    const args = ["orchestration", "worker-list", "--limit", "100", "--json", ...(cursor ? ["--cursor", cursor] : [])];
    const value = valueFrom(run(command, args, probeOptions(root, env, budget)));
    if (!object(value) || value.ok !== true || !object(value.result) || !Array.isArray(value.result.workers)) return undefined;
    for (const worker of value.result.workers) {
      if (!object(worker) || typeof worker.agentTerminalHandle !== "string" || typeof worker.dispatchStatus !== "string") return undefined;
      if (worker.agentTerminalHandle !== terminal) continue;
      if (["pending", "dispatching", "dispatched", "running"].includes(worker.dispatchStatus)) return true;
      if (!["completed", "failed", "cancelled", "canceled", "interrupted", "rejected"].includes(worker.dispatchStatus)) return undefined;
    }
    const pagination = value.result.page;
    if (!object(pagination) || typeof pagination.hasMore !== "boolean") return undefined;
    if (!pagination.hasMore) return false;
    if (typeof pagination.nextCursor !== "string" || !pagination.nextCursor || pagination.nextCursor.length > 4096
      || cursors.has(pagination.nextCursor)) return undefined;
    cursor = pagination.nextCursor; cursors.add(cursor);
  }
  return undefined;
}

function probeOptions(root: string, env: Env, budget: Budget): RunOptions {
  return { cwd: root, env, shell: false, encoding: "utf8", timeout: budget.remaining(),
    maxBuffer: MAX_OUTPUT_BYTES, killSignal: "SIGKILL", windowsHide: true };
}

/** Fresh decision on each call. Switch, bypass, worker identity and gate always run in this order. */
export function decideStart(options: StartOptions): StartDecision {
  let budget: Budget | undefined;
  try {
    const deps = options.deps ?? createNodeDeps();
    const env = deps.proc.env;
    if (!orcaMultiAgentEnabled(options.root, deps, env)) return { state: "off", reason: "orca-multi-agent-disabled", line: "" };
    if (hasNormalBypass(options.argsText)) return { state: "bypassed", reason: "orca-normal", line: "Orca: bypassed by request (orca=normal)" };
    if (options.workerContext === true) return { state: "worker", reason: "worker-context", line: "" };
    budget = new Budget(() => deps.clock.perfNowMs(), options.deadlineMs ?? 4000);
    const deadline = budget;
    deadline.remaining();
    // Preflight has its own per-call budget. This wrapper caps every call by the same outer deadline.
    const run: Run = (command, args, probe) => {
      try {
        const timeout = Math.min(probe.timeout, deadline.remaining());
        const result: (Receipt & { errorCode?: string }) | null = options.run ? options.run(command, args, { ...probe, timeout })
          : deps.child.runSync(command, args, { cwd: probe.cwd, env: probe.env, shell: false,
            timeoutMs: timeout, maxBufferBytes: probe.maxBuffer, killSignal: probe.killSignal });
        if (result?.errorCode === "ETIMEDOUT" || result?.error?.code === "ETIMEDOUT") { deadline.failure = "timeout"; throw new Error("timeout"); }
        deadline.remaining();
        if (typeof result?.errorCode === "string")
          return { ...result, error: { code: result.errorCode } };
        return result;
      } catch (error) { deadline.failure ??= "internal"; throw error; }
    };
    const terminal = options.terminalHandle ?? env.ORCA_TERMINAL_HANDLE;
    if (terminal) {
      const command = selectExecutable(env, deps.proc.platform, deps);
      const resolved = command && resolveExecutable(command, env, deps);
      if (!resolved) return blocked("worker-identity-unavailable");
      const worker = lookupWorker(resolved, terminal, options.root, buildWorkerEnv(env, deps), run, deadline);
      if (worker === undefined) return blocked(deadline.failure ?? "worker-identity-unavailable");
      if (worker) return { state: "worker", reason: "worker-context", line: "" };
    }
    const policy = policyReport(options.root, options.vendor, deps);
    deadline.remaining();
    if (policy.eligible !== true) return blocked(String(policy.reason));
    const roles = policy.roles;
    if (!object(roles)) return blocked("policy-malformed");
    const workers = [...new Set(Object.values(roles).filter((worker): worker is string => typeof worker === "string"))];
    if (!workers.length) return blocked("no-workers");
    const decision = evaluateLaunch({ root: options.root, vendor: options.vendor, deps, env, run, now: deadline.now });
    deadline.remaining();
    if (deadline.failure) return blocked(deadline.failure);
    if (!decision.allowed) return blocked(decision.reason === "gate-error" ? "internal" : decision.reason);
    const workerEnv = buildWorkerEnv(env, deps);
    for (const worker of workers) {
      deadline.remaining();
      if (!Array.isArray(policy.workers) || !policy.workers.includes(worker)) return blocked(`${worker}:worker-policy-ineligible`);
      if (!resolveExecutable(worker, workerEnv, deps)) return blocked(`${worker}:worker-unavailable`);
    }
    const probed = decision.executable && resolveExecutable(decision.executable, env, deps);
    const resolved = resolveExecutable("orca", workerEnv, deps);
    if (!probed || !resolved || resolved !== probed) return blocked("worker-orca-path-mismatch");
    const status = valueFrom(run(resolved, ["status", "--json"], probeOptions(options.root, workerEnv, deadline)));
    if (!object(status) || status.ok !== true || !object(status.result) || !object(status.result.runtime)
      || !object(status.result.target) || status.result.target.kind !== "local"
      || status.result.runtime.reachable !== true || status.result.runtime.state !== "ready"
      || status.result.runtime.appVersion !== SUPPORTED_VERSION) return blocked("worker-orca-unavailable");
    deadline.remaining();
    return { state: "ready", reason: "launch-allowed", line: `Orca: ready (coordinator ${options.vendor}, workers ${workers.join(", ")})`, workers };
  } catch { return blocked(budget?.failure ?? "internal"); }
}
