import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { TestContext } from "node:test";

import type { RuntimeDeps } from "./runtime/types.mts";
import { createNodeDeps } from "./runtime/node.mts";
import { context, digest, json, readRegistry, recover, resolveFile, snapshot, transact } from "./skill-registry.mts";
import type { Operation, RegistryContext } from "./skill-registry.mts";

// The old call forms (no deps) are kept on purpose: they go through the direct TypeScript command, as every unmigrated caller does.
const require = createRequire(import.meta.url);
const shim = require("./skill-registry.mts") as {
  digest(data: Uint8Array): string;
  context(project: string, scope: string, location?: string): RegistryContext;
  snapshot(ctx: RegistryContext, relative: string, root?: string): { data: string; mode: number; hash: string } | null;
  transact(ctx: RegistryContext, operations: Operation[], options?: object): void;
};

const sha = (data: string | Uint8Array): string => createHash("sha256").update(data).digest("hex");
const bytes = (text: string): Buffer => Buffer.from(text);

function project(t: TestContext): string {
  // realpath: macOS tmpdir is a /var -> /private/var alias that breaks path assertions
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "skill-registry-")));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
const read = (root: string, name: string): string => fs.readFileSync(path.join(root, name), "utf8");
const create = (name: string, text: string, mode = 0o644): Operation => ({ path: name, expected: null, value: { data: bytes(text), mode } });
function withKill(kill: (pid: number, signal: string | number) => void, uuid?: () => string): RuntimeDeps {
  const base = createNodeDeps();
  return { ...base, proc: { ...base.proc, kill }, crypto: { ...base.crypto, randomUUID: uuid ?? base.crypto.randomUUID } };
}
const errno = (code: string): Error => Object.assign(new Error(code), { code });

test("digest is sha256 hex and json is pretty with a trailing newline", () => {
  assert.equal(digest(bytes("abc")), sha("abc"));
  assert.equal(shim.digest(bytes("abc")), sha("abc"));
  assert.equal(json({ a: 1 }).toString(), '{\n  "a": 1\n}\n');
});

test("context validates scope and location and resolves real roots", (t: TestContext) => {
  const root = project(t);
  const home = project(t);
  assert.throws(() => context(root, "team"), /Choose --scope project\|global explicitly/);
  assert.throws(() => context(root, "global"), /explicit absolute --location/);
  assert.throws(() => context(root, "global", "relative/home"), /explicit absolute --location/);
  assert.throws(() => context(root, "project", home), /Project location must equal --root/);
  assert.throws(() => context(root, "global", root), /Global location must be separate from the project/);
  assert.throws(() => context(path.join(root, "missing"), "project"), /ENOENT/);
  assert.deepEqual(context(root, "project"), { roots: { project: root, target: root }, scope: "project", state: ".project/skills", registry: ".project/skills/registry.json" });
  assert.deepEqual(context(root, "project", root).roots, { project: root, target: root });
  assert.deepEqual(context(root, "global", home), { roots: { project: root, target: home }, scope: "global", state: ".ai-workflow/skills", registry: ".ai-workflow/skills/registry.json" });
  assert.deepEqual(shim.context(root, "project"), context(root, "project", undefined, createNodeDeps()));
});

test("resolveFile rejects unsafe paths, bad roots and a symlink at any existing ancestor", (t: TestContext) => {
  const root = project(t);
  const outside = project(t);
  const ctx = context(root, "project");
  for (const bad of ["../x", "/abs", "a//b", ".git/config", ".env", "a/./b", ""]) assert.throws(() => resolveFile(ctx, bad), /Unsafe relative path/, bad);
  assert.throws(() => resolveFile(ctx, "a/b", "other" as "target"), /Invalid transaction root/);
  assert.equal(resolveFile(ctx, "a/b/c.txt"), path.join(root, "a/b/c.txt"));
  fs.symlinkSync(outside, path.join(root, "linked"));
  assert.throws(() => resolveFile(ctx, "linked/file.txt"), /Symlink destination forbidden: linked\/file\.txt/);
  fs.writeFileSync(path.join(outside, "leaf"), "x");
  fs.symlinkSync(path.join(outside, "leaf"), path.join(root, "leaf"));
  assert.throws(() => resolveFile(ctx, "leaf"), /Symlink destination forbidden/);
  assert.equal(resolveFile({ roots: { target: root } }, "a.txt"), path.join(root, "a.txt"));
});

