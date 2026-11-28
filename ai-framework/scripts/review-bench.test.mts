import { NODE_FLAGS } from "./runtime/entry.mts";
const RUNTIME_FLAGS = process.versions.bun ? [] : NODE_FLAGS;
import assert from "node:assert/strict";
import { createTestDeps, urlPath, spawnSync } from "./runtime/test-helpers.mts";
const testDeps = createTestDeps();
const fs = testDeps.fs;
const os = testDeps.os;
const path = testDeps.path;
import test from "node:test";
import type { TestContext } from "node:test";

import * as bench from "./review-bench.mts";

const here = path.dirname(urlPath(import.meta.url));
const SCRIPT = path.join(here, "review-bench.mts");
const SOURCE = path.join(here, "review-bench.mts");

function temp(t: TestContext, prefix = "review-bench-test-"): string {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function write(root: string, name: string, value: string): void {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}
type Env = Record<string, string | undefined>;
function plainGitResult(root: string, args: string[], extraEnv: Env = {}) {
  const { PATH, HOME, SystemRoot } = process.env;
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8", timeout: 10000, env: {
    PATH, HOME, SystemRoot, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.test", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.test",
    ...extraEnv,
  } });
  assert.equal(result.error, undefined);
  return result;
}
function plainGit(root: string, args: string[], extraEnv: Env = {}): string {
  const result = plainGitResult(root, args, extraEnv);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
const git = (root: string, ...args: string[]) => plainGit(root, ["-c", "core.hooksPath=/dev/null", ...args]);
// A small real repo: a guard-worthy module with a test, plus paths the guard watches.
function repo(t: TestContext): string {
  const root = temp(t);
  git(root, "init", "-q", "-b", "main");
  write(root, "ai-framework/scripts/mod.js", "module.exports = (x) => (x > 0 ? 'pos' : 'nonpos');\n");
  write(root, "ai-framework/scripts/mod.test.js", "const assert = require('node:assert');\nconst f = require('./mod');\nassert.equal(f(1), 'pos');\nassert.equal(f(0), 'nonpos');\n");
  write(root, ".project/notes.md", "notes\n");
  write(root, ".project/pitches/mine/pitch.md", "pitch\n");
  write(root, ".gitignore", ".project/ignored/\n.project/metrics/\n.project/reports/\n");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "base");
  return root;
}
const CANARY = JSON.stringify({ file: "ai-framework/scripts/mod.js", find: "x > 0", replace: "x >= 0" });
const TEST_CMD = JSON.stringify(["node", "ai-framework/scripts/mod.test.js"]);
const FILES = "ai-framework/scripts/mod.js,ai-framework/scripts/mod.test.js";
const prep = (root: string, extra: Record<string, string> = {}) => bench.prepare(root, { files: FILES, canary: CANARY, "test-cmd": TEST_CMD, ...extra });
const runWithEnv = (root: string, env: Env, ...args: string[]) =>
  spawnSync(process.execPath, [...RUNTIME_FLAGS, SCRIPT, "--root", root, ...args], { encoding: "utf8", timeout: 20000, env: { ...process.env, ...env } });
const run = (root: string, ...args: string[]) => runWithEnv(root, {}, ...args);

test("prepare copies exactly the slice to a scratch dir outside the repo and plants one canary that breaks a test", (t: TestContext) => {
  const root = repo(t);
  const result = prep(root);
  t.after(() => { fs.rmSync(result.scratch, { recursive: true, force: true }); fs.rmSync(result.manifest, { force: true }); });
  assert.ok(!result.scratch.startsWith(root));
  assert.deepEqual(fs.readdirSync(path.join(result.scratch, "ai-framework/scripts")).sort(), ["mod.js", "mod.test.js"]);
  assert.match(fs.readFileSync(path.join(result.scratch, "ai-framework/scripts/mod.js"), "utf8"), /x >= 0/);
  assert.match(fs.readFileSync(path.join(root, "ai-framework/scripts/mod.js"), "utf8"), /x > 0/, "the repo copy is untouched");
  const manifest = JSON.parse(fs.readFileSync(result.manifest, "utf8"));
  assert.equal(manifest.canary.file, "ai-framework/scripts/mod.js");
  assert.equal(manifest.canary.line, 1);
  assert.equal(manifest.canaryBreaksTests, true);
});

test("the manifest lives beside the scratch tree, and nothing inside the tree names the canary", (t: TestContext) => {
  const root = repo(t);
  const result = prep(root);
  t.after(() => { fs.rmSync(result.scratch, { recursive: true, force: true }); fs.rmSync(result.manifest, { force: true }); });
  assert.equal(path.dirname(result.manifest), path.dirname(result.scratch));
  const walk = (dir: string): string[] => fs.readdirEntriesSync(dir).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  for (const file of walk(result.scratch)) assert.ok(!/canary|manifest/i.test(fs.readFileSync(file, "utf8")), file);
  assert.ok(!JSON.stringify(result).includes("x >= 0"), "the CLI output does not reveal the planted edit");
});

test("a canary that breaks no scratch test is refused", (t: TestContext) => {
  const root = repo(t);
  assert.throws(() => prep(root, { canary: JSON.stringify({ file: "ai-framework/scripts/mod.js", find: "'pos'", replace: "'pos'" }) }), /breaks no scratch test/);
});

test("the canary's find text must match exactly once, and must exist", (t: TestContext) => {
  const root = repo(t);
  write(root, "ai-framework/scripts/mod.js", "module.exports = (x) => (x > 0 ? 'pos' : x > 0 ? 'again' : 'nonpos');\n");
  assert.throws(() => prep(root), /exactly once/);
  assert.throws(() => prep(root, { canary: JSON.stringify({ file: "ai-framework/scripts/mod.js", find: "does not occur", replace: "x" }) }), /exactly once/);
});

test("prepare refuses a red baseline, a canary outside the slice, and a test command that is not node", (t: TestContext) => {
  const root = repo(t);
  write(root, "ai-framework/scripts/mod.test.js", "throw new Error('already red');\n");
  assert.throws(() => prep(root), /baseline tests must pass/);
  const green = repo(t);
  assert.throws(() => prep(green, { canary: JSON.stringify({ file: "ai-framework/scripts/other.js", find: "a", replace: "b" }) }), /must be one of/);
  assert.throws(() => prep(green, { "test-cmd": JSON.stringify(["sh", "-c", "echo hi"]) }), /starting with "node"/);
});

test("prepare refuses symlinks, secret-shaped names, traversal, and a scratch dir inside the project", (t: TestContext) => {
  const root = repo(t);
  const outside = temp(t);
  write(outside, "victim.js", "x\n");
  fs.symlinkSync(path.join(outside, "victim.js"), path.join(root, "ai-framework/scripts/link.js"));
  assert.throws(() => prep(root, { files: `${FILES},ai-framework/scripts/link.js` }), /Not a regular file/);
  write(root, ".env", "K=V\n");
  assert.throws(() => prep(root, { files: `${FILES},.env` }), /secret-shaped/);
  assert.throws(() => prep(root, { files: `${FILES},../etc/passwd` }), /Unsafe path/);
  assert.throws(() => prep(root, { out: path.join(root, "scratch") }), /outside the project/);
  write(root, "big.js", "x".repeat(600 * 1024));
  assert.throws(() => prep(root, { files: `${FILES},big.js` }), /Too large/);
});

test("prepare and guard refuse an --out/--file whose ANCESTOR directory is a symlink back into the project", (t: TestContext) => {
  const root = repo(t);
  const outsideParent = temp(t);
  // The leaf ("leaked") does not exist yet; only its parent is a symlink. A lexical check on the
  // literal --out path sees a path outside root and would miss this.
  fs.symlinkSync(root, path.join(outsideParent, "back-in"));
  const escapedOut = path.join(outsideParent, "back-in", "ai-framework/scripts/leaked-out");
  assert.throws(() => prep(root, { out: escapedOut }), /outside the project/);
  assert.ok(!fs.existsSync(path.join(root, "ai-framework/scripts/leaked-out")), "no scratch copy must land inside the real project");

  const escapedSnap = path.join(outsideParent, "back-in", ".project", "leaked-snapshot.json");
  assert.throws(() => bench.guard(root, "snapshot", escapedSnap), /outside the project/);
  assert.ok(!fs.existsSync(path.join(root, ".project/leaked-snapshot.json")));
});

test("prepare and guard refuse to write through an existing symlink at --out/--file, even outside the project", (t: TestContext) => {
  const root = repo(t);
  const outside = temp(t);
  const victim = path.join(outside, "victim.txt");
  fs.writeFileSync(victim, "ORIGINAL\n");
  const snapLink = path.join(outside, "snap-link.json");
  fs.symlinkSync(victim, snapLink);
  assert.throws(() => bench.guard(root, "snapshot", snapLink), /symlink/);
  assert.equal(fs.readFileSync(victim, "utf8"), "ORIGINAL\n", "the symlink target must be untouched");
  assert.equal(fs.lstatSync(snapLink).isSymbolicLink(), true, "the symlink itself must be untouched");
});

test("canary-check and record-check refuse a symlinked or FIFO report/manifest/record instead of hanging or following it", (t: TestContext) => {
  const root = repo(t);
  const result = prep(root);
  t.after(() => { fs.rmSync(result.scratch, { recursive: true, force: true }); fs.rmSync(result.manifest, { force: true }); });
  const outside = temp(t);
  const victim = path.join(outside, "victim.txt");
  fs.writeFileSync(victim, "secret\n");
  const reportLink = path.join(outside, "report-link.md");
  fs.symlinkSync(victim, reportLink);
  assert.throws(() => bench.canaryCheck(result.manifest, reportLink), /regular file/);
  const manifestLink = path.join(outside, "manifest-link.json");
  fs.symlinkSync(victim, manifestLink);
  assert.throws(() => bench.canaryCheck(manifestLink, reportLink), /regular file/);
  assert.throws(() => bench.canaryCheck(result.manifest, path.join(outside, "does-not-exist.md")), /Cannot read/);
  assert.throws(() => bench.recordCheck(path.join(outside, "does-not-exist.md")), /Cannot read/);
});

test("canary-check on a FIFO --report returns immediately (refused), never hangs waiting for a writer", (t: TestContext) => {
  const root = repo(t);
  const result = prep(root);
  t.after(() => { fs.rmSync(result.scratch, { recursive: true, force: true }); fs.rmSync(result.manifest, { force: true }); });
  const outside = temp(t);
  const fifo = path.join(outside, "report.fifo");
  const mkfifo = spawnSync("mkfifo", [fifo], { timeout: 10000 });
  if (mkfifo.status !== 0) { t.skip("mkfifo not available on this host"); return; }
  const start = Date.now();
  assert.throws(() => bench.canaryCheck(result.manifest, fifo), /regular file/);
  assert.ok(Date.now() - start < 2000, "must reject a FIFO immediately, not block waiting for a writer");
});

