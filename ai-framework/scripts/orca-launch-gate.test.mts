import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";

import { createNodeDeps } from "./runtime/node.mts";
import type { RunResult, RuntimeDeps, SpawnOptions } from "./runtime/types.mts";

// ORCA_GATE_UNDER_TEST lets a mutant copy of the gate be exercised by the same assertions (mutant proofs).
const gate = await import(process.env.ORCA_GATE_UNDER_TEST ?? "./orca-launch-gate.mts") as typeof import("./orca-launch-gate.mts");
const { WORKER_ENV_MARKERS, WORKER_FLAG, buildWorkerEnv, evaluateLaunch, isWorkerContext, launchWorker, workerBrief } = gate;

const HERE = import.meta.dirname;
const EXAMPLE = path.resolve(HERE, "../integrations/orca-vendors.example.json");
const nodeDeps = createNodeDeps();

type Obj = Record<string, unknown>;
function fixture(t: TestContext, enabled = true): string {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "orca-gate-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".project"));
  setPolicy(root, enabled);
  return root;
}
function setPolicy(root: string, enabled: boolean): void {
  const policy = JSON.parse(fs.readFileSync(EXAMPLE, "utf8")) as Obj;
  policy["use-orca-orchestration"] = enabled;
  fs.writeFileSync(path.join(root, ".project/orchestration.json"), JSON.stringify(policy));
}
function receipts(version = "1.4.223", caller = true): Obj[] {
  return [
    { name: "orca-cli", markdown: "worktree current; terminal" },
    { name: "orchestration", markdown: "worker-start; worker_done; orchestration check" },
    { ok: true, result: { target: { kind: "local" }, runtime: { reachable: true, state: "ready", appVersion: version },
      ...(caller ? { caller: { live: true, orcaSessionId: "s1" } } : {}) } },
  ];
}
/** Probe runner that serves 3 receipts per evaluation and counts every call. */
function prober(version: () => string = () => "1.4.223", caller = true) {
  const state = { calls: 0 };
  const run = () => {
    const values = receipts(version(), caller);
    const value = values[state.calls % 3];
    state.calls++;
    return { status: 0, signal: null, stdout: JSON.stringify(value), stderr: "" };
  };
  return { state, run };
}
const SAFE_ENV = { ORCA_AGENT_SESSION_ID: "s1", PATH: "/usr/bin", AI_WORKFLOW_ORCA_MULTI_AGENT: "true" };
const common = { vendor: "codex", platform: "darwin", present: () => true, deps: nodeDeps, now: () => 1000 };
const refused = (name: string) => () => { throw new Error(`${name} must not be touched`); };

test("allows a launch only on eligible policy plus a fresh probe of the supported version", (t: TestContext) => {
  const root = fixture(t);
  const p = prober();
  const decision = evaluateLaunch({ ...common, root, env: SAFE_ENV, run: p.run });
  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, "launch-allowed");
  assert.equal(p.state.calls, 3);
});

test("does not require caller.orcaSessionId for an external coordinator outside an Orca terminal", (t: TestContext) => {
  const root = fixture(t);
  const p = prober(() => "1.4.223", false);
  const decision = evaluateLaunch({ ...common, root, env: { PATH: "/usr/bin", AI_WORKFLOW_ORCA_MULTI_AGENT: "true" }, run: p.run });
  assert.equal(decision.allowed, true);
});

test("re-reads policy and re-probes on every call: a flip between two calls refuses the second", (t: TestContext) => {
  const root = fixture(t);
  const p = prober();
  assert.equal(evaluateLaunch({ ...common, root, env: SAFE_ENV, run: p.run }).allowed, true);
  assert.equal(p.state.calls, 3);
  setPolicy(root, false);
  const second = evaluateLaunch({ ...common, root, env: SAFE_ENV, run: p.run });
  assert.equal(second.allowed, false);
  assert.equal(second.reason, "policy-disabled");
  setPolicy(root, true);
  assert.equal(evaluateLaunch({ ...common, root, env: SAFE_ENV, run: p.run }).allowed, true);
  assert.equal(p.state.calls, 6, "each allowed call re-probes (3 calls) and the refused call never probed");
});

