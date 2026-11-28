import { NODE_FLAGS } from "./runtime/entry.mts";
const RUNTIME_FLAGS = process.versions.bun ? [] : NODE_FLAGS;
import assert from "node:assert/strict";
import { createTestDeps, urlPath, spawnSync } from "./runtime/test-helpers.mts";
const testDeps = createTestDeps();
const { mkdtempSync, realpathSync, rmSync } = testDeps.fs;
const tmpdir = (): string => testDeps.os.tmpdir();
const { join } = testDeps.path;
import { test } from "node:test";

import { BUNDLE_IDENTITY, BUNDLE_SETUP_TITLE, main } from "./setup-validator.mts";
import type { ValidatorLibs } from "./setup-validator.mts";
import type { RunResult, RuntimeDeps, SpawnOptions } from "./runtime/types.mts";

const ROOT = "/proj";
const GOOD_CONTEXT = "# Product\nA real description of the product that is long enough to pass the unfilled draft check.\n";
const AGENTS = "# Agents\n\n## Project specifics\n\nReal.\n\n## Response style (caveman mode)\n\nBrief.\n";

interface Call { command: string; args: string[]; options: SpawnOptions }

function baseFiles(): Record<string, string> {
  return {
    ".project/context/product.md": GOOD_CONTEXT,
    ".project/context/architecture.md": GOOD_CONTEXT,
    ".project/context/stack.md": GOOD_CONTEXT,
    "AGENTS.md": AGENTS,
    "CLAUDE.md": AGENTS,
    "graphify-out/graph.json": "{}",
    ".graphifyignore": "node_modules/\n",
    ".project/knowledge/index.md": "x",
    ".project/status.md": "one\ntwo\n",
    ".project/pitches/_followups.md": "",
    ".project/pitches/_archive/.gitkeep": "",
    ".project/pitches/_parked/.gitkeep": "",
    ".project/done-work.md": "",
    ".project/rules/a.md": "",
    "ai-framework/scripts/demo.mts": "export const a: number = 1;\n",
  };
}

const ok = (stdout: string): RunResult => ({ status: 0, signal: null, stdout, stderr: "" });

function makeDeps(files: Record<string, string>, script: (call: Call) => RunResult | Promise<RunResult>, env: Record<string, string> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const calls: Call[] = [];
  const abs = (rel: string): string => `${ROOT}/${rel}`;
  const store = new Map(Object.entries(files).map(([rel, text]) => [abs(rel), text]));
  const dirEntries = (dir: string): string[] | null => {
    const prefix = `${dir}/`;
    const names = new Set<string>();
    for (const file of store.keys()) if (file.startsWith(prefix)) names.add(file.slice(prefix.length).split("/")[0]);
    return names.size > 0 ? [...names] : null;
  };
  const unsupported = (): never => { throw new Error("not used by setup-validator"); };
  const deps: RuntimeDeps = {
    runtime: "node",
    fs: {
      readFileSync: unsupported, writeFileSync: unsupported, existsSync: unsupported, readdirSync: unsupported, mkdirSync: unsupported, writeFile: unsupported,
      // The in-memory fs cannot inspect real paths: an absent path is ENOENT, a present one is an unsupported (refused) inspection.
      realpathSync: (file) => { if (file === ROOT) return ROOT; throw Object.assign(new Error(`ENOENT ${file}`), { code: "ENOENT" }); },
      lstatSync: (file) => { throw store.has(file) ? new Error("not inspectable in memory") : Object.assign(new Error(`ENOENT ${file}`), { code: "ENOENT" }); },
      readFile: async (file) => { const text = store.get(file); if (text === undefined) throw new Error(`ENOENT ${file}`); return text; },
      exists: async (file) => store.has(file),
      readdir: async (dir) => { const names = dirEntries(dir); if (!names) throw new Error(`ENOENT ${dir}`); return names; },
    },
    path: { join: (...parts: string[]) => parts.join("/") } as unknown as RuntimeDeps["path"],
    child: {
      runSync: unsupported,
      run: async (command, args, options = {}) => { const call = { command, args, options }; calls.push(call); return script(call); },
    },
    crypto: { sha256Hex: unsupported },
    os: { tmpdir: unsupported, platform: () => "test" },
    clock: { now: () => 0, monotonicMs: () => 0 },
    io: { stdout: { write: (text) => { out.push(text); } }, stderr: { write: (text) => { err.push(text); } } },
    proc: { argv: [], env, execPath: "/bin/runtime", cwd: () => ROOT },
  };
  return { deps, out, err, calls };
}

const libs: ValidatorLibs = {
  cursorMirrors: () => ({ created: [], differs: [], current: 3 }),
  resolveClaudeEntry: async (_root, own) => ({ kind: "plain", content: own }),
  readRootFile: async (root, relative, deps) => ((await deps.fs.exists(`${root}/${relative}`)) ? deps.fs.readFile(`${root}/${relative}`) : null),
};

function healthy(call: Call): RunResult {
  const target = call.args.find((arg) => arg.endsWith(".mts"));
  if (target?.endsWith("graphify.mts")) return ok(JSON.stringify({ problems: [], stats: { total: 4 } }));
  if (target?.endsWith("workflow-doctor.mts")) return ok(JSON.stringify({ failures: 0 }));
  return ok("");
}

interface Report { results: { status: string; name: string; detail: string }[]; failures: number }

test("READY run: plain text, exact summary line and exit 0", async () => {
  const { deps, out, err } = makeDeps(baseFiles(), healthy);
  const code = await main(["--no-color"], deps, libs);
  const text = out.join("");
  assert.equal(code, 0);
  assert.deepEqual(err, []);
  assert.ok(text.startsWith("Setup validator: checking generated setup artifacts concurrently...\n"));
  assert.ok(text.includes("\nSetup status: READY\nGenerated setup artifacts and portable workflow contracts passed.\n"));
  assert.match(text, /Validated 22 checks\. Use --json for automation or --no-color for plain text\.\n$/);
  assert.ok(!text.includes("\u001b["));
});

