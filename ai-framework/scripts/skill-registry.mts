import type { RuntimeDeps } from "./runtime/types.mts";
import { createNodeDeps } from "./runtime/node.mts";
import * as sourceModule from "./skill-source.mts";

interface SourceApi {
  safeRelative(value: unknown): string;
  identity(input: unknown): { id: string; owner: string; repository: string; name: string; url: string };
}
const { safeRelative, identity } = sourceModule as SourceApi;

export type RootName = "target" | "project";
/** The part of a context that path resolution needs (skill-vendors passes only `target`). */
export interface PathContext { roots: { project?: string; target?: string } }
export interface RegistryContext {
  roots: { project: string; target: string };
  scope: string;
  state: string;
  registry: string;
}
export interface Snapshot { data: string; mode: number; hash: string }
export interface OwnedRecord { hash: string; sourceHash: string; mode: number }
export interface RegistryEntry {
  id: string;
  name: string;
  scope: string;
  enabled: boolean;
  phases: string[];
  owned: Record<string, OwnedRecord>;
  adapters: Record<string, string>;
  source: Record<string, unknown>;
  packagePath: string;
  runtime?: { status?: string };
  [key: string]: unknown;
}
export interface Registry { schemaVersion: 1; skills: Record<string, RegistryEntry>; [key: string]: unknown }
export interface Operation {
  path: string;
  root?: RootName;
  expected: string | null;
  expectedMode?: number | null;
  value: { data: Uint8Array; mode: number } | null;
}
export interface TransactOptions { afterWrite?: (index: number) => void }
interface PreparedOperation { root: RootName; path: string; before: Snapshot | null; after: Snapshot | null }
interface Created { root: RootName; path: string }
interface StoredValue { data: string; mode: number }

let nodeDeps: RuntimeDeps | undefined;
/** Lazily created Node deps, so old-signature callers (add-skill, skill-sync, state-snapshot, ...) need no change. */
function defaultDeps(): RuntimeDeps {
  return (nodeDeps ??= createNodeDeps());
}

function codeOf(error: unknown): string | undefined {
  return error !== null && typeof error === "object" ? (error as { code?: string }).code : undefined;
}
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function digest(data: Uint8Array | string, deps: RuntimeDeps = defaultDeps()): string {
  return deps.crypto.sha256Hex(data);
}
export const json = (value: unknown): Buffer => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const same = (left: Snapshot | null | undefined, right: Snapshot | null | undefined): boolean =>
  (left?.hash || null) === (right?.hash || null) && (left?.mode || null) === (right?.mode || null);
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const fromBase64 = (data: string): Buffer => Buffer.from(data, "base64");

export function context(project: string, scope: string, location?: string, deps: RuntimeDeps = defaultDeps()): RegistryContext {
  const { fs, path } = deps;
  if (!["project", "global"].includes(scope)) throw new Error("Choose --scope project|global explicitly");
  project = fs.realpathSync(project);
  if (scope === "global" && (!location || !path.isAbsolute(location))) throw new Error("Global scope requires an explicit absolute --location (user home root)");
  if (scope === "project" && location && path.resolve(location) !== project) throw new Error("Project location must equal --root; use --root to choose a project");
  const target = scope === "global" ? fs.realpathSync(location as string) : project;
  if (scope === "global" && target === project) throw new Error("Global location must be separate from the project");
  const state = scope === "global" ? ".ai-workflow/skills" : ".project/skills";
  return { roots: { project, target }, scope, state, registry: `${state}/registry.json` };
}

// Reject symlinks at every existing ancestor before reading or writing any managed path.
export function resolveFile(ctx: PathContext, relative: string, root: RootName = "target", deps: RuntimeDeps = defaultDeps()): string {
  const { fs, path } = deps;
  safeRelative(relative);
  if (!["target", "project"].includes(root)) throw new Error("Invalid transaction root");
  const base = ctx.roots[root] as string;
  let current = base;
  for (const part of relative.split("/")) {
    current = path.join(current, part);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`Symlink destination forbidden: ${relative}`);
    } catch (error) { if (codeOf(error) !== "ENOENT") throw error; }
  }
  return current;
}

