import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";

import { createNodeDeps } from "./runtime/node.mts";
import type { RunResult, RuntimeDeps, SpawnOptions } from "./runtime/types.mts";

// ORCA_EVIDENCE_UNDER_TEST lets a mutant copy of the module be exercised by the same assertions (mutant proofs).
const mod = await import(process.env.ORCA_EVIDENCE_UNDER_TEST ?? "./orca-evidence.mts") as typeof import("./orca-evidence.mts");
const { copyEvidence, decideCleanup, performCleanup, recordFinalState, verifyEvidence } = mod;

const HERE = import.meta.dirname;
const deps = createNodeDeps();
const KEY = "attempt:r3-one";
const POSITIVE = { released: true, state: "released", processAction: "none" };
const ENTRY = { path: "a.txt", kind: "modify" as const, mode: "100644" as const, binary: false, size: 7 };

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args], {
    cwd, encoding: "utf8", env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" },
  });
}
const write = (file: string, text: string) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };

interface Fixture { base: string; root: string; ws: string; wt: string; baseline: string; patch: string }
/** A coordinator repo, a separate workspace directory and a linked worker worktree with one worker commit, already "applied" to root. */
function fixture(t: TestContext): Fixture {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "orca-ev-")));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const root = path.join(base, "coord");
  const ws = path.join(base, "workspaces");
  fs.mkdirSync(root);
  fs.mkdirSync(ws);
  git(root, "init", "-q", "-b", "main");
  write(path.join(root, "a.txt"), "base\n");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "base");
  const baseline = git(root, "rev-parse", "HEAD").trim();
  const wt = path.join(ws, "wt1");
  git(root, "worktree", "add", "-q", "-b", "worker-1", wt);
  write(path.join(wt, "a.txt"), "worked\n");
  git(wt, "add", "-A");
  git(wt, "commit", "-q", "-m", "work");
  const patch = git(wt, "diff", "--binary", baseline, "HEAD");
  write(path.join(root, "a.txt"), "worked\n");
  return { base, root, ws, wt, baseline, patch };
}
const entries = [ENTRY];
function copy(f: Fixture, extra: { checks?: string; patch?: string } = {}) {
  return copyEvidence({ root: f.root, attemptKey: KEY, patch: extra.patch ?? f.patch, entries, ...(extra.checks !== undefined ? { checks: extra.checks } : {}), deps });
}
function decide(f: Fixture, over: Partial<{ settlement: unknown; path: string; allowedRoots: string[]; manifestSha256: string; deadlineMs: number; deps: RuntimeDeps }> = {}) {
  return decideCleanup({
    evidence: { root: f.root, attemptKey: KEY, ...(over.manifestSha256 ? { manifestSha256: over.manifestSha256 } : {}) },
    settlement: "settlement" in over ? over.settlement : POSITIVE,
    worktree: { path: over.path ?? f.wt, baseline: f.baseline, allowedRoots: over.allowedRoots ?? [f.ws] },
    deps: over.deps ?? deps,
    ...(over.deadlineMs !== undefined ? { deadlineMs: over.deadlineMs } : {}),
  });
}
const evidenceDir = (f: Fixture) => path.join(f.root, ".project/metrics/orca-evidence/r3-one");
function proven(t: TestContext) {
  const f = fixture(t);
  const copied = copy(f, { checks: "ok\n" });
  assert.equal(copied.status, "ok");
  return { f, copied: copied as Extract<ReturnType<typeof copy>, { status: "ok" }> };
}

