import { NODE_FLAGS } from "../../scripts/runtime/entry.mts";
const RUNTIME_FLAGS = process.versions.bun ? [] : NODE_FLAGS;
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { markdown, html, main } from "./token-report.mts";
import { blankSnapshot, recordEvent } from "./token-consumption.mts";
import type { Dimensions, Snapshot } from "./token-consumption.mts";

const here = path.dirname(fileURLToPath(import.meta.url));
type Loose = Record<string, unknown>;
// Fixtures deliberately put hostile or wrong-typed values where the snapshot type expects valid ones.
const loose = (snapshot: Snapshot): Loose => snapshot as unknown as Loose;

function row(overrides: Loose = {}): Loose {
  return { completions: 1, reportedUsageCount: 0, unavailableCount: 1, tokens: 0, costUsd: 0, pricedCount: 0, ...overrides };
}

function map<T>(source: Record<string, T>): Record<string, T> {
  const result: Record<string, T> = Object.create(null);
  for (const [key, value] of Object.entries(source)) result[key] = value;
  return result;
}

type Nested = Record<string, Record<string, unknown>>;
interface SnapshotParts { models?: Nested; agents?: Nested; efforts?: Nested; skills?: Nested; since?: string | null; vendors?: Record<string, unknown> }
function snapshotWith({ models = {}, agents = {}, efforts = {}, skills = {}, since = "2026-09-24T10:00:00.000Z", vendors = {} }: SnapshotParts = {}): Snapshot {
  const snapshot = blankSnapshot();
  const nested = (source: Nested): Nested => map(Object.fromEntries(Object.entries(source).map(([vendor, byName]) => [vendor, map(byName)])));
  snapshot.dimensions = { since, models: nested(models), agents: nested(agents), efforts: nested(efforts), skills: nested(skills) } as unknown as Dimensions;
  loose(snapshot).lifetime = { ...snapshot.lifetime, vendors: map(vendors) };
  return snapshot;
}

const TWO_VENDORS = {
  models: {
    opencode: { "gpt-5": row({ completions: 4, reportedUsageCount: 4, unavailableCount: 0, tokens: 900, costUsd: 0.4, pricedCount: 4 }), "small-model": row({ completions: 9, reportedUsageCount: 1, unavailableCount: 8, tokens: 50 }), "(unreported)": row({ completions: 20 }), "(other)": row({ completions: 3 }) },
    claude: { "claude-x": row({ completions: 30 }), "(unreported)": row({ completions: 2 }) },
  },
};

