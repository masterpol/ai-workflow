import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";

import { ATTEMPT_PREFIX, MAX_RECORD_BYTES, TASK_PREFIX, attemptKeyOf, createLedger, idOf, taskKeyOf } from "./orca-ledger.mts";
import type { LedgerRecord } from "./orca-ledger.mts";
import { createNodeDeps } from "./runtime/node.mts";
import type { FsDeps, RuntimeDeps } from "./runtime/types.mts";

const deps = createNodeDeps();
const LEDGER = [".project", "metrics", "orca-ledger"];

/** Canonical (realpath) temp root: on macOS os.tmpdir() sits behind the /var -> /private/var alias. */
function fixture(t: TestContext): string {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "orca-ledger-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
const ledgerDir = (root: string): string => path.join(root, ...LEDGER);
const slot = (root: string, id: string): string => path.join(ledgerDir(root), `attempt-${id}.json`);
const mkLedgerDir = (root: string): void => fs.mkdirSync(ledgerDir(root), { recursive: true });
function rec(id = "a1", extra: Partial<LedgerRecord> = {}): LedgerRecord {
  return { attemptKey: attemptKeyOf(id), taskKey: taskKeyOf("t1"), vendor: "codex", state: "claimed", createdAt: 1000, ...extra };
}
const withFs = (overrides: Partial<FsDeps>): RuntimeDeps => ({ ...deps, fs: { ...deps.fs, ...overrides } });
const tree = (dir: string): string[] => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).map(String).sort() : []);
const fifoOk = (): boolean => deps.child.runSync("mkfifo", ["--help"]).status !== null;

test("read reports missing, refused, corrupt and ok as four distinct outcomes", (t) => {
  const root = fixture(t);
  const ledger = createLedger(root, deps);
  assert.deepEqual(ledger.read(attemptKeyOf("a1")), { status: "missing" }); // no ledger dir at all
  assert.equal(fs.existsSync(path.join(root, ".project")), false, "a read creates nothing");
  mkLedgerDir(root);
  assert.deepEqual(ledger.read(attemptKeyOf("a1")), { status: "missing" });
  fs.writeFileSync(slot(root, "bad"), "{not json");
  fs.writeFileSync(slot(root, "shape"), JSON.stringify({ attemptKey: "attempt:shape" }));
  fs.writeFileSync(slot(root, "other"), serializeFor(rec("different")));
  fs.writeFileSync(path.join(root, "victim"), "x");
  fs.symlinkSync(path.join(root, "victim"), slot(root, "link"));
  assert.deepEqual(ledger.read(attemptKeyOf("bad")), { status: "corrupt" });
  assert.deepEqual(ledger.read(attemptKeyOf("shape")), { status: "corrupt" });
  assert.deepEqual(ledger.read(attemptKeyOf("other")), { status: "corrupt" }); // file name must match the record's own key
  assert.deepEqual(ledger.read(attemptKeyOf("link")), { status: "refused" });
  assert.equal(ledger.claim(rec("ok1")).outcome, "claimed");
  assert.deepEqual(ledger.read(attemptKeyOf("ok1")), { status: "ok", record: rec("ok1") });
});
const serializeFor = (record: LedgerRecord): string => JSON.stringify(record);

test("claim is idempotent for the identical record, conflicts for a different one, and survives a restart", (t) => {
  const root = fixture(t);
  const first = createLedger(root, deps).claim(rec());
  assert.deepEqual(first, { outcome: "claimed", record: rec() });
  const restarted = createLedger(root, deps);
  assert.deepEqual(restarted.claim(rec()), { outcome: "replayed", record: rec() });
  const other = restarted.claim(rec("a1", { vendor: "claude" }));
  assert.equal(other.outcome, "conflict");
  assert.deepEqual((other as { record: LedgerRecord }).record, rec(), "the existing owner is returned untouched");
  assert.equal(restarted.claim(rec("a1", { taskKey: taskKeyOf("t2") })).outcome, "conflict");
  assert.deepEqual(restarted.read(attemptKeyOf("a1")), { status: "ok", record: rec() });
  assert.deepEqual(tree(ledgerDir(root)), ["attempt-a1.json"]);
});

