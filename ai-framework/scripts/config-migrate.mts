import { validatePolicy } from "./orca-policy.mts";
import { runDirect } from "./runtime/cli.mts";
import { CONFIG_FILE, errorCodes, inspectPath, loadConfig, oexLock, readBoundedFile, wxRename } from "./runtime/config.mts";
import type { ConfigModel, OrcaCoordinator, OrcaIntegration } from "./runtime/config.mts";
import { workflowInvocation } from "./runtime/entry.mts";
import type { EntryMigration } from "./runtime/migrate.mts";
import type { RuntimeDeps, StatLike } from "./runtime/types.mts";

/**
 * Legacy settings -> `ai-workflow.toon` migrator. This scope only WRITES: it never deletes a legacy file
 * (scope d owns that). Every guard lives in `runtime/config.mts` (`inspectPath`, `readBoundedFile`, `wxRename`,
 * `oexLock`, `loadConfig`); this file composes them.
 *
 * `--force` has three branches, decided by what is already at `ai-workflow.toon`:
 *   (i)   absent                    -> write.
 *   (ii)  parseable and valid       -> refuse when it differs, unless `--force`. `--force` always backs the file up
 *                                      first and classifies it with dual-hash tracking: it records the
 *                                      canonical-bytes-written digest and the parsed-model-as-read digest in
 *                                      `state.json`, and compares the on-disk bytes against the written digest only.
 *   (iii) present and unparseable   -> refuse, never overwrite; on `--apply` move it aside as `.rejected`
 *                                      (never over an existing one) and require operator recovery.
 */

export const BACKUP_DIR = ".project/records/config-migration";
export const STATE_FILE = `${BACKUP_DIR}/state.json`;
export const LEGACY = Object.freeze({
  env: "ai_workflow_env.json",
  policy: ".project/orchestration.json",
  modes: ".project/skills/modes.json",
});
const DEFAULT_ENGINE = "1.4.224";
const MAX_LEGACY_BYTES = 64 * 1024;
const MAX_GITIGNORE_BYTES = 1024 * 1024;
const MODE_NAMES = new Set(["lite", "full", "ultra", "wenyan-lite", "wenyan-full", "wenyan-ultra"]);
const SAFE_TOKEN = /^[A-Za-z0-9._:-]+$/;
const USAGE = "usage: config-migrate [--dry-run | --apply] [--force] [--json] [--root <project>]";

export type MigrationAction = "write" | "overwrite" | "unchanged" | "refuse" | "reject" | "backup" | "ignore" | "revalidate";
export interface ConfigMigration extends EntryMigration { action: MigrationAction }
export interface MigrationOutcome { exitCode: number; results: ConfigMigration[]; toon?: string; notes: string[] }
export interface MigrateOptions { apply: boolean; force: boolean }

type Reading = { state: "absent" } | { state: "refused"; reason: string } | { state: "ok"; text: string; stat: StatLike };
interface Existing { kind: "absent" | "valid" | "unsupported" | "unregistered" | "unsafe" | "invalid"; text?: string; stat?: StatLike; detail?: string }

const errorCode = (error: unknown): unknown => (error !== null && typeof error === "object" ? (error as { code?: unknown }).code : undefined);
/** An error whose message is safe to print: it never carries an absolute path or raw OS/legacy text. */
class MigrateError extends Error {
  readonly code: string;
  constructor(message: string, code = "MIGRATE-ERROR") { super(message); this.code = code; }
}
const safeCode = (error: unknown): string => {
  const code = errorCode(error);
  return typeof code === "string" && /^[A-Z0-9_-]{1,40}$/.test(code) ? code : "UNKNOWN";
};
/** Printable description of a caught error: our own messages verbatim, anything else only as an error code. */
const describe = (error: unknown): string => (error instanceof MigrateError ? error.message : `error ${safeCode(error)}`);
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));

/** Deterministic JSON (sorted keys) so equal models always hash alike. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
const modelHash = (model: ConfigModel, deps: RuntimeDeps): string => deps.crypto.sha256Hex(stable(model));

/**
 * Per-component ancestor walk in the style of `runtime/migrate.mts regular()`: a symlink or a wrong-typed component
 * is a refusal, never "absent" (K1). ENOENT is the only absence; ENOTDIR means an ancestor is a file, so it refuses.
 */
