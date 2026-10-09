import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";

import { attemptKeyOf, createLedger, taskKeyOf } from "./orca-ledger.mts";
import { WORKER_FLAG } from "./orca-launch-gate.mts";
import { report as policyReport, VENDORS } from "./orca-policy.mts";
import { classifyLiveness, collectReport, dispatchScope, dispatchWithRetries, markUnknownLiveness } from "./orca-dispatch.mts";
import { createNodeDeps } from "./runtime/node.mts";
import type { RunResult, RuntimeDeps, SpawnOptions } from "./runtime/types.mts";

const HERE = import.meta.dirname;
const EXAMPLE = path.resolve(HERE, "../integrations/orca-vendors.example.json");
const nodeDeps = createNodeDeps();
type Obj = Record<string, unknown>;

function fixture(t: TestContext, enabled = true): string {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "orca-dispatch-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".project"));
  const policy = JSON.parse(fs.readFileSync(EXAMPLE, "utf8")) as Obj;
  policy["use-orca-orchestration"] = enabled;
  fs.writeFileSync(path.join(root, ".project/orchestration.json"), JSON.stringify(policy));
  return root;
}
/** Probe runner that serves the three preflight receipts in order, for every evaluation. */
function probe() {
  const state = { calls: 0 };
  const run = () => {
    const values: Obj[] = [
      { name: "orca-cli", markdown: "worktree current; terminal" },
      { name: "orchestration", markdown: "worker-start; worker_done; orchestration check" },
      { ok: true, result: { target: { kind: "local" }, runtime: { reachable: true, state: "ready", appVersion: "1.4.223" } } },
    ];
    return { status: 0, signal: null, stdout: JSON.stringify(values[state.calls++ % 3]), stderr: "" };
  };
  return { state, run };
}

type Behaviour = "ok" | "ok-noid" | "agent_readiness" | "residual" | "timeout" | "overflow" | "plain-fail" | "signal" | "stderr-residual" | "unreadable" | "bare-object";
/** Stateful fake Orca: records every worker-start and answers from a script of behaviours. */
function fakeOrca(behaviours: Behaviour[] = ["ok"]) {
  const state = { starts: [] as Array<{ args: string[]; options: SpawnOptions }>, workers: 0 };
  const deps: RuntimeDeps = { ...nodeDeps, child: { ...nodeDeps.child, run: async (_command, args, options = {}): Promise<RunResult> => {
    state.starts.push({ args: [...args], options });
    const behaviour = behaviours[Math.min(state.starts.length - 1, behaviours.length - 1)];
    const base = { signal: null, stderr: "" };
    if (behaviour === "ok") { state.workers++; return { ...base, status: 0, stdout: JSON.stringify({ result: { stage: "input_accepted", dispatch: { id: `ctx_${state.workers}` } } }) }; }
    if (behaviour === "ok-noid") return { ...base, status: 0, stdout: "{}" };
    if (behaviour === "signal") return { ...base, status: null, signal: "SIGKILL", stdout: "" };
    if (behaviour === "stderr-residual") return { signal: null, status: 1, stdout: "warning: x\n", stderr: JSON.stringify({ failedStage: "setup", residualResources: [{ kind: "worktree" }] }) };
    if (behaviour === "unreadable") return { ...base, status: 1, stdout: "junk" };
    if (behaviour === "agent_readiness") return { ...base, status: 1, stdout: JSON.stringify({ result: { failedStage: "agent_readiness", residualResources: [{ kind: "terminal" }] } }) };
    if (behaviour === "residual") return { ...base, status: 1, stdout: JSON.stringify({ result: { failedStage: "setup", residualResources: [{ kind: "worktree" }] } }) };
    if (behaviour === "timeout") return { ...base, status: null, stdout: "", errorCode: "ETIMEDOUT" };
    if (behaviour === "overflow") return { ...base, status: null, stdout: "", errorCode: "ENOBUFS" };
    if (behaviour === "bare-object") return { ...base, status: 1, stdout: "{}" };
    return { ...base, status: 1, stdout: JSON.stringify({ result: { residualResources: [] } }) };
  } } };
  return { state, deps };
}
const scope = { id: "s1", target: "b.mjs", change: "return b-done", constraints: "edit only b.mjs", ownership: "b.mjs", acceptance: "node prints b-done" };
const base = (root: string, deps: RuntimeDeps, extra: Obj = {}) => ({
  root, coordinator: "claude", vendor: "codex", scope, attemptId: "a1", deadlineMs: 5000, deps, now: () => 1000,
  env: { PATH: "/usr/bin", ORCA_AGENT_SESSION_ID: "s1", AI_WORKFLOW_ORCA_MULTI_AGENT: "true" }, run: probe().run, platform: "darwin", present: () => true, ...extra,
});
const retryBase = (root: string, deps: RuntimeDeps, extra: Obj = {}) => {
  const { attemptId: _attemptId, ...rest } = base(root, deps, extra);
  return rest;
};
const ledgerOf = (root: string) => createLedger(root, nodeDeps);
const stateOf = (root: string, key: string): string | undefined => {
  const read = ledgerOf(root).read(key);
  return read.status === "ok" ? read.record.state : read.status;
};
const message = (id: string, dispatchId: string, extra: Obj = {}, payload: Obj = {}) => ({
  id, type: "worker_done", subject: "done", body: "ok",
  payload: JSON.stringify({ taskId: "t1", dispatchId, outcome: "succeeded", filesModified: ["b.mjs"], ...payload }), ...extra,
});
async function launched(t: TestContext) {
  const root = fixture(t);
  await dispatchScope(base(root, fakeOrca().deps));
  return { root, key: attemptKeyOf("a1") };
}

