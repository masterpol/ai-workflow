#!/usr/bin/env node
import { runDirect } from "./runtime/cli.mts";
/*
 * The generated index in `.project/done-work.md`: one line per shipped pitch that has an outcome record
 * (`.project/records/shipped/<slug>.md`, see `outcome-record.mts`). The index is the only part of the file this module
 * writes. It lives between `<!-- done-work-index:start -->` and `<!-- done-work-index:end -->` under its own
 * `## Shipped index (generated)` heading, ahead of the legacy `## <slug> — shipped <date>` entries, which are never touched
 * (a legacy entry is replaced only by `legacy-upgrade.mts`, one slug at a time, after its record exists).
 *
 * A file without the markers is only added to: the block goes in before the first `##` heading, or at the end when there is none.
 * A symlinked or irregular file, or damaged markers, is refused rather than rewritten. A record that does not pass the
 * outcome-record lint is left out of the index and reported.
 *
 * `compactedSlugs` is the one reader of "which pitches are compacted": an outcome record wins over a legacy entry, and a
 * slug is counted once however many places record it.
 *
 * Usage: `done-work-index.mts [--apply] [--json]` (a dry run prints what would change). Imports no node:* module at runtime.
 */

import type { RuntimeDeps } from "./runtime/types.mts";
import { lintOutcomeRecord, outcomeFields, OUTCOME_DIR, printable } from "./outcome-record.mts";

export const DONE_WORK_FILE = ".project/done-work.md";
export const INDEX_START = "<!-- done-work-index:start -->";
export const INDEX_END = "<!-- done-work-index:end -->";
export const INDEX_HEADING = "## Shipped index (generated)";
/** Largest done-work.md the generator will rewrite; the file is a record, not a log, and readers bound it too. */
export const MAX_DONE_WORK_BYTES = 4 * 1024 * 1024;
const SLUG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const LEGACY_ENTRY = /^## ([a-z0-9](?:[a-z0-9-]*[a-z0-9])?) — shipped (\d{4}-\d{2}-\d{2})(?![^\s])/gm;

export interface RecordMeta { slug: string; shipped: string; outcome: string }
export interface IndexScan { records: RecordMeta[]; skipped: { slug: string; problems: string[] }[] }
export type Compacted = Map<string, { shipped: string | null; source: "record" | "legacy" }>;

function plainFile(abs: string, deps: RuntimeDeps): boolean {
  try { const stat = deps.fs.lstatSync(abs); return stat.isFile() && !stat.isSymbolicLink(); } catch { return false; }
}

/** Slugs that have an outcome record file, by name only (cheap; no parsing). */
export function recordSlugs(root: string, deps: RuntimeDeps): string[] {
  const { fs, path } = deps;
  try {
    let current = root;
    for (const part of OUTCOME_DIR.split("/")) {
      current = path.join(current, part);
      if (fs.lstatSync(current).isSymbolicLink()) return [];
    }
    return fs.readdirSync(current).filter((name) => name.endsWith(".md") && !name.startsWith("_") && SLUG.test(name.slice(0, -3)) && plainFile(path.join(current, name), deps)).map((name) => name.slice(0, -3)).sort();
  } catch { return []; }
}

/** Legacy narrative entries (`## slug — shipped date`) in a done-work.md text. */
export function legacyEntries(text: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of text.matchAll(LEGACY_ENTRY)) found.set(match[1], match[2]);
  return found;
}

/** Reads the records that pass the outcome-record lint; the rest are returned with their problems. */
export function scanRecords(root: string, deps: RuntimeDeps): IndexScan {
  const records: RecordMeta[] = [];
  const skipped: IndexScan["skipped"] = [];
  for (const slug of recordSlugs(root, deps)) {
    const rel = `${OUTCOME_DIR}/${slug}.md`;
    const { problems } = lintOutcomeRecord(root, rel, deps);
    if (problems.length > 0) { skipped.push({ slug, problems }); continue; }
    const text = deps.fs.readFileSync(deps.path.join(root, rel));
    const fields = outcomeFields(text);
    records.push({ slug, shipped: fields.shipped ?? "", outcome: fields.outcome ?? "" });
  }
  return { records, skipped };
}

/** Every compacted slug with its shipped date: an outcome record wins over a legacy entry. Reads names and the record's date only. */
export function compactedSlugs(root: string, deps: RuntimeDeps, doneWorkText?: string): Compacted {
  const result: Compacted = new Map();
  for (const [slug, shipped] of legacyEntries(doneWorkText ?? readText(root, deps) ?? "")) result.set(slug, { shipped, source: "legacy" });
  for (const slug of recordSlugs(root, deps)) {
    result.set(slug, { shipped: shippedDateOf(deps.path.join(root, OUTCOME_DIR, `${slug}.md`), deps) ?? result.get(slug)?.shipped ?? null, source: "record" });
  }
  return result;
}

/** The shipped date from a record's first bytes only: a 400 MB file must not be read whole to find a line in its frontmatter. */
function shippedDateOf(abs: string, deps: RuntimeDeps): string | null {
  let fd = -1;
  try {
    fd = deps.fs.openSync(abs, "r");
    const buffer = new Uint8Array(600);
    const n = deps.fs.readSync(fd, buffer, 0, buffer.length, 0);
    return /^shipped: (\d{4}-\d{2}-\d{2})$/m.exec(new TextDecoder().decode(buffer.subarray(0, Math.max(n, 0))))?.[1] ?? null;
  } catch { return null; } finally { if (fd >= 0) { try { deps.fs.closeSync(fd); } catch { /* ignore */ } } }
}

