import type { UsageRow, UsageState } from "./workflow-metrics-state.mts";

/*
 * Pure projection and join of the flow token store and the workflow usage store. Nothing here reads a
 * file: callers hand over parsed, untrusted values and receive typed projections or fixed refusal reasons.
 * Rows are matched only by exact canonical pitch, phase and scope; every other label stays a
 * source-specific row. Timing is copied from stored rows and never summed across levels.
 */
export const FLOW_LIMITS = { sourceBytes: 4 * 1024 * 1024, outputBytes: 4 * 1024 * 1024, rows: 100, staleMs: 7 * 86_400_000 } as const;
interface Bounds { pitches: number; phases: number; scopes: number; leaves: number }
const TOKEN_BOUNDS: Bounds = { pitches: 51, phases: 16, scopes: 26, leaves: 600 };
// The usage reader itself admits 50 named pitches plus two overflow labels, and 16 phases plus two.
const USAGE_BOUNDS: Bounds = { pitches: 52, phases: 18, scopes: 26, leaves: 600 };
export const REASONS = {
  shape: "source has an unexpected shape", counts: "source counts are invalid or inconsistent", label: "source contains an unsafe label",
  limit: "source exceeds the report bounds", date: "source timestamp is invalid", revision: "source revision is not supported",
  legacy: "usage state predates schema 2 and is not joinable", unsafe: "source is unsafe, oversized or changed", unreadable: "source could not be read safely",
  historyAbsent: "snapshot has no usable pitch history",
} as const;
export type SourceName = "tokens" | "usage" | "history";
export type SourceStatus = "observed" | "stale" | "missing" | "refused" | "unsupported";
export type Loaded<T> = { status: "valid"; value: T } | { status: "missing" } | { status: "refused" | "unsupported"; reason: string };
export type TimeRow = UsageRow;
export interface TokenRow { completions: number; reportedUsage: number; unavailable: number; tokens: number }
type TokenTree = Map<string, Map<string, Map<string, Map<string, TokenRow>>>>;
export interface TokenProjection { since: string | null; updatedAt: string | null; tree: TokenTree; leaves: number }
export interface TraceOut { at: string; phase: string; scope: string; class: string }
export interface UsagePitch { row: TimeRow; phases: Map<string, { row: TimeRow; scopes: Map<string, TimeRow> }>; transitions: Record<string, number>; trace: TraceOut[] }
export interface UsageProjection {
  since: string; updatedAt: string; total: TimeRow; pitches: Map<string, UsagePitch>; pending: number; buffered: number;
  settledThrough: string | null; health: Record<string, number>;
}
type Availability = "observed" | "partial" | "unavailable";
export interface HistoryItem {
  status: "observed" | "stale" | "unavailable"; phase: string | null; shipped: string | null;
  auditAvailability: Availability; auditCycles: number | null; auditMustFix: number | null;
  revisions: { availability: Availability; value: number | null };
}
export interface HistoryProjection { generatedAt: string; items: Map<string, HistoryItem>; truncated: number | null; maxItems: number | null }
export interface FlowInputs { tokens: Loaded<TokenProjection>; usage: Loaded<UsageProjection>; history: Loaded<HistoryProjection> }

