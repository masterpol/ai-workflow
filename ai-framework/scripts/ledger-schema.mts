/*
 * The coverage-ledger contract, shared by every writer and reader of `.project/compaction/ledgers/<slug>.json`
 * (`pitch-compress`, `pitch-archive`, `setup-validator`, `legacy-upgrade`), so a limit or a rule changes in one place
 * (`coding-standards.md`, Producer and Reader Share One Bound).
 *
 * Version 1 (kept readable): `sections[]` of `{source, status: extracted|gap, destination?, reason?}`.
 * Version 2: every section also carries a `class`, a `disposition`, a `helps` line for what is kept, a closed omission
 * `reason`, and a `bodyHash` binding the entry to the content it was judged against. `otherFiles[]` accounts for every
 * pitch file that no section covers, one entry per file or, for a large folder, one *group* entry (a path ending in `/`)
 * bound by a tree hash over every member's path and hash. A reader that does not know a version refuses; it never guesses.
 *
 * Pure: no file system, clock or process access. Hashing goes through the caller's `digest`.
 */

export const LEDGER_V1 = 1;
export const LEDGER_V2 = 2;
export type LedgerVersion = typeof LEDGER_V1 | typeof LEDGER_V2;

export const CLASSES = ["behavior", "decision", "know-how", "rule", "limit", "omit"] as const;
export const DISPOSITIONS = ["extracted", "merged", "omitted"] as const;
/** Why content may be dropped. `other` is a gap: it needs a separate, named human acceptance. */
export const OMIT_REASONS = ["duplicate", "superseded", "process-noise", "resolved-false-positive", "failed-approach", "other"] as const;
export type LedgerClass = (typeof CLASSES)[number];
export type Disposition = (typeof DISPOSITIONS)[number];
export type OmitReason = (typeof OMIT_REASONS)[number];

export const MAX_SECTIONS = 200;
/** Most entries in `otherFiles` (a group counts once). */
export const MAX_OTHER_FILES = 200;
/** Most files a pitch folder may hold outside its covered sections, counting every member of every group. */
export const MAX_PITCH_FILES = 2000;
export const MAX_SOURCE_LENGTH = 300;
export const MAX_DESTINATION_LENGTH = 300;
export const MAX_HELPS_LENGTH = 240;
export const MAX_REASON_LENGTH = 240;
/** The most a ledger file may weigh; readers refuse anything larger. */
export const MAX_LEDGER_BYTES = 2 * 1024 * 1024;
export const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;

export const DONE_WORK_FILE = ".project/done-work.md";
export const OUTCOME_RECORD_DIR = ".project/records/shipped/";
export const PITCHES_PREFIX = ".project/pitches/";

export interface LedgerSectionV2 {
  source: string;
  class: LedgerClass;
  disposition: Disposition;
  destination?: string;
  helps?: string;
  reason?: OmitReason;
  bodyHash: string;
}
export interface LedgerFileV2 {
  path: string;
  disposition: Disposition;
  destination?: string;
  helps?: string;
  reason?: OmitReason;
  hash: string;
  /** Group entries only: how many files the tree hash covers. */
  count?: number;
}

export interface FileRef { path: string; hash: string }

/** A group entry's path is a folder prefix ending in `/`; every file under it is covered by that one entry. */
export function isGroupPath(entryPath: string): boolean {
  return entryPath.endsWith("/");
}

/** Tree hash of a group: every member's path and hash in code-point order. Any add, drop, rename or edit changes it; the count is stored and checked beside it. */
export function groupHashOf(members: FileRef[], digest: (data: string) => string): string {
  const sorted = [...members].sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  return `sha256:${digest(sorted.map((member) => `${member.path}\t${member.hash}`).join("\n"))}`;
}

export interface FileAccount { unaccounted: string[]; absent: string[]; changed: string[]; overlapping: string[] }

/**
 * The one definition of "every pitch file is accounted for", used by the writer and the removal gate. A single entry covers its
 * exact path; a group entry covers every file under its prefix, bound by count and tree hash. Pure: no file access.
 */
