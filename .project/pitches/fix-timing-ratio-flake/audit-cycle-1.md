# Audit cycle 1: fix-timing-ratio-flake

Date 2026-11-25. Orca Run `run_069a26f39106`, coordinator claude. UX, i18n, eval: not applicable. Cross-pitch: not reviewed.
**Audit open:** the required test coverage review did not complete. 0 confirmed must-fix from the two completed reviews.

read-only: verified by review-bench.mts guard check before any fix edit (HEAD unchanged, no hashed file changed; new status entries were the reports)
cross-file interactions: reviewed (test helper with the unchanged reader; node and bun)
canary: caught (`facts-sql.test.mts:244`, small input run once instead of twice, planted in each scratch copy)

model: claude-sonnet-5-5 (code)
prompt-sha256: 8cb5068b98dab9cfa044d6b7cac047b9501c7d9df42c2913b893ecb89b9f6940
independent: yes (cut short by a usage limit: mutants and loaded behavior unverified by this reviewer)

model: gpt-6.2-sol (security, codex)
prompt-sha256: 50ab127f1330bb776546c6592297cc0c788eb10e41986a015c07abf010efc16e
independent: yes

model: opencode-go/minimax-m3 (test coverage, opencode)
prompt-sha256: f3eec32ed946822564c9d05259f4c3035432e17c7d297f5d8c78a274962ec0c0
independent: not-completed
Reason: the worker's terminal was closed in Orca before it reported (escalation `stopReason: lost`; not closed by the coordinator).
Not retried: the owner asked to commit and push.

Raw reports (local, Git-ignored): `.project/metrics/plsv-audit/`.

## Findings

| Finding | Source | Tier | verified | Disposition |
|---|---|---|---|---|
| Small input run once, divided by two | code, security | — | refuted on the repository file | planted canary, dropped |
| No test fails if the default clock becomes wall time | code | should-fix | yes | fixed: sleep test goes through the default; the mutant now fails it |
| The process CPU clock counts other threads; the sleep test read 60 ms in the reviewer's run | security | should-fix | yes (coordinator saw up to 7.7 ms; thread clock 0.09 ms) | fixed: thread clock, process clock as fallback |
| Comment overstates what is caught | code (nit) | nit | yes | fixed |
| `{ timeout }` cannot stop a synchronous reader call; the limits inspect the best sample | security | should-fix | unverified by the coordinator; the old test was also synchronous | deferred, followup |

The two fixes were not re-reviewed.

## Evidence on the final file

- 29 pass on Node and Bun. Helper mutants (wall default clock, unequal work, no repeat) each fail a test.
- Super-linear reader mutants fail idle (3.73, 3.84) and under 12 busy processes (3.70, 3.83).
- 24 busy processes for the whole run, old and final alternating: old 9 of 15 failed, final 0 of 15.