test("unsupported delegation uses the normal workflow with no ledger write and no spawn", async (t: TestContext) => {
  const root = fixture(t, false);
  const orca = fakeOrca();
  const outcome = await dispatchScope(base(root, orca.deps));
  assert.deepEqual([outcome.route, outcome.reason], ["normal", "policy-disabled"]);
  assert.equal(orca.state.starts.length, 0);
  assert.equal(fs.existsSync(path.join(root, ".project/metrics")), false);
});

test("a launch writes a claim first, carries the worker flag in the brief and records the dispatch id", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca();
  const outcome = await dispatchScope(base(root, orca.deps));
  assert.deepEqual([outcome.route, outcome.dispatchId], ["launched", "ctx_1"]);
  assert.equal(orca.state.starts.length, 1);
  const args = orca.state.starts[0].args;
  const spec = args[args.indexOf("--spec") + 1];
  assert.ok(args.includes("--spec") && spec.split("\n").includes(WORKER_FLAG) && !spec.startsWith("--"));
  assert.equal(args.at(-1), "--json");
  const read = ledgerOf(root).read(attemptKeyOf("a1"));
  assert.equal(read.status, "ok");
  if (read.status === "ok") assert.deepEqual([read.record.state, read.record.dispatchId, read.record.taskKey], ["launched", "ctx_1", taskKeyOf("s1")]);
});

test("a replayed attempt resumes by inspection and never launches a second worker", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca();
  await dispatchScope(base(root, orca.deps));
  const again = await dispatchScope(base(root, orca.deps));
  assert.deepEqual([again.route, again.reason, again.dispatchId], ["resume", "attempt-already-owned", "ctx_1"]);
  assert.equal(orca.state.starts.length, 1);
});

test("resuming under a now-disabled policy refuses with normal route and no spawn", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca();
  const first = await dispatchScope(base(root, orca.deps));
  assert.equal(first.route, "launched");
  assert.equal(orca.state.starts.length, 1);
  // Disable the policy between dispatches: the resume path must re-check before returning ownership.
  const policyPath = path.join(root, ".project/orchestration.json");
  const policy = JSON.parse(fs.readFileSync(policyPath, "utf8")) as Obj;
  policy["use-orca-orchestration"] = false;
  fs.writeFileSync(policyPath, JSON.stringify(policy));
  const again = await dispatchScope(base(root, orca.deps));
  assert.deepEqual([again.route, again.reason], ["normal", "policy-disabled"]);
  assert.equal(orca.state.starts.length, 1, "no second worker started");
});

test("resuming with the multi-agent switch turned off refuses before resume", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca();
  await dispatchScope(base(root, orca.deps));
  const again = await dispatchScope(base(root, orca.deps, { env: { PATH: "/usr/bin", ORCA_AGENT_SESSION_ID: "s1" } }));
  assert.deepEqual([again.route, again.reason], ["normal", "orca-multi-agent-disabled"]);
  assert.equal(orca.state.starts.length, 1);
});

