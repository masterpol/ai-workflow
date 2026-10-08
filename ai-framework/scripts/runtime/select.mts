import { loadDotenv } from "./env.mts";
import { createNodeDeps } from "./node.mts";
import type { RunnerName, RuntimeDeps } from "./types.mts";

export const RUNNER_VAR = "AI_WORKFLOW_RUNNER";

/** Unset or empty selects Node. `bun` selects Bun. Anything else is a configuration error. */
export function resolveRunner(env: Record<string, string | undefined>): RunnerName {
  const value = env[RUNNER_VAR]?.trim().toLowerCase();
  if (value === undefined || value === "" || value === "node") return "node";
  if (value === "bun") return "bun";
  throw new Error(`${RUNNER_VAR} must be "bun" or unset; got ${JSON.stringify(String(env[RUNNER_VAR]).slice(0, 40))}`);
}

/**
 * `root` must be the trusted project root (never the cwd of untrusted content). The project `.env` is read only to
 * choose the runner: none of its other variables (API keys, NODE_OPTIONS, GIT_*) ever reach `deps.proc.env`
 * or the children a script starts.
 */
export async function selectRuntime(root: string, env: Record<string, string | undefined> = process.env): Promise<RuntimeDeps> {
  const boot = createNodeDeps(env);
  const merged = loadDotenv(boot.fs, boot.path, root, { [RUNNER_VAR]: env[RUNNER_VAR] });
  if (resolveRunner(merged) === "node") return createNodeDeps(env);
  const { createBunDeps } = await import("./bun.mts");
  return createBunDeps(env);
}
