#!/usr/bin/env node
import { runDirect } from "./runtime/cli.mts";
/*
 * Knowledge-graph front end for the workflow, powered by Graphify (https://github.com/Graphify-Labs/graphify,
 * PyPI package "graphifyy") run through uv. Graphify builds the project graph (tree-sitter AST for code, headings
 * and code mentions for markdown) into graphify-out/graph.json. This script adds what Graphify does not derive from
 * markdown: the typed knowledge entries under .project/knowledge/ (decisions/, patterns/, entities/, issues/ —
 * frontmatter id/type/tags/related plus [[wiki-links]]) are overlaid on that same graph as `knowledge` nodes and
 * `related` edges, so every phase traverses ONE graph: `graphify query`, `graphify path`, or graph.json directly.
 *
 * Subcommands (default: update):
 *   update      graphify update <root>, then overlay the knowledge entries, rewrite .project/knowledge/index.md,
 *               and migrate away the legacy .project/knowledge/graph.json once the new graph covers it
 *   check       validate the knowledge entries only (duplicate ids, broken links, orphans); needs no uv, writes nothing
 *   setup       update + install a post-commit/post-checkout block that reruns this script in the background, so
 *               the rebuilt graph keeps the knowledge overlay (replaces a raw `graphify hook install` block)
 *   anything else (query, path, explain, god-nodes, affected, export, ...) is passed through to graphify
 *
 * Flags: --check (alias of `check`), --json (machine-readable report). `check` exits 1 on an error-level problem.
 * Graphify is resolved as `uv tool run --from graphifyy==<pinned> graphify`; GRAPHIFY_BIN overrides it with a
 * local executable. Imports no node:* module at runtime: every fs/path/process effect goes through RuntimeDeps.
 */

import type { RuntimeDeps } from "./runtime/types.mts";
import { canonicalFiles, canonicalOf, checkRelations, MANIFEST_FILE, problemCodes, type RelationEdge, type RelationKind } from "./graphify-relations.mts";
import { deriveRefs, deriveOutcomeRefs, dropHubTargets, REF_HUB_LIMIT } from "./graphify-refs.mts";

export type FrontmatterValue = string | string[];

export interface Problem {
  level: "warn" | "error";
  file: string;
  message: string;
}

export interface GraphNode {
  id: string;
  type: string;
  title: string;
  tags: string[];
  created: string | null;
  updated: string | null;
  confidence: string | null;
  severity: string | null;
  resolved: string | null;
  source: string | null;
  related: string[];
  file: string;
  /** Decisions only: `accepted` when the entry says nothing, so older entries stay valid without a warning. */
  status?: DecisionStatus;
  supersedes?: string[];
  supersededBy?: string | null;
  alternatives?: string[];
  appliesTo?: string[];
}

export const DECISION_STATUSES = ["accepted", "superseded", "deprecated"] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export interface GraphEdge {
  from: string;
  to: string;
  /** Absent means `related`. */
  relation?: "supersedes";
}

export interface GraphStats {
  total: number;
  decisions: number;
  patterns: number;
  entities: number;
  issues: number;
  edges: number;
  brokenLinks: number;
  orphans: number;
  /** Decision counts by status, so history does not read as current. */
  decisionStatus: Record<DecisionStatus, number>;
}

export interface Graph {
  generated: string;
  stats: GraphStats;
  nodes: GraphNode[];
  edges: GraphEdge[];
  tagIndex: Record<string, string[]>;
}

const typeDirs = ["decisions", "patterns", "entities", "issues"];

export function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseFrontmatter(raw: string): { data: Record<string, FrontmatterValue>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const [, block, body] = match;
  const data: Record<string, FrontmatterValue> = {};
  for (const line of block.split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    const value = rawValue.trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((item) => unquote(item.trim()))
        .filter(Boolean);
    } else {
      data[key] = unquote(value);
    }
  }
  return { data, body };
}