test("guard passes on a no-op and detects a tracked edit, a new untracked file, an ignored-path write, a symlink swap, and a commit", (t: TestContext) => {
  const root = repo(t);
  const snapshots = temp(t);
  const snap = path.join(snapshots, "before.json");
  const check = () => bench.guard(root, "check", snap);
  bench.guard(root, "snapshot", snap);
  assert.equal(check().clean, true);

  write(root, ".project/notes.md", "edited\n");
  assert.deepEqual(check().changed, [".project/notes.md"]);
  git(root, "checkout", "--", ".project/notes.md");
  assert.equal(check().clean, true);

  write(root, "ai-framework/scripts/new.js", "x\n");
  assert.equal(check().clean, false);
  fs.rmSync(path.join(root, "ai-framework/scripts/new.js"));

  write(root, ".project/ignored/leak.txt", "written where git status cannot see it\n");
  const ignored = check();
  assert.equal(ignored.clean, false, "a write to a gitignored path under .project is caught by the tree hash, not by git status");
  assert.deepEqual(ignored.changed, [".project/ignored/leak.txt"]);
  fs.rmSync(path.join(root, ".project/ignored"), { recursive: true });

  fs.rmSync(path.join(root, ".project/notes.md"));
  fs.symlinkSync("/etc/hosts", path.join(root, ".project/notes.md"));
  assert.equal(check().clean, false, "a file swapped for a symlink is caught");
  fs.rmSync(path.join(root, ".project/notes.md"));
  fs.writeFileSync(path.join(root, ".project/notes.md"), "notes\n");
  assert.equal(check().clean, true);

  git(root, "commit", "-q", "--allow-empty", "-m", "sneaky");
  const committed = check();
  assert.equal(committed.headChanged, true);
  assert.equal(committed.clean, false, "an empty commit changes nothing on disk but is still not a clean guard");
});

test("guard notices an index-only change (status differs, tree bytes do not) and a retargeted symlink", (t: TestContext) => {
  const root = repo(t);
  const snap = path.join(temp(t), "s.json");
  fs.symlinkSync("/etc/hosts", path.join(root, ".project/link"));
  bench.guard(root, "snapshot", snap);
  git(root, "rm", "--cached", "-q", ".project/notes.md");
  const staged = bench.guard(root, "check", snap);
  assert.deepEqual(staged.changed, [], "no file content changed");
  assert.equal(staged.statusChanged, true);
  assert.equal(staged.clean, false);
  git(root, "add", ".project/notes.md");
  assert.equal(bench.guard(root, "check", snap).clean, true);
  fs.rmSync(path.join(root, ".project/link"));
  fs.symlinkSync("/etc/passwd", path.join(root, ".project/link"));
  assert.deepEqual(bench.guard(root, "check", snap).changed, [".project/link"], "the same path now points somewhere else");
});

test("guard detects re-edits outside the watched roots with unchanged Git status and index", (t: TestContext) => {
  const root = repo(t);
  const modified = "src/modified.txt";
  const untracked = "src/untracked\nfile-é.txt";
  const renamed = "src/renamed\tfile.txt";
  const added = "src/added.txt";
  const edited = [modified, untracked, renamed, added, "__proto__"];
  // The rename source would look like a status entry if parsed as a separate record.
  const source = "?? decoy.txt";
  write(root, modified, "base");
  write(root, source, "rename me");
  git(root, "add", "--", modified, source);
  git(root, "commit", "-qm", "sources");
  git(root, "mv", "--", source, renamed);
  write(root, ".git/info/exclude", "/decoy.txt\n");
  write(root, "decoy.txt", "ignored");
  write(root, added, "staged");
  git(root, "add", "--", added);
  for (const file of edited) write(root, file, "first edit");
  assert.match(git(root, "status", "--porcelain=v1", "-z"), /RM src\/renamed\tfile\.txt\0\?\? decoy\.txt\0/);

  const snap = path.join(temp(t), "snapshot.json");
  bench.guard(root, "snapshot", snap);
  write(root, "decoy.txt", "still ignored");
  assert.equal((bench.guard(root, "check", snap) as bench.GuardCheckResult).clean, true);
  for (const file of edited) {
    write(root, file, "second edit");
    assert.deepEqual(bench.guard(root, "check", snap), {
      clean: false, headChanged: false, statusChanged: false, changed: [file],
    });
    write(root, file, "first edit");
  }
  fs.rmSync(path.join(root, modified));
  assert.deepEqual((bench.guard(root, "check", snap) as bench.GuardCheckResult).changed, [modified]);
});

test("guard marks a reported path under a symlinked parent without probing the leaf", (t: TestContext) => {
  const root = repo(t);
  const leaf = "outside/dir/file.txt";
  write(root, leaf, "tracked");
  git(root, "add", "--", leaf);
  git(root, "commit", "-qm", "tracked leaf");
  fs.rmSync(path.join(root, "outside/dir"), { recursive: true });
  const target = temp(t);
  write(target, "file.txt", "synthetic target");
  fs.symlinkSync(target, path.join(root, "outside/dir"));
  assert.match(git(root, "status", "--porcelain=v1", "-z"), /D outside\/dir\/file\.txt\0/);
  const deps = createTestDeps();
  const lstat = deps.fs.lstatSync;
  const probed: string[] = [];
  deps.fs.lstatSync = (file) => {
    probed.push(file);
    return lstat(file);
  };
  const snap = path.join(temp(t), "snapshot.json");
  bench.guard(root, "snapshot", snap, deps);
  const tree = JSON.parse(fs.readFileSync(snap, "utf8")).tree;
  assert.equal(tree[leaf], "P:symlink");
  assert.equal(tree["outside/dir"], `L:${target}`);
  write(target, "file.txt", "edited target");
  assert.equal((bench.guard(root, "check", snap, deps) as bench.GuardCheckResult).clean, true);
  fs.rmSync(path.join(root, "outside/dir"));
  write(root, "outside/dir", "regular file in place of the directory");
  assert.deepEqual((bench.guard(root, "check", snap, deps) as bench.GuardCheckResult).changed, ["outside/dir", leaf]);
  fs.rmSync(path.join(root, "outside"), { recursive: true });
  assert.deepEqual((bench.guard(root, "check", snap, deps) as bench.GuardCheckResult).changed, ["outside/dir", leaf]);
  assert.ok(!probed.includes(path.join(root, leaf)), "lstat must stop at the parent");
});

test("guard skips secret-shaped and excluded paths that Git reports outside the watched roots", (t: TestContext) => {
  const root = repo(t);
  const skipped = ["src/credentials-synthetic.txt", "src/credentials-fixture/nested.txt", "src/node_modules/nested.txt"];
  for (const file of skipped) write(root, file, "synthetic");
  const status = git(root, "status", "--porcelain=v1", "-z", "-uall");
  for (const file of skipped) assert.ok(status.includes(`?? ${file}\0`), file);
  const blocked = skipped.map((file) => path.join(root, file));
  const deps = createTestDeps();
  const read = deps.fs.readBytesSync;
  deps.fs.readBytesSync = (file) => {
    assert.ok(!blocked.includes(file), `read a skipped path: ${file}`);
    return read(file);
  };
  const snap = path.join(temp(t), "snapshot.json");
  bench.guard(root, "snapshot", snap, deps);
  for (const file of skipped) write(root, file, "edited synthetic contents");
  assert.equal((bench.guard(root, "check", snap, deps) as bench.GuardCheckResult).clean, true);
});

test("guard walks a reported nested repository and skips its Git metadata", (t: TestContext) => {
  const root = repo(t);
  const nested = path.join(root, "nested");
  fs.mkdirSync(nested);
  git(nested, "init", "-q", "-b", "main");
  write(nested, "note.txt", "original");
  git(nested, "add", "--", "note.txt");
  git(nested, "commit", "-qm", "nested");
  assert.match(git(root, "status", "--porcelain=v1", "-z", "-uall"), /\?\? nested\/\0/);
  const snap = path.join(temp(t), "snapshot.json");
  bench.guard(root, "snapshot", snap);
  git(nested, "config", "test.snapshot", "ignored");
  assert.equal((bench.guard(root, "check", snap) as bench.GuardCheckResult).clean, true);
  write(nested, "note.txt", "edited");
  assert.deepEqual(bench.guard(root, "check", snap), {
    clean: false, headChanged: false, statusChanged: false, changed: ["nested/note.txt"],
  });
});

test("guard records a reported type change or large file without reading through the link or hashing the large file", (t: TestContext) => {
  const root = repo(t);
  const link = "src/retargeted.txt";
  const large = "src/large.txt";
  write(root, link, "tracked regular file");
  git(root, "add", "--", link);
  git(root, "commit", "-qm", "tracked file");
  const fullLink = path.join(root, link);
  fs.rmSync(fullLink);
  const target = temp(t);
  write(target, "one", "first target");
  write(target, "two", "second target");
  fs.symlinkSync(path.join(target, "one"), fullLink);
  write(root, large, "x".repeat(2 * 1024 * 1024 + 1));
  assert.match(git(root, "status", "--porcelain=v1", "-z"), /T src\/retargeted\.txt\0/);
  const deps = createTestDeps();
  const read = deps.fs.readBytesSync;
  const fullLarge = path.join(root, large);
  deps.fs.readBytesSync = (file) => {
    assert.ok(file !== fullLink && file !== fullLarge, `unexpected content read: ${file}`);
    return read(file);
  };
  const snap = path.join(temp(t), "snapshot.json");
  bench.guard(root, "snapshot", snap, deps);
  const { size, mtimeMs } = fs.lstatSync(fullLarge);
  assert.equal(JSON.parse(fs.readFileSync(snap, "utf8")).tree[large], `S:${size}:${Math.round(mtimeMs)}`);
  fs.rmSync(fullLink);
  fs.symlinkSync(path.join(target, "two"), fullLink);
  write(root, large, "y".repeat(size + 1));
  assert.deepEqual(bench.guard(root, "check", snap, deps), {
    clean: false, headChanged: false, statusChanged: false, changed: [large, link],
  });
});

test("guard ignores the paths hooks and generators write during a session", (t: TestContext) => {
  const root = repo(t);
  const snap = path.join(temp(t), "s.json");
  bench.guard(root, "snapshot", snap);
  write(root, ".project/metrics/token-consumption.json", "{}");
  write(root, ".project/reports/state.json", "{}");
  assert.equal(bench.guard(root, "check", snap).clean, true);
});

