import { runDirect } from "../../scripts/runtime/cli.mts";
/*
 * Renders a schema v2 token-consumption snapshot as Markdown and as a static HTML page.
 * Pure functions: no file access, no side effects. Every name in a snapshot came from a hook
 * payload, so it is escaped for its output format and never split: the renderer always
 * iterates vendor, then name.
 */

const UNREPORTED = "(unreported)";
const OTHER = "(other)";
const UNITS = new Map([["opencode", "assistant messages"], ["claude", "subagent runs"], ["codex", "subagent runs"]]);
const NO_DATA = "No data yet";

type Plain = Record<string, unknown>;
type RowField = "completions" | "reportedUsageCount" | "unavailableCount" | "tokens" | "costUsd" | "pricedCount" | "uses";
type Row = Record<RowField, number>;
type Dimension = Record<string, Record<string, Row>>;
type VendorField = "completions" | "reportedUsageCount" | "unavailableCount" | "reportedCostUsd" | "pricedCount";
type VendorTotals = Record<VendorField, number>;

interface CleanRecord {
  vendor: string;
  agentType: string | null;
  agentId: string | null;
  model: string | null;
  tokens: { total: number | null };
  costUsd: number | null;
  availability: string;
  metricScope: string | null;
  mode: string | null;
}

interface CleanSnapshot {
  updatedAt: string | null;
  current: CleanRecord | null;
  previous: CleanRecord | null;
  lifetime: {
    agentCompletions: number;
    reportedUsageCount: number;
    unavailableCount: number;
    reportedCostUsd: number;
    tokens: Record<string, number>;
    vendors: Record<string, VendorTotals>;
  };
  dimensions: { since: string | null; models: Dimension; agents: Dimension; efforts: Dimension; skills: Dimension };
}

interface Table { headers: string[]; textColumns: number; rows: string[][] }
interface Collected { vendor: string; name: string; row: Partial<Row> }
interface RankEntry { label: string; vendor: string; completions: number; tokens: number | null; reported?: number; lifetime?: boolean }
interface Ranked { top: RankEntry | null; basis: "tokens" | "completions" }

function unitFor(vendor: string): string {
  return UNITS.get(vendor) || "completions";
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "Unavailable" : new Intl.NumberFormat("en-US").format(value);
}

function formatCost(value: number | null | undefined): string {
  return value === null || value === undefined ? "Unavailable" : `$${value.toFixed(6)}`;
}

function change(current: CleanRecord | null, previous: CleanRecord | null): { label: string; value: number | null } {
  if (!current || !previous) return { label: "No prior completion", value: null };
  const currentValue = current.costUsd !== null && previous.costUsd !== null ? current.costUsd : current.tokens.total;
  const previousValue = current.costUsd !== null && previous.costUsd !== null ? previous.costUsd : previous.tokens.total;
  if (currentValue === null || previousValue === null) return { label: "Unavailable", value: null };
  const difference = currentValue - previousValue;
  const unit = current.costUsd !== null && previous.costUsd !== null ? "cost" : "reported tokens";
  return { label: `${difference === 0 ? "No change" : difference > 0 ? "Increased" : "Decreased"} ${unit}`, value: difference };
}

const HTML_ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);
}

// A name must not add a column, end a row, or inject markup into a Markdown table cell.
// Opaque ids (agent id, session id) are only length-bounded when recorded, so any label shown
// from one must pass the same identifier allow-list that names do; anything else shows as (other).
const SAFE_LABEL = /^[\w.:/@+-]{1,128}$/;
function safeLabel(value: unknown): string {
  return typeof value === "string" && SAFE_LABEL.test(value) ? value : "(other)";
}

// GitHub-flavored Markdown turns a bare "https://..." or "www...." into a link even inside a table cell, and an
// "a@b.c" into a mail link; the characters that trigger it are written as entities, which read the same.
function mdCell(value: unknown): string {
  return String(value).replace(/\r?\n|\r/g, " ").replace(/\|/g, "\\|").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/:\/\//g, "&#58;//").replace(/www\./gi, "www&#46;").replace(/@/g, "&#64;");
}

