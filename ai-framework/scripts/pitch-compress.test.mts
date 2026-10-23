import { NODE_FLAGS } from "./runtime/entry.mts";
const RUNTIME_FLAGS = process.versions.bun ? [] : NODE_FLAGS;
import assert from "node:assert/strict";
import { createTestDeps, spawnSync } from "./runtime/test-helpers.mts";
const testDeps = createTestDeps();
const fs = testDeps.fs;
const os = testDeps.os;
const path = testDeps.path;
import test from "node:test";

import { createNodeDeps } from "./runtime/node.mts";
import { buildGraph, overlayKnowledge, renderIndex } from "./graphify.mts";
import * as compressModule from "./pitch-compress.mts";

const { inventory, buildLedger, requiredSections, commitLedger, writeDoneWork, slugifyHeading, extractSection, createPitchCompress } = compressModule;

const __dirname = import.meta.dirname;

function write(root, name, value) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}
function read(root, name) { return fs.readFileSync(path.join(root, name), "utf8"); }
function exists(root, name) { return fs.existsSync(path.join(root, name)); }

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pitch-compress-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const dir of ["decisions", "patterns", "entities", "issues", "templates"]) fs.mkdirSync(path.join(root, `.project/knowledge/${dir}`), { recursive: true });
  // Ledger validation reads real generated artifacts, including through its child process.
  // Build only this fixture's knowledge overlay; no Graphify installation or external command is needed.
  const deps = createNodeDeps();
  const { graph, problems } = buildGraph(root, deps);
  assert.deepEqual(problems, []);
  write(root, "graphify-out/graph.json", JSON.stringify(overlayKnowledge({ nodes: [], links: [] }, graph)) + "\n");
  write(root, ".project/knowledge/index.md", renderIndex(graph, root, deps));
  return root;
}

// A shipped pitch with a unique decision, a negative constraint (no-go), an unresolved
// followup, and a stale cross-reference — the exact fixture shape the parent pitch names.
function seedShippedPitch(root, slug, options = {}) {
  const dir = `.project/pitches/${slug}`;
  write(root, `${dir}/pitch.md`, [
    "# Pitch: Fixture",
    "",
    "## No-gos",
    "",
    "- Never invent savings numbers.",
    "",
    "## Rabbit holes",
    "",
    "- Resolved here: nothing exotic.",
    "",
  ].join("\n"));
  write(root, `${dir}/SHIPPED.md`, [
    "# Shipped: Fixture",
    "",
    "**Shipped:** 2026-09-25",
    "",
    "## Scope reconciliation",
    "",
    "Done as pitched.",
    "",
    "## No-gos honored",
    "",
    "Confirmed.",
    "",
    "## A unique decision",
    "",
    `We chose X over Y because Z. See ${options.staleLink || "evidence/moved-file.md"} for detail.`,
    "",
  ].join("\n"));
  write(root, `${dir}/deviations.md`, ["# Build deviations", "", "## D1 — 2026-09-25", "", "- A real deviation worth remembering.", ""].join("\n"));
  write(root, `${dir}/log.md`, ["# Build incidents", "", "## An incident — 2026-09-25", "", "- Something happened.", ""].join("\n"));
  if (options.audit) write(root, `${dir}/audit-cycle-1.md`, "# Audit cycle 1\n\nZero must-fix.\n");
}

test("inventory classifies a shipped pitch as eligible and reports specific reasons for everything else", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "shipped-one");
  write(root, ".project/pitches/active-one/pitch.md", "# Pitch\n");
  write(root, ".project/pitches/active-one/hill.md", "| Scope | Position |\n|---|---|\n| S1 | uphill 40% |\n");
  write(root, ".project/pitches/no-hill-at-all/pitch.md", "# Pitch\n");
  write(root, ".project/pitches/_templates/pitch.md", "should be excluded");
  write(root, ".project/pitches/_archive/pitch.md", "should be excluded");
  write(root, ".project/pitches/_parked/pitch.md", "should be excluded");
  const result = inventory(root);
  assert.deepEqual(result.map((entry) => entry.slug), ["active-one", "no-hill-at-all", "shipped-one"]);
  assert.deepEqual(result.find((entry) => entry.slug === "shipped-one"), { slug: "shipped-one", eligible: true, reason: "shipped" });
  const active = result.find((entry) => entry.slug === "active-one");
  assert.equal(active.eligible, false);
  assert.match(active.reason, /active: hill shows 1 scope row\(s\) not done/);
  const noHill = result.find((entry) => entry.slug === "no-hill-at-all");
  assert.equal(noHill.eligible, false);
  assert.equal(noHill.reason, "no SHIPPED.md");
});

test("inventory reports an already-compacted pitch (directory gone, recorded in done-work.md) distinctly", (t) => {
  const root = fixture(t);
  write(root, ".project/done-work.md", "# Done Work\n\n## gone-pitch — shipped 2026-09-01\n\nSummary.\n");
  const result = inventory(root);
  assert.deepEqual(result, [{ slug: "gone-pitch", eligible: false, reason: "already compacted" }]);
});

test("an emptied pitch directory left behind by remove is compacted when done-work.md records it, and only then", (t) => {
  const root = fixture(t);
  write(root, ".project/done-work.md", "# Done Work\n\n## emptied — shipped 2026-09-01\n\nSummary.\n");
  fs.mkdirSync(path.join(root, ".project/pitches/emptied"), { recursive: true });
  fs.mkdirSync(path.join(root, ".project/pitches/never-recorded"), { recursive: true });
  write(root, ".project/pitches/restored/pitch.md", "# Pitch: Restored\n");
  write(root, ".project/done-work.md", `${read(root, ".project/done-work.md")}\n## restored — shipped 2026-09-02\n\nSummary.\n`);
  const bySlug = Object.fromEntries(inventory(root).map((entry) => [entry.slug, entry]));
  assert.equal(bySlug.emptied.reason, "already compacted");
  assert.notEqual(bySlug["never-recorded"].reason, "already compacted", "an empty directory with no record is unknown, not compacted");
  assert.notEqual(bySlug.restored.reason, "already compacted", "a pitch that was restored (files present again) is classified normally");
});

test("a hill chart where every scope reads done is not reported as active", (t) => {
  const root = fixture(t);
  write(root, ".project/pitches/finished-hill/pitch.md", "# Pitch\n");
  write(root, ".project/pitches/finished-hill/hill.md", "| Scope | Position |\n|---|---|\n| S1 | done |\n| S2 | done |\n");
  const entry = inventory(root).find((item) => item.slug === "finished-hill");
  assert.equal(entry.reason, "no SHIPPED.md", "no SHIPPED.md still blocks eligibility even with an all-done hill");
});

test("ledger enumerates every required section: SHIPPED.md headings, non-empty no-gos/rabbit-holes, audit cycles, non-empty deviations/log sections", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "full-fixture", { audit: true });
  const { required } = buildLedger(root, "full-fixture");
  assert.deepEqual(required, [
    "SHIPPED.md#scope-reconciliation",
    "SHIPPED.md#no-gos-honored",
    "SHIPPED.md#a-unique-decision",
    "pitch.md#no-gos",
    "pitch.md#rabbit-holes",
    "audit-cycle-1.md",
    "deviations.md#d1-2026-09-25",
    "log.md#an-incident-2026-09-25",
  ]);
});

test("an empty pitch.md no-gos/rabbit-holes section is not a required entry", (t) => {
  const root = fixture(t);
  write(root, ".project/pitches/empty-sections/SHIPPED.md", "# Shipped\n\n**Shipped:** 2026-09-25\n\n## Summary\n\nDone.\n");
  write(root, ".project/pitches/empty-sections/pitch.md", "# Pitch\n\n## No-gos\n\n## Rabbit holes\n\n");
  const { required } = buildLedger(root, "empty-sections");
  assert.deepEqual(required, ["SHIPPED.md#summary"]);
});

test("ledger throws for a pitch with no SHIPPED.md rather than silently returning nothing", (t) => {
  const root = fixture(t);
  write(root, ".project/pitches/not-shipped/pitch.md", "# Pitch\n");
  assert.throws(() => buildLedger(root, "not-shipped"), /Not eligible.*no SHIPPED\.md/);
});

