#!/usr/bin/env node
/** Bounded legacy inventory, explicit evidence preparation, and resumable approved upgrades. */
import { runDirect } from "./runtime/cli.mts";
import { readProjectBytes, readProjectText, projectNames } from "./consolidation-migrate.mts";
import { applyIndex, DONE_WORK_FILE, INDEX_START, INDEX_END, MAX_DONE_WORK_BYTES, legacyEntries, type RecordMeta } from "./done-work-index.mts";
import { MAX_LEDGER_BYTES, MAX_SECTIONS, MAX_DESTINATION_LENGTH, destinationPath, destinationRefusal, validateLedgerShape } from "./ledger-schema.mts";
import { OUTCOME_DIR, MAX_RECORD_BYTES, lintOutcomeRecord, lintOutcomeText, outcomeFields, printable } from "./outcome-record.mts";
import { createPitchCompress, requireNoPendingCompaction } from "./pitch-compress.mts";
import { MAX_ARCHIVED_FILE_BYTES, MAX_ARCHIVED_FILES, MAX_ARCHIVE_MANIFEST_BYTES, createPitchArchive } from "./pitch-archive.mts";
import { transact, type Operation, type RegistryContext } from "./skill-registry.mts";
import { runWorkflowSync } from "./runtime/entry.mts";
import { readDataFile } from "./runtime/data-file.mts";
import type { LedgerMapping } from "./pitch-compress.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

export const MAX_LEGACY_SCAN_BYTES = 16 * 1024 * 1024;
export const MAX_EVIDENCE_BYTES = 1024 * 1024;
export const MAX_RECEIPT_BYTES = 1024 * 1024;
const LEDGERS = ".project/compaction/ledgers";
const ARCHIVES = ".project/compaction/archives";
const RECEIPTS = ".project/compaction/archive-reads.log";
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
type LegacySection = { source: string; status?: string; destination?: string | null; reason?: string };
interface Ledger { schemaVersion: number; slug: string; sections: LegacySection[] }
export interface LegacyState { slug: string; state: "legacy" | "partial" | "upgraded"; tier: "A" | "B-small" | "B-large"; pointerSections: number; problems: string[] }
export interface Evidence { path: string; hash: string; excerpt: string; truncated: boolean }
export interface Prepared {
  slug: string; draft: true; state: "needs-decision"; ledgerHash: string;
  mapping: { schemaVersion: 2; sections: { source: string; class: null; disposition: null; destination: string | null; helps: null; bodyHash: null }[]; otherFiles: [] };
  judgments: { source: string; state: "needs-decision"; legacyStatus: string | null; legacyDestination: string | null; legacyReason: string | null; legacyReasonTruncated: boolean }[];
  bindings: Record<string, string>; legacyEntryHash: string | null;
  otherFilesState: "needs-decision"; outcomeRecord: string; evidence: Evidence[]; unavailable: string[];
}

function checkSlug(slug: string): void { if (!SLUG.test(slug)) throw new Error("Invalid pitch slug"); }
function requireProject(root: string, deps: RuntimeDeps): void { if (!deps.fs.existsSync(deps.path.join(root, ".project"))) throw new Error("Run from an installed project root"); }
function json(text: string): unknown { try { return JSON.parse(text); } catch { throw new Error("Invalid legacy JSON"); } }
function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function ledgerOf(text: string, slug: string): Ledger {
  const value = json(text), result = validateLedgerShape(value, slug);
  if (result.problems.length) throw new Error(`Refused ledger: ${printable(result.problems[0])}`);
  const ledger = value as Ledger;
  if (ledger.sections.some(section => section.destination !== undefined && section.destination !== null && (typeof section.destination !== "string" || section.destination.length > MAX_DESTINATION_LENGTH))) throw new Error("Refused legacy destination shape");
  return ledger;
}

