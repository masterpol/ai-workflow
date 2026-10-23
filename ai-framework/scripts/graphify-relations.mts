#!/usr/bin/env node
import { runDirect } from "./runtime/cli.mts";
/*
 * Relations manifest for the workflow graph. Graphify derives structure from code and markdown headings, but not
 * which phase skill owns which phase doc, which agents a phase dispatches, or which rules gate a role. Those are
 * declared once in `ai-framework/workflow/relations.toon` (bundle-owned, TOON data grammar 1.0) and, for a project's
 * own skills, agents and rules, in the optional `.project/relations.toon` overlay (never written by a bundle sync).
 *
 * Declared per entry: `phaseDoc`, `dispatches`, `reads`, `writes`, or `standalone: <reason>`. Derived here, never
 * declared: `mirrors` (a vendor adapter -> its canonical `.claude` file). Doc-to-doc `references` come from
 * `graphify-refs.mts`.
 *
 * `checkRelations` validates the manifests against the tree: targets exist, every canonical file is covered, every
 * adapter has a canonical. A refused manifest is reported and never rewritten (this module writes nothing); an absent
 * overlay is normal. Registry-owned skills (`.project/skills/registry.json`) need no entry.
 *
 * Flags: --check (default), --json. Exits 1 on any problem. Imports no node:* module at runtime.
 */

import type { RuntimeDeps } from "./runtime/types.mts";
import { readData } from "./runtime/data-file.mts";
import { ownedPaths } from "./skill-sync.mts";

export const MANIFEST_FILE = "ai-framework/workflow/relations.toon";
export const OVERLAY_FILE = ".project/relations.toon";
export const MANIFEST_SCHEMA_VERSION = 1;
/** One bound shared by the writer of the manifest and every reader (`coding-standards.md`, Producer and Reader Share One Bound). */
export const MAX_ENTRIES = 400;
export const MAX_TARGETS = 24;
export const MAX_REASON_LENGTH = 240;
export const MAX_PATH_LENGTH = 200;

export type DeclaredRelation = "phase-doc" | "dispatches" | "reads" | "writes";
export type RelationKind = DeclaredRelation | "mirrors";

export interface RelationEntry {
  path: string;
  phaseDoc?: string;
  dispatches?: string[];
  reads?: string[];
  writes?: string[];
  standalone?: string;
}
export interface RelationEdge { from: string; to: string; relation: RelationKind }
export interface RelationProblem { code: string; text: string; path?: string }
export interface RelationsResult {
  problems: RelationProblem[];
  edges: RelationEdge[];
  entries: number;
  overlayEntries: number;
  /** Canonical files left to the skill registry, so they need no entry. */
  registryOwned: string[];
}

export const problemCodes = {
  absent: "REL-ABSENT",
  refused: "REL-REFUSED",
  version: "REL-VERSION",
  shape: "REL-SHAPE",
  unknownField: "REL-UNKNOWN-FIELD",
  duplicate: "REL-DUPLICATE",
  overlayShadow: "REL-OVERLAY-SHADOW",
  path: "REL-PATH",
  targetMissing: "REL-TARGET-MISSING",
  targetMirror: "REL-TARGET-MIRROR",
  noEdges: "REL-NO-EDGES",
  unlisted: "REL-UNLISTED",
  adapterNoCanonical: "REL-ADAPTER-NO-CANONICAL",
  tooMany: "REL-TOO-MANY",
} as const;

const DECLARED: ReadonlyArray<readonly [keyof RelationEntry, DeclaredRelation]> = [
  ["phaseDoc", "phase-doc"], ["dispatches", "dispatches"], ["reads", "reads"], ["writes", "writes"],
];
const ENTRY_FIELDS = new Set(["path", "standalone", ...DECLARED.map(([field]) => field as string)]);

/** Vendor adapter locations and the canonical `.claude` file each one points at. */
const MIRRORS: ReadonlyArray<{ dir: string; suffix: string; canonical: (name: string) => string }> = [
  { dir: ".opencode/agents", suffix: ".md", canonical: (name) => `.claude/agents/${name}.md` },
  { dir: ".codex/agents", suffix: ".toml", canonical: (name) => `.claude/agents/${name}.md` },
  { dir: ".cursor/agents", suffix: ".md", canonical: (name) => `.claude/agents/${name}.md` },
  { dir: ".opencode/commands", suffix: ".md", canonical: (name) => `.claude/skills/${name}/SKILL.md` },
];
const SKILL_MIRROR_DIRS = [".opencode/skills", ".agents/skills", ".cursor/skills"];

