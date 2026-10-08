import { createNodeDeps } from "./node.mts";
import type { ChildDeps, RunResult, RuntimeDeps, SpawnOptions } from "./types.mts";

interface BunHasher { update(data: string | Uint8Array): BunHasher; digest(encoding: "hex"): string }
interface BunSyncResult { exitCode: number | null; signalCode?: string | null; stdout: Uint8Array; stderr: Uint8Array }
interface BunProc {
  exited: Promise<number>;
  signalCode: string | null;
  stdout?: ReadableStream<Uint8Array>;
  stderr?: ReadableStream<Uint8Array>;
  kill(signal?: string): void;
}
interface BunSpawnOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  stdin?: Uint8Array | "ignore" | "inherit";
  stdout: "pipe" | "inherit" | "ignore";
  stderr: "pipe" | "inherit" | "ignore";
  timeout?: number;
  killSignal?: string;
  maxBuffer?: number;
}
interface BunApi {
  file(file: string): { text(): Promise<string>; exists(): Promise<boolean> };
  write(file: string, data: string | Uint8Array): Promise<number>;
  spawn(command: string[], options: BunSpawnOptions): BunProc;
  spawnSync(command: string[], options: BunSpawnOptions): BunSyncResult;
  CryptoHasher: new (algorithm: "sha256") => BunHasher;
}

export function bunApi(): BunApi {
  const bun = (globalThis as unknown as { Bun?: BunApi }).Bun;
  if (!bun) throw new Error("AI_WORKFLOW_RUNNER=bun requires running under Bun");
  return bun;
}

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

function spawnOptions(options: SpawnOptions): BunSpawnOptions {
  const stdio = options.stdio ?? "pipe";
  return {
    cwd: options.cwd, env: options.env, stdout: stdio, stderr: stdio,
    stdin: stdio !== "pipe" ? stdio : options.input === undefined ? "ignore" : new TextEncoder().encode(options.input),
    timeout: options.timeoutMs, killSignal: options.killSignal ?? "SIGKILL", maxBuffer: options.maxBufferBytes ?? 64 * 1024 * 1024,
  };
}

/** Bun.spawn has no shell option: a shell command line runs as `sh -c <line>`. */
function argvFor(command: string, args: string[], options: SpawnOptions): string[] {
  return options.shell ? ["/bin/sh", "-c", command] : [command, ...args];
}

async function readAll(stream: ReadableStream<Uint8Array> | undefined): Promise<string> {
  if (!stream) return "";
  return decode(new Uint8Array(await new Response(stream).arrayBuffer()));
}

function bunChild(bun: BunApi): ChildDeps {
  return {
    runBytesSync(command, args, options = {}) {
      const result = bun.spawnSync(argvFor(command, args, options), spawnOptions(options));
      return { status: result.exitCode, signal: result.signalCode ?? null, stdout: new Uint8Array(result.stdout ?? []), stderr: new Uint8Array(result.stderr ?? []) };
    },
    runSync(command, args, options = {}) {
      const result = bun.spawnSync(argvFor(command, args, options), spawnOptions(options));
      const out: RunResult = { status: result.exitCode, signal: result.signalCode ?? null, stdout: result.stdout ? decode(result.stdout) : "", stderr: result.stderr ? decode(result.stderr) : "" };
      if (options.encoding === "buffer") out.stdoutBytes = result.stdout ? new Uint8Array(result.stdout) : new Uint8Array();
      if (options.timeoutMs !== undefined && result.signalCode) out.errorCode = "ETIMEDOUT";
      if (options.maxBufferBytes !== undefined && result.stdout && result.stdout.length > options.maxBufferBytes) out.errorCode = "ENOBUFS";
      return out;
    },
    async run(command, args, options = {}): Promise<RunResult> {
      // Timeout and byte cap are enforced here (not by Bun.spawn) so both adapters report the same errorCode and a
      // grandchild holding a pipe open cannot outlast the deadline.
      const { timeout: _timeout, maxBuffer: _maxBuffer, ...spawnBase } = spawnOptions(options);
      const proc = bun.spawn(argvFor(command, args, options), spawnBase);
      const limit = options.maxBufferBytes ?? 64 * 1024 * 1024;
      const signal = options.killSignal ?? "SIGKILL";
      let errorCode: "ETIMEDOUT" | "ENOBUFS" | undefined;
      let bytes = 0;
      let wake: () => void = () => {};
      const stopped = new Promise<void>((resolve) => { wake = resolve; });
      let grace: ReturnType<typeof setTimeout> | null = null;
      const kill = (code: "ETIMEDOUT" | "ENOBUFS"): void => {
        if (errorCode) return;
        errorCode = code;
        proc.kill(signal);
        grace = setTimeout(wake, 200);
      };
      const timer = options.timeoutMs === undefined ? null : setTimeout(() => kill("ETIMEDOUT"), options.timeoutMs);
      const read = async (stream: ReadableStream<Uint8Array> | undefined): Promise<string> => {
        if (!stream) return "";
        const chunks: Uint8Array[] = [];
        const reader = stream.getReader();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (errorCode === "ENOBUFS") continue;
            bytes += value.length;
            if (bytes > limit) { kill("ENOBUFS"); continue; }
            chunks.push(value);
          }
        } catch { /* a killed child can reset its pipe */ }
        return decode(Buffer.concat(chunks));
      };
      const outputs = Promise.all([read(proc.stdout), read(proc.stderr), proc.exited]);
      outputs.catch(() => {});
      let settled: { value: [string, string, number] } | null;
      try { settled = await Promise.race([outputs.then((value) => ({ value })), stopped.then(() => null)]); }
      finally { if (timer) clearTimeout(timer); if (grace) clearTimeout(grace); }
      if (settled === null) return { status: null, signal, stdout: "", stderr: "", ...(errorCode ? { errorCode } : {}) };
      const [stdout, stderr, status] = settled.value;
      const out: RunResult = { status: proc.signalCode ? null : status, signal: proc.signalCode, stdout, stderr };
      if (errorCode) out.errorCode = errorCode;
      return out;
    },
  };
}

/** Node deps with Bun-native replacements wherever Bun has its own API: Bun.file/Bun.write, Bun.spawn, Bun.CryptoHasher. */
export function createBunDeps(env: Record<string, string | undefined> = process.env): RuntimeDeps {
  const bun = bunApi();
  const base = createNodeDeps(env);
  return {
    ...base,
    runtime: "bun",
    fs: {
      ...base.fs,
      readFile: (file) => bun.file(file).text(),
      // Bun.write has no flag/mode options; fall back to the Node path whenever the caller passes any.
      writeFile: async (file, data, options) => { if (options) await base.fs.writeFile(file, data, options); else await bun.write(file, data); },
      // Bun.file().exists() is false for directories; fall back to the Node check so both adapters agree.
      exists: async (file) => (await bun.file(file).exists()) || base.fs.exists(file),
    },
    child: bunChild(bun),
    crypto: { ...base.crypto, sha256Hex: (data) => new bun.CryptoHasher("sha256").update(data).digest("hex") },
  };
}
