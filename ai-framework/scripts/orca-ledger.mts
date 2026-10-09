import { VENDORS } from "./orca-policy.mts";
import type { RuntimeDeps, StatLike } from "./runtime/types.mts";

/**
 * Ownership ledger for supervised Orca worker attempts. One JSON file per attempt under
 * `<root>/.project/metrics/orca-ledger/` (Git-ignored local data). The ledger answers "does this attempt already
 * have an owner", so a read outcome must never collapse: `missing` (nothing there), `refused` (a symlink,
 * FIFO, non-regular or oversize entry), `corrupt` (unparseable or wrong shape) and `ok` are four distinct results,
 * and no writer ever treats `refused` or `corrupt` as `missing`.
 */

export const LEDGER_DIR_PARTS: readonly string[] = Object.freeze([".project", "metrics", "orca-ledger"]);
export const MAX_RECORD_BYTES = 64 * 1024;
export const ATTEMPT_PREFIX = "attempt:";
export const TASK_PREFIX = "task:";
export const STATES = Object.freeze(["claimed", "launched", "unknown-liveness", "completed", "failed", "settled"] as const);
export type LedgerState = (typeof STATES)[number];

export interface LedgerRecord {
  attemptKey: string;
  taskKey: string;
  vendor: string;
  state: LedgerState;
  createdAt: number;
  dispatchId?: string;
  /** Present once a worker's authoritative report completed the attempt. */
  reportId?: string;
}
export interface LedgerPatch { state?: LedgerState; dispatchId?: string; reportId?: string }

export type ReadResult =
  | { status: "missing" | "refused" | "corrupt" }
  | { status: "ok"; record: LedgerRecord };
export type ClaimResult =
  | { outcome: "claimed" | "replayed"; record: LedgerRecord }
  | { outcome: "conflict"; record: LedgerRecord }
  | { outcome: "refused" | "corrupt" | "invalid" | "failed" };
export type UpdateResult =
  | { status: "ok"; record: LedgerRecord }
  | { status: "missing" | "refused" | "corrupt" | "invalid" | "rejected" };
export type ListResult =
  | { status: "ok"; entries: Array<{ attemptKey: string; result: ReadResult }> }
  | { status: "missing" | "refused"; entries: [] };

export interface Ledger {
  /** Reads one attempt. Takes the prefixed key (`attempt:<id>`). */
  read(attemptKey: string): ReadResult;
  /** Atomic exclusive create. Identical replay returns the existing record; a different record for the same key is `conflict`. */
  claim(record: LedgerRecord): ClaimResult;
  /** Applies a patch along an allowed transition. Never touches a refused, corrupt or missing slot. */
  update(attemptKey: string, patch: LedgerPatch): UpdateResult;
  /** Reads every slot; refused and corrupt slots are listed as such, never skipped. */
  list(): ListResult;
}

/** Strict allow-list grammar for the identifier part of a key: it becomes a file name. */
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const FILE = /^attempt-([A-Za-z0-9][A-Za-z0-9._-]{0,63})\.json$/;
const TRANSITIONS: Readonly<Record<LedgerState, readonly LedgerState[]>> = Object.freeze({
  claimed: ["launched", "unknown-liveness", "failed"],
  launched: ["unknown-liveness", "completed", "failed", "settled"],
  "unknown-liveness": ["launched", "completed", "failed", "settled"],
  completed: ["settled"],
  failed: ["settled"],
  settled: [],
});
const RECORD_KEYS = ["attemptKey", "taskKey", "vendor", "state", "createdAt", "dispatchId", "reportId"];

const validId = (id: unknown): id is string => typeof id === "string" && ID.test(id) && !id.includes("..");
export const attemptKeyOf = (id: string): string => ATTEMPT_PREFIX + id;
export const taskKeyOf = (id: string): string => TASK_PREFIX + id;
/** The identifier after a fixed prefix, or undefined when the key is not `<prefix><valid id>`. */
export function idOf(key: unknown, prefix: string): string | undefined {
  if (typeof key !== "string" || !key.startsWith(prefix)) return undefined;
  const id = key.slice(prefix.length);
  return validId(id) ? id : undefined;
}
const fileFor = (id: string): string => `attempt-${id}.json`;
const errorCode = (error: unknown): unknown => (error !== null && typeof error === "object" ? (error as { code?: unknown }).code : undefined);
const isPlain = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));

