import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execFile, spawn, spawnSync, type ChildProcess, type SpawnOptions as NodeSpawnOptions } from "node:child_process";
import * as fs from "node:fs";
import * as nodeModule from "node:module";
import * as fsp from "node:fs/promises";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import { performance } from "node:perf_hooks";

import type { ChildDeps, FsDeps, ListenResult, NetDeps, RunResult, RuntimeDeps, SpawnOptions } from "./types.mts";

function toEnv(env: SpawnOptions["env"]): NodeJS.ProcessEnv | undefined {
  return env as NodeJS.ProcessEnv | undefined;
}

function stdioFor(options: SpawnOptions): "pipe" | "inherit" | "ignore" {
  return options.stdio ?? "pipe";
}

// Keep uncertain children observable until their streams really close. A failed cleanup is
// not evidence that the command (or its descendants) stopped.
const ownedChildren = new Set<ChildProcess>();
const closedChildren = new WeakSet<ChildProcess>();
export function pendingChildPids(): number[] {
  for (const child of ownedChildren) reconcileClosedOwner(child);
  return [...ownedChildren].flatMap(child => child.pid === undefined ? [] : [child.pid]);
}
const CLEANUP_TIMEOUT_MS = 5000;

function cleanupError(child: ChildProcess, cause?: unknown): Error & { code: string; ownerPid: number | undefined } {
  return Object.assign(new Error(
    "Child process cleanup could not be confirmed; ownership remains pending for PID " + child.pid,
    { cause },
  ), { code: "EPROCESSCLEANUP", ownerPid: child.pid });
}

function boundedClose(closed: Promise<void>): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("child streams did not close")), CLEANUP_TIMEOUT_MS);
    closed.then(() => { clearTimeout(timer); resolve(); }, (error) => { clearTimeout(timer); reject(error); });
  });
}


// Sending SIGKILL is not an exit receipt. In particular, a child with ignored
// stdio can still run briefly after its wrapper has closed all of our pipes.
interface ProcessGroupInspection {
  platform: string;
  probe(groupId: number): void;
  pids(): string[];
  stat(pid: string): string;
  mountinfo(): string;
}


function requireVisibleProc(mountinfo: string): void {
  const entries = mountinfo.trim().split("\n").filter(Boolean).map(line => line.split(" "));
  const proc = entries.filter(fields => fields[4] === "/proc");
  const entry = proc[0];
  const separator = entry?.indexOf("-") ?? -1;
  if (proc.length !== 1 || separator < 6 || entry[3] !== "/" || entry[separator + 1] !== "proc" ||
    !entry[separator + 3]) throw new Error("Cannot establish complete /proc visibility");
  const options = [entry[5], entry[separator + 3]].join(",").split(",");
  if (options.some(option => (option.startsWith("hidepid=") && !["hidepid=0", "hidepid=off"].includes(option)) ||
    option.startsWith("pidns=")) ||
    entries.some(fields => /^\/proc\/(?:[0-9]+|self)(?:\/|$)/.test(fields[4] ?? ""))) {
    throw new Error("Cannot establish complete /proc visibility: restricted or overmounted process entries");
  }
}

export function posixGroupIsRunning(groupId: number, inspection: ProcessGroupInspection = {
  platform: process.platform,
  probe: (id) => { process.kill(-id, 0); },
  pids: () => fs.readdirSync("/proc"),
  stat: (pid) => fs.readFileSync(path.join("/proc", pid, "stat"), "utf8"),
  mountinfo: () => fs.readFileSync("/proc/self/mountinfo", "utf8"),
}): boolean {
  try { inspection.probe(groupId); }
  catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ESRCH") return false;
    // macOS answers EPERM for a group whose members are still exiting, then ESRCH once they are gone.
    // Treat it as still running so the caller keeps polling within its deadline.
    if (code === "EPERM" && inspection.platform === "darwin") return true;
    throw error;
  }
  if (inspection.platform !== "linux") return true;

  // A visible zombie alone cannot disprove a hidden live group member. Reject
  // filtered procfs views before accepting any reaping-only exception.
  requireVisibleProc(inspection.mountinfo());
  // Linux containers may retain zombies until PID 1 reaps them. A zombie leader
  // can still have runnable threads: field20 num_threads must prove only that
  // dead leader remains. See proc_pid_stat(5), fields3 and20.
  let observedGroup = false;
  for (const name of inspection.pids()) {
    if (!/^[1-9][0-9]*$/.test(name)) continue;
    let stat: string;
    try { stat = inspection.stat(name); }
    catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "ESRCH") continue; // exited during enumeration
      throw error; // permission/I/O failure is not proof of a clean group
    }
    const open = stat.indexOf(" (");
    const end = stat.lastIndexOf(")");
    const fields = stat.slice(end + 2).trim().split(/\s+/);
    if (open < 1 || end <= open || stat.slice(0, open) !== name ||
      stat[end + 1] !== " " || fields.length < 20 || !/^[A-Za-z]$/.test(fields[0]) ||
      !/^[0-9]+$/.test(fields[2]) || !Number.isSafeInteger(Number(fields[2]))) throw new Error("Unable to verify POSIX process group state");
    if (Number(fields[2]) === groupId) {
      observedGroup = true;
      if (!/^[1-9][0-9]*$/.test(fields[17]) || !Number.isSafeInteger(Number(fields[17]))) {
        throw new Error("Unable to verify POSIX process thread count");
      }
      if (!["Z", "X", "x"].includes(fields[0]) || Number(fields[17]) !== 1) return true;
    }
  }
  if (observedGroup) return false;
  // The group may have disappeared during enumeration. If it still exists but no
  // member is visible (for example a hidepid mount), absence cannot be certified.
  try { inspection.probe(groupId); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return false;
    throw error;
  }
  throw new Error("POSIX process group exists but its members cannot be inspected");
}

