import assert from "node:assert/strict";
import { test } from "node:test";
import { status, prepare, apply, main, type ApprovedUpgrade, MAX_RECEIPT_BYTES, MAX_LEGACY_SCAN_BYTES } from "./legacy-upgrade.mts";
import { buildSnapshot } from "./state-snapshot.mts";
import { writeData } from "./runtime/data-file.mts";
import { createPitchCompress } from "./pitch-compress.mts";
import { createPitchArchive } from "./pitch-archive.mts";
import { MAX_LEDGER_BYTES, validateLedgerShape, bodyHashOf } from "./ledger-schema.mts";
import { applyIndex, DONE_WORK_FILE, compactedSlugs, legacyEntries } from "./done-work-index.mts";
import { lintOutcomeRecord } from "./outcome-record.mts";
import { readProjectText } from "./consolidation-migrate.mts";
import { createTestDeps, tempFixture, listTree } from "./runtime/test-helpers.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

const base = createTestDeps();
const legacy = "## alpha — shipped 2026-10-01\n\nLegacy summary.\n";
const v1 = (slug = "alpha", pointers = 0): string => JSON.stringify({ schemaVersion: 1, slug, sections: Array.from({ length: Math.max(1, pointers) }, (_, i) => ({ source: `SHIPPED.md#result-${i + 1}`, status: "extracted", destination: pointers ? DONE_WORK_FILE : ".project/knowledge/patterns/example.md", reason: "Preserved lesson." })) });
const v2 = (slug: string): string => JSON.stringify({ schemaVersion: 2, slug, sections: [{ source: "SHIPPED.md#result", class: "know-how", disposition: "extracted", destination: ".project/knowledge/patterns/example.md", helps: "Find the preserved lesson.", bodyHash: `sha256:${"0".repeat(64)}` }], otherFiles: [] });
const record = (slug: string): string => `---\nslug: ${slug}\nshipped: 2026-10-01\nschemaVersion: 1\n---\n# ${slug}\n\nShipped the fixture change.\nRead the preserved lesson.\nUse the knowledge link below.\n\n- outcome: Fixture change.\n- docs: none\n- decisions: none\n- knowledge: [lesson](.project/knowledge/patterns/example.md)\n- code: none\n- verification: none\n- followups: none\n- archive: none\n`;
const fixture = { [DONE_WORK_FILE]: `# Done Work\n\n${legacy}`, ".project/compaction/ledgers/alpha.json": v1(), ".project/knowledge/patterns/example.md": "# Lesson\n\nReusable content.\n", ".project/records/pitch-compression/alpha.md": "# Compact record\n\nPreserved summary.\n", ".project/pitches/alpha/SHIPPED.md": "# Shipped\n\n## Result 1\n\nOriginal source content.\n" };
function run(files: Record<string, string>, action: (root: string) => void): void {
  const root = tempFixture(base, { ...fixture, ...files });
  try { action(root); } finally { base.fs.rmSync(root, { recursive: true, force: true }); }
}
const read = (root: string, file: string): string => base.fs.readFileSync(base.path.join(root, file));
const write = (root: string, file: string, text: string): void => { base.fs.mkdirSync(base.path.dirname(base.path.join(root, file)), { recursive: true }); base.fs.writeFileSync(base.path.join(root, file), text); };
const tree = (root: string): Record<string, string> => Object.fromEntries(listTree(base, root).filter(file => !file.startsWith(".git/")).filter(file => base.fs.lstatSync(base.path.join(root, file)).isFile()).map(file => [file, base.crypto.sha256Hex(base.fs.readBytesSync(base.path.join(root, file)))]));
function withoutArchives(): RuntimeDeps {
  const check = (file: string): void => assert.ok(!file.replace(/\\/g, "/").includes("compaction/archives"), "unapproved archive access");
  return { ...base, fs: { ...base.fs,
    existsSync: file => { check(file); return base.fs.existsSync(file); },
    statSync: file => { check(file); return base.fs.statSync(file); },
    lstatSync: file => { check(file); return base.fs.lstatSync(file); },
    openSync: (file, flags, mode) => { check(file); return base.fs.openSync(file, flags, mode); },
    readdirSync: file => { check(file); return base.fs.readdirSync(file); },
    readFileSync: file => { check(file); return base.fs.readFileSync(file); },
    readBytesSync: file => { check(file); return base.fs.readBytesSync(file); },
  } };
}

