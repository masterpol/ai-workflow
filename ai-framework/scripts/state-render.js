#!/usr/bin/env node
/*
 * Renders .project/reports/state.json into a self-contained .project/reports/state.html.
 * No scripts, no external loads, a restrictive CSP meta. Every project-supplied string is
 * HTML-escaped at the point of output, links are emitted only for project-relative evidence
 * paths that resolve to a real, non-symlink, non-secret file inside the project, and theme
 * values pass through state-theme's grammar again before they reach the stylesheet.
 * See ai-framework/integrations/state-report.md.
 */
const fs = require("node:fs");
const path = require("node:path");

const { printable, readSource, writeAtomic, facts, STATUSES } = require("./state-snapshot");
const { discoverTheme, themeChanges, safeTheme, THEME_FILE } = require("./state-theme");

const STATE_FILE = ".project/reports/state.json";
const HTML_FILE = ".project/reports/state.html";
const MAX_ITEMS = 50;
const MAX_DEPTH = 3;
const CSP = "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";

const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const SECRET_NAME = /(^|\/)(\.env[^/]*|credentials[^/]*|settings\.local\.json|\.npmrc|\.netrc|\.pypirc|id_(?:rsa|dsa|ecdsa|ed25519)[^/]*|[^/]*\.(?:pem|key|p12|pfx|keystore))$/i;

// A link is only ever produced for a path that is safe by shape AND resolves to a real file
// inside the project. Anything else renders as plain (escaped) text.
function safeEvidencePath(root, relative) {
  if (typeof relative !== "string" || !root || relative.length > 200 || !/^[A-Za-z0-9._/@+-]+$/.test(relative)) return false;
  const parts = relative.split("/");
  if (relative.startsWith("/") || parts.some((part) => part === "" || part === "." || part === "..") || SECRET_NAME.test(relative)) return false;
  let current = root;
  try {
    for (const part of parts) { current = path.join(current, part); if (fs.lstatSync(current).isSymbolicLink()) return false; }
    if (!fs.statSync(current).isFile()) return false;
    const inside = path.relative(root, fs.realpathSync(current));
    return !inside.startsWith("..") && !path.isAbsolute(inside);
  } catch { return false; }
}
const evidence = (root, list) => (Array.isArray(list) ? list.slice(0, MAX_ITEMS) : []).map((item) => (safeEvidencePath(root, item)
  ? `<a href="../../${esc(item)}">${esc(item)}</a>` : `<code>${esc(item)}</code>`)).join("<br>") || `<span class="none">none</span>`;

// Snapshot keys are camelCase identifiers; readers should see words.
const humanKey = (key) => String(key).replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
function value(node, depth = 0) {
  if (node === null || node === undefined || node === "") return `<span class="none">—</span>`;
  if (typeof node !== "object") return esc(node);
  if (depth >= MAX_DEPTH) return "…";
  if (Array.isArray(node)) return node.length ? `<ul>${node.slice(0, MAX_ITEMS).map((item) => `<li>${value(item, depth + 1)}</li>`).join("")}</ul>` : `<span class="none">none</span>`;
  const entries = Object.entries(node).slice(0, 30);
  return entries.length ? `<dl>${entries.map(([key, item]) => `<dt>${esc(humanKey(key))}</dt><dd>${value(item, depth + 1)}</dd>`).join("")}</dl>` : `<span class="none">—</span>`;
}
const badge = (status) => {
  const known = STATUSES.has(status) ? status : "unknown";
  return `<span class="status status-${known}">${esc(known)}</span>`;
};
const isFact = (item) => item && typeof item === "object" && typeof item.status === "string" && Array.isArray(item.evidence);
const MISSING = { value: null, status: "unavailable", evidence: [], note: "this section is missing from the snapshot" };