/** Maps a vendor adapter path to its canonical file; any other path is returned unchanged. Never maps to a mirror. */
export function canonicalOf(path: string): string {
  for (const mirror of MIRRORS) {
    if (path.startsWith(`${mirror.dir}/`) && path.endsWith(mirror.suffix)) {
      const name = path.slice(mirror.dir.length + 1, path.length - mirror.suffix.length);
      if (name && !name.includes("/")) return mirror.canonical(name);
    }
  }
  for (const dir of SKILL_MIRROR_DIRS) {
    const match = path.startsWith(`${dir}/`) && path.endsWith("/SKILL.md") ? path.slice(dir.length + 1, -"/SKILL.md".length) : "";
    if (match && !match.includes("/")) return `.claude/skills/${match}/SKILL.md`;
  }
  return path;
}

export function isMirror(path: string): boolean {
  return canonicalOf(path) !== path;
}

/** True when `path` is a regular file and no part of the way to it, directories included, is a symlink. */
function isFile(path: string, root: string, deps: RuntimeDeps): boolean {
  try {
    let current = root;
    const parts = path.split("/");
    for (let i = 0; i < parts.length; i++) {
      current = deps.path.join(current, parts[i] as string);
      const stat = deps.fs.lstatSync(current);
      if (stat.isSymbolicLink()) return false;
      if (i === parts.length - 1) return stat.isFile();
    }
    return false;
  } catch {
    return false;
  }
}

function listDir(root: string, rel: string, deps: RuntimeDeps): string[] {
  try {
    let current = root;
    for (const part of rel.split("/")) {
      current = deps.path.join(current, part);
      if (deps.fs.lstatSync(current).isSymbolicLink()) return [];
    }
    return deps.fs.readdirEntriesSync(deps.path.join(root, rel)).filter((entry) => !entry.isSymbolicLink()).map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name)).sort();
  } catch {
    return [];
  }
}

/** Canonical files that must be covered: skills, agents, bundle rules, project rules and phase docs. */
export function canonicalFiles(root: string, deps: RuntimeDeps): string[] {
  const out: string[] = [];
  for (const name of listDir(root, ".claude/skills", deps)) if (name.endsWith("/") && isFile(`.claude/skills/${name}SKILL.md`, root, deps)) out.push(`.claude/skills/${name}SKILL.md`);
  for (const dir of [".claude/agents", "ai-framework/rules", "ai-framework/workflow/phases", ".project/rules"]) {
    for (const name of listDir(root, dir, deps)) {
      if (name.endsWith(".md") && name !== "README.md" && isFile(`${dir}/${name}`, root, deps)) out.push(`${dir}/${name}`);
    }
  }
  return out;
}

/** Every adapter file found on disk (a file under a mirror location, whether or not its canonical exists). */
export function adapterFiles(root: string, deps: RuntimeDeps): string[] {
  const out: string[] = [];
  for (const mirror of MIRRORS) for (const name of listDir(root, mirror.dir, deps)) if (name.endsWith(mirror.suffix) && isFile(`${mirror.dir}/${name}`, root, deps)) out.push(`${mirror.dir}/${name}`);
  for (const dir of SKILL_MIRROR_DIRS) for (const name of listDir(root, dir, deps)) if (name.endsWith("/") && isFile(`${dir}/${name}SKILL.md`, root, deps)) out.push(`${dir}/${name}SKILL.md`);
  return out;
}

function safePath(value: unknown): value is string {
  if (typeof value !== "string" || value === "" || value.length > MAX_PATH_LENGTH) return false;
  if (value.includes("\0") || value.includes("\\") || value.startsWith("/") || /^[A-Za-z]:/.test(value)) return false;
  return value.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}

interface Loaded { entries: RelationEntry[]; problems: RelationProblem[]; present: boolean; /** The file could not be trusted at all, so coverage findings from it would be noise. */ fatal?: boolean }

function stringList(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? (value as string[]) : null;
}

