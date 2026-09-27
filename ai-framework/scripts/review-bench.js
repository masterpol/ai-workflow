#!/usr/bin/env node
/*
 * Review bench for independent re-reviews (see .project/pitches/independent-rereview-catch-up/plan.md).
 * A reviewer agent gets a scratch COPY of a slice with one planted defect (a "canary"), never the repo:
 *   prepare       copy a slice to a scratch dir, plant one canary, prove it breaks a scratch test
 *   guard         snapshot / check the repo around a dispatch, so "read-only" is verified, not assumed
 *   count         changed files against a ref, minus bookkeeping, for the appetite cap
 *   canary-check  did a reviewer's report cite the canary's file within +-3 lines?
 *   record-check  does a slice record carry the fields that make its claims checkable?
 * Follows ai-framework/rules/security.md section 9: one guarded reader, bounded input, no project script
 * executed (only `node` on files copied into the scratch dir), no raw error text.
 */
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const MAX_FILE_BYTES = 512 * 1024;
const MAX_RECORD_BYTES = 256 * 1024;
const WALK_CAP = 50000;
const TEST_TIMEOUT_MS = 60000;
const SECRET_NAME = /(^|\/)(\.env[^/]*|credentials[^/]*|settings\.local\.json|\.npmrc|\.netrc|id_(?:rsa|dsa|ecdsa|ed25519)[^/]*|[^/]*\.(?:pem|key|p12|pfx))$/i;
// Directories the guard hashes. Metrics and reports are written by hooks and generators during a session.
const GUARD_ROOTS = [".project", "ai-framework", ".claude", ".agents", ".cursor", ".opencode", ".codex", "AGENTS.md", "CLAUDE.md", "README.md", "VERSION", "CHANGELOG.md", ".gitignore"];
const GUARD_SKIP = [".project/metrics", ".project/reports", ".git", "node_modules"];
const BOOKKEEPING_FILES = new Set(["VERSION", "CHANGELOG.md", ".project/status.md", ".project/pitches/_followups.md", ".project/done-work.md"]);
const BOOKKEEPING_PREFIXES = [".project/knowledge/", ".project/runs/", ".project/compaction/", ".project/reports/", ".project/metrics/"];