export function snapshot(ctx: PathContext, relative: string, root: RootName = "target", deps: RuntimeDeps = defaultDeps()): Snapshot | null {
  const { fs } = deps;
  const full = resolveFile(ctx, relative, root, deps);
  try {
    const stat = fs.statSync(full);
    if (!stat.isFile()) throw new Error(`Destination is not a file: ${relative}`);
    const data = Buffer.from(fs.readBytesSync(full));
    return { data: data.toString("base64"), mode: stat.mode & 0o777, hash: digest(data, deps) };
  } catch (error) { if (codeOf(error) === "ENOENT") return null; throw error; }
}

export function readRegistry(ctx: RegistryContext, deps: RuntimeDeps = defaultDeps()): { registry: Registry; stored: Snapshot | null } {
  const stored = snapshot(ctx, ctx.registry, "target", deps);
  const parsed: unknown = stored ? JSON.parse(fromBase64(stored.data).toString()) : { schemaVersion: 1, skills: {} };
  if (!record(parsed) || parsed.schemaVersion !== 1 || !record(parsed.skills)) throw new Error("Unsupported or invalid skill registry schema");
  const registry = parsed as Registry;
  const owners = new Set<string>();
  for (const [id, raw] of Object.entries(registry.skills)) {
    const selected = identity(id);
    const entry = raw as unknown;
    if (!record(entry) || entry.id !== id || typeof entry.enabled !== "boolean" || !Array.isArray(entry.phases) || !record(entry.owned) || !record(entry.adapters) || !record(entry.source) || !entry.packagePath) throw new Error(`Invalid registry entry: ${id}`);
    const item = entry as unknown as RegistryEntry;
    safeRelative(item.packagePath);
    if (item.name !== selected.name || item.scope !== ctx.scope || !item.phases.length || item.phases.some((phase) => typeof phase !== "string")) throw new Error(`Invalid registry activation: ${id}`);
    if (item.packagePath !== `${ctx.state}/packages/${id}`) throw new Error("Invalid package ownership root");
    const adapterPaths = Object.values(item.adapters);
    if (!adapterPaths.length || adapterPaths.some((file) => typeof file !== "string" || !file.endsWith(`/${item.name}/SKILL.md`) || !Object.hasOwn(item.owned, file))) throw new Error("Invalid adapter ownership paths");
    for (const [file, owned] of Object.entries(item.owned)) {
      safeRelative(file);
      if (owners.has(file.toLowerCase())) throw new Error(`Duplicate registry ownership: ${file}`);
      owners.add(file.toLowerCase());
      if (!owned || !/^[a-f0-9]{64}$/.test(owned.hash) || !/^[a-f0-9]{64}$/.test(owned.sourceHash) || ![0o644, 0o755].includes(owned.mode)) throw new Error(`Invalid ownership record: ${file}`);
      if (file === ctx.registry || file.startsWith(`${ctx.state}/`) && !file.startsWith(`${item.packagePath}/`)) throw new Error(`Invalid owned path: ${file}`);
      if (!file.startsWith(`${item.packagePath}/`) && !adapterPaths.includes(file)) throw new Error(`Unrecognized owned path: ${file}`);
    }
  }
  return { registry, stored };
}

function mkdirParents(ctx: PathContext, file: string, root: RootName, created: Created[], deps: RuntimeDeps): void {
  const { fs, path } = deps;
  const base = ctx.roots[root] as string;
  const relative = path.relative(base, path.dirname(file));
  let current = base;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) {
      fs.mkdirSync(current, { recursive: false });
      created.push({ root, path: path.relative(base, current).split(path.sep).join("/") });
    }
  }
}

