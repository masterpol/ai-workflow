#!/usr/bin/env node
import { runWorkflowSync } from "./runtime/entry.mts";
import { runDirect } from "./runtime/cli.mts";
import { migrateInstanceEntries } from "./runtime/migrate.mts";
/*
 * Validates and (on --apply) syncs structural changes from a newer copy of this source
 * bundle into an already-unpacked target project. Run this FROM THE TARGET PROJECT ROOT.
 * By default it compares against the public GitHub main branch; --source accepts a local
 * checkout when an offline or pre-release comparison is needed.
 *
 * Only the bundle's canonical directories are compared (rules, workflow, templates,
 * integrations, scripts, hooks, canonical agents/skills, and their OpenCode/Codex/Cursor
 * mirrors). .project/ records are never touched, with receipt-verified removal of the
 * last /state delivery in .project/reports/ as the single exception (the sync marker
 * still records the baseline). Settings files and credentials are never touched. AGENTS.md,
 * CLAUDE.md, SETUP.md, README.md, opencode.json, and .codex/config.toml are only flagged for
 * manual review.
 *
 * Local customizations are protected by a three-way comparison against the bundle version
 * the project was last synced from ("base"): the hash manifest in .project/.bundle-sync.json,
 * or, on a first sync, --base-ref <git ref in the source repo> (the commit originally unpacked).
 *   changed   local == base, upstream moved       -> applied
 *   local     upstream == base, project edited    -> kept, never overwritten
 *   conflict  both edited                         -> kept, reported for a manual merge
 *   unverified no base known                      -> kept unless --overwrite-unverified
 *
 * Dry run (default): node ai-framework/scripts/bundle-sync.mts [--base-ref <ref>] [--json]
 * Local source:       ... --source <path> [--base-ref <ref>]
 * Apply:              ... --apply [--prune] [--overwrite-unverified]
 *
 * --prune deletes files removed upstream only when they are unmodified versus base.
 *
 * Upgrade path: this file is what an existing install runs to update itself. It imports only
 * siblings that every synced bundle ships under ai-framework/scripts/ (an old install receives
 * them from its own old bundle-sync.mts before it ever runs this one).
 */

import { ownedPaths } from "./skill-sync.mts";
import { resolveClaudeEntry } from "./entry-import.mts";
import { CONSOLIDATION_COMMAND, legacyInventory } from "./consolidation-migrate.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

type Status = "new" | "changed" | "local" | "conflict" | "unverified" | "removed";
type Digest = string | null;

export interface SyncEntry {
  status: Status;
  path: string;
  baseDigest?: Digest;
  caseRename?: string;
  sourcePath?: string;
  targetPath: string;
  finalPath?: string;
  modified?: "unverified" | "unmodified" | "modified";
}
interface Flagged { status: "flagged"; path: string }
interface NextStep { kind: string; message: string }
interface SkillSyncReport { status: string; error?: string; skills: { id: string; status: string; vendors?: string[]; error?: string }[] }
interface Manifest { files?: Record<string, Digest> }
interface Source { root: string; label: string; manifestSource: string; cleanup: () => Promise<void> }
type BaseLookup = (relPath: string) => Digest | undefined;

export const SYNCED_DIRS: readonly string[] = [
  "ai-framework/rules",
  "ai-framework/workflow",
  "ai-framework/templates",
  "ai-framework/integrations",
  "ai-framework/docs",
  "ai-framework/scripts",
  "ai-framework/hooks",
  ".claude/agents",
  ".claude/skills",
  ".claude/hooks",
  ".opencode/commands",
  ".opencode/agents",
  ".opencode/plugins",
  ".codex/agents",
  ".agents/skills",
  ".cursor/agents",
  ".cursor/skills",
];

// Directories the bundle once shipped and has since removed entirely; still scanned on the
// target side so their files are reported as removed-in-source.
export const RETIRED_DIRS: readonly string[] = ["ai-framework/contexts"];

export const FLAGGED_FILES: readonly string[] = ["AGENTS.md", "CLAUDE.md", ".opencode/opencode.json", ".codex/config.toml", "SETUP.md", "README.md"];

const IGNORE_NAMES = new Set([".DS_Store"]);
const MARKER = ".project/.bundle-sync.json";
const PUBLIC_REPOSITORY = "https://github.com/masterpol/ai-workflow.git";
const PUBLIC_BRANCH = "main";
// child_process.execFileSync's default output cap; the old script relied on it for both git calls
// and the skill-sync run, so the same cap keeps an oversized output on the same (failure) path.
const EXEC_MAX_BUFFER = 1024 * 1024;

