# Audit cycle 1: fix-timing-ratio-flake

Date 2026-11-25. Orca Run `run_069a26f39106`, coordinator claude. UX, i18n, eval: not applicable. Cross-pitch: not reviewed.
**All three required reviews complete** (test coverage on its one retry, below). **0 confirmed must-fix.**

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

## Test coverage retry (fresh worker, committed code at `d9bd8cf`)

read-only: verified by review-bench.mts guard check (HEAD unchanged, no hashed file changed; the only new status entry was the report)
canary: caught (`facts-sql.test.mts:243`, one measurement attempt instead of five)
model: gpt-6.2-sol (test coverage, codex), effort medium
prompt-sha256: 77c0fed8681fdcbf669d9c71211871ce8495c6f134a078c72884b182e34bc9f6
independent: yes

Codex was named by hand because the OpenCode attempt was lost without a report. The scope included the two earlier fixes; it found the clock
selection untested (below) and no defect in either fix. Its must-fix was the planted canary, refuted on the repository file (`attempt < 5`).

| Finding | Source | Tier | verified | Disposition |
|---|---|---|---|---|
| One attempt instead of five | tests | — | refuted on the repository file | planted canary, dropped |
| Swapping the thread clock for the process clock passes | tests | should-fix | yes (mutant) | fixed: clock source test |
| The limit's boundary is untested | tests | should-fix | yes (mutants) | fixed: ratio at 3 repeats, under 3 does not, limit pinned |
| Taking the last sample instead of the fastest passes | tests | should-fix | yes (mutant) | fixed |
| Timed work can be removed and the tests pass | tests | should-fix | yes (mutants) | fixed: results of the timed runs are checked |
| The 80-character type bound is not asserted | tests | should-fix | yes (mutant) | fixed: length asserted. Removing only the renderer's early `break` still passes (it stays linear): followup |
| The 1 ms floor is untested | tests | nit | yes (mutant) | fixed |

The fixes in this table were not re-reviewed (author-run mutants below).

- 33 pass on Node and Bun. 11 mutants (clock source, wall default, limit 3.5, inclusive stop, last sample, no floor, unequal work, no repeat,
  either timed work removed, no 80-character slice) each fail a test. One survived the first version (the warm-up satisfied the column check) and
  was fixed. Both super-linear reader mutants still fail (3.70, 3.84).
- 24 busy processes, old and final alternating: old 3 of 15 failed, final 0 of 15.

