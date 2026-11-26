# Audit: review-bench-hardening

Date 2026-11-26. Orca Run `run_a45047840fc2`, coordinator claude. Cycles: 2 (small-batch cap). UX, i18n, eval: not applicable.
Cross-pitch: not reviewed.
**Verdict: no open confirmed must-fix.** Medium findings deferred at the cap.

The bench is the instrument under audit, so scratch copies, repository guard and canary checks used the **committed pre-change
`review-bench.mts`**. Raw reports (local, Git-ignored): `.project/metrics/rbh-audit/`. Guard checks showed HEAD unchanged, no hashed file
changed, and only reports as new status entries.

## Security reviewer, cycle 1

model: claude-sonnet-5-5
prompt-sha256: 1de7ba827045b629ba5fa435cd7d0abd7e18bbc13adc7134b3c14d735689fa5b
read-only: verified by review-bench.mts guard snapshot/check (committed version)
cross-file interactions: reviewed
independent: yes
canary: caught (config read switched to `--local`)

## Code reviewer, cycle 1

model: gpt-6.2-sol
prompt-sha256: d841c6734cb3db21c254d4fbe6357149e68531da10c06b0f37e3a344bd6c70f4
read-only: verified by review-bench.mts guard snapshot/check (committed version)
cross-file interactions: reviewed
independent: yes
canary: caught (safe-integer check removed)

## Test coverage reviewer, cycle 1

model: opencode-go/minimax-m3
prompt-sha256: 6b3c59f209591de55d57602d4f1c5751a3e2255a3d778612123ef68941177665
read-only: verified by review-bench.mts guard snapshot/check (committed version)
cross-file interactions: reviewed
independent: yes
canary: caught (bare-name uniqueness removed)

## Security re-check, cycle 2, first attempt

model: gpt-6.2-sol
prompt-sha256: 156ad1ba2402378994b34ff20ed1673bbf41410bd3dda20cc4dee45384299242
read-only: verified by review-bench.mts guard snapshot/check (committed version)
cross-file interactions: reviewed
independent: not-completed

The worker disqualified itself: its first command (`wc -l`) opened the live file. Reported `failed`. Its claims were still checked: one led
to a fix (symlinked `PATH` entry). Its planted edit was described exactly but cited 4 lines off, so `canary-check` said not caught.

## Security re-check, cycle 2, retry

model: claude-sonnet-5-5
prompt-sha256: df03bce9cf988555bf676cde2f6d6bbc6f725808f9f32f042ba12bf07db012cd
read-only: verified by review-bench.mts guard snapshot/check (committed version)
cross-file interactions: reviewed
independent: yes
canary: caught (`--no-renames` removed)

The code and test coverage reviewers were not re-dispatched. The code review's must-fix items were inside this re-check's scope.

## Scope S4 review (follow-up after cycle 2, owner request)

model: claude-sonnet-5-5
prompt-sha256: 51a1c6ff0efb7a594e5fd1965dfad1f184dd2012de4f2c1f487c26e994444cb1
read-only: verified by review-bench.mts guard snapshot/check (committed version)
cross-file interactions: reviewed
independent: yes
canary: caught (rename source field skipped only for copies)

This reviews the follow-up change only, outside the two audit cycles. Its must-fix was the planted canary, refuted on the repository file
(`/[RC]/`). Its should-fix (an added executable bit read as clean) was reproduced by the coordinator and fixed; **that fix was not
re-reviewed** (author evidence: new test on Node and Bun, mutant fails it). Two untested-line nits and a path-segment second layer are
followups.

## Cycle 1 findings and disposition

| Finding | Source | Tier | verified | Disposition |
|---|---|---|---|---|
| Three planted defects reported | all | — | refuted on the repository file | canaries, dropped |
| A `hook.*` configured hook runs during `count` (Git 2.54) | security | must-fix | yes, marker ran | fixed: refused |
| `record-check` passes on a fenced canary, `caught: no`, an invalid or bulleted second claim | code, security | must-fix | yes | fixed |
| A citation of another copied file counts | code, security | must-fix | yes | fixed |
| A case-variant snapshot path writes inside the project | security | must-fix | yes | fixed: device and inode containment |
| A relative `PATH` entry runs the repository's `git` | security | must-fix (breaks a pitch no-go) | yes | fixed |
| Subdirectory or redirected root, rename into bookkeeping, hidden index flags, re-staged edit, `--since` shadowed by a branch | code, security | should-fix | yes | fixed |
| A whole-file range counts; a timed-out canary run counts as a failing test | code, security | should-fix | range yes; timeout by test | fixed |
| A table without a `verified` header passes | code | should-fix | by test | fixed |
| Remaining security, code and coverage items | all | should-fix, nit | not all checked | deferred, followups |

Found while patching (author, not a review): the first patch refused honest records (a prose `Canary:` line; a quoted `` `independent: yes` ``
sentence), and the real-Git `PATH` test could never fail. All three fixed.

## Cycle 2 findings

| Finding | Tier | verified | Disposition |
|---|---|---|---|
| `--no-renames` missing | — | refuted on the repository file | planted canary, dropped |
| Symlinked `PATH` entry runs the repository's `git` (first attempt) | must-fix | yes | fixed before the retry; range endpoints written `L482` or backwards also fixed then |
| `PATH` entry of the form `link/..` still does | should-fix (needs such an entry in the operator's `PATH`) | yes | deferred |
| With no surviving `PATH` entry, `git` is found in the current folder | should-fix | **not reproduced** (3 values) | deferred as unverified |
| `guard` stays clean when an already-changed file outside its roots is edited again | should-fix (predates the pitch) | yes | deferred |
| Five Markdown layouts hide a claim or fenced evidence from `record-check` | should-fix (needs a crafted record) | yes | deferred |
| Staged-then-restored changes are not counted | should-fix (predates the pitch) | yes | deferred |
| Replace refs, `TMPDIR` inside the project, other range forms, numbered or backticked claims | LOW | not checked | deferred |

## Evidence on the final code

- Reproduction script for 16 cycle-1 claims: all give the safe result. Seven marker routes ran nothing.
- Mutants of the guards added in the audit: 19, each fails a test.
- Existing records: 135 with an `independent:` line, 121 pass, 14 fail (no change from before the audit patches).
- Full verifier on the final code: exit 0; 2426 tests, 2423 pass, 3 skip, 0 fail; `review-bench.test.mts` 71 pass on Node and Bun.
- After S4: `review-bench.test.mts` 79 pass on Node and Bun.
- Full verifier after S4: exit 0; 2434 tests, 2431 pass, 3 skip, 0 fail.
