import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";

import { createBunDeps } from "./runtime/bun.mts";
import { createNodeDeps } from "./runtime/node.mts";
import type { RunResult, RuntimeDeps, SpawnOptions } from "./runtime/types.mts";

// ORCA_ADMIT_UNDER_TEST lets a mutant copy of the module be exercised by the same assertions (mutant proofs).
const admitModule = await import(process.env.ORCA_ADMIT_UNDER_TEST ?? "./orca-diff-admit.mts") as typeof import("./orca-diff-admit.mts");
const { GIT_HARDENING, MAX_ENTRIES, admitDiff, validatePath } = admitModule;
type AdmitResult = Awaited<ReturnType<typeof admitDiff>>;
type Entry = Extract<AdmitResult, { status: "admitted" }>["entries"][number];

// Under Bun the Bun adapter (Bun.spawn / spawnSync) runs git, so both adapters' errorCode and byte paths are exercised.
const nodeDeps = process.versions.bun ? createBunDeps() : createNodeDeps();
const SETUP_ENV = {
  ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid",
  GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid", GIT_TERMINAL_PROMPT: "0",
};

/** Setup-only git (the test harness, not the code under test). Throws on failure. */
function git(cwd: string, args: string[], input?: string | Buffer): string {
  const result = spawnSync("git", args, { cwd, env: SETUP_ENV, input, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout;
}

interface Fixture { base: string; coord: string; wt: string; baseline: string; canary: string; bin: string }
/**
 * Coordinator repo with a baseline commit plus a linked worker worktree. Paths keep the un-resolved os.tmpdir() form on
 * purpose (macOS /var -> /private/var alias), so every test exercises the alias.
 */
function fixture(t: TestContext): Fixture {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "orca-admit-t-"));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const coord = path.join(base, "coord");
  fs.mkdirSync(coord);
  git(coord, ["init", "-q", "-b", "main"]);
  fs.writeFileSync(path.join(coord, "a.txt"), "alpha\n");
  fs.mkdirSync(path.join(coord, "lib"));
  fs.writeFileSync(path.join(coord, "lib", "b.txt"), "beta\n");
  fs.writeFileSync(path.join(coord, "run.sh"), "#!/bin/sh\necho run\n");
  fs.writeFileSync(path.join(coord, "gone.txt"), "to be deleted\n");
  git(coord, ["add", "."]);
  git(coord, ["commit", "-q", "-m", "baseline"]);
  const baseline = git(coord, ["rev-parse", "HEAD"]).trim();
  const wt = path.join(base, "wt");
  git(coord, ["worktree", "add", "-q", "-b", "worker", wt, baseline]);
  const bin = path.join(base, "bin");
  fs.mkdirSync(bin);
  return { base, coord, wt, baseline, canary: path.join(base, "canary.log"), bin };
}

/** Every file, directory and link under a tree, by relative path, with content hash and mode. */
function snapshot(root: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      const stat = fs.lstatSync(full);
      const key = path.relative(root, full);
      if (stat.isSymbolicLink()) out.set(key, `link:${fs.readlinkSync(full)}`);
      else if (stat.isDirectory()) { out.set(key, `dir:${stat.mode}`); walk(full); }
      else out.set(key, `file:${stat.mode}:${createHash("sha256").update(fs.readFileSync(full)).digest("hex")}`);
    }
  };
  walk(root);
  return out;
}

/** Runs admission and asserts the coordinator checkout (working tree and .git) is byte-identical afterwards. */
async function admitChecked(f: Fixture, extra: { deps?: RuntimeDeps; worktree?: string; baseline?: string } = {}): Promise<AdmitResult> {
  const before = snapshot(f.coord);
  const options = { worktree: extra.worktree ?? f.wt, baseline: extra.baseline ?? f.baseline, deps: extra.deps ?? nodeDeps };
  const result = await admitDiff(options);
  assert.deepEqual(snapshot(f.coord), before, "coordinator tree must be byte-identical after admission");
  return result;
}
const rejected = (result: AdmitResult, reason: string, message?: string): void => {
  assert.equal(result.status, "rejected", message ?? `expected rejection ${reason}, got ${JSON.stringify(result).slice(0, 400)}`);
  if (result.status === "rejected") assert.equal(result.reason, reason, message);
};
function admitted(result: AdmitResult): { entries: Entry[]; patch: string } {
  assert.equal(result.status, "admitted", JSON.stringify(result).slice(0, 400));
  if (result.status !== "admitted") throw new Error("unreachable");
  return result;
}
const byPath = (entries: Entry[]): Record<string, Entry> => Object.fromEntries(entries.map((entry) => [entry.path, entry]));

