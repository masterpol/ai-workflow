# Source-review supplement: workflow-usage-state

Prepared 2026-10-22 from verified recovery sources. This is the durable record of the workflow usage state pitch (bet 2026-10-19, shipped 2026-10-20 as bundle 2.36.0, big-batch) now that its done-work narrative is retired. Results are historical evidence, not a new certification. Lessons: [bounded drop marker](../../knowledge/patterns/a-lease-refused-capture-leaves-a-bounded-marker-for-the-next-lease.md), [clock ahead of events](../../knowledge/issues/a-simulated-clock-ahead-of-undelivered-events-folds-them-away.md), [fold loop on a hand-edited frontier](../../knowledge/issues/a-forced-fold-loop-spins-on-a-hand-edited-frontier.md), [unquoted test variable under zsh](../../knowledge/issues/an-unquoted-test-command-variable-fails-silently-under-zsh.md), [pinned directory identities](../../knowledge/patterns/pin-directory-identities-across-async-leases.md), [ancestor swap](../../knowledge/issues/metrics-ancestor-swap-during-async-lease.md). Contract: [workflow metrics guide](../../../ai-framework/integrations/workflow-metrics.md). Code: [state](../../../ai-framework/scripts/workflow-metrics-state.mts), [its tests](../../../ai-framework/scripts/workflow-metrics-state.test.mts), [report](../../../ai-framework/scripts/workflow-metrics-report.mts), [report tests](../../../ai-framework/scripts/workflow-metrics-report.test.mts), [runtime types](../../../ai-framework/scripts/runtime/types.mts), [pre-ship wrapper](../../../ai-framework/hooks/scripts/pre-ship-verify.mts). Release: [CHANGELOG](../../../CHANGELOG.md). Backlog: [followups](../../pitches/_followups.md). Conflicting figures are kept as recorded under Historical contradictions.

## What shipped

The workflow usage state is schema 2 and can answer how long a pitch, phase or scope took and how much of that was waiting. It is a library: nothing wrote events automatically until `workflow-usage-capture`, and the report shows only new health rows, not time tables (those belong to `token-time-report`). Appetite: big-batch, 7 of 15 files including `CHANGELOG.md` and `VERSION`, about 1,076 lines added against the 1,500 cap.

| Scope | Result (all shipped 2026-10-20) |
|---|---|
| S1 | Spike: lease-flake baseline 0/12, drop channel `marker-file`, record cap 256, coordination yes/yes; owner approved |
| S2 | Schema 2 skeleton and v1 to v2 migration by token edit and append, byte round-trip proof; the report never rewrites v1 |
| S3 | Scope label, label-free activity key, oldest-start eviction (the arriving start competes), 6 h TTL, primary re-start supersede, replay fingerprint kept |
| S4 | Interval engine: active union, wait minus active, four levels, fold point, 256-record clip, sessions; 300-scenario property test against a brute force |
| S5 | Pitch tree, LRU fold into `(other)` in both stores, protection of referenced pitches, ranked transitions, 32-entry trace; full-cap state 1,007,578 bytes |
| S6 | `recordDroppedCapture` marker outside the lease, consumed under the next lease; residual symlink window accepted by the owner |
| S7 | Report: computed Automatic capture (`unconfigured`, `observed`, `stale`), `usageSince`, six health rows, no new tables |
| S8 | Contract doc: schema 2, match key, time and flow definitions, hook mapping (planned), bounds |
| S9 | Flake 0/12 (baseline 0/12), validators, fences; release 2.36.0 written at /ship |

## Scope and contract

Part A1 of the split of `token-time-report` (critique TT1/TT2); part A2 is `workflow-usage-capture` (hooks that write into this state), part B the re-seeded joined report. Problem: the store recorded no intervals, scope, wait or transitions and capped pitches first-come, so capture could only write what the state could hold. Places: the state module, the report (capture status only), the contract doc, their tests.

