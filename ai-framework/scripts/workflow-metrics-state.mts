import type { RuntimeDeps } from "./runtime/types.mts";
import { withLease } from "../hooks/scripts/metrics-lock.mts";

export const STATE_FILE = "workflow-usage.json";
export const SCHEMA_VERSION = 2;
export const DROP_MARKER_FILE = "workflow-usage.dropped";
export const LIMITS = { inputBytes: 16 * 1024, stateBytes: 4 * 1024 * 1024, recent: 512, days: 30, pitches: 50, vendors: 8, names: 32, pending: 64, openIntervals: 256, sessions: 32, phasesPerPitch: 16, scopesPerPhase: 25, leaves: 600, trace: 32, dropMarkerBytes: 4096, pendingTtlMs: 6 * 3_600_000, waitCapMs: 8 * 3_600_000 } as const;
export const KINDS = ["session.started", "agent.started", "agent.finished", "phase.started", "phase.paused", "phase.resumed", "phase.finished", "skill.used", "gate.decided", "pitch.started", "pitch.finished", "audit.finished"] as const;
const OUTCOMES = ["completed", "failed", "cancelled"] as const;
const DECISIONS = ["approve", "revise", "back", "stop"] as const;
const SOURCES = ["manual", "workflow", "native"] as const;
const DIMENSIONS = ["models", "roles", "skills", "phases"] as const;
const LABELS = ["pitch", "phase", "skill", "provider", "model", "role", "workflowVersion"] as const;
const HEALTH = ["missingVendor", "missingModel", "missingRole", "missingPhase", "missingSkill", "missingPitch", "unmatchedFinishes", "unmatchedTransitions", "pendingEvictions", "lateEvents", "overflowEvents"] as const;
const ROW = ["activeMs", "waitMs", "turnsStarted", "turnsFinished", "gapsMeasured", "gapsUnmeasured", "gapsOverCap"] as const;
const USAGE_HEALTH = ["captureDropped", "pitchFolds", "clippedIntervals", "mixedClockIntervals", "supersededTurns", "sessionEvictions"] as const;
const UNKNOWN = "(unknown)", OTHER = "(other)", NONE = "(none)", UNATTRIBUTED = "(unattributed)";
const SCOPE = /^S\d{1,3}$/;
const TRANSITIONS = ["repeat", "forward", "back", "other"] as const;
const RANK: Record<string, number> = { shape: 0, "shape-lite": 0, critique: 1, plan: 2, build: 3, audit: 4, ship: 5 };
const EPOCH = "1970-01-01T00:00:00.000Z";
const SAFE = /^[\w.:/@+-]{1,80}$/;
const HASH = /^[a-f0-9]{64}$/;
const RESERVED = new Set(["__proto__", "constructor", "prototype"]);
type Kind = typeof KINDS[number];
type Outcome = typeof OUTCOMES[number];
type Source = typeof SOURCES[number];
type Map<T> = Record<string, T>;
export interface UsageEvent {
  eventId: string; kind: Kind; vendor: string; source: Source; occurredAt: string; timeProvided: boolean;
  sessionId: string | null; activityId: string | null; pitch: string; phase: string; scope: string; skill: string;
  provider: string; model: string; role: string; workflowVersion: string;
  agentKind: "primary" | "subagent" | "unknown"; outcome: Outcome | null;
  decision: typeof DECISIONS[number] | null; mustFixCount: number | null;
}
export interface Summary {
  events: Record<Kind, number>; outcomes: Record<Outcome, number>; gates: Record<typeof DECISIONS[number], number>;
  primaryFinishes: number; subagentFinishes: number; unknownFinishes: number;
  mustFixCount: number; elapsedMs: number; matchedFinishes: number;
  /** Undefined predates this counter; null means earlier pitch outcomes cannot be reconstructed. */
  ships?: number | null;
}
/** Interval totals; S3-S6 fill the skeleton below, and the shapes of `open` and `sessions` entries are fixed there. */
export type UsageRow = Record<typeof ROW[number], number>;
export interface TraceEntry { at: string; phase: string; scope: string; class: "start" | typeof TRANSITIONS[number] }
/** One pitch: its recency for the LRU fold, its three levels of rows, and bounded phase-order evidence. */
export interface UsageNode {
  lastAt: string; row: UsageRow; phases: Map<{ row: UsageRow; scopes: Map<UsageRow> }>;
  transitions: Record<typeof TRANSITIONS[number], number>; trace: TraceEntry[]; lastPhase: string | null;
}
/** A closed interval waiting for the fold point, in epoch ms. */
export interface UsageRecord { s: number; e: number; kind: "active" | "wait"; pitch: string; phase: string; scope: string }
/** One primary session: the labels of its open turn or of the turn whose Stop opened the current gap. */
export interface UsageSession { lastAt: string; lastStopAt: number | null; clock: "event" | "collector"; open: boolean; pitch: string; phase: string; scope: string }
export interface Usage {
  since: string | null; health: Record<typeof USAGE_HEALTH[number], number>;
  total: UsageRow; pitches: Map<UsageNode>; open: UsageRecord[]; frontier: number | null; sessions: Map<UsageSession>;
}
/** Legacy (v1-era) entries hold only the first three fields and never match; v2 entries keep the labels of the start. */
export interface PendingEntry {
  startedAt: string; lastAt: string; status: "running" | "paused";
  kind?: "agent" | "phase"; agentKind?: UsageEvent["agentKind"]; clock?: "event" | "collector"; pitch?: string; phase?: string; scope?: string;
}
export interface UsageState {
  schemaVersion: typeof SCHEMA_VERSION; createdAt: string; updatedAt: string;
  project: { id: string; label: string; workflowVersion: { value: string | null; status: "observed" | "stale" | "unavailable"; evidence: string | null } };
  totals: Summary; vendors: Map<Summary>; pitches: Map<Summary>; days: Map<Summary>;
  dimensions: Record<typeof DIMENSIONS[number], Map<Map<Summary>>>;
  health: Record<typeof HEALTH[number], number>;
  sources: Record<Source, { events: number; lastEventAt: string | null }>;
  recent: { key: string; fingerprint: string }[];
  pending: Map<PendingEntry>;
  usage: Usage;
}
export type ReadResult = { status: "valid"; state: UsageState } | { status: "missing" } | { status: "refused"; reason: string };
export type RecordResult = { written: boolean; reason?: string; state?: UsageState };
const map = <T>(): Map<T> => Object.create(null) as Map<T>;
const counts = <T extends string>(keys: readonly T[]): Record<T, number> => Object.fromEntries(keys.map(key => [key, 0])) as Record<T, number>;
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const count = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const keysAre = (v: Record<string, unknown>, keys: readonly string[]): boolean => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const date = (v: unknown): v is string => typeof v === "string" && v.length === 24 && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const name = (v: unknown): string => v === undefined || v === null || v === "" ? UNKNOWN : typeof v === "string" && v.length <= 80 && SAFE.test(v) && !RESERVED.has(v) ? v : OTHER;
const storedName = (v: string): boolean => v === UNKNOWN || v === OTHER || v.length <= 80 && SAFE.test(v) && !RESERVED.has(v);
const storedPitch = (v: string): boolean => v === UNATTRIBUTED || storedName(v);
function storedModelName(value: string): boolean {
  if (storedName(value)) return true;
  if (value.length > 80 || !value.includes("%")) return false;
  try { return value.split("/").every(part => {
    const decoded = decodeURIComponent(part);
    return decoded !== UNKNOWN && decoded !== OTHER && storedName(decoded) && encodeURIComponent(decoded) === part;
  }); } catch { return false; }
}
const id = (v: unknown): string | null => typeof v === "string" && v.length > 0 && v.length <= 128 ? v : null;
const now = (deps: RuntimeDeps): string => new Date(deps.clock.now()).toISOString();
export function errorCode(error: unknown): string {
  const code = object(error) ? error.code : undefined;
  return typeof code === "string" && code.length <= 32 && /^[A-Z0-9_]{1,32}$/.test(code) ? code : "ERROR";
}

