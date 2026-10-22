import assert from "node:assert/strict";
import { test } from "node:test";

import { createTestDeps, tempFixture, spawnSync, urlPath } from "../../scripts/runtime/test-helpers.mts";
import { applyEvent, blankState, normalizeEvent, validState, readWorkflowState, STATE_FILE } from "../../scripts/workflow-metrics-state.mts";
import { resolvePhaseContext } from "./token-consumption.mts";
import { CAPTURE_MESSAGES, captureWorkflowEvent, main, mapClaudeEvent, mapOpenCodeEvent } from "./workflow-capture.mts";

import type { TestContext } from "node:test";
import type { RuntimeDeps } from "../../scripts/runtime/types.mts";
import type { CaptureEvent, CaptureResolver } from "./workflow-capture.mts";

const NOW = Date.parse("2026-10-20T12:00:00.000Z");
const CONTEXT = { pitch: "capture-fixture", phase: "build", scope: "S2" };
const resolve: CaptureResolver = () => CONTEXT;
const claude = (name: string, fields: Record<string, unknown> = {}): Record<string, unknown> =>
  ({ hook_event_name: name, session_id: "session-one", prompt_id: "prompt-one", ...fields });
const openCode = (type: string, fields: Record<string, unknown> = {}): Record<string, unknown> =>
  ({ type, data: { sessionID: "session-one", assistantMessageID: "step-one", ...fields } });
function noLabels(events: CaptureEvent[]): void {
  assert.ok(events.length > 0);
  for (const event of events) for (const field of ["pitch", "phase", "scope"]) assert.equal(Object.hasOwn(event, field), false);
}
function select(events: CaptureEvent[]): unknown[] {
  return events.map(({ eventId: _id, occurredAt: _at, source: _source, vendor: _vendor, sessionId: _session, ...activity }) => activity);
}

test("maps startup, resume and clear to one session start, excluding compaction and unknown sources", () => {
  for (const source of ["startup", "resume", "clear"]) {
    const events = mapClaudeEvent(claude("SessionStart", { source }), resolve, NOW);
    assert.deepEqual(select(events), [{ kind: "session.started" }]);
    assert.equal(events[0].vendor, "claude"); assert.equal(events[0].source, "native");
    assert.equal(events[0].occurredAt, new Date(NOW).toISOString());
  }
  for (const source of ["compact", "unknown", null, {}, 1, undefined]) assert.deepEqual(mapClaudeEvent(claude("SessionStart", { source }), resolve, NOW), []);
});

test("maps primary submit and Stop with the same prompt identity and no labels", () => {
  const start = mapClaudeEvent(claude("UserPromptSubmit"), resolve, NOW);
  const finish = mapClaudeEvent(claude("Stop", { stop_hook_active: false }), resolve, NOW + 1000);
  assert.deepEqual(select(start), [{ kind: "agent.started", activityId: "turn:prompt-one", agentKind: "primary" }]);
  assert.deepEqual(select(finish), [{ kind: "agent.finished", activityId: "turn:prompt-one", agentKind: "primary", outcome: "completed" }]);
  noLabels(start); noLabels(finish);
  assert.equal(Object.hasOwn(start[0], "outcome"), false);
  const fallback = claude("UserPromptSubmit"); delete fallback.prompt_id;
  const fallbackStop = claude("Stop"); delete fallbackStop.prompt_id;
  assert.deepEqual(select(mapClaudeEvent(fallback, resolve, NOW)), [{ kind: "agent.started", activityId: "turn:session-one", agentKind: "primary" }]);
  assert.deepEqual(select(mapClaudeEvent(fallbackStop, resolve, NOW)), [{ kind: "agent.finished", activityId: "turn:session-one", agentKind: "primary", outcome: "completed" }]);
});

test("maps a subagent start and finish as separate units without primary labels or a fabricated finish", () => {
  const start = mapClaudeEvent(claude("SubagentStart", { agent_id: "agent-one", agent_type: "worker" }), resolve, NOW);
  const finish = mapClaudeEvent(claude("SubagentStop", { agent_id: "agent-one" }), resolve, NOW + 1000);
  assert.deepEqual(select(start), [{ kind: "agent.started", activityId: "agent-one", agentKind: "subagent" }]);
  assert.deepEqual(select(finish), [{ kind: "agent.finished", activityId: "agent-one", agentKind: "subagent", outcome: "completed" }]);
  noLabels(start); noLabels(finish);
  assert.equal(Object.hasOwn(start[0], "outcome"), false);
});