function recordLine(record: CleanRecord): string {
  return `| ${mdCell(record.vendor)} | ${mdCell(safeLabel(record.agentType || record.agentId || "agent"))} | ${mdCell(record.model || "Unknown")} | ${formatNumber(record.tokens.total)} | ${formatCost(record.costUsd)} | ${record.availability} | ${mdCell(record.mode || "Unavailable")} |`;
}

// Snapshot maps are prototype-free at runtime but may be plain objects in a fixture, so they are
// read only through Object.entries (own keys) and never assigned to.
function entries<T = unknown>(map: unknown): [string, T][] {
  return map && typeof map === "object" ? (Object.entries(map) as [string, T][]) : [];
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function displayName(name: string): string {
  if (name === UNREPORTED) return "Unreported";
  if (name === OTHER) return "Other (overflow)";
  return name;
}

function collect(byVendor: unknown): Collected[] {
  const rows: Collected[] = [];
  for (const [vendor, byName] of entries(byVendor)) {
    for (const [name, row] of entries(byName)) rows.push({ vendor, name, row: row && typeof row === "object" ? (row as Partial<Row>) : {} });
  }
  return rows;
}

const hasTokens = (row: Partial<Row>): boolean => count(row.reportedUsageCount) > 0;

function sortRows(rows: Collected[]): Collected[] {
  return rows.sort((left, right) =>
    left.vendor.localeCompare(right.vendor) ||
    (hasTokens(right.row) ? count(right.row.tokens) : -1) - (hasTokens(left.row) ? count(left.row.tokens) : -1) ||
    count(right.row.completions) - count(left.row.completions) ||
    left.name.localeCompare(right.name));
}

function costCell(row: Partial<Row>): string {
  return count(row.pricedCount) > 0 ? formatCost(count(row.costUsd)) : "Unpriced";
}

function dimensionTable(byVendor: unknown, nameHeader: string): Table {
  const rows = sortRows(collect(byVendor)).map(({ vendor, name, row }) => [
    vendor,
    unitFor(vendor),
    displayName(name),
    formatNumber(count(row.completions)),
    formatNumber(count(row.reportedUsageCount)),
    hasTokens(row) ? formatNumber(count(row.tokens)) : "Unavailable",
    costCell(row),
  ]);
  return { headers: ["Vendor", "Unit", nameHeader, "Completions", "Usage reported", "Reported tokens", "Actual cost"], textColumns: 3, rows };
}

function skillTable(byVendor: unknown): Table {
  const rows = collect(byVendor)
    .map(({ vendor, name, row }) => ({ vendor, name, uses: count(row.uses) }))
    .sort((left, right) => left.vendor.localeCompare(right.vendor) || right.uses - left.uses || left.name.localeCompare(right.name))
    .map(({ vendor, name, uses }) => [vendor, displayName(name), formatNumber(uses)]);
  return { headers: ["Vendor", "Skill", "Uses"], textColumns: 2, rows };
}

// Rank by reported tokens among entries that reported usage; a missing total is not zero. Only when
// no entry reports tokens does the ranking fall back to completions, and the basis says so.
function rank(candidates: RankEntry[]): Ranked {
  const reported = candidates.filter((entry) => entry.tokens !== null);
  const pool = reported.length > 0 ? reported : candidates;
  const basis = reported.length > 0 ? "tokens" : "completions";
  pool.sort((left, right) =>
    (basis === "tokens" ? (right.tokens as number) - (left.tokens as number) : 0) || right.completions - left.completions || left.label.localeCompare(right.label));
  return { top: pool[0] || null, basis };
}

function entryText(entry: RankEntry): string {
  const detail = entry.tokens !== null ? `${formatNumber(entry.tokens)} reported tokens, ${formatNumber(entry.completions)} ${unitFor(entry.vendor)}` : `${formatNumber(entry.completions)} ${unitFor(entry.vendor)}`;
  return `${entry.label} (${detail})`;
}

function basisText(result: Ranked): string {
  if (!result.top) return "not available";
  if (result.top.lifetime) return "completions, because per-vendor token totals are not recorded yet";
  return result.basis === "tokens" ? "reported tokens, counting only entries that reported usage" : "completions, because no entry reported tokens";
}

// Vendor totals come from the model rows so tokens and completions share one time window
// (dimensions.since). With no model rows they fall back to the lifetime vendor table, which has
// completions but no token totals, so that ranking is by completions and says so.
function vendorEntries(snapshot: CleanSnapshot, models: Collected[]): RankEntry[] {
  const byVendor = new Map<string, { label: string; vendor: string; completions: number; reported: number; tokens: number; lifetime?: boolean }>();
  for (const { vendor, row } of models) {
    const entry = byVendor.get(vendor) || { label: vendor, vendor, completions: 0, reported: 0, tokens: 0 };
    entry.completions += count(row.completions);
    entry.reported += count(row.reportedUsageCount);
    entry.tokens += hasTokens(row) ? count(row.tokens) : 0;
    byVendor.set(vendor, entry);
  }
  if (byVendor.size === 0) {
    for (const [vendor, values] of entries<Partial<VendorTotals> | undefined>(snapshot.lifetime?.vendors)) {
      byVendor.set(vendor, { label: vendor, vendor, completions: count(values?.completions), reported: count(values?.reportedUsageCount), tokens: 0, lifetime: true });
    }
  }
  return [...byVendor.values()]
    .filter((entry) => entry.completions > 0)
    .map((entry) => ({ ...entry, tokens: entry.reported > 0 && !entry.lifetime ? entry.tokens : null }));
}

function unitLegend(vendors: Iterable<string>): string {
  const byUnit = new Map<string, string[]>();
  for (const vendor of [...vendors].sort((left, right) => left.localeCompare(right))) {
    const unit = unitFor(vendor);
    byUnit.set(unit, [...(byUnit.get(unit) || []), vendor]);
  }
  return [...byUnit].map(([unit, names]) => `${names.join(", ")}: ${unit}`).join("; ");
}

function knownVendors(snapshot: CleanSnapshot): Set<string> {
  const dimensions: Partial<CleanSnapshot["dimensions"]> = snapshot.dimensions || {};
  const names = new Set(entries(snapshot.lifetime?.vendors).map(([vendor]) => vendor));
  for (const dimension of [dimensions.models, dimensions.agents, dimensions.efforts]) for (const [vendor] of entries(dimension)) names.add(vendor);
  return names;
}

// Plain-text lines shared by both formats. They contain untrusted names, so each renderer escapes them.
function usageLines(snapshot: CleanSnapshot): string[] {
  const models = collect(snapshot.dimensions?.models);
  const vendors = vendorEntries(snapshot, models);
  const namedModels = models
    .filter(({ name, row }) => name !== UNREPORTED && name !== OTHER && count(row.completions) > 0)
    .map(({ vendor, name, row }) => ({ label: `${vendor} / ${name}`, vendor, completions: count(row.completions), tokens: hasTokens(row) ? count(row.tokens) : null }));
  const topVendor = rank(vendors);
  const topModel = rank(namedModels);
  const lines = [
    `Most used vendor: ${topVendor.top ? entryText(topVendor.top) : NO_DATA}`,
    `Most used model: ${topModel.top ? entryText(topModel.top) : NO_DATA}`,
  ];
  if (!topVendor.top) {
    lines.push("Ranking basis: no completions recorded yet.");
    return lines;
  }
  const [vendorBasis, modelBasis] = [basisText(topVendor), basisText(topModel)];
  lines.push(`Ranking basis: ${vendorBasis === modelBasis ? `vendors and models by ${vendorBasis}` : `vendors by ${vendorBasis}; models by ${modelBasis}`}. Missing tokens are never counted as zero.`);
  const silent = vendors.filter((entry) => entry.reported === 0).map((entry) => entry.vendor).sort((left, right) => left.localeCompare(right));
  if (silent.length > 0) lines.push(`${silent.join(", ")} ${silent.length === 1 ? "reports" : "report"} no tokens.`);
  lines.push(`Units: ${unitLegend(knownVendors(snapshot))}. Completions are not comparable across units.`);
  return lines;
}

function sinceLine(snapshot: CleanSnapshot): string {
  const since = snapshot.dimensions?.since;
  return `${since ? `Dimensions counted since ${since}` : "Not yet counted"}. Completions recorded before that are not back-filled.`;
}

const COST_NOTE = "Actual cost is summed over completions that reported a nonzero cost; Unpriced means none did.";

function vendorUnitTable(snapshot: CleanSnapshot): Table {
  const vendors = [...knownVendors(snapshot)].sort((left, right) => left.localeCompare(right));
  return { headers: ["Vendor", "Completions unit"], textColumns: 2, rows: vendors.map((vendor) => [vendor, unitFor(vendor)]) };
}

function views(snapshot: CleanSnapshot): { title: string; table: Table }[] {
  const dimensions: Partial<CleanSnapshot["dimensions"]> = snapshot.dimensions || {};
  return [
    { title: "By Vendor Unit", table: vendorUnitTable(snapshot) },
    { title: "By Model", table: dimensionTable(dimensions.models, "Model") },
    { title: "By Agent", table: dimensionTable(dimensions.agents, "Agent") },
    { title: "By Effort", table: dimensionTable(dimensions.efforts, "Effort") },
    { title: "Skills", table: skillTable(dimensions.skills) },
  ];
}

function markdownTable({ headers, textColumns, rows }: Table): string {
  const alignment = headers.map((_, index) => (index < textColumns ? "---" : "---:"));
  const body = rows.length > 0 ? rows : [["None", ...headers.slice(1).map(() => "-")]];
  return [`| ${headers.join(" | ")} |`, `|${alignment.join("|")}|`, ...body.map((row) => `| ${row.map(mdCell).join(" | ")} |`)].join("\n");
}

// The renderer never trusts the file it is given. The collector sanitizes on the way in, but the snapshot is a
// plain file anyone can edit, so every string is re-checked against the identifier allow-list here (again, at
// the place it is written), every number is forced finite, and every date must look like one. What comes out of
// this function is safe to interpolate into Markdown and HTML, and cannot make the renderer throw.
const DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const MODE = /^[a-z][a-z-]{0,23}$/;
const AVAILABILITY = new Set(["reported", "partial", "unavailable"]);
const plain = (value: unknown): Plain => (value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Plain) : {});
const label = (value: unknown, fallback: string = OTHER): string => (value === UNREPORTED || value === OTHER ? value : typeof value === "string" && SAFE_LABEL.test(value) ? value : fallback);
const numberOrNull = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const date = (value: unknown): string | null => (typeof value === "string" && DATE.test(value) ? value : null);

