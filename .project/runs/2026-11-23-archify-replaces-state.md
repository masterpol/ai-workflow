# Run: archify-replaces-state (2026-11-23)

Shipped 2026-11-23, 2.51.0 and 2.51.1. Pitch folder: `.project/pitches/archify-replaces-state/` (pitch, plan, findings, audit and per-reviewer records, SHIPPED). Hill chart: `runs/2026-11-23-archify-replaces-state-hill.md`.

## Timeline
1. Orca runner fixed first (separate change, 2.51.1): `worker-list --full`, null-terminal rows skipped, guide marker `check`.
2. `/shape`: Archify is a renderer, not a state reporter; owner chose full replace over hybrid. Bet on all slices; `/critique` skipped at the owner's direction.
3. `/plan`: S1 spike, S2 swap, S3 split into S3a delete and S3b prune.
4. `/build` S1 (findings: KEEP, conditional) → owner chose pinned install as-is and to accept the facts-layer loss → S2 → S3a → S3b.
5. `/audit` cycle 1: 4 reviewers (3 with canaries, all caught), 0 must-fix, 11 should-fix fixed, 1 open for ship.
6. `/ship`: verified with the stack's real commands (the package-less verifier cannot run), knowledge extracted, followups filed.

## Owner decisions
Full replace not hybrid; install Archify pinned as-is (22.5 MiB of 25 MiB cap); accept losing `state.json`, evidence/number-binding checks, theme and the metrics/structure/database sections; retarget the `code:` link of five shipped records; skip `/critique`.

## Evidence
Full suite 2083 tests, 2080 pass, 0 fail, 3 skipped. setup-validator READY, workflow-doctor READY (764 checks), graphify, relations and changelog checks exit 0. Audit: `audit.md` and four `audit-*.md` records, all passing `review-bench record-check`. Mutation check: 10 mutants of facts-gather.mts and the old regex of skill-source.mts killed.

## Deviations (copied from plan.md)
## Living-spec deviations log

- 2026-11-23 (/plan): S3 split into S3a (delete) and S3b (prune + migrate) for failure isolation. Pitch's three slices otherwise unchanged.
- 2026-11-23 (/plan): pitch's `/critique` was skipped at the user's direction; risks above are the plan-time substitute.
- 2026-11-23 (/build S1): added S2 prerequisites from `findings.md`: (1) `skill-source.mts` `validateLinks` must ignore inline code
  spans (+test) or `add-skill` cannot inspect Archify; (2) install footprint 22.5 MiB of the 25 MiB cap per vendor and a 1.9 GB clone;
  trimming means vendoring, which the pitch's no-go forbids, so the user must decide; (3) run with `ARCHIFY_UPDATE_CHECK_DISABLED=1` and
  `[archify explainer: on-demand]`; (4) the facts/evidence/number-binding checks and metrics/pitches/knowledge pages are lost unless rebuilt.
- 2026-11-23 (/build S2): added `ai-framework/scripts/facts-gather.mts` + test (11 tests). Reused no `state-*` code (S3a deletes it); copied the old
  snapshot's redaction families and bounded/symlink-refusing reader. Draft is built mechanically from facts, so numbers never come from model text.
  Dropped sections (project, database, doneWork, runs, metrics, tokens, structure, theme, AI fragments) are listed in `state-report.md`.
- 2026-11-23 (/build S2): **S2 exit "full suite 0 fail" is not met by design.** 20 tests fail (4 in `state-fragment-inject.test.mts` that assert the old
  skill order / contract `VOLATILE_PATHS` wording, and 16 `state-fragment-dataset.test.mts` mapping tests that depend on them). They pin text S2 replaced.
  Plan assumed old scripts could run "behind" the new skill; their tests pin the skill and contract text, so S2 and S3a are coupled for the fragment tests. S3a deletes them.
  Everything else passes: 2709 tests. Not weakened or skipped.
- 2026-11-23 (/build S2): installed Archify via `add-skill` with a git `insteadOf` mirror so the registry records the real GitHub URL while the clone is local
  (60 s per git step cannot fetch a 1.9 GB history). Added `.claude/.agents/.cursor/skills/archify/` to `.gitignore` (same reason as caveman).
