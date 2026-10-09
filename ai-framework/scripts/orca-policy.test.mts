import { NODE_FLAGS } from "./runtime/entry.mts";
const RUNTIME_FLAGS = process.versions.bun ? [] : NODE_FLAGS;
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { pathToFileURL } from "node:url";

import { MAX_POLICY_BYTES, POLICY_FILE, VENDORS, main, readPolicy, report, validatePolicy } from "./orca-policy.mts";
import { createNodeDeps } from "./runtime/node.mts";
import type { FsDeps, RuntimeDeps, StatLike } from "./runtime/types.mts";

const HERE = import.meta.dirname;
const EXAMPLE = path.resolve(HERE, "../integrations/orca-vendors.example.json");
const SCRIPT = path.join(HERE, "orca-policy.mts");
const nodeDeps = createNodeDeps();
const isBun = typeof (globalThis as { Bun?: unknown }).Bun !== "undefined";

interface Coord { workers: unknown; roles: Record<string, unknown>; [key: string]: unknown }
interface Policy { [key: string]: unknown; coordinators: Record<string, Coord> }

function policy(enabled = true): Policy {
  return { ...JSON.parse(fs.readFileSync(EXAMPLE, "utf8")), "use-orca-orchestration": enabled } as Policy;
}
function fixture(t: TestContext): string {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "orca-policy-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".project"));
  return root;
}
function write(root: string, value: unknown): void {
  fs.writeFileSync(path.join(root, POLICY_FILE), typeof value === "string" ? value : JSON.stringify(value));
}
function run(root: string, args: string[] = []) {
  return spawnSync(process.execPath, [...RUNTIME_FLAGS, SCRIPT, "report", "--root", root, "--vendor", "codex", "--json", ...args],
    { encoding: "utf8", timeout: 3000 });
}
/** Real node deps with chosen fs methods replaced, the replacement for mocking node:fs. */
const withFs = (overrides: Partial<FsDeps>): RuntimeDeps => ({ ...nodeDeps, fs: { ...nodeDeps.fs, ...overrides } });
const errnoError = (code: string): Error => Object.assign(new Error("SECRET_MARKER"), { code });

test("selects alternate workers for every invoking vendor without authorizing dispatch", (t) => {
  const root = fixture(t);
  write(root, policy());
  const before = fs.readFileSync(path.join(root, POLICY_FILE));
  for (const vendor of VENDORS) {
    const result = report(root, vendor);
    assert.equal(result.vendor, vendor);
    assert.deepEqual(result.workers, VENDORS.filter((entry) => entry !== vendor));
    assert.equal((result.roles as Record<string, unknown>).implementation, policy().coordinators[vendor].roles.implementation);
    assert.equal(result.eligible, true);
    assert.equal(result.route, "normal");
    assert.equal(result.dispatchReady, false);
    assert.equal(result.maxConcurrentWorkers, 2);
    assert.equal(result.maxRetriesPerTask, 1);
  }
  assert.deepEqual(fs.readFileSync(path.join(root, POLICY_FILE)), before);
  assert.deepEqual(fs.readdirSync(path.join(root, ".project")), ["orchestration.json"]);
});

test("keeps missing and disabled configuration on the normal workflow", (t) => {
  const root = fixture(t);
  assert.equal(report(root, "codex").reason, "policy-missing");
  fs.rmdirSync(path.join(root, ".project"));
  assert.equal(readPolicy(root).status, "missing");
  assert.deepEqual(fs.readdirSync(root), []);
  fs.mkdirSync(path.join(root, ".project"));
  write(root, policy(false));
  assert.deepEqual(report(root, "claude"), {
    schemaVersion: 1, vendor: "claude", policyStatus: "disabled", eligible: false,
    reason: "policy-disabled", route: "normal", dispatchReady: false,
    workers: [], roles: {}, maxConcurrentWorkers: 0, maxRetriesPerTask: 0,
  });
  const omitted = policy();
  delete omitted["use-orca-orchestration"];
  write(root, omitted);
  assert.equal(report(root, "codex").reason, "policy-disabled");
  assert.equal((readPolicy(root) as { policy: Record<string, unknown> }).policy["use-orca-orchestration"], false);
});

