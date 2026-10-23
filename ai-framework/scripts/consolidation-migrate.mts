#!/usr/bin/env node
/** Project-side scaffold migration. Dry by default; legacy content and local edits are never upgraded here. */
import { runDirect } from "./runtime/cli.mts";
import { applyIndex, DONE_WORK_FILE, INDEX_START, INDEX_END, INDEX_HEADING, MAX_DONE_WORK_BYTES, legacyEntries, renderBlock } from "./done-work-index.mts";
import { MAX_LEDGER_BYTES, validateLedgerShape } from "./ledger-schema.mts";
import { printable } from "./outcome-record.mts";
import { requireNoPendingCompaction } from "./pitch-compress.mts";
import type { RuntimeDeps, StatLike } from "./runtime/types.mts";

export const MAX_TEMPLATE_BYTES = 64 * 1024;
export const MAX_MIGRATION_FILES = 2048;
// SHA-256 of the templates shipped at b26b45b. Only these known bundle copies may be refreshed.
export const PREVIOUS_TEMPLATE_HASHES: Record<string, readonly string[]> = {
  "knowledge/README.md": ["a2a5dadfc26a41bdeecb86267dfaf967a8278d7d1e4fcacd19808274e8fea440"],
  "knowledge/templates/decision.md": ["b0822d25a5d45badc448748bda51d49038593e317f4c96a363c97609c7c0aa22"],
};
export interface MigrationStep {
  path: string;
  status: "create" | "refresh" | "unchanged" | "local" | "report";
  detail: string;
  diff?: string;
}
export interface MigrationResult { applied: boolean; steps: MigrationStep[]; legacy: { ledgers: number; entries: number; decisions: number } }
export const CONSOLIDATION_COMMAND = "node ai-framework/scripts/consolidation-migrate.mts";
interface Change { path: string; before: string | null; after: string | null }

const errorCode = (error: unknown): string | undefined => error !== null && typeof error === "object" ? (error as { code?: string }).code : undefined;

/** Checks every ancestor, including the leaf; absence and refusal stay distinct. */
function inspect(root: string, relative: string, deps: RuntimeDeps): StatLike | null {
  if (!relative || relative.includes("\\") || /[\u0000-\u001f:]/.test(relative) || relative.split("/").some(part => !part || part === "." || part === "..")) throw new Error("Refusing unsafe project-relative path");
  if (/(^|\/)(?:\.env(?:\.|$)|settings\.local\.json$|credentials\.json$)/i.test(relative)) throw new Error("Refusing secret file path");
  let current = root;
  const parts = relative.split("/");
  for (let i = 0; i < parts.length; i++) {
    current = deps.path.join(current, parts[i]);
    let stat: StatLike;
    try { stat = deps.fs.lstatSync(current); }
    catch (error) { if (errorCode(error) === "ENOENT") return null; throw new Error(`Cannot inspect ${relative}`); }
    if (stat.isSymbolicLink()) throw new Error(`Refusing symlink: ${relative}`);
    if (i < parts.length - 1 && !stat.isDirectory()) throw new Error(`Not a directory: ${relative}`);
    if (i === parts.length - 1) return stat;
  }
  throw new Error("Empty migration path");
}

/** Shared path-only inspection; does not open the target file. */
export { inspect as inspectProjectPath };

/** Descriptor-pinned, capped read shared by migration and legacy preparation. */
export function readProjectBytes(root: string, relative: string, cap: number, deps: RuntimeDeps): Uint8Array | null {
  const before = inspect(root, relative, deps);
  if (!before) return null;
  if (!before.isFile() || before.nlink !== 1 || before.size > cap) throw new Error(`Not a plain bounded file: ${relative}`);
  const { fs } = deps;
  const fd = fs.openSync(deps.path.join(root, relative), fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0));
  try {
    const opened = fs.fstatSync(fd);
    if (!opened.isFile() || opened.nlink !== 1 || opened.dev !== before.dev || opened.ino !== before.ino) throw new Error(`File changed while opening: ${relative}`);
    const bytes = new Uint8Array(cap + 1);
    let size = 0;
    while (size < bytes.length) {
      const n = fs.readSync(fd, bytes, size, bytes.length - size, null);
      if (!n) break;
      size += n;
    }
    if (size > cap) throw new Error(`File grew beyond bound: ${relative}`);
    return bytes.slice(0, size);
  } finally { fs.closeSync(fd); }
}

