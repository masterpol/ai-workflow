# Audit cycle 1: orca-api-currency-and-opencode2

Appetite: epic (nine small-batch scopes), cap 3 cycles. Dispatched (explicit models): security (sonnet, independent: yes) | code (sonnet, independent: yes) | test-coverage (sonnet, independent: no, no canary) | eval-runner (haiku, independent: no, no canary) | cross-pitch (haiku, independent: no, no canary). No UI or i18n scopes. Reviewers were fresh native Claude agents (not Orca workers): the scratch copies live outside the repo and reports return directly. Repo read-only guard before and after: clean.
Independence: the two judging reviewers each caught a planted canary. The three mechanical reviewers carry no canary, so their zero or low-finding reports are labelled "not independently proven" and a clean report from them is not treated as a clean audit by itself. The test-coverage reviewer mapped tests by name and did not run mutants (its own method limit); the author-run gate below is labelled author-run.

## Must-fix (blocks /ship)
| ID | Source | File | Issue | Cycle | Status |
|----|--------|------|-------|-------|--------|
| M1 | security | orca-dispatch.mts:288-293 | a non-string failedStage read as "no failed stage", so an empty residualResources list beside it looked cleanly retryable (pre-existing at HEAD) | 1 | fixed: `staged` check; new test fails without the fix (`actual: false, expected: undefined`), 105 dispatch tests pass with it; cycle-2 re-check, see audit-cycle-2.md |

## Should-fix
| ID | Source | File | Issue | Disposition |
|----|--------|------|-------|-------------|
| S1 | code, security | orca-ledger.mts `computeArgsDigest`/`argsDigest` | no consumer since R4b-2 was dropped | defer: wiring or removing it reopens the ledger schema after verification; followup |
| S2 | code | orca-contract.mts `USED_CONTRACT` | hand-maintained, not tied to the flags dispatch builds | defer: followup (a test deriving flags from `PLACEMENT_FLAGS` and the args) |
| S3 | cross-pitch | orca-dispatch.mts, orca-preflight.mts, orca-vendors.md, workflow-doctor.mts | PR 9 (`fix/orca-survives-updates`) carries the same content under different commit hashes (verified identical at the six files); merge order | defer to /ship: merge PR 9 first or rebase onto it; not a content conflict |
| S4 | cross-pitch | workflow-doctor.mts | workflow-v3-rollout's doctor work is committed at HEAD, no concurrent uncommitted hunk; attribution: committed history, not shared-diff | no pure overlap (needs ownership evidence); re-run doctor after our commit |

## Acknowledged
- Probe runs before cheaper validity checks (harmless: no claim written). Regenerate write in orca-contract.mts main is unguarded (CLI-only). Replay check reads only the unwrapped result (observed shapes covered). A refusal code beside an explicit empty residualResources list is retryable (matches the proof rule). The eval grader reports `pass: false` for parse-only and live-only entries (cosmetic; summary keeps modes separate).
- Refuted or dropped: the canaries (security findings 1 to 3 and code finding 1) were planted defects in scratch copies; the real files are correct (verified).

## Eval gate (AI scope R5)
`orca-eval-grader.mts --root .`: executes 8 passed 8, parses-only 1, live-only 3, modes never merged; the new case `opencode-agent-id-resolves-from-installed-agents` passes on 6 measured expectations; three in-memory mutants turn it red; grader tests 17 pass. Baseline: 7 executed cases passing before this change, none regressed (no criterion regression).

## Evidence run by the coordinator (author-run)
`bun test` on the Orca test files: 360 pass before the fix; dispatch 105 pass after. Full suite in this checkout 2145 pass, 2 fail (known `graphify-out/cache` timeouts); clean HEAD plus all changes 2146 pass, 0 fail (before the M1 fix; rerun below).

