import { NODE_FLAGS } from "./runtime/entry.mts";
const RUNTIME_FLAGS = process.versions.bun ? [] : NODE_FLAGS;
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";

import { createNodeDeps } from "./runtime/node.mts";
import * as archiveModule from "./pitch-archive.mts";
import * as compressModule from "./pitch-compress.mts";

const { archive, verify, remove, restore, latestArchiveDir, ledgerCommitted, createPitchArchive } = archiveModule;
const { commitLedger, buildLedger } = compressModule;

const __dirname = import.meta.dirname;

function write(root, name, value) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}
function read(root, name) { return fs.readFileSync(path.join(root, name), "utf8"); }
function exists(root, name) { return fs.existsSync(path.join(root, name)); }

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pitch-archive-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "ai-framework/scripts"), { recursive: true });
  fs.copyFileSync(path.join(__dirname, "graphify.mts"), path.join(root, "ai-framework/scripts/graphify.mts"));
  for (const dir of ["decisions", "patterns", "entities", "issues"]) fs.mkdirSync(path.join(root, `.project/knowledge/${dir}`), { recursive: true });
  return root;
}

function seedShippedPitch(root, slug) {
  const dir = `.project/pitches/${slug}`;
  write(root, `${dir}/SHIPPED.md`, "# Shipped\n\n**Shipped:** 2026-09-25\n\n## Summary\n\nDone.\n");
  write(root, `${dir}/pitch.md`, "# Pitch\n");
  write(root, `${dir}/deviations.md`, "notes\n");
  return dir;
}

// A fully committed ledger for a fixture pitch: extracts its one required section to an
// existing file outside the pitch directory.
function commitFixtureLedger(root, slug) {
  write(root, "notes/dest.md", "extracted");
  const required = buildLedger(root, slug).required;
  commitLedger(root, slug, { sections: required.map((source) => ({ source, status: "extracted", destination: "notes/dest.md" })) }, { apply: true });
}

test("archive writes a byte-identical copy plus a verifiable manifest and checksum outside .project/pitches/", (t) => {
  const root = fixture(t);
  const dir = seedShippedPitch(root, "byte-fixture");
  const preview = archive(root, "byte-fixture");
  assert.equal(preview.applied, false);
  assert.equal(exists(root, `.project/compaction/archives/${preview.archiveDir}`), false, "preview writes nothing");
  const applied = archive(root, "byte-fixture", { apply: true });
  assert.equal(applied.applied, true);
  assert.equal(applied.fileCount, 3);
  for (const file of ["SHIPPED.md", "pitch.md", "deviations.md"]) {
    assert.equal(read(root, `.project/compaction/archives/${applied.archiveDir}/files/${file}`), read(root, `${dir}/${file}`), `${file} must be byte-identical`);
  }
  const manifest = JSON.parse(read(root, `.project/compaction/archives/${applied.archiveDir}/manifest.json`));
  assert.equal(manifest.slug, "byte-fixture");
  assert.equal(Object.keys(manifest.files).length, 3);
  assert.match(read(root, `.project/compaction/archives/${applied.archiveDir}/ARCHIVE-CHECKSUM`).trim(), /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(verify(root, "byte-fixture"), { slug: "byte-fixture", archiveDir: applied.archiveDir, valid: true, issues: [] });
});

test("archive refuses a symlink inside the source tree rather than silently skipping or following it", (t) => {
  const root = fixture(t);
  const dir = seedShippedPitch(root, "symlinked");
  write(root, "outside.md", "elsewhere");
  fs.symlinkSync(path.join(root, "outside.md"), path.join(root, dir, "linked.md"));
  assert.throws(() => archive(root, "symlinked", { apply: true }), /Symlink forbidden/);
});

test("verify distinguishes a tampered archived file from a tampered manifest", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "tamper-fixture");
  const { archiveDir } = archive(root, "tamper-fixture", { apply: true });
  assert.equal(verify(root, "tamper-fixture").valid, true);

  write(root, `.project/compaction/archives/${archiveDir}/files/pitch.md`, "tampered content");
  const fileTampered = verify(root, "tamper-fixture");
  assert.equal(fileTampered.valid, false);
  assert.match(fileTampered.issues.join(";"), /archived file changed since archiving: pitch\.md/);

  write(root, `.project/compaction/archives/${archiveDir}/files/pitch.md`, "# Pitch\n"); // restore it
  assert.equal(verify(root, "tamper-fixture").valid, true, "sanity: fixed file alone is valid again");

  const manifest = JSON.parse(read(root, `.project/compaction/archives/${archiveDir}/manifest.json`));
  manifest.files["pitch.md"].hash = "0".repeat(64);
  write(root, `.project/compaction/archives/${archiveDir}/manifest.json`, JSON.stringify(manifest));
  const manifestTampered = verify(root, "tamper-fixture");
  assert.equal(manifestTampered.valid, false);
  assert.match(manifestTampered.issues.join(";"), /manifest checksum mismatch/);
});

