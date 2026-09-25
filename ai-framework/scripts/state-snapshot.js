#!/usr/bin/env node
/*
 * Builds .project/reports/state.json: a derived, non-authoritative snapshot of the project's
 * state. Read-only over a fixed allowlist of sources (never .env*, credentials, transcripts;
 * never a database connection). .project/status.md and .project/runs/ remain the lifecycle
 * authorities. Every fact is { value, status, evidence, note? }; a section that cannot be built
 * is "unavailable" with a reason and never fails the others. See
 * ai-framework/integrations/state-report.md and .project/pitches/project-state-report/plan.md.
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const skillDefaults = require("./skill-defaults");
const { context, readRegistry, resolveFile } = require("./skill-registry");
const { inventory } = require("./pitch-compress");

const STATUSES = new Set(["observed", "proposed", "stale", "unavailable", "unconfigured"]);
const SUPPORTED_METRICS_SCHEMAS = new Set([1, 2]);
const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FILE_BYTES = 1024 * 1024;
const FIELD_LIMIT = 300;
const REPORT_FILE = ".project/reports/state.json";

// Defense in depth: every captured string is bounded and scrubbed of obvious credential shapes.
const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/g,
  /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{16,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  /\b(?:password|passwd|secret|token|api[_-]?key)\s*[:=]\s*\S+/gi,
];

function fact(value, status, evidence = [], note) {
  if (!STATUSES.has(status)) throw new Error(`Invalid fact status: ${status}`);
  return note === undefined ? { value, status, evidence } : { value, status, evidence, note };
}
const unavailable = (reason, evidence = []) => fact(null, "unavailable", evidence, reason);

function makeScrubber() {
  const counter = { redactions: 0 };
  const scrub = (text) => {
    let out = String(text).replace(/\s+/g, " ").trim();
    for (const pattern of SECRET_PATTERNS) out = out.replace(pattern, () => { counter.redactions++; return "[redacted]"; });
    return out.length > FIELD_LIMIT ? `${out.slice(0, FIELD_LIMIT - 1)}…` : out;
  };
  return { scrub, counter };
}

// One place every source is read: refuses symlinks and anything that resolves outside the
// project (the class of bypass fixed in portable-skill-defaults), and bounds size.
function readSource(root, relative) {
  const full = path.join(root, relative);
  let stat;
  try { stat = fs.lstatSync(full); } catch (error) { if (error.code === "ENOENT") return { missing: true }; throw error; }
  if (stat.isSymbolicLink()) return { error: "symlink refused" };
  const real = fs.realpathSync(full);
  const within = path.relative(root, real);
  if (within.startsWith("..") || path.isAbsolute(within)) return { error: "resolves outside the project" };
  if (!stat.isFile()) return { error: "not a file" };
  if (stat.size > MAX_FILE_BYTES) return { error: "too large to read" };
  return { text: fs.readFileSync(full, "utf8"), mtimeMs: stat.mtimeMs };
}
function readJson(root, relative) {
  const source = readSource(root, relative);
  if (source.missing || source.error) return source;
  try { return { value: JSON.parse(source.text), mtimeMs: source.mtimeMs }; } catch { return { error: "not valid JSON" }; }
}
const problem = (source) => (source.missing ? "file not present" : source.error);

function markdownSections(text) {
  const sections = [];
  let current = { heading: "", lines: [] };
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const match = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (match) { sections.push(current); current = { heading: match[1], lines: [] }; } else current.lines.push(line);
  }
  sections.push(current);
  return sections.map((section) => ({ heading: section.heading, body: section.lines.join("\n").trim() }));
}
function firstParagraph(body) {
  const parts = body.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const prose = parts.find((part) => !/^[>|`-]/.test(part));
  return prose || (parts[0] || "").replace(/^```\w*\n?/, "").replace(/^\s*[-*]\s+/gm, "").trim();
}
function tableRows(text, heading) {
  const section = markdownSections(text).find((item) => item.heading === heading);
  if (!section) return [];
  return section.body.split("\n").filter((line) => line.startsWith("|")).map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length && !cells.every((cell) => /^:?-+:?$/.test(cell))).slice(1);
}
function hillRows(text) {
  const rows = text.split("\n").filter((line) => line.startsWith("|")).map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  const position = rows[0]?.map((cell) => cell.toLowerCase()).indexOf("position");
  if (!rows.length || position === undefined || position === -1) return [];
  return rows.slice(1).filter((cells) => !cells.every((cell) => /^:?-+:?$/.test(cell))).map((cells) => ({ scope: cells[0] || "", position: cells[position] || "" }));
}

// Context files describe intent as often as fact: a heading that says "proposed" or "not yet
// decided" must never be reported as observed.
function headingStatus(heading) {
  if (/not yet|undecided|not decided|unconfigured/i.test(heading)) return "unconfigured";
  if (/proposed|direction|stated|planned|intended/i.test(heading)) return "proposed";
  return "observed";
}
const UNFILLED = /_Detecting\.\.\.|_Scanning project\.\.\.|<[^>]+>/;

function contextFacts(root, relative, scrub) {
  const source = readSource(root, relative);
  if (source.missing || source.error) return [unavailable(problem(source), [])];
  if (source.text.trim().length < 80 || UNFILLED.test(source.text.replace(/```[\s\S]*?```/g, ""))) return [unavailable("looks like an unfilled setup draft", [relative])];
  return markdownSections(source.text).filter((section) => section.heading && section.body).slice(0, 12)
    .map((section) => fact({ heading: scrub(section.heading), summary: scrub(firstParagraph(section.body) || section.body) }, headingStatus(section.heading), [relative]));
}

function workflowSection(root, now, scrub) {
  const marker = readJson(root, ".project/.bundle-sync.json");
  const version = readSource(root, "VERSION");
  let installed;
  if (marker.value?.sourceVersion) installed = fact(scrub(marker.value.sourceVersion), "observed", [".project/.bundle-sync.json"], "installed version recorded by the last bundle-sync");
  else if (version.text) installed = fact(scrub(version.text), "stale", ["VERSION"], "unpacked version, not updated by sync (VERSION is never synced)");
  else installed = unavailable("no sync marker and no VERSION file");
  const lastSync = marker.value?.lastSyncedAt ? fact(scrub(marker.value.lastSyncedAt), "observed", [".project/.bundle-sync.json"]) : unavailable("never synced through a marker");

  // A conflict (both sides edited) is unfinished sync work; a kept-local file is an ordinary
  // project customization and is only counted, never flagged.
  const conflicts = Array.isArray(marker.value?.conflicts) ? marker.value.conflicts.map(scrub) : [];
  const keptLocal = Array.isArray(marker.value?.keptLocal) ? marker.value.keptLocal.length : 0;
  let registryStatus = "not-checked";
  const script = path.join(root, "ai-framework/scripts/skill-sync.js");
  if (fs.existsSync(script)) {
    // reconcile without --apply is a read-only preview.
    const run = spawnSync(process.execPath, [script, "reconcile", "--json", "--root", root], { encoding: "utf8", timeout: 15000 });
    try { registryStatus = JSON.parse(run.stdout).status; } catch { registryStatus = "unavailable"; }
  }
  const attention = conflicts.length > 0 || ["conflict", "incompatible", "coverage-unresolved", "pending-transaction", "needs-reconciliation"].includes(registryStatus);
  const partial = !marker.value && registryStatus === "not-checked"
    ? unavailable("no sync marker and no skill-sync script to inspect")
    : fact({ state: attention ? "attention" : "clean", conflicts, keptLocalCount: keptLocal, skillRegistry: registryStatus }, "observed", marker.value ? [".project/.bundle-sync.json"] : ["ai-framework/scripts/skill-sync.js"]);
  return { installedVersion: installed, lastSync, partialSync: partial };
}

function projectSection(root, scrub) {
  const product = contextFacts(root, ".project/context/product.md", scrub);
  const readme = readSource(root, "README.md");
  let readmeFact = unavailable(problem(readme) || "empty", []);
  if (readme.text) {
    const heading = readme.text.match(/^#\s+(.+)$/m);
    readmeFact = fact({ title: scrub(heading ? heading[1] : ""), summary: scrub(firstParagraph(readme.text.replace(/^#.*$/m, "").trim())) }, "observed", ["README.md"]);
  }
  return { description: product, readme: readmeFact, architecture: contextFacts(root, ".project/context/architecture.md", scrub), technology: contextFacts(root, ".project/context/stack.md", scrub) };
}

// Bounded evidence scan only: never opens a connection, so a deployment is never inferred from
// source files.
function databaseSection(root) {
  const found = [];
  let visited = 0;
  const skip = new Set(["node_modules", ".git", ".project", "dist", "build", ".next", ".cursor", ".claude", ".opencode", ".codex", ".agents"]);
  const isEvidence = (relative) => /(^|\/)migrations?\/[^/]+\.(sql|ts|js)$/i.test(relative) || /(^|\/)prisma\/schema\.prisma$/.test(relative) || /(^|\/)drizzle[^/]*\/[^/]+\.(sql|ts)$/i.test(relative) || /(^|\/)db\/schema[^/]*$/i.test(relative) || /(^|\/)schema\.sql$/i.test(relative);
  const walk = (relative, depth) => {
    if (depth > 6 || visited > 5000 || found.length >= 500) return;
    let entries;
    try { entries = fs.readdirSync(path.join(root, relative), { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      visited++;
      if (entry.isSymbolicLink()) continue;
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) { if (!skip.has(entry.name)) walk(child, depth + 1); } else if (isEvidence(child)) found.push(child);
    }
  };
  walk("", 0);
  if (!found.length) return fact("no schema or migrations are checked in", "unconfigured", [], "no live deployment is inferred either way");
  return fact({ files: found.length, examples: found.slice(0, 5) }, "observed", found.slice(0, 5), "checked-in schema/migrations only; live deployment state is not inferred");
}

function pitchesSection(root, scrub) {
  const status = readSource(root, ".project/status.md");
  const listed = new Set();
  if (status.text) for (const heading of ["Active pitches", "Parked pitches", "Recent ships (last 5)"]) for (const cells of tableRows(status.text, heading)) listed.add(String(cells[0] || "").replace(/`/g, ""));
  const doneWork = readSource(root, ".project/done-work.md");
  const compacted = new Map();
  if (doneWork.text) for (const match of doneWork.text.matchAll(/^## ([a-z0-9](?:[a-z0-9-]*[a-z0-9])?) — shipped (\S+)/gm)) compacted.set(match[1], match[2]);

  const items = inventory(root).slice(0, 100).map((entry) => {
    const rel = `.project/pitches/${entry.slug}`;
    const base = { slug: scrub(entry.slug), inStatusMd: listed.has(entry.slug) };
    if (entry.reason === "already compacted") return fact({ ...base, phase: "compacted", shipped: compacted.get(entry.slug) || null }, "observed", [".project/done-work.md"], "full history was compacted; summary lives in done-work.md");
    const pitch = readSource(root, `${rel}/pitch.md`);
    const title = pitch.text?.match(/^#\s+(?:Pitch:\s*)?(.+)$/m)?.[1];
    const appetite = pitch.text?.match(/\*\*Appetite\*\*:\s*([^•\n]+)/)?.[1];
    const hill = readSource(root, `${rel}/hill.md`);
    const shipped = readSource(root, `${rel}/SHIPPED.md`);
    const rows = hill.text ? hillRows(hill.text) : [];
    const details = { ...base, title: title ? scrub(title) : null, appetite: appetite ? scrub(appetite) : null, hill: { scopes: rows.length, done: rows.filter((row) => /^done$/i.test(row.position)).length } };
    const evidence = [`${rel}/pitch.md`, hill.text ? `${rel}/hill.md` : null, shipped.text ? `${rel}/SHIPPED.md` : null].filter((item, index) => item && (index > 0 || pitch.text));
    if (entry.eligible) return fact({ ...details, phase: "shipped", shipped: shipped.text?.match(/\*\*Shipped:\*\*\s*(\d{4}-\d{2}-\d{2})/)?.[1] || null }, "observed", evidence);
    return fact({ ...details, phase: "active", reason: scrub(entry.reason) }, "observed", evidence.length ? evidence : [rel], base.inStatusMd ? undefined : "directory is not listed in .project/status.md, the lifecycle authority");
  });
  return { statusMd: status.text ? fact({ listed: listed.size }, "observed", [".project/status.md"]) : unavailable(problem(status), []), items };
}

function knowledgeSection(root) {
  const graph = readJson(root, ".project/knowledge/graph.json");
  if (!graph.value) return unavailable(`graph.json ${problem(graph)}`, []);
  const nodes = Array.isArray(graph.value.nodes) ? graph.value.nodes : null;
  if (!nodes) return unavailable("graph.json has no nodes array", [".project/knowledge/graph.json"]);
  const byType = {};
  for (const node of nodes) { const type = typeof node?.type === "string" ? node.type : "unknown"; byType[type] = (byType[type] || 0) + 1; }
  let newest = 0;
  const walk = (dir) => { for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) { const rel = `${dir}/${entry.name}`; if (entry.isSymbolicLink()) continue; if (entry.isDirectory()) { if (entry.name !== "templates") walk(rel); } else if (/\.md$/.test(entry.name) && !/^(README|index)\.md$/.test(entry.name)) newest = Math.max(newest, fs.statSync(path.join(root, rel)).mtimeMs); } };
  for (const dir of ["decisions", "patterns", "entities", "issues"]) { try { walk(`.project/knowledge/${dir}`); } catch { /* directory absent */ } }
  const stale = newest > graph.mtimeMs + 1000;
  return fact({ entries: nodes.length, byType }, stale ? "stale" : "observed", [".project/knowledge/graph.json"], stale ? "a knowledge entry is newer than graph.json; run graphify.js" : undefined);
}