function readSafe(base: string, relative: string, maxBytes: number, deps: RuntimeDeps): Reading {
  const { fs, path } = deps;
  const parts = relative.split("/");
  let current = base;
  let stat: StatLike | undefined;
  try {
    for (let index = 0; index < parts.length; index++) {
      current = path.join(current, parts[index]);
      stat = fs.lstatSync(current);
      if (stat.isSymbolicLink()) return { state: "refused", reason: "path contains a symlink" };
      if (index < parts.length - 1 && !stat.isDirectory()) return { state: "refused", reason: "ancestor is not a directory" };
    }
  } catch (error) {
    if (errorCode(error) === "ENOENT") return { state: "absent" };
    return { state: "refused", reason: `cannot inspect path: ${String(errorCode(error))}` };
  }
  if (!stat || !stat.isFile()) return { state: "refused", reason: "not a regular file" };
  if (stat.size > maxBytes) return { state: "refused", reason: `larger than ${maxBytes} bytes` };
  let descriptor: number | undefined;
  try {
    const relativeReal = path.relative(fs.realpathSync(base), fs.realpathSync(current));
    if (relativeReal.startsWith("..") || path.isAbsolute(relativeReal)) return { state: "refused", reason: "resolves outside the project root" };
    descriptor = fs.openSync(current, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
    const opened = fs.fstatSync(descriptor);
    if (!opened.isFile() || opened.dev !== stat.dev || opened.ino !== stat.ino) return { state: "refused", reason: "changed between inspect and open" };
    const buffer = new Uint8Array(maxBytes + 1);
    let size = 0;
    while (size < buffer.length) {
      const count = fs.readSync(descriptor, buffer, size, buffer.length - size, null);
      if (!count) break;
      size += count;
    }
    if (size > maxBytes) return { state: "refused", reason: "grew during read" };
    const after = fs.lstatSync(current);
    if (after.dev !== opened.dev || after.ino !== opened.ino) return { state: "refused", reason: "changed during read" };
    return { state: "ok", text: new TextDecoder("utf-8", { ignoreBOM: true }).decode(buffer.subarray(0, size)), stat };
  } catch (error) {
    return { state: "refused", reason: `cannot read file: ${String(errorCode(error))}` };
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

// ---- legacy -> model ------------------------------------------------------------------------------------------

interface LegacyFile { relative: string; text: string }
interface Built { model: ConfigModel; files: LegacyFile[]; notes: string[] }

function buildModel(base: string, deps: RuntimeDeps): Built | { error: string } {
  const files: LegacyFile[] = [];
  const notes: string[] = [];
  const read = (relative: string): { text?: string } | { error: string } => {
    const reading = readSafe(base, relative, MAX_LEGACY_BYTES, deps);
    if (reading.state === "refused") return { error: `${relative}: ${reading.reason}; a refused legacy file is not treated as absent` };
    if (reading.state === "ok") files.push({ relative, text: reading.text });
    return reading.state === "ok" ? { text: reading.text } : {};
  };
  const parse = (text: string): { value: unknown } | undefined => {
    try { return { value: JSON.parse(text) }; } catch { return undefined; }
  };

  let runner: "node" | "bun" = "node";
  let multiAgent = false;
  const env = read(LEGACY.env);
  if ("error" in env) return env;
  if (env.text !== undefined) {
    const value = parse(env.text)?.value;
    if (!isRecord(value)) return { error: `${LEGACY.env}: must be a JSON object` };
    let unprintable = 0;
    for (const key of Object.keys(value)) {
      if (key === "AI_WORKFLOW_RUNNER" || key === "AI_WORKFLOW_ORCA_MULTI_AGENT") continue;
      // Legacy keys are untrusted: only a short [A-Za-z0-9_-] key is echoed; anything else is counted, never printed.
      if (/^[A-Za-z0-9_-]{1,64}$/.test(key)) notes.push(`${LEGACY.env}: ignored key ${key}`);
      else unprintable++;
    }
    if (unprintable) notes.push(`${LEGACY.env}: ${unprintable} ignored key(s) (unprintable)`);
    const rawRunner = value.AI_WORKFLOW_RUNNER;
    if (rawRunner !== undefined) {
      const name = typeof rawRunner === "string" ? rawRunner.trim().toLowerCase() : "";
      if (name !== "node" && name !== "bun") return { error: `${LEGACY.env}: AI_WORKFLOW_RUNNER must be "node" or "bun"` };
      runner = name;
    }
    const rawSwitch = value.AI_WORKFLOW_ORCA_MULTI_AGENT;
    if (rawSwitch !== undefined) {
      if (typeof rawSwitch !== "string" && typeof rawSwitch !== "boolean") return { error: `${LEGACY.env}: AI_WORKFLOW_ORCA_MULTI_AGENT must be a string or boolean` };
      multiAgent = String(rawSwitch).trim().toLowerCase() === "true";
    }
  }

  const orca: OrcaIntegration = { engine: DEFAULT_ENGINE, enabled: false, multiAgent, maxConcurrentWorkers: 3, maxRetriesPerTask: 1 };
  const policy = read(LEGACY.policy);
  if ("error" in policy) return policy;
  if (policy.text !== undefined) {
    const parsed = parse(policy.text);
    if (!parsed) return { error: `${LEGACY.policy}: not valid JSON` };
    const result = validatePolicy(parsed.value);
    if (!result.policy) return { error: `${LEGACY.policy}: ${result.status}` };
    orca.enabled = result.policy["use-orca-orchestration"];
    orca.maxConcurrentWorkers = result.policy.maxConcurrentWorkers;
    orca.maxRetriesPerTask = result.policy.maxRetriesPerTask;
    const coordinators: Record<string, OrcaCoordinator> = {};
    for (const [vendor, entry] of Object.entries(result.policy.coordinators)) {
      const roles: Record<string, string | string[]> = {};
      for (const [role, worker] of Object.entries(entry.roles)) roles[role] = [worker];
      const coordinator: OrcaCoordinator = { roles };
      // Legacy per-coordinator workers are preserved as-is (no longer pooled or dropped).
      if (entry.workers.length) coordinator.workers = [...entry.workers];
      coordinators[vendor] = coordinator;
    }
    if (Object.keys(coordinators).length) orca.coordinators = coordinators;
  }

  let caveman: ConfigModel["skills"]["modes"]["caveman"] = "full";
  const modes = read(LEGACY.modes);
  if ("error" in modes) return modes;
  if (modes.text !== undefined) {
    const value = parse(modes.text)?.value;
    if (!isRecord(value) || value.schemaVersion !== 1) return { error: `${LEGACY.modes}: unsupported or invalid mode state` };
    const state = value.caveman;
    if (state !== undefined) {
      if (!isRecord(state)) return { error: `${LEGACY.modes}: invalid caveman mode state` };
      if (state.enabled !== undefined && typeof state.enabled !== "boolean") return { error: `${LEGACY.modes}: caveman.enabled must be boolean` };
      if (state.default !== undefined && !(typeof state.default === "string" && MODE_NAMES.has(state.default))) return { error: `${LEGACY.modes}: invalid caveman.default` };
      if (state.enabled === false) caveman = "off";
      else if (typeof state.default === "string") caveman = state.default as typeof caveman;
      if (isRecord(state.phases) && Object.keys(state.phases).length) notes.push(`${LEGACY.modes}: per-phase caveman modes are not representable in the TOON file; modes.json stays authoritative for them`);
    }
  }

  const model: ConfigModel = {
    schemaVersion: 2,
    runtime: { runner },
    doctor: { modelRouting: "project" },
    skills: { modes: { caveman } },
    integrations: { orca },
  };
  return { model, files, notes };
}

// ---- canonical TOON writer ------------------------------------------------------------------------------------

function scalar(value: string): string {
  if (!SAFE_TOKEN.test(value)) throw new MigrateError("a value cannot be written as a TOON token");
  return value;
}

/** Pure and deterministic: equal models always produce equal bytes (the idempotency contract). */
export function emitToon(model: ConfigModel): string {
  const { orca, ...others } = model.integrations;
  if (Object.keys(others).length) throw new Error("integrations other than orca are not written by the migrator");
  const lines: string[] = [
    "schemaVersion: 2",
    "runtime:", `  runner: ${scalar(model.runtime.runner)}`,
    "integrations:",
    "  orca:",
    `    engine: "${scalar(orca.engine)}"`,
    `    enabled: ${orca.enabled}`,
    `    multiAgent: ${orca.multiAgent}`,
    `    maxConcurrentWorkers: ${orca.maxConcurrentWorkers}`,
    `    maxRetriesPerTask: ${orca.maxRetriesPerTask}`,
  ];
  const coordinators = Object.entries(orca.coordinators ?? {});
  if (coordinators.length) {
    lines.push("    coordinators:");
    for (const [vendor, entry] of coordinators) {
      lines.push(`      ${scalar(vendor)}:`);
      if (entry.workers?.length) lines.push(`        workers[${entry.workers.length}]: ${entry.workers.map(scalar).join(",")}`);
      const roles = Object.entries(entry.roles ?? {});
      if (!roles.length) { lines.push("        roles: {}"); continue; }
      lines.push("        roles:");
      for (const [role, target] of roles) {
        lines.push(Array.isArray(target) ? `          ${scalar(role)}[${target.length}]: ${target.map(scalar).join(",")}` : `          ${scalar(role)}: ${scalar(target)}`);
      }
    }
  }
  lines.push("doctor:", `  modelRouting: ${scalar(model.doctor.modelRouting)}`, "skills:", "  modes:", `    caveman: ${scalar(model.skills.modes.caveman)}`);
  return `${lines.join("\n")}\n`;
}

/** Writes the canonical bytes into a scratch project, reads them back through `loadConfig`, and returns the parsed model. */
function roundTrip(text: string, deps: RuntimeDeps): { model: ConfigModel } | { error: string } {
  const { fs, path } = deps;
  let scratch: string | undefined;
  try {
    scratch = fs.realpathSync(fs.mkdtempSync(path.join(deps.os.tmpdir(), "config-migrate-")));
    fs.writeFileSync(path.join(scratch, CONFIG_FILE), text, { flag: "wx", mode: 0o600 });
    const loaded = loadConfig(scratch, deps);
    if ("status" in loaded) return { error: `canonical output was refused by the reader: ${loaded.code}` };
    if (loaded.problems.length) return { error: `canonical output has problems: ${loaded.problems.map((item) => item.code).join(",")}` };
    return { model: loaded.model };
  } catch (error) {
    return { error: `canonical output could not be validated: ${String(errorCode(error))}` };
  } finally {
    if (scratch) { try { fs.rmSync(scratch, { recursive: true, force: true }); } catch { /* scratch only */ } }
  }
}

// ---- existing target ------------------------------------------------------------------------------------------

const HARD_REFUSALS = new Set<string>([errorCodes.lexerSymlink, errorCodes.lexerOversize, errorCodes.lexerUnreadable, errorCodes.inspectPathEscape, errorCodes.inspectPathNotFile, errorCodes.inspectPathSymlink, errorCodes.inspectPathOversize]);

/**
 * Structured classification: the reader's `CONFIG-SCHEMA-VERSION-UNKNOWN` refusal counts as "unsupported" only when the
 * version it names is a plain integer AND the file itself carries exactly that bare integer on a top-level
 * `schemaVersion:` line. A quoted/crafted string value therefore never qualifies, whatever the message text contains.
 */
function unsupportedVersion(message: string | undefined, fileText: string): number | undefined {
  const named = /^unsupported schemaVersion: (-?\d{1,9}) \(only 2 is supported[^\r\n]*\)$/.exec(message ?? "");
  if (!named) return undefined;
  const version = Number(named[1]);
  if (!Number.isSafeInteger(version) || version === 2) return undefined;
  const lines = fileText.split(/\r?\n/).filter((line) => /^schemaVersion\s*:/.test(line));
  if (lines.length !== 1) return undefined;
  const bare = /^schemaVersion\s*:\s*(-?\d{1,9})\s*(?:#.*)?$/.exec(lines[0]);
  return bare !== null && Number(bare[1]) === version ? version : undefined;
}

function inspectExisting(base: string, deps: RuntimeDeps): Existing {
  let location: ReturnType<typeof inspectPath>;
  try { location = inspectPath(base, deps); }
  catch (error) { return errorCode(error) === "ENOENT" ? { kind: "absent" } : { kind: "unsafe", detail: `cannot inspect ${CONFIG_FILE}: ${String(errorCode(error))}` }; }
  if ("status" in location) return { kind: "unsafe", detail: location.text };
  let contents: ReturnType<typeof readBoundedFile>;
  try { contents = readBoundedFile(location, deps); }
  catch (error) { return { kind: "unsafe", detail: `cannot read ${CONFIG_FILE}: ${String(errorCode(error))}` }; }
  if ("status" in contents) return { kind: "unsafe", detail: contents.text };
  const loaded = loadConfig(base, deps);
  const common = { text: contents.text, stat: location.stat };
  if ("status" in loaded) {
    if (loaded.status === "missing") return { kind: "absent" };
    // An old-layout (schemaVersion 1) or future file is a well-formed but unsupported version: handled like any differing file.
    if (loaded.code === errorCodes.schemaVersionUnknown) {
      const version = unsupportedVersion(loaded.text, contents.text);
      if (version !== undefined) return { kind: "unsupported", detail: `schemaVersion ${version}`, ...common };
    }
    return HARD_REFUSALS.has(loaded.code ?? "") ? { kind: "unsafe", detail: loaded.text, ...common } : { kind: "invalid", detail: loaded.text, ...common };
  }
  if (!loaded.problems.length) return { kind: "valid", ...common };
  // A name no validator is registered for is an unregistered slot (X4 pass 3): refuse, but it is not a corrupt file.
  const slots = loaded.problems.filter((item) => /^unknown integration /.test(item.text));
  if (slots.length && loaded.problems.every((item) => slots.includes(item) || item.text === "unparsed content remains after errors")) {
    return { kind: "unregistered", detail: slots.map((item) => item.text).join("; "), ...common };
  }
  return { kind: "invalid", detail: loaded.problems.map((item) => item.code).join(","), ...common };
}

interface WrittenState { schemaVersion: 1; bytesSha256: string; modelSha256: string; writtenAt: string }

function readState(base: string, deps: RuntimeDeps): WrittenState | undefined {
  const reading = readSafe(base, STATE_FILE, MAX_LEGACY_BYTES, deps);
  if (reading.state !== "ok") return undefined;
  try {
    const value: unknown = JSON.parse(reading.text);
    if (isRecord(value) && value.schemaVersion === 1 && typeof value.bytesSha256 === "string" && typeof value.modelSha256 === "string") return value as unknown as WrittenState;
  } catch { /* an unreadable record means unknown provenance */ }
  return undefined;
}

// ---- guarded writers ------------------------------------------------------------------------------------------

interface DirPin { relative: string; dev: number; ino: number }

/** Creates `relative` one component at a time; a symlink or a non-directory component is a refusal. Returns the final directory's identity. */
function ensureDirectory(base: string, relative: string, deps: RuntimeDeps): DirPin {
  const { fs, path } = deps;
  let current = base;
  let stat: StatLike | undefined;
  for (const part of relative.split("/")) {
    current = path.join(current, part);
    stat = undefined;
    try { stat = fs.lstatSync(current); }
    catch (error) { if (errorCode(error) !== "ENOENT") throw error; }
    if (!stat) { fs.mkdirSync(current, { recursive: false, mode: 0o755 }); stat = fs.lstatSync(current); }
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new MigrateError(`${relative}: ${part} is not a plain directory`, "DIR-NOT-PLAIN");
  }
  return { relative, dev: stat?.dev as number, ino: stat?.ino as number };
}

/** Re-walks every ancestor (lstat, no links), compares the final directory's dev/ino with the pin, and requires realpath to equal the lexical path. */
function assertPinned(base: string, pin: DirPin, deps: RuntimeDeps): void {
  const { fs, path } = deps;
  let current = base;
  let stat: StatLike | undefined;
  for (const part of pin.relative.split("/")) {
    current = path.join(current, part);
    stat = fs.lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new MigrateError("a backup directory was replaced during the write", "DIR-PIN-CHANGED");
  }
  if (!stat || stat.dev !== pin.dev || stat.ino !== pin.ino || fs.realpathSync(current) !== current) throw new MigrateError("a backup directory was replaced during the write", "DIR-PIN-CHANGED");
}

/** wx temp + rename; with a pin the parent directory identity is re-checked before the temp is written and again right before the rename. */
function writeGuarded(target: string, text: string, mode: number, deps: RuntimeDeps, pinned?: { base: string; pin: DirPin }): string | undefined {
  const outcome = wxRename(target, (temp) => {
    if (pinned) assertPinned(pinned.base, pinned.pin, deps);
    deps.fs.writeFileSync(temp, text, { flag: "wx", mode });
    if (pinned) assertPinned(pinned.base, pinned.pin, deps);
  }, deps);
  if ("refused" in outcome) return outcome.refused.text ?? outcome.refused.code;
  if (pinned) { try { assertPinned(pinned.base, pinned.pin, deps); } catch { return "directory identity changed after the rename"; } }
  return undefined;
}

function stampNow(deps: RuntimeDeps): string {
  return `${new Date(deps.clock.now()).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")}-${deps.crypto.randomUUID().slice(0, 8)}`;
}

/** link-then-unlink: `link` fails with EEXIST, so an existing `.rejected` is never overwritten, even under a race. */
function moveAside(base: string, expected: StatLike, stamp: string, deps: RuntimeDeps): string {
  const { fs, path } = deps;
  const target = path.join(base, CONFIG_FILE);
  // lstat only (no realpath/open): this must also work for an unreadable file, e.g. when rolling back a failed verification.
  const current = fs.lstatSync(target);
  if (current.isSymbolicLink() || !current.isFile() || current.dev !== expected.dev || current.ino !== expected.ino) throw new MigrateError(`${CONFIG_FILE} changed before it could be moved aside`, "CHANGED");
  let destination: string | undefined;
  for (const candidate of [path.join(base, `${CONFIG_FILE}.rejected`), path.join(base, `${CONFIG_FILE}.rejected.${stamp}`)]) {
    try { fs.linkSync(target, candidate); destination = candidate; break; }
    catch (error) { if (errorCode(error) !== "EEXIST") throw error; }
  }
  if (!destination) throw new MigrateError("no free .rejected name", "REJECTED-EXISTS");
  const linked = fs.lstatSync(destination);
  const now = fs.lstatSync(target);
  if (linked.dev !== expected.dev || linked.ino !== expected.ino || now.dev !== expected.dev || now.ino !== expected.ino) {
    try { fs.unlinkSync(destination); } catch { /* the link is ours; best effort */ }
    throw new MigrateError(`${CONFIG_FILE} changed before it could be moved aside`, "CHANGED");
  }
  fs.unlinkSync(target);
  return path.relative(base, destination);
}

/** Fresh Node/Bun process re-parses the on-disk file with the on-disk reader; the running module's cache is not trusted. */
function revalidate(base: string, expectedModelSha: string, deps: RuntimeDeps): string | undefined {
  const script = decodeURIComponent(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
  const invocation = workflowInvocation(deps, [script, "--verify", "--root", base], { timeoutMs: 30000 });
  let result: ReturnType<RuntimeDeps["child"]["runSync"]>;
  try { result = deps.child.runSync(invocation.command, invocation.args, invocation.options); }
  catch (error) { return `subprocess could not start: ${String(errorCode(error))}`; }
  if (result.status !== 0) return `subprocess re-parse exited ${String(result.status)}`;
  try {
    const parsed: unknown = JSON.parse(result.stdout);
    if (!isRecord(parsed) || parsed.ok !== true) return "subprocess re-parse reported problems";
    if (parsed.modelSha256 !== expectedModelSha) return "subprocess parsed-model digest differs from the in-process digest";
  } catch { return "subprocess re-parse output was not JSON"; }
  return undefined;
}

// ---- migration ------------------------------------------------------------------------------------------------

function entry(path: string, status: EntryMigration["status"], action: MigrationAction, reason?: string): ConfigMigration {
  return reason === undefined ? { path, status, action } : { path, status, action, reason };
}

export function migrate(root: string, options: MigrateOptions, deps: RuntimeDeps): MigrationOutcome {
  const { fs, path } = deps;
  const results: ConfigMigration[] = [];
  const fail = (exitCode: number, notes: string[] = []): MigrationOutcome => ({ exitCode, results, notes });
  let base: string;
  try { base = fs.realpathSync(root); }
  catch { results.push(entry(root, "manual", "refuse", "project root does not exist")); return fail(1); }

  const built = buildModel(base, deps);
  if ("error" in built) { results.push(entry(CONFIG_FILE, "manual", "refuse", built.error)); return fail(1); }
  let text: string;
  try { text = emitToon(built.model); }
  catch (error) { results.push(entry(CONFIG_FILE, "manual", "refuse", `transform failed before any write: ${describe(error)}`)); return fail(1, built.notes); }
  const trip = roundTrip(text, deps);
  if ("error" in trip) { results.push(entry(CONFIG_FILE, "manual", "refuse", `transform failed before any write: ${trip.error}`)); return fail(1, built.notes); }
  const bytesSha = deps.crypto.sha256Hex(text);
  const parsedSha = modelHash(trip.model, deps);
  if (parsedSha !== modelHash(built.model, deps)) { results.push(entry(CONFIG_FILE, "manual", "refuse", "transform is not stable: re-parsed model differs from the source model; nothing written")); return fail(1, built.notes); }

  const target = path.join(base, CONFIG_FILE);
  const plan = (): { outcome?: MigrationOutcome; existing: Existing; action: MigrationAction; provenance?: string } => {
    const existing = inspectExisting(base, deps);
    if (existing.kind === "absent") return { existing, action: "write" };
    if (existing.kind === "unsupported") {
      const why = `ai-workflow.toon has an unsupported schemaVersion (${existing.detail}); --force replaces it with a file built from the legacy settings or defaults (its values are not converted); the original is kept in the backup`;
      if (!options.force) return { existing, action: "refuse", outcome: { exitCode: 1, notes: built.notes, results: [entry(CONFIG_FILE, "manual", "refuse", why)] } };
      return { existing, action: "overwrite", provenance: "replaced an unsupported schemaVersion file with one built from legacy settings/defaults (values not converted); original kept in the backup" };
    }
    if (existing.kind === "valid") {
      if (existing.text === text) return { existing, action: "unchanged" };
      if (!options.force) return { existing, action: "refuse", outcome: { exitCode: 1, notes: built.notes, results: [entry(CONFIG_FILE, "manual", "refuse", "valid ai-workflow.toon already exists and differs from the migration; re-run with --force to back it up and replace it")] } };
      const state = readState(base, deps);
      const stale = state !== undefined && state.bytesSha256 === deps.crypto.sha256Hex(existing.text ?? "");
      return { existing, action: "overwrite", provenance: stale ? "matches the bytes this migrator last wrote (stale)" : "differs from the bytes this migrator last wrote (hand-edited or unknown provenance)" };
    }
    if (existing.kind === "invalid") {
      return { existing, action: "reject", outcome: undefined };
    }
    const why = existing.kind === "unregistered" ? `unregistered slot (${existing.detail}); register its validator or remove it` : `unsafe or unreadable (${existing.detail}); resolve it manually`;
    return { existing, action: "refuse", outcome: { exitCode: 1, notes: built.notes, results: [entry(CONFIG_FILE, "manual", "refuse", why)] } };
  };

  const backupNames = (): string[] => built.files.map((file) => file.relative);
  const decided = plan();
  if (!options.apply) {
    if (decided.outcome) return decided.outcome;
    if (decided.action === "unchanged") { results.push(entry(CONFIG_FILE, "applied", "unchanged", "already migrated; canonical bytes match")); return { exitCode: 0, results, toon: text, notes: built.notes }; }
    if (decided.action === "reject") {
      results.push(entry(CONFIG_FILE, "manual", "reject", `unparseable (${decided.existing.detail}); --apply would move it aside as ${CONFIG_FILE}.rejected and write nothing`));
      return { exitCode: 1, results, notes: built.notes };
    }
    for (const name of backupNames()) results.push(entry(name, "ready", "backup", `would back up under ${BACKUP_DIR}/`));
    if (decided.action === "overwrite") results.push(entry(CONFIG_FILE, "ready", "backup", `would back up the existing file (${decided.provenance})`));
    results.push(entry(CONFIG_FILE, "ready", decided.action, "would write the canonical TOON below (legacy files are kept)"));
    return { exitCode: 0, results, toon: text, notes: built.notes };
  }

  const lock = oexLock(target, deps);
  if ("refused" in lock) {
    results.push(entry(CONFIG_FILE, "manual", "refuse", lock.refused.code === errorCodes.oexLockBusy
      ? `${CONFIG_FILE}.lock exists: if no config migration is running, remove that file and re-run`
      : `could not create ${CONFIG_FILE}.lock`));
    return fail(1, built.notes);
  }
  try {
    const locked = plan();
    if (locked.outcome) return locked.outcome;
    const stamp = stampNow(deps);
    const existing = locked.existing;
    if (locked.action === "unchanged") {
      results.push(entry(CONFIG_FILE, "applied", "unchanged", "already migrated; canonical bytes match"));
      return { exitCode: 0, results, toon: text, notes: built.notes };
    }
    if (locked.action === "reject" && existing.stat) {
      try {
        const moved = moveAside(base, existing.stat, stamp, deps);
        results.push(entry(CONFIG_FILE, "manual", "reject", `unparseable (${existing.detail}); moved to ${moved}; fix or discard it, then re-run --apply`));
      } catch (error) {
        results.push(entry(CONFIG_FILE, "manual", "reject", error instanceof MigrateError ? error.message : `could not move the file aside (${describe(error)})`));
      }
      return fail(1, built.notes);
    }

    // Backups first: nothing is written to the target unless every original is safely copied and read back.
    const backupRoot = `${BACKUP_DIR}/${stamp}`;
    const toBackup: LegacyFile[] = [...built.files];
    if (locked.action === "overwrite" && existing.text !== undefined) toBackup.push({ relative: CONFIG_FILE, text: existing.text });
    try {
      const pin = toBackup.length ? ensureDirectory(base, backupRoot, deps) : undefined;
      for (const file of toBackup) {
        const flat = file.relative.replace(/\//g, "__");
        const problem = writeGuarded(path.join(base, backupRoot, flat), file.text, 0o600, deps, pin && { base, pin });
        if (problem) throw new MigrateError(problem, "BACKUP-WRITE");
        // lstat-based read-back (no link following, identity-checked), then the parent pin once more.
        const back = readSafe(base, `${backupRoot}/${flat}`, Math.max(MAX_LEGACY_BYTES, file.text.length * 4 + 16), deps);
        if (back.state !== "ok" || back.text !== file.text) throw new MigrateError("backup read-back differs", "BACKUP-READBACK");
        if (pin) assertPinned(base, pin, deps);
        results.push(entry(file.relative, "applied", "backup", `${backupRoot}/${flat}`));
      }
    } catch (error) {
      results.push(entry(BACKUP_DIR, "manual", "backup", `backup failed, nothing written to ${CONFIG_FILE}: ${describe(error)}`));
      return fail(1, built.notes);
    }

    // dev/ino + bytes re-check immediately before the rename, as the pre-write half of the pin.
    const before = inspectExisting(base, deps);
    if (locked.action === "write" ? before.kind !== "absent"
      : before.kind !== existing.kind || before.stat?.dev !== existing.stat?.dev || before.stat?.ino !== existing.stat?.ino || before.text !== existing.text) {
      results.push(entry(CONFIG_FILE, "manual", "refuse", `${CONFIG_FILE} changed after it was inspected; nothing written`));
      return fail(1, built.notes);
    }
    const problem = writeGuarded(target, text, 0o644, deps);
    if (problem) { results.push(entry(CONFIG_FILE, "manual", "refuse", `write failed: ${problem}`)); return fail(1, built.notes); }

    // Post-write: path pin, canonical-bytes digest, parsed-model digest, then the subprocess re-parse.
    const failure = ((): string | undefined => {
      try {
        const location = inspectPath(base, deps);
        if ("status" in location) return location.text ?? "config path refused after write";
        if (existing.stat && location.stat.dev === existing.stat.dev && location.stat.ino === existing.stat.ino) return "destination inode did not change";
        const read = readBoundedFile(location, deps);
        if ("status" in read) return read.text ?? "config file refused after write";
        if (deps.crypto.sha256Hex(read.text) !== bytesSha) return "canonical-bytes digest of the file on disk differs from what was written";
        const loaded = loadConfig(base, deps);
        if ("status" in loaded || loaded.problems.length) return "written file does not parse cleanly";
        if (modelHash(loaded.model, deps) !== parsedSha) return "parsed-model digest of the file on disk differs";
        return revalidate(base, parsedSha, deps);
      } catch (error) { return `verification error (${describe(error)})`; }
    })();
    if (failure !== undefined) {
      const notes = [...built.notes];
      try {
        const placed = fs.lstatSync(target);
        const aside = placed.isSymbolicLink() || !placed.isFile() ? undefined : moveAside(base, placed, stamp, deps);
        if (aside) notes.push(`rejected output kept at ${aside}`);
        if (locked.action === "overwrite" && existing.text !== undefined) {
          const restore = writeGuarded(target, existing.text, 0o644, deps);
          notes.push(restore ? `could not restore the previous file: ${restore}` : "previous file restored");
        }
      } catch (error) { notes.push(`rollback incomplete: ${describe(error)}`); }
      results.push(entry(CONFIG_FILE, "manual", "revalidate", `post-write verification failed: ${failure}`));
      return fail(1, notes);
    }
    results.push(entry(CONFIG_FILE, "applied", locked.action, locked.provenance ?? "written; legacy files are kept (retirement is a later step)"));
    results.push(entry(CONFIG_FILE, "applied", "revalidate", "fresh-process re-parse matched the parsed-model digest"));

    // dual-hash record: canonical-bytes-written + parsed-model-as-read. --force compares disk bytes to the first only.
    try {
      const pin = ensureDirectory(base, BACKUP_DIR, deps);
      const record: WrittenState = { schemaVersion: 1, bytesSha256: bytesSha, modelSha256: parsedSha, writtenAt: new Date(deps.clock.now()).toISOString() };
      const recordProblem = writeGuarded(path.join(base, STATE_FILE), `${JSON.stringify(record, null, 2)}\n`, 0o600, deps, { base, pin });
      if (recordProblem) throw new MigrateError(recordProblem, "STATE-WRITE");
    } catch (error) {
      results.push(entry(STATE_FILE, "manual", "write", `could not record the dual-hash state: ${describe(error)}`));
    }
    results.push(...ignoreLine(base, deps));
    const exitCode = results.some((item) => item.status === "manual") ? 1 : 0;
    return { exitCode, results, toon: text, notes: built.notes };
  } finally {
    lock.release();
  }
}

/** Appends `ai-workflow.toon` and the backup directory to an existing target `.gitignore`; never creates one and never follows a symlink. */
function ignoreLine(base: string, deps: RuntimeDeps): ConfigMigration[] {
  const reading = readSafe(base, ".gitignore", MAX_GITIGNORE_BYTES, deps);
  const wanted = [CONFIG_FILE, `${BACKUP_DIR}/`];
  if (reading.state === "absent") return [entry(".gitignore", "ready", "ignore", `no .gitignore; add "${CONFIG_FILE}" and "${BACKUP_DIR}/" yourself if they should stay local`)];
  if (reading.state === "refused") return [entry(".gitignore", "manual", "ignore", `${reading.reason}; add "${CONFIG_FILE}" and "${BACKUP_DIR}/" manually`)];
  const normalised = new Set(reading.text.split(/\r?\n/).map((line) => line.trim().replace(/^\//, "").replace(/\/$/, "")));
  const missing = wanted.filter((line) => !normalised.has(line.replace(/\/$/, "")));
  if (!missing.length) return [entry(".gitignore", "applied", "ignore", "already ignored")];
  const next = `${reading.text}${reading.text === "" || reading.text.endsWith("\n") ? "" : "\n"}${missing.join("\n")}\n`;
  const problem = writeGuarded(deps.path.join(base, ".gitignore"), next, reading.stat.mode & 0o777, deps);
  return [problem ? entry(".gitignore", "manual", "ignore", `could not append: ${problem}`) : entry(".gitignore", "applied", "ignore", `appended ${missing.join(", ")}`)];
}

// ---- CLI ------------------------------------------------------------------------------------------------------

function verify(root: string, deps: RuntimeDeps): number {
  const loaded = loadConfig(root, deps);
  if ("status" in loaded) { deps.io.stdout.write(`${JSON.stringify({ ok: false, code: loaded.code ?? loaded.status })}\n`); return 1; }
  const ok = loaded.problems.length === 0;
  deps.io.stdout.write(`${JSON.stringify({ ok, modelSha256: modelHash(loaded.model, deps), problems: loaded.problems.map((item) => item.code) })}\n`);
  return ok ? 0 : 1;
}

export function main(argv: string[], deps: RuntimeDeps): number {
  let root = deps.proc.cwd();
  const flags = new Set<string>();
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === "--root") {
      const value = argv[++index];
      if (!value || value.startsWith("--") || flags.has("--root")) { deps.io.stderr.write(`${USAGE}\n`); return 2; }
      root = value;
      flags.add("--root");
    } else if (["--dry-run", "--apply", "--force", "--json", "--verify"].includes(flag) && !flags.has(flag)) flags.add(flag);
    else { deps.io.stderr.write(`${USAGE}\n`); return 2; }
  }
  if (flags.has("--dry-run") && flags.has("--apply")) { deps.io.stderr.write(`${USAGE}\n`); return 2; }
  if (flags.has("--verify")) return flags.size === 2 && flags.has("--root") ? verify(root, deps) : (deps.io.stderr.write(`${USAGE}\n`), 2);
  const apply = flags.has("--apply");
  let outcome: MigrationOutcome;
  try { outcome = migrate(root, { apply, force: flags.has("--force") }, deps); }
  catch (error) { deps.io.stderr.write(`config-migrate: ${describe(error)}\n`); return 1; }
  if (flags.has("--json")) {
    deps.io.stdout.write(`${JSON.stringify({ mode: apply ? "apply" : "dry-run", exitCode: outcome.exitCode, results: outcome.results, notes: outcome.notes, toon: apply ? undefined : outcome.toon }, null, 2)}\n`);
    return outcome.exitCode;
  }
  const lines = [`config-migrate ${apply ? "--apply" : "--dry-run"}`];
  for (const item of outcome.results) lines.push(`${item.status} ${item.action} ${item.path}${item.reason ? `: ${item.reason}` : ""}`);
  for (const note of outcome.notes) lines.push(`note: ${note}`);
  if (!apply && outcome.toon !== undefined) lines.push("--- ai-workflow.toon (not written) ---", outcome.toon.trimEnd());
  deps.io.stdout.write(`${lines.join("\n")}\n`);
  return outcome.exitCode;
}

runDirect(import.meta.url, main);
