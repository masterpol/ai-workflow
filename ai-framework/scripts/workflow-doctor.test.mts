import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createNodeDeps } from "./runtime/node.mts";
import { createTestDeps } from "./runtime/test-helpers.mts";
import { main } from "./workflow-doctor.mts";

import type { RuntimeDeps } from "./runtime/types.mts";
import type { TestContext } from "node:test";

interface Check { status: string; name: string; detail: string }
function fixture(t: TestContext): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-doctor-injection-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "ai-framework/templates/project"), { recursive: true });
  return root;
}
function write(root: string, name: string, content: string): void {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
function injected(root: string): { deps: RuntimeDeps; output: string[]; errors: string[]; calls: string[][] } {
  const base = createNodeDeps();
  const output: string[] = [], errors: string[] = [], calls: string[][] = [];
  const deps: RuntimeDeps = {
    ...base,
    proc: { ...base.proc, cwd: () => root, env: {}, versions: { node: "24.21.0" } },
    io: { ...base.io, stdout: { write: (s) => { output.push(s); }, isTTY: false }, stderr: { write: (s) => { errors.push(s); }, isTTY: false } },
    child: { ...base.child, run: async (command, args) => {
      calls.push([command, ...args]);
      if (command === "opencode") throw Object.assign(new Error("missing"), { code: "ENOENT" });
      return { status: 0, signal: null, stdout: "", stderr: "" };
    } },
  };
  return { deps, output, errors, calls };
}
function checks(output: string[]): Check[] { return JSON.parse(output.join("")).results as Check[]; }

test("runtime boundary rejects production imports with file, line and dependency guidance", async (t) => {
  const root = fixture(t);
  write(root, "ai-framework/scripts/planted.mts", '// production fixture\nimport fs from "node:fs";\n');
  const capture = injected(root);
  assert.equal(await main(["--json"], capture.deps), 1);
  const boundary = checks(capture.output).filter((item) => item.name === "Runtime boundary");
  assert.ok(boundary.some((item) => item.status === "fail" && item.detail.includes("ai-framework/scripts/planted.mts:2 imports node:fs; use deps.fs")));
});

test("runtime boundary summarizes test imports without failing or printing individual lines", async (t) => {
  const root = fixture(t);
  for (let i = 0; i < 7; i++) write(root, `ai-framework/scripts/planted-${i}.test.mts`, 'import fs from "node:fs";\nimport path from "node:path";\n');
  const capture = injected(root);
  await main(["--json"], capture.deps);
  const boundary = checks(capture.output).filter((item) => item.name === "Runtime boundary");
  assert.equal(boundary.some((item) => item.status === "fail"), false);
  const warnings = boundary.filter((item) => item.status === "warn");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].detail, /tests: 7 files, 14 violations; top modules: node:fs \(7\), node:path \(7\)/);
  assert.match(warnings[0].detail, /planted-4\.test\.mts/);
  assert.doesNotMatch(warnings[0].detail, /planted-[56]|\.mts:\d|\n/);
});

test("runtime boundary passes clean sources and skips adapters and excluded directories", async (t) => {
  const root = fixture(t);
  write(root, "ai-framework/scripts/clean.mts", "export const value = 1;\n");
  write(root, "ai-framework/scripts/runtime/node.mts", 'import "node:fs";\n');
  for (const dir of ["node_modules", ".git", "scratchpad"]) write(root, `ai-framework/${dir}/ignored.ts`, 'import "node:fs";\n');
  write(root, "outside/unsafe.ts", 'import "node:fs";\n');
  const capture = injected(root);
  await main(["--json"], capture.deps);
  const boundary = checks(capture.output).filter((item) => item.name === "Runtime boundary");
  assert.ok(boundary.some((item) => item.status === "pass" && item.detail === "production: 0 violations, 0 unparsed"));
  assert.equal(boundary.some((item) => item.status === "fail" || item.detail.startsWith("tests:")), false);
});