test("handles unconfigured coordinators and intentionally empty worker lists", (t) => {
  const root = fixture(t);
  const value = policy();
  delete value.coordinators.codex;
  write(root, value);
  assert.equal(report(root, "codex").reason, "coordinator-unconfigured");
  value.coordinators.codex = { workers: [], roles: {} };
  write(root, value);
  assert.equal(report(root, "codex").reason, "no-workers");
  assert.equal(validatePolicy(value).status, "valid");
});

test("rejects malformed routing and bounds with exact fallback outcomes", async (t) => {
  const variants: Array<[string, (p: Policy) => void]> = [
    ["flag wrong type", (p) => { p["use-orca-orchestration"] = "true"; }],
    ["flag null", (p) => { p["use-orca-orchestration"] = null; }],
    ["legacy mode rejected", (p) => { p.mode = "auto"; }],
    ["concurrency low", (p) => { p.maxConcurrentWorkers = 0; }],
    ["concurrency high", (p) => { p.maxConcurrentWorkers = 4; }],
    ["concurrency far above", (p) => { p.maxConcurrentWorkers = 30; }],
    ["concurrency string", (p) => { p.maxConcurrentWorkers = "2"; }],
    ["concurrency NaN", (p) => { p.maxConcurrentWorkers = null; }],
    ["concurrency fractional", (p) => { p.maxConcurrentWorkers = 1.5; }],
    ["retries low", (p) => { p.maxRetriesPerTask = -1; }],
    ["retries high", (p) => { p.maxRetriesPerTask = 3; }],
    ["retries fractional", (p) => { p.maxRetriesPerTask = 0.5; }],
    ["unknown field", (p) => { p.command = "SECRET_MARKER"; }],
    ["unknown coordinator", (p) => { p.coordinators.cursor = { workers: [], roles: {} }; }],
    ["self worker", (p) => { p.coordinators.codex = { workers: ["codex"], roles: { implementation: "codex", review: "codex" } }; }],
    ["duplicate worker", (p) => { p.coordinators.codex = { workers: ["claude", "claude"], roles: { implementation: "claude", review: "claude" } }; }],
    ["unknown worker", (p) => { p.coordinators.codex = { workers: ["cursor"], roles: { implementation: "cursor", review: "cursor" } }; }],
    ["too many workers", (p) => { p.coordinators.codex.workers = ["claude", "opencode", "claude"]; }],
    ["worker wrong type", (p) => { p.coordinators.codex.workers = "claude"; }],
    ["route outside workers", (p) => { p.coordinators.codex.roles.review = "codex"; }],
    ["unknown role", (p) => { p.coordinators.codex.roles.owner = "claude"; }],
    ["unknown coordinator field", (p) => { p.coordinators.codex.command = "SECRET_MARKER"; }],
    ["coordinator null", (p) => { p.coordinators.codex = null as unknown as Coord; }],
    ["roles null", (p) => { p.coordinators.codex.roles = null as unknown as Record<string, unknown>; }],
    ["schema wrong type", (p) => { p.schemaVersion = "1"; }],
    ["missing field", (p) => { delete p.maxRetriesPerTask; }],
  ];
  for (const [name, change] of variants) await t.test(name, (sub) => {
    const root = fixture(sub);
    const value = policy();
    change(value);
    write(root, value);
    const result = report(root, "codex");
    assert.equal(result.reason, "policy-malformed");
    assert.equal(result.eligible, false);
    assert.deepEqual(result.workers, []);
    assert.ok(!JSON.stringify(result).includes("SECRET_MARKER"));
  });
});

test("accepts configured integer boundaries and rejects unsafe keys at every level", () => {
  for (const concurrency of [1, 3]) for (const retries of [0, 2]) {
    const value = policy();
    value.maxConcurrentWorkers = concurrency;
    value.maxRetriesPerTask = retries;
    assert.equal(validatePolicy(value).status, "valid");
  }
  for (const level of ["top", "coordinators", "coordinator", "roles"]) {
    const value = policy();
    const target: object = level === "top" ? value : level === "coordinators" ? value.coordinators
      : level === "coordinator" ? value.coordinators.codex : value.coordinators.codex.roles;
    for (const key of ["__proto__", "constructor", "prototype"]) {
      Object.defineProperty(target, key, { value: "SECRET_MARKER", enumerable: true, configurable: true });
      assert.equal(validatePolicy(value).status, "malformed");
      delete (target as Record<string, unknown>)[key];
    }
  }
  for (const value of [null, [], 1, "bad", Object.create({ schemaVersion: 1 })]) {
    assert.equal(validatePolicy(value).status, "malformed");
  }
});