/** Shape check shared by read and claim. A record that fails it is `corrupt` on disk and `invalid` as input. */
export function validateRecord(value: unknown): value is LedgerRecord {
  if (!isPlain(value) || !Object.keys(value).every((key) => RECORD_KEYS.includes(key))) return false;
  if (idOf(value.attemptKey, ATTEMPT_PREFIX) === undefined || idOf(value.taskKey, TASK_PREFIX) === undefined) return false;
  if (!VENDORS.includes(value.vendor as string) || !STATES.includes(value.state as LedgerState)) return false;
  if (!Number.isSafeInteger(value.createdAt) || (value.createdAt as number) < 0) return false;
  if (Object.hasOwn(value, "dispatchId") && !validId(value.dispatchId)) return false;
  if (Object.hasOwn(value, "reportId") && !validId(value.reportId)) return false;
  const hasReport = Object.hasOwn(value, "reportId");
  if (value.state === "completed" && !hasReport) return false;
  if ((value.state === "claimed" || value.state === "launched" || value.state === "unknown-liveness" || value.state === "failed") && hasReport) return false;
  return true;
}
const canonical = (record: LedgerRecord): string => JSON.stringify(RECORD_KEYS.filter((key) => Object.hasOwn(record, key)).map((key) => [key, (record as unknown as Record<string, unknown>)[key]]));
const serialize = (record: LedgerRecord): string => JSON.stringify(Object.fromEntries(RECORD_KEYS.filter((key) => Object.hasOwn(record, key)).map((key) => [key, (record as unknown as Record<string, unknown>)[key]])));

type Dir = { kind: "dir"; dir: string } | { kind: "missing" } | { kind: "refused" };

