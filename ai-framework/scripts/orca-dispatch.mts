import { attemptKeyOf, createLedger, taskKeyOf } from "./orca-ledger.mts";
import type { Ledger, LedgerRecord } from "./orca-ledger.mts";
import { evaluateLaunch, launchWorker, workerBrief } from "./orca-launch-gate.mts";
import type { BriefSpec, LaunchOptions } from "./orca-launch-gate.mts";
import { report as policyReport } from "./orca-policy.mts";
import { createNodeDeps } from "./runtime/node.mts";
import { orcaMultiAgentEnabled } from "./runtime/select.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

/**
 * Supervised dispatch of one scope to one alternate vendor (dispatch-core).
 *
 * Rules this module enforces, each with a test:
 * - Unsupported or ineligible delegation returns route "normal" before any side effect (no ledger write, no spawn).
 *   The coordinator is the vendor running this task; the worker (`vendor`) must be one of its configured workers.
 * - A claim is written before the launch and is never overwritten: a replayed or crashed attempt is resumed by
 *   inspection (`unknown-liveness`), never launched a second time. One live attempt per task.
 * - Placement flags come from a typed allow-list, never free text. The launcher is whatever the probe selected.
 * - Only a launch that failed cleanly, with a readable receipt that shows no failed stage and an explicitly empty
 *   residualResources list, is retryable, within min(caller, policy, 5) retries and the deadline. A signal exit, a timeout or an
 *   unreadable or unproven receipt means a worker may exist: ownership is kept as unknown-liveness and a person inspects it.
 * - Completion comes only from a `worker_done` whose dispatch id equals the ledger's (the dispatch id is the attempt's
 *   identity; the Orca task id in the payload is only format-checked because the ledger does not store it). Launch
 *   receipts, events and unknown message types never complete an attempt. Mail is parsed against a grammar.
 */

export type Route = "normal" | "launched" | "resume" | "blocked";
export interface ScopeSpec extends BriefSpec { id: string }
export interface Placement { worktree?: string; repo?: string; name?: string; baseBranch?: string; setup?: string; model?: string; effort?: string }
export interface DispatchOptions extends Omit<LaunchOptions, "vendor"> {
  /** The vendor running this task; selects the policy entry. */
  coordinator: string;
  /** The alternate vendor that will do the work; must be one of the coordinator's configured workers. */
  vendor: string;
  scope: ScopeSpec;
  /** Distinguishes retries of the same scope. */
  attemptId: string;
  /** Optional Orca executable; must equal the executable the probe selected, else the launch is refused. */
  launcher?: string;
  deadlineMs: number;
  placement?: Placement;
}
export interface DispatchOutcome {
  route: Route; reason: string; attemptKey?: string; retryable?: boolean; humanAction?: string; dispatchId?: string;
}

const ID = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const VALUE = /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,199}$/;
const PLACEMENT_FLAGS: Readonly<Record<keyof Placement, string>> = Object.freeze({
  worktree: "--worktree", repo: "--repo", name: "--name", baseBranch: "--base-branch", setup: "--setup", model: "--model", effort: "--effort",
});
/** Longest base attempt id that still leaves room for the `-r<n>` retry suffix inside the 64-character id grammar. */
const MAX_BASE_ID = 60;
const MAX_RETRIES = 5;
const LIVE_STATES = ["claimed", "launched", "unknown-liveness", "completed"];
let nodeDeps: RuntimeDeps | undefined;
const defaultDeps = (): RuntimeDeps => (nodeDeps ??= createNodeDeps());

function parseJson(text: string | undefined): Record<string, unknown> | undefined {
  if (typeof text !== "string" || text.length > 262144) return undefined;
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  } catch { return undefined; }
}
const obj = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Orca prints its receipt either bare or wrapped in `{ result }`. */
function receiptOf(text: string | undefined): Record<string, unknown> | undefined {
  const parsed = parseJson(text);
  if (!parsed) return undefined;
  return typeof parsed.result === "object" && parsed.result !== null ? obj(parsed.result) : parsed;
}

