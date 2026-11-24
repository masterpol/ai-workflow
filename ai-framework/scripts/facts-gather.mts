import { runDirect } from "./runtime/cli.mts";
/*
 * Gathers the facts behind /state and turns them into an Archify explainer draft. Read-only over a
 * fixed allowlist of project files (never .env*, credentials, transcripts, a database or the network).
 * Every number and name in the draft comes from this script, never from model-written text.
 * Contract: ai-framework/integrations/state-report.md.
 */
import { createNodeDeps } from "./runtime/node.mts";
import type { RuntimeDeps } from "./runtime/types.mts";
import { SECRET_PATTERNS, createProjectFacts } from "./facts-project.mts";

export const STATUSES = ["observed", "proposed", "stale", "unavailable", "unconfigured"] as const;
export type Status = (typeof STATUSES)[number];
export interface Fact { value: unknown; status: Status; evidence: string[]; note?: string }
export interface Facts {
  schemaVersion: 1;
  workflow: { installedVersion: Fact };
  pitches: { active: Fact; shippedListed: Fact };
  knowledge: Fact;
  skills: Fact;
  /** Present only at project depth. */
  project?: { database: Fact; structure: Fact; stack: Fact; workspaces: Fact };
}
export type Depth = "simple" | "project";
export class FactsError extends Error {}