test("color is on by default and off with NO_COLOR or --json", async () => {
  const colored = makeDeps(baseFiles(), healthy);
  await main([], colored.deps, libs);
  assert.ok(colored.out.join("").includes("\u001b[32mPASS \u001b[0m"));
  const noColorEnv = makeDeps(baseFiles(), healthy, { NO_COLOR: "1" });
  await main([], noColorEnv.deps, libs);
  assert.ok(!noColorEnv.out.join("").includes("\u001b["));
});

test("--json prints one report and no human text", async () => {
  const { deps, out } = makeDeps(baseFiles(), healthy);
  const code = await main(["--json"], deps, libs);
  assert.equal(code, 0);
  assert.equal(out.length, 1);
  const report = JSON.parse(out[0]) as Report;
  assert.equal(report.failures, 0);
  assert.ok(report.results.some((r) => r.name === "Knowledge graph" && r.detail === "graphify validated 4 entry(ies)"));
  assert.ok(report.results.some((r) => r.name === "Workflow doctor" && r.status === "pass"));
  assert.ok(report.results.some((r) => r.name === ".project/rules" && r.status === "info"));
  assert.ok(report.results.some((r) => r.name === ".cursor" && r.detail === "3 canonical skill/agent mirror file(s) present"));
});

test("missing records fail with exit 1 and INCOMPLETE text", async () => {
  const files = baseFiles();
  delete files[".project/done-work.md"];
  files[".project/context/stack.md"] = "_Detecting..._";
  const { deps, out } = makeDeps(files, healthy);
  const code = await main(["--no-color"], deps, libs);
  const text = out.join("");
  assert.equal(code, 1);
  assert.ok(text.includes("FAIL  .project/done-work.md: missing\n"));
  assert.ok(text.includes("FAIL  .project/context/stack.md: appears to be an unfilled setup draft\n"));
  assert.ok(text.includes("\nSetup status: INCOMPLETE (2 issue(s))\nNext: re-run /setup"));
});

test("a long context file that still carries a setup placeholder is an unfilled draft", async () => {
  for (const placeholder of ["_Detecting..._", "_Scanning project..._"]) {
    const files = baseFiles();
    files[".project/context/stack.md"] = `# Stack\n\nThis section is long enough to pass the length check on its own.\n\n${placeholder}\n`;
    const { deps, out } = makeDeps(files, healthy);
    assert.equal(await main(["--no-color"], deps, libs), 1, placeholder);
    assert.ok(out.join("").includes("FAIL  .project/context/stack.md: appears to be an unfilled setup draft\n"), placeholder);
  }
});

test("missing .project short-circuits to one failure", async () => {
  const { deps, out, calls } = makeDeps({}, healthy);
  const code = await main(["--json"], deps, libs);
  const report = JSON.parse(out.join("")) as Report;
  assert.equal(code, 1);
  assert.deepEqual(report.results, [{ status: "fail", name: ".project", detail: "missing; setup has not completed" }]);
  assert.equal(calls.length, 0);
});

test("status.md over 100 lines fails", async () => {
  const files = baseFiles();
  files[".project/status.md"] = `${"line\n".repeat(101)}`;
  const { deps, out } = makeDeps(files, healthy);
  assert.equal(await main(["--no-color"], deps, libs), 1);
  assert.ok(out.join("").includes("FAIL  .project/status.md: 101 lines exceeds the 100-line limit\n"));
});

test("bootstrap CLAUDE.md fails; invalid @AGENTS.md import reports the library detail", async () => {
  const files = baseFiles();
  files["CLAUDE.md"] = "Bootstrap file shipped with the bundle\n## Project specifics\n";
  const stub = makeDeps(files, healthy);
  assert.equal(await main(["--no-color"], stub.deps, libs), 1);
  assert.ok(stub.out.join("").includes("FAIL  CLAUDE.md: bootstrap file was not replaced or merged by setup\n"));
  const invalid = makeDeps(baseFiles(), healthy);
  const code = await main(["--no-color"], invalid.deps, { ...libs, resolveClaudeEntry: async () => ({ kind: "invalid", detail: "target is a symlink", content: "" }) });
  assert.equal(code, 1);
  assert.ok(invalid.out.join("").includes("FAIL  CLAUDE.md: target is a symlink\n"));
});

test("an install that kept the bundle's own project specifics fails; the bundle checkout itself passes", async () => {
  const copied = AGENTS.replace("Real.", `${BUNDLE_IDENTITY}: a portable, tool-agnostic development workflow.`);
  const files = baseFiles();
  files["AGENTS.md"] = copied;
  files["CLAUDE.md"] = copied;
  const install = makeDeps(files, healthy);
  assert.equal(await main(["--no-color"], install.deps, libs), 1);
  const text = install.out.join("");
  assert.ok(text.includes("FAIL  AGENTS.md: project specifics are still this bundle's own (ai-workflow-portable); replace them with this project's\n"));
  assert.ok(text.includes("FAIL  CLAUDE.md: project specifics are still this bundle's own (ai-workflow-portable); replace them with this project's\n"));
  // A project's own setup guide is not the bundle's, so the install check stays on.
  const ownGuide = makeDeps({ ...files, "SETUP.md": "# How to set up my app\n" }, healthy);
  assert.equal(await main(["--no-color"], ownGuide.deps, libs), 1);
  assert.ok(ownGuide.out.join("").includes("FAIL  AGENTS.md: project specifics are still this bundle's own"));
  const bundle = makeDeps({ ...files, "SETUP.md": `${BUNDLE_SETUP_TITLE}\n\nSteps.\n` }, healthy);
  assert.equal(await main(["--no-color"], bundle.deps, libs), 0);
});

