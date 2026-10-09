import assert from "node:assert/strict";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { main } from "./orca-start-codex-hook.mts";
import { captureIo, createTestDeps, runScript, tempFixture } from "../../scripts/runtime/test-helpers.mts";
import type { FixtureFile } from "../../scripts/runtime/test-helpers.mts";
import type { RunResult } from "../../scripts/runtime/types.mts";

const deps = createTestDeps();
const repo = deps.path.resolve(import.meta.dirname, "../../..");
const script = deps.path.join(import.meta.dirname, "orca-start-codex-hook.mts");
const PHASES = ["shape", "shape-lite", "critique", "plan", "build", "audit", "ship", "cooldown", "fix", "resume", "switch", "checkpoint"];
const READY = "Orca: ready (coordinator codex, workers claude, opencode)";
const BYPASSED = "Orca: bypassed by request (orca=normal)";
const prompt = (text: string, extra: Record<string, unknown> = {}) => ({ hook_event_name: "UserPromptSubmit", session_id: "s", cwd: "/", prompt: text, ...extra });
const blockedText = (reason: string) => `Orca requested but not ready: ${reason}. Fix it, or re-invoke with orca=normal to run this phase without Orca.\n`;

const fake = `#!${deps.proc.execPath}
const args = process.argv.slice(2);
let value;
if (args[0] === 'orchestration') value = {ok:true,result:{workers:[{agentTerminalHandle:'worker',dispatchStatus:'running'}],page:{hasMore:false}}};
else if (args[0] === 'skills') value = args[2] === 'orca-cli' ? {name:'orca-cli',markdown:'worktree current terminal'} : {name:'orchestration',markdown:'worker-start worker_done orchestration check'};
else value = {ok:true,result:{target:{kind:'local'},runtime:{reachable:true,state:'ready',appVersion:'1.4.222'}}};
console.log(JSON.stringify(value));
`;

function fixture(t: TestContext, extra: Record<string, string | FixtureFile> = {}) {
  const policy = JSON.parse(deps.fs.readFileSync(deps.path.join(repo, "ai-framework/integrations/orca-vendors.example.json")));
  policy["use-orca-orchestration"] = true;
  const exe = { content: fake, mode: 0o755 };
  const root = tempFixture(deps, { ".project/orchestration.json": JSON.stringify(policy), "bin/orca": exe, "bin/claude": exe,
    "bin/codex": exe, "bin/opencode": exe, "nested/deep/.keep": "", ...extra });
  t.after(() => deps.fs.rmSync(root, { recursive: true, force: true }));
  const bin = deps.path.join(root, "bin");
  const env: Record<string, string | undefined> = { ...deps.proc.env, PATH: bin, AI_WORKFLOW_RUNNER: deps.runtime,
    AI_WORKFLOW_ORCA_MULTI_AGENT: "true", ORCA_CLI_COMMAND: deps.path.join(bin, "orca") };
  for (const key of ["ORCA_TERMINAL_HANDLE", "ORCA_DEV_REPO_ROOT", "ORCA_AGENT_SESSION_ID", "CLAUDE_PROJECT_DIR"]) delete env[key];
  function run(input: unknown, overrides: Record<string, string | undefined> = {}, options: { entry?: string; args?: string[]; cwd?: string } = {}): RunResult {
    return runScript(deps, options.entry ?? script, options.args ?? ["--root", root], { cwd: options.cwd ?? root,
      env: { ...env, ...overrides }, input: typeof input === "string" ? input : JSON.stringify(input), timeoutMs: 10_000 });
  }
  const dropPolicy = () => deps.fs.rmSync(deps.path.join(root, ".project/orchestration.json"));
  return { root, env, run, dropPolicy };
}
function silent(result: RunResult) {
  assert.equal(result.status, 0, result.stderr); assert.equal(result.stdout, ""); assert.equal(result.stderr, "");
}
function context(result: RunResult, line: string) {
  assert.equal(result.status, 0, result.stderr); assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), { hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: line } });
}
function blocked(result: RunResult, reason: string) {
  assert.equal(result.status, 2, result.stderr); assert.equal(result.stdout, ""); assert.equal(result.stderr, blockedText(reason));
}

