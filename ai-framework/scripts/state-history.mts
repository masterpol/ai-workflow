/*
 * History for the /state report: a per-pitch timeline, cooldown names and the followups count.
 * Every markdown read goes through the caller's guarded reader (size-bounded, symlink- and
 * FIFO-refusing). Parsers walk lines with indexOf and run a regex only over one bounded line, never
 * over a whole file, so a hostile 64 KB file cannot make them quadratic (security.md section 9).
 * A source that is missing, cut at the size limit or in an unrecognized format downgrades its own
 * field with a reason; it is never reported as 0. See ai-framework/integrations/state-report.md.
 */
import type { RuntimeDeps } from "./runtime/types.mts";
import type { Fact, StructureHelpers } from "./state-structure.mts";
export interface ScanLimits { markdownBytes: number; maxItems: number; maxLessons: number; maxCooldowns: number }
export const DEFAULT_LIMITS: ScanLimits = { markdownBytes: 64 * 1024, maxItems: 100, maxLessons: 10, maxCooldowns: 50 };
export type Availability = "observed" | "partial" | "unavailable";
export interface Sub<T> { value: T; availability: Availability; reason?: string }
export interface KnowledgeEntry { id: string; source: string | null; updated: string | null }
export type AuditValue = { cycles: number | null; mustFix: number | null };
type ReadMarkdown = StructureHelpers["readMarkdown"];
type Scrub = (text: unknown) => string;
export interface HistoryInput {
  items: Fact[]; doneWork: Fact; knowledge: KnowledgeEntry[] | null;
  readMarkdown: ReadMarkdown; scrub: Scrub; limits?: Partial<ScanLimits>;
}
type Loaded = { text: string; truncated: boolean } | { reason: string };
type Slot = { header: boolean; rows: number };
const MAX_LINE = 4000, MAX_RUNS = 20000;
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/;
const COOLDOWN = /^cooldown-\d{4}-\d{2}-\d{2}(?:-[a-z0-9-]{1,60})?\.md$/;
const CYCLE_FILE = /^audit-cycle-\d{1,3}\.md$/;
const RESOLVED = ["**Resolved", "**Done", "**Shipped"];
const MUST_FIX = "must-fix (cycle ", ARCHIVES = ".project/compaction/archives", RUNS = ".project/runs";
const truncatedNote = (relative: string, limit: number): string => `${relative} exceeds the ${Math.round(limit / 1024)} KB read limit; entries past that point are not counted`;
const sub = <T,>(value: T, availability: Availability, reason?: string): Sub<T> => (reason === undefined ? { value, availability } : { value, availability, reason });
const none = (reason: string): Sub<null> => sub(null, "unavailable", reason);
const mk = <T,>(value: T, status: string, evidence: string[] = [], note?: string): Fact<T> => (note === undefined ? { value, status, evidence } : { value, status, evidence, note });
const noRead = (loaded: Loaded): string => ("reason" in loaded ? loaded.reason : "");
/** Bounded lines of a text, found with indexOf; a line over MAX_LINE is cut so a regex never sees more. */
function* lines(text: string): Generator<string> {
  let at = 0;
  while (at <= text.length) {
    let end = text.indexOf("\n", at);
    if (end < 0) end = text.length;
    let stop = Math.min(end, at + MAX_LINE);
    if (stop === end && stop > at && text.charCodeAt(stop - 1) === 13) stop--;
    yield text.slice(at, stop);
    at = end + 1;
  }
}
const cells = (line: string): string[] => line.split("|").slice(1, -1).map((cell) => cell.trim());
const isRule = (row: string[]): boolean => row.every((cell) => /^:?-+:?$/.test(cell));
/** Counts one table: the first row is the header, rule rows are skipped, optionally rows naming "refuted". */
function addRow(table: Slot, line: string, skipRefuted: boolean): void {
  const row = cells(line);
  if (!table.header) { table.header = true; return; }
  if (isRule(row) || (skipRefuted && row.some((cell) => /refuted/i.test(cell)))) return;
  table.rows++;
}
function leadingNumber(rest: string): number | null {
  let i = 0;
  while (i < rest.length && i <= 4 && rest.charCodeAt(i) >= 48 && rest.charCodeAt(i) <= 57) i++;
  if (i === 0 || i > 4 || /[A-Za-z0-9]/.test(rest.charAt(i))) return null;
  return Number(rest.slice(0, i)) || null;
}
/** Recognized audit formats only: `## Must-fix (cycle N)` and `## Cycle N` with a `### Must-fix` table. */
function parseAudit(text: string): Map<number, Slot> {
  const cycles = new Map<number, Slot>();
  const slot = (n: number): Slot => { let s = cycles.get(n); if (!s) { s = { header: false, rows: 0 }; cycles.set(n, s); } return s; };
  let target: Slot | null = null;
  let own: Slot | null = null;
  for (const line of lines(text)) {
    if (line.startsWith("## ")) {
      const rest = line.slice(3).trim().toLowerCase();
      const a = rest.startsWith(MUST_FIX) ? leadingNumber(rest.slice(MUST_FIX.length)) : null;
      const b = rest.startsWith("cycle ") ? leadingNumber(rest.slice(6)) : null;
      target = a === null ? null : slot(a);
      own = b === null ? null : slot(b);
    } else if (line.startsWith("# ")) { target = null; own = null; }
    else if (line.startsWith("### ")) { if (own) target = line.slice(4).trim().toLowerCase().startsWith("must-fix") ? own : null; }
    else if (target && line.startsWith("|")) addRow(target, line, true);
  }
  return cycles;
}
function auditFromText(text: string, truncated: boolean, limit: number): Sub<AuditValue> {
  const cycles = parseAudit(text);
  if (cycles.size === 0) return sub({ cycles: null, mustFix: null }, "unavailable", "unrecognized audit format");
  const last = Math.max(...cycles.keys());
  let rows = 0;
  let missing: number | null = null;
  for (let n = 1; n <= last; n++) { const found = cycles.get(n); if (found?.header) rows += found.rows; else missing ??= n; }
  const reason = missing !== null ? `cycle ${missing} has no must-fix table` : truncated ? truncatedNote("audit record", limit) : undefined;
  return reason ? sub({ cycles: last, mustFix: null }, "partial", reason) : sub({ cycles: last, mustFix: rows }, "observed");
}
function revisionRows(text: string): number | null {
  const table: Slot = { header: false, rows: 0 };
  let inside = false;
  for (const line of lines(text)) {
    if (line.startsWith("#")) inside = line.startsWith("## ") && line.slice(3).trim().toLowerCase() === "revisions";
    else if (inside && line.startsWith("|")) addRow(table, line, false);
  }
  return table.header ? table.rows : null;
}
function hillDone(text: string): { done: number; total: number } | null {
  let column = -1, done = 0, total = 0;
  let seen = false;
  for (const line of lines(text)) {
    if (!line.startsWith("|")) continue;
    const row = cells(line);
    if (!seen) { seen = true; column = row.map((cell) => cell.toLowerCase()).indexOf("position"); if (column < 0) return null; continue; }
    if (isRule(row)) continue;
    total++;
    if (/^done$/i.test(row[column] ?? "")) done++;
  }
  return seen ? { done, total } : null;
}
function dateBullets(text: string): { first: string; last: string } | null {
  let first = "", last = "";
  for (const line of lines(text)) {
    if (!line.startsWith("- ") || !DAY.test(line.slice(2, 12))) continue;
    last = line.slice(2, 12);
    first ||= last;
  }
  return first ? { first, last } : null;
}
function followupSections(text: string): { sections: number; open: number } {
  let sections = 0, closed = 0;
  let resolved = false;
  for (const line of lines(text)) {
    if (line.startsWith("## ")) { sections++; resolved = false; }
    else if (sections > 0 && !resolved && RESOLVED.some((marker) => line.startsWith(marker))) { resolved = true; closed++; }
  }
  return { sections, open: sections - closed };
}
interface Ctx {
  load: (relative: string) => Loaded; scrub: Scrub; limits: ScanLimits; used: string[]; runs: string[]; archives: string[];
  knowledge: KnowledgeEntry[] | null; list: (relative: string, cap: number) => string[] | null; realDir: (relative: string) => boolean;
}
type Archive = { dir?: string; reason?: string };
function loader(root: string, readMarkdown: ReadMarkdown, scrub: Scrub, limit: number, used: string[]) {
  return (relative: string): Loaded => {
    let read: ReturnType<ReadMarkdown>;
    try { read = readMarkdown(root, relative); } catch { return { reason: "could not be read" }; }
    if (typeof read.text !== "string") return { reason: read.missing ? "file not present" : scrub(read.error ?? "could not be read") };
    used.push(relative);
    const cut = read.text.length > limit;
    return { text: cut ? read.text.slice(0, limit) : read.text, truncated: Boolean(read.truncated) || cut };
  };
}
/** Builds `followups` for `risks.openFollowups`: sections, not items (the file has no single resolution marker). */
export function followupsFact(root: string, readMarkdown: ReadMarkdown, limits: Partial<ScanLimits> = {}): Fact {
  const limit = limits.markdownBytes ?? DEFAULT_LIMITS.markdownBytes;
  const relative = ".project/pitches/_followups.md";
  const loaded = loader(root, readMarkdown, (text) => String(text).slice(0, 80), limit, [])(relative);
  if ("reason" in loaded) return mk(null, "unavailable", [], `${relative} ${loaded.reason}`);
  const note = "counts sections, not items; a section is open without a line starting **Resolved, **Done or **Shipped";
  return mk(followupSections(loaded.text), loaded.truncated ? "stale" : "observed", [relative], loaded.truncated ? `${truncatedNote(relative, limit)}; ${note}` : note);
}
/** Newest `runs/<date>-<slug><suffix>.md` by exact name. */
const newestRun = (ctx: Ctx, slug: string, suffix: string): string | null => ctx.runs
  .filter((name) => name.length === 14 + slug.length + suffix.length && DAY.test(name.slice(0, 10)) && name[10] === "-" && name.slice(11) === `${slug}${suffix}.md`)
  .sort().pop() ?? null;
