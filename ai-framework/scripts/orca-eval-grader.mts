import { classifyLiveness, collectReport, dispatchScope, dispatchWithRetries } from "./orca-dispatch.mts";
import type { DispatchOptions, DispatchOutcome, MailMessage, Placement, ScopeSpec } from "./orca-dispatch.mts";
import { verifyEvidence } from "./orca-evidence.mts";
import { isWorkerContext, workerBrief } from "./orca-launch-gate.mts";
import { createLedger } from "./orca-ledger.mts";
import { VENDORS } from "./orca-policy.mts";
import { report as preflightReport, SUPPORTED_VERSION } from "./orca-preflight.mts";
import type { Receipt, Run } from "./orca-preflight.mts";
import { reconcile } from "./orca-reconcile.mts";
import type { CheckSpec, ReconcileAttempt, ReconcileOptions } from "./orca-reconcile.mts";
import { runDirect } from "./runtime/cli.mts";
import { createNodeDeps } from "./runtime/node.mts";
import type { RunResult, RuntimeDeps, SpawnOptions } from "./runtime/types.mts";

/**
 * Executable grader for `.project/evals/datasets/orca-vendor-orchestration.json`.
 *
 * Every case gets one of three modes and the summary never merges them:
 * - `executes`: the case input drives the real libraries (dispatch, launch gate, preflight, ledger, reconcile, evidence)
 *   against a fake Orca and temporary git repositories; the observed facts are compared with the case's `expected`.
 * - `parses-only`: no library computes the claim; the case is only checked for shape and never counts as a pass.
 * - `live-only`: needs an installed runtime, a funded vendor or peer messaging; reported as not-run, never a pass.
 *
 * Rules: each case is split into `expected` and the rest before anything runs, and an observer only ever sees the rest,
 * so `actual` can never be derived from `expected`. An expected key the observer did not measure fails the case unless
 * it is listed as not executed. `pass` is true only for an executed case whose every measured key matched.
 */

export const DATASET_FILE = ".project/evals/datasets/orca-vendor-orchestration.json";
export const MAX_DATASET_BYTES = 256 * 1024;
export type Mode = "executes" | "parses-only" | "live-only";
export interface CaseResult { id: string; mode: Mode; pass: boolean; detail: string }
export interface Summary {
  executes: { total: number; passed: number; failed: number };
  parsesOnly: { total: number; parsed: number; failed: number };
  liveOnly: { total: number; notRun: number };
  /** Cases the plan allowed to defer; empty when every executable case runs. */
  deferred: string[];
  /** No static grading proves live compatibility. */
  liveCompatibility: "unverified";
  error?: string;
}
export interface GradeReport { cases: CaseResult[]; summary: Summary }

/** The libraries the grader drives; tests replace single entries with in-memory mutants. */
export const LIBRARIES = Object.freeze({ dispatchScope, dispatchWithRetries, collectReport, classifyLiveness, workerBrief, isWorkerContext, preflightReport, reconcile, verifyEvidence });
export type GraderLibraries = typeof LIBRARIES;
export interface GradeOptions { deps: RuntimeDeps; root?: string; libs?: Partial<GraderLibraries>; only?: readonly string[] }

/** The hostile-summary case id this grader executes (added to the dataset by scope I4). */
export const HOSTILE_SUMMARY_CASE = "hostile-worker-summary-is-data";
const PARSES_ONLY: Readonly<Record<string, string>> = Object.freeze({
  "unreported-cost-is-not-savings": "no library computes cost or savings; the case is checked for shape only",
});
const LIVE_ONLY: Readonly<Record<string, string>> = Object.freeze({
  "static-fixtures-do-not-prove-runtime": "liveCompatibility: unverified; needs an installed-runtime smoke run, and no smoke record or static fixture turns this case into a pass",
  "stateful-recovery-and-peer-messages": "peer messaging (mail replay, pending peer question, run-scoped delivery) needs a live Orca runtime; not-run",
  "all-coordinator-and-policy-permutations": "the per-vendor success variants need funded live vendors; not-run (policy permutations are unit-tested in orca-policy/orca-dispatch tests, not graded here)",
});

type Json = Record<string, unknown>;
type Env = Record<string, string | undefined>;
interface Given { input?: unknown; variants?: unknown }
interface Observation { actual: Json; notExecuted?: Record<string, string>; notes?: string[] }
interface Ctx { deps: RuntimeDeps; env: Env; gitEnv: Env; libs: GraderLibraries; tmp: string; serial: { n: number } }
type Observer = (given: Given, ctx: Ctx) => Promise<Observation>;

const ORCA = "orca";
const SESSION = "grader-session";
const SWITCH = "AI_WORKFLOW_ORCA_MULTI_AGENT";
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
const REPORT_KEYS: readonly string[] = Object.freeze(["accepted", "reason", "state", "replayed", "summary", "filesModified"]);
const BRIEF_FIELDS: ReadonlyArray<readonly [string, string, keyof Omit<ScopeSpec, "id">]> = Object.freeze([
  ["target", "Target", "target"], ["change", "Change", "change"], ["constraints", "Constraints", "constraints"],
  ["ownership", "Ownership", "ownership"], ["observableAcceptance", "Observable acceptance", "acceptance"],
] as const);

const obj = (value: unknown): Json => (typeof value === "object" && value !== null && !Array.isArray(value) ? value as Json : {});
const str = (value: unknown): string => (typeof value === "string" ? value : "");
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
const argAfter = (args: readonly string[], flag: string): string | undefined => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const allTrue = (values: readonly boolean[]): boolean => values.length > 0 && values.every(Boolean);
const short = (value: unknown): string => {
  const text = JSON.stringify(value) ?? "undefined";
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
};

// ---- fixtures (temporary directories, a fake Orca, temporary git repositories) ----