test("a lost create race is re-read and classified, never overwritten", (t) => {
  const root = fixture(t);
  mkLedgerDir(root);
  let raced = false;
  const racing = withFs({
    openSync(file, flags, mode) {
      if (!raced && flags === "wx") {
        raced = true;
        fs.writeFileSync(file, serializeFor(rec("a1", { vendor: "claude" })));
        throw Object.assign(new Error("exists"), { code: "EEXIST" });
      }
      return deps.fs.openSync(file, flags, mode);
    },
  });
  assert.equal(createLedger(root, racing).claim(rec()).outcome, "conflict");
  assert.equal(JSON.parse(fs.readFileSync(slot(root, "a1"), "utf8")).vendor, "claude");
});

test("claim over a corrupt slot fails and leaves the bytes alone (shared reader must not make the writer destructive)", (t) => {
  const root = fixture(t);
  mkLedgerDir(root);
  const garbage = "{ torn write — valuable evidence of an unknown owner";
  fs.writeFileSync(slot(root, "a1"), garbage);
  const ledger = createLedger(root, deps);
  assert.deepEqual(ledger.claim(rec()), { outcome: "corrupt" });
  assert.equal(fs.readFileSync(slot(root, "a1"), "utf8"), garbage);
  assert.equal(ledger.update(attemptKeyOf("a1"), { state: "launched" }).status, "corrupt");
  assert.equal(fs.readFileSync(slot(root, "a1"), "utf8"), garbage);
});

test("claim over an oversize slot is refused and the bytes stay identical", (t) => {
  const root = fixture(t);
  mkLedgerDir(root);
  const big = JSON.stringify({ ...rec(), pad: "x".repeat(MAX_RECORD_BYTES) });
  fs.writeFileSync(slot(root, "a1"), big);
  const ledger = createLedger(root, deps);
  assert.deepEqual(ledger.read(attemptKeyOf("a1")), { status: "refused" });
  assert.deepEqual(ledger.claim(rec()), { outcome: "refused" });
  assert.equal(ledger.update(attemptKeyOf("a1"), { state: "launched" }).status, "refused");
  assert.equal(fs.readFileSync(slot(root, "a1"), "utf8"), big);
});

test("a leaf symlink to a victim file is refused by read, claim and update and the victim stays byte-identical", (t) => {
  const root = fixture(t);
  mkLedgerDir(root);
  const victim = path.join(root, "victim.txt");
  const bytes = "precious victim bytes\n";
  fs.writeFileSync(victim, bytes);
  fs.symlinkSync(victim, slot(root, "a1"));
  const ledger = createLedger(root, deps);
  assert.deepEqual(ledger.read(attemptKeyOf("a1")), { status: "refused" });
  assert.deepEqual(ledger.claim(rec()), { outcome: "refused" });
  assert.equal(ledger.update(attemptKeyOf("a1"), { state: "launched" }).status, "refused");
  assert.equal(fs.readFileSync(victim, "utf8"), bytes);
  assert.equal(fs.lstatSync(slot(root, "a1")).isSymbolicLink(), true);
  // dangling symlink: also not "missing", and the create must not follow it to make the target.
  fs.symlinkSync(path.join(root, "not-yet"), slot(root, "a2"));
  assert.deepEqual(ledger.claim(rec("a2")), { outcome: "refused" });
  assert.equal(fs.existsSync(path.join(root, "not-yet")), false);
});

test("a symlink on any directory component is refused and nothing is written through it", (t) => {
  for (const depth of [1, 2, 3]) {
    const root = fixture(t);
    const target = path.join(root, `elsewhere-${depth}`);
    fs.mkdirSync(path.join(target, ...LEDGER.slice(depth)), { recursive: true });
    const marker = path.join(target, "marker");
    fs.writeFileSync(marker, "m");
    const parent = path.join(root, ...LEDGER.slice(0, depth - 1));
    fs.mkdirSync(parent, { recursive: true });
    fs.symlinkSync(target, path.join(root, ...LEDGER.slice(0, depth)));
    const ledger = createLedger(root, deps);
    assert.equal(ledger.claim(rec()).outcome, "refused", `component ${depth}`);
    assert.equal(ledger.read(attemptKeyOf("a1")).status, "refused");
    assert.equal(ledger.update(attemptKeyOf("a1"), { state: "launched" }).status, "refused");
    assert.equal(ledger.list().status, "refused");
    assert.deepEqual(tree(target), tree(target).filter((entry) => !entry.endsWith("json")), "nothing written through the link");
    assert.equal(fs.readFileSync(marker, "utf8"), "m");
  }
});