test("the multi-agent switch is read from ai_workflow_env.json when env is silent", async (t: TestContext) => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "orca-dispatch-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".project"));
  const policy = JSON.parse(fs.readFileSync(EXAMPLE, "utf8")) as Obj;
  policy["use-orca-orchestration"] = true;
  fs.writeFileSync(path.join(root, ".project/orchestration.json"), JSON.stringify(policy));
  fs.writeFileSync(path.join(root, "ai_workflow_env.json"), JSON.stringify({ AI_WORKFLOW_ORCA_MULTI_AGENT: "true" }));
  const orca = fakeOrca();
  const silent: Obj = { PATH: "/usr/bin", ORCA_AGENT_SESSION_ID: "s1" };
  const outcome = await dispatchScope(base(root, orca.deps, { env: silent }));
  assert.equal(outcome.route, "launched", "file-source switch is honoured when env is silent");
  assert.equal(orca.state.starts.length, 1);
});

test("process environment wins over ai_workflow_env.json for the multi-agent switch", async (t: TestContext) => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "orca-dispatch-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".project"));
  const policy = JSON.parse(fs.readFileSync(EXAMPLE, "utf8")) as Obj;
  policy["use-orca-orchestration"] = true;
  fs.writeFileSync(path.join(root, ".project/orchestration.json"), JSON.stringify(policy));
  // File says off, env says on: process env wins.
  fs.writeFileSync(path.join(root, "ai_workflow_env.json"), JSON.stringify({ AI_WORKFLOW_ORCA_MULTI_AGENT: "false" }));
  const orca = fakeOrca();
  const outcome = await dispatchScope(base(root, orca.deps));
  assert.equal(outcome.route, "launched");
  assert.equal(orca.state.starts.length, 1);
});

test("a claim with no recorded launch (crash between claim and spawn) becomes unknown-liveness and is not relaunched", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca();
  const claimed = ledgerOf(root).claim({ attemptKey: attemptKeyOf("a1"), taskKey: taskKeyOf("s1"), vendor: "codex", state: "claimed", createdAt: 1790000000000 });
  assert.equal(claimed.outcome, "claimed");
  const outcome = await dispatchScope(base(root, orca.deps));
  assert.equal(outcome.route, "resume");
  assert.equal(orca.state.starts.length, 0);
  assert.equal(stateOf(root, attemptKeyOf("a1")), "unknown-liveness");
});

test("an agent_readiness failure needs a person: blocked, recorded failed, not retryable, no retry loop", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca(["agent_readiness"]);
  const outcome = await dispatchScope(base(root, orca.deps));
  assert.deepEqual([outcome.route, outcome.reason, outcome.retryable], ["blocked", "launch-failed:agent_readiness", undefined]);
  assert.ok(outcome.humanAction);
  assert.equal(stateOf(root, attemptKeyOf("a1")), "failed");
  const bounded = await dispatchWithRetries({ ...retryBase(root, orca.deps), baseAttemptId: "b1", maxRetries: 3 });
  assert.equal(bounded.route, "blocked");
  assert.equal(orca.state.starts.length, 2, "one start for the new base attempt only; no loop after a human-needed failure");
});

test("residual resources after a failed launch are reported and never retried", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca(["residual"]);
  const outcome = await dispatchScope(base(root, orca.deps));
  assert.deepEqual([outcome.route, outcome.reason], ["blocked", "launch-failed:setup"]);
  assert.equal(orca.state.starts.length, 1);
});

test("timeout and output overflow come from errorCode, preserve ownership as unknown-liveness and are not repeated", async (t: TestContext) => {
  for (const behaviour of ["timeout", "overflow"] as const) {
    const root = fixture(t);
    const orca = fakeOrca([behaviour]);
    const outcome = await dispatchScope(base(root, orca.deps));
    assert.equal(outcome.route, "resume", behaviour);
    assert.equal(outcome.reason, behaviour === "timeout" ? "launch-timeout" : "launch-output-limit");
    assert.equal(stateOf(root, attemptKeyOf("a1")), "unknown-liveness");
    assert.equal(orca.state.starts.length, 1);
  }
});

