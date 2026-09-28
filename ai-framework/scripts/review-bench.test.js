const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const bench = require("./review-bench");
const SCRIPT = path.join(__dirname, "review-bench.js");

function temp(t, prefix = "review-bench-test-") {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function write(root, name, value) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}
function git(root, ...args) {
  const result = spawnSync("git", ["-c", "core.hooksPath=/dev/null", "-C", root, ...args], { encoding: "utf8", env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.test", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.test" } });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
// A small real repo: a guard-worthy module with a test, plus paths the guard watches.
function repo(t) {
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
const prep = (root, extra = {}) => bench.prepare(root, { files: FILES, canary: CANARY, "test-cmd": TEST_CMD, ...extra });
const run = (root, ...args) => spawnSync(process.execPath, [SCRIPT, "--root", root, ...args], { encoding: "utf8" });

test("prepare copies exactly the slice to a scratch dir outside the repo and plants one canary that breaks a test", (t) => {
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

test("the manifest lives beside the scratch tree, and nothing inside the tree names the canary", (t) => {
  const root = repo(t);
  const result = prep(root);
  t.after(() => { fs.rmSync(result.scratch, { recursive: true, force: true }); fs.rmSync(result.manifest, { force: true }); });
  assert.equal(path.dirname(result.manifest), path.dirname(result.scratch));
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  for (const file of walk(result.scratch)) assert.ok(!/canary|manifest/i.test(fs.readFileSync(file, "utf8")), file);
  assert.ok(!JSON.stringify(result).includes("x >= 0"), "the CLI output does not reveal the planted edit");
});

test("a canary that breaks no scratch test is refused", (t) => {
  const root = repo(t);
  assert.throws(() => prep(root, { canary: JSON.stringify({ file: "ai-framework/scripts/mod.js", find: "'pos'", replace: "'pos'" }) }), /breaks no scratch test/);
});

test("the canary's find text must match exactly once, and must exist", (t) => {
  const root = repo(t);
  write(root, "ai-framework/scripts/mod.js", "module.exports = (x) => (x > 0 ? 'pos' : x > 0 ? 'again' : 'nonpos');\n");
  assert.throws(() => prep(root), /exactly once/);
  assert.throws(() => prep(root, { canary: JSON.stringify({ file: "ai-framework/scripts/mod.js", find: "does not occur", replace: "x" }) }), /exactly once/);
});

test("prepare refuses a red baseline, a canary outside the slice, and a test command that is not node", (t) => {
  const root = repo(t);
  write(root, "ai-framework/scripts/mod.test.js", "throw new Error('already red');\n");
  assert.throws(() => prep(root), /baseline tests must pass/);
  const green = repo(t);
  assert.throws(() => prep(green, { canary: JSON.stringify({ file: "ai-framework/scripts/other.js", find: "a", replace: "b" }) }), /must be one of/);
  assert.throws(() => prep(green, { "test-cmd": JSON.stringify(["sh", "-c", "echo hi"]) }), /starting with "node"/);
});

test("prepare refuses symlinks, secret-shaped names, traversal, and a scratch dir inside the project", (t) => {
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

test("prepare and guard refuse an --out/--file whose ANCESTOR directory is a symlink back into the project", (t) => {
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

test("prepare and guard refuse to write through an existing symlink at --out/--file, even outside the project", (t) => {
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

test("canary-check and record-check refuse a symlinked or FIFO report/manifest/record instead of hanging or following it", (t) => {
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

test("canary-check on a FIFO --report returns immediately (refused), never hangs waiting for a writer", (t) => {
  const root = repo(t);
  const result = prep(root);
  t.after(() => { fs.rmSync(result.scratch, { recursive: true, force: true }); fs.rmSync(result.manifest, { force: true }); });
  const outside = temp(t);
  const fifo = path.join(outside, "report.fifo");
  const mkfifo = spawnSync("mkfifo", [fifo]);
  if (mkfifo.status !== 0) { t.skip("mkfifo not available on this host"); return; }
  const start = Date.now();
  assert.throws(() => bench.canaryCheck(result.manifest, fifo), /regular file/);
  assert.ok(Date.now() - start < 2000, "must reject a FIFO immediately, not block waiting for a writer");
});

test("guard passes on a no-op and detects a tracked edit, a new untracked file, an ignored-path write, a symlink swap, and a commit", (t) => {
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

test("guard notices an index-only change (status differs, tree bytes do not) and a retargeted symlink", (t) => {
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

test("guard ignores the paths hooks and generators write during a session", (t) => {
  const root = repo(t);
  const snap = path.join(temp(t), "s.json");
  bench.guard(root, "snapshot", snap);
  write(root, ".project/metrics/token-consumption.json", "{}");
  write(root, ".project/reports/state.json", "{}");
  assert.equal(bench.guard(root, "check", snap).clean, true);
});

test("guard refuses a snapshot file inside the project and an unknown action", (t) => {
  const root = repo(t);
  assert.throws(() => bench.guard(root, "snapshot", path.join(root, "snap.json")), /outside the project/);
  assert.throws(() => bench.guard(root, "bogus", path.join(temp(t), "s.json")), /snapshot or check/);
});

test("count excludes bookkeeping and this pitch's directory, includes untracked and deleted files, and --max fails when exceeded", (t) => {
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

test("canary-check is true only when the report cites the canary's file within 3 lines", (t) => {
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

test("record-check accepts a complete record and names each missing field", (t) => {
  const dir = temp(t);
  const check = (text) => { const file = path.join(dir, "r.md"); fs.writeFileSync(file, text); return bench.recordCheck(file); };
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

test("record-check refuses a symlink and an oversize record", (t) => {
  const dir = temp(t);
  fs.writeFileSync(path.join(dir, "real.md"), GOOD_RECORD);
  fs.symlinkSync(path.join(dir, "real.md"), path.join(dir, "link.md"));
  assert.throws(() => bench.recordCheck(path.join(dir, "link.md")), /regular file/);
  fs.writeFileSync(path.join(dir, "big.md"), "x".repeat(300 * 1024));
  assert.throws(() => bench.recordCheck(path.join(dir, "big.md")), /too large/);
  assert.throws(() => bench.recordCheck(path.join(dir, "does-not-exist.md")), /Cannot read/);
});

test("CLI: prepare, guard, canary-check and record-check work end to end and fail with a clean exit code", (t) => {
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

test("malformed JSON flags are reported with a fixed message that does not echo the input", (t) => {
  const root = repo(t);
  const result = run(root, "prepare", "--files", FILES, "--canary", "{secret-looking-input", "--test-cmd", TEST_CMD);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--canary is not valid JSON/);
  assert.ok(!result.stderr.includes("secret-looking-input"));
});

test("error output carries no control characters from a hostile argument", (t) => {
  const root = repo(t);
  const result = run(root, "prepare", "--files", "a\u001b[2J.js", "--canary", CANARY, "--test-cmd", TEST_CMD);
  assert.equal(result.status, 1);
  assert.ok(!/[\u0000-\u0008\u000b-\u001f\u007f]/.test(result.stderr), JSON.stringify(result.stderr));
});

test("the bench executes nothing but node, on files it copied, and opens no network", () => {
  const source = fs.readFileSync(SCRIPT, "utf8");
  assert.ok(!/require\(["'](?:node:)?(?:https?|net|tls|dgram|dns)["']\)/.test(source));
  assert.ok(!/\bfetch\(|\beval\(|new Function|shell:\s*true/.test(source));
  assert.deepEqual([...source.matchAll(/spawnSync\("([^"]+)"/g)].map((m) => m[1]).sort(), ["git", "node"]);
});
