import { loadConfig } from "./config.mts";
import type { FsDeps, RuntimeDeps } from "./types.mts";
import type nodePath from "node:path";

/** Project-root file that carries the workflow settings. It holds no secrets, so agents may read and edit it. */
export const WORKFLOW_ENV_FILE = "ai_workflow_env.json";
export const WORKFLOW_ENV_MAX_BYTES = 64 * 1024;
/** The only keys read from the file; anything else in it is ignored and never reaches a child process. */
export const WORKFLOW_ENV_KEYS: readonly string[] = Object.freeze(["AI_WORKFLOW_RUNNER", "AI_WORKFLOW_ORCA_MULTI_AGENT"]);

export type LegacyRead = { status: "missing" } | { status: "refused"; reason: string } | { status: "ok"; text: string };
type LegacyFs = Pick<FsDeps, "constants" | "realpathSync" | "lstatSync" | "openSync" | "fstatSync" | "closeSync" | "readSync">;

/**
 * Pinned, bounded reader for the legacy JSON fallbacks (`ai_workflow_env.json`, `.project/modes.json`). The leaf may not
 * be a symlink, must resolve inside the real root, is opened O_NOFOLLOW|O_NONBLOCK (a FIFO cannot hang it), must be the
 * same dev/ino as inspected, and is read through a hard cap of WORKFLOW_ENV_MAX_BYTES, never trusting stat size.
 * Never throws: every failure is a `refused` result (a plain absent file is `missing`).
 */
export function readLegacyFile(fs: LegacyFs, path: typeof nodePath, root: string, relative: string): LegacyRead {
  const refuse = (reason: string): LegacyRead => ({ status: "refused", reason });
  let descriptor: number | undefined;
  try {
    const base = fs.realpathSync(root);
    const file = path.join(base, relative);
    let before;
    try { before = fs.lstatSync(file); }
    catch (error) {
      const code = error !== null && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
      return code === "ENOENT" || code === "ENOTDIR" ? { status: "missing" } : refuse("unreadable");
    }
    if (before.isSymbolicLink()) return refuse("is a symlink");
    const inside = path.relative(base, fs.realpathSync(file));
    if (inside.startsWith("..") || path.isAbsolute(inside)) return refuse("resolves outside the project root");
    if (!before.isFile()) return refuse("not a regular file");
    if (before.size > WORKFLOW_ENV_MAX_BYTES) return refuse("larger than 64 KiB");
    descriptor = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
    const opened = fs.fstatSync(descriptor);
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) return refuse("changed between inspect and open");
    const buffer = new Uint8Array(WORKFLOW_ENV_MAX_BYTES + 1);
    let size = 0;
    while (size < buffer.length) {
      const count = fs.readSync(descriptor, buffer, size, buffer.length - size, null);
      if (!count) break;
      size += count;
    }
    if (size > WORKFLOW_ENV_MAX_BYTES) return refuse("larger than 64 KiB");
    return { status: "ok", text: new TextDecoder("utf-8", { ignoreBOM: true }).decode(buffer.subarray(0, size)) };
  } catch {
    return refuse("unreadable");
  } finally {
    if (descriptor !== undefined) { try { fs.closeSync(descriptor); } catch { /* already closed */ } }
  }
}

/**
 * Reads `<root>/ai_workflow_env.json` for a trusted, caller-supplied project root only: a flat JSON object whose
 * allowlisted keys hold a string or boolean. A file that is missing, malformed, not a regular file, oversize, or that
 * resolves outside the real root (symlink) contributes nothing. Variables already in `env` win. The secret-bearing
 * `.env` is never read.
 */
export function loadWorkflowEnv(
  fs: LegacyFs,
  path: typeof nodePath,
  root: string,
  env: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const values: Record<string, string> = {};
  try {
    const read = readLegacyFile(fs, path, root, WORKFLOW_ENV_FILE);
    if (read.status !== "ok") return { ...env };
    const parsed: unknown = JSON.parse(read.text);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return { ...env };
    for (const key of WORKFLOW_ENV_KEYS) {
      if (!Object.hasOwn(parsed, key)) continue;
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === "string" || typeof value === "boolean") values[key] = String(value);
    }
  } catch {
    return { ...env }; // an unreadable or malformed file contributes nothing
  }
  const merged: Record<string, string | undefined> = { ...values };
  for (const [key, value] of Object.entries(env)) if (value !== undefined) merged[key] = value;
  return merged;
}

/**
 * TOON-first reader behind the frozen `loadWorkflowEnv` shape. `<root>/ai-workflow.toon` (read through `loadConfig`)
 * wins when it is present and valid; a missing file falls back to the legacy `ai_workflow_env.json` reader.
 * X11_no_remove: the legacy fallback stays for one minor (legacy window); the next minor removes the legacy env reader
 * (`loadWorkflowEnv`) and this fallback together. Never remove it inside this window. A present but refused or invalid TOON file contributes nothing (fail closed, never the
 * legacy file). Variables already in `env` win.
 */
export function loadConfigEnv(
  fs: LegacyFs,
  path: typeof nodePath,
  root: string,
  env: Record<string, string | undefined>,
): Record<string, string | undefined> {
  let result: ReturnType<typeof loadConfig>;
  try { result = loadConfig(root, { fs, path } as unknown as RuntimeDeps); }
  catch { return { ...env }; } // a throw is a refusal, never a reason to widen to the legacy file
  if ("status" in result) return result.status === "missing" ? loadWorkflowEnv(fs, path, root, env) : { ...env };
  if (result.problems.length > 0) return { ...env };
  const merged: Record<string, string | undefined> = {
    AI_WORKFLOW_RUNNER: result.model.runtime.runner,
    AI_WORKFLOW_ORCA_MULTI_AGENT: String(result.model.integrations.orca.multiAgent),
  };
  for (const [key, value] of Object.entries(env)) if (value !== undefined) merged[key] = value;
  return merged;
}

export interface WorkflowEnvReport {
  status: "missing" | "valid" | "invalid" | "refused";
  values: Record<string, string>;
  ignoredKeys: string[];
  problems: string[];
}

/** Read-only diagnosis of the settings file for the doctor: what would be used, and why anything would be ignored. */
export function inspectWorkflowEnv(
  fs: LegacyFs,
  path: typeof nodePath,
  root: string,
): WorkflowEnvReport {
  const report: WorkflowEnvReport = { status: "missing", values: {}, ignoredKeys: [], problems: [] };
  try {
    const read = readLegacyFile(fs, path, root, WORKFLOW_ENV_FILE);
    if (read.status === "missing") return report;
    if (read.status === "refused") return { ...report, status: "refused", problems: [read.reason] };
    const parsed: unknown = JSON.parse(read.text);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return { ...report, status: "invalid", problems: ["must be a JSON object"] };
    report.status = "valid";
    for (const key of Object.keys(parsed)) if (!WORKFLOW_ENV_KEYS.includes(key)) report.ignoredKeys.push(key);
    for (const key of WORKFLOW_ENV_KEYS) {
      if (!Object.hasOwn(parsed, key)) continue;
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === "string" || typeof value === "boolean") report.values[key] = String(value);
      else report.problems.push(`${key} must be a string or boolean`);
    }
    const runner = report.values.AI_WORKFLOW_RUNNER?.trim().toLowerCase();
    if (runner !== undefined && runner !== "" && runner !== "node" && runner !== "bun") report.problems.push('AI_WORKFLOW_RUNNER must be "node" or "bun"');
    if (report.problems.length) report.status = "invalid";
  } catch {
    return { ...report, status: "invalid", problems: ["unreadable or not valid JSON"] };
  }
  return report;
}
