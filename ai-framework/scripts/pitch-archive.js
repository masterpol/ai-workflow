#!/usr/bin/env node
/*
 * Immutable recovery archive, transactional deletion, and restore for a pitch compacted by
 * pitch-compress.js. Deliberately reuses skill-registry.js's already-audited transact/recover
 * rather than a second implementation of "safely delete files with crash recovery" — see
 * .project/knowledge/decisions/pitch-compaction-gate-and-recovery-design.md ("Reuse the audited transaction machinery").
 */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { snapshot, transact, recover, digest, json } = require("./skill-registry");
const { safeRelative } = require("./skill-source");
const { requiredSections, checkDestination, assertPlainPath, compactionContext: ctxFor, requireNoPendingCompaction: requireNoPendingTransaction } = require("./pitch-compress");

const PITCHES_DIR = ".project/pitches";
const COMPACTION_DIR = ".project/compaction";
const LEDGERS_DIR = `${COMPACTION_DIR}/ledgers`;
const ARCHIVES_DIR = `${COMPACTION_DIR}/archives`;
const SLUG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const MAX_ARCHIVED_FILE_BYTES = 32 * 1024 * 1024;
const MAX_ARCHIVED_FILES = 5000;
const printable = (text) => String(text).replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/g, "?");
// JSON.parse errors quote their input; a fixed message does not.
function parseJson(text, label) { try { return JSON.parse(text); } catch { throw new Error(`${label} is not valid JSON`); } }

// The one reader for project files: plain path, regular file, bounded size.
function readGuarded(base, relative, maxBytes) {
  assertPlainPath(base, relative);
  const full = path.join(base, relative);
  const stat = fs.lstatSync(full);
  if (!stat.isFile()) throw new Error(`Not a regular file: ${relative}`);
  if (stat.size > maxBytes) throw new Error(`Too large to read: ${relative}`);
  return fs.readFileSync(full);
}
function isRegularFile(full) { try { const stat = fs.lstatSync(full); return stat.isFile() && !stat.isSymbolicLink(); } catch { return false; } }

function checkSlug(slug) {
  if (typeof slug !== "string" || !SLUG.test(slug)) throw new Error(`Invalid pitch slug: ${JSON.stringify(slug)}`);
  return slug;
}

function pitchRelative(slug) { return `${PITCHES_DIR}/${checkSlug(slug)}`; }

// Every mutating entry point checks this itself, not just the CLI — a direct import (this
// module used programmatically, e.g. by pitch-compress.js's own future callers, or by tests)
// must get the same interrupted-transaction protection add-skill.js's shared run() already
// gives every caller, not a weaker one that only applies when going through argv.

// Every file under a directory, relative to it, in a deterministic (sorted) order. A symlink
// anywhere in the source tree is rejected — an immutable archive must be a real, inert copy of
// content, never a live pointer to something that can change or escape the source tree.
function walk(base, relative = "", state = { count: 0 }) {
  const full = path.join(base, relative);
  let stat;
  try { stat = fs.lstatSync(full); } catch (error) { throw new Error(`Cannot read ${relative || "."} (${error.code || "error"})`); }
  if (stat.isSymbolicLink()) throw new Error(`Symlink forbidden in archive source: ${relative || "."}`);
  if (stat.isDirectory()) {
    let names;
    try { names = fs.readdirSync(full).sort(); } catch (error) { throw new Error(`Cannot list ${relative || "."} (${error.code || "error"})`); }
    return names.flatMap((name) => walk(base, relative ? `${relative}/${name}` : name, state));
  }
  // A FIFO or socket would block a read forever; only regular files are archived.
  if (!stat.isFile()) throw new Error(`Refusing non-regular file in archive source: ${relative}`);
  if (++state.count > MAX_ARCHIVED_FILES) throw new Error("Too many files to archive");
  return [relative];
}