test("distinguishes unsupported versions and invalid JSON without exposing content", (t) => {
  const root = fixture(t);
  write(root, { ...policy(), schemaVersion: 2 });
  assert.equal(report(root, "codex").reason, "policy-unsupported-schema");
  write(root, "{SECRET_MARKER");
  const result = run(root);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).reason, "policy-malformed");
  assert.ok(!result.stdout.includes("SECRET_MARKER"));
  assert.equal(result.stderr, "");
});

test("refuses symlinked files and ancestors without reading their targets", (t) => {
  const root = fixture(t);
  const outside = fixture(t);
  write(outside, policy());
  fs.symlinkSync(path.join(outside, POLICY_FILE), path.join(root, POLICY_FILE));
  assert.equal(readPolicy(root).status, "refused");
  fs.unlinkSync(path.join(root, POLICY_FILE));
  fs.rmdirSync(path.join(root, ".project"));
  fs.symlinkSync(path.join(outside, ".project"), path.join(root, ".project"));
  assert.equal(report(root, "codex").reason, "policy-refused");
  assert.equal(readPolicy(outside).status, "valid");
});

test("refuses a symlink that stays inside the root, so only the symlink guard can reject it", (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, ".project/real.json"), JSON.stringify(policy()));
  fs.symlinkSync(path.join(root, ".project/real.json"), path.join(root, POLICY_FILE));
  assert.equal(readPolicy(root).status, "refused");
  fs.unlinkSync(path.join(root, POLICY_FILE));
  fs.rmSync(path.join(root, ".project"), { recursive: true });
  fs.mkdirSync(path.join(root, "elsewhere"));
  fs.writeFileSync(path.join(root, "elsewhere/orchestration.json"), JSON.stringify(policy()));
  fs.symlinkSync(path.join(root, "elsewhere"), path.join(root, ".project"));
  assert.equal(readPolicy(root).status, "refused");
});

test("refuses nonregular paths and oversized files; accepts the exact byte limit", (t) => {
  assert.equal(MAX_POLICY_BYTES, 65536, "The policy contract fixes the byte limit independently of the implementation");
  const root = fixture(t);
  fs.mkdirSync(path.join(root, POLICY_FILE));
  assert.equal(readPolicy(root).status, "refused");
  fs.rmdirSync(path.join(root, POLICY_FILE));
  const text = JSON.stringify(policy());
  write(root, text.padEnd(MAX_POLICY_BYTES, " "));
  assert.equal(readPolicy(root).status, "valid");
  write(root, text.padEnd(MAX_POLICY_BYTES + 1, " "));
  assert.equal(readPolicy(root).status, "refused");
  fs.unlinkSync(path.join(root, POLICY_FILE));
  fs.rmdirSync(path.join(root, ".project"));
  fs.writeFileSync(path.join(root, ".project"), "SECRET_MARKER");
  assert.equal(readPolicy(root).status, "refused");
});

test("refuses a FIFO immediately rather than blocking", { skip: process.platform === "win32" }, (t) => {
  const root = fixture(t);
  assert.equal(spawnSync("mkfifo", [path.join(root, POLICY_FILE)]).status, 0);
  const result = run(root);
  assert.equal(result.status, 0, result.error?.code);
  assert.equal(JSON.parse(result.stdout).reason, "policy-refused");
});

