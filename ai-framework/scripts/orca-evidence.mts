import { ATTEMPT_PREFIX, idOf } from "./orca-ledger.mts";
import type { Entry } from "./orca-diff-admit.mts";
import type { RuntimeDeps, StatLike } from "./runtime/types.mts";

/**
 * Evidence copy and settlement-proof cleanup for reconciled Orca worker attempts.
 *
 * Evidence (the accepted patch, a manifest with the sha256 of every changed file's final bytes as read from the
 * coordinator tree, and optional check output) lives under `<root>/.project/metrics/orca-evidence/<id>/`, outside every
 * worker worktree. A worker tree is removed only on POSITIVE proof: verified evidence, a parsed `released` settlement,
 * a real registered directory inside an allowed workspace root, a clean tree, and no commit that the evidence patch
 * does not account for. Anything else keeps the tree and reports `integrated-uncleaned` with the leftover paths.
 * Removal uses the plain worktree removal, which git itself refuses for a dirty or locked tree.
 */

export const EVIDENCE_DIR_PARTS: readonly string[] = Object.freeze([".project", "metrics", "orca-evidence"]);
export const MAX_PATCH_BYTES = 16 * 1024 * 1024;
export const MAX_CHECKS_BYTES = 1024 * 1024;
export const MAX_MANIFEST_BYTES = 1024 * 1024;
export const MAX_TREE_FILE_BYTES = 32 * 1024 * 1024;
export const DEFAULT_GIT_TIMEOUT_MS = 30_000;
const MAX_LEFTOVER = 50;
const MAX_GIT_OUTPUT = 8 * 1024 * 1024;

const PATCH_FILE = "patch.diff";
const MANIFEST_FILE = "manifest.json";
const CHECKS_FILE = "checks.txt";
const FINAL_FILE = "final.json";

export interface ManifestFile { path: string; sha256: string | null }
export interface Manifest {
  version: 1;
  attemptKey: string;
  patchSha256: string;
  patchBytes: number;
  checksSha256?: string;
  checksBytes?: number;
  entries: Entry[];
  files: ManifestFile[];
}

export type CopyResult =
  | { status: "ok"; manifestSha256: string; dir: string }
  | { status: "refused" | "conflict" | "invalid" | "failed"; reason: string };
export type VerifyResult =
  | { status: "ok"; manifestSha256: string; dir: string; manifest: Manifest }
  | { status: "missing" | "mismatch" | "refused" | "corrupt"; reason: string };

export interface EvidenceRef { root: string; attemptKey: string; manifestSha256?: string }
export interface WorktreeRef { path: string; baseline: string; allowedRoots: string[] }
export interface Settlement { released: boolean; state: string; reason?: string; processAction?: string }

export type CleanupDecision =
  | { action: "remove"; root: string; attemptKey: string; manifestSha256: string; worktree: string; gone: boolean }
  | { action: "keep"; state: "integrated-uncleaned"; leftover: string[]; reason: string };
export type CleanupResult =
  | { status: "ok"; reason: "removed" | "already-gone" }
  | { status: "refused" | "failed"; reason: string };
export type FinalState = "cleaned" | "integrated-uncleaned";
export type FinalResult =
  | { status: "recorded" | "unchanged"; state: FinalState }
  | { status: "corrupt" | "refused" | "failed" | "invalid" };

const SHA = /^[0-9a-f]{64}$/;
const BASELINE = /^[0-9a-f]{40}([0-9a-f]{24})?$/;
const errorCode = (error: unknown): unknown => (error !== null && typeof error === "object" ? (error as { code?: unknown }).code : undefined);
const isPlain = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

/** Repo-relative, forward-slash, no traversal, no control characters, never inside a `.git` directory. */
function safeRelPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 1024) return false;
  if (value.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(value)) return false;
  return value.split("/").every((part) => part !== "" && part !== "." && part !== ".." && part.toLowerCase() !== ".git");
}

type Bytes = { kind: "ok"; bytes: Uint8Array } | { kind: "missing" } | { kind: "refused" };