/** Applies the patch to a fresh checkout of the baseline and returns that checkout's path. */
function applyToBaseline(f: Fixture, patch: string): string {
  const verify = path.join(f.base, "verify");
  git(f.coord, ["worktree", "add", "-q", "--detach", verify, f.baseline]);
  git(verify, ["-c", "core.hooksPath=/dev/null", "apply", "--binary", "--whitespace=nowarn", "-"], patch);
  return verify;
}

function script(f: Fixture, name: string, body: string): string {
  const file = path.join(f.bin, name);
  fs.writeFileSync(file, `#!/bin/sh\necho "${name} $*" >> "${f.canary}"\n${body}\n`, { mode: 0o755 });
  return file;
}

test("reports committed, staged, unstaged, untracked and deleted changes; a lying claimed list hides nothing", async (t: TestContext) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.wt, "lib", "b.txt"), "beta committed\n");
  git(f.wt, ["commit", "-q", "-am", "worker commit"]);
  fs.writeFileSync(path.join(f.wt, "a.txt"), "alpha unstaged\n");
  fs.writeFileSync(path.join(f.wt, "staged.txt"), "staged\n");
  git(f.wt, ["add", "staged.txt"]);
  fs.writeFileSync(path.join(f.wt, "untracked.txt"), "untracked\n");
  fs.rmSync(path.join(f.wt, "gone.txt"));
  // The module takes no claimed list; an extra lying property must not influence anything.
  const lying = { worktree: f.wt, baseline: f.baseline, deps: nodeDeps, filesModified: ["a.txt"] };
  const before = snapshot(f.coord);
  const result = admitted(await admitDiff(lying));
  assert.deepEqual(snapshot(f.coord), before);
  const entries = byPath(result.entries);
  assert.deepEqual(Object.keys(entries).sort(), ["a.txt", "gone.txt", "lib/b.txt", "staged.txt", "untracked.txt"]);
  assert.equal(entries["untracked.txt"].kind, "add");
  assert.equal(entries["gone.txt"].kind, "delete");
  assert.equal(entries["gone.txt"].size, 0);
  assert.equal(entries["a.txt"].kind, "modify");
  assert.equal(entries["lib/b.txt"].kind, "modify");
  assert.equal(entries["untracked.txt"].size, "untracked\n".length);
  assert.equal(entries["a.txt"].mode, "100644");
  assert.equal(entries["a.txt"].binary, false);
  const verify = applyToBaseline(f, result.patch);
  for (const name of ["a.txt", "lib/b.txt", "staged.txt", "untracked.txt"]) {
    assert.deepEqual(fs.readFileSync(path.join(verify, name)), fs.readFileSync(path.join(f.wt, name)), name);
  }
  assert.equal(fs.existsSync(path.join(verify, "gone.txt")), false);
});

test("an unchanged worker is admitted with no entries and an empty patch", async (t: TestContext) => {
  const f = fixture(t);
  const result = admitted(await admitChecked(f));
  assert.deepEqual([result.entries, result.patch], [[], ""]);
});

test("binary content round-trips byte for byte through the patch", async (t: TestContext) => {
  const f = fixture(t);
  const bytes = Buffer.concat([Buffer.from([0, 255, 254, 0, 10, 13, 0x80]), randomBytes(4096)]);
  fs.writeFileSync(path.join(f.wt, "blob.bin"), bytes);
  const result = admitted(await admitChecked(f));
  const entry = byPath(result.entries)["blob.bin"];
  assert.equal(entry.binary, true);
  assert.equal(entry.size, bytes.length);
  assert.match(result.patch, /GIT binary patch/);
  const verify = applyToBaseline(f, result.patch);
  assert.deepEqual(fs.readFileSync(path.join(verify, "blob.bin")), bytes);
});

test("non-UTF-8 text round-trips: the patch is re-emitted as binary hunks instead of being mangled", async (t: TestContext) => {
  const f = fixture(t);
  const latin1 = Buffer.from("caf\xe9 cr\xe8me\n", "latin1");
  fs.writeFileSync(path.join(f.wt, "a.txt"), latin1);
  const result = admitted(await admitChecked(f));
  assert.ok(!result.patch.includes("\ufffd"), "no replacement characters in the patch");
  const verify = applyToBaseline(f, result.patch);
  assert.deepEqual(fs.readFileSync(path.join(verify, "a.txt")), latin1);
});