test("bounded retries: a clean launch failure repeats only up to maxRetries, each with a new attempt id", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca(["plain-fail"]);
  const ceiling = (policyReport(root, "claude", nodeDeps) as Obj).maxRetriesPerTask as number;
  assert.ok(ceiling >= 1);
  const outcome = await dispatchWithRetries({ ...retryBase(root, orca.deps), baseAttemptId: "r", maxRetries: 9 });
  assert.equal(orca.state.starts.length, ceiling + 1, "retries are capped by the policy ceiling, not by the caller");
  assert.match(outcome.reason, /retries-exhausted$/);
  assert.equal(ledgerOf(root).list().entries.length, ceiling + 1);
  const eventually = fakeOrca(["plain-fail", "ok"]);
  const second = await dispatchWithRetries({ ...retryBase(fixture(t), eventually.deps), baseAttemptId: "q", maxRetries: 3 });
  assert.equal(second.route, "launched");
  assert.equal(eventually.state.starts.length, 2);
});

test("an exhausted time budget stops the loop and a sub-millisecond remainder spawns nothing", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca(["plain-fail"]);
  const outcome = await dispatchWithRetries({ ...retryBase(root, orca.deps, { deadlineMs: 1000.5 }), baseAttemptId: "t", maxRetries: 3 });
  assert.equal(outcome.reason, "time-budget");
  assert.equal(orca.state.starts.length, 0);
});

test("every coordinator and worker pair: launched exactly when the policy configures that worker, otherwise the normal workflow", async (t: TestContext) => {
  for (const coordinator of VENDORS) for (const vendor of VENDORS) {
    const root = fixture(t);
    const orca = fakeOrca();
    const report = policyReport(root, coordinator, nodeDeps) as Obj;
    const expected = report.eligible === true && (report.workers as string[]).includes(vendor);
    const outcome = await dispatchScope(base(root, orca.deps, { coordinator, vendor }));
    assert.equal(outcome.route === "launched", expected, `${coordinator}->${vendor}`);
    assert.equal(orca.state.starts.length, expected ? 1 : 0, `${coordinator}->${vendor}`);
    if (!expected && report.eligible === true) assert.equal(outcome.reason, "worker-not-configured", `${coordinator}->${vendor}`);
  }
});

test("a worker context cannot dispatch: nothing is claimed or spawned", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca();
  const outcome = await dispatchScope(base(root, orca.deps, { workerContext: true }));
  assert.deepEqual([outcome.route, outcome.reason], ["normal", "worker-context"]);
  assert.equal(orca.state.starts.length, 0);
});

test("a symlinked ledger directory blocks the dispatch before any spawn and leaves the victim untouched", async (t: TestContext) => {
  const root = fixture(t);
  const victim = fs.mkdtempSync(path.join(os.tmpdir(), "orca-victim-"));
  t.after(() => fs.rmSync(victim, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".project/metrics"), { recursive: true });
  fs.symlinkSync(victim, path.join(root, ".project/metrics/orca-ledger"));
  const orca = fakeOrca();
  const outcome = await dispatchScope(base(root, orca.deps));
  assert.equal(outcome.route, "blocked");
  assert.equal(orca.state.starts.length, 0);
  assert.deepEqual(fs.readdirSync(victim), []);
});

test("only the attempt's own worker_done completes it; replays are idempotent; a different message for a completed attempt is refused", async (t: TestContext) => {
  const { root, key } = await launched(t);
  const first = collectReport({ root, attemptKey: key, message: message("msg_1", "ctx_1") });
  assert.deepEqual([first.accepted, first.state, first.filesModified], [true, "completed", ["b.mjs"]]);
  const replay = collectReport({ root, attemptKey: key, message: message("msg_1", "ctx_1") });
  assert.deepEqual([replay.accepted, replay.replayed], [true, true]);
  const other = collectReport({ root, attemptKey: key, message: message("msg_2", "ctx_1") });
  assert.deepEqual([other.accepted, other.reason], [false, "duplicate-report-different-message"]);
  const read = ledgerOf(root).read(key);
  assert.equal(read.status === "ok" && read.record.reportId, "msg_1");
});

test("a launch acknowledgement, event or unknown message type never completes an attempt", async (t: TestContext) => {
  const { root, key } = await launched(t);
  for (const type of ["worker_started", "heartbeat", "input_accepted", "question", "escalation", undefined, 7]) {
    const result = collectReport({ root, attemptKey: key, message: message("msg_x", "ctx_1", { type }) });
    assert.deepEqual([result.accepted, result.reason], [false, "not-a-completion"], String(type));
  }
  assert.equal(stateOf(root, key), "launched");
});