async function waitForPosixGroupExit(groupId: number): Promise<void> {
  const deadline = performance.now() + CLEANUP_TIMEOUT_MS;
  while (posixGroupIsRunning(groupId)) {
    if (performance.now() >= deadline) throw new Error("POSIX process group still has executable members");
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
}

// A failed bounded cleanup retains ownership. A later status read can reconcile
// it after both real pipe closure and group termination have become observable.
function reconcileClosedOwner(child: ChildProcess): void {
  if (!closedChildren.has(child)) return;
  try {
    if (process.platform !== "win32" && child.pid !== undefined && posixGroupIsRunning(child.pid)) return;
    ownedChildren.delete(child);
  } catch { /* inability to inspect retains uncertain ownership */ }
}

async function stopOwnedTree(child: ChildProcess, closed: Promise<void>, isClosed: () => boolean, signal: string): Promise<void> {
  if (isClosed() || child.pid === undefined) return;
  let escalation: ReturnType<typeof setTimeout> | undefined;
  try {
    if (process.platform === "win32") {
      // A dead wrapper's PID can be reused and cannot establish descendant ownership.
      if (child.exitCode !== null || child.signalCode !== null) throw new Error("the owning wrapper exited before tree cleanup");
      await new Promise<void>((resolve, reject) => {
        execFile(path.join(process.env.SystemRoot ?? "C:/Windows", "System32/taskkill.exe"),
          ["/PID", String(child.pid), "/T", "/F"],
          { shell: false, windowsHide: true, timeout: CLEANUP_TIMEOUT_MS, killSignal: "SIGKILL" },
          (error) => { if (error && !isClosed()) reject(error); else resolve(); });
      });
    } else {
      // detached establishes an owned POSIX process group; the child is still awaited,
      // never unref'd. Descendants that stay in the group are stopped with their owner.
      const killGroup = (nextSignal: string): void => {
        if (isClosed()) return;
        try { process.kill(-child.pid!, nextSignal as NodeJS.Signals); }
        catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          // macOS answers EPERM for a group that is already exiting; waitForPosixGroupExit still proves the exit.
          if (code !== "ESRCH" && !(code === "EPERM" && process.platform === "darwin")) throw error;
        }
      };
      killGroup(signal);
      if (signal !== "SIGKILL") escalation = setTimeout(() => {
        try { killGroup("SIGKILL"); } catch { /* boundedClose reports uncertain cleanup */ }
      }, 1000);
    }
    await boundedClose(closed);
    if (process.platform !== "win32") await waitForPosixGroupExit(child.pid);
  } catch (error) { throw cleanupError(child, error); }
  finally { if (escalation) clearTimeout(escalation); }
}

/** The child exited before reading all of `input` (EPIPE): the run happened and its exit status is the result, as with Node's spawnSync. */
function inputNotRead(code: string | undefined, result: { status: number | null; signal: string | null }): boolean {
  return code === "EPIPE" && (result.status !== null || result.signal !== null);
}

