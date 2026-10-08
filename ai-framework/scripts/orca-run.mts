import { runDirect } from "./runtime/cli.mts";
import { NODE_FLAGS } from "./runtime/entry.mts";
import { collectReport, dispatchScope, dispatchWithRetries } from "./orca-dispatch.mts";
import type { DispatchOptions, Placement, ScopeSpec } from "./orca-dispatch.mts";
import { report as policyReport, VENDORS } from "./orca-policy.mts";
import { report as preflightReport } from "./orca-preflight.mts";
import { reconcile } from "./orca-reconcile.mts";
import { decideStart } from "./orca-start.mts";
import type { CheckSpec, ReconcileAttempt } from "./orca-reconcile.mts";
import { createNodeDeps } from "./runtime/node.mts";
import { orcaMultiAgentEnabled } from "./runtime/select.mts";
import type { RuntimeDeps, StatLike } from "./runtime/types.mts";

/**
 * Thin CLI over the Orca vendor libraries: argument parsing, strict input validation, ONE library call, one JSON object.
 * The multi-agent switch and every launch, path, ledger and apply guard live in the libraries and are never repeated here.
 *
 * Exit codes: 0 launched / integrated / ok; 3 normal workflow or refused (switch off, ineligible, a library or input guard
 * refused); 2 usage error; 1 internal error; 4 start blocked.
 */

export const COMMANDS: readonly string[] = Object.freeze(["status", "dispatch", "collect", "reconcile", "start"]);
const START_PHASES: readonly string[] = Object.freeze(["shape", "shape-lite", "critique", "plan", "build", "audit", "ship", "cooldown", "fix", "resume", "switch", "checkpoint"]);
export const MAX_INPUT_BYTES = 64 * 1024;
export const MAX_TIMEOUT_MS = 30 * 60 * 1000;
export const EXIT = Object.freeze({ ok: 0, internal: 1, usage: 2, refused: 3, blocked: 4 });

type Json = Record<string, unknown>;
type Command = "status" | "dispatch" | "collect" | "reconcile" | "start";

let nodeDeps: RuntimeDeps | undefined;
const defaultDeps = (): RuntimeDeps => (nodeDeps ??= createNodeDeps());

class CliError extends Error {
  readonly exit: number;
  readonly kind: string;
  readonly reason: string;
  constructor(exit: number, kind: string, reason: string) { super(`${kind}:${reason}`); this.exit = exit; this.kind = kind; this.reason = reason; }
}
const usage = (reason: string): CliError => new CliError(EXIT.usage, "usage", reason);
const refused = (reason: string): CliError => new CliError(EXIT.refused, "input-refused", reason);

/** Fixed argv per check name. There is no way to supply command text; the env checks receive is the library's worker allowlist. */
export function checkCatalog(deps: RuntimeDeps): Readonly<Record<string, CheckSpec>> {
  const flags = deps.runtime === "node" ? NODE_FLAGS : [];
  const script = (file: string, ...rest: string[]): CheckSpec => ({ command: deps.proc.execPath, args: [...flags, file, ...rest] });
  return Object.freeze({
    "workflow-doctor": script("ai-framework/scripts/workflow-doctor.mts", "--json"),
    "setup-validator": script("ai-framework/scripts/setup-validator.mts"),
    "graph-check": script("ai-framework/scripts/graphify.mts", "--check"),
    "node-tests": deps.runtime === "node"
      ? { command: deps.proc.execPath, args: [...flags, "--test", "ai-framework/scripts/*.test.mts", "ai-framework/scripts/runtime/*.test.mts", "ai-framework/hooks/scripts/*.test.mts"] }
      : { command: deps.proc.execPath, args: ["test", "ai-framework/"] },
  });
}

interface Parsed { command: Command; root: string; input?: string; checks: string[]; probe: boolean; vendor?: string; vendors?: string[]; phase?: string; argsText?: string }

