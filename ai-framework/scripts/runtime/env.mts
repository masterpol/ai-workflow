import type { FsDeps } from "./types.mts";
import type nodePath from "node:path";

/** Project-root file that carries the workflow settings. It holds no secrets, so agents may read and edit it. */
export const WORKFLOW_ENV_FILE = "ai_workflow_env.json";
export const WORKFLOW_ENV_MAX_BYTES = 64 * 1024;
/** The only keys read from the file; anything else in it is ignored and never reaches a child process. */
export const WORKFLOW_ENV_KEYS: readonly string[] = Object.freeze(["AI_WORKFLOW_RUNNER", "AI_WORKFLOW_ORCA_MULTI_AGENT"]);

/**
 * Reads `<root>/ai_workflow_env.json` for a trusted, caller-supplied project root only: a flat JSON object whose
 * allowlisted keys hold a string or boolean. A file that is missing, malformed, not a regular file, oversize, or that
 * resolves outside the real root (symlink) contributes nothing. Variables already in `env` win. The secret-bearing
 * `.env` is never read.
 */
export function loadWorkflowEnv(
  fs: Pick<FsDeps, "existsSync" | "readFileSync" | "realpathSync" | "statSync">,
  path: typeof nodePath,
  root: string,
  env: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const file = path.join(root, WORKFLOW_ENV_FILE);
  const values: Record<string, string> = {};
  try {
    if (!fs.existsSync(file)) return { ...env };
    const relative = path.relative(fs.realpathSync(root), fs.realpathSync(file));
    if (relative.startsWith("..") || path.isAbsolute(relative)) return { ...env };
    // Only a regular file of bounded size is read: a FIFO would block, a directory throws.
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > WORKFLOW_ENV_MAX_BYTES) return { ...env };
    const parsed: unknown = JSON.parse(fs.readFileSync(file));
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

export interface WorkflowEnvReport {
  status: "missing" | "valid" | "invalid" | "refused";
  values: Record<string, string>;
  ignoredKeys: string[];
  problems: string[];
}

/** Read-only diagnosis of the settings file for the doctor: what would be used, and why anything would be ignored. */
export function inspectWorkflowEnv(
  fs: Pick<FsDeps, "existsSync" | "readFileSync" | "realpathSync" | "statSync">,
  path: typeof nodePath,
  root: string,
): WorkflowEnvReport {
  const report: WorkflowEnvReport = { status: "missing", values: {}, ignoredKeys: [], problems: [] };
  const file = path.join(root, WORKFLOW_ENV_FILE);
  try {
    if (!fs.existsSync(file)) return report;
    const relative = path.relative(fs.realpathSync(root), fs.realpathSync(file));
    if (relative.startsWith("..") || path.isAbsolute(relative)) return { ...report, status: "refused", problems: ["resolves outside the project root"] };
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > WORKFLOW_ENV_MAX_BYTES) return { ...report, status: "refused", problems: ["not a regular file of at most 64 KiB"] };
    const parsed: unknown = JSON.parse(fs.readFileSync(file));
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
