import { runDirect } from "./runtime/cli.mts";
/*
 * Renders .project/reports/state.json into a self-contained .project/reports/state.html.
 * No scripts, no external loads, a restrictive CSP meta. Every project-supplied string is
 * HTML-escaped at the point of output, links are emitted only for project-relative evidence
 * paths that resolve to a real, non-symlink, non-secret file inside the project, and theme
 * values pass through state-theme's grammar again before they reach the stylesheet.
 * See ai-framework/integrations/state-report.md.
 */
import { createNodeDeps } from "./runtime/node.mts";
import { createStatePages, PAGE_BYTE_CAP } from "./state-pages.mts";
import { createStateDesign, SLOT_NAMES } from "./state-design.mts";
import { createStateInject } from "./state-fragment-inject.mts";
import { isSecretName } from "./state-structure.mts";
import { createStateSnapshot, StateError, DEPTH_PLACEHOLDER } from "./state-snapshot.mts";
import { discoverTheme, themeChanges, THEME_FILE } from "./state-theme.mts";

import type { RuntimeDeps } from "./runtime/types.mts";
import type { StateSnapshot } from "./state-snapshot.mts";
import type { Theme } from "./state-theme.mts";

let nodeDeps: RuntimeDeps | undefined;
function defaultDeps(): RuntimeDeps { return (nodeDeps ??= createNodeDeps()); }
export interface RenderOptions { root?: string; name?: string; apply?: boolean; json?: boolean; cap?: number; strictFragments?: boolean }
/** Keep evidence validation and report writes on the same injected runtime as the snapshot. */
function bindStateRender(deps: RuntimeDeps) {
const { fs, path } = deps;
const { printable, readSource, writeAtomic, facts, STATUSES } = createStateSnapshot(deps);
const REPORTS_DIR = ".project/reports";
const STATE_FILE = ".project/reports/state.json";
const HTML_FILE = ".project/reports/state.html";
const MAX_ITEMS = 50;
const MAX_DEPTH = 3;
const MAX_PITCH_ROWS = 100;
// MAX_ITEMS/MAX_DEPTH bound structure, but a single leaf string is unbounded on its own: state.json
// is the untrusted-input path (see the design decision), so cap it here too, independent of the
// source file's total size.
const MAX_TEXT = 500;
// Only scalars (string/number/boolean) ever reach the page from state.json; anything else (an object
// with a hostile toString, an array, null) is "" so no String() call can throw or leak structure.
const scalar = (value: unknown): string => (typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : "");
const boundedText = (text: unknown): string => { const t = scalar(text); return t.length > MAX_TEXT ? `${t.slice(0, MAX_TEXT)}…` : t; };
const CSP = "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";

const esc = (value: unknown): string => scalar(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// A link is only ever produced for a path that is safe by shape AND resolves to a real file
// inside the project. Anything else renders as plain (escaped) text.
function safeEvidencePath(root: string | null, relative: unknown) {
  if (typeof relative !== "string" || !root || relative.length > 200 || !/^[A-Za-z0-9._/@+-]+$/.test(relative)) return false;
  const parts = relative.split("/");
  if (relative.startsWith("/") || parts.some((part) => part === "" || part === "." || part === "..") || parts.some(isSecretName)) return false;
  let current = root;
  try {
    for (const part of parts) { current = path.join(current, part); if (fs.lstatSync(current).isSymbolicLink()) return false; }
    if (!fs.statSync(current).isFile()) return false;
    const inside = path.relative(root, fs.realpathSync(current));
    return !inside.startsWith("..") && !path.isAbsolute(inside);
  } catch { return false; }
}
const evidence = (root, list, max = MAX_ITEMS) => {
  const all = (Array.isArray(list) ? list : []).filter((item) => typeof item === "string");
  const cap = Math.max(0, Math.min(MAX_ITEMS, max));
  const shown = all.slice(0, cap).map((item) => (safeEvidencePath(root, item)
    ? `<a href="../../${esc(item)}">${esc(item)}</a>` : `<code>${esc(boundedText(item))}</code>`));
  if (all.length > cap && cap < MAX_ITEMS) shown.push(`<span class="none">+${all.length - cap} more</span>`);
  return shown.join("<br>") || `<span class="none">none</span>`;
};

// Snapshot keys are camelCase identifiers; readers should see words.
const humanKey = (key: unknown): string => scalar(key).replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
function value(node: unknown, depth = 0): string {
  if (depth > 32) return DEPTH_PLACEHOLDER;
  if (node === null || node === undefined || node === "") return `<span class="none">—</span>`;
  if (typeof node !== "object") return esc(typeof node === "string" ? boundedText(node) : node);
  if (depth >= MAX_DEPTH) return "…";
  if (Array.isArray(node)) return node.length ? `<ul>${node.slice(0, MAX_ITEMS).map((item) => `<li>${value(item, depth + 1)}</li>`).join("")}</ul>` : `<span class="none">none</span>`;
  const entries = Object.entries(node).slice(0, 30);
  return entries.length ? `<dl>${entries.map(([key, item]) => `<dt>${esc(humanKey(key))}</dt><dd>${value(item, depth + 1)}</dd>`).join("")}</dl>` : `<span class="none">—</span>`;
}
const badge = (status: string): string => {
  const known = STATUSES.has(status) ? status : "unknown";
  return `<span class="status status-${known}">${esc(known)}</span>`;
};
const isFact = (item) => item && typeof item === "object" && typeof item.status === "string" && Array.isArray(item.evidence);
const MISSING = { value: null, status: "unavailable", evidence: [], note: "this section is missing from the snapshot" };

function row(root, label, item) {
  const fact = isFact(item) ? item : MISSING;
  return `<tr><th scope="row">${esc(label)}</th><td>${value(fact.value)}</td><td>${badge(fact.status)}</td><td>${evidence(root, fact.evidence)}</td><td>${boundedText(fact.note) ? esc(boundedText(fact.note)) : `<span class="none">—</span>`}</td></tr>`;
}
function scroll(caption: string, inner: string) {
  return `<div class="scroll" role="group" aria-label="${esc(caption)}" tabindex="0">${inner}</div>`;
}
function table(caption: string, rows: string[]) {
  return scroll(caption, `<table><caption>${esc(caption)}</caption><thead><tr><th scope="col">Fact</th><th scope="col">Value</th><th scope="col">Status</th><th scope="col">Evidence</th><th scope="col">Notes</th></tr></thead><tbody>${rows.join("")}</tbody></table>`);
}
function section(id: string, title: string, body: string) {
  return `<section aria-labelledby="${id}"><h2 id="${id}">${esc(title)}</h2>${body}</section>`;
}
// A non-fact element (null, a bare string, a hand-edited record missing status/evidence) must not
// crash the whole render — projectRows/pitchTable/the skills mapping all trust every element here
// is fact-shaped, so filter before they ever see it, the same way row() falls back to MISSING.
const list = (node) => (Array.isArray(node) ? node.filter(isFact) : isFact(node) ? [node] : []);

function projectRows(root: string | null, snapshot: StateSnapshot) {
  const rows = [];
  const project = snapshot.project || {};
  for (const [key, label] of [["description", "Product"], ["architecture", "Architecture"], ["technology", "Technology"]]) {
    const entries = list(project[key]);
    if (!entries.length) rows.push(row(root, label, MISSING));
    for (const fact of entries) {
      const heading = boundedText(fact.value?.heading);
      rows.push(row(root, !heading || heading.toLowerCase() === label.toLowerCase() ? label : `${label}: ${heading}`, { ...fact, value: fact.value?.summary ?? fact.value }));
    }
  }
  rows.push(row(root, "README", project.readme));
  return rows;
}

function pitchTable(root: string | null, snapshot: StateSnapshot, limit = MAX_PITCH_ROWS) {
  const items = list(snapshot.pitches?.items);
  const body = items.length ? items.slice(0, Math.min(MAX_PITCH_ROWS, limit)).map((fact) => {
    const v = fact.value && typeof fact.value === "object" ? fact.value : {};
    const hill = v.hill && typeof v.hill === "object" ? `${esc(v.hill.done)} of ${esc(v.hill.scopes)} scopes done` : `<span class="none">—</span>`;
    const title = boundedText(v.title) && v.title !== v.slug ? `<br><span class="sub">${esc(boundedText(v.title))}</span>` : "";
    return `<tr><th scope="row">${esc(boundedText(v.slug))}${title}</th><td>${esc(boundedText(v.phase))}</td><td>${boundedText(v.appetite) ? esc(boundedText(v.appetite)) : `<span class="none">—</span>`}</td><td>${hill}</td><td>${badge(fact.status)}</td><td>${evidence(root, fact.evidence, limit)}</td><td>${boundedText(fact.note) ? esc(boundedText(fact.note)) : `<span class="none">—</span>`}</td></tr>`;
  }) : [`<tr><td colspan="7">No pitches found. ${badge("unavailable")}</td></tr>`];
  return scroll("Pitches and their progress", `<table><caption>Pitches and their progress</caption><thead><tr><th scope="col">Pitch</th><th scope="col">Phase</th><th scope="col">Appetite</th><th scope="col">Hill</th><th scope="col">Source status</th><th scope="col">Evidence</th><th scope="col">Notes</th></tr></thead><tbody>${body.join("")}</tbody></table>`);
}

const projectName = (snapshot: StateSnapshot, fallback: unknown): string => boundedText(snapshot.project?.readme?.value?.title) || boundedText(fallback) || "Project";

function themeSection(theme: Theme) {
  const t = theme && typeof theme === "object" ? theme : {};
  const rows = [
    ["Theme source", t.mode === "discovered" ? "discovered from project stylesheets" : t.mode === "partial" ? "partly discovered; documented fallback for the rest" : "documented shadcn-style fallback"],
    ["Reason", t.reason || null],
    ["Fallbacks", (Array.isArray(t.fallbacks) ? t.fallbacks : []).map((item) => `${item?.scope}: ${item?.reason}`)],
    ["Rejected values", (Array.isArray(t.rejected) ? t.rejected : []).slice(0, 20).map((item) => `${item?.mode} ${item?.token} in ${item?.file}: ${item?.reason}`)],
    ["Source files", (Array.isArray(t.sources) ? t.sources : []).map((item) => `${item?.path} (sha256 ${String(item?.sha256 || "").slice(0, 12)})`)],
  ];
  return scroll("How this report was styled", `<table><caption>How this report was styled</caption><thead><tr><th scope="col">Item</th><th scope="col">Detail</th></tr></thead><tbody>${rows.map(([label, detail]) => `<tr><th scope="row">${esc(label)}</th><td>${value(detail)}</td></tr>`).join("")}</tbody></table>`);
}

const design = createStateDesign({ esc, CSP });
const stylesheet = design.stylesheet;
const pages = createStatePages(deps, { esc, scalar, safeEvidencePath, row, table, scroll, section, list, badge, boundedText, evidence, value, design, CSP, pitchTable: (r, s, l) => pitchTable(r, s, l), projectRows: (r, s) => projectRows(r, s) });
const legend = () => `<dl class="legend">${[["observed", "read directly from the cited file"], ["proposed", "the source states a direction, not a decision"], ["unconfigured", "undecided or not set up yet"], ["stale", "observed but older than it should be; the note says why"], ["unavailable", "could not be read; the note says why, nothing is guessed"]].map(([status, meaning]) => `<dt>${badge(status)}</dt><dd>${esc(meaning)}</dd>`).join("")}</dl>`;

function renderHtml(snapshot: StateSnapshot, theme: Theme, options: RenderOptions = {}) {
  const root = options.root ? fs.realpathSync(options.root) : null;
  const name = projectName(snapshot, options.name);
  const workflow = snapshot.workflow || {};
  const metricsNote = snapshot.metrics?.status === "unavailable" ? "Token metrics are unavailable for this project; nothing is estimated in their place." : null;
  const sections = [
    ["workflow", "Workflow", table("Workflow version and sync state", [row(root, "Installed version", workflow.installedVersion), row(root, "Last sync", workflow.lastSync), row(root, "Sync attention", workflow.partialSync)])],
    ["project", "Project", table("What the project is", projectRows(root, snapshot))],
    ["pitches", "Pitches", `${pitchTable(root, snapshot)}${table("Records behind the pitch list", [row(root, "status.md entries", snapshot.pitches?.statusMd), row(root, "Compacted work", snapshot.doneWork), row(root, "Run archives", snapshot.runs)])}`],
    ["knowledge", "Knowledge and skills", table("Knowledge graph and installed skills", [row(root, "Knowledge entries", snapshot.knowledge), ...list(snapshot.skills?.installed).map((fact) => row(root, `Skill: ${boundedText(fact.value?.id) || "—"}`, fact)), row(root, "Caveman mode", snapshot.skills?.caveman)])],
    ["metrics", "Token metrics", `${metricsNote ? `<p>${esc(metricsNote)}</p>` : ""}${table("Measured token usage", [row(root, "Token consumption", snapshot.metrics)])}`],
    ["database", "Database", table("Database and schema", [row(root, "Database", snapshot.database)])],
  ];
  const counts = {};
  for (const [, fact] of facts(snapshot)) counts[STATUSES.has(fact.status) ? fact.status : "unknown"] = (counts[STATUSES.has(fact.status) ? fact.status : "unknown"] || 0) + 1;
  const summary = ["observed", "proposed", "stale", "unavailable", "unconfigured", "unknown"].filter((status) => counts[status]).map((status) => `${counts[status]} ${status}`).join(", ");
  const generated = boundedText(snapshot.generatedAt) || "unknown time";
  const nav = `<nav aria-label="Page sections"><ul>${[["legend", "Legend"], ...sections, ["theme", "Styling"]].map(([id, title]) => `<li><a href="#${id}">${esc(title)}</a></li>`).join("")}</ul></nav>`;
  const main = `${nav}
${section("legend", "Legend", legend())}
${sections.map(([id, title, body]) => section(id, title, body)).join("\n")}
${section("theme", "Styling", themeSection(theme))}`;
  const context = { name, generated, theme, version: boundedText(workflow.installedVersion?.value), heading: "State report", summary: `${summary || "No facts"} — the legend below explains each status. ${boundedText(snapshot.authority)}`.trim() };
  const html = design.shell("state", main, context);
  if (new TextEncoder().encode(html).byteLength <= (options.cap ?? PAGE_BYTE_CAP)) return html;
  return design.shell("state", section("omitted", "Full report", `<p class="none">Page omitted: exceeds size cap.</p>`), context);
}

function loadSnapshot(root: string) {
  const source = readSource(root, STATE_FILE);
  if (source.missing) throw new StateError(`${STATE_FILE} not found; run node ai-framework/scripts/state-snapshot.mts --apply first`);
  if (source.error) throw new StateError(`${STATE_FILE} ${source.error}`);
  let snapshot;
  try { snapshot = JSON.parse(source.text); } catch { throw new StateError(`${STATE_FILE} is not valid JSON`); }
  if (!snapshot || typeof snapshot !== "object" || snapshot.schemaVersion !== 1) throw new StateError(`${STATE_FILE} has an unsupported schemaVersion; regenerate it with state-snapshot.mts --apply`);
  return snapshot;
}

function render(root: string, options: RenderOptions = {}) {
  // A raw ENOENT/EACCES message embeds the absolute path; keep only a fixed reason.
  try { root = fs.realpathSync(root); } catch { throw new StateError("--root does not exist or is not resolvable"); }
  const snapshot = loadSnapshot(root);
  // Only the exact string "monorepo" selects the workflow default theme; anything else, including a hostile value, is "single".
  const shapeFact = (snapshot.structure as { repoShape?: { value?: unknown } } | undefined)?.repoShape;
  const repoShape = shapeFact && typeof shapeFact === "object" && shapeFact.value === "monorepo" ? "monorepo" : "single";
  const theme = discoverTheme(root, { repoShape }, deps);
  const changes = themeChanges(root, theme, deps);
  const html = renderHtml(snapshot, theme, { root, cap: options.cap });
  const name = projectName(snapshot, undefined);
  // Fragments go only into the six pages, never state.html. A directory that is absent renders byte-identical to a report without them.
  const inject = createStateInject(deps), loaded = inject.load(root, snapshot, { strict: options.strictFragments === true }), summary = inject.summarize(loaded);
  const fill = (omit: boolean) => Object.fromEntries(SLOT_NAMES.map((slot) => [slot, inject.container(slot, omit && loaded[slot].shown ? { ...loaded[slot], shown: false, reason: "omitted: page size cap" } : loaded[slot], { esc, evidence: (items: string[]) => evidence(root, items) })]));
  const files = { "state.html": html, ...pages.renderPages(snapshot, theme, { root, name, cap: options.cap, fragments: { full: fill(false), omitted: fill(true) } }) };
  const size = (text: string) => new TextEncoder().encode(text).byteLength;
  const result = { skipped: [] as string[], html: { path: HTML_FILE, bytes: size(html), changed: null }, pages: Object.entries(files).map(([file, text]) => ({ path: `${REPORTS_DIR}/${file}`, bytes: size(text), changed: null })), theme: { path: THEME_FILE, mode: theme.mode, repoShape, sources: theme.sources.length, changes: changes.changed, fallbacks: theme.fallbacks.length }, fragments: summary.slots, fragmentsSummary: summary.line };
  if (options.apply) {
    const themeText = `${JSON.stringify({ ...theme, repoShape }, null, 2)}\n`;
    const { changed, skipped } = pages.writeSet(root, REPORTS_DIR, files, (file) => readSource(root, file).text);
    result.skipped = skipped;
    result.html.changed = changed.includes("state.html");
    for (const page of result.pages) page.changed = changed.includes(page.path.slice(REPORTS_DIR.length + 1));
    if (readSource(root, THEME_FILE).text !== themeText) writeAtomic(root, THEME_FILE, themeText);
  }
  return result;
}

function cli(argv: string[]) {
  const options: RenderOptions = { root: deps.proc.cwd() };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--strict-fragments") options.strictFragments = true;
    else if (arg === "--root" && argv[index + 1] !== undefined) options.root = argv[++index];
    else throw new StateError("Unknown option");
  }
  const result = render(options.root, options);
  if (options.json) return JSON.stringify(result, null, 2);
  const { html, theme } = result;
  return printable(`theme: ${theme.repoShape === "monorepo" ? "workflow default (monorepo, project CSS not scanned)" : theme.mode} (${theme.sources} source file(s), ${theme.fallbacks} fallback(s))${theme.changes.length ? `; changed: ${theme.changes.join(", ")}` : ""}`) + `\n${options.apply ? `${html.changed ? "wrote" : "unchanged"} ${html.path}; ${result.pages.filter((p) => p.changed).length} of ${result.pages.length} report page(s) written` : `preview only (${html.bytes} bytes, ${result.pages.length} pages; pass --apply to write ${REPORTS_DIR}/)`}` + (result.skipped.length ? `\nskipped user-owned page(s): ${result.skipped.join(", ")}` : "") + `\n${result.fragmentsSummary}`;
}


return { value, renderHtml, render, renderPages: pages.renderPages, esc, safeEvidencePath, stylesheet, CSP, STATE_FILE, HTML_FILE, cli };
}