/** Reads one regular, non-symlink file with a size cap; the opened descriptor must be the file that was lstat-checked. */
function readRegular(deps: RuntimeDeps, file: string, max: number): Bytes {
  const { fs } = deps;
  let stat: StatLike;
  try { stat = fs.lstatSync(file); } catch (error) { return errorCode(error) === "ENOENT" ? { kind: "missing" } : { kind: "refused" }; }
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > max) return { kind: "refused" };
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
    const opened = fs.fstatSync(descriptor);
    if (!opened.isFile() || opened.size > max || opened.dev !== stat.dev || opened.ino !== stat.ino) return { kind: "refused" };
    const buffer = new Uint8Array(max + 1);
    let size = 0;
    while (size < buffer.length) {
      const count = fs.readSync(descriptor, buffer, size, buffer.length - size, null);
      if (!count) break;
      size += count;
    }
    if (size > max) return { kind: "refused" };
    return { kind: "ok", bytes: buffer.slice(0, size) };
  } catch { return { kind: "refused" }; } finally {
    if (descriptor !== undefined) { try { fs.closeSync(descriptor); } catch { /* read-only descriptor */ } }
  }
}

/** A file inside the coordinator tree: every directory component must be a real directory, the leaf a regular file. */
function readTreeFile(deps: RuntimeDeps, realRoot: string, rel: string): Bytes {
  const { fs, path } = deps;
  let current = realRoot;
  const parts = rel.split("/");
  for (const part of parts.slice(0, -1)) {
    current = path.join(current, part);
    let stat: StatLike;
    try { stat = fs.lstatSync(current); } catch (error) { return errorCode(error) === "ENOENT" ? { kind: "missing" } : { kind: "refused" }; }
    if (stat.isSymbolicLink() || !stat.isDirectory()) return { kind: "refused" };
  }
  return readRegular(deps, path.join(current, parts[parts.length - 1]), MAX_TREE_FILE_BYTES);
}

type Dir = { kind: "dir"; dir: string } | { kind: "missing" } | { kind: "refused" };

/** Walks `.project/metrics/orca-evidence/<id>` below the real root, lstat-checking every component. */
function walkEvidenceDir(deps: RuntimeDeps, root: string, id: string, create: boolean): Dir {
  const { fs, path } = deps;
  let current: string;
  try { current = fs.realpathSync(root); } catch { return { kind: "refused" }; }
  for (const part of [...EVIDENCE_DIR_PARTS, id]) {
    current = path.join(current, part);
    let stat: StatLike | undefined;
    try { stat = fs.lstatSync(current); } catch (error) {
      if (errorCode(error) !== "ENOENT") return { kind: "refused" };
    }
    if (!stat) {
      if (!create) return { kind: "missing" };
      try { fs.mkdirSync(current, { recursive: false, mode: 0o700 }); stat = fs.lstatSync(current); } catch { return { kind: "refused" }; }
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) return { kind: "refused" };
  }
  return { kind: "dir", dir: current };
}

/** Writes `bytes` to `name` unless identical content is already there; different content is a conflict. Atomic temp+rename. */
function writeOnce(deps: RuntimeDeps, dir: string, name: string, bytes: Uint8Array): "ok" | "conflict" | "refused" | "failed" {
  const { fs, path } = deps;
  const file = path.join(dir, name);
  const existing = readRegular(deps, file, MAX_PATCH_BYTES);
  if (existing.kind === "refused") return "refused";
  if (existing.kind === "ok") return deps.crypto.sha256Hex(existing.bytes) === deps.crypto.sha256Hex(bytes) ? "ok" : "conflict";
  const temp = path.join(dir, `.tmp-${deps.crypto.randomUUID()}`);
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(temp, "wx", 0o600);
    fs.writeSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    // The slot must still be empty just before the rename: never replace something that appeared meanwhile.
    try { fs.lstatSync(file); throw new Error("slot-changed"); } catch (error) { if (errorCode(error) !== "ENOENT") throw error; }
    fs.renameSync(temp, file);
    return "ok";
  } catch {
    if (descriptor !== undefined) { try { fs.closeSync(descriptor); } catch { /* best effort */ } }
    try { fs.unlinkSync(temp); } catch { /* temp may not exist */ }
    return "failed";
  }
}

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

