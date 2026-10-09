import assert from "node:assert/strict";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { buildReport, createReports, generateReport } from "./workflow-metrics-report.mts";
import { LIMITS, STATE_FILE, applyEvent, blankState, metricsDirectory, normalizeEvent, recordWorkflowEvent, validState } from "./workflow-metrics-state.mts";
import { createTestDeps, runScript, tempFixture } from "./runtime/test-helpers.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

const AT = "2026-10-08T12:00:00.000Z";
function fixture(t: TestContext) {
  const base = createTestDeps(), deps: RuntimeDeps = { ...base, clock: { ...base.clock, now: () => Date.parse(AT) } };
  const root = tempFixture(deps, { ".project/.gitkeep": "", ".project/metrics/token-consumption.json": "LEGACY-DO-NOT-READ" });
  t.after(() => deps.fs.rmSync(root, { recursive: true, force: true }));
  return { deps, root, directory: deps.path.join(root, ".project/metrics"), file: deps.path.join(root, ".project/metrics", STATE_FILE) };
}
function scenario(deps: RuntimeDeps) {
  const state = blankState(deps, "example-project");
  let i = 0;
  const add = (kind: string, values: Record<string, unknown> = {}) => {
    const result = applyEvent(state, normalizeEvent({ eventId: `e${++i}`, kind, vendor: "codex", source: "manual", pitch: "alpha", occurredAt: AT, ...values }, deps), deps);
    assert.equal(result.written, true);
  };
  add("session.started", { sessionId: "private-session" });
  add("agent.started", { activityId: "a", sessionId: "private-session", agentKind: "primary", model: "gpt", provider: "openai", role: "worker" });
  add("agent.finished", { activityId: "a", sessionId: "private-session", agentKind: "primary", model: "gpt", provider: "openai", role: "worker", outcome: "completed", occurredAt: "2026-10-08T12:00:10.000Z" });
  add("agent.finished", { vendor: "claude", pitch: "beta", activityId: "b", agentKind: "subagent", outcome: "failed" });
  add("phase.started", { activityId: "phase", phase: "build" });
  add("phase.paused", { activityId: "phase", phase: "build", occurredAt: "2026-10-08T12:00:10.000Z" });
  add("phase.resumed", { activityId: "phase", phase: "build", occurredAt: "2026-10-08T12:00:30.000Z" });
  add("phase.finished", { activityId: "phase", phase: "build", outcome: "completed", occurredAt: "2026-10-08T12:01:00.000Z" });
  add("phase.started", { activityId: "paused", phase: "plan" });
  add("phase.paused", { activityId: "paused", phase: "plan" });
  add("gate.decided", { decision: "approve" });
  add("gate.decided", { decision: "revise", vendor: "claude", pitch: "beta" });
  add("audit.finished", { outcome: "completed", mustFixCount: 0 });
  add("audit.finished", { outcome: "failed", mustFixCount: 2, vendor: "claude", pitch: "beta" });
  add("pitch.finished", { outcome: "completed" });
  add("pitch.finished", { outcome: "cancelled", vendor: "claude", pitch: "beta" });
  add("skill.used", { skill: "build", tokens: { input: 100 }, costUsd: 5, prompt: "SECRET-PROMPT" });
  return state;
}

