const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const { buildSnapshot, checkSnapshot, writeSnapshot, facts, REPORT_FILE } = require("./state-snapshot");

const SCRIPT = path.join(__dirname, "state-snapshot.js");
const NOW = "2026-09-25T12:00:00.000Z";

function project(files = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "state-snapshot-")));
  fs.mkdirSync(path.join(root, ".project"), { recursive: true });
  for (const [name, value] of Object.entries(files)) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, typeof value === "string" ? value : JSON.stringify(value));
  }
  return root;
}
const snap = (root, now = NOW) => buildSnapshot(root, { now });
const cleanup = (...roots) => roots.forEach((root) => fs.rmSync(root, { recursive: true, force: true }));
const allFacts = (snapshot) => [...facts(snapshot)].map(([where, item]) => ({ where, ...item }));

const STATUS_MD = `# Status

## Active pitches
| Pitch | Hill | Phase | Appetite | Last touched |
|-------|------|-------|----------|--------------|
| alpha | uphill 0% | plan | small-batch | 2026-09-20 |

## Parked pitches
_none_

## Recent ships (last 5)
| Pitch | Shipped | Notes |
|-------|---------|-------|
| beta | 2026-09-21 | done |
`;
const PITCH = (title) => `# Pitch: ${title}\n\n**Appetite**: small-batch • **Status**: bet\n\nBody.\n`;
const HILL = "| Scope | Position | Note |\n|---|---|---|\n| T1 | done | ok |\n| T2 | uphill 10% | wip |\n";
const METRICS = (extra = {}) => ({ schemaVersion: 1, updatedAt: "2026-09-24T12:00:00.000Z", lifetime: { agentCompletions: 4, reportedUsageCount: 4, unavailableCount: 0, vendors: { claude: { completions: 4, reportedUsageCount: 4, unavailableCount: 0 } } }, ...extra });

test("a bare project degrades every section without throwing and the snapshot is self-consistent", () => {
  const root = project();
  try {
    const snapshot = snap(root);
    assert.equal(snapshot.schemaVersion, 1);
    assert.equal(snapshot.database.status, "unconfigured");
    assert.equal(snapshot.metrics.status, "unavailable");
    assert.equal(snapshot.knowledge.status, "unavailable");
    assert.equal(snapshot.workflow.installedVersion.status, "unavailable");
    assert.deepEqual(checkSnapshot(root, snapshot), []);
  } finally { cleanup(root); }
});

test("every fact carries a valid status; unavailable facts always say why", () => {
  const root = project({ ".project/status.md": STATUS_MD, "README.md": "# Demo\n\nA demo project used in tests.\n" });
  try {
    for (const item of allFacts(snap(root))) {
      assert.ok(["observed", "proposed", "stale", "unavailable", "unconfigured"].includes(item.status), item.where);
      if (item.status === "unavailable") assert.ok(item.note, `${item.where} lacks a reason`);
    }
  } finally { cleanup(root); }
});

test("secrets in source files are redacted and never reach the snapshot", () => {
  const root = project({
    ".project/context/product.md": `# Product\n\n## Overview\n\nThe shop sells goods. password: hunter2 and key AKIAIOSFODNN7EXAMPLE and sk-abcdefghijklmnop1234567890 all appear here, padded to be a real document.\n`,
  });
  try {
    const snapshot = snap(root);
    const text = JSON.stringify(snapshot);
    for (const secret of ["hunter2", "AKIAIOSFODNN7EXAMPLE", "sk-abcdefghijklmnop1234567890"]) assert.ok(!text.includes(secret), secret);
    assert.ok(snapshot.redactions >= 3);
  } finally { cleanup(root); }
});

test("secret-bearing files are never read, even when present", () => {
  const marker = "SECRET-MARKER-DO-NOT-READ";
  const root = project({ ".env": `KEY=${marker}\n`, ".env.local": marker, "credentials.json": `{"k":"${marker}"}`, ".claude/settings.local.json": marker, ".project/context/stack.md": "# Stack\n\n## Runtime\n\nNode 22 runtime across the whole service, long enough to be a real filled context file.\n" });
  try { assert.ok(!JSON.stringify(snap(root)).includes(marker)); } finally { cleanup(root); }
});

test("a symlinked source is refused, not followed", () => {
  const outside = project({ "outside.md": "# Outside\n\nLEAKED-CONTENT that lives outside the project root entirely.\n" });
  const root = project();
  try {
    fs.symlinkSync(path.join(outside, "outside.md"), path.join(root, ".project/status.md"));
    const snapshot = snap(root);
    assert.equal(snapshot.pitches.statusMd.status, "unavailable");
    assert.match(snapshot.pitches.statusMd.note, /symlink/);
    assert.ok(!JSON.stringify(snapshot).includes("LEAKED-CONTENT"));
  } finally { cleanup(root, outside); }
});