/** Reads one manifest. A refusal yields problems and no entries; the file is never touched. */
export function loadManifest(root: string, rel: string, deps: RuntimeDeps, optional: boolean): Loaded {
  const read = readData(root, rel, deps);
  if (read.status === "absent") {
    return { entries: [], present: false, fatal: !optional, problems: optional ? [] : [{ code: problemCodes.absent, text: `${rel} is missing; sync the bundle (it ships this manifest)`, path: rel }] };
  }
  if (read.status === "refused") {
    return { entries: [], present: false, fatal: true, problems: [{ code: problemCodes.refused, text: `${rel} was refused (${read.code}): ${read.text}; fix or restore it, it is not rewritten`, path: rel }] };
  }
  const problems: RelationProblem[] = [];
  const version = read.value.schemaVersion;
  if (version !== MANIFEST_SCHEMA_VERSION) {
    const named = typeof version === "number" || typeof version === "string" ? String(version) : "missing";
    problems.push({ code: problemCodes.version, text: `${rel} has schemaVersion ${named}, this script reads ${MANIFEST_SCHEMA_VERSION}; sync the bundle scripts (they ship with the manifest) before using it`, path: rel });
    return { entries: [], present: true, fatal: true, problems };
  }
  const raw = read.value.entries;
  if (raw === undefined) return { entries: [], present: true, problems };
  if (!Array.isArray(raw)) return { entries: [], present: true, fatal: true, problems: [{ code: problemCodes.shape, text: `${rel}: entries must be a list`, path: rel }] };
  if (raw.length > MAX_ENTRIES) return { entries: [], present: true, fatal: true, problems: [{ code: problemCodes.tooMany, text: `${rel}: ${raw.length} entries exceed the limit of ${MAX_ENTRIES}`, path: rel }] };
  const entries: RelationEntry[] = [];
  const seen = new Set<string>();
  raw.forEach((item, index) => {
    const label = `${rel} entry ${index + 1}`;
    if (typeof item !== "object" || item === null || Array.isArray(item)) { problems.push({ code: problemCodes.shape, text: `${label} must be an object`, path: rel }); return; }
    const record = item as Record<string, unknown>;
    for (const key of Object.keys(record)) if (!ENTRY_FIELDS.has(key)) problems.push({ code: problemCodes.unknownField, text: `${label}: unknown relation kind "${key}" (allowed: ${[...ENTRY_FIELDS].join(", ")})`, path: rel });
    if (!safePath(record.path)) { problems.push({ code: problemCodes.path, text: `${label}: path must be a relative path inside the project`, path: rel }); return; }
    const entry: RelationEntry = { path: record.path };
    if (seen.has(record.path)) { problems.push({ code: problemCodes.duplicate, text: `${rel}: ${record.path} is listed twice`, path: record.path }); return; }
    seen.add(record.path);
    if (record.phaseDoc !== undefined) {
      if (!safePath(record.phaseDoc)) problems.push({ code: problemCodes.path, text: `${label}: phaseDoc must be a relative path`, path: record.path });
      else entry.phaseDoc = record.phaseDoc;
    }
    for (const field of ["dispatches", "reads", "writes"] as const) {
      if (record[field] === undefined) continue;
      const list = stringList(record[field]);
      if (!list || !list.every(safePath)) { problems.push({ code: problemCodes.shape, text: `${label}: ${field} must be a list of relative paths`, path: record.path }); continue; }
      if (list.length > MAX_TARGETS) { problems.push({ code: problemCodes.tooMany, text: `${label}: ${field} has ${list.length} targets, limit ${MAX_TARGETS}`, path: record.path }); continue; }
      entry[field] = [...new Set(list)];
    }
    if (record.standalone !== undefined) {
      if (typeof record.standalone !== "string" || record.standalone.trim() === "" || record.standalone.length > MAX_REASON_LENGTH) problems.push({ code: problemCodes.shape, text: `${label}: standalone needs a reason of 1-${MAX_REASON_LENGTH} characters`, path: record.path });
      else entry.standalone = record.standalone;
    }
    entries.push(entry);
  });
  return { entries, present: true, problems };
}

export function declaredEdges(entry: RelationEntry): RelationEdge[] {
  const edges: RelationEdge[] = [];
  for (const [field, relation] of DECLARED) {
    const value = entry[field];
    for (const to of Array.isArray(value) ? value : typeof value === "string" ? [value] : []) edges.push({ from: entry.path, to, relation });
  }
  return edges;
}

export interface CheckOptions {
  /** Lowercased registry-owned paths; defaults to the project's skill registry. */
  owned?: Set<string>;
}