test("maps both phase entry paths through only the injected resolver and copies only its labels", () => {
  const calls: unknown[][] = [];
  const spy: CaptureResolver = (name, args) => { calls.push([name, args]); return { ...CONTEXT, extra: "CAPTURE-TEXT-MARKER" }; };
  const inputs = [claude("UserPromptExpansion", { expansion_type: "slash_command", command_name: "build", command_args: "capture-fixture S2" }),
    claude("PostToolUse", { tool_name: "Skill", tool_input: { skill: "build", args: "capture-fixture S2" } })];
  for (const input of inputs) {
    const events = mapClaudeEvent(input, spy, NOW);
    assert.deepEqual(select(events), [{ kind: "phase.started", activityId: "segment:session-one", ...CONTEXT }]);
    assert.equal(Object.hasOwn(events[0], "outcome"), false);
    assert.doesNotMatch(JSON.stringify(events), /CAPTURE-TEXT-MARKER/);
  }
  assert.deepEqual(calls, [["build", "capture-fixture S2"], ["build", "capture-fixture S2"]]);
  assert.deepEqual(mapClaudeEvent(inputs[0], () => null, NOW), []);
  assert.deepEqual(mapClaudeEvent(claude("UserPromptExpansion", { expansion_type: "other", command_name: "build" }), spy, NOW), []);
  assert.deepEqual(mapClaudeEvent(claude("PostToolUse", { tool_name: "Read", tool_input: { skill: "build" } }), spy, NOW), []);
});

test("SessionEnd emits two distinct cancelled units without labels or the resolver", () => {
  const events = mapClaudeEvent(claude("SessionEnd"), () => { throw new Error("must not resolve"); }, NOW);
  assert.deepEqual(select(events), [
    { kind: "agent.finished", activityId: "turn:prompt-one", agentKind: "primary", outcome: "cancelled" },
    { kind: "phase.finished", activityId: "segment:session-one", outcome: "cancelled" },
  ]);
  noLabels(events);
  assert.notEqual(events[0].eventId, events[1].eventId);
});

test("ignores primary and phase events in a subagent, active Stop continuations and malformed fields", () => {
  const phase = { expansion_type: "slash_command", command_name: "build", tool_name: "Skill", tool_input: { skill: "build" } };
  for (const name of ["SessionStart", "UserPromptSubmit", "Stop", "SessionEnd", "UserPromptExpansion", "PostToolUse"]) {
    for (const agent_id of ["agent-one", null, undefined]) assert.deepEqual(mapClaudeEvent(claude(name, { ...phase, source: "startup", agent_id }), resolve, NOW), []);
  }
  for (const stop_hook_active of [true, "false", 0, null, {}]) assert.deepEqual(mapClaudeEvent(claude("Stop", { stop_hook_active }), resolve, NOW), []);
  for (const name of ["SubagentStart", "SubagentStop"]) for (const agent_id of [null, "", 1, "x".repeat(97), "with spaces"])
    assert.deepEqual(mapClaudeEvent(claude(name, { agent_id }), resolve, NOW), []);
  for (const payload of [null, [], 1, "text", {}, claude("Unknown"), claude("Stop", { session_id: 1 }), claude("Stop", { prompt_id: null }),
    claude("Stop", { session_id: "x".repeat(97) }), claude("Stop", { prompt_id: "x".repeat(97) }), claude("Stop", { session_id: "s\n" })]) assert.deepEqual(mapClaudeEvent(payload, resolve, NOW), []);
  for (const now of [NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER, 8_640_000_000_000_000]) assert.deepEqual(mapClaudeEvent(claude("Stop"), resolve, now), []);
});

test("does not read text fields, passes arguments only to the resolver, and keeps outputs marker-free", () => {
  const marker = "CAPTURE-TEXT-MARKER";
  const rows = [claude("UserPromptSubmit"), claude("Stop"), claude("SessionEnd"), claude("SubagentStart", { agent_id: "a" }),
    claude("SubagentStop", { agent_id: "a" }), claude("UserPromptExpansion", { expansion_type: "slash_command", command_name: "build", command_args: `capture-fixture S2 ${marker}` }),
    claude("PostToolUse", { tool_name: "Skill", tool_input: { skill: "build", args: `capture-fixture S2 ${marker}` } })];
  for (const row of rows) {
    const marked = { ...row, prompt: marker, last_assistant_message: marker, transcript_path: marker, agent_transcript_path: marker };
    assert.doesNotMatch(JSON.stringify(mapClaudeEvent(marked, resolve, NOW)), /CAPTURE-TEXT-MARKER/);
    for (const field of ["prompt", "last_assistant_message", "transcript_path", "agent_transcript_path"]) {
      Object.defineProperty(marked, field, { get: () => { throw new Error("text field read"); } });
    }
    assert.ok(mapClaudeEvent(marked, resolve, NOW).length > 0, "ignored text getters must never be evaluated");
  }
  let seen: unknown;
  mapClaudeEvent(rows[5], (_name, args) => { seen = args; return CONTEXT; }, NOW);
  assert.equal(seen, `capture-fixture S2 ${marker}`);
  const failOnUse: CaptureResolver = () => { throw new Error("turn called resolver"); };
  noLabels(mapClaudeEvent(claude("Stop"), failOnUse, NOW));
  const before = mapClaudeEvent(claude("Stop"), () => CONTEXT, NOW);
  const after = mapClaudeEvent(claude("Stop"), () => ({ pitch: "changed", phase: "audit", scope: "S9" }), NOW);
  assert.deepEqual(after, before);
});