test("snapshot returns null for a missing file, base64 data, masked mode and a content hash; directories fail", (t: TestContext) => {
  const root = project(t);
  const ctx = context(root, "project");
  assert.equal(snapshot(ctx, "none.txt"), null);
  fs.writeFileSync(path.join(root, "f.sh"), "echo\n", { mode: 0o755 });
  fs.chmodSync(path.join(root, "f.sh"), 0o755);
  const taken = snapshot(ctx, "f.sh");
  assert.deepEqual(taken, { data: Buffer.from("echo\n").toString("base64"), mode: 0o755, hash: sha("echo\n") });
  assert.deepEqual(shim.snapshot(ctx, "f.sh"), taken);
  fs.mkdirSync(path.join(root, "dir"));
  assert.throws(() => snapshot(ctx, "dir"), /Destination is not a file: dir/);
});

function registryFor(ctx: RegistryContext, mutate: (entry: Record<string, unknown>) => void = () => {}): void {
  const id = "owner/repo/sample";
  const packagePath = `${ctx.state}/packages/${id}`;
  const adapter = ".claude/skills/sample/SKILL.md";
  const owned = { hash: "a".repeat(64), sourceHash: "b".repeat(64), mode: 0o644 };
  const entry: Record<string, unknown> = {
    id, name: "sample", scope: ctx.scope, enabled: true, phases: ["build"], source: {}, packagePath,
    adapters: { claude: adapter }, owned: { [adapter]: owned, [`${packagePath}/SKILL.md`]: owned },
  };
  mutate(entry);
  const file = path.join(ctx.roots.target, ctx.registry);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ schemaVersion: 1, skills: { [id]: entry } }));
}

test("readRegistry returns an empty registry when none is stored and validates stored entries", (t: TestContext) => {
  const root = project(t);
  const ctx = context(root, "project");
  assert.deepEqual(readRegistry(ctx), { registry: { schemaVersion: 1, skills: {} }, stored: null });
  registryFor(ctx);
  const loaded = readRegistry(ctx);
  assert.equal(loaded.registry.skills["owner/repo/sample"].name, "sample");
  assert.equal(loaded.stored?.hash, sha(read(root, ctx.registry)));
  const broken: [string, (entry: Record<string, unknown>) => void, RegExp][] = [
    ["wrong package root", (entry) => { entry.packagePath = ".project/skills/packages/other"; }, /Invalid package ownership root/],
    ["traversal in package path", (entry) => { entry.packagePath = "../x"; }, /Unsafe relative path/],
    ["bad scope", (entry) => { entry.scope = "global"; }, /Invalid registry activation/],
    ["no phases", (entry) => { entry.phases = []; }, /Invalid registry activation/],
    ["adapter not owned", (entry) => { entry.owned = {}; }, /Invalid adapter ownership paths/],
    ["bad hash", (entry) => { (entry.owned as Record<string, { hash: string }>)[".claude/skills/sample/SKILL.md"].hash = "zz"; }, /Invalid ownership record/],
    ["bad mode", (entry) => { (entry.owned as Record<string, { mode: number }>)[".claude/skills/sample/SKILL.md"].mode = 0o600; }, /Invalid ownership record/],
    ["foreign state path", (entry) => { (entry.owned as Record<string, unknown>)[".project/skills/other.txt"] = { hash: "a".repeat(64), sourceHash: "b".repeat(64), mode: 0o644 }; }, /Invalid owned path/],
    ["unrecognized path", (entry) => { (entry.owned as Record<string, unknown>)["elsewhere/file.txt"] = { hash: "a".repeat(64), sourceHash: "b".repeat(64), mode: 0o644 }; }, /Unrecognized owned path/],
    ["not enabled boolean", (entry) => { entry.enabled = "yes"; }, /Invalid registry entry/],
  ];
  for (const [name, mutate, pattern] of broken) {
    registryFor(ctx, mutate);
    assert.throws(() => readRegistry(ctx), pattern, name);
  }
  fs.writeFileSync(path.join(root, ctx.registry), JSON.stringify({ schemaVersion: 2, skills: {} }));
  assert.throws(() => readRegistry(ctx), /Unsupported or invalid skill registry schema/);
});