function serializeManifest(manifest: Manifest): string {
  return JSON.stringify({
    version: 1,
    attemptKey: manifest.attemptKey,
    patchSha256: manifest.patchSha256,
    patchBytes: manifest.patchBytes,
    ...(manifest.checksSha256 !== undefined ? { checksSha256: manifest.checksSha256, checksBytes: manifest.checksBytes } : {}),
    entries: manifest.entries.map((entry) => ({
      path: entry.path, kind: entry.kind, ...(entry.from !== undefined ? { from: entry.from } : {}), mode: entry.mode, binary: entry.binary, size: entry.size,
    })),
    files: manifest.files.map((file) => ({ path: file.path, sha256: file.sha256 })),
  });
}

function validEntry(value: unknown): value is Entry {
  if (!isPlain(value) || !safeRelPath(value.path)) return false;
  if (!["add", "modify", "delete", "rename"].includes(value.kind as string)) return false;
  if (value.kind === "rename" ? !safeRelPath(value.from) : value.from !== undefined) return false;
  return (value.mode === "100644" || value.mode === "100755") && typeof value.binary === "boolean" && Number.isSafeInteger(value.size) && (value.size as number) >= 0;
}

function parseManifest(text: string, attemptKey: string): Manifest | undefined {
  let value: unknown;
  try { value = JSON.parse(text); } catch { return undefined; }
  if (!isPlain(value) || value.version !== 1 || value.attemptKey !== attemptKey) return undefined;
  if (typeof value.patchSha256 !== "string" || !SHA.test(value.patchSha256) || !Number.isSafeInteger(value.patchBytes) || (value.patchBytes as number) < 0) return undefined;
  const hasChecks = value.checksSha256 !== undefined;
  if (hasChecks && (typeof value.checksSha256 !== "string" || !SHA.test(value.checksSha256) || !Number.isSafeInteger(value.checksBytes))) return undefined;
  if (!Array.isArray(value.entries) || value.entries.length === 0 || !value.entries.every(validEntry)) return undefined;
  if (!Array.isArray(value.files) || !value.files.every((file) => isPlain(file) && safeRelPath(file.path) && (file.sha256 === null || (typeof file.sha256 === "string" && SHA.test(file.sha256))))) return undefined;
  if ((value.files as unknown[]).length === 0) return undefined;
  return value as unknown as Manifest;
}

/** The files a set of entries touches, with their final sha256 (null = must be absent). A string is the refusal reason. */
function manifestFiles(entries: Entry[], realRoot: string, deps: RuntimeDeps): ManifestFile[] | string {
  const files: ManifestFile[] = [];
  const seen = new Set<string>();
  const add = (file: string, sha256: string | null): string | undefined => {
    // A rename's source is reported by admission as its own delete entry too: the same absent file twice is one fact.
    if (seen.has(file)) return sha256 === null && files.find((item) => item.path === file)?.sha256 === null ? undefined : "duplicate-path";
    seen.add(file);
    files.push({ path: file, sha256 });
    return undefined;
  };
  for (const entry of entries) {
    if (entry.kind === "rename" || entry.kind === "delete") {
      const gone = entry.kind === "rename" ? entry.from as string : entry.path;
      const problem = add(gone, null);
      if (problem) return problem;
      if (entry.kind === "delete") continue;
    }
    const read = readTreeFile(deps, realRoot, entry.path);
    if (read.kind !== "ok") return read.kind === "missing" ? "changed-file-missing" : "changed-file-refused";
    const problem = add(entry.path, deps.crypto.sha256Hex(read.bytes));
    if (problem) return problem;
  }
  return files;
}