test("version drift between two calls refuses the second and the probe really ran again", (t: TestContext) => {
  const root = fixture(t);
  let version = "1.4.223";
  const p = prober(() => version);
  assert.equal(evaluateLaunch({ ...common, root, env: SAFE_ENV, run: p.run }).allowed, true);
  version = "1.5.0";
  const second = evaluateLaunch({ ...common, root, env: SAFE_ENV, run: p.run });
  assert.equal(second.allowed, false);
  assert.equal(second.reason, "runtime-version-unsupported");
  assert.equal(p.state.calls, 6);
  version = "1.4.223";
  assert.equal(evaluateLaunch({ ...common, root, env: SAFE_ENV, run: p.run }).allowed, true);
});

test("version drift also refuses an external coordinator that has no caller block", (t: TestContext) => {
  const root = fixture(t);
  const p = prober(() => "9.9.9", false);
  assert.equal(evaluateLaunch({ ...common, root, env: { PATH: "/usr/bin", AI_WORKFLOW_ORCA_MULTI_AGENT: "true" }, run: p.run }).allowed, false);
});

test("a disabled policy is refused without touching the runner, presence check or platform", (t: TestContext) => {
  const root = fixture(t, false);
  const decision = evaluateLaunch({ root, vendor: "codex", deps: nodeDeps, env: SAFE_ENV, run: refused("run"), present: refused("present") });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "policy-disabled");
});

test("the --worker-context flag denies before anything is read or probed", (t: TestContext) => {
  const root = fixture(t);
  const env = { AI_WORKFLOW_ORCA_MULTI_AGENT: "true", get ORCA_WORKER_CONTEXT(): string { throw new Error("env marker must not be read"); } };
  const decision = evaluateLaunch({ root, vendor: "codex", deps: nodeDeps, env, argv: ["x", WORKER_FLAG], run: refused("run"), present: refused("present") });
  assert.deepEqual([decision.allowed, decision.reason], [false, "worker-context"]);
  assert.equal(evaluateLaunch({ root, vendor: "codex", deps: nodeDeps, env: { AI_WORKFLOW_ORCA_MULTI_AGENT: "true" }, workerContext: true, run: refused("run"), present: refused("present") }).reason, "worker-context");
  assert.equal(isWorkerContext([WORKER_FLAG], {}), true);
});

test("every worker env marker denies even without the flag (adversarial worker)", (t: TestContext) => {
  const root = fixture(t);
  assert.ok(WORKER_ENV_MARKERS.length >= 1 && WORKER_ENV_MARKERS.length <= 4);
  for (const marker of WORKER_ENV_MARKERS) {
    const env = { ...SAFE_ENV, [marker]: "1" };
    assert.equal(isWorkerContext([], env), true, marker);
    const decision = evaluateLaunch({ root, vendor: "codex", deps: nodeDeps, env, argv: [], run: refused("run"), present: refused("present") });
    assert.deepEqual([decision.allowed, decision.reason], [false, "worker-context"], marker);
  }
  assert.equal(isWorkerContext([], SAFE_ENV), false);
  assert.equal(isWorkerContext([], { ORCA_WORKER_CONTEXT: "" }), false);
});

test("worker env keeps only allowlisted keys and drops secrets and worker markers", () => {
  const env = buildWorkerEnv({ PATH: "/usr/bin", HOME: "/home/u", LANG: "C", TERM: "xterm", TMPDIR: "/tmp", ORCA_TERMINAL_HANDLE: "h", ORCA_AGENT_SESSION_ID: "s1",
    GITHUB_TOKEN: "x", OPENAI_API_KEY: "y", AWS_SECRET_ACCESS_KEY: "z", ORCA_WORKER_CONTEXT: "1", ORCA_CLI_COMMAND: "/evil", NODE_OPTIONS: "--require x", EMPTY: undefined }, nodeDeps);
  assert.deepEqual(Object.keys(env).sort(), ["HOME", "LANG", "ORCA_AGENT_SESSION_ID", "ORCA_TERMINAL_HANDLE", "PATH", "TERM", "TMPDIR"]);
  assert.deepEqual(Object.keys(buildWorkerEnv({ TOKEN: "a", MY_KEY: "b", PASSWORD: "c" }, nodeDeps)), []);
});