test("agrees on independently calculated activity, ships, outcomes and duration in all formats", t => {
  const { deps } = fixture(t), state = scenario(deps), outputs = createReports(state, AT);
  const report = JSON.parse(outputs.json);
  const expected = { "Session starts": 1, "Primary agent finishes": 1, "Subagent finishes": 1, "Unclassified agent finishes": 0, "Skill uses": 1, "Phase starts": 2, "Phase finishes": 1, "Pitch starts": 0, "Pitch finishes": 2, "Ships (completed pitches)": 1, "Audit cycles": 2, "Audit must-fix findings": 2 };
  assert.deepEqual(report.activity, expected);
  for (const [measure, count] of Object.entries(expected)) {
    assert.ok(outputs.markdown.includes(`| ${measure} | ${count} |`));
    assert.ok(outputs.html.includes(`<th scope="row">${measure}</th><td>${count}</td>`));
  }
  assert.equal(report.health["Unmatched agent/phase finishes"], 1);
  assert.equal(report.health["Model attribution gaps (agent events)"], 1);
  assert.deepEqual(report.pending, { running: 0, paused: 1 });
  assert.equal(report.collection.status, "observed");
  assert.equal(report.collection.automaticCapture, "unconfigured");
  assert.equal(report.retention.dailyFrom, "2026-10-08");
  assert.equal(state.totals.elapsedMs, 70_000); // 10s agent + 60s phase, explicitly overlapping.
  const phase = report.tables.find((table: { title: string }) => table.title === "By phase");
  assert.deepEqual(phase.rows[0], ["codex", "build", 1, 1, 0, 1, 1, 60_000, 1]);
  assert.match(outputs.markdown, /\| Ships \(completed pitches\) \| 1 \|/);
  assert.match(outputs.html, /<th scope="row">Ships \(completed pitches\)<\/th><td>1<\/td>/);
  assert.match(outputs.markdown, /\| codex \| build \| 1 \| 1 \| 0 \| 1 \| 1 \| 60,000 \| 1 \|/);
  for (const text of [outputs.json, outputs.markdown, outputs.html]) {
    assert.doesNotMatch(text, /private-session|SECRET-PROMPT|costUsd|"tokens"|"recent"|"fingerprint"|"projectId"/);
    for (const identity of Object.keys(state.pending)) assert.equal(text.includes(identity), false);
    assert.match(text, /unconfigured/);
  }
  assert.doesNotMatch(outputs.html, /<script|<iframe|<img|<a\b|onerror=/);
  assert.match(outputs.html, /<html lang="en">/); assert.match(outputs.html, /<caption>By phase<\/caption>/);
  assert.match(outputs.html, /tabindex="0" role="region" aria-label="By phase"/);
});

test("shows attribution gaps without unknown model rankings, and treats native provenance as unverified", t => {
  const { deps } = fixture(t), state = scenario(deps);
  applyEvent(state, normalizeEvent({ eventId: "native", kind: "agent.finished", vendor: "claude", source: "native", activityId: "native-id", outcome: "completed" }, deps), deps);
  const report = buildReport(state, AT);
  const models = report.tables.find(t => t.title === "By provider/model")!;
  assert.deepEqual(models.rows.map(row => row[1]), ["openai/gpt"]);
  assert.equal(report.health["Model attribution gaps (agent events)"], 2);
  assert.equal(report.activity["Ships (completed pitches)"], 1);
  assert.equal(report.collection.automaticCapture, "unconfigured");
  assert.match(report.tables.find(t => t.title === "Collection sources")!.note, /does not verify/);
});

test("provider/model component separators preserve distinct attribution safely", t => {
  const { deps } = fixture(t), state = blankState(deps);
  for (const [i, provider, model] of [[1, "a/b", "c"], [2, "a", "b/c"], [3, undefined, "a/b/c"]] as const) {
    applyEvent(state, normalizeEvent({ eventId: `pair-${i}`, kind: "agent.finished", vendor: "codex", source: "manual", activityId: `a-${i}`, outcome: "completed", provider, model }, deps), deps);
  }
  assert.equal(validState(state), true);
  const outputs = createReports(state, AT), table = outputs.report.tables.find(t => t.title === "By provider/model")!;
  assert.deepEqual(table.rows.map(row => row[1]).sort(), ["a / b/c", "a/b / c", "a/b/c"]);
  assert.equal(Object.keys(state.dimensions.models.codex).length, 3);
  assert.equal(state.health.missingModel, 0);
  assert.match(outputs.markdown, /a\/b \/ c/); assert.match(outputs.html, /a \/ b\/c/);
  for (const invalid of ["%3Cscript%3E", "%00", "%FF", "__proto__", "constructor", "%5F%5Fproto%5F%5F"]) {
    const corrupt = structuredClone(state);
    corrupt.dimensions.models.codex = Object.fromEntries([[invalid, Object.values(state.dimensions.models.codex)[0]]]);
    assert.equal(validState(corrupt), false);
    const refused = createReports(corrupt, AT);
    assert.equal(refused.report.collection.status, "unavailable");
    assert.equal(refused.report.tables.length, 0);
  }
});

