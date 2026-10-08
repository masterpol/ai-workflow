import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { fileURLToPath } from "node:url";

import { collectReport, dispatchScope, dispatchWithRetries } from "./orca-dispatch.mts";
import { attemptKeyOf, createLedger, taskKeyOf } from "./orca-ledger.mts";
import { reconcile } from "./orca-reconcile.mts";
import type { CheckSpec } from "./orca-reconcile.mts";
import { NODE_FLAGS } from "./runtime/entry.mts";
import { createNodeDeps } from "./runtime/node.mts";
import type { RunResult, RuntimeDeps, SpawnOptions } from "./runtime/types.mts";

// ORCA_RUN_UNDER_TEST lets a mutant copy of the CLI be exercised by the same assertions (mutant proofs).
const target = process.env.ORCA_RUN_UNDER_TEST ?? "./orca-run.mts";
const cli = await import(target) as typeof import("./orca-run.mts");
const { main, exitCodeFor, checkCatalog, MAX_INPUT_BYTES } = cli;

const HERE = import.meta.dirname;
const EXAMPLE = path.resolve(HERE, "../integrations/orca-vendors.example.json");
const SWITCH = "AI_WORKFLOW_ORCA_MULTI_AGENT";
type Obj = Record<string, unknown>;

// ---- harness ----

interface Calls { runSync: string[][]; run: string[][]; bytes: string[][] }
interface Harness { deps: RuntimeDeps; calls: Calls; out: string[]; err: string[]; env: Record<string, string | undefined> }
type RunHandler = (command: string, args: string[], options: SpawnOptions) => Promise<RunResult> | RunResult;
type SyncHandler = (command: string, args: string[], options: SpawnOptions) => RunResult;

const failing: RunResult = { status: 1, signal: null, stdout: "", stderr: "" };
function harness(env: Record<string, string | undefined>, handlers: { run?: RunHandler; runSync?: SyncHandler } = {}): Harness {
  const base = createNodeDeps(env);
  const calls: Calls = { runSync: [], run: [], bytes: [] };
  const out: string[] = [];
  const err: string[] = [];
  const deps: RuntimeDeps = { ...base,
    child: {
      runBytesSync: (command, args, options) => { calls.bytes.push([command, ...args]); return base.child.runBytesSync(command, args, options); },
      runSync: (command, args, options = {}) => { calls.runSync.push([command, ...args]); return handlers.runSync ? handlers.runSync(command, args, options) : failing; },
      run: async (command, args, options = {}) => { calls.run.push([command, ...args]); return handlers.run ? await handlers.run(command, args, options) : failing; },
    },
    io: { ...base.io, stdout: { ...base.io.stdout, write: (text) => { out.push(text); } }, stderr: { ...base.io.stderr, write: (text) => { err.push(text); } } },
  };
  return { deps, calls, out, err, env };
}
const spawned = (h: Harness): number => h.calls.runSync.length + h.calls.run.length + h.calls.bytes.length;

/** Runs the CLI and enforces the output contract on every call: stdout is exactly one JSON object and a newline. */
async function exec(argv: string[], h: Harness): Promise<{ code: number; json: Obj; stdout: string; stderr: string }> {
  const code = await main(argv, h.deps);
  const stdout = h.out.join("");
  assert.ok(stdout.endsWith("\n") && stdout.indexOf("\n") === stdout.length - 1, `stdout is one line: ${JSON.stringify(stdout)}`);
  const json = JSON.parse(stdout) as unknown;
  assert.ok(json !== null && typeof json === "object" && !Array.isArray(json), "stdout is a JSON object");
  return { code, json: json as Obj, stdout, stderr: h.err.join("") };
}

