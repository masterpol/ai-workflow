/*
 * Graph reader for the /state deep-evidence sections. It takes the already-parsed graphify-out/graph.json
 * (the caller owns the guarded read), validates every element, and derives module, import and risk facts.
 * One validated index (Map-backed, caps recorded in `limits`) feeds every fact, so the unvalidated graph never
 * leaves this file. Labels, ids and paths are allow-listed at ingest; no process is started.
 * "Graph degree" is a count of links, not a quality or risk score. See ai-framework/integrations/state-report.md.
 */
import { isSecretName } from "./state-structure.mts";
import { insideProject } from "./state-theme.mts";

import type { Fact } from "./state-structure.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

export type GraphDeps = RuntimeDeps & { scrub: (text: unknown) => string };
export interface KnowledgeEntry { id: string; source: string | null; updated: string | null }
export interface GraphLimits { truncated: boolean; rejectedNodes: number; rejectedSourceFiles: number; ignoredLinks: number; externalEdges: number; bytes: number }
export interface GraphIndex {
  nodes: Map<string, { kind: string; file: string | null; label: string }>;
  degree: Record<string, number>; edges: Array<[string, string]>; codeFiles: string[]; knowledge: KnowledgeEntry[];
  limits: GraphLimits; linkCount: number; mtimeMs: number; old: boolean; builtAtCommit: string | null;
}
export interface GraphUnavailable { unavailable: string }
export interface TreeOptions { treeTruncated?: boolean; repoShape?: string | null }

export const MAX_GRAPH_BYTES = 16 * 1024 * 1024;
export const MAX_NODES = 50_000;
export const MAX_LINKS = 200_000;
export const AGREE_OBSERVED = 0.9;
export const AGREE_MIN = 0.5;
export const AGREE_MIN_FILES = 10;
const DAY = 86_400_000;
const GRAPH = ["graphify-out/graph.json"];
const FILE_TYPES = new Set(["code", "document", "concept"]);
const RELATIONS = new Set(["calls", "contains", "imports", "imports_from", "re_exports", "dynamic_import", "inherits", "method", "indirect_call", "references", "related"]);
const IMPORT_RELATIONS = new Set(["imports", "imports_from", "re_exports", "dynamic_import"]);
const TEST_DIRS = new Set(["test", "tests", "__tests__", "spec"]);
const SAFE_PATH = /^[A-Za-z0-9._@+/-]{1,300}$/;
const SAFE_LABEL = /^[A-Za-z_$][A-Za-z0-9_$.]{0,79}(\(\))?$/;
const SAFE_ID = /^[a-z0-9][a-z0-9-]{0,119}$/;
const SAFE_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const unavailable = (reason: string): Fact => ({ value: null, status: "unavailable", evidence: [], note: reason });
const dirOf = (file: string): string[] => file.split("/").slice(0, -1);

