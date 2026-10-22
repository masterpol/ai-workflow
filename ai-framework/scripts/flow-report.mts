import { runDirect } from "./runtime/cli.mts";
import { FORMATS, ownsFormat, renderFormats } from "./flow-render.mts";
import type { Format, Rendered } from "./flow-render.mts";
import type { RuntimeDeps, StatLike } from "./runtime/types.mts";
import { FLOW_LIMITS, REASONS, joinFlowReport, projectHistory, projectTokens, projectUsage } from "./flow-join.mts";
import type { FlowInputs, Loaded } from "./flow-join.mts";
import { errorCode, metricsDirectory, readText, readWorkflowState, withMetricsLease } from "./workflow-metrics-state.mts";

/*
 * Joined token and workflow-time report. Preview prints one sanitized format to stdout and changes nothing
 * on disk: no directory is created, no collector or state writer is called, and the interval store is
 * never folded. Both metrics stores are read under exactly one lease acquisition. `--apply` reads once
 * the same way, releases the lease, renders outside it, then publishes the three fixed files one at a time.
 * That publication is NOT an atomic set: every file carries the same generation ID so a mixed set is visible.
 */
const TOKEN_FILE = "token-consumption.json";
const HISTORY_FILE = "state.json";
const STAGE = ".flow-report.staging";
const USAGE = "Usage: node ai-framework/scripts/flow-report.mts [--root <project>] [--format json|markdown|html | --apply]\n";
const KNOWN_LEASE_REASONS = ["metrics lease unavailable; event not recorded", "legacy metrics lock is present"];
const KNOWN_FAILURES = ["project is not initialized", "unsafe metrics directory", "unsafe directory"];

export interface Options { root: string | null; format: Format; apply: boolean }
export function parseArgs(argv: string[]): Options | { error: string } {
  const options: Options = { root: null, format: "json", apply: false };
  let formatGiven = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--root" || arg === "--format") {
      const value = argv[++i];
      if (value === undefined || value.startsWith("--")) return { error: `${arg} needs a value` };
      if (arg === "--root") options.root = value;
      else if ((FORMATS as readonly string[]).includes(value)) { options.format = value as Format; formatGiven = true; }
      else return { error: "--format must be json, markdown or html" };
    } else return { error: "unknown argument" };
  }
  return options.apply && formatGiven ? { error: "--apply publishes every format; omit --format" } : options;
}

const refused = <T,>(reason: string): Loaded<T> => ({ status: "refused", reason });
const unsafeText = (reason: string): string => (/oversized|unsafe|changed/.test(reason) ? REASONS.unsafe : REASONS.unreadable);
type Raw = { status: "valid"; value: unknown } | { status: "missing" } | { status: "refused"; reason: string };
function readJson(file: string, deps: RuntimeDeps): Raw {
  const loaded = readText(file, deps, FLOW_LIMITS.sourceBytes);
  if (loaded.status !== "valid") return loaded.status === "missing" ? loaded : { status: "refused", reason: unsafeText(loaded.reason) };
  try { return { status: "valid", value: JSON.parse(loaded.text) as unknown }; } catch { return { status: "refused", reason: REASONS.shape }; }
}

/** Runs inside the single lease with its guarded dependencies. */
function readStores(directory: string, guarded: RuntimeDeps): Pick<FlowInputs, "tokens" | "usage"> {
  const raw = readJson(guarded.path.join(directory, TOKEN_FILE), guarded);
  const tokens = raw.status === "valid" ? projectTokens(raw.value) : raw;
  const state = readWorkflowState(directory, guarded);
  const usage: FlowInputs["usage"] = state.status === "valid" ? projectUsage(state.state) : state.status === "missing" ? state : { status: "refused", reason: unsafeText(state.reason) };
  return { tokens, usage };
}