export function accountFiles(live: FileRef[], entries: { path: string; hash: string; count?: number }[], digest: (data: string) => string): FileAccount {
  const groups = entries.filter((entry) => isGroupPath(entry.path));
  const singles = entries.filter((entry) => !isGroupPath(entry.path));
  const account: FileAccount = { unaccounted: [], absent: [], changed: [], overlapping: [] };
  const singleHash = new Map(singles.map((entry) => [entry.path, entry.hash]));
  for (const entry of singles) {
    if (groups.some((group) => entry.path.startsWith(group.path))) account.overlapping.push(entry.path);
    else if (!live.some((file) => file.path === entry.path)) account.absent.push(entry.path);
  }
  groups.forEach((group, index) => {
    if (groups.some((other, at) => at !== index && (group.path.startsWith(other.path) || other.path.startsWith(group.path)))) account.overlapping.push(group.path);
  });
  for (const file of live) {
    const inGroups = groups.filter((group) => file.path.startsWith(group.path));
    if (inGroups.length > 1) continue;
    if (inGroups.length === 0 && !singleHash.has(file.path)) account.unaccounted.push(file.path);
    else if (inGroups.length === 0 && singleHash.get(file.path) !== file.hash) account.changed.push(file.path);
  }
  for (const group of groups) {
    const members = live.filter((file) => file.path.startsWith(group.path));
    if (members.length === 0) account.absent.push(group.path);
    else if (group.count !== members.length || group.hash !== groupHashOf(members, digest)) account.changed.push(group.path);
  }
  return account;
}

/** Hash of a section body, insensitive to line endings and trailing whitespace. */
export function bodyHashOf(text: string, digest: (data: string) => string): string {
  return `sha256:${digest(text.replace(/\r\n/g, "\n").trimEnd())}`;
}

/** The path part of a destination (`file#anchor`), or null when it is not a plain project-relative path. */
export function destinationPath(destination: string): string | null {
  const file = destination.split("#")[0];
  if (file === "" || file.length > MAX_DESTINATION_LENGTH || file.includes("\0") || file.includes("\\") || file.startsWith("/")) return null;
  return file.split("/").every((part) => part !== "" && part !== "." && part !== "..") ? file : null;
}

/**
 * Path-only rules for where kept content may live. Null means acceptable on its face; existence, size and realpath
 * checks stay with the writer. A pitch folder is deleted or goes stale, and the narrative index and outcome record
 * only link to behavior and decisions, they never hold them.
 */
export function destinationRefusal(destination: string, cls?: LedgerClass): string | null {
  const file = destinationPath(destination);
  if (file === null) return "destination must be a relative path inside the project";
  // Compared case-folded: on a case-insensitive file system `.project/Pitches/x` is the pitch folder.
  const folded = file.toLowerCase();
  if (folded.startsWith(PITCHES_PREFIX)) return `destination is under ${PITCHES_PREFIX}, which is not a lasting home for content`;
  if ((cls === "behavior" || cls === "decision") && (folded === DONE_WORK_FILE || folded.startsWith(OUTCOME_RECORD_DIR))) {
    return `${cls} content must live in its owning document, not in ${folded === DONE_WORK_FILE ? DONE_WORK_FILE : OUTCOME_RECORD_DIR}`;
  }
  return null;
}

const SECTION_KEYS = new Set(["source", "class", "disposition", "destination", "helps", "reason", "bodyHash"]);
const FILE_KEYS = new Set(["path", "disposition", "destination", "helps", "reason", "hash", "count"]);

function text(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim() !== "" && value.length <= max;
}

/** Fields shared by a section and an other-file entry, checked for one disposition. */
function checkEntry(label: string, entry: Record<string, unknown>, cls: unknown, allowed: Set<string>, problems: string[]): void {
  for (const key of Object.keys(entry)) if (!allowed.has(key)) problems.push(`${label}: unknown field ${JSON.stringify(key)}`);
  const disposition = entry.disposition;
  if (!(DISPOSITIONS as readonly unknown[]).includes(disposition)) { problems.push(`${label}: disposition must be one of ${DISPOSITIONS.join(", ")}`); return; }
  if (disposition === "omitted") {
    if (!(OMIT_REASONS as readonly unknown[]).includes(entry.reason)) problems.push(`${label}: omitted needs a reason from ${OMIT_REASONS.join(", ")}`);
    if (entry.reason === "failed-approach" && !text(entry.destination, MAX_DESTINATION_LENGTH)) problems.push(`${label}: a failed-approach omission needs the destination of its lesson`);
    if (entry.helps !== undefined) problems.push(`${label}: an omitted entry has no helps line`);
    return;
  }
  if (!text(entry.destination, MAX_DESTINATION_LENGTH)) { problems.push(`${label}: ${String(disposition)} needs a destination`); } else {
    const refusal = destinationRefusal(entry.destination, typeof cls === "string" ? (cls as LedgerClass) : undefined);
    if (refusal) problems.push(`${label}: ${refusal}`);
  }
  if (!text(entry.helps, MAX_HELPS_LENGTH)) problems.push(`${label}: ${String(disposition)} needs a helps line of 1-${MAX_HELPS_LENGTH} characters`);
  if (entry.reason !== undefined) problems.push(`${label}: only an omitted entry has a reason`);
}

