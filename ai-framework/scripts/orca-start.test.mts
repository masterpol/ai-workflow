import assert from "node:assert/strict";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { createTestDeps, tempFixture } from "./runtime/test-helpers.mts";
import type { RuntimeDeps } from "./runtime/types.mts";
import type { Run, RunOptions } from "./orca-preflight.mts";
import { decideStart, hasNormalBypass } from "./orca-start.mts";
import type { StartOptions } from "./orca-start.mts";

const base = createTestDeps({});
const executable = "/opt/orca/orca";
const env = { AI_WORKFLOW_ORCA_MULTI_AGENT: "true", PATH: "/opt/orca:/usr/bin", HOME: "/home/test" };
const status = (version = "1.4.222") => ({ ok: true, result: { target: { kind: "local" },
  runtime: { reachable: true, state: "ready", appVersion: version } } });
const example = JSON.parse(base.fs.readFileSync(base.path.join(import.meta.dirname, "../integrations/orca-vendors.example.json")));
const fail = (): never => { throw new Error("must not be touched"); };

function fixture(t: TestContext) {
  const policy = structuredClone(example);
  policy["use-orca-orchestration"] = true;
  const root = tempFixture(base, { ".project/orchestration.json": JSON.stringify(policy) }, { resolve: false });
  t.after(() => base.fs.rmSync(root, { recursive: true, force: true }));
  const state = { clock: 0, calls: [] as Array<{ command: string; args: string[]; options: RunOptions }>,
    version: "1.4.222", workers: [] as unknown[], page: { hasMore: false } as Record<string, unknown>,
    missing: new Set<string>(), paths: new Map<string, string>(), brokenWorker: false,
    advance: 0, throwing: false, childError: undefined as string | undefined };
  const isExecutable = (file: string) => [executable, "/opt/orca/codex", "/opt/orca/opencode", "/opt/orca/claude", "/usr/local/bin/orca"].includes(file)
    && !state.missing.has(file);
  const deps: RuntimeDeps = { ...base, proc: { ...base.proc, platform: "darwin", env: { ...env } },
    clock: { ...base.clock, perfNowMs: () => state.clock },
    fs: { ...base.fs,
      statSync: (file) => isExecutable(file) ? { ...base.fs.statSync(root), isFile: () => true } : base.fs.statSync(file),
      accessSync: (file, mode) => { if (!isExecutable(file)) base.fs.accessSync(file, mode); },
      realpathSync: (file) => isExecutable(file) ? state.paths.get(file) ?? file : base.fs.realpathSync(file),
    },
    child: { run: fail, runSync: fail, runBytesSync: fail } };
  const run: Run = (command, args, options) => {
    state.calls.push({ command, args, options }); state.clock += state.advance;
    if (state.throwing) throw new Error("private failure details must not escape");
    if (state.childError) return { status: null, stdout: "", stderr: "", error: { code: state.childError } };
    let value: unknown;
    if (args[0] === "orchestration") value = { ok: true, result: { workers: state.workers, page: state.page } };
    else if (args[0] === "skills") value = args[2] === "orca-cli"
      ? { name: "orca-cli", markdown: "worktree current terminal" }
      : { name: "orchestration", markdown: "worker-start worker_done orchestration check" };
    else value = status(state.version);
    if (state.brokenWorker && command === executable && args[0] === "status" && !options.env.AI_WORKFLOW_ORCA_MULTI_AGENT)
      return { status: 1, stdout: "", stderr: "Unable to determine Orca.app path from symlink" };
    return { status: 0, stdout: JSON.stringify(value), stderr: "", signal: null };
  };
  const options: StartOptions = { root, vendor: "claude", phase: "shape", deps, run };
  const writePolicy = () => base.fs.writeFileSync(base.path.join(root, ".project/orchestration.json"), JSON.stringify(policy));
  return { root, policy, writePolicy, state, deps, run, options };
}

