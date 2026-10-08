import type { RuntimeDeps, StatLike } from "./runtime/types.mts";

/**
 * Apply admitted worker diffs to a coordinator working tree that may be dirty, with a path-scoped snapshot and
 * rollback. Nothing here discards user work: there is no stash, hard reset, checkout of the whole tree, clean,
 * restore verb or forced flag. Order of refusals (each before any write): input shape, worker order, baseline,
 * repository root, patch-versus-entries agreement, worker overlap, symlinked paths, dirty-tree overlap, then
 * `git apply --check` of EVERY worker. Only after all of that is a snapshot of exactly the touched paths taken and
 * the workers applied, each atomically through `git apply`. A later failure rolls back only the touched paths.
 *
 * Known limit: a path could be swapped for a symlink between the lstat walk and the `git apply` write. `git apply`
 * itself refuses to write beyond a symbolic link, which is the second line of defence.
 */

export interface AdmittedEntry {
  path: string;
  kind: "add" | "modify" | "delete" | "rename";
  from?: string;
  mode: "100644" | "100755";
  binary: boolean;
  size: number;
}
export interface AdmittedWorker { attemptKey: string; entries: AdmittedEntry[]; patch: string }

export type ApplyResult =
  | { status: "applied"; snapshot: string; touched: string[]; order: string[] }
  | { status: "refused"; reason: string; path?: string; worker?: string }
  | { status: "rolled-back"; reason: string; restored: string[]; worker?: string; unrestored?: string[] };

export type RollbackResult =
  | { status: "restored"; restored: string[] }
  | { status: "refused"; reason: string; unrestored?: string[] };

export interface ApplyOptions {
  root: string;
  baseline: string;
  admitted: readonly AdmittedWorker[];
  workerOrder: readonly string[];
  deps: RuntimeDeps;
  /** Absolute deadline on `now` (ms, fractions allowed). Default: 120 s from the start of the call. */
  deadlineMs?: number;
  now?: () => number;
}
export interface RollbackOptions { root: string; snapshot: string; touched: readonly string[]; deps: RuntimeDeps }

export const SNAPSHOT_DIR_PARTS: readonly string[] = Object.freeze([".project", "metrics", "orca-snapshots"]);
export const MAX_PATCH_BYTES = 32 * 1024 * 1024;
export const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 8 * 1024 * 1024;
const MAX_WORKERS = 64;
const MAX_ENTRIES = 4096;
const GIT_OUTPUT_BYTES = 8 * 1024 * 1024;
const DEFAULT_BUDGET_MS = 120_000;
const FULL_SHA = /^[0-9a-f]{40}$/;
const KINDS = new Set(["add", "modify", "delete", "rename"]);
const ENV_ALLOWLIST = ["LANG", "TERM", "TMPDIR"];
const HARDENED = [
  "-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false", "-c", "core.attributesFile=/dev/null",
  "-c", "protocol.file.allow=never", "-c", "diff.external=",
];

type Fail = { ok: false; reason: string; path?: string; worker?: string };
const fail = (reason: string, extra: { path?: string; worker?: string } = {}): Fail => ({ ok: false, reason, ...extra });
const errorCode = (error: unknown): unknown => (error !== null && typeof error === "object" ? (error as { code?: unknown }).code : undefined);

/** Relative, `/`-separated, no empty/`.`/`..` parts, no NUL or backslash, never inside `.git` or the snapshot store. */
export function validRelativePath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 4096) return false;
  if (value.startsWith("/") || value.includes("\0") || value.includes("\\") || value.includes("\n")) return false;
  const parts = value.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) return false;
  if (parts.some((part) => part.toLowerCase() === ".git")) return false;
  const lower = parts.map((part) => part.toLowerCase());
  // The whole local-data directory is off limits: workers must not land snapshots, evidence or ledger records.
  if (lower.length >= 2 && lower[0] === ".project" && lower[1] === "metrics") return false;
  return true;
}

/** True when the two relative paths are equal or one lies under the other (case-insensitive, conservative). */
export function pathsOverlap(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x === y || x.startsWith(`${y}/`) || y.startsWith(`${x}/`);
}

const hasStatMode = (stat: StatLike): number => stat.mode & 0o7777;