export interface ShapeResult { version: LedgerVersion | null; problems: string[] }

/** Structural validation of a parsed ledger, no file access. Used by every reader; never throws. */
export function validateLedgerShape(value: unknown, slug: string): ShapeResult {
  const problems: string[] = [];
  if (typeof value !== "object" || value === null || Array.isArray(value)) return { version: null, problems: ["ledger must be an object"] };
  const ledger = value as Record<string, unknown>;
  const version = ledger.schemaVersion;
  if (version !== LEDGER_V1 && version !== LEDGER_V2) return { version: null, problems: [`unsupported ledger schemaVersion ${typeof version === "string" ? JSON.stringify(version) : String(version)}; this tool reads ${LEDGER_V1} and ${LEDGER_V2}`] };
  if (ledger.slug !== slug) problems.push("ledger slug does not match");
  const sections = ledger.sections;
  if (!Array.isArray(sections) || sections.length === 0) return { version, problems: [...problems, "ledger needs a nonempty sections array"] };
  if (sections.length > MAX_SECTIONS) return { version, problems: [...problems, `ledger has ${sections.length} sections, limit ${MAX_SECTIONS}`] };
  const seen = new Set<string>();
  sections.forEach((raw, index) => {
    const label = `section ${index + 1}`;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) { problems.push(`${label} must be an object`); return; }
    const entry = raw as Record<string, unknown>;
    if (!text(entry.source, MAX_SOURCE_LENGTH)) { problems.push(`${label} needs a source`); return; }
    if (seen.has(entry.source)) problems.push(`duplicate ledger entry: ${entry.source}`);
    seen.add(entry.source);
    if (version === LEDGER_V1) {
      if (entry.status !== "extracted" && entry.status !== "gap") problems.push(`${entry.source}: status must be extracted or gap`);
      return;
    }
    if (!(CLASSES as readonly unknown[]).includes(entry.class)) problems.push(`${entry.source}: class must be one of ${CLASSES.join(", ")}`);
    else if ((entry.class === "omit") !== (entry.disposition === "omitted")) problems.push(`${entry.source}: class omit and disposition omitted go together`);
    if (typeof entry.bodyHash !== "string" || !HASH_PATTERN.test(entry.bodyHash)) problems.push(`${entry.source}: bodyHash must be sha256:<64 hex>`);
    checkEntry(entry.source, entry, entry.class, SECTION_KEYS, problems);
  });
  if (version === LEDGER_V2) {
    const files = ledger.otherFiles;
    if (!Array.isArray(files)) problems.push("a version 2 ledger needs an otherFiles list (empty when the pitch has no other files)");
    else if (files.length > MAX_OTHER_FILES) problems.push(`ledger has ${files.length} otherFiles, limit ${MAX_OTHER_FILES}`);
    else {
      const paths = new Set<string>();
      const groupPrefixes: string[] = [];
      files.forEach((raw, index) => {
        const label = `otherFiles ${index + 1}`;
        if (typeof raw !== "object" || raw === null || Array.isArray(raw)) { problems.push(`${label} must be an object`); return; }
        const entry = raw as Record<string, unknown>;
        const group = typeof entry.path === "string" && isGroupPath(entry.path);
        const plain = group ? (entry.path as string).slice(0, -1) : entry.path;
        if (!text(entry.path, MAX_SOURCE_LENGTH) || typeof plain !== "string" || destinationPath(plain) === null) { problems.push(`${label} needs a relative path`); return; }
        if (paths.has(entry.path)) problems.push(`duplicate otherFiles entry: ${entry.path}`);
        paths.add(entry.path);
        if (group) {
          groupPrefixes.push(entry.path);
          if (!Number.isInteger(entry.count) || (entry.count as number) < 1 || (entry.count as number) > MAX_PITCH_FILES) problems.push(`${entry.path}: a group needs a file count of 1-${MAX_PITCH_FILES}`);
        } else if (entry.count !== undefined) problems.push(`${entry.path}: only a group entry (a path ending in /) has a count`);
        if (typeof entry.hash !== "string" || !HASH_PATTERN.test(entry.hash)) problems.push(`${entry.path}: hash must be sha256:<64 hex>`);
        checkEntry(entry.path, entry, undefined, FILE_KEYS, problems);
      });
      for (const prefix of groupPrefixes) {
        for (const other of paths) if (other !== prefix && other.startsWith(prefix)) problems.push(`${other}: overlaps the group ${prefix}; a file belongs to one entry`);
      }
    }
  }
  return { version, problems };
}