const colors: Record<string, string> = {
  new: "\u001b[36m",
  changed: "\u001b[33m",
  local: "\u001b[32m",
  conflict: "\u001b[31m",
  unverified: "\u001b[31m",
  removed: "\u001b[31m",
  flagged: "\u001b[35m",
  reset: "\u001b[0m",
};

const codeOf = (error: unknown): string | undefined =>
  typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : undefined;
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Three-way classification of one file against the recorded merge base. Pure. */
export function classify(localDigest: Digest, sourceDigest: Digest, baseDigest: Digest | undefined): Status | "same" {
  if (localDigest === sourceDigest) return "same";
  if (baseDigest === undefined) return "unverified";
  if (localDigest === baseDigest) return "changed";
  if (sourceDigest === baseDigest) return "local";
  return "conflict";
}

/** The value of `--<name>` (the next argv item), or undefined. Pure. */
export function argValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(`--${name}`);
  return index === -1 ? undefined : argv[index + 1];
}

/** What a failed execFileSync would have thrown: stdout/stderr plus Node's "Command failed" message. */
function commandFailure(command: string, args: string[], stdout: string, stderr: string): Error & { stdout: string; stderr: string } {
  const error = new Error(`Command failed: ${[command, ...args].join(" ")}${stderr ? `\n${stderr}` : ""}`) as Error & { stdout: string; stderr: string };
  error.stdout = stdout;
  error.stderr = stderr;
  return error;
}

