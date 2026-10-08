import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";

import { copyEvidence, verifyEvidence } from "./orca-evidence.mts";
import { admitDiff } from "./orca-diff-admit.mts";
import { attemptKeyOf, createLedger, taskKeyOf } from "./orca-ledger.mts";
import { reconcile } from "./orca-reconcile.mts";
import type { CheckSpec, ReconcileAttempt } from "./orca-reconcile.mts";
import { createNodeDeps } from "./runtime/node.mts";

// ORCA_RECONCILE_UNDER_TEST lets a mutant copy of the module be exercised by the same assertions (mutant proofs).
const mod = await import(process.env.ORCA_RECONCILE_UNDER_TEST ?? "./orca-reconcile.mts") as typeof import("./orca-reconcile.mts");
const run = mod.reconcile ?? reconcile;
const deps = createNodeDeps();
const SWITCH = "AI_WORKFLOW_ORCA_MULTI_AGENT";
const ENV = { PATH: process.env.PATH, [SWITCH]: "true", SECRET_TOKEN: "do-not-leak" };
const NODE = process.execPath;

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8", env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1" } });
  assert.equal(result.status, 0, `git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout.trim();
}
interface Fixture { root: string; workspace: string; baseline: string }
function fixture(t: TestContext): Fixture {
  const top = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "orca-reconcile-")));
  t.after(() => fs.rmSync(top, { recursive: true, force: true }));
  const root = path.join(top, "coordinator");
  const workspace = path.join(top, "workspaces");
  fs.mkdirSync(root);
  fs.mkdirSync(workspace);
  git(root, "init", "-q", "-b", "main");
  for (const file of ["a.txt", "b.txt", "c.txt"]) fs.writeFileSync(path.join(root, file), `${file} baseline\n`);
  fs.writeFileSync(path.join(root, ".gitignore"), ".project/metrics/\n");
  fs.mkdirSync(path.join(root, ".project"));
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "baseline");
  return { root, workspace, baseline: git(root, "rev-parse", "HEAD") };
}
function worker(f: Fixture, name: string, edit: (dir: string) => void, commit = true): ReconcileAttempt {
  const dir = path.join(f.workspace, name);
  git(f.root, "worktree", "add", "-q", "-b", name, dir, f.baseline);
  edit(dir);
  if (commit) { git(dir, "add", "-A"); git(dir, "commit", "-q", "-m", name); }
  return { attemptKey: attemptKeyOf(name), worktree: { path: dir, baseline: f.baseline, allowedRoots: [f.workspace] } };
}
function complete(f: Fixture, attempt: ReconcileAttempt, state: "completed" | "launched" = "completed"): void {
  const ledger = createLedger(f.root, deps);
  const name = attempt.attemptKey.slice("attempt:".length);
  assert.equal(ledger.claim({ attemptKey: attempt.attemptKey, taskKey: taskKeyOf(`scope-${name}`), vendor: "codex", state: "claimed", createdAt: 1790000000000 }).outcome, "claimed");
  assert.equal(ledger.update(attempt.attemptKey, { state: "launched", dispatchId: `ctx_${name}` }).status, "ok");
  if (state === "completed") assert.equal(ledger.update(attempt.attemptKey, { state: "completed", reportId: `msg_${name}` }).status, "ok");
}
const stateOf = (f: Fixture, attempt: ReconcileAttempt): string | undefined => {
  const read = createLedger(f.root, deps).read(attempt.attemptKey);
  return read.status === "ok" ? read.record.state : read.status;
};
const node = (code: string): CheckSpec => ({ command: NODE, args: ["-e", code] });
const CATALOG: Record<string, CheckSpec> = {
  ok: node("process.exit(0)"),
  fail: node("process.exit(1)"),
  nobad: node("const s=require('fs').readFileSync('a.txt','utf8'); if (s.includes('BAD')) { console.error('BAD found'); process.exit(1); }"),
  env: node("console.log('token=' + (process.env.SECRET_TOKEN || 'none'))"),
};
const options = (f: Fixture, attempts: ReconcileAttempt[], extra: Record<string, unknown> = {}) => ({
  root: f.root, baseline: f.baseline, attempts, checks: CATALOG, runChecks: ["ok"], env: ENV, deps, deadlineMs: performance.now() + 120000, ...extra,
});
const read = (dir: string, file: string): string => fs.readFileSync(path.join(dir, file), "utf8");
const snapshotTree = (dir: string): Record<string, string> => {
  const out: Record<string, string> = {};
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === ".git") continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else out[path.relative(dir, full)] = fs.readFileSync(full, "utf8");
    }
  };
  walk(dir);
  return out;
};

test("with the multi-agent switch off nothing is read, applied or written", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "changed\n"));
  complete(f, w);
  const before = snapshotTree(f.root);
  for (const value of [undefined, "false", "1"]) {
    const outcome = await run(options(f, [w], { env: { PATH: ENV.PATH, [SWITCH]: value } }));
    assert.deepEqual([outcome.status, outcome.reason], ["normal", "orca-multi-agent-disabled"], String(value));
  }
  assert.deepEqual(snapshotTree(f.root), before);
  assert.equal(stateOf(f, w), "completed");
});

test("integrates two workers: files applied, checks run before and after, evidence verified, attempts settled, positive cleanup removes only the released tree", async (t: TestContext) => {
  const f = fixture(t);
  const w1 = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "w1 changed a\n"));
  const w2 = worker(f, "w2", (dir) => fs.writeFileSync(path.join(dir, "d.txt"), "w2 new d\n"));
  complete(f, w1);
  complete(f, w2);
  const released = { released: true, state: "released", processAction: "none" };
  const outcome = await run(options(f, [{ ...w1, settlement: released, claims: ["a.txt"] }, { ...w2, claims: ["d.txt"] }]));
  assert.deepEqual([outcome.status, outcome.reason], ["integrated", "integrated"]);
  assert.equal(read(f.root, "a.txt"), "w1 changed a\n");
  assert.equal(read(f.root, "d.txt"), "w2 new d\n");
  assert.deepEqual(outcome.baselineChecks?.map((c) => c.ok), [true]);
  assert.deepEqual(outcome.checks?.map((c) => c.ok), [true]);
  for (const w of [w1, w2]) {
    assert.equal(stateOf(f, w), "settled");
    assert.equal(verifyEvidence({ root: f.root, attemptKey: w.attemptKey, deps }).status, "ok");
  }
  assert.equal(outcome.attempts[w1.attemptKey].cleanup, "removed");
  assert.equal(fs.existsSync(w1.worktree.path), false, "the released, clean, evidence-backed tree is removed");
  assert.equal(outcome.attempts[w2.attemptKey].cleanup, "not-attempted");
  assert.equal(fs.existsSync(w2.worktree.path), true, "no settlement proof means the tree stays");
  const again = await run(options(f, [w1, w2]));
  assert.equal(again.status, "integrated");
  assert.deepEqual(Object.values(again.attempts).map((r) => r.state), ["already-reconciled", "already-reconciled"]);
});

test("only an attempt completed by its own worker is integrated", async (t: TestContext) => {
  const f = fixture(t);
  const done = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "done\n"));
  const running = worker(f, "w2", (dir) => fs.writeFileSync(path.join(dir, "b.txt"), "not yet\n"));
  const unknown = worker(f, "w3", (dir) => fs.writeFileSync(path.join(dir, "c.txt"), "no record\n"));
  complete(f, done);
  complete(f, running, "launched");
  const outcome = await run(options(f, [done, running, unknown]));
  assert.equal(outcome.status, "integrated");
  assert.deepEqual([outcome.attempts[running.attemptKey].reason, outcome.attempts[unknown.attemptKey].reason], ["not-completed", "ledger-missing"]);
  assert.equal(read(f.root, "b.txt"), "b.txt baseline\n");
  assert.equal(read(f.root, "c.txt"), "c.txt baseline\n");
});

test("a worker whose diff is not admissible is excluded and the others still integrate", async (t: TestContext) => {
  const f = fixture(t);
  const hostile = worker(f, "w1", (dir) => fs.symlinkSync("/etc/passwd", path.join(dir, "link")));
  const fine = worker(f, "w2", (dir) => fs.writeFileSync(path.join(dir, "b.txt"), "fine\n"));
  complete(f, hostile);
  complete(f, fine);
  const outcome = await run(options(f, [hostile, fine]));
  assert.equal(outcome.status, "integrated");
  assert.equal(outcome.attempts[hostile.attemptKey].reason, "admission:symlink");
  assert.equal(fs.existsSync(path.join(f.root, "link")), false);
  assert.equal(read(f.root, "b.txt"), "fine\n");
  assert.equal(stateOf(f, hostile), "completed");
});

test("claims are compared with the measured diff: a lying list excludes the worker unless a person confirms", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => { fs.writeFileSync(path.join(dir, "a.txt"), "quietly changed\n"); fs.writeFileSync(path.join(dir, "b.txt"), "also changed\n"); });
  complete(f, w);
  const lying = { ...w, claims: ["a.txt"] };
  const refused = await run(options(f, [lying]));
  assert.deepEqual([refused.status, refused.attempts[w.attemptKey].reason], ["refused", "claim-mismatch"]);
  assert.equal(read(f.root, "b.txt"), "b.txt baseline\n");
  const confirmed = await run(options(f, [lying], { humanConfirmed: true }));
  assert.equal(confirmed.status, "integrated");
  assert.equal(read(f.root, "b.txt"), "also changed\n", "the measured diff, not the claim, was applied");
});

test("a diff that touches check definitions needs a person before any check runs", { timeout: 120000 }, async (t: TestContext) => {
  for (const file of ["package.json", "ai-framework/scripts/x.mts", "tests/a.test.mts", ".claude/hooks/h.mts"]) {
    const f = fixture(t);
    const w = worker(f, "w1", (dir) => { fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.writeFileSync(path.join(dir, file), "{}\n"); });
    complete(f, w);
    const refused = await run(options(f, [w]));
    assert.deepEqual([refused.status, refused.attempts[w.attemptKey].reason], ["refused", "check-definitions-changed"], file);
    assert.equal(fs.existsSync(path.join(f.root, file)), false, file);
    assert.equal((await run(options(f, [w], { humanConfirmed: true }))).status, "integrated", file);
  }
});

test("a check that passed at the baseline and fails after the apply rolls back only the touched paths and leaves user edits alone", async (t: TestContext) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.root, "c.txt"), "user uncommitted edit\n");
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "BAD\n"));
  complete(f, w);
  const outcome = await run(options(f, [w], { runChecks: ["nobad"] }));
  assert.deepEqual([outcome.status, outcome.reason], ["rolled-back", "check-failed:nobad"]);
  assert.equal(read(f.root, "a.txt"), "a.txt baseline\n");
  assert.equal(read(f.root, "c.txt"), "user uncommitted edit\n");
  assert.equal(stateOf(f, w), "completed");
  assert.equal(verifyEvidence({ root: f.root, attemptKey: w.attemptKey, deps }).status, "missing", "no evidence for a rolled-back change");
});

test("a check that already fails on the baseline is not blamed on the worker", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "fine\n"));
  complete(f, w);
  const outcome = await run(options(f, [w], { runChecks: ["fail"] }));
  assert.equal(outcome.status, "integrated");
  assert.deepEqual(outcome.baselineFailing, ["fail"]);
  assert.equal(read(f.root, "a.txt"), "fine\n");
});

test("overlap with the user's uncommitted work and a moved baseline refuse before any write", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "worker\n"));
  complete(f, w);
  fs.writeFileSync(path.join(f.root, "a.txt"), "user edit\n");
  const overlap = await run(options(f, [w]));
  assert.deepEqual([overlap.status, overlap.reason], ["refused", "apply:dirty-overlap"]);
  assert.equal(read(f.root, "a.txt"), "user edit\n");
  fs.writeFileSync(path.join(f.root, "a.txt"), "a.txt baseline\n");
  fs.writeFileSync(path.join(f.root, "b.txt"), "moved\n");
  git(f.root, "add", "-A");
  git(f.root, "commit", "-q", "-m", "move head");
  const moved = await run(options(f, [w]));
  assert.deepEqual([moved.status, moved.reason], ["refused", "apply:baseline-moved"]);
  assert.equal(stateOf(f, w), "completed");
});

test("checks come only from the trusted catalog and run with a scrubbed environment", { timeout: 120000 }, async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "fine\n"));
  complete(f, w);
  for (const [runChecks, checks] of [[["rm -rf /"], CATALOG], [["missing"], CATALOG], [["bad"], { bad: { command: "./relative.sh", args: [] } }],
    [["bad"], { bad: { command: "sh -c x", args: [] } }], [["__proto__"], CATALOG], [["bad"], { bad: { command: NODE, args: [1 as unknown as string] } }]] as const) {
    const outcome = await run(options(f, [w], { runChecks, checks }));
    assert.deepEqual([outcome.status, outcome.reason], ["refused", "check-not-in-catalog"], JSON.stringify(runChecks));
  }
  assert.equal(read(f.root, "a.txt"), "a.txt baseline\n");
  const outcome = await run(options(f, [w], { runChecks: ["env"] }));
  assert.equal(outcome.status, "integrated");
  assert.match(outcome.checks?.[0].output ?? "", /token=none/);
});

test("invalid inputs are refused before anything is read or written", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "x\n"));
  complete(f, w);
  const before = snapshotTree(f.root);
  const cases: Array<[Record<string, unknown>, string]> = [
    [{ baseline: "main" }, "baseline-invalid"], [{ baseline: "-" + "a".repeat(39) }, "baseline-invalid"], [{ attempts: [] }, "attempts-invalid"],
    [{ attempts: [w, w] }, "attempts-invalid"], [{ attempts: [{ ...w, attemptKey: "attempt:../x" }] }, "attempts-invalid"],
    [{ attempts: [{ ...w, worktree: { ...w.worktree, baseline: "b".repeat(40) } }] }, "attempts-invalid"],
    [{ deadlineMs: performance.now() + 0.2 }, "time-budget"], [{ deadlineMs: Number.NaN }, "time-budget"],
  ];
  for (const [extra, reason] of cases) {
    const outcome = await run(options(f, [w], extra));
    assert.deepEqual([outcome.status, outcome.reason], ["refused", reason], JSON.stringify(Object.keys(extra)));
  }
  assert.deepEqual(snapshotTree(f.root), before);
});

test("a rerun after a crash between integration and the ledger update re-proves the change against this worker's diff and settles without applying again", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "applied once\n"));
  complete(f, w);
  const admission = await admitDiff({ worktree: w.worktree.path, baseline: f.baseline, deps });
  assert.equal(admission.status, "admitted");
  if (admission.status !== "admitted") return;
  fs.writeFileSync(path.join(f.root, "a.txt"), "applied once\n");
  assert.equal(copyEvidence({ root: f.root, attemptKey: w.attemptKey, patch: admission.patch, entries: admission.entries, deps }).status, "ok");
  const outcome = await run(options(f, [w]));
  assert.deepEqual([outcome.status, outcome.attempts[w.attemptKey].state, outcome.attempts[w.attemptKey].evidence], ["integrated", "integrated", "ok"]);
  assert.equal(stateOf(f, w), "settled");
  assert.equal(read(f.root, "a.txt"), "applied once\n");
});

test("evidence for a different patch is never accepted as this worker's proof, so a forged folder cannot settle an attempt", async (t: TestContext) => {
  const f = fixture(t);
  const real = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "real change\n"));
  const other = worker(f, "w2", (dir) => fs.writeFileSync(path.join(dir, "b.txt"), "other change\n"));
  complete(f, real);
  const forgedAdmission = await admitDiff({ worktree: other.worktree.path, baseline: f.baseline, deps });
  assert.equal(forgedAdmission.status, "admitted");
  if (forgedAdmission.status !== "admitted") return;
  fs.writeFileSync(path.join(f.root, "b.txt"), "other change\n");
  assert.equal(copyEvidence({ root: f.root, attemptKey: real.attemptKey, patch: forgedAdmission.patch, entries: forgedAdmission.entries, deps }).status, "ok");
  assert.equal(verifyEvidence({ root: f.root, attemptKey: real.attemptKey, deps }).status, "ok", "the forged evidence is self-consistent");
  const outcome = await run(options(f, [real]));
  assert.equal(outcome.attempts[real.attemptKey].state, "integrated");
  assert.equal(outcome.attempts[real.attemptKey].evidence, "failed", "the existing evidence belongs to another patch");
  assert.equal(stateOf(f, real), "completed", "not settled on forged evidence");
});

test("a settled attempt without verifiable evidence is excluded", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "x\n"));
  complete(f, w);
  assert.equal(createLedger(f.root, deps).update(w.attemptKey, { state: "settled" }).status, "ok");
  const outcome = await run(options(f, [w]));
  assert.deepEqual([outcome.status, outcome.attempts[w.attemptKey].reason], ["refused", "settled-without-evidence"]);
});

test("a rename round-trips: the delete and the rename entry are one fact in the evidence manifest", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => git(dir, "mv", "a.txt", "a2.txt"));
  complete(f, w);
  const outcome = await run(options(f, [w]));
  assert.deepEqual([outcome.status, outcome.attempts[w.attemptKey].evidence], ["integrated", "ok"]);
  assert.equal(fs.existsSync(path.join(f.root, "a.txt")), false);
  assert.equal(read(f.root, "a2.txt"), "a.txt baseline\n");
  assert.equal(stateOf(f, w), "settled");
});

test("a worker cannot land files in the local data directory (ledger, snapshots, evidence)", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => {
    fs.mkdirSync(path.join(dir, ".project/metrics/orca-evidence/w2"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".project/metrics/orca-evidence/w2/manifest.json"), "{}");
    git(dir, "add", "-f", "-A");
    git(dir, "commit", "-q", "-m", "plant");
  }, false);
  complete(f, w);
  const outcome = await run(options(f, [w]));
  assert.equal(outcome.attempts[w.attemptKey].reason, "admission:path-local-data");
  assert.equal(fs.existsSync(path.join(f.root, ".project/metrics/orca-evidence/w2")), false);
});

test("a filter driver in the shared git directory never runs: apply refuses before git can execute it", async (t: TestContext) => {
  const f = fixture(t);
  const marker = path.join(path.dirname(f.root), "filter-ran");
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "worker\n"));
  complete(f, w);
  // The worker (which shares the coordinator's git directory) installs the driver only after its own commit.
  git(f.root, "config", "filter.x.clean", `touch ${marker}; cat`);
  git(f.root, "config", "filter.x.smudge", `touch ${marker}; cat`);
  fs.writeFileSync(path.join(f.root, ".git/info/attributes"), "* filter=x\n");
  const outcome = await run(options(f, [w]));
  assert.deepEqual([outcome.status, outcome.reason], ["refused", "apply:filter-driver"]);
  assert.equal(fs.existsSync(marker), false, "the filter command never ran during reconcile");
  assert.equal(read(f.root, "a.txt"), "a.txt baseline\n");
});

test("an index flag that hides a user's edit from git status does not let a worker hunk merge into it", async (t: TestContext) => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.root, "sub"));
  fs.writeFileSync(path.join(f.root, "sub/big.txt"), Array.from({ length: 30 }, (_, i) => `line ${i}`).join("\n") + "\n");
  git(f.root, "add", "-A");
  git(f.root, "commit", "-q", "-m", "sub");
  const baseline = git(f.root, "rev-parse", "HEAD");
  const fx: Fixture = { ...f, baseline };
  const w = worker(fx, "w1", (dir) => fs.writeFileSync(path.join(dir, "sub/big.txt"), fs.readFileSync(path.join(dir, "sub/big.txt"), "utf8").replace("line 0\n", "WORKER\n")));
  complete(fx, w);
  const user = fs.readFileSync(path.join(f.root, "sub/big.txt"), "utf8").replace("line 29\n", "USER UNSAVED\n");
  fs.writeFileSync(path.join(f.root, "sub/big.txt"), user);
  git(f.root, "update-index", "--assume-unchanged", "sub/big.txt");
  assert.equal(git(f.root, "status", "--porcelain"), "", "git status really is blind to the edit");
  const outcome = await run(options(fx, [w]));
  assert.deepEqual([outcome.status, outcome.reason], ["refused", "apply:dirty-overlap"]);
  assert.equal(fs.readFileSync(path.join(f.root, "sub/big.txt"), "utf8"), user);
});

test("an uncommitted edit in a subdirectory is protected like a root-level one", async (t: TestContext) => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.root, "deep/er"), { recursive: true });
  fs.writeFileSync(path.join(f.root, "deep/er/x.txt"), "x\n");
  git(f.root, "add", "-A");
  git(f.root, "commit", "-q", "-m", "deep");
  const fx: Fixture = { ...f, baseline: git(f.root, "rev-parse", "HEAD") };
  const w = worker(fx, "w1", (dir) => fs.writeFileSync(path.join(dir, "deep/er/x.txt"), "worker\n"));
  complete(fx, w);
  fs.writeFileSync(path.join(f.root, "deep/er/x.txt"), "user\n");
  const outcome = await run(options(fx, [w]));
  assert.deepEqual([outcome.status, outcome.reason], ["refused", "apply:dirty-overlap"]);
  assert.equal(read(f.root, "deep/er/x.txt"), "user\n");
});

test("cleanup never executes a relative PATH entry from the worker tree", async (t: TestContext) => {
  const base = fixture(t);
  fs.appendFileSync(path.join(base.root, ".gitignore"), "node_modules/\n");
  git(base.root, "add", "-A");
  git(base.root, "commit", "-q", "-m", "ignore node_modules");
  const f: Fixture = { ...base, baseline: git(base.root, "rev-parse", "HEAD") };
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "fine\n"));
  complete(f, w);
  const marker = path.join(path.dirname(f.root), "fake-git-ran");
  const bin = path.join(w.worktree.path, "node_modules/.bin");
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(path.join(bin, "git"), `#!/bin/sh\ntouch ${marker}\nexit 0\n`, { mode: 0o755 });
  const hostile = { ...deps, proc: { ...deps.proc, env: { ...deps.proc.env, PATH: `node_modules/.bin${path.delimiter}${process.env.PATH}` } } };
  const released = { released: true, state: "released", processAction: "none" };
  const outcome = await run(options(f, [{ ...w, settlement: released }], { deps: hostile }));
  assert.equal(outcome.status, "integrated", "the planted binary is ignored, so the diff is admitted and cleanup is reached");
  assert.equal(fs.existsSync(marker), false, "the worker's fake git was never executed");
});

