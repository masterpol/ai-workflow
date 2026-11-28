import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { NODE_FLAGS, readRunner, runWorkflow, runWorkflowSync, workflowInvocation } from "./entry.mts";
import { createTestDeps, spawnSync, tempFixture, toonFixtureText, urlPath } from "./test-helpers.mts";

const base = createTestDeps();
const bunOptions = [
  `--config=${urlPath(new URL("./bun-isolated.toml", import.meta.url))}`,
  "--no-env-file",
  "--no-install",
  `--tsconfig-override=${urlPath(new URL("./bun-isolated-tsconfig.json", import.meta.url))}`,
];

test("workflow children select the declared executable in both directions", () => {
  for (const current of ["node", "bun"] as const) {
    for (const selected of ["node", "bun"] as const) {
      const deps = { ...base, runtime: current, proc: { ...base.proc, execPath: `/runtime/${current}`,
        versions: current === "bun" ? { bun: "test" } : {}, env: { AI_WORKFLOW_RUNNER: selected } } };
      const invocation = workflowInvocation(deps, [...NODE_FLAGS, "script.mts", "--experimental-strip-types", "a b"]);
      assert.equal(invocation.command, current === selected ? `/runtime/${current}` : selected);
      assert.deepEqual(invocation.args, [...(selected === "node" ? NODE_FLAGS : bunOptions), "script.mts", "--experimental-strip-types", "a b"]);
      assert.equal(invocation.options.env?.AI_WORKFLOW_RUNNER, selected);
    }
  }
});

test("child overrides win, sanitized environments retain the selected runner, invalid choices fail", () => {
  const deps = { ...base, proc: { ...base.proc, env: { AI_WORKFLOW_RUNNER: "bun", SECRET: "parent-only" } } };
  const overridden = workflowInvocation(deps, ["script.mts"], { env: { AI_WORKFLOW_RUNNER: " NODE ", PATH: "/custom" } });
  assert.equal(overridden.options.env?.AI_WORKFLOW_RUNNER, "node");
  assert.equal(overridden.options.env?.PATH, "/custom");
  assert.equal(overridden.options.env?.SECRET, undefined);
  assert.deepEqual(workflowInvocation(deps, ["script.mts"], { env: { PATH: "/custom" } }).options.env,
    { PATH: "/custom", AI_WORKFLOW_RUNNER: "bun" });
  assert.throws(() => workflowInvocation(deps, ["script.mts"], { env: { AI_WORKFLOW_RUNNER: "deno" } }), /AI_WORKFLOW_RUNNER/);
});

test("prefixes Bun eval and build options while preserving test-run arguments", () => {
  const bun = { env: { AI_WORKFLOW_RUNNER: "bun" } };
  const node = { env: { AI_WORKFLOW_RUNNER: "node" } };
  for (const args of [["-e", "process.exit(0)", "a b", "--json"], ["build", "--no-bundle", "./script.mts"]]) {
    assert.deepEqual(workflowInvocation(base, [...NODE_FLAGS, ...args], bun).args, [...bunOptions, ...args]);
    assert.deepEqual(workflowInvocation(base, args, node).args, [...NODE_FLAGS, ...args]);
  }
  for (const command of ["--test", "test"]) {
    const args = [command, "--help"];
    assert.deepEqual(workflowInvocation(base, [...NODE_FLAGS, ...args], bun).args, ["test", "--help"]);
    assert.deepEqual(workflowInvocation(base, args, node).args, [...NODE_FLAGS, ...args]);
  }
  assert.deepEqual(workflowInvocation(base, ["--test"], bun).args, ["test"]);
});

test("sync and async workflow dispatch use the same selection and preserve spawn options", async () => {
  const calls: unknown[] = [];
  const result = { status: 7, signal: null, stdout: "out", stderr: "err" };
  const deps = { ...base, child: { ...base.child,
    runSync: (...args: Parameters<typeof base.child.runSync>) => { calls.push(args); return result; },
    run: async (...args: Parameters<typeof base.child.run>) => { calls.push(args); return result; } } };
  const options = { env: { ...base.proc.env, AI_WORKFLOW_RUNNER: "bun" }, timeoutMs: 100, input: "payload", cwd: "/root" };
  assert.equal(runWorkflowSync(deps, ["script.mts"], options), result);
  assert.equal(await runWorkflow(deps, ["script.mts"], options), result);
  assert.deepEqual(calls[0], calls[1]);
  assert.deepEqual((calls[0] as unknown[])[2], options);
});

