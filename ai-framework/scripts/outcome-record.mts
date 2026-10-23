#!/usr/bin/env node
import { runDirect } from "./runtime/cli.mts";
/*
 * Outcome record: a tiny per-pitch file `.project/records/shipped/<slug>.md` that only LINKS to where a shipped
 * pitch's lasting content lives (docs, decisions, knowledge, code, verification, followups, archive). It never holds
 * behavior or decisions itself, so removing the pitch folder loses nothing the record points at. This module owns the
 * format constants and the linter; the template is `ai-framework/templates/project/records/shipped/_template.md`.
 *
 * Link targets are project-root-relative paths (optional `#anchor`), written `[label](path)`. A target must be an
 * existing regular file under the root (symlinks refused) and must not sit in this record's own pitch folder.
 *
 * Usage: `outcome-record.mts lint <file-or-slug> [--json]` (a bare slug means `.project/records/shipped/<slug>.md`).
 * Exits 1 on any problem. Reads are bounded and stay under the root. Imports no node:* module at runtime.
 */

import type { RuntimeDeps } from "./runtime/types.mts";

export const OUTCOME_SCHEMA_VERSION = 1;
/** One size cap for every record, independent of pitch size (calibrated: legacy done-work entries had median 1352 B, max 7336 B). */
export const MAX_RECORD_BYTES = 3000;
export const MIN_PROSE_LINES = 3;
export const MAX_PROSE_LINES = 6;
export const MAX_LINE_LENGTH = 240;
export const MAX_LINKS_PER_FIELD = 12;
export const OUTCOME_FIELDS = ["outcome", "docs", "decisions", "knowledge", "code", "verification", "followups", "archive"] as const;
export const OUTCOME_DIR = ".project/records/shipped";

const LINK = /\[([^\]]*)\]\(([^)]*)\)/g;
const normalizedTarget = (target: string): string => target.split("/").filter(part => part !== "" && part !== ".").join("/");

type Stat = { isFile(): boolean; isSymbolicLink(): boolean; size: number };

function lstatOf(abs: string, deps: RuntimeDeps): Stat | null {
  try { return deps.fs.lstatSync(abs); } catch { return null; }
}

/** True when every component of `rel` under `root` is a non-symlink and the last one is a regular file. */
function regularFileUnder(root: string, rel: string, deps: RuntimeDeps): boolean {
  let current = root;
  const parts = rel.split("/");
  for (let i = 0; i < parts.length; i++) {
    current = deps.path.join(current, parts[i] as string);
    const stat = lstatOf(current, deps);
    if (!stat || stat.isSymbolicLink()) return false;
    if (i === parts.length - 1 && !stat.isFile()) return false;
  }
  return true;
}

function boundedRead(abs: string, deps: RuntimeDeps): string | null {
  let fd = -1;
  try {
    fd = deps.fs.openSync(abs, "r");
    const buffer = new Uint8Array(MAX_RECORD_BYTES + 1);
    let total = 0;
    while (total < buffer.length) {
      const n = deps.fs.readSync(fd, buffer, total, buffer.length - total, total);
      if (n <= 0) break;
      total += n;
    }
    return total > MAX_RECORD_BYTES ? null : new TextDecoder().decode(buffer.subarray(0, total));
  } catch {
    return null;
  } finally {
    if (fd >= 0) { try { deps.fs.closeSync(fd); } catch { /* ignore */ } }
  }
}