for (const [pointers, tier] of [[0, "A"], [12, "B-small"], [13, "B-large"]] as const) {
  test(`classifies tier ${tier} at ${pointers} pointer sections without archive access`, () => run({ ".project/compaction/ledgers/alpha.json": v1("alpha", pointers) }, root => {
    const before = tree(root);
    assert.deepEqual(status(root, withoutArchives()), [{ slug: "alpha", state: "legacy", tier, pointerSections: pointers, problems: [] }]);
    assert.deepEqual(tree(root), before);
  }));
}

test("counts each slug once and recognizes partial and upgraded artifacts", () => run({
  [DONE_WORK_FILE]: applyIndex(`# Done Work\n\n${legacy}`, [{ slug: "gamma", shipped: "2026-10-01", outcome: "Fixture change." }]),
  ".project/compaction/ledgers/gamma.json": v2("gamma"), ".project/compaction/ledgers/gamma.v1.json": v1("gamma", 13),
  ".project/records/shipped/gamma.md": record("gamma"), ".project/records/shipped/beta.md": record("beta"),
  ".project/records/shipped/_template.md": "template ignored",
}, root => {
  const rows = status(root, withoutArchives());
  assert.deepEqual(rows.map(row => [row.slug, row.state, row.tier]), [["alpha", "legacy", "A"], ["beta", "partial", "A"], ["gamma", "upgraded", "B-large"]]);
  write(root, DONE_WORK_FILE, `${read(root, DONE_WORK_FILE)}\n## gamma — shipped 2026-10-01\n\nUnretired narrative.\n`);
  assert.equal(status(root, base).find(row => row.slug === "gamma")?.state, "partial");
  write(root, ".project/records/shipped/gamma.md", "broken");
  assert.ok(status(root, base).find(row => row.slug === "gamma")!.problems.length > 0);
}));

test("prepares unresolved drafts from durable evidence without changing any file or reading archives", () => run({}, root => {
  const before = tree(root), draft = prepare(root, "alpha", withoutArchives());
  assert.equal(draft.draft, true);
  assert.equal(draft.state, "needs-decision");
  assert.equal(draft.otherFilesState, "needs-decision");
  assert.deepEqual(draft.evidence.map(item => item.path).sort(), [".project/done-work.md#alpha", ".project/knowledge/patterns/example.md", ".project/records/pitch-compression/alpha.md"]);
  assert.ok(draft.mapping.sections.every(section => section.class === null && section.helps === null && section.bodyHash === null));
  assert.ok(validateLedgerShape({ ...draft.mapping, slug: "alpha" }, "alpha").problems.length > 0, "unjudged mapping cannot be committed");
  write(root, ".project/records/shipped/alpha.md", draft.outcomeRecord);
  assert.ok(lintOutcomeRecord(root, ".project/records/shipped/alpha.md", base).problems.length > 0, "draft outcome cannot masquerade as a final record");
  base.fs.rmSync(base.path.join(root, ".project/records/shipped"), { recursive: true });
  assert.deepEqual(tree(root), before);
}));

test("reports missing evidence and bounds excerpts without pretending they are full source bodies", () => run({ ".project/knowledge/patterns/example.md": "x".repeat(3000) }, root => {
  base.fs.unlinkSync(base.path.join(root, ".project/records/pitch-compression/alpha.md"));
  const draft = prepare(root, "alpha", base);
  const item = draft.evidence.find(item => item.path.endsWith("example.md"))!;
  assert.equal(item.excerpt.length, 2000);
  assert.equal(item.truncated, true);
  assert.equal(item.hash, `sha256:${base.crypto.sha256Hex("x".repeat(3000))}`);
  assert.ok(draft.unavailable.includes(".project/records/pitch-compression/alpha.md"));
}));

test("refuses unapproved archive reads before any archive access or receipt write", () => run({}, root => {
  const before = tree(root);
  assert.throws(() => prepare(root, "alpha", withoutArchives(), { readArchive: true }), /Archive read refused/);
  assert.throws(() => prepare(root, "alpha", withoutArchives(), { approveArchiveRead: "unused" }), /requires --read-archive/);
  for (const reason of ["", "\nforged", "x".repeat(241)]) assert.throws(() => prepare(root, "alpha", withoutArchives(), { readArchive: true, approveArchiveRead: reason }), /approval|Archive read refused/);
  assert.deepEqual(tree(root), before);
}));