test("copies the patch, manifest and checks outside the worker tree and verifies them", (t: TestContext) => {
  const { f, copied } = proven(t);
  assert.equal(copied.dir, evidenceDir(f));
  assert.ok(!copied.dir.startsWith(f.wt + path.sep));
  assert.equal(fs.readFileSync(path.join(copied.dir, "patch.diff"), "utf8"), f.patch);
  assert.equal(fs.readFileSync(path.join(copied.dir, "checks.txt"), "utf8"), "ok\n");
  const manifest = JSON.parse(fs.readFileSync(path.join(copied.dir, "manifest.json"), "utf8"));
  assert.equal(manifest.files[0].path, "a.txt");
  assert.match(manifest.files[0].sha256, /^[0-9a-f]{64}$/);
  for (const name of ["patch.diff", "manifest.json", "checks.txt"]) assert.equal(fs.statSync(path.join(copied.dir, name)).mode & 0o777, 0o600);
  assert.deepEqual(fs.readdirSync(copied.dir).filter((n) => n.startsWith(".tmp-")), []);
  const verified = verifyEvidence({ root: f.root, attemptKey: KEY, deps });
  assert.equal(verified.status, "ok");
  assert.equal((verified as { manifestSha256: string }).manifestSha256, copied.manifestSha256);
});

test("copy is idempotent for identical content and refuses a different manifest", (t: TestContext) => {
  const { f, copied } = proven(t);
  const again = copy(f, { checks: "ok\n" });
  assert.deepEqual(again, copied);
  const differing = copy(f, { checks: "different\n" });
  assert.equal(differing.status, "conflict");
  const otherPatch = copy(f, { checks: "ok\n", patch: f.patch + "\n" });
  assert.equal(otherPatch.status, "conflict");
  assert.equal(verifyEvidence({ root: f.root, attemptKey: KEY, deps }).status, "ok");
});

test("rejects bad keys and unsafe entries", (t: TestContext) => {
  const f = fixture(t);
  for (const key of ["x", "attempt:", "attempt:../x", "attempt:a/b", "task:one", "attempt:.."]) {
    assert.equal(copyEvidence({ root: f.root, attemptKey: key, patch: "p", entries, deps }).status, "invalid", key);
    assert.equal(verifyEvidence({ root: f.root, attemptKey: key, deps }).status, "refused", key);
  }
  for (const bad of ["../x", "/etc/passwd", "a/../b", ".git/config", "a\nb"]) {
    const result = copyEvidence({ root: f.root, attemptKey: KEY, patch: "p", entries: [{ ...ENTRY, path: bad }], deps });
    assert.equal(result.status, "invalid", bad);
  }
  assert.equal(copyEvidence({ root: f.root, attemptKey: KEY, patch: "p", entries: [{ ...ENTRY, path: "nope.txt" }], deps }).status, "refused");
  assert.ok(!fs.existsSync(path.join(f.root, ".project/metrics/orca-evidence/r3-one/manifest.json")));
});

test("verify reports missing, mismatch, corrupt and refused distinctly", (t: TestContext) => {
  const f = fixture(t);
  assert.equal(verifyEvidence({ root: f.root, attemptKey: KEY, deps }).status, "missing");
  const copied = copy(f, { checks: "ok\n" }) as { dir: string };
  const patchFile = path.join(copied.dir, "patch.diff");
  const original = fs.readFileSync(patchFile);
  const flipped = Buffer.from(original);
  flipped[flipped.length - 2] ^= 1;
  fs.writeFileSync(patchFile, flipped);
  assert.equal(verifyEvidence({ root: f.root, attemptKey: KEY, deps }).status, "mismatch");
  fs.writeFileSync(patchFile, original);
  fs.writeFileSync(path.join(copied.dir, "checks.txt"), "ok!\n");
  assert.equal(verifyEvidence({ root: f.root, attemptKey: KEY, deps }).status, "mismatch");
  fs.writeFileSync(path.join(copied.dir, "checks.txt"), "ok\n");
  write(path.join(f.root, "a.txt"), "edited later\n");
  assert.equal(verifyEvidence({ root: f.root, attemptKey: KEY, deps }).status, "mismatch");
  write(path.join(f.root, "a.txt"), "worked\n");
  assert.equal(verifyEvidence({ root: f.root, attemptKey: KEY, deps }).status, "ok");
  const manifest = path.join(copied.dir, "manifest.json");
  const manifestText = fs.readFileSync(manifest, "utf8");
  fs.writeFileSync(manifest, "{not json");
  assert.equal(verifyEvidence({ root: f.root, attemptKey: KEY, deps }).status, "corrupt");
  fs.writeFileSync(manifest, JSON.stringify({ version: 1 }));
  assert.equal(verifyEvidence({ root: f.root, attemptKey: KEY, deps }).status, "corrupt");
  fs.writeFileSync(manifest, manifestText);
  assert.equal(verifyEvidence({ root: f.root, attemptKey: KEY, expectedManifestSha256: "0".repeat(64), deps }).status, "mismatch");
  fs.rmSync(patchFile);
  assert.equal(verifyEvidence({ root: f.root, attemptKey: KEY, deps }).status, "mismatch");
  fs.writeFileSync(path.join(f.base, "elsewhere"), "x");
  fs.symlinkSync(path.join(f.base, "elsewhere"), patchFile);
  assert.equal(verifyEvidence({ root: f.root, attemptKey: KEY, deps }).status, "refused");
  fs.rmSync(patchFile);
  fs.writeFileSync(patchFile, original);
  fs.rmSync(manifest);
  execFileSync("mkfifo", [manifest]);
  assert.equal(verifyEvidence({ root: f.root, attemptKey: KEY, deps }).status, "refused");
});

