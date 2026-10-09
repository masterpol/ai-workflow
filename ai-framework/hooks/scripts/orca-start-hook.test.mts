import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { main } from "./orca-start-hook.mts";
import { captureIo, createTestDeps } from "../../scripts/runtime/test-helpers.mts";

const script = join(import.meta.dirname, "orca-start-hook.mts");
const repo = resolve(import.meta.dirname, "../../..");
const node = process.versions.bun ? spawnSync("node", ["-p", "process.execPath"], { encoding: "utf8" }).stdout.trim() : process.execPath;
const flags = ["--experimental-strip-types", "--disable-warning=ExperimentalWarning"];
const skill = (name = "shape", args = "") => ({ hook_event_name: "PreToolUse", tool_name: "Skill", tool_input: { skill: name, args } });
const expansion = (name = "plan", args = "") => ({ hook_event_name: "UserPromptExpansion", command_name: name,
  command_args: args, command_source: "project", expansion_type: "slash_command", prompt: "expanded skill" });

function fixture(t: TestContext) {
  const root = mkdtempSync(join(tmpdir(), "orca-start-hook-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, ".project")); mkdirSync(join(root, "bin"));
  const policy = JSON.parse(readFileSync(join(repo, "ai-framework/integrations/orca-vendors.example.json"), "utf8"));
  policy["use-orca-orchestration"] = true;
  writeFileSync(join(root, ".project/orchestration.json"), JSON.stringify(policy));
  const fake = `#!${process.execPath}
const args = process.argv.slice(2);
let value;
if (args[0] === 'orchestration') value = {ok:true,result:{workers:${JSON.stringify([{ agentTerminalHandle: "worker", dispatchStatus: "running" }])},page:{hasMore:false}}};
else if (args[0] === 'skills') value = args[2] === 'orca-cli' ? {name:'orca-cli',markdown:'worktree current terminal'} : {name:'orchestration',markdown:'worker-start worker_done orchestration check'};
else value = {ok:true,result:{target:{kind:'local'},runtime:{reachable:true,state:'ready',appVersion:'1.4.223'}}};
console.log(JSON.stringify(value));
`;
  for (const name of ["orca", "codex", "opencode"]) {
    writeFileSync(join(root, "bin", name), fake); chmodSync(join(root, "bin", name), 0o755);
  }
  const env: Record<string, string | undefined> = { ...process.env, CLAUDE_PROJECT_DIR: root, PATH: join(root, "bin"),
    AI_WORKFLOW_RUNNER: "node", AI_WORKFLOW_ORCA_MULTI_AGENT: "true", ORCA_CLI_COMMAND: join(root, "bin/orca") };
  for (const key of ["ORCA_TERMINAL_HANDLE", "ORCA_DEV_REPO_ROOT", "ORCA_AGENT_SESSION_ID"]) delete env[key];
  function run(input: unknown, overrides: Record<string, string | undefined> = {}, entry = script) {
    return spawnSync(node, [...flags, entry], { cwd: root, env: { ...env, ...overrides },
      input: typeof input === "string" ? input : JSON.stringify(input), encoding: "utf8", timeout: 10_000 });
  }
  return { root, env, run };
}
function silent(result: ReturnType<typeof spawnSync>) {
  assert.equal(result.status, 0, String(result.stderr)); assert.equal(result.stdout, ""); assert.equal(result.stderr, "");
}
function context(result: ReturnType<typeof spawnSync>, event: string, line: string) {
  assert.equal(result.status, 0, String(result.stderr)); assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(String(result.stdout)), { hookSpecificOutput: { hookEventName: event, additionalContext: line } });
}

test("off exits silently with empty PATH before parsing malformed or oversized input", (t) => {
  const f = fixture(t);
  for (const input of [skill(), "{", "x".repeat(65 * 1024)])
    silent(f.run(input, { AI_WORKFLOW_ORCA_MULTI_AGENT: "false", PATH: "" }));
});

test("required runDirect entry reports unavailable Bun as non-blocking exit 1 even when off", (t) => {
  const f = fixture(t);
  const result = f.run(skill(), { AI_WORKFLOW_ORCA_MULTI_AGENT: "false", AI_WORKFLOW_RUNNER: "bun", PATH: "" });
  assert.equal(result.status, 1); assert.equal(result.stdout, ""); assert.notEqual(result.status, 2);
  assert.match(result.stderr, /bun.*not found|ENOENT|spawn/i);
});

test("configured hook forces Node when Bun is configured but missing", (t) => {
  const f = fixture(t);
  const settings = JSON.parse(readFileSync(join(repo, ".claude/settings.json"), "utf8"));
  const command: string = settings.hooks.PreToolUse.find((entry: { hooks: { command: string }[] }) =>
    entry.hooks.some((hook) => hook.command.includes("orca-start-hook.mts"))).hooks[0].command;
  assert.ok(command.startsWith("AI_WORKFLOW_RUNNER=node node --experimental-strip-types "));
  symlinkSync(node, join(f.root, "bin/node"));
  symlinkSync(join(repo, "ai-framework"), join(f.root, "ai-framework"), "dir");
  writeFileSync(join(f.root, "ai_workflow_env.json"), '{"AI_WORKFLOW_RUNNER":"bun"}');
  rmSync(join(f.root, ".project/orchestration.json"));
  const run = (enabled: string) => spawnSync("/bin/sh", ["-c", command], {
    cwd: f.root, env: { ...f.env, AI_WORKFLOW_RUNNER: "bun", AI_WORKFLOW_ORCA_MULTI_AGENT: enabled },
    input: JSON.stringify(skill()), encoding: "utf8", timeout: 10_000,
  });
  const blocked = run("true");
  assert.equal(blocked.status, 2, blocked.stderr); assert.equal(blocked.stdout, "");
  assert.match(blocked.stderr, /not ready: policy-missing\./);
  silent(run("false"));
});

test("off never imports the throwing decision library; on catches that import failure", (t) => {
  const f = fixture(t);
  const hooks = join(f.root, "ai-framework/hooks/scripts");
  const scripts = join(f.root, "ai-framework/scripts");
  mkdirSync(hooks, { recursive: true }); mkdirSync(scripts, { recursive: true });
  symlinkSync(join(repo, "ai-framework/scripts/runtime"), join(scripts, "runtime"), "dir");
  writeFileSync(join(scripts, "orca-start.mts"), 'throw new Error("private import failure");\n');
  const entry = join(hooks, "orca-start-hook.mts"); copyFileSync(script, entry);
  silent(f.run(skill(), { AI_WORKFLOW_ORCA_MULTI_AGENT: "false", PATH: "" }, entry));
  const failed = f.run(skill(), {}, entry);
  assert.equal(failed.status, 2); assert.equal(failed.stdout, ""); assert.match(failed.stderr, /not ready: internal\./);
  assert.doesNotMatch(failed.stderr, /private import failure/);
});

test("non-phase skills and commands pass through without readiness probes", (t) => {
  const f = fixture(t);
  for (const input of [skill("search"), skill("state"), expansion("state"),
    { hook_event_name: "PreToolUse", tool_name: "Bash" },
    { ...expansion(), expansion_type: "other" }, { ...skill(), hook_event_name: "Unknown" }]) silent(f.run(input, { PATH: "", ORCA_CLI_COMMAND: undefined }));
});

test("Claude subagent helper calls pass through silently before the decision library", (t) => {
  const f = fixture(t);
  for (const agent_id of ["helper", ""])
    silent(f.run({ ...skill("audit", "orca=normal"), agent_id, agent_type: "code-reviewer" }, { PATH: "" }));
});

test("every phase returns ready context for the observed Skill payload", (t) => {
  const f = fixture(t);
  for (const phase of ["shape", "shape-lite", "critique", "plan", "build", "audit", "ship", "cooldown", "fix", "resume", "switch", "checkpoint"])
    context(f.run(skill(phase)), "PreToolUse", "Orca: ready (coordinator claude, workers codex, opencode)");
});

test("blocked writes only its actionable reason to stderr and exits 2", (t) => {
  const f = fixture(t); rmSync(join(f.root, ".project/orchestration.json"));
  const result = f.run(skill());
  assert.equal(result.status, 2); assert.equal(result.stdout, "");
  assert.equal(result.stderr, "Orca requested but not ready: policy-missing. Fix it, or re-invoke with orca=normal to run this phase without Orca.\n");
});

test("raw bypass args add context and embedded or quoted tokens do not bypass", (t) => {
  const f = fixture(t); rmSync(join(f.root, ".project/orchestration.json"));
  context(f.run(skill("shape", "fix orca=normal -- bug")), "PreToolUse", "Orca: bypassed by request (orca=normal)");
  for (const args of ['"orca=normal"', "--orca=normal"]) assert.equal(f.run(skill("shape", args)).status, 2);
});

test("Orca worker identity produces no context or readiness gate", (t) => {
  const f = fixture(t); rmSync(join(f.root, ".project/orchestration.json"));
  silent(f.run(skill(), { ORCA_TERMINAL_HANDLE: "worker" }));
});

test("observed UserPromptExpansion uses command args and its own event context", (t) => {
  const f = fixture(t);
  context(f.run(expansion()), "UserPromptExpansion", "Orca: ready (coordinator claude, workers codex, opencode)");
  context(f.run(expansion("build", "orca=normal")), "UserPromptExpansion", "Orca: bypassed by request (orca=normal)");
  rmSync(join(f.root, ".project/orchestration.json"));
  const blocked = f.run(expansion()); assert.equal(blocked.status, 2); assert.equal(blocked.stdout, "");
});

test("on rejects malformed and oversized stdin with a fixed reason", (t) => {
  const f = fixture(t);
  for (const input of ["{", "null", "[]", "x".repeat(65 * 1024), "é".repeat(33 * 1024),
    { hook_event_name: "PreToolUse", tool_name: "Skill", tool_input: null }, skill("build", 7 as unknown as string),
    skill(7 as unknown as string), expansion(7 as unknown as string)]) {
    const result = f.run(input); assert.equal(result.status, 2, result.stderr); assert.equal(result.stdout, "");
    assert.equal(result.stderr, "Orca requested but not ready: invalid-hook-input. Fix it, or re-invoke with orca=normal to run this phase without Orca.\n");
  }
});

test("script-owned 5000 ms deadline blocks stdin that never finishes", { timeout: 10_000 }, async (t) => {
  const f = fixture(t);
  const started = performance.now();
  const child = spawn(node, [...flags, script], { cwd: f.root, env: f.env, stdio: "pipe" });
  t.after(() => child.kill("SIGKILL"));
  let stdout = ""; let stderr = "";
  child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
  child.stdout.on("data", (data: string) => { stdout += data; });
  child.stderr.on("data", (data: string) => { stderr += data; });
  const code = await new Promise<number | null>((resolveCode, reject) => {
    const limit = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("hook missed its deadline")); }, 7500);
    child.on("error", reject); child.on("close", (status) => { clearTimeout(limit); resolveCode(status); });
  });
  assert.equal(code, 2); assert.equal(stdout, ""); assert.match(stderr, /not ready: timeout\./);
  assert.ok(performance.now() - started < 7500);
});