test("off exits silently before parsing input, probing, or checking the root", async (t) => {
  const f = fixture(t);
  silent(f.run(prompt("/build"), { AI_WORKFLOW_ORCA_MULTI_AGENT: "false", PATH: "" }));
  silent(f.run(prompt("/build"), { AI_WORKFLOW_ORCA_MULTI_AGENT: "false", PATH: "" }, { args: [] }));
  silent(f.run("{", { AI_WORKFLOW_ORCA_MULTI_AGENT: "false", PATH: "" }, { args: ["--root", "relative"] }));
  // In-process: reading stdin, or probing a child, would fail the test when off.
  const base = createTestDeps({ ...deps.proc.env, AI_WORKFLOW_ORCA_MULTI_AGENT: "false" });
  const touched: string[] = [];
  const spy = captureIo({ ...base,
    io: { ...base.io, stdin: { readText: async () => { touched.push("stdin"); return "x".repeat(65 * 1024); } } },
    child: { ...base.child, runSync: () => { touched.push("child"); throw new Error("probe"); }, run: async () => { touched.push("child"); throw new Error("probe"); } } });
  assert.equal(await main(["--root", f.root], spy), 0);
  assert.deepEqual(touched, []); assert.deepEqual(spy.out, []); assert.deepEqual(spy.err, []);
});

test("every phase accepts a leading slash or dollar name and reports the Codex coordinator", (t) => {
  const f = fixture(t);
  for (const phase of PHASES) for (const sigil of ["/", "$"]) {
    context(f.run(prompt(`${sigil}${phase}`)), READY);
    context(f.run(prompt(`${sigil}${phase} make it better\nsecond line`)), READY);
  }
});

test("non-matching prompts and other events pass through without probes", (t) => {
  const f = fixture(t);
  const prompts = ["", "hello", " /plan", "please /plan", "run $build now", "/planning", "/plan-x", "/Plan", "//plan", "$$plan", "/search", "/state", "/",
    "$", "`/plan`", '"/plan"', "# /plan", "/ plan", "$ plan", "\n/plan"];
  for (const text of prompts) silent(f.run(prompt(text), { PATH: "", ORCA_CLI_COMMAND: undefined }));
  for (const event of ["SubagentStop", "PreToolUse", "SessionStart", "Stop"])
    silent(f.run({ hook_event_name: event, prompt: "/plan" }, { PATH: "", ORCA_CLI_COMMAND: undefined }));
});

test("blocked writes only the exact reason to stderr and exits 2", (t) => {
  const f = fixture(t); f.dropPolicy();
  blocked(f.run(prompt("/shape")), "policy-missing");
  blocked(f.run(prompt("$shape-lite do it")), "policy-missing");
});

test("raw arguments keep bypass semantics: only a standalone unquoted token bypasses", (t) => {
  const f = fixture(t); f.dropPolicy();
  context(f.run(prompt("/build fix orca=normal -- bug")), BYPASSED);
  context(f.run(prompt("$plan\norca=normal")), BYPASSED);
  context(f.run(prompt("/ship\nline one\n  orca=normal\nlast")), BYPASSED);
  for (const args of ['"orca=normal"', "'orca=normal'", "--orca=normal", "xorca=normal", "orca=normalx", "orca=normal\\"])
    blocked(f.run(prompt(`/shape ${args}`)), "policy-missing");
});

test("Orca worker identity is silent even when the policy is missing", (t) => {
  const f = fixture(t); f.dropPolicy();
  silent(f.run(prompt("/build"), { ORCA_TERMINAL_HANDLE: "worker" }));
  blocked(f.run(prompt("/build"), { ORCA_TERMINAL_HANDLE: "someone-else" }), "policy-missing");
});