test("deduplicates identical selected metadata and clock inputs, and distinguishes hook kinds and time", () => {
  const first = mapClaudeEvent(claude("UserPromptSubmit"), resolve, NOW);
  assert.deepEqual(mapClaudeEvent({ ...claude("UserPromptSubmit"), prompt: "ignored text" }, resolve, NOW), first);
  assert.notEqual(mapClaudeEvent(claude("Stop"), resolve, NOW)[0].eventId, first[0].eventId);
  assert.notEqual(mapClaudeEvent(claude("UserPromptSubmit"), resolve, NOW + 1)[0].eventId, first[0].eventId);
  assert.match(first[0].eventId, /^[a-f0-9]{64}$/);
});

test("rejects oversized invocation metadata and unvalidated resolver labels, and contains resolver/accessor failures", () => {
  const input = claude("UserPromptExpansion", { expansion_type: "slash_command", command_name: "build" });
  for (const fields of [{ command_name: "x".repeat(81) }, { command_args: "x".repeat(65537) }, { command_args: {} }])
    assert.deepEqual(mapClaudeEvent({ ...input, ...fields }, resolve, NOW), []);
  for (const fields of [{ pitch: "CAPTURE-TEXT-MARKER" }, { phase: "CAPTURE-TEXT-MARKER" }, { scope: "S1234" }, { pitch: "valid\n" }, { phase: "build\n" }, { scope: "S1\n" }])
    assert.deepEqual(mapClaudeEvent(input, () => ({ ...CONTEXT, ...fields }), NOW), []);
  assert.deepEqual(mapClaudeEvent(input, () => { throw new Error("private resolver failure"); }, NOW), []);
  const hostile = Object.defineProperty({ hook_event_name: "Stop" }, "session_id", { get: () => { throw new Error("private accessor failure"); } });
  assert.deepEqual(mapClaudeEvent(hostile, resolve, NOW), []);
  assert.deepEqual(select(mapClaudeEvent(input, () => ({ pitch: "(unattributed)", phase: "build", scope: "(none)" }), NOW)),
    [{ kind: "phase.started", activityId: "segment:session-one", pitch: "(unattributed)", phase: "build", scope: "(none)" }]);
});

test("maps V2 steps to matched active intervals without asserting a user-turn or wait boundary", () => {
  let collectorAt = NOW;
  const base = createTestDeps(), deps = { ...base, clock: { ...base.clock, now: () => collectorAt } }, state = blankState(deps);
  for (const [type, time] of [["session.step.started", NOW], ["session.step.ended", NOW + 1000],
    ["session.step.started", NOW + 2000], ["session.step.failed", NOW + 3000]] as const) {
    collectorAt = time;
    const events = mapOpenCodeEvent(openCode(type), resolve, time);
    assert.equal(events.length, 1); noLabels(events);
    assert.equal(events[0].vendor, "opencode");
    assert.equal("agentKind" in events[0] && events[0].agentKind, "unknown");
    assert.equal(applyEvent(state, normalizeEvent(events[0], deps), deps).written, true);
  }
  assert.equal(state.totals.matchedFinishes, 2);
  assert.equal(state.usage.total.activeMs, 2000);
  assert.equal(state.usage.total.waitMs, 0);
  assert.equal(state.usage.total.turnsStarted, 0);
  assert.equal(state.totals.outcomes.failed, 1);
  assert.equal(validState(JSON.parse(JSON.stringify(state))), true);
  assert.equal(Object.hasOwn(mapOpenCodeEvent(openCode("session.step.started"), resolve, NOW)[0], "outcome"), false);
});