test("an ancestor-symlinked .project directory cannot smuggle outside content in", () => {
  const outside = project({ ".project/status.md": STATUS_MD, ".project/context/product.md": "# Product\n\n## Overview\n\nOUTSIDE-PRODUCT that must never appear in an unrelated project's report.\n" });
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "state-snapshot-link-")));
  try {
    fs.rmSync(path.join(root, ".project"), { recursive: true, force: true });
    fs.symlinkSync(path.join(outside, ".project"), path.join(root, ".project"));
    assert.ok(!JSON.stringify(snap(root)).includes("OUTSIDE-PRODUCT"));
  } finally { cleanup(root, outside); }
});

test("context headings that state intent are proposed or unconfigured, never observed", () => {
  const root = project({ ".project/context/architecture.md": "# Architecture\n\n## Proposed Shape\n\nOne app serves many sites, described in enough words to count as filled.\n\n## Tenant Model\n\nFour levels, described as the current model in enough words too.\n\n## Undecided Components\n\nDatabase, auth and hosting are all still open questions right now.\n" });
  try {
    const byHeading = Object.fromEntries(snap(root).project.architecture.map((item) => [item.value.heading, item.status]));
    assert.equal(byHeading["Proposed Shape"], "proposed");
    assert.equal(byHeading["Tenant Model"], "observed");
    assert.equal(byHeading["Undecided Components"], "unconfigured");
  } finally { cleanup(root); }
});

test("an unfilled setup draft is reported unavailable rather than as fact", () => {
  const root = project({ ".project/context/stack.md": "# Stack\n\n## Detected\n\n_Detecting..._ and a filler line so that the draft is long enough to pass the size test.\n" });
  try {
    const [first] = snap(root).project.technology;
    assert.equal(first.status, "unavailable");
    assert.match(first.note, /unfilled/);
  } finally { cleanup(root); }
});

test("database: none configured, never inferred live; checked-in schema is evidence only", () => {
  const empty = project();
  const withPrisma = project({ "prisma/schema.prisma": "model A { id Int @id }\n", "db/migrations/001_init.sql": "select 1;\n" });
  try {
    assert.equal(snap(empty).database.status, "unconfigured");
    const found = snap(withPrisma).database;
    assert.equal(found.status, "observed");
    assert.equal(found.value.files, 2);
    assert.match(found.note, /not inferred/);
    assert.deepEqual(checkSnapshot(withPrisma, snap(withPrisma)), []);
  } finally { cleanup(empty, withPrisma); }
});

test("database scan ignores dependency and vendor directories", () => {
  const root = project({ "node_modules/pkg/migrations/1.sql": "x", ".claude/migrations/2.sql": "x" });
  try { assert.equal(snap(root).database.status, "unconfigured"); } finally { cleanup(root); }
});

test("token metrics: v1, v2 with extra keys, unknown version, partial, stale", () => {
  const cases = [
    [METRICS(), "observed", undefined],
    [METRICS({ schemaVersion: 2, dimensions: { future: [1, 2] }, extra: { nested: true } }), "observed", undefined],
    [METRICS({ schemaVersion: 99 }), "unavailable", /unsupported/],
    [METRICS({ lifetime: { agentCompletions: 10, reportedUsageCount: 4, unavailableCount: 6 } }), "observed", /partial: 4 of 10/],
    [METRICS({ lifetime: { agentCompletions: 5, reportedUsageCount: 0, unavailableCount: 5 } }), "unavailable", /no completion reported usage/],
    [METRICS({ updatedAt: "2026-09-01T00:00:00.000Z" }), "stale", /older than 7 days/],
  ];
  for (const [metrics, status, note] of cases) {
    const root = project({ ".project/metrics/token-consumption.json": metrics });
    try {
      const result = snap(root).metrics;
      assert.equal(result.status, status, JSON.stringify(metrics).slice(0, 80));
      if (note) assert.match(result.note, note);
    } finally { cleanup(root); }
  }
});

test("token metrics: malformed JSON and hostile counts do not break the snapshot", () => {
  const bad = project({ ".project/metrics/token-consumption.json": "{not json" });
  const hostile = project({ ".project/metrics/token-consumption.json": METRICS({ lifetime: { agentCompletions: "<script>", reportedUsageCount: -5, unavailableCount: 1e400, vendors: { "<b>x</b>": {} } } }) });
  try {
    assert.equal(snap(bad).metrics.status, "unavailable");
    const result = snap(hostile).metrics;
    assert.equal(result.value.completions, null);
    assert.equal(result.value.reportedUsage, null);
  } finally { cleanup(bad, hostile); }
});

