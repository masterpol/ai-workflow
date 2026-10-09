import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, posix } from "node:path";
import { test } from "node:test";

import { frontmatter, identity, inspectSource, main, safeRelative } from "./skill-source.mts";
import { createNodeDeps } from "./runtime/node.mts";
import type { RunResult, RuntimeDeps, SpawnOptions } from "./runtime/types.mts";

import * as sourceApi from "./skill-source.mts";

const ID = "owner/repo/sample";
const real = createNodeDeps();

function sh(cwd: string, ...args: string[]): void {
  const result = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

function makeRepo(files: Record<string, string | Buffer>, links: Record<string, string> = {}): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "skill-source-test-")));
  sh(dir, "init", "-q");
  for (const [name, data] of Object.entries(files)) {
    mkdirSync(join(dir, name, ".."), { recursive: true });
    writeFileSync(join(dir, name), data);
  }
  for (const [name, target] of Object.entries(links)) {
    mkdirSync(join(dir, name, ".."), { recursive: true });
    symlinkSync(target, join(dir, name));
  }
  sh(dir, "add", "-A");
  sh(dir, "commit", "-q", "-m", "init");
  return dir;
}

const skill = (name = "sample", body = "Body"): string => `---\nname: ${name}\ndescription: Does a thing\n---\n${body}\n`;

test("TypeScript namespace keeps the public surface", () => {
  assert.deepEqual(Object.keys(sourceApi).sort(), ["frontmatter", "identity", "inspectSource", "main", "safeRelative"]);
  assert.equal(sourceApi.identity(ID).id, ID);
});

test("identity accepts owner/repo/skill and exact skills.sh URLs only", () => {
  assert.deepEqual(identity(ID), { id: ID, owner: "owner", repository: "repo", name: "sample", url: "https://github.com/owner/repo.git" });
  assert.equal(identity("https://skills.sh/owner/repo/sample/").id, ID);
  for (const bad of ["sample", "a/b", "a/b/Bad", "a/../c", "https://evil.com/a/b/c", "https://skills.sh/a/b/c?x=1", "https://skills.sh:8080/a/b/c", "https://user@skills.sh/a/b/c", `a/b/${"x".repeat(65)}`, 5]) {
    assert.throws(() => identity(bad), /skill|skills\.sh/i, String(bad));
  }
});

test("safeRelative rejects traversal, git internals, secrets, control chars and absolute paths", () => {
  assert.equal(safeRelative("references/guide.md"), "references/guide.md");
  for (const bad of ["", "/abs", "a/../b", "./a", "a//b", ".git/config", "a/.GIT/x", ".env", "a/.env.local", "credentials.json", "settings.local.json", "a\\b", "a:b", "a\u0001b", 7]) {
    assert.throws(() => safeRelative(bad), /Unsafe relative path/, String(bad));
  }
});

test("frontmatter parses plain, quoted and block scalars and rejects bad input", () => {
  assert.equal(frontmatter(skill(), "sample").description, "Does a thing");
  assert.equal(frontmatter('---\nname: sample\ndescription: "a \\"q\\""\n---\n', "sample").description, 'a "q"');
  assert.equal(frontmatter("---\r\nname: sample\r\ndescription: 'it''s'\r\n---\r\n", "sample").description, "it's");
  assert.equal(frontmatter("---\nname: sample\ndescription: >-\n  one\n  two\n---\n", "sample").description, "one two");
  assert.throws(() => frontmatter("no front", "sample"), /missing YAML/);
  assert.throws(() => frontmatter("---\nname: sample\nname: sample\ndescription: d\n---\n", "sample"), /Duplicate/);
  assert.throws(() => frontmatter("---\nname: other\ndescription: d\n---\n", "sample"), /exact name/);
  assert.throws(() => frontmatter("---\nname: sample\ndescription: [x]\n---\n", "sample"), /plain or quoted/);
  assert.throws(() => frontmatter('---\nname: sample\ndescription: "bad\\q"\n---\n', "sample"), /Invalid double-quoted/);
});

