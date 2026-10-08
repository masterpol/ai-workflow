import { loadWorkflowEnv } from "./env.mts";
import { createNodeDeps } from "./node.mts";
import type { RunnerName, RuntimeDeps } from "./types.mts";

export const RUNNER_VAR = "AI_WORKFLOW_RUNNER";
export const ORCA_MULTI_AGENT_VAR = "AI_WORKFLOW_ORCA_MULTI_AGENT";

/**
 * Orca multi-agent work is used only when this is exactly `true` (case-insensitive). Unset, `false`, empty or any other
 * value keeps the normal workflow. A process environment value wins over the project `ai_workflow_env.json`, which is read from the
 * trusted `root` for this one key only. The secret-bearing `.env` is never read.
 */
export function orcaMultiAgentEnabled(root: string, deps: RuntimeDeps, env: Record<string, string | undefined> = deps.proc.env): boolean {
  try {
    const merged = loadWorkflowEnv(deps.fs, deps.path, root, { [ORCA_MULTI_AGENT_VAR]: env[ORCA_MULTI_AGENT_VAR] });
    return merged[ORCA_MULTI_AGENT_VAR]?.trim().toLowerCase() === "true";
  } catch { return false; }
}

/** Unset or empty selects Node. `bun` selects Bun. Anything else is a configuration error. */
export function resolveRunner(env: Record<string, string | undefined>): RunnerName {
  const value = env[RUNNER_VAR]?.trim().toLowerCase();
  if (value === undefined || value === "" || value === "node") return "node";
  if (value === "bun") return "bun";
  throw new Error(`${RUNNER_VAR} must be "bun" or unset; got ${JSON.stringify(String(env[RUNNER_VAR]).slice(0, 40))}`);
}

/**
 * `root` must be the trusted project root (never the cwd of untrusted content). The project `ai_workflow_env.json` is read only to
 * choose the runner and the Orca switch: no other key in it ever reaches `deps.proc.env`
 * or the children a script starts.
 */
export async function selectRuntime(root: string, env: Record<string, string | undefined> = process.env): Promise<RuntimeDeps> {
  const boot = createNodeDeps(env);
  const merged = loadWorkflowEnv(boot.fs, boot.path, root, { [RUNNER_VAR]: env[RUNNER_VAR] });
  const runner = resolveRunner(merged);
  const selectedEnv = { ...env, [RUNNER_VAR]: runner };
  if (runner === "node") return createNodeDeps(selectedEnv);
  const { createBunDeps } = await import("./bun.mts");
  return createBunDeps(selectedEnv);
}