test("verify reports no archive found, distinctly, rather than throwing", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "never-archived");
  assert.deepEqual(verify(root, "never-archived"), { slug: "never-archived", valid: false, issues: ["no archive found"] });
});

test("remove refuses without a verified archive, without a committed ledger, and on a conflict — only then deletes", (t) => {
  const root = fixture(t);
  const dir = seedShippedPitch(root, "gated-removal");
  assert.throws(() => remove(root, "gated-removal", { apply: true }), /archive is not verified/);

  archive(root, "gated-removal", { apply: true });
  assert.throws(() => remove(root, "gated-removal", { apply: true }), /no committed coverage ledger/);

  commitFixtureLedger(root, "gated-removal");
  write(root, `${dir}/pitch.md`, "edited after archiving");
  assert.throws(() => remove(root, "gated-removal", { apply: true }), /conflict/i);
  assert.equal(read(root, `${dir}/pitch.md`), "edited after archiving", "a conflicting file is left exactly as edited, never overwritten or removed");

  write(root, `${dir}/pitch.md`, "# Pitch\n"); // revert the conflicting edit
  const preview = remove(root, "gated-removal");
  assert.equal(preview.applied, false);
  assert.equal(exists(root, dir), true, "preview removes nothing");
  const applied = remove(root, "gated-removal", { apply: true });
  assert.equal(applied.applied, true);
  assert.equal(applied.removedCount, 3);
  assert.deepEqual(fs.readdirSync(path.join(root, dir)), [], "files are gone; the now-empty directory itself is left (informational, harmless)");
});

test("remove treats an added or removed file since archiving as a conflict too, not just a changed one", (t) => {
  const root = fixture(t);
  const dir = seedShippedPitch(root, "file-set-changed");
  archive(root, "file-set-changed", { apply: true });
  commitFixtureLedger(root, "file-set-changed");
  write(root, `${dir}/extra-file.md`, "new file not in the archive");
  assert.throws(() => remove(root, "file-set-changed", { apply: true }), /file set changed since archiving/);
});

test("remove is a true no-op once already removed, reported distinctly rather than erroring or re-deleting", (t) => {
  const root = fixture(t);
  const dir = seedShippedPitch(root, "already-gone");
  archive(root, "already-gone", { apply: true });
  commitFixtureLedger(root, "already-gone");
  remove(root, "already-gone", { apply: true });
  assert.throws(() => remove(root, "already-gone", { apply: true }), /Already removed/);
  assert.equal(exists(root, dir), true, "the directory (now empty from the first removal) is untouched by the repeat call");
});

test("restore reproduces the original directory byte-for-byte and refuses to overwrite a non-empty destination without --force", (t) => {
  const root = fixture(t);
  const dir = seedShippedPitch(root, "restore-fixture");
  const originalFiles = { "SHIPPED.md": read(root, `${dir}/SHIPPED.md`), "pitch.md": read(root, `${dir}/pitch.md`), "deviations.md": read(root, `${dir}/deviations.md`) };
  archive(root, "restore-fixture", { apply: true });
  commitFixtureLedger(root, "restore-fixture");
  remove(root, "restore-fixture", { apply: true });
  fs.rmSync(path.join(root, dir), { recursive: true, force: true });

  const preview = restore(root, "restore-fixture");
  assert.equal(preview.applied, false);
  assert.equal(exists(root, dir), false, "preview writes nothing");
  const applied = restore(root, "restore-fixture", { apply: true });
  assert.equal(applied.applied, true);
  assert.equal(applied.fileCount, 3);
  for (const [file, content] of Object.entries(originalFiles)) assert.equal(read(root, `${dir}/${file}`), content, `${file} must round-trip byte-for-byte`);

  write(root, `${dir}/pitch.md`, "still here");
  assert.throws(() => restore(root, "restore-fixture", { apply: true }), /already exists and is non-empty/);
  assert.equal(read(root, `${dir}/pitch.md`), "still here", "refused restore must not touch the existing content");
  restore(root, "restore-fixture", { apply: true, force: true });
  assert.equal(read(root, `${dir}/pitch.md`), originalFiles["pitch.md"], "--force actually overwrites");
});

test("restore supports an explicit --to destination for inspecting an archive without restoring in place", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "to-fixture");
  archive(root, "to-fixture", { apply: true });
  const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), "pitch-archive-to-"));
  t.after(() => fs.rmSync(elsewhere, { recursive: true, force: true }));
  const result = restore(root, "to-fixture", { to: elsewhere, apply: true });
  assert.equal(result.destination, elsewhere);
  assert.equal(fs.readFileSync(path.join(elsewhere, "pitch.md"), "utf8"), "# Pitch\n");
  assert.equal(exists(root, ".project/pitches/to-fixture/pitch.md"), true, "the original in-tree pitch is untouched");
});

test("latestArchiveDir returns the most recent of multiple archives for the same slug", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "multi-archive");
  const first = archive(root, "multi-archive", { apply: true });
  const second = archive(root, "multi-archive", { apply: true });
  assert.notEqual(first.archiveDir, second.archiveDir);
  assert.equal(latestArchiveDir(root, "multi-archive"), second.archiveDir);
});

