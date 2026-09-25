# Build incidents

## S1 initial tests — 2026-09-24

- Symptom: first run passed 17/19 tests. Link assertion compared `/private/var/...` with `/var/...`; interrupted installation reported `Reserved workflow skill name: sample`.
- Cause: macOS resolves its temporary directory alias; interrupted adapters were classified before checking the pending journal.
- Fix: compare canonical real paths in the assertion and reject pending transactions with explicit recovery instructions before registry/namespace operations. The next run passed 19/19.

## S1 live upstream probe — 2026-09-24

- Symptom: Caveman inspection returned `Ambiguous skill: multiple matching SKILL.md files`.
- Cause: the upstream repository contains several variants of the same named skill.
- Fix: report all candidate paths and require explicit `--path`; persist the choice for updates. A local multi-variant fixture verifies the behavior.

Live re-check passed with `--path skills/caveman/SKILL.md`: commit `2fd153c67988e980fb0b2455c90832159a6a5a25`, two selected files, repository license present. This was inspect-only, without target writes.

## S3 observation — 2026-09-25 (not fixed, out of scope)

- Symptom: an `unverified` file (no known base, differs, left untouched by `--apply`) is
  reported as `local` (kept, "upstream unchanged") on the *next* sync once a marker has been
  written, even though upstream did change and the target never received it.
- Cause: `bundle-sync.js`'s marker write records `sourceManifest(sourceRoot)` — the CURRENT
  source hash for every file — as the next base, regardless of which files were actually
  applied. An unverified/unapplied file's target content then reads as diverged from that new
  base, matching the `local` (not `unverified`/`changed`) branch of `classify()`.
- Not fixed: pre-existing behavior (present before this pitch), unrelated to S3's own scope
  (skill-registry protection, reconciliation, formatting). Flagged as a candidate followup for
  `.project/pitches/_followups.md` rather than expanded into this pitch's appetite.

## Audit cycle 1 — 2026-09-25

- code-reviewer, security-reviewer, test-coverage-checker, cross-pitch-conflict-checker
  dispatched in parallel. Zero must-fix. Two should-fix findings: one fixed (YAML unescape
  bug in skill-source.js frontmatter parsing), one deferred with reason (TOCTOU ancestor-symlink
  race requiring a co-resident local attacker — out of this tool's threat model; see
  deviations.md and audit-cycle-1.md). One acknowledged item resolved by adding a regression
  test rather than a code change, since the code already only sources the formatter's --config
  from trusted project content. 63/63 tests pass after fixes (was 62; +1 new test).