function tmp(t: TestContext, label = "orca-run-"): string {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), label)));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
interface Fixture { root: string; bin: string; env: Record<string, string | undefined> }
function fixture(t: TestContext, enabled: string | null = "true"): Fixture {
  const root = tmp(t);
  fs.mkdirSync(path.join(root, ".project"));
  const policy = JSON.parse(fs.readFileSync(EXAMPLE, "utf8")) as Obj;
  policy["use-orca-orchestration"] = true;
  fs.writeFileSync(path.join(root, ".project/orchestration.json"), JSON.stringify(policy));
  const bin = tmp(t, "orca-run-bin-");
  for (const name of ["orca", "claude", "codex", "opencode"]) fs.writeFileSync(path.join(bin, name), "#!/bin/sh\n", { mode: 0o755 });
  const env: Record<string, string | undefined> = { PATH: bin, ORCA_AGENT_SESSION_ID: "s1", ...(enabled !== null ? { [SWITCH]: enabled } : {}) };
  return { root, bin, env };
}
const probeSync: SyncHandler = (_command, args) => {
  const body = args.includes("orca-cli") ? { name: "orca-cli", markdown: "worktree current; terminal" }
    : args.includes("orchestration") ? { name: "orchestration", markdown: "worker-start; worker_done; orchestration check" }
      : { ok: true, result: { target: { kind: "local" }, runtime: { reachable: true, state: "ready", appVersion: "1.4.222" } } };
  return { status: 0, signal: null, stdout: JSON.stringify(body), stderr: "" };
};
let workers = 0;
const startRun: RunHandler = () => { workers++; return { status: 0, signal: null, stderr: "", stdout: JSON.stringify({ result: { stage: "input_accepted", dispatch: { id: `ctx_${workers}` } } }) }; };
const dispatching = (f: Fixture): Harness => { workers = 0; return harness(f.env, { runSync: probeSync, run: startRun }); };

const scope = { id: "s1", target: "b.mjs", change: "return b-done", constraints: "edit only b.mjs", ownership: "b.mjs", acceptance: "node prints b-done" };
const dispatchInput = (extra: Obj = {}): Obj => ({ coordinator: "claude", vendor: "codex", scope, attemptId: "a1", timeoutMs: 600000, ...extra });
function writeInput(root: string, value: unknown, name = "input.json"): string {
  fs.writeFileSync(path.join(root, name), typeof value === "string" ? value : JSON.stringify(value));
  return name;
}
const walkTree = (dir: string): string[] => fs.readdirSync(dir, { recursive: true, withFileTypes: true })
  .map((entry) => path.join(entry.parentPath, entry.name)).sort().map((file) => `${path.relative(dir, file)}:${fs.lstatSync(file).isFile() ? fs.readFileSync(file, "utf8") : "dir"}`);

// ---- parity: the CLI prints what the library returns, no more, no less ----

test("dispatch parity: the CLI JSON equals dispatchScope for the same input, exit 0 when launched", async (t: TestContext) => {
  const a = fixture(t);
  const b = fixture(t);
  writeInput(a.root, dispatchInput());
  const h = dispatching(a);
  const result = await exec(["dispatch", "--root", a.root, "--input", "input.json"], h);
  const lib = dispatching(b);
  const expected = await dispatchScope({ root: b.root, coordinator: "claude", vendor: "codex", scope, attemptId: "a1", deadlineMs: performance.now() + 600000, deps: lib.deps });
  assert.deepEqual(result.json, expected);
  assert.deepEqual([result.code, result.json.route, result.json.dispatchId], [0, "launched", "ctx_1"]);
  assert.equal(h.calls.run.length, 1);
  const again = await exec(["dispatch", "--root", a.root, "--input", "input.json"], dispatching(a));
  assert.deepEqual([again.code, again.json.route], [0, "resume"]);
});

test("dispatch parity: a refusal from the library is exit 3 with the same outcome, and maxRetries selects dispatchWithRetries", async (t: TestContext) => {
  const a = fixture(t);
  const b = fixture(t);
  writeInput(a.root, dispatchInput({ vendor: "claude" }));
  const refused = await exec(["dispatch", "--root", a.root, "--input", "input.json"], dispatching(a));
  const expectedRefusal = await dispatchScope({ root: b.root, coordinator: "claude", vendor: "claude", scope, attemptId: "a1", deadlineMs: performance.now() + 600000, deps: dispatching(b).deps });
  assert.deepEqual(refused.json, expectedRefusal);
  assert.deepEqual([refused.code, refused.json.route], [3, "normal"]);
  assert.equal(fs.existsSync(path.join(a.root, ".project/metrics")), false);

  const c = fixture(t);
  const d = fixture(t);
  writeInput(c.root, dispatchInput({ maxRetries: 1 }));
  const retried = await exec(["dispatch", "--root", c.root, "--input", "input.json"], dispatching(c));
  const expectedRetry = await dispatchWithRetries({ root: d.root, coordinator: "claude", vendor: "codex", scope, baseAttemptId: "a1", maxRetries: 1, deadlineMs: performance.now() + 600000, deps: dispatching(d).deps });
  assert.deepEqual(retried.json, expectedRetry);
  assert.equal(retried.code, 0);
});

