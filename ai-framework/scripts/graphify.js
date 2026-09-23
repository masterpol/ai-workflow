#!/usr/bin/env node
/*
 * Builds and validates the project's knowledge graph from .project/knowledge/.
 *
 * Reads every entry under decisions/, patterns/, entities/, issues/ (frontmatter id/type/
 * tags/related, plus [[wiki-links]] in the body), and regenerates two derived artifacts:
 *   - .project/knowledge/graph.json  — machine-readable: nodes, edges, tagIndex, stats.
 *     Any phase or skill that needs to find related knowledge should load this file and
 *     traverse it, instead of re-scanning every markdown file under knowledge/.
 *   - .project/knowledge/index.md    — human-readable catalog + Mermaid graph, regenerated
 *     from the same data (matches the format documented in knowledge/README.md).
 *
 * Both are derived/auto-generated — never hand-edit them, re-run this script instead.
 * Zero dependencies (fs/path only), so it runs the same under any harness or OS.
 *
 * Flags:
 *   --check  dry run: report only, write nothing, exit 1 if any error-level problem exists
 *   --json   machine-readable report on stdout instead of the human-readable one
 *
 * Exit codes: 0 = clean (or warnings only), 1 = error-level problem (duplicate id) found.
 */

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const json = process.argv.includes("--json");

const knowledgeDir = path.join(root, ".project", "knowledge");
const typeDirs = ["decisions", "patterns", "entities", "issues"];

if (!fs.existsSync(knowledgeDir)) {
  process.stderr.write(
    "graphify: .project/knowledge does not exist — run /setup and approve the .project scaffold first.\n"
  );
  process.exit(1);
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const [, block, body] = match;
  const data = {};
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

function extractTitle(body) {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractWikiLinks(body) {
  const links = new Set();
  const re = /\[\[([a-z0-9-]+)\]\]/g;
  let m;
  while ((m = re.exec(body))) links.add(m[1]);
  return [...links];
}

const nodes = [];
const problems = [];
const seenIds = new Map();

for (const typeDir of typeDirs) {
  const dir = path.join(knowledgeDir, typeDir);
  if (!fs.existsSync(dir)) continue;
  const singular = typeDir.replace(/s$/, "");

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const file = path.join(dir, entry.name);
    const relFile = path.relative(root, file);
    const raw = fs.readFileSync(file, "utf8");
    const { data, body } = parseFrontmatter(raw);
    const fallbackId = entry.name.replace(/\.md$/, "");
    const hasRealId = data.id && data.id !== "<kebab-case-identifier>";
    const id = hasRealId ? data.id : fallbackId;

    if (!hasRealId) {
      problems.push({
        level: "warn",
        file: relFile,
        message: `missing frontmatter id — using filename "${id}"`,
      });
    }
    if (seenIds.has(id)) {
      problems.push({
        level: "error",
        file: relFile,
        message: `duplicate id "${id}" also used by ${seenIds.get(id)}`,
      });
    } else {
      seenIds.set(id, relFile);
    }

    const declaredType = data.type || singular;
    if (declaredType !== singular) {
      problems.push({
        level: "warn",
        file: relFile,
        message: `frontmatter type "${declaredType}" doesn't match its folder "${typeDir}"`,
      });
    }

    const related = new Set([
      ...(Array.isArray(data.related) ? data.related : []),
      ...extractWikiLinks(body),
    ]);

    nodes.push({
      id,
      type: singular,
      title: extractTitle(body) || id,
      tags: Array.isArray(data.tags) ? data.tags : [],
      created: data.created || null,
      updated: data.updated || null,
      confidence: data.confidence || null,
      severity: data.severity || null,
      resolved: data.resolved || null,
      source: data.source || null,
      related: [...related],
      file: relFile,
    });
  }
}

const idSet = new Set(nodes.map((node) => node.id));
const edges = [];

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

const tagIndex = {};
for (const node of nodes) {
  for (const tag of node.tags) {
    (tagIndex[tag] ||= []).push(node.id);
  }
}
for (const tag of Object.keys(tagIndex)) tagIndex[tag].sort();

const graph = {
  generated: new Date().toISOString().slice(0, 10),
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

function renderIndex(data) {
  const byType = { decision: [], pattern: [], entity: [], issue: [] };
  for (const node of data.nodes) byType[node.type]?.push(node);
  const heading = { decision: "Decisions", pattern: "Patterns", entity: "Entities", issue: "Issues" };

  const lines = [];
  lines.push("# Knowledge Index");
  lines.push("");
  lines.push(
    `Last updated: ${data.generated} — generated by \`node ai-framework/scripts/graphify.js\`. Do not hand-edit; re-run the script instead.`
  );
  lines.push("");

  for (const [type, label] of Object.entries(heading)) {
    const list = byType[type];
    lines.push(`## ${label} (${list.length} entries)`);
    if (list.length === 0) {
      lines.push("_none yet_");
    } else {
      for (const node of list) {
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
    "Machine-readable graph: `.project/knowledge/graph.json` — `nodes[]` (id, type, title, tags, " +
      "related, file), `edges[]` (`{from, to}` by id), and `tagIndex` (tag → node ids). Any phase " +
      "or skill looking for prior knowledge should load `graph.json` and traverse it — filter by " +
      "`type`, follow `related`/`edges`, or look up a `tag` — instead of re-scanning every markdown " +
      "file under `knowledge/`. Rebuild after adding or editing an entry:"
  );
  lines.push("");
  lines.push("```");
  lines.push("node ai-framework/scripts/graphify.js");
  lines.push("```");
  lines.push("");
  return lines.join("\n");
}

const graphPath = path.join(knowledgeDir, "graph.json");
const indexPath = path.join(knowledgeDir, "index.md");

if (!checkOnly) {
  fs.writeFileSync(graphPath, `${JSON.stringify(graph, null, 2)}\n`);
  fs.writeFileSync(indexPath, renderIndex(graph));
}

const errors = problems.filter((problem) => problem.level === "error");
const warnings = problems.filter((problem) => problem.level === "warn");

if (json) {
  process.stdout.write(
    `${JSON.stringify({ stats: graph.stats, problems, wrote: !checkOnly }, null, 2)}\n`
  );
} else {
  process.stdout.write(
    `Knowledge graph: ${graph.stats.total} entries ` +
      `(${graph.stats.decisions} decisions, ${graph.stats.patterns} patterns, ` +
      `${graph.stats.entities} entities, ${graph.stats.issues} issues), ${graph.stats.edges} links.\n`
  );
  for (const problem of problems) {
    process.stdout.write(`${problem.level.toUpperCase().padEnd(5)} ${problem.file}: ${problem.message}\n`);
  }
  if (errors.length > 0) {
    process.stdout.write(`\nGraph status: NEEDS ATTENTION (${errors.length} error(s))\n`);
  } else if (warnings.length > 0) {
    process.stdout.write(`\nGraph status: OK WITH WARNINGS (${warnings.length})\n`);
  } else {
    process.stdout.write("\nGraph status: CLEAN\n");
  }
  process.stdout.write(
    checkOnly
      ? "Dry run (--check) — no files written.\n"
      : "Wrote .project/knowledge/graph.json and .project/knowledge/index.md\n"
  );
  process.stdout.write("Use --json for machine-readable output.\n");
}

process.exit(errors.length > 0 ? 1 : 0);
