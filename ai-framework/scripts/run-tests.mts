import { inferRoot, workflowInvocation } from "./runtime/entry.mts";
import { runDirect } from "./runtime/cli.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

/** Roots scanned by full mode. Targeted runs may name any `*.test.mts` under the project root. */
export const FULL_ROOTS = ["ai-framework", ".claude/hooks"];
export const MAX_WORKERS = 64;
const SUFFIX = ".test.mts";

export interface Options {
  files: string[];
  runtime?: "node" | "bun";
  workers?: number;
  cacheDir?: string;
  coverage: boolean;
  list: boolean;
  root?: string;
}

const USAGE = "Usage: node ai-framework/scripts/run-tests.mts [--list] [--runtime node|bun] [--workers N] [--cache DIR] [--coverage] [--root DIR] [test-file ...]\n"
  + "No files runs the full suite; named files run a partial selection that never replaces full verification.";

export function parseArgs(argv: string[]): Options | { error: string } {
  const options: Options = { files: [], coverage: false, list: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    // An option never takes another option as its value, so `--cache --coverage` cannot drop the coverage request.
    const value = (): string | undefined => { const next = argv[++i]; return next?.startsWith("-") ? undefined : next; };
    if (arg === "--list") options.list = true;
    else if (arg === "--coverage") options.coverage = true;
    else if (arg === "--runtime") {
      const runtime = value();
      if (runtime !== "node" && runtime !== "bun") return { error: `unsupported runtime: ${runtime ?? "(missing)"}` };
      options.runtime = runtime;
    } else if (arg === "--workers") {
      const text = value();
      if (text === undefined || !/^[1-9][0-9]*$/.test(text) || Number(text) > MAX_WORKERS) return { error: `workers must be an integer from 1 to ${MAX_WORKERS}` };
      options.workers = Number(text);
    } else if (arg === "--cache") {
      const dir = value();
      if (!dir) return { error: "--cache needs a directory" };
      options.cacheDir = dir;
    } else if (arg === "--root") {
      const dir = value();
      if (!dir) return { error: "--root needs a directory" };
      options.root = dir;
    } else if (arg.startsWith("-")) return { error: `unsupported option: ${arg}` };
    else options.files.push(arg);
  }
  return options;
}

/** Deterministic full-suite discovery; symlinks and node_modules are never followed. */
export function discover(deps: RuntimeDeps, root: string): string[] {
  const found: string[] = [];
  const walk = (relative: string): void => {
    const dir = deps.path.join(root, relative);
    if (!deps.fs.existsSync(dir)) return;
    for (const entry of deps.fs.readdirEntriesSync(dir)) {
      const child = `${relative}/${entry.name}`;
      if (entry.isSymbolicLink() || entry.name === "node_modules") continue;
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile() && entry.name.endsWith(SUFFIX)) found.push(child);
    }
  };
  for (const base of FULL_ROOTS) walk(base);
  return found.sort();
}

/** Containment is judged on real paths, so a symlinked parent cannot lead outside the project. */
function select(deps: RuntimeDeps, root: string, files: string[]): string[] | { error: string } {
  const chosen: string[] = [];
  let realRoot: string;
  try { realRoot = deps.fs.realpathSync(root); } catch { return { error: `missing project root: ${root}` }; }
  for (const file of files) {
    const absolute = deps.path.resolve(deps.proc.cwd(), file);
    if (!absolute.endsWith(SUFFIX)) return { error: `not a ${SUFFIX} file: ${file}` };
    let real: string;
    try { real = deps.fs.realpathSync(absolute); } catch { return { error: `missing test file: ${file}` }; }
    const relative = deps.path.relative(realRoot, real).split(deps.path.sep).join("/");
    if (relative === ".." || relative.startsWith("../") || deps.path.isAbsolute(relative)) return { error: `outside the project: ${file}` };
    if (!deps.fs.lstatSync(absolute).isFile()) return { error: `not a regular file: ${file}` };
    if (!chosen.includes(relative)) chosen.push(relative);
  }
  return chosen;
}

interface Launch { command: string; args: string[]; env: Record<string, string | undefined>; runtime: "node" | "bun" }

/** The child runtime is what workflowInvocation resolves from the effective environment, not the outer executable. */
export function launch(deps: RuntimeDeps, options: Options, files: string[]): Launch | { error: string } {
  const env: Record<string, string | undefined> = { ...deps.proc.env };
  delete env.NODE_TEST_CONTEXT; // launched from inside a node:test file, a child run would otherwise act as a subtest
  if (options.runtime) env.AI_WORKFLOW_RUNNER = options.runtime;
  const flags = ["--test"];
  const probe = workflowInvocation(deps, ["--test"], { env });
  const runtime = probe.options.env?.AI_WORKFLOW_RUNNER === "bun" ? "bun" : "node";
  if (options.cacheDir && runtime === "bun") return { error: "--cache applies to Node only" };
  if (options.cacheDir && options.coverage) return { error: "--cache is disabled for coverage runs: cached functions give less precise coverage" };
  if (options.coverage) flags.push(runtime === "bun" ? "--coverage" : "--experimental-test-coverage");
  if (options.workers !== undefined) {
    if (runtime === "bun") {
      const help = workflowInvocation(deps, ["--test", "--help"], { env });
      const result = deps.child.runSync(help.command, help.args.map(arg => (arg === "--test" ? "test" : arg)), { env: help.options.env });
      if (result.status !== 0 || !/--parallel\b/.test(result.stdout)) return { error: "this Bun does not support --parallel" };
      flags.push(`--parallel=${options.workers}`);
    } else flags.push(`--test-concurrency=${options.workers}`);
  }
  if (options.cacheDir) env.NODE_COMPILE_CACHE = deps.path.resolve(deps.proc.cwd(), options.cacheDir);
  else delete env.NODE_COMPILE_CACHE;
  const invocation = workflowInvocation(deps, [...flags, ...files.map(file => `./${file}`)], { env });
  return { command: invocation.command, args: invocation.args, env: invocation.options.env ?? env, runtime };
}

export async function main(argv: string[], deps: RuntimeDeps): Promise<number> {
  const fail = (text: string): number => { deps.io.stderr.write(`run-tests: ${text}\n${USAGE}\n`); return 2; };
  const options = parseArgs(argv);
  if ("error" in options) return fail(options.error);
  const root = options.root ? deps.path.resolve(deps.proc.cwd(), options.root) : inferRoot(import.meta.filename);
  const full = options.files.length === 0;
  const files = full ? discover(deps, root) : select(deps, root, options.files);
  if ("error" in files) return fail(files.error);
  if (files.length === 0) return fail("no test files selected");
  if (options.list) { deps.io.stdout.write(`${files.join("\n")}\n`); return 0; }
  const plan = launch(deps, options, files);
  if ("error" in plan) return fail(plan.error);
  const started = deps.clock.perfNowMs();
  const result = await deps.child.run(plan.command, plan.args, { cwd: root, env: plan.env, stdio: "inherit" });
  const status = result.status ?? 1;
  const seconds = ((deps.clock.perfNowMs() - started) / 1000).toFixed(3);
  deps.io.stdout.write(`run-tests: ${full ? "full" : "partial (not full verification)"} files=${files.length} runtime=${plan.runtime} `
    + `workers=${options.workers ?? "default"} cache=${options.cacheDir ? "on" : "off"} duration=${seconds}s exit=${status}\n`);
  return status;
}

runDirect(import.meta.url, main);
