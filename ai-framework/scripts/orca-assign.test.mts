import assert from "node:assert/strict";
import { test } from "node:test";

import { nextMember, pickImplementer, pickReviewer } from "./orca-assign.mts";
import { createTestDeps, fileUrl } from "./runtime/test-helpers.mts";
const testDeps = createTestDeps();
const fs = testDeps.fs;
const os = testDeps.os;
const path = testDeps.path;

const SOURCE = path.join(import.meta.dirname, "orca-assign.mts");
const vendorOf = (pick: ReturnType<typeof pickImplementer>): string => { assert.ok(pick.ok, JSON.stringify(pick)); return pick.vendor; };

test("round-robin follows plan order over the pool", () => {
  const pool = ["opencode", "claude", "codex"];
  assert.deepEqual([0, 1, 2, 3, 4].map((planIndex) => vendorOf(pickImplementer({ pool, planIndex }))), ["opencode", "claude", "codex", "opencode", "claude"]);
});

test("a skipped member is removed before spreading, and the rest keep round-robin", () => {
  const pool = ["opencode", "claude", "codex"];
  assert.deepEqual([0, 1, 2, 3].map((planIndex) => vendorOf(pickImplementer({ pool, planIndex, skip: ["claude"] }))), ["opencode", "codex", "opencode", "codex"]);
  assert.deepEqual(pickImplementer({ pool, planIndex: 0, skip: pool }), { ok: false, reason: "pool-exhausted" });
});

test("determinism: the same arguments give the same answer regardless of call order or history", () => {
  const pool = ["a", "b", "c", "d"];
  const calls = Array.from({ length: 1000 }, (_, i) => ({ planIndex: (i * 7919) % 97, skip: i % 3 === 0 ? ["b"] : [] }));
  const first = calls.map((call) => pickImplementer({ pool, ...call }));
  const reversed = [...calls].reverse().map((call) => pickImplementer({ pool, ...call })).reverse();
  assert.deepEqual(reversed, first);
  assert.ok(!/^(let|var) /m.test(fs.readFileSync(SOURCE, "utf8")), "module keeps no mutable state");
  assert.ok(!/^import /m.test(fs.readFileSync(SOURCE, "utf8")), "module has no imports");
});

test("spread: 40 scopes over a 16-member pool land within one of each other", () => {
  const pool = Array.from({ length: 16 }, (_, i) => `w${i}`);
  const counts = new Map<string, number>();
  for (let planIndex = 0; planIndex < 40; planIndex++) counts.set(vendorOf(pickImplementer({ pool, planIndex })), (counts.get(vendorOf(pickImplementer({ pool, planIndex }))) ?? 0) + 1);
  assert.equal(counts.size, 16);
  assert.ok(Math.max(...counts.values()) - Math.min(...counts.values()) <= 1);
});

test("resume stability: the recorded vendor wins even when the pool or skip set changed", () => {
  const pick = pickImplementer({ pool: ["claude", "codex"], planIndex: 0, skip: ["claude"], recorded: "claude" });
  assert.deepEqual(pick, { ok: true, vendor: "claude", source: "recorded" });
  assert.deepEqual(pickReviewer({ pool: ["codex"], planIndex: 3, implementer: "codex", recorded: "opencode" }), { ok: true, vendor: "opencode", source: "recorded" });
});

test("review: never the implementer, spread across the others, and blocked when none exists", () => {
  const pool = ["claude", "codex", "opencode"];
  for (let planIndex = 0; planIndex < 12; planIndex++) {
    assert.notEqual(vendorOf(pickReviewer({ pool, planIndex, implementer: "codex" })), "codex");
  }
  assert.deepEqual([0, 1, 2, 3].map((planIndex) => vendorOf(pickReviewer({ pool, planIndex, implementer: "codex" }))), ["claude", "opencode", "claude", "opencode"]);
  assert.deepEqual(pickReviewer({ pool: ["codex"], planIndex: 0, implementer: "codex" }), { ok: false, reason: "review-independence-unavailable" });
  assert.deepEqual(pickReviewer({ pool, planIndex: 0, implementer: "codex", skip: ["claude", "opencode"] }), { ok: false, reason: "review-independence-unavailable" });
  assert.deepEqual(pickReviewer({ pool, planIndex: 0 }), { ok: false, reason: "implementer-unknown" });
  assert.deepEqual(pickReviewer({ pool, planIndex: 0, implementer: "codex", skip: pool }), { ok: false, reason: "pool-exhausted" });
});

test("retry rotation: pool order after the last tried member, circular, one lap", () => {
  const pool = ["claude", "codex", "opencode"];
  assert.deepEqual(nextMember(pool, ["claude"]), { ok: true, vendor: "codex", source: "round-robin" });
  assert.deepEqual(nextMember(pool, ["codex"]), { ok: true, vendor: "opencode", source: "round-robin" });
  assert.deepEqual(nextMember(pool, ["opencode"]), { ok: true, vendor: "claude", source: "round-robin" });
  assert.deepEqual(nextMember(pool, ["claude", "codex"]), { ok: true, vendor: "opencode", source: "round-robin" });
  assert.deepEqual(nextMember(pool, ["claude", "codex", "opencode"]), { ok: false, reason: "exhausted" });
  assert.deepEqual(nextMember(pool, ["claude"], ["codex"]), { ok: true, vendor: "opencode", source: "round-robin" });
  assert.deepEqual(nextMember(["solo"], ["solo"]), { ok: false, reason: "exhausted" });
});

test("rejects malformed input without throwing", () => {
  for (const input of [{ pool: [], planIndex: 0 }, { pool: ["a", "a"], planIndex: 0 }, { pool: ["a"], planIndex: -1 }, { pool: ["a"], planIndex: 1.5 },
    { pool: [""], planIndex: 0 }, { pool: "a" as unknown as string[], planIndex: 0 }]) {
    assert.deepEqual(pickImplementer(input), { ok: false, reason: "invalid-input" });
    assert.deepEqual(pickReviewer({ ...input, implementer: "x" }), { ok: false, reason: "invalid-input" });
  }
  assert.deepEqual(nextMember(["a", "b"], []), { ok: false, reason: "invalid-input" });
});

test("mutants: weakening the reviewer or rotation guard makes the suite's assertions fail", async (t) => {
  const source = fs.readFileSync(SOURCE, "utf8");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orca-assign-mutant-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const load = async (name: string, text: string) => {
    const file = path.join(dir, `${name}.mts`);
    fs.writeFileSync(file, text);
    return await import(fileUrl(file)) as typeof import("./orca-assign.mts");
  };
  const pool = ["claude", "codex"];
  const dropsReviewGuard = await load("a", source.replace("member !== input.implementer", "member === member"));
  const reviewed = dropsReviewGuard.pickReviewer({ pool, planIndex: 0, implementer: "claude" });
  assert.ok(reviewed.ok && reviewed.vendor === "claude", "mutant lets the implementer review itself, which the reviewer test forbids");
  const skipsTried = await load("b", source.replace("!used.has(member)", "true"));
  const repeated = skipsTried.nextMember(["claude", "codex"], ["claude", "codex"]);
  assert.equal(repeated.ok, true, "mutant never reports exhaustion, which the rotation test forbids");
});
