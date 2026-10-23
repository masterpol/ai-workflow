# Measurement scripts: connected-memory-consolidation

> Moved from `.project/pitches/connected-memory-consolidation/` on 2026-10-23 when the pitch folder was compacted. The content is unchanged; only link targets were rewritten. The original bytes are in the compaction recovery archive.


## baseline.mts

````ts
#!/usr/bin/env node
// Prints the measured baselines the pitch's acceptance scenarios compare against (read-only, no writes).
// Run: node ai-framework/scripts/../../.project/pitches/connected-memory-consolidation/baseline.mts  (from the repo root)
import { readFileSync, readdirSync, existsSync } from "node:fs";

const read = (file: string): string => readFileSync(file, "utf8");
const DONE_WORK = ".project/done-work.md";
const LEDGERS = ".project/compaction/ledgers";

const ledgers = readdirSync(LEDGERS).filter((name) => name.endsWith(".json") && !name.endsWith(".v1.json")).map((name) => JSON.parse(read(`${LEDGERS}/${name}`)) as { schemaVersion: number; sections: { source: string; destination?: string | null }[] });
const pointsAtDoneWork = (section: { destination?: string | null }): boolean => (section.destination ?? "").split("#")[0] === DONE_WORK;
const withPointer = ledgers.filter((ledger) => ledger.sections.some(pointsAtDoneWork));