function validDate(text: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Drops HTML comment text (single or multi-line); comment lines are neither prose nor fields. */
function stripComments(lines: string[]): string[] {
  const out: string[] = [];
  let inside = false;
  for (const line of lines) {
    let rest = line;
    let kept = "";
    while (rest.length > 0) {
      if (inside) {
        const end = rest.indexOf("-->");
        if (end < 0) { rest = ""; break; }
        rest = rest.slice(end + 3);
        inside = false;
      } else {
        const start = rest.indexOf("<!--");
        if (start < 0) { kept += rest; rest = ""; break; }
        kept += rest.slice(0, start);
        rest = rest.slice(start + 4);
        inside = true;
      }
    }
    if (kept.trim().length > 0 || (!inside && line.trim().length === 0)) out.push(kept);
  }
  return out;
}

/** Returns a problem text for a bad link target, or null when it is acceptable. `target` has its `#anchor` removed. */
function targetProblem(root: string, target: string, slug: string, self: string, deps: RuntimeDeps): string | null {
  if (target.length === 0) return "empty link target";
  if (target.startsWith("/") || /^[A-Za-z]:/.test(target)) return `link target is absolute: ${target}`;
  if (target.includes("\0")) return "link target contains a NUL byte";
  if (target.includes("\\")) return `link target contains a backslash: ${target}`;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(target)) return `link target has a URL scheme: ${target}`;
  if (target.split("/").includes("..") || target.includes("..")) return `link target contains "..": ${target}`;
  const clean = normalizedTarget(target);
  // Case-folded: on a case-insensitive file system these names alias the real ones.
  if (clean.toLowerCase() === self.toLowerCase()) return `link target is the record itself: ${target}`;
  if (clean.toLowerCase().startsWith(`.project/pitches/${slug.toLowerCase()}/`)) return `link target is inside this record's own pitch folder (deleted on removal): ${target}`;
  if (!regularFileUnder(root, clean, deps)) return `link target is not an existing regular file under the root: ${target}`;
  // Spelling is not identity: a file system may fold characters (`ſ` to `s`) that toLowerCase does not, so compare device and inode
  // of every ancestor with this record's pitch folder.
  try {
    const folder = deps.fs.statSync(deps.path.join(root, ".project/pitches", slug));
    for (let current = deps.path.join(root, clean); ; current = deps.path.dirname(current)) {
      const stat = deps.fs.statSync(current);
      if (stat.dev === folder.dev && stat.ino === folder.ino) return `link target is inside this record's own pitch folder (deleted on removal): ${target}`;
      if (current === root || deps.path.dirname(current) === current) break;
    }
  } catch { /* no pitch folder left: nothing to alias */ }
  return null;
}

/**
 * Control characters in text that came from a file would act on the terminal that prints it, and a line feed would let a file name
 * forge extra lines in a report. Every caller prints one line per value, so line feeds are replaced too.
 */
export const printable = (text: string): string => text.replace(/[\u0000-\u001f\u007f-\u009f]/g, "?");

