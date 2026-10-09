import assert from "node:assert/strict";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { createTestDeps, tempFixture } from "./runtime/test-helpers.mts";
import type { RuntimeDeps } from "./runtime/types.mts";
import { withLease } from "../hooks/scripts/metrics-lock.mts";
import { generateReport } from "./workflow-metrics-report.mts";
import { LIMITS, STATE_FILE, applyEvent, blankState, errorCode, metricsDirectory, normalizeEvent, readText, readWorkflowState, recordWorkflowEvent, validState, writeAtomic } from "./workflow-metrics-state.mts";

const AT = "2026-10-08T12:00:00.000Z";
const event = (eventId = "one", fields: Record<string, unknown> = {}): Record<string, unknown> => ({ eventId, kind: "skill.used", vendor: "codex", source: "manual", skill: "build", pitch: "metrics", ...fields });
function fixture(t: TestContext) {
  const base = createTestDeps();
  const deps: RuntimeDeps = { ...base, clock: { ...base.clock, now: () => Date.parse(AT) } };
  const root = tempFixture(deps, { ".project/.gitkeep": "" });
  t.after(() => deps.fs.rmSync(root, { recursive: true, force: true }));
  return { deps, root, file: deps.path.join(root, ".project/metrics", STATE_FILE) };
}
function apply(state: ReturnType<typeof blankState>, deps: RuntimeDeps, fields: Record<string, unknown>) {
  return applyEvent(state, normalizeEvent(fields, deps), deps);
}

test("invalid lifecycle scope never matches distinct values folded into other", t => {
  const { deps } = fixture(t);
  for (const field of ["vendor", "pitch", "phase"] as const) {
    const state = blankState(deps);
    apply(state, deps, event("start", { kind: "agent.started", activityId: "a", [field]: "[alpha]", occurredAt: AT }));
    apply(state, deps, event("finish", { kind: "agent.finished", activityId: "a", [field]: "[beta]", outcome: "completed", occurredAt: "2026-10-08T12:01:00.000Z" }));
    assert.equal(state.totals.matchedFinishes, 0); assert.equal(state.totals.elapsedMs, 0);
    assert.equal(state.health.unmatchedFinishes, 1); assert.equal(Object.keys(state.pending).length, 0);
    assert.equal(state.totals.events["agent.started"], 1); assert.equal(state.totals.events["agent.finished"], 1);
  }
});

test("oversized composite model attribution is visible as a gap and overflow", t => {
  const { deps } = fixture(t), state = blankState(deps);
  apply(state, deps, event("model", { kind: "agent.finished", activityId: "a", outcome: "completed", provider: "p".repeat(40), model: "m".repeat(40) }));
  assert.deepEqual(Object.keys(state.dimensions.models.codex), ["(other)"]);
  assert.equal(state.health.missingModel, 1); assert.equal(state.health.overflowEvents, 1);
  assert.equal(state.totals.events["agent.finished"], 1);
});

test("concurrent directory creation accepts only a safe winner", async t => {
  const { deps, root, file } = fixture(t);
  const racing: RuntimeDeps = { ...deps, fs: { ...deps.fs, mkdirSync: (path, options) => {
    if (path.endsWith("/metrics")) { deps.fs.mkdirSync(path, options); throw Object.assign(new Error("winner"), { code: "EEXIST" }); }
    return deps.fs.mkdirSync(path, options);
  } } };
  assert.equal((await recordWorkflowEvent(event(), root, racing)).written, true);
  assert.ok(deps.fs.existsSync(file));
  deps.fs.rmSync(deps.path.dirname(file), { recursive: true });
  const outside = tempFixture(deps, {}); t.after(() => deps.fs.rmSync(outside, { recursive: true, force: true }));
  const unsafe: RuntimeDeps = { ...deps, fs: { ...deps.fs, mkdirSync: path => {
    deps.fs.symlinkSync(outside, path); throw Object.assign(new Error("winner"), { code: "EEXIST" });
  } } };
  assert.equal((await recordWorkflowEvent(event("unsafe"), root, unsafe)).reason, "unsafe metrics directory");
  assert.deepEqual(deps.fs.readdirSync(outside), []);
});