for (const [label, before, after, guard] of [
  ["bidi sanitizer", String.raw`\u200e\u200f\u202a-\u202e\u2066-\u2069`, '', "S5 strips bidi and controls"],
  ["planted-unparsed invariant", 'item.kind !== "global" && item.kind !== "dynamic-computed"', 'item.kind !== "global" && item.kind !== "dynamic-computed" && item.kind !== "unparsed"', "S6 invariant retains planted unparsed production"],
  ["depth cap", 'if (depth > 64)', 'if (false)', "runtime boundary enforces depth cap"],
  ["visited cap", '10000', '100000', "runtime boundary enforces visited cap"],
  ["directory symlink", 'if (stat.isSymbolicLink())', 'if (false)', "runtime boundary refuses directory symlinks"],
  ["child symlink", 'if (child.isSymbolicLink())', 'if (false)', "runtime boundary refuses child symlinks"],
  ["extension filter", String.raw`child.isFile() && /\.(ts|mts)$/.test(file)`, 'child.isFile()', "runtime boundary filters source extensions"],

  ["production failure", 'record(production.length || unparsedProduction.length ? "fail" : "pass", "Runtime boundary"', 'record("pass", "Runtime boundary"', "runtime boundary rejects production imports"],
  ["test warning", 'record("warn", "Runtime boundary", `tests:', 'record("fail", "Runtime boundary", `tests:', "runtime boundary summarizes test imports"],
  ["production invariant", "", "", "uses injected dependencies outside runtime adapters"],
]) {
  test(`scratch mutant proves ${label} guard`, () => {
    const deps = createTestDeps();
    const project = deps.path.resolve(decodeURIComponent(new URL("../..", import.meta.url).pathname));
    const scratch = deps.fs.realpathSync(deps.fs.mkdtempSync(deps.path.join(deps.os.tmpdir(), "runtime-boundary-mutant-")));
    try {
      const copied = new Set<string>();
      const copy = (source: string): void => {
        if (copied.has(source)) return;
        copied.add(source);
        const text = deps.fs.readFileSync(source);
        const destination = deps.path.join(scratch, deps.path.relative(project, source));
        assert.ok(!deps.path.relative(scratch, destination).startsWith(".."));
        deps.fs.mkdirSync(deps.path.dirname(destination), { recursive: true });
        deps.fs.writeFileSync(destination, text);
        if (source.endsWith(".json")) return;
        for (const match of text.matchAll(/(?:^import[^\n]*?from\s*|import\(\s*)["'](\.\.?\/[^"']+\.(?:mts|json))["']/gm)) copy(deps.path.resolve(deps.path.dirname(source), match[1]));
      };
      const testFile = ["production invariant", "planted-unparsed invariant"].includes(label) ? "ai-framework/scripts/runtime/invariants.test.mts" : "ai-framework/scripts/workflow-doctor.test.mts";
      copy(deps.path.join(project, testFile));
      if (before) {
        const target = deps.path.join(scratch, label === "planted-unparsed invariant" ? testFile : "ai-framework/scripts/workflow-doctor.mts");
        const source = deps.fs.readFileSync(target);
        assert.equal(source.split(before).length - 1, label === "visited cap" ? 2 : 1);
        deps.fs.writeFileSync(target, label === "visited cap" ? source.split(before).join(after) : source.replace(before, after));
      } else {
        // The mutant exists only in memory until written into this scratch copy.
        const mutant = 'export { readFile } from "node:fs";\n';
        deps.fs.writeFileSync(deps.path.join(scratch, "ai-framework/scripts/planted.mts"), mutant);
      }
      const env = { ...deps.proc.env }; delete env.NODE_TEST_CONTEXT;
      const result = deps.child.runSync("node", ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", "--test", "--test-name-pattern", `^${guard}`, deps.path.join(scratch, testFile)], { cwd: scratch, env, timeoutMs: 20000 });
      assert.equal(result.status, 1, `${label}: ${result.stdout}\n${result.stderr}`);
      assert.match(result.stdout, /AssertionError|ERR_ASSERTION/);
      if (label === "production invariant") assert.match(result.stdout, /production sources import node:\* outside runtime adapters or remain unparsed/);
      assert.ok(result.stdout.includes(guard));
    } finally { deps.fs.rmSync(scratch, { recursive: true, force: true }); }
  });
}

test("main keeps invocation results isolated and sends failures to the injected output", async (t) => {
  const root = fixture(t), capture = injected(root);
  assert.equal(await main(["--json"], capture.deps), 1);
  const first = checks(capture.output);
  assert.ok(first.some((item) => item.name === "AGENTS.md" && item.status === "fail"));
  assert.deepEqual(capture.errors, []);
  capture.output.length = 0;
  assert.equal(await main(["--json"], capture.deps), 1);
  assert.deepEqual(checks(capture.output).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b))), first.sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
});

