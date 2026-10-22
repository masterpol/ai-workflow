import { runDirect } from "../../scripts/runtime/cli.mts";
/*
 * Records one bounded, local snapshot of agent consumption. It deliberately
 * stores identifiers and numeric usage only: never prompts, responses, or transcripts.
 */

import type { RuntimeDeps } from "../../scripts/runtime/types.mts";
import { createNodeDeps } from "../../scripts/runtime/node.mts";
import { markdown, html } from "./token-report.mts";
import { withLease } from "./metrics-lock.mts";
import { readTranscriptUsage } from "./transcript-usage.mts";
import type { MessageUsage, UsageRead } from "./transcript-usage.mts";
import type { LockOptions } from "./metrics-lock.mts";

const SNAPSHOT_NAME = "token-consumption.json";
const MARKDOWN_NAME = "token-consumption.md";
const HTML_NAME = "token-consumption.html";
const RECENT_KEYS_LIMIT = 100;
const RECENT_SKILL_KEYS_LIMIT = 50;
const AGENT_MODEL_NOTES_LIMIT = 50;
const MAX_NAME_LENGTH = 80;
const MAX_KEYS_PER_DIMENSION = 25;
const MAX_ID_LENGTH = 128;
const MAX_COST_USD = 1e6;
const SAFE_NAME = /^[\w.:/@+-]+$/;
const MODE = /^[a-z][a-z-]{0,23}$/;
const MAX_STDIN_BYTES = 1024 * 1024;
const MAX_SNAPSHOT_BYTES = 4 * 1024 * 1024;
const UNREPORTED = "(unreported)";
const UNATTRIBUTED = "(unattributed)";
const NO_SCOPE = "(none)";
// A pointer is replaced by the next phase start and otherwise ends by this sliding TTL: no hook fires when a phase finishes.
const CONTEXT_TTL_MS = 6 * 60 * 60 * 1000;
const CONTEXT_CAP = 32;
const MAX_ARGS_LENGTH = 1000;
const MAX_ARG_TOKENS = 12;
const MAX_FLOW_PITCHES = 50;
const MAX_FLOW_SCOPES = 25;
const MAX_FLOW_LEAVES = 600;
const MAX_TRANSCRIPTS = 200;
const RECENT_TRANSCRIPT_IDS = 50;
const MAX_TRANSCRIPT_PATH = 4096;
const PHASES = new Set(["shape", "shape-lite", "critique", "plan", "build", "audit", "ship", "cooldown", "fix", "resume", "switch", "checkpoint"]);
const PITCH_SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const SCOPE_TOKEN = /^S\d{1,3}$/;
const OTHER = "(other)";
// Names that would be unsafe or ambiguous as map keys are folded into OTHER, never stored.
const RESERVED_NAMES = new Set(["__proto__", "constructor", "prototype", UNREPORTED, OTHER]);
type DimensionName = "models" | "agents" | "efforts";
type DimensionField = "model" | "agentType" | "effort";
const DIMENSIONS: [DimensionName, DimensionField][] = [["models", "model"], ["agents", "agentType"], ["efforts", "effort"]];

type Plain = Record<string, unknown>;
type TokenKey = "input" | "output" | "reasoning" | "cacheRead" | "cacheWrite" | "total";
export type Tokens = Record<TokenKey, number | null>;
type TokenTotals = Record<TokenKey, number>;

export interface VendorTotals { completions: number; reportedUsageCount: number; unavailableCount: number; reportedCostUsd: number; pricedCount: number }
export interface Totals {
  agentCompletions: number;
  reportedUsageCount: number;
  unavailableCount: number;
  reportedCostUsd: number;
  reportedCostCount: number;
  tokens: TokenTotals;
  vendors: Record<string, VendorTotals>;
}
export interface Row { completions: number; reportedUsageCount: number; unavailableCount: number; tokens: number; costUsd: number; pricedCount: number }
type ByVendor<T> = Record<string, Record<string, T>>;
export interface Dimensions { since: string | null; models: ByVendor<Row>; agents: ByVendor<Row>; efforts: ByVendor<Row>; skills: ByVendor<{ uses: number }> }
export interface Routing { applied: true; models?: string; agents?: string; efforts?: string }

/** The snapshot's on-disk revision. A file with a higher revision is refused, never rewritten. */
export const SNAPSHOT_REVISION = 3;
export interface FlowRouting { applied: true; pitch: string; phase: string; scope: string }
export interface FlowPitch { at?: string; phases: Record<string, { scopes: Record<string, Record<string, Row>> }> }
export interface Flows { since: string | null; pitches: Record<string, FlowPitch> }
export interface TranscriptCursor { offset: number; size: number; ino: number; dev: number; recentIds: string[]; at: string }
export interface ActiveContext { pitch: string; phase: string; scope: string; at: string }

export interface CompletionRecord {
  id: string | null;
  identityKey: string;
  recordedAt: string;
  vendor: string;
  event: string;
  sessionId: string | null;
  turnId: string | null;
  agentId: string | null;
  agentType: string | null;
  model: string | null;
  effort: string | null;
  status: string;
  metricScope: string;
  availability: string;
  tokens: Tokens;
  costUsd: number | null;
  mode: string | null;
  dimensions: Routing | null;
  flow?: FlowRouting | null;
}

export interface Snapshot {
  schemaVersion: number;
  updatedAt: string | null;
  current: CompletionRecord | null;
  previous: CompletionRecord | null;
  lifetime: Totals;
  dimensions: Dimensions;
  recentEventKeys: string[];
  recentSkillKeys: string[];
  agentModels: Record<string, string>;
  flows: Flows;
  transcripts: Record<string, TranscriptCursor>;
  contexts: Record<string, ActiveContext>;
}

/** What the plugin and the hooks pass in. Every field is untrusted payload data. */
export interface CollectorInput {
  vendor?: unknown;
  event?: unknown;
  raw?: unknown;
  skill?: unknown;
  idempotencyKey?: unknown;
  metricScope?: unknown;
  agentId?: unknown;
  agentType?: unknown;
  sessionId?: unknown;
  turnId?: unknown;
  model?: unknown;
  effort?: unknown;
  status?: unknown;
  costUsd?: unknown;
}

export interface RecordResult {
  written: boolean;
  reason?: string;
  record?: CompletionRecord;
  launch?: boolean;
  snapshot?: Snapshot;
  warning?: string;
}

export interface RecordOptions { lock?: LockOptions }

let nodeDeps: RuntimeDeps | undefined;
/** Lazily created Node deps, so old-signature callers (the OpenCode plugin, tests) keep working unchanged. */
function defaultDeps(): RuntimeDeps {
  return (nodeDeps ??= createNodeDeps());
}

const isObject = (value: unknown): value is Plain => value !== null && typeof value === "object" && !Array.isArray(value);
// Payload fields are read the way the old JavaScript read them: a missing or non-object parent yields undefined.
const field = (value: unknown, key: string): unknown => (value !== null && value !== undefined ? (value as Plain)[key] : undefined);

