#!/usr/bin/env node
/*
 * Records one bounded, local snapshot of agent consumption. It deliberately
 * stores identifiers and numeric usage only: never prompts, responses, or transcripts.
 */

const fs = require("node:fs");
const path = require("node:path");

const METRICS_DIRECTORY = path.join(".project", "metrics");
const SNAPSHOT_NAME = "token-consumption.json";
const MARKDOWN_NAME = "token-consumption.md";
const HTML_NAME = "token-consumption.html";
const RECENT_KEYS_LIMIT = 100;

function numberOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function textOrNull(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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
    vendors: {},
  };
}

function blankSnapshot() {
  return {
    schemaVersion: 1,
    updatedAt: null,
    current: null,
    previous: null,
    lifetime: blankTotals(),
    recentEventKeys: [],
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

  const vendor = (totals.vendors[record.vendor] ||= { completions: 0, reportedUsageCount: 0, unavailableCount: 0, reportedCostUsd: 0 });
  vendor.completions = Math.max(0, vendor.completions + direction);
  if (record.tokens.total === null) vendor.unavailableCount = Math.max(0, vendor.unavailableCount + direction);
  else vendor.reportedUsageCount = Math.max(0, vendor.reportedUsageCount + direction);
  if (record.costUsd !== null) vendor.reportedCostUsd = Math.max(0, vendor.reportedCostUsd + record.costUsd * direction);
}

function normalizedEvent(input, root = process.cwd()) {
  const vendor = textOrNull(input.vendor) || "unknown";
  const raw = input.raw || input;
  const usage = raw.usage || raw.tool_response?.usage || raw.tool_response?.result?.usage || raw.tokens || {};
  const tokens = tokensFrom(usage);
  const scope = textOrNull(input.metricScope) || (vendor === "claude" && tokens.total !== null ? "final_request" : tokens.total !== null ? "agent_total" : "completion");
  const availability = tokens.total === null ? "unavailable" : scope === "agent_total" ? "reported" : "partial";
  const agentId = textOrNull(input.agentId) || textOrNull(raw.agent_id) || textOrNull(raw.agentId);
  const agentType = textOrNull(input.agentType) || textOrNull(raw.agent_type) || textOrNull(raw.agentType) || textOrNull(raw.tool_input?.subagent_type);
  const sessionId = textOrNull(input.sessionId) || textOrNull(raw.session_id) || textOrNull(raw.sessionId);
  const turnId = textOrNull(input.turnId) || textOrNull(raw.turn_id) || textOrNull(raw.turnId);
  const model = textOrNull(input.model) || textOrNull(raw.model) || textOrNull(raw.resolvedModel) || textOrNull(raw.tool_response?.resolvedModel);
  const event = textOrNull(input.event) || textOrNull(raw.hook_event_name) || "agent-complete";
  const idempotencyKey =
    textOrNull(input.idempotencyKey) ||
    textOrNull(raw.message_id) ||
    textOrNull(raw.messageId) ||
    textOrNull(raw.tool_use_id) ||
    textOrNull(raw.toolUseId) ||
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
    status: textOrNull(input.status) || textOrNull(raw.stop_reason) || textOrNull(raw.tool_response?.status) || "completed",
    metricScope: scope,
    availability,
    tokens,
    costUsd: numberOrNull(input.costUsd ?? raw.cost ?? raw.cost_usd),
    mode: currentCavemanMode(root),
  };
}

function readSnapshot(snapshotPath) {
  try {
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
    if (snapshot.schemaVersion === 1 && snapshot.lifetime && Array.isArray(snapshot.recentEventKeys)) return snapshot;
  } catch {
    // A malformed local metrics file must not break an agent completion hook.
  }
  return blankSnapshot();
}

function formatNumber(value) {
  return value === null || value === undefined ? "Unavailable" : new Intl.NumberFormat("en-US").format(value);
}

function formatCost(value) {
  return value === null || value === undefined ? "Unavailable" : `$${value.toFixed(6)}`;
}

function change(current, previous) {
  if (!current || !previous) return { label: "No prior completion", value: null };
  const currentValue = current.costUsd !== null && previous.costUsd !== null ? current.costUsd : current.tokens.total;
  const previousValue = current.costUsd !== null && previous.costUsd !== null ? previous.costUsd : previous.tokens.total;
  if (currentValue === null || previousValue === null) return { label: "Unavailable", value: null };
  const difference = currentValue - previousValue;
  const unit = current.costUsd !== null && previous.costUsd !== null ? "cost" : "reported tokens";
  return { label: `${difference === 0 ? "No change" : difference > 0 ? "Increased" : "Decreased"} ${unit}`, value: difference };
}