test("names with leading/trailing spaces and shell characters are hashed under their own name and round-trip", async (t: TestContext) => {
  const f = fixture(t);
  const names = [" lead.txt", "trail.txt ", "semi;colon $(x) 'q'.txt", "caf\u00e9 \u65e5\u672c.txt"];
  names.forEach((name, index) => fs.writeFileSync(path.join(f.wt, name), `content ${index}\n`));
  fs.writeFileSync(path.join(f.wt, "a.txt"), "different from every new file\n");
  const result = admitted(await admitChecked(f));
  assert.deepEqual(result.entries.map((entry) => entry.path).sort(), [...names, "a.txt"].sort());
  const verify = applyToBaseline(f, result.patch);
  for (const name of [...names, "a.txt"]) assert.deepEqual(fs.readFileSync(path.join(verify, name)), fs.readFileSync(path.join(f.wt, name)), JSON.stringify(name));
});

test("non-UTF-8 text forced to text by the worker's info/attributes is refused, not mangled", async (t: TestContext) => {
  const f = fixture(t);
  const common = git(f.wt, ["rev-parse", "--path-format=absolute", "--git-common-dir"]).trim();
  fs.mkdirSync(path.join(common, "info"), { recursive: true });
  fs.writeFileSync(path.join(common, "info", "attributes"), "* diff\n");
  fs.writeFileSync(path.join(f.wt, "a.txt"), Buffer.from("caf\xe9\n", "latin1"));
  rejected(await admitChecked(f), "patch-not-utf8");
});

test("a +x flip is an explicit mode on a modify entry and round-trips", async (t: TestContext) => {
  const f = fixture(t);
  fs.chmodSync(path.join(f.wt, "run.sh"), 0o755);
  const result = admitted(await admitChecked(f));
  assert.deepEqual(result.entries, [{ path: "run.sh", kind: "modify", mode: "100755", binary: false, size: fs.statSync(path.join(f.wt, "run.sh")).size }]);
  const verify = applyToBaseline(f, result.patch);
  assert.equal(fs.statSync(path.join(verify, "run.sh")).mode & 0o111, 0o111);
});

test("a rename is annotated on the add while the delete is still reported", async (t: TestContext) => {
  const f = fixture(t);
  git(f.wt, ["mv", "lib/b.txt", "lib/renamed.txt"]);
  git(f.wt, ["commit", "-q", "-m", "rename"]);
  const result = admitted(await admitChecked(f));
  const entries = byPath(result.entries);
  assert.equal(entries["lib/b.txt"].kind, "delete");
  assert.equal(entries["lib/renamed.txt"].kind, "rename");
  assert.equal(entries["lib/renamed.txt"].from, "lib/b.txt");
  assert.equal(result.entries.length, 2);
  assert.match(result.patch, /deleted file mode 100644/);
  assert.match(result.patch, /new file mode 100644/);
});

test("worker .gitattributes filter/diff drivers and worker-set textconv never run (canary absent)", async (t: TestContext) => {
  const f = fixture(t);
  const filter = script(f, "filter.sh", "cat");
  const textconv = script(f, "textconv.sh", "cat \"$1\"");
  const external = script(f, "extdiff.sh", "exit 0");
  git(f.wt, ["config", "filter.evil.clean", filter]);
  git(f.wt, ["config", "filter.evil.smudge", filter]);
  git(f.wt, ["config", "filter.evil.required", "true"]);
  git(f.wt, ["config", "diff.evil.textconv", textconv]);
  git(f.wt, ["config", "diff.evil.command", external]);
  git(f.wt, ["config", "diff.external", external]);
  fs.writeFileSync(path.join(f.wt, ".gitattributes"), "* filter=evil diff=evil\n");
  git(f.wt, ["add", ".gitattributes"]);
  git(f.wt, ["commit", "-q", "-m", "attributes"]);
  fs.writeFileSync(path.join(f.wt, "a.txt"), "alpha changed\n");
  fs.writeFileSync(path.join(f.wt, "new.txt"), "new\n");
  // Positive control: the fixture is live, ordinary git in this worktree does run the worker's drivers.
  fs.rmSync(f.canary, { force: true });
  git(f.wt, ["diff"]);
  assert.ok(fs.existsSync(f.canary), "control: plain git diff runs the worker's filter/textconv");
  fs.rmSync(f.canary);
  const result = admitted(await admitChecked(f));
  assert.equal(fs.existsSync(f.canary), false, "no worker driver ran during admission");
  assert.deepEqual(result.entries.map((entry) => entry.path).sort(), [".gitattributes", "a.txt", "new.txt"]);
  assert.match(result.patch, /\+alpha changed/, "content is the raw bytes, not a filtered rendering");
});