test("vendor is always codex and payload fields cannot override it or the root", (t) => {
  const f = fixture(t);
  const decoy = tempFixture(deps, {});
  t.after(() => deps.fs.rmSync(decoy, { recursive: true, force: true }));
  context(f.run(prompt("/plan", { vendor: "claude", coordinator: "claude", cwd: decoy, workerContext: true, root: decoy })), READY);
  context(f.run(prompt("/plan", { cwd: "/definitely/missing" }), {}, { cwd: deps.path.join(f.root, "nested/deep") }), READY);
  context(f.run(prompt("/plan"), { CLAUDE_PROJECT_DIR: decoy }, { cwd: decoy }), READY);
});

test("root comes only from a usable absolute --root directory", (t) => {
  const f = fixture(t);
  const file = deps.path.join(f.root, ".project/orchestration.json");
  const inline = f.run(prompt("/plan"), {}, { args: [`--root=${f.root}`], cwd: deps.path.join(f.root, "nested") });
  context(inline, READY);
  for (const args of [[], ["--root"], ["--root", ""], ["--root", "relative/dir"], ["--root", deps.path.join(f.root, "missing")], ["--root", file]])
    blocked(f.run(prompt("/plan"), {}, { args }), "invalid-root");
  silent(f.run(prompt("hello"), {}, { args: [] }));
});

test("malformed, oversized, and mistyped input block with a fixed reason", (t) => {
  const f = fixture(t);
  const inputs: unknown[] = ["{", "", "null", "[]", "7", "x".repeat(65 * 1024), "é".repeat(33 * 1024),
    { hook_event_name: "UserPromptSubmit" }, { hook_event_name: "UserPromptSubmit", prompt: 7 }, { hook_event_name: "UserPromptSubmit", prompt: null }];
  for (const input of inputs) blocked(f.run(input), "invalid-hook-input");
});

test("input accepts exactly 64 KiB and rejects one byte more", (t) => {
  const f = fixture(t);
  const input = JSON.stringify(prompt("/plan"));
  const padding = 64 * 1024 - new TextEncoder().encode(input).length;
  context(f.run(input + " ".repeat(padding)), READY);
  blocked(f.run(input + " ".repeat(padding + 1)), "invalid-hook-input");
});

test("post-probe elapsed guard rejects a late ready result and catches its removal", (t) => {
  const f = fixture(t, { "ai-framework/scripts/orca-start.mts": `export function decideStart() { return { state: "ready", line: ${JSON.stringify(READY)} }; }\n` });
  deps.fs.symlinkSync(deps.path.join(repo, "ai-framework/scripts/runtime"), deps.path.join(f.root, "ai-framework/scripts/runtime"));
  const entry = deps.path.join(f.root, "ai-framework/hooks/scripts/orca-start-codex-hook.mts");
  deps.fs.mkdirSync(deps.path.dirname(entry), { recursive: true });
  const source = deps.fs.readFileSync(script);
  deps.fs.writeFileSync(entry, source);
  const driver = deps.path.join(f.root, "driver.mts");
  deps.fs.writeFileSync(driver, `
import { main } from "./ai-framework/hooks/scripts/orca-start-codex-hook.mts";
import { createTestDeps } from "./ai-framework/scripts/runtime/test-helpers.mts";
const base = createTestDeps();
let step = 0;
process.exitCode = await main(process.argv.slice(2), { ...base, clock: { ...base.clock, perfNowMs: () => [0, 1000, 6000][step++] ?? 6000 } });
`);
  blocked(f.run(prompt("/plan"), {}, { entry: driver }), "timeout");
  const guard = 'if (deps.clock.perfNowMs() >= end) return block("timeout");';
  assert.ok(source.includes(guard));
  deps.fs.writeFileSync(entry, source.replace(guard, ""));
  const mutant = f.run(prompt("/plan"), {}, { entry: driver });
  context(mutant, READY);
  assert.throws(() => blocked(mutant, "timeout"));
});

test("a stalled synchronous probe blocks within the decision budget", { timeout: 15_000 }, (t) => {
  const f = fixture(t, { "bin/orca": { content: `#!${deps.proc.execPath}\nwhile (true) {}\n`, mode: 0o755 } });
  const started = deps.clock.perfNowMs();
  const result = f.run(prompt("/plan"));
  blocked(result, "timeout");
  assert.ok(deps.clock.perfNowMs() - started < 8000);
});

