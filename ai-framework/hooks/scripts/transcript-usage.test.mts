import assert from "node:assert/strict";
import test from "node:test";
import type { TestContext } from "node:test";

import { createTestDeps, spawnSync, tempFixture } from "../../scripts/runtime/test-helpers.mts";
import type { RuntimeDeps } from "../../scripts/runtime/types.mts";
import { readTranscriptUsage } from "./transcript-usage.mts";
import type { UsageRead } from "./transcript-usage.mts";

type Json = ReturnType<typeof JSON.parse>;
const base = createTestDeps();
const { fs, path } = base;

interface Fixture { deps: RuntimeDeps; home: string; projects: string; file: string }
function fixture(t: TestContext, env: Record<string, string | undefined> = {}): Fixture {
  const home = tempFixture(base, {});
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const projects = path.join(home, ".claude", "projects");
  fs.mkdirSync(projects, { recursive: true });
  return { deps: createTestDeps({ HOME: home, CLAUDE_CONFIG_DIR: undefined, ...env }), home, projects, file: path.join(projects, "t.jsonl") };
}

const usage = (id: string, extra: Json = {}, output = 5): string => `${JSON.stringify({ type: "assistant", message: { id, model: "claude-test-1", role: "assistant", usage: { input_tokens: 10, cache_creation_input_tokens: 2, cache_read_input_tokens: 3, output_tokens: output, ...extra } } })}\n`;
const ok = (result: UsageRead): Extract<UsageRead, { status: "ok" }> => {
  assert.equal(result.status, "ok", JSON.stringify(result));
  return result as Extract<UsageRead, { status: "ok" }>;
};
const ids = (result: UsageRead): string[] => ok(result).messages.map((message) => message.messageId);

test("reads numbers per message and resumes from the stored position", (t) => {
  const f = fixture(t);
  fs.writeFileSync(f.file, usage("m1") + usage("m2"));
  const first = ok(readTranscriptUsage(f.file, f.deps, { final: true }));
  assert.deepEqual(first.messages.map((m) => [m.messageId, m.model, m.input, m.cacheWrite, m.cacheRead, m.output]), [["m1", "claude-test-1", 10, 2, 3, 5], ["m2", "claude-test-1", 10, 2, 3, 5]]);
  assert.equal(first.position.offset, fs.statSync(f.file).size);
  assert.equal(first.messages[0].endOffset, Buffer.byteLength(usage("m1")));
  fs.appendFileSync(f.file, usage("m3"));
  assert.deepEqual(ids(readTranscriptUsage(f.file, f.deps, { final: true, previous: first.position })), ["m3"]);
  assert.deepEqual(ids(readTranscriptUsage(f.file, f.deps, { final: true, previous: ok(readTranscriptUsage(f.file, f.deps, { final: true })).position })), []);
});

test("a partial trailing line is not parsed and the position stops at the last complete newline", (t) => {
  const f = fixture(t);
  const partial = usage("m2").trimEnd();
  fs.writeFileSync(f.file, usage("m1") + partial);
  const first = ok(readTranscriptUsage(f.file, f.deps, { final: true }));
  assert.deepEqual(ids(first), ["m1"]);
  assert.equal(first.position.offset, Buffer.byteLength(usage("m1")));
  fs.appendFileSync(f.file, "\n");
  assert.deepEqual(ids(readTranscriptUsage(f.file, f.deps, { final: true, previous: first.position })), ["m2"]);
});