test("worker-set core.hooksPath and core.fsmonitor never run (canary absent)", async (t: TestContext) => {
  const f = fixture(t);
  const hooks = path.join(f.base, "hooks");
  fs.mkdirSync(hooks);
  for (const hook of ["pre-commit", "post-commit", "post-index-change", "post-checkout", "reference-transaction", "pre-auto-gc", "post-rewrite"]) {
    fs.writeFileSync(path.join(hooks, hook), `#!/bin/sh\necho "hook ${hook}" >> "${f.canary}"\nexit 0\n`, { mode: 0o755 });
  }
  const monitor = script(f, "fsmonitor.sh", "exit 0");
  git(f.wt, ["config", "core.hooksPath", hooks]);
  git(f.wt, ["config", "core.fsmonitor", monitor]);
  fs.writeFileSync(path.join(f.wt, "a.txt"), "alpha changed\n");
  // Positive controls: ordinary git in this worktree runs the worker's fsmonitor and hooks.
  git(f.wt, ["status", "--porcelain"]);
  git(f.wt, ["add", "run.sh"]);
  git(f.wt, ["commit", "-q", "--allow-empty", "-m", "control"]);
  const control = fs.readFileSync(f.canary, "utf8");
  assert.match(control, /fsmonitor\.sh/, "control: fsmonitor ran");
  assert.match(control, /hook post-index-change/, "control: an index write runs post-index-change");
  fs.rmSync(f.canary);
  const result = admitted(await admitChecked(f));
  assert.equal(fs.existsSync(f.canary), false, `no worker hook or fsmonitor ran: ${fs.existsSync(f.canary) ? fs.readFileSync(f.canary, "utf8") : ""}`);
  assert.deepEqual(result.entries.map((entry) => entry.path), ["a.txt"]);
});

test("rejects an untracked symlink and a committed symlink entry", async (t: TestContext) => {
  const f = fixture(t);
  fs.symlinkSync("/etc/passwd", path.join(f.wt, "link"));
  const first = await admitChecked(f);
  rejected(first, "symlink");
  assert.equal(first.status === "rejected" && first.path, "link");
  git(f.wt, ["add", "link"]);
  git(f.wt, ["commit", "-q", "-m", "link"]);
  rejected(await admitChecked(f), "symlink");
});

test("rejects a path through a symlinked directory, and the victim outside stays untouched and unread", async (t: TestContext) => {
  const f = fixture(t);
  const outside = path.join(f.base, "outside");
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, "b.txt"), "secret victim\n");
  const victim = snapshot(outside);
  // The symlink itself is ignored, so only the tracked path lib/b.txt reaches it through the link.
  fs.writeFileSync(path.join(f.wt, ".gitignore"), "lib\n");
  fs.rmSync(path.join(f.wt, "lib"), { recursive: true });
  fs.symlinkSync(outside, path.join(f.wt, "lib"));
  const result = await admitChecked(f);
  rejected(result, "symlink-ancestor");
  assert.equal(result.status === "rejected" && result.path, "lib/b.txt");
  assert.deepEqual(snapshot(outside), victim);
});

test("rejects a gitlink in the index and an untracked nested repository", async (t: TestContext) => {
  const f = fixture(t);
  const nested = path.join(f.wt, "sub");
  fs.mkdirSync(nested);
  git(nested, ["init", "-q"]);
  fs.writeFileSync(path.join(nested, "x.txt"), "x\n");
  git(nested, ["add", "."]);
  git(nested, ["commit", "-q", "-m", "nested"]);
  rejected(await admitChecked(f), "gitlink", "untracked nested repository");
  git(f.wt, ["add", "sub"]);
  const staged = git(f.wt, ["ls-files", "-s", "sub"]);
  assert.match(staged, /^160000 /, "fixture: sub is a gitlink in the worker index");
  rejected(await admitChecked(f), "gitlink", "gitlink entry");
});