Design rules the pitch bet on: append-only v1 to v2 migration with the `since` date printed and no back-fill; scope label `^S\d{1,3}$` or `(none)`; active and wait accumulators at four levels (total, pitch, pitch/phase, pitch/phase/scope); online interval folding so memory is bounded; wait is the part of a gap not covered by active time, so active plus wait never exceeds wall time; wait coverage counters with an 8 h cap; per-pitch `transitions` (forward, repeat, back, other by pipeline order, never written as `gate.decided`); a 32-entry text-free `trace` ring; a bounded hashed `sessions` map; the pitch cap becomes the LRU fold that `token-attribution` S7 uses (cap 50); the report's `automaticCapture` becomes computed. Critique rulings folded in: activity key carries session and agent ids; duplicate and reordered events have defined, tested behavior; eviction by oldest `startedAt`; one clock source per vendor, with negative or out-of-order gaps counted as unmeasured; wait is labeled "elapsed between turns, not necessarily think-time". Critique rows: S7, S8, S9 skeptic; TT-5, TT-6 knowledge; TT1/TT2 appetite; X2, X3, X4, X20 cross-pitch. Owner chose "split" and "Bet" on 2026-10-19.

## Standing constraints

- No prompts, responses, tool arguments or transcript text stored (marker-laden event test; sessions keyed by hash).
- No inferred `gate.decided`, `audit.finished` or `pitch.finished` (`kind: "gate.decided"` appears 0 times in the module).
- Token snapshot, lease mechanism and store separation untouched (`metrics-lock.mts` and `token-consumption.mts` unchanged; no import from `token-consumption`).
- No unbounded array or per-event log; every collection has a cap and a test; full-cap state about 1 MB against the 4 MiB bound.
- No fabricated or back-filled durations: unmatched finishes add nothing, unmeasured gaps are counted, not guessed.
- State stays JSON (script-read only); no `.toon` under `.project/metrics`.
- Plan deviations flagged at ship: the S4 engine needed the pitch tree early; `blankState` stamps `usage.since`; the marker opens with flag `"a"`; an audit fix added frontier validation and a loop guard.

## Risks and resolutions

Resolved as planned: lease flake (no new real-port test; 0/12 throughout), label-free identity with one rewritten test, phase segments excluded from active time, fingerprint drift on pre-scope events, state size, ancestor swap during migration or marker consumption. Resolved during build and audit: a simulated clock ahead of undelivered events folded them away (the test now advances the clock); a hand-edited frontier could spin the forced-fold loop under the lease (audit M1). Pitch-level resolutions: exact online fold (unmatched starts add nothing and are counted); inferred transitions in their own counters; the join key is `token-attribution`'s resolver output with sentinels never joining (part B), legacy manual events count as `unjoinable`; pending agent activity older than 6 h is evicted and counted.

Pushed to plan as risk with owners: new tests use an injected `deps.net.tryListen` so the lease-port flake (about 1 in 12) does not worsen, counted against one baseline (state scope); pinned report tests (`unconfigured` literal) and the v2 fixture site change in one commit (state scope); the stable key export stays an opaque validated string until `token-attribution` S6. Pushed to no-go: hooks, plugin and wiring (A2), the joined report (part B), gate decisions, must-fix counts and ships, Codex and Cursor.

## Design decisions

From the S1 spike (run 2026-10-20 on the main thread, Orca bypassed):

- Baseline: 12 runs of the three `workflow-metrics*.test.mts` files, 0/12 failures (first single run 38 tests, 38 pass); the token-attribution baseline was also 0/12.
- Drop channel `marker-file`: a lease-busy event cannot write the state it failed to lock, so a bounded marker file (fixed byte cap, a count and timestamp, no event text) is appended outside the lease and consumed under the next lease. If the marker write fails the drop shows only through `unmatchedFinishes` and `gapsUnmeasured`. `indirect-only` was the owner's alternative.
- Open-record cap 256: a record is `{start, end}` epoch-ms plus a kind tag, about 50 bytes JSON, about 13 KB worst case; records past the cap clip at the frontier and count in `clippedIntervals`.
- Coordination: `token-attribution` S6 resolver done (556a60f) and its S7 fold rule final (101b4ba; cap 50, routed rows skipped); this pitch still kept the key an opaque validated string.
- No ADR was written; the marker-over-indirect and cap-256 choices live here.