test("a shorter file or a changed inode resets to the start, and ids already counted are not returned again", (t) => {
  const f = fixture(t);
  fs.writeFileSync(f.file, usage("m1") + usage("m2") + usage("m3"));
  const first = ok(readTranscriptUsage(f.file, f.deps, { final: true }));
  fs.writeFileSync(f.file, usage("m1") + usage("m4"));
  const shorter = ok(readTranscriptUsage(f.file, f.deps, { final: true, previous: first.position, recentIds: ["m1", "m2", "m3"] }));
  assert.equal(shorter.reset, true);
  assert.deepEqual(shorter.messages.map((m) => m.messageId), ["m4"]);
  const replaced = ok(readTranscriptUsage(f.file, f.deps, { final: true, previous: { ...shorter.position, ino: shorter.position.ino + 1 } }));
  assert.equal(replaced.reset, true);
  assert.equal(ok(readTranscriptUsage(f.file, f.deps, { final: true, previous: { ...shorter.position, dev: shorter.position.dev + 1 } })).reset, true);
});

test("lines that repeat one message id give one entry, the last; a group that may still grow is held back", (t) => {
  const f = fixture(t);
  fs.writeFileSync(f.file, usage("m1", {}, 1) + usage("m1", {}, 7) + usage("m2", {}, 2) + usage("m2", {}, 9));
  const open = ok(readTranscriptUsage(f.file, f.deps));
  assert.deepEqual(open.messages.map((m) => [m.messageId, m.output]), [["m1", 7]], "the open last group waits");
  assert.equal(open.position.offset, Buffer.byteLength(usage("m1", {}, 1) + usage("m1", {}, 7)));
  fs.appendFileSync(f.file, usage("m3"));
  assert.deepEqual(ok(readTranscriptUsage(f.file, f.deps, { previous: open.position })).messages.map((m) => [m.messageId, m.output]), [["m2", 9]]);
  const done = ok(readTranscriptUsage(f.file, f.deps, { final: true }));
  assert.deepEqual(done.messages.map((m) => [m.messageId, m.output]), [["m1", 7], ["m2", 9], ["m3", 5]]);
});

test("sidechain lines and lines without usage are skipped", (t) => {
  const f = fixture(t);
  const side = `${JSON.stringify({ isSidechain: true, message: { id: "side", usage: { input_tokens: 1 } } })}\n`;
  const user = `${JSON.stringify({ type: "user", message: { role: "user", content: "hello" } })}\n`;
  fs.writeFileSync(f.file, side + user + "not json\n" + usage("m1"));
  assert.deepEqual(ids(readTranscriptUsage(f.file, f.deps, { final: true })), ["m1"]);
});

test("token values that are fractional, negative, above 1e12 or not numbers come back null", (t) => {
  const f = fixture(t);
  fs.writeFileSync(f.file, usage("m1", { input_tokens: 1.5, cache_creation_input_tokens: -1, cache_read_input_tokens: 2e12, output_tokens: "7" }) + usage("m2", { input_tokens: 1e12 }));
  const [first, second] = ok(readTranscriptUsage(f.file, f.deps, { final: true })).messages;
  assert.deepEqual([first.input, first.cacheWrite, first.cacheRead, first.output], [null, null, null, null]);
  assert.equal(second.input, 1e12);
});

test("the byte cap and the time cap stop at the last complete line and report capped; an over-long line is skipped", (t) => {
  const f = fixture(t);
  fs.writeFileSync(f.file, usage("m1") + usage("m2") + usage("m3") + usage("m4"));
  const one = Buffer.byteLength(usage("m1"));
  const bytes = ok(readTranscriptUsage(f.file, f.deps, { byteCap: one * 2 + 5, final: true }));
  assert.equal(bytes.capped, true);
  assert.deepEqual(ids(bytes), ["m1"], "m2 is the open group at the boundary");
  assert.equal(bytes.position.offset, one);
  assert.deepEqual(ids(readTranscriptUsage(f.file, f.deps, { previous: bytes.position, final: true })), ["m2", "m3", "m4"]);

  let now = 0;
  const ticking: RuntimeDeps = { ...f.deps, clock: { ...f.deps.clock, monotonicMs: () => (now += 100) } };
  const timed = ok(readTranscriptUsage(f.file, ticking, { timeCapMs: 250, final: true }));
  assert.equal(timed.capped, true);
  assert.ok(timed.position.offset < fs.statSync(f.file).size);

  fs.writeFileSync(f.file, usage("big", { filler: "x".repeat(500) }) + usage("m1"));
  const skipped = ok(readTranscriptUsage(f.file, f.deps, { lineCap: 300, final: true }));
  assert.deepEqual(ids(skipped), ["m1"]);
  assert.equal(skipped.position.offset, fs.statSync(f.file).size, "the offset advanced past the skipped line");
});