test("transact creates, updates and deletes through the real file system and leaves no lock, journal or temp file", (t: TestContext) => {
  const root = project(t);
  const ctx = context(root, "project");
  const deps = createNodeDeps();
  transact(ctx, [create("a/b/one.txt", "one\n"), create("run.sh", "#!/bin/sh\n", 0o755)], {}, deps);
  assert.equal(read(root, "a/b/one.txt"), "one\n");
  assert.equal(fs.statSync(path.join(root, "run.sh")).mode & 0o777, 0o755);
  assert.equal(fs.existsSync(path.join(root, ".project")), false);
  transact(ctx, [{ path: "a/b/one.txt", expected: sha("one\n"), value: { data: bytes("uno\n"), mode: 0o644 } }, { path: "run.sh", expected: sha("#!/bin/sh\n"), value: null }]);
  assert.equal(read(root, "a/b/one.txt"), "uno\n");
  assert.equal(fs.existsSync(path.join(root, "run.sh")), false);
  assert.deepEqual(fs.readdirSync(path.join(root, "a/b")), ["one.txt"]);
  transact(ctx, [{ path: "a/b/one.txt", expected: sha("uno\n"), value: null }]);
  assert.equal(fs.existsSync(path.join(root, ".project")), false, "directories created for the lock are removed again");
  assert.equal(fs.existsSync(path.join(root, "a")), true, "directories of earlier commits stay");
  shim.transact(shim.context(root, "project"), [create("old-form.txt", "x")]);
  assert.equal(read(root, "old-form.txt"), "x");
});

test("a failure mid-transaction rolls every write back and keeps the original bytes and modes", (t: TestContext) => {
  const root = project(t);
  const ctx = context(root, "project");
  fs.writeFileSync(path.join(root, "keep.txt"), "original\n", { mode: 0o600 });
  fs.chmodSync(path.join(root, "keep.txt"), 0o600);
  const operations: Operation[] = [
    { path: "keep.txt", expected: sha("original\n"), expectedMode: 0o600, value: { data: bytes("changed\n"), mode: 0o644 } },
    create("new/file.txt", "new\n"),
  ];
  assert.throws(() => transact(ctx, operations, { afterWrite: (index) => { if (index === 1) throw new Error("boom"); } }), /^Error: boom$/);
  assert.equal(read(root, "keep.txt"), "original\n");
  assert.equal(fs.statSync(path.join(root, "keep.txt")).mode & 0o777, 0o600);
  assert.equal(fs.existsSync(path.join(root, "new/file.txt")), false);
  assert.equal(fs.existsSync(path.join(root, ".project")), false);
});

test("optimistic checks: a stale expected hash or mode, overlapping destinations and a pending journal are refused", (t: TestContext) => {
  const root = project(t);
  const ctx = context(root, "project");
  fs.writeFileSync(path.join(root, "f.txt"), "v1");
  assert.throws(() => transact(ctx, [{ path: "f.txt", expected: sha("other"), value: null }]), /Concurrent edit or ownership conflict: f\.txt/);
  assert.throws(() => transact(ctx, [{ path: "f.txt", expected: sha("v1"), expectedMode: 0o600, value: null }]), /Concurrent edit or ownership conflict/);
  assert.throws(() => transact(ctx, [create("d/x", "1"), create("d", "2")]), /Duplicate or overlapping transaction destination: d/);
  assert.throws(() => transact(ctx, [create("D/x", "1"), create("d/X", "2")]), /Duplicate or overlapping/, "case-insensitive");
  assert.equal(read(root, "f.txt"), "v1");
  fs.mkdirSync(path.join(root, ".project/skills"), { recursive: true });
  fs.writeFileSync(path.join(root, ".project/skills/transaction.json"), "{}");
  assert.throws(() => transact(ctx, []), /Interrupted transaction: run recover/);
});

test("a symlinked destination ancestor is refused and nothing outside the root is touched", (t: TestContext) => {
  const root = project(t);
  const outside = project(t);
  const ctx = context(root, "project");
  fs.symlinkSync(outside, path.join(root, "escape"));
  assert.throws(() => transact(ctx, [create("escape/pwned.txt", "x")]), /Symlink destination forbidden/);
  assert.deepEqual(fs.readdirSync(outside), []);
});