test("a non-directory in the ledger path is refused", (t) => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, ".project"));
  fs.writeFileSync(path.join(root, ".project", "metrics"), "i am a file");
  const ledger = createLedger(root, deps);
  assert.equal(ledger.read(attemptKeyOf("a1")).status, "refused");
  assert.equal(ledger.claim(rec()).outcome, "refused");
  assert.equal(fs.readFileSync(path.join(root, ".project", "metrics"), "utf8"), "i am a file");
});

test("a FIFO slot is refused without blocking and is not replaced", { skip: !fifoOk() && "mkfifo unavailable" }, (t) => {
  const root = fixture(t);
  mkLedgerDir(root);
  assert.equal(deps.child.runSync("mkfifo", [slot(root, "a1")]).status, 0);
  const ledger = createLedger(root, deps);
  assert.deepEqual(ledger.read(attemptKeyOf("a1")), { status: "refused" });
  assert.deepEqual(ledger.claim(rec()), { outcome: "refused" });
  assert.equal(ledger.update(attemptKeyOf("a1"), { state: "launched" }).status, "refused");
  assert.equal(fs.lstatSync(slot(root, "a1")).isFIFO(), true);
});

test("a directory in a slot is a non-regular file and is refused", (t) => {
  const root = fixture(t);
  mkLedgerDir(root);
  fs.mkdirSync(slot(root, "a1"));
  const ledger = createLedger(root, deps);
  assert.deepEqual(ledger.read(attemptKeyOf("a1")), { status: "refused" });
  assert.deepEqual(ledger.claim(rec()), { outcome: "refused" });
});

test("join keys carry fixed prefixes and bare or swapped keys are rejected", (t) => {
  const root = fixture(t);
  const ledger = createLedger(root, deps);
  assert.equal(ATTEMPT_PREFIX, "attempt:");
  assert.equal(TASK_PREFIX, "task:");
  assert.equal(attemptKeyOf("7"), "attempt:7");
  assert.notEqual(attemptKeyOf("7"), taskKeyOf("7"));
  assert.equal(idOf("attempt:7", ATTEMPT_PREFIX), "7");
  assert.equal(idOf("task:7", ATTEMPT_PREFIX), undefined);
  // Integer-like ids as bare keys would be reordered by an insertion-ordered map; the prefix keeps them string-keyed.
  assert.deepEqual(Object.keys({ [attemptKeyOf("2")]: 1, [attemptKeyOf("1")]: 1 }), ["attempt:2", "attempt:1"]);
  assert.equal(ledger.claim({ ...rec(), attemptKey: "a1" }).outcome, "invalid");
  assert.equal(ledger.claim({ ...rec(), taskKey: "t1" }).outcome, "invalid");
  assert.equal(ledger.claim({ ...rec(), attemptKey: taskKeyOf("a1") }).outcome, "invalid");
  assert.equal(ledger.claim({ ...rec(), taskKey: attemptKeyOf("t1") }).outcome, "invalid");
  assert.equal(ledger.read("a1").status, "refused");
  assert.equal(ledger.claim(rec("7")).outcome, "claimed");
  assert.equal(ledger.claim(rec("7", { taskKey: taskKeyOf("7") })).outcome, "conflict");
});