function lstatIfPresent(path: string, deps: RuntimeDeps): StatLike | null {
  try { return deps.fs.lstatSync(path); } catch (error) { if (errorCode(error) === "ENOENT") return null; throw error; }
}
export interface Chain { dirs: string[]; pinned: StatLike[]; verify(): void; guarded: RuntimeDeps }
/** Pins directory identities now; every call through `guarded` first rechecks type, identity and canonical path. */
function pinChain(dirs: string[], deps: RuntimeDeps, known: StatLike[] = []): Chain {
  const pinned = dirs.map((dir, i) => known[i] ?? deps.fs.lstatSync(dir));
  const verify = (): void => {
    dirs.forEach((dir, i) => {
      const stat = deps.fs.lstatSync(dir);
      if (stat.isSymbolicLink() || !stat.isDirectory() || stat.ino !== pinned[i].ino || stat.dev !== pinned[i].dev || deps.fs.realpathSync(dir) !== dir) throw new Error("unsafe directory");
    });
  };
  verify();
  const fs = new Proxy(deps.fs, { get(target, key) {
    const value: unknown = Reflect.get(target, key);
    if (typeof value !== "function" || key === "closeSync") return value;
    return (...args: unknown[]) => { verify(); return Reflect.apply(value, target, args); };
  } });
  return { dirs, pinned, verify, guarded: { ...deps, fs } };
}
/** The snapshot is read outside the metrics lease, so its own project and reports ancestry is pinned and rechecked on every call. */
function readHistory(root: string, deps: RuntimeDeps): FlowInputs["history"] {
  try {
    const canonical = deps.fs.realpathSync(root);
    const dirs = [".project", ".project/reports"].map(relative => deps.path.join(canonical, relative));
    for (const dir of dirs) {
      const stat = lstatIfPresent(dir, deps);
      if (!stat) return { status: "missing" };
      if (stat.isSymbolicLink() || !stat.isDirectory() || deps.fs.realpathSync(dir) !== dir) return refused(REASONS.unsafe);
    }
    const raw = readJson(deps.path.join(dirs[1], HISTORY_FILE), pinChain(dirs, deps).guarded);
    return raw.status === "valid" ? projectHistory(raw.value) : raw;
  } catch { return refused(REASONS.unsafe); }
}

export type Collected = { ok: true; inputs: FlowInputs } | { ok: false; reason: string };
/** Takes the one lease, reads both stores, then reads the optional history snapshot. */
export async function collectSources(root: string, deps: RuntimeDeps): Promise<Collected> {
  try {
    const directory = metricsDirectory(root, false, deps);
    let stores: Pick<FlowInputs, "tokens" | "usage"> = { tokens: { status: "missing" }, usage: { status: "missing" } };
    if (directory !== null) {
      const held = await withMetricsLease(directory, guarded => {
        // The guarded dependencies recheck the pinned directory identity on every filesystem call, so a swap fails the reads.
        return { ok: true as const, ...readStores(directory, guarded) };
      }, deps);
      if (!("ok" in held)) return { ok: false, reason: KNOWN_LEASE_REASONS.includes(held.reason) ? held.reason : "metrics lease unavailable" };
      stores = held;
    }
    return { ok: true, inputs: { ...stores, history: readHistory(root, deps) } };
  } catch (error) { return { ok: false, reason: failure(error) }; }
}
const failure = (error: unknown): string => {
  const message = error instanceof Error ? error.message : "";
  return KNOWN_FAILURES.includes(message) ? message : `flow report failed (${errorCode(error)})`;
};

class Refused extends Error {}
interface Prior { stat: StatLike; text: string }
/** An existing target must be a regular file this renderer wrote in this format; anything else is refused untouched. */
function inspectOwned(name: string, format: Format, file: string, deps: RuntimeDeps): Prior | null {
  const stat = lstatIfPresent(file, deps);
  if (!stat) return null;
  const loaded = stat.isSymbolicLink() || !stat.isFile() ? null : readText(file, deps, FLOW_LIMITS.outputBytes);
  if (loaded?.status !== "valid" || !ownsFormat(format, loaded.text)) throw new Refused(`${name} exists and is not a report this tool wrote; left unchanged`);
  return { stat, text: loaded.text };
}
export interface Publication { published: string[]; error: string | null }
/**
 * Writes each file to an exclusive staging directory, then publishes them one at a time: new targets by
 * exclusive link, verified owned targets by rename. Ancestry and the staging directory stay pinned, and the
 * original target is reinspected immediately before its own publish. Never atomic across files.
 */