function skillsSection(root, scrub) {
  let registry;
  try { ({ registry } = readRegistry(context(root, "project"))); } catch (error) { return { installed: unavailable(`skill registry ${scrub(error.message)}`, [".project/skills/registry.json"]), caveman: unavailable("skill registry unreadable") }; }
  const entries = Object.values(registry.skills).map((entry) => fact({ id: scrub(entry.id), enabled: entry.enabled, phases: entry.phases.map(scrub), scope: entry.scope, runtime: entry.runtime?.status || "unverified" }, "observed", [".project/skills/registry.json"]));
  const installed = entries.length ? entries : [fact([], "unconfigured", [], "no skills installed")];
  const report = skillDefaults.report(root);
  const caveman = report.defaults.find((item) => item.id.endsWith("/caveman"));
  let modes = null;
  let modesProblem = null;
  try { modes = skillDefaults.loadModes(root); } catch (error) { modesProblem = scrub(error.message); }
  const resolved = {};
  if (!modesProblem) for (const phase of skillDefaults.PHASES) resolved[phase] = skillDefaults.resolveMode(root, { phase });
  const cavemanFact = modesProblem ? unavailable(`modes.json ${modesProblem}`, [".project/skills/modes.json"])
    : fact({ installed: Boolean(caveman?.installed), enabled: caveman?.enabled ?? null, phaseGap: caveman?.phaseGap || [], persistentlyOff: modes?.caveman?.enabled === false, resolved }, caveman?.installed ? "observed" : "unconfigured", caveman?.installed ? [".project/skills/registry.json"] : [], caveman?.installed ? undefined : "caveman is not installed, so the instruction in every skill and agent is inert");
  return { installed, caveman: cavemanFact };
}