const printable = (text) => String(text).replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/g, "?");
const fail = (message) => { throw new Error(message); };
const inside = (root, target) => { const rel = path.relative(root, target); return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel)); };
// A caller-supplied --out/--file is checked against `root` by its lexical path above; that is not
// enough on its own — an ancestor directory can be a symlink even when the leaf does not exist yet,
// which the OS follows transparently. Resolve the longest existing prefix's realpath and rejoin the
// rest, matching resolve-before-matching-a-protected-path-allowlist, before every `inside()` check.
function realOrNearest(target) {
  let current = target;
  const suffix = [];
  for (;;) {
    try { return path.join(fs.realpathSync(current), ...suffix); }
    catch { const parent = path.dirname(current); if (parent === current) return target; suffix.unshift(path.basename(current)); current = parent; }
  }
}
// For a file OUTSIDE the project (scratch manifest, guard snapshot, a reviewer's report): lstat,
// refuse a symlink or non-regular file, cap size, then read. readGuarded gives these guarantees for
// project-relative paths; this gives the same guarantees for the operator-supplied absolute ones.
function readGuardedAbsolute(full, label) {
  let stat;
  try { stat = fs.lstatSync(full); } catch { fail(`Cannot read ${label}`); }
  if (stat.isSymbolicLink() || !stat.isFile()) fail(`${label} must be a regular file, not a symlink`);
  if (stat.size > MAX_RECORD_BYTES) fail(`${label} is too large`);
  try { return fs.readFileSync(full, "utf8"); } catch { fail(`Cannot read ${label}`); }
}
// Refuses to write through an existing symlink or non-regular target; writes atomically via a temp
// file in the same directory opened "wx" (refuses a pre-planted path) plus rename.
function writeGuarded(target, text) {
  let stat;
  try { stat = fs.lstatSync(target); } catch { stat = null; }
  if (stat && (stat.isSymbolicLink() || !stat.isFile())) fail(`Refusing to write through a symlink: ${path.basename(target)}`);
  const temp = `${target}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  try { fs.writeFileSync(temp, text, { flag: "wx" }); fs.renameSync(temp, target); } finally { fs.rmSync(temp, { force: true }); }
}

function safeRelative(relative) {
  if (typeof relative !== "string" || !relative || relative.includes("\0") || relative.includes("\\") || path.isAbsolute(relative)) fail("Unsafe path");
  if (relative.split("/").some((part) => part === "" || part === "." || part === "..")) fail("Unsafe path");
  return relative;
}

// The one reader: refuses symlinks, non-regular files, out-of-project realpaths, secret-shaped names, oversize files.
function readGuarded(root, relative) {
  safeRelative(relative);
  if (SECRET_NAME.test(relative)) fail(`Refusing secret-shaped file: ${relative}`);
  const full = path.join(root, relative);
  let stat;
  try { stat = fs.lstatSync(full); } catch { fail(`Cannot read: ${relative}`); }
  if (stat.isSymbolicLink() || !stat.isFile()) fail(`Not a regular file: ${relative}`);
  if (stat.size > MAX_FILE_BYTES) fail(`Too large: ${relative}`);
  if (!inside(root, fs.realpathSync(full))) fail(`Outside the project: ${relative}`);
  return fs.readFileSync(full);
}

function git(root, args) {
  const run = spawnSync("git", ["-C", root, ...args], { encoding: "utf8", timeout: 20000, maxBuffer: 16 * 1024 * 1024 });
  if (run.status !== 0) fail("git command failed");
  return run.stdout;
}
// JSON.parse errors quote their input; the operator's flags and a snapshot file get a fixed message instead.
const parseJson = (text, label) => { try { return JSON.parse(text); } catch { return fail(`${label} is not valid JSON`); } };
const sha = (data) => crypto.createHash("sha256").update(data).digest("hex");

function runNode(command, cwd) {
  if (!Array.isArray(command) || command[0] !== "node" || command.some((part) => typeof part !== "string")) fail("test command must be a JSON array starting with \"node\"");
  return spawnSync("node", command.slice(1), { cwd, encoding: "utf8", timeout: TEST_TIMEOUT_MS }).status;
}

function prepare(root, options) {
  const files = String(options.files || "").split(",").filter(Boolean);
  if (!files.length) fail("--files is required");
  const spec = parseJson(String(options.canary || "null"), "--canary");
  if (!spec || typeof spec.file !== "string" || typeof spec.find !== "string" || typeof spec.replace !== "string" || !spec.find) fail("--canary must be {file, find, replace}");
  if (!files.includes(spec.file)) fail("canary file must be one of --files");
  const command = parseJson(String(options["test-cmd"] || "null"), "--test-cmd");
  const out = options.out ? path.resolve(options.out) : fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "review-bench-"));
  if (inside(root, realOrNearest(out))) fail("scratch dir must be outside the project");
  if (fs.existsSync(out) && fs.readdirSync(out).length) fail("scratch dir must be empty");

  const copied = [];
  for (const relative of files) {
    const data = readGuarded(root, relative);
    const target = path.join(out, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, data);
    copied.push({ path: relative, sha256: sha(data) });
  }
  if (runNode(command, out) !== 0) fail("baseline tests must pass in the scratch copy before a canary is planted");

  const target = path.join(out, spec.file);
  const text = fs.readFileSync(target, "utf8");
  const first = text.indexOf(spec.find);
  if (first === -1 || text.indexOf(spec.find, first + 1) !== -1) fail("canary find text must match exactly once");
  const line = text.slice(0, first).split("\n").length;
  fs.writeFileSync(target, text.slice(0, first) + spec.replace + text.slice(first + spec.find.length));
  if (runNode(command, out) === 0) fail("a canary that breaks no scratch test is refused");

  // The manifest sits beside the scratch tree, not in it, and is never put in a reviewer prompt.
  const manifest = `${out}.manifest.json`;
  writeGuarded(manifest, `${JSON.stringify({ files: copied, canary: { file: spec.file, line, findSha256: sha(spec.find), replaceSha256: sha(spec.replace) }, testCommand: command, baselinePassed: true, canaryBreaksTests: true }, null, 2)}\n`);
  return { scratch: out, manifest, fileCount: copied.length };
}

function walkTree(root) {
  const map = {};
  let visited = 0;
  const skip = (rel) => GUARD_SKIP.some((entry) => rel === entry || rel.endsWith(`/${entry}`) || rel.startsWith(`${entry}/`));
  const visit = (rel) => {
    if (skip(rel)) return;
    const full = path.join(root, rel);
    let stat;
    try { stat = fs.lstatSync(full); } catch { return; }
    if (++visited > WALK_CAP) fail("tree too large to snapshot");
    if (stat.isSymbolicLink()) { map[rel] = `L:${fs.readlinkSync(full)}`; return; }
    if (stat.isDirectory()) { for (const name of fs.readdirSync(full).sort()) visit(`${rel}/${name}`); return; }
    map[rel] = stat.isFile() ? (stat.size > 2 * 1024 * 1024 ? `S:${stat.size}:${Math.round(stat.mtimeMs)}` : sha(fs.readFileSync(full))) : `O:${stat.mode}`;
  };
  for (const entry of GUARD_ROOTS) visit(entry);
  return map;
}
function state(root) {
  return { head: git(root, ["rev-parse", "HEAD"]).trim(), status: git(root, ["status", "--porcelain=v1", "-uall"]), tree: walkTree(root) };
}
function guard(root, action, file) {
  if (!file) fail("--file is required");
  const target = path.resolve(file);
  if (inside(root, realOrNearest(target))) fail("the snapshot file must be outside the project");
  if (action === "snapshot") { writeGuarded(target, `${JSON.stringify(state(root))}\n`); return { snapshot: target }; }
  if (action !== "check") fail("guard needs snapshot or check");
  const before = parseJson(readGuardedAbsolute(target, "the snapshot file"), "snapshot file");
  const now = state(root);
  const paths = new Set([...Object.keys(before.tree), ...Object.keys(now.tree)]);
  const changed = [...paths].filter((p) => before.tree[p] !== now.tree[p]).sort();
  const clean = changed.length === 0 && before.head === now.head && before.status === now.status;
  return { clean, headChanged: before.head !== now.head, statusChanged: before.status !== now.status, changed };
}

function count(root, since, pitch) {
  if (!/^[0-9a-f]{7,40}$/i.test(String(since))) fail("--since must be a commit hash");
  const own = pitch ? `.project/pitches/${safeRelative(pitch)}/` : null;
  const listed = new Set([...git(root, ["diff", "--name-only", since, "--"]).split("\n"), ...git(root, ["ls-files", "--others", "--exclude-standard"]).split("\n")].filter(Boolean));
  const files = [...listed].filter((f) => !BOOKKEEPING_FILES.has(f) && !BOOKKEEPING_PREFIXES.some((p) => f.startsWith(p)) && !(own && f.startsWith(own))).sort();
  return { count: files.length, files };
}

function canaryCheck(manifestFile, reportFile) {
  if (!manifestFile) fail("--manifest is required");
  if (!reportFile) fail("--report is required");
  const { canary } = parseJson(readGuardedAbsolute(path.resolve(manifestFile), "the manifest"), "manifest");
  const report = readGuardedAbsolute(path.resolve(reportFile), "the report");
  const name = canary.file.split("/").pop().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${name}[:#L ]*(\\d+)(?:\\s*[-–]\\s*(\\d+))?`, "g");
  for (const match of report.matchAll(pattern)) {
    const low = Number(match[1]);
    const high = match[2] ? Number(match[2]) : low;
    if (canary.line >= low - 3 && canary.line <= high + 3) return { caught: true };
  }
  return { caught: false };
}

