import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadWorkflowEnv } from "./env.mts";
import { createNodeDeps } from "./node.mts";
import { resolveRunner } from "./select.mts";
import type { RunResult, RuntimeDeps, SpawnOptions } from "./types.mts";

/** Child commands support Node 22.12–22.17 with type stripping disabled by default. */
export const NODE_FLAGS = ["--experimental-strip-types", "--disable-warning=ExperimentalWarning"];

/** Child runner choice follows the effective spawn environment, not the parent executable. */
export function workflowInvocation(deps: RuntimeDeps, args: string[], options: SpawnOptions = {}): { command: string; args: string[]; options: SpawnOptions } {
  const env = options.env ?? deps.proc.env;
  const declared = env.AI_WORKFLOW_RUNNER ?? deps.proc.env.AI_WORKFLOW_RUNNER;
  const runner = declared === undefined ? deps.runtime : resolveRunner({ AI_WORKFLOW_RUNNER: declared });
  const current = deps.proc.versions ? (deps.proc.versions.bun ? "bun" : "node") : deps.runtime;
  const command = runner === current ? deps.proc.execPath : runner;
  const rest = [...args];
  while (NODE_FLAGS.includes(rest[0])) rest.shift();
  if (runner === "bun" && rest[0] === "--test") rest[0] = "test";
  return { command, args: runner === "node" ? [...NODE_FLAGS, ...rest] : rest,
    options: { ...options, env: { ...env, AI_WORKFLOW_RUNNER: runner } } };
}

export function runWorkflowSync(deps: RuntimeDeps, args: string[], options: SpawnOptions = {}): RunResult {
  const invocation = workflowInvocation(deps, args, options);
  return deps.child.runSync(invocation.command, invocation.args, invocation.options);
}

export function runWorkflow(deps: RuntimeDeps, args: string[], options: SpawnOptions = {}): Promise<RunResult> {
  const invocation = workflowInvocation(deps, args, options);
  return deps.child.run(invocation.command, invocation.args, invocation.options);
}

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
  const selected = loadWorkflowEnv(deps.fs, deps.path, inferRoot(script), { AI_WORKFLOW_RUNNER: env.AI_WORKFLOW_RUNNER });
  return { ...env, AI_WORKFLOW_RUNNER: selected.AI_WORKFLOW_RUNNER };
}

export function readRunner(root: string, env: Record<string, string | undefined>, deps: RuntimeDeps = createNodeDeps(env)): "node" | "bun" {
  return resolveRunner(loadWorkflowEnv(deps.fs, deps.path, root, env));
}