function placementArgs(placement: Placement | undefined): string[] | undefined {
  const args: string[] = [];
  for (const [key, value] of Object.entries(obj(placement))) {
    const flag = Object.hasOwn(PLACEMENT_FLAGS, key) ? PLACEMENT_FLAGS[key as keyof Placement] : undefined;
    if (!flag || typeof value !== "string" || !VALUE.test(value)) return undefined;
    args.push(flag, value);
  }
  return args;
}

function dispatchIdOf(receipt: Record<string, unknown>): string | undefined {
  for (const candidate of [obj(receipt.dispatch).id, receipt.dispatchId, obj(receipt.worker).dispatchId]) {
    if (typeof candidate === "string" && ID.test(candidate)) return candidate;
  }
  return undefined;
}

export async function dispatchScope(options: DispatchOptions): Promise<DispatchOutcome> {
  const deps = options.deps ?? defaultDeps();
  const { scope, vendor, coordinator } = options;
  if (!ID.test(scope?.id ?? "") || !ID.test(options.attemptId ?? "")) return { route: "normal", reason: "invalid-id" };
  const attemptKey = attemptKeyOf(options.attemptId);
  if (!orcaMultiAgentEnabled(options.root, deps, options.env ?? deps.proc.env)) return { route: "normal", reason: "orca-multi-agent-disabled" };
  const flags = placementArgs(options.placement);
  if (!flags) return { route: "normal", reason: "invalid-placement" };
  const ledger = createLedger(options.root, deps);

  const existing = ledger.read(attemptKey);
  if (existing.status === "refused" || existing.status === "corrupt") return { route: "blocked", reason: `ledger-${existing.status}`, attemptKey };
  if (existing.status === "ok") {
    // A gate that previously approved a launch may now refuse (policy disabled, switch off, runtime drifted).
    // Re-check before handing ownership back; otherwise a resume under a forbidden policy exits the CLI as if
    // the worker had been launched, when in fact nothing is happening.
    if (!orcaMultiAgentEnabled(options.root, deps, options.env ?? deps.proc.env)) return { route: "normal", reason: "orca-multi-agent-disabled" };
    const resumeGate = evaluateLaunch({ ...options, vendor: coordinator });
    if (!resumeGate.allowed) return { route: "normal", reason: resumeGate.reason };
    return resumeExisting(ledger, existing.record, attemptKey);
  }

  // Everything up to the claim is side-effect free: unsupported delegation uses the normal workflow.
  const now = options.now ?? (() => deps.clock.perfNowMs());
  if (!(options.deadlineMs - now() >= 1)) return { route: "normal", reason: "time-budget" };
  const gateOptions = { ...options, vendor: coordinator };
  const decision = evaluateLaunch(gateOptions);
  if (!decision.allowed) return { route: "normal", reason: decision.reason };
  const policy = policyReport(options.root, coordinator, deps) as { workers?: unknown; maxConcurrentWorkers?: unknown };
  if (!Array.isArray(policy.workers) || !policy.workers.includes(vendor)) return { route: "normal", reason: "worker-not-configured" };
  const brief = workerBrief(scope);
  if (!brief.ok) return { route: "normal", reason: brief.reason };
  if (options.launcher !== undefined && options.launcher !== decision.executable) return { route: "normal", reason: "launcher-refused" };

  // One live attempt per task: another claimed, launched, unknown or completed attempt blocks a second worker.
  const taskKey = taskKeyOf(scope.id);
  const all = ledger.list();
  if (all.status === "refused") return { route: "blocked", reason: "ledger-refused", attemptKey };
  const cap = typeof policy.maxConcurrentWorkers === "number" ? policy.maxConcurrentWorkers : 0;
  let running = 0;
  for (const entry of all.entries) {
    if (entry.result.status !== "ok") return { route: "blocked", reason: `ledger-${entry.result.status}`, attemptKey };
    if (["claimed", "launched", "unknown-liveness"].includes(entry.result.record.state)) running++;
    if (entry.result.record.taskKey === taskKey && LIVE_STATES.includes(entry.result.record.state)) {
      return { route: "resume", reason: "task-already-owned", attemptKey: entry.attemptKey, humanAction: "inspect the existing attempt before dispatching this task again" };
    }
  }

  if (running >= cap) return { route: "normal", reason: "max-concurrent-workers" };

  const claim = ledger.claim({ attemptKey, taskKey, vendor, state: "claimed", createdAt: Math.trunc(deps.clock.now()) });
  if (claim.outcome === "replayed") return resumeExisting(ledger, claim.record, attemptKey);
  if (claim.outcome !== "claimed") return { route: "blocked", reason: `ledger-claim-${claim.outcome}`, attemptKey };

  const args = ["orchestration", "worker-start", "--spec", brief.brief, "--agent", vendor, ...flags, "--json"];
  const launch = await launchWorker({ ...gateOptions, deps, command: options.launcher, args, workerContext: false });
  const recorded = (patch: Parameters<Ledger["update"]>[1]): boolean => ledger.update(attemptKey, patch).status === "ok";

  if (launch.launched) {
    const dispatchId = dispatchIdOf(receiptOf(launch.stdout) ?? {});
    if (!dispatchId) {
      // The worker started but cannot be matched to its report: keep ownership and tell a person.
      recorded({ state: "unknown-liveness" });
      return { route: "resume", reason: "launched-without-dispatch-id", attemptKey, humanAction: "find the worker with worker-list and record its dispatch id" };
    }
    if (!recorded({ state: "launched", dispatchId })) return { route: "blocked", reason: "ledger-update-failed", attemptKey, dispatchId, humanAction: "a worker is running; repair the ledger record before anything else" };
    return { route: "launched", reason: "launched", attemptKey, dispatchId };
  }
  // A timeout, overflow or signal exit means a worker may exist: ownership is preserved and the attempt is inspected, never repeated.
  const killed = launch.reason === "launch-failed" && (Boolean(launch.signal) || launch.status === null || launch.status === undefined);
  if (launch.reason === "launch-timeout" || launch.reason === "launch-output-limit" || killed) {
    recorded({ state: "unknown-liveness" });
    return { route: "resume", reason: launch.reason, attemptKey, humanAction: "inspect the Run with worker-list before any retry" };
  }
  if (launch.reason !== "launch-failed") {
    // The gate refused after the claim (version drift, deadline, launcher): nothing was spawned.
    recorded({ state: "failed" });
    return { route: "normal", reason: launch.reason, attemptKey };
  }
  // Orca prints the failure receipt on stdout; read stderr too so a receipt on either stream is honoured.
  const receipts = [receiptOf(launch.stdout), receiptOf(launch.stderr)].filter((value): value is Record<string, unknown> => value !== undefined);
  const residual = receipts.some((receipt) => Array.isArray(receipt.residualResources) && receipt.residualResources.length > 0);
  const failedStage = receipts.map((receipt) => receipt.failedStage).find((stage): stage is string => typeof stage === "string");
  if (residual || failedStage) {
    // Orca itself reports the dispatch failed, so the task is free; the person must clean up what it left behind.
    recorded({ state: "failed" });
    return { route: "blocked", reason: failedStage ? `launch-failed:${failedStage}` : "launch-failed:residual", attemptKey,
      humanAction: "a person must resolve the blocker (trust prompt, port, funds) and clean residual resources; no automatic retry" };
  }
  // Positive proof of a clean failure is an explicit, empty residualResources list. Anything else (no receipt, junk,
  // a bare object, a non-list) means a worker or its resources may exist: keep ownership and have a person inspect.
  const proven = receipts.some((receipt) => Array.isArray(receipt.residualResources) && receipt.residualResources.length === 0);
  if (!proven) {
    recorded({ state: "unknown-liveness" });
    return { route: "blocked", reason: "launch-failed:unproven", attemptKey, humanAction: "inspect the Run with worker-list before dispatching this task again" };
  }
  recorded({ state: "failed" });
  return { route: "blocked", reason: "launch-failed", attemptKey, retryable: true };
}

