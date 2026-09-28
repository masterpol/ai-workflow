const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { canCompress, pythonAvailable } = require("./skill-compress-guard");

function write(root, name, value = "content") {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-compress-guard-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test("refuses a path under .project/pitches/_archive/ with its own distinct reason", (t) => {
  const root = fixture(t);
  write(root, ".project/pitches/_archive/old-pitch/pitch.md");
  const result = canCompress(root, ".project/pitches/_archive/old-pitch/pitch.md");
  assert.equal(result.allowed, false);
  assert.match(result.reason, /_archive/);
});

test("refuses a path under .project/pitches/ (not archived) with a distinct reason", (t) => {
  const root = fixture(t);
  write(root, ".project/pitches/some-pitch/pitch.md");
  const result = canCompress(root, ".project/pitches/some-pitch/pitch.md");
  assert.equal(result.allowed, false);
  assert.match(result.reason, /\.project\/pitches\//);
  assert.doesNotMatch(result.reason, /_archive/);
});

test("refuses a path under .project/design/ with a distinct reason", (t) => {
  const root = fixture(t);
  write(root, ".project/design/notes.md");
  const result = canCompress(root, ".project/design/notes.md");
  assert.equal(result.allowed, false);
  assert.match(result.reason, /\.project\/design\//);
});

test("refuses a path under .project/knowledge/ with a distinct reason", (t) => {
  const root = fixture(t);
  write(root, ".project/knowledge/graph.json");
  const result = canCompress(root, ".project/knowledge/graph.json");
  assert.equal(result.allowed, false);
  assert.match(result.reason, /\.project\/knowledge\//);
});

test("all four protected-dir reasons are distinct from each other", (t) => {
  const root = fixture(t);
  write(root, ".project/pitches/_archive/a/pitch.md");
  write(root, ".project/pitches/b/pitch.md");
  write(root, ".project/design/c.md");
  write(root, ".project/knowledge/d.json");
  const reasons = [
    canCompress(root, ".project/pitches/_archive/a/pitch.md").reason,
    canCompress(root, ".project/pitches/b/pitch.md").reason,
    canCompress(root, ".project/design/c.md").reason,
    canCompress(root, ".project/knowledge/d.json").reason,
  ];
  assert.equal(new Set(reasons).size, 4, "every protected-dir reason must be distinct");
});

test("refuses a path that does not exist, with a distinct reason", (t) => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, ".project", "notes"), { recursive: true });
  const result = canCompress(root, ".project/notes/missing.md");
  assert.equal(result.allowed, false);
  assert.match(result.reason, /does not exist/);
});

test("refuses a non-string target (array/pattern) instead of assuming a single path", (t) => {
  const root = fixture(t);
  const arrayResult = canCompress(root, [".project/notes/one.md", ".project/notes/two.md"]);
  assert.equal(arrayResult.allowed, false);
  assert.match(arrayResult.reason, /string|array|pattern/i);
  const undefinedResult = canCompress(root, undefined);
  assert.equal(undefinedResult.allowed, false);
});

test("refuses an empty-string target instead of treating it as a path", (t) => {
  const root = fixture(t);
  const result = canCompress(root, "   ");
  assert.equal(result.allowed, false);
  assert.match(result.reason, /empty/i);
});

test("refuses a glob pattern even when passed as a string", (t) => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, ".project", "notes"), { recursive: true });
  const result = canCompress(root, ".project/notes/*.md");
  assert.equal(result.allowed, false);
  assert.match(result.reason, /glob/i);
});

test("allows an ordinary, existing, unprotected project file", (t) => {
  const root = fixture(t);
  write(root, ".project/notes/memory.md", "some prose to compress");
  const result = canCompress(root, ".project/notes/memory.md");
  assert.deepEqual(result, { allowed: true, reason: null });
});

test("allows an ordinary file addressed by absolute path", (t) => {
  const root = fixture(t);
  write(root, ".project/notes/memory.md", "some prose to compress");
  const result = canCompress(root, path.join(root, ".project/notes/memory.md"));
  assert.equal(result.allowed, true);
});

test("refuses a symlink at an allowed path that points at a protected file", (t) => {
  const root = fixture(t);
  write(root, ".project/pitches/some-pitch/pitch.md", "PROTECTED");
  fs.mkdirSync(path.join(root, ".project", "notes"), { recursive: true });
  fs.symlinkSync(path.join(root, ".project/pitches/some-pitch/pitch.md"), path.join(root, ".project/notes/memory.md"));
  const result = canCompress(root, ".project/notes/memory.md");
  assert.equal(result.allowed, false, "the real (symlink-resolved) destination is protected, so the lexically-allowed path must be refused too");
  assert.match(result.reason, /\.project\/pitches\//);
});

test("refuses a symlinked directory that resolves entirely outside the project root", (t) => {
  const root = fixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "guard-outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  write(outside, "pitch.md", "elsewhere");
  fs.mkdirSync(path.join(root, ".project", "notes"), { recursive: true });
  fs.symlinkSync(outside, path.join(root, ".project/notes/linked-dir"));
  const result = canCompress(root, ".project/notes/linked-dir/pitch.md");
  assert.equal(result.allowed, false, "not protected by name, but must not be silently allowed just because it escapes root without matching a named protected dir");
  assert.match(result.reason, /outside the project root/);
});

test("a case-differing path to the same protected file is refused on a case-insensitive filesystem", (t) => {
  const root = fixture(t);
  write(root, ".project/pitches/some-pitch/pitch.md", "PROTECTED");
  const upper = path.join(root, ".PROJECT/PITCHES/some-pitch/pitch.md");
  if (!fs.existsSync(upper)) return; // case-sensitive filesystem: the uppercase path is simply a different, nonexistent file — nothing to prove here
  const result = canCompress(root, ".PROJECT/PITCHES/some-pitch/pitch.md");
  assert.equal(result.allowed, false, "same on-disk file as the lowercase protected path on this case-insensitive filesystem");
  assert.match(result.reason, /\.project\/pitches\//);
});

test("pythonAvailable reports presence without throwing, whichever way it resolves", () => {
  let result;
  assert.doesNotThrow(() => { result = pythonAvailable(); });
  assert.equal(typeof result, "boolean");
});