test("keys outside the allow-list grammar are rejected and never touch the filesystem", (t) => {
  const root = fixture(t);
  const ledger = createLedger(root, deps);
  const bad = ["", "../escape", "a/b", "a\\b", "..", "a..b", ".hidden", "-lead", "a b", "a\0b", "x".repeat(65), "é", "a:b", "a%2fb", "a\n"];
  for (const id of bad) {
    assert.equal(ledger.claim(rec("ok", { attemptKey: attemptKeyOf(id) })).outcome, "invalid", JSON.stringify(id));
    assert.equal(ledger.claim(rec("ok", { taskKey: taskKeyOf(id) })).outcome, "invalid", JSON.stringify(id));
    assert.equal(ledger.read(attemptKeyOf(id)).status, "refused", JSON.stringify(id));
    assert.equal(ledger.update(attemptKeyOf(id), { state: "launched" }).status, "invalid", JSON.stringify(id));
  }
  assert.equal(ledger.claim(rec("ok", { dispatchId: "../x" })).outcome, "invalid");
  assert.equal(ledger.claim(rec("ok", { vendor: "gemini" })).outcome, "invalid");
  assert.equal(ledger.claim(rec("ok", { state: "launched" })).outcome, "invalid", "a claim starts in claimed");
  assert.equal(ledger.claim({ ...rec("ok"), extra: 1 } as LedgerRecord).outcome, "invalid");
  assert.equal(ledger.claim(rec("x".repeat(64))).outcome, "claimed");
  assert.deepEqual(tree(root), [".project", ".project/metrics", ".project/metrics/orca-ledger", `.project/metrics/orca-ledger/attempt-${"x".repeat(64)}.json`]);
});

test("completion needs a reportId; a launch acknowledgement never completes an attempt", (t) => {
  const root = fixture(t);
  const ledger = createLedger(root, deps);
  const key = attemptKeyOf("a1");
  ledger.claim(rec());
  assert.equal(ledger.update(key, { state: "completed" }).status, "rejected", "claimed -> completed is not a transition");
  assert.equal(ledger.update(key, { state: "launched", dispatchId: "d1" }).status, "ok");
  assert.equal(ledger.update(key, { dispatchId: "d1" }).status, "ok", "repeating the same dispatch id is a no-op");
  assert.equal(ledger.update(key, { dispatchId: "d2" }).status, "rejected", "a recorded dispatch id is never replaced");
  assert.equal(ledger.update(key, { state: "completed" }).status, "rejected");
  assert.equal(ledger.update(key, { state: "completed", reportId: "" }).status, "invalid");
  assert.equal(ledger.update(key, { state: "completed", reportId: "../r" }).status, "invalid");
  assert.equal((ledger.read(key) as { record: LedgerRecord }).record.state, "launched");
  assert.equal(ledger.update(key, { reportId: "r1" }).status, "rejected", "a report id cannot ride an unrelated update");
  assert.equal(ledger.update(key, { state: "failed", reportId: "r1" }).status, "rejected");
  const done = ledger.update(key, { state: "completed", reportId: "r1" });
  assert.deepEqual(done, { status: "ok", record: rec("a1", { state: "completed", dispatchId: "d1", reportId: "r1" }) });
  assert.equal(ledger.update(key, { reportId: "r2" }).status, "rejected", "the report is write-once");
  // A hand-written completed record without a reportId is corrupt, not trusted.
  mkLedgerDir(root);
  fs.writeFileSync(slot(root, "forged"), serializeFor(rec("forged", { state: "completed" })));
  assert.deepEqual(ledger.read(attemptKeyOf("forged")), { status: "corrupt" });
  assert.equal(ledger.claim(rec("c1", { state: "completed", reportId: "r" })).outcome, "invalid");
});

