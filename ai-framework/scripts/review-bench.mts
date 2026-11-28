#!/usr/bin/env node
import { runWorkflowSync } from "./runtime/entry.mts";
import { runDirect } from "./runtime/cli.mts";
/*
 * Review bench for independent re-reviews (see .project/pitches/independent-rereview-catch-up/plan.md).
 * A reviewer agent gets a scratch COPY of a slice with one planted defect (a "canary"), never the repo:
 *   prepare       copy a slice to a scratch dir, plant one canary, prove it breaks a scratch test
 *   guard         snapshot / check the repo around a dispatch, so "read-only" is verified, not assumed
 *   count         changed files against a ref, minus bookkeeping, for the appetite cap
 *   canary-check  did a reviewer's report cite the canary's file within +-3 lines?
 *   record-check  does a slice record carry the fields that make its claims checkable?
 * Follows ai-framework/rules/security.md section 9: one guarded reader, bounded input, no project script
 * executed (only `node` on files copied into the scratch dir), no raw error text.
 * Imports no node:* module at runtime: every fs/path/process/child effect goes through the injected RuntimeDeps.
 */

import type { RunResult, RuntimeDeps } from "./runtime/types.mts";
import { createNodeDeps } from "./runtime/node.mts";

const MAX_FILE_BYTES = 512 * 1024;
const MAX_RECORD_BYTES = 256 * 1024;
const MAX_SNAPSHOT_BYTES = 16 * 1024 * 1024;
const WALK_CAP = 50000;
const TEST_TIMEOUT_MS = 60000;
const SECRET_NAME = /(^|\/)(\.env[^/]*|credentials[^/]*|settings\.local\.json|\.npmrc|\.netrc|id_(?:rsa|dsa|ecdsa|ed25519)[^/]*|[^/]*\.(?:pem|key|p12|pfx))$/i;
// Directories the guard hashes. Metrics and reports are written by hooks and generators during a session.
const GUARD_ROOTS = [".project", "ai-framework", ".claude", ".agents", ".cursor", ".opencode", ".codex", "AGENTS.md", "CLAUDE.md", "README.md", "VERSION", "CHANGELOG.md", ".gitignore", "SETUP.md"];
const GUARD_SKIP = [".project/metrics", ".project/reports", ".git", "node_modules"];
const BOOKKEEPING_FILES = new Set(["VERSION", "CHANGELOG.md", ".project/status.md", ".project/pitches/_followups.md", ".project/done-work.md"]);
const BOOKKEEPING_PREFIXES = [".project/knowledge/", ".project/runs/", ".project/compaction/", ".project/reports/", ".project/metrics/"];

export type Options = Record<string, string | undefined>;

export interface PrepareResult { scratch: string; manifest: string; fileCount: number }
export interface GuardSnapshotResult { snapshot: string }
export interface GuardCheckResult { clean: boolean; headChanged: boolean; statusChanged: boolean; changed: string[] }
export interface CountResult { count: number; files: string[] }
export interface CanaryResult { caught: boolean }
export interface RecordResult { ok: boolean; issues: string[] }
export type Output = PrepareResult | GuardSnapshotResult | GuardCheckResult | CountResult | CanaryResult | RecordResult;

interface TreeState { head: string; status: string; tree: Record<string, string> }
interface CanarySpec { file: string; find: string; replace: string }

let nodeDeps: RuntimeDeps | undefined;
/** Lazily created Node deps, so old-signature callers need no change. */
function defaultDeps(): RuntimeDeps {
  return (nodeDeps ??= createNodeDeps());
}

export const printable = (text: unknown): string => String(text).replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/g, "?");
const fail = (message: string): never => { throw new Error(message); };
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const hexOf = (bytes: Uint8Array): string => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

