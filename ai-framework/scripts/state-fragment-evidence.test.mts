import assert from "node:assert/strict";
import { after, test } from "node:test";

import { createTestDeps, tempFixture } from "./runtime/test-helpers.mts";
import type { Citations } from "./state-fragment.mts";

// STATE_FRAGMENT_EVIDENCE_UNDER_TEST lets a mutant copy of the module be exercised by the same assertions (mutant proofs).
const evidenceModule = await import(process.env.STATE_FRAGMENT_EVIDENCE_UNDER_TEST ?? "./state-fragment-evidence.mts") as typeof import("./state-fragment-evidence.mts");
const { checkCitations, MAX_CITATIONS } = evidenceModule;

const MAX_PATH_TEXT = 101; // "a/" x 101 is 202 characters, just over the 200-character href cap
const deps = createTestDeps();
const { fs, path } = deps;

const FILES: Record<string, string> = {
  "docs/a.md": "a", "docs/b.md": "b", ".env": "KEY=1", ".claude/projects/p/s.jsonl": "{}", "sessions/x.md": "x", ".sessions/x.md": "x",
  "notes/transcript.md": "t", "notes/my_session-log.txt": "t", "notes/conversation-2026.md": "c", "notes/session.mts": "legit", "notes/transcripts-index.mts": "legit",
};
const root = tempFixture(deps, FILES);
fs.symlinkSync("docs/a.md", path.join(root, "link.md"));
after(() => fs.rmSync(root, { recursive: true, force: true }));

// Every shape-hostile href is also listed by the snapshot, so only the checker can refuse it.
const HOSTILE = ["../x", "../secrets", "/etc/passwd", "//host/x", "https://example.com", "file:///etc/passwd", "%2e%2e/x", "docs\\a.md", ".env", ".claude/projects/p/s.jsonl", "sessions/x.md", ".sessions/x.md", "notes/transcript.md", "notes/my_session-log.txt", "notes/conversation-2026.md", "link.md"];
const fact = (value: unknown, evidence: string[] = []) => ({ value, status: "observed", evidence });
const snapshot = {
  evidence: fact("files", [...Object.keys(FILES).filter((name) => name !== "docs/b.md"), ...HOSTILE]),
  pitches: { items: fact(["a", "b", "c"]), count: fact(3), ratio: fact(-2.5), label: fact("three"), zero: fact(0) },
};
// JSON.parse makes __proto__ an own data property, which an object literal cannot.
const hostile = JSON.parse('{"pitches":{"__proto__":{"value":5,"status":"observed","evidence":[]},"constructor":{"value":5,"status":"observed","evidence":[]},"prototype":{"value":5,"status":"observed","evidence":[]}}}');

const cite = (extra: Partial<Citations> = {}): Citations => ({ hrefs: [], numbers: [], unbound: 0, ...extra });
const hrefs = (...list: string[]) => cite({ hrefs: list });
const bound = (pathText: string, text: string, from: unknown = snapshot) => checkCitations(cite({ numbers: [{ path: pathText, text }] }), from, root, deps);
const reasonOf = (result: ReturnType<typeof checkCitations>) => (result.ok ? "accepted" : result.reason);
const check = (citations: Citations, base: string = root) => checkCitations(citations, snapshot, base, deps);

function rejects(vector: string, reason: string, control: string) {
  assert.equal(reasonOf(check(hrefs(vector))), reason, `vector ${JSON.stringify(vector)}`);
  assert.deepEqual(check(hrefs(control)), { ok: true }, `positive control ${control}`);
}

test("[evidence-path-not-in-snapshot] real file in snapshot is accepted", () => {
  assert.deepEqual(check(hrefs("docs/a.md")), { ok: true });
  assert.deepEqual(check(cite()), { ok: true });
});

test("[evidence-path-not-in-snapshot] aliased root is accepted", () => {
  const aliased = tempFixture(deps, { "docs/a.md": "a" }, { resolve: false });
  const link = path.join(path.dirname(aliased), `${path.basename(aliased)}-alias`);
  fs.symlinkSync(aliased, link);
  try {
    const only = { evidence: fact("x", ["docs/a.md"]) };
    assert.deepEqual(checkCitations(hrefs("docs/a.md"), only, aliased, deps), { ok: true });
    assert.deepEqual(checkCitations(hrefs("docs/a.md"), only, link, deps), { ok: true }, "symlinked alias of the root");
  } finally {
    fs.rmSync(link, { force: true });
    fs.rmSync(aliased, { recursive: true, force: true });
  }
});