const doneWork = read(DONE_WORK);
const entries = doneWork.split(/^## /m).slice(1).filter((entry) => /^[a-z0-9][a-z0-9-]* — shipped \d{4}-\d{2}-\d{2}(?:\n|$)/.test(entry)).map((entry) => Buffer.byteLength(entry)).sort((a, b) => a - b);
const indexRows = [...doneWork.matchAll(/^- \[[a-z0-9][a-z0-9-]*\]\(records\/shipped\//gm)].length;

const out: Record<string, unknown> = {
  ledgers: ledgers.length,
  ledgerSchemaVersions: [...new Set(ledgers.map((ledger) => ledger.schemaVersion))],
  ledgersPointingAtDoneWork: withPointer.length,
  sectionsPointingAtDoneWork: ledgers.reduce((sum, ledger) => sum + ledger.sections.filter(pointsAtDoneWork).length, 0),
  ledgersAllSectionsAtDoneWork: ledgers.filter((ledger) => ledger.sections.every(pointsAtDoneWork)).length,
  doneWork: { entries: entries.length, indexRows, bytes: Buffer.byteLength(doneWork), medianEntryBytes: entries[entries.length >> 1] ?? null, maxEntryBytes: entries.at(-1) ?? null },
  decisionEntries: readdirSync(".project/knowledge/decisions").filter((name) => name.endsWith(".md")).length,
};

if (existsSync("graphify-out/graph.json")) {
  const graph = JSON.parse(read("graphify-out/graph.json")) as { nodes: { id: string; source_file?: string }[]; links: { source: string; target: string; relation?: string }[] };
  const fileOf = new Map(graph.nodes.map((node) => [node.id, node.source_file ?? ""]));
  const canonical = (file: string): boolean => /^(\.claude\/skills\/[^/]+\/SKILL\.md|\.claude\/agents\/[^/]+\.md|ai-framework\/rules\/[^/]+\.md|ai-framework\/workflow\/phases\/[^/]+\.md)$/.test(file);
  const outbound = new Map<string, number>();
  for (const link of graph.links) {
    const from = fileOf.get(link.source) ?? "";
    const to = fileOf.get(link.target) ?? "";
    if (canonical(from) && to && to !== from) outbound.set(from, (outbound.get(from) ?? 0) + 1);
  }
  const files = new Set(graph.nodes.map((node) => node.source_file ?? "").filter(canonical));
  const linked = new Set<string>();
  for (const link of graph.links) { linked.add(link.source); linked.add(link.target); }
  out.graph = {
    nodes: graph.nodes.length,
    links: graph.links.length,
    canonicalFiles: files.size,
    canonicalFilesWithOutboundCrossFileEdge: [...files].filter((file) => outbound.has(file)).length,
    isolatedAdapterNodes: graph.nodes.filter((node) => /^\.opencode\/(agents|commands)\//.test(node.source_file ?? "") && !linked.has(node.id)).length,
    builtAtCommit: (graph as unknown as { built_at_commit?: string }).built_at_commit,
  };
}

process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
````

## precision.mts

````ts
/*
 * Query-precision check for the workflow edge types (P1-S4). Runs a fixed question list through
 * `graphify query` on the current graph ("after") and on a copy with every workflow edge and stub node removed
 * ("before"), and reports for each question whether the expected file is among the returned nodes.
 * Usage: node .project/pitches/connected-memory-consolidation/precision.mts [scratch-dir]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const RELATIONS = new Set(["mirrors", "phase-doc", "dispatches", "reads", "writes", "references"]);
// Free-text `graphify query` matches labels lexically (it started "ship skill phase document" from the .agents mirror's
// heading and cut 32 of 89 nodes), so it cannot show whether an edge type works. `explain <file>` lists a node's
// neighbours with their relation, which is exactly what a phase reads before it starts.
const QUESTIONS: { edge: string; node: string; relation: string; expect: string }[] = [
  { edge: "mirrors", node: ".claude/agents/skeptic.md", relation: "mirrors", expect: ".opencode/agents/skeptic.md" },
  { edge: "mirrors", node: ".claude/agents/appetite-auditor.md", relation: "mirrors", expect: ".codex/agents/appetite-auditor.toml" },
  { edge: "mirrors", node: ".claude/skills/build/SKILL.md", relation: "mirrors", expect: ".cursor/skills/build/SKILL.md" },
  { edge: "phase-doc", node: ".claude/skills/ship/SKILL.md", relation: "phase-doc", expect: "4-ship.md" },
  { edge: "phase-doc", node: ".claude/skills/cooldown/SKILL.md", relation: "phase-doc", expect: "5-cooldown.md" },
  { edge: "dispatches", node: ".claude/skills/audit/SKILL.md", relation: "dispatches", expect: "code-reviewer.md" },
  { edge: "dispatches", node: ".claude/skills/audit/SKILL.md", relation: "dispatches", expect: "cross-pitch-conflict-checker.md" },
  { edge: "dispatches", node: ".claude/skills/critique/SKILL.md", relation: "dispatches", expect: "skeptic.md" },
  { edge: "reads", node: ".claude/agents/security-reviewer.md", relation: "reads", expect: "security.md" },
  { edge: "reads", node: ".claude/agents/code-reviewer.md", relation: "reads", expect: "performance.md" },
  { edge: "references", node: ".claude/skills/pitch-compress/SKILL.md", relation: "references", expect: "pitch-archive.mts" },
  { edge: "references", node: ".claude/skills/state/SKILL.md", relation: "references", expect: "status.md" },
];

const scratch = process.argv[2] ?? "/tmp";
mkdirSync(scratch, { recursive: true });
const after = JSON.parse(readFileSync("graphify-out/graph.json", "utf8")) as { nodes: Record<string, unknown>[]; links: Record<string, unknown>[] };
const before = {
  ...after,
  nodes: after.nodes.filter((node) => !node.workflow_stub),
  links: after.links.filter((link) => !(link.workflow_overlay && RELATIONS.has(String(link.relation)))),
};
const beforeFile = `${scratch}/graph-before.json`;
writeFileSync(beforeFile, JSON.stringify(before));
const counts = (graph: typeof after) => ({ nodes: graph.nodes.length, links: graph.links.length, workflow: graph.links.filter((link) => link.workflow_overlay && RELATIONS.has(String(link.relation))).length });
console.log("before", JSON.stringify(counts(before)), "after", JSON.stringify(counts(after)));

function explain(node: string, graph: string): string {
  return spawnSync("node", ["ai-framework/scripts/graphify.mts", "explain", node, "--graph", graph], { encoding: "utf8" }).stdout;
}
const hit = (text: string, item: (typeof QUESTIONS)[number]): boolean => text.split("\n").some((line) => line.includes(`[${item.relation}]`) && line.includes(item.expect));
const tally: Record<string, { before: number; after: number; total: number }> = {};
for (const item of QUESTIONS) {
  const hitBefore = hit(explain(item.node, beforeFile), item);
  const hitAfter = hit(explain(item.node, "graphify-out/graph.json"), item);
  const row = (tally[item.edge] ??= { before: 0, after: 0, total: 0 });
  row.total += 1;
  row.before += hitBefore ? 1 : 0;
  row.after += hitAfter ? 1 : 0;
  console.log(`${item.edge.padEnd(10)} before=${hitBefore ? "hit " : "miss"} after=${hitAfter ? "hit " : "miss"}  explain ${item.node}  ->  [${item.relation}] ${item.expect}`);
}
console.log(JSON.stringify(tally));

// Flood check (critique S1): how concentrated are the derived edges?
const byId = new Map(after.nodes.map((node) => [String(node.id), node]));
for (const relation of ["references", "reads", "dispatches"]) {
  const edges = after.links.filter((link) => link.workflow_overlay && link.relation === relation);
  const inDegree = new Map<string, number>();
  for (const edge of edges) inDegree.set(String(edge.target), (inDegree.get(String(edge.target)) ?? 0) + 1);
  const top = [...inDegree].sort((left, right) => right[1] - left[1]).slice(0, 3).map(([id, n]) => `${byId.get(id)?.source_file}=${n}`);
  console.log(`${relation}: ${edges.length} edges, busiest targets ${top.join(", ")}`);
}
````