const PATCH_SPECIAL_MODE = /^(?:new file mode|new mode|old mode|deleted file mode) (?:120000|160000)$|^index [0-9a-f.]+ (?:120000|160000)$|^(?:Subproject commit)/m;

interface Ctx { root: string; deps: RuntimeDeps; deadlineMs: number; now: () => number }
type GitOk = { ok: true; stdout: string };

function gitEnv(deps: RuntimeDeps): Record<string, string> {
  const source = deps.proc.env;
  const env: Record<string, string> = { GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" };
  for (const key of ENV_ALLOWLIST) {
    const value = source[key];
    if (typeof value === "string" && !value.includes("\0")) env[key] = value;
  }
  const entries = (source.PATH ?? "").split(deps.path.delimiter).filter((directory) => deps.path.isAbsolute(directory) && !directory.includes("\0")).slice(0, 64);
  env.PATH = entries.length ? entries.join(deps.path.delimiter) : "/usr/bin:/bin";
  return env;
}

async function git(ctx: Ctx, args: readonly string[], input?: string, okStatuses: readonly number[] = [0]): Promise<GitOk | Fail> {
  const remaining = ctx.deadlineMs - ctx.now();
  if (!(remaining >= 1)) return fail("time-budget");
  try {
    const result = await ctx.deps.child.run("git", [...HARDENED, ...args], { cwd: ctx.root, env: gitEnv(ctx.deps), input,
      timeoutMs: Math.floor(remaining), maxBufferBytes: GIT_OUTPUT_BYTES, killSignal: "SIGKILL", stdio: "pipe" });
    if (result.errorCode === "ETIMEDOUT") return fail("git-timeout");
    if (result.errorCode === "ENOBUFS") return fail("git-output-limit");
    if (result.status === null || !okStatuses.includes(result.status) || result.signal) return fail("git-failed");
    return { ok: true, stdout: result.stdout };
  } catch { return fail("git-failed"); }
}

/** lstat every component of `rel` below `root`. Returns the final stat, null when absent, or a refusal reason. */
function walkPath(root: string, rel: string, deps: RuntimeDeps): { stat: StatLike | null } | { refused: string } {
  let current = root;
  let last: StatLike | null = null;
  for (const part of rel.split("/")) {
    current = deps.path.join(current, part);
    try { last = deps.fs.lstatSync(current); } catch (error) {
      if (errorCode(error) === "ENOENT" || errorCode(error) === "ENOTDIR") return { stat: null };
      return { refused: "path-unreadable" };
    }
    if (last.isSymbolicLink()) return { refused: "symlink-path" };
    if (current !== deps.path.join(root, rel) && !last.isDirectory()) return { refused: "non-directory-ancestor" };
  }
  return { stat: last };
}

/** Parses `git status --porcelain=v1 -z` into every path (and rename source) the working tree has changed. */
export function parseStatus(text: string): string[] {
  const parts = text.split("\0");
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const item = parts[i];
    if (item.length < 4) continue;
    const code = item.slice(0, 2);
    out.push(item.slice(3));
    if (code.includes("R") || code.includes("C")) { i++; if (parts[i]) out.push(parts[i]); }
  }
  return out;
}

/** Paths named by `git apply --numstat -z` (new path and rename source). */
export function parseNumstat(text: string): string[] {
  const parts = text.split("\0");
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const item = parts[i];
    if (!item) continue;
    const fields = item.split("\t");
    if (fields.length < 3) return ["\0malformed"];
    const rest = fields.slice(2).join("\t");
    if (rest === "") { out.push(parts[i + 1] ?? "\0malformed", parts[i + 2] ?? "\0malformed"); i += 2; } else out.push(rest);
  }
  return out;
}

/** Source paths of renames and copies, read from the patch headers (`git apply --numstat` reports only the new name). */
export function parseRenameSources(patch: string): string[] {
  const out: string[] = [];
  for (const line of patch.split("\n")) {
    if (line.startsWith("rename from ")) out.push(line.slice("rename from ".length));
    else if (line.startsWith("copy from ")) out.push(line.slice("copy from ".length));
  }
  return out;
}