/** Validates the bundle manifest plus the optional project overlay against the tree. Writes nothing. */
export function checkRelations(root: string, deps: RuntimeDeps, options: CheckOptions = {}): RelationsResult {
  const bundle = loadManifest(root, MANIFEST_FILE, deps, false);
  const overlay = loadManifest(root, OVERLAY_FILE, deps, true);
  const problems = [...bundle.problems, ...overlay.problems];
  const result: RelationsResult = { problems, edges: [], entries: bundle.entries.length, overlayEntries: overlay.entries.length, registryOwned: [] };
  // A manifest that could not be trusted gives no basis for coverage findings.
  if (bundle.fatal || overlay.fatal) return result;

  const bundlePaths = new Set(bundle.entries.map((entry) => entry.path));
  const entries = [...bundle.entries];
  for (const entry of overlay.entries) {
    if (bundlePaths.has(entry.path)) problems.push({ code: problemCodes.overlayShadow, text: `${OVERLAY_FILE} lists ${entry.path}, which the bundle manifest already owns; remove it from the overlay`, path: entry.path });
    else entries.push(entry);
  }

  const owned = options.owned ?? ownedPaths(root, deps);
  const isOwned = (path: string): boolean => owned.has(path.toLowerCase());
  const inbound = new Set<string>();
  const edges: RelationEdge[] = [];
  for (const entry of entries) {
    const out = declaredEdges(entry);
    if (!isFile(entry.path, root, deps)) problems.push({ code: problemCodes.targetMissing, text: `${entry.path} is listed in a relations manifest but is not a file`, path: entry.path });
    if (out.length === 0 && entry.standalone === undefined) problems.push({ code: problemCodes.noEdges, text: `${entry.path} has no phaseDoc, dispatches, reads or writes and no standalone reason`, path: entry.path });
    for (const edge of out) {
      if (isMirror(edge.to)) problems.push({ code: problemCodes.targetMirror, text: `${entry.path} -> ${edge.to}: a relation must name the canonical file, not a vendor mirror (${canonicalOf(edge.to)})`, path: entry.path });
      else if (!isFile(edge.to, root, deps)) problems.push({ code: problemCodes.targetMissing, text: `${entry.path} -> ${edge.to}: target does not exist`, path: entry.path });
      else { inbound.add(edge.to); edges.push(edge); }
    }
  }

  const listed = new Set(entries.map((entry) => entry.path));
  for (const file of canonicalFiles(root, deps)) {
    if (listed.has(file) || inbound.has(file)) continue;
    if (isOwned(file)) { result.registryOwned.push(file); continue; }
    problems.push({ code: problemCodes.unlisted, text: `${file} has no relations entry; add one to ${bundlePaths.size > 0 && file.startsWith(".project/") ? OVERLAY_FILE : `${MANIFEST_FILE} (bundle file) or ${OVERLAY_FILE} (this project's own file)`}`, path: file });
  }
  for (const adapter of adapterFiles(root, deps)) {
    const canonical = canonicalOf(adapter);
    if (isFile(canonical, root, deps)) edges.push({ from: adapter, to: canonical, relation: "mirrors" });
    else if (!isOwned(adapter) && !isOwned(canonical)) problems.push({ code: problemCodes.adapterNoCanonical, text: `${adapter} mirrors ${canonical}, which does not exist`, path: adapter });
  }
  result.edges = edges.sort((a, b) => (a.from + a.relation + a.to).localeCompare(b.from + b.relation + b.to));
  result.registryOwned.sort();
  return result;
}

export function main(argv: string[], deps: RuntimeDeps): number {
  const json = argv.includes("--json");
  const result = checkRelations(deps.proc.cwd(), deps);
  const counts: Record<string, number> = {};
  for (const edge of result.edges) counts[edge.relation] = (counts[edge.relation] ?? 0) + 1;
  if (json) {
    deps.io.stdout.write(`${JSON.stringify({ ok: result.problems.length === 0, entries: result.entries, overlayEntries: result.overlayEntries, edges: counts, registryOwned: result.registryOwned, problems: result.problems })}\n`);
  } else {
    // Paths come from project files; a control character in one would act on the terminal that prints it.
    for (const problem of result.problems) deps.io.stderr.write(`${problem.code} ${problem.text.replace(/[\u0000-\u001f\u007f-\u009f]/g, "?")}\n`);
    deps.io.stdout.write(`relations: ${result.entries} entries${result.overlayEntries ? ` + ${result.overlayEntries} overlay` : ""}, ${Object.entries(counts).map(([kind, n]) => `${n} ${kind}`).join(", ") || "no edges"}, ${result.problems.length} problem(s)\n`);
  }
  return result.problems.length === 0 ? 0 : 1;
}

runDirect(import.meta.url, main);