/** Explicit field selection discards resource fields, prompts and arbitrary hook data. */
export function normalizeEvent(input: unknown, deps: RuntimeDeps): UsageEvent {
  if (!object(input)) throw new Error("invalid event");
  const eventId = id(input.eventId), sessionId = id(input.sessionId), activityId = id(input.activityId);
  if (!eventId || !KINDS.includes(input.kind as Kind) || !SOURCES.includes(input.source as Source) || typeof input.vendor !== "string" || !input.vendor) throw new Error("invalid event");
  const kind = input.kind as Kind;
  const occurredAt = input.occurredAt === undefined ? now(deps) : input.occurredAt;
  if (!date(occurredAt) || Date.parse(occurredAt) > deps.clock.now() + 300_000) throw new Error("invalid event timestamp");
  if (kind === "session.started" && !sessionId || /^(agent|phase)\./.test(kind) && !activityId) throw new Error("missing lifecycle identifier");
  const outcome = OUTCOMES.includes(input.outcome as Outcome) ? input.outcome as Outcome : null;
  const decision = DECISIONS.includes(input.decision as typeof DECISIONS[number]) ? input.decision as typeof DECISIONS[number] : null;
  if (kind.endsWith(".finished") && !outcome || kind === "gate.decided" && !decision) throw new Error("missing outcome or decision");
  if (input.mustFixCount !== undefined && (!count(input.mustFixCount) || input.mustFixCount > 1_000_000 || kind !== "audit.finished")) throw new Error("invalid audit count");
  const labels = Object.fromEntries(LABELS.map(k => [k, name(input[k])])) as Pick<UsageEvent, typeof LABELS[number]>;
  if (input.pitch === UNATTRIBUTED) labels.pitch = UNATTRIBUTED;
  const scope = input.scope === undefined || input.scope === null || input.scope === "" || input.scope === NONE ? NONE : typeof input.scope === "string" && SCOPE.test(input.scope) ? input.scope : OTHER;
  return { eventId, kind, vendor: name(input.vendor), source: input.source as Source, occurredAt, timeProvided: input.occurredAt !== undefined, sessionId, activityId, ...labels, scope,
    agentKind: input.agentKind === "primary" || input.agentKind === "subagent" ? input.agentKind : "unknown",
    outcome, decision, mustFixCount: input.mustFixCount === undefined ? null : input.mustFixCount as number };
}

export function blankSummary(): Summary {
  return { events: counts(KINDS), outcomes: counts(OUTCOMES), gates: counts(DECISIONS), primaryFinishes: 0, subagentFinishes: 0, unknownFinishes: 0, mustFixCount: 0, elapsedMs: 0, matchedFinishes: 0, ships: 0 };
}
export const blankRow = (): UsageRow => counts(ROW);
export function blankUsage(since: string | null = null): Usage {
  return { since, health: counts(USAGE_HEALTH), total: blankRow(), pitches: map(), open: [], frontier: null, sessions: map() };
}
export function blankState(deps: RuntimeDeps, label: string = UNKNOWN): UsageState {
  const at = now(deps);
  return { schemaVersion: SCHEMA_VERSION, createdAt: at, updatedAt: at,
    project: { id: deps.crypto.randomUUID(), label: name(label), workflowVersion: { value: null, status: "unavailable", evidence: null } },
    totals: blankSummary(), vendors: map(), pitches: map(), days: map(), dimensions: { models: map(), roles: map(), skills: map(), phases: map() },
    health: counts(HEALTH), sources: { manual: { events: 0, lastEventAt: null }, workflow: { events: 0, lastEventAt: null }, native: { events: 0, lastEventAt: null } }, recent: [], pending: map(), usage: blankUsage(at) };
}
function add<K extends string>(target: Record<K, number>, key: K, amount = 1): void {
  const total = target[key] + amount;
  if (!count(total)) throw new Error("metric counter overflow");
  target[key] = total;
}
function bucket<T>(rows: Map<T>, value: string, limit: number, make: () => T): [string, T] {
  const key = Object.hasOwn(rows, value) || value === UNKNOWN || value === OTHER || Object.keys(rows).filter(k => k !== UNKNOWN && k !== OTHER).length < limit ? value : OTHER;
  if (!Object.hasOwn(rows, key)) rows[key] = make();
  return [key, rows[key]];
}
/** Labels are deliberately not part of the identity: a finish must find its start after a label change. */
function activityKey(event: UsageEvent, deps: RuntimeDeps): string {
  return deps.crypto.sha256Hex(JSON.stringify(["v2", event.kind.split(".")[0], event.vendor, event.sessionId, event.activityId]));
}
/** Oldest start first; ties keep insertion order because only a strictly older entry replaces the candidate. */
function oldestPending(pending: Map<PendingEntry>): string | undefined {
  let oldest: string | undefined;
  for (const key of Object.keys(pending)) if (oldest === undefined || pending[key].startedAt < pending[oldest].startedAt) oldest = key;
  return oldest;
}
function updateSummary(summary: Summary, event: UsageEvent, elapsed: number | null): void {
  if (summary.ships === undefined) summary.ships = summary.events["pitch.finished"] === 0 ? 0 : null;
  if (event.kind === "pitch.finished" && event.outcome === "completed" && summary.ships !== null) {
    const total = summary.ships + 1;
    if (!count(total)) throw new Error("metric counter overflow");
    summary.ships = total;
  }
  add(summary.events, event.kind);
  if (event.kind.endsWith(".finished") && event.outcome) add(summary.outcomes, event.outcome);
  if (event.kind === "gate.decided" && event.decision) add(summary.gates, event.decision);
  if (event.kind === "agent.finished") add(summary as unknown as Record<string, number>, `${event.agentKind}Finishes`);
  if (event.mustFixCount !== null) add(summary as unknown as Record<string, number>, "mustFixCount", event.mustFixCount);
  if (elapsed !== null) { add(summary as unknown as Record<string, number>, "elapsedMs", elapsed); add(summary as unknown as Record<string, number>, "matchedFinishes"); }
}