export function createLedger(root: string, deps: RuntimeDeps): Ledger {
  const { fs, path } = deps;

  /** Walks `.project/metrics/orca-ledger` below the real project root, lstat-checking every component. */
  function walkDir(create: boolean): Dir {
    let current: string;
    try { current = fs.realpathSync(root); } catch { return { kind: "refused" }; }
    for (const part of LEDGER_DIR_PARTS) {
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

  function inspectFile(dir: string, id: string): { kind: "file"; file: string; stat: StatLike } | { kind: "missing" } | { kind: "refused" } {
    const file = path.join(dir, fileFor(id));
    let stat: StatLike;
    try { stat = fs.lstatSync(file); } catch (error) { return errorCode(error) === "ENOENT" ? { kind: "missing" } : { kind: "refused" }; }
    if (stat.isSymbolicLink()) return { kind: "refused" };
    if (!stat.isFile()) return { kind: "refused" };
    if (stat.size > MAX_RECORD_BYTES) return { kind: "refused" };
    return { kind: "file", file, stat };
  }

  function readSlot(dir: string, id: string): ReadResult {
    const located = inspectFile(dir, id);
    if (located.kind !== "file") return { status: located.kind };
    let text: string;
    let descriptor: number | undefined;
    try {
      // O_NONBLOCK keeps a FIFO swapped in after lstat from blocking; O_NOFOLLOW refuses a swapped-in leaf symlink.
      descriptor = fs.openSync(located.file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
      const opened = fs.fstatSync(descriptor);
      if (!opened.isFile() || opened.size > MAX_RECORD_BYTES || opened.dev !== located.stat.dev || opened.ino !== located.stat.ino) return { status: "refused" };
      const buffer = new Uint8Array(MAX_RECORD_BYTES + 1);
      let size = 0;
      while (size < buffer.length) {
        const count = fs.readSync(descriptor, buffer, size, buffer.length - size, null);
        if (!count) break;
        size += count;
      }
      if (size > MAX_RECORD_BYTES) return { status: "refused" };
      text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(buffer.subarray(0, size));
    } catch { return { status: "refused" }; } finally { if (descriptor !== undefined) { try { fs.closeSync(descriptor); } catch { /* read-only descriptor */ } } }
    let value: unknown;
    try { value = JSON.parse(text); } catch { return { status: "corrupt" }; }
    if (!validateRecord(value) || idOf(value.attemptKey, ATTEMPT_PREFIX) !== id) return { status: "corrupt" };
    return { status: "ok", record: value };
  }

  function read(attemptKey: string): ReadResult {
    const id = idOf(attemptKey, ATTEMPT_PREFIX);
    if (id === undefined) return { status: "refused" };
    const dir = walkDir(false);
    if (dir.kind !== "dir") return { status: dir.kind };
    return readSlot(dir.dir, id);
  }

  function claim(record: LedgerRecord): ClaimResult {
    if (!validateRecord(record) || record.state !== "claimed") return { outcome: "invalid" };
    const id = idOf(record.attemptKey, ATTEMPT_PREFIX) as string;
    const dir = walkDir(true);
    if (dir.kind !== "dir") return { outcome: "refused" };
    for (let attempt = 0; attempt < 2; attempt++) {
      const existing = readSlot(dir.dir, id);
      if (existing.status === "ok") {
        return canonical(existing.record) === canonical(record) ? { outcome: "replayed", record: existing.record } : { outcome: "conflict", record: existing.record };
      }
      // A refused or corrupt slot is occupied by something we do not understand: never create over it.
      if (existing.status !== "missing") return { outcome: existing.status };
      const file = path.join(dir.dir, fileFor(id));
      let descriptor: number;
      try { descriptor = fs.openSync(file, "wx", 0o600); } catch (error) {
        if (errorCode(error) === "EEXIST") continue; // lost a race: re-read and classify what the winner left
        return { outcome: "failed" };
      }
      try {
        fs.writeSync(descriptor, serialize(record));
        fs.fsyncSync(descriptor);
      } catch {
        try { fs.closeSync(descriptor); } catch { /* best effort */ }
        try { fs.unlinkSync(file); } catch { /* we created it, leave nothing half-written if possible */ }
        return { outcome: "failed" };
      }
      fs.closeSync(descriptor);
      return { outcome: "claimed", record: { ...record } };
    }
    return { outcome: "failed" };
  }

  function update(attemptKey: string, patch: LedgerPatch): UpdateResult {
    const id = idOf(attemptKey, ATTEMPT_PREFIX);
    if (id === undefined || !isPlain(patch) || !Object.keys(patch).every((key) => ["state", "dispatchId", "reportId"].includes(key))) return { status: "invalid" };
    const dir = walkDir(false);
    if (dir.kind !== "dir") return { status: dir.kind };
    const current = readSlot(dir.dir, id);
    if (current.status !== "ok") return { status: current.status };
    const next: LedgerRecord = { ...current.record };
    if (patch.state !== undefined) {
      if (!STATES.includes(patch.state) || !TRANSITIONS[current.record.state].includes(patch.state)) return { status: "rejected" };
      next.state = patch.state;
    }
    // A recorded dispatch id is the attempt's identity: it can be set once and never replaced.
    if (patch.dispatchId !== undefined) {
      if (current.record.dispatchId !== undefined && current.record.dispatchId !== patch.dispatchId) return { status: "rejected" };
      next.dispatchId = patch.dispatchId;
    }
    // Completion is a worker's word, not ours: only an update carrying that worker's reportId may complete an attempt.
    if (next.state === "completed" && current.record.state !== "completed" && patch.reportId === undefined) return { status: "rejected" };
    if (patch.reportId !== undefined) {
      if (next.state !== "completed" || current.record.state === "completed") return { status: "rejected" };
      next.reportId = patch.reportId;
    }
    if (!validateRecord(next)) return { status: "invalid" };
    const file = path.join(dir.dir, fileFor(id));
    const temp = path.join(dir.dir, `.tmp-${deps.crypto.randomUUID()}`);
    try {
      fs.writeFileSync(temp, serialize(next), { flag: "wx", mode: 0o600 });
      // Re-check just before replacing: the slot must still be the regular file we validated.
      const again = inspectFile(dir.dir, id);
      if (again.kind !== "file") throw new Error("slot-changed");
      // Compare-before-replace narrows the lost-update window: a record changed since we read it is not overwritten.
      const reread = readSlot(dir.dir, id);
      if (reread.status !== "ok" || serialize(reread.record) !== serialize(current.record)) throw new Error("slot-changed");
      fs.renameSync(temp, file);
    } catch {
      try { fs.unlinkSync(temp); } catch { /* temp may not exist */ }
      return { status: "refused" };
    }
    return { status: "ok", record: next };
  }

  function list(): ListResult {
    const dir = walkDir(false);
    if (dir.kind !== "dir") return { status: dir.kind, entries: [] };
    let names: string[];
    try { names = fs.readdirSync(dir.dir).sort(); } catch { return { status: "refused", entries: [] }; }
    const entries: Array<{ attemptKey: string; result: ReadResult }> = [];
    for (const name of names) {
      const match = FILE.exec(name);
      if (!match || match[1].includes("..")) continue;
      entries.push({ attemptKey: attemptKeyOf(match[1]), result: readSlot(dir.dir, match[1]) });
    }
    return { status: "ok", entries };
  }

  return { read, claim, update, list };
}