function validateInput(options: ApplyOptions): Fail | { ok: true; workers: AdmittedWorker[] } {
  const { admitted, workerOrder } = options;
  if (!Array.isArray(admitted) || admitted.length === 0 || admitted.length > MAX_WORKERS) return fail("invalid-input");
  if (!Array.isArray(workerOrder)) return fail("invalid-input");
  const keys = new Set<string>();
  let total = 0;
  for (const worker of admitted) {
    if (worker === null || typeof worker !== "object" || typeof worker.attemptKey !== "string" || worker.attemptKey.length === 0
      || typeof worker.patch !== "string" || !Array.isArray(worker.entries) || worker.entries.length === 0 || worker.entries.length > MAX_ENTRIES) return fail("invalid-input");
    if (keys.has(worker.attemptKey)) return fail("duplicate-worker", { worker: worker.attemptKey });
    keys.add(worker.attemptKey);
    total += worker.patch.length;
    if (total > MAX_PATCH_BYTES) return fail("patch-too-large");
    if (worker.patch.length === 0) return fail("empty-patch", { worker: worker.attemptKey });
    for (const entry of worker.entries) {
      if (entry === null || typeof entry !== "object" || !KINDS.has(entry.kind) || !validRelativePath(entry.path)) return fail("invalid-path", { worker: worker.attemptKey, path: String((entry as { path?: unknown })?.path) });
      if (entry.kind === "rename" ? !validRelativePath(entry.from) : entry.from !== undefined && !validRelativePath(entry.from)) return fail("invalid-path", { worker: worker.attemptKey, path: String(entry.from) });
    }
  }
  const sortedOrder = [...workerOrder].sort();
  const sortedKeys = [...keys].sort();
  if (sortedOrder.length !== sortedKeys.length || sortedOrder.some((key, index) => key !== sortedKeys[index])) return fail("worker-order-mismatch");
  // Sorted by attempt key; the caller's order is only validated, never followed.
  return { ok: true, workers: [...admitted].sort((a, b) => (a.attemptKey < b.attemptKey ? -1 : a.attemptKey > b.attemptKey ? 1 : 0)) };
}

const entryPaths = (worker: AdmittedWorker): string[] => worker.entries.flatMap((entry) => (entry.from !== undefined ? [entry.path, entry.from] : [entry.path]));

interface ManifestEntry { path: string; present: boolean; mode?: number; file?: string; sha256?: string }
interface Manifest { version: 1; entries: ManifestEntry[]; createdDirs: string[] }

const hex = (deps: RuntimeDeps, data: Uint8Array): string => deps.crypto.sha256Hex(data);

/** Creates every directory below `root` for `rel`'s parent, lstat-checking each component. Returns the created ones. */
function ensureParents(root: string, rel: string, deps: RuntimeDeps): { created: string[] } | { refused: string } {
  const parts = rel.split("/").slice(0, -1);
  let current = root;
  const created: string[] = [];
  let relative = "";
  for (const part of parts) {
    current = deps.path.join(current, part);
    relative = relative ? `${relative}/${part}` : part;
    let stat: StatLike | null = null;
    try { stat = deps.fs.lstatSync(current); } catch (error) { if (errorCode(error) !== "ENOENT") return { refused: "path-unreadable" }; }
    if (stat) {
      if (stat.isSymbolicLink()) return { refused: "symlink-path" };
      if (!stat.isDirectory()) return { refused: "non-directory-ancestor" };
      continue;
    }
    try { deps.fs.mkdirSync(current, { recursive: false }); } catch { return { refused: "mkdir-failed" }; }
    created.push(relative);
  }
  return { created };
}