// ---- Interval engine: active and wait time, folded exactly once nothing can overlap them any more ----
type Interval = [number, number];
const merged = (list: Interval[]): Interval[] => {
  const out: Interval[] = [];
  for (const [a, b] of [...list].sort((x, y) => x[0] - y[0] || x[1] - y[1])) { const last = out[out.length - 1]; if (last && a <= last[1]) last[1] = Math.max(last[1], b); else out.push([a, b]); }
  return out;
};
const measured = (list: Interval[]): number => list.reduce((n, [a, b]) => n + b - a, 0);
/** `from` minus `taken`, both already merged. */
function without(from: Interval[], taken: Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const [a, b] of from) {
    let at = a;
    for (const [c, d] of taken) { if (d <= at || c >= b) continue; if (c > at) out.push([at, c]); at = Math.max(at, d); if (at >= b) break; }
    if (at < b) out.push([at, b]);
  }
  return out;
}
const blankPhaseNode = () => ({ row: blankRow(), scopes: map<UsageRow>() });
const blankNode = (lastAt: string = EPOCH): UsageNode => ({ lastAt, row: blankRow(), phases: map<UsageNode["phases"][string]>(), transitions: counts(TRANSITIONS), trace: [], lastPhase: null });
const leafCount = (usage: Usage): number => Object.values(usage.pitches).reduce((n, node) => n + Object.values(node.phases).reduce((m, phase) => m + Object.keys(phase.scopes).filter(k => k !== OTHER).length, 0), 0);
/** Scope rows are capped per phase and in total; the overflow row keeps the sums whole. */
function scopeRow(usage: Usage, phase: UsageNode["phases"][string], scope: string): [string, UsageRow] {
  const full = !Object.hasOwn(phase.scopes, scope) && scope !== OTHER && leafCount(usage) >= LIMITS.leaves;
  return bucket(phase.scopes, full ? OTHER : scope, LIMITS.scopesPerPhase, blankRow);
}
/** Rows for the total, pitch, pitch and phase, and pitch, phase and scope levels. A pitch without a node of its own shares the overflow node. */
function levels(usage: Usage, pitch: string, phase: string, scope: string): { keys: string[]; rows: UsageRow[] } {
  const key = Object.hasOwn(usage.pitches, pitch) ? pitch : OTHER;
  const node = usage.pitches[key] ??= blankNode();
  const ph = bucket(node.phases, phase, LIMITS.phasesPerPitch, blankPhaseNode);
  const sc = scopeRow(usage, ph[1], scope);
  return { keys: [key, ph[0], sc[0]], rows: [usage.total, node.row, ph[1].row, sc[1]] };
}
function addRow(target: UsageRow, source: UsageRow): void { for (const field of ROW) add(target, field, source[field]); }
function addSummary(target: Summary, source: Summary): void {
  for (const kind of KINDS) add(target.events, kind, source.events[kind]);
  for (const outcome of OUTCOMES) add(target.outcomes, outcome, source.outcomes[outcome]);
  for (const decision of DECISIONS) add(target.gates, decision, source.gates[decision]);
  for (const field of ["primaryFinishes", "subagentFinishes", "unknownFinishes", "mustFixCount", "elapsedMs", "matchedFinishes"] as const) add(target, field, source[field]);
  const ships = (x: Summary): number | null => x.ships === undefined ? (x.events["pitch.finished"] === 0 ? 0 : null) : x.ships;
  const a = ships(target), b = ships(source);
  target.ships = a === null || b === null ? null : a + b;
}
/** Everything the pitch holds moves into the overflow pitch, in both stores, so no counter is lost. */
function foldPitch(state: UsageState, victim: string): void {
  const usage = state.usage, other = state.pitches[OTHER] ??= blankSummary();
  addSummary(other, state.pitches[victim]); delete state.pitches[victim];
  const node = usage.pitches[victim];
  if (!node) return;
  delete usage.pitches[victim];
  const target = usage.pitches[OTHER] ??= blankNode(node.lastAt);
  addRow(target.row, node.row);
  for (const kind of TRANSITIONS) add(target.transitions, kind, node.transitions[kind]);
  for (const [name, phase] of Object.entries(node.phases)) {
    const into = bucket(target.phases, name, LIMITS.phasesPerPitch, blankPhaseNode)[1];
    addRow(into.row, phase.row);
    for (const [scope, row] of Object.entries(phase.scopes)) addRow(scopeRow(usage, into, scope)[1], row);
  }
}
/** Returns the pitch row key for an event, folding the least recently used unreferenced pitch when the cap is full. */
function resolvePitch(state: UsageState, pitch: string, deps: RuntimeDeps): string {
  const rows = state.pitches, usage = state.usage;
  let key = pitch;
  if (!Object.hasOwn(rows, pitch) && pitch !== UNKNOWN && pitch !== OTHER && Object.keys(rows).filter(k => k !== UNKNOWN && k !== OTHER).length >= LIMITS.pitches) {
    // A pitch that a pending activity, an open record or a session still routes to must keep its own row.
    const held = new Set<string>([...Object.values(state.pending).flatMap(e => e.pitch === undefined ? [] : [e.pitch]), ...usage.open.map(r => r.pitch), ...Object.values(usage.sessions).map(x => x.pitch)]);
    let victim: string | undefined, victimAt = "";
    for (const name of Object.keys(rows)) {
      if (name === UNKNOWN || name === OTHER || held.has(name)) continue;
      const lastAt = usage.pitches[name]?.lastAt ?? "";
      if (victim === undefined || lastAt < victimAt) { victim = name; victimAt = lastAt; }
    }
    if (victim === undefined) key = OTHER;
    else { foldPitch(state, victim); add(usage.health, "pitchFolds"); }
  }
  rows[key] ??= blankSummary();
  (usage.pitches[key] ??= blankNode()).lastAt = now(deps);
  return key;
}
/** Classifies a phase start against the pitch's previous one by pipeline rank; nothing here is a gate decision. */
function recordPhaseStart(node: UsageNode, event: UsageEvent): void {
  const previous = node.lastPhase, a = previous === null ? undefined : RANK[previous], b = RANK[event.phase];
  const kind = previous === null ? "start" as const : previous === event.phase || a !== undefined && a === b ? "repeat" as const :
    a === undefined || b === undefined || !Object.hasOwn(RANK, previous) || !Object.hasOwn(RANK, event.phase) ? "other" as const : b > a ? "forward" as const : "back" as const;
  if (kind !== "start") add(node.transitions, kind);
  node.trace.push({ at: event.occurredAt, phase: event.phase, scope: event.scope, class: kind });
  if (node.trace.length > LIMITS.trace) node.trace.shift();
  node.lastPhase = event.phase;
}
function credit(usage: Usage, labels: { pitch: string; phase: string; scope: string }, field: Exclude<typeof ROW[number], "activeMs" | "waitMs">): void {
  for (const row of levels(usage, labels.pitch, labels.phase, labels.scope).rows) add(row, field);
}
/** Sweeps [frontier, point] per level key; what is folded can no longer be overlapped by a later record. */
function fold(usage: Usage, point: number): void {
  const records = usage.open;
  if (records.length === 0) return;
  const low = usage.frontier ?? Math.min(...records.map(r => r.s));
  if (point <= low) return;
  const groups = new Map<string, { row: UsageRow; active: Interval[]; wait: Interval[] }>();
  for (const r of records) {
    const a = Math.max(r.s, low), b = Math.min(r.e, point);
    const { keys, rows } = levels(usage, r.pitch, r.phase, r.scope);
    for (let level = 0; level < 4; level++) {
      const id = JSON.stringify(keys.slice(0, level));
      const group = groups.get(id) ?? { row: rows[level], active: [], wait: [] };
      if (b > a) group[r.kind].push([a, b]);
      groups.set(id, group);
    }
  }
  for (const { row, active, wait } of groups.values()) {
    const union = merged(active);
    add(row, "activeMs", measured(union)); add(row, "waitMs", measured(without(merged(wait), union)));
  }
  usage.open = records.filter(r => r.e > point).map(r => ({ ...r, s: Math.max(r.s, point) }));
  usage.frontier = point;
}
/** A record that starts or ends before the frontier is clipped (and counted): the totals stay lower bounds. */
function addRecord(usage: Usage, record: UsageRecord): void {
  if (usage.frontier !== null) {
    if (record.e <= usage.frontier) { add(usage.health, "clippedIntervals"); return; }
    if (record.s < usage.frontier) { record.s = usage.frontier; add(usage.health, "clippedIntervals"); }
  }
  if (record.e > record.s) usage.open.push(record);
}
const ownClock = (event: UsageEvent): "event" | "collector" => event.timeProvided ? "event" : "collector";
function gapLabels(session: UsageSession): { pitch: string; phase: string; scope: string } { return session; }
/** A primary prompt: counts the turn, closes or abandons the previous gap, and (re)opens the session. */
function trackTurnStart(state: UsageState, event: UsageEvent, deps: RuntimeDeps): void {
  const usage = state.usage, at = Date.parse(event.occurredAt), clock = ownClock(event);
  credit(usage, event, "turnsStarted");
  if (event.sessionId === null) return;
  const key = deps.crypto.sha256Hex(JSON.stringify(["session", event.vendor, event.sessionId])), previous = usage.sessions[key];
  if (previous?.open) credit(usage, gapLabels(previous), "gapsUnmeasured");
  else if (previous && previous.lastStopAt !== null) {
    if (previous.clock === clock && at >= previous.lastStopAt) {
      credit(usage, gapLabels(previous), "gapsMeasured");
      if (at - previous.lastStopAt > LIMITS.waitCapMs) credit(usage, gapLabels(previous), "gapsOverCap");
      addRecord(usage, { s: previous.lastStopAt, e: Math.min(at, previous.lastStopAt + LIMITS.waitCapMs), kind: "wait", pitch: previous.pitch, phase: previous.phase, scope: previous.scope });
    } else credit(usage, gapLabels(previous), "gapsUnmeasured");
  }
  if (!previous && Object.keys(usage.sessions).length >= LIMITS.sessions) {
    const oldest = Object.keys(usage.sessions).reduce((a, b) => usage.sessions[b].lastAt < usage.sessions[a].lastAt ? b : a);
    if (usage.sessions[oldest].lastStopAt !== null) credit(usage, gapLabels(usage.sessions[oldest]), "gapsUnmeasured");
    delete usage.sessions[oldest]; add(usage.health, "sessionEvictions");
  }
  usage.sessions[key] = { lastAt: event.occurredAt, lastStopAt: null, clock, open: true, pitch: event.pitch, phase: event.phase, scope: event.scope };
}
/** A matched agent finish adds an active record (same clock only) and, for a completed primary turn, opens a gap. */
function trackAgentFinish(state: UsageState, event: UsageEvent, start: PendingEntry, deps: RuntimeDeps): void {
  const usage = state.usage, clock = ownClock(event), end = Date.parse(event.occurredAt);
  const labels = { pitch: start.pitch as string, phase: start.phase as string, scope: start.scope as string };
  if (start.clock === clock) addRecord(usage, { s: Date.parse(start.startedAt), e: end, kind: "active", ...labels });
  else add(usage.health, "mixedClockIntervals");
  if (start.agentKind !== "primary") return;
  credit(usage, labels, "turnsFinished");
  if (event.sessionId === null) return;
  const session = usage.sessions[deps.crypto.sha256Hex(JSON.stringify(["session", event.vendor, event.sessionId]))];
  if (!session?.open) return;
  session.open = false; session.lastStopAt = event.outcome === "completed" ? end : null; session.clock = clock;
  if (event.occurredAt > session.lastAt) session.lastAt = event.occurredAt;
}
/** Runs on every accepted event: caps stale gaps, then folds as far as nothing pending can still overlap. */
function settleUsage(state: UsageState, deps: RuntimeDeps): void {
  const usage = state.usage, nowMs = deps.clock.now();
  for (const session of Object.values(usage.sessions)) {
    if (session.lastStopAt === null || nowMs - session.lastStopAt <= LIMITS.waitCapMs) continue;
    credit(usage, gapLabels(session), "gapsMeasured"); credit(usage, gapLabels(session), "gapsOverCap");
    addRecord(usage, { s: session.lastStopAt, e: session.lastStopAt + LIMITS.waitCapMs, kind: "wait", pitch: session.pitch, phase: session.phase, scope: session.scope });
    session.lastStopAt = null;
  }
  const holds = [nowMs, ...Object.values(state.pending).filter(e => e.kind === "agent").map(e => Date.parse(e.startedAt)), ...Object.values(usage.sessions).flatMap(x => x.lastStopAt === null ? [] : [x.lastStopAt])];
  fold(usage, Math.min(...holds));
  // Over the record cap the fold point is forced forward: exactness gives way to a counted lower bound.
  while (usage.open.length > LIMITS.openIntervals) {
    const before = usage.open.length;
    fold(usage, Math.min(...usage.open.map(r => r.e)));
    // A state that broke its own invariant (a hand-edited frontier past every open end) cannot fold; cut it back instead of spinning under the lease.
    if (usage.open.length >= before) { add(usage.health, "clippedIntervals", before - LIMITS.openIntervals); usage.open = usage.open.slice(before - LIMITS.openIntervals); break; }
  }
}

