#!/usr/bin/env node
/*
 * Validates and (on --apply) syncs structural changes from a newer copy of this source
 * bundle into an already-unpacked target project. Run this FROM THE TARGET PROJECT ROOT,
 * pointing --source at a checkout of ai-workflow-portable.
 *
 * Only the bundle's canonical directories are compared (rules, workflow, templates,
 * integrations, scripts, hooks, canonical agents/skills, and their OpenCode/Codex/Cursor
 * mirrors). .project/, settings files, and credentials are never touched; AGENTS.md,
 * CLAUDE.md, opencode.json, and .codex/config.toml are only flagged for manual review.
 *
 * Local customizations are protected by a three-way comparison against the bundle version
 * the project was last synced from ("base"): the hash manifest in .project/.bundle-sync.json,
 * or, on a first sync, --base-ref <git ref in the source repo> (the commit originally unpacked).
 *   changed   local == base, upstream moved       -> applied
 *   local     upstream == base, project edited    -> kept, never overwritten
 *   conflict  both edited                         -> kept, reported for a manual merge
 *   unverified no base known                      -> kept unless --overwrite-unverified
 *
 * Dry run (default): node ai-framework/scripts/bundle-sync.js --source <path> [--base-ref <ref>] [--json]
 * Apply:              ... --apply [--prune] [--overwrite-unverified]
 *
 * --prune deletes files removed upstream only when they are unmodified versus base.
 */

const fsp = require("node:fs/promises");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const root = process.cwd();
const apply = process.argv.includes("--apply");
const prune = process.argv.includes("--prune");
const overwriteUnverified = process.argv.includes("--overwrite-unverified");
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
  local: "\u001b[32m",
  conflict: "\u001b[31m",
  unverified: "\u001b[31m",
  removed: "\u001b[31m",
  flagged: "\u001b[35m",
  reset: "\u001b[0m",
};

function paint(status, text) {
  return color ? `${colors[status] || ""}${text}${colors.reset}` : text;
}

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const SYNCED_DIRS = [
  "ai-framework/rules",
  "ai-framework/workflow",
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

// Directories the bundle once shipped and has since removed entirely; still scanned on the
// target side so their files are reported as removed-in-source.
const RETIRED_DIRS = ["ai-framework/contexts"];

const FLAGGED_FILES = ["AGENTS.md", "CLAUDE.md", ".opencode/opencode.json", ".codex/config.toml"];

const IGNORE_NAMES = new Set([".DS_Store"]);
const MARKER = ".project/.bundle-sync.json";

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
    if (entry.isDirectory()) files.push(...(await walk(full, base)));
    else if (entry.isFile()) files.push(path.relative(base, full));
  }
  return files;
}

const hash = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