test("a symlink anywhere in the evidence path is refused and the victim stays untouched", (t: TestContext) => {
  for (const level of ["metrics", "orca-evidence", "attempt"] as const) {
    const f = fixture(t);
    const victim = path.join(f.base, `victim-${level}`);
    fs.mkdirSync(victim);
    const metrics = path.join(f.root, ".project/metrics");
    const evidence = path.join(metrics, "orca-evidence");
    fs.mkdirSync(level === "metrics" ? path.dirname(metrics) : level === "orca-evidence" ? metrics : evidence, { recursive: true });
    fs.symlinkSync(victim, level === "metrics" ? metrics : level === "orca-evidence" ? evidence : path.join(evidence, "r3-one"));
    assert.equal(copy(f).status, "refused", level);
    assert.deepEqual(fs.readdirSync(victim), [], level);
    assert.equal(verifyEvidence({ root: f.root, attemptKey: KEY, deps }).status, "refused", level);
  }
  const f = fixture(t);
  const victim = path.join(f.base, "victim-file");
  fs.writeFileSync(victim, "precious");
  const dir = path.join(f.root, ".project/metrics/orca-evidence/r3-one");
  fs.mkdirSync(dir, { recursive: true });
  fs.symlinkSync(victim, path.join(dir, "patch.diff"));
  assert.equal(copy(f).status, "refused");
  assert.equal(fs.readFileSync(victim, "utf8"), "precious");
  // A symlinked changed file in the coordinator tree is refused too.
  const g = fixture(t);
  fs.rmSync(path.join(g.root, "a.txt"));
  fs.writeFileSync(path.join(g.base, "target.txt"), "x");
  fs.symlinkSync(path.join(g.base, "target.txt"), path.join(g.root, "a.txt"));
  assert.equal(copy(g).status, "refused");
});

test("positive proof removes the worktree through the plain removal, and cleanup is idempotent", async (t: TestContext) => {
  const { f, copied } = proven(t);
  const decision = await decide(f, { manifestSha256: copied.manifestSha256 });
  assert.equal(decision.action, "remove");
  const first = await performCleanup(decision, deps);
  assert.deepEqual(first, { status: "ok", reason: "removed" });
  assert.ok(!fs.existsSync(f.wt));
  assert.deepEqual(await performCleanup(decision, deps), { status: "ok", reason: "already-gone" });
  const again = await decide(f);
  assert.equal(again.action, "remove");
  assert.deepEqual(await performCleanup(again, deps), { status: "ok", reason: "already-gone" });
  assert.equal(fs.readFileSync(path.join(f.root, "a.txt"), "utf8"), "worked\n");
  assert.equal(verifyEvidence({ root: f.root, attemptKey: KEY, deps }).status, "ok");
  const keepDecision = await decide(f, { settlement: null });
  assert.equal((await performCleanup(keepDecision, deps)).status, "refused");
});

