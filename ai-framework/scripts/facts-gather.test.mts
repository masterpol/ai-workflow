import assert from "node:assert/strict";
import { test } from "node:test";
import { createTestDeps, spawnSync, tempFixture } from "./runtime/test-helpers.mts";
import { createFactsGather, main, STATUSES } from "./facts-gather.mts";
import type { Fact, Facts } from "./facts-gather.mts";

const deps = createTestDeps();
const { existsSync, readFileSync, readdirSync, rmSync, symlinkSync, mkdirSync, writeFileSync } = deps.fs;
const { join } = deps.path;
const api = createFactsGather(deps);

const STATUS_MD = [
  "# Status", "",
  "## Active pitches",
  "| Pitch | Hill | Phase | Appetite | Last touched |",
  "|-------|------|-------|----------|--------------|",
  "| alpha | draft | shape | small-batch | 2026-11-01 |",
  "| beta | uphill 50% | build | big-batch | 2026-11-02 |", "",
  "## Recent ships (last 5)",
  "| Pitch | Shipped | Notes |",
  "|-------|---------|-------|",
  "| gamma | 2026-10-01 | done |", "",
].join("\n");
const GRAPH = JSON.stringify({ nodes: [{ node_kind: "knowledge", entry_type: "pattern" }, { node_kind: "knowledge", entry_type: "issue" }, { node_kind: "code" }] });
const REGISTRY = JSON.stringify({ schemaVersion: 1, skills: { "o/r/caveman": { name: "caveman", enabled: true, source: { revision: "2fd153c67988e980fb0b2455c90832159a6a5a25" } } } });

function project(extra: Record<string, string> = {}): string {
  return tempFixture(deps, { "VERSION": "9.9.9\n", ".project/status.md": STATUS_MD, "graphify-out/graph.json": GRAPH, ".project/skills/registry.json": REGISTRY, ...extra });
}
const leaves = (value: unknown, found: Fact[] = []): Fact[] => {
  if (value && typeof value === "object" && "status" in value && "evidence" in value) found.push(value as Fact);
  else if (value && typeof value === "object") for (const child of Object.values(value)) leaves(child, found);
  return found;
};