test("inspectSource reads committed blobs as raw bytes with modes and license", () => {
  const binary = Buffer.from([0, 255, 128, 10, 13, 200]);
  const repo = makeRepo({ "skills/sample/SKILL.md": skill("sample", "See [guide](references/guide.md) and [dir](assets)."), "skills/sample/references/guide.md": "guide\n", "skills/sample/assets/blob.bin": binary, LICENSE: "MIT text\n" });
  try {
    const result = inspectSource(ID, { repo }, real);
    assert.equal(result.url, repo);
    assert.equal(result.sourcePath, "skills/sample/SKILL.md");
    assert.match(result.revision, /^[a-f0-9]{40}$/);
    assert.deepEqual(Object.keys(result.files).sort(), ["SKILL.md", "assets/blob.bin", "references/guide.md"]);
    assert.ok(Buffer.isBuffer(result.files["assets/blob.bin"].data));
    assert.deepEqual([...result.files["assets/blob.bin"].data], [...binary]);
    assert.equal(result.files["SKILL.md"].mode, 0o644);
    assert.deepEqual(result.license, { path: "LICENSE", text: "MIT text\n" });
    assert.equal(result.description, "Does a thing");
    assert.equal(Object.getPrototypeOf(result.files), null);
    assert.equal(inspectSource(ID, { repo }).revision, result.revision, "default deps work too");
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test("inspectSource failure paths: missing skill, ambiguity, symlinks, collisions, dangling links", () => {
  const cleanup: string[] = [];
  const repoOf = (files: Record<string, string | Buffer>, links: Record<string, string> = {}): string => { const r = makeRepo(files, links); cleanup.push(r); return r; };
  try {
    assert.throws(() => inspectSource(ID, { repo: repoOf({ "README.md": "x" }) }, real), /does not exist/);
    assert.throws(() => inspectSource(ID, { repo: repoOf({ "a/sample/SKILL.md": skill(), "b/sample/SKILL.md": skill() }) }, real), /Ambiguous skill: choose --path from a\/sample\/SKILL.md, b\/sample\/SKILL.md/);
    assert.equal(inspectSource(ID, { repo: repoOf({ "a/sample/SKILL.md": skill(), "b/sample/SKILL.md": skill() }), path: "b/sample/SKILL.md" }, real).sourcePath, "b/sample/SKILL.md");
    assert.throws(() => inspectSource(ID, { repo: repoOf({ "SKILL.md": skill() }, { "link/sample/SKILL.md": "../../SKILL.md" }) }, real), /Symlink or non-file SKILL.md/);
    assert.throws(() => inspectSource(ID, { repo: repoOf({ "x/sample/SKILL.md": skill() }, { "x/sample/evil": "/etc/passwd" }) }, real), /Symlink or submodule forbidden: evil/);
    assert.throws(() => inspectSource(ID, { repo: repoOf({ "SKILL.md": skill("sample", "[x](missing.md)") }) }, real), /Missing referenced resource: missing.md/);
    assert.throws(() => inspectSource(ID, { repo: repoOf({ "SKILL.md": skill("sample", "[x](../escape.md)") }) }, real), /Unsafe relative path/);
    assert.throws(() => inspectSource(ID, { repo: repoOf({ "SKILL.md": skill(), ".env": "S=1" }) }, real), /Unsafe relative path/);
    assert.equal(inspectSource(ID, { repo: repoOf({ "SKILL.md": skill("sample", "```\n[x](missing.md)\n```\n[ok](https://x.y) [a](#anchor)") }) }, real).name, "sample");
    assert.throws(() => inspectSource(ID, { repo: repoOf({ "SKILL.md": skill("other") }) }, real), /does not exist/, "root skill with another name is skipped");
    assert.throws(() => inspectSource(ID, { repo: repoOf({ "SKILL.md": skill() }), ref: "no-such-ref" }, real), /Source unavailable or revision invalid; no files installed/);
  } finally { for (const dir of cleanup) rmSync(dir, { recursive: true, force: true }); }
});

test("inspectSource validates options before touching git", () => {
  assert.throws(() => inspectSource(ID, { repo: "relative/path" }, real), /absolute/);
  assert.throws(() => inspectSource(ID, { path: "../SKILL.md" }, real), /Unsafe/);
  assert.throws(() => inspectSource(ID, { path: "skills/sample" }, real), /exact SKILL.md/);
  assert.throws(() => inspectSource("bare", {}, real), /Ambiguous or invalid/);
});

interface Call { command: string; args: string[]; options: SpawnOptions | undefined }

/** Fake deps whose git is scripted. The temp dir is real-looking but in memory. */
function fakeGit(respond: (args: string[], call: number) => Partial<RunResult> | Error): { deps: RuntimeDeps; calls: Call[]; removed: string[] } {
  const calls: Call[] = [];
  const removed: string[] = [];
  const unsupported = (name: string) => (): never => { throw new Error(`fake: ${name}`); };
  const deps = {
    ...real,
    fs: { ...real.fs, mkdtempSync: (prefix: string) => `${prefix}FAKE`, rmSync: (file: string) => { removed.push(file); } },
    path: posix,
    os: { tmpdir: () => "/tmp-fake", platform: () => "linux" },
    proc: { ...real.proc, env: { PATH: "/bin", GIT_TERMINAL_PROMPT: "1" } },
    child: {
      runBytesSync: unsupported("runBytesSync"),
      run: unsupported("run"),
      runSync(command: string, args: string[], options?: SpawnOptions): RunResult {
        calls.push({ command, args, options });
        const out = respond(args, calls.length);
        if (out instanceof Error) throw out;
        return { status: 0, signal: null, stdout: "", stderr: "", ...out };
      },
    },
  } as RuntimeDeps;
  return { deps, calls, removed };
}

test("every git call disables hooks, forbids prompts and has bounded time and output", () => {
  const sha = "a".repeat(40);
  const { deps, calls, removed } = fakeGit((args) => {
    if (args.includes("rev-parse")) return { stdout: `${sha}\n` };
    if (args.includes("ls-tree")) return { stdout: `100644 blob ${"b".repeat(40)}\tSKILL.md\0` };
    if (args.includes("cat-file")) return { stdout: skill(), stdoutBytes: new TextEncoder().encode(skill()) };
    return {};
  });
  const result = inspectSource(ID, {}, deps);
  assert.equal(result.revision, sha);
  assert.ok(calls.length >= 4);
  for (const call of calls) {
    assert.equal(call.command, "git");
    assert.deepEqual(call.args.slice(0, 2), ["-c", "core.hooksPath=/dev/null"], "hooks disabled before the subcommand");
    assert.equal(call.options?.env?.GIT_TERMINAL_PROMPT, "0");
    assert.equal(call.options?.timeoutMs, 60000);
    assert.equal(call.options?.maxBufferBytes, 28 * 1024 * 1024);
  }
  assert.deepEqual(calls[0].args.slice(2, 4), ["-C", "/tmp-fake/workflow-skill-FAKE"]);
  assert.ok(calls[0].args.includes("--no-checkout"));
  assert.deepEqual(removed, ["/tmp-fake/workflow-skill-FAKE"], "temporary directory removed");
  const blob = calls.find((c) => c.args.includes("cat-file") && c.options?.encoding === "buffer");
  assert.ok(blob, "file bodies are requested as raw bytes");
});

test("git failures are reported without leaking git output, and the temp dir is removed", () => {
  for (const failure of [
    { status: 128, stderr: "fatal: could not read from https://user:token@host/x" },
    { status: null, signal: "SIGKILL", errorCode: "ETIMEDOUT" },
    { status: null, errorCode: "ENOBUFS" },
    new Error("spawn git ENOENT"),
  ]) {
    const { deps, removed } = fakeGit(() => failure);
    assert.throws(() => inspectSource(ID, {}, deps), (error: Error) => error.message === "Source unavailable or revision invalid; no files installed" && !/token/.test(error.message));
    assert.equal(removed.length, 1);
  }
});

test("a malformed tree listing and the size and count limits are enforced", () => {
  const sha = "a".repeat(40);
  const head = (args: string[]): Partial<RunResult> | null => (args.includes("rev-parse") ? { stdout: sha } : null);
  assert.throws(() => inspectSource(ID, {}, fakeGit((args) => head(args) ?? { stdout: "garbage\0" }).deps), /Invalid repository tree/);
  const many = Array.from({ length: 1001 }, (_, i) => `100644 blob ${"c".repeat(40)}\tf${i}`).join("\0");
  assert.throws(() => inspectSource(ID, {}, fakeGit((args) => head(args) ?? (args.includes("ls-tree") ? { stdout: `100644 blob ${"b".repeat(40)}\tSKILL.md\0${many}\0` } : { stdout: skill() })).deps), /exceeds 1000 files/);
  const big = new Uint8Array(13 * 1024 * 1024);
  const tree = `100644 blob ${"b".repeat(40)}\tSKILL.md\x00100644 blob ${"d".repeat(40)}\ta.bin\x00100644 blob ${"e".repeat(40)}\tb.bin\0`;
  const r = fakeGit((args) => head(args) ?? (args.includes("ls-tree") ? { stdout: tree } : args.includes("cat-file") && args.includes("b".repeat(40)) ? { stdout: skill(), stdoutBytes: new TextEncoder().encode(skill()) } : { stdout: "", stdoutBytes: big }));
  assert.throws(() => inspectSource(ID, {}, r.deps), /exceeds 25 MiB/);
});

test("case-colliding resources are refused (scripted tree: case-insensitive filesystems cannot hold both)", () => {
  const tree = `100644 blob ${"b".repeat(40)}\tSKILL.md\x00100644 blob ${"d".repeat(40)}\tA.md\x00100644 blob ${"e".repeat(40)}\ta.md\x00`;
  const { deps } = fakeGit((args) => (args.includes("rev-parse") ? { stdout: "a".repeat(40) } : args.includes("ls-tree") ? { stdout: tree } : { stdout: skill(), stdoutBytes: new TextEncoder().encode(skill()) }));
  assert.throws(() => inspectSource(ID, {}, deps), /Case-colliding resource: a.md/);
});

test("main is a no-op that exits 0, like running the old module directly", () => {
  const result = spawnSync("node", [join(import.meta.dirname, "skill-source.mts")], { encoding: "utf8" });
  assert.deepEqual([result.status, result.stdout, result.stderr], [0, "", ""]);
  assert.equal(main([], real), 0);
});
