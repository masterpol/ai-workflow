#!/usr/bin/env node
/*
 * Validates and (on --apply) syncs structural changes from a newer copy of this source
 * bundle into an already-unpacked target project. Run this FROM THE TARGET PROJECT ROOT,
 * pointing --source at a checkout of ai-workflow-portable.
 *
 * Only the bundle's canonical, "never forked" directories are compared/synced (rules,
 * workflow, contexts, templates, integrations, scripts, hooks, canonical agents/skills, and
 * their thin OpenCode/Codex/Cursor mirrors). Project-specific state (.project/, settings.json,
 * settings.local.json, credentials) is never read from or written to the source, and root
 * entry files (AGENTS.md, CLAUDE.md, opencode.json, .codex/config.toml) are only ever flagged
 * for manual review since they carry project-specific sections mixed into canonical content.
 *
 * Dry run (default): node ai-framework/scripts/bundle-sync.js --source <path> [--json]
 * Apply:              node ai-framework/scripts/bundle-sync.js --source <path> --apply
 *
 * Dry run never writes anything. --apply overwrites/creates files inside the synced
 * directories only; it never deletes a file that disappeared from source (those are reported
 * as "removed-in-source" for a human/agent to decide on) and never touches an excluded path.
 */

const fsp = require("node:fs/promises");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = process.cwd();
const apply = process.argv.includes("--apply");
const json = process.argv.includes("--json");
const color = !json && process.stdout.isTTY && !process.argv.includes("--no-color") && !process.env.NO_COLOR;

// Piping into `head` closes stdout early; exit quietly instead of dumping an EPIPE stack.
process.stdout.on("error", (error) => {
  if (error.code === "EPIPE") process.exit(0);
  throw error;
});

const colors = {
  new: "\u001b[36m",
  changed: "\u001b[33m",
  same: "\u001b[32m",
  removed: "\u001b[31m",
  flagged: "\u001b[35m",
  synced: "\u001b[36m",
  reset: "\u001b[0m",
};

function paint(status, text) {
  return color ? `${colors[status] || ""}${text}${colors.reset}` : text;
}

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

// Directories fully synced from source: this bundle's own docs (README.md, "One source,
// every vendor") describe every file under these paths as canonical and never hand-forked per
// project, so overwriting the target's copy with the source's is the correct, intended behavior.
const SYNCED_DIRS = [
  "ai-framework/rules",
  "ai-framework/workflow",
  "ai-framework/contexts",
  "ai-framework/templates",
  "ai-framework/integrations",
  "ai-framework/scripts",
  "ai-framework/hooks",
  ".claude/agents",
  ".claude/skills",
  ".claude/hooks",
  ".opencode/commands",
  ".opencode/agents",
  ".codex/agents",
  ".agents/skills",
  ".cursor/agents",
  ".cursor/skills",
];

// Root/config files that mix canonical content with project-specific sections or local
// provider settings — always flagged for manual review, never auto-applied.
const FLAGGED_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  ".opencode/opencode.json",
  ".codex/config.toml",
];

const IGNORE_NAMES = new Set([".DS_Store"]);

async function exists(target) {
  try {
    await fsp.access(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, base = dir) {
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    if (IGNORE_NAMES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full, base)));
    } else if (entry.isFile()) {
      files.push(path.relative(base, full));
    }
  }
  return files;
}

