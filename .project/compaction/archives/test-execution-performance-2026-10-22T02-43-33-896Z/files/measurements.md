# Measurements: test-execution-performance (S2)

Date: 2026-10-21. Verdict: **unproven for every candidate; no setting is promoted.** Node 4 workers is a measured no-go on this host.

## Conditions

- Snapshot: copy of the working tree at `42362f8` plus uncommitted edits (30 changed paths), fingerprint `9d267ac71e9723acec0546c8ea06ccea133bd91b` (sha of per-file shasums, excluding `.git`); identical before and after all runs.
- Node v24.21.0, Bun 1.4.3, 12 logical CPUs, 75 test files, launched through `run-tests.mts --root <snapshot>`.
- **Host was not idle.** Two foreign processes ran at about 100% CPU for every run (pid 50784, a Node `--test` probe up 2d19h; pid 65738, `bun probe.mts` up 10d). Load averages 5.9 to 33. They were killed only after the 15 runs finished (at the user's request). A short validation run of `run-tests.test.mts` overlapped the benchmark by a few seconds.
- 3 complete runs per candidate, sequential, order rotated per round. Node cache candidate shared one fresh cache directory; its first run was cold.

## Results (wall seconds)

| Candidate | Runs | Median | vs same-runtime default | Exit |
|---|---|---|---|---|
| Node default | 91.559, 98.543, 98.558 | 98.543 | baseline | 0, 0, 0 |
| Node 4 workers | 121.751, 121.859, 122.039 | 121.859 | +23.7% (slower) | 0, 0, 0 |
| Node compile cache | 89.402, 90.793, 92.566 | 90.793 | -7.9% | 0, 0, 0 |
| Bun default | 267.239, 268.832, 268.875 | 268.832 | baseline | 1, 1, 1 |
| Bun `--parallel=4` | 91.649, 92.425, 93.975 | 92.425 | -65.6% | 1, 1, 1 |

Cold vs warm cache is not separable: the cold run (round 1) took 90.793 s; later runs took 89.402 and 92.566 s.

## Parity

- Node, round 1 of default, 4 workers and cache: 2425 pass, 0 fail, 3 skip in each. Per-case name diffs were not produced.
- Bun fails on 5-second default test timeouts that Node passes. Bun default: 2420 pass, 3 skip, 2 fail in all three runs (both `workflow-doctor` real-bundle-copy tests). Bun `--parallel=4`: 2419 pass, 3 skip, 3 fail in rounds 1 and 2 (adds "a state with every cap filled stays under the size bound"), 2 fail in round 3. Each failing case ran 5.4 to 6.6 s under contention.
- Raw counts differ by runtime (Bun does not list nested `t.test` cases); only like-for-like within a runtime was compared.

## Decisions

- **Node 4 workers: no-go.** 23.7% slower than default, exit parity holds.
- **Node compile cache: no-go on this evidence.** 7.9% median reduction is below the 20% target; contended data cannot show more.
- **Bun `--parallel=4`: not promoted.** The 65.6% reduction is real in this sample but parity fails: the default itself fails on timeouts. Promote only after an idle-host rerun shows Bun default exits 0 and `--parallel=4` keeps every case passing. No timeout was lengthened and none may be (no-go).
- Defaults unchanged. No `ai-framework/` file changed in this scope.

Rerun commands for an idle host are in the S2 session record; amend this file with new rows instead of replacing these.