/** No archive path is listed, inspected or opened by status. Invalid inputs refuse instead of becoming absent. */
export function status(root: string, deps: RuntimeDeps): LegacyState[] {
  requireProject(root, deps);
  const done = readProjectText(root, DONE_WORK_FILE, MAX_DONE_WORK_BYTES, deps) ?? "";
  applyIndex(done, []); // validates paired/unique markers without writing
  const entries = legacyEntries(done);
  const block = done.includes(INDEX_START) ? done.slice(done.indexOf(INDEX_START), done.indexOf(INDEX_END)) : "";
  const indexed = new Map<string, number>();
  for (const match of block.matchAll(/^- \[([a-z0-9-]+)\]\(records\/shipped\/\1\.md\) — shipped \d{4}-\d{2}-\d{2}/gm)) indexed.set(match[1], (indexed.get(match[1]) ?? 0) + 1);
  const ledgers = projectNames(root, LEDGERS, deps).filter(name => name.endsWith(".json") && !name.endsWith(".v1.json")).map(name => name.slice(0, -5));
  const records = projectNames(root, OUTCOME_DIR, deps).filter(name => name.endsWith(".md") && !name.startsWith("_")).map(name => name.slice(0, -3));
  const slugs = [...new Set([...ledgers, ...records, ...entries.keys(), ...indexed.keys()])].sort();
  if (slugs.length > MAX_SECTIONS * 4) throw new Error("Too many compacted pitches to scan");
  let bytes = new TextEncoder().encode(done).length;
  return slugs.map(slug => {
    checkSlug(slug);
    const text = readProjectText(root, `${LEDGERS}/${slug}.json`, MAX_LEDGER_BYTES, deps);
    const ledger = text === null ? null : ledgerOf(text, slug);
    const sibling = ledger?.schemaVersion === 2 ? readProjectText(root, `${LEDGERS}/${slug}.v1.json`, MAX_LEDGER_BYTES, deps) : null;
    bytes += new TextEncoder().encode(text ?? "").length + new TextEncoder().encode(sibling ?? "").length;
    const prior = sibling === null ? ledger : ledgerOf(sibling, slug);
    if (sibling !== null && prior?.schemaVersion !== 1) throw new Error("Preserved legacy sibling must be version 1");
    const pointerSections = prior?.sections.filter(section => section.destination?.split("#")[0] === DONE_WORK_FILE).length ?? 0;
    const record = readProjectText(root, `${OUTCOME_DIR}/${slug}.md`, MAX_RECORD_BYTES, deps);
    bytes += new TextEncoder().encode(record ?? "").length;
    if (bytes > MAX_LEGACY_SCAN_BYTES) throw new Error("Legacy scan byte budget exceeded");
    const problems = record === null ? [] : lintOutcomeRecord(root, `${OUTCOME_DIR}/${slug}.md`, deps).problems;
    const state = ledger?.schemaVersion === 2 && record !== null && problems.length === 0 && indexed.get(slug) === 1 && !entries.has(slug) ? "upgraded"
      : ledger?.schemaVersion === 1 && record === null && !indexed.has(slug) ? "legacy" : "partial";
    return { slug, state, tier: pointerSections === 0 ? "A" : pointerSections <= 12 ? "B-small" : "B-large", pointerSections, problems };
  });
}

/** Record approval before even listing the archive folder. Receipt creation/appending is descriptor-pinned. */
function receipt(root: string, slug: string, reason: string, deps: RuntimeDeps): void {
  if (!reason.trim() || reason.length > 240 || /[\u0000-\u001f\u007f-\u009f]/.test(reason)) throw new Error("Archive-read approval needs a nonempty reason without control characters (maximum 240 characters)");
  requireNoPendingCompaction(root, deps);
  const existing = readProjectText(root, RECEIPTS, MAX_RECEIPT_BYTES, deps);
  const file = deps.path.join(root, RECEIPTS);
  const before = existing === null ? null : deps.fs.lstatSync(file);
  const line = new TextEncoder().encode(`${JSON.stringify({ slug, reason, date: new Date(deps.clock.now()).toISOString() })}\n`);
  if (new TextEncoder().encode(existing ?? "").length + line.length > MAX_RECEIPT_BYTES) throw new Error("Archive-read receipt log is full");
  const fd = deps.fs.openSync(file, existing === null ? "ax" : "a", 0o600);
  try {
    const stat = deps.fs.fstatSync(fd);
    if (!stat.isFile() || stat.nlink !== 1 || (before && (stat.ino !== before.ino || stat.dev !== before.dev))) throw new Error("Archive-read receipt changed before append");
    if (deps.fs.writeSync(fd, line) !== line.length) throw new Error("Incomplete archive-read receipt; no archive read permitted");
    deps.fs.fsyncSync(fd);
  } finally { deps.fs.closeSync(fd); }
}