test("worker PATH keeps absolute entries only; relative, dot and empty entries are removed", () => {
  const d = path.delimiter;
  assert.equal(buildWorkerEnv({ PATH: ["", ".", "rel", "..", "./bin", "/usr/bin", "/opt/x"].join(d) }, nodeDeps).PATH, `/usr/bin${d}/opt/x`);
  assert.equal("PATH" in buildWorkerEnv({ PATH: ["", ".", "rel"].join(d) }, nodeDeps), false);
});

function childDeps(onRun: (command: string, args: string[], options: SpawnOptions) => RunResult | Promise<RunResult>): RuntimeDeps {
  return { ...nodeDeps, child: { ...nodeDeps.child, run: async (command, args, options = {}) => onRun(command, args, options) } };
}
const ok: RunResult = { status: 0, signal: null, stdout: "{}", stderr: "" };

test("launchWorker passes an allowlisted env and a floored timeout, and re-probes every call", async (t: TestContext) => {
  const root = fixture(t);
  let version = "1.4.223";
  const p = prober(() => version);
  const seen: SpawnOptions[] = [];
  const deps = childDeps((_c, _a, options) => { seen.push(options); return ok; });
  const request = { ...common, deps, root, env: { ...SAFE_ENV, GITHUB_TOKEN: "secret", ORCA_WORKER_CONTEXT: "", ORCA_CLI_COMMAND: "/Applications/Orca.app/Contents/Resources/bin/orca" }, run: p.run,
    command: "/Applications/Orca.app/Contents/Resources/bin/orca", args: ["worker-start"], now: () => 1000.5, deadlineMs: 1003.9 };
  const first = await launchWorker(request);
  assert.equal(first.launched, true);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].timeoutMs, 3);
  assert.equal(seen[0].env?.GITHUB_TOKEN, undefined);
  assert.equal(seen[0].env?.PATH, "/usr/bin");
  version = "2.0.0";
  const second = await launchWorker(request);
  assert.deepEqual([second.launched, second.reason], [false, "runtime-version-unsupported"]);
  assert.equal(seen.length, 1, "no child spawned after version drift");
});

test("a remaining budget under 1 ms is refused before spawning, including fractional values", async (t: TestContext) => {
  const root = fixture(t);
  const deps = childDeps(refused("child.run"));
  for (const [clock, deadline] of [[100.5, 101.2], [100, 100.9999], [100, 100], [100, 90], [100, Number.NaN]]) {
    const result = await launchWorker({ ...common, deps, root, env: SAFE_ENV, run: prober().run, command: "orca", args: [], now: () => clock, deadlineMs: deadline });
    assert.deepEqual([result.launched, result.reason], [false, "time-budget"], `${clock}->${deadline}`);
  }
  const seen: SpawnOptions[] = [];
  const live = childDeps((_c, _a, o) => { seen.push(o); return ok; });
  const result = await launchWorker({ ...common, deps: live, root, env: SAFE_ENV, run: prober().run, command: "orca", args: [], now: () => 100, deadlineMs: 101.5 });
  assert.equal(result.launched, true);
  assert.equal(seen[0].timeoutMs, 1, "1.5 ms floors to 1, never 0");
});

test("only errorCode signals timeout or overflow; a killed child without a code is a plain failure", async (t: TestContext) => {
  const root = fixture(t);
  const base = { ...common, root, env: SAFE_ENV, command: "orca", args: [], now: () => 100, deadlineMs: 5000 };
  const outcome = async (result: RunResult) => (await launchWorker({ ...base, run: prober().run, deps: childDeps(() => result) })).reason;
  assert.equal(await outcome({ ...ok, status: null, signal: "SIGKILL", errorCode: "ETIMEDOUT" }), "launch-timeout");
  assert.equal(await outcome({ ...ok, status: null, signal: "SIGKILL", errorCode: "ENOBUFS" }), "launch-output-limit");
  assert.equal(await outcome({ ...ok, status: null, signal: "SIGKILL", stderr: "timeout ETIMEDOUT" }), "launch-failed");
  assert.equal(await outcome({ ...ok, status: 2 }), "launch-failed");
});

test("relative, dot-only and malformed launcher commands are refused without spawning", async (t: TestContext) => {
  const root = fixture(t);
  const deps = childDeps(refused("child.run"));
  for (const command of ["./orca", "../orca", ".", "..", "", "bin/orca", "or ca", "orca\n--x", "orca\0"]) {
    const result = await launchWorker({ ...common, deps, root, env: SAFE_ENV, run: prober().run, command, args: [], now: () => 100, deadlineMs: 5000 });
    assert.deepEqual([result.launched, result.reason], [false, "launcher-refused"], JSON.stringify(command));
  }
});