test("ledgerCommitted and archive both throw clearly for an invalid slug or a missing pitch directory", (t) => {
  const root = fixture(t);
  assert.throws(() => archive(root, "../escape", { apply: true }), /Invalid pitch slug/);
  assert.throws(() => archive(root, "does-not-exist", { apply: true }), /No such pitch directory/);
  assert.equal(ledgerCommitted(root, "does-not-exist"), false);
});

test("CLI end to end: archive, verify, remove, restore, recover, including --json and error paths", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "cli-fixture");
  commitFixtureLedger(root, "cli-fixture");
  const script = path.join(__dirname, "pitch-archive.mts");
  const run = (...args) => spawnSync(process.execPath, [...RUNTIME_FLAGS, script, ...args, "--root", root], { encoding: "utf8" });

  const archiveResult = run("archive", "cli-fixture", "--apply");
  assert.equal(archiveResult.status, 0, archiveResult.stderr);
  const verifyResult = run("verify", "cli-fixture");
  assert.equal(verifyResult.status, 0);
  assert.equal(JSON.parse(verifyResult.stdout).valid, true);

  const removeResult = run("remove", "cli-fixture", "--apply");
  assert.equal(removeResult.status, 0, removeResult.stderr);
  const restoreResult = run("restore", "cli-fixture", "--apply");
  assert.equal(restoreResult.status, 0, restoreResult.stderr);
  assert.equal(read(root, ".project/pitches/cli-fixture/pitch.md"), "# Pitch\n");

  const recoverPreview = run("recover");
  assert.equal(recoverPreview.status, 0);
  assert.deepEqual(JSON.parse(recoverPreview.stdout), { action: "recover", pending: false, applied: false });

  const badAction = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "bogus"], { encoding: "utf8" });
  assert.equal(badAction.status, 1);
  assert.match(badAction.stderr, /Usage:/);
});

// pitch-archive.mts has no self-kill test hook of its own (that would be dead code kept only
// for tests) — instead this runs a small purpose-built child process that calls the real
// transact() the same way remove() does, with a real afterWrite callback that sends SIGKILL to
// itself mid-transaction. Matches the same real-subprocess-interruption approach add-skill's
// own S1 tests already use, rather than faking a journal by hand.
function killMidTransaction(root, dirRel) {
  const killer = path.join(root, "kill-mid-transact.js");
  fs.writeFileSync(killer, `
const { transact, digest } = require(${JSON.stringify(path.join(__dirname, "skill-registry.mts"))});
const fs = require("node:fs");
const path = require("node:path");
const root = ${JSON.stringify(fs.realpathSync(root))};
const dirRel = ${JSON.stringify(dirRel)};
const files = fs.readdirSync(path.join(root, dirRel)).sort();
const ops = files.map((file) => {
  const data = fs.readFileSync(path.join(root, dirRel, file));
  const stat = fs.statSync(path.join(root, dirRel, file));
  return { path: \`\${dirRel}/\${file}\`, expected: digest(data), expectedMode: stat.mode & 0o777, value: null };
});
transact({ roots: { target: root }, state: ".project/compaction" }, ops, { afterWrite: (index) => { if (index === 0) process.kill(process.pid, "SIGKILL"); } });
`);
  const result = spawnSync(process.execPath, [...RUNTIME_FLAGS, killer], { encoding: "utf8" });
  fs.rmSync(killer, { force: true });
  return result;
}

test("a real interrupted remove leaves recoverable, genuinely-partial state (not silently whole)", (t) => {
  const root = fixture(t);
  const dir = seedShippedPitch(root, "real-interruption");
  archive(root, "real-interruption", { apply: true });
  commitFixtureLedger(root, "real-interruption");
  const before = fs.readdirSync(path.join(root, dir)).sort();

  const killed = killMidTransaction(root, dir);
  assert.equal(killed.signal, "SIGKILL");
  const midway = fs.readdirSync(path.join(root, dir)).sort();
  assert.notDeepEqual(midway, before, "the kill must have landed mid-transaction, not before or after it");
  assert.equal(exists(root, ".project/compaction/transaction.json"), true, "an interrupted transaction leaves journal evidence");
  assert.throws(() => remove(root, "real-interruption", { apply: true }), /Interrupted transaction: run recover/, "remove() itself refuses to proceed past a pending transaction rather than compounding it");
});