const bunExecutable = process.versions.bun ? process.execPath : "bun";
const skipBun = spawnSync(bunExecutable, ["--version"]).error?.code === "ENOENT";
const preloadMarker = "workflow-preload-marker";
const dotenvMarker = "workflow-dotenv-marker";
const markerVariable = "WORKFLOW_BUN_TEST_MARKER";
const markerCode = `console.log(process.env.${markerVariable} ?? "no dotenv");`;
const buildArgs = ["build", "--no-bundle", "--env=WORKFLOW_BUN_TEST_*", "./marker.mts"];

function markerProject(t: TestContext) {
  const cwd = tempFixture(base, {
    "bunfig.toml": 'preload = ["./preload.mts"]\n',
    "preload.mts": `console.log(${JSON.stringify(preloadMarker)});\n`,
    ".env": `${markerVariable}=${dotenvMarker}\n`,
    "marker.mts": markerCode,
    "direct.mts": `import { runDirect } from ${JSON.stringify(new URL("./cli.mts", import.meta.url).href)};
runDirect(import.meta.url, () => { console.log(process.versions.bun ? "bun" : "node"); ${markerCode} return 0; });`,
  });
  t.after(() => base.fs.rmSync(cwd, { recursive: true, force: true }));
  const env = { ...base.proc.env, AI_WORKFLOW_RUNNER: "bun", [markerVariable]: undefined };
  return { cwd, env };
}

test("unisolated Bun control exposes both markers and inlines the dotenv marker in a build", { skip: skipBun }, (t) => {
  const options = markerProject(t);
  const script = base.child.runSync(bunExecutable, ["./marker.mts"], options);
  assert.deepEqual([script.status, script.stdout.trim(), script.stderr], [0, `${preloadMarker}\n${dotenvMarker}`, ""]);
  const build = base.child.runSync(bunExecutable, buildArgs, options);
  assert.equal(build.status, 0, build.stderr);
  assert.ok(build.stdout.includes(dotenvMarker), build.stdout);
});

for (const { launch, args, output } of [
  { launch: "script", args: ["./marker.mts"], output: "no dotenv" },
  { launch: "eval", args: ["-e", `${markerCode} console.log(JSON.stringify(process.argv.slice(1))); require("node:fs").accessSync("marker.mts");`, "a b", "--json"], output: 'no dotenv\n["a b","--json"]' },
]) {
  test(`workflow Bun ${launch} ignores project preload and dotenv markers`, { skip: skipBun }, (t) => {
    const result = runWorkflowSync(base, args, markerProject(t));
    assert.deepEqual([result.status, result.stdout.trim(), result.stderr], [0, output, ""]);
  });
}

test("workflow Bun build leaves the dotenv variable uninlined and emits neither marker", { skip: skipBun }, (t) => {
  const result = runWorkflowSync(base, buildArgs, markerProject(t));
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes(`process.env.${markerVariable}`), result.stdout);
  const output = result.stdout + result.stderr;
  assert.ok(!output.includes(preloadMarker) && !output.includes(dotenvMarker), output);
});

test("Node runDirect respawns Bun without project preload or dotenv markers", { skip: skipBun }, (t) => {
  const options = markerProject(t);
  const node = process.versions.bun ? "node" : process.execPath;
  const result = base.child.runSync(node, [...NODE_FLAGS, "./direct.mts"], options);
  assert.deepEqual([result.status, result.stdout.trim(), result.stderr], [0, "bun\nno dotenv", ""]);
});