/** Verifies the approved archive's manifest/checksum and the source files actually used as evidence. */
function approvedSources(root: string, slug: string, sources: string[] | null, deps: RuntimeDeps): Map<string, Uint8Array> {
  const pattern = new RegExp(`^${slug}-\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-\\d{3}Z$`);
  const directory = projectNames(root, ARCHIVES, deps).filter(name => pattern.test(name)).at(-1);
  if (!directory) throw new Error("No approved source archive found");
  const base = `${ARCHIVES}/${directory}`;
  const raw = readProjectBytes(root, `${base}/manifest.json`, MAX_ARCHIVE_MANIFEST_BYTES, deps);
  const checksum = readProjectText(root, `${base}/ARCHIVE-CHECKSUM`, 4096, deps);
  if (!raw || checksum?.trim() !== `sha256:${deps.crypto.sha256Hex(raw)}`) throw new Error("Archive manifest checksum mismatch");
  const manifest = json(new TextDecoder("utf-8", { fatal: true }).decode(raw));
  if (!object(manifest) || manifest.schemaVersion !== 1 || manifest.slug !== slug || !object(manifest.files)) throw new Error("Unsupported or malformed archive manifest");
  if (Object.keys(manifest.files).length > MAX_ARCHIVED_FILES) throw new Error("Archive manifest has too many files");
  const output = new Map<string, Uint8Array>();
  let bytes = 0;
  for (const source of new Set(sources ?? Object.keys(manifest.files))) {
    if (destinationPath(source) === null) throw new Error("Unsafe archived source path");
    const expected = manifest.files[source];
    if (!object(expected) || typeof expected.hash !== "string") throw new Error("Archive does not cover a required source file");
    const data = readProjectBytes(root, `${base}/files/${source}`, MAX_ARCHIVED_FILE_BYTES, deps);
    if (!data || deps.crypto.sha256Hex(data) !== expected.hash) throw new Error("Archived source content does not match its manifest");
    bytes += data.length;
    if (bytes > MAX_LEGACY_SCAN_BYTES) throw new Error("Archive evidence byte budget exceeded");
    output.set(source, data);
  }
  return output;
}

