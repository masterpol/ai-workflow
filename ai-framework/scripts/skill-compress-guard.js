/*
 * Consulted before a human approves running caveman-compress against a target file. It never
 * runs the actual compression and never reimplements backup/restore — caveman-compress already
 * backs up the original file to an out-of-tree data dir before overwriting. This guard adds the
 * one thing upstream has no knowledge of: this project's own historical/precision-sensitive
 * record guardrails (CLAUDE.md), which upstream would otherwise happily "compress."
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

// Checked most-specific-first so a path under .project/pitches/_archive/ reports the archive
// reason rather than the more general pitches reason. Matched against a lowercased, symlink-
// resolved relative path (see resolveReal below) — lowercasing is always the safe direction: on
// a case-sensitive filesystem it can only make an unrelated path look (harmlessly) protected,
// never let a real protected path slip through, and on the case-insensitive filesystems this
// project actually ships on by default (macOS/Windows) it is required for correctness.
const PROTECTED_DIRS = [
  { dir: ".project/pitches/_archive", reason: "protected path: archived pitch record under .project/pitches/_archive/ may never be rewritten" },
  { dir: ".project/pitches", reason: "protected path: pitch record under .project/pitches/ may never be rewritten" },
  { dir: ".project/design", reason: "protected path: design record under .project/design/ may never be rewritten" },
  { dir: ".project/knowledge", reason: "protected path: knowledge graph record under .project/knowledge/ may never be rewritten" },
];

const GLOB_CHARS = /[*?[\]{}]/;

// Resolves symlinks on every existing ancestor (and the target itself, if it exists) before any
// protection check runs — a symlink placed at an allowed path and pointing at a protected file,
// or a symlinked ancestor directory (e.g. .project/skills/), must never let the real destination
// read as unprotected. Existing precedent: bundle-sync.js's isSafeProjectPath and
// skill-registry.js's resolveFile both resolve/walk real paths rather than trusting the lexical
// one; this mirrors that pattern for a read-only advisory check instead of a write path.
function resolveReal(root, targetPath) {
  const absolute = path.isAbsolute(targetPath) ? targetPath : path.join(root, targetPath);
  const suffix = [];
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
function canCompress(root, targetPath) {
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
  const { real, existed } = resolveReal(root, targetPath);
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

// Reports, never assumes: same execFileSync(..., { stdio: "ignore" }) presence-check pattern
// already proven in skill-sync.js's discoverFormatter and skill-defaults.js's runtimeStatus.
// Never installs or invokes python3 for any purpose beyond this one presence check.
function pythonAvailable() {
  try {
    execFileSync("python3", ["--version"], { stdio: "ignore", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

module.exports = { canCompress, pythonAvailable };
