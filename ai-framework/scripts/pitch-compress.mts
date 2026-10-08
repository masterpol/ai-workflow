import { runDirect } from "./runtime/cli.mts";
import { createNodeDeps } from "./runtime/node.mts";
import * as registryModule from "./skill-registry.mts";

import type { RuntimeDeps, StatLike, DirEntryLike } from "./runtime/types.mts";

interface CompactionContext { roots: { target: string }; state: string }
interface Snapshot { hash: string }
interface Operation {
  path: string;
  expected: string | null;
  expectedMode?: number | null;
  value: { data: Uint8Array; mode: number } | null;
}
export interface RegistryApi {
  snapshot(ctx: CompactionContext, relative: string, root?: string, deps?: RuntimeDeps): Snapshot | null;
  transact(ctx: CompactionContext, operations: Operation[], options?: object, deps?: RuntimeDeps): void;
  recover(ctx: CompactionContext, deps?: RuntimeDeps): boolean;
}
const registry = registryModule as RegistryApi;
let nodeDeps: RuntimeDeps | undefined;
function defaultDeps(): RuntimeDeps { return (nodeDeps ??= createNodeDeps()); }
function codeOf(error: unknown): string | undefined {
  return error !== null && typeof error === "object" ? (error as { code?: string }).code : undefined;
}
function syscallOf(error: unknown): string | undefined {
  return error !== null && typeof error === "object" ? (error as { syscall?: string }).syscall : undefined;
}
function messageOf(error: unknown): string { return error instanceof Error ? error.message : String(error); }
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

export interface PitchEntry { slug: string; eligible: boolean; reason: string }
export interface LedgerPlan { slug: string; required: string[] }
export interface LedgerSection { source: string; status: string; destination?: string; reason?: string }
export interface LedgerMapping { sections: LedgerSection[] }
export interface Gap { source: string; reason: string | undefined }
export interface AcceptedGap extends Gap { acceptedReason: string }
export interface CommitOptions { apply?: boolean; acceptGaps?: Record<string, string> }
export interface CommitResult { slug: string; coverage: number; gaps: Gap[]; acceptedGaps: AcceptedGap[]; applied: boolean }
export interface DoneResult { slug: string; changed: boolean; content: string }
interface Heading { index: number; level: number; title: string }
interface CliOptions extends CommitOptions { root: string; json?: boolean; file?: string; summary?: string }
export interface PitchCompressApi {
  inventory(root: string): PitchEntry[];
  classify(root: string, slug: string): PitchEntry;
  buildLedger(root: string, slug: string): LedgerPlan;
  requiredSections(root: string, slug: string): string[];
  commitLedger(root: string, slug: string, mapping: LedgerMapping, options?: CommitOptions): CommitResult;
  writeDoneWork(root: string, slug: string, summaryText: string, options?: { apply?: boolean }): DoneResult;
  slugifyHeading(heading: string): string;
  extractSection(text: string, heading: string): string | null;
  checkDestination(root: string, slug: string, destinationPath: string, original: string): void;
  assertPlainPath(base: string, relative: string, allowMissing?: boolean): void;
  compactionContext(root: string): CompactionContext;
  requireNoPendingCompaction(root: string): void;
  cli(argv: string[]): string;
}