function offOptions(value: string | undefined = "false"): StartOptions {
  const switchEnv = { AI_WORKFLOW_ORCA_MULTI_AGENT: value, get PATH(): never { return fail(); },
    get ORCA_TERMINAL_HANDLE(): never { return fail(); } };
  const deps: RuntimeDeps = { ...base, proc: { ...base.proc, env: switchEnv, get platform(): never { return fail(); } },
    fs: new Proxy(base.fs, { get(_target, key) { if (key === "existsSync") return (file: string) => {
      assert.equal(file, "/trusted/ai_workflow_env.json"); return false;
    }; return fail; } }), get child(): never { return fail(); }, get clock(): never { return fail(); } };
  return { root: "/trusted", vendor: "claude", phase: "shape", deps, get argsText(): never { return fail(); },
    get workerContext(): never { return fail(); }, get run(): never { return fail(); }, get terminalHandle(): never { return fail(); } };
}

test("returns off before reading invocation, identity, PATH, policy, clock or spawn", () => {
  for (const value of [undefined, "", "false", "0", "yes", "truee"]) assert.deepEqual(decideStart(offOptions(value)),
    { state: "off", reason: "orca-multi-agent-disabled", line: "" });
});

test("never honours bypass while the switch is off", () => {
  const options = offOptions();
  Object.defineProperty(options, "argsText", { value: "orca=normal" });
  Object.defineProperty(options, "workerContext", { value: true });
  assert.equal(decideStart(options).state, "off");
});

test("accepts only whole unquoted whitespace-delimited bypass tokens", () => {
  for (const text of ["orca=normal", "fix orca=normal bug", "orca=normal orca=normal", "-- orca=normal", "\torca=normal\n"])
    assert.equal(hasNormalBypass(text), true, text);
  for (const text of ["", "--", '"orca=normal"', "'orca=normal'", "`orca=normal`", '"say orca=normal please"',
    "embeddedorca=normal", "--orca=normal", "orca=normal-more", "orca=normal,", "orca=normal=", "ORCA=normal", "orca=NORMAL",
    "\\orca=normal", '"unclosed orca=normal', "quoted='orca=normal'", '"say \\" orca=normal"'])
    assert.equal(hasNormalBypass(text), false, text);
  assert.equal(hasNormalBypass('"orca=normal" orca=normal'), true);
});

test("returns bypassed before worker identity and gate", (t) => {
  const f = fixture(t);
  const result = decideStart({ ...f.options, argsText: "orca=normal", workerContext: true, get terminalHandle(): never { return fail(); }, run: fail });
  assert.deepEqual(result, { state: "bypassed", reason: "orca-normal", line: "Orca: bypassed by request (orca=normal)" });
  assert.equal(f.state.calls.length, 0);
});

test("returns worker by explicit flag without policy, clock, terminal lookup or spawn", (t) => {
  const f = fixture(t);
  f.deps.fs.openSync = fail;
  const result = decideStart({ ...f.options, workerContext: true, run: fail,
    deps: { ...f.deps, get clock(): never { return fail(); } }, get terminalHandle(): never { return fail(); } });
  assert.deepEqual(result, { state: "worker", reason: "worker-context", line: "" });
});

test("returns worker for an agent terminal of an open dispatch before any policy read", (t) => {
  const f = fixture(t);
  f.state.workers = [{ agentTerminalHandle: "agent", dispatchStatus: "dispatched" }];
  f.deps.proc.env.ORCA_TERMINAL_HANDLE = "agent";
  f.deps.fs.openSync = fail;
  assert.equal(decideStart(f.options).state, "worker");
  assert.deepEqual(f.state.calls.map((call) => call.args), [["orchestration", "worker-list", "--limit", "100", "--json"]]);
});

test("uses the explicit caller handle and ignores completed dispatches", (t) => {
  const f = fixture(t);
  f.state.workers = [{ agentTerminalHandle: "agent", dispatchStatus: "completed" }];
  f.deps.proc.env.ORCA_TERMINAL_HANDLE = "agent";
  assert.equal(decideStart({ ...f.options, terminalHandle: "coordinator" }).state, "ready");
  assert.equal(decideStart({ ...f.options, terminalHandle: "agent" }).state, "ready");
});

