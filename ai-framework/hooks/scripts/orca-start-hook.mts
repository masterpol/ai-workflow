import { runDirect } from "../../scripts/runtime/cli.mts";
import { orcaMultiAgentEnabled } from "../../scripts/runtime/select.mts";
import type { RuntimeDeps } from "../../scripts/runtime/types.mts";

const PHASES = new Set(["shape", "shape-lite", "critique", "plan", "build", "audit", "ship", "cooldown", "fix", "resume", "switch", "checkpoint"]);
const DEADLINE_MS = 5000;
type ObjectValue = Record<string, unknown>;
const object = (value: unknown): value is ObjectValue => value !== null && typeof value === "object" && !Array.isArray(value);
const blockedLine = (reason: string): string => `Orca requested but not ready: ${reason}. Fix it, or re-invoke with orca=normal to run this phase without Orca.\n`;

/** Only opted-in coordinator phase invocations load the start decision library. */
export async function main(_argv: string[], deps: RuntimeDeps): Promise<number> {
  const root = deps.proc.env.CLAUDE_PROJECT_DIR || deps.proc.cwd();
  if (!orcaMultiAgentEnabled(root, deps)) return 0;
  const end = deps.clock.perfNowMs() + DEADLINE_MS;
  const timer = setTimeout(() => {
    deps.io.stderr.write(blockedLine("timeout"));
    deps.proc.exit(2);
  }, DEADLINE_MS);
  const block = (reason: string): number => { deps.io.stderr.write(blockedLine(reason)); return 2; };
  try {
    let value: unknown;
    try { value = JSON.parse(await deps.io.stdin.readText(64 * 1024)) as unknown; }
    catch { return block("invalid-hook-input"); }
    if (!object(value)) return block("invalid-hook-input");
    if (value.agent_id !== undefined) return 0;
    let phase: unknown;
    let argsText: unknown;
    const event = value.hook_event_name;
    if (event === "PreToolUse") {
      if (value.tool_name !== "Skill") return 0;
      if (!object(value.tool_input)) return block("invalid-hook-input");
      phase = value.tool_input.skill;
      argsText = value.tool_input.args;
    } else if (event === "UserPromptExpansion") {
      if (value.expansion_type !== "slash_command") return 0;
      phase = value.command_name;
      argsText = value.command_args;
    } else return 0;
    if (typeof phase !== "string") return block("invalid-hook-input");
    if (!PHASES.has(phase)) return 0;
    if (argsText !== undefined && typeof argsText !== "string") return block("invalid-hook-input");
    const { decideStart } = await import("../../scripts/orca-start.mts");
    const remaining = Math.floor(end - deps.clock.perfNowMs());
    if (remaining < 1) return block("timeout");
    const decision = decideStart({ root, phase, vendor: "claude", argsText,
      deps, deadlineMs: Math.min(4000, remaining) });
    // Synchronous probes cannot yield to the timer; check elapsed time before any success output.
    if (deps.clock.perfNowMs() >= end) return block("timeout");
    if (decision.state === "blocked") { deps.io.stderr.write(decision.line + "\n"); return 2; }
    if (decision.state === "ready" || decision.state === "bypassed") {
      deps.io.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: decision.line } }) + "\n");
    }
    return 0;
  } catch { return block("internal"); }
  finally { clearTimeout(timer); }
}

runDirect(import.meta.url, main);