test("rejects a FIFO at a tracked path; an untracked FIFO is invisible to git and never part of the change", async (t: TestContext) => {
  const f = fixture(t);
  fs.rmSync(path.join(f.wt, "a.txt"));
  const made = spawnSync("mkfifo", [path.join(f.wt, "a.txt")]);
  if (made.status !== 0) { t.skip("mkfifo unavailable"); return; }
  const result = await admitChecked(f);
  rejected(result, "non-regular");
  assert.equal(result.status === "rejected" && result.path, "a.txt");
  const g = fixture(t);
  spawnSync("mkfifo", [path.join(g.wt, "pipe")]);
  assert.deepEqual(admitted(await admitChecked(g)).entries, []);
});

test("rejects setuid and setgid bits", async (t: TestContext) => {
  const f = fixture(t);
  const file = path.join(f.wt, "run.sh");
  fs.chmodSync(file, 0o4755);
  if (!(fs.statSync(file).mode & 0o4000)) { t.skip("filesystem drops setuid"); return; }
  rejected(await admitChecked(f), "mode-special");
  fs.chmodSync(file, 0o2755);
  if (fs.statSync(file).mode & 0o2000) rejected(await admitChecked(f), "mode-special");
});

/** Two names that one case-/normalization-insensitive filesystem treats as the same file, both staged by the worker. */
function addCollision(f: Fixture, first: string, twin: string): void {
  fs.writeFileSync(path.join(f.wt, first), "one\n");
  git(f.wt, ["add", "--", first]);
  if (!fs.existsSync(path.join(f.wt, twin))) { fs.writeFileSync(path.join(f.wt, twin), "two\n"); git(f.wt, ["add", "--", twin]); return; }
  // On APFS/NTFS both names cannot exist on disk: the worker stages the twin directly in its index.
  const sha = git(f.wt, ["hash-object", "-w", "--stdin"], "two\n").trim();
  git(f.wt, ["update-index", "-z", "--add", "--index-info"], `100644 ${sha}\t${twin}\0`);
}

test("rejects case-fold collisions between entries and with existing baseline paths", async (t: TestContext) => {
  const f = fixture(t);
  addCollision(f, "Note.txt", "note.txt");
  rejected(await admitChecked(f), "case-collision");
  const g = fixture(t);
  if (fs.existsSync(path.join(g.wt, "LIB", "b.txt"))) {
    // Case-insensitive disk: Lib is lib. The worker stages a twin directory in its index instead.
    const sha = git(g.wt, ["hash-object", "-w", "--stdin"], "y\n").trim();
    git(g.wt, ["update-index", "-z", "--add", "--index-info"], `100644 ${sha}\tLib/y.txt\0`);
    fs.writeFileSync(path.join(g.wt, "lib", "y.txt"), "y\n");
  } else {
    fs.mkdirSync(path.join(g.wt, "Lib"));
    fs.writeFileSync(path.join(g.wt, "Lib", "y.txt"), "y\n");
  }
  rejected(await admitChecked(g), "case-collision", "a directory that differs only in case from a baseline directory");
});

test("rejects NFC/NFD twins as a collision", async (t: TestContext) => {
  const f = fixture(t);
  addCollision(f, "caf\u00e9.txt", "cafe\u0301.txt");
  rejected(await admitChecked(f), "case-collision");
});

test("rejects hostile names created on disk: newline, backslash, leading dash", async (t: TestContext) => {
  for (const [name, reason] of [["new\nline.txt", "path-control"], ["back\\slash.txt", "path-backslash"], ["-rf", "path-dash"], ["tab\tname", "path-control"]]) {
    const f = fixture(t);
    fs.writeFileSync(path.join(f.wt, name), "x\n");
    rejected(await admitChecked(f), reason, JSON.stringify(name));
  }
});

/** Real deps whose `ls-files --others` output gains hostile names, to reach rules disk names cannot. */
function injectUntracked(names: string[]): RuntimeDeps {
  return { ...nodeDeps, child: { ...nodeDeps.child, run: async (command, args, options) => {
    const result = await nodeDeps.child.run(command, args, options);
    return args.includes("--others") ? { ...result, stdout: result.stdout + names.map((name) => `${name}\0`).join("") } : result;
  } } };
}

