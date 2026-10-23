# Audit cycle 1 — connected-memory-consolidation (P1 and P2a)

Dispatched: security (1 fresh retry, independent: yes; first dispatch failed with an API error and was resumed, independent: no) | code (2, independent: yes) | test-coverage (1, independent: yes) | cross-pitch (1, independent: no, no canary) | ux, i18n, eval: not applicable (no UI, no i18n strings, no AI prompt)
Independence: every fresh reviewer except cross-pitch caught its planted defect (`canary-check` caught). Read-only: verified by `review-bench guard snapshot/check`, repo clean after every dispatch. Records: `audit-records/cycle1-*.md`, all pass `record-check`. Models: security opus, the rest sonnet, set explicitly per dispatch. Author-run (not reviews): full suite, v1 ledger bytes compared with a HEAD worktree, mutation spot checks.

## Must-fix (blocks /ship)
| ID | Source | File | Issue | Status |
|----|--------|------|-------|--------|
| M1 | security (both agents) | ledger-schema.mts:78, pitch-compress.mts checkDestination, outcome-record.mts targetProblem | A destination spelled `.project/Pitches/x` is accepted on a case-insensitive disk; remove then deletes the only copy of the content. Reproduced on this machine. | fixed: spelling compared case-folded, containment judged by device and inode against the pitch folder, `.project/pitches` and `.project/compaction` |
| (canaries) | all five | scratch copies only | `if (false)` guards planted by the bench: caught by 4 of 4 reviewers that were given one | not repo defects |

## Should-fix (all fixed this cycle, each with a test that fails when the fix is removed)
| ID | Source | File | Issue |
|----|--------|------|-------|
| S1 | security | pitch-compress.mts otherPitchFiles | Text before the first `##` (or under `#`) is in no section; it could be rewritten and deleted unasked. SHIPPED.md, deviations.md and log.md are now always listed with a whole-file hash. |
| S2 | security, code | done-work-index.mts | An outcome carrying the end marker passed the lint and broke the next regeneration. Fields now come from the comment-stripped text the lint judged. |
| S3 | security, code | outcome-record.mts | The lint followed a symlinked ancestor and echoed file text. |
| S4 | security | setup-validator.mts | A FIFO in the ledger folder blocked the validator; ledgers were slurped before the size check. |
| S5 | security | done-work-index.mts, outcome-record.mts, graphify-refs.mts | Absolute paths and raw control characters in output; unbounded record read. |
| S6 | code | graphify-relations.mts, graphify.mts | Symlinked parents followed; duplicate list entries; two decision edge cases. |
| S7 | coverage | tests | 11 guards with no failing test (v2 commit journal and graph check, otherFiles gaps, hub rule and budget through `--check`, relations CLI, real manifest caps, symlinked link-target directory, index bounds). Tests added. |

## Acknowledged (log.md)
A1 TOCTOU between lstat and read; A2 other-file hash is over decoded text (the archive manifest binds bytes); A3 `commit-ledger --file` path is the operator's; A4 v1 ledgers keep their original destination rule except as stated in D14; SEC-13 a v2 ledger omitting every section with a closed reason opens the gate by design (the human gate is the control); `graphify.mts` is 786 lines; real-tree tests pass vacuously in a copy without those files.