test("a stale AGENTS.md reached through the @AGENTS.md import fails CLAUDE.md too", async () => {
  const files = baseFiles();
  files["CLAUDE.md"] = "@AGENTS.md\n";
  const stale = `${AGENTS}\n${BUNDLE_IDENTITY}.\n`;
  const { deps, out } = makeDeps(files, healthy);
  assert.equal(await main(["--no-color"], deps, { ...libs, resolveClaudeEntry: async (_root, own) => ({ kind: "import", content: `${own}\n${stale}` }) }), 1);
  assert.ok(out.join("").includes("FAIL  CLAUDE.md: project specifics are still this bundle's own"));
});

// These two tests pin the bundle's own sources. Tests ship into installed projects, where there is nothing to pin.
const BUNDLE_ROOT = urlPath(new URL("../../", import.meta.url));
const bundleSetup = join(BUNDLE_ROOT, "SETUP.md");
const SKIP_OUTSIDE_BUNDLE = testDeps.fs.existsSync(bundleSetup) && String(testDeps.fs.readFileSync(bundleSetup, "utf8")).includes("ai-workflow-portable")
  ? false : "not the ai-workflow-portable checkout";

test("the bundle's own SETUP.md still starts with the title that marks the bundle checkout", { skip: SKIP_OUTSIDE_BUNDLE }, () => {
  const setup = testDeps.fs.readFileSync(join(urlPath(new URL("../../", import.meta.url)), "SETUP.md"), "utf8") as string;
  assert.equal(setup.split(/\r?\n/)[0], BUNDLE_SETUP_TITLE);
});

test("the bundle's own entry files still carry the identity sentence the install check looks for", { skip: SKIP_OUTSIDE_BUNDLE }, () => {
  const read = (file: string): string => testDeps.fs.readFileSync(join(urlPath(new URL("../../", import.meta.url)), file), "utf8") as string;
  for (const file of ["AGENTS.md", "CLAUDE.md"]) assert.ok(read(file).includes(BUNDLE_IDENTITY), `${file} lost the sentence; update BUNDLE_IDENTITY`);
});

test("missing caveman section only warns; cursor mirror problems fail or warn", async () => {
  const plain = "# Agents\n\n## Project specifics\n\nReal.\n";
  const warn = makeDeps({ ...baseFiles(), "AGENTS.md": plain, "CLAUDE.md": plain }, healthy);
  const code = await main(["--no-color"], warn.deps, libs);
  assert.equal(code, 0);
  assert.ok(warn.out.join("").includes("WARN  AGENTS.md: no caveman response-style section"));
  const mirrors = makeDeps(baseFiles(), healthy);
  const code2 = await main(["--no-color"], mirrors.deps, { ...libs, cursorMirrors: () => ({ created: [".cursor/a.mdc"], differs: [".cursor/b.mdc"], current: 0 }) });
  assert.equal(code2, 1);
  const text = mirrors.out.join("");
  assert.ok(text.includes("FAIL  .cursor/a.mdc: missing Cursor mirror; run node ai-framework/scripts/skill-vendors.mts cursor-mirrors --apply\n"));
  assert.ok(text.includes("WARN  .cursor/b.mdc: differs from its canonical .claude file"));
  const thrown = makeDeps(baseFiles(), healthy);
  await main(["--no-color"], thrown.deps, { ...libs, cursorMirrors: () => { throw Object.assign(new Error("/private/secret-marker"), { code: "ENOENT" }); } });
  assert.ok(thrown.out.join("").includes("FAIL  .cursor: cannot check Cursor mirrors (ENOENT)\n"));
  assert.doesNotMatch(thrown.out.join(""), /secret-marker/);
});

test("child failures: graphify non-zero uses stderr, bad JSON and doctor failures are reported", async () => {
  const graphFail = makeDeps(baseFiles(), (call) => (call.args.some((arg) => arg.endsWith("graphify.mts")) ? { status: 1, signal: null, stdout: "", stderr: "boom\n" } : healthy(call)));
  assert.equal(await main(["--no-color"], graphFail.deps, libs), 1);
  assert.ok(graphFail.out.join("").includes("FAIL  Knowledge graph: graphify reported invalid entries (exit 1); run node ai-framework/scripts/graphify.mts --check\n"));
  assert.doesNotMatch(graphFail.out.join(""), /boom/);
  const badJson = makeDeps(baseFiles(), (call) => (call.args.some((arg) => arg.endsWith("graphify.mts")) ? ok("not json") : healthy(call)));
  await main(["--no-color"], badJson.deps, libs);
  assert.ok(badJson.out.join("").includes("FAIL  Knowledge graph: graphify did not return JSON\n"));
  const docFail = makeDeps(baseFiles(), (call) => (call.args.some((arg) => arg.endsWith("workflow-doctor.mts")) ? ok(JSON.stringify({ failures: 3 })) : healthy(call)));
  await main(["--no-color"], docFail.deps, libs);
  assert.ok(docFail.out.join("").includes("FAIL  Workflow doctor: 3 workflow contract failure(s)\n"));
  const spawnError = makeDeps(baseFiles(), (call) => {
    if (call.args.some((arg) => arg.endsWith("workflow-doctor.mts"))) throw new Error("ENOENT");
    return healthy(call);
  });
  await main(["--no-color"], spawnError.deps, libs);
  assert.ok(spawnError.out.join("").includes("FAIL  Workflow doctor: workflow doctor found a blocking issue (SPAWN_FAILED)\n"));
  const exited = makeDeps(baseFiles(), (call) => (call.args.some((arg) => arg.endsWith("workflow-doctor.mts")) ? { status: 4, signal: null, stdout: "", stderr: "secret-marker" } : healthy(call)));
  await main(["--no-color"], exited.deps, libs);
  assert.ok(exited.out.join("").includes("FAIL  Workflow doctor: workflow doctor found a blocking issue (exit 4)\n"));
  assert.doesNotMatch(exited.out.join(""), /secret-marker/);
  const killed = makeDeps(baseFiles(), (call) => (call.args.some((arg) => arg.endsWith("workflow-doctor.mts")) ? { status: null, signal: "SIGKILL", stdout: "", stderr: "" } : healthy(call)));
  await main(["--no-color"], killed.deps, libs);
  assert.ok(killed.out.join("").includes("FAIL  Workflow doctor: workflow doctor found a blocking issue (signal SIGKILL)\n"));
});