test("stdin that never finishes is blocked by the script-owned deadline", { timeout: 10_000 }, async () => {
  const exits: number[] = [];
  let release: () => void = () => {};
  const exited = new Promise<void>((resolve) => { release = resolve; });
  const base = createTestDeps({ ...deps.proc.env, AI_WORKFLOW_ORCA_MULTI_AGENT: "true" });
  const hung = captureIo({ ...base, io: { ...base.io, stdin: { readText: () => new Promise<string>(() => {}) } },
    proc: { ...base.proc, exit: ((code: number) => { exits.push(code); release(); }) as never } });
  const started = deps.clock.perfNowMs();
  void main(["--root", repo], hung);
  await exited;
  const elapsed = deps.clock.perfNowMs() - started;
  assert.deepEqual(exits, [2]); assert.deepEqual(hung.out, []); assert.deepEqual(hung.err, [blockedText("timeout")]);
  assert.ok(elapsed >= 4500 && elapsed < 7500, `deadline fired after ${elapsed} ms`);
});

test("stdin read exceptions never expose private messages", async () => {
  const base = createTestDeps({ ...deps.proc.env, AI_WORKFLOW_ORCA_MULTI_AGENT: "true" });
  const failing = captureIo({ ...base, io: { ...base.io, stdin: { readText: async () => { throw new Error("private stdin"); } } } });
  assert.equal(await main(["--root", repo], failing), 2);
  assert.deepEqual(failing.out, []); assert.deepEqual(failing.err, [blockedText("invalid-hook-input")]);
});

test("off never imports the throwing decision library; on blocks that import failure safely", (t) => {
  const f = fixture(t, { "ai-framework/scripts/orca-start.mts": 'throw new Error("private import failure");\n' });
  deps.fs.symlinkSync(deps.path.join(repo, "ai-framework/scripts/runtime"), deps.path.join(f.root, "ai-framework/scripts/runtime"));
  const entry = deps.path.join(f.root, "ai-framework/hooks/scripts/orca-start-codex-hook.mts");
  deps.fs.mkdirSync(deps.path.dirname(entry), { recursive: true }); deps.fs.copyFileSync(script, entry);
  silent(f.run(prompt("/plan"), { AI_WORKFLOW_ORCA_MULTI_AGENT: "false", PATH: "" }, { entry }));
  const failed = f.run(prompt("/plan"), {}, { entry });
  blocked(failed, "internal");
  assert.doesNotMatch(failed.stderr, /private import failure/);
});