class Refusal extends Error {}
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const SCOPE = /^S\d{1,3}$/;
const SAFE = /^[\w.:/@+-]{1,80}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const PHASES = new Set(["shape", "shape-lite", "critique", "plan", "build", "audit", "ship", "cooldown", "fix", "resume", "switch", "checkpoint"]);
const SENTINELS = new Set(["(unknown)", "(other)", "(unattributed)", "(none)", "(unreported)"]);
const RESERVED = new Set(["__proto__", "constructor", "prototype"]);
const TRANSITIONS = ["repeat", "forward", "back", "other"] as const;
const USAGE_HEALTH = ["captureDropped", "pitchFolds", "clippedIntervals", "mixedClockIntervals", "supersededTurns", "sessionEvictions"] as const;
const LIFECYCLE_HEALTH = ["missingVendor", "missingModel", "missingRole", "missingPhase", "missingSkill", "missingPitch", "unmatchedFinishes", "unmatchedTransitions", "pendingEvictions", "lateEvents", "overflowEvents"] as const;
// Linear patterns over labels of at most 80 characters; a match replaces the label before any output.
const SECRET = [/\bAKIA[0-9A-Z]{16}/, /\b(?:sk|pk|rk)[-_](?:live_|test_)?[A-Za-z0-9_-]{16,}/, /\bgh[pousr]_[A-Za-z0-9]{20,}/, /\bgithub_pat_[A-Za-z0-9_]{20,}/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/, /\bnpm_[A-Za-z0-9]{20,}/, /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/, /\b(?:Bearer|Basic)\s+\S{8,}/i,
  /(?:password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|credential|auth|signature)[A-Za-z0-9_-]{0,40}["']?\s{0,3}[:=]/i];
const COMPLETION_UNIT = "vendor-defined agent completion event";
const NOTES = [
  "Token counts are vendor-reported only; missing usage is null, never zero, and nothing is estimated.",
  "Completion events are defined by each vendor's collector; differing units are not ranked as equivalent work.",
  "Active time is the stored union of settled intervals. Wait is a lower bound of elapsed time between turns, not necessarily think-time.",
  "Timing rollups use stored rows and are never sums of child rows or of vendor copies.",
  "Token and time capture windows can differ; no efficiency ratio is derived from them.",
];
const UNAVAILABLE_METRICS = [
  { metric: "effort", reason: "flow rows carry no effort field" },
  { metric: "cacheHitRatio", reason: "flow rows carry no token components" },
  { metric: "outputInputRatio", reason: "flow rows carry no token components" },
  { metric: "timeEfficiency", reason: "token and time observation windows can differ" },
];

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const count = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const isDate = (v: unknown): v is string => typeof v === "string" && v.length === 24 && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const refuse = (reason: string): never => { throw new Refusal(reason); };
const stamp = (v: unknown): string => (isDate(v) ? v : refuse(REASONS.date));
const nullableStamp = (v: unknown): string | null => (v === null ? null : stamp(v));
const num = (v: unknown): number => (count(v) ? v : refuse(REASONS.counts));
const label = (v: string): string => ((SENTINELS.has(v) || SAFE.test(v)) && !RESERVED.has(v) ? v : refuse(REASONS.label));
const safeText = (v: string): string => (SECRET.some(p => p.test(v)) ? "(redacted)" : v);
function entries(v: unknown, max: number): [string, unknown][] {
  if (!isObj(v)) return refuse(REASONS.shape);
  const list = Object.entries(v);
  return list.length > max ? refuse(REASONS.limit) : list;
}
function guard<T>(read: () => T): Loaded<T> {
  try { return { status: "valid", value: read() }; } catch (error) {
    if (error instanceof Refusal) return { status: "refused", reason: error.message };
    throw error;
  }
}

function tokenRow(v: unknown): TokenRow {
  if (!isObj(v)) return refuse(REASONS.shape);
  const row = { completions: num(v.completions), reportedUsage: num(v.reportedUsageCount), unavailable: num(v.unavailableCount), tokens: num(v.tokens) };
  if (row.reportedUsage + row.unavailable !== row.completions || row.reportedUsage === 0 && row.tokens !== 0) return refuse(REASONS.counts);
  return row;
}
/** Copies only the fields the report needs from a flow token snapshot; values from disk are never trusted. */
export function projectTokens(input: unknown): Loaded<TokenProjection> {
  if (!isObj(input) || !Number.isInteger(input.schemaVersion)) return { status: "refused", reason: REASONS.shape };
  if (input.schemaVersion !== 3) return { status: "unsupported", reason: REASONS.revision };
  return guard(() => {
    const updatedAt = nullableStamp(input.updatedAt), flows = input.flows;
    if (!isObj(flows)) return refuse(REASONS.shape);
    const since = nullableStamp(flows.since), tree: TokenTree = new Map();
    let leaves = 0;
    for (const [pitch, byPhase] of entries(flows.pitches, TOKEN_BOUNDS.pitches)) {
      if (!isObj(byPhase)) return refuse(REASONS.shape);
      const phases = new Map<string, Map<string, Map<string, TokenRow>>>();
      for (const [phase, body] of entries(byPhase.phases, TOKEN_BOUNDS.phases)) {
        if (!isObj(body)) return refuse(REASONS.shape);
        const scopes = new Map<string, Map<string, TokenRow>>();
        for (const [scope, byVendor] of entries(body.scopes, TOKEN_BOUNDS.scopes)) {
          const vendors = new Map<string, TokenRow>();
          for (const [vendor, row] of entries(byVendor, TOKEN_BOUNDS.leaves)) {
            if (++leaves > TOKEN_BOUNDS.leaves) return refuse(REASONS.limit);
            vendors.set(label(vendor), tokenRow(row));
          }
          scopes.set(label(scope), vendors);
        }
        phases.set(label(phase), scopes);
      }
      tree.set(label(pitch), phases);
    }
    return { since, updatedAt, tree, leaves };
  });
}

function timeRow(v: UsageRow): TimeRow {
  return { activeMs: num(v.activeMs), waitMs: num(v.waitMs), turnsStarted: num(v.turnsStarted), turnsFinished: num(v.turnsFinished),
    gapsMeasured: num(v.gapsMeasured), gapsUnmeasured: num(v.gapsUnmeasured), gapsOverCap: num(v.gapsOverCap) };
}
/** The state reader already validated the document; this re-checks bounds and labels and drops everything else. */
export function projectUsage(state: UsageState): Loaded<UsageProjection> {
  const usage = state.usage;
  if (usage.since === null) return { status: "unsupported", reason: REASONS.legacy };
  return guard(() => {
    const pitches = new Map<string, UsagePitch>();
    for (const [pitch, node] of entries(usage.pitches, USAGE_BOUNDS.pitches)) {
      const body = node as UsageState["usage"]["pitches"][string], phases = new Map<string, { row: TimeRow; scopes: Map<string, TimeRow> }>();
      for (const [phase, entry] of entries(body.phases, USAGE_BOUNDS.phases)) {
        const scopes = new Map<string, TimeRow>();
        for (const [scope, row] of entries((entry as typeof body.phases[string]).scopes, USAGE_BOUNDS.scopes)) scopes.set(label(scope), timeRow(row as UsageRow));
        phases.set(label(phase), { row: timeRow((entry as typeof body.phases[string]).row), scopes });
      }
      if (body.trace.length > 32) return refuse(REASONS.limit);
      const trace = body.trace.map(t => ({ at: stamp(t.at), phase: label(t.phase), scope: label(t.scope), class: label(t.class) }));
      const transitions = Object.fromEntries(TRANSITIONS.map(k => [k, num(body.transitions[k])]));
      pitches.set(label(pitch), { row: timeRow(body.row), phases, transitions, trace });
    }
    const frontier = usage.frontier;
    return { since: stamp(usage.since), updatedAt: stamp(state.updatedAt), total: timeRow(usage.total), pitches, pending: Object.keys(state.pending).length,
      buffered: usage.open.length, settledThrough: frontier !== null && Number.isFinite(new Date(frontier).getTime()) ? new Date(frontier).toISOString() : null,
      health: Object.fromEntries([...USAGE_HEALTH.map(k => [k, num(usage.health[k])]), ...LIFECYCLE_HEALTH.map(k => [k, num(state.health[k])])]) };
  });
}

/** Reads the `history` section of a state snapshot (schema 1): Fact rows with nested availability. */
export function projectHistory(input: unknown): Loaded<HistoryProjection> {
  if (!isObj(input) || input.schemaVersion !== 1) return { status: "unsupported", reason: REASONS.revision };
  if (!isObj(input.history) || !Array.isArray(input.history.items)) return { status: "unsupported", reason: REASONS.historyAbsent };
  return guard(() => {
    const generatedAt = stamp(input.generatedAt), history = input.history as Record<string, unknown> & { items: unknown[] };
    if (history.items.length > 200) return refuse(REASONS.limit);
    const items = new Map<string, HistoryItem>();
    for (const fact of history.items) {
      const value = isObj(fact) ? fact.value : null;
      if (!isObj(fact) || !Array.isArray(fact.evidence) || typeof fact.status !== "string" || !["observed", "stale", "unavailable"].includes(fact.status) || !isObj(value) || typeof value.slug !== "string" || !SLUG.test(value.slug) || items.has(value.slug)) return refuse(REASONS.shape);
      const status = fact.status as HistoryItem["status"], usable = status !== "unavailable";
      const audit = isObj(value.audit) ? value.audit : null, auditValue = audit !== null && isObj(audit.value) ? audit.value : null;
      const availability = usable && auditValue !== null && audit !== null && typeof audit.availability === "string" && ["observed", "partial"].includes(audit.availability) ? audit.availability as Availability : "unavailable";
      const optional = (v: unknown): number | null => (count(v) ? v : null);
      const revisions = isObj(value.revisions) ? value.revisions : null;
      const revisionAvailability = usable && revisions !== null && count(revisions.value) && typeof revisions.availability === "string" && ["observed", "partial"].includes(revisions.availability) ? revisions.availability as Availability : "unavailable";
      items.set(value.slug, {
        status, phase: usable && typeof value.phase === "string" && SAFE.test(value.phase) ? safeText(value.phase) : null,
        shipped: usable && typeof value.shipped === "string" && DAY.test(value.shipped) && isDate(`${value.shipped}T00:00:00.000Z`) ? value.shipped : null,
        auditAvailability: availability, auditCycles: availability === "unavailable" ? null : optional(auditValue?.cycles), auditMustFix: availability === "unavailable" ? null : optional(auditValue?.mustFix),
        revisions: { availability: revisionAvailability, value: revisionAvailability === "unavailable" ? null : optional(revisions?.value) },
      });
    }
    const limits = isObj(history.limits) && isObj(history.limits.value) ? history.limits.value : null;
    return { generatedAt, items, truncated: limits !== null && count(limits.truncatedItems) ? limits.truncatedItems : null, maxItems: limits !== null && count(limits.maxItems) ? limits.maxItems : null };
  });
}

// ---- Join ----
interface Agg extends TokenRow { overflow: boolean }
type Vendors = Map<string, Agg>;
/** Checked addition: a sum past the safe-integer range marks the aggregate overflowed instead of wrapping. */
function fold(into: Vendors, vendor: string, row: TokenRow & { overflow?: boolean }): void {
  const agg = into.get(vendor) ?? { completions: 0, reportedUsage: 0, unavailable: 0, tokens: 0, overflow: false };
  into.set(vendor, agg);
  if (agg.overflow || row.overflow) { agg.overflow = true; return; }
  const next = [agg.completions + row.completions, agg.reportedUsage + row.reportedUsage, agg.unavailable + row.unavailable, agg.tokens + row.tokens];
  if (!next.every(Number.isSafeInteger)) { agg.overflow = true; return; }
  [agg.completions, agg.reportedUsage, agg.unavailable, agg.tokens] = next;
}
export interface TokenCell {
  vendor: string; completionUnit: string; completions: number | null; reportedUsage: number | null; unavailable: number | null;
  tokens: number | null; status: "reported" | "partial" | "unreported" | "overflow";
}
function cells(vendors: Vendors): TokenCell[] | null {
  if (vendors.size === 0) return null;
  return [...vendors.entries()].sort(([a], [b]) => cmp(a, b)).map(([vendor, a]) => a.overflow
    ? { vendor: safeText(vendor), completionUnit: COMPLETION_UNIT, completions: null, reportedUsage: null, unavailable: null, tokens: null, status: "overflow" as const }
    : { vendor: safeText(vendor), completionUnit: COMPLETION_UNIT, completions: a.completions, reportedUsage: a.reportedUsage, unavailable: a.unavailable,
      tokens: a.reportedUsage === 0 ? null : a.tokens, status: a.reportedUsage === 0 ? "unreported" as const : a.reportedUsage < a.completions ? "partial" as const : "reported" as const });
}

interface Node { label: string; exact: boolean; sources: Set<SourceName>; tokens: Vendors; time: TimeRow | null; extra: UsagePitch | null; children: Map<string, Node> }
/** A label outside the canonical grammar gets a per-source key, so two stores' `(other)` rows never merge. */
function child(parent: Map<string, Node>, source: SourceName, text: string, exact: boolean): Node {
  const key = exact ? text : `!${source}:${text}`;
  let node = parent.get(key);
  if (!node) { node = { label: text, exact, sources: new Set(), tokens: new Map(), time: null, extra: null, children: new Map() }; parent.set(key, node); }
  node.sources.add(source);
  return node;
}
const exactPitch = (s: string): boolean => SLUG.test(s);
const exactPhase = (s: string): boolean => PHASES.has(s);
const exactScope = (s: string): boolean => s === "(none)" || SCOPE.test(s);

export interface HistoryJoin { availability: "observed" | "stale" | "partial" | "unavailable"; reason: string | null; phase: string | null; shipped: string | null; audit: { availability: string; cycles: number | null; mustFix: number | null }; revisions: { availability: Availability; value: number | null } }
export interface FlowNode {
  level: "pitch" | "phase" | "scope"; label: string; identity: "exact" | "source-specific"; sources: SourceName[]; tokens: TokenCell[] | null; time: TimeRow | null;
  omittedChildren: number; children: FlowNode[]; history?: HistoryJoin | null; transitions?: Record<string, number>; trace?: TraceOut[];
}
export interface SourceInfo { status: SourceStatus; since: string | null; updatedAt: string | null; reason: string | null; details: Record<string, number | string | null> }
export interface FlowReport {
  schemaVersion: 1; generatedAt: string; sources: Record<SourceName, SourceInfo>;
  windows: { tokensSince: string | null; usageSince: string | null; historyGeneratedAt: string | null; aligned: boolean };
  timing: { provisional: boolean | null; pendingActivities: number | null; bufferedIntervals: number | null; settledThrough: string | null };
  totals: { tokens: TokenCell[] | null; time: TimeRow | null; displayed: { leafRows: number; tokens: TokenCell[] | null } };
  omitted: { leafRows: number; pitches: number }; pitches: FlowNode[]; unavailableMetrics: typeof UNAVAILABLE_METRICS; notes: string[];
}

function sourceInfo<T>(loaded: Loaded<T>, at: string, view: (value: T) => { since: string | null; updatedAt: string | null; details: Record<string, number | string | null> }): SourceInfo {
  if (loaded.status === "missing") return { status: "missing", since: null, updatedAt: null, reason: "source file does not exist", details: {} };
  if (loaded.status !== "valid") return { status: loaded.status, since: null, updatedAt: null, reason: loaded.reason, details: {} };
  const seen = view(loaded.value), age = seen.updatedAt === null ? 0 : Math.max(0, Date.parse(at) - Date.parse(seen.updatedAt));
  const details = seen.updatedAt === null ? seen.details : { ...seen.details, ageMs: age };
  return { status: age > FLOW_LIMITS.staleMs ? "stale" : "observed", since: seen.since, updatedAt: seen.updatedAt, reason: age > FLOW_LIMITS.staleMs ? "source is more than seven days old" : null, details };
}
function joinHistory(history: Loaded<HistoryProjection>, slug: string): HistoryJoin {
  const none = (reason: string): HistoryJoin => ({ availability: "unavailable", reason, phase: null, shipped: null, audit: { availability: "unavailable", cycles: null, mustFix: null }, revisions: { availability: "unavailable", value: null } });
  if (history.status !== "valid") return none("history source is not available");
  const item = history.value.items.get(slug);
  if (!item) return none(history.value.truncated === null || history.value.truncated > 0 ? "pitch is not listed; the snapshot may be truncated" : "pitch is not listed in the snapshot");
  if (item.status === "unavailable") return none("pitch history is unavailable");
  const complete = item.shipped !== null && item.phase !== null && item.auditAvailability === "observed";
  return { availability: item.status === "stale" ? "stale" : complete ? "observed" : "partial", reason: item.status === "stale" ? "pitch history is marked stale" : null, phase: item.phase, shipped: item.shipped, audit: { availability: item.auditAvailability, cycles: item.auditCycles, mustFix: item.auditMustFix }, revisions: item.revisions };
}

/** Builds the sanitized report model from already-validated projections. Never reads or writes anything. */
export function joinFlowReport(inputs: FlowInputs, generatedAt: string): FlowReport {
  if (!isDate(generatedAt)) throw new Error("invalid report timestamp");
  const { tokens, usage, history } = inputs, roots = new Map<string, Node>(), totalTokens: Vendors = new Map();
  if (tokens.status === "valid") for (const [pitch, phases] of tokens.value.tree) {
    const pitchNode = child(roots, "tokens", pitch, exactPitch(pitch));
    for (const [phase, scopes] of phases) {
      const phaseNode = child(pitchNode.children, "tokens", phase, exactPhase(phase));
      for (const [scope, vendors] of scopes) {
        const leaf = child(phaseNode.children, "tokens", scope, exactScope(scope));
        for (const [vendor, row] of vendors) for (const target of [leaf, phaseNode, pitchNode]) fold(target.tokens, vendor, row);
        for (const [vendor, row] of vendors) fold(totalTokens, vendor, row);
      }
    }
  }
  if (usage.status === "valid") for (const [pitch, body] of usage.value.pitches) {
    const pitchNode = child(roots, "usage", pitch, exactPitch(pitch));
    pitchNode.time = body.row; pitchNode.extra = body;
    for (const [phase, entry] of body.phases) {
      const phaseNode = child(pitchNode.children, "usage", phase, exactPhase(phase));
      phaseNode.time = entry.row;
      for (const [scope, row] of entry.scopes) child(phaseNode.children, "usage", scope, exactScope(scope)).time = row;
    }
  }
  const leaves: Node[][] = [];
  const walk = (node: Node, path: Node[]): void => {
    const here = [...path, node];
    if (node.children.size === 0) leaves.push(here); else for (const kid of node.children.values()) walk(kid, here);
  };
  for (const pitch of roots.values()) walk(pitch, []);
  const gaps = { tokens: { unjoinableLeafRows: 0, oneSidedLeafRows: 0 }, usage: { unjoinableLeafRows: 0, oneSidedLeafRows: 0 } };
  for (const path of leaves) {
    const leaf = path[path.length - 1], exact = path.length === 3 && path.every(n => n.exact);
    for (const source of leaf.sources) if (source !== "history") {
      if (!exact) gaps[source].unjoinableLeafRows++;
      else if (leaf.sources.size === 1) gaps[source].oneSidedLeafRows++;
    }
  }
  const sortKey = (path: Node[]): string => path.map(n => `${n.exact ? "" : "!"}${n.label}`).join("\u0000");
  leaves.sort((a, b) => cmp(sortKey(a), sortKey(b)));
  const kept = leaves.slice(0, FLOW_LIMITS.rows), shown = new Set<Node>(kept.flat()), displayed: Vendors = new Map();
  for (const path of kept) for (const [vendor, agg] of path[path.length - 1].tokens) fold(displayed, vendor, agg);

  const levels = ["pitch", "phase", "scope"] as const;
  const emit = (node: Node, depth: number): FlowNode => {
    const kids = [...node.children.entries()].filter(([, kid]) => shown.has(kid)).sort(([a], [b]) => cmp(a, b)).map(([, kid]) => emit(kid, depth + 1));
    const base: FlowNode = { level: levels[depth], label: safeText(node.label), identity: node.exact ? "exact" : "source-specific", sources: [...node.sources].sort(),
      tokens: cells(node.tokens), time: node.time, omittedChildren: node.children.size - kids.length, children: kids };
    if (depth > 0) return base;
    return { ...base, history: node.exact ? joinHistory(history, node.label) : null, transitions: node.extra?.transitions, trace: node.extra?.trace.map(t => ({ ...t, phase: safeText(t.phase), scope: safeText(t.scope) })) };
  };
  const pitches = [...roots.entries()].filter(([, node]) => shown.has(node)).sort(([a], [b]) => cmp(a, b)).map(([, node]) => emit(node, 0));
  const use = usage.status === "valid" ? usage.value : null, tok = tokens.status === "valid" ? tokens.value : null, hist = history.status === "valid" ? history.value : null;
  return {
    schemaVersion: 1, generatedAt,
    sources: {
      tokens: sourceInfo(tokens, generatedAt, v => ({ since: v.since, updatedAt: v.updatedAt, details: { pitches: v.tree.size, leafVendorRows: v.leaves, ...gaps.tokens } })),
      usage: sourceInfo(usage, generatedAt, v => ({ since: v.since, updatedAt: v.updatedAt, details: { pitches: v.pitches.size, ...v.health, ...gaps.usage } })),
      history: sourceInfo(history, generatedAt, v => ({ since: null, updatedAt: v.generatedAt, details: { pitches: v.items.size, truncatedItems: v.truncated, maxItems: v.maxItems } })),
    },
    windows: { tokensSince: tok?.since ?? null, usageSince: use?.since ?? null, historyGeneratedAt: hist?.generatedAt ?? null, aligned: tok?.since != null && tok.since === use?.since },
    timing: { provisional: use ? use.pending > 0 || use.buffered > 0 : null, pendingActivities: use?.pending ?? null, bufferedIntervals: use?.buffered ?? null, settledThrough: use?.settledThrough ?? null },
    totals: { tokens: cells(totalTokens), time: use?.total ?? null, displayed: { leafRows: kept.length, tokens: cells(displayed) } },
    omitted: { leafRows: leaves.length - kept.length, pitches: roots.size - pitches.length }, pitches, unavailableMetrics: UNAVAILABLE_METRICS, notes: NOTES,
  };
}