test("every non-positive settlement keeps the tree", async (t: TestContext) => {
  const { f } = proven(t);
  const variants: Array<[string, unknown]> = [
    ["retained user_takeover", { released: false, state: "retained", reason: "user_takeover", processAction: "none" }],
    ["retained released-flag", { released: true, state: "retained", reason: "user_takeover", processAction: "none" }],
    ["user_takeover reason with released state", { released: true, state: "released", reason: "user_takeover" }],
    ["released false", { released: false, state: "released" }],
    ["state variants: Released", { released: true, state: "Released" }],
    ["state variants: released with space", { released: true, state: "released " }],
    ["state variants: releasing", { released: true, state: "releasing" }],
    ["state variants: unknown", { released: true, state: "unknown" }],
    ["missing", undefined],
    ["null", null],
    ["junk string", "not json"],
    ["array", [{ released: true, state: "released" }]],
    ["number", 7],
    ["released not boolean", { released: "true", state: "released" }],
    ["state not string", { released: true, state: 1 }],
    ["empty object", {}],
  ];
  for (const [name, settlement] of variants) {
    const decision = await decide(f, { settlement });
    assert.equal(decision.action, "keep", name);
    assert.ok(fs.existsSync(f.wt), name);
  }
  // A parseable JSON string of a positive receipt is accepted (Orca prints JSON text).
  assert.equal((await decide(f, { settlement: JSON.stringify(POSITIVE) })).action, "remove");
});

test("blocked cleanup reports integrated-uncleaned with leftover paths", async (t: TestContext) => {
  const { f } = proven(t);
  const decision = await decide(f, { settlement: { released: false, state: "retained", reason: "user_takeover" } });
  assert.equal(decision.action, "keep");
  if (decision.action === "keep") {
    assert.equal(decision.state, "integrated-uncleaned");
    assert.deepEqual(decision.leftover, [f.wt]);
  }
});

test("tampered evidence blocks cleanup", async (t: TestContext) => {
  const { f, copied } = proven(t);
  const patchFile = path.join(copied.dir, "patch.diff");
  const bytes = Buffer.from(fs.readFileSync(patchFile));
  bytes[bytes.length - 2] ^= 1;
  fs.writeFileSync(patchFile, bytes);
  const decision = await decide(f);
  assert.equal(decision.action, "keep");
  if (decision.action === "keep") assert.equal(decision.reason, "evidence-mismatch");
  assert.ok(fs.existsSync(f.wt));
  // Missing evidence blocks too; a wrong expected manifest hash blocks.
  const g = fixture(t);
  assert.equal((await decide(g)).action, "keep");
  copy(g);
  assert.equal((await decide(g, { manifestSha256: "f".repeat(64) })).action, "keep");
});

test("a dirty worker tree keeps the tree and lists what is left", async (t: TestContext) => {
  for (const mutate of [
    (f: Fixture) => write(path.join(f.wt, "scratch.txt"), "untracked"),
    (f: Fixture) => write(path.join(f.wt, "a.txt"), "edited after commit"),
    (f: Fixture) => { write(path.join(f.wt, "staged.txt"), "s"); git(f.wt, "add", "staged.txt"); },
  ]) {
    const { f } = proven(t);
    mutate(f);
    const decision = await decide(f);
    assert.equal(decision.action, "keep");
    if (decision.action === "keep") {
      assert.equal(decision.reason, "worktree-dirty");
      assert.ok(decision.leftover.length >= 2);
    }
    assert.ok(fs.existsSync(f.wt));
  }
});

