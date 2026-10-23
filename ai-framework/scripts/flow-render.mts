import { FLOW_LIMITS } from "./flow-join.mts";
import type { FlowNode, FlowReport, TokenCell } from "./flow-join.mts";

/*
 * Pure renderers for the sanitized flow report. All three formats are built from the same report model,
 * so source status, windows, coverage, provisional timing, omitted counts and unavailable metrics cannot
 * drift between them. Each carries a format-specific generator marker plus one generation ID, which is
 * how a later apply recognises its own files and how a mixed set of generations is detected.
 */
export const GENERATOR = "ai-workflow/flow-report";
export const FORMATS = ["json", "markdown", "html"] as const;
export type Format = typeof FORMATS[number];
export const FILE_NAMES: Record<Format, string> = { json: "flow-report.json", markdown: "flow-report.md", html: "flow-report.html" };
const ID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const MARKER_LINE = (format: Format, id: string): string => `<!-- generator: ${GENERATOR}; format: ${format}; generation: ${id} -->`;
const MARKER_START: Record<"markdown" | "html", RegExp> = {
  markdown: new RegExp(`^<!-- generator: ${GENERATOR}; format: markdown; generation: ${ID} -->\\n`),
  html: new RegExp(`^<!doctype html>\\n<!-- generator: ${GENERATOR}; format: html; generation: ${ID} -->\\n`),
};

/** True only for a file this renderer wrote in this format; a bare schemaVersion never counts. */
export function ownsFormat(format: Format, text: string): boolean {
  if (format !== "json") return MARKER_START[format].test(text);
  try {
    const value: unknown = JSON.parse(text);
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const marker = value as Record<string, unknown>;
    return marker.generator === GENERATOR && marker.format === "json" && typeof marker.generationId === "string" && new RegExp(`^${ID}$`).test(marker.generationId);
  } catch { return false; }
}

interface Table { title: string; header: string[]; rows: string[][]; note?: string }
type Cellish = string | number | boolean | null | undefined;
const text = (v: Cellish): string => (v === null || v === undefined ? "unavailable" : String(v).replace(/[\u0000-\u001f\u007f]+/g, " "));
const TIME = ["activeMs", "waitMs", "turnsStarted", "turnsFinished", "gapsMeasured", "gapsUnmeasured", "gapsOverCap"] as const;
const TIME_HEAD = ["Active ms", "Wait ms (lower bound)", "Turns started", "Turns finished", "Gaps measured", "Gaps unmeasured", "Gaps over cap"];

function tokenRows(scope: string, cells: TokenCell[] | null): string[][] {
  if (cells === null) return [[scope, "unavailable", "unavailable", "unavailable", "unavailable", "unavailable", "unavailable", "no vendor token rows"]];
  return cells.map(c => [scope, c.vendor, c.completionUnit, text(c.completions), text(c.reportedUsage), text(c.unavailable), text(c.tokens), c.status].map(text));
}
const tokenSummary = (cells: TokenCell[] | null): string => (cells === null ? "unavailable" : cells.map(c => `${c.vendor}: ${text(c.tokens)} tokens (${text(c.reportedUsage)} of ${text(c.completions)} reported, ${c.status})`).join("; "));
const timeCells = (row: FlowNode["time"]): string[] => TIME.map(k => text(row ? row[k] : null));

function flatten(nodes: FlowNode[], path: FlowNode[], into: FlowNode[][]): void {
  for (const node of nodes) { const here = [...path, node]; into.push(here); flatten(node.children, here, into); }
}

function tables(report: FlowReport): Table[] {
  const w = report.windows, t = report.timing, provisional = t.provisional === true;
  const timingNote = provisional ? "Timing is provisional: pending or buffered intervals have not settled, and no elapsed time is extrapolated." : undefined;
  const paths: FlowNode[][] = [];
  flatten(report.pitches, [], paths);
  const pitches = report.pitches;
  return [
    { title: "Sources", header: ["Source", "Status", "Since", "Updated", "Reason", "Details"],
      rows: (["tokens", "usage", "history"] as const).map(name => { const s = report.sources[name]; return [name, s.status, s.since, s.updatedAt, s.reason ?? "none", Object.entries(s.details).map(([k, v]) => `${k}=${text(v)}`).join(", ") || "none"].map(text); }) },
    { title: "Observation windows and timing", header: ["Item", "Value"], note: timingNote,
      rows: [["Token window start", w.tokensSince], ["Usage window start", w.usageSince], ["History snapshot generated", w.historyGeneratedAt], ["Windows aligned", w.aligned], ["Timing provisional", t.provisional],
        ["Pending activities", t.pendingActivities], ["Buffered intervals", t.bufferedIntervals], ["Settled through", t.settledThrough], ["Omitted leaf rows", report.omitted.leafRows], ["Omitted pitches", report.omitted.pitches]].map(r => r.map(text)) },
    { title: "Token coverage", header: ["Totals", "Vendor", "Completion unit", "Completions", "Reported usage", "Unavailable usage", "Tokens", "Status"],
      rows: [...tokenRows("All validated rows", report.totals.tokens), ...tokenRows(`Displayed rows (${report.totals.displayed.leafRows})`, report.totals.displayed.tokens)] },
    { title: "Time totals (stored, not summed from children)", header: TIME_HEAD, note: timingNote, rows: [timeCells(report.totals.time)] },
    { title: "Pitch, phase and scope rows", header: ["Level", "Path", "Identity", "Sources", ...TIME_HEAD, "Tokens", "Omitted children"],
      note: ["Nested time is a stored rollup of overlapping work and is never the sum of its children.", timingNote].filter(Boolean).join(" "),
      rows: paths.map(p => { const n = p[p.length - 1]; return [n.level, p.map(x => x.label).join(" / "), n.identity, n.sources.join(", "), ...timeCells(n.time), tokenSummary(n.tokens), n.omittedChildren].map(text); }) },
    { title: "Pitch transitions and trace", header: ["Pitch", "Repeat", "Forward", "Back", "Other", "Trace (bounded)"],
      rows: pitches.filter(p => p.transitions !== undefined).map(p => [p.label, ...(["repeat", "forward", "back", "other"] as const).map(k => text(p.transitions?.[k])), (p.trace ?? []).map(e => `${e.at} ${e.class} ${e.phase}/${e.scope}`).join("; ") || "none"].map(text)) },
    { title: "History availability", header: ["Pitch", "Availability", "Reason", "Phase", "Shipped", "Audit", "Audit cycles", "Must-fix", "Revisions"],
      rows: pitches.map(p => { const h = p.history; return h ? [p.label, h.availability, h.reason ?? "none", h.phase, h.shipped, h.audit.availability, h.audit.cycles, h.audit.mustFix, `${h.revisions.availability}: ${text(h.revisions.value)}`].map(text) : [p.label, "unavailable", "source-specific label is not joined to history", "", "", "", "", "", ""].map(text); }) },
    { title: "Unavailable metrics", header: ["Metric", "Reason"], rows: report.unavailableMetrics.map(m => [m.metric, m.reason].map(text)) },
  ];
}