function resumeExisting(ledger: Ledger, record: LedgerRecord, attemptKey: string): DispatchOutcome {
  // A claim with no launch recorded may have crashed between the claim and the spawn: unknown, so inspect, never relaunch.
  if (record.state === "claimed") ledger.update(attemptKey, { state: "unknown-liveness" });
  return { route: "resume", reason: "attempt-already-owned", attemptKey, ...(record.dispatchId ? { dispatchId: record.dispatchId } : {}) };
}

/** Bounded retries across attempts: only a retryable outcome repeats, never past min(caller, policy, 5) or the deadline. */
export async function dispatchWithRetries(options: Omit<DispatchOptions, "attemptId"> & { maxRetries: number; baseAttemptId: string }): Promise<DispatchOutcome> {
  const deps = options.deps ?? defaultDeps();
  const now = options.now ?? (() => deps.clock.perfNowMs());
  if (!orcaMultiAgentEnabled(options.root, deps, options.env ?? deps.proc.env)) return { route: "normal", reason: "orca-multi-agent-disabled" };
  if (!ID.test(options.baseAttemptId ?? "") || options.baseAttemptId.length > MAX_BASE_ID) return { route: "normal", reason: "invalid-id" };
  let policy: { maxRetriesPerTask?: unknown };
  try { policy = policyReport(options.root, options.coordinator, deps) as { maxRetriesPerTask?: unknown }; }
  catch { return { route: "normal", reason: "invalid-vendor" }; }
  const ceiling = typeof policy.maxRetriesPerTask === "number" ? policy.maxRetriesPerTask : 0;
  const requested = Number.isFinite(options.maxRetries) ? Math.max(0, Math.trunc(options.maxRetries)) : 0;
  const retries = Math.min(requested, ceiling, MAX_RETRIES);
  let outcome: DispatchOutcome = { route: "normal", reason: "no-attempt" };
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (!(options.deadlineMs - now() >= 1)) return { route: "normal", reason: "time-budget" };
    outcome = await dispatchScope({ ...options, attemptId: attempt === 0 ? options.baseAttemptId : `${options.baseAttemptId}-r${attempt}` });
    if (!outcome.retryable) return outcome;
  }
  return { ...outcome, retryable: false, reason: `${outcome.reason}:retries-exhausted` };
}

