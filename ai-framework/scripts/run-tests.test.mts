import assert from "node:assert/strict";
import test from "node:test";
import type { TestContext } from "node:test";

import { createTestDeps, captureIo, tempFixture, urlPath, copyTree, runScript } from "./runtime/test-helpers.mts";
import type { RunResult, RuntimeDeps } from "./runtime/types.mts";
import { MAX_WORKERS, discover, main, parseArgs } from "./run-tests.mts";

const base = createTestDeps();
const here = base.path.dirname(urlPath(import.meta.url));
const PASS = "import test from 'node:test';\ntest('ok', () => {});\n";
const NESTED_FAIL = "import test from 'node:test';\nimport assert from 'node:assert/strict';\n"
  + "test('parent', async (t) => { await t.test('child', () => { assert.equal(1, 2); }); });\n";

function project(t: TestContext, files: Record<string, string>): string {
  const root = tempFixture(base, files);
  t.after(() => base.fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

interface Launched { command: string; args: string[]; env: Record<string, string | undefined> }
/** Captured deps whose children never launch: help probes answer with `help`, runs record and return `status`. */
function fake(env: Record<string, string | undefined>, cwd = "/", status = 0, help = "--parallel=<val>") {
  const deps = captureIo({ ...base, proc: { ...base.proc, env, cwd: () => cwd } });
  const launches: Launched[] = [];
  const done: RunResult = { status, signal: null, stdout: "", stderr: "" };
  deps.child = { ...base.child,
    runSync: (_command, args) => (args.includes("--help") ? { ...done, stdout: help } : done),
    run: async (command, args, options) => { launches.push({ command, args, env: options?.env ?? {} }); return done; } };
  return { deps: deps as RuntimeDeps & { out: string[]; err: string[] }, launches };
}

test("full discovery is sorted, recursive, picks up new tests and skips node_modules and symlinks", (t) => {
  const root = project(t, {
    "ai-framework/scripts/b.test.mts": PASS, "ai-framework/scripts/a.test.mts": PASS, "ai-framework/deep/c/d.test.mts": PASS,
    "ai-framework/node_modules/x/x.test.mts": PASS, "ai-framework/notes.mts": PASS, ".claude/hooks/h.test.mts": PASS,
  });
  base.fs.symlinkSync(base.path.join(root, "ai-framework/scripts"), base.path.join(root, "ai-framework/linked"));
  assert.deepEqual(discover(base, root), [".claude/hooks/h.test.mts", "ai-framework/deep/c/d.test.mts", "ai-framework/scripts/a.test.mts", "ai-framework/scripts/b.test.mts"]);
  base.fs.writeFileSync(base.path.join(root, "ai-framework/scripts/new.test.mts"), PASS);
  assert.ok(discover(base, root).includes("ai-framework/scripts/new.test.mts"));
});

test("the real bundle's full selection is every test file under both roots", () => {
  const found = discover(base, base.path.resolve(here, "../.."));
  assert.ok(found.length >= 70);
  assert.ok(found.every(file => !file.includes("node_modules")));
  assert.ok(found.includes(".claude/hooks/post-edit-check.test.mts") && found.includes("ai-framework/scripts/run-tests.test.mts"));
});

test("explicit files are labelled partial; full mode is labelled full", async (t) => {
  const root = project(t, { "ai-framework/a.test.mts": PASS, "ai-framework/b.test.mts": PASS });
  const partial = fake({}, root);
  assert.equal(await main(["--root", root, "ai-framework/a.test.mts"], partial.deps), 0);
  assert.match(partial.deps.out.join(""), /partial \(not full verification\) files=1 /);
  assert.deepEqual(partial.launches[0].args.slice(-1), ["./ai-framework/a.test.mts"]);
  const full = fake({}, root);
  assert.equal(await main(["--root", root], full.deps), 0);
  assert.match(full.deps.out.join(""), /run-tests: full files=2 /);
  assert.doesNotMatch(full.deps.out.join(""), /partial/);
});

test("bad selections and unsupported settings are refused with exit 2 and the right reason, without launching a child", async (t) => {
  const root = project(t, { "ai-framework/a.test.mts": PASS, "ai-framework/a.mts": PASS, "ai-framework/dir.test.mts/x": "x", "empty/readme.md": "x" });
  const outside = project(t, { "out.test.mts": PASS, "ok.test.mts": PASS });
  base.fs.symlinkSync(outside, base.path.join(root, "ai-framework/escape"));
  base.fs.symlinkSync(base.path.join(root, "ai-framework/a.test.mts"), base.path.join(root, "ai-framework/link.test.mts"));
  const a = "ai-framework/a.test.mts";
  const cases: Array<[string[], RegExp]> = [
    [["--root", base.path.join(root, "empty")], /no test files selected/],
    [["--root", root, "ai-framework/missing.test.mts"], /missing test file/],
    [["--root", root, "ai-framework/a.mts"], /not a \.test\.mts file/],
    [["--root", root, base.path.join(outside, "out.test.mts")], /outside the project/],
    [["--root", root, "ai-framework/escape/ok.test.mts"], /outside the project/],
    [["--root", root, "ai-framework/dir.test.mts"], /not a regular file/],
    [["--root", root, "ai-framework/link.test.mts"], /not a regular file/],
    [["--root", root, "--runtime", "deno", a], /unsupported runtime/],
    [["--root", root, "--runtime"], /unsupported runtime/],
    [["--root", root, "--workers", "0", a], /workers must be/],
    [["--root", root, "--workers", "1.5", a], /workers must be/],
    [["--root", root, "--workers", String(MAX_WORKERS + 1), a], /workers must be/],
    [["--root", root, "--workers"], /workers must be/],
    [["--root", root, "--bogus"], /unsupported option/],
    [["--root", root, "--cache", "--coverage", a], /--cache needs a directory/],
    [["--root", root, "--runtime", "bun", "--cache", "c", a], /Node only/],
    [["--root", root, "--runtime", "node", "--cache", "c", "--coverage", a], /disabled for coverage/],
  ];
  for (const [argv, reason] of cases) {
    const { deps, launches } = fake({}, root);
    assert.equal(await main(argv, deps), 2, argv.join(" "));
    assert.equal(launches.length, 0, argv.join(" "));
    assert.match(deps.err.join(""), reason, argv.join(" "));
  }
});

test("a file in a directory whose name starts with two dots is inside the project, and a symlinked root is accepted", async (t) => {
  const root = project(t, { "ai-framework/..x/a.test.mts": PASS });
  const alias = base.path.join(project(t, {}), "alias");
  base.fs.symlinkSync(root, alias);
  for (const projectRoot of [root, alias]) {
    const { deps, launches } = fake({}, projectRoot);
    assert.equal(await main(["--root", projectRoot, "ai-framework/..x/a.test.mts"], deps), 0, projectRoot);
    assert.deepEqual(launches[0].args.slice(-1), ["./ai-framework/..x/a.test.mts"]);
  }
});

test("--list prints the selection and launches nothing", async (t) => {
  const root = project(t, { "ai-framework/b.test.mts": PASS, "ai-framework/a.test.mts": PASS });
  const { deps, launches } = fake({}, root);
  assert.equal(await main(["--root", root, "--list"], deps), 0);
  assert.equal(deps.out.join(""), "ai-framework/a.test.mts\nai-framework/b.test.mts\n");
  assert.equal(launches.length, 0);
});

test("a child with no exit status (killed by a signal) fails the command", async (t) => {
  const root = project(t, { "ai-framework/a.test.mts": PASS });
  const { deps } = fake({}, root);
  deps.child = { ...deps.child, run: async () => ({ status: null, signal: "SIGKILL", stdout: "", stderr: "" }) };
  assert.equal(await main(["--root", root, "ai-framework/a.test.mts"], deps), 1);
  assert.match(deps.out.join(""), /exit=1/);
});

test("Bun workers need a Bun that lists --parallel", async (t) => {
  const root = project(t, { "ai-framework/a.test.mts": PASS });
  const old = fake({}, root, 0, "bun test options without it");
  assert.notEqual(await main(["--root", root, "--runtime", "bun", "--workers", "4", "ai-framework/a.test.mts"], old.deps), 0);
  assert.equal(old.launches.length, 0);
  const current = fake({}, root);
  assert.equal(await main(["--root", root, "--runtime", "bun", "--workers", "4", "ai-framework/a.test.mts"], current.deps), 0);
  assert.ok(current.launches[0].args.includes("--parallel=4"));
  assert.equal(current.launches[0].env.AI_WORKFLOW_RUNNER, "bun");
});

test("the reported runtime is the effective child runtime and options map to that runtime's flags", async (t) => {
  const root = project(t, { "ai-framework/a.test.mts": PASS });
  const viaEnv = fake({ AI_WORKFLOW_RUNNER: "bun" }, root);
  await main(["--root", root, "ai-framework/a.test.mts"], viaEnv.deps);
  assert.match(viaEnv.deps.out.join(""), /runtime=bun /);
  assert.equal(viaEnv.launches[0].args[0], "test");
  const node = fake({ AI_WORKFLOW_RUNNER: "bun" }, root);
  await main(["--root", root, "--runtime", "node", "--workers", "4", "--cache", "cc", "ai-framework/a.test.mts"], node.deps);
  assert.match(node.deps.out.join(""), /runtime=node workers=4 cache=on /);
  assert.ok(node.launches[0].args.includes("--test-concurrency=4"));
  assert.equal(node.launches[0].env.NODE_COMPILE_CACHE, base.path.resolve(root, "cc"));
  const off = fake({ NODE_COMPILE_CACHE: "/stale" }, root);
  await main(["--root", root, "--runtime", "node", "--coverage", "ai-framework/a.test.mts"], off.deps);
  assert.equal(off.launches[0].env.NODE_COMPILE_CACHE, undefined);
  assert.ok(off.launches[0].args.includes("--experimental-test-coverage"));
  const bun = fake({}, root);
  await main(["--root", root, "--runtime", "bun", "--coverage", "ai-framework/a.test.mts"], bun.deps);
  assert.ok(bun.launches[0].args.includes("--coverage"));
});

test("a nonzero child, including a failing nested assertion, is the command's exit status on both runtimes", async (t) => {
  const root = project(t, { "ai-framework/pass.test.mts": PASS, "ai-framework/nested.test.mts": NESTED_FAIL });
  for (const runtime of ["node", "bun"]) {
    const run = async (file: string) => { const io = captureIo({ ...base, proc: { ...base.proc, cwd: () => root }, child: { ...base.child, run: (command, args, options) => base.child.run(command, args, { ...options, stdio: "pipe" }) } }); const code = await main(["--root", root, "--runtime", runtime, file], io); return { code, io }; };
    assert.equal((await run("ai-framework/pass.test.mts")).code, 0, runtime);
    const failed = await run("ai-framework/nested.test.mts");
    assert.notEqual(failed.code, 0, runtime);
    assert.match(failed.io.out.join(""), new RegExp(`runtime=${runtime} .*exit=${failed.code}`));
  }
});

test("mutation proof: a command that drops the child's status turns the propagation case red", (t) => {
  const root = project(t, { "ai-framework/nested.test.mts": NESTED_FAIL });
  const copy = project(t, {});
  copyTree(base, here, base.path.join(copy, "ai-framework/scripts"), (source) => !source.endsWith(".test.mts") && !source.includes("node_modules"));
  const script = base.path.join(copy, "ai-framework/scripts/run-tests.mts");
  const source = base.fs.readFileSync(script);
  assert.ok(source.includes("const status = result.status ?? 1;"));
  const args = ["--root", root, "ai-framework/nested.test.mts"];
  assert.notEqual(runScript(base, script, args, { cwd: root }).status, 0, "intact command propagates");
  base.fs.writeFileSync(script, source.replace("const status = result.status ?? 1;", "const status = 0;"));
  assert.equal(runScript(base, script, args, { cwd: root }).status, 0, "mutant hides the failure, so the propagation assertion above would fail");
});