test("refusals are distinct, never null: link leaf, FIFO, ancestor link, outside the Claude home, missing home", (t) => {
  const f = fixture(t);
  const outside = tempFixture(base, { "o.jsonl": usage("o1") });
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.symlinkSync(path.join(outside, "o.jsonl"), path.join(f.projects, "leaf.jsonl"));
  assert.deepEqual(readTranscriptUsage(path.join(f.projects, "leaf.jsonl"), f.deps), { status: "refused", reason: "symlink-leaf" });

  const fifo = path.join(f.projects, "pipe.jsonl");
  assert.equal(spawnSync("mkfifo", [fifo]).status, 0);
  assert.deepEqual(readTranscriptUsage(fifo, f.deps), { status: "refused", reason: "not-regular" }, "refused without ever blocking on open");

  fs.symlinkSync(outside, path.join(f.projects, "dir"));
  assert.deepEqual(readTranscriptUsage(path.join(f.projects, "dir", "o.jsonl"), f.deps), { status: "refused", reason: "escapes-root" });
  assert.deepEqual(readTranscriptUsage(path.join(outside, "o.jsonl"), f.deps), { status: "refused", reason: "outside-root" });
  assert.deepEqual(readTranscriptUsage(path.join(f.projects, "missing.jsonl"), f.deps), { status: "refused", reason: "unreadable" });
  assert.deepEqual(readTranscriptUsage(f.file, createTestDeps({ HOME: undefined, CLAUDE_CONFIG_DIR: undefined })), { status: "refused", reason: "no-claude-home" });
});

test("CLAUDE_CONFIG_DIR replaces ~/.claude as the root", (t) => {
  const f = fixture(t);
  const config = tempFixture(base, { "projects/c.jsonl": usage("c1") });
  t.after(() => fs.rmSync(config, { recursive: true, force: true }));
  const deps = createTestDeps({ HOME: f.home, CLAUDE_CONFIG_DIR: config });
  assert.deepEqual(ids(readTranscriptUsage(path.join(config, "projects", "c.jsonl"), deps, { final: true })), ["c1"]);
  fs.writeFileSync(f.file, usage("h1"));
  assert.deepEqual(readTranscriptUsage(f.file, deps), { status: "refused", reason: "outside-root" }, "the home directory is not used when a config directory is set");
});

test("a Claude home given through the macOS /var alias is accepted", (t) => {
  const alias = tempFixture(base, { ".claude/projects/a.jsonl": usage("a1") }, { resolve: false });
  t.after(() => fs.rmSync(alias, { recursive: true, force: true }));
  if (process.platform !== "darwin") return t.skip("no /var alias on this platform");
  assert.notEqual(alias, fs.realpathSync(alias), "the fixture really is an alias");
  const deps = createTestDeps({ HOME: alias, CLAUDE_CONFIG_DIR: undefined });
  assert.deepEqual(ids(readTranscriptUsage(path.join(alias, ".claude", "projects", "a.jsonl"), deps, { final: true })), ["a1"]);
});