test("doctor rejects a missing direct source and checks a present typed source with the parser flag", async (t) => {
  const root = fixture(t);
  let capture = injected(root);
  await main(["--json"], capture.deps);
  assert.ok(checks(capture.output).some((item) => item.name === "ai-framework/scripts/bundle-sync.mts" && item.status === "fail"));
  assert.equal(capture.calls.some((call) => call.at(-1)?.endsWith("bundle-sync.mts")), false);
  write(root, "ai-framework/scripts/bundle-sync.mts", 'export const value: number = 1;\n');
  capture = injected(root);
  await main(["--json"], capture.deps);
  assert.ok(capture.calls.some((call) => call.includes("--experimental-strip-types") && call.at(-1)?.endsWith("bundle-sync.mts")));
  assert.ok(checks(capture.output).some((item) => item.name === "ai-framework/scripts/bundle-sync.mts" && item.status === "pass" && item.detail.includes("syntax")));
});

test("doctor reports invalid TypeScript from the real Node parser", async (t) => {
  const root = fixture(t);
  write(root, "ai-framework/scripts/bundle-sync.mts", "export const invalid: number = ;\n");
  const capture = injected(root);
  const base = createNodeDeps();
  capture.deps.child.run = async (command, args, options) => {
    if (args.at(-1)?.endsWith("bundle-sync.mts")) return base.child.run("node", args, { ...options, env: { PATH: process.env.PATH } });
    return { status: 0, signal: null, stdout: "", stderr: "" };
  };
  await main(["--json"], capture.deps);
  assert.ok(checks(capture.output).some((item) => item.name === "ai-framework/scripts/bundle-sync.mts" && item.status === "fail" && /SyntaxError|Unexpected token|invalid Node.js syntax/.test(item.detail)), JSON.stringify(checks(capture.output).filter((item) => item.name.endsWith("bundle-sync.mts"))));
});

test("doctor checks TypeScript syntax with Bun instead of skipping it", { skip: !process.versions.bun }, async (t) => {
  const root = fixture(t);
  write(root, "ai-framework/scripts/bundle-sync.mts", "export const invalid: number = ;\n");
  const capture = injected(root);
  capture.deps.runtime = "bun";
  capture.deps.proc.versions = { bun: process.versions.bun! };
  capture.deps.proc.env = { PATH: process.env.PATH, AI_WORKFLOW_RUNNER: "bun" };
  const base = createNodeDeps();
  capture.deps.child.run = async (command, args, options) => {
    if (args.includes(path.join(root, "ai-framework/scripts/bundle-sync.mts"))) return base.child.run(command, args, options);
    return { status: 0, signal: null, stdout: "", stderr: "" };
  };
  await main(["--json"], capture.deps);
  assert.ok(checks(capture.output).some((item) => item.name === "ai-framework/scripts/bundle-sync.mts" && item.status === "fail" && /Unexpected|Expected|error/i.test(item.detail)));
});