test("guard refuses a snapshot file inside the project and an unknown action", (t: TestContext) => {
  const root = repo(t);
  assert.throws(() => bench.guard(root, "snapshot", path.join(root, "snap.json")), /outside the project/);
  assert.throws(() => bench.guard(root, "bogus", path.join(temp(t), "s.json")), /snapshot or check/);
});

test("count excludes bookkeeping and this pitch's directory, includes untracked and deleted files, and --max fails when exceeded", (t: TestContext) => {
  const root = repo(t);
  const base = git(root, "rev-parse", "--short", "HEAD");
  write(root, "ai-framework/scripts/mod.js", "changed\n");
  write(root, "ai-framework/scripts/brand-new.js", "new\n");
  fs.rmSync(path.join(root, ".project/notes.md"));
  write(root, "VERSION", "9\n");
  write(root, "CHANGELOG.md", "x\n");
  write(root, ".project/status.md", "s\n");
  write(root, ".project/pitches/_followups.md", "f\n");
  write(root, ".project/knowledge/patterns/p.md", "k\n");
  write(root, ".project/runs/r.md", "r\n");
  write(root, ".project/pitches/mine/plan.md", "own pitch record\n");
  write(root, ".project/pitches/other/plan.md", "another pitch counts\n");
  const result = bench.count(root, base, "mine");
  assert.deepEqual(result.files, [".project/notes.md", ".project/pitches/other/plan.md", "ai-framework/scripts/brand-new.js", "ai-framework/scripts/mod.js"]);
  assert.equal(run(root, "count", "--since", base, "--pitch", "mine", "--max", "4").status, 0);
  assert.equal(run(root, "count", "--since", base, "--pitch", "mine", "--max", "3").status, 1);
  assert.throws(() => bench.count(root, "--output=x", "mine"), /commit hash/);
  assert.throws(() => bench.count(root, "HEAD; rm -rf", "mine"), /commit hash/);
});

test("count --max accepts only a non-negative safe integer in plain digits, and gates nothing when absent", (t: TestContext) => {
  const root = repo(t);
  const base = git(root, "rev-parse", "HEAD");
  write(root, "one.js", "1\n");
  write(root, "two.js", "2\n");
  const counted = (...args: string[]) => run(root, "count", "--since", base, ...args);
  const bad: string[][] = [
    ["--max"], ["--max", ""], ["--max", "abc"], ["--max", "-1"], ["--max", "1.5"], ["--max", "Infinity"], ["--max", "1e9"],
    ["--max", "0x10"], ["--max", " 5"], ["--max", "+5"], ["--max", "5\n"], ["--max", "9007199254740992"], ["--max", "9".repeat(400)],
    ["--max", "--pitch", "mine"], ["--max=1"], ["--max=abc"], ["--pitch", "--max", "1"],
  ];
  for (const args of bad) {
    const result = counted(...args);
    assert.equal(result.status, 1, JSON.stringify(args));
    assert.equal(result.stderr, "review-bench: --max must be a non-negative integer\n", JSON.stringify(args));
    assert.equal(result.stdout, "", JSON.stringify(args));
  }
  for (const [args, status] of [[["--max", "0"], 1], [["--max", "1"], 1], [["--max", "2"], 0], [["--max", "9007199254740991"], 0], [[], 0]] as const) {
    const result = counted(...args);
    assert.equal(result.status, status, `${JSON.stringify(args)} ${result.stderr}`);
    assert.equal(result.stderr, "");
    assert.deepEqual(JSON.parse(result.stdout), { count: 2, files: ["one.js", "two.js"] });
  }
  const unchanged = repo(t);
  assert.equal(run(unchanged, "count", "--since", git(unchanged, "rev-parse", "HEAD"), "--max", "0").status, 0);
});

test("count returns non-ASCII and control-character names exactly and still filters bookkeeping", (t: TestContext) => {
  const root = repo(t);
  // These letters have no decomposed form, so macOS cannot hand Git a different spelling.
  const tracked = "src/ø-日本.js", untracked = "src/ß-новый.js", tabbed = "src/tab\there.js", broken = "src/line\nbreak.js";
  write(root, tracked, "a\n");
  write(root, ".project/knowledge/patterns/ø-tracked.md", "a\n");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "names");
  const base = git(root, "rev-parse", "HEAD");
  write(root, tracked, "b\n");
  write(root, ".project/knowledge/patterns/ø-tracked.md", "b\n");
  for (const name of [untracked, tabbed, broken, ".project/runs/日本.md", ".project/pitches/mine/ø.md"]) write(root, name, "n\n");
  assert.deepEqual(bench.count(root, base, "mine").files, [broken, tabbed, untracked, tracked].sort());
});

test("containment is by path segment: names starting with .. are inside, only a .. segment is outside", (t: TestContext) => {
  const root = repo(t);
  const escaped = path.join(root, "..inside.json");
  assert.throws(() => bench.guard(root, "snapshot", escaped), /the snapshot file must be outside the project/);
  assert.ok(!fs.existsSync(escaped));
  assert.throws(() => bench.guard(root, "snapshot", path.join(root, "..dir", "s.json")), /outside the project/);
  assert.throws(() => prep(root, { out: path.join(root, "..scratch") }), /scratch dir must be outside the project/);
  assert.ok(!fs.existsSync(path.join(root, "..scratch")));
  for (const name of ["..notes.md", "..dir/file.md"]) {
    write(root, name, "inside\n");
    assert.equal(new TextDecoder().decode(bench.readGuarded(root, name)), "inside\n", name);
  }
  // The parent itself (relative path exactly "..") is outside: it gets past containment to the write refusal.
  assert.throws(() => bench.guard(root, "snapshot", path.dirname(root)), /Refusing to write through a symlink/);
});

test("guard check gives one fixed message for a snapshot of the wrong shape, before running Git", () => {
  const good = { head: "H1", status: "", tree: {} };
  const shapes: unknown[] = [
    null, [], "text", 7, true, {}, [good],
    { status: "", tree: {} }, { head: "H1", tree: {} }, { head: "H1", status: "" },
    { ...good, head: 1 }, { ...good, head: null }, { ...good, status: [] },
    { ...good, tree: null }, { ...good, tree: [] }, { ...good, tree: "x" }, { ...good, tree: ["x"] },
    { ...good, tree: { a: 1 } }, { ...good, tree: { a: "x", b: null } }, { ...good, tree: { a: {} } },
  ];
  for (const shape of shapes) {
    const text = JSON.stringify(shape);
    const f = fake({ "/snap/s.json": text }, gitScript(GUARD_GIT));
    assert.equal(bench.main(["guard", "check", "--file", "/snap/s.json"], f.deps), 1, text);
    assert.deepEqual(f.err, ["review-bench: snapshot file has the wrong shape\n"], text);
    assert.deepEqual(f.out, [], text);
    assert.deepEqual(f.spawned, [], text);
  }
  const valid = fake({ "/snap/s.json": JSON.stringify({ ...good, status: `index ${testDeps.crypto.sha256Hex("")}` }) }, gitScript(GUARD_GIT));
  assert.equal(bench.main(["guard", "check", "--file", "/snap/s.json"], valid.deps), 0);
});

test("guard reports a change to SETUP.md in changed, including when git status cannot see it", (t: TestContext) => {
  const root = repo(t);
  write(root, ".git/info/exclude", "SETUP.md\n");
  write(root, "SETUP.md", "setup\n");
  const snap = path.join(temp(t), "s.json");
  bench.guard(root, "snapshot", snap);
  write(root, "SETUP.md", "edited\n");
  const result = bench.guard(root, "check", snap) as bench.GuardCheckResult;
  assert.deepEqual(result.changed, ["SETUP.md"]);
  assert.equal(result.statusChanged, false);
  assert.equal(result.clean, false);
});

const shellQuote = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'";
function markerProgram(dir: string, name: string) {
  const program = path.join(dir, name);
  // Exit immediately, including in a filter process where Git waits for a protocol greeting.
  write(dir, name, '#!/bin/sh\n: > "$0.ran"\n');
  fs.chmodSync(program, 0o755);
  return { program, fired: () => fs.existsSync(`${program}.ran`) };
}

function gitScenario(t: TestContext) {
  const root = repo(t), dir = temp(t);
  const snapshot = path.join(dir, "initial.json"), next = path.join(dir, "next.json");
  const first = run(root, "guard", "snapshot", "--file", snapshot);
  assert.equal(first.status, 0, first.stderr);
  const base = git(root, "rev-parse", "HEAD");
  return { root, dir, commands: [
    ["guard", "snapshot", "--file", next], ["guard", "check", "--file", snapshot], ["count", "--since", base],
  ] };
}

function checkGitScenario(scenario: ReturnType<typeof gitScenario>, fired: () => boolean, refusal?: string, env: Env = {}) {
  for (const args of scenario.commands) {
    const result = runWithEnv(scenario.root, env, ...args);
    assert.equal(result.error, undefined, args.join(" "));
    assert.equal(fired(), false, `${args.join(" ")} ran a repository program`);
    assert.equal(result.status, refusal ? 1 : 0, result.stderr);
    assert.equal(result.stderr, refusal ? `review-bench: ${refusal}\n` : "");
    if (refusal) assert.equal(result.stdout, "");
  }
}

test("Git isolation disables core.fsmonitor", (t: TestContext) => {
  const scenario = gitScenario(t);
  const { program, fired } = markerProgram(scenario.dir, "monitor");
  git(scenario.root, "config", "core.fsmonitor", shellQuote(program));
  checkGitScenario(scenario, fired);
  plainGit(scenario.root, ["status", "--porcelain=v1"]);
  assert.equal(fired(), true, "plain Git ran the configured fsmonitor");
});

test("Git isolation disables the post-index-change hook", (t: TestContext) => {
  const scenario = gitScenario(t);
  const { fired } = markerProgram(scenario.dir, "post-index-change");
  git(scenario.root, "config", "core.hooksPath", scenario.dir);
  // Make a stat-only change so plain status refreshes and rewrites the index.
  const notes = path.join(scenario.root, ".project/notes.md");
  fs.utimesSync(notes, 1000, 1000);
  checkGitScenario(scenario, fired);
  fs.utimesSync(notes, 2000, 2000);
  plainGit(scenario.root, ["status", "--porcelain=v1"]);
  assert.equal(fired(), true, "plain Git ran the post-index-change hook");
});

