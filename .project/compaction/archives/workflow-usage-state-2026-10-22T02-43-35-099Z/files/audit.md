# Audit: workflow-usage-state

Appetite: big-batch (3 cycles). Cycles used: 2. Orca bypassed (`orca=normal`).

## Cycle 1 — full fan-out

Dispatched: code (3 findings, independent: yes, sonnet) | security (4, independent: yes, sonnet) | test-coverage (9, independent: yes, haiku) | ux (not applicable, no UI) | i18n (not applicable) | eval (not applicable, no AI-prompt scope) | cross-pitch (author-run, see below)
Independence: each reviewer got a fresh scratch copy outside the project with a planted canary; all three caught theirs (`review-bench canary-check`). The repo was unchanged across the dispatch (`review-bench guard check`: clean). Records: `audit-record-security.md`, `audit-record-code.md`, `audit-record-test.md`, prompts in `audit-prompts/`.
Cross-pitch (author-run): the other active pitches (`workflow-v3-rollout`, `test-execution-performance`) plan no edit to the five files this pitch touches; `test-execution-performance/research.md` only lists `workflow-metrics.test.mts` as a test it timed. Disjoint.

### Must-fix (blocked /ship)
| ID | Source | File | Issue | Cycle | Status |
|----|--------|------|-------|-------|--------|
| M1 | security | workflow-metrics-state.mts:343 | A hand-edited `frontier` later than every open record end makes the forced-fold loop run forever under the lease | 1 | verified by proof of concept on the real module (8 s, killed); **fixed** |

Fix: `validUsage` rejects a state whose frontier is not before every open record end, and the loop cuts the list back and counts `clippedIntervals` when a fold removes nothing.
Evidence: proof of concept now prints "finished without hanging"; the new tests "a frontier past every open interval end is not valid state" and "a state that broke the fold invariant is cut back…" pass; removing the validation fails the first, removing the guard makes the second spin forever (watchdog killed it).

### Should-fix
| ID | Source | File | Issue | Disposition |
|----|--------|------|-------|-------------|
| S1 | code C2 | workflow-metrics-state.mts:685 | `captureDropped` add outside the `try` that restores the marker | fixed (add moved inside; test plus mutant) |
| S2 | security SE3 | workflow-metrics-state.mts:630 | stale comment about missing `O_NOFOLLOW` | fixed |
| S3 | test T8 | workflow-metrics.md:66 | doc omits the event family from the match key | fixed |
| S4 | test T4 | workflow-metrics-state.mts:383 | finish does not pin `scope` | acknowledged: the start's labels drive every credit and an invalid finish scope is unmatchable by the documented rule |
| S5 | test T5 | state test | existing tests bind the real loopback port | acknowledged: pre-existing, flake 0/12 at S1, S9 and after the fixes; none added |

### Acknowledged
FIFO swap window in `recordDroppedCapture` (same class as the accepted S6 symlink window); a byte appended to a marker after its rename is lost (count is "at least"); hand-edited counter at the maximum denies later writes without hanging; the cut-back test hangs rather than fails if the guard is removed (a synchronous loop cannot be timed out); weak "six health rows at 0" assertion; `hostForTest` in `metrics-lock.mts` (not this pitch).

### Refuted (planted canaries and scratch artifacts, dropped)
Inverted TTL and its 15 dependent test failures; the report "agrees" count; the duplicate-`schemaVersion` migration finding (a different canary); the missing CLI entry in the scratch copy; "future timestamp untested" (the existing invalid-event test covers `12:05:00.001Z`). Pattern for `/cooldown`: the test-coverage reviewer ran inside the code-review canary copy, so its first finding was the canary; give it its own scratch tree next time.

## Cycle 2 — narrow re-check (security only)

The only role whose finding changed. Fresh sonnet reviewer, scratch copy of the fixed code with a new canary (caught at line 479), repo unchanged (guard clean). No new finding: seven further hand-edited states all terminate; acknowledged items recorded in `audit-record-security.md` (SE6-SE8).

## Verification after the fixes (this session)
- Three metrics test files: 79/79 pass; Bun on the state and report tests: 73 pass, 0 fail.
- Flake loop on the three files: 0/12 (baseline 0/12).
- Invariants test 8/8, `any` grep 0, `setup-validator` exit 0.
- Full suite: 2234 tests, 14 failures, all `[dataset-mapping]` (the known intermittent flake logged at S3 and S9; the same names fail without this pitch's changes); no other failure.
- `bun test ai-framework` still stalls as it does without this pitch's changes (S9).

## Triage tiers
Must-fix queue: empty. Required reviews complete: yes (3 of 3 independent; UI, i18n and eval roles do not apply).
