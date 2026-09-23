#!/usr/bin/env node
/**
 * stuck-uphill-detector.js — SessionStart hook.
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

const fs = require("node:fs");
const path = require("node:path");

const PITCHES_DIR = path.join(process.cwd(), ".project", "pitches");
const STUCK_THRESHOLD = 3; // observations
const STALE_HOURS_MIN = 24; // hours between first and last observation

function listActivePitches() {
  if (!fs.existsSync(PITCHES_DIR)) return [];
  return fs
    .readdirSync(PITCHES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name);
}

function parseHill(slug) {
  const hillPath = path.join(PITCHES_DIR, slug, "hill.md");
  if (!fs.existsSync(hillPath)) return [];
  const content = fs.readFileSync(hillPath, "utf8");
  const lines = content.split("\n");
  const rows = [];
  for (const line of lines) {
    // Match table row: | Sx | <position> | YYYY-MM-DD | ... |
    const m = /^\|\s*(S\d+[^|]*?)\s*\|\s*([^|]+?)\s*\|\s*([0-9-]+|—)\s*\|/.exec(line);
    if (m) rows.push({ scope: m[1].trim(), position: m[2].trim(), lastMoved: m[3].trim() });
  }
  return rows;
}

function appendAudit(slug, rows) {
  const auditPath = path.join(PITCHES_DIR, slug, ".hill-audit.log");
  const now = new Date().toISOString();
  const entries = rows
    .filter((r) => /uphill/i.test(r.position))
    .map((r) => `${now}\t${r.scope}\t${r.position}`)
    .join("\n");
  if (entries) fs.appendFileSync(auditPath, entries + "\n");
}

function detectStuck(slug) {
  const auditPath = path.join(PITCHES_DIR, slug, ".hill-audit.log");
  if (!fs.existsSync(auditPath)) return [];
  const entries = fs
    .readFileSync(auditPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [ts, scope, pos] = l.split("\t");
      return { ts, scope, pos };
    });
  // Group by (scope, pos)
  const groups = new Map();
  for (const e of entries) {
    const key = `${e.scope}::${e.pos}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(new Date(e.ts).getTime());
  }
  const stuck = [];
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

(function main() {
  try {
    const pitches = listActivePitches();
    for (const slug of pitches) {
      const rows = parseHill(slug);
      appendAudit(slug, rows);
      const stuck = detectStuck(slug);
      for (const s of stuck) {
        console.error(
          `[stuck-uphill] pitch=${slug} scope=${s.scope} stuck at ${s.pos} for ${s.count} sessions over ~${s.hours}h. Re-shape or push to no-go?`
        );
      }
    }
    process.exit(0);
  } catch (err) {
    // Non-blocking; never fail SessionStart on hook error
    console.error(`[stuck-uphill] hook error: ${err.message}`);
    process.exit(0);
  }
})();