/** Only native capture uses the canonical segment identity; manual activity IDs keep their lifecycle semantics. */
function nativeSegmentKey(event: UsageEvent, deps: RuntimeDeps): string | null {
  return event.source === "native" && event.sessionId !== null ?
    activityKey({ ...event, kind: "phase.started", activityId: `segment:${event.sessionId}` }, deps) : null;
}
function inheritSegment(state: UsageState, event: UsageEvent, deps: RuntimeDeps): UsageEvent {
  if (event.kind !== "agent.started" || event.pitch !== UNKNOWN || event.phase !== UNKNOWN || event.scope !== NONE) return event;
  const key = nativeSegmentKey(event, deps), segment = key === null ? undefined : state.pending[key];
  if (!segment || segment.kind !== "phase" || segment.lastAt > event.occurredAt || segment.pitch === undefined || segment.phase === undefined || segment.scope === undefined) return event;
  return { ...event, pitch: segment.pitch, phase: segment.phase, scope: segment.scope };
}
/** Closing an old segment is part of the same apply and outer lease; it never synthesizes an agent completion. */
function replaceSegment(state: UsageState, event: UsageEvent, deps: RuntimeDeps): RecordResult | null {
  if (event.kind !== "phase.started" || event.activityId !== `segment:${event.sessionId}` ||
    [event.vendor, event.pitch, event.phase, event.scope].includes(OTHER)) return null;
  const key = nativeSegmentKey(event, deps), segment = key === null ? undefined : state.pending[key];
  if (!segment) return null;
  if (event.occurredAt < segment.lastAt) return { written: false, reason: "phase start precedes open segment" };
  const result = applyEvent(state, { ...event, kind: "phase.finished", outcome: "completed",
    eventId: deps.crypto.sha256Hex(JSON.stringify(["segment-close", event.eventId])) }, deps);
  return result.written ? null : result;
}

