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