/** Only explicitly approved archive preparation may write, and then only its approval receipt. */
export function prepare(root: string, slug: string, deps: RuntimeDeps, options: { readArchive?: boolean; approveArchiveRead?: string } = {}): Prepared {
  checkSlug(slug);
  if (options.readArchive && !options.approveArchiveRead) throw new Error("Archive read refused: provide --approve-archive-read with a reason");
  if (!options.readArchive && options.approveArchiveRead !== undefined) throw new Error("Approval reason requires --read-archive");
  requireProject(root, deps);
  const text = readProjectText(root, `${LEDGERS}/${slug}.json`, MAX_LEDGER_BYTES, deps);
  if (text === null) throw new Error("No legacy ledger for this pitch");
  const ledger = ledgerOf(text, slug);
  if (ledger.schemaVersion !== 1) throw new Error("Preparation requires a version 1 legacy ledger");
  const done = readProjectText(root, DONE_WORK_FILE, MAX_DONE_WORK_BYTES, deps) ?? "";
  const entries = legacyEntries(done), shipped = entries.get(slug) ?? "needs-decision";
  const evidence: Evidence[] = [], unavailable: string[] = [];
  const add = (path: string, bytes: Uint8Array): void => {
    if (evidence.some(item => item.path === path)) return;
    const content = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    evidence.push({ path, hash: `sha256:${deps.crypto.sha256Hex(bytes)}`, excerpt: content.slice(0, 2000), truncated: content.length > 2000 });
  };
  const start = done.indexOf(`## ${slug} — shipped `);
  if (start >= 0) {
    const next = done.indexOf("\n## ", start + 4);
    add(`${DONE_WORK_FILE}#${slug}`, new TextEncoder().encode(done.slice(start, next < 0 ? done.length : next)));
  } else unavailable.push("legacy narrative entry");
  const destinations = new Set<string>([`.project/records/pitch-compression/${slug}.md`]);
  for (const entry of ledger.sections) if (typeof entry.destination === "string") {
    const file = entry.destination.split("#")[0];
    if (file.startsWith(".project/knowledge/") || file.startsWith(".project/records/pitch-compression/")) {
      if (destinationPath(file) === null) throw new Error("Unsafe legacy evidence destination");
      destinations.add(file);
    }
  }
  let bytes = 0;
  for (const file of destinations) {
    const data = readProjectBytes(root, file, MAX_EVIDENCE_BYTES, deps);
    bytes += data?.length ?? 0;
    if (bytes > MAX_LEGACY_SCAN_BYTES) throw new Error("Preparation evidence byte budget exceeded");
    if (data === null) unavailable.push(file); else add(file, data);
  }
  if (options.readArchive) {
    receipt(root, slug, options.approveArchiveRead!, deps);
    for (const [file, data] of approvedSources(root, slug, ledger.sections.map(section => section.source.split("#")[0]), deps)) add(`archive:${file}`, data);
  }
  const sections = ledger.sections.map(section => ({ source: section.source, class: null, disposition: null, destination: typeof section.destination === "string" && section.destination.split("#")[0] !== DONE_WORK_FILE && destinationRefusal(section.destination) === null ? section.destination : null, helps: null, bodyHash: null }));
  const outcomeRecord = `---\nslug: ${slug}\nshipped: ${shipped}\nschemaVersion: 1\ndraft: true\n---\n# ${slug}\n\nDraft only: content judgment is still required.\nRead the collected evidence before choosing durable destinations.\nNo upgrade or coverage decision has been applied.\n\n- outcome: needs-decision\n- docs: none\n- decisions: none\n- knowledge: none\n- code: none\n- verification: none\n- followups: none\n- archive: none\n`;
  const bindings: Record<string, string> = {};
  for (const section of ledger.sections) {
    const file = section.destination?.split("#")[0];
    if (!file || file === DONE_WORK_FILE || Object.hasOwn(bindings, file)) continue;
    const data = readProjectBytes(root, file, MAX_EVIDENCE_BYTES, deps);
    if (!data) throw new Error("Legacy destination is missing; resolve it before approval");
    bytes += data.length;
    if (bytes > MAX_LEGACY_SCAN_BYTES) throw new Error("Preparation binding byte budget exceeded");
    bindings[file] = `sha256:${deps.crypto.sha256Hex(data)}`;
  }
  return { slug, draft: true, state: "needs-decision", ledgerHash: `sha256:${deps.crypto.sha256Hex(text)}`, bindings, legacyEntryHash: evidence.find(item => item.path === `${DONE_WORK_FILE}#${slug}`)?.hash ?? null, mapping: { schemaVersion: 2, sections, otherFiles: [] }, judgments: ledger.sections.map(section => ({ source: section.source, state: "needs-decision", legacyStatus: section.status ?? null, legacyDestination: section.destination ?? null, legacyReason: typeof section.reason === "string" ? section.reason.slice(0, 240) : null, legacyReasonTruncated: typeof section.reason === "string" && section.reason.length > 240 })), otherFilesState: "needs-decision", outcomeRecord, evidence, unavailable };
}

export interface ApprovedUpgrade {
  ledgerHash: string; legacyEntryHash: string; bindings: Record<string, string>;
  mapping: LedgerMapping; outcomeRecord: string; acceptGaps?: Record<string, string>;
  /** Reviewed drift: a living destination edited after the v1 commit, bound by both hashes and a written reason. */
  acceptDestinationDrift?: Record<string, { committed: string; current: string; reason: string }>;
}
export interface ApplyOptions { apply?: boolean; readArchive?: boolean; approveArchiveRead?: string; afterStep?: (step: number) => void }

