// S7 of state-fragment-sanitizer: every sanitizer-owned case in the golden dataset maps to a real passing test.
// The dataset is read through readData (no extension, so a later TOON conversion does not break it). The three
// fragment suites run as a child Node TAP process and are parsed here, so a skipped, todo, failing or missing test
// can never count as enforcement. This file never spawns itself.
import assert from "node:assert/strict";
import { test } from "node:test";

import { NODE_FLAGS } from "./runtime/entry.mts";
import { readData } from "./runtime/data-file.mts";
import { createTestDeps, spawnSync, urlPath } from "./runtime/test-helpers.mts";

// STATE_FRAGMENT_DATASET_ROOT lets a scratch copy of this file (mutant proofs) find the repository.
const root = process.env.STATE_FRAGMENT_DATASET_ROOT ?? urlPath(new URL("../..", import.meta.url));
const DATASET = ".project/evals/datasets/state-ai-fragments";
const CHILD_SUITES = ["state-fragment.test.mts", "state-fragment-parse.test.mts", "state-fragment-evidence.test.mts", "state-fragment-inject.test.mts"];
const AUTHORING = ".project/evals/datasets/state-ai-authoring";
const LIVE_RECORD = ".project/pitches/state-ai-authoring/live-runs.md";
const CHILD_TIMEOUT_MS = 120_000;
const CHILD_MAX_BUFFER = 16 * 1024 * 1024;

// Deterministic sanitizer cases, enforced here by a named passing test (the id in brackets starts the test name).
const OWNED = [
  "reject-script-element", "reject-event-handler", "reject-smil-href", "reject-external-use", "reject-style-attribute",
  "reject-entity-encoded-javascript", "reject-structural-constructs", "reject-external-anchor", "evidence-path-not-in-snapshot",
  "number-mismatch", "reject-oversize-and-deep", "accept-valid-fragment", "rejection-message-does-not-echo",
];
// Owned by the state-ai-authoring pitch. The four injector cases are enforced by named tests in the inject suite; the five
// live-only cases are proved only by the live matrix in live-runs.md. The sanitizer half of
// ai-label-always-present-and-unspoofable is tested as [ai-label-always-present-and-unspoofable:sanitizer] and never counts for it.
const INJECTOR_OWNED = ["failure-isolation", "stale-fragment-default-and-strict", "reuse-only-when-hash-unchanged", "ai-label-always-present-and-unspoofable"];
const LIVE_OWNED_BY_STATE_AI_AUTHORING = ["database-deployment-claim", "uncited-claim", "tokens-slot-invented-totals", "prompt-injection-in-evidence", "sparse-snapshot"];
const OWNED_BY_STATE_AI_AUTHORING = [...LIVE_OWNED_BY_STATE_AI_AUTHORING, ...INJECTOR_OWNED];

// ---- partition ----------------------------------------------------------------------------------------------

/** Problems with the claim that owned and deferred ids split the dataset exactly. Empty means a clean partition. */
function partitionProblems(datasetIds: string[], owned: string[], deferred: string[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const id of datasetIds) {
    if (seen.has(id)) problems.push(`duplicate dataset id ${id}`);
    seen.add(id);
  }
  for (const [label, ids] of [["owned", owned], ["deferred", deferred]] as const) {
    if (new Set(ids).size !== ids.length) problems.push(`duplicate ${label} id`);
  }
  for (const id of owned) if (deferred.includes(id)) problems.push(`overlap ${id}`);
  for (const id of [...owned, ...deferred]) if (!seen.has(id)) problems.push(`mapped id not in dataset ${id}`);
  for (const id of seen) if (!owned.includes(id) && !deferred.includes(id)) problems.push(`unmapped dataset case ${id}`);
  return problems;
}

// ---- TAP ----------------------------------------------------------------------------------------------------

interface TapResult { ok: boolean; name: string; directive: string | null }
interface TapSummary { tests: number; suites: number; pass: number; fail: number; cancelled: number; skipped: number; todo: number }
interface Tap { results: TapResult[]; summary: TapSummary | null; summaryProblem: string | null }

/**
 * Splits `name # directive` at the first `#` that is not escaped. Node escapes `\` as `\\`, `#` as `\#` and a newline
 * as `\n`, so an odd run of backslashes before a `#` means the `#` belongs to the name.
 */
