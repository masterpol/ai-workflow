import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { TestContext } from "node:test";

import type { RuntimeDeps } from "./runtime/types.mts";
import { canCompress, pythonAvailable } from "./skill-compress-guard.mts";

function write(root: string, name: string, value = "content"): void {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}
function fixture(t: TestContext): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-compress-guard-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test("refuses a path under .project/pitches/_archive/ with its own distinct reason", (t: TestContext) => {
  const root = fixture(t);
  write(root, ".project/pitches/_archive/old-pitch/pitch.md");
  const result = canCompress(root, ".project/pitches/_archive/old-pitch/pitch.md");
  assert.equal(result.allowed, false);
  assert.match(result.reason!, /_archive/);
});

test("refuses a path under .project/pitches/ (not archived) with a distinct reason", (t: TestContext) => {
  const root = fixture(t);
  write(root, ".project/pitches/some-pitch/pitch.md");
  const result = canCompress(root, ".project/pitches/some-pitch/pitch.md");
  assert.equal(result.allowed, false);
  assert.match(result.reason!, /\.project\/pitches\//);
  assert.doesNotMatch(result.reason, /_archive/);
});

test("refuses a path under .project/design/ with a distinct reason", (t: TestContext) => {
  const root = fixture(t);
  write(root, ".project/design/notes.md");
  const result = canCompress(root, ".project/design/notes.md");
  assert.equal(result.allowed, false);
  assert.match(result.reason!, /\.project\/design\//);
});

test("refuses a path under .project/knowledge/ with a distinct reason", (t: TestContext) => {
  const root = fixture(t);
  write(root, ".project/knowledge/graph.json");
  const result = canCompress(root, ".project/knowledge/graph.json");
  assert.equal(result.allowed, false);
  assert.match(result.reason!, /\.project\/knowledge\//);
});

test("all four protected-dir reasons are distinct from each other", (t: TestContext) => {
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

test("refuses a path that does not exist, with a distinct reason", (t: TestContext) => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, ".project", "notes"), { recursive: true });
  const result = canCompress(root, ".project/notes/missing.md");
  assert.equal(result.allowed, false);
  assert.match(result.reason!, /does not exist/);
});

test("refuses a non-string target (array/pattern) instead of assuming a single path", (t: TestContext) => {
  const root = fixture(t);
  const arrayResult = canCompress(root, [".project/notes/one.md", ".project/notes/two.md"]);
  assert.equal(arrayResult.allowed, false);
  assert.match(arrayResult.reason!, /string|array|pattern/i);
  const undefinedResult = canCompress(root, undefined);
  assert.equal(undefinedResult.allowed, false);
});

test("refuses an empty-string target instead of treating it as a path", (t: TestContext) => {
  const root = fixture(t);
  const result = canCompress(root, "   ");
  assert.equal(result.allowed, false);
  assert.match(result.reason!, /empty/i);
});

test("refuses a glob pattern even when passed as a string", (t: TestContext) => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, ".project", "notes"), { recursive: true });
  const result = canCompress(root, ".project/notes/*.md");
  assert.equal(result.allowed, false);
  assert.match(result.reason!, /glob/i);
});

test("allows an ordinary, existing, unprotected project file", (t: TestContext) => {
  const root = fixture(t);
  write(root, ".project/notes/memory.md", "some prose to compress");
  const result = canCompress(root, ".project/notes/memory.md");
  assert.deepEqual(result, { allowed: true, reason: null });
});

test("allows an ordinary file addressed by absolute path", (t: TestContext) => {
  const root = fixture(t);
  write(root, ".project/notes/memory.md", "some prose to compress");
  const result = canCompress(root, path.join(root, ".project/notes/memory.md"));
  assert.equal(result.allowed, true);
});