function count(value) { return Number.isSafeInteger(value) && value >= 0 ? value : null; }
// Reads only fields common to schema v1 and v2 of the token snapshot; anything else is ignored,
// and a version this reader has not seen is reported rather than guessed at.
function metricsSection(root, now, scrub) {
  const file = ".project/metrics/token-consumption.json";
  const snap = readJson(root, file);
  if (!snap.value) return unavailable(`token snapshot ${problem(snap)}`, []);
  const version = snap.value.schemaVersion;
  if (!SUPPORTED_METRICS_SCHEMAS.has(version)) return unavailable(`unsupported token snapshot schemaVersion ${JSON.stringify(version)}`, [file]);
  const lifetime = snap.value.lifetime || {};
  const completions = count(lifetime.agentCompletions);
  const reported = count(lifetime.reportedUsageCount);
  const missing = count(lifetime.unavailableCount);
  const vendors = Object.entries(lifetime.vendors || {}).slice(0, 20).map(([vendor, values]) => ({ vendor: scrub(vendor), completions: count(values?.completions), reportedUsage: count(values?.reportedUsageCount), unavailable: count(values?.unavailableCount) }));
  const age = Date.parse(snap.value.updatedAt);
  const stale = Number.isFinite(age) && now.getTime() - age > STALE_AFTER_MS;
  const measured = completions ? (reported === completions ? "measured" : reported ? "partial" : "unavailable") : "unavailable";
  const value = { schemaVersion: version, updatedAt: typeof snap.value.updatedAt === "string" ? scrub(snap.value.updatedAt) : null, completions, reportedUsage: reported, unavailable: missing, completeness: measured, vendors };
  if (measured === "unavailable") return fact(value, "unavailable", [file], completions ? "no completion reported usage" : "no completions recorded");
  return fact(value, stale ? "stale" : "observed", [file], stale ? "snapshot is older than 7 days" : measured === "partial" ? `partial: ${reported} of ${completions} completions reported usage` : undefined);
}