test("logs each explicit approval before reading a synthetic archive and preserves the archive bytes", () => run({}, root => {
  createPitchArchive(base).archive(root, "alpha", { apply: true });
  const before = tree(root);
  let archiveReads = 0;
  const approved = (file: string): void => { if (file.replace(/\\/g, "/").includes("compaction/archives")) assert.ok(read(root, ".project/compaction/archive-reads.log").includes("fixture approval"), "receipt precedes all archive access"); };
  const deps: RuntimeDeps = { ...base, fs: { ...base.fs, openSync: (file, flags, mode) => {
    approved(file);
    if (file.replace(/\\/g, "/").includes("compaction/archives")) archiveReads++;
    return base.fs.openSync(file, flags, mode);
  }, lstatSync: file => { approved(file); return base.fs.lstatSync(file); }, readdirSync: file => { approved(file); return base.fs.readdirSync(file); } } };
  const draft = prepare(root, "alpha", deps, { readArchive: true, approveArchiveRead: "fixture approval" });
  assert.ok(archiveReads > 0);
  assert.ok(draft.evidence.some(item => item.path === "archive:SHIPPED.md" && item.excerpt.includes("Original source content")));
  prepare(root, "alpha", deps, { readArchive: true, approveArchiveRead: "fixture approval again" });
  const receipts = read(root, ".project/compaction/archive-reads.log").trim().split("\n").map(line => JSON.parse(line));
  assert.equal(receipts.length, 2);
  assert.equal(receipts[0].slug, "alpha");
  assert.ok(Number.isFinite(Date.parse(receipts[0].date)));
  const after = tree(root); delete after[".project/compaction/archive-reads.log"];
  assert.deepEqual(after, before);
}));

test("keeps an approval receipt when an archive attempt fails validation", () => run({}, root => {
  const archive = createPitchArchive(base).archive(root, "alpha", { apply: true });
  write(root, `.project/compaction/archives/${archive.archiveDir}/files/SHIPPED.md`, "tampered synthetic source");
  assert.throws(() => prepare(root, "alpha", base, { readArchive: true, approveArchiveRead: "fixture tamper check" }), /does not match/);
  assert.match(read(root, ".project/compaction/archive-reads.log"), /fixture tamper check/);
}));

test("refuses absent archives, bad checksums and future archive manifests after recording approval", () => run({}, root => {
  assert.throws(() => prepare(root, "alpha", base, { readArchive: true, approveArchiveRead: "fixture missing archive" }), /No approved source archive/);
  const archive = createPitchArchive(base).archive(root, "alpha", { apply: true });
  const directory = `.project/compaction/archives/${archive.archiveDir}`;
  write(root, `${directory}/ARCHIVE-CHECKSUM`, "invalid");
  assert.throws(() => prepare(root, "alpha", base, { readArchive: true, approveArchiveRead: "fixture checksum" }), /checksum mismatch/);
  const manifest = JSON.parse(read(root, `${directory}/manifest.json`));
  manifest.schemaVersion = 99;
  const future = JSON.stringify(manifest);
  write(root, `${directory}/manifest.json`, future);
  write(root, `${directory}/ARCHIVE-CHECKSUM`, `sha256:${base.crypto.sha256Hex(future)}\n`);
  assert.throws(() => prepare(root, "alpha", base, { readArchive: true, approveArchiveRead: "fixture future schema" }), /Unsupported or malformed archive/);
  assert.equal(read(root, ".project/compaction/archive-reads.log").trim().split("\n").length, 3);
}));

test("refuses aggregate scan overflow without treating an incomplete inventory as valid", () => run({}, root => {
  for (let i = 0; i < Math.ceil(MAX_LEGACY_SCAN_BYTES / (MAX_LEDGER_BYTES - 1)) + 1; i++) {
    write(root, `.project/compaction/ledgers/pitch-${i}.json`, v1(`pitch-${i}`).padEnd(MAX_LEDGER_BYTES - 1, " "));
  }
  assert.throws(() => status(root, withoutArchives()), /scan byte budget exceeded/);
}));

test("refuses unsafe slugs, future or malformed ledgers, damaged markers and oversized inputs", () => run({}, root => {
  for (const slug of ["../alpha", "a/b", "alpha\nforged"]) assert.throws(() => prepare(root, slug, base), /Invalid pitch slug/);
  write(root, ".project/compaction/ledgers/alpha.json", '{"schemaVersion":99}');
  assert.throws(() => status(root, base), /unsupported ledger schemaVersion/);
  write(root, ".project/compaction/ledgers/alpha.json", "{");
  assert.throws(() => prepare(root, "alpha", base), /Invalid legacy JSON/);
  write(root, ".project/compaction/ledgers/alpha.json", "x".repeat(MAX_LEDGER_BYTES + 1));
  assert.throws(() => status(root, base), /bounded/);
  write(root, ".project/compaction/ledgers/alpha.json", v1());
  write(root, DONE_WORK_FILE, "<!-- done-work-index:start -->");
  assert.throws(() => status(root, base), /damaged index markers/);
}));