test("installed version: marker is authoritative; bare VERSION is stale; neither is unavailable", () => {
  const marked = project({ ".project/.bundle-sync.json": { sourceVersion: "2.4.0", lastSyncedAt: "2026-09-01T00:00:00Z", conflicts: [], keptLocal: [] }, VERSION: "1.0.0\n" });
  const bare = project({ VERSION: "2.5.0\n" });
  const none = project();
  try {
    const a = snap(marked).workflow;
    assert.equal(a.installedVersion.value, "2.4.0");
    assert.equal(a.installedVersion.status, "observed");
    const b = snap(bare).workflow.installedVersion;
    assert.equal(b.status, "stale");
    assert.match(b.note, /not updated by sync/);
    assert.equal(snap(none).workflow.installedVersion.status, "unavailable");
  } finally { cleanup(marked, bare, none); }
});

test("partial sync: conflicts need attention; kept-local files are only counted", () => {
  const conflict = project({ ".project/.bundle-sync.json": { sourceVersion: "2.5.0", conflicts: ["ai-framework/rules/x.md"], keptLocal: [] } });
  const local = project({ ".project/.bundle-sync.json": { sourceVersion: "2.5.0", conflicts: [], keptLocal: ["a", "b"] } });
  try {
    assert.equal(snap(conflict).workflow.partialSync.value.state, "attention");
    const kept = snap(local).workflow.partialSync.value;
    assert.equal(kept.state, "clean");
    assert.equal(kept.keptLocalCount, 2);
  } finally { cleanup(conflict, local); }
});

test("pitches: active, shipped, unlisted, and compacted are told apart", () => {
  const root = project({
    ".project/status.md": STATUS_MD,
    ".project/pitches/alpha/pitch.md": PITCH("Alpha"), ".project/pitches/alpha/hill.md": HILL,
    ".project/pitches/beta/pitch.md": PITCH("Beta"), ".project/pitches/beta/SHIPPED.md": "# Shipped\n\n**Shipped:** 2026-09-21\n",
    ".project/pitches/gamma/pitch.md": PITCH("Gamma"),
    ".project/done-work.md": "# Done work\n\n## delta — shipped 2026-08-01\nSummary\n",
  });
  try {
    const items = Object.fromEntries(snap(root).pitches.items.map((item) => [item.value.slug, item]));
    assert.equal(items.alpha.value.phase, "active");
    assert.deepEqual(items.alpha.value.hill, { scopes: 2, done: 1 });
    assert.equal(items.alpha.value.appetite, "small-batch");
    assert.equal(items.beta.value.phase, "shipped");
    assert.equal(items.beta.value.shipped, "2026-09-21");
    assert.match(items.gamma.note, /not listed in .project\/status.md/);
    assert.equal(items.delta.value.phase, "compacted");
    assert.equal(items.delta.value.shipped, "2026-08-01");
    assert.deepEqual(checkSnapshot(root, snap(root)), []);
  } finally { cleanup(root); }
});

test("knowledge graph: counts by type and flags a graph older than its entries", () => {
  const root = project({ ".project/knowledge/graph.json": { nodes: [{ type: "pattern" }, { type: "pattern" }, { type: "issue" }] } });
  try {
    const graph = path.join(root, ".project/knowledge/graph.json");
    fs.utimesSync(graph, new Date("2026-09-01"), new Date("2026-09-01"));
    assert.deepEqual(snap(root).knowledge.value, { entries: 3, byType: { pattern: 2, issue: 1 } });
    assert.equal(snap(root).knowledge.status, "observed");
    fs.mkdirSync(path.join(root, ".project/knowledge/issues"), { recursive: true });
    fs.writeFileSync(path.join(root, ".project/knowledge/issues/new.md"), "# New\n");
    const stale = snap(root).knowledge;
    assert.equal(stale.status, "stale");
    assert.match(stale.note, /graphify/);
  } finally { cleanup(root); }
});

test("one corrupt source only marks its own section", () => {
  const root = project({ ".project/knowledge/graph.json": "{broken", ".project/status.md": STATUS_MD, ".project/metrics/token-consumption.json": METRICS(), ".project/skills/modes.json": "{broken" });
  try {
    const snapshot = snap(root);
    assert.equal(snapshot.knowledge.status, "unavailable");
    assert.equal(snapshot.pitches.statusMd.status, "observed");
    assert.equal(snapshot.metrics.status, "observed");
  } finally { cleanup(root); }
});