test("doctor reports what ai_workflow_env.json would set and flags a file that would be ignored", async (t) => {
  const root = fixture(t);
  const cases: Array<[string | null, string, RegExp]> = [
    [null, "info", /absent; defaults: runner node, Orca off/],
    [JSON.stringify({ AI_WORKFLOW_RUNNER: "bun", AI_WORKFLOW_ORCA_MULTI_AGENT: true }), "pass", /runner bun; Orca on/],
    [JSON.stringify({ AI_WORKFLOW_RUNNER: "bun", OPENAI_API_KEY: "x" }), "warn", /ignored keys: OPENAI_API_KEY/],
    [JSON.stringify({ AI_WORKFLOW_RUNNER: "deno" }), "fail", /must be "node" or "bun"/],
    [JSON.stringify({ AI_WORKFLOW_ORCA_MULTI_AGENT: 1 }), "fail", /must be a string or boolean/],
    ["not json", "fail", /not valid JSON/],
  ];
  for (const [body, status, detail] of cases) {
    fs.rmSync(path.join(root, "ai_workflow_env.json"), { force: true });
    if (body !== null) write(root, "ai_workflow_env.json", body);
    // A secret-bearing .env must never change the result.
    write(root, ".env", "AI_WORKFLOW_RUNNER=bun\nAI_WORKFLOW_ORCA_MULTI_AGENT=true\n");
    const capture = injected(root);
    await main(["--json"], capture.deps);
    const item = checks(capture.output).find((entry) => entry.name === "Workflow settings");
    assert.ok(item, String(body));
    assert.deepEqual([item.status, detail.test(item.detail)], [status, true], `${body}: ${item.detail}`);
  }
});

test("fix restores missing scaffold files while retaining existing instance data", async (t) => {
  const root = fixture(t);
  write(root, "ai-framework/templates/project/context/product.md", "template\n");
  write(root, "ai-framework/templates/project/rules/README.md", "new rules\n");
  write(root, ".project/context/product.md", "instance owned\n");
  const capture = injected(root);
  await main(["--json", "--fix"], capture.deps);
  assert.equal(fs.readFileSync(path.join(root,".project/context/product.md"),"utf8"), "instance owned\n");
  assert.equal(fs.readFileSync(path.join(root,".project/rules/README.md"),"utf8"), "new rules\n");
  assert.ok(checks(capture.output).some((item) => item.status === "fixed"));
});

test("fix refuses a scaffold repair through a symbolic-link ancestor", async (t) => {
  const root = fixture(t);
  write(root, "ai-framework/templates/project/rules/README.md", "new rules\n");
  fs.mkdirSync(path.join(root,".project"));
  fs.mkdirSync(path.join(root,"outside"));
  fs.symlinkSync(path.join(root,"outside"),path.join(root,".project/rules"));
  const capture = injected(root);
  await main(["--json", "--fix"], capture.deps);
  assert.equal(fs.existsSync(path.join(root,"outside/README.md")),false);
  assert.ok(checks(capture.output).some((item) => item.status === "fail" && /symbolic links/.test(item.detail)));
});