test("commit-ledger accepts a complete mapping, computes coverage, and is idempotent to rerun with --apply", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "commit-me");
  write(root, "notes/dest.md", "extracted content");
  const required = buildLedger(root, "commit-me").required;
  const mapping = { sections: required.map((source) => ({ source, status: "extracted", destination: "notes/dest.md" })) };
  const preview = commitLedger(root, "commit-me", mapping);
  assert.equal(preview.coverage, 1);
  assert.equal(preview.applied, false);
  assert.equal(exists(root, ".project/compaction/ledgers/commit-me.json"), false, "preview writes nothing");
  const applied = commitLedger(root, "commit-me", mapping, { apply: true });
  assert.equal(applied.applied, true);
  const record = JSON.parse(read(root, ".project/compaction/ledgers/commit-me.json"));
  assert.equal(record.coverage, 1);
  assert.equal(record.sections.length, required.length);
});

test("rejects ledger writes through symlinked compaction folders", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "linked");
  write(root, "notes/dest.md", "extracted");
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const mapping = { sections: buildLedger(root, "linked").required.map((source) => ({ source, status: "extracted", destination: "notes/dest.md" })) };
  for (const folder of [".project/compaction", ".project/compaction/ledgers"]) {
    fs.mkdirSync(path.dirname(path.join(root, folder)), { recursive: true });
    fs.symlinkSync(outside, path.join(root, folder));
    assert.throws(() => commitLedger(root, "linked", mapping, { apply: true }), /Symlink/);
    assert.deepEqual(fs.readdirSync(outside), []);
    fs.unlinkSync(path.join(root, folder));
  }
});

