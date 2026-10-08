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

import type { RuntimeDeps } from "./runtime/types.mts";
import { createNodeDeps } from "./runtime/node.mts";

const MAX_FILE_BYTES = 512 * 1024;
const MAX_RECORD_BYTES = 256 * 1024;
const WALK_CAP = 50000;
const TEST_TIMEOUT_MS = 60000;
const SECRET_NAME = /(^|\/)(\.env[^/]*|credentials[^/]*|settings\.local\.json|\.npmrc|\.netrc|id_(?:rsa|dsa|ecdsa|ed25519)[^/]*|[^/]*\.(?:pem|key|p12|pfx))$/i;
// Directories the guard hashes. Metrics and reports are written by hooks and generators during a session.
const GUARD_ROOTS = [".project", "ai-framework", ".claude", ".agents", ".cursor", ".opencode", ".codex", "AGENTS.md", "CLAUDE.md", "README.md", "VERSION", "CHANGELOG.md", ".gitignore"];
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
  return rel === "" || (!rel.startsWith("..") && !deps.path.isAbsolute(rel));
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
// For a file OUTSIDE the project (scratch manifest, guard snapshot, a reviewer's report): lstat,
// refuse a symlink or non-regular file, cap size, then read. readGuarded gives these guarantees for
// project-relative paths; this gives the same guarantees for the operator-supplied absolute ones.
function readGuardedAbsolute(full: string, label: string, deps: RuntimeDeps): string {
  const { fs } = deps;
  let stat;
  try { stat = fs.lstatSync(full); } catch { return fail(`Cannot read ${label}`); }
  if (stat.isSymbolicLink() || !stat.isFile()) fail(`${label} must be a regular file, not a symlink`);
  if (stat.size > MAX_RECORD_BYTES) fail(`${label} is too large`);
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

function git(root: string, args: string[], deps: RuntimeDeps): string {
  let run;
  try { run = deps.child.runSync("git", ["-C", root, ...args], { timeoutMs: 20000 }); } catch { run = null; }
  if (!run || run.status !== 0) return fail("git command failed");
  return run.stdout;
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
  if (inside(root, realOrNearest(out, deps), deps)) fail("scratch dir must be outside the project");
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
  if (runSelectedTest(command, out, deps) === 0) fail("a canary that breaks no scratch test is refused");

  // The manifest sits beside the scratch tree, not in it, and is never put in a reviewer prompt.
  const manifest = `${out}.manifest.json`;
  writeGuarded(manifest, `${JSON.stringify({ files: copied, canary: { file: canary.file, line, findSha256: sha(canary.find, deps), replaceSha256: sha(canary.replace, deps) }, testCommand: command, baselinePassed: true, canaryBreaksTests: true }, null, 2)}\n`, deps);
  return { scratch: out, manifest, fileCount: copied.length };
}

function walkTree(root: string, deps: RuntimeDeps): Record<string, string> {
  const { fs, path } = deps;
  const map: Record<string, string> = {};
  let visited = 0;
  const skip = (rel: string): boolean => GUARD_SKIP.some((entry) => rel === entry || rel.endsWith(`/${entry}`) || rel.startsWith(`${entry}/`));
  const visit = (rel: string): void => {
    if (skip(rel)) return;
    const full = path.join(root, rel);
    let stat;
    try { stat = fs.lstatSync(full); } catch { return; }
    if (++visited > WALK_CAP) fail("tree too large to snapshot");
    if (stat.isSymbolicLink()) { map[rel] = `L:${fs.readlinkSync(full)}`; return; }
    if (stat.isDirectory()) { for (const name of fs.readdirSync(full).sort()) visit(`${rel}/${name}`); return; }
    map[rel] = stat.isFile() ? (stat.size > 2 * 1024 * 1024 ? `S:${stat.size}:${Math.round(stat.mtimeMs)}` : sha(fs.readBytesSync(full), deps)) : `O:${stat.mode}`;
  };
  for (const entry of GUARD_ROOTS) visit(entry);
  return map;
}
function state(root: string, deps: RuntimeDeps): TreeState {
  return { head: git(root, ["rev-parse", "HEAD"], deps).trim(), status: git(root, ["status", "--porcelain=v1", "-uall"], deps), tree: walkTree(root, deps) };
}
export function guard(root: string, action: string | undefined, file: string | undefined, deps: RuntimeDeps = defaultDeps()): GuardSnapshotResult | GuardCheckResult {
  if (!file) fail("--file is required");
  const target = deps.path.resolve(file as string);
  if (inside(root, realOrNearest(target, deps), deps)) fail("the snapshot file must be outside the project");
  if (action === "snapshot") { writeGuarded(target, `${JSON.stringify(state(root, deps))}\n`, deps); return { snapshot: target }; }
  if (action !== "check") fail("guard needs snapshot or check");
  const before = parseJson(readGuardedAbsolute(target, "the snapshot file", deps), "snapshot file") as TreeState;
  const now = state(root, deps);
  const paths = new Set([...Object.keys(before.tree), ...Object.keys(now.tree)]);
  const changed = [...paths].filter((p) => before.tree[p] !== now.tree[p]).sort();
  const clean = changed.length === 0 && before.head === now.head && before.status === now.status;
  return { clean, headChanged: before.head !== now.head, statusChanged: before.status !== now.status, changed };
}

export function count(root: string, since: string | undefined, pitch: string | undefined, deps: RuntimeDeps = defaultDeps()): CountResult {
  if (!/^[0-9a-f]{7,40}$/i.test(String(since))) fail("--since must be a commit hash");
  const own = pitch ? `.project/pitches/${safeRelative(pitch, deps)}/` : null;
  const listed = new Set([...git(root, ["diff", "--name-only", since as string, "--"], deps).split("\n"), ...git(root, ["ls-files", "--others", "--exclude-standard"], deps).split("\n")].filter(Boolean));
  const files = [...listed].filter((f) => !BOOKKEEPING_FILES.has(f) && !BOOKKEEPING_PREFIXES.some((p) => f.startsWith(p)) && !(own && f.startsWith(own))).sort();
  return { count: files.length, files };
}

export function canaryCheck(manifestFile: string | undefined, reportFile: string | undefined, deps: RuntimeDeps = defaultDeps()): CanaryResult {
  if (!manifestFile) fail("--manifest is required");
  if (!reportFile) fail("--report is required");
  const { canary } = parseJson(readGuardedAbsolute(deps.path.resolve(manifestFile as string), "the manifest", deps), "manifest") as { canary: { file: string; line: number } };
  const report = readGuardedAbsolute(deps.path.resolve(reportFile as string), "the report", deps);
  const name = (canary.file.split("/").pop() as string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${name}[:#L ]*(\\d+)(?:\\s*[-–]\\s*(\\d+))?`, "g");
  for (const match of report.matchAll(pattern)) {
    const low = Number(match[1]);
    const high = match[2] ? Number(match[2]) : low;
    if (canary.line >= low - 3 && canary.line <= high + 3) return { caught: true };
  }
  return { caught: false };
}

export function recordCheck(file: string | undefined, deps: RuntimeDeps = defaultDeps()): RecordResult {
  if (!file) fail("a record file path is required");
  const text = readGuardedAbsolute(deps.path.resolve(file as string), "the record", deps);
  const issues: string[] = [];
  const has = (re: RegExp): boolean => re.test(text);
  if (has(/^independent:\s*yes\b/im) && !has(/^canary:\s*caught\b/im)) issues.push("independent: yes requires canary: caught");
  if (!has(/^independent:\s*(yes|no|not-completed)\b/im)) issues.push("missing independent: yes|no|not-completed");
  if (!has(/^read-only:\s*verified by \S+/im)) issues.push("missing read-only: verified by <method>");
  if (!has(/^prompt-sha256:\s*[0-9a-f]{64}\b/im)) issues.push("missing prompt-sha256: <64 hex>");
  if (!has(/^model:\s*\S+/im)) issues.push("missing model:");
  if (!has(/^cross-file interactions:\s*(reviewed|not reviewed)\b/im)) issues.push("missing cross-file interactions: reviewed|not reviewed");
  if (!has(/^\|[^\n]*\bverified\b[^\n]*\|/im)) issues.push("missing findings table with a verified column");
  return { ok: issues.length === 0, issues };
}

interface CliResult { output: Output; exit: number }

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
  if (command === "count") { const result = count(root, options.since, options.pitch, deps); return { output: result, exit: options.max !== undefined && result.count > Number(options.max) ? 1 : 0 }; }
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
