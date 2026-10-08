import { report as policyReport } from "./orca-policy.mts";
import { MAX_OUTPUT_BYTES, SUPPORTED_VERSION, report as preflightReport, selectExecutable } from "./orca-preflight.mts";
import type { Receipt, ReportOptions, Run, RunOptions } from "./orca-preflight.mts";
import { createNodeDeps } from "./runtime/node.mts";
import { orcaMultiAgentEnabled } from "./runtime/select.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

/**
 * Launch gate for Orca vendor dispatch.
 *
 * WHAT MAKES A LAUNCH ALLOWED (the single place this is defined, see `evaluateLaunch`). A launch is allowed
 * only when, evaluated fresh immediately before that call and never cached:
 *   0. AI_WORKFLOW_ORCA_MULTI_AGENT is `true` (process env or project-root .env); otherwise the normal workflow;
 *   1. the caller is not itself a worker (no `--worker-context` flag, no WORKER_ENV_MARKERS in env);
 *   2. the policy file is re-read and the requested coordinator vendor is eligible (policy-eligible);
 *   3. a fresh runtime probe passes: Orca executable present, both guides verified, local runtime reachable
 *      and ready, and its appVersion equals SUPPORTED_VERSION.
 * Foundation preflight/policy keep `dispatchReady: false`; this gate, not those reports, is the launch authority.
 *
 * DEVIATION (runtime-contract.md): an external coordinator outside an Orca terminal gets no `caller` block
 * from `orca status`, so preflight stops at reason "caller-unverified" AFTER it has already proven the guides,
 * reachability and the exact version. The gate therefore does not require `caller.orcaSessionId`. The coupling
 * to preflight's check order is deliberate and covered by the version-drift tests.
 */

type Env = Record<string, string | undefined>;
type Json = Record<string, unknown>;

export const WORKER_FLAG = "--worker-context";
/**
 * Env variables that mark a worker process. UNVERIFIED: S0 did not observe the real marker, so these are
 * conservative guesses and must be replaced by the observed name. The flag in the brief stays primary.
 */
export const WORKER_ENV_MARKERS: readonly string[] = Object.freeze(["ORCA_WORKER_CONTEXT", "ORCA_DISPATCH_ID"]);
/** Env keys a worker child may receive. Everything else (tokens, keys, worker markers) is dropped. */
export const WORKER_ENV_ALLOWLIST: readonly string[] = Object.freeze([
  "PATH", "HOME", "LANG", "TERM", "TMPDIR", "ORCA_TERMINAL_HANDLE", "ORCA_AGENT_SESSION_ID",
]);
/** Probe reasons that still prove the supported version (see DEVIATION above). */
const VERSION_PROVEN_REASONS: readonly string[] = Object.freeze(["orchestration-unverified", "caller-unverified"]);
const CONTROL = new RegExp("[\\u0000-\\u001f\\u007f-\\u009f\\u00ad\\u061c\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u2064\\u2066-\\u2069\\ufeff]");
/** Brief bounds: a huge field would fail the spawn with E2BIG and burn an attempt. */
export const MAX_FIELD_CHARS = 4096;
export const MAX_BRIEF_CHARS = 16384;

let nodeDeps: RuntimeDeps | undefined;
const defaultDeps = (): RuntimeDeps => (nodeDeps ??= createNodeDeps());

export function isWorkerContext(argv: readonly string[] = [], env: Env = {}): boolean {
  if (argv.includes(WORKER_FLAG)) return true;
  return WORKER_ENV_MARKERS.some((marker) => typeof env[marker] === "string" && env[marker] !== "");
}

/** Allowlisted env for a worker child; PATH keeps absolute entries only (preflight rule). */
export function buildWorkerEnv(env: Env, deps: RuntimeDeps = defaultDeps()): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(env)) {
    const value = env[key];
    if (!WORKER_ENV_ALLOWLIST.includes(key) || typeof value !== "string" || value.includes("\0")) continue;
    out[key] = value;
  }
  if (out.PATH !== undefined) {
    const entries = out.PATH.split(deps.path.delimiter).filter((directory) => deps.path.isAbsolute(directory)).slice(0, 64);
    if (entries.length) out.PATH = entries.join(deps.path.delimiter);
    else delete out.PATH;
  }
  return out;
}

export interface BriefSpec {
  target: string;
  change: string;
  constraints: string | readonly string[];
  ownership: string | readonly string[];
  acceptance: string;
}
export type BriefResult = { ok: true; brief: string } | { ok: false; reason: string };

/** Orca task-spec brief. Always starts with the recursion flag; control characters in any field are refused. */
export function workerBrief(spec: BriefSpec): BriefResult {
  const fields: Array<[string, string]> = [];
  for (const [label, key] of [["Target", "target"], ["Change", "change"], ["Constraints", "constraints"],
    ["Ownership", "ownership"], ["Observable acceptance", "acceptance"]] as const) {
    const raw = spec?.[key];
    const items = typeof raw === "string" ? [raw] : Array.isArray(raw) ? raw : [];
    if (!items.length || items.some((item) => typeof item !== "string" || !item.trim())) return { ok: false, reason: `brief-field-invalid:${key}` };
    if (items.some((item) => CONTROL.test(item))) return { ok: false, reason: `brief-control-character:${key}` };
    if (items.some((item) => item.length > MAX_FIELD_CHARS)) return { ok: false, reason: `brief-field-too-long:${key}` };
    fields.push([label, items.join("; ")]);
  }
  // The first line is plain text so a CLI parser never reads the spec value as a flag.
  const brief = ["Supervised worker task.", WORKER_FLAG, ...fields.map(([label, value]) => `${label}: ${value}`)].join("\n");
  return brief.length > MAX_BRIEF_CHARS ? { ok: false, reason: "brief-too-long" } : { ok: true, brief };
}