function fresh(ctx: Ctx, label: string): string {
  const dir = ctx.deps.path.join(ctx.tmp, `${label}-${++ctx.serial.n}`);
  ctx.deps.fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** An enabled policy where `coordinator` delegates to `workers`; every other vendor gets its two alternates. */
function writePolicy(ctx: Ctx, root: string, coordinator: string, workers: readonly string[]): void {
  const coordinators: Json = {};
  for (const vendor of VENDORS) {
    const list = vendor === coordinator ? [...workers] : VENDORS.filter((other) => other !== vendor);
    coordinators[vendor] = { workers: list, roles: { implementation: list[0], review: list[1] ?? list[0] } };
  }
  const policy = { schemaVersion: 1, "use-orca-orchestration": true, maxConcurrentWorkers: 3, maxRetriesPerTask: 2, coordinators };
  ctx.deps.fs.mkdirSync(ctx.deps.path.join(root, ".project"), { recursive: true });
  ctx.deps.fs.writeFileSync(ctx.deps.path.join(root, ".project", "orchestration.json"), JSON.stringify(policy));
}

type ProbeMode = "verified" | "caller-unverified" | "status-failed" | "runtime-unreachable" | "version-drift" | "guide-missing";
/** Synchronous preflight runner answering the three probe calls by their arguments. */
function probe(mode: ProbeMode): Run {
  const ok = (value: unknown): Receipt => ({ status: 0, signal: null, stdout: JSON.stringify(value), stderr: "" });
  return (_command, args) => {
    const call = args.join(" ");
    if (call === "skills get orca-cli --json") return ok({ name: "orca-cli", markdown: mode === "guide-missing" ? "" : "worktree current; terminal" });
    if (call === "skills get orchestration --json") return ok({ name: "orchestration", markdown: "worker-start; worker_done; orchestration check" });
    if (call !== "status --json") return null;
    if (mode === "status-failed") return { status: 1, signal: null, stdout: "", stderr: "unavailable" };
    const runtime = { reachable: mode !== "runtime-unreachable", state: "ready", appVersion: mode === "version-drift" ? "0.0.1" : SUPPORTED_VERSION };
    const caller = mode === "caller-unverified" ? { live: false } : { live: true, orcaSessionId: SESSION };
    return ok({ ok: true, result: { target: { kind: "local" }, runtime, caller } });
  };
}

type Behaviour = "ok" | "timeout" | "signal" | "unproven" | "residual";
interface FakeOrca { deps: RuntimeDeps; calls: string[][] }
/** A fake Orca executable: records every call and answers worker-start from a script; other commands run for real. */
function fakeOrca(base: RuntimeDeps, script: readonly Behaviour[]): FakeOrca {
  const calls: string[][] = [];
  const run = async (command: string, args: string[], options?: SpawnOptions): Promise<RunResult> => {
    if (command !== ORCA) return base.child.run(command, args, options);
    calls.push([...args]);
    const behaviour = script[Math.min(calls.length - 1, script.length - 1)];
    const blank = { signal: null, stderr: "" };
    if (behaviour === "ok") return { ...blank, status: 0, stdout: JSON.stringify({ result: { stage: "input_accepted", dispatch: { id: `grader_${calls.length}` } } }) };
    if (behaviour === "timeout") return { ...blank, status: null, stdout: "", errorCode: "ETIMEDOUT" };
    if (behaviour === "signal") return { status: null, signal: "SIGKILL", stdout: "", stderr: "" };
    if (behaviour === "unproven") return { ...blank, status: 1, stdout: "junk" };
    return { ...blank, status: 1, stdout: JSON.stringify({ result: { failedStage: "setup", residualResources: [{ kind: "worktree" }] } }) };
  };
  return { deps: { ...base, child: { ...base.child, run } }, calls };
}

function scopeSpec(id: string, text: string, ownership: string): ScopeSpec {
  return { id, target: text, change: text, constraints: "edit only the owned paths", ownership, acceptance: "coordinator checks pass on the integrated tree" };
}

interface LaunchArgs { root: string; deps: RuntimeDeps; coordinator: string; vendor: string; scope: ScopeSpec; attemptId: string; mode?: ProbeMode; present?: boolean; argv?: readonly string[]; placement?: Placement }
function launch(ctx: Ctx, args: LaunchArgs): DispatchOptions {
  return {
    root: args.root, coordinator: args.coordinator, vendor: args.vendor, scope: args.scope, attemptId: args.attemptId, deadlineMs: 5000, now: () => 1000,
    env: ctx.env, deps: args.deps, run: probe(args.mode ?? "verified"), platform: "darwin", present: () => args.present !== false,
    ...(args.argv ? { argv: args.argv } : {}), ...(args.placement ? { placement: args.placement } : {}),
  };
}
const workerDone = (id: string, dispatchId: string, files: readonly string[], body: string, type = "worker_done"): MailMessage =>
  ({ id, type, subject: "done", body, payload: JSON.stringify({ taskId: "grader-task", dispatchId, outcome: "succeeded", filesModified: files }) });
const stateOf = (ctx: Ctx, root: string, attemptKey: string): string => {
  const read = createLedger(root, ctx.deps).read(attemptKey);
  return read.status === "ok" ? read.record.state : read.status;
};
const metricsWritten = (ctx: Ctx, root: string): boolean => ctx.deps.fs.existsSync(ctx.deps.path.join(root, ".project", "metrics"));

interface Repo { root: string; workspace: string; baseline: string; orca: FakeOrca }
async function git(ctx: Ctx, cwd: string, args: readonly string[]): Promise<string> {
  const result = await ctx.deps.child.run("git", ["-c", "user.email=grader@example.invalid", "-c", "user.name=grader", "-c", "commit.gpgsign=false", ...args],
    { cwd, env: ctx.gitEnv, timeoutMs: 30000 });
  if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${result.stderr.slice(0, 200)}`);
  return result.stdout.trim();
}
async function repo(ctx: Ctx): Promise<Repo> {
  const { fs, path } = ctx.deps;
  const top = fresh(ctx, "repo");
  const root = path.join(top, "coordinator");
  const workspace = path.join(top, "workspaces");
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(workspace, { recursive: true });
  await git(ctx, root, ["init", "-q", "-b", "main"]);
  for (const file of ["a.txt", "b.txt", "c.txt"]) fs.writeFileSync(path.join(root, file), `${file} baseline\n`);
  fs.writeFileSync(path.join(root, ".gitignore"), ".project/metrics/\n");
  writePolicy(ctx, root, "claude", ["codex", "opencode"]);
  await git(ctx, root, ["add", "-A"]);
  await git(ctx, root, ["commit", "-q", "-m", "baseline"]);
  return { root, workspace, baseline: await git(ctx, root, ["rev-parse", "HEAD"]), orca: fakeOrca(ctx.deps, ["ok"]) };
}
async function worker(ctx: Ctx, fx: Repo, name: string, files: Readonly<Record<string, string>>): Promise<ReconcileAttempt> {
  const dir = ctx.deps.path.join(fx.workspace, name);
  await git(ctx, fx.root, ["worktree", "add", "-q", "-b", name, dir, fx.baseline]);
  for (const [file, text] of Object.entries(files)) ctx.deps.fs.writeFileSync(ctx.deps.path.join(dir, file), text);
  await git(ctx, dir, ["add", "-A"]);
  await git(ctx, dir, ["commit", "-q", "-m", name]);
  return { attemptKey: `attempt:${name}`, worktree: { path: dir, baseline: fx.baseline, allowedRoots: [fx.workspace] } };
}
/** Completes an attempt the way production does: a real dispatch, then the worker's own worker_done. */
async function complete(ctx: Ctx, fx: Repo, name: string, files: readonly string[], body = "done"): Promise<boolean> {
  const out = await ctx.libs.dispatchScope(launch(ctx, { root: fx.root, deps: fx.orca.deps, coordinator: "claude", vendor: "codex", scope: scopeSpec(`scope-${name}`, `change ${files.join(", ")}`, files.join(", ")), attemptId: name }));
  if (out.route !== "launched" || !out.dispatchId || !out.attemptKey) return false;
  return ctx.libs.collectReport({ root: fx.root, attemptKey: out.attemptKey, message: workerDone(`msg-${name}`, out.dispatchId, files, body), deps: ctx.deps }).accepted;
}
function catalog(ctx: Ctx): Record<string, CheckSpec> {
  const node = (code: string): CheckSpec => ({ command: ctx.deps.proc.execPath, args: ["-e", code] });
  return {
    ok: node("process.exit(0)"),
    nobad: node("process.exit(require('fs').readFileSync('a.txt','utf8').includes('BAD') ? 1 : 0)"),
    "sees-change": node("process.exit(require('fs').readFileSync('a.txt','utf8').includes('WORKER-CHANGE') ? 0 : 1)"),
  };
}
function reconcileOptions(ctx: Ctx, fx: Repo, attempts: readonly ReconcileAttempt[], runChecks: readonly string[], baseline = fx.baseline): ReconcileOptions {
  return { root: fx.root, baseline, attempts, checks: catalog(ctx), runChecks, env: ctx.env, deps: ctx.deps, deadlineMs: ctx.deps.clock.perfNowMs() + 120000 };
}
const readText = (ctx: Ctx, dir: string, file: string): string => {
  try { return ctx.deps.fs.readFileSync(ctx.deps.path.join(dir, file)); } catch { return "<missing>"; }
};

// ---- observers: each sees only the case without `expected` ----

const observeAlternateVendors: Observer = async (given, ctx) => {
  const input = obj(given.input);
  const harness = str(input.harness);
  const workers = strings(input.workers);
  const scopes = strings(input.scopes);
  const root = fresh(ctx, "alternate");
  writePolicy(ctx, root, harness, workers);
  const orca = fakeOrca(ctx.deps, ["ok"]);
  const mode: ProbeMode = input.orcaSessionVerified === true && input.capabilitiesVerified === true ? "verified" : "status-failed";
  const outcomes: DispatchOutcome[] = [];
  for (const [index, text] of scopes.entries()) {
    outcomes.push(await ctx.libs.dispatchScope(launch(ctx, { root, deps: orca.deps, coordinator: harness, vendor: workers[index % Math.max(1, workers.length)] ?? "", mode,
      scope: scopeSpec(`scope-${index + 1}`, text, `checkout-${index + 1}`), attemptId: `alt-${index + 1}`, placement: { worktree: `checkout-${index + 1}` } })));
  }
  const starts = orca.calls.slice();
  // The coordinator never delegates to itself, and a task that already has a writer gets no second one.
  const self = await ctx.libs.dispatchScope(launch(ctx, { root, deps: orca.deps, coordinator: harness, vendor: harness, mode, scope: scopeSpec("scope-self", "self", "self"), attemptId: "alt-self" }));
  const again = await ctx.libs.dispatchScope(launch(ctx, { root, deps: orca.deps, coordinator: harness, vendor: workers[0] ?? "", mode,
    scope: scopeSpec("scope-1", scopes[0] ?? "x", "checkout-1"), attemptId: "alt-again", placement: { worktree: "checkout-again" } }));
  const specs = starts.map((args) => argAfter(args, "--spec") ?? "");
  const full = scopeSpec("probe", "t", "o");
  const briefRequires = BRIEF_FIELDS.filter(([, label, key]) => specs.length > 0 && specs.every((spec) => spec.split("\n").some((line) => line.startsWith(`${label}: `)))
    && !ctx.libs.workerBrief({ ...full, [key]: "" }).ok).map(([name]) => name);
  const worktrees = starts.map((args) => argAfter(args, "--worktree"));
  const allLaunched = scopes.length > 0 && outcomes.every((outcome) => outcome.route === "launched");
  return {
    actual: {
      coordinator: allLaunched && self.route !== "launched" ? harness : "none",
      workerVendors: [...new Set(starts.map((args) => argAfter(args, "--agent") ?? ""))],
      isolatedWriters: allLaunched && starts.length === scopes.length && new Set(worktrees).size === scopes.length && !worktrees.includes(undefined)
        && again.route === "resume" && again.reason === "task-already-owned" && orca.calls.length === scopes.length,
      briefRequires,
    },
    notExecuted: {
      peerCommunication: "live-only: run-scoped inbox delivery needs a live Orca runtime",
      completion: "prose; integrated-tree validation is graded by completion-receipts-are-not-proof and prepared-input-and-integrated-evidence",
    },
    notes: [`routes ${short(outcomes.map((outcome) => outcome.route))}, self ${self.reason}, again ${again.reason}`],
  };
};

const UNVERIFIED: ReadonlyArray<{ mode: ProbeMode; present: boolean }> = Object.freeze([
  { mode: "verified", present: false }, { mode: "status-failed", present: true }, { mode: "runtime-unreachable", present: true },
  { mode: "version-drift", present: true }, { mode: "guide-missing", present: true },
]);
const observePreflightFallback: Observer = async (given, ctx) => {
  const input = obj(given.input);
  const harness = str(input.harness);
  // orcaSessionVerified:false is read as "the Orca runtime cannot be verified": absent, failing, unreachable, drifted or unsupported.
  const scenarios = input.orcaSessionVerified === false ? UNVERIFIED : [{ mode: "verified" as ProbeMode, present: true }];
  let launches = 0;
  let written = false;
  const routes: string[] = [];
  const reasons: string[] = [];
  for (const scenario of scenarios) {
    const root = fresh(ctx, "fallback");
    writePolicy(ctx, root, harness, VENDORS.filter((vendor) => vendor !== harness));
    const orca = fakeOrca(ctx.deps, ["ok"]);
    const out = await ctx.libs.dispatchScope(launch(ctx, { root, deps: orca.deps, coordinator: harness, vendor: VENDORS.find((vendor) => vendor !== harness) ?? "",
      scope: scopeSpec("scope-1", "fallback", "a.txt"), attemptId: "fb-1", mode: scenario.mode, present: scenario.present }));
    launches += orca.calls.length;
    written ||= metricsWritten(ctx, root);
    routes.push(out.route);
    reasons.push(out.reason);
  }
  // Documented gate deviation: an unverified caller alone does not stop a launch. Reported, not graded.
  const root = fresh(ctx, "fallback-caller");
  writePolicy(ctx, root, harness, VENDORS.filter((vendor) => vendor !== harness));
  const callerOnly = await ctx.libs.dispatchScope(launch(ctx, { root, deps: fakeOrca(ctx.deps, ["ok"]).deps, coordinator: harness,
    vendor: VENDORS.find((vendor) => vendor !== harness) ?? "", scope: scopeSpec("scope-1", "fallback", "a.txt"), attemptId: "fb-caller", mode: "caller-unverified" }));
  return {
    actual: {
      route: routes.every((route) => route === "normal") ? "normal workflow" : routes.join(","),
      orcaLaunches: launches,
      gatesPreserved: !written && routes.every((route) => route === "normal"),
      diagnosticRequired: reasons.every((reason) => reason.length > 0 && reason !== "launched") && new Set(reasons).size === reasons.length,
    },
    notes: [`reasons ${short(reasons)}`, `caller-unverified alone routes ${callerOnly.route} (documented gate deviation)`],
  };
};

const observeUncertainWorker: Observer = async (given, ctx) => {
  const input = obj(given.input);
  const harness = str(input.harness);
  const vendor = VENDORS.find((candidate) => candidate !== harness) ?? "";
  const preserving: Behaviour[] = [...(input.timeout === true ? ["timeout" as const] : []), "signal", "unproven"];
  let replacement = false;
  let stopped = false;
  const preserved: boolean[] = [];
  const routed: boolean[] = [];
  const notes: string[] = [];
  for (const behaviour of [...preserving, "residual" as const]) {
    const root = fresh(ctx, `uncertain-${behaviour}`);
    writePolicy(ctx, root, harness, VENDORS.filter((candidate) => candidate !== harness));
    const orca = fakeOrca(ctx.deps, [behaviour, "ok"]);
    const base = launch(ctx, { root, deps: orca.deps, coordinator: harness, vendor, scope: scopeSpec("scope-u", "uncertain", "a.txt"), attemptId: "unused" });
    const { attemptId: _unused, ...rest } = base;
    const loop = await ctx.libs.dispatchWithRetries({ ...rest, baseAttemptId: "u1", maxRetries: 2 });
    const loopSpawns = orca.calls.length;
    const isPreserving = behaviour !== "residual";
    // A fallback writer for the same task is what a coordinator would try next; it must not start while ownership is unknown.
    const fallback = isPreserving ? await ctx.libs.dispatchScope({ ...base, attemptId: "fallback" }) : undefined;
    replacement ||= loopSpawns > 1 || orca.calls.length > loopSpawns;
    stopped ||= orca.calls.some((args) => args[1] !== "worker-start");
    if (isPreserving) {
      preserved.push(stateOf(ctx, root, "attempt:u1") === "unknown-liveness");
      routed.push(loop.route === "resume" || loop.route === "blocked");
      routed.push(Boolean(loop.humanAction) && fallback?.reason === "task-already-owned");
    } else preserved.push(loop.route === "blocked" && Boolean(loop.humanAction));
    notes.push(`${behaviour}: ${loop.route}/${loop.reason} spawns ${orca.calls.length}`);
  }
  const verdict = ctx.libs.classifyLiveness({ projection: { liveness: { verdict: input.workerLiveness } } });
  preserved.push(verdict.action === "inspect-and-preserve");
  return {
    actual: {
      replacementWriter: replacement,
      automaticStop: stopped,
      preserveResources: allTrue(preserved),
      route: allTrue(routed) && !replacement ? "inspect ownership and checkpoint; no fallback editing until settled" : "fallback or duplicate editing possible",
    },
    notes,
  };
};

const observeWorkerPreamble: Observer = async (given, ctx) => {
  const input = obj(given.input);
  const harness = str(input.harness);
  const root = fresh(ctx, "preamble");
  writePolicy(ctx, root, harness, VENDORS.filter((vendor) => vendor !== harness));
  if (input.policyMode !== "auto") ctx.deps.fs.rmSync(ctx.deps.path.join(root, ".project", "orchestration.json"), { force: true });
  const scope = scopeSpec("scope-p", "nested", "a.txt");
  const brief = ctx.libs.workerBrief(scope);
  // The worker reads its own brief: those lines are its argv when it considers coordinating.
  const argv = input.activeDispatchPreamble === true && brief.ok ? brief.brief.split("\n") : [];
  const orca = fakeOrca(ctx.deps, ["ok"]);
  const out = await ctx.libs.dispatchScope(launch(ctx, { root, deps: orca.deps, coordinator: harness, vendor: VENDORS.find((vendor) => vendor !== harness) ?? "", scope, attemptId: "nested-1", argv }));
  const role = ctx.libs.preflightReport(root, harness, { workerContext: ctx.libs.isWorkerContext(argv, ctx.env) }, ctx.deps).role;
  return {
    actual: {
      role: role === "worker" ? "dispatched worker" : String(role),
      newCoordinatorRun: out.route === "launched" || metricsWritten(ctx, root),
      nestedLaunches: orca.calls.length,
    },
    notes: [`nested dispatch ${out.route}/${out.reason}`],
  };
};

type Facts = Record<string, boolean>;
type VariantRunner = (ctx: Ctx) => Promise<Facts>;

async function launchedAttempt(ctx: Ctx, label: string): Promise<{ root: string; attemptKey: string; dispatchId: string }> {
  const root = fresh(ctx, label);
  writePolicy(ctx, root, "claude", ["codex", "opencode"]);
  const out = await ctx.libs.dispatchScope(launch(ctx, { root, deps: fakeOrca(ctx.deps, ["ok"]).deps, coordinator: "claude", vendor: "codex", scope: scopeSpec("scope-c", "complete", "a.txt"), attemptId: "c1" }));
  return { root, attemptKey: out.attemptKey ?? "attempt:c1", dispatchId: out.dispatchId ?? "" };
}

const COMPLETION_VARIANTS: Readonly<Record<string, VariantRunner>> = Object.freeze({
  "launch accepted": async (ctx) => {
    const { root, attemptKey } = await launchedAttempt(ctx, "receipt-launch");
    const outcome = await ctx.libs.reconcile({ root, baseline: "0".repeat(40), attempts: [{ attemptKey, worktree: { path: ctx.deps.path.join(root, "wt"), baseline: "0".repeat(40), allowedRoots: [root] } }],
      checks: catalog(ctx), runChecks: ["ok"], env: ctx.env, deps: ctx.deps, deadlineMs: ctx.deps.clock.perfNowMs() + 60000 });
    return { rejectPrematureCompletion: stateOf(ctx, root, attemptKey) === "launched" && outcome.status !== "integrated" && outcome.attempts[attemptKey]?.state === "excluded" };
  },
  "terminal idle": async (ctx) => {
    const { root, attemptKey, dispatchId } = await launchedAttempt(ctx, "receipt-idle");
    const report = ctx.libs.collectReport({ root, attemptKey, message: workerDone("idle-1", dispatchId, ["a.txt"], "idle", "terminal_idle"), deps: ctx.deps });
    const idle = ctx.libs.classifyLiveness({ projection: { liveness: { verdict: "idle" } } });
    return { rejectPrematureCompletion: !report.accepted && stateOf(ctx, root, attemptKey) === "launched" && idle.action !== "reassign-allowed" };
  },
  "stale dispatch report": async (ctx) => {
    const { root, attemptKey } = await launchedAttempt(ctx, "receipt-stale");
    const report = ctx.libs.collectReport({ root, attemptKey, message: workerDone("stale-1", "grader_stale", ["a.txt"], "done"), deps: ctx.deps });
    const unchanged = !report.accepted && stateOf(ctx, root, attemptKey) === "launched";
    return { rejectPrematureCompletion: unchanged, verifyCurrentDispatch: unchanged && report.reason === "dispatch-mismatch" };
  },
  "duplicate completion": async (ctx) => {
    const { root, attemptKey, dispatchId } = await launchedAttempt(ctx, "receipt-duplicate");
    const first = ctx.libs.collectReport({ root, attemptKey, message: workerDone("done-1", dispatchId, ["a.txt"], "done"), deps: ctx.deps });
    const second = ctx.libs.collectReport({ root, attemptKey, message: workerDone("done-2", dispatchId, ["a.txt"], "done again"), deps: ctx.deps });
    const replay = ctx.libs.collectReport({ root, attemptKey, message: workerDone("done-1", dispatchId, ["a.txt"], "done"), deps: ctx.deps });
    return { rejectPrematureCompletion: first.accepted && !second.accepted, verifyCurrentDispatch: !second.accepted && replay.accepted && replay.replayed === true };
  },
  "passing check claim contradicted by execution": async (ctx) => {
    const fx = await repo(ctx);
    const attempt = await worker(ctx, fx, "liar", { "a.txt": "BAD\n" });
    const completed = await complete(ctx, fx, "liar", ["a.txt"], "all checks passed");
    const outcome = await ctx.libs.reconcile(reconcileOptions(ctx, fx, [attempt], ["nobad"]));
    const held = completed && outcome.status === "rolled-back" && stateOf(ctx, fx.root, attempt.attemptKey) === "completed"
      && readText(ctx, fx.root, "a.txt") === "a.txt baseline\n" && ctx.libs.verifyEvidence({ root: fx.root, attemptKey: attempt.attemptKey, deps: ctx.deps }).status !== "ok";
    return { rejectPrematureCompletion: held, independentChecksRequired: held };
  },
});

const RELEASED = Object.freeze({ released: true, state: "released", processAction: "none" });
const PREPARED_VARIANTS: Readonly<Record<string, VariantRunner>> = Object.freeze({
  "unrelated dirty coordinator changes": async (ctx) => {
    const fx = await repo(ctx);
    ctx.deps.fs.writeFileSync(ctx.deps.path.join(fx.root, "c.txt"), "user uncommitted edit\n");
    ctx.deps.fs.writeFileSync(ctx.deps.path.join(fx.root, "e.txt"), "user untracked file\n");
    const attempt = await worker(ctx, fx, "w1", { "a.txt": "WORKER-CHANGE\n" });
    const completed = await complete(ctx, fx, "w1", ["a.txt"]);
    const outcome = await ctx.libs.reconcile(reconcileOptions(ctx, fx, [{ ...attempt, claims: ["a.txt"] }], ["sees-change"]));
    const integrated = completed && outcome.status === "integrated" && readText(ctx, fx.root, "a.txt") === "WORKER-CHANGE\n";
    return {
      preserveUnrelatedEdits: integrated && readText(ctx, fx.root, "c.txt") === "user uncommitted edit\n" && readText(ctx, fx.root, "e.txt") === "user untracked file\n",
      // The same check fails on the baseline and passes after the apply: it ran against the integrated tree.
      checksBindIntegratedTree: integrated && outcome.baselineChecks?.[0]?.ok === false && outcome.checks?.[0]?.ok === true
        && ctx.libs.verifyEvidence({ root: fx.root, attemptKey: attempt.attemptKey, deps: ctx.deps }).status === "ok",
    };
  },
  "stale worker baseline": async (ctx) => {
    const fx = await repo(ctx);
    const attempt = await worker(ctx, fx, "w1", { "a.txt": "WORKER-CHANGE\n" });
    const completed = await complete(ctx, fx, "w1", ["a.txt"]);
    ctx.deps.fs.writeFileSync(ctx.deps.path.join(fx.root, "b.txt"), "coordinator moved on\n");
    await git(ctx, fx.root, ["commit", "-q", "-am", "move head"]);
    const outcome = await ctx.libs.reconcile(reconcileOptions(ctx, fx, [attempt], ["ok"]));
    return { rejectStaleInputs: completed && outcome.status === "refused" && outcome.reason === "apply:baseline-moved"
      && readText(ctx, fx.root, "a.txt") === "a.txt baseline\n" && stateOf(ctx, fx.root, attempt.attemptKey) === "completed" };
  },
  "overlapping worker changes": async (ctx) => {
    const fx = await repo(ctx);
    const one = await worker(ctx, fx, "w1", { "a.txt": "one\n" });
    const two = await worker(ctx, fx, "w2", { "a.txt": "two\n" });
    const completed = await complete(ctx, fx, "w1", ["a.txt"]) && await complete(ctx, fx, "w2", ["a.txt"]);
    const outcome = await ctx.libs.reconcile(reconcileOptions(ctx, fx, [one, two], ["ok"]));
    return { resolveOverlapExplicitly: completed && outcome.status === "refused" && /overlap/.test(outcome.reason) && readText(ctx, fx.root, "a.txt") === "a.txt baseline\n"
      && [one, two].every((attempt) => stateOf(ctx, fx.root, attempt.attemptKey) === "completed") };
  },
  "evidence stored in retired worktree": async (ctx) => {
    const fx = await repo(ctx);
    const attempt = await worker(ctx, fx, "w1", { "a.txt": "WORKER-CHANGE\n" });
    const completed = await complete(ctx, fx, "w1", ["a.txt"]);
    const outcome = await ctx.libs.reconcile(reconcileOptions(ctx, fx, [{ ...attempt, settlement: RELEASED }], ["ok"]));
    const evidence = ctx.libs.verifyEvidence({ root: fx.root, attemptKey: attempt.attemptKey, deps: ctx.deps });
    const outside = evidence.status === "ok" && !`${evidence.dir}/`.startsWith(`${attempt.worktree.path}/`);
    const again = await ctx.libs.reconcile(reconcileOptions(ctx, fx, [attempt], ["ok"]));
    return { retainEvidenceOutsideCleanup: completed && outcome.attempts[attempt.attemptKey]?.cleanup === "removed" && !ctx.deps.fs.existsSync(attempt.worktree.path)
      && outside && stateOf(ctx, fx.root, attempt.attemptKey) === "settled" && again.attempts[attempt.attemptKey]?.state === "already-reconciled" };
  },
});

/** Runs each listed variant; a fact is true only when every variant reporting it says so. Unknown variants fail the case. */
function variantObserver(runners: Readonly<Record<string, VariantRunner>>): Observer {
  return async (given, ctx) => {
    const variants = strings(given.variants);
    const facts: Record<string, boolean[]> = {};
    const notes: string[] = [];
    let unknown = false;
    for (const variant of variants) {
      const runner = Object.hasOwn(runners, variant) ? runners[variant] : undefined;
      if (!runner) { unknown = true; notes.push(`no executor for variant "${variant}"`); continue; }
      let result: Facts;
      try { result = await runner(ctx); } catch (error) { result = {}; notes.push(`${variant}: error ${error instanceof Error ? error.message.slice(0, 120) : "unknown"}`); unknown = true; }
      for (const [key, value] of Object.entries(result)) (facts[key] ??= []).push(value);
      const failed = Object.entries(result).filter(([, value]) => !value).map(([key]) => key);
      if (failed.length) notes.push(`${variant}: ${failed.join(",")} false`);
    }
    const actual: Json = Object.fromEntries(Object.entries(facts).map(([key, values]) => [key, !unknown && allTrue(values)]));
    if (variants.length === 0) notes.push("no variants");
    return { actual, notes };
  };
}

const observeHostileSummary: Observer = async (given, ctx) => {
  const summary = str(obj(given.input).summary);
  const flow = async (body: string) => {
    const root = fresh(ctx, "hostile");
    writePolicy(ctx, root, "claude", ["codex", "opencode"]);
    const orca = fakeOrca(ctx.deps, ["ok"]);
    const first = await ctx.libs.dispatchScope(launch(ctx, { root, deps: orca.deps, coordinator: "claude", vendor: "codex", scope: scopeSpec("scope-h1", "first", "src/a.txt"), attemptId: "h1" }));
    const report = ctx.libs.collectReport({ root, attemptKey: first.attemptKey ?? "attempt:h1", message: workerDone("msg-h1", first.dispatchId ?? "", ["src/a.txt"], body), deps: ctx.deps });
    const next = await ctx.libs.dispatchScope(launch(ctx, { root, deps: orca.deps, coordinator: "claude", vendor: "codex", scope: scopeSpec("scope-h2", "second", "src/b.txt"), attemptId: "h2" }));
    const read = createLedger(root, ctx.deps).read("attempt:h1");
    return { report, route: `${next.route}/${next.reason}`, agents: orca.calls.map((args) => argAfter(args, "--agent")).join(","),
      vendor: read.status === "ok" ? read.record.vendor : read.status, state: read.status === "ok" ? read.record.state : read.status };
  };
  const benign = await flow("done");
  const hostile = await flow(summary);
  const text = hostile.report.summary ?? "";
  return {
    actual: {
      routeUnchanged: hostile.route === benign.route && hostile.state === benign.state,
      vendorUnchanged: hostile.agents === benign.agents && hostile.vendor === benign.vendor,
      pathsUnchanged: JSON.stringify(hostile.report.filesModified) === JSON.stringify(benign.report.filesModified),
      approvalsUnchanged: hostile.report.accepted === benign.report.accepted && Object.keys(hostile.report).every((key) => REPORT_KEYS.includes(key))
        && text.length <= 500 && !CONTROL.test(text),
    },
    notes: [`summary quoted as ${text.length} chars of plain text`],
  };
};

const EXECUTES: Readonly<Record<string, Observer>> = Object.freeze({
  "codex-coordinates-alternate-vendors": observeAlternateVendors,
  "preflight-fallback": observePreflightFallback,
  "uncertain-worker-does-not-duplicate-editing": observeUncertainWorker,
  "worker-preamble-prevents-recursive-coordination": observeWorkerPreamble,
  "completion-receipts-are-not-proof": variantObserver(COMPLETION_VARIANTS),
  "prepared-input-and-integrated-evidence": variantObserver(PREPARED_VARIANTS),
  [HOSTILE_SUMMARY_CASE]: observeHostileSummary,
});

// ---- comparison and the report ----

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const left = Object.keys(a);
  const right = obj(b);
  return left.length === Object.keys(right).length && left.every((key) => Object.hasOwn(right, key) && deepEqual((a as Json)[key], right[key]));
}

/** Compares the dataset's expectation with what the libraries did. Every expected key is measured or explicitly not executed. */
function compare(expected: unknown, observation: Observation): { pass: boolean; detail: string } {
  const wanted = obj(expected);
  const keys = Object.keys(wanted);
  const mismatches: string[] = [];
  const skipped: string[] = [];
  let compared = 0;
  for (const key of keys) {
    if (observation.notExecuted && Object.hasOwn(observation.notExecuted, key)) { skipped.push(`${key} (${observation.notExecuted[key]})`); continue; }
    if (!Object.hasOwn(observation.actual, key)) { mismatches.push(`${key}: unchecked expectation`); continue; }
    compared++;
    if (!deepEqual(wanted[key], observation.actual[key])) mismatches.push(`${key}: expected ${short(wanted[key])}, observed ${short(observation.actual[key])}`);
  }
  const pass = compared > 0 && mismatches.length === 0;
  const parts = [pass ? `executed: ${compared} expectation(s) matched` : `executed: FAILED ${mismatches.join("; ") || "nothing compared"}`];
  if (skipped.length) parts.push(`not executed: ${skipped.join("; ")}`);
  if (observation.notes?.length) parts.push(`notes: ${observation.notes.join("; ")}`);
  return { pass, detail: parts.join(" | ") };
}

function parsesShape(record: Json): string | undefined {
  if (typeof record.id !== "string" || !record.id) return "id missing";
  if (!Object.keys(obj(record.expected)).length) return "expected missing or empty";
  const hasInput = Object.keys(obj(record.input)).length > 0;
  const hasVariants = strings(record.variants).length > 0 && strings(record.variants).length === (Array.isArray(record.variants) ? record.variants.length : -1);
  return hasInput || hasVariants ? undefined : "input or variants missing";
}

function emptySummary(): Summary {
  return { executes: { total: 0, passed: 0, failed: 0 }, parsesOnly: { total: 0, parsed: 0, failed: 0 }, liveOnly: { total: 0, notRun: 0 }, deferred: [], liveCompatibility: "unverified" };
}

function readDataset(deps: RuntimeDeps, root: string): Json[] | string {
  const { fs, path } = deps;
  try {
    // Walk every component with lstat (no links), then open with O_NOFOLLOW|O_NONBLOCK and compare dev/ino before a bounded read.
    let current = fs.realpathSync(root);
    let leaf = fs.lstatSync(current);
    for (const part of DATASET_FILE.split("/")) {
      current = path.join(current, part);
      leaf = fs.lstatSync(current);
      if (leaf.isSymbolicLink()) return "dataset refused";
    }
    if (!leaf.isFile() || leaf.size > MAX_DATASET_BYTES) return "dataset refused";
    const descriptor = fs.openSync(current, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
    let text: string;
    try {
      const opened = fs.fstatSync(descriptor);
      if (!opened.isFile() || opened.dev !== leaf.dev || opened.ino !== leaf.ino) return "dataset refused";
      const buffer = new Uint8Array(MAX_DATASET_BYTES + 1);
      let size = 0;
      while (size < buffer.length) {
        const count = fs.readSync(descriptor, buffer, size, buffer.length - size, null);
        if (!count) break;
        size += count;
      }
      if (size > MAX_DATASET_BYTES) return "dataset refused";
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, size));
    } finally { fs.closeSync(descriptor); }
    const cases = obj(JSON.parse(text)).cases;
    if (!Array.isArray(cases)) return "dataset has no cases array";
    return cases.map(obj);
  } catch { return "dataset missing or unparseable"; }
}

export async function gradeAll(options: GradeOptions): Promise<GradeReport> {
  const outer = options.deps;
  const root = options.root ?? outer.proc.cwd();
  const summary = emptySummary();
  const dataset = readDataset(outer, root);
  if (typeof dataset === "string") return { cases: [], summary: { ...summary, error: dataset } };
  // A controlled environment: no worker markers, no caller secrets, the switch on, a fixed session id.
  const env: Env = { PATH: outer.proc.env.PATH, HOME: outer.proc.env.HOME, ORCA_AGENT_SESSION_ID: SESSION, [SWITCH]: "true" };
  const deps: RuntimeDeps = { ...outer, proc: { ...outer.proc, env } };
  const tmp = deps.fs.realpathSync(deps.fs.mkdtempSync(deps.path.join(deps.os.tmpdir(), "orca-grader-")));
  const ctx: Ctx = { deps, env, gitEnv: { PATH: env.PATH, HOME: tmp, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: deps.path.join(tmp, "no-global-config"), GIT_TERMINAL_PROMPT: "0" },
    libs: { ...LIBRARIES, ...options.libs }, tmp, serial: { n: 0 } };
  const cases: CaseResult[] = [];
  try {
    for (const record of dataset) {
      const id = str(record.id);
      if (options.only && !options.only.includes(id)) continue;
      const shape = parsesShape(record);
      const observer = Object.hasOwn(EXECUTES, id) ? EXECUTES[id] : undefined;
      if (observer) {
        summary.executes.total++;
        let result: { pass: boolean; detail: string };
        if (shape) result = { pass: false, detail: `executed: FAILED case shape: ${shape}` };
        else {
          // The split happens before anything runs: the observer never receives `expected`.
          const { expected, ...rest } = record;
          const given: Given = Object.freeze(structuredClone({ input: rest.input, variants: rest.variants }));
          try { result = compare(expected, await observer(given, ctx)); }
          catch (error) { result = { pass: false, detail: `executed: FAILED error ${error instanceof Error ? error.message.slice(0, 200) : "unknown"}` }; }
        }
        if (result.pass) summary.executes.passed++; else summary.executes.failed++;
        cases.push({ id, mode: "executes", pass: result.pass, detail: result.detail });
      } else if (Object.hasOwn(LIVE_ONLY, id)) {
        summary.liveOnly.total++;
        summary.liveOnly.notRun++;
        const claimed = obj(record.expected).liveCompatibility;
        const drift = claimed !== undefined && claimed !== "unverified" ? `; the dataset claims liveCompatibility ${short(claimed)} but the grader reports unverified` : "";
        cases.push({ id, mode: "live-only", pass: false, detail: `not-run: ${LIVE_ONLY[id]}${drift}` });
      } else {
        summary.parsesOnly.total++;
        const known = Object.hasOwn(PARSES_ONLY, id) ? PARSES_ONLY[id] : undefined;
        const problem = shape ?? (known ? undefined : "no grader classifies this case id");
        if (problem) summary.parsesOnly.failed++; else summary.parsesOnly.parsed++;
        cases.push({ id, mode: "parses-only", pass: false, detail: problem ? `parse: FAILED ${problem}` : `parsed, not executed: ${known}` });
      }
    }
  } finally {
    try { deps.fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* temporary data only */ }
  }
  return { cases, summary };
}

let nodeDeps: RuntimeDeps | undefined;
const defaultDeps = (): RuntimeDeps => (nodeDeps ??= createNodeDeps());

/** `orca-eval-grader.mts [--root <dir>]`: one JSON report on stdout; exit 0 only when no executed case and no parse failed. */
export async function main(argv: string[], deps: RuntimeDeps = defaultDeps()): Promise<number> {
  let root: string | undefined;
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === "--root" && root === undefined && argv[index + 1] && !argv[index + 1].startsWith("--")) root = argv[++index];
    else { deps.io.stderr.write("orca-eval-grader: usage: orca-eval-grader.mts [--root <dir>]\n"); return 2; }
  }
  try {
    const report = await gradeAll({ deps, ...(root ? { root } : {}) });
    deps.io.stdout.write(`${JSON.stringify(report)}\n`);
    const { summary } = report;
    return summary.error || summary.executes.failed > 0 || summary.parsesOnly.failed > 0 ? 1 : 0;
  } catch (error) {
    deps.io.stderr.write(`orca-eval-grader: ${error instanceof Error ? error.message.slice(0, 200) : "internal failure"}\n`);
    return 1;
  }
}

runDirect(import.meta.url, main);