test("rollbackOnFailure:false keeps the change but reports the failing check instead of hiding it", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "BAD\n"));
  complete(f, w);
  const outcome = await run(options(f, [w], { runChecks: ["nobad"], rollbackOnFailure: false }));
  assert.deepEqual([outcome.status, outcome.reason, outcome.failedChecks], ["integrated", "integrated-with-failing-checks", ["nobad"]]);
  assert.equal(read(f.root, "a.txt"), "BAD\n");
});

test("an error thrown while running the post-apply checks rolls the change back instead of escaping", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "changed\n"));
  complete(f, w);
  let calls = 0;
  const throwing = { ...deps, child: { ...deps.child, run: async (command: string, args: string[], opts?: unknown) => {
    if (command === NODE && ++calls === 2) throw new Error("boom");
    return deps.child.run(command, args, opts as never);
  } } };
  const outcome = await run(options(f, [w], { deps: throwing }));
  assert.deepEqual([outcome.status, outcome.reason], ["rolled-back", "check-failed:check-error"]);
  assert.equal(read(f.root, "a.txt"), "a.txt baseline\n");
});

test("the persisted final state records cleaned or integrated-uncleaned, and an already-reconciled attempt still gets its cleanup", async (t: TestContext) => {
  const f = fixture(t);
  const w1 = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "one\n"));
  const w2 = worker(f, "w2", (dir) => fs.writeFileSync(path.join(dir, "b.txt"), "two\n"));
  complete(f, w1);
  complete(f, w2);
  const released = { released: true, state: "released", processAction: "none" };
  const retained = { released: false, state: "retained", reason: "user_takeover" };
  const first = await run(options(f, [{ ...w1, settlement: released }, { ...w2, settlement: retained }]));
  const evidence = (w: ReconcileAttempt): string => fs.readFileSync(path.join(f.root, ".project/metrics/orca-evidence", w.attemptKey.slice("attempt:".length), "final.json"), "utf8");
  assert.match(evidence(w1), /"cleaned"/);
  assert.match(evidence(w2), /integrated-uncleaned/);
  assert.equal(first.attempts[w2.attemptKey].cleanup, "integrated-uncleaned");
  const again = await run(options(f, [{ ...w2, settlement: released }]));
  assert.equal(again.attempts[w2.attemptKey].state, "already-reconciled");
  assert.equal(again.attempts[w2.attemptKey].cleanup, "removed", "the tree is clean and now released, so the cleanup proceeds");
  assert.match(evidence(w2), /integrated-uncleaned/, "the first recorded final state wins");
});