function row(root, label, item) {
  const fact = isFact(item) ? item : MISSING;
  return `<tr><th scope="row">${esc(label)}</th><td>${value(fact.value)}</td><td>${badge(fact.status)}</td><td>${evidence(root, fact.evidence)}</td><td>${fact.note ? esc(fact.note) : `<span class="none">—</span>`}</td></tr>`;
}
function scroll(caption, inner) {
  return `<div class="scroll" role="group" aria-label="${esc(caption)}" tabindex="0">${inner}</div>`;
}
function table(caption, rows) {
  return scroll(caption, `<table><caption>${esc(caption)}</caption><thead><tr><th scope="col">Fact</th><th scope="col">Value</th><th scope="col">Status</th><th scope="col">Evidence</th><th scope="col">Notes</th></tr></thead><tbody>${rows.join("")}</tbody></table>`);
}
function section(id, title, body) {
  return `<section aria-labelledby="${id}"><h2 id="${id}">${esc(title)}</h2>${body}</section>`;
}
const list = (node) => (Array.isArray(node) ? node : isFact(node) ? [node] : []);

function projectRows(root, snapshot) {
  const rows = [];
  const project = snapshot.project || {};
  for (const [key, label] of [["description", "Product"], ["architecture", "Architecture"], ["technology", "Technology"]]) {
    const entries = list(project[key]);
    if (!entries.length) rows.push(row(root, label, MISSING));
    for (const fact of entries) {
      const heading = fact.value?.heading;
      rows.push(row(root, !heading || heading.toLowerCase() === label.toLowerCase() ? label : `${label}: ${heading}`, { ...fact, value: fact.value?.summary ?? fact.value }));
    }
  }
  rows.push(row(root, "README", project.readme));
  return rows;
}

function pitchTable(root, snapshot) {
  const items = list(snapshot.pitches?.items);
  const body = items.length ? items.slice(0, 100).map((fact) => {
    const v = fact.value && typeof fact.value === "object" ? fact.value : {};
    const hill = v.hill ? `${esc(v.hill.done)} of ${esc(v.hill.scopes)} scopes done` : `<span class="none">—</span>`;
    const title = v.title && v.title !== v.slug ? `<br><span class="sub">${esc(v.title)}</span>` : "";
    return `<tr><th scope="row">${esc(v.slug)}${title}</th><td>${esc(v.phase)}</td><td>${v.appetite ? esc(v.appetite) : `<span class="none">—</span>`}</td><td>${hill}</td><td>${badge(fact.status)}</td><td>${evidence(root, fact.evidence)}</td><td>${fact.note ? esc(fact.note) : `<span class="none">—</span>`}</td></tr>`;
  }) : [`<tr><td colspan="7">No pitches found. ${badge("unavailable")}</td></tr>`];
  return scroll("Pitches and their progress", `<table><caption>Pitches and their progress</caption><thead><tr><th scope="col">Pitch</th><th scope="col">Phase</th><th scope="col">Appetite</th><th scope="col">Hill</th><th scope="col">Source status</th><th scope="col">Evidence</th><th scope="col">Notes</th></tr></thead><tbody>${body.join("")}</tbody></table>`);
}