export const nodeChild: ChildDeps = {
  runBytesSync(command, args, options = {}) {
    const result = spawnSync(command, args, {
      cwd: options.cwd, env: toEnv(options.env), input: options.input, shell: options.shell,
      timeout: options.timeoutMs, killSignal: (options.killSignal ?? "SIGKILL") as NodeJS.Signals,
      maxBuffer: options.maxBufferBytes ?? 64 * 1024 * 1024, stdio: stdioFor(options), windowsHide: true,
    });
    const code = (result.error as NodeJS.ErrnoException | undefined)?.code;
    if (result.error && code !== "ETIMEDOUT" && code !== "ENOBUFS" && !inputNotRead(code, result)) throw result.error;
    return { status: result.status, signal: result.signal, stdout: new Uint8Array(result.stdout ?? []), stderr: new Uint8Array(result.stderr ?? []) };
  },
  runSync(command, args, options = {}) {
    const raw = options.encoding === "buffer";
    const result = spawnSync(command, args, {
      cwd: options.cwd, env: toEnv(options.env), input: options.input, shell: options.shell,
      timeout: options.timeoutMs, killSignal: (options.killSignal ?? "SIGKILL") as NodeJS.Signals, windowsHide: true,
      encoding: raw ? "buffer" : "utf8", maxBuffer: options.maxBufferBytes ?? 64 * 1024 * 1024, stdio: stdioFor(options),
    });
    const code = (result.error as NodeJS.ErrnoException | undefined)?.code;
    if (result.error && code !== "ETIMEDOUT" && code !== "ENOBUFS" && !inputNotRead(code, result)) throw result.error;
    const text = (value: string | Buffer | null | undefined): string => (value == null ? "" : value.toString("utf8"));
    const out: RunResult = { status: result.status, signal: result.signal, stdout: text(result.stdout), stderr: text(result.stderr) };
    if (raw) out.stdoutBytes = result.stdout ? new Uint8Array(result.stdout as Buffer) : new Uint8Array();
    if (code === "ETIMEDOUT" || code === "ENOBUFS") out.errorCode = code;
    return out;
  },
  run(command, args, options = {}) {
    return new Promise<RunResult>((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd, env: toEnv(options.env), shell: options.shell, stdio: stdioFor(options),
        windowsHide: true, detached: process.platform !== "win32",
      });
      if (child.pid !== undefined) ownedChildren.add(child);
      let markClosed!: () => void;
      const closed = new Promise<void>((done) => { markClosed = done; });
      let hasClosed = false;
      let settled = false;
      let stopping: Promise<void> | undefined;
      let closeWatch: ReturnType<typeof setTimeout> | undefined;
      let stdout = "";
      let stderr = "";
      let bytes = 0;
      let errorCode: "ETIMEDOUT" | "ENOBUFS" | undefined;
      const limit = options.maxBufferBytes ?? 64 * 1024 * 1024;
      const clearTimers = (): void => { if (timer) clearTimeout(timer); if (closeWatch) clearTimeout(closeWatch); };
      const fail = (error: unknown): void => { if (!settled) { settled = true; clearTimers(); reject(error); } };
      const stop = (code?: "ETIMEDOUT" | "ENOBUFS", signal = options.killSignal ?? "SIGKILL"): void => {
        if (code) errorCode ??= code;
        stopping ??= stopOwnedTree(child, closed, () => hasClosed, signal);
        // Retain ownership when cleanup fails. Never translate the grace deadline into
        // a successful RunResult while a descendant can still own an open pipe.
        stopping.catch(fail);
      };
      const timer = options.timeoutMs === undefined ? undefined : setTimeout(() => stop("ETIMEDOUT"), options.timeoutMs);
      const collect = (current: string, chunk: string): string => {
        if (errorCode || settled) return current;
        bytes += Buffer.byteLength(chunk);
        if (bytes > limit) { stop("ENOBUFS"); return current; }
        return current + chunk;
      };
      child.stdout?.setEncoding("utf8").on("data", (chunk: string) => { stdout = collect(stdout, chunk); });
      child.stderr?.setEncoding("utf8").on("data", (chunk: string) => { stderr = collect(stderr, chunk); });
      child.on("error", fail);
      child.on("exit", () => {
        if (hasClosed) return;
        if (process.platform !== "win32") {
          // The root may heed SIGTERM before a descendant with ignored stdio does.
          // Finish its still-owned group before observing close and clearing escalation.
          try { process.kill(-child.pid!, "SIGKILL"); }
          catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            // macOS answers EPERM for a group that is already exiting; stop() below still proves the exit.
            if (code !== "ESRCH" && !(code === "EPERM" && process.platform === "darwin")) { fail(cleanupError(child, error)); return; }
          }
          if (!stopping) stop(undefined, "SIGKILL");
        } else if (!stopping) {
          closeWatch = setTimeout(() => fail(cleanupError(child, new Error("the wrapper exited but its pipes remain open"))), CLEANUP_TIMEOUT_MS);
        }
      });
      child.on("close", async (status, signal) => {
        hasClosed = true;
        closedChildren.add(child);
        markClosed();
        try { await stopping; } catch (error) { reconcileClosedOwner(child); fail(error); return; }
        ownedChildren.delete(child);
        if (settled) return;
        settled = true;
        clearTimers();
        const result: RunResult = { status, signal, stdout, stderr };
        if (errorCode) result.errorCode = errorCode;
        resolve(result);
      });
      child.stdin?.on("error", () => {});
      child.stdin?.end(options.input ?? "");
    });
  },
};