test("follows bounded worker-list pagination rather than treating the first page as exhaustive", (t) => {
  const f = fixture(t);
  f.state.page = { hasMore: true, nextCursor: "opaque" };
  const run: Run = (command, args, options) => {
    if (args.includes("--cursor")) { f.state.page = { hasMore: false }; f.state.workers = [{ agentTerminalHandle: "agent", dispatchStatus: "dispatched" }]; }
    return f.run(command, args, options);
  };
  assert.equal(decideStart({ ...f.options, terminalHandle: "agent", run }).state, "worker");
  assert.equal(f.state.calls.length, 2);
});

test("blocks failed or malformed worker lookups and repeated pagination cursors", (t) => {
  const f = fixture(t);
  const request = { ...f.options, terminalHandle: "coordinator" };
  assert.equal(decideStart({ ...request, run: () => ({ status: 1, stdout: "", stderr: "" }) }).reason, "worker-identity-unavailable");
  assert.equal(decideStart({ ...request, run: () => ({ status: 0, stdout: "{}", stderr: "" }) }).reason, "worker-identity-unavailable");
  f.state.page = { hasMore: true, nextCursor: "repeat" };
  assert.equal(decideStart(request).reason, "worker-identity-unavailable");
  f.state.missing.add(executable);
  assert.equal(decideStart(request).reason, "worker-identity-unavailable");
});

test("returns ready with every distinct worker required by coordinator roles", (t) => {
  const f = fixture(t);
  assert.deepEqual(decideStart(f.options), { state: "ready", reason: "launch-allowed",
    line: "Orca: ready (coordinator claude, workers codex, opencode)", workers: ["codex", "opencode"] });
  assert.equal(f.state.calls.length, 4);
  const workerCalls = f.state.calls.filter((call) => call.args[0] === "status" && !call.options.env.AI_WORKFLOW_ORCA_MULTI_AGENT);
  assert.equal(workerCalls.length, 1);
  assert.deepEqual(workerCalls[0].options.env, { PATH: env.PATH, HOME: env.HOME });
});

test("probes only workers actually needed by roles and deduplicates shared roles", (t) => {
  const f = fixture(t);
  f.policy.coordinators.claude.roles.review = "codex"; f.writePolicy();
  f.state.missing.add("/opt/orca/opencode");
  assert.deepEqual(decideStart(f.options).workers, ["codex"]);
  assert.equal(f.state.calls.length, 4);
});

test("blocks a denial for either role worker even when another launcher is present", (t) => {
  const f = fixture(t);
  for (const worker of ["codex", "opencode"]) {
    f.state.missing.clear(); f.state.missing.add(`/opt/orca/${worker}`);
    assert.equal(decideStart(f.options).reason, `${worker}:worker-unavailable`);
  }
});

test("blocks missing or disabled policy with actionable fixed text", (t) => {
  const f = fixture(t);
  f.policy["use-orca-orchestration"] = false; f.writePolicy();
  const result = decideStart(f.options);
  assert.equal(result.state, "blocked"); assert.equal(result.reason, "policy-disabled");
  assert.equal(result.line, "Orca requested but not ready: policy-disabled. Fix it, or re-invoke with orca=normal to run this phase without Orca.");
  assert.equal(f.state.calls.length, 0);
  base.fs.unlinkSync(base.path.join(f.root, ".project/orchestration.json"));
  assert.equal(decideStart(f.options).reason, "policy-missing");
});

test("blocks unsupported runtime versions through evaluateLaunch", (t) => {
  const f = fixture(t); f.state.version = "9.9.9";
  assert.equal(decideStart(f.options).reason, "runtime-version-unsupported");
});

test("caps every probe by one cumulative deadline", (t) => {
  const f = fixture(t); f.state.advance = 1100;
  assert.equal(decideStart(f.options).reason, "timeout");
  assert.deepEqual(f.state.calls.map((call) => call.options.timeout), [4000, 2900, 1800, 700]);
  assert.ok(f.state.calls.every((call) => call.options.timeout > 0));
});

