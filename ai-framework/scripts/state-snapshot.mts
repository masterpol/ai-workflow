import { runWorkflowSync } from "./runtime/entry.mts";
import { runDirect } from "./runtime/cli.mts";
/*
 * Builds .project/reports/state.json: a derived, non-authoritative snapshot of the project's
 * state. Read-only over a fixed allowlist of sources (never .env*, credentials, transcripts;
 * never a database connection). .project/status.md and .project/runs/ remain the lifecycle
 * authorities. Every fact is { value, status, evidence, note? }; a section that cannot be built
 * is "unavailable" with a reason and never fails the others. See
 * ai-framework/integrations/state-report.md and .project/knowledge/decisions/project-state-report-design.md.
 */
import { createNodeDeps } from "./runtime/node.mts";
import * as skillDefaults from "./skill-defaults.mts";
import * as registryModule from "./skill-registry.mts";
import { inventory } from "./pitch-compress.mts";
import { compactedSlugs } from "./done-work-index.mts";
import { createStateGraph } from "./state-graph.mts";
import { createStateHistory } from "./state-history.mts";
import { createStateStructure } from "./state-structure.mts";

import type { RegistryContext, RootName } from "./skill-registry.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

const { context, readRegistry, resolveFile, snapshot: registrySnapshot } = registryModule as typeof import("./skill-registry.mts");

let nodeDeps: RuntimeDeps | undefined;
function defaultDeps(): RuntimeDeps { return (nodeDeps ??= createNodeDeps()); }
export interface StateFact { value: unknown; status: string; evidence: string[]; note?: string }
export interface SnapshotOptions { now?: string; reconcileTimeoutMs?: number; root?: string; json?: boolean; apply?: boolean }
export class StateError extends Error {}
export const DEPTH_PLACEHOLDER = "[depth limit]";

/** Bind source reads, trusted bundle subprocesses and atomic writes to this runtime. */
function bindStateSnapshot(deps: RuntimeDeps) {
const { fs, path } = deps;
const structureApi = createStateStructure(deps);
const historyApi = createStateHistory(deps);
// Text printed to a terminal never carries control characters from project-controlled strings.
const printable = (text: unknown): string => String(text).replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/g, "?");
const STATUSES = new Set(["observed", "proposed", "stale", "unavailable", "unconfigured"]);
const SUPPORTED_METRICS_SCHEMAS = new Set([1, 2, 3]);
const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FILE_BYTES = 1024 * 1024;
// Graphify's project graph holds the code too, so it is far larger than the other sources.
const GRAPH_FILE_BYTES = 64 * 1024 * 1024;
const FIELD_LIMIT = 300;
const REPORT_FILE = ".project/reports/state.json";