function cleanRecord(input: unknown): CleanRecord | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Plain;
  return {
    vendor: label(record.vendor, "unknown"),
    agentType: record.agentType ? label(record.agentType) : null,
    agentId: record.agentId ? label(record.agentId) : null,
    model: record.model ? label(record.model) : null,
    tokens: { total: numberOrNull(plain(record.tokens).total) },
    costUsd: numberOrNull(record.costUsd),
    availability: typeof record.availability === "string" && AVAILABILITY.has(record.availability) ? record.availability : "unavailable",
    metricScope: record.metricScope ? label(record.metricScope) : null,
    mode: typeof record.mode === "string" && MODE.test(record.mode) ? record.mode : null,
  };
}

const ROW_FIELDS: RowField[] = ["completions", "reportedUsageCount", "unavailableCount", "tokens", "costUsd", "pricedCount", "uses"];
function cleanDimension(byVendor: unknown): Dimension {
  const cleaned: Dimension = Object.create(null);
  for (const [vendor, byName] of entries(byVendor)) {
    const target = (cleaned[label(vendor, "unknown")] ||= Object.create(null) as Record<string, Row>);
    for (const [name, row] of entries(byName)) {
      // Two hostile names can fold into the same label; their rows are added, never dropped.
      const merged = (target[label(name)] ||= Object.fromEntries(ROW_FIELDS.map((field) => [field, 0])) as Row);
      for (const field of ROW_FIELDS) merged[field] += count(plain(row)[field]);
    }
  }
  return cleaned;
}

