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
 *   excluded by it (see the legacy-lock check in token-consumption.js).
 * - Another program already listening on the derived port, or a sandbox that refuses loopback
 *   sockets, makes the writer skip the event. It never falls back to a different port or to the
 *   old lock, because either would let two writers run at once.
 * - Writers in different network namespaces that share one directory are not excluded.
 * - A waiting process that is itself paused cannot meet its deadline until it is resumed.
 * - Verified on macOS only. Linux and Windows behaviour is not claimed until run there.
 */

const net = require("node:net");
const fs = require("node:fs");
const crypto = require("node:crypto");

const HOST = "127.0.0.1";
// Below the usual ephemeral ranges (macOS 49152+, Linux 32768+), so outgoing connections rarely hold it.
const PORT_BASE = 20000;
const PORT_SPAN = 10000;
const DEFAULT_WAIT_MS = 1000;
const MAX_ATTEMPTS = 40;
const RETRY_MS = 25;

function endpointFor(directory) {
  const canonical = fs.realpathSync(directory);
  const digest = crypto.createHash("sha256").update(canonical).digest();
  return { host: HOST, port: PORT_BASE + (digest.readUInt32BE(0) % PORT_SPAN) };
}

// A monotonic clock: a wall-clock change cannot stretch or cut the wait.
const now = () => Number(process.hrtime.bigint() / 1000000n);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One bind attempt. Resolves { server }, { busy: true } (someone else holds it) or { error: code }.
// Every handler stays attached after the promise settles, so a late "listening" or "error" event
// after a timeout is absorbed: a late listen closes the server rather than leaving a lease nobody holds.
function listenOnce(endpoint, timeoutMs) {
  return new Promise((resolve) => {
    const server = net.createServer((socket) => socket.destroy()); // no protocol: refuse every connection
    let settled = false;
    const settle = (value) => { if (!settled) { settled = true; clearTimeout(timer); resolve(value); } };
    server.on("error", (error) => {
      server.close(() => {});
      settle(error && error.code === "EADDRINUSE" ? { busy: true } : { error: (error && error.code) || "error" });
    });
    const timer = setTimeout(() => { server.close(() => {}); settle({ error: "ETIMEDOUT" }); }, timeoutMs);
    server.listen({ host: endpoint.host, port: endpoint.port, exclusive: true, backlog: 1 }, () => {
      if (settled) { server.close(() => {}); return; }
      settle({ server });
    });
  });
}

function leaseFor(server) {
  let released = null;
  return {
    release() {
      released ||= new Promise((resolve) => server.close(() => resolve()));
      return released;
    },
  };
}

// Returns { lease } or { skip: reason }. Waits at most options.waitMs (monotonic) while another
// writer holds the endpoint; any other bind failure is a skip at once, never a retry on another port.
async function acquire(directory, options = {}) {
  const waitMs = options.waitMs ?? DEFAULT_WAIT_MS;
  let endpoint;
  try { endpoint = endpointFor(directory); } catch (error) {
    return { skip: `metrics lock endpoint unavailable (${error.code || "error"})` };
  }
  // Test-only fault injection: a host that cannot be bound stands in for a sandbox that refuses sockets.
  if (options.hostForTest) endpoint = { ...endpoint, host: options.hostForTest };
  const deadline = now() + waitMs;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const result = await listenOnce(endpoint, Math.max(50, deadline - now()));
    if (result.server) return { lease: leaseFor(result.server) };
    if (!result.busy) return { skip: `metrics lock unavailable (${result.error})` };
    if (now() + RETRY_MS >= deadline) break;
    await sleep(RETRY_MS);
  }
  return { skip: "metrics lock is held by another writer; event not recorded" };
}

// Runs action while holding the lease and always releases it, even when action throws.
// Returns { value } or { skipped: reason }.
async function withLease(directory, action, options = {}) {
  const acquired = await acquire(directory, options);
  if (acquired.skip) return { skipped: acquired.skip };
  try {
    return { value: await action() };
  } finally {
    await acquired.lease.release();
  }
}

module.exports = { acquire, withLease, endpointFor };
