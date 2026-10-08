import { runDirect } from "../../scripts/runtime/cli.mts";
/*
 * Records one bounded, local snapshot of agent consumption. It deliberately
 * stores identifiers and numeric usage only: never prompts, responses, or transcripts.
 */

import type { RuntimeDeps } from "../../scripts/runtime/types.mts";
import { createNodeDeps } from "../../scripts/runtime/node.mts";
import { markdown, html } from "./token-report.mts";
import { withLease } from "./metrics-lock.mts";
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

export function blankSnapshot(): Snapshot {
  return {
    schemaVersion: 2,
    updatedAt: null,
    current: null,
    previous: null,
    lifetime: blankTotals(),
    dimensions: blankDimensions(),
    recentEventKeys: [],
    recentSkillKeys: [],
    agentModels: nullMap(),
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

export function applyToSnapshot(snapshot: Snapshot, record: CompletionRecord, direction: number): void {
  applyRecord(snapshot.lifetime, record, direction);
  applyDimensions(snapshot.dimensions, record, direction);
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
  const agentType = boundedName(input.agentType) || boundedName(field(raw, "agent_type")) || boundedName(field(raw, "agentType")) || boundedName(field(toolInput, "subagent_type"));
  const sessionId = boundedId(input.sessionId) || boundedId(field(raw, "session_id")) || boundedId(field(raw, "sessionId"));
  const turnId = boundedId(input.turnId) || boundedId(field(raw, "turn_id")) || boundedId(field(raw, "turnId"));
  const model = knownModel(boundedName(input.model) || boundedName(field(raw, "model")) || boundedName(field(raw, "resolvedModel")) || boundedName(field(toolResponse, "resolvedModel")));
  const effort = boundedName(input.effort) || boundedName(field(field(raw, "effort"), "level")) || boundedName(field(raw, "effort")) || boundedName(field(raw, "variant"));
  const event = boundedName(input.event) || boundedName(field(raw, "hook_event_name")) || "agent-complete";
  const idempotencyKey =
    boundedId(input.idempotencyKey) ||
    boundedId(field(raw, "message_id")) ||
    boundedId(field(raw, "messageId")) ||
    boundedId(field(raw, "tool_use_id")) ||
    boundedId(field(raw, "toolUseId"));
  const completionKey = idempotencyKey ? ["event", idempotencyKey] : event === "subagent-complete" && agentId ? ["subagent", sessionId, agentId, event] : null;
  const identity = idempotencyKey ? ["event", idempotencyKey] : event === "subagent-complete" && !agentId ? ["anonymous", deps.crypto.randomUUID()] : sessionId ? ["session", sessionId, agentId, agentType, turnId] : agentId ? ["agent", agentId] : ["fallback", agentType, model, turnId];
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
// A stored record's routing is reversed by name later: a name with no matching row would throw on every event.
function routingResolves(snapshot: Plain, record: unknown): boolean {
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
  if (!validDimensions(snapshot.dimensions)) return false;
  const agentModels = snapshot.agentModels;
  if (agentModels !== undefined && (!isObject(agentModels) || Object.values(agentModels).some((note) => typeof note !== "string"))) return false;
  return isStoredRecord(snapshot.current ?? null) && isStoredRecord(snapshot.previous ?? null)
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
    if (isObject(snapshot) && Number.isInteger(snapshot.schemaVersion) && (snapshot.schemaVersion as number) > 2) return { skip: `snapshot schemaVersion ${snapshot.schemaVersion} is newer than this collector understands; not overwritten` };
    const usable = usableShape(snapshot);
    // A parseable file that fails validation is replaced by a blank snapshot, but never silently lost: its text is kept aside.
    if (!usable && isObject(snapshot)) return { snapshot: blankSnapshot(), rejectedText: raw };
    // v1 predates the dimension aggregates: keep its lifetime totals and start the dimensions now.
    // Its stored records carry no `dimensions.applied` flag, so reversing one never touches them.
    try {
      const valid = snapshot as Snapshot;
      if (usable && valid.schemaVersion === 1) return { snapshot: reviveMaps({ ...valid, schemaVersion: 2, dimensions: blankDimensions(isoNow(deps)) }) };
      if (usable && valid.schemaVersion === 2) return { snapshot: reviveMaps(valid) };
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

function recordCompletion(snapshot: Snapshot, input: CollectorInput, root: string, deps: RuntimeDeps): RecordResult {
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
  const existing = [snapshot.current, snapshot.previous].find((candidate) => candidate?.identityKey === record.identityKey);
  const canUpgradeClaudeCompletion =
    record.vendor === "claude" &&
    record.event === "agent-result" &&
    snapshot.current?.vendor === "claude" &&
    snapshot.current.availability === "unavailable" &&
    record.agentType &&
    record.agentType === snapshot.current.agentType;
  if (existing) {
    applyToSnapshot(snapshot, existing, -1);
    applyToSnapshot(snapshot, record, 1);
    if (snapshot.current?.identityKey === record.identityKey) snapshot.current = record;
    else snapshot.previous = record;
  } else if (canUpgradeClaudeCompletion) {
    applyToSnapshot(snapshot, snapshot.current as CompletionRecord, -1);
    applyToSnapshot(snapshot, record, 1);
    snapshot.current = record;
  } else {
    snapshot.previous = snapshot.current;
    snapshot.current = record;
    applyToSnapshot(snapshot, record, 1);
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

// Asynchronous: the metrics lease is a kernel-held socket (metrics-lock.mts). Callers must await it.
// options.lock is passed to the lease (tests use a longer or shorter waitMs).
export async function recordEvent(input: CollectorInput, root?: string, options: RecordOptions = {}, deps: RuntimeDeps = defaultDeps()): Promise<RecordResult> {
  const { fs, path } = deps;
  const base = root === undefined ? deps.proc.cwd() : root;
  const project = path.join(base, ".project");
  if (!fs.existsSync(project)) return { written: false, reason: ".project is not initialized" };
  const metricsDirectory = path.join(".project", "metrics");
  const directory = path.join(base, metricsDirectory);
  // A cloned repo can commit .project or .project/metrics as a symlink. Resolve both before
  // anything is created or written, and refuse to leave the project root.
  if (!staysUnderRoot(base, project, deps)) return { written: false, reason: ".project resolves outside the project root" };
  // An existing path (a symlink, possibly dangling) is judged before mkdir can follow it anywhere.
  if (fs.existsSync(directory) || isLink(directory, deps)) { if (!staysUnderRoot(base, directory, deps)) return { written: false, reason: "metrics directory resolves outside the project root" }; }
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (!staysUnderRoot(base, directory, deps)) return { written: false, reason: "metrics directory resolves outside the project root" };
  // The lease is held across the read, the snapshot write and both report writes, and released in withLease's finally.
  const held = await withLease(directory, (): RecordResult => {
    if (legacyLockPresent(directory, deps)) {
      return { written: false, reason: `legacy lock ${metricsDirectory}/${LEGACY_LOCK_NAME} is present; stop old collectors, then remove it (see README, Token Consumption)` };
    }
    const snapshotPath = path.join(directory, SNAPSHOT_NAME);
    const loaded = readSnapshot(snapshotPath, deps);
    if (loaded.skip !== undefined) return { written: false, reason: loaded.skip };
    const snapshot = loaded.snapshot as Snapshot;
    if (loaded.rejectedText !== undefined) writeAtomically(`${snapshotPath}.rejected`, loaded.rejectedText, deps);
    const outcome = textOrNull(input.event) === "skill-use" ? recordSkillUse(snapshot, input, deps) : recordCompletion(snapshot, input, base, deps);
    if (!outcome.written) return { ...outcome, snapshot };
    snapshot.updatedAt ||= isoNow(deps);
    snapshot.dimensions.since ||= snapshot.updatedAt;
    writeAtomically(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, deps);
    // The snapshot is the record; a report that cannot be rendered must not stop the next event from being recorded.
    try {
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
