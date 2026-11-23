#!/usr/bin/env node
import { runDirect } from "./runtime/cli.mts";

import type { RuntimeDeps } from "./runtime/types.mts";

/*
 * Orca CLI contract snapshot. `orca agent-context --json` describes every command, flag and "Retired" marker of the
 * installed CLI. This module keeps a committed snapshot of ONLY the commands and flags our scripts send, and diffs it
 * against the live CLI so a removed flag or a newly retired command is found by the doctor instead of by a failed launch.
 * Added commands and flags are never a failure. CLI output is untrusted: it is size-bounded, parsed as data, and only
 * names from USED_CONTRACT (our own constants) ever reach a reason.
 *
 *   bun ai-framework/scripts/orca-contract.mts           regenerate the snapshot from the live CLI
 *   bun ai-framework/scripts/orca-contract.mts --check   fail when the committed snapshot is not what the CLI produces
 */

/** Committed snapshot path, relative to the project root. */
export const SNAPSHOT_PATH = "ai-framework/scripts/orca-contract.snapshot.json";
/**
 * The one byte bound shared by the generator (child output cap) and every reader (live schema and the snapshot file).
 * The real schema is about 421 KB, so this is deliberately larger than the shared 256 KB probe bound in
 * orca-preflight.mts, which is NOT raised for other reads.
 */
export const CONTRACT_MAX_BYTES = 1024 * 1024;
export const SNAPSHOT_SCHEMA_VERSION = 1;
export const GENERATE_TIMEOUT_MS = 20_000;

/** Commands and flags our scripts send (orca-dispatch, orca-start, orca-preflight). Keep in step with those callers. */
export const USED_CONTRACT: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "agent installed": ["json"],
  "orchestration worker-start": ["agent", "base-branch", "effort", "full", "json", "model", "name", "repo", "setup", "spec", "timeout-ms", "worktree"],
  "orchestration worker-list": ["cursor", "full", "json", "limit", "terminal-state"],
  status: ["json"],
  "skills get": ["json"],
});

export interface ContractEntry { flags: string[]; retired: boolean }
export interface ContractSnapshot {
  schemaVersion: number;
  source: string;
  sourceSchemaVersion: number;
  commands: Record<string, ContractEntry>;
}
export type ContractResult<T> = { ok: true; value: T } | { ok: false; reason: string };

const NAME = /^[a-z][a-z0-9-]{0,63}$/;
const byteLength = (text: string): number => new TextEncoder().encode(text).length;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const retiredSummary = (summary: unknown): boolean => typeof summary === "string" && /^retired\b/i.test(summary.trim());

interface LiveCommand { flags: Set<string>; retired: boolean }

/** Parses the live `agent-context` text into the commands we track. Returns a fixed reason, never raw text. */
function readLive(text: string): ContractResult<{ schemaVersion: number; commands: Map<string, LiveCommand> }> {
  if (typeof text !== "string" || byteLength(text) > CONTRACT_MAX_BYTES) return { ok: false, reason: "live schema missing or over the byte bound" };
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { ok: false, reason: "live schema is not valid JSON" }; }
  if (!isRecord(data) || typeof data.schemaVersion !== "number" || !Array.isArray(data.commands)) return { ok: false, reason: "live schema has an unexpected shape" };
  const commands = new Map<string, LiveCommand>();
  for (const item of data.commands) {
    if (!isRecord(item) || typeof item.command !== "string") continue;
    const flags = new Set<string>(Array.isArray(item.flags) ? item.flags.filter((flag): flag is string => typeof flag === "string") : []);
    commands.set(item.command, { flags, retired: retiredSummary(item.summary) });
  }
  return { ok: true, value: { schemaVersion: data.schemaVersion, commands } };
}