function narrative(text: string, slug: string): { start: number; end: number; text: string } | null {
  const matches = [...text.matchAll(new RegExp(`^## ${slug} — shipped \\d{4}-\\d{2}-\\d{2}(?=\\s|$)`, "gm"))];
  if (matches.length > 1) throw new Error("Duplicate legacy narrative entries");
  if (!matches.length) return null;
  const start = matches[0].index!, next = text.indexOf("\n## ", start + 4), end = next < 0 ? text.length : next;
  return { start, end, text: text.slice(start, end) };
}

/** Compare old destinations against the commit that first introduced the immutable legacy ledger. */
function committedDestinations(root: string, active: string, original: string, destinations: Set<string>, accepted: ApprovedUpgrade["acceptDestinationDrift"], deps: RuntimeDeps): string {
  const git = (args: string[], cap: number): Uint8Array => {
    const result = deps.child.runBytesSync("git", ["--no-replace-objects", "--literal-pathspecs", "-c", "core.fsmonitor=false", ...args], { cwd: root, timeoutMs: 10000, maxBufferBytes: cap + 1, env: { ...deps.proc.env, GIT_NO_LAZY_FETCH: "1", GIT_OPTIONAL_LOCKS: "0" } });
    if (result.status !== 0 || result.stdout.length > cap) throw new Error("Commit-time destination evidence unavailable; upgrade stopped");
    return result.stdout;
  };
  const decode = (data: Uint8Array): string => new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(data);
  if (decode(git(["rev-parse", "--is-shallow-repository"], 100)).trim() !== "false") throw new Error("Commit-time evidence requires complete Git history");
  const revision = decode(git(["log", "--diff-filter=A", "--format=%H", "--", active], 65536)).trim().split("\n").at(-1)!;
  if (!/^[a-f0-9]{40,64}$/.test(revision)) throw new Error("Legacy ledger has no introducing Git commit; upgrade stopped");
  const hash = (data: Uint8Array | string): string => deps.crypto.sha256Hex(data);
  if (hash(git(["cat-file", "blob", `${revision}:./${active}`], MAX_LEDGER_BYTES)) !== hash(original)) throw new Error("Legacy ledger differs from its introducing commit");
  let total = 0;
  const unused = new Set(Object.keys(accepted ?? {}));
  for (const file of destinations) {
    const current = readProjectBytes(root, file, MAX_EVIDENCE_BYTES, deps);
    const committed = git(["cat-file", "blob", `${revision}:./${file}`], MAX_EVIDENCE_BYTES);
    total += committed.length;
    if (total > MAX_LEGACY_SCAN_BYTES) throw new Error("Commit-time evidence byte budget exceeded");
    if (!current) throw new Error("Legacy destination changed since v1 commit; review required, upgrade stopped");
    if (hash(current) === hash(committed)) continue;
    // Only a file whose exact before/after bytes the owner reviewed may drift; any later edit stops the upgrade again.
    const review = accepted?.[file];
    if (!review || review.committed !== `sha256:${hash(committed)}` || review.current !== `sha256:${hash(current)}`) throw new Error("Legacy destination changed since v1 commit; review required, upgrade stopped");
    unused.delete(file);
  }
  if (unused.size) throw new Error("Destination drift acceptance does not match a drifted legacy destination");
  return revision;
}

function indexRecords(root: string, deps: RuntimeDeps): RecordMeta[] {
  return projectNames(root, OUTCOME_DIR, deps).filter(name => name.endsWith(".md") && !name.startsWith("_")).map(name => {
    const slug = name.slice(0, -3); checkSlug(slug);
    const relative = `${OUTCOME_DIR}/${name}`, text = readProjectText(root, relative, MAX_RECORD_BYTES, deps);
    if (text === null || lintOutcomeText(root, relative, text, deps).problems.length) throw new Error("Index refused an invalid existing outcome record");
    const fields = outcomeFields(text);
    return { slug, shipped: fields.shipped!, outcome: fields.outcome! };
  });
}