function hash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function fileHash(target) {
  try {
    return hash(await fsp.readFile(target));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function compareDir(relDir, sourceRoot) {
  const sourceDir = path.join(sourceRoot, relDir);
  const targetDir = path.join(root, relDir);
  const sourceFiles = new Set(await walk(sourceDir));
  const targetFiles = new Set(await walk(targetDir));
  const results = [];

  for (const rel of sourceFiles) {
    const sourcePath = path.join(sourceDir, rel);
    const targetPath = path.join(targetDir, rel);
    const relLabel = path.join(relDir, rel);
    if (!targetFiles.has(rel)) {
      results.push({ status: "new", path: relLabel, sourcePath, targetPath });
      continue;
    }
    const [sourceDigest, targetDigest] = await Promise.all([
      fileHash(sourcePath),
      fileHash(targetPath),
    ]);
    results.push({
      status: sourceDigest === targetDigest ? "same" : "changed",
      path: relLabel,
      sourcePath,
      targetPath,
    });
  }

  for (const rel of targetFiles) {
    if (!sourceFiles.has(rel)) {
      results.push({
        status: "removed",
        path: path.join(relDir, rel),
        sourcePath: path.join(sourceDir, rel),
        targetPath: path.join(targetDir, rel),
      });
    }
  }

  return results;
}

async function compareFlagged(sourceRoot) {
  const results = [];
  for (const rel of FLAGGED_FILES) {
    const sourcePath = path.join(sourceRoot, rel);
    const targetPath = path.join(root, rel);
    const [sourceDigest, targetDigest] = await Promise.all([
      fileHash(sourcePath),
      fileHash(targetPath),
    ]);
    if (sourceDigest === null && targetDigest === null) continue;
    results.push({
      status: sourceDigest === targetDigest ? "same" : "flagged",
      path: rel,
      sourcePath,
      targetPath,
    });
  }
  return results;
}

async function applyFile(entry) {
  await fsp.mkdir(path.dirname(entry.targetPath), { recursive: true });
  await fsp.copyFile(entry.sourcePath, entry.targetPath);
}

async function writeMarker(sourceRoot, summary) {
  const projectDir = path.join(root, ".project");
  if (!fs.existsSync(projectDir)) return null;
  let sourceVersion = null;
  try {
    sourceVersion = (await fsp.readFile(path.join(sourceRoot, "VERSION"), "utf8")).trim();
  } catch {
    // Source has no VERSION yet — fine, marker just omits it.
  }
  const marker = {
    lastSyncedAt: new Date().toISOString(),
    source: sourceRoot,
    sourceVersion,
    applied: summary,
  };
  const markerPath = path.join(projectDir, ".bundle-sync.json");
  await fsp.writeFile(markerPath, JSON.stringify(marker, null, 2) + "\n");
  return path.relative(root, markerPath);
}

async function main() {
  const source = arg("source");
  if (!source) {
    process.stderr.write("error: --source <path-to-ai-workflow-portable> is required\n");
    process.exitCode = 1;
    return;
  }
  const sourceRoot = path.resolve(source);
  if (!(await exists(path.join(sourceRoot, "ai-framework/workflow/overview.md")))) {
    process.stderr.write(
      `error: ${sourceRoot} does not look like an ai-workflow-portable checkout ` +
      "(missing ai-framework/workflow/overview.md)\n"
    );
    process.exitCode = 1;
    return;
  }
  if (path.resolve(sourceRoot) === path.resolve(root)) {
    process.stderr.write("error: --source resolves to the current project root; nothing to sync\n");
    process.exitCode = 1;
    return;
  }

  const perDir = await Promise.all(SYNCED_DIRS.map((dir) => compareDir(dir, sourceRoot)));
  const all = perDir.flat();
  const flagged = await compareFlagged(sourceRoot);

  const byStatus = { new: [], changed: [], same: [], removed: [] };
  for (const entry of all) byStatus[entry.status].push(entry);

  const synced = [];
  if (apply) {
    for (const entry of [...byStatus.new, ...byStatus.changed]) {
      await applyFile(entry);
      synced.push(entry.path);
    }
  }

  const markerPath = apply ? await writeMarker(sourceRoot, synced) : null;

  const summary = {
    source: sourceRoot,
    new: byStatus.new.length,
    changed: byStatus.changed.length,
    same: byStatus.same.length,
    removedInSource: byStatus.removed.length,
    flaggedForReview: flagged.filter((entry) => entry.status === "flagged").length,
    applied: apply,
    syncedCount: synced.length,
    marker: markerPath,
  };

  if (json) {
    process.stdout.write(JSON.stringify({ summary, new: byStatus.new, changed: byStatus.changed, removed: byStatus.removed, flagged }, null, 2) + "\n");
    return;
  }

  process.stdout.write(`Source: ${sourceRoot}\n`);
  process.stdout.write(`Mode: ${apply ? "apply" : "dry run (pass --apply to write)"}\n\n`);

  const printGroup = (label, status, entries) => {
    if (!entries.length) return;
    process.stdout.write(`${paint(status, label)} (${entries.length}):\n`);
    entries.forEach((entry) => process.stdout.write(`  ${entry.path}\n`));
    process.stdout.write("\n");
  };

  printGroup("NEW in source", "new", byStatus.new);
  printGroup("CHANGED in source", "changed", byStatus.changed);
  printGroup("REMOVED in source (not auto-deleted; review and remove manually)", "removed", byStatus.removed);
  printGroup(
    "FLAGGED for manual review (project-specific sections; never auto-applied)",
    "flagged",
    flagged.filter((entry) => entry.status === "flagged")
  );

  if (apply) {
    process.stdout.write(`Synced ${synced.length} file(s).\n`);
    if (markerPath) process.stdout.write(`Recorded sync marker: ${markerPath}\n`);
  } else if (byStatus.new.length || byStatus.changed.length) {
    process.stdout.write("Re-run with --apply after review to write these changes.\n");
  } else {
    process.stdout.write("No structural drift found.\n");
  }
}

main().catch((error) => {
  process.stderr.write(`error: ${error.message}\n`);
  process.exitCode = 1;
});