/** Mutates only a validated working copy; a rejected update never commits partial aggregates. */
export function applyEvent(state: UsageState, incoming: UsageEvent, deps: RuntimeDeps): RecordResult {
  let event = incoming;
  const key = deps.crypto.sha256Hex(JSON.stringify([event.vendor, event.source, event.eventId]));
  // Missing caller time must not turn an identical replay into a timestamp conflict; an absent scope keeps pre-scope fingerprints valid.
  const fingerprint = deps.crypto.sha256Hex(JSON.stringify({ ...event, scope: event.scope === NONE ? undefined : event.scope, occurredAt: event.timeProvided ? event.occurredAt : undefined, eventId: undefined }));
  const recent = state.recent.find(r => r.key === key);
  if (recent) return { written: false, reason: recent.fingerprint === fingerprint ? "duplicate event" : "conflicting event identifier" };
  const replacement = replaceSegment(state, event, deps);
  if (replacement) return replacement;
  let elapsed: number | null = null, started: PendingEntry | undefined, closed: PendingEntry | undefined;
  for (const [activity, entry] of Object.entries(state.pending)) {
    if (entry.kind === "agent" && deps.clock.now() - Date.parse(entry.startedAt) > LIMITS.pendingTtlMs) { delete state.pending[activity]; add(state.health, "pendingEvictions"); }
  }
  // Fingerprints describe caller input, so replay stays stable after the session's phase changes.
  event = inheritSegment(state, event, deps);
  if (/^(agent|phase)\./.test(event.kind)) {
    // Invalid display labels cannot identify a lifecycle: distinct inputs share the other bucket.
    const matchable = ![event.vendor, event.pitch, event.phase, event.scope].includes(OTHER);
    const activity = activityKey(event, deps), pending = matchable ? state.pending[activity] : undefined;
    if (event.kind.endsWith(".started")) {
      // A primary turn that never saw its Stop is replaced; its interval is dropped rather than guessed.
      const supersede = pending !== undefined && event.kind === "agent.started" && event.agentKind === "primary" && pending.agentKind === "primary";
      if (pending && !supersede) return { written: false, reason: "activity already started" };
      if (supersede) { delete state.pending[activity]; add(state.usage.health, "supersededTurns"); }
      if (matchable) {
        const fresh: PendingEntry = { startedAt: event.occurredAt, lastAt: event.occurredAt, status: "running", kind: event.kind.startsWith("agent") ? "agent" : "phase",
          agentKind: event.agentKind, clock: event.timeProvided ? "event" : "collector", pitch: event.pitch, phase: event.phase, scope: event.scope };
        let insert = true;
        if (Object.keys(state.pending).length >= LIMITS.pending) {
          const oldest = oldestPending(state.pending) as string;
          add(state.health, "pendingEvictions");
          // The arriving start competes too, so a reordered burst always keeps the newest starts.
          if (fresh.startedAt < state.pending[oldest].startedAt) insert = false; else delete state.pending[oldest];
        }
        if (insert) { state.pending[activity] = fresh; started = fresh; }
      }
    } else if (event.kind.endsWith(".finished")) {
      if (pending && event.occurredAt >= pending.lastAt) {
        elapsed = Date.parse(event.occurredAt) - Date.parse(pending.startedAt); delete state.pending[activity]; closed = pending;
        // The interval belongs to the labels of its start, whatever the finish reports.
        if (pending.pitch !== undefined && pending.phase !== undefined) event = { ...event, pitch: pending.pitch, phase: pending.phase, scope: pending.scope ?? NONE };
      } else add(state.health, "unmatchedFinishes");
    } else {
      const expected = event.kind === "phase.paused" ? "running" : "paused";
      if (pending && pending.status === expected && event.occurredAt >= pending.lastAt) { pending.status = expected === "running" ? "paused" : "running"; pending.lastAt = event.occurredAt; }
      else add(state.health, "unmatchedTransitions");
    }
  }
  const pitchKey = resolvePitch(state, event.pitch, deps);
  if (event.kind === "phase.started") recordPhaseStart(state.usage.pitches[pitchKey], event);
  if (started?.kind === "agent" && started.agentKind === "primary") trackTurnStart(state, event, deps);
  if (closed?.kind === "agent" && closed.pitch !== undefined) trackAgentFinish(state, event, closed, deps);
  const rows = [state.totals];
  let overflow = event.vendor === OTHER || event.pitch === OTHER || event.scope === OTHER;
  const vendor = bucket(state.vendors, event.vendor, LIMITS.vendors, blankSummary);
  const pitch: [string, Summary] = [pitchKey, state.pitches[pitchKey]];
  rows.push(vendor[1], pitch[1]);
  overflow ||= vendor[0] !== event.vendor || pitch[0] !== event.pitch;
  // Encode component separators so provider a/b + model c cannot merge with provider a + model b/c.
  const model = event.model === UNKNOWN || event.model === OTHER || event.provider === OTHER ? event.model === UNKNOWN ? UNKNOWN : OTHER :
    `${event.provider === UNKNOWN ? "" : encodeURIComponent(event.provider) + "/"}${encodeURIComponent(event.model)}`;
  const dimensionValues = { models: model.length <= 80 ? model : OTHER, roles: event.role, skills: event.skill, phases: event.phase };
  for (const dimension of DIMENSIONS) {
    const applies = dimension === "skills" ? event.kind === "skill.used" : dimension === "phases" ? event.kind.startsWith("phase.") : event.kind.startsWith("agent.");
    if (!applies) continue;
    const byVendor = bucket(state.dimensions[dimension], event.vendor, LIMITS.vendors, () => map<Summary>());
    const row = bucket(byVendor[1], dimensionValues[dimension], LIMITS.names, blankSummary);
    rows.push(row[1]); overflow ||= row[0] === OTHER || row[0] !== dimensionValues[dimension] || byVendor[0] !== event.vendor;
  }
  const cutoff = new Date(deps.clock.now() - (LIMITS.days - 1) * 86_400_000).toISOString().slice(0, 10);
  for (const day of Object.keys(state.days)) if (day < cutoff) delete state.days[day];
  const day = event.occurredAt.slice(0, 10);
  if (day >= cutoff) {
    state.days[day] ??= blankSummary(); rows.push(state.days[day]);
    for (const removed of Object.keys(state.days).sort().slice(0, -LIMITS.days)) delete state.days[removed];
  } else add(state.health, "lateEvents");
  for (const row of rows) updateSummary(row, event, elapsed);
  if (overflow) add(state.health, "overflowEvents");
  const gaps: [typeof HEALTH[number], string, boolean][] = [
    ["missingVendor", event.vendor, true], ["missingPitch", event.pitch, true],
    ["missingModel", dimensionValues.models, event.kind.startsWith("agent.")], ["missingRole", event.role, event.kind.startsWith("agent.")],
    ["missingPhase", event.phase, event.kind.startsWith("phase.")], ["missingSkill", event.skill, event.kind === "skill.used"],
  ];
  for (const [field, value, applies] of gaps) if (applies && (value === UNKNOWN || value === OTHER)) add(state.health, field);
  add(state.sources[event.source], "events"); state.sources[event.source].lastEventAt = now(deps);
  state.recent.push({ key, fingerprint }); state.recent = state.recent.slice(-LIMITS.recent);
  settleUsage(state, deps);
  state.updatedAt = now(deps);
  return { written: true, state };
}

