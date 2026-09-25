# Shipped: Styled project state report

**Pitch:** [pitch.md](pitch.md) · **Plan:** [plan.md](plan.md) · **Hill:** [hill.md](hill.md)
**Shipped:** 2026-09-25 · **Appetite:** epic, decomposed into 2 sequential big-batch scopes (T1, T2)

## Scope reconciliation

| Scope | Sub-pitch commitment | Delivered | Status |
|---|---|---|---|
| T1 | Structured evidence collection, freshness, metrics and project facts (`state-snapshot.md`) | `/state` skill + Codex/OpenCode/Cursor entry points; `state-snapshot.js` writing `.project/reports/state.json` (schema v1; facts are `{value, status, evidence, note?}` with status observed/proposed/stale/unavailable/unconfigured); reports README template; `state-report.md` contract. | **Done** |
| T2 | Theme rediscovery, accessible escaped HTML, adapters and report validation (`state-html.md`) | `state-theme.js` (strict grammar, contrast-verified, per-group fallback, source hashes in `theme.json`, `settings.json`), `state-render.js` (self-contained escaped page, CSP, safe links only), sync-survival test for report settings. | **Done** |

Totals: 87 tests for this pitch (49 collector, 33 renderer/theme, 4 `pitch-compress`, 1 `bundle-sync`; the three
new scripts at 99.90% lines, 93.06% branches);
270 across the whole skill and metrics surface; doctor READY (744 checks); setup-validator READY;
graph clean; Cursor mirrors 0 differ.

## Confidence — read this before relying on it

- **Audit: 3 cycles, 0 must-fix open.** Cycle 1 had four reviewers, three lost to a rate limit and two
  stalled once; the code review was shallow (see followups) and the coverage report contained claims the
  measurements contradicted. Every finding was re-verified by the author before triage. Security got a
  fresh independent agent for cycles 2 and 3, which caught a regression that a cycle-1 fix introduced.
- **Vendors.** Claude Code and OpenCode verified live. **Codex and Cursor are unverified in a running
  host** (pointer/mirror present and consistent); queued as a followup.
- **The secret scrub is best-effort** (documented). The real controls are the fixed source allowlist and
  never reading secret-bearing files.
- **Not run against another real project.** Only this repo (no stylesheets, so the fallback theme) and
  fixtures. First themed-project run may surface font/`var()` gaps (see followup).

## No-gos honored

- **No application implementation or decisions on La Salle infrastructure.** Only workflow tooling.
- **No silent override of instance customization.** `/state` writes only `.project/reports/*`;
  `settings.json` survives every sync (tested, twice-applied).
- **No automatic historical deletion, no invented token savings, no secrets in reports.** Metrics are
  labeled measured/partial/unavailable (this repo: partial, 104 of 214); credential-shaped text is
  redacted; secret files are never read.
- **No installation or deletion during shaping.** Confirmed.

## Rabbit holes — resolved as committed

- Instance data stays local: `.project/reports/` is outside every synced directory; the README scaffold
  is the only tracked file there.
- Sync formatting vs ownership hashes and partial-sync schema mismatch: report reads the sync marker and
  a read-only `skill-sync.js reconcile` from the **bundle**, not the project.
- Concurrent-edit / transaction concerns: writes are single-file temp + rename with `wx`; no multi-file
  transaction was needed.

## Deviations that changed the plan (see `deviations.md`)

Per-group (not per-pair) contrast fallback; `theme.json` is a record only, never read back as input;
renderer reads `state.json` from disk; quoted font names rejected (the user-visible cost);
`pitch-compress.js` hardened (outside the file list); ~40 tests beyond the exit criteria.

## Audit findings — final disposition

See `audit-cycle-1.md`, `audit-cycle-2.md`, `audit-cycle-3.md`. Cycle 1: 4 must-fix (quadratic regexes,
executing a project-supplied script, appetite regex, untested size bound) and 11 should-fix. Cycle 2:
1 must-fix, a data-loss regression in `writeDoneWork` that a cycle-1 fix introduced. Cycle 3: 0 must-fix,
2 should-fix. All fixed and re-proven with live PoCs and mutation checks.

## Knowledge extracted

- `patterns/parse-untrusted-values-and-re-emit-them.md`
- `patterns/a-report-over-an-untrusted-tree-runs-only-bundle-code.md`
- `issues/hardening-a-shared-reader-made-its-writer-destructive.md`
- `issues/reviewer-reports-contradicted-by-measurement.md`

Graph: 17 entries (9 patterns, 7 issues, 1 decision), clean.

## Followups generated

Added to `.project/pitches/_followups.md`: verify `/state` on Codex and Cursor; `commit-ledger` symlink
write; deeper code review plus HTML nits; quoted font families; and the decision on calling `/state`
automatically from `/pitch-compress` (now updated, no longer blocked).

## Version

Bundle version is set at commit time by the changelog script, per this session's convention. This work
adds a user-visible command and a new synced template, so it warrants a minor bump.
