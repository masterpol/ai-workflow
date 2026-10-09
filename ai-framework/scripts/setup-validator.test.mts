import { NODE_FLAGS } from "./runtime/entry.mts";
const RUNTIME_FLAGS = process.versions.bun ? [] : NODE_FLAGS;
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { main } from "./setup-validator.mts";
import type { ValidatorLibs } from "./setup-validator.mts";
import type { RunResult, RuntimeDeps } from "./runtime/types.mts";

const ROOT = "/proj";
const GOOD_CONTEXT = "# Product\nA real description of the product that is long enough to pass the unfilled draft check.\n";
const AGENTS = "# Agents\n\n## Project specifics\n\nReal.\n\n## Response style (caveman mode)\n\nBrief.\n";

interface Call { command: string; args: string[] }

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
      readFileSync: unsupported, writeFileSync: unsupported, existsSync: unsupported, readdirSync: unsupported, mkdirSync: unsupported, realpathSync: unsupported, writeFile: unsupported,
      readFile: async (file) => { const text = store.get(file); if (text === undefined) throw new Error(`ENOENT ${file}`); return text; },
      exists: async (file) => store.has(file),
      readdir: async (dir) => { const names = dirEntries(dir); if (!names) throw new Error(`ENOENT ${dir}`); return names; },
    },
    path: { join: (...parts: string[]) => parts.join("/") } as unknown as RuntimeDeps["path"],
    child: {
      runSync: unsupported,
      run: async (command, args) => { const call = { command, args }; calls.push(call); return script(call); },
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
  effectiveEntryText: async (_root, file) => ({ content: file === "AGENTS.md" ? AGENTS : AGENTS }),
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

test("missing caveman section only warns; cursor mirror problems fail or warn", async () => {
  const warn = makeDeps(baseFiles(), healthy);
  const code = await main(["--no-color"], warn.deps, { ...libs, effectiveEntryText: async () => ({ content: "# nothing" }) });
  assert.equal(code, 0);
  assert.ok(warn.out.join("").includes("WARN  AGENTS.md: no caveman response-style section"));
  const mirrors = makeDeps(baseFiles(), healthy);
  const code2 = await main(["--no-color"], mirrors.deps, { ...libs, cursorMirrors: () => ({ created: [".cursor/a.mdc"], differs: [".cursor/b.mdc"], current: 0 }) });
  assert.equal(code2, 1);
  const text = mirrors.out.join("");
  assert.ok(text.includes("FAIL  .cursor/a.mdc: missing Cursor mirror; run node ai-framework/scripts/skill-vendors.mts cursor-mirrors --apply\n"));
  assert.ok(text.includes("WARN  .cursor/b.mdc: differs from its canonical .claude file"));
  const thrown = makeDeps(baseFiles(), healthy);
  await main(["--no-color"], thrown.deps, { ...libs, cursorMirrors: () => { throw new Error("no skills dir"); } });
  assert.ok(thrown.out.join("").includes("FAIL  .cursor: no skills dir\n"));
});

test("child failures: graphify non-zero uses stderr, bad JSON and doctor failures are reported", async () => {
  const graphFail = makeDeps(baseFiles(), (call) => (call.args.some((arg) => arg.endsWith("graphify.mts")) ? { status: 1, signal: null, stdout: "", stderr: "boom\n" } : healthy(call)));
  assert.equal(await main(["--no-color"], graphFail.deps, libs), 1);
  assert.ok(graphFail.out.join("").includes("FAIL  Knowledge graph: boom\n"));
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
  assert.ok(spawnError.out.join("").includes("FAIL  Workflow doctor: workflow doctor found a blocking issue\n"));
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
  assert.ok(bad.out.join("").includes("FAIL  ai-framework/scripts/demo.mts: does not parse: SyntaxError: nope\n"));

  const none = baseFiles();
  delete none["ai-framework/scripts/demo.mts"];
  const absent = makeDeps(none, healthy);
  await main(["--json"], absent.deps, libs);
  assert.ok(!(JSON.parse(absent.out.join("")) as Report).results.some((r) => r.name === "TypeScript entries"));
  assert.equal(absent.calls.filter((call) => call.args.includes("-e")).length, 0);
});

test("under the bun runtime .mts entries are transpile-checked", async () => {
  const { deps, calls } = makeDeps(baseFiles(), healthy);
  await main(["--json"], { ...deps, runtime: "bun" }, libs);
  assert.ok(calls.some((call) => call.args.join(" ") === "build --no-bundle ai-framework/scripts/demo.mts"));
});

test("unexpected errors exit 2 on stderr", async () => {
  const { deps, err } = makeDeps(baseFiles(), healthy);
  const code = await main(["--no-color"], deps, { ...libs, resolveClaudeEntry: async () => { throw new Error("kaboom"); } });
  assert.equal(code, 2);
  assert.match(err.join(""), /^Setup validator failed unexpectedly: .*kaboom/s);
});

test("integration: the direct TypeScript command runs the validator in an empty project dir", () => {
  const shim = fileURLToPath(new URL("./setup-validator.mts", import.meta.url));
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "setup-validator-")));
  try {
    const run = spawnSync(process.execPath, [...RUNTIME_FLAGS, shim, "--no-color"], { cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
    assert.equal(run.stderr, "");
    assert.equal(run.status, 1);
    assert.ok(run.stdout.includes("FAIL  .project: missing; setup has not completed\n"));
    assert.ok(run.stdout.includes("Setup status: INCOMPLETE (1 issue(s))"));
    assert.match(run.stdout, /Validated 0 checks\./);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