function validCounts(v: unknown, keys: readonly string[]): boolean { return object(v) && keysAre(v, keys) && Object.values(v).every(count); }
function validSummary(v: unknown): boolean {
  return object(v) && keysAre(v, ["events", "outcomes", "gates", "primaryFinishes", "subagentFinishes", "unknownFinishes", "mustFixCount", "elapsedMs", "matchedFinishes", ...(Object.hasOwn(v, "ships") ? ["ships"] : [])]) &&
    (!Object.hasOwn(v, "ships") || v.ships === null || count(v.ships) && object(v.events) && (v.ships as number) <= (v.events["pitch.finished"] as number)) &&
    validCounts(v.events, KINDS) && validCounts(v.outcomes, OUTCOMES) && validCounts(v.gates, DECISIONS) &&
    ["primaryFinishes", "subagentFinishes", "unknownFinishes", "mustFixCount", "elapsedMs", "matchedFinishes"].every(k => count(v[k]));
}
function validRows(v: unknown, limit: number, validate: (row: unknown) => boolean = validSummary, validKey: (key: string) => boolean = storedName): boolean {
  return object(v) && Object.keys(v).length <= limit + 2 && Object.keys(v).filter(k => k !== UNKNOWN && k !== OTHER).length <= limit && Object.entries(v).every(([key, row]) => validKey(key) && validate(row));
}
const V1_KEYS = ["schemaVersion", "createdAt", "updatedAt", "project", "totals", "vendors", "pitches", "days", "dimensions", "health", "sources", "recent", "pending"] as const;
const scopeKey = (key: string): boolean => key === NONE || key === OTHER || SCOPE.test(key);
const usageLabel = (x: unknown): boolean => typeof x === "string" && x !== OTHER && storedName(x);
const usagePitch = (x: unknown): boolean => typeof x === "string" && x !== OTHER && storedPitch(x);
const usageScope = (x: unknown): boolean => typeof x === "string" && x !== OTHER && scopeKey(x);
function validTrace(v: unknown): boolean {
  return Array.isArray(v) && v.length <= LIMITS.trace && v.every(t => object(t) && keysAre(t, ["at", "phase", "scope", "class"]) && date(t.at) && typeof t.phase === "string" && storedName(t.phase) &&
    typeof t.scope === "string" && scopeKey(t.scope) && ["start", ...TRANSITIONS].includes(t.class as string));
}
function leavesWithin(pitches: unknown): boolean {
  let leaves = 0;
  for (const node of Object.values(pitches as Record<string, UsageNode>)) for (const phase of Object.values(node.phases)) leaves += Object.keys(phase.scopes).filter(k => k !== OTHER).length;
  return leaves <= LIMITS.leaves;
}
function validRecord(r: unknown): boolean {
  return object(r) && keysAre(r, ["s", "e", "kind", "pitch", "phase", "scope"]) && count(r.s) && count(r.e) && r.e > r.s && ["active", "wait"].includes(r.kind as string) &&
    usagePitch(r.pitch) && usageLabel(r.phase) && usageScope(r.scope);
}
function validSession(r: unknown): boolean {
  return object(r) && keysAre(r, ["lastAt", "lastStopAt", "clock", "open", "pitch", "phase", "scope"]) && date(r.lastAt) && (r.lastStopAt === null || count(r.lastStopAt)) &&
    ["event", "collector"].includes(r.clock as string) && typeof r.open === "boolean" && !(r.open && r.lastStopAt !== null) && usagePitch(r.pitch) && usageLabel(r.phase) && usageScope(r.scope);
}
function validUsage(v: unknown): boolean {
  if (!object(v) || !keysAre(v, ["since", "health", "total", "pitches", "open", "frontier", "sessions"])) return false;
  const validRow = (row: unknown): boolean => object(row) && keysAre(row, ROW) && Object.values(row).every(count);
  return (v.since === null || date(v.since)) && validCounts(v.health, USAGE_HEALTH) && validRow(v.total) &&
    validRows(v.pitches, LIMITS.pitches, node => object(node) && keysAre(node, ["lastAt", "row", "phases", "transitions", "trace", "lastPhase"]) && date(node.lastAt) && validRow(node.row) &&
      validCounts(node.transitions, TRANSITIONS) && validTrace(node.trace) && (node.lastPhase === null || typeof node.lastPhase === "string" && storedName(node.lastPhase)) &&
      validRows(node.phases, LIMITS.phasesPerPitch, phase => object(phase) && keysAre(phase, ["row", "scopes"]) && validRow(phase.row) && validRows(phase.scopes, LIMITS.scopesPerPhase, validRow, scopeKey)), storedPitch) &&
    leavesWithin(v.pitches) &&
    Array.isArray(v.open) && v.open.length <= LIMITS.openIntervals && v.open.every(validRecord) &&
    (v.frontier === null || count(v.frontier) && v.open.every(r => (r as UsageRecord).e > (v.frontier as number))) && validRows(v.sessions, LIMITS.sessions, validSession, key => HASH.test(key));
}
const PENDING_V2 = ["startedAt", "lastAt", "status", "kind", "agentKind", "clock", "pitch", "phase", "scope"] as const;
function validPending(a: unknown): boolean {
  if (!object(a) || !(keysAre(a, PENDING_V2.slice(0, 3)) || keysAre(a, PENDING_V2)) || !date(a.startedAt) || !date(a.lastAt) || a.lastAt < a.startedAt || !["running", "paused"].includes(a.status as string)) return false;
  if (Object.keys(a).length === 3) return true;
  const label = (x: unknown): boolean => typeof x === "string" && x !== OTHER && storedName(x);
  return ["agent", "phase"].includes(a.kind as string) && ["primary", "subagent", "unknown"].includes(a.agentKind as string) && ["event", "collector"].includes(a.clock as string) &&
    usagePitch(a.pitch) && label(a.phase) && typeof a.scope === "string" && (a.scope === NONE || SCOPE.test(a.scope));
}
/** Exact schemas prevent hand-edited state from carrying arbitrary fields into reports. */
export function validState(v: unknown): v is UsageState {
  return object(v) && v.schemaVersion === SCHEMA_VERSION && validBody(v, true) && validUsage(v.usage);
}
/** The v1 shape is accepted only for migration, never as current state. */
function validV1(v: unknown): boolean { return object(v) && v.schemaVersion === 1 && validBody(v, false); }
function validBody(v: Record<string, unknown>, withUsage: boolean): boolean {
  if (!keysAre(v, withUsage ? [...V1_KEYS, "usage"] : V1_KEYS) || !date(v.createdAt) || !date(v.updatedAt)) return false;
  const p = v.project;
  if (!object(p) || !keysAre(p, ["id", "label", "workflowVersion"]) || typeof p.id !== "string" || !/^[a-f0-9-]{36}$/.test(p.id) || typeof p.label !== "string" || !storedName(p.label)) return false;
  const w = p.workflowVersion;
  if (!object(w) || !keysAre(w, ["value", "status", "evidence"]) || !(w.value === null || typeof w.value === "string" && storedName(w.value)) || !["observed", "stale", "unavailable"].includes(w.status as string) || ![null, ".project/.bundle-sync.json", "VERSION"].includes(w.evidence as string | null)) return false;
  if (!validSummary(v.totals) || !validRows(v.vendors, LIMITS.vendors) || !validRows(v.pitches, LIMITS.pitches, validSummary, storedPitch) || !validCounts(v.health, HEALTH)) return false;
  if (!object(v.days) || Object.keys(v.days).length > LIMITS.days || !Object.entries(v.days).every(([day, row]) => date(`${day}T00:00:00.000Z`) && validSummary(row))) return false;
  if (!object(v.dimensions) || !keysAre(v.dimensions, DIMENSIONS) || !Object.entries(v.dimensions).every(([dimension, rows]) => validRows(rows, LIMITS.vendors, row => validRows(row, LIMITS.names, validSummary, dimension === "models" ? storedModelName : storedName)))) return false;
  if (!object(v.sources) || !keysAre(v.sources, SOURCES) || !Object.values(v.sources).every(s => object(s) && keysAre(s, ["events", "lastEventAt"]) && count(s.events) && (s.lastEventAt === null || date(s.lastEventAt)))) return false;
  if (!Array.isArray(v.recent) || v.recent.length > LIMITS.recent || !v.recent.every(r => object(r) && keysAre(r, ["key", "fingerprint"]) && typeof r.key === "string" && HASH.test(r.key) && typeof r.fingerprint === "string" && HASH.test(r.fingerprint)) || new Set(v.recent.map(r => (r as { key: string }).key)).size !== v.recent.length) return false;
  return object(v.pending) && Object.keys(v.pending).length <= LIMITS.pending && Object.entries(v.pending).every(([key, a]) => HASH.test(key) && validPending(a));
}