function readFile(base, relative) {
  const full = path.join(base, relative);
  const stat = fs.lstatSync(full);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`Refusing non-regular file: ${relative}`);
  if (stat.size > MAX_ARCHIVED_FILE_BYTES) throw new Error(`File too large to archive: ${relative}`);
  return { data: fs.readFileSync(full), mode: stat.mode & 0o777 };
}

function ledgerPath(slug) { return `${LEDGERS_DIR}/${checkSlug(slug)}.json`; }

function ledgerCommitted(root, slug) {
  return isRegularFile(path.join(root, ledgerPath(slug)));
}

// Existence alone is not enough: commitLedger() lets a ledger record gaps, and a gap only counts
// once a human separately accepted it by name (--accept-gap). Re-read the committed ledger here
// rather than trusting that the file could only have been written through commitLedger — a
// hand-placed or edited ledger with an unaccepted gap must not open the deletion gate.
function requireCompleteLedger(root, slug) {
  if (!ledgerCommitted(root, slug)) throw new Error(`Refusing to remove: no committed coverage ledger for ${slug} (run pitch-compress.js commit-ledger first)`);
  let ledger;
  try { ledger = JSON.parse(readGuarded(root, ledgerPath(slug), 2 * 1024 * 1024).toString("utf8")); } catch { throw new Error(`Refusing to remove: coverage ledger for ${slug} is not valid JSON or not a plain file`); }
  if (!ledger || ledger.schemaVersion !== 1 || ledger.slug !== slug || !Array.isArray(ledger.sections) || !ledger.sections.length) throw new Error(`Refusing to remove: coverage ledger for ${slug} is malformed`);
  const accepted = new Set((Array.isArray(ledger.acceptedGaps) ? ledger.acceptedGaps : []).filter((gap) => typeof gap.acceptedReason === "string" && gap.acceptedReason.trim()).map((gap) => gap.source));
  const unaccepted = ledger.sections.filter((entry) => entry.status === "gap" && !accepted.has(entry.source)).map((entry) => entry.source);
  if (unaccepted.length) throw new Error(`Refusing to remove: unaccepted gap(s) in the coverage ledger: ${unaccepted.join(", ")}`);
  const invalid = ledger.sections.filter((entry) => entry.status !== "gap" && entry.status !== "extracted");
  if (invalid.length) throw new Error(`Refusing to remove: coverage ledger has entries that are neither extracted nor gaps`);

  // The ledger is proof of coverage only for the pitch as it is now: recompute what this pitch requires and demand
  // an exact match, so a stale ledger (a section added since) or a hand-placed one cannot open the gate.
  const required = requiredSections(root, slug);
  const listed = ledger.sections.map((entry) => entry && entry.source);
  const missing = required.filter((source) => !listed.includes(source));
  const unknown = listed.filter((source) => !required.includes(source));
  const duplicated = listed.filter((source, index) => listed.indexOf(source) !== index);
  if (missing.length || unknown.length || duplicated.length) throw new Error(`Refusing to remove: the ledger does not match this pitch's required sections (missing: ${missing.join(", ") || "none"}; unknown: ${unknown.join(", ") || "none"}; duplicated: ${duplicated.join(", ") || "none"})`);
  // And every extracted destination must still be a real, nonempty file inside the project and outside the pitch.
  for (const entry of ledger.sections) {
    if (entry.status !== "extracted") continue;
    if (typeof entry.destination !== "string" || !entry.destination.trim()) throw new Error(`Refusing to remove: extracted section has no destination: ${entry.source}`);
    try { checkDestination(root, slug, entry.destination.split("#")[0], entry.destination); } catch { throw new Error(`Refusing to remove: destination for ${entry.source} is missing, empty, outside the project, or inside this pitch`); }
  }
}