test("commit-ledger rejects a mapping missing a required section", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "missing-one");
  write(root, "notes/dest.md", "x");
  const required = buildLedger(root, "missing-one").required;
  const mapping = { sections: required.slice(1).map((source) => ({ source, status: "extracted", destination: "notes/dest.md" })) };
  assert.throws(() => commitLedger(root, "missing-one", mapping), new RegExp(`missing required section\\(s\\).*${required[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
});

test("commit-ledger rejects an extracted entry whose destination does not exist", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "bad-dest");
  const required = buildLedger(root, "bad-dest").required;
  const mapping = { sections: required.map((source) => ({ source, status: "extracted", destination: "notes/does-not-exist.md" })) };
  assert.throws(() => commitLedger(root, "bad-dest", mapping), /Destination does not exist/);
});

test("commit-ledger rejects an unknown source not in the required set, and a duplicate source", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "unknown-source");
  write(root, "notes/dest.md", "x");
  const required = buildLedger(root, "unknown-source").required;
  const goodMapping = required.map((source) => ({ source, status: "extracted", destination: "notes/dest.md" }));
  assert.throws(() => commitLedger(root, "unknown-source", { sections: [...goodMapping, { source: "SHIPPED.md#not-real", status: "extracted", destination: "notes/dest.md" }] }), /unknown required section/);
  assert.throws(() => commitLedger(root, "unknown-source", { sections: [...goodMapping, goodMapping[0]] }), /Duplicate ledger entry/);
});

test("commit-ledger accepts a gap only with a reason, and reflects it in coverage and the gaps list", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "with-gap");
  write(root, "notes/dest.md", "x");
  const required = buildLedger(root, "with-gap").required;
  const [first, ...rest] = required;
  assert.throws(() => commitLedger(root, "with-gap", { sections: [{ source: first, status: "gap" }, ...rest.map((source) => ({ source, status: "extracted", destination: "notes/dest.md" }))] }), /Gap missing reason/);
  const mapping = { sections: [{ source: first, status: "gap", reason: "not worth preserving" }, ...rest.map((source) => ({ source, status: "extracted", destination: "notes/dest.md" }))] };
  assert.throws(() => commitLedger(root, "with-gap", mapping), /Unaccepted gap\(s\).*--accept-gap/, "a gap its own author declared is not an accepted gap");
  assert.throws(() => commitLedger(root, "with-gap", mapping, { acceptGaps: { "SHIPPED.md#nope": "x" } }), /not a gap in this ledger/);
  assert.throws(() => commitLedger(root, "with-gap", mapping, { acceptGaps: { [first]: "  " } }), /nonempty reason/);
  const result = commitLedger(root, "with-gap", mapping, { acceptGaps: { [first]: "reviewed: superseded by a later pitch" }, apply: true });
  assert.ok(result.coverage < 1);
  assert.deepEqual(result.gaps, [{ source: first, reason: "not worth preserving" }]);
  assert.deepEqual(result.acceptedGaps, [{ source: first, reason: "not worth preserving", acceptedReason: "reviewed: superseded by a later pitch" }]);
  assert.deepEqual(JSON.parse(read(root, ".project/compaction/ledgers/with-gap.json")).acceptedGaps, result.acceptedGaps, "the acceptance is recorded in the committed ledger, auditable at the human gate");
});

test("CLI --accept-gap is repeatable, validates its SECTION=REASON shape, and lets a reviewed gap through", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "cli-gap");
  write(root, "notes/dest.md", "x");
  const script = path.join(__dirname, "pitch-compress.mts");
  const [first, second, ...rest] = buildLedger(root, "cli-gap").required;
  const ledgerFile = path.join(root, "ledger.json");
  fs.writeFileSync(ledgerFile, JSON.stringify({ sections: [{ source: first, status: "gap", reason: "a" }, { source: second, status: "gap", reason: "b" }, ...rest.map((source) => ({ source, status: "extracted", destination: "notes/dest.md" }))] }));
  const base = [script, "commit-ledger", "cli-gap", "--file", ledgerFile, "--root", root, "--apply", "--json"];
  const refused = spawnSync(process.execPath, base, { encoding: "utf8" });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /Unaccepted gap/);
  const malformed = spawnSync(process.execPath, [...RUNTIME_FLAGS, ...base, "--accept-gap", "no-equals-sign"], { encoding: "utf8" });
  assert.equal(malformed.status, 1);
  assert.match(malformed.stderr, /expects SECTION=REASON/);
  const partial = spawnSync(process.execPath, [...RUNTIME_FLAGS, ...base, "--accept-gap", `${first}=fine`], { encoding: "utf8" });
  assert.equal(partial.status, 1, "accepting only one of two gaps is still refused");
  const accepted = spawnSync(process.execPath, [...RUNTIME_FLAGS, ...base, "--accept-gap", `${first}=fine`, "--accept-gap", `${second}=reason with = signs inside`], { encoding: "utf8" });
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(JSON.parse(accepted.stdout).acceptedGaps[1].acceptedReason, "reason with = signs inside");
});

test("commit-ledger rejects a new knowledge entry that fails graphify's own validation", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "bad-knowledge");
  write(root, ".project/knowledge/patterns/broken.md", "---\nid: broken\ntype: pattern\n---\n\nNo description, and this pattern links nowhere and nothing links to it, but that alone should not fail --check; a duplicate id will.\n");
  write(root, ".project/knowledge/patterns/broken-dupe.md", "---\nid: broken\ntype: pattern\n---\n\nDuplicate id on purpose.\n");
  const required = buildLedger(root, "bad-knowledge").required;
  const mapping = { sections: required.map((source) => ({ source, status: "extracted", destination: ".project/knowledge/patterns/broken.md" })) };
  assert.throws(() => commitLedger(root, "bad-knowledge", mapping), /Knowledge graph invalid: .*duplicate id "broken"/);
});

test("write-done-work is idempotent: a rerun for the same slug replaces only its own section", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "alpha");
  seedShippedPitch(root, "beta");
  writeDoneWork(root, "alpha", "First summary.", { apply: true });
  writeDoneWork(root, "beta", "Beta summary, untouched by the alpha rewrite.", { apply: true });
  const afterBoth = read(root, ".project/done-work.md");
  assert.match(afterBoth, /## alpha — shipped 2026-09-25\n\nFirst summary\./);
  assert.match(afterBoth, /## beta — shipped 2026-09-25\n\nBeta summary, untouched by the alpha rewrite\./);
  const rewritten = writeDoneWork(root, "alpha", "Revised summary.", { apply: true });
  assert.equal(rewritten.changed, true);
  const afterRewrite = read(root, ".project/done-work.md");
  assert.doesNotMatch(afterRewrite, /First summary\./);
  assert.match(afterRewrite, /## alpha — shipped 2026-09-25\n\nRevised summary\./);
  assert.match(afterRewrite, /## beta — shipped 2026-09-25\n\nBeta summary, untouched by the alpha rewrite\./, "beta's section must survive alpha's rewrite untouched");
  const sameAgain = writeDoneWork(root, "alpha", "Revised summary.", { apply: true });
  assert.equal(sameAgain.changed, false, "writing the identical content again is a true no-op");
});

test("write-done-work preview (no --apply) writes nothing to disk", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "preview-only");
  const preview = writeDoneWork(root, "preview-only", "Would be written.");
  assert.match(preview.content, /preview-only/);
  assert.equal(exists(root, ".project/done-work.md"), false);
});

test("slugifyHeading and extractSection handle punctuation and nested headings correctly", () => {
  assert.equal(slugifyHeading("What downstream pitches can now build on"), "what-downstream-pitches-can-now-build-on");
  assert.equal(slugifyHeading("D1 — 2026-09-25"), "d1-2026-09-25", "an em-dash surrounded by spaces collapses to one separator, same as GitHub's own heading slugs");
  const text = "# Title\n\n## A\n\ncontent A\n\n### nested under A\n\nstill under A\n\n## B\n\ncontent B\n";
  assert.equal(extractSection(text, "A").trim(), "content A\n\n### nested under A\n\nstill under A".trim());
  assert.equal(extractSection(text, "B").trim(), "content B");
  assert.equal(extractSection(text, "Missing"), null);
});

test("CLI end to end: inventory, ledger, commit-ledger, write-done-work, including --json and error paths", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "cli-fixture");
  write(root, "notes/dest.md", "x");
  const script = path.join(__dirname, "pitch-compress.mts");
  const inv = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "inventory", "--root", root, "--json"], { encoding: "utf8" });
  assert.equal(inv.status, 0);
  assert.equal(JSON.parse(inv.stdout)[0].eligible, true);

  const ledgerText = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "ledger", "cli-fixture", "--root", root], { encoding: "utf8" });
  assert.equal(ledgerText.status, 0);
  const required = ledgerText.stdout.trim().split("\n");
  assert.ok(required.length > 0);

  const ledgerFile = path.join(root, "ledger.json");
  fs.writeFileSync(ledgerFile, JSON.stringify({ sections: required.map((source) => ({ source, status: "extracted", destination: "notes/dest.md" })) }));
  const commit = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "commit-ledger", "cli-fixture", "--file", ledgerFile, "--root", root, "--apply", "--json"], { encoding: "utf8" });
  assert.equal(commit.status, 0, commit.stderr);
  assert.equal(JSON.parse(commit.stdout).coverage, 1);

  const summaryFile = path.join(root, "summary.md");
  fs.writeFileSync(summaryFile, "CLI end-to-end summary.");
  const writeDone = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "write-done-work", "cli-fixture", "--summary", summaryFile, "--root", root, "--apply"], { encoding: "utf8" });
  assert.equal(writeDone.status, 0);
  assert.match(read(root, ".project/done-work.md"), /CLI end-to-end summary\./);

  const badAction = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "bogus"], { encoding: "utf8" });
  assert.equal(badAction.status, 1);
  assert.match(badAction.stderr, /Usage:/);

  const missingFile = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "commit-ledger", "cli-fixture", "--root", root], { encoding: "utf8" });
  assert.equal(missingFile.status, 1);
  assert.match(missingFile.stderr, /requires --file/);
});

test("an invalid slug is rejected before any filesystem access", (t) => {
  const root = fixture(t);
  for (const bad of ["../escape", "/absolute", "has spaces", "", "UPPER"]) {
    assert.throws(() => buildLedger(root, bad), /Invalid pitch slug/, bad);
  }
});

test("commit-ledger rejects a destination inside the pitch being compacted, since remove() would delete it", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "self-referential");
  const required = buildLedger(root, "self-referential").required;
  const mapping = { sections: required.map((source) => ({ source, status: "extracted", destination: ".project/pitches/self-referential/pitch.md" })) };
  assert.throws(() => commitLedger(root, "self-referential", mapping), /inside the pitch being compacted/);
  assert.equal(exists(root, ".project/compaction/ledgers/self-referential.json"), false);
});

test("commit-ledger rejects a symlink that resolves into the pitch, outside the project, an empty file, or a directory", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "bad-destinations");
  const required = buildLedger(root, "bad-destinations").required;
  const attempt = (destination) => commitLedger(root, "bad-destinations", { sections: required.map((source) => ({ source, status: "extracted", destination })) });

  fs.mkdirSync(path.join(root, "notes"), { recursive: true });
  fs.symlinkSync(path.join(root, ".project/pitches/bad-destinations/pitch.md"), path.join(root, "notes/link-into-pitch.md"));
  assert.throws(() => attempt("notes/link-into-pitch.md"), /inside the pitch being compacted/, "a symlink must be resolved, not trusted by its lexical path");

  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.writeFileSync(path.join(outside, "elsewhere.md"), "content");
  fs.symlinkSync(path.join(outside, "elsewhere.md"), path.join(root, "notes/link-outside.md"));
  assert.throws(() => attempt("notes/link-outside.md"), /outside the project/);
  assert.throws(() => attempt("../../../etc/hosts"), /outside the project|does not exist/);

  write(root, "notes/empty.md", "");
  assert.throws(() => attempt("notes/empty.md"), /nonempty file/);
  assert.throws(() => attempt("notes"), /nonempty file/, "a directory proves nothing was extracted");
});

test("inventory reports a directory with a non-slug name as preserved, without throwing or hiding other pitches", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "good-one");
  write(root, ".project/pitches/My_Odd Name/pitch.md", "x");
  const result = inventory(root);
  assert.deepEqual(result.map((entry) => entry.slug), ["good-one", "My_Odd Name"]);
  assert.equal(result[0].eligible, true);
  assert.equal(result[1].eligible, false);
  assert.match(result[1].reason, /not a valid pitch slug/);
});

test("write-done-work refuses to write through a symlinked or non-regular done-work.md and never touches its target", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "foo");
  write(root, "shared/done.md", "# Done Work\n\n## old — shipped 2026-01-01\n\nprecious old entry\n");
  fs.symlinkSync("../shared/done.md", path.join(root, ".project/done-work.md"));
  assert.throws(() => writeDoneWork(root, "foo", "summary", { apply: true }), /Symlink forbidden in path|Refusing to write .*symlink/);
  assert.equal(read(root, "shared/done.md"), "# Done Work\n\n## old — shipped 2026-01-01\n\nprecious old entry\n");
  fs.rmSync(path.join(root, ".project/done-work.md"));
  fs.mkdirSync(path.join(root, ".project/done-work.md"));
  assert.throws(() => writeDoneWork(root, "foo", "summary", { apply: true }), /Refusing to write/);
});

test("write-done-work replaces atomically and leaves no temp file", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "foo");
  writeDoneWork(root, "foo", "first", { apply: true });
  writeDoneWork(root, "foo", "second", { apply: true });
  assert.match(read(root, ".project/done-work.md"), /second/);
  assert.deepEqual(fs.readdirSync(path.join(root, ".project")).filter((name) => name.includes(".tmp-")), []);
});

test("one unreadable or oversized hill.md only affects that pitch's inventory entry", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "good");
  write(root, ".project/pitches/big/pitch.md", "# Pitch: Big\n");
  write(root, ".project/pitches/big/hill.md", `| Scope | Position |\n|---|---|\n${"x".repeat(5 * 1024 * 1024)}`);
  const entries = Object.fromEntries(inventory(root).map((entry) => [entry.slug, entry]));
  assert.equal(entries.good.eligible, true);
  assert.equal(entries.big.eligible, false);
  assert.match(entries.big.reason, /hill\.md cannot be read .*larger than 4 MB/);
});

test("a symlinked SHIPPED.md, a symlinked pitches directory, and a FIFO hill.md never make a pitch eligible or hang inventory", (t) => {
  const root = fixture(t);
  write(root, "elsewhere/SHIPPED.md", "# Shipped\n");
  write(root, ".project/pitches/a/pitch.md", "# Pitch: A\n");
  fs.symlinkSync(path.join(root, "elsewhere/SHIPPED.md"), path.join(root, ".project/pitches/a/SHIPPED.md"));
  assert.equal(inventory(root).find((entry) => entry.slug === "a").eligible, false);
  write(root, ".project/pitches/b/pitch.md", "# Pitch: B\n");
  assert.equal(spawnSync("mkfifo", [path.join(root, ".project/pitches/b/hill.md")]).status, 0);
  assert.equal(inventory(root).find((entry) => entry.slug === "b").eligible, false);
  fs.rmSync(path.join(root, ".project/pitches"), { recursive: true });
  fs.symlinkSync(path.join(root, "elsewhere"), path.join(root, ".project/pitches"));
  assert.deepEqual(inventory(root), []);
});

// ---- Independent re-review (S1): findings verified against the real code ----

test("duplicate and colliding headings get distinct ledger keys, and content under a later duplicate is required", (t) => {
  const root = fixture(t);
  write(root, ".project/pitches/dup/SHIPPED.md", "## Same\nx\n\n## Same\ny\n\n## A B\nz\n\n## A-B\nw\n");
  write(root, ".project/pitches/dup/log.md", "## Update\n\n## Update\nreal content in the second one\n");
  assert.deepEqual(requiredSections(root, "dup"), ["SHIPPED.md#same", "SHIPPED.md#same-2", "SHIPPED.md#a-b", "SHIPPED.md#a-b-2", "log.md#update-2"]);
});

test("headings in other scripts keep readable, distinct keys; ASCII keys are unchanged", (t) => {
  const root = fixture(t);
  write(root, ".project/pitches/es/SHIPPED.md", "## Decisión clave\nx\n\n## ¿Qué?\ny\n\n## 决定\nz\n\n## 结果\nw\n\n## S1 — 2026-09-24\nv\n");
  assert.deepEqual(requiredSections(root, "es"), ["SHIPPED.md#decisión-clave", "SHIPPED.md#qué", "SHIPPED.md#决定", "SHIPPED.md#结果", "SHIPPED.md#s1-2026-09-24"]);
  assert.equal(slugifyHeading("Scope reconciliation"), "scope-reconciliation");
});

test("No-gos and Rabbit holes are found under the names the template really uses, and keep their canonical keys", (t) => {
  for (const [nogos, holes] of [["No-gos", "Rabbit holes"], ["No-Gos", "Rabbit Holes"], ["No-gos (this pitch)", "Rabbit holes (resolved)"], ["No gos", "Rabbit-holes"]]) {
    const root = fixture(t);
    write(root, ".project/pitches/loose/SHIPPED.md", "## S\nx\n");
    write(root, ".project/pitches/loose/pitch.md", `# P\n\n## ${holes}\n\n- one\n\n## ${nogos}\n\n- two\n`);
    assert.deepEqual(requiredSections(root, "loose"), ["SHIPPED.md#s", "pitch.md#no-gos", "pitch.md#rabbit-holes"], `${nogos} / ${holes}`);
  }
});