// A wildcard "paths" mapping replaces any file Bun is asked to run or import, trusted scripts included.
const redirectMarker = "workflow-tsconfig-redirect-marker";
const redirect = JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "*": ["./redirect.mts"] } } });
function redirectProject(t: TestContext, config: string) {
  const options = markerProject(t);
  base.fs.writeFileSync(base.path.join(options.cwd, config), redirect);
  base.fs.writeFileSync(base.path.join(options.cwd, "redirect.mts"), `console.log(${JSON.stringify(redirectMarker)});\n`);
  return options;
}

for (const config of ["tsconfig.json", "jsconfig.json"]) {
  test(`workflow Bun launches run the requested file despite a project ${config} path mapping`, { skip: skipBun }, (t) => {
    const options = redirectProject(t, config);
    const control = base.child.runSync(bunExecutable, [...bunOptions.slice(0, 3), "./marker.mts"], options);
    assert.deepEqual([control.status, control.stdout.trim()], [0, redirectMarker], "the fixture can redirect");
    for (const args of [["./marker.mts"], ["-e", `await import(${JSON.stringify(base.path.join(options.cwd, "marker.mts"))});`]]) {
      const result = runWorkflowSync(base, args, options);
      assert.deepEqual([result.status, result.stdout.trim(), result.stderr], [0, "no dotenv", ""]);
    }
    const node = process.versions.bun ? "node" : process.execPath;
    const respawn = base.child.runSync(node, [...NODE_FLAGS, "./direct.mts"], options);
    assert.deepEqual([respawn.status, respawn.stdout.trim(), respawn.stderr], [0, "bun\nno dotenv", ""]);
  });
}

for (const missing of ["bun-isolated.toml", "bun-isolated-tsconfig.json"]) {
  test(`a launcher without ${missing} runs no project preload, dotenv or redirected code`, { skip: skipBun }, async (t) => {
    const copy = tempFixture(base, {});
    t.after(() => base.fs.rmSync(copy, { recursive: true, force: true }));
    for (const file of base.fs.readdirSync(import.meta.dirname)) {
      if (file !== missing && !file.endsWith(".test.mts") && /\.(mts|toml|json)$/.test(file)) {
        base.fs.copyFileSync(base.path.join(import.meta.dirname, file), base.path.join(copy, file));
      }
    }
    const launcher = await import(base.path.join(copy, "entry.mts")) as typeof import("./entry.mts");
    const result = launcher.runWorkflowSync(base, ["./marker.mts"], redirectProject(t, "tsconfig.json"));
    const output = result.stdout + result.stderr;
    for (const marker of [preloadMarker, dotenvMarker, redirectMarker]) assert.ok(!output.includes(marker), output);
    if (missing === "bun-isolated.toml") assert.notEqual(result.status, 0, "a missing Bun config stops the launch");
    assert.ok(output.includes(missing), output);
  });
}

// ---- loadConfig reader branches: the entry runner comes from ai-workflow.toon, else the legacy file ----
const testDeps = createTestDeps();
const { mkdtempSync, rmSync, writeFileSync } = testDeps.fs;
const tmpdir = (): string => testDeps.os.tmpdir();
const { join } = testDeps.path;

test("loadConfig branch: readRunner takes the runner from ai-workflow.toon, falls back to the legacy file, and fails closed on invalid TOON", () => {
  const root = mkdtempSync(join(tmpdir(), "entry-toon-"));
  try {
    const deps = createTestDeps({});
    writeFileSync(join(root, "ai_workflow_env.json"), JSON.stringify({ AI_WORKFLOW_RUNNER: "bun" }));
    assert.equal(readRunner(root, {}, deps), "bun", "missing TOON: legacy file");
    writeFileSync(join(root, "ai-workflow.toon"), toonFixtureText());
    assert.equal(readRunner(root, {}, deps), "node", "valid TOON (runner node) beats legacy bun");
    writeFileSync(join(root, "ai-workflow.toon"), toonFixtureText().replace("runner: node", "runner: bun"));
    assert.equal(readRunner(root, {}, deps), "bun");
    assert.equal(readRunner(root, { AI_WORKFLOW_RUNNER: "node" }, deps), "node", "process env wins");
    writeFileSync(join(root, "ai-workflow.toon"), "schemaVersion: 99\n");
    assert.equal(readRunner(root, {}, deps), "node", "invalid TOON never reads the legacy bun");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