test("paths the coordinator ignores or that define checks need a person; widened definition patterns are covered", { timeout: 120000 }, async (t: TestContext) => {
  for (const file of ["node_modules/.bin/vitest", "src/.gitattributes", ".npmrc", "vitest.config.ts", "pkg/__tests__/a.ts", "Makefile", "out/result.log"]) {
    const f = fixture(t);
    fs.appendFileSync(path.join(f.root, ".gitignore"), "node_modules/\n*.log\n");
    git(f.root, "add", "-A");
    git(f.root, "commit", "-q", "-m", "ignore");
    const fx: Fixture = { ...f, baseline: git(f.root, "rev-parse", "HEAD") };
    const w = worker(fx, "w1", (dir) => { fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.writeFileSync(path.join(dir, file), "x\n"); git(dir, "add", "-f", "-A"); }, false);
    git(w.worktree.path, "commit", "-q", "-m", "w");
    complete(fx, w);
    const refused = await run(options(fx, [w]));
    assert.equal(refused.status, "refused", file);
    assert.match(refused.attempts[w.attemptKey].reason ?? "", /check-definitions-changed|ignored-path/, file);
    assert.equal(fs.existsSync(path.join(f.root, file)), false, file);
  }
});

test("a retained or unreleased worker tree is kept as integrated-uncleaned with its path listed", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "kept\n"));
  complete(f, w);
  const retained = { released: false, state: "retained", reason: "user_takeover", processAction: "none" };
  const outcome = await run(options(f, [{ ...w, settlement: retained }]));
  assert.equal(outcome.status, "integrated");
  assert.equal(outcome.attempts[w.attemptKey].cleanup, "integrated-uncleaned");
  assert.ok((outcome.attempts[w.attemptKey].leftover ?? []).length > 0);
  assert.equal(fs.existsSync(w.worktree.path), true);
  assert.equal(stateOf(f, w), "settled");
});