function codeOf(error: unknown): string | undefined {
  if (error === null || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

const isoNow = (deps: RuntimeDeps): string => new Date(deps.clock.now()).toISOString();

// Harness numbers are bounded so one absurd value cannot overflow an aggregate or leave
// float residue that makes a later reversal look like an underflow.
function numberOrNull(value: unknown, max = 1e12): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max ? value : null;
}

// Token counts are whole numbers: a fractional count would leave float residue that makes a later
// reversal throw an underflow and lose that event.
function integerOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 1e12 ? value : null;
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// Names come from hook payloads, so they are bounded and limited to identifier characters
// before they become keys or identities. Anything else (Markdown, HTML, control characters,
// free text) is reported as (other) instead of being stored.
// A model built from absent parts ("undefined/undefined") is not a model: it is reported as unreported.
function knownModel(value: string | null): string | null {
  return value && /(^|\/)(undefined|null)(\/|$)/.test(value) ? null : value;
}

function boundedName(value: unknown): string | null {
  const text = textOrNull(value);
  if (!text) return null;
  const bounded = text.slice(0, MAX_NAME_LENGTH);
  return SAFE_NAME.test(bounded) ? bounded : OTHER;
}

// Ids are opaque, so they only get a length bound.
function boundedId(value: unknown): string | null {
  const text = textOrNull(value);
  return text ? text.slice(0, MAX_ID_LENGTH) : null;
}

// Every map keyed by a payload-controlled name has no prototype, so a name like "__proto__"
// is just a key and can never reach Object.prototype.
function nullMap<T>(source: unknown = {}): Record<string, T> {
  const map: Record<string, T> = Object.create(null);
  for (const [key, value] of Object.entries(source as object)) map[key] = value as T;
  return map;
}

function bucketKey(byName: Record<string, unknown>, name: string | null | undefined): string {
  if (!name) return UNREPORTED;
  if (RESERVED_NAMES.has(name)) return OTHER;
  if (name in byName) return name;
  const real = Object.keys(byName).filter((key) => key !== UNREPORTED && key !== OTHER).length;
  return real >= MAX_KEYS_PER_DIMENSION ? OTHER : name;
}

let catalogMode: { value: string | null } | undefined;
/** The bundle's caveman default from integrations/skill-defaults.json, read (once) only when needed, as the old lazy require did. */
function bundleDefaultMode(deps: RuntimeDeps): unknown {
  if (catalogMode) return catalogMode.value;
  const file = deps.path.join(import.meta.dirname, "..", "..", "integrations", "skill-defaults.json");
  const catalog: unknown = JSON.parse(deps.fs.readFileSync(file));
  const defaults = field(catalog, "defaults");
  // Same reads as the old `catalog.defaults?.find(...)`: a malformed catalog throws here and the caller returns null.
  const entry = defaults === undefined || defaults === null ? undefined : (defaults as unknown[]).find((item) => typeof (item as Plain).id === "string" && ((item as Plain).id as string).endsWith("/caveman"));
  const value = field(entry, "defaultMode");
  catalogMode = { value: typeof value === "string" ? value : null };
  return value;
}

// Best-effort attribution only, for this project's own reporting: never reads, invokes, or
// duplicates caveman-stats' own reporting (that skill's hook internals are unreviewed upstream
// code this project deliberately does not couple to). Reads modes.json directly rather than
// pulling in skill-defaults' full module (its skill-registry dependency is unrelated to a
// hook's own invocation shape); the bundle default is read from the same catalog JSON
// skill-defaults uses, so the fallback value is never duplicated by hand.
// modes.json legacy-window note (X8): this hook deliberately keeps the legacy .project/skills/modes.json read, not loadConfig,
// for one minor version so attribution cannot disagree with a legacy-warning window in skill-defaults; revisit when that window closes.
function currentCavemanMode(root: string, deps: RuntimeDeps): string | null {
  const { fs, path } = deps;
  try {
    const full = path.join(root, ".project", "skills", "modes.json");
    // A FIFO would block this read (while the metrics lock is held) and a huge file would be read whole:
    // only a small regular file is ever opened.
    let stat;
    try { stat = fs.lstatSync(full); } catch { return null; }
    if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 64 * 1024) return null;
    // Resolve the real path and confirm it stays under the real root — catches both the file
    // itself being a symlink and an ancestor directory (e.g. .project/skills/) being one; an
    // lstat of the leaf alone only catches the former. Best-effort: an escape or a read failure
    // here just falls through to the outer catch and returns null, never throws upward.
    const relative = path.relative(fs.realpathSync(root), fs.realpathSync(full));
    if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
    const value: unknown = JSON.parse(fs.readFileSync(full));
    const caveman = isObject(value) ? value.caveman : undefined;
    if (!isObject(caveman)) return null;
    if (caveman.enabled === false) return "off";
    // A mode is one of a few short lowercase words; anything else in modes.json (a project file) is not stored.
    const mode = (candidate: unknown): string | null => (typeof candidate === "string" && MODE.test(candidate.trim()) ? candidate.trim() : null);
    const explicit = textOrNull(caveman.default);
    if (explicit) return mode(explicit);
    return mode(textOrNull(bundleDefaultMode(deps)));
  } catch {
    return null;
  }
}

function tokensFrom(raw: unknown = {}): Tokens {
  const cache = field(raw, "cache") || {};
  const pick = (first: unknown, second: unknown): unknown => first ?? second;
  const tokens = {
    input: integerOrNull(pick(field(raw, "input"), field(raw, "input_tokens"))),
    output: integerOrNull(pick(field(raw, "output"), field(raw, "output_tokens"))),
    reasoning: integerOrNull(pick(field(raw, "reasoning"), field(raw, "reasoning_tokens"))),
    cacheRead: integerOrNull(pick(field(cache, "read"), field(raw, "cache_read_input_tokens"))),
    cacheWrite: integerOrNull(pick(field(cache, "write"), field(raw, "cache_creation_input_tokens"))),
  };
  const reported = [tokens.input, tokens.output, tokens.reasoning].filter((value): value is number => value !== null);
  return { ...tokens, total: reported.length > 0 ? reported.reduce((sum, value) => sum + value, 0) : null };
}