function parseArgs(argv: readonly string[]): Parsed {
  const command = argv[0];
  if (!COMMANDS.includes(command)) throw usage("unknown-command");
  const values = new Map<string, string>();
  const checks: string[] = [];
  const vendors: string[] = [];
  let probe = false;
  for (let index = 1; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === "--probe") {
      if (probe) throw usage("duplicate-flag");
      probe = true;
    } else if (flag === "--root" || flag === "--input" || flag === "--vendor" || flag === "--check" || flag === "--phase" || flag === "--args-text") {
      const value = argv[++index];
      if (typeof value !== "string" || (flag !== "--args-text" && (value === "" || value.startsWith("--")))) throw usage("missing-value");
      if (flag === "--check") {
        if (checks.includes(value)) throw usage("duplicate-flag");
        checks.push(value);
      } else if (flag === "--vendor") {
        // --vendor repeats on `status` to inspect every coordinator in one call. Other commands take one.
        if (command !== "status") {
          if (vendors.length > 0) throw usage("vendor-not-repeatable");
          vendors.push(value);
        } else if (vendors.includes(value)) throw usage("duplicate-flag");
        else vendors.push(value);
      } else {
        if (values.has(flag)) throw usage("duplicate-flag");
        values.set(flag, value);
      }
    } else throw usage("unknown-flag");
  }
  const root = values.get("--root");
  if (root === undefined) throw usage("missing-root");
  const input = values.get("--input");
  const takesInput = command !== "status" && command !== "start";
  if (takesInput ? input === undefined : input !== undefined) throw usage(takesInput ? "missing-input" : "input-not-allowed");
  if (probe && command !== "status") throw usage("probe-only-for-status");
  if (command !== "status" && command !== "start" && vendors.length > 0) throw usage("vendor-only-for-status");
  if (checks.length > 0 && command !== "reconcile") throw usage("check-only-for-reconcile");
  const phase = values.get("--phase");
  const argsText = values.get("--args-text");
  if (command === "start") {
    if (phase === undefined) throw usage("missing-phase");
    if (!START_PHASES.includes(phase)) throw usage("invalid-phase");
    const vendor = vendors[0] ?? "claude";
    if (!VENDORS.includes(vendor)) throw usage("invalid-vendor");
    return { command, root, checks, probe, phase, vendor, ...(argsText !== undefined ? { argsText } : {}) };
  }
  if (phase !== undefined || argsText !== undefined) throw usage("start-only-flag");
  if (command === "status") {
    return { command: command as Command, root, ...(input !== undefined ? { input } : {}), checks, probe, vendors };
  }
  const vendor = vendors[0];
  return { command: command as Command, root, ...(input !== undefined ? { input } : {}), checks, probe, ...(vendor !== undefined ? { vendor } : {}) };
}

// ---- input file: a regular file of bounded size inside --root, read without following links ----

function resolveRoot(rootArg: string, deps: RuntimeDeps): string {
  try {
    const real = deps.fs.realpathSync(rootArg);
    if (!deps.fs.statSync(real).isDirectory()) throw new Error("not-a-directory");
    return real;
  } catch { throw usage("root-invalid"); }
}

const insideOf = (base: string, target: string, deps: RuntimeDeps): string | undefined => {
  const relative = deps.path.relative(base, target);
  if (relative === "" || relative === ".." || relative.startsWith(`..${deps.path.sep}`) || deps.path.isAbsolute(relative)) return undefined;
  return relative;
};

function readInputFile(rootArg: string, realRoot: string, input: string, deps: RuntimeDeps): string {
  const { fs, path } = deps;
  const candidate = path.resolve(rootArg, input);
  const relative = insideOf(path.resolve(rootArg), candidate, deps) ?? insideOf(realRoot, candidate, deps);
  if (relative === undefined) throw refused("input-outside-root");
  const parts = relative.split(path.sep);
  let current = realRoot;
  let leaf: StatLike | undefined;
  try {
    for (let index = 0; index < parts.length; index++) {
      current = path.join(current, parts[index]);
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink()) throw refused("input-symlink");
      if (index < parts.length - 1 && !stat.isDirectory()) throw refused("input-not-regular");
      leaf = stat;
    }
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw refused("input-unreadable");
  }
  if (!leaf || !leaf.isFile()) throw refused("input-not-regular");
  if (leaf.size > MAX_INPUT_BYTES) throw refused("input-too-large");
  let descriptor: number | undefined;
  try {
    // O_NONBLOCK keeps a file swapped for a FIFO after the lstat from blocking; O_NOFOLLOW refuses a swapped-in link.
    descriptor = fs.openSync(current, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
    const opened = fs.fstatSync(descriptor);
    if (!opened.isFile() || opened.dev !== leaf.dev || opened.ino !== leaf.ino) throw refused("input-changed");
    const buffer = new Uint8Array(MAX_INPUT_BYTES + 1);
    let size = 0;
    while (size < buffer.length) {
      const count = fs.readSync(descriptor, buffer, size, buffer.length - size, null);
      if (!count) break;
      size += count;
    }
    if (size > MAX_INPUT_BYTES) throw refused("input-too-large");
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, size));
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw refused("input-unreadable");
  } finally { if (descriptor !== undefined) fs.closeSync(descriptor); }
}

const PROTOTYPE_KEYS: readonly string[] = ["__proto__", "constructor", "prototype"];
function rejectPrototypeKeys(value: unknown, depth = 0): void {
  if (depth > 32) throw refused("input-too-deep");
  if (Array.isArray(value)) { for (const item of value) rejectPrototypeKeys(item, depth + 1); return; }
  if (value === null || typeof value !== "object") return;
  for (const key of Object.getOwnPropertyNames(value)) {
    if (PROTOTYPE_KEYS.includes(key)) throw refused("input-prototype-key");
    rejectPrototypeKeys((value as Json)[key], depth + 1);
  }
}