test("refuses a FIFO substituted between inspection and opening without blocking", { skip: process.platform === "win32" }, (t) => {
  const root = fixture(t);
  write(root, policy());
  const helperDir = fs.mkdtempSync(path.join(os.tmpdir(), "orca-policy-helper-"));
  t.after(() => fs.rmSync(helperDir, { recursive: true, force: true }));
  const helper = path.join(helperDir, "substitute.mts");
  const url = (name: string): string => JSON.stringify(pathToFileURL(path.join(HERE, name)).href);
  fs.writeFileSync(helper, `import { execFileSync } from "node:child_process";
import { unlinkSync } from "node:fs";
import { join } from "node:path";
import { POLICY_FILE, readPolicy } from ${url("orca-policy.mts")};
import { createNodeDeps } from ${url("runtime/node.mts")};
const root = process.argv[2];
const file = join(root, POLICY_FILE);
const base = createNodeDeps();
const deps = { ...base, fs: { ...base.fs, openSync(...args) {
  unlinkSync(file); execFileSync("mkfifo", [file]); return base.fs.openSync(...args);
} } };
console.log(JSON.stringify(readPolicy(root, deps)));
`);
  const flags = isBun ? [] : ["--experimental-strip-types"];
  const result = spawnSync(process.execPath, [...RUNTIME_FLAGS, ...flags, helper, root], { encoding: "utf8", timeout: 5000 });
  assert.equal(result.status, 0, result.error?.code ?? result.stderr);
  assert.equal(JSON.parse(result.stdout).status, "refused");
});

test("reports access denial as refusal rather than missing or a raw exception", (t) => {
  const root = fixture(t);
  write(root, policy());
  // Root bypasses chmod restrictions; inject the OS failure at the filesystem boundary instead.
  const deps = withFs({ lstatSync: () => { throw errnoError("EACCES"); } });
  assert.equal(report(root, "codex", deps).reason, "policy-refused");
});

test("refuses open failures and checks the descriptor identity before reading", (t) => {
  const root = fixture(t);
  write(root, policy());
  assert.equal(readPolicy(root, withFs({ openSync: () => { throw errnoError("ELOOP"); } })).status, "refused");
  const realStat = nodeDeps.fs.fstatSync;
  assert.equal(readPolicy(root, withFs({ fstatSync: (fd) => Object.assign(realStat(fd), { ino: -1 }) })).status, "refused");
});

test("bounds a file that grows after descriptor inspection", (t) => {
  const root = fixture(t);
  write(root, policy());
  let grew = false;
  const deps = withFs({ readSync: (...args) => {
    if (!grew) { grew = true; fs.appendFileSync(path.join(root, POLICY_FILE), " ".repeat(MAX_POLICY_BYTES)); }
    return nodeDeps.fs.readSync(...args);
  } });
  assert.equal(readPolicy(root, deps).status, "refused");
});

test("rechecks the path after opening and refuses changed ownership before reading", (t) => {
  const root = fixture(t);
  write(root, policy());
  let reads = 0;
  const deps = withFs({
    fstatSync: (fd) => {
      const stat = nodeDeps.fs.fstatSync(fd);
      fs.renameSync(path.join(root, POLICY_FILE), path.join(root, ".project/original.json"));
      write(root, policy(false));
      return stat;
    },
    readSync: (...args) => { reads++; return nodeDeps.fs.readSync(...args); },
  });
  assert.equal(readPolicy(root, deps).status, "refused");
  assert.equal(reads, 0);
});

test("refuses an oversized opened descriptor before reading bytes", (t) => {
  const root = fixture(t);
  write(root, policy());
  let reads = 0;
  const deps = withFs({
    fstatSync: (fd) => Object.assign(nodeDeps.fs.fstatSync(fd), { size: MAX_POLICY_BYTES + 1 }),
    readSync: (...args) => { reads++; return nodeDeps.fs.readSync(...args); },
  });
  assert.equal(readPolicy(root, deps).status, "refused");
  assert.equal(reads, 0);
});

test("refuses a nonregular opened descriptor before reading bytes", (t) => {
  const root = fixture(t);
  write(root, policy());
  let reads = 0;
  const deps = withFs({
    fstatSync: (fd) => Object.assign(nodeDeps.fs.fstatSync(fd), { isFile: () => false }),
    readSync: (...args) => { reads++; return nodeDeps.fs.readSync(...args); },
  });
  assert.equal(readPolicy(root, deps).status, "refused");
  assert.equal(reads, 0);
});

test("refuses a resolved path outside the trusted root", (t) => {
  const root = fixture(t);
  write(root, policy());
  const deps = withFs({ realpathSync: (file) => file === path.join(root, POLICY_FILE)
    ? path.join(path.dirname(root), "outside", "orchestration.json") : nodeDeps.fs.realpathSync(file) });
  assert.equal(readPolicy(root, deps).status, "refused");
});