function cleanSnapshot(snapshot: unknown): CleanSnapshot {
  const source = plain(snapshot);
  const lifetime = plain(source.lifetime);
  const tokens = plain(lifetime.tokens);
  const vendors: Record<string, VendorTotals> = Object.create(null);
  for (const [vendor, values] of entries(lifetime.vendors)) {
    const target = (vendors[label(vendor, "unknown")] ||= { completions: 0, reportedUsageCount: 0, unavailableCount: 0, reportedCostUsd: 0, pricedCount: 0 });
    for (const field of Object.keys(target) as VendorField[]) target[field] += count(plain(values)[field]);
  }
  const dimensions = plain(source.dimensions);
  return {
    updatedAt: date(source.updatedAt),
    current: cleanRecord(source.current),
    previous: cleanRecord(source.previous),
    lifetime: {
      agentCompletions: count(lifetime.agentCompletions),
      reportedUsageCount: count(lifetime.reportedUsageCount),
      unavailableCount: count(lifetime.unavailableCount),
      reportedCostUsd: count(lifetime.reportedCostUsd),
      tokens: Object.fromEntries(["input", "output", "reasoning", "cacheRead", "cacheWrite", "total"].map((key) => [key, count(tokens[key])])),
      vendors,
    },
    dimensions: { since: date(dimensions.since), models: cleanDimension(dimensions.models), agents: cleanDimension(dimensions.agents), efforts: cleanDimension(dimensions.efforts), skills: cleanDimension(dimensions.skills) },
  };
}