test("child checks run the running bundle's own scripts, never the checked project's copies", async () => {
  const { deps, calls } = makeDeps(baseFiles(), healthy);
  await main(["--no-color"], deps, libs);
  const here = testDeps.path.dirname(urlPath(import.meta.url));
  for (const name of ["graphify.mts", "workflow-doctor.mts"]) {
    const targets = calls.flatMap((call) => call.args.filter((arg) => arg.endsWith(name)));
    assert.deepEqual(targets, [`${here}/${name}`]);
  }
});

test("spawns children with execPath and the project cwd", async () => {
  const { deps, calls } = makeDeps(baseFiles(), healthy);
  await main(["--no-color"], deps, libs);
  assert.ok(calls.every((call) => call.command === "/bin/runtime"));
  assert.ok(calls.some((call) => call.args.join(" ").endsWith("ai-framework/scripts/graphify.mts --check --json")));
  assert.ok(calls.some((call) => call.args.join(" ").endsWith("ai-framework/scripts/workflow-doctor.mts --json")));
});

test("K3: every existing .mts entry is parse-checked as one extra check; a bad one fails", async () => {
  const good = makeDeps(baseFiles(), healthy);
  await main(["--json"], good.deps, libs);
  const parseCalls = good.calls.filter((call) => call.args.includes("-e"));
  assert.equal(parseCalls.length, 1);
  assert.equal(parseCalls[0].args.at(-1), `${ROOT}/ai-framework/scripts/demo.mts`);
  const report = JSON.parse(good.out.join("")) as Report;
  assert.ok(report.results.some((r) => r.name === "TypeScript entries" && r.status === "pass" && r.detail === "1 TypeScript file(s) parse"));

  const bad = makeDeps(baseFiles(), (call) => (call.args.includes("-e") ? { status: 1, signal: null, stdout: "", stderr: "SyntaxError: nope\nmore\n" } : healthy(call)));
  assert.equal(await main(["--no-color"], bad.deps, libs), 1);
  assert.ok(bad.out.join("").includes("FAIL  ai-framework/scripts/demo.mts: does not parse (parse check exited with code 1)\n"));
  assert.doesNotMatch(bad.out.join(""), /SyntaxError: nope/);

  const none = baseFiles();
  delete none["ai-framework/scripts/demo.mts"];
  const absent = makeDeps(none, healthy);
  await main(["--json"], absent.deps, libs);
  assert.ok(!(JSON.parse(absent.out.join("")) as Report).results.some((r) => r.name === "TypeScript entries"));
  assert.equal(absent.calls.filter((call) => call.args.includes("-e")).length, 0);
});

test("validator never sends a project file to a Bun child", async () => {
  const files = { ...baseFiles(), "ai-framework/scripts/extra.ts": "export {};" };
  for (const runner of ["node", "bun"]) {
    const run = makeDeps(files, healthy, { AI_WORKFLOW_RUNNER: runner });
    run.deps.runtime = "node";
    run.deps.proc.versions = { bun: "test" };
    assert.equal(await main(["--json"], run.deps, libs), 0);
    assert.equal(run.calls.length, 2, "only the bundle doctor and graph check may start");
    assert.deepEqual((JSON.parse(run.out.join("")) as Report).results.filter((item) => item.name === "TypeScript entries"), [
      { status: "warn", name: "TypeScript entries", detail: "2 file(s) not parse-checked under Bun. Run with AI_WORKFLOW_RUNNER=node to check syntax." },
    ]);
  }
});

test("validator pins project parsing to its own Node executable", async () => {
  const run = makeDeps(baseFiles(), healthy, { AI_WORKFLOW_RUNNER: "bun", KEEP: "value" });
  run.deps.runtime = "bun";
  run.deps.proc.versions = { node: "24.21.0" };
  assert.equal(await main(["--json"], run.deps, libs), 0);
  const parseCalls = run.calls.filter((call) => call.args.at(-1)?.endsWith("demo.mts"));
  assert.equal(parseCalls.length, 1);
  assert.equal(parseCalls[0].command, run.deps.proc.execPath);
  assert.deepEqual(parseCalls[0].options.env, { AI_WORKFLOW_RUNNER: "node", KEEP: "value" });
  assert.ok(parseCalls[0].args.includes("-e"));
});

test("validator keeps a doctor syntax warning in JSON and the human summary", async () => {
  const runDoctor = (call: Call): RunResult => call.args.at(-2)?.endsWith("workflow-doctor.mts")
    ? ok(JSON.stringify({ failures: 0, results: [{ status: "warn", name: "Syntax check", detail: "child detail" }] }))
    : healthy(call);
  const json = makeDeps(baseFiles(), runDoctor);
  assert.equal(await main(["--json"], json.deps, libs), 0);
  const report = JSON.parse(json.out.join("")) as Report;
  assert.equal(report.results.find((item) => item.name === "Workflow doctor")?.status, "warn");
  const human = makeDeps(baseFiles(), runDoctor);
  assert.equal(await main(["--no-color"], human.deps, libs), 0);
  assert.match(human.out.join(""), /Setup status: READY\n[^\n]*\nSyntax check: some files were not parse-checked\./);
  assert.doesNotMatch(human.out.join(""), /child detail/);
});

test("unexpected errors exit 2 on stderr", async () => {
  const { deps, err } = makeDeps(baseFiles(), healthy);
  const code = await main(["--no-color"], deps, { ...libs, resolveClaudeEntry: async () => { throw new Error("kaboom"); } });
  assert.equal(code, 2);
  assert.equal(err.join(""), "Setup validator failed unexpectedly (UNKNOWN)\n");
});

