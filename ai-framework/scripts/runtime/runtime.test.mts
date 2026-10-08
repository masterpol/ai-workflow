import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { createNodeDeps } from "./node.mts";
import { createBunDeps } from "./bun.mts";
import { loadDotenv, parseDotenv } from "./env.mts";
import { RUNNER_VAR, resolveRunner, selectRuntime } from "./select.mts";
import type { RuntimeDeps } from "./types.mts";

const here = fileURLToPath(new URL(".", import.meta.url));
import * as entry from "./entry.mts";
import type { TestContext } from "node:test";
const underBun = typeof (globalThis as unknown as { Bun?: unknown }).Bun !== "undefined";

function scratch(): string {
  return realpathSync(mkdtempSync(join(tmpdir(), "runtime-test-")));
}

const adapters: Array<[string, () => RuntimeDeps]> = [["node", () => createNodeDeps({})]];
if (underBun) adapters.push(["bun", () => createBunDeps({})]);

test("entry root inference agrees for script and hook layouts", () => {
  const root = join(here, "fixture");
  for (const relative of ["ai-framework/scripts/tool.mts", "ai-framework/hooks/scripts/tool.mts", ".claude/hooks/tool.mts"]) {
    assert.equal(entry.inferRoot(join(root, relative)), root);
  }
});