test("a # line inside a fenced code block is not a heading", (t) => {
  const root = fixture(t);
  write(root, ".project/pitches/fence/SHIPPED.md", "## Real\n\n```sh\n## not a heading\n# comment\n```\n\nafter the fence\n");
  write(root, ".project/pitches/fence/log.md", "## Entry\n\n```\n## fake\n```\ntext\n");
  assert.deepEqual(requiredSections(root, "fence"), ["SHIPPED.md#real", "log.md#entry"]);
});

test("the graph check runs the bundle's graphify.mts, never one the project supplies", (t) => {
  const root = fixture(t);
  const witness = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "witness-")), "RAN");
  t.after(() => fs.rmSync(path.dirname(witness), { recursive: true, force: true }));
  write(root, "ai-framework/scripts/graphify.mts", `require("fs").writeFileSync(${JSON.stringify(witness)}, "ran"); console.log(JSON.stringify({ status: "clean", problems: [] }));`);
  seedShippedPitch(root, "witness-pitch");
  write(root, "notes/dest.md", "d");
  const sections = buildLedger(root, "witness-pitch").required.map((source) => ({ source, status: "extracted", destination: "notes/dest.md" }));
  commitLedger(root, "witness-pitch", { sections }, {});
  assert.ok(!fs.existsSync(witness), "the project's own graphify.mts was executed");
});

test("writeDoneWork rejects a summary containing heading lines and leaves other pitches' sections byte-for-byte alone", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "first");
  seedShippedPitch(root, "second");
  assert.throws(() => writeDoneWork(root, "first", "line\n\n## ghost — shipped 2026-01-01\nforged", { apply: true }), /heading lines/);
  assert.throws(() => writeDoneWork(root, "first", "# top\nx", { apply: true }), /heading lines/);
  writeDoneWork(root, "first", "code:\n\n\n\nafter three blank lines", { apply: true });
  writeDoneWork(root, "second", "second summary", { apply: true });
  const before = read(root, ".project/done-work.md");
  writeDoneWork(root, "second", "second summary changed", { apply: true });
  const after = read(root, ".project/done-work.md");
  assert.match(after, /code:\n\n\n\nafter three blank lines/, "the other pitch's blank lines survive a rerun");
  assert.equal(after.replace("second summary changed", "second summary"), before, "only the rerun pitch's own section changed");
  assert.deepEqual(inventory(root).map((entry) => entry.slug).sort(), ["first", "second"]);
});

test("a compacted pitch whose directory keeps nested empty directories is still compacted, but one with a file is not", (t) => {
  const root = fixture(t);
  write(root, ".project/done-work.md", "# Done\n\n## nested — shipped 2026-01-01\n\nS\n\n## has-file — shipped 2026-01-02\n\nS\n");
  fs.mkdirSync(path.join(root, ".project/pitches/nested/sub/deeper"), { recursive: true });
  write(root, ".project/pitches/has-file/sub/keep.md", "still here\n");
  const bySlug = Object.fromEntries(inventory(root).map((entry) => [entry.slug, entry.reason]));
  assert.equal(bySlug.nested, "already compacted");
  assert.notEqual(bySlug["has-file"], "already compacted");
});

test("CLI: an option without a value and a malformed ledger file give fixed messages that do not echo input", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "cli-fixed");
  const missing = spawnSync(process.execPath, [...RUNTIME_FLAGS, path.join(__dirname, "pitch-compress.mts"), "commit-ledger", "cli-fixed", "--root", root, "--file"], { encoding: "utf8" });
  assert.match(missing.stderr, /--file requires a value/);
  write(root, "mapping.json", "{ secret-looking-content");
  const bad = spawnSync(process.execPath, [...RUNTIME_FLAGS, path.join(__dirname, "pitch-compress.mts"), "commit-ledger", "cli-fixed", "--root", root, "--file", path.join(root, "mapping.json")], { encoding: "utf8" });
  assert.match(bad.stderr, /the ledger file is not valid JSON/);
  assert.ok(!bad.stderr.includes("secret-looking-content"));
});

// ---- Independent re-review of the S1 fixes ----

test("a numeric suffix never collides with another heading's own slug", (t) => {
  const root = fixture(t);
  write(root, ".project/pitches/coll/SHIPPED.md", "## A B\nx\n\n## A B\ny\n\n## A B 2\nSECRET\n\n## A B 2\nagain\n");
  const keys = requiredSections(root, "coll");
  assert.equal(new Set(keys).size, keys.length, `duplicate keys: ${keys.join(", ")}`);
  assert.equal(keys.length, 4);
});

test("a later No-gos heading with content is required even when an earlier matching heading is empty", (t) => {
  const root = fixture(t);
  write(root, ".project/pitches/second/SHIPPED.md", "## S\nx\n");
  write(root, ".project/pitches/second/pitch.md", "# P\n\n## No-gos\n\n## No-gos (second)\nSECOND\n");
  assert.deepEqual(requiredSections(root, "second"), ["SHIPPED.md#s", "pitch.md#no-gos"]);
});

test("fenced code follows CommonMark: a backtick in the info string, a shorter closing fence, and a different fence character do not hide or expose headings wrongly", (t) => {
  const cases = [
    ["intro\n``` a`b\n## Hidden decision\ntext\n", ["log.md#hidden-decision"]],
    ["```\n## inside\n```\n\n## Outside\ntext\n", ["log.md#outside"]],
    ["````\n```\n## still inside the long fence\n````\n\n## After\ntext\n", ["log.md#after"]],
    ["~~~\n```\n## inside tilde fence\n~~~\n\n## After\ntext\n", ["log.md#after"]],
  ];
  for (const [text, expected] of cases) {
    const root = fixture(t);
    write(root, ".project/pitches/fenced/SHIPPED.md", "## S\nx\n");
    write(root, ".project/pitches/fenced/log.md", text);
    assert.deepEqual(requiredSections(root, "fenced").slice(1), expected, JSON.stringify(text));
  }
});