export function markdown(input: unknown): string {
  const snapshot = cleanSnapshot(input);
  const delta = change(snapshot.current, snapshot.previous);
  const current = snapshot.current;
  const previous = snapshot.previous;
  const vendors = entries<VendorTotals>(snapshot.lifetime.vendors)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([vendor, values]) => `| ${mdCell(vendor)} | ${values.completions} | ${values.reportedUsageCount} | ${values.unavailableCount} | ${formatCost(values.reportedCostUsd)} |`)
    .join("\n") || "| None | 0 | 0 | 0 | $0.000000 |";
  const dimensionSections = views(snapshot).map(({ title, table }) => `## ${title}\n\n${markdownTable(table)}`).join("\n\n");
  return `# Agent Token Consumption

Updated: ${snapshot.updatedAt || "Never"}

This is a bounded local snapshot. It stores numeric usage and identifiers only, never prompts, responses, or transcripts. Reported tokens are the harness-provided input, output, and reasoning fields; cache values are shown separately and are not added to that total.

## Usage

${usageLines(snapshot).map((line) => `- ${mdCell(line)}`).join("\n")}

## Latest Comparison

| Measure | Current | Previous | Change |
|---|---:|---:|---:|
| Reported tokens | ${formatNumber(current?.tokens.total)} | ${formatNumber(previous?.tokens.total)} | ${delta.value === null ? delta.label : formatNumber(delta.value)} |
| Actual cost | ${formatCost(current?.costUsd)} | ${formatCost(previous?.costUsd)} | ${delta.label} |
| Availability | ${current?.availability || "Unavailable"} | ${previous?.availability || "Unavailable"} | ${mdCell(current?.metricScope || "Unavailable")} |

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

${mdCell(sinceLine(snapshot))} ${COST_NOTE}

${dimensionSections}
`;
}