function readManifest(root, archiveDir) {
  const base = `${ARCHIVES_DIR}/${archiveDir}`;
  let raw;
  let checksum;
  try {
    raw = readGuarded(root, `${base}/manifest.json`, 4 * 1024 * 1024);
    checksum = readGuarded(root, `${base}/ARCHIVE-CHECKSUM`, 4096).toString("utf8").trim();
  } catch { throw new Error(`Archive is missing a readable manifest or checksum: ${archiveDir}`); }
  const manifest = parseJson(raw.toString(), "Archive manifest");
  if (!manifest || typeof manifest !== "object" || typeof manifest.files !== "object" || manifest.files === null || Array.isArray(manifest.files)) throw new Error("Archive manifest is malformed");
  return { manifest, manifestDigest: digest(raw), storedChecksum: checksum };
}

function latestArchiveDir(root, slug) {
  const dir = path.join(root, ARCHIVES_DIR);
  if (!fs.existsSync(dir)) return null;
  // Anchored to this slug's own timestamp shape: a bare `${slug}-` prefix also matches a
  // different pitch whose slug merely starts with this one (foo vs foo-bar), which would verify,
  // remove against, or restore the wrong pitch's archive — found by a live two-pitch repro.
  const pattern = new RegExp(`^${checkSlug(slug)}-\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-\\d{3}Z$`);
  const candidates = fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && pattern.test(entry.name)).map((entry) => entry.name).sort();
  return candidates.length ? candidates[candidates.length - 1] : null;
}

// Writes are queued through transact() so an interrupted archive leaves recoverable, not
// corrupt, state — every file here is new (never overwrites), so on interruption recover()
// simply removes the partial copy.
function archive(root, slug, options = {}) {
  requireNoPendingTransaction(root);
  const relative = pitchRelative(slug);
  const source = path.join(root, relative);
  assertPlainPath(root, relative, true);
  if (!fs.existsSync(source)) throw new Error(`No such pitch directory: ${relative}`);
  const files = walk(source);
  if (!files.length) throw new Error(`Pitch directory is empty: ${relative}`);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archiveDir = `${slug}-${stamp}`;
  const manifestFiles = {};
  const operations = [];
  for (const file of files) {
    const { data, mode } = readFile(source, file);
    manifestFiles[file] = { hash: digest(data), mode };
    operations.push({ path: `${ARCHIVES_DIR}/${archiveDir}/files/${file}`, expected: null, expectedMode: null, value: { data, mode } });
  }
  const manifest = { schemaVersion: 1, slug, sourceRoot: relative, archivedAt: new Date().toISOString(), files: manifestFiles };
  const manifestBuffer = json(manifest);
  operations.push({ path: `${ARCHIVES_DIR}/${archiveDir}/manifest.json`, expected: null, expectedMode: null, value: { data: manifestBuffer, mode: 0o644 } });
  operations.push({ path: `${ARCHIVES_DIR}/${archiveDir}/ARCHIVE-CHECKSUM`, expected: null, expectedMode: null, value: { data: Buffer.from(`sha256:${digest(manifestBuffer)}\n`), mode: 0o644 } });
  if (options.apply) transact(ctxFor(root), operations);
  return { slug, archiveDir, fileCount: files.length, applied: Boolean(options.apply) };
}