export function copyEvidence(options: { root: string; attemptKey: string; patch: string; entries: Entry[]; checks?: string; deps: RuntimeDeps }): CopyResult {
  const { root, attemptKey, patch, entries, checks, deps } = options;
  const id = idOf(attemptKey, ATTEMPT_PREFIX);
  if (id === undefined) return { status: "invalid", reason: "attempt-key" };
  if (typeof patch !== "string" || (checks !== undefined && typeof checks !== "string") || !Array.isArray(entries) || !entries.every(validEntry)) return { status: "invalid", reason: "shape" };
  const patchBytes = encode(patch);
  const checkBytes = checks === undefined ? undefined : encode(checks);
  if (patchBytes.length > MAX_PATCH_BYTES || (checkBytes && checkBytes.length > MAX_CHECKS_BYTES)) return { status: "refused", reason: "oversize" };
  let realRoot: string;
  try { realRoot = deps.fs.realpathSync(root); } catch { return { status: "refused", reason: "root" }; }
  const files = manifestFiles(entries, realRoot, deps);
  if (typeof files === "string") return { status: "refused", reason: files };
  const manifest: Manifest = {
    version: 1, attemptKey, patchSha256: deps.crypto.sha256Hex(patchBytes), patchBytes: patchBytes.length,
    ...(checkBytes ? { checksSha256: deps.crypto.sha256Hex(checkBytes), checksBytes: checkBytes.length } : {}),
    entries, files,
  };
  const manifestBytes = encode(serializeManifest(manifest));
  if (manifestBytes.length > MAX_MANIFEST_BYTES) return { status: "refused", reason: "oversize" };
  const dir = walkEvidenceDir(deps, root, id, true);
  if (dir.kind !== "dir") return { status: "refused", reason: "evidence-dir" };
  // The manifest goes last: it is the commit marker, so a crash before it leaves only files a re-run rewrites identically.
  const writes: Array<[string, Uint8Array]> = [[PATCH_FILE, patchBytes]];
  if (checkBytes) writes.push([CHECKS_FILE, checkBytes]);
  writes.push([MANIFEST_FILE, manifestBytes]);
  for (const [name, bytes] of writes) {
    const outcome = writeOnce(deps, dir.dir, name, bytes);
    if (outcome !== "ok") return { status: outcome, reason: `${name}:${outcome}` };
  }
  const verified = verifyEvidence({ root, attemptKey, deps });
  if (verified.status !== "ok") return { status: "failed", reason: `verify:${verified.status}` };
  return { status: "ok", manifestSha256: verified.manifestSha256, dir: dir.dir };
}

export function verifyEvidence(options: { root: string; attemptKey: string; expectedManifestSha256?: string; deps: RuntimeDeps }): VerifyResult {
  const { root, attemptKey, deps } = options;
  const id = idOf(attemptKey, ATTEMPT_PREFIX);
  if (id === undefined) return { status: "refused", reason: "attempt-key" };
  const dir = walkEvidenceDir(deps, root, id, false);
  if (dir.kind !== "dir") return { status: dir.kind, reason: "evidence-dir" };
  const { path } = deps;
  const manifestRead = readRegular(deps, path.join(dir.dir, MANIFEST_FILE), MAX_MANIFEST_BYTES);
  if (manifestRead.kind !== "ok") return { status: manifestRead.kind, reason: "manifest" };
  const manifestSha256 = deps.crypto.sha256Hex(manifestRead.bytes);
  if (options.expectedManifestSha256 !== undefined && options.expectedManifestSha256 !== manifestSha256) return { status: "mismatch", reason: "manifest-sha" };
  const manifest = parseManifest(new TextDecoder("utf-8", { fatal: false }).decode(manifestRead.bytes), attemptKey);
  if (!manifest) return { status: "corrupt", reason: "manifest-shape" };
  const patchRead = readRegular(deps, path.join(dir.dir, PATCH_FILE), MAX_PATCH_BYTES);
  if (patchRead.kind === "refused") return { status: "refused", reason: "patch" };
  if (patchRead.kind === "missing") return { status: "mismatch", reason: "patch-missing" };
  if (deps.crypto.sha256Hex(patchRead.bytes) !== manifest.patchSha256 || patchRead.bytes.length !== manifest.patchBytes) return { status: "mismatch", reason: "patch" };
  if (manifest.checksSha256 !== undefined) {
    const checksRead = readRegular(deps, path.join(dir.dir, CHECKS_FILE), MAX_CHECKS_BYTES);
    if (checksRead.kind === "refused") return { status: "refused", reason: "checks" };
    if (checksRead.kind === "missing") return { status: "mismatch", reason: "checks-missing" };
    if (deps.crypto.sha256Hex(checksRead.bytes) !== manifest.checksSha256) return { status: "mismatch", reason: "checks" };
  }
  let realRoot: string;
  try { realRoot = deps.fs.realpathSync(root); } catch { return { status: "refused", reason: "root" }; }
  for (const file of manifest.files) {
    const tree = readTreeFile(deps, realRoot, file.path);
    if (tree.kind === "refused") return { status: "refused", reason: `tree:${file.path}` };
    if (file.sha256 === null) {
      if (tree.kind !== "missing") return { status: "mismatch", reason: `tree-present:${file.path}` };
    } else if (tree.kind !== "ok" || deps.crypto.sha256Hex(tree.bytes) !== file.sha256) {
      return { status: "mismatch", reason: `tree:${file.path}` };
    }
  }
  // File contents match; the executable bit is part of the change too (a reverse `git apply --check` ignores it).
  for (const entry of manifest.entries) {
    if (entry.kind === "delete") continue;
    try {
      const stat = deps.fs.lstatSync(path.join(realRoot, ...entry.path.split("/")));
      if (((stat.mode & 0o111) !== 0) !== (entry.mode === "100755")) return { status: "mismatch", reason: `mode:${entry.path}` };
    } catch { return { status: "mismatch", reason: `mode:${entry.path}` }; }
  }
  return { status: "ok", manifestSha256, dir: dir.dir, manifest };
}

