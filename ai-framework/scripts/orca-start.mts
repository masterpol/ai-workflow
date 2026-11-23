import { buildWorkerEnv, evaluateLaunch } from "./orca-launch-gate.mts";
import { report as policyReport } from "./orca-policy.mts";
import { MAX_OUTPUT_BYTES, engineRange, isSupportedVersion, selectExecutable } from "./orca-preflight.mts";
import type { Receipt, Run, RunOptions } from "./orca-preflight.mts";
import { createNodeDeps } from "./runtime/node.mts";
import { parseVersion } from "./runtime/semver-range.mts";
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
const blocked = (reason: string, detail = ""): StartDecision => ({ state: "blocked", reason,
  line: `Orca requested but not ready: ${reason}${detail}. Fix it, or re-invoke with orca=normal to run this phase without Orca.` });
/** Names the configured range and the strict x.y.z Orca reported, e.g. ` (Orca 1.6.0 is outside engine ">=1.4.224 <1.6.0")`. */
export const versionDetail = (engine: string, found?: string): string => {
  // Both values are untrusted text: print only printable ASCII, and only a strict x.y.z as the found version.
  const shown = /^[\x20-\x7e]{1,256}$/.test(engine) ? JSON.stringify(engine) : "(not printable)";
  return found && parseVersion(found) ? ` (Orca ${found} is outside engine ${shown})` : ` (engine ${shown})`;
};

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

const ACTIVE_DISPATCH = ["pending", "dispatching", "dispatched", "running"];
const SETTLED = ["completed", "failed", "cancelled", "canceled", "interrupted", "rejected", "succeeded", "released"];
const ACTIVE_WORKER = ["running", "dispatched", "dispatching", "pending", "active", "working"];
const PAGE_ROWS = 100;
const textOf = (value: unknown): string | undefined => (typeof value === "string" && value ? value : undefined);

/**
 * One worker row, read from either known Orca shape: the full record (`agentTerminalHandle`, `dispatchStatus`) or the concise
 * view (`terminal`, `state`, `liveness`, `terminalState`). `undefined` means "cannot be this terminal", so a row of another
 * shape, another terminal or no terminal at all is ignored; only a row for this terminal must be understood.
 */
function ownRow(raw: unknown, terminal: string): "open" | "closed" | "unknown" | undefined {
  if (!object(raw)) return undefined;
  const resource = object(raw.resource) ? raw.resource : {};
  const handle = textOf(raw.agentTerminalHandle) ?? textOf(raw.terminal) ?? textOf(resource.terminalHandle);
  if (handle !== terminal) return undefined;
  const projection = object(raw.projection) ? raw.projection : {};
  const stage = object(projection.stage) ? projection.stage : {};
  const dispatch = textOf(raw.dispatchStatus) ?? textOf(stage.dispatch);
  const state = textOf(raw.state) ?? textOf(raw.workerState);
  const liveness = textOf(raw.liveness) ?? (object(projection.liveness) ? textOf(projection.liveness.verdict) : undefined);
  const released = textOf(raw.terminalState) === "released" || textOf(resource.releaseState) === "released";
  if (dispatch && SETTLED.includes(dispatch)) return "closed";
  if (state && SETTLED.includes(state)) return "closed";
  if (liveness === "exited" || released) return "closed";
  if (dispatch && ACTIVE_DISPATCH.includes(dispatch)) return "open";
  if (!dispatch && state && ACTIVE_WORKER.includes(state)) return "open";
  return "unknown";
}

const PAGE_LIMITS = [PAGE_ROWS, 50, 25, 10];
const FALLBACK_ROWS = 25;
/** Every terminal state but `released`: an open dispatch cannot sit in a released terminal, so these cover every possible worker. */
const OPEN_STATES = ["active", "retained", "reclaimable", "release_pending", "release_unknown"];
const PAGE_CAP = 32;
type Lookup = boolean | undefined | "too-large";

/** A receipt the shared output bound cut off or refused to hold: ask for a smaller page instead of calling it a failure. */
function oversize(receipt: Receipt | null): boolean {
  if (!receipt) return false;
  if (receipt.error?.code === "ENOBUFS") return true;
  return [receipt.stdout, receipt.stderr].some((text) => typeof text === "string" && new TextEncoder().encode(text).length > MAX_OUTPUT_BYTES);
}

/**
 * Walks worker-list pages looking for an open dispatch on `terminal`. `state` asks only for terminals in that state, so the size
 * follows live work instead of fleet history; with no state (older Orca without the flag) it reads the full record in small pages,
 * because only that view carries the `page` object. `ladder` carries the page size across calls. Returns "rejected" when the
 * first filtered page is not understood.
 */