// Re-hashes every archived file against the manifest, and the manifest itself against
// ARCHIVE-CHECKSUM — tampering with either is independently detectable.
function verify(root, slug) {
  const archiveDir = latestArchiveDir(root, slug);
  if (!archiveDir) return { slug, valid: false, issues: ["no archive found"] };
  let manifest;
  let manifestDigest;
  let storedChecksum;
  try { ({ manifest, manifestDigest, storedChecksum } = readManifest(root, archiveDir)); } catch (error) { return { slug, archiveDir, valid: false, issues: [error.message] }; }
  const issues = [];
  if (storedChecksum !== `sha256:${manifestDigest}`) issues.push("manifest checksum mismatch (manifest.json was modified after archiving)");
  if (manifest.slug !== slug) issues.push(`manifest slug mismatch: archive belongs to ${JSON.stringify(manifest.slug)}`);
  const safeKeys = new Set();
  for (const [file, expected] of Object.entries(manifest.files)) {
    // Every manifest key becomes a filesystem path later (restore, remove) — reject anything
    // that could escape the archive/destination before either ever sees it.
    try { safeRelative(file); } catch { issues.push(`unsafe path in manifest: ${JSON.stringify(file)}`); continue; }
    safeKeys.add(file);
    if (!expected || typeof expected.hash !== "string" || typeof expected.mode !== "number") { issues.push(`malformed manifest entry: ${file}`); continue; }
    const full = path.join(root, ARCHIVES_DIR, archiveDir, "files", file);
    let stat;
    try { stat = fs.lstatSync(full); } catch { issues.push(`missing archived file: ${file}`); continue; }
    if (stat.isSymbolicLink() || !stat.isFile()) { issues.push(`archived path is not a regular file: ${file}`); continue; }
    if (stat.size > MAX_ARCHIVED_FILE_BYTES) { issues.push(`archived file is too large to verify: ${file}`); continue; }
    const data = fs.readFileSync(full);
    if (digest(data) !== expected.hash) issues.push(`archived file changed since archiving: ${file}`);
    if ((stat.mode & 0o777) !== expected.mode) issues.push(`archived file mode changed since archiving: ${file}`);
  }
  // Files added under the archive after the fact are not covered by any hash.
  try { for (const extra of walk(path.join(root, ARCHIVES_DIR, archiveDir, "files"))) if (!safeKeys.has(extra) && !Object.hasOwn(manifest.files, extra)) issues.push(`unlisted file in the archive: ${extra}`); } catch { issues.push("archive files directory is unreadable or contains a link or special file"); }
  return { slug, archiveDir, valid: issues.length === 0, issues };
}

// remove() refuses unless: a verified archive exists, the live source still matches exactly
// what was archived (a concurrent edit since archiving is a conflict, not a silent overwrite),
// and a committed ledger exists (proving full required-section coverage). Only then does it
// delete, through transact() — the same recoverable machinery add-skill's own removal uses.
function remove(root, slug, options = {}) {
  requireNoPendingTransaction(root);
  const verification = verify(root, slug);
  if (!verification.valid) throw new Error(`Refusing to remove: archive is not verified (${verification.issues.join("; ") || "no archive"})`);
  const { manifest } = readManifest(root, verification.archiveDir);
  const relative = pitchRelative(slug);
  const source = path.join(root, relative);
  assertPlainPath(root, relative, true);
  // remove() deletes files, not the directory itself (see restore()'s own mkdir-on-demand) — so
  // "already removed" means either the directory is gone or it is now empty, not just missing.
  const liveFiles = fs.existsSync(source) ? walk(source) : [];
  if (!liveFiles.length) throw new Error(`Already removed: ${relative}`);
  // Checked after "already removed": the ledger is recomputed against the live pitch, which no longer exists then.
  requireCompleteLedger(root, slug);
  const archivedFiles = Object.keys(manifest.files).sort();
  if (JSON.stringify(liveFiles.sort()) !== JSON.stringify(archivedFiles)) throw new Error(`Refusing to remove: file set changed since archiving (conflict) for ${slug}`);
  const operations = [];
  for (const file of archivedFiles) {
    const { data, mode } = readFile(source, file);
    if (digest(data) !== manifest.files[file].hash || mode !== manifest.files[file].mode) throw new Error(`Refusing to remove: ${relative}/${file} changed since archiving (conflict)`);
    operations.push({ path: `${relative}/${file}`, expected: manifest.files[file].hash, expectedMode: manifest.files[file].mode, value: null });
  }
  if (options.apply) transact(ctxFor(root), operations);
  return { slug, archiveDir: verification.archiveDir, removedCount: operations.length, applied: Boolean(options.apply) };
}

