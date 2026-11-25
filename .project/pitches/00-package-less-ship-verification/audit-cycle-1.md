# Audit cycle 1: package-less-ship-verification

Date 2026-11-25. Orca Run `run_8d450cc7ffed`, coordinator claude. The previously bound Run belonged to other work; the owner chose a new one.

Dispatched: code (1) | security (1) | test coverage (1). UX, i18n and eval: not applicable (no UI, strings or AI prompt).
Cross-pitch (author-run, not a review): no document under pitches 01–06 mentions the verifier, `4-ship.md` or `checks.toon`: disjoint.
Verdict: **0 confirmed must-fix.** Cycle 2 not run, so the fixes below are author-verified and **not independently re-reviewed**.

## Reviewers

read-only: verified by review-bench.mts guard snapshot/check (HEAD unchanged, no hashed file changed; the only new status entries were the three reports)
cross-file interactions: reviewed (verifier with data-file, TOON parser, Node and Bun child adapters; code and security reviews)
canary: caught (`pre-ship-verify.mts:195`, `refused` made to fall back to `package.json`, planted in each scratch copy)

model: claude-sonnet-5-5 (code), effort medium
prompt-sha256: c6fd4b3045e437df13444329d8f791e68b4517e7922230cc899c31118a859e8b
independent: yes
Canary note: `canary-check` reported false because the report cites the alias `V:195`; the coordinator matched file, line and defect by hand.

model: gpt-6.2-sol (security, codex), effort medium
prompt-sha256: d0fe29b6de390ac0729bba67043731e587f62682589679b243de4dbe7876e793
independent: yes
Canary note: `canary-check` caught.

model: opencode-go/minimax-m3 (test coverage, opencode)
prompt-sha256: 1f1a95e3560834ba218c498829ed6a5b166585608c8a0a6b8c2654da9f4bb185
independent: no
Reason: against its brief it compared the scratch file with the repository copy, and it read the other two reports. It found line 195
(cited as `V:195`), but that does not count. Its other findings were checked like any other.

Limit of the canary: it also made two tests fail, so running the suite was enough to find it. It shows each reviewer reached the code, not that
review by reading would catch a similar defect.

Raw reports (local, Git-ignored): `.project/metrics/plsv-audit/`.

## Findings

| Finding | Source | Tier | verified | Disposition |
|---|---|---|---|---|
| Refused manifest falls back and passes (line 195) | all three | — | refuted on the repository copy | planted canary, dropped |
| Symlinked `.project/context` fails a `package.json` project with no manifest, message called a missing file invalid | code | should-fix | yes, reproduced | fixed: stays fail-closed, message and doc say so, test added |
| Check names accept C1, bidi and line-separator characters | code, security | should-fix | yes | fixed, tests added |
| Other spawn errors of a manifest check do not name the check | code, security, tests | should-fix | yes (report evidence) | fixed: names the check, still stops. `EACCES` is not downgraded |
| Docs omit the `checks.json` twin, the viewer-only route and that checks run project commands | code, security | should-fix | yes | fixed in `4-ship.md` |
| Missing tests: six scripts, manifest-route launch errors, signal, timeout bound, line/column, DEL/NUL, manifest timeouts and argv; table loop stops at first failure | code, tests | should-fix (reviewer said must-fix for the scripts) | yes | fixed; 9 mutants each fail the suite. Not a must-fix tier: behavior was correct |
| `package.json` and changed-source reads are unguarded and unbounded | security (must-fix) | should-fix | yes, same code at HEAD | deferred, followup: predates this change; contents are parsed or matched, not printed |
| Viewer marker and `setup-validator` are project-relative | security (must-fix) | should-fix | yes, same code at HEAD | deferred, followup: predates; the route already runs project code |
| Child output, error text and file names printed raw | security (must-fix, remainder) | should-fix | yes, same code at HEAD | deferred, followup: predates. The new part (check names) is fixed |
| `diff-sanity` misses changes when the project is below the Git root | code, security | should-fix | yes, listings unchanged from HEAD; reproduced by both reviewers, not by the coordinator | deferred, followup |
| Interrupting the verifier leaves the running check alive | code | should-fix | unverified by the coordinator | deferred, followup; longer timeouts raise the cost |
| Staged, untracked and listing-failure paths of `diff-sanity` untested | code, tests | should-fix | yes (tests unchanged there) | deferred with the `diff-sanity` followup |
| macOS tmpdir alias in tests; faked child result shape | tests | acknowledged | no failure shown | none |

## Evidence after fixes

- `pre-ship-verify.test.mts`: 28 pass, 0 fail on Node and on Bun.
- Mutants in a throwaway copy (source guard, `ENOENT` guard, signal guard, old name regex, dropped `i18n:check`, dropped line/column,
  `>=` upper bound, dropped NUL guard, fallback on refused): all 9 fail the suite; baseline passes.
- Real verifier on the tree with the fixes: first run **exit 1**, one timing test in the untouched `facts-sql.test.mts` (ratio 3.07, limit 3; load
  average about 22; passes 5 of 5 alone; followup). Second full run: exit 0, 2,382 tests, 2,379 pass, 3 skip, 0 fail; five manifest checks and
  `diff-sanity` passed.
- Reconcile: nothing to integrate (reviewers wrote only reports). All three workers released; ledger attempts completed.