test("recover() restores the exact pre-interruption files after a real kill mid-transaction", (t) => {
  const root = fixture(t);
  const dir = seedShippedPitch(root, "recover-fixture");
  archive(root, "recover-fixture", { apply: true });
  commitFixtureLedger(root, "recover-fixture");
  const originalContent = {};
  for (const file of fs.readdirSync(path.join(root, dir))) originalContent[file] = read(root, `${dir}/${file}`);

  const killer = path.join(root, "kill-mid-transact.js");
  fs.writeFileSync(killer, `
const { transact, digest } = require(${JSON.stringify(path.join(__dirname, "skill-registry.mts"))});
const fs = require("node:fs");
const path = require("node:path");
const root = ${JSON.stringify(fs.realpathSync(root))};
const dirRel = ${JSON.stringify(dir)};
const files = fs.readdirSync(path.join(root, dirRel)).sort();
const ops = files.map((file) => {
  const data = fs.readFileSync(path.join(root, dirRel, file));
  const stat = fs.statSync(path.join(root, dirRel, file));
  return { path: \`\${dirRel}/\${file}\`, expected: digest(data), expectedMode: stat.mode & 0o777, value: null };
});
transact({ roots: { target: root }, state: ".project/compaction" }, ops, { afterWrite: (index) => { if (index === 0) process.kill(process.pid, "SIGKILL"); } });
`);
  const killed = spawnSync(process.execPath, [...RUNTIME_FLAGS, killer], { encoding: "utf8" });
  assert.equal(killed.signal, "SIGKILL");
  assert.equal(exists(root, ".project/compaction/transaction.json"), true);

  const script = path.join(__dirname, "pitch-archive.mts");
  const recovered = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "recover", "--root", root, "--apply"], { encoding: "utf8" });
  assert.equal(recovered.status, 0, recovered.stderr);
  assert.equal(JSON.parse(recovered.stdout).recovered, true);
  for (const [file, content] of Object.entries(originalContent)) assert.equal(read(root, `${dir}/${file}`), content, `${file} must be exactly restored after recovery`);
  assert.equal(exists(root, ".project/compaction/transaction.json"), false);

  // remove() now proceeds cleanly against the recovered, intact state.
  const applied = remove(root, "recover-fixture", { apply: true });
  assert.equal(applied.applied, true);
});

test("latestArchiveDir/verify/restore never cross over to a different pitch whose slug merely starts with this one", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "foo");
  seedShippedPitch(root, "foo-bar");
  write(root, ".project/pitches/foo-bar/pitch.md", "the OTHER pitch's content");
  const foo = archive(root, "foo", { apply: true });
  const fooBar = archive(root, "foo-bar", { apply: true });
  assert.equal(latestArchiveDir(root, "foo"), foo.archiveDir, "foo must resolve to its own archive even though foo-bar's sorts later");
  assert.equal(latestArchiveDir(root, "foo-bar"), fooBar.archiveDir);
  assert.equal(verify(root, "foo").archiveDir, foo.archiveDir);
  fs.rmSync(path.join(root, ".project/pitches/foo"), { recursive: true });
  restore(root, "foo", { apply: true });
  assert.equal(read(root, ".project/pitches/foo/pitch.md"), "# Pitch\n", "restoring foo must not pull in foo-bar's files or content");
});

test("verify rejects a manifest belonging to a different slug and one with an unsafe file path", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "manifest-guard");
  const { archiveDir } = archive(root, "manifest-guard", { apply: true });
  const manifestFile = `.project/compaction/archives/${archiveDir}/manifest.json`;
  const original = JSON.parse(read(root, manifestFile));
  const rewrite = (manifest) => {
    const raw = JSON.stringify(manifest, null, 2) + "\n";
    write(root, manifestFile, raw);
    write(root, `.project/compaction/archives/${archiveDir}/ARCHIVE-CHECKSUM`, `sha256:${createHash("sha256").update(raw).digest("hex")}\n`);
  };
  rewrite({ ...original, slug: "someone-else" });
  assert.match(verify(root, "manifest-guard").issues.join(";"), /manifest slug mismatch/);
  rewrite({ ...original, files: { ...original.files, "../../escape.txt": original.files["pitch.md"] } });
  assert.match(verify(root, "manifest-guard").issues.join(";"), /unsafe path in manifest/, "a consistently re-checksummed manifest with a ../ key must still be rejected");
});

test("restore refuses an unverified archive, and never writes outside the destination from a hostile manifest", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "hostile-restore");
  const { archiveDir } = archive(root, "hostile-restore", { apply: true });
  const dest = path.join(root, "restore-dest");
  const manifestFile = `.project/compaction/archives/${archiveDir}/manifest.json`;
  const manifest = JSON.parse(read(root, manifestFile));
  manifest.files["../../../escaped.txt"] = manifest.files["pitch.md"];
  write(root, manifestFile, JSON.stringify(manifest));
  write(root, "escaped.txt", "PRE-EXISTING, must not be overwritten");
  assert.throws(() => restore(root, "hostile-restore", { apply: true, to: dest }), /Refusing to restore: archive is not verified/);
  assert.equal(read(root, "escaped.txt"), "PRE-EXISTING, must not be overwritten");
  assert.equal(exists(root, "restore-dest"), false, "a refused restore writes nothing at all");

  // A tampered archived file is also refused rather than silently restored as if original.
  const clean = fixture(t);
  seedShippedPitch(clean, "tampered-restore");
  const second = archive(clean, "tampered-restore", { apply: true });
  write(clean, `.project/compaction/archives/${second.archiveDir}/files/pitch.md`, "TAMPERED");
  fs.rmSync(path.join(clean, ".project/pitches/tampered-restore"), { recursive: true });
  assert.throws(() => restore(clean, "tampered-restore", { apply: true }), /archived file changed since archiving/);
});