test("includes identity lookup in the same deadline", (t) => {
  const f = fixture(t); f.state.advance = 1000;
  assert.equal(decideStart({ ...f.options, terminalHandle: "coordinator" }).reason, "timeout");
  assert.equal(f.state.calls.length, 4);
});

test("blocks exhausted, invalid or submillisecond budgets before spawning", (t) => {
  const f = fixture(t);
  for (const deadlineMs of [0, -1, 0.9, Number.NaN, Number.POSITIVE_INFINITY])
    assert.equal(decideStart({ ...f.options, deadlineMs }).reason, "timeout");
  assert.equal(f.state.calls.length, 0);
});

test("maps child timeout to timeout even before the clock reaches its deadline", (t) => {
  const f = fixture(t); f.state.childError = "ETIMEDOUT";
  assert.equal(decideStart(f.options).reason, "timeout");
});

test("blocks internal exceptions without exposing error text or treating them as a pass", (t) => {
  const f = fixture(t); f.state.throwing = true;
  assert.equal(decideStart(f.options).reason, "internal");
  assert.equal(decideStart({ ...f.options, terminalHandle: "agent" }).reason, "internal");
  assert.equal(decideStart({ ...f.options, deps: { ...f.deps, get proc(): never { return fail(); } } }).reason, "internal");
});

test("blocks worker orca resolving to /usr/local/bin/orca instead of the probed override", (t) => {
  const f = fixture(t);
  f.deps.proc.env.ORCA_CLI_COMMAND = executable;
  f.deps.proc.env.PATH = "/usr/local/bin:/opt/orca";
  assert.equal(decideStart(f.options).reason, "worker-orca-path-mismatch");
});

test("blocks the broken /usr/local/bin/orca worker executable even if realpaths agree", (t) => {
  const f = fixture(t);
  f.deps.proc.env.ORCA_CLI_COMMAND = executable; f.deps.proc.env.PATH = "/usr/local/bin:/opt/orca";
  f.state.paths.set("/usr/local/bin/orca", executable); f.state.brokenWorker = true;
  assert.equal(decideStart(f.options).reason, "worker-orca-unavailable");
});

test("filters worker PATH to absolute directories and drops nonallowlisted environment keys", (t) => {
  const f = fixture(t);
  f.deps.proc.env.PATH = ".:relative::/opt/orca";
  f.deps.proc.env.PRIVATE_TEST_VALUE = "private";
  assert.equal(decideStart(f.options).state, "ready");
  const childEnv = f.state.calls[3].options.env;
  assert.equal(childEnv.PATH, "/opt/orca"); assert.equal(childEnv.PRIVATE_TEST_VALUE, undefined);
});

test("reads the switch file only and honours process override", (t) => {
  const f = fixture(t);
  delete f.deps.proc.env.AI_WORKFLOW_ORCA_MULTI_AGENT;
  base.fs.writeFileSync(base.path.join(f.root, "ai_workflow_env.json"), '{"AI_WORKFLOW_ORCA_MULTI_AGENT":true}');
  assert.equal(decideStart(f.options).state, "ready");
  f.deps.proc.env.AI_WORKFLOW_ORCA_MULTI_AGENT = "false";
  assert.equal(decideStart(f.options).state, "off");
});

test("rechecks switch, policy, runtime and identity between calls without caching", (t) => {
  const f = fixture(t);
  assert.equal(decideStart(f.options).state, "ready"); assert.equal(f.state.calls.length, 4);
  assert.equal(decideStart(f.options).state, "ready"); assert.equal(f.state.calls.length, 8);
  f.state.version = "9.9.9"; assert.equal(decideStart(f.options).state, "blocked");
  f.state.version = "1.4.222"; f.policy["use-orca-orchestration"] = false; f.writePolicy();
  assert.equal(decideStart(f.options).reason, "policy-disabled");
  f.deps.proc.env.AI_WORKFLOW_ORCA_MULTI_AGENT = "false"; assert.equal(decideStart(f.options).state, "off");
  f.deps.proc.env.AI_WORKFLOW_ORCA_MULTI_AGENT = "true";
  f.state.workers = [{ agentTerminalHandle: "agent", dispatchStatus: "dispatched" }];
  assert.equal(decideStart({ ...f.options, terminalHandle: "agent" }).state, "worker");
  f.state.workers = []; assert.equal(decideStart({ ...f.options, terminalHandle: "agent" }).state, "blocked");
});

