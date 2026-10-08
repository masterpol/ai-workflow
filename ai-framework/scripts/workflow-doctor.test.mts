import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createNodeDeps } from "./runtime/node.mts";
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