test("runtime boundary fails unparsed production but warns for unparsed tests", async (t) => {
  const root = fixture(t);
  write(root, "ai-framework/scripts/broken.mts", "'unfinished");
  write(root, "ai-framework/scripts/broken.test.mts", "'unfinished");
  const capture = injected(root);
  await main(["--json"], capture.deps);
  const boundary = checks(capture.output).filter(item => item.name === "Runtime boundary");
  assert.ok(boundary.some(item => item.status === "fail" && /production: 0 violations, 1 unparsed/.test(item.detail) && /broken.mts:1 Source could not/.test(item.detail)));
  fs.rmSync(path.join(root, "ai-framework/scripts/broken.mts"));
  const tests = injected(root);
  await main(["--json"], tests.deps);
  const testBoundary = checks(tests.output).filter(item => item.name === "Runtime boundary");
  assert.equal(testBoundary.some(item => item.status === "fail"), false);
  assert.ok(testBoundary.some(item => item.status === "warn" && /1 unparsed sources/.test(item.detail)));
});
test("runtime boundary anchors test classification", async (t) => {
  const root = fixture(t);
  write(root, "ai-framework/a.test.dir/source.mts", "import 'node:fs';");
  write(root, "ai-framework/a.test.helper.mts", "import 'node:fs';");
  const capture = injected(root);
  await main(["--json"], capture.deps);
  assert.ok(checks(capture.output).some(item => item.name === "Runtime boundary" && item.status === "fail" && /production: 2 violations/.test(item.detail)));
});
test("runtime boundary sanitizes printed control characters", async (t) => {
  const root = fixture(t);
  write(root, "ai-framework/forged\n\x1b[32mPASS.mts", "import 'node:fs';");
  const capture = injected(root);
  await main(["--json"], capture.deps);
  const detail = checks(capture.output).filter(item => item.name === "Runtime boundary").map(item => item.detail).join("");
  assert.doesNotMatch(detail, /[\x00-\x1f\x7f-\x9f]/);
  assert.match(detail, /forged\[32mPASS/);
});
test("runtime boundary enforces depth cap", async (t) => {
  const root = fixture(t);
  const nested = "ai-framework/" + Array(66).fill("d").join("/");
  write(root, nested + "/unsafe.mts", "import 'node:fs';");
  const capture = injected(root);
  await main(["--json"], capture.deps);
  const boundary = checks(capture.output).filter(item => item.name === "Runtime boundary");
  assert.ok(boundary.some(item => item.status === "fail" && /1 unparsed/.test(item.detail) && /:1 depth cap exceeded/.test(item.detail)));
  assert.ok(boundary.every(item => !/imports node:fs/.test(item.detail)), "must refuse rather than traverse the capped tree");
});
test("runtime boundary enforces visited cap", async (t) => {
  const root = fixture(t), capture = injected(root);
  const readdir = capture.deps.fs.readdirEntriesSync;
  const stat = capture.deps.fs.lstatSync;
  const dummy = stat(path.join(root, "ai-framework"));
  capture.deps.fs.readdirEntriesSync = file => file === path.join(root, "ai-framework")
    ? Array.from({ length: 10001 }, (_, i) => ({ name: `entry-${i}.txt`, isDirectory: () => false, isFile: () => true, isSymbolicLink: () => false }))
    : readdir(file);
  capture.deps.fs.lstatSync = file => /entry-\d+\.txt$/.test(file)
    ? { ...dummy, isDirectory: () => false, isFile: () => true, isSymbolicLink: () => false } : stat(file);
  await main(["--json"], capture.deps);
  assert.ok(checks(capture.output).some(item => item.name === "Runtime boundary" && item.status === "fail" && /ai-framework:1 visited entry cap exceeded/.test(item.detail)));
});
test("runtime boundary refuses directory symlinks", async (t) => {
  const root = fixture(t);
  write(root, "outside/hidden.mts", "import 'node:fs';");
  fs.symlinkSync(path.join(root, "outside"), path.join(root, ".opencode"));
  const capture = injected(root);
  await main(["--json"], capture.deps);
  assert.ok(checks(capture.output).some(item => item.name === "Runtime boundary" && item.status === "fail" && /\.opencode:1 directory symlink refused/.test(item.detail)));
});
test("runtime boundary refuses child symlinks", async (t) => {
  const root = fixture(t);
  write(root, "outside/hidden.mts", "export const ok = 1;");
  fs.symlinkSync(path.join(root, "outside/hidden.mts"), path.join(root, "ai-framework/link.mts"));
  const capture = injected(root);
  await main(["--json"], capture.deps);
  assert.ok(checks(capture.output).some(item => item.name === "Runtime boundary" && item.status === "fail" && /link.mts:1 child symlink refused/.test(item.detail)));
});
test("runtime boundary filters source extensions", async (t) => {
  const root = fixture(t);
  for (const name of ["ignored.js", "ignored.txt", "ignored.mts.bak"]) write(root, "ai-framework/" + name, "import 'node:fs';");
  write(root, "ai-framework/clean.ts", "export const ok = 1;");
  const capture = injected(root);
  await main(["--json"], capture.deps);
  assert.ok(checks(capture.output).some(item => item.name === "Runtime boundary" && item.status === "pass" && item.detail === "production: 0 violations, 0 unparsed"));
});
test("runtime boundary fails unreadable production paths", async (t) => {
  const root = fixture(t), capture = injected(root);
  const read = capture.deps.fs.readdirEntriesSync;
  capture.deps.fs.readdirEntriesSync = file => { if (file === path.join(root, "ai-framework")) throw new Error("denied"); return read(file); };
  await main(["--json"], capture.deps);
  assert.ok(checks(capture.output).some(item => item.name === "Runtime boundary" && item.status === "fail" && /ai-framework:1 unreadable path/.test(item.detail)));
});

test("S5 strips bidi and controls in JSON and plain output", async (t) => {
  const root = fixture(t);
  const controls = "\u0001\u007f\u0085\u200e\u200f\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069";
  write(root, "ai-framework/forged" + controls + ".mts", "import 'node:fs';");
  for (const args of [["--json"], ["--no-color"]]) {
    const capture = injected(root);
    await main(args, capture.deps);
    const text = args.includes("--json") ? checks(capture.output).map(c => c.detail).join("") : capture.output.join("");
    assert.doesNotMatch(text, /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/);
    assert.match(text, /forged\.mts/);
  }
});
test("S7 boundary ignores non-directory scan roots", async (t) => {
  const root = fixture(t);
  write(root, ".opencode", "import 'node:fs';");
  const capture = injected(root);
  await main(["--json"], capture.deps);
  assert.ok(checks(capture.output).some(c => c.name === "Runtime boundary" && c.detail === "production: 0 violations, 0 unparsed"));
});
test("S7 exhausted cap refuses later scan roots", async (t) => {
  const root = fixture(t), capture = injected(root);
  write(root, ".opencode/hidden.mts", "import 'node:fs';");
  const readdir = capture.deps.fs.readdirEntriesSync, stat = capture.deps.fs.lstatSync;
  const dummy = stat(path.join(root, "ai-framework"));
  capture.deps.fs.readdirEntriesSync = file => file === path.join(root, "ai-framework")
    ? Array.from({ length: 10000 }, (_, i) => ({ name: "entry-" + i + ".txt", isDirectory: () => false, isFile: () => true, isSymbolicLink: () => false }))
    : readdir(file);
  capture.deps.fs.lstatSync = file => /entry-\d+\.txt$/.test(file) ? { ...dummy, isDirectory: () => false, isFile: () => true, isSymbolicLink: () => false } : stat(file);
  await main(["--json"], capture.deps);
  assert.ok(checks(capture.output).some(c => c.name === "Runtime boundary" && c.status === "fail" && /\.opencode:1 visited entry cap exceeded/.test(c.detail)));
});

test("runtime boundary counts computed imports as advisories without failure", async (t) => {
  const root = fixture(t);
  write(root, ".claude/hooks/post-edit-check.mts", "import(fileUrl(resolveMain(tsDir, deps))); import(variable); const loader = require; process.env;");
  const capture = injected(root);
  await main(["--json"], capture.deps);
  const boundary = checks(capture.output).filter(item => item.name === "Runtime boundary");
  assert.ok(boundary.some(item => item.status === "pass" && item.detail === "production: 0 violations, 0 unparsed"));
  assert.equal(boundary.some(item => item.status === "fail" || item.status === "warn"), false);
  assert.ok(boundary.some(item => item.status === "info" && /3 computed imports/.test(item.detail) && /1 process globals/.test(item.detail)));
});

function codexHooks(userPromptCommand?: string, userTimeout?: number): string {
  const subagentStop = [
    {
      matcher: "*",
      hooks: [
        {
          type: "command",
          command: `node --experimental-strip-types --disable-warning=ExperimentalWarning "$(git rev-parse --show-toplevel)/ai-framework/hooks/scripts/token-consumption.mts" --vendor codex --event subagent-complete --root "$(git rev-parse --show-toplevel)"`,
          timeout: 5
        }
      ]
    }
  ];
  const userPrompt = userPromptCommand === undefined
    ? []
    : [
        {
          description: "Gates Codex workflow phase prompts on Orca coordinator readiness.",
          hooks: [
            {
              type: "command",
              command: userPromptCommand,
              timeout: userTimeout ?? 8
            }
          ]
        }
      ];
  return JSON.stringify({
    description: "Records bounded token-consumption snapshots after Codex subagents and gates Codex workflow phases on Orca readiness.",
    hooks: { SubagentStop: subagentStop, UserPromptSubmit: userPrompt }
  }, null, 2);
}

test("doctor passes a valid Codex UserPromptSubmit startup registration", async (t) => {
  const root = fixture(t);
  write(root, ".codex/hooks.json", codexHooks(`AI_WORKFLOW_RUNNER=node node --experimental-strip-types --disable-warning=ExperimentalWarning "$(git rev-parse --show-toplevel)/ai-framework/hooks/scripts/orca-start-codex-hook.mts" --root "$(git rev-parse --show-toplevel)"`));
  write(root, "ai-framework/hooks/scripts/orca-start-codex-hook.mts", "export const value = 1;\n");
  const capture = injected(root);
  await main(["--json"], capture.deps);
  const results = checks(capture.output);
  assert.ok(results.some((item) => item.name === "Codex startup wiring" && item.status === "pass" && item.detail.includes("Node runner")));
  assert.ok(results.some((item) => item.name === ".codex/hooks.json" && item.status === "pass" && item.detail.includes("post-agent consumption collector")));
  assert.ok(results.some((item) => item.name === "ai-framework/hooks/scripts/orca-start-codex-hook.mts" && item.status === "pass"));
});

test("doctor fails a missing Codex startup registration", async (t) => {
  const root = fixture(t);
  write(root, "ai-framework/hooks/scripts/orca-start-codex-hook.mts", "export const value = 1;\n");
  const capture = injected(root);
  await main(["--json"], capture.deps);
  assert.ok(checks(capture.output).some((item) => item.name === "Codex startup wiring" && item.status === "fail" && /missing/.test(item.detail)));
});

test("doctor fails a Codex startup hook registered under the wrong event", async (t) => {
  const root = fixture(t);
  const payload = {
    description: "Records bounded token-consumption snapshots after Codex subagents and gates Codex workflow phases on Orca readiness.",
    hooks: {
      SubagentStop: [
        {
          description: "Gates Codex workflow phase prompts on Orca coordinator readiness.",
          hooks: [
            {
              type: "command",
              command: `AI_WORKFLOW_RUNNER=node node --experimental-strip-types --disable-warning=ExperimentalWarning "$(git rev-parse --show-toplevel)/ai-framework/hooks/scripts/orca-start-codex-hook.mts" --root "$(git rev-parse --show-toplevel)"`,
              timeout: 8
            }
          ]
        }
      ],
      UserPromptSubmit: [
        {
          matcher: "*",
          hooks: [
            {
              type: "command",
              command: `node --experimental-strip-types --disable-warning=ExperimentalWarning "$(git rev-parse --show-toplevel)/ai-framework/hooks/scripts/token-consumption.mts" --vendor codex --event subagent-complete --root "$(git rev-parse --show-toplevel)"`,
              timeout: 5
            }
          ]
        }
      ]
    }
  };
  write(root, ".codex/hooks.json", JSON.stringify(payload, null, 2));
  write(root, "ai-framework/hooks/scripts/orca-start-codex-hook.mts", "export const value = 1;\n");
  const capture = injected(root);
  await main(["--json"], capture.deps);
  assert.ok(checks(capture.output).some((item) => item.name === "Codex startup wiring" && item.status === "fail" && /does not reference ai-framework\/hooks\/scripts\/orca-start-codex-hook\.mts/.test(item.detail)));
});

test("doctor fails a Codex startup registration missing the Node runner prefix", async (t) => {
  const root = fixture(t);
  write(root, ".codex/hooks.json", codexHooks(`node --experimental-strip-types --disable-warning=ExperimentalWarning "$(git rev-parse --show-toplevel)/ai-framework/hooks/scripts/orca-start-codex-hook.mts" --root "$(git rev-parse --show-toplevel)"`));
  write(root, "ai-framework/hooks/scripts/orca-start-codex-hook.mts", "export const value = 1;\n");
  const capture = injected(root);
  await main(["--json"], capture.deps);
  assert.ok(checks(capture.output).some((item) => item.name === "Codex startup wiring" && item.status === "fail" && /missing AI_WORKFLOW_RUNNER=node prefix/.test(item.detail)));
});


test("doctor rejects malformed Codex startup wiring fields", async (t) => {
  const command = 'workflow_root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 2; AI_WORKFLOW_RUNNER=node node --experimental-strip-types --disable-warning=ExperimentalWarning "$workflow_root/ai-framework/hooks/scripts/orca-start-codex-hook.mts" --root "$workflow_root"';
  const cases = [
    { label: "missing flags", command: command.replace("--experimental-strip-types ", ""), reason: /Node compatibility flags/ },
    { label: "missing root", command: command.replace(' --root "$workflow_root"', ''), reason: /trusted --root/ },
    { label: "conflicting root", command: command.replace(' --root "$workflow_root"', ' --root "/untrusted"'), reason: /trusted --root/ },
    { label: "unbound root", command: command.replace("workflow_root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 2; ", ""), reason: /trusted --root/ },
    { label: "wrong timeout", command, timeout: 5, reason: /timeout is not 8/ },
    { label: "wrong handler type", command, type: "prompt", reason: /not a command hook/ },
  ];
  for (const item of cases) {
    const root = fixture(t);
    const payload = JSON.parse(codexHooks(item.command, item.timeout));
    if (item.type) payload.hooks.UserPromptSubmit[0].hooks[0].type = item.type;
    write(root, ".codex/hooks.json", JSON.stringify(payload));
    const capture = injected(root);
    await main(["--json"], capture.deps);
    assert.ok(checks(capture.output).some(result => result.name === "Codex startup wiring" && result.status === "fail" && item.reason.test(result.detail)), item.label);
  }
});

test("doctor rejects malformed Codex startup JSON and objects", async (t) => {
  for (const content of ["{", "null", "{}", '{"hooks":null}', '{"hooks":{"UserPromptSubmit":[]}}']) {
    const root = fixture(t);
    write(root, ".codex/hooks.json", content);
    const capture = injected(root);
    await main(["--json"], capture.deps);
    assert.ok(checks(capture.output).some(result => result.name === "Codex startup wiring" && result.status === "fail"));
  }
});

test("doctor rejects shell text that mentions the adapter without running it", async (t) => {
  const invocation = 'AI_WORKFLOW_RUNNER=node node --experimental-strip-types --disable-warning=ExperimentalWarning "$(git rev-parse --show-toplevel)/ai-framework/hooks/scripts/orca-start-codex-hook.mts" --root "$(git rev-parse --show-toplevel)"';
  for (const command of [`echo '${invocation}'`, `# ${invocation}`, `${invocation}; echo done`, `true; # ${invocation}`]) {
    const root = fixture(t);
    write(root, ".codex/hooks.json", codexHooks(command));
    const capture = injected(root);
    await main(["--json"], capture.deps);
    assert.ok(checks(capture.output).some(result => result.name === "Codex startup wiring" && result.status === "fail" && /does not execute/.test(result.detail)), command);
  }
});

test("doctor passes the installed guarded Codex registration", async (t) => {
  const root = fixture(t);
  write(root, ".codex/hooks.json", fs.readFileSync(path.resolve(import.meta.dirname, "../../.codex/hooks.json"), "utf8"));
  const capture = injected(root);
  await main(["--json"], capture.deps);
  assert.ok(checks(capture.output).some(result => result.name === "Codex startup wiring" && result.status === "pass"));
});
