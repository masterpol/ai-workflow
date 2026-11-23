import assert from "node:assert/strict";
import { test } from "node:test";
import { createTestDeps, spawnSync, tempFixture } from "./runtime/test-helpers.mts";
import { createFactsGather, main, STATUSES } from "./facts-gather.mts";
import type { Fact } from "./facts-gather.mts";

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

test("writeReport replaces an existing draft whole and leaves no temporary file", () => {
  const root = project();
  try {
    api.writeReport(root, "state.explainer.json", `${"old ".repeat(200)}\n`);
    api.writeReport(root, "state.explainer.json", "new\n");
    assert.equal(readFileSync(join(root, ".project/reports/state.explainer.json")), "new\n");
    assert.deepEqual(readdirSync(join(root, ".project/reports")), ["state.explainer.json"]);
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

// Runs only where Archify is installed (instance data, absent on a fresh clone): the draft must validate.
const archify = join(import.meta.dirname, "../../.project/skills/packages/tt-a1i/archify/archify/bin/archify.mjs");
test("the generated draft passes `archify validate` (skipped when Archify is not installed)", { skip: !existsSync(archify) }, () => {
  const root = project({ ".project/status.md": STATUS_MD.replace("alpha", "<b>al`pha</b> [x](javascript:y)") });
  try {
    api.writeReport(root, "state.explainer.json", `${JSON.stringify(api.explainer(api.gather(root), "p", "2026-11-23T00:00:00.000Z"))}\n`);
    const result = spawnSync("node", [archify, "validate", "explainer", join(root, ".project/reports/state.explainer.json"), "--json"], { encoding: "utf8", env: { ...process.env, ARCHIFY_UPDATE_CHECK_DISABLED: "1" } });
    assert.equal(result.status, 0, String(result.stdout).slice(0, 800));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