test("[evidence-path-not-in-snapshot] unreadable root rejects", () => {
  assert.equal(reasonOf(check(hrefs("docs/a.md"), path.join(root, "missing-root"))), "unsafe-path");
  assert.equal(reasonOf(check(cite(), path.join(root, "missing-root"))), "accepted", "no hrefs need no root");
});

test("[evidence-path-not-in-snapshot] missing from snapshot", () => {
  assert.equal(fs.existsSync(path.join(root, "docs/b.md")), true, "file exists on disk");
  rejects("docs/b.md", "evidence-not-in-snapshot", "docs/a.md");
});

test("[evidence-path-not-in-snapshot] symlink", () => {
  assert.equal(fs.lstatSync(path.join(root, "link.md")).isSymbolicLink(), true);
  rejects("link.md", "unsafe-path", "docs/a.md");
});

test("[evidence-path-not-in-snapshot] secret path", () => {
  rejects(".env", "secret-path", "docs/a.md");
});

test("[evidence-path-not-in-snapshot] transcript path", () => {
  rejects(".claude/projects/p/s.jsonl", "transcript-path", "notes/session.mts");
});

const TRANSCRIPTS: [string, string][] = [["sessions directory", "sessions/x.md"], ["dot sessions directory", ".sessions/x.md"], ["transcript basename", "notes/transcript.md"], ["session-log basename", "notes/my_session-log.txt"], ["conversation basename", "notes/conversation-2026.md"]];
for (const [name, href] of TRANSCRIPTS) {
  test(`[evidence-path-not-in-snapshot] transcript path: ${name}`, () => rejects(href, "transcript-path", "notes/transcripts-index.mts"));
}

test("[evidence-path-not-in-snapshot] citation count", () => {
  const same = (count: number) => Array.from({ length: count }, () => "docs/a.md");
  assert.equal(MAX_CITATIONS, 50);
  assert.deepEqual(check(hrefs(...same(MAX_CITATIONS))), { ok: true }, "at the cap");
  assert.deepEqual(check(hrefs(...same(MAX_CITATIONS + 1))), { ok: false, reason: "citation-limit", count: MAX_CITATIONS + 1, token: null });
  const bindings = (count: number) => Array.from({ length: count }, () => ({ path: "pitches.count", text: "3" }));
  assert.deepEqual(check(cite({ numbers: bindings(MAX_CITATIONS) })), { ok: true }, "bindings at the cap");
  assert.equal(reasonOf(check(cite({ hrefs: same(1), numbers: bindings(MAX_CITATIONS) }))), "citation-limit", "hrefs and bindings share the cap");
});

test("[evidence-path-not-in-snapshot] oversized input is bounded", () => {
  const huge = Array.from({ length: 1_000_000 }, () => 7);
  assert.deepEqual(checkCitations({ hrefs: huge as unknown as string[], numbers: [], unbound: 0 }, snapshot, root, deps), { ok: false, reason: "citation-limit", count: 999999, token: null }, "array length before element scan, count clamped");
  assert.equal(reasonOf(check(hrefs("a/".repeat(MAX_PATH_TEXT)))), "unsafe-path", "href longer than the path cap");
  assert.equal(reasonOf(check(hrefs("../".repeat(1_000_000)))), "unsafe-path", "no split of an oversized href");
  assert.equal(reasonOf(check(hrefs("docs/a.md"))), "accepted");
});