// ---- cleanup ----------------------------------------------------------------------------------------------------

const GIT_FLAGS = ["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false", "-c", "core.attributesFile=/dev/null", "-c", "protocol.file.allow=never", "-c", "diff.external="];

type Git = { ok: true; status: number | null; stdout: string } | { ok: false; reason: string };

/** Remaining budget in whole ms, or undefined when under 1 ms. No deadline means the default per-command timeout. */
function budget(deps: RuntimeDeps, deadlineMs: number | undefined): number | undefined {
  if (deadlineMs === undefined) return DEFAULT_GIT_TIMEOUT_MS;
  const remaining = deadlineMs - deps.clock.monotonicMs();
  return remaining >= 1 ? Math.min(remaining, DEFAULT_GIT_TIMEOUT_MS) : undefined;
}

/** Absolute PATH entries only, so a relative entry such as `node_modules/.bin` cannot make git resolve to a worker's file. */
function absolutePath(deps: RuntimeDeps): string {
  const entries = (deps.proc.env.PATH ?? "").split(deps.path.delimiter).filter((directory) => deps.path.isAbsolute(directory) && !directory.includes("\0")).slice(0, 64);
  return entries.length ? entries.join(deps.path.delimiter) : "/usr/bin:/bin";
}

async function git(deps: RuntimeDeps, cwd: string, args: string[], deadlineMs: number | undefined): Promise<Git> {
  const timeoutMs = budget(deps, deadlineMs);
  if (timeoutMs === undefined) return { ok: false, reason: "time-budget" };
  const env: Record<string, string | undefined> = {
    PATH: absolutePath(deps), GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_TERMINAL_PROMPT: "0", LC_ALL: "C",
  };
  try {
    const result = await deps.child.run("git", [...GIT_FLAGS, ...args], { cwd, env, timeoutMs, maxBufferBytes: MAX_GIT_OUTPUT });
    // Timeout and overflow are read only from errorCode, never from stderr text, and never retried.
    if (result.errorCode === "ETIMEDOUT") return { ok: false, reason: "git-timeout" };
    if (result.errorCode) return { ok: false, reason: "git-output-overflow" };
    return { ok: true, status: result.status, stdout: result.stdout };
  } catch { return { ok: false, reason: "git-error" }; }
}

const keep = (reason: string, leftover: string[] = []): CleanupDecision => ({ action: "keep", state: "integrated-uncleaned", leftover: leftover.slice(0, MAX_LEFTOVER), reason });

function parseSettlement(value: unknown): Settlement | undefined {
  let parsed = value;
  if (typeof value === "string") { try { parsed = JSON.parse(value); } catch { return undefined; } }
  if (!isPlain(parsed) || typeof parsed.released !== "boolean" || typeof parsed.state !== "string") return undefined;
  return parsed as unknown as Settlement;
}

/** Positive proof that Orca released the worker. `retained` / `user_takeover` and every unknown shape are not proof. */
function settlementIsPositive(settlement: Settlement | undefined): boolean {
  return settlement !== undefined && settlement.released === true && settlement.state === "released" && settlement.reason !== "user_takeover";
}