function archiveFor(ctx: Ctx, slug: string): Archive {
  const names = ctx.archives.filter((name) => name.length === slug.length + 25 && name.startsWith(`${slug}-`) && STAMP.test(name.slice(slug.length + 1))).sort().reverse();
  if (names.length === 0) return { reason: "no compaction archive" };
  for (const name of names) if (ctx.realDir(`${ARCHIVES}/${name}/files`)) return { dir: `${ARCHIVES}/${name}/files` };
  return { reason: "archive directory is not a real directory" };
}
/** The pitch's own file, else the same file in its newest archive; `why` is the most informative failure. */
function recordOf(ctx: Ctx, slug: string, name: string, archive: Archive): { loaded: Loaded; why: string } {
  const active = ctx.load(`.project/pitches/${slug}/${name}`);
  const absent = noRead(active) === "file not present";
  if ("text" in active || !archive.dir) return { loaded: active, why: absent && archive.reason ? archive.reason : noRead(active) };
  const old = ctx.load(`${archive.dir}/${name}`);
  return { loaded: old, why: absent ? noRead(old) : noRead(active) };
}
function fromRecord<T>(ctx: Ctx, loaded: Loaded, parse: (text: string) => T | null, lack: string, label: string): Sub<T | null> {
  if ("reason" in loaded) return none(`${lack}: ${loaded.reason}`);
  const found = parse(loaded.text);
  if (found === null) return none(lack);
  return sub(found, loaded.truncated ? "partial" : "observed", loaded.truncated ? truncatedNote(label, ctx.limits.markdownBytes) : undefined);
}
function fromRuns<T>(ctx: Ctx, slug: string, name: string, suffix: string, parse: (text: string) => T | null, lack: string) {
  let loaded = ctx.load(`.project/pitches/${slug}/${name}`);
  const run = "text" in loaded ? null : newestRun(ctx, slug, suffix);
  if (run) loaded = ctx.load(`${RUNS}/${run}`);
  return fromRecord(ctx, loaded, parse, lack, name);
}
function lessonsOf(ctx: Ctx, slug: string) {
  if (!ctx.knowledge) return { lessons: none("knowledge graph unavailable"), lessonsTotal: null };
  const ids = ctx.knowledge.filter((entry) => entry.source === slug).map((entry) => entry.id).sort();
  return { lessons: sub(ids.slice(0, ctx.limits.maxLessons).map((id) => ctx.scrub(id)), "observed"), lessonsTotal: ids.length };
}
function auditOf(ctx: Ctx, slug: string, archive: Archive): Sub<AuditValue> {
  const { loaded, why } = recordOf(ctx, slug, "audit.md", archive);
  if ("text" in loaded) return auditFromText(loaded.text, loaded.truncated, ctx.limits.markdownBytes);
  const files = (archive.dir ? ctx.list(archive.dir, 500) ?? [] : []).filter((name) => CYCLE_FILE.test(name)).length;
  if (files > 0) return sub({ cycles: files, mustFix: null }, "partial", "audit-cycle files are counted by name and not read");
  return sub({ cycles: null, mustFix: null }, "unavailable", `no audit record: ${why}`);
}
function itemFor(ctx: Ctx, slug: string, item: Fact, done: Map<string, string>, doneCut: boolean): Fact {
  ctx.used.length = 0;
  const value = item.value as Record<string, unknown>;
  const archive = archiveFor(ctx, slug);
  const shipped = typeof value.shipped === "string" ? value.shipped : done.get(slug) ?? null;
  const cut = value.phase === "compacted" && shipped === null && doneCut;
  const body = {
    slug, phase: ctx.scrub(value.phase), appetite: typeof value.appetite === "string" ? ctx.scrub(value.appetite) : null, shipped,
    scopes: fromRuns(ctx, slug, "hill.md", "-hill", hillDone, "no hill record"), ...lessonsOf(ctx, slug), audit: auditOf(ctx, slug, archive),
    revisions: fromRecord(ctx, recordOf(ctx, slug, "pitch.md", archive).loaded, revisionRows, "no Revisions table", "pitch.md"),
    dates: fromRuns(ctx, slug, "log.md", "", dateBullets, "no dated bullet"),
  };
  const note = cut ? truncatedNote(".project/done-work.md", ctx.limits.markdownBytes) : item.status === "stale" ? item.note : undefined;
  return mk(body, cut || item.status === "stale" ? "stale" : "observed", [...(item.evidence ?? []), ...ctx.used].slice(0, 12), note);
}
function cooldownFact(runs: string[], limits: ScanLimits): Fact {
  const names = runs.filter((name) => name.length <= 100 && COOLDOWN.test(name)).sort();
  const shown = names.slice(-limits.maxCooldowns);
  const cut = names.length > shown.length;
  return mk(shown, cut ? "stale" : "observed", shown.slice(0, 5).map((name) => `${RUNS}/${name}`), names.length === 0 ? "none recorded" : cut ? `newest ${shown.length} of ${names.length} cooldown records` : undefined);
}
function bindStateHistory(deps: RuntimeDeps) {
  const { fs, path } = deps;
  const realDirIn = (root: string) => (relative: string): boolean => {
    let current = root;
    const real =(): boolean => { try { const stat = fs.lstatSync(current); return !stat.isSymbolicLink() && stat.isDirectory(); } catch { return false; } };
    return relative.split("/").every((part) => { current = path.join(current, part); return real(); });
  };
  /** Builds `history`: { items, cooldowns, limits }, each a fact or an array of facts. */
  function historySection(root: string, input: HistoryInput): { items: Fact[] | Fact; cooldowns: Fact; limits: Fact } {
    const limits: ScanLimits = { ...DEFAULT_LIMITS, ...input.limits };
    const realDir = realDirIn(root);
    const list = (relative: string, cap: number): string[] | null => {
      if (!realDir(relative)) return null;
      try { return fs.readdirSync(path.join(root, relative)).slice(0, cap); } catch { return null; }
    };
    const runs = list(RUNS, MAX_RUNS);
    const cooldowns = runs ? cooldownFact(runs, limits) : mk(null, "unavailable", [], "no .project/runs directory");
    if (!Array.isArray(input.items)) return { items: mk(null, "unavailable", [], "pitch items are unavailable"), cooldowns, limits: mk(null, "unavailable") };
    const used: string[] = [];
    const load = loader(root, input.readMarkdown, input.scrub, limits.markdownBytes, used);
    const ctx: Ctx = { load, scrub: input.scrub, limits, used, runs: runs ?? [], archives: list(ARCHIVES, MAX_RUNS) ?? [], knowledge: input.knowledge, list, realDir };
    const done = new Map<string, string>();
    const entries = (input.doneWork?.value as { entries?: unknown } | null)?.entries;
    for (const entry of Array.isArray(entries) ? entries : []) if (typeof entry?.slug === "string" && typeof entry?.shipped === "string") done.set(entry.slug, entry.shipped);
    const slugs: Array<[string, Fact]> = [];
    let rejected = 0;
    for (const item of input.items) {
      const slug = (item?.value as { slug?: unknown } | null)?.slug;
      if (typeof slug === "string" && slug.length <= 80 && SLUG.test(slug)) slugs.push([slug, item]); else rejected++;
    }
    slugs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    const items = slugs.slice(0, limits.maxItems).map(([slug, item]) => itemFor(ctx, slug, item, done, input.doneWork?.status === "stale"));
    const cut = Math.max(0, slugs.length - limits.maxItems);
    const value = { rejectedSlugs: rejected, truncatedItems: cut, maxItems: limits.maxItems, markdownBytes: limits.markdownBytes };
    return { items, cooldowns, limits: mk(value, cut > 0 ? "stale" : "observed", [], cut > 0 ? `only the first ${limits.maxItems} pitches are listed` : "pitch names outside the slug allow-list are counted, never read") };
  }
  return { historySection, followupsFact };
}
export function createStateHistory(deps: RuntimeDeps): ReturnType<typeof bindStateHistory> { return bindStateHistory(deps); }
