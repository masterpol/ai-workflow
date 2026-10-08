import { runDirect } from "../../scripts/runtime/cli.mts";
/*
 * One writer at a time for a project's metrics directory, held by the kernel instead of a lock file.
 *
 * The holder listens on a loopback TCP endpoint derived from the directory's canonical path. The
 * kernel keeps that endpoint for as long as the holding process keeps the socket open, including
 * while the process is paused, and frees it when the process closes it or dies. Nothing here guesses
 * from a PID, a file's age, or a path that could be renamed underneath it, so a live owner can never
 * be judged stale and have its lock stolen.
 *
 * Contract limits (see .project/pitches/collector-robustness/completion-plan-2026-09-27.md):
 * - Every writer must use this protocol; an old collector that still uses the pathname lock is not
 *   excluded by it (see the legacy-lock check in token-consumption.mts).
 * - Another program already listening on the derived port, or a sandbox that refuses loopback
 *   sockets, makes the writer skip the event. It never falls back to a different port or to the
 *   old lock, because either would let two writers run at once.
 * - Writers in different network namespaces that share one directory are not excluded.
 * - A waiting process that is itself paused cannot meet its deadline until it is resumed.
 * - Verified on macOS only. Linux and Windows behaviour is not claimed until run there.
 *
 * The bind itself is `deps.net.tryListen` (runtime/node.mts): an exclusive loopback listener that refuses
 * every connection, keeps every handler attached after settling (a late listen closes the server, a late
 * accept error never closes a granted lease), and is shared by the Node and Bun adapters.
 */

import type { RuntimeDeps } from "../../scripts/runtime/types.mts";
import { createNodeDeps } from "../../scripts/runtime/node.mts";

const HOST = "127.0.0.1";
// Below the usual ephemeral ranges (macOS 49152+, Linux 32768+), so outgoing connections rarely hold it.
const PORT_BASE = 20000;
const PORT_SPAN = 10000;
const DEFAULT_WAIT_MS = 1000;
const MAX_ATTEMPTS = 40;
const RETRY_MS = 25;

export interface Endpoint { host: string; port: number }
export interface Lease { release(): Promise<void> }
export interface LockOptions {
  waitMs?: number;
  /** Test-only fault injection: a host that cannot be bound stands in for a sandbox that refuses sockets. */
  hostForTest?: string;
}
export type Acquired = { lease: Lease; skip?: undefined } | { skip: string; lease?: undefined };
export type Leased<T> = { value: T; skipped?: undefined } | { skipped: string; value?: undefined };

let nodeDeps: RuntimeDeps | undefined;
/** Lazily created Node deps, so old-signature callers keep working unchanged. */
function defaultDeps(): RuntimeDeps {
  return (nodeDeps ??= createNodeDeps());
}

function codeOf(error: unknown): string | undefined {
  if (error === null || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code ? code : undefined;
}

export function endpointFor(directory: string, deps: RuntimeDeps = defaultDeps()): Endpoint {
  const canonical = deps.fs.realpathSync(directory);
  const digest = deps.crypto.sha256Bytes(canonical);
  const first = new DataView(digest.buffer, digest.byteOffset, 4).getUint32(0, false);
  return { host: HOST, port: PORT_BASE + (first % PORT_SPAN) };
}

function leaseFor(server: { close(): Promise<void> }): Lease {
  let released: Promise<void> | null = null;
  return {
    release() {
      released ||= server.close();
      return released;
    },
  };
}

// Returns { lease } or { skip: reason }. Waits at most options.waitMs (monotonic: a wall-clock change cannot
// stretch or cut the wait) while another writer holds the endpoint; any other bind failure is a skip at once,
// never a retry on another port.
export async function acquire(directory: string, options: LockOptions = {}, deps: RuntimeDeps = defaultDeps()): Promise<Acquired> {
  const waitMs = options.waitMs ?? DEFAULT_WAIT_MS;
  const now = (): number => deps.clock.monotonicMs();
  let endpoint: Endpoint;
  try { endpoint = endpointFor(directory, deps); } catch (error) {
    return { skip: `metrics lock endpoint unavailable (${codeOf(error) || "error"})` };
  }
  if (options.hostForTest) endpoint = { ...endpoint, host: options.hostForTest };
  const deadline = now() + waitMs;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const result = await deps.net.tryListen({ host: endpoint.host, port: endpoint.port, timeoutMs: Math.max(50, deadline - now()) });
    if ("server" in result) return { lease: leaseFor(result.server) };
    if (!("busy" in result)) return { skip: `metrics lock unavailable (${result.error})` };
    if (now() + RETRY_MS >= deadline) break;
    await deps.clock.sleep(RETRY_MS);
  }
  return { skip: "metrics lock is held by another writer; event not recorded" };
}

// Runs action while holding the lease and always releases it, even when action throws.
// Returns { value } or { skipped: reason }.
export async function withLease<T>(directory: string, action: () => T | Promise<T>, options: LockOptions = {}, deps: RuntimeDeps = defaultDeps()): Promise<Leased<T>> {
  const acquired = await acquire(directory, options, deps);
  if (acquired.skip !== undefined) return { skipped: acquired.skip };
  try {
    return { value: await action() };
  } finally {
    await acquired.lease.release();
  }
}

/** No CLI: running the shim directly does nothing and exits 0, as before. */
export function main(): number {
  return 0;
}

runDirect(import.meta.url, main);