test("grades the shaped policy permutation family with executed assertions", (t) => {
  // Translate all-coordinator-and-policy-permutations into portable assertions; project-local
  // shaping records are not copied into projects by bundle-sync.
  const root = fixture(t);
  write(root, policy());
  for (const vendor of VENDORS) {
    const result = report(root, vendor);
    assert.equal(result.vendor, vendor);
    assert.equal((result.workers as unknown[]).length, 2);
    assert.ok((result.maxConcurrentWorkers as number) <= 3);
    assert.equal(result.dispatchReady, false);
  }
});

test("validates the shipped example as disabled, and normalizes CLI diagnostics", (t) => {
  assert.equal(validatePolicy(JSON.parse(fs.readFileSync(EXAMPLE, "utf8"))).status, "disabled");
  const root = fixture(t);
  write(root, policy());
  const result = run(root);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).eligible, true);
  const plain = spawnSync(process.execPath, [...RUNTIME_FLAGS, SCRIPT, "report", "--root", root, "--vendor", "claude"], { encoding: "utf8" });
  assert.equal(plain.status, 0);
  assert.match(plain.stdout, /normal workflow; dispatch disabled/);
  assert.throws(() => report(root, "cursor"), /invalid-vendor/);
});

test("rejects unknown, duplicate, missing and invalid CLI arguments with fixed errors", (t) => {
  const root = fixture(t);
  for (const args of [["--unknown", "SECRET_MARKER"], ["--json"], ["--root"], ["--vendor", "cursor"]]) {
    const result = run(root, args);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "orca-policy: invalid invocation or internal failure\n");
  }
  for (const args of [[], ["invalid"], ["report", "--vendor"], ["report", "--root", "--json"]]) {
    const result = spawnSync(process.execPath, [...RUNTIME_FLAGS, SCRIPT, ...args], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 1);
  }
  const defaultRoot = spawnSync(process.execPath, [...RUNTIME_FLAGS, SCRIPT, "report", "--vendor", "codex", "--json"], { cwd: root, encoding: "utf8" });
  assert.equal(defaultRoot.status, 0);
  assert.equal(JSON.parse(defaultRoot.stdout).policyStatus, "missing");
});

// ---- main() against an in-memory RuntimeDeps -------------------------------------------------------------

interface MemNode { kind: "file" | "dir" | "link"; data: string; ino: number; target?: string }
interface Mem { deps: RuntimeDeps; out: string[]; err: string[]; nodes: Map<string, MemNode>; reads: number }

function memory(files: Record<string, string>, extra: Record<string, MemNode> = {}): Mem {
  const nodes = new Map<string, MemNode>([["/proj", { kind: "dir", data: "", ino: 1 }], ["/proj/.project", { kind: "dir", data: "", ino: 2 }]]);
  let ino = 10;
  for (const [file, data] of Object.entries(files)) nodes.set(file, { kind: "file", data, ino: ino++ });
  for (const [file, node] of Object.entries(extra)) nodes.set(file, node);
  const descriptors = new Map<number, MemNode>();
  const mem: Mem = { deps: nodeDeps, out: [], err: [], nodes, reads: 0 };
  const enoent = (file: string): Error => Object.assign(new Error(`ENOENT ${file}`), { code: "ENOENT" });
  const statOf = (node: MemNode): StatLike => ({
    isFile: () => node.kind === "file", isDirectory: () => node.kind === "dir", isSymbolicLink: () => node.kind === "link",
    size: new TextEncoder().encode(node.data).length, mode: 0o644, mtimeMs: 0, ino: node.ino, dev: 1, nlink: 1, uid: 0,
  });
  const fsFake = {
    constants: nodeDeps.fs.constants,
    realpathSync(file: string): string { const node = nodes.get(file); if (!node) throw enoent(file); return node.target ?? file; },
    lstatSync(file: string): StatLike { const node = nodes.get(file); if (!node) throw enoent(file); return statOf(node); },
    openSync(file: string): number { const node = nodes.get(file); if (!node) throw enoent(file); descriptors.set(descriptors.size + 3, node); return descriptors.size + 2; },
    fstatSync(fd: number): StatLike { return statOf(descriptors.get(fd) as MemNode); },
    readSync(fd: number, buffer: Uint8Array, offset: number, length: number): number {
      mem.reads++;
      const bytes = new TextEncoder().encode((descriptors.get(fd) as MemNode).data);
      const count = Math.min(length, bytes.length);
      buffer.set(bytes.subarray(0, count), offset);
      (descriptors.get(fd) as MemNode).data = "";
      return count;
    },
    closeSync(fd: number): void { descriptors.delete(fd); },
  };
  mem.deps = {
    ...nodeDeps,
    fs: fsFake as unknown as FsDeps,
    io: { ...nodeDeps.io, stdout: { write: (text) => { mem.out.push(text); }, isTTY: false }, stderr: { write: (text) => { mem.err.push(text); }, isTTY: false } },
    proc: { ...nodeDeps.proc, cwd: () => "/proj" },
  };
  return mem;
}