test("maps OpenCode skill metadata through the resolver and ignores V1 messages and unverified user events", () => {
  let call: unknown[] = [];
  const spy: CaptureResolver = (name, args) => { call = [name, args]; return CONTEXT; };
  const event = openCode("tool.execute.after", { tool: "skill", input: { name: "build", args: "CAPTURE-TEXT-MARKER" } });
  assert.deepEqual(select(mapOpenCodeEvent(event, spy, NOW)), [{ kind: "phase.started", activityId: "segment:session-one", ...CONTEXT }]);
  assert.deepEqual(call, ["build", undefined]);
  assert.deepEqual(mapOpenCodeEvent(event, () => null, NOW), []);
  for (const payload of [{ type: "message.updated", properties: { info: { role: "user", time: { created: NOW }, text: "CAPTURE-TEXT-MARKER" } } },
    { type: "message.updated", properties: { info: { role: "assistant", time: { completed: NOW } } } },
    openCode("message.updated"), openCode("session.idle"), openCode("tool.execute.after", { tool: "read", input: { name: "build" } })])
    assert.deepEqual(mapOpenCodeEvent(payload, resolve, NOW), []);
});

test("ignores malformed OpenCode events and does not leak step text or error values", () => {
  for (const payload of [null, [], {}, { type: 1 }, { type: "session.step.started", data: null },
    openCode("session.step.started", { sessionID: 1 }), openCode("session.step.started", { assistantMessageID: {} }),
    openCode("session.step.started", { assistantMessageID: "x".repeat(97) }), openCode("unknown"),
    openCode("tool.execute.after", { tool: "skill", input: null })]) assert.deepEqual(mapOpenCodeEvent(payload, resolve, NOW), []);
  for (const type of ["session.step.started", "session.step.ended", "session.step.failed"]) {
    const events = mapOpenCodeEvent(openCode(type, { text: "CAPTURE-TEXT-MARKER", error: "CAPTURE-TEXT-MARKER" }), resolve, NOW);
    assert.equal(events.length, 1);
    assert.doesNotMatch(JSON.stringify(events), /CAPTURE-TEXT-MARKER/);
  }
});

function captureFixture(t: TestContext) {
  const base = createTestDeps(), root = tempFixture(base, { ".project/pitches/capture-fixture/pitch.md": "# Fixture\n" });
  t.after(() => base.fs.rmSync(root, { recursive: true, force: true }));
  let input = "{}", wall = NOW, mono = 0, stdout = "", stderr = "", leases = 0, releases = 0, readLimit = 0;
  const reads: string[] = [];
  const free: RuntimeDeps["net"]["tryListen"] = async () => ({ server: { close: async () => { releases++; } } });
  let listen = free;
  const deps: RuntimeDeps = { ...base,
    clock: { ...base.clock, now: () => wall, monotonicMs: () => mono, sleep: async ms => { mono += ms; } },
    net: { ...base.net, tryListen: async options => { leases++; return listen(options); } },
    fs: { ...base.fs, readFileSync: name => { reads.push(name); return base.fs.readFileSync(name); } },
    io: { ...base.io, stdout: { ...base.io.stdout, write: text => { stdout += text; } }, stderr: { ...base.io.stderr, write: text => { stderr += text; } },
      stdin: { readText: async limit => { readLimit = limit ?? 0; return input; } } },
  };
  const directory = base.path.join(root, ".project/metrics"), file = base.path.join(directory, STATE_FILE);
  async function raw(text: string, argv = ["--vendor", "claude", "--root", root]): Promise<number> {
    input = text; stdout = ""; stderr = "";
    return main(argv, deps);
  }
  function state() {
    const result = readWorkflowState(directory, deps, new Date(wall).toISOString());
    assert.equal(result.status, "valid");
    if (result.status !== "valid") throw new Error("invalid fixture state");
    return result.state;
  }
  return { deps, root, directory, file, state, raw, run: (payload: unknown) => raw(JSON.stringify(payload)),
    at: (time: number) => { wall = time; }, advance: (ms: number) => { mono += ms; },
    bind: (fn = free) => { listen = fn; },
    get stdout() { return stdout; }, get stderr() { return stderr; }, get leases() { return leases; },
    get releases() { return releases; }, get readLimit() { return readLimit; }, reads,
  };
}
function fixedOutput(h: ReturnType<typeof captureFixture>): void {
  assert.equal(h.stdout, "");
  assert.ok(h.stderr === "" || Object.values(CAPTURE_MESSAGES).includes(h.stderr as typeof CAPTURE_MESSAGES[keyof typeof CAPTURE_MESSAGES]), h.stderr);
  assert.doesNotMatch(h.stderr, /CAPTURE-TEXT-MARKER|LEGACY-MARKER/);
}
function metricTexts(h: ReturnType<typeof captureFixture>, directory = h.directory): string[] {
  if (!h.deps.fs.existsSync(directory)) return [];
  return h.deps.fs.readdirSync(directory).flatMap(name => {
    const file = h.deps.path.join(directory, name);
    return h.deps.fs.statSync(file).isDirectory() ? metricTexts(h, file) : [h.deps.fs.readFileSync(file)];
  });
}