test("a completion for another dispatch is refused (attempt-specific completion)", async (t: TestContext) => {
  const { root, key } = await launched(t);
  assert.equal(collectReport({ root, attemptKey: key, message: message("msg_1", "ctx_999") }).reason, "dispatch-mismatch");
  assert.equal(stateOf(root, key), "launched");
});

test("hostile mail is parsed against a grammar: bad ids, payloads, outcomes and file paths are refused", async (t: TestContext) => {
  const { root, key } = await launched(t);
  const cases: Array<[Obj, string]> = [
    [message("../x", "ctx_1"), "invalid-message-id"],
    [{ ...message("m1", "ctx_1"), payload: "not json" }, "invalid-payload"],
    [{ ...message("m1", "ctx_1"), payload: "[1]" }, "invalid-payload"],
    [message("m1", "ctx_1", {}, { outcome: "success" }), "invalid-outcome"],
    [message("m1", "ctx_1", {}, { dispatchId: "x y" }), "invalid-payload"],
    [message("m1", "ctx_1", {}, { filesModified: ["../../etc/passwd"] }), "invalid-files"],
    [message("m1", "ctx_1", {}, { filesModified: ["/abs"] }), "invalid-files"],
    [message("m1", "ctx_1", {}, { filesModified: ["a\u001b[31m"] }), "invalid-files"],
  ];
  for (const [input, reason] of cases) assert.equal(collectReport({ root, attemptKey: key, message: input }).reason, reason);
  assert.equal(stateOf(root, key), "launched");
});

test("report text is sanitised and a 64 KB hostile body is handled in linear time", async (t: TestContext) => {
  const { root, key } = await launched(t);
  const body = "\u001b[2J\u0007" + " ".repeat(60000) + "a".repeat(5000) + "\u0000";
  const started = performance.now();
  const result = collectReport({ root, attemptKey: key, message: message("msg_1", "ctx_1", { body }) });
  assert.ok(performance.now() - started < 500);
  assert.equal(result.accepted, true);
  assert.ok((result.summary ?? "").length <= 500);
  assert.equal(/[\u0000-\u001f\u007f]/.test(result.summary ?? ""), false);
});

test("a failed worker_done records failed without a reportId, and replays", async (t: TestContext) => {
  const { root, key } = await launched(t);
  const result = collectReport({ root, attemptKey: key, message: message("msg_f", "ctx_1", {}, { outcome: "failed" }) });
  assert.deepEqual([result.accepted, result.state], [true, "failed"]);
  assert.equal(collectReport({ root, attemptKey: key, message: message("msg_f", "ctx_1", {}, { outcome: "failed" }) }).replayed, true);
  const read = ledgerOf(root).read(key);
  assert.equal(read.status === "ok" && read.record.reportId, undefined);
});

test("liveness: only exited-and-settled allows reassignment; anything unproven preserves ownership", () => {
  const row = (verdict: unknown, dispatch: unknown) => ({ projection: { liveness: { verdict }, stage: { dispatch } } });
  assert.equal(classifyLiveness(row("live", "dispatched")).action, "keep");
  assert.equal(classifyLiveness(row("exited", "failed")).action, "reassign-allowed");
  assert.equal(classifyLiveness(row("exited", "completed")).action, "reassign-allowed");
  assert.equal(classifyLiveness(row("exited", "dispatched")).action, "inspect-and-preserve");
  assert.equal(classifyLiveness(row("unverifiable", "failed")).action, "inspect-and-preserve");
  assert.equal(classifyLiveness(undefined).action, "inspect-and-preserve");
  assert.equal(classifyLiveness({}).reason, "no-evidence");
});

test("a runtime version change after launch marks launched attempts unknown-liveness and nothing else", async (t: TestContext) => {
  const { root, key } = await launched(t);
  const done = attemptKeyOf("done");
  const ledger = ledgerOf(root);
  ledger.claim({ attemptKey: done, taskKey: taskKeyOf("s2"), vendor: "codex", state: "claimed", createdAt: 1790000000000 });
  ledger.update(done, { state: "launched", dispatchId: "ctx_2" });
  ledger.update(done, { state: "completed", reportId: "msg_9" });
  const marked = markUnknownLiveness({ root, attemptKeys: [key, done, attemptKeyOf("missing")] });
  assert.deepEqual(marked, [key]);
  assert.equal(stateOf(root, done), "completed");
  assert.equal(stateOf(root, key), "unknown-liveness");
});

