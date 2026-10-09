import type { RunResult, RuntimeDeps, SpawnOptions, StatLike } from "./runtime/types.mts";

/**
 * Diff admission for Orca worker changes (reconcile-core R1).
 *
 * A worker's git worktree is untrusted, worker-controlled input: its files, its index, its `.gitattributes` and the
 * git config it shares with the coordinator. `admitDiff` decides whether the worker's change relative to an explicit
 * `baseline` commit may be applied to the coordinator checkout, and returns the exact patch to apply.
 *
 * HOW THE CHANGED SET IS DERIVED (never from worker mail or claims):
 *   1. candidate paths = baseline tree paths (`ls-tree`) + worker index paths (`ls-files -s`) + untracked, not ignored
 *      paths (`ls-files --others --exclude-standard`); every candidate is path-validated and lstat-checked component
 *      by component before git is asked to read it;
 *   2. every regular file is hashed with `hash-object --no-filters` into a TEMPORARY object directory and recorded in a
 *      TEMPORARY index, so no clean/smudge filter, eol or encoding conversion ever runs on worker content and nothing is
 *      written to the worker's or coordinator's repository;
 *   3. the changed set is `git diff --raw -z --no-renames` between the baseline commit and that synthesized tree; a
 *      second `--find-renames` pass only annotates an add as a rename of a delete that is ALSO reported, it never removes
 *      an entry; `patch` is the full `git diff --binary --no-renames` of the same two trees.
 * Every git call is hardened (hooks, fsmonitor, attribute files, external diff and textconv off; system/global config
 * off; replace objects off; env allow-list), bounded by a timeout and an output cap, and recognises timeout/overflow only
 * by the child's `errorCode` (rejected, never retried).
 *
 * Residual (documented): a worker that is still running can swap a file between our lstat and git's read; a
 * before/after lstat comparison of every hashed file narrows that to a refusal (`worktree-changed`). Admission is meant
 * to run on a settled worker.
 */

export type EntryKind = "add" | "modify" | "delete" | "rename";
export type EntryMode = "100644" | "100755";
export interface Entry {
  path: string;
  kind: EntryKind;
  /** The deleted path this add was detected as renamed from (the delete is reported as its own entry too). */
  from?: string;
  /** New mode for add/modify/rename (a 644<->755 flip is a `modify` whose mode differs from the baseline); old mode for delete. */
  mode: EntryMode;
  binary: boolean;
  /** Bytes of the new content (0 for a delete). */
  size: number;
}
export type AdmitResult =
  | { status: "admitted"; entries: Entry[]; patch: string }
  | { status: "rejected"; reason: string; path?: string };
export interface AdmitOptions {
  /** Absolute path of the worker's git worktree (top level). */
  worktree: string;
  /** Full 40-hex commit id the worker started from. */
  baseline: string;
  deps: RuntimeDeps;
}

export const MAX_ENTRIES = 500;
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
export const MAX_CANDIDATES = 200_000;
export const MAX_PATH_BYTES = 4096;
export const MAX_COMPONENT_BYTES = 255;
export const GIT_TIMEOUT_MS = 30_000;
export const ADMIT_BUDGET_MS = 120_000;
const LIST_MAX_BYTES = 32 * 1024 * 1024;
const PATCH_MAX_BYTES = 64 * 1024 * 1024;

/** Every rejection reason, one per rule. */
export const REASONS = Object.freeze([
  "baseline-dash", "baseline-invalid", "baseline-unknown", "baseline-not-ancestor",
  "worktree-invalid", "worktree-mismatch", "worktree-unreadable", "worktree-changed",
  "git-timeout", "git-output-limit", "git-failed",
  "symlink", "symlink-ancestor", "gitlink", "non-regular", "unmerged",
  "path-invalid", "path-control", "path-absolute", "path-backslash", "path-dotdot", "path-dash", "path-too-long", "path-git-dir",
  "case-collision", "mode-special", "mode-invalid", "too-large", "patch-not-utf8", "admit-error", "path-local-data",
] as const);
export type RejectReason = (typeof REASONS)[number];