export function readProjectText(root: string, relative: string, cap: number, deps: RuntimeDeps): string | null {
  const bytes = readProjectBytes(root, relative, cap, deps);
  return bytes === null ? null : new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
}
const read = readProjectText;

export function projectNames(root: string, relative: string, deps: RuntimeDeps): string[] {
  const stat = inspect(root, relative, deps);
  if (!stat) return [];
  if (!stat.isDirectory()) throw new Error(`Not a directory: ${relative}`);
  const entries = deps.fs.readdirSync(deps.path.join(root, relative));
  if (entries.length > MAX_MIGRATION_FILES) throw new Error(`Too many files: ${relative}`);
  return entries.sort();
}
const names = projectNames;

function ensureDirectory(root: string, relative: string, deps: RuntimeDeps): void {
  let prefix = "";
  for (const part of relative.split("/")) {
    prefix = prefix ? `${prefix}/${part}` : part;
    const stat = inspect(root, prefix, deps);
    if (!stat) deps.fs.mkdirSync(deps.path.join(root, prefix), { recursive: false });
    else if (!stat.isDirectory()) throw new Error(`Not a directory: ${prefix}`);
  }
}

function publish(root: string, change: Change, deps: RuntimeDeps): void {
  if (!change.path.startsWith(".project/")) throw new Error("Migration writes must stay under .project/");
  if (change.after === null) { ensureDirectory(root, change.path, deps); return; }
  const cap = change.path === DONE_WORK_FILE ? MAX_DONE_WORK_BYTES : MAX_TEMPLATE_BYTES;
  if (read(root, change.path, cap, deps) !== change.before) throw new Error(`Conflict since dry run: ${change.path}`);
  ensureDirectory(root, deps.path.dirname(change.path), deps);
  const file = deps.path.join(root, change.path);
  const temporary = `${file}.migration-${deps.crypto.randomUUID()}`;
  let owned = false;
  try {
    deps.fs.writeFileSync(temporary, change.after, { flag: "wx", mode: 0o644 });
    owned = true;
    if (read(root, change.path, cap, deps) !== change.before) throw new Error(`Conflict before publication: ${change.path}`);
    if (change.before === null) {
      deps.fs.linkSync(temporary, file); // Missing-only publication must never replace a concurrent creator.
    } else deps.fs.renameSync(temporary, file);
  } finally { if (owned) deps.fs.rmSync(temporary, { force: true }); }
}

/** Bounded inventory shared by migration, sync guidance and doctor. Reads only; never executes target code. */
export function legacyInventory(root: string, deps: RuntimeDeps): { legacy: MigrationResult["legacy"]; pitches: number } {
  const entries = legacyEntries(read(root, DONE_WORK_FILE, MAX_DONE_WORK_BYTES, deps) ?? "");
  const pitches = new Set(entries.keys());
  const legacy = { ledgers: 0, entries: entries.size, decisions: 0 };
  for (const name of names(root, ".project/compaction/ledgers", deps).filter(name => name.endsWith(".json"))) {
    const text = read(root, `.project/compaction/ledgers/${name}`, MAX_LEDGER_BYTES, deps);
    if (text === null) throw new Error("Ledger disappeared while scanning");
    let value: unknown;
    try { value = JSON.parse(text); } catch { throw new Error(`Invalid ledger JSON: ${printable(name)}`); }
    const slug = name.replace(/(?:\.v1)?\.json$/, "");
    const shape = validateLedgerShape(value, slug);
    if (shape.problems.length) throw new Error(`Refused ledger ${printable(name)}: ${printable(shape.problems[0])}`);
    if (shape.version === 1 && !name.endsWith(".v1.json")) { legacy.ledgers++; pitches.add(slug); }
  }
  for (const name of names(root, ".project/knowledge/decisions", deps).filter(name => name.endsWith(".md"))) {
    const text = read(root, `.project/knowledge/decisions/${name}`, MAX_TEMPLATE_BYTES, deps);
    if (text === null) throw new Error("Decision disappeared while scanning");
    if (!/^status:/m.test(text)) legacy.decisions++;
  }
  return { legacy, pitches: pitches.size };
}

