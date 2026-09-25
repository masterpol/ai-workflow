#!/usr/bin/env node
/*
 * Records one bounded, local snapshot of agent consumption. It deliberately
 * stores identifiers and numeric usage only: never prompts, responses, or transcripts.
 */

const fs = require("node:fs");
const path = require("node:path");
const { markdown, html } = require("./token-report.js");

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

function textOrNull(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// Names come from hook payloads, so they are bounded and limited to identifier characters
// before they become keys or identities. Anything else (Markdown, HTML, control characters,
// free text) is reported as (other) instead of being stored.
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
    if (!fs.existsSync(full)) return null;
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
    const explicit = textOrNull(caveman.default);
    if (explicit) return explicit;
    const catalog = require("../../integrations/skill-defaults.json");
    const entry = catalog.defaults?.find((item) => typeof item.id === "string" && item.id.endsWith("/caveman"));
    return textOrNull(entry?.defaultMode);
  } catch {
    return null;
  }
}

function tokensFrom(raw = {}) {
  const cache = raw.cache || {};
  const tokens = {
    input: numberOrNull(raw.input ?? raw.input_tokens),
    output: numberOrNull(raw.output ?? raw.output_tokens),
    reasoning: numberOrNull(raw.reasoning ?? raw.reasoning_tokens),
    cacheRead: numberOrNull(cache.read ?? raw.cache_read_input_tokens),
    cacheWrite: numberOrNull(cache.write ?? raw.cache_creation_input_tokens),
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
  const model = boundedName(input.model) || boundedName(raw.model) || boundedName(raw.resolvedModel) || boundedName(raw.tool_response?.resolvedModel);
  const effort = boundedName(input.effort) || boundedName(raw.effort?.level) || boundedName(raw.effort) || boundedName(raw.variant);
  const event = textOrNull(input.event) || textOrNull(raw.hook_event_name) || "agent-complete";
  const idempotencyKey =
    boundedId(input.idempotencyKey) ||
    boundedId(raw.message_id) ||
    boundedId(raw.messageId) ||
    boundedId(raw.tool_use_id) ||
    boundedId(raw.toolUseId) ||
    (event === "subagent-complete" && (agentId || agentType) ? [sessionId, agentId || agentType, event].filter(Boolean).join(":") : null);
  const identity = idempotencyKey || (sessionId ? [sessionId, agentId || agentType, turnId].filter(Boolean).join(":") : agentId || [agentType, model, turnId].filter(Boolean).join(":"));
  const identityKey = `${vendor}:${identity || `${agentType || "agent"}:${model || "unknown"}`}`;
  return {
    id: idempotencyKey ? `${vendor}:${idempotencyKey}` : null,
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

function readSnapshot(snapshotPath) {
  try {
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
    const usable = snapshot.lifetime && Array.isArray(snapshot.recentEventKeys);
    // v1 predates the dimension aggregates: keep its lifetime totals and start the dimensions now.
    // Its stored records carry no `dimensions.applied` flag, so reversing one never touches them.
    if (usable && snapshot.schemaVersion === 1) return reviveMaps({ ...snapshot, schemaVersion: 2, dimensions: blankDimensions(new Date().toISOString()) });
    if (usable && snapshot.schemaVersion === 2) return reviveMaps(snapshot);
  } catch {
    // A malformed local metrics file must not break an agent completion hook.
  }
  return blankSnapshot();
}

function writeAtomically(target, content) {
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, content, { mode: 0o600 });
  fs.renameSync(temporary, target);
}

function withLock(directory, action) {
  const lock = path.join(directory, ".token-consumption.lock");
  const reclaim = () => {
    const staleLock = `${lock}.${process.pid}.${Date.now()}.stale`;
    try {
      fs.renameSync(lock, staleLock);
      fs.rmSync(staleLock, { force: true });
    } catch {}
  };
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const descriptor = fs.openSync(lock, "wx", 0o600);
      try {
        fs.writeSync(descriptor, String(process.pid));
        return action();
      } finally {
        fs.closeSync(descriptor);
        fs.rmSync(lock, { force: true });
      }
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      try {
        const owner = Number(fs.readFileSync(lock, "utf8"));
        if (Number.isInteger(owner) && owner > 0) {
          process.kill(owner, 0);
        } else if (Date.now() - fs.statSync(lock).mtimeMs > 1000) {
          reclaim();
        }
      } catch (lockError) {
        if (lockError.code === "ESRCH") reclaim();
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
  throw new Error("timed out waiting for token-consumption metrics lock");
}

// An async Claude subagent fires PostToolUse(Agent) at launch, not completion, so that event is
// not a completion: it only leaves a model note for the SubagentStop that follows, which has none.
function rememberAgentModel(snapshot, record) {
  if (record.agentId && record.model) snapshot.agentModels[`agent:${record.agentId}`] = record.model;
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
  const noteKey = `agent:${record.agentId}`;
  if (!record.model && record.event === "subagent-complete" && record.agentId && snapshot.agentModels[noteKey]) {
    record.model = snapshot.agentModels[noteKey];
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

function staysUnderRoot(root, target) {
  try {
    const relative = path.relative(fs.realpathSync(root), fs.realpathSync(target));
    return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  } catch {
    return false;
  }
}

function recordEvent(input, root = process.cwd()) {
  const project = path.join(root, ".project");
  if (!fs.existsSync(project)) return { written: false, reason: ".project is not initialized" };
  const directory = path.join(root, METRICS_DIRECTORY);
  // A cloned repo can commit .project or .project/metrics as a symlink. Resolve both before
  // anything is created or written, and refuse to leave the project root.
  if (!staysUnderRoot(root, project)) return { written: false, reason: ".project resolves outside the project root" };
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (!staysUnderRoot(root, directory)) return { written: false, reason: "metrics directory resolves outside the project root" };
  return withLock(directory, () => {
    const snapshotPath = path.join(directory, SNAPSHOT_NAME);
    const snapshot = readSnapshot(snapshotPath);
    const outcome = textOrNull(input.event) === "skill-use" ? recordSkillUse(snapshot, input) : recordCompletion(snapshot, input, root);
    if (!outcome.written) return { ...outcome, snapshot };
    snapshot.updatedAt ||= new Date().toISOString();
    snapshot.dimensions.since ||= snapshot.updatedAt;
    writeAtomically(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
    writeAtomically(path.join(directory, MARKDOWN_NAME), markdown(snapshot));
    writeAtomically(path.join(directory, HTML_NAME), html(snapshot));
    return { ...outcome, snapshot };
  });
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
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
  const result = recordEvent({ vendor: argumentsByName.get("--vendor"), event: argumentsByName.get("--event"), raw }, argumentsByName.get("--root") || process.cwd());
  if (!result.written) process.stderr.write(`[token-consumption] skipped: ${result.reason}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    // Telemetry is observational and must never block the agent that just completed.
    process.stderr.write(`[token-consumption] ${error.message}\n`);
  });
}

module.exports = { recordEvent, normalizedEvent, applyToSnapshot, blankSnapshot };