/** Hardened `-c` settings placed before every git subcommand. Command-line config wins over every config file. */
export const GIT_HARDENING: readonly string[] = Object.freeze([
  "core.hooksPath=/dev/null", "core.fsmonitor=false", "core.attributesFile=/dev/null", "diff.external=",
  "protocol.file.allow=never", "core.untrackedCache=false", "core.excludesFile=/dev/null", "diff.noprefix=false",
  "diff.mnemonicPrefix=false", "diff.relative=false", "diff.orderFile=/dev/null", "diff.ignoreSubmodules=none",
  "diff.submodule=short", "diff.suppressBlankEmpty=false", "color.ui=false", "gc.auto=0", "maintenance.auto=false",
  "submodule.recurse=false",
].flatMap((setting) => ["-c", setting]));
/** Flags for every `git diff` between the baseline and the synthesized tree. */
const DIFF_FLAGS: readonly string[] = Object.freeze([
  "--no-ext-diff", "--no-textconv", "--no-color", "--no-relative", "--ignore-submodules=none", "--submodule=short",
  "--src-prefix=a/", "--dst-prefix=b/",
]);

const CONTROL = new RegExp("[\\u0000-\\u001f\\u007f-\\u009f\\u00ad\\u061c\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u2064\\u2066-\\u2069\\ufeff]");
const HEX40 = /^[0-9a-f]{40}$/;
const encoder = new TextEncoder();
const byteLength = (text: string): number => encoder.encode(text).length;

class Rejection {
  readonly reason: RejectReason;
  readonly path?: string;
  constructor(reason: RejectReason, path?: string) {
    this.reason = reason;
    if (path !== undefined) this.path = path;
  }
}
const reject = (reason: RejectReason, path?: string): never => { throw new Rejection(reason, path); };

/** Reason a path from git or the worker tree is unsafe to name in a patch, or undefined when it is acceptable. */
export function validatePath(path: unknown): RejectReason | undefined {
  if (typeof path !== "string" || path === "") return "path-invalid";
  if (byteLength(path) > MAX_PATH_BYTES) return "path-too-long";
  if (CONTROL.test(path)) return "path-control";
  // U+FFFD is what a non-UTF-8 name decodes to; such a name cannot round-trip through a text patch.
  if (path.includes("�") || path.startsWith("\"")) return "path-invalid";
  if (path.startsWith("/") || /^[A-Za-z]:/.test(path)) return "path-absolute";
  if (path.includes("\\")) return "path-backslash";
  if (path.startsWith("-")) return "path-dash";
  // Local data (ledger, snapshots, evidence) is never something a worker may land in the coordinator.
  if (/^\.project\/metrics(\/|$)/i.test(path)) return "path-local-data";
  for (const part of path.split("/")) {
    if (part === "" || part === ".") return "path-invalid";
    if (part === "..") return "path-dotdot";
    if (byteLength(part) > MAX_COMPONENT_BYTES) return "path-too-long";
    const folded = part.toLowerCase().replace(/[. ]+$/, "");
    if (folded === ".git" || folded === "git~1") return "path-git-dir";
  }
  return undefined;
}

/** Case- and Unicode-normalization-insensitive key: two paths with the same key are one file on APFS/NTFS. */
const fold = (path: string): string => path.normalize("NFC").toUpperCase().toLowerCase().normalize("NFC");

const errorCode = (error: unknown): unknown => (error !== null && typeof error === "object" ? (error as { code?: unknown }).code : undefined);
const splitZ = (text: string): string[] => {
  const parts = text.split("\0");
  if (parts.length && parts[parts.length - 1] === "") parts.pop();
  return parts;
};
const mustHex = (value: string | undefined): string => (value !== undefined && HEX40.test(value) ? value : reject("git-failed"));

interface TreeEntry { mode: string; sha: string; size: number }
interface IndexEntry { mode: string; sha: string }
interface RawRecord { oldMode: string; newMode: string; status: string; path: string }