test("lock: a live owner blocks transact, a removed lock is released after success, and the lock file records this pid", (t: TestContext) => {
  const root = project(t);
  const ctx = context(root, "project");
  const lock = path.join(root, ".project/skills/lock.json");
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid }));
  assert.throws(() => transact(ctx, []), /Skill registry is locked by another process/);
  assert.throws(() => recover(ctx), /Skill registry is locked by another process/);
  assert.equal(fs.existsSync(lock), true, "a live owner's lock is never removed");
  fs.rmSync(lock);
  let seen: unknown;
  transact(ctx, [create("x.txt", "x")], { afterWrite: () => { seen = JSON.parse(fs.readFileSync(lock, "utf8")); } });
  assert.deepEqual(seen, { pid: process.pid });
  assert.equal(fs.existsSync(lock), false);
});

test("lock owner probe through injected deps: ESRCH means dead, EPERM and success mean alive, the signal is 0", (t: TestContext) => {
  const root = project(t);
  const ctx = context(root, "project");
  const lock = path.join(root, ".project/skills/lock.json");
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  fs.writeFileSync(lock, JSON.stringify({ pid: 424242 }));
  const probes: [number, string | number][] = [];
  const dead = withKill((pid, signal) => { probes.push([pid, signal]); throw errno("ESRCH"); });
  assert.throws(() => transact(ctx, [], {}, dead), /Interrupted transaction: run recover/);
  assert.deepEqual(probes, [[424242, 0]]);
  assert.equal(fs.existsSync(lock), true, "a dead owner's lock stays until recover");
  assert.throws(() => transact(ctx, [], {}, withKill(() => { throw errno("EPERM"); })), /locked by another process/);
  assert.throws(() => transact(ctx, [], {}, withKill(() => {})), /locked by another process/);
  assert.equal(recover(ctx, dead), false, "recover takes over a dead owner's lock and finds no journal");
  assert.equal(fs.existsSync(lock), false);
});

test("lock validation: bad pid, junk, oversized, FIFO and symlinked lock files are rejected", (t: TestContext) => {
  const root = project(t);
  const ctx = context(root, "project");
  const lock = path.join(root, ".project/skills/lock.json");
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  for (const body of [JSON.stringify({ pid: 0 }), JSON.stringify({ pid: -4 }), JSON.stringify({ pid: 1.5 }), JSON.stringify({ pid: "12" }), "{}"]) {
    fs.writeFileSync(lock, body);
    assert.throws(() => transact(ctx, []), /Invalid lock; inspect it before recovery/, body);
  }
  fs.writeFileSync(lock, "not json");
  assert.throws(() => transact(ctx, []), SyntaxError);
  fs.writeFileSync(lock, " ".repeat(4097));
  assert.throws(() => transact(ctx, []), /Invalid lock: expected a small regular file/);
  fs.rmSync(lock);
  const target = path.join(root, "target.json");
  fs.writeFileSync(target, JSON.stringify({ pid: 999999 }));
  fs.symlinkSync(target, lock);
  assert.throws(() => transact(ctx, []), /Symlink destination forbidden/);
  fs.rmSync(lock);
  fs.mkdirSync(lock);
  assert.throws(() => transact(ctx, []), /Invalid lock: expected a small regular file/);
});

test("recover restores the pre-transaction state from an interrupted journal and removes the journal", (t: TestContext) => {
  const root = project(t);
  const ctx = context(root, "project");
  fs.writeFileSync(path.join(root, "a.txt"), "before");
  let thrown: unknown;
  try {
    transact(ctx, [{ path: "a.txt", expected: sha("before"), value: { data: bytes("after"), mode: 0o644 } }], { afterWrite: () => { throw new Error("crash"); } });
  } catch (error) { thrown = error; }
  assert.match(String(thrown), /crash/);
  assert.equal(read(root, "a.txt"), "before");
  // Simulate a process kill after the write: journal present, file already changed, stale lock left behind.
  const journal = { schemaVersion: 1, roots: ctx.roots, operations: [{ root: "target", path: "a.txt", before: snapshot(ctx, "a.txt"), after: { data: bytes("after").toString("base64"), mode: 0o644, hash: sha("after") } }], created: [] };
  fs.writeFileSync(path.join(root, "a.txt"), "after");
  fs.mkdirSync(path.join(root, ".project/skills"), { recursive: true });
  fs.writeFileSync(path.join(root, ".project/skills/transaction.json"), JSON.stringify(journal));
  fs.writeFileSync(path.join(root, ".project/skills/lock.json"), JSON.stringify({ pid: 424242 }));
  const dead = withKill(() => { throw errno("ESRCH"); });
  assert.equal(recover(ctx, dead), true);
  assert.equal(read(root, "a.txt"), "before");
  assert.deepEqual(fs.readdirSync(path.join(root, ".project/skills")), []);
  assert.equal(recover(ctx), false);
});

