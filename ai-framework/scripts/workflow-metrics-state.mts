import type { RuntimeDeps } from "./runtime/types.mts";
import { withLease } from "../hooks/scripts/metrics-lock.mts";

export const STATE_FILE = "workflow-usage.json";
export const LIMITS = { inputBytes: 16 * 1024, stateBytes: 4 * 1024 * 1024, recent: 512, days: 30, pitches: 50, vendors: 8, names: 32, pending: 64 } as const;
export const KINDS = ["session.started", "agent.started", "agent.finished", "phase.started", "phase.paused", "phase.resumed", "phase.finished", "skill.used", "gate.decided", "pitch.started", "pitch.finished", "audit.finished"] as const;
const OUTCOMES = ["completed", "failed", "cancelled"] as const;
const DECISIONS = ["approve", "revise", "back", "stop"] as const;
const SOURCES = ["manual", "workflow", "native"] as const;
const DIMENSIONS = ["models", "roles", "skills", "phases"] as const;
const LABELS = ["pitch", "phase", "skill", "provider", "model", "role", "workflowVersion"] as const;
const HEALTH = ["missingVendor", "missingModel", "missingRole", "missingPhase", "missingSkill", "missingPitch", "unmatchedFinishes", "unmatchedTransitions", "pendingEvictions", "lateEvents", "overflowEvents"] as const;
const UNKNOWN = "(unknown)", OTHER = "(other)";
const SAFE = /^[\w.:/@+-]{1,80}$/;
const HASH = /^[a-f0-9]{64}$/;
const RESERVED = new Set(["__proto__", "constructor", "prototype"]);
type Kind = typeof KINDS[number];
type Outcome = typeof OUTCOMES[number];
type Source = typeof SOURCES[number];
type Map<T> = Record<string, T>;
export interface UsageEvent {
  eventId: string; kind: Kind; vendor: string; source: Source; occurredAt: string; timeProvided: boolean;
  sessionId: string | null; activityId: string | null; pitch: string; phase: string; skill: string;
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
export interface UsageState {
  schemaVersion: 1; createdAt: string; updatedAt: string;
  project: { id: string; label: string; workflowVersion: { value: string | null; status: "observed" | "stale" | "unavailable"; evidence: string | null } };
  totals: Summary; vendors: Map<Summary>; pitches: Map<Summary>; days: Map<Summary>;
  dimensions: Record<typeof DIMENSIONS[number], Map<Map<Summary>>>;
  health: Record<typeof HEALTH[number], number>;
  sources: Record<Source, { events: number; lastEventAt: string | null }>;
  recent: { key: string; fingerprint: string }[];
  pending: Map<{ startedAt: string; lastAt: string; status: "running" | "paused" }>;
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
  return { eventId, kind, vendor: name(input.vendor), source: input.source as Source, occurredAt, timeProvided: input.occurredAt !== undefined, sessionId, activityId, ...labels,
    agentKind: input.agentKind === "primary" || input.agentKind === "subagent" ? input.agentKind : "unknown",
    outcome, decision, mustFixCount: input.mustFixCount === undefined ? null : input.mustFixCount as number };
}

export function blankSummary(): Summary {
  return { events: counts(KINDS), outcomes: counts(OUTCOMES), gates: counts(DECISIONS), primaryFinishes: 0, subagentFinishes: 0, unknownFinishes: 0, mustFixCount: 0, elapsedMs: 0, matchedFinishes: 0, ships: 0 };
}
export function blankState(deps: RuntimeDeps, label: string = UNKNOWN): UsageState {
  const at = now(deps);
  return { schemaVersion: 1, createdAt: at, updatedAt: at,
    project: { id: deps.crypto.randomUUID(), label: name(label), workflowVersion: { value: null, status: "unavailable", evidence: null } },
    totals: blankSummary(), vendors: map(), pitches: map(), days: map(), dimensions: { models: map(), roles: map(), skills: map(), phases: map() },
    health: counts(HEALTH), sources: { manual: { events: 0, lastEventAt: null }, workflow: { events: 0, lastEventAt: null }, native: { events: 0, lastEventAt: null } }, recent: [], pending: map() };
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
function activityKey(event: UsageEvent, deps: RuntimeDeps): string {
  return deps.crypto.sha256Hex(JSON.stringify([event.kind.split(".")[0], event.vendor, event.sessionId, event.activityId, event.pitch, event.phase]));
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

/** Mutates only a validated working copy; a rejected update never commits partial aggregates. */
export function applyEvent(state: UsageState, event: UsageEvent, deps: RuntimeDeps): RecordResult {
  const key = deps.crypto.sha256Hex(JSON.stringify([event.vendor, event.source, event.eventId]));
  // Missing caller time must not turn an identical replay into a timestamp conflict.
  const fingerprint = deps.crypto.sha256Hex(JSON.stringify({ ...event, occurredAt: event.timeProvided ? event.occurredAt : undefined, eventId: undefined }));
  const recent = state.recent.find(r => r.key === key);
  if (recent) return { written: false, reason: recent.fingerprint === fingerprint ? "duplicate event" : "conflicting event identifier" };
  let elapsed: number | null = null;
  if (/^(agent|phase)\./.test(event.kind)) {
    // Invalid display labels cannot identify a lifecycle: distinct inputs share the other bucket.
    const matchable = ![event.vendor, event.pitch, event.phase].includes(OTHER);
    const activity = activityKey(event, deps), pending = matchable ? state.pending[activity] : undefined;
    if (event.kind.endsWith(".started")) {
      if (pending) return { written: false, reason: "activity already started" };
      if (matchable) {
        if (Object.keys(state.pending).length >= LIMITS.pending) { delete state.pending[Object.keys(state.pending)[0]]; add(state.health, "pendingEvictions"); }
        state.pending[activity] = { startedAt: event.occurredAt, lastAt: event.occurredAt, status: "running" };
      }
    } else if (event.kind.endsWith(".finished")) {
      if (pending && event.occurredAt >= pending.lastAt) { elapsed = Date.parse(event.occurredAt) - Date.parse(pending.startedAt); delete state.pending[activity]; }
      else add(state.health, "unmatchedFinishes");
    } else {
      const expected = event.kind === "phase.paused" ? "running" : "paused";
      if (pending && pending.status === expected && event.occurredAt >= pending.lastAt) { pending.status = expected === "running" ? "paused" : "running"; pending.lastAt = event.occurredAt; }
      else add(state.health, "unmatchedTransitions");
    }
  }
  const rows = [state.totals];
  let overflow = event.vendor === OTHER || event.pitch === OTHER;
  const vendor = bucket(state.vendors, event.vendor, LIMITS.vendors, blankSummary);
  const pitch = bucket(state.pitches, event.pitch, LIMITS.pitches, blankSummary);
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
/** Exact schemas prevent hand-edited state from carrying arbitrary fields into reports. */
export function validState(v: unknown): v is UsageState {
  if (!object(v) || !keysAre(v, ["schemaVersion", "createdAt", "updatedAt", "project", "totals", "vendors", "pitches", "days", "dimensions", "health", "sources", "recent", "pending"]) || v.schemaVersion !== 1 || !date(v.createdAt) || !date(v.updatedAt)) return false;
  const p = v.project;
  if (!object(p) || !keysAre(p, ["id", "label", "workflowVersion"]) || typeof p.id !== "string" || !/^[a-f0-9-]{36}$/.test(p.id) || typeof p.label !== "string" || !storedName(p.label)) return false;
  const w = p.workflowVersion;
  if (!object(w) || !keysAre(w, ["value", "status", "evidence"]) || !(w.value === null || typeof w.value === "string" && storedName(w.value)) || !["observed", "stale", "unavailable"].includes(w.status as string) || ![null, ".project/.bundle-sync.json", "VERSION"].includes(w.evidence as string | null)) return false;
  if (!validSummary(v.totals) || !validRows(v.vendors, LIMITS.vendors) || !validRows(v.pitches, LIMITS.pitches) || !validCounts(v.health, HEALTH)) return false;
  if (!object(v.days) || Object.keys(v.days).length > LIMITS.days || !Object.entries(v.days).every(([day, row]) => date(`${day}T00:00:00.000Z`) && validSummary(row))) return false;
  if (!object(v.dimensions) || !keysAre(v.dimensions, DIMENSIONS) || !Object.entries(v.dimensions).every(([dimension, rows]) => validRows(rows, LIMITS.vendors, row => validRows(row, LIMITS.names, validSummary, dimension === "models" ? storedModelName : storedName)))) return false;
  if (!object(v.sources) || !keysAre(v.sources, SOURCES) || !Object.values(v.sources).every(s => object(s) && keysAre(s, ["events", "lastEventAt"]) && count(s.events) && (s.lastEventAt === null || date(s.lastEventAt)))) return false;
  if (!Array.isArray(v.recent) || v.recent.length > LIMITS.recent || !v.recent.every(r => object(r) && keysAre(r, ["key", "fingerprint"]) && typeof r.key === "string" && HASH.test(r.key) && typeof r.fingerprint === "string" && HASH.test(r.fingerprint)) || new Set(v.recent.map(r => (r as { key: string }).key)).size !== v.recent.length) return false;
  return object(v.pending) && Object.keys(v.pending).length <= LIMITS.pending && Object.entries(v.pending).every(([key, a]) => HASH.test(key) && object(a) && keysAre(a, ["startedAt", "lastAt", "status"]) && date(a.startedAt) && date(a.lastAt) && a.lastAt >= a.startedAt && ["running", "paused"].includes(a.status as string));
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
export function readWorkflowState(directory: string, deps: RuntimeDeps): ReadResult {
  const loaded = readText(deps.path.join(directory, STATE_FILE), deps);
  if (loaded.status !== "valid") return loaded;
  try {
    const parsed: unknown = JSON.parse(loaded.text);
    if (!validState(parsed)) return { status: "refused", reason: "invalid or unsupported workflow state" };
    for (const field of ["vendors", "pitches", "days"] as const) parsed[field] = Object.assign(map<Summary>(), parsed[field]);
    parsed.pending = Object.assign(map<UsageState["pending"][string]>(), parsed.pending);
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
    return await withMetricsLease(directory, deps => {
      const loaded = readWorkflowState(directory, deps);
      if (loaded.status === "refused") return { written: false, reason: loaded.reason };
      const state = loaded.status === "valid" ? loaded.state : blankState(deps, deps.path.basename(deps.fs.realpathSync(root)));
      state.project.workflowVersion = installedVersion(deps.fs.realpathSync(root), deps);
      const result = applyEvent(state, event, deps);
      if (result.written) writeAtomic(deps.path.join(directory, STATE_FILE), `${JSON.stringify(state)}\n`, deps);
      return result;
    }, deps);
  } catch (error) { return failure(error); }
}