function writeAtomic(ctx: PathContext, relative: string, value: StoredValue | null, root: RootName, created: Created[], deps: RuntimeDeps): void {
  const { fs, path } = deps;
  const full = resolveFile(ctx, relative, root, deps);
  const rootDir = ctx.roots[root] as string;
  const ancestors: { path: string; dev: number; ino: number }[] = [];
  for (let current = path.dirname(full); current.startsWith(rootDir); current = path.dirname(current)) {
    try { const stat = fs.lstatSync(current); ancestors.push({ path: current, dev: stat.dev, ino: stat.ino }); } catch (error) { if (codeOf(error) !== "ENOENT") throw error; }
    if (current === rootDir) break;
  }
  const check = (): void => {
    resolveFile(ctx, relative, root, deps);
    for (const ancestor of ancestors) {
      const stat = fs.lstatSync(ancestor.path);
      if (stat.dev !== ancestor.dev || stat.ino !== ancestor.ino) throw new Error(`Destination ancestor changed: ${relative}`);
    }
  };
  mkdirParents(ctx, full, root, created, deps);
  check();
  if (value === null) { fs.rmSync(full, { force: true }); return; }
  const temporary = `${full}.skill-${deps.crypto.randomUUID()}`;
  try {
    const handle = fs.openSync(temporary, "wx", value.mode);
    try { fs.fchmodSync(handle, value.mode); fs.writeFileSync(handle, fromBase64(value.data)); fs.fsyncSync(handle); } finally { fs.closeSync(handle); }
    check();
    fs.renameSync(temporary, full);
  } finally {
    // Re-check cleanup too: never follow a swapped ancestor to remove an outside file.
    check();
    fs.rmSync(temporary, { force: true });
  }
}

function cleanup(ctx: PathContext, created: Created[], deps: RuntimeDeps): void {
  for (const item of [...created].reverse()) {
    try { deps.fs.rmdirSync(resolveFile(ctx, item.path, item.root, deps)); } catch (error) {
      if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes(codeOf(error) as string)) throw error;
    }
  }
}

function acquire(ctx: RegistryContext, recovering: boolean, created: Created[], deps: RuntimeDeps): () => void {
  const { fs } = deps;
  const lock = resolveFile(ctx, `${ctx.state}/lock.json`, "target", deps);
  mkdirParents(ctx, lock, "target", created, deps);
  if (fs.existsSync(lock)) {
    // Opening a FIFO must not block a ledger or registry caller; bound both type and bytes
    // on the descriptor so a leaf swap cannot bypass a pathname-only size/type check.
    const descriptor = fs.openSync(lock, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0));
    let owner: { pid?: unknown };
    try {
      const stat = fs.fstatSync(descriptor);
      if (!stat.isFile() || stat.size > 4096) throw new Error("Invalid lock: expected a small regular file");
      const bytes = Buffer.alloc(4097);
      const count = fs.readSync(descriptor, bytes, 0, bytes.length, 0);
      if (count > 4096) throw new Error("Invalid lock: expected a small regular file");
      owner = JSON.parse(bytes.subarray(0, count).toString("utf8")) as { pid?: unknown };
    } finally { fs.closeSync(descriptor); }
    let alive = true;
    if (typeof owner.pid !== "number" || !Number.isSafeInteger(owner.pid) || owner.pid <= 0) throw new Error("Invalid lock; inspect it before recovery");
    try { deps.proc.kill(owner.pid, 0); } catch (error) { if (codeOf(error) === "ESRCH") alive = false; }
    if (alive || !recovering) throw new Error(alive ? "Skill registry is locked by another process" : "Interrupted transaction: run recover");
    fs.unlinkSync(lock);
  }
  const handle = fs.openSync(lock, "wx", 0o600);
  try { fs.writeFileSync(handle, json({ pid: deps.proc.pid })); fs.fsyncSync(handle); } finally { fs.closeSync(handle); }
  return () => fs.rmSync(lock, { force: true });
}

interface Journal {
  schemaVersion: number;
  roots: unknown;
  operations: PreparedOperation[];
  created?: Created[];
}