test("[evidence-path-not-in-snapshot] malformed input rejects before filesystem access", () => {
  let touched = 0;
  const spy = { ...deps, fs: { ...deps.fs, realpathSync: (...args: Parameters<typeof deps.fs.realpathSync>) => { touched += 1; return deps.fs.realpathSync(...args); } } };
  const bad: unknown[] = [null, undefined, "x", 7, {}, { hrefs: "docs/a.md", numbers: [], unbound: 0 }, { hrefs: [1], numbers: [], unbound: 0 }, { hrefs: [], numbers: [null], unbound: 0 },
    { hrefs: [], numbers: [{ path: "a" }], unbound: 0 }, { hrefs: [], numbers: [{ path: 1, text: "1" }], unbound: 0 }, { hrefs: [], numbers: [], unbound: -1 }, { hrefs: [], numbers: [], unbound: 1.5 }, { hrefs: [], numbers: [], unbound: "1" }, { hrefs: [], numbers: [] }];
  for (const input of bad) assert.deepEqual(checkCitations(input as Citations, snapshot, root, spy), { ok: false, reason: "input-type", count: 1, token: null }, JSON.stringify(input));
  assert.equal(reasonOf(checkCitations(hrefs("docs/a.md"), snapshot, "" as string, spy)), "input-type");
  assert.equal(reasonOf(checkCitations(hrefs("docs/a.md"), snapshot, 5 as unknown as string, spy)), "input-type");
  assert.equal(touched, 0, "no filesystem call for malformed input");
  assert.deepEqual(checkCitations(hrefs("docs/a.md"), snapshot, root, spy), { ok: true });
  assert.equal(touched, 2, "one canonicalization of the root plus one realpath inside the shared check");
  touched = 0;
  assert.deepEqual(checkCitations(hrefs("docs/a.md", "notes/session.mts"), snapshot, root, spy), { ok: true });
  assert.equal(touched, 3, "root canonicalized once for two hrefs, plus one shared-check realpath each");
  assert.equal(reasonOf(checkCitations(hrefs("docs/a.md"), "not an object", root, deps)), "evidence-not-in-snapshot");
});

test("[reject-external-anchor] parent traversal", () => rejects("../secrets", "traversal", "docs/a.md"));
test("[reject-external-anchor] parent traversal inside path", () => rejects("docs/../x", "traversal", "docs/a.md"));
test("[reject-external-anchor] absolute path", () => rejects("/etc/passwd", "absolute", "docs/a.md"));
test("[reject-external-anchor] protocol-relative", () => rejects("//host/x", "absolute", "docs/a.md"));
test("[reject-external-anchor] external scheme", () => rejects("https://example.com", "scheme", "docs/a.md"));
test("[reject-external-anchor] file scheme", () => rejects("file:///etc/passwd", "scheme", "docs/a.md"));
test("[reject-external-anchor] percent traversal", () => rejects("%2e%2e/x", "percent", "docs/a.md"));
test("[reject-external-anchor] backslash", () => rejects("docs\\a.md", "backslash", "docs/a.md"));

test("[number-mismatch] bound equal number is accepted", () => {
  assert.deepEqual(bound("pitches.items.length", "3"), { ok: true }, "array length through a fact wrapper");
  assert.deepEqual(bound("pitches.count", "3"), { ok: true });
  assert.deepEqual(bound("pitches.count", "3.0"), { ok: true }, "numeric equality");
  assert.deepEqual(bound("pitches.ratio", "-2.5"), { ok: true });
  assert.deepEqual(bound("pitches.zero", "0"), { ok: true });
  assert.deepEqual(bound("pitches.items.0", "3"), { ok: false, reason: "not-a-number", count: 1, token: null }, "an item is not a number");
});

test("[number-mismatch] unequal binding", () => {
  const stated = '<data value="pitches.items.length">12</data>';
  assert.match(stated, /12/);
  assert.deepEqual(bound("pitches.items.length", "12"), { ok: false, reason: "number-mismatch", count: 1, token: null });
  assert.equal(reasonOf(bound("pitches.items.length", "3")), "accepted");
});

test("[number-mismatch] unknown fact", () => {
  for (const missing of ["pitches.nothing", "nothing", "pitches.items.3", "pitches.items.01", "pitches.items.toString", "pitches.count.status", "pitches.count.evidence", "pitches..count", "", "x".repeat(201)]) {
    assert.equal(reasonOf(bound(missing, "3")), "unknown-fact", JSON.stringify(missing));
  }
  assert.equal(reasonOf(bound("pitches.count", "3")), "accepted");
});

test("[number-mismatch] prototype path", () => {
  for (const segment of ["__proto__", "constructor", "prototype"]) {
    assert.equal(reasonOf(bound(`pitches.${segment}`, "5", hostile)), "unknown-fact", `own ${segment} property`);
    assert.equal(reasonOf(bound(`pitches.count.${segment}`, "3")), "unknown-fact", `inherited ${segment}`);
  }
  assert.equal(reasonOf(bound("pitches.items.constructor.length", "1")), "unknown-fact");
  assert.equal(reasonOf(bound("pitches.__proto__.value", "5", hostile)), "unknown-fact");
  const clean = JSON.parse('{"pitches":{"count":{"value":5,"status":"observed","evidence":[]}}}');
  assert.equal(reasonOf(bound("pitches.count", "5", clean)), "accepted", "same shape without the hostile key");
});

