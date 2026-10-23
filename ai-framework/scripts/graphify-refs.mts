import { projectNames, readProjectText, inspectProjectPath } from "./consolidation-migrate.mts";
import { OUTCOME_DIR, MAX_RECORD_BYTES, lintOutcomeText, outcomeTargets } from "./outcome-record.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

/** A doc->doc reference: `from` mentions `to`. Both are root-relative POSIX paths. */
export interface RefEdge { from: string; to: string }

/** Edge ceilings: distinct edges per source file, and distinct edges overall. */
export interface RefBudget { perFile: number; total: number }

/** Largest markdown source read, in bytes. Larger files are skipped with an error entry. */
export const MAX_SOURCE_BYTES = 1024 * 1024;
/** Per-source ceiling. Measured on this bundle: the busiest doc (harnesses.md) cites 16 distinct files, so 20 leaves headroom without letting one file fan out. */
export const DEFAULT_PER_FILE_REFS = 20;
/** Whole-graph ceiling. Roughly 30 sources x 12 refs plus slack; a flood past this is a bug, not a graph. */
export const DEFAULT_TOTAL_REFS = 400;
export const DEFAULT_REF_BUDGET: RefBudget = { perFile: DEFAULT_PER_FILE_REFS, total: DEFAULT_TOTAL_REFS };

export interface DeriveInput {
  /** Absolute project root. */
  root: string;
  /** Root-relative markdown paths to scan. */
  sources: string[];
  deps: RuntimeDeps;
  /** Maps a resolved path to its canonical file (e.g. a mirror to its source); `null` drops the mention. Default: identity. */
  canonicalOf?: (path: string) => string | null;
  budget?: RefBudget;
}

export interface DeriveResult {
  /** Every distinct edge, sorted by (from, to). Never truncated: a budget breach adds an error and keeps the edges. */
  edges: RefEdge[];
  errors: string[];
}

// A path-like token: at least one directory segment and a file extension. The lookbehind rejects tokens that
// start mid-path (after `/`, `.`, `\`, a word char, NUL), so `../x/y.md`, `/abs/x.md` and `a\b/c.md` never match.
const PATH_TOKEN = /(?<![\w./\\\0@-])((?:\.?[A-Za-z0-9_][A-Za-z0-9_.@-]*\/)+[A-Za-z0-9_][A-Za-z0-9_.@-]*\.[A-Za-z0-9]+)/g;

/** Removes fenced code blocks (``` and ~~~, closed by a fence of the same character and at least the same length). An unclosed fence runs to the end. */
export function stripFences(text: string): string {
  const kept: string[] = [];
  let fence: { char: string; length: number } | null = null;
  for (const line of text.split(/\r?\n/)) {
    const match = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      if (match && match[1][0] === fence.char && match[1].length >= fence.length && line.trim() === match[1]) fence = null;
      continue;
    }
    if (match) { fence = { char: match[1][0], length: match[1].length }; continue; }
    kept.push(line);
  }
  return kept.join("\n");
}

