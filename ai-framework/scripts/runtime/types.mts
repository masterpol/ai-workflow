import type nodePath from "node:path";

export interface StatLike {
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
  size: number;
  mode: number;
  mtimeMs: number;
  ino: number;
  dev: number;
  nlink: number;
  uid: number;
}

export interface DirEntryLike {
  name: string;
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
}

export interface WriteOptions {
  mode?: number;
  /** Node open flag, for example "wx" to fail if the file exists. */
  flag?: string;
}

/** Numeric `fs.constants` the scripts read (absent platform values are 0 or undefined, as in Node). */
export interface FsConstants {
  F_OK: number;
  X_OK: number;
  O_RDONLY: number;
  O_NOFOLLOW?: number;
  O_NONBLOCK?: number;
  COPYFILE_EXCL: number;
}

/**
 * File access. Names and semantics follow node:fs so a migration is mechanical, with two deliberate
 * simplifications: reads return utf8 text (use readBytesSync for bytes), and mkdirSync is recursive unless
 * `{ recursive: false }`. Under Bun, readFile / writeFile / exists use Bun.file / Bun.write.
 */
export interface FsDeps {
  readonly constants: FsConstants;
  // sync
  readFileSync(file: string): string;
  readBytesSync(file: string): Uint8Array;
  writeFileSync(file: string | number, data: string | Uint8Array, options?: WriteOptions): void;
  appendFileSync(file: string, data: string): void;
  existsSync(file: string): boolean;
  accessSync(file: string, mode?: number): void;
  readdirSync(dir: string): string[];
  readdirEntriesSync(dir: string): DirEntryLike[];
  mkdirSync(dir: string, options?: { recursive?: boolean; mode?: number }): void;
  mkdtempSync(prefix: string): string;
  realpathSync(file: string): string;
  readlinkSync(file: string): string;
  statSync(file: string): StatLike;
  lstatSync(file: string): StatLike;
  fstatSync(fd: number): StatLike;
  rmSync(file: string, options?: { recursive?: boolean; force?: boolean }): void;
  rmdirSync(dir: string): void;
  renameSync(from: string, to: string): void;
  unlinkSync(file: string): void;
  copyFileSync(from: string, to: string, mode?: number): void;
  chmodSync(file: string, mode: number): void;
  fchmodSync(fd: number, mode: number): void;
  openSync(file: string, flags: string | number, mode?: number): number;
  closeSync(fd: number): void;
  fsyncSync(fd: number): void;
  readSync(fd: number, buffer: Uint8Array, offset: number, length: number, position: number | null): number;
  writeSync(fd: number, data: string | Uint8Array): number;
  // async
  readFile(file: string): Promise<string>;
  writeFile(file: string, data: string | Uint8Array, options?: WriteOptions): Promise<void>;
  exists(file: string): Promise<boolean>;
  access(file: string, mode?: number): Promise<void>;
  readdir(dir: string): Promise<string[]>;
  readdirEntries(dir: string): Promise<DirEntryLike[]>;
  mkdir(dir: string, options?: { recursive?: boolean; mode?: number }): Promise<void>;
  mkdtemp(prefix: string): Promise<string>;
  realpath(file: string): Promise<string>;
  stat(file: string): Promise<StatLike>;
  lstat(file: string): Promise<StatLike>;
  rm(file: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  copyFile(from: string, to: string, mode?: number): Promise<void>;
}

export interface SpawnOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  input?: string;
  timeoutMs?: number;
  /** One value for all three streams. "inherit" streams to the parent and returns empty stdout/stderr. Default "pipe". */
  stdio?: "pipe" | "inherit" | "ignore";
  /** Run `command` through the shell (args must be empty). Replaces execSync(commandLine). */
  shell?: boolean;
  /** "buffer" also returns raw stdout in `stdoutBytes` (stdout text is still decoded). Default "utf8". */
  encoding?: "utf8" | "buffer";
  /** Signal sent when timeoutMs expires. Default SIGKILL. */
  killSignal?: string;
  /** Output cap in bytes (default 64 MiB); exceeding it kills the child and sets errorCode "ENOBUFS". */
  maxBufferBytes?: number;
}

export interface RunResult {
  status: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  /** Raw stdout, only when SpawnOptions.encoding is "buffer". */
  stdoutBytes?: Uint8Array;
  /** "ETIMEDOUT" or "ENOBUFS" when the child was stopped by timeoutMs / maxBufferBytes. */
  errorCode?: string;
}

export interface ChildDeps {
  runBytesSync(command: string, args: string[], options?: SpawnOptions): { status: number | null; signal: string | null; stdout: Uint8Array; stderr: Uint8Array };
  runSync(command: string, args: string[], options?: SpawnOptions): RunResult;
  run(command: string, args: string[], options?: SpawnOptions): Promise<RunResult>;
}

export interface CryptoDeps {
  sha256Hex(data: string | Uint8Array): string;
  sha256Bytes(data: string | Uint8Array): Uint8Array;
  randomBytes(length: number): Uint8Array;
  randomUUID(): string;
}

export interface OsDeps {
  tmpdir(): string;
  platform(): string;
}

export interface ClockDeps {
  /** Wall clock, ms since epoch. */
  now(): number;
  /** Monotonic ms (integer), for waits and deadlines. */
  monotonicMs(): number;
  /** Monotonic ms with sub-millisecond precision, for timings (performance.now). */
  perfNowMs(): number;
  sleep(ms: number): Promise<void>;
}

export interface IoDeps {
  stdout: { write(text: string): void; readonly isTTY: boolean; onError?(handler: (error: Error & { code?: string }) => void): () => void };
  stderr: { write(text: string): void; readonly isTTY: boolean; onError?(handler: (error: Error & { code?: string }) => void): () => void };
  stdin: {
    /** Reads all of stdin as utf8. Rejects with an Error whose `code` is "E2BIG" once `maxBytes` is exceeded. */
    readText(maxBytes?: number): Promise<string>;
  };
}

export interface ProcDeps {
  argv: string[];
  env: Record<string, string | undefined>;
  execPath: string;
  pid: number;
  platform: string;
  versions: Record<string, string | undefined>;
  cwd(): string;
  exit(code: number): never;
  setExitCode(code: number): void;
  /** Signal 0 probes for existence; throws like process.kill (error.code "ESRCH" / "EPERM"). */
  kill(pid: number, signal: string | number): void;
}

export type ListenResult = { server: { close(): Promise<void> } } | { busy: true } | { error: string };

export interface NetDeps {
  /**
   * Binds an exclusive loopback TCP listener that refuses every connection (a lease with no protocol).
   * Resolves { server } when bound, { busy: true } on EADDRINUSE, { error: code } otherwise (ETIMEDOUT after timeoutMs).
   * A server that binds after the timeout is closed again, never leaked.
   */
  tryListen(options: { host: string; port: number; timeoutMs: number }): Promise<ListenResult>;
}

export type RunnerName = "node" | "bun";

/** Everything a script may touch outside its own memory. Scripts import no `node:*` module themselves. */
export interface RuntimeDeps {
  runtime: RunnerName;
  fs: FsDeps;
  path: typeof nodePath;
  child: ChildDeps;
  crypto: CryptoDeps;
  net: NetDeps;
  os: OsDeps;
  clock: ClockDeps;
  io: IoDeps;
  proc: ProcDeps;
}

/** Contract every migrated script exports next to its pure functions. Returns the exit code. */
export type ScriptMain = (argv: string[], deps: RuntimeDeps) => Promise<number> | number;