test("a refused or corrupt ledger slot stops the whole reconcile before any apply", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "x\n"));
  complete(f, w);
  fs.writeFileSync(path.join(f.root, ".project/metrics/orca-ledger/attempt-w1.json"), "{broken");
  const outcome = await run(options(f, [w]));
  assert.deepEqual([outcome.status, outcome.reason], ["refused", "ledger-corrupt"]);
  assert.equal(read(f.root, "a.txt"), "a.txt baseline\n");
  assert.equal(fs.readFileSync(path.join(f.root, ".project/metrics/orca-ledger/attempt-w1.json"), "utf8"), "{broken");
});

test("a manifest with no entries or files never verifies, even when it is self-consistent", async (t: TestContext) => {
  const f = fixture(t);
  const dir = path.join(f.root, ".project/metrics/orca-evidence/w1");
  fs.mkdirSync(dir, { recursive: true });
  const sha = deps.crypto.sha256Hex(new TextEncoder().encode(""));
  fs.writeFileSync(path.join(dir, "patch.diff"), "");
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ version: 1, attemptKey: "attempt:w1", patchSha256: sha, patchBytes: 0, entries: [], files: [] }));
  assert.notEqual(verifyEvidence({ root: f.root, attemptKey: "attempt:w1", deps }).status, "ok");
});

