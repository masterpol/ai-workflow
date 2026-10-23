/*
 * Page set for the multipage state report (index, structure, skills, metrics, knowledge,
 * pitches). Pure string builders: the escaping, link-safety, row/table and stylesheet helpers
 * come from state-render.mts (passed in, so there is one copy and no import cycle). Every array
 * section goes through the shared list()/isFact guard, so a hostile state.json degrades one
 * section, never the render. No scripts; each page carries the CSP meta from state-render.
 * See ai-framework/integrations/state-report.md.
 */
import { barChart } from "./state-charts.mts";
import { StateError } from "./state-snapshot.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

export { GENERATOR_MARKER, PAGE_NAMES } from "./state-design.mts";
import { GENERATOR_MARKER, PAGE_NAMES, PAGE_TITLES as TITLES } from "./state-design.mts";
export const PAGE_BYTE_CAP = 512 * 1024;
const PROJECT_TYPES = new Set(["workflow-bundle", "web", "backend", "mobile", "ai-prompts", "mixed", "unknown"]);
const MAX_TREE = 500;
const MAX_ROWS = 100;
const SAFE_DIR = /^[A-Za-z0-9._@+-]+(?:\/[A-Za-z0-9._@+-]+)*$/;
const SKILL_MIRROR = /^\.(?:claude|agents|cursor|codex|opencode)\/skills$/;
const BIG_FOLDER = 8;
// deno-lint-ignore no-explicit-any
// Loose structural view of untrusted state.json values: every read is guarded (isFact/typeof) before use.
type Loose = Record<string, unknown>;
export function createStatePages(deps: RuntimeDeps, h: Loose) {
  const { esc, scalar, safeEvidencePath, row, table, scroll, section, list, badge, boundedText, evidence, value, design, pitchTable, projectRows } = h;
  const { fs } = deps;
  const text = (v: unknown, n = 120): string => esc(boundedText(v).slice(0, n));

  const plain = (v: unknown): Loose => (v && typeof v === "object" && !Array.isArray(v) ? v as Loose : {});
  const unavailable = `<span class="status status-unavailable">unavailable</span>`;
  const chart = (id: string, title: string, rows: Array<{ label: unknown; value: unknown }>): string => {
    try { return barChart({ id, title, rows }); } catch { return unavailable; }
  };
  const factValue = (node: unknown): unknown => (isFactLike(node as Loose) && (node as Loose).status !== "unavailable" ? (node as Loose).value : undefined);
  const vendorRows = (snapshot: Loose) => { const v = plain(factValue(plain(snapshot).metrics)); return (Array.isArray(v.vendors) ? v.vendors : []).slice(0, 20).map((x: unknown) => ({ label: plain(x).vendor, value: plain(x).completions })); };
  const phaseRows = (snapshot: Loose) => {
    const counts: Record<string, number> = Object.create(null);
    for (const f of list(plain(snapshot.pitches).items)) { const phase = scalar(plain(f.value).phase); counts[phase] = (counts[phase] || 0) + 1; }
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  };
  const typeRows = (snapshot: Loose) => { const t = plain(plain(factValue(snapshot.knowledge)).byType); return Object.keys(t).slice(0, 20).map((label) => ({ label, value: t[label] })); };
  const folderRows = (snapshot: Loose) => {
    const counts: Record<string, number> = Object.create(null);
    for (const f of list(plain(snapshot.structure).tree)) { const p = scalar(plain(f.value).path); if (SAFE_DIR.test(p) && p.includes("/")) { const top = p.split("/")[0]; counts[top] = (counts[top] || 0) + 1; } }
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  };
  const card = (label: string, value: unknown, note = "") => `<li><span class="label">${esc(label)}</span>${value === undefined || value === null || value === "" ? `<span class="value">${unavailable}</span>` : `<span class="value">${esc(value)}</span>`}${note ? `<span class="label">${esc(note)}</span>` : ""}</li>`;
  const count = (v: unknown): number | undefined => (typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : undefined);
  function headlineCards(snapshot: Loose): string {
    const items = list(plain(snapshot.pitches).items);
    const phaseCount = (phase: string) => items.filter((f: Loose) => plain(f.value).phase === phase).length;
    const hasPitches = Array.isArray(plain(snapshot.pitches).items);
    const knowledge = plain(factValue(snapshot.knowledge));
    const metrics = plain(factValue(snapshot.metrics));
    const sync = plain(factValue(plain(snapshot.workflow).partialSync));
    const syncState = scalar(sync.state);
    const reported = count(metrics.reportedUsage);
    return `<ul class="cards">${[
      card("Active pitches", hasPitches ? phaseCount("active") : undefined),
      card("Shipped", hasPitches ? phaseCount("shipped") + phaseCount("compacted") : undefined),
      card("Knowledge entries", count(knowledge.entries)),
      card("Completions", count(metrics.completions), reported === undefined ? "" : `${reported} reported usage`),
      card("Sync attention", syncState === "clean" || syncState === "attention" ? syncState : undefined),
    ].join("")}</ul>`;
  }
  const chartSection = (id: string, title: string, chartId: string, rows: Array<{ label: unknown; value: unknown }>) => section(id, title, chart(chartId, title, rows));

  const version = (snapshot: Loose): string => {
    const fact = (snapshot.workflow as Loose | undefined)?.installedVersion as Loose | undefined;
    return fact && typeof fact === "object" ? boundedText(fact.value) : "";
  };
  const shell = (page: string, body: string, ctx: { name: string; generated: string; theme: unknown; version?: string }) => design.shell(page, body, ctx);

  // Folder tree: nested lists built from path prefixes; unknown parents attach to the root.
  function structureBody(root: string | null, snapshot: Loose, limit: number) {
    const s = snapshot.structure && typeof snapshot.structure === "object" ? snapshot.structure : {};
    const type = isFactLike(s.projectType) ? s.projectType : null;
    const typeName = type && PROJECT_TYPES.has(type.value) ? type.value : "unknown";
    const nodes = new Map<string, { role: string; fact: Loose; kids: string[] }>();
    const top: string[] = [];
    const entries = list(s.tree).filter((f: Loose) => f.value && typeof f.value === "object" && typeof f.value.path === "string" && SAFE_DIR.test(f.value.path) && f.value.path.length <= 200 && !f.value.path.split("/").includes("..") && f.value.path.split("/").length <= 4 && f.value.kind === "dir");
    for (const fact of entries.slice(0, limit)) if (!nodes.has(fact.value.path)) nodes.set(fact.value.path, { role: scalar(fact.value.role), fact, kids: [] });
    for (const p of [...nodes.keys()].sort()) { const parent = p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : ""; (nodes.has(parent) ? nodes.get(parent)!.kids : top).push(p); }
    const decisions = list(s.decisions).filter((f: Loose) => f.value && typeof f.value === "object").slice(0, Math.min(MAX_ROWS, limit));
    const byPath = new Map<string, number[]>();
    decisions.forEach((f: Loose, i: number) => { const k = scalar(f.value.path); byPath.set(k, [...(byPath.get(k) || []), i]); });
    const render = (p: string): string => {
      const n = nodes.get(p)!;
      const mirror = SKILL_MIRROR.test(p) && n.kids.length > 0;
      const known = n.role && n.role !== "unclassified";
      const role = mirror ? `<span class="role">${n.kids.length} skills</span>` : known ? `<span class="role">${text(n.role)}</span>` : "";
      const decs = (byPath.get(p) || []).map((i) => `<a href="#dec-${i}">${text(decisions[i].value.id, 60)}</a>`).join(", ");
      const head = `<code>${esc(p.slice(p.lastIndexOf("/") + 1))}/</code>${role}${decs ? ` — decisions: ${decs}` : ""}`;
      if (!n.kids.length || mirror) return `<li>${head}</li>`;
      const inner = `<ul>${n.kids.map(render).join("")}</ul>`;
      if (n.kids.length > BIG_FOLDER) return `<li>${head}<details${p.includes("/") ? "" : " open"}><summary>${n.kids.length} folders</summary>${inner}</details></li>`;
      return `<li>${head}${inner}</li>`;
    };
    const treeHtml = top.length ? `<ul class="tree">${top.map(render).join("")}</ul>` : `<p>No folder tree in this snapshot. ${badge("unavailable")}</p>`;
    const omitted = entries.length > limit ? `<p class="none">Showing ${nodes.size} of ${entries.length} folders to stay within the page size cap.</p>` : "";
    const decRows = decisions.map((f: Loose, i: number) => `<tr id="dec-${i}"><th scope="row">${text(f.value.id, 60)}</th><td>${text(f.value.title)}</td><td><code>${text(f.value.path, 200)}</code></td><td>${evidence(root, f.evidence, limit)}</td></tr>`);
    const decTable = decRows.length ? scroll("Decisions by folder", `<table><caption>Decisions by folder</caption><thead><tr><th scope="col">Decision</th><th scope="col">Title</th><th scope="col">Folder</th><th scope="col">Evidence</th></tr></thead><tbody>${decRows.join("")}</tbody></table>`) : `<p>No decisions mapped to folders. ${badge("unavailable")}</p>`;
    return `${section("type", "Project type", `<p class="type"><span class="status status-${esc(type ? "observed" : "unavailable")}">${esc(typeName)}</span></p>${table("Project type evidence", [row(root, "Project type", s.projectType)])}`)}
${section("tree", "Folders", treeHtml + omitted)}
${section("decisions", "Decisions", decTable)}`;
  }
  const isFactLike = (f: Loose) => f && typeof f === "object" && typeof f.status === "string" && Array.isArray(f.evidence);

  function skillGroup(root: string | null, title: string, node: unknown, limit: number, base: boolean) {
    const facts = list(node).filter((f: Loose) => f.value && typeof f.value === "object" && !Array.isArray(f.value)).slice(0, Math.min(MAX_TREE, limit));
    const dash = `<span class="none">—</span>`;
    const rows = facts.map((f: Loose) => { const v = f.value;
      const state = v.enabled === true ? "enabled" : v.enabled === false ? "disabled" : dash;
      if (base) return `<tr><th scope="row">${text(v.id, 80)}</th><td>${state}</td><td>${evidence(root, f.evidence, limit)}</td></tr>`;
      const phases = Array.isArray(v.phases) ? v.phases.slice(0, 12).map((p: unknown) => text(p, 40)).filter(Boolean).join(", ") : "";
      return `<tr><th scope="row">${text(v.id, 80)}</th><td>${state}</td><td>${phases || dash}</td><td>${text(v.scope, 60) || dash}</td><td>${badge(f.status)}</td><td>${evidence(root, f.evidence, limit)}</td></tr>`; });
    const head = base ? `<th scope="col">Skill</th><th scope="col">State</th><th scope="col">Evidence</th>` : `<th scope="col">Skill</th><th scope="col">State</th><th scope="col">Phases</th><th scope="col">Scope</th><th scope="col">Status</th><th scope="col">Evidence</th>`;
    const body = rows.length ? scroll(title, `<table><caption>${esc(title)}</caption><thead><tr>${head}</tr></thead><tbody>${rows.join("")}</tbody></table>`) : `<p>None listed. ${badge("unavailable")}</p>`;
    return `<h3>${esc(title)}</h3>${body}`;
  }

  const OFF = `<span class="none">unavailable (file not found)</span>`;
  // A report another tool should have produced: a link when it exists, a plain "unavailable" line when not.
  const links = (root: string | null, items: string[][]) => items.map(([rel, label]) => (safeEvidencePath(root, rel) ? `<li><a href="../../${esc(rel)}">${esc(label)}</a></li>` : `<li>${esc(label)}: ${OFF}</li>`)).join("");

  function build(page: string, root: string | null, snapshot: Loose, limit: number, slot: (name: string) => string): string {
    const sk = snapshot.skills && typeof snapshot.skills === "object" ? snapshot.skills : {};
    if (page === "structure") return `${chartSection("chart-folders", "Subfolders per top-level folder", "subfolders-by-folder", folderRows(snapshot))}\n${structureBody(root, snapshot, limit)}${slot("architecture")}`;
    if (page === "skills") return section("skills", "Skills", `${skillGroup(root, "Base skills (workflow bundle)", sk.base, limit, true)}${skillGroup(root, "Project skills (registry)", sk.project, limit, false)}`) + section("caveman", "Defaults", table("Skill defaults", [row(root, "Caveman mode", sk.caveman)]));
    if (page === "metrics") {
      const l = links(root, [[".project/metrics/token-consumption.html", "Full token consumption report"], [".project/metrics/workflow-usage.html", "Workflow usage report"], [".project/metrics/flow-report.html", "Joined token/time report"]]);
      const mv = snapshot.metrics?.value;
      const partial = mv && typeof mv === "object" && mv.completeness === "partial" && typeof mv.reportedUsage === "number" && typeof mv.completions === "number"
        ? `<p>Partial data: ${esc(mv.reportedUsage)} of ${esc(mv.completions)} completions reported token usage; the figures below cover only those.</p>` : "";
      return slot("tokens") + chartSection("chart-vendors", "Completions by vendor", "completions-by-vendor", vendorRows(snapshot)) + section("metrics", "Token metrics", `<ul>${l}</ul>${partial}${snapshot.metrics?.status === "unavailable" ? "<p>Token metrics are unavailable for this project; nothing is estimated in their place.</p>" : ""}${table("Measured token usage", [row(root, "Token consumption", snapshot.metrics)])}`);
    }
    if (page === "knowledge") {
      const l = links(root, [["graphify-out/graph.html", "Interactive knowledge graph"], ["graphify-out/GRAPH_REPORT.md", "Graph report"]]);
      return chartSection("chart-types", "Knowledge entries by type", "knowledge-by-type", typeRows(snapshot)) + section("knowledge", "Knowledge", `<ul>${l}</ul>${table("Knowledge graph", [row(root, "Knowledge entries", snapshot.knowledge)])}`);
    }
    if (page === "pitches") return slot("history") + chartSection("chart-phases", "Pitches by phase", "pitches-by-phase", phaseRows(snapshot)) + section("pitches", "Pitches", `${pitchTable(root, snapshot, limit)}${table("Records behind the pitch list", [row(root, "status.md entries", snapshot.pitches?.statusMd), row(root, "Compacted work", snapshot.doneWork), row(root, "Run archives", snapshot.runs)])}`);
    const st = snapshot.structure && typeof snapshot.structure === "object" ? snapshot.structure : {};
    const type = isFactLike(st.projectType) && PROJECT_TYPES.has(st.projectType.value) ? st.projectType.value : "unknown";
    return `${slot("overview")}${section("headline", "At a glance", headlineCards(snapshot))}
${chartSection("chart-phases", "Pitches by phase", "pitches-by-phase", phaseRows(snapshot))}
${chartSection("chart-vendors", "Completions by vendor", "completions-by-vendor", vendorRows(snapshot))}
${section("about", "Project", `<p class="type">Project type: <span class="status">${esc(type)}</span></p>${table("What the project is", projectRows(root, snapshot))}`)}
${section("workflow", "Workflow", table("Workflow version and sync state", [row(root, "Installed version", snapshot.workflow?.installedVersion), row(root, "Last sync", snapshot.workflow?.lastSync)]))}${slot("risks")}`;
  }

  /** All six pages as {name.html: html}. Each page is rebuilt with fewer entries until it fits the byte cap; at zero entries a still-oversized page becomes a short notice. */
  function renderPages(snapshot: Loose, theme: unknown, options: { root: string | null; name: string; cap?: number; fragments?: { full: Record<string, string>; omitted: Record<string, string> } }) {
    const cap = options.cap ?? PAGE_BYTE_CAP;
    const generated = boundedText(snapshot.generatedAt) || "unknown time";
    const name = boundedText(options.name) || "Project";
    const fits = (html: string) => new TextEncoder().encode(html).byteLength <= cap;
    const out: Record<string, string> = {};
    const context = { name, generated, theme, version: version(snapshot) };
    for (const page of PAGE_NAMES) {
      // Fragment bytes count inside the cap loop; if the page still does not fit, fragments are replaced by their omission notice before the page is.
      const attempt = (fill: Record<string, string> = {}, topOnly = false) => {
        let html = "";
        for (let limit = MAX_TREE; ; limit = Math.floor(limit / 2)) {
          html = shell(page, build(page, options.root, snapshot, limit, (slotName) => fill[slotName] ?? ""), context);
          if (fits(html) || limit === 0 || topOnly) return { html, ok: fits(html) };
        }
      };
      let { html, ok } = attempt(options.fragments?.full, options.fragments !== undefined);
      if (!ok && options.fragments) ({ html, ok } = attempt(options.fragments.omitted));
      if (!ok) html = shell(page, section("omitted", TITLES[page], `<p class="none">Page omitted: exceeds size cap.</p>`), { name, generated, theme, version: version(snapshot) });
      out[`${page}.html`] = html;
    }
    return out;
  }

  /* Staged write. `.state-stage` doubles as lock and staging area: mkdir (non-recursive) is the
   * atomic claim, directory dev/ino are pinned at creation and rechecked before every rename. */
  const STAGE = ".state-stage";
  const identity = (dir: string) => { const st = fs.lstatSync(dir); return { dev: st.dev, ino: st.ino, link: st.isSymbolicLink(), dir: st.isDirectory() }; };
  class ReportError extends StateError {}
  // Fixed text only: never an absolute path, never raw fs error text, just the code and a project-relative name.
  function writeSet(root: string, reportsRel: string, files: Record<string, string>, read: (rel: string) => string | undefined) {
    try { return writeSetInner(root, reportsRel, files, read); } catch (e) {
      if (e instanceof ReportError) throw e;
      const code = typeof e?.code === "string" && /^[A-Z0-9_]{1,20}$/.test(e.code) ? e.code : "EIO";
      throw new ReportError(`${reportsRel}: ${code}`);
    }
  }
  /* Generated pages are only ever overwritten, never deleted: the page set is fixed, and a user's own
   * .html in the reports directory is left alone. */
  function writeSetInner(root: string, reportsRel: string, files: Record<string, string>, read: (rel: string) => string | undefined) {
    const reports = `${root}/${reportsRel}`;
    fs.mkdirSync(reports, { recursive: true });
    const reportsId = identity(reports);
    if (reportsId.link || !reportsId.dir || fs.realpathSync(reports) !== reports) throw new ReportError("Symlink destination forbidden: reports directory");
    for (const name of Object.keys(files)) { try { if (fs.lstatSync(`${reports}/${name}`).isSymbolicLink()) throw new ReportError(`Symlink destination forbidden: ${reportsRel}/${name}`); } catch (e) { if (e.code !== "ENOENT") throw e; } }
    const skipped: string[] = [];
    const changed = Object.keys(files).filter((name) => {
      const existing = read(`${reportsRel}/${name}`);
      if (fs.existsSync(`${reports}/${name}`) && name !== "state.html" && !existing?.includes(GENERATOR_MARKER)) { skipped.push(name); return false; }
      return existing !== files[name];
    });
    if (!changed.length) return { changed: [] as string[], skipped };
    const stage = `${reports}/${STAGE}`;
    try { fs.mkdirSync(stage, { recursive: false }); } catch (e) {
      if (e.code === "EEXIST") throw new ReportError(`another state-render --apply is running or left a staging directory; if none is running, remove ${reportsRel}/${STAGE} and retry`);
      throw e;
    }
    const pinned = identity(stage);
    const same = (dir: string, id: { dev: number; ino: number }) => { const now = identity(dir); return !now.link && now.dir && now.dev === id.dev && now.ino === id.ino && fs.realpathSync(dir) === dir; };
    let replaced = 0;
    const intact = () => { if (!same(reports, reportsId) || !same(stage, pinned)) throw new ReportError(`report directory changed while writing; ${replaced} of ${changed.length} pages were already replaced`); };
    try {
      for (const name of changed) { intact(); fs.writeFileSync(`${stage}/${name}`, files[name], { mode: 0o644, flag: "wx" }); }
      for (const name of changed) { intact(); fs.renameSync(`${stage}/${name}`, `${reports}/${name}`); replaced++; }
      return { changed, skipped };
    } finally {
      // Never follow a substituted path to clean up: remove the stage only if it is still ours.
      try { if (same(stage, pinned)) { for (const left of fs.readdirSync(stage)) fs.rmSync(`${stage}/${left}`, { force: true }); fs.rmdirSync(stage); } } catch { /* leave it; the next run reports it */ }
    }
  }

  return { renderPages, writeSet, shell, PAGE_NAMES, STAGE };
}