export interface MailMessage { id?: unknown; type?: unknown; subject?: unknown; body?: unknown; payload?: unknown }
export interface ReportOutcome { accepted: boolean; reason: string; state?: string; replayed?: boolean; summary?: string; filesModified?: string[] }

const SAFE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._@/-]{1,200}$/;
const PROTECTED_SEGMENT = /(?:^|\/)(?:\.git|\.project)(?:\/|$)/;

function plainText(value: unknown, limit: number): string {
  let out = "";
  const text = typeof value === "string" ? value.slice(0, limit * 4) : "";
  for (let index = 0; index < text.length && out.length < limit; index++) {
    const code = text.charCodeAt(index);
    const hidden = code < 32 || (code >= 127 && code <= 159) || (code >= 0x200b && code <= 0x200f) || (code >= 0x2028 && code <= 0x202e) || (code >= 0x2060 && code <= 0x2064) || (code >= 0x2066 && code <= 0x2069) || code === 0x00ad || code === 0x061c || code === 0xfeff;
    out += hidden ? " " : text[index];
  }
  return out;
}

/** Accepts one worker_done for the attempt, or explains why not. Never throws; no other message type completes anything. */
export function collectReport(options: { root: string; attemptKey: string; message: MailMessage; deps?: RuntimeDeps }): ReportOutcome {
  const deps = options.deps ?? defaultDeps();
  const message = obj(options.message);
  if (message.type !== "worker_done") return { accepted: false, reason: "not-a-completion" };
  if (typeof message.id !== "string" || !ID.test(message.id)) return { accepted: false, reason: "invalid-message-id" };
  const payload = parseJson(typeof message.payload === "string" ? message.payload : undefined);
  if (!payload) return { accepted: false, reason: "invalid-payload" };
  const { dispatchId, taskId, outcome } = payload;
  if (typeof dispatchId !== "string" || !ID.test(dispatchId) || typeof taskId !== "string" || !ID.test(taskId)) return { accepted: false, reason: "invalid-payload" };
  if (outcome !== "succeeded" && outcome !== "failed") return { accepted: false, reason: "invalid-outcome" };
  const files = Array.isArray(payload.filesModified) ? payload.filesModified : [];
  if (files.length > 200 || files.some((file) => typeof file !== "string" || !SAFE_PATH.test(file) || PROTECTED_SEGMENT.test(file))) return { accepted: false, reason: "invalid-files" };

  const ledger = createLedger(options.root, deps);
  const read = ledger.read(options.attemptKey);
  if (read.status !== "ok") return { accepted: false, reason: `ledger-${read.status}` };
  const record = read.record;
  if (record.dispatchId !== dispatchId) return { accepted: false, reason: "dispatch-mismatch" };
  const data = { summary: plainText(message.body, 500), filesModified: files as string[] };
  const want = outcome === "succeeded" ? "completed" : "failed";

  if (record.state === "completed") {
    if (want !== "completed") return { accepted: false, reason: "outcome-conflict" };
    if (record.reportId !== message.id) return { accepted: false, reason: "duplicate-report-different-message" };
    return { accepted: true, reason: "replayed", state: record.state, replayed: true, ...data };
  }
  if (record.state === "failed") {
    if (want !== "failed") return { accepted: false, reason: "outcome-conflict" };
    // The original failure report is not stored, so a replay confirms the state but carries none of the new message's data.
    return { accepted: true, reason: "replayed", state: record.state, replayed: true };
  }
  if (record.state === "settled") {
    if (want === "completed" && record.reportId === message.id) return { accepted: true, reason: "replayed", state: record.state, replayed: true, ...data };
    return { accepted: false, reason: "already-settled" };
  }
  const update = ledger.update(options.attemptKey, want === "completed" ? { state: "completed", reportId: message.id } : { state: "failed" });
  if (update.status !== "ok") return { accepted: false, reason: `ledger-${update.status}` };
  // Verify the write survived: a concurrent writer could have replaced the record after our rename.
  const after = ledger.read(options.attemptKey);
  if (after.status !== "ok" || after.record.state !== want || (want === "completed" && after.record.reportId !== message.id)) return { accepted: false, reason: "lost-update" };
  return { accepted: true, reason: "accepted", state: update.record.state, ...data };
}

