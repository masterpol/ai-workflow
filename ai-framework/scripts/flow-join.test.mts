import assert from "node:assert/strict";
import { test } from "node:test";
import { FLOW_LIMITS, joinFlowReport, projectHistory, projectTokens, projectUsage } from "./flow-join.mts";
import type { FlowInputs, FlowNode, FlowReport, Loaded } from "./flow-join.mts";
import { blankState } from "./workflow-metrics-state.mts";
import type { UsageNode, UsageRow, UsageState } from "./workflow-metrics-state.mts";
import { createTestDeps } from "./runtime/test-helpers.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

const AT = "2026-10-21T12:00:00.000Z";
const deps: RuntimeDeps = (() => { const base = createTestDeps(); return { ...base, clock: { ...base.clock, now: () => Date.parse(AT) } }; })();
interface Leaf { completions: number; reportedUsageCount: number; unavailableCount: number; tokens: number; costUsd: number; pricedCount: number }
const leaf = (completions: number, reported: number, tokens: number): Leaf => ({ completions, reportedUsageCount: reported, unavailableCount: completions - reported, tokens, costUsd: 0, pricedCount: 0 });
type Spec = [pitch: string, phase: string, scope: string, vendor: string, row: Leaf];
function snapshot(spec: Spec[], extra: Record<string, unknown> = {}): Record<string, unknown> {
  const pitches: Record<string, { phases: Record<string, { scopes: Record<string, Record<string, Leaf>> }> }> = Object.create(null);
  for (const [pitch, phase, scope, vendor, row] of spec) {
    const phases = (pitches[pitch] ??= { phases: Object.create(null) }).phases;
    const scopes = (phases[phase] ??= { scopes: Object.create(null) }).scopes;
    (scopes[scope] ??= Object.create(null))[vendor] = row;
  }
  return { schemaVersion: 3, updatedAt: AT, flows: { since: "2026-10-19T00:00:00.000Z", pitches }, ...extra };
}
const time = (activeMs: number, waitMs = 0): UsageRow => ({ activeMs, waitMs, turnsStarted: 1, turnsFinished: 1, gapsMeasured: 0, gapsUnmeasured: 0, gapsOverCap: 0 });
type UsageSpec = Record<string, { row: UsageRow; phases?: Record<string, { row: UsageRow; scopes?: Record<string, UsageRow> }> }>;
function usageState(spec: UsageSpec, edit: (state: UsageState) => void = () => {}): UsageState {
  const state = blankState(deps, "example");
  for (const [pitch, body] of Object.entries(spec)) {
    const node: UsageNode = { lastAt: AT, row: body.row, phases: Object.create(null), transitions: { repeat: 1, forward: 2, back: 0, other: 0 }, trace: [{ at: AT, phase: "build", scope: "S1", class: "start" }], lastPhase: "build" };
    for (const [phase, entry] of Object.entries(body.phases ?? {})) node.phases[phase] = { row: entry.row, scopes: Object.assign(Object.create(null), entry.scopes ?? {}) };
    state.usage.pitches[pitch] = node;
  }
  edit(state);
  return state;
}
const missing: Loaded<never> = { status: "missing" };
function valid<T>(loaded: Loaded<T>): T {
  assert.equal(loaded.status, "valid", JSON.stringify(loaded));
  return (loaded as { value: T }).value;
}
function report(tokens: unknown | null, usage: UsageState | null, history: unknown | null = null, at = AT): FlowReport {
  const inputs: FlowInputs = { tokens: tokens === null ? missing : projectTokens(tokens), usage: usage === null ? missing : projectUsage(usage), history: history === null ? missing : projectHistory(history) };
  return joinFlowReport(inputs, at);
}
const find = (nodes: FlowNode[], label: string, source?: string): FlowNode => {
  const hit = nodes.find(n => n.label === label && (source === undefined || n.sources.includes(source as "tokens")));
  assert.ok(hit, `missing node ${label}`);
  return hit;
};