function restore(root, slug, options = {}) {
  requireNoPendingTransaction(root);
  // Never restore from an archive that doesn't verify: a tampered or mismatched archive would
  // otherwise be silently written back over real content as if it were the original.
  const verification = verify(root, slug);
  if (!verification.valid) throw new Error(`Refusing to restore: archive is not verified (${verification.issues.join("; ")})`);
  const archiveDir = verification.archiveDir;
  const { manifest } = readManifest(root, archiveDir);
  if (!options.to) assertPlainPath(root, pitchRelative(slug), true);
  const destination = options.to ? path.resolve(options.to) : path.join(root, pitchRelative(slug));
  let destinationStat = null;
  try { destinationStat = fs.lstatSync(destination); } catch (error) { if (error.code !== "ENOENT") throw new Error("Cannot inspect the restore destination"); }
  if (destinationStat && (destinationStat.isSymbolicLink() || !destinationStat.isDirectory())) throw new Error("Refusing to restore: the destination is a symlink or not a directory");
  if (destinationStat && fs.readdirSync(destination).length && !options.force) throw new Error("Destination already exists and is non-empty (pass --force to overwrite)");
  const files = Object.keys(manifest.files);
  let extraFiles = [];
  if (destinationStat) { try { extraFiles = walk(destination).filter((file) => !files.includes(file)); } catch { throw new Error("Refusing to restore: the destination contains a symlink or special file"); } }
  if (options.apply) {
    for (const file of files) {
      const from = path.join(root, ARCHIVES_DIR, archiveDir, "files", file);
      const to = path.join(destination, file);
      if (!path.resolve(to).startsWith(`${path.resolve(destination)}${path.sep}`)) throw new Error(`Refusing to restore outside the destination: ${file}`);
      // No link may sit on the way to (or at) the target: a link would send the write outside the destination.
      fs.mkdirSync(path.dirname(to), { recursive: true });
      assertPlainPath(destination, file, true);
      // Copy to a temp name and rename over the target: a reader never sees a half-written file.
      const temporary = `${to}.tmp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
      try {
        fs.copyFileSync(from, temporary, fs.constants.COPYFILE_EXCL);
        fs.chmodSync(temporary, manifest.files[file].mode);
        fs.renameSync(temporary, to);
      } finally { fs.rmSync(temporary, { force: true }); }
    }
  }
  // The default destination is reported relative to the project; an explicit --to is echoed as the operator gave it.
  return { slug, archiveDir, destination: options.to ? destination : pitchRelative(slug), fileCount: files.length, extraFiles, applied: Boolean(options.apply) };
}

function cli(argv) {
  const options = { root: process.cwd() };
  const positional = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--root" && argv[index + 1] !== undefined) options.root = argv[++index];
    else if (arg === "--to" && argv[index + 1] !== undefined) options.to = argv[++index];
    else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    else positional.push(arg);
  }
  const [action, slugArg] = positional;
  const root = fs.realpathSync(options.root);

  if (action === "recover") {
    if (!options.apply) return JSON.stringify({ action, pending: Boolean(snapshot(ctxFor(root), `${COMPACTION_DIR}/transaction.json`)), applied: false });
    return JSON.stringify({ action, recovered: recover(ctxFor(root)), applied: true });
  }
  requireNoPendingTransaction(root);

  let result;
  if (action === "archive") result = archive(root, slugArg, options);
  else if (action === "verify") result = verify(root, slugArg);
  else if (action === "remove") result = remove(root, slugArg, options);
  else if (action === "restore") result = restore(root, slugArg, options);
  else throw new Error("Usage: node ai-framework/scripts/pitch-archive.js <archive SLUG | verify SLUG | remove SLUG | restore SLUG [--to PATH] | recover> [--apply] [--force] [--root /absolute/project] [--json]");
  return JSON.stringify(result, null, 2);
}

module.exports = { archive, verify, remove, restore, latestArchiveDir, ledgerCommitted };

if (require.main === module) {
  try {
    process.stdout.write(`${cli(process.argv.slice(2))}\n`);
  } catch (error) { process.stderr.write(`${printable(`pitch-archive: ${error.syscall && error.code ? `file system error (${error.code})` : error.message}`)}\n`); process.exitCode = 1; }
}
