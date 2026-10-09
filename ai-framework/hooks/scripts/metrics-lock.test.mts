import { NODE_FLAGS } from "../../scripts/runtime/entry.mts";
const RUNTIME_FLAGS = process.versions.bun ? [] : NODE_FLAGS;
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import type { TestContext } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { RuntimeDeps } from "../../scripts/runtime/types.mts";
import { createNodeDeps } from "../../scripts/runtime/node.mts";
import { acquire, withLease, endpointFor, main } from "./metrics-lock.mts";
import type { Acquired, LockOptions } from "./metrics-lock.mts";

const here = path.dirname(fileURLToPath(import.meta.url));
const LOCK_MODULE = path.join(here, "metrics-lock.mts");
const BARRIER_MS = 5000; // every wait on a child is bounded; elapsed time is never used as race evidence

// A lease leaked by a broken lock (or a failed assertion) would keep this file's process alive
// forever. Once every test has run, give it two seconds to exit on its own, then end it so the
// failure is reported instead of hanging the run. A passing run exits long before the timer fires.
// Node only: `node --test` runs each file in its own process, but `bun test <dir>` runs every file in ONE process,
// where this timer would end the whole run (and its report) two seconds after this file finished.
if (typeof (globalThis as { Bun?: unknown }).Bun === "undefined") after(() => { setTimeout(() => process.exit(), 2000).unref(); });

// Asserts that no lease was granted; a lease granted by mistake is released first, so the
// assertion failure is reported instead of leaving a server open.
async function expectRefused(dir: string, options?: LockOptions, deps?: RuntimeDeps): Promise<Acquired> {
  const result = await acquire(dir, options, deps);
  if (result.lease) { await result.lease.release(); assert.fail("a lease was granted while another writer held the endpoint"); }
  return result;
}

function directory(t: TestContext): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "metrics-lock-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// A holder in its own process: prints "held" once it owns the lease, releases on any stdin input,
// prints "released", then exits because nothing else keeps its event loop alive.
const HOLDER = `
const { acquire } = require(process.argv[1]);
(async () => {
  const held = await acquire(process.argv[2], { waitMs: 3000 });
  if (!held.lease) { process.stdout.write("refused " + held.skip + "\\n"); return; }
  process.stdout.write("held\\n");
  process.stdin.once("data", async () => { await held.lease.release(); process.stdout.write("released\\n"); process.stdin.pause(); });
  process.stdin.once("end", () => process.exit(0)); // the test runner went away: never keep the port
})();`;

interface Holder {
  child: ChildProcessWithoutNullStreams;
  line(text: string): Promise<void>;
  exited: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  output(): string;
}

