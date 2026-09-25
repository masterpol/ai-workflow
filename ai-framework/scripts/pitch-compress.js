#!/usr/bin/env node
/*
 * Inventory, coverage ledger, and done-work.md for compacting a SHIPPED pitch. Never deletes
 * anything itself — ai-framework/scripts/pitch-archive.js owns the archive/remove/restore path,
 * gated on the ledger this script produces. See .claude/skills/pitch-compress/SKILL.md.
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const PITCHES_DIR = ".project/pitches";
const EXCLUDED = new Set(["_templates", "_archive", "_parked"]);
const COMPACTION_DIR = ".project/compaction";
const LEDGERS_DIR = `${COMPACTION_DIR}/ledgers`;
const DONE_WORK = ".project/done-work.md";
const SLUG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function full(root, relative) { return path.join(root, relative); }

const MAX_TEXT_BYTES = 4 * 1024 * 1024;
// Pitch records are read from a project tree that may not be trusted (/state reads them too): a
// symlink, FIFO or directory standing in for a file is treated as absent instead of followed or
// blocked on, and an absurdly large file is refused loudly rather than parsed.
function readText(file) {
  let stat;
  try { stat = fs.lstatSync(file); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
  if (stat.isSymbolicLink() || !stat.isFile()) return null;
  if (stat.size > MAX_TEXT_BYTES) throw new Error(`${path.basename(file)} is larger than ${MAX_TEXT_BYTES / 1024 / 1024} MB`);
  return fs.readFileSync(file, "utf8");
}
function isRegularFile(file) {
  try { const stat = fs.lstatSync(file); return stat.isFile() && !stat.isSymbolicLink(); } catch { return false; }
}

function markdownHeadings(text, level) {
  const marker = "#".repeat(level);
  return [...text.matchAll(new RegExp(`^${marker} (.+)$`, "gm"))].map((match) => match[1].trim());
}

// GitHub-style heading slug: lowercase, strip punctuation, spaces become dashes.
function slugifyHeading(heading) {
  return heading.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
}

// Content directly under one heading, up to the next heading of the same or shallower level.
function extractSection(text, heading) {
  const lines = text.split("\n");
  const startIndex = lines.findIndex((line) => { const match = line.match(/^(#{1,6})\s+(.+)$/); return match && match[2].trim() === heading; });
  if (startIndex === -1) return null;
  const level = lines[startIndex].match(/^(#{1,6})/)[1].length;
  let end = lines.length;
  for (let index = startIndex + 1; index < lines.length; index++) {
    const match = lines[index].match(/^(#{1,6})\s/);
    if (match && match[1].length <= level) { end = index; break; }
  }
  return lines.slice(startIndex + 1, end).join("\n");
}

function checkSlug(slug) {
  if (typeof slug !== "string" || !SLUG.test(slug)) throw new Error(`Invalid pitch slug: ${JSON.stringify(slug)}`);
  return slug;
}

function pitchDir(root, slug) { return full(root, `${PITCHES_DIR}/${checkSlug(slug)}`); }

function doneWorkSlugs(root) {
  const text = readText(full(root, DONE_WORK));
  const slugs = new Set();
  if (text) for (const match of text.matchAll(/^## ([a-z0-9](?:[a-z0-9-]*[a-z0-9])?) — shipped/gm)) slugs.add(match[1]);
  return slugs;
}

function listPitchSlugs(root) {
  const dir = full(root, PITCHES_DIR);
  let stat;
  try { stat = fs.lstatSync(dir); } catch { return []; }
  if (stat.isSymbolicLink() || !stat.isDirectory()) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && !EXCLUDED.has(entry.name)).map((entry) => entry.name).sort();
}

// Parses a real hill.md table by its actual header (not a fixed column index), skips the
// separator row (all-dash cells), and counts data rows whose Position column isn't "done".
function hillOpenCount(text) {
  const rows = [...text.matchAll(/^\|(.+)\|\s*$/gm)].map((match) => match[1].split("|").map((cell) => cell.trim()));
  if (rows.length < 2) return 0;
  const positionIndex = rows[0].map((cell) => cell.toLowerCase()).indexOf("position");
  if (positionIndex === -1) return 0;
  const dataRows = rows.slice(1).filter((cells) => !cells.every((cell) => /^:?-+:?$/.test(cell)));
  return dataRows.filter((cells) => !/^done$/i.test(cells[positionIndex] || "")).length;
}

function classify(root, slug) {
  const dir = pitchDir(root, slug);
  if (isRegularFile(path.join(dir, "SHIPPED.md"))) return { slug, eligible: true, reason: "shipped" };
  let hill;
  try { hill = readText(path.join(dir, "hill.md")); } catch (error) { return { slug, eligible: false, reason: `hill.md cannot be read (${error.message})` }; }
  if (hill) {
    const openCount = hillOpenCount(hill);
    if (openCount > 0) return { slug, eligible: false, reason: `active: hill shows ${openCount} scope row(s) not done` };
  }
  return { slug, eligible: false, reason: "no SHIPPED.md" };
}

function inventory(root) {
  const present = listPitchSlugs(root);
  const presentSet = new Set(present);
  // A directory whose name isn't a valid slug can never be compacted (every later step
  // validates the slug) — report it as preserved with the reason instead of letting one oddly
  // named directory throw and hide every other pitch from the inventory.
  const results = present.map((slug) => (SLUG.test(slug) ? classify(root, slug) : { slug, eligible: false, reason: "directory name is not a valid pitch slug (lowercase letters, digits and hyphens); rename it to make it eligible" }));
  for (const slug of doneWorkSlugs(root)) if (!presentSet.has(slug)) results.push({ slug, eligible: false, reason: "already compacted" });
  return results.sort((left, right) => left.slug.localeCompare(right.slug));
}

function requiredSections(root, slug) {
  const dir = pitchDir(root, slug);
  const shipped = readText(path.join(dir, "SHIPPED.md"));
  if (shipped === null) throw new Error(`Not eligible: ${slug} has no SHIPPED.md`);
  const required = markdownHeadings(shipped, 2).map((heading) => `SHIPPED.md#${slugifyHeading(heading)}`);

  const pitch = readText(path.join(dir, "pitch.md"));
  if (pitch) {
    for (const heading of ["No-gos", "Rabbit holes"]) {
      const section = extractSection(pitch, heading);
      if (section && section.trim()) required.push(`pitch.md#${slugifyHeading(heading)}`);
    }
  }

  for (const entry of fs.readdirSync(dir)) {
    if (/^audit-cycle-.+\.md$/.test(entry)) required.push(entry);
  }

  for (const file of ["deviations.md", "log.md"]) {
    const text = readText(path.join(dir, file));
    if (!text) continue;
    for (const heading of markdownHeadings(text, 2)) {
      const section = extractSection(text, heading);
      if (section && section.trim()) required.push(`${file}#${slugifyHeading(heading)}`);
    }
  }
  return required;
}

function buildLedger(root, slug) {
  return { slug, required: requiredSections(root, slug) };
}

function checkGraph(root) {
  const script = full(root, "ai-framework/scripts/graphify.js");
  const result = spawnSync(process.execPath, [script, "--check", "--json"], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    let detail = (result.stderr || result.stdout || "").trim();
    try { detail = JSON.parse(result.stdout).problems?.map((problem) => problem.message).join("; ") || detail; } catch { /* keep raw detail */ }
    throw new Error(`Knowledge graph invalid: ${detail || "graphify --check failed"}`);
  }
}