/** Bind every filesystem, process and clock operation to this runtime. */
export function createPitchCompress(deps: RuntimeDeps, transactionApi: RegistryApi = registry): PitchCompressApi {
  const { fs, path } = deps;
  // Read members at call time: existing callers may instrument the audited transaction library.
  const snapshot = (ctx: CompactionContext, relative: string): Snapshot | null => transactionApi.snapshot(ctx, relative, undefined, deps);
  // Old CommonJS registry versions serialize Buffer data with .toString("base64").
  // Normalize only at this library boundary; filesystem reads keep their original bytes.
  const transact = (ctx: CompactionContext, operations: Operation[]): void => {
    const compatible = operations.map((operation) => ({
      ...operation,
      value: operation.value ? { ...operation.value, data: Buffer.from(operation.value.data) } : null,
    }));
    transactionApi.transact(ctx, compatible, {}, deps);
  };

  const PITCHES_DIR = ".project/pitches";
  const EXCLUDED = new Set(["_templates", "_archive", "_parked"]);
  const COMPACTION_DIR = ".project/compaction";
  const LEDGERS_DIR = `${COMPACTION_DIR}/ledgers`;
  const DONE_WORK = ".project/done-work.md";
  const SLUG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
  // JSON.parse errors quote their input; a fixed message does not.
  function parseJson(text: string, label: string): unknown { try { return JSON.parse(text); } catch { throw new Error(`${label} is not valid JSON`); } }

  function full(root: string, relative: string): string { return path.join(root, relative); }

  // All compaction mutations and recovery must agree on journal location and roots.
  // Kept here because pitch-archive already imports the ledger contract from this module.
  function compactionContext(root: string): CompactionContext {
    return { roots: { target: fs.realpathSync(root) }, state: COMPACTION_DIR };
  }

  function requireNoPendingCompaction(root: string): void {
    const ctx = compactionContext(root);
    if (snapshot(ctx, `${COMPACTION_DIR}/transaction.json`)) throw new Error("Interrupted transaction: run recover with pitch-archive.mts before continuing");
    // Older ledger commits shared the installer journal. Never strand or overwrite it
    // by starting a new transaction in the new namespace; recover it with its old roots.
    if (snapshot(ctx, ".project/skills/transaction.json")) throw new Error("Pending legacy or skill transaction: run add-skill.mts recover --scope project before continuing");
  }

  // Every path component under `base` must be a real directory or file: a symlinked ancestor (for example
  // .project -> elsewhere) would send reads and writes outside the project. security.md section 9.
  function assertPlainPath(base: string, relative: string, allowMissing = false): void {
    let current = base;
    for (const part of relative.split("/")) {
      current = path.join(current, part);
      let stat;
      try { stat = fs.lstatSync(current); } catch (error) { if (codeOf(error) === "ENOENT" && allowMissing) return; throw new Error(`Cannot read: ${relative}`); }
      if (stat.isSymbolicLink()) throw new Error(`Symlink forbidden in path: ${relative}`);
    }
  }

  const MAX_TEXT_BYTES = 4 * 1024 * 1024;
  // Pitch records are read from a project tree that may not be trusted (/state reads them too): a
  // symlink, FIFO or directory standing in for a file is treated as absent instead of followed or
  // blocked on, and an absurdly large file is refused loudly rather than parsed.
  function readText(file: string): string | null {
    let stat;
    try { stat = fs.lstatSync(file); } catch (error) { if (codeOf(error) === "ENOENT") return null; throw new Error(`Cannot read ${path.basename(file)} (${codeOf(error) || "error"})`); }
    if (stat.isSymbolicLink() || !stat.isFile()) return null;
    if (stat.size > MAX_TEXT_BYTES) throw new Error(`${path.basename(file)} is larger than ${MAX_TEXT_BYTES / 1024 / 1024} MB`);
    return fs.readFileSync(file);
  }
  function isRegularFile(file: string): boolean {
    try { const stat = fs.lstatSync(file); return stat.isFile() && !stat.isSymbolicLink(); } catch { return false; }
  }

  // Every heading with its line index, skipping "#" lines inside fenced code blocks (a shell "# comment"
  // is not a heading).
  function headingLines(lines: string[]): Heading[] {
    const found: Heading[] = [];
    let fence: { char: string; length: number } | null = null;
    lines.forEach((rawLine, index) => {
      const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine; // CRLF files: "." never matches "\r"
      if (fence) {
        // CommonMark: a closing fence uses the same character, at least as many of it, and nothing else on the line.
        // Checked before the length cap below: a closer padded to thousands of characters is still a closer.
        const closing = line.match(/^ {0,3}(`+|~+)[ \t]*$/);
        if (closing && closing[1][0] === fence.char && closing[1].length >= fence.length) fence = null;
        return;
      }
      const opening = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      // A backtick fence whose info string contains a backtick is not a fence.
      if (opening && !(opening[1][0] === "`" && opening[2].includes("`"))) { fence = { char: opening[1][0], length: opening[1].length }; return; }
      if (line.length > 4000) return; // no heading is that long; keeps the pattern below linear
      const match = line.trimEnd().match(/^ {0,3}(#{1,6})[ \t]+(\S.*)$/);
      if (match) found.push({ index, level: match[1].length, title: match[2].trim() });
    });
    return found;
  }
  // The lines under headings[position], up to the next heading of the same or shallower level.
  function bodyUnder(lines: string[], headings: Heading[], position: number): string {
    const next = headings.slice(position + 1).find((heading) => heading.level <= headings[position].level);
    return lines.slice(headings[position].index + 1, next ? next.index : lines.length).join("\n");
  }

  function markdownHeadings(text: string, level: number): string[] {
    return headingLines(text.split("\n")).filter((heading) => heading.level === level).map((heading) => heading.title);
  }

  // GitHub-style heading slug: lowercase, strip punctuation, spaces become dashes. Letters and digits of any
  // script are kept, so a Spanish or Chinese heading keeps a readable, distinct key.
  function slugifyHeading(heading: string): string {
    return heading.normalize("NFC").toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-");
  }

  // Two headings that slugify the same (duplicates, or "A B" and "A-B") must not merge: the first keeps the plain
  // key, later ones get -2, -3. Keys are computed over ALL headings so they stay stable when an earlier one is empty.
  function sectionKeys(prefix: string, titles: string[]): string[] {
    const used = new Set();
    const seen = new Map();
    return titles.map((title) => {
      const slug = slugifyHeading(title) || "section";
      let count = seen.get(slug) || 0;
      let key;
      // A "-2" suffix can equal another heading's own slug ("A B", "A B", "A B 2"): keep counting until the key is unused.
      do { count += 1; key = `${prefix}#${count === 1 ? slug : `${slug}-${count}`}`; } while (used.has(key));
      seen.set(slug, count);
      used.add(key);
      return key;
    });
  }

  // Content directly under the first heading whose text is exactly `heading`.
  function extractSection(text: string, heading: string): string | null {
    const lines = text.split("\n");
    const headings = headingLines(lines);
    const position = headings.findIndex((entry) => entry.title === heading);
    return position === -1 ? null : bodyUnder(lines, headings, position);
  }

  // The pitch template names these sections loosely ("No-gos", "No-gos (this pitch)", "Rabbit holes"): match the
  // canonical name at the start of the heading, ignoring case, spaces, hyphens and punctuation.
  function loosely(text: string): string { return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""); }
  function looseSectionHasContent(text: string, canonical: string): boolean {
    const lines = text.split("\n");
    const headings = headingLines(lines);
    return headings.some((entry, position) => loosely(entry.title).startsWith(loosely(canonical)) && bodyUnder(lines, headings, position).trim());
  }

  function checkSlug(slug: string): string {
    if (typeof slug !== "string" || !SLUG.test(slug)) throw new Error(`Invalid pitch slug: ${JSON.stringify(slug)}`);
    return slug;
  }

  function pitchDir(root: string, slug: string): string {
    // Every read path resolves the pitch through here: a symlinked .project or pitch directory would read (and echo the
    // headings of) files outside the project.
    assertPlainPath(root, `${PITCHES_DIR}/${checkSlug(slug)}`, true);
    return full(root, `${PITCHES_DIR}/${slug}`);
  }

  function doneWorkSlugs(root: string): Set<string> {
    const text = readText(full(root, DONE_WORK));
    const slugs = new Set<string>();
    if (text) for (const match of text.matchAll(/^## ([a-z0-9](?:[a-z0-9-]*[a-z0-9])?) — shipped/gm)) slugs.add(match[1]);
    return slugs;
  }

  function listPitchSlugs(root: string): string[] {
    const dir = full(root, PITCHES_DIR);
    let stat;
    try { assertPlainPath(root, PITCHES_DIR, true); stat = fs.lstatSync(dir); } catch { return []; }
    if (stat.isSymbolicLink() || !stat.isDirectory()) return [];
    return fs.readdirEntriesSync(dir).filter((entry) => entry.isDirectory() && !EXCLUDED.has(entry.name)).map((entry) => entry.name).sort();
  }

  // Parses a real hill.md table by its actual header (not a fixed column index), skips the
  // separator row (all-dash cells), and counts data rows whose Position column isn't "done".
  function hillOpenCount(text: string): number {
    const rows = [...text.matchAll(/^\|(.+)\|\s*$/gm)].map((match) => match[1].split("|").map((cell) => cell.trim()));
    if (rows.length < 2) return 0;
    const positionIndex = rows[0].map((cell) => cell.toLowerCase()).indexOf("position");
    if (positionIndex === -1) return 0;
    const dataRows = rows.slice(1).filter((cells) => !cells.every((cell) => /^:?-+:?$/.test(cell)));
    return dataRows.filter((cells) => !/^done$/i.test(cells[positionIndex] || "")).length;
  }

  function classify(root: string, slug: string): PitchEntry {
    let dir;
    try { dir = pitchDir(root, slug); } catch { return { slug, eligible: false, reason: "pitch directory is a symlink or cannot be read" }; }
    if (isRegularFile(path.join(dir, "SHIPPED.md"))) return { slug, eligible: true, reason: "shipped" };
    let hill;
    try { hill = readText(path.join(dir, "hill.md")); } catch (error) { return { slug, eligible: false, reason: `hill.md cannot be read (${messageOf(error)})` }; }
    if (hill) {
      const openCount = hillOpenCount(hill);
      if (openCount > 0) return { slug, eligible: false, reason: `active: hill shows ${openCount} scope row(s) not done` };
    }
    return { slug, eligible: false, reason: "no SHIPPED.md" };
  }

  // remove() deletes files but not directories, so a compacted pitch may leave nested empty directories:
  // "empty" means no file (or symlink) at any depth.
  function hasNoFiles(dir: string, depth = 0): boolean {
    if (depth > 20) return false;
    let entries: DirEntryLike[];
    try { entries = fs.readdirEntriesSync(dir); } catch { return false; }
    return entries.every((entry) => entry.isDirectory() && hasNoFiles(path.join(dir, entry.name), depth + 1));
  }

  function inventory(root: string): PitchEntry[] {
    const present = listPitchSlugs(root);
    const presentSet = new Set(present);
    // `remove` deletes a pitch's files but leaves its (now empty) directory behind; with the slug recorded in
    // done-work.md that is a compacted pitch, not an active one.
    const compacted = doneWorkSlugs(root);
    const isEmptyDirectory = (slug: string): boolean => hasNoFiles(pitchDir(root, slug));
    // A directory whose name isn't a valid slug can never be compacted (every later step
    // validates the slug) — report it as preserved with the reason instead of letting one oddly
    // named directory throw and hide every other pitch from the inventory.
    const results = present.map((slug) => (SLUG.test(slug) ? (compacted.has(slug) && isEmptyDirectory(slug) ? { slug, eligible: false, reason: "already compacted" } : classify(root, slug)) : { slug, eligible: false, reason: "directory name is not a valid pitch slug (lowercase letters, digits and hyphens); rename it to make it eligible" }));
    for (const slug of compacted) if (!presentSet.has(slug)) results.push({ slug, eligible: false, reason: "already compacted" });
    return results.sort((left, right) => left.slug.localeCompare(right.slug));
  }

  function requiredSections(root: string, slug: string): string[] {
    const dir = pitchDir(root, slug);
    const shipped = readText(path.join(dir, "SHIPPED.md"));
    if (shipped === null) throw new Error(`Not eligible: ${slug} has no SHIPPED.md`);
    const shippedLines = shipped.split("\n");
    const shippedTitles = headingLines(shippedLines).filter((heading) => heading.level === 2).map((heading) => heading.title);
    const required = sectionKeys("SHIPPED.md", shippedTitles);

    const pitch = readText(path.join(dir, "pitch.md"));
    if (pitch) {
      for (const canonical of ["No-gos", "Rabbit holes"]) {
        if (looseSectionHasContent(pitch, canonical)) required.push(`pitch.md#${slugifyHeading(canonical)}`);
      }
    }

    let entries: string[];
    try { entries = fs.readdirSync(dir).sort(); } catch (error) { throw new Error(`Cannot list the pitch directory (${codeOf(error) || "error"})`); }
    for (const entry of entries) {
      if (/^audit-cycle-.+\.md$/.test(entry)) required.push(entry);
    }

    for (const file of ["deviations.md", "log.md"]) {
      const text = readText(path.join(dir, file));
      if (!text) continue;
      const lines = text.split("\n");
      const headings = headingLines(lines);
      const second = headings.map((heading, position) => ({ heading, position })).filter((entry) => entry.heading.level === 2);
      const keys = sectionKeys(file, second.map((entry) => entry.heading.title));
      second.forEach((entry, index) => { if (bodyUnder(lines, headings, entry.position).trim()) required.push(keys[index]); });
    }
    return required;
  }

  function buildLedger(root: string, slug: string): LedgerPlan {
    return { slug, required: requiredSections(root, slug) };
  }

  // Runs this bundle's own graphify.mts (next to this script), never one the project supplies; it reads the project
  // through cwd. ai-framework/rules/security.md section 9: execute only bundle code.
  function checkGraph(root: string): void {
    const script = path.join(import.meta.dirname, "graphify.mts");
    const result = deps.child.runSync(deps.proc.execPath, ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", script, "--check", "--json"], { cwd: root });
    if (result.status !== 0) {
      // graphify's own problem list is bundle output; anything else (stderr, a stack trace with paths) is not echoed.
      let detail = "graphify --check failed";
      try { detail = (JSON.parse(result.stdout) as { problems?: { message: string }[] }).problems?.map((problem) => problem.message).join("; ") || detail; } catch { /* keep the generic message */ }
      throw new Error(`Knowledge graph invalid: ${detail}`);
    }
  }

  // A ledger destination is the proof that content survives compaction, so it must be a real,
  // nonempty file that will still exist afterwards: inside the project, and NOT inside the pitch
  // directory that remove() deletes (a destination there would count as "extracted" and then be
  // deleted along with everything else — coverage 1.0 with nothing actually preserved). Resolved
  // via realpath so a symlink into the pitch directory can't dodge the check.
  function checkDestination(root: string, slug: string, destinationPath: string, original: string): void {
    const target = full(root, destinationPath);
    if (!fs.existsSync(target)) throw new Error(`Destination does not exist: ${original}`);
    let real;
    try { real = fs.realpathSync(target); } catch (error) { throw new Error(`Destination cannot be inspected (${codeOf(error) || "error"}): ${original}`); }
    const outside = (base: string): boolean => { const relative = path.relative(fs.realpathSync(base), real); return relative.startsWith("..") || path.isAbsolute(relative); };
    if (outside(root)) throw new Error(`Destination resolves outside the project: ${original}`);
    if (!outside(pitchDir(root, slug))) throw new Error(`Destination is inside the pitch being compacted and would be deleted with it: ${original}`);
    // The ledger and the archive live here: pointing at them would "prove" extraction with the very files remove keeps.
    if (fs.existsSync(path.join(root, COMPACTION_DIR))) {
      const fromCompaction = path.relative(fs.realpathSync(path.join(root, COMPACTION_DIR)), real);
      if (!(fromCompaction.startsWith("..") || path.isAbsolute(fromCompaction))) throw new Error(`Destination is inside ${COMPACTION_DIR}, which is not a place content is extracted to: ${original}`);
    }
    const stat = fs.statSync(real);
    if (!stat.isFile() || stat.size === 0) throw new Error(`Destination must be a nonempty file: ${original}`);
  }

  function commitLedger(root: string, slug: string, mapping: LedgerMapping, options: CommitOptions = {}): CommitResult {
    checkSlug(slug);
    const required = new Set(requiredSections(root, slug));
    if (!mapping || !Array.isArray(mapping.sections) || !mapping.sections.length) throw new Error("Ledger must have a nonempty sections array");
    const covered = new Set<string>();
    const seen = new Set<string>();
    for (const entry of mapping.sections) {
      if (!entry || typeof entry.source !== "string") throw new Error("Each ledger entry needs a string source");
      if (!required.has(entry.source)) throw new Error(`Ledger references an unknown required section: ${entry.source}`);
      if (seen.has(entry.source)) throw new Error(`Duplicate ledger entry: ${entry.source}`);
      seen.add(entry.source);
      covered.add(entry.source);
      if (entry.status === "extracted") {
        if (typeof entry.destination !== "string" || !entry.destination.trim()) throw new Error(`Extracted section missing destination: ${entry.source}`);
        checkDestination(root, slug, entry.destination.split("#")[0], entry.destination);
      } else if (entry.status === "gap") {
        if (typeof entry.reason !== "string" || !entry.reason.trim()) throw new Error(`Gap missing reason: ${entry.source}`);
      } else {
        throw new Error(`Invalid ledger status for ${entry.source}: ${entry.status}`);
      }
    }
    const missing = [...required].filter((section) => !covered.has(section));
    if (missing.length) throw new Error(`Ledger missing required section(s): ${missing.join(", ")}`);
    checkGraph(root);

    const coverage = mapping.sections.filter((entry) => entry.status === "extracted").length / mapping.sections.length;
    const gaps = mapping.sections.filter((entry) => entry.status === "gap").map((entry) => ({ source: entry.source, reason: entry.reason }));
    // A gap the ledger's own author declared is not an accepted gap — otherwise whoever writes
    // the mapping could mark every section a "gap" and pass the deletion gate at coverage 0
    // (confirmed by a live repro). Each gap needs a separate, explicit acceptance naming the
    // section, recorded in the ledger so it is auditable at the human gate and re-checked by
    // pitch-archive.mts's remove().
    const accepted = options.acceptGaps || {};
    for (const [source, reason] of Object.entries(accepted)) {
      if (!gaps.some((gap) => gap.source === source)) throw new Error(`--accept-gap names a section that is not a gap in this ledger: ${source}`);
      if (typeof reason !== "string" || !reason.trim()) throw new Error(`--accept-gap needs a nonempty reason: ${source}`);
    }
    const unaccepted = gaps.filter((gap) => !accepted[gap.source]).map((gap) => gap.source);
    if (unaccepted.length) throw new Error(`Unaccepted gap(s): ${unaccepted.join(", ")} (a human must review each and pass --accept-gap SECTION=REASON)`);
    const acceptedGaps = gaps.map((gap) => ({ source: gap.source, reason: gap.reason, acceptedReason: accepted[gap.source] }));
    const record = { schemaVersion: 1, slug, sections: mapping.sections, coverage, gaps, acceptedGaps, committedAt: new Date(deps.clock.now()).toISOString() };
    if (options.apply) {
      requireNoPendingCompaction(root);
      const ctx = compactionContext(root);
      const relative = `${LEDGERS_DIR}/${slug}.json`;
      const before = snapshot(ctx, relative);
      transact(ctx, [{ path: relative, expected: before?.hash || null, value: { data: encode(`${JSON.stringify(record, null, 2)}\n`), mode: 0o644 } }]);
    }
    return { slug, coverage, gaps, acceptedGaps, applied: Boolean(options.apply) };
  }

  function readShippedDate(root: string, slug: string): string {
    const shipped = readText(path.join(pitchDir(root, slug), "SHIPPED.md")) || "";
    const match = shipped.match(/\*\*Shipped:\*\*\s*(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : new Date(deps.clock.now()).toISOString().slice(0, 10);
  }

  // Idempotent: a rerun for the same slug replaces only that slug's own section, in place if it
  // already existed (preserving surrounding sections' order), appended if it's new. Builds the
  // result from trimmed string joins rather than a line-array filter — a filter keyed on "is this
  // line equal to the file's last line" breaks the moment more than one blank line in the file
  // happens to be "", which is every blank line; found and fixed via a two-write repro.
  function writeDoneWork(root: string, slug: string, summaryText: string, options: { apply?: boolean } = {}): DoneResult {
    checkSlug(slug);
    if (typeof summaryText !== "string" || !summaryText.trim()) throw new Error("A nonempty summary is required");
    // A "# " or "## " line would split this pitch's section: the next rerun would end it there and orphan the tail,
    // and readers would take the line for another pitch's entry.
    if (/^#{1,2}\s/m.test(summaryText)) throw new Error("A summary cannot contain '#' or '##' heading lines");
    const file = full(root, DONE_WORK);
    assertPlainPath(root, DONE_WORK, true);
    // readText treats a symlink or non-regular file as absent; writing "fresh" over one would follow the
    // link and destroy its target, so refuse instead.
    let occupied: StatLike | null = null;
    try { occupied = fs.lstatSync(file); } catch (error) { if (codeOf(error) !== "ENOENT") throw error; }
    if (occupied && (occupied.isSymbolicLink() || !occupied.isFile())) throw new Error(`Refusing to write ${DONE_WORK}: it is a symlink or not a regular file`);
    const existingRaw = readText(file);
    const existing = existingRaw ?? "# Done Work\n";
    const lines = existing.split("\n");
    const heading = `## ${slug} — shipped `;
    const startIndex = lines.findIndex((line) => line.startsWith(heading));
    const section = [`## ${slug} — shipped ${readShippedDate(root, slug)}`, "", summaryText.trim(), ""].join("\n");
    let updated;
    if (startIndex === -1) {
      updated = `${existing.trimEnd()}\n\n${section}`;
    } else {
      let endIndex = lines.length;
      for (let index = startIndex + 1; index < lines.length; index++) {
        if (/^## /.test(lines[index])) { endIndex = index; break; }
      }
      const before = lines.slice(0, startIndex).join("\n").trimEnd();
      const after = lines.slice(endIndex).join("\n").trim();
      updated = after ? `${before}\n\n${section}\n\n${after}` : `${before}\n\n${section}`;
    }
    // Only the file's outer edge is normalized: other pitches' sections keep their own blank lines exactly.
    updated = `${updated.trimEnd()}\n`;
    const changed = existingRaw !== updated;
    if (options.apply) {
      // Temp file + rename: a reader never sees a partial file, and rename replaces a path rather than following it.
      const temporary = `${file}.tmp-${deps.proc.pid}-${deps.clock.now()}`;
      try { fs.writeFileSync(temporary, updated, { flag: "wx" }); fs.renameSync(temporary, file); } finally { fs.rmSync(temporary, { force: true }); }
    }
    return { slug, changed, content: updated };
  }

  function cli(argv: string[]): string {
    const options: CliOptions = { root: deps.proc.cwd() };
    const positional = [];
    for (let index = 0; index < argv.length; index++) {
      const arg = argv[index];
      if (["--root", "--file", "--summary", "--accept-gap"].includes(arg) && argv[index + 1] === undefined) throw new Error(`${arg} requires a value`);
      if (arg === "--json") options.json = true;
      else if (arg === "--apply") options.apply = true;
      else if (arg === "--root" && argv[index + 1] !== undefined) options.root = argv[++index];
      else if (arg === "--file" && argv[index + 1] !== undefined) options.file = argv[++index];
      else if (arg === "--summary" && argv[index + 1] !== undefined) options.summary = argv[++index];
      else if (arg === "--accept-gap" && argv[index + 1] !== undefined) {
        const value = argv[++index];
        const split = value.indexOf("=");
        if (split < 1) throw new Error(`--accept-gap expects SECTION=REASON, got: ${value}`);
        (options.acceptGaps ||= {})[value.slice(0, split)] = value.slice(split + 1);
      }
      else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
      else positional.push(arg);
    }
    const [action, slugArg] = positional;
    const root = fs.realpathSync(options.root);

    if (action === "inventory") {
      const result = inventory(root);
      if (options.json) return JSON.stringify(result, null, 2);
      return result.map((entry) => `${entry.slug}: ${entry.eligible ? "eligible" : `preserved (${entry.reason})`}`).join("\n");
    }
    if (action === "ledger") {
      const result = buildLedger(root, slugArg);
      return options.json ? JSON.stringify(result, null, 2) : result.required.join("\n");
    }
    if (action === "commit-ledger") {
      if (!options.file) throw new Error("commit-ledger requires --file <ledger.json>");
      const mapping = parseJson(fs.readFileSync(options.file), "the ledger file") as LedgerMapping;
      const result = commitLedger(root, slugArg, mapping, { apply: options.apply, acceptGaps: options.acceptGaps });
      return options.json ? JSON.stringify(result, null, 2) : `${result.slug}: coverage ${(result.coverage * 100).toFixed(0)}%, ${result.gaps.length} gap(s), applied=${result.applied}`;
    }
    if (action === "write-done-work") {
      if (!options.summary) throw new Error("write-done-work requires --summary <file>");
      const summaryText = fs.readFileSync(options.summary);
      const result = writeDoneWork(root, slugArg, summaryText, { apply: options.apply });
      return options.json ? JSON.stringify({ slug: result.slug, changed: result.changed, applied: Boolean(options.apply) }, null, 2) : (options.apply ? `wrote ${slugArg}` : result.content);
    }
    throw new Error("Usage: node ai-framework/scripts/pitch-compress.mts <inventory | ledger SLUG | commit-ledger SLUG --file F [--accept-gap SECTION=REASON]... | write-done-work SLUG --summary F> [--apply] [--root /absolute/project] [--json]");
  }

  return { inventory, classify, buildLedger, requiredSections, commitLedger, writeDoneWork, slugifyHeading, extractSection, checkDestination, assertPlainPath, compactionContext, requireNoPendingCompaction, cli };
}

export function inventory(root: string, deps: RuntimeDeps = defaultDeps()): PitchEntry[] {
  return createPitchCompress(deps).inventory(root);
}
export function classify(root: string, slug: string, deps: RuntimeDeps = defaultDeps()): PitchEntry {
  return createPitchCompress(deps).classify(root, slug);
}
export function buildLedger(root: string, slug: string, deps: RuntimeDeps = defaultDeps()): LedgerPlan {
  return createPitchCompress(deps).buildLedger(root, slug);
}
export function requiredSections(root: string, slug: string, deps: RuntimeDeps = defaultDeps()): string[] {
  return createPitchCompress(deps).requiredSections(root, slug);
}
export function commitLedger(root: string, slug: string, mapping: LedgerMapping, options: CommitOptions = {}, deps: RuntimeDeps = defaultDeps()): CommitResult {
  return createPitchCompress(deps).commitLedger(root, slug, mapping, options);
}
export function writeDoneWork(root: string, slug: string, summaryText: string, options: { apply?: boolean } = {}, deps: RuntimeDeps = defaultDeps()): DoneResult {
  return createPitchCompress(deps).writeDoneWork(root, slug, summaryText, options);
}
export function slugifyHeading(heading: string, deps: RuntimeDeps = defaultDeps()): string {
  return createPitchCompress(deps).slugifyHeading(heading);
}
export function extractSection(text: string, heading: string, deps: RuntimeDeps = defaultDeps()): string | null {
  return createPitchCompress(deps).extractSection(text, heading);
}
export function checkDestination(root: string, slug: string, destinationPath: string, original: string, deps: RuntimeDeps = defaultDeps()): void {
  return createPitchCompress(deps).checkDestination(root, slug, destinationPath, original);
}
export function assertPlainPath(base: string, relative: string, allowMissing = false, deps: RuntimeDeps = defaultDeps()): void {
  return createPitchCompress(deps).assertPlainPath(base, relative, allowMissing);
}
export function compactionContext(root: string, deps: RuntimeDeps = defaultDeps()): CompactionContext {
  return createPitchCompress(deps).compactionContext(root);
}
export function requireNoPendingCompaction(root: string, deps: RuntimeDeps = defaultDeps()): void {
  return createPitchCompress(deps).requireNoPendingCompaction(root);
}

/** CLI entry keeps sanitization and exit behavior identical to the former CommonJS script. */
export function main(argv: string[], deps: RuntimeDeps): number {
  try {
    deps.io.stdout.write(`${createPitchCompress(deps).cli(argv)}\n`);
    return 0;
  } catch (error) {
    const detail = syscallOf(error) && codeOf(error) ? `file system error (${codeOf(error)})` : messageOf(error);
    deps.io.stderr.write(`${String(`pitch-compress: ${detail}`).replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/g, "?")}\n`);
    return 1;
  }
}

runDirect(import.meta.url, main);
