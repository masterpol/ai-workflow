import { runDirect } from "../../scripts/runtime/cli.mts";
import { orcaMultiAgentEnabled } from "../../scripts/runtime/select.mts";
import type { RuntimeDeps } from "../../scripts/runtime/types.mts";

const PHASES = new Set(["shape", "shape-lite", "critique", "plan", "build", "audit", "ship", "cooldown", "fix", "resume", "switch", "checkpoint"]);
const DEADLINE_MS = 5000;
const DECISION_MS = 4000;
const MAX_INPUT_BYTES = 64 * 1024;
type ObjectValue = Record<string, unknown>;
const object = (value: unknown): value is ObjectValue => value !== null && typeof value === "object" && !Array.isArray(value);
const blockedLine = (reason: string): string => `Orca requested but not ready: ${reason}. Fix it, or re-invoke with orca=normal to run this phase without Orca.\n`;

/** The trusted root is the command's own `--root` argument, never hook payload data. */
function rootArgument(argv: string[]): string | undefined {
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === "--root") return argv[index + 1];
    if (argv[index].startsWith("--root=")) return argv[index].slice("--root=".length);
  }
  return undefined;
}

/** Only a leading `/phase` or `$phase` token starts a workflow phase; arguments stay untouched. */
function leadingPhase(prompt: string): { phase: string; argsText: string } | undefined {
  const token = /^[/$]([^\s]*)/u.exec(prompt);
  if (!token || !PHASES.has(token[1])) return undefined;
  return { phase: token[1], argsText: prompt.slice(token[0].length) };
}

/** Only opted-in Codex phase prompts load the start decision library. */
export async function main(argv: string[], deps: RuntimeDeps): Promise<number> {
  const given = rootArgument(argv);
  const root = given || deps.proc.cwd();
  if (!orcaMultiAgentEnabled(root, deps)) return 0;
  const end = deps.clock.perfNowMs() + DEADLINE_MS;
  const timer = setTimeout(() => {
    deps.io.stderr.write(blockedLine("timeout"));
    deps.proc.exit(2);
  }, DEADLINE_MS);
  const block = (reason: string): number => { deps.io.stderr.write(blockedLine(reason)); return 2; };
  try {
    let value: unknown;
    try { value = JSON.parse(await deps.io.stdin.readText(MAX_INPUT_BYTES)) as unknown; }
    catch { return block("invalid-hook-input"); }
    if (!object(value)) return block("invalid-hook-input");
    if (value.hook_event_name !== "UserPromptSubmit") return 0;
    if (typeof value.prompt !== "string") return block("invalid-hook-input");
    const match = leadingPhase(value.prompt);
    if (!match) return 0;
    if (!given || !deps.path.isAbsolute(given)) return block("invalid-root");
    try { if (!deps.fs.statSync(given).isDirectory()) return block("invalid-root"); }
    catch { return block("invalid-root"); }
    const { decideStart } = await import("../../scripts/orca-start.mts");
    const remaining = Math.floor(end - deps.clock.perfNowMs());
    if (remaining < 1) return block("timeout");
    const decision = decideStart({ root: given, phase: match.phase, vendor: "codex", argsText: match.argsText,
      deps, deadlineMs: Math.min(DECISION_MS, remaining) });
    // Synchronous probes cannot yield to the timer; check elapsed time before any success output.
    if (deps.clock.perfNowMs() >= end) return block("timeout");
    if (decision.state === "blocked") { deps.io.stderr.write(decision.line + "\n"); return 2; }
    if (decision.state === "ready" || decision.state === "bypassed") {
      deps.io.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: decision.line } }) + "\n");
    }
    return 0;
  } catch { return block("internal"); }
  finally { clearTimeout(timer); }
}

runDirect(import.meta.url, main);