function takeSnapshot(ctx: Ctx, touched: readonly string[]): { ok: true; dir: string } | Fail {
  const { deps, root } = ctx;
  const store = SNAPSHOT_DIR_PARTS.join("/");
  const prepared = ensureParents(root, `${store}/x`, deps);
  if ("refused" in prepared) return fail(prepared.refused);
  const id = deps.crypto.randomUUID();
  const dir = deps.path.join(root, ...SNAPSHOT_DIR_PARTS, id);
  const created: string[] = [];
  try {
    deps.fs.mkdirSync(dir, { recursive: false });
    deps.fs.mkdirSync(deps.path.join(dir, "files"), { recursive: false });
    const entries: ManifestEntry[] = [];
    const createdDirs = new Set<string>();
    for (const [index, rel] of touched.entries()) {
      const walked = walkPath(root, rel, deps);
      if ("refused" in walked) throw new SnapshotError(walked.refused, rel);
      if (walked.stat === null) {
        // Record which ancestors do not exist yet so rollback can remove the ones the apply creates.
        const parts = rel.split("/").slice(0, -1);
        let current = root;
        let relative = "";
        for (const part of parts) {
          current = deps.path.join(current, part);
          relative = relative ? `${relative}/${part}` : part;
          try { deps.fs.lstatSync(current); } catch { createdDirs.add(relative); }
        }
        entries.push({ path: rel, present: false });
        continue;
      }
      if (!walked.stat.isFile()) throw new SnapshotError("non-regular-file", rel);
      if (walked.stat.size > MAX_FILE_BYTES) throw new SnapshotError("file-too-large", rel);
      const bytes = deps.fs.readBytesSync(deps.path.join(root, ...rel.split("/")));
      const file = `files/${index}`;
      deps.fs.writeFileSync(deps.path.join(dir, file), bytes, { flag: "wx", mode: 0o600 });
      created.push(file);
      entries.push({ path: rel, present: true, mode: hasStatMode(walked.stat), file, sha256: hex(deps, bytes) });
    }
    const manifest: Manifest = { version: 1, entries, createdDirs: [...createdDirs].sort() };
    deps.fs.writeFileSync(deps.path.join(dir, "manifest.json"), JSON.stringify(manifest), { flag: "wx", mode: 0o600 });
    return { ok: true, dir };
  } catch (error) {
    // Our own, just-created snapshot directory only; never anything the user owns.
    try { deps.fs.rmSync(dir, { recursive: true }); } catch { /* best effort */ }
    if (error instanceof SnapshotError) return fail(error.reason, { path: error.path });
    return fail("snapshot-failed");
  }
}

class SnapshotError extends Error {
  reason: string;
  path: string;
  constructor(reason: string, path: string) { super(reason); this.reason = reason; this.path = path; }
}

/** Restores exactly `touched` (a subset of the snapshot) to the recorded bytes, modes and absence. Idempotent. */
export function rollback(options: RollbackOptions): RollbackResult {
  const { snapshot, touched, deps } = options;
  let root: string;
  try { root = deps.fs.realpathSync(options.root); } catch { return { status: "refused", reason: "root-unreadable" }; }
  if (typeof snapshot !== "string" || !Array.isArray(touched)) return { status: "refused", reason: "invalid-input" };
  let dir: string;
  try { dir = deps.fs.realpathSync(snapshot); } catch { return { status: "refused", reason: "snapshot-missing" }; }
  const storeRoot = deps.path.join(root, ...SNAPSHOT_DIR_PARTS);
  if (deps.path.dirname(dir) !== storeRoot) return { status: "refused", reason: "snapshot-outside-store" };
  const storeWalk = walkPath(root, SNAPSHOT_DIR_PARTS.join("/"), deps);
  if ("refused" in storeWalk || storeWalk.stat === null) return { status: "refused", reason: "snapshot-outside-store" };
  let manifest: Manifest;
  try {
    const file = deps.path.join(dir, "manifest.json");
    const stat = deps.fs.lstatSync(file);
    if (!stat.isFile() || stat.size > MAX_MANIFEST_BYTES) return { status: "refused", reason: "snapshot-corrupt" };
    manifest = JSON.parse(deps.fs.readFileSync(file)) as Manifest;
    if (manifest?.version !== 1 || !Array.isArray(manifest.entries) || !Array.isArray(manifest.createdDirs)) return { status: "refused", reason: "snapshot-corrupt" };
  } catch { return { status: "refused", reason: "snapshot-corrupt" }; }

  const known = new Map<string, ManifestEntry>();
  for (const entry of manifest.entries) {
    if (!entry || !validRelativePath(entry.path)) return { status: "refused", reason: "snapshot-corrupt" };
    known.set(entry.path, entry);
  }
  for (const rel of touched) if (!known.has(rel)) return { status: "refused", reason: "path-not-in-snapshot" };

  const restored: string[] = [];
  const unrestored: string[] = [];
  for (const rel of [...new Set(touched)].sort()) {
    const entry = known.get(rel) as ManifestEntry;
    try {
      const target = deps.path.join(root, ...rel.split("/"));
      const walked = walkPath(root, rel, deps);
      if ("refused" in walked) { unrestored.push(rel); continue; }
      if (!entry.present) {
        if (walked.stat === null) continue;
        if (!walked.stat.isFile()) { unrestored.push(rel); continue; }
        deps.fs.unlinkSync(target);
        restored.push(rel);
        continue;
      }
      if (typeof entry.file !== "string" || !/^files\/\d+$/.test(entry.file) || typeof entry.mode !== "number" || typeof entry.sha256 !== "string") { unrestored.push(rel); continue; }
      const sourceFile = deps.path.join(dir, entry.file);
      const sourceStat = deps.fs.lstatSync(sourceFile);
      if (!sourceStat.isFile() || sourceStat.size > MAX_FILE_BYTES) { unrestored.push(rel); continue; }
      const bytes = deps.fs.readBytesSync(sourceFile);
      if (hex(deps, bytes) !== entry.sha256) { unrestored.push(rel); continue; }
      if (walked.stat !== null) {
        if (!walked.stat.isFile()) { unrestored.push(rel); continue; }
        if (hasStatMode(walked.stat) === entry.mode && hex(deps, deps.fs.readBytesSync(target)) === entry.sha256) continue;
      }
      const parents = ensureParents(root, rel, deps);
      if ("refused" in parents) { unrestored.push(rel); continue; }
      const temp = deps.path.join(deps.path.dirname(target), `.orca-restore-${deps.crypto.randomUUID()}`);
      try {
        deps.fs.writeFileSync(temp, bytes, { flag: "wx", mode: 0o600 });
        deps.fs.chmodSync(temp, entry.mode);
        deps.fs.renameSync(temp, target);
      } catch (error) {
        try { deps.fs.unlinkSync(temp); } catch { /* temp may not exist */ }
        throw error;
      }
      restored.push(rel);
    } catch { unrestored.push(rel); }
  }
  // Directories the apply created are removed only when empty and only when they sit above a rolled-back path.
  const dirs = manifest.createdDirs.filter((d) => validRelativePath(d) && touched.some((rel) => rel.startsWith(`${d}/`)))
    .sort((a, b) => b.split("/").length - a.split("/").length);
  for (const rel of dirs) {
    const walked = walkPath(root, rel, deps);
    if ("refused" in walked || walked.stat === null || !walked.stat.isDirectory()) continue;
    try { deps.fs.rmdirSync(deps.path.join(root, ...rel.split("/"))); } catch { /* not empty: leave it */ }
  }
  if (unrestored.length) return { status: "refused", reason: "rollback-incomplete", unrestored };
  return { status: "restored", restored };
}

