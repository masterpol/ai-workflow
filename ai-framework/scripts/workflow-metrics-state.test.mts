import assert from "node:assert/strict";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { createTestDeps, tempFixture } from "./runtime/test-helpers.mts";
import type { RuntimeDeps } from "./runtime/types.mts";
import { withLease } from "../hooks/scripts/metrics-lock.mts";
import { generateReport } from "./workflow-metrics-report.mts";
import { LIMITS, SCHEMA_VERSION, STATE_FILE, applyEvent, blankState, errorCode, metricsDirectory, migrateV1Text, normalizeEvent, readText, readWorkflowState, recordDroppedCapture, recordWorkflowEvent, validState, writeAtomic } from "./workflow-metrics-state.mts";

const AT = "2026-10-08T12:00:00.000Z";
const event = (eventId = "one", fields: Record<string, unknown> = {}): Record<string, unknown> => ({ eventId, kind: "skill.used", vendor: "codex", source: "manual", skill: "build", pitch: "metrics", ...fields });
function fixture(t: TestContext) {
  const base = createTestDeps();
  const deps: RuntimeDeps = { ...base, clock: { ...base.clock, now: () => Date.parse(AT) } };
  const root = tempFixture(deps, { ".project/.gitkeep": "" });
  t.after(() => deps.fs.rmSync(root, { recursive: true, force: true }));
  return { deps, root, file: deps.path.join(root, ".project/metrics", STATE_FILE) };
}
/** Leases in memory so a new test never binds the real loopback port. */
function memoryLease(deps: RuntimeDeps, onAcquire: () => void = () => {}): RuntimeDeps {
  return { ...deps, net: { ...deps.net, tryListen: async () => { onAcquire(); return { server: { close: async () => {} } }; } } };
}
function v1Text(deps: RuntimeDeps): string {
  const { usage: _usage, ...legacy } = blankState(deps, "legacy");
  legacy.pending = { [deps.crypto.sha256Hex("pending")]: { startedAt: AT, lastAt: AT, status: "running" } };
  return `${JSON.stringify({ ...legacy, schemaVersion: 1 })}\n`;
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
  // v2 identity: labels are not in the key, so a finish with another pitch still closes the start and keeps the start's labels.
  apply(state, deps, event("different", { ...phase, pitch: "other", kind: "phase.finished", outcome: "failed" }));
  assert.equal(state.health.unmatchedFinishes, 1); assert.equal(state.totals.matchedFinishes, 1);
  assert.equal(Object.keys(state.pitches).includes("other"), false); assert.equal(Object.keys(state.pending).length, 0);
  apply(state, deps, event("resume", { ...phase, kind: "phase.resumed" }));
  assert.equal(state.health.unmatchedTransitions, 1);
  apply(state, deps, event("valid", { ...phase, kind: "phase.finished", outcome: "cancelled" }));
  assert.equal(state.health.unmatchedFinishes, 2); assert.equal(state.totals.matchedFinishes, 1);
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
  const badStates = ["{not-json", JSON.stringify({ ...valid, schemaVersion: SCHEMA_VERSION + 1 }), JSON.stringify({ ...valid, prompt: "SECRET-MARKER" }), JSON.stringify({ ...valid, totals: { ...valid.totals, costUsd: 2 } }), JSON.stringify({ ...valid, pending: { bad: { startedAt: AT } } }), "x".repeat(LIMITS.stateBytes + 1)];
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

test("migrates v1 text by editing the version token and appending the usage block", t => {
  const { deps } = fixture(t), text = v1Text(deps), migrated = migrateV1Text(text, AT)!;
  assert.ok(migrated.startsWith(`{"schemaVersion":${SCHEMA_VERSION},`)); assert.ok(migrated.endsWith("}\n"));
  const parsed = JSON.parse(migrated);
  assert.equal(validState(parsed), true); assert.equal(parsed.usage.since, AT);
  const inserted = `,"usage":${JSON.stringify(parsed.usage)}`;
  assert.equal(migrated.replace(inserted, "").replace(`{"schemaVersion":${SCHEMA_VERSION},`, '{"schemaVersion":1,'), text);
  const { usage: _usage, ...rest } = parsed;
  assert.deepEqual({ ...rest, schemaVersion: 1 }, JSON.parse(text));
  assert.deepEqual(Object.values(rest.pending), Object.values(JSON.parse(text).pending));
});

test("refuses migration of anything but one exact v1 document", t => {
  const { deps } = fixture(t), text = v1Text(deps);
  const future = text.replace('{"schemaVersion":1,', `{"schemaVersion":${SCHEMA_VERSION + 1},`);
  const withUsage = text.replace(/\}\n$/, ',"usage":{}}\n');
  const twice = text.replace(/\}\n$/, ',"schemaVersion":1}\n');
  const bad = text.replace('"totals":', '"totals":{"costUsd":1},"x":');
  for (const input of [future, withUsage, twice, bad, ` ${text}`, text.replace('"schemaVersion":1', '"schemaVersion": 1'), "{not-json"]) assert.equal(migrateV1Text(input, AT), null);
});

test("record path persists the migration; report path only migrates in memory", async t => {
  const { deps, root, file } = fixture(t), directory = metricsDirectory(root, true, deps)!;
  const text = v1Text(deps);
  deps.fs.writeFileSync(file, text);
  const report = await generateReport(root, "json", memoryLease(deps));
  assert.equal(report.written, true); assert.equal(deps.fs.readFileSync(file), text);
  assert.equal(readWorkflowState(directory, deps).status === "valid" && (readWorkflowState(directory, deps) as { state: { usage: { since: null } } }).state.usage.since, null);
  const result = await recordWorkflowEvent(event(), root, memoryLease(deps));
  assert.equal(result.written, true);
  const saved = deps.fs.readFileSync(file);
  assert.ok(saved.startsWith(`{"schemaVersion":${SCHEMA_VERSION},`));
  assert.equal(JSON.parse(saved).usage.since, AT); assert.equal(JSON.parse(saved).totals.events["skill.used"], 1);
  assert.deepEqual(deps.fs.readdirSync(directory).filter(name => /\.(rejected|tmp)$/.test(name)), []);
});

test("refuses v1 migration on disk without changing bytes", async t => {
  const { deps, root, file } = fixture(t);
  metricsDirectory(root, true, deps);
  const text = v1Text(deps);
  for (const content of [text.replace(/\}\n$/, ',"schemaVersion":1}\n'), text.replace(/\}\n$/, ',"usage":{}}\n'), text.replace('"totals":', '"totals":{"costUsd":1},"x":')]) {
    deps.fs.writeFileSync(file, content);
    assert.equal((await recordWorkflowEvent(event(), root, memoryLease(deps))).written, false);
    assert.equal(deps.fs.readFileSync(file), content);
  }
  assert.deepEqual(deps.fs.readdirSync(deps.path.dirname(file)), [STATE_FILE]);
});