test("preserves pre-counter snapshots without inventing historical ships", async t => {
  const { deps, root, file } = fixture(t), state = scenario(deps);
  const summaryMaps = [state.totals, ...Object.values(state.vendors), ...Object.values(state.pitches), ...Object.values(state.days), ...Object.values(state.dimensions).flatMap(vendors => Object.values(vendors).flatMap(names => Object.values(names)))];
  for (const s of summaryMaps) delete s.ships;
  assert.equal(validState(state), true);
  const report = buildReport(state, AT);
  assert.equal(report.activity["Ships (completed pitches)"], null);
  assert.match(report.notes.join(" "), /cannot be reconstructed/);
  deps.fs.writeFileSync(file, JSON.stringify(state));
  const result = await recordWorkflowEvent({ eventId: "new-ship", kind: "pitch.finished", vendor: "codex", source: "manual", pitch: "new-pitch", outcome: "completed" }, root, deps);
  assert.equal(result.written, true); assert.equal(result.state!.totals.ships, null);
  assert.equal(result.state!.pitches["new-pitch"].ships, 1);
  assert.equal(buildReport(result.state, AT).activity["Ships (completed pitches)"], null);
  const zero = blankState(deps); delete zero.totals.ships;
  assert.equal(buildReport(zero, AT).activity["Ships (completed pitches)"], 0);
  applyEvent(zero, normalizeEvent({ eventId: "first", kind: "pitch.finished", vendor: "codex", source: "manual", outcome: "failed" }, deps), deps);
  assert.equal(zero.totals.ships, 0);
});

test("marks old source facts stale without inferring collection failure", t => {
  const { deps } = fixture(t), state = scenario(deps);
  const outputs = createReports(state, "2026-10-16T12:00:00.000Z");
  assert.equal(outputs.report.collection.status, "stale");
  assert.equal(outputs.report.tables.every(table => table.status === "stale"), true);
  assert.equal(outputs.report.activity["Ships (completed pitches)"], 1);
  assert.match(outputs.markdown, /does not prove collection is broken/);
  assert.throws(() => createReports(state, "<script>"), /invalid report timestamp/);
});

test("renders missing, invalid and empty state honestly without copying unsafe fields", t => {
  const { deps } = fixture(t);
  const missing = createReports(null, AT);
  assert.equal(missing.report.collection.status, "unavailable");
  assert.equal(missing.report.activity["Skill uses"], null);
  assert.match(missing.markdown, /No workflow events recorded/);
  assert.ok(missing.markdown.indexOf("record --root .") < missing.markdown.indexOf("## Activity"));
  assert.ok(missing.html.indexOf("record --root .") < missing.html.indexOf("<h2>Activity"));
  for (const input of [{ ...blankState(deps), project: { label: "<script>SECRET</script>" } }, { ...blankState(deps), updatedAt: "![image](https://evil.example)" }, { ...blankState(deps), schemaVersion: 99 }, { ...blankState(deps), secret: "SECRET" }]) {
    const invalid = createReports(input, AT);
    assert.equal(invalid.report.collection.status, "unavailable");
    for (const text of [invalid.json, invalid.markdown, invalid.html]) assert.doesNotMatch(text, /SECRET|evil\.example/);
  }
  const empty = buildReport(blankState(deps), AT);
  assert.equal(empty.collection.status, "unavailable"); assert.equal(empty.activity["Skill uses"], 0);
});

