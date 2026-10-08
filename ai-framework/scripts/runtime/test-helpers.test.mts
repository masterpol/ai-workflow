import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { captureIo, createTestDeps, memoryFs, runScript, tempFixture } from "./test-helpers.mts";
import { createNodeDeps } from "./node.mts";

const deps = createTestDeps();

test("createTestDeps returns RuntimeDeps with the current runtime", () => {
  assert.ok(deps, "createTestDeps returned something");
  assert.equal(typeof deps.runtime, "string");
  assert.ok(deps.runtime === "node" || deps.runtime === "bun");
  assert.equal(typeof deps.fs, "object");
  assert.equal(typeof deps.path, "object");
  assert.equal(typeof deps.child, "object");
});

test("tempFixture creates a real temp directory and writes files, returning a realpath", () => {
  const root = tempFixture(deps, { "a.txt": "alpha\n", "sub/b.txt": "bravo\n" });
  try {
    assert.equal(realpathSync(root), root, "root is already resolved (macOS alias handled)");
    assert.equal(readFileSync(join(root, "a.txt"), "utf8"), "alpha\n");
    assert.equal(readFileSync(join(root, "sub", "b.txt"), "utf8"), "bravo\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("tempFixture honours the mode option", () => {
  const root = tempFixture(deps, { "exec.sh": { content: "#!/bin/sh\n", mode: 0o755 } });
  try {
    const st = deps.fs.statSync(join(root, "exec.sh"));
    assert.equal(st.mode & 0o755, 0o755);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runScript invokes a .mts script and propagates exit, stdout and stderr", () => {
  const dir = mkdtempSync(join(tmpdir(), "run-script-"));
  try {
    const script = join(dir, "noop.mts");
    writeFileSync(script, "process.stdout.write('hello'); process.stderr.write('bye'); process.exit(0);\n");
    const result = runScript(deps, script, []);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "hello");
    assert.equal(result.stderr, "bye");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runScript propagates a non-zero exit code", () => {
  const dir = mkdtempSync(join(tmpdir(), "run-script-"));
  try {
    const script = join(dir, "fail.mts");
    writeFileSync(script, "process.exit(2);\n");
    const result = runScript(deps, script, []);
    assert.equal(result.status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runScript selects the executable the runner declares and forwards that runner to the child", () => {
  // Assert the *selected executable*, not just a zero exit: a spawn that silently used the wrong
  // runtime would still exit 0 and prove nothing. The child reports which runtime it is.
  const dir = mkdtempSync(join(tmpdir(), "run-script-"));
  try {
    const script = join(dir, "which.mts");
    writeFileSync(script, "process.stdout.write(String(Boolean(process.versions.bun)));\n");
    const base = { ...deps, proc: { ...deps.proc, env: {} } };
    // options.env wins over deps.proc.env, and the child reports which runtime actually ran.
    // PATH is carried through because the dispatcher replaces the child env wholesale.
    const viaOptions = runScript(base, script, [], { env: { ...deps.proc.env, AI_WORKFLOW_RUNNER: "node" } });
    assert.equal(viaOptions.status, 0, viaOptions.stderr);
    assert.equal(viaOptions.stdout, "false", "AI_WORKFLOW_RUNNER=node must spawn Node");
    const viaProc = runScript(
      { ...base, proc: { ...base.proc, env: { ...deps.proc.env, AI_WORKFLOW_RUNNER: "node" } } },
      script, [],
    );
    assert.equal(viaProc.status, 0, viaProc.stderr);
    assert.equal(viaProc.stdout, "false", "deps.proc.env=node must spawn Node");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("memoryFs serves readFileSync / existsSync / statSync / lstatSync / readdirSync for a fake tree", () => {
  const fake = memoryFs({ "/d/a.md": "alpha", "/d/sub/b.md": "bravo" });
  const merged = { ...createNodeDeps(), fs: { ...createNodeDeps().fs, ...fake } };
  assert.equal(merged.fs.readFileSync("/d/a.md"), "alpha");
  assert.equal(merged.fs.existsSync("/d/a.md"), true);
  assert.equal(merged.fs.existsSync("/d/sub/b.md"), true);
  assert.equal(merged.fs.existsSync("/d/missing.md"), false);
  const stA = merged.fs.statSync("/d/a.md");
  assert.equal(stA.isFile(), true);
  assert.equal(stA.isDirectory(), false);
  assert.equal(merged.fs.lstatSync("/d/sub").isDirectory(), true);
  assert.deepEqual(merged.fs.readdirSync("/d"), ["a.md", "sub"]);
  assert.throws(() => merged.fs.readFileSync("/d/missing.md"), { code: "ENOENT" });
});

test("memoryFs reports symlinks separately via lstatSync vs statSync", () => {
  const fake = memoryFs({ "/d/a.md": "alpha" }, { "/d/loop": "" });
  const merged = { ...createNodeDeps(), fs: { ...createNodeDeps().fs, ...fake } };
  assert.equal(merged.fs.lstatSync("/d/loop").isSymbolicLink(), true);
  assert.throws(() => merged.fs.statSync("/d/loop"), /ENOENT/);
});

test("memoryFs statSync follows a valid symlink to its target", () => {
  const fake = memoryFs({ "/d/a.md": "alpha" }, { "/d/link": "/d/a.md" });
  const merged = { ...createNodeDeps(), fs: { ...createNodeDeps().fs, ...fake } };
  assert.equal(merged.fs.statSync("/d/link").isFile(), true);
  assert.equal(merged.fs.readFileSync("/d/link"), "alpha");
});

test("captureIo returns deps whose stdout/stderr are captured into arrays", () => {
  const captured = captureIo(deps);
  captured.io.stdout.write("out1");
  captured.io.stdout.write("out2");
  captured.io.stderr.write("err1");
  assert.deepEqual(captured.out, ["out1", "out2"]);
  assert.deepEqual(captured.err, ["err1"]);
  // The original deps are untouched.
  captured.io.stdout.write("more");
  assert.equal(captured.out.length, 3);
});

test("captureIo forces isTTY to false on both streams", () => {
  const captured = captureIo(deps);
  assert.equal(captured.io.stdout.isTTY, false);
  assert.equal(captured.io.stderr.isTTY, false);
});

test("tempFixture returns the unresolved mkdtemp path when { resolve: false }", () => {
  const raw = tempFixture(deps, { "a.txt": "x" }, { resolve: false });
  try {
    const resolved = deps.fs.realpathSync(raw);
    if (raw !== resolved) {
      assert.equal(deps.fs.readFileSync(deps.path.join(raw, "a.txt"), "utf8"), "x");
      assert.equal(deps.fs.readFileSync(deps.path.join(resolved, "a.txt"), "utf8"), "x");
    }
  } finally {
    deps.fs.rmSync(raw, { recursive: true, force: true });
  }
});

test("tempFixture refuses keys that escape the temp root", () => {
  assert.throws(() => tempFixture(deps, { "../escape.txt": "x" }, { resolve: true }), /outside the temp root/);
});