/** Builds and validates every step before writing; replay after any completed step is idempotent. */
export function migrate(root: string, deps: RuntimeDeps, options: { apply?: boolean } = {}): MigrationResult {
  root = deps.fs.realpathSync(root);
  const project = inspect(root, ".project", deps);
  if (!project?.isDirectory()) throw new Error("Run from an installed project root (.project/ required)");
  requireNoPendingCompaction(root, deps);
  const steps: MigrationStep[] = [];
  const changes: Change[] = [];
  const { legacy } = legacyInventory(root, deps);
  const directory = ".project/records/shipped";
  const present = inspect(root, directory, deps);
  if (present && !present.isDirectory()) throw new Error(`Not a directory: ${directory}`);
  steps.push({ path: directory, status: present ? "unchanged" : "create", detail: "missing-only outcome directory" });
  if (!present) changes.push({ path: directory, before: null, after: null });

  for (const [relative, hashes] of Object.entries(PREVIOUS_TEMPLATE_HASHES)) {
    const target = `.project/${relative}`;
    // The installed bundle's scaffold is data; no target scripts or configuration are executed.
    const source = read(root, `ai-framework/templates/project/${relative}`, MAX_TEMPLATE_BYTES, deps);
    if (source === null) throw new Error(`Sync the bundle first: missing template ${relative}`);
    const before = read(root, target, MAX_TEMPLATE_BYTES, deps);
    const status = before === source ? "unchanged" : before === null ? "create" : hashes.includes(deps.crypto.sha256Hex(before)) ? "refresh" : "local";
    steps.push({ path: target, status, detail: status === "local" ? "local copy preserved; compare with current bundle" : "known bundle template", ...(status === "local" ? { diff: `--- ${target}\n+++ bundle/${relative}\n${before!.split("\n").map(line => `-${printable(line)}`).join("\n")}\n${source.split("\n").map(line => `+${printable(line)}`).join("\n")}` } : {}) });
    if (status === "create" || status === "refresh") changes.push({ path: target, before, after: source });
  }

  const before = read(root, DONE_WORK_FILE, MAX_DONE_WORK_BYTES, deps);
  // Validate existing markers without regenerating or erasing an existing index.
  let candidate = applyIndex(before ?? "# Done Work\n", []);
  // applyIndex normalizes the trailing whitespace of a header-only file; migration must retain those bytes too.
  if (before !== null && !before.includes(INDEX_START) && !/^## /m.test(before)) {
    candidate = `${before}${before.endsWith("\n\n") ? "" : "\n\n"}${INDEX_HEADING}\n\n${renderBlock([])}\n`;
  }
  const after = before?.includes(INDEX_START) && before.includes(INDEX_END) ? before : candidate;
  if (new TextEncoder().encode(after).length > MAX_DONE_WORK_BYTES) throw new Error("Index insertion exceeds done-work byte bound");
  steps.push({ path: DONE_WORK_FILE, status: before === after ? "unchanged" : before === null ? "create" : "refresh", detail: "index markers only; existing header and legacy entries preserved" });
  if (before !== after) changes.push({ path: DONE_WORK_FILE, before, after });

  steps.push({ path: ".project", status: "report", detail: `${legacy.ledgers} v1 ledgers, ${legacy.entries} legacy entries, ${legacy.decisions} status-less decisions; report only, dual-read remains valid` });
  if (options.apply) for (const change of changes) publish(root, change, deps);
  return { applied: Boolean(options.apply), steps, legacy };
}

export function main(argv: string[], deps: RuntimeDeps): number {
  try {
    if (argv.some(arg => arg !== "--apply" && arg !== "--json")) throw new Error("Usage: consolidation-migrate.mts [--apply] [--json] (run from project root)");
    const result = migrate(deps.proc.cwd(), deps, { apply: argv.includes("--apply") });
    if (argv.includes("--json")) deps.io.stdout.write(`${JSON.stringify(result)}\n`);
    else {
      deps.io.stdout.write(`consolidation migration: ${result.applied ? "apply" : "dry run; pass --apply"}\n`);
      for (const step of result.steps) {
        deps.io.stdout.write(`${step.status}: ${step.path} — ${step.detail}\n`);
        if (step.diff) deps.io.stdout.write(`${step.diff}\n`);
      }
    }
    return 0;
  } catch (error) {
    const code = errorCode(error);
    deps.io.stderr.write(`consolidation-migrate: ${code ? `file system error (${printable(code)})` : printable(error instanceof Error ? error.message : String(error))}\n`);
    return 1;
  }
}

runDirect(import.meta.url, main);