/** Missing is distinct from unsafe or unreadable, including dangling symlinks. */
function inspect(file: string, deps: RuntimeDeps): ReturnType<RuntimeDeps["fs"]["lstatSync"]> | null {
  try { return deps.fs.lstatSync(file); } catch (error) { if (errorCode(error) === "ENOENT") return null; throw error; }
}
export function metricsDirectory(root: string, create: boolean, deps: RuntimeDeps): string | null {
  const canonical = deps.fs.realpathSync(root);
  for (const relative of [".project", ".project/metrics"]) {
    const path = deps.path.join(canonical, relative), stat = inspect(path, deps);
    if (!stat) {
      if (relative === ".project") throw new Error("project is not initialized");
      if (!create) return null;
      try { deps.fs.mkdirSync(path, { recursive: false, mode: 0o700 }); }
      catch (error) { if (errorCode(error) !== "EEXIST") throw error; }
    }
    const current = inspect(path, deps);
    if (!current || current.isSymbolicLink() || !current.isDirectory()) throw new Error("unsafe metrics directory");
    const resolved = deps.fs.realpathSync(path), rel = deps.path.relative(canonical, resolved);
    if (rel === ".." || rel.startsWith(`..${deps.path.sep}`) || deps.path.isAbsolute(rel)) throw new Error("unsafe metrics directory");
  }
  return deps.path.join(canonical, ".project", "metrics");
}
export function readText(file: string, deps: RuntimeDeps, maxBytes = LIMITS.stateBytes): { status: "valid"; text: string } | { status: "missing" } | { status: "refused"; reason: string } {
  let fd: number | undefined;
  try {
    const stat = inspect(file, deps);
    if (!stat) return { status: "missing" };
    if (stat.isSymbolicLink() || !stat.isFile() || stat.size > maxBytes) return { status: "refused", reason: "unsafe or oversized state" };
    const c = deps.fs.constants;
    fd = deps.fs.openSync(file, c.O_RDONLY | (c.O_NOFOLLOW ?? 0) | (c.O_NONBLOCK ?? 0));
    const opened = deps.fs.fstatSync(fd);
    if (!opened.isFile() || opened.size > maxBytes || opened.ino !== stat.ino || opened.dev !== stat.dev) return { status: "refused", reason: "state changed or is unsafe" };
    const bytes = new Uint8Array(maxBytes + 1);
    let used = 0, received: number;
    do { received = deps.fs.readSync(fd, bytes, used, bytes.length - used, used); used += received; } while (received && used <= maxBytes);
    return used > maxBytes ? { status: "refused", reason: "oversized state" } : { status: "valid", text: new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, used)) };
  } catch (error) { return { status: "refused", reason: `state read refused (${errorCode(error)})` }; }
  finally { if (fd !== undefined) deps.fs.closeSync(fd); }
}
/**
 * Edits the version token and appends the usage block, so every v1 byte between them is untouched.
 * Returns null for anything but one exact v1 document that is not already carrying usage.
 */