export interface LaunchOptions {
  root: string;
  vendor: string;
  /** Caller argv; the worker flag here denies. */
  argv?: readonly string[];
  /** True when the caller already knows it is a worker. */
  workerContext?: boolean;
  env?: Env;
  deps?: RuntimeDeps;
  /** Synchronous probe runner for the preflight calls. */
  run?: Run;
  now?: () => number;
  platform?: string;
  present?: ReportOptions["present"];
}
export interface LaunchDecision { allowed: boolean; reason: string; vendor: string; policyReason?: string; runtimeVersion?: string; executable?: string }

/** Fresh policy read plus fresh probe on every call. Fails closed on any thrown error. */
export function evaluateLaunch(options: LaunchOptions): LaunchDecision {
  const { root, vendor } = options;
  const deps = options.deps ?? defaultDeps();
  const deny = (reason: string, extra: Partial<LaunchDecision> = {}): LaunchDecision => ({ allowed: false, reason, vendor, ...extra });
  try {
    // The switch comes first: with it off nothing is read, probed or spawned and the normal workflow runs.
    const env = options.env ?? deps.proc.env;
    if (!orcaMultiAgentEnabled(root, deps, env)) return deny("orca-multi-agent-disabled");
    if (options.workerContext === true) return deny("worker-context");
    if (isWorkerContext(options.argv, env) || isWorkerContext([], deps.proc.env)) return deny("worker-context");
    const policy = policyReport(root, vendor, deps) as Json & { eligible?: boolean; reason?: string };
    if (policy.eligible !== true) return deny(String(policy.reason ?? "policy-ineligible"), { policyReason: String(policy.reason) });
    const probe = preflightReport(root, vendor, { probe: true, env, run: options.run, now: options.now,
      platform: options.platform, present: options.present }, deps) as Json & { eligible?: boolean; reason?: string; runtimeVersion?: string };
    if (probe.eligible !== true) return deny(String(probe.reason), { policyReason: String(policy.reason) });
    if (!VERSION_PROVEN_REASONS.includes(String(probe.reason))) return deny(String(probe.reason), { policyReason: String(policy.reason) });
    if (probe.runtimeVersion !== undefined && probe.runtimeVersion !== SUPPORTED_VERSION) return deny("runtime-version-unsupported");
    // The probe proved this executable and no other; launchWorker spawns exactly it.
    const executable = selectExecutable(env, options.platform ?? deps.proc.platform, deps);
    if (!executable) return deny("launcher-unavailable");
    return { allowed: true, reason: "launch-allowed", vendor, policyReason: String(policy.reason), runtimeVersion: SUPPORTED_VERSION, executable };
  } catch { return deny("gate-error"); }
}

export interface LaunchRequest extends LaunchOptions {
  /** Optional. Must equal the executable the probe selected (ORCA_CLI_COMMAND, orca-dev or orca); any other value is refused. */
  command?: string;
  args: readonly string[];
  /** Absolute deadline on the `now` clock (ms, fractions allowed). */
  deadlineMs: number;
}
export interface LaunchResult {
  launched: boolean; reason: string; status?: number | null; signal?: string | null; stdout?: string; stderr?: string; decision?: LaunchDecision;
}

const launcherAcceptable = (command: string, deps: RuntimeDeps): boolean =>
  typeof command === "string" && command.length > 0 && command.length <= 4096 && !CONTROL.test(command)
  && (deps.path.isAbsolute(command) || /^(?!\.+$)[a-zA-Z0-9._-]+$/.test(command));

/**
 * Gate then spawn. A remaining budget under 1 ms is refused before any spawn (a rounded-down 0 would disable
 * the timeout). Timeout and output overflow are recognised only by the child result's `errorCode`.
 */
export async function launchWorker(request: LaunchRequest): Promise<LaunchResult> {
  const deps = request.deps ?? defaultDeps();
  const decision = evaluateLaunch(request);
  if (!decision.allowed) return { launched: false, reason: decision.reason, decision };
  try {
    const command = decision.executable as string;
    if (request.command !== undefined && request.command !== command) return { launched: false, reason: "launcher-refused", decision };
    if (!launcherAcceptable(command, deps) || request.args.some((arg) => typeof arg !== "string" || arg.includes("\0"))) {
      return { launched: false, reason: "launcher-refused", decision };
    }
    const now = request.now ?? (() => deps.clock.perfNowMs());
    const remaining = request.deadlineMs - now();
    if (!(remaining >= 1)) return { launched: false, reason: "time-budget", decision };
    const result = await deps.child.run(command, [...request.args], { cwd: request.root,
      env: buildWorkerEnv(request.env ?? deps.proc.env, deps), timeoutMs: Math.floor(remaining),
      maxBufferBytes: MAX_OUTPUT_BYTES, killSignal: "SIGKILL" });
    if (result.errorCode === "ETIMEDOUT") return { launched: false, reason: "launch-timeout", decision };
    if (result.errorCode === "ENOBUFS") return { launched: false, reason: "launch-output-limit", decision };
    if (result.status !== 0 || result.signal) return { launched: false, reason: "launch-failed", status: result.status, signal: result.signal, stdout: result.stdout, stderr: result.stderr, decision };
    return { launched: true, reason: "launched", status: 0, stdout: result.stdout, stderr: result.stderr, decision };
  } catch { return { launched: false, reason: "launch-failed", decision }; }
}

export type { Receipt, RunOptions };
