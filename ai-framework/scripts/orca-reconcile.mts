import { admitDiff, GIT_HARDENING } from "./orca-diff-admit.mts";
import type { Entry } from "./orca-diff-admit.mts";
import { applyAdmitted, isApplied, rollback } from "./orca-apply.mts";
import type { AdmittedWorker } from "./orca-apply.mts";
import { copyEvidence, decideCleanup, performCleanup, recordFinalState, verifyEvidence } from "./orca-evidence.mts";
import type { WorktreeRef } from "./orca-evidence.mts";
import { buildWorkerEnv } from "./orca-launch-gate.mts";
import { createLedger, idOf, ATTEMPT_PREFIX } from "./orca-ledger.mts";
import { createNodeDeps } from "./runtime/node.mts";
import { orcaMultiAgentEnabled } from "./runtime/select.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

/**
 * Reconcile verified worker changes onto the coordinator checkout.
 *
 * The order is fixed and every step before the apply is side-effect free:
 *   switch -> ledger state (only an attempt completed by its own worker_done) -> hardened diff admission ->
 *   claims versus the measured diff -> check-definition guard -> baseline check run -> snapshot and apply (all workers
 *   are `git apply --check`ed first) -> post-apply checks (a check that passed at the baseline and fails now is
 *   worker-caused: roll back only the touched paths) -> hash-verified evidence -> ledger `settled` -> cleanup only on
 *   positive proof of settlement.
 *
 * Worker claims (`filesModified`) are never the source of truth: the changed set is measured from the worker tree.
 * Checks come from a catalog the trusted caller supplies, never from worker text, and run with the worker env allowlist.
 * A rerun is idempotent: evidence that verifies means the attempt was already integrated, so it is only settled.
 */

export interface CheckSpec { command: string; args: readonly string[] }
export interface ReconcileAttempt {
  attemptKey: string;
  worktree: WorktreeRef;
  /** What the worker said it modified (untrusted; compared with the measured diff, never used instead of it). */
  claims?: readonly string[];
  /** Parsed `worker-release` output, if the worker has been released; enables the cleanup decision. */
  settlement?: unknown;
}
export interface ReconcileOptions {
  root: string;
  baseline: string;
  attempts: readonly ReconcileAttempt[];
  /** Trusted catalog of runnable checks by name. */
  checks: Readonly<Record<string, CheckSpec>>;
  /** Names from the catalog to run before and after the apply. */
  runChecks: readonly string[];
  /** A person confirmed diffs that touch check definitions or differ from the worker's claims. */
  humanConfirmed?: boolean;
  /** Roll back when a check that passed at the baseline fails after the apply. Default true. */
  rollbackOnFailure?: boolean;
  env?: Record<string, string | undefined>;
  deps?: RuntimeDeps;
  deadlineMs: number;
  now?: () => number;
}
export type AttemptState = "integrated" | "already-reconciled" | "excluded";
export interface AttemptResult {
  state: AttemptState;
  reason?: string;
  evidence?: "ok" | "failed";
  cleanup?: "removed" | "integrated-uncleaned" | "not-attempted";
  leftover?: string[];
}
export interface CheckResult { name: string; ok: boolean; errorCode?: string; output: string }
export interface ReconcileOutcome {
  status: "normal" | "refused" | "rolled-back" | "integrated";
  reason: string;
  attempts: Record<string, AttemptResult>;
  baselineChecks?: CheckResult[];
  checks?: CheckResult[];
  /** Checks that already failed on the baseline, so a failure after the apply is not attributed to a worker. */
  baselineFailing?: string[];
  /** Checks that passed on the baseline and failed after the apply (non-empty only with `rollbackOnFailure: false`). */
  failedChecks?: string[];
  /** Paths a failed rollback could not restore. */
  unrestored?: string[];
}