test("a worker never launches: launchWorker denies on the flag or env marker without spawning or probing", async (t: TestContext) => {
  const root = fixture(t);
  const deps = childDeps(refused("child.run"));
  const base = { ...common, deps, root, run: refused("run"), present: refused("present"), command: "orca", args: [], now: () => 100, deadlineMs: 5000 };
  assert.equal((await launchWorker({ ...base, env: SAFE_ENV, argv: [WORKER_FLAG] })).reason, "worker-context");
  assert.equal((await launchWorker({ ...base, env: { ...SAFE_ENV, [WORKER_ENV_MARKERS[0]]: "1" } })).reason, "worker-context");
});

test("every brief carries --worker-context on its own line after a plain-text first line, plus all task-spec fields", () => {
  const result = workerBrief({ target: "a.mjs", change: "return a-done", constraints: ["no new deps", "keep API"], ownership: ["a.mjs"], acceptance: "node a.mjs prints a-done" });
  assert.ok(result.ok);
  if (!result.ok) return;
  const lines = result.brief.split("\n");
  assert.ok(!lines[0].startsWith("--"), "the first line is plain text so a CLI parser cannot read the spec as a flag");
  assert.equal(lines[1], WORKER_FLAG);
  for (const label of ["Target: a.mjs", "Change: return a-done", "Constraints: no new deps; keep API", "Ownership: a.mjs", "Observable acceptance: node a.mjs prints a-done"]) {
    assert.ok(lines.includes(label), label);
  }
});

test("a brief with control characters or missing fields is refused", () => {
  const spec = { target: "a", change: "b", constraints: "c", ownership: "d", acceptance: "e" };
  for (const bad of ["x\ny", "x\ry", "x\0y", "x\x1by", "x\x85y", "x" + String.fromCharCode(0x2028) + "y", "x\x7fy"]) {
    for (const key of Object.keys(spec) as Array<keyof typeof spec>) {
      assert.equal(workerBrief({ ...spec, [key]: bad }).ok, false, `${key}:${JSON.stringify(bad)}`);
    }
  }
  assert.equal(workerBrief({ ...spec, ownership: [] }).ok, false);
  assert.equal(workerBrief({ ...spec, target: "  " }).ok, false);
  assert.equal(workerBrief({ ...spec, constraints: ["ok", "bad\nline"] }).ok, false);
  assert.equal(workerBrief(spec).ok, true);
});

test("a launcher other than the probed executable is refused before any spawn", async (t: TestContext) => {
  const root = fixture(t);
  const p = prober();
  const deps = childDeps(refused("child.run"));
  const request = { ...common, deps, root, env: { ...SAFE_ENV, ORCA_CLI_COMMAND: "/opt/probed/orca" }, run: p.run, args: ["worker-start"], deadlineMs: 5000 };
  const other = await launchWorker({ ...request, command: "/tmp/other/argv.sh" });
  assert.deepEqual([other.launched, other.reason], [false, "launcher-refused"]);
  const seen: string[] = [];
  const ran = await launchWorker({ ...request, deps: childDeps((command) => { seen.push(command); return ok; }) });
  assert.equal(ran.launched, true);
  assert.deepEqual(seen, ["/opt/probed/orca"], "with no command given, exactly the probed executable runs");
});

test("brief fields and the whole brief are bounded, and bidi/zero-width characters are refused", () => {
  const spec = { target: "a", change: "b", constraints: "c", ownership: "d", acceptance: "e" };
  assert.equal(workerBrief({ ...spec, change: "x".repeat(4097) }).ok, false);
  assert.equal(workerBrief({ ...spec, change: "x".repeat(4096) }).ok, true);
  assert.equal(workerBrief({ target: "x".repeat(4000), change: "x".repeat(4000), constraints: "x".repeat(4000), ownership: "x".repeat(4000), acceptance: "x".repeat(4000) }).ok, false);
  for (const bad of ["a\u202eb", "a\u200bb", "a\u2066b", "a\u061cb", "a\ufeffb", "a\u2060b", "a\u00adb"]) assert.equal(workerBrief({ ...spec, change: bad }).ok, false, JSON.stringify(bad));
});