test("record and report refuse ancestor replacement during lease acquisition", async t => {
  for (const mode of ["record", "report"] as const) {
    const { deps, root, file } = fixture(t), directory = metricsDirectory(root, true, deps)!;
    const outside = tempFixture(deps, { [STATE_FILE]: JSON.stringify(blankState(deps, "EXTERNAL-PROJECT")) });
    t.after(() => deps.fs.rmSync(outside, { recursive: true, force: true }));
    const external = deps.path.join(outside, STATE_FILE), before = deps.fs.readFileSync(external);
    const racing: RuntimeDeps = { ...deps, net: { ...deps.net, tryListen: async options => {
      const held = await deps.net.tryListen(options);
      if ("server" in held) { deps.fs.renameSync(directory, directory + ".original"); deps.fs.symlinkSync(outside, directory); }
      return held;
    } } };
    const result = mode === "record" ? await recordWorkflowEvent(event(), root, racing) : await generateReport(root, "json", racing);
    assert.equal(result.written, false); assert.equal(result.reason, "unsafe metrics directory");
    assert.equal(deps.fs.readFileSync(external), before); assert.deepEqual(deps.fs.readdirSync(outside), [STATE_FILE]);
    assert.equal("output" in result, false);
    deps.fs.unlinkSync(directory); deps.fs.renameSync(directory + ".original", directory);
    assert.equal((await recordWorkflowEvent(event("recovered"), root, deps)).written, true);
    assert.ok(deps.fs.existsSync(file));
  }
});

test("records useful counts, vendor dimensions and provenance without resource or free-text data", async t => {
  const { deps, root, file } = fixture(t);
  deps.fs.writeFileSync(deps.path.join(root, ".project/.bundle-sync.json"), JSON.stringify({ sourceVersion: "2.14.1" }));
  const input = event("SECRET-ID-MARKER", { tokens: { input: 123 }, costUsd: 100, executionMs: 10, prompt: "PROMPT-MARKER", raw: { response: "RAW-MARKER" } });
  const result = await recordWorkflowEvent(input, root, deps);
  assert.equal(result.written, true);
  const saved = deps.fs.readFileSync(file);
  assert.doesNotMatch(saved, /SECRET-ID-MARKER|PROMPT-MARKER|RAW-MARKER|tokens|costUsd|executionMs/);
  const state = result.state!;
  assert.equal(state.totals.events["skill.used"], 1);
  assert.equal(state.dimensions.skills.codex.build.events["skill.used"], 1);
  assert.deepEqual(state.project.workflowVersion, { value: "2.14.1", status: "observed", evidence: ".project/.bundle-sync.json" });
  assert.equal(state.sources.manual.lastEventAt, AT);
  assert.equal(state.project.label, deps.path.basename(root));
  assert.equal(validState(JSON.parse(saved)), true);
  assert.equal(deps.fs.statSync(file).mode & 0o777, 0o600);
});

test("rejects invalid events before creating metrics or echoing their contents", async t => {
  const { deps, root } = fixture(t);
  for (const input of [null, [], {}, event(""), event("x".repeat(129)), event("bad", { kind: "unknown" }), event("bad", { source: "untrusted" }), event("bad", { vendor: "" }), event("bad", { occurredAt: "2026-02-31T12:00:00.000Z" }), event("bad", { occurredAt: "2026-10-08T12:05:00.001Z" }), event("bad", { kind: "agent.started" }), event("bad", { kind: "session.started" }), event("bad", { kind: "pitch.finished" }), event("bad", { kind: "gate.decided" }), event("bad", { mustFixCount: 1 }), event("bad", { kind: "audit.finished", outcome: "failed", mustFixCount: 1.5 })]) {
    assert.equal((await recordWorkflowEvent(input, root, deps)).written, false);
  }
  assert.equal(deps.fs.existsSync(deps.path.join(root, ".project/metrics")), false);
  assert.equal(errorCode({ code: "SECRET/path" }), "ERROR");
  assert.equal(errorCode({ code: "EACCES" }), "EACCES");
});

test("deduplicates omitted timestamps across clocks and rejects conflicting IDs or explicit timestamps", async t => {
  const { deps, root, file } = fixture(t);
  assert.equal((await recordWorkflowEvent(event(), root, deps)).written, true);
  const original = deps.fs.readFileSync(file);
  const later: RuntimeDeps = { ...deps, clock: { ...deps.clock, now: () => Date.parse(AT) + 1000 } };
  assert.equal((await recordWorkflowEvent(event(), root, later)).reason, "duplicate event");
  assert.equal((await recordWorkflowEvent(event("one", { skill: "audit" }), root, deps)).reason, "conflicting event identifier");
  assert.equal(deps.fs.readFileSync(file), original);
  await recordWorkflowEvent(event("timed", { occurredAt: AT }), root, deps);
  assert.equal((await recordWorkflowEvent(event("timed", { occurredAt: "2026-10-08T11:59:00.000Z" }), root, deps)).reason, "conflicting event identifier");
});

