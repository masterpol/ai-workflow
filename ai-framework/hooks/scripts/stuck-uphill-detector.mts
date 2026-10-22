#!/usr/bin/env node
import { runDirect } from "../../scripts/runtime/cli.mts";
/**
 * stuck-uphill-detector.mts — SessionStart hook.
 *
 * Scans .project/pitches/{slug}/hill.md for scopes stuck at the same uphill
 * position across 3+ session updates. Warns the user via stderr.
 *
 * Direct application of ShapeUp's hill-chart insight: a stuck dot signals
 * hidden problems (rabbit hole emerged, scope was mis-shaped).
 *
 * Heuristic: "session update" = a hill.md update that changed `Last moved`
 * but the position string stayed identical. We approximate via a sidecar
 * audit log at .project/pitches/{slug}/.hill-audit.log (one line per
 * session-start observation: ISO timestamp + scope_id + position).
 *
 * This script writes an entry per SessionStart and warns when the same
 * (scope_id, position) appears 3+ times in the last N entries with at least
 * 24h elapsed between the first and last.
 *
 * Exit codes:
 *   0 — always (warnings go to stderr; this is non-blocking)
 */

import type { RuntimeDeps } from "../../scripts/runtime/types.mts";
import { createNodeDeps } from "../../scripts/runtime/node.mts";

const STUCK_THRESHOLD = 3; // observations
const STALE_HOURS_MIN = 24; // hours between first and last observation
const MAX_FILE_BYTES = 256 * 1024; // hill.md and the audit log; larger files are ignored
const MAX_AUDIT_LINES = 500; // the audit log keeps only its newest lines
// Scope ids and positions are written to a log and echoed to stderr: plain text only.
const SAFE_CELL = /^[A-Za-z0-9 %().,:/-]{1,60}$/;

export interface HillRow { scope: string; position: string; lastMoved: string }
export interface StuckScope { scope: string; pos: string; count: number; hours: number }

function pitchesDir(deps: RuntimeDeps): string {
  return deps.path.join(deps.proc.cwd(), ".project", "pitches");
}

export function listActivePitches(deps: RuntimeDeps = createNodeDeps()): string[] {
  const dir = pitchesDir(deps);
  if (!deps.fs.existsSync(dir)) return [];
  return deps.fs
    .readdirEntriesSync(dir)
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name);
}

function insidePitches(dir: string, deps: RuntimeDeps): boolean {
  try {
    const relative = deps.path.relative(deps.fs.realpathSync(pitchesDir(deps)), deps.fs.realpathSync(dir));
    return !(relative === ".." || relative.startsWith(`..${deps.path.sep}`) || deps.path.isAbsolute(relative));
  } catch { return false; }
}

/**
 * A pitch file is used only when it is a regular file (never a symlink, FIFO or directory),
 * under the size cap, and its real parent stays inside the real pitches directory.
 */
export function checkPitchFile(file: string, deps: RuntimeDeps): "missing" | "unsafe" | "ok" {
  let stat;
  try { stat = deps.fs.lstatSync(file); } catch { return "missing"; }
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > MAX_FILE_BYTES) return "unsafe";
  return insidePitches(deps.path.dirname(file), deps) ? "ok" : "unsafe";
}

export function parseHill(slug: string, deps: RuntimeDeps = createNodeDeps()): HillRow[] {
  const hillPath = deps.path.join(pitchesDir(deps), slug, "hill.md");
  if (checkPitchFile(hillPath, deps) !== "ok") return [];
  const content = deps.fs.readFileSync(hillPath);
  const lines = content.split("\n");
  const rows: HillRow[] = [];
  for (const line of lines) {
    // Match table row: | Sx | <position> | YYYY-MM-DD | ... |
    const m = /^\|\s*(S\d+[^|]*?)\s*\|\s*([^|]+?)\s*\|\s*([0-9-]+|—)\s*\|/.exec(line);
    if (!m) continue;
    const row = { scope: m[1].trim(), position: m[2].trim(), lastMoved: m[3].trim() };
    if (SAFE_CELL.test(row.scope) && SAFE_CELL.test(row.position)) rows.push(row);
  }
  return rows;
}

// Rewrites the log through a temp file and rename, so a planted symlink is replaced, never followed.
export function appendAudit(slug: string, rows: HillRow[], deps: RuntimeDeps = createNodeDeps()): void {
  const dir = deps.path.join(pitchesDir(deps), slug);
  const auditPath = deps.path.join(dir, ".hill-audit.log");
  const now = new Date(deps.clock.now()).toISOString();
  const entries = rows
    .filter((r) => /uphill/i.test(r.position))
    .map((r) => `${now}\t${r.scope}\t${r.position}`);
  if (entries.length === 0 || !insidePitches(dir, deps)) return;
  let previous: string[] = [];
  try {
    const stat = deps.fs.lstatSync(auditPath);
    if (stat.isFile() && stat.size <= MAX_FILE_BYTES) previous = deps.fs.readFileSync(auditPath).split("\n").filter(Boolean);
    else if (!stat.isSymbolicLink()) return; // directory, FIFO or oversize: leave it alone
  } catch { /* no log yet */ }
  const kept = [...previous, ...entries].slice(-MAX_AUDIT_LINES);
  const temp = `${auditPath}.${deps.proc.pid}.tmp`;
  deps.fs.writeFileSync(temp, `${kept.join("\n")}\n`, { flag: "wx" });
  deps.fs.renameSync(temp, auditPath);
}

export function detectStuck(slug: string, deps: RuntimeDeps = createNodeDeps()): StuckScope[] {
  const auditPath = deps.path.join(pitchesDir(deps), slug, ".hill-audit.log");
  if (checkPitchFile(auditPath, deps) !== "ok") return [];
  const entries = deps.fs
    .readFileSync(auditPath)
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [ts, scope, pos] = l.split("\t");
      return { ts, scope, pos };
    });
  // Group by (scope, pos)
  const groups = new Map<string, number[]>();
  for (const e of entries) {
    const key = `${e.scope}::${e.pos}`;
    const times = groups.get(key) ?? [];
    times.push(new Date(e.ts).getTime());
    groups.set(key, times);
  }
  const stuck: StuckScope[] = [];
  for (const [key, times] of groups) {
    if (times.length < STUCK_THRESHOLD) continue;
    const span = (Math.max(...times) - Math.min(...times)) / (1000 * 60 * 60);
    if (span >= STALE_HOURS_MIN) {
      const [scope, pos] = key.split("::");
      stuck.push({ scope, pos, count: times.length, hours: Math.round(span) });
    }
  }
  return stuck;
}

export function main(_argv: string[] = [], deps: RuntimeDeps = createNodeDeps()): number {
  try {
    const pitches = listActivePitches(deps);
    for (const slug of pitches) {
      const rows = parseHill(slug, deps);
      appendAudit(slug, rows, deps);
      const stuck = detectStuck(slug, deps);
      for (const s of stuck) {
        deps.io.stderr.write(
          `[stuck-uphill] pitch=${slug} scope=${s.scope} stuck at ${s.pos} for ${s.count} sessions over ~${s.hours}h. Re-shape or push to no-go?\n`
        );
      }
    }
    return 0;
  } catch (err) {
    // Non-blocking; never fail SessionStart on hook error
    deps.io.stderr.write(`[stuck-uphill] hook error: ${err instanceof Error ? err.message : String(err)}\n`);
    return 0;
  }
}

runDirect(import.meta.url, main);