export async function admitDiff(options: AdmitOptions): Promise<AdmitResult> {
  const { deps } = options;
  let scratch: string | undefined;
  try {
    const { fs, path } = deps;
    const baseline: unknown = options.baseline;
    if (typeof baseline !== "string" || baseline.startsWith("-")) return { status: "rejected", reason: typeof baseline === "string" ? "baseline-dash" : "baseline-invalid" };
    if (!HEX40.test(baseline)) return { status: "rejected", reason: "baseline-invalid" };
    const worktree: unknown = options.worktree;
    if (typeof worktree !== "string" || !path.isAbsolute(worktree) || CONTROL.test(worktree)) return { status: "rejected", reason: "worktree-invalid" };
    let root: string;
    try {
      root = fs.realpathSync(worktree);
      if (!fs.lstatSync(root).isDirectory()) return { status: "rejected", reason: "worktree-invalid" };
    } catch { return { status: "rejected", reason: "worktree-invalid" }; }

    const deadline = deps.clock.monotonicMs() + ADMIT_BUDGET_MS;
    const baseEnv: Record<string, string> = {
      GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_TERMINAL_PROMPT: "0", GIT_ATTR_NOSYSTEM: "1",
      GIT_NO_REPLACE_OBJECTS: "1", GIT_OPTIONAL_LOCKS: "0", GIT_PAGER: "cat", LC_ALL: "C",
    };
    const pathValue = (deps.proc.env.PATH ?? "").split(path.delimiter).filter((entry) => path.isAbsolute(entry) && !entry.includes("\0")).slice(0, 64);
    if (pathValue.length) baseEnv.PATH = pathValue.join(path.delimiter);
    let stageEnv: Record<string, string> = {};

    const spawnOptions = (input: string | undefined, maxBufferBytes: number): SpawnOptions => {
      const remaining = deadline - deps.clock.monotonicMs();
      if (!(remaining >= 1)) reject("git-timeout");
      return { cwd: root, env: { ...baseEnv, ...stageEnv }, input, timeoutMs: Math.floor(Math.min(GIT_TIMEOUT_MS, remaining)), maxBufferBytes, killSignal: "SIGKILL" };
    };
    const checked = (result: RunResult, okStatuses: readonly number[]): RunResult => {
      if (result.errorCode === "ETIMEDOUT") reject("git-timeout");
      if (result.errorCode === "ENOBUFS") reject("git-output-limit");
      if (result.signal || result.status === null || !okStatuses.includes(result.status)) reject("git-failed");
      return result;
    };
    /** Hardened git through deps.child.run; returns stdout text. */
    const git = async (args: readonly string[], extra: { input?: string; maxBytes?: number; ok?: readonly number[] } = {}): Promise<RunResult> =>
      checked(await deps.child.run("git", [...GIT_HARDENING, ...args], spawnOptions(extra.input, extra.maxBytes ?? LIST_MAX_BYTES)), extra.ok ?? [0]);

    // Repository identity: the worktree we were given must be the top level git works on (a worker-set core.worktree
    // or a .git file pointing elsewhere is refused), and its object store must be nameable in an alternates list.
    const located = splitZ((await git(["rev-parse", "--path-format=absolute", "--show-toplevel", "--git-common-dir"])).stdout.replace(/\n/g, "\0"));
    if (located.length !== 2) reject("git-failed");
    let toplevel: string;
    try { toplevel = fs.realpathSync(located[0]); } catch { return { status: "rejected", reason: "worktree-mismatch" }; }
    if (toplevel !== root) reject("worktree-mismatch");
    const objects = path.join(located[1], "objects");
    if (!path.isAbsolute(objects) || /[:"\0\n]/.test(objects)) reject("worktree-invalid");

    // Baseline: an existing commit that is an ancestor of the worker HEAD.
    const resolved = await git(["rev-parse", "--verify", "--quiet", "--end-of-options", `${baseline}^{commit}`], { ok: [0, 1, 128] });
    if (resolved.status !== 0 || resolved.stdout.trim() !== baseline) reject("baseline-unknown");
    const head = mustHex((await git(["rev-parse", "--verify", "--quiet", "--end-of-options", "HEAD^{commit}"])).stdout.trim());
    // Both operands are validated 40-hex ids, so neither can be read as an option.
    const ancestor = await git(["merge-base", "--is-ancestor", baseline, head], { ok: [0, 1] });
    if (ancestor.status !== 0) reject("baseline-not-ancestor");

    // Candidate paths from three git listings. None of these reads file content.
    const baseTree = new Map<string, TreeEntry>();
    for (const record of splitZ((await git(["ls-tree", "-r", "-l", "-z", "--full-tree", baseline])).stdout)) {
      const tab = record.indexOf("\t");
      const [mode, type, sha, size] = record.slice(0, tab).split(/ +/);
      if (tab < 0 || !HEX40.test(sha ?? "") || !type) reject("git-failed");
      baseTree.set(record.slice(tab + 1), { mode, sha, size: size === "-" ? 0 : Number(size) });
    }
    const index = new Map<string, IndexEntry>();
    for (const record of splitZ((await git(["ls-files", "-z", "-s", "--full-name"])).stdout)) {
      const tab = record.indexOf("\t");
      const [mode, sha, stage] = record.slice(0, tab).split(" ");
      const name = record.slice(tab + 1);
      if (tab < 0 || !HEX40.test(sha ?? "")) reject("git-failed");
      if (stage !== "0") reject("unmerged", validatePath(name) ? undefined : name);
      index.set(name, { mode, sha });
    }
    const untracked = splitZ((await git(["ls-files", "-z", "--others", "--exclude-standard", "--full-name"])).stdout);
    const candidates = [...new Set([...baseTree.keys(), ...index.keys(), ...untracked])].sort();
    if (candidates.length > MAX_CANDIDATES) reject("too-large");
    for (const name of untracked) {
      // An untracked nested repository is listed as `dir/`: it is a gitlink in all but name.
      if (name.endsWith("/")) reject("gitlink", validatePath(name.slice(0, -1)) ? undefined : name.slice(0, -1));
    }

    // Classify every candidate on disk, lstat-checking each component below the real worktree root.
    const dirState = new Map<string, "dir" | "absent">();
    const component = (relative: string): StatLike | undefined => {
      try { return fs.lstatSync(path.join(root, relative)); } catch (error) {
        const code = errorCode(error);
        if (code === "ENOENT" || code === "ENOTDIR") return undefined;
        return reject("worktree-unreadable");
      }
    };
    const ancestorsPresent = (name: string): boolean => {
      const parts = name.split("/");
      for (let depth = 1; depth < parts.length; depth++) {
        const prefix = parts.slice(0, depth).join("/");
        let state = dirState.get(prefix);
        if (state === undefined) {
          const stat = component(prefix);
          if (stat?.isSymbolicLink()) reject("symlink-ancestor", name);
          state = stat?.isDirectory() ? "dir" : "absent";
          dirState.set(prefix, state);
        }
        if (state === "absent") return false;
      }
      return true;
    };
    const carried: Array<{ mode: string; sha: string; path: string }> = [];
    const regular: Array<{ path: string; mode: EntryMode; stat: StatLike }> = [];
    for (const name of candidates) {
      const invalid = validatePath(name);
      if (invalid) reject(invalid, invalid === "path-control" || invalid === "path-invalid" || invalid === "path-too-long" ? undefined : name);
      const present = ancestorsPresent(name);
      const indexed = index.get(name);
      if (indexed?.mode === "160000") { carried.push({ mode: indexed.mode, sha: indexed.sha, path: name }); continue; }
      const stat = present ? component(name) : undefined;
      if (!stat) continue;
      if (stat.isSymbolicLink()) {
        if (indexed?.mode === "120000") { carried.push({ mode: indexed.mode, sha: indexed.sha, path: name }); continue; }
        reject("symlink", name);
      }
      if (stat.isDirectory()) continue;
      if (!stat.isFile()) reject("non-regular", name);
      if (stat.mode & 0o7000) reject("mode-special", name);
      regular.push({ path: name, mode: stat.mode & 0o100 ? "100755" : "100644", stat });
    }
    // Cheap lower bound before hashing anything: content whose size differs from the baseline has certainly changed.
    let certain = 0;
    let certainCount = 0;
    for (const file of regular) {
      const base = baseTree.get(file.path);
      if (base === undefined || base.size !== file.stat.size) { certain += file.stat.size; certainCount++; }
    }
    if (certain > MAX_TOTAL_BYTES || certainCount > MAX_ENTRIES) reject("too-large");

    // Hash into a temporary object store and index: no filters run, nothing is written to the worker's repository.
    scratch = fs.mkdtempSync(path.join(deps.os.tmpdir(), "orca-admit-"));
    fs.mkdirSync(path.join(scratch, "objects"), { recursive: false, mode: 0o700 });
    stageEnv = { GIT_OBJECT_DIRECTORY: path.join(scratch, "objects"), GIT_ALTERNATE_OBJECT_DIRECTORIES: objects, GIT_INDEX_FILE: path.join(scratch, "index") };
    const records = carried.map((entry) => `${entry.mode} ${entry.sha}\t${entry.path}\0`);
    if (regular.length) {
      const shas = (await git(["hash-object", "-w", "--no-filters", "--stdin-paths"], { input: regular.map((file) => file.path).join("\n") + "\n" })).stdout.split("\n").filter(Boolean);
      if (shas.length !== regular.length) reject("git-failed");
      regular.forEach((file, position) => {
        const again = component(file.path);
        const before = file.stat;
        if (!again || again.isSymbolicLink() || !again.isFile() || again.dev !== before.dev || again.ino !== before.ino
          || again.size !== before.size || again.mtimeMs !== before.mtimeMs || again.mode !== before.mode) reject("worktree-changed", file.path);
        records.push(`${file.mode} ${mustHex(shas[position])}\t${file.path}\0`);
      });
    }
    if (records.length) await git(["update-index", "-z", "--index-info"], { input: records.join("") });
    const tree = mustHex((await git(["write-tree"])).stdout.trim());

    // The changed set: raw diff of baseline vs synthesized tree, renames off.
    const raw = parseRaw(splitZ((await git(["diff", "--raw", "-z", "--no-renames", "--no-abbrev", ...DIFF_FLAGS, baseline, tree, "--"])).stdout));
    if (raw.length > MAX_ENTRIES) reject("too-large");
    const sizes = new Map(regular.map((file) => [file.path, file.stat.size]));
    const entries: Entry[] = [];
    let total = 0;
    for (const record of raw) {
      const invalid = validatePath(record.path);
      if (invalid) reject(invalid);
      for (const mode of [record.status === "A" ? undefined : record.oldMode, record.status === "D" ? undefined : record.newMode]) {
        if (mode === undefined) continue;
        if (mode === "120000") reject("symlink", record.path);
        if (mode === "160000") reject("gitlink", record.path);
        if (mode !== "100644" && mode !== "100755") reject("mode-invalid", record.path);
      }
      if (record.status === "D") {
        total += baseTree.get(record.path)?.size ?? 0;
        entries.push({ path: record.path, kind: "delete", mode: record.oldMode as EntryMode, binary: false, size: 0 });
      } else if (record.status === "A" || record.status === "M") {
        const size = sizes.get(record.path);
        if (size === undefined) reject("git-failed");
        total += size as number;
        entries.push({ path: record.path, kind: record.status === "A" ? "add" : "modify", mode: record.newMode as EntryMode, binary: false, size: size as number });
      } else reject("mode-invalid", record.path);
    }
    if (total > MAX_TOTAL_BYTES) reject("too-large");

    // Case-fold / Unicode collisions anywhere along a changed path, against every path of the resulting tree.
    const deleted = new Set(entries.filter((entry) => entry.kind === "delete").map((entry) => entry.path));
    const finalPaths = [...[...baseTree.keys()].filter((name) => !deleted.has(name)), ...entries.filter((entry) => entry.kind === "add").map((entry) => entry.path)];
    const seen = new Map<string, Set<string>>();
    for (const name of finalPaths) {
      const parts = name.split("/");
      for (let depth = 1; depth <= parts.length; depth++) {
        const prefix = parts.slice(0, depth).join("/");
        const key = fold(prefix);
        const set = seen.get(key) ?? new Set<string>();
        set.add(prefix);
        seen.set(key, set);
      }
    }
    for (const entry of entries) {
      if (entry.kind === "delete") continue;
      const parts = entry.path.split("/");
      for (let depth = 1; depth <= parts.length; depth++) {
        if ((seen.get(fold(parts.slice(0, depth).join("/")))?.size ?? 0) > 1) reject("case-collision", entry.path);
      }
    }

    // Binary flags (numstat `-` columns) and rename annotation (never removes an entry).
    const byPath = new Map(entries.map((entry) => [entry.path, entry]));
    for (const record of splitZ((await git(["diff", "--numstat", "-z", "--no-renames", ...DIFF_FLAGS, baseline, tree, "--"])).stdout)) {
      const match = /^(-|\d+)\t(-|\d+)\t([^]*)$/.exec(record);
      const entry = match ? byPath.get(match[3]) : undefined;
      if (entry && match && match[1] === "-" && match[2] === "-") entry.binary = true;
    }
    const renameTokens = splitZ((await git(["diff", "--raw", "-z", "--find-renames", "--no-abbrev", ...DIFF_FLAGS, baseline, tree, "--"])).stdout);
    for (let position = 0; position < renameTokens.length; position++) {
      const meta = renameTokens[position];
      const status = meta.split(" ")[4] ?? "";
      if (status.startsWith("R") || status.startsWith("C")) {
        const from = renameTokens[position + 1];
        const to = renameTokens[position + 2];
        position += 2;
        const added = byPath.get(to);
        if (status.startsWith("R") && added?.kind === "add" && byPath.get(from)?.kind === "delete") { added.kind = "rename"; added.from = from; }
      } else position += 1;
    }

    // The patch: exact bytes, required to be UTF-8 so it survives a string round-trip to `git apply`. Non-UTF-8 text is
    // re-emitted as binary hunks via an attribute tree we create (worker attributes no longer apply to that pass).
    const patchArgs = ["diff", "--binary", "--no-renames", "-U3", ...DIFF_FLAGS, baseline, tree, "--"];
    let patch = patchText(deps.child.runSync("git", [...GIT_HARDENING, ...patchArgs], { ...spawnOptions(undefined, PATCH_MAX_BYTES), encoding: "buffer" }), checked);
    if (patch === undefined) {
      const blob = mustHex((await git(["hash-object", "-w", "--stdin"], { input: "* -diff\n" })).stdout.trim());
      const attributes = mustHex((await git(["mktree", "-z"], { input: `100644 blob ${blob}\t.gitattributes\0` })).stdout.trim());
      patch = patchText(deps.child.runSync("git", [...GIT_HARDENING, `--attr-source=${attributes}`, ...patchArgs], { ...spawnOptions(undefined, PATCH_MAX_BYTES), encoding: "buffer" }), checked);
      if (patch === undefined) reject("patch-not-utf8");
    }
    return { status: "admitted", entries, patch: patch as string };
  } catch (error) {
    if (error instanceof Rejection) return error.path === undefined ? { status: "rejected", reason: error.reason } : { status: "rejected", reason: error.reason, path: error.path };
    return { status: "rejected", reason: "admit-error" };
  } finally {
    if (scratch !== undefined) { try { deps.fs.rmSync(scratch, { recursive: true, force: true }); } catch { /* temp dir; best effort */ } }
  }
}

function parseRaw(tokens: string[]): RawRecord[] {
  const out: RawRecord[] = [];
  for (let position = 0; position < tokens.length; position += 2) {
    const fields = tokens[position].split(" ");
    const name = tokens[position + 1];
    if (fields.length !== 5 || !fields[0].startsWith(":") || name === undefined || !HEX40.test(fields[2]) || !HEX40.test(fields[3])) reject("git-failed");
    out.push({ oldMode: fields[0].slice(1), newMode: fields[1], status: fields[4], path: name });
  }
  return out;
}

function patchText(result: RunResult, checked: (result: RunResult, ok: readonly number[]) => RunResult): string | undefined {
  checked(result, [0]);
  const bytes = result.stdoutBytes;
  if (!bytes) return reject("git-failed");
  try { return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); } catch { return undefined; }
}