## Plan and exit criteria

Base ref 633adb3. Scopes ran strictly in sequence on the state module (S2 to S6 share it): S1 spike, S2 schema and migration in one commit, S3 event model, S4 interval engine, S5 pitch tree, S6 drop channel, S7 report, S8 contract doc, S9 verification and release. Firm file budget 7 certain of 15 (state, state test, report, report test, contract doc, `CHANGELOG.md`, `VERSION`), up to 9 with `workflow-metrics.test.mts` and a spare slot; about 1,190 LOC planned (440 production, 680 test, 70 doc). Not touched by design: `state-snapshot.mts`, `state-pages.mts`, doctor, bundle-sync, setup-validator, `metrics-lock.mts`, `token-consumption.mts`.

Definitions: active is the union of matched agent intervals (primary turns and subagents; phase segments excluded because they span the gaps and would make wait always 0). Wait runs from a completed primary finish to the session's next primary start, capped at 8 h (time over the cap counts in `gapsOverCap`), minus the part covered by active time. Labels are fixed at the start. Fold point F is the minimum of every v2 agent pending `startedAt`, every open session gap's `lastStopAt`, and collector `now`; over the record cap F is forced to the smallest record end and later records clip to the frontier, so active and wait stay lower bounds. Gaps are measured only for completed primary finishes with the same clock and `t >= lastStopAt`. Caps: pending 64, sessions 32, pitches 50 plus `(other)`, phases 16, scopes 25, leaves 600, trace 32, 6 h agent TTL, 8 h wait cap. Report rule: `observed` within 7 days of the last native event, `stale` after, `unconfigured` with none; `UsageReport.schemaVersion` stays 1.

Plan claims checked against the code (15): activity key already hashed session and agent ids but also labels; eviction was first-key; "memory bounded by pending cap" was false (own record cap); active as agent plus phase contradicted wait; a lease-busy event cannot increment its own drop counter; only `workflow-metrics-report.test.mts:82` flips to `observed`; the real refusal fixture was `schemaVersion: 2` in the state test (becomes valid); adding `scope` would change replay fingerprints (leave `(none)` out); new health counters live in `usage.health` because `keysAre` is exact; the 6 h TTL applies to agent entries only; the CLI test needs no v2 fixture; no other reader exists; LOC about 1,190 not 800; the existing conservation test stays green only if a fold counts `pitchFolds`; a primary re-start after a dropped `Stop` supersedes the open turn.

Exit-criteria conventions worth reusing: every code scope also runs the `:any` grep (0), the runtime invariants test, and Bun; new tests use `memoryLease`; every code scope has a recorded mutant proof; the hot scope-fence checks are `git diff --name-only <base> -- . ':!.project'` at most 15 and zero hook, `.claude`, `.opencode`, `.codex` paths.

## Deviations from plan