test("blocks role workers absent from the coordinator policy membership", (t) => {
  const f = fixture(t);
  f.policy.coordinators.claude.workers = ["codex"];
  f.writePolicy();
  assert.equal(decideStart(f.options).reason, "policy-malformed");
  assert.equal(f.state.calls.length, 0);
});

test("bounds worker-list pages and refuses malformed matching dispatch identity", (t) => {
  const f = fixture(t);
  const run: Run = (command, args, options) => {
    f.state.page = { hasMore: true, nextCursor: `page-${f.state.calls.length}` };
    return f.run(command, args, options);
  };
  assert.equal(decideStart({ ...f.options, terminalHandle: "agent", run }).reason, "worker-identity-unavailable");
  assert.equal(f.state.calls.length, 32);
  f.state.page = { hasMore: false };
  f.state.workers = [{ agentTerminalHandle: "agent", dispatchStatus: "unknown" }];
  assert.equal(decideStart({ ...f.options, terminalHandle: "agent" }).reason, "worker-identity-unavailable");
});

test("blocks malformed, killed and oversized worker status receipts", (t) => {
  const f = fixture(t);
  for (const result of [
    { status: 0, stdout: "{", stderr: "" },
    { status: 0, stdout: JSON.stringify(status()), stderr: "", signal: "SIGKILL" },
    { status: 0, stdout: " ".repeat(256 * 1024 + 1) + JSON.stringify(status()), stderr: "" },
    { status: 0, stdout: JSON.stringify(status()), stderr: "x".repeat(256 * 1024 + 1) },
    { status: 0, stdout: JSON.stringify(status("9.9.9")), stderr: "" },
  ]) {
    const run: Run = (command, args, options) => options.env.AI_WORKFLOW_ORCA_MULTI_AGENT ? f.run(command, args, options) : result;
    assert.equal(decideStart({ ...f.options, run }).reason, "worker-orca-unavailable");
  }
});

test("uses only bounded synchronous RuntimeDeps probes when no run override is supplied", (t) => {
  const f = fixture(t);
  f.deps.child.runSync = (command, args, options = {}) => {
    assert.equal(options.shell, false);
    assert.ok(options.timeoutMs && options.timeoutMs <= 4000);
    assert.equal(options.maxBufferBytes, 256 * 1024);
    assert.equal(options.killSignal, "SIGKILL");
    const receipt = f.run(command, args, { cwd: options.cwd ?? "", env: options.env ?? {}, shell: false,
      encoding: "utf8", timeout: options.timeoutMs!, maxBuffer: options.maxBufferBytes!, killSignal: "SIGKILL", windowsHide: true });
    return { status: receipt?.status ?? null, signal: receipt?.signal ?? null,
      stdout: String(receipt?.stdout ?? ""), stderr: String(receipt?.stderr ?? "") };
  };
  assert.equal(decideStart({ ...f.options, run: undefined }).state, "ready");
  f.deps.child.runSync = () => ({ status: null, signal: "SIGKILL", stdout: "", stderr: "", errorCode: "ETIMEDOUT" });
  assert.equal(decideStart({ ...f.options, run: undefined }).reason, "timeout");
  f.deps.child.runSync = () => ({ status: 0, signal: null, stdout: "{}", stderr: "", errorCode: "ENOBUFS" });
  assert.equal(decideStart({ ...f.options, run: undefined }).state, "blocked");
});