test("counts sessions, primary/subagent finishes, gates, audits and ships with separate event units", t => {
  const { deps } = fixture(t), state = blankState(deps);
  const inputs = [
    event("session", { kind: "session.started", sessionId: "s" }),
    event("primary", { kind: "agent.finished", activityId: "a", agentKind: "primary", outcome: "completed", model: "gpt", provider: "openai", role: "worker" }),
    event("subagent", { kind: "agent.finished", activityId: "b", agentKind: "subagent", outcome: "failed" }),
    event("unknown", { kind: "agent.finished", activityId: "c", outcome: "cancelled" }),
    event("gate", { kind: "gate.decided", decision: "revise" }),
    event("audit", { kind: "audit.finished", outcome: "completed", mustFixCount: 3 }),
    event("ship", { kind: "pitch.finished", outcome: "completed" }),
  ];
  for (const input of inputs) assert.equal(apply(state, deps, input).written, true);
  assert.equal(state.totals.events["session.started"], 1);
  assert.equal(state.totals.events["pitch.finished"], 1);
  assert.equal(state.totals.primaryFinishes, 1); assert.equal(state.totals.subagentFinishes, 1); assert.equal(state.totals.unknownFinishes, 1);
  assert.deepEqual(state.totals.outcomes, { completed: 3, failed: 1, cancelled: 1 });
  assert.equal(state.totals.gates.revise, 1); assert.equal(state.totals.mustFixCount, 3);
  assert.equal(state.dimensions.models.codex["openai/gpt"].primaryFinishes, 1);
  assert.equal(state.health.missingModel, 2); assert.equal(state.health.missingRole, 2);
});

test("matches phase pause/resume and completion while preserving wall time including pauses", t => {
  const { deps } = fixture(t), state = blankState(deps);
  const phase = { phase: "build", activityId: "run", sessionId: "s" };
  for (const [n, kind, seconds] of [["start", "phase.started", 0], ["pause", "phase.paused", 10], ["resume", "phase.resumed", 30], ["finish", "phase.finished", 60]] as const) {
    const occurredAt = new Date(Date.parse(AT) + seconds * 1000).toISOString();
    assert.equal(apply(state, deps, event(n, { ...phase, kind, occurredAt, outcome: "completed" })).written, true);
    if (kind === "phase.paused") assert.equal(Object.values(state.pending)[0].status, "paused");
  }
  assert.equal(state.totals.elapsedMs, 60_000); assert.equal(state.totals.matchedFinishes, 1);
  assert.deepEqual(Object.keys(state.pending), []);
  assert.equal(state.dimensions.phases.codex.build.elapsedMs, 60_000);
  assert.equal(validState(JSON.parse(JSON.stringify(state))), true);
});

test("leaves unmatched and out-of-order activities without fabricated duration", t => {
  const { deps } = fixture(t), state = blankState(deps);
  const phase = { phase: "build", activityId: "run", kind: "phase.started" };
  apply(state, deps, event("start", phase));
  assert.equal(apply(state, deps, event("second", phase)).reason, "activity already started");
  apply(state, deps, event("past", { ...phase, kind: "phase.finished", outcome: "cancelled", occurredAt: "2026-10-08T11:59:00.000Z" }));
  apply(state, deps, event("different", { ...phase, pitch: "other", kind: "phase.finished", outcome: "failed" }));
  apply(state, deps, event("resume", { ...phase, kind: "phase.resumed" }));
  assert.equal(state.health.unmatchedFinishes, 2); assert.equal(state.health.unmatchedTransitions, 1);
  assert.equal(state.totals.matchedFinishes, 0); assert.equal(Object.keys(state.pending).length, 1);
  apply(state, deps, event("valid", { ...phase, kind: "phase.finished", outcome: "cancelled" }));
  assert.equal(state.totals.matchedFinishes, 1); assert.equal(Object.keys(state.pending).length, 0);
});

test("bounds pending activities and exposes evicted starts as unmatched finishes", t => {
  const { deps } = fixture(t), state = blankState(deps);
  for (let i = 0; i <= LIMITS.pending; i++) apply(state, deps, event(`start${i}`, { kind: "agent.started", activityId: String(i) }));
  assert.equal(Object.keys(state.pending).length, 64); assert.equal(state.health.pendingEvictions, 1);
  apply(state, deps, event("finish0", { kind: "agent.finished", activityId: "0", outcome: "completed" }));
  assert.equal(state.health.unmatchedFinishes, 1);
});

