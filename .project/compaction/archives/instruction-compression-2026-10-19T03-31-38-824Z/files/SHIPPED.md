# Shipped: instruction-compression
Bet: 2026-10-17  •  Shipped: 2026-10-19  •  Appetite: big-batch (bounded phase-wrapper pilot, 1,308 of 1,500 lines, 11 paths)

Versions 2.31.5–2.31.8. Not committed or merged by this ship record; the working tree is shared with the concurrent `toon-machine-data` pitch (2.32.0), which keeps its own records.

## Scopes
| ID | Status | Hill done | Notes |
|----|--------|-----------|-------|
| S1 Build wrapper + reusable proof | shipped | 2026-10-18 | wrapper 1314 → 489 words; frozen 31-case dataset, validator and 14 contracts; no new scored regression |
| S2 Audit wrapper | shipped | 2026-10-18 | wrapper 941 → 468 words; first 445-word candidate rejected and retained; required-owner guard added; Claude 116/4/4, OpenCode 86/16/22, no new loss |
| S3 Ship wrapper | deferred | 2026-10-18 | final OpenCode scoring lost two satisfied criteria and returned two zeros as null; four files restored to pre-S3 bytes; failed evidence retained |
| R1 Upgrade-fixture repair | shipped | 2026-10-18 | six-line post-sync ignore merge in `runtime/upgrade.test.mts`; doctor enforcement not weakened |

## Audit
Cycle 1 (code, security, coverage, eval, cross-pitch; UI/i18n n/a): two should-fix coverage gaps (evaluated-model/scorer inequality and secret-name refusal survived as mutants) patched with four lines and re-proved; cohesive-unit size exception recorded for `instruction-loading.test.mts` and `workflow-contracts.test.mts`. Reviewer routes recorded as not independent across model families.

## Final verification
No build, typecheck, lint or i18n command exists (stack.md). `pre-ship-verify.mts` reports no package.json, which is not a failure of this repo. Run instead:
- Full Node suite: exit 0 (user-run, all pass); earlier 1,686 total / 1,683 pass / 0 fail / 3 existing skips.
- Required evidence mode (audit policy): 11/11. Setup validator READY (23 checks). Graph check CLEAN. `git diff --check` clean.
- Mutation-proof shell was killed mid-run and left one mutation in `runtime/data-file.mts:251`; restored byte-identical to its backup and its tests re-run (23/23) before the full suite.

## No-gos honored
- ✅ No dataset, frozen baseline vector or threshold changed; known baseline failures stay failed, not relabelled.
- ✅ No score or prompt tuned to force green; rejected candidates retained.
- ⚠️ Scope reduced: S3 not delivered (explicit user-approved deferral).

## Rabbit holes
- ✅ Resolved: loading proof via native Skill/Read observation; required-owner failure guard.
- ⚠️ Surfaced: reviewer approval criteria conflict with incomplete-review handling; OpenCode loading unobservable (clipped terminal); Codex/Cursor behavior unverified.

## Limits
Evidence is a bounded pilot on Claude and OpenCode, single runs per case. Source-word counts are a proxy, not token or latency savings. Installed-project native effects not established.

## Followups generated
See `pitches/_followups.md` § instruction-compression leftovers: S3 ship wrapper retry, reviewer PASS/incomplete conflict, OpenCode loading observability, Codex/Cursor behavior probes, remaining 40 canonical wrappers.