export function migrateV1Text(text: string, since: string | null): string | null {
  const prefix = /^\{"schemaVersion":1,/.exec(text);
  const end = text.lastIndexOf("}");
  if (!prefix || end < 0 || text.slice(end + 1).trim() !== "" || text.split('"schemaVersion"').length !== 2) return null;
  try { if (!validV1(JSON.parse(text))) return null; } catch { return null; }
  return `{"schemaVersion":${SCHEMA_VERSION},${text.slice(prefix[0].length, end)},"usage":${JSON.stringify(blankUsage(since))}${text.slice(end)}`;
}
/** A v1 file is migrated in memory; `since` stamps the migration only when the caller is about to persist it. */
export function readWorkflowState(directory: string, deps: RuntimeDeps, since: string | null = null): ReadResult {
  const loaded = readText(deps.path.join(directory, STATE_FILE), deps);
  if (loaded.status !== "valid") return loaded;
  try {
    const text = loaded.text.startsWith('{"schemaVersion":1,') ? migrateV1Text(loaded.text, since) : loaded.text;
    if (text === null) return { status: "refused", reason: "invalid or unsupported workflow state" };
    const parsed: unknown = JSON.parse(text);
    if (!validState(parsed)) return { status: "refused", reason: "invalid or unsupported workflow state" };
    for (const field of ["vendors", "pitches", "days"] as const) parsed[field] = Object.assign(map<Summary>(), parsed[field]);
    parsed.pending = Object.assign(map<PendingEntry>(), parsed.pending);
    parsed.usage.pitches = Object.assign(map<UsageNode>(), parsed.usage.pitches);
    for (const node of Object.values(parsed.usage.pitches)) {
      node.phases = Object.assign(map<UsageNode["phases"][string]>(), node.phases);
      for (const phase of Object.values(node.phases)) phase.scopes = Object.assign(map<UsageRow>(), phase.scopes);
    }
    parsed.usage.sessions = Object.assign(map<UsageSession>(), parsed.usage.sessions);
    for (const field of DIMENSIONS) {
      const rows = map<Map<Summary>>();
      for (const [vendor, values] of Object.entries(parsed.dimensions[field])) rows[vendor] = Object.assign(map<Summary>(), values);
      parsed.dimensions[field] = rows;
    }
    return { status: "valid", state: parsed };
  } catch { return { status: "refused", reason: "invalid workflow state JSON" }; }
}
export function validateDestination(file: string, deps: RuntimeDeps): void {
  const stat = inspect(file, deps);
  if (stat && (stat.isSymbolicLink() || !stat.isFile())) throw new Error("unsafe output destination");
}
export function writeAtomic(file: string, content: string, deps: RuntimeDeps): void {
  if (new TextEncoder().encode(content).length > LIMITS.stateBytes) throw new Error("output is oversized");
  validateDestination(file, deps);
  const temporary = `${file}.${deps.crypto.randomUUID()}.tmp`;
  let created = false;
  try {
    const fd = deps.fs.openSync(temporary, "wx", 0o600); created = true;
    try { deps.fs.writeFileSync(fd, content); deps.fs.fsyncSync(fd); } finally { deps.fs.closeSync(fd); }
    deps.fs.renameSync(temporary, file);
  } finally { if (created) deps.fs.rmSync(temporary, { force: true }); }
}
/** Recheck pinned ancestor identities after the async lease and before filesystem effects. */
function guardedMetricsDeps(directory: string, deps: RuntimeDeps): RuntimeDeps {
  const paths = [deps.path.dirname(directory), directory];
  const identities = paths.map(path => deps.fs.lstatSync(path));
  const verify = (): void => {
    for (let i = 0; i < paths.length; i++) {
      const stat = deps.fs.lstatSync(paths[i]);
      if (stat.isSymbolicLink() || !stat.isDirectory() || stat.ino !== identities[i].ino || stat.dev !== identities[i].dev || deps.fs.realpathSync(paths[i]) !== paths[i]) throw new Error("unsafe metrics directory");
    }
  };
  verify();
  const fs = new Proxy(deps.fs, { get(target, key) {
    const value: unknown = Reflect.get(target, key);
    if (typeof value !== "function" || key === "closeSync") return value;
    return (...args: unknown[]) => { verify(); return Reflect.apply(value, target, args); };
  } });
  return { ...deps, fs };
}
export async function withMetricsLease<T>(directory: string, action: (guarded: RuntimeDeps) => T | Promise<T>, deps: RuntimeDeps): Promise<T | { written: false; reason: string }> {
  const guarded = guardedMetricsDeps(directory, deps);
  const held = await withLease(directory, () => {
    if (inspect(deps.path.join(directory, ".token-consumption.lock"), guarded)) return { written: false as const, reason: "legacy metrics lock is present" };
    return action(guarded);
  }, {}, deps);
  return held.skipped === undefined ? held.value : { written: false, reason: "metrics lease unavailable; event not recorded" };
}
/**
 * A capture that never got the lease cannot write the state, so it leaves one byte here, outside the lease.
 * Never throws and never creates the metrics directory; any refusal reads as "not recorded".
 */
export function recordDroppedCapture(root: string, deps: RuntimeDeps): boolean {
  let fd: number | undefined;
  try {
    const directory = metricsDirectory(root, false, deps);
    if (!directory) return false;
    const file = deps.path.join(directory, DROP_MARKER_FILE), stat = inspect(file, deps);
    if (stat && (stat.isSymbolicLink() || !stat.isFile() || stat.size >= LIMITS.dropMarkerBytes)) return false;
    // The runtime exposes O_NOFOLLOW but not O_WRONLY, O_APPEND or O_CREAT, so "a" is guarded by the lstat above and the identity check below.
    fd = deps.fs.openSync(file, "a", 0o600);
    const opened = deps.fs.fstatSync(fd);
    if (!opened.isFile() || opened.size >= LIMITS.dropMarkerBytes || stat && (opened.ino !== stat.ino || opened.dev !== stat.dev)) return false;
    deps.fs.writeFileSync(fd, "x");
    return true;
  } catch { return false; }
  finally { if (fd !== undefined) try { deps.fs.closeSync(fd); } catch { /* A close failure cannot change the outcome. */ } }
}
/** Under the lease: moves the marker aside so new drops start a fresh file, and reports how many bytes it held. */
function takeDroppedMarker(directory: string, deps: RuntimeDeps): { count: number; restore: () => void; settle: () => void } {
  const none = { count: 0, restore: () => {}, settle: () => {} };
  try {
    const file = deps.path.join(directory, DROP_MARKER_FILE), stat = inspect(file, deps);
    if (!stat || stat.isSymbolicLink() || !stat.isFile()) return none;
    const taken = `${file}.${deps.crypto.randomUUID()}.consumed`;
    deps.fs.renameSync(file, taken);
    return {
      count: Math.min(deps.fs.lstatSync(taken).size, LIMITS.dropMarkerBytes),
      restore: () => { try { if (!inspect(file, deps)) deps.fs.renameSync(taken, file); } catch { /* The consumed file stays as evidence. */ } },
      settle: () => { try { deps.fs.unlinkSync(taken); } catch { /* A leftover consumed file is never read again. */ } },
    };
  } catch { return none; }
}
const DROPPED_REASONS = ["metrics lease unavailable; event not recorded", "legacy metrics lock is present"];
function installedVersion(root: string, deps: RuntimeDeps): UsageState["project"]["workflowVersion"] {
  for (const [relative, status] of [[".project/.bundle-sync.json", "observed"], ["VERSION", "stale"]] as const) {
    const loaded = readText(deps.path.join(root, relative), deps, 16 * 1024);
    if (loaded.status !== "valid") continue;
    try {
      const marker: unknown = relative === "VERSION" ? loaded.text.trim() : JSON.parse(loaded.text);
      const value = relative === "VERSION" ? marker : object(marker) ? marker.sourceVersion : undefined;
      if (typeof value === "string" && value.length <= 80 && /^\d+\.\d+\.\d+$/.test(value)) return { value, status, evidence: relative };
    } catch { /* Missing or invalid version evidence does not block usage collection. */ }
  }
  return { value: null, status: "unavailable", evidence: null };
}
function failure(error: unknown): RecordResult {
  const message = error instanceof Error ? error.message : "";
  // Only fixed internal messages are permitted; never echo runtime errors or input.
  const allowed = ["invalid event", "invalid event timestamp", "missing lifecycle identifier", "missing outcome or decision", "invalid audit count", "project is not initialized", "unsafe metrics directory", "metric counter overflow", "output is oversized", "unsafe output destination"];
  return { written: false, reason: allowed.includes(message) ? message : `metrics operation failed (${errorCode(error)})` };
}
export async function recordWorkflowEvent(input: unknown, root: string, deps: RuntimeDeps): Promise<RecordResult> {
  try {
    const event = normalizeEvent(input, deps);
    const directory = metricsDirectory(root, true, deps) as string;
    const held = await withMetricsLease(directory, deps => {
      const loaded = readWorkflowState(directory, deps, now(deps));
      if (loaded.status === "refused") return { written: false, reason: loaded.reason };
      const state = loaded.status === "valid" ? loaded.state : blankState(deps, deps.path.basename(deps.fs.realpathSync(root)));
      state.project.workflowVersion = installedVersion(deps.fs.realpathSync(root), deps);
      const result = applyEvent(state, event, deps);
      if (result.written) {
        const dropped = takeDroppedMarker(directory, deps);
        try { add(state.usage.health, "captureDropped", dropped.count); writeAtomic(deps.path.join(directory, STATE_FILE), `${JSON.stringify(state)}\n`, deps); } catch (error) { dropped.restore(); throw error; }
        dropped.settle();
      }
      return result;
    }, deps);
    if (!held.written && held.reason !== undefined && DROPPED_REASONS.includes(held.reason)) recordDroppedCapture(root, deps);
    return held;
  } catch (error) { return failure(error); }
}
