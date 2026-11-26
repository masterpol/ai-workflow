#!/usr/bin/env node
import { runDirect } from "./runtime/cli.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

const ENTRY_LIMIT = 200_000;
const DEPTH_LIMIT = 40;
const GIT_TIMEOUT_MS = 20_000;
const GIT_OUTPUT_LIMIT = 16 * 1024 * 1024;
const SCAN_ROOTS = [".project", "graphify-out", "ai-framework", ".claude", ".agents", ".cursor", ".opencode", ".codex"];
const NO_ACTION = "no supported action yet";
const SCOPE = "Workflow folders only. Application code is outside this report.";

const AREAS = [
  [".project", "Project root entries", "records", NO_ACTION],
  [".project/knowledge", "Knowledge", "knowledge", "/knowledge-health"],
  [".project/rules", "Rules", "knowledge", NO_ACTION],
  [".project/context", "Context", "knowledge", NO_ACTION],
  [".project/pitches", "Pitches", "records", "/pitch-compress"],
  [".project/runs", "Runs", "evidence", NO_ACTION],
  [".project/records", "Records", "records", NO_ACTION],
  [".project/compaction", "Compaction", "recovery", NO_ACTION],
  [".project/evals", "Evals", "local data", NO_ACTION],
  [".project/metrics", "Metrics", "local data", NO_ACTION],
  [".project/skills", "Skill registry", "records", NO_ACTION],
  [".project/skills/packages", "Skill packages", "installed packages", "/add-skill"],
  [".project/reports", "Reports", "evidence", NO_ACTION],
  [".project/decisions", "Decisions", "records", NO_ACTION],
  [".project/design", "Design", "records", NO_ACTION],
  [".project/requirements", "Requirements", "records", NO_ACTION],
  [".project/analysis", "Analysis", "evidence", NO_ACTION],
  [".project/status.md", "Status", "records", NO_ACTION],
  [".project/done-work.md", "Done work", "records", NO_ACTION],
  [".project/.bundle-sync.json", "Bundle sync record", "records", "/bundle-sync"],
  [".project/relations.toon", "Project relations", "records", NO_ACTION],
  [".project/orchestration.json", "Orchestration settings", "records", NO_ACTION],
  ["graphify-out", "Knowledge graph", "generated", "graphify.mts"],
  ["ai-framework", "Workflow bundle", "bundle", "/bundle-sync"],
  ...SCAN_ROOTS.slice(3).map((folder) => [folder, folder, "bundle", "/bundle-sync"]),
];

interface Count {
  files: number;
  bytes: number;
  status: "complete" | "incomplete";
}
interface Area {
  label: string;
  kind: string;
  nextStep: string;
  disk: Count;
  tracked: Count | "unknown";
}

const newCount = (): Count => ({ files: 0, bytes: 0, status: "complete" });
const under = (prefix: string, name: string): boolean => name === prefix || name.startsWith(`${prefix}/`);

function sameEntry(left: string, right: string, deps: RuntimeDeps): boolean {
  if (left === right) return true;
  try {
    const a = deps.fs.lstatSync(left), b = deps.fs.lstatSync(right);
    return Boolean(a.ino) && a.ino === b.ino && a.dev === b.dev;
  } catch { return false; }
}