test("[number-mismatch] non numeric leaf", () => {
  assert.deepEqual(bound("pitches.label", "3"), { ok: false, reason: "not-a-number", count: 1, token: null });
  assert.equal(reasonOf(bound("pitches", "3")), "not-a-number", "an object is not a number");
  assert.equal(reasonOf(bound("pitches.items", "3")), "not-a-number", "an array is not a number; only its length is");
  assert.equal(reasonOf(bound("pitches.count", "three")), "not-a-number");
  const numeric = { pitches: { label: fact("3") } };
  assert.equal(reasonOf(bound("pitches.label", "3", numeric)), "not-a-number", "no coercion of a numeric string leaf");
  assert.equal(reasonOf(bound("pitches.count", "3")), "accepted");
});

test("[number-mismatch] strict decimal text", () => {
  for (const text of ["", " 3", "3 ", "0x3", "3e0", "+3", "03", "Infinity", "NaN", ".5", "3.", "1".repeat(65)]) {
    assert.equal(reasonOf(bound("pitches.count", text)), "not-a-number", JSON.stringify(text));
  }
  assert.equal(reasonOf(bound("pitches.nan", "NaN", { pitches: { nan: fact(Number.NaN) } })), "not-a-number", "text is checked before the leaf comparison");
  assert.equal(reasonOf(bound("pitches.inf", "3", { pitches: { inf: fact(Number.POSITIVE_INFINITY) } })), "number-mismatch", "infinite leaf never equals a decimal");
});

test("[number-mismatch] array members are length or canonical index only", () => {
  const list = Object.assign([fact(1)], { extra: fact(1) });
  const from = { list: fact(list) };
  assert.equal(reasonOf(bound("list.extra", "1", from)), "unknown-fact", "own non-index property");
  assert.equal(reasonOf(bound("list.length", "1", from)), "accepted");
  assert.equal(reasonOf(bound("list.0", "1", { list: [fact(1)] })), "accepted", "canonical index");
  assert.equal(reasonOf(bound("list.00", "1", { list: Object.assign([fact(1)], { "00": fact(1) }) })), "unknown-fact", "non-canonical index");
  assert.equal(reasonOf(bound("list.1000000", "1", { list: Object.assign([], { 1000000: fact(1) }) })), "unknown-fact", "index beyond the bound");
});

test("[number-mismatch] own data property only", () => {
  let reads = 0;
  const trap = { pitches: { count: fact(3) } };
  Object.defineProperty(trap.pitches, "live", { enumerable: true, get() { reads += 1; return fact(3); } });
  assert.equal(reasonOf(bound("pitches.live", "3", trap)), "unknown-fact");
  const wrapped = { pitches: { live: { status: "observed", evidence: [], get value() { reads += 1; return 3; } } } };
  assert.equal(reasonOf(bound("pitches.live", "3", wrapped)), "unknown-fact", "accessor fact value");
  assert.equal(reads, 0, "accessor never invoked");
  assert.equal(reasonOf(bound("pitches.count", "3", trap)), "accepted");
  const inherited = Object.create({ count: fact(3) });
  assert.equal(reasonOf(bound("count", "3", inherited)), "unknown-fact", "inherited property");
  assert.equal(reasonOf(bound("count", "3", { count: fact(3) })), "accepted");
});

test("[number-mismatch] bare numeral", () => {
  assert.deepEqual(checkCitations(cite({ unbound: 2 }), snapshot, root, deps), { ok: false, reason: "unbound-number", count: 2, token: null });
  assert.deepEqual(checkCitations(cite({ unbound: 0 }), snapshot, root, deps), { ok: true });
  assert.equal(reasonOf(checkCitations(cite({ unbound: 2000000 }), snapshot, root, deps)), "unbound-number");
  assert.equal((checkCitations(cite({ unbound: 2000000 }), snapshot, root, deps) as { count: number }).count, 999999, "count is clamped");
});