test("remove refuses a ledger with an unaccepted gap even when it was hand-placed, bypassing commitLedger entirely", (t) => {
  const root = fixture(t);
  const dir = seedShippedPitch(root, "hand-placed");
  archive(root, "hand-placed", { apply: true });
  const ledger = { schemaVersion: 1, slug: "hand-placed", sections: [{ source: "SHIPPED.md#summary", status: "gap", reason: "author says nothing matters" }], coverage: 0, gaps: [], committedAt: "2026-09-25T00:00:00Z" };
  write(root, ".project/compaction/ledgers/hand-placed.json", JSON.stringify(ledger));
  assert.throws(() => remove(root, "hand-placed", { apply: true }), /unaccepted gap\(s\).*SHIPPED\.md#summary/);
  assert.equal(exists(root, `${dir}/pitch.md`), true, "nothing deleted");

  write(root, ".project/compaction/ledgers/hand-placed.json", JSON.stringify({ ...ledger, acceptedGaps: [{ source: "SHIPPED.md#summary", reason: "author", acceptedReason: "  " }] }));
  assert.throws(() => remove(root, "hand-placed", { apply: true }), /unaccepted gap/, "a blank acceptance reason is not an acceptance");

  write(root, ".project/compaction/ledgers/hand-placed.json", JSON.stringify({ ...ledger, acceptedGaps: [{ source: "SHIPPED.md#summary", reason: "author", acceptedReason: "human reviewed and agreed" }] }));
  assert.equal(remove(root, "hand-placed", { apply: true }).applied, true, "an explicitly accepted gap does open the gate");
});

test("remove refuses a malformed, wrong-slug, empty, non-JSON, or invalid-status ledger", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "ledger-shape");
  archive(root, "ledger-shape", { apply: true });
  const ledgerFile = ".project/compaction/ledgers/ledger-shape.json";
  const good = { schemaVersion: 1, slug: "ledger-shape", sections: [{ source: "SHIPPED.md#summary", status: "extracted", destination: "x" }] };
  write(root, ledgerFile, "{not json");
  assert.throws(() => remove(root, "ledger-shape", { apply: true }), /not valid JSON/);
  for (const bad of [{ ...good, schemaVersion: 2 }, { ...good, slug: "other" }, { ...good, sections: [] }, null]) {
    write(root, ledgerFile, JSON.stringify(bad));
    assert.throws(() => remove(root, "ledger-shape", { apply: true }), /malformed/);
  }
  write(root, ledgerFile, JSON.stringify({ ...good, sections: [{ source: "a", status: "maybe" }] }));
  assert.throws(() => remove(root, "ledger-shape", { apply: true }), /neither extracted nor gaps/);
});

// ---- Independent re-review (S1): findings verified against the real code ----

function placeLedger(root, slug, sections, extra = {}) {
  write(root, `.project/compaction/ledgers/${slug}.json`, JSON.stringify({ schemaVersion: 1, slug, sections, ...extra }));
}

test("remove recomputes what the pitch requires: a hand-placed ledger with nonsense entries, a missing section, or an unknown one cannot open the gate", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "gate-a");
  write(root, ".project/pitches/gate-a/audit-cycle-1.md", "a second required section, so a partial ledger is not empty\n");
  write(root, "notes/dest.md", "extracted");
  archive(root, "gate-a", { apply: true });
  placeLedger(root, "gate-a", [{ source: "anything-at-all", status: "extracted", destination: "notes/dest.md" }]);
  assert.throws(() => remove(root, "gate-a", { apply: true }), /does not match this pitch's required sections \(missing: .*SHIPPED\.md#summary.*unknown: anything-at-all/);
  const required = buildLedger(root, "gate-a").required;
  placeLedger(root, "gate-a", required.slice(1).map((source) => ({ source, status: "extracted", destination: "notes/dest.md" })));
  assert.throws(() => remove(root, "gate-a", { apply: true }), /missing: /);
  placeLedger(root, "gate-a", [...required, required[0]].map((source) => ({ source, status: "extracted", destination: "notes/dest.md" })));
  assert.throws(() => remove(root, "gate-a", { apply: true }), /duplicated: /);
  assert.ok(exists(root, ".project/pitches/gate-a/SHIPPED.md"), "nothing was deleted");
});

test("a ledger committed before a section was added to the pitch is stale and cannot open the gate", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "gate-b");
  commitFixtureLedger(root, "gate-b");
  write(root, ".project/pitches/gate-b/audit-cycle-2.md", "a required file that no ledger covers\n");
  archive(root, "gate-b", { apply: true });
  assert.throws(() => remove(root, "gate-b", { apply: true }), /missing: audit-cycle-2\.md/);
});