for (const source of ["clean", "process", "include", "worktree", "smudge"] as const) {
  test(`Git isolation refuses a ${source} filter`, (t: TestContext) => {
    const scenario = gitScenario(t);
    const { root, dir } = scenario;
    const { program, fired } = markerProgram(dir, `filter-${source}`);
    const key = source === "process" || source === "smudge" ? source : "clean";
    const filterKey = `filter.marker.${key}`, invocation = shellQuote(program);
    write(root, ".gitattributes", ".project/notes.md filter=marker\n");
    // Keep the size unchanged so status checks the content through the filter.
    write(root, ".project/notes.md", "other\n");
    fs.utimesSync(path.join(root, ".project/notes.md"), 1000, 1000);
    if (source === "include") {
      const included = path.join(dir, "filters.gitconfig");
      git(root, "config", "--file", included, filterKey, invocation);
      git(root, "config", "include.path", included);
    } else if (source === "worktree") {
      git(root, "config", "extensions.worktreeConfig", "true");
      git(root, "config", "--worktree", filterKey, invocation);
    } else {
      git(root, "config", filterKey, invocation);
    }
    checkGitScenario(scenario, fired, "Refusing a repository with Git filters");
    if (source === "process") {
      // Git may report a protocol failure after the marker exits.
      plainGitResult(root, ["status", "--porcelain=v1"]);
    } else {
      plainGit(root, source === "smudge" ? ["checkout", "--", ".project/notes.md"] : ["status", "--porcelain=v1"]);
    }
    assert.equal(fired(), true, `plain Git ran the ${source} filter`);
  });
}

test("Git isolation refuses gitlinks before inspecting a submodule", (t: TestContext) => {
  const scenario = gitScenario(t);
  const source = repo(t), submodule = path.join(scenario.root, "module");
  git(scenario.root, "-c", "protocol.file.allow=always", "submodule", "add", "-q", "--", source, "module");
  const { program, fired } = markerProgram(scenario.dir, "submodule-filter");
  write(submodule, ".gitattributes", ".project/notes.md filter=marker\n");
  write(submodule, ".project/notes.md", "other\n");
  fs.utimesSync(path.join(submodule, ".project/notes.md"), 1000, 1000);
  git(submodule, "config", "filter.marker.clean", shellQuote(program));
  checkGitScenario(scenario, fired, "Refusing a repository with Git submodules");
  checkGitScenario({ ...scenario, root: path.join(scenario.root, ".project") }, fired, "--root must be the top level of the repository");
  plainGit(scenario.root, ["status", "--porcelain=v1"]);
  assert.equal(fired(), true, "plain Git inspected the submodule and ran its filter");
});

for (const variable of ["GIT_CONFIG_COUNT", "GIT_CONFIG_PARAMETERS"]) {
  test(`Git isolation drops parent ${variable}`, (t: TestContext) => {
    const scenario = gitScenario(t);
    const { program, fired } = markerProgram(scenario.dir, "parent-monitor");
    const invocation = shellQuote(program);
    // Passing through the filter key would make preflight refuse even if fsmonitor is overridden.
    const env = variable === "GIT_CONFIG_COUNT"
      ? {
        GIT_CONFIG_COUNT: "2", GIT_CONFIG_KEY_0: "core.fsmonitor", GIT_CONFIG_VALUE_0: invocation,
        GIT_CONFIG_KEY_1: "filter.marker.clean", GIT_CONFIG_VALUE_1: invocation,
      }
      : { GIT_CONFIG_PARAMETERS: [`core.fsmonitor=${invocation}`, `filter.marker.clean=${invocation}`].map(shellQuote).join(" ") };
    checkGitScenario(scenario, fired, undefined, env);
    plainGit(scenario.root, ["status", "--porcelain=v1"], env);
    assert.equal(fired(), true, `plain Git ran the monitor injected by ${variable}`);
  });
}

test("Git isolation refuses a malformed repository config", (t: TestContext) => {
  const scenario = gitScenario(t);
  const config = path.join(scenario.root, ".git", "config");
  fs.writeFileSync(config, `${fs.readFileSync(config, "utf8")}\n[malformed\n`);
  checkGitScenario(scenario, () => false, "git command failed");
});

test("Git isolation allows filter config keys that cannot define a driver command", (t: TestContext) => {
  const scenario = gitScenario(t);
  git(scenario.root, "config", "filter.clean", "unused");
  git(scenario.root, "config", "filter.marker.required", "false");
  checkGitScenario(scenario, () => false);
});

test("canary-check is true only when the report cites the canary's file within 3 lines", (t: TestContext) => {
  const root = repo(t);
  const result = prep(root);
  t.after(() => { fs.rmSync(result.scratch, { recursive: true, force: true }); fs.rmSync(result.manifest, { force: true }); });
  const dir = temp(t);
  const cases = [["mod.js:1 the comparison is off", true], ["see ai-framework/scripts/mod.js:4", true], ["mod.js:5", false], ["mod.js:1-3", true], ["mod.js lines 9-20", false], ["other.js:1", false], ["no citation at all", false]];
  for (const [text, expected] of cases) {
    const report = path.join(dir, "report.md");
    fs.writeFileSync(report, text);
    assert.equal(bench.canaryCheck(result.manifest, report).caught, expected, text);
  }
});

test("canary-check counts a citation only when the cited path names the canary's file", (t: TestContext) => {
  const dir = temp(t);
  const manifest = path.join(dir, "manifest.json");
  const report = path.join(dir, "report.md");
  // The canary sits in src/facts.mts; a sibling file holds a similar name.
  fs.writeFileSync(manifest, JSON.stringify({
    files: [{ path: "src/facts.mts" }, { path: "src/unrelated-facts.mts" }],
    canary: { file: "src/facts.mts", line: 10 },
  }));
  const cases: Array<[string, boolean]> = [
    // The similar name is not the canary's file (pitch row 7).
    ["unrelated-facts.mts:10", false],
    ["src/unrelated-facts.mts:10", false],
    // The full relative path names the canary.
    ["src/facts.mts:10", true],
    // An absolute or scratch path ending in "/" plus the canary's path names it.
    ["/tmp/scratch-42/src/facts.mts:10", true],
    ["/private/var/folders/x/src/facts.mts:10", true],
    // Inside a markdown link too.
    ["[the defect](src/facts.mts:10)", true],
    ["[the defect](src/facts.mts#L10)", true],
    // The bare file name names it only while that name is unique among the manifest's files.
    ["facts.mts:10", true],
    // The +-3 line window still decides.
    ["src/facts.mts:13", true],
    ["src/facts.mts:14", false],
    ["src/facts.mts:7", true],
    ["src/facts.mts:6", false],
    ["src/facts.mts:8-12", true],
    ["src/facts.mts:8-30", true],
    ["src/facts.mts:14-20", false],
    // Another file in the slice does not name the canary.
    ["src/unrelated-facts.mts:10", false],
  ];
  for (const [text, expected] of cases) {
    fs.writeFileSync(report, text);
    assert.equal(bench.canaryCheck(manifest, report).caught, expected, text);
  }
});

test("canary-check refuses a bare file name that is not unique among the manifest's files", (t: TestContext) => {
  const dir = temp(t);
  const manifest = path.join(dir, "manifest.json");
  const report = path.join(dir, "report.md");
  fs.writeFileSync(manifest, JSON.stringify({
    files: [{ path: "a/facts.mts" }, { path: "b/facts.mts" }],
    canary: { file: "a/facts.mts", line: 10 },
  }));
  fs.writeFileSync(report, "facts.mts:10");
  assert.equal(bench.canaryCheck(manifest, report).caught, false, "an ambiguous bare name names nothing");
  fs.writeFileSync(report, "a/facts.mts:10");
  assert.equal(bench.canaryCheck(manifest, report).caught, true, "the full path is unambiguous");
  fs.writeFileSync(report, "/tmp/scratch/a/facts.mts:10");
  assert.equal(bench.canaryCheck(manifest, report).caught, true, "a scratch path ending in the canary's path names it");
  fs.writeFileSync(report, "/tmp/scratch/b/facts.mts:10");
  assert.equal(bench.canaryCheck(manifest, report).caught, false, "another file's path does not name the canary");
});

test("canary-check refuses a manifest of the wrong shape and stays inside the size cap on a hostile report", (t: TestContext) => {
  const dir = temp(t);
  const manifest = path.join(dir, "manifest.json");
  const report = path.join(dir, "report.md");
  for (const shape of [null, [], "text", {}, { canary: { file: 1, line: 1 } }, { canary: { file: "a.mts" } }, { canary: { file: "a.mts", line: "1" } }]) {
    fs.writeFileSync(manifest, JSON.stringify(shape));
    fs.writeFileSync(report, "a.mts:1");
    assert.throws(() => bench.canaryCheck(manifest, report), /manifest has the wrong shape/, JSON.stringify(shape));
  }
  // A 1 MiB-class report is refused by the size cap instead of being scanned.
  fs.writeFileSync(manifest, JSON.stringify({ files: [{ path: "a.mts" }], canary: { file: "a.mts", line: 1 } }));
  fs.writeFileSync(report, "a.mts:1\n".repeat(200000));
  const start = Date.now();
  assert.throws(() => bench.canaryCheck(manifest, report), /too large/);
  assert.ok(Date.now() - start < 5000, "the oversize report is refused, not scanned");
});

test("canary-check scans a large hostile report in linear time", (t: TestContext) => {
  const dir = temp(t);
  const manifest = path.join(dir, "manifest.json");
  const report = path.join(dir, "report.md");
  fs.writeFileSync(manifest, JSON.stringify({ files: [{ path: "src/facts.mts" }], canary: { file: "src/facts.mts", line: 10 } }));
  // Path-shaped noise with no separator: the scanner must not backtrack over it.
  fs.writeFileSync(report, `${"a/b/c.d-e_f".repeat(20000)}\n`);
  const start = Date.now();
  assert.equal(bench.canaryCheck(manifest, report).caught, false);
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 5000, `the scan took ${elapsed}ms`);
});

const GOOD_RECORD = `# Review: subject

independent: yes
canary: caught
read-only: verified by review-bench guard
prompt-sha256: ${"a".repeat(64)}
model: sonnet
cross-file interactions: reviewed

| id | finding | verified |
|----|---------|----------|
| F1 | x | ran node -e ... |
`;

