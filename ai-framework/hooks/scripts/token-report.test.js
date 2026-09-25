const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { markdown, html } = require("./token-report.js");
const { blankSnapshot, recordEvent } = require("./token-consumption.js");

function row(overrides = {}) {
  return { completions: 1, reportedUsageCount: 0, unavailableCount: 1, tokens: 0, costUsd: 0, pricedCount: 0, ...overrides };
}

function map(source) {
  const result = Object.create(null);
  for (const [key, value] of Object.entries(source)) result[key] = value;
  return result;
}

function snapshotWith({ models = {}, agents = {}, efforts = {}, skills = {}, since = "2026-09-24T10:00:00.000Z", vendors = {} } = {}) {
  const snapshot = blankSnapshot();
  const nested = (source) => map(Object.fromEntries(Object.entries(source).map(([vendor, byName]) => [vendor, map(byName)])));
  snapshot.dimensions = { since, models: nested(models), agents: nested(agents), efforts: nested(efforts), skills: nested(skills) };
  snapshot.lifetime.vendors = map(vendors);
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
  assert.match(html(snapshotWith({ since: "<b>" })), /Dimensions counted since &lt;b&gt;\./);
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
  assert.match(output, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("a name cannot break out of a Markdown table row", () => {
  const output = markdown(snapshotWith({ models: { claude: { "a | b\n| injected | row |": row() } } }));
  const line = output.split("\n").find((entry) => entry.startsWith("| claude") && entry.includes("injected"));
  assert.ok(line, "the name stays on one line");
  const cells = line.split(/(?<!\\)\|/).slice(1, -1);
  assert.equal(cells.length, 7, "an escaped pipe adds no column");
  assert.equal(output.split("\n").some((entry) => entry.startsWith("| injected")), false);
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
  const snapshot = blankSnapshot();
  delete snapshot.dimensions;
  snapshot.lifetime.vendors = map({ opencode: { completions: 5, reportedUsageCount: 5, unavailableCount: 0, reportedCostUsd: 0, pricedCount: 0 }, claude: { completions: 9, reportedUsageCount: 0, unavailableCount: 9, reportedCostUsd: 0, pricedCount: 0 } });
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
  snapshot.lifetime.vendors = JSON.parse('{"__proto__": {"completions": 2, "reportedUsageCount": 1, "unavailableCount": 1, "reportedCostUsd": 0, "pricedCount": 0}}');
  const output = markdown(snapshot);
  assert.match(output, /\| __proto__ \| completions \| m \| 2 \| 1 \| 7 \|/);
  assert.match(html(snapshot), /<td>__proto__<\/td>/);
  assert.equal(({}).completions, undefined);
});

test("recordEvent writes a report with the usage headline and every table heading", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-report-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    recordEvent({ vendor: "opencode", event: "message.completed", agentType: "reviewer", model: "openai/gpt", effort: "high", costUsd: 0.01, raw: { session_id: "s", message_id: "one", tokens: { input: 10, output: 20 } } }, root);
    recordEvent({ vendor: "claude", event: "skill-use", raw: { tool_use_id: "t1", tool_input: { skill: "build" } } }, root);
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