test("joins exact pitch, phase and scope, including (none), and keeps one-sided rows", () => {
  const out = report(
    snapshot([["alpha", "build", "S1", "claude", leaf(4, 4, 100)], ["alpha", "plan", "(none)", "claude", leaf(1, 1, 7)], ["alpha", "build", "S2", "claude", leaf(2, 2, 9)]]),
    usageState({ alpha: { row: time(500), phases: { build: { row: time(300), scopes: { S1: time(200), S3: time(100) } }, plan: { row: time(50), scopes: { "(none)": time(50) } } } } }));
  const alpha = find(out.pitches, "alpha"), build = find(alpha.children, "build"), plan = find(alpha.children, "plan");
  assert.deepEqual(alpha.sources, ["tokens", "usage"]);
  const s1 = find(build.children, "S1");
  assert.equal(s1.identity, "exact"); assert.deepEqual(s1.sources, ["tokens", "usage"]);
  assert.equal(s1.tokens?.[0].tokens, 100); assert.equal(s1.time?.activeMs, 200);
  assert.deepEqual(find(plan.children, "(none)").sources, ["tokens", "usage"]);
  assert.deepEqual([find(build.children, "S2").sources, find(build.children, "S3").sources], [["tokens"], ["usage"]]);
  assert.equal(find(build.children, "S2").time, null); assert.equal(find(build.children, "S3").tokens, null);
  assert.equal(build.tokens?.[0].tokens, 109); // disjoint token leaves roll up once
});

test("sentinels and noncanonical legacy keys are never identity", () => {
  const out = report(
    snapshot([["(other)", "build", "S1", "claude", leaf(3, 3, 30)], ["(unattributed)", "(unattributed)", "(none)", "claude", leaf(1, 1, 5)], ["alpha", "(unattributed)", "S1", "claude", leaf(1, 1, 2)], ["alpha", "build", "(other)", "claude", leaf(1, 0, 0)]]),
    usageState({ "(other)": { row: time(40), phases: { build: { row: time(40), scopes: { S1: time(40) } } } }, "(unknown)": { row: time(9) }, "(unattributed)": { row: time(1) },
      alpha: { row: time(10), phases: { legacyphase: { row: time(10), scopes: { S1: time(10) } }, build: { row: time(5), scopes: { "(other)": time(5) } } } } }));
  const others = out.pitches.filter(p => p.label === "(other)");
  assert.equal(others.length, 2); // one per store: a pitch folded in only one store stays unmatched
  assert.deepEqual(others.map(p => p.sources).sort(), [["tokens"], ["usage"]]);
  assert.ok(others.every(p => p.identity === "source-specific" && p.history === null));
  assert.equal(out.pitches.filter(p => p.label === "(unattributed)").length, 2);
  const alpha = find(out.pitches, "alpha");
  assert.equal(alpha.children.filter(c => c.label === "(unattributed)" || c.label === "legacyphase").every(c => c.identity === "source-specific" && c.sources.length === 1), true);
  const build = find(alpha.children, "build");
  assert.deepEqual(build.children.map(c => c.sources), [["tokens"], ["usage"]]); // (other) scope never joins either
  assert.equal(out.totals.tokens?.[0].completions, 6);
});

test("token reporting is partial, unreported or overflowed and never zero-filled", () => {
  const out = report(snapshot([["alpha", "build", "S1", "claude", leaf(4, 3, 60)], ["alpha", "build", "S1", "codex", leaf(2, 0, 0)], ["alpha", "build", "S2", "claude", leaf(1, 1, 5)]]), null);
  const cells = find(find(find(out.pitches, "alpha").children, "build").children, "S1").tokens!;
  assert.deepEqual(cells.map(c => [c.vendor, c.status, c.tokens]), [["claude", "partial", 60], ["codex", "unreported", null]]);
  assert.equal(cells[0].unavailable, 1);
  assert.equal(cells[1].completionUnit, "vendor-defined agent completion event");
  const alpha = find(out.pitches, "alpha");
  assert.deepEqual(alpha.tokens?.map(c => [c.vendor, c.completions, c.tokens]), [["claude", 5, 65], ["codex", 2, null]]);
  assert.equal(alpha.time, null);
});

test("an overflowing aggregate is refused as overflow while its leaves stay exact", () => {
  const big = Number.MAX_SAFE_INTEGER;
  const out = report(snapshot([["alpha", "build", "S1", "claude", leaf(1, 1, big)], ["alpha", "build", "S2", "claude", leaf(1, 1, 5)], ["beta", "build", "S1", "claude", leaf(1, 1, 5)]]), null);
  const alpha = find(out.pitches, "alpha");
  assert.deepEqual([alpha.tokens?.[0].status, alpha.tokens?.[0].tokens, alpha.tokens?.[0].completions], ["overflow", null, null]);
  assert.equal(find(find(alpha.children, "build").children, "S1").tokens?.[0].tokens, big);
  assert.equal(out.totals.tokens?.[0].status, "overflow");
  assert.equal(find(out.pitches, "beta").tokens?.[0].tokens, 5);
});