const MAX_FILE_BYTES = 1024 * 1024;
const GRAPH_FILE_BYTES = 64 * 1024 * 1024;
const MARKDOWN_LIMIT = 64 * 1024;
const FIELD_LIMIT = 200;
const MAX_ROWS = 100;
export const REPORT_DIRECTORY = ".project/reports";
const RECEIPT_NAME = "state.delivery.json";
const RECEIPT_BYTES = 64 * 1024;
/** Beside a written draft: the SHA-256 of what this tool wrote, so its own undelivered draft stays replaceable. */
const WRITTEN_SUFFIX = ".written-sha256";
const ERD_ENTITIES = 30;
const ERD_ATTRIBUTES = 15;
const ERD_ENDS = 5; // relationship ends drawn per entity: Archify refuses a side with more ports than it has room for
const SCRIPT_NAMES = 20;


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

  /** Directive-shaped characters of Archify's inline language become inert look-alikes, on top of clean(). */
  function label(text: unknown): string {
    const out = clean(text).replace(/@/g, "(at)").replace(/=/g, ":").replace(/&/g, "+").replace(/\$/g, "¤").replace(/^[|]+/, "");
    return out.trim() || "(unnamed)";
  }

  /** A label shortened for a diagram, where Archify refuses text that does not fit its header. */
  const fit = (text: unknown, length: number): string => { const out = label(text); return out.length > length ? `${out.slice(0, length - 1)}…` : out; };

  /** `auto` is project depth when the project has a bundle-sync marker (an installed workflow), otherwise simple. */
  function resolveDepth(root: string, requested: "simple" | "project" | "auto"): Depth {
    if (requested !== "auto") return requested;
    return read(root, ".project/.bundle-sync.json").text !== undefined ? "project" : "simple";
  }

  function gather(root: string, depth: Depth = "simple"): Facts {
    const section = <T>(build: () => T, fallback: (reason: string) => T): T => { try { return build(); } catch { return fallback("unexpected error"); } };
    const facts: Facts = {
      schemaVersion: 1,
      workflow: section(() => workflow(root), (reason) => ({ installedVersion: unavailable(reason) })),
      pitches: section(() => pitches(root), (reason) => ({ active: unavailable(reason), shippedListed: unavailable(reason) })),
      knowledge: section(() => knowledge(root), unavailable),
      skills: section(() => skills(root), unavailable),
    };
    if (depth === "project") {
      const reader = createProjectFacts(deps, { read, clean });
      facts.project = { database: reader.database(root), structure: reader.structure(root), stack: reader.stack(root), workspaces: reader.workspaces(root) };
    }
    return facts;
  }

  const show = (item: Fact, text: string): string => (item.status === "unavailable" ? `unavailable (${clean(item.note ?? "no reason")})`
    : `${text} [${item.status}${item.note ? `: ${clean(item.note)}` : ""}]`);
  /** A count is never printed for an unavailable fact, and a stale one reads "at least". */
  const countText = (item: Fact, n: number | undefined, label: string): string => (item.status === "unavailable" || n === undefined ? `${label}: unavailable` : `${item.status === "stale" ? "at least " : ""}${n} ${label}`);

  /** ERD and tree blocks plus a stack table. Names are raw in the facts: relations resolve on them first, then ids are generated. */
  function projectPanels(project: NonNullable<Facts["project"]>, projectName: string): Record<string, unknown>[] {
    const panels: Record<string, unknown>[] = [];
    const { database, structure, stack, workspaces } = project;

    type Entity = { name: string; schema?: string; columns: { name: string; type: string; pk: boolean }[]; unique: string[][] };
    type Relation = { from: string; fromSchema?: string; fromColumns: string[]; to: string; toSchema?: string; toColumns: string[] };
    const databaseValue = database.value as {
      entities: Entity[]; relationships: Relation[]; total: { entities: number; relationships: number };
      source?: { kind: string; path: string; files: number; ignored?: string } | null;
      approximate?: string[]; notUnderstood?: number;
      alternatives?: { kind: string; path: string; tables: number }[]; found?: { kind: string; path: string }[];
    } | null;
    const approximate = new Set(databaseValue?.approximate ?? []);
    const source = databaseValue?.source;
    const details = [
      ...(source ? [source.kind === "sql-migrations" ? `from ${source.files} SQL migrations in ${label(source.path)}` : `from the newest Drizzle snapshot in ${label(source.path)}`] : []),
      ...(databaseValue?.alternatives ?? []).map((item) => `Alternative: ${label(item.kind)} in ${label(item.path)}, ${item.tables} tables`),
      ...(databaseValue?.found ?? []).map((item) => `${label(item.path)}: ${item.kind === "typescript-schema" ? "TypeScript schema" : label(item.kind)}, not read`),
      ...(approximate.size ? [`${approximate.size} approximate table(s)`] : []),
      ...(databaseValue?.notUnderstood ? [`${databaseValue.notUnderstood} statement(s) not understood`] : []),
      ...(source?.ignored ? [`Ignored SQL sources: ${label(source.ignored)}`] : []),
    ];
    const databaseText = (text: string): string => database.status === "unavailable"
      ? [show(database, text), ...details].join("; ")
      : show(database.status === "unconfigured" ? { ...database, note: undefined } : database, [text, ...details].join("; "));
    if (databaseValue && databaseValue.entities.length) {
      const entities = databaseValue.entities;
      // Tables from different schemas can share a name (`auth.users`, `public.users`). A name resolves to an entity only when exactly one
      // candidate fits the schema the foreign key names; an ambiguous name is left unresolved (counted, not drawn) rather than guessed.
      const byName = new Map<string, number[]>();
      entities.forEach((entity, position) => byName.set(entity.name, [...(byName.get(entity.name) ?? []), position]));
      const find = (tableName: string, schema: string | undefined): number | undefined => {
        const candidates = (byName.get(tableName) ?? []).filter((position) => !schema || !entities[position].schema || entities[position].schema === schema);
        return candidates.length === 1 ? candidates[0] : undefined;
      };
      const all = databaseValue.relationships.flatMap((relation) => {
        const from = find(relation.from, relation.fromSchema), to = find(relation.to, relation.toSchema);
        return from === undefined || to === undefined ? [] : [{ relation, from, to }];
      });
      // Archify refuses a relationship from an entity to itself, so self-references are counted, never drawn.
      const selfReferences = all.filter((link) => link.from === link.to).length;
      const resolved = all.filter((link) => link.from !== link.to);
      const degree = new Map<number, number>();
      for (const link of resolved) { degree.set(link.from, (degree.get(link.from) ?? 0) + 1); degree.set(link.to, (degree.get(link.to) ?? 0) + 1); }
      const kept = entities.map((_, position) => position)
        .sort((a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0) || a - b).slice(0, ERD_ENTITIES).sort((a, b) => a - b);
      const ids = new Map<number, string>(kept.map((position, order) => [position, `e${order + 1}`]));
      // Emitted attribute names are unique per entity and dot-free: distinct raw columns that clean or truncate to the same
      // text get a numbered suffix. A reference uses exactly the emitted name of its target, so it always resolves.
      const emitted = new Map<number, Map<string, string>>();
      for (const position of kept) {
        const names = new Map<string, string>(), used = new Set<string>();
        for (const column of entities[position].columns.slice(0, ERD_ATTRIBUTES)) {
          if (names.has(column.name)) continue;
          const base = fit(column.name, 28).replace(/\./g, "-");
          let candidate = base;
          for (let suffix = 2; used.has(candidate); suffix++) candidate = `${fit(column.name, 28 - String(suffix).length - 1).replace(/\./g, "-")}~${suffix}`;
          used.add(candidate); names.set(column.name, candidate);
        }
        emitted.set(position, names);
      }
      // An fk attribute names "<entity id>.<emitted column>" only when both ends are drawn; otherwise it is counted, not linked.
      const foreign = new Map<number, Map<string, string>>();
      let unlinked = 0;
      for (const link of resolved) {
        if (!ids.has(link.from)) continue;
        const map = foreign.get(link.from) ?? new Map<string, string>();
        link.relation.fromColumns.forEach((column, order) => {
          if (map.has(column)) return;
          const target = emitted.get(link.to)?.get(link.relation.toColumns[order] ?? "");
          if (ids.has(link.to) && target !== undefined && emitted.get(link.from)?.has(column)) map.set(column, `${ids.get(link.to)}.${target}`);
          else unlinked++;
        });
        foreign.set(link.from, map);
      }
      const erdEntities = kept.map((position, order) => {
        const entity = entities[position];
        const single = new Set(entity.unique.filter((columns) => columns.length === 1).map((columns) => columns[0]));
        const names = emitted.get(position)!;
        const attributes = [...names].map(([raw, emittedName]) => {
          const column = entity.columns.find((item) => item.name === raw)!;
          const reference = foreign.get(position)?.get(raw);
          const keys = [column.pk ? "pk" : null, reference ? "fk" : null, single.has(raw) ? "uk" : null].filter((key): key is string => key !== null);
          const type = fit(column.type, 20);
          return { name: emittedName, ...(column.type ? { type } : {}), ...(keys.length ? { key: keys.length === 1 ? keys[0] : keys } : {}), ...(reference ? { references: reference } : {}) };
        });
        const name = entity.schema && (byName.get(entity.name)?.length ?? 0) > 1 ? `${entity.schema}.${entity.name}` : entity.name;
        const suffix = approximate.has(entity.name) ? " (approx.)" : "";
        return { id: ids.get(position)!, label: `${fit(name, 28 - suffix.length)}${suffix}`, row: Math.floor(order / 6), col: order % 6, ...(attributes.length ? { attributes } : {}) };
      });
      const ends = new Map<number, number>();
      let undrawn = 0;
      const drawn = resolved.filter((link) => ids.has(link.from) && ids.has(link.to)).filter((link) => {
        if ((ends.get(link.from) ?? 0) >= ERD_ENDS || (ends.get(link.to) ?? 0) >= ERD_ENDS) { undrawn++; return false; }
        ends.set(link.from, (ends.get(link.from) ?? 0) + 1); ends.set(link.to, (ends.get(link.to) ?? 0) + 1);
        return true;
      });
      const relationships = drawn.map((link, order) => ({ id: `r${order + 1}`, from: ids.get(link.from)!, to: ids.get(link.to)!, fromCardinality: "many", toCardinality: "one" }));
      const total = databaseValue.total.entities;
      const atLeast = database.status === "stale" || total > ERD_ENTITIES;
      const shown = kept.length < total
        ? `Showing the ${kept.length} most-connected of ${atLeast ? "at least " : ""}${total} tables`
        : `${atLeast ? "At least " : ""}${total} table(s), ${relationships.length} relationship(s) shown`;
      const capNote = `${undrawn ? `; ${undrawn} more relationship(s) are not drawn (at most ${ERD_ENDS} per table)` : ""}${selfReferences ? `; ${selfReferences} self-reference(s) are not drawn` : ""}${unlinked ? `; ${unlinked} foreign-key column(s) point at a table or column not shown` : ""}`;
      panels.push({ id: "database", title: "Database", blocks: [
        { id: "database-erd", type: "diagram", diagramType: "erd", spec: { schema_version: 1, diagram_type: "erd", meta: { title: `${label(projectName)} schema` }, layout: { mode: "grid", gapX: 96, gapY: 64 }, entities: erdEntities, relationships } },
        { id: "database-note", type: "callout", level: "note", text: databaseText(`${shown}${capNote}`) },
      ] });
    } else panels.push({ id: "database", title: "Database", blocks: [{ id: "database-note", type: "callout", level: "note", text: databaseText(database.status === "unconfigured" ? "No schema source found" : "Schema source could not be read") }] });

    type Node = { path: string; label: string; parent: string | null; files: number };
    const structureValue = structure.value as { nodes: Node[]; total: { dirs: number; files: number } } | null;
    if (structureValue) {
      const rootId = "d1", ids = new Map<string, string>();
      structureValue.nodes.forEach((node, order) => { if (!ids.has(node.path)) ids.set(node.path, `d${order + 2}`); });
      const nodes = [{ id: rootId, label: label(projectName) }, ...structureValue.nodes.map((node, order) => ({
        id: `d${order + 2}`, label: node.files ? `${fit(node.label, 40)} (${node.files} files)` : fit(node.label, 40),
        parent: node.parent === null ? rootId : ids.get(node.parent) ?? rootId,
      }))];
      const note = `${structure.status === "stale" ? "At least " : ""}${structureValue.total.dirs} director(ies) and ${structureValue.total.files} file(s) counted`;
      panels.push({ id: "structure", title: "Structure", blocks: [
        { id: "structure-tree", type: "diagram", diagramType: "tree", spec: { schema_version: 1, diagram_type: "tree", meta: { title: `${label(projectName)} layout` }, nodes } },
        { id: "structure-note", type: "callout", level: "note", text: show(structure, note) },
      ] });
    } else panels.push({ id: "structure", title: "Structure", blocks: [{ id: "structure-note", type: "callout", level: "note", text: show(structure, "No directory structure found") }] });

    const stackValue = stack.value as { manager: string | null; language: string; dependencies: number; devDependencies: number; frameworks: string[]; scripts: string[] } | null;
    const workspaceValue = workspaces.value as { packages: { path: string; name: string; frameworks: string[] }[]; unresolved: number } | null;
    const workspaceRows = (workspaceValue?.packages ?? []).slice(0, 20).map((item) => ({
      key: `Workspace ${label(item.path)}`, value: label([item.name, ...item.frameworks].join(", ")),
    }));
    if (workspaceValue?.unresolved) workspaceRows.push({ key: "Workspace patterns not resolved", value: String(workspaceValue.unresolved) });
    // A capped or refused list says so; a stale status is never hidden behind the rows that were read.
    if (workspaces.status === "stale" || workspaces.status === "unavailable") workspaceRows.push({ key: "Workspace list", value: label(workspaces.note ?? "incomplete") });
    panels.push({ id: "stack", title: "Stack", blocks: stackValue ? [{ id: "stack-facts", type: "facts", entries: [
      { key: "Language", value: show(stack, label(stackValue.language)) },
      { key: "Package manager", value: label(stackValue.manager ?? "unknown") },
      { key: "Dependencies", value: String(stackValue.dependencies) },
      { key: "Dev dependencies", value: String(stackValue.devDependencies) },
      { key: "Frameworks", value: stackValue.frameworks.length ? stackValue.frameworks.map(label).join(", ") : "none listed" },
      { key: "Scripts", value: stackValue.scripts.length ? `${stackValue.scripts.slice(0, SCRIPT_NAMES).map(label).join(", ")}${stackValue.scripts.length > SCRIPT_NAMES ? `, and ${stackValue.scripts.length - SCRIPT_NAMES} more` : ""}` : "none" },
      ...workspaceRows,
    ] }] : [...(workspaceRows.length ? [{ id: "stack-facts", type: "facts", entries: workspaceRows }] : []), { id: "stack-note", type: "callout", level: "note", text: show(stack, "No project stack found") }] });
    return panels;
  }

  /** An Archify explainer draft built only from facts. Panels and block ids are fixed; text is inert. */
  function explainer(facts: Facts, projectName: string, generatedAt: string): Record<string, unknown> {
    const active = facts.pitches.active, knowledgeFact = facts.knowledge, skillsFact = facts.skills;
    const activeValue = active.value as { count: number; items: Record<string, string>[] } | null;
    const knowledgeValue = knowledgeFact.value as { entries: number; byType: Record<string, number> } | null;
    const skillsValue = skillsFact.value as { count: number; items: { name: string; enabled: boolean; revision: string }[] } | null;
    const evidence = [...new Set([...facts.workflow.installedVersion.evidence, ...active.evidence, ...knowledgeFact.evidence, ...skillsFact.evidence, ...(facts.project ? [facts.project.database, facts.project.structure, facts.project.stack, facts.project.workspaces].flatMap((item) => item.evidence).filter((file) => file !== ".") : [])])];
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
      ...(facts.project ? projectPanels(facts.project, projectName) : []),
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

  /** Reads a regular file through a no-follow, non-blocking descriptor and checks it is the file lstat saw; null on any doubt. */
  function readPinned(file: string, limit: number): { bytes: Uint8Array; dev: number; ino: number } | null {
    try {
      const before = fs.lstatSync(file);
      if (before.isSymbolicLink() || !before.isFile() || before.size > limit) return null;
      const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
      try {
        const opened = fs.fstatSync(fd);
        if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) return null;
        const bytes = new Uint8Array(limit + 1);
        let length = 0;
        while (length < bytes.length) { const count = fs.readSync(fd, bytes, length, bytes.length - length, null); if (!count) break; length += count; }
        return length > limit ? null : { bytes: bytes.slice(0, length), dev: opened.dev, ino: opened.ino };
      } finally { fs.closeSync(fd); }
    } catch { return null; }
  }

  /**
   * The destination is ours when its SHA-256 equals specification.sha256 in Archify's delivery receipt, or the hash this
   * tool recorded beside it when it last wrote it (a draft whose validate failed has no receipt yet). Returns its identity.
   */
  function ownedDraft(directory: string, destination: string, name: string): { dev: number; ino: number; sha: string } | null {
    const target = readPinned(destination, MAX_FILE_BYTES);
    if (!target) return null;
    const sha = deps.crypto.sha256Hex(target.bytes);
    const recorded: unknown[] = [];
    const receipt = readPinned(path.join(directory, RECEIPT_NAME), RECEIPT_BYTES);
    if (receipt) { try { recorded.push((JSON.parse(new TextDecoder().decode(receipt.bytes)) as { specification?: { sha256?: unknown } })?.specification?.sha256); } catch { /* not a receipt */ } }
    const marker = readPinned(path.join(directory, `${name}${WRITTEN_SUFFIX}`), 128);
    if (marker) recorded.push(new TextDecoder().decode(marker.bytes).trim());
    return recorded.some((value) => typeof value === "string" && /^[0-9a-f]{64}$/.test(value) && value === sha) ? { dev: target.dev, ino: target.ino, sha } : null;
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
    const notOwned = (file: string): string => `report-not-owned: ${file} (no matching Archify receipt or ${file}${WRITTEN_SUFFIX} record proves this tool wrote it; if it is yours to discard, delete ${REPORT_DIRECTORY}/${file} and any ${file}${WRITTEN_SUFFIX} that is not a hash, then run /state again)`;
    let exists = false;
    try {
      const stat = fs.lstatSync(destination);
      if (stat.isSymbolicLink()) throw new FactsError("Symlink destination forbidden");
      exists = true;
    } catch (error) { if (error instanceof FactsError) throw error; }
    // An existing draft is replaced only when the receipt or this tool's own record proves it wrote exactly those bytes.
    const owned = exists ? ownedDraft(real, destination, name) : null;
    if (exists && !owned) throw new FactsError(notOwned(name));
    // "wx" refuses an existing path; the random suffix makes the temporary name unguessable.
    const temporary = `${destination}.tmp-${deps.proc.pid}-${Array.from(deps.crypto.randomBytes(6), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
    try {
      fs.writeFileSync(temporary, text, { mode: 0o644, flag: "wx" });
      if (!owned) {
        // A new draft is published with a hard link, which fails if anything appeared at the destination meanwhile.
        try { fs.linkSync(temporary, destination); } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new FactsError(notOwned(name));
          // A filesystem without hard links (FAT, some network mounts): re-check absence, then rename (a documented, narrower window).
          let appeared = true;
          try { fs.lstatSync(destination); } catch (missing) { if ((missing as NodeJS.ErrnoException).code === "ENOENT") appeared = false; }
          if (appeared) throw new FactsError(notOwned(name));
          fs.renameSync(temporary, destination);
        }
      } else {
        // Re-check identity and bytes immediately before replacing; an edit or swap since the ownership check is refused.
        const again = readPinned(destination, MAX_FILE_BYTES);
        if (!again || again.dev !== owned.dev || again.ino !== owned.ino || deps.crypto.sha256Hex(again.bytes) !== owned.sha) throw new FactsError(notOwned(name));
        fs.renameSync(temporary, destination);
      }
    } finally { fs.rmSync(temporary, { force: true }); }
    // Record what was written, so a draft whose Archify validate failed (no receipt) can still be regenerated.
    const marker = path.join(real, `${name}${WRITTEN_SUFFIX}`);
    // The marker replaces only an absent path or an earlier marker (one hex line); anything else is left alone and no marker is kept.
    try {
      const existing = fs.lstatSync(marker);
      if (existing.isSymbolicLink() || !existing.isFile() || existing.size > 128 || !/^[0-9a-f]{64}\n?$/.test(String(fs.readFileSync(marker)))) return `${REPORT_DIRECTORY}/${name}`;
    } catch (error) {
      // Only a missing marker is absent; an unreadable one is not ours to replace.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") return `${REPORT_DIRECTORY}/${name}`;
    }
    const markerTemporary = `${marker}.tmp-${deps.proc.pid}-${Array.from(deps.crypto.randomBytes(6), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
    try { fs.writeFileSync(markerTemporary, `${deps.crypto.sha256Hex(text)}\n`, { mode: 0o644, flag: "wx" }); fs.renameSync(markerTemporary, marker); } finally { fs.rmSync(markerTemporary, { force: true }); }
    return `${REPORT_DIRECTORY}/${name}`;
  }

  function cli(argv: string[]): string {
    let root = deps.proc.cwd(), asJson = false, out: string | undefined, now: string | undefined, depth: "simple" | "project" | "auto" = "auto";
    for (let index = 0; index < argv.length; index++) {
      const arg = argv[index];
      if (arg === "--json") asJson = true;
      else if (arg === "--explainer" && argv[index + 1] !== undefined) out = argv[++index];
      else if (arg === "--root" && argv[index + 1] !== undefined) root = argv[++index];
      else if (arg === "--depth" && argv[index + 1] !== undefined) {
        const value = argv[++index];
        if (value !== "simple" && value !== "project" && value !== "auto") throw new FactsError("--depth takes simple, project or auto");
        depth = value;
      }
      else if (arg === "--now" && argv[index + 1] !== undefined) now = argv[++index];
      else throw new FactsError("Unknown option");
    }
    try { root = fs.realpathSync(root); } catch { throw new FactsError("--root does not exist or is not resolvable"); }
    const facts = gather(root, resolveDepth(root, depth));
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

  return { gather, explainer, clean, cli, writeReport, resolveDepth };
}

export function main(argv: string[], deps: RuntimeDeps): number {
  try { deps.io.stdout.write(`${createFactsGather(deps).cli(argv)}\n`); return 0; }
  catch (error) { deps.io.stderr.write(`facts-gather: ${error instanceof FactsError ? error.message : "unexpected error"}\n`); return 1; }
}

runDirect(import.meta.url, main);
