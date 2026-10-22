# Audit cycle 1: token-attribution

Dispatched: security (1, independent: yes, sonnet) | code (1, independent: no, sonnet) | test (1, independent: no, sonnet) | cross-pitch (1, haiku, read-only, no canary) | ux, i18n, eval: not applicable (no UI, no i18n strings, no prompt/model/LLM-call change; the reader and collector only count tokens).
Records: `audit-record-security.md`, `audit-record-code.md`, `audit-record-test.md` (all pass `review-bench record-check`).
Read-only: `review-bench guard check` reports HEAD unchanged and the changed set equals this thread's own cycle-1 patches (6 files); no reviewer wrote to the repo.
Independence limit: code and test reviewers described the planted canary exactly but cited it as `~948-953` / `~944-949` (canary at line 945), so the mechanical check is false and both are recorded `independent: no`. Both returned real findings, not a clean pass.
Orca: reviewers ran as Claude subagents on scratch copies (reconcile applies only to worker changes, none pending).

## Must-fix
None. The three "must-fix" findings that named the upgrade branch and `admit()` came from planted canaries in the scratch copies and were refuted against the repo (`transcript-usage.mts:82` and `token-consumption.mts:945` are intact; their tests pass). The one real must-fix class, below, was a report bug rated must-fix by the code reviewer.

## Fixed this cycle (verified by tests and mutants)
| ID | Source | File | Issue | Disposition |
|----|--------|------|-------|-------------|
| C2 | code | token-report.mts | `(unattributed)` phase rendered as "Other (overflow)" | fixed (flowLabel), test added |
| C3 | code | token-report.mts | colliding cleaned flow names erased rows | fixed (merge), test added |
| SE2 | security | transcript-usage.mts | no containment re-check after open | fixed, test + mutant |
| SE3 | security | transcript-usage.mts | oversized line stalled the cursor | fixed, test + mutant |
| SE4 | security | token-consumption.mts | directory pin taken after transcript read | fixed (reordered) |
| T2-T4 | tests | both | inode check, 200-cursor eviction, shorter file on same inode untested | tests added; mutants now fail |

## Acknowledged / followups
- T5: the transcript path-length cap (4096) has no distinguishing test (an over-long path is refused as unreadable anyway).
- T6: the locked recent-id filter is redundant with the reader's own filter (defense in depth).
- Collector tests mostly use real lease ports derived from their own temp roots (no flake in repeated runs); in-memory `tryListen` is used by the new phase tests only.
- `leastRecentPitch` sorts pitches without `at` by NaN, so fold order is unspecified for old or hand-edited files; `resolveFlow` can overshoot the leaf cap by one `(other)/(other)` row.
- Context pitch/phase/scope strings are only checked to be strings when read back (report sanitizes; file size is capped at 4 MiB).
- Cross-pitch: no blocker. token-attribution is first in merge order. `workflow-usage-capture`, `state-deep-evidence`, `state-ai-authoring`, `state-fragment-sanitizer` and `state-report-redesign` also plan edits to `hooks.json`, `settings.json`, `state-snapshot.mts`, `state-report.md` and the release files; they rebase on this pitch. `state-deep-evidence` plan.md:27 wrongly says no resolver export exists (`resolvePhaseContext` is exported). Ruling needed between `state-report-redesign` (lands after the token snapshot revision) and `state-deep-evidence` (wants redesign S2 first).

## Evidence after fixes
Node full suite: tests 1870 / pass 1867 / fail 0 / skipped 3. Bun on ai-framework/hooks: 233 pass / 0 fail. setup-validator exit 0, graphify --check clean, workflow-doctor 0 FAIL, added `any` count 0.
