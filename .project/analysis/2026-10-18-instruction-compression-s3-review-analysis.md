> Moved on 2026-10-19 from `.project/pitches/instruction-compression/s3-review.md` when the pitch was compacted (`/pitch-compress`). The pitch's other files are in its recovery archive under `.project/compaction/archives/`; restore with `pitch-archive.mts restore instruction-compression`.

# S3 evidence decision — 2026-10-18

**State:** S3 rejected and incomplete; no further prompt edits or rollback are applied. S1/S2 remain approved. This proposal supersedes the fixture-only next-step gate in upgrade-repair.md because final OpenCode grading found another blocker.

## What completed

The user-requested OpenCode retry launched after the port became free, completed all 31 cases, and its own authoritative completion was collected. Fresh independent graders scored every criterion. All native probes, candidate responses, original grader completions and a truthful rejected [ship-candidate.json](../evals/runs/instruction-compression/ship-candidate.json) are preserved. No old baseline or accepted S1/S2 result was overwritten.

| Vendor | Baseline satisfied / failed / unverified | S3 candidate | New loss |
|--------|------------------------------------------|--------------|----------|
| Claude | 116 / 4 / 4 | 117 / 3 / 4 | none |
| OpenCode | 82 / 20 / 22 | 85 / 15 / 24 | two formerly satisfied criteria fail; two known zeros returned as null |

These totals cannot offset individual losses. For `review-nonsecurity-evidence`, OpenCode says it cannot verify the implementer's test claim, then reports **“Verdict: PASS — no must-fix findings”**. The frozen case requires incomplete verification when commands cannot run and forbids PASS based solely on the implementer's claim. Both criteria regress 1→0. The coordinator verified the actual response against the unchanged case and reviewer source.

There is a pre-existing instruction conflict: code-reviewer.md lines 229/234 allow PASS with zero must-fix findings, while audit Incomplete reviews says missing required evidence keeps the audit open. The reviewer file is byte-identical to HEAD and outside this pilot's allowed paths. The observed failure is real; causation by S3 compression is unproven. Repeating unchanged samples until one passes or hiding the failure would violate the approved evidence policy.

The OpenCode grader also returns owner-loading build/audit expected:1 as null where baseline has0, despite the required known-failure disposition. Raw scores are retained rather than corrected into a false green. Required Node evidence mode exits1 and identifies exactly four criterion losses. This is the checker correctly rejecting the candidate, not a passing scope exit. OpenCode native loading remains unverified; Codex unverified, Cursor unavailable, real reviewer guards/installed effects unverified.

The native ship probes retain human closure/refusal/cap behavior, and the wrapper is635→380words. Routine source context is effectively flat (1,623→1,622), so no material routine savings are established.

Separately, the real full Node suite has three historical upgrade-fixture failures. The six-line documented post-sync ignore merge passes all three simulations in a disposable copy; `upgrade-repair.md` (in the archive) and its patch contain the exact evidence. Actual upgrade tests and the pre-existing dirty doctor remain unchanged.

## Recommended bounded revision

1. **Defer S3** rather than waive the failed behavior criterion or broaden this compression pilot into agent redesign. Restore only its four changed source/test files to the exact pre-S3 snapshots: canonical ship, Cursor ship, workflow-contracts.test.mts and instruction-loading.test.mts. A [reviewable rollback patch](../metrics/instruction-compression/s3-preparation/proposed-s3-deferral.patch) and current/restore hashes are prepared. Check preconditions before applying so later unrelated changes cannot be overwritten. Preserve all rejected S3 evidence and append a version entry; do not rewrite history.
2. Keep accepted S1 build and S2 audit changes and their original frozen evidence. Their source hashes become current again after the exact S3 restore. Do not rerun or relabel S3 as passing.
3. Authorize only the six-line upgrade-fixture repair in **ai-framework/scripts/runtime/upgrade.test.mts**, the one additional named path outside the current plan. It models SETUP.md's required project-owned ignore merge, preserves all existing rules and does not weaken doctor enforcement. No reviewer/agent/runtime production change is proposed.
4. Rerun the actual upgrade tests, full Node wave-end suite and required final structural/evidence checks. Preserve the existing1,500-line cap; projected final churn is about1,308 lines including a bounded version entry, measured again after application. No cap increase.
5. Record the unchanged reviewer PASS/incomplete conflict for a separate follow-up at workflow closure. Future build-end, actual audit and ship gates remain. No commit, merge, publication or pitch closure is authorized by this revision.

This produces a two-phase compression pilot with S3 explicitly deferred. If all three wrappers must ship together, choose Revise/Back and scope a separate reviewer/evaluation-contract repair before further compression work.

## Decision

**Approve** the recommended deferral plus verified fixture repair; **Revise** this proposal; **Back** to planning; **Stop**. This gate is required because the approved plan forbids agent changes and limits implementation to named files, while the evidence amendment forbids new criterion failures. Neither boundary is relaxed silently.


## Approval and application — 2026-10-18

The user replied “Approve” to the recommended deferral plus verified fixture repair. The four S3 files passed their recorded current/restore hash preconditions and were restored exactly to the pre-S3 snapshots. All six instruction-source hashes again match accepted audit-candidate.json. The six-line runtime/upgrade.test.mts fixture merge is applied; the doctor, reviewer source and unrelated files are preserved. Full real verification is running. No evidence, prior version entry or failed S3 score is rewritten. The current delivery is S1/S2 plus this bounded fixture repair; S3 is deferred, not passed.


## Approved revision completed — 2026-10-18

The recommended revision is approved, applied and verified. S3 remains rejected/deferred and its four source/test files are restored exactly. The actual six-line fixture repair passes all three upgrade simulations; the complete Node suite passes 1,683 tests with zero failures and three existing skips. Current delivery and its R1/build-end approval gate: `build-completion.md` (in the archive). Earlier trial and proposal statements above remain historical observations, not current unresolved application work.