test("a ledger that cannot be updated is reported instead of claiming the attempt settled", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "x\n"));
  complete(f, w);
  const ledgerDir = path.join(f.root, ".project/metrics/orca-ledger");
  if (process.getuid?.() === 0) return t.skip("root ignores directory modes");
  fs.chmodSync(ledgerDir, 0o500);
  try {
    const outcome = await run(options(f, [w]));
    assert.equal(outcome.attempts[w.attemptKey].reason, "ledger-update-failed");
  } finally { fs.chmodSync(ledgerDir, 0o700); }
  assert.equal(stateOf(f, w), "completed");
});

test("any configured filter driver stops the apply, because git status scans the whole tree, not only the touched paths", async (t: TestContext) => {
  const f = fixture(t);
  const marker = path.join(path.dirname(f.root), "untouched-filter-ran");
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "worker\n"));
  complete(f, w);
  // The driver is wired to a file the worker never touches, and the user has a same-size edit to it.
  git(f.root, "config", "filter.evil.clean", `touch ${marker}; cat`);
  fs.writeFileSync(path.join(f.root, ".git/info/attributes"), "c.txt filter=evil\n");
  fs.writeFileSync(path.join(f.root, "c.txt"), "c.txt BASELINE\n");
  const outcome = await run(options(f, [w]));
  assert.deepEqual([outcome.status, outcome.reason], ["refused", "apply:filter-driver"]);
  assert.equal(fs.existsSync(marker), false, "no git command ran the driver");
  assert.equal(read(f.root, "a.txt"), "a.txt baseline\n");
});

