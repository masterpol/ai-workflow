import assert from "node:assert/strict";
import { test } from "node:test";

import { leastLoaded, nextMember, pickImplementer, pickReviewer } from "./orca-assign.mts";
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

test("load absent or empty preserves today's exact round-robin", () => {
  const pool = ["opencode", "claude", "codex"];
  for (const load of [undefined, new Map<string, number>(), new Map([["unknown", 99]])]) {
    assert.deepEqual([0, 1, 2, 3, 4].map((planIndex) => vendorOf(pickImplementer({ pool, planIndex, load }))), ["opencode", "claude", "codex", "opencode", "claude"]);
  }
});

test("least-loaded member wins, with plan position as the tie-break", () => {
  assert.equal(vendorOf(pickImplementer({ pool: ["a", "b", "c"], planIndex: 0, load: new Map([["a", 1], ["b", 0], ["c", 2]]) })), "b");
  assert.equal(vendorOf(pickImplementer({ pool: ["a", "b", "c"], planIndex: 1, load: new Map([["a", 0], ["b", 0], ["c", 0]]) })), "b");
  assert.equal(vendorOf(pickImplementer({ pool: ["a", "b", "c"], planIndex: 2, load: new Map([["a", 1], ["b", 1], ["c", 0]]) })), "c");
});

test("load keys for non-members are ignored", () => {
  const pick = pickImplementer({ pool: ["a", "b"], planIndex: 0, load: new Map([["a", 0], ["c", 1000], ["d", -1]]) });
  assert.deepEqual(pick, { ok: true, vendor: "a", source: "least-loaded" });
});

test("recorded vendor wins even when it has the highest load", () => {
  assert.deepEqual(pickImplementer({ pool: ["a", "b"], planIndex: 0, recorded: "a", load: new Map([["a", 100], ["b", 0]]) }), { ok: true, vendor: "a", source: "recorded" });
  assert.deepEqual(pickReviewer({ pool: ["a", "b"], planIndex: 0, implementer: "b", recorded: "a", load: new Map([["a", 100], ["b", 0]]) }), { ok: true, vendor: "a", source: "recorded" });
});

test("reviewer still excludes the implementer and respects load", () => {
  const pool = ["claude", "codex", "opencode"];
  assert.deepEqual(pickReviewer({ pool, planIndex: 0, implementer: "codex", load: new Map([["claude", 2], ["codex", 0], ["opencode", 1]]) }), { ok: true, vendor: "opencode", source: "least-loaded" });
  assert.deepEqual(pickReviewer({ pool, planIndex: 1, implementer: "codex", load: new Map([["claude", 0], ["codex", 0], ["opencode", 0]]) }), { ok: true, vendor: "opencode", source: "least-loaded" });
  assert.deepEqual(pickReviewer({ pool: ["codex"], planIndex: 0, implementer: "codex", load: new Map([["codex", 0]]) }), { ok: false, reason: "review-independence-unavailable" });
});

test("pool independence: shared load balances greedily across roles over a sequence", () => {
  const implementers = ["codex", "claude", "opencode"];
  const reviewers = ["codex", "opencode"];
  const load = new Map<string, number>();
  const record = (vendor: string) => load.set(vendor, (load.get(vendor) ?? 0) + 1);
  for (let planIndex = 0; planIndex < 10; planIndex++) {
    const implPick = pickImplementer({ pool: implementers, planIndex, load });
    assert.ok(implPick.ok, JSON.stringify(implPick));
    const implLoad = load.get(implPick.vendor) ?? 0;
    for (const member of implementers) {
      assert.ok((load.get(member) ?? 0) >= implLoad, `implementer ${implPick.vendor} at ${planIndex} is not least-loaded vs ${member}`);
    }
    record(implPick.vendor);
    const revPick = pickReviewer({ pool: reviewers, planIndex, implementer: implPick.vendor, load });
    assert.ok(revPick.ok, JSON.stringify(revPick));
    const revLoad = load.get(revPick.vendor) ?? 0;
    for (const member of reviewers) {
      if (member === implPick.vendor) continue;
      assert.ok((load.get(member) ?? 0) >= revLoad, `reviewer ${revPick.vendor} at ${planIndex} is not least-loaded vs ${member}`);
    }
    record(revPick.vendor);
  }
});

test("leastLoaded returns undefined for an empty member list", () => {
  assert.equal(leastLoaded([], 0), undefined);
  assert.equal(leastLoaded([], 5, new Map([["a", 0]])), undefined);
});

test("determinism with load: the same arguments give the same answer x1000", () => {
  const pool = ["a", "b", "c", "d"];
  const loads = [
    new Map([["a", 3], ["b", 1], ["c", 2], ["d", 0]]),
    new Map([["a", 0], ["b", 0], ["c", 0], ["d", 0]]),
    new Map([["b", 5]]),
  ];
  const calls = Array.from({ length: 1000 }, (_, i) => ({ planIndex: (i * 7919) % 97, skip: i % 3 === 0 ? ["b"] : [], load: loads[i % loads.length] }));
  const first = calls.map((call) => pickImplementer({ pool, ...call }));
  const reversed = [...calls].reverse().map((call) => pickImplementer({ pool, ...call })).reverse();
  assert.deepEqual(reversed, first);
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

test("mutants: ignoring load or tie rotation fails a load-based test", async (t) => {
  const source = fs.readFileSync(SOURCE, "utf8");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orca-assign-load-mutant-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const load = async (name: string, text: string) => {
    const file = path.join(dir, `${name}.mts`);
    fs.writeFileSync(file, text);
    return await import(fileUrl(file)) as typeof import("./orca-assign.mts");
  };

  const ignoresLoad = await load("a", source.replace("memberLoad(member, load)", "0"));
  const shifted = ignoresLoad.pickImplementer({ pool: ["a", "b", "c"], planIndex: 0, load: new Map([["a", 5], ["b", 0], ["c", 5]]) });
  assert.ok(shifted.ok && shifted.vendor === "a", "mutant ignoring load picks the rotation winner, proving load ordering is needed");

  const ignoresRotation = await load("b", source.replace("rotationDistance(i, planIndex, n)", "0"));
  const rotated = ignoresRotation.pickImplementer({ pool: ["a", "b", "c"], planIndex: 1, load: new Map([["a", 0], ["b", 0], ["c", 0]]) });
  assert.ok(rotated.ok && rotated.vendor === "a", "mutant ignoring rotation picks the first member, proving the tie-break is needed");
});

test("a pick says whether load informed it: no load is plain rotation, a load map is least-loaded", () => {
  assert.equal(pickImplementer({ pool: ["a", "b"], planIndex: 1 }).ok && (pickImplementer({ pool: ["a", "b"], planIndex: 1 }) as { source: string }).source, "round-robin");
  assert.equal(pickImplementer({ pool: ["a", "b"], planIndex: 1, load: new Map() }).ok && (pickImplementer({ pool: ["a", "b"], planIndex: 1, load: new Map() }) as { source: string }).source, "round-robin");
  assert.equal((pickReviewer({ pool: ["a", "b"], planIndex: 0, implementer: "a", load: new Map([["b", 1]]) }) as { source: string }).source, "least-loaded");
});