test("main rejects malformed and oversized stdin with fixed diagnostics and no stdout or lease", async t => {
  const h = captureFixture(t);
  for (const text of ["{", "null", "[]", "1", '"CAPTURE-TEXT-MARKER"', "{}", '{"hook_event_name":"unknown","session_id":"session-one"}',
    JSON.stringify({ padding: "x".repeat(65536) }), JSON.stringify({ padding: "🙂".repeat(20000) }), '{"__proto__":{"kind":"agent.started"}}']) {
    assert.equal(await h.raw(text), 0); fixedOutput(h);
    if (new TextEncoder().encode(text).length > 64 * 1024) assert.equal(h.stderr, CAPTURE_MESSAGES.input);
  }
  assert.equal(h.readLimit, 64 * 1024); assert.equal(h.leases, 0);
  assert.equal(h.deps.fs.existsSync(h.directory), false);
  h.deps.io.stdin.readText = async () => { throw new Error("CAPTURE-TEXT-MARKER/private/input"); };
  assert.equal(await h.raw("{}"), 0); fixedOutput(h);
  assert.equal(h.stderr, CAPTURE_MESSAGES.input);
});

test("main validates vendor and root arguments without consuming stdin or trusting payload paths", async t => {
  const h = captureFixture(t);
  for (const argv of [[], ["--vendor"], ["--vendor", "codex"], ["--vendor", "opencode"], ["--vendor", "cursor"],
    ["--vendor", "claude", "--vendor", "claude"], ["--unknown", "x"], ["--vendor", "claude", "--root"],
    ["--vendor", "claude", "--root", h.root, "--root", h.root]]) {
    assert.equal(await h.raw("{}", argv), 0); assert.equal(h.stderr, CAPTURE_MESSAGES.arguments); fixedOutput(h);
  }
  assert.equal(h.readLimit, 0); assert.equal(h.leases, 0);
  assert.equal(await h.run(claude("SessionStart", { source: "startup", cwd: "CAPTURE-TEXT-MARKER", root: "CAPTURE-TEXT-MARKER" })), 0);
  assert.equal(h.state().totals.events["session.started"], 1); fixedOutput(h);
  h.deps.proc.cwd = () => { throw new Error("CAPTURE-TEXT-MARKER/private/cwd"); };
  assert.equal(await h.raw(JSON.stringify(claude("SessionStart", { source: "startup" })), ["--vendor", "claude"]), 0);
  assert.equal(h.stderr, CAPTURE_MESSAGES.unavailable); fixedOutput(h);
});

test("main returns before the lease for non-phase expansions and skill calls", async t => {
  const h = captureFixture(t);
  for (const payload of [claude("UserPromptExpansion", { expansion_type: "slash_command", command_name: "not-a-phase", command_args: "CAPTURE-TEXT-MARKER" }),
    claude("PostToolUse", { tool_name: "Skill", tool_input: { skill: "not-a-phase", args: "CAPTURE-TEXT-MARKER" } })]) {
    assert.equal(await h.run(payload), 0); fixedOutput(h);
    assert.equal(h.leases, 0); assert.equal(h.deps.fs.existsSync(h.directory), false);
  }
});

test("main accepts an identical replay without changing state bytes or reporting an error", async t => {
  const h = captureFixture(t), payload = claude("SessionStart", { source: "startup" });
  assert.equal(await h.run(payload), 0);
  const before = h.deps.fs.readFileSync(h.file);
  assert.equal(await h.run(payload), 0);
  assert.equal(h.deps.fs.readFileSync(h.file), before);
  assert.equal(h.state().totals.events["session.started"], 1);
  assert.equal(h.stderr, ""); fixedOutput(h);
});

test("main records a full marked Claude lifecycle with strict state and never reads the token snapshot", async t => {
  const h = captureFixture(t), marker = "CAPTURE-TEXT-MARKER";
  h.deps.fs.mkdirSync(h.directory);
  const legacy = h.deps.path.join(h.directory, "token-consumption.json"); h.deps.fs.writeFileSync(legacy, "LEGACY-MARKER");
  const events = [claude("SessionStart", { source: "startup" }),
    claude("UserPromptExpansion", { expansion_type: "slash_command", command_name: "build", command_args: `capture-fixture S3 ${marker}` }),
    claude("UserPromptSubmit"), claude("SubagentStart", { agent_id: "sub-one" }), claude("SubagentStop", { agent_id: "sub-one" }),
    claude("Stop"), claude("UserPromptSubmit", { prompt_id: "prompt-two" }), claude("SessionEnd", { prompt_id: "prompt-two" })];
  for (const [i, payload] of events.entries()) {
    h.at(NOW + i * 1000);
    assert.equal(await h.run({ ...payload, prompt: marker, last_assistant_message: marker, transcript_path: marker, agent_transcript_path: marker }), 0);
    fixedOutput(h);
  }
  assert.equal(h.reads.some(name => name.endsWith("token-consumption.json")), false);
  const state = h.state(); assert.equal(state.totals.primaryFinishes, 2); assert.equal(state.totals.subagentFinishes, 1);
  assert.equal(state.totals.matchedFinishes, 4); assert.equal(state.usage.total.activeMs, 4000); assert.equal(state.usage.total.waitMs, 1000);
  assert.equal(Object.keys(state.pending).length, 0); assert.equal(validState(state), true);
  assert.equal(h.leases, 9); assert.equal(h.releases, 9);
  assert.doesNotMatch(metricTexts(h).join("\n"), /CAPTURE-TEXT-MARKER/);
  assert.equal(h.deps.fs.readFileSync(legacy), "LEGACY-MARKER");
});

