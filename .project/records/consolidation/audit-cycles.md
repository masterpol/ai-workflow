# Audit cycles: connected-memory-consolidation

> Moved from `.project/pitches/connected-memory-consolidation/audit-cycle-*.md` on 2026-10-23 when the pitch folder was compacted. The content is unchanged; only link targets were rewritten. The original bytes are in the compaction recovery archive.


## audit-cycle-1

### Audit cycle 1 — connected-memory-consolidation (P1 and P2a)

Dispatched: security (1 fresh retry, independent: yes; first dispatch failed with an API error and was resumed, independent: no) | code (2, independent: yes) | test-coverage (1, independent: yes) | cross-pitch (1, independent: no, no canary) | ux, i18n, eval: not applicable (no UI, no i18n strings, no AI prompt)
Independence: every fresh reviewer except cross-pitch caught its planted defect (`canary-check` caught). Read-only: verified by `review-bench guard snapshot/check`, repo clean after every dispatch. Records: `audit-records/cycle1-*.md`, all pass `record-check`. Models: security opus, the rest sonnet, set explicitly per dispatch. Author-run (not reviews): full suite, v1 ledger bytes compared with a HEAD worktree, mutation spot checks.

#### Must-fix (blocks /ship)
| ID | Source | File | Issue | Status |
|----|--------|------|-------|--------|
| M1 | security (both agents) | ledger-schema.mts:78, pitch-compress.mts checkDestination, outcome-record.mts targetProblem | A destination spelled `.project/Pitches/x` is accepted on a case-insensitive disk; remove then deletes the only copy of the content. Reproduced on this machine. | fixed: spelling compared case-folded, containment judged by device and inode against the pitch folder, `.project/pitches` and `.project/compaction` |
| (canaries) | all five | scratch copies only | `if (false)` guards planted by the bench: caught by 4 of 4 reviewers that were given one | not repo defects |

#### Should-fix (all fixed this cycle, each with a test that fails when the fix is removed)
| ID | Source | File | Issue |
|----|--------|------|-------|
| S1 | security | pitch-compress.mts otherPitchFiles | Text before the first `##` (or under `#`) is in no section; it could be rewritten and deleted unasked. SHIPPED.md, deviations.md and log.md are now always listed with a whole-file hash. |
| S2 | security, code | done-work-index.mts | An outcome carrying the end marker passed the lint and broke the next regeneration. Fields now come from the comment-stripped text the lint judged. |
| S3 | security, code | outcome-record.mts | The lint followed a symlinked ancestor and echoed file text. |
| S4 | security | setup-validator.mts | A FIFO in the ledger folder blocked the validator; ledgers were slurped before the size check. |
| S5 | security | done-work-index.mts, outcome-record.mts, graphify-refs.mts | Absolute paths and raw control characters in output; unbounded record read. |
| S6 | code | graphify-relations.mts, graphify.mts | Symlinked parents followed; duplicate list entries; two decision edge cases. |
| S7 | coverage | tests | 11 guards with no failing test (v2 commit journal and graph check, otherFiles gaps, hub rule and budget through `--check`, relations CLI, real manifest caps, symlinked link-target directory, index bounds). Tests added. |

#### Acknowledged (log.md)
A1 TOCTOU between lstat and read; A2 other-file hash is over decoded text (the archive manifest binds bytes); A3 `commit-ledger --file` path is the operator's; A4 v1 ledgers keep their original destination rule except as stated in D14; SEC-13 a v2 ledger omitting every section with a closed reason opens the gate by design (the human gate is the control); `graphify.mts` is 786 lines; real-tree tests pass vacuously in a copy without those files.


## audit-cycle-2

### Audit cycle 2 — connected-memory-consolidation

Dispatched (narrow, only the role whose findings changed): security (1, fresh opus, independent: yes, canary caught). Guard: repo clean. Record: `audit-records/cycle2-security.md`.

#### Must-fix
None in the repository. The reported critical item was the planted defect (`const hit = undefined …` in the scratch copy; the real line is `protectedDirs.find(...)`).

#### Should-fix (all fixed, each with a test)
| ID | File | Issue |
|----|------|-------|
| F2 | outcome-record.mts, ledger-schema.mts | `toLowerCase` does not fold like the disk (U+017F to s). The lint now walks the target's ancestors comparing device and inode with the record's pitch folder; behavior and decision destinations are compared by identity with `done-work.md` and the record folder, in the commit and again at the remove gate. |
| F3 | done-work-index.mts | The single-pass marker strip could be rebuilt from fragments; every `<` and `>` is now removed. |
| F4 | setup-validator.mts | Ledger names and problem text printed raw; now through `printable`. |
| F5 | setup-validator.mts | A symlinked ledger folder was listed and read; `.project`, `compaction` and `ledgers` are lstat-checked first. |
| F6 | graphify-relations.mts | Control characters in CLI output. |


## audit-cycle-3

### Audit cycle 3 — connected-memory-consolidation (last cycle for big-batch)