test("timing rollups use stored rows, never child sums, and vendor copies add no time", () => {
  const out = report(snapshot([["alpha", "build", "S1", "claude", leaf(1, 1, 1)], ["alpha", "build", "S1", "codex", leaf(1, 1, 1)]]),
    usageState({ alpha: { row: time(100, 30), phases: { build: { row: time(80, 20), scopes: { S1: time(60), S2: time(60) } } } } }));
  const alpha = find(out.pitches, "alpha"), build = find(alpha.children, "build");
  assert.deepEqual([alpha.time?.activeMs, alpha.time?.waitMs, build.time?.activeMs], [100, 30, 80]); // overlapping children (120) are not added
  assert.equal(find(build.children, "S1").time?.activeMs, 60);
  assert.equal(find(build.children, "S1").tokens?.length, 2);
  assert.equal(out.totals.time?.activeMs, 0); // the stored total row, not a sum of pitches
});

test("pending and buffered activity keep timing provisional without elapsed time", () => {
  const state = usageState({ alpha: { row: time(10) } }, s => { s.usage.open.push({ s: 1, e: 5, kind: "active", pitch: "alpha", phase: "build", scope: "S1" }); s.usage.frontier = 0; });
  state.pending["a".repeat(64)] = { startedAt: AT, lastAt: AT, status: "running" };
  const out = report(null, state);
  assert.deepEqual(out.timing, { provisional: true, pendingActivities: 1, bufferedIntervals: 1, settledThrough: "1970-01-01T00:00:00.000Z" });
  assert.equal(find(out.pitches, "alpha").time?.activeMs, 10);
  assert.equal(JSON.stringify(out).includes("a".repeat(64)), false);
  assert.equal(report(null, usageState({})).timing.provisional, false);
});

test("sources are refused without echoing values", () => {
  const hostile = JSON.parse('{"schemaVersion":3,"updatedAt":null,"flows":{"since":null,"pitches":{"__proto__":{"phases":{}}}}}') as unknown;
  const bad = projectTokens(hostile);
  assert.deepEqual(bad, { status: "refused", reason: "source contains an unsafe label" });
  const vendor = JSON.parse('{"schemaVersion":3,"updatedAt":null,"flows":{"since":null,"pitches":{"alpha":{"phases":{"build":{"scopes":{"S1":{"constructor":{}}}}}}}}}') as unknown;
  assert.equal(projectTokens(vendor).status, "refused");
  assert.equal(projectTokens({ ...snapshot([]), schemaVersion: 2 }).status, "unsupported");
  assert.equal(projectTokens({ ...snapshot([]), schemaVersion: "3" }).status, "refused");
  assert.equal(projectTokens({ ...snapshot([]), updatedAt: "yesterday" }).status, "refused");
  const flows = snapshot([]).flows as Record<string, unknown>;
  assert.equal(projectTokens({ ...snapshot([]), flows: { ...flows, since: "2026-02-30T00:00:00.000Z" } }).status, "refused");
  for (const row of [{ ...leaf(2, 1, 0), completions: 3 }, { ...leaf(1, 1, 1), tokens: -1 }, { ...leaf(1, 1, 1), tokens: 1.5 }, { ...leaf(1, 0, 0), tokens: 3 }, { ...leaf(1, 1, 1), completions: 2 ** 53 }]) {
    assert.equal(projectTokens(snapshot([["alpha", "build", "S1", "claude", row]])).status, "refused", JSON.stringify(row));
  }
  assert.equal(JSON.stringify(bad).includes("proto"), false);
});

test("projection bounds refuse over-limit sources", () => {
  const pitches = Array.from({ length: 52 }, (_, i): Spec => [`p${i}`, "build", "S1", "claude", leaf(1, 1, 1)]);
  assert.equal(projectTokens(snapshot(pitches.slice(0, 51))).status, "valid");
  assert.equal(projectTokens(snapshot(pitches)).status, "refused");
  const scopes = Array.from({ length: 27 }, (_, i): Spec => ["alpha", "build", `S${i}`, "claude", leaf(1, 1, 1)]);
  assert.equal(projectTokens(snapshot(scopes)).status, "refused");
  const leaves = Array.from({ length: 601 }, (_, i): Spec => [`p${i % 40}`, "build", `S${i % 20}`, `v${i}`, leaf(1, 1, 1)]);
  assert.equal(projectTokens(snapshot(leaves)).status, "refused");
  assert.equal(projectUsage(usageState(Object.fromEntries(Array.from({ length: 53 }, (_, i) => [`p${i}`, { row: time(1) }])))).status, "refused");
});