const HEX40 = /^[0-9a-f]{40}$/;
const NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const MAX_CHECK_OUTPUT = 4096;
const CHECK_OUTPUT_BUFFER = 256 * 1024;
const MAX_ATTEMPTS = 3;
/** Diffs touching these define or run the checks themselves: a worker must not be able to make its own checks pass. */
const CHECK_DEFINITIONS: readonly RegExp[] = Object.freeze([
  /(^|\/)package(-lock)?\.json$/, /(^|\/)(tsconfig|bunfig|jsconfig)[^/]*$/, /^ai-framework\/(scripts|hooks)\//, /^\.(claude|opencode|codex|cursor|agents|github|husky)\//,
  /^\.project\/evals\//, /\.(test|spec)\.[cm]?[jt]sx?$/, /(^|\/)(test|tests|spec|specs|__tests__)\//, /(^|\/)(test|tests|spec)\.[cm]?[jt]sx?$/, /(^|\/)(test|tests|spec)[-_.][^/]*\.[cm]?[jt]sx?$/, /[-_.](test|tests|spec)\.[cm]?[jt]sx?$/,
  /(^|\/)\.env/, /(^|\/)\.git(attributes|modules|ignore)$/, /(^|\/)node_modules\//, /(^|\/)\.(npmrc|yarnrc[^/]*|nvmrc|pnpmfile\.c?js|mocharc[^/]*|tool-versions)$/,
  /[.-]config\.[cm]?[jt]sx?$/, /[.-]config\.json$/, /(^|\/)(vitest|jest|babel|karma|playwright|cypress)[^/]*\.(workspace|config)[^/]*$/,
  /(^|\/)(GNUmakefile|makefile|Makefile)$/, /(^|\/)(yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.toml|Cargo\.lock|pyproject\.toml|setup\.py|setup\.cfg|tox\.ini|pytest\.ini|conftest\.py|go\.mod|go\.sum|deno\.jsonc?)$/,
].map((pattern) => new RegExp(pattern.source, "i")));
let nodeDeps: RuntimeDeps | undefined;
const defaultDeps = (): RuntimeDeps => (nodeDeps ??= createNodeDeps());

const plain = (text: string, limit: number): string => {
  let out = "";
  for (let index = 0; index < text.length && out.length < limit; index++) {
    const code = text.charCodeAt(index);
    out += code < 32 && code !== 10 && code !== 9 || (code >= 127 && code <= 159) || (code >= 0x200b && code <= 0x200f) || (code >= 0x2028 && code <= 0x202e) || (code >= 0x2060 && code <= 0x2064) || (code >= 0x2066 && code <= 0x2069) || code === 0xfeff ? " " : text[index];
  }
  return out;
};
const touchesCheckDefinitions = (entries: readonly Entry[]): string | undefined =>
  entries.flatMap((entry) => (entry.from ? [entry.path, entry.from] : [entry.path])).find((file) => CHECK_DEFINITIONS.some((pattern) => pattern.test(file)));
const claimsMatch = (entries: readonly Entry[], claims: readonly string[]): boolean => {
  const measured = new Set(entries.flatMap((entry) => (entry.from ? [entry.path, entry.from] : [entry.path])));
  const said = new Set(claims);
  return measured.size === said.size && [...measured].every((file) => said.has(file));
};
const commandAcceptable = (spec: CheckSpec, deps: RuntimeDeps): boolean =>
  typeof spec?.command === "string" && spec.command.length > 0 && spec.command.length <= 4096 && !/[\u0000-\u001f\u007f]/.test(spec.command)
  && (deps.path.isAbsolute(spec.command) || /^(?!\.+$)[a-zA-Z0-9._-]+$/.test(spec.command))
  && Array.isArray(spec.args) && spec.args.length <= 64 && spec.args.every((arg) => typeof arg === "string" && arg.length <= 4096 && !arg.includes("\0"));

async function runCheckSet(names: readonly string[], options: ReconcileOptions, deps: RuntimeDeps, now: () => number): Promise<CheckResult[] | "time-budget"> {
  const results: CheckResult[] = [];
  const env = buildWorkerEnv(options.env ?? deps.proc.env, deps);
  for (const name of names) {
    const remaining = options.deadlineMs - now();
    if (!(remaining >= 1)) return "time-budget";
    const spec = options.checks[name];
    const run = await deps.child.run(spec.command, [...spec.args], { cwd: options.root, env, timeoutMs: Math.floor(remaining), maxBufferBytes: CHECK_OUTPUT_BUFFER, killSignal: "SIGKILL" });
    const output = plain(`${run.stdout}\n${run.stderr}`, MAX_CHECK_OUTPUT);
    results.push({ name, ok: run.status === 0 && !run.signal && !run.errorCode, ...(run.errorCode ? { errorCode: run.errorCode } : {}), output });
  }
  return results;
}