/** Each completed step is discoverable from the published artifacts; no parallel upgrade journal. */
export function apply(root: string, slug: string, approved: ApprovedUpgrade, deps: RuntimeDeps, options: ApplyOptions = {}): { slug: string; applied: boolean } {
  checkSlug(slug); requireProject(root, deps); requireNoPendingCompaction(root, deps);
  if (!object(approved) || typeof approved.outcomeRecord !== "string" || !object(approved.mapping) || !object(approved.bindings) || typeof approved.ledgerHash !== "string" || typeof approved.legacyEntryHash !== "string") throw new Error("Incomplete approved upgrade");
  if (approved.draft === true || approved.state === "needs-decision") throw new Error("Unresolved draft cannot be applied");
  const drift = approved.acceptDestinationDrift;
  if (drift !== undefined && (!object(drift) || Object.keys(drift).length > MAX_SECTIONS || Object.entries(drift).some(([file, review]) => destinationPath(file) === null || !object(review) || !/^sha256:[a-f0-9]{64}$/.test(String(review.committed)) || !/^sha256:[a-f0-9]{64}$/.test(String(review.current)) || typeof review.reason !== "string" || !review.reason.trim() || review.reason.length > 500 || review.reason !== printable(review.reason)))) throw new Error("Malformed destination drift acceptance");
  const hash = (data: Uint8Array | string): string => `sha256:${deps.crypto.sha256Hex(data)}`;
  const approvalHash = hash(JSON.stringify(approved));
  const active = `${LEDGERS}/${slug}.json`, sibling = `${LEDGERS}/${slug}.v1.json`, record = `${OUTCOME_DIR}/${slug}.md`;
  const current = readProjectText(root, active, MAX_LEDGER_BYTES, deps);
  if (current === null) throw new Error("No legacy ledger for this pitch");
  const parsed = ledgerOf(current, slug), priorSibling = readProjectText(root, sibling, MAX_LEDGER_BYTES, deps);
  const original = parsed.schemaVersion === 1 ? current : priorSibling;
  if (!original || ledgerOf(original, slug).schemaVersion !== 1 || hash(original) !== approved.ledgerHash) throw new Error("Legacy ledger binding conflict");
  if (priorSibling !== null && priorSibling !== original) throw new Error("Preserved v1 sibling conflict");
  const saved = json(current) as Record<string, unknown>;
  if (parsed.schemaVersion === 2 && (!object(saved.legacyUpgrade) || saved.legacyUpgrade.approvalHash !== approvalHash)) throw new Error("Active upgrade belongs to different approval");
  if (parsed.schemaVersion === 1 && priorSibling !== null) throw new Error("Unexpected preserved sibling before upgrade");
  const old = ledgerOf(original, slug);
  const paths = new Set<string>();
  for (const section of old.sections) if (section.destination && section.destination.split("#")[0] !== DONE_WORK_FILE) paths.add(section.destination.split("#")[0]);
  const legacyPaths = new Set(paths);
  for (const entry of [...approved.mapping.sections, ...(approved.mapping.otherFiles ?? [])]) if (entry.destination) paths.add(entry.destination.split("#")[0]);
  if (Object.keys(approved.bindings).length > MAX_SECTIONS * 2) throw new Error("Too many destination bindings");
  const checkBindings = (): void => {
    let bytes = 0;
    for (const file of new Set([...paths, ...Object.keys(approved.bindings)])) {
      const data = readProjectBytes(root, file, MAX_EVIDENCE_BYTES, deps);
      bytes += data?.length ?? 0;
      if (bytes > MAX_LEGACY_SCAN_BYTES) throw new Error("Destination binding byte budget exceeded");
      if (!data || hash(data) !== approved.bindings[file]) throw new Error("Destination binding conflict; review changed evidence before retrying");
    }
  };
  checkBindings();
  const introducingCommit = committedDestinations(root, active, original, legacyPaths, approved.acceptDestinationDrift, deps);
  const problems = lintOutcomeText(root, record, approved.outcomeRecord, deps).problems;
  if (problems.length) throw new Error(`Invalid approved outcome: ${problems[0]}`);
  const existingRecord = readProjectText(root, record, MAX_RECORD_BYTES, deps);
  if (existingRecord !== null && existingRecord !== approved.outcomeRecord) throw new Error("Outcome record conflict");
  let done = readProjectText(root, DONE_WORK_FILE, MAX_DONE_WORK_BYTES, deps) ?? "";
  applyIndex(done, []);
  const legacy = narrative(done, slug);
  if (legacy && hash(legacy.text) !== approved.legacyEntryHash) throw new Error("Legacy narrative binding conflict");
  if (!legacy && parsed.schemaVersion === 1) throw new Error("Legacy narrative is missing before upgrade");
  // Original source proof is mandatory, including tier A: summaries cannot stand in for section bodies.
  if (!options.readArchive || !options.approveArchiveRead) throw new Error("Archive read refused: explicit per-pitch --read-archive --approve-archive-read reason required");
  receipt(root, slug, options.approveArchiveRead, deps);
  const sources = approvedSources(root, slug, null, deps);
  const verified = createPitchArchive(deps).verify(root, slug);
  if (!verified.valid) throw new Error("Source archive verification failed");
  const compressor = createPitchCompress(deps);
  const evidence = compressor.archivedEvidence(new Map([...sources].map(([name, bytes]) => [name, new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes)])));
  // The approved mapping must bind every judgment to its original content, not acquire hashes on apply.
  if (approved.mapping.sections.some(entry => !("bodyHash" in entry) || !entry.bodyHash) || approved.mapping.otherFiles?.some(entry => !entry.hash)) throw new Error("Approved mapping needs all original content hashes");
  const validated = compressor.validateEvidence(root, slug, approved.mapping, evidence, { acceptGaps: approved.acceptGaps });
  const candidate = JSON.parse(validated);
  if (parsed.schemaVersion === 2 && (JSON.stringify(saved.sections) !== JSON.stringify(candidate.sections) || JSON.stringify(saved.otherFiles) !== JSON.stringify(candidate.otherFiles) || JSON.stringify(saved.acceptedGaps) !== JSON.stringify(candidate.acceptedGaps) || saved.coverage !== candidate.coverage)) throw new Error("Committed ledger content conflict");
  const serialized = `${JSON.stringify({ ...candidate, legacyUpgrade: { approvalHash, introducingCommit } }, null, 2)}\n`;
  if (new TextEncoder().encode(serialized).length > MAX_LEDGER_BYTES) throw new Error("Upgraded ledger exceeds shared byte limit");
  const ctx = { roots: { target: deps.fs.realpathSync(root) }, state: ".project/compaction" } as RegistryContext;
  const operation = (path: string, before: string | null, after: string): Operation => ({ path, expected: before === null ? null : deps.crypto.sha256Hex(before), value: { data: new TextEncoder().encode(after), mode: before === null ? 0o644 : deps.fs.lstatSync(deps.path.join(root, path)).mode & 0o777 } });
  const publish = (operations: Operation[]): void => { checkBindings(); transact(ctx, operations, {}, deps); };
  if (!options.apply) return { slug, applied: false };
  if (parsed.schemaVersion === 1) publish([operation(sibling, null, original), operation(active, current, serialized)]);
  options.afterStep?.(1);
  if (existingRecord === null) publish([operation(record, null, approved.outcomeRecord)]);
  if (lintOutcomeRecord(root, record, deps).problems.length) throw new Error("Published record did not pass lint");
  options.afterStep?.(2);
  const records = indexRecords(root, deps);
  done = readProjectText(root, DONE_WORK_FILE, MAX_DONE_WORK_BYTES, deps) ?? "";
  const indexed = applyIndex(done, records);
  if (new TextEncoder().encode(indexed).length > MAX_DONE_WORK_BYTES) throw new Error("Generated index exceeds shared byte limit");
  if (indexed !== done) publish([operation(DONE_WORK_FILE, done, indexed)]);
  options.afterStep?.(3);
  done = readProjectText(root, DONE_WORK_FILE, MAX_DONE_WORK_BYTES, deps) ?? "";
  const retiring = narrative(done, slug);
  if (retiring) {
    if (hash(retiring.text) !== approved.legacyEntryHash) throw new Error("Legacy narrative changed during upgrade");
    // Regenerate and compare before retirement; never erase the only discoverable shipped record.
    if (applyIndex(done, records) !== done || !records.some(item => item.slug === slug)) throw new Error("Index is incomplete before narrative retirement");
    // Drop the separator newline that belongs to the retired entry, so the neighbours' bytes (and hashes) stay unchanged.
    const from = retiring.end === done.length && done.slice(retiring.start - 2, retiring.start) === "\n\n" ? retiring.start - 1 : retiring.start;
    publish([operation(DONE_WORK_FILE, done, done.slice(0, from) + done.slice(done[retiring.end] === "\n" ? retiring.end + 1 : retiring.end))]);
  }
  options.afterStep?.(4);
  checkBindings();
  for (const flags of [[], ["--check"]]) {
    const result = runWorkflowSync(deps, [deps.path.join(import.meta.dirname, "graphify.mts"), ...flags], { cwd: root });
    if (result.status !== 0) throw new Error(`Upgrade graph ${flags.length ? "check" : "rebuild"} failed; rerun the same approval to resume`);
  }
  options.afterStep?.(5);
  return { slug, applied: true };
}