test("escapes link-like labels and shows overflow without a fabricated vendor winner", t => {
  const { deps } = fixture(t), state = blankState(deps, "www.example");
  applyEvent(state, normalizeEvent({ eventId: "unsafe", kind: "skill.used", vendor: "http://example", source: "manual", skill: "a@b.c", pitch: "__proto__" }, deps), deps);
  const outputs = createReports(state, AT);
  assert.match(outputs.markdown, /http&#58;\/\/example/); assert.match(outputs.markdown, /a&#64;b.c/);
  assert.match(outputs.markdown, /www&#46;example/); assert.match(outputs.markdown, /Other \(overflow or invalid label\)/);
  assert.doesNotMatch(outputs.markdown, /Most used|Ranking basis/);
  assert.doesNotMatch(outputs.html, /href=|<a\b/);
});

test("regenerates reports without reading legacy state, changing counters or creating missing event state", async t => {
  const { deps, root, file, directory } = fixture(t);
  const noLegacy: RuntimeDeps = { ...deps, fs: { ...deps.fs, lstatSync: path => { assert.equal(path.includes("token-consumption.json"), false); return deps.fs.lstatSync(path); } } };
  assert.equal((await generateReport(root, "json", noLegacy)).written, true);
  assert.equal(deps.fs.existsSync(file), false);
  assert.ok(deps.fs.existsSync(deps.path.join(directory, "workflow-usage.md")));
  assert.ok(deps.fs.existsSync(deps.path.join(directory, "workflow-usage.html")));
  deps.fs.writeFileSync(file, JSON.stringify(scenario(deps)));
  const original = deps.fs.readFileSync(file);
  const first = await generateReport(root, "json", noLegacy), second = await generateReport(root, "json", noLegacy);
  assert.equal(first.written, true); assert.equal(second.output, first.output);
  assert.equal(deps.fs.readFileSync(file), original);
  assert.equal(deps.fs.readFileSync(deps.path.join(directory, "token-consumption.json")), "LEGACY-DO-NOT-READ");
});

test("refuses corrupt source state without replacing earlier report views", async t => {
  const { deps, root, file, directory } = fixture(t);
  const target = deps.path.join(directory, "workflow-usage.md"); deps.fs.writeFileSync(target, "OLD-VIEW");
  for (const content of ["bad JSON SECRET", JSON.stringify({ ...blankState(deps), schemaVersion: 5 }), JSON.stringify({ ...blankState(deps), project: { label: "[secret](https://evil.example)" } }), "x".repeat(LIMITS.stateBytes + 1)]) {
    deps.fs.writeFileSync(file, content);
    const result = await generateReport(root, "markdown", deps);
    assert.equal(result.written, false); assert.doesNotMatch(result.reason!, /SECRET|evil\.example/);
    assert.equal(deps.fs.readFileSync(file), content); assert.equal(deps.fs.readFileSync(target), "OLD-VIEW");
  }
});

test("preserves event state after unsafe destination or report-write failure and permits recovery", async t => {
  const { deps, root, file, directory } = fixture(t);
  const state = JSON.stringify(scenario(deps)); deps.fs.writeFileSync(file, state);
  const html = deps.path.join(directory, "workflow-usage.html");
  const markdown = deps.path.join(directory, "workflow-usage.md"); deps.fs.writeFileSync(markdown, "OLD-MARKDOWN");
  const precious = deps.path.join(root, "precious"); deps.fs.writeFileSync(precious, "PRECIOUS"); deps.fs.symlinkSync(precious, html);
  const result = await generateReport(root, "html", deps);
  assert.equal(result.written, false); assert.equal(result.reason, "unsafe output destination");
  assert.equal(deps.fs.readFileSync(markdown), "OLD-MARKDOWN");
  assert.equal(deps.fs.readFileSync(file), state); assert.equal(deps.fs.readFileSync(precious), "PRECIOUS");
  const cli = runScript(deps, deps.path.join(import.meta.dirname, "workflow-metrics.mts"), ["report", "--root", root, "--format", "html"], { env: { ...process.env, AI_WORKFLOW_RUNNER: deps.runtime }, timeoutMs: 10_000 });
  assert.equal(cli.status, 1); assert.equal(cli.stdout, "");
  assert.equal(cli.stderr, "[workflow-metrics] unsafe output destination\n");
  assert.equal(deps.fs.readFileSync(markdown), "OLD-MARKDOWN");
  assert.equal(deps.fs.readFileSync(file), state); assert.equal(deps.fs.readFileSync(precious), "PRECIOUS");
  deps.fs.unlinkSync(html);
  const broken: RuntimeDeps = { ...deps, fs: { ...deps.fs, renameSync: () => { throw Object.assign(new Error("SECRET/path"), { code: "EACCES" }); } } };
  assert.equal((await generateReport(root, "html", broken)).reason, "report generation failed (EACCES)");
  assert.equal(deps.fs.readdirSync(directory).some(name => name.endsWith(".tmp")), false);
  assert.equal(deps.fs.readFileSync(file), state);
  assert.equal((await generateReport(root, "html", deps)).written, true);
  deps.fs.writeFileSync(deps.path.join(directory, ".token-consumption.lock"), "");
  assert.equal((await generateReport(root, "json", deps)).reason, "legacy metrics lock is present");
});

test("generates the empty report through the real CLI and never imports code from the analyzed root", t => {
  const { deps, root, file, directory } = fixture(t);
  deps.fs.mkdirSync(deps.path.join(root, "ai-framework/scripts"), { recursive: true });
  deps.fs.writeFileSync(deps.path.join(root, "ai-framework/scripts/workflow-metrics-report.mts"), 'throw new Error("UNTRUSTED-CODE-RAN")');
  const script = deps.path.join(import.meta.dirname, "workflow-metrics.mts");
  const result = runScript(deps, script, ["report", "--root", root, "--format", "json"], { env: { ...process.env, AI_WORKFLOW_RUNNER: deps.runtime }, timeoutMs: 10_000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).collection.status, "unavailable");
  assert.equal(deps.fs.existsSync(file), false); assert.ok(deps.fs.existsSync(deps.path.join(directory, "workflow-usage.html")));
});

test("guards hostile persisted state through the actual CLI and labels stale reports in every format", t => {
  const { deps, root, file, directory } = fixture(t);
  const script = deps.path.join(import.meta.dirname, "workflow-metrics.mts");
  const run = (format: string) => runScript(deps, script, ["report", "--root", root, "--format", format], { env: { ...process.env, AI_WORKFLOW_RUNNER: deps.runtime }, timeoutMs: 10_000 });
  const state = scenario(deps); state.createdAt = "2000-01-01T00:00:00.000Z"; state.updatedAt = state.createdAt;
  deps.fs.writeFileSync(file, JSON.stringify(state));
  const original = deps.fs.readFileSync(file);
  for (const format of ["json", "markdown", "html"]) {
    const result = run(format); assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /stale/);
    assert.equal(deps.fs.readFileSync(file), original);
  }
  const view = deps.fs.readFileSync(deps.path.join(directory, "workflow-usage.html"));
  for (const bad of [{ ...state, schemaVersion: 9 }, { ...state, project: { ...state.project, label: "![SECRET](https://evil.example)" } }]) {
    const text = JSON.stringify(bad); deps.fs.writeFileSync(file, text);
    const result = run("html"); assert.equal(result.status, 1); assert.doesNotMatch(result.stderr + result.stdout, /SECRET|evil\.example/);
    assert.equal(deps.fs.readFileSync(file), text); assert.equal(deps.fs.readFileSync(deps.path.join(directory, "workflow-usage.html")), view);
  }
});