test("control characters in a reported file name cannot forge report lines", async () => {
  const { deps, out } = makeDeps(baseFiles(), healthy);
  await main(["--no-color"], deps, { ...libs, cursorMirrors: () => ({ created: [".cursor/a\nPASS  forged\u001b[2K"], differs: [], current: 0 }) });
  assert.doesNotMatch(out.join(""), /\nPASS  forged|\u001b/);
});

test("child reports with non-numeric counts are rejected, not printed", async () => {
  for (const [script, body, expected] of [
    ["graphify.mts", { problems: [], stats: { total: "/mock/secret-marker" } }, "FAIL  Knowledge graph: graphify did not return JSON\n"],
    ["workflow-doctor.mts", { failures: "/mock/secret-marker" }, "FAIL  Workflow doctor: did not return JSON\n"],
    ["graphify.mts", { problems: [], stats: { total: -1 } }, "FAIL  Knowledge graph: graphify did not return JSON\n"],
    ["graphify.mts", { problems: null, stats: { total: 4 } }, "FAIL  Knowledge graph: graphify did not return JSON\n"],
    ["workflow-doctor.mts", { failures: -1 }, "FAIL  Workflow doctor: did not return JSON\n"],
  ] as const) {
    const { deps, out } = makeDeps(baseFiles(), (call) => (call.args.some((arg) => arg.endsWith(script)) ? ok(JSON.stringify(body)) : healthy(call)));
    assert.equal(await main(["--no-color"], deps, libs), 1);
    assert.ok(out.join("").includes(expected), script);
    assert.doesNotMatch(out.join(""), /secret-marker/);
  }
});

test("control characters in a reported detail cannot forge report lines", async () => {
  const { deps, out } = makeDeps(baseFiles(), healthy);
  await main(["--no-color"], deps, { ...libs, resolveClaudeEntry: async () => ({ kind: "invalid", detail: "bad\u001b[2K\nPASS  forged", content: "" }) });
  assert.doesNotMatch(out.join(""), /\nPASS  forged|\u001b/);
  assert.ok(out.join("").includes("FAIL  CLAUDE.md: bad?[2K?PASS  forged\n"));
});

test("the caveman check follows the @AGENTS.md import for CLAUDE.md", async () => {
  const files = { ...baseFiles(), "CLAUDE.md": "@AGENTS.md\n" };
  const { deps, out } = makeDeps(files, healthy);
  const imported: ValidatorLibs = { ...libs, resolveClaudeEntry: async (_root, own) => ({ kind: "import", content: `${own}\n${AGENTS}` }) };
  await main(["--no-color"], deps, imported);
  assert.ok(out.join("").includes("PASS  CLAUDE.md: carries the caveman response-style section\n"));
});

test("a context file full of unclosed angle brackets is checked in linear time", () => {
  const started = Date.now();
  realReport((dir) => {
    testDeps.fs.mkdirSync(join(dir, ".project/context"));
    testDeps.fs.writeFileSync(join(dir, ".project/context/product.md"), "<".repeat(1024 * 1024));
  });
  assert.ok(Date.now() - started < 10000, "the placeholder scan must not be quadratic");
});

const bunProbe = spawnSync("bun", ["-p", "process.execPath"], { timeout: 5000 });
const bunExecutable = process.versions.bun ? process.execPath : bunProbe.stdout.trim();
const skipBun = !process.versions.bun && bunProbe.error?.code === "ENOENT";

test("real Bun validator reports inert TypeScript as unchecked", { skip: skipBun }, () => {
  const results = realReport((dir) => {
    testDeps.fs.mkdirSync(join(dir, "ai-framework/scripts"), { recursive: true });
    testDeps.fs.writeFileSync(join(dir, "ai-framework/scripts/example.mts"), "export const value: number = 1;\n");
  }, "bun");
  assert.equal(results.find((item) => item.name === "TypeScript entries")?.status, "warn");
  assert.doesNotMatch(results.map((item) => item.detail).join("\n"), /1 TypeScript file\(s\) parse/);
});

test("real Bun validator runs no project macro: relative, absolute and package imports", { skip: skipBun }, (t) => {
  const markers = realpathSync(mkdtempSync(join(tmpdir(), "setup-validator-macro-")));
  t.after(() => rmSync(markers, { recursive: true, force: true }));
  const kinds = ["relative", "absolute", "package"];
  const ran = (): string[] => kinds.filter((kind) => testDeps.fs.existsSync(join(markers, `ran-${kind}`)));
  const results = realReport((dir) => {
    const put = (name: string, content: string): void => {
      testDeps.fs.mkdirSync(join(dir, name, ".."), { recursive: true });
      testDeps.fs.writeFileSync(join(dir, name), content);
    };
    const macro = (kind: string): string => 'import { writeFileSync } from "node:fs";\n' +
      `export function m(): number { writeFileSync(${JSON.stringify(join(markers, `ran-${kind}`))}, "marker"); return 1; }\n`;
    put("mac-relative.ts", macro("relative"));
    put("mac-absolute.ts", macro("absolute"));
    put("node_modules/mpkg/index.ts", macro("package"));
    put("node_modules/mpkg/package.json", '{"name":"mpkg","version":"1.0.0","module":"index.ts","main":"index.ts"}\n');
    put(".claude/hooks/zz.ts", 'import { m as a } from "../../mac-relative.ts" with { type: "macro" };\n' +
      `import { m as b } from ${JSON.stringify(join(dir, "mac-absolute.ts"))} with { type: "macro" };\n` +
      'import { m as c } from "mpkg" with { type: "macro" };\nconsole.log(a(), b(), c());\n');
    // Control: these macros do run when Bun is given the source.
    assert.equal(spawnSync(bunExecutable, ["build", "--no-bundle", ".claude/hooks/zz.ts"], { cwd: dir, timeout: 15000 }).error, undefined);
    assert.deepEqual(ran(), kinds);
    for (const kind of kinds) rmSync(join(markers, `ran-${kind}`));
  }, "bun");
  assert.deepEqual(ran(), []);
  assert.equal(results.find((item) => item.name === "TypeScript entries")?.status, "warn");
});

