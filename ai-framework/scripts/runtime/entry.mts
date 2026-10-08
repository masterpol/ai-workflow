import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadDotenv } from "./env.mts";
import { createNodeDeps } from "./node.mts";
import { resolveRunner } from "./select.mts";
import type { RuntimeDeps } from "./types.mts";

/** Child commands support Node 22.12–22.17 with type stripping disabled by default. */
export const NODE_FLAGS = ["--experimental-strip-types", "--disable-warning=ExperimentalWarning"];

export function inferRoot(script: string): string {
  const directory = path.dirname(script);
  return path.resolve(directory, path.basename(directory) === "scripts" && path.basename(path.dirname(directory)) === "hooks" ? "../../.." : "../..");
}

/** Importing a command as a library never starts it, including through a symlinked project path. */
export function isDirect(moduleUrl: string, deps: RuntimeDeps = createNodeDeps()): boolean {
  const invoked = process.argv[1];
  if (!invoked) return false;
  try { return deps.fs.realpathSync(invoked) === deps.fs.realpathSync(fileURLToPath(moduleUrl)); }
  catch { return pathToFileURL(path.resolve(invoked)).href === moduleUrl; }
}

export function runnerEnvironment(script: string, env: Record<string, string | undefined>, deps: RuntimeDeps = createNodeDeps(env)): Record<string, string | undefined> {
  const selected = loadDotenv(deps.fs, deps.path, inferRoot(script), { AI_WORKFLOW_RUNNER: env.AI_WORKFLOW_RUNNER });
  return { ...env, AI_WORKFLOW_RUNNER: selected.AI_WORKFLOW_RUNNER };
}

export function readRunner(root: string, env: Record<string, string | undefined>, deps: RuntimeDeps = createNodeDeps(env)): "node" | "bun" {
  return resolveRunner(loadDotenv(deps.fs, deps.path, root, env));
}
