import assert from "node:assert/strict";
import test from "node:test";

import { createNodeDeps } from "./runtime/node.mts";
import { createTestDeps, urlPath } from "./runtime/test-helpers.mts";
import { main } from "./workflow-doctor.mts";
import { hookBlock } from "./graphify.mts";
import { toonFixtureText } from "./runtime/test-helpers.mts";

import type { RuntimeDeps } from "./runtime/types.mts";
import type { TestContext } from "node:test";
const testDeps = createTestDeps();
const fs = testDeps.fs;
const os = testDeps.os;
const path = testDeps.path;

interface Check { status: string; name: string; detail: string }

test("doctor reports legacy consolidation records as information without migrating them", async (t) => {
  const root = fixture(t);
  const entry = "# Local\n\n## alpha — shipped 2026-10-01\n\nLegacy.\n";
  const ledger = JSON.stringify({ schemaVersion: 1, slug: "alpha", sections: [{ source: "log.md#one", status: "extracted", destination: ".project/knowledge/a.md" }] });
  write(root, ".project/done-work.md", entry);
  write(root, ".project/compaction/ledgers/alpha.json", ledger);
  write(root, ".project/knowledge/decisions/a.md", "---\nid: a\ntype: decision\n---\n# A\n");
  const capture = injected(root);
  await main(["--json"], capture.deps);
  const report = checks(capture.output).filter(item => item.name === "Consolidation legacy records");
  assert.equal(report.length, 1);
  assert.equal(report[0].status, "info");
  assert.match(report[0].detail, /1 legacy compacted pitch\(es\): 1 v1 ledgers, 1 legacy entries, 1 status-less decisions/);
  assert.match(report[0].detail, /node ai-framework\/scripts\/consolidation-migrate\.mts/);
  assert.equal(fs.readFileSync(path.join(root, ".project/done-work.md")), entry);
  assert.equal(fs.readFileSync(path.join(root, ".project/compaction/ledgers/alpha.json")), ledger);
  assert.equal(fs.existsSync(path.join(root, ".project/records")), false);
  assert.ok(!capture.calls.some(call => call.some(arg => arg.includes("consolidation-migrate.mts"))), "doctor never executes a target migration script");
});