test("refuses a v1 migration when the metrics ancestor is swapped during lease acquisition", async t => {
  const { deps, root, file } = fixture(t), directory = metricsDirectory(root, true, deps)!, text = v1Text(deps);
  deps.fs.writeFileSync(file, text);
  const outside = tempFixture(deps, { [STATE_FILE]: text }); t.after(() => deps.fs.rmSync(outside, { recursive: true, force: true }));
  const swap = (): void => { deps.fs.renameSync(directory, directory + ".original"); deps.fs.symlinkSync(outside, directory); };
  const result = await recordWorkflowEvent(event(), root, memoryLease(deps, swap));
  assert.equal(result.written, false); assert.equal(result.reason, "unsafe metrics directory");
  assert.equal(deps.fs.readFileSync(deps.path.join(outside, STATE_FILE)), text); assert.deepEqual(deps.fs.readdirSync(outside), [STATE_FILE]);
});

/** The fixture clock sits 90 minutes after AT so reordered timestamps stay inside the future tolerance. */
const ahead = (deps: RuntimeDeps): RuntimeDeps => ({ ...deps, clock: { ...deps.clock, now: () => Date.parse(AT) + 90 * 60_000 } });
const minutes = (n: number): string => new Date(Date.parse(AT) + n * 60_000).toISOString();
const turn = (id: string, kind: "agent.started" | "agent.finished", at: string, extra: Record<string, unknown> = {}) =>
  event(id, { kind, activityId: "turn", sessionId: "s", agentKind: "primary", occurredAt: at, ...(kind === "agent.finished" ? { outcome: "completed" } : {}), ...extra });

test("a Stop that arrives before its start is unmatched and the later pair still measures only itself", t => {
  const { deps: base } = fixture(t), deps = ahead(base), state = blankState(deps);
  apply(state, deps, turn("stop", "agent.finished", minutes(10)));
  assert.equal(state.health.unmatchedFinishes, 1);
  apply(state, deps, turn("start", "agent.started", minutes(0)));
  assert.equal(Object.keys(state.pending).length, 1);
  apply(state, deps, turn("stop2", "agent.finished", minutes(30)));
  assert.equal(state.totals.matchedFinishes, 1); assert.equal(state.totals.elapsedMs, 30 * 60_000);
});

test("a double SessionEnd is a duplicate or one more unmatched finish, never a second measurement", t => {
  const { deps: base } = fixture(t), deps = ahead(base), state = blankState(deps);
  apply(state, deps, turn("start", "agent.started", minutes(0)));
  apply(state, deps, turn("end", "agent.finished", minutes(5), { outcome: "cancelled" }));
  assert.equal(apply(state, deps, turn("end", "agent.finished", minutes(5), { outcome: "cancelled" })).reason, "duplicate event");
  assert.equal(state.totals.matchedFinishes, 1);
  assert.equal(apply(state, deps, turn("end2", "agent.finished", minutes(6), { outcome: "cancelled" })).written, true);
  assert.equal(state.health.unmatchedFinishes, 1); assert.equal(state.totals.matchedFinishes, 1); assert.equal(state.totals.elapsedMs, 5 * 60_000);
});

test("a finish after cap or TTL eviction is unmatched and adds no duration", t => {
  const { deps } = fixture(t), state = blankState(deps);
  apply(state, deps, turn("start", "agent.started", AT, { agentKind: "subagent" }));
  const later: RuntimeDeps = { ...deps, clock: { ...deps.clock, now: () => Date.parse(AT) + LIMITS.pendingTtlMs + 1000 } };
  apply(state, later, event("other-start", { kind: "agent.started", activityId: "x", sessionId: "s2", occurredAt: new Date(Date.parse(AT) + LIMITS.pendingTtlMs).toISOString() }));
  assert.equal(state.health.pendingEvictions, 1); assert.equal(Object.keys(state.pending).length, 1);
  apply(state, later, turn("finish", "agent.finished", new Date(Date.parse(AT) + LIMITS.pendingTtlMs).toISOString(), { agentKind: "subagent" }));
  assert.equal(state.health.unmatchedFinishes, 1); assert.equal(state.totals.elapsedMs, 0); assert.equal(state.totals.matchedFinishes, 0);
  const capped = blankState(deps);
  for (let i = 0; i <= LIMITS.pending; i++) apply(capped, deps, event(`c${i}`, { kind: "phase.started", activityId: String(i), phase: "build" }));
  apply(capped, deps, event("cf", { kind: "phase.finished", activityId: "0", phase: "build", outcome: "completed" }));
  assert.equal(capped.health.unmatchedFinishes, 1); assert.equal(capped.totals.elapsedMs, 0);
});

test("a primary re-start supersedes the open turn without a duration, a phase re-start is still refused", t => {
  const { deps: base } = fixture(t), deps = ahead(base), state = blankState(deps);
  apply(state, deps, turn("one", "agent.started", minutes(0)));
  assert.equal(apply(state, deps, turn("two", "agent.started", minutes(5))).written, true);
  assert.equal(state.usage.health.supersededTurns, 1); assert.equal(Object.keys(state.pending).length, 1);
  assert.equal(state.totals.elapsedMs, 0); assert.equal(state.totals.events["agent.started"], 2);
  apply(state, deps, turn("done", "agent.finished", minutes(8)));
  assert.equal(state.totals.elapsedMs, 3 * 60_000);
  apply(state, deps, turn("sub1", "agent.started", minutes(0), { activityId: "sub", agentKind: "subagent" }));
  assert.equal(apply(state, deps, turn("sub2", "agent.started", minutes(1), { activityId: "sub", agentKind: "subagent" })).reason, "activity already started");
});