/** Generator: the snapshot for USED_CONTRACT from live `agent-context` text. Fails when a used command or flag is absent now. */
export function buildSnapshot(liveText: string): ContractResult<ContractSnapshot> {
  const live = readLive(liveText);
  if (!live.ok) return live;
  const commands: Record<string, ContractEntry> = {};
  for (const [name, flags] of Object.entries(USED_CONTRACT)) {
    const found = live.value.commands.get(name);
    if (!found) return { ok: false, reason: `used command "${name}" is not in the live CLI` };
    const missing = flags.filter((flag) => !found.flags.has(flag));
    if (missing.length) return { ok: false, reason: `used command "${name}" lacks flag ${missing.map((flag) => `--${flag}`).join(", ")} in the live CLI` };
    commands[name] = { flags: [...flags].sort(), retired: found.retired };
  }
  return { ok: true, value: { schemaVersion: SNAPSHOT_SCHEMA_VERSION, source: "orca agent-context --json", sourceSchemaVersion: live.value.schemaVersion, commands } };
}

export const serializeSnapshot = (snapshot: ContractSnapshot): string => `${JSON.stringify(snapshot, null, 2)}\n`;

/** Reader: strict validation of the committed file. Any problem is one fixed reason. */
export function parseSnapshot(text: string): ContractResult<ContractSnapshot> {
  if (typeof text !== "string" || byteLength(text) > CONTRACT_MAX_BYTES) return { ok: false, reason: "snapshot over the byte bound" };
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { ok: false, reason: "snapshot is not valid JSON" }; }
  const bad = { ok: false as const, reason: "snapshot has an unexpected shape" };
  if (!isRecord(data) || data.schemaVersion !== SNAPSHOT_SCHEMA_VERSION || typeof data.sourceSchemaVersion !== "number" || typeof data.source !== "string" || !isRecord(data.commands)) return bad;
  const commands: Record<string, ContractEntry> = {};
  for (const [name, entry] of Object.entries(data.commands)) {
    if (!Object.hasOwn(USED_CONTRACT, name) || !isRecord(entry) || typeof entry.retired !== "boolean" || !Array.isArray(entry.flags)) return bad;
    if (!entry.flags.every((flag) => typeof flag === "string" && NAME.test(flag))) return bad;
    commands[name] = { flags: entry.flags as string[], retired: entry.retired };
  }
  return { ok: true, value: { schemaVersion: data.schemaVersion, source: data.source, sourceSchemaVersion: data.sourceSchemaVersion, commands } };
}

export interface ContractDiff { ok: boolean; problems: string[] }

/** Diff: removed used flag, removed used command, newly retired used command and a changed schema version fail; additions pass. */
export function diffContract(snapshot: ContractSnapshot, liveText: string): ContractResult<ContractDiff> {
  const live = readLive(liveText);
  if (!live.ok) return live;
  const problems: string[] = [];
  if (live.value.schemaVersion !== snapshot.sourceSchemaVersion) problems.push(`agent-context schemaVersion changed from ${snapshot.sourceSchemaVersion} to ${live.value.schemaVersion}`);
  for (const [name, entry] of Object.entries(snapshot.commands)) {
    const found = live.value.commands.get(name);
    if (!found) { problems.push(`command "${name}" is gone`); continue; }
    if (found.retired && !entry.retired) problems.push(`command "${name}" is now Retired`);
    const missing = entry.flags.filter((flag) => !found.flags.has(flag));
    if (missing.length) problems.push(`command "${name}" lost flag ${missing.map((flag) => `--${flag}`).join(", ")}`);
  }
  return { ok: true, value: { ok: problems.length === 0, problems } };
}

/** Offline check: every command and flag in USED_CONTRACT is present in the snapshot and none is Retired. Never touches the CLI. */
export function checkUsedAgainstSnapshot(snapshot: ContractSnapshot): ContractDiff {
  const problems: string[] = [];
  for (const [name, flags] of Object.entries(USED_CONTRACT)) {
    const entry = snapshot.commands[name];
    if (!entry) { problems.push(`command "${name}" is missing from the snapshot`); continue; }
    if (entry.retired) problems.push(`command "${name}" is marked Retired in the snapshot`);
    const missing = flags.filter((flag) => !entry.flags.includes(flag));
    if (missing.length) problems.push(`command "${name}" lacks flag ${missing.map((flag) => `--${flag}`).join(", ")} in the snapshot`);
  }
  return { ok: problems.length === 0, problems };
}