test("synchronous probe timeout blocks within the hook budget", (t) => {
  const f = fixture(t);
  writeFileSync(join(f.root, "bin/orca"), `#!${process.execPath}\nwhile (true) {}\n`);
  const result = f.run(skill());
  assert.equal(result.status, 2); assert.equal(result.stdout, ""); assert.match(result.stderr, /not ready: timeout\./);
});

test("stdin and decision exceptions never expose private error messages", async () => {
  const base = createTestDeps({ AI_WORKFLOW_ORCA_MULTI_AGENT: "true" });
  const deps = captureIo({ ...base, io: { ...base.io, stdin: { readText: async () => { throw new Error("private stdin"); } } } });
  assert.equal(await main([], deps), 2); assert.deepEqual(deps.out, []); assert.doesNotMatch(deps.err.join(""), /private stdin/);
});

test("both hook configurations use the verified events and eight-second timeout", () => {
  for (const file of ["ai-framework/hooks/hooks.json", ".claude/settings.json"]) {
    const data = JSON.parse(readFileSync(join(repo, file), "utf8"));
    for (const [event, matcher] of [["PreToolUse", "Skill"], ["UserPromptExpansion", "*"]]) {
      const hook = data.hooks[event].find((entry: { matcher: string; hooks: { command: string }[] }) =>
        entry.matcher === matcher && entry.hooks.some((command) => command.command.includes("orca-start-hook.mts")));
      assert.ok(hook, `${file}: ${event}`); assert.equal(hook.hooks[0].timeout, 8);
      assert.equal(hook.hooks[0].command, 'AI_WORKFLOW_RUNNER=node node --experimental-strip-types --disable-warning=ExperimentalWarning "$CLAUDE_PROJECT_DIR/ai-framework/hooks/scripts/orca-start-hook.mts"');
      assert.ok(hook.description);
    }
  }
});

// Direct script invocations still support the configured Bun re-exec.
test("configured Bun runs the real hook entry with the same decision outputs", (t) => {
  const f = fixture(t);
  const bun = process.versions.bun ? process.execPath : spawnSync("bun", ["-e", "console.log(process.execPath)"], { encoding: "utf8" }).stdout.trim();
  assert.ok(bun, "Bun is required for dual-runner verification");
  const path = join(f.root, "bin");
  symlinkSync(bun, join(path, "bun"));
  context(f.run(skill(), { AI_WORKFLOW_RUNNER: "bun" }), "PreToolUse", "Orca: ready (coordinator claude, workers codex, opencode)");
  context(f.run(expansion("build", "orca=normal"), { AI_WORKFLOW_RUNNER: "bun" }), "UserPromptExpansion", "Orca: bypassed by request (orca=normal)");
  silent(f.run("{", { AI_WORKFLOW_RUNNER: "bun", AI_WORKFLOW_ORCA_MULTI_AGENT: "false" }));
  const malformed = f.run("{", { AI_WORKFLOW_RUNNER: "bun" });
  assert.equal(malformed.status, 2); assert.equal(malformed.stdout, "");
});