test("remove re-checks every extracted destination at removal time, not only when the ledger was committed", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "gate-c");
  commitFixtureLedger(root, "gate-c");
  archive(root, "gate-c", { apply: true });
  fs.rmSync(path.join(root, "notes/dest.md"));
  assert.throws(() => remove(root, "gate-c", { apply: true }), /destination for .* is missing, empty, outside the project, or inside this pitch/);
  write(root, "notes/dest.md", "back");
  assert.equal(remove(root, "gate-c", { apply: true }).applied, true);
});

test("archive refuses a symlinked ancestor and a FIFO in the pitch, and never copies outside content into the archive", (t) => {
  const root = fixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  write(outside, "foo/SHIPPED.md", "OUTSIDE-CONTENT\n");
  fs.mkdirSync(path.join(root, ".project"), { recursive: true });
  fs.symlinkSync(outside, path.join(root, ".project/pitches"));
  assert.throws(() => archive(root, "foo", { apply: true }), /Symlink forbidden in path/);
  assert.ok(!exists(root, ".project/compaction"), "no archive was written");
  fs.rmSync(path.join(root, ".project/pitches"));
  const dir = seedShippedPitch(root, "with-pipe");
  assert.equal(spawnSync("mkfifo", [path.join(root, dir, "pipe")]).status, 0);
  const run = spawnSync(process.execPath, [...RUNTIME_FLAGS, path.join(__dirname, "pitch-archive.mts"), "archive", "with-pipe", "--root", root, "--apply"], { encoding: "utf8", timeout: 8000 });
  assert.equal(run.error, undefined, "must return, not hang on the pipe");
  assert.equal(run.status, 1);
  assert.match(run.stderr, /Refusing non-regular file/);
});

test("restore never writes through a symlink: not at the destination, not on the way, not at the target file", (t) => {
  const root = fixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  write(outside, "victim.txt", "ORIGINAL\n");
  const dir = seedShippedPitch(root, "restore-safe");
  archive(root, "restore-safe", { apply: true });
  // (1) a symlinked leaf under --force
  fs.rmSync(path.join(root, dir, "SHIPPED.md"));
  fs.symlinkSync(path.join(outside, "victim.txt"), path.join(root, dir, "SHIPPED.md"));
  assert.throws(() => restore(root, "restore-safe", { apply: true, force: true }), /symlink or special file/);
  assert.equal(fs.readFileSync(path.join(outside, "victim.txt"), "utf8"), "ORIGINAL\n");
  // (2) the pitch directory itself is a symlink to an outside directory
  fs.rmSync(path.join(root, dir), { recursive: true });
  fs.symlinkSync(outside, path.join(root, dir));
  assert.throws(() => restore(root, "restore-safe", { apply: true }), /Symlink forbidden in path/);
  // (3) an explicit --to that is a symlink
  const target = path.join(os.tmpdir(), `restore-link-${process.pid}`);
  fs.symlinkSync(outside, target);
  t.after(() => fs.rmSync(target, { force: true }));
  assert.throws(() => restore(root, "restore-safe", { apply: true, to: target }), /destination is a symlink or not a directory/);
  assert.deepEqual(fs.readdirSync(outside), ["victim.txt"], "nothing was written into the outside directory");
});

test("restore --force reports the files it did not replace, leaves no temp file, and keeps the archive's modes", (t) => {
  const root = fixture(t);
  const dir = seedShippedPitch(root, "restore-extras");
  archive(root, "restore-extras", { apply: true });
  write(root, `${dir}/extra.md`, "not in the archive\n");
  fs.writeFileSync(path.join(root, dir, "pitch.md"), "changed\n");
  const result = restore(root, "restore-extras", { apply: true, force: true });
  assert.deepEqual(result.extraFiles, ["extra.md"]);
  assert.equal(read(root, `${dir}/pitch.md`), "# Pitch\n");
  assert.deepEqual(fs.readdirSync(path.join(root, dir)).filter((name) => name.includes(".tmp-")), []);
});

test("verify reports a corrupt or malformed manifest and an unlisted extra file as issues, never as a thrown error or quoted content", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "verify-hard");
  const { archiveDir } = archive(root, "verify-hard", { apply: true });
  const base = `.project/compaction/archives/${archiveDir}`;
  write(root, `${base}/files/smuggled.md`, "added after archiving\n");
  assert.match(verify(root, "verify-hard").issues.join(), /unlisted file in the archive: smuggled\.md/);
  fs.rmSync(path.join(root, `${base}/files/smuggled.md`));
  const good = read(root, `${base}/manifest.json`);
  fs.writeFileSync(path.join(root, `${base}/manifest.json`), "{ secret-looking-content");
  const bad = verify(root, "verify-hard");
  assert.equal(bad.valid, false);
  assert.match(bad.issues.join(), /Archive manifest is not valid JSON/);
  assert.ok(!bad.issues.join().includes("secret-looking-content"));
  fs.writeFileSync(path.join(root, `${base}/manifest.json`), JSON.stringify({ slug: "verify-hard" }));
  assert.match(verify(root, "verify-hard").issues.join(), /Archive manifest is malformed/);
  fs.writeFileSync(path.join(root, `${base}/manifest.json`), good);
  assert.equal(verify(root, "verify-hard").valid, true);
});