test("rejects listed paths with .., absolute, drive, empty or dot segments, .git components and over-long names", async (t: TestContext) => {
  const f = fixture(t);
  const cases: Array<[string, string]> = [
    ["../escape.txt", "path-dotdot"], ["lib/../../escape", "path-dotdot"], ["/etc/passwd", "path-absolute"], ["C:/x", "path-absolute"],
    ["a//b", "path-invalid"], ["a/./b", "path-invalid"], [".git/config", "path-git-dir"], ["sub/.GIT/hooks/x", "path-git-dir"],
    ["sub/.git./x", "path-git-dir"], ["GIT~1/x", "path-git-dir"], ["x".repeat(256), "path-too-long"], [`${"d/".repeat(2100)}f`, "path-too-long"],
    ["\"quoted\"", "path-invalid"], ["bad\ufffdname", "path-invalid"], ["zero\u200bwidth", "path-control"], ["rtl\u202eexe.txt", "path-control"],
  ];
  for (const [name, reason] of cases) rejected(await admitChecked(f, { deps: injectUntracked([name]) }), reason, JSON.stringify(name).slice(0, 60));
});

test("validatePath accepts ordinary names and refuses each hostile class", () => {
  for (const ok of ["a.txt", "dir/sub/file.md", "caf\u00e9.txt", ".github/workflows/ci.yml", ".gitignore", "a-b/c-d", "x".repeat(255)]) assert.equal(validatePath(ok), undefined, ok);
  const cases: Array<[unknown, string]> = [
    ["", "path-invalid"], [42, "path-invalid"], ["a\0b", "path-control"], ["a\nb", "path-control"], ["a\x7fb", "path-control"],
    ["../x", "path-dotdot"], ["a/..", "path-dotdot"], ["/abs", "path-absolute"], ["c:\\x", "path-absolute"], ["a\\b", "path-backslash"],
    ["-x", "path-dash"], ["a/", "path-invalid"], [".", "path-invalid"], [".git", "path-git-dir"], ["a/.Git/b", "path-git-dir"],
    ["a/.git /b", "path-git-dir"], ["\u00e9".repeat(128), "path-too-long"], ["a/".repeat(2048) + "b", "path-too-long"],
  ];
  for (const [value, reason] of cases) assert.equal(validatePath(value), reason, JSON.stringify(value).slice(0, 40));
});

test("rejects a baseline that is not a full 40-hex id, starts with -, is unknown, or is not an ancestor", async (t: TestContext) => {
  const f = fixture(t);
  rejected(await admitChecked(f, { baseline: `-${f.baseline.slice(1)}` }), "baseline-dash");
  rejected(await admitChecked(f, { baseline: "--output=/tmp/x" }), "baseline-dash");
  for (const bad of ["HEAD", f.baseline.slice(0, 12), f.baseline.toUpperCase(), `${f.baseline}0`, `${f.baseline.slice(0, 39)} `, "main"]) {
    rejected(await admitChecked(f, { baseline: bad }), "baseline-invalid", bad);
  }
  rejected(await admitChecked(f, { baseline: "0123456789abcdef0123456789abcdef01234567" }), "baseline-unknown");
  // A blob id is a real object but not a commit.
  rejected(await admitChecked(f, { baseline: git(f.coord, ["rev-parse", "HEAD:a.txt"]).trim() }), "baseline-unknown");
  // A commit on a side branch the worker never built on.
  git(f.coord, ["checkout", "-q", "-b", "side"]);
  git(f.coord, ["commit", "-q", "--allow-empty", "-m", "side"]);
  const side = git(f.coord, ["rev-parse", "HEAD"]).trim();
  git(f.coord, ["checkout", "-q", "main"]);
  rejected(await admitChecked(f, { baseline: side }), "baseline-not-ancestor");
});

test("rejects a worktree path that is not the absolute top level of the worker checkout", async (t: TestContext) => {
  const f = fixture(t);
  rejected(await admitChecked(f, { worktree: path.join(f.wt, "lib") }), "worktree-mismatch");
  rejected(await admitChecked(f, { worktree: "wt" }), "worktree-invalid");
  rejected(await admitChecked(f, { worktree: path.join(f.base, "missing") }), "worktree-invalid");
});

test("the macOS /var alias and its realpath give the same admission", async (t: TestContext) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.wt, "a.txt"), "alias\n");
  const aliased = admitted(await admitChecked(f, { worktree: f.wt }));
  const real = admitted(await admitChecked(f, { worktree: fs.realpathSync(f.wt) }));
  assert.deepEqual(aliased, real);
  if (process.platform === "darwin") assert.notEqual(fs.realpathSync(f.wt), f.wt, "fixture really uses the /var alias");
});