- S3: the pending-cap rule also lets the arriving start lose to older entries (dropped and counted as an eviction), so a reordered burst keeps exactly the newest 64 starts. The test "leaves unmatched and out-of-order activities" was deliberately rewritten: under the v2 identity the `different` finish matches and keeps the start's labels (1 unmatched before, 2 after final replay, 1 matched).
- S4: `LIMITS.openRecords` was renamed `LIMITS.openIntervals` (256) with `LIMITS.waitCapMs`. The pitch tree shape existed early because the engine needs the four level rows, with the existing bucket caps (50, 16, 25) until S5 added `lastAt`, `transitions`, `trace`, `lastPhase`, the 600-leaf cap and the fold; no migration since schema v2 had not shipped. A gap past the cap materializes on the first accepted event of any kind after the cap, counted once as `gapsMeasured` and `gapsOverCap`.
- S5: `lastAt` is collector time, so a late event cannot make a new pitch look old; ties keep insertion order; a pitch migrated from v1 reads as oldest. The leaf cap counts scope rows other than `(other)`, each phase may also hold one, so the bound is 600 plus one per phase node (`validState` checks `leaves <= 600`). Trace entries are `{at, phase, scope, class}` with `at` the event's `occurredAt`.
- S7: a brand-new state also began with `since: null`, which would read "not yet counting"; `blankState` now stamps `usage.since` (`blankUsage(at)`), only a v1 file read for a report keeps `null`. The since line reads `Unavailable` with no readable state and "not yet counting (state predates schema 2)" for a readable state with null. `collection.usageSince` is additive. The "at least" wording sits in the health row name because drops past the marker cap are not counted.
- S8: the pitch held no mapping table, so the rows come from the `workflow-usage-capture` shaping draft and are marked planned and not wired; a "Time and flow" subsection and the marker-file row were added.

## Drop marker and accepted risk

`recordDroppedCapture(root, deps)` runs outside the lease, appends one byte to `.project/metrics/workflow-usage.dropped`, never creates the metrics directory and never throws. Planned open flags were `O_APPEND|O_CREAT|O_NOFOLLOW`; shipped is `openSync(file, "a", 0o600)` guarded by an `lstat` refusal of symlinks, FIFOs and oversized files (cap 4,096 bytes) and an `fstat` inode and device comparison after the open. The runtime adapter's `FsConstants` exposes `O_RDONLY`, `O_NOFOLLOW` and `O_NONBLOCK` only; adding `O_WRONLY`, `O_APPEND` and `O_CREAT` would edit `runtime/types.mts` and `runtime/node.mts`, outside the file budget and blast radius. Accepted residual risk (owner approved): if no marker exists and something plants a symlink at its path between the `lstat` and the open, `"a"` follows it and appends one `x` byte to the target; it needs write access to the user-only `.project/metrics` directory whose ancestors the lease guard pins. A swapped existing marker is caught by the post-open check. The audit added a FIFO-swap window of the same class (SE4).

Consumer: under the lease the rename happens after the event is accepted, the count is added to the state, and the unlink follows a successful write; a failed write renames the marker back when no new one exists. A rejected or duplicate event leaves the marker for the next accepted one. A busy lease and a legacy lock each call `recordDroppedCapture` from `recordWorkflowEvent`, so the writer has a caller. The count is a lower bound: a byte appended after the rename is lost (C3), and a failed write plus a concurrent drop under-counts (SE8).

## Audit triage

Two cycles (cap 3); UX, i18n and eval do not apply. Cycle 1: three independent reviewers (security sonnet, code sonnet, test coverage haiku), each given a scratch copy outside the project with a planted canary that it caught; repo unchanged across each dispatch. Cross-pitch (author-run): `workflow-v3-rollout` and `test-execution-performance` plan no edit to the five files; disjoint.