function realReport(prepare: (dir: string, outside: string) => void, runner = process.versions.bun ? "bun" : "node"): Report["results"] {
  const base = realpathSync(mkdtempSync(join(tmpdir(), "setup-validator-guard-")));
  try {
    const dir = join(base, "proj"), outside = join(base, "outside");
    for (const folder of [join(dir, ".project"), outside]) testDeps.fs.mkdirSync(folder, { recursive: true });
    testDeps.fs.writeFileSync(join(dir, "AGENTS.md"), AGENTS);
    testDeps.fs.writeFileSync(join(dir, "CLAUDE.md"), AGENTS);
    prepare(dir, outside);
    const result = spawnSync(runner === "bun" ? bunExecutable : process.execPath, [...(runner === "bun" ? [] : NODE_FLAGS), urlPath(new URL("./setup-validator.mts", import.meta.url)), "--json"], {
      cwd: dir, encoding: "utf8", timeout: 20000,
      env: { ...process.env, PATH: dir, AI_WORKFLOW_RUNNER: runner },
    });
    assert.equal(result.error, undefined);
    assert.doesNotMatch(String(result.stdout) + String(result.stderr), /outside-marker/);
    return (JSON.parse(String(result.stdout)) as Report).results;
  } finally { rmSync(base, { recursive: true, force: true }); }
}
const REFUSED = "refused: not a single plain UTF-8 file of at most 1 MiB inside the project (links are not followed)";
const refusedNames = (results: { name: string; detail: string }[]): string[] => results.filter((item) => item.detail === REFUSED).map((item) => item.name).sort();
const replace = (dir: string, file: string): void => testDeps.fs.rmSync(join(dir, file), { force: true });

test("guarded reads: a symlinked, oversized or hard-linked entry file is refused and never read", () => {
  assert.deepEqual(refusedNames(realReport((dir, outside) => {
    testDeps.fs.writeFileSync(join(outside, "a.md"), `${AGENTS}outside-marker\n@docs/AGENTS.md outside-marker\n`);
    for (const file of ["AGENTS.md", "CLAUDE.md"]) { replace(dir, file); testDeps.fs.symlinkSync(join(outside, "a.md"), join(dir, file)); }
  })), ["AGENTS.md", "CLAUDE.md"]);
  assert.deepEqual(refusedNames(realReport((dir) => { testDeps.fs.writeFileSync(join(dir, "CLAUDE.md"), `${AGENTS}${"x".repeat(1024 * 1024)}`); })), ["CLAUDE.md"]);
  assert.deepEqual(refusedNames(realReport((dir, outside) => {
    testDeps.fs.writeFileSync(join(outside, "a.md"), AGENTS);
    replace(dir, "AGENTS.md");
    assert.equal(spawnSync("ln", [join(outside, "a.md"), join(dir, "AGENTS.md")]).status, 0);
  })), ["AGENTS.md"]);
});

test("guarded reads: a FIFO entry file is refused instead of blocking the run", { skip: process.platform === "win32" }, () => {
  assert.deepEqual(refusedNames(realReport((dir) => {
    replace(dir, "AGENTS.md");
    assert.equal(spawnSync("mkfifo", [join(dir, "AGENTS.md")]).status, 0);
  })), ["AGENTS.md"]);
});

test("guarded reads: linked context and status files are refused", () => {
  assert.deepEqual(refusedNames(realReport((dir, outside) => {
    testDeps.fs.writeFileSync(join(outside, "s.md"), "outside-marker\n".repeat(101));
    testDeps.fs.mkdirSync(join(dir, ".project/context"));
    testDeps.fs.symlinkSync(join(outside, "s.md"), join(dir, ".project/status.md"));
    for (const file of ["product", "architecture", "stack"]) testDeps.fs.symlinkSync(join(outside, "s.md"), join(dir, `.project/context/${file}.md`));
  })), [".project/context/architecture.md", ".project/context/product.md", ".project/context/stack.md", ".project/status.md"]);
});

test("guarded reads: a linked SETUP.md carrying the bundle title does not exempt an install", () => {
  const results = realReport((dir, outside) => {
    for (const file of ["AGENTS.md", "CLAUDE.md"]) testDeps.fs.writeFileSync(join(dir, file), `${AGENTS}${BUNDLE_IDENTITY}.\n`);
    testDeps.fs.writeFileSync(join(outside, "SETUP.md"), `${BUNDLE_SETUP_TITLE}\n`);
    testDeps.fs.symlinkSync(join(outside, "SETUP.md"), join(dir, "SETUP.md"));
  });
  assert.equal(results.filter((item) => item.status === "fail" && item.detail.startsWith("project specifics are still this bundle's own")).length, 2);
});

test("integration: the direct TypeScript command runs the validator in an empty project dir", () => {
  const shim = urlPath(new URL("./setup-validator.mts", import.meta.url));
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "setup-validator-")));
  try {
    const run = spawnSync(process.execPath, [...RUNTIME_FLAGS, shim, "--no-color"], { cwd: dir, encoding: "utf8", shell: false, windowsHide: true, timeout: 15000, env: { ...process.env, NO_COLOR: "1", AI_WORKFLOW_RUNNER: process.versions.bun ? "bun" : "node" } });
    assert.equal(run.stderr, "");
    assert.equal(run.status, 1);
    assert.ok(run.stdout.includes("FAIL  .project: missing; setup has not completed\n"));
    assert.ok(run.stdout.includes("Setup status: INCOMPLETE (1 issue(s))"));
    assert.match(run.stdout, /Validated 0 checks\./);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});