function watch(t: TestContext, child: ChildProcessWithoutNullStreams): Holder {
  let output = "";
  child.stdout.on("data", (chunk: Buffer) => { output += chunk; });
  // `== null`: under Bun a running child's exitCode is not null, so a strict check never killed a stuck holder.
  t.after(() => { if (child.exitCode == null && child.signalCode == null) child.kill("SIGKILL"); });
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => child.on("exit", (code, signal) => resolve({ code, signal })));
  const line = (text: string): Promise<void> => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no "${text}" from holder within ${BARRIER_MS} ms; saw ${JSON.stringify(output)}`)), BARRIER_MS);
    const check = (): void => { if (output.includes(text)) { clearTimeout(timer); resolve(); } };
    child.stdout.on("data", check);
    void exited.then(() => { check(); clearTimeout(timer); if (!output.includes(text)) reject(new Error(`holder exited before "${text}"; saw ${JSON.stringify(output)}`)); });
    check();
  });
  return { child, line, exited, output: () => output };
}

function startHolder(t: TestContext, dir: string): Holder {
  return watch(t, spawn(process.execPath, [...RUNTIME_FLAGS, "-e", HOLDER, LOCK_MODULE, dir], { stdio: ["pipe", "pipe", "pipe"] }));
}

// The kernel's own report that the process is stopped; a signal having been sent is not enough.
async function stopped(pid: number): Promise<boolean> {
  const deadline = Date.now() + BARRIER_MS;
  while (Date.now() < deadline) {
    const state = spawnSync("ps", ["-o", "stat=", "-p", String(pid)], { encoding: "utf8" }).stdout.trim();
    if (state.startsWith("T")) return true;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return false;
}

test("a live holder in another process excludes a contender, and releasing hands the lease over", async (t) => {
  const dir = directory(t);
  const holder = startHolder(t, dir);
  await holder.line("held");
  const refused = await expectRefused(dir, { waitMs: 200 });
  assert.match(refused.skip as string, /held by another writer/);
  holder.child.stdin.write("release\n");
  await holder.line("released");
  const next = await acquire(dir, { waitMs: 1000 });
  assert.ok(next.lease, "the lease is free once the holder releases it");
  await next.lease.release();
});

test("a paused holder keeps its lease: age never makes it stealable, and it releases after resuming", { skip: process.platform === "win32" }, async (t) => {
  const dir = directory(t);
  const holder = startHolder(t, dir);
  await holder.line("held");
  holder.child.kill("SIGSTOP");
  assert.ok(await stopped(holder.child.pid as number), "the holder is reported stopped by the kernel");
  const refused = await expectRefused(dir, { waitMs: 300 });
  assert.match(refused.skip as string, /held by another writer/, "a stopped holder is still the owner");
  holder.child.kill("SIGCONT");
  holder.child.stdin.write("release\n");
  await holder.line("released");
  const next = await acquire(dir, { waitMs: 1000 });
  assert.ok(next.lease);
  await next.lease.release();
});

test("the holder's death frees the lease with no file to clean up and no PID to judge", async (t) => {
  const dir = directory(t);
  const holder = startHolder(t, dir);
  await holder.line("held");
  assert.match((await expectRefused(dir, { waitMs: 100 })).skip as string, /held by another writer/);
  holder.child.kill("SIGKILL");
  await holder.exited;
  const next = await acquire(dir, { waitMs: 1000 });
  assert.ok(next.lease, "the kernel released the endpoint when the holder died");
  await next.lease.release();
  assert.deepEqual(fs.readdirSync(dir), [], "nothing was written into the directory");
});

test("waiting for a busy lease is bounded by the deadline", async (t) => {
  const dir = directory(t);
  const first = await acquire(dir);
  t.after(() => first.lease?.release());
  const started = Date.now();
  const refused = await expectRefused(dir, { waitMs: 100 });
  assert.match(refused.skip as string, /held by another writer/);
  // Tight enough to fail if the caller's waitMs were ignored for the 1 s default, loose enough for a loaded machine.
  assert.ok(Date.now() - started < 700, "the wait ends near the 100 ms deadline, not at the 1 s default");
});

test("another program on the derived endpoint makes the writer skip; it never moves to another port", async (t) => {
  const dir = directory(t);
  const squatter = net.createServer();
  await new Promise<void>((resolve) => squatter.listen({ host: "127.0.0.1", port: endpointFor(dir).port, exclusive: true }, resolve));
  t.after(() => new Promise<void>((resolve) => squatter.close(() => resolve())));
  const refused = await expectRefused(dir, { waitMs: 150 });
  assert.match(refused.skip as string, /held by another writer/);
  assert.equal(refused.lease, undefined);
});

test("the endpoint is derived from the canonical path, so every spelling of one directory shares it", (t) => {
  const dir = directory(t);
  const link = path.join(directory(t), "alias");
  fs.symlinkSync(dir, link);
  assert.deepEqual(endpointFor(link), endpointFor(dir));
  assert.deepEqual(endpointFor(path.join(dir, ".", "..", path.basename(dir))), endpointFor(dir));
  assert.equal(endpointFor(dir).host, "127.0.0.1", "loopback only");
  const other = directory(t);
  assert.ok(endpointFor(other).port >= 20000 && endpointFor(other).port < 30000);
});

test("a socket error other than 'in use' fails closed at once instead of retrying or falling back", async (t) => {
  const dir = directory(t);
  const started = Date.now();
  const refused = await expectRefused(dir, { hostForTest: "192.0.2.1", waitMs: 5000 }); // TEST-NET-1: never a local address
  assert.match(refused.skip as string, /metrics lock unavailable \(E[A-Z]+\)/);
  assert.ok(Date.now() - started < 2500, "no waiting out the full 5 s deadline for an error that will not clear");
  assert.equal(fs.existsSync(path.join(dir, ".token-consumption.lock")), false, "never falls back to a pathname lock");
});

test("withLease releases the lease when the action returns and when it throws", async (t) => {
  const dir = directory(t);
  assert.deepEqual(await withLease(dir, () => 42), { value: 42 });
  await assert.rejects(() => withLease(dir, () => { throw new Error("boom"); }), /boom/);
  await assert.rejects(() => withLease(dir, async () => { throw new Error("async boom"); }), /async boom/);
  const next = await acquire(dir, { waitMs: 100 });
  assert.ok(next.lease, "the throwing action did not leave the lease held");
  await next.lease.release();
  await next.lease.release(); // idempotent
});

test("a connection to the endpoint is refused and does not keep the lease alive after release", async (t) => {
  const dir = directory(t);
  const held = await acquire(dir);
  const client = net.connect(endpointFor(dir));
  const closed = new Promise((resolve) => { client.on("close", resolve); client.on("error", () => {}); });
  await closed;
  await held.lease?.release();
  const next = await acquire(dir, { waitMs: 200 });
  assert.ok(next.lease, "a refused connection did not hold the port after release");
  await next.lease.release();
});

test("timing out repeatedly leaves no stray server or unhandled event: the process exits on its own", async (t) => {
  const dir = directory(t);
  const holder = startHolder(t, dir);
  await holder.line("held");
  const script = `