test("record-check accepts a complete record and names each missing field", (t: TestContext) => {
  const dir = temp(t);
  const check = (text: string) => { const file = path.join(dir, "r.md"); fs.writeFileSync(file, text); return bench.recordCheck(file); };
  assert.deepEqual(check(GOOD_RECORD), { ok: true, issues: [] });
  assert.match(check(GOOD_RECORD.replace("canary: caught", "canary: missed")).issues.join(), /independent: yes requires canary: caught/);
  assert.ok(check(GOOD_RECORD.replace("independent: yes", "independent: no").replace("canary: caught", "canary: missed")).ok, "independent: no is a valid, honest record");
  assert.match(check(GOOD_RECORD.replace("independent: yes\n", "")).issues.join(), /missing independent/);
  assert.match(check(GOOD_RECORD.replace(/read-only:.*\n/, "")).issues.join(), /read-only/);
  assert.match(check(GOOD_RECORD.replace(/prompt-sha256:.*\n/, "prompt-sha256: nothex\n")).issues.join(), /prompt-sha256/);
  assert.match(check(GOOD_RECORD.replace(/model:.*\n/, "")).issues.join(), /missing model/);
  assert.match(check(GOOD_RECORD.replace(/cross-file.*\n/, "")).issues.join(), /cross-file/);
  assert.match(check(GOOD_RECORD.replace("| verified |", "| result |")).issues.join(), /verified column/);
});

/** A record section for one reviewer role: its own fields under its own heading. */
const roleSection = (heading: string, fields: string): string => `## ${heading}\n\n${fields}\n`;

test("record-check judges each reviewer role's section on its own evidence", (t: TestContext) => {
  const dir = temp(t);
  const check = (text: string) => { const file = path.join(dir, "r.md"); fs.writeFileSync(file, text); return bench.recordCheck(file); };
  const table = "\n| id | finding | verified |\n|----|---------|----------|\n| F1 | x | yes |\n";
  const code = roleSection("Code reviewer", [
    "independent: yes", "canary: caught", "read-only: verified by review-bench guard",
    `prompt-sha256: ${"a".repeat(64)}`, "model: sonnet", "cross-file interactions: reviewed",
  ].join("\n"));
  const security = roleSection("Security reviewer", [
    "independent: yes", "canary: caught", "read-only: verified by review-bench guard",
    `prompt-sha256: ${"b".repeat(64)}`, "model: sonnet", "cross-file interactions: reviewed",
  ].join("\n"));
  // One heading per role, each with its own fields: the record passes.
  assert.deepEqual(check(code + security + table), { ok: true, issues: [] });
  // The security role claims independence but borrows the code role's canary: it fails.
  const caughtElsewhere = check(code + roleSection("Security reviewer", [
    "independent: yes", "read-only: verified by review-bench guard",
    `prompt-sha256: ${"b".repeat(64)}`, "model: sonnet", "cross-file interactions: reviewed",
  ].join("\n")) + table);
  assert.equal(caughtElsewhere.ok, false, "another section's canary does not satisfy this section");
  assert.match(caughtElsewhere.issues.join(), /independent: yes requires canary: caught/);
  // A section that keeps its own canary but borrows the other role's prompt hash fails.
  const borrowedHash = check(code + roleSection("Security reviewer", [
    "independent: yes", "canary: caught", "read-only: verified by review-bench guard",
    "model: sonnet", "cross-file interactions: reviewed",
  ].join("\n")) + table);
  assert.equal(borrowedHash.ok, false, "the prompt hash must be the section's own");
  assert.match(borrowedHash.issues.join(), /prompt-sha256/);
});

test("record-check refuses two independent lines in one section and a heading inside a code fence", (t: TestContext) => {
  const dir = temp(t);
  const check = (text: string) => { const file = path.join(dir, "r.md"); fs.writeFileSync(file, text); return bench.recordCheck(file); };
  const table = "\n| id | finding | verified |\n|----|---------|----------|\n| F1 | x | yes |\n";
  const fields = [
    "independent: yes", "canary: caught", "read-only: verified by review-bench guard",
    `prompt-sha256: ${"a".repeat(64)}`, "model: sonnet", "cross-file interactions: reviewed",
  ].join("\n");
  // Two independent lines in one section: the section is not checkable.
  const doubled = check(roleSection("Code reviewer", `${fields}\nindependent: no`) + table);
  assert.equal(doubled.ok, false);
  assert.match(doubled.issues.join(), /exactly one independent: line/);
  // A heading inside a fenced code block does not start a section, so the fields stay together.
  const fenced = check(`## Code reviewer\n\n${fields}\n\n\`\`\`md\n## Not a section\n\`\`\`\n` + table);
  assert.deepEqual(fenced, { ok: true, issues: [] });
  // Fenced text is an example: its independent line is neither a second claim nor a field.
  const fencedFields = check(`## Code reviewer\n\n${fields}\n\n\`\`\`md\n## Example record\nindependent: yes\n\`\`\`\n` + table);
  assert.deepEqual(fencedFields, { ok: true, issues: [] });
  // The same lines outside a fence do split the section, and the second half then lacks its fields.
  const unfenced = check(`## Code reviewer\n\n${fields}\n\n## Security reviewer\n\nindependent: no\n` + table);
  assert.equal(unfenced.ok, false, "the second section has its own independent line and needs its own fields");
  assert.match(unfenced.issues.join(), /read-only/);
  // Text before the first heading is a section of its own.
  const preamble = check(`independent: no\n\n## Code reviewer\n\n${fields}\n` + table);
  assert.equal(preamble.ok, false, "the preamble section claims independence without its own fields");
  assert.match(preamble.issues.join(), /read-only/);
});

test("record-check accepts one heading per reviewer role with its own fields", (t: TestContext) => {
  const dir = temp(t);
  const check = (text: string) => { const file = path.join(dir, "r.md"); fs.writeFileSync(file, text); return bench.recordCheck(file); };
  const section = (heading: string, sha: string, independent: string) => roleSection(heading, [
    `independent: ${independent}`, "canary: caught", "read-only: verified by review-bench guard",
    `prompt-sha256: ${sha}`, "model: sonnet", "cross-file interactions: reviewed",
  ].join("\n"));
  const record = [
    "# Audit record", "",
    section("Code reviewer", "a".repeat(64), "yes"),
    section("Security reviewer", "b".repeat(64), "yes"),
    section("Test coverage reviewer", "c".repeat(64), "no"),
    "## Findings", "",
    "| id | finding | verified |", "|----|---------|----------|", "| F1 | x | yes |", "",
  ].join("\n");
  assert.deepEqual(check(record), { ok: true, issues: [] });
  // The findings table may sit anywhere in the file, including under a later heading.
  const tableInAnotherSection = [
    "# Audit record", "",
    section("Code reviewer", "a".repeat(64), "yes"),
    "## Findings", "",
    "| id | finding | verified |", "|----|---------|----------|", "| F1 | x | yes |", "",
  ].join("\n");
  assert.deepEqual(check(tableInAnotherSection), { ok: true, issues: [] });
  // The findings table may sit before any heading too.
  const tableFirst = [
    "| id | finding | verified |", "|----|---------|----------|", "| F1 | x | yes |", "",
    "# Audit record", "",
    section("Code reviewer", "a".repeat(64), "yes"),
  ].join("\n");
  assert.deepEqual(check(tableFirst), { ok: true, issues: [] });
});

test("record-check refuses a symlink and an oversize record", (t: TestContext) => {
  const dir = temp(t);
  fs.writeFileSync(path.join(dir, "real.md"), GOOD_RECORD);
  fs.symlinkSync(path.join(dir, "real.md"), path.join(dir, "link.md"));
  assert.throws(() => bench.recordCheck(path.join(dir, "link.md")), /regular file/);
  fs.writeFileSync(path.join(dir, "big.md"), "x".repeat(300 * 1024));
  assert.throws(() => bench.recordCheck(path.join(dir, "big.md")), /too large/);
  assert.throws(() => bench.recordCheck(path.join(dir, "does-not-exist.md")), /Cannot read/);
});

test("CLI: prepare, guard, canary-check and record-check work end to end and fail with a clean exit code", (t: TestContext) => {
  const root = repo(t);
  const snapDir = temp(t);
  const prepared = run(root, "prepare", "--files", FILES, "--canary", CANARY, "--test-cmd", TEST_CMD);
  assert.equal(prepared.status, 0, prepared.stderr);
  const { scratch, manifest } = JSON.parse(prepared.stdout);
  t.after(() => { fs.rmSync(scratch, { recursive: true, force: true }); fs.rmSync(manifest, { force: true }); });
  const snap = path.join(snapDir, "s.json");
  assert.equal(run(root, "guard", "snapshot", "--file", snap).status, 0);
  assert.equal(run(root, "guard", "check", "--file", snap).status, 0);
  write(root, ".project/ignored/x", "y");
  assert.equal(run(root, "guard", "check", "--file", snap).status, 1);
  const report = path.join(snapDir, "rep.md");
  fs.writeFileSync(report, "found it at mod.js:1");
  assert.equal(run(root, "canary-check", "--manifest", manifest, "--report", report).status, 0);
  fs.writeFileSync(report, "nothing");
  assert.equal(run(root, "canary-check", "--manifest", manifest, "--report", report).status, 1);
  const record = path.join(snapDir, "rec.md");
  fs.writeFileSync(record, GOOD_RECORD);
  assert.equal(run(root, "record-check", record).status, 0);
  const bad = run(root, "bogus");
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Usage/);
});

test("malformed JSON flags are reported with a fixed message that does not echo the input", (t: TestContext) => {
  const root = repo(t);
  const result = run(root, "prepare", "--files", FILES, "--canary", "{secret-looking-input", "--test-cmd", TEST_CMD);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--canary is not valid JSON/);
  assert.ok(!result.stderr.includes("secret-looking-input"));
});

test("error output carries no control characters from a hostile argument", (t: TestContext) => {
  const root = repo(t);
  const result = run(root, "prepare", "--files", "a\u001b[2J.js", "--canary", CANARY, "--test-cmd", TEST_CMD);
  assert.equal(result.status, 1);
  assert.ok(!/[\u0000-\u0008\u000b-\u001f\u007f]/.test(result.stderr), JSON.stringify(result.stderr));
});