test("collect parity: the CLI JSON equals collectReport, exit 0 when accepted and 3 when not", async (t: TestContext) => {
  const a = fixture(t);
  const b = fixture(t);
  await dispatchScope({ root: a.root, coordinator: "claude", vendor: "codex", scope, attemptId: "a1", deadlineMs: performance.now() + 60000, deps: dispatching(a).deps });
  await dispatchScope({ root: b.root, coordinator: "claude", vendor: "codex", scope, attemptId: "a1", deadlineMs: performance.now() + 60000, deps: dispatching(b).deps });
  const done = (dispatchId: string) => ({ id: "m1", type: "worker_done", subject: "done", body: "ok",
    payload: JSON.stringify({ taskId: "t1", dispatchId, outcome: "succeeded", filesModified: ["b.mjs"] }) });
  const key = attemptKeyOf("a1");
  writeInput(a.root, { attemptKey: key, message: done("ctx_1") });
  const accepted = await exec(["collect", "--root", a.root, "--input", "input.json"], harness(a.env));
  assert.deepEqual(accepted.json, collectReport({ root: b.root, attemptKey: key, message: done("ctx_1"), deps: harness(b.env).deps }));
  assert.deepEqual([accepted.code, accepted.json.accepted, accepted.json.state], [0, true, "completed"]);

  const c = fixture(t);
  await dispatchScope({ root: c.root, coordinator: "claude", vendor: "codex", scope, attemptId: "a1", deadlineMs: performance.now() + 60000, deps: dispatching(c).deps });
  writeInput(c.root, { attemptKey: key, message: done("ctx_wrong") });
  const mismatch = await exec(["collect", "--root", c.root, "--input", "input.json"], harness(c.env));
  assert.deepEqual([mismatch.code, mismatch.json.accepted, mismatch.json.reason], [3, false, "dispatch-mismatch"]);
});