// Import mutated source directly from memory: no production file or historical record is rewritten.
async function mutant(before: string, after: string): Promise<typeof import("./orca-start.mts")> {
  let source = base.fs.readFileSync(base.path.join(import.meta.dirname, "orca-start.mts"));
  assert.equal(source.split(before).length, 2, "mutation anchor must be unique");
  source = source.replace(before, after).replace(/from "(\.\/[^\"]+)"/g,
    (_match, relative: string) => `from "${new URL(relative, import.meta.url).href}"`);
  const bun = (globalThis as unknown as { Bun?: { Transpiler: new (options: { loader: string }) => { transformSync(source: string): string } } }).Bun;
  const stripped = bun ? new bun.Transpiler({ loader: "ts" }).transformSync(source)
    : (await import("node:module")).stripTypeScriptTypes(source);
  return await import(`data:text/javascript;base64,${Buffer.from(stripped).toString("base64")}`);
}

test("proves switch, worker and deadline guard assertions reject in-memory mutants", async (t) => {
  const disabled = await mutant('if (!orcaMultiAgentEnabled(options.root, deps, env))', 'if (false)');
  assert.throws(() => assert.equal(disabled.decideStart(offOptions()).state, "off"), /AssertionError/);
  const worker = await mutant('if (options.workerContext === true)', 'if (false)');
  const f = fixture(t);
  assert.throws(() => assert.equal(worker.decideStart({ ...f.options, workerContext: true }).state, "worker"), /AssertionError/);
  const deadline = await mutant('if (!(remaining >= 1) || !Number.isFinite(remaining))', 'if (remaining >= 1 || !Number.isFinite(remaining))');
  assert.throws(() => assert.equal(deadline.decideStart(f.options).state, "ready"), /AssertionError/);
});

test("rejects malformed worker-list pagination objects", (t) => {
  const f = fixture(t);
  for (const page of [undefined, null, [], {}, { hasMore: "false" }, { hasMore: true },
    { hasMore: true, nextCursor: 7 }, { hasMore: true, nextCursor: "" },
    { hasMore: true, nextCursor: "x".repeat(4097) }]) {
    const run: Run = () => ({ status: 0, stderr: "", stdout: JSON.stringify({ ok: true,
      result: { workers: [], page } }) });
    assert.equal(decideStart({ ...f.options, terminalHandle: "agent", run }).reason, "worker-identity-unavailable");
  }
});

test("maps evaluateLaunch gate-error to internal without exposing private details", (t) => {
  const f = fixture(t);
  Object.defineProperty(f.deps.proc.env, "ORCA_WORKER_CONTEXT", { get: () => { throw new Error("private gate error"); } });
  const decision = decideStart(f.options);
  assert.equal(decision.reason, "internal"); assert.equal(decision.state, "blocked");
  assert.doesNotMatch(decision.line, /private gate error|gate-error/);
  assert.equal(f.state.calls.length, 0);
});

test("win32 lookup resolves exe realpath and filters relative and empty PATH entries", async (t) => {
  const f = fixture(t);
  const { win32 } = await import("node:path");
  const candidate = "C:\\trusted\\orca.exe";
  const realpath = "C:\\real\\orca.exe";
  const deps: RuntimeDeps = { ...f.deps, proc: { ...f.deps.proc, platform: "win32",
    env: { ...env, PATH: ".;relative;;C:\\trusted", PRIVATE_TEST_VALUE: "private" } },
    path: { ...f.deps.path, delimiter: ";", isAbsolute: win32.isAbsolute, join: win32.join },
    fs: { ...f.deps.fs,
      statSync: (file) => { if (file !== candidate) throw new Error("missing"); return { ...base.fs.statSync(f.root), isFile: () => true }; },
      accessSync: (file, mode) => { assert.equal(file, candidate); assert.equal(mode, f.deps.fs.constants.F_OK); },
      realpathSync: (file) => { assert.equal(file, candidate); return realpath; },
    },
  };
  f.state.workers = [{ agentTerminalHandle: "agent", dispatchStatus: "running" }];
  assert.equal(decideStart({ ...f.options, deps, terminalHandle: "agent" }).state, "worker");
  assert.equal(f.state.calls.length, 1); assert.equal(f.state.calls[0].command, realpath);
  assert.deepEqual(f.state.calls[0].options.env, { PATH: "C:\\trusted", HOME: env.HOME });
});