export function extractTitle(body: string): string | null {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

export function extractWikiLinks(body: string): string[] {
  const links = new Set<string>();
  const re = /\[\[([a-z0-9-]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) links.add(m[1]);
  return [...links];
}

function str(value: FrontmatterValue | undefined): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function list(value: FrontmatterValue | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

/** Reads the knowledge tree under `root` and builds the graph plus every problem found. */
export function buildGraph(root: string, deps: RuntimeDeps): { graph: Graph; problems: Problem[] } {
  const { fs, path } = deps;
  const knowledgeDir = path.join(root, ".project", "knowledge");
  const nodes: GraphNode[] = [];
  const problems: Problem[] = [];
  const seenIds = new Map<string, string>();

  for (const typeDir of typeDirs) {
    const dir = path.join(knowledgeDir, typeDir);
    if (!fs.existsSync(dir)) continue;
    const singular = typeDir === "entities" ? "entity" : typeDir.replace(/s$/, "");

    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith(".md")) continue;
      const file = path.join(dir, name);
      const relFile = path.relative(root, file);
      let raw: string;
      try {
        raw = fs.readFileSync(file);
      } catch (error) {
        // A directory named *.md is not an entry (the old script skipped non-files); anything else is a real failure.
        try { fs.readdirSync(file); } catch { throw error; }
        continue;
      }
      const { data, body } = parseFrontmatter(raw);
      const fallbackId = name.replace(/\.md$/, "");
      const declaredId = str(data.id);
      const hasRealId = declaredId !== null && declaredId !== "<kebab-case-identifier>";
      const id = hasRealId ? declaredId : fallbackId;

      if (!hasRealId) {
        problems.push({
          level: "warn",
          file: relFile,
          message: `missing frontmatter id — using filename "${id}"`,
        });
      }
      const firstSeen = seenIds.get(id);
      if (firstSeen !== undefined) {
        problems.push({
          level: "error",
          file: relFile,
          message: `duplicate id "${id}" also used by ${firstSeen}`,
        });
      } else {
        seenIds.set(id, relFile);
      }

      const declaredType = str(data.type) ?? singular;
      if (declaredType !== singular) {
        problems.push({
          level: "warn",
          file: relFile,
          message: `frontmatter type "${declaredType}" doesn't match its folder "${typeDir}"`,
        });
      }

      const related = new Set<string>([...list(data.related), ...extractWikiLinks(body)]);

      let decision: Partial<GraphNode> = {};
      if (singular === "decision") {
        const declared = str(data.status);
        const known = (DECISION_STATUSES as readonly string[]).includes(declared ?? "accepted");
        if (!known) {
          problems.push({ level: "error", file: relFile, message: `unknown decision status "${declared}" (use ${DECISION_STATUSES.join(", ")})` });
        }
        decision = {
          status: known ? ((declared ?? "accepted") as DecisionStatus) : "accepted",
          supersedes: list(data.supersedes),
          supersededBy: str(data.superseded_by),
          alternatives: list(data.alternatives),
          appliesTo: list(data["applies-to"]),
        };
      }

      nodes.push({
        ...decision,
        id,
        type: singular,
        title: extractTitle(body) || id,
        tags: list(data.tags),
        created: str(data.created),
        updated: str(data.updated),
        confidence: str(data.confidence),
        severity: str(data.severity),
        resolved: str(data.resolved),
        source: str(data.source),
        related: [...related],
        file: relFile,
      });
    }
  }

  const idSet = new Set(nodes.map((node) => node.id));
  const edges: GraphEdge[] = [];

  for (const node of nodes) {
    for (const target of node.related) {
      if (target === node.id) continue;
      if (!idSet.has(target)) {
        problems.push({
          level: "warn",
          file: node.file,
          message: `broken link — related entry "${target}" not found`,
        });
        continue;
      }
      edges.push({ from: node.id, to: target });
    }
    if (node.type === "decision") {
      for (const target of node.supersedes ?? []) {
        const older = nodes.find((candidate) => candidate.id === target);
        if (!older || older.type !== "decision") {
          problems.push({ level: "error", file: node.file, message: `supersedes "${target}", which is not a decision entry` });
          continue;
        }
        if (older.supersededBy !== node.id) problems.push({ level: "error", file: older.file, message: `"${node.id}" supersedes this decision but superseded_by does not name it` });
        edges.push({ from: node.id, to: target, relation: "supersedes" });
      }
      if (node.supersededBy) {
        const newer = nodes.find((candidate) => candidate.id === node.supersededBy);
        if (!newer || newer.type !== "decision") problems.push({ level: "error", file: node.file, message: `superseded_by "${node.supersededBy}" is not a decision entry` });
        else if (!(newer.supersedes ?? []).includes(node.id)) problems.push({ level: "error", file: node.file, message: `superseded_by "${newer.id}", which does not list supersedes: ${node.id}` });
      }
      if (node.supersededBy && node.status !== "superseded") problems.push({ level: "error", file: node.file, message: `superseded_by "${node.supersededBy}" needs status: superseded` });
      if (node.supersededBy === node.id || (node.supersedes ?? []).includes(node.id)) problems.push({ level: "error", file: node.file, message: "a decision cannot supersede itself" });
      if (node.status === "superseded" && !node.supersededBy) problems.push({ level: "error", file: node.file, message: "status superseded needs a superseded_by naming the decision that replaces it" });
    }
    if (node.related.length === 0 && node.tags.length === 0) {
      problems.push({
        level: "warn",
        file: node.file,
        message: "orphan — no related links and no tags, other phases can't discover it by traversal",
      });
    }
  }

  const tagIndex: Record<string, string[]> = {};
  for (const node of nodes) {
    for (const tag of node.tags) {
      (tagIndex[tag] ||= []).push(node.id);
    }
  }
  for (const tag of Object.keys(tagIndex)) tagIndex[tag].sort();

  const graph: Graph = {
    generated: new Date(deps.clock.now()).toISOString().slice(0, 10),
    stats: {
      total: nodes.length,
      decisions: nodes.filter((node) => node.type === "decision").length,
      patterns: nodes.filter((node) => node.type === "pattern").length,
      entities: nodes.filter((node) => node.type === "entity").length,
      issues: nodes.filter((node) => node.type === "issue").length,
      edges: edges.length,
      brokenLinks: problems.filter((problem) => problem.message.startsWith("broken link")).length,
      orphans: problems.filter((problem) => problem.message.startsWith("orphan")).length,
      decisionStatus: {
        accepted: nodes.filter((node) => node.status === "accepted").length,
        superseded: nodes.filter((node) => node.status === "superseded").length,
        deprecated: nodes.filter((node) => node.status === "deprecated").length,
      },
    },
    nodes: nodes.sort((a, b) => a.id.localeCompare(b.id)),
    edges,
    tagIndex,
  };
  return { graph, problems };
}

export function renderIndex(data: Graph, root: string, deps: RuntimeDeps): string {
  const { path } = deps;
  const knowledgeDir = path.join(root, ".project", "knowledge");
  const byType: Record<string, GraphNode[]> = { decision: [], pattern: [], entity: [], issue: [] };
  for (const node of data.nodes) byType[node.type]?.push(node);
  const heading: Record<string, string> = { decision: "Decisions", pattern: "Patterns", entity: "Entities", issue: "Issues" };

  const lines: string[] = [];
  lines.push("# Knowledge Index");
  lines.push("");
  lines.push(
    `Last updated: ${data.generated} — generated by \`node ai-framework/scripts/graphify.mts\` (Graphify via uv). Do not hand-edit; re-run the script instead.`
  );
  lines.push("");

  for (const [type, label] of Object.entries(heading)) {
    const entries = byType[type];
    const counts = type === "decision" && entries.length > 0
      ? `, ${DECISION_STATUSES.map((status) => `${entries.filter((node) => node.status === status).length} ${status}`).join(", ")}`
      : "";
    lines.push(`## ${label} (${entries.length} entries${counts})`);
    if (entries.length === 0) {
      lines.push("_none yet_");
    } else {
      for (const node of entries) {
        const relPath = path.relative(knowledgeDir, path.join(root, node.file));
        const state = node.status && node.status !== "accepted" ? ` _(${node.status}${node.supersededBy ? ` by ${node.supersededBy}` : ""})_` : "";
        lines.push(`- [${node.id}](${relPath}) — ${node.title}${state}`);
      }
    }
    lines.push("");
  }

  const tags = Object.keys(data.tagIndex).sort();
  lines.push("## Tag Index");
  if (tags.length === 0) {
    lines.push("_none yet_");
  } else {
    for (const tag of tags) {
      lines.push(`- **${tag}** (${data.tagIndex[tag].length}) — ${data.tagIndex[tag].join(", ")}`);
    }
  }
  lines.push("");

  if (data.edges.length > 0) {
    lines.push("## Graph");
    lines.push("");
    lines.push("```mermaid");
    lines.push("graph LR");
    for (const edge of data.edges) lines.push(`  ${edge.from} ${edge.relation === "supersedes" ? "-.->|supersedes|" : "-->"} ${edge.to}`);
    lines.push("```");
    lines.push("");
  }

  lines.push("## Traversal");
  lines.push("");
  lines.push(
    "The project graph is built by Graphify into `graphify-out/graph.json` (code, docs and these knowledge " +
      "entries as `knowledge` nodes with `related` edges and a `tags` attribute; `graph.workflow.tagIndex` maps tag → ids). " +
      "Find prior knowledge with `node ai-framework/scripts/graphify.mts query \"<question>\"`, `path A B` or " +
      "`explain X`, or filter graph.json nodes by `node_kind: \"knowledge\"`, `entry_type` and `tags`, instead of " +
      "re-scanning every markdown file under `knowledge/`. Rebuild after adding or editing an entry:"
  );
  lines.push("");
  lines.push("```");
  lines.push("node ai-framework/scripts/graphify.mts");
  lines.push("```");
  lines.push("");
  return lines.join("\n");
}

export const GRAPHIFY_VERSION = "0.9.80";
export const GRAPH_FILE = "graphify-out/graph.json";
const LEGACY_GRAPH = ".project/knowledge/graph.json";
export const GRAPHIGNORE = `# Files Graphify must not index (gitignore syntax). Keep generated, archived and vendored trees out of the graph.
node_modules/
graphify-out/
.project/compaction/
.project/analysis/
.project/scratchpad/
.project/runs/
.project/metrics/
.project/reports/
.project/pitches/_archive/
_archive/
.opencode/node_modules/
`;
export const GITIGNORE_BLOCK = `# Graphify: commit graph.json and GRAPH_REPORT.md; the cache, manifest, HTML and snapshots are machine-local.
graphify-out/*
!graphify-out/graph.json
!graphify-out/GRAPH_REPORT.md
`;
const OWN_COMMANDS = new Set(["update", "check", "setup"]);

interface GraphifyLink { source: string; target: string; relation?: string; workflow_overlay?: boolean; [key: string]: unknown }
interface GraphifyNode { id: string; source_file?: string; workflow_overlay?: boolean; workflow_stub?: boolean; [key: string]: unknown }
interface GraphifyGraph { nodes: GraphifyNode[]; links: GraphifyLink[]; graph?: Record<string, unknown>; [key: string]: unknown }

/** The command used to run Graphify: GRAPHIFY_BIN if set, else the pinned package through uv. */
export function graphifyCommand(deps: RuntimeDeps): { command: string; prefix: string[] } | null {
  const override = deps.proc.env.GRAPHIFY_BIN;
  if (override) return { command: override, prefix: [] };
  const probe = deps.child.runSync("uv", ["--version"], { timeoutMs: 15000 });
  if (probe.status !== 0) return null;
  return { command: "uv", prefix: ["tool", "run", "--from", `graphifyy==${GRAPHIFY_VERSION}`, "graphify"] };
}

/** Overlays the knowledge entries on a Graphify graph, replacing any previous overlay. Pure. */
export function overlayKnowledge(base: GraphifyGraph, graph: Graph): GraphifyGraph {
  const nodes = base.nodes.filter((node) => !node.workflow_overlay);
  const links = base.links.filter((link) => !link.workflow_overlay);
  const byFile = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.source_file) (byFile.get(node.source_file) ?? byFile.set(node.source_file, []).get(node.source_file)!).push(node.id);
  }
  const taken = new Set(nodes.map((node) => node.id));
  const idOf = (entryId: string): string => (taken.has(entryId) ? `knowledge:${entryId}` : entryId);
  const idMap = new Map<string, string>();
  for (const entry of graph.nodes) idMap.set(entry.id, idOf(entry.id));

  for (const entry of graph.nodes) {
    const sourceFile = entry.file.replace(/^\.project\//, "");
    nodes.push({
      id: idMap.get(entry.id)!,
      label: entry.title,
      file_type: "document",
      node_kind: "knowledge",
      entry_id: entry.id,
      entry_type: entry.type,
      tags: entry.tags,
      created: entry.created,
      updated: entry.updated,
      confidence: entry.confidence,
      severity: entry.severity,
      resolved: entry.resolved,
      source: entry.source,
      source_file: entry.file,
      workflow_overlay: true,
    });
    // Tie the entry to the heading nodes Graphify already extracted from the same markdown file.
    for (const headingId of byFile.get(entry.file) ?? byFile.get(sourceFile) ?? []) {
      links.push({ source: idMap.get(entry.id)!, target: headingId, relation: "contains", confidence: "EXTRACTED", confidence_score: 1, source_file: entry.file, workflow_overlay: true });
    }
  }
  for (const edge of graph.edges) {
    links.push({ source: idMap.get(edge.from)!, target: idMap.get(edge.to)!, relation: edge.relation ?? "related", confidence: "EXTRACTED", confidence_score: 1, source_file: graph.nodes.find((node) => node.id === edge.from)?.file, workflow_overlay: true });
  }
  // Graphify extracts document structure only in its semantic pass, so a markdown link (for example from the generated
  // index) to an entry added since then points at a page node that does not exist. Drop such edges.
  const known = new Set(nodes.map((node) => node.id));
  const connected = links.filter((link) => known.has(link.source) && known.has(link.target));
  return { ...base, nodes, links: connected, graph: { ...(base.graph ?? {}), workflow: { generated: graph.generated, stats: graph.stats, tagIndex: graph.tagIndex } } };
}

/** Edge kinds the workflow overlay adds. `references` shares a name with a native Graphify relation; the overlay flag tells them apart. */
export const WORKFLOW_RELATIONS = new Set<string>(["mirrors", "phase-doc", "dispatches", "reads", "writes", "references", "outcome-link"]);
export type WorkflowRelation = RelationKind | "references" | "outcome-link";
export interface WorkflowEdge { from: string; to: string; relation: WorkflowRelation }
export interface WorkflowResult { edges: WorkflowEdge[]; problems: Problem[]; counts: Record<string, number>; hubs: { target: string; sources: number }[] }

/** Doc folders whose prose is scanned for path references, besides the canonical skills, agents, rules and phase docs. */
const REFERENCE_DOC_DIRS = ["ai-framework/workflow", "ai-framework/integrations"];

/**
 * Validates the relations manifests and derives the workflow edges (declared + mirrors + path references).
 * Null when the project has no workflow layout at all (nothing to relate). Writes nothing.
 */
export function workflowEdges(root: string, deps: RuntimeDeps): WorkflowResult | null {
  const { fs, path } = deps;
  const hasManifest = fs.existsSync(path.join(root, MANIFEST_FILE));
  const hasWorkflow = hasManifest || fs.existsSync(path.join(root, ".claude", "skills")) || fs.existsSync(path.join(root, "ai-framework", "workflow", "phases"));
  const outcomes = deriveOutcomeRefs(root, deps);
  if (!hasWorkflow && !outcomes.edges.length && !outcomes.errors.length) return null;
  const relations = hasWorkflow ? checkRelations(root, deps) : { problems: [], edges: [] };
  const problems: Problem[] = relations.problems.map((problem) => ({
    level: problem.code === problemCodes.absent ? "warn" : "error",
    file: problem.path ?? MANIFEST_FILE,
    message: problem.text,
  }));
  const edges: WorkflowEdge[] = relations.edges.map((edge: RelationEdge) => ({ from: edge.from, to: edge.to, relation: edge.relation }));
  let hubs: { target: string; sources: number }[] = [];
  if (hasWorkflow && relations.problems.length === 0) {
    const sources = new Set(canonicalFiles(root, deps));
    for (const dir of REFERENCE_DOC_DIRS) {
      if (!fs.existsSync(path.join(root, dir))) continue;
      for (const name of fs.readdirSync(path.join(root, dir))) if (name.endsWith(".md")) sources.add(`${dir}/${name}`);
    }
    const refs = deriveRefs({ root, sources: [...sources].sort(), deps, canonicalOf });
    for (const message of refs.errors) problems.push({ level: "error", file: "references", message });
    const declared = new Set(edges.map((edge) => `${edge.from}\n${edge.to}`));
    const kept = dropHubTargets(refs.edges);
    hubs = kept.hubs;
    for (const ref of kept.edges) if (!declared.has(`${ref.from}\n${ref.to}`)) edges.push({ from: ref.from, to: ref.to, relation: "references" });
  }
  for (const message of outcomes.errors) problems.push({ level: "error", file: ".project/records/shipped", message });
  for (const edge of outcomes.edges) edges.push({ ...edge, relation: "outcome-link" });
  const counts: Record<string, number> = {};
  for (const edge of edges) counts[edge.relation] = (counts[edge.relation] ?? 0) + 1;
  return { edges, problems, counts, hubs };
}

/**
 * Overlays the workflow edges on a graph, replacing any previous workflow edges and stub nodes. Pure.
 * Graphify skips some files outright (any folder named `build/`, so the build phase skill has no node; `.toml` adapters).
 * A file named by a declared or mirror relation that has no node gets a stub file node, marked `workflow_stub`, so the
 * edge has somewhere to land; those paths are returned. A prose `references` mention of an unindexed file is just dropped.
 */
export function overlayWorkflow(base: GraphifyGraph, edges: WorkflowEdge[]): { graph: GraphifyGraph; stubbed: string[] } {
  const links = base.links.filter((link) => !(link.workflow_overlay && WORKFLOW_RELATIONS.has(String(link.relation))));
  const nodes = base.nodes.filter((node) => !node.workflow_stub);
  // Graphify names a file's own node after its path: `.claude/skills/ship/SKILL.md` -> `claude_skills_ship_skill`.
  const fileId = (file: string): string => file.replace(/\.[^./]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const fileNode = new Map<string, string>();
  for (const node of nodes) {
    if (node.source_file && !node.workflow_overlay && (node.id === fileId(node.source_file) || node.label === node.source_file)) fileNode.set(node.source_file, node.id);
  }
  // `explain <slug>` selects a record's H1; attach its owning links there, falling back to the page node.
  const outcomeHeading = new Map<string, string>();
  for (const node of nodes) if (node.node_kind === "heading" && node.source_file && node.label === node.source_file.split("/").at(-1)?.replace(/\.md$/, "")) outcomeHeading.set(node.source_file, node.id);
  const taken = new Set(nodes.map((node) => node.id));
  const stubbed = new Set<string>();
  const place = (file: string): string => {
    const known = fileNode.get(file);
    if (known) return known;
    let id = fileId(file);
    if (taken.has(id)) id = `workflow:${id}`;
    taken.add(id);
    nodes.push({ id, label: file, file_type: "document", node_kind: "page", source_file: file, source_location: "L1", workflow_overlay: true, workflow_stub: true });
    fileNode.set(file, id);
    stubbed.add(file);
    return id;
  };
  for (const edge of edges) {
    if (edge.relation === "references" && !(fileNode.has(edge.from) && fileNode.has(edge.to))) continue;
    links.push({ source: edge.relation === "outcome-link" ? outcomeHeading.get(edge.from) ?? place(edge.from) : place(edge.from), target: place(edge.to), relation: edge.relation, confidence: "EXTRACTED", confidence_score: 1, source_file: edge.from, workflow_overlay: true });
  }
  const counts: Record<string, number> = {};
  for (const link of links) if (link.workflow_overlay && WORKFLOW_RELATIONS.has(String(link.relation))) counts[String(link.relation)] = (counts[String(link.relation)] ?? 0) + 1;
  const workflow = { ...((base.graph?.workflow as Record<string, unknown> | undefined) ?? {}), edges: counts };
  return { graph: { ...base, nodes, links, graph: { ...(base.graph ?? {}), workflow } }, stubbed: [...stubbed].sort() };
}

/** True when every legacy node and edge exists in the freshly built graph, so the old file is redundant. */
export function legacyCovered(legacy: unknown, graph: Graph): boolean {
  const old = legacy as { nodes?: { id: string }[]; edges?: { from: string; to: string }[] };
  if (!Array.isArray(old?.nodes) || !Array.isArray(old?.edges)) return false;
  const ids = new Set(graph.nodes.map((node) => node.id));
  const edges = new Set(graph.edges.map((edge) => `${edge.from}\n${edge.to}`));
  return old.nodes.every((node) => ids.has(node.id)) && old.edges.every((edge) => edges.has(`${edge.from}\n${edge.to}`));
}

function report(graph: Graph, problems: Problem[], io: RuntimeDeps["io"], json: boolean, wrote: string[], note: string, workflow?: WorkflowResult): void {
  const errors = problems.filter((problem) => problem.level === "error");
  const warnings = problems.filter((problem) => problem.level === "warn");
  if (json) {
    io.stdout.write(`${JSON.stringify({ stats: graph.stats, problems, wrote: wrote.length > 0, files: wrote, ...(workflow ? { workflow: { edges: workflow.counts, hubsDropped: workflow.hubs } } : {}) }, null, 2)}\n`);
    return;
  }
  io.stdout.write(
    `Knowledge graph: ${graph.stats.total} entries ` +
      `(${graph.stats.decisions} decisions, ${graph.stats.patterns} patterns, ` +
      `${graph.stats.entities} entities, ${graph.stats.issues} issues), ${graph.stats.edges} links.\n`
  );
  for (const problem of problems) io.stdout.write(`${problem.level.toUpperCase().padEnd(5)} ${problem.file}: ${problem.message}\n`);
  if (errors.length > 0) io.stdout.write(`\nGraph status: NEEDS ATTENTION (${errors.length} error(s))\n`);
  else if (warnings.length > 0) io.stdout.write(`\nGraph status: OK WITH WARNINGS (${warnings.length})\n`);
  else io.stdout.write("\nGraph status: CLEAN\n");
  if (workflow) {
    io.stdout.write(`Workflow edges: ${Object.entries(workflow.counts).map(([kind, count]) => `${count} ${kind}`).join(", ") || "none"}\n`);
    if (workflow.hubs.length > 0) io.stdout.write(`Boilerplate references skipped (named by more than ${REF_HUB_LIMIT} files): ${workflow.hubs.map((hub) => `${hub.target} (${hub.sources})`).join(", ")}\n`);
  }
  io.stdout.write(`${note}\n`);
}

/** Creates .graphifyignore and appends the graphify block to .gitignore when missing. Never overwrites. */
export function ensureProjectFiles(root: string, deps: RuntimeDeps): string[] {
  const { fs, path } = deps;
  const done: string[] = [];
  const ignore = path.join(root, ".graphifyignore");
  if (!fs.existsSync(ignore)) { fs.writeFileSync(ignore, GRAPHIGNORE); done.push(".graphifyignore"); }
  const gitignore = path.join(root, ".gitignore");
  const current = fs.existsSync(gitignore) ? fs.readFileSync(gitignore) : "";
  if (!current.includes("graphify-out/")) {
    fs.writeFileSync(gitignore, `${current}${current === "" || current.endsWith("\n") ? "" : "\n"}${current === "" ? "" : "\n"}${GITIGNORE_BLOCK}`);
    done.push(".gitignore");
  }
  return done;
}

// ---- git hooks --------------------------------------------------------------------------------------------------

export const HOOK_START = "# ai-workflow-graphify-start";
export const HOOK_END = "# ai-workflow-graphify-end";
/** Markers of the blocks `graphify hook install` writes: they rebuild graph.json without the knowledge overlay. */
export const RAW_HOOK_START = "# graphify-hook-start";
export const RAW_HOOK_END = "# graphify-hook-end";
export const RAW_HOOK_MARKERS: ReadonlyArray<readonly [string, string]> = [
  [RAW_HOOK_START, RAW_HOOK_END],
  ["# graphify-checkout-hook-start", "# graphify-checkout-hook-end"],
];
export const HOOK_EVENTS = ["post-commit", "post-checkout"] as const;

/** True when a hook still carries one of graphify's raw rebuild blocks. */
export function hasRawHook(text: string): boolean {
  return RAW_HOOK_MARKERS.some(([start, end]) => { const from = text.indexOf(start); return from !== -1 && text.indexOf(end, from) !== -1; });
}

/** POSIX sh block that rebuilds the graph in the background through this script, so the knowledge overlay is applied. */
export function hookBlock(event: (typeof HOOK_EVENTS)[number]): string {
  const trigger = event === "post-commit"
    ? [
      "  # Only graph outputs changed: nothing to rebuild (avoids a loop when graphify-out/ is tracked).",
      "  changed=$(git diff-tree --no-commit-id --name-only -r --root HEAD 2>/dev/null)",
      "  [ -n \"$(printf '%s\\n' \"$changed\" | grep -v '^graphify-out/' | grep -v '^$')\" ] || exit 0",
    ]
    : ["  # Branch checkouts only, not file checkouts.", "  [ \"${3:-0}\" = \"1\" ] || exit 0"];
  return [
    HOOK_START,
    `# Rebuilds graphify-out/graph.json with the workflow's knowledge overlay after each ${event}.`,
    "# Installed by: node ai-framework/scripts/graphify.mts setup",
    "(",
    "  [ \"${GRAPHIFY_SKIP_HOOK:-0}\" = \"1\" ] && exit 0",
    "  git_dir=${GIT_DIR:-$(git rev-parse --git-dir 2>/dev/null)}",
    "  [ -d \"$git_dir/rebase-merge\" ] && exit 0",
    "  [ -d \"$git_dir/rebase-apply\" ] && exit 0",
    "  [ -f \"$git_dir/MERGE_HEAD\" ] && exit 0",
    "  [ -f \"$git_dir/CHERRY_PICK_HEAD\" ] && exit 0",
    ...trigger,
    "  root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0",
    "  [ -f \"$root/ai-framework/scripts/graphify.mts\" ] || exit 0",
    "  log=${GRAPHIFY_REBUILD_LOG:-$HOME/.cache/graphify-rebuild.log}",
    "  mkdir -p \"$(dirname \"$log\")\" 2>/dev/null",
    "  cd \"$root\" || exit 0",
    "  nohup node --experimental-strip-types --disable-warning=ExperimentalWarning ai-framework/scripts/graphify.mts update >>\"$log\" 2>&1 </dev/null &",
    ")",
    HOOK_END,
  ].join("\n");
}

function replaceBlock(text: string, start: string, end: string, block: string): string | undefined {
  const from = text.indexOf(start);
  if (from === -1) return undefined;
  const to = text.indexOf(end, from);
  if (to === -1) return undefined;
  return text.slice(0, from) + block + text.slice(to + end.length);
}

/** Where git reads hooks (honours core.hooksPath); undefined outside a git work tree. */
export function hooksDir(root: string, deps: RuntimeDeps): string | undefined {
  let result: ReturnType<RuntimeDeps["child"]["runSync"]>;
  try { result = deps.child.runSync("git", ["rev-parse", "--git-path", "hooks"], { cwd: root, timeoutMs: 10000 }); } catch { return undefined; }
  const dir = result.status === 0 ? result.stdout.trim() : "";
  return dir ? deps.path.resolve(root, dir) : undefined;
}

/**
 * Installs the overlay-aware rebuild block into post-commit and post-checkout. An existing workflow block is refreshed,
 * a raw `graphify hook install` block is replaced in place, and any other hook content is kept. A hook that is a
 * symlink or not a regular file is refused, never followed.
 */
export function installHooks(root: string, deps: RuntimeDeps): { installed: string[]; replacedRaw: string[] } | { error: string } {
  const { fs, path } = deps;
  const dir = hooksDir(root, deps);
  if (!dir) return { error: "not a git work tree" };
  const installed: string[] = [];
  const replacedRaw: string[] = [];
  fs.mkdirSync(dir, { recursive: true });
  for (const event of HOOK_EVENTS) {
    const file = path.join(dir, event);
    const block = hookBlock(event);
    let text: string | undefined;
    try {
      const stat = fs.lstatSync(file);
      if (stat.isSymbolicLink() || !stat.isFile()) return { error: `${event} hook is not a regular file; install the block by hand` };
      text = fs.readFileSync(file);
    } catch (error) {
      if ((error as { code?: string }).code !== "ENOENT") return { error: `${event} hook is unreadable` };
    }
    let next: string;
    if (text === undefined) next = `#!/bin/sh\n${block}\n`;
    else {
      // The first raw block becomes the workflow block (keeping its position); any other raw block is removed.
      let current = text;
      let placed = current.includes(HOOK_START);
      for (const [start, end] of RAW_HOOK_MARKERS) {
        const swapped = replaceBlock(current, start, end, placed ? "" : block);
        if (swapped === undefined) continue;
        current = swapped.replace(/\n{3,}/g, "\n\n");
        placed = true;
        if (!replacedRaw.includes(event)) replacedRaw.push(event);
      }
      next = replaceBlock(current, HOOK_START, HOOK_END, block) ?? `${current}${current.endsWith("\n") ? "" : "\n"}${block}\n`;
    }
    if (next !== text) fs.writeFileSync(file, next);
    fs.chmodSync(file, 0o755);
    installed.push(event);
  }
  return { installed, replacedRaw };
}

/** CLI entry. Returns the exit code; all output goes through deps.io. */
export function main(argv: string[], deps: RuntimeDeps): number {
  const { fs, path, io, child } = deps;
  const root = deps.proc.cwd();
  const json = argv.includes("--json");
  const first = argv.find((arg) => !arg.startsWith("-"));
  const command = argv.includes("--check") ? "check" : first ?? "update";

  if (!OWN_COMMANDS.has(command)) {
    const tool = graphifyCommand(deps);
    if (!tool) { io.stderr.write("graphify: uv is not installed (https://docs.astral.sh/uv/) — install it, or set GRAPHIFY_BIN.\n"); return 1; }
    const result = child.runSync(tool.command, [...tool.prefix, ...argv], { cwd: root, stdio: "inherit" });
    return result.status ?? 1;
  }

  const knowledgeDir = path.join(root, ".project", "knowledge");
  if (!fs.existsSync(knowledgeDir)) {
    io.stderr.write("graphify: .project/knowledge does not exist — run /setup and approve the .project scaffold first.\n");
    return 1;
  }
  const { graph, problems } = buildGraph(root, deps);
  const workflow = workflowEdges(root, deps);
  if (workflow) problems.push(...workflow.problems);
  const errors = problems.filter((problem) => problem.level === "error");

  if (command === "check") {
    report(graph, problems, io, json, [], "Dry run (check) — no files written.", workflow);
    return errors.length > 0 ? 1 : 0;
  }
  if (errors.length > 0) {
    report(graph, problems, io, json, [], "Not building: fix the error-level problems first.", workflow);
    return 1;
  }

  const tool = graphifyCommand(deps);
  if (!tool) { io.stderr.write("graphify: uv is not installed (https://docs.astral.sh/uv/) — install it, or set GRAPHIFY_BIN.\n"); return 1; }
  const provisioned = ensureProjectFiles(root, deps);
  const built = child.runSync(tool.command, [...tool.prefix, "update", root], { cwd: root, timeoutMs: 600000 });
  if (built.status !== 0) {
    io.stderr.write(`graphify: \`graphify update\` failed (exit ${built.status}).\n${(built.stderr || built.stdout).trim().split("\n").slice(-8).join("\n")}\n`);
    return 1;
  }
  const graphPath = path.join(root, GRAPH_FILE);
  let base: GraphifyGraph;
  try { base = JSON.parse(fs.readFileSync(graphPath)) as GraphifyGraph; } catch {
    io.stderr.write(`graphify: ${GRAPH_FILE} was not produced by graphify update.\n`);
    return 1;
  }
  if (!Array.isArray(base.nodes) || !Array.isArray(base.links)) { io.stderr.write(`graphify: ${GRAPH_FILE} has an unexpected shape (no nodes/links).\n`); return 1; }

  const wrote = [GRAPH_FILE];
  let overlaid = overlayKnowledge(base, graph);
  let stubbed = 0;
  if (workflow) {
    const placed = overlayWorkflow(overlaid, workflow.edges);
    overlaid = placed.graph;
    stubbed = placed.stubbed.length;
  }
  fs.writeFileSync(graphPath, `${JSON.stringify(overlaid)}\n`);
  fs.writeFileSync(path.join(knowledgeDir, "index.md"), renderIndex(graph, root, deps));
  wrote.push(".project/knowledge/index.md");

  let note = `Wrote ${wrote.join(" and ")}`;
  if (stubbed > 0) note += `; added ${stubbed} stub node(s) for files Graphify skips (build/ folders, .toml adapters)`;
  if (provisioned.length > 0) note += `; created/updated ${provisioned.join(" and ")}`;
  const legacyPath = path.join(root, LEGACY_GRAPH);
  if (fs.existsSync(legacyPath)) {
    let covered = false;
    try { covered = legacyCovered(JSON.parse(fs.readFileSync(legacyPath)), graph); } catch { covered = false; }
    if (covered) { fs.rmSync(legacyPath, { force: true }); note += `; migrated and removed legacy ${LEGACY_GRAPH}`; }
    else note += `; kept legacy ${LEGACY_GRAPH} (it has entries/links the current entries do not — review, then delete it by hand)`;
  }
  if (command === "setup") {
    const hooks = installHooks(root, deps);
    note += "error" in hooks ? `; git hooks not installed (${hooks.error})`
      : `; installed the workflow graph rebuild in ${hooks.installed.join(" and ")} hooks${hooks.replacedRaw.length ? ` (replaced the raw graphify block in ${hooks.replacedRaw.join(" and ")}, which skipped the knowledge overlay)` : ""}`;
  }
  report(graph, problems, io, json, wrote, `${note}.`, workflow);
  return 0;
}

runDirect(import.meta.url, main);