test("a very long heading line cannot make heading parsing slow", (t) => {
  const root = fixture(t);
  write(root, ".project/pitches/long/SHIPPED.md", "## S\nx\n");
  write(root, ".project/pitches/long/log.md", `## a${" ".repeat(200000)}\u0000\n## Real\ntext\n`);
  const started = Date.now();
  requiredSections(root, "long");
  assert.ok(Date.now() - started < 500, `took ${Date.now() - started} ms`);
});

test("a ledger destination inside .project/compaction (the ledger or an archived copy) is refused", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "selfref");
  write(root, ".project/compaction/ledgers/other.json", "{\"a\":1}");
  const sections = buildLedger(root, "selfref").required.map((source) => ({ source, status: "extracted", destination: ".project/compaction/ledgers/other.json" }));
  assert.throws(() => commitLedger(root, "selfref", { sections }, {}), /inside \.project\/compaction/);
});

test("writeDoneWork refuses a symlinked .project ancestor and writes nothing outside the project", (t) => {
  const root = fixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.rmSync(path.join(root, ".project"), { recursive: true, force: true });
  fs.symlinkSync(outside, path.join(root, ".project"));
  assert.throws(() => writeDoneWork(root, "p", "summary", { apply: true }), /Symlink forbidden in path/);
  assert.deepEqual(fs.readdirSync(outside), []);
});

test("read errors carry an error code, never an absolute path or the child process's raw output", (t) => {
  if (process.getuid && process.getuid() === 0) return;
  const root = fixture(t);
  seedShippedPitch(root, "unreadable");
  const dir = path.join(root, ".project/pitches/unreadable");
  fs.chmodSync(dir, 0);
  let message = "";
  try { requiredSections(root, "unreadable"); } catch (error) { message = error.message; } finally { fs.chmodSync(dir, 0o755); }
  assert.match(message, /Cannot read SHIPPED\.md \(EACCES\)/);
  assert.ok(!message.includes(root));
});

test("a failing graph check reports graphify's own problem list, not raw stderr or paths", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "graphfail");
  write(root, ".project/knowledge/patterns/broken.md", "---\nid: broken\ntype: pattern\n---\n\nDuplicate id on purpose.\n");
  write(root, ".project/knowledge/patterns/broken-dupe.md", "---\nid: broken\ntype: pattern\n---\n\nDuplicate id on purpose.\n");
  const sections = buildLedger(root, "graphfail").required.map((source) => ({ source, status: "extracted", destination: ".project/knowledge/patterns/broken.md" }));
  let message = "";
  try { commitLedger(root, "graphfail", { sections }, {}); } catch (error) { message = error.message; }
  assert.match(message, /^Knowledge graph invalid: .*duplicate id "broken"/);
  assert.ok(!message.includes(root), "no absolute path from the child process");
});

test("an unlistable pitch directory reports an error code and no absolute path", (t) => {
  if (process.getuid && process.getuid() === 0) return;
  const root = fixture(t);
  seedShippedPitch(root, "unlistable");
  const dir = path.join(root, ".project/pitches/unlistable");
  fs.chmodSync(dir, 0o111);
  let message = "";
  try { requiredSections(root, "unlistable"); } catch (error) { message = error.message; } finally { fs.chmodSync(dir, 0o755); }
  assert.match(message, /Cannot list the pitch directory \(EACCES\)/);
  assert.ok(!message.includes(root));
});

// ---- Audit cycle 3 of the S1 re-review ----

test("a fence closer padded to thousands of characters, or a CRLF closer, still closes the fence; indented ATX headings count", (t) => {
  const cases = [
    [`## First\nreal\n\`\`\`sh\nnpm test\n${"`".repeat(5000)}\n## After long closer\ncontent\n`, "log.md#after-long-closer"],
    ["## First\r\nreal\r\n```sh\r\n## Inside a CRLF fence\r\n```\r\n## After crlf closer\r\ncontent\r\n", "log.md#after-crlf-closer"],
    ["## First\nreal\n\n   ## Indented heading\ncontent\n", "log.md#indented-heading"],
  ];
  for (const [text, key] of cases) {
    const root = fixture(t);
    write(root, ".project/pitches/fence2/SHIPPED.md", "## S\nx\n");
    write(root, ".project/pitches/fence2/log.md", text);
    assert.ok(requiredSections(root, "fence2").includes(key), `${key} missing from ${JSON.stringify(requiredSections(root, "fence2"))}`);
    assert.ok(!requiredSections(root, "fence2").includes("log.md#inside-a-crlf-fence"), "a heading inside a CRLF fence is code, not a section");
  }
});

test("requiredSections, inventory and readers refuse a symlinked .project or pitch directory instead of reading outside the project", (t) => {
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  write(outside, "pitches/p/SHIPPED.md", "## secret heading from outside\nx\n");
  const viaProject = fixture(t);
  fs.rmSync(path.join(viaProject, ".project"), { recursive: true, force: true });
  fs.symlinkSync(outside, path.join(viaProject, ".project"));
  assert.throws(() => requiredSections(viaProject, "p"), /Symlink forbidden in path/);
  assert.deepEqual(inventory(viaProject), []);
  const viaPitch = fixture(t);
  fs.mkdirSync(path.join(viaPitch, ".project/pitches"), { recursive: true });
  fs.symlinkSync(path.join(outside, "pitches/p"), path.join(viaPitch, ".project/pitches/p"));
  assert.throws(() => requiredSections(viaPitch, "p"), /Symlink forbidden in path/);
  assert.ok(!inventory(viaPitch).some((entry) => entry.eligible), "a symlinked pitch directory is never eligible");
});

test("ledger commits refuse pending compaction and legacy installer journals without changing either", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "pending-ledger");
  write(root, "notes/dest.md", "extracted");
  const mapping = { sections: buildLedger(root, "pending-ledger").required.map((source) => ({ source, status: "extracted", destination: "notes/dest.md" })) };
  const ledger = ".project/compaction/ledgers/pending-ledger.json";
  commitLedger(root, "pending-ledger", mapping, { apply: true });
  const original = read(root, ledger);
  for (const [journal, message] of [
    [".project/compaction/transaction.json", /Interrupted transaction: run recover/],
    [".project/skills/transaction.json", /Pending legacy or skill transaction/],
  ]) {
    write(root, journal, "pending evidence\n");
    assert.throws(() => commitLedger(root, "pending-ledger", mapping, { apply: true }), message);
    assert.equal(read(root, ledger), original);
    assert.equal(read(root, journal), "pending evidence\n");
    assert.equal(exists(root, ".project/compaction/lock.json"), false);
    fs.unlinkSync(path.join(root, journal));
  }
  write(root, ".project/skills/registry.json", "unrelated installer data\n");
  commitLedger(root, "pending-ledger", mapping, { apply: true });
  assert.equal(read(root, ".project/skills/registry.json"), "unrelated installer data\n");
  assert.equal(exists(root, ".project/skills/lock.json"), false);
});