test("commits the evidence does not account for keep the tree", async (t: TestContext) => {
  {
    const { f } = proven(t);
    write(path.join(f.wt, "extra.txt"), "unaccepted");
    git(f.wt, "add", "-A");
    git(f.wt, "commit", "-q", "-m", "extra");
    const decision = await decide(f);
    assert.equal(decision.action, "keep");
    if (decision.action === "keep") { assert.equal(decision.reason, "unaccepted-commits"); assert.ok(decision.leftover.some((p) => p.endsWith("extra.txt"))); }
  }
  {
    const { f } = proven(t);
    write(path.join(f.wt, "a.txt"), "different final bytes\n");
    git(f.wt, "commit", "-q", "-am", "rewrite");
    const decision = await decide(f);
    assert.equal(decision.action, "keep");
    if (decision.action === "keep") assert.equal(decision.reason, "unaccepted-commits");
  }
  {
    const { f } = proven(t);
    git(f.wt, "update-index", "--chmod=+x", "a.txt");
    git(f.wt, "commit", "-q", "-m", "mode");
    assert.equal((await decide(f)).action, "keep");
  }
  {
    // A baseline that is not an ancestor of the worker HEAD is not proof either.
    const { f } = proven(t);
    git(f.root, "checkout", "-q", "--orphan", "other");
    write(path.join(f.root, "z.txt"), "z");
    git(f.root, "add", "z.txt");
    git(f.root, "commit", "-q", "-m", "other");
    const unrelated = git(f.root, "rev-parse", "HEAD").trim();
    const decision = await decideCleanup({ evidence: { root: f.root, attemptKey: KEY }, settlement: POSITIVE, worktree: { path: f.wt, baseline: unrelated, allowedRoots: [f.ws] }, deps });
    assert.equal(decision.action, "keep");
  }
  {
    const { f } = proven(t);
    for (const baseline of ["--output=/tmp/x", "HEAD", "zz", ""]) {
      const decision = await decideCleanup({ evidence: { root: f.root, attemptKey: KEY }, settlement: POSITIVE, worktree: { path: f.wt, baseline, allowedRoots: [f.ws] }, deps });
      assert.equal(decision.action, "keep", baseline);
    }
  }
});

test("a worktree outside the allowed root, through a symlink, or not registered keeps the tree", async (t: TestContext) => {
  const { f } = proven(t);
  const elsewhere = path.join(f.base, "elsewhere");
  fs.mkdirSync(elsewhere);
  assert.equal((await decide(f, { allowedRoots: [elsewhere] })).action, "keep");
  assert.equal((await decide(f, { allowedRoots: [] })).action, "keep");
  assert.equal((await decide(f, { allowedRoots: [path.join(f.base, "missing")] })).action, "keep");
  assert.equal((await decide(f, { allowedRoots: [f.wt] })).action, "keep", "the root itself is not inside itself");
  assert.equal((await decide(f, { allowedRoots: [path.dirname(f.ws) + "/workspaces/../coord"] })).action, "keep");
  const link = path.join(f.ws, "link");
  fs.symlinkSync(f.wt, link);
  const viaLink = await decide(f, { path: link });
  assert.equal(viaLink.action, "keep");
  const dirLink = path.join(f.base, "dirlink");
  fs.symlinkSync(f.ws, dirLink);
  assert.equal((await decide(f, { path: path.join(dirLink, "wt1"), allowedRoots: [dirLink] })).action, "keep");
  assert.equal((await decide(f, { path: "relative/wt1" })).action, "keep");
  // The coordinator checkout itself, or a plain directory git does not list, is never removable.
  assert.equal((await decide(f, { path: f.root, allowedRoots: [f.base] })).action, "keep");
  const plain = path.join(f.ws, "plain");
  fs.mkdirSync(plain);
  assert.equal((await decide(f, { path: plain })).action, "keep");
  assert.ok(fs.existsSync(f.wt) && fs.existsSync(plain));
});