test("exact Codex registration runs under a shell where Bun is configured but missing", (t) => {
  const hooks = JSON.parse(deps.fs.readFileSync(deps.path.join(repo, ".codex/hooks.json")));
  assert.equal(hooks.hooks.SubagentStop.length, 1);
  assert.match(hooks.hooks.SubagentStop[0].hooks[0].command, /token-consumption\.mts" --vendor codex --event subagent-complete/);
  const entries = hooks.hooks.UserPromptSubmit;
  assert.equal(entries.length, 1); assert.equal(entries[0].hooks.length, 1);
  const hook = entries[0].hooks[0];
  assert.equal(hook.type, "command"); assert.equal(hook.timeout, 8);
  assert.equal(hook.command, "workflow_root=$(git rev-parse --show-toplevel 2>/dev/null) || { printf '%s\\n' 'Orca requested but not ready: project-root-unavailable. Run the Codex startup check from the project root before continuing.' >&2; exit 2; }; AI_WORKFLOW_RUNNER=node node --experimental-strip-types --disable-warning=ExperimentalWarning \"$workflow_root/ai-framework/hooks/scripts/orca-start-codex-hook.mts\" --root \"$workflow_root\"");
  const node = deps.proc.versions.bun ? deps.child.runSync("node", ["-p", "process.execPath"]).stdout.trim() : deps.proc.execPath;
  const f = fixture(t, { "ai_workflow_env.json": '{"AI_WORKFLOW_RUNNER":"bun"}' });
  deps.fs.symlinkSync(node, deps.path.join(f.root, "bin/node"));
  deps.fs.symlinkSync(deps.path.join(repo, "ai-framework"), deps.path.join(f.root, "ai-framework"));
  deps.fs.writeFileSync(deps.path.join(f.root, "bin/git"), `#!/bin/sh\n[ "$1 $2" = "rev-parse --show-toplevel" ] && echo '${f.root}'\n`);
  deps.fs.chmodSync(deps.path.join(f.root, "bin/git"), 0o755);
  const shell = (input: unknown, enabled: string) => deps.child.runSync("/bin/sh", ["-c", hook.command], { cwd: deps.path.join(f.root, "nested"),
    env: { ...f.env, AI_WORKFLOW_RUNNER: "bun", AI_WORKFLOW_ORCA_MULTI_AGENT: enabled }, input: JSON.stringify(input), timeoutMs: 10_000 });
  context(shell(prompt("/plan"), "true"), READY);
  silent(shell(prompt("/plan"), "false"));
  f.dropPolicy();
  blocked(shell(prompt("/plan"), "true"), "policy-missing");
  silent(shell(prompt("hello"), "true"));
  deps.fs.writeFileSync(deps.path.join(f.root, "bin/git"), "#!/bin/sh\nexit 1\n");
  // Root bootstrap precedes the adapter's switch check, including when the switch is off.
  for (const enabled of ["true", "false"]) {
    const unavailable = shell(prompt("/plan"), enabled);
    assert.equal(unavailable.status, 2);
    assert.equal(unavailable.stdout, "");
    assert.equal(unavailable.stderr, "Orca requested but not ready: project-root-unavailable. Run the Codex startup check from the project root before continuing.\n");
  }
});

test("a direct entry with an unavailable configured Bun fails non-blocking even when off", (t) => {
  const f = fixture(t);
  if (deps.runtime === "bun") return;
  const result = deps.child.runSync(deps.proc.execPath, ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", script, "--root", f.root], {
    cwd: f.root, env: { ...f.env, AI_WORKFLOW_ORCA_MULTI_AGENT: "false", AI_WORKFLOW_RUNNER: "bun", PATH: "" },
    input: JSON.stringify(prompt("/plan")), timeoutMs: 10_000 });
  assert.equal(result.status, 1); assert.equal(result.stdout, ""); assert.notEqual(result.status, 2);
  assert.match(result.stderr, /bun.*not found|ENOENT|spawn/i);
});

// Scratch mutants prove the vendor and blocking assertions detect a real defect.
test("assertions catch a vendor mutant and a non-blocking mutant", (t) => {
  const source = deps.fs.readFileSync(script);
  const mutate = (name: string, from: string, to: string, extra: Record<string, string | FixtureFile> = {}) => {
    assert.ok(source.includes(from), `mutation anchor missing: ${from}`);
    const f = fixture(t, extra);
    deps.fs.mkdirSync(deps.path.join(f.root, "ai-framework/hooks/scripts"), { recursive: true });
    deps.fs.symlinkSync(deps.path.join(repo, "ai-framework/scripts"), deps.path.join(f.root, "ai-framework/scripts"));
    const entry = deps.path.join(f.root, "ai-framework/hooks/scripts", name);
    deps.fs.writeFileSync(entry, source.replace(from, to));
    return { f, entry };
  };
  const vendor = mutate("vendor.mts", 'vendor: "codex"', 'vendor: "claude"');
  const mutantReady = vendor.f.run(prompt("/plan"), {}, { entry: vendor.entry });
  assert.equal(mutantReady.status, 0, mutantReady.stderr);
  assert.throws(() => context(mutantReady, READY));
  const exit = mutate("exit.mts", 'deps.io.stderr.write(decision.line + "\\n"); return 2;', 'deps.io.stderr.write(decision.line + "\\n"); return 0;');
  exit.f.dropPolicy();
  const mutantBlocked = exit.f.run(prompt("/plan"), {}, { entry: exit.entry });
  assert.throws(() => blocked(mutantBlocked, "policy-missing"));
});