export const CSP = "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";
export const STATE_FILE = ".project/reports/state.json";
export const HTML_FILE = ".project/reports/state.html";
export function createStateRender(deps: RuntimeDeps): ReturnType<typeof bindStateRender> { return bindStateRender(deps); }
export type RenderResult = ReturnType<ReturnType<typeof createStateRender>["render"]>;
export function renderHtml(snapshot: StateSnapshot, theme: Theme, options: RenderOptions = {}, deps: RuntimeDeps = defaultDeps()): string { return createStateRender(deps).renderHtml(snapshot, theme, options); }
export function render(root: string, options: RenderOptions = {}, deps: RuntimeDeps = defaultDeps()): RenderResult { return createStateRender(deps).render(root, options); }
export function esc(value: unknown, deps: RuntimeDeps = defaultDeps()): string { return createStateRender(deps).esc(value); }
export function safeEvidencePath(root: string | null, relative: unknown, deps: RuntimeDeps = defaultDeps()): boolean { return createStateRender(deps).safeEvidencePath(root, relative); }
export function stylesheet(theme: Theme, deps: RuntimeDeps = defaultDeps()): string { return createStateRender(deps).stylesheet(theme); }
export function main(argv: string[], deps: RuntimeDeps): number {
  const api = createStateRender(deps);
  try { deps.io.stdout.write(`${api.cli(argv)}\n`); return 0; }
  catch (error) {
    deps.io.stderr.write(`${createStateSnapshot(deps).printable(`state-render: ${error instanceof StateError ? error.message : "internal error"}`)}\n`);
    return 1;
  }
}

runDirect(import.meta.url, main);