test("macOS /var alias: a path spelled through the alias is not accepted as the real path", async (t: TestContext) => {
  const { f } = proven(t);
  assert.equal(f.wt, fs.realpathSync(f.wt));
  const alias = f.wt.startsWith("/private/") ? f.wt.slice("/private".length) : undefined;
  if (alias === undefined) return;
  assert.equal(fs.realpathSync(alias), f.wt);
  assert.equal((await decide(f, { path: alias })).action, "keep");
  assert.equal((await decide(f, { allowedRoots: [f.ws.slice("/private".length)] })).action, "remove", "allowed roots are resolved, the worktree path is not");
});

test("module text never contains the forced removal, the prune subcommand, node: imports or any-casts", () => {
  const text = fs.readFileSync(path.join(HERE, "orca-evidence.mts"), "utf8");
  assert.ok(!/--force|prune/.test(text));
  assert.ok(!/\bnode:/.test(text));
  assert.ok(!/: any\b|as any/.test(text));
});

function spyDeps(onRun?: (args: string[], real: () => Promise<RunResult>) => Promise<RunResult>): { deps: RuntimeDeps; calls: string[][] } {
  const calls: string[][] = [];
  const spy: RuntimeDeps = {
    ...deps,
    child: {
      ...deps.child,
      run: (command: string, args: string[], options?: SpawnOptions) => {
        calls.push(args);
        const real = () => deps.child.run(command, args, options);
        return onRun ? onRun(args, real) : real();
      },
    },
  };
  return { deps: spy, calls };
}

test("removal passes only the plain remove subcommand and no forcing or pruning flag", async (t: TestContext) => {
  const { f } = proven(t);
  const spy = spyDeps();
  const decision = await decide(f, { deps: spy.deps });
  assert.deepEqual(await performCleanup(decision, spy.deps), { status: "ok", reason: "removed" });
  const removes = spy.calls.filter((args) => args.includes("worktree") && args.includes("remove"));
  assert.equal(removes.length, 1);
  for (const args of spy.calls) {
    assert.ok(!args.includes("--force") && !args.includes("-f") && !args.includes("prune"), args.join(" "));
    assert.ok(args.includes("core.hooksPath=/dev/null") && args.includes("core.fsmonitor=false"));
  }
});

test("performCleanup re-checks a decision: a tree that turned dirty (ignored files included) or lost its evidence is not removed", async (t: TestContext) => {
  const { f } = proven(t);
  const decision = await decide(f);
  assert.equal(decision.action, "remove");
  write(path.join(f.wt, "late-work.txt"), "user came back");
  const dirty = await performCleanup(decision, deps);
  assert.deepEqual([dirty.status, dirty.reason], ["refused", "worktree-dirty"]);
  assert.ok(fs.existsSync(path.join(f.wt, "late-work.txt")));
  fs.rmSync(path.join(f.wt, "late-work.txt"));
  const forged = { ...decision, manifestSha256: "0".repeat(64) };
  const mismatch = await performCleanup(forged, deps);
  assert.equal(mismatch.status, "refused");
  assert.match(mismatch.reason, /^evidence-/);
  assert.ok(fs.existsSync(f.wt));
});

test("cleanup resumes after a crash between steps", async (t: TestContext) => {
  {
    // Crash before removal ran (injected failure), then a second call finishes.
    const { f } = proven(t);
    const decision = await decide(f);
    const crashing = spyDeps(async (args) => { if (args.includes("remove")) throw new Error("crash"); return { status: args.includes("config") ? 1 : 0, signal: null, stdout: "", stderr: "" }; });
    assert.equal((await performCleanup(decision, crashing.deps)).status, "failed");
    assert.ok(fs.existsSync(f.wt));
    assert.deepEqual(await performCleanup(decision, deps), { status: "ok", reason: "removed" });
  }
  {
    // Crash after git removed the tree but before the caller saw the answer.
    const { f } = proven(t);
    const decision = await decide(f);
    const crashing = spyDeps(async (args, real) => { const result = await real(); if (args.includes("remove")) throw new Error("crash after removal"); return result; });
    assert.equal((await performCleanup(decision, crashing.deps)).status, "failed");
    assert.ok(!fs.existsSync(f.wt));
    assert.deepEqual(await performCleanup(decision, deps), { status: "ok", reason: "already-gone" });
    assert.equal(verifyEvidence({ root: f.root, attemptKey: KEY, deps }).status, "ok");
    // Evidence copy re-entered after a crash is a no-op, and a partial earlier run (no manifest yet) completes.
    assert.equal(copy(f, { checks: "ok\n" }).status, "ok");
    fs.rmSync(path.join(evidenceDir(f), "manifest.json"));
    assert.equal(verifyEvidence({ root: f.root, attemptKey: KEY, deps }).status, "missing");
    assert.equal(copy(f, { checks: "ok\n" }).status, "ok");
  }
});

