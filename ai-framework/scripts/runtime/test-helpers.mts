import { runWorkflowSync } from "./entry.mts";
import { createBunDeps } from "./bun.mts";
import { createNodeDeps } from "./node.mts";
import type { DirEntryLike, FsDeps, RuntimeDeps, RunResult, SpawnOptions, StatLike } from "./types.mts";

/** Returns RuntimeDeps for the runner currently executing the test (Node or Bun). */
export function createTestDeps(env: Record<string, string | undefined> = process.env): RuntimeDeps {
  return process.versions.bun ? createBunDeps(env) : createNodeDeps(env);
}

export interface FixtureFile { content: string | Uint8Array; mode?: number }

/**
 * Creates a real temp directory using `deps.fs.mkdtempSync`, resolves it through `deps.fs.realpathSync`
 * (so macOS `/var` → `/private/var` aliases are normalized), writes the given files, and returns the root.
 * Caller is responsible for `deps.fs.rmSync(root, { recursive: true, force: true })` after the test.
 * Set `options.resolve: false` to return the un-resolved `mkdtempSync` path (needed for tests that
 * exercise an aliased root, e.g. macOS `/var` vs `/private/var`).
 */
export function tempFixture(deps: RuntimeDeps, files: Record<string, string | FixtureFile>, options?: { resolve?: boolean }): string {
  const resolve = options?.resolve !== false;
  const tmp = deps.fs.mkdtempSync(`${deps.os.tmpdir()}/test-helper-`);
  const root = resolve ? deps.fs.realpathSync(tmp) : tmp;
  for (const [rel, entry] of Object.entries(files)) {
    const file = deps.path.join(root, rel);
    const resolved = deps.path.resolve(file);
    if (resolve && !resolved.startsWith(`${root}${deps.path.sep}`)) {
      throw new Error(`tempFixture: key "${rel}" resolves outside the temp root`);
    }
    deps.fs.mkdirSync(deps.path.dirname(file), { recursive: true });
    if (typeof entry === "string" || entry instanceof Uint8Array) {
      deps.fs.writeFileSync(file, entry);
    } else {
      deps.fs.writeFileSync(file, entry.content);
      if (entry.mode !== undefined) deps.fs.chmodSync(file, entry.mode);
    }
  }
  return root;
}

/**
 * Returns a `Partial<FsDeps>` over an in-memory tree. Directories are implied by file paths. The
 * `links` map is `path -> target`; an empty target means a dangling symlink. `statSync` follows links
 * (throws ENOENT if the target is missing); `lstatSync` reports the link without following.
 * Spread the result over `deps.fs` to inject it: `deps: { ...base, fs: { ...base.fs, ...memoryFs(files, links) } }`.
 */