test("refuses linked evidence, secret paths and linked or full receipt logs without reading archives", () => run({}, root => {
  assert.throws(() => readProjectText(root, "../outside", 4096, base), /unsafe/);
  assert.throws(() => readProjectText(root, "credentials.json", 4096, base), /secret/);
  const file = base.path.join(root, ".project/knowledge/patterns/example.md"), outside = base.path.join(root, "outside.md");
  base.fs.writeFileSync(outside, "outside"); base.fs.unlinkSync(file); base.fs.symlinkSync(outside, file);
  assert.throws(() => prepare(root, "alpha", base), /symlink/);
  base.fs.unlinkSync(file); base.fs.writeFileSync(file, "lesson");
  const log = base.path.join(root, ".project/compaction/archive-reads.log");
  base.fs.symlinkSync(outside, log);
  assert.throws(() => prepare(root, "alpha", withoutArchives(), { readArchive: true, approveArchiveRead: "fixture" }), /symlink/);
  assert.equal(read(root, "outside.md"), "outside");
  base.fs.unlinkSync(log); base.fs.writeFileSync(log, "x".repeat(MAX_RECEIPT_BYTES));
  assert.throws(() => prepare(root, "alpha", withoutArchives(), { readArchive: true, approveArchiveRead: "fixture" }), /receipt log is full/);
}));

test("refuses archive approval during a pending compaction", () => run({ ".project/compaction/transaction.json": "{}" }, root => {
  assert.throws(() => prepare(root, "alpha", withoutArchives(), { readArchive: true, approveArchiveRead: "fixture" }), /Interrupted transaction/);
}));

test("refuses a wrong working directory instead of claiming an empty completed inventory", () => run({}, root => {
  base.fs.rmSync(base.path.join(root, ".project"), { recursive: true });
  assert.throws(() => status(root, base), /installed project root/);
  assert.throws(() => prepare(root, "alpha", base), /installed project root/);
}));

test("exposes read-only status/prepare commands and refuses apply or unsupported options", () => run({}, root => {
  let out = "", err = "";
  const deps: RuntimeDeps = { ...base, proc: { ...base.proc, cwd: () => root }, io: { ...base.io, stdout: { ...base.io.stdout, write: text => { out += text; } }, stderr: { ...base.io.stderr, write: text => { err += text; } } } };
  assert.equal(main(["status", "--json"], deps), 0); assert.equal(JSON.parse(out).pitches.length, 1);
  out = ""; assert.equal(main(["status"], deps), 0); assert.match(out, /alpha: legacy; tier A/);
  out = ""; assert.equal(main(["prepare", "alpha"], deps), 0); assert.equal(JSON.parse(out).draft, true);
  for (const args of [["apply", "alpha"], ["prepare", "alpha", "--apply"], ["prepare", "alpha", "--read-archive"], ["prepare", "alpha", "--approve-archive-read"], ["status", "--read-archive"]]) assert.equal(main(args, deps), 1);
  assert.match(err, /legacy-upgrade:/);
}));