function recordLine(record) {
  return `| ${record.vendor} | ${record.agentType || record.agentId || "agent"} | ${record.model || "Unknown"} | ${formatNumber(record.tokens.total)} | ${formatCost(record.costUsd)} | ${record.availability} | ${record.mode || "Unavailable"} |`;
}

function markdown(snapshot) {
  const delta = change(snapshot.current, snapshot.previous);
  const current = snapshot.current;
  const previous = snapshot.previous;
  const vendors = Object.entries(snapshot.lifetime.vendors)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([vendor, values]) => `| ${vendor} | ${values.completions} | ${values.reportedUsageCount} | ${values.unavailableCount} | ${formatCost(values.reportedCostUsd)} |`)
    .join("\n") || "| None | 0 | 0 | 0 | $0.000000 |";
  return `# Agent Token Consumption

Updated: ${snapshot.updatedAt || "Never"}

This is a bounded local snapshot. It stores numeric usage and identifiers only, never prompts, responses, or transcripts. Reported tokens are the harness-provided input, output, and reasoning fields; cache values are shown separately and are not added to that total.

## Latest Comparison

| Measure | Current | Previous | Change |
|---|---:|---:|---:|
| Reported tokens | ${formatNumber(current?.tokens.total)} | ${formatNumber(previous?.tokens.total)} | ${delta.value === null ? delta.label : formatNumber(delta.value)} |
| Actual cost | ${formatCost(current?.costUsd)} | ${formatCost(previous?.costUsd)} | ${delta.label} |
| Availability | ${current?.availability || "Unavailable"} | ${previous?.availability || "Unavailable"} | ${current?.metricScope || "Unavailable"} |

## Current Completion

| Vendor | Agent | Model | Reported tokens | Actual cost | Availability | Caveman mode |
|---|---|---|---:|---:|---|---|
${current ? recordLine(current) : "| None | - | - | Unavailable | Unavailable | unavailable | Unavailable |"}

## Lifetime Totals

| Completions | Usage reported | Usage unavailable | Reported tokens | Actual cost |
|---:|---:|---:|---:|---:|
| ${snapshot.lifetime.agentCompletions} | ${snapshot.lifetime.reportedUsageCount} | ${snapshot.lifetime.unavailableCount} | ${formatNumber(snapshot.lifetime.tokens.total)} | ${formatCost(snapshot.lifetime.reportedCostUsd)} |

| Input | Output | Reasoning | Cache read | Cache write |
|---:|---:|---:|---:|---:|
| ${formatNumber(snapshot.lifetime.tokens.input)} | ${formatNumber(snapshot.lifetime.tokens.output)} | ${formatNumber(snapshot.lifetime.tokens.reasoning)} | ${formatNumber(snapshot.lifetime.tokens.cacheRead)} | ${formatNumber(snapshot.lifetime.tokens.cacheWrite)} |

## By Vendor

| Vendor | Completions | Usage reported | Usage unavailable | Actual cost |
|---|---:|---:|---:|---:|
${vendors}
`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function html(snapshot) {
  const delta = change(snapshot.current, snapshot.previous);
  const current = snapshot.current;
  const vendorRows = Object.entries(snapshot.lifetime.vendors)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([vendor, values]) => `<tr><td>${escapeHtml(vendor)}</td><td>${values.completions}</td><td>${values.reportedUsageCount}</td><td>${values.unavailableCount}</td><td>${formatCost(values.reportedCostUsd)}</td></tr>`)
    .join("") || "<tr><td>None</td><td>0</td><td>0</td><td>0</td><td>$0.000000</td></tr>";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Agent Token Consumption</title>