test("output carries numbers and bounded ids only, never transcript text, in a result or a refusal", (t) => {
  const f = fixture(t);
  const marker = "TRANSCRIPT-TEXT-MARKER";
  const line = JSON.stringify({ type: "assistant", message: { id: "m1", model: "claude-test-1", content: [{ type: "text", text: marker }, { type: "thinking", thinking: marker }, { type: "tool_use", input: { command: marker } }], usage: { input_tokens: 1, output_tokens: 2 } }, toolUseResult: marker });
  const hostileModel = JSON.stringify({ message: { id: "m2", model: marker + " with spaces", usage: { input_tokens: 1 } } });
  fs.writeFileSync(f.file, `${line}\n${hostileModel}\n${JSON.stringify({ message: { id: `${marker} spaces`, usage: {} } })}\n`);
  const result = readTranscriptUsage(f.file, f.deps, { final: true });
  assert.doesNotMatch(JSON.stringify(result), /TRANSCRIPT-TEXT-MARKER/);
  assert.equal(ok(result).messages[1].model, null, "a model with spaces is not a model name");
  assert.equal(ok(result).messages.length, 2, "an id with spaces is not an id");
  const refused = readTranscriptUsage(path.join(f.projects, `${marker}.jsonl`), f.deps);
  assert.doesNotMatch(JSON.stringify(refused), /TRANSCRIPT-TEXT-MARKER/);
  assert.doesNotMatch(JSON.stringify(refused), new RegExp(f.home.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("a line longer than the whole read window does not stall the cursor", (t) => {
  const f = fixture(t);
  fs.writeFileSync(f.file, "x".repeat(600) + "\n" + usage("m1"));
  const first = ok(readTranscriptUsage(f.file, f.deps, { byteCap: 250, final: true }));
  assert.equal(first.capped, true);
  assert.deepEqual(ids(first), []);
  assert.equal(first.position.offset, 250, "the window was stepped over, not re-read forever");
  let position = first.position;
  let seen: string[] = [];
  for (let step = 0; step < 20 && seen.length === 0; step += 1) {
    const next = ok(readTranscriptUsage(f.file, f.deps, { byteCap: 250, final: true, previous: position }));
    assert.ok(next.position.offset > position.offset || next.messages.length > 0, "every call makes progress");
    seen = next.messages.map((m) => m.messageId);
    position = next.position;
  }
  assert.deepEqual(seen, ["m1"], "the message after the oversized line is still read");
});

test("containment is judged again after the open, so an ancestor swapped in between is refused", (t) => {
  const f = fixture(t);
  const outside = tempFixture(base, { "o.jsonl": usage("o1") });
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.mkdirSync(path.join(f.projects, "d"));
  fs.writeFileSync(path.join(f.projects, "d", "t.jsonl"), usage("m1"));
  let swapped = false;
  const racing: RuntimeDeps = { ...f.deps, fs: { ...f.deps.fs, openSync: (file: string, flags: string | number, mode?: number) => {
    const fd = f.deps.fs.openSync(file, flags, mode);
    if (!swapped) {
      swapped = true;
      fs.renameSync(path.join(f.projects, "d"), path.join(f.projects, "d-moved"));
      fs.symlinkSync(outside, path.join(f.projects, "d"));
    }
    return fd;
  } } };
  const result = readTranscriptUsage(path.join(f.projects, "d", "t.jsonl"), racing, { final: true });
  assert.equal(result.status, "refused");
});

test("a file replaced between the check and the open is refused as changed-while-opening", (t) => {
  const f = fixture(t);
  fs.writeFileSync(f.file, usage("m1"));
  let calls = 0;
  const racing: RuntimeDeps = { ...f.deps, fs: { ...f.deps.fs, lstatSync: (file: string) => {
    const stat = f.deps.fs.lstatSync(file);
    calls += 1;
    // The first lstat belongs to the admission check; the second is the one the open is compared with.
    return calls === 2 ? Object.assign(Object.create(Object.getPrototypeOf(stat)), stat, { ino: stat.ino + 1 }) : stat;
  } } };
  assert.deepEqual(readTranscriptUsage(f.file, racing, { final: true }), { status: "refused", reason: "changed-while-opening" });
});