test("rejects more than MAX_ENTRIES entries and more than 20 MiB of content", async (t: TestContext) => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.wt, "many"));
  assert.equal(MAX_ENTRIES, 500, "the bound is part of the contract");
  for (let index = 0; index <= 500; index++) fs.writeFileSync(path.join(f.wt, "many", `f${index}.txt`), `${index}\n`);
  rejected(await admitChecked(f), "too-large");
  fs.rmSync(path.join(f.wt, "many", "f0.txt"));
  admitted(await admitChecked(f));
  const g = fixture(t);
  fs.writeFileSync(path.join(g.wt, "big.bin"), Buffer.alloc(20 * 1024 * 1024 + 1, 7));
  rejected(await admitChecked(g), "too-large");
});

test("rejects an unmerged index", async (t: TestContext) => {
  const f = fixture(t);
  const sha = git(f.wt, ["hash-object", "-w", "--stdin"], "conflict\n").trim();
  git(f.wt, ["update-index", "--index-info"], `0 ${"0".repeat(40)}\ta.txt\n100644 ${sha} 1\ta.txt\n100644 ${sha} 2\ta.txt\n100644 ${sha} 3\ta.txt\n`);
  assert.match(git(f.wt, ["ls-files", "-u"]), /a\.txt/, "fixture: a.txt is unmerged");
  rejected(await admitChecked(f), "unmerged");
});

test("a worker file named like the baseline id cannot be confused with a revision (-- separator)", async (t: TestContext) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.wt, f.baseline), "named like a commit\n");
  const result = admitted(await admitChecked(f));
  assert.deepEqual(result.entries.map((entry) => entry.path), [f.baseline]);
});

/** Records every git invocation the module makes while delegating to the real adapter. */
function recording(env: Record<string, string | undefined> = nodeDeps.proc.env) {
  const calls: Array<{ command: string; args: string[]; options: SpawnOptions; sync: boolean }> = [];
  const deps: RuntimeDeps = {
    ...nodeDeps, proc: { ...nodeDeps.proc, env },
    child: {
      ...nodeDeps.child,
      run: async (command, args, options = {}) => { calls.push({ command, args, options, sync: false }); return nodeDeps.child.run(command, args, options); },
      runSync: (command, args, options = {}) => { calls.push({ command, args, options, sync: true }); return nodeDeps.child.runSync(command, args, options); },
    },
  };
  return { calls, deps };
}

test("every git call is hardened: -c settings first, allow-listed env, cwd at the real top level, bounded, -- before paths", async (t: TestContext) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.wt, "a.txt"), "changed\n");
  const env = { PATH: ["relative/bin", ".", ...String(process.env.PATH).split(path.delimiter)].join(path.delimiter), GITHUB_TOKEN: "secret", HOME: "/home/x",
    GIT_DIR: "/evil", GIT_CONFIG_PARAMETERS: "'core.hooksPath'='/evil'", GIT_EXTERNAL_DIFF: "/evil", NODE_OPTIONS: "--require x" };
  const { calls, deps } = recording(env);
  admitted(await admitChecked(f, { deps }));
  assert.ok(calls.length >= 10);
  const allowed = new Set(["PATH", "GIT_CONFIG_NOSYSTEM", "GIT_CONFIG_GLOBAL", "GIT_TERMINAL_PROMPT", "GIT_ATTR_NOSYSTEM", "GIT_NO_REPLACE_OBJECTS",
    "GIT_OPTIONAL_LOCKS", "GIT_PAGER", "LC_ALL", "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_INDEX_FILE"]);
  for (const call of calls) {
    const label = call.args.filter((arg) => !arg.includes("=")).slice(0, 3).join(" ");
    assert.equal(call.command, "git");
    assert.deepEqual(call.args.slice(0, GIT_HARDENING.length), [...GIT_HARDENING], label);
    for (const setting of ["core.hooksPath=/dev/null", "core.fsmonitor=false", "core.attributesFile=/dev/null", "diff.external=", "protocol.file.allow=never"]) {
      assert.ok(call.args.includes(setting), `${label}: ${setting}`);
    }
    const keys = Object.keys(call.options.env ?? {});
    assert.deepEqual(keys.filter((key) => !allowed.has(key)), [], label);
    const e = call.options.env ?? {};
    assert.deepEqual([e.GIT_CONFIG_NOSYSTEM, e.GIT_CONFIG_GLOBAL, e.GIT_TERMINAL_PROMPT, e.GIT_ATTR_NOSYSTEM], ["1", "/dev/null", "0", "1"], label);
    assert.ok(String(e.PATH).split(path.delimiter).every((entry) => path.isAbsolute(entry)), `${label}: PATH absolute only`);
    assert.equal(call.options.cwd, fs.realpathSync(f.wt), label);
    assert.ok(Number.isInteger(call.options.timeoutMs) && (call.options.timeoutMs as number) >= 1 && (call.options.timeoutMs as number) <= 30_000, label);
    assert.ok((call.options.maxBufferBytes ?? 0) > 0, label);
    const sub = call.args[GIT_HARDENING.length + (call.args[GIT_HARDENING.length]?.startsWith("--attr-source=") ? 1 : 0)];
    if (sub === "diff") {
      for (const flag of ["--no-ext-diff", "--no-textconv"]) assert.ok(call.args.includes(flag), `${label}: ${flag}`);
      assert.equal(call.args[call.args.length - 1], "--", `${label}: -- ends the revision list`);
    }
    if (sub === "hash-object" && call.args.includes("--stdin-paths")) assert.ok(call.args.includes("--no-filters"), label);
  }
  assert.ok(calls.some((call) => call.sync && call.args.includes("--binary")), "the patch is read as bytes");
});