test("parser probes are bounded and all settle exactly once before validation completes", async () => {
  const files = baseFiles();
  delete files["ai-framework/scripts/demo.mts"];
  for (let index = 0; index < 12; index++) files["ai-framework/scripts/probe-" + index + ".mts"] = "export {};";
  let active = 0;
  let peak = 0;
  const finished: string[] = [];
  const run = makeDeps(files, async (call) => {
    if (!call.args.includes("-e")) return healthy(call);
    active++;
    peak = Math.max(peak, active);
    await new Promise<void>((resolve) => setImmediate(resolve));
    active--;
    finished.push(call.args.at(-1)!);
    return ok("");
  });
  assert.equal(await main(["--json"], run.deps, libs), 0);
  assert.equal(active, 0);
  assert.ok(peak >= 2 && peak <= 4);
  assert.equal(finished.length, 12);
  assert.equal(new Set(finished).size, 12);
  assert.equal(run.calls.filter((call) => call.args.includes("-e")).length, 12);
});

test("parser process failures retain safe diagnostics rather than claiming syntax errors", async () => {
  const cases: { result?: RunResult; error?: Error; expected: string }[] = [
    { result: { status: null, signal: "SIGKILL", stdout: "", stderr: "", errorCode: "ETIMEDOUT" }, expected: "parse check timed out (ETIMEDOUT; signal SIGKILL; limit 30000ms)" },
    { result: { status: null, signal: "SIGKILL", stdout: "", stderr: "" }, expected: "parse check terminated (signal SIGKILL)" },
    { result: { status: 7, signal: null, stdout: "", stderr: "" }, expected: "parse check exited with code 7" },
    { error: Object.assign(new Error("sensitive-marker"), { code: "EAGAIN" }), expected: "parse check could not run (EAGAIN)" },
    { error: Object.assign(new Error("sensitive-marker"), { code: "secret: sensitive-marker" }), expected: "parse check could not run (SPAWN_FAILED)" },
  ];
  for (const entry of cases) {
    const run = makeDeps(baseFiles(), (call) => {
      if (!call.args.includes("-e")) return healthy(call);
      if (entry.error) throw entry.error;
      return entry.result!;
    });
    assert.equal(await main(["--no-color"], run.deps, libs), 1);
    assert.ok(run.out.join("").includes(entry.expected));
    assert.doesNotMatch(run.out.join("") + run.err.join(""), /sensitive-marker|does not parse/);
  }
});

test("validator warns for old Node and counts only parsed files", async () => {
  for (const mixed of [false, true]) {
    const files = mixed ? { ...baseFiles(), "ai-framework/scripts/extra.ts": "export {};" } : baseFiles();
    const run = makeDeps(files, (call) => call.args.at(-1)?.endsWith("demo.mts") ? { ...ok(""), status: 3 } : healthy(call));
    assert.equal(await main(["--json"], run.deps, libs), 0);
    const report = JSON.parse(run.out.join("")) as Report;
    assert.deepEqual(report.results.filter((item) => item.name === "TypeScript entries"), [
      { status: "warn", name: "TypeScript entries", detail: "1 file(s) not parse-checked: this Node has no module.stripTypeScriptTypes" },
      ...(mixed ? [{ status: "pass", name: "TypeScript entries", detail: "1 TypeScript file(s) parse" }] : []),
    ]);
  }
});

test("Workflow config is info when ai-workflow.toon is absent, and never fails the run by itself", async () => {
  const run = makeDeps(baseFiles(), healthy);
  assert.equal(await main(["--json"], run.deps, libs), 0);
  const report = JSON.parse(run.out.join("")) as Report;
  const item = report.results.find((result) => result.name === "Workflow config");
  assert.deepEqual([item?.status, /not yet migrated/.test(item?.detail ?? "")], ["info", true]);
});

test("Workflow config is fail (LEXER-SYMLINK) for a dangling symlink ai-workflow.toon, never absent", async () => {
  // A dangling symlink does not "exist" for exists(), so the old pre-check reported it as absent.
  const base = makeDeps(baseFiles(), healthy);
  const target = `${ROOT}/ai-workflow.toon`;
  const lstat = base.deps.fs.lstatSync;
  const deps: RuntimeDeps = { ...base.deps, fs: { ...base.deps.fs, lstatSync: (file: string) => file === target ? ({ isSymbolicLink: () => true } as ReturnType<typeof lstat>) : lstat(file) } };
  assert.equal(await main(["--json"], deps, libs), 1);
  const item = (JSON.parse(base.out.join("")) as Report).results.find((result) => result.name === "Workflow config");
  assert.equal(item?.status, "fail");
  assert.match(item?.detail ?? "", /symlink/i);
});

test("Workflow config is fail when a present ai-workflow.toon is refused by the reader", async () => {
  // The in-memory fs cannot inspect paths, so loadConfig refuses; refusal must be fail, never a silent pass.
  const run = makeDeps({ ...baseFiles(), "ai-workflow.toon": "schemaVersion: 2\n" }, healthy);
  assert.equal(await main(["--json"], run.deps, libs), 1);
  const report = JSON.parse(run.out.join("")) as Report;
  const item = report.results.find((result) => result.name === "Workflow config");
  assert.deepEqual([item?.status, /refused/.test(item?.detail ?? "")], ["fail", true]);
});