test("a filter driver configured after the apply keeps the worker tree at cleanup", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "fine\n"));
  complete(f, w);
  assert.equal((await run(options(f, [w]))).status, "integrated");
  git(f.root, "config", "filter.lfs.clean", "cat");
  const released = { released: true, state: "released", processAction: "none" };
  const again = await run(options(f, [{ ...w, settlement: released }]));
  assert.equal(again.attempts[w.attemptKey].cleanup, "integrated-uncleaned");
  assert.equal(fs.existsSync(w.worktree.path), true);
  git(f.root, "config", "--unset", "filter.lfs.clean");
});

test("a nested repository in the worker tree keeps it: git status would run the nested repository's filters", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "fine\n"));
  complete(f, w);
  assert.equal((await run(options(f, [w]))).status, "integrated");
  const marker = path.join(path.dirname(f.root), "nested-filter-ran");
  const nested = path.join(w.worktree.path, "sub");
  fs.mkdirSync(nested);
  git(nested, "init", "-q");
  fs.writeFileSync(path.join(nested, "x.txt"), "x\n");
  git(nested, "add", "-A");
  git(nested, "commit", "-q", "-m", "n");
  git(nested, "config", "filter.evil.clean", `touch ${marker}; cat`);
  fs.writeFileSync(path.join(nested, ".git/info/attributes"), "* filter=evil\n");
  git(w.worktree.path, "update-index", "--add", "--cacheinfo", `160000,${git(nested, "rev-parse", "HEAD")},sub`);
  const released = { released: true, state: "released", processAction: "none" };
  const again = await run(options(f, [{ ...w, settlement: released }]));
  assert.equal(again.attempts[w.attemptKey].cleanup, "integrated-uncleaned");
  assert.equal(fs.existsSync(marker), false, "the nested repository's filter never ran");
  assert.equal(fs.existsSync(w.worktree.path), true);
});