- 2026-11-23 (/build S2): fixed `validateLinks` in `skill-source.mts` (inline code spans are not links) + 2 assertions; 48 tests pass. Fixed during build:
  facts-gather first read files as Buffers (this runtime returns strings) and masked `[redacted]` by its own bracket neutralising; both caught by the tests.
- Not verified: OpenCode, Codex and Cursor live runs of the new `/state` (only this Claude Code session ran it); Archify's behaviour with the update check enabled.
- 2026-11-23 (/build S3a): deleted 25 `ai-framework/scripts/state-*.mts` (scripts, tests, helpers) and datasets `state-ai-authoring`, `state-ai-fragments`,
  `state-deep-evidence`. Test count 2732 -> 2074; 2071 pass, 0 fail, 3 skipped (same 3 skips as before).
- 2026-11-23 (/build S3a): **moved forward from S3b** because deletion broke them: `legacy-upgrade.test.mts` and `done-work-index.test.mts` (state `buildSnapshot`
  assertions now call `compactedSlugs`/`inventory` directly, the code under test), `installed-upgrade.test.mts` (state-snapshot CLI replaced by
  `pitch-compress inventory --json`), the `workflow-doctor.mts` script list (3 state entries out, `facts-gather` + test in), two stale comments.
- 2026-11-23 (/build S3a): **blast radius the plan missed.** The graph build refuses any shipped outcome record whose link target is missing, and 5 shipped
  records cited deleted scripts/datasets in their `code:` field (state-ai-authoring, state-quoted-fonts, state-fragment-sanitizer, state-deep-evidence,
  state-report-redesign). Owner chose "retarget links": only each record's `- code:` line was changed, to one link to the record's own
  `.project/records/legacy-upgrades/<slug>.md` source supplement, labelled "removed by archify-replaces-state". Outcome text, dates and other fields untouched.
  This edits historical records (not under the guardrail dirs `pitches/`, `design/`, `_archive/`, but archival); logged here for /ship.
- Left for S3b: `runtime/migrate.mts` `SCRIPT_NAMES` still lists state-render/snapshot/theme (rewrites old call paths in installed projects; a rewritten path now
  points at a removed script), README/docs/agents/rules mentions, `.gitignore`, `_followups.md`, CHANGELOG/VERSION, installed-project migration test.
- 2026-11-23 (/build S3b): README, `workflow-metrics.md` and `_followups.md` updated; `runtime/migrate.mts` no longer lists the three retired scripts, so an old
  `.js` reference is left alone instead of flipping an entry file to "manual". New `bundle-sync.test.mts` test replays an installed project: unmodified old
  scripts are pruned, a locally edited copy is kept, `.project/reports/*` is never touched, `facts-gather.mts` arrives as new. Changelog 2.51.0 (minor, Changed).
- 2026-11-23 (/build S3b): `flow-report.mts` still reads an optional `.project/reports/state.json` history that nothing writes now. Left as is (missing history is a defined
  "unavailable"); recorded in `_followups.md` as drop-or-rewire. Not fixed here: out of this pitch's appetite.
- 2026-11-23 (/build, outside scope): the Orca runner fixes made before this pitch (`orca-start.mts`, `orca-start.test.mts`, `orca-preflight.mts`) are in the same working
  tree and are not in the 2.51.0 changelog entry; they need their own entry or commit.
- 2026-11-23 (/audit cycle 1): no must-fix. Eleven should-fix items fixed in the main thread (see `audit.md`); one open for /ship (the Orca runner files, `attribution: shared-diff`).
  The fixes touched security-relevant code after the reviews (`read()`, `writeReport`, `validateLinks`), so they are author-verified (proofs re-run, 10 mutants killed), not independently re-reviewed.
- 2026-11-23 (/audit cycle 1): copying only a subset of the old redaction patterns while the contract said "same families" was a defect the test reviewer found by mutation; all 20 families restored.