Dispatched (narrow): security (1, fresh opus, independent: yes, canary caught). Guard: repo clean. Record: `audit-records/cycle3-security.md`.

#### Must-fix
None in the repository. The reported item was the planted defect (`/zzz/` in place of `/[<>]/` in the scratch copy; the real line is intact).

#### Should-fix
| ID | Issue | Status |
|----|-------|--------|
| C3-2 | A line feed in a ledger file name could forge extra PASS lines in the validator's text report (`printable` skipped U+000A; the relations CLI had the same gap). | fixed: `printable` and the CLI replace line feeds; tests added |

Cycle cap reached. No cycle-4 review of the cycle-3 change: it is a one-character-class widening in two regular expressions, covered by new tests, and the author-run mutation check below.


## audit-p2d-p2c-cycle-1

### Audit cycle1 — P2d and P2c (separate from completed P1/P2a audit)

Date:2026-10-23. Required code, security, coverage and cross-pitch reviews complete for both tracks. Candidate findings: **zero must-fix, zero should-fix, zero acknowledged production defects**. No applicable required check remains unverified. UI/i18n/eval N/A: local migration, retention and tooling, no UI, translated strings, new dependency or AI prompt.

#### Independence and evidence

Code and coverage completion reviews are fresh gpt-6.1-sol high and caught the comparison defect. Security source review and comparison detection were fresh gpt-6.1-sol high; its P2d installed runtime was finished by a resumed amendment and is explicitly independent:no for that completion. Code and coverage independently passed installed acceptance too. Cross-pitch used a fresh gpt-6-luna high initial pass and fresh gpt-6.1-sol high complete-inventory retry. No author-run check is presented as a required reviewer. All exact loaded prompts, source/control manifests and validated records are in audit-records/2026-10-23-p2d-p2c-repair/.

Read-only witness: review-bench guard snapshot/check returned clean:true, headChanged:false, statusChanged:false, changed:[]; all430 source hashes still equal the checkout. Reviewers only received scratch copies, never recovery archives. No implementation changed during audit.

#### Required checks completed

P2d: whole migration/guard/test review, sync/doctor read-only integration, old/refused/local inputs, publication/replay, installed two-pass and fresh installation. Independent code31/31 migration,4/4 integration,2/2 fresh,1/1 installed (24.391s); coverage31/31,10/10,2/2 fresh,1/1 installed (24.660s). Security31/31,6/6 plus resumed installed suite3/3 in26.030s, after two retained25s timeouts. The last attempt used an explicitly bounded35s scratch-runtime allowance; production timing/security limits were unchanged.

P2c: whole legacy/source/transaction/nav interface review; receipt before I/O, approval and introducing-commit proof, exact drift acceptance, all source hashes, five-stage SIGKILL replay, new destination bindings and repeated checks, v1 bytes and authoritative graph outcomes. Fresh completion selected guards passed code17/17, coverage16/16, security14/14; original broad refs/outcome/graph tests passed apart from deliberate binding controls. All46 source judgments remain their separately owner-approved content reviews, not an inferred source review from this audit.

Repair: separate bug-fix audit below. Exact36920bytes and raw hash match original candidate/proof. All three completion reviewers independently counted72runs,51pass/21fail,12seededbad and oneCursor not-run. Candidate consumer54/54. Assertions,120000ms timeout and16MiB output bound unchanged.

#### Controls, limitations and triage

All three initial seeded defects (dry-run publication, missing destination equality, false historical claim) were caught by code/security/coverage. Cross reviewers caught the planted rollout ownership conflict. Fresh completions also rejected the separate false-claim comparison. These are scratch defects, not production bugs: original source hashes and live guards were verified before triage. All failed reports are preserved as incomplete/blocking first passes; none was called clean prematurely.

The first installed copy omitted config/mirror inputs; completing all synchronized directories and registry ownership fixed the instrument. An isolated742-path b26b45b selected snapshot supplies Git history, excluding secrets/recovery sources; only copied test BASE_REF changes to its audit-baseline tag. Fresh retry scopes completed the missing checks. No fourth P1/P2a audit cycle occurred. These are P2d/P2c cycle1 reviews plus the audit owner's one incomplete-review completion retry.

The cross-pitch instrument initially omitted shared hook and release slices. Actual ownership now names pitch-compress verified-evidence exports, P2d2.44–2.45.1, P2c2.46–2.48.1 and sequential coordinator writes. Other candidates remain un-bet/downstream only. These instrument clarifications are resolved; no production change or deferred must-fix.

Owner-approved closing exceptions remain: TTR9.74%retained versus5% and pre-existing state-history fallback deferredP2b; no coverage gap or slug-upgrade exception. Previous full live suite remains valid because audited implementation hashes did not change:86files,2709pass,0fail,3existing skips.

#### Audit-end gate

Approve → separate P1/P2a/P2d/P2c ship preparation and reconciliation under planR14 / Revise / Back to build / Stop. No final ship, commit, push, cooldown increment or downstream rollout is inferred. The exact evidence-path bug fix has a clean separate audit and auto-flows to its own ship preparation; final closure is still gated.