/** Paths whose bytes on disk differ from the baseline blob, or that the index hides from `git status`. */
async function hiddenEdits(ctx: Ctx, baseline: string, touched: readonly string[]): Promise<{ ok: true; path?: string } | Fail> {
  const flags = await git(ctx, ["ls-files", "-v", "-z", "--", ...touched]);
  if (!flags.ok) return flags;
  for (const record of flags.stdout.split("\0").filter(Boolean)) {
    if (/^[a-zS]$/.test(record[0] ?? "")) return { ok: true, path: record.slice(2) };
  }
  const tree = await git(ctx, ["ls-tree", "-z", "-r", baseline, "--", ...touched]);
  if (!tree.ok) return tree;
  const blobs = new Map<string, string>();
  const modes = new Map<string, string>();
  for (const record of tree.stdout.split("\0").filter(Boolean)) {
    const tab = record.indexOf("\t");
    const parts = record.slice(0, tab).split(" ");
    if (tab > 0 && parts[2]) { blobs.set(record.slice(tab + 1), parts[2]); modes.set(record.slice(tab + 1), parts[0]); }
  }
  const present: string[] = [];
  for (const rel of touched) {
    const walked = walkPath(ctx.root, rel, ctx.deps);
    if ("refused" in walked) return fail(walked.refused, { path: rel });
    if (walked.stat === null) { if (blobs.has(rel)) return { ok: true, path: rel }; continue; }
    // The executable bit is part of the user's edit too (and `core.fileMode` comes from the shared config).
    const baselineMode = modes.get(rel);
    if (baselineMode !== undefined && ((walked.stat.mode & 0o111) !== 0) !== (baselineMode === "100755")) return { ok: true, path: rel };
    present.push(rel);
  }
  if (present.length === 0) return { ok: true };
  const hashed = await git(ctx, ["hash-object", "--no-filters", "--stdin-paths"], `${present.join("\n")}\n`);
  if (!hashed.ok) return hashed;
  const shas = hashed.stdout.split("\n").filter(Boolean);
  if (shas.length !== present.length) return fail("hash-mismatch");
  for (let i = 0; i < present.length; i++) {
    if (blobs.get(present[i]) !== shas[i]) return { ok: true, path: present[i] };
  }
  return { ok: true };
}