test("main uses the real resolver for both invocation paths and preserves its fallback sentinels", async t => {
  const h = captureFixture(t);
  for (const [i, slug] of ["capture-fixture", "missing-fixture"].entries()) {
    const args = `${slug} S3 CAPTURE-TEXT-MARKER`, expected = resolvePhaseContext("build", args, h.root, h.deps)!;
    h.at(NOW + i * 1000);
    assert.equal(await h.run(claude("UserPromptExpansion", { expansion_type: "slash_command", command_name: "build", command_args: args })), 0);
    const pending = Object.values(h.state().pending).find(p => p.kind === "phase")!;
    assert.deepEqual({ pitch: pending.pitch, phase: pending.phase, scope: pending.scope }, expected); fixedOutput(h);
  }
  h.at(NOW + 2000);
  const expected = resolvePhaseContext("audit", "capture-fixture S4", h.root, h.deps)!;
  assert.equal(await h.run(claude("PostToolUse", { tool_name: "Skill", tool_input: { skill: "audit", args: "capture-fixture S4" } })), 0);
  const pending = Object.values(h.state().pending).find(p => p.kind === "phase")!;
  assert.deepEqual({ pitch: pending.pitch, phase: pending.phase, scope: pending.scope }, expected);
  assert.doesNotMatch(metricTexts(h).join("\n"), /CAPTURE-TEXT-MARKER/); fixedOutput(h);
});

test("main retries one refused lease and counts A1's refused attempt on the recovered write", async t => {
  const h = captureFixture(t);
  assert.equal(await h.run(claude("SessionStart", { source: "startup" })), 0);
  const before = h.leases; let calls = 0;
  h.bind(async () => { calls++; h.advance(1000); return calls === 1 ? { busy: true as const } : { server: { close: async () => {} } }; });
  h.at(NOW + 1000);
  assert.equal(await h.run(claude("UserPromptSubmit")), 0);
  assert.equal(h.leases - before, 2); assert.equal(calls, 2);
  assert.equal(h.state().usage.health.captureDropped, 1);
  assert.equal(h.state().totals.events["agent.started"], 1);
  assert.equal(h.stderr, ""); fixedOutput(h);
});

test("main stops after two busy writer calls, preserves state bytes and sweeps markers on recovery", async t => {
  const h = captureFixture(t);
  await h.run(claude("SessionStart", { source: "startup" }));
  const bytes = h.deps.fs.readFileSync(h.file), before = h.leases;
  h.bind(async () => { h.advance(1000); return { busy: true as const }; }); h.at(NOW + 1000);
  assert.equal(await h.run(claude("UserPromptSubmit")), 0);
  assert.equal(h.leases - before, 2); assert.equal(h.stderr, CAPTURE_MESSAGES.busy); fixedOutput(h);
  assert.equal(h.deps.fs.readFileSync(h.file), bytes);
  assert.equal(h.deps.fs.readFileSync(h.deps.path.join(h.directory, "workflow-usage.dropped")), "xx");
  h.bind(); h.at(NOW + 2000);
  await h.run(claude("SessionStart", { source: "resume" }));
  assert.equal(h.state().usage.health.captureDropped, 2);
  assert.equal(h.deps.fs.existsSync(h.deps.path.join(h.directory, "workflow-usage.dropped")), false);
  assert.doesNotMatch(metricTexts(h).join("\n"), /CAPTURE-TEXT-MARKER/); fixedOutput(h);
});