test("the coordinator cannot be launched as its own worker (policy authority is per pair)", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca();
  const outcome = await dispatchScope(base(root, orca.deps, { coordinator: "claude", vendor: "claude" }));
  assert.deepEqual([outcome.route, outcome.reason], ["normal", "worker-not-configured"]);
  assert.equal(orca.state.starts.length, 0);
});

test("placement is a typed allow-list: known flags pass, free text and extra flags are refused before any claim", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca();
  const ok = await dispatchScope(base(root, orca.deps, { placement: { worktree: "new-top-level", repo: "id:abc", name: "smoke-b" } }));
  assert.equal(ok.route, "launched");
  const args = orca.state.starts[0].args;
  assert.deepEqual(args.slice(-7), ["--worktree", "new-top-level", "--repo", "id:abc", "--name", "smoke-b", "--json"]);
  assert.equal(args.filter((arg) => arg === "--agent").length, 1);
  for (const placement of [{ agent: "claude" }, { spec: "x" }, { worktree: "--agent" }, { worktree: "a b" }, { name: "x\ny" }, { repo: 5 }]) {
    const other = fakeOrca();
    const refused = await dispatchScope(base(fixture(t), other.deps, { placement }));
    assert.deepEqual([refused.route, refused.reason], ["normal", "invalid-placement"], JSON.stringify(placement));
    assert.equal(other.state.starts.length, 0);
  }
});

test("a launcher other than the probed executable is refused with no claim and no spawn", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca();
  const outcome = await dispatchScope(base(root, orca.deps, { launcher: "/tmp/evil/argv.sh" }));
  assert.deepEqual([outcome.route, outcome.reason], ["normal", "launcher-refused"]);
  assert.equal(orca.state.starts.length, 0);
  assert.equal(fs.existsSync(path.join(root, ".project/metrics")), false);
});

test("an expired deadline is refused before the claim, so the attempt id is not burned", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca();
  const late = await dispatchScope(base(root, orca.deps, { deadlineMs: 1000.5 }));
  assert.deepEqual([late.route, late.reason], ["normal", "time-budget"]);
  assert.equal(ledgerOf(root).read(attemptKeyOf("a1")).status, "missing");
  assert.equal((await dispatchScope(base(root, orca.deps))).route, "launched");
});

test("one live attempt per task: a second attempt id for the same scope is refused while the first is owned", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca();
  assert.equal((await dispatchScope(base(root, orca.deps))).route, "launched");
  const second = await dispatchScope(base(root, orca.deps, { attemptId: "a2" }));
  assert.deepEqual([second.route, second.reason], ["resume", "task-already-owned"]);
  assert.equal(orca.state.starts.length, 1);
  assert.equal(ledgerOf(root).read(attemptKeyOf("a2")).status, "missing");
});

test("a failed attempt does not own its task, so a new attempt may launch", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca(["plain-fail", "ok"]);
  assert.equal((await dispatchScope(base(root, orca.deps))).retryable, true);
  assert.equal((await dispatchScope(base(root, orca.deps, { attemptId: "a2" }))).route, "launched");
});

test("a signal exit, an unreadable receipt and a receipt on stderr never lead to a retry", async (t: TestContext) => {
  const cases: Array<[Behaviour, string, string]> = [
    ["signal", "resume", "launch-failed"],
    ["unreadable", "blocked", "launch-failed:unproven"],
    ["stderr-residual", "blocked", "launch-failed:setup"],
  ];
  for (const [behaviour, route, reason] of cases) {
    const root = fixture(t);
    const orca = fakeOrca([behaviour]);
    const outcome = await dispatchWithRetries({ ...retryBase(root, orca.deps), baseAttemptId: "x", maxRetries: 2 });
    assert.deepEqual([outcome.route, outcome.reason, outcome.retryable], [route, reason, undefined], behaviour);
    assert.equal(orca.state.starts.length, 1, behaviour);
  }
});