test("doctor warns when legacy inventory is refused without claiming an empty count", async (t) => {
  const root = fixture(t);
  write(root, ".project/compaction/ledgers/future.json", '{"schemaVersion":99}');
  const capture = injected(root);
  await main(["--json"], capture.deps);
  const report = checks(capture.output).find(item => item.name === "Consolidation legacy records");
  assert.equal(report?.status, "warn");
  assert.match(report?.detail ?? "", /inventory refused; no legacy count claimed/);
  assert.doesNotMatch(report?.detail ?? "", /0 legacy compacted/);
});
function fixture(t: TestContext): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-doctor-injection-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "ai-framework/templates/project"), { recursive: true });
  write(root, ".gitignore", ".project/metrics/\n.project/evals/runs/\n.project/evals/.cache/\n");
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
/** Supply names NTFS cannot create while exercising the real scanner, descriptor reader, and sanitizer. */
function injectBoundaryFile(deps: RuntimeDeps, root: string, name: string, content: string, symbolicLink = false): { reads: () => number } {
  const directory = path.join(root, "ai-framework"), file = path.join(directory, name);
  const backing = path.join(root, "outside", "virtual-source.mts");
  write(root, "outside/virtual-source.mts", content);
  const readdir = deps.fs.readdirEntriesSync, lstat = deps.fs.lstatSync;
  const open = deps.fs.openSync, read = deps.fs.readSync, close = deps.fs.closeSync, exists = deps.fs.existsSync;
  const base = lstat(backing), descriptors = new Set<number>();
  let reads = 0;
  const flags = { isDirectory: () => false, isFile: () => !symbolicLink, isSymbolicLink: () => symbolicLink };
  deps.fs.readdirEntriesSync = dir => dir === directory
    ? [...readdir(dir), { name, ...flags }] : readdir(dir);
  deps.fs.lstatSync = candidate => candidate === file ? { ...base, ...flags } : lstat(candidate);
  deps.fs.existsSync = candidate => candidate === file || exists(candidate);
  deps.fs.openSync = (candidate, openFlags, mode) => {
    const fd = open(candidate === file ? backing : candidate, openFlags, mode);
    if (candidate === file) descriptors.add(fd);
    return fd;
  };
  deps.fs.readSync = (fd, buffer, offset, length, position) => {
    if (descriptors.has(fd)) reads++;
    return read(fd, buffer, offset, length, position);
  };
  deps.fs.closeSync = fd => { descriptors.delete(fd); close(fd); };
  return { reads: () => reads };
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
    const project = urlPath(new URL("../..", import.meta.url));
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
    [null, "info", /absent; defaults: runner node, Orca off \(copy ai-framework\/templates\/ai-workflow\.example\.toon/],
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

test("doctor Workflow settings: a present ai-workflow.toon governs (TOON values, no legacy advice); a refused one fails", async (t) => {
  const root = fixture(t);
  write(root, "ai_workflow_env.json", JSON.stringify({ AI_WORKFLOW_RUNNER: "bun" })); // must not be consulted
  write(root, "ai-workflow.toon", toonFixtureText());
  let capture = injected(root);
  await main(["--json"], capture.deps);
  let item = checks(capture.output).find((entry) => entry.name === "Workflow settings");
  assert.deepEqual([item?.status, /governed by ai-workflow\.toon: runner node; Orca off/.test(item?.detail ?? "")], ["pass", true], item?.detail);
  write(root, "ai-workflow.toon", toonFixtureText().replace("runner: node", "runner: bun"));
  capture = injected(root);
  await main(["--json"], capture.deps);
  item = checks(capture.output).find((entry) => entry.name === "Workflow settings");
  assert.match(item?.detail ?? "", /runner bun/);
  fs.rmSync(path.join(root, "ai-workflow.toon"));
  fs.symlinkSync(path.join(root, "nowhere"), path.join(root, "ai-workflow.toon"));
  capture = injected(root);
  await main(["--json"], capture.deps);
  item = checks(capture.output).find((entry) => entry.name === "Workflow settings");
  assert.equal(item?.status, "fail");
  assert.doesNotMatch(item?.detail ?? "", /ai_workflow_env\.example\.json/);
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
  fs.symlinkSync(path.join(root,"outside"),path.join(root,".project/rules"), process.platform === "win32" ? "junction" : "dir");
  const capture = injected(root);
  await main(["--json", "--fix"], capture.deps);
  assert.equal(fs.existsSync(path.join(root,"outside/README.md")),false);
  assert.ok(checks(capture.output).some((item) => item.status === "fail" && /symbolic links/.test(item.detail)));
});

test("doctor flags a .gitignore that misses eval runs or cache", async (t) => {
  const root = fixture(t);
  write(root, ".gitignore", ".project/metrics/\n");
  const capture = injected(root);
  await main(["--json"], capture.deps);
  const item = checks(capture.output).find((entry) => entry.name === ".gitignore (eval data)");
  assert.equal(item?.status, "fail");
  assert.match(item?.detail ?? "", /\.project\/evals\/runs\//);
  assert.match(item?.detail ?? "", /\.project\/evals\/\.cache\//);
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
  const capture = injected(root);
  const source = injectBoundaryFile(capture.deps, root, "forged\n\x1b[32mPASS.mts", "import 'node:fs';");
  await main(["--json"], capture.deps);
  const detail = checks(capture.output).filter(item => item.name === "Runtime boundary").map(item => item.detail).join("");
  assert.doesNotMatch(detail, /[\x00-\x1f\x7f-\x9f]/);
  assert.match(detail, /forged\[32mPASS/);
  assert.match(detail, /imports node:fs; use deps\.fs/);
  assert.ok(source.reads() > 0, "the scanner must inspect the virtual source");
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
  fs.symlinkSync(path.join(root, "outside"), path.join(root, ".opencode"), process.platform === "win32" ? "junction" : "dir");
  const capture = injected(root);
  await main(["--json"], capture.deps);
  assert.ok(checks(capture.output).some(item => item.name === "Runtime boundary" && item.status === "fail" && /\.opencode:1 directory symlink refused/.test(item.detail)));
});
test("runtime boundary refuses child symlinks", async (t) => {
  const root = fixture(t);
  write(root, "outside/hidden.mts", "export const ok = 1;");
  const capture = injected(root);
  // File symlinks require elevated privilege or Developer Mode on Windows.
  const source = process.platform === "win32"
    ? injectBoundaryFile(capture.deps, root, "link.mts", "export const ok = 1;", true) : undefined;
  if (!source) fs.symlinkSync(path.join(root, "outside/hidden.mts"), path.join(root, "ai-framework/link.mts"), "file");
  await main(["--json"], capture.deps);
  assert.ok(checks(capture.output).some(item => item.name === "Runtime boundary" && item.status === "fail" && /link.mts:1 child symlink refused/.test(item.detail)));
  if (source) assert.equal(source.reads(), 0, "a refused symbolic link must never be read");
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
  for (const args of [["--json"], ["--no-color"]]) {
    const capture = injected(root);
    const source = injectBoundaryFile(capture.deps, root, "forged" + controls + ".mts", "import 'node:fs';");
    await main(args, capture.deps);
    const text = args.includes("--json") ? checks(capture.output).map(c => c.detail).join("") : capture.output.join("");
    assert.doesNotMatch(text, /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/);
    assert.match(text, /forged\.mts/);
    assert.match(text, /imports node:fs; use deps\.fs/);
    assert.ok(source.reads() > 0, "the scanner must inspect the virtual source");
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

test("project-owned model routing accepts a project's own routes and bundled routing stays the default", async (t) => {
  const root = fixture(t);
  write(root, ".claude/agents/probe.md", "---\nname: probe\nmodel: claude-sonnet-5-5\nprofile: standard\n---\n**Caveman mode:** x\nSub-agent dispatch: y\n");
  write(root, ".opencode/agents/probe.md", "---\nmodel: openai/gpt-5.6-terra\n---\nLoad .claude/agents/probe.md\n");
  write(root, ".codex/agents/probe.toml", 'name = "probe"\n');
  // The doctor now reads the project-root `ai-workflow.toon` `models` block. Under bundled
  // routing, a mirror whose `model:` does not match `models.opencode.standard.model` fails;
  // under `modelRouting: project` the same mirror passes (a project is allowed to ship its own
  // route) as long as the route is well-formed.
  write(root, "ai-workflow.toon", "schemaVersion: 3\nruntime:\n  runner: node\nintegrations:\n  orca:\n    engine: \">=1.4.224\"\n    enabled: false\n    multiAgent: false\n    maxConcurrentWorkers: 3\n    maxRetriesPerTask: 1\ndoctor:\n  modelRouting: bundle\nskills:\n  modes:\n    caveman: full\nmodels:\n  claude:\n    fast:\n      model: claude-haiku-5-5\n    standard:\n      model: claude-sonnet-5-5\n    deep:\n      model: claude-opus-5-5\n  opencode:\n    fast:\n      model: opencode-go/minimax-m3.1-flash-free\n    standard:\n      model: opencode-go/minimax-m3\n    deep:\n      model: opencode-go/kimi-k2.7-code\n  codex:\n    fast:\n      model: gpt-6-luna\n    standard:\n      model: gpt-6.1-sol\n    deep:\n      model: gpt-6-astra\n");
  const run = async (): Promise<Check[]> => {
    const capture = injected(root);
    await main(["--json"], capture.deps);
    return checks(capture.output);
  };
  const route = (items: Check[]): Check | undefined => items.find((item) => item.name === ".opencode/agents/probe.md" && /model/.test(item.detail));
  const codex = (items: Check[]): Check | undefined => items.find((item) => item.name === ".codex/agents/probe.toml" && /Codex model/.test(item.detail));

  const toonText = fs.readFileSync(path.join(root, "ai-workflow.toon"));
  const routingIn = (value: string) => write(root, "ai-workflow.toon", toonText.replace("modelRouting: bundle", `modelRouting: ${value}`));
  const routing = (items: Check[]): Check | undefined => items.find((item) => item.name === "Model routing");

  let items = await run();
  assert.equal(route(items)?.status, "fail", "doctor.modelRouting: bundle enforces the bundled route");
  assert.equal(codex(items)?.status, "fail");
  assert.match(routing(items)!.detail, /bundled routes enforced \(ai-workflow\.toon doctor\.modelRouting\)/);

  // ai-workflow.toon decides: a legacy file saying "project" is ignored (and named) while the toon exists.
  write(root, ".project/workflow-doctor.json", JSON.stringify({ schemaVersion: 1, modelRouting: "project" }));
  items = await run();
  assert.equal(route(items)?.status, "fail", "the toon's bundle routing wins over the legacy file");
  assert.match(routing(items)!.detail, /legacy \.project\/workflow-doctor\.json is ignored while ai-workflow\.toon exists/);
  fs.rmSync(path.join(root, ".project/workflow-doctor.json"));

  routingIn("project");
  items = await run();
  assert.equal(route(items)?.status, "pass", "a well-formed project route is accepted");
  assert.equal(codex(items), undefined, "a missing Codex model inherits the harness configuration");
  assert.equal(routing(items)?.status, "info");
  assert.match(routing(items)!.detail, /project-owned \(ai-workflow\.toon doctor\.modelRouting\)/);

  write(root, ".opencode/agents/probe.md", "---\nmodel: not a route\n---\nLoad .claude/agents/probe.md\n");
  assert.equal(route(await run())?.status, "fail", "a malformed route still fails in project mode");
  write(root, ".opencode/agents/probe.md", "---\nmodel: openai/gpt-5.6-terra\n---\nLoad .claude/agents/probe.md\n");

  // An invalid value is a toon problem, and the bundled routes stay enforced.
  routingIn("other");
  items = await run();
  assert.equal(items.find((item) => item.name === "ai-workflow.toon (mandatory)")?.status, "fail");
  assert.match(routing(items)!.detail, /bundled routes enforced: ai-workflow\.toon has problems/);
  assert.notEqual(route(items)?.status, "pass", "an invalid toon never accepts a project route");

  // Without a toon the legacy file is the fallback, still validated.
  fs.rmSync(path.join(root, "ai-workflow.toon"));
  write(root, ".project/workflow-doctor.json", JSON.stringify({ schemaVersion: 1, modelRouting: "project" }));
  assert.match(routing(await run())!.detail, /project-owned \(legacy \.project\/workflow-doctor\.json\)/);
  for (const body of ["not json", JSON.stringify({ schemaVersion: 2, modelRouting: "project" }), JSON.stringify({ schemaVersion: 1, modelRouting: "other" })]) {
    write(root, ".project/workflow-doctor.json", body);
    assert.equal(routing(await run())?.status, "fail", body);
  }
});

test("doctor Config validators check: absent is info, valid passes, unregistered slot and invalid TOON fail", async (t) => {
  const root = fixture(t);
  const example = fs.readFileSync(urlPath(new URL("../templates/ai-workflow.example.toon", import.meta.url)), "utf8");
  const cases: Array<[string | null, string, RegExp]> = [
    [null, "info", /absent; no validator slots in use/],
    [example, "pass", /integrations\.orca \(engine >=1\.4\.224, on\) and 0 other integration\(s\) in use, all registered/],
    [example.replace("doctor:\n", "  nosuchtool:\n    a: 1\ndoctor:\n"), "fail", /unregistered validator slot\(s\): unknown integration "nosuchtool"/],
    [example.replace("    engine: \">=1.4.224\"\n", ""), "fail", /integrations\.orca\.engine is required/],
    [example.replace(">=1.4.224", ">=1.4.224 <1.6.0 || ^2.0.0"), "pass", /engine >=1\.4\.224 <1\.6\.0 \|\| \^2\.0\.0, on/],
    [example.replace(">=1.4.224", "^^1.4"), "fail", /integrations\.orca\.engine is not a valid version range: .* at position \d+/],
    [example.replace(">=1.4.224", "1.5.0-beta.1"), "fail", /prerelease and build metadata are not supported at position 5/],
    ["schemaVersion: 3\n", "fail", /problem|refused/],
  ];
  for (const [body, status, detail] of cases) {
    fs.rmSync(path.join(root, "ai-workflow.toon"), { force: true });
    if (body !== null) write(root, "ai-workflow.toon", body);
    const capture = injected(root);
    await main(["--json"], capture.deps);
    const item = checks(capture.output).find((entry) => entry.name === "Config validators");
    assert.ok(item, String(body));
    assert.deepEqual([item.status, detail.test(item.detail)], [status, true], `${status}: ${item.detail}`);
  }
});

test("doctor Config validators check mentions leftover legacy files without failing", async (t) => {
  const root = fixture(t);
  write(root, "ai_workflow_env.json", "{}");
  const capture = injected(root);
  await main(["--json"], capture.deps);
  const item = checks(capture.output).find((entry) => entry.name === "Config validators");
  assert.deepEqual([item?.status, /legacy file\(s\) still present: ai_workflow_env\.json/.test(item?.detail ?? "")], ["info", true]);
});

test("doctor syntax-checks runtime/config.mts and always lists config-migrate.mts (b1: unconditional)", async (t) => {
  const root = fixture(t);
  write(root, "ai-framework/scripts/runtime/config.mts", "export const a: number = 1;\n");
  // The parse runs for real on the host runner (Node's strip-types parse, or Bun's parser under Bun).
  const real = (capture: ReturnType<typeof injected>) => {
    const host = createTestDeps();
    capture.deps.runtime = host.runtime;
    capture.deps.proc = { ...capture.deps.proc, execPath: host.proc.execPath };
    capture.deps.child.run = async (command, args, options) => args.some((arg) => /\/(config|config-migrate)\.mts$/.test(arg)) ? host.child.run(command, args, options) : { status: 0, signal: null, stdout: "", stderr: "" };
    return capture;
  };
  let capture = real(injected(root));
  await main(["--json"], capture.deps);
  assert.ok(checks(capture.output).some((item) => item.name === "ai-framework/scripts/runtime/config.mts" && item.status === "pass"));
  assert.ok(checks(capture.output).some((item) => item.name === "ai-framework/scripts/config-migrate.mts" && item.status === "fail"), "listed even when absent, and absence fails");
  write(root, "ai-framework/scripts/config-migrate.mts", "export const a: number = ;\n");
  capture = real(injected(root));
  await main(["--json"], capture.deps);
  assert.ok(checks(capture.output).some((item) => item.name === "ai-framework/scripts/config-migrate.mts" && item.status === "fail"));
});

test("doctor: a project-root ai-workflow.toon is mandatory — fails on absence with a copy-this-file message", async (t) => {
  const root = fixture(t);
  // No toon at the root.
  const items = checks((await (async () => { const capture = injected(root); await main(["--json"], capture.deps); return capture.output; })()));
  const mandatory = items.find((item) => item.name === "ai-workflow.toon (mandatory)");
  assert.ok(mandatory, "expected a 'ai-workflow.toon (mandatory)' check to be emitted");
  assert.equal(mandatory!.status, "fail");
  assert.match(mandatory!.detail, /absent and is mandatory/);
  assert.match(mandatory!.detail, /config-migrate\.mts --apply --root \./);
  assert.match(mandatory!.detail, /copy ai-framework\/templates\/ai-workflow\.example\.toon/);
});

test("doctor: mandatory toon check passes when a valid v3 toon with full models block is present", async (t) => {
  const root = fixture(t);
  write(root, "ai-workflow.toon", "schemaVersion: 3\nruntime:\n  runner: node\nintegrations:\n  orca:\n    engine: \">=1.4.224\"\n    enabled: false\n    multiAgent: false\n    maxConcurrentWorkers: 3\n    maxRetriesPerTask: 1\ndoctor:\n  modelRouting: project\nskills:\n  modes:\n    caveman: full\nmodels:\n  claude:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n  opencode:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n  codex:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n");
  const items = checks((await (async () => { const capture = injected(root); await main(["--json"], capture.deps); return capture.output; })()));
  const mandatory = items.find((item) => item.name === "ai-workflow.toon (mandatory)");
  assert.equal(mandatory?.status, "pass", `expected pass; got ${mandatory?.status} — ${mandatory?.detail}`);
  assert.match(mandatory!.detail, /models.* block complete for 3 vendor/);
});

test("doctor: mandatory toon check fails when the models block is missing a vendor", async (t) => {
  const root = fixture(t);
  // Missing `opencode:` entirely.
  write(root, "ai-workflow.toon", "schemaVersion: 3\nruntime:\n  runner: node\nintegrations:\n  orca:\n    engine: \">=1.4.224\"\n    enabled: false\n    multiAgent: false\n    maxConcurrentWorkers: 3\n    maxRetriesPerTask: 1\ndoctor:\n  modelRouting: project\nskills:\n  modes:\n    caveman: full\nmodels:\n  claude:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n  codex:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n");
  const items = checks((await (async () => { const capture = injected(root); await main(["--json"], capture.deps); return capture.output; })()));
  const mandatory = items.find((item) => item.name === "ai-workflow.toon (mandatory)");
  assert.equal(mandatory?.status, "fail");
  assert.match(mandatory!.detail, /models\.opencode is missing or not an object/);
});

// --- checkToonMandatory mutant coverage (cycle 1 audit must-fix) ---

test("doctor: mandatory toon check fails when a vendor is missing a required profile", async (t) => {
  const root = fixture(t);
  // codex: only fast/standard, no deep.
  write(root, "ai-workflow.toon", "schemaVersion: 3\nruntime:\n  runner: node\nintegrations:\n  orca:\n    engine: \">=1.4.224\"\n    enabled: false\n    multiAgent: false\n    maxConcurrentWorkers: 3\n    maxRetriesPerTask: 1\ndoctor:\n  modelRouting: project\nskills:\n  modes:\n    caveman: full\nmodels:\n  claude:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n  opencode:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n  codex:\n    fast:\n      model: a\n    standard:\n      model: b\n");
  const items = checks((await (async () => { const capture = injected(root); await main(["--json"], capture.deps); return capture.output; })()));
  const mandatory = items.find((item) => item.name === "ai-workflow.toon (mandatory)");
  assert.equal(mandatory?.status, "fail");
  assert.match(mandatory!.detail, /models\.codex\.deep is (required|missing or has no model id)/);
});

test("doctor: mandatory toon check fails when the toon has parse problems (unknown profile)", async (t) => {
  const root = fixture(t);
  // opencode.deep: profile key "turbo" is not in the allowlist → validateModels pushes a problem.
  write(root, "ai-workflow.toon", "schemaVersion: 3\nruntime:\n  runner: node\nintegrations:\n  orca:\n    engine: \">=1.4.224\"\n    enabled: false\n    multiAgent: false\n    maxConcurrentWorkers: 3\n    maxRetriesPerTask: 1\ndoctor:\n  modelRouting: project\nskills:\n  modes:\n    caveman: full\nmodels:\n  claude:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n  opencode:\n    fast:\n      model: a\n    standard:\n      model: b\n    turbo:\n      model: d\n  codex:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n");
  const items = checks((await (async () => { const capture = injected(root); await main(["--json"], capture.deps); return capture.output; })()));
  const mandatory = items.find((item) => item.name === "ai-workflow.toon (mandatory)");
  assert.equal(mandatory?.status, "fail");
  assert.match(mandatory!.detail, /has problems/);
});

test("doctor: mandatory toon check fails loudly when the toon is refused (e.g. symlinked)", async (t) => {
  const root = fixture(t);
  // Make the toon path a symlink to a missing target so `inspectPath` refuses it.
  const real = path.join(root, "outside.json");
  fs.writeFileSync(real, "{}");
  try { fs.unlinkSync(path.join(root, "ai-workflow.toon")); } catch { /* may not exist */ }
  fs.symlinkSync(real, path.join(root, "ai-workflow.toon"));
  const items = checks((await (async () => { const capture = injected(root); await main(["--json"], capture.deps); return capture.output; })()));
  const mandatory = items.find((item) => item.name === "ai-workflow.toon (mandatory)");
  assert.equal(mandatory?.status, "fail");
  assert.match(mandatory!.detail, /present but refused/);
});

// --- extractAgentProfile mutant coverage (cycle 1 audit must-fix) ---

test("doctor: extractAgentProfile reads profile: frontmatter; legacy model: prefix is a fallback", async (t) => {
  const root = fixture(t);
  // profile: deep, no model: line → deep.
  write(root, ".claude/agents/probe.md", "---\nname: probe\nprofile: deep\n---\n**Caveman mode:** x\nSub-agent dispatch: y\n");
  // Seed a v3 toon so the mandatory check passes and the agent check runs.
  write(root, "ai-workflow.toon", "schemaVersion: 3\nruntime:\n  runner: node\nintegrations:\n  orca:\n    engine: \">=1.4.224\"\n    enabled: false\n    multiAgent: false\n    maxConcurrentWorkers: 3\n    maxRetriesPerTask: 1\ndoctor:\n  modelRouting: project\nskills:\n  modes:\n    caveman: full\nmodels:\n  claude:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n  opencode:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n  codex:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n");
  // Mirror files matching the toon.
  write(root, ".opencode/agents/probe.md", "---\nmodel: c\n---\nLoad .claude/agents/probe.md\n");
  write(root, ".codex/agents/probe.toml", "name = \"probe\"\nmodel = \"c\"\nmodel_reasoning_effort = \"high\"\n");
  const items = checks((await (async () => { const capture = injected(root); await main(["--json"], capture.deps); return capture.output; })()));
  // No "no declared capability profile" warning for probe.
  assert.equal(items.find((item) => item.name === ".claude/agents/probe.md" && /no declared capability profile/.test(item.detail)), undefined);
});

test("doctor: extractAgentProfile no longer falls back to legacy claude-* model prefix (removed in Bet 2)", async (t) => {
  const root = fixture(t);
  // model: claude-opus-5-5 (legacy) without profile: → warn (the legacy fallback is removed per
  // the pinned decision `profile-detection-lives-in-frontmatter-not-in-the-model-id`).
  write(root, ".claude/agents/probe.md", "---\nname: probe\nmodel: claude-opus-5-5\n---\n**Caveman mode:** x\nSub-agent dispatch: y\n");
  write(root, "ai-workflow.toon", "schemaVersion: 3\nruntime:\n  runner: node\nintegrations:\n  orca:\n    engine: \">=1.4.224\"\n    enabled: false\n    multiAgent: false\n    maxConcurrentWorkers: 3\n    maxRetriesPerTask: 1\ndoctor:\n  modelRouting: project\nskills:\n  modes:\n    caveman: full\nmodels:\n  claude:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n  opencode:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n  codex:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n");
  write(root, ".opencode/agents/probe.md", "---\nmodel: c\n---\nLoad .claude/agents/probe.md\n");
  write(root, ".codex/agents/probe.toml", "name = \"probe\"\nmodel = \"c\"\nmodel_reasoning_effort = \"high\"\n");
  const items = checks((await (async () => { const capture = injected(root); await main(["--json"], capture.deps); return capture.output; })()));
  const warn = items.find((item) => item.name === ".claude/agents/probe.md" && item.status === "warn");
  assert.ok(warn, "expected a warn for a canonical agent with no profile: (legacy fallback is removed)");
  assert.match(warn!.detail, /no declared capability profile/);
  // The cycle-1 patch pins the message to name the 2.28.0 fallback removal. A revert to the
  // pre-patch wording (which still includes "no declared capability profile") would keep the
  // assertion above green, so this second assertion pins the new wording.
  assert.match(warn!.detail, /legacy .* fallback was removed in 2\.28\.0/);
});

test("doctor: extractAgentProfile warns when neither profile: nor a legacy model prefix is present", async (t) => {
  const root = fixture(t);
  // No profile, no model with a known prefix → warn.
  write(root, ".claude/agents/probe.md", "---\nname: probe\ntools: [\"Read\"]\n---\n**Caveman mode:** x\nSub-agent dispatch: y\n");
  write(root, "ai-workflow.toon", "schemaVersion: 3\nruntime:\n  runner: node\nintegrations:\n  orca:\n    engine: \">=1.4.224\"\n    enabled: false\n    multiAgent: false\n    maxConcurrentWorkers: 3\n    maxRetriesPerTask: 1\ndoctor:\n  modelRouting: project\nskills:\n  modes:\n    caveman: full\nmodels:\n  claude:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n  opencode:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n  codex:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n");
  const items = checks((await (async () => { const capture = injected(root); await main(["--json"], capture.deps); return capture.output; })()));
  const warn = items.find((item) => item.name === ".claude/agents/probe.md" && item.status === "warn");
  assert.ok(warn, "expected a warn for an agent with no profile and no legacy model prefix");
  assert.match(warn!.detail, /no declared capability profile/);
  // Same cycle-1 patch pin: the message must mention the 2.28.0 fallback removal.
  assert.match(warn!.detail, /legacy .* fallback was removed in 2\.28\.0/);
});

test("doctor: a canonical agent whose profile: value is outside {fast,standard,deep} warns and names the allowed set", async (t) => {
  const root = fixture(t);
  // profile: turbo (out of allowlist) → extractAgentProfile returns null → warn.
  write(root, ".claude/agents/probe.md", "---\nname: probe\nprofile: turbo\n---\n**Caveman mode:** x\nSub-agent dispatch: y\n");
  write(root, "ai-workflow.toon", "schemaVersion: 3\nruntime:\n  runner: node\nintegrations:\n  orca:\n    engine: \">=1.4.224\"\n    enabled: false\n    multiAgent: false\n    maxConcurrentWorkers: 3\n    maxRetriesPerTask: 1\ndoctor:\n  modelRouting: project\nskills:\n  modes:\n    caveman: full\nmodels:\n  claude:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n  opencode:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n  codex:\n    fast:\n      model: a\n    standard:\n      model: b\n    deep:\n      model: c\n");
  const items = checks((await (async () => { const capture = injected(root); await main(["--json"], capture.deps); return capture.output; })()));
  const warn = items.find((item) => item.name === ".claude/agents/probe.md" && item.status === "warn");
  assert.ok(warn, "expected a warn for a canonical agent with an out-of-allowlist profile");
  assert.match(warn!.detail, /no declared capability profile/);
});

test("doctor: opencode.json top-level model: is set and agent.build.model override is absent (S3 Bet 2 contract)", async (t) => {
  // The doctor does not directly read .opencode/opencode.json (OpenCode does at runtime), but
  // a regression in the toon / opencode.json contract would silently drift the primary-agent
  // route. This test pins the contract: parse both files, assert the cross-reference.
  const { fs, path } = createTestDeps();
  const root = urlPath(new URL("../..", import.meta.url));
  // This pins the bundle repo's own files; an installed project owns its opencode.json (bundle-sync only flags it).
  if (!fs.existsSync(path.join(root, "VERSION"))) { t.skip("bundle-repo contract; opencode.json is project-owned in an install"); return; }
  const opencodePath = path.join(root, ".opencode", "opencode.json");
  const toonPath = path.join(root, "ai-workflow.toon");
  if (!fs.existsSync(toonPath)) return; // gitignored, absent in clean checkout
  const opencodeRaw = fs.readFileSync(opencodePath, "utf8");
  const opencode = JSON.parse(opencodeRaw);
  assert.ok(typeof opencode.model === "string" && opencode.model.length > 0, "opencode.json must have a top-level model: key");
  assert.equal(opencode.agent?.build?.model, undefined, "opencode.json must not have an agent.build.model override (removed in 2.28.0)");
  // The top-level model: must equal models.opencode.deep.model from the toon. Use a direct
  // line-by-line parser: find the `opencode:` line at indent-2 (the models block), then
  // walk forward to find `deep:` at indent-4, then `model:` at indent-6.
  const toonRaw = fs.readFileSync(toonPath, "utf8").split("\n");
  const opencodeLine = toonRaw.findIndex((l) => /^  opencode:\s*$/.test(l));
  assert.ok(opencodeLine > 0, "could not find `  opencode:` in the toon's models: block");
  const deepLine = toonRaw.findIndex((l, i) => i > opencodeLine && /^    deep:\s*$/.test(l));
  assert.ok(deepLine > opencodeLine, "could not find `    deep:` under opencode:");
  const modelLine = toonRaw[deepLine + 1];
  assert.ok(modelLine && /^      model:\s*(\S+)/.test(modelLine), "could not find `      model:` under opencode.deep:");
  const deepModel = modelLine.match(/^      model:\s*(\S+)/)[1];
  assert.equal(opencode.model, deepModel, "opencode.json top-level model: must equal models.opencode.deep.model");
});

test("doctor warns about graphify's raw git hooks and passes the workflow's overlay-aware ones", async (t) => {
  const root = fixture(t);
  write(root, ".project/knowledge/README.md", "# Knowledge\n");
  assert.equal(createTestDeps().child.runSync("git", ["init", "-q"], { cwd: root }).status, 0);
  const hookCheck = async (): Promise<Check | undefined> => {
    const capture = injected(root);
    await main(["--json"], capture.deps);
    return checks(capture.output).find((item) => item.name === "Graphify hooks");
  };
  assert.equal(await hookCheck(), undefined, "no hooks installed: nothing to report");
  write(root, ".git/hooks/post-checkout", "#!/bin/sh\n# graphify-checkout-hook-start\n( raw )\n# graphify-checkout-hook-end\n");
  const raw = await hookCheck();
  assert.equal(raw?.status, "warn");
  assert.match(raw!.detail, /post-checkout hook runs graphify's own rebuild.*graphify\.mts setup/);
  write(root, ".git/hooks/post-checkout", `#!/bin/sh\n${hookBlock("post-checkout")}\n`);
  assert.equal((await hookCheck())?.status, "pass");
});

test("doctor requires the Claude Orca start hooks with the Node runner; a bun-wired or missing hook fails", async (t) => {
  const root = fixture(t);
  const canonical = JSON.parse(fs.readFileSync(urlPath(new URL("../../.claude/settings.json", import.meta.url))));
  const wiring = async (): Promise<Check | undefined> => {
    const capture = injected(root);
    await main(["--json"], capture.deps);
    return checks(capture.output).find((item) => item.name === "Claude startup wiring");
  };
  write(root, ".claude/settings.json", JSON.stringify(canonical));
  assert.equal((await wiring())?.status, "pass");

  const bun = structuredClone(canonical);
  bun.hooks.PreToolUse[0].hooks[0].command = 'bun "$CLAUDE_PROJECT_DIR/ai-framework/hooks/scripts/orca-start-hook.mts"';
  write(root, ".claude/settings.json", JSON.stringify(bun));
  const bunCheck = await wiring();
  assert.equal(bunCheck?.status, "fail");
  assert.match(bunCheck!.detail, /PreToolUse \(matcher "Skill"\) must run exactly AI_WORKFLOW_RUNNER=node node/);
  assert.doesNotMatch(bunCheck!.detail, /UserPromptExpansion/, "only the miswired event is named");

  const slow = structuredClone(canonical);
  slow.hooks.UserPromptExpansion[0].hooks[0].timeout = 30;
  write(root, ".claude/settings.json", JSON.stringify(slow));
  assert.match((await wiring())!.detail, /UserPromptExpansion .* with timeout 8/);

  const missing = structuredClone(canonical);
  delete missing.hooks.UserPromptExpansion;
  write(root, ".claude/settings.json", JSON.stringify(missing));
  assert.match((await wiring())!.detail, /UserPromptExpansion does not register orca-start-hook\.mts/);
});

interface CaptureGroup { matcher: string; hooks: { type: string; command: string; timeout?: number }[] }
function captureSettings(): { hooks: Record<string, CaptureGroup[]> } {
  return JSON.parse(fs.readFileSync(urlPath(new URL("../../.claude/settings.json", import.meta.url))));
}
async function captureWiring(root: string): Promise<Check> {
  const capture = injected(root);
  await main(["--json"], capture.deps);
  const result = checks(capture.output).find((item) => item.name === "Claude capture wiring");
  assert.ok(result);
  return result;
}

test("doctor accepts all eight canonical capture registrations", async (t) => {
  const root = fixture(t);
  write(root, ".claude/settings.json", JSON.stringify(captureSettings()));
  assert.equal((await captureWiring(root)).status, "pass");
});

const captureMiswirings: [string, (group: CaptureGroup) => void][] = [
  ["echoed command", (group) => { group.hooks[0].command = "echo " + group.hooks[0].command; }],
  ["Bun command", (group) => { group.hooks[0].command = 'bun "workflow-capture.mts"'; }],
  ["missing timeout", (group) => { delete group.hooks[0].timeout; }],
  ["long timeout", (group) => { group.hooks[0].timeout = 30; }],
  ["shell suffix", (group) => { group.hooks[0].command += "; true"; }],
  ["wrong type", (group) => { group.hooks[0].type = "prompt"; }],
  ["wrong matcher", (group) => { group.matcher = "Skill"; }],
];
for (const [label, mutate] of captureMiswirings) {
  test(`doctor rejects capture ${label} and names only its event`, async (t) => {
    const root = fixture(t);
    const settings = captureSettings();
    const group = settings.hooks.Stop.find((entry) => entry.hooks.some((hook) => hook.command.includes("workflow-capture.mts")))!;
    mutate(group);
    write(root, ".claude/settings.json", JSON.stringify(settings));
    const result = await captureWiring(root);
    assert.equal(result.status, "fail");
    assert.match(result.detail, /^Stop /);
    assert.doesNotMatch(result.detail, /SessionStart|SessionEnd|Subagent|UserPrompt|PostToolUse|echo |; true/);
  });
}

for (const duplicate of [true, false]) {
  test(`doctor rejects ${duplicate ? "duplicate" : "missing"} capture registration`, async (t) => {
    const root = fixture(t);
    const settings = captureSettings();
    const groups = settings.hooks.PostToolUse;
    const index = groups.findIndex((entry) => entry.hooks.some((hook) => hook.command.includes("workflow-capture.mts")));
    if (duplicate) groups.push(structuredClone(groups[index]));
    else groups.splice(index, 1);
    write(root, ".claude/settings.json", JSON.stringify(settings));
    const result = await captureWiring(root);
    assert.equal(result.status, "fail");
    assert.equal(result.detail, "PostToolUse must register workflow-capture.mts exactly once");
  });
}

test("doctor warns for an install with no capture registrations", async (t) => {
  const root = fixture(t);
  const settings = captureSettings();
  for (const groups of Object.values(settings.hooks)) {
    for (const group of groups) group.hooks = group.hooks.filter((hook) => !hook.command.includes("workflow-capture.mts"));
  }
  write(root, ".claude/settings.json", JSON.stringify(settings));
  const result = await captureWiring(root);
  assert.equal(result.status, "warn");
  assert.equal(result.detail, "automatic workflow capture is not wired");
});

test("doctor rejects capture on an unexpected event without reflecting its name", async (t) => {
  const root = fixture(t);
  const settings = captureSettings();
  settings.hooks["PRIVATE-EVENT-MARKER"] = structuredClone(settings.hooks.SessionStart);
  write(root, ".claude/settings.json", JSON.stringify(settings));
  const result = await captureWiring(root);
  assert.equal(result.status, "fail");
  assert.equal(result.detail, "unexpected event registers workflow-capture.mts");
});