test("injected graph subprocess is bundle-owned and reports only the validated problem list", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "runtime-graph");
  write(root, "notes/dest.md", "extracted");
  const deps = createNodeDeps({ AI_WORKFLOW_RUNNER: "node" });
  const calls = [];
  deps.child = { ...deps.child, runSync: (command, args, options) => {
    calls.push({ command, args, options });
    return { status: 0, signal: null, stdout: '{"status":"clean","problems":[]}', stderr: "" };
  } };
  const tools = createPitchCompress(deps);
  const mapping = { sections: tools.requiredSections(root, "runtime-graph").map((source) => ({ source, status: "extracted", destination: "notes/dest.md" })) };
  assert.equal(tools.commitLedger(root, "runtime-graph", mapping).coverage, 1);
  assert.deepEqual(calls, [{ command: process.versions.bun ? "node" : deps.proc.execPath, args: ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", path.join(__dirname, "graphify.mts"), "--check", "--json"], options: { cwd: root, env: { AI_WORKFLOW_RUNNER: "node" } } }]);
  deps.child.runSync = () => ({ status: 1, signal: null, stdout: '{"problems":[{"message":"stale graph"}]}', stderr: "private child output" });
  assert.throws(() => tools.commitLedger(root, "runtime-graph", mapping), { message: "Knowledge graph invalid: stale graph" });
});

test("write-done-work reads the ship date from bold and plain `Shipped:` lines, and only falls back to today when there is none", (t) => {
  const root = fixture(t);
  const cases = [
    ["bold", "**Shipped:** 2026-09-25", "2026-09-25"],
    ["plain", "Bet: 2026-09-20  •  Shipped: 2026-09-26  •  Appetite: small-batch", "2026-09-26"],
    ["colon-outside", "**Shipped**: 2026-09-27", "2026-09-27"],
    ["date-line", "**Date**: 2026-09-28", "2026-09-28"],
  ];
  for (const [name, line] of cases) write(root, `.project/pitches/${name}/SHIPPED.md`, `# Shipped: ${name}\n${line}\n\n## Summary\n\nDone.\n`);
  for (const [name] of cases) writeDoneWork(root, name, "Summary text.", { apply: true });
  const done = read(root, ".project/done-work.md");
  for (const [name, , expected] of cases) assert.match(done, new RegExp(`## ${name} — shipped ${expected}\\n`));
});

// ---- ledger version 2 (class, disposition, helps, closed omission reasons, bodyHash, otherFiles) ----

import { bodyHashOf, DONE_WORK_FILE, LEDGER_V2, MAX_HELPS_LENGTH, MAX_LEDGER_BYTES, MAX_SECTIONS, validateLedgerShape } from "./ledger-schema.mts";

const digestOf = (data) => testDeps.crypto.sha256Hex(data);
const keep = (source, extra = {}) => ({ source, class: "know-how", disposition: "extracted", destination: "notes/dest.md", helps: "Explains why X was chosen over Y.", ...extra });
function v2Mapping(root, slug, edit = () => undefined) {
  const sections = buildLedger(root, slug).required.map((source) => keep(source));
  const otherFiles = createPitchCompress(testDeps).otherPitchFiles(root, slug).map((file) => ({ path: file.path, disposition: "omitted", reason: "superseded" }));
  const mapping = { schemaVersion: 2, sections, otherFiles };
  edit(mapping);
  return mapping;
}
function seedV2(t, slug) {
  const root = fixture(t);
  seedShippedPitch(root, slug, { audit: true });
  write(root, "notes/dest.md", "kept content");
  return root;
}

test("v2 commits class, disposition, helps and a tool-computed bodyHash, and accounts for every other pitch file", (t) => {
  const root = seedV2(t, "v2-ok");
  write(root, ".project/pitches/v2-ok/notes/scratch.txt", "scratch");
  const tools = createPitchCompress(testDeps);
  assert.deepEqual(tools.otherPitchFiles(root, "v2-ok").map((file) => file.path), ["deviations.md", "log.md", "notes/scratch.txt", "pitch.md", "SHIPPED.md"], "only an audit-cycle file is covered whole; SHIPPED, deviations and log are also listed because text outside their sections is in no section");
  const result = commitLedger(root, "v2-ok", v2Mapping(root, "v2-ok"), { apply: true });
  assert.equal(result.coverage, 1);
  const ledger = JSON.parse(read(root, ".project/compaction/ledgers/v2-ok.json"));
  assert.equal(ledger.schemaVersion, LEDGER_V2);
  const bodies = Object.fromEntries(tools.pitchSections(root, "v2-ok").map((section) => [section.key, section.body]));
  for (const section of ledger.sections) assert.equal(section.bodyHash, bodyHashOf(bodies[section.source], digestOf), section.source);
  assert.deepEqual(ledger.otherFiles.map((file) => file.path), ["deviations.md", "log.md", "notes/scratch.txt", "pitch.md", "SHIPPED.md"]);
  assert.deepEqual(validateLedgerShape(ledger, "v2-ok"), { version: 2, problems: [] });
});

test("a mapping with no schemaVersion or schemaVersion 1 still commits the original v1 record", (t) => {
  const root = seedV2(t, "still-v1");
  const v1 = { sections: buildLedger(root, "still-v1").required.map((source) => ({ source, status: "extracted", destination: "notes/dest.md" })) };
  commitLedger(root, "still-v1", v1, { apply: true });
  const first = JSON.parse(read(root, ".project/compaction/ledgers/still-v1.json"));
  assert.equal(first.schemaVersion, 1);
  assert.ok(!("otherFiles" in first) && !("class" in first.sections[0]), "v1 input never gains v2 fields");
  commitLedger(root, "still-v1", { schemaVersion: 1, ...v1 }, { apply: true });
  assert.equal(JSON.parse(read(root, ".project/compaction/ledgers/still-v1.json")).schemaVersion, 1);
});

test("a mapping with an unsupported schemaVersion, or that is not an object, is refused", (t) => {
  const root = seedV2(t, "bad-version");
  const base = v2Mapping(root, "bad-version");
  for (const version of [3, 0, "2", null, 2.5]) assert.throws(() => commitLedger(root, "bad-version", { ...base, schemaVersion: version }), /Unsupported ledger schemaVersion/, String(version));
  for (const mapping of [null, [], "ledger", 7]) assert.throws(() => commitLedger(root, "bad-version", mapping), /must be an object/);
  assert.ok(!exists(root, ".project/compaction/ledgers/bad-version.json"));
});

test("v2 refuses destinations that are not lasting: another pitch's file, done-work, the outcome record (scenario G)", (t) => {
  const root = seedV2(t, "v2-dest");
  write(root, ".project/pitches/other-pitch/_followups.md", "followups");
  write(root, DONE_WORK_FILE, "# Done Work\n");
  // The positive case also runs graph validation, so its published outcome must satisfy the shared format.
  write(root, ".project/records/shipped/v2-dest.md", ["---", "slug: v2-dest", "shipped: 2026-10-08", "schemaVersion: 1", "---", "# v2-dest", "",
    "The fixture shipped.", "Read its owning documents.", "Verification is historical.", "", "- outcome: Changed the fixture.",
    ...["docs", "decisions", "knowledge", "code", "verification", "followups", "archive"].map(field => `- ${field}: none`), ""].join("\n"));
  const first = buildLedger(root, "v2-dest").required[0];
  const change = (extra) => (mapping) => { mapping.sections[0] = keep(first, extra); };
  assert.throws(() => commitLedger(root, "v2-dest", v2Mapping(root, "v2-dest", change({ destination: ".project/pitches/other-pitch/_followups.md" }))), /under \.project\/pitches\//);
  assert.throws(() => commitLedger(root, "v2-dest", v2Mapping(root, "v2-dest", change({ class: "behavior", destination: DONE_WORK_FILE }))), /behavior content must live in its owning document/);
  assert.throws(() => commitLedger(root, "v2-dest", v2Mapping(root, "v2-dest", change({ class: "decision", destination: ".project/records/shipped/v2-dest.md" }))), /decision content must live/);
  commitLedger(root, "v2-dest", v2Mapping(root, "v2-dest", change({ class: "limit", destination: DONE_WORK_FILE })));
});

test("v2 binds each entry to the content it was judged against", (t) => {
  const root = seedV2(t, "v2-hash");
  const sections = createPitchCompress(testDeps).pitchSections(root, "v2-hash");
  const stale = v2Mapping(root, "v2-hash", (mapping) => { mapping.sections[0].bodyHash = bodyHashOf("what the section said before", digestOf); });
  assert.throws(() => commitLedger(root, "v2-hash", stale), /Stale content hash for .*changed since it was judged/);
  const right = v2Mapping(root, "v2-hash", (mapping) => { mapping.sections[0].bodyHash = bodyHashOf(sections[0].body, digestOf); });
  commitLedger(root, "v2-hash", right);
  const edited = v2Mapping(root, "v2-hash", (mapping) => { mapping.otherFiles[0].hash = bodyHashOf("old", digestOf); });
  assert.throws(() => commitLedger(root, "v2-hash", edited), /Stale content hash/);
});

test("v2 needs an otherFiles entry for every pitch file outside the sections, and none for files that are not there", (t) => {
  const root = seedV2(t, "v2-files");
  write(root, ".project/pitches/v2-files/plan.md", "a plan");
  assert.throws(() => commitLedger(root, "v2-files", v2Mapping(root, "v2-files", (mapping) => { mapping.otherFiles = mapping.otherFiles.slice(1); })), /does not account for pitch file\(s\)/);
  assert.throws(() => commitLedger(root, "v2-files", v2Mapping(root, "v2-files", (mapping) => { delete mapping.otherFiles; })), /needs an otherFiles list/);
  assert.throws(() => commitLedger(root, "v2-files", v2Mapping(root, "v2-files", (mapping) => { mapping.otherFiles.push({ path: "ghost.md", disposition: "omitted", reason: "duplicate" }); })), /does not have outside its sections: ghost\.md/);
  assert.throws(() => commitLedger(root, "v2-files", v2Mapping(root, "v2-files", (mapping) => { mapping.otherFiles.push({ ...mapping.otherFiles[0] }); })), /Duplicate otherFiles entry/);
  fs.symlinkSync(path.join(root, "notes/dest.md"), path.join(root, ".project/pitches/v2-files/link.md"));
  assert.throws(() => createPitchCompress(testDeps).otherPitchFiles(root, "v2-files"), /Symlink inside the pitch directory/);
});

test("v2 omissions use a closed reason set; failed-approach needs a lesson; other needs a named acceptance", (t) => {
  const root = seedV2(t, "v2-omit");
  const first = buildLedger(root, "v2-omit").required[0];
  const omit = (extra) => (mapping) => { mapping.sections[0] = { source: first, class: "omit", disposition: "omitted", ...extra }; };
  commitLedger(root, "v2-omit", v2Mapping(root, "v2-omit", omit({ reason: "resolved-false-positive" })));
  assert.throws(() => commitLedger(root, "v2-omit", v2Mapping(root, "v2-omit", omit({}))), /omitted needs a reason from/);
  assert.throws(() => commitLedger(root, "v2-omit", v2Mapping(root, "v2-omit", omit({ reason: "not interesting" }))), /omitted needs a reason from/);
  assert.throws(() => commitLedger(root, "v2-omit", v2Mapping(root, "v2-omit", omit({ reason: "failed-approach" }))), /failed-approach omission needs the destination of its lesson/);
  commitLedger(root, "v2-omit", v2Mapping(root, "v2-omit", omit({ reason: "failed-approach", destination: "notes/dest.md" })));
  const other = v2Mapping(root, "v2-omit", omit({ reason: "other" }));
  assert.throws(() => commitLedger(root, "v2-omit", other), /Unaccepted gap\(s\): .*--accept-gap/);
  const result = commitLedger(root, "v2-omit", other, { acceptGaps: { [first]: "reviewed: superseded by the next pitch" }, apply: true });
  assert.deepEqual(result.gaps, [{ source: first, reason: "other" }]);
  assert.ok(result.coverage < 1);
  assert.deepEqual(JSON.parse(read(root, ".project/compaction/ledgers/v2-omit.json")).acceptedGaps[0].acceptedReason, "reviewed: superseded by the next pitch");
});

test("v2 rejects a kept entry without helps, a class that disagrees with its disposition, and unknown fields", (t) => {
  const root = seedV2(t, "v2-shape");
  const first = buildLedger(root, "v2-shape").required[0];
  const change = (entry) => (mapping) => { mapping.sections[0] = entry; };
  assert.throws(() => commitLedger(root, "v2-shape", v2Mapping(root, "v2-shape", change(keep(first, { helps: "" })))), /needs a helps line/);
  assert.throws(() => commitLedger(root, "v2-shape", v2Mapping(root, "v2-shape", change(keep(first, { helps: "x".repeat(MAX_HELPS_LENGTH + 1) })))), /needs a helps line of 1-/);
  assert.throws(() => commitLedger(root, "v2-shape", v2Mapping(root, "v2-shape", change(keep(first, { class: "omit" })))), /class omit and disposition omitted go together/);
  assert.throws(() => commitLedger(root, "v2-shape", v2Mapping(root, "v2-shape", change(keep(first, { class: "story" })))), /class must be one of/);
  assert.throws(() => commitLedger(root, "v2-shape", v2Mapping(root, "v2-shape", change(keep(first, { score: 5 })))), /unknown field "score"/);
  assert.throws(() => commitLedger(root, "v2-shape", v2Mapping(root, "v2-shape", change(keep(first, { destination: "notes/missing.md" })))), /Destination does not exist/);
});

test("a ledger mapping beyond the shared section limit is refused before any work, in both versions", (t) => {
  const root = seedV2(t, "v2-big");
  const many = Array.from({ length: MAX_SECTIONS + 1 }, (_, i) => keep(`SHIPPED.md#s${i}`));
  assert.throws(() => commitLedger(root, "v2-big", { schemaVersion: 2, sections: many, otherFiles: [] }), /limit is 200/);
  assert.throws(() => commitLedger(root, "v2-big", { sections: many.map((entry) => ({ source: entry.source, status: "extracted", destination: "notes/dest.md" })) }), /limit is 200/);
});

test("a ledger at the maximum supported size commits and reads back through the shared reader", (t) => {
  const root = fixture(t);
  const slug = "v2-max";
  write(root, `.project/pitches/${slug}/pitch.md`, "# Pitch\n");
  const headings = Array.from({ length: MAX_SECTIONS }, (_, i) => `## Section ${String(i).padStart(3, "0")}\n\nBody ${i}.\n`).join("\n");
  write(root, `.project/pitches/${slug}/SHIPPED.md`, `# Shipped\n\n${headings}`);
  const longDirectory = `notes/${"d".repeat(60)}/${"e".repeat(60)}/${"f".repeat(60)}/${"g".repeat(60)}`;
  const destination = `${longDirectory}/destination.md`;
  write(root, destination, "kept");
  const sections = buildLedger(root, slug).required.map((source) => keep(source, { destination, helps: "h".repeat(MAX_HELPS_LENGTH) }));
  assert.equal(sections.length, MAX_SECTIONS);
  commitLedger(root, slug, { schemaVersion: 2, sections, otherFiles: ["SHIPPED.md", "pitch.md"].map((path) => ({ path, disposition: "omitted", reason: "duplicate" })) }, { apply: true });
  const text = read(root, `.project/compaction/ledgers/${slug}.json`);
  assert.ok(text.length < MAX_LEDGER_BYTES, `${text.length} bytes is within the bound every reader enforces`);
  const shape = validateLedgerShape(JSON.parse(text), slug);
  assert.deepEqual(shape, { version: 2, problems: [] });
});

test("validateLedgerShape never throws and names what is wrong", () => {
  for (const value of [undefined, null, [], "x", 3, {}, { schemaVersion: 2 }, { schemaVersion: 2, slug: "s", sections: [null] }, { schemaVersion: 1, slug: "s", sections: [{ source: "a", status: "other" }] }]) {
    const result = validateLedgerShape(value, "s");
    assert.ok(result.problems.length > 0, JSON.stringify(value));
  }
  assert.match(validateLedgerShape({ schemaVersion: 3 }, "s").problems[0], /unsupported ledger schemaVersion 3/);
  assert.deepEqual(validateLedgerShape({ schemaVersion: 1, slug: "s", sections: [{ source: "a", status: "gap" }] }, "s"), { version: 1, problems: [] });
});

test("a deviations.md or log.md with no section content is accounted for as an other file instead of vanishing", (t) => {
  const root = seedV2(t, "v2-loose");
  write(root, ".project/pitches/v2-loose/deviations.md", "just a note, no headings\n");
  const paths = createPitchCompress(testDeps).otherPitchFiles(root, "v2-loose").map((file) => file.path);
  assert.deepEqual(paths, ["deviations.md", "log.md", "pitch.md", "SHIPPED.md"]);
  assert.throws(() => commitLedger(root, "v2-loose", v2Mapping(root, "v2-loose", (mapping) => { mapping.otherFiles = mapping.otherFiles.filter((file) => file.path !== "deviations.md"); })), /does not account for pitch file\(s\): deviations\.md/);
});

// ---- audit cycle 1: guards the v2 commit path must keep, and destination aliasing ----

test("v2 commit refuses pending compaction and installer journals, runs the graph check, and requires every section", (t) => {
  const root = seedV2(t, "v2-guards");
  const ledger = ".project/compaction/ledgers/v2-guards.json";
  for (const [journal, message] of [
    [".project/compaction/transaction.json", /Interrupted transaction: run recover/],
    [".project/skills/transaction.json", /Pending legacy or skill transaction/],
  ]) {
    write(root, journal, "pending evidence\n");
    assert.throws(() => commitLedger(root, "v2-guards", v2Mapping(root, "v2-guards"), { apply: true }), message);
    assert.equal(exists(root, ledger), false, "nothing is written while a journal is pending");
    fs.unlinkSync(path.join(root, journal));
  }
  const deps = createNodeDeps({ AI_WORKFLOW_RUNNER: "node" });
  deps.child = { ...deps.child, runSync: () => ({ status: 1, signal: null, stdout: '{"problems":[{"message":"stale graph"}]}', stderr: "" }) };
  const tools = createPitchCompress(deps);
  assert.throws(() => tools.commitLedger(root, "v2-guards", v2Mapping(root, "v2-guards")), { message: "Knowledge graph invalid: stale graph" });
  assert.throws(() => commitLedger(root, "v2-guards", v2Mapping(root, "v2-guards", (mapping) => { mapping.sections = mapping.sections.slice(1); })), /Ledger missing required section\(s\)/);
});

test("a destination is judged by file identity: a symlink into another pitch's folder, or the pitch's own folder spelled in another case, is refused", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "alias-me");
  write(root, ".project/pitches/other/x.md", "another pitch's file\n");
  write(root, "notes/dest.md", "kept");
  fs.mkdirSync(path.join(root, ".project/knowledge/patterns"), { recursive: true });
  fs.symlinkSync("../../pitches/other/x.md", path.join(root, ".project/knowledge/patterns/link.md"));
  const tools = createPitchCompress(testDeps);
  assert.throws(() => tools.checkDestination(root, "alias-me", ".project/knowledge/patterns/link.md", "link"), /inside \.project\/pitches/);
  tools.checkDestination(root, "alias-me", "notes/dest.md", "ok");
  if (fs.existsSync(path.join(root, ".PROJECT/PITCHES/ALIAS-ME/pitch.md"))) {
    assert.throws(() => tools.checkDestination(root, "alias-me", ".project/Pitches/alias-me/pitch.md", "alias"), /inside the pitch being compacted/);
    assert.throws(() => tools.checkDestination(root, "alias-me", ".PROJECT/pitches/ALIAS-ME/pitch.md", "alias"), /inside the pitch being compacted/);
  }
  assert.throws(() => tools.checkDestination(root, "alias-me", ".project/pitches/alias-me/pitch.md", "own"), /inside the pitch being compacted/);
});