test("gathers labelled facts whose evidence paths exist", () => {
  const root = project();
  try {
    const facts = api.gather(root);
    assert.deepEqual((facts.pitches.active.value as { count: number }).count, 2);
    assert.deepEqual((facts.pitches.shippedListed.value as { count: number }).count, 1);
    assert.equal((facts.knowledge.value as { entries: number }).entries, 2);
    assert.equal((facts.skills.value as { count: number }).count, 1);
    assert.equal(facts.workflow.installedVersion.status, "stale", "a bare VERSION is never reported as observed");
    for (const fact of leaves(facts)) {
      assert.ok((STATUSES as readonly string[]).includes(fact.status));
      if (fact.status === "observed" || fact.status === "stale") assert.ok(fact.evidence.length > 0, "observed and stale facts cite evidence");
      for (const evidence of fact.evidence) assert.ok(existsSync(join(root, evidence)), `evidence exists: ${evidence}`);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("missing sources are unavailable or unconfigured with a reason, never guessed", () => {
  const root = tempFixture(deps, { "README.md": "x" });
  try {
    const facts = api.gather(root);
    assert.equal(facts.workflow.installedVersion.status, "unavailable");
    assert.equal(facts.pitches.active.status, "unavailable");
    assert.match(String(facts.pitches.active.note), /status\.md file not present/);
    assert.equal(facts.knowledge.status, "unavailable");
    assert.match(String(facts.knowledge.note), /graphify\.mts/);
    assert.equal(facts.skills.status, "unconfigured");
    for (const fact of leaves(facts)) if (fact.status === "unavailable") assert.ok(fact.note, "unavailable always says why");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a symlinked source is refused, even when it points at a readable file", () => {
  const outside = tempFixture(deps, { "secret.md": STATUS_MD });
  const root = project();
  try {
    rmSync(join(root, ".project/status.md"));
    symlinkSync(join(outside, "secret.md"), join(root, ".project/status.md"));
    const facts = api.gather(root);
    assert.equal(facts.pitches.active.status, "unavailable");
    assert.match(String(facts.pitches.active.note), /symlink refused/);
  } finally { rmSync(root, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }); }
});

test("an oversized status file is reported as unavailable, and an oversized read is bounded", () => {
  const root = project({ ".project/status.md": `${STATUS_MD}\n${"x".repeat(1024 * 1024 + 1)}` });
  try { assert.match(String(api.gather(root).pitches.active.note), /too large to read/); } finally { rmSync(root, { recursive: true, force: true }); }
  const long = project({ ".project/status.md": `${STATUS_MD}\n${"y".repeat(70 * 1024)}` });
  try {
    const active = api.gather(long).pitches.active;
    assert.equal(active.status, "stale", "text past the 64 KB read limit makes the count stale, not observed");
    assert.match(String(active.note), /64 KB/);
  } finally { rmSync(long, { recursive: true, force: true }); }
});

test("clean() redacts credential shapes and neutralises Archify markup", () => {
  assert.equal(api.clean("ghp_abcdefghijklmnopqrstuvwxyz0123456789"), "(redacted)");
  assert.match(api.clean("db password=hunter2hunter2"), /\(redacted\)/);
  const hostile = api.clean('<script>alert(1)</script> `code` **bold** [x](javascript:alert(1)) | {good:ok} \\ ~~ _u_ # h ![i](y) https://u:p@h/');
  assert.doesNotMatch(hostile, /[<>`*\[\]|{}\\~_#!]/);
  assert.doesNotMatch(hostile, /\]\(/);
  assert.ok(api.clean("a".repeat(500)).length <= 200);
  assert.equal(api.clean("tab\there\u0000zero\u200bwidth"), "tab here zerowidth");
});

test("the explainer draft carries hostile pitch names only as inert text", () => {
  const evil = "| `<script>window.X=1</script>` | [x](javascript:alert(1)) | **b** | {bad:x} | ghp_abcdefghijklmnopqrstuvwxyz0123456789 |";
  const root = project({ ".project/status.md": STATUS_MD.replace("| alpha | draft | shape | small-batch | 2026-11-01 |", evil) });
  try {
    const facts = api.gather(root);
    const draft = JSON.stringify(api.explainer(facts, "p<roj>", "2026-11-23T00:00:00.000Z"));
    assert.doesNotMatch(draft, /<script|ghp_/);
    assert.doesNotMatch(draft, /\]\(/, "no link syntax survives, so javascript: stays plain text");
    assert.doesNotMatch(draft, /<[a-z/]/i, "no HTML-looking text survives");
    assert.match(draft, /\(redacted\)/);
    // Counts in the draft come from the facts, not from text.
    const parsed = api.explainer(facts, "p", "t") as { answer: { summary: string } };
    assert.match(parsed.answer.summary, /^2 active pitch\(es\), 2 knowledge entries, 1 project skill\(s\)\./);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("an unavailable fact is labelled unavailable in the draft, never turned into a number", () => {
  const root = tempFixture(deps, { "README.md": "x" });
  try {
    const draft = api.explainer(api.gather(root), "p", "t") as { answer: { summary: string } };
    assert.match(draft.answer.summary, /active pitch\(es\): unavailable, knowledge entries: unavailable, 0 project skill\(s\)/);
    assert.doesNotMatch(draft.answer.summary, /\b0 active|\b0 knowledge/);
    assert.match(JSON.stringify(draft), /unavailable \(/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("writeReport accepts only a plain name inside .project/reports and refuses links", () => {
  const root = project();
  const outside = tempFixture(deps, {});
  try {
    assert.equal(api.writeReport(root, "state.explainer.json", "{}\n"), ".project/reports/state.explainer.json");
    assert.equal(readFileSync(join(root, ".project/reports/state.explainer.json")), "{}\n");
    for (const bad of ["../x.explainer.json", "a/b.explainer.json", "state.json", ".hidden.explainer.json", "x.explainer.json/"]) assert.throws(() => api.writeReport(root, bad, "{}"), /plain file name/);
    rmSync(join(root, ".project/reports"), { recursive: true, force: true });
    symlinkSync(outside, join(root, ".project/reports"));
    assert.throws(() => api.writeReport(root, "state.explainer.json", "{}"), /plain directory/);
    assert.equal(existsSync(join(outside, "state.explainer.json")), false, "nothing written through the link");
  } finally { rmSync(root, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }); }
});

test("writeReport refuses a symlinked destination file", () => {
  const root = project();
  const outside = tempFixture(deps, { "target.json": "keep" });
  try {
    mkdirSync(join(root, ".project/reports"), { recursive: true });
    symlinkSync(join(outside, "target.json"), join(root, ".project/reports/state.explainer.json"));
    assert.throws(() => api.writeReport(root, "state.explainer.json", "{}"), /Symlink destination forbidden/);
    assert.equal(readFileSync(join(outside, "target.json")), "keep");
  } finally { rmSync(root, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }); }
});

test("main: preview writes nothing, --explainer writes the draft, unknown options fail", () => {
  const root = project();
  const out: string[] = [], err: string[] = [];
  const captured = { ...deps, io: { ...deps.io, stdout: { ...deps.io.stdout, write: (text: string) => { out.push(text); } }, stderr: { ...deps.io.stderr, write: (text: string) => { err.push(text); } } } };
  try {
    assert.equal(main(["--root", root], captured), 0);
    assert.match(out.join(""), /preview only/);
    assert.equal(existsSync(join(root, ".project/reports")), false, "preview creates nothing");
    assert.equal(main(["--root", root, "--explainer", "state.explainer.json"], captured), 0);
    const draft = JSON.parse(readFileSync(join(root, ".project/reports/state.explainer.json"))) as { diagram_type: string; schema_version: number };
    assert.equal(draft.diagram_type, "explainer");
    assert.equal(draft.schema_version, 1);
    assert.equal(main(["--nope"], captured), 1);
    assert.match(err.join(""), /Unknown option/);
    assert.equal(main(["--root", join(root, "missing")], captured), 1);
    assert.doesNotMatch(err.join(""), new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "errors never echo absolute paths");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("every redaction family is exercised, one assertion each", () => {
  // Credential-shaped samples that a secret scanner flags are built from fragments at runtime, so no literal in this file matches a key pattern.
  const samples = [
    "-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----", ["AK", "IAABCDEFGHIJKLMNOP"].join(""), "npm_abcdefghijklmnopqrstuvwxyz", "glpat-abcdefghijklmnopqrst",
    "dop_v1_abcdef0123456789abcdef", "whsec_abcdefghijklmnopqrst", "SG.abcdefghijk.lmnopqrstuvw", "hooks.slack.com/services/T000/B000/XXXX",
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIabcdefghij", "Authorization: Token abcdef", "--password hunter2", "sk-live_abcdefghijklmnopqrst",
    "ghp_abcdefghijklmnopqrstuvwxyz0123456789", "github_pat_abcdefghijklmnopqrst", "xoxb-1234567890-abcdef", ["AIza", "abcdefghijklmnopqrstuvwxyz0123456789"].join(""),
    "eyJhbGciOiJI.eyJzdWIiOiIx.abc", "Bearer abcdefgh1234", "postgres://user:pw@host/db", "DB_PASSWORD=hunter2", "pwd: hunter2",
  ];
  for (const sample of samples) {
    const out = api.clean(`note ${sample} end`);
    assert.match(out, /\(redacted\)/, `redacted: ${sample.slice(0, 24)}`);
    assert.doesNotMatch(out, /hunter2|abcdefghijklmnopqrst|AAAAC3NzaC1|user:pw/, `no secret text left: ${sample.slice(0, 24)}`);
  }
  assert.equal(api.clean("compass: north"), "compass: north", "short keywords only match at a word start");
});

test("a symlinked directory anywhere on the path is refused, inside or outside the project", () => {
  const outside = tempFixture(deps, { "status.md": STATUS_MD });
  const root = project();
  try {
    rmSync(join(root, ".project"), { recursive: true, force: true });
    symlinkSync(outside, join(root, ".project"));
    const outer = api.gather(root);
    assert.equal(outer.pitches.active.status, "unavailable");
    assert.match(String(outer.pitches.active.note), /symlink refused/);
    rmSync(join(root, ".project"));
    mkdirSync(join(root, "evil"));
    writeFileSync(join(root, "evil/status.md"), STATUS_MD);
    symlinkSync(join(root, "evil"), join(root, ".project"));
    const inner = api.gather(root);
    assert.equal(inner.pitches.active.status, "unavailable", "an in-project link cannot stand in for .project");
    assert.match(String(inner.pitches.active.note), /symlink refused/);
  } finally { rmSync(root, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }); }
});

test("a hostile .project link never gets a directory created behind it", () => {
  const outside = tempFixture(deps, {});
  const root = tempFixture(deps, { "README.md": "x" });
  try {
    symlinkSync(outside, join(root, ".project"));
    assert.throws(() => api.writeReport(root, "state.explainer.json", "{}"), /plain directory/);
    assert.deepEqual(readdirSync(outside), [], "the outside directory is still empty");
  } finally { rmSync(root, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }); }
});

test("an empty status file is read as empty, not reported as unreadable", () => {
  const root = project({ ".project/status.md": "" });
  try {
    const active = api.gather(root).pitches.active;
    assert.equal(active.status, "observed");
    assert.equal((active.value as { count: number }).count, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("bounds that cap a list make the fact stale with a note, and counts still add up", () => {
  const rows = Array.from({ length: 7 }, (_, index) => `| p${index} | draft | shape | small-batch | 2026-11-0${index + 1} |`).join("\n");
  const status = STATUS_MD.replace("| alpha | draft | shape | small-batch | 2026-11-01 |\n| beta | uphill 50% | build | big-batch | 2026-11-02 |", rows);
  const graph = JSON.stringify({ nodes: Array.from({ length: 25 }, (_, index) => ({ node_kind: "knowledge", entry_type: `type${String.fromCharCode(97 + index)}` })) });
  const registry = JSON.stringify({ skills: Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`s${index}`, { name: `skill${index}`, enabled: true }])) });
  const root = project({ ".project/status.md": status, "graphify-out/graph.json": graph, ".project/skills/registry.json": registry });
  try {
    const small = createFactsGather(deps, { rows: 5 });
    const facts = small.gather(root);
    const active = facts.pitches.active;
    assert.equal(active.status, "stale");
    assert.match(String(active.note), /7 rows; the first 5 are listed/);
    assert.equal((active.value as { count: number; items: unknown[] }).count, 7);
    assert.equal((active.value as { items: unknown[] }).items.length, 5);
    const knowledge = facts.knowledge.value as { entries: number; byType: Record<string, number> };
    assert.equal(knowledge.entries, 25);
    assert.equal(Object.values(knowledge.byType).reduce((a, b) => a + b, 0), 25, "no entry is dropped from byType");
    assert.ok("other" in knowledge.byType);
    assert.equal(facts.skills.status, "stale");
    assert.equal((facts.skills.value as { count: number }).count, 6);
    const draft = small.explainer(facts, "p", "t") as { answer: { summary: string } };
    assert.match(draft.answer.summary, /^at least 7 active pitch\(es\)/);
    assert.match(JSON.stringify(draft), /first 5 are listed/, "the reason reaches the page");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("the graph read bound is enforced", () => {
  const root = project({ "graphify-out/graph.json": GRAPH + " ".repeat(2000) });
  try {
    const knowledge = createFactsGather(deps, { graphBytes: 1000 }).gather(root).knowledge;
    assert.equal(knowledge.status, "unavailable");
    assert.match(String(knowledge.note), /too large to read/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("writeReport writes an absent destination and leaves no temporary file", () => {
  const root = project();
  try {
    api.writeReport(root, "state.explainer.json", "new\n");
    assert.equal(readFileSync(join(root, ".project/reports/state.explainer.json")), "new\n");
    assert.deepEqual(readdirSync(join(root, ".project/reports")).sort(), ["state.explainer.json", "state.explainer.json.written-sha256"]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("main: --json prints the full facts and --now fixes the stamp in the draft", () => {
  const root = project();
  const out: string[] = [];
  const captured = { ...deps, io: { ...deps.io, stdout: { ...deps.io.stdout, write: (text: string) => { out.push(text); } } } };
  try {
    assert.equal(main(["--root", root, "--json"], captured), 0);
    const facts = JSON.parse(out.join(""));
    assert.equal(facts.schemaVersion, 1);
    assert.deepEqual(Object.keys(facts).sort(), ["knowledge", "pitches", "schemaVersion", "skills", "workflow"]);
    assert.equal(main(["--root", root, "--explainer", "state.explainer.json", "--now", "2030-01-02T03:04:05.000Z"], captured), 0);
    assert.match(readFileSync(join(root, ".project/reports/state.explainer.json")), /2030-01-02T03:04:05\.000Z/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

const GOLDEN_SIMPLE = "{\"schema_version\":1,\"diagram_type\":\"explainer\",\"meta\":{\"id\":\"project-state\",\"title\":\"proj state\",\"locale\":\"en\",\"feedback_links\":false},\"answer\":{\"summary\":\"2 active pitch(es), 2 knowledge entries, 1 project skill(s).\",\"reasons\":[\"Active pitches come from the status index [observed]\",\"Knowledge entries come from the graph [observed]\",\"Skills come from the registry [observed]\"],\"scope\":\"Generated by facts-gather from a fixed allowlist of project files. Observed facts are read from cited files; proposed analysis is never mixed in. Metrics are not part of this report; run the token report for them.\"},\"panels\":[{\"id\":\"workflow\",\"title\":\"Workflow\",\"blocks\":[{\"id\":\"workflow-facts\",\"type\":\"facts\",\"entries\":[{\"key\":\"Installed version\",\"value\":\"9.9.9 [stale: unpacked version, not updated by sync]\"},{\"key\":\"Generated\",\"value\":\"2026-11-23T00:00:00.000Z\"}]}]},{\"id\":\"pitches\",\"title\":\"Pitches\",\"blocks\":[{\"id\":\"pitch-table\",\"type\":\"comparison\",\"labelColumn\":\"Pitch\",\"columns\":[\"Hill\",\"Phase\",\"Appetite\",\"Last touched\"],\"rows\":[{\"id\":\"pitch-1\",\"label\":\"alpha\",\"cells\":[{\"text\":\"draft\"},{\"text\":\"shape\"},{\"text\":\"small-batch\"},{\"text\":\"2026-11-01\"}]},{\"id\":\"pitch-2\",\"label\":\"beta\",\"cells\":[{\"text\":\"uphill 50%\"},{\"text\":\"build\"},{\"text\":\"big-batch\"},{\"text\":\"2026-11-02\"}]}]}]},{\"id\":\"knowledge\",\"title\":\"Knowledge\",\"blocks\":[{\"id\":\"knowledge-facts\",\"type\":\"facts\",\"entries\":[{\"key\":\"Entries\",\"value\":\"2 [observed]\"},{\"key\":\"pattern\",\"value\":\"1\"},{\"key\":\"issue\",\"value\":\"1\"}]}]},{\"id\":\"skills\",\"title\":\"Skills\",\"blocks\":[{\"id\":\"skill-facts\",\"type\":\"facts\",\"entries\":[{\"key\":\"caveman\",\"value\":\"enabled, revision 2fd153c67988\"}]}]}],\"sources\":[{\"id\":\"src-1\",\"title\":\"VERSION\",\"path\":\"VERSION\"},{\"id\":\"src-2\",\"title\":\".project/status.md\",\"path\":\".project/status.md\"},{\"id\":\"src-3\",\"title\":\"graphify-out/graph.json\",\"path\":\"graphify-out/graph.json\"},{\"id\":\"src-4\",\"title\":\".project/skills/registry.json\",\"path\":\".project/skills/registry.json\"}]}";

const sha = (text: string): string => deps.crypto.sha256Hex(text);
const secretName = ["ghp", "_abcdefghijklmnopqrstuvwxyz0123456789"].join("");
const capture = () => {
  const out: string[] = [], err: string[] = [];
  const captured = { ...deps, io: { ...deps.io, stdout: { ...deps.io.stdout, write: (text: string) => { out.push(text); } }, stderr: { ...deps.io.stderr, write: (text: string) => { err.push(text); } } } };
  return { out, err, captured };
};
type Block = { id: string; type: string; diagramType?: string; spec?: { entities?: { id: string; label: string; attributes?: { name: string }[] }[]; relationships?: { id: string; from: string; to: string }[]; nodes?: { id: string; label: string; parent?: string }[] }; text?: string };
const blocksOf = (draft: unknown): Block[] => ((draft as { panels: { blocks: Block[] }[] }).panels).flatMap((panel) => panel.blocks);
const diagrams = (draft: unknown): Block[] => blocksOf(draft).filter((block) => block.type === "diagram");
const MARKER = { ".project/.bundle-sync.json": JSON.stringify({ sourceVersion: "9.9.9" }) };

function snapshot(tables: Record<string, { columns: string[]; fks?: { to: string; from: string[]; toColumns?: string[] }[]; unique?: string[] }>): string {
  const out: Record<string, unknown> = {};
  for (const [name, table] of Object.entries(tables)) {
    out[name] = {
      name, columns: Object.fromEntries(table.columns.map((column, index) => [column, { name: column, type: "text", primaryKey: index === 0, notNull: true }])),
      compositePrimaryKeys: {}, uniqueConstraints: Object.fromEntries((table.unique ?? []).map((column) => [`u-${column}`, { columns: [column] }])),
      foreignKeys: Object.fromEntries((table.fks ?? []).map((fk, index) => [`fk${index}`, { tableFrom: name, columnsFrom: fk.from, tableTo: fk.to, columnsTo: fk.toColumns ?? ["id"] }])),
    };
  }
  return JSON.stringify({ dialect: "postgresql", tables: out });
}
function projectFiles(tables: Parameters<typeof snapshot>[0], extra: Record<string, string> = {}): Record<string, string> {
  return {
    ...MARKER, "drizzle/meta/0000_snapshot.json": snapshot(tables), "drizzle/meta/_journal.json": JSON.stringify({ entries: [{}, {}, {}] }),
    "package.json": JSON.stringify({ dependencies: { react: "1", [secretName]: "1" }, devDependencies: { typescript: "5" }, scripts: { build: "x", "deploy@prod=1&$": "x", [secretName]: "y" } }),
    "bun.lock": "", ...extra,
  };
}
const HOSTILE_TABLES = {
  "user_a": { columns: ["id", "only_in_user_underscore"], unique: ["only_in_user_underscore"] },
  "user-a": { columns: ["id", "only_in_user_dash"] },
  [`long${"x".repeat(300)}1`]: { columns: ["id", "only_in_long_one"] },
  [`long${"x".repeat(300)}2`]: { columns: ["id", "only_in_long_two"] },
  "a|b": { columns: ["id", "pipe"] }, "x\ny": { columns: ["id", "newline"] }, "@erd=1&$": { columns: ["id", "@directive=1", "|lead"] },
  "| entity x": { columns: ["id"] }, [secretName]: { columns: ["id", "secret"] },
  constructor: { columns: ["id"] }, "__proto__": { columns: ["id"] }, toString: { columns: ["id"] },
  orders: { columns: ["id", "user_id"], fks: [{ to: "user_a", from: ["user_id"] }, { to: `long${"x".repeat(300)}2`, from: ["user_id"] }, { to: "constructor", from: ["user_id"] }, { to: "missing_table", from: ["user_id"] }] },
};
const HOSTILE_DIRS = { [`${secretName}/a.txt`]: "x", "constructor/a.txt": "x", "toString/b.txt": "x", "a=b&c/x.txt": "x", "@dir/y.txt": "x", "$d/z.txt": "x" };

test("--depth simple output is byte-identical to the golden draft captured before the change", () => {
  const root = project();
  try {
    assert.equal(JSON.stringify(api.explainer(api.gather(root), "proj", "2026-11-23T00:00:00.000Z")), GOLDEN_SIMPLE);
    const { out, captured } = capture();
    assert.equal(main(["--root", root, "--depth", "simple", "--explainer", "state.explainer.json", "--now", "2026-11-23T00:00:00.000Z"], captured), 0);
    const written = JSON.parse(readFileSync(join(root, ".project/reports/state.explainer.json")));
    assert.equal(JSON.stringify({ ...written, meta: { ...written.meta, title: "proj state" } }), GOLDEN_SIMPLE, "only the project name (the temp directory) differs");
    assert.match(out.join(""), /wrote/);
    assert.equal(diagrams(written).length, 0, "today's draft uses no native diagram");
    assert.equal(api.gather(root).project, undefined);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("--depth auto is project with a bundle-sync marker and simple without one; the flag validates", () => {
  const installed = project(MARKER), plain = project();
  try {
    assert.equal(api.resolveDepth(installed, "auto"), "project");
    assert.equal(api.resolveDepth(plain, "auto"), "simple");
    assert.equal(api.resolveDepth(plain, "project"), "project");
    assert.equal(api.resolveDepth(installed, "simple"), "simple");
    const { out, err, captured } = capture();
    assert.equal(main(["--root", installed, "--json"], captured), 0);
    assert.deepEqual(Object.keys(JSON.parse(out.join(""))).sort(), ["knowledge", "pitches", "project", "schemaVersion", "skills", "workflow"]);
    out.length = 0;
    assert.equal(main(["--root", plain, "--json"], captured), 0);
    assert.equal("project" in JSON.parse(out.join("")), false);
    assert.equal(main(["--root", plain, "--depth", "deep"], captured), 1);
    assert.match(err.join(""), /--depth takes simple, project or auto/);
  } finally { rmSync(installed, { recursive: true, force: true }); rmSync(plain, { recursive: true, force: true }); }
});

test("project depth adds exactly one erd and one tree diagram, a stack block, and stays within four diagrams", () => {
  const root = project(projectFiles({ users: { columns: ["id", "name"] }, posts: { columns: ["id", "author"], fks: [{ to: "users", from: ["author"] }] } }, { "src/a.ts": "x", "docs/b.md": "x" }));
  try {
    const simple = api.explainer(api.gather(root), "p", "t");
    const draft = api.explainer(api.gather(root, "project"), "p", "t");
    assert.ok(diagrams(simple).length <= 4);
    assert.equal(diagrams(simple).length, 0);
    assert.deepEqual(diagrams(draft).map((block) => block.diagramType).sort(), ["erd", "tree"]);
    assert.ok(diagrams(draft).length <= 4);
    const erd = diagrams(draft).find((block) => block.diagramType === "erd")!.spec!;
    assert.deepEqual(erd.entities!.map((entity) => entity.id), ["e1", "e2"]);
    assert.deepEqual(erd.relationships, [{ id: "r1", from: "e2", to: "e1", fromCardinality: "many", toCardinality: "one" }]);
    const stack = blocksOf(draft).find((block) => block.id === "stack-facts") as unknown as { entries: { key: string; value: string }[] };
    assert.ok(stack.entries.some((entry) => entry.key === "Package manager" && entry.value === "bun"));
    assert.ok(stack.entries.some((entry) => entry.key === "Frameworks" && /react/.test(entry.value)));
    const unconfigured = api.explainer(api.gather(project(MARKER), "project"), "p", "t");
    assert.equal(diagrams(unconfigured).filter((block) => block.diagramType === "erd").length, 0, "no schema means a note, not an empty diagram");
    assert.match(JSON.stringify(unconfigured), /no Drizzle snapshot/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("hostile names give generated, valid, unique ids and inert redacted labels; relations still resolve", () => {
  const root = project(projectFiles(HOSTILE_TABLES, HOSTILE_DIRS));
  try {
    const draft = api.explainer(api.gather(root, "project"), "p@x=1", "t");
    const ids: string[] = [];
    for (const block of diagrams(draft)) {
      const spec = block.spec!;
      for (const entity of spec.entities ?? []) ids.push(entity.id);
      for (const relation of spec.relationships ?? []) ids.push(relation.id);
      for (const node of spec.nodes ?? []) ids.push(node.id);
    }
    for (const block of blocksOf(draft)) ids.push(block.id);
    for (const id of ids) assert.match(id, /^[a-zA-Z][a-zA-Z0-9_-]*$/);
    assert.equal(new Set(ids).size, ids.length, "every id is unique in the document");
    const erd = diagrams(draft).find((block) => block.diagramType === "erd")!.spec!;
    for (const entity of erd.entities!) assert.match(entity.id, /^e\d+$/);
    for (const relation of erd.relationships!) assert.match(relation.id, /^r\d+$/);
    const tree = diagrams(draft).find((block) => block.diagramType === "tree")!.spec!;
    for (const node of tree.nodes!) assert.match(node.id, /^d\d+$/);
    assert.equal(tree.nodes!.filter((node) => node.parent === undefined).length, 1, "one root");
    assert.equal(erd.entities!.length, 12, "constructor, toString and __proto__ are ordinary tables");
    // Names that collide once cleaned still point at the right entities.
    const byColumn = (column: string) => erd.entities!.find((entity) => entity.attributes?.some((attribute) => attribute.name === column))!.id;
    const orders = byColumn("user-id");
    const targets = erd.relationships!.filter((relation) => relation.from === orders).map((relation) => relation.to).sort();
    const longTwo = byColumn("only-in-long-two"), userA = byColumn("only-in-user-underscore");
    const constructor = erd.entities!.find((entity) => entity.label === "constructor")!.id;
    assert.deepEqual(targets, [userA, longTwo, constructor].sort());
    assert.notEqual(byColumn("only-in-user-dash"), userA);
    assert.equal(erd.relationships!.length, 3, "a relationship to a table that is not in the schema is dropped");
    const panels = JSON.stringify((draft as { panels: unknown[] }).panels.filter((panel) => ["database", "structure", "stack"].includes((panel as { id: string }).id)));
    assert.doesNotMatch(panels, /ghp_|abcdefghijklmnopqrstuvwxyz0123456789/, "credential-shaped names are redacted");
    assert.match(panels, /\(redacted\)/);
    assert.doesNotMatch(panels, /[@=&$]/, "directive characters are neutralised");
    assert.doesNotMatch(panels, /"(?:label|name|text)":"\|/, "no label starts with a directive pipe");
    assert.doesNotMatch(panels, /[<>`\\]/);
    for (const entity of erd.entities!) assert.ok(entity.label.length > 0 && entity.label.length <= 28);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("the ERD keeps the 30 most-connected entities, says at least, and counts degree through a Map", () => {
  const tables: Parameters<typeof snapshot>[0] = {};
  for (let index = 0; index < 35; index++) tables[`t${index}`] = { columns: ["id", "ref"], fks: index >= 10 ? [{ to: "t0", from: ["ref"] }] : [] };
  tables.constructor = { columns: ["id"] };
  const root = project(projectFiles(tables));
  try {
    const draft = api.explainer(api.gather(root, "project"), "p", "t");
    const erd = diagrams(draft).find((block) => block.diagramType === "erd")!.spec!;
    assert.equal(erd.entities!.length, 30);
    const labels = erd.entities!.map((entity) => entity.label);
    assert.ok(labels.includes("t0") && labels.includes("t34"), "the hub and a connected table are kept");
    assert.ok(!labels.includes("t5") && !labels.includes("constructor"), "unconnected tables are dropped first");
    assert.equal(erd.relationships!.length, 5, "the hub is drawn with at most 5 relationship ends");
    assert.match(JSON.stringify(draft), /20 more relationship\(s\) are not drawn/);
    for (const relation of erd.relationships!) assert.ok(erd.entities!.some((entity) => entity.id === relation.from) && erd.entities!.some((entity) => entity.id === relation.to));
    assert.match(JSON.stringify(draft), /Showing the 30 most-connected of at least 36 tables/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("writeReport writes when absent and replaces only a file the delivery receipt vouches for", () => {
  const root = project();
  const dir = join(root, ".project/reports");
  const receipt = (hash: string) => JSON.stringify({ schemaVersion: 1, specification: { sha256: hash } });
  try {
    assert.equal(api.writeReport(root, "state.explainer.json", "one\n"), ".project/reports/state.explainer.json");
    // Without the tool's own record and without a receipt, an existing draft is never replaced.
    rmSync(join(dir, "state.explainer.json.written-sha256"));
    assert.throws(() => api.writeReport(root, "state.explainer.json", "two\n"), /report-not-owned: state\.explainer\.json .*delete \.project\/reports\/state\.explainer\.json/, "no receipt");
    writeFileSync(join(dir, "state.delivery.json"), receipt(sha("edited\n")));
    assert.throws(() => api.writeReport(root, "state.explainer.json", "two\n"), /report-not-owned/, "receipt hash differs from the file");
    writeFileSync(join(dir, "state.delivery.json"), receipt(sha("one\n")));
    api.writeReport(root, "state.explainer.json", "two\n");
    assert.equal(readFileSync(join(dir, "state.explainer.json")), "two\n");
    rmSync(join(dir, "state.explainer.json.written-sha256"));
    for (const bad of ["{ not json", receipt("NOTHEX"), JSON.stringify({ specification: {} }), `${receipt(sha("two\n"))}${" ".repeat(70 * 1024)}`]) {
      writeFileSync(join(dir, "state.delivery.json"), bad);
      assert.throws(() => api.writeReport(root, "state.explainer.json", "three\n"), /report-not-owned/);
    }
    rmSync(join(dir, "state.delivery.json"));
    writeFileSync(join(root, "real-receipt.json"), receipt(sha("two\n")));
    symlinkSync(join(root, "real-receipt.json"), join(dir, "state.delivery.json"));
    assert.throws(() => api.writeReport(root, "state.explainer.json", "three\n"), /report-not-owned/, "a symlinked receipt is refused");
    assert.equal(readFileSync(join(dir, "state.explainer.json")), "two\n");
    assert.deepEqual(readdirSync(dir).sort(), ["state.delivery.json", "state.explainer.json"], "no temporary file left");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("writeReport regenerates its own undelivered draft, and refuses one edited since or created after the absent check", () => {
  const root = project();
  const dir = join(root, ".project/reports");
  try {
    api.writeReport(root, "state.explainer.json", "one\n");
    api.writeReport(root, "state.explainer.json", "two\n");
    assert.equal(readFileSync(join(dir, "state.explainer.json")), "two\n", "its own draft (validate failed, no receipt) is replaced");
    writeFileSync(join(dir, "state.explainer.json"), "two\nhuman\n");
    assert.throws(() => api.writeReport(root, "state.explainer.json", "three\n"), /report-not-owned/);
    assert.equal(readFileSync(join(dir, "state.explainer.json")), "two\nhuman\n");
  } finally { rmSync(root, { recursive: true, force: true }); }
  // A file that appears between the absent check and publication is not overwritten (hard-link publish).
  const root2 = project();
  const dir2 = join(root2, ".project/reports");
  const target = join(dir2, "state.explainer.json");
  let injected = false;
  const racing = createFactsGather({ ...deps, fs: { ...deps.fs, writeFileSync: (file: string, data: string, options?: unknown) => {
    if (!injected && String(file).includes(".tmp-") && !String(file).includes("written")) { injected = true; mkdirSync(dir2, { recursive: true }); deps.fs.writeFileSync(target, "USER DATA\n"); }
    return (deps.fs.writeFileSync as (f: string, d: string, o?: unknown) => void)(file, data, options);
  } } } as typeof deps);
  try {
    assert.throws(() => racing.writeReport(root2, "state.explainer.json", "report\n"), /report-not-owned/);
    assert.equal(injected, true);
    assert.equal(readFileSync(target), "USER DATA\n", "the file that appeared is kept");
  } finally { rmSync(root2, { recursive: true, force: true }); }
  // An edit between the ownership check and the replace is refused (identity and bytes re-checked).
  const root3 = project();
  const dir3 = join(root3, ".project/reports");
  const target3 = join(dir3, "state.explainer.json");
  let edited = false;
  const editing = createFactsGather({ ...deps, fs: { ...deps.fs, writeFileSync: (file: string, data: string, options?: unknown) => {
    if (edited === false && String(file).includes(".tmp-") && !String(file).includes("written") && existsSync(target3)) { edited = true; deps.fs.writeFileSync(target3, "edited after the check\n"); }
    return (deps.fs.writeFileSync as (f: string, d: string, o?: unknown) => void)(file, data, options);
  } } } as typeof deps);
  try {
    editing.writeReport(root3, "state.explainer.json", "one\n");
    assert.throws(() => editing.writeReport(root3, "state.explainer.json", "two\n"), /report-not-owned/);
    assert.equal(edited, true);
    assert.equal(readFileSync(target3), "edited after the check\n");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("end to end: deliver, edit the draft, re-run, and the edit survives", () => {
  const root = project(MARKER);
  const draftPath = join(root, ".project/reports/state.explainer.json");
  const { err, captured } = capture();
  const run = () => main(["--root", root, "--explainer", "state.explainer.json", "--now", "2030-01-02T03:04:05.000Z"], captured);
  try {
    assert.equal(run(), 0);
    const first = readFileSync(draftPath);
    // Only the receipt can vouch now: drop the tool's own record.
    rmSync(join(root, ".project/reports/state.explainer.json.written-sha256"));
    assert.equal(run(), 1, "an existing draft without a receipt or the tool's record is not replaced");
    assert.match(err.join(""), /report-not-owned: state\.explainer\.json/);
    writeFileSync(join(root, ".project/reports/state.delivery.json"), JSON.stringify({ schemaVersion: 1, specification: { sha256: sha(first) }, artifact: { sha256: "0".repeat(64) } }));
    assert.equal(run(), 0, "an untouched, delivered draft is regenerated");
    rmSync(join(root, ".project/reports/state.explainer.json.written-sha256"));
    writeFileSync(draftPath, `${first}{"edited":true}\n`);
    err.length = 0;
    assert.equal(run(), 1);
    assert.match(err.join(""), /report-not-owned/);
    assert.equal(readFileSync(draftPath), `${first}{"edited":true}\n`, "the human edit survives");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("facts-gather itself starts no child process", () => {
  const source = readFileSync(join(import.meta.dirname, "facts-gather.mts"));
  assert.doesNotMatch(source, /child_process|\bspawn|\bexecSync|\bexecFile/);
});

// Runs only where Archify is installed (instance data, absent on a fresh clone): drafts must validate.
const archify = join(import.meta.dirname, "../../.project/skills/packages/tt-a1i/archify/archify/bin/archify.mjs");
const validate = (file: string) => spawnSync("node", [archify, "validate", "explainer", file, "--json"], { encoding: "utf8", env: { ...process.env, ARCHIFY_UPDATE_CHECK_DISABLED: "1" } });
if (!existsSync(archify)) console.log("skip: Archify not installed at .project/skills/packages/tt-a1i/archify/archify/bin/archify.mjs; the real validate cases did not run");
test("the simple draft passes `archify validate` (skipped when Archify is not installed)", { skip: !existsSync(archify) }, () => {
  const root = project({ ".project/status.md": STATUS_MD.replace("alpha", "<b>al`pha</b> [x](javascript:y)") });
  try {
    api.writeReport(root, "state.explainer.json", `${JSON.stringify(api.explainer(api.gather(root), "p", "2026-11-23T00:00:00.000Z"))}\n`);
    const result = validate(join(root, ".project/reports/state.explainer.json"));
    assert.equal(result.status, 0, String(result.stdout).slice(0, 800));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test("the project-depth draft with hostile names passes `archify validate` with no errors (skipped when Archify is not installed)", { skip: !existsSync(archify) }, () => {
  const root = project(projectFiles(HOSTILE_TABLES, HOSTILE_DIRS));
  try {
    api.writeReport(root, "state.explainer.json", `${JSON.stringify(api.explainer(api.gather(root, "project"), "p@x=1&$", "2026-11-23T00:00:00.000Z"))}\n`);
    const result = validate(join(root, ".project/reports/state.explainer.json"));
    assert.equal(result.status, 0, String(result.stdout).slice(0, 1500));
    const report = JSON.parse(String(result.stdout)) as { ok: boolean; diagnostics?: { severity: string }[] };
    assert.equal(report.ok, true);
    assert.equal((report.diagnostics ?? []).filter((entry) => entry.severity === "error").length, 0, "errors: 0");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test("a capped 30-entity ERD passes `archify validate` (skipped when Archify is not installed)", { skip: !existsSync(archify) }, () => {
  const tables: Parameters<typeof snapshot>[0] = {};
  for (let index = 0; index < 35; index++) tables[`table_number_${index}`] = { columns: ["id", "ref", "created_at", "name"], fks: index >= 10 ? [{ to: "table_number_0", from: ["ref"] }] : [] };
  const root = project(projectFiles(tables));
  try {
    api.writeReport(root, "state.explainer.json", `${JSON.stringify(api.explainer(api.gather(root, "project"), "p", "2026-11-23T00:00:00.000Z"))}\n`);
    const result = validate(join(root, ".project/reports/state.explainer.json"));
    assert.equal(result.status, 0, String(result.stdout).slice(0, 1500));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// Audit cycle 1 (M1): schemas that made Archify refuse the whole page.
const AWKWARD_TABLES: Parameters<typeof snapshot>[0] = {
  users: { columns: ["id", "long_column_name_abcdefghijklmnopqrstuvwxyz", "a_b", "a-b", "a.b", ...Array.from({ length: 14 }, (_, index) => `c${index}`), "c_last"] },
  categories: { columns: ["id", "parent_id"], fks: [{ to: "categories", from: ["parent_id"] }] },
  posts: { columns: ["id", "author", "editor", "tail"], fks: [
    { to: "users", from: ["author"], toColumns: ["long_column_name_abcdefghijklmnopqrstuvwxyz"] },
    { to: "users", from: ["editor"], toColumns: ["c_last"] },
    { to: "users", from: ["tail"], toColumns: ["a-b"] },
  ] },
};
test("ERD: self-references are not drawn, attribute names are unique, and every reference names an emitted attribute", () => {
  const root = project(projectFiles(AWKWARD_TABLES));
  try {
    const draft = api.explainer(api.gather(root, "project"), "p", "2026-11-23T00:00:00.000Z") as { panels: { id: string; blocks: { spec?: { entities: { id: string; attributes?: { name: string; references?: string }[] }[]; relationships: { from: string; to: string }[] }; text?: string }[] }[] };
    const database = draft.panels.find((panel) => panel.id === "database")!;
    const spec = database.blocks[0].spec!;
    assert.equal(spec.relationships.filter((link) => link.from === link.to).length, 0, "no self relationship");
    const names = new Map(spec.entities.map((entity) => [entity.id, new Set((entity.attributes ?? []).map((attribute) => attribute.name))]));
    for (const entity of spec.entities) {
      const list = (entity.attributes ?? []).map((attribute) => attribute.name);
      assert.equal(new Set(list).size, list.length, `unique attribute names in ${entity.id}: ${list.join(",")}`);
      for (const attribute of entity.attributes ?? []) {
        if (!attribute.references) continue;
        const [target, column] = attribute.references.split(".");
        assert.ok(names.get(target)?.has(column), `reference ${attribute.references} resolves`);
      }
    }
    const note = database.blocks[1].text ?? "";
    assert.match(note, /1 self-reference\(s\) are not drawn/);
    assert.match(note, /foreign-key column\(s\) point at a table or column not shown/, "the reference to the 20th column is counted");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test("ERD with self-references, colliding and truncated columns passes `archify validate` (skipped when Archify is not installed)", { skip: !existsSync(archify) }, () => {
  const root = project(projectFiles(AWKWARD_TABLES));
  try {
    api.writeReport(root, "state.explainer.json", `${JSON.stringify(api.explainer(api.gather(root, "project"), "p", "2026-11-23T00:00:00.000Z"))}\n`);
    const result = validate(join(root, ".project/reports/state.explainer.json"));
    assert.equal(result.status, 0, String(result.stdout).slice(0, 1500));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// Audit cycle 2: identity halves of the ownership checks, the hard-link fallback and the marker.
test("writeReport refuses a same-bytes replacement inode before the rename, and a descriptor that is not the file lstat saw", () => {
  const root = project();
  const dir = join(root, ".project/reports"), target = join(dir, "state.explainer.json");
  let swapped = false;
  const swapping = createFactsGather({ ...deps, fs: { ...deps.fs, writeFileSync: (file: string, data: string, options?: unknown) => {
    if (!swapped && String(file).includes(".tmp-") && !String(file).includes("written") && existsSync(target)) {
      swapped = true;
      deps.fs.writeFileSync(join(dir, "copy"), readFileSync(target));
      deps.fs.renameSync(join(dir, "copy"), target);
    }
    return (deps.fs.writeFileSync as (f: string, d: string, o?: unknown) => void)(file, data, options);
  } } } as typeof deps);
  try {
    swapping.writeReport(root, "state.explainer.json", "one\n");
    assert.throws(() => swapping.writeReport(root, "state.explainer.json", "two\n"), /report-not-owned/, "same bytes, different inode");
    assert.equal(swapped, true);
    assert.equal(readFileSync(target), "one\n");
  } finally { rmSync(root, { recursive: true, force: true }); }
  const root2 = project();
  const dir2 = join(root2, ".project/reports"), target2 = join(dir2, "state.explainer.json");
  const decoy = join(root2, "decoy");
  const misdirected = createFactsGather({ ...deps, fs: { ...deps.fs, openSync: (file: string, ...rest: unknown[]) =>
    (deps.fs.openSync as (f: string, ...r: unknown[]) => number)(String(file) === target2 ? decoy : file, ...rest) } } as typeof deps);
  try {
    api.writeReport(root2, "state.explainer.json", "one\n");
    deps.fs.writeFileSync(decoy, "one\n");
    assert.throws(() => misdirected.writeReport(root2, "state.explainer.json", "two\n"), /report-not-owned/, "the opened descriptor is a different file");
    assert.equal(readFileSync(target2), "one\n");
  } finally { rmSync(root2, { recursive: true, force: true }); }
});

test("writeReport falls back to rename where hard links are unsupported, and leaves a foreign marker path alone", () => {
  const root = project();
  const dir = join(root, ".project/reports");
  const noLinks = createFactsGather({ ...deps, fs: { ...deps.fs, linkSync: () => { const error = new Error("not supported") as NodeJS.ErrnoException; error.code = "EPERM"; throw error; } } } as typeof deps);
  try {
    assert.equal(noLinks.writeReport(root, "state.explainer.json", "one\n"), ".project/reports/state.explainer.json");
    assert.equal(readFileSync(join(dir, "state.explainer.json")), "one\n");
    writeFileSync(join(dir, "state.explainer.json.written-sha256"), "user notes, not a hash\n");
    rmSync(join(dir, "state.explainer.json"));
    api.writeReport(root, "state.explainer.json", "two\n");
    assert.equal(readFileSync(join(dir, "state.explainer.json.written-sha256")), "user notes, not a hash\n", "a foreign file at the marker path is kept");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("end to end with the real reset: deliver, edit the draft, bundle-sync reset, re-run, and the edit survives both", async () => {
  const root = project(MARKER);
  const reports = join(root, ".project/reports"), draftPath = join(reports, "state.explainer.json");
  const { err, captured } = capture();
  const run = () => main(["--root", root, "--explainer", "state.explainer.json", "--now", "2030-01-02T03:04:05.000Z"], captured);
  const { makeSync } = await import("./bundle-sync.mts");
  try {
    assert.equal(run(), 0);
    writeFileSync(join(reports, "state.html"), "<html>page</html>");
    writeFileSync(join(reports, "state.delivery.json"), JSON.stringify({ specification: { sha256: sha(readFileSync(draftPath)) }, artifact: { sha256: sha("<html>page</html>") } }));
    writeFileSync(draftPath, `${readFileSync(draftPath)}{"edited":true}\n`);
    const edited = readFileSync(draftPath);
    const steps = await makeSync(["--apply"], { ...deps, proc: { ...deps.proc, cwd: () => root } } as typeof deps).resetStateReports(true);
    assert.ok(steps.some((step: { message: string }) => /Kept \.project\/reports\/state\.explainer\.json: report-not-owned/.test(step.message)));
    assert.equal(existsSync(join(reports, "state.html")), false, "the matching page is removed");
    assert.equal(existsSync(join(reports, "state.delivery.json")), true, "the receipt stays while a target is kept");
    assert.equal(readFileSync(draftPath), edited);
    assert.equal(run(), 1);
    assert.match(err.join(""), /report-not-owned: state\.explainer\.json/);
    assert.equal(readFileSync(draftPath), edited, "the human edit survives the reset and the re-run");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("an unreadable file at the marker path is left alone (only a missing marker counts as absent)", () => {
  const root = project();
  const dir = join(root, ".project/reports"), marker = join(dir, "state.explainer.json.written-sha256");
  const denied = createFactsGather({ ...deps, fs: { ...deps.fs, readFileSync: (file: string, ...rest: unknown[]) => {
    if (String(file) === marker) { const error = new Error("denied") as NodeJS.ErrnoException; error.code = "EACCES"; throw error; }
    return (deps.fs.readFileSync as (f: string, ...r: unknown[]) => string)(file, ...rest);
  } } } as typeof deps);
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(marker, "USER NOTES\n");
    assert.equal(denied.writeReport(root, "state.explainer.json", "one\n"), ".project/reports/state.explainer.json");
    assert.equal(readFileSync(marker), "USER NOTES\n");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("same-named tables in two schemas: a foreign key resolves by its schema, and an ambiguous name is counted, not guessed", () => {
  const table = (schema: string, name: string, foreignKeys: Record<string, unknown> = {}) => ({ name, schema, columns: { id: { name: "id", type: "uuid", primaryKey: true, notNull: true }, u: { name: "u", type: "uuid", notNull: true } }, foreignKeys });
  const fk = (schemaTo?: string) => ({ a: { tableFrom: "posts", columnsFrom: ["u"], tableTo: "users", columnsTo: ["id"], ...(schemaTo ? { schemaTo } : {}) } });
  const build = (schemaTo?: string) => project({ ...MARKER, "drizzle/meta/_journal.json": JSON.stringify({ entries: [{}] }),
    "drizzle/meta/0000_snapshot.json": JSON.stringify({ dialect: "postgresql", tables: { "auth.users": table("auth", "users"), "public.users": table("public", "users"), "public.posts": table("public", "posts", fk(schemaTo)) } }) });
  const named = build("public");
  try {
    const erd = diagrams(api.explainer(api.gather(named, "project"), "p", "t")).find((block) => block.diagramType === "erd")!.spec!;
    assert.deepEqual(erd.entities!.map((entity) => entity.label), ["auth.users", "public.users", "posts"], "a shared name is shown with its schema");
    assert.deepEqual(erd.relationships!.map((link) => [link.from, link.to]), [["e3", "e2"]], "the key names public, so it points at public.users");
  } finally { rmSync(named, { recursive: true, force: true }); }
  const ambiguous = build();
  try {
    const erd = diagrams(api.explainer(api.gather(ambiguous, "project"), "p", "t")).find((block) => block.diagramType === "erd")!.spec!;
    assert.deepEqual(erd.relationships ?? [], [], "two tables could be meant, so no relationship is drawn");
  } finally { rmSync(ambiguous, { recursive: true, force: true }); }
});
