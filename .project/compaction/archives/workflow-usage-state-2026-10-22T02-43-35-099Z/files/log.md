# Log: workflow-usage-state

## S2

Mutant S2: widening the migrator prefix regex from `1` to `\d` alone survives, because `validV1` also requires `schemaVersion === 1` (a second guard). Widening both guards (regex `\d` and `validV1` version check) fails "refuses migration of anything but one exact v1 document" (its future-version fixture, `SCHEMA_VERSION + 1`). The routing check in `readWorkflowState` was widened too, so unrelated v2 reads also failed in that mutant run. Source restored byte-for-byte.

Flake: the first full-suite run failed 14 tests in `state-fragment-dataset.test.mts` ("child suites exit 0", one child suite had "a top-level test is not ok", 281 of 282 passing). That file passes 41/41 alone, with and without the S2 change. The rerun of the full suite was green (2198 tests, 2195 pass, 3 skipped, 0 fail). The failing child suite was not identified; not a workflow-metrics test.

Zsh note: `$T WM` with unsplit variables silently fails under zsh (0.02s, exit 1). Run exit commands under `bash -c`.

## S3

Mutant S3: restoring first-key eviction (`Object.keys(state.pending)[0]`) fails "a reordered burst past the cap evicts exactly the oldest starts".
Mutant S3: putting `event.pitch, event.phase` back into the activity key fails "an interval stays with the labels of its start when the phase changes mid-turn" and the rewritten "leaves unmatched and out-of-order activities" test. Source restored byte-for-byte after each.

Full suite at S3: 2206 tests, 14 fail, all `[dataset-mapping]` in `state-fragment-dataset.test.mts` (the child-suite run inside the full suite reports "a top-level test is not ok"). The same 14 names fail with the S2 and S3 changes stashed (HEAD code: 2193 tests, 14 fail), so they are not caused by this pitch. The three child suites pass 282/282 when run alone, and the dataset test passes alone. S2's full suite passed on its second run, so the failure is intermittent. Cause not identified; two unrelated processes at 100% CPU were running on the machine (a stale `bun ../probe.mts` and a `node --test-concurrency=0` run) and may be causing it. Worth a followup, not part of this pitch.

## S4

Mutant S4: dropping the `\ ⋃active` subtraction from wait fails the property test and the parallel-subagent test.
Mutant S4: dropping the clock-equality check fails "a gap across clock sources or backwards in time is unmeasured and adds no wait".
Mutant S4: folding at the collector clock instead of at the fold point `F` fails fold exactness, the parallel-subagent test and the property test. Source restored byte-for-byte after each.

Test-harness lesson: a simulation that holds the injected clock ahead of undelivered events lets the fold point run past them and clips real intervals (`clippedIntervals` 20 in the first property run). The property test now advances the clock with each event. In production the collector clock is real time, so a later event cannot be older than the fold point except through clock skew, which is counted.

## S5

S5 full-cap state bytes: 1007578
Mutant S5: first-come instead of LRU (every newcomer past the cap routes to other) fails "the 51st pitch gets its own row and the least recently used pitch folds into other" and the protection test.
Mutant S5: skipping the `Row` addition in a fold fails "totals stay whole across 200 folds in both pitch stores". Source restored byte-for-byte after each.
Note: the full-cap test takes about 8 s (1,800 steps of 5 events); `scopeRow` recounts leaves each time a scope is absent from a full leaf set, which is the hot spot if the suite needs to be faster.

## S6

Mutant S6: skipping the consume step (`takeDroppedMarker`) fails "each dropped capture leaves one byte and the next recorded event counts and removes them", the busy-lease marker test, the cap test and the failed-write test. Source restored byte-for-byte.

## S7

Mutant S7: hard-coding `unconfigured` again fails "shows attribution gaps without unknown model rankings, and treats native provenance as unverified" (now `observed`) and "computes automatic capture from the last native event in every format". Source restored byte-for-byte.

## S9

S9 failures: 0/12 (baseline 0/12)
Resolver status: exported
Followup: workflow-usage-capture calls the exported resolver (`token-attribution` S6 shipped `resolvePhaseContext` in 556a60f; this pitch kept the activity key as opaque validated labels and imports nothing from `token-consumption.mts`).

Verification, this session:
- Node full suite: 2231 tests; two runs were green, and three runs failed only the 14 `[dataset-mapping]` tests in `state-fragment-dataset.test.mts` (same names with the pitch's changes stashed). Not caused by this pitch; cause unidentified (see S3).
- `bun test ai-framework` stalls with no output even with the pitch's five files stashed (HEAD code, 200 s limit), so it is a pre-existing environment problem; `bun test` on the state and report test files passes (70 tests). A stale `bun ../probe.mts` process has run at 100% CPU on this machine since 11 Oct and may be involved.
- `setup-validator` exit 0 (23 checks), `graphify --check` exit 0, `workflow-doctor` exit 0 (752 checks, READY).
- Scope fence: against HEAD the pitch touches 5 files outside `.project` (state module, state test, report module, report test, contract doc) and 0 under hooks, `.claude`, `.opencode` or `.codex`; `metrics-lock.mts` unchanged. Against the pitch's base ref `633adb3` the same commands print 64 files and 27 hook-path files, because 16 commits by other pitches (token-attribution, state-fragment-sanitizer) landed in between; none are this pitch's.
- Release (`CHANGELOG.md`, `VERSION`) is written by `changelog.mts` at /ship, so this pitch adds 5 of its 7 planned files so far.

## Audit

Mutant audit: removing the new `validUsage` frontier check fails "a frontier past every open interval end is not valid state"; removing the cut-back guard makes "a state that broke the fold invariant is cut back…" spin until a watchdog kills it; moving the `captureDropped` add out of its `try` fails "a counter overflow while consuming the marker restores it". Source restored byte-for-byte after each.
Flake loop after the audit fixes: 0 of 12 runs failed, against the same baseline of 0 of 12.