/** True when the patch's change is already in the working tree (it reverse-applies cleanly). Never writes. */
export async function isApplied(options: { root: string; patch: string; entries: readonly AdmittedEntry[]; deps: RuntimeDeps; deadlineMs?: number; now?: () => number }): Promise<boolean> {
  const { deps } = options;
  try {
    const root = deps.fs.realpathSync(options.root);
    const now = options.now ?? (() => deps.clock.perfNowMs());
    const ctx: Ctx = { root, deps, now, deadlineMs: options.deadlineMs ?? now() + DEFAULT_BUDGET_MS };
    // `git apply` converts the working-tree file through any configured clean filter, which would run worker-chosen
    // commands: with a filter attribute on any of the paths, report "not applied" and let the apply step refuse.
    const paths = [...new Set(options.entries.flatMap((entry) => (entry.from ? [entry.path, entry.from] : [entry.path])))];
    if (paths.length === 0 || !paths.every(validRelativePath)) return false;
    // A reverse `git apply --check` ignores permission bits, so the working tree is also compared with every entry:
    // a file must exist (with the entry's executable bit) or be absent, exactly as the change leaves it.
    for (const entry of options.entries) {
      const gone = entry.kind === "delete";
      const walked = walkPath(root, entry.path, deps);
      if ("refused" in walked) return false;
      if (gone) { if (walked.stat !== null) return false; continue; }
      if (walked.stat === null || !walked.stat.isFile() || ((walked.stat.mode & 0o111) !== 0) !== (entry.mode === "100755")) return false;
      if (entry.kind === "rename" && entry.from) { const source = walkPath(root, entry.from, deps); if ("refused" in source || source.stat !== null) return false; }
    }
    const configured = await git(ctx, ["config", "--get-regexp", "^filter\\."], undefined, [0, 1]);
    if (!configured.ok || configured.stdout.trim() !== "") return false;
    const attrs = await git(ctx, ["check-attr", "-z", "filter", "--", ...paths]);
    if (!attrs.ok) return false;
    const fields = attrs.stdout.split("\0");
    for (let i = 0; i + 2 < fields.length; i += 3) if (fields[i + 2] !== "unspecified") return false;
    return (await git(ctx, ["apply", "--check", "--reverse", "--binary", "-"], options.patch)).ok;
  } catch { return false; }
}