test("[number-mismatch] first reason wins", () => {
  const mixed = cite({ hrefs: ["docs/b.md"], numbers: [{ path: "nothing", text: "3" }], unbound: 1 });
  assert.equal(reasonOf(check(mixed)), "evidence-not-in-snapshot");
  assert.equal(reasonOf(check({ ...mixed, hrefs: [] })), "unknown-fact");
  assert.equal(reasonOf(check({ ...mixed, hrefs: [], numbers: [] })), "unbound-number");
});

test("[number-mismatch] rejections carry no cited value", () => {
  const canary = "CANARY-\u001b]0;pwned\u0007";
  const results = [check(hrefs(`${canary}/x`)), bound(canary, "1"), bound("pitches.count", canary)];
  for (const result of results) assert.doesNotMatch(JSON.stringify(result), /CANARY|pwned/);
});

// Array.every skips holes; validate the values for-of will later consume.
test("[evidence-path-not-in-snapshot] sparse citation arrays reject", () => {
  for (const citations of [cite({ hrefs: Array(1) }), cite({ numbers: Array(1) })]) {
    let result: unknown = null;
    assert.doesNotThrow(() => { result = check(citations); }, "sparse arrays must return input-type without throwing");
    assert.deepEqual(result, { ok: false, reason: "input-type", count: 1, token: null });
  }
  assert.deepEqual(check(hrefs("docs/a.md")), { ok: true });
  assert.deepEqual(bound("pitches.count", "3"), { ok: true });
});

test("[evidence-path-not-in-snapshot] citation accessors reject without execution or filesystem access", () => {
  let calls = 0;
  const getter = () => { calls++; return []; };
  const envelope = Object.defineProperty(cite(), "numbers", { get: getter });
  const indexed = Object.defineProperty(["docs/a.md"], "0", { get: getter });
  const binding = Object.defineProperty({ path: "pitches.count" }, "text", { get: getter });
  const hostile = new Proxy({}, { getOwnPropertyDescriptor() { throw new Error("trap"); } });
  const noFs = { ...deps, fs: { ...deps.fs, realpathSync() { calls++; throw new Error("filesystem"); } } };
  const inputs: unknown[] = [envelope, cite({ hrefs: indexed }), { hrefs: [], numbers: [binding], unbound: 0 }, hostile];
  for (const input of inputs) {
    assert.deepEqual(checkCitations(input as Citations, snapshot, root, noFs), { ok: false, reason: "input-type", count: 1, token: null });
  }
  assert.equal(calls, 0);
});

test("[evidence-path-not-in-snapshot] citation arrays ignore custom iterators and retain the actual cap", () => {
  let calls = 0;
  const numbers = [{ path: "pitches.count", text: "3" }];
  Object.defineProperty(numbers, Symbol.iterator, { value: function* () { calls++; yield null; } });
  assert.deepEqual(check(cite({ numbers })), { ok: true });
  const oversized = Array.from({ length: 51 }, () => ({ path: "pitches.count", text: "3" }));
  Object.defineProperty(oversized, Symbol.iterator, { value: function* () { calls++; } });
  assert.deepEqual(check(cite({ numbers: oversized })), { ok: false, reason: "citation-limit", count: 51, token: null });
  assert.equal(calls, 0);
});

test("[evidence-path-not-in-snapshot] href length 200 is accepted and 201 is refused", () => {
  const exact = "a".repeat(197) + ".md", over = "a".repeat(198) + ".md";
  fs.writeFileSync(path.join(root, exact), "safe");
  fs.writeFileSync(path.join(root, over), "safe");
  const cited = { evidence: fact("files", [exact, over]) };
  assert.deepEqual(checkCitations(hrefs(exact), cited, root, deps), { ok: true });
  assert.equal(reasonOf(checkCitations(hrefs(over), cited, root, deps)), "unsafe-path");
});


test("[number-mismatch] binding path and text at exact caps", () => {
  const key = "a".repeat(200), beyond = "a".repeat(201);
  const source = { [key]: fact(3), [beyond]: fact(3), tiny: fact(1e-62), smaller: fact(1e-63) };
  assert.deepEqual(bound(key, "3", source), { ok: true });
  assert.equal(reasonOf(bound(beyond, "3", source)), "unknown-fact");
  const exact = "0." + "0".repeat(61) + "1";
  assert.equal(exact.length, 64);
  assert.deepEqual(bound("tiny", exact, source), { ok: true });
  assert.equal(reasonOf(bound("smaller", "0." + "0".repeat(62) + "1", source)), "not-a-number");
});