test("main checks the shared budget before acquiring or retrying and never leaves a temp file", async t => {
  const h = captureFixture(t);
  await h.run(claude("SessionStart", { source: "startup" }));
  const before = h.leases, bytes = h.deps.fs.readFileSync(h.file);
  h.deps.io.stdin.readText = async () => { h.advance(3001); return JSON.stringify(claude("UserPromptSubmit")); };
  assert.equal(await h.raw("{}"), 0);
  assert.equal(h.leases, before); assert.equal(h.stderr, CAPTURE_MESSAGES.deadline); fixedOutput(h);
  assert.equal(h.deps.fs.readFileSync(h.file), bytes);
  assert.equal(h.deps.fs.readdirSync(h.directory).some(name => name.endsWith(".tmp")), false);
  const retry = captureFixture(t); await retry.run(claude("SessionStart", { source: "startup" }));
  const seedCalls = retry.leases;
  retry.bind(async () => { retry.advance(3500); return { busy: true as const }; }); retry.at(NOW + 1000);
  assert.equal(await retry.run(claude("UserPromptSubmit")), 0);
  assert.equal(retry.leases - seedCalls, 1); assert.equal(retry.stderr, CAPTURE_MESSAGES.deadline); fixedOutput(retry);
});

test("main does not cancel an acquired lease when the clock crosses the hook budget during the write", async t => {
  const h = captureFixture(t); let released = false;
  h.bind(async () => { h.advance(10000); return { server: { close: async () => { released = true; } } }; });
  assert.equal(await h.run(claude("SessionStart", { source: "startup" })), 0);
  assert.equal(h.state().totals.events["session.started"], 1); assert.equal(released, true);
  assert.equal(h.stderr, ""); assert.equal(h.deps.fs.readdirSync(h.directory).some(name => name.endsWith(".tmp")), false); fixedOutput(h);
});

test("main attempts the independent SessionEnd segment close after a failed turn write", async t => {
  const h = captureFixture(t);
  await h.run(claude("UserPromptExpansion", { expansion_type: "slash_command", command_name: "build", command_args: "capture-fixture S3" }));
  h.at(NOW + 1000); await h.run(claude("UserPromptSubmit"));
  const before = h.leases, write = h.deps.fs.writeFileSync; let failed = false;
  h.deps.fs.writeFileSync = (file, content, options) => {
    if (typeof file === "number" && !failed) { failed = true; throw new Error("CAPTURE-TEXT-MARKER/turn-write"); }
    return write(file, content, options);
  };
  h.at(NOW + 2000);
  assert.equal(await h.run(claude("SessionEnd")), 0);
  assert.equal(h.leases - before, 2); assert.equal(h.stderr, CAPTURE_MESSAGES.unavailable); fixedOutput(h);
  const state = h.state(); assert.equal(state.totals.events["phase.finished"], 1);
  assert.deepEqual(Object.values(state.pending).map(p => p.kind), ["agent"]);
  assert.equal(h.deps.fs.readdirSync(h.directory).some(name => name.endsWith(".tmp")), false);
});

test("main contains writer failures, does not retry non-busy failures and tolerates a closed diagnostic stream", async t => {
  const h = captureFixture(t), write = h.deps.fs.writeFileSync;
  h.deps.fs.writeFileSync = (file, content, options) => {
    if (typeof file === "number") throw Object.assign(new Error("CAPTURE-TEXT-MARKER/private/output"), { code: "EACCES" });
    return write(file, content, options);
  };
  assert.equal(await h.run(claude("SessionStart", { source: "startup" })), 0);
  assert.equal(h.leases, 1); assert.equal(h.releases, 1); assert.equal(h.stderr, CAPTURE_MESSAGES.unavailable); fixedOutput(h);
  assert.equal(h.deps.fs.readdirSync(h.directory).some(name => name.endsWith(".tmp")), false);
  h.deps.io.stderr.write = () => { throw new Error("CAPTURE-TEXT-MARKER/closed stream"); };
  assert.equal(await h.raw("malformed"), 0);
});

test("in-process capture shares the writer boundary and contains unexpected dependency failures", async t => {
  const h = captureFixture(t);
  await captureWorkflowEvent("opencode", openCode("session.step.started"), h.root, h.deps);
  h.at(NOW + 1000);
  await captureWorkflowEvent("opencode", openCode("session.step.ended"), h.root, h.deps);
  assert.equal(h.state().totals.matchedFinishes, 1); assert.equal(h.state().usage.total.waitMs, 0); fixedOutput(h);
  h.deps.clock.monotonicMs = () => { throw new Error("CAPTURE-TEXT-MARKER/private/clock"); };
  await captureWorkflowEvent("opencode", {}, h.root, h.deps);
  assert.equal(h.stderr, CAPTURE_MESSAGES.unavailable); fixedOutput(h);
});