test("the bench executes selected workflow tests and git, and opens no network", () => {
  const source = fs.readFileSync(SOURCE, "utf8");
  assert.ok(!/require\(["'](?:node:)?(?:https?|net|tls|dgram|dns)["']\)/.test(source));
  assert.ok(!/\bfetch\(|\beval\(|new Function|shell:\s*true/.test(source));
  assert.ok(!/from "node:/.test(source.replace(/^import type .*$/gm, "")), "no runtime node:* import");
  assert.deepEqual([...source.matchAll(/runSync\("([^"]+)"/g)].map((m) => m[1]).sort(), ["git"]);
  assert.match(source, /runWorkflowSync\(deps, args,/);
});

test("the audit phase states the record shape the bench checks, and keeps every heading it had", () => {
  const phase = path.join(here, "..", "workflow", "phases", "3-audit.md");
  const text = fs.readFileSync(phase, "utf8");
  // Every heading the phase had before this pitch stays.
  for (const heading of [
    "# Phase 3: Audit", "## Purpose", "## Trigger", "## Subagent fan-out", "## Finding contract (every subagent)",
    "## Verify before triage (main thread)", "## Measurement over assertion", "## Reviewer contract (every dispatch)",
    "### Review prompt template", "## Incomplete reviews", "## Synthesis (single-threaded, main thread)",
    "## Triage tiers (not negotiable)", "## Loop discipline", "## Evidence rule (same as /build)",
    "## Eval gate (AI changes — hard)", "## Cross-pitch conflict check", "## Adaptive gate", "## Output",
    "## Optional Orca multi-agent (off by default)", "## Confirmation gate", "## Transition",
  ]) {
    assert.ok(text.split("\n").some((line) => line.trim() === heading), `missing heading: ${heading}`);
  }
  const contract = text.slice(text.indexOf("## Reviewer contract (every dispatch)"), text.indexOf("### Review prompt template"));
  assert.ok(contract.length > 0, "the reviewer contract is present");
  // One heading per reviewer role, with its own fields.
  assert.match(contract, /one heading per reviewer role/i);
  assert.match(contract, /independent:/);
  assert.match(contract, /read-only:/);
  assert.match(contract, /prompt-sha256:/);
  assert.match(contract, /model:/);
  assert.match(contract, /cross-file interactions:/);
  assert.match(contract, /canary: caught/);
  // Full file names in citations.
  assert.match(contract, /full file names in citations/i);
  // One sentence pointing at the isolation-boundary decision entry.
  assert.match(contract, /review-bench-isolation-boundary/);
  assert.equal((contract.match(/review-bench-isolation-boundary/g) ?? []).length, 1, "one sentence names the decision entry");
});

// ---- main() with an in-memory fake RuntimeDeps ------------------------------------------------------


import type { RunResult, RuntimeDeps, SpawnOptions, StatLike } from "./runtime/types.mts";

interface Fake {
  deps: RuntimeDeps;
  files: Map<string, string>;
  links: Map<string, string>;
  fifos: Set<string>;
  out: string[];
  err: string[];
  fsCalls: string[];
  spawned: Array<{ command: string; args: string[]; options?: SpawnOptions }>;
}

const FAKE_ROOT = "/proj";
const stat = (kind: "file" | "link" | "fifo" | "dir", size = 0): StatLike => ({
  isFile: () => kind === "file", isDirectory: () => kind === "dir", isSymbolicLink: () => kind === "link",
  size, mode: 0o644, mtimeMs: 1, ino: 1, dev: 1, nlink: 1, uid: 1,
});

/** In-memory fs (files, symlinks, fifos), scripted child, fixed pid and random bytes. Unused deps throw. */
function fake(files: Record<string, string>, child: (command: string, args: string[]) => RunResult = () => ({ status: 0, signal: null, stdout: "", stderr: "" })): Fake {
  const map = new Map(Object.entries(files));
  const links = new Map<string, string>();
  const fifos = new Set<string>();
  const out: string[] = [];
  const err: string[] = [];
  const fsCalls: string[] = [];
  const spawned: Fake["spawned"] = [];
  const isDir = (p: string): boolean => [...map.keys(), ...links.keys(), ...fifos].some((k) => k.startsWith(`${p}/`));
  const enoent = (file: string): Error => Object.assign(new Error(`ENOENT ${file}`), { code: "ENOENT" });
  const deps = {
    runtime: "node",
    fs: {
      lstatSync(file: string): StatLike {
        // Each path has its own inode, as on a real disk; containment compares them.
        const own = (value: StatLike): StatLike => ({ ...value, ino: [...file].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 1_000_000_007, 7) });
        if (links.has(file)) return own(stat("link"));
        if (fifos.has(file)) return own(stat("fifo"));
        if (map.has(file)) return own(stat("file", Buffer.byteLength(map.get(file) as string)));
        if (isDir(file)) return own(stat("dir"));
        throw enoent(file);
      },
      readFileSync(file: string): string { if (!map.has(file)) throw enoent(file); return map.get(file) as string; },
      readBytesSync(file: string): Uint8Array { if (!map.has(file)) throw enoent(file); return new TextEncoder().encode(map.get(file) as string); },
      writeFileSync(file: string, data: string | Uint8Array, options?: { flag?: string }): void {
        fsCalls.push(`write ${file} flag=${options?.flag ?? ""}`);
        if (options?.flag === "wx" && map.has(file)) throw Object.assign(new Error("EEXIST"), { code: "EEXIST" });
        map.set(file, typeof data === "string" ? data : new TextDecoder().decode(data));
      },
      renameSync(from: string, to: string): void { fsCalls.push(`rename ${from} -> ${to}`); map.set(to, map.get(from) as string); map.delete(from); },
      rmSync(file: string): void { fsCalls.push(`rm ${file}`); map.delete(file); },
      realpathSync: (file: string) => file,
      readlinkSync: (file: string) => links.get(file) as string,
      existsSync: (file: string) => map.has(file) || links.has(file) || isDir(file),
      readdirSync(dir: string): string[] {
        const names = new Set<string>();
        for (const key of [...map.keys(), ...links.keys(), ...fifos]) if (key.startsWith(`${dir}/`)) names.add(key.slice(dir.length + 1).split("/")[0]);
        return [...names].sort();
      },
      mkdirSync: () => undefined,
      mkdtempSync: (prefix: string) => `${prefix}x1`,
    },
    path: path.posix,
    child: {
      runSync(command: string, args: string[], options?: SpawnOptions): RunResult { spawned.push({ command, args, options }); return child(command, args); },
    },
    crypto: {
      sha256Hex: (data: string | Uint8Array) => testDeps.crypto.sha256Hex(data),
      randomBytes: () => Uint8Array.from([0xde, 0xad, 0xbe, 0xef, 0x01, 0x02]),
    },
    os: { tmpdir: () => "/tmpfake" },
    io: { stdout: { write: (text: string) => { out.push(text); } }, stderr: { write: (text: string) => { err.push(text); } } },
    proc: { cwd: () => FAKE_ROOT, pid: 4242, env: {} },
  } as unknown as RuntimeDeps;
  return { deps, files: map, links, fifos, out, err, fsCalls, spawned };
}
const FILTER_CONFIG = "config --includes --name-only -z --get-regexp ^(filter|hook)\\.";
const INDEX_LIST = "ls-files --stage -z -- :/";
const TOP_LEVEL = "rev-parse --show-toplevel";
const HIDDEN_LIST = "ls-files -v -z -- :/";
const gitScript = (table: Record<string, string>) => (_command: string, args: string[]): RunResult => {
  const key = args.slice(6).join(" ");
  const ok = (stdout: string): RunResult => ({ status: 0, signal: null, stdout, stderr: "" });
  if (key === TOP_LEVEL) return ok(`${FAKE_ROOT}\n`);
  if (key === INDEX_LIST || key === HIDDEN_LIST) return ok("");
  if (key === "rev-parse --verify --quiet abcdef1^{commit}") return ok("abcdef1\n");
  return key in table ? { status: 0, signal: null, stdout: table[key], stderr: "" } : { status: 1, signal: null, stdout: "", stderr: "" };
};

test("main: unknown command prints the usage line on stderr and exits 1", () => {
  const f = fake({});
  assert.equal(bench.main(["bogus"], f.deps), 1);
  assert.deepEqual(f.out, []);
  assert.match(f.err.join(""), /^review-bench: Usage: review-bench\.mts </);
});

test("main: record-check reports ok on a complete record (exit 0) and the missing fields otherwise (exit 1)", () => {
  const good = fake({ "/rec.md": GOOD_RECORD });
  assert.equal(bench.main(["record-check", "/rec.md"], good.deps), 0);
  assert.deepEqual(JSON.parse(good.out.join("")), { ok: true, issues: [] });
  const bad = fake({ "/rec.md": "independent: yes\n" });
  assert.equal(bench.main(["record-check", "/rec.md"], bad.deps), 1);
  assert.match(JSON.parse(bad.out.join("")).issues.join(), /requires canary: caught/);
});

test("main: count lists changed files through git, drops bookkeeping, and --max decides the exit code", () => {
  const table = { "diff --name-only --no-renames -z --ignore-submodules=all abcdef1 --": "a.js\0VERSION\0.project/runs/r.md\0", "ls-files --others --exclude-standard -z": "b.js\0" };
  const f = fake({}, gitScript(table));
  assert.equal(bench.main(["count", "--since", "abcdef1", "--root", FAKE_ROOT], f.deps), 0);
  assert.deepEqual(JSON.parse(f.out.join("")), { count: 2, files: ["a.js", "b.js"] });
  const over = fake({}, gitScript(table));
  assert.equal(bench.main(["count", "--since", "abcdef1", "--max", "1"], over.deps), 1);
  assert.equal(bench.main(["count", "--since", "not-a-hash"], fake({}).deps), 1);
});

test("main: a failing git command is one fixed message, never the child's stderr", () => {
  const f = fake({}, () => ({ status: 128, signal: null, stdout: "", stderr: "fatal: secret path /home/x" }));
  assert.equal(bench.main(["count", "--since", "abcdef1"], f.deps), 1);
  assert.equal(f.err.join(""), "review-bench: git command failed\n");
  const spawnFails = fake({}, () => { throw new Error("ENOENT git at /secret"); });
  assert.equal(bench.main(["count", "--since", "abcdef1"], spawnFails.deps), 1);
  assert.equal(spawnFails.err.join(""), "review-bench: git command failed\n");
});

const GUARD_STATUS = "status --porcelain=v1 -z -uall --ignore-submodules=all";
const GUARD_GIT = { "rev-parse HEAD": "H1\n", [GUARD_STATUS]: "" };

test("Git isolation applies the same options and fresh allowlisted environment to every call", () => {
  const f = fake({}, (_command, args) => {
    const key = args.slice(6).join(" ");
    const stdout = key === TOP_LEVEL ? `${FAKE_ROOT}\n` : key.startsWith("rev-parse --verify") ? "abcdef1\n" : "";
    return { status: 0, signal: null, stdout, stderr: "" };
  });
  Object.assign(f.deps.proc.env, {
    PATH: "/bin", HOME: "/home/test", SystemRoot: "C:/Windows", UNRELATED: "parent-only",
    GIT_CONFIG_COUNT: "1", GIT_CONFIG_PARAMETERS: "parent-only", GIT_CONFIG_GLOBAL: "/untrusted",
  });
  assert.equal(bench.main(["guard", "snapshot", "--file", "/snap/s.json"], f.deps), 0);
  assert.equal(bench.main(["count", "--since", "abcdef1"], f.deps), 0);
  const preflight = [TOP_LEVEL, FILTER_CONFIG, INDEX_LIST, HIDDEN_LIST];
  const calls = [
    ...preflight, "rev-parse HEAD", GUARD_STATUS,
    ...preflight, "rev-parse --verify --quiet abcdef1^{commit}", "diff --name-only --no-renames -z --ignore-submodules=all abcdef1 --", "ls-files --others --exclude-standard -z",
  ];
  assert.deepEqual(f.spawned, calls.map((args) => ({
    command: "git", args: ["-C", FAKE_ROOT, "-c", "core.fsmonitor=false", "-c", "core.hooksPath=/dev/null", ...args.split(" ")],
    options: { timeoutMs: 20000, env: {
      PATH: "/bin", HOME: "/home/test", SystemRoot: "C:/Windows", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_OPTIONAL_LOCKS: "0", GIT_NO_LAZY_FETCH: "1", GIT_TERMINAL_PROMPT: "0",
    } },
  })));
  assert.equal(new Set(f.spawned.map(({ options }) => options?.env)).size, calls.length);
});

test("Git isolation stops before listing on failed preflight checks", () => {
  const noMatch: RunResult = { status: 1, signal: null, stdout: "", stderr: "" };
  for (const failure of [
    { stdout: "unexpected output" }, { stderr: "warning: private git config" }, { status: 128 },
    { status: null }, { errorCode: "ETIMEDOUT" }, { signal: "SIGKILL" },
  ]) {
    const f = fake({}, (_command, args) => (args.slice(6).join(" ") === TOP_LEVEL ? { ...noMatch, status: 0, stdout: `${FAKE_ROOT}\n` } : { ...noMatch, ...failure }));
    assert.equal(bench.main(["count", "--since", "abcdef1"], f.deps), 1);
    assert.deepEqual(f.err, ["review-bench: git command failed\n"]);
    assert.deepEqual(f.spawned.map(({ args }) => args.slice(6).join(" ")), [TOP_LEVEL, FILTER_CONFIG]);
  }
  const failedIndex = fake({}, (_command, args) => {
    const key = args.slice(6).join(" ");
    return key === TOP_LEVEL ? { ...noMatch, status: 0, stdout: `${FAKE_ROOT}\n` } : { ...noMatch, status: key === FILTER_CONFIG ? 1 : 128 };
  });
  assert.equal(bench.main(["count", "--since", "abcdef1"], failedIndex.deps), 1);
  assert.deepEqual(failedIndex.err, ["review-bench: git command failed\n"]);
  assert.deepEqual(failedIndex.spawned.map(({ args }) => args.slice(6).join(" ")), [TOP_LEVEL, FILTER_CONFIG, INDEX_LIST]);
});

test("main: guard snapshot writes atomically (temp file opened wx, then rename) outside the project, exit 0", () => {
  const f = fake({ "/proj/.project/notes.md": "n" }, gitScript(GUARD_GIT));
  assert.equal(bench.main(["guard", "snapshot", "--file", "/snap/s.json"], f.deps), 0);
  assert.deepEqual(JSON.parse(f.out.join("")), { snapshot: "/snap/s.json" });
  const temp = "/snap/s.json.tmp-4242-deadbeef0102";
  assert.deepEqual(f.fsCalls, [`write ${temp} flag=wx`, `rename ${temp} -> /snap/s.json`, `rm ${temp}`]);
  assert.equal(JSON.parse(f.files.get("/snap/s.json") as string).tree[".project/notes.md"], testDeps.crypto.sha256Hex("n"));
});

test("main: guard check is clean on a no-op, and exit 1 listing the path when a watched file changes", () => {
  const f = fake({ "/proj/.project/notes.md": "n" }, gitScript(GUARD_GIT));
  assert.equal(bench.main(["guard", "snapshot", "--file", "/snap/s.json"], f.deps), 0);
  f.out.length = 0;
  assert.equal(bench.main(["guard", "check", "--file", "/snap/s.json"], f.deps), 0);
  assert.equal(JSON.parse(f.out.join("")).clean, true);
  f.out.length = 0;
  f.files.set("/proj/.project/notes.md", "edited");
  assert.equal(bench.main(["guard", "check", "--file", "/snap/s.json"], f.deps), 1);
  assert.deepEqual(JSON.parse(f.out.join("")).changed, [".project/notes.md"]);
});

test("main: guard refuses a snapshot file inside the project, a symlinked target, and an unknown action", () => {
  const inProject = fake({}, gitScript(GUARD_GIT));
  assert.equal(bench.main(["guard", "snapshot", "--file", "/proj/s.json"], inProject.deps), 1);
  assert.match(inProject.err.join(""), /the snapshot file must be outside the project/);
  const linked = fake({}, gitScript(GUARD_GIT));
  linked.links.set("/snap/link.json", "/victim");
  assert.equal(bench.main(["guard", "snapshot", "--file", "/snap/link.json"], linked.deps), 1);
  assert.match(linked.err.join(""), /Refusing to write through a symlink: link\.json/);
  assert.deepEqual(linked.fsCalls, []);
  assert.equal(bench.main(["guard", "bogus", "--file", "/snap/s.json"], fake({}, gitScript(GUARD_GIT)).deps), 1);
});

test("guard round-trips snapshots above the report cap and still detects edits", () => {
  const entries = Object.fromEntries(Array.from({ length: 2500 }, (_, i) => [`/proj/ai-framework/${i}-${"n".repeat(40)}.md`, "n"]));
  const f = fake(entries, gitScript(GUARD_GIT));
  bench.guard(FAKE_ROOT, "snapshot", "/snap/s.json", f.deps);
  assert.ok((f.files.get("/snap/s.json") as string).length > 256 * 1024);
  assert.equal((bench.guard(FAKE_ROOT, "check", "/snap/s.json", f.deps) as bench.GuardCheckResult).clean, true);
  f.files.set(Object.keys(entries)[0], "edited");
  assert.equal((bench.guard(FAKE_ROOT, "check", "/snap/s.json", f.deps) as bench.GuardCheckResult).clean, false);
});

test("guard consumes the copy source field without treating it as a status entry", () => {
  const f = fake({ "/proj/copy.txt": "copy", "/proj/decoy.txt": "ignored" }, gitScript({
    ...GUARD_GIT, [GUARD_STATUS]: "C  copy.txt\0?? decoy.txt\0",
  }));
  bench.guard(FAKE_ROOT, "snapshot", "/snap/s.json", f.deps);
  assert.deepEqual(Object.keys(JSON.parse(f.files.get("/snap/s.json") as string).tree), ["copy.txt"]);
});

test("guard applies the tree walk cap to status paths and watched roots combined", () => {
  const paths = Array.from({ length: 50000 }, (_, i) => `file-${i}.txt`);
  const f = fake(Object.fromEntries([...paths, "README.md"].map((file) => [`/proj/${file}`, "x"])), gitScript({
    ...GUARD_GIT, [GUARD_STATUS]: paths.map((file) => `?? ${file}\0`).join(""),
  }));
  assert.throws(() => bench.guard(FAKE_ROOT, "snapshot", "/snap/s.json", f.deps), /tree too large to snapshot/);
  assert.deepEqual(f.fsCalls, []);
});

test("guard never reads secret-shaped files", () => {
  const secret = "/proj/.project/credentials.json", f = fake({ [secret]: "synthetic fixture", "/proj/.project/notes.md": "notes" }, gitScript(GUARD_GIT));
  const read = f.deps.fs.readBytesSync;
  f.deps.fs.readBytesSync = file => { assert.notEqual(file, secret); return read(file); };
  bench.guard(FAKE_ROOT, "snapshot", "/snap/s.json", f.deps);
  assert.deepEqual(Object.keys(JSON.parse(f.files.get("/snap/s.json") as string).tree), [".project/notes.md"]);
});

test("guard refuses an oversized snapshot before publishing it", () => {
  const f = fake({}, gitScript({ ...GUARD_GIT, [GUARD_STATUS]: "x".repeat(16 * 1024 * 1024) }));
  assert.throws(() => bench.guard(FAKE_ROOT, "snapshot", "/snap/s.json", f.deps), /too large/);
  assert.deepEqual(f.fsCalls, []);
});

test("main: guard check refuses a symlink, a FIFO and an oversize snapshot without reading them", () => {
  const f = fake({}, gitScript(GUARD_GIT));
  f.links.set("/snap/l.json", "/victim");
  f.fifos.add("/snap/f.json");
  f.files.set("/snap/big.json", "x".repeat(16 * 1024 * 1024 + 1));
  for (const [name, message] of [["l.json", /regular file/], ["f.json", /regular file/], ["big.json", /too large/]] as const) {
    f.err.length = 0;
    assert.equal(bench.main(["guard", "check", "--file", `/snap/${name}`], f.deps), 1, name);
    assert.match(f.err.join(""), message, name);
  }
});

test("main: error text is printable, with control characters from a hostile argument replaced", () => {
  const f = fake({});
  const hostile = "a\u001b[2J.js";
  const canary = JSON.stringify({ file: hostile, find: "x", replace: "y" });
  assert.equal(bench.main(["prepare", "--files", hostile, "--canary", canary, "--test-cmd", TEST_CMD], f.deps), 1);
  assert.equal(f.err.join(""), "review-bench: Cannot read: a?[2J.js\n");
});

test("main: prepare refuses a scratch dir inside the project before copying anything", () => {
  const f = fake({ "/proj/a.js": "x" });
  assert.equal(bench.main(["prepare", "--files", "a.js", "--canary", JSON.stringify({ file: "a.js", find: "x", replace: "y" }), "--test-cmd", JSON.stringify(["node", "a.js"]), "--out", "/proj/scratch"], f.deps), 1);
  assert.match(f.err.join(""), /scratch dir must be outside the project/);
  assert.deepEqual(f.fsCalls, []);
});

test("canary-check needs a slash before the path: a longer name that merely ends with it does not count", (t: TestContext) => {
  const dir = temp(t);
  const check = (canary: string, report: string): boolean => {
    write(dir, "manifest.json", JSON.stringify({ files: [{ path: canary }], canary: { file: canary, line: 10 } }));
    write(dir, "report.md", report);
    return bench.canaryCheck(path.join(dir, "manifest.json"), path.join(dir, "report.md")).caught;
  };
  assert.equal(check("facts.mts", "unrelated-facts.mts:10"), false, "a canary at the project root");
  assert.equal(check("lib/facts.mts", "otherlib/facts.mts:10"), false, "a directory that only ends the same");
  assert.equal(check("lib/facts.mts", "/scratch/lib/facts.mts:10"), true);
});

// Audit cycle 1 regressions: each of these let a repository run a program or let a gate pass wrongly.

test("a hook defined in Git configuration is refused before it can run", (t: TestContext) => {
  const root = repo(t), dir = temp(t);
  const { program, fired } = markerProgram(dir, "config-hook");
  git(root, "config", "hook.marker.command", shellQuote(program));
  git(root, "config", "hook.marker.event", "post-index-change");
  fs.utimesSync(path.join(root, ".project/notes.md"), 1000, 1000);
  const head = git(root, "rev-parse", "HEAD");
  for (const args of [["count", "--since", head], ["guard", "snapshot", "--file", path.join(dir, "s.json")]]) {
    const result = run(root, ...args);
    assert.equal(result.status, 1, args[0]);
    assert.match(result.stderr, /hooks in its Git configuration/);
  }
  assert.equal(fired(), false);
});

test("count and guard see what a redirected root, a rename, hidden index flags, re-staging and a shadowing branch would hide", (t: TestContext) => {
  const dir = temp(t);
  const sub = repo(t);
  assert.match(run(path.join(sub, "ai-framework"), "count", "--since", git(sub, "rev-parse", "HEAD")).stderr, /top level of the repository/);
  const redirected = repo(t), decoy = repo(t);
  git(redirected, "config", "core.worktree", decoy);
  assert.match(run(redirected, "guard", "snapshot", "--file", path.join(dir, "d.json")).stderr, /top level of the repository/);
  const moved = repo(t), base = git(moved, "rev-parse", "HEAD");
  git(moved, "mv", "ai-framework/scripts/mod.js", ".project/knowledge-mod.js");
  fs.mkdirSync(path.join(moved, ".project/knowledge"), { recursive: true });
  git(moved, "mv", ".project/knowledge-mod.js", ".project/knowledge/mod.js");
  assert.deepEqual(bench.count(moved, base, undefined).files, ["ai-framework/scripts/mod.js"]);
  for (const flag of ["--assume-unchanged", "--skip-worktree"]) {
    const hidden = repo(t);
    git(hidden, "update-index", flag, "ai-framework/scripts/mod.js");
    assert.throws(() => bench.count(hidden, git(hidden, "rev-parse", "HEAD"), undefined), /assume-unchanged or skip-worktree/, flag);
  }
  const staged = repo(t), snapshot = path.join(dir, "staged.json");
  write(staged, "outside.txt", "one\n"); git(staged, "add", "-A");
  bench.guard(staged, "snapshot", snapshot);
  write(staged, "outside.txt", "two\n"); git(staged, "add", "-A");
  assert.equal((bench.guard(staged, "check", snapshot) as bench.GuardCheckResult).statusChanged, true);
  const shadow = repo(t), first = git(shadow, "rev-parse", "HEAD");
  write(shadow, "later.js", "x\n"); git(shadow, "add", "-A"); git(shadow, "commit", "-q", "-m", "later");
  git(shadow, "branch", first.slice(0, 7));
  assert.throws(() => bench.count(shadow, first.slice(0, 7), undefined), /does not name that commit|git command failed/);
});

test("a relative or in-project PATH entry cannot supply git", (t: TestContext) => {
  const root = repo(t), dir = temp(t), head = git(root, "rev-parse", "HEAD");
  const { program } = markerProgram(dir, "fake-git");
  // The marker is written beside whichever copy runs, so watch the copy inside the project.
  const fired = () => fs.existsSync(path.join(root, "git.ran"));
  fs.copyFileSync(program, path.join(root, "git"));
  fs.chmodSync(path.join(root, "git"), 0o755);
  fs.symlinkSync(root, path.join(dir, "alias"));
  for (const entry of [".", root, path.join(dir, "alias")]) {
    spawnSync(process.execPath, [...RUNTIME_FLAGS, SCRIPT, "--root", root, "count", "--since", head], { cwd: root, encoding: "utf8", env: { ...process.env, PATH: `${entry}${path.delimiter}${process.env.PATH}` } });
    assert.equal(fired(), false, entry);
  }
  spawnSync("git", ["--version"], { cwd: root, encoding: "utf8", env: { ...process.env, PATH: `.${path.delimiter}${process.env.PATH}` } });
  assert.equal(fired(), true, "the planted program does run when PATH allows it");
});

test("a snapshot path that reaches the project by another spelling is refused", (t: TestContext) => {
  const parent = temp(t), root = path.join(parent, "repo");
  fs.mkdirSync(root);
  git(root, "init", "-q"); write(root, "a.txt", "a\n"); git(root, "add", "-A"); git(root, "commit", "-q", "-m", "a");
  if (!fs.existsSync(path.join(parent, "REPO"))) { t.skip("case-sensitive disk: the other spelling is another folder"); return; }
  assert.throws(() => bench.guard(root, "snapshot", path.join(parent, "REPO", "inside.json")), /outside the project/);
  assert.equal(fs.existsSync(path.join(root, "inside.json")), false);
});

test("record-check ignores fenced or commented evidence and refuses malformed claims", (t: TestContext) => {
  const dir = temp(t);
  const table = "\n| id | verified |\n|----|----------|\n";
  const base = `read-only: verified by guard\nprompt-sha256: ${"a".repeat(64)}\nmodel: m\ncross-file interactions: reviewed\n`;
  const check = (text: string) => { const file = path.join(dir, "r.md"); fs.writeFileSync(file, text); return bench.recordCheck(file).ok; };
  assert.equal(check(`## A\n${base}independent: yes (note)\ncanary: caught (line 3)\n${table}`), true);
  assert.equal(check(`## A\n${base}independent: yes\ncanary: caught\nCanary: the planted edit weakened a bound.\n${table}`), true, "a prose description is not a second field");
  assert.equal(check(`## A\n${base}independent: no\n\`independent: yes\` means a fresh agent.\n${table}`), true, "a quoted phrase is not a claim");
  const bad: Record<string, string> = {
    "canary in a fence": `## A\n${base}independent: yes\n\`\`\`\ncanary: caught\n\`\`\`\n${table}`,
    "canary in a comment": `## A\n${base}independent: yes\n<!--\ncanary: caught\n-->\n${table}`,
    "short fence does not close a long one": `## A\n${base}independent: yes\n${table}\`\`\`\`\n\`\`\`\ncanary: caught\n\`\`\`\`\n`,
    "canary caught: no": `## A\n${base}independent: yes\ncanary: caught: no (missed)\n${table}`,
    "two canary lines": `## A\n${base}independent: yes\ncanary: missed\ncanary: caught\n${table}`,
    "second claim is invalid": `## A\n${base}independent: no\nindependent: maybe\n${table}`,
    "bulleted claim": `## A\n${base}independent: no\n## B\n- independent: yes\n${table}`,
    "bold claim": `## A\n${base}independent: no\n## B\n**independent:** yes\n${table}`,
    "no verified column": `## A\n${base}independent: no\n| id | finding |\n|----|---------|\n| 1 | not verified |\n`,
    "verified row without a header rule": `## A\n${base}independent: no\n| verified |\n`,
    "table only in a fence": `## A\n${base}independent: no\n\`\`\`\n${table}\`\`\`\n`,
  };
  assert.deepEqual(Object.keys(bad).filter((label) => check(bad[label])), []);
});

test("canary-check refuses a citation of another copied file and a range too wide to locate anything", (t: TestContext) => {
  const dir = temp(t);
  const check = (report: string, files = ["src/facts.mts", "other/src/facts.mts"]): boolean => {
    write(dir, "m.json", JSON.stringify({ files: files.map((file) => ({ path: file })), canary: { file: "src/facts.mts", line: 11 } }));
    write(dir, "r.md", report);
    return bench.canaryCheck(path.join(dir, "m.json"), path.join(dir, "r.md")).caught;
  };
  assert.equal(check("other/src/facts.mts:11"), false);
  assert.equal(check("/scratch/other/src/facts.mts:11"), false);
  assert.equal(check("/scratch/src/facts.mts:11"), true);
  assert.equal(check("src/facts.mts:1-482"), false);
  assert.equal(check("src/facts.mts:1-41"), true);
  assert.equal(check("src/facts.mts:1-42"), false);
  assert.equal(check("src/facts.mts#L11-L482"), false, "a second endpoint written with L is still part of the range");
  assert.equal(check("src/facts.mts#L9-L12"), true);
  assert.equal(check("src/facts.mts:12-9"), false, "a backwards range locates nothing");
});

test("prepare refuses a canary run that did not finish", () => {
  const files = { "/proj/a.js": "x" };
  let runs = 0;
  const f = fake(files, () => (++runs === 1 ? { status: 0, signal: null, stdout: "", stderr: "" } : { status: null, signal: "SIGKILL", stdout: "", stderr: "", errorCode: "ETIMEDOUT" }));
  assert.throws(() => bench.prepare(FAKE_ROOT, { files: "a.js", canary: JSON.stringify({ file: "a.js", find: "x", replace: "y" }), "test-cmd": JSON.stringify(["node", "a.js"]), out: "/tmpfake/out" }, f.deps), /did not finish/);
  assert.equal(f.files.has("/tmpfake/out.manifest.json"), false);
});

test("Git is searched only in absolute PATH entries outside the project", () => {
  const f = fake({}, gitScript(GUARD_GIT));
  Object.assign(f.deps.proc.env, { PATH: [".", "tools", "", `${FAKE_ROOT}/bin`, FAKE_ROOT, "/usr/bin", "/bin"].join(":") });
  bench.main(["guard", "snapshot", "--file", "/snap/s.json"], f.deps);
  assert.ok(f.spawned.length > 0);
  assert.deepEqual([...new Set(f.spawned.map(({ options }) => (options?.env as Record<string, string>).PATH))], ["/usr/bin:/bin"]);
});

test("guard notices an executable bit added to a file it already reports", (t: TestContext) => {
  const root = repo(t), snapshot = path.join(temp(t), "s.json");
  write(root, "outside/dirty.sh", "echo one\n");
  write(root, ".project/notes.md", "changed\n");
  for (const file of ["outside/dirty.sh", ".project/notes.md"]) {
    bench.guard(root, "snapshot", snapshot);
    fs.chmodSync(path.join(root, file), 0o755);
    assert.deepEqual((bench.guard(root, "check", snapshot) as bench.GuardCheckResult).changed, [file]);
  }
});