test("caveman: reported as unconfigured when not installed; malformed modes.json is unavailable, not a crash", () => {
  const plain = project();
  const broken = project({ ".project/skills/modes.json": "{nope" });
  try {
    assert.equal(snap(plain).skills.caveman.status, "unconfigured");
    assert.equal(snap(broken).skills.caveman.status, "unavailable");
  } finally { cleanup(plain, broken); }
});

test("output is deterministic for a fixed clock and long text is bounded", () => {
  const root = project({ ".project/context/product.md": `# Product\n\n## Overview\n\n${"word ".repeat(400)}\n` });
  try {
    assert.equal(JSON.stringify(snap(root)), JSON.stringify(snap(root)));
    const [first] = snap(root).project.description;
    assert.ok(first.value.summary.length <= 300);
  } finally { cleanup(root); }
});

test("invalid clock is rejected", () => {
  const root = project();
  try { assert.throws(() => snap(root, "not a date"), /Invalid --now/); } finally { cleanup(root); }
});

test("checkSnapshot catches invented evidence, missing evidence, and reasonless unavailability", () => {
  const root = project();
  try {
    const issues = checkSnapshot(root, { a: { value: 1, status: "observed", evidence: ["does/not/exist.md"] }, b: { value: 1, status: "observed", evidence: [] }, c: { value: null, status: "unavailable", evidence: [] }, d: { value: 1, status: "guessed", evidence: [] } });
    assert.equal(issues.length, 4);
  } finally { cleanup(root); }
});

test("writeSnapshot is atomic-shaped, idempotent, and leaves no temp files", () => {
  const root = project({ ".project/status.md": STATUS_MD });
  try {
    const snapshot = snap(root);
    assert.deepEqual(writeSnapshot(root, snapshot), { path: REPORT_FILE, changed: true });
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, REPORT_FILE), "utf8")), JSON.parse(JSON.stringify(snapshot)));
    assert.deepEqual(writeSnapshot(root, snapshot), { path: REPORT_FILE, changed: false });
    assert.deepEqual(writeSnapshot(root, snap(root, "2026-09-26T00:00:00.000Z")), { path: REPORT_FILE, changed: false }, "a new clock alone is not a change");
    fs.writeFileSync(path.join(root, "README.md"), "# Changed\n\nNow there is a readme in the project.\n");
    assert.equal(writeSnapshot(root, snap(root)).changed, true, "a real fact change is written");
    assert.deepEqual(fs.readdirSync(path.join(root, ".project/reports")), ["state.json"]);
  } finally { cleanup(root); }
});

test("writeSnapshot refuses a symlinked destination and a symlinked reports directory", () => {
  const outside = project();
  const root = project();
  try {
    fs.mkdirSync(path.join(root, ".project/reports"));
    fs.symlinkSync(path.join(outside, "victim.json"), path.join(root, ".project/reports/state.json"));
    assert.throws(() => writeSnapshot(root, snap(root)), /Symlink destination forbidden/);
    assert.ok(!fs.existsSync(path.join(outside, "victim.json")));
    fs.rmSync(path.join(root, ".project/reports"), { recursive: true });
    fs.symlinkSync(outside, path.join(root, ".project/reports"));
    assert.throws(() => writeSnapshot(root, snap(root)), /Symlink destination forbidden/);
    assert.deepEqual(fs.readdirSync(outside), [".project"]);
    assert.deepEqual(fs.readdirSync(path.join(outside, ".project")), []);
  } finally { cleanup(root, outside); }
});

test("CLI previews by default, writes only with --apply, and rejects unknown options", () => {
  const root = project({ ".project/status.md": STATUS_MD });
  try {
    const run = (...args) => spawnSync(process.execPath, [SCRIPT, "--root", root, "--now", NOW, ...args], { encoding: "utf8" });
    const preview = run();
    assert.equal(preview.status, 0);
    assert.match(preview.stdout, /preview only/);
    assert.ok(!fs.existsSync(path.join(root, REPORT_FILE)));
    const applied = run("--apply", "--json");
    assert.equal(applied.status, 0);
    assert.equal(JSON.parse(applied.stdout).written.changed, true);
    assert.ok(fs.existsSync(path.join(root, REPORT_FILE)));
    const bad = run("--bogus");
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /Unknown option/);
  } finally { cleanup(root); }
});

test("the report never connects to anything: no network modules are loaded by the collector", () => {
  const source = fs.readFileSync(SCRIPT, "utf8");
  assert.ok(!/require\(["'](?:node:)?(?:https?|net|tls|dgram|dns)["']\)/.test(source));
  assert.ok(!/\bfetch\(/.test(source));
});