const CAPTURE_COMMAND = 'AI_WORKFLOW_RUNNER=node node --experimental-strip-types --disable-warning=ExperimentalWarning "$CLAUDE_PROJECT_DIR/ai-framework/hooks/scripts/workflow-capture.mts" --vendor claude --root "$CLAUDE_PROJECT_DIR"';
const CAPTURE_REGISTRATIONS: Record<string, string> = { SessionStart: "*", UserPromptSubmit: "*", Stop: "*", SessionEnd: "*",
  SubagentStop: "*", SubagentStart: "*", UserPromptExpansion: "*", PostToolUse: "Skill" };
interface CaptureHookGroup { matcher?: string; description?: string; hooks: { type: string; command: string; timeout?: number }[] }
function captureSettings(relative: string): Record<string, CaptureHookGroup[]> {
  const deps = createTestDeps(), root = urlPath(new URL("../../../", import.meta.url));
  return (JSON.parse(deps.fs.readFileSync(deps.path.join(root, relative))) as { hooks: Record<string, CaptureHookGroup[]> }).hooks;
}

test("wires exactly eight matching capture-only groups with identical commands, timeouts and descriptions", () => {
  const live = captureSettings(".claude/settings.json"), template = captureSettings("ai-framework/hooks/hooks.json");
  const captureGroup = (group: CaptureHookGroup): boolean => group.hooks.some(hook => hook.command.includes("workflow-capture.mts"));
  for (const [event, matcher] of Object.entries(CAPTURE_REGISTRATIONS)) {
    const groups = live[event].filter(captureGroup), mirrored = template[event].filter(captureGroup);
    assert.equal(groups.length, 1, event); assert.deepEqual(groups, mirrored, event);
    assert.equal(groups[0].matcher, matcher, event); assert.ok(groups[0].description, event);
    assert.deepEqual(groups[0].hooks, [{ type: "command", command: CAPTURE_COMMAND, timeout: 5 }], event);
    assert.equal(live[event].at(-1), groups[0], "capture follows existing registrations");
    assert.equal(template[event].at(-1), mirrored[0], "template capture follows existing registrations");
  }
  for (const hooks of [live, template]) {
    const all = Object.entries(hooks).flatMap(([event, groups]) => groups.filter(captureGroup).map(() => event));
    assert.deepEqual(all.sort(), Object.keys(CAPTURE_REGISTRATIONS).sort());
    assert.ok(hooks.Stop.some(group => group.hooks.some(hook => hook.command.includes("token-consumption.mts") && hook.command.includes("--event session-turn"))));
  }
  assert.ok(live.PreToolUse[0].hooks[0].command.includes("orca-start-hook.mts"));
  assert.ok(live.UserPromptExpansion[0].hooks[0].command.includes("orca-start-hook.mts"));
});

test("runs the exact registered shell command with only Node available despite Bun settings, and fails non-blockingly without Node", t => {
  const h = captureFixture(t), repo = urlPath(new URL("../../../", import.meta.url));
  const node = process.versions.bun ? spawnSync("node", ["-p", "process.execPath"], { encoding: "utf8" }).stdout.trim() : process.execPath;
  assert.ok(node, "Node executable must be available");
  const bin = h.deps.path.join(h.root, "bin"); h.deps.fs.mkdirSync(bin);
  h.deps.fs.symlinkSync(node, h.deps.path.join(bin, "node"));
  h.deps.fs.symlinkSync(h.deps.path.join(repo, "ai-framework"), h.deps.path.join(h.root, "ai-framework"), "dir");
  h.deps.fs.writeFileSync(h.deps.path.join(h.root, "ai-workflow.toon"), "schemaVersion: 3\nruntime:\n  runner: bun\n");
  const command = captureSettings(".claude/settings.json").UserPromptSubmit.find(group => group.hooks.some(hook => hook.command.includes("workflow-capture.mts")))!.hooks[0].command;
  const payload = { ...claude("UserPromptSubmit"), prompt: "CAPTURE-TEXT-MARKER" };
  const run = (path: string) => spawnSync("/bin/sh", ["-c", command], { cwd: h.root,
    env: { ...h.deps.proc.env, CLAUDE_PROJECT_DIR: h.root, AI_WORKFLOW_RUNNER: "bun", PATH: path },
    input: JSON.stringify(payload), encoding: "utf8", timeout: 10000 });
  const success = run(bin);
  assert.deepEqual([success.status, success.stdout, success.stderr], [0, "", ""]);
  assert.equal(h.state().totals.events["agent.started"], 1);
  assert.doesNotMatch(metricTexts(h).join("\n"), /CAPTURE-TEXT-MARKER/);
  const before = h.deps.fs.readFileSync(h.file), missing = run("");
  assert.notEqual(missing.status, 0); assert.notEqual(missing.status, 2); assert.equal(missing.stdout, "");
  assert.match(missing.stderr, /node.*(?:not found|No such file)/);
  assert.equal(h.deps.fs.readFileSync(h.file), before);
});