// A ledger destination is the proof that content survives compaction, so it must be a real,
// nonempty file that will still exist afterwards: inside the project, and NOT inside the pitch
// directory that remove() deletes (a destination there would count as "extracted" and then be
// deleted along with everything else — coverage 1.0 with nothing actually preserved). Resolved
// via realpath so a symlink into the pitch directory can't dodge the check.
function checkDestination(root, slug, destinationPath, original) {
  const target = full(root, destinationPath);
  if (!fs.existsSync(target)) throw new Error(`Destination does not exist: ${original}`);
  const real = fs.realpathSync(target);
  const outside = (base) => { const relative = path.relative(fs.realpathSync(base), real); return relative.startsWith("..") || path.isAbsolute(relative); };
  if (outside(root)) throw new Error(`Destination resolves outside the project: ${original}`);
  if (!outside(pitchDir(root, slug))) throw new Error(`Destination is inside the pitch being compacted and would be deleted with it: ${original}`);
  const stat = fs.statSync(real);
  if (!stat.isFile() || stat.size === 0) throw new Error(`Destination must be a nonempty file: ${original}`);
}

function commitLedger(root, slug, mapping, options = {}) {
  checkSlug(slug);
  const required = new Set(requiredSections(root, slug));
  if (!mapping || !Array.isArray(mapping.sections) || !mapping.sections.length) throw new Error("Ledger must have a nonempty sections array");
  const covered = new Set();
  const seen = new Set();
  for (const entry of mapping.sections) {
    if (!entry || typeof entry.source !== "string") throw new Error("Each ledger entry needs a string source");
    if (!required.has(entry.source)) throw new Error(`Ledger references an unknown required section: ${entry.source}`);
    if (seen.has(entry.source)) throw new Error(`Duplicate ledger entry: ${entry.source}`);
    seen.add(entry.source);
    covered.add(entry.source);
    if (entry.status === "extracted") {
      if (typeof entry.destination !== "string" || !entry.destination.trim()) throw new Error(`Extracted section missing destination: ${entry.source}`);
      checkDestination(root, slug, entry.destination.split("#")[0], entry.destination);
    } else if (entry.status === "gap") {
      if (typeof entry.reason !== "string" || !entry.reason.trim()) throw new Error(`Gap missing reason: ${entry.source}`);
    } else {
      throw new Error(`Invalid ledger status for ${entry.source}: ${entry.status}`);
    }
  }
  const missing = [...required].filter((section) => !covered.has(section));
  if (missing.length) throw new Error(`Ledger missing required section(s): ${missing.join(", ")}`);
  checkGraph(root);

  const coverage = mapping.sections.filter((entry) => entry.status === "extracted").length / mapping.sections.length;
  const gaps = mapping.sections.filter((entry) => entry.status === "gap").map((entry) => ({ source: entry.source, reason: entry.reason }));
  // A gap the ledger's own author declared is not an accepted gap — otherwise whoever writes
  // the mapping could mark every section a "gap" and pass the deletion gate at coverage 0
  // (confirmed by a live repro). Each gap needs a separate, explicit acceptance naming the
  // section, recorded in the ledger so it is auditable at the human gate and re-checked by
  // pitch-archive.js's remove().
  const accepted = options.acceptGaps || {};
  for (const [source, reason] of Object.entries(accepted)) {
    if (!gaps.some((gap) => gap.source === source)) throw new Error(`--accept-gap names a section that is not a gap in this ledger: ${source}`);
    if (typeof reason !== "string" || !reason.trim()) throw new Error(`--accept-gap needs a nonempty reason: ${source}`);
  }
  const unaccepted = gaps.filter((gap) => !accepted[gap.source]).map((gap) => gap.source);
  if (unaccepted.length) throw new Error(`Unaccepted gap(s): ${unaccepted.join(", ")} (a human must review each and pass --accept-gap SECTION=REASON)`);
  const acceptedGaps = gaps.map((gap) => ({ source: gap.source, reason: gap.reason, acceptedReason: accepted[gap.source] }));
  const record = { schemaVersion: 1, slug, sections: mapping.sections, coverage, gaps, acceptedGaps, committedAt: new Date().toISOString() };
  if (options.apply) {
    fs.mkdirSync(full(root, LEDGERS_DIR), { recursive: true });
    fs.writeFileSync(full(root, `${LEDGERS_DIR}/${slug}.json`), `${JSON.stringify(record, null, 2)}\n`);
  }
  return { slug, coverage, gaps, acceptedGaps, applied: Boolean(options.apply) };
}