/** One bind attempt; every handler stays attached after settling so a late event cannot leak a lease. */
function listenOnce(options: { host: string; port: number; timeoutMs: number }): Promise<ListenResult> {
  return new Promise((resolve) => {
    const server = net.createServer((socket) => socket.destroy());
    let settled = false;
    const settle = (value: ListenResult): void => { if (!settled) { settled = true; clearTimeout(timer); resolve(value); } };
    server.on("error", (error: NodeJS.ErrnoException) => {
      // After a successful listen an error is an accept failure; the socket is still the lease, so keep it.
      if (settled) return;
      server.close(() => {});
      settle(error && error.code === "EADDRINUSE" ? { busy: true } : { error: (error && error.code) || "error" });
    });
    const timer = setTimeout(() => { server.close(() => {}); settle({ error: "ETIMEDOUT" }); }, options.timeoutMs);
    server.listen({ host: options.host, port: options.port, exclusive: true, backlog: 1 }, () => {
      if (settled) { server.close(() => {}); return; }
      settle({ server: { close: () => new Promise<void>((done) => { server.close(() => done()); }) } });
    });
  });
}

export const nodeNet: NetDeps = { tryListen: listenOnce };

export const nodeFs: FsDeps = {
  constants: {
    F_OK: fs.constants.F_OK, X_OK: fs.constants.X_OK, O_RDONLY: fs.constants.O_RDONLY,
    O_NOFOLLOW: fs.constants.O_NOFOLLOW, O_NONBLOCK: fs.constants.O_NONBLOCK, COPYFILE_EXCL: fs.constants.COPYFILE_EXCL,
  },
  readFileSync: (file) => fs.readFileSync(file, "utf8"),
  readBytesSync: (file) => new Uint8Array(fs.readFileSync(file)),
  writeFileSync: (file, data, options) => { fs.writeFileSync(file, data, options); },
  appendFileSync: (file, data) => { fs.appendFileSync(file, data); },
  existsSync: (file) => fs.existsSync(file),
  accessSync: (file, mode) => { fs.accessSync(file, mode); },
  readdirSync: (dir) => fs.readdirSync(dir),
  readdirEntriesSync: (dir) => fs.readdirSync(dir, { withFileTypes: true }),
  mkdirSync: (dir, options) => { fs.mkdirSync(dir, { recursive: options?.recursive !== false, mode: options?.mode }); },
  mkdtempSync: (prefix) => fs.mkdtempSync(prefix),
  realpathSync: (file) => fs.realpathSync(file),
  readlinkSync: (file) => fs.readlinkSync(file),
  statSync: (file) => fs.statSync(file),
  lstatSync: (file) => fs.lstatSync(file),
  fstatSync: (fd) => fs.fstatSync(fd),
  symlinkSync: (target, link) => { fs.symlinkSync(target, link); },
  linkSync: (existing, link) => { fs.linkSync(existing, link); },
  rmSync: (file, options) => { fs.rmSync(file, options); },
  rmdirSync: (dir) => { fs.rmdirSync(dir); },
  renameSync: (from, to) => { fs.renameSync(from, to); },
  unlinkSync: (file) => { fs.unlinkSync(file); },
  copyFileSync: (from, to, mode) => { fs.copyFileSync(from, to, mode); },
  chmodSync: (file, mode) => { fs.chmodSync(file, mode); },
  utimesSync: (file, atime, mtime) => { fs.utimesSync(file, atime, mtime); },
  fchmodSync: (fd, mode) => { fs.fchmodSync(fd, mode); },
  openSync: (file, flags, mode) => fs.openSync(file, flags, mode),
  closeSync: (fd) => { fs.closeSync(fd); },
  fsyncSync: (fd) => { fs.fsyncSync(fd); },
  readSync: (fd, buffer, offset, length, position) => fs.readSync(fd, buffer, offset, length, position),
  writeSync: (fd, data) => fs.writeSync(fd, data),
  readFile: (file) => fsp.readFile(file, "utf8"),
  writeFile: (file, data, options) => fsp.writeFile(file, data, options),
  exists: (file) => fsp.access(file).then(() => true, () => false),
  access: (file, mode) => fsp.access(file, mode),
  readdir: (dir) => fsp.readdir(dir),
  readdirEntries: (dir) => fsp.readdir(dir, { withFileTypes: true }),
  mkdir: async (dir, options) => { await fsp.mkdir(dir, { recursive: options?.recursive !== false, mode: options?.mode }); },
  mkdtemp: (prefix) => fsp.mkdtemp(prefix),
  realpath: (file) => fsp.realpath(file),
  stat: (file) => fsp.stat(file),
  lstat: (file) => fsp.lstat(file),
  rm: (file, options) => fsp.rm(file, options),
  rename: (from, to) => fsp.rename(from, to),
  copyFile: (from, to, mode) => fsp.copyFile(from, to, mode),
};

