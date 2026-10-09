import { runDirect } from "./runtime/cli.mts";
import { createNodeDeps } from "./runtime/node.mts";
import type { RuntimeDeps, StatLike } from "./runtime/types.mts";

export const POLICY_FILE = ".project/orchestration.json";
export const MAX_POLICY_BYTES = 64 * 1024;
export const VENDORS: readonly string[] = Object.freeze(["claude", "codex", "opencode"]);

type Json = Record<string, unknown>;
type Status = "missing" | "refused" | "malformed" | "unsupported-schema" | "disabled" | "valid";
interface Coordinator { workers: string[]; roles: Record<string, string> }
interface Policy {
  schemaVersion: 1;
  "use-orca-orchestration": boolean;
  maxConcurrentWorkers: number;
  maxRetriesPerTask: number;
  coordinators: Record<string, Coordinator>;
}
export interface PolicyResult { status: Status; policy?: Policy }
interface Location { base: string; file: string; stat: StatLike }
type Refusal = { status: "refused" };

let nodeDeps: RuntimeDeps | undefined;
const defaultDeps = (): RuntimeDeps => (nodeDeps ??= createNodeDeps());

const isRecord = (value: unknown): value is Json => value !== null && typeof value === "object" && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const hasKeys = (value: unknown, allowed: readonly string[]): value is Json => isRecord(value) && Object.keys(value).every((key) => allowed.includes(key));
const boundedInteger = (value: unknown, min: number, max: number): value is number => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
const errorCode = (error: unknown): unknown => (error !== null && typeof error === "object" ? (error as { code?: unknown }).code : undefined);

function validateCoordinator(vendor: string, value: unknown): Coordinator | null {
  if (!hasKeys(value, ["workers", "roles"]) || !Array.isArray(value.workers) || value.workers.length > 2) return null;
  const workers = value.workers as unknown[];
  if (workers.some((worker) => !VENDORS.includes(worker as string) || worker === vendor)
    || new Set(workers).size !== workers.length) return null;
  if (!hasKeys(value.roles, ["implementation", "review"])
    || Object.values(value.roles).some((worker) => !workers.includes(worker))) return null;
  return { workers: [...(workers as string[])], roles: Object.fromEntries(Object.entries(value.roles)) as Record<string, string> };
}

export function validatePolicy(value: unknown): PolicyResult {
  if (!hasKeys(value, ["schemaVersion", "use-orca-orchestration", "maxConcurrentWorkers", "maxRetriesPerTask", "coordinators"])) return { status: "malformed" };
  if (!Number.isInteger(value.schemaVersion)) return { status: "malformed" };
  if (value.schemaVersion !== 1) return { status: "unsupported-schema" };
  if ((Object.hasOwn(value, "use-orca-orchestration") && typeof value["use-orca-orchestration"] !== "boolean")
    || !boundedInteger(value.maxConcurrentWorkers, 1, 3)
    || !boundedInteger(value.maxRetriesPerTask, 0, 2) || !hasKeys(value.coordinators, VENDORS)) return { status: "malformed" };
  const coordinators: Record<string, Coordinator> = {};
  for (const [vendor, entry] of Object.entries(value.coordinators)) {
    const normalized = validateCoordinator(vendor, entry);
    if (!normalized) return { status: "malformed" };
    coordinators[vendor] = normalized;
  }
  return {
    status: value["use-orca-orchestration"] === true ? "valid" : "disabled",
    policy: { schemaVersion: 1, "use-orca-orchestration": value["use-orca-orchestration"] === true, maxConcurrentWorkers: value.maxConcurrentWorkers,
      maxRetriesPerTask: value.maxRetriesPerTask, coordinators },
  };
}

function inspectPath(root: string, deps: RuntimeDeps): Location | Refusal {
  const { fs, path } = deps;
  const base = fs.realpathSync(root);
  let file = base;
  for (const part of POLICY_FILE.split("/")) {
    file = path.join(file, part);
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || (part !== "orchestration.json" && !stat.isDirectory())) return { status: "refused" };
  }
  const relative = path.relative(base, fs.realpathSync(file));
  if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) return { status: "refused" };
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.size > MAX_POLICY_BYTES) return { status: "refused" };
  return { base, file, stat };
}