test("usage that predates schema 2 or carries bad counts is not joinable", () => {
  assert.deepEqual(projectUsage(usageState({ alpha: { row: time(1) } }, s => { s.usage.since = null; })), { status: "unsupported", reason: "usage state predates schema 2 and is not joinable" });
  assert.equal(projectUsage(usageState({ alpha: { row: { ...time(1), activeMs: -1 } } })).status, "refused");
  assert.equal(report(snapshot([["alpha", "build", "S1", "claude", leaf(1, 1, 1)]]), usageState({}, s => { s.usage.since = null; })).sources.usage.status, "unsupported");
});

test("output keeps 100 leaf rows in stable lexical order with separate full and displayed totals", () => {
  const spec = Array.from({ length: 130 }, (_, i): Spec => [`pitch-${String(i % 13).padStart(2, "0")}`, "build", `S${i % 10}`, `vendor${Math.floor(i / 130)}`, leaf(1, 1, 1)]);
  const unique = [...new Map(spec.map(s => [`${s[0]}/${s[2]}`, s])).values()];
  const out = report(snapshot(unique), null);
  assert.equal(unique.length, 130);
  const shown = out.pitches.flatMap(p => p.children.flatMap(ph => ph.children.map(sc => `${p.label}/${sc.label}`)));
  assert.equal(shown.length, FLOW_LIMITS.rows);
  assert.deepEqual(shown, [...shown].sort());
  assert.deepEqual(out.omitted, { leafRows: 30, pitches: 3 }); // pitch-10..12 sort after the 100th row
  assert.deepEqual([out.totals.displayed.leafRows, out.totals.displayed.tokens?.[0].completions, out.totals.tokens?.[0].completions], [100, 100, 130]);
  assert.deepEqual(out.pitches.map(p => p.label), unique.map(u => u[0]).filter((v, i, a) => a.indexOf(v) === i).sort().slice(0, 10));
  assert.deepEqual(report(snapshot(unique), null).pitches.map(p => p.label), out.pitches.map(p => p.label));
});

test("history joins by exact slug and a truncated snapshot never reads as shipped or zero", () => {
  const item = (slug: string, shipped: string | null) => ({ value: { slug, phase: "shipped", appetite: null, shipped, audit: { value: { cycles: 2, mustFix: 1 }, availability: "observed" } }, status: "observed", evidence: [] });
  const history = (items: unknown[], truncatedItems: number, generatedAt = "2026-10-20T12:00:00.000Z") => ({ schemaVersion: 1, generatedAt, history: { items, limits: { value: { truncatedItems, maxItems: 100 }, status: "stale", evidence: [] } } });
  const spec = snapshot([["alpha", "build", "S1", "claude", leaf(1, 1, 1)], ["beta", "build", "S1", "claude", leaf(1, 1, 1)], ["(other)", "build", "S1", "claude", leaf(1, 1, 1)]]);
  const out = report(spec, null, history([item("alpha", "2026-10-01")], 4));
  assert.deepEqual(find(out.pitches, "alpha").history, { availability: "observed", reason: null, phase: "shipped", shipped: "2026-10-01", audit: { availability: "observed", cycles: 2, mustFix: 1 }, revisions: { availability: "unavailable", value: null } });
  const beta = find(out.pitches, "beta").history!;
  assert.deepEqual([beta.availability, beta.shipped, beta.audit.cycles, beta.reason], ["unavailable", null, null, "pitch is not listed; the snapshot may be truncated"]);
  assert.equal(find(out.pitches, "(other)").history, null);
  assert.equal(find(out.pitches, "alpha").history?.shipped, "2026-10-01");
  assert.equal(out.sources.history.details.ageMs, 86_400_000);
  assert.equal(find(report(spec, null, history([item("alpha", null)], 0)).pitches, "alpha").history?.availability, "partial");
  assert.equal(find(report(spec, null, history([], 0)).pitches, "beta").history?.reason, "pitch is not listed in the snapshot");
  assert.equal(report(spec, null, history([item("alpha", null)], 0, "2026-10-01T00:00:00.000Z")).sources.history.status, "stale");
  assert.equal(projectHistory({ schemaVersion: 1, generatedAt: AT, history: { items: { value: null, status: "unavailable" } } }).status, "unsupported");
  assert.equal(projectHistory({ schemaVersion: 2, generatedAt: AT }).status, "unsupported");
  assert.equal(projectHistory(history([{ value: { slug: "../x" } }], 0)).status, "refused");
  assert.equal(projectHistory(history([], 0, "soon")).status, "refused");
});

