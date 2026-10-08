import { runDirect } from "../../scripts/runtime/cli.mts";
import type { RuntimeDeps } from "../../scripts/runtime/types.mts";

/** Portable reminder hooks use the same environment-selected entry point as other tools. */
export async function main(argv: string[], deps: RuntimeDeps): Promise<number> {
  if (argv.length !== 1 || !["dev-server", "push", "pull-request"].includes(argv[0])) {
    deps.io.stderr.write("[Hook] Unknown workflow notice\n"); return 1;
  }
  const text = await deps.io.stdin.readText(64 * 1024);
  try {
    const event = JSON.parse(text) as { tool_input?: { command?: unknown }; tool_output?: { output?: unknown } } | null;
    const command = typeof event?.tool_input?.command === "string" ? event.tool_input.command : "";
    if (argv[0] === "dev-server" && deps.proc.platform !== "win32" && /(pnpm( run)? dev\b|npm run dev\b|yarn dev\b|bun run dev\b)/.test(command)) {
      deps.io.stderr.write('[Hook] BLOCKED: Dev server must run in tmux for log access\n[Hook] Use: tmux new-session -d -s dev "pnpm dev"\n[Hook] Then: tmux attach -t dev\n');
      return 2;
    }
    if (argv[0] === "push" && /git push/.test(command)) deps.io.stderr.write("[Hook] Review changes before push...\n[Hook] Continuing with push (remove this hook to add interactive review)\n");
    if (argv[0] === "pull-request" && /gh pr create/.test(command)) {
      const output = typeof event?.tool_output?.output === "string" ? event.tool_output.output : "";
      const match = output.match(/https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/pull\/(\d+)/);
      if (match) deps.io.stderr.write(`[Hook] PR created: ${match[0]}\n[Hook] To review: gh pr review ${match[2]} --repo ${match[1]}\n`);
    }
  } catch { /* Malformed hook input remains a pass-through, as in the original notices. */ }
  deps.io.stdout.write(text + "\n");
  return 0;
}

runDirect(import.meta.url, main);