type RawChange = { path: string; mode: string; status: string };

/** Parses `git diff --raw -z --no-renames` output. */
function parseRaw(output: string): RawChange[] | undefined {
  const fields = output.split("\0");
  if (fields[fields.length - 1] === "") fields.pop();
  const changes: RawChange[] = [];
  for (let index = 0; index < fields.length; index += 2) {
    const meta = /^:(\d{6}) (\d{6}) [0-9a-f]+ [0-9a-f]+ ([A-Z])$/.exec(fields[index] ?? "");
    const file = fields[index + 1];
    if (!meta || file === undefined) return undefined;
    changes.push({ path: file, mode: meta[2], status: meta[3] });
  }
  return changes;
}

export async function decideCleanup(options: { evidence: EvidenceRef; settlement: unknown; worktree: WorktreeRef; deps: RuntimeDeps; deadlineMs?: number }): Promise<CleanupDecision> {
  const { evidence, worktree, deps, deadlineMs } = options;
  const { fs, path } = deps;
  const leftover = [worktree.path];

  const verified = verifyEvidence({ root: evidence.root, attemptKey: evidence.attemptKey, expectedManifestSha256: evidence.manifestSha256, deps });
  if (verified.status !== "ok") return keep(`evidence-${verified.status}`, leftover);
  if (!settlementIsPositive(parseSettlement(options.settlement))) return keep("settlement-not-positive", leftover);

  if (typeof worktree.path !== "string" || !path.isAbsolute(worktree.path) || typeof worktree.baseline !== "string" || !BASELINE.test(worktree.baseline)) return keep("worktree-ref-invalid", leftover);
  if (!Array.isArray(worktree.allowedRoots) || worktree.allowedRoots.length === 0) return keep("no-allowed-root", leftover);
  const allowed: string[] = [];
  for (const candidate of worktree.allowedRoots) {
    try { allowed.push(fs.realpathSync(candidate)); } catch { /* an unresolvable root allows nothing */ }
  }
  let realRoot: string;
  try { realRoot = fs.realpathSync(evidence.root); } catch { return keep("root-unresolvable", leftover); }
  const wanted = path.resolve(worktree.path);
  const inside = (child: string, parent: string): boolean => child !== parent && child.startsWith(parent.endsWith(path.sep) ? parent : parent + path.sep);

  let stat: StatLike | undefined;
  try { stat = fs.lstatSync(wanted); } catch (error) { if (errorCode(error) !== "ENOENT") return keep("worktree-unreadable", leftover); }
  if (!stat) {
    // Already removed: only the (symlink-free) parent has to sit inside an allowed root.
    let parent: string;
    try { parent = fs.realpathSync(path.dirname(wanted)); } catch { return keep("worktree-parent-unresolvable", leftover); }
    if (parent !== path.dirname(wanted) || !allowed.some((root) => parent === root || inside(parent, root))) return keep("outside-allowed-root", leftover);
    return { action: "remove", root: evidence.root, attemptKey: evidence.attemptKey, manifestSha256: verified.manifestSha256, worktree: wanted, gone: true };
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) return keep("worktree-not-a-directory", leftover);
  let real: string;
  try { real = fs.realpathSync(wanted); } catch { return keep("worktree-unresolvable", leftover); }
  if (real !== wanted) return keep("worktree-path-has-symlink", leftover);
  if (!allowed.some((root) => inside(real, root))) return keep("outside-allowed-root", leftover);
  if (realRoot === real || inside(realRoot, real)) return keep("worktree-contains-coordinator", leftover);

  const listed = await git(deps, realRoot, ["worktree", "list", "--porcelain", "-z"], deadlineMs);
  if (!listed.ok) return keep(listed.reason, leftover);
  if (listed.status !== 0) return keep("worktree-list-failed", leftover);
  const registered = listed.stdout.split("\0").filter((line) => line.startsWith("worktree ")).map((line) => line.slice(9));
  const registeredReal: string[] = [];
  for (const item of registered) { try { registeredReal.push(fs.realpathSync(item)); } catch { /* stale entry */ } }
  if (!registeredReal.includes(real)) return keep("worktree-not-registered", leftover);

  // `git status` runs clean filters on tracked files; a configured filter driver would execute worker-chosen commands
  // against the worker's tree, so a repository with any filter driver keeps its worktree.
  const filters = await git(deps, real, ["config", "--get-regexp", "^filter\\."], deadlineMs);
  if (!filters.ok) return keep(filters.reason, leftover);
  if (filters.status === 0) return keep("filter-driver-present", leftover);
  if (filters.status !== 1) return keep("config-failed", leftover);

  // `git status` descends into nested repositories (gitlinks) and runs their filters; refuse before it can.
  const gitlinks = await git(deps, real, ["ls-files", "-s", "-z"], deadlineMs);
  if (!gitlinks.ok) return keep(gitlinks.reason, leftover);
  if (gitlinks.status !== 0) return keep("ls-files-failed", leftover);
  if (gitlinks.stdout.split("\0").some((record) => record.startsWith("160000 "))) return keep("submodule-present", leftover);

  const status = await git(deps, real, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignored", "--ignore-submodules=all"], deadlineMs);
  if (!status.ok) return keep(status.reason, leftover);
  if (status.status !== 0) return keep("status-failed", leftover);
  if (status.stdout.length > 0) {
    const dirty = status.stdout.split("\0").filter(Boolean).map((line) => path.join(real, line.slice(3)));
    return keep("worktree-dirty", [real, ...dirty]);
  }

  const ancestor = await git(deps, real, ["merge-base", "--is-ancestor", worktree.baseline, "HEAD"], deadlineMs);
  if (!ancestor.ok) return keep(ancestor.reason, leftover);
  if (ancestor.status !== 0) return keep("baseline-not-ancestor", leftover);
  const raw = await git(deps, real, ["diff", "--raw", "-z", "--no-renames", "--no-ext-diff", "--no-textconv", worktree.baseline, "HEAD", "--"], deadlineMs);
  if (!raw.ok) return keep(raw.reason, leftover);
  if (raw.status !== 0) return keep("diff-failed", leftover);
  const changes = parseRaw(raw.stdout);
  if (!changes) return keep("diff-unparseable", leftover);
  // Every commit beyond the baseline must be exactly what the evidence accounts for: same paths, same final bytes, same mode.
  const accounted = new Map(verified.manifest.files.map((file) => [file.path, file.sha256]));
  const modes = new Map(verified.manifest.entries.filter((entry) => entry.kind !== "delete").map((entry) => [entry.path, entry.mode]));
  const unaccepted: string[] = [];
  for (const change of changes) {
    const expected = accounted.get(change.path);
    if (expected === undefined) { unaccepted.push(path.join(real, change.path)); continue; }
    if (expected === null) {
      if (change.status !== "D") unaccepted.push(path.join(real, change.path));
      continue;
    }
    const bytes = readTreeFile(deps, real, change.path);
    const modeOk = modes.get(change.path) === change.mode;
    if (change.status === "D" || bytes.kind !== "ok" || deps.crypto.sha256Hex(bytes.bytes) !== expected || !modeOk) unaccepted.push(path.join(real, change.path));
  }
  const changed = new Set(changes.map((change) => change.path));
  for (const file of verified.manifest.files) if (!changed.has(file.path)) unaccepted.push(path.join(real, file.path));
  if (unaccepted.length > 0) return keep("unaccepted-commits", [real, ...unaccepted]);

  return { action: "remove", root: evidence.root, attemptKey: evidence.attemptKey, manifestSha256: verified.manifestSha256, worktree: real, gone: false };
}

/** Executes a "remove" decision with the plain worktree removal. Idempotent: a tree that is already gone is success. */
export async function performCleanup(decision: CleanupDecision, deps: RuntimeDeps, deadlineMs?: number): Promise<CleanupResult> {
  if (!isPlain(decision) || decision.action !== "remove") return { status: "refused", reason: "not-a-remove-decision" };
  const { fs, path } = deps;
  const target = decision.worktree;
  if (typeof target !== "string" || !path.isAbsolute(target)) return { status: "refused", reason: "worktree-path" };
  const exists = (): boolean | undefined => {
    try { fs.lstatSync(target); return true; } catch (error) { return errorCode(error) === "ENOENT" ? false : undefined; }
  };
  const before = exists();
  if (before === undefined) return { status: "refused", reason: "worktree-unreadable" };
  if (before === false) return { status: "ok", reason: "already-gone" };
  let real: string;
  try { real = fs.realpathSync(target); } catch { return { status: "refused", reason: "worktree-unresolvable" }; }
  if (real !== target) return { status: "refused", reason: "worktree-path-has-symlink" };
  let realRoot: string;
  try { realRoot = fs.realpathSync(decision.root); } catch { return { status: "refused", reason: "root-unresolvable" }; }
  // A decision is only a claim: re-verify the evidence it names and that the tree is still clean (ignored files included,
  // since `git worktree remove` deletes them silently) before anything is removed.
  const proof = verifyEvidence({ root: decision.root, attemptKey: decision.attemptKey, expectedManifestSha256: decision.manifestSha256, deps });
  if (proof.status !== "ok") return { status: "refused", reason: `evidence-${proof.status}` };
  // `git worktree remove` runs its own status in the worker tree: repeat the filter and nested-repository guards now.
  const driversNow = await git(deps, real, ["config", "--get-regexp", "^filter\\."], deadlineMs);
  if (!driversNow.ok) return { status: "failed", reason: driversNow.reason };
  if (driversNow.status !== 1) return { status: "refused", reason: "filter-driver-present" };
  const linksNow = await git(deps, real, ["ls-files", "-s", "-z"], deadlineMs);
  if (!linksNow.ok) return { status: "failed", reason: linksNow.reason };
  if (linksNow.status !== 0 || linksNow.stdout.split("\0").some((record) => record.startsWith("160000 "))) return { status: "refused", reason: "submodule-present" };
  const cleanNow = await git(deps, real, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignored", "--ignore-submodules=all"], deadlineMs);
  if (!cleanNow.ok) return { status: "failed", reason: cleanNow.reason };
  if (cleanNow.status !== 0 || cleanNow.stdout.length > 0) return { status: "refused", reason: "worktree-dirty" };
  const removed = await git(deps, realRoot, ["worktree", "remove", "--", target], deadlineMs);
  if (!removed.ok) return { status: "failed", reason: removed.reason };
  // A crash after git finished but before we saw it is the same as a clean removal: look at the disk, not the exit code alone.
  if (exists() === false) return { status: "ok", reason: removed.status === 0 ? "removed" : "already-gone" };
  return { status: "failed", reason: "git-refused-removal" };
}

/**
 * Records the attempt's final state once. The first record wins: a late second `released` receipt or a late
 * `worker_done` calls this (or is dropped by the caller) and gets `unchanged` with the state already on disk.
 */
export function recordFinalState(options: { root: string; attemptKey: string; state: FinalState; leftover?: string[]; deps: RuntimeDeps }): FinalResult {
  const { root, attemptKey, state, deps } = options;
  const id = idOf(attemptKey, ATTEMPT_PREFIX);
  if (id === undefined || (state !== "cleaned" && state !== "integrated-uncleaned")) return { status: "invalid" };
  const dir = walkEvidenceDir(deps, root, id, false);
  if (dir.kind !== "dir") return { status: dir.kind === "missing" ? "failed" : "refused" };
  const file = deps.path.join(dir.dir, FINAL_FILE);
  const read = (): FinalResult | undefined => {
    const existing = readRegular(deps, file, 64 * 1024);
    if (existing.kind === "missing") return undefined;
    if (existing.kind === "refused") return { status: "refused" };
    try {
      const value: unknown = JSON.parse(new TextDecoder().decode(existing.bytes));
      if (isPlain(value) && (value.state === "cleaned" || value.state === "integrated-uncleaned")) return { status: "unchanged", state: value.state };
    } catch { /* falls through to corrupt */ }
    return { status: "corrupt" };
  };
  const present = read();
  if (present) return present;
  const leftover = (options.leftover ?? []).filter((item) => typeof item === "string").slice(0, MAX_LEFTOVER);
  const outcome = writeOnce(deps, dir.dir, FINAL_FILE, encode(JSON.stringify({ state, leftover })));
  if (outcome === "ok") return { status: "recorded", state };
  return read() ?? { status: "failed" };
}