function runsSection(root) {
  let names;
  try { names = fs.readdirSync(path.join(root, ".project/runs")).filter((name) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(name)).sort(); } catch { return unavailable("no .project/runs directory"); }
  return fact({ count: names.length, latest: names.slice(-5) }, "observed", names.slice(-5).map((name) => `.project/runs/${name}`));
}

function doneWorkSection(root) {
  const source = readSource(root, ".project/done-work.md");
  if (source.missing || source.error) return unavailable(problem(source), []);
  const entries = [...source.text.matchAll(/^## ([a-z0-9](?:[a-z0-9-]*[a-z0-9])?) — shipped (\S+)/gm)].map((match) => ({ slug: match[1], shipped: match[2] }));
  return fact({ compacted: entries.length, entries: entries.slice(0, 100) }, "observed", [".project/done-work.md"]);
}

// Each section is built independently so one broken source only marks its own section.
function section(build, label) {
  try { return build(); } catch (error) { return unavailable(`${label} could not be read: ${String(error.message).slice(0, 120)}`); }
}

function buildSnapshot(root, options = {}) {
  root = fs.realpathSync(root);
  const now = options.now ? new Date(options.now) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Invalid --now timestamp");
  const { scrub, counter } = makeScrubber();
  const snapshot = {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    authority: "Derived view, not a source of truth: .project/status.md and .project/runs/ remain the lifecycle authorities.",
    workflow: section(() => workflowSection(root, now, scrub), "workflow"),
    project: section(() => projectSection(root, scrub), "project"),
    database: section(() => databaseSection(root), "database"),
    pitches: section(() => pitchesSection(root, scrub), "pitches"),
    doneWork: section(() => doneWorkSection(root), "done-work"),
    knowledge: section(() => knowledgeSection(root), "knowledge"),
    skills: section(() => skillsSection(root, scrub), "skills"),
    metrics: section(() => metricsSection(root, now, scrub), "metrics"),
    runs: section(() => runsSection(root), "runs"),
  };
  snapshot.redactions = counter.redactions;
  return snapshot;
}

// Every leaf fact, wherever it sits — used by validation and by the renderer.
function* facts(node, trail = "") {
  if (Array.isArray(node)) { for (const [index, item] of node.entries()) yield* facts(item, `${trail}[${index}]`); return; }
  if (!node || typeof node !== "object") return;
  if (typeof node.status === "string" && Array.isArray(node.evidence)) { yield [trail, node]; return; }
  for (const [key, value] of Object.entries(node)) yield* facts(value, trail ? `${trail}.${key}` : key);
}

function checkSnapshot(root, snapshot) {
  const issues = [];
  for (const [where, item] of facts(snapshot)) {
    if (!STATUSES.has(item.status)) { issues.push(`${where}: invalid status ${item.status}`); continue; }
    if (!item.evidence.length && !(item.status === "unavailable" || item.status === "unconfigured") && item.note === undefined) issues.push(`${where}: ${item.status} fact has no evidence`);
    if ((item.status === "unavailable") && !item.note) issues.push(`${where}: unavailable without a reason`);
    for (const relative of item.evidence) if (!fs.existsSync(path.join(root, relative))) issues.push(`${where}: evidence path does not exist: ${relative}`);
  }
  return issues;
}

// Temp file in the destination directory + rename: a reader never sees a partial report, and a
// leftover temp file from an earlier crash never blocks a rerun (each run uses its own name).
function writeAtomic(root, relative, text) {
  const destination = resolveFile({ roots: { target: root } }, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp-${process.pid}-${Date.now()}`;
  try { fs.writeFileSync(temporary, text, { mode: 0o644 }); fs.renameSync(temporary, destination); } finally { fs.rmSync(temporary, { force: true }); }
  return relative;
}

function writeSnapshot(root, snapshot) {
  root = fs.realpathSync(root);
  const text = `${JSON.stringify(snapshot, null, 2)}\n`;
  // generatedAt alone differing is not a change: rerunning on an unchanged project is a no-op.
  const withoutClock = (json) => { try { const { generatedAt, ...rest } = JSON.parse(json); return JSON.stringify(rest); } catch { return null; } };
  const existing = readSource(root, REPORT_FILE).text;
  if (existing !== undefined && withoutClock(existing) !== null && withoutClock(existing) === withoutClock(text)) return { path: REPORT_FILE, changed: false };
  writeAtomic(root, REPORT_FILE, text);
  return { path: REPORT_FILE, changed: true };
}

function cli(argv) {
  const options = { root: process.cwd() };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--root" && argv[index + 1] !== undefined) options.root = argv[++index];
    else if (arg === "--now" && argv[index + 1] !== undefined) options.now = argv[++index];
    else throw new Error(`Unknown option: ${arg}`);
  }
  const root = fs.realpathSync(options.root);
  const snapshot = buildSnapshot(root, { now: options.now });
  const write = options.apply ? writeSnapshot(root, snapshot) : null;
  if (options.json) return JSON.stringify(write ? { ...snapshot, written: write } : snapshot, null, 2);
  const counts = {};
  for (const [, item] of facts(snapshot)) counts[item.status] = (counts[item.status] || 0) + 1;
  return `state snapshot for ${path.basename(root)}: ${Object.entries(counts).map(([status, n]) => `${n} ${status}`).join(", ")}; ${snapshot.redactions} redaction(s)\n${write ? `${write.changed ? "wrote" : "unchanged"} ${write.path}` : "preview only (pass --apply to write .project/reports/state.json)"}`;
}

module.exports = { STATUSES, buildSnapshot, checkSnapshot, writeSnapshot, writeAtomic, readSource, facts, REPORT_FILE };

if (require.main === module) {
  try { process.stdout.write(`${cli(process.argv.slice(2))}\n`); } catch (error) { process.stderr.write(`state-snapshot: ${error.message}\n`); process.exitCode = 1; }
}