test("CLI error output carries no control characters", (t) => {
  const root = fixture(t);
  const run = spawnSync(process.execPath, [...RUNTIME_FLAGS, path.join(__dirname, "pitch-archive.mts"), "archive", "bad\u001b[2Jslug", "--root", root], { encoding: "utf8" });
  assert.equal(run.status, 1);
  assert.ok(!/[\u0000-\u0008\u000b-\u001f\u007f]/.test(run.stderr), JSON.stringify(run.stderr));
});

// ---- Audit cycle 3 of the S1 re-review ----

test("verify reports files named like inherited object properties, and CLI file-system errors carry a code, not a path", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "proto");
  const { archiveDir } = archive(root, "proto", { apply: true });
  write(root, `.project/compaction/archives/${archiveDir}/files/constructor`, "planted");
  write(root, `.project/compaction/archives/${archiveDir}/files/toString`, "planted");
  const issues = verify(root, "proto").issues.join();
  assert.match(issues, /unlisted file in the archive: constructor/);
  assert.match(issues, /unlisted file in the archive: toString/);
  if (process.getuid && process.getuid() === 0) return;
  const other = fixture(t);
  const dir = seedShippedPitch(other, "perm");
  write(other, `${dir}/sub/a.md`, "a");
  fs.chmodSync(path.join(other, dir, "sub"), 0);
  try {
    const run = spawnSync(process.execPath, [...RUNTIME_FLAGS, path.join(__dirname, "pitch-archive.mts"), "archive", "perm", "--root", other], { encoding: "utf8" });
    assert.match(run.stderr, /Cannot list sub \(EACCES\)/);
    assert.ok(!run.stderr.includes(other), "no absolute path");
  } finally { fs.chmodSync(path.join(other, dir, "sub"), 0o755); }
});

test("restore reports its default destination relative to the project, not as an absolute path", (t) => {
  const root = fixture(t);
  seedShippedPitch(root, "rel");
  archive(root, "rel", { apply: true });
  fs.rmSync(path.join(root, ".project/pitches/rel"), { recursive: true });
  const result = restore(root, "rel", { apply: true });
  assert.equal(result.destination, ".project/pitches/rel");
});

test("recovers a killed real ledger commit through the compaction CLI with exact original bytes", (t) => {
  for (const existing of [false, true]) {
    const root = fixture(t);
    const slug = "killed-ledger";
    seedShippedPitch(root, slug);
    write(root, "notes/dest.md", "extracted");
    const sourceFiles = Object.fromEntries(fs.readdirSync(path.join(root, `.project/pitches/${slug}`)).map((file) => [file, read(root, `.project/pitches/${slug}/${file}`)]));
    const extracted = read(root, "notes/dest.md");
    const mapping = { sections: buildLedger(root, slug).required.map((source) => ({ source, status: "extracted", destination: "notes/dest.md", reason: "new mapping" })) };
    const ledger = `.project/compaction/ledgers/${slug}.json`;
    if (existing) commitFixtureLedger(root, slug);
    const before = existing ? read(root, ledger) : null;
    const killed = spawnSync(process.execPath, [...RUNTIME_FLAGS, "-e", `
      const registry = require(${JSON.stringify(path.join(__dirname, "skill-registry.mts"))});
      const transactionApi = { ...registry, transact: (ctx, operations, options, deps) => registry.transact(ctx, operations, { ...options, afterWrite: () => process.kill(process.pid, "SIGKILL") }, deps) };
      const { createNodeDeps } = require(${JSON.stringify(path.join(__dirname, "runtime/node.mts"))});
      require(${JSON.stringify(path.join(__dirname, "pitch-compress.mts"))}).createPitchCompress(createNodeDeps(), transactionApi).commitLedger(${JSON.stringify(root)}, ${JSON.stringify(slug)}, ${JSON.stringify(mapping)}, { apply: true });
    `], { encoding: "utf8", timeout: 10000 });
    assert.equal(killed.signal, "SIGKILL", killed.stderr);
    assert.notEqual(read(root, ledger), before, "kill occurs after the actual ledger write");
    const journal = JSON.parse(read(root, ".project/compaction/transaction.json"));
    assert.deepEqual(journal.roots, { target: fs.realpathSync(root) });
    assert.equal(exists(root, ".project/skills/transaction.json"), false);
    assert.throws(() => commitLedger(root, slug, mapping, { apply: true }), /Interrupted transaction/);
    assert.throws(() => archive(root, slug, { apply: true }), /Interrupted transaction/);
    const recovered = spawnSync(process.execPath, [...RUNTIME_FLAGS, path.join(__dirname, "pitch-archive.mts"), "recover", "--root", root, "--apply"], { encoding: "utf8", timeout: 10000 });
    assert.equal(recovered.status, 0, recovered.stderr);
    assert.equal(JSON.parse(recovered.stdout).recovered, true);
    if (existing) assert.equal(read(root, ledger), before);
    else assert.equal(exists(root, ledger), false);
    assert.equal(exists(root, ".project/compaction/transaction.json"), false);
    assert.equal(exists(root, ".project/compaction/lock.json"), false);
    for (const [file, content] of Object.entries(sourceFiles)) assert.equal(read(root, `.project/pitches/${slug}/${file}`), content, "ledger recovery must not alter the source pitch");
    assert.equal(read(root, "notes/dest.md"), extracted, "ledger recovery must not alter extracted content");
    commitLedger(root, slug, mapping, { apply: true });
    assert.equal(JSON.parse(read(root, ledger)).sections[0].reason, "new mapping");
    assert.equal(verify(root, slug).valid, false, "recovery creates no archive or deletion authority");
  }
});