const { acquire } = require(process.argv[1]);
process.on("unhandledRejection", (error) => { process.stderr.write("unhandled " + error + "\\n"); process.exitCode = 3; });
process.on("uncaughtException", (error) => { process.stderr.write("uncaught " + error + "\\n"); process.exitCode = 4; });
(async () => {
  for (let index = 0; index < 20; index += 1) {
    const result = await acquire(process.argv[2], { waitMs: 30 });
    if (result.lease) { process.stderr.write("unexpected lease\\n"); process.exitCode = 5; await result.lease.release(); }
  }
  process.stdout.write("done\\n");
})();`;
  const run = spawnSync(process.execPath, [...RUNTIME_FLAGS, "-e", script, LOCK_MODULE, dir], { encoding: "utf8", timeout: 15000 });
  assert.equal(run.error, undefined, "the process exited by itself instead of being kept alive by a leaked server");
  assert.equal(run.stderr, "");
  assert.equal(run.status, 0);
  assert.equal(run.stdout, "done\n");
  holder.child.stdin.write("release\n");
  await holder.line("released");
});

test("a late accept error on a granted lease does not close it: the endpoint stays held until release", async (t) => {
  const dir = directory(t);
  // The listener now lives in the runtime adapter (deps.net.tryListen), which imports node:net as an ES module.
  // Capturing it through the shared Server prototype reaches that instance under both Node and Bun, where
  // mocking the CommonJS createServer export (as the old test did) no longer does.
  const servers: net.Server[] = [];
  const listen = net.Server.prototype.listen;
  t.mock.method(net.Server.prototype, "listen", function (this: net.Server, ...args: unknown[]) {
    servers.push(this);
    return (listen as (...rest: unknown[]) => net.Server).apply(this, args);
  });
  const held = await acquire(dir);
  t.mock.restoreAll();
  assert.ok(held.lease);
  assert.equal(servers.length, 1);
  servers[0].emit("error", Object.assign(new Error("accept"), { code: "EMFILE" }));
  await expectRefused(dir, { waitMs: 100 });
  await held.lease.release();
  const next = await acquire(dir, { waitMs: 200 });
  assert.ok(next.lease, "release still frees it");
  await next.lease.release();
});

// ---- ts-runtime-injection K2: lease semantics through deps.net on the Node AND Bun adapters ----

const inBun = typeof (globalThis as { Bun?: unknown }).Bun !== "undefined";
const runtimeDir = path.join(here, "..", "..", "scripts", "runtime");
/** The adapter of the runtime running this file: Bun deps under `bun test`, Node deps under `node --test`. */
async function adapterDeps(): Promise<RuntimeDeps> {
  if (!inBun) return createNodeDeps();
  const { createBunDeps } = (await import(pathToFileURL(path.join(runtimeDir, "bun.mts")).href)) as { createBunDeps(): RuntimeDeps };
  return createBunDeps();
}
const ADAPTER = inBun ? "bun" : "node";
const bunAvailable = spawnSync("bun", ["--version"], { encoding: "utf8" }).status === 0;

// A holder that builds the deps of the runtime it runs under (Bun deps under bun, Node deps under node) and
// passes them explicitly, so the lease it holds goes through that adapter's deps.net.tryListen.
const ADAPTER_HOLDER = `
(async () => {
  const lock = await import(process.env.G9_LOCK_URL);
  const deps = typeof Bun !== "undefined"
    ? (await import(process.env.G9_BUN_URL)).createBunDeps()
    : (await import(process.env.G9_NODE_URL)).createNodeDeps();
  const held = await lock.acquire(process.env.G9_DIR, { waitMs: 3000 }, deps);
  if (!held.lease) { process.stdout.write("refused " + held.skip + "\\n"); return; }
  process.stdout.write("held " + deps.runtime + "\\n");
  process.stdin.once("data", async () => { await held.lease.release(); process.stdout.write("released\\n"); process.stdin.pause(); });
  process.stdin.once("end", () => process.exit(0)); // the test runner went away: never keep the port
})();`;

function startAdapterHolder(t: TestContext, runtime: "node" | "bun", dir: string): Holder {
  // Under `bun test` process.execPath is bun, so the Node holder is the `node` on PATH.
  const command = runtime === "bun" ? "bun" : inBun ? "node" : process.execPath;
  const env = {
    ...process.env,
    G9_DIR: dir,
    G9_LOCK_URL: pathToFileURL(path.join(here, "metrics-lock.mts")).href,
    G9_NODE_URL: pathToFileURL(path.join(runtimeDir, "node.mts")).href,
    G9_BUN_URL: pathToFileURL(path.join(runtimeDir, "bun.mts")).href,
  };
  return watch(t, spawn(command, ["-e", ADAPTER_HOLDER], { stdio: ["pipe", "pipe", "pipe"], env }));
}

test(`lease parity (${ADAPTER} adapter): a second acquirer is refused while the first holds, and acquires after release`, async (t) => {
  const deps = await adapterDeps();
  assert.equal(deps.runtime, ADAPTER);
  const dir = directory(t);
  const first = await acquire(dir, { waitMs: 500 }, deps);
  assert.ok(first.lease, "the first acquirer holds the lease");
  const refused = await expectRefused(dir, { waitMs: 150 }, deps);
  assert.match(refused.skip as string, /^metrics lock is held by another writer; event not recorded$/);
  await first.lease.release();
  const second = await acquire(dir, { waitMs: 500 }, deps);
  assert.ok(second.lease, "released after close: the next acquirer gets it");
  await second.lease.release();
  const leased = await withLease(dir, () => "inside", { waitMs: 500 }, deps);
  assert.deepEqual(leased, { value: "inside" });
  assert.deepEqual(fs.readdirSync(dir), [], "the lease never writes a file");
});

test(`lease parity (${ADAPTER} adapter): a bind error other than 'in use' is a skip with its code, never a retry`, async (t) => {
  const deps = await adapterDeps();
  const refused = await expectRefused(directory(t), { hostForTest: "192.0.2.1", waitMs: 3000 }, deps);
  assert.match(refused.skip as string, /^metrics lock unavailable \(E[A-Z]+\)$/);
  const missing = await expectRefused(path.join(directory(t), "missing"), {}, deps);
  assert.equal(missing.skip, "metrics lock endpoint unavailable (ENOENT)");
});

for (const holderRuntime of ["node", "bun"] as const) {
  test(`lease parity across runtimes: a holder on the ${holderRuntime} adapter excludes a contender on the ${ADAPTER} adapter until it releases`, { skip: holderRuntime === "bun" && !bunAvailable ? "bun is not on PATH" : false }, async (t) => {
    const deps = await adapterDeps();
    const dir = directory(t);
    const holder = startAdapterHolder(t, holderRuntime, dir);
    await holder.line(`held ${holderRuntime}`);
    assert.deepEqual(endpointFor(dir, deps), endpointFor(dir, createNodeDeps()), "both adapters derive the same endpoint");
    const refused = await expectRefused(dir, { waitMs: 200 }, deps);
    assert.match(refused.skip as string, /held by another writer/);
    holder.child.stdin.write("release\n");
    await holder.line("released");
    const next = await acquire(dir, { waitMs: 1000 }, deps);
    assert.ok(next.lease, "the lease is free once the other runtime's holder releases it");
    await next.lease.release();
  });
}

// ---- main(): the library has no CLI ----

test("main() is a no-op that returns 0, as running the old library file directly did", () => {
  assert.equal(main(), 0);
  const run = spawnSync(process.execPath, [...RUNTIME_FLAGS, LOCK_MODULE], { encoding: "utf8" });
  assert.equal(run.status, 0);
  assert.equal(run.stdout, "");
  assert.equal(run.stderr, "");
});

// ---- acquire() with in-memory deps: the retry loop, the deadline and the release are driven by deps alone ----

interface FakeNet { deps: RuntimeDeps; calls: { host: string; port: number; timeoutMs: number }[]; closed: number; slept: number[] }
function fakeNet(results: ("busy" | "server" | string)[], clockStep = 0): FakeNet {
  const base = createNodeDeps({});
  const calls: { host: string; port: number; timeoutMs: number }[] = [];
  const slept: number[] = [];
  let time = 1000;
  const state = { closed: 0 };
  const deps: RuntimeDeps = {
    ...base,
    fs: { ...base.fs, realpathSync: (file: string) => file },
    clock: { ...base.clock, monotonicMs: () => (time += clockStep), sleep: async (ms: number) => { slept.push(ms); time += ms; } },
    net: {
      tryListen: async (options) => {
        calls.push(options);
        const next = results.shift() ?? "busy";
        if (next === "busy") return { busy: true };
        if (next === "server") return { server: { close: async () => { state.closed += 1; } } };
        return { error: next };
      },
    },
  };
  return { deps, calls, get closed() { return state.closed; }, slept };
}

test("acquire() with fake deps: busy attempts retry every 25 ms on the same endpoint until a bind succeeds", async () => {
  const f = fakeNet(["busy", "busy", "server"]);
  const result = await acquire("/metrics", { waitMs: 1000 }, f.deps);
  assert.ok(result.lease);
  assert.equal(f.calls.length, 3);
  assert.equal(new Set(f.calls.map((call) => `${call.host}:${call.port}`)).size, 1, "never another port");
  assert.equal(f.calls[0].host, "127.0.0.1");
  assert.deepEqual(f.slept, [25, 25]);
  await result.lease.release();
  await result.lease.release();
  assert.equal(f.closed, 1, "release closes the server once");
});

test("acquire() with fake deps: the monotonic deadline ends the wait, and a non-busy error is an immediate skip", async () => {
  const busy = fakeNet([], 0);
  const refused = await acquire("/metrics", { waitMs: 100 }, busy.deps);
  assert.equal(refused.skip, "metrics lock is held by another writer; event not recorded");
  assert.ok(busy.calls.length <= 5, `stopped near the deadline (${busy.calls.length} attempts)`);
  assert.ok(busy.calls.every((call) => call.timeoutMs >= 50), "each bind gets at least 50 ms");
  const failing = fakeNet(["EACCES"]);
  assert.deepEqual(await acquire("/metrics", {}, failing.deps), { skip: "metrics lock unavailable (EACCES)" });
  assert.equal(failing.calls.length, 1);
  assert.deepEqual(failing.slept, []);
});

test("withLease() with fake deps: a skipped lease never runs the action", async () => {
  const f = fakeNet(["EADDRNOTAVAIL"]);
  let ran = false;
  assert.deepEqual(await withLease("/metrics", () => { ran = true; }, {}, f.deps), { skipped: "metrics lock unavailable (EADDRNOTAVAIL)" });
  assert.equal(ran, false);
});