function* ancestors(full: string, deps: RuntimeDeps) {
  for (let current = full; ; ) {
    yield current;
    const parent = deps.path.dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

/** The outermost folder above `root` that holds a `.git` entry, else `root`. Found without Git, which is not trusted yet. */
function enclosingProject(root: string, deps: RuntimeDeps): string {
  let boundary = root;
  for (const folder of ancestors(root, deps)) {
    try { deps.fs.lstatSync(deps.path.join(folder, ".git")); boundary = folder; } catch { /* no repository here */ }
  }
  return boundary;
}

function trackedPaths(root: string, deps: RuntimeDeps): Set<string> | undefined {
  const { fs, path, proc } = deps;
  try {
    const separator = path.delimiter;
    const boundary = enclosingProject(root, deps);
    const outside = (full: string) => {
      for (const parent of ancestors(full, deps)) {
        if (sameEntry(boundary, parent, deps)) return false;
      }
      return true;
    };
    const search = (proc.env.PATH ?? "").split(separator).flatMap((entry) => {
      if (!path.isAbsolute(entry) || !outside(path.resolve(entry))) return [];
      try {
        const resolved = fs.realpathSync(entry);
        return outside(resolved) && !resolved.includes(separator) ? [resolved] : [];
      } catch { return []; }
    });
    // Resolve an absolute executable too: an empty PATH must never fall back to the working directory.
    const command = search.flatMap((entry) => {
      const candidate = path.join(entry, path.sep === "\\" ? "git.exe" : "git");
      try {
        const resolved = fs.realpathSync(candidate);
        if (!outside(resolved) || !fs.lstatSync(resolved).isFile()) return [];
        fs.accessSync(resolved, fs.constants.X_OK);
        return [resolved];
      } catch { return []; }
    }).at(0);
    if (!command) return undefined;

    const env: Record<string, string> = {
      PATH: search.join(separator),
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_OPTIONAL_LOCKS: "0",
      GIT_NO_LAZY_FETCH: "1",
      GIT_TERMINAL_PROMPT: "0",
    };
    for (const key of ["HOME", "SystemRoot"]) {
      const value = proc.env[key];
      if (value !== undefined) env[key] = value;
    }

    function runGit(args: string[]): string | undefined {
      const result = deps.child.runSync(command, [
        "-C", root, "-c", "core.fsmonitor=false", "-c", "core.hooksPath=/dev/null", ...args,
      ], { env, timeoutMs: GIT_TIMEOUT_MS, maxBufferBytes: GIT_OUTPUT_LIMIT });
      if (result.errorCode || result.signal !== null || result.status !== 0) return undefined;
      return result.stdout;
    }

    const top = runGit(["rev-parse", "--show-toplevel"])?.replace(/\r?\n$/, "");
    if (!top || !path.isAbsolute(top) || !sameEntry(root, top, deps)) return undefined;
    // With a split index, ls-files refreshes the shared index file's time. The report writes nothing, so it does not list.
    const gitDirectory = runGit(["rev-parse", "--git-dir"])?.replace(/\r?\n$/, "");
    if (!gitDirectory) return undefined;
    if (fs.readdirSync(path.resolve(root, gitDirectory)).some((name) => name.startsWith("sharedindex."))) return undefined;
    const listing = runGit(["ls-files", "-z", "--", ...SCAN_ROOTS]);
    if (listing === undefined || (listing !== "" && !listing.endsWith("\0"))) return undefined;
    // Unmerged entries can occur more than once in ls-files.
    return new Set(listing.split("\0").filter(Boolean));
  } catch { return undefined; }
}

function printableFolder(name: string): string {
  // Only plain name characters survive, behind a fixed word, so a name cannot imitate a row or a warning.
  const clipped = name.slice(0, 80).replace(/[^A-Za-z0-9._-]/gu, "?");
  return `Folder ${name.length > 80 ? `${clipped}…` : clipped}`;
}

export function workspaceReport(directory: string, deps: RuntimeDeps) {
  const { fs, path } = deps;
  const root = path.resolve(directory);
  // Check top-down so lstat never crosses a symlink in an earlier component.
  for (const parent of [...ancestors(root, deps)].reverse()) {
    if (!fs.lstatSync(parent).isDirectory()) throw new Error("Invalid workspace root");
  }

  const tracked = trackedPaths(root, deps);
  const areas = new Map<string, Area>();
  function addArea(prefix: string, label: string, kind: string, nextStep: string): Area {
    const area: Area = { label, kind, nextStep, disk: newCount(), tracked: tracked ? newCount() : "unknown" };
    areas.set(prefix, area);
    return area;
  }
  for (const [prefix, label, kind, nextStep] of AREAS) addArea(prefix, label, kind, nextStep);
  const known = new Set(areas.keys());

  function areaFor(relative: string, folder = false): Area {
    const parts = relative.split("/");
    if (parts[0] !== ".project" || parts.length === 1) return areas.get(parts[0])!;
    const child = parts.slice(0, 2).join("/");
    if (under(".project/skills/packages", relative)) return areas.get(".project/skills/packages")!;
    if (known.has(child)) return areas.get(child)!;
    const prefix = folder || parts.length > 2 ? child : ".project/";
    const label = prefix === child ? printableFolder(parts[1]) : "Project entries";
    return areas.get(prefix) ?? addArea(prefix, label, "unrecognised", "ask before removing");
  }

  function markIncomplete(relative: string): void {
    const area = areaFor(relative);
    for (const [prefix, current] of areas) {
      if (current !== area && !under(relative, prefix)) continue;
      current.disk.status = "incomplete";
      if (current.tracked !== "unknown") current.tracked.status = "incomplete";
    }
  }

  let visited = 0;
  if (tracked) {
    for (const relative of tracked) {
      if (!SCAN_ROOTS.some((prefix) => under(prefix, relative))) continue;
      const count = areaFor(relative).tracked as Count;
      count.files++;
    }
  }

  const unmeasured = new Set(tracked);

  function walk(relative: string, depth: number): void {
    if (visited >= ENTRY_LIMIT) {
      markIncomplete(relative);
      return;
    }
    visited++;
    const full = path.join(root, relative);
    try {
      const stat = fs.lstatSync(full);
      // lstat reports symlinks as leaves, including links at scan roots.
      if (stat.isDirectory()) {
        areaFor(relative, true);
        if (fs.realpathSync(full) !== full) {
          markIncomplete(relative);
          return;
        }
        const names = fs.readdirSync(full);
        if (names.length > 0 && depth >= DEPTH_LIMIT) {
          markIncomplete(relative);
          return;
        }
        for (const name of names) {
          if (visited >= ENTRY_LIMIT) {
            markIncomplete(relative);
            break;
          }
          walk(`${relative}/${name}`, depth + 1);
        }
        return;
      }
      const area = areaFor(relative);
      area.disk.files++;
      area.disk.bytes += stat.size;
      if (area.tracked !== "unknown" && tracked?.has(relative)) {
        area.tracked.bytes += stat.size;
        unmeasured.delete(relative);
      }
    } catch (error) {
      if (depth === 0 && error && typeof error === "object" && "code" in error && error.code === "ENOENT") return;
      markIncomplete(relative);
    }
  }

  for (const prefix of SCAN_ROOTS) walk(prefix, 0);
  // Deleted, sparse, submodule or case-aliased entries: their tracked size is unknown, so the figure is not complete.
  for (const relative of unmeasured) {
    if (!SCAN_ROOTS.some((prefix) => under(prefix, relative))) continue;
    const count = areaFor(relative).tracked as Count;
    count.status = "incomplete";
  }
  const project = { disk: newCount(), tracked: tracked ? newCount() : "unknown" as const };
  for (const [prefix, area] of areas) {
    if (prefix !== ".project/" && !under(".project", prefix)) continue;
    for (const side of ["disk", "tracked"] as const) {
      const count = area[side], total = project[side];
      if (count === "unknown" || total === "unknown") continue;
      total.files += count.files;
      total.bytes += count.bytes;
      if (count.status === "incomplete") total.status = "incomplete";
    }
  }
  const warnings = [];
  const packages = areas.get(".project/skills/packages")!.tracked;
  const aliased = [...(tracked ?? [])].some((file) => file.toLowerCase().startsWith(".project/skills/packages/"));
  if (packages !== "unknown" && (packages.files > 0 || aliased)) warnings.push("Tracked files found in .project/skills/packages/.");
  return { scope: SCOPE, project, areas: [...areas.values()], warnings };
}

function countText(count: Count | "unknown"): string {
  if (count === "unknown") return count;
  const figures = `${count.files} files, ${count.bytes} bytes`;
  return count.status === "incomplete" ? `incomplete (${figures} counted)` : figures;
}

export function main(argv: string[], deps: RuntimeDeps): number {
  let root = deps.proc.cwd();
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--json") json = true;
    else if (argv[i] === "--root" && argv[i + 1] && !argv[i + 1].startsWith("--")) root = argv[++i];
    else {
      deps.io.stderr.write("Usage: workspace-report.mts [--root <dir>] [--json]\n");
      return 1;
    }
  }
  try {
    const report = workspaceReport(root, deps);
    const output = json ? JSON.stringify(report, null, 2) : [
      report.scope,
      `.project total | disk: ${countText(report.project.disk)} | tracked: ${countText(report.project.tracked)}`,
      ...report.areas.map((area) => `${area.label} (${area.kind}) | disk: ${countText(area.disk)} | tracked: ${countText(area.tracked)} | ${area.nextStep}`),
      ...report.warnings.map((warning) => `Warning: ${warning}`),
    ].join("\n");
    deps.io.stdout.write(`${output}\n`);
    return 0;
  } catch {
    deps.io.stderr.write("workspace-report: unable to report on workspace\n");
    return 1;
  }
}

runDirect(import.meta.url, main);