function readStdin(maxBytes?: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    let bytes = 0;
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => {
      bytes += Buffer.byteLength(chunk);
      if (maxBytes !== undefined && bytes > maxBytes) {
        process.stdin.destroy();
        reject(Object.assign(new Error(`stdin is larger than ${maxBytes} bytes`), { code: "E2BIG" }));
        return;
      }
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

export function createNodeDeps(env: Record<string, string | undefined> = process.env): RuntimeDeps {
  return {
    runtime: "node",
    fs: nodeFs,
    path,
    // A fresh object per deps: tests replace child methods in place, and Bun runs every test file in one process.
    child: { ...nodeChild },
    crypto: {
      sha256Hex: (data) => createHash("sha256").update(data).digest("hex"),
      sha256Bytes: (data) => new Uint8Array(createHash("sha256").update(data).digest()),
      randomBytes: (length) => new Uint8Array(randomBytes(length)),
      randomUUID: () => randomUUID(),
    },
    net: nodeNet,
    os: { tmpdir: () => os.tmpdir(), platform: () => os.platform() },
    clock: {
      now: () => Date.now(),
      monotonicMs: () => Number(process.hrtime.bigint() / 1000000n),
      perfNowMs: () => performance.now(),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    },
    io: {
      stdout: { write: (text) => { process.stdout.write(text); }, get isTTY() { return Boolean(process.stdout.isTTY); }, onError: (handler) => { process.stdout.on("error", handler); return () => { process.stdout.off("error", handler); }; } },
      stderr: { write: (text) => { process.stderr.write(text); }, get isTTY() { return Boolean(process.stderr.isTTY); }, onError: (handler) => { process.stderr.on("error", handler); return () => { process.stderr.off("error", handler); }; } },
      stdin: { readText: readStdin },
    },
    proc: {
      argv: process.argv.slice(2), env, execPath: process.execPath, pid: process.pid, platform: process.platform,
      versions: process.versions, cwd: () => process.cwd(),
      exit: (code) => process.exit(code),
      setExitCode: (code) => { process.exitCode = code; },
      kill: (pid, signal) => { process.kill(pid, signal); },
    },
  };
}

// ---- test support -------------------------------------------------------------------------------------------
// Raw capabilities only tests need. They live in this adapter so test files never import node:* directly;
// production code keeps using RuntimeDeps.

/** A long-lived child with live stdio/IPC handles (lock holders, concurrent writers); `deps.child.run` covers the rest. */
export function spawnTestChild(command: string, args: string[], options: NodeSpawnOptions = {}): ChildProcess {
  return spawn(command, args, { windowsHide: true, ...options });
}

/** TypeScript to JavaScript for in-memory mutant proofs: Bun's transpiler under Bun, Node's `stripTypeScriptTypes` otherwise. */
export function stripTypes(source: string): string {
  const bun = (globalThis as unknown as { Bun?: { Transpiler: new (options: { loader: string }) => { transformSync(code: string): string } } }).Bun;
  if (bun) return new bun.Transpiler({ loader: "ts" }).transformSync(source);
  const strip = (nodeModule as unknown as { stripTypeScriptTypes?: (code: string) => string }).stripTypeScriptTypes;
  if (!strip) throw new Error("stripTypes needs Node 22.13+ (module.stripTypeScriptTypes) or Bun");
  return strip(source);
}

/**
 * The `node:net` module instance this adapter listens with, for tests that occupy a port or spy on
 * `net.Server.prototype.listen` to observe `deps.net.tryListen` (a separate import could be a different instance).
 */
export const adapterNet: typeof net = net;

/** CommonJS `require` bound to a module URL, for tests that prove a module loads from CommonJS consumers. */
export function moduleRequire(url: string): NodeJS.Require {
  return nodeModule.createRequire(url);
}
