const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const test = require("node:test");

const { archive, verify, remove, restore, latestArchiveDir, ledgerCommitted } = require("./pitch-archive");
const { commitLedger, buildLedger } = require("./pitch-compress");

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
  fs.copyFileSync(path.join(__dirname, "graphify.js"), path.join(root, "ai-framework/scripts/graphify.js"));
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
  const script = path.join(__dirname, "pitch-archive.js");
  const run = (...args) => spawnSync(process.execPath, [script, ...args, "--root", root], { encoding: "utf8" });

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

  const badAction = spawnSync(process.execPath, [script, "bogus"], { encoding: "utf8" });
  assert.equal(badAction.status, 1);
  assert.match(badAction.stderr, /Usage:/);
});

// pitch-archive.js has no self-kill test hook of its own (that would be dead code kept only
// for tests) — instead this runs a small purpose-built child process that calls the real
// transact() the same way remove() does, with a real afterWrite callback that sends SIGKILL to
// itself mid-transaction. Matches the same real-subprocess-interruption approach add-skill's
// own S1 tests already use, rather than faking a journal by hand.
function killMidTransaction(root, dirRel) {
  const killer = path.join(root, "kill-mid-transact.js");
  fs.writeFileSync(killer, `
const { transact, digest } = require(${JSON.stringify(path.join(__dirname, "skill-registry.js"))});
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
  const result = spawnSync(process.execPath, [killer], { encoding: "utf8" });
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
const { transact, digest } = require(${JSON.stringify(path.join(__dirname, "skill-registry.js"))});
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
  const killed = spawnSync(process.execPath, [killer], { encoding: "utf8" });
  assert.equal(killed.signal, "SIGKILL");
  assert.equal(exists(root, ".project/compaction/transaction.json"), true);

  const script = path.join(__dirname, "pitch-archive.js");
  const recovered = spawnSync(process.execPath, [script, "recover", "--root", root, "--apply"], { encoding: "utf8" });
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
    write(root, `.project/compaction/archives/${archiveDir}/ARCHIVE-CHECKSUM`, `sha256:${require("node:crypto").createHash("sha256").update(raw).digest("hex")}\n`);
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