export function memoryFs(files: Record<string, string>, links: Record<string, string> = {}): Partial<FsDeps> {
  const map = new Map(Object.entries(files));
  const linkMap = new Map(Object.entries(links));
  const linkSet = new Set(linkMap.keys());
  const isDir = (p: string): boolean => {
    if (p === "/") return true;
    if (linkSet.has(p)) return false;
    for (const key of map.keys()) if (key.startsWith(`${p}/`)) return true;
    for (const key of linkSet) if (key.startsWith(`${p}/`)) return true;
    return false;
  };
  const notFound = (file: string): Error => Object.assign(new Error(`ENOENT ${file}`), { code: "ENOENT" });
  const fileStat = (file: string, isLink: boolean, directory: boolean): StatLike => ({
    isFile: () => !isLink && !directory,
    isDirectory: () => directory,
    isSymbolicLink: () => isLink,
    size: map.get(file)?.length ?? 0, mode: 0, mtimeMs: 0, ino: 1, dev: 1, nlink: 1, uid: 0,
  });
  const lstat = (file: string): StatLike => {
    const isLink = linkSet.has(file);
    if (isLink) return fileStat(file, true, false);
    const directory = isDir(file);
    if (!directory && !map.has(file)) throw notFound(file);
    return fileStat(file, false, directory);
  };
  const stat = (file: string): StatLike => {
    const isLink = linkSet.has(file);
    if (isLink) {
      const target = linkMap.get(file) as string;
      if (!map.has(target)) throw notFound(file);
      return fileStat(target, false, false);
    }
    const directory = isDir(file);
    if (!directory && !map.has(file)) throw notFound(file);
    return fileStat(file, false, directory);
  };
  const childrenOf = (dir: string): string[] => {
    const names = new Set<string>();
    const prefix = dir === "/" ? "/" : `${dir}/`;
    for (const key of [...map.keys(), ...linkSet]) {
      if (key === dir) continue;
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      const first = rest.split("/")[0];
      if (first && !names.has(first)) names.add(first);
    }
    return [...names].sort();
  };
  return {
    readFileSync: (file) => {
      if (linkSet.has(file)) {
        const target = linkMap.get(file) as string;
        if (!map.has(target)) throw notFound(file);
        return map.get(target) as string;
      }
      if (!map.has(file)) throw notFound(file);
      return map.get(file) as string;
    },
    readBytesSync: (file) => {
      if (linkSet.has(file)) {
        const target = linkMap.get(file) as string;
        if (!map.has(target)) throw notFound(file);
        return new TextEncoder().encode(map.get(target) as string);
      }
      if (!map.has(file)) throw notFound(file);
      return new TextEncoder().encode(map.get(file) as string);
    },
    writeFileSync: (file, data) => { map.set(file, typeof data === "string" ? data : new TextDecoder().decode(data)); },
    existsSync: (file) => map.has(file) || isDir(file) || linkSet.has(file),
    statSync: stat,
    lstatSync: lstat,
    readdirSync: (dir) => { if (!isDir(dir)) throw notFound(dir); return childrenOf(dir); },
    readdirEntriesSync: (dir) => {
      if (!isDir(dir)) throw notFound(dir);
      const entries: DirEntryLike[] = [];
      const seen = new Set<string>();
      const prefix = dir === "/" ? "/" : `${dir}/`;
      for (const key of [...map.keys(), ...linkSet]) {
        if (key === dir) continue;
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        const first = rest.split("/")[0];
        if (!first || seen.has(first)) continue;
        seen.add(first);
        const childPath = dir === "/" ? `/${first}` : `${dir}/${first}`;
        entries.push({
          name: first,
          isFile: () => !linkSet.has(childPath) && (map.has(childPath) || isDir(childPath)),
          isDirectory: () => isDir(childPath),
          isSymbolicLink: () => linkSet.has(childPath),
        });
      }
      return entries.sort((a, b) => a.name.localeCompare(b.name));
    },
  };
}

/** Returns a new RuntimeDeps with `stdout.write` / `stderr.write` captured into arrays on the returned object. `isTTY` is forced to `false` so results do not depend on the host terminal. */
export interface CapturedDeps extends RuntimeDeps { out: string[]; err: string[] }
export function captureIo(deps: RuntimeDeps): CapturedDeps {
  const out: string[] = [];
  const err: string[] = [];
  const captured: CapturedDeps = {
    ...deps,
    out,
    err,
    io: {
      ...deps.io,
      stdout: { ...deps.io.stdout, write: (text) => { out.push(text); }, isTTY: false },
      stderr: { ...deps.io.stderr, write: (text) => { err.push(text); }, isTTY: false },
    },
  };
  return captured;
}

/**
 * Spawns `script` through the shared workflow dispatcher, so it selects the same executable the
 * runtime would select for that runner: an explicit `options.env.AI_WORKFLOW_RUNNER` wins, then
 * `deps.proc.env.AI_WORKFLOW_RUNNER`, then the runtime executing the test. Adds Node type-stripping
 * flags for `.mts` scripts on Node 22.12-22.17 (Node 22.18+ strips types natively).
 */
export function runScript(deps: RuntimeDeps, script: string, args: string[] = [], options: SpawnOptions = {}): RunResult {
  return runWorkflowSync(deps, [script, ...args], options);
}