export async function applyAdmitted(options: ApplyOptions): Promise<ApplyResult> {
  const { deps } = options;
  const refuse = (f: Fail): ApplyResult => ({ status: "refused", reason: f.reason, ...(f.path !== undefined ? { path: f.path } : {}), ...(f.worker !== undefined ? { worker: f.worker } : {}) });
  try {
    const checked = validateInput(options);
    if (!checked.ok) return refuse(checked);
    const workers = checked.workers;
    if (typeof options.baseline !== "string" || !FULL_SHA.test(options.baseline)) return refuse(fail("baseline-invalid"));
    let root: string;
    try { root = deps.fs.realpathSync(options.root); } catch { return refuse(fail("root-unreadable")); }
    const now = options.now ?? (() => deps.clock.perfNowMs());
    const ctx: Ctx = { root, deps, now, deadlineMs: options.deadlineMs ?? now() + DEFAULT_BUDGET_MS };

    const head = await git(ctx, ["rev-parse", "--verify", "--end-of-options", "HEAD"]);
    if (!head.ok) return refuse(head);
    if (head.stdout.trim().toLowerCase() !== options.baseline) return refuse(fail("baseline-moved"));
    const top = await git(ctx, ["rev-parse", "--show-toplevel"]);
    if (!top.ok) return refuse(top);
    let topReal: string;
    try { topReal = deps.fs.realpathSync(top.stdout.replace(/\n$/, "")); } catch { return refuse(fail("not-repo-root")); }
    if (topReal !== root) return refuse(fail("not-repo-root"));

    // The patch is the thing git writes, so the paths it names must be exactly the declared entries.
    for (const worker of workers) {
      const listed = await git(ctx, ["apply", "--numstat", "-z", "--binary", "-"], worker.patch);
      if (!listed.ok) return refuse({ ...listed, reason: listed.reason === "git-failed" ? "apply-check-failed" : listed.reason, worker: worker.attemptKey });
      const named = new Set([...parseNumstat(listed.stdout), ...parseRenameSources(worker.patch)]);
      const declared = new Set(entryPaths(worker));
      if (named.size === 0 || named.size !== declared.size || [...named].some((p) => !declared.has(p))) return refuse(fail("patch-entries-mismatch", { worker: worker.attemptKey }));
    }

    for (let i = 0; i < workers.length; i++) {
      for (let j = i + 1; j < workers.length; j++) {
        for (const a of entryPaths(workers[i])) for (const b of entryPaths(workers[j])) {
          if (pathsOverlap(a, b)) return refuse(fail("worker-overlap", { path: a, worker: workers[j].attemptKey }));
        }
      }
    }

    const touched = [...new Set(workers.flatMap(entryPaths))].sort();
    for (const rel of touched) {
      const walked = walkPath(root, rel, deps);
      if ("refused" in walked) return refuse(fail(walked.refused, { path: rel }));
      if (walked.stat !== null && !walked.stat.isFile()) return refuse(fail("non-regular-file", { path: rel }));
    }

    // `git status` scans the whole tree, not only the touched paths, and a worker sharing the git directory can set a
    // filter for a file it never touches. So any configured filter driver stops the apply before status runs.
    const drivers = await git(ctx, ["config", "--get-regexp", "^filter\\."], undefined, [0, 1]);
    if (!drivers.ok) return refuse(drivers);
    if (drivers.stdout.trim() !== "") return refuse(fail("filter-driver"));
    // Clean/smudge filters would run worker-chosen commands, including during `git status`, so this check comes first.
    const attrs = await git(ctx, ["check-attr", "-z", "filter", "--", ...touched]);
    if (!attrs.ok) return refuse(attrs);
    const fields = attrs.stdout.split("\0");
    for (let i = 0; i + 2 < fields.length; i += 3) {
      if (fields[i + 2] !== "unspecified") return refuse(fail("filter-driver", { path: fields[i] }));
    }
    const status = await git(ctx, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--no-renames", "--ignore-submodules=all"]);
    if (!status.ok) return refuse(status);
    const dirty = parseStatus(status.stdout);
    for (const rel of touched) {
      const hit = dirty.find((d) => pathsOverlap(rel, d));
      if (hit !== undefined) return refuse(fail("dirty-overlap", { path: rel }));
    }
    // `git status` can be told to ignore a file (assume-unchanged, skip-worktree) through the index, which a worker
    // sharing the repository can set. So also compare the bytes on disk with the baseline blob for every touched path.
    const hidden = await hiddenEdits(ctx, options.baseline, touched);
    if (!hidden.ok) return refuse(hidden);
    if (hidden.path !== undefined) return refuse(fail("dirty-overlap", { path: hidden.path }));

    for (const worker of workers) {
      if (PATCH_SPECIAL_MODE.test(worker.patch)) return refuse(fail("patch-mode", { worker: worker.attemptKey }));
      const check = await git(ctx, ["apply", "--check", "--binary", "-"], worker.patch);
      if (!check.ok) return refuse({ ...check, reason: check.reason === "git-failed" ? "apply-check-failed" : check.reason, worker: worker.attemptKey });
    }

    const snap = takeSnapshot(ctx, touched);
    if (!snap.ok) return refuse(snap);

    for (const worker of workers) {
      const applied = await git(ctx, ["apply", "--binary", "-"], worker.patch);
      if (!applied.ok) {
        const reason = applied.reason === "git-failed" ? "apply-failed" : applied.reason;
        const back = rollback({ root, snapshot: snap.dir, touched, deps });
        if (back.status === "restored") return { status: "rolled-back", reason, restored: back.restored, worker: worker.attemptKey };
        return { status: "rolled-back", reason, restored: [], worker: worker.attemptKey, unrestored: back.unrestored ?? touched.slice() };
      }
    }
    return { status: "applied", snapshot: snap.dir, touched, order: workers.map((w) => w.attemptKey) };
  } catch { return refuse(fail("apply-error")); }
}
