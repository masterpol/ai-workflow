import { fileURLToPath, pathToFileURL } from "node:url";

import { selectRuntime } from "./select.mts";
import type { ScriptMain } from "./types.mts";
import { createNodeDeps } from "./node.mts";
import { inferRoot, isDirect, runnerEnvironment } from "./entry.mts";
import { resolveRunner } from "./select.mts";

/** Select the runner before constructing Bun dependencies in a direct command. */
export async function execute(script: string, argv: string[], main: ScriptMain, env: Record<string, string | undefined> = process.env): Promise<number> {
  const boot = createNodeDeps(env);
  const merged = runnerEnvironment(script, env, boot);
  if (resolveRunner(merged) === "bun" && !process.versions.bun) {
    try {
      const result = boot.child.runSync("bun", [script, ...argv], { stdio: "inherit", env: merged });
      if (result.signal) boot.proc.kill(boot.proc.pid, result.signal);
      return result.status ?? 1;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") throw new Error('AI_WORKFLOW_RUNNER=bun but "bun" was not found on PATH');
      throw error;
    }
  }
  const deps = await selectRuntime(inferRoot(script), env);
  deps.proc.argv = argv;
  return await main(argv, deps);
}

/** A library import has no CLI side effects. Each executable calls this once. */
export function runDirect(moduleUrl: string, main: ScriptMain): void {
  if (!isDirect(moduleUrl)) return;
  execute(fileURLToPath(moduleUrl), process.argv.slice(2), main).then(
    (code) => { process.exitCode = code; },
    (error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; },
  );
}

/** Runs `<root>/ai-framework/scripts/<name>.mts` with the runtime chosen by AI_WORKFLOW_RUNNER. Returns the exit code. */
export async function runCli(script: string, argv: string[], env: Record<string, string | undefined> = process.env): Promise<number> {
  const mod = (await import(pathToFileURL(script).href)) as { main?: ScriptMain };
  if (typeof mod.main !== "function") throw new Error(`${script} does not export main(argv, deps)`);
  return await execute(script, argv, mod.main, env);
}

// Direct execution: `node --experimental-strip-types cli.mts <script.mts> [args...]` or `bun cli.mts ...`.
if (isDirect(import.meta.url)) {
  const [script, ...rest] = process.argv.slice(2);
  runCli(script, rest).then(
    (code) => { process.exitCode = code; },
    (error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; },
  );
}