function readBoundedFile(location: Location, deps: RuntimeDeps): Refusal | { text: string } {
  const { fs } = deps;
  let descriptor: number | undefined;
  try {
    // A replaced FIFO must not block between lstat and open; a replaced leaf symlink is refused.
    descriptor = fs.openSync(location.file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
    const opened = fs.fstatSync(descriptor);
    if (!opened.isFile() || opened.size > MAX_POLICY_BYTES || opened.dev !== location.stat.dev || opened.ino !== location.stat.ino) return { status: "refused" };
    const current = inspectPath(location.base, deps);
    if ("status" in current || current.stat.dev !== opened.dev || current.stat.ino !== opened.ino) return { status: "refused" };
    const buffer = new Uint8Array(MAX_POLICY_BYTES + 1);
    let size = 0;
    while (size < buffer.length) {
      const count = fs.readSync(descriptor, buffer, size, buffer.length - size, null);
      if (!count) break;
      size += count;
    }
    if (size > MAX_POLICY_BYTES) return { status: "refused" };
    // ignoreBOM keeps a leading BOM in the text, as Buffer#toString does, so JSON.parse still rejects it.
    return { text: new TextDecoder("utf-8", { ignoreBOM: true }).decode(buffer.subarray(0, size)) };
  } finally { if (descriptor !== undefined) fs.closeSync(descriptor); }
}

export function readPolicy(root: string, deps: RuntimeDeps = defaultDeps()): PolicyResult | Refusal {
  let location: Location | Refusal;
  try { location = inspectPath(root, deps); }
  catch (error) { return { status: errorCode(error) === "ENOENT" ? "missing" : "refused" }; }
  if ("status" in location) return location;
  let contents: Refusal | { text: string };
  try { contents = readBoundedFile(location, deps); }
  catch { return { status: "refused" }; }
  if ("status" in contents) return contents;
  let value: unknown;
  try { value = JSON.parse(contents.text); }
  catch { return { status: "malformed" }; }
  return validatePolicy(value);
}

export function report(root: string, vendor: string, deps: RuntimeDeps = defaultDeps()): Json {
  if (!VENDORS.includes(vendor)) throw new Error("invalid-vendor");
  const result = readPolicy(root, deps) as PolicyResult;
  const selected = result.policy?.coordinators[vendor];
  const eligible = result.status === "valid" && Boolean(selected?.workers.length);
  const reason = result.status !== "valid" ? `policy-${result.status}`
    : !selected ? "coordinator-unconfigured" : !selected.workers.length ? "no-workers" : "policy-eligible";
  return { schemaVersion: 1, vendor, policyStatus: result.status, eligible, reason, route: "normal",
    dispatchReady: false, workers: eligible ? selected?.workers : [], roles: eligible ? selected?.roles : {},
    maxConcurrentWorkers: eligible ? result.policy?.maxConcurrentWorkers : 0,
    maxRetriesPerTask: eligible ? result.policy?.maxRetriesPerTask : 0 };
}

function cli(argv: string[], deps: RuntimeDeps): string {
  if (argv[0] !== "report") throw new Error("invalid-invocation");
  const options: { root: string; json: boolean; vendor?: string; [key: string]: unknown } = { root: deps.proc.cwd(), json: false };
  const seen = new Set<string>();
  for (let index = 1; index < argv.length; index++) {
    const flag = argv[index];
    if (!["--root", "--vendor", "--json"].includes(flag) || seen.has(flag)) throw new Error("invalid-invocation");
    seen.add(flag);
    if (flag === "--json") options.json = true;
    else {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error("invalid-invocation");
      options[flag.slice(2)] = value;
    }
  }
  const result = report(options.root, options.vendor as string, deps);
  return options.json ? JSON.stringify(result, null, 2) : `Orca policy: ${result.reason}; normal workflow; dispatch disabled.`;
}

export function main(argv: string[], deps: RuntimeDeps = defaultDeps()): number {
  try { deps.io.stdout.write(`${cli(argv, deps)}\n`); return 0; }
  catch { deps.io.stderr.write("orca-policy: invalid invocation or internal failure\n"); return 1; }
}

runDirect(import.meta.url, main);