test("a reordered burst past the cap evicts exactly the oldest starts", t => {
  const { deps: base } = fixture(t), deps = ahead(base), state = blankState(deps);
  let seed = 12345;
  const random = (): number => { seed = (seed * 1103515245 + 12345) % 2_147_483_648; return seed / 2_147_483_648; };
  const order = Array.from({ length: 80 }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  for (const n of order) apply(state, deps, event(`b${n}`, { kind: "phase.started", activityId: String(n), phase: "build", vendor: `v${n % 3}`, pitch: `p${n % 5}`, occurredAt: minutes(n) }));
  const kept = Object.values(state.pending).map(e => e.startedAt).sort();
  assert.deepEqual(kept, Array.from({ length: 64 }, (_, i) => minutes(i + 16)));
  assert.equal(state.health.pendingEvictions, 16);
  assert.equal(Object.values(state.vendors).reduce((n, v) => n + v.events["phase.started"], 0), state.totals.events["phase.started"]);
  assert.equal(Object.values(state.pitches).reduce((n, v) => n + v.events["phase.started"], 0), 80);
});

test("an interval stays with the labels of its start when the phase changes mid-turn", t => {
  const { deps } = fixture(t), state = blankState(deps);
  const run = { activityId: "run", sessionId: "s" };
  apply(state, deps, event("a", { ...run, kind: "phase.started", phase: "plan", occurredAt: minutes(0) }));
  apply(state, deps, event("b", { ...run, kind: "phase.finished", phase: "build", outcome: "completed", occurredAt: minutes(1) }));
  assert.equal(state.dimensions.phases.codex.plan.elapsedMs, 60_000); assert.equal(state.dimensions.phases.codex.build, undefined);
});

test("scope is none, a short S label or a non-matchable other, and v2 pending entries survive a round trip", t => {
  const { deps } = fixture(t), state = blankState(deps);
  const scoped = (id: string, scope?: unknown) => apply(state, deps, event(id, { kind: "phase.started", activityId: id, phase: "build", ...(scope === undefined ? {} : { scope }) }));
  scoped("none"); scoped("s12", "S12"); scoped("bad", "S1234"); scoped("text", "build everything");
  assert.deepEqual(Object.values(state.pending).map(e => e.scope), ["(none)", "S12"]);
  assert.equal(state.health.overflowEvents, 2); assert.equal(state.totals.events["phase.started"], 4);
  assert.equal(validState(JSON.parse(JSON.stringify(state))), true);
  assert.equal(validState({ ...JSON.parse(JSON.stringify(state)), pending: { [deps.crypto.sha256Hex("x")]: { startedAt: AT, lastAt: AT, status: "running", kind: "agent" } } }), false);
});

test("a replay of an event recorded before scopes existed is still a duplicate", t => {
  const { deps } = fixture(t), state = blankState(deps);
  const input = normalizeEvent(event("legacy", { kind: "agent.finished", activityId: "a", outcome: "completed", model: "gpt", provider: "openai" }), deps);
  // Field order of the base-ref event, frozen here so a reordered field list cannot hide a mismatch.
  const frozen = ["eventId", "kind", "vendor", "source", "occurredAt", "timeProvided", "sessionId", "activityId", "pitch", "phase", "skill", "provider", "model", "role", "workflowVersion", "agentKind", "outcome", "decision", "mustFixCount"];
  const base: Record<string, unknown> = {};
  for (const field of frozen) base[field] = field === "eventId" || field === "occurredAt" ? undefined : (input as unknown as Record<string, unknown>)[field];
  state.recent.push({ key: deps.crypto.sha256Hex(JSON.stringify([input.vendor, input.source, input.eventId])), fingerprint: deps.crypto.sha256Hex(JSON.stringify(base)) });
  assert.equal(applyEvent(state, input, deps).reason, "duplicate event");
});

// ---- interval engine ----------------------------------------------------------------------------------------

const at = (deps: RuntimeDeps, ms: number): RuntimeDeps => ({ ...deps, clock: { ...deps.clock, now: () => Date.parse(AT) + ms } });
const MIN = 60_000, HOUR = 60 * MIN;
const stamp = (ms: number): string => new Date(Date.parse(AT) + ms).toISOString();
let serial = 0;
/** One agent interval as its start and finish events; `timed` false leaves the time to the collector clock. */
function interval(state: ReturnType<typeof blankState>, deps: RuntimeDeps, from: number, to: number, fields: Record<string, unknown> = {}, timed = true) {
  const id = `i${++serial}`, base = { activityId: id, sessionId: "s", agentKind: "primary", ...fields };
  const apply1 = (kind: string, ms: number, extra: Record<string, unknown>) =>
    apply(state, at(deps, ms), event(`${id}-${kind}`, { ...base, kind, ...(timed ? { occurredAt: stamp(ms) } : {}), ...extra }));
  return { start: () => apply1("agent.started", from, {}), finish: (outcome = "completed") => apply1("agent.finished", to, { outcome }) };
}
const NO_ROW = { activeMs: 0, waitMs: 0, turnsStarted: 0, turnsFinished: 0, gapsMeasured: 0, gapsUnmeasured: 0, gapsOverCap: 0 };
/** A level that nothing was credited to has no row yet, which reads as zero. */
const rowOf = (state: ReturnType<typeof blankState>, ...keys: string[]) => {
  const node = state.usage.pitches[keys[0]]; if (!node || keys.length === 1) return node?.row ?? NO_ROW;
  const phase = node.phases[keys[1]]; if (!phase || keys.length === 2) return phase?.row ?? NO_ROW;
  return phase.scopes[keys[2]] ?? NO_ROW;
};

test("a completed turn's gap is wait, and a parallel subagent inside it is not counted twice", t => {
  const { deps } = fixture(t), state = blankState(deps);
  const first = interval(state, deps, 0, 10 * MIN); first.start(); first.finish();
  const sub = interval(state, at(deps, 0), 12 * MIN, 18 * MIN, { agentKind: "subagent" }); sub.start(); sub.finish();
  interval(state, deps, 30 * MIN, 31 * MIN).start();
  const total = state.usage.total;
  assert.equal(total.activeMs, 16 * MIN); assert.equal(total.waitMs, 14 * MIN);
  assert.equal(total.turnsStarted, 2); assert.equal(total.turnsFinished, 1); assert.equal(total.gapsMeasured, 1);
  assert.deepEqual(rowOf(state, "metrics", "(unknown)", "(none)"), total);
});

test("an interval stays open until nothing pending can overlap it, then folds as a union", t => {
  const { deps } = fixture(t), state = blankState(deps);
  const long = interval(state, deps, 0, 20 * MIN, { agentKind: "subagent" }), inner = interval(state, deps, 5 * MIN, 10 * MIN, { agentKind: "subagent" });
  long.start(); inner.start(); inner.finish();
  assert.equal(state.usage.open.length, 1); assert.equal(state.usage.total.activeMs, 0);
  long.finish();
  assert.equal(state.usage.total.activeMs, 20 * MIN); assert.equal(state.usage.open.length, 0);
});

test("a wait gap over the cap is measured at the cap and counted once, whichever event comes first", t => {
  for (const intervening of [false, true]) {
    const { deps } = fixture(t), state = blankState(deps);
    const first = interval(state, deps, 0, 10 * MIN); first.start(); first.finish();
    const later = 10 * MIN + 20 * HOUR;
    if (intervening) assert.equal(apply(state, at(deps, later), event(`mid${serial}`, { occurredAt: stamp(later) })).written, true);
    interval(state, deps, later, later + MIN).start();
    assert.equal(state.usage.total.waitMs, LIMITS.waitCapMs); assert.equal(state.usage.total.gapsOverCap, 1); assert.equal(state.usage.total.gapsMeasured, 1);
  }
});

test("a gap across clock sources or backwards in time is unmeasured and adds no wait", t => {
  const { deps } = fixture(t), state = blankState(deps);
  const collected = interval(state, deps, 0, 10 * MIN, {}, false); collected.start(); collected.finish();
  interval(state, deps, 20 * MIN, 21 * MIN).start();
  assert.equal(state.usage.total.gapsUnmeasured, 1); assert.equal(state.usage.total.waitMs, 0); assert.equal(state.usage.total.activeMs, 10 * MIN);
  const other = blankState(deps), early = interval(other, deps, 0, 10 * MIN); early.start(); early.finish();
  interval(other, deps, 5 * MIN, 6 * MIN).start();
  assert.equal(other.usage.total.gapsUnmeasured, 1); assert.equal(other.usage.total.waitMs, 0);
});

test("an interval whose start and finish use different clocks keeps its elapsed time but adds no active time", t => {
  const { deps } = fixture(t), state = blankState(deps);
  const start = interval(state, deps, 0, 10 * MIN); start.start();
  apply(state, at(deps, 10 * MIN), event("mixed-finish", { kind: "agent.finished", activityId: `i${serial}`, sessionId: "s", agentKind: "primary", outcome: "completed" }));
  assert.equal(state.usage.health.mixedClockIntervals, 1); assert.equal(state.totals.elapsedMs, 10 * MIN); assert.equal(state.usage.total.activeMs, 0);
});

test("a cancelled turn closes without opening a gap", t => {
  const { deps } = fixture(t), state = blankState(deps);
  const first = interval(state, deps, 0, 10 * MIN); first.start(); first.finish("cancelled");
  interval(state, deps, 20 * MIN, 21 * MIN).start();
  assert.equal(state.usage.total.gapsMeasured + state.usage.total.gapsUnmeasured, 0); assert.equal(state.usage.total.waitMs, 0);
});

test("a burst past the record cap clips instead of inflating, and keeps event totals and validity", t => {
  const { deps } = fixture(t), state = blankState(deps), count = LIMITS.openIntervals * 2;
  interval(state, deps, 0, 0, { agentKind: "subagent" }).start();
  const now = 110 * MIN;
  // Each start closes at once (the pending cap is 64), so only the early start holds the fold point back.
  for (let i = 0; i < count; i++) {
    const fields = { activityId: `burst${i}`, sessionId: "s", agentKind: "subagent" };
    apply(state, at(deps, now), event(`b${i}-s`, { ...fields, kind: "agent.started", occurredAt: stamp(MIN + (i % 10) * 1000) }));
    apply(state, at(deps, now), event(`b${i}-f`, { ...fields, kind: "agent.finished", outcome: "completed", occurredAt: stamp(100 * MIN + i * 1000) }));
  }
  const usage = state.usage, wall = 100 * MIN + count * 1000 - MIN;
  assert.ok(usage.health.clippedIntervals > 0); assert.ok(usage.open.length <= LIMITS.openIntervals);
  assert.ok(usage.total.activeMs > 0 && usage.total.activeMs <= wall); assert.ok(usage.total.activeMs + usage.total.waitMs <= wall);
  assert.equal(state.totals.events["agent.finished"], count);
  assert.equal(validState(JSON.parse(JSON.stringify(state))), true);
});

test("sessions are capped by oldest activity, and an evicted open gap is unmeasured", t => {
  const { deps } = fixture(t), state = blankState(deps);
  for (let i = 0; i <= LIMITS.sessions; i++) {
    const turn = interval(state, deps, i * MIN, i * MIN + 30_000, { sessionId: `session${i}` }); turn.start(); turn.finish();
  }
  assert.equal(Object.keys(state.usage.sessions).length, LIMITS.sessions);
  assert.equal(state.usage.health.sessionEvictions, 1); assert.equal(state.usage.total.gapsUnmeasured, 1);
  assert.ok(Object.keys(state.usage.sessions).every(key => /^[a-f0-9]{64}$/.test(key)));
});

test("prompts, raw payloads and transcripts never reach the usage state or an error", t => {
  const { deps } = fixture(t), state = blankState(deps);
  const marked = { prompt: "PROMPT-MARKER", raw: { response: "RAW-MARKER" }, transcript: "TRANSCRIPT-MARKER" };
  const turn = interval(state, deps, 0, 10 * MIN, marked); turn.start(); turn.finish();
  assert.throws(() => normalizeEvent({ ...marked, kind: "agent.started" }, deps), error => !/MARKER/.test((error as Error).message));
  assert.doesNotMatch(JSON.stringify(state), /MARKER/);
});

test("scenarios of random overlapping turns match a brute-force union and never exceed wall time", t => {
  const { deps } = fixture(t);
  let seed = 7;
  const random = (): number => { seed = (seed * 1103515245 + 12345) % 2_147_483_648; return seed / 2_147_483_648; };
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
  type Planned = { from: number; to: number; labels: { pitch: string; phase: string; scope: string }; kind: "active" | "wait"; session: string; agentKind: string; end: boolean };
  for (let run = 0; run < 300; run++) {
    const planned: Planned[] = [], state = blankState(deps);
    const label = () => ({ pitch: pick(["p0", "p1"]), phase: pick(["plan", "build", "audit"]), scope: pick(["(none)", "S1", "S2"]) });
    for (const session of ["a", "b", "c"]) {
      let cursor = Math.floor(random() * 10) * MIN, previous: Planned | undefined;
      for (let turn = 0; turn < 3 && planned.length < 14; turn++) {
        const from = cursor, to = from + (1 + Math.floor(random() * 20)) * MIN, labels = label();
        if (previous) planned.push({ ...previous, from: previous.to, to: from, kind: "wait", end: false });
        const current: Planned = { from, to, labels, kind: "active", session, agentKind: "primary", end: true };
        planned.push(current); previous = current; cursor = to + Math.floor(random() * 30) * MIN;
      }
    }
    for (let i = 0; i < 6; i++) { const from = Math.floor(random() * 100) * MIN; planned.push({ from, to: from + (1 + Math.floor(random() * 40)) * MIN, labels: label(), kind: "active", session: pick(["a", "b", "c"]), agentKind: "subagent", end: true }); }
    const events = planned.filter(p => p.kind === "active").flatMap((p, n) => [
      { ms: p.from, finish: false, p, n }, { ms: p.to, finish: true, p, n },
    ]).sort((x, y) => x.ms - y.ms || Number(x.finish) - Number(y.finish) || x.n - y.n);
    for (const { ms, finish, p, n } of events) {
      // Time only moves forward: a collector clock that ran ahead of undelivered events would fold them away.
      const clock = at(deps, ms);
      const { scope, ...named } = p.labels, fields = { activityId: `r${run}-${n}`, sessionId: p.session, agentKind: p.agentKind, ...named, ...(scope === "(none)" ? {} : { scope }), occurredAt: stamp(ms) };
      assert.equal(apply(state, clock, event(`r${run}-${n}-${finish ? "f" : "s"}`, { ...fields, kind: finish ? "agent.finished" : "agent.started", ...(finish ? { outcome: "completed" } : {}) })).written, true);
    }
    const frontier = state.usage.frontier, keys = new Set<string>();
    for (const p of planned) for (let level = 0; level <= 3; level++) keys.add(JSON.stringify(Object.values(p.labels).slice(0, level)));
    assert.equal(state.usage.health.clippedIntervals, 0);
    for (const key of keys) {
      const path = JSON.parse(key) as string[];
      const inKey = (p: Planned) => path.every((part, level) => Object.values(p.labels)[level] === part);
      // Brute force on a one-minute grid: every planned time is a whole minute, so cells are exact.
      const cells = (kind: string): Set<number> => {
        const out = new Set<number>();
        for (const p of planned) if (p.kind === kind && inKey(p)) for (let m = p.from / MIN; m < p.to / MIN; m++) if (frontier !== null && (m + 1) * MIN <= frontier - Date.parse(AT)) out.add(m);
        return out;
      };
      const active = cells("active"), wait = [...cells("wait")].filter(m => !active.has(m));
      const row = path.length === 0 ? state.usage.total : rowOf(state, ...path);
      assert.equal(row.activeMs, active.size * MIN, `active ${key} run ${run}`); assert.equal(row.waitMs, wait.length * MIN, `wait ${key} run ${run}`);
      const spans = planned.filter(inKey); const wall = Math.max(...spans.map(p => p.to)) - Math.min(...spans.map(p => p.from));
      assert.ok(row.activeMs + row.waitMs <= wall);
    }
  }
});

// ---- pitch tree, LRU fold, transitions, trace and the size bound ---------------------------------------------

type Fixture = ReturnType<typeof blankState>;
/** A primary turn that credits one pitch, phase and scope, at its own point in time. */
function credited(state: Fixture, deps: RuntimeDeps, n: number, fields: Record<string, unknown>) {
  const run = { sessionId: "tree", agentKind: "primary", activityId: `tree${n}`, ...fields };
  apply(state, at(deps, n * 2 * MIN), event(`tree${n}-s`, { ...run, kind: "agent.started", occurredAt: stamp(n * 2 * MIN) }));
  apply(state, at(deps, n * 2 * MIN + MIN), event(`tree${n}-f`, { ...run, kind: "agent.finished", outcome: "completed", occurredAt: stamp(n * 2 * MIN + MIN) }));
}
const summed = (state: Fixture, field: typeof ROW_FIELDS[number]): number => Object.values(state.usage.pitches).reduce((n, node) => n + node.row[field], 0);
const ROW_FIELDS = ["activeMs", "waitMs", "turnsStarted", "turnsFinished", "gapsMeasured", "gapsUnmeasured", "gapsOverCap"] as const;

test("the 51st pitch gets its own row and the least recently used pitch folds into other", t => {
  const { deps } = fixture(t), state = blankState(deps);
  for (let i = 0; i <= LIMITS.pitches; i++) apply(state, at(deps, i * MIN), event(`p${i}`, { pitch: `p${i}`, occurredAt: stamp(i * MIN) }));
  assert.ok(state.pitches.p50); assert.equal(state.pitches.p0, undefined); assert.ok(state.pitches["(other)"]);
  assert.equal(state.pitches["(other)"].events["skill.used"], 1);
  assert.equal(state.usage.health.pitchFolds, 1); assert.equal(state.health.overflowEvents, 0);
  assert.equal(Object.keys(state.pitches).length, 51);
  assert.equal(validState(JSON.parse(JSON.stringify(state))), true);
});

test("totals stay whole across 200 folds in both pitch stores", t => {
  const { deps } = fixture(t), state = blankState(deps);
  for (let i = 0; i < 250; i++) credited(state, deps, i, { pitch: `p${i}`, phase: i % 2 ? "build" : "plan", scope: `S${i % 3}` });
  assert.equal(state.usage.health.pitchFolds, 200);
  for (const field of ROW_FIELDS) assert.equal(summed(state, field), state.usage.total[field], field);
  assert.equal(state.usage.total.turnsStarted, 250);
  for (const kind of ["agent.started", "agent.finished"] as const) assert.equal(Object.values(state.pitches).reduce((n, row) => n + row.events[kind], 0), state.totals.events[kind]);
  for (const node of Object.values(state.usage.pitches)) for (const field of ROW_FIELDS) {
    assert.equal(Object.values(node.phases).reduce((n, phase) => n + phase.row[field], 0), node.row[field]);
    for (const phase of Object.values(node.phases)) assert.equal(Object.values(phase.scopes).reduce((n, row) => n + row[field], 0), phase.row[field]);
  }
  assert.equal(validState(JSON.parse(JSON.stringify(state))), true);
});

test("a pitch that a pending activity routes to survives a fold, and a fully referenced set sends the newcomer to other", t => {
  const { deps } = fixture(t), state = blankState(deps);
  for (let i = 0; i < LIMITS.pitches; i++) apply(state, at(deps, i * MIN), event(`p${i}`, { pitch: `p${i}`, occurredAt: stamp(i * MIN) }));
  apply(state, at(deps, 60 * MIN), event("hold", { kind: "agent.started", activityId: "hold", sessionId: "s", agentKind: "subagent", pitch: "p0", occurredAt: stamp(60 * MIN) }));
  apply(state, at(deps, 61 * MIN), event("new", { pitch: "newcomer", occurredAt: stamp(61 * MIN) }));
  assert.ok(state.pitches.p0); assert.equal(state.pitches.p1, undefined); assert.ok(state.pitches.newcomer);
  const full = blankState(deps);
  for (let i = 0; i < LIMITS.pitches; i++) apply(full, at(deps, (i + 1) * MIN), event(`h${i}`, { kind: "agent.started", activityId: `h${i}`, sessionId: "s", agentKind: "subagent", pitch: `p${i % 50}`, occurredAt: stamp(MIN) }));
  const before = full.usage.health.pitchFolds;
  apply(full, at(deps, 61 * MIN), event("late", { pitch: "newcomer", occurredAt: stamp(61 * MIN) }));
  assert.equal(full.pitches.newcomer, undefined); assert.equal(full.usage.health.pitchFolds, before); assert.equal(full.health.overflowEvents, 1);
  assert.equal(full.pitches["(other)"].events["skill.used"], 1);
});

test("phases and scopes overflow into other, and scope rows stay within the leaf cap", t => {
  const { deps } = fixture(t), state = blankState(deps);
  for (let i = 0; i < 20; i++) credited(state, deps, i, { pitch: "wide", phase: `ph${i}`, scope: "S1" });
  const wide = state.usage.pitches.wide;
  assert.equal(Object.keys(wide.phases).filter(k => k !== "(other)").length, LIMITS.phasesPerPitch); assert.equal(wide.phases["(other)"].row.turnsStarted, 4);
  for (let i = 0; i < 30; i++) for (let j = 1; j <= 25; j++) credited(state, deps, 100 + i * 25 + j, { pitch: `leaf${i}`, phase: "build", scope: `S${j}` });
  const leaves = Object.values(state.usage.pitches).flatMap(node => Object.values(node.phases).flatMap(phase => Object.keys(phase.scopes))).filter(k => k !== "(other)");
  assert.ok(leaves.length <= LIMITS.leaves);
  for (const field of ROW_FIELDS) assert.equal(summed(state, field), state.usage.total[field], field);
  assert.equal(validState(JSON.parse(JSON.stringify(state))), true);
});

test("phase starts are classified by pipeline rank and the trace keeps the newest 32", t => {
  const { deps } = fixture(t), state = blankState(deps);
  const start = (n: number, phase: string) => apply(state, at(deps, n * MIN), event(`ph${n}`, { kind: "phase.started", activityId: `a${n}`, phase, occurredAt: stamp(n * MIN) }));
  ["shape", "plan", "plan", "build", "plan", "weird", "ship"].forEach((phase, n) => start(n, phase));
  const node = state.usage.pitches.metrics;
  assert.deepEqual(node.transitions, { repeat: 1, forward: 2, back: 1, other: 2 });
  assert.deepEqual(node.trace.map(entry => entry.class), ["start", "forward", "repeat", "forward", "back", "other", "other"]);
  for (let n = 7; n < 47; n++) start(n, n % 2 ? "build" : "audit");
  assert.equal(node.trace.length, LIMITS.trace); assert.equal(node.trace[0].at, stamp(15 * MIN));
  assert.equal(Object.values(node.transitions).reduce((a, b) => a + b, 0), 46); assert.equal(node.lastPhase, "audit");
  assert.equal(state.totals.gates.approve + state.totals.gates.revise + state.totals.gates.back + state.totals.gates.stop, 0);
  assert.equal(validState(JSON.parse(JSON.stringify(state))), true);
});

test("a state with every cap filled stays under the size bound and reads back as valid", async t => {
  const { deps, root, file } = fixture(t), state = blankState(deps), directory = metricsDirectory(root, true, deps)!;
  const DAY = 24 * HOUR, steps = 1800, span = 29.8 * DAY;
  let last = 0;
  for (let n = 0; n < steps; n++) {
    const ms = Math.floor(span * n / steps), clock = at(deps, ms), common = { vendor: `v${n % 9}`, pitch: `p${n % 50}`, phase: `ph${n % 16}`, occurredAt: stamp(ms) };
    apply(state, clock, event(`fill${n}-skill`, { ...common, skill: `sk${n % 34}` }));
    apply(state, clock, event(`fill${n}-agent`, { ...common, kind: "agent.finished", activityId: `fa${n}`, outcome: "completed", role: `r${n % 34}`, provider: "pv", model: `m${n % 34}` }));
    apply(state, clock, event(`fill${n}-phase`, { ...common, kind: "phase.started", activityId: `fp${n}`, scope: `S${n % 26}` }));
    apply(state, clock, event(`fill${n}-turn`, { ...common, kind: "agent.started", activityId: `ft${n}`, sessionId: `ses${n % 32}`, agentKind: "primary", scope: `S${n % 26}` }));
    apply(state, at(deps, ms + MIN), event(`fill${n}-end`, { ...common, kind: "agent.finished", activityId: `ft${n}`, sessionId: `ses${n % 32}`, agentKind: "primary", outcome: "completed", scope: `S${n % 26}`, occurredAt: stamp(ms + MIN) }));
    last = ms + MIN;
  }
  const base = last + HOUR, clock = (ms: number) => at(deps, ms);
  for (let i = 0; i < LIMITS.pending - 1; i++) apply(state, clock(base + i * MIN), event(`hold${i}`, { kind: "agent.started", activityId: `hold${i}`, sessionId: "hold", agentKind: "subagent", pitch: `p${i % 50}`, occurredAt: stamp(base + i * MIN) }));
  const tail = base + 70 * MIN;
  for (let i = 0; i < 400; i++) {
    const fields = { activityId: `iv${i}`, sessionId: "hold", agentKind: "subagent", pitch: `p${i % 50}` };
    apply(state, clock(tail + 90 * MIN), event(`iv${i}-s`, { ...fields, kind: "agent.started", occurredAt: stamp(tail + (i % 7) * 1000) }));
    apply(state, clock(tail + 90 * MIN), event(`iv${i}-f`, { ...fields, kind: "agent.finished", outcome: "completed", occurredAt: stamp(tail + 40 * MIN + i * 1000) }));
  }
  apply(state, clock(tail + 90 * MIN), event("last-hold", { kind: "agent.started", activityId: "last-hold", sessionId: "hold", agentKind: "subagent", occurredAt: stamp(tail + 80 * MIN) }));
  assert.equal(Object.keys(state.pending).length, LIMITS.pending); assert.equal(Object.keys(state.usage.sessions).length, LIMITS.sessions);
  assert.ok(state.usage.open.length > 200); assert.equal(Object.keys(state.pitches).length - Number(Boolean(state.pitches["(other)"])), LIMITS.pitches);
  assert.equal(Object.keys(state.days).length, LIMITS.days); assert.equal(state.recent.length, LIMITS.recent);
  assert.ok(Object.entries(state.usage.pitches).every(([name, node]) => name === "(other)" || node.trace.length === LIMITS.trace));
  const bytes = new TextEncoder().encode(JSON.stringify(state)).length;
  t.diagnostic(`S5 full-cap state bytes: ${bytes}`);
  assert.ok(bytes < LIMITS.stateBytes);
  deps.fs.writeFileSync(file, JSON.stringify(state));
  const read = readWorkflowState(directory, deps);
  assert.equal(read.status, "valid");
  assert.equal((await recordWorkflowEvent(event("after-fill", { occurredAt: AT }), root, memoryLease(at(deps, tail + 90 * MIN)))).written, true);
});

// ---- dropped-capture marker --------------------------------------------------------------------------------

const MARKER = ".project/metrics/workflow-usage.dropped";
/** A lease that is always held by someone else, with a clock that skips the wait. */
function busyLease(deps: RuntimeDeps): RuntimeDeps {
  let time = 0;
  return { ...deps, clock: { ...deps.clock, monotonicMs: () => (time += 1000), sleep: async () => {} }, net: { ...deps.net, tryListen: async () => ({ busy: true as const }) } };
}

test("each dropped capture leaves one byte and the next recorded event counts and removes them", async t => {
  const { deps, root, file } = fixture(t), directory = metricsDirectory(root, true, deps)!;
  for (let i = 0; i < 3; i++) assert.equal(recordDroppedCapture(root, deps), true);
  assert.equal(deps.fs.statSync(deps.path.join(root, MARKER)).size, 3);
  const result = await recordWorkflowEvent(event(), root, memoryLease(deps));
  assert.equal(result.written, true); assert.equal(result.state!.usage.health.captureDropped, 3);
  assert.deepEqual(deps.fs.readdirSync(directory), [STATE_FILE]); assert.equal(JSON.parse(deps.fs.readFileSync(file)).usage.health.captureDropped, 3);
  assert.equal((await recordWorkflowEvent(event("again"), root, memoryLease(deps))).state!.usage.health.captureDropped, 3);
});

test("a busy lease or a legacy lock leaves a marker instead of a silent loss", async t => {
  const { deps, root } = fixture(t), directory = metricsDirectory(root, true, deps)!;
  const refused = await recordWorkflowEvent(event(), root, busyLease(deps));
  assert.deepEqual(refused, { written: false, reason: "metrics lease unavailable; event not recorded" });
  assert.equal(deps.fs.statSync(deps.path.join(root, MARKER)).size, 1);
  deps.fs.writeFileSync(deps.path.join(directory, ".token-consumption.lock"), "");
  assert.equal((await recordWorkflowEvent(event("two"), root, memoryLease(deps))).reason, "legacy metrics lock is present");
  assert.equal(deps.fs.statSync(deps.path.join(root, MARKER)).size, 2);
  deps.fs.unlinkSync(deps.path.join(directory, ".token-consumption.lock"));
  assert.equal((await recordWorkflowEvent(event("three"), root, memoryLease(deps))).state!.usage.health.captureDropped, 2);
});

test("a symlinked or FIFO marker is refused without reading, blocking or touching its target", async t => {
  const { deps, root } = fixture(t), directory = metricsDirectory(root, true, deps)!, marker = deps.path.join(directory, "workflow-usage.dropped");
  const precious = deps.path.join(root, "precious"); deps.fs.writeFileSync(precious, "DO-NOT-TOUCH");
  deps.fs.symlinkSync(precious, marker);
  assert.equal(recordDroppedCapture(root, deps), false);
  assert.equal((await recordWorkflowEvent(event(), root, memoryLease(deps))).state!.usage.health.captureDropped, 0);
  assert.equal(deps.fs.readFileSync(precious), "DO-NOT-TOUCH"); assert.equal(deps.fs.lstatSync(marker).isSymbolicLink(), true);
  deps.fs.unlinkSync(marker);
  assert.equal(deps.child.runSync("mkfifo", [marker]).status, 0);
  assert.equal(recordDroppedCapture(root, deps), false);
  assert.equal((await recordWorkflowEvent(event("two"), root, memoryLease(deps))).written, true);
  assert.equal(deps.fs.lstatSync(marker).isFile(), false);
});

test("the marker stops growing at its cap and the count reads as a lower bound", async t => {
  const { deps, root } = fixture(t);
  metricsDirectory(root, true, deps);
  let accepted = 0;
  for (let i = 0; i < LIMITS.dropMarkerBytes + 20; i++) if (recordDroppedCapture(root, deps)) accepted++;
  assert.equal(accepted, LIMITS.dropMarkerBytes); assert.equal(deps.fs.statSync(deps.path.join(root, MARKER)).size, LIMITS.dropMarkerBytes);
  assert.equal((await recordWorkflowEvent(event(), root, memoryLease(deps))).state!.usage.health.captureDropped, LIMITS.dropMarkerBytes);
});

test("a dropped capture never creates the metrics directory and never throws or echoes a runtime error", t => {
  const { deps, root } = fixture(t);
  assert.equal(recordDroppedCapture(root, deps), false); assert.equal(deps.fs.existsSync(deps.path.join(root, ".project/metrics")), false);
  metricsDirectory(root, true, deps);
  const exploding: RuntimeDeps = { ...deps, fs: { ...deps.fs, openSync: () => { throw Object.assign(new Error("SECRET/path"), { code: "EACCES" }); } } };
  assert.equal(recordDroppedCapture(root, exploding), false);
  assert.equal(recordDroppedCapture(deps.path.join(root, "missing"), deps), false);
});

test("a marker survives a failed state write and is counted by the next one", async t => {
  const { deps, root } = fixture(t), directory = metricsDirectory(root, true, deps)!;
  recordDroppedCapture(root, deps); recordDroppedCapture(root, deps);
  const broken: RuntimeDeps = { ...memoryLease(deps), fs: { ...deps.fs, renameSync: (from, to) => { if (to.endsWith(STATE_FILE)) throw Object.assign(new Error("SECRET"), { code: "EACCES" }); deps.fs.renameSync(from, to); } } };
  assert.equal((await recordWorkflowEvent(event(), root, broken)).reason, "metrics operation failed (EACCES)");
  assert.equal(deps.fs.statSync(deps.path.join(directory, "workflow-usage.dropped")).size, 2);
  assert.equal((await recordWorkflowEvent(event("retry"), root, memoryLease(deps))).state!.usage.health.captureDropped, 2);
});

// ---- audit cycle 1: hand-edited fold state ----------------------------------------------------------------

function handEditedFrontier(deps: RuntimeDeps) {
  const state = blankState(deps), now = Date.parse(AT);
  state.usage.frontier = now + 60_000;
  for (let i = 0; i < LIMITS.openIntervals; i++) state.usage.open.push({ s: now - 10_000 - i, e: now - 1000 - i, kind: "active", pitch: "p", phase: "ph", scope: "(none)" });
  return state;
}

test("a frontier past every open interval end is not valid state", t => {
  const { deps } = fixture(t), state = handEditedFrontier(deps);
  assert.equal(validState(JSON.parse(JSON.stringify(state))), false);
  state.usage.frontier = Date.parse(AT) - 2000 - LIMITS.openIntervals;
  assert.equal(validState(JSON.parse(JSON.stringify(state))), true);
});

test("a state that broke the fold invariant is cut back instead of spinning over the record cap", t => {
  const { deps } = fixture(t), state = handEditedFrontier(deps);
  const sub = { sessionId: "s", agentKind: "subagent", pitch: "p", phase: "ph", activityId: "x" };
  apply(state, deps, event("a", { ...sub, kind: "agent.started", occurredAt: stamp(30_000) }));
  apply(state, at(deps, 0), event("b", { ...sub, kind: "agent.finished", outcome: "completed", occurredAt: stamp(120_000) }));
  assert.ok(state.usage.open.length <= LIMITS.openIntervals); assert.ok(state.usage.health.clippedIntervals > 0);
});

test("a counter overflow while consuming the marker restores it", async t => {
  const { deps, root, file } = fixture(t), directory = metricsDirectory(root, true, deps)!;
  const seeded = blankState(deps); seeded.usage.health.captureDropped = Number.MAX_SAFE_INTEGER;
  deps.fs.writeFileSync(file, JSON.stringify(seeded));
  recordDroppedCapture(root, deps);
  assert.equal((await recordWorkflowEvent(event(), root, memoryLease(deps))).reason, "metric counter overflow");
  assert.equal(deps.fs.statSync(deps.path.join(directory, "workflow-usage.dropped")).size, 1);
  assert.deepEqual(deps.fs.readdirSync(directory).sort(), ["workflow-usage.dropped", STATE_FILE]);
});

// Capture prerequisite: canonical native segments share one identity per vendor/session.
const capture = (id: string, kind: string, minute: number, fields: Record<string, unknown> = {}) =>
  event(id, { kind, source: "native", vendor: "claude", sessionId: "capture-session", pitch: undefined,
    occurredAt: minutes(minute), activityId: kind.startsWith("phase.") ? "segment:capture-session" : "turn:capture-session", ...fields });

test("preserves resolver sentinels through a matched native lifecycle and strict leased round trip", async t => {
  const { deps: base, root } = fixture(t), deps = memoryLease(ahead(base));
  const start = capture("sentinel-start", "agent.started", 0, { agentKind: "primary", pitch: "(unattributed)", phase: "build", scope: "(none)" });
  assert.equal((await recordWorkflowEvent(start, root, deps)).written, true);
  const result = await recordWorkflowEvent(capture("sentinel-finish", "agent.finished", 1, { outcome: "completed", agentKind: "primary" }), root, deps);
  assert.equal(result.written, true);
  assert.equal(result.state!.totals.matchedFinishes, 1);
  assert.equal(rowOf(result.state!, "(unattributed)", "build", "(none)").activeMs, MIN);
  assert.equal(result.state!.health.overflowEvents, 0);
  const read = readWorkflowState(metricsDirectory(root, false, deps)!, deps, minutes(2));
  assert.equal(read.status, "valid");
  assert.equal(validState(JSON.parse(JSON.stringify(result.state))), true);
  for (const field of ["vendor", "phase", "scope", "pitch"] as const) {
    assert.equal(normalizeEvent({ ...start, [field]: "(arbitrary)" }, deps)[field], "(other)");
  }
  assert.equal(normalizeEvent({ ...start, vendor: "(unattributed)" }, deps).vendor, "(other)");
});

test("inherits native start labels from the session segment and keeps them across a phase change", t => {
  const { deps: base } = fixture(t), deps = ahead(base), state = blankState(deps);
  assert.equal(apply(state, deps, capture("plan", "phase.started", 0, { pitch: "first", phase: "plan", scope: "S1" })).written, true);
  for (const agentKind of ["primary", "subagent"] as const) {
    assert.equal(apply(state, deps, capture(`start-${agentKind}`, "agent.started", 1, { activityId: agentKind, agentKind })).written, true);
  }
  assert.equal(apply(state, deps, capture("build", "phase.started", 2, { pitch: "second", phase: "build", scope: "S2" })).written, true);
  for (const agentKind of ["primary", "subagent"] as const) {
    assert.equal(apply(state, deps, capture(`end-${agentKind}`, "agent.finished", 3, { activityId: agentKind, agentKind, outcome: "completed" })).written, true);
  }
  assert.equal(rowOf(state, "first", "plan", "S1").activeMs, 2 * MIN);
  assert.equal(rowOf(state, "second").activeMs, 0);
  assert.equal(apply(state, deps, capture("next", "agent.started", 4, { agentKind: "primary" })).written, true);
  const next = Object.values(state.pending).find(x => x.kind === "agent")!;
  assert.deepEqual({ pitch: next.pitch, phase: next.phase, scope: next.scope }, { pitch: "second", phase: "build", scope: "S2" });
  assert.equal(apply(state, deps, capture("next", "agent.started", 4, { agentKind: "primary" })).reason, "duplicate event");
  assert.equal(validState(JSON.parse(JSON.stringify(state))), true);
});

test("isolates inherited labels by session and vendor and preserves explicit start labels", t => {
  const { deps: base } = fixture(t), deps = ahead(base), state = blankState(deps);
  apply(state, deps, capture("segment", "phase.started", 0, { pitch: "segment-pitch", phase: "build", scope: "S1" }));
  const cases = [
    { sessionId: "other-session" }, { vendor: "opencode" }, { sessionId: undefined }, { source: "manual" },
    { pitch: "explicit", phase: "audit", scope: "S3" },
  ];
  for (const [i, fields] of cases.entries()) {
    apply(state, deps, capture(`isolated-${i}`, "agent.started", 1, { activityId: `a${i}`, agentKind: "subagent", ...fields }));
  }
  const agents = Object.values(state.pending).filter(x => x.kind === "agent");
  assert.deepEqual(agents.map(x => x.pitch), ["(unknown)", "(unknown)", "(unknown)", "(unknown)", "explicit"]);
  assert.deepEqual(agents.map(x => x.scope), ["(none)", "(none)", "(none)", "(none)", "S3"]);
  const before = blankState(deps);
  apply(before, deps, capture("early-segment", "phase.started", 2, { pitch: "future", phase: "build" }));
  apply(before, deps, capture("earlier-turn", "agent.started", 1, { agentKind: "primary" }));
  assert.equal(Object.values(before.pending).find(x => x.kind === "agent")!.pitch, "(unknown)");
});

test("replaces a canonical native phase, credits its old labels and deduplicates the whole transition", t => {
  const { deps: base } = fixture(t), deps = ahead(base), state = blankState(deps);
  apply(state, deps, capture("segment-one", "phase.started", 0, { pitch: "metrics", phase: "plan", scope: "S1" }));
  const next = capture("segment-two", "phase.started", 1, { pitch: "metrics", phase: "build", scope: "S2" });
  assert.equal(apply(state, deps, next).written, true);
  assert.equal(state.dimensions.phases.claude.plan.elapsedMs, MIN);
  assert.equal(state.dimensions.phases.claude.build.elapsedMs, 0);
  assert.equal(state.totals.events["phase.finished"], 1);
  assert.equal(state.totals.events["phase.started"], 2);
  assert.equal(state.totals.events["agent.finished"], 0);
  assert.equal(state.totals.matchedFinishes, 1);
  assert.equal(state.usage.total.activeMs, 0);
  assert.equal(state.usage.pitches.metrics.transitions.forward, 1);
  assert.equal(Object.values(state.pending).length, 1);
  const bytes = JSON.stringify(state);
  assert.equal(apply(state, deps, next).reason, "duplicate event");
  assert.equal(JSON.stringify(state), bytes);
  assert.equal(apply(state, deps, capture("backwards", "phase.started", 0, { pitch: "metrics", phase: "shape" })).written, false);
  assert.equal(JSON.stringify(state), bytes);
  assert.equal(validState(JSON.parse(bytes)), true);
});

test("records phase replacement and sentinel inheritance under one lease per input", async t => {
  const { deps: base, root } = fixture(t); let leases = 0;
  const deps = memoryLease(ahead(base), () => { leases++; });
  const inputs = [
    capture("phase-a", "phase.started", 0, { pitch: "(unattributed)", phase: "plan", scope: "(none)" }),
    capture("phase-b", "phase.started", 1, { pitch: "metrics", phase: "build", scope: "S1" }),
    capture("turn-a", "agent.started", 2, { agentKind: "primary" }),
    capture("turn-b", "agent.finished", 3, { agentKind: "primary", outcome: "completed" }),
  ];
  for (const input of inputs) assert.equal((await recordWorkflowEvent(input, root, deps)).written, true);
  assert.equal(leases, inputs.length);
  const result = readWorkflowState(metricsDirectory(root, false, deps)!, deps, minutes(4));
  assert.equal(result.status, "valid");
  if (result.status !== "valid") return;
  assert.equal(result.state.pitches["(unattributed)"].events["phase.finished"], 1);
  assert.equal(rowOf(result.state, "metrics", "build", "S1").activeMs, MIN);
  assert.equal(result.state.health.unmatchedFinishes, 0);
  assert.deepEqual(deps.fs.readdirSync(metricsDirectory(root, false, deps)!), [STATE_FILE]);
});