export type LiveRead = { status: "ok"; text: string } | { status: "absent" } | { status: "failed"; reason: string };

/** Runs `<command> agent-context --json` (read-only) with the shared bound as the output cap. ENOENT means orca is absent. */
export async function readLiveContract(deps: RuntimeDeps, command: string, cwd: string): Promise<LiveRead> {
  try {
    const result = await deps.child.run(command, ["agent-context", "--json"], { cwd, timeoutMs: GENERATE_TIMEOUT_MS, maxBufferBytes: CONTRACT_MAX_BYTES, killSignal: "SIGKILL" });
    if (result.errorCode) return { status: "failed", reason: `agent-context stopped: ${result.errorCode === "ETIMEDOUT" ? "timeout" : result.errorCode === "ENOBUFS" ? "over the byte bound" : "error"}` };
    if (result.status !== 0) return { status: "failed", reason: "agent-context exited non-zero" };
    return { status: "ok", text: result.stdout };
  } catch (error) {
    if ((error as { code?: string } | null)?.code === "ENOENT") return { status: "absent" };
    return { status: "failed", reason: "agent-context could not be run" };
  }
}

export type SnapshotRead = { status: "ok"; snapshot: ContractSnapshot } | { status: "failed"; reason: string };

/** Reads and validates the committed snapshot under `root`. A missing, oversize or malformed file is one failed read. */
export function readSnapshotFile(deps: RuntimeDeps, root: string): SnapshotRead {
  const file = deps.path.join(root, SNAPSHOT_PATH);
  let text: string;
  try {
    const stat = deps.fs.statSync(file);
    if (!stat.isFile()) return { status: "failed", reason: "snapshot is not a regular file" };
    if (stat.size > CONTRACT_MAX_BYTES) return { status: "failed", reason: "snapshot over the byte bound" };
    text = deps.fs.readFileSync(file);
  } catch { return { status: "failed", reason: "snapshot missing or unreadable" }; }
  const parsed = parseSnapshot(text);
  return parsed.ok ? { status: "ok", snapshot: parsed.value } : { status: "failed", reason: parsed.reason };
}

/** Resolves the orca executable name: an explicit absolute `ORCA_CLI_COMMAND`, otherwise `orca` on PATH. */
export function orcaCommand(env: Record<string, string | undefined>, deps: RuntimeDeps): string {
  const value = env.ORCA_CLI_COMMAND;
  return typeof value === "string" && value.length > 0 && value.length <= 4096 && !/[\0\r\n]/.test(value) && deps.path.isAbsolute(value) ? value : "orca";
}

export async function main(argv: string[], deps: RuntimeDeps): Promise<number> {
  const root = deps.proc.cwd();
  const out = (text: string): void => { deps.io.stdout.write(`${text}\n`); };
  const live = await readLiveContract(deps, orcaCommand(deps.proc.env, deps), root);
  if (live.status !== "ok") { deps.io.stderr.write(`orca-contract: ${live.status === "absent" ? "orca is not on PATH" : live.reason}\n`); return 1; }
  const built = buildSnapshot(live.text);
  if (!built.ok) { deps.io.stderr.write(`orca-contract: ${built.reason}\n`); return 1; }
  const text = serializeSnapshot(built.value);
  const file = deps.path.join(root, SNAPSHOT_PATH);
  if (argv.includes("--check")) {
    let current = "";
    try { current = deps.fs.readFileSync(file); } catch { /* a missing file differs below */ }
    if (current !== text) { deps.io.stderr.write(`orca-contract: ${SNAPSHOT_PATH} differs from the live CLI; regenerate with bun ai-framework/scripts/orca-contract.mts\n`); return 1; }
    out("orca-contract: snapshot matches the live CLI");
    return 0;
  }
  deps.fs.writeFileSync(file, text);
  out(`orca-contract: wrote ${SNAPSHOT_PATH}`);
  return 0;
}

runDirect(import.meta.url, main);