test("update follows the allowed transitions only and never mutates identity fields", (t) => {
  const root = fixture(t);
  const ledger = createLedger(root, deps);
  const key = attemptKeyOf("a1");
  assert.equal(ledger.update(key, { state: "launched" }).status, "missing");
  assert.deepEqual(tree(root), []);
  ledger.claim(rec());
  assert.equal(ledger.update(key, { state: "settled" }).status, "rejected");
  assert.equal(ledger.update(key, { state: "claimed" }).status, "rejected");
  assert.equal(ledger.update(key, { state: "bogus" as never }).status, "rejected");
  for (const field of ["attemptKey", "taskKey", "vendor", "createdAt"]) {
    assert.equal(ledger.update(key, { [field]: "x" } as never).status, "invalid", field);
  }
  assert.equal(ledger.update(key, { state: "unknown-liveness" }).status, "ok");
  assert.equal(ledger.update(key, { state: "launched" }).status, "ok");
  assert.equal(ledger.update(key, { state: "failed" }).status, "ok");
  assert.equal(ledger.update(key, { state: "launched" }).status, "rejected");
  assert.equal(ledger.update(key, { state: "settled" }).status, "ok");
  assert.equal(ledger.update(key, { state: "failed" }).status, "rejected");
  assert.deepEqual(tree(ledgerDir(root)), ["attempt-a1.json"], "no temp files left behind");
  const final = (ledger.read(key) as { record: LedgerRecord }).record;
  assert.deepEqual([final.attemptKey, final.taskKey, final.vendor, final.createdAt], [key, "task:t1", "codex", 1000]);
});

test("update refuses when the slot is swapped for a symlink before the replace", (t) => {
  const root = fixture(t);
  const ledger = createLedger(root, deps);
  ledger.claim(rec());
  const victim = path.join(root, "victim");
  fs.writeFileSync(victim, "v");
  const swapping = withFs({
    renameSync(from, to) {
      fs.rmSync(to);
      fs.symlinkSync(victim, to);
      deps.fs.renameSync(from, to);
    },
  });
  // The pre-rename inspection passes; the swap happens inside rename, so the contract here is the victim is not written.
  createLedger(root, swapping).update(attemptKeyOf("a1"), { state: "launched" });
  assert.equal(fs.readFileSync(victim, "utf8"), "v");
  assert.deepEqual(tree(ledgerDir(root)).filter((name) => name.startsWith(".tmp-")), []);
});

test("list reports refused and corrupt slots instead of skipping them and ignores foreign names", (t) => {
  const root = fixture(t);
  const ledger = createLedger(root, deps);
  assert.deepEqual(ledger.list(), { status: "missing", entries: [] });
  ledger.claim(rec("a1"));
  ledger.claim(rec("a2"));
  fs.writeFileSync(slot(root, "a3"), "garbage");
  fs.symlinkSync(path.join(root, "nowhere"), slot(root, "a4"));
  fs.writeFileSync(path.join(ledgerDir(root), "notes.txt"), "x");
  fs.writeFileSync(path.join(ledgerDir(root), ".tmp-leftover"), "x");
  const listed = ledger.list();
  assert.equal(listed.status, "ok");
  assert.deepEqual(listed.entries.map((entry) => [entry.attemptKey, entry.result.status]),
    [["attempt:a1", "ok"], ["attempt:a2", "ok"], ["attempt:a3", "corrupt"], ["attempt:a4", "refused"]]);
});

test("a root reached through a symlink alias works and writes land under its realpath", (t) => {
  const root = fixture(t);
  const alias = path.join(os.tmpdir(), `orca-ledger-alias-${process.pid}-${Date.now()}`);
  fs.symlinkSync(root, alias);
  t.after(() => fs.rmSync(alias, { force: true }));
  const ledger = createLedger(alias, deps);
  assert.equal(ledger.claim(rec()).outcome, "claimed");
  assert.equal(fs.existsSync(slot(root, "a1")), true);
  assert.equal(fs.realpathSync(ledgerDir(alias)), ledgerDir(root));
  assert.equal(ledger.read(attemptKeyOf("a1")).status, "ok");
  // The raw os.tmpdir() spelling (the /var alias on macOS) is accepted too.
  const raw = fs.mkdtempSync(path.join(os.tmpdir(), "orca-ledger-raw-"));
  t.after(() => fs.rmSync(raw, { recursive: true, force: true }));
  assert.equal(createLedger(raw, deps).claim(rec()).outcome, "claimed");
  assert.equal(fs.existsSync(path.join(fs.realpathSync(raw), ...LEDGER, "attempt-a1.json")), true);
});

test("the module imports no node: builtin", () => {
  const source = fs.readFileSync(path.join(import.meta.dirname, "orca-ledger.mts"), "utf8");
  assert.equal(/node:/.test(source), false);
});