async function fileHash(target) {
  try {
    return hash(await fsp.readFile(target));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function makeBaseLookup(sourceRoot, manifest, baseRef) {
  const cache = new Map();
  return (relPath) => {
    if (manifest?.files && relPath in manifest.files) return manifest.files[relPath];
    if (!baseRef) return undefined;
    if (cache.has(relPath)) return cache.get(relPath);
    let digest = null;
    try {
      digest = hash(execFileSync("git", ["-C", sourceRoot, "show", `${baseRef}:${relPath}`], { stdio: ["ignore", "pipe", "ignore"] }));
    } catch {
      // Not present at base: the file is new upstream or was added locally.
    }
    cache.set(relPath, digest);
    return digest;
  };
}

function classify(localDigest, sourceDigest, baseDigest) {
  if (localDigest === sourceDigest) return "same";
  if (baseDigest === undefined) return "unverified";
  if (localDigest === baseDigest) return "changed";
  if (sourceDigest === baseDigest) return "local";
  return "conflict";
}

async function compareDir(relDir, sourceRoot, baseOf) {
  const sourceDir = path.join(sourceRoot, relDir);
  const targetDir = path.join(root, relDir);
  const sourceFiles = await walk(sourceDir);
  const targetFiles = await walk(targetDir);
  const targetByLower = new Map(targetFiles.map((rel) => [rel.toLowerCase(), rel]));
  const sourceLower = new Set(sourceFiles.map((rel) => rel.toLowerCase()));
  const results = [];

  for (const rel of sourceFiles) {
    const label = path.join(relDir, rel);
    const sourcePath = path.join(sourceDir, rel);
    const existing = targetByLower.get(rel.toLowerCase());
    if (existing === undefined) {
      results.push({ status: "new", path: label, sourcePath, targetPath: path.join(targetDir, rel) });
      continue;
    }
    const existingLabel = path.join(relDir, existing);
    const targetPath = path.join(targetDir, existing);
    const [sourceDigest, localDigest] = await Promise.all([fileHash(sourcePath), fileHash(targetPath)]);
    const baseDigest = baseOf(label) ?? baseOf(existingLabel);
    const status = classify(localDigest, sourceDigest, baseDigest);
    const caseRename = existing !== rel ? existingLabel : undefined;
    if (status === "same" && !caseRename) continue;
    results.push({ status: status === "same" ? "changed" : status, path: label, caseRename, sourcePath, targetPath, finalPath: path.join(targetDir, rel) });
  }

  for (const rel of targetFiles) {
    if (sourceLower.has(rel.toLowerCase())) continue;
    const label = path.join(relDir, rel);
    const targetPath = path.join(targetDir, rel);
    const baseDigest = baseOf(label);
    const localDigest = await fileHash(targetPath);
    const modified = baseDigest === undefined ? "unverified" : localDigest === baseDigest ? "unmodified" : "modified";
    results.push({ status: "removed", path: label, targetPath, modified });
  }
  return results;
}

async function compareFlagged(sourceRoot) {
  const results = [];
  for (const rel of FLAGGED_FILES) {
    const [sourceDigest, targetDigest] = await Promise.all([fileHash(path.join(sourceRoot, rel)), fileHash(path.join(root, rel))]);
    if (sourceDigest === null && targetDigest === null) continue;
    if (sourceDigest !== targetDigest) results.push({ status: "flagged", path: rel });
  }
  return results;
}

async function applyEntry(entry) {
  if (entry.caseRename) {
    // Two-step rename so case-insensitive filesystems actually change the recorded case.
    const temp = `${entry.targetPath}.bundle-sync-tmp`;
    await fsp.rename(entry.targetPath, temp);
    await fsp.rename(temp, entry.finalPath);
  }
  const destination = entry.finalPath ?? entry.targetPath;
  await fsp.mkdir(path.dirname(destination), { recursive: true });
  if (entry.status !== "local" && entry.status !== "conflict") await fsp.copyFile(entry.sourcePath, destination);
}

async function removeEmptyParents(file) {
  let dir = path.dirname(file);
  while (dir.startsWith(root) && dir !== root) {
    const left = (await fsp.readdir(dir)).filter((name) => !IGNORE_NAMES.has(name));
    if (left.length) return;
    await fsp.rm(dir, { recursive: true });
    dir = path.dirname(dir);
  }
}

async function sourceManifest(sourceRoot) {
  const files = {};
  for (const dir of SYNCED_DIRS) {
    for (const rel of await walk(path.join(sourceRoot, dir))) {
      files[path.join(dir, rel)] = await fileHash(path.join(sourceRoot, dir, rel));
    }
  }
  return files;
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
    process.stderr.write(`error: ${sourceRoot} does not look like an ai-workflow-portable checkout\n`);
    process.exitCode = 1;
    return;
  }
  if (sourceRoot === path.resolve(root)) {
    process.stderr.write("error: --source resolves to the current project root; nothing to sync\n");
    process.exitCode = 1;
    return;
  }

  let manifest = null;
  try {
    manifest = JSON.parse(await fsp.readFile(path.join(root, MARKER), "utf8"));
  } catch {
    // First sync: no manifest yet.
  }
  const baseRef = arg("base-ref");
  const baseOf = makeBaseLookup(sourceRoot, manifest, baseRef);
  const baseSource = manifest?.files ? `manifest (${MARKER})` : baseRef ? `git ref ${baseRef}` : "none";

  const entries = (await Promise.all([...SYNCED_DIRS, ...RETIRED_DIRS].map((dir) => compareDir(dir, sourceRoot, baseOf)))).flat();
  const flagged = await compareFlagged(sourceRoot);
  const group = (status) => entries.filter((entry) => entry.status === status);
  const groups = {
    new: group("new"),
    changed: group("changed"),
    local: group("local"),
    conflict: group("conflict"),
    unverified: group("unverified"),
    removed: group("removed"),
  };

  const applied = [];
  const pruned = [];
  if (apply) {
    const toApply = [...groups.new, ...groups.changed, ...(overwriteUnverified ? groups.unverified : [])];
    for (const entry of toApply) {
      await applyEntry(entry);
      applied.push(entry.path);
    }
    for (const entry of [...groups.local, ...groups.conflict]) {
      if (entry.caseRename) await applyEntry(entry);
    }
    if (prune) {
      for (const entry of groups.removed.filter((item) => item.modified === "unmodified")) {
        await fsp.rm(entry.targetPath);
        await removeEmptyParents(entry.targetPath);
        pruned.push(entry.path);
      }
    }
  }

  let markerPath = null;
  if (apply && fs.existsSync(path.join(root, ".project"))) {
    let sourceVersion = null;
    try {
      sourceVersion = (await fsp.readFile(path.join(sourceRoot, "VERSION"), "utf8")).trim();
    } catch {
      // Source predates VERSION.
    }
    const marker = {
      lastSyncedAt: new Date().toISOString(),
      source: sourceRoot,
      sourceVersion,
      applied,
      pruned,
      keptLocal: groups.local.map((entry) => entry.path),
      conflicts: groups.conflict.map((entry) => entry.path),
      files: await sourceManifest(sourceRoot),
    };
    await fsp.writeFile(path.join(root, MARKER), JSON.stringify(marker, null, 2) + "\n");
    markerPath = MARKER;
  }

  const summary = {
    source: sourceRoot,
    base: baseSource,
    ...Object.fromEntries(Object.entries(groups).map(([key, list]) => [key, list.length])),
    flaggedForReview: flagged.length,
    applied: apply,
    appliedCount: applied.length,
    prunedCount: pruned.length,
    marker: markerPath,
  };

  if (json) {
    process.stdout.write(JSON.stringify({ summary, ...groups, flagged }, null, 2) + "\n");
    return;
  }

  process.stdout.write(`Source: ${sourceRoot}\nBase: ${baseSource}\nMode: ${apply ? "apply" : "dry run (pass --apply to write)"}\n\n`);
  const print = (label, status, list, describe = (entry) => entry.path) => {
    if (!list.length) return;
    process.stdout.write(`${paint(status, label)} (${list.length}):\n`);
    list.forEach((entry) => process.stdout.write(`  ${describe(entry)}\n`));
    process.stdout.write("\n");
  };
  const withRename = (entry) => (entry.caseRename ? `${entry.path}  (rename from ${entry.caseRename})` : entry.path);
  print("NEW in source", "new", groups.new);
  print("CHANGED upstream only (safe to apply)", "changed", groups.changed, withRename);
  print("LOCAL customization, upstream unchanged (kept)", "local", groups.local, withRename);
  print("CONFLICT: edited both locally and upstream (kept; merge manually)", "conflict", groups.conflict, withRename);
  print("UNVERIFIED: differs, no base to tell who changed it (kept; pass --base-ref)", "unverified", groups.unverified, withRename);
  print("REMOVED in source", "removed", groups.removed, (entry) => `${entry.path}  [${entry.modified}]`);
  print("FLAGGED for manual review (project-specific sections; never auto-applied)", "flagged", flagged);

  if (apply) {
    process.stdout.write(`Applied ${applied.length} file(s); pruned ${pruned.length}.\n`);
    if (markerPath) process.stdout.write(`Recorded base manifest: ${markerPath}\n`);
  } else {
    process.stdout.write("Re-run with --apply (and --prune to delete unmodified removed files) after review.\n");
  }
}

main().catch((error) => {
  process.stderr.write(`error: ${error.message}\n`);
  process.exitCode = 1;
});
