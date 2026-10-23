# Run: token-attribution (2026-10-19)

Shipped as 2.34.0. Full records: pitches/token-attribution/ (pitch, plan, SHIPPED, audit, rollout, spikes).

# Build log: token-attribution

- S5 mutant: guard changed to `> SNAPSHOT_REVISION + 1` fails 2 tests ("newer schema" and "revision newer than this collector"); restored.
- Pre-existing red, not from this pitch: committed `ai-framework/scripts/state-test-helpers.mts:3` imports `node:assert/strict`, so doctor reports 1 runtime-boundary FAIL and 7 suite tests fail (invariants, 3 doctor-based, bundle-sync old install, Bun-selection, toon Orca). Same FAIL on a clean `git archive HEAD` export. Outside the 15-file budget; needs an owner decision (fix in `state-report-redesign`, or a followup).
- S1 lease-flake baseline 0/12; S5 focused run once, no lease failure.
- S6: 78 collector tests (124 with orca-start/opencode-plugin tests) pass on Node, 78 on Bun; lease-flake loop 0/12 (baseline 0/12); doctor FAIL count 0 at this point.
- S4 (Orca attempt ta-s4-a1, opencode): worker reported success (17 tests). Independent review found it read `usage`/`model` at the top level instead of `message.usage`/`message.model` (so its fixtures tested the wrong shape), accepted FIFOs, used a wrong root (`CLAUDE_CONFIG_DIR` without `/projects`), had no recent-id window, no held-back last group, no lstat/fstat identity check, and imported the Node adapter. Main thread rewrote module and tests (19 tests). Worker's numbers were not used as evidence.
- S4 mutant: removing the realpath containment check fails the refusals test and the CONFIG_DIR test; restored.
- S7 mutants (each fails a named test, then restored): drop upgrade routing reuse; drop pitch cap fold; drop agent-result absorb; drop offset filter and id window (interleaved-events test); count empty session-turn; drop replay routing reuse (added a test after the first run missed it).
- S7 evidence: collector 94 tests Node, 105 with transcript-usage on Bun, lease-flake 0/12 (baseline 0/12), full suite 1853 pass / 0 fail / 3 skipped (the S5-time doctor failure is gone in the working tree; not caused by this pitch).
- S8 (Orca ta-s8-a1, opencode) and S9 (Orca ta-s9-a1, codex): outputs reviewed line by line and every exit command rerun on the main checkout before acceptance. S8 mutants: raw flow labels fail the hostile-label test; dropping the zero-completions branch fails the unattributed-line test. First S8 dispatch was refused with opencode-port-held (a fresh `opencode serve --service`, started 31 s earlier by launchd); stopped it under the standing approval and the retry launched. S8 worker release state is `retained` (worktree kept).

## Audit
# Audit cycle 1: token-attribution

Dispatched: security (1, independent: yes, sonnet) | code (1, independent: no, sonnet) | test (1, independent: no, sonnet) | cross-pitch (1, haiku, read-only, no canary) | ux, i18n, eval: not applicable (no UI, no i18n strings, no prompt/model/LLM-call change; the reader and collector only count tokens).
Records: `audit-record-security.md`, `audit-record-code.md`, `audit-record-test.md` (all pass `review-bench record-check`).
Read-only: `review-bench guard check` reports HEAD unchanged and the changed set equals this thread's own cycle-1 patches (6 files); no reviewer wrote to the repo.
Independence limit: code and test reviewers described the planted canary exactly but cited it as `~948-953` / `~944-949` (canary at line 945), so the mechanical check is false and both are recorded `independent: no`. Both returned real findings, not a clean pass.
Orca: reviewers ran as Claude subagents on scratch copies (reconcile applies only to worker changes, none pending).

## Must-fix
None. The three "must-fix" findings that named the upgrade branch and `admit()` came from planted canaries in the scratch copies and were refuted against the repo (`transcript-usage.mts:82` and `token-consumption.mts:945` are intact; their tests pass). The one real must-fix class, below, was a report bug rated must-fix by the code reviewer.

## Fixed this cycle (verified by tests and mutants)