function recoverJournal(ctx: RegistryContext, deps: RuntimeDeps): boolean {
  const { fs } = deps;
  const journalPath = `${ctx.state}/transaction.json`;
  const journalFile = snapshot(ctx, journalPath, "target", deps);
  if (!journalFile) return false;
  const journal = JSON.parse(fromBase64(journalFile.data).toString()) as Journal;
  if (journal.schemaVersion !== 1 || !Array.isArray(journal.operations) || JSON.stringify(journal.roots) !== JSON.stringify(ctx.roots)) throw new Error("Invalid recovery journal or changed transaction roots");
  // Check every file before restoring any: a concurrent local edit must never be overwritten.
  for (const operation of journal.operations) {
    const current = snapshot(ctx, operation.path, operation.root, deps);
    if (!same(current, operation.before) && !same(current, operation.after)) throw new Error(`Recovery conflict: ${operation.path}`);
    for (const value of [operation.before, operation.after]) {
      if (value && (!Number.isInteger(value.mode) || value.mode < 0 || value.mode > 0o777 || digest(fromBase64(value.data), deps) !== value.hash)) throw new Error("Damaged recovery backup");
    }
  }
  const created: Created[] = [];
  for (const operation of [...journal.operations].reverse()) writeAtomic(ctx, operation.path, operation.before, operation.root, created, deps);
  fs.unlinkSync(resolveFile(ctx, journalPath, "target", deps));
  cleanup(ctx, journal.created || [], deps);
  return true;
}

export function recover(ctx: RegistryContext, deps: RuntimeDeps = defaultDeps()): boolean {
  const created: Created[] = [];
  const release = acquire(ctx, true, created, deps);
  try { return recoverJournal(ctx, deps); } finally { release(); cleanup(ctx, created, deps); }
}

export function transact(ctx: RegistryContext, operations: Operation[], options: TransactOptions = {}, deps: RuntimeDeps = defaultDeps()): void {
  const { fs, path } = deps;
  const created: Created[] = [];
  let release: (() => void) | undefined;
  const journalPath = `${ctx.state}/transaction.json`;
  try {
    release = acquire(ctx, false, created, deps);
    if (snapshot(ctx, journalPath, "target", deps)) throw new Error("Interrupted transaction: run recover");
    const seen = new Set<string>();
    const prepared = operations.map((operation): PreparedOperation => {
      const root = operation.root || "target";
      const full = resolveFile(ctx, operation.path, root, deps).toLowerCase();
      if ([...seen].some((item) => item === full || item.startsWith(`${full}${path.sep}`) || full.startsWith(`${item}${path.sep}`))) throw new Error(`Duplicate or overlapping transaction destination: ${operation.path}`);
      seen.add(full);
      const before = snapshot(ctx, operation.path, root, deps);
      if ((before?.hash || null) !== operation.expected || Object.hasOwn(operation, "expectedMode") && (before?.mode || null) !== operation.expectedMode) throw new Error(`Concurrent edit or ownership conflict: ${operation.path}`);
      const after: Snapshot | null = operation.value === null ? null : { data: Buffer.from(operation.value.data).toString("base64"), mode: operation.value.mode, hash: digest(operation.value.data, deps) };
      return { root, path: operation.path, before, after };
    });
    const journal = { schemaVersion: 1, roots: ctx.roots, operations: prepared, created };
    writeAtomic(ctx, journalPath, { data: json(journal).toString("base64"), mode: 0o600 }, "target", created, deps);
    try {
      for (let index = 0; index < prepared.length; index++) {
        const operation = prepared[index];
        if (!same(snapshot(ctx, operation.path, operation.root, deps), operation.before)) throw new Error(`Concurrent edit: ${operation.path}`);
        writeAtomic(ctx, operation.path, operation.after, operation.root, created, deps);
        // Persist the directory ledger too so process interruption can be recovered.
        writeAtomic(ctx, journalPath, { data: json(journal).toString("base64"), mode: 0o600 }, "target", created, deps);
        options.afterWrite?.(index);
      }
      for (const operation of prepared) {
        if (!same(snapshot(ctx, operation.path, operation.root, deps), operation.after)) throw new Error(`Concurrent edit before commit: ${operation.path}`);
      }
      fs.unlinkSync(resolveFile(ctx, journalPath, "target", deps));
    } catch (error) {
      try { recoverJournal(ctx, deps); } catch (recoveryError) {
        throw new AggregateError([error, recoveryError], `${messageOf(error)}; rollback refused: ${messageOf(recoveryError)}`);
      }
      throw error;
    }
  } finally { if (release) release(); cleanup(ctx, created, deps); }
}