export function lintOutcomeRecord(root: string, rel: string, deps: RuntimeDeps): { problems: string[] } {
  const problems: string[] = [];
  try {
    lintInto(root, rel, deps, problems);
  } catch (error) {
    problems.push(`lint failed unexpectedly: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { problems: problems.map(printable) };
}

/** Validate a proposed publication with the same content/link rules as the file reader. */
export function lintOutcomeText(root: string, rel: string, text: string, deps: RuntimeDeps): { problems: string[] } {
  const problems: string[] = [];
  try { lintInto(root, rel, deps, problems, text); }
  catch { problems.push("Outcome content validation failed"); }
  return { problems: problems.map(printable) };
}

/**
 * The two values other tools take from a record, read from the same comment-stripped text the lint judged (so a value the lint
 * never saw cannot reach a generated file). Returns nulls when absent; it does not validate.
 */
export function outcomeFields(text: string): { shipped: string | null; outcome: string | null } {
  const lines = stripComments(text.split(/\r?\n/));
  const shipped = lines.map((line) => /^shipped: (\d{4}-\d{2}-\d{2})$/.exec(line)?.[1]).find(Boolean) ?? null;
  const outcome = lines.map((line) => /^- outcome: (.+)$/.exec(line)?.[1]).find(Boolean)?.trim() ?? null;
  return { shipped, outcome };
}

/** Explicit targets in validated link fields, with comments and anchors removed. */
export function outcomeTargets(text: string): string[] {
  const targets = new Set<string>();
  for (const line of stripComments(text.split(/\r?\n/))) {
    const field = /^- ([a-z]+): (.+)$/.exec(line);
    if (!field || field[1] === "outcome" || !(OUTCOME_FIELDS as readonly string[]).includes(field[1])) continue;
    for (const match of field[2].matchAll(LINK)) targets.add(normalizedTarget(match[2].split("#")[0]));
  }
  return [...targets].sort();
}

/** True when any directory on the way to `rel` (not the last part) is a symlink. */
function passesThroughSymlink(root: string, rel: string, deps: RuntimeDeps): boolean {
  let current = root;
  const parts = rel.split("/");
  for (const part of parts.slice(0, -1)) {
    current = deps.path.join(current, part);
    const stat = lstatOf(current, deps);
    if (stat && stat.isSymbolicLink()) return true;
  }
  return false;
}

function lintInto(root: string, rel: string, deps: RuntimeDeps, problems: string[], proposed?: string): void {
  const norm = rel.split("/").filter((part) => part !== "" && part !== ".").join("/");
  if (norm.startsWith("..") || norm.includes("/../") || norm.includes("\0") || rel.startsWith("/")) { problems.push(`record path is outside the project root: ${rel}`); return; }
  const abs = deps.path.join(root, norm);
  if (passesThroughSymlink(root, norm, deps)) { problems.push(`record path passes through a symlink (refused): ${norm}`); return; }
  let text = proposed;
  if (text === undefined) {
    const stat = lstatOf(abs, deps);
    if (!stat) { problems.push(`record file is missing: ${norm}`); return; }
    if (stat.isSymbolicLink()) { problems.push(`record is a symlink (refused): ${norm}`); return; }
    if (!stat.isFile()) { problems.push(`record is not a regular file: ${norm}`); return; }
    if (stat.size > MAX_RECORD_BYTES) { problems.push(`record is larger than ${MAX_RECORD_BYTES} bytes`); return; }
    text = boundedRead(abs, deps) ?? undefined;
  }
  if (text === undefined || new TextEncoder().encode(text).length > MAX_RECORD_BYTES) { problems.push(`record is larger than ${MAX_RECORD_BYTES} bytes or unreadable`); return; }

  const name = norm.slice(norm.lastIndexOf("/") + 1);
  const stem = name.endsWith(".md") ? name.slice(0, -3) : name;
  const all = text.split(/\r?\n/);

  // Frontmatter
  let slug = stem;
  let bodyStart = 0;
  if (all[0] !== "---") {
    problems.push("frontmatter is missing or malformed (the file must start with ---)");
  } else {
    const end = all.indexOf("---", 1);
    if (end < 0) {
      problems.push("frontmatter is missing or malformed (no closing ---)");
    } else {
      bodyStart = end + 1;
      const meta = new Map<string, string>();
      let malformed = false;
      for (const line of all.slice(1, end)) {
        if (line.trim() === "") continue;
        const m = /^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/.exec(line);
        if (!m || meta.has(m[1] as string)) { malformed = true; continue; }
        meta.set(m[1] as string, (m[2] as string).trim());
      }
      const keys = ["slug", "shipped", "schemaVersion"];
      if (malformed || keys.some((key) => !meta.has(key)) || [...meta.keys()].some((key) => !keys.includes(key))) {
        problems.push("frontmatter is missing or malformed (need exactly slug, shipped, schemaVersion)");
      }
      if (meta.has("slug") && meta.get("slug") !== stem) problems.push(`frontmatter slug "${meta.get("slug")}" does not equal the file name stem "${stem}"`);
      if (meta.has("shipped") && !validDate(meta.get("shipped") as string)) problems.push(`frontmatter shipped is not a valid YYYY-MM-DD date: "${meta.get("shipped")}"`);
      if (meta.has("schemaVersion") && meta.get("schemaVersion") !== String(OUTCOME_SCHEMA_VERSION)) problems.push(`frontmatter schemaVersion must be ${OUTCOME_SCHEMA_VERSION}`);
    }
  }

  // Body
  const body = stripComments(all.slice(bodyStart));
  const lines = body.filter((line) => line.trim() !== "");
  const headings = lines.filter((line) => /^#{1,6}(\s|$)/.test(line));
  const first = lines[0];
  if (first !== `# ${slug}`) problems.push(`the first line after frontmatter must be the heading "# ${slug}"`);
  for (const heading of headings) {
    if (heading === first) continue;
    problems.push(/^#{2,}/.test(heading) ? `a heading that restates a section is not allowed: ${heading}` : `only the single "# ${slug}" heading is allowed: ${heading}`);
  }

  const fieldRe = /^- ([A-Za-z]+):(?: (.*))?$/;
  const prose: string[] = [];
  const fields: Array<{ name: string; value: string }> = [];
  for (const line of lines) {
    if (/^#{1,6}(\s|$)/.test(line)) continue;
    const m = fieldRe.exec(line);
    if (m) fields.push({ name: m[1] as string, value: (m[2] ?? "").trim() });
    else if (fields.length === 0) prose.push(line.trim());
    else problems.push(`unexpected line after the fields (line ${all.indexOf(line) + 1 || "?"}; its text is not shown)`);
  }

  if (prose.length < MIN_PROSE_LINES) problems.push(`prose has ${prose.length} lines; need at least ${MIN_PROSE_LINES}`);
  if (prose.length > MAX_PROSE_LINES) problems.push(`prose has ${prose.length} lines; at most ${MAX_PROSE_LINES} allowed`);
  prose.forEach((line, index) => { if (line.length > MAX_LINE_LENGTH) problems.push(`prose line ${index + 1} is ${line.length} chars; at most ${MAX_LINE_LENGTH} allowed`); });

  // Fields
  const names = fields.map((field) => field.name);
  const known = new Set<string>(OUTCOME_FIELDS);
  for (const field of OUTCOME_FIELDS) {
    const count = names.filter((n) => n === field).length;
    if (count === 0) problems.push(`field is missing: ${field}`);
    if (count > 1) problems.push(`field is duplicated: ${field}`);
  }
  for (const n of new Set(names)) if (!known.has(n)) problems.push(`unknown field: ${n}`);
  const present = names.filter((n, i) => known.has(n) && names.indexOf(n) === i);
  const expected = OUTCOME_FIELDS.filter((n) => present.includes(n));
  if (present.some((n, i) => n !== expected[i])) problems.push(`fields are out of order; expected ${OUTCOME_FIELDS.join(", ")}`);

  for (const field of fields) {
    if (!known.has(field.name) || names.indexOf(field.name) !== fields.indexOf(field)) continue;
    if (field.name === "outcome") {
      if (field.value === "") problems.push("outcome is empty");
      else if (field.value.length > MAX_LINE_LENGTH) problems.push(`outcome is ${field.value.length} chars; at most ${MAX_LINE_LENGTH} allowed`);
      continue;
    }
    if (field.value === "none") continue;
    const links = [...field.value.matchAll(LINK)];
    const leftover = field.value.replace(LINK, "").replace(/[,\s]/g, "");
    if (links.length === 0 || leftover !== "") { problems.push(`${field.name} must be "none" or one or more markdown links [label](path)`); continue; }
    if (links.length > MAX_LINKS_PER_FIELD) problems.push(`${field.name} has ${links.length} links; at most ${MAX_LINKS_PER_FIELD} allowed`);
    for (const link of links) {
      const target = (link[2] as string).split("#")[0] as string;
      const problem = targetProblem(root, target, slug, norm, deps);
      if (problem) problems.push(`${field.name}: ${problem}`);
    }
  }
}

export function main(argv: string[], deps: RuntimeDeps): number {
  const json = argv.includes("--json");
  const args = argv.filter((arg) => !arg.startsWith("--"));
  if (args[0] !== "lint" || !args[1]) {
    deps.io.stderr.write("usage: outcome-record.mts lint <file-or-slug> [--json]\n");
    return 2;
  }
  const root = deps.proc.cwd();
  let rel = args[1];
  if (!rel.includes("/") && !rel.endsWith(".md")) rel = `${OUTCOME_DIR}/${rel}.md`;
  else if (rel.startsWith("/")) rel = deps.path.relative(root, rel);
  const { problems } = lintOutcomeRecord(root, rel, deps);
  if (json) deps.io.stdout.write(`${JSON.stringify({ ok: problems.length === 0, file: rel, problems })}\n`);
  else if (problems.length > 0) deps.io.stdout.write(`${problems.join("\n")}\n`);
  return problems.length === 0 ? 0 : 1;
}

runDirect(import.meta.url, main);