test("conserves totals across vendor, pitch and dimension overflow, including prototype-like names", t => {
  const { deps } = fixture(t), state = blankState(deps);
  for (let i = 0; i < 70; i++) apply(state, deps, event(String(i), { vendor: `v${i}`, pitch: `p${i}` }));
  for (let i = 0; i < 40; i++) apply(state, deps, event(`model${i}`, { vendor: "v0", pitch: "p0", kind: "agent.finished", activityId: String(i), outcome: "completed", model: `m${i}` }));
  for (const label of ["__proto__", "constructor", "prototype", "[link](evil)", "x".repeat(9000), "toString"]) apply(state, deps, event(`label${label.length}${label.slice(0, 10)}`, { vendor: "v0", pitch: "p0", skill: label }));
  const total = Object.values(state.totals.events).reduce((a, b) => a + b, 0);
  assert.equal(Object.values(state.vendors).reduce((n, s) => n + Object.values(s.events).reduce((a, b) => a + b, 0), 0), total);
  assert.equal(Object.keys(state.vendors).length, 9); assert.equal(Object.keys(state.pitches).length, 51);
  assert.equal(Object.keys(state.dimensions.models.v0).length, 33);
  assert.equal(state.health.overflowEvents, 75); // 62 vendor overflows, 8 model overflows, 5 invalid skill labels.
  assert.equal(state.dimensions.skills.v0["(other)"].events["skill.used"], 5);
  const roundtrip = JSON.parse(JSON.stringify(state));
  assert.equal(validState(roundtrip), true);
  assert.equal(apply(roundtrip, deps, event("prototype-roundtrip", { vendor: "v0", skill: "valueOf" })).written, true);
  assert.equal(roundtrip.dimensions.skills.v0.valueOf.events["skill.used"], 1);
});

test("retains 30 UTC days without letting late arrivals evict current buckets", t => {
  const { deps } = fixture(t), state = blankState(deps);
  for (let i = 0; i < 32; i++) apply(state, deps, event(`day${i}`, { occurredAt: new Date(Date.parse(AT) - i * 86_400_000).toISOString() }));
  assert.equal(Object.keys(state.days).length, 30); assert.equal(state.health.lateEvents, 2);
  assert.equal(state.totals.events["skill.used"], 32); assert.ok(state.days["2026-10-08"]);
  const later: RuntimeDeps = { ...deps, clock: { ...deps.clock, now: () => Date.parse(AT) + 86_400_000 } };
  apply(state, later, event("new-day"));
  assert.equal(Object.keys(state.days).length, 30); assert.equal(state.days["2026-09-09"], undefined);
});

test("documents the bounded replay window and rejects counter overflow without committing", async t => {
  const { deps, root, file } = fixture(t), state = blankState(deps);
  for (let i = 0; i <= LIMITS.recent; i++) apply(state, deps, event(String(i)));
  assert.equal(state.recent.length, 512);
  assert.equal(apply(state, deps, event("0")).written, true);
  assert.equal(state.totals.events["skill.used"], 514);
  state.totals.events["skill.used"] = Number.MAX_SAFE_INTEGER;
  metricsDirectory(root, true, deps); deps.fs.writeFileSync(file, JSON.stringify(state));
  const original = deps.fs.readFileSync(file);
  assert.equal((await recordWorkflowEvent(event("overflow"), root, deps)).reason, "metric counter overflow");
  assert.equal(deps.fs.readFileSync(file), original);
});

test("refuses corrupt, unknown, oversized and arbitrary-field snapshots without replacement", async t => {
  const { deps, root, file } = fixture(t);
  metricsDirectory(root, true, deps);
  const valid = blankState(deps);
  const badStates = ["{not-json", JSON.stringify({ ...valid, schemaVersion: 2 }), JSON.stringify({ ...valid, prompt: "SECRET-MARKER" }), JSON.stringify({ ...valid, totals: { ...valid.totals, costUsd: 2 } }), JSON.stringify({ ...valid, pending: { bad: { startedAt: AT } } }), "x".repeat(LIMITS.stateBytes + 1)];
  for (const content of badStates) {
    deps.fs.writeFileSync(file, content);
    assert.equal((await recordWorkflowEvent(event(), root, deps)).written, false);
    assert.equal(deps.fs.readFileSync(file), content);
  }
  assert.equal(deps.fs.existsSync(`${file}.rejected`), false);
});