test("source freshness, unequal windows and unavailable derived metrics are explicit", () => {
  const old = snapshot([["alpha", "build", "S1", "claude", leaf(1, 1, 1)]], { updatedAt: "2026-10-13T11:59:59.999Z" });
  const out = report(old, usageState({ alpha: { row: time(1) } }));
  assert.deepEqual([out.sources.tokens.status, out.sources.tokens.reason, out.sources.usage.status], ["stale", "source is more than seven days old", "observed"]);
  assert.equal(out.windows.aligned, false);
  assert.ok(out.windows.tokensSince && out.windows.usageSince);
  assert.deepEqual(out.unavailableMetrics.map(m => m.metric), ["effort", "cacheHitRatio", "outputInputRatio", "timeEfficiency"]);
  assert.ok(out.notes.some(n => /lower bound of elapsed time between turns/.test(n)));
  assert.equal(JSON.stringify(out).includes("efficiency\":"), false);
  assert.deepEqual(report(null, null).pitches, []);
  assert.equal(report(null, null).sources.tokens.status, "missing");
  assert.throws(() => joinFlowReport({ tokens: missing, usage: missing, history: missing }, "now"), /invalid report timestamp/);
});

test("credential-shaped labels never reach the report", () => {
  const out = report(snapshot([["alpha", "build", "S1", "token:abcdef0123", leaf(1, 1, 1)], ["alpha", "build", "S1", "ghp_abcdefghijklmnopqrstuv", leaf(1, 1, 1)], ["alpha", "build", "S1", "claude", leaf(1, 1, 1)]]), null);
  const text = JSON.stringify(out);
  assert.equal(text.includes("abcdef0123") || text.includes("ghp_"), false);
  assert.equal(find(find(find(out.pitches, "alpha").children, "build").children, "S1").tokens?.filter(c => c.vendor === "(redacted)").length, 2);
});

test("history respects field availability, retains revisions and scrubs every copied label", () => {
  const spec = snapshot([["alpha", "build", "S1", "claude", leaf(1, 1, 1)]]);
  const secret = `sk-test-${"A".repeat(24)}`;
  const history = (status: unknown, availability: unknown = "unavailable") => ({ schemaVersion: 1, generatedAt: AT, history: {
    items: [{ status, evidence: [], value: { slug: "alpha", phase: secret, shipped: "2026-10-01", audit: { availability, value: { cycles: 99, mustFix: 98 } }, revisions: { availability: "observed", value: 0 } } }],
  } });
  const unavailable = find(report(spec, null, history("unavailable")).pitches, "alpha").history!;
  assert.deepEqual([unavailable.availability, unavailable.phase, unavailable.shipped, unavailable.audit.cycles, unavailable.revisions.value], ["unavailable", null, null, null, null]);
  const observed = report(spec, null, history("observed")), item = find(observed.pitches, "alpha").history!;
  assert.equal(JSON.stringify(observed).includes(secret), false);
  assert.equal(item.phase, "(redacted)");
  assert.deepEqual(item.audit, { availability: "unavailable", cycles: null, mustFix: null });
  assert.deepEqual(item.revisions, { availability: "observed", value: 0 });
  assert.equal(find(report(spec, null, history("stale")).pitches, "alpha").history?.availability, "stale");
  const partial = find(report(spec, null, history("observed", "partial")).pitches, "alpha").history!;
  assert.deepEqual(partial.audit, { availability: "partial", cycles: 99, mustFix: 98 });
  assert.equal(projectHistory(history({ toString: 7 })).status, "refused");
  assert.equal(find(report(spec, null, history("observed", { toString: 7 })).pitches, "alpha").history?.audit.availability, "unavailable");
});

test("reports unjoinable and one-sided leaf counts separately from lifecycle coverage gaps", () => {
  const state = usageState({ alpha: { row: time(1), phases: { build: { row: time(1), scopes: { S1: time(1), S3: time(1) } } } } });
  state.health.unmatchedFinishes = 2; state.health.pendingEvictions = 3;
  const out = report(snapshot([["alpha", "build", "S1", "claude", leaf(1, 1, 1)], ["alpha", "build", "S2", "claude", leaf(1, 1, 1)], ["(other)", "build", "S1", "claude", leaf(1, 1, 1)]]), state);
  assert.deepEqual([out.sources.tokens.details.unjoinableLeafRows, out.sources.tokens.details.oneSidedLeafRows, out.sources.usage.details.unjoinableLeafRows, out.sources.usage.details.oneSidedLeafRows], [1, 1, 0, 1]);
  assert.deepEqual([out.sources.usage.details.unmatchedFinishes, out.sources.usage.details.pendingEvictions], [2, 3]);
});