test("timeout and output overflow are recognised only by errorCode and rejected without a retry", async (t: TestContext) => {
  const f = fixture(t);
  const outcome = async (fake: Partial<RunResult>, at: string): Promise<{ result: AdmitResult; count: number }> => {
    let count = 0;
    const forged = (args: string[]): boolean => args.includes(at);
    const deps: RuntimeDeps = { ...nodeDeps, child: { ...nodeDeps.child,
      run: async (command, args, options) => {
        if (!forged(args)) return nodeDeps.child.run(command, args, options);
        count++;
        return { status: null, signal: "SIGKILL", stdout: "", stderr: "", ...fake };
      },
      runSync: (command, args, options) => {
        if (!forged(args)) return nodeDeps.child.runSync(command, args, options);
        count++;
        return { status: null, signal: "SIGKILL", stdout: "", stderr: "", ...fake };
      } } };
    return { result: await admitChecked(f, { deps }), count };
  };
  fs.writeFileSync(path.join(f.wt, "a.txt"), "changed\n");
  for (const at of ["rev-parse", "ls-files", "hash-object", "--raw", "--binary"]) {
    const timeout = await outcome({ errorCode: "ETIMEDOUT" }, at);
    rejected(timeout.result, "git-timeout", at);
    assert.equal(timeout.count, 1, `${at}: no retry`);
    rejected((await outcome({ errorCode: "ENOBUFS" }, at)).result, "git-output-limit", at);
    rejected((await outcome({ stderr: "ETIMEDOUT" }, at)).result, "git-failed", `${at}: a kill without errorCode is a plain failure`);
  }
});

test("a file changed between lstat and hashing is refused", async (t: TestContext) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.wt, "a.txt"), "changed\n");
  const deps: RuntimeDeps = { ...nodeDeps, child: { ...nodeDeps.child, run: async (command, args, options) => {
    if (args.includes("--stdin-paths")) fs.writeFileSync(path.join(f.wt, "a.txt"), "swapped while hashing, longer\n");
    return nodeDeps.child.run(command, args, options);
  } } };
  rejected(await admitChecked(f, { deps }), "worktree-changed");
});

test("nothing is written to the worker repository and the scratch directory is removed", async (t: TestContext) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.wt, "a.txt"), "changed\n");
  fs.writeFileSync(path.join(f.wt, "new.bin"), randomBytes(512));
  const worker = snapshot(f.wt);
  const { calls, deps } = recording();
  admitted(await admitChecked(f, { deps }));
  assert.deepEqual(snapshot(f.wt), worker);
  const scratch = calls.map((call) => call.options.env?.GIT_INDEX_FILE).find(Boolean);
  assert.ok(scratch, "a temporary index was used");
  assert.equal(fs.existsSync(path.dirname(String(scratch))), false, "scratch directory removed");
});

test("a thrown dependency error fails closed as admit-error", async (t: TestContext) => {
  const f = fixture(t);
  const deps: RuntimeDeps = { ...nodeDeps, child: { ...nodeDeps.child, run: async () => { throw new Error("spawn boom"); } } };
  rejected(await admitChecked(f, { deps }), "admit-error");
});