test("a launch whose receipt has no dispatch id keeps ownership as unknown-liveness and tells a person", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca(["ok-noid"]);
  const outcome = await dispatchScope(base(root, orca.deps));
  assert.deepEqual([outcome.route, outcome.reason], ["resume", "launched-without-dispatch-id"]);
  assert.ok(outcome.humanAction);
  assert.equal(stateOf(root, attemptKeyOf("a1")), "unknown-liveness");
});

test("a refused or corrupt ledger slot blocks before any spawn; a conflicting claim never launches", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca();
  const dir = path.join(root, ".project/metrics/orca-ledger");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "attempt-a1.json"), "{not json");
  const corrupt = await dispatchScope(base(root, orca.deps));
  assert.deepEqual([corrupt.route, corrupt.reason], ["blocked", "ledger-corrupt"]);
  assert.equal(orca.state.starts.length, 0);
  assert.equal(fs.readFileSync(path.join(dir, "attempt-a1.json"), "utf8"), "{not json", "a corrupt slot is never overwritten");
});

test("retry parameters are bounded: NaN, negative and oversize values, and a base id that cannot take a suffix", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca(["plain-fail"]);
  for (const maxRetries of [Number.NaN, -3]) {
    const out = await dispatchWithRetries({ ...retryBase(fixture(t), orca.deps), baseAttemptId: "n", maxRetries });
    assert.equal(out.route, "blocked");
  }
  assert.equal(orca.state.starts.length, 2, "one start each, no retries");
  const long = await dispatchWithRetries({ ...retryBase(root, orca.deps), baseAttemptId: "x".repeat(61), maxRetries: 1 });
  assert.deepEqual([long.route, long.reason], ["normal", "invalid-id"]);
});

test("completion is refused when the reported outcome contradicts the recorded state; settled attempts take no new reports", async (t: TestContext) => {
  const { root, key } = await launched(t);
  assert.equal(collectReport({ root, attemptKey: key, message: message("msg_f", "ctx_1", {}, { outcome: "failed" }) }).accepted, true);
  assert.equal(collectReport({ root, attemptKey: key, message: message("msg_s", "ctx_1") }).reason, "outcome-conflict");
  assert.equal(ledgerOf(root).update(key, { state: "settled" }).status, "ok");
  const late = collectReport({ root, attemptKey: key, message: message("msg_s", "ctx_1", {}, { filesModified: ["x.mjs"] }) });
  assert.deepEqual([late.accepted, late.reason], [false, "already-settled"]);
  const replay = collectReport({ root, attemptKey: key, message: message("msg_f", "ctx_1", {}, { outcome: "failed" }) });
  assert.equal(replay.accepted, false, "a settled attempt accepts no report at all");
});

test("a failed-state replay confirms the state but returns none of the new message's data", async (t: TestContext) => {
  const { root, key } = await launched(t);
  collectReport({ root, attemptKey: key, message: message("msg_f", "ctx_1", {}, { outcome: "failed" }) });
  const replay = collectReport({ root, attemptKey: key, message: message("msg_other", "ctx_1", { body: "forged" }, { outcome: "failed", filesModified: ["a.mjs"] }) });
  assert.deepEqual([replay.accepted, replay.replayed, replay.summary, replay.filesModified], [true, true, undefined, undefined]);
});

test("file lists naming .git or .project paths are refused", async (t: TestContext) => {
  const { root, key } = await launched(t);
  for (const file of [".git/hooks/pre-commit", "a/.project/x", ".project/status.md"]) {
    assert.equal(collectReport({ root, attemptKey: key, message: message("m1", "ctx_1", {}, { filesModified: [file] }) }).reason, "invalid-files", file);
  }
});

test("an unreadable or unproven failure keeps the task owned: a second attempt id is refused until a person inspects", async (t: TestContext) => {
  for (const behaviour of ["unreadable", "bare-object"] as const) {
    const root = fixture(t);
    const orca = fakeOrca([behaviour, "ok"]);
    const first = await dispatchScope(base(root, orca.deps));
    assert.deepEqual([first.route, first.reason, first.retryable], ["blocked", "launch-failed:unproven", undefined], behaviour);
    assert.equal(stateOf(root, attemptKeyOf("a1")), "unknown-liveness");
    const second = await dispatchScope(base(root, orca.deps, { attemptId: "a2" }));
    assert.deepEqual([second.route, second.reason], ["resume", "task-already-owned"], behaviour);
    assert.equal(orca.state.starts.length, 1, behaviour);
  }
});