test("real probes never execute forged orca in project root, relative or empty PATH entries", (t) => {
  const markerName = "forged-executed";
  const forged = `#!${process.execPath}\nrequire('fs').writeFileSync('${markerName}', 'executed');\nconsole.log(JSON.stringify({ok:true,result:{workers:[{agentTerminalHandle:'agent',dispatchStatus:'running'}],page:{hasMore:false}}}));\n`;
  const trusted = `#!${process.execPath}
const args = process.argv.slice(2);
let value;
if (args[0] === 'orchestration') value = {ok:true,result:{workers:[],page:{hasMore:false}}};
else if (args[0] === 'skills') value = args[2] === 'orca-cli' ? {name:'orca-cli',markdown:'worktree current terminal'} : {name:'orchestration',markdown:'worker-start worker_done orchestration check'};
else value = ${JSON.stringify(status())};
console.log(JSON.stringify(value));
`;
  const policy = structuredClone(example); policy["use-orca-orchestration"] = true;
  const root = tempFixture(base, {
    ".project/orchestration.json": JSON.stringify(policy),
    "orca": { content: forged, mode: 0o755 }, "relative/orca": { content: forged, mode: 0o755 },
    "bin/orca": { content: trusted, mode: 0o755 }, "bin/codex": { content: trusted, mode: 0o755 },
    "bin/opencode": { content: trusted, mode: 0o755 },
  });
  t.after(() => base.fs.rmSync(root, { recursive: true, force: true }));
  const executable = base.fs.realpathSync(base.path.join(root, "bin/orca"));
  for (const prefix of [".", "relative", "", ".:relative:"]) {
    const deps = createTestDeps({ ...env, PATH: `${prefix}:${root}/bin`, ORCA_CLI_COMMAND: executable,
      ORCA_TERMINAL_HANDLE: "agent", PRIVATE_TEST_VALUE: "private" });
    const calls: Array<{ command: string; args: string[]; options: RunOptions }> = [];
    const run: Run = (command, args, options) => {
      calls.push({ command, args, options });
      return deps.child.runSync(command, args, { cwd: options.cwd, env: options.env, shell: false,
        timeoutMs: options.timeout, maxBufferBytes: options.maxBuffer, killSignal: options.killSignal });
    };
    assert.equal(decideStart({ root, phase: "shape", vendor: "claude", deps, run }).state, "ready", prefix);
    const probes = calls.filter((call) => call.args[0] === "orchestration" || !call.options.env.AI_WORKFLOW_ORCA_MULTI_AGENT);
    assert.equal(probes.length, 2);
    for (const probe of probes) {
      assert.equal(probe.command, executable);
      assert.deepEqual(probe.options.env, { PATH: `${root}/bin`, HOME: env.HOME, ORCA_TERMINAL_HANDLE: "agent" });
    }
    assert.equal(base.fs.existsSync(base.path.join(root, markerName)), false, prefix);
  }
  base.fs.unlinkSync(base.path.join(root, ".project/orchestration.json"));
  // With no override, identity lookup must resolve the bare command itself before spawning.
  for (const prefix of [".", "relative", "", ".:relative:"]) {
    const deps = createTestDeps({ ...env, PATH: `${prefix}:${root}/bin`, ORCA_TERMINAL_HANDLE: "agent" });
    assert.equal(decideStart({ root, phase: "shape", vendor: "claude", deps }).reason, "policy-missing", prefix);
    assert.equal(base.fs.existsSync(base.path.join(root, markerName)), false, prefix);
  }
  base.fs.writeFileSync(executable, trusted.replace('workers:[]', "workers:[{agentTerminalHandle:'agent',dispatchStatus:'running'}]"));
  const deps = createTestDeps({ ...env, PATH: `relative::${root}/bin`, ORCA_TERMINAL_HANDLE: "agent" });
  assert.equal(decideStart({ root, phase: "shape", vendor: "claude", deps }).state, "worker");
  assert.equal(base.fs.existsSync(base.path.join(root, markerName)), false);
});