test("preserves a legacy ledger journal until recovery with its original installer context", (t) => {
  const root = fixture(t);
  const slug = "legacy-ledger";
  seedShippedPitch(root, slug);
  commitFixtureLedger(root, slug);
  const ledger = `.project/compaction/ledgers/${slug}.json`;
  const before = read(root, ledger);
  const killed = spawnSync(process.execPath, [...RUNTIME_FLAGS, "-e", `
    const r = require(${JSON.stringify(path.join(__dirname, "skill-registry.mts"))});
    const ctx = r.context(${JSON.stringify(root)}, "project");
    const before = r.snapshot(ctx, ${JSON.stringify(ledger)});
    r.transact(ctx, [{ path: ${JSON.stringify(ledger)}, expected: before.hash, value: { data: Buffer.from("legacy partial write"), mode: 0o644 } }], { afterWrite: () => process.kill(process.pid, "SIGKILL") });
  `], { encoding: "utf8", timeout: 10000 });
  assert.equal(killed.signal, "SIGKILL", killed.stderr);
  const journal = read(root, ".project/skills/transaction.json");
  const mapping = { sections: buildLedger(root, slug).required.map((source) => ({ source, status: "extracted", destination: "notes/dest.md" })) };
  assert.throws(() => commitLedger(root, slug, mapping, { apply: true }), /Pending legacy or skill transaction/);
  assert.throws(() => archive(root, slug, { apply: true }), /Pending legacy or skill transaction/);
  const wrongRecovery = spawnSync(process.execPath, [...RUNTIME_FLAGS, path.join(__dirname, "pitch-archive.mts"), "recover", "--root", root, "--apply"], { encoding: "utf8", timeout: 10000 });
  assert.equal(wrongRecovery.status, 0, wrongRecovery.stderr);
  assert.equal(JSON.parse(wrongRecovery.stdout).recovered, false);
  assert.equal(read(root, ".project/skills/transaction.json"), journal);
  assert.equal(read(root, ledger), "legacy partial write");
  const recovered = spawnSync(process.execPath, [...RUNTIME_FLAGS, path.join(__dirname, "add-skill.mts"), "recover", "--scope", "project", "--root", root, "--apply"], { encoding: "utf8", timeout: 10000 });
  assert.equal(recovered.status, 0, recovered.stderr);
  assert.equal(JSON.parse(recovered.stdout).recovered, true);
  assert.equal(read(root, ledger), before);
  assert.equal(exists(root, ".project/skills/transaction.json"), false);
  assert.equal(exists(root, ".project/skills/lock.json"), false);
  assert.equal(archive(root, slug, { apply: true }).applied, true);
});

test("injected clock and byte reader preserve binary content through archive and restore", (t) => {
  const root = fixture(t);
  const dir = seedShippedPitch(root, "binary-runtime");
  const bytes = Buffer.from([0, 255, 128, 13, 10, 42]);
  fs.writeFileSync(path.join(root, dir, "binary.bin"), bytes);
  const deps = createNodeDeps();
  const reads = [];
  const readBytesSync = deps.fs.readBytesSync;
  deps.fs = { ...deps.fs, readBytesSync: (file) => { reads.push(file); return readBytesSync(file); } };
  deps.clock = { ...deps.clock, now: () => Date.UTC(2026, 8, 25, 12, 0, 0) };
  const tools = createPitchArchive(deps);
  const result = tools.archive(root, "binary-runtime", { apply: true });
  assert.equal(result.archiveDir, "binary-runtime-2026-09-25T12-00-00-000Z");
  assert.ok(reads.includes(path.join(root, dir, "binary.bin")));
  assert.equal(tools.verify(root, "binary-runtime").valid, true);
  fs.rmSync(path.join(root, dir), { recursive: true });
  tools.restore(root, "binary-runtime", { apply: true });
  assert.deepEqual(fs.readFileSync(path.join(root, dir, "binary.bin")), bytes);
});