/** True for a root-relative POSIX path that cannot escape the root. */
function isSafeRelative(path: string): boolean {
  if (!path || path.startsWith("/") || /[\0\\]/.test(path) || /^[A-Za-z]:/.test(path)) return false;
  return path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

/** Resolves `rel` under `root` only when it is a regular file reached without any symlink (final or intermediate). */
function isRegularFile(deps: RuntimeDeps, root: string, rel: string): boolean {
  if (!isSafeRelative(rel)) return false;
  const parts = rel.split("/");
  let current = root;
  try {
    for (let i = 0; i < parts.length; i++) {
      current = deps.path.join(current, parts[i]);
      const stat = deps.fs.lstatSync(current);
      if (stat.isSymbolicLink()) return false;
      if (i < parts.length - 1 ? !stat.isDirectory() : !stat.isFile()) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Distinct, safe path-like tokens mentioned in `text`, in first-seen order. */
export function extractPathMentions(text: string): string[] {
  const seen = new Set<string>();
  for (const match of text.matchAll(PATH_TOKEN)) {
    const token = match[1];
    if (isSafeRelative(token)) seen.add(token);
  }
  return [...seen];
}

/**
 * Derives doc->doc reference edges from path mentions in markdown prose. Fenced code is ignored; only mentions that
 * resolve to an existing regular file under `root` count; mirrors collapse onto their canonical file via
 * `canonicalOf`; self-references and repeats collapse to one edge per pair. A budget breach is reported in
 * `errors` and the edges are still returned whole, so the caller decides what to do.
 */
export function deriveRefs(input: DeriveInput): DeriveResult {
  const { root, deps } = input;
  const budget = input.budget ?? DEFAULT_REF_BUDGET;
  const canonicalOf = input.canonicalOf ?? ((path: string): string | null => path);
  const errors: string[] = [];
  const pairs = new Map<string, RefEdge>();

  for (const from of [...new Set(input.sources)].sort()) {
    if (!isRegularFile(deps, root, from)) { errors.push(`${from}: not a readable regular file under root`); continue; }
    const file = deps.path.join(root, from);
    let text: string;
    try {
      if (deps.fs.statSync(file).size > MAX_SOURCE_BYTES) { errors.push(`${from}: larger than ${MAX_SOURCE_BYTES} bytes, skipped`); continue; }
      text = deps.fs.readFileSync(file);
    } catch (error) {
      errors.push(`${from}: could not be read (${(error as { code?: string }).code ?? "error"})`);
      continue;
    }
    if (text.length > MAX_SOURCE_BYTES) { errors.push(`${from}: larger than ${MAX_SOURCE_BYTES} bytes, skipped`); continue; }

    const targets = new Set<string>();
    for (const mention of extractPathMentions(stripFences(text))) {
      if (!isRegularFile(deps, root, mention)) continue;
      const canonical = canonicalOf(mention);
      if (canonical === null || canonical === from) continue;
      if (!isRegularFile(deps, root, canonical)) continue;
      targets.add(canonical);
    }
    if (targets.size > budget.perFile) errors.push(`${from}: ${targets.size} distinct references exceed per-file budget ${budget.perFile}`);
    for (const to of targets) pairs.set(`${from}\0${to}`, { from, to });
  }

  const edges = [...pairs.values()].sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : a.to < b.to ? -1 : a.to > b.to ? 1 : 0));
  if (edges.length > budget.total) errors.push(`total: ${edges.length} distinct references exceed total budget ${budget.total}`);
  return { edges, errors };
}

/** A file mentioned by more than this many sources is boilerplate (every skill's caveman paragraph names `skill-defaults.mts`), not a relation. */
export const REF_HUB_LIMIT = 20;

/** Drops edges whose target has more than `limit` distinct sources. Returns what was kept and the hubs dropped (with their source counts). Pure. */
export function dropHubTargets(edges: RefEdge[], limit: number = REF_HUB_LIMIT): { edges: RefEdge[]; hubs: { target: string; sources: number }[] } {
  const sources = new Map<string, number>();
  for (const edge of edges) sources.set(edge.to, (sources.get(edge.to) ?? 0) + 1);
  const hubs = [...sources].filter(([, count]) => count > limit).map(([target, count]) => ({ target, sources: count })).sort((a, b) => b.sources - a.sources || a.target.localeCompare(b.target));
  const dropped = new Set(hubs.map((hub) => hub.target));
  return { edges: edges.filter((edge) => !dropped.has(edge.to)), hubs };
}

/** Authoritative outcome links use their producer's record/count bounds, outside prose/hub heuristics. */
export function deriveOutcomeRefs(root: string, deps: RuntimeDeps): DeriveResult {
  const edges: RefEdge[] = [], errors: string[] = [];
  try {
    for (const name of projectNames(root, OUTCOME_DIR, deps).filter(name => name.endsWith(".md") && !name.startsWith("_"))) {
      const from = `${OUTCOME_DIR}/${name}`, text = readProjectText(root, from, MAX_RECORD_BYTES, deps);
      if (text === null) throw new Error("Outcome disappeared");
      const targets = outcomeTargets(text);
      // Refuse protected state before even inspecting a linked target. Routine graphs never read recovery data.
      for (const target of targets) {
        if (target.toLowerCase().startsWith(".project/compaction/")) throw new Error("Protected state target");
        if (!inspectProjectPath(root, target, deps)?.isFile()) throw new Error("Missing outcome target");
      }
      if (lintOutcomeText(root, from, text, deps).problems.length) throw new Error("Invalid outcome record");
      for (const to of targets) edges.push({ from, to });
    }
  } catch { errors.push("Outcome references refused: invalid record, unsafe path or exceeded shared bound"); }
  return { edges: errors.length ? [] : edges, errors };
}