// ---- real git fixtures for reconcile ----

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8", env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1" } });
  assert.equal(result.status, 0, `git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout.trim();
}
interface Repo { root: string; baseline: string; attempt: Obj; env: Record<string, string | undefined> }
function repo(t: TestContext, enabled: string | null = "true", complete = true): Repo {
  const top = tmp(t, "orca-run-git-");
  const root = path.join(top, "coordinator");
  const workspace = path.join(top, "workspaces");
  fs.mkdirSync(root);
  fs.mkdirSync(workspace);
  git(root, "init", "-q", "-b", "main");
  fs.writeFileSync(path.join(root, "a.txt"), "a baseline\n");
  fs.writeFileSync(path.join(root, ".gitignore"), ".project/metrics/\n");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "baseline");
  const baseline = git(root, "rev-parse", "HEAD");
  const dir = path.join(workspace, "w1");
  git(root, "worktree", "add", "-q", "-b", "w1", dir, baseline);
  fs.writeFileSync(path.join(dir, "a.txt"), "w1 changed\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "w1");
  const attemptKey = attemptKeyOf("w1");
  if (complete) {
    const ledger = createLedger(root, createNodeDeps());
    assert.equal(ledger.claim({ attemptKey, taskKey: taskKeyOf("scope-w1"), vendor: "codex", state: "claimed", createdAt: 1790000000000 }).outcome, "claimed");
    assert.equal(ledger.update(attemptKey, { state: "launched", dispatchId: "ctx_w1" }).status, "ok");
    assert.equal(ledger.update(attemptKey, { state: "completed", reportId: "msg_w1" }).status, "ok");
  }
  return { root, baseline, env: { PATH: process.env.PATH, HOME: process.env.HOME, ...(enabled !== null ? { [SWITCH]: enabled } : {}), SECRET_TOKEN: "do-not-leak" },
    attempt: { attemptKey, worktree: { path: dir, baseline, allowedRoots: [workspace] }, claims: ["a.txt"] } };
}
const reconcileInput = (r: Repo, extra: Obj = {}): Obj => ({ baseline: r.baseline, attempts: [r.attempt], timeoutMs: 120000, ...extra });
const realChild = createNodeDeps().child;

test("reconcile parity: the CLI JSON equals reconcile for the same input; integrated is exit 0", async (t: TestContext) => {
  const a = repo(t);
  const b = repo(t);
  writeInput(a.root, reconcileInput(a));
  const result = await exec(["reconcile", "--root", a.root, "--input", "input.json"], harness(a.env, { run: (c, args, o) => realChild.run(c, args, o), runSync: (c, args, o) => realChild.runSync(c, args, o) }));
  const expected = await reconcile({ root: b.root, baseline: b.baseline, attempts: [b.attempt as never], checks: {}, runChecks: [], env: b.env, deps: createNodeDeps(b.env), deadlineMs: performance.now() + 120000 });
  assert.deepEqual(result.json, JSON.parse(JSON.stringify(expected)));
  assert.deepEqual([result.code, result.json.status], [0, "integrated"]);
  assert.equal(fs.readFileSync(path.join(a.root, "a.txt"), "utf8"), "w1 changed\n");
});

test("reconcile parity: a refused outcome is exit 3 with the library outcome", async (t: TestContext) => {
  const a = repo(t, "true", false);
  const b = repo(t, "true", false);
  writeInput(a.root, reconcileInput(a));
  const result = await exec(["reconcile", "--root", a.root, "--input", "input.json"], harness(a.env, { run: (c, args, o) => realChild.run(c, args, o), runSync: (c, args, o) => realChild.runSync(c, args, o) }));
  const expected = await reconcile({ root: b.root, baseline: b.baseline, attempts: [b.attempt as never], checks: {}, runChecks: [], env: b.env, deps: createNodeDeps(b.env), deadlineMs: performance.now() + 120000 });
  assert.deepEqual(result.json, JSON.parse(JSON.stringify(expected)));
  assert.deepEqual([result.code, result.json.status], [3, "refused"]);
});

test("--check names map to the fixed catalog argv and checks receive only the worker env allowlist", async (t: TestContext) => {
  const r = repo(t);
  writeInput(r.root, reconcileInput(r));
  const seen: Array<{ command: string; args: string[]; env: Record<string, string | undefined> }> = [];
  const h = harness(r.env, { runSync: (c, a, o) => realChild.runSync(c, a, o), run: (command, args, options) => {
    if (command === "git") return realChild.run(command, args, options);
    seen.push({ command, args, env: options.env ?? {} });
    return { status: 0, signal: null, stdout: "fine", stderr: "" };
  } });
  const names = ["workflow-doctor", "setup-validator", "graph-check", "node-tests"];
  const result = await exec(["reconcile", "--root", r.root, "--input", "input.json", ...names.flatMap((name) => ["--check", name])], h);
  assert.deepEqual([result.code, result.json.status], [0, "integrated"]);
  const catalog = checkCatalog(h.deps);
  assert.deepEqual(Object.keys(catalog).sort(), [...names].sort());
  assert.deepEqual(seen.slice(0, 4).map((call) => [call.command, call.args]), names.map((name) => [h.deps.proc.execPath, catalog[name].args]));
  assert.equal(seen.length, 8, "each check runs before and after the apply");
  assert.deepEqual(catalog["workflow-doctor"].args.slice(-2), ["ai-framework/scripts/workflow-doctor.mts", "--json"]);
  assert.deepEqual(catalog["graph-check"].args.slice(-2), ["ai-framework/scripts/graphify.mts", "--check"]);
  for (const call of seen) {
    assert.ok(Object.keys(call.env).every((key) => ["PATH", "HOME", "LANG", "TERM", "TMPDIR", "ORCA_TERMINAL_HANDLE", "ORCA_AGENT_SESSION_ID"].includes(key)), Object.keys(call.env).join());
    assert.equal(call.env.SECRET_TOKEN, undefined);
  }
});

test("a check name outside the catalog, with spaces, with command text or a prototype name is a usage error and runs nothing", async (t: TestContext) => {
  const r = repo(t);
  writeInput(r.root, reconcileInput(r));
  const before = walkTree(r.root);
  for (const name of ["rm", "workflow doctor", "graph-check;id", "node -e 1", "__proto__", "constructor", "toString", "hasOwnProperty", "../x", "/bin/sh", "WORKFLOW-DOCTOR"]) {
    const h = harness(r.env);
    const result = await exec(["reconcile", "--root", r.root, "--input", "input.json", "--check", name], h);
    assert.deepEqual([result.code, result.json.error, result.json.reason], [2, "usage", "unknown-check"], name);
    assert.equal(spawned(h), 0, name);
  }
  assert.deepEqual(walkTree(r.root), before);
});

// ---- switch off ----

test("with the switch off every subcommand exits 3, spawns nothing and writes no ledger, evidence or snapshot", async (t: TestContext) => {
  for (const value of [null, "false", "1"]) {
    const f = fixture(t, value);
    const r = repo(t, value);
    const inputs: Array<[string[], string]> = [
      [["dispatch"], writeInput(f.root, dispatchInput())],
      [["collect"], writeInput(f.root, { attemptKey: attemptKeyOf("a1"), message: { id: "m1", type: "worker_done" } }, "collect.json")],
      [["status"], ""],
    ];
    for (const [[command], input] of inputs) {
      const before = walkTree(f.root);
      const h = harness(f.env, { runSync: probeSync, run: startRun });
      const result = await exec([command, "--root", f.root, ...(input ? ["--input", input] : [])], h);
      assert.equal(result.code, 3, `${command} ${String(value)}`);
      assert.equal(spawned(h), 0, `${command} ${String(value)}`);
      assert.deepEqual(walkTree(f.root), before, `${command} ${String(value)}`);
    }
    writeInput(r.root, reconcileInput(r));
    const before = walkTree(r.root);
    const h = harness(r.env, { run: (c, a, o) => realChild.run(c, a, o), runSync: (c, a, o) => realChild.runSync(c, a, o) });
    const result = await exec(["reconcile", "--root", r.root, "--input", "input.json", "--check", "graph-check"], h);
    assert.deepEqual([result.code, result.json.status, result.json.reason], [3, "normal", "orca-multi-agent-disabled"], String(value));
    assert.equal(spawned(h), 0);
    assert.deepEqual(walkTree(r.root), before);
    assert.equal(fs.readFileSync(path.join(r.root, "a.txt"), "utf8"), "a baseline\n");
    const dispatched = await exec(["dispatch", "--root", f.root, "--input", "input.json"], harness(f.env, { runSync: probeSync, run: startRun }));
    assert.deepEqual([dispatched.code, dispatched.json.route, dispatched.json.reason], [3, "normal", "orca-multi-agent-disabled"]);
  }
});

test("status reports with the switch off and makes no Orca call unless --probe", async (t: TestContext) => {
  const off = fixture(t, null);
  const h = harness(off.env, { runSync: probeSync });
  const result = await exec(["status", "--root", off.root], h);
  assert.deepEqual([result.json.command, result.json.enabled, result.code], ["status", false, 3]);
  assert.deepEqual(Object.keys(result.json.vendors as Obj), ["claude", "codex", "opencode"]);
  assert.equal(((result.json.vendors as Obj).claude as Obj).policy !== undefined, true);
  assert.equal(spawned(h), 0);
  const probed = harness(off.env, { runSync: probeSync });
  await exec(["status", "--root", off.root, "--probe"], probed);
  assert.equal(spawned(probed), 0, "the library refuses to contact Orca with the switch off");

  const on = fixture(t);
  const quiet = harness(on.env, { runSync: probeSync });
  const plain = await exec(["status", "--root", on.root, "--vendor", "claude"], quiet);
  assert.deepEqual([plain.code, plain.json.enabled, plain.json.probe], [0, true, false]);
  assert.equal(spawned(quiet), 0, "no probe without --probe");
  const loud = harness(on.env, { runSync: probeSync });
  const probe = await exec(["status", "--root", on.root, "--vendor", "claude", "--probe"], loud);
  assert.equal(probe.code, 0);
  assert.equal(loud.calls.runSync.length, 3, "three read-only Orca calls");
  const preflight = ((probe.json.vendors as Obj).claude as Obj).preflight as Obj;
  assert.equal(preflight.reason, "caller-unverified", "the probe ran and proved the guides, runtime and version");
  assert.equal(preflight.dispatchReady, false);
});

// ---- usage errors ----

test("usage errors exit 2 with a JSON error and run nothing", async (t: TestContext) => {
  const f = fixture(t);
  writeInput(f.root, dispatchInput());
  const root = ["--root", f.root];
  const cases: Array<[string, string[]]> = [
    ["no command", []],
    ["unknown subcommand", ["launch", ...root]],
    ["unknown flag", ["status", ...root, "--force"]],
    ["unknown flag for dispatch", ["dispatch", ...root, "--input", "input.json", "--shell"]],
    ["missing --root", ["status"]],
    ["missing --root for dispatch", ["dispatch", "--input", "input.json"]],
    ["duplicate --root", ["status", ...root, ...root]],
    ["duplicate --input", ["dispatch", ...root, "--input", "input.json", "--input", "input.json"]],
    ["duplicate --probe", ["status", ...root, "--probe", "--probe"]],
    ["duplicate --check", ["reconcile", ...root, "--input", "input.json", "--check", "graph-check", "--check", "graph-check"]],
    ["--root without a value", ["status", "--root"]],
    ["--root value is a flag", ["status", "--root", "--probe"]],
    ["positional argument", ["status", ...root, "extra"]],
    ["--check on dispatch", ["dispatch", ...root, "--input", "input.json", "--check", "graph-check"]],
    ["--check on status", ["status", ...root, "--check", "graph-check"]],
    ["--probe on dispatch", ["dispatch", ...root, "--input", "input.json", "--probe"]],
    ["--input on status", ["status", ...root, "--input", "input.json"]],
    ["dispatch without --input", ["dispatch", ...root]],
    ["collect without --input", ["collect", ...root]],
    ["reconcile without --input", ["reconcile", ...root]],
    ["unknown vendor", ["status", ...root, "--vendor", "gpt"]],
    ["--vendor on dispatch", ["dispatch", ...root, "--input", "input.json", "--vendor", "codex"]],
    ["root that does not exist", ["status", "--root", path.join(f.root, "missing")]],
  ];
  for (const [label, argv] of cases) {
    const h = harness(f.env, { runSync: probeSync, run: startRun });
    const result = await exec(argv, h);
    assert.equal(result.code, 2, label);
    assert.equal(result.json.error, "usage", label);
    assert.ok(result.stderr.startsWith("orca-run:") && result.stderr.split("\n").length === 2, label);
    assert.equal(spawned(h), 0, label);
  }
  assert.equal(fs.existsSync(path.join(f.root, ".project/metrics")), false);
});

// ---- input file guard ----

test("an unsafe --input is refused with exit 3 and no side effects", async (t: TestContext) => {
  const f = fixture(t);
  const outside = tmp(t, "orca-run-outside-");
  fs.writeFileSync(path.join(outside, "in.json"), JSON.stringify(dispatchInput()));
  writeInput(f.root, dispatchInput(), "real.json");
  fs.symlinkSync(path.join(f.root, "real.json"), path.join(f.root, "link.json"));
  fs.symlinkSync(path.join(outside, "in.json"), path.join(f.root, "escape.json"));
  fs.mkdirSync(path.join(f.root, "sub"));
  writeInput(f.root, dispatchInput(), "sub/ok.json");
  fs.symlinkSync(path.join(f.root, "sub"), path.join(f.root, "sublink"));
  fs.mkdirSync(path.join(f.root, "dir.json"));
  fs.writeFileSync(path.join(f.root, "big.json"), `${" ".repeat(MAX_INPUT_BYTES + 1 - 2)}{}`);
  const fifo = spawnSync("mkfifo", [path.join(f.root, "pipe.json")]);
  assert.equal(fifo.status, 0, "mkfifo");
  writeInput(f.root, "{not json", "bad.json");
  writeInput(f.root, "[]", "array.json");
  writeInput(f.root, "null", "null.json");
  writeInput(f.root, '{"__proto__": {"x": 1}}', "proto.json");
  writeInput(f.root, JSON.stringify({ ...dispatchInput(), scope: JSON.parse('{"constructor": {"a": 1}}') }), "ctor.json");
  writeInput(f.root, `{"deep":${'{"a":'.repeat(40)}1${"}".repeat(40)}}`, "deep.json");
  const before = walkTree(f.root);
  const cases: Array<[string, string, string]> = [
    ["symlink", "link.json", "input-symlink"],
    ["symlink pointing outside", "escape.json", "input-symlink"],
    ["symlinked directory component", "sublink/ok.json", "input-symlink"],
    ["directory", "dir.json", "input-not-regular"],
    ["FIFO", "pipe.json", "input-not-regular"],
    ["oversize by one byte", "big.json", "input-too-large"],
    ["relative path outside root", "../escape.json", "input-outside-root"],
    ["absolute path outside root", path.join(outside, "in.json"), "input-outside-root"],
    ["the root itself", ".", "input-outside-root"],
    ["missing file", "nothing.json", "input-unreadable"],
    ["invalid JSON", "bad.json", "input-invalid-json"],
    ["array instead of object", "array.json", "input-not-an-object"],
    ["null", "null.json", "input-not-an-object"],
    ["__proto__ key", "proto.json", "input-prototype-key"],
    ["nested constructor key", "ctor.json", "input-prototype-key"],
    ["excessive depth", "deep.json", "input-too-deep"],
  ];
  for (const [label, input, reason] of cases) {
    const h = dispatching(f);
    const result = await exec(["dispatch", "--root", f.root, "--input", input], h);
    assert.deepEqual([result.code, result.json.error, result.json.reason], [3, "input-refused", reason], label);
    assert.equal(spawned(h), 0, label);
  }
  assert.deepEqual(walkTree(f.root), before);
  const good = await exec(["dispatch", "--root", f.root, "--input", "sub/ok.json"], dispatching(f));
  assert.deepEqual([good.code, good.json.route], [0, "launched"], "a regular file in a subdirectory is accepted");
  const inside = await exec(["dispatch", "--root", f.root, "--input", path.join(f.root, "real.json")], dispatching(fixture(t)));
  assert.equal(inside.json.error, undefined, "an absolute path inside the root is accepted");
});

test("the input size bound is exactly 64 KiB", async (t: TestContext) => {
  const f = fixture(t);
  assert.equal(MAX_INPUT_BYTES, 64 * 1024);
  fs.writeFileSync(path.join(f.root, "edge.json"), `{}${" ".repeat(MAX_INPUT_BYTES - 2)}`);
  const result = await exec(["collect", "--root", f.root, "--input", "edge.json"], harness(f.env));
  assert.equal(result.json.reason, "invalid-collect", "the bound itself passes the file guard and fails shape validation instead");
});

test("input shapes are validated strictly and unknown keys are refused", async (t: TestContext) => {
  const f = fixture(t);
  const bads: Array<[string, Obj]> = [
    ["unknown top-level key", dispatchInput({ launcher: "/bin/sh" })],
    ["unknown scope key", dispatchInput({ scope: { ...scope, extra: "x" } })],
    ["missing scope field", dispatchInput({ scope: { id: "s1" } })],
    ["timeout as text", dispatchInput({ timeoutMs: "600000" })],
    ["timeout zero", dispatchInput({ timeoutMs: 0 })],
    ["timeout too large", dispatchInput({ timeoutMs: 30 * 60 * 1000 + 1 })],
    ["timeout missing", (() => { const v = dispatchInput(); delete v.timeoutMs; return v; })()],
    ["retries too high", dispatchInput({ maxRetries: 6 })],
    ["retries fraction", dispatchInput({ maxRetries: 0.5 })],
    ["placement value not text", dispatchInput({ placement: { name: 1 } })],
    ["placement as list", dispatchInput({ placement: ["--name"] })],
    ["constraints as number", dispatchInput({ scope: { ...scope, constraints: 3 } })],
  ];
  for (const [label, value] of bads) {
    writeInput(f.root, value);
    const h = dispatching(f);
    const result = await exec(["dispatch", "--root", f.root, "--input", "input.json"], h);
    assert.deepEqual([result.code, result.json.error], [3, "input-refused"], label);
    assert.equal(spawned(h), 0, label);
  }
  writeInput(f.root, { attemptKey: "attempt:a1", message: "text" });
  assert.equal((await exec(["collect", "--root", f.root, "--input", "input.json"], harness(f.env))).json.reason, "invalid-message");
  writeInput(f.root, { baseline: "x", attempts: [{ attemptKey: "k", worktree: { path: "/x", baseline: "x" } }], timeoutMs: 1000 });
  assert.equal((await exec(["reconcile", "--root", f.root, "--input", "input.json"], harness(f.env))).json.reason, "invalid-worktree");
  writeInput(f.root, { baseline: "x", attempts: [], timeoutMs: 1000, humanConfirmed: "yes" });
  assert.equal((await exec(["reconcile", "--root", f.root, "--input", "input.json"], harness(f.env))).json.reason, "invalid-humanConfirmed");
  assert.equal(fs.existsSync(path.join(f.root, ".project/metrics")), false);
});

// ---- exit-code mapping, output contract, internal errors ----

test("exit codes follow the outcome: launched/resume/accepted/integrated are 0, everything else 3", () => {
  assert.deepEqual(["launched", "resume", "normal", "blocked"].map((route) => exitCodeFor("dispatch", { route })), [0, 0, 3, 3]);
  assert.deepEqual([true, false, undefined].map((accepted) => exitCodeFor("collect", { accepted })), [0, 3, 3]);
  assert.deepEqual(["integrated", "refused", "normal", "rolled-back"].map((status) => exitCodeFor("reconcile", { status })), [0, 3, 3, 3]);
  assert.equal(exitCodeFor("status", {}), 0);
});

test("an unexpected failure is exit 1 with a JSON error and one short stderr line", async (t: TestContext) => {
  const f = fixture(t);
  writeInput(f.root, { attemptKey: attemptKeyOf("a1"), message: { id: "m1", type: "worker_done" } });
  const h = harness(f.env);
  const broken: RuntimeDeps = { ...h.deps, clock: { ...h.deps.clock, perfNowMs: () => { throw new Error("boom"); } } };
  const result = await main(["collect", "--root", f.root, "--input", "input.json"], { ...broken, fs: { ...broken.fs, openSync: () => { throw new TypeError("boom"); } } });
  assert.equal(result, 3, "an unreadable input is a refusal, not an internal error");
  h.out.length = 0;
  h.err.length = 0;
  writeInput(f.root, dispatchInput());
  const code = await main(["dispatch", "--root", f.root, "--input", "input.json"], broken);
  assert.equal(code, 1);
  assert.deepEqual(JSON.parse(h.out.join("")), { error: "internal" });
  assert.equal(h.err.join("").trim(), "orca-run: internal");
});

test("run directly, the file prints one JSON object and exits with the mapped code", (t: TestContext) => {
  const f = fixture(t, null);
  const file = target.startsWith("file:") ? fileURLToPath(target) : path.resolve(HERE, target);
  const flags = process.versions.bun ? [] : NODE_FLAGS;
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, AI_WORKFLOW_RUNNER: process.versions.bun ? "bun" : "node" };
  const run = (...args: string[]) => spawnSync(process.execPath, [...flags, file, ...args], { encoding: "utf8", env, timeout: 30000, cwd: f.root });
  const usageRun = run("bogus");
  assert.deepEqual([usageRun.status, JSON.parse(usageRun.stdout)], [2, { error: "usage", reason: "unknown-command" }]);
  const off = run("status", "--root", f.root);
  assert.equal(off.status, 3);
  assert.equal(JSON.parse(off.stdout).enabled, false);
  assert.equal(off.stdout.trim().split("\n").length, 1);
});

// ---- no duplicated guard ----

test("the CLI source imports no launch or path guard, repeats no switch check, and uses no node: module or any", () => {
  const source = fs.readFileSync(path.resolve(HERE, "orca-run.mts"), "utf8");
  for (const forbidden of ["evaluateLaunch", "validatePath", "PATCH_SPECIAL_MODE", "WORKER_ENV_MARKERS", "isWorkerContext", "AI_WORKFLOW_ORCA_MULTI_AGENT"]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
  assert.doesNotMatch(source, /from "node:|require\(/);
  assert.doesNotMatch(source, /:\s*any\b|\bas any\b/);
  assert.equal(source.match(/runDirect\(import\.meta\.url, main\);/g)?.length, 1);
  const catalog: Readonly<Record<string, CheckSpec>> = checkCatalog(createNodeDeps());
  assert.ok(Object.isFrozen(catalog));
});