test("a worker marker in the real process environment denies even when the caller passes a clean env", (t: TestContext) => {
  const root = fixture(t);
  const deps = { ...nodeDeps, proc: { ...nodeDeps.proc, env: { ORCA_DISPATCH_ID: "d1" } } } as RuntimeDeps;
  const decision = evaluateLaunch({ root, vendor: "codex", deps, env: { PATH: "/usr/bin", AI_WORKFLOW_ORCA_MULTI_AGENT: "true" }, run: refused("run"), present: refused("present") });
  assert.deepEqual([decision.allowed, decision.reason], [false, "worker-context"]);
});

test("a thrown error while evaluating fails closed as gate-error", (t: TestContext) => {
  const root = fixture(t);
  const deps = { ...nodeDeps, proc: { ...nodeDeps.proc, get env(): never { throw new Error("boom"); } } } as unknown as RuntimeDeps;
  const decision = evaluateLaunch({ ...common, deps, root, env: SAFE_ENV, run: refused("run") });
  assert.deepEqual([decision.allowed, decision.reason], [false, "gate-error"]);
});

test("the multi-agent switch: only `true` enables Orca; everything else keeps the normal workflow and touches nothing", (t: TestContext) => {
  const root = fixture(t);
  const untouched = { root, vendor: "codex", deps: nodeDeps, run: refused("run"), present: refused("present") };
  for (const value of [undefined, "", "false", "0", "no", "1", "yes", "tru", "truee", "on", "{}"]) {
    const env: Record<string, string | undefined> = { PATH: "/usr/bin", AI_WORKFLOW_ORCA_MULTI_AGENT: value };
    const decision = evaluateLaunch({ ...untouched, env });
    assert.deepEqual([decision.allowed, decision.reason], [false, "orca-multi-agent-disabled"], String(value));
  }
  assert.equal(evaluateLaunch({ ...common, root, env: { ...SAFE_ENV, AI_WORKFLOW_ORCA_MULTI_AGENT: " TRUE " }, run: prober().run }).allowed, true);
});

test("the switch is read from the project-root ai_workflow_env.json, never .env, and a process value overrides it", (t: TestContext) => {
  const root = fixture(t);
  const file = path.join(root, "ai_workflow_env.json");
  fs.writeFileSync(file, JSON.stringify({ AI_WORKFLOW_ORCA_MULTI_AGENT: true, SECRET_TOKEN: "abc" }));
  const base = { ...common, root, run: prober().run };
  assert.equal(evaluateLaunch({ ...base, env: { PATH: "/usr/bin" } }).allowed, true, "the settings file alone enables");
  assert.equal(evaluateLaunch({ ...base, run: prober().run, env: { PATH: "/usr/bin", AI_WORKFLOW_ORCA_MULTI_AGENT: "false" } }).reason, "orca-multi-agent-disabled", "process env wins");
  fs.writeFileSync(file, JSON.stringify({ AI_WORKFLOW_ORCA_MULTI_AGENT: false }));
  assert.equal(evaluateLaunch({ ...untouchedProbe(root), env: { PATH: "/usr/bin" } }).reason, "orca-multi-agent-disabled");
  // A .env that says true is ignored: the secret-bearing file is never read.
  fs.writeFileSync(path.join(root, ".env"), "AI_WORKFLOW_ORCA_MULTI_AGENT=true\n");
  assert.equal(evaluateLaunch({ ...untouchedProbe(root), env: { PATH: "/usr/bin" } }).reason, "orca-multi-agent-disabled");
  // A symlinked settings file outside the root contributes nothing.
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "orca-env-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.writeFileSync(path.join(outside, "env.json"), JSON.stringify({ AI_WORKFLOW_ORCA_MULTI_AGENT: true }));
  fs.rmSync(file);
  fs.symlinkSync(path.join(outside, "env.json"), file);
  assert.equal(evaluateLaunch({ ...untouchedProbe(root), env: { PATH: "/usr/bin" } }).reason, "orca-multi-agent-disabled");
});
function untouchedProbe(root: string) { return { root, vendor: "codex", deps: nodeDeps, run: refused("run"), present: refused("present") }; }
