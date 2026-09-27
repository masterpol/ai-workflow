#!/usr/bin/env node
/*
 * Records one bounded, local snapshot of agent consumption. It deliberately
 * stores identifiers and numeric usage only: never prompts, responses, or transcripts.
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { markdown, html } = require("./token-report.js");
const { withLease } = require("./metrics-lock.js");

const METRICS_DIRECTORY = path.join(".project", "metrics");
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
const DIMENSIONS = [["models", "model"], ["agents", "agentType"], ["efforts", "effort"]];

// Harness numbers are bounded so one absurd value cannot overflow an aggregate or leave
// float residue that makes a later reversal look like an underflow.
function numberOrNull(value, max = 1e12) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max ? value : null;
}

// Token counts are whole numbers: a fractional count would leave float residue that makes a later
// reversal throw an underflow and lose that event.
function integerOrNull(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 1e12 ? value : null;
}

function textOrNull(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// Names come from hook payloads, so they are bounded and limited to identifier characters
// before they become keys or identities. Anything else (Markdown, HTML, control characters,
// free text) is reported as (other) instead of being stored.
// A model built from absent parts ("undefined/undefined") is not a model: it is reported as unreported.
function knownModel(value) {
  return value && /(^|\/)(undefined|null)(\/|$)/.test(value) ? null : value;
}

function boundedName(value) {
  const text = textOrNull(value);
  if (!text) return null;
  const bounded = text.slice(0, MAX_NAME_LENGTH);
  return SAFE_NAME.test(bounded) ? bounded : OTHER;
}

// Ids are opaque, so they only get a length bound.
function boundedId(value) {
  const text = textOrNull(value);
  return text ? text.slice(0, MAX_ID_LENGTH) : null;
}

// Every map keyed by a payload-controlled name has no prototype, so a name like "__proto__"
// is just a key and can never reach Object.prototype.
function nullMap(source = {}) {
  const map = Object.create(null);
  for (const [key, value] of Object.entries(source)) map[key] = value;
  return map;
}

function bucketKey(byName, name) {
  if (!name) return UNREPORTED;
  if (RESERVED_NAMES.has(name)) return OTHER;
  if (name in byName) return name;
  const real = Object.keys(byName).filter((key) => key !== UNREPORTED && key !== OTHER).length;
  return real >= MAX_KEYS_PER_DIMENSION ? OTHER : name;
}

// Best-effort attribution only, for this project's own reporting: never reads, invokes, or
// duplicates caveman-stats' own reporting (that skill's hook internals are unreviewed upstream
// code this project deliberately does not couple to). Reads modes.json directly rather than
// pulling in skill-defaults.js's full module (its skill-registry dependency is unrelated to a
// hook's own invocation shape); the bundle default is read from the same catalog JSON
// skill-defaults.js uses, so the fallback value is never duplicated by hand.
function currentCavemanMode(root) {
  try {
    const full = path.join(root, ".project", "skills", "modes.json");
    // A FIFO would block this read (while the metrics lock is held) and a huge file would be read whole:
    // only a small regular file is ever opened.
    let stat;
    try { stat = fs.lstatSync(full); } catch { return null; }
    if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 64 * 1024) return null;
    // Resolve the real path and confirm it stays under the real root — catches both the file
    // itself being a symlink and an ancestor directory (e.g. .project/skills/) being one; an
    // lstat of the leaf alone only catches the former. Best-effort: any escape or read failure
    // here just falls through to the outer catch and returns null, never throws upward.
    const relative = path.relative(fs.realpathSync(root), fs.realpathSync(full));
    if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
    const value = JSON.parse(fs.readFileSync(full, "utf8"));
    const caveman = value && typeof value === "object" && !Array.isArray(value) ? value.caveman : undefined;
    if (!caveman || typeof caveman !== "object" || Array.isArray(caveman)) return null;
    if (caveman.enabled === false) return "off";
    // A mode is one of a few short lowercase words; anything else in modes.json (a project file) is not stored.
    const mode = (candidate) => (typeof candidate === "string" && MODE.test(candidate.trim()) ? candidate.trim() : null);
    const explicit = textOrNull(caveman.default);
    if (explicit) return mode(explicit);
    const catalog = require("../../integrations/skill-defaults.json");
    const entry = catalog.defaults?.find((item) => typeof item.id === "string" && item.id.endsWith("/caveman"));
    return mode(textOrNull(entry?.defaultMode));
  } catch {
    return null;
  }
}

function tokensFrom(raw = {}) {
  const cache = raw.cache || {};
  const tokens = {
    input: integerOrNull(raw.input ?? raw.input_tokens),
    output: integerOrNull(raw.output ?? raw.output_tokens),
    reasoning: integerOrNull(raw.reasoning ?? raw.reasoning_tokens),
    cacheRead: integerOrNull(cache.read ?? raw.cache_read_input_tokens),
    cacheWrite: integerOrNull(cache.write ?? raw.cache_creation_input_tokens),
  };
  const reported = [tokens.input, tokens.output, tokens.reasoning].filter((value) => value !== null);
  return { ...tokens, total: reported.length > 0 ? reported.reduce((sum, value) => sum + value, 0) : null };
}

function blankTotals() {
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

function blankDimensions(since = null) {
  return { since, models: nullMap(), agents: nullMap(), efforts: nullMap(), skills: nullMap() };
}

function blankSnapshot() {
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

function addNumber(target, key, value, direction) {
  if (value !== null) target[key] = Math.max(0, target[key] + value * direction);
}

function applyRecord(totals, record, direction) {
  totals.agentCompletions = Math.max(0, totals.agentCompletions + direction);
  if (record.tokens.total === null) {
    totals.unavailableCount = Math.max(0, totals.unavailableCount + direction);
  } else {
    totals.reportedUsageCount = Math.max(0, totals.reportedUsageCount + direction);
    for (const key of Object.keys(totals.tokens)) addNumber(totals.tokens, key, record.tokens[key], direction);
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

function blankRow() {
  return { completions: 0, reportedUsageCount: 0, unavailableCount: 0, tokens: 0, costUsd: 0, pricedCount: 0 };
}

// Unlike the lifetime totals above, dimension rows are never clamped: an over-subtraction means
// a record was reversed that was never applied, and that has to fail loudly instead of hiding.
function applyToRow(byName, key, record, direction) {
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
function applyDimensions(dimensions, record, direction) {
  if (direction < 0 && !record.dimensions?.applied) return;
  if (direction > 0) record.dimensions = { applied: true };
  for (const [name, field] of DIMENSIONS) {
    const byName = (dimensions[name][record.vendor] ||= nullMap());
    if (direction > 0) record.dimensions[name] = bucketKey(byName, record[field]);
    applyToRow(byName, record.dimensions[name], record, direction);
    if (Object.keys(byName).length === 0) delete dimensions[name][record.vendor];
  }
}

function applyToSnapshot(snapshot, record, direction) {
  applyRecord(snapshot.lifetime, record, direction);
  applyDimensions(snapshot.dimensions, record, direction);
}

function recordSkillUse(snapshot, input) {
  const raw = input.raw || input;
  const skill = boundedName(input.skill) || boundedName(raw.tool_input?.skill) || boundedName(raw.tool_input?.name);
  if (!skill) return { written: false, reason: "skill name unavailable" };
  const vendor = boundedName(input.vendor) || "unknown";
  const key = boundedId(input.idempotencyKey) || boundedId(raw.tool_use_id) || boundedId(raw.toolUseId);
  const id = key ? `${vendor}:${key}` : null;
  if (id && snapshot.recentSkillKeys.includes(id)) return { written: false, reason: "duplicate event" };
  const byName = (snapshot.dimensions.skills[vendor] ||= nullMap());
  const bucket = bucketKey(byName, skill);
  (byName[bucket] ||= { uses: 0 }).uses += 1;
  if (id) snapshot.recentSkillKeys = [id, ...snapshot.recentSkillKeys].slice(0, RECENT_SKILL_KEYS_LIMIT);
  snapshot.updatedAt = new Date().toISOString();
  return { written: true };
}

function normalizedEvent(input, root = process.cwd()) {
  const vendor = boundedName(input.vendor) || "unknown";
  const raw = input.raw || input;
  const usage = raw.usage || raw.tool_response?.usage || raw.tool_response?.result?.usage || raw.tokens || {};
  const tokens = tokensFrom(usage);
  const scope = textOrNull(input.metricScope) || (vendor === "claude" && tokens.total !== null ? "final_request" : tokens.total !== null ? "agent_total" : "completion");
  const availability = tokens.total === null ? "unavailable" : scope === "agent_total" ? "reported" : "partial";
  const agentId = boundedId(input.agentId) || boundedId(raw.agent_id) || boundedId(raw.agentId) || boundedId(raw.tool_response?.agentId);
  const agentType = boundedName(input.agentType) || boundedName(raw.agent_type) || boundedName(raw.agentType) || boundedName(raw.tool_input?.subagent_type);
  const sessionId = boundedId(input.sessionId) || boundedId(raw.session_id) || boundedId(raw.sessionId);
  const turnId = boundedId(input.turnId) || boundedId(raw.turn_id) || boundedId(raw.turnId);
  const model = knownModel(boundedName(input.model) || boundedName(raw.model) || boundedName(raw.resolvedModel) || boundedName(raw.tool_response?.resolvedModel));
  const effort = boundedName(input.effort) || boundedName(raw.effort?.level) || boundedName(raw.effort) || boundedName(raw.variant);
  const event = boundedName(input.event) || boundedName(raw.hook_event_name) || "agent-complete";
  const idempotencyKey =
    boundedId(input.idempotencyKey) ||
    boundedId(raw.message_id) ||
    boundedId(raw.messageId) ||
    boundedId(raw.tool_use_id) ||
    boundedId(raw.toolUseId);
  const completionKey = idempotencyKey ? ["event", idempotencyKey] : event === "subagent-complete" && agentId ? ["subagent", sessionId, agentId, event] : null;
  const identity = idempotencyKey ? ["event", idempotencyKey] : event === "subagent-complete" && !agentId ? ["anonymous", crypto.randomUUID()] : sessionId ? ["session", sessionId, agentId, agentType, turnId] : agentId ? ["agent", agentId] : ["fallback", agentType, model, turnId];
  const identityKey = JSON.stringify([vendor, ...identity]);
  return {
    id: completionKey ? JSON.stringify([vendor, ...completionKey]) : null,
    identityKey,
    recordedAt: new Date().toISOString(),
    vendor,
    event,
    sessionId,
    turnId,
    agentId,
    agentType,
    model,
    effort,
    status: boundedName(input.status) || boundedName(raw.stop_reason) || boundedName(raw.tool_response?.status) || "completed",
    metricScope: scope,
    availability,
    tokens,
    costUsd: numberOrNull(input.costUsd ?? raw.cost ?? raw.cost_usd, MAX_COST_USD),
    mode: currentCavemanMode(root),
    dimensions: null,
  };
}

// Loaded JSON objects keyed by payload names are copied into prototype-free maps before use.
function reviveMaps(snapshot) {
  snapshot.lifetime.vendors = nullMap(snapshot.lifetime.vendors);
  for (const vendor of Object.values(snapshot.lifetime.vendors)) vendor.pricedCount ??= 0;
  const dimensions = snapshot.dimensions || {};
  snapshot.dimensions = { since: dimensions.since ?? null };
  for (const name of ["models", "agents", "efforts", "skills"]) {
    snapshot.dimensions[name] = nullMap();
    for (const [vendor, byName] of Object.entries(dimensions[name] || {})) snapshot.dimensions[name][vendor] = nullMap(byName);
  }
  snapshot.recentSkillKeys = Array.isArray(snapshot.recentSkillKeys) ? snapshot.recentSkillKeys : [];
  snapshot.agentModels = nullMap(snapshot.agentModels);
  return snapshot;
}

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isCount = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
const TOKEN_KEYS = ["input", "output", "reasoning", "cacheRead", "cacheWrite", "total"];
const isCountOrNull = (value) => value === null || isCount(value);
const isStoredRecord = (record) => record === null
  || (isObject(record) && typeof record.identityKey === "string" && typeof record.vendor === "string"
    && isObject(record.tokens) && TOKEN_KEYS.every((key) => isCountOrNull(record.tokens[key]))
    && (record.costUsd === undefined || isCountOrNull(record.costUsd))
    && (record.dimensions == null || (isObject(record.dimensions) && ["models", "agents", "efforts"].every((name) => record.dimensions[name] === undefined || typeof record.dimensions[name] === "string"))));
// Rows are read back, added to and reversed later; a row with a missing or negative counter would turn into NaN
// (saved as null), the next read would reject the whole file, and every earlier total would be replaced by a blank one.
const DIMENSION_ROW_FIELDS = ["completions", "reportedUsageCount", "unavailableCount", "tokens", "costUsd", "pricedCount"];
const hasFields = (row, fields) => isObject(row) && fields.every((key) => isCount(row[key]));
function validDimensions(dimensions) {
  if (dimensions === undefined) return true;
  if (!isObject(dimensions)) return false;
  return ["models", "agents", "efforts", "skills"].every((name) => {
    if (dimensions[name] === undefined) return true;
    if (!isObject(dimensions[name])) return false;
    const fields = name === "skills" ? ["uses"] : DIMENSION_ROW_FIELDS;
    return Object.values(dimensions[name]).every((byName) => isObject(byName) && Object.values(byName).every((row) => hasFields(row, fields)));
  });
}
// A stored record's routing is reversed by name later: a name with no matching row would throw on every event.
function routingResolves(snapshot, record) {
  if (!record?.dimensions?.applied) return true;
  return ["models", "agents", "efforts"].every((name) => hasFields(snapshot.dimensions?.[name]?.[record.vendor]?.[record.dimensions[name]], DIMENSION_ROW_FIELDS));
}
// A well-formed JSON file with the wrong shape must not be accepted: the collector would throw on every
// later event (and the reports would never regenerate) until someone deleted the file by hand.
function usableShape(snapshot) {
  if (!isObject(snapshot) || !isObject(snapshot.lifetime) || !Array.isArray(snapshot.recentEventKeys)) return false;
  const lifetime = snapshot.lifetime;
  if (!["agentCompletions", "reportedUsageCount", "unavailableCount"].every((key) => isCount(lifetime[key]))) return false;
  if (!isObject(lifetime.tokens) || !TOKEN_KEYS.every((key) => isCount(lifetime.tokens[key]))) return false;
  if (["reportedCostUsd", "reportedCostCount"].some((key) => lifetime[key] !== undefined && !isCount(lifetime[key]))) return false;
  if (lifetime.vendors !== undefined && !isObject(lifetime.vendors)) return false;
  if (Object.values(lifetime.vendors || {}).some((vendor) => !hasFields(vendor, ["completions", "reportedUsageCount", "unavailableCount", "reportedCostUsd"]) || (vendor.pricedCount !== undefined && !isCount(vendor.pricedCount)))) return false;
  if (!validDimensions(snapshot.dimensions)) return false;
  if (snapshot.agentModels !== undefined && (!isObject(snapshot.agentModels) || Object.values(snapshot.agentModels).some((note) => typeof note !== "string"))) return false;
  return isStoredRecord(snapshot.current ?? null) && isStoredRecord(snapshot.previous ?? null)
    && routingResolves(snapshot, snapshot.current) && routingResolves(snapshot, snapshot.previous);
}

// Returns { snapshot } or { skip: reason }. Absent, unparseable, or wrongly shaped means "start blank";
// a snapshot that is not a plain file, is huge, or is from a NEWER schema is refused and never overwritten.
function readSnapshot(snapshotPath) {
  let stat;
  try { stat = fs.lstatSync(snapshotPath); } catch (error) {
    return error.code === "ENOENT" ? { snapshot: blankSnapshot() } : { skip: `snapshot cannot be inspected (${error.code || "error"})` };
  }
  if (stat.isSymbolicLink() || !stat.isFile()) return { skip: "snapshot is a symlink or not a regular file; not read or overwritten" };
  if (stat.size > MAX_SNAPSHOT_BYTES) return { skip: "snapshot is larger than 4 MB; not read or overwritten" };
  try {
    const raw = fs.readFileSync(snapshotPath, "utf8");
    const snapshot = JSON.parse(raw);
    if (isObject(snapshot) && Number.isInteger(snapshot.schemaVersion) && snapshot.schemaVersion > 2) return { skip: `snapshot schemaVersion ${snapshot.schemaVersion} is newer than this collector understands; not overwritten` };
    const usable = usableShape(snapshot);
    // A parseable file that fails validation is replaced by a blank snapshot, but never silently lost: its text is kept aside.
    if (!usable && isObject(snapshot)) return { snapshot: blankSnapshot(), rejectedText: raw };
    // v1 predates the dimension aggregates: keep its lifetime totals and start the dimensions now.
    // Its stored records carry no `dimensions.applied` flag, so reversing one never touches them.
    try {
      if (usable && snapshot.schemaVersion === 1) return { snapshot: reviveMaps({ ...snapshot, schemaVersion: 2, dimensions: blankDimensions(new Date().toISOString()) }) };
      if (usable && snapshot.schemaVersion === 2) return { snapshot: reviveMaps(snapshot) };
    } catch { return { snapshot: blankSnapshot(), rejectedText: raw }; } // validated, but still unrevivable: keep it aside too
  } catch {
    // A malformed local metrics file must not break an agent completion hook.
  }
  return { snapshot: blankSnapshot() };
}

function writeAtomically(target, content) {
  // "wx" refuses an existing path (including a pre-planted symlink); the random suffix makes one unguessable.
  const temporary = `${target}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  try {
    fs.writeFileSync(temporary, content, { mode: 0o600, flag: "wx" });
    fs.renameSync(temporary, target);
  } finally { fs.rmSync(temporary, { force: true }); }
}

// The pathname lock that earlier collectors used. Its presence means an old writer may still be running
// (or crashed and left it): the new protocol cannot exclude that writer, so the event is skipped until an
// operator has stopped every old collector and removed the file. It is never reclaimed automatically.
const LEGACY_LOCK_NAME = ".token-consumption.lock";

function legacyLockPresent(directory) {
  try { fs.lstatSync(path.join(directory, LEGACY_LOCK_NAME)); return true; } catch (error) { return error.code !== "ENOENT"; }
}

// An async Claude subagent fires PostToolUse(Agent) at launch, not completion, so that event is
// not a completion: it only leaves a model note for the SubagentStop that follows, which has none.
function rememberAgentModel(snapshot, record) {
  if (record.agentId && record.model) snapshot.agentModels[`agent:${record.vendor}:${record.agentId}`] = record.model;
  const ids = Object.keys(snapshot.agentModels);
  while (ids.length > AGENT_MODEL_NOTES_LIMIT) delete snapshot.agentModels[ids.shift()];
}

function recordCompletion(snapshot, input, root) {
  const raw = input.raw || input;
  const record = normalizedEvent(input, root);
  if (record.id && snapshot.recentEventKeys.includes(record.id)) return { written: false, reason: "duplicate event" };
  if (record.vendor === "claude" && record.event === "agent-result" && (raw.tool_response?.isAsync === true || record.status === "async_launched")) {
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
    applyToSnapshot(snapshot, snapshot.current, -1);
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

function isLink(target) {
  try { return fs.lstatSync(target).isSymbolicLink(); } catch { return false; }
}

function staysUnderRoot(root, target) {
  try {
    const relative = path.relative(fs.realpathSync(root), fs.realpathSync(target));
    return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  } catch {
    return false;
  }
}

// Asynchronous: the metrics lease is a kernel-held socket (metrics-lock.js). Callers must await it.
// options.lock is passed to the lease (tests use a longer or shorter waitMs).
async function recordEvent(input, root = process.cwd(), options = {}) {
  const project = path.join(root, ".project");
  if (!fs.existsSync(project)) return { written: false, reason: ".project is not initialized" };
  const directory = path.join(root, METRICS_DIRECTORY);
  // A cloned repo can commit .project or .project/metrics as a symlink. Resolve both before
  // anything is created or written, and refuse to leave the project root.
  if (!staysUnderRoot(root, project)) return { written: false, reason: ".project resolves outside the project root" };
  // An existing path (a symlink, possibly dangling) is judged before mkdir can follow it anywhere.
  if (fs.existsSync(directory) || isLink(directory)) { if (!staysUnderRoot(root, directory)) return { written: false, reason: "metrics directory resolves outside the project root" }; }
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (!staysUnderRoot(root, directory)) return { written: false, reason: "metrics directory resolves outside the project root" };
  // The lease is held across the read, the snapshot write and both report writes, and released in withLease's finally.
  const held = await withLease(directory, () => {
    if (legacyLockPresent(directory)) {
      return { written: false, reason: `legacy lock ${METRICS_DIRECTORY}/${LEGACY_LOCK_NAME} is present; stop old collectors, then remove it (see README, Token Consumption)` };
    }
    const snapshotPath = path.join(directory, SNAPSHOT_NAME);
    const loaded = readSnapshot(snapshotPath);
    if (loaded.skip) return { written: false, reason: loaded.skip };
    const snapshot = loaded.snapshot;
    if (loaded.rejectedText !== undefined) writeAtomically(`${snapshotPath}.rejected`, loaded.rejectedText);
    const outcome = textOrNull(input.event) === "skill-use" ? recordSkillUse(snapshot, input) : recordCompletion(snapshot, input, root);
    if (!outcome.written) return { ...outcome, snapshot };
    snapshot.updatedAt ||= new Date().toISOString();
    snapshot.dimensions.since ||= snapshot.updatedAt;
    writeAtomically(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
    // The snapshot is the record; a report that cannot be rendered must not stop the next event from being recorded.
    try {
      writeAtomically(path.join(directory, MARKDOWN_NAME), markdown(snapshot));
      writeAtomically(path.join(directory, HTML_NAME), html(snapshot));
    } catch { return { ...outcome, snapshot, warning: "reports could not be rendered" }; }
    return { ...outcome, snapshot };
  }, options.lock);
  return held.skipped ? { written: false, reason: held.skipped } : held.value;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    let bytes = 0;
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > MAX_STDIN_BYTES) { process.stdin.destroy(); reject(new Error("stdin is larger than 1 MB")); return; }
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

async function main() {
  const argumentsByName = new Map();
  for (let index = 2; index < process.argv.length; index += 2) argumentsByName.set(process.argv[index], process.argv[index + 1]);
  const source = await readStdin();
  let raw = {};
  if (source.trim()) {
    try {
      raw = JSON.parse(source);
    } catch {
      // Node's own message quotes the start of the input; a fixed message never echoes payload text.
      throw new Error("stdin is not valid JSON");
    }
  }
  const result = await recordEvent({ vendor: argumentsByName.get("--vendor"), event: argumentsByName.get("--event"), raw }, argumentsByName.get("--root") || process.cwd());
  if (!result.written) process.stderr.write(`[token-consumption] skipped: ${result.reason}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    // Telemetry is observational and must never block the agent that just completed.
    // File-system errors quote absolute paths; report only their code.
    // Messages can carry a name read back from the snapshot: printable ASCII only, and bounded.
    const message = error.syscall && error.code ? `file system error (${error.code})` : String(error.message).replace(/[^\x20-\x7e]/g, "?").slice(0, 160);
    process.stderr.write(`[token-consumption] ${message}\n`);
  });
}

module.exports = { recordEvent, normalizedEvent, applyToSnapshot, blankSnapshot };
