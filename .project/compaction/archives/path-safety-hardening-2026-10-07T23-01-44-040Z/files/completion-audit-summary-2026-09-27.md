# Path safety completion audit — 2026-09-27

Dispatched: code (gpt-6-sol, independent: yes) | security (gpt-6-sol, independent: yes) |
test (gpt-6-sol, independent: yes) | cross-pitch (gpt-6-sol, independent: yes).
UX, i18n and AI-eval roles are inapplicable: no interface, translation or AI prompt changed.

The first four dispatches exhausted provider usage without completing; each had one fresh,
narrow retry. All retries caught their scratch-only legacy-guard canary. Independence means
fresh context within the same model family, not independent blind spots. Full reports,
prompt hashes, coverage limitations and repository-guard qualifications are in the adjacent
completion-audit records. The private guard excludes secret filenames; it is not an unmodified
run of the repository's current guard implementation.

## Verified dispositions

| ID | Tier | Finding | Evidence | Disposition |
|---|---|---|---|---|
| C1 | scratch canary | Legacy journal guard disabled at pitch-compress.js:35 | All four reviewers reproduced missing-refusal failures; canary-check passed | Not a production defect; real guard is intact and production tests pass |
| D1 | should-fix | Old/new writers use different locks; absent old journal does not establish quiescence | Traced old installer context and new compaction context; no full concurrent migration PoC claimed | README explicitly requires stopping old writers, including imported long-lived copies, before migration; retry reviewers checked wording |
| T1 | should-fix | Interrupted-ledger test omitted source/extracted preservation assertions | Confirmed test body omission | Added assertions; three focused production tests pass; fresh cycle-2 test reviewer confirms they execute |
| X1 | coordination | Collector completion proposal also names README | Plans compared; no ownership inferred from combined diffs | User selected path safety only; future collector changes must preserve recovery documentation |

Must-fix queue: empty under the approved trusted-directory contract. The original hostile
ancestor-race promise is not met; its exclusion was explicitly approved before this build.

## Verification

- Direct add-skill/compaction/archive suites: 110 passed, zero failed.
- Shared skill/defaults/sync/vendors/state/bundle/browser callers: 121 passed, zero failed.
- After T1: three focused ledger refusal/crash/recovery tests passed.
- Coverage: skill-registry and pitch-archive 100% lines; pitch-compress 99.32% lines. Aggregate
  coverage includes unrelated partial imports and is not used as a claim about their suites.
- Four author-run in-memory guard mutations failed their focused tests. Reviewer mutation
  instrumentation with noncanonical macOS paths is excluded from evidence.
- Setup validator: 21 passed. Knowledge graph clean. Syntax and whitespace checks pass.

Small-batch clean audit advances to ship preparation. Final ship approval is still pending.