function htmlTable({ headers, textColumns, rows }: Table): string {
  const body = rows.length > 0 ? rows : [["None", ...headers.slice(1).map(() => "-")]];
  const head = headers.map((header, index) => `<th${index < textColumns ? "" : ' class="n"'}>${escapeHtml(header)}</th>`).join("");
  const cells = body.map((row) => `<tr>${row.map((cell, index) => `<td${index < textColumns ? ' class="t"' : ""}>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${cells}</tbody></table>`;
}

export function html(input: unknown): string {
  const snapshot = cleanSnapshot(input);
  const delta = change(snapshot.current, snapshot.previous);
  const current = snapshot.current;
  const vendorRows = entries<VendorTotals>(snapshot.lifetime.vendors)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([vendor, values]) => `<tr><td>${escapeHtml(vendor)}</td><td>${values.completions}</td><td>${values.reportedUsageCount}</td><td>${values.unavailableCount}</td><td>${formatCost(values.reportedCostUsd)}</td></tr>`)
    .join("") || "<tr><td>None</td><td>0</td><td>0</td><td>0</td><td>$0.000000</td></tr>";
  const usage = usageLines(snapshot).map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  const dimensionSections = views(snapshot).map(({ title, table }) => `<section><h2>${escapeHtml(title)}</h2>${htmlTable(table)}</section>`).join("\n");
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
  section { margin-bottom: 12px; }
  .label { color: #91adc8; font-size: .75rem; text-transform: uppercase; letter-spacing: .08em; } .value { font-size: 1.6rem; margin-top: 8px; color: #e2f0ff; }
  table { width: 100%; border-collapse: collapse; overflow: hidden; } th, td { text-align: left; padding: 10px; border-bottom: 1px solid #2e4259; } th { color: #91adc8; font-size: .75rem; text-transform: uppercase; } td:not(:first-child) { text-align: right; } td.t { text-align: left; } th.n { text-align: right; }
  @media (max-width: 640px) { body { padding: 18px; } .cards { grid-template-columns: 1fr; } section { overflow-x: auto; } }
</style>
</head>
<body><main>
<p class="label">Local consumption snapshot</p><h1>Agent Token Consumption</h1>
<p>Updated ${escapeHtml(snapshot.updatedAt || "Never")}. Stores numeric usage and identifiers only. Actual cost appears only when a harness reports it.</p>
<section><h2>Usage</h2>${usage}</section>
<div class="cards"><div class="card"><div class="label">Current reported tokens</div><div class="value">${formatNumber(current?.tokens.total)}</div></div><div class="card"><div class="label">Change from previous</div><div class="value">${delta.value === null ? escapeHtml(delta.label) : formatNumber(delta.value)}</div></div><div class="card"><div class="label">Lifetime actual cost</div><div class="value">${formatCost(snapshot.lifetime.reportedCostUsd)}</div></div></div>
<section><h2>Current Completion</h2><table><thead><tr><th>Vendor</th><th>Agent</th><th>Model</th><th>Tokens</th><th>Cost</th><th>Scope</th><th>Caveman mode</th></tr></thead><tbody><tr><td>${escapeHtml(current?.vendor || "None")}</td><td>${escapeHtml(current?.agentType || current?.agentId ? safeLabel(current.agentType || current.agentId) : "-")}</td><td>${escapeHtml(current?.model || "-")}</td><td>${formatNumber(current?.tokens.total)}</td><td>${formatCost(current?.costUsd)}</td><td>${escapeHtml(current?.metricScope || "-")}</td><td>${escapeHtml(current?.mode || "Unavailable")}</td></tr></tbody></table></section>
<section><h2>Lifetime</h2><table><thead><tr><th>Completions</th><th>Usage reported</th><th>Usage unavailable</th><th>Reported tokens</th><th>Actual cost</th></tr></thead><tbody><tr><td>${snapshot.lifetime.agentCompletions}</td><td>${snapshot.lifetime.reportedUsageCount}</td><td>${snapshot.lifetime.unavailableCount}</td><td>${formatNumber(snapshot.lifetime.tokens.total)}</td><td>${formatCost(snapshot.lifetime.reportedCostUsd)}</td></tr></tbody></table></section>
<section><h2>By Vendor</h2><table><thead><tr><th>Vendor</th><th>Completions</th><th>Usage reported</th><th>Usage unavailable</th><th>Actual cost</th></tr></thead><tbody>${vendorRows}</tbody></table></section>
<p>${escapeHtml(sinceLine(snapshot))} ${escapeHtml(COST_NOTE)}</p>
${dimensionSections}
</main></body></html>
`;
}

/** No CLI: the report is rendered by token-consumption. Running the shim directly does nothing and exits 0, as before. */
export function main(): number {
  return 0;
}

runDirect(import.meta.url, main);