export async function reconcile(options: ReconcileOptions): Promise<ReconcileOutcome> {
  const deps = options.deps ?? defaultDeps();
  const now = options.now ?? (() => deps.clock.perfNowMs());
  const attempts: Record<string, AttemptResult> = {};
  const done = (status: ReconcileOutcome["status"], reason: string, extra: Partial<ReconcileOutcome> = {}): ReconcileOutcome => ({ status, reason, attempts, ...extra });

  if (!orcaMultiAgentEnabled(options.root, deps, options.env ?? deps.proc.env)) return done("normal", "orca-multi-agent-disabled");
  if (!HEX40.test(options.baseline ?? "")) return done("refused", "baseline-invalid");
  if (!Array.isArray(options.attempts) || options.attempts.length === 0 || options.attempts.length > MAX_ATTEMPTS) return done("refused", "attempts-invalid");
  const names = [...(options.runChecks ?? [])];
  for (const name of names) {
    if (!NAME.test(name) || !Object.hasOwn(options.checks ?? {}, name) || !commandAcceptable(options.checks[name], deps)) return done("refused", "check-not-in-catalog");
  }
  if (new Set(options.attempts.map((attempt) => attempt.attemptKey)).size !== options.attempts.length) return done("refused", "attempts-invalid");
  for (const attempt of options.attempts) {
    if (idOf(attempt.attemptKey, ATTEMPT_PREFIX) === undefined || attempt.worktree?.baseline !== options.baseline) return done("refused", "attempts-invalid");
  }
  if (!(options.deadlineMs - now() >= 1)) return done("refused", "time-budget");

  const ledger = createLedger(options.root, deps);
  const ordered = [...options.attempts].sort((a, b) => (a.attemptKey < b.attemptKey ? -1 : 1));
  const candidates: ReconcileAttempt[] = [];
  const settledNow: ReconcileAttempt[] = [];
  for (const attempt of ordered) {
    const read = ledger.read(attempt.attemptKey);
    if (read.status === "refused" || read.status === "corrupt") return done("refused", `ledger-${read.status}`);
    if (read.status === "missing") { attempts[attempt.attemptKey] = { state: "excluded", reason: "ledger-missing" }; continue; }
    const state = read.record.state;
    if (state === "settled") {
      // Already integrated in an earlier run; its worker tree may be gone, so only the evidence can be re-checked.
      if (verifyEvidence({ root: options.root, attemptKey: attempt.attemptKey, deps }).status === "ok") {
        attempts[attempt.attemptKey] = { state: "already-reconciled", evidence: "ok" };
        settledNow.push(attempt);
      } else attempts[attempt.attemptKey] = { state: "excluded", reason: "settled-without-evidence" };
    } else if (state === "completed") candidates.push(attempt);
    else attempts[attempt.attemptKey] = { state: "excluded", reason: "not-completed" };
  }

  const workers: AdmittedWorker[] = [];
  const present: AdmittedWorker[] = [];
  const admittedBy = new Map<string, ReconcileAttempt>();
  for (const attempt of candidates) {
    const admission = await admitDiff({ worktree: attempt.worktree.path, baseline: options.baseline, deps });
    if (admission.status !== "admitted") { attempts[attempt.attemptKey] = { state: "excluded", reason: `admission:${admission.reason}` }; continue; }
    if (attempt.claims !== undefined && !claimsMatch(admission.entries, attempt.claims) && options.humanConfirmed !== true) {
      attempts[attempt.attemptKey] = { state: "excluded", reason: "claim-mismatch" };
      continue;
    }
    if (touchesCheckDefinitions(admission.entries) !== undefined && options.humanConfirmed !== true) {
      attempts[attempt.attemptKey] = { state: "excluded", reason: "check-definitions-changed" };
      continue;
    }
    const ignored = await firstIgnored(options, deps, admission.entries);
    if (ignored !== undefined && options.humanConfirmed !== true) {
      attempts[attempt.attemptKey] = { state: "excluded", reason: ignored === "" ? "ignore-check-failed" : "ignored-path" };
      continue;
    }
    const worker: AdmittedWorker = { attemptKey: attempt.attemptKey, entries: admission.entries, patch: admission.patch };
    admittedBy.set(attempt.attemptKey, attempt);
    // The change may already be in the tree (a crash after the apply): it is then only proven and settled, never applied twice.
    if (await isApplied({ root: options.root, patch: admission.patch, entries: admission.entries, deps, deadlineMs: options.deadlineMs, now })) present.push(worker);
    else workers.push(worker);
  }

  let outcome: ReconcileOutcome;
  let applyDone: { snapshot: string; touched: string[] } | undefined;
  let checks: CheckResult[] | "time-budget" = [];
  let baselineChecks: CheckResult[] = [];
  let baselineFailing: string[] = [];
  let failedChecks: string[] = [];
  if (workers.length > 0) {
    // Baseline first: a check that already fails there is not the worker's fault.
    let before: CheckResult[] | "time-budget";
    try { before = await runCheckSet(names, options, deps, now); } catch { return done("refused", "check-error"); }
    if (before === "time-budget") return done("refused", "time-budget");
    baselineChecks = before;
    // When a resumed change is already in the tree, the baseline run is not a baseline: it contains that unproven change,
    // so no failing check may be excused as "already failing".
    baselineFailing = present.length > 0 ? [] : before.filter((check) => !check.ok).map((check) => check.name);
    const applied = await applyAdmitted({ root: options.root, baseline: options.baseline, admitted: workers, workerOrder: workers.map((worker) => worker.attemptKey), deps, deadlineMs: options.deadlineMs, now });
    if (applied.status === "refused" || applied.status === "rolled-back") {
      for (const worker of [...workers, ...present]) attempts[worker.attemptKey] = { state: "excluded", reason: `apply:${applied.reason}` };
      if (applied.status === "refused") return done("refused", `apply:${applied.reason}`, { baselineChecks, baselineFailing });
      return done("rolled-back", `apply:${applied.reason}`, { baselineChecks, baselineFailing, ...(applied.unrestored ? { unrestored: applied.unrestored } : {}) });
    }
    applyDone = { snapshot: applied.snapshot, touched: applied.touched };
    try {
      checks = await runCheckSet(names, options, deps, now);
      failedChecks = checks === "time-budget" ? ["time-budget"] : checks.filter((check) => !check.ok && !baselineFailing.includes(check.name)).map((check) => check.name);
    } catch {
      failedChecks = ["check-error"];
      checks = "time-budget";
    }
    // A resumed attempt (its change was already in the tree) is settled only if every check passes: the baseline run above
    // already contained its change, so a failure there is not attributed to anyone and must not settle it.
    if (present.length > 0) {
      const failing = checks === "time-budget" ? ["time-budget"] : checks.filter((check) => !check.ok).map((check) => check.name);
      if (failing.length > 0) {
        for (const worker of present.splice(0)) attempts[worker.attemptKey] = { state: "excluded", reason: `checks-failing-on-resume:${failing.join(",")}` };
      }
    }
    if (failedChecks.length > 0 && options.rollbackOnFailure !== false) {
      const back = rollback({ root: options.root, snapshot: applyDone.snapshot, touched: applyDone.touched, deps });
      for (const worker of [...workers, ...present]) attempts[worker.attemptKey] = { state: "excluded", reason: `check-failed:${failedChecks.join(",")}` };
      return done("rolled-back", back.status === "restored" ? `check-failed:${failedChecks.join(",")}` : "rollback-incomplete",
        { baselineChecks, ...(checks === "time-budget" ? {} : { checks }), baselineFailing, failedChecks, ...(back.status === "refused" && back.unrestored ? { unrestored: back.unrestored } : {}) });
    }
  }
  if (workers.length === 0 && present.length === 0 && settledNow.length === 0) return done("refused", "nothing-to-integrate");
  if (workers.length === 0 && present.length > 0) {
    // The change is already in the tree (a rerun after a crash): it still has to pass the checks before it is settled.
    // There is no baseline to compare with, so any failure stops the settle and leaves the decision to a person.
    try {
      checks = await runCheckSet(names, options, deps, now);
    } catch { checks = "time-budget"; }
    const failing = checks === "time-budget" ? ["time-budget"] : checks.filter((check) => !check.ok).map((check) => check.name);
    if (failing.length > 0) {
      for (const worker of present) attempts[worker.attemptKey] = { state: "excluded", reason: `checks-failing-on-resume:${failing.join(",")}` };
      return done("refused", `checks-failing-on-resume:${failing.join(",")}`, { ...(checks === "time-budget" ? {} : { checks }), failedChecks: failing });
    }
  }

  let settledAny = false;
  try {
    const checkText = checks === "time-budget" ? "" : checks.map((check) => `${check.name}: ${check.ok ? "ok" : "failed"}${check.errorCode ? ` (${check.errorCode})` : ""}\n${check.output}`).join("\n");
    for (const worker of [...workers, ...present]) {
      const attempt = admittedBy.get(worker.attemptKey) as ReconcileAttempt;
      // Evidence that already verifies for exactly this worker's patch (a crash after the copy) is reused as written;
      // evidence for any other patch is never accepted, and copying over it conflicts.
      const prior = verifyEvidence({ root: options.root, attemptKey: worker.attemptKey, deps });
      const sameDiff = prior.status === "ok" && prior.manifest.patchSha256 === deps.crypto.sha256Hex(new TextEncoder().encode(worker.patch))
        && JSON.stringify(prior.manifest.entries) === JSON.stringify(worker.entries);
      const copy = sameDiff && prior.status === "ok"
        ? { status: "ok" as const, manifestSha256: prior.manifestSha256, dir: prior.dir }
        : copyEvidence({ root: options.root, attemptKey: worker.attemptKey, patch: worker.patch, entries: worker.entries, checks: checkText, deps });
      const verified = copy.status === "ok" ? verifyEvidence({ root: options.root, attemptKey: worker.attemptKey, expectedManifestSha256: copy.manifestSha256, deps }) : undefined;
      if (copy.status !== "ok" || verified?.status !== "ok") {
        // Integrated but not provable: keep the attempt `completed` and the worker tree; a rerun picks it up as already applied.
        attempts[worker.attemptKey] = { state: "integrated", evidence: "failed", cleanup: "not-attempted", reason: "evidence-not-verified" };
        continue;
      }
      if (ledger.update(worker.attemptKey, { state: "settled" }).status !== "ok") {
        attempts[worker.attemptKey] = { state: "integrated", evidence: "ok", cleanup: "not-attempted", reason: "ledger-update-failed" };
        continue;
      }
      settledAny = true;
      // Record the settle before the cleanup can throw, so the caller always learns that this attempt is settled.
      attempts[worker.attemptKey] = { state: "integrated", evidence: "ok", cleanup: "not-attempted" };
      attempts[worker.attemptKey] = await cleanupAttempt(options, deps, attempt, copy.manifestSha256, attempts[worker.attemptKey]);
    }
    for (const attempt of settledNow) {
      const verified = verifyEvidence({ root: options.root, attemptKey: attempt.attemptKey, deps });
      if (verified.status === "ok") attempts[attempt.attemptKey] = await cleanupAttempt(options, deps, attempt, verified.manifestSha256, attempts[attempt.attemptKey]);
    }
  } catch {
    // Something threw after the apply: the change is in the tree and its evidence is unproven. Report it; never throw.
    // A worker that is already settled (evidence verified, ledger updated, tree possibly removed) must never be rolled
    // back; only a failure before any settle is undone.
    for (const worker of [...workers, ...present]) {
      // Attempts the loop never reached are reported, not left without a result.
      if (attempts[worker.attemptKey] === undefined) attempts[worker.attemptKey] = { state: "excluded", reason: "error-after-apply" };
    }
    if (settledAny) return done("refused", "error-after-apply-partial", { baselineChecks, baselineFailing });
    if (applyDone && options.rollbackOnFailure !== false) {
      const back = rollback({ root: options.root, snapshot: applyDone.snapshot, touched: applyDone.touched, deps });
      for (const worker of workers) attempts[worker.attemptKey] = { state: "excluded", reason: "error-after-apply" };
      return done("rolled-back", back.status === "restored" ? "error-after-apply" : "rollback-incomplete", { baselineChecks, baselineFailing, ...(back.status === "refused" && back.unrestored ? { unrestored: back.unrestored } : {}) });
    }
    return done("refused", "error-after-apply", { baselineChecks, baselineFailing });
  }
  const evidenceFailed = Object.values(attempts).some((result) => result.evidence === "failed" || result.reason === "ledger-update-failed");
  outcome = done("integrated", failedChecks.length > 0 ? "integrated-with-failing-checks" : evidenceFailed ? "integrated-evidence-failed" : "integrated",
    { baselineChecks, ...(checks === "time-budget" ? {} : { checks }), baselineFailing, ...(failedChecks.length > 0 ? { failedChecks } : {}) });
  return outcome;
}