test("a non-list residualResources is not proof of a clean failure", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca();
  orca.deps.child.run = async () => ({ status: 1, signal: null, stdout: JSON.stringify({ result: { residualResources: "none" } }), stderr: "" });
  const outcome = await dispatchScope(base(root, orca.deps));
  assert.equal(outcome.retryable, undefined);
  assert.equal(stateOf(root, attemptKeyOf("a1")), "unknown-liveness");
});

test("a settled completed attempt accepts only a replay of its own completion report", async (t: TestContext) => {
  const { root, key } = await launched(t);
  assert.equal(collectReport({ root, attemptKey: key, message: message("msg_1", "ctx_1") }).accepted, true);
  assert.equal(ledgerOf(root).update(key, { state: "settled" }).status, "ok");
  const same = collectReport({ root, attemptKey: key, message: message("msg_1", "ctx_1") });
  assert.deepEqual([same.accepted, same.replayed], [true, true]);
  assert.equal(collectReport({ root, attemptKey: key, message: message("msg_2", "ctx_1") }).reason, "already-settled");
});

test("maxConcurrentWorkers from the policy caps running attempts across different scopes", async (t: TestContext) => {
  const root = fixture(t);
  const cap = (policyReport(root, "claude", nodeDeps) as Obj).maxConcurrentWorkers as number;
  assert.ok(cap >= 1 && cap <= 3);
  const orca = fakeOrca();
  for (let index = 0; index < cap; index++) {
    const out = await dispatchScope(base(root, orca.deps, { attemptId: `c${index}`, scope: { ...scope, id: `scope${index}` } }));
    assert.equal(out.route, "launched", `attempt ${index}`);
  }
  const over = await dispatchScope(base(root, orca.deps, { attemptId: "cx", scope: { ...scope, id: "scopex" } }));
  assert.deepEqual([over.route, over.reason], ["normal", "max-concurrent-workers"]);
  assert.equal(orca.state.starts.length, cap);
  assert.equal(ledgerOf(root).read(attemptKeyOf("cx")).status, "missing");
});

test("prototype keys are not placement flags; an unknown coordinator stays on the normal workflow", async (t: TestContext) => {
  const root = fixture(t);
  const orca = fakeOrca();
  for (const key of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
    const placement = JSON.parse(`{"${key}":"x"}`) as Obj;
    const out = await dispatchScope(base(root, orca.deps, { placement }));
    assert.deepEqual([out.route, out.reason], ["normal", "invalid-placement"], key);
  }
  assert.equal(orca.state.starts.length, 0);
  assert.equal(fs.existsSync(path.join(root, ".project/metrics")), false);
  const bogus = await dispatchWithRetries({ ...retryBase(root, orca.deps, { coordinator: "bogus" }), baseAttemptId: "z", maxRetries: 1 });
  assert.deepEqual([bogus.route, bogus.reason], ["normal", "invalid-vendor"]);
});

test("invisible and bidi characters (ALM, BOM, soft hyphen, word joiner) are stripped from report text", async (t: TestContext) => {
  const { root, key } = await launched(t);
  const body = "a\u061cb\ufeffc\u00add\u2060e\u202ef";
  const result = collectReport({ root, attemptKey: key, message: message("msg_1", "ctx_1", { body }) });
  assert.equal(result.summary, "a b c d e f");
});

test("without the multi-agent switch dispatch uses the normal workflow: no claim, no spawn, no policy read", async (t: TestContext) => {
  for (const value of [undefined, "false", "1"]) {
    const root = fixture(t);
    const orca = fakeOrca();
    const env = { PATH: "/usr/bin", ORCA_AGENT_SESSION_ID: "s1", AI_WORKFLOW_ORCA_MULTI_AGENT: value };
    const one = await dispatchScope(base(root, orca.deps, { env }));
    assert.deepEqual([one.route, one.reason], ["normal", "orca-multi-agent-disabled"], String(value));
    const many = await dispatchWithRetries({ ...retryBase(root, orca.deps, { env }), baseAttemptId: "x", maxRetries: 2 });
    assert.deepEqual([many.route, many.reason], ["normal", "orca-multi-agent-disabled"], String(value));
    assert.equal(orca.state.starts.length, 0);
    assert.equal(fs.existsSync(path.join(root, ".project/metrics")), false);
  }
});