export function makeSync(argv: string[], deps: RuntimeDeps) {
  const { fs, path } = deps;
  const root = deps.proc.cwd();
  const apply = argv.includes("--apply");
  const prune = argv.includes("--prune");
  const overwriteUnverified = argv.includes("--overwrite-unverified");
  const json = argv.includes("--json");
  const color = !json && deps.io.stdout.isTTY && !argv.includes("--no-color") && !deps.proc.env.NO_COLOR;
  const write = (text: string): void => { deps.io.stdout.write(text); };
  const paint = (status: string, text: string): string => (color ? `${colors[status] || ""}${text}${colors.reset}` : text);

  async function exists(target: string): Promise<boolean> {
    try {
      await fs.access(target);
      return true;
    } catch {
      return false;
    }
  }

  async function walk(dir: string, base: string = dir): Promise<string[]> {
    let entries;
    try {
      entries = await fs.readdirEntries(dir);
    } catch (error) {
      if (codeOf(error) === "ENOENT") return [];
      throw error;
    }
    if (dir === base && (await fs.lstat(dir)).isSymbolicLink()) throw new Error(`refusing symlinked sync directory: ${dir}`);
    const files: string[] = [];
    for (const entry of entries) {
      if (IGNORE_NAMES.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...(await walk(full, base)));
      else if (entry.isFile()) files.push(path.relative(base, full));
    }
    return files;
  }

  const hash = (data: Uint8Array): string => deps.crypto.sha256Hex(data);

  async function fileHash(target: string): Promise<Digest> {
    try {
      return hash(fs.readBytesSync(target));
    } catch (error) {
      if (codeOf(error) === "ENOENT") return null;
      throw error;
    }
  }

  function makeBaseLookup(sourceRoot: string, manifest: Manifest | null, baseRef: string | undefined): BaseLookup {
    const cache = new Map<string, Digest>();
    return (relPath) => {
      if (manifest?.files && relPath in manifest.files) return manifest.files[relPath];
      if (!baseRef) return undefined;
      if (cache.has(relPath)) return cache.get(relPath);
      let digest: Digest = null;
      try {
        const shown = deps.child.runSync("git", ["-C", sourceRoot, "show", `${baseRef}:${relPath}`], { encoding: "buffer", maxBufferBytes: EXEC_MAX_BUFFER });
        if (shown.status === 0 && !shown.errorCode) digest = hash(shown.stdoutBytes ?? new Uint8Array());
      } catch {
        // git itself is unavailable: treated like a file not present at base.
      }
      // Not present at base: the file is new upstream or was added locally.
      cache.set(relPath, digest);
      return digest;
    };
  }

  async function compareDir(relDir: string, sourceRoot: string, baseOf: BaseLookup, excluded: Set<string>): Promise<SyncEntry[]> {
    const sourceDir = path.join(sourceRoot, relDir);
    const targetDir = path.join(root, relDir);
    const sourceFiles = await walk(sourceDir);
    const targetFiles = await walk(targetDir);
    const targetByLower = new Map(targetFiles.map((rel) => [rel.toLowerCase(), rel]));
    const sourceLower = new Set(sourceFiles.map((rel) => rel.toLowerCase()));
    const results: SyncEntry[] = [];

    for (const rel of sourceFiles) {
      const label = path.join(relDir, rel);
      if (excluded.has(label.toLowerCase())) continue;
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
      results.push({ status: status === "same" ? "changed" : status, path: label, baseDigest, caseRename, sourcePath, targetPath, finalPath: path.join(targetDir, rel) });
    }

    for (const rel of targetFiles) {
      if (sourceLower.has(rel.toLowerCase())) continue;
      const label = path.join(relDir, rel);
      // Files owned by the local skill registry (add-skill) were never part of the canonical
      // bundle: report them as neither new nor removed, so a registry-managed skill under
      // .claude/skills/<name>/ never reads as "REMOVED in source" and is never a prune candidate.
      if (excluded.has(label.toLowerCase())) continue;
      const targetPath = path.join(targetDir, rel);
      const baseDigest = baseOf(label);
      const localDigest = await fileHash(targetPath);
      const modified = baseDigest === undefined ? "unverified" : localDigest === baseDigest ? "unmodified" : "modified";
      results.push({ status: "removed", path: label, baseDigest, targetPath, modified });
    }
    return results;
  }

  async function compareFlagged(sourceRoot: string): Promise<Flagged[]> {
    const results: Flagged[] = [];
    for (const rel of FLAGGED_FILES) {
      const [sourceDigest, targetDigest] = await Promise.all([fileHash(path.join(sourceRoot, rel)), fileHash(path.join(root, rel))]);
      if (sourceDigest === null && targetDigest === null) continue;
      if (sourceDigest !== targetDigest) results.push({ status: "flagged", path: rel });
    }
    return results;
  }

  /** Refuses to write or remove through a symlink at the destination or any ancestor below the project root. */
  async function assertNoSymlinkPath(destination: string, base: string = root): Promise<void> {
    const relative = path.relative(base, destination);
    let current = base;
    if ((await fs.lstat(base)).isSymbolicLink()) throw new Error("refusing symlinked sync root");
    for (const part of relative.split(path.sep)) {
      current = path.join(current, part);
      let stat;
      try { stat = await fs.lstat(current); } catch (error) { if (codeOf(error) === "ENOENT") return; throw error; }
      if (stat.isSymbolicLink()) throw new Error(`refusing to write through symlink: ${current}`);
    }
  }

  // Read data only: bounded descriptor reads refuse links, FIFOs and growing files.
  async function readBounded(file: string, limit: number, base: string = root, pin?: (identity: { dev: number; ino: number }) => void): Promise<Uint8Array> {
    await assertNoSymlinkPath(file, base);
    const before = await fs.lstat(file);
    if (!before.isFile()) throw new Error("report-not-regular");
    if (before.size > limit) throw new Error("report-oversize");
    const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
    try {
      const opened = fs.fstatSync(fd);
      if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) throw new Error("report-changed");
      if (opened.size > limit) throw new Error("report-oversize");
      // The identity of the descriptor whose bytes are about to be hashed, not of whatever the path names later.
      pin?.({ dev: opened.dev, ino: opened.ino });
      const bytes = new Uint8Array(limit + 1);
      let length = 0;
      while (length < bytes.length) {
        const count = fs.readSync(fd, bytes, length, bytes.length - length, null);
        if (!count) break;
        length += count;
      }
      if (length > limit) throw new Error("report-oversize");
      return bytes.slice(0, length);
    } finally { fs.closeSync(fd); }
  }

  /** `updated` is false when this sync brings nothing new: the last delivery then still describes the installed bundle. */
  async function resetStateReports(updated = true): Promise<NextStep[]> {
    const steps: NextStep[] = [];
    const reports = path.join(root, ".project/reports");
    const receipt = path.join(reports, "state.delivery.json");
    const targets = [
      { name: "state.html", field: "artifact", limit: 16 * 1024 * 1024 },
      { name: "state.explainer.json", field: "specification", limit: 2 * 1024 * 1024 },
    ];
    const hint = (message: string): void => { steps.push({ kind: "reports", message }); };
    if (!updated) return steps;
    try {
      await assertNoSymlinkPath(reports);
      let directory;
      try { directory = await fs.lstat(reports); } catch (error) { if (codeOf(error) === "ENOENT") return steps; throw error; }
      if (!directory.isDirectory()) throw new Error("report-not-regular");
      const checkDirectory = async (): Promise<void> => {
        await assertNoSymlinkPath(reports);
        const current = await fs.lstat(reports);
        if (!current.isDirectory() || current.dev !== directory.dev || current.ino !== directory.ino) throw new Error("report-directory-changed");
      };
      // Historical pages have no ownership receipt and are always kept.
      for (const name of ["index.html", "state.json", "theme.json"]) {
        const file = path.join(reports, name);
        await assertNoSymlinkPath(file);
        try { await fs.lstat(file); hint(`Legacy .project/reports/${name} kept; review manually.`); }
        catch (error) { if (codeOf(error) !== "ENOENT") throw error; }
      }
      let receiptBytes;
      try { receiptBytes = await readBounded(receipt, 64 * 1024); }
      catch (error) { if (codeOf(error) === "ENOENT") return steps; throw error; }
      let delivery;
      try { delivery = JSON.parse(new TextDecoder().decode(receiptBytes)); } catch { throw new Error("report-invalid-receipt"); }
      if (!targets.every(({ field }) => typeof delivery?.[field]?.sha256 === "string" && /^[a-f0-9]{64}$/.test(delivery[field].sha256))) throw new Error("report-invalid-receipt");
      const removals: { file: string; digest: string; limit: number }[] = [];
      let kept = false;
      // Preflight every target before the first removal: a refused input removes nothing.
      for (const target of targets) {
        const file = path.join(reports, target.name);
        let bytes;
        try { bytes = await readBounded(file, target.limit); }
        catch (error) { if (codeOf(error) === "ENOENT") continue; throw error; }
        const digest = hash(bytes);
        if (digest === delivery[target.field].sha256) removals.push({ file, digest, limit: target.limit });
        else { kept = true; hint(`Kept .project/reports/${target.name}: report-not-owned.`); }
      }
      await checkDirectory();
      if (!kept) removals.push({ file: receipt, digest: hash(receiptBytes), limit: 64 * 1024 });
      for (const item of removals) {
        if (apply) {
          await checkDirectory();
          await assertNoSymlinkPath(item.file);
          let hashed = { dev: -1, ino: -1 };
          // Pin the descriptor that was hashed; a file renamed over it before the unlink is refused, never removed.
          if (hash(await readBounded(item.file, item.limit, root, (identity) => { hashed = identity; })) !== item.digest) throw new Error("report-changed");
          await checkDirectory();
          // No await between the final identity/path check and unlink.
          await assertNoSymlinkPath(item.file);
          const current = fs.lstatSync(reports);
          if (current.dev !== directory.dev || current.ino !== directory.ino) throw new Error("report-directory-changed");
          const file = fs.lstatSync(item.file);
          if (file.isSymbolicLink() || !file.isFile() || file.dev !== hashed.dev || file.ino !== hashed.ino) throw new Error("report-changed");
          fs.unlinkSync(item.file);
        }
        hint(`${apply ? "Removed" : "Would remove"} .project/reports/${path.basename(item.file)}; re-run /state after syncing.`);
      }
    } catch (error) {
      const reason = ["report-not-regular", "report-oversize", "report-changed", "report-directory-changed", "report-invalid-receipt"].includes(messageOf(error)) ? messageOf(error) : "report-path-refused";
      hint(`Report reset refused: ${reason}; kept remaining files. Review before re-running /state.`);
    }
    return steps;
  }

  async function archifyPinStep(sourceRoot: string): Promise<NextStep[]> {
    try {
      // Exactly one anchored table row in bounded bundle documentation; never execute it.
      const text = new TextDecoder().decode(await readBounded(path.join(sourceRoot, "ai-framework/integrations/state-report.md"), 64 * 1024, sourceRoot));
      const rows = [...text.matchAll(/^\| Pinned commit \| `([a-f0-9]{40})` \|[ \t]*$/gm)];
      if (rows.length !== 1) return [];
      const pin = rows[0][1];
      const registry = JSON.parse(new TextDecoder().decode(await readBounded(path.join(root, ".project/skills/registry.json"), 4 * 1024 * 1024)));
      const installed = registry?.skills?.["tt-a1i/archify/archify"];
      if (!installed || installed.source?.revision === pin) return [];
      return [{ kind: "archify-pin", message: `Archify pin changed: run node ai-framework/scripts/add-skill.mts install tt-a1i/archify/archify --scope project --phases manual --ref ${pin} --apply` }];
    } catch { return []; }
  }

  async function applyEntry(entry: SyncEntry): Promise<void> {
    if (entry.caseRename) {
      // Two-step rename so case-insensitive filesystems actually change the recorded case.
      const temp = `${entry.targetPath}.bundle-sync-tmp`;
      await fs.rename(entry.targetPath, temp);
      await fs.rename(temp, entry.finalPath ?? entry.targetPath);
    }
    const destination = entry.finalPath ?? entry.targetPath;
    await assertNoSymlinkPath(destination);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    if (entry.status !== "local" && entry.status !== "conflict" && entry.sourcePath !== undefined) await fs.copyFile(entry.sourcePath, destination);
  }

  async function removeEmptyParents(file: string): Promise<void> {
    let dir = path.dirname(file);
    while (dir.startsWith(root) && dir !== root) {
      const left = (await fs.readdir(dir)).filter((name) => !IGNORE_NAMES.has(name));
      if (left.length) return;
      await fs.rm(dir, { recursive: true });
      dir = path.dirname(dir);
    }
  }

  async function sourceManifest(sourceRoot: string, excluded: Set<string> = new Set()): Promise<Record<string, Digest>> {
    const files: Record<string, Digest> = {};
    for (const dir of SYNCED_DIRS) {
      for (const rel of await walk(path.join(sourceRoot, dir))) {
        if (excluded.has(path.join(dir, rel).toLowerCase())) continue;
        files[path.join(dir, rel)] = await fileHash(path.join(sourceRoot, dir, rel));
      }
    }
    return files;
  }

  async function readIfExists(file: string): Promise<string | null> {
    try {
      return await fs.readFile(file);
    } catch (error) {
      if (codeOf(error) === "ENOENT") return null;
      throw error;
    }
  }

  // What a sync cannot do for the receiving project by itself, computed from the source it is being
  // synced with. Each is an instance-owned choice or file bundle-sync deliberately never writes
  // (.project/, entry files, installed skills) — so they are named explicitly instead of left for
  // the next doctor run to surface as a failure.
  async function nextSteps(sourceRoot: string): Promise<NextStep[]> {
    const steps: NextStep[] = [];
    if (!(await exists(path.join(root, ".project")))) return steps;
    const missing: string[] = [];
    for (const rel of await walk(path.join(sourceRoot, "ai-framework/templates/project"))) {
      if (!(await exists(path.join(root, ".project", rel)))) missing.push(rel);
    }
    if (missing.length) {
      steps.push({ kind: "scaffold", message: `${missing.length} project scaffold file(s) new in this bundle version are missing from .project/ (${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ", ..." : ""}): run node ai-framework/scripts/workflow-doctor.mts --fix (restores missing files only, never overwrites)` });
    }
    if (await exists(path.join(sourceRoot, "ai-framework/scripts/consolidation-migrate.mts"))) {
      let summary = "legacy compacted pitch count unavailable (inventory refused; inspect before migrating)";
      try { summary = `${legacyInventory(root, deps).pitches} legacy compacted pitch(es)`; }
      catch { /* Guidance remains actionable without treating a refused inventory as zero. */ }
      steps.push({ kind: "consolidation", message: `${summary}: after both sync passes, run ${CONSOLIDATION_COMMAND}, review its plan, then use --apply. This migrates scaffold only; legacy content upgrades require their own approval. No project records are migrated by bundle-sync.` });
    }
    // The knowledge graph moved from the in-house .project/knowledge/graph.json to Graphify (uv) at graphify-out/graph.json.
    // The synced graphify.mts migrates it, but only when run: name that step instead of leaving a stale graph behind.
    if (await exists(path.join(root, ".project/knowledge")) && (!(await exists(path.join(root, "graphify-out/graph.json"))) || await exists(path.join(root, ".project/knowledge/graph.json")) || !(await exists(path.join(root, ".graphifyignore"))))) {
      steps.push({ kind: "graphify", message: "the knowledge graph is built by Graphify (uv) now: run node ai-framework/scripts/graphify.mts setup (builds graphify-out/graph.json, migrates the legacy .project/knowledge/graph.json, installs the rebuild-on-commit git hooks). Requires uv: https://docs.astral.sh/uv/" });
    }
    const marker = /^## Response style \(caveman mode\)$/m;
    const sourceEntry = await readIfExists(path.join(sourceRoot, "AGENTS.md"));
    if (sourceEntry && marker.test(sourceEntry)) {
      const lacking: string[] = [];
      for (const file of ["AGENTS.md", "CLAUDE.md"]) {
        let text = await readIfExists(path.join(root, file));
        // CLAUDE.md that imports AGENTS.md via @AGENTS.md carries the section through its target.
        if (text !== null && file === "CLAUDE.md") {
          const entry = await resolveClaudeEntry(root, text, deps);
          // An unusable import is reported as a problem of its own, not as a missing section.
          if (entry.kind === "invalid") { steps.push({ kind: "entry-files", message: `CLAUDE.md has an unusable AGENTS.md import (${entry.detail}); run node ai-framework/scripts/setup-validator.mts` }); continue; }
          text = entry.content;
        }
        if (text !== null && !marker.test(text)) lacking.push(file);
      }
      if (lacking.length) steps.push({ kind: "entry-files", message: `${lacking.join(" and ")} lack the '## Response style (caveman mode)' section; whole entry files are never replaced automatically, so copy that section from the source AGENTS.md by hand or the main session agent of each vendor will not apply caveman mode` });
    }
    const catalogText = await readIfExists(path.join(sourceRoot, "ai-framework/integrations/skill-defaults.json"));
    if (catalogText) {
      let catalog: { defaults?: { id: string; path: string; purpose: string; recommendedPhases?: unknown }[] } | null = null;
      try { catalog = JSON.parse(catalogText); } catch { /* an unreadable catalog just yields no hint */ }
      let installed: Record<string, unknown> = {};
      try { installed = JSON.parse((await readIfExists(path.join(root, ".project/skills/registry.json"))) || "{}").skills || {}; } catch { /* the skill-registry report surfaces an invalid registry */ }
      for (const entry of catalog?.defaults || []) {
        if (!Array.isArray(entry.recommendedPhases) || installed[entry.id]) continue;
        steps.push({ kind: "default-skill", message: `recommended default skill ${entry.id} (${entry.purpose}) is not installed, so the instruction that references it in every skill and agent is inert: /add-skill ${entry.id} --path ${entry.path} --scope project --phases ${entry.recommendedPhases.join(",")}` });
      }
    }
    return steps;
  }

  function gitError(error: unknown): Error {
    const stderr = typeof error === "object" && error !== null && "stderr" in error ? String((error as { stderr: unknown }).stderr ?? "") : "";
    const detail = stderr.trim() || messageOf(error);
    return new Error(`could not fetch public bundle: ${detail}`);
  }

  async function resolveSource(): Promise<Source> {
    const source = argValue(argv, "source");
    if (source) {
      const sourceRoot = path.resolve(root, source);
      if (!(await exists(path.join(sourceRoot, "ai-framework/workflow/overview.md")))) {
        throw new Error(`${sourceRoot} does not look like an ai-workflow-portable checkout`);
      }
      if (sourceRoot === path.resolve(root)) {
        throw new Error("--source resolves to the current project root; omit --source to compare against public GitHub");
      }
      return { root: sourceRoot, label: sourceRoot, manifestSource: sourceRoot, cleanup: async () => {} };
    }

    const repository = argValue(argv, "repo") || PUBLIC_REPOSITORY;
    const sourceRoot = await fs.mkdtemp(path.join(deps.os.tmpdir(), "ai-workflow-portable-"));
    try {
      // Keep the comparison isolated from the target's checkout and working tree.
      const args = ["clone", "--quiet", "--filter=blob:none", "--branch", PUBLIC_BRANCH, "--", repository, sourceRoot];
      const cloned = deps.child.runSync("git", args, { maxBufferBytes: EXEC_MAX_BUFFER });
      if (cloned.status !== 0 || cloned.errorCode) throw commandFailure("git", args, "", cloned.stderr);
    } catch (error) {
      await fs.rm(sourceRoot, { recursive: true, force: true });
      throw gitError(error);
    }
    return {
      root: sourceRoot,
      label: `${repository}@${PUBLIC_BRANCH}`,
      manifestSource: `${repository}@${PUBLIC_BRANCH}`,
      cleanup: () => fs.rm(sourceRoot, { recursive: true, force: true }),
    };
  }

  // Runs against whatever skill-sync.mts is now ON DISK (this project's, after any files this
  // sync just applied), so a schema/adapter contract this same sync changed is checked with the
  // new code immediately — not left to surface unexpectedly on the next add-skill invocation.
  // Covered by the same approval as the rest of this sync; it is never a second apply gate.
  function runSkillSync(): SkillSyncReport | null {
    const skillSyncScript = path.join(root, "ai-framework/scripts/skill-sync.mts");
    if (!fs.existsSync(skillSyncScript)) return null;
    try {
      const args = ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", skillSyncScript, "reconcile", "--json"];
      if (apply) args.push("--apply");
      const result = runWorkflowSync(deps, args, { cwd: root, maxBufferBytes: EXEC_MAX_BUFFER });
      if (result.status !== 0 || result.errorCode) throw commandFailure(deps.proc.execPath, args, result.stdout, result.stderr);
      return JSON.parse(result.stdout) as SkillSyncReport;
    } catch (error) {
      const failed = error as { stdout?: string; stderr?: string };
      try {
        return JSON.parse(failed.stdout || "") as SkillSyncReport;
      } catch {
        return { status: "error", error: (failed.stderr || messageOf(error)).trim(), skills: [] };
      }
    }
  }

  async function runSync({ root: sourceRoot, label: sourceLabel, manifestSource }: Source): Promise<void> {
    let manifest: Manifest | null = null;
    try {
      manifest = JSON.parse(await fs.readFile(path.join(root, MARKER))) as Manifest;
    } catch {
      // First sync: no manifest yet.
    }
    const baseRef = argValue(argv, "base-ref");
    if (baseRef?.startsWith("-")) throw new Error(`invalid --base-ref: ${JSON.stringify(baseRef.slice(0, 40))}`);
    const baseOf = makeBaseLookup(sourceRoot, manifest, baseRef);
    const baseSource = manifest?.files ? `manifest (${MARKER})` : baseRef ? `git ref ${baseRef}` : "none";

    // Skills installed into a project belong to that project, on BOTH sides: never overwrite or
    // prune the target's own, and never ship the source checkout's own installs (their wrappers
    // would land in every project as orphans whose package and registry stay behind).
    const excluded = new Set([...ownedPaths(root, deps), ...ownedPaths(sourceRoot, deps)]);
    const entries = (await Promise.all([...SYNCED_DIRS, ...RETIRED_DIRS].map((dir) => compareDir(dir, sourceRoot, baseOf, excluded)))).flat();
    const flagged = await compareFlagged(sourceRoot);
    const group = (status: Status): SyncEntry[] => entries.filter((entry) => entry.status === status);
    const groups = {
      new: group("new"),
      changed: group("changed"),
      local: group("local"),
      conflict: group("conflict"),
      unverified: group("unverified"),
      removed: group("removed"),
    };

    const applied: string[] = [];
    const pruned: string[] = [];
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
          await assertNoSymlinkPath(entry.targetPath);
          await fs.rm(entry.targetPath);
          await removeEmptyParents(entry.targetPath);
          pruned.push(entry.path);
        }
      }
    }

    let markerPath: string | null = null;
    if (apply && fs.existsSync(path.join(root, ".project"))) {
      let sourceVersion: string | null = null;
      try {
        sourceVersion = (await fs.readFile(path.join(sourceRoot, "VERSION"))).trim();
      } catch {
        // Source predates VERSION.
      }
      const files = await sourceManifest(sourceRoot, excluded);
      // Only verified equality or an applied update advances a file's merge base.
      for (const entry of entries) {
        if (applied.includes(entry.path) || pruned.includes(entry.path)) continue;
        if (entry.baseDigest === undefined) delete files[entry.path];
        else files[entry.path] = entry.baseDigest;
      }
      const marker = {
        lastSyncedAt: new Date(deps.clock.now()).toISOString(),
        source: manifestSource,
        sourceVersion,
        applied,
        pruned,
        keptLocal: groups.local.map((entry) => entry.path),
        conflicts: groups.conflict.map((entry) => entry.path),
        files,
      };
      await fs.writeFile(path.join(root, MARKER), JSON.stringify(marker, null, 2) + "\n");
      markerPath = MARKER;
    }

    const instanceMigrations = migrateInstanceEntries(root, sourceRoot, apply, deps);
    const skillSync = runSkillSync();

    const steps = await nextSteps(sourceRoot);
    // Reset only when this sync updates the bundle (applied or pruned files, or, on a dry run, files it would apply or prune).
    const updated = apply ? applied.length + pruned.length > 0 : groups.new.length + groups.changed.length + (prune ? groups.removed.filter((entry) => entry.modified === "unmodified").length : 0) > 0;
    steps.push(...await resetStateReports(updated), ...await archifyPinStep(sourceRoot));
    for (const migration of instanceMigrations.filter((entry) => entry.status === "manual")) steps.push({ kind: "direct-typescript", message: `${migration.path}: ${migration.reason}` });
    if (await exists(path.join(root, ".opencode/plugins/token-consumption.js"))) steps.push({ kind: "direct-typescript", message: "Legacy OpenCode plugin token-consumption.js remains: review its customization or rerun --prune with the original --base-ref before enabling the direct .ts plugin" });

    const summary = {
      source: sourceLabel,
      base: baseSource,
      ...Object.fromEntries(Object.entries(groups).map(([key, list]) => [key, list.length])),
      flaggedForReview: flagged.length,
      applied: apply,
      appliedCount: applied.length,
      prunedCount: pruned.length,
      marker: markerPath,
      skillSync: skillSync ? skillSync.status : "not-installed",
      instanceMigrations: instanceMigrations.filter((entry) => entry.status === "applied").length,
      nextSteps: steps.length,
    };

    if (json) {
      write(JSON.stringify({ summary, ...groups, flagged, skillSync, instanceMigrations, nextSteps: steps }, null, 2) + "\n");
      return;
    }

    write(`Source: ${sourceLabel}\nBase: ${baseSource}\nMode: ${apply ? "apply" : "dry run (pass --apply to write)"}\n\n`);
    const print = <T extends { path: string }>(label: string, status: string, list: T[], describe: (entry: T) => string = (entry) => entry.path): void => {
      if (!list.length) return;
      write(`${paint(status, label)} (${list.length}):\n`);
      list.forEach((entry) => write(`  ${describe(entry)}\n`));
      write("\n");
    };
    const withRename = (entry: SyncEntry): string => (entry.caseRename ? `${entry.path}  (rename from ${entry.caseRename})` : entry.path);
    print("NEW in source", "new", groups.new);
    print("CHANGED upstream only (safe to apply)", "changed", groups.changed, withRename);
    print("LOCAL customization, upstream unchanged (kept)", "local", groups.local, withRename);
    print("CONFLICT: edited both locally and upstream (kept; merge manually)", "conflict", groups.conflict, withRename);
    print("UNVERIFIED: differs, no base to tell who changed it (kept; pass --base-ref)", "unverified", groups.unverified, withRename);
    print("REMOVED in source", "removed", groups.removed, (entry) => `${entry.path}  [${entry.modified}]`);
    print("FLAGGED for manual review (whole-file replacement is never automatic)", "flagged", flagged);
    print("INSTANCE workflow path migrations", "changed", instanceMigrations, (entry) => `${entry.path} [${entry.status}]${entry.reason ? ` ${entry.reason}` : ""}`);

    if (skillSync && skillSync.skills.length) {
      write(`${paint(skillSync.status === "conflict" ? "conflict" : "changed", `SKILL REGISTRY (${skillSync.status})`)}:\n`);
      for (const item of skillSync.skills) write(`  ${item.id}: ${item.status}${item.vendors ? ` [${item.vendors.join(", ")}]` : ""}${item.error ? ` — ${item.error}` : ""}\n`);
      write("\n");
    } else if (skillSync && ["incompatible", "coverage-unresolved", "pending-transaction"].includes(skillSync.status)) {
      write(`${paint("conflict", `SKILL REGISTRY (${skillSync.status})`)}: ${skillSync.error || "resolve before installed skills can be trusted"}\n\n`);
    }

    if (steps.length) {
      write(`${paint("flagged", `NEXT STEPS (${steps.length})`)} — what this sync cannot do for the project:\n`);
      steps.forEach((step, index) => write(`  ${index + 1}. ${step.message}\n`));
      write("\n");
    }

    if (apply) {
      write(`Applied ${applied.length} file(s); pruned ${pruned.length}.\n`);
      if (markerPath) write(`Recorded base manifest: ${markerPath}\n`);
    } else {
      write("Re-run with --apply (and --prune to delete unmodified removed files) after review.\n");
    }
  }

  return { resolveSource, runSync, resetStateReports, archifyPinStep };
}

export async function main(argv: string[], deps: RuntimeDeps): Promise<number> {
  // Piping into `head` closes stdout early; exit quietly instead of dumping an EPIPE stack.
  deps.io.stdout.onError?.((error) => {
    if (error.code === "EPIPE") deps.proc.exit(0);
    throw error;
  });
  try {
    const { resolveSource, runSync } = makeSync(argv, deps);
    const source = await resolveSource();
    try {
      await runSync(source);
    } finally {
      await source.cleanup();
    }
    return 0;
  } catch (error) {
    deps.io.stderr.write(`error: ${messageOf(error)}\n`);
    return 1;
  }
}

runDirect(import.meta.url, main);
