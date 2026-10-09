/* Resolves a project's CLAUDE.md to its effective content when it loads AGENTS.md through
 * Claude Code's native `@AGENTS.md` import. Read-only; shared by setup-validator, workflow-doctor
 * and bundle-sync so every check sees the same text Claude Code would load. */

import type { RuntimeDeps } from "./runtime/types.mts";
import { createNodeDeps } from "./runtime/node.mts";

export type EntryKind = "none" | "import" | "invalid";
export interface EntryResolution { kind: EntryKind; content: string; detail: string }

const TARGET = "AGENTS.md";
const MAX_BYTES = 1024 * 1024;
// The only accepted import spellings: the sibling file, optionally with an explicit ./ prefix.
const VALID_IMPORT = /^@(?:\.\/)?AGENTS\.md[ \t]*$/;
// Anything that looks like an attempted import of AGENTS.md or another file at line start.
const IMPORT_LIKE = /^@\S*/;

let nodeDeps: RuntimeDeps | undefined;
/** Lazily created Node deps, so old-signature callers (bundle-sync, workflow-doctor, ...) need no change. */
function defaultDeps(): RuntimeDeps {
  return (nodeDeps ??= createNodeDeps());
}

// Linear scan (no backtracking regex over untrusted input): drops fenced code blocks and returns the
// remaining raw lines (a directive is judged on its raw text, never on a code-stripped copy).
// A fence opens with 0-3 spaces then 3+ backticks or tildes, closes on the same character with
// at least that many, and an unclosed fence runs to the end of the file.
function outsideCode(text: string): string[] {
  const kept: string[] = [];
  let fence: string | null = null;
  for (const line of text.replace(/^﻿/, "").split(/\r?\n/)) {
    if (fence) {
      const close = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) fence = null;
      continue;
    }
    const open = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (open) { fence = open[1]; continue; }
    kept.push(line);
  }
  return kept;
}

/* Returns { kind, content, detail }.
 * kind: "none" (no import line; use the file as-is) | "import" (valid; content = CLAUDE.md + AGENTS.md)
 *       | "invalid" (an import was attempted but is unsafe or malformed; detail says why). */
export async function resolveClaudeEntry(rootDir: string, ownText: string, deps: RuntimeDeps = defaultDeps()): Promise<EntryResolution> {
  const { fs, path } = deps;
  const lines = outsideCode(ownText);
  const attempts = lines.filter((line) => IMPORT_LIKE.test(line));
  if (attempts.length === 0) return { kind: "none", content: ownText, detail: "" };
  const valid = attempts.filter((line) => VALID_IMPORT.test(line));
  const bad = attempts.filter((line) => !VALID_IMPORT.test(line));
  const agentsAttempt = bad.find((line) => /AGENTS\.md/i.test(line));
  if (agentsAttempt) return { kind: "invalid", content: ownText, detail: `malformed or foreign AGENTS.md import "${agentsAttempt.trim()}" (only "@AGENTS.md" is accepted)` };
  if (valid.length === 0) return { kind: "none", content: ownText, detail: "" }; // @mentions that are not AGENTS.md imports are ordinary prose
  const target = path.join(rootDir, TARGET);
  let stat;
  try { stat = await fs.lstat(target); } catch { return { kind: "invalid", content: ownText, detail: "@AGENTS.md target is missing" }; }
  if (stat.isSymbolicLink()) return { kind: "invalid", content: ownText, detail: "@AGENTS.md target is a symbolic link" };
  if (!stat.isFile()) return { kind: "invalid", content: ownText, detail: "@AGENTS.md target is not a regular file" };
  const real = await fs.realpath(target);
  if (path.dirname(real) !== (await fs.realpath(rootDir))) return { kind: "invalid", content: ownText, detail: "@AGENTS.md target resolves outside the project root" };
  if (stat.size > MAX_BYTES) return { kind: "invalid", content: ownText, detail: "@AGENTS.md target is larger than 1 MiB" };
  const imported = await fs.readFile(target);
  return { kind: "import", content: `${ownText}\n${imported}`, detail: "loads AGENTS.md through @AGENTS.md" };
}

/* Effective text of an entry file: CLAUDE.md follows a valid import; every other file is itself. */
export async function effectiveEntryText(rootDir: string, file: string, deps: RuntimeDeps = defaultDeps()): Promise<EntryResolution> {
  const text = await deps.fs.readFile(deps.path.join(rootDir, file));
  if (file !== "CLAUDE.md") return { kind: "none", content: text, detail: "" };
  return resolveClaudeEntry(rootDir, text, deps);
}