function themeSection(theme) {
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

const legend = () => `<dl class="legend">${[["observed", "read directly from the cited file"], ["proposed", "the source states a direction, not a decision"], ["unconfigured", "undecided or not set up yet"], ["stale", "observed but older than it should be; the note says why"], ["unavailable", "could not be read; the note says why, nothing is guessed"]].map(([status, meaning]) => `<dt>${badge(status)}</dt><dd>${esc(meaning)}</dd>`).join("")}</dl>`;

const vars = (t) => `--bg:${t.background};--fg:${t.foreground};--primary:${t.primary};--primary-fg:${t.primaryForeground};--muted:${t.muted};--muted-fg:${t.mutedForeground};--border:${t.border};--radius:${t.radius};`;
function stylesheet(theme) {
  const safe = safeTheme(theme);
  return `:root{color-scheme:light dark;${vars(safe.light)}--sans:${safe.light.fontSans};--mono:${safe.light.fontMono};}
@media (prefers-color-scheme:dark){:root{${vars(safe.dark)}--sans:${safe.dark.fontSans};--mono:${safe.dark.fontMono};}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--sans);line-height:1.5}
header,main,nav{max-width:72rem;margin:0 auto;padding:1rem}
header{border-bottom:1px solid var(--border)}
h1{margin:.2rem 0;font-size:1.6rem}h2{margin:2rem 0 .5rem;font-size:1.2rem}
a{color:var(--primary)}
a:focus-visible,.scroll:focus-visible{outline:3px solid var(--primary);outline-offset:2px}
.skip{position:absolute;left:-999px}.skip:focus{left:1rem;top:1rem;background:var(--primary);color:var(--primary-fg);padding:.4rem .8rem;border-radius:var(--radius)}
nav ul{display:flex;flex-wrap:wrap;gap:.5rem 1rem;padding:0;margin:0;list-style:none}
.scroll{overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius)}
table{width:100%;border-collapse:collapse;font-size:.92rem}
caption{text-align:left;padding:.5rem .7rem;color:var(--muted-fg)}
th,td{padding:.5rem .7rem;text-align:left;vertical-align:top;border-top:1px solid var(--border)}
thead th{background:var(--muted);color:var(--fg)}
tbody th{font-weight:600}
.sub,.none{color:var(--muted-fg);font-weight:400}
td,th,a,code{overflow-wrap:anywhere}
code{font-family:var(--mono);font-size:.85em}
dl{margin:0}dt{font-weight:600}dd{margin:0 0 .3rem 1rem}ul{margin:0;padding-left:1.1rem}
.legend{display:grid;grid-template-columns:max-content 1fr;gap:.4rem 1rem;align-items:center}.legend dd{margin:0}
.status{display:inline-block;padding:0 .5rem;border:1px solid var(--border);border-radius:999px;background:var(--muted);color:var(--fg);font-size:.8rem;font-weight:600;white-space:nowrap}
.status-unavailable,.status-stale,.status-unconfigured,.status-proposed,.status-unknown{border:2px dashed var(--fg)}
.summary{font-weight:600}
@media (max-width:640px){header,main,nav{padding:.75rem}table{font-size:.85rem}.legend{grid-template-columns:1fr}.scroll tbody th{position:sticky;left:0;background:var(--bg)}}
@media print{h2{break-after:avoid}:root{--bg:#fff;--fg:#000;--primary:#000;--primary-fg:#fff;--muted:#eee;--muted-fg:#333;--border:#999}nav,.skip{display:none}.scroll{overflow:visible;border:0}tr{break-inside:avoid}a{color:#000;text-decoration:underline}}
`;
}

function renderHtml(snapshot, theme, options = {}) {
  const root = options.root ? fs.realpathSync(options.root) : null;
  const name = snapshot.project?.readme?.value?.title || options.name || "Project";
  const workflow = snapshot.workflow || {};
  const metricsNote = snapshot.metrics?.status === "unavailable" ? "Token metrics are unavailable for this project; nothing is estimated in their place." : null;
  const sections = [
    ["workflow", "Workflow", table("Workflow version and sync state", [row(root, "Installed version", workflow.installedVersion), row(root, "Last sync", workflow.lastSync), row(root, "Sync attention", workflow.partialSync)])],
    ["project", "Project", table("What the project is", projectRows(root, snapshot))],
    ["pitches", "Pitches", `${pitchTable(root, snapshot)}${table("Records behind the pitch list", [row(root, "status.md entries", snapshot.pitches?.statusMd), row(root, "Compacted work", snapshot.doneWork), row(root, "Run archives", snapshot.runs)])}`],
    ["knowledge", "Knowledge and skills", table("Knowledge graph and installed skills", [row(root, "Knowledge entries", snapshot.knowledge), ...list(snapshot.skills?.installed).map((fact) => row(root, `Skill: ${fact.value?.id ?? "—"}`, fact)), row(root, "Caveman mode", snapshot.skills?.caveman)])],
    ["metrics", "Token metrics", `${metricsNote ? `<p>${esc(metricsNote)}</p>` : ""}${table("Measured token usage", [row(root, "Token consumption", snapshot.metrics)])}`],
    ["database", "Database", table("Database and schema", [row(root, "Database", snapshot.database)])],
  ];
  const counts = {};
  for (const [, fact] of facts(snapshot)) counts[STATUSES.has(fact.status) ? fact.status : "unknown"] = (counts[STATUSES.has(fact.status) ? fact.status : "unknown"] || 0) + 1;
  const summary = ["observed", "proposed", "stale", "unavailable", "unconfigured", "unknown"].filter((status) => counts[status]).map((status) => `${counts[status]} ${status}`).join(", ");
  const generated = typeof snapshot.generatedAt === "string" ? snapshot.generatedAt : "unknown time";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>State report — ${esc(name)}</title>
<style>
${stylesheet(theme)}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header><h1>State report — ${esc(name)}</h1><p>Generated ${esc(generated)}. ${esc(snapshot.authority || "")}</p><p class="summary">${esc(summary || "No facts")} — the legend below explains each status.</p></header>
<nav aria-label="Page sections"><ul>${[["legend", "Legend"], ...sections, ["theme", "Styling"]].map(([id, title]) => `<li><a href="#${id}">${esc(title)}</a></li>`).join("")}</ul></nav>
<main id="main">
${section("legend", "Legend", legend())}
${sections.map(([id, title, body]) => section(id, title, body)).join("\n")}
${section("theme", "Styling", themeSection(theme))}
</main>
</body>
</html>
`;
}

function loadSnapshot(root) {
  const source = readSource(root, STATE_FILE);
  if (source.missing) throw new Error(`${STATE_FILE} not found; run node ai-framework/scripts/state-snapshot.js --apply first`);
  if (source.error) throw new Error(`${STATE_FILE} ${source.error}`);
  let snapshot;
  try { snapshot = JSON.parse(source.text); } catch { throw new Error(`${STATE_FILE} is not valid JSON`); }
  if (!snapshot || typeof snapshot !== "object" || snapshot.schemaVersion !== 1) throw new Error(`${STATE_FILE} has an unsupported schemaVersion; regenerate it with state-snapshot.js --apply`);
  return snapshot;
}

function render(root, options = {}) {
  root = fs.realpathSync(root);
  const snapshot = loadSnapshot(root);
  const theme = discoverTheme(root);
  const changes = themeChanges(root, theme);
  const html = renderHtml(snapshot, theme, { root });
  const result = { html: { path: HTML_FILE, bytes: Buffer.byteLength(html), changed: null }, theme: { path: THEME_FILE, mode: theme.mode, sources: theme.sources.length, changes: changes.changed, fallbacks: theme.fallbacks.length } };
  if (options.apply) {
    const themeText = `${JSON.stringify(theme, null, 2)}\n`;
    const same = (file, text) => readSource(root, file).text === text;
    result.html.changed = !same(HTML_FILE, html);
    if (result.html.changed) writeAtomic(root, HTML_FILE, html);
    if (!same(THEME_FILE, themeText)) writeAtomic(root, THEME_FILE, themeText);
  }
  return result;
}

function cli(argv) {
  const options = { root: process.cwd() };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--root" && argv[index + 1] !== undefined) options.root = argv[++index];
    else throw new Error(`Unknown option: ${arg}`);
  }
  const result = render(options.root, options);
  if (options.json) return JSON.stringify(result, null, 2);
  const { html, theme } = result;
  return printable(`theme: ${theme.mode} (${theme.sources} source file(s), ${theme.fallbacks} fallback(s))${theme.changes.length ? `; changed: ${theme.changes.join(", ")}` : ""}`) + `\n${options.apply ? `${html.changed ? "wrote" : "unchanged"} ${html.path}` : `preview only (${html.bytes} bytes; pass --apply to write ${html.path})`}`;
}

module.exports = { renderHtml, render, esc, safeEvidencePath, stylesheet, CSP, STATE_FILE, HTML_FILE };

if (require.main === module) {
  try { process.stdout.write(`${cli(process.argv.slice(2))}\n`); } catch (error) { process.stderr.write(`${printable(`state-render: ${error.message}`)}\n`); process.exitCode = 1; }
}