// Defense in depth: every captured string is bounded and scrubbed of obvious credential shapes.
const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY[A-Z ]*-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY[A-Z ]*-----|$)/g,
  /AKIA[0-9A-Z]{16}/g,
  /\bnpm_[A-Za-z0-9]{20,}/g,
  /\bglpat-[A-Za-z0-9_-]{16,}/g,
  /\bdop_v1_[a-f0-9]{20,}/g,
  /\bwhsec_[A-Za-z0-9]{16,}/g,
  /\bSG\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  /hooks\.slack\.com\/services\/\S+/g,
  /\bssh-(?:rsa|ed25519|dss)\s+[A-Za-z0-9+\/=]{20,}/g,
  /\bAuthorization\s{0,3}:\s{0,3}(?:(?:Bearer|Basic|Token|Digest|ApiKey|OAuth|AWS4-HMAC-SHA256)\s+\S+|[A-Za-z0-9._~+\/=-]{20,})/gi,
  /--(?:password|passwd|token|secret|api-?key)[ =]\S+/gi,
  /\b(?:sk|pk|rk)[-_](?:live_|test_)?[A-Za-z0-9_-]{16,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/g,
  /\bAIza[0-9A-Za-z_-]{30,}/g,
  /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g,
  /\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+\/=-]{8,}/g,
  /\b[a-z][a-z0-9+.-]{0,31}:\/\/[^\/\s:@]*:[^\/\s]+@/gi,
  // No leading \b: DB_PASSWORD and AWS_SECRET_ACCESS_KEY have the keyword after an underscore.
  /(?:password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|credential)[A-Za-z0-9_-]{0,40}["']?\s{0,3}[:=]\s{0,3}["']?\S+/gi,
  // Short words only at a word start, so "compass: north" is not touched.
  /(?<![A-Za-z])(?:pwd|pass|passphrase|auth|signature|sig)["']?\s{0,3}[:=]\s{0,3}["']?\S+/gi,
];
// Input to the scrubber is bounded first: every pattern is linear, but a 1 MB field is still 1 MB.
const SCRUB_INPUT_LIMIT = 8192;
// Markdown sources are capped before any regex touches them, for the same reason.
const MARKDOWN_LIMIT = 64 * 1024;

function fact<T>(value: T, status: string, evidence: string[] = [], note?: string) {
  if (!STATUSES.has(status)) throw new Error(`Invalid fact status: ${status}`);
  return note === undefined ? { value, status, evidence } : { value, status, evidence, note };
}
const unavailable = (reason: string, evidence: string[] = []) => fact(null, "unavailable", evidence, reason);

function makeScrubber() {
  const counter = { redactions: 0 };
  const scrub = (text: unknown): string => {
    // NFKC folds fullwidth "＝" and similar into ASCII; format characters (zero-width space, joiners) are
    // dropped so they cannot split a keyword from its separator.
    let out = String(text).slice(0, SCRUB_INPUT_LIMIT).normalize("NFKC").replace(/\p{Cf}/gu, "").slice(0, SCRUB_INPUT_LIMIT).replace(/\s+/g, " ").trim();
    for (const pattern of SECRET_PATTERNS) out = out.replace(pattern, () => { counter.redactions++; return "[redacted]"; });
    return out.length > FIELD_LIMIT ? `${out.slice(0, FIELD_LIMIT - 1)}…` : out;
  };
  return { scrub, counter };
}

// One place every source is read: refuses symlinks and anything that resolves outside the
// project (the class of bypass fixed in portable-skill-defaults), and bounds size.
function readSource(root: string, relative: string, maxBytes = MAX_FILE_BYTES) {
  try {
    const full = path.join(root, relative);
    let stat;
    try { stat = fs.lstatSync(full); } catch (error) { if (error.code === "ENOENT") return { missing: true }; throw error; }
    if (stat.isSymbolicLink()) return { error: "symlink refused" };
    const real = fs.realpathSync(full);
    const within = path.relative(root, real);
    if (within.startsWith("..") || path.isAbsolute(within)) return { error: "resolves outside the project" };
    if (!stat.isFile()) return { error: "not a file" };
    if (stat.size > maxBytes) return { error: "too large to read" };
    return { text: fs.readFileSync(full), mtimeMs: stat.mtimeMs, bytes: stat.size };
  } catch (error) { return { error: failure(error) }; }
}
// Markdown goes through regexes and section splitting; only its first MARKDOWN_LIMIT bytes matter here.
// A file over that cap is silently incomplete, not absent — callers that scan for every row/heading
// (not just one section) must check `truncated` and downgrade the fact instead of reporting "observed".
function readMarkdown(root: string, relative: string) {
  const source = readSource(root, relative);
  if (source.text === undefined) return source;
  const truncated = source.text.length > MARKDOWN_LIMIT;
  return { ...source, text: source.text.slice(0, MARKDOWN_LIMIT), truncated };
}
const TRUNCATED_NOTE = (relative: string): string => `${relative} exceeds the 64 KB read limit; entries past that point are not counted`;
// Never surface raw error text: it can carry absolute paths or fragments of a file's content.
const failure = (error: unknown): string => (error && typeof error === "object" && "code" in error && typeof error.code === "string" && /^[A-Z0-9_]{1,20}$/.test(error.code) ? error.code : "unexpected error");
// A raw ENOENT/EACCES message embeds the absolute path; keep only a fixed reason (same rule as
// state-render.mts's render() and state-theme.mts's discoverTheme()).
function resolveRoot(root: string) {
  try { return fs.realpathSync(root); } catch { throw new StateError("--root does not exist or is not resolvable"); }
}
function readJson(root: string, relative: string, maxBytes = MAX_FILE_BYTES) {
  const source = readSource(root, relative, maxBytes);
  if (source.missing || source.error) return source;
  try { return { value: JSON.parse(source.text), mtimeMs: source.mtimeMs, bytes: source.bytes }; } catch { return { error: "not valid JSON" }; }
}
const problem = (source: { missing?: boolean; error?: string }): string | undefined => (source.missing ? "file not present" : source.error);

function markdownSections(text: string) {
  const sections = [];
  let current = { heading: "", lines: [] };
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const match = line.match(/^#{1,6}[ \t]+(.*)$/);
    if (match && match[1].trim()) { sections.push(current); current = { heading: match[1].trim(), lines: [] }; } else current.lines.push(line);
  }
  sections.push(current);
  return sections.map((section) => ({ heading: section.heading, body: section.lines.join("\n").trim() }));
}
// Summaries are for reading, not for re-rendering: fences, emphasis markers and inline-code ticks
// would show up as literal punctuation in the report.
function plain(text: unknown) {
  return String(text).replace(/```\w*/g, " ").replace(/\*\*|__/g, "").replace(/`/g, "").replace(/^[ \t]*[-*][ \t]+/gm, "").replace(/\[([^\][\n]{1,200})\]\([^)\n]{0,500}\)/g, "$1");
}
function firstParagraph(body: string) {
  const parts = body.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const prose = parts.find((part) => !/^[>|`-]/.test(part));
  return prose || (parts[0] || "").replace(/^```\w*\n?/, "").replace(/^\s*[-*]\s+/gm, "").trim();
}
function tableRows(text: string, heading: string) {
  const section = markdownSections(text).find((item) => item.heading === heading);
  if (!section) return [];
  return section.body.split("\n").filter((line) => line.startsWith("|")).map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length && !cells.every((cell) => /^:?-+:?$/.test(cell))).slice(1);
}
function hillRows(text: string) {
  const rows = text.split("\n").filter((line) => line.startsWith("|")).map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  const position = rows[0]?.map((cell) => cell.toLowerCase()).indexOf("position");
  if (!rows.length || position === undefined || position === -1) return [];
  return rows.slice(1).filter((cells) => !cells.every((cell) => /^:?-+:?$/.test(cell))).map((cells) => ({ scope: cells[0] || "", position: cells[position] || "" }));
}

// Context files describe intent as often as fact: a heading that says "proposed" or "not yet
// decided" must never be reported as observed.
function headingStatus(heading: string) {
  if (/not yet|undecided|not decided|unconfigured/i.test(heading)) return "unconfigured";
  if (/proposed|direction|stated|planned|intended/i.test(heading)) return "proposed";
  return "observed";
}
const UNFILLED = /_Detecting\.\.\.|_Scanning project\.\.\.|<[^<>]+>/;