<style>
  :root { color-scheme: light dark; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #10151f; color: #edf2f7; }
  body { margin: 0; padding: 32px; background: radial-gradient(circle at top left, #1f3858, #10151f 46%); }
  main { max-width: 980px; margin: auto; } h1 { letter-spacing: -.06em; font-size: clamp(2rem, 7vw, 4.5rem); margin: 0; } p { color: #aebfd2; line-height: 1.55; }
  .cards { display: grid; gap: 12px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 28px 0; } .card, section { background: #17212e; border: 1px solid #2e4259; border-radius: 12px; padding: 18px; }
  .label { color: #91adc8; font-size: .75rem; text-transform: uppercase; letter-spacing: .08em; } .value { font-size: 1.6rem; margin-top: 8px; color: #e2f0ff; }
  table { width: 100%; border-collapse: collapse; overflow: hidden; } th, td { text-align: left; padding: 10px; border-bottom: 1px solid #2e4259; } th { color: #91adc8; font-size: .75rem; text-transform: uppercase; } td:not(:first-child) { text-align: right; }
  @media (max-width: 640px) { body { padding: 18px; } .cards { grid-template-columns: 1fr; } section { overflow-x: auto; } }
</style>
</head>
<body><main>
<p class="label">Local consumption snapshot</p><h1>Agent Token Consumption</h1>
<p>Updated ${escapeHtml(snapshot.updatedAt || "Never")}. Stores numeric usage and identifiers only. Actual cost appears only when a harness reports it.</p>
<div class="cards"><div class="card"><div class="label">Current reported tokens</div><div class="value">${formatNumber(current?.tokens.total)}</div></div><div class="card"><div class="label">Change from previous</div><div class="value">${delta.value === null ? escapeHtml(delta.label) : formatNumber(delta.value)}</div></div><div class="card"><div class="label">Lifetime actual cost</div><div class="value">${formatCost(snapshot.lifetime.reportedCostUsd)}</div></div></div>
<section><h2>Current Completion</h2><table><thead><tr><th>Vendor</th><th>Agent</th><th>Model</th><th>Tokens</th><th>Cost</th><th>Scope</th><th>Caveman mode</th></tr></thead><tbody><tr><td>${escapeHtml(current?.vendor || "None")}</td><td>${escapeHtml(current?.agentType || current?.agentId || "-")}</td><td>${escapeHtml(current?.model || "-")}</td><td>${formatNumber(current?.tokens.total)}</td><td>${formatCost(current?.costUsd)}</td><td>${escapeHtml(current?.metricScope || "-")}</td><td>${escapeHtml(current?.mode || "Unavailable")}</td></tr></tbody></table></section>
<section><h2>Lifetime</h2><table><thead><tr><th>Completions</th><th>Usage reported</th><th>Usage unavailable</th><th>Reported tokens</th><th>Actual cost</th></tr></thead><tbody><tr><td>${snapshot.lifetime.agentCompletions}</td><td>${snapshot.lifetime.reportedUsageCount}</td><td>${snapshot.lifetime.unavailableCount}</td><td>${formatNumber(snapshot.lifetime.tokens.total)}</td><td>${formatCost(snapshot.lifetime.reportedCostUsd)}</td></tr></tbody></table></section>
<section><h2>By Vendor</h2><table><thead><tr><th>Vendor</th><th>Completions</th><th>Usage reported</th><th>Usage unavailable</th><th>Actual cost</th></tr></thead><tbody>${vendorRows}</table></section>
</main></body></html>
`;
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

function recordEvent(input, root = process.cwd()) {
  const project = path.join(root, ".project");
  if (!fs.existsSync(project)) return { written: false, reason: ".project is not initialized" };
  const directory = path.join(root, METRICS_DIRECTORY);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  return withLock(directory, () => {
    const snapshotPath = path.join(directory, SNAPSHOT_NAME);
    const snapshot = readSnapshot(snapshotPath);
    const record = normalizedEvent(input, root);
    if (record.id && snapshot.recentEventKeys.includes(record.id)) return { written: false, reason: "duplicate event", snapshot };
    const existing = [snapshot.current, snapshot.previous].find((candidate) => candidate?.identityKey === record.identityKey);
    const canUpgradeClaudeCompletion =
      record.vendor === "claude" &&
      record.event === "agent-result" &&
      snapshot.current?.vendor === "claude" &&
      snapshot.current.availability === "unavailable" &&
      record.agentType &&
      record.agentType === snapshot.current.agentType;
    if (existing) {
      applyRecord(snapshot.lifetime, existing, -1);
      applyRecord(snapshot.lifetime, record, 1);
      if (snapshot.current?.identityKey === record.identityKey) snapshot.current = record;
      else snapshot.previous = record;
    } else if (canUpgradeClaudeCompletion) {
      applyRecord(snapshot.lifetime, snapshot.current, -1);
      applyRecord(snapshot.lifetime, record, 1);
      snapshot.current = record;
    } else {
      snapshot.previous = snapshot.current;
      snapshot.current = record;
      applyRecord(snapshot.lifetime, record, 1);
    }
    snapshot.updatedAt = record.recordedAt;
    if (record.id) snapshot.recentEventKeys = [record.id, ...snapshot.recentEventKeys.filter((key) => key !== record.id)].slice(0, RECENT_KEYS_LIMIT);
    writeAtomically(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
    writeAtomically(path.join(directory, MARKDOWN_NAME), markdown(snapshot));
    writeAtomically(path.join(directory, HTML_NAME), html(snapshot));
    return { written: true, snapshot, record };
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
  const raw = source.trim() ? JSON.parse(source) : {};
  const result = recordEvent({ vendor: argumentsByName.get("--vendor"), event: argumentsByName.get("--event"), raw }, argumentsByName.get("--root") || process.cwd());
  if (!result.written) process.stderr.write(`[token-consumption] skipped: ${result.reason}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    // Telemetry is observational and must never block the agent that just completed.
    process.stderr.write(`[token-consumption] ${error.message}\n`);
  });
}

module.exports = { recordEvent, normalizedEvent };
