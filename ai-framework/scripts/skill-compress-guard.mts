/*
 * Consulted before a human approves running caveman-compress against a target file. It never
 * runs the actual compression and never reimplements backup/restore — caveman-compress already
 * backs up the original file to an out-of-tree data dir before overwriting. This guard adds the
 * one thing upstream has no knowledge of: this project's own historical/precision-sensitive
 * record guardrails (CLAUDE.md), which upstream would otherwise happily "compress."
 */

import type { RuntimeDeps } from "./runtime/types.mts";
import { createNodeDeps } from "./runtime/node.mts";

export interface CompressVerdict { allowed: boolean; reason: string | null }

let nodeDeps: RuntimeDeps | undefined;
function defaultDeps(): RuntimeDeps {
  return (nodeDeps ??= createNodeDeps());
}

// Checked most-specific-first so a path under .project/pitches/_archive/ reports the archive
// reason rather than the more general pitches reason. Matched against a lowercased, symlink-
// resolved relative path (see resolveReal below) — lowercasing is always the safe direction: on
// a case-sensitive filesystem it can only make an unrelated path look (harmlessly) protected,
// never let a real protected path slip through, and on the case-insensitive filesystems this
// project actually ships on by default (macOS/Windows) it is required for correctness.
const PROTECTED_DIRS: { dir: string; reason: string }[] = [
  { dir: ".project/pitches/_archive", reason: "protected path: archived pitch record under .project/pitches/_archive/ may never be rewritten" },
  { dir: ".project/pitches", reason: "protected path: pitch record under .project/pitches/ may never be rewritten" },
  { dir: ".project/design", reason: "protected path: design record under .project/design/ may never be rewritten" },
  { dir: ".project/knowledge", reason: "protected path: knowledge graph record under .project/knowledge/ may never be rewritten" },
];

const GLOB_CHARS = /[*?[\]{}]/;

// Resolves symlinks on every existing ancestor (and the target itself, if it exists) before any
// protection check runs — a symlink placed at an allowed path and pointing at a protected file,
// or a symlinked ancestor directory (e.g. .project/skills/), must never let the real destination
// read as unprotected. Existing precedent: bundle-sync.mts's isSafeProjectPath and
// skill-registry.mts's resolveFile both resolve/walk real paths rather than trusting the lexical
// one; this mirrors that pattern for a read-only advisory check instead of a write path.
function resolveReal(root: string, targetPath: string, deps: RuntimeDeps): { real: string; existed: boolean } {
  const { fs, path } = deps;
  const absolute = path.isAbsolute(targetPath) ? targetPath : path.join(root, targetPath);
  const suffix: string[] = [];
  let current = absolute;
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return { real: absolute, existed: false }; // no existing ancestor at all
    suffix.unshift(path.basename(current));
    current = parent;
  }
  const realBase = fs.realpathSync(current);
  return { real: suffix.length ? path.join(realBase, ...suffix) : realBase, existed: suffix.length === 0 };
}

// Never runs compression, never backs up or restores a file — read-only advice consulted
// before a human approves the actual caveman-compress invocation.
export function canCompress(root: string, targetPath: unknown, deps: RuntimeDeps = defaultDeps()): CompressVerdict {
  const { fs, path } = deps;
  if (typeof targetPath !== "string") {
    return { allowed: false, reason: "target must be a single exact path (a string), not an array or pattern" };
  }
  if (!targetPath.trim()) {
    return { allowed: false, reason: "target path must not be empty" };
  }
  if (GLOB_CHARS.test(targetPath)) {
    return { allowed: false, reason: "target path must be an exact path, not a glob pattern" };
  }

  const realRoot = fs.realpathSync(root);
  const { real, existed } = resolveReal(root, targetPath, deps);
  const relativeRaw = path.relative(realRoot, real);
  if (relativeRaw.startsWith("..") || path.isAbsolute(relativeRaw)) {
    return { allowed: false, reason: "target resolves outside the project root (directly or via a symlink)" };
  }
  const relative = relativeRaw.split(path.sep).join("/").toLowerCase();
  for (const { dir, reason } of PROTECTED_DIRS) {
    if (relative === dir || relative.startsWith(`${dir}/`)) return { allowed: false, reason };
  }

  if (!existed) {
    return { allowed: false, reason: "target path does not exist" };
  }

  return { allowed: true, reason: null };
}

// Reports, never assumes: same presence-check pattern already proven in skill-sync's
// discoverFormatter and skill-defaults' runtimeStatus.
// Never installs or invokes python3 for any purpose beyond this one presence check.
export function pythonAvailable(deps: RuntimeDeps = defaultDeps()): boolean {
  try {
    return deps.child.runSync("python3", ["--version"], { stdio: "ignore", timeoutMs: 5000 }).status === 0;
  } catch {
    return false;
  }
}