function recordCheck(file) {
  if (!file) fail("a record file path is required");
  const text = readGuardedAbsolute(path.resolve(file), "the record");
  const issues = [];
  const has = (re) => re.test(text);
  if (has(/^independent:\s*yes\b/im) && !has(/^canary:\s*caught\b/im)) issues.push("independent: yes requires canary: caught");
  if (!has(/^independent:\s*(yes|no|not-completed)\b/im)) issues.push("missing independent: yes|no|not-completed");
  if (!has(/^read-only:\s*verified by \S+/im)) issues.push("missing read-only: verified by <method>");
  if (!has(/^prompt-sha256:\s*[0-9a-f]{64}\b/im)) issues.push("missing prompt-sha256: <64 hex>");
  if (!has(/^model:\s*\S+/im)) issues.push("missing model:");
  if (!has(/^cross-file interactions:\s*(reviewed|not reviewed)\b/im)) issues.push("missing cross-file interactions: reviewed|not reviewed");
  if (!has(/^\|[^\n]*\bverified\b[^\n]*\|/im)) issues.push("missing findings table with a verified column");
  return { ok: issues.length === 0, issues };
}

function cli(argv) {
  const options = {};
  const positional = [];
  for (let index = 0; index < argv.length; index++) {
    if (argv[index].startsWith("--")) { options[argv[index].slice(2)] = argv[index + 1]; index++; } else positional.push(argv[index]);
  }
  const command = positional.shift();
  const root = fs.realpathSync(options.root || process.cwd());
  if (command === "prepare") return { output: prepare(root, options) };
  if (command === "guard") { const result = guard(root, positional[0], options.file); return { output: result, exit: result.clean === false ? 1 : 0 }; }
  if (command === "count") { const result = count(root, options.since, options.pitch); return { output: result, exit: options.max !== undefined && result.count > Number(options.max) ? 1 : 0 }; }
  if (command === "canary-check") { const result = canaryCheck(options.manifest, options.report); return { output: result, exit: result.caught ? 0 : 1 }; }
  if (command === "record-check") { const result = recordCheck(positional[0]); return { output: result, exit: result.ok ? 0 : 1 }; }
  return fail("Usage: review-bench.js <prepare|guard snapshot|guard check|count|canary-check|record-check> [options]");
}

module.exports = { prepare, guard, count, canaryCheck, recordCheck, readGuarded, safeRelative, printable };

if (require.main === module) {
  try {
    const { output, exit } = cli(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    process.exitCode = exit || 0;
  } catch (error) { process.stderr.write(`${printable(`review-bench: ${error.message}`)}\n`); process.exitCode = 1; }
}