/** Cleanup is attempted only when the caller supplied a release receipt; otherwise the worker tree is left alone. */
async function cleanupAttempt(options: ReconcileOptions, deps: RuntimeDeps, attempt: ReconcileAttempt, manifestSha256: string, base: AttemptResult): Promise<AttemptResult> {
  if (attempt.settlement === undefined) return base;
  // The caller's deadline is on the injected clock; evidence/cleanup budgets are on the monotonic clock.
  const now = options.now ?? (() => deps.clock.perfNowMs());
  const deadline = deps.clock.monotonicMs() + Math.max(0, options.deadlineMs - now());
  const decision = await decideCleanup({ evidence: { root: options.root, attemptKey: attempt.attemptKey, manifestSha256 }, settlement: attempt.settlement, worktree: attempt.worktree, deps, deadlineMs: deadline });
  const result: AttemptResult = { ...base };
  if (decision.action === "remove") {
    const removed = await performCleanup(decision, deps, deadline);
    result.cleanup = removed.status === "ok" ? "removed" : "integrated-uncleaned";
    if (removed.status === "ok") recordFinalState({ root: options.root, attemptKey: attempt.attemptKey, state: "cleaned", deps });
    else {
      result.leftover = [attempt.worktree.path];
      recordFinalState({ root: options.root, attemptKey: attempt.attemptKey, state: "integrated-uncleaned", leftover: result.leftover, deps });
    }
  } else {
    result.cleanup = "integrated-uncleaned";
    result.leftover = decision.leftover;
    recordFinalState({ root: options.root, attemptKey: attempt.attemptKey, state: "integrated-uncleaned", leftover: decision.leftover, deps });
  }
  return result;
}

/** First changed path the coordinator's ignore rules hide from `git status`, "" when the check itself failed. */
async function firstIgnored(options: ReconcileOptions, deps: RuntimeDeps, entries: readonly Entry[]): Promise<string | undefined> {
  const paths = [...new Set(entries.map((entry) => entry.path))];
  const env = { ...buildWorkerEnv(options.env ?? deps.proc.env, deps), GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_TERMINAL_PROMPT: "0" };
  try {
    const result = await deps.child.run("git", [...GIT_HARDENING, "check-ignore", "-z", "--no-index", "--stdin"], { cwd: options.root, env, input: `${paths.join("\0")}\0`, timeoutMs: 30000, maxBufferBytes: CHECK_OUTPUT_BUFFER, killSignal: "SIGKILL" });
    if (result.errorCode) return "";
    if (result.status === 1) return undefined;
    if (result.status !== 0) return "";
    return result.stdout.split("\0").find(Boolean) ?? "";
  } catch { return ""; }
}