for (const [name, make] of adapters) {
  test(`${name} adapter: child preserves non-UTF8 bytes and status`, () => {
    const deps = make();
    const result = deps.child.runBytesSync(deps.proc.execPath, ["-e", "process.stdout.write(Buffer.from([0,255,128,10])); process.stderr.write(Buffer.from([254])); process.exitCode=3"]);
    assert.equal(result.status, 3);
    assert.equal(result.signal, null);
    assert.deepEqual([...result.stdout], [0, 255, 128, 10]);
    assert.deepEqual([...result.stderr], [254]);
  });
  test(`${name} adapter: stream error subscription can be removed`, () => {
    const deps = make();
    const before = process.stdout.listenerCount("error");
    const remove = deps.io.stdout.onError?.(() => {});
    assert.equal(typeof remove, "function");
    assert.equal(process.stdout.listenerCount("error"), before + 1);
    remove?.();
    assert.equal(process.stdout.listenerCount("error"), before);
  });
  test(`${name} adapter: fs round trip, sync and async`, async () => {
    const deps = make();
    const dir = scratch();
    try {
      const file = join(dir, "a.txt");
      deps.fs.writeFileSync(file, "sync");
      assert.equal(deps.fs.readFileSync(file), "sync");
      await deps.fs.writeFile(file, "async");
      assert.equal(await deps.fs.readFile(file), "async");
      assert.equal(await deps.fs.exists(file), true);
      assert.equal(await deps.fs.exists(dir), true, "directories exist");
      assert.equal(await deps.fs.exists(join(dir, "missing")), false);
      assert.equal(deps.fs.existsSync(join(dir, "missing")), false);
      deps.fs.mkdirSync(join(dir, "x", "y"));
      assert.deepEqual(deps.fs.readdirSync(dir).sort(), ["a.txt", "x"]);
      assert.deepEqual(await deps.fs.readdir(dir), deps.fs.readdirSync(dir));
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  test(`${name} adapter: realpath resolves the macOS /var alias`, () => {
    const deps = make();
    const dir = scratch();
    try {
      const link = join(dir, "link");
      symlinkSync(dir, link);
      assert.equal(deps.fs.realpathSync(link), dir);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  test(`${name} adapter: sha256 matches the known digest`, () => {
    const deps = make();
    assert.equal(deps.crypto.sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    assert.equal(deps.crypto.sha256Hex(new TextEncoder().encode("abc")), deps.crypto.sha256Hex("abc"));
  });

  test(`${name} adapter: child runSync and run agree on output, status and input`, async () => {
    const deps = make();
    const script = "process.stdout.write(require('fs').readFileSync(0,'utf8').toUpperCase()); process.stderr.write('e'); process.exit(3)";
    const sync = deps.child.runSync(deps.proc.execPath, ["-e", script], { input: "hi" });
    const async = await deps.child.run(deps.proc.execPath, ["-e", script], { input: "hi" });
    assert.deepEqual(sync, { status: 3, signal: null, stdout: "HI", stderr: "e" });
    assert.deepEqual(async, sync);
  });

  test(`${name} adapter: timeout kills a hung child`, async () => {
    const deps = make();
    const result = await deps.child.run(deps.proc.execPath, ["-e", "setTimeout(()=>{},60000)"], { timeoutMs: 200 });
    assert.equal(result.status, null);
    assert.equal(result.signal, "SIGKILL");
    assert.equal(result.errorCode, "ETIMEDOUT");
  });

  test(`${name} adapter: output over maxBufferBytes stops the child and reports ENOBUFS`, async () => {
    const deps = make();
    const result = await deps.child.run(deps.proc.execPath, ["-e", "process.stdout.write('x'.repeat(2e6)); setTimeout(()=>{},60000)"], { maxBufferBytes: 1000, timeoutMs: 20000 });
    assert.equal(result.errorCode, "ENOBUFS");
    assert.ok(result.stdout.length <= 1000 + 70000);
  });

  test(`${name} adapter: a grandchild holding the pipe open does not outlast the timeout`, async () => {
    const deps = make();
    const script = "require('child_process').spawn('sleep',['6'],{stdio:['ignore','inherit','inherit'],detached:true}).unref(); setTimeout(()=>{},60000)";
    const started = Date.now();
    const result = await deps.child.run(deps.proc.execPath, ["-e", script], { timeoutMs: 300 });
    assert.equal(result.errorCode, "ETIMEDOUT");
    assert.ok(Date.now() - started < 3000, `waited ${Date.now() - started} ms`);
  });

  test(`${name} adapter: clock is monotonic and io writes through`, () => {
    const deps = make();
    const a = deps.clock.monotonicMs();
    assert.ok(deps.clock.monotonicMs() >= a);
    assert.ok(deps.clock.now() > 1.7e12);
    assert.equal(typeof deps.os.tmpdir(), "string");
  });
}

for (const [name, make] of adapters) {
  test(`${name} adapter: extended fs surface behaves like node:fs`, async () => {
    const deps = make();
    const dir = scratch();
    const fs = deps.fs;
    try {
      const file = join(dir, "f");
      fs.writeFileSync(file, "abc", { mode: 0o600, flag: "wx" });
      assert.throws(() => fs.writeFileSync(file, "again", { flag: "wx" }), /EEXIST/);
      assert.deepEqual([...fs.readBytesSync(file)], [97, 98, 99]);
      fs.appendFileSync(file, "d");
      assert.equal(fs.readFileSync(file), "abcd");
      assert.equal(fs.statSync(file).size, 4);
      assert.equal(fs.statSync(file).isFile(), true);
      assert.equal(fs.lstatSync(dir).isDirectory(), true);
      symlinkSync(file, join(dir, "link"));
      assert.equal(fs.lstatSync(join(dir, "link")).isSymbolicLink(), true);
      assert.equal(fs.readlinkSync(join(dir, "link")), file);
      assert.deepEqual(fs.readdirEntriesSync(dir).map((e) => [e.name, e.isDirectory()]).sort(), [["f", false], ["link", false]]);
      fs.mkdirSync(join(dir, "a", "b"));
      assert.throws(() => fs.mkdirSync(join(dir, "x", "y"), { recursive: false }), /ENOENT/);
      fs.copyFileSync(file, join(dir, "copy"));
      assert.throws(() => fs.copyFileSync(file, join(dir, "copy"), fs.constants.COPYFILE_EXCL), /EEXIST/);
      fs.renameSync(join(dir, "copy"), join(dir, "moved"));
      fs.unlinkSync(join(dir, "moved"));
      assert.equal(fs.existsSync(join(dir, "moved")), false);
      fs.accessSync(file, fs.constants.F_OK);
      assert.throws(() => fs.accessSync(join(dir, "nope")), /ENOENT/);
      const fd = fs.openSync(join(dir, "fd"), "wx", 0o600);
      fs.writeSync(fd, "xyz");
      fs.fsyncSync(fd);
      fs.fchmodSync(fd, 0o640);
      assert.equal(fs.fstatSync(fd).size, 3);
      fs.closeSync(fd);
      const rd = fs.openSync(join(dir, "fd"), fs.constants.O_RDONLY);
      const buffer = new Uint8Array(3);
      assert.equal(fs.readSync(rd, buffer, 0, 3, null), 3);
      fs.closeSync(rd);
      assert.equal(new TextDecoder().decode(buffer), "xyz");
      fs.chmodSync(file, 0o644);
      fs.rmSync(join(dir, "a"), { recursive: true, force: true });
      fs.rmSync(join(dir, "gone"), { force: true });
      fs.mkdirSync(join(dir, "empty"));
      fs.rmdirSync(join(dir, "empty"));
      assert.ok(fs.mkdtempSync(join(dir, "t-")).startsWith(join(dir, "t-")));
      // async twins
      await fs.mkdir(join(dir, "m", "n"));
      await fs.writeFile(join(dir, "m", "w"), "w", { flag: "wx" });
      await assert.rejects(fs.writeFile(join(dir, "m", "w"), "w", { flag: "wx" }), /EEXIST/);
      await fs.copyFile(join(dir, "m", "w"), join(dir, "m", "w2"));
      await fs.rename(join(dir, "m", "w2"), join(dir, "m", "w3"));
      assert.equal((await fs.stat(join(dir, "m", "w3"))).size, 1);
      assert.equal((await fs.lstat(join(dir, "link"))).isSymbolicLink(), true);
      assert.equal(await fs.realpath(join(dir, "link")), file);
      assert.deepEqual((await fs.readdirEntries(join(dir, "m"))).map((e) => e.name).sort(), ["n", "w", "w3"]);
      await fs.access(file);
      assert.ok((await fs.mkdtemp(join(dir, "u-"))).includes("u-"));
      await fs.rm(join(dir, "m"), { recursive: true, force: true });
      assert.equal(fs.existsSync(join(dir, "m")), false);
      assert.equal(typeof fs.constants.O_RDONLY, "number");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  test(`${name} adapter: random, sha256 bytes, clock, proc and io`, async () => {
    const deps = make();
    assert.equal(deps.crypto.randomBytes(8).length, 8);
    assert.notDeepEqual(deps.crypto.randomBytes(8), deps.crypto.randomBytes(8));
    assert.match(deps.crypto.randomUUID(), /^[0-9a-f]{8}-[0-9a-f]{4}-/);
    const bytes = deps.crypto.sha256Bytes("abc");
    assert.equal(bytes.length, 32);
    assert.equal(Buffer.from(bytes).toString("hex"), deps.crypto.sha256Hex("abc"));
    const started = deps.clock.perfNowMs();
    await deps.clock.sleep(20);
    assert.ok(deps.clock.perfNowMs() - started >= 15);
    assert.equal(typeof deps.proc.pid, "number");
    assert.equal(deps.proc.platform, process.platform);
    assert.equal(typeof deps.proc.versions.node, "string");
    deps.proc.kill(deps.proc.pid, 0);
    assert.throws(() => deps.proc.kill(2 ** 22 + 12345, 0), (error: NodeJS.ErrnoException) => error.code === "ESRCH");
    assert.equal(typeof deps.io.stdout.isTTY, "boolean");
  });

  test(`${name} adapter: child stdio modes and shell`, async () => {
    const deps = make();
    const quiet = deps.child.runSync(deps.proc.execPath, ["-e", "console.log('x'); console.error('y')"], { stdio: "ignore" });
    assert.deepEqual([quiet.status, quiet.stdout, quiet.stderr], [0, "", ""]);
    const shell = deps.child.runSync("echo one && echo two 1>&2; exit 2", [], { shell: true });
    assert.deepEqual([shell.status, shell.stdout.trim(), shell.stderr.trim()], [2, "one", "two"]);
    const asyncShell = await deps.child.run("echo hi", [], { shell: true });
    assert.equal(asyncShell.stdout.trim(), "hi");
    assert.throws(() => deps.child.runSync("definitely-not-a-command-xyz", []), (error: NodeJS.ErrnoException) => error.code === "ENOENT");
  });

  test(`${name} adapter: child raw bytes, killSignal and timeout error code`, () => {
    const deps = make();
    const bin = deps.child.runSync(deps.proc.execPath, ["-e", "process.stdout.write(Buffer.from([0,255,128,10]))"], { encoding: "buffer" });
    assert.deepEqual([...bin.stdoutBytes!], [0, 255, 128, 10]);
    assert.equal(deps.child.runSync(deps.proc.execPath, ["-e", "1"]).stdoutBytes, undefined);
    const slow = deps.child.runSync(deps.proc.execPath, ["-e", "setTimeout(()=>{},60000)"], { timeoutMs: 200, killSignal: "SIGTERM" });
    assert.equal(slow.signal, "SIGTERM");
    assert.equal(slow.errorCode, "ETIMEDOUT");
  });

  test(`${name} adapter: maxBufferBytes stops a child that floods stdout`, () => {
    const deps = make();
    const flood = deps.child.runSync("/bin/sh", ["-c", "head -c 20000000 /dev/zero"], { maxBufferBytes: 1024 * 1024 });
    assert.equal(flood.errorCode, "ENOBUFS");
    assert.ok(flood.stdout.length < 8 * 1024 * 1024, `buffered ${flood.stdout.length} chars`);
  });

  test(`${name} adapter: net.tryListen is an exclusive lease (busy, release, timeout cleanup)`, async () => {
    const deps = make();
    const port = 36000 + (process.pid % 3000);
    const first = await deps.net.tryListen({ host: "127.0.0.1", port, timeoutMs: 2000 });
    assert.ok("server" in first, JSON.stringify(first));
    const second = await deps.net.tryListen({ host: "127.0.0.1", port, timeoutMs: 2000 });
    assert.deepEqual(second, { busy: true });
    if ("server" in first) await first.server.close();
    const third = await deps.net.tryListen({ host: "127.0.0.1", port, timeoutMs: 2000 });
    assert.ok("server" in third, "released lease can be re-acquired");
    if ("server" in third) await third.server.close();
    const bad = await deps.net.tryListen({ host: "203.0.113.1", port, timeoutMs: 2000 });
    assert.ok("error" in bad && bad.error !== "", JSON.stringify(bad));
  });

  test(`${name} adapter: stdin readText reads everything and rejects with E2BIG over the limit`, async () => {
    const deps = make();
    const script = join(scratch(), "stdin.mts");
    writeFileSync(script, `import { createNodeDeps } from ${JSON.stringify(new URL("./node.mts", import.meta.url).href)};
const deps = createNodeDeps();
try { process.stdout.write("ok:" + (await deps.io.stdin.readText(Number(process.argv[2])))); } catch (error) { process.stdout.write("err:" + error.code); }`);
    const flags = deps.runtime === "node" ? ["--experimental-strip-types", "--disable-warning=ExperimentalWarning"] : [];
    const small = await deps.child.run(deps.proc.execPath, [...flags, script, "100"], { input: "hello" });
    assert.equal(small.stdout, "ok:hello");
    const big = await deps.child.run(deps.proc.execPath, [...flags, script, "3"], { input: "hello" });
    assert.equal(big.stdout, "err:E2BIG");
    rmSync(join(script, ".."), { recursive: true, force: true });
  });
}

test("bun adapter refuses to build outside Bun", { skip: underBun }, () => {
  assert.throws(() => createBunDeps({}), /requires running under Bun/);
});

test("resolveRunner: unset or node selects node, bun selects bun, anything else fails fast", () => {
  assert.equal(resolveRunner({}), "node");
  assert.equal(resolveRunner({ [RUNNER_VAR]: "" }), "node");
  assert.equal(resolveRunner({ [RUNNER_VAR]: "Node" }), "node");
  assert.equal(resolveRunner({ [RUNNER_VAR]: " BUN " }), "bun");
  assert.throws(() => resolveRunner({ [RUNNER_VAR]: "deno" }), /must be "bun" or unset; got "deno"/);
});

test("parseDotenv: comments, export, quotes, inline comments, bad keys", () => {
  const parsed = parseDotenv(["# c", "A=1", "export B='two words'", 'C="x # y"', "D=z # tail", "1BAD=no", "E", "", "F ="].join("\n"));
  assert.deepEqual(parsed, { A: "1", B: "two words", C: "x # y", D: "z", F: "" });
});

test("loadDotenv: process env wins, missing .env is a no-op, symlink escaping the root is ignored", () => {
  const deps = createNodeDeps({});
  const root = scratch();
  const outside = scratch();
  try {
    assert.deepEqual(loadDotenv(deps.fs, deps.path, root, { X: "1" }), { X: "1" });
    writeFileSync(join(root, ".env"), `${RUNNER_VAR}=bun\nX=file\n`);
    assert.deepEqual(loadDotenv(deps.fs, deps.path, root, { X: "env" }), { [RUNNER_VAR]: "bun", X: "env" });
    rmSync(join(root, ".env"));
    writeFileSync(join(outside, "stolen"), `${RUNNER_VAR}=bun\n`);
    symlinkSync(join(outside, "stolen"), join(root, ".env"));
    assert.deepEqual(loadDotenv(deps.fs, deps.path, root, {}), {});
  } finally { rmSync(root, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }); }
});

test(".env that is a directory, oversize or a FIFO contributes nothing and never blocks or throws", () => {
  const deps = createNodeDeps({});
  const root = scratch();
  try {
    mkdirSync(join(root, ".env"));
    assert.deepEqual(loadDotenv(deps.fs, deps.path, root, { X: "1" }), { X: "1" });
    assert.equal(entry.readRunner(root, {}, deps), "node");
    rmSync(join(root, ".env"), { recursive: true });
    writeFileSync(join(root, ".env"), `${RUNNER_VAR}=bun\n${"#".repeat(70 * 1024)}\n`);
    assert.deepEqual(loadDotenv(deps.fs, deps.path, root, {}), {});
    assert.equal(entry.readRunner(root, {}), "node");
    rmSync(join(root, ".env"));
    if (spawnSync("mkfifo", [join(root, ".env")]).status === 0) {
      assert.deepEqual(loadDotenv(deps.fs, deps.path, root, {}), {}); // would hang on a read
      assert.equal(entry.readRunner(root, {}), "node");
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("an invalid runner value is quoted and capped in the error, never echoed raw", () => {
  assert.throws(() => resolveRunner({ [RUNNER_VAR]: "x\u001b[31m" + "y".repeat(100) }), (error: Error) => !error.message.includes("\u001b") && error.message.length < 120);
  assert.throws(() => entry.readRunner("/nonexistent-root", { [RUNNER_VAR]: "x\u001b[31m" }), (error: Error) => !error.message.includes("\u001b"));
});

test("selectRuntime: reads the runner from the trusted root .env; env var beats .env", async () => {
  const root = scratch();
  try {
    assert.equal((await selectRuntime(root, {})).runtime, "node");
    writeFileSync(join(root, ".env"), `${RUNNER_VAR}=bun\n`);
    if (underBun) assert.equal((await selectRuntime(root, {})).runtime, "bun");
    else await assert.rejects(selectRuntime(root, {}), /requires running under Bun/);
    assert.equal((await selectRuntime(root, { [RUNNER_VAR]: "node" })).runtime, "node");
    await assert.rejects(selectRuntime(root, { [RUNNER_VAR]: "deno" }), /must be "bun" or unset/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("selectRuntime: the project .env picks the runner but none of its other variables reach proc.env", async () => {
  const root = scratch();
  try {
    writeFileSync(join(root, ".env"), `OPENAI_API_KEY=sk-not-real\nNODE_OPTIONS=--require=/nonexistent\n${RUNNER_VAR}=node\n`);
    const deps = await selectRuntime(root, { PATH: "/usr/bin" });
    assert.deepEqual(deps.proc.env, { PATH: "/usr/bin", [RUNNER_VAR]: "node" });
    const seen = deps.child.runSync(deps.proc.execPath, ["-e", "process.stdout.write(String(process.env.OPENAI_API_KEY)+String(process.env.NODE_OPTIONS))"], { env: deps.proc.env });
    assert.equal(seen.stdout, "undefinedundefined");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("entry.mts readRunner agrees with env.mts on every fixture", () => {
  const root = scratch();
  const deps = createNodeDeps({});
  try {
    for (const body of ["", `${RUNNER_VAR}=bun`, `export ${RUNNER_VAR}="bun"`, `${RUNNER_VAR}='node'`, `# ${RUNNER_VAR}=bun`, `${RUNNER_VAR}=bun # tail`, `X=1\n${RUNNER_VAR}= node `]) {
      writeFileSync(join(root, ".env"), body);
      assert.equal(entry.readRunner(root, {}), resolveRunner(loadDotenv(deps.fs, deps.path, root, {})), JSON.stringify(body));
    }
    assert.equal(entry.readRunner(root, { [RUNNER_VAR]: "node" }), "node");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

const nodeExecutable = spawnSync("node", ["-p", "process.execPath"], { encoding: "utf8" }).stdout.trim();
const bunAvailable = spawnSync("bun", ["--version"], { encoding: "utf8" }).status === 0;

function commandFixture(t: TestContext): { root: string; script: string } {
  const root = scratch();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const runtime = join(root, "ai-framework/scripts/runtime");
  mkdirSync(runtime, { recursive: true });
  for (const file of readdirSync(here)) {
    if (file.endsWith(".mts") && !file.endsWith(".test.mts")) copyFileSync(join(here, file), join(runtime, file));
  }
  const script = join(root, "ai-framework/scripts/fixture.mts");
  writeFileSync(script, `import { runDirect } from "./runtime/cli.mts";
import type { RuntimeDeps } from "./runtime/types.mts";
export function main(argv: string[], deps: RuntimeDeps): number {
  if (argv[0] === "host") { deps.io.stdout.write(process.versions.bun ? "bun" : "node"); return 0; }
  if (argv[0] === "signal") { deps.proc.kill(deps.proc.pid, "SIGTERM"); return 0; }
  deps.io.stdout.write(JSON.stringify({ argv, procArgv: deps.proc.argv, runtime: deps.runtime,
    key: deps.proc.env.OPENAI_API_KEY ?? null, options: deps.proc.env.NODE_OPTIONS ?? null }));
  return argv[0] === "exit" ? 7 : 0;
}
runDirect(import.meta.url, main);
`);
  return { root, script };
}
function direct(script: string, args: string[] = [], env: Record<string, string | undefined> = {}, runner = nodeExecutable) {
  return spawnSync(runner, [...(runner === nodeExecutable ? entry.NODE_FLAGS : []), script, ...args], {
    encoding: "utf8", timeout: 10000,
    env: { ...process.env, [RUNNER_VAR]: "node", OPENAI_API_KEY: undefined, NODE_OPTIONS: undefined, ...env },
  });
}

test("direct entries execute on the selected host in both directions", { skip: !bunAvailable }, (t) => {
  const { script } = commandFixture(t);
  for (const [bootstrap, selected] of [[nodeExecutable, "bun"], ["bun", "node"]]) {
    const result = direct(script, ["host"], { [RUNNER_VAR]: selected }, bootstrap);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, selected);
  }
});

test("Bun bootstrap fails once when selected Node is missing, without falling back", { skip: !bunAvailable }, (t) => {
  const { root, script } = commandFixture(t);
  const bunExecutable = spawnSync("bun", ["-e", "process.stdout.write(process.execPath)"], { encoding: "utf8" }).stdout;
  const result = direct(script, ["host"], { PATH: root, [RUNNER_VAR]: "node" }, bunExecutable);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr.trim(), 'AI_WORKFLOW_RUNNER=node but "node" was not found on PATH');
});

test("direct TypeScript command preserves arguments and exit status without launcher output", (t) => {
  const { script } = commandFixture(t);
  const args = ["exit", "a b", "", "--json", "quotes\"'", "$literal"];
  const result = direct(script, args);
  assert.equal(result.status, 7, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), { argv: args, procArgv: args, runtime: "node", key: null, options: null });
});

test("direct TypeScript command supports Node with type stripping disabled in NODE_OPTIONS", (t) => {
  const { script } = commandFixture(t);
  const result = direct(script, ["flag"], { NODE_OPTIONS: "--no-experimental-strip-types" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).argv, ["flag"]);
});

test("library imports never run main or load an invalid project runner", (t) => {
  const { root, script } = commandFixture(t);
  writeFileSync(join(root, ".env"), `${RUNNER_VAR}=deno\n`);
  const consumer = join(root, "consumer.mts");
  writeFileSync(consumer, `import { main } from "./ai-framework/scripts/fixture.mts";
process.stdout.write(typeof main);`);
  const result = direct(consumer, [], { [RUNNER_VAR]: undefined });
  assert.deepEqual([result.status, result.stdout, result.stderr], [0, "function", ""]);
  assert.equal(readFileSync(script, "utf8").includes("runDirect"), true);
});

test("direct invocation through a symlink executes once, and importing that symlink remains quiet", (t) => {
  const { root, script } = commandFixture(t);
  const link = join(root, "command.mts");
  symlinkSync(script, link);
  const result = direct(link, ["symlink"]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).argv, ["symlink"]);
  const consumer = join(root, "consumer.mts");
  writeFileSync(consumer, 'import "./command.mts";\n');
  assert.deepEqual([direct(consumer).status, direct(consumer).stdout, direct(consumer).stderr], [0, "", ""]);
});

test("direct command reports an invalid runner once without a stack trace", (t) => {
  const { script } = commandFixture(t);
  const result = direct(script, [], { [RUNNER_VAR]: "deno" });
  assert.deepEqual([result.status, result.stdout, result.stderr], [1, "", `${RUNNER_VAR} must be "bun" or unset; got "deno"\n`]);
});

test("direct command reports missing Bun once when the selected runner is not on PATH", (t) => {
  const { root, script } = commandFixture(t);
  const result = direct(script, [], { [RUNNER_VAR]: "bun", PATH: join(root, "empty-path") });
  assert.deepEqual([result.status, result.stdout, result.stderr], [1, "", 'AI_WORKFLOW_RUNNER=bun but "bun" was not found on PATH\n']);
});

test("reports a nonexecutable Bun on PATH with a launch error", (t) => {
  const { root, script } = commandFixture(t);
  const bin = join(root, "bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "bun"), "#!/bin/sh\nexit 0\n", { mode: 0o644 });
  const result = direct(script, [], { [RUNNER_VAR]: "bun", PATH: bin });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /EACCES/);
  assert.equal(result.stderr.trim().split("\n").length, 1);
});

test("runtime CLI invoked through a symlink executes the requested module", (t) => {
  const { root, script } = commandFixture(t);
  const link = join(root, "cli.mts");
  symlinkSync(join(root, "ai-framework/scripts/runtime/cli.mts"), link);
  const result = direct(link, [script, "exit", "CLI argument"]);
  assert.equal(result.status, 7, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).argv, ["exit", "CLI argument"]);
  assert.equal(result.stderr, "");
});

test("direct command loads only the runner from dotenv and keeps process environment precedence", (t) => {
  const { root, script } = commandFixture(t);
  writeFileSync(join(root, ".env"), `OPENAI_API_KEY=dotenv-key\nNODE_OPTIONS=--require=/nonexistent\n${RUNNER_VAR}=bun\n`);
  const result = direct(script, [], { OPENAI_API_KEY: "process-key", [RUNNER_VAR]: "node" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { argv: [], procArgv: [], runtime: "node", key: "process-key", options: null });
});

test("dotenv selecting Bun re-executes under Bun without importing dotenv keys or NODE_OPTIONS", { skip: !bunAvailable }, (t) => {
  const { root, script } = commandFixture(t);
  writeFileSync(join(root, ".env"), `OPENAI_API_KEY=dotenv-key\nNODE_OPTIONS=--require=/nonexistent\n${RUNNER_VAR}=bun\n`);
  const result = direct(script, ["exit"], { [RUNNER_VAR]: undefined });
  assert.equal(result.status, 7, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), { argv: ["exit"], procArgv: ["exit"], runtime: "bun", key: null, options: null });
});

test("Bun direct execution keeps the selected runtime and exit code in process", { skip: !bunAvailable }, (t) => {
  const { script } = commandFixture(t);
  const result = direct(script, ["exit"], { [RUNNER_VAR]: "bun" }, "bun");
  assert.equal(result.status, 7, result.stderr);
  assert.equal(JSON.parse(result.stdout).runtime, "bun");
});

test("direct command preserves a terminating signal from a selected Bun child", { skip: !bunAvailable }, (t) => {
  const { script } = commandFixture(t);
  const result = direct(script, ["signal"], { [RUNNER_VAR]: "bun" });
  assert.deepEqual([result.status, result.signal, result.stdout, result.stderr], [null, "SIGTERM", "", ""]);
});

test("guard: only adapter and entry files import node: modules", () => {
  const allowed = new Set(["node.mts", "bun.mts", "cli.mts", "entry.mts", "types.mts"]);
  for (const file of readdirSync(here)) {
    if (allowed.has(file) || file.endsWith(".test.mts") || !/\.(mts|js)$/.test(file)) continue;
    assert.doesNotMatch(readFileSync(join(here, file), "utf8"), /^import (?!type\b).*from "node:|require\("node:/m, `${file} imports node:*`);
  }
});

test("guard: no any-typed escape hatches in the runtime", () => {
  for (const file of readdirSync(here)) {
    if (!file.endsWith(".mts") || file.endsWith(".test.mts")) continue;
    assert.doesNotMatch(readFileSync(join(here, file), "utf8"), /:\s*any\b|\bas any\b/, `${file} uses any`);
  }
});