- M1 (must-fix, SE1): a hand-edited `frontier` later than every open record end made the forced-fold loop spin forever under the lease (proof of concept hung 8 s). Fixed two ways: `validUsage` rejects a frontier not before every open record end, and the loop cuts the list back and counts `clippedIntervals` when a fold removes nothing; a mutant for each.
- Should-fix, fixed: the `captureDropped` add moved inside the marker-restoring `try` (C2); stale `O_NOFOLLOW` comment (SE3); the contract doc omitted the event family from the match key (T8).
- Acknowledged: finish does not pin `scope` (T4; the start's labels drive every credit); existing tests bind the real loopback port (T5, pre-existing); FIFO swap window (SE4); marker byte lost after rename (C3); counter at `MAX_SAFE_INTEGER` makes later writes fail without hanging (SE7); failed write plus concurrent drop under-counts (SE8); the cut-back test hangs rather than fails if its guard is removed (SE6; a synchronous loop cannot be timed out); the six health rows asserted only at 0 (T7); `hostForTest` in `metrics-lock.mts` ships in the production path (T9, not this pitch).
- Refuted canary artifacts: inverted TTL and its dependent failures (C1, T1, T2), duplicate-`schemaVersion` migration (SE2), missing CLI entry in the scratch copy (T3), "future timestamp untested" (T6; the existing invalid-event test covers `12:05:00.001Z`).
- Cycle 2 (security only, fresh sonnet reviewer, new canary caught at line 479): seven further hand-edited states all terminate in about 2 ms (SE5); no new finding. Must-fix queue empty.
- Process lesson for /cooldown: the test-coverage reviewer ran inside the code reviewer's canary copy, so its first finding was the canary; give each reviewer its own scratch tree. One reviewer wrote an output file inside the scratch audit directory (outside the repo).

## Build log highlights

- S2 mutant: widening the migrator prefix regex from `1` to `\d` alone survives, because `validV1` also requires `schemaVersion === 1`; widening both fails "refuses migration of anything but one exact v1 document" (its future-version fixture, `SCHEMA_VERSION + 1`). The routing check in `readWorkflowState` was widened too, so unrelated v2 reads also failed in that run. Two guards means a mutant must break both.
- Zsh trap: `$T WM` with unsplit variables silently fails under zsh (0.02 s, exit 1); run exit commands under `bash -c`.
- S3 mutants: first-key eviction fails the reordered-burst test; putting `event.pitch, event.phase` back in the key fails the mid-turn label test and the rewritten unmatched-activities test.
- S4 mutants: dropping the `minus active` subtraction fails the property and parallel-subagent tests; dropping the clock-equality check fails the skewed-clock test; folding at the collector clock instead of F fails fold exactness, the parallel-subagent test and the property test. Harness lesson: holding the injected clock ahead of undelivered events lets F run past them and clips real intervals (`clippedIntervals` 20 in the first property run); the test now advances the clock with each event. In production a later event cannot be older than F except through counted clock skew.
- S5: full-cap state 1,007,578 bytes. Mutants: first-come instead of LRU fails the 51st-pitch and protection tests; skipping the `Row` addition in a fold fails "totals stay whole across 200 folds". The full-cap test takes about 8 s (1,800 steps of 5 events) because `scopeRow` recounts leaves when a scope is absent from a full leaf set.
- S6 mutant: skipping `takeDroppedMarker` fails the one-byte-per-drop test, the busy-lease marker test, the cap test and the failed-write test.
- S7 mutant: hard-coding `unconfigured` fails the `observed` provenance test and "computes automatic capture from the last native event in every format".
- Audit mutants: removing the `validUsage` frontier check fails its test; removing the cut-back guard spins until a watchdog kills it; moving the `captureDropped` add out of its `try` fails "a counter overflow while consuming the marker restores it". Flake loop after the fixes 0/12 (baseline 0/12). All mutant runs restored the source byte for byte.

## Contract and code

`ai-framework/integrations/workflow-metrics.md` is the contract and was rewritten in S8 (schema 2, match key including the event family, time and flow definitions, hook mapping marked planned, bounds). No ADR was written. The state module, report module and their tests are the only code touched; the release is `CHANGELOG.md` and `VERSION` written by `changelog.mts` at /ship.

## Verification history

- Pre-ship wrapper: `node ai-framework/hooks/scripts/pre-ship-verify.mts` exits 1 ("No package.json or Muro document verifier found"), the existing followup from `state-fragment-sanitizer` (the bundle has no `package.json`), so the real commands from `stack.md` were run: three metrics test files 79/79, Bun on the state and report tests 73 pass, invariants test 8/8, `setup-validator` exit 0 (23 checks), `graphify --check` clean, `workflow-doctor` exit 0 (752 checks, READY), flake loop 0/12. No build, typecheck, lint or i18n command exists here.
- Full Node suite: 2234 tests (2231 per the S9 log entry), failing only the 14 `[dataset-mapping]` tests in `state-fragment-dataset.test.mts`, which fail identically without this pitch (HEAD: 2193 tests, 14 fail); two runs were green and three failed. `bun test ai-framework` stalls with or without the pitch's five files (200 s limit); a stale `bun ../probe.mts` had run at 100% CPU since 11 Oct.
- Scope fence: against HEAD the pitch touches 5 files outside `.project` and 0 under hooks, `.claude`, `.opencode`, `.codex`; `metrics-lock.mts` unchanged. Against the base ref `633adb3` the same commands print 64 files and 27 hook-path files because 16 commits from other pitches (token-attribution, state-fragment-sanitizer) landed in between.
- Resolver status at S9: exported (`token-attribution` S6 `resolvePhaseContext`, 556a60f); this pitch imports nothing from `token-consumption.mts`.

## Limits and open items

Followups raised at ship (all kept in the backlog file):

- `workflow-usage-capture` calls the exported resolver and wires the hooks (planned, med; shipped later as that pitch).
- Add `O_WRONLY`, `O_APPEND` and `O_CREAT` to the runtime adapter constants (`runtime/types.mts`, `runtime/node.mts`, the Bun adapter) and open the marker with them plus `O_NOFOLLOW` (low-med); closes the accepted symlink and FIFO windows.
- `[dataset-mapping]` child-suite flake and the `bun test ai-framework` stall (med). A later backlog entry names the cause: a sanitizer wall-clock test in `state-fragment.test.mts` that fails under parallel load.
- `pre-ship-verify.mts` route for a package-less bundle (med, already open, hit again at this ship).
- Audit tuning: separate scratch tree for the test-coverage reviewer (low).
- Test hygiene (low): the 8 s full-cap test (`scopeRow` recount), the cut-back test that hangs without its guard, and older tests that still bind the real loopback port.

Known limits: active and wait are lower bounds when records clip; wait is "elapsed between turns, not necessarily think-time"; the dropped count is "at least"; the symlink and FIFO marker windows are accepted.

## Historical contradictions

- Marker flags: the done-work summary says the marker opens with flag `a`, "not `O_NOFOLLOW`"; deviations S6 and audit SE3 show `O_NOFOLLOW` is exposed and the missing constants are `O_WRONLY`, `O_APPEND` and `O_CREAT`. The audit prompts repeated the "no O_NOFOLLOW" claim and the S6 plan assumed all three were available.
- Bun test count: 73 pass (SHIPPED, audit.md) versus 70 (S9 log entry).
- Full Node suite size: 2198 (S2 rerun), 2206 (S3), 2231 (S9 log), 2234 (SHIPPED, audit.md).
- Size: pitch about 800 LOC and 7 files, plan about 1,190 LOC and 7 to 9 files, shipped about 1,076 lines; the S9 log said 5 of 7 planned files were present before the release files.
- Flake cause: the S3 and S9 log entries call the `[dataset-mapping]` cause unidentified; the backlog later attributes it to the sanitizer wall-clock test.
- Pitch said the `capture.dropped` counter and an in-lease increment; shipped is `usage.health.captureDropped` fed by the marker plus in-lease refusals, because the dropped event cannot write the state it failed to lock.
- Pitch and S1 default planned a hook-to-event mapping "copied from the pitch"; the pitch had no table (taken from the capture shaping draft).
- Dates: bet 2026-10-19, spike and all scopes 2026-10-20, ship 2026-10-20 (hill: "shipped 2.36.0").

Whole files left out of the ledger as process noise: the hill chart (every scope done 2026-10-20, repeated in SHIPPED and the log) and the four reviewer dispatch prompts (contract text duplicates the plan; prompt hashes are in the audit records).