function readText(root: string, deps: RuntimeDeps): string | null {
  const abs = deps.path.join(root, DONE_WORK_FILE);
  if (!plainFile(abs, deps)) return null;
  if (deps.fs.lstatSync(abs).size > MAX_DONE_WORK_BYTES) throw new Error(`${DONE_WORK_FILE} is larger than ${MAX_DONE_WORK_BYTES} bytes`);
  return deps.fs.readFileSync(abs);
}

/** One line, no angle brackets (a marker could be rebuilt from fragments by a single-pass replace) and no control characters. */
const cleanLine = (text: string): string => printable(text.replace(/[<>]/g, "").replace(/\s+/g, " ").trim());

/** The index block's lines for these records, newest first. */
export function renderBlock(records: RecordMeta[]): string {
  const lines = [...records].sort((a, b) => b.shipped.localeCompare(a.shipped) || a.slug.localeCompare(b.slug)).map((record) => `- [${record.slug}](records/shipped/${record.slug}.md) — shipped ${record.shipped} — ${cleanLine(record.outcome)}`);
  return [INDEX_START, ...(lines.length ? lines : ["_No outcome records yet._"]), INDEX_END].join("\n");
}

/** Pure: returns `text` with the index block replaced (markers present) or added (absent). Nothing outside the block changes. */
export function applyIndex(text: string, records: RecordMeta[]): string {
  const block = renderBlock(records);
  const starts = text.split(INDEX_START).length - 1;
  const ends = text.split(INDEX_END).length - 1;
  if (starts !== ends || starts > 1) throw new Error(`${DONE_WORK_FILE} has damaged index markers (${starts} start, ${ends} end); fix or remove them by hand`);
  if (starts === 1) {
    const from = text.indexOf(INDEX_START);
    const to = text.indexOf(INDEX_END);
    if (to < from) throw new Error(`${DONE_WORK_FILE} has its index markers in the wrong order`);
    return `${text.slice(0, from)}${block}${text.slice(to + INDEX_END.length)}`;
  }
  const section = `${INDEX_HEADING}\n\n${block}\n`;
  const heading = /^## /m.exec(text);
  if (!heading) return `${text.trimEnd()}\n\n${section}`;
  return `${text.slice(0, heading.index)}${section}\n${text.slice(heading.index)}`;
}

export interface IndexResult { changed: boolean; content: string; scan: IndexScan }

/** Regenerates the index from the records. With `apply`, publishes through a temp file and rename. */
export function writeIndex(root: string, deps: RuntimeDeps, options: { apply?: boolean } = {}): IndexResult {
  const { fs, path } = deps;
  const abs = path.join(root, DONE_WORK_FILE);
  let parent = root;
  for (const part of DONE_WORK_FILE.split("/").slice(0, -1)) {
    parent = path.join(parent, part);
    try { if (fs.lstatSync(parent).isSymbolicLink()) throw new Error(`Refusing to write ${DONE_WORK_FILE}: ${part} is a symlink`); } catch (error) { if ((error as { code?: string }).code !== "ENOENT") throw error; }
  }
  let stat = null;
  try { stat = fs.lstatSync(abs); } catch (error) { if ((error as { code?: string }).code !== "ENOENT") throw error; }
  if (stat && (stat.isSymbolicLink() || !stat.isFile())) throw new Error(`Refusing to write ${DONE_WORK_FILE}: it is a symlink or not a regular file`);
  const existing = readText(root, deps);
  const scan = scanRecords(root, deps);
  const content = applyIndex(existing ?? "# Done Work\n", scan.records);
  const changed = content !== existing;
  if (options.apply && changed) {
    const temporary = `${abs}.tmp-${deps.proc.pid}-${deps.clock.now()}`;
    try { fs.writeFileSync(temporary, content, { flag: "wx" }); fs.renameSync(temporary, abs); } finally { fs.rmSync(temporary, { force: true }); }
  }
  return { changed, content, scan };
}

export function main(argv: string[], deps: RuntimeDeps): number {
  const apply = argv.includes("--apply");
  try {
    const result = writeIndex(deps.proc.cwd(), deps, { apply });
    if (argv.includes("--json")) deps.io.stdout.write(`${JSON.stringify({ changed: result.changed, applied: apply && result.changed, indexed: result.scan.records.length, skipped: result.scan.skipped })}\n`);
    else {
      deps.io.stdout.write(`done-work index: ${result.scan.records.length} record(s) indexed, ${result.scan.skipped.length} skipped, ${result.changed ? (apply ? "written" : "would change (dry run; pass --apply)") : "unchanged"}\n`);
      for (const skipped of result.scan.skipped) deps.io.stderr.write(`skipped ${skipped.slug}: ${printable(skipped.problems[0] ?? "")}\n`);
    }
    return 0;
  } catch (error) {
    // A system error carries an absolute path in its text; keep only its code. This module's own messages are fixed text.
    const code = error !== null && typeof error === "object" ? (error as { code?: unknown; syscall?: unknown }) : {};
    const detail = typeof code.syscall === "string" && typeof code.code === "string" ? `file system error (${code.code.replace(/[^A-Z0-9_]/g, "")})` : printable(error instanceof Error ? error.message : String(error));
    deps.io.stderr.write(`done-work-index: ${detail}\n`);
    return 1;
  }
}

runDirect(import.meta.url, main);