// Apply tests use original text in synthetic archives, never this checkout's recovery data.
function approvedFixture(root: string): ApprovedUpgrade {
  for (const args of [["init", "-q"], ["add", ".project/compaction/ledgers/alpha.json", ".project/knowledge/patterns/example.md"], ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", "commit", "-qm", "Introduce legacy ledger"]]) {
    const result = base.child.runSync("git", args, { cwd: root }); assert.equal(result.status, 0, result.stderr);
  }
  createPitchArchive(base).archive(root, "alpha", { apply: true });
  const compressor = createPitchCompress(base);
  const evidence = compressor.archivedEvidence(new Map([["SHIPPED.md", read(root, ".project/pitches/alpha/SHIPPED.md")]]));
  const prepared = prepare(root, "alpha", withoutArchives());
  base.fs.rmSync(base.path.join(root, ".project/pitches/alpha"), { recursive: true });
  return { ledgerHash: prepared.ledgerHash, legacyEntryHash: prepared.legacyEntryHash!, bindings: prepared.bindings,
    mapping: { schemaVersion: 2, sections: evidence.sections.map(section => ({ source: section.key, class: "know-how", disposition: "extracted", destination: ".project/knowledge/patterns/example.md", helps: "Find the preserved lesson.", bodyHash: bodyHashOf(section.body, data => base.crypto.sha256Hex(data)) })), otherFiles: evidence.files.map(file => ({ ...file, disposition: "omitted", reason: "process-noise" })) }, outcomeRecord: record("alpha") };
}
const approvalOptions = { apply: true, readArchive: true, approveArchiveRead: "Synthetic fixture source validation" };
const graphCalls: string[][] = [];
const applyDeps: RuntimeDeps = { ...base, child: { ...base.child, runSync: (_command, args) => { graphCalls.push(args); return { status: 0, signal: null, stdout: "{}", stderr: "" }; } } };
const immutable = (root: string): Record<string, string> => Object.fromEntries(Object.entries(tree(root)).filter(([path]) => path.includes("/archives/") || path.endsWith(".v1.json")));

test("dry run validates the approval but publishes no upgrade artifacts", () => run({}, root => {
  const approved = approvedFixture(root), before = tree(root);
  assert.deepEqual(apply(root, "alpha", approved, applyDeps, { ...approvalOptions, apply: false }), { slug: "alpha", applied: false });
  const after = tree(root); delete after[".project/compaction/archive-reads.log"];
  assert.deepEqual(after, before);
  assert.equal(status(root, base)[0].state, "legacy");
}));

test("upgrades a removed pitch, retains exact v1 bytes, lints, indexes once and replays without rewriting", () => run({}, root => {
  const approved = approvedFixture(root), archiveBefore = immutable(root), original = read(root, ".project/compaction/ledgers/alpha.json");
  graphCalls.length = 0;
  assert.equal(apply(root, "alpha", approved, applyDeps, approvalOptions).applied, true);
  assert.equal(read(root, ".project/compaction/ledgers/alpha.v1.json"), original);
  assert.equal(status(root, base)[0].state, "upgraded");
  assert.equal(compactedSlugs(root, base).size, 1);
  const snapshot = buildSnapshot(root, { now: "2026-10-22T12:00:00.000Z" });
  assert.equal(snapshot.doneWork.value?.compacted, 1);
  assert.equal(createPitchCompress(applyDeps).inventory(root).filter(row => row.slug === "alpha").length, 1);
  assert.deepEqual(lintOutcomeRecord(root, ".project/records/shipped/alpha.md", base).problems, []);
  assert.equal((read(root, DONE_WORK_FILE).match(/^- \[alpha\]/gm) ?? []).length, 1);
  assert.ok(!read(root, DONE_WORK_FILE).includes(legacy));
  assert.deepEqual(graphCalls.slice(-2).map(args => args.includes("--check")), [false, true]);
  assert.ok(createPitchArchive(base).verify(root, "alpha").valid);
  const settled = tree(root), retained = immutable(root);
  apply(root, "alpha", approved, applyDeps, approvalOptions);
  const replay = tree(root); delete replay[".project/compaction/archive-reads.log"]; delete settled[".project/compaction/archive-reads.log"];
  assert.deepEqual(replay, settled); assert.deepEqual(immutable(root), retained);
  for (const [path, hash] of Object.entries(archiveBefore)) assert.equal(tree(root)[path], hash);
}));

for (const step of [1, 2, 3, 4, 5]) test(`resumes after SIGKILL at completed step ${step} without losing discovery or original evidence`, () => run({}, root => {
  const approved = approvedFixture(root), archiveBefore = immutable(root);
  write(root, "approved.json", JSON.stringify(approved));
  const moduleUrl = new URL("./legacy-upgrade.mts", import.meta.url).href;
  const depsUrl = new URL("./runtime/node.mts", import.meta.url).href;
  const program = `import {apply} from ${JSON.stringify(moduleUrl)}; import {createNodeDeps} from ${JSON.stringify(depsUrl)}; import fs from 'node:fs'; const base=createNodeDeps(); const deps={...base,child:{...base.child,runSync:()=>({status:0,signal:null,stdout:'{}',stderr:''})}}; apply(process.cwd(),'alpha',JSON.parse(fs.readFileSync('approved.json','utf8')),deps,{...${JSON.stringify(approvalOptions)},afterStep:n=>{if(n===${step})process.kill(process.pid,'SIGKILL')}});`;
  const killed = base.child.runSync("node", ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", "--input-type=module", "-e", program], { cwd: root });
  assert.equal(killed.signal, "SIGKILL", killed.stderr);
  const done = read(root, DONE_WORK_FILE);
  assert.ok(legacyEntries(done).has("alpha") || done.includes("- [alpha](records/shipped/alpha.md)"));
  assert.equal(read(root, ".project/compaction/ledgers/alpha.v1.json"), v1());
  assert.equal(status(root, base).filter(row => row.slug === "alpha").length, 1);
  assert.equal(compactedSlugs(root, base).size, 1);
  const snapshot = buildSnapshot(root, { now: "2026-10-22T12:00:00.000Z" });
  assert.equal(snapshot.doneWork.value?.compacted, 1);
  assert.equal(createPitchCompress(applyDeps).inventory(root).filter(row => row.slug === "alpha").length, 1);
  apply(root, "alpha", approved, applyDeps, approvalOptions);
  assert.equal(status(root, base)[0].state, "upgraded");
  for (const [path, hash] of Object.entries(archiveBefore)) assert.equal(tree(root)[path], hash);
}));

test("refuses unapproved apply before all archive operations and publication", () => run({}, root => {
  const approved = approvedFixture(root), before = tree(root);
  assert.throws(() => apply(root, "alpha", approved, withoutArchives(), { apply: true }), /Archive read refused/);
  assert.deepEqual(tree(root), before);
}));

for (const [name, edit, pattern] of [
  ["changed v1", (root: string) => write(root, ".project/compaction/ledgers/alpha.json", `${v1()} `), /ledger binding conflict/],
  ["changed destination", (root: string) => write(root, ".project/knowledge/patterns/example.md", "changed destination"), /Destination binding conflict/],
  ["changed narrative", (root: string) => write(root, DONE_WORK_FILE, `${read(root, DONE_WORK_FILE)}changed`), /narrative binding conflict/],
  ["outcome collision", (root: string) => write(root, ".project/records/shipped/alpha.md", "existing other record"), /Outcome record conflict/],
  ["sibling collision", (root: string) => write(root, ".project/compaction/ledgers/alpha.v1.json", "{}"), /sibling conflict/],
] as const) test(`refuses ${name} without overwriting evidence`, () => run({}, root => {
  const approved = approvedFixture(root); edit(root); const before = tree(root);
  assert.throws(() => apply(root, "alpha", approved, applyDeps, approvalOptions), pattern);
  assert.deepEqual(tree(root), before);
}));

for (const [name, change, pattern] of [
  ["stale section hash", (a: ApprovedUpgrade) => { a.mapping.sections[0].bodyHash = `sha256:${"0".repeat(64)}`; }, /Stale content hash/],
  ["unknown section", (a: ApprovedUpgrade) => { a.mapping.sections[0].source = "SHIPPED.md#invented"; }, /unknown required section/],
  ["missing file accounting", (a: ApprovedUpgrade) => { a.mapping.otherFiles = []; }, /does not account/],
  ["invented class", (a: ApprovedUpgrade) => { (a.mapping.sections[0] as unknown as { class: string }).class = "invented"; }, /Invalid ledger/],
  ["unaccepted omission", (a: ApprovedUpgrade) => { a.mapping.otherFiles![0].reason = "other"; }, /Unaccepted gap/],
  ["missing original hash", (a: ApprovedUpgrade) => { delete a.mapping.sections[0].bodyHash; }, /all original content hashes/],
  ["draft outcome", (a: ApprovedUpgrade) => { a.outcomeRecord = a.outcomeRecord.replace("schemaVersion: 1", "schemaVersion: 1\ndraft: true"); }, /Invalid approved outcome/],
] as const) test(`shared validator refuses ${name}`, () => run({}, root => {
  const approved = approvedFixture(root); change(approved); const original = read(root, ".project/compaction/ledgers/alpha.json");
  assert.throws(() => apply(root, "alpha", approved, applyDeps, approvalOptions), pattern);
  assert.equal(read(root, ".project/compaction/ledgers/alpha.json"), original);
  assert.equal(status(root, base)[0].state, "legacy");
}));

test("refuses changed committed approval, retained sibling and destinations on replay", () => run({}, root => {
  const approved = approvedFixture(root); apply(root, "alpha", approved, applyDeps, approvalOptions);
  const changed = { ...approved, outcomeRecord: approved.outcomeRecord.replace("fixture change", "other change") };
  assert.throws(() => apply(root, "alpha", changed, applyDeps, approvalOptions), /different approval/);
  write(root, ".project/knowledge/patterns/example.md", "later content");
  assert.throws(() => apply(root, "alpha", approved, applyDeps, approvalOptions), /Destination binding conflict/);
}));

test("graph failure preserves discoverability and resumes graph rebuild/check", () => run({}, root => {
  const approved = approvedFixture(root);
  const failed: RuntimeDeps = { ...applyDeps, child: { ...applyDeps.child, runSync: (_command, args) => ({ status: args.includes("--check") ? 0 : 1, signal: null, stdout: "{}", stderr: "" }) } };
  assert.throws(() => apply(root, "alpha", approved, failed, approvalOptions), /graph rebuild failed/);
  assert.equal(status(root, base)[0].state, "upgraded");
  apply(root, "alpha", approved, applyDeps, approvalOptions);
}));

test("CLI gates publication behind --apply, supports approved JSON data and refuses secret inputs", () => run({}, root => {
  const approved = approvedFixture(root); write(root, "approved.json", JSON.stringify(approved));
  let out = "";
  const deps = { ...applyDeps, proc: { ...applyDeps.proc, cwd: () => root }, io: { ...base.io, stdout: { write: (text: string) => { out += text; } }, stderr: { write: (_text: string) => {} } } } as RuntimeDeps;
  const args = ["apply", "alpha", "--file", "approved.json", "--read-archive", "--approve-archive-read", "fixture CLI approval"];
  assert.equal(main(args, deps), 0); assert.equal(JSON.parse(out).applied, false);
  assert.equal(status(root, base)[0].state, "legacy"); out = "";
  assert.equal(main([...args, "--apply"], deps), 0); assert.equal(JSON.parse(out).applied, true);
  assert.equal(main(["apply", "alpha", "--file", ".env"], deps), 1);
}));


function driftFixture(root: string, edit = "changed after the v1 commit") {
  const approved = approvedFixture(root);
  const file = ".project/knowledge/patterns/example.md";
  const committed = `sha256:${base.crypto.sha256Hex("# Lesson\n\nReusable content.\n")}`;
  write(root, file, edit);
  const current = `sha256:${base.crypto.sha256Hex(edit)}`;
  approved.bindings[file] = current;
  return { approved, file, committed, current };
}

test("applies a reviewed destination drift bound by both hashes and a reason", () => run({}, root => {
  const { approved, file, committed, current } = driftFixture(root);
  approved.acceptDestinationDrift = { [file]: { committed, current, reason: "Living pattern edited after v1; reviewed diff keeps every cited lesson" } };
  assert.equal(apply(root, "alpha", approved, applyDeps, approvalOptions).applied, true);
  assert.equal(status(root, base)[0].state, "upgraded");
}));

test("refuses drift acceptance with a wrong hash, no match, a later edit or a malformed entry", () => run({}, root => {
  const { approved, file, committed, current } = driftFixture(root);
  const before = tree(root), reason = "Reviewed";
  for (const [label, drift, pattern] of [
    ["wrong committed", { [file]: { committed: current, current, reason } }, /changed since v1 commit/],
    ["wrong current", { [file]: { committed, current: committed, reason } }, /changed since v1 commit/],
    ["unused entry", { [file]: { committed, current, reason }, ".project/knowledge/patterns/other.md": { committed, current, reason } }, /does not match a drifted/],
    ["blank reason", { [file]: { committed, current, reason: "  " } }, /Malformed destination drift/],
    ["bad hash", { [file]: { committed: "nope", current, reason } }, /Malformed destination drift/],
    ["unsafe path", { "../outside.md": { committed, current, reason } }, /Malformed destination drift/],
  ] as const) {
    assert.throws(() => apply(root, "alpha", { ...approved, acceptDestinationDrift: drift } as never, applyDeps, approvalOptions), pattern, label);
    assert.deepEqual(tree(root), before, label);
  }
  // A reviewed hash pair does not cover a further edit.
  write(root, file, "edited again after review");
  approved.bindings[file] = `sha256:${base.crypto.sha256Hex("edited again after review")}`;
  assert.throws(() => apply(root, "alpha", { ...approved, acceptDestinationDrift: { [file]: { committed, current, reason } } }, applyDeps, approvalOptions), /changed since v1 commit/);
}));

test("an acceptance for an undrifted destination is refused", () => run({}, root => {
  const approved = approvedFixture(root), file = ".project/knowledge/patterns/example.md";
  const hashOf = `sha256:${base.crypto.sha256Hex("# Lesson\n\nReusable content.\n")}`;
  assert.throws(() => apply(root, "alpha", { ...approved, acceptDestinationDrift: { [file]: { committed: hashOf, current: hashOf, reason: "Reviewed" } } }, applyDeps, approvalOptions), /does not match a drifted/);
}));

for (const trailing of [false, true]) test(`retiring a narrative leaves its neighbours byte-identical so their own bindings still hold (${trailing ? "followed by another entry" : "last entry"})`, () => run({}, root => {
  const approved = approvedFixture(root);
  const done = read(root, DONE_WORK_FILE), at = done.indexOf("## alpha — shipped");
  write(root, DONE_WORK_FILE, `${done.slice(0, at)}## beta — shipped 2026-10-01\n\nNeighbour before.\n\n${done.slice(at)}${trailing ? "\n## gamma — shipped 2026-10-01\n\nNeighbour after.\n" : ""}`);
  const entry = (text: string, slug: string): string => { const start = text.indexOf(`## ${slug} — shipped`), next = text.indexOf("\n## ", start + 4); return start < 0 ? "" : text.slice(start, next < 0 ? text.length : next); };
  const text = read(root, DONE_WORK_FILE), before = { beta: entry(text, "beta"), gamma: entry(text, "gamma") };
  assert.equal(apply(root, "alpha", approved, applyDeps, approvalOptions).applied, true);
  const after = read(root, DONE_WORK_FILE);
  assert.equal(after.includes("## alpha — shipped"), false);
  assert.equal(entry(after, "beta"), before.beta);
  assert.equal(entry(after, "gamma"), before.gamma);
}));

test("detects a legacy destination changed before preparation using introducing-commit evidence", () => run({}, root => {
  const approved = approvedFixture(root);
  write(root, ".project/knowledge/patterns/example.md", "changed before fresh preparation");
  approved.bindings[".project/knowledge/patterns/example.md"] = `sha256:${base.crypto.sha256Hex("changed before fresh preparation")}`;
  const before = tree(root);
  assert.throws(() => apply(root, "alpha", approved, applyDeps, approvalOptions), /changed since v1 commit/);
  assert.deepEqual(tree(root), before);
}));

test("binds a newly selected durable destination explicitly and supports TOON approval files", () => run({}, root => {
  const approved = approvedFixture(root), target = ".project/knowledge/patterns/new.md", text = "# Newly reviewed durable content\n";
  write(root, target, text);
  approved.mapping.sections[0].destination = target;
  assert.throws(() => apply(root, "alpha", approved, applyDeps, approvalOptions), /Destination binding conflict/);
  approved.bindings[target] = `sha256:${base.crypto.sha256Hex(text)}`;
  assert.equal(writeData(root, "approved.toon", approved, base).status, "written");
  let output = "";
  const deps = { ...applyDeps, proc: { ...applyDeps.proc, cwd: () => root }, io: { ...base.io, stdout: { write: (text: string) => { output += text; } } } } as RuntimeDeps;
  assert.equal(main(["apply", "alpha", "--file", "approved.toon", "--apply", "--read-archive", "--approve-archive-read", "fixture reviewed alternate target"], deps), 0);
  assert.equal(JSON.parse(output).applied, true);
}));

test("refuses absent Git history, unresolved draft and modified retained sibling without archive access", () => run({}, root => {
  const approved = approvedFixture(root);
  assert.throws(() => apply(root, "alpha", { ...approved, draft: true } as ApprovedUpgrade, withoutArchives(), approvalOptions), /Unresolved draft/);
  base.fs.rmSync(base.path.join(root, ".git"), { recursive: true });
  assert.throws(() => apply(root, "alpha", approved, withoutArchives(), approvalOptions), /Commit-time destination evidence unavailable/);
}));

test("runs the real bundle graph validator and rebuild pipeline with a fixture Graphify executable", () => run({}, root => {
  const knowledge = (id: string, related: string): string => `---\nid: ${id}\ntype: pattern\ntags: [fixture]\ncreated: 2026-10-01\nupdated: 2026-10-01\nrelated: [${related}]\n---\n# ${id}\n\nReusable lesson.\n`;
  write(root, ".project/knowledge/patterns/example.md", knowledge("example", "second"));
  write(root, ".project/knowledge/patterns/second.md", knowledge("second", "example"));
  const approved = approvedFixture(root);
  write(root, "stub-graphify", `#!/bin/sh\nmkdir -p graphify-out\nprintf '%s\\n' '{"nodes":[],"links":[],"graph":{}}' > graphify-out/graph.json\n`);
  base.fs.chmodSync(base.path.join(root, "stub-graphify"), 0o755);
  const deps = { ...base, proc: { ...base.proc, env: { ...base.proc.env, GRAPHIFY_BIN: base.path.join(root, "stub-graphify") } } };
  apply(root, "alpha", approved, deps, approvalOptions);
  assert.equal(status(root, base)[0].state, "upgraded");
  const graph = JSON.parse(read(root, "graphify-out/graph.json"));
  assert.equal(graph.nodes.filter((node: { node_kind: string }) => node.node_kind === "knowledge").length, 2);
  assert.ok(read(root, ".project/knowledge/index.md").includes("example"));
}));