export function publishFiles(directory: string, files: Rendered[], parent: Chain, deps: RuntimeDeps): Publication {
  const stage = deps.path.join(directory, STAGE), published: string[] = [], mine = new Map<string, StatLike>();
  const bytes = files.map(file => new TextEncoder().encode(file.text));
  let chain = parent;
  try {
    const priors = files.map(file => inspectOwned(file.name, file.format, deps.path.join(directory, file.name), parent.guarded));
    try { parent.guarded.fs.mkdirSync(stage, { recursive: false, mode: 0o700 }); } catch (error) {
      throw new Refused(errorCode(error) === "EEXIST" ? `another apply is running or left ${STAGE}; remove it if none is running, then retry` : `staging failed (${errorCode(error)})`);
    }
    // From here every filesystem call also rechecks the staging directory's identity, so a swap fails the next call.
    chain = pinChain([...parent.dirs, stage], deps, [...parent.pinned, parent.guarded.fs.lstatSync(stage)]);
    const fs = chain.guarded.fs;
    files.forEach((file, i) => {
      const fd = fs.openSync(deps.path.join(stage, file.name), "wx", 0o644);
      try {
        mine.set(file.name, fs.fstatSync(fd));
        for (let written = 0; written < bytes[i].length;) {
          const n = fs.writeSync(fd, bytes[i].subarray(written));
          if (!(n > 0)) throw new Refused("short write; nothing from this file was published");
          written += n;
        }
        fs.fsyncSync(fd);
      } finally { fs.closeSync(fd); }
    });
    files.forEach((file, i) => {
      const target = deps.path.join(directory, file.name), staged = deps.path.join(stage, file.name), prior = priors[i], made = mine.get(file.name), copy = lstatIfPresent(staged, chain.guarded);
      const content = made && copy && copy.ino === made.ino && copy.dev === made.dev && copy.size === bytes[i].length ? readText(staged, chain.guarded, FLOW_LIMITS.outputBytes) : null;
      if (content?.status !== "valid" || content.text !== file.text) throw new Refused("staged file changed");
      const now = lstatIfPresent(target, chain.guarded);
      if (prior === null) {
        if (now) throw new Refused(`${file.name} appeared during publish; left unchanged`);
        fs.linkSync(staged, target);
        published.push(file.name);
        fs.unlinkSync(staged);
      } else {
        const again = now && !now.isSymbolicLink() && now.isFile() ? readText(target, chain.guarded, FLOW_LIMITS.outputBytes) : null;
        const same = now && again?.status === "valid" && again.text === prior.text && now.ino === prior.stat.ino && now.dev === prior.stat.dev && now.size === prior.stat.size && now.mtimeMs === prior.stat.mtimeMs;
        if (!same) throw new Refused(`${file.name} changed during publish; left unchanged`);
        fs.renameSync(staged, target);
        published.push(file.name);
      }
      mine.delete(file.name);
    });
    return { published, error: null };
  } catch (error) {
    return { published, error: error instanceof Refused || error instanceof Error && KNOWN_FAILURES.includes(error.message) ? error.message : `publish failed (${errorCode(error)})` };
  } finally {
    // Remove only staged files this attempt created, and only while the staging directory is still the one it made.
    try {
      if (chain !== parent) {
        const fs = chain.guarded.fs;
        for (const [name, made] of mine) {
          const file = deps.path.join(stage, name), seen = lstatIfPresent(file, chain.guarded);
          if (seen && seen.ino === made.ino && seen.dev === made.dev) fs.unlinkSync(file);
        }
        fs.rmdirSync(stage);
      }
    } catch { /* a swapped or foreign staging directory is left exactly as found */ }
  }
}

async function applyReport(root: string, deps: RuntimeDeps): Promise<number> {
  const say = (message: string): number => { deps.io.stderr.write(`flow-report: ${message}\n`); return 1; };
  try {
    const directory = metricsDirectory(root, true, deps);
    if (directory === null) return say("unsafe metrics directory");
    const chain = pinChain([deps.path.dirname(directory), directory], deps);
    const collected = await collectSources(root, deps);
    if (!collected.ok) return say(collected.reason);
    const id = deps.crypto.randomUUID(), rendered = renderFormats(joinFlowReport(collected.inputs, new Date(deps.clock.now()).toISOString()), id, FORMATS);
    if (!rendered) return say("report exceeds 4 MiB; nothing published");
    const { published, error } = publishFiles(directory, rendered, chain, deps);
    if (error === null) { deps.io.stdout.write(`flow-report: published ${published.join(", ")} (generation ${id}) in .project/metrics; written one file at a time, not as an atomic set\n`); return 0; }
    return say(`${published.length ? "publication incomplete" : "publication refused"}: ${error}. Published: ${published.join(", ") || "none"}; generation ${id}.${published.length ? " The set may mix generations; compare generationId values and rerun --apply." : ""}`);
  } catch (error) { return say(failure(error)); }
}

export async function main(argv: string[], deps: RuntimeDeps): Promise<number> {
  const options = parseArgs(argv);
  if ("error" in options) { deps.io.stderr.write(`flow-report: ${options.error}\n${USAGE}`); return 2; }
  const root = options.root ?? deps.proc.cwd();
  if (options.apply) return applyReport(root, deps);
  const collected = await collectSources(root, deps);
  if (!collected.ok) { deps.io.stderr.write(`flow-report: ${collected.reason}\n`); return 1; }
  const rendered = renderFormats(joinFlowReport(collected.inputs, new Date(deps.clock.now()).toISOString()), deps.crypto.randomUUID(), [options.format]);
  if (!rendered) { deps.io.stderr.write("flow-report: report exceeds 4 MiB; not printed\n"); return 1; }
  deps.io.stdout.write(rendered[0].text);
  return 0;
}

runDirect(import.meta.url, main);