function blankTotals(): Totals {
  return {
    agentCompletions: 0,
    reportedUsageCount: 0,
    unavailableCount: 0,
    reportedCostUsd: 0,
    reportedCostCount: 0,
    tokens: { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    vendors: nullMap(),
  };
}

function blankDimensions(since: string | null = null): Dimensions {
  return { since, models: nullMap(), agents: nullMap(), efforts: nullMap(), skills: nullMap() };
}

function blankFlows(since: string | null = null): Flows {
  return { since, pitches: nullMap() };
}

export function blankSnapshot(): Snapshot {
  return {
    schemaVersion: SNAPSHOT_REVISION,
    updatedAt: null,
    current: null,
    previous: null,
    lifetime: blankTotals(),
    dimensions: blankDimensions(),
    recentEventKeys: [],
    recentSkillKeys: [],
    agentModels: nullMap(),
    flows: blankFlows(),
    transcripts: nullMap(),
    contexts: nullMap(),
  };
}

function addNumber(target: TokenTotals, key: TokenKey, value: number | null, direction: number): void {
  if (value !== null) target[key] = Math.max(0, target[key] + value * direction);
}

function applyRecord(totals: Totals, record: CompletionRecord, direction: number): void {
  totals.agentCompletions = Math.max(0, totals.agentCompletions + direction);
  if (record.tokens.total === null) {
    totals.unavailableCount = Math.max(0, totals.unavailableCount + direction);
  } else {
    totals.reportedUsageCount = Math.max(0, totals.reportedUsageCount + direction);
    for (const key of Object.keys(totals.tokens) as TokenKey[]) addNumber(totals.tokens, key, record.tokens[key], direction);
  }
  if (record.costUsd !== null) {
    totals.reportedCostCount = Math.max(0, totals.reportedCostCount + direction);
    totals.reportedCostUsd = Math.max(0, totals.reportedCostUsd + record.costUsd * direction);
  }

  const vendor = (totals.vendors[record.vendor] ||= { completions: 0, reportedUsageCount: 0, unavailableCount: 0, reportedCostUsd: 0, pricedCount: 0 });
  vendor.completions = Math.max(0, vendor.completions + direction);
  if (record.tokens.total === null) vendor.unavailableCount = Math.max(0, vendor.unavailableCount + direction);
  else vendor.reportedUsageCount = Math.max(0, vendor.reportedUsageCount + direction);
  if (record.costUsd !== null) vendor.reportedCostUsd = Math.max(0, vendor.reportedCostUsd + record.costUsd * direction);
  // A reported cost of 0 (an unpriced or subscription message) is not evidence of a free run.
  if (record.costUsd) vendor.pricedCount = Math.max(0, vendor.pricedCount + direction);
}

function blankRow(): Row {
  return { completions: 0, reportedUsageCount: 0, unavailableCount: 0, tokens: 0, costUsd: 0, pricedCount: 0 };
}

// Unlike the lifetime totals above, dimension rows are never clamped: an over-subtraction means
// a record was reversed that was never applied, and that has to fail loudly instead of hiding.
function applyToRow(byName: Record<string, Row>, key: string, record: CompletionRecord, direction: number): void {
  if (direction < 0 && !byName[key]) throw new Error(`dimension aggregate underflow: ${key}`);
  const row = (byName[key] ||= blankRow());
  row.completions += direction;
  if (record.tokens.total === null) row.unavailableCount += direction;
  else {
    row.reportedUsageCount += direction;
    row.tokens += record.tokens.total * direction;
  }
  if (record.costUsd) {
    row.pricedCount += direction;
    row.costUsd += record.costUsd * direction;
  }
  if (row.costUsd < 0 && row.costUsd > -1e-6) row.costUsd = 0;
  if ([row.completions, row.reportedUsageCount, row.unavailableCount, row.tokens, row.pricedCount, row.costUsd].some((value) => value < 0)) {
    throw new Error(`dimension aggregate underflow: ${key}`);
  }
  if (row.completions === 0) delete byName[key];
}

// Adding stores the routing on the record; reversing reuses that stored routing, so a record
// that went to (other) under an earlier cap is removed from (other), and a record recorded
// before dimensions existed (no `applied` flag) is skipped instead of subtracted.
function applyDimensions(dimensions: Dimensions, record: CompletionRecord, direction: number): void {
  if (direction < 0 && !record.dimensions?.applied) return;
  if (direction > 0) record.dimensions = { applied: true };
  const routing = record.dimensions as Routing;
  for (const [name, fieldName] of DIMENSIONS) {
    const byName = (dimensions[name][record.vendor] ||= nullMap<Row>());
    if (direction > 0) routing[name] = bucketKey(byName, record[fieldName]);
    applyToRow(byName, routing[name] as string, record, direction);
    if (Object.keys(byName).length === 0) delete dimensions[name][record.vendor];
  }
}


// ---- Flows: pitch > phase > scope > vendor rows, stamped on the record so reversal never re-resolves ----

const FLOW_PHASES = new Set([...PHASES, UNATTRIBUTED, OTHER]);
const leafCount = (flows: Flows): number => Object.values(flows.pitches).reduce((sum, pitch) => sum + Object.values(pitch.phases).reduce((inner, phase) => inner + Object.values(phase.scopes).reduce((leaves, byVendor) => leaves + Object.keys(byVendor).length, 0), 0), 0);

function mergeRow(target: Record<string, Row>, vendor: string, row: Row): void {
  const into = (target[vendor] ||= blankRow());
  into.completions += row.completions;
  into.reportedUsageCount += row.reportedUsageCount;
  into.unavailableCount += row.unavailableCount;
  into.tokens += row.tokens;
  into.costUsd += row.costUsd;
  into.pricedCount += row.pricedCount;
}

function flowContainers(flows: Flows, pitch: string, phase: string, scope: string): Record<string, Row> {
  const entry = (flows.pitches[pitch] ||= { phases: nullMap() });
  const scopes = (entry.phases[phase] ||= { scopes: nullMap() }).scopes;
  return (scopes[scope] ||= nullMap<Row>());
}

function pruneFlow(flows: Flows, pitch: string, phase: string, scope: string): void {
  const entry = flows.pitches[pitch];
  const scopes = entry?.phases[phase]?.scopes;
  if (scopes === undefined) return;
  if (scopes[scope] && Object.keys(scopes[scope]).length === 0) delete scopes[scope];
  if (Object.keys(scopes).length === 0) delete entry.phases[phase];
  if (Object.keys(entry.phases).length === 0) delete flows.pitches[pitch];
}

// A row that the current or previous record routes to must stay, or reversing that record would underflow.
const routedTo = (snapshot: Snapshot, pitch: string, phase?: string, scope?: string): boolean => [snapshot.current, snapshot.previous]
  .some((record) => record?.flow?.applied === true && record.flow.pitch === pitch && (phase === undefined || record.flow.phase === phase) && (scope === undefined || record.flow.scope === scope));

function foldPitch(flows: Flows, name: string): void {
  const entry = flows.pitches[name];
  for (const [phase, { scopes }] of Object.entries(entry.phases)) {
    for (const [scope, byVendor] of Object.entries(scopes)) {
      const target = flowContainers(flows, OTHER, phase, scope);
      for (const [vendor, row] of Object.entries(byVendor)) mergeRow(target, vendor, row);
    }
  }
  delete flows.pitches[name];
}

function foldScope(flows: Flows, pitch: string, phase: string, scope: string): void {
  const scopes = flows.pitches[pitch].phases[phase].scopes;
  const target = (scopes[OTHER] ||= nullMap<Row>());
  for (const [vendor, row] of Object.entries(scopes[scope])) mergeRow(target, vendor, row);
  delete scopes[scope];
}

const leastRecentPitch = (snapshot: Snapshot): string | undefined => Object.entries(snapshot.flows.pitches)
  .filter(([name]) => name !== OTHER && !routedTo(snapshot, name))
  .sort((left, right) => Date.parse(left[1].at ?? "") - Date.parse(right[1].at ?? ""))[0]?.[0];

// Caps hide nothing: the least recently used row that no stored record routes to is folded into (other), counters added.
function resolveFlow(snapshot: Snapshot, intended: PhaseContext, vendor: string): FlowRouting {
  const { flows } = snapshot;
  let pitch = intended.pitch;
  const phase = FLOW_PHASES.has(intended.phase) ? intended.phase : OTHER;
  let scope = intended.scope;
  const named = (): number => Object.keys(flows.pitches).filter((name) => name !== OTHER).length;
  while (flows.pitches[pitch] === undefined && pitch !== OTHER && named() >= MAX_FLOW_PITCHES) {
    const oldest = leastRecentPitch(snapshot);
    if (oldest === undefined) { pitch = OTHER; break; }
    foldPitch(flows, oldest);
  }
  const scopes = flows.pitches[pitch]?.phases[phase]?.scopes;
  if (scopes !== undefined && scopes[scope] === undefined && scope !== OTHER) {
    while (Object.keys(scopes).filter((name) => name !== OTHER).length >= MAX_FLOW_SCOPES) {
      const oldest = Object.keys(scopes).find((name) => name !== OTHER && !routedTo(snapshot, pitch, phase, name));
      if (oldest === undefined) { scope = OTHER; break; }
      foldScope(flows, pitch, phase, oldest);
    }
  }
  const exists = flows.pitches[pitch]?.phases[phase]?.scopes[scope]?.[vendor] !== undefined;
  while (!exists && leafCount(flows) >= MAX_FLOW_LEAVES) {
    const oldest = leastRecentPitch(snapshot);
    if (oldest === undefined || oldest === pitch) { pitch = OTHER; scope = OTHER; break; }
    foldPitch(flows, oldest);
  }
  return { applied: true, pitch, phase, scope };
}

// Adding stores the routing on the record (after caps); reversing reuses it. A record without `flow.applied`
// (recorded before revision 3, or inherited from such a record) is skipped, never subtracted.
function applyFlows(snapshot: Snapshot, record: CompletionRecord, direction: number, intended?: PhaseContext): void {
  const { flows } = snapshot;
  if (direction < 0) {
    if (record.flow?.applied !== true) return;
    const { pitch, phase, scope } = record.flow;
    const byVendor = flows.pitches[pitch]?.phases[phase]?.scopes[scope];
    if (byVendor === undefined || byVendor[record.vendor] === undefined) throw new Error(`flow aggregate underflow: ${pitch}`);
    applyToRow(byVendor, record.vendor, record, -1);
    pruneFlow(flows, pitch, phase, scope);
    return;
  }
  if (record.flow?.applied !== true) {
    if (intended === undefined) return;
    record.flow = resolveFlow(snapshot, intended, record.vendor);
  }
  const { pitch, phase, scope } = record.flow as FlowRouting;
  const scopes = flowContainers(flows, pitch, phase, scope);
  applyToRow(scopes, record.vendor, record, 1);
  // Move-to-end keeps scope insertion order as recency; the pitch carries an explicit timestamp.
  const owner = flows.pitches[pitch].phases[phase].scopes;
  const moved = owner[scope];
  delete owner[scope];
  owner[scope] = moved;
  flows.pitches[pitch].at = record.recordedAt;
}

export function applyToSnapshot(snapshot: Snapshot, record: CompletionRecord, direction: number, intended?: PhaseContext): void {
  applyRecord(snapshot.lifetime, record, direction);
  applyDimensions(snapshot.dimensions, record, direction);
  applyFlows(snapshot, record, direction, intended);
}

export interface PhaseContext { pitch: string; phase: string; scope: string }
interface PhaseStart extends PhaseContext { sessionId: string }

function isRealPitchDirectory(root: string, slug: string, deps: RuntimeDeps): boolean {
  const target = deps.path.join(root, ".project", "pitches", slug);
  try {
    const stat = deps.fs.lstatSync(target);
    return !stat.isSymbolicLink() && stat.isDirectory() && staysUnderRoot(root, target, deps);
  } catch { return false; }
}

/**
 * Pure of side effects: maps a command or skill name and its argument text to the pitch, phase and scope it starts.
 * Returns null unless the name is one of the closed phase names. Only validated tokens are returned; the rest of the
 * argument text is dropped. The pitch is the first argument when it names a real pitch directory, else (unattributed).
 */
export function resolvePhaseContext(name: unknown, args: unknown, root: string, deps: RuntimeDeps = defaultDeps()): PhaseContext | null {
  if (typeof name !== "string" || name.length > MAX_NAME_LENGTH) return null;
  const phase = name.replace(/^[/$]/, "").toLowerCase();
  if (!PHASES.has(phase)) return null;
  const tokens = typeof args === "string" ? args.slice(0, MAX_ARGS_LENGTH).split(/\s+/).filter(Boolean).slice(0, MAX_ARG_TOKENS) : [];
  const first = tokens[0];
  const pitch = first !== undefined && PITCH_SLUG.test(first) && isRealPitchDirectory(root, first, deps) ? first : UNATTRIBUTED;
  const scope = tokens.find((token) => SCOPE_TOKEN.test(token)) ?? NO_SCOPE;
  return { pitch, phase, scope };
}

// The hook payload of a slash command (UserPromptExpansion) or a skill call. A subagent's own calls carry agent_id and
// never replace the parent's pointer.
function phaseStartOf(input: CollectorInput, root: string, deps: RuntimeDeps): PhaseStart | null {
  const raw = input.raw || input;
  if (field(raw, "agent_id") || input.agentId) return null;
  const expansion = field(raw, "expansion_type");
  if (expansion !== undefined && expansion !== "slash_command") return null;
  const toolInput = field(raw, "tool_input");
  const name = textOrNull(input.skill) ?? field(toolInput, "skill") ?? field(toolInput, "name") ?? field(raw, "command_name");
  const args = field(toolInput, "args") ?? field(raw, "command_args");
  const sessionId = boundedId(input.sessionId) || boundedId(field(raw, "session_id")) || boundedId(field(raw, "sessionId"));
  const context = resolvePhaseContext(name, args, root, deps);
  return context && sessionId ? { ...context, sessionId } : null;
}

function contextLive(context: ActiveContext, now: number): boolean {
  const at = Date.parse(context.at);
  return Number.isFinite(at) && now - at <= CONTEXT_TTL_MS;
}

/** The session's pointer, or null when it has none or it is older than the TTL. */
export function activeContext(snapshot: Snapshot, sessionId: string | null, now: number): ActiveContext | null {
  const context = sessionId === null ? undefined : snapshot.contexts[sessionId];
  return context !== undefined && contextLive(context, now) ? context : null;
}

// Expired pointers go first, then the least recently touched one; a full map never refuses the event.
function makeRoom(contexts: Record<string, ActiveContext>, now: number): void {
  for (const [key, context] of Object.entries(contexts)) if (!contextLive(context, now)) delete contexts[key];
  while (Object.keys(contexts).length >= CONTEXT_CAP) {
    const oldest = Object.entries(contexts).sort((left, right) => Date.parse(left[1].at) - Date.parse(right[1].at))[0];
    delete contexts[oldest[0]];
  }
}

function setContext(snapshot: Snapshot, start: PhaseStart, deps: RuntimeDeps): boolean {
  const now = deps.clock.now();
  const existing = snapshot.contexts[start.sessionId];
  if (start.phase === "checkpoint") {
    if (existing === undefined || !contextLive(existing, now)) return false;
    existing.at = isoNow(deps);
    return true;
  }
  if (existing === undefined) makeRoom(snapshot.contexts, now);
  snapshot.contexts[start.sessionId] = { pitch: start.pitch, phase: start.phase, scope: start.scope, at: isoNow(deps) };
  return true;
}

function recordSkillUse(snapshot: Snapshot, input: CollectorInput, deps: RuntimeDeps): RecordResult {
  const raw = input.raw || input;
  const toolInput = field(raw, "tool_input");
  const skill = boundedName(input.skill) || boundedName(field(toolInput, "skill")) || boundedName(field(toolInput, "name"));
  if (!skill) return { written: false, reason: "skill name unavailable" };
  const vendor = boundedName(input.vendor) || "unknown";
  const key = boundedId(input.idempotencyKey) || boundedId(field(raw, "tool_use_id")) || boundedId(field(raw, "toolUseId"));
  const id = key ? `${vendor}:${key}` : null;
  if (id && snapshot.recentSkillKeys.includes(id)) return { written: false, reason: "duplicate event" };
  const byName = (snapshot.dimensions.skills[vendor] ||= nullMap<{ uses: number }>());
  const bucket = bucketKey(byName, skill);
  (byName[bucket] ||= { uses: 0 }).uses += 1;
  if (id) snapshot.recentSkillKeys = [id, ...snapshot.recentSkillKeys].slice(0, RECENT_SKILL_KEYS_LIMIT);
  snapshot.updatedAt = isoNow(deps);
  return { written: true };
}

export function normalizedEvent(input: CollectorInput, root?: string, deps: RuntimeDeps = defaultDeps()): CompletionRecord {
  const base = root === undefined ? deps.proc.cwd() : root;
  const vendor = boundedName(input.vendor) || "unknown";
  const raw = input.raw || input;
  const toolResponse = field(raw, "tool_response");
  const toolInput = field(raw, "tool_input");
  const usage = field(raw, "usage") || field(toolResponse, "usage") || field(field(toolResponse, "result"), "usage") || field(raw, "tokens") || {};
  const tokens = tokensFrom(usage);
  const scope = textOrNull(input.metricScope) || (vendor === "claude" && tokens.total !== null ? "final_request" : tokens.total !== null ? "agent_total" : "completion");
  const availability = tokens.total === null ? "unavailable" : scope === "agent_total" ? "reported" : "partial";
  const agentId = boundedId(input.agentId) || boundedId(field(raw, "agent_id")) || boundedId(field(raw, "agentId")) || boundedId(field(toolResponse, "agentId"));
  const event = boundedName(input.event) || boundedName(field(raw, "hook_event_name")) || "agent-complete";
  // A main-session Stop is one completion of agentType primary, never an upgrade of an earlier one.
  const agentType = boundedName(input.agentType) || boundedName(field(raw, "agent_type")) || boundedName(field(raw, "agentType")) || boundedName(field(toolInput, "subagent_type")) || (event === "session-turn" ? "primary" : null);
  const sessionId = boundedId(input.sessionId) || boundedId(field(raw, "session_id")) || boundedId(field(raw, "sessionId"));
  const turnId = boundedId(input.turnId) || boundedId(field(raw, "turn_id")) || boundedId(field(raw, "turnId"));
  const model = knownModel(boundedName(input.model) || boundedName(field(raw, "model")) || boundedName(field(raw, "resolvedModel")) || boundedName(field(toolResponse, "resolvedModel")));
  const effort = boundedName(input.effort) || boundedName(field(field(raw, "effort"), "level")) || boundedName(field(raw, "effort")) || boundedName(field(raw, "variant"));
  const idempotencyKey =
    boundedId(input.idempotencyKey) ||
    boundedId(field(raw, "message_id")) ||
    boundedId(field(raw, "messageId")) ||
    boundedId(field(raw, "tool_use_id")) ||
    boundedId(field(raw, "toolUseId"));
  const completionKey = idempotencyKey ? ["event", idempotencyKey] : event === "subagent-complete" && agentId ? ["subagent", sessionId, agentId, event] : null;
  const identity = idempotencyKey ? ["event", idempotencyKey] : event === "session-turn" ? ["turn", sessionId, deps.crypto.randomUUID()] : event === "subagent-complete" && !agentId ? ["anonymous", deps.crypto.randomUUID()] : sessionId ? ["session", sessionId, agentId, agentType, turnId] : agentId ? ["agent", agentId] : ["fallback", agentType, model, turnId];
  const identityKey = JSON.stringify([vendor, ...identity]);
  return {
    id: completionKey ? JSON.stringify([vendor, ...completionKey]) : null,
    identityKey,
    recordedAt: isoNow(deps),
    vendor,
    event,
    sessionId,
    turnId,
    agentId,
    agentType,
    model,
    effort,
    status: boundedName(input.status) || boundedName(field(raw, "stop_reason")) || boundedName(field(toolResponse, "status")) || "completed",
    metricScope: scope,
    availability,
    tokens,
    costUsd: numberOrNull(input.costUsd ?? field(raw, "cost") ?? field(raw, "cost_usd"), MAX_COST_USD),
    mode: currentCavemanMode(base, deps),
    dimensions: null,
  };
}

// Loaded JSON objects keyed by payload names are copied into prototype-free maps before use.
function reviveMaps(snapshot: Snapshot): Snapshot {
  snapshot.lifetime.vendors = nullMap(snapshot.lifetime.vendors);
  for (const vendor of Object.values(snapshot.lifetime.vendors)) vendor.pricedCount ??= 0;
  const dimensions: Partial<Dimensions> = snapshot.dimensions || {};
  const revived = { since: dimensions.since ?? null } as Dimensions;
  for (const name of ["models", "agents", "efforts", "skills"] as const) {
    const target: Record<string, Record<string, unknown>> = nullMap();
    for (const [vendor, byName] of Object.entries(dimensions[name] || {})) target[vendor] = nullMap(byName);
    (revived as unknown as Record<string, unknown>)[name] = target;
  }
  snapshot.dimensions = revived;
  snapshot.recentSkillKeys = Array.isArray(snapshot.recentSkillKeys) ? snapshot.recentSkillKeys : [];
  snapshot.agentModels = nullMap(snapshot.agentModels);
  const flows = blankFlows(snapshot.flows?.since ?? null);
  for (const [pitch, byPhase] of Object.entries(snapshot.flows?.pitches || {})) {
    const phases: Record<string, { scopes: Record<string, Record<string, Row>> }> = nullMap();
    for (const [phase, entry] of Object.entries(byPhase.phases || {})) {
      const scopes: Record<string, Record<string, Row>> = nullMap();
      for (const [scope, byVendor] of Object.entries(entry.scopes || {})) scopes[scope] = nullMap(byVendor);
      phases[phase] = { scopes };
    }
    flows.pitches[pitch] = { ...(typeof byPhase.at === "string" ? { at: byPhase.at } : {}), phases };
  }
  snapshot.flows = flows;
  snapshot.transcripts = nullMap(snapshot.transcripts);
  snapshot.contexts = nullMap(snapshot.contexts);
  return snapshot;
}

const isCount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const TOKEN_KEYS: TokenKey[] = ["input", "output", "reasoning", "cacheRead", "cacheWrite", "total"];
const isCountOrNull = (value: unknown): boolean => value === null || isCount(value);
const isStoredRecord = (record: unknown): boolean => record === null
  || (isObject(record) && typeof record.identityKey === "string" && typeof record.vendor === "string"
    && isObject(record.tokens) && TOKEN_KEYS.every((key) => isCountOrNull((record.tokens as Plain)[key]))
    && (record.costUsd === undefined || isCountOrNull(record.costUsd))
    && (record.dimensions == null || (isObject(record.dimensions) && ["models", "agents", "efforts"].every((name) => (record.dimensions as Plain)[name] === undefined || typeof (record.dimensions as Plain)[name] === "string"))));
// Rows are read back, added to and reversed later; a row with a missing or negative counter would turn into NaN
// (saved as null), the next read would reject the whole file, and every earlier total would be replaced by a blank one.
const DIMENSION_ROW_FIELDS = ["completions", "reportedUsageCount", "unavailableCount", "tokens", "costUsd", "pricedCount"];
const hasFields = (row: unknown, fields: string[]): boolean => isObject(row) && fields.every((key) => isCount(row[key]));
function validDimensions(dimensions: unknown): boolean {
  if (dimensions === undefined) return true;
  if (!isObject(dimensions)) return false;
  return ["models", "agents", "efforts", "skills"].every((name) => {
    const byVendor = dimensions[name];
    if (byVendor === undefined) return true;
    if (!isObject(byVendor)) return false;
    const fields = name === "skills" ? ["uses"] : DIMENSION_ROW_FIELDS;
    return Object.values(byVendor).every((byName) => isObject(byName) && Object.values(byName).every((row) => hasFields(row, fields)));
  });
}
// Flow rows are nested pitch > phase > scope > vendor, so no string join can make two tuples collide.
function validFlows(flows: unknown): boolean {
  if (flows === undefined) return true;
  if (!isObject(flows) || (flows.since != null && typeof flows.since !== "string") || !isObject(flows.pitches)) return false;
  return Object.values(flows.pitches).every((pitch) => isObject(pitch) && isObject(pitch.phases) && (pitch.at === undefined || typeof pitch.at === "string")
    && Object.values(pitch.phases).every((phase) => isObject(phase) && isObject(phase.scopes)
      && Object.values(phase.scopes).every((byVendor) => isObject(byVendor) && Object.values(byVendor).every((row) => hasFields(row, DIMENSION_ROW_FIELDS)))));
}
const isText = (value: unknown): value is string => typeof value === "string";
function validContexts(contexts: unknown): boolean {
  if (contexts === undefined) return true;
  return isObject(contexts) && Object.values(contexts).every((entry) => isObject(entry) && ["pitch", "phase", "scope", "at"].every((key) => isText(entry[key])));
}
function validTranscripts(transcripts: unknown): boolean {
  if (transcripts === undefined) return true;
  return isObject(transcripts) && Object.values(transcripts).every((entry) => isObject(entry) && ["offset", "size", "ino", "dev"].every((key) => isCount(entry[key]))
    && Array.isArray(entry.recentIds) && entry.recentIds.every(isText) && isText(entry.at));
}
const isStoredFlow = (flow: unknown): boolean => flow == null || (isObject(flow) && typeof flow.applied === "boolean" && ["pitch", "phase", "scope"].every((key) => isText(flow[key])));
// A stored record's routing is reversed by name later: a name with no matching row would throw on every event.
function routingResolves(snapshot: Plain, record: unknown): boolean {
  const flow = field(record, "flow");
  if (field(flow, "applied")) {
    const scopes = field(field(field(field(snapshot.flows, "pitches"), field(flow, "pitch") as string), "phases"), field(flow, "phase") as string);
    if (!hasFields(field(field(field(scopes, "scopes"), field(flow, "scope") as string), field(record, "vendor") as string), DIMENSION_ROW_FIELDS)) return false;
  }
  const routing = field(record, "dimensions");
  if (!field(routing, "applied")) return true;
  const vendor = field(record, "vendor") as string;
  return ["models", "agents", "efforts"].every((name) => hasFields(field(field(field(snapshot.dimensions, name), vendor), field(routing, name) as string), DIMENSION_ROW_FIELDS));
}
// A well-formed JSON file with the wrong shape must not be accepted: the collector would throw on every
// later event (and the reports would never regenerate) until someone deleted the file by hand.
function usableShape(snapshot: unknown): boolean {
  if (!isObject(snapshot) || !isObject(snapshot.lifetime) || !Array.isArray(snapshot.recentEventKeys)) return false;
  const lifetime = snapshot.lifetime;
  if (!["agentCompletions", "reportedUsageCount", "unavailableCount"].every((key) => isCount(lifetime[key]))) return false;
  const tokens = lifetime.tokens;
  if (!isObject(tokens) || !TOKEN_KEYS.every((key) => isCount(tokens[key]))) return false;
  if (["reportedCostUsd", "reportedCostCount"].some((key) => lifetime[key] !== undefined && !isCount(lifetime[key]))) return false;
  if (lifetime.vendors !== undefined && !isObject(lifetime.vendors)) return false;
  if (Object.values(lifetime.vendors || {}).some((vendor) => !hasFields(vendor, ["completions", "reportedUsageCount", "unavailableCount", "reportedCostUsd"]) || ((vendor as Plain).pricedCount !== undefined && !isCount((vendor as Plain).pricedCount)))) return false;
  if (!validDimensions(snapshot.dimensions) || !validFlows(snapshot.flows) || !validContexts(snapshot.contexts) || !validTranscripts(snapshot.transcripts)) return false;
  const agentModels = snapshot.agentModels;
  if (agentModels !== undefined && (!isObject(agentModels) || Object.values(agentModels).some((note) => typeof note !== "string"))) return false;
  return isStoredRecord(snapshot.current ?? null) && isStoredRecord(snapshot.previous ?? null)
    && isStoredFlow(field(snapshot.current, "flow")) && isStoredFlow(field(snapshot.previous, "flow"))
    && routingResolves(snapshot, snapshot.current) && routingResolves(snapshot, snapshot.previous);
}

interface Loaded { snapshot?: Snapshot; skip?: string; rejectedText?: string }

// Returns { snapshot } or { skip: reason }. Absent, unparseable, or wrongly shaped means "start blank";
// a snapshot that is not a plain file, is huge, or is from a NEWER schema is refused and never overwritten.
function readSnapshot(snapshotPath: string, deps: RuntimeDeps): Loaded {
  const { fs } = deps;
  let stat;
  try { stat = fs.lstatSync(snapshotPath); } catch (error) {
    return codeOf(error) === "ENOENT" ? { snapshot: blankSnapshot() } : { skip: `snapshot cannot be inspected (${codeOf(error) || "error"})` };
  }
  if (stat.isSymbolicLink() || !stat.isFile()) return { skip: "snapshot is a symlink or not a regular file; not read or overwritten" };
  if (stat.size > MAX_SNAPSHOT_BYTES) return { skip: "snapshot is larger than 4 MB; not read or overwritten" };
  try {
    const raw = fs.readFileSync(snapshotPath);
    const snapshot: unknown = JSON.parse(raw);
    if (isObject(snapshot) && Number.isInteger(snapshot.schemaVersion) && (snapshot.schemaVersion as number) > SNAPSHOT_REVISION) return { skip: `snapshot schemaVersion ${snapshot.schemaVersion} is newer than this collector understands; not overwritten` };
    const usable = usableShape(snapshot);
    // A parseable file that fails validation is replaced by a blank snapshot, but never silently lost: its text is kept aside.
    if (!usable && isObject(snapshot)) return { snapshot: blankSnapshot(), rejectedText: raw };
    // v1 predates the dimension aggregates: keep its lifetime totals and start the dimensions now.
    // Its stored records carry no `dimensions.applied` flag, so reversing one never touches them.
    try {
      const valid = snapshot as Snapshot;
      // Each step only appends: revision 2 added dimensions, revision 3 adds flows, transcripts and contexts.
      if (usable && valid.schemaVersion === 1) return { snapshot: reviveMaps({ ...valid, schemaVersion: SNAPSHOT_REVISION, dimensions: blankDimensions(isoNow(deps)), flows: blankFlows(isoNow(deps)), transcripts: nullMap(), contexts: nullMap() }) };
      if (usable && valid.schemaVersion === 2) return { snapshot: reviveMaps({ ...valid, schemaVersion: SNAPSHOT_REVISION, flows: blankFlows(isoNow(deps)), transcripts: nullMap(), contexts: nullMap() }) };
      if (usable && valid.schemaVersion === SNAPSHOT_REVISION) return { snapshot: reviveMaps(valid) };
    } catch { return { snapshot: blankSnapshot(), rejectedText: raw }; } // validated, but still unrevivable: keep it aside too
  } catch {
    // A malformed local metrics file must not break an agent completion hook.
  }
  return { snapshot: blankSnapshot() };
}

function hex(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += byte.toString(16).padStart(2, "0");
  return text;
}

function writeAtomically(target: string, content: string, deps: RuntimeDeps): void {
  // "wx" refuses an existing path (including a pre-planted symlink); the random suffix makes one unguessable.
  const temporary = `${target}.${deps.proc.pid}.${hex(deps.crypto.randomBytes(6))}.tmp`;
  try {
    deps.fs.writeFileSync(temporary, content, { mode: 0o600, flag: "wx" });
    deps.fs.renameSync(temporary, target);
  } finally { deps.fs.rmSync(temporary, { force: true }); }
}

// The pathname lock that earlier collectors used. Its presence means an old writer may still be running
// (or crashed and left it): the new protocol cannot exclude that writer, so the event is skipped until an
// operator has stopped every old collector and removed the file. It is never reclaimed automatically.
const LEGACY_LOCK_NAME = ".token-consumption.lock";

function legacyLockPresent(directory: string, deps: RuntimeDeps): boolean {
  try { deps.fs.lstatSync(deps.path.join(directory, LEGACY_LOCK_NAME)); return true; } catch (error) { return codeOf(error) !== "ENOENT"; }
}

// An async Claude subagent fires PostToolUse(Agent) at launch, not completion, so that event is
// not a completion: it only leaves a model note for the SubagentStop that follows, which has none.
function rememberAgentModel(snapshot: Snapshot, record: CompletionRecord): void {
  if (record.agentId && record.model) snapshot.agentModels[`agent:${record.vendor}:${record.agentId}`] = record.model;
  const ids = Object.keys(snapshot.agentModels);
  while (ids.length > AGENT_MODEL_NOTES_LIMIT) delete snapshot.agentModels[ids.shift() as string];
}


// ---- Transcript usage (Claude): read before the lease, reconcile and commit under it ----

interface TranscriptRead { key: string; result: UsageRead }

const usageEvents = new Set(["subagent-complete", "session-turn"]);

// Runs without the lease, from the offset in an unlocked read. Only numbers and bounded ids come back from the reader.
function readTranscript(input: CollectorInput, snapshotPath: string, deps: RuntimeDeps): TranscriptRead | null {
  const raw = input.raw || input;
  const event = textOrNull(input.event);
  if (boundedName(input.vendor) !== "claude" || event === null || !usageEvents.has(event)) return null;
  const file = field(raw, event === "subagent-complete" ? "agent_transcript_path" : "transcript_path");
  if (typeof file !== "string" || file.length === 0 || file.length > MAX_TRANSCRIPT_PATH) return null;
  let key: string;
  try { key = deps.crypto.sha256Hex(deps.fs.realpathSync(file)); } catch { key = deps.crypto.sha256Hex(file); }
  const cursor = readSnapshot(snapshotPath, deps).snapshot?.transcripts[key];
  const result = readTranscriptUsage(file, deps, {
    ...(cursor !== undefined ? { previous: { offset: cursor.offset, ino: cursor.ino, dev: cursor.dev }, recentIds: cursor.recentIds } : {}),
    final: event === "subagent-complete",
  });
  return { key, result };
}

const sumCounts = (values: (number | null)[]): number | null => {
  const counts = values.map(integerOrNull).filter((value): value is number => value !== null);
  return counts.length > 0 ? counts.reduce((sum, value) => sum + value, 0) : null;
};

/** Sums reader output. Each value is re-validated here, whatever the reader promised: a fractional, negative or huge value counts as unreported. */
export function transcriptTokens(messages: readonly Pick<MessageUsage, "input" | "output" | "cacheRead" | "cacheWrite">[]): Tokens {
  return tokensFrom({
    input_tokens: sumCounts(messages.map((message) => message.input)),
    output_tokens: sumCounts(messages.map((message) => message.output)),
    cache_read_input_tokens: sumCounts(messages.map((message) => message.cacheRead)),
    cache_creation_input_tokens: sumCounts(messages.map((message) => message.cacheWrite)),
  });
}

// Under the lease: only messages past the locked offset and not in the locked id window count; the offset, ids and
// totals then commit in the one atomic write. Returns false when nothing new was read.
function applyTranscript(snapshot: Snapshot, transcript: TranscriptRead, record: CompletionRecord, deps: RuntimeDeps): boolean {
  if (transcript.result.status !== "ok") return false;
  const { messages, position, size } = transcript.result;
  const cursor = snapshot.transcripts[transcript.key];
  const sameFile = cursor !== undefined && cursor.ino === position.ino && cursor.dev === position.dev && cursor.offset <= size;
  const locked = sameFile ? cursor.offset : 0;
  const known = new Set(cursor?.recentIds ?? []);
  const fresh = messages.filter((message) => message.endOffset > locked && !known.has(message.messageId));
  const now = isoNow(deps);
  snapshot.transcripts[transcript.key] = {
    offset: sameFile ? Math.max(locked, position.offset) : position.offset,
    size,
    ino: position.ino,
    dev: position.dev,
    recentIds: [...new Set([...fresh.map((message) => message.messageId), ...(cursor?.recentIds ?? [])])].slice(0, RECENT_TRANSCRIPT_IDS),
    at: now,
  };
  const keys = Object.keys(snapshot.transcripts);
  while (keys.length > MAX_TRANSCRIPTS) {
    const oldest = keys.sort((left, right) => Date.parse(snapshot.transcripts[left].at) - Date.parse(snapshot.transcripts[right].at))[0];
    delete snapshot.transcripts[oldest];
    keys.splice(keys.indexOf(oldest), 1);
  }
  if (fresh.length === 0) return false;
  record.tokens = transcriptTokens(fresh);
  // The cost stays null (shown as Unpriced): the transcript has token counts, never a price.
  record.metricScope = "agent_total";
  record.availability = record.tokens.total === null ? "unavailable" : "reported";
  record.model ||= knownModel(boundedName(fresh[fresh.length - 1].model));
  return true;
}

const flowIntent = (snapshot: Snapshot, record: CompletionRecord, deps: RuntimeDeps): PhaseContext => {
  const context = activeContext(snapshot, record.sessionId, deps.clock.now());
  return context === null ? { pitch: UNATTRIBUTED, phase: UNATTRIBUTED, scope: NO_SCOPE } : { pitch: context.pitch, phase: context.phase, scope: context.scope };
};

function recordCompletion(snapshot: Snapshot, input: CollectorInput, root: string, deps: RuntimeDeps, transcript: TranscriptRead | null = null): RecordResult {
  const raw = input.raw || input;
  const record = normalizedEvent(input, root, deps);
  if (record.id && snapshot.recentEventKeys.includes(record.id)) return { written: false, reason: "duplicate event" };
  if (record.vendor === "claude" && record.event === "agent-result" && (field(field(raw, "tool_response"), "isAsync") === true || record.status === "async_launched")) {
    rememberAgentModel(snapshot, record);
    snapshot.updatedAt = record.recordedAt;
    return { written: true, record, launch: true };
  }
  const noteKey = `agent:${record.vendor}:${record.agentId}`;
  if (!record.model && record.event === "subagent-complete" && record.agentId && snapshot.agentModels[noteKey]) {
    // The note came from a file that can be edited: it goes through the same allow-list as a payload name.
    record.model = knownModel(boundedName(snapshot.agentModels[noteKey]));
    delete snapshot.agentModels[noteKey];
  }
  if (transcript !== null) {
    const counted = applyTranscript(snapshot, transcript, record, deps);
    if (!counted && record.event === "session-turn" && transcript.result.status === "ok") return { written: true, reason: "no new usage" };
  }
  const existing = [snapshot.current, snapshot.previous].find((candidate) => candidate?.identityKey === record.identityKey);
  // A foreground agent-result that follows a SubagentStop already reported from its transcript is the same completion.
  const current = snapshot.current;
  if (record.vendor === "claude" && record.event === "agent-result" && !existing && current?.vendor === "claude" && current.event === "subagent-complete"
    && current.metricScope === "agent_total" && current.availability === "reported" && record.agentType && record.agentType === current.agentType) {
    if (!current.model && record.model) {
      applyToSnapshot(snapshot, current, -1);
      current.model = record.model;
      applyToSnapshot(snapshot, current, 1);
    }
    snapshot.updatedAt = record.recordedAt;
    if (record.id) snapshot.recentEventKeys = [record.id, ...snapshot.recentEventKeys.filter((key) => key !== record.id)].slice(0, RECENT_KEYS_LIMIT);
    return { written: true, record: current };
  }
  const canUpgradeClaudeCompletion =
    record.vendor === "claude" &&
    record.event === "agent-result" &&
    snapshot.current?.vendor === "claude" &&
    snapshot.current.availability === "unavailable" &&
    record.agentType &&
    record.agentType === snapshot.current.agentType;
  if (existing) {
    applyToSnapshot(snapshot, existing, -1);
    // A replay or upgrade keeps the routing the first record was stamped with, even if the context moved on.
    if (existing.flow?.applied) record.flow = { ...existing.flow };
    applyToSnapshot(snapshot, record, 1);
    if (snapshot.current?.identityKey === record.identityKey) snapshot.current = record;
    else snapshot.previous = record;
  } else if (canUpgradeClaudeCompletion) {
    const replaced = snapshot.current as CompletionRecord;
    applyToSnapshot(snapshot, replaced, -1);
    if (replaced.flow?.applied) record.flow = { ...replaced.flow };
    applyToSnapshot(snapshot, record, 1);
    snapshot.current = record;
  } else {
    snapshot.previous = snapshot.current;
    snapshot.current = record;
    applyToSnapshot(snapshot, record, 1, flowIntent(snapshot, record, deps));
  }
  snapshot.updatedAt = record.recordedAt;
  if (record.id) snapshot.recentEventKeys = [record.id, ...snapshot.recentEventKeys.filter((key) => key !== record.id)].slice(0, RECENT_KEYS_LIMIT);
  return { written: true, record };
}

function isLink(target: string, deps: RuntimeDeps): boolean {
  try { return deps.fs.lstatSync(target).isSymbolicLink(); } catch { return false; }
}

function staysUnderRoot(root: string, target: string, deps: RuntimeDeps): boolean {
  const { fs, path } = deps;
  try {
    const relative = path.relative(fs.realpathSync(root), fs.realpathSync(target));
    return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  } catch {
    return false;
  }
}

const DIRECTORY_CHANGED = "metrics directory changed while waiting for the lease; event not recorded";
interface DirectoryIdentity { path: string; real: string; ino: number; dev: number }
function identityOf(target: string, deps: RuntimeDeps): DirectoryIdentity | null {
  try {
    const stat = deps.fs.lstatSync(target);
    return { path: target, real: deps.fs.realpathSync(target), ino: stat.ino, dev: stat.dev };
  } catch { return null; }
}
const sameIdentity = (pin: DirectoryIdentity, now: DirectoryIdentity | null): boolean => now !== null && now.real === pin.real && now.ino === pin.ino && now.dev === pin.dev;

// Asynchronous: the metrics lease is a kernel-held socket (metrics-lock.mts). Callers must await it.
// options.lock is passed to the lease (tests use a longer or shorter waitMs).
export async function recordEvent(input: CollectorInput, root?: string, options: RecordOptions = {}, deps: RuntimeDeps = defaultDeps()): Promise<RecordResult> {
  const { fs, path } = deps;
  const base = root === undefined ? deps.proc.cwd() : root;
  const project = path.join(base, ".project");
  if (!fs.existsSync(project)) return { written: false, reason: ".project is not initialized" };
  const eventName = textOrNull(input.event);
  // A phase start is not a completion. Anything that is not a phase returns before the directory is created or the lease is taken.
  const phaseStart = eventName === "phase-start" || eventName === "skill-use" ? phaseStartOf(input, base, deps) : null;
  if (eventName === "phase-start" && phaseStart === null) return { written: false, reason: "not a workflow phase" };
  const metricsDirectory = path.join(".project", "metrics");
  const directory = path.join(base, metricsDirectory);
  // A cloned repo can commit .project or .project/metrics as a symlink. Resolve both before
  // anything is created or written, and refuse to leave the project root.
  if (!staysUnderRoot(base, project, deps)) return { written: false, reason: ".project resolves outside the project root" };
  // An existing path (a symlink, possibly dangling) is judged before mkdir can follow it anywhere.
  if (fs.existsSync(directory) || isLink(directory, deps)) { if (!staysUnderRoot(base, directory, deps)) return { written: false, reason: "metrics directory resolves outside the project root" }; }
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (!staysUnderRoot(base, directory, deps)) return { written: false, reason: "metrics directory resolves outside the project root" };
  // The lease wait is asynchronous: .project or .project/metrics could be swapped for a link meanwhile.
  // Their identities are pinned here and rechecked inside the lease before the read and before every write.
  const pinned = [project, directory].map((target) => identityOf(target, deps));
  const intact = (): boolean => pinned.every((pin) => pin !== null && sameIdentity(pin, identityOf(pin.path, deps)));
  // The transcript is read here, before the lease, so a large file never extends the time the lease is held.
  const transcript = readTranscript(input, path.join(directory, SNAPSHOT_NAME), deps);
  // The lease is held across the read, the snapshot write and both report writes, and released in withLease's finally.
  const held = await withLease(directory, (): RecordResult => {
    if (!intact()) return { written: false, reason: DIRECTORY_CHANGED };
    if (legacyLockPresent(directory, deps)) {
      return { written: false, reason: `legacy lock ${metricsDirectory}/${LEGACY_LOCK_NAME} is present; stop old collectors, then remove it (see README, Token Consumption)` };
    }
    const snapshotPath = path.join(directory, SNAPSHOT_NAME);
    const loaded = readSnapshot(snapshotPath, deps);
    if (loaded.skip !== undefined) return { written: false, reason: loaded.skip };
    const snapshot = loaded.snapshot as Snapshot;
    if (loaded.rejectedText !== undefined) {
      if (!intact()) return { written: false, reason: DIRECTORY_CHANGED };
      writeAtomically(`${snapshotPath}.rejected`, loaded.rejectedText, deps);
    }
    let outcome: RecordResult;
    if (eventName === "phase-start") outcome = phaseStart !== null && setContext(snapshot, phaseStart, deps) ? { written: true } : { written: false, reason: "no active context" };
    else if (eventName === "skill-use") {
      outcome = recordSkillUse(snapshot, input, deps);
      if (outcome.written && phaseStart !== null) setContext(snapshot, phaseStart, deps);
    } else outcome = recordCompletion(snapshot, input, base, deps, transcript);
    if (!outcome.written) return { ...outcome, snapshot };
    snapshot.updatedAt ||= isoNow(deps);
    snapshot.dimensions.since ||= snapshot.updatedAt;
    snapshot.flows.since ||= snapshot.updatedAt;
    if (!intact()) return { written: false, reason: DIRECTORY_CHANGED, snapshot };
    writeAtomically(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, deps);
    // The snapshot is the record; a report that cannot be rendered must not stop the next event from being recorded.
    try {
      if (!intact()) return { ...outcome, snapshot, warning: DIRECTORY_CHANGED };
      writeAtomically(path.join(directory, MARKDOWN_NAME), markdown(snapshot), deps);
      writeAtomically(path.join(directory, HTML_NAME), html(snapshot), deps);
    } catch { return { ...outcome, snapshot, warning: "reports could not be rendered" }; }
    return { ...outcome, snapshot };
  }, options.lock, deps);
  return held.skipped !== undefined ? { written: false, reason: held.skipped } : held.value;
}

async function readStdin(deps: RuntimeDeps): Promise<string> {
  try {
    return await deps.io.stdin.readText(MAX_STDIN_BYTES);
  } catch (error) {
    if (codeOf(error) === "E2BIG") throw new Error("stdin is larger than 1 MB");
    throw error;
  }
}

async function run(argv: string[], deps: RuntimeDeps): Promise<void> {
  const argumentsByName = new Map<string, string | undefined>();
  for (let index = 0; index < argv.length; index += 2) argumentsByName.set(argv[index], argv[index + 1]);
  const source = await readStdin(deps);
  let raw: unknown = {};
  if (source.trim()) {
    try {
      raw = JSON.parse(source);
    } catch {
      // The runtime's own message quotes the start of the input; a fixed message never echoes payload text.
      throw new Error("stdin is not valid JSON");
    }
  }
  const result = await recordEvent({ vendor: argumentsByName.get("--vendor"), event: argumentsByName.get("--event"), raw }, argumentsByName.get("--root") || deps.proc.cwd(), {}, deps);
  if (!result.written) deps.io.stderr.write(`[token-consumption] skipped: ${result.reason}\n`);
}

/** Hook entry. Always returns 0: telemetry is observational and must never block the agent that just completed. */
export async function main(argv: string[], deps: RuntimeDeps): Promise<number> {
  try {
    await run(argv, deps);
  } catch (error) {
    // File-system errors quote absolute paths; report only their code.
    // Messages can carry a name read back from the snapshot: printable ASCII only, and bounded.
    const details = isObject(error) ? error : {};
    const message = details.syscall && details.code ? `file system error (${String(details.code)})` : String(details.message).replace(/[^\x20-\x7e]/g, "?").slice(0, 160);
    deps.io.stderr.write(`[token-consumption] ${message}\n`);
  }
  return 0;
}

runDirect(import.meta.url, main);
