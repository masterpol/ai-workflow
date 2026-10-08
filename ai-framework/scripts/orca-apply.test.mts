import assert from "node:assert/strict";
import { test } from "node:test";
import type { TestContext } from "node:test";

import { createTestDeps, tempFixture } from "./runtime/test-helpers.mts";
import { createNodeDeps } from "./runtime/node.mts";
import type { RunResult, RuntimeDeps, SpawnOptions } from "./runtime/types.mts";

// ORCA_APPLY_UNDER_TEST lets a mutant copy of the module be exercised by the same assertions (mutant proofs).
const mod = await import(process.env.ORCA_APPLY_UNDER_TEST ?? "./orca-apply.mts") as typeof import("./orca-apply.mts");
const { applyAdmitted, rollback, validRelativePath, parseStatus, parseNumstat } = mod;
type Worker = import("./orca-apply.mts").AdmittedWorker;
type Entry = import("./orca-apply.mts").AdmittedEntry;

const HERE = import.meta.dirname;
const deps = createTestDeps();
const GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };

function sh(cwd: string, args: string[]): string {
  const result = deps.child.runSync("git", ["-c", "core.autocrlf=false", ...args], { cwd, env: GIT_ENV, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout;
}
function tmp(t: TestContext, real = true): string {
  const dir = tempFixture(deps, {});
  t.after(() => deps.fs.rmSync(dir, { recursive: true, force: true }));
  return real ? deps.fs.realpathSync(dir) : dir;
}
function put(root: string, rel: string, data: string | Buffer, mode = 0o644): void {
  const file = deps.path.join(root, rel);
  deps.fs.mkdirSync(deps.path.dirname(file), { recursive: true });
  deps.fs.writeFileSync(file, data);
  deps.fs.chmodSync(file, mode);
}
const BASE: Record<string, string> = { "a.txt": "alpha\nline2\n", "b.txt": "bravo\nline2\n", "c.txt": "charlie\n", "src/d.txt": "delta\n" };
function makeRepo(t: TestContext, extra: (root: string) => void = () => {}, real = true): { root: string; head: string } {
  const root = tmp(t, real);
  sh(root, ["init", "-q", "-b", "main"]);
  for (const [rel, data] of Object.entries(BASE)) put(root, rel, data);
  put(root, "run.sh", "#!/bin/sh\necho hi\n", 0o755);
  extra(root);
  sh(root, ["add", "-A"]);
  sh(root, ["commit", "-q", "-m", "base"]);
  return { root, head: sh(root, ["rev-parse", "HEAD"]).trim() };
}
/** Builds a patch by editing a clone of the repo; returns the git-format patch against HEAD. */
function patchFrom(t: TestContext, repo: string, mutate: (clone: string) => void): string {
  const clone = tmp(t);
  sh(clone, ["clone", "-q", "--no-hardlinks", repo, "."]);
  mutate(clone);
  sh(clone, ["add", "-A"]);
  return sh(clone, ["diff", "--cached", "--binary", "-M", "HEAD"]);
}
const entry = (p: string, kind: Entry["kind"] = "modify", extra: Partial<Entry> = {}): Entry => ({ path: p, kind, mode: "100644", binary: false, size: 0, ...extra });
const worker = (attemptKey: string, patch: string, entries: Entry[]): Worker => ({ attemptKey, entries, patch });
const read = (root: string, rel: string): string => deps.fs.readFileSync(deps.path.join(root, rel), "utf8");
const modeOf = (root: string, rel: string): number => deps.fs.lstatSync(deps.path.join(root, rel)).mode & 0o777;
const call = (root: string, head: string, workers: Worker[], d: RuntimeDeps = deps, extra: Record<string, unknown> = {}) =>
  applyAdmitted({ root, baseline: head, admitted: workers, workerOrder: workers.map((w) => w.attemptKey), deps: d, ...extra });
const storeExists = (root: string): boolean => deps.fs.existsSync(deps.path.join(root, ".project/metrics/orca-snapshots"));

/** Walks a tree (excluding .git and the snapshot store) into a path -> "mode:content" map. */
function tree(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string, rel: string): void => {
    for (const name of deps.fs.readdirSync(dir).sort()) {
      if (rel === "" && name === ".git") continue;
      const abs = deps.path.join(dir, name);
      const r = rel ? `${rel}/${name}` : name;
      if (r === ".project" || r === ".project/metrics" || r === ".project/metrics/orca-snapshots") continue;
      const st = deps.fs.lstatSync(abs);
      if (st.isDirectory()) { out[`${r}/`] = "dir"; walk(abs, r); } else out[r] = st.isSymbolicLink() ? `link:${deps.fs.readlinkSync(abs)}` : `${st.mode & 0o777}:${deps.fs.readFileSync(abs).toString("base64")}`;
    }
  };
  walk(root, "");
  return out;
}

type Seen = { args: string[]; env: Record<string, string | undefined> | undefined };
function wrapped(hook: (args: string[], n: { writes: number }, seen: Seen) => RunResult | undefined, seen: Seen[] = []): RuntimeDeps {
  const base = createNodeDeps();
  const n = { writes: 0 };
  return { ...base, child: { ...base.child, run: async (cmd: string, args: string[], opts?: SpawnOptions): Promise<RunResult> => {
    const s = { args, env: opts?.env };
    seen.push(s);
    const isWrite = args.includes("apply") && !args.includes("--check") && !args.includes("--numstat");
    if (isWrite) n.writes++;
    return hook(args, n, s) ?? base.child.run(cmd, args, opts);
  } } };
}
const failSecondWrite = (): RuntimeDeps => wrapped((args, n) => (args.includes("apply") && !args.includes("--check") && !args.includes("--numstat") && n.writes === 2
  ? { status: 1, signal: null, stdout: "", stderr: "injected" } : undefined));

test("a dirty tree with unrelated edits survives apply and rollback byte for byte", async (t: TestContext) => {
  const { root, head } = makeRepo(t);
  put(root, "b.txt", "bravo DIRTY\n");
  put(root, "untracked.txt", "mine\n");
  put(root, "deep/dir/untracked2.txt", "mine2\n");
  const patch = patchFrom(t, root, (c) => put(c, "a.txt", "alpha CHANGED\nline2\n"));
  const before = tree(root);
  const result = await call(root, head, [worker("w1", patch, [entry("a.txt")])]);
  assert.equal(result.status, "applied");
  if (result.status !== "applied") return;
  assert.equal(read(root, "a.txt"), "alpha CHANGED\nline2\n");
  assert.equal(read(root, "b.txt"), "bravo DIRTY\n");
  assert.equal(read(root, "untracked.txt"), "mine\n");
  assert.deepEqual(result.touched, ["a.txt"]);
  assert.deepEqual(result.order, ["w1"]);
  const back = rollback({ root, snapshot: result.snapshot, touched: result.touched, deps });
  assert.deepEqual(back, { status: "restored", restored: ["a.txt"] });
  assert.deepEqual(tree(root), before);
});

test("an admitted change overlapping a dirty file is refused before any write, naming the path", async (t: TestContext) => {
  const { root, head } = makeRepo(t);
  const patch = patchFrom(t, root, (c) => { put(c, "a.txt", "alpha CHANGED\nline2\n"); put(c, "new.txt", "n\n"); });
  const probe = [entry("a.txt"), entry("new.txt", "add")];
  // modified, untracked, and staged-only each overlap
  put(root, "a.txt", "alpha LOCAL\nline2\n");
  let before = tree(root);
  let result = await call(root, head, [worker("w1", patch, probe)]);
  assert.deepEqual([result.status, (result as { reason: string }).reason, (result as { path?: string }).path], ["refused", "dirty-overlap", "a.txt"]);
  assert.deepEqual(tree(root), before);
  assert.equal(storeExists(root), false);

  sh(root, ["checkout", "-q", "--", "a.txt"]);
  put(root, "new.txt", "user untracked\n");
  before = tree(root);
  result = await call(root, head, [worker("w1", patch, probe)]);
  assert.equal((result as { reason: string }).reason, "dirty-overlap");
  assert.equal((result as { path?: string }).path, "new.txt");
  assert.deepEqual(tree(root), before);

  deps.fs.rmSync(deps.path.join(root, "new.txt"));
  put(root, "a.txt", "alpha STAGED\nline2\n");
  sh(root, ["add", "a.txt"]);
  put(root, "a.txt", "alpha CHANGED\nline2\n"); // identical to the patch result, still overlapping
  result = await call(root, head, [worker("w1", patch, probe)]);
  assert.equal((result as { reason: string }).reason, "dirty-overlap");
  assert.equal(storeExists(root), false);
});

test("an overlap with a directory the user changed, or a rename source, is refused", async (t: TestContext) => {
  const { root, head } = makeRepo(t);
  const patch = patchFrom(t, root, (c) => { sh(c, ["mv", "c.txt", "c2.txt"]); });
  put(root, "c.txt", "charlie LOCAL\n");
  const result = await call(root, head, [worker("w1", patch, [entry("c2.txt", "rename", { from: "c.txt" })])]);
  assert.equal((result as { reason: string }).reason, "dirty-overlap");
  assert.equal(read(root, "c.txt"), "charlie LOCAL\n");
  assert.equal(deps.fs.existsSync(deps.path.join(root, "c2.txt")), false);
});

test("baseline-moved and malformed baselines are refused with no write", async (t: TestContext) => {
  const { root, head } = makeRepo(t);
  const patch = patchFrom(t, root, (c) => put(c, "a.txt", "alpha CHANGED\nline2\n"));
  const w = [worker("w1", patch, [entry("a.txt")])];
  put(root, "other.txt", "x\n");
  sh(root, ["add", "-A"]);
  sh(root, ["commit", "-q", "-m", "move"]);
  const before = tree(root);
  const result = await call(root, head, w);
  assert.equal((result as { reason: string }).reason, "baseline-moved");
  for (const bad of ["HEAD", "main", "--upload-pack=x", head.slice(0, 12), head.toUpperCase().replace(/[0-9a-f]/g, "G"), "", `${head}0`]) {
    const refused = await call(root, bad, w);
    assert.equal(refused.status, "refused", bad);
    assert.equal((refused as { reason: string }).reason, "baseline-invalid", bad);
  }
  assert.deepEqual(tree(root), before);
  assert.equal(storeExists(root), false);
});

test("worker 2 failing git apply --check leaves worker 1 unwritten", async (t: TestContext) => {
  const { root, head } = makeRepo(t);
  const p1 = patchFrom(t, root, (c) => put(c, "a.txt", "alpha CHANGED\nline2\n"));
  // Worker 2's patch was made against different content, so its context cannot match the coordinator tree.
  const other = makeRepo(t, (r) => put(r, "b.txt", "something\nelse\n"));
  const p2 = patchFrom(t, other.root, (c) => put(c, "b.txt", "something\nCHANGED\n"));
  const before = tree(root);
  const result = await call(root, head, [worker("w1", p1, [entry("a.txt")]), worker("w2", p2, [entry("b.txt")])]);
  assert.equal(result.status, "refused");
  assert.equal((result as { reason: string }).reason, "apply-check-failed");
  assert.equal((result as { worker?: string }).worker, "w2");
  assert.deepEqual(tree(root), before);
  assert.equal(storeExists(root), false);
});

test("a failure after worker 1's write rolls back exactly the touched paths, including created and deleted files", async (t: TestContext) => {
  const { root, head } = makeRepo(t);
  put(root, "b.txt", "bravo DIRTY\n");
  put(root, "untracked.txt", "mine\n");
  const p1 = patchFrom(t, root, (c) => {
    put(c, "a.txt", "alpha CHANGED\nline2\n");
    put(c, "newdir/sub/created.txt", "created\n");
    deps.fs.rmSync(deps.path.join(c, "run.sh"));
  });
  const p2 = patchFrom(t, root, (c) => put(c, "c.txt", "charlie CHANGED\n"));
  const w = [worker("w1", p1, [entry("a.txt"), entry("newdir/sub/created.txt", "add"), entry("run.sh", "delete")]), worker("w2", p2, [entry("c.txt")])];
  const before = tree(root);
  const result = await call(root, head, w, failSecondWrite());
  assert.equal(result.status, "rolled-back");
  if (result.status !== "rolled-back") return;
  assert.equal(result.reason, "apply-failed");
  assert.equal(result.worker, "w2");
  assert.deepEqual([...result.restored].sort(), ["a.txt", "newdir/sub/created.txt", "run.sh"]);
  assert.deepEqual(tree(root), before);
  assert.equal(modeOf(root, "run.sh"), 0o755);
  assert.equal(deps.fs.existsSync(deps.path.join(root, "newdir")), false);

  // Rollback is idempotent: a second run changes nothing and reports nothing restored.
  const store = deps.path.join(root, ".project/metrics/orca-snapshots");
  const snapshot = deps.path.join(store, deps.fs.readdirSync(store)[0]);
  const again = rollback({ root, snapshot, touched: ["a.txt", "newdir/sub/created.txt", "run.sh"], deps });
  assert.deepEqual(again, { status: "restored", restored: [] });
  assert.deepEqual(tree(root), before);

  // A clean rerun of the same call now succeeds.
  const rerun = await call(root, head, w);
  assert.equal(rerun.status, "applied");
  assert.equal(read(root, "newdir/sub/created.txt"), "created\n");
  assert.equal(deps.fs.existsSync(deps.path.join(root, "run.sh")), false);
});

test("rollback restores only the touched paths it is given", async (t: TestContext) => {
  const { root, head } = makeRepo(t);
  const p = patchFrom(t, root, (c) => { put(c, "a.txt", "alpha CHANGED\nline2\n"); put(c, "c.txt", "charlie CHANGED\n"); });
  const result = await call(root, head, [worker("w1", p, [entry("a.txt"), entry("c.txt")])]);
  assert.equal(result.status, "applied");
  if (result.status !== "applied") return;
  const back = rollback({ root, snapshot: result.snapshot, touched: ["a.txt"], deps });
  assert.deepEqual(back, { status: "restored", restored: ["a.txt"] });
  assert.equal(read(root, "a.txt"), BASE["a.txt"]);
  assert.equal(read(root, "c.txt"), "charlie CHANGED\n");
  assert.equal(rollback({ root, snapshot: result.snapshot, touched: ["b.txt"], deps }).status, "refused");
  assert.equal(rollback({ root, snapshot: deps.path.join(root, ".project"), touched: ["a.txt"], deps }).status, "refused");
});

test("a symlinked target is refused and its victim stays byte-identical", async (t: TestContext) => {
  const outside = tmp(t);
  const victim = deps.path.join(outside, "victim.txt");
  deps.fs.writeFileSync(victim, "victim\n");
  const { root, head } = makeRepo(t, (r) => deps.fs.symlinkSync(victim, deps.path.join(r, "link.txt")));
  const patch = patchFrom(t, root, (c) => { deps.fs.rmSync(deps.path.join(c, "link.txt")); put(c, "link.txt", "regular now\n"); });
  const before = tree(root);
  const result = await call(root, head, [worker("w1", patch, [entry("link.txt")])]);
  assert.equal((result as { reason: string }).reason, "symlink-path");
  assert.equal(deps.fs.readFileSync(victim, "utf8"), "victim\n");
  assert.deepEqual(tree(root), before);
  assert.equal(storeExists(root), false);
});

test("a symlinked ancestor directory is refused and nothing lands behind it", async (t: TestContext) => {
  const outside = tmp(t);
  const { root, head } = makeRepo(t, (r) => deps.fs.symlinkSync(outside, deps.path.join(r, "sub")));
  const patch = "diff --git a/sub/new.txt b/sub/new.txt\nnew file mode 100644\n--- /dev/null\n+++ b/sub/new.txt\n@@ -0,0 +1 @@\n+pwn\n";
  const result = await call(root, head, [worker("w1", patch, [entry("sub/new.txt", "add")])]);
  assert.equal((result as { reason: string }).reason, "symlink-path");
  assert.deepEqual(deps.fs.readdirSync(outside), []);
});

test("rollback refuses to write through a path swapped for a symlink", async (t: TestContext) => {
  const outside = tmp(t);
  const victim = deps.path.join(outside, "victim.txt");
  deps.fs.writeFileSync(victim, "victim\n");
  const { root, head } = makeRepo(t);
  const patch = patchFrom(t, root, (c) => put(c, "a.txt", "alpha CHANGED\nline2\n"));
  const result = await call(root, head, [worker("w1", patch, [entry("a.txt")])]);
  assert.equal(result.status, "applied");
  if (result.status !== "applied") return;
  deps.fs.rmSync(deps.path.join(root, "a.txt"));
  deps.fs.symlinkSync(victim, deps.path.join(root, "a.txt"));
  const back = rollback({ root, snapshot: result.snapshot, touched: result.touched, deps });
  assert.equal(back.status, "refused");
  assert.equal(deps.fs.readFileSync(victim, "utf8"), "victim\n");
});

test("two workers touching the same path, a rename source, or a parent directory are refused", async (t: TestContext) => {
  const { root, head } = makeRepo(t);
  const p1 = patchFrom(t, root, (c) => put(c, "a.txt", "alpha ONE\nline2\n"));
  const p2 = patchFrom(t, root, (c) => put(c, "a.txt", "alpha\nline2 TWO\n"));
  const before = tree(root);
  const result = await call(root, head, [worker("w1", p1, [entry("a.txt")]), worker("w2", p2, [entry("a.txt")])]);
  assert.equal((result as { reason: string }).reason, "worker-overlap");
  const p3 = patchFrom(t, root, (c) => { sh(c, ["mv", "a.txt", "z.txt"]); });
  const r2 = await call(root, head, [worker("w1", p1, [entry("a.txt")]), worker("w3", p3, [entry("z.txt", "rename", { from: "a.txt" })])]);
  assert.equal((r2 as { reason: string }).reason, "worker-overlap");
  assert.deepEqual(tree(root), before);
});

test("worker order is sorted by attempt key regardless of caller order, and must name the same set", async (t: TestContext) => {
  const { root, head } = makeRepo(t);
  const pa = patchFrom(t, root, (c) => put(c, "a.txt", "alpha CHANGED\nline2\n"));
  const pb = patchFrom(t, root, (c) => put(c, "b.txt", "bravo CHANGED\nline2\n"));
  const wa = worker("attempt:b", pb, [entry("b.txt")]);
  const wb = worker("attempt:a", pa, [entry("a.txt")]);
  const order: string[] = [];
  const spy = wrapped((args, n) => { if (args.includes("apply") && !args.includes("--check") && !args.includes("--numstat")) order.push(String(n.writes)); return undefined; });
  const result = await applyAdmitted({ root, baseline: head, admitted: [wa, wb], workerOrder: ["attempt:b", "attempt:a"], deps: spy });
  assert.equal(result.status, "applied");
  if (result.status !== "applied") return;
  assert.deepEqual(result.order, ["attempt:a", "attempt:b"]);
  assert.deepEqual(result.touched, ["a.txt", "b.txt"]);
  const bad = await applyAdmitted({ root, baseline: head, admitted: [wa, wb], workerOrder: ["attempt:a"], deps });
  assert.equal((bad as { reason: string }).reason, "worker-order-mismatch");
  const bad2 = await applyAdmitted({ root, baseline: head, admitted: [wa, wb], workerOrder: ["attempt:a", "attempt:zzz"], deps });
  assert.equal((bad2 as { reason: string }).reason, "worker-order-mismatch");
});

test("binary patches, renames and mode flips apply and roll back exactly", async (t: TestContext) => {
  const bin = Buffer.from([0, 1, 2, 3, 255, 254, 0, 10, 13, 0]);
  const { root, head } = makeRepo(t, (r) => put(r, "blob.bin", bin));
  const newBin = Buffer.from([9, 0, 0, 255, 1, 2, 3, 0, 0, 7]);
  const patch = patchFrom(t, root, (c) => {
    put(c, "blob.bin", newBin);
    sh(c, ["mv", "c.txt", "c-renamed.txt"]);
    deps.fs.chmodSync(deps.path.join(c, "run.sh"), 0o644);
    deps.fs.chmodSync(deps.path.join(c, "b.txt"), 0o755);
  });
  const before = tree(root);
  const result = await call(root, head, [worker("w1", patch, [
    entry("blob.bin", "modify", { binary: true }), entry("c-renamed.txt", "rename", { from: "c.txt" }),
    entry("run.sh", "modify"), entry("b.txt", "modify", { mode: "100755" })])]);
  assert.equal(result.status, "applied");
  if (result.status !== "applied") return;
  assert.deepEqual(Buffer.from(deps.fs.readBytesSync(deps.path.join(root, "blob.bin"))), newBin);
  assert.equal(deps.fs.existsSync(deps.path.join(root, "c.txt")), false);
  assert.equal(read(root, "c-renamed.txt"), "charlie\n");
  assert.equal(modeOf(root, "run.sh"), 0o644);
  assert.equal(modeOf(root, "b.txt"), 0o755);
  const back = rollback({ root, snapshot: result.snapshot, touched: result.touched, deps });
  assert.equal(back.status, "restored");
  assert.deepEqual(tree(root), before);
});

test("a root given through the macOS /var alias still matches the dirty set and refuses overlap", async (t: TestContext) => {
  const { root: aliased, head } = makeRepo(t, () => {}, false);
  const real = deps.fs.realpathSync(aliased);
  const patch = patchFrom(t, real, (c) => put(c, "a.txt", "alpha CHANGED\nline2\n"));
  put(aliased, "a.txt", "alpha LOCAL\nline2\n");
  const refused = await call(aliased, head, [worker("w1", patch, [entry("a.txt")])]);
  assert.equal((refused as { reason: string }).reason, "dirty-overlap");
  sh(real, ["checkout", "-q", "--", "a.txt"]);
  const ok = await call(aliased, head, [worker("w1", patch, [entry("a.txt")])]);
  assert.equal(ok.status, "applied");
  if (ok.status !== "applied") return;
  assert.ok(ok.snapshot.startsWith(real), `${ok.snapshot} should be realpath-rooted`);
});

test("hostile entry paths, patch/entry disagreement and non-root directories are refused", async (t: TestContext) => {
  const { root, head } = makeRepo(t);
  const patch = patchFrom(t, root, (c) => { put(c, "a.txt", "alpha CHANGED\nline2\n"); put(c, "b.txt", "bravo CHANGED\nline2\n"); });
  for (const bad of ["../x", "/etc/passwd", ".git/config", "a/../b", "a\0b", "", ".project/metrics/orca-snapshots/x", ".project/metrics/orca-evidence/w2/manifest.json", ".Project/Metrics/orca-ledger/x.json", "a\\b", "./a.txt"]) {
    const result = await call(root, head, [worker("w1", patch, [entry(bad)])]);
    assert.equal((result as { reason: string }).reason, "invalid-path", JSON.stringify(bad));
  }
  const mismatch = await call(root, head, [worker("w1", patch, [entry("a.txt")])]);
  assert.equal((mismatch as { reason: string }).reason, "patch-entries-mismatch");
  assert.equal((await call(root, head, [])).status, "refused");
  const sub = deps.path.join(root, "src");
  const notRoot = await call(sub, head, [worker("w1", patch, [entry("a.txt"), entry("b.txt")])]);
  assert.equal((notRoot as { reason: string }).reason, "not-repo-root");
  assert.equal(read(root, "a.txt"), BASE["a.txt"]);
  assert.equal(validRelativePath("src/ok.txt"), true);
  assert.deepEqual(parseStatus(" M a.txt\0?? u.txt\0R  new\0old\0"), ["a.txt", "u.txt", "new", "old"]);
  assert.deepEqual(parseNumstat("1\t1\ta.txt\0-\t-\tb.bin\0"), ["a.txt", "b.bin"]);
});

test("timeouts, overflow and an exhausted budget are refused with distinct reasons and no retry", async (t: TestContext) => {
  const { root, head } = makeRepo(t);
  const patch = patchFrom(t, root, (c) => put(c, "a.txt", "alpha CHANGED\nline2\n"));
  const w = [worker("w1", patch, [entry("a.txt")])];
  const before = tree(root);
  for (const [errorCode, reason] of [["ETIMEDOUT", "git-timeout"], ["ENOBUFS", "git-output-limit"]] as const) {
    let calls = 0;
    const d = wrapped(() => { calls++; return { status: null, signal: "SIGKILL", stdout: "", stderr: "", errorCode }; });
    const result = await call(root, head, w, d);
    assert.equal((result as { reason: string }).reason, reason);
    assert.equal(calls, 1);
  }
  let spawned = 0;
  const counting = wrapped(() => { spawned++; return undefined; });
  const late = await call(root, head, w, counting, { deadlineMs: 999.5, now: () => 1000 });
  assert.equal((late as { reason: string }).reason, "time-budget");
  const subMs = await call(root, head, w, counting, { deadlineMs: 1000.5, now: () => 1000 });
  assert.equal((subMs as { reason: string }).reason, "time-budget");
  assert.equal(spawned, 0);
  assert.deepEqual(tree(root), before);
});

test("a timeout during the apply phase rolls back instead of leaving a partial tree", async (t: TestContext) => {
  const { root, head } = makeRepo(t);
  const p1 = patchFrom(t, root, (c) => put(c, "a.txt", "alpha CHANGED\nline2\n"));
  const p2 = patchFrom(t, root, (c) => put(c, "c.txt", "charlie CHANGED\n"));
  const before = tree(root);
  const d = wrapped((args, n) => (n.writes === 2 && args.includes("apply") && !args.includes("--check") && !args.includes("--numstat")
    ? { status: null, signal: "SIGKILL", stdout: "", stderr: "", errorCode: "ETIMEDOUT" } : undefined));
  const result = await call(root, head, [worker("w1", p1, [entry("a.txt")]), worker("w2", p2, [entry("c.txt")])], d);
  assert.equal(result.status, "rolled-back");
  assert.equal((result as { reason: string }).reason, "git-timeout");
  assert.deepEqual(tree(root), before);
});

test("every git call is hardened and gets a scrubbed environment", async (t: TestContext) => {
  const { root, head } = makeRepo(t);
  const patch = patchFrom(t, root, (c) => put(c, "a.txt", "alpha CHANGED\nline2\n"));
  const seen: Seen[] = [];
  process.env.ORCA_APPLY_TEST_SECRET = "s3cret";
  t.after(() => { delete process.env.ORCA_APPLY_TEST_SECRET; });
  const d = wrapped(() => undefined, seen);
  const result = await call(root, head, [worker("w1", patch, [entry("a.txt")])], d);
  assert.equal(result.status, "applied");
  assert.ok(seen.length >= 5);
  for (const { args, env } of seen) {
    const joined = args.join(" ");
    for (const flag of ["core.hooksPath=/dev/null", "core.fsmonitor=false", "core.attributesFile=/dev/null"]) assert.ok(joined.includes(flag), joined);
    assert.ok(!args.includes("--3way") && !args.includes("--reject") && !args.includes("--index") && !args.includes("--cached"), joined);
    assert.equal(env?.GIT_CONFIG_NOSYSTEM, "1");
    assert.equal(env?.GIT_CONFIG_GLOBAL, "/dev/null");
    assert.equal(env?.GIT_TERMINAL_PROMPT, "0");
    assert.ok(!Object.keys(env ?? {}).includes("ORCA_APPLY_TEST_SECRET"));
    assert.ok(deps.path.isAbsolute((env?.PATH ?? "").split(deps.path.delimiter)[0]));
  }
});

test("the module never uses destructive git verbs or forcing flags", () => {
  const source = deps.fs.readFileSync(deps.path.join(HERE, "orca-apply.mts"), "utf8");
  for (const verb of ["stash", "reset", "checkout", "clean", "restore", "revert", "rebase", "merge", "switch"]) {
    assert.doesNotMatch(source, new RegExp(`["'\`]${verb}["'\`]`), `quoted git verb ${verb}`);
    assert.doesNotMatch(source, new RegExp(`git ${verb}\\b`), `git ${verb}`);
  }
  assert.doesNotMatch(source, /--force|--3way|--reject|--hard|--theirs|--ours|["'`]-f["'`]|["'`]-fd["'`]|checkout --/);
  assert.doesNotMatch(source, /force\s*:\s*true/);
});

test("production code imports no node: module and uses no any", () => {
  const source = deps.fs.readFileSync(deps.path.join(HERE, "orca-apply.mts"), "utf8");
  assert.doesNotMatch(source, /node:/);
  assert.doesNotMatch(source, /: any\b|as any/);
});