test("refuses a symlink at an allowed path that points at a protected file", (t: TestContext) => {
  const root = fixture(t);
  write(root, ".project/pitches/some-pitch/pitch.md", "PROTECTED");
  fs.mkdirSync(path.join(root, ".project", "notes"), { recursive: true });
  fs.symlinkSync(path.join(root, ".project/pitches/some-pitch/pitch.md"), path.join(root, ".project/notes/memory.md"));
  const result = canCompress(root, ".project/notes/memory.md");
  assert.equal(result.allowed, false, "the real (symlink-resolved) destination is protected, so the lexically-allowed path must be refused too");
  assert.match(result.reason!, /\.project\/pitches\//);
});

test("refuses a symlinked directory that resolves entirely outside the project root", (t: TestContext) => {
  const root = fixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "guard-outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  write(outside, "pitch.md", "elsewhere");
  fs.mkdirSync(path.join(root, ".project", "notes"), { recursive: true });
  fs.symlinkSync(outside, path.join(root, ".project/notes/linked-dir"));
  const result = canCompress(root, ".project/notes/linked-dir/pitch.md");
  assert.equal(result.allowed, false, "not protected by name, but must not be silently allowed just because it escapes root without matching a named protected dir");
  assert.match(result.reason!, /outside the project root/);
});

test("a case-differing path to the same protected file is refused on a case-insensitive filesystem", (t: TestContext) => {
  const root = fixture(t);
  write(root, ".project/pitches/some-pitch/pitch.md", "PROTECTED");
  const upper = path.join(root, ".PROJECT/PITCHES/some-pitch/pitch.md");
  if (!fs.existsSync(upper)) return; // case-sensitive filesystem: the uppercase path is simply a different, nonexistent file — nothing to prove here
  const result = canCompress(root, ".PROJECT/PITCHES/some-pitch/pitch.md");
  assert.equal(result.allowed, false, "same on-disk file as the lowercase protected path on this case-insensitive filesystem");
  assert.match(result.reason!, /\.project\/pitches\//);
});

test("pythonAvailable reports presence without throwing, whichever way it resolves", () => {
  let result: unknown;
  assert.doesNotThrow(() => { result = pythonAvailable(); });
  assert.equal(typeof result, "boolean");
});

// In-memory deps: only the members skill-compress-guard touches.
function fakeDeps(options: { existing: Set<string>; real?: Record<string, string>; python?: "ok" | "fail" | "throw" }): RuntimeDeps {
  const fake = {
    path,
    fs: {
      existsSync: (file: string) => options.existing.has(file),
      realpathSync: (file: string) => options.real?.[file] ?? file,
    },
    child: {
      runSync: (command: string, args: string[], opts?: { stdio?: string; timeoutMs?: number }) => {
        assert.equal(command, "python3");
        assert.deepEqual(args, ["--version"]);
        assert.deepEqual(opts, { stdio: "ignore", timeoutMs: 5000 });
        if (options.python === "throw") throw new Error("spawn python3 ENOENT");
        return { status: options.python === "fail" ? 1 : 0, signal: null, stdout: "", stderr: "" };
      },
    },
  };
  return fake as unknown as RuntimeDeps;
}

test("canCompress resolves symlinks through the injected fs (in-memory protected target)", () => {
  const deps = fakeDeps({
    existing: new Set(["/proj", "/proj/.project/notes/memory.md", "/proj/.project/pitches/p/pitch.md"]),
    real: { "/proj/.project/notes/memory.md": "/proj/.project/pitches/p/pitch.md" },
  });
  const result = canCompress("/proj", ".project/notes/memory.md", deps);
  assert.equal(result.allowed, false);
  assert.match(result.reason!, /\.project\/pitches\//);
});

test("canCompress through injected fs allows an existing unprotected file and refuses a missing one", () => {
  const deps = fakeDeps({ existing: new Set(["/proj", "/proj/.project", "/proj/.project/notes", "/proj/.project/notes/a.md"]) });
  assert.deepEqual(canCompress("/proj", ".project/notes/a.md", deps), { allowed: true, reason: null });
  assert.deepEqual(canCompress("/proj", ".project/notes/b.md", deps), { allowed: false, reason: "target path does not exist" });
});

test("pythonAvailable reports true, false for a non-zero exit, and false when the spawn throws (injected child)", () => {
  assert.equal(pythonAvailable(fakeDeps({ existing: new Set(), python: "ok" })), true);
  assert.equal(pythonAvailable(fakeDeps({ existing: new Set(), python: "fail" })), false);
  assert.equal(pythonAvailable(fakeDeps({ existing: new Set(), python: "throw" })), false);
});