test("headline names its ranking basis, its unit and the vendors that report no tokens", () => {
  const output = markdown(snapshotWith(TWO_VENDORS));
  assert.match(output, /## Usage/);
  assert.match(output, /Most used vendor: opencode \(950 reported tokens, 36 assistant messages\)/);
  assert.match(output, /Most used model: opencode \/ gpt-5 \(900 reported tokens, 4 assistant messages\)/);
  assert.match(output, /Ranking basis: vendors and models by reported tokens, counting only entries that reported usage/);
  assert.match(output, /claude reports no tokens\./);
  assert.match(output, /Units: claude: subagent runs; opencode: assistant messages\. Completions are not comparable across units\./);
  assert.ok(output.indexOf("## Usage") < output.indexOf("## Latest Comparison"), "Usage follows the intro paragraph");
});

test("missing tokens are never treated as zero when ranking", () => {
  const output = markdown(snapshotWith({
    models: {
      claude: { "busy-model": row({ completions: 500 }) },
      codex: { "tiny-model": row({ completions: 1, reportedUsageCount: 1, unavailableCount: 0, tokens: 5 }) },
    },
  }));
  assert.match(output, /Most used vendor: codex \(5 reported tokens, 1 subagent runs\)/, "1 reported token beats 500 completions with no tokens");
  assert.match(output, /Most used model: codex \/ tiny-model/);
  assert.match(output, /claude reports no tokens\./);
});

test("with no reported tokens anywhere the ranking is by completions and says so", () => {
  const output = markdown(snapshotWith({ models: { claude: { a: row({ completions: 2 }), b: row({ completions: 7 }) }, codex: { c: row({ completions: 3 }) } } }));
  assert.match(output, /Most used vendor: claude \(9 subagent runs\)/);
  assert.match(output, /Most used model: claude \/ b \(7 subagent runs\)/);
  assert.match(output, /vendors and models by completions, because no entry reported tokens/);
  assert.match(output, /claude, codex report no tokens\./);
});

test("unit falls back to completions for an unknown vendor", () => {
  const output = markdown(snapshotWith({ models: { other: { m: row({ completions: 2 }) } } }));
  assert.match(output, /Most used vendor: other \(2 completions\)/);
});

test("Unreported, Unpriced and Other (overflow) wording, and never a zero for missing data", () => {
  const output = markdown(snapshotWith(TWO_VENDORS));
  assert.match(output, /\| claude \| subagent runs \| Unreported \| 2 \| 0 \| Unavailable \| Unpriced \|/);
  assert.match(output, /\| opencode \| assistant messages \| Other \(overflow\) \| 3 \| 0 \| Unavailable \| Unpriced \|/);
  assert.match(output, /\| opencode \| assistant messages \| gpt-5 \| 4 \| 4 \| 900 \| \$0\.400000 \|/);
  assert.doesNotMatch(output, /\(unreported\)|\(other\)/, "raw bucket names never reach the reader");
  assert.match(output, /summed over completions that reported a nonzero cost/);
  assert.match(html(snapshotWith(TWO_VENDORS)), /<td class="t">Unreported<\/td>/);
});

test("rows sort by tokens, then completions, then name, inside each vendor", () => {
  const output = markdown(snapshotWith({
    models: { opencode: { zeta: row({ completions: 5 }), alpha: row({ completions: 5 }), heavy: row({ completions: 1, reportedUsageCount: 1, unavailableCount: 0, tokens: 10 }) } },
  }));
  const order = ["heavy", "alpha", "zeta"].map((name) => output.indexOf(`| ${name} |`));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test("the since line reports the counting date, or says nothing was counted yet", () => {
  assert.match(markdown(snapshotWith({ since: "2026-09-24T10:00:00.000Z" })), /Dimensions counted since 2026-09-24T10:00:00\.000Z\. Completions recorded before that are not back-filled\./);
  assert.match(markdown(snapshotWith({ since: null })), /Not yet counted\. Completions recorded before that are not back-filled\./);
  assert.match(html(snapshotWith({ since: "<b>" })), /Not yet counted\./, "a value that is not a date is not shown");
});

test("skills table lists vendor, skill and uses", () => {
  const output = markdown(snapshotWith({ skills: { claude: { build: { uses: 2 }, plan: { uses: 5 }, "(other)": { uses: 1 } } } }));
  assert.match(output, /\| Vendor \| Skill \| Uses \|/);
  assert.ok(output.indexOf("| claude | plan | 5 |") < output.indexOf("| claude | build | 2 |"));
  assert.match(output, /\| claude \| Other \(overflow\) \| 1 \|/);
});

test("every dynamic string is escaped in HTML", () => {
  const evil = "<script>alert(1)</script>";
  const output = html(snapshotWith({
    models: { [evil]: { [evil]: row() } },
    agents: { claude: { [evil]: row() } },
    efforts: { claude: { '"><img src=x>': row() } },
    skills: { claude: { [evil]: { uses: 1 } } },
    since: evil,
    vendors: { [evil]: { completions: 1, reportedUsageCount: 0, unavailableCount: 1, reportedCostUsd: 0, pricedCount: 0 } },
  }));
  assert.equal(output.includes("<script>"), false);
  assert.equal(output.includes("<img"), false);
  // Hostile names are re-checked against the identifier allow-list at render and never shown, escaped or not.
  assert.equal(output.includes("alert(1)"), false);
  assert.match(output, /Other \(overflow\)|\(other\)/);
});

test("a name cannot break out of a Markdown table row", () => {
  const output = markdown(snapshotWith({ models: { claude: { "a | b\n| injected | row |": row() } } }));
  assert.equal(output.includes("injected"), false, "the hostile name is replaced, not echoed");
  assert.equal(output.split("\n").some((entry) => entry.startsWith("| injected")), false);
  const line = output.split("\n").find((entry) => entry.startsWith("| claude") && entry.includes("Other (overflow)"));
  assert.ok(line, "the row stays on one line under the overflow label");
  assert.equal(line.split(/(?<!\\)\|/).slice(1, -1).length, 7, "no column is added");
  assert.equal(markdown(snapshotWith({ models: { claude: { "<b>x</b>": row() } } })).includes("<b>"), false);
});

test("a blank v2 snapshot renders every section with None rows and No data yet", () => {
  const snapshot = blankSnapshot();
  const output = markdown(snapshot);
  assert.match(output, /Most used vendor: No data yet/);
  assert.match(output, /Most used model: No data yet/);
  assert.match(output, /Ranking basis: no completions recorded yet\./);
  assert.match(output, /Not yet counted/);
  for (const heading of ["## By Model", "## By Agent", "## By Effort", "## Skills", "## By Vendor Unit"]) assert.ok(output.includes(heading), heading);
  assert.match(output, /\| None \| - \| - \| - \| - \| - \| - \|/);
  assert.match(html(snapshot), /<td class="t">None<\/td>/);
});

test("a snapshot with no dimensions still renders, ranking the lifetime vendors by completions", () => {
  const snapshot = loose(blankSnapshot());
  delete snapshot.dimensions;
  (snapshot.lifetime as Loose).vendors = map({ opencode: { completions: 5, reportedUsageCount: 5, unavailableCount: 0, reportedCostUsd: 0, pricedCount: 0 }, claude: { completions: 9, reportedUsageCount: 0, unavailableCount: 9, reportedCostUsd: 0, pricedCount: 0 } });
  for (const output of [markdown(snapshot), html(snapshot)]) {
    assert.match(output, /Most used vendor: claude \(9 subagent runs\)/);
    assert.match(output, /Most used model: No data yet/);
    assert.match(output, /per-vendor token totals are not recorded yet/);
    assert.match(output, /claude reports no tokens\./);
    assert.match(output, /Not yet counted/);
  }
});

test("a vendor named __proto__ is data, not a prototype", () => {
  const parsed = JSON.parse('{"__proto__": {"m": {"completions": 2, "reportedUsageCount": 1, "unavailableCount": 1, "tokens": 7, "costUsd": 0, "pricedCount": 0}}}');
  const snapshot = blankSnapshot();
  snapshot.dimensions.models = parsed;
  (loose(snapshot).lifetime as Loose).vendors = JSON.parse('{"__proto__": {"completions": 2, "reportedUsageCount": 1, "unavailableCount": 1, "reportedCostUsd": 0, "pricedCount": 0}}');
  const output = markdown(snapshot);
  assert.match(output, /\| __proto__ \| completions \| m \| 2 \| 1 \| 7 \|/);
  assert.match(html(snapshot), /<td>__proto__<\/td>/);
  assert.equal(({}).completions, undefined);
});

test("recordEvent writes a report with the usage headline and every table heading", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-report-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    await recordEvent({ vendor: "opencode", event: "message.completed", agentType: "reviewer", model: "openai/gpt", effort: "high", costUsd: 0.01, raw: { session_id: "s", message_id: "one", tokens: { input: 10, output: 20 } } }, root);
    await recordEvent({ vendor: "claude", event: "skill-use", raw: { tool_use_id: "t1", tool_input: { skill: "build" } } }, root);
    const metrics = path.join(root, ".project", "metrics");
    const md = fs.readFileSync(path.join(metrics, "token-consumption.md"), "utf8");
    assert.match(md, /Most used vendor: opencode \(30 reported tokens, 1 assistant messages\)/);
    for (const heading of ["## Usage", "## By Model", "## By Agent", "## By Effort", "## Skills"]) assert.ok(md.includes(heading), heading);
    assert.match(md, /\| opencode \| assistant messages \| openai\/gpt \| 1 \| 1 \| 30 \| \$0\.010000 \|/);
    assert.match(md, /\| opencode \| assistant messages \| high \|/);
    assert.match(md, /\| claude \| build \| 1 \|/);
    assert.match(fs.readFileSync(path.join(metrics, "token-consumption.html"), "utf8"), /<h2>Skills<\/h2>/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("an unsafe agent id is never shown as a label in either report", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-report-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    await recordEvent({ vendor: "claude", event: "subagent-complete", raw: { session_id: "s", agent_id: "[click](https://evil.example/x)" } }, root);
    for (const name of ["token-consumption.md", "token-consumption.html"]) {
      const text = fs.readFileSync(path.join(root, ".project", "metrics", name), "utf8");
      assert.doesNotMatch(text, /evil\.example/, `${name} does not render the id`);
      assert.match(text, /\(other\)/);
    }
    await recordEvent({ vendor: "claude", event: "subagent-complete", raw: { session_id: "s2", agent_id: "a511f7310cb420ed5" } }, root);
    assert.match(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.md"), "utf8"), /\| claude \| a511f7310cb420ed5 \|/, "a normal id is still shown");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// ---- Independent re-review (S2): the renderer must be safe and total for any snapshot ----

test("a hand-edited snapshot with hostile strings and wrong types renders without markup, links, injected headings, or a throw", () => {
  const snapshot = loose(blankSnapshot());
  snapshot.updatedAt = "2026-01-01\n# injected heading";
  const lifetime = snapshot.lifetime as Loose;
  lifetime.agentCompletions = "<img src=x onerror=alert(1)>";
  lifetime.reportedCostUsd = "1";
  lifetime.tokens = null;
  lifetime.vendors = map<unknown>({ "[click](https://evil.example/v)": { completions: "<b>", reportedUsageCount: 1, unavailableCount: 0, reportedCostUsd: "x" }, zzz: null });
  snapshot.current = { vendor: "[v](javascript:alert(1))", agentType: "![i](http://e/x.png)", model: "m‮​\u0007", tokens: null, costUsd: "5", availability: "<script>", metricScope: "a|b\nc", mode: "[m](https://evil.example/mode)" };
  snapshot.previous = 5;
  snapshot.dimensions = { since: "<b>", models: { "[x](https://evil.example)": { "[m](javascript:1)": { completions: "3", tokens: NaN } } }, agents: null, efforts: { claude: { "a b": {} } }, skills: { claude: { s: { uses: Infinity } } } };
  let md = "";
  let page = "";
  assert.doesNotThrow(() => { md = markdown(snapshot); page = html(snapshot); });
  for (const output of [md, page]) {
    assert.doesNotMatch(output, /evil\.example|javascript:|onerror|<img|<script|‮|​|\u0007/);
  }
  assert.equal(/^# injected heading/m.test(md), false);
  assert.doesNotMatch(md, /\]\(/, "no Markdown link syntax survives");
});

test("a snapshot that is not an object at all still renders the empty report", () => {
  for (const value of [null, undefined, 5, "text", [], { lifetime: 7, dimensions: "x", current: [] }]) {
    assert.doesNotThrow(() => { markdown(value); html(value); }, String(JSON.stringify(value)));
    assert.match(markdown(value), /Agent Token Consumption/);
  }
});

test("an identifier-shaped name still renders exactly as it did before the render-time allow-list", () => {
  const output = markdown(snapshotWith({ models: { opencode: { "openai/gpt-5.6-terra": row({ completions: 2, reportedUsageCount: 2, unavailableCount: 0, tokens: 30 }), "(unreported)": row({ completions: 1 }) } } }));
  assert.match(output, /\| opencode \| assistant messages \| openai\/gpt-5\.6-terra \| 2 \| 2 \| 30 \|/);
  assert.match(output, /\| opencode \| assistant messages \| Unreported \|/);
});

// ---- Audit cycle 2 of the S2 re-review ----

test("a bare URL, a www host or an address in a name is not turned into a Markdown link", () => {
  const output = markdown(snapshotWith({ models: { claude: { "www.evil-example.com/reset": row(), "https://evil.example/login": row(), "a@b.example": row() } } }));
  assert.doesNotMatch(output, /https:\/\/evil\.example|www\.evil-example|a@b\.example/);
  assert.match(output, /https&#58;\/\/evil\.example\/login/);
  assert.match(output, /www&#46;evil-example\.com\/reset/);
});

test("the By Vendor table in the HTML report is closed", () => {
  const output = html(snapshotWith({ vendors: { claude: { completions: 1, reportedUsageCount: 0, unavailableCount: 1, reportedCostUsd: 0, pricedCount: 0 } } }));
  assert.equal((output.match(/<tbody>/g) || []).length, (output.match(/<\/tbody>/g) || []).length);
});

test("www after an underscore or other word character is still neutralized", () => {
  const output = markdown(snapshotWith({ models: { claude: { "_www.evil.example": row() } } }));
  assert.doesNotMatch(output, /_www\.evil/);
  assert.match(output, /_www&#46;evil\.example/);
});

// ---- main(): the library has no CLI ----

test("main() is a no-op that returns 0, as running the old library file directly did", () => {
  assert.equal(main(), 0);
  const run = spawnSync(process.execPath, [...RUNTIME_FLAGS, path.join(here, "token-report.mts")], { encoding: "utf8" });
  assert.equal(run.status, 0);
  assert.equal(run.stdout, "");
  assert.equal(run.stderr, "");
});

test("the renderer is pure: rendering twice gives the same text and leaves the input snapshot untouched", () => {
  const snapshot = snapshotWith(TWO_VENDORS);
  const before = JSON.stringify(snapshot);
  assert.equal(markdown(snapshot), markdown(snapshot));
  assert.equal(html(snapshot), html(snapshot));
  assert.equal(JSON.stringify(snapshot), before);
});