function splitDirective(text: string): { name: string; directive: string | null } {
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "#") continue;
    let slashes = 0;
    while (slashes < i && text[i - 1 - slashes] === "\\") slashes++;
    if (slashes % 2 === 0) return { name: text.slice(0, i).trimEnd(), directive: text.slice(i + 1).trim() };
  }
  return { name: text, directive: null };
}

const SUMMARY_KEYS = ["suites", "pass", "fail", "cancelled", "skipped", "todo"] as const;

/**
 * Reads Node's TAP reporter output. Only column-0 result lines count: nested assertions are indented and test
 * stdout is prefixed with `# `. The summary must be the final block (a `# tests` line then the fixed key order), so a
 * `# fail 0` printed by a test cannot stand in for it. Node says `# skipped`, not the plan shorthand `# skip`.
 */
function parseTap(text: string): Tap {
  const lines = text.split("\n").map((line) => line.replace(/\r$/, ""));
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  const results: TapResult[] = [];
  for (const line of lines) {
    const match = /^(not ok|ok) \d+(?: - (.*))?$/.exec(line);
    if (match) results.push({ ok: match[1] === "ok", ...splitDirective(match[2] ?? "") });
  }
  let start = -1;
  lines.forEach((line, index) => { if (/^# tests \d+$/.test(line)) start = index; });
  if (start < 0) return { results, summary: null, summaryProblem: "no # tests summary" };
  const block = lines.slice(start);
  const expected = ["tests", ...SUMMARY_KEYS, "duration_ms"];
  if (block.length !== expected.length) return { results, summary: null, summaryProblem: "summary block is not the final block" };
  const values: Record<string, number> = {};
  for (let i = 0; i < expected.length; i++) {
    const match = /^# (\w+) (\d+(?:\.\d+)?)$/.exec(block[i]);
    if (!match || match[1] !== expected[i]) return { results, summary: null, summaryProblem: `summary line ${i} is not # ${expected[i]} <number>` };
    values[expected[i]] = Number(match[2]);
  }
  if (lines[start - 1] !== `1..${results.length}`) return { results, summary: null, summaryProblem: "plan line does not match the top-level result count" };
  return { results, summary: values as unknown as TapSummary, summaryProblem: null };
}

/** Why a child run does not count as clean. Empty means exit 0 and a complete zero-failure, zero-skipped, zero-todo summary. */
function runProblems(tap: Tap, status: number | null): string[] {
  const problems: string[] = [];
  if (status !== 0) problems.push(`exit ${status}`);
  if (tap.results.some((result) => !result.ok)) problems.push("a top-level test is not ok");
  if (!tap.summary) return [...problems, tap.summaryProblem ?? "no summary"];
  const { tests, pass, fail, cancelled, skipped, todo } = tap.summary;
  if (tests === 0 || pass !== tests) problems.push(`pass ${pass} of ${tests}`);
  for (const [label, count] of [["fail", fail], ["cancelled", cancelled], ["skipped", skipped], ["todo", todo]] as const) {
    if (count !== 0) problems.push(`${label} ${count}`);
  }
  return problems;
}

const isDirective = (directive: string | null, word: "SKIP" | "TODO"): boolean => directive !== null && new RegExp(`^${word}(?![a-z0-9])`, "i").test(directive);

/** A result that proves a test ran and passed. Each directive guard is independent so each can be mutated alone. */
function countsAsPassing(result: TapResult): boolean {
  if (!result.ok) return false;
  if (isDirective(result.directive, "SKIP")) return false;
  if (isDirective(result.directive, "TODO")) return false;
  if (result.directive !== null && !/^(skip|todo)(?![a-z0-9])/i.test(result.directive)) return false;
  return true;
}

/** Ids with at least one passing result whose name starts with exactly `[id]`: `[id:suffix]` and longer ids do not match. */
function enforcedIds(results: TapResult[], ids: string[]): string[] {
  return ids.filter((id) => results.some((result) => result.name.startsWith(`[${id}]`) && countsAsPassing(result)));
}

// ---- child run ----------------------------------------------------------------------------------------------

function childEnv(): Record<string, string | undefined> {
  // NODE_TEST_CONTEXT would turn the child `node --test` into a nested reporter; mutant hooks must not leak in.
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== "NODE_TEST_CONTEXT" && !key.endsWith("_UNDER_TEST")));
}

let childRun: { status: number | null; tap: Tap; stdout: string; stderr: string } | undefined;
/** Runs the three fragment suites once per process. Node is required: a missing Node fails, it never skips. */
function runChildSuites() {
  if (childRun) return childRun;
  const node = process.versions.bun ? "node" : process.execPath;
  const files = CHILD_SUITES.map((name) => `${root}/ai-framework/scripts/${name}`);
  const result = spawnSync(node, [...NODE_FLAGS, "--test", "--test-reporter=tap", ...files], {
    cwd: root, encoding: "utf8", timeout: CHILD_TIMEOUT_MS, maxBuffer: CHILD_MAX_BUFFER, shell: false, windowsHide: true, env: childEnv(),
  });
  assert.equal(result.error, undefined, `could not run node for the child suites: ${result.error?.message}`);
  assert.equal(result.signal, null, `child suites ended by signal ${result.signal}`);
  childRun = { status: result.status, tap: parseTap(result.stdout), stdout: result.stdout, stderr: result.stderr };
  return childRun;
}

function datasetIds(): string[] {
  const read = readData(root, DATASET, createTestDeps());
  assert.equal(read.status, "parsed", `dataset read: ${JSON.stringify(read.status === "refused" ? read.code : read.status)}`);
  assert.ok(read.status === "parsed" && Array.isArray(read.value.cases), "dataset has a cases array");
  return (read.value.cases as { id: string }[]).map((entry) => entry.id);
}

// ---- dataset contract ---------------------------------------------------------------------------------------

test("[dataset-mapping] dataset has 22 unique case ids", () => {
  const ids = datasetIds();
  assert.equal(ids.length, 22);
  assert.equal(new Set(ids).size, 22);
});

test("[dataset-mapping] 13 owned and 9 deferred ids split the dataset exactly", () => {
  assert.equal(OWNED.length, 13);
  assert.equal(OWNED_BY_STATE_AI_AUTHORING.length, 9);
  assert.equal(INJECTOR_OWNED.length, 4);
  assert.equal(LIVE_OWNED_BY_STATE_AI_AUTHORING.length, 5);
  assert.deepEqual(partitionProblems(datasetIds(), OWNED, OWNED_BY_STATE_AI_AUTHORING), []);
});

test("[dataset-mapping] live-only cases are not-run in the dataset and claim no passed behavior", () => {
  const read = readData(root, DATASET, createTestDeps());
  assert.ok(read.status === "parsed");
  assert.equal(read.value.executionStatus, "not-run");
  const cases = read.value.cases as { id: string; executionStatus: string }[];
  for (const id of LIVE_OWNED_BY_STATE_AI_AUTHORING) assert.equal(cases.find((entry) => entry.id === id)?.executionStatus, "not-run", id);
});

test("[dataset-mapping] negative control: an unmapped dataset case is reported", () => {
  assert.deepEqual(partitionProblems([...OWNED, ...OWNED_BY_STATE_AI_AUTHORING, "new-case"], OWNED, OWNED_BY_STATE_AI_AUTHORING), ["unmapped dataset case new-case"]);
  assert.deepEqual(partitionProblems([...OWNED, ...OWNED_BY_STATE_AI_AUTHORING], OWNED, OWNED_BY_STATE_AI_AUTHORING), []);
});

test("[dataset-mapping] negative control: a mapped id missing from the dataset is reported", () => {
  assert.deepEqual(partitionProblems(["a", "b"], ["a", "ghost"], ["b"]), ["mapped id not in dataset ghost"]);
});

test("[dataset-mapping] negative control: a duplicate dataset id is reported", () => {
  assert.deepEqual(partitionProblems(["a", "b", "a"], ["a"], ["b"]), ["duplicate dataset id a"]);
});

test("[dataset-mapping] negative control: an id in both sets is reported", () => {
  assert.deepEqual(partitionProblems(["a", "b"], ["a", "b"], ["b"]), ["overlap b"]);
});

// ---- real child suites --------------------------------------------------------------------------------------

test("[dataset-mapping] child suites exit 0 with zero fail, cancelled, skipped and todo", () => {
  const run = runChildSuites();
  assert.deepEqual(runProblems(run.tap, run.status), [], run.stderr.slice(0, 500));
  assert.ok(run.tap.results.length > 0);
});

for (const id of OWNED) {
  test(`[dataset-mapping] owned case ${id} has a passing child test`, () => {
    const run = runChildSuites();
    assert.deepEqual(runProblems(run.tap, run.status), []);
    assert.deepEqual(enforcedIds(run.tap.results, [id]), [id]);
  });
}

test("[dataset-mapping] injector cases have a passing inject test; live-only cases are not claimed by name; a :suffix test never counts", () => {
  const run = runChildSuites();
  assert.deepEqual(runProblems(run.tap, run.status), []);
  assert.deepEqual(enforcedIds(run.tap.results, INJECTOR_OWNED), INJECTOR_OWNED);
  assert.deepEqual(enforcedIds(run.tap.results, LIVE_OWNED_BY_STATE_AI_AUTHORING), []);
  const half = "[ai-label-always-present-and-unspoofable:sanitizer]";
  assert.ok(run.tap.results.some((result) => countsAsPassing(result) && result.name.startsWith(half)), "the sanitizer half is tested but the case stays deferred");
});

// ---- negative controls: synthetic TAP -----------------------------------------------------------------------

const PAIRED = "ok 2 - [paired] passes";
const tapOf = (...lines: string[]): TapResult[] => parseTap(`TAP version 13\n${lines.join("\n")}\n`).results;
const enforcement = (...lines: string[]) => ({ enforced: enforcedIds(tapOf(...lines), ["target", "paired"]) });

test("[dataset-mapping] negative control: a plain ok is enforced (paired control)", () => {
  assert.deepEqual(enforcement("ok 1 - [target] works", PAIRED), { enforced: ["target", "paired"] });
});

test("[dataset-mapping] negative control: an id whose only test is SKIP is unenforced", () => {
  assert.deepEqual(enforcement("ok 1 - [target] works # SKIP not now", PAIRED), { enforced: ["paired"] });
  assert.deepEqual(enforcement("ok 1 - [target] works # SKIP", PAIRED), { enforced: ["paired"] });
});

test("[dataset-mapping] negative control: an id whose only test is TODO is unenforced", () => {
  assert.deepEqual(enforcement("ok 1 - [target] works # TODO later", PAIRED), { enforced: ["paired"] });
  assert.deepEqual(enforcement("ok 1 - [target] works # TODO", PAIRED), { enforced: ["paired"] });
});

test("[dataset-mapping] negative control: an id whose only test is not ok is unenforced", () => {
  assert.deepEqual(enforcement("not ok 1 - [target] works", PAIRED), { enforced: ["paired"] });
});

test("[dataset-mapping] negative control: an id with no test is unenforced", () => {
  assert.deepEqual(enforcement(PAIRED), { enforced: ["paired"] });
});

test("[dataset-mapping] negative control: one passing test among skipped ones enforces the id", () => {
  assert.deepEqual(enforcement("ok 1 - [target] a # SKIP", "ok 2 - [target] b", PAIRED), { enforced: ["target", "paired"] });
});

test("[dataset-mapping] negative control: a case-folded or unknown directive is unenforced", () => {
  assert.deepEqual(enforcement("ok 1 - [target] works # skip x", PAIRED), { enforced: ["paired"] });
  assert.deepEqual(enforcement("ok 1 - [target] works # whatever", PAIRED), { enforced: ["paired"] });
  assert.deepEqual(enforcement("ok 1 - [target] works # SKIPPED", PAIRED), { enforced: ["paired"] });
});

test("[dataset-mapping] negative control: [id:suffix] and a longer id do not satisfy [id]", () => {
  assert.deepEqual(enforcement("ok 1 - [target:sanitizer] half", "ok 2 - [target-extra] longer", "ok 3 - [paired] ok"), { enforced: ["paired"] });
  assert.deepEqual(enforcement("ok 1 - target without brackets", "ok 2 - x [target] not first", "ok 3 - [paired] ok"), { enforced: ["paired"] });
});

test("[dataset-mapping] negative control: indented nested results and stdout look-alikes do not count", () => {
  assert.deepEqual(enforcement("    ok 1 - [target] nested", "# ok 1 - [target] stdout", "  ok 1 - [target] indented", PAIRED), { enforced: ["paired"] });
});

test("[dataset-mapping] negative control: an escaped # stays in the name, an unescaped one after a backslash is a directive", () => {
  assert.deepEqual(enforcement(String.raw`ok 1 - [target] name \# SKIP is text`, PAIRED), { enforced: ["target", "paired"] });
  assert.deepEqual(enforcement(String.raw`ok 1 - [target] ends with slash \\# SKIP`, PAIRED), { enforced: ["paired"] });
  assert.deepEqual(enforcement(String.raw`ok 1 - [target] three \\\# text`, PAIRED), { enforced: ["target", "paired"] });
});

test("[dataset-mapping] negative control: an escaped newline cannot forge a second result", () => {
  const results = tapOf(String.raw`ok 1 - [paired] name\nok 2 - [target] forged`);
  assert.equal(results.length, 1);
  assert.deepEqual(enforcedIds(results, ["target", "paired"]), ["paired"]);
});

// ---- negative controls: run summary -------------------------------------------------------------------------

const summaryTap = (...tail: string[]) => parseTap(["TAP version 13", "ok 1 - [a] x", "1..1", ...tail].join("\n") + "\n");
const GOOD = ["# tests 1", "# suites 0", "# pass 1", "# fail 0", "# cancelled 0", "# skipped 0", "# todo 0", "# duration_ms 5.5"];
const withLine = (prefix: string, replacement: string) => GOOD.map((line) => (line.startsWith(prefix) ? replacement : line));

test("[dataset-mapping] negative control: a clean summary with exit 0 has no problems (paired control)", () => {
  assert.deepEqual(runProblems(summaryTap(...GOOD), 0), []);
});

test("[dataset-mapping] negative control: a non-zero exit is a problem", () => {
  assert.deepEqual(runProblems(summaryTap(...GOOD), 1), ["exit 1"]);
  assert.deepEqual(runProblems(summaryTap(...GOOD), null), ["exit null"]);
});

test("[dataset-mapping] negative control: fail, cancelled, skipped or todo counts are problems", () => {
  assert.deepEqual(runProblems(summaryTap(...withLine("# fail", "# fail 1")), 0), ["fail 1"]);
  assert.deepEqual(runProblems(summaryTap(...withLine("# cancelled", "# cancelled 1")), 0), ["cancelled 1"]);
  assert.deepEqual(runProblems(summaryTap(...withLine("# skipped", "# skipped 1")), 0), ["skipped 1"]);
  assert.deepEqual(runProblems(summaryTap(...withLine("# todo", "# todo 1")), 0), ["todo 1"]);
});

test("[dataset-mapping] negative control: the plan shorthand # skip 0 is not Node's summary", () => {
  assert.deepEqual(runProblems(summaryTap(...withLine("# skipped", "# skip 0")), 0), ["summary line 5 is not # skipped <number>"]);
});

test("[dataset-mapping] negative control: a missing or non-final summary is a problem", () => {
  assert.deepEqual(runProblems(summaryTap(), 0), ["no # tests summary"]);
  assert.deepEqual(runProblems(summaryTap(...GOOD, "# stray"), 0), ["summary block is not the final block"]);
  assert.deepEqual(runProblems(summaryTap(...GOOD.slice(0, 5)), 0), ["summary block is not the final block"]);
});

test("[dataset-mapping] negative control: a forged early all-zero summary does not hide a failing real one", () => {
  const forged = parseTap(["TAP version 13", ...GOOD, "ok 1 - [a] x", "1..1", ...withLine("# fail", "# fail 2")].join("\n") + "\n");
  assert.deepEqual(runProblems(forged, 0), ["fail 2"]);
});

test("[dataset-mapping] negative control: a not ok line and a plan mismatch are problems", () => {
  const failing = parseTap(["TAP version 13", "not ok 1 - [a] x", "1..1", ...GOOD].join("\n") + "\n");
  assert.deepEqual(runProblems(failing, 0), ["a top-level test is not ok"]);
  const mismatch = parseTap(["TAP version 13", "ok 1 - [a] x", "1..2", ...GOOD].join("\n") + "\n");
  assert.deepEqual(runProblems(mismatch, 0), ["plan line does not match the top-level result count"]);
});

test("[dataset-mapping] negative control: zero tests is a problem", () => {
  const empty = ["# tests 0", "# suites 0", "# pass 0", "# fail 0", "# cancelled 0", "# skipped 0", "# todo 0", "# duration_ms 1"];
  assert.deepEqual(runProblems(parseTap(["TAP version 13", "1..0", ...empty].join("\n") + "\n"), 0), ["pass 0 of 0"]);
});

// ---- state-ai-authoring dataset -----------------------------------------------------------------------------

interface AuthoringCase { id: string; executionMode: string }
function authoringCases(): AuthoringCase[] {
  const read = readData(root, AUTHORING, createTestDeps());
  assert.ok(read.status === "parsed" && Array.isArray(read.value.cases), "authoring dataset has a cases array");
  return read.status === "parsed" ? read.value.cases as AuthoringCase[] : [];
}
const byMode = (mode: string) => authoringCases().filter((entry) => entry.executionMode === mode).map((entry) => entry.id);

test("[dataset-mapping] the authoring dataset has 16 unique ids, 9 deterministic and 7 live-only; a new id fails", () => {
  const ids = authoringCases().map((entry) => entry.id);
  assert.equal(ids.length, 16);
  assert.equal(new Set(ids).size, 16);
  assert.equal(byMode("deterministic").length, 9);
  assert.equal(byMode("live-only").length, 7);
  assert.deepEqual(partitionProblems([...ids, "new-case"], ids, []), ["unmapped dataset case new-case"]);
});
test("[dataset-mapping] every deterministic authoring case and every injector case has a passing child test", () => {
  const run = runChildSuites();
  assert.deepEqual(runProblems(run.tap, run.status), []);
  const ids = [...byMode("deterministic"), ...INJECTOR_OWNED];
  assert.equal(ids.length, 13);
  assert.deepEqual(enforcedIds(run.tap.results, ids), ids);
});

// ---- live-run record ----------------------------------------------------------------------------------------

const VENDORS = ["claude-code", "opencode", "codex"] as const;
const COLUMNS = ["case", "vendor", "kind", "author", "grader", "stamp", "verdict", "recheck", "note"];
const RECHECK = /^node ai-framework\/scripts\/state-fragment-inject\.mts check --root \.project\/evals\/runs\/state-ai-authoring\/(claude-code|opencode|codex)\/[a-z0-9-]+\/[0-9]+ --slot (overview|architecture|history|risks|tokens)$/;
const STAMP = /^(accepted|rejected:[a-z-]{1,40})$/;
interface LiveRow { case: string; vendor: string; kind: string; author: string; grader: string; stamp: string; verdict: string; recheck: string; note: string }

function liveRows(text: string): { rows: LiveRow[]; problems: string[] } {
  const rows: LiveRow[] = [], problems: string[] = [];
  let header = false;
  for (const line of text.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.replace(/^\||\|\s*$/g, "").split("|").map((cell) => cell.trim());
    if (cells.join(",") === COLUMNS.join(",")) { header = true; continue; }
    if (!header || /^[-: ]+$/.test(cells.join(""))) continue;
    if (cells.length !== COLUMNS.length) { problems.push(`row has ${cells.length} cells`); continue; }
    rows.push(Object.fromEntries(COLUMNS.map((name, index) => [name, cells[index]])) as unknown as LiveRow);
  }
  if (!header) problems.push("no table header");
  return { rows, problems };
}

/** Structural problems with a live record. A not-run row is valid when it has a reason; whether the claim holds is a separate question. */
function liveProblems(text: string, liveIds: string[]): string[] {
  const { rows, problems } = liveRows(text);
  for (const row of rows) {
    const where = `${row.case}/${row.vendor}/${row.kind}`;
    if (row.kind === "not-run") {
      if (row.note === "" || row.note === "-") problems.push(`${where}: not-run without a reason`);
      if (row.vendor === "cursor" && row.case !== "all") problems.push("cursor row must be for case all");
      if (row.vendor !== "cursor" && !(VENDORS as readonly string[]).includes(row.vendor)) problems.push(`${where}: unknown vendor`);
      continue;
    }
    if (!["run", "seeded"].includes(row.kind)) problems.push(`${where}: unknown kind`);
    if (!liveIds.includes(row.case)) problems.push(`${where}: unknown case`);
    if (!(VENDORS as readonly string[]).includes(row.vendor)) problems.push(`${where}: unknown vendor`);
    if (row.author === "" || row.grader === "" || row.author === "-" || row.grader === "-" || row.author === row.grader) problems.push(`${where}: author and grader must be two different models`);
    if (!STAMP.test(row.stamp)) problems.push(`${where}: stamp result`);
    if (!["pass", "fail"].includes(row.verdict)) problems.push(`${where}: verdict`);
    if (!RECHECK.test(row.recheck)) problems.push(`${where}: recheck command`);
  }
  for (const id of liveIds) for (const vendor of VENDORS) {
    // Structure only: two recorded runs (pass or fail) or a not-run row with a reason. Whether they passed is the claim's question.
    const ran = rows.filter((row) => row.case === id && row.vendor === vendor && row.kind === "run").length;
    const notRun = rows.some((row) => row.case === id && row.vendor === vendor && row.kind === "not-run" && row.note !== "" && row.note !== "-");
    if (ran < 2 && !notRun) problems.push(`${id}/${vendor}: needs 2 recorded runs or a not-run row with a reason`);
  }
  for (const id of liveIds) if (!rows.some((row) => row.case === id && row.kind === "seeded")) problems.push(`${id}: missing seeded-bad row`);
  if (!rows.some((row) => row.vendor === "cursor" && row.kind === "not-run")) problems.push("missing cursor not-run row");
  return problems;
}

/** `supported` only when every live id passed twice on every vendor, nothing is not-run, and every seeded-bad row failed. */
function computeClaim(text: string, liveIds: string[]): "supported" | "blocked" {
  const { rows } = liveRows(text);
  if (liveProblems(text, liveIds).length > 0) return "blocked";
  if (rows.some((row) => row.kind === "not-run" && row.vendor !== "cursor")) return "blocked";
  for (const id of liveIds) {
    if (!rows.some((row) => row.case === id && row.kind === "seeded")) return "blocked";
    for (const vendor of VENDORS) if (rows.filter((row) => row.case === id && row.vendor === vendor && row.kind === "run" && row.verdict === "pass").length < 2) return "blocked";
  }
  return rows.some((row) => row.kind === "seeded" && row.verdict !== "fail") ? "blocked" : "supported";
}

const liveIds = (): string[] => [...LIVE_OWNED_BY_STATE_AI_AUTHORING, ...byMode("live-only")];
const recordText = (): string => { const read = createTestDeps().fs.readFileSync(`${root}/${LIVE_RECORD}`); return read; };

test("[dataset-mapping] there are 12 live ids", () => {
  assert.equal(liveIds().length, 12);
  assert.equal(new Set(liveIds()).size, 12);
});
test("[dataset-mapping] the live record is valid and its single Claim line equals the computed claim", () => {
  const text = recordText();
  assert.deepEqual(liveProblems(text, liveIds()), []);
  const claims = text.split("\n").filter((line) => /^Claim: /.test(line));
  assert.equal(claims.length, 1);
  assert.match(claims[0], /^Claim: (supported|blocked)$/);
  assert.equal(claims[0], `Claim: ${computeClaim(text, liveIds())}`);
});

// Synthetic records for the negative controls.
const IDS = ["c1", "c2"];
const check = (id: string, vendor: string, n: number, slot = "overview") => `node ai-framework/scripts/state-fragment-inject.mts check --root .project/evals/runs/state-ai-authoring/${vendor}/${id}/${n} --slot ${slot}`;
const row = (c: string, v: string, kind: string, author: string, grader: string, stamp: string, verdict: string, recheck: string, note = "-") => `| ${[c, v, kind, author, grader, stamp, verdict, recheck, note].join(" | ")} |`;
function record(edit: (rows: string[]) => string[] = (rows) => rows): string {
  const rows: string[] = [];
  for (const id of IDS) {
    for (const vendor of VENDORS) for (const n of [1, 2]) rows.push(row(id, vendor, "run", "m-a", "m-b", "accepted", "pass", check(id, vendor, n)));
    rows.push(row(id, "claude-code", "seeded", "m-a", "m-b", "rejected:unbound-number", "fail", check(id, "claude-code", 9)));
  }
  rows.push(row("all", "cursor", "not-run", "-", "-", "-", "-", "-", "no cursor adapter"));
  return ["Claim: supported", "", `| ${COLUMNS.join(" | ")} |`, `|${COLUMNS.map(() => "---").join("|")}|`, ...edit(rows)].join("\n") + "\n";
}
const without = (match: (r: string) => boolean) => (rows: string[]) => rows.filter((r) => !match(r));

test("[dataset-mapping] negative control: a complete record has no problems and computes supported (paired control)", () => {
  assert.deepEqual(liveProblems(record(), IDS), []);
  assert.equal(computeClaim(record(), IDS), "supported");
});
test("[dataset-mapping] negative control: a missing vendor row fails the check", () => {
  const text = record(without((r) => r.startsWith("| c1 | opencode ")));
  assert.deepEqual(liveProblems(text, IDS), ["c1/opencode: needs 2 recorded runs or a not-run row with a reason"]);
  assert.equal(computeClaim(text, IDS), "blocked");
});
test("[dataset-mapping] negative control: one passing run is not enough", () => {
  assert.deepEqual(liveProblems(record(without((r) => r.includes("/codex/c2/2 "))), IDS), ["c2/codex: needs 2 recorded runs or a not-run row with a reason"]);
});
test("[dataset-mapping] negative control: recorded runs that failed are valid structure but block the claim", () => {
  const text = record((rows) => rows.map((r) => (r.startsWith("| c1 | codex ") && r.includes("| run |") && r.includes("/1 --slot") ? r.replace("| pass |", "| fail |") : r)));
  assert.deepEqual(liveProblems(text, IDS), []);
  assert.equal(computeClaim(text, IDS), "blocked");
});
test("[dataset-mapping] negative control: a codex not-run row is valid but computes blocked", () => {
  const text = record((rows) => [...rows.filter((r) => !r.startsWith("| c1 | codex ")), row("c1", "codex", "not-run", "-", "-", "-", "-", "-", "CLI not installed")]);
  assert.deepEqual(liveProblems(text, IDS), []);
  assert.equal(computeClaim(text, IDS), "blocked");
  assert.deepEqual(liveProblems(record((rows) => [...rows, row("c1", "codex", "not-run", "-", "-", "-", "-", "-", "-")]), IDS), ["c1/codex/not-run: not-run without a reason"]);
  const extra = record((rows) => [...rows, row("c1", "codex", "not-run", "-", "-", "-", "-", "-", "one slot skipped")]);
  assert.deepEqual(liveProblems(extra, IDS), []);
  assert.equal(computeClaim(extra, IDS), "blocked", "a not-run row blocks the claim even beside two passes");
});
test("[dataset-mapping] negative control: an author model equal to the grader model fails", () => {
  const text = record((rows) => rows.map((r, i) => (i === 0 ? r.replace("m-b", "m-a") : r)));
  assert.deepEqual(liveProblems(text, IDS), ["c1/claude-code/run: author and grader must be two different models"]);
});
test("[dataset-mapping] negative control: a seeded-bad row graded pass computes blocked", () => {
  const text = record((rows) => rows.map((r) => (r.includes("| seeded |") && r.startsWith("| c2 ") ? r.replace("| fail |", "| pass |") : r)));
  assert.deepEqual(liveProblems(text, IDS), []);
  assert.equal(computeClaim(text, IDS), "blocked");
  assert.equal(computeClaim(record(without((r) => r.includes("| seeded |") && r.startsWith("| c2 "))), IDS), "blocked");
});
test("[dataset-mapping] negative control: a live id without a seeded-bad row is reported", () => {
  assert.deepEqual(liveProblems(record(without((r) => r.includes("| seeded |") && r.startsWith("| c2 "))), IDS), ["c2: missing seeded-bad row"]);
});
test("[dataset-mapping] negative control: bad stamp, bad re-check command, unknown case and missing cursor row are reported", () => {
  assert.deepEqual(liveProblems(record((rows) => rows.map((r, i) => (i === 0 ? r.replace("accepted", "ok") : r))), IDS), ["c1/claude-code/run: stamp result"]);
  assert.deepEqual(liveProblems(record((rows) => rows.map((r, i) => (i === 0 ? r.replace("check --root", "check --apply --root") : r))), IDS), ["c1/claude-code/run: recheck command"]);
  assert.deepEqual(liveProblems(record((rows) => [...rows, row("zz", "codex", "run", "m-a", "m-b", "accepted", "pass", check("zz", "codex", 1))]), IDS), ["zz/codex/run: unknown case"]);
  assert.deepEqual(liveProblems(record(without((r) => r.includes("cursor"))), IDS), ["missing cursor not-run row"]);
});