test("recover refuses a local edit, a damaged backup and changed roots without restoring anything", (t: TestContext) => {
  const root = project(t);
  const ctx = context(root, "project");
  fs.writeFileSync(path.join(root, "a.txt"), "locally edited");
  const op = { root: "target", path: "a.txt", before: { data: bytes("before").toString("base64"), mode: 0o644, hash: sha("before") }, after: { data: bytes("after").toString("base64"), mode: 0o644, hash: sha("after") } };
  const journalFile = path.join(root, ".project/skills/transaction.json");
  fs.mkdirSync(path.dirname(journalFile), { recursive: true });
  const put = (value: object): void => { fs.writeFileSync(journalFile, JSON.stringify(value)); };
  put({ schemaVersion: 1, roots: ctx.roots, operations: [op] });
  assert.throws(() => recover(ctx), /Recovery conflict: a\.txt/);
  assert.equal(read(root, "a.txt"), "locally edited");
  fs.writeFileSync(path.join(root, "a.txt"), "after");
  put({ schemaVersion: 1, roots: ctx.roots, operations: [{ ...op, before: { ...op.before, hash: sha("tampered") } }] });
  assert.throws(() => recover(ctx), /Damaged recovery backup/);
  put({ schemaVersion: 1, roots: { project: "/elsewhere", target: "/elsewhere" }, operations: [op] });
  assert.throws(() => recover(ctx), /Invalid recovery journal or changed transaction roots/);
  assert.equal(read(root, "a.txt"), "after");
  assert.equal(fs.existsSync(path.join(root, ".project/skills/lock.json")), false, "recover releases its own lock on failure");
});

test("temporary files use crypto.randomUUID from the injected deps and are exclusive (wx)", (t: TestContext) => {
  const root = project(t);
  const ctx = context(root, "project");
  const uuids: string[] = [];
  const deps = withKill(() => {}, () => { const value = `fixed-${uuids.length}`; uuids.push(value); return value; });
  transact(ctx, [create("f.txt", "x")], {}, deps);
  assert.ok(uuids.length >= 3, "journal write, operation write, journal rewrite");
  // A pre-existing temp file with the injected uuid makes the exclusive open fail, and nothing is committed.
  const squatter = path.join(root, ".project/skills/transaction.json.skill-squat");
  fs.mkdirSync(path.dirname(squatter), { recursive: true });
  fs.writeFileSync(squatter, "mine");
  assert.throws(() => transact(ctx, [create("g.txt", "y")], {}, withKill(() => {}, () => "squat")), /EEXIST/);
  assert.equal(fs.existsSync(path.join(root, "g.txt")), false);
  assert.equal(fs.existsSync(path.join(root, ".project/skills/lock.json")), false, "the lock is released after the failure");
});

test("snapshot, readRegistry and resolveFile run on a fully fake file system", () => {
  const base = createNodeDeps();
  const files = new Map<string, string>([["/r/.project/skills/registry.json", JSON.stringify({ schemaVersion: 1, skills: {} })]]);
  const deps: RuntimeDeps = {
    ...base,
    fs: {
      ...base.fs,
      realpathSync: (file) => file,
      lstatSync: (file) => { if (!files.has(file)) throw errno("ENOENT"); return { isSymbolicLink: () => false } as never; },
      statSync: (file) => { if (!files.has(file)) throw errno("ENOENT"); return { isFile: () => true, mode: 0o100640 } as never; },
      readBytesSync: (file) => new TextEncoder().encode(files.get(file) as string),
    },
  };
  const ctx = context("/r", "project", undefined, deps);
  const taken = snapshot(ctx, ctx.registry, "target", deps);
  assert.equal(taken?.mode, 0o640);
  assert.equal(taken?.hash, sha('{"schemaVersion":1,"skills":{}}'));
  assert.deepEqual(readRegistry(ctx, deps).registry, { schemaVersion: 1, skills: {} });
  assert.equal(snapshot(ctx, "missing.txt", "target", deps), null);
  assert.equal(resolveFile(ctx, "x/y", "target", deps), "/r/x/y");
});
