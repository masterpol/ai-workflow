import type { RuntimeDeps } from "./runtime/types.mts";
import { LIMITS, STATE_FILE, errorCode, metricsDirectory, readWorkflowState, validState, validateDestination, withMetricsLease, writeAtomic } from "./workflow-metrics-state.mts";
import type { Summary, UsageState } from "./workflow-metrics-state.mts";

export type Format = "json" | "markdown" | "html";
type Status = "observed" | "stale" | "unavailable";
type Cell = string | number | null;
interface Table { title: string; note: string; status: Status; headers: string[]; rows: Cell[][] }
export interface UsageReport {
  schemaVersion: 1; generatedAt: string; project: { label: string; workflowVersion: UsageState["project"]["workflowVersion"] };
  collection: { status: Status; startedAt: string | null; lastRecordedAt: string | null; evidence: string[]; automaticCapture: "unconfigured" };
  activity: Record<string, number | null>; health: Record<string, number | null>;
  pending: { running: number | null; paused: number | null };
  retention: { recentEventKeys: number; dailyBuckets: number; namedPitches: number; pendingActivities: number; dailyFrom: string | null; dailyTo: string | null };
  tables: Table[]; notes: string[];
}
const HEADLINES = ["Session starts", "Primary agent finishes", "Subagent finishes", "Unclassified agent finishes", "Skill uses", "Phase starts", "Phase finishes", "Pitch starts", "Pitch finishes", "Ships (completed pitches)", "Audit cycles", "Audit must-fix findings"];
const HEALTH = ["missingVendor", "missingModel", "missingRole", "missingPhase", "missingSkill", "missingPitch", "unmatchedFinishes", "unmatchedTransitions", "pendingEvictions", "lateEvents", "overflowEvents"];
const HEALTH_NAMES: Record<string, string> = { missingVendor: "Vendor attribution gaps", missingModel: "Model attribution gaps (agent events)", missingRole: "Role attribution gaps (agent events)", missingPhase: "Phase attribution gaps", missingSkill: "Skill attribution gaps", missingPitch: "Pitch attribution gaps", unmatchedFinishes: "Unmatched agent/phase finishes", unmatchedTransitions: "Unmatched pause/resume events", pendingEvictions: "Evicted pending activities", lateEvents: "Events outside retained daily window", overflowEvents: "Events folded into overflow buckets" };
const timestamp = (v: unknown): string | null => typeof v === "string" && v.length === 24 && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v ? v : null;
const label = (v: unknown): string => v === "(unknown)" ? "Unknown" : v === "(other)" ? "Other (overflow or invalid label)" : typeof v === "string" && v.length <= 80 && /^[\w.:/@+-]+$/.test(v) && !["__proto__", "constructor", "prototype"].includes(v) ? v : "Unknown";
function modelLabel(value: string): string {
  if (!value.includes("%")) return label(value);
  try { return value.split("/").map(part => label(decodeURIComponent(part))).join(" / "); }
  catch { return "Unknown"; }
}
const numeric = (v: unknown): number | null => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : null;
const htmlEscape = (v: string): string => v.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const mdEscape = (v: string): string => htmlEscape(v).replace(/\|/g, "\\|").replace(/\r|\n/g, " ").replace(/:\/\//g, "&#58;//").replace(/www\./gi, "www&#46;").replace(/@/g, "&#64;");
const display = (v: Cell): string => v === null ? "Unavailable" : typeof v === "number" ? new Intl.NumberFormat("en-US").format(v) : v;
function ships(summary: Summary): number | null { return numeric(summary.ships) ?? (summary.ships === undefined && summary.events["pitch.finished"] === 0 ? 0 : null); }
function summaryRow(summary: Summary): Cell[] {
  return [summary.events["session.started"], summary.primaryFinishes, summary.subagentFinishes, summary.events["phase.finished"], summary.events["skill.used"], summary.events["audit.finished"], ships(summary), summary.outcomes.failed, summary.gates.revise, summary.elapsedMs, summary.matchedFinishes].map(numeric);
}
const SUMMARY_HEADERS = ["Session starts", "Primary finishes", "Subagent finishes", "Phase finishes", "Skill uses", "Audit cycles", "Ships", "Failed finish events", "Revise decisions", "Elapsed ms", "Matched finishes"];
const SUMMARY_NOTE = "Each column counts its named event unit. Failed finish events include agents, phases, pitches and audits. Elapsed time sums matched agent/phase intervals, which may overlap and include pauses and human wait.";

/** Produces only public facts; pending identities, replay hashes and raw state never reach the report. */
export function buildReport(input: unknown, at: string): UsageReport {
  const generatedAt = timestamp(at);
  if (!generatedAt) throw new Error("invalid report timestamp");
  const state = validState(input) ? input : null;
  const eventCount = state ? Object.values(state.totals.events).reduce((a, b) => a + b, 0) : 0;
  const status: Status = !state || !eventCount ? "unavailable" : Date.parse(generatedAt) - Date.parse(state.updatedAt) > 7 * 86_400_000 ? "stale" : "observed";
  const days = state ? Object.keys(state.days).sort() : [];
  const tables: Table[] = [];
  const summaryTable = (title: string, rows: [string, Summary][], firstHeader: string): void => {
    tables.push({ title, note: SUMMARY_NOTE, status, headers: [firstHeader, ...SUMMARY_HEADERS], rows: rows.map(([name, summary]) => [label(name), ...summaryRow(summary)]) });
  };
  const entries = (rows: Record<string, Summary>): [string, Summary][] => Object.entries(rows).sort(([a], [b]) => a.localeCompare(b));
  if (state) {
    summaryTable("By vendor", entries(state.vendors), "Vendor");
    summaryTable("By pitch", entries(state.pitches), "Pitch");
    tables.push({ title: "Daily activity", note: "Up to 30 retained UTC days. Missing dates have no inferred activity. " + SUMMARY_NOTE, status, headers: ["UTC day", ...SUMMARY_HEADERS], rows: days.map(day => [day, ...summaryRow(state.days[day])]) });
    for (const [dimension, title, nameHeader] of [["models", "By provider/model", "Provider/model"], ["roles", "By agent role", "Role"], ["skills", "By skill", "Skill"], ["phases", "By phase", "Phase"]] as const) {
      const rows: Cell[][] = [];
      const headers = dimension === "skills" ? ["Uses"] : dimension === "phases" ? ["Starts", "Finishes", "Failed finishes", "Pauses", "Resumes", "Elapsed ms", "Matched finishes"] : ["Starts", "Primary finishes", "Subagent finishes", "Unclassified finishes", "Failed finishes", "Elapsed ms", "Matched finishes"];
      for (const [vendor, names] of Object.entries(state.dimensions[dimension]).sort(([a], [b]) => a.localeCompare(b))) {
        for (const [name, s] of entries(names)) if (name !== "(unknown)") {
          const values = dimension === "skills" ? [s.events["skill.used"]] : dimension === "phases" ? [s.events["phase.started"], s.events["phase.finished"], s.outcomes.failed, s.events["phase.paused"], s.events["phase.resumed"], s.elapsedMs, s.matchedFinishes] : [s.events["agent.started"], s.primaryFinishes, s.subagentFinishes, s.unknownFinishes, s.outcomes.failed, s.elapsedMs, s.matchedFinishes];
          rows.push([label(vendor), dimension === "models" ? modelLabel(name) : label(name), ...values.map(numeric)]);
        }
      }
      const note = dimension === "skills" ? "One use per recorded skill event. Missing skill attribution appears in collection health." : "Missing attribution appears in collection health. " + (dimension === "models" ? "Provider/model is combined only when supplied. " : "") + "Elapsed time sums matched intervals and includes pauses and human wait.";
      tables.push({ title, note, status, headers: ["Vendor", nameHeader, ...headers], rows });
    }
    tables.push({ title: "Terminal outcomes", note: "Finish events across agents, phases, pitches and audits; these are not unique tasks.", status, headers: ["Finish outcome", "Events"], rows: Object.entries(state.totals.outcomes).map(([key, value]) => [label(key), numeric(value)]) });
    tables.push({ title: "Gate decisions", note: "Explicit workflow gate events, not decisions inferred from chat.", status, headers: ["Decision", "Events"], rows: Object.entries(state.totals.gates).map(([key, value]) => [label(key), numeric(value)]) });
    tables.push({ title: "Collection sources", note: "Source is caller-declared. A native source event does not verify an adapter or complete capture.", status, headers: ["Declared source", "Events", "Last recorded at"], rows: Object.entries(state.sources).map(([key, source]) => [label(key), numeric(source.events), timestamp(source.lastEventAt)]) });
  }
  const values = state ? [state.totals.events["session.started"], state.totals.primaryFinishes, state.totals.subagentFinishes, state.totals.unknownFinishes, state.totals.events["skill.used"], state.totals.events["phase.started"], state.totals.events["phase.finished"], state.totals.events["pitch.started"], state.totals.events["pitch.finished"], ships(state.totals), state.totals.events["audit.finished"], state.totals.mustFixCount] : HEADLINES.map(() => null);
  const pending = state ? Object.values(state.pending) : null;
  const notes = [
    "These are recorded workflow events, not a complete measure of project activity or productivity.",
    "Automatic workflow capture is unconfigured by this core. External adapters and native sources are not verified here.",
    "Elapsed time includes pauses and human wait; overlapping agent/phase intervals are not unique project time.",
    "Replay protection covers 512 recent event keys per project; older replays can count again. Cloned metrics retain project identity.",
    "Unknown and overflow attribution remain visible. Historical data is not backfilled.",
    "The installed version uses sync evidence when available. A root VERSION value is an unverified fallback.",
  ];
  if (!state) notes.push(input === null ? "No workflow events recorded. Use the record command with supported structured usage events; automatic capture is a separate stage." : "Workflow state is invalid or unsupported; no usage claims can be made.");
  if (status === "stale") notes.push("The source is more than seven days old. This alone does not prove collection is broken.");
  if (state && ships(state.totals) === null) notes.push("Ships are unavailable because this snapshot predates the successful-pitch counter; earlier pitch outcomes cannot be reconstructed.");
  return { schemaVersion: 1, generatedAt, project: { label: state ? label(state.project.label) : "Unknown", workflowVersion: state ? { value: state.project.workflowVersion.value === null ? null : label(state.project.workflowVersion.value), status: state.project.workflowVersion.status, evidence: state.project.workflowVersion.evidence } : { value: null, status: "unavailable", evidence: null } },
    collection: { status, startedAt: state ? timestamp(state.createdAt) : null, lastRecordedAt: state ? timestamp(state.updatedAt) : null, evidence: state ? [`.project/metrics/${STATE_FILE}`] : [], automaticCapture: "unconfigured" },
    activity: Object.fromEntries(HEADLINES.map((name, i) => [name, numeric(values[i])])), health: Object.fromEntries(HEALTH.map(name => [HEALTH_NAMES[name], state ? numeric(state.health[name as keyof UsageState["health"]]) : null])),
    pending: { running: pending ? pending.filter(a => a.status === "running").length : null, paused: pending ? pending.filter(a => a.status === "paused").length : null },
    retention: { recentEventKeys: LIMITS.recent, dailyBuckets: LIMITS.days, namedPitches: LIMITS.pitches, pendingActivities: LIMITS.pending, dailyFrom: days[0] || null, dailyTo: days.at(-1) || null }, tables, notes };
}
function allTables(report: UsageReport): Table[] {
  return [
    { title: "Activity", note: "Recorded units are listed separately; no vendor winners or inferred usage.", status: report.collection.status, headers: ["Measure", "Count"], rows: Object.entries(report.activity) },
    ...report.tables,
    { title: "Collection health", note: "Counts describe attribution gaps and collector observations, not a percentage of all project activity.", status: report.collection.status, headers: ["Measure", "Events"], rows: Object.entries(report.health) },
    { title: "Pending activities", note: "Unfinished activities have no fabricated completion duration. Identities are internal and not shown.", status: report.collection.status, headers: ["State", "Activities"], rows: Object.entries(report.pending) },
  ];
}
const FIRST_USE = 'No workflow events recorded. Record actual use with a unique event ID, then regenerate this report.';
const RECORD_EXAMPLE = `printf '%s\\n' '{"eventId":"my-build-use-1","kind":"skill.used","vendor":"codex","source":"manual","skill":"build"}' | node ai-framework/scripts/workflow-metrics.mts record --root .`;
function markdown(report: UsageReport): string {
  const sections = allTables(report).map(table => `## ${table.title}\n\nStatus: ${table.status}. ${table.note}\n\n${table.rows.length ? `| ${table.headers.join(" | ")} |\n| ${table.headers.map(() => "---").join(" | ")} |\n${table.rows.map(row => `| ${row.map(cell => mdEscape(display(cell))).join(" | ")} |`).join("\n")}` : "No attributed events recorded."}`);
  return `# Workflow usage — ${mdEscape(report.project.label)}\n\nGenerated: ${report.generatedAt}\nCollection: ${report.collection.status}\nCounted since: ${report.collection.startedAt || "Unavailable"}\nLast recorded: ${report.collection.lastRecordedAt || "Unavailable"}\nWorkflow version: ${mdEscape(report.project.workflowVersion.value || "Unavailable")} (${report.project.workflowVersion.status})\nAutomatic capture: unconfigured\nEvidence: ${report.collection.evidence.join(", ") || "Unavailable"}\n\n${report.collection.startedAt === null ? `${FIRST_USE}\n\n\`\`\`sh\n${RECORD_EXAMPLE}\n\`\`\`\n\n` : ""}${sections.join("\n\n")}\n\n## Retention\n\nDaily interval: ${report.retention.dailyFrom || "Unavailable"} to ${report.retention.dailyTo || "Unavailable"}. Retained bounds: 30 UTC days, 50 named pitches, 64 pending activities, 512 replay keys.\n\n## Collection limits\n\n${report.notes.map(note => `- ${note}`).join("\n")}\n`;
}
function html(report: UsageReport): string {
  const sections = allTables(report).map(table => `<section><h2>${htmlEscape(table.title)}</h2><p>Status: ${table.status}. ${htmlEscape(table.note)}</p>${table.rows.length ? `<div class="table" tabindex="0" role="region" aria-label="${htmlEscape(table.title)}"><table><caption>${htmlEscape(table.title)}</caption><thead><tr>${table.headers.map(header => `<th scope="col">${htmlEscape(header)}</th>`).join("")}</tr></thead><tbody>${table.rows.map(row => `<tr>${row.map((cell, i) => i === 0 ? `<th scope="row">${htmlEscape(display(cell))}</th>` : `<td>${htmlEscape(display(cell))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "<p>No attributed events recorded.</p>"}</section>`);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>Workflow usage — ${htmlEscape(report.project.label)}</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:1200px;margin:2rem auto;padding:0 1rem;background:#fff;color:#17212b}h1,h2{line-height:1.2}section{margin:2rem 0}.table{overflow:auto}.table:focus-visible{outline:3px solid #3478c0;outline-offset:3px}table{border-collapse:collapse;min-width:100%}th,td{padding:.6rem;text-align:left;border-bottom:1px solid #bcc6cf;white-space:nowrap}caption{text-align:left;font-weight:600;margin:.5rem 0}p,li{max-width:90ch}pre{overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}@media(prefers-color-scheme:dark){body{background:#121820;color:#eef3f7}th,td{border-color:#596875}}</style></head><body><main><header><h1>Workflow usage — ${htmlEscape(report.project.label)}</h1><p>Collection: <strong>${report.collection.status}</strong>. Automatic capture: <strong>unconfigured</strong>.</p><p>Counted since: ${report.collection.startedAt || "Unavailable"}<br>Last recorded: ${report.collection.lastRecordedAt || "Unavailable"}<br>Generated: <time datetime="${report.generatedAt}">${report.generatedAt}</time><br>Workflow version: ${htmlEscape(report.project.workflowVersion.value || "Unavailable")} (${report.project.workflowVersion.status})<br>Evidence: ${report.collection.evidence.join(", ") || "Unavailable"}</p>${report.collection.startedAt === null ? `<p>${FIRST_USE}</p><pre><code>${htmlEscape(RECORD_EXAMPLE)}</code></pre>` : ""}</header>${sections.join("")}<section><h2>Retention</h2><p>Daily interval: ${report.retention.dailyFrom || "Unavailable"} to ${report.retention.dailyTo || "Unavailable"}. Bounds: 30 UTC days, 50 named pitches, 64 pending activities, 512 replay keys.</p></section><section><h2>Collection limits</h2><ul>${report.notes.map(note => `<li>${htmlEscape(note)}</li>`).join("")}</ul></section></main></body></html>\n`;
}
export function createReports(input: unknown, at: string): { report: UsageReport; json: string; markdown: string; html: string } {
  const report = buildReport(input, at);
  const outputs = { report, json: JSON.stringify(report, null, 2) + "\n", markdown: markdown(report), html: html(report) };
  if ([outputs.json, outputs.markdown, outputs.html].some(text => new TextEncoder().encode(text).length > LIMITS.stateBytes)) throw new Error("report exceeds 4 MiB");
  return outputs;
}
export async function generateReport(root: string, format: Format, deps: RuntimeDeps): Promise<{ written: boolean; output?: string; reason?: string }> {
  try {
    const directory = metricsDirectory(root, true, deps)!;
    return await withMetricsLease(directory, deps => {
      const loaded = readWorkflowState(directory, deps);
      if (loaded.status === "refused") return { written: false, reason: loaded.reason };
      const outputs = createReports(loaded.status === "valid" ? loaded.state : null, new Date(deps.clock.now()).toISOString());
      const markdownPath = deps.path.join(directory, "workflow-usage.md"), htmlPath = deps.path.join(directory, "workflow-usage.html");
      for (const path of [markdownPath, htmlPath]) validateDestination(path, deps);
      writeAtomic(markdownPath, outputs.markdown, deps);
      writeAtomic(htmlPath, outputs.html, deps);
      return { written: true, output: outputs[format] };
    }, deps);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const fixed = ["unsafe metrics directory", "project is not initialized", "unsafe output destination", "report exceeds 4 MiB", "output is oversized"];
    return { written: false, reason: fixed.includes(message) ? message : `report generation failed (${errorCode(error)})` };
  }
}