## Review records
### Security review, cycle 1
independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check (clean, no changed files) plus a scratch copy outside the repo
prompt-sha256: 48682e531d0a2fa591fa338214a569f390d941131a7a1b2bd45fb65a5dcb7426
model: sonnet
cross-file interactions: reviewed (dispatch to policy, launch gate and ledger; callers of readInstalledAgents and evaluateLaunch)
Canary: request-id shape check weakened in orca-dispatch.mts:100 (findings 1 to 3 below). Checklist: security.md section 9 walked item by item, plus sections 3 and 8. Not reviewed: workflow-doctor.mts (not in the scratch copy); orca-preflight tests did not finish in the reviewer's limit.

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1-3 | (canary) | orca-dispatch.mts:95-101, 241-267, 252-307 | request id accepted as any non-empty string; orphaned worker; id echoed in humanAction | planted defect, caught; the real file applies REQUEST_ID (line 100) and the hostile-id tests pass (4 pass) |
| 4 | must-fix | orca-dispatch.mts:288-291 | a non-string failedStage reads as "no failed stage", so an empty residualResources beside it is retryable | confirmed by code reading (also at HEAD) and by a new test that fails without the fix; fixed this cycle |
| 5 | should-fix | orca-ledger.mts computeArgsDigest | argsDigest has no consumer (dead code) | confirmed by grep; deferred (followup) |
| 6 | acknowledged | orca-dispatch.mts:253 | replay check reads only the unwrapped result.mutation | confirmed; acceptable for the observed receipt shapes |

### Code review, cycle 1
independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check (clean) plus a scratch copy outside the repo
prompt-sha256: 5bf3e6d05be1ac9784cb6b32c45fd11ce7b515ea5e80d3d3a30b16c1b6711250
model: sonnet
cross-file interactions: reviewed (dispatch, launch gate, policy, ledger; every caller of readInstalledAgents, resolveOpenCodeAgentId, computeArgsDigest and evaluateLaunch)
Canary: resolver ignored the installed list at orca-policy.mts:22 (finding 1). Checklist: coding-standards.md and testing.md Guards and Fixes walked. Not reviewed: orca-preflight.test.mts and workflow-doctor.mts (not in the scratch copy).

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1 | (canary) | orca-policy.mts:22 | opencode2 returned whenever any agent is installed | planted defect, caught; the real resolver uses includes("opencode2") (line 22) and 51 policy and agent-id tests pass |
| 2 | should-fix | orca-ledger.mts computeArgsDigest | dead code, no consumer | confirmed by grep; deferred with the security finding 5 |
| 3 | acknowledged | orca-dispatch.mts:213-221 | the installed-agents probe runs before cheaper validity checks | confirmed; harmless (no claim written) |
| 4 | should-fix | orca-contract.mts USED_CONTRACT | not tied to the flags dispatch builds | confirmed (hand-maintained, matches today); deferred (followup) |
| 5 | acknowledged | orca-contract.mts main | regenerate write unguarded | confirmed; CLI-only edge |


---

# Audit cycle 2: orca-api-currency-and-opencode2 (narrow)

Only the role whose finding changed was re-dispatched: security (fresh agent, sonnet). Scope: the failure classification in orca-dispatch.mts, requestIdOf and the agent-id resolution. Result: the reviewer's one "must-fix" is the planted canary (the cycle-1 fix reintroduced in the scratch copy at orca-dispatch.mts:292); the real file carries the fix and no new finding exists. Repo guard before and after: clean.

## Must-fix: none open
## Should-fix: none new
## Acknowledged: a refusal code beside an explicit empty residualResources list is retryable (matches the proof rule).

## Review record
### Security re-check, cycle 2 (narrow)
independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check (clean) plus a scratch copy outside the repo
prompt-sha256: 96dfe8e5d7b62580c780e7f0b7a35b8f2fdc2d7e42801440987197cf4f4495b5
model: sonnet
cross-file interactions: reviewed (orca-dispatch failure classification with the gate's agent-id check and the ledger)
Canary: the cycle-1 fix reintroduced as `typeof receipt.failedStage === "string"` at orca-dispatch.mts:292. Scope: failure classification, requestIdOf and agent-id resolution only.

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1 | (canary) | orca-dispatch.mts:288-292 | failed stage guard checks only strings | planted defect, caught; the real file has `receipt.failedStage !== undefined && receipt.failedStage !== null` at line 292 and the regression test passes (105 pass) |
| 2 | acknowledged | orca-dispatch.mts launch failure | a refusal code beside an explicit empty residualResources list is retryable | confirmed; matches the proof rule (the explicit empty list is the proof), not changed |