test("a mode-only change is applied, not mistaken for already applied, and the evidence checks the executable bit", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => fs.chmodSync(path.join(dir, "a.txt"), 0o755));
  complete(f, w);
  const outcome = await run(options(f, [w]));
  assert.deepEqual([outcome.status, outcome.attempts[w.attemptKey].evidence], ["integrated", "ok"]);
  assert.equal((fs.statSync(path.join(f.root, "a.txt")).mode & 0o111) !== 0, true, "the chmod landed");
  fs.chmodSync(path.join(f.root, "a.txt"), 0o644);
  assert.notEqual(verifyEvidence({ root: f.root, attemptKey: w.attemptKey, deps }).status, "ok", "dropping the bit invalidates the proof");
});

test("a user's uncommitted chmod is protected even when core.fileMode hides it from git", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "worker\n"));
  complete(f, w);
  fs.chmodSync(path.join(f.root, "a.txt"), 0o755);
  git(f.root, "config", "core.fileMode", "false");
  const outcome = await run(options(f, [w]));
  assert.deepEqual([outcome.status, outcome.reason], ["refused", "apply:dirty-overlap"]);
  assert.equal((fs.statSync(path.join(f.root, "a.txt")).mode & 0o111) !== 0, true);
});

test("a change already in the tree still has to pass the checks before it is settled", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "BAD\n"));
  complete(f, w);
  fs.writeFileSync(path.join(f.root, "a.txt"), "BAD\n");
  const outcome = await run(options(f, [w], { runChecks: ["nobad"] }));
  assert.deepEqual([outcome.status, outcome.reason], ["refused", "checks-failing-on-resume:nobad"]);
  assert.equal(stateOf(f, w), "completed");
  assert.equal(read(f.root, "a.txt"), "BAD\n", "nothing is rolled back or settled; a person decides");
});

