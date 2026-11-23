import { runDirect } from "./runtime/cli.mts";
/*
 * Gathers the facts behind /state and turns them into an Archify explainer draft. Read-only over a
 * fixed allowlist of project files (never .env*, credentials, transcripts, a database or the network).
 * Every number and name in the draft comes from this script, never from model-written text.
 * Contract: ai-framework/integrations/state-report.md.
 */
import { createNodeDeps } from "./runtime/node.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

export const STATUSES = ["observed", "proposed", "stale", "unavailable", "unconfigured"] as const;
export type Status = (typeof STATUSES)[number];
export interface Fact { value: unknown; status: Status; evidence: string[]; note?: string }
export interface Facts {
  schemaVersion: 1;
  workflow: { installedVersion: Fact };
  pitches: { active: Fact; shippedListed: Fact };
  knowledge: Fact;
  skills: Fact;
}
export class FactsError extends Error {}

const MAX_FILE_BYTES = 1024 * 1024;
const GRAPH_FILE_BYTES = 64 * 1024 * 1024;
const MARKDOWN_LIMIT = 64 * 1024;
const FIELD_LIMIT = 200;
const MAX_ROWS = 100;
export const REPORT_DIRECTORY = ".project/reports";

// Defense in depth, same families as the old snapshot: bound first, then redact credential shapes.
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

/** Characters Archify's inline language would parse (HTML, emphasis, links, code, pipes, braces) become inert look-alikes. */
const INERT: Record<string, string> = { "<": "‹", ">": "›", "`": "'", "*": "∗", "[": "(", "]": ")", "|": "¦", "{": "(", "}": ")", "\\": "/", "~": "-", "_": "-", "#": "№", "!": "." };

export interface Limits { graphBytes?: number; rows?: number }