function parseInput(text: string): Json {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw refused("input-invalid-json"); }
  if (!isPlain(value)) throw refused("input-not-an-object");
  rejectPrototypeKeys(value);
  return value;
}

// ---- strict shape validation: pass values through, never invent a default that widens authority ----

const isPlain = (value: unknown): value is Json => value !== null && typeof value === "object" && !Array.isArray(value);
const bad = (what: string): CliError => refused(`invalid-${what}`);
function exactKeys(value: unknown, required: readonly string[], optional: readonly string[], what: string): Json {
  if (!isPlain(value)) throw bad(what);
  const keys = Object.keys(value);
  if (keys.some((key) => !required.includes(key) && !optional.includes(key)) || required.some((key) => !keys.includes(key))) throw bad(what);
  return value;
}
const text = (value: unknown, what: string): string => { if (typeof value !== "string") throw bad(what); return value; };
const textOrList = (value: unknown, what: string): string | string[] => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value as string[];
  throw bad(what);
};
const textList = (value: unknown, what: string): string[] => {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) throw bad(what);
  return value as string[];
};
function timeoutOf(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > MAX_TIMEOUT_MS) throw bad("timeoutMs");
  return value;
}
const optionalBool = (value: unknown, what: string): boolean | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw bad(what);
  return value;
};

function dispatchInput(input: Json): { base: Omit<DispatchOptions, "attemptId" | "root" | "deps">; attemptId: string; timeoutMs: number; maxRetries?: number } {
  const value = exactKeys(input, ["coordinator", "vendor", "scope", "attemptId", "timeoutMs"], ["placement", "maxRetries"], "dispatch");
  const scope = exactKeys(value.scope, ["id", "target", "change", "constraints", "ownership", "acceptance"], [], "scope");
  const spec: ScopeSpec = { id: text(scope.id, "scope"), target: text(scope.target, "scope"), change: text(scope.change, "scope"),
    constraints: textOrList(scope.constraints, "scope"), ownership: textOrList(scope.ownership, "scope"), acceptance: text(scope.acceptance, "scope") };
  let placement: Placement | undefined;
  if (value.placement !== undefined) {
    if (!isPlain(value.placement) || !Object.values(value.placement).every((item) => typeof item === "string")) throw bad("placement");
    placement = { ...value.placement } as Placement;
  }
  let maxRetries: number | undefined;
  if (value.maxRetries !== undefined) {
    if (typeof value.maxRetries !== "number" || !Number.isInteger(value.maxRetries) || value.maxRetries < 0 || value.maxRetries > 5) throw bad("maxRetries");
    maxRetries = value.maxRetries;
  }
  return { base: { coordinator: text(value.coordinator, "coordinator"), vendor: text(value.vendor, "vendor"), scope: spec, deadlineMs: 0, ...(placement ? { placement } : {}) },
    attemptId: text(value.attemptId, "attemptId"), timeoutMs: timeoutOf(value.timeoutMs), ...(maxRetries !== undefined ? { maxRetries } : {}) };
}

function reconcileInput(input: Json): { baseline: string; attempts: ReconcileAttempt[]; humanConfirmed?: boolean; rollbackOnFailure?: boolean; timeoutMs: number } {
  const value = exactKeys(input, ["baseline", "attempts", "timeoutMs"], ["humanConfirmed", "rollbackOnFailure"], "reconcile");
  if (!Array.isArray(value.attempts) || value.attempts.length > 16) throw bad("attempts");
  const attempts = value.attempts.map((item): ReconcileAttempt => {
    const attempt = exactKeys(item, ["attemptKey", "worktree"], ["claims", "settlement"], "attempt");
    const tree = exactKeys(attempt.worktree, ["path", "baseline", "allowedRoots"], [], "worktree");
    if (attempt.settlement !== undefined && !isPlain(attempt.settlement)) throw bad("settlement");
    return { attemptKey: text(attempt.attemptKey, "attempt"),
      worktree: { path: text(tree.path, "worktree"), baseline: text(tree.baseline, "worktree"), allowedRoots: textList(tree.allowedRoots, "worktree") },
      ...(attempt.claims !== undefined ? { claims: textList(attempt.claims, "claims") } : {}),
      ...(attempt.settlement !== undefined ? { settlement: attempt.settlement } : {}) };
  });
  const humanConfirmed = optionalBool(value.humanConfirmed, "humanConfirmed");
  const rollbackOnFailure = optionalBool(value.rollbackOnFailure, "rollbackOnFailure");
  return { baseline: text(value.baseline, "baseline"), attempts, ...(humanConfirmed !== undefined ? { humanConfirmed } : {}),
    ...(rollbackOnFailure !== undefined ? { rollbackOnFailure } : {}), timeoutMs: timeoutOf(value.timeoutMs) };
}