export interface WorkerRow { projection?: { liveness?: { verdict?: unknown }; stage?: { dispatch?: unknown } } }
export interface LivenessAction { action: "keep" | "inspect-and-preserve" | "reassign-allowed"; reason: string }

/** Only positive proof of exit plus a settled dispatch allows reassignment; absence of evidence preserves ownership. */
export function classifyLiveness(row: WorkerRow | undefined): LivenessAction {
  const projection = obj(obj(row).projection);
  const verdict = obj(projection.liveness).verdict;
  const stage = obj(projection.stage).dispatch;
  if (verdict === "live") return { action: "keep", reason: "live" };
  if (verdict === "exited" && (stage === "failed" || stage === "completed")) return { action: "reassign-allowed", reason: "exited-and-settled" };
  return { action: "inspect-and-preserve", reason: typeof verdict === "string" ? verdict : "no-evidence" };
}

/**
 * Marks launched attempts unknown-liveness when the runtime version changed after launch (never relaunches).
 * The caller detects the version change (for example a failed `evaluateLaunch` with `runtime-version-unsupported`).
 */
export function markUnknownLiveness(options: { root: string; deps?: RuntimeDeps; attemptKeys: readonly string[] }): string[] {
  const ledger = createLedger(options.root, options.deps ?? defaultDeps());
  const marked: string[] = [];
  for (const key of options.attemptKeys) {
    const read = ledger.read(key);
    if (read.status === "ok" && read.record.state === "launched" && ledger.update(key, { state: "unknown-liveness" }).status === "ok") marked.push(key);
  }
  return marked;
}