export function main(argv: string[], deps: RuntimeDeps): number {
  try {
    const positional: string[] = [];
    let readArchive = false, approveArchiveRead: string | undefined, applyFlag = false, file: string | undefined;
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      if (arg === "--json") continue;
      if (arg === "--apply") applyFlag = true;
      else if (arg === "--file") { file = argv[++i]; if (!file || file.startsWith("--")) throw new Error("Approval file is missing"); }
      else if (arg === "--read-archive") readArchive = true;
      else if (arg === "--approve-archive-read") { approveArchiveRead = argv[++i]; if (!approveArchiveRead || approveArchiveRead.startsWith("--")) throw new Error("Archive approval reason is missing"); }
      else if (arg.startsWith("--")) throw new Error("Unknown legacy-upgrade option");
      else positional.push(arg);
    }
    const [action, slug] = positional, root = deps.fs.realpathSync(deps.proc.cwd());
    if (action !== "apply" && (applyFlag || file)) throw new Error("Apply options require the apply action");
    if (action === "apply" && positional.length === 2 && file) {
      readProjectBytes(root, file, MAX_LEGACY_SCAN_BYTES, deps); // also enforces secret-path refusal
      const input = readDataFile(root, file, deps);
      if (input.status !== "parsed") throw new Error("Approved data file is absent or refused");
      deps.io.stdout.write(`${JSON.stringify(apply(root, slug, input.value as unknown as ApprovedUpgrade, deps, { apply: applyFlag, readArchive, approveArchiveRead }))}\n`);
    } else if (action === "status" && positional.length === 1 && !readArchive && approveArchiveRead === undefined) {
      const rows = status(root, deps);
      if (argv.includes("--json")) deps.io.stdout.write(`${JSON.stringify({ pitches: rows })}\n`);
      else for (const row of rows) deps.io.stdout.write(`${row.slug}: ${row.state}; tier ${row.tier}; ${row.pointerSections} done-work pointer section(s)\n`);
    } else if (action === "prepare" && positional.length === 2) deps.io.stdout.write(`${JSON.stringify(prepare(root, slug, deps, { readArchive, approveArchiveRead }), null, 2)}\n`);
    else throw new Error("Usage: legacy-upgrade.mts status [--json] | prepare SLUG [--read-archive --approve-archive-read REASON] | apply SLUG --file APPROVED [--apply] --read-archive --approve-archive-read REASON");
    return 0;
  } catch (error) {
    const code = error !== null && typeof error === "object" ? (error as { code?: string }).code : undefined;
    deps.io.stderr.write(`legacy-upgrade: ${code ? "file operation refused" : printable(error instanceof Error ? error.message : String(error))}\n`);
    return 1;
  }
}

runDirect(import.meta.url, main);