test("refuses symlink and FIFO state without reading, blocking or changing targets", async t => {
  const { deps, root, file } = fixture(t);
  metricsDirectory(root, true, deps);
  const precious = deps.path.join(root, "precious"); deps.fs.writeFileSync(precious, "DO-NOT-READ");
  deps.fs.symlinkSync(precious, file);
  assert.equal((await recordWorkflowEvent(event(), root, deps)).reason, "unsafe or oversized state");
  assert.equal(deps.fs.readFileSync(precious), "DO-NOT-READ"); deps.fs.unlinkSync(file);
  assert.equal(deps.child.runSync("mkfifo", [file]).status, 0);
  assert.equal((await recordWorkflowEvent(event(), root, deps)).reason, "unsafe or oversized state");
  assert.equal(deps.fs.lstatSync(file).isFile(), false);
});

test("refuses unsafe directories and uninitialized roots without creating state elsewhere", async t => {
  const { deps, root } = fixture(t);
  const outside = tempFixture(deps, {}); t.after(() => deps.fs.rmSync(outside, { recursive: true, force: true }));
  assert.equal((await recordWorkflowEvent(event(), outside, deps)).reason, "project is not initialized");
  deps.fs.symlinkSync(outside, deps.path.join(root, ".project/metrics"));
  assert.equal((await recordWorkflowEvent(event(), root, deps)).reason, "unsafe metrics directory");
  assert.deepEqual(deps.fs.readdirSync(outside), []);
  deps.fs.unlinkSync(deps.path.join(root, ".project/metrics"));
  deps.fs.rmSync(deps.path.join(root, ".project"), { recursive: true }); deps.fs.symlinkSync(outside, deps.path.join(root, ".project"));
  assert.equal((await recordWorkflowEvent(event(), root, deps)).reason, "unsafe metrics directory");
});

test("respects the legacy lock and shared lease, then resumes after release", { timeout: 10_000 }, async t => {
  const { deps, root, file } = fixture(t), directory = metricsDirectory(root, true, deps)!;
  const legacy = deps.path.join(directory, ".token-consumption.lock"); deps.fs.writeFileSync(legacy, "");
  assert.equal((await recordWorkflowEvent(event(), root, deps)).reason, "legacy metrics lock is present");
  assert.equal(deps.fs.existsSync(file), false); assert.ok(deps.fs.existsSync(legacy)); deps.fs.unlinkSync(legacy);
  await withLease(directory, async () => {
    assert.equal((await recordWorkflowEvent(event(), root, deps)).reason, "metrics lease unavailable; event not recorded");
  }, {}, deps);
  assert.equal((await recordWorkflowEvent(event(), root, deps)).written, true);
});

test("cleans partial temporary writes and releases the lease after write failure", async t => {
  const { deps, root, file } = fixture(t);
  const broken: RuntimeDeps = { ...deps, fs: { ...deps.fs, writeFileSync: (target, data, options) => { deps.fs.writeFileSync(target, data, options); throw Object.assign(new Error("SECRET/path"), { code: "EACCES" }); } } };
  assert.equal((await recordWorkflowEvent(event(), root, broken)).reason, "metrics operation failed (EACCES)");
  assert.deepEqual(deps.fs.readdirSync(deps.path.dirname(file)), []);
  assert.equal((await recordWorkflowEvent(event(), root, deps)).written, true);
  assert.throws(() => writeAtomic(file, "x".repeat(LIMITS.stateBytes + 1), deps), /output is oversized/);
  const target = deps.path.join(root, "link"); deps.fs.symlinkSync(file, target);
  assert.throws(() => writeAtomic(target, "", deps), /unsafe output destination/);
});

test("reads guarded version evidence with unavailable and stale fallbacks", async t => {
  const { deps, root } = fixture(t);
  assert.equal(metricsDirectory(root, false, deps), null);
  assert.deepEqual(readWorkflowState(root, deps), { status: "missing" });
  deps.fs.writeFileSync(deps.path.join(root, ".project/.bundle-sync.json"), "broken");
  deps.fs.writeFileSync(deps.path.join(root, "VERSION"), "2.1.0\n");
  assert.deepEqual((await recordWorkflowEvent(event(), root, deps)).state!.project.workflowVersion, { value: "2.1.0", status: "stale", evidence: "VERSION" });
  deps.fs.writeFileSync(deps.path.join(root, "VERSION"), "not-a-version");
  assert.equal((await recordWorkflowEvent(event("two"), root, deps)).state!.project.workflowVersion.status, "unavailable");
  const denied: RuntimeDeps = { ...deps, fs: { ...deps.fs, lstatSync: () => { throw Object.assign(new Error("SECRET"), { code: "EACCES" }); } } };
  assert.deepEqual(readText("ignored", denied), { status: "refused", reason: "state read refused (EACCES)" });
});