test("an error after one worker settled never rolls back that worker's change", async (t: TestContext) => {
  const f = fixture(t);
  const w1 = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "one\n"));
  const w2 = worker(f, "w2", (dir) => fs.writeFileSync(path.join(dir, "b.txt"), "two\n"));
  complete(f, w1);
  complete(f, w2);
  const released = { released: true, state: "released", processAction: "none" };
  // A settlement that throws when read escapes decideCleanup for the second worker, after the first is settled and cleaned.
  const hostile = new Proxy({}, { get() { throw new Error("boom"); }, has() { throw new Error("boom"); }, ownKeys() { throw new Error("boom"); }, getPrototypeOf() { throw new Error("boom"); } });
  const outcome = await run(options(f, [{ ...w1, settlement: released }, { ...w2, settlement: hostile }]));
  assert.deepEqual([outcome.status, outcome.reason], ["refused", "error-after-apply-partial"]);
  assert.equal(read(f.root, "a.txt"), "one\n", "the settled worker's change stays");
  assert.equal(read(f.root, "b.txt"), "two\n");
  assert.equal(stateOf(f, w1), "settled");
});

test("evidence is reused only when its entries equal this worker's admitted entries", async (t: TestContext) => {
  const f = fixture(t);
  const w = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "real\n"));
  complete(f, w);
  const admission = await admitDiff({ worktree: w.worktree.path, baseline: f.baseline, deps });
  assert.equal(admission.status, "admitted");
  if (admission.status !== "admitted") return;
  fs.writeFileSync(path.join(f.root, "a.txt"), "real\n");
  fs.writeFileSync(path.join(f.root, "b.txt"), "extra\n");
  const tampered = [...admission.entries, { path: "b.txt", kind: "add" as const, mode: "100644" as const, binary: false, size: 6 }];
  assert.equal(copyEvidence({ root: f.root, attemptKey: w.attemptKey, patch: admission.patch, entries: tampered, deps }).status, "ok");
  const outcome = await run(options(f, [w]));
  assert.notEqual(stateOf(f, w), "settled", "same patch but different entries is not this worker's proof");
  assert.equal(outcome.attempts[w.attemptKey].evidence, "failed");
  assert.equal(outcome.reason, "integrated-evidence-failed");
});

test("check-definition patterns are case-insensitive and cover common runner files", { timeout: 120000 }, async (t: TestContext) => {
  for (const file of ["GNUmakefile", "makefile", "pkg/PACKAGE.JSON", "foo_test.mjs", "test-foo.mjs", "test.mjs", "babel.config.json", ".mocharc.yml", "pytest.ini", "tox.ini", "go.mod", "spec/a.rb"]) {
    const f = fixture(t);
    const w = worker(f, "w1", (dir) => { fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.writeFileSync(path.join(dir, file), "x\n"); });
    complete(f, w);
    const refused = await run(options(f, [w]));
    assert.equal(refused.attempts[w.attemptKey]?.reason, "check-definitions-changed", file);
  }
});

test("a resumed attempt in a mixed batch is settled only if the checks pass, like one resumed alone", async (t: TestContext) => {
  const f = fixture(t);
  const resumed = worker(f, "w1", (dir) => fs.writeFileSync(path.join(dir, "a.txt"), "BAD\n"));
  const fresh = worker(f, "w2", (dir) => fs.writeFileSync(path.join(dir, "b.txt"), "fine\n"));
  complete(f, resumed);
  complete(f, fresh);
  fs.writeFileSync(path.join(f.root, "a.txt"), "BAD\n");
  const outcome = await run(options(f, [resumed, fresh], { runChecks: ["nobad"] }));
  assert.equal(outcome.attempts[resumed.attemptKey].reason, "checks-failing-on-resume:nobad");
  assert.equal(stateOf(f, resumed), "completed", "not settled without passing checks");
  assert.equal(outcome.attempts[fresh.attemptKey].state, "integrated");
  assert.equal(stateOf(f, fresh), "settled");
});