function readShippedDate(root, slug) {
  const shipped = readText(path.join(pitchDir(root, slug), "SHIPPED.md")) || "";
  const match = shipped.match(/\*\*Shipped:\*\*\s*(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : new Date().toISOString().slice(0, 10);
}

// Idempotent: a rerun for the same slug replaces only that slug's own section, in place if it
// already existed (preserving surrounding sections' order), appended if it's new. Builds the
// result from trimmed string joins rather than a line-array filter — a filter keyed on "is this
// line equal to the file's last line" breaks the moment more than one blank line in the file
// happens to be "", which is every blank line; found and fixed via a two-write repro.
function writeDoneWork(root, slug, summaryText, options = {}) {
  checkSlug(slug);
  if (typeof summaryText !== "string" || !summaryText.trim()) throw new Error("A nonempty summary is required");
  const file = full(root, DONE_WORK);
  // readText treats a symlink or non-regular file as absent; writing "fresh" over one would follow the
  // link and destroy its target, so refuse instead.
  let occupied = null;
  try { occupied = fs.lstatSync(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (occupied && (occupied.isSymbolicLink() || !occupied.isFile())) throw new Error(`Refusing to write ${DONE_WORK}: it is a symlink or not a regular file`);
  const existingRaw = readText(file);
  const existing = existingRaw ?? "# Done Work\n";
  const lines = existing.split("\n");
  const heading = `## ${slug} — shipped `;
  const startIndex = lines.findIndex((line) => line.startsWith(heading));
  const section = [`## ${slug} — shipped ${readShippedDate(root, slug)}`, "", summaryText.trim(), ""].join("\n");
  let updated;
  if (startIndex === -1) {
    updated = `${existing.trimEnd()}\n\n${section}`;
  } else {
    let endIndex = lines.length;
    for (let index = startIndex + 1; index < lines.length; index++) {
      if (/^## /.test(lines[index])) { endIndex = index; break; }
    }
    const before = lines.slice(0, startIndex).join("\n").trimEnd();
    const after = lines.slice(endIndex).join("\n").trim();
    updated = after ? `${before}\n\n${section}\n\n${after}` : `${before}\n\n${section}`;
  }
  updated = `${updated.replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
  const changed = existingRaw !== updated;
  if (options.apply) {
    // Temp file + rename: a reader never sees a partial file, and rename replaces a path rather than following it.
    const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
    try { fs.writeFileSync(temporary, updated, { flag: "wx" }); fs.renameSync(temporary, file); } finally { fs.rmSync(temporary, { force: true }); }
  }
  return { slug, changed, content: updated };
}

function cli(argv) {
  const options = { root: process.cwd() };
  const positional = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--root" && argv[index + 1] !== undefined) options.root = argv[++index];
    else if (arg === "--file" && argv[index + 1] !== undefined) options.file = argv[++index];
    else if (arg === "--summary" && argv[index + 1] !== undefined) options.summary = argv[++index];
    else if (arg === "--accept-gap" && argv[index + 1] !== undefined) {
      const value = argv[++index];
      const split = value.indexOf("=");
      if (split < 1) throw new Error(`--accept-gap expects SECTION=REASON, got: ${value}`);
      (options.acceptGaps ||= {})[value.slice(0, split)] = value.slice(split + 1);
    }
    else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    else positional.push(arg);
  }
  const [action, slugArg] = positional;
  const root = fs.realpathSync(options.root);

  if (action === "inventory") {
    const result = inventory(root);
    if (options.json) return JSON.stringify(result, null, 2);
    return result.map((entry) => `${entry.slug}: ${entry.eligible ? "eligible" : `preserved (${entry.reason})`}`).join("\n");
  }
  if (action === "ledger") {
    const result = buildLedger(root, slugArg);
    return options.json ? JSON.stringify(result, null, 2) : result.required.join("\n");
  }
  if (action === "commit-ledger") {
    if (!options.file) throw new Error("commit-ledger requires --file <ledger.json>");
    const mapping = JSON.parse(fs.readFileSync(options.file, "utf8"));
    const result = commitLedger(root, slugArg, mapping, { apply: options.apply, acceptGaps: options.acceptGaps });
    return options.json ? JSON.stringify(result, null, 2) : `${result.slug}: coverage ${(result.coverage * 100).toFixed(0)}%, ${result.gaps.length} gap(s), applied=${result.applied}`;
  }
  if (action === "write-done-work") {
    if (!options.summary) throw new Error("write-done-work requires --summary <file>");
    const summaryText = fs.readFileSync(options.summary, "utf8");
    const result = writeDoneWork(root, slugArg, summaryText, { apply: options.apply });
    return options.json ? JSON.stringify({ slug: result.slug, changed: result.changed, applied: Boolean(options.apply) }, null, 2) : (options.apply ? `wrote ${slugArg}` : result.content);
  }
  throw new Error("Usage: node ai-framework/scripts/pitch-compress.js <inventory | ledger SLUG | commit-ledger SLUG --file F [--accept-gap SECTION=REASON]... | write-done-work SLUG --summary F> [--apply] [--root /absolute/project] [--json]");
}

module.exports = { inventory, classify, buildLedger, requiredSections, commitLedger, writeDoneWork, slugifyHeading, extractSection };

if (require.main === module) {
  try {
    const result = cli(process.argv.slice(2));
    process.stdout.write(`${result}\n`);
  } catch (error) { process.stderr.write(`pitch-compress: ${error.message}\n`); process.exitCode = 1; }
}