test("text outside a section (a preamble) is bound by a whole-file hash, so rewriting it invalidates the ledger", (t) => {
  const root = seedV2(t, "v2-preamble");
  write(root, ".project/pitches/v2-preamble/SHIPPED.md", "# Shipped\n\nPREAMBLE the sections never judge\n\n## Scope reconciliation\n\nDone as pitched.\n");
  const tools = createPitchCompress(testDeps);
  const before = tools.otherPitchFiles(root, "v2-preamble").find((file) => file.path === "SHIPPED.md");
  const sectionBefore = tools.pitchSections(root, "v2-preamble").find((section) => section.key === "SHIPPED.md#scope-reconciliation");
  assert.ok(before, "SHIPPED.md is listed as a file even though it has sections");
  write(root, ".project/pitches/v2-preamble/SHIPPED.md", "# Shipped\n\nPREAMBLE rewritten after judgment\n\n## Scope reconciliation\n\nDone as pitched.\n");
  assert.notEqual(tools.otherPitchFiles(root, "v2-preamble").find((file) => file.path === "SHIPPED.md")?.hash, before.hash);
  assert.deepEqual(tools.pitchSections(root, "v2-preamble").find((section) => section.key === "SHIPPED.md#scope-reconciliation"), sectionBefore, "the section itself did not change, only the text around it");
});