const mdCell = (v: string): string => v.replace(/[\\`*_{}[\]<>()#+!|~&\/.@]/g, c => (c === "|" ? "\\|" : `\\${c}`));
const checked = (generationId: string): void => { if (!new RegExp(`^${ID}$`).test(generationId)) throw new Error("invalid generation ID"); };
export function renderMarkdown(report: FlowReport, generationId: string): string {
  checked(generationId);
  const out = [MARKER_LINE("markdown", generationId), "", "# Flow report", "", `Generated ${mdCell(report.generatedAt)} · generation ${generationId}`, ""];
  for (const table of tables(report)) {
    out.push(`## ${table.title.replace(/[\\`*_<>[\]|]/g, c => `\\${c}`)}`, "");
    if (table.note) out.push(mdCell(table.note), "");
    if (table.rows.length === 0) { out.push("_No rows._", ""); continue; }
    out.push(`| ${table.header.map(mdCell).join(" | ")} |`, `| ${table.header.map(() => "---").join(" | ")} |`, ...table.rows.map(r => `| ${r.map(mdCell).join(" | ")} |`), "");
  }
  out.push("## Notes", "", ...report.notes.map(n => `- ${mdCell(n)}`), "");
  return out.join("\n");
}

const esc = (v: string): string => v.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const STYLE = ":root{color-scheme:light dark}body{font:15px/1.5 system-ui,sans-serif;margin:0 auto;padding:1rem 16px;max-width:80rem}"
  + ".scroll{overflow-x:auto;border:1px solid #8886}.scroll:focus-visible{outline:2px solid currentColor;outline-offset:2px}"
  + "table{border-collapse:collapse;width:100%}caption{text-align:left;font-weight:600;padding:.5rem}th,td{border-top:1px solid #8886;padding:.35rem .6rem;text-align:left;vertical-align:top}";
export function renderHtml(report: FlowReport, generationId: string): string {
  checked(generationId);
  const body = tables(report).map((table, i) => {
    const id = `t${i}`, head = table.header.map(h => `<th scope="col">${esc(h)}</th>`).join("");
    const rows = table.rows.map(r => `<tr>${r.map((c, j) => (j === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join("")}</tr>`).join("");
    return `<section aria-labelledby="${id}"><h2 id="${id}">${esc(table.title)}</h2>${table.note ? `<p>${esc(table.note)}</p>` : ""}`
      + (table.rows.length === 0 ? "<p>No rows.</p>" : `<div class="scroll" role="region" aria-labelledby="${id}" tabindex="0"><table><caption>${esc(table.title)}</caption><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`) + "</section>";
  }).join("\n");
  return `<!doctype html>\n${MARKER_LINE("html", generationId)}\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">`
    + `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><meta name="generator" content="${GENERATOR}">`
    + `<title>Flow report</title><style>${STYLE}</style></head><body><main><h1>Flow report</h1><p>Generated ${esc(report.generatedAt)} · generation ${generationId}</p>\n${body}\n`
    + `<section aria-labelledby="notes"><h2 id="notes">Notes</h2><ul>${report.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul></section></main></body></html>\n`;
}

export function renderJson(report: FlowReport, generationId: string): string {
  checked(generationId);
  const { schemaVersion, ...rest } = report;
  return `${JSON.stringify({ schemaVersion, generator: GENERATOR, format: "json", generationId, ...rest }, null, 2)}\n`;
}
export function render(format: Format, report: FlowReport, generationId: string): string {
  return format === "json" ? renderJson(report, generationId) : format === "markdown" ? renderMarkdown(report, generationId) : renderHtml(report, generationId);
}

export interface Rendered { format: Format; name: string; text: string }
/** Renders the requested formats from one generation, or null when any of them would exceed the output cap. */
export function renderFormats(report: FlowReport, generationId: string, formats: readonly Format[]): Rendered[] | null {
  const out = formats.map(format => ({ format, name: FILE_NAMES[format], text: render(format, report, generationId) }));
  return out.every(r => new TextEncoder().encode(r.text).length <= FLOW_LIMITS.outputBytes) ? out : null;
}