test("Workflow config reports valid as pass and invalid as fail on a real project dir", async (t) => {
  const { createNodeDeps } = await import("./runtime/node.mts");
  const { mkdirSync, readFileSync, writeFileSync } = createTestDeps().fs;
  const dir = mkdtempSync(join(tmpdir(), "setup-validator-config-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, ".project"));
  const valid = readFileSync(urlPath(new URL("../templates/ai-workflow.example.toon", import.meta.url)), "utf8");
  const cases: Array<[string, string, RegExp]> = [
    [valid, "pass", /valid/],
    [valid.replace("doctor:\n", "  nosuchtool:\n    a: 1\ndoctor:\n"), "fail", /unknown integration "nosuchtool"/],
    ["schemaVersion: 3\n", "fail", /invalid|refused/],
  ];
  for (const [body, status, detail] of cases) {
    writeFileSync(join(dir, "ai-workflow.toon"), body);
    const base = createNodeDeps();
    const out: string[] = [];
    const deps: RuntimeDeps = { ...base, proc: { ...base.proc, cwd: () => dir, env: {} }, io: { ...base.io, stdout: { write: (text) => { out.push(text); } } } };
    await main(["--json"], deps, libs);
    const item = (JSON.parse(out.join("")) as Report).results.find((result) => result.name === "Workflow config");
    assert.deepEqual([item?.status, detail.test(item?.detail ?? "")], [status, true], `${status}: ${item?.detail}`);
  }
});

// ---- consolidation records: ledgers and outcome records ----

import { consolidationResults } from "./setup-validator.mts";
import { tempFixture } from "./runtime/test-helpers.mts";

const V1_LEDGER = JSON.stringify({ schemaVersion: 1, slug: "old-one", sections: [{ source: "SHIPPED.md#a", status: "extracted", destination: "x.md" }] });
const V2_LEDGER = JSON.stringify({
  schemaVersion: 2, slug: "new-one", otherFiles: [],
  sections: [{ source: "SHIPPED.md#a", class: "know-how", disposition: "extracted", destination: "x.md", helps: "Why X.", bodyHash: `sha256:${"a".repeat(64)}` }],
});
const OUTCOME = (slug: string): string => ["---", `slug: ${slug}`, "shipped: 2026-10-01", "schemaVersion: 1", "---", `# ${slug}`, "", "It changed.", "Look here.", "Nothing else.", "", "- outcome: Changed it.", ...["docs", "decisions", "knowledge", "code", "verification", "followups", "archive"].map((field) => `- ${field}: none`), ""].join("\n");

async function consolidation(files: Record<string, string>): Promise<{ status: string; name: string; detail: string }[]> {
  const root = tempFixture(testDeps, files);
  try { return await consolidationResults(root, testDeps); } finally { rmSync(root, { recursive: true, force: true }); }
}

test("consolidation records: nothing yet is information, never a failure", async () => {
  assert.deepEqual((await consolidation({ "keep.txt": "" })).map((r) => [r.name, r.status]), [["Compaction ledgers", "info"], ["Outcome records", "info"]]);
});

test("consolidation records: version 1 and version 2 ledgers and a clean outcome record pass", async () => {
  const results = await consolidation({
    ".project/compaction/ledgers/old-one.json": V1_LEDGER,
    ".project/compaction/ledgers/new-one.json": V2_LEDGER,
    ".project/compaction/ledgers/old-one.v1.json": "kept sibling, not judged",
    ".project/records/shipped/good.md": OUTCOME("good"),
  });
  assert.deepEqual(results.map((r) => [r.name, r.status, r.detail]), [["Compaction ledgers", "pass", "2 valid (1 v1, 1 v2)"], ["Outcome records", "pass", "1 pass the lint"]]);
});

test("consolidation records: an unsupported or malformed ledger and a record that fails the lint are failures that name the file", async () => {
  const results = await consolidation({
    ".project/compaction/ledgers/future.json": JSON.stringify({ schemaVersion: 3, slug: "future", sections: [] }),
    ".project/compaction/ledgers/broken.json": "{not json",
    ".project/records/shipped/bad.md": "no frontmatter\n",
  });
  const [ledgers, records] = results;
  assert.strictEqual(ledgers.status, "fail");
  assert.match(ledgers.detail, /2 invalid: .*broken \(not a readable ledger\).*future \(unsupported ledger schemaVersion 3/);
  assert.strictEqual(records.status, "fail");
  assert.match(records.detail, /1 fail the lint: bad \(/);
});

test("consolidation records: a FIFO, a symlink or an oversize file in the ledger folder is reported without being read or blocking", async () => {
  const root = tempFixture(testDeps, { ".project/compaction/ledgers/good.json": V1_LEDGER.replace("old-one", "good"), "outside.json": V1_LEDGER });
  try {
    const dir = join(root, ".project/compaction/ledgers");
    assert.equal(spawnSync("mkfifo", [join(dir, "fifo.json")]).status, 0);
    testDeps.fs.symlinkSync(join(root, "outside.json"), join(dir, "link.json"));
    const started = Date.now();
    const [ledgers] = await consolidationResults(root, testDeps);
    assert.ok(Date.now() - started < 5000, "did not block on the FIFO");
    assert.equal(ledgers.status, "fail");
    assert.match(ledgers.detail, /2 invalid: .*fifo \(not a readable ledger\).*link \(not a readable ledger\)/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("consolidation records: control characters in a ledger name never reach the output, and a symlinked ledger folder is refused unread", async () => {
  const escaped = await consolidation({ [".project/compaction/ledgers/x\u001b]0;pwned\u0007.json"]: "{}" });
  assert.ok(!/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/.test(escaped[0].detail), "no control character in the detail");
  const outside = tempFixture(testDeps, { "ledgers/y.json": JSON.stringify({ schemaVersion: "SECRET-FROM-OUTSIDE", slug: "y", sections: [] }) });
  const root = tempFixture(testDeps, { ".project/compaction/keep": "" });
  try {
    testDeps.fs.symlinkSync(join(outside, "ledgers"), join(root, ".project/compaction/ledgers"));
    const [ledgers] = await consolidationResults(root, testDeps);
    assert.deepEqual([ledgers.status, ledgers.detail], ["fail", "ledgers is a symlink (refused)"]);
    assert.ok(!ledgers.detail.includes("SECRET"));
  } finally { rmSync(root, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }); }
});

test("consolidation records: a line feed in a ledger name cannot forge extra report lines", async () => {
  const forged = await consolidation({ ".project/compaction/ledgers/x\nPASS  Compaction ledgers: 46 valid (46 v1)\nPASS  forged.json": "{}" });
  assert.equal(forged[0].status, "fail");
  assert.ok(!forged[0].detail.includes("\n"), "the detail is one line");
  assert.ok(!forged[0].detail.includes("\r"));
});