test("behavior and decision destinations are refused by identity too: a hard link to done-work.md or a file in the record folder", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "linksonly");
  write(root, ".project/done-work.md", "# Done Work\n");
  write(root, ".project/records/shipped/other.md", "record\n");
  write(root, "notes/dest.md", "kept");
  fs.linkSync(path.join(root, ".project/done-work.md"), path.join(root, "notes/dw-hardlink.md"));
  const tools = createPitchCompress(testDeps);
  assert.throws(() => tools.checkDestination(root, "linksonly", "notes/dw-hardlink.md", "link", "behavior"), /must live in its owning document/);
  assert.throws(() => tools.checkDestination(root, "linksonly", ".project/records/shipped/other.md", "rec", "decision"), /must live in its owning document/);
  tools.checkDestination(root, "linksonly", "notes/dw-hardlink.md", "link", "limit");
  tools.checkDestination(root, "linksonly", "notes/dest.md", "ok", "behavior");
});

// ---- group entries: one entry, one tree hash, any number of files ----

import { groupHashOf, MAX_OTHER_FILES, MAX_PITCH_FILES } from "./ledger-schema.mts";

function groupedPitch(t, slug, count) {
  const root = seedV2(t, slug);
  for (let i = 0; i < count; i++) write(root, `.project/pitches/${slug}/campaign/f${String(i).padStart(4, "0")}.txt`, `staged ${i}`);
  return root;
}
const groupOf = (root, slug, prefix) => createPitchCompress(testDeps).otherPitchFiles(root, slug).filter((file) => file.path.startsWith(prefix));
function groupedMapping(root, slug, edit = () => undefined) {
  const mapping = v2Mapping(root, slug);
  mapping.otherFiles = [...mapping.otherFiles.filter((file) => !file.path.startsWith("campaign/")), { path: "campaign/", disposition: "omitted", reason: "duplicate" }];
  edit(mapping);
  return mapping;
}

test("a group entry covers a folder larger than the per-file ledger limit with one tool-computed tree hash", (t) => {
  const root = groupedPitch(t, "grp-ok", MAX_OTHER_FILES + 50);
  assert.throws(() => commitLedger(root, "grp-ok", v2Mapping(root, "grp-ok"), { apply: true }), /otherFiles, limit 200/, "listing every file still hits the entry limit");
  const result = commitLedger(root, "grp-ok", groupedMapping(root, "grp-ok"), { apply: true });
  assert.equal(result.coverage, 1);
  const ledger = JSON.parse(read(root, ".project/compaction/ledgers/grp-ok.json"));
  const entry = ledger.otherFiles.find((file) => file.path === "campaign/");
  assert.equal(entry.count, MAX_OTHER_FILES + 50);
  assert.equal(entry.hash, groupHashOf(groupOf(root, "grp-ok", "campaign/"), digestOf));
  assert.ok(ledger.otherFiles.length < 10, "the ledger stays small");
  assert.deepEqual(validateLedgerShape(ledger, "grp-ok"), { version: 2, problems: [] });
});

test("a group a hash or count was judged against is refused once the folder changed, and a group cannot hide or double a file", (t) => {
  const root = groupedPitch(t, "grp-doubt", 5);
  const live = groupOf(root, "grp-doubt", "campaign/");
  const good = groupHashOf(live, digestOf);
  assert.throws(() => commitLedger(root, "grp-doubt", groupedMapping(root, "grp-doubt", (m) => { m.otherFiles.at(-1).hash = bodyHashOf("old", digestOf); })), /Stale content hash for campaign\//);
  assert.throws(() => commitLedger(root, "grp-doubt", groupedMapping(root, "grp-doubt", (m) => { m.otherFiles.at(-1).hash = good; m.otherFiles.at(-1).count = 4; })), /Stale file count/);
  assert.throws(() => commitLedger(root, "grp-doubt", groupedMapping(root, "grp-doubt", (m) => { m.otherFiles.push({ path: "campaign/f0000.txt", disposition: "omitted", reason: "duplicate" }); })), /overlap/);
  assert.throws(() => commitLedger(root, "grp-doubt", groupedMapping(root, "grp-doubt", (m) => { m.otherFiles.push({ path: "campaign/f0/", disposition: "omitted", reason: "duplicate" }); })), /does not have|overlap/);
  assert.throws(() => commitLedger(root, "grp-doubt", groupedMapping(root, "grp-doubt", (m) => { m.otherFiles.at(-1).path = "nothing/"; })), /group the pitch does not have/);
  write(root, ".project/pitches/grp-doubt/campaign/extra/deep.txt", "x");
  assert.throws(() => commitLedger(root, "grp-doubt", groupedMapping(root, "grp-doubt", (m) => { m.otherFiles.at(-1).path = "campaign/extra/"; })), /does not account for pitch file\(s\): .*campaign\/f0000\.txt/, "a narrower group leaves the rest unaccounted");
  const accepted = commitLedger(root, "grp-doubt", groupedMapping(root, "grp-doubt", (m) => { m.otherFiles.at(-1).hash = groupHashOf(groupOf(root, "grp-doubt", "campaign/"), digestOf); }), { apply: true });
  assert.equal(accepted.coverage, 1, "the same group with the current hash commits");
});

test("a pitch with more files than the folder bound is refused even when grouped", (t) => {
  const root = groupedPitch(t, "grp-big", MAX_PITCH_FILES + 1);
  assert.throws(() => createPitchCompress(testDeps).otherPitchFiles(root, "grp-big"), /more than 2000 files/);
});

