import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import * as fs from "node:fs";
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

export const nodeChild: ChildDeps = {
  runBytesSync(command, args, options = {}) {
    const result = spawnSync(command, args, {
      cwd: options.cwd, env: toEnv(options.env), input: options.input, shell: options.shell,
      timeout: options.timeoutMs, maxBuffer: 64 * 1024 * 1024, stdio: stdioFor(options),
    });
    const code = (result.error as NodeJS.ErrnoException | undefined)?.code;
    if (result.error && code !== "ETIMEDOUT" && code !== "ENOBUFS") throw result.error;
    return { status: result.status, signal: result.signal, stdout: new Uint8Array(result.stdout ?? []), stderr: new Uint8Array(result.stderr ?? []) };
  },
  runSync(command, args, options = {}) {
    const raw = options.encoding === "buffer";
    const result = spawnSync(command, args, {
      cwd: options.cwd, env: toEnv(options.env), input: options.input, shell: options.shell,
      timeout: options.timeoutMs, killSignal: options.killSignal as NodeJS.Signals | undefined,
      encoding: raw ? "buffer" : "utf8", maxBuffer: options.maxBufferBytes ?? 64 * 1024 * 1024, stdio: stdioFor(options),
    });
    const code = (result.error as NodeJS.ErrnoException | undefined)?.code;
    if (result.error && code !== "ETIMEDOUT" && code !== "ENOBUFS") throw result.error;
    const text = (value: string | Buffer | null | undefined): string => (value == null ? "" : value.toString("utf8"));
    const out: RunResult = { status: result.status, signal: result.signal, stdout: text(result.stdout), stderr: text(result.stderr) };
    if (raw) out.stdoutBytes = result.stdout ? new Uint8Array(result.stdout as Buffer) : new Uint8Array();
    if (code === "ETIMEDOUT" || code === "ENOBUFS") out.errorCode = code;
    return out;
  },
  run(command, args, options = {}) {
    return new Promise<RunResult>((resolve, reject) => {
      const stdio = stdioFor(options);
      const child = spawn(command, args, { cwd: options.cwd, env: toEnv(options.env), shell: options.shell, stdio });
      const limit = options.maxBufferBytes ?? 64 * 1024 * 1024;
      let stdout = "";
      let stderr = "";
      let bytes = 0;
      let errorCode: "ETIMEDOUT" | "ENOBUFS" | undefined;
      let settled = false;
      let grace: ReturnType<typeof setTimeout> | null = null;
      const kill = (code: "ETIMEDOUT" | "ENOBUFS"): void => {
        if (errorCode) return;
        errorCode = code;
        child.kill((options.killSignal as NodeJS.Signals | undefined) ?? "SIGKILL");
        // A grandchild can keep the pipes open after the child dies: stop waiting for them shortly after the kill.
        grace = setTimeout(() => finish(null, (options.killSignal as string | undefined) ?? "SIGKILL"), 200);
      };
      const timer = options.timeoutMs === undefined ? null : setTimeout(() => kill("ETIMEDOUT"), options.timeoutMs);
      const finish = (status: number | null, signal: string | null): void => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        if (grace) clearTimeout(grace);
        const result: RunResult = { status, signal, stdout, stderr };
        if (errorCode) result.errorCode = errorCode;
        resolve(result);
      };
      const collect = (current: string, chunk: string): string => {
        if (errorCode === "ENOBUFS") return current;
        bytes += Buffer.byteLength(chunk);
        if (bytes > limit) { kill("ENOBUFS"); return current; }
        return current + chunk;
      };
      child.stdout?.setEncoding("utf8").on("data", (chunk: string) => { stdout = collect(stdout, chunk); });
      child.stderr?.setEncoding("utf8").on("data", (chunk: string) => { stderr = collect(stderr, chunk); });
      child.on("error", (error) => { if (timer) clearTimeout(timer); if (grace) clearTimeout(grace); if (!settled) { settled = true; reject(error); } });
      child.on("close", (status, signal) => finish(status, signal));
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
  rmSync: (file, options) => { fs.rmSync(file, options); },
  rmdirSync: (dir) => { fs.rmdirSync(dir); },
  renameSync: (from, to) => { fs.renameSync(from, to); },
  unlinkSync: (file) => { fs.unlinkSync(file); },
  copyFileSync: (from, to, mode) => { fs.copyFileSync(from, to, mode); },
  chmodSync: (file, mode) => { fs.chmodSync(file, mode); },
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
    child: nodeChild,
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