export function createFactsGather(deps: RuntimeDeps = createNodeDeps(), limits: Limits = {}) {
  const graphBytes = limits.graphBytes ?? GRAPH_FILE_BYTES;
  const maxRows = limits.rows ?? MAX_ROWS;
  const { fs, path } = deps;

  const fact = (value: unknown, status: Status, evidence: string[] = [], note?: string): Fact =>
    note === undefined ? { value, status, evidence } : { value, status, evidence, note };
  const unavailable = (reason: string, evidence: string[] = []): Fact => fact(null, "unavailable", evidence, reason);

  /** Bounded, redacted, one line, and inert for Archify. Anything captured from a project goes through here. */
  function clean(text: unknown): string {
    let out = String(text).slice(0, 4096).normalize("NFKC").replace(/\p{Cf}/gu, "").replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ").trim();
    for (const pattern of SECRET_PATTERNS) out = out.replace(pattern, "(redacted)");
    out = out.replace(/[<>`*\[\]|{}\\~_#!]/g, (character) => INERT[character] ?? character).replace(/:\/\//g, ":/ /");
    return out.length > FIELD_LIMIT ? `${out.slice(0, FIELD_LIMIT - 1)}…` : out;
  }

  /** Refuses a symlink at any path segment and anything resolving outside the project; bounds size. */
  function read(root: string, relative: string, maxBytes = MAX_FILE_BYTES): { text?: string; mtimeMs?: number; missing?: true; error?: string } {
    try {
      let current = root;
      const parts = relative.split("/");
      let stat;
      for (let index = 0; index < parts.length; index++) {
        current = path.join(current, parts[index]);
        try { stat = fs.lstatSync(current); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return { missing: true }; throw error; }
        if (stat.isSymbolicLink()) return { error: "symlink refused" };
        if (index < parts.length - 1 && !stat.isDirectory()) return { error: "not a file" };
      }
      if (!stat || !stat.isFile()) return { error: "not a file" };
      const within = path.relative(root, fs.realpathSync(current));
      if (within.startsWith("..") || path.isAbsolute(within)) return { error: "resolves outside the project" };
      if (stat.size > maxBytes) return { error: "too large to read" };
      return { text: String(fs.readFileSync(current)), mtimeMs: stat.mtimeMs };
    } catch { return { error: "unreadable" }; }
  }
  const why = (source: { missing?: true; error?: string }): string => (source.missing ? "file not present" : source.error ?? "unreadable");
  const markdown = (root: string, relative: string) => {
    const source = read(root, relative);
    if (source.text === undefined) return { ...source, body: undefined as string | undefined, truncated: false };
    const truncated = source.text.length > MARKDOWN_LIMIT;
    return { ...source, body: source.text.slice(0, MARKDOWN_LIMIT), truncated };
  };
  const json = (root: string, relative: string, maxBytes = MAX_FILE_BYTES) => {
    const source = read(root, relative, maxBytes);
    if (source.text === undefined) return { ...source, value: undefined as unknown };
    try { return { ...source, value: JSON.parse(source.text) as unknown }; } catch { return { error: "not valid JSON", value: undefined as unknown }; }
  };

  function tableRows(text: string, heading: string): string[][] {
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const start = lines.findIndex((line) => /^#{1,6}[ \t]+/.test(line) && line.replace(/^#{1,6}[ \t]+/, "").trim() === heading);
    if (start === -1) return [];
    const rows: string[][] = [];
    for (const line of lines.slice(start + 1)) {
      if (/^#{1,6}[ \t]+/.test(line)) break;
      if (!line.startsWith("|")) continue;
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      if (cells.length && !cells.every((cell) => /^:?-+:?$/.test(cell))) rows.push(cells);
    }
    return rows.slice(1);
  }

  function workflow(root: string): Facts["workflow"] {
    const marker = json(root, ".project/.bundle-sync.json");
    const version = read(root, "VERSION");
    const synced = (marker.value as { sourceVersion?: unknown } | undefined)?.sourceVersion;
    if (typeof synced === "string") return { installedVersion: fact(clean(synced), "observed", [".project/.bundle-sync.json"], "installed version recorded by the last bundle-sync") };
    if (version.text) return { installedVersion: fact(clean(version.text), "stale", ["VERSION"], "unpacked version, not updated by sync") };
    return { installedVersion: unavailable("no sync marker and no VERSION file") };
  }

  function pitches(root: string): Facts["pitches"] {
    const status = markdown(root, ".project/status.md");
    if (status.body === undefined) { const reason = `.project/status.md ${why(status)}`; return { active: unavailable(reason), shippedListed: unavailable(reason) }; }
    const rows = tableRows(status.body, "Active pitches");
    const shipped = tableRows(status.body, "Recent ships (last 5)").length;
    const notes = [status.truncated ? ".project/status.md exceeds the 64 KB read limit; later rows are not counted" : null, rows.length > maxRows ? `${rows.length} rows; the first ${maxRows} are listed` : null].filter(Boolean);
    const state: Status = notes.length ? "stale" : "observed";
    const note = notes.length ? notes.join("; ") : undefined;
    const items = rows.slice(0, maxRows).map((cells) => ({
      pitch: clean(cells[0]?.replace(/`/g, "") ?? ""), hill: clean(cells[1] ?? ""), phase: clean(cells[2] ?? ""), appetite: clean(cells[3] ?? ""), touched: clean(cells[4] ?? ""),
    }));
    return { active: fact({ count: rows.length, items }, state, [".project/status.md"], note), shippedListed: fact({ count: shipped }, status.truncated ? "stale" : "observed", [".project/status.md"], status.truncated ? note : undefined) };
  }

  function knowledge(root: string): Fact {
    const graph = json(root, "graphify-out/graph.json", graphBytes);
    if (graph.value === undefined) return unavailable(`graphify-out/graph.json ${why(graph)}; run node ai-framework/scripts/graphify.mts`);
    const nodes = (graph.value as { nodes?: unknown }).nodes;
    if (!Array.isArray(nodes)) return unavailable("graphify-out/graph.json has no nodes array", ["graphify-out/graph.json"]);
    const byType: Record<string, number> = {};
    let entries = 0;
    for (const node of nodes) {
      if ((node as { node_kind?: unknown })?.node_kind !== "knowledge") continue;
      entries++;
      const raw = (node as { entry_type?: unknown }).entry_type;
      const type = typeof raw === "string" && /^[a-z][a-z0-9-]{0,30}$/i.test(raw) ? raw.toLowerCase() : "other";
      const bucket = Object.keys(byType).length < 20 || type in byType ? type : "other";
      byType[bucket] = (byType[bucket] ?? 0) + 1;
    }
    return fact({ entries, byType }, "observed", ["graphify-out/graph.json"]);
  }

  function skills(root: string): Fact {
    const registry = json(root, ".project/skills/registry.json");
    if (registry.missing) return fact({ count: 0, items: [] }, "unconfigured", [], "no skills installed");
    const entries = (registry.value as { skills?: unknown } | undefined)?.skills;
    if (!entries || typeof entries !== "object") return unavailable(`.project/skills/registry.json ${registry.error ?? "has no skills object"}`);
    const all = Object.values(entries as Record<string, { name?: unknown; enabled?: unknown; source?: { revision?: unknown } }>);
    const items = all.slice(0, maxRows).map((entry) => ({
      name: clean(entry?.name ?? ""), enabled: entry?.enabled === true, revision: typeof entry?.source?.revision === "string" ? clean(entry.source.revision).slice(0, 12) : "",
    }));
    const capped = all.length > maxRows;
    return fact({ count: all.length, items }, capped ? "stale" : "observed", [".project/skills/registry.json"], capped ? `${all.length} skills; the first ${maxRows} are listed` : undefined);
  }

  function gather(root: string): Facts {
    const section = <T>(build: () => T, fallback: (reason: string) => T): T => { try { return build(); } catch { return fallback("unexpected error"); } };
    return {
      schemaVersion: 1,
      workflow: section(() => workflow(root), (reason) => ({ installedVersion: unavailable(reason) })),
      pitches: section(() => pitches(root), (reason) => ({ active: unavailable(reason), shippedListed: unavailable(reason) })),
      knowledge: section(() => knowledge(root), unavailable),
      skills: section(() => skills(root), unavailable),
    };
  }

  const show = (item: Fact, text: string): string => (item.status === "unavailable" ? `unavailable (${clean(item.note ?? "no reason")})`
    : `${text} [${item.status}${item.note ? `: ${clean(item.note)}` : ""}]`);
  /** A count is never printed for an unavailable fact, and a stale one reads "at least". */
  const countText = (item: Fact, n: number | undefined, label: string): string => (item.status === "unavailable" || n === undefined ? `${label}: unavailable` : `${item.status === "stale" ? "at least " : ""}${n} ${label}`);

  /** An Archify explainer draft built only from facts. Panels and block ids are fixed; text is inert. */
  function explainer(facts: Facts, projectName: string, generatedAt: string): Record<string, unknown> {
    const active = facts.pitches.active, knowledgeFact = facts.knowledge, skillsFact = facts.skills;
    const activeValue = active.value as { count: number; items: Record<string, string>[] } | null;
    const knowledgeValue = knowledgeFact.value as { entries: number; byType: Record<string, number> } | null;
    const skillsValue = skillsFact.value as { count: number; items: { name: string; enabled: boolean; revision: string }[] } | null;
    const evidence = [...new Set([...facts.workflow.installedVersion.evidence, ...active.evidence, ...knowledgeFact.evidence, ...skillsFact.evidence])];
    const sources = evidence.map((file, index) => ({ id: `src-${index + 1}`, title: file, path: file }));
    const panels: Record<string, unknown>[] = [
      { id: "workflow", title: "Workflow", blocks: [{ id: "workflow-facts", type: "facts", entries: [
        { key: "Installed version", value: show(facts.workflow.installedVersion, String(facts.workflow.installedVersion.value ?? "unknown")) },
        { key: "Generated", value: clean(generatedAt) },
      ] }] },
      { id: "pitches", title: "Pitches", blocks: activeValue && activeValue.items.length ? [{
        id: "pitch-table", type: "comparison", labelColumn: "Pitch", columns: ["Hill", "Phase", "Appetite", "Last touched"],
        rows: activeValue.items.map((item, index) => ({ id: `pitch-${index + 1}`, label: item.pitch || "(unnamed)", cells: [item.hill, item.phase, item.appetite, item.touched].map((text) => ({ text: text || "-" })) })),
      }] : [{ id: "pitch-none", type: "callout", level: "note", text: show(active, "No active pitches listed") }] },
      { id: "knowledge", title: "Knowledge", blocks: [{ id: "knowledge-facts", type: "facts", entries: knowledgeValue
        ? [{ key: "Entries", value: show(knowledgeFact, String(knowledgeValue.entries)) }, ...Object.entries(knowledgeValue.byType).map(([type, n]) => ({ key: clean(type), value: String(n) }))]
        : [{ key: "Entries", value: show(knowledgeFact, "none") }] }] },
      { id: "skills", title: "Skills", blocks: skillsValue && skillsValue.items.length ? [{ id: "skill-facts", type: "facts", entries: skillsValue.items.map((item) => ({ key: item.name || "(unnamed)", value: `${item.enabled ? "enabled" : "disabled"}${item.revision ? `, revision ${item.revision}` : ""}` })) }]
        : [{ id: "skill-none", type: "callout", level: "note", text: show(skillsFact, "No project skills registered") }] },
    ];
    return {
      schema_version: 1, diagram_type: "explainer",
      meta: { id: "project-state", title: `${clean(projectName) || "Project"} state`, locale: "en", feedback_links: false },
      answer: {
        summary: `${countText(active, activeValue?.count, "active pitch(es)")}, ${countText(knowledgeFact, knowledgeValue?.entries, "knowledge entries")}, ${countText(skillsFact, skillsValue?.count, "project skill(s)")}.`,
        reasons: [show(active, "Active pitches come from the status index"), show(knowledgeFact, "Knowledge entries come from the graph"), show(skillsFact, "Skills come from the registry")],
        scope: "Generated by facts-gather from a fixed allowlist of project files. Observed facts are read from cited files; proposed analysis is never mixed in. Metrics are not part of this report; run the token report for them.",
      },
      panels, sources,
    };
  }

  function writeReport(root: string, name: string, text: string): string {
    if (!/^[a-z0-9][a-z0-9.-]{0,60}\.explainer\.json$/.test(name)) throw new FactsError("--explainer takes a plain file name ending in .explainer.json");
    // Check each existing directory with lstat before creating the next, so a hostile `.project` link never gets a new directory behind it.
    for (const relative of [".project", REPORT_DIRECTORY]) {
      const full = path.join(root, relative);
      try {
        const stat = fs.lstatSync(full);
        if (stat.isSymbolicLink() || !stat.isDirectory()) throw new FactsError("report directory is not a plain directory inside the project");
      } catch (error) {
        if (error instanceof FactsError) throw error;
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new FactsError("report directory could not be checked");
        fs.mkdirSync(full);
      }
    }
    const real = fs.realpathSync(path.join(root, REPORT_DIRECTORY));
    if (path.relative(root, real) !== path.join(".project", "reports")) throw new FactsError("report directory resolves outside the project");
    const destination = path.join(real, name);
    try { if (fs.lstatSync(destination).isSymbolicLink()) throw new FactsError("Symlink destination forbidden"); } catch (error) { if (error instanceof FactsError) throw error; }
    // "wx" refuses an existing path; the random suffix makes the temporary name unguessable.
    const temporary = `${destination}.tmp-${deps.proc.pid}-${Array.from(deps.crypto.randomBytes(6), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
    try { fs.writeFileSync(temporary, text, { mode: 0o644, flag: "wx" }); fs.renameSync(temporary, destination); } finally { fs.rmSync(temporary, { force: true }); }
    return `${REPORT_DIRECTORY}/${name}`;
  }

  function cli(argv: string[]): string {
    let root = deps.proc.cwd(), asJson = false, out: string | undefined, now: string | undefined;
    for (let index = 0; index < argv.length; index++) {
      const arg = argv[index];
      if (arg === "--json") asJson = true;
      else if (arg === "--explainer" && argv[index + 1] !== undefined) out = argv[++index];
      else if (arg === "--root" && argv[index + 1] !== undefined) root = argv[++index];
      else if (arg === "--now" && argv[index + 1] !== undefined) now = argv[++index];
      else throw new FactsError("Unknown option");
    }
    try { root = fs.realpathSync(root); } catch { throw new FactsError("--root does not exist or is not resolvable"); }
    const facts = gather(root);
    const stamp = now ?? new Date(deps.clock.now()).toISOString();
    if (out) {
      const written = writeReport(root, out, `${JSON.stringify(explainer(facts, path.basename(root), stamp), null, 2)}\n`);
      return `wrote ${written}`;
    }
    if (asJson) return JSON.stringify(facts, null, 2);
    const counts: Record<string, number> = {};
    const walk = (value: unknown): void => {
      if (value && typeof value === "object" && "status" in value && "evidence" in value) { const status = (value as Fact).status; counts[status] = (counts[status] ?? 0) + 1; return; }
      if (value && typeof value === "object") for (const child of Object.values(value)) walk(child);
    };
    walk(facts);
    return `facts for ${clean(path.basename(root))}: ${Object.entries(counts).map(([status, n]) => `${n} ${status}`).join(", ")}\npreview only (pass --explainer <name>.explainer.json to write the Archify draft)`;
  }

  return { gather, explainer, clean, cli, writeReport };
}

export function main(argv: string[], deps: RuntimeDeps): number {
  try { deps.io.stdout.write(`${createFactsGather(deps).cli(argv)}\n`); return 0; }
  catch (error) { deps.io.stderr.write(`facts-gather: ${error instanceof FactsError ? error.message : "unexpected error"}\n`); return 1; }
}

runDirect(import.meta.url, main);