function collectInput(input: Json): { attemptKey: string; message: Json } {
  const value = exactKeys(input, ["attemptKey", "message"], [], "collect");
  if (!isPlain(value.message)) throw bad("message");
  return { attemptKey: text(value.attemptKey, "attemptKey"), message: value.message };
}

/** Maps a library outcome to the exit code. Only a launched/resumed, accepted or integrated outcome is 0. */
export function exitCodeFor(command: Command, outcome: Json): number {
  if (command === "start") return outcome.state === "blocked" ? EXIT.blocked : EXIT.ok;
  if (command === "dispatch") return outcome.route === "launched" || outcome.route === "resume" ? EXIT.ok : EXIT.refused;
  if (command === "collect") return outcome.accepted === true ? EXIT.ok : EXIT.refused;
  if (command === "reconcile") return outcome.status === "integrated" ? EXIT.ok : EXIT.refused;
  return EXIT.ok;
}

function status(root: string, parsed: Parsed, deps: RuntimeDeps): Json {
  const requested = parsed.vendors ?? [];
  const vendors = requested.length === 0 ? [...VENDORS] : requested;
  if (!vendors.every((vendor) => VENDORS.includes(vendor))) throw usage("invalid-vendor");
  const enabled = orcaMultiAgentEnabled(root, deps);
  return { schemaVersion: 1, command: "status", enabled, probe: parsed.probe,
    vendors: Object.fromEntries(vendors.map((vendor) => [vendor, {
      policy: policyReport(root, vendor, deps),
      preflight: preflightReport(root, vendor, parsed.probe ? { probe: true } : {}, deps),
    }])) };
}

async function execute(parsed: Parsed, deps: RuntimeDeps): Promise<{ output: Json; exit: number }> {
  const root = resolveRoot(parsed.root, deps);
  if (parsed.command === "start") {
    const output = { ...decideStart({ root, phase: parsed.phase as string, vendor: parsed.vendor as string, argsText: parsed.argsText, deps }) };
    return { output, exit: exitCodeFor(parsed.command, output) };
  }
  if (parsed.command === "status") {
    const output = status(root, parsed, deps);
    // The same switch the libraries obey: with it off, status still reports but exits 3.
    return { output, exit: output.enabled === true ? EXIT.ok : EXIT.refused };
  }
  const input = parseInput(readInputFile(parsed.root, root, parsed.input as string, deps));
  const deadlineFor = (timeoutMs: number): number => deps.clock.perfNowMs() + timeoutMs;
  let output: Json;
  if (parsed.command === "dispatch") {
    const { base, attemptId, timeoutMs, maxRetries } = dispatchInput(input);
    const options = { ...base, root, deps, deadlineMs: deadlineFor(timeoutMs) };
    output = { ...(maxRetries !== undefined ? await dispatchWithRetries({ ...options, baseAttemptId: attemptId, maxRetries }) : await dispatchScope({ ...options, attemptId })) };
  } else if (parsed.command === "collect") {
    const { attemptKey, message } = collectInput(input);
    output = { ...collectReport({ root, attemptKey, message, deps }) };
  } else {
    const value = reconcileInput(input);
    const catalog = checkCatalog(deps);
    for (const name of parsed.checks) if (!Object.hasOwn(catalog, name)) throw usage("unknown-check");
    output = { ...(await reconcile({ root, baseline: value.baseline, attempts: value.attempts, checks: catalog, runChecks: parsed.checks,
      ...(value.humanConfirmed !== undefined ? { humanConfirmed: value.humanConfirmed } : {}),
      ...(value.rollbackOnFailure !== undefined ? { rollbackOnFailure: value.rollbackOnFailure } : {}),
      deps, deadlineMs: deadlineFor(value.timeoutMs) })) };
  }
  return { output, exit: exitCodeFor(parsed.command, output) };
}

export async function main(argv: string[], deps: RuntimeDeps = defaultDeps()): Promise<number> {
  let output: Json;
  let exit: number;
  try {
    ({ output, exit } = await execute(parseArgs(argv), deps));
  } catch (error) {
    if (error instanceof CliError) { output = { error: error.kind, reason: error.reason }; exit = error.exit; }
    else { output = { error: "internal" }; exit = EXIT.internal; }
    deps.io.stderr.write(`orca-run: ${String((output as { error: string }).error)}${"reason" in output ? ` (${String(output.reason)})` : ""}\n`);
  }
  deps.io.stdout.write(`${JSON.stringify(output)}\n`);
  return exit;
}

runDirect(import.meta.url, main);
