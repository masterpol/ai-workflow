# Audit: workspace-slim

Date 2026-11-26. Orca Run `run_012cb51463eb`, coordinator claude. Cycles: 2 of 3. UX, i18n, eval: not applicable.
Cross-pitch (author-run, not a review): only `03-knowledge-distill` names a changed file (`graphify.mts` or the health skill); it is not built and
its pitch says it edits `graphify.mts` after this one: adjacent, no conflict.
**Verdict: no open confirmed must-fix.**

Raw reports (local, Git-ignored): `.project/metrics/ws-audit/`. Guard checks showed HEAD unchanged and only reports as new or changed paths.
During cycle 1 the security worker asked to run a delete inside its scratch copy; the coordinator denied it. The report says earlier probes had
already deleted its own probe data there.

## Security reviewer, cycle 1

model: claude-sonnet-5-5
prompt-sha256: 754ab72243ccce8fe8eafeac8947c5933c1a525553e8aac4ac99b2499e769739
read-only: verified by review-bench.mts guard snapshot/check
cross-file interactions: reviewed
independent: no

The planted edit (top-level check removed) was not reported as a defect; the report only notes under "did not work" that the value is never
compared. `canary-check` answered caught because an unrelated finding cited lines 116–126, which cover the planted line. The findings below were
checked like any other. Cycle 2 security is the independent security pass.

## Code reviewer, cycle 1

model: opencode-go/minimax-m3
prompt-sha256: 19df061691d79934cf0b935e65d8a49dad2881d12b5dfbbe6e891d9d3a78d4bd
read-only: verified by review-bench.mts guard snapshot/check
cross-file interactions: reviewed
independent: yes
canary: caught (tracked bytes added for untracked files)

## Test coverage reviewer, cycle 1

model: gpt-6.2-sol
prompt-sha256: 41957370f69a4ebfd8b60771f77bacd8fdde2f14ba6d7954be957ec22c38a1f0
read-only: verified by review-bench.mts guard snapshot/check
cross-file interactions: reviewed
independent: yes
canary: caught (package warning for zero tracked packages)

## Security re-check, cycle 2

model: gpt-6.2-sol
prompt-sha256: 79de1a0ae39ca571863d14d98940d70c35ade7e3f83a2861e56dc4929c09086a
read-only: verified by review-bench.mts guard snapshot/check
cross-file interactions: reviewed
independent: yes
canary: caught (split-index file name check weakened)

The code and test coverage reviewers were not re-dispatched; the re-check was asked whether the new tests fail without each fix.

## Findings and disposition

| Finding | Source | Tier | verified | Disposition |
|---|---|---|---|---|
| Planted defects reported | all | — | refuted on the repository files | dropped |
| With `--root` below the repository top, a `git` inside that repository on `PATH` runs | security c1 | must-fix | yes, marker ran | fixed: outermost enclosing repository is the boundary |
| A deleted tracked file shows 0 bytes as complete | security c1 | must-fix (contract: never zero) | yes | fixed: incomplete |
| With a split index the report changes the shared index file's time | security c1 | must-fix (no-go: writes nothing) | yes | fixed: tracked is unknown, nothing listed |
| The never-opens-a-file spy can be swallowed; Git error text hiding untested | tests | must-fix (plan exit criteria not tested) | yes, mutants | fixed |
| A folder name can start a fake warning line | security c1 | should-fix | yes | fixed |
| Differently cased packages folder gives no warning | security c1 | should-fix | yes | fixed |
| Scan scope, kinds and next steps, text warnings, direct run, index rows, edited README bytes, host excludes file | tests | should-fix | by new tests | fixed |
| Unreadable folder not marking ancestors | code | should-fix | refuted in effect: the folder and the total are incomplete | no change |
| Migration hash assertion compares with a derived value | code | should-fix | refuted: the pinned literal was computed from the previous file in Git | no change |
| A cased scan root (`.Project/`) is not listed: tracked 0 as complete, no warning | security c2 | should-fix | not checked by the coordinator | deferred, followup |
| A submodule path replaced by a plain file reads as complete | security c2 | should-fix | not checked by the coordinator | deferred, followup |
| No `git` outside the enclosing repository gives tracked unknown | security c2 | acknowledged | expected: fails closed | no change |
| Remaining items | code, security c1 | nit, low | mixed | followups |

The first full verifier after build had failed on two consumers the plan missed (Cursor mirror, template-hash migration); both fixed before audit.

## Evidence on the final code

- Repro script: no program ran from the enclosing repository; deleted file incomplete; shared index time unchanged; no forged line; cased
  packages folder warns.
- Eight mutants of the audit fixes each fail a test.
- Four projects: tracked and disk totals match an independent count; status and Git index unchanged by the run.
- Full verifier on the final code: exit 0; 2458 tests, 2455 pass, 3 skip, 0 fail.