function make(value: unknown, status: string, notes: string[], evidence: string[] = GRAPH): Fact {
  const dead = status === "unavailable";
  return { value: dead ? null : value, status, evidence: dead ? [] : evidence, ...(notes.length ? { note: notes.join("; ") } : {}) };
}
function safePath(file: string, scrub: GraphDeps["scrub"]): boolean {
  if (!SAFE_PATH.test(file)) return false;
  const parts = file.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) return false;
  return !parts.some(isSecretName) && scrub(file) === file;
}
function validDate(value: unknown): string | null {
  if (typeof value !== "string" || value.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().startsWith(value) ? value : null;
}

interface Build { index: GraphIndex; files: Set<string>; scrub: GraphDeps["scrub"] }

function ingestKnowledge(raw: Record<string, unknown>, build: Build): void {
  const id = typeof raw.entry_id === "string" ? raw.entry_id : "";
  if (!SAFE_ID.test(id)) return;
  const source = typeof raw.source === "string" && SAFE_SLUG.test(raw.source) ? raw.source : null;
  build.index.knowledge.push({ id, source, updated: validDate(raw.updated) });
}
function ingestNode(raw: unknown, build: Build): void {
  const { limits, nodes } = build.index;
  if (!isRecord(raw)) { limits.rejectedNodes++; return; }
  const { id, source_file: file, file_type: kind } = raw;
  if (typeof id !== "string" || id.length < 1 || id.length > 200 || typeof file !== "string" || typeof kind !== "string" || !FILE_TYPES.has(kind)) { limits.rejectedNodes++; return; }
  if (nodes.has(id)) return;
  const good = safePath(file, build.scrub);
  if (kind === "code" && !good) { limits.rejectedSourceFiles++; return; }
  nodes.set(id, { kind, file: good ? file : null, label: typeof raw.label === "string" ? raw.label.slice(0, 200) : "" });
  if (kind === "code") build.files.add(file);
  if (raw.node_kind === "knowledge") ingestKnowledge(raw, build);
}
function ingestLink(raw: unknown, build: Build): void {
  const { limits, nodes, degree, edges } = build.index;
  const { source, target, relation } = isRecord(raw) ? raw : ({} as Record<string, unknown>);
  if (typeof source !== "string" || typeof target !== "string" || typeof relation !== "string" || !RELATIONS.has(relation) || !nodes.has(source)) { limits.ignoredLinks++; return; }
  const isImport = IMPORT_RELATIONS.has(relation);
  if (!nodes.has(target)) { if (isImport) limits.externalEdges++; else limits.ignoredLinks++; return; }
  degree[source] = (degree[source] || 0) + 1;
  degree[target] = (degree[target] || 0) + 1;
  if (!isImport) return;
  if ((raw as Record<string, unknown>).external === true || target.startsWith("ref_")) limits.externalEdges++;
  else edges.push([source, target]);
}

function bindStateGraph(deps: GraphDeps) {
  const { fs, path } = deps;

  function indexGraph(parsed: unknown, meta: { bytes: number; mtimeMs: number }, now: Date): GraphIndex | GraphUnavailable {
    if (meta.bytes > MAX_GRAPH_BYTES) return { unavailable: "over the 16 MiB deep-evidence cap" };
    const links = isRecord(parsed) ? (Array.isArray(parsed.links) ? parsed.links : parsed.edges) : null;
    if (!isRecord(parsed) || !Array.isArray(parsed.nodes) || !Array.isArray(links)) return { unavailable: "graph has no nodes and links arrays" };
    const truncated = parsed.nodes.length > MAX_NODES || links.length > MAX_LINKS;
    const commit = typeof parsed.built_at_commit === "string" && /^[0-9a-f]{40}$/.test(parsed.built_at_commit) ? parsed.built_at_commit : null;
    const index: GraphIndex = {
      nodes: new Map(), degree: Object.create(null), edges: [], codeFiles: [], knowledge: [], linkCount: Math.min(links.length, MAX_LINKS), mtimeMs: meta.mtimeMs,
      limits: { truncated, rejectedNodes: 0, rejectedSourceFiles: 0, ignoredLinks: 0, externalEdges: 0, bytes: meta.bytes },
      old: !(now.getTime() - meta.mtimeMs <= 7 * DAY), builtAtCommit: commit,
    };
    const build: Build = { index, files: new Set(), scrub: deps.scrub };
    for (const node of parsed.nodes.slice(0, MAX_NODES)) ingestNode(node, build);
    for (const link of links.slice(0, MAX_LINKS)) ingestLink(link, build);
    index.codeFiles = [...build.files].sort();
    index.knowledge.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return index;
  }

  const knowledgeEntries = (index: GraphIndex | GraphUnavailable): KnowledgeEntry[] => ("unavailable" in index ? [] : index.knowledge.map((entry) => ({ ...entry })));

  function realFile(root: string, relative: string): boolean {
    const full = path.join(root, relative);
    try { const stat = fs.lstatSync(full); return stat.isFile() && !stat.isSymbolicLink() && insideProject(root, full, deps) !== null; } catch { return false; }
  }

  // Graph-only gate: a truncated or old graph makes every derived fact stale.
  function graphGate(index: GraphIndex): { status: string; notes: string[] } {
    const notes: string[] = [];
    if (index.limits.truncated) notes.push("graph hit the node or link cap; facts are partial");
    if (index.old) notes.push("graph file is more than 7 days old; run node ai-framework/scripts/graphify.mts");
    return { status: notes.length ? "stale" : "observed", notes };
  }
  // Graph plus tree gate (critique S4). Tree entries are directories, so a file agrees when its directory prefix is a tree path.
  function judge(index: GraphIndex, tree: string[] | null, opts: TreeOptions) {
    const gate = graphGate(index);
    const set = new Set(tree ?? []);
    const agreeing: string[] = [];
    let checkable = 0;
    for (const file of index.codeFiles) {
      const parts = file.split("/");
      if (parts.length < 2) continue;
      checkable++;
      if (set.has(parts.slice(0, Math.min(3, parts.length - 1)).join("/"))) agreeing.push(file);
    }
    const share = checkable ? agreeing.length / checkable : 0;
    const note = `graph disagrees with the folder tree: ${agreeing.length} of ${checkable} files`;
    let status = gate.status;
    if (!tree) { status = "unavailable"; gate.notes.push("depends on structure"); }
    else if (opts.treeTruncated) { status = "stale"; gate.notes.push("tree incomplete; agreement not verifiable"); }
    else if (checkable >= AGREE_MIN_FILES && share < AGREE_MIN) { status = "unavailable"; gate.notes.push(note); }
    else if (checkable < AGREE_MIN_FILES || share < AGREE_OBSERVED) { if (status !== "unavailable") status = "stale"; gate.notes.push(note); }
    return { status, notes: gate.notes, agreeing, checkable, tree: set };
  }

  // Module key rule (log.md "Module key rule"): the first two directory segments, with one split for a dominant module.
  function moduleMap(agreeing: string[], checkable: number, tree: Set<string>, opts: TreeOptions): Map<string, string> {
    const key = (file: string, split: string | null): string => {
      const dir = dirOf(file);
      const two = dir.slice(0, 2).join("/");
      const three = dir.slice(0, 3).join("/");
      return split === two && dir.length >= 3 && tree.has(three) ? three : two;
    };
    const counts = new Map<string, number>();
    for (const file of agreeing) { const two = key(file, null); counts.set(two, (counts.get(two) || 0) + 1); }
    const dominant = [...counts].find(([, count]) => count / checkable > 0.6)?.[0] ?? null;
    const split = dominant !== null && opts.repoShape !== "monorepo" && new Set(agreeing.filter((file) => key(file, null) === dominant).map((file) => key(file, dominant))).size >= 2 ? dominant : null;
    const modules = new Map<string, string>();
    for (const file of agreeing) { const found = key(file, split); if (tree.has(found)) modules.set(file, found); }
    return modules;
  }

  function architectureFacts(index: GraphIndex | GraphUnavailable, tree: string[] | null, _root: string, opts: TreeOptions = {}): { modules: Fact; imports: Fact; graph: Fact } {
    if ("unavailable" in index) return { modules: unavailable(index.unavailable), imports: unavailable(index.unavailable), graph: unavailable(index.unavailable) };
    const verdict = judge(index, tree, opts);
    const graphStatus = graphGate(index);
    const modules = moduleMap(verdict.agreeing, verdict.checkable, verdict.tree, opts);
    const stats = new Map<string, { files: number; tests: number }>();
    for (const [file, key] of modules) {
      const row = stats.get(key) ?? { files: 0, tests: 0 };
      row.files++;
      if (isTestFile(file)) row.tests++;
      stats.set(key, row);
    }
    const items = [...stats].map(([module, row]) => ({ module, ...row })).sort((a, b) => b.files - a.files || (a.module < b.module ? -1 : 1));
    const pairs = new Map<string, number>();
    let external = index.limits.externalEdges;
    for (const [from, to] of index.edges) {
      const a = modules.get(index.nodes.get(from)?.file ?? "");
      const b = modules.get(index.nodes.get(to)?.file ?? "");
      if (a === undefined || b === undefined) external++;
      else if (a !== b) pairs.set(`${a}\u0000${b}`, (pairs.get(`${a}\u0000${b}`) || 0) + 1);
    }
    const edges = [...pairs].map(([pair, count]) => ({ from: pair.split("\u0000")[0], to: pair.split("\u0000")[1], count })).sort((x, y) => y.count - x.count || (`${x.from}\u0000${x.to}` < `${y.from}\u0000${y.to}` ? -1 : 1));
    const agreement = tree ? { agree: verdict.agreeing.length, checkable: verdict.checkable } : null;
    return {
      modules: make({ count: items.length, items: items.slice(0, 100), rootFiles: index.codeFiles.length - verdict.checkable, capped: items.length > 100 }, verdict.status, verdict.notes),
      imports: make({ pairs: edges.length, edges: edges.slice(0, 100), externalEdges: external, capped: edges.length > 100 }, verdict.status, verdict.notes),
      graph: make({ nodes: index.nodes.size, links: index.linkCount, builtAtCommit: index.builtAtCommit, mtime: Number.isFinite(index.mtimeMs) ? new Date(index.mtimeMs).toISOString() : null, limits: { ...index.limits }, treeAgreement: agreement }, graphStatus.status, graphStatus.notes),
    };
  }

  function riskGraphFacts(index: GraphIndex | GraphUnavailable, tree: string[] | null, root: string, now: Date, opts: TreeOptions = {}): { mostConnected: Fact; testFiles: Fact; staleKnowledge: Fact } {
    if ("unavailable" in index) return { mostConnected: unavailable(index.unavailable), testFiles: unavailable(index.unavailable), staleKnowledge: unavailable(index.unavailable) };
    const verdict = judge(index, tree, opts);
    const allowed = new Set(verdict.agreeing);
    const ranked = [...index.nodes].filter(([, node]) => node.kind === "code" && node.file !== null && allowed.has(node.file) && node.label !== node.file.slice(node.file.lastIndexOf("/") + 1))
      .map(([id, node]) => ({ id, file: node.file as string, label: node.label, degree: index.degree[id] || 0 }))
      .sort((a, b) => b.degree - a.degree || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).slice(0, 10);
    const missing = ranked.filter((item) => !realFile(root, item.file));
    const items = ranked.map((item) => ({ symbol: SAFE_LABEL.test(item.label) ? item.label : "(unlabeled symbol)", degree: item.degree, file: missing.includes(item) ? null : item.file }));
    const evidence = [...GRAPH, ...new Set(ranked.filter((item) => !missing.includes(item)).map((item) => item.file))];
    const notes = missing.length ? [...verdict.notes, "a source file no longer exists"] : verdict.notes;
    const status = missing.length && verdict.status === "observed" ? "stale" : verdict.status;
    const tests = verdict.agreeing.filter(isTestFile).length;
    const code = verdict.agreeing.length - tests;
    const ratioNote = tests === 0 ? ["zero test files"] : code === 0 ? ["zero code files"] : [];
    return {
      mostConnected: make({ measure: "graph degree", items }, status, notes, evidence),
      testFiles: make({ code, test: tests, ratio: tests && code ? Math.round((tests / code) * 1000) / 1000 : null }, verdict.status, [...verdict.notes, ...ratioNote]),
      staleKnowledge: staleKnowledge(index, now),
    };
  }

  function staleKnowledge(index: GraphIndex, now: Date): Fact {
    const gate = graphGate(index);
    const age = (entry: KnowledgeEntry): number => Math.floor((now.getTime() - Date.parse(`${entry.updated}T00:00:00Z`)) / DAY);
    const old = index.knowledge.filter((entry) => entry.updated !== null && age(entry) > 60)
      .sort((a, b) => ((a.updated as string) < (b.updated as string) ? -1 : (a.updated as string) > (b.updated as string) ? 1 : a.id < b.id ? -1 : 1));
    const undated = index.knowledge.filter((entry) => entry.updated === null).length;
    return make({ count: old.length, ids: old.slice(0, 10).map((entry) => entry.id), capped: old.length > 10, undated }, gate.status, gate.notes);
  }

  return { indexGraph, architectureFacts, riskGraphFacts, knowledgeEntries };
}

function isTestFile(file: string): boolean { return TEST_FILE.test(file) || dirOf(file).some((part) => TEST_DIRS.has(part)); }

export function createStateGraph(deps: GraphDeps): ReturnType<typeof bindStateGraph> { return bindStateGraph(deps); }