const inside = (root: string, target: string, deps: RuntimeDeps): boolean => {
  const rel = deps.path.relative(root, target);
  // By segment: a name such as "..inside.json" is inside the root; only a ".." segment leaves it.
  return rel !== ".." && !rel.startsWith(`..${deps.path.sep}`) && !deps.path.isAbsolute(rel);
};
// A caller-supplied --out/--file is checked against `root` by its lexical path above; that is not
// enough on its own — an ancestor directory can be a symlink even when the leaf does not exist yet,
// which the OS follows transparently. Resolve the longest existing prefix's realpath and rejoin the
// rest, matching resolve-before-matching-a-protected-path-allowlist, before every `inside()` check.
function realOrNearest(target: string, deps: RuntimeDeps): string {
  const { fs, path } = deps;
  let current = target;
  const suffix: string[] = [];
  for (;;) {
    try { return path.join(fs.realpathSync(current), ...suffix); }
    catch { const parent = path.dirname(current); if (parent === current) return target; suffix.unshift(path.basename(current)); current = parent; }
  }
}
// A case-insensitive disk lets "REPO/x" name a file inside "repo" while the strings differ. Compare each existing
// ancestor with the root by device and inode as well as by path.
function withinProject(root: string, target: string, deps: RuntimeDeps): boolean {
  const real = realOrNearest(target, deps);
  if (inside(root, real, deps)) return true;
  for (let current = real; ; ) {
    if (sameEntry(root, current, deps)) return true;
    const parent = deps.path.dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}
function sameEntry(left: string, right: string, deps: RuntimeDeps): boolean {
  if (left === right) return true;
  try {
    const a = deps.fs.lstatSync(left), b = deps.fs.lstatSync(right);
    return Boolean(a.ino) && a.ino === b.ino && a.dev === b.dev;
  } catch { return false; }
}
// For a file OUTSIDE the project (scratch manifest, guard snapshot, a reviewer's report): lstat,
// refuse a symlink or non-regular file, cap size, then read. readGuarded gives these guarantees for
// project-relative paths; this gives the same guarantees for the operator-supplied absolute ones.
function readGuardedAbsolute(full: string, label: string, deps: RuntimeDeps, maxBytes = MAX_RECORD_BYTES): string {
  const { fs } = deps;
  let stat;
  try { stat = fs.lstatSync(full); } catch { return fail(`Cannot read ${label}`); }
  if (stat.isSymbolicLink() || !stat.isFile()) fail(`${label} must be a regular file, not a symlink`);
  if (stat.size > maxBytes) fail(`${label} is too large`);
  try { return fs.readFileSync(full); } catch { return fail(`Cannot read ${label}`); }
}
// Refuses to write through an existing symlink or non-regular target; writes atomically via a temp
// file in the same directory opened "wx" (refuses a pre-planted path) plus rename.
function writeGuarded(target: string, text: string, deps: RuntimeDeps): void {
  const { fs, path } = deps;
  let stat;
  try { stat = fs.lstatSync(target); } catch { stat = null; }
  if (stat && (stat.isSymbolicLink() || !stat.isFile())) fail(`Refusing to write through a symlink: ${path.basename(target)}`);
  const temp = `${target}.tmp-${deps.proc.pid}-${hexOf(deps.crypto.randomBytes(6))}`;
  try { fs.writeFileSync(temp, text, { flag: "wx" }); fs.renameSync(temp, target); } finally { fs.rmSync(temp, { force: true }); }
}

export function safeRelative(relative: unknown, deps: RuntimeDeps = defaultDeps()): string {
  if (typeof relative !== "string" || !relative || relative.includes("\0") || relative.includes("\\") || deps.path.isAbsolute(relative)) return fail("Unsafe path");
  if (relative.split("/").some((part) => part === "" || part === "." || part === "..")) fail("Unsafe path");
  return relative;
}

// The one reader: refuses symlinks, non-regular files, out-of-project realpaths, secret-shaped names, oversize files.
export function readGuarded(root: string, relative: string, deps: RuntimeDeps = defaultDeps()): Uint8Array {
  const { fs, path } = deps;
  safeRelative(relative, deps);
  if (SECRET_NAME.test(relative)) fail(`Refusing secret-shaped file: ${relative}`);
  const full = path.join(root, relative);
  let stat;
  try { stat = fs.lstatSync(full); } catch { return fail(`Cannot read: ${relative}`); }
  if (stat.isSymbolicLink() || !stat.isFile()) fail(`Not a regular file: ${relative}`);
  if (stat.size > MAX_FILE_BYTES) fail(`Too large: ${relative}`);
  if (!inside(root, fs.realpathSync(full), deps)) fail(`Outside the project: ${relative}`);
  return fs.readBytesSync(full);
}

function runGit(root: string, args: string[], deps: RuntimeDeps): RunResult {
  const env: Record<string, string> = {
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_NO_LAZY_FETCH: "1",
    GIT_TERMINAL_PROMPT: "0",
  };
  for (const key of ["HOME", "SystemRoot"]) {
    const value = deps.proc.env[key];
    if (value !== undefined) env[key] = value;
  }
  // A relative or in-project PATH entry would let the inspected tree supply "git" itself.
  const separator = deps.path.sep === "\\" ? ";" : ":";
  const search = deps.proc.env.PATH;
  if (search !== undefined) env.PATH = search.split(separator).filter((entry) => deps.path.isAbsolute(entry) && !withinProject(root, entry, deps)).join(separator);
  let run;
  try {
    run = deps.child.runSync("git", ["-C", root, "-c", "core.fsmonitor=false", "-c", "core.hooksPath=/dev/null", ...args], {
      env, timeoutMs: 20000,
    });
  } catch { return fail("git command failed"); }
  if (run.errorCode || run.signal !== null) return fail("git command failed");
  return run;
}

function git(root: string, args: string[], deps: RuntimeDeps): string {
  const run = runGit(root, args, deps);
  if (run.status !== 0) return fail("git command failed");
  return run.stdout;
}

/** Refuses a repository the bench cannot inspect safely or completely. Returns the index listing for the guard. */
function checkGitRepository(root: string, deps: RuntimeDeps): string {
  // A subdirectory, or a repository that redirects core.worktree, would be listed only in part or somewhere else.
  const top = git(root, ["rev-parse", "--show-toplevel"], deps).replace(/\r?\n$/, "");
  if (!sameEntry(root, top, deps)) fail("--root must be the top level of the repository");
  // Includes and worktree config can also define filters and hooks. NUL keeps each key intact.
  const filters = runGit(root, ["config", "--includes", "--name-only", "-z", "--get-regexp", "^(filter|hook)\\."], deps);
  const noMatches = filters.status === 1 && filters.stdout === "" && filters.stderr === "";
  if (filters.status !== 0 && !noMatches) fail("git command failed");
  // Git 2.54 runs hooks named in configuration whatever core.hooksPath says.
  if (filters.stdout.split("\0").some((key) => key.startsWith("hook."))) fail("Refusing a repository with hooks in its Git configuration");
  const executableFilter = filters.stdout.split("\0").some((key) =>
    key.startsWith("filter.") &&
    key.indexOf(".", "filter.".length) !== -1 &&
    (key.endsWith(".clean") || key.endsWith(".smudge") || key.endsWith(".process")));
  if (executableFilter) {
    fail("Refusing a repository with Git filters");
  }
  // Scan the whole index even when --root names a directory below the worktree root.
  const index = git(root, ["ls-files", "--stage", "-z", "--", ":/"], deps);
  if (index.split("\0").some((entry) => entry.startsWith("160000 "))) {
    fail("Refusing a repository with Git submodules");
  }
  // assume-unchanged (lowercase tag) and skip-worktree ("S") hide edits from status and diff.
  if (git(root, ["ls-files", "-v", "-z", "--", ":/"], deps).split("\0").some((entry) => /^[a-zS] /.test(entry))) {
    fail("Refusing a repository with files hidden by assume-unchanged or skip-worktree");
  }
  return index;
}
// JSON.parse errors quote their input; the operator's flags and a snapshot file get a fixed message instead.
const parseJson = (text: string, label: string): unknown => { try { return JSON.parse(text); } catch { return fail(`${label} is not valid JSON`); } };
const sha = (data: string | Uint8Array, deps: RuntimeDeps): string => deps.crypto.sha256Hex(data);

function runSelectedTest(command: unknown, cwd: string, deps: RuntimeDeps): number | null {
  if (!Array.isArray(command) || !["node", "bun"].includes(command[0]) || command.some((part) => typeof part !== "string")) fail("test command must be a JSON array starting with \"node\" or \"bun\"");
  const args = (command as string[]).slice(1);
  if (command[0] === "bun" && args[0] === "test") args[0] = "--test";
  try { return runWorkflowSync(deps, args, { cwd, timeoutMs: TEST_TIMEOUT_MS }).status; } catch { return null; }
}

export function prepare(root: string, options: Options, deps: RuntimeDeps = defaultDeps()): PrepareResult {
  const { fs, path } = deps;
  const files = String(options.files || "").split(",").filter(Boolean);
  if (!files.length) fail("--files is required");
  const spec = parseJson(String(options.canary || "null"), "--canary");
  if (!isRecord(spec) || typeof spec.file !== "string" || typeof spec.find !== "string" || typeof spec.replace !== "string" || !spec.find) return fail("--canary must be {file, find, replace}");
  const canary = spec as unknown as CanarySpec;
  if (!files.includes(canary.file)) fail("canary file must be one of --files");
  const command = parseJson(String(options["test-cmd"] || "null"), "--test-cmd");
  const out = options.out ? path.resolve(options.out) : fs.mkdtempSync(path.join(fs.realpathSync(deps.os.tmpdir()), "review-bench-"));
  if (withinProject(root, out, deps)) fail("scratch dir must be outside the project");
  if (fs.existsSync(out) && fs.readdirSync(out).length) fail("scratch dir must be empty");

  const copied: Array<{ path: string; sha256: string }> = [];
  for (const relative of files) {
    const data = readGuarded(root, relative, deps);
    const target = path.join(out, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, data);
    copied.push({ path: relative, sha256: sha(data, deps) });
  }
  if (runSelectedTest(command, out, deps) !== 0) fail("baseline tests must pass in the scratch copy before a canary is planted");

  const target = path.join(out, canary.file);
  const text = fs.readFileSync(target);
  const first = text.indexOf(canary.find);
  if (first === -1 || text.indexOf(canary.find, first + 1) !== -1) fail("canary find text must match exactly once");
  const line = text.slice(0, first).split("\n").length;
  fs.writeFileSync(target, text.slice(0, first) + canary.replace + text.slice(first + canary.find.length));
  const planted = runSelectedTest(command, out, deps);
  if (typeof planted !== "number") fail("the test run with the canary did not finish, so it proves nothing");
  if (planted === 0) fail("a canary that breaks no scratch test is refused");

  // The manifest sits beside the scratch tree, not in it, and is never put in a reviewer prompt.
  const manifest = `${out}.manifest.json`;
  writeGuarded(manifest, `${JSON.stringify({ files: copied, canary: { file: canary.file, line, findSha256: sha(canary.find, deps), replaceSha256: sha(canary.replace, deps) }, testCommand: command, baselinePassed: true, canaryBreaksTests: true }, null, 2)}\n`, deps);
  return { scratch: out, manifest, fileCount: copied.length };
}

function walkTree(root: string, status: string, deps: RuntimeDeps): Record<string, string> {
  const { fs, path } = deps;
  const map: Record<string, string> = Object.create(null);
  const visited = new Set<string>();
  const skip = (rel: string): boolean => SECRET_NAME.test(rel) || GUARD_SKIP.some((entry) => rel === entry || rel.endsWith(`/${entry}`));
  const markVisited = (rel: string): void => {
    visited.add(rel);
    if (visited.size > WALK_CAP) fail("tree too large to snapshot");
  };
  const visit = (rel: string): void => {
    if (visited.has(rel) || skip(rel)) return;
    const full = path.join(root, rel);
    let stat;
    try { stat = fs.lstatSync(full); } catch { return; }
    markVisited(rel);
    if (stat.isSymbolicLink()) { map[rel] = `L:${fs.readlinkSync(full)}`; return; }
    if (stat.isDirectory()) { for (const name of fs.readdirSync(full).sort()) visit(`${rel}/${name}`); return; }
    // The executable bit is recorded too: status letters do not change when an already-changed file gains it.
    const executable = stat.mode & 0o111 ? "x:" : "";
    map[rel] = stat.isFile() ? `${executable}${stat.size > 2 * 1024 * 1024 ? `S:${stat.size}:${Math.round(stat.mtimeMs)}` : sha(fs.readBytesSync(full), deps)}` : `O:${stat.mode}`;
  };
  for (const entry of GUARD_ROOTS) visit(entry);

  const visitReported = (rel: string): void => {
    if (visited.has(rel) || skip(rel)) return;
    // Unlike a directory walk, a path supplied by Git may traverse a symlinked parent.
    const parts = rel.split("/");
    let parent = "";
    for (const part of parts.slice(0, -1)) {
      parent = parent ? `${parent}/${part}` : part;
      if (skip(parent)) return;
      let stat;
      try { stat = fs.lstatSync(path.join(root, parent)); } catch { return; }
      if (stat.isSymbolicLink()) {
        markVisited(rel);
        map[rel] = "P:symlink";
        return;
      }
      if (!stat.isDirectory()) return;
    }
    visit(rel);
  };
  const entries = status.split("\0");
  for (let i = 0; i < entries.length - 1; i++) {
    const entry = entries[i];
    // Porcelain v1 -z puts the destination first and the rename/copy source in the next field.
    if (/[RC]/.test(entry.slice(0, 2))) i++;
    // An untracked nested repository is reported as a directory with a trailing slash.
    visitReported(entry.slice(3).replace(/\/$/, ""));
  }
  return map;
}
function parseSnapshot(text: string): TreeState {
  const value = parseJson(text, "snapshot file");
  if (!isRecord(value) || typeof value.head !== "string" || typeof value.status !== "string" || !isRecord(value.tree) || Object.values(value.tree).some((entry) => typeof entry !== "string")) {
    return fail("snapshot file has the wrong shape");
  }
  return value as unknown as TreeState;
}
function state(root: string, deps: RuntimeDeps): TreeState {
  // The index digest catches re-staged content that leaves every status letter unchanged.
  const index = sha(checkGitRepository(root, deps), deps);
  const head = git(root, ["rev-parse", "HEAD"], deps).trim();
  const status = git(root, ["status", "--porcelain=v1", "-z", "-uall", "--ignore-submodules=all"], deps);
  return { head, status: `${status}index ${index}`, tree: walkTree(root, status, deps) };
}
export function guard(root: string, action: string | undefined, file: string | undefined, deps: RuntimeDeps = defaultDeps()): GuardSnapshotResult | GuardCheckResult {
  if (!file) fail("--file is required");
  const target = deps.path.resolve(file as string);
  if (withinProject(root, target, deps)) fail("the snapshot file must be outside the project");
  if (action === "snapshot") {
    const snapshot = `${JSON.stringify(state(root, deps))}\n`;
    if (new TextEncoder().encode(snapshot).length > MAX_SNAPSHOT_BYTES) fail("the snapshot file is too large");
    writeGuarded(target, snapshot, deps); return { snapshot: target };
  }
  if (action !== "check") fail("guard needs snapshot or check");
  const before = parseSnapshot(readGuardedAbsolute(target, "the snapshot file", deps, MAX_SNAPSHOT_BYTES));
  const now = state(root, deps);
  const paths = new Set([...Object.keys(before.tree), ...Object.keys(now.tree)]);
  const changed = [...paths].filter((p) => before.tree[p] !== now.tree[p]).sort();
  const clean = changed.length === 0 && before.head === now.head && before.status === now.status;
  return { clean, headChanged: before.head !== now.head, statusChanged: before.status !== now.status, changed };
}

export function count(root: string, since: string | undefined, pitch: string | undefined, deps: RuntimeDeps = defaultDeps()): CountResult {
  if (!/^[0-9a-f]{7,40}$/i.test(String(since))) fail("--since must be a commit hash");
  const own = pitch ? `.project/pitches/${safeRelative(pitch, deps)}/` : null;
  checkGitRepository(root, deps);
  // -z keeps every name exact: without it Git quotes unusual names, and the bookkeeping filters miss them.
  const names = (args: string[]): string[] => git(root, args, deps).split("\0");
  // A branch named like the abbreviation would win over the commit, so the name must resolve to a commit it prefixes.
  const base = git(root, ["rev-parse", "--verify", "--quiet", `${since}^{commit}`], deps).trim();
  if (!base.toLowerCase().startsWith(String(since).toLowerCase())) fail("--since does not name that commit");
  // --no-renames keeps the old path, so moving a source file into a bookkeeping folder still counts.
  const listed = new Set([...names(["diff", "--name-only", "--no-renames", "-z", "--ignore-submodules=all", base, "--"]), ...names(["ls-files", "--others", "--exclude-standard", "-z"])].filter(Boolean));
  const files = [...listed].filter((f) => !BOOKKEEPING_FILES.has(f) && !BOOKKEEPING_PREFIXES.some((p) => f.startsWith(p)) && !(own && f.startsWith(own))).sort();
  return { count: files.length, files };
}

/** A path token inside a report: the characters a file name may hold in a citation. */
const PATH_CHAR = /[A-Za-z0-9_.\-~/]/;
/** A path separator inside a path token. */
const PATH_SLASH = /\//;
const DIGIT = /[0-9]/;
/** The separator a citation puts between a path and its line number: ":", "#", "L" or space. */
const CITE_SEPARATOR = /[:# \t]/;
/** A line number is a short run of digits; a longer one is not a line number. */
const MAX_LINE_DIGITS = 9;
const MAX_RANGE_LINES = 40;

/**
 * One citation found in a report: the path as written, and the line (or line range) it names.
 */
interface Citation { path: string; low: number; high: number }

/**
 * Linear scan of a report for citations of the form <path><separator><line>[ - <line>].
 * The scan walks the text once and never backtracks: every character is examined a bounded
 * number of times, so a hostile report cannot make the cost grow with its own shape.
 */
function scanCitations(text: string): Citation[] {
  const found: Citation[] = [];
  let index = 0;
  const length = text.length;
  while (index < length) {
    if (!PATH_CHAR.test(text[index]) && !PATH_SLASH.test(text[index])) { index++; continue; }
    // The path is the longest run of path characters ending at the first separator.
    const start = index;
    while (index < length && (PATH_CHAR.test(text[index]) || PATH_SLASH.test(text[index])) && !CITE_SEPARATOR.test(text[index])) index++;
    const path = text.slice(start, index);
    // The separator: ":", "#" or space, then an optional "L" ("L12"), then the line number.
    let cursor = index;
    while (cursor < length && CITE_SEPARATOR.test(text[cursor])) cursor++;
    if (cursor < length && text[cursor] === "L") cursor++;
    const digitsStart = cursor;
    while (cursor < length && DIGIT.test(text[cursor]) && cursor - digitsStart < MAX_LINE_DIGITS) cursor++;
    if (cursor === digitsStart) { index = Math.max(index, cursor); continue; }
    const low = Number(text.slice(digitsStart, cursor));
    // An optional range end: spaces, a dash (or en dash), spaces, then the end line.
    let after = cursor;
    while (after < length && (text[after] === " " || text[after] === "\t")) after++;
    let high = low;
    if (after < length && (text[after] === "-" || text[after] === "–")) {
      after++;
      while (after < length && (text[after] === " " || text[after] === "\t")) after++;
      if (text[after] === "L") after++;
      const endStart = after;
      while (after < length && DIGIT.test(text[after]) && after - endStart < MAX_LINE_DIGITS) after++;
      if (after > endStart) high = Number(text.slice(endStart, after));
    }
    found.push({ path, low, high });
    index = Math.max(cursor, after);
  }
  return found;
}

/**
 * A citation names the canary when its path IS the canary's path, ends with "/" plus that path
 * (an absolute or scratch path, including inside a markdown link), or is the bare file name and
 * that name is unique among the manifest's files. `unrelated-facts.mts` does not name `facts.mts`.
 */
function namesCanary(cited: string, canaryPath: string, uniqueNames: Set<string>, paths: string[]): boolean {
  // The longest copied file the citation spells out decides which file it means.
  let meant = "";
  for (const file of paths) if ((cited === file || cited.endsWith(`/${file}`)) && file.length > meant.length) meant = file;
  if (meant && meant !== canaryPath) return false;
  if (cited === canaryPath) return true;
  if (canaryPath && cited.endsWith(`/${canaryPath}`)) return true;
  const bare = canaryPath.split("/").pop() as string;
  return cited === bare && uniqueNames.has(bare);
}

export function canaryCheck(manifestFile: string | undefined, reportFile: string | undefined, deps: RuntimeDeps = defaultDeps()): CanaryResult {
  if (!manifestFile) fail("--manifest is required");
  if (!reportFile) fail("--report is required");
  const manifest = parseJson(readGuardedAbsolute(deps.path.resolve(manifestFile as string), "the manifest", deps), "manifest");
  if (!isRecord(manifest) || !isRecord(manifest.canary) || typeof manifest.canary.file !== "string" || typeof manifest.canary.line !== "number") {
    return fail("manifest has the wrong shape");
  }
  const canaryPath = manifest.canary.file;
  const canaryLine = manifest.canary.line;
  // The manifest's files decide whether a bare file name is unambiguous.
  const names = new Map<string, number>();
  const listed = Array.isArray(manifest.files) ? manifest.files : [];
  for (const entry of listed) {
    if (!isRecord(entry) || typeof entry.path !== "string") continue;
    const bare = entry.path.split("/").pop() as string;
    names.set(bare, (names.get(bare) ?? 0) + 1);
  }
  const paths = listed.flatMap((entry) => (isRecord(entry) && typeof entry.path === "string" ? [entry.path] : []));
  const uniqueNames = new Set([...names].filter(([, count]) => count === 1).map(([name]) => name));
  const report = readGuardedAbsolute(deps.path.resolve(reportFile as string), "the report", deps);
  for (const citation of scanCitations(report)) {
    // A reviewer naming the whole file or a large block has not located a defect.
    if (citation.high < citation.low || citation.high - citation.low > MAX_RANGE_LINES) continue;
    if (!namesCanary(citation.path, canaryPath, uniqueNames, paths)) continue;
    if (canaryLine >= citation.low - 3 && canaryLine <= citation.high + 3) return { caught: true };
  }
  return { caught: false };
}

/**
 * One section of a record: the live text under a single Markdown heading. Text inside fenced code or HTML comments
 * is an example or a note, never a field. The text before the first heading is a section of its own.
 */
interface Section { lines: string[] }

/** Removes HTML comments from one line, carrying an open comment to the next. Linear. */
function withoutComments(line: string, open: boolean): { text: string; open: boolean } {
  let text = "";
  let at = 0;
  let inComment = open;
  while (at < line.length) {
    const next = line.indexOf(inComment ? "-->" : "<!--", at);
    if (next === -1) { if (!inComment) text += line.slice(at); break; }
    if (!inComment) text += line.slice(at, next);
    at = next + (inComment ? 3 : 4);
    inComment = !inComment;
  }
  return { text, open: inComment };
}

/** Split a record into sections by its Markdown headings, scanning the lines once. */
function splitSections(text: string): Section[] {
  const sections: Section[] = [];
  let current: Section = { lines: [] };
  let fence: { mark: string; length: number } | undefined;
  let comment = false;
  for (const raw of text.split("\n")) {
    const trimmed = raw.trim();
    const mark = trimmed.startsWith("```") || trimmed.startsWith("~~~") ? trimmed[0] as string : "";
    let run = 0;
    while (mark && trimmed[run] === mark) run++;
    if (fence) {
      // Only a bare run of the same mark, at least as long as the opening one, closes the block.
      if (mark === fence.mark && run >= fence.length && run === trimmed.length) fence = undefined;
      continue;
    }
    const live = withoutComments(raw, comment);
    comment = live.open;
    if (mark && live.text === raw) { fence = { mark, length: run }; continue; }
    if (/^#{1,6}\s/.test(live.text.trim())) {
      sections.push(current);
      current = { lines: [] };
      continue;
    }
    current.lines.push(live.text.replace(/\r$/, ""));
  }
  sections.push(current);
  return sections;
}

/** The field lines a section carries. A claim may be followed only by a note in parentheses. */
const FIELD = {
  independent: /^independent:\s*(yes|no|not-completed)(?:\s+\(.*)?\s*$/i,
  readOnly: /^read-only:\s*verified by \S+/i,
  promptHash: /^prompt-sha256:\s*[0-9a-f]{64}\b/i,
  model: /^model:\s*\S+/i,
  crossFile: /^cross-file interactions:\s*(reviewed|not reviewed)\b/i,
  canary: /^canary:\s*caught(?:\s+\(.*)?\s*$/i,
};
/** Anything that reads as an independence claim, including a bulleted, bold or indented one. */
const CLAIM_LIKE = /^[\s>*_+-]{0,16}independent[*_\s]{0,8}:/i;
/** The field is lowercase "canary:"; a prose line such as "Canary: what was planted" is a description. */
const CANARY_LINE = /^canary:/;

/** Whether some table outside code and comments has a header cell that is exactly "verified". */
function hasVerifiedColumn(sections: Section[]): boolean {
  return sections.some((section) => section.lines.some((line, index) => {
    const next = (section.lines[index + 1] ?? "").trim();
    return line.trim().startsWith("|") && line.split("|").some((cell) => cell.trim().toLowerCase() === "verified")
      && next.startsWith("|") && next.includes("-") && /^[|:\s-]+$/.test(next);
  }));
}

/**
 * Check a record section by section: a section that claims independence must carry exactly one
 * `independent:` line and its own read-only, prompt hash, model and cross-file lines, plus its
 * own caught canary when it says "yes". One role's evidence never stands in for another's.
 */
function checkSection(section: Section, issues: string[]): boolean {
  const matching = (pattern: RegExp): number => section.lines.filter((line) => pattern.test(line)).length;
  const claimed = section.lines.filter((line) => CLAIM_LIKE.test(line));
  if (!claimed.length) return false;
  if (claimed.length > 1) { issues.push("a section must have exactly one independent: line"); return true; }
  const claim = FIELD.independent.exec(claimed[0] as string);
  if (!claim) { issues.push("malformed independent: line (write independent: yes|no|not-completed, with any note in parentheses)"); return true; }
  const canaries = section.lines.filter((line) => CANARY_LINE.test(line));
  if ((claim[1] as string).toLowerCase() === "yes" && !(matching(FIELD.canary) && canaries.every((line) => FIELD.canary.test(line)))) issues.push("independent: yes requires canary: caught");
  if (!matching(FIELD.readOnly)) issues.push("missing read-only: verified by <method>");
  if (!matching(FIELD.promptHash)) issues.push("missing prompt-sha256: <64 hex>");
  if (!matching(FIELD.model)) issues.push("missing model:");
  if (!matching(FIELD.crossFile)) issues.push("missing cross-file interactions: reviewed|not reviewed");
  return true;
}

export function recordCheck(file: string | undefined, deps: RuntimeDeps = defaultDeps()): RecordResult {
  if (!file) fail("a record file path is required");
  const text = readGuardedAbsolute(deps.path.resolve(file as string), "the record", deps);
  const issues: string[] = [];
  const sections = splitSections(text);
  let claims = 0;
  for (const section of sections) if (checkSection(section, issues)) claims++;
  if (!claims) issues.push("missing independent: yes|no|not-completed");
  if (!hasVerifiedColumn(sections)) issues.push("missing findings table with a verified column");
  return { ok: issues.length === 0, issues };
}

interface CliResult { output: Output; exit: number }

// Presence is read from argv: a trailing "--max", "--max=3", or a "--max" taken as another flag's value
// leaves options.max unset, and none of those may turn the cap off.
function parseMax(argv: string[], value: string | undefined): number | undefined {
  if (!argv.some((arg) => arg === "--max" || arg.startsWith("--max="))) return undefined;
  if (value === undefined || !/^[0-9]+$/.test(value) || !Number.isSafeInteger(Number(value))) return fail("--max must be a non-negative integer");
  return Number(value);
}

function cli(argv: string[], deps: RuntimeDeps): CliResult {
  const options: Options = {};
  const positional: string[] = [];
  for (let index = 0; index < argv.length; index++) {
    if (argv[index].startsWith("--")) { options[argv[index].slice(2)] = argv[index + 1]; index++; } else positional.push(argv[index]);
  }
  const command = positional.shift();
  const root = deps.fs.realpathSync(options.root || deps.proc.cwd());
  if (command === "prepare") return { output: prepare(root, options, deps), exit: 0 };
  if (command === "guard") { const result = guard(root, positional[0], options.file, deps); return { output: result, exit: "clean" in result && result.clean === false ? 1 : 0 }; }
  if (command === "count") {
    const max = parseMax(argv, options.max);
    const result = count(root, options.since, options.pitch, deps);
    return { output: result, exit: max !== undefined && result.count > max ? 1 : 0 };
  }
  if (command === "canary-check") { const result = canaryCheck(options.manifest, options.report, deps); return { output: result, exit: result.caught ? 0 : 1 }; }
  if (command === "record-check") { const result = recordCheck(positional[0], deps); return { output: result, exit: result.ok ? 0 : 1 }; }
  return fail("Usage: review-bench.mts <prepare|guard snapshot|guard check|count|canary-check|record-check> [options]");
}

/** CLI entry. `argv` excludes the script path. Returns the exit code. */
export function main(argv: string[], deps: RuntimeDeps): number {
  try {
    const { output, exit } = cli(argv, deps);
    deps.io.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    return exit || 0;
  } catch (error) {
    deps.io.stderr.write(`${printable(`review-bench: ${error instanceof Error ? error.message : String(error)}`)}\n`);
    return 1;
  }
}

runDirect(import.meta.url, main);