function listPages(command: string, terminal: string, root: string, env: Env, run: Run, budget: Budget, state: string | undefined, ladder: { step: number }): Lookup | "rejected" {
  let cursor: string | undefined;
  const cursors = new Set<string>();
  if (state === undefined) ladder.step = Math.max(ladder.step, PAGE_LIMITS.indexOf(FALLBACK_ROWS));
  let step = ladder.step;
  for (let page = 0; page < PAGE_CAP; page++) {
    let value: unknown;
    let limit = PAGE_LIMITS[step];
    for (;;) {
      limit = PAGE_LIMITS[step];
      const receipt = run(command, ["orchestration", "worker-list", "--limit", String(limit), "--json",
        ...(state !== undefined ? ["--terminal-state", state] : ["--full"]), ...(cursor ? ["--cursor", cursor] : [])], probeOptions(root, env, budget));
      if (oversize(receipt)) { if (step < PAGE_LIMITS.length - 1) { ladder.step = ++step; continue; } return "too-large"; }
      value = valueFrom(receipt);
      break;
    }
    if (!object(value) || value.ok !== true || !object(value.result) || !Array.isArray(value.result.workers)) return page === 0 && state !== undefined ? "rejected" : undefined;
    for (const worker of value.result.workers) {
      const row = ownRow(worker, terminal);
      if (row === "open") return true;
      if (row === "unknown") return undefined;
    }
    const result = value.result;
    const pagination = result.page;
    if (pagination !== undefined && pagination !== null && !object(pagination)) return undefined;
    const source = object(pagination) ? pagination : {};
    if (source.hasMore !== undefined && typeof source.hasMore !== "boolean") return undefined;
    const advertised = textOf(source.nextCursor) ?? textOf(result.nextCursor);
    // No `page` object at all is a complete listing unless the page is full (then more may exist and a cursor is required).
    const hasMore = typeof source.hasMore === "boolean" ? source.hasMore : (advertised !== undefined || result.workers.length >= limit);
    if (!hasMore) return false;
    // A cursor is an opaque token; one that could be read as an option, or that repeats, ends the walk.
    if (typeof advertised !== "string" || advertised.length > 4096 || advertised.startsWith("-") || cursors.has(advertised)) return undefined;
    cursor = advertised; cursors.add(cursor);
  }
  return "too-large";
}

/** Only the observed worker-list transport identifies implicit workers; guessed env markers do not. */
function lookupWorker(command: string, terminal: string, root: string, env: Env, run: Run, budget: Budget): Lookup {
  const ladder = { step: 0 };
  for (const state of OPEN_STATES) {
    const found = listPages(command, terminal, root, env, run, budget, state, ladder);
    // An Orca that does not know the filter (or one of its states) is read in full instead, which covers every state at once.
    if (found === "rejected") return listPages(command, terminal, root, env, run, budget, undefined, ladder) as Lookup;
    if (found !== false) return found;
  }
  return false;
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
      if (worker === "too-large") return blocked("worker-list-too-large");
      if (worker === undefined) return blocked(deadline.failure ?? "worker-identity-unavailable");
      if (worker) return { state: "worker", reason: "worker-context", line: "" };
    }
    const policy = policyReport(options.root, options.vendor, deps);
    deadline.remaining();
    if (policy.eligible !== true) return blocked(String(policy.reason));
    const pools = policy.pools;
    if (!object(pools)) return blocked("policy-malformed");
    // Every member of every role pool is probed, in pool order; a pool the policy reports as non-array is malformed.
    const members: string[] = [];
    for (const pool of Object.values(pools)) {
      if (!Array.isArray(pool) || !pool.every((worker) => typeof worker === "string")) return blocked("policy-malformed");
      members.push(...pool);
    }
    const workers = [...new Set(members)];
    if (!workers.length) return blocked("no-workers");
    const decision = evaluateLaunch({ root: options.root, vendor: options.vendor, deps, env, run, now: deadline.now });
    deadline.remaining();
    if (deadline.failure) return blocked(deadline.failure);
    if (!decision.allowed) return blocked(decision.reason === "gate-error" ? "internal" : decision.reason,
      decision.engine ? versionDetail(decision.engine, decision.foundVersion) : "");
    const workerEnv = buildWorkerEnv(env, deps);
    for (const worker of workers) {
      deadline.remaining();
      if (!Array.isArray(policy.workers) || !policy.workers.includes(worker)) return blocked(`${worker}:worker-policy-ineligible`);
      if (!resolveExecutable(worker, workerEnv, deps)) return blocked(`${worker}:worker-unavailable`);
    }
    const probed = decision.executable && resolveExecutable(decision.executable, env, deps);
    const resolved = resolveExecutable("orca", workerEnv, deps);
    if (!probed || !resolved || resolved !== probed) return blocked("worker-orca-path-mismatch");
    const engine = engineRange(options.root, deps);
    if ("invalid" in engine) return blocked("engine-range-invalid", versionDetail(engine.text));
    const status = valueFrom(run(resolved, ["status", "--json"], probeOptions(options.root, workerEnv, deadline)));
    if (!object(status) || status.ok !== true || !object(status.result) || !object(status.result.runtime)
      || !object(status.result.target) || status.result.target.kind !== "local"
      || status.result.runtime.reachable !== true || status.result.runtime.state !== "ready"
      || !isSupportedVersion(status.result.runtime.appVersion, engine.range)) return blocked("worker-orca-unavailable");
    deadline.remaining();
    return { state: "ready", reason: "launch-allowed", line: `Orca: ready (coordinator ${options.vendor}, workers ${workers.join(", ")})`, workers };
  } catch { return blocked(budget?.failure ?? "internal"); }
}