test("deadlines: under 1 ms refuses; timeouts and overflow come only from errorCode and are never retried", async (t: TestContext) => {
  const { f } = proven(t);
  const now = deps.clock.monotonicMs();
  for (const deadlineMs of [now, now - 5, now + 0.5 - 1]) {
    const spy = spyDeps();
    const decision = await decide(f, { deadlineMs: deadlineMs, deps: spy.deps });
    assert.equal(decision.action, "keep");
    if (decision.action === "keep") assert.equal(decision.reason, "time-budget");
    assert.equal(spy.calls.length, 0);
  }
  const timeout = spyDeps(async () => ({ status: null, signal: "SIGKILL", stdout: "", stderr: "", errorCode: "ETIMEDOUT" }));
  const timedOut = await decide(f, { deps: timeout.deps });
  assert.equal(timedOut.action === "keep" && timedOut.reason, "git-timeout");
  assert.equal(timeout.calls.length, 1, "no retry");
  const overflow = spyDeps(async () => ({ status: null, signal: "SIGKILL", stdout: "", stderr: "", errorCode: "ENOBUFS" }));
  const overflowed = await decide(f, { deps: overflow.deps });
  assert.equal(overflowed.action === "keep" && overflowed.reason, "git-output-overflow");
  // Words in stderr are not a signal.
  const noisy = spyDeps(async () => ({ status: 1, signal: null, stdout: "", stderr: "timed out ETIMEDOUT" }));
  const noisyDecision = await decide(f, { deps: noisy.deps });
  assert.equal(noisyDecision.action === "keep" && noisyDecision.reason, "worktree-list-failed");
  const decision = await decide(f);
  assert.equal(decision.action, "remove");
  const late = await performCleanup(decision, deps, deps.clock.monotonicMs());
  assert.equal(late.status, "failed");
  assert.ok(fs.existsSync(f.wt));
});

test("late input after settlement never changes a recorded final state", async (t: TestContext) => {
  const { f } = proven(t);
  const decision = await decide(f);
  assert.equal((await performCleanup(decision, deps)).status, "ok");
  assert.deepEqual(recordFinalState({ root: f.root, attemptKey: KEY, state: "cleaned", deps }), { status: "recorded", state: "cleaned" });
  // A second released receipt, a late worker_done, or a replay deciding "keep" all try to record something else.
  assert.deepEqual(recordFinalState({ root: f.root, attemptKey: KEY, state: "integrated-uncleaned", leftover: [f.wt], deps }), { status: "unchanged", state: "cleaned" });
  assert.deepEqual(recordFinalState({ root: f.root, attemptKey: KEY, state: "cleaned", deps }), { status: "unchanged", state: "cleaned" });
  const stored = JSON.parse(fs.readFileSync(path.join(evidenceDir(f), "final.json"), "utf8"));
  assert.equal(stored.state, "cleaned");
  assert.equal(verifyEvidence({ root: f.root, attemptKey: KEY, deps }).status, "ok");
  assert.equal(recordFinalState({ root: f.root, attemptKey: "attempt:../x", state: "cleaned", deps }).status, "invalid");
  fs.writeFileSync(path.join(evidenceDir(f), "final.json"), "junk");
  assert.equal(recordFinalState({ root: f.root, attemptKey: KEY, state: "cleaned", deps }).status, "corrupt");
});
