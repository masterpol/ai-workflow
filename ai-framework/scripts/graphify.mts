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
 *   setup       update + `graphify hook install` (rebuild the graph after every commit/checkout)
 *   anything else (query, path, explain, god-nodes, affected, export, ...) is passed through to graphify
 *
 * Flags: --check (alias of `check`), --json (machine-readable report). `check` exits 1 on an error-level problem.
 * Graphify is resolved as `uv tool run --from graphifyy==<pinned> graphify`; GRAPHIFY_BIN overrides it with a
 * local executable. Imports no node:* module at runtime: every fs/path/process effect goes through RuntimeDeps.
 */

import type { RuntimeDeps } from "./runtime/types.mts";

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
}

export interface GraphEdge {
  from: string;
  to: string;
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
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
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
    const singular = typeDir.replace(/s$/, "");

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

      nodes.push({
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
    lines.push(`## ${label} (${entries.length} entries)`);
    if (entries.length === 0) {
      lines.push("_none yet_");
    } else {
      for (const node of entries) {
        const relPath = path.relative(knowledgeDir, path.join(root, node.file));
        lines.push(`- [${node.id}](${relPath}) — ${node.title}`);
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
    for (const edge of data.edges) lines.push(`  ${edge.from} --> ${edge.to}`);
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
interface GraphifyNode { id: string; source_file?: string; workflow_overlay?: boolean; [key: string]: unknown }
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
    links.push({ source: idMap.get(edge.from)!, target: idMap.get(edge.to)!, relation: "related", confidence: "EXTRACTED", confidence_score: 1, source_file: graph.nodes.find((node) => node.id === edge.from)?.file, workflow_overlay: true });
  }
  return { ...base, nodes, links, graph: { ...(base.graph ?? {}), workflow: { generated: graph.generated, stats: graph.stats, tagIndex: graph.tagIndex } } };
}

/** True when every legacy node and edge exists in the freshly built graph, so the old file is redundant. */
export function legacyCovered(legacy: unknown, graph: Graph): boolean {
  const old = legacy as { nodes?: { id: string }[]; edges?: { from: string; to: string }[] };
  if (!Array.isArray(old?.nodes) || !Array.isArray(old?.edges)) return false;
  const ids = new Set(graph.nodes.map((node) => node.id));
  const edges = new Set(graph.edges.map((edge) => `${edge.from}\n${edge.to}`));
  return old.nodes.every((node) => ids.has(node.id)) && old.edges.every((edge) => edges.has(`${edge.from}\n${edge.to}`));
}

function report(graph: Graph, problems: Problem[], io: RuntimeDeps["io"], json: boolean, wrote: string[], note: string): void {
  const errors = problems.filter((problem) => problem.level === "error");
  const warnings = problems.filter((problem) => problem.level === "warn");
  if (json) {
    io.stdout.write(`${JSON.stringify({ stats: graph.stats, problems, wrote: wrote.length > 0, files: wrote }, null, 2)}\n`);
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
  const errors = problems.filter((problem) => problem.level === "error");

  if (command === "check") {
    report(graph, problems, io, json, [], "Dry run (check) — no files written.");
    return errors.length > 0 ? 1 : 0;
  }
  if (errors.length > 0) {
    report(graph, problems, io, json, [], "Not building: fix the error-level problems first.");
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
  fs.writeFileSync(graphPath, `${JSON.stringify(overlayKnowledge(base, graph))}\n`);
  fs.writeFileSync(path.join(knowledgeDir, "index.md"), renderIndex(graph, root, deps));
  wrote.push(".project/knowledge/index.md");

  let note = `Wrote ${wrote.join(" and ")}`;
  if (provisioned.length > 0) note += `; created/updated ${provisioned.join(" and ")}`;
  const legacyPath = path.join(root, LEGACY_GRAPH);
  if (fs.existsSync(legacyPath)) {
    let covered = false;
    try { covered = legacyCovered(JSON.parse(fs.readFileSync(legacyPath)), graph); } catch { covered = false; }
    if (covered) { fs.rmSync(legacyPath, { force: true }); note += `; migrated and removed legacy ${LEGACY_GRAPH}`; }
    else note += `; kept legacy ${LEGACY_GRAPH} (it has entries/links the current entries do not — review, then delete it by hand)`;
  }
  if (command === "setup") {
    const hook = child.runSync(tool.command, [...tool.prefix, "hook", "install"], { cwd: root });
    note += hook.status === 0 ? "; installed graphify git hooks (rebuild on commit/checkout)" : `; graphify hook install failed (exit ${hook.status})`;
  }
  report(graph, problems, io, json, wrote, `${note}.`);
  return 0;
}

runDirect(import.meta.url, main);
