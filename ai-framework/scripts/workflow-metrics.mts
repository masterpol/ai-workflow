import { runDirect } from "./runtime/cli.mts";
import type { RuntimeDeps } from "./runtime/types.mts";
import { LIMITS, errorCode, recordWorkflowEvent } from "./workflow-metrics-state.mts";
import { generateReport } from "./workflow-metrics-report.mts";
import type { Format } from "./workflow-metrics-report.mts";

/** Recording and reporting never import project code or legacy resource metrics. */
export async function main(argv: string[], deps: RuntimeDeps): Promise<number> {
  const bestEffort = argv.includes("--best-effort");
  const fail = (reason: string): number => {
    deps.io.stderr.write(`[workflow-metrics] ${reason}\n`);
    return bestEffort ? 0 : 1;
  };
  let root: string | undefined;
  let format: Format = "markdown";
  if (argv[0] !== "record" && argv[0] !== "report") return fail("expected record or report command");
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === "--best-effort") continue;
    if (argv[i] === "--root" && argv[i + 1] && !argv[i + 1].startsWith("--")) { root = argv[++i]; continue; }
    if (argv[0] === "report" && argv[i] === "--format" && ["json", "markdown", "html"].includes(argv[i + 1])) { format = argv[++i] as Format; continue; }
    return fail("invalid command arguments");
  }
  try {
    root ??= deps.proc.cwd();
    if (argv[0] === "report") {
      const result = await generateReport(root, format, deps);
      if (!result.written) return fail(result.reason || "report not generated");
      deps.io.stdout.write(result.output!);
      return 0;
    }
    const text = await deps.io.stdin.readText(LIMITS.inputBytes);
    let input: unknown;
    try { input = JSON.parse(text); } catch { return fail("stdin is not valid JSON"); }
    const result = await recordWorkflowEvent(input, root, deps);
    if (!result.written) return fail(result.reason || "event not recorded");
    deps.io.stdout.write(JSON.stringify({ written: true }) + "\n");
    return 0;
  } catch (error) {
    return fail(errorCode(error) === "E2BIG" ? "stdin exceeds 16 KiB" : `operation failed (${errorCode(error)})`);
  }
}

runDirect(import.meta.url, main);
