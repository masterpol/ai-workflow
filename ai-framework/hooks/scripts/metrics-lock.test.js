const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawn, spawnSync } = require("node:child_process");
const { after } = require("node:test");
const { acquire, withLease, endpointFor } = require("./metrics-lock.js");

const LOCK_MODULE = path.join(__dirname, "metrics-lock.js");
const BARRIER_MS = 5000; // every wait on a child is bounded; elapsed time is never used as race evidence

// A lease leaked by a broken lock (or a failed assertion) would keep this file's process alive
// forever. Once every test has run, give it two seconds to exit on its own, then end it so the
// failure is reported instead of hanging the run. A passing run exits long before the timer fires.
after(() => { setTimeout(() => process.exit(), 2000).unref(); });

// Asserts that no lease was granted; a lease granted by mistake is released first, so the
// assertion failure is reported instead of leaving a server open.
async function expectRefused(dir, options) {
  const result = await acquire(dir, options);
  if (result.lease) { await result.lease.release(); assert.fail("a lease was granted while another writer held the endpoint"); }
  return result;
}

function directory(t) {
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
})();`;

function startHolder(t, dir) {
  const child = spawn(process.execPath, ["-e", HOLDER, LOCK_MODULE, dir], { stdio: ["pipe", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); });
  const exited = new Promise((resolve) => child.on("exit", (code, signal) => resolve({ code, signal })));
  const line = (text) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no "${text}" from holder within ${BARRIER_MS} ms; saw ${JSON.stringify(output)}`)), BARRIER_MS);
    const check = () => { if (output.includes(text)) { clearTimeout(timer); resolve(); } };
    child.stdout.on("data", check);
    exited.then(() => { check(); clearTimeout(timer); if (!output.includes(text)) reject(new Error(`holder exited before "${text}"; saw ${JSON.stringify(output)}`)); });
    check();
  });
  return { child, line, exited, output: () => output };
}

// The kernel's own report that the process is stopped; a signal having been sent is not enough.
async function stopped(pid) {
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
  assert.match(refused.skip, /held by another writer/);
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
  assert.ok(await stopped(holder.child.pid), "the holder is reported stopped by the kernel");
  const refused = await expectRefused(dir, { waitMs: 300 });
  assert.match(refused.skip, /held by another writer/, "a stopped holder is still the owner");
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
  assert.match((await expectRefused(dir, { waitMs: 100 })).skip, /held by another writer/);
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
  t.after(() => first.lease.release());
  const started = Date.now();
  const refused = await expectRefused(dir, { waitMs: 100 });
  assert.match(refused.skip, /held by another writer/);
  // Tight enough to fail if the caller's waitMs were ignored for the 1 s default, loose enough for a loaded machine.
  assert.ok(Date.now() - started < 700, "the wait ends near the 100 ms deadline, not at the 1 s default");
});

test("another program on the derived endpoint makes the writer skip; it never moves to another port", async (t) => {
  const dir = directory(t);
  const squatter = net.createServer();
  await new Promise((resolve) => squatter.listen({ host: "127.0.0.1", port: endpointFor(dir).port, exclusive: true }, resolve));
  t.after(() => new Promise((resolve) => squatter.close(() => resolve())));
  const refused = await expectRefused(dir, { waitMs: 150 });
  assert.match(refused.skip, /held by another writer/);
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
  assert.match(refused.skip, /metrics lock unavailable \(E[A-Z]+\)/);
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
  await held.lease.release();
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
  const run = spawnSync(process.execPath, ["-e", script, LOCK_MODULE, dir], { encoding: "utf8", timeout: 15000 });
  assert.equal(run.error, undefined, "the process exited by itself instead of being kept alive by a leaked server");
  assert.equal(run.stderr, "");
  assert.equal(run.status, 0);
  assert.equal(run.stdout, "done\n");
  holder.child.stdin.write("release\n");
  await holder.line("released");
});

test("a late accept error on a granted lease does not close it: the endpoint stays held until release", async (t) => {
  const dir = directory(t);
  let server;
  const createServer = net.createServer;
  t.mock.method(net, "createServer", (...args) => (server = createServer(...args)));
  const held = await acquire(dir);
  t.mock.restoreAll();
  assert.ok(held.lease);
  server.emit("error", Object.assign(new Error("accept"), { code: "EMFILE" }));
  await expectRefused(dir, { waitMs: 100 });
  await held.lease.release();
  const next = await acquire(dir, { waitMs: 200 });
  assert.ok(next.lease, "release still frees it");
  await next.lease.release();
});