test("main prints the JSON report and returns 0 for an enabled policy", () => {
  const mem = memory({ "/proj/.project/orchestration.json": JSON.stringify(policy()) });
  assert.equal(main(["report", "--root", "/proj", "--vendor", "codex", "--json"], mem.deps), 0);
  assert.equal(mem.err.length, 0);
  const parsed = JSON.parse(mem.out.join(""));
  assert.equal(parsed.eligible, true);
  assert.deepEqual(parsed.workers, ["claude", "opencode"]);
  assert.ok(mem.out.join("").endsWith("}\n"));
});

test("main prints the plain line and defaults the root to the working directory", () => {
  const mem = memory({}, {});
  assert.equal(main(["report", "--vendor", "claude"], mem.deps), 0);
  assert.equal(mem.out.join(""), "Orca policy: policy-missing; normal workflow; dispatch disabled.\n");
});

test("main returns 1 with the fixed stderr line for any invalid invocation", () => {
  for (const argv of [[], ["bad"], ["report"], ["report", "--vendor", "cursor"], ["report", "--json", "--json"], ["report", "--root"], ["report", "--vendor", "--json"]]) {
    const mem = memory({});
    assert.equal(main(argv, mem.deps), 1, argv.join(" "));
    assert.equal(mem.out.length, 0);
    assert.equal(mem.err.join(""), "orca-policy: invalid invocation or internal failure\n");
  }
});

test("main reports a symlinked policy as refused without reading it", () => {
  const mem = memory({ "/proj/.project/real.json": JSON.stringify(policy()) },
    { "/proj/.project/orchestration.json": { kind: "link", data: "", ino: 99, target: "/proj/.project/real.json" } });
  assert.equal(main(["report", "--root", "/proj", "--vendor", "codex", "--json"], mem.deps), 0);
  assert.equal(JSON.parse(mem.out.join("")).reason, "policy-refused");
  assert.equal(mem.reads, 0);
});

test("main reports a directory at the policy path and an oversized file as refused", () => {
  const dir = memory({}, { "/proj/.project/orchestration.json": { kind: "dir", data: "", ino: 50 } });
  assert.equal(main(["report", "--root", "/proj", "--vendor", "codex", "--json"], dir.deps), 0);
  assert.equal(JSON.parse(dir.out.join("")).reason, "policy-refused");
  const big = memory({ "/proj/.project/orchestration.json": " ".repeat(MAX_POLICY_BYTES + 1) });
  assert.equal(main(["report", "--root", "/proj", "--vendor", "codex", "--json"], big.deps), 0);
  assert.equal(JSON.parse(big.out.join("")).reason, "policy-refused");
  assert.equal(big.reads, 0);
});

test("main keeps a UTF-8 BOM in the text so JSON parsing still rejects it", () => {
  const mem = memory({ "/proj/.project/orchestration.json": `﻿${JSON.stringify(policy())}` });
  assert.equal(main(["report", "--root", "/proj", "--vendor", "codex", "--json"], mem.deps), 0);
  assert.equal(JSON.parse(mem.out.join("")).reason, "policy-malformed");
});

test("main returns 1 when writing the report fails", () => {
  const mem = memory({});
  mem.deps.io.stdout.write = () => { throw new Error("EPIPE"); };
  assert.equal(main(["report", "--root", "/proj", "--vendor", "codex"], mem.deps), 1);
  assert.equal(mem.err.join(""), "orca-policy: invalid invocation or internal failure\n");
});