function contextFacts(root: string, relative: string, scrub: (text: unknown) => string) {
  const source = readMarkdown(root, relative);
  if (source.missing || source.error) return [unavailable(problem(source), [])];
  if (source.text.trim().length < 80 || UNFILLED.test(source.text.replace(/```[\s\S]*?```/g, ""))) return [unavailable("looks like an unfilled setup draft", [relative])];
  return markdownSections(source.text).filter((section) => section.heading && section.body).slice(0, 12)
    .map((section) => fact({ heading: scrub(section.heading), summary: scrub(plain(firstParagraph(section.body) || section.body)) }, headingStatus(section.heading), [relative]));
}

function workflowSection(root: string, now: Date, scrub: (text: unknown) => string, options: SnapshotOptions) {
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
  // Always this bundle's own skill-sync.mts: the analyzed project is data, and a report must never
  // execute a script that project supplies. reconcile without --apply is a read-only preview.
  const script = path.join(import.meta.dirname, "skill-sync.mts");
  if (fs.existsSync(path.join(root, ".project/skills/registry.json")) || marker.value) {
    const run = runWorkflowSync(deps, ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", script, "reconcile", "--json", "--root", root], { timeoutMs: options.reconcileTimeoutMs || 15000 });
    try { registryStatus = JSON.parse(run.stdout).status; } catch { registryStatus = "unavailable"; }
  }
  const attention = conflicts.length > 0 || ["conflict", "incompatible", "coverage-unresolved", "pending-transaction", "needs-reconciliation"].includes(registryStatus);
  const partial = !marker.value && registryStatus === "not-checked"
    ? unavailable("no sync marker and no skill registry to inspect")
    : fact({ state: attention ? "attention" : "clean", conflicts, keptLocalCount: keptLocal, skillRegistry: registryStatus }, "observed", marker.value ? [".project/.bundle-sync.json"] : [".project/skills/registry.json"]);
  return { installedVersion: installed, lastSync, partialSync: partial };
}

function projectSection(root: string, scrub: (text: unknown) => string) {
  const product = contextFacts(root, ".project/context/product.md", scrub);
  const readme = readMarkdown(root, "README.md");
  let readmeFact = unavailable(problem(readme) || "empty", []);
  if (readme.text) {
    const heading = readme.text.match(/^#\s+(.+)$/m);
    readmeFact = fact({ title: scrub(heading ? heading[1] : ""), summary: scrub(plain(firstParagraph(readme.text.replace(/^#.*$/m, "").trim()))) }, "observed", ["README.md"]);
  }
  return { description: product, readme: readmeFact, architecture: contextFacts(root, ".project/context/architecture.md", scrub), technology: contextFacts(root, ".project/context/stack.md", scrub) };
}

// Bounded evidence scan only: never opens a connection, so a deployment is never inferred from
// source files.
function databaseSection(root: string) {
  const found = [];
  let visited = 0;
  const skip = new Set(["node_modules", ".git", ".project", "dist", "build", ".next", ".cursor", ".claude", ".opencode", ".codex", ".agents"]);
  const isEvidence = (relative: string): boolean => /(^|\/)migrations?\/[^/]+\.(sql|ts|js)$/i.test(relative) || /(^|\/)prisma\/schema\.prisma$/.test(relative) || /(^|\/)drizzle[^/]*\/[^/]+\.(sql|ts)$/i.test(relative) || /(^|\/)db\/schema[^/]*$/i.test(relative) || /(^|\/)schema\.sql$/i.test(relative);
  const walk = (relative: string, depth: number): void => {
    if (depth > 6 || visited > 5000 || found.length >= 500) return;
    let entries;
    try { entries = fs.readdirEntriesSync(path.join(root, relative)); } catch { return; }
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

function pitchesSection(root: string, scrub: (text: unknown) => string) {
  const status = readMarkdown(root, ".project/status.md");
  const listed = new Set();
  if (status.text) for (const heading of ["Active pitches", "Parked pitches", "Recent ships (last 5)"]) for (const cells of tableRows(status.text, heading)) listed.add(String(cells[0] || "").replace(/`/g, ""));
  const doneWork = readMarkdown(root, ".project/done-work.md");
  // One entry per slug: an outcome record wins over a legacy narrative entry, and the record folder is read by name, so a truncated done-work.md cannot hide it.
  const compacted = new Map([...compactedSlugs(root, deps, doneWork.text ?? "")].map(([slug, info]) => [slug, info.shipped]));

  const items = inventory(root, deps).slice(0, 100).map((entry) => {
    const rel = `.project/pitches/${entry.slug}`;
    // A directory name outside the slug rule is replaced, never copied: scrubbing removes secrets but keeps prose.
    const nameOk = PITCH_SLUG.test(entry.slug);
    const base = { slug: nameOk ? scrub(entry.slug) : "(invalid name)", inStatusMd: listed.has(entry.slug) };
    if (entry.reason === "already compacted") {
      const shippedDate = compacted.get(entry.slug) || null;
      // A negative (no shipped date found / not listed) is only uncertain if the source that would
      // have shown it was truncated; a positive found within the truncated portion is still solid.
      const unsure = [doneWork.truncated && !shippedDate ? TRUNCATED_NOTE(".project/done-work.md") : null, status.truncated && !base.inStatusMd ? TRUNCATED_NOTE(".project/status.md") : null].filter(Boolean);
      return fact({ ...base, phase: "compacted", shipped: shippedDate }, unsure.length ? "stale" : "observed", [".project/done-work.md"], unsure.length ? unsure.join("; ") : "full history was compacted; summary lives in done-work.md");
    }
    const pitch = readMarkdown(root, `${rel}/pitch.md`);
    const title = pitch.text?.match(/^#\s+(?:Pitch:\s*)?(.+)$/m)?.[1];
    const appetite = pitch.text?.match(/\*\*Appetite\*\*:[ \t]*([^•\n]+)/)?.[1]?.trim();
    const hill = readMarkdown(root, `${rel}/hill.md`);
    const shipped = readMarkdown(root, `${rel}/SHIPPED.md`);
    const rows = hill.text ? hillRows(hill.text) : [];
    const details = { ...base, title: title ? scrub(title) : null, appetite: appetite ? scrub(appetite) : null, hill: { scopes: rows.length, done: rows.filter((row) => /^done$/i.test(row.position)).length } };
    const evidence = [`${rel}/pitch.md`, hill.text ? `${rel}/hill.md` : null, shipped.text ? `${rel}/SHIPPED.md` : null].filter((item, index) => item && (index > 0 || pitch.text));
    if (entry.eligible) return fact({ ...details, phase: "shipped", shipped: shipped.text?.match(/\*\*Shipped:\*\*[ \t]*(\d{4}-\d{2}-\d{2})/)?.[1] || null }, "observed", evidence);
    // Same rule as above: "not listed" is only uncertain, not a confirmed fact, if status.md was truncated.
    const unsureListed = status.truncated && !base.inStatusMd;
    const notListedNote = unsureListed
      ? `${TRUNCATED_NOTE(".project/status.md")}; whether this pitch is listed could not be confirmed`
      : "directory is not listed in .project/status.md, the lifecycle authority";
    return fact({ ...details, phase: "active", reason: scrub(entry.reason) }, unsureListed ? "stale" : "observed", nameOk ? (evidence.length ? evidence : [rel]) : [".project/pitches"], base.inStatusMd ? undefined : notListedNote);
  });
  const statusMd = status.text
    ? fact({ listed: listed.size }, status.truncated ? "stale" : "observed", [".project/status.md"], status.truncated ? TRUNCATED_NOTE(".project/status.md") : undefined)
    : unavailable(problem(status), []);
  return { statusMd, items };
}

function knowledgeSection(root: string, graph: TokenRead) {
  if (!graph.value) return unavailable(`graphify-out/graph.json ${problem(graph)}; run node ai-framework/scripts/graphify.mts`, []);
  const all = Array.isArray(graph.value.nodes) ? graph.value.nodes : null;
  if (!all) return unavailable("graphify-out/graph.json has no nodes array", ["graphify-out/graph.json"]);
  const nodes = all.filter((node) => node?.node_kind === "knowledge").map((node) => ({ type: node.entry_type }));
  const byType = Object.create(null);
  for (const node of nodes) {
    const type = typeof node?.type === "string" && /^[a-z][a-z0-9-]{0,30}$/i.test(node.type) ? node.type.toLowerCase() : "other";
    if (Object.keys(byType).length < 20 || type in byType) byType[type] = (byType[type] || 0) + 1;
  }
  let newest = 0;
  let visited = 0;
  const realDirectory = (relative: string): boolean => { try { const stat = fs.lstatSync(path.join(root, relative)); return stat.isDirectory() && !stat.isSymbolicLink(); } catch { return false; } };
  const walk = (dir: string): void => {
    if (!realDirectory(dir)) return;
    for (const entry of fs.readdirEntriesSync(path.join(root, dir))) {
      if (++visited > 5000) return;
      const rel = `${dir}/${entry.name}`;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) { if (entry.name !== "templates") walk(rel); } else if (/\.md$/.test(entry.name) && !/^(README|index)\.md$/.test(entry.name)) newest = Math.max(newest, fs.statSync(path.join(root, rel)).mtimeMs);
    }
  };
  for (const dir of ["decisions", "patterns", "entities", "issues"]) walk(`.project/knowledge/${dir}`);
  const stale = newest > graph.mtimeMs + 1000;
  return fact({ entries: nodes.length, byType: { ...byType } }, stale ? "stale" : "observed", ["graphify-out/graph.json"], stale ? "a knowledge entry is newer than graphify-out/graph.json; run graphify.mts" : undefined);
}

function skillsSection(root: string, scrub: (text: unknown) => string) {
  // Base (the bundle's own skill directory) and project (registry) are independent: either can fail alone.
  let base;
  try { base = structureApi.baseSkills(root, scrub); } catch (error) { base = unavailable(`.claude/skills could not be listed (${failure(error)})`, []); }
  let registry;
  try { ({ registry } = readRegistry(context(root, "project", undefined, deps), deps)); } catch { return { installed: unavailable("skill registry is unreadable or not a supported schema", [".project/skills/registry.json"]), caveman: unavailable("skill registry unreadable"), base, project: unavailable("skill registry is unreadable or not a supported schema", [".project/skills/registry.json"]) }; }
  const entries = Object.values(registry.skills).map((entry) => fact({ id: scrub(entry.id), enabled: entry.enabled, phases: entry.phases.map(scrub), scope: entry.scope, runtime: entry.runtime?.status || "unverified" }, "observed", [".project/skills/registry.json"]));
  const installed = entries.length ? entries : [fact([], "unconfigured", [], "no skills installed")];
  const project = entries.length ? entries : fact(null, "unconfigured", [], "no project skills are registered");
  const report = skillDefaults.report(root, deps, {
    context: (project, scope, location) => context(project, scope, location, deps),
    snapshot: (ctx, relative, location) => registrySnapshot(ctx as RegistryContext, relative, location as RootName | undefined, deps),
    readRegistry: (ctx) => readRegistry(ctx as RegistryContext, deps),
  });
  const caveman = report.defaults.find((item) => item.id.endsWith("/caveman"));
  let modes = null;
  let modesProblem = null;
  try { modes = skillDefaults.loadModes(root, deps); } catch { modesProblem = "(ai-workflow.toon, or legacy modes.json when absent) is unreadable, invalid, or outside the project"; }
  const resolved = {};
  if (!modesProblem) for (const phase of skillDefaults.PHASES) resolved[phase] = skillDefaults.resolveMode(root, { phase }, deps);
  const cavemanFact = modesProblem ? unavailable(`caveman mode config ${modesProblem}`, ["ai-workflow.toon", ".project/skills/modes.json"])
    : fact({ installed: Boolean(caveman?.installed), enabled: caveman?.enabled ?? null, phaseGap: caveman?.phaseGap || [], persistentlyOff: modes?.caveman?.enabled === false, resolved }, caveman?.installed ? "observed" : "unconfigured", caveman?.installed ? [".project/skills/registry.json"] : [], caveman?.installed ? undefined : "caveman is not installed, so the instruction in every skill and agent is inert");
  return { installed, caveman: cavemanFact, base, project };
}

function count(value: unknown): number | null { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null; }
// Reads only fields common to schema v1 and v2 of the token snapshot; anything else is ignored,
// and a version this reader has not seen is reported rather than guessed at.
const TOKEN_FILE = ".project/metrics/token-consumption.json";
const GRAPH_FILE = "graphify-out/graph.json";
type TokenRead = ReturnType<typeof readJson>;
function metricsSection(now: Date, scrub: (text: unknown) => string, snap: TokenRead) {
  const file = TOKEN_FILE;
  if (!snap.value) return unavailable(`token snapshot ${problem(snap)}`, []);
  const version = snap.value.schemaVersion;
  if (!SUPPORTED_METRICS_SCHEMAS.has(version)) return unavailable("unsupported token snapshot schemaVersion", [file]);
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

// --- tokens: totals, by-model rows and per-pitch flows, copied (never recomputed) from the one token read ---
const MAX_TOKEN_ROWS = 20;
const MODEL_LABEL = /^[A-Za-z0-9._:/@+-]{1,80}$/;
const VENDOR_LABEL = /^[A-Za-z0-9._-]{1,40}$/;
const PITCH_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
const BUCKET_MODELS = new Set(["(unreported)", "(other)"]);
const BUCKET_PITCHES = new Set(["(unattributed)", "(other)"]);
const FLOW_SCOPE = /^S\d{1,3}$/;
const record = (value: unknown): Record<string, unknown> | null => (value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null);
const byCountThenName = <T extends { completions: number | null }>(name: (row: T) => string) => (a: T, b: T): number => ((b.completions ?? -1) - (a.completions ?? -1)) || (name(a) < name(b) ? -1 : name(a) > name(b) ? 1 : 0);

function modelRows(models: unknown, status: string, file: string) {
  const rows: Array<{ vendor: string; model: string; bucket: boolean; completions: number | null; reportedUsage: number | null; tokens: number | null }> = [];
  let dropped = 0;
  for (const [vendor, perModel] of Object.entries(record(models) ?? {}).slice(0, MAX_TOKEN_ROWS)) {
    if (!VENDOR_LABEL.test(vendor)) { dropped++; continue; }
    const kept: typeof rows = [];
    for (const [model, values] of Object.entries(record(perModel) ?? {})) {
      if (!MODEL_LABEL.test(model) && !BUCKET_MODELS.has(model)) { dropped++; continue; }
      const row = record(values) ?? {};
      const reportedUsage = count(row.reportedUsageCount);
      kept.push({ vendor, model, bucket: BUCKET_MODELS.has(model), completions: count(row.completions), reportedUsage, tokens: reportedUsage ? count(row.tokens) : null });
    }
    kept.sort(byCountThenName((row) => row.model));
    dropped += Math.max(0, kept.length - MAX_TOKEN_ROWS);
    rows.push(...kept.slice(0, MAX_TOKEN_ROWS));
  }
  if (!rows.length) return unavailable("the token snapshot has no model rows", [file]);
  const note = dropped ? `${dropped} model rows were dropped (unsafe label or over the ${MAX_TOKEN_ROWS}-row cap)` : "tokens is null where no completion in the row reported usage";
  return rows.map((row) => fact(row, status, [file], note));
}

// Per-pitch totals from `flows`, joined to hill scopes by slug only (no resolver is called or copied).
function flowRows(flows: unknown, status: string, file: string, hillScopes: (slug: string) => Set<string> | null) {
  const pitches = record(record(flows)?.pitches);
  if (!pitches) return unavailable("the token snapshot has no flows; token-attribution has not shipped them", [file]);
  const rows: Array<{ pitch: string; bucket: boolean; completions: number; reportedUsage: number; tokens: number | null; scopeDivergence: unknown }> = [];
  let dropped = 0;
  for (const [pitch, entry] of Object.entries(pitches)) {
    const bucket = BUCKET_PITCHES.has(pitch);
    if (!bucket && !PITCH_SLUG.test(pitch)) { dropped++; continue; }
    let completions = 0, reportedUsage = 0, tokens = 0;
    const scopes = new Set<string>();
    for (const phase of Object.values(record(record(entry)?.phases) ?? {})) {
      for (const [scope, perVendor] of Object.entries(record(record(phase)?.scopes) ?? {})) {
        scopes.add(scope);
        for (const values of Object.values(record(perVendor) ?? {})) {
          const row = record(values) ?? {};
          completions += count(row.completions) ?? 0; reportedUsage += count(row.reportedUsageCount) ?? 0; tokens += count(row.tokens) ?? 0;
        }
      }
    }
    const hill = bucket ? null : hillScopes(pitch);
    const flowOnly = hill ? [...scopes].filter((scope) => FLOW_SCOPE.test(scope) && !hill.has(scope)).sort() : [];
    const scopeDivergence = bucket ? { availability: "unavailable", reason: "bucket rows are never joined to a pitch" }
      : hill ? { availability: "observed", value: { flowOnly: flowOnly.slice(0, 10), count: flowOnly.length } } : { availability: "unavailable", reason: "the pitch has no hill file" };
    rows.push({ pitch, bucket, completions, reportedUsage, tokens: reportedUsage ? tokens : null, scopeDivergence });
  }
  rows.sort(byCountThenName((row) => row.pitch));
  const kept = rows.slice(0, MAX_TOKEN_ROWS);
  if (!kept.length) return unavailable("the token snapshot flows hold no attributable pitch rows", [file]);
  const note = dropped || rows.length > kept.length ? `top ${MAX_TOKEN_ROWS} pitches; ${dropped} rows dropped for an unsafe key` : "tokens is null where no completion reported usage; buckets are never joined to history";
  return kept.map((row) => fact(row, status, [file], note));
}

function hillScopeIds(root: string, slug: string): Set<string> | null {
  const source = readMarkdown(root, `.project/pitches/${slug}/hill.md`);
  if (source.text === undefined) return null;
  const ids = new Set<string>();
  for (const line of source.text.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cell = line.split("|", 3)[1]?.trim() ?? "";
    if (FLOW_SCOPE.test(cell)) ids.add(cell);
  }
  return ids;
}

function tokensSection(root: string, now: Date, snap: TokenRead) {
  const file = TOKEN_FILE;
  const none = (reason: string) => ({ totals: unavailable(reason), byModel: unavailable(reason), flows: unavailable(reason) });
  if (!snap.value) return none(`token snapshot ${problem(snap)}`);
  if (!SUPPORTED_METRICS_SCHEMAS.has(snap.value.schemaVersion)) return none("unsupported token snapshot schemaVersion");
  const age = Date.parse(snap.value.updatedAt);
  const status = Number.isFinite(age) && now.getTime() - age > STALE_AFTER_MS ? "stale" : "observed";
  const lifetime = record(snap.value.lifetime) ?? {};
  const reported = count(lifetime.reportedUsageCount);
  const completions = count(lifetime.agentCompletions);
  const raw = record(lifetime.tokens) ?? {};
  const value = { input: count(raw.input), output: count(raw.output), reasoning: count(raw.reasoning), cacheRead: count(raw.cacheRead), cacheWrite: count(raw.cacheWrite), total: count(raw.total) };
  const totals = reported
    ? fact(value, status, [file], `from ${reported} of ${completions ?? "an unknown number of"} completions that reported usage; total is copied, not the sum of the fields${status === "stale" ? "; snapshot is older than 7 days" : ""}`)
    : unavailable("no completion reported usage", [file]);
  return { totals, byModel: modelRows(record(snap.value.dimensions)?.models, status, file), flows: flowRows(snap.value.flows, status, file, (slug) => hillScopeIds(root, slug)) };
}

// --- architecture, history and risks: built from one shared graph parse and bounded reads, never from source contents ---
const BUDGETS: Record<string, number> = { architecture: 256 * 1024, history: 256 * 1024, risks: 32 * 1024, tokens: 32 * 1024 };
const GLOBAL_BUDGET = 960 * 1024;
const sizeOf = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

type Marked = { status?: string; note?: string; value?: Record<string, unknown> };
interface StructureView { tree?: unknown; limits?: { status?: string }; repoShape?: { value?: unknown } }

function deepSections(root: string, now: Date, scrub: (text: unknown) => string, snapshot: Record<string, unknown>, graph: TokenRead) {
  const graphApi = createStateGraph({ ...deps, scrub });
  const index = graph.value ? graphApi.indexGraph(graph.value, { bytes: graph.bytes ?? 0, mtimeMs: graph.mtimeMs ?? 0 }, now) : { unavailable: `${GRAPH_FILE} ${problem(graph)}` };
  const structure = snapshot.structure as StructureView | undefined;
  const treeFacts = Array.isArray(structure?.tree) ? structure.tree as Array<{ value: { path: string } }> : null;
  const tree: string[] | null = treeFacts ? treeFacts.map((item) => item.value.path) : null;
  const opts = { treeTruncated: structure?.limits?.status === "stale", repoShape: typeof structure?.repoShape?.value === "string" ? structure.repoShape.value : null };
  const dependsOnStructure = unavailable("depends on structure");
  const fromGraph = section(() => graphApi.architectureFacts(index, tree, root, opts), "architecture graph");
  const riskGraph = section(() => graphApi.riskGraphFacts(index, tree, root, now, opts), "risks graph");
  const architecture = {
    modules: tree ? ("modules" in fromGraph ? fromGraph.modules : fromGraph) : dependsOnStructure,
    imports: tree ? ("imports" in fromGraph ? fromGraph.imports : fromGraph) : dependsOnStructure,
    graph: "graph" in fromGraph ? fromGraph.graph : fromGraph,
    entryPoints: section(() => structureApi.entryPoints(root, { scrub, readMarkdown }), "entry points"),
    packages: unavailable(opts.repoShape === null ? "structure.repoShape not available" : "deferred to followup pitch state-monorepo-packages"),
  };
  const knowledge = "unavailable" in index ? null : graphApi.knowledgeEntries(index);
  const pitches = snapshot.pitches as { items?: StateFact[] } | undefined;
  const history = section(() => historyApi.historySection(root, { items: pitches?.items as StateFact[], doneWork: snapshot.doneWork as StateFact, knowledge, readMarkdown, scrub }), "history");
  const risks = {
    mostConnected: "mostConnected" in riskGraph ? riskGraph.mostConnected : riskGraph,
    testFiles: "testFiles" in riskGraph ? riskGraph.testFiles : riskGraph,
    staleKnowledge: "staleKnowledge" in riskGraph ? riskGraph.staleKnowledge : riskGraph,
    openFollowups: section(() => historyApi.followupsFact(root, readMarkdown), "followups"),
    todoMarkers: unavailable("TODO counts need file contents, which the report never reads"),
  };
  return { architecture, history, risks };
}

// Shrinks one section to a byte budget: halve every list, then fall back to counts only. A shrunk fact is never
// left "observed", so nothing describes a trimmed list as complete.
function shrinkSection(target: Record<string, unknown>, budget: number): void {
  const mark = (item: unknown, note: string) => {
    const marked = item as Marked | null;
    if (marked && typeof marked === "object" && "status" in marked) { if (marked.status === "observed") marked.status = "stale"; marked.note = marked.note ? `${marked.note}; ${note}` : note; }
  };
  for (let level = 1; level <= 8 && sizeOf(target) > budget; level++) {
    const counts = level > 4;
    const note = counts ? "shrunk to counts only to fit the size budget" : `shrunk to the top entries to fit the ${Math.round(budget / 1024)} KB budget`;
    let changed = false;
    for (const key of Object.keys(target)) {
      const entry = target[key];
      if (Array.isArray(entry) && entry.length > (counts ? 0 : 1)) {
        if (counts) target[key] = fact({ count: entry.length, shrunk: true }, "stale", [], note);
        else { entry.length = Math.ceil(entry.length / 2); entry.forEach((item) => mark(item, note)); }
        changed = true;
      } else if (entry && typeof entry === "object" && (entry as Marked).value && typeof (entry as Marked).value === "object") {
        const inner = (entry as Marked).value as Record<string, unknown>;
        for (const [name, list] of Object.entries(inner)) if (Array.isArray(list) && list.length > (counts ? 0 : 1)) { inner[name] = list.slice(0, counts ? 0 : Math.ceil(list.length / 2)); mark(entry, note); changed = true; }
      }
    }
    if (!changed && level < 5) level = 4;
  }
}

function applyBudgets(snapshot: Record<string, unknown>): void {
  for (const [name, budget] of Object.entries(BUDGETS)) if (snapshot[name] && typeof snapshot[name] === "object") shrinkSection(snapshot[name] as Record<string, unknown>, budget);
  for (const name of ["risks", "history", "architecture", "tokens"]) {
    if (sizeOf(snapshot) + 4096 <= GLOBAL_BUDGET) break;
    if (snapshot[name] && typeof snapshot[name] === "object") shrinkSection(snapshot[name] as Record<string, unknown>, 0);
  }
}

function runsSection(root: string, scrub: (text: unknown) => string) {
  let names;
  try {
    const stat = fs.lstatSync(path.join(root, ".project/runs"));
    if (stat.isSymbolicLink() || !stat.isDirectory()) return unavailable(".project/runs is not a regular directory");
    names = fs.readdirSync(path.join(root, ".project/runs")).filter((name) => /^\d{4}-\d{2}-\d{2}-[A-Za-z0-9._-]{1,120}\.md$/.test(name) && scrub(name) === name).sort(); } catch { return unavailable("no .project/runs directory"); }
  return fact({ count: names.length, latest: names.slice(-5) }, "observed", names.slice(-5).map((name) => `.project/runs/${name}`));
}

function doneWorkSection(root: string) {
  const source = readMarkdown(root, ".project/done-work.md");
  const all = compactedSlugs(root, deps, source.text ?? "");
  if ((source.missing || source.error) && all.size === 0) return unavailable(problem(source), []);
  const entries = [...all].map(([slug, info]) => ({ slug, shipped: info.shipped }));
  const status = source.truncated ? "stale" : "observed";
  return fact({ compacted: entries.length, entries: entries.slice(0, 100) }, status, [".project/done-work.md"], source.truncated ? TRUNCATED_NOTE(".project/done-work.md") : undefined);
}

// Each section is built independently so one broken source only marks its own section.
function section<T>(build: () => T, label: string) {
  try { return build(); } catch (error) { return unavailable(`${label} could not be read (${failure(error)})`); }
}

function buildSnapshot(root: string, options: SnapshotOptions = {}) {
  root = resolveRoot(root);
  const now = options.now ? new Date(options.now) : new Date(deps.clock.now());
  if (Number.isNaN(now.getTime())) throw new StateError("Invalid --now timestamp");
  const { scrub, counter } = makeScrubber();
  const tokenFile = readJson(root, TOKEN_FILE);
  const graphFile = readJson(root, GRAPH_FILE, GRAPH_FILE_BYTES);
  const snapshot = {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    authority: "Derived view, not a source of truth: .project/status.md and .project/runs/ remain the lifecycle authorities.",
    workflow: section(() => workflowSection(root, now, scrub, options), "workflow"),
    project: section(() => projectSection(root, scrub), "project"),
    database: section(() => databaseSection(root), "database"),
    pitches: section(() => pitchesSection(root, scrub), "pitches"),
    doneWork: section(() => doneWorkSection(root), "done-work"),
    knowledge: section(() => knowledgeSection(root, graphFile), "knowledge"),
    structure: section(() => structureApi.scanStructure(root, { scrub, readMarkdown }), "structure"),
    skills: section(() => skillsSection(root, scrub), "skills"),
    metrics: section(() => metricsSection(now, scrub, tokenFile), "metrics"),
    tokens: section(() => tokensSection(root, now, tokenFile), "tokens"),
    runs: section(() => runsSection(root, scrub), "runs"),
  };
  Object.assign(snapshot, section(() => deepSections(root, now, scrub, snapshot, graphFile), "deep evidence"));
  applyBudgets(snapshot);
  snapshot.redactions = counter.redactions;
  return snapshot;
}

// Every leaf fact, wherever it sits — used by validation and by the renderer.
function* facts(node: unknown, trail = "", depth = 0): Generator<[string, StateFact]> {
  if (depth > 32) { yield [trail, { value: DEPTH_PLACEHOLDER, status: "unavailable", evidence: [], note: "nesting exceeds depth limit" }]; return; }
  if (Array.isArray(node)) { for (const [index, item] of node.entries()) yield* facts(item, `${trail}[${index}]`, depth + 1); return; }
  if (!node || typeof node !== "object") return;
  if ("status" in node && typeof node.status === "string" && "evidence" in node && Array.isArray(node.evidence)) { yield [trail, node as StateFact]; return; }
  for (const [key, value] of Object.entries(node)) yield* facts(value, trail ? `${trail}.${key}` : key, depth + 1);
}

function checkSnapshot(root: string, snapshot: unknown) {
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
function writeAtomic(root: string, relative: string, text: string) {
  try {
    const destination = resolveFile({ roots: { target: root } }, relative, "target", deps);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    // "wx" refuses an existing path (including a pre-planted symlink); the random suffix makes one unguessable.
    const temporary = `${destination}.tmp-${deps.proc.pid}-${Array.from(deps.crypto.randomBytes(6), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
    try { fs.writeFileSync(temporary, text, { mode: 0o644, flag: "wx" }); fs.renameSync(temporary, destination); } finally { fs.rmSync(temporary, { force: true }); }
    return relative;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Symlink destination forbidden")) throw new StateError("Symlink destination forbidden");
    throw new StateError(`atomic write failed: ${failure(error)}`);
  }
}

function writeSnapshot(root: string, snapshot: unknown) {
  root = resolveRoot(root);
  const text = `${JSON.stringify(snapshot, null, 2)}\n`;
  // generatedAt alone differing is not a change: rerunning on an unchanged project is a no-op.
  const withoutClock = (json: string): string | null => { try { const { generatedAt, ...rest } = JSON.parse(json); return JSON.stringify(rest); } catch { return null; } };
  const existing = readSource(root, REPORT_FILE).text;
  if (existing !== undefined && withoutClock(existing) !== null && withoutClock(existing) === withoutClock(text)) return { path: REPORT_FILE, changed: false };
  writeAtomic(root, REPORT_FILE, text);
  return { path: REPORT_FILE, changed: true };
}

function cli(argv: string[]) {
  const options: SnapshotOptions = { root: deps.proc.cwd() };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--root" && argv[index + 1] !== undefined) options.root = argv[++index];
    else if (arg === "--now" && argv[index + 1] !== undefined) options.now = argv[++index];
    else throw new StateError("Unknown option");
  }
  const root = resolveRoot(options.root);
  const snapshot = buildSnapshot(root, { now: options.now });
  const write = options.apply ? writeSnapshot(root, snapshot) : null;
  if (options.json) return JSON.stringify(write ? { ...snapshot, written: write } : snapshot, null, 2);
  const counts = {};
  for (const [, item] of facts(snapshot)) counts[item.status] = (counts[item.status] || 0) + 1;
  return printable(`state snapshot for ${path.basename(root)}: ${Object.entries(counts).map(([status, n]) => `${n} ${status}`).join(", ")}; ${snapshot.redactions} redaction(s)`) + `\n${write ? `${write.changed ? "wrote" : "unchanged"} ${write.path}` : "preview only (pass --apply to write .project/reports/state.json)"}`;
}


return { printable, STATUSES, buildSnapshot, checkSnapshot, writeSnapshot, writeAtomic, readSource, facts, REPORT_FILE, cli, shrinkSection, applyBudgets };
}

export function createStateSnapshot(deps: RuntimeDeps): ReturnType<typeof bindStateSnapshot> { return bindStateSnapshot(deps); }
export type StateSnapshot = ReturnType<ReturnType<typeof createStateSnapshot>["buildSnapshot"]>;
export type SourceRead = ReturnType<ReturnType<typeof createStateSnapshot>["readSource"]>;
export const STATUSES = new Set(["observed", "proposed", "stale", "unavailable", "unconfigured"]);
export const REPORT_FILE = ".project/reports/state.json";
export function printable(text: unknown, deps: RuntimeDeps = defaultDeps()): string { return createStateSnapshot(deps).printable(text); }
export function buildSnapshot(root: string, options: SnapshotOptions = {}, deps: RuntimeDeps = defaultDeps()): StateSnapshot { return createStateSnapshot(deps).buildSnapshot(root, options); }
export function checkSnapshot(root: string, snapshot: StateSnapshot, deps: RuntimeDeps = defaultDeps()): string[] { return createStateSnapshot(deps).checkSnapshot(root, snapshot); }
export function writeSnapshot(root: string, snapshot: StateSnapshot, deps: RuntimeDeps = defaultDeps()): { path: string; changed: boolean } { return createStateSnapshot(deps).writeSnapshot(root, snapshot); }
export function writeAtomic(root: string, relative: string, text: string, deps: RuntimeDeps = defaultDeps()): string { return createStateSnapshot(deps).writeAtomic(root, relative, text); }
export function readSource(root: string, relative: string, deps: RuntimeDeps = defaultDeps()): SourceRead { return createStateSnapshot(deps).readSource(root, relative); }
export function facts(node: unknown, trail = "", deps: RuntimeDeps = defaultDeps()): ReturnType<ReturnType<typeof createStateSnapshot>["facts"]> { return createStateSnapshot(deps).facts(node, trail); }
export function main(argv: string[], deps: RuntimeDeps): number {
  const api = createStateSnapshot(deps);
  try { deps.io.stdout.write(`${api.cli(argv)}\n`); return 0; }
  catch (error) { deps.io.stderr.write(`${api.printable(`state-snapshot: ${error instanceof StateError ? error.message : "internal error"}`)}\n`); return 1; }
}

runDirect(import.meta.url, main);
