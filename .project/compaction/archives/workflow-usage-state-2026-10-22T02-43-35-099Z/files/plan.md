# Plan: workflow-usage-state

**Pitch**: pitch.md (full draft: `../workflow-usage-capture/shaping-draft.md`)  •  **Appetite**: big-batch (cap 15 files / 1,500 LOC)  •  **Hill**: hill.md  •  **Base ref**: `633adb3`

Part A1 of the `token-time-report` split. This pitch changes only the state module, its report and its contract doc.
It keeps every no-go from the pitch:
- no prompts, responses, tool arguments or transcript text;
- no inferred `gate.decided`, `audit.finished` or `pitch.finished`;
- no change to the token snapshot, the lease mechanism or store separation;
- no unbounded arrays or per-event logs;
- no fabricated or back-filled durations.

The state stays JSON (rule `machine-data-format.md`: only scripts read it).

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | Spike: lease-flake baseline, drop channel decision | `.project/pitches/workflow-usage-state/spike-s1.md` (pitch record) | ~60 (notes) | — | — | yes: a measurement loop plus one decision record; writes only its own findings file | fast (the options are pre-specified below) |
| S2 | Schema v2 skeleton and v1→v2 migration (one commit) | `workflow-metrics-state.mts`, `workflow-metrics-state.test.mts`, `ai-framework/integrations/workflow-metrics.md` (one line) | ~70 + ~90 test + 1 | S1 | — | no: a one-commit version bump that needs the full suite and the base-ref proof; main thread | — |
| S3 | Event model: scope label, v2 activity identity, eviction, TTL, duplicate and reordered events | `workflow-metrics-state.mts`, `workflow-metrics-state.test.mts` | ~60 + ~140 test | S2 | S7 (isolated worktree only) | no: it changes the meaning of two existing tests and the documented lifecycle contract; main thread | — |
| S4 | Interval engine: active, wait, sessions, coverage at four levels | `workflow-metrics-state.mts`, `workflow-metrics-state.test.mts` | ~150 + ~200 test | S3 | S7 (isolated worktree only) | no: the hardest scope (exact sweep fold, clock rules, property test); main thread | — |
| S5 | Pitch tree caps, LRU fold, transitions, trace ring, 4 MiB bound | `workflow-metrics-state.mts`, `workflow-metrics-state.test.mts` | ~90 + ~120 test | S4 | S7 (isolated worktree only) | yes, sequential after S4 (never alongside S3, S4 or S6): the caps, fold rule and tests are fully specified; context isolation | standard (fold conservation needs care) |
| S6 | `captureDropped` channel (per the S1 decision) | `workflow-metrics-state.mts`, `workflow-metrics-state.test.mts` | ~35 + ~60 test | S1, S5 | S7 (isolated worktree only) | yes, sequential after S5: one small API with fixed exits | standard (unleased file I/O is security-relevant) |
| S7 | Report: computed capture status, `since`, new health rows | `workflow-metrics-report.mts`, `workflow-metrics-report.test.mts` | ~35 + ~70 test | S2 | S3-S6 (isolated worktree only), S8 | yes: two disjoint files, pure renderer, existing escaping helpers | standard (three output formats and the public JSON contract) |
| S8 | Contract doc: event mapping, identity, active/wait definitions, bounds | `ai-framework/integrations/workflow-metrics.md` | ~60 | S6 | S7 | yes: one doc file whose content S3-S6 fix | fast |
| S9 | Verification and release | `CHANGELOG.md`, `VERSION` (via `ai-framework/scripts/changelog.mts` at /ship) | ~10 | S7, S8 | — | no: the full suite, the flake count against the baseline, validators; main thread | — |

Paths without a directory are under `ai-framework/scripts/`.

S2 through S6 all edit `workflow-metrics-state.mts` and its test. They run strictly one after another and are never
parallel with each other.

Pitch risk owners map to plan scopes:

| Pitch risk | Plan scope |
|---|---|
| Lease flake, injected `tryListen` | S1 records the baseline; S3-S6 inject `tryListen`; S9 counts failures |
| Pinned report tests | S7 |
| v2 fixture site | S2; the CLI test needs none, see claim 11 |
| Key export | stays opaque here; re-checked at S9 |

## File budget

Firm: 7 certain, at most 9 of 15 (release records included, pitch records excluded, as in earlier big-batch plans):

1. `ai-framework/scripts/workflow-metrics-state.mts`
2. `ai-framework/scripts/workflow-metrics-state.test.mts`
3. `ai-framework/scripts/workflow-metrics-report.mts`
4. `ai-framework/scripts/workflow-metrics-report.test.mts`
5. `ai-framework/integrations/workflow-metrics.md`
6. `CHANGELOG.md`
7. `VERSION`

Seven files are certain. Two contingent files would make 9:

- `ai-framework/scripts/workflow-metrics.test.mts`: only if S2 finds a CLI path that needs a v2 fixture. The
  impact scan found none, because every CLI test starts from an empty state that `blankState` now writes as v2.
- One spare slot, held for a drop-channel test helper if S1 chooses `marker-file` and the helper does not fit in the
  state test.

Pitch records do not count: `spike-s1.md`, `log.md` (mutant proofs, flake counts) and `deviations.md`.

Projected LOC is about 1,190: 440 production, 680 test, 70 doc. The pitch estimated about 800; see claim 13. This is
still under the 1,500 cap.

Not touched, with reason:
- `state-snapshot.mts`: reads only `token-consumption.json` (`:342`).
- `state-pages.mts`: links `workflow-usage.html` by presence only (`:122`).
- `state-html.test.mts`: its fixture writes fake HTML files (`:653-663`).
- `workflow-doctor.mts`, `bundle-sync.mts`, `setup-validator.mts`: `grep -n metrics` finds no reference.
- `ai-framework/hooks/scripts/metrics-lock.mts`: the lease mechanism is a no-go.
- `token-consumption.mts`: frozen until `token-attribution` S10 (critique X8), and this pitch never imports it.

## Blast radius (impact scan at `633adb3`)

Readers of `workflow-usage.json` or its `schemaVersion`:

| Consumer | What it reads | Effect of v2 | Action |
|---|---|---|---|
| `workflow-metrics-state.mts:204` `validState` | exact 13 keys, `schemaVersion !== 1` | must accept v2 exactly; v1 only through the migrator | S2 |
| `workflow-metrics-state.mts:36,94` | type literal `schemaVersion: 1`, emitter in `blankState` | `typeof SCHEMA_VERSION`, emitter writes 2 | S2 |
| `workflow-metrics-state.mts:255` `readWorkflowState` | strict parse | migrates v1 text (record path persists it; report path keeps it in memory with `since: null`) | S2 |
| `workflow-metrics-report.mts:2,42` | `validState(input)`, `state.pending` statuses | accepts v2 through `validState`; legacy and v2 pending entries both have `status` | none in S2; S7 for capture status |
| `workflow-metrics-report.mts:11,75,85,102,106` | literal `automaticCapture: "unconfigured"` (type, note, JSON, Markdown, HTML) | computed status | S7 |
| `workflow-metrics-report.mts:18` | its own copy of the `HEALTH` list | new counters live in `usage.health`; rows added | S7 |
| `workflow-metrics.mts` CLI | calls `recordWorkflowEvent` and `generateReport` only | none | must stay green |
| `state-snapshot.mts`, `state-pages.mts`, doctor, bundle-sync, validator | nothing from this store (see File budget) | none | must stay green |
| this checkout's `.project/metrics/workflow-usage.json` | v1, 2 events, `pending: {}` | migrated on the first v2 record; a report never rewrites it | S2 smoke exit |

Tests that change, with reason:

| Test | Today | After |
|---|---|---|
| `workflow-metrics-state.test.mts:222` | refusal fixture `schemaVersion: 2` | becomes valid after the bump, so it changes to `SCHEMA_VERSION + 1` (S2, same commit) |
| `workflow-metrics-state.test.mts:156-168` ("leaves unmatched and out-of-order activities") | the `different` finish (pitch `other`) is unmatched because the labels are in the key | under the v2 identity it matches and is attributed to the start's labels; the expected counts are rewritten (S3, deliberate contract change, logged in `deviations.md`) |
| `workflow-metrics-state.test.mts:170-176` | eviction takes the first key | stays green: the oldest `startedAt` ties at `AT`, and ties keep insertion order (S3) |
| `workflow-metrics-state.test.mts:178-193` | 51 pitch keys, `overflowEvents` 75 | stays green only if an LRU fold counts `usage.health.pitchFolds`, not `overflowEvents` (S5) |
| `workflow-metrics-report.test.mts:82` | `automaticCapture === "unconfigured"` after a `native` event | flips to `observed` (S7) |
| `workflow-metrics-report.test.mts:56,67` | `unconfigured` for a manual-only scenario | unchanged: correct under the computed status, kept as the `unconfigured` case (S7) |

Run `grep -rn "schemaVersion\|unconfigured" ai-framework/scripts/workflow-metrics*.test.mts` before S2 and again
before S7 closes. Every hit must be accounted for in this table.

Downstream pitches:
- `workflow-usage-capture` (A2) writes into this state.
- `token-time-report` (part B) reads it read-only.
- `token-attribution` S6 owns the resolver; S7 owns the LRU fold that S5 mirrors.
- `state-deep-evidence` owns record-derived counts and does not read this store.

## Exit criteria per scope (machine-checkable, ≥1 per scope)

Notation:
- `T` = `node --experimental-strip-types --disable-warning=ExperimentalWarning --test`.
- `WM` = `ai-framework/scripts/workflow-metrics-state.test.mts ai-framework/scripts/workflow-metrics-report.test.mts ai-framework/scripts/workflow-metrics.test.mts`.
- `SUITE` = `T "ai-framework/**/*.test.mts" ".claude/**/*.test.mts"`.

This repository has no build, typecheck or lint command (`.project/context/stack.md`, "Not Applicable").

Every code scope must also pass:
- `grep -cE ":\s*any\b|as any\b|<any>" <changed .mts>` = 0 (0 at base for both modules).
- `T ai-framework/scripts/runtime/invariants.test.mts` exit 0 (no `node:*` import outside the runtime adapters).
- `bun test <its test files>` exit 0 (Bun is installed).

**Lease rule for every new test (S3-S6):**
- Prefer the pure `applyEvent` path, which takes no lease.
- A new test that must call `recordWorkflowEvent` or `generateReport` passes `memoryLease(deps)`: a helper in the
  state test whose `deps.net.tryListen` returns an in-memory server, as `metrics-lock.test.mts:358` does.
- The only real-port tests are the existing ones, so failures are counted against the S1 baseline.
- Check: `git diff 633adb3 -- ai-framework/scripts/workflow-metrics-state.test.mts | grep -c "memoryLease"` ≥ 2.
- Check: `git diff 633adb3 -- ai-framework/scripts/workflow-metrics-state.test.mts | grep -E "^\+.*recordWorkflowEvent\(" | grep -vc "memoryLease"` = 0.

### S1 — Spike: lease-flake baseline, drop channel decision
- `test -f .project/pitches/workflow-usage-state/spike-s1.md`
- `grep -cE "^## (Lease-flake baseline|Drop channel|Interval record cap|Coordination)$" .project/pitches/workflow-usage-state/spike-s1.md` = 4
- Baseline as a number:
  - `for i in $(seq 12); do T WM >/dev/null 2>&1 || echo F; done | grep -c F`
  - Written as `Baseline failures: N/12`.
  - Check: `grep -cE "^Baseline failures: [0-9]+/12$"` = 1.
  - Also record the other pitch's number from `token-attribution/spike-s1-pointer.md` when that file exists, else
    `not run`. Check: `grep -cE "^token-attribution baseline: ([0-9]+/12|not run)$"` = 1.
- `grep -cE "^Drop channel: (marker-file|indirect-only)$"` = 1.
  - Default `marker-file`: a bounded file appended outside the lease and consumed under the next lease (S6).
  - `indirect-only` means no out-of-lease write. Drops then surface only as `unmatchedFinishes` and
    `gapsUnmeasured`, and `captureDropped` counts only in-lease refusals.
- `grep -cE "^Open-record cap: [0-9]+$"` = 1 (default 256). The section records the worst-case byte estimate per
  record.
- Coordination section:
  - Is `token-attribution` S6 done? If not, the key stays an opaque validated string.
  - Is its S7 fold rule final? S5 mirrors it.
  - Answer each one `yes` or `no` with the date.
- Privacy: `grep -cE "/Users/|/home/" .project/pitches/workflow-usage-state/spike-s1.md` = 0.
- **Gate (Approve / Revise / Back / Stop):** the owner confirms the drop channel and the open-record cap.

### S2 — Schema v2 skeleton and v1→v2 migration (one commit)
Knowledge applied:
- issues/a-schema-version-bump-left-98-stale-tests-and-the-migrator-on-the-old-version
- patterns/a-version-migrator-edits-the-token-not-the-model
- rule `data-modeling.md` (lossless)

One commit carries the constant, the emitter, the refusal guard, the migrator, the fixtures and the doc word:
- `git show --name-only --format= <S2 commit> | grep -cE "scripts/workflow-metrics-state\.mts|scripts/workflow-metrics-state\.test\.mts|integrations/workflow-metrics\.md"` = 3
- `grep -c "export const SCHEMA_VERSION = 2" ai-framework/scripts/workflow-metrics-state.mts` = 1
- `grep -cE "schemaVersion: 1;|schemaVersion: 1,|schemaVersion !== 1" ai-framework/scripts/workflow-metrics-state.mts` = 0
- `grep -c "SCHEMA_VERSION + 1" ai-framework/scripts/workflow-metrics-state.test.mts` ≥ 1, and
  `grep -cE "schemaVersion: 2 \}" ai-framework/scripts/workflow-metrics-state.test.mts` = 0
- `grep -c "Schema-v1" ai-framework/integrations/workflow-metrics.md` = 0
- Old writers refuse v2 instead of corrupting it:
  - Check: `git show 633adb3:ai-framework/scripts/workflow-metrics-state.mts | grep -c "v.schemaVersion !== 1"` = 1.
  - Nothing at base imports this module in a long-running process (the OpenCode plugin does not), so there is no
    restart step.
- `T WM` exit 0, then `SUITE` exit 0. The suite is not handed on red. Any failure must match a base-ref failure by
  test name, and both lists are recorded in `log.md`.

Shape (an exact schema, new keys only inside one appended block):
- `usage` holds:
  - `since` (ISO or `null`) and `health` (the counters below);
  - `total`: one `Row`;
  - `pitches` (map), `open` (array) and `frontier` (epoch ms or `null`);
  - `sessions` (map).
- `Row` is `{ activeMs, waitMs, turnsStarted, turnsFinished, gapsMeasured, gapsUnmeasured, gapsOverCap }`.
- `usage.health` is `{ captureDropped, pitchFolds, clippedIntervals, mixedClockIntervals, supersededTurns, sessionEvictions }`.
- All of these are present from S2 at zero or empty, so S7 can render them in parallel.

Behavior tests:
- **Token edit and append.** A v1 fixture (JSON.stringify output) is migrated by `migrateV1Text(text, since)`:
  - It accepts only one exact `{"schemaVersion":1,` prefix, and refuses when a `"usage"` key already exists.
  - It replaces that digit, and inserts `,"usage":…` before the final `}` while keeping the trailing newline.
  - The result passes the strict v2 `validState`.
  - Remove the inserted block and restore the digit, and the result is byte-equal to the input.
- **Lossless object.** With `usage` deleted and `schemaVersion` set back to 1, the migrated object deep-equals the
  parsed original. Legacy `pending` entries are kept unchanged.
- **Record path.** A v1 file on disk plus one event through `recordWorkflowEvent` (with `memoryLease`) gives:
  - a file that starts `{"schemaVersion":2,`, with `usage.since` equal to the injected clock;
  - old totals plus exactly one event;
  - no `.rejected` file and no `.tmp` file.
- **Report path never migrates on disk.** `generateReport` on a v1 file (with `memoryLease`) gives:
  - exit `written: true`;
  - the state file byte-equal before and after;
  - the in-memory `usage.since` is `null`.
- **Refusals.** `SCHEMA_VERSION + 1`, a v1 text with two `"schemaVersion"` tokens, a v1 text with a `usage` key, and a
  v1 text failing the v1 field check are each refused with a fixed reason. The bytes stay unchanged and no partial
  write happens.
- **Ancestor swap.** The existing test at `:60-79` stays green. A new case swaps `.project/metrics` during lease
  acquisition while a v1 file is present. The migration is refused and the outside directory is unchanged
  (pattern: pin-directory-identities-across-async-leases; `guardedMetricsDeps` is reused, not reimplemented).

Smoke on this checkout, machine-checked, run before any record command here:
`test ! -f .project/metrics/workflow-usage.json || { node ai-framework/scripts/workflow-metrics.mts report --root . --format json >/dev/null && head -c 19 .project/metrics/workflow-usage.json | grep -c '^{"schemaVersion":1,$'; }`
prints 1.

Mutant proof, in `log.md` (`grep -c "^Mutant S2:"` ≥ 1): widening the migrator's prefix match from `1` to `\d`
makes the `SCHEMA_VERSION + 1` refusal test fail.

### S3 — Event model: scope label, v2 activity identity, eviction, TTL, duplicate and reordered events
- `T WM` exit 0; `bun test ai-framework/scripts/workflow-metrics-state.test.mts` exit 0
- `grep -c "Object.keys(state.pending)\[0\]" ai-framework/scripts/workflow-metrics-state.mts` = 0 (the insertion-order
  eviction at `:142` is gone)
- `grep -cF '^S\d{1,3}$' ai-framework/scripts/workflow-metrics-state.mts` ≥ 1 (the scope pattern)
- The key stays opaque until `token-attribution` S6 exports the resolver:
  `grep -cE "from .*token-consumption" ai-framework/scripts/workflow-metrics-state.mts` = 0

Event model rules:
- **Scope.** `scope` is absent, giving `(none)`; or `^S\d{1,3}$`; or else `(other)`, counted in `overflowEvents` and
  never matchable.
- **Labels are opaque.** pitch, phase and scope are taken as validated labels. No slug or `PHASES` resolution happens
  here.
- **Activity identity (critique S7, S8).**
  - The key is `sha256(["v2", family, vendor, sessionId, activityId])`, where `activityId` is the vendor's agent id.
    The labels are no longer in the key.
  - A v2 pending entry stores `kind`, `agentKind`, `clock` (`event` or `collector`, from `timeProvided`), pitch,
    phase and scope from the **start**.
  - A finish is attributed to the start's labels, so a mid-turn phase change never moves the interval.
  - A start or finish with an `(other)` vendor, pitch, phase or scope stays unmatchable (pattern K3).
  - Legacy v1 pending entries have no labels and never match. They drain by eviction and are counted.
- **Eviction.**
  - At the pending cap, the entry with the oldest `startedAt` goes, with ties in insertion order.
  - An `agent.*` pending entry older than `LIMITS.pendingTtlMs` (6 h, by the injected `clock.now`) is evicted on any
    event. Both cases count `pendingEvictions`.
  - Phase pending entries keep cap-only eviction (see claim 10).
- **Fingerprint.** A `(none)` scope is left out of the replay fingerprint, so a replay of an event recorded before the
  upgrade still reads `duplicate event`.

Behavior tests (each one named and separate):
- **`Stop` before `UserPromptSubmit`.** The finish is unmatched (+1), the start becomes pending, and a later finish
  matches it. `elapsedMs` covers only the matched pair, and nothing is negative.
- **Double `SessionEnd`.**
  - The same `eventId` again gives `duplicate event`.
  - A new `eventId` gives a second cancelled finish that is unmatched (+1).
  - `matchedFinishes` is 1 in both cases.
- **Finish after eviction**, for cap eviction and for TTL eviction: unmatched, no duration.
- **Primary re-start without a `Stop`.**
  - A second `agent.started` for the same primary identity supersedes the open turn: `written: true`, and
    `usage.health.supersededTurns` is 1.
  - The old turn adds no duration.
  - A phase re-start keeps today's `activity already started` refusal (the test at `:160` is unchanged).
- **Reordered burst.**
  - 80 starts arrive with shuffled `occurredAt` (seeded PRNG in the test, no dependency).
  - The 16 evicted entries are exactly the 16 oldest `startedAt`.
  - The event totals across vendors and pitches equal `totals`.
- **Mid-turn label change.** The start is under phase `plan`, the finish under phase `build`, and the interval is
  attributed to `plan`.
- **Replay across the upgrade.** The test builds the base-ref fingerprint recipe (field list frozen in the test) for a
  v1-era event. Applying that event to a migrated state gives `duplicate event`, not `conflicting event identifier`.

Mutant proofs, in `log.md` (`grep -c "^Mutant S3:"` ≥ 2):
- Restoring `Object.keys(state.pending)[0]` eviction fails the reordered-burst test.
- Putting `event.phase` back into the key fails the mid-turn test.

### S4 — Interval engine: active, wait, sessions, coverage at four levels
- `T WM` exit 0; `bun test ai-framework/scripts/workflow-metrics-state.test.mts` exit 0
- `grep -cE "waitCapMs: 8 \* 3_?600_?000|waitCapMs: 28_?800_?000" ai-framework/scripts/workflow-metrics-state.mts` = 1;
  `grep -c "openIntervals:" ai-framework/scripts/workflow-metrics-state.mts` = 1 (value from S1)

Definitions (the doc copies them in S8):
- **Active** is the measure of the union of matched **agent** intervals: primary turns and subagents. Phase segments
  are excluded, because they span the gaps between turns and would make wait always 0 (claim 4). They keep their
  existing `elapsedMs`.
- **Wait** is "elapsed between turns, not necessarily think-time". In one session it runs from a completed primary
  finish to that session's next primary start, capped at `waitCapMs` (8 h; time over the cap counts in
  `gapsOverCap`). Only the part not covered by active time at the same level counts.
- **Levels.** Each matched interval or measured gap is credited to the total, its pitch, its pitch and phase, and its
  pitch, phase and scope. The labels come from the start (or from the finished turn, for a gap).

Mechanism:
- **Open records.** Closed records `{ s, e, kind: active|wait, pitch, phase, scope }` (epoch ms) wait in `usage.open`,
  at most `LIMITS.openIntervals` of them.
- **Fold point.** `F` is the minimum of:
  - the `startedAt` of every v2 `agent.*` pending entry;
  - the `lastStopAt` of every open session gap still under the cap;
  - the collector time `now`.
- **Fold.** Folding sweeps `[frontier, F]` per level key:
  - `activeMs += |⋃active ∩ [frontier, F]|`;
  - `waitMs += |⋃wait ∩ [frontier, F] \ ⋃active|`.
  - Records are then trimmed to `[F, e]`, records with `e ≤ F` are dropped, and `frontier = F`.
  - This is exact for everything that cannot be overlapped any more.
- **Overflow.** Over the record cap, `F` is forced to the smallest record end.
  - Any later record (or pending start) before `frontier` is clipped to `frontier`.
  - A record fully before it is dropped.
  - Both count `clippedIntervals`, so active and wait stay lower bounds and are never inflated.
- **Sessions.** `usage.sessions` is keyed by `sha256(["session", vendor, sessionId])` and capped at 32 by oldest
  `lastAt`.
  - An entry holds `lastAt`, `lastStopAt`, the `clock`, the open turn's labels and whether a turn is open.
  - An evicted session with an open gap counts `gapsUnmeasured` and `sessionEvictions`.
- **Gap outcomes.**
  - Only an `outcome: completed` primary finish opens a gap. A cancelled or failed finish closes the turn without
    one.
  - A gap is measured when the next primary start has the same clock and `t ≥ lastStopAt`.
  - It is unmeasured when the clocks differ (critique S8: one clock source per vendor), when `t < lastStopAt`, or when
    a turn was still open.
  - An open gap past the cap is materialized as `[stop, stop + cap]` with `gapsOverCap` + 1, and is not counted again
    at the next prompt.
- **Mixed clocks.** An agent interval whose start and finish clocks differ keeps its `elapsedMs` but adds no active
  time, counting `mixedClockIntervals`.
- **Counters.** `turnsStarted` and `turnsFinished` count primary turns at each level.

Behavior tests:
- **Property style.**
  - 300 seeded random scenarios, each with ≤ 40 events over 3 sessions, 2 pitches, 3 phases and 2 scopes, including
    subagents overlapping turns.
  - For every level key: `activeMs + waitMs ≤ max(e) − min(s)` over the events credited to that key.
  - `activeMs ≤` a brute-force union over the same matched intervals, and `waitMs ≥ 0`.
  - When no cap or clip fired (`clippedIntervals === 0`), active equals the brute-force union exactly.
  - Under this rule, `activeMs + waitMs` never exceeds wall time.
- **Burst over the record cap.**
  - 2 × `openIntervals` overlapping intervals arrive while one early pending start holds the fold point.
  - `clippedIntervals` > 0, active ≤ the brute-force union, and active + wait ≤ wall.
  - The event totals are unchanged against an uncapped count, and `validState` holds on a JSON round trip.
- **Skewed clock.**
  - The `Stop` is collector-timed and the next prompt event-timed: `gapsUnmeasured` + 1 and `waitMs` 0.
  - A prompt earlier than `lastStopAt`: unmeasured.
- **Overnight gap.** A 20 h gap gives wait 8 h and `gapsOverCap` 1, and the later prompt does not count it twice.
- **Parallel subagent inside a wait gap** reduces wait by exactly the covered part.
- **Fold exactness.** One interval is closed while an earlier start is pending. It stays in `open` until that start
  finishes, then folds. Active equals the union, not the sum.
- **No text stored.** A marker-laden event (`PROMPT-MARKER` in `prompt`, `raw`, `transcript`) leaves the serialized
  state free of every marker, and the sessions map holds only hashes. `assert.doesNotMatch` runs on
  `JSON.stringify(state)` and on any thrown reason.

Mutant proofs, in `log.md` (`grep -c "^Mutant S4:"` ≥ 3):
- Dropping the `\ ⋃active` subtraction from wait fails the property test.
- Dropping the clock-equality check fails the skewed-clock test.
- Folding at insertion instead of at `F` fails fold exactness.

### S5 — Pitch tree caps, LRU fold, transitions, trace ring, 4 MiB bound
- `T WM` exit 0; `bun test ai-framework/scripts/workflow-metrics-state.test.mts` exit 0
- The existing test at `:178-193` passes unchanged (51 pitch keys, `overflowEvents` 75):
  `git diff 633adb3 -- ai-framework/scripts/workflow-metrics-state.test.mts | grep -cE "^-.*overflowEvents, 75"` = 0

Tree and caps (mirroring `token-attribution` S7 so part B can join):
- `usage.pitches[p]` is `{ lastAt, row, phases: { [ph]: { row, scopes: { [sc]: Row } } }, transitions, trace, lastPhase }`.
- Caps:
  - pitches 50 named plus `(other)`;
  - phases per pitch 16;
  - scopes per pitch and phase 25;
  - leaf rows 600 in total;
  - `trace` 32 entries per pitch, each `{ at, phase, scope, class }` with no text.
- **LRU fold** (pattern: reversible-aggregates-store-their-routing):
  - At the cap, the pitch with the oldest `lastAt` is folded into `(other)`, with every Summary counter and every
    `Row` added. Pitches migrated from v1 have no `lastAt` and count as oldest.
  - A pitch that a pending entry, an open record or a session routes to is never chosen.
  - If every named pitch is referenced, the new pitch goes to `(other)` and counts `overflowEvents`.
  - A fold counts `usage.health.pitchFolds`, never `overflowEvents`, and is applied to `pitches` and
    `usage.pitches` together.
  - Phase and scope overflow inside a pitch go to `(other)` at that level.
- **Transitions.** On `phase.started`, the previous `lastPhase` of the same pitch is compared by pipeline rank:
  `shape` = `shape-lite` < `critique` < `plan` < `build` < `audit` < `ship`.
  - Same phase: `repeat`. Higher rank: `forward`. Lower rank: `back`. Any unranked phase: `other`.
  - The first start of a pitch is trace class `start` with no transition.
  - Nothing is ever written as `gate.decided` (no-go):
    `grep -cE "kind: \"gate.decided\"" ai-framework/scripts/workflow-metrics-state.mts` = 0.

Behavior tests:
- The 51st pitch gets its own row.
- The sum over named pitches plus `(other)` of each Summary counter and each `Row` field equals `totals` and
  `usage.total`. This conservation holds after 200 folds.
- A pitch with a pending activity survives a fold that would otherwise pick it.
- A trace holds 32 entries after 40 phase starts, the oldest dropped. The transition counters sum to phase starts
  minus first starts.
- **4 MiB bound.**
  - Every cap is filled at once: 50 pitches, 16 phases, 600 leaves, 32 traces each, the record cap, 64 pending
    entries, 32 sessions, 512 recent keys, 30 days, and the vendor and dimension caps.
  - `new TextEncoder().encode(JSON.stringify(state)).length < LIMITS.stateBytes`.
  - The measured size is written to `log.md` (`grep -cE "^S5 full-cap state bytes: [0-9]+$"` = 1).
  - The state round-trips through `readWorkflowState` (with `memoryLease`) as `valid`.

Mutant proof, in `log.md` (`grep -c "^Mutant S5:"` ≥ 2):
- First-come instead of LRU fails the 51st-pitch test.
- Skipping the `Row` addition in a fold fails conservation.

### S6 — `captureDropped` channel (per the S1 decision)
- `T WM` exit 0; `bun test ai-framework/scripts/workflow-metrics-state.test.mts` exit 0
- If `Drop channel: marker-file`:
  - **Writer.** `export function recordDroppedCapture(root, deps)`, run outside the lease, appends one byte to
    `.project/metrics/workflow-usage.dropped`.
    - The path goes through `metricsDirectory(root, false, deps)`, and the file is opened
      `O_APPEND | O_CREAT | O_NOFOLLOW`, mode `0600`.
    - It refuses a non-regular file or a size ≥ `LIMITS.dropMarkerBytes` (4,096).
    - It never creates `.project/metrics` and never throws to its caller.
  - **Consumer.** Under the lease, before the state write, `recordWorkflowEvent` consumes the marker:
    - rename it to a unique name, read its size, add that to `usage.health.captureDropped`, unlink it;
    - all of this goes through the guarded deps.
  - Tests:
    - Three markers then one event gives `captureDropped` 3, and the marker file is gone.
    - A symlinked marker is refused and its target is byte-unchanged.
    - A FIFO marker does not block.
    - At the size cap, further appends are refused and counted as dropped beyond the cap. The report notes "at
      least".
    - A missing `.project/metrics` is not created.
    - stderr and the return value carry fixed text only.
  - `grep -c "workflow-usage.dropped" ai-framework/scripts/workflow-metrics-state.mts` ≥ 1
- If `Drop channel: indirect-only`:
  - `captureDropped` counts only in-lease refusals: the state refused under the lease, and a counter overflow on a
    non-counter path.
  - `grep -c "workflow-usage.dropped" ai-framework/scripts/workflow-metrics-state.mts` = 0.
- Mutant proof, in `log.md` (`grep -c "^Mutant S6:"` ≥ 1): skipping the consume step fails the three-marker test (or,
  for `indirect-only`, skipping the in-lease increment fails its test).

### S7 — Report: computed capture status, `since`, new health rows
- `T ai-framework/scripts/workflow-metrics-report.test.mts ai-framework/scripts/workflow-metrics.test.mts` exit 0;
  `bun test ai-framework/scripts/workflow-metrics-report.test.mts` exit 0
- `grep -c "Automatic capture: unconfigured" ai-framework/scripts/workflow-metrics-report.mts` = 0 and
  `grep -c "automaticCapture: \"unconfigured\"" ai-framework/scripts/workflow-metrics-report.mts` = 0 (the literal is
  computed in all five places)
- `grep -c "elapsed between turns, not necessarily think-time" ai-framework/scripts/workflow-metrics-report.mts` ≥ 1

Report rules:
- `automaticCapture` comes from `state.sources.native.lastEventAt`, relative to `generatedAt`:
  - `null` gives `unconfigured`;
  - 7 days or less gives `observed`;
  - more than 7 days gives `stale`.
- It is printed in JSON, Markdown and HTML, and the note at `:75` follows it.
- Header line: `Time and flow counted since: <usage.since | Unavailable>`. `null` reads as "not yet counting (state
  predates schema 2)".
- Collection health gains rows for the six `usage.health` counters, with fixed English names. **No new tables**
  (pitch P2): active, wait and coverage rendering belongs to part B.
- `UsageReport.schemaVersion` stays 1, because the changes only add or widen fields.

Pinned tests:
- `:82` changes to `observed`.
- `:56` and `:67` stay `unconfigured`.
- New cases:
  - native at `AT − 8 d` gives `stale`;
  - native at `AT − 6 d` gives `observed`;
  - manual only gives `unconfigured`;
  - each status is asserted in all three formats.

Other behavior tests:
- A v1 state read for a report shows `since` as Unavailable, and its file is untouched.
- The health rows are present.
- Hostile labels are still escaped. The existing tests at `:136-161` stay green.

Mutant proof, in `log.md` (`grep -c "^Mutant S7:"` ≥ 1): hard-coding `unconfigured` again fails the
`observed`/`stale` tests.

### S8 — Contract doc
- `grep -c "schema 2\|schemaVersion 2" ai-framework/integrations/workflow-metrics.md` ≥ 1;
  `grep -c "Schema-v1" ai-framework/integrations/workflow-metrics.md` = 0
- `grep -ciE "elapsed between turns, not necessarily think-time" ai-framework/integrations/workflow-metrics.md` ≥ 1
- `grep -ciE "phase segments? (are|is) not active" ai-framework/integrations/workflow-metrics.md` ≥ 1
- `grep -ciE "lower bound" ai-framework/integrations/workflow-metrics.md` ≥ 1 (wait, and clipping)
- `grep -ciE "labels? (are|is) (fixed|taken) (at|from) the start" ai-framework/integrations/workflow-metrics.md` ≥ 1
  (replaces "Use the same … attribution throughout" at `:58-59`)
- `grep -cE "\*\*Automatic capture is unconfigured" ai-framework/integrations/workflow-metrics.md` = 0 (`:84` becomes
  the computed-status description)
- The bounds section names every new cap (sessions 32, trace 32, records, phases 16, scopes 25, leaves 600, TTL 6 h,
  wait cap 8 h):
  `grep -cE "\b(32|600|25|16)\b" ai-framework/integrations/workflow-metrics.md` ≥ 4.
- The hook-to-event mapping table is copied from the pitch (`SessionStart`, `UserPromptSubmit`, `Stop`,
  `SubagentStop`, `SessionEnd`, phase start) and marked "written by `workflow-usage-capture`; not wired by this
  core": `grep -c "UserPromptSubmit" ai-framework/integrations/workflow-metrics.md` ≥ 1.
- `node ai-framework/scripts/setup-validator.mts` exit 0

### S9 — Verification and release
- `SUITE` exit 0 under Node; `bun test ai-framework` exit 0, or each failure is matched by name to a pre-existing
  followup.
- Lease flake:
  - `for i in $(seq 12); do T WM >/dev/null 2>&1 || echo F; done | grep -c F` is ≤ the S1 baseline. Both numbers go in
    `log.md` (`grep -cE "^S9 failures: [0-9]+/12 \(baseline [0-9]+/12\)$"` = 1).
  - Only one baseline is ever used (critique X20).
- `node ai-framework/scripts/setup-validator.mts` exit 0; `node ai-framework/scripts/graphify.mts --check` exit 0;
  `node ai-framework/scripts/workflow-doctor.mts` has no new fail.
- Scope fence:
  - `git diff --name-only 633adb3 -- . ':!.project' | wc -l` ≤ 15;
  - `git diff --name-only 633adb3 -- ai-framework/hooks .claude .opencode .codex | wc -l` = 0 (no hooks, plugin or
    wiring: those belong to A2);
  - `git diff 633adb3 -- ai-framework/hooks/scripts/metrics-lock.mts | wc -l` = 0.
- Coordination: `log.md` restates whether `token-attribution` S6 had exported the resolver. If it had, a followup
  line names "workflow-usage-capture calls the exported resolver". Otherwise the opaque-key note stands.
  `grep -cE "^Resolver status: (exported|opaque)$" .project/pitches/workflow-usage-state/log.md` = 1.
- Release at /ship: `node ai-framework/scripts/changelog.mts --bump minor --category Added ...` updates `CHANGELOG.md`
  and `VERSION`.

## Risks (inherited from pitch rabbit holes)

| Risk | Pitch owner → plan scope | Spike needed? | Mitigation |
|------|--------------------------|---------------|------------|
| New tests worsen the lease-port flake (about 1 in 12) | state scope → S1, S3-S6, S9 | yes (S1 baseline) | `memoryLease` injects `deps.net.tryListen`; pure `applyEvent` preferred; grep exits prove no new real-port test; one baseline counted at S9 |
| Pinned report tests and the v2 fixture site | state scope → S2, S7 | no | Constant, emitter, refusal guard, migrator and fixtures in one commit (S2), full suite before done; S7 owns the computed status. The impact scan already showed only `:82` flips |
| Stable key export shared with `token-attribution` and part B | after `token-attribution` S6 → S3, S9 | no | Key accepted as opaque validated labels (`SAFE` pitch/phase, `^S\d{1,3}$` scope); no import from `token-consumption.mts` (grep exit); status recorded at S9 |
| `captureDropped` cannot be written by the dropped event, because the lease is what failed (new, claim 5) | → S1, S6 | yes (S1 decision) | Default bounded marker file consumed under the next lease; fallback `indirect-only`; the owner decides at the S1 gate |
| Interval memory is not bounded by the pending cap (new, claim 3) | → S1, S4 | yes (S1 sets the cap) | Own record cap with frontier clipping; lower bound, counted in `clippedIntervals`; burst test |
| Phase segments would zero out wait if counted as active (new, claim 4) | → S4, S8 | no | Active is agent intervals only; documented; property test |
| Label-free activity identity changes the documented lifecycle contract and one existing test | critique S7/S8 → S3, S8 | no | Deliberate; logged in `deviations.md`; K3 unmatchable rule kept; doc line replaced in S8 |
| Fingerprint drift turns pre-upgrade replays into "conflicting" (new, claim 8) | → S3 | no | `(none)` scope left out of the fingerprint; frozen-recipe test |
| State exceeds 4 MiB with every cap filled | no-go → S5 | no | Full-cap size test, measured size logged; epoch-ms integers in records |
| Ancestor swap during the async lease while migrating or consuming the marker | knowledge → S2, S6 | no | Reuse `guardedMetricsDeps`; injected-`tryListen` swap test (existing pattern at state test `:66`) |
| Old v1 writers corrupt a v2 file | knowledge → S2 | no | Base-ref proof: v1 refuses `schemaVersion !== 1` and never overwrites; no long-running importer exists at base |
| LRU fold diverges from `token-attribution` S7, so part B cannot join | cross-pitch X3 → S1, S5 | no | S1 records whether its fold rule is final; same cap of 50 and the same "skip routed rows" rule; re-check at part B shaping |
| `state-deep-evidence` and part B count audit, revise or ship from records | cross-pitch X2 → S5 | no | Only event-derived `transitions` here; never `gate.decided` (grep exit) |

### Rules folded into exit criteria
- `ai-framework/rules/testing.md`:
  - Event units: a start is never a completion. Turns and finishes are counted separately (S3, S4).
  - Mutant proofs in every code scope (S2-S7).
  - macOS tmpdir: the existing `tempFixture` keeps the alias. No new path-equality assertion is made on a resolved
    path.
- `ai-framework/rules/security.md`:
  - Bounded string lengths and specific validators on every label and id (S3 scope pattern; sessions hashed).
  - Fixed error text only (S2, S6).
  - Bound input before any regex: the existing `SAFE` length check comes first.
- `ai-framework/rules/data-modeling.md`: lossless projection. The migration is append-only, with byte and object
  round-trip proofs (S2).
- `ai-framework/rules/machine-data-format.md`: the state, records and marker are script-read only, so they stay JSON
  or raw bytes. No `.toon` goes under `.project/metrics`.
- `ai-framework/rules/performance.md`: no unbounded collection. Every new map and array has a cap and a test (S4, S5).
- `ai-framework/rules/observability.md`: no paths or values in stderr; `--best-effort` semantics are unchanged.
- `ai-framework/rules/canonical-mirror-sync.md`: not triggered, because no skill, agent or hook wiring file is edited
  (S9 fence).
- `.project/rules/`: only `README.md`. No stack-specific companion applies.

## Parallel dispatch plan

1. **S1** is dispatched (`fast`). It writes only `spike-s1.md`, then comes the **S1 gate**. On a harness without
   nested dispatch, run it on the main thread.
2. **S2** runs on the main thread: one commit and the full suite.
3. **S3 → S4** run on the main thread in strict sequence: they share the state module and its test.
4. **S5** is dispatched (`standard`) after S4 closes, alone; nothing else edits the state files while it runs.
5. **S6** is dispatched (`standard`) after S5 closes, alone.
6. **S7** is dispatched (`standard`):
   - It can start any time after S2. Its files (`workflow-metrics-report.*`) are disjoint from S3-S6.
   - It runs in parallel with S3-S6 **only in an isolated worktree**, because the harness forbids parallel writers in
     one worktree. Otherwise it runs after S6.
   - Its report-test `scenario()` uses matching start and finish labels, so the S3 identity change does not move its
     numbers. Re-run `T WM` after merging.
7. **S8** is dispatched (`fast`) after S6, in parallel with S7 when S7 runs late (disjoint files).
8. **S9** runs on the main thread last.

## Pitch claims checked against the code

1. **"Activity key includes `session_id` and `agent_id`."** This is already true: `activityKey` (`:110`) hashes
   `sessionId` and `activityId`. The real defect is that it **also** hashes pitch and phase, so a label change between
   start and finish loses the match (critique S8). v2 drops the labels from the key and stores them on the pending
   entry (S3).
2. **"Eviction by oldest `startedAt`, not insertion order."** Confirmed: `:142` deletes `Object.keys(state.pending)[0]`.
   Ties must keep insertion order, or the existing test at `:170-176` (65 starts at the same instant) breaks.
3. **"Memory bounded by the pending cap."** False. Closed intervals after the earliest pending start can be many
   disjoint turns, whatever the pending count. The plan needs its own record cap, with frontier clipping as a counted
   lower bound (S4).
4. **"Active = union of agent and phase intervals" with "wait = gap not covered by active."** These contradict each
   other: phase segments span every gap between turns, so wait would always be 0. Active is agent intervals only, and
   phases keep `elapsedMs` (S4).
5. **"A lease-busy event increments `capture.dropped`."** The dropped event cannot write the state, because the lease
   is exactly what failed. This needs an out-of-lease channel or indirect visibility (S1 decision, S6).
6. **"Pinned tests `:56,67,82` change."** Only `:82` flips (it has a `native` event, so `observed`). `:56` and `:67`
   are a manual-only scenario and stay `unconfigured`. The literal appears five times in `workflow-metrics-report.mts`
   (`:11,75,85,102,106`) and once in the doc (`:84`).
7. **The real refusal fixture** is `workflow-metrics-state.test.mts:222` `{ ...valid, schemaVersion: 2 }`. It becomes
   **valid** after the bump, and was not named in the pitch.
8. **Adding `scope` to `UsageEvent` changes every replay fingerprint** (`:131` hashes the whole event). A pre-upgrade
   replay inside the 512-key window would turn from `duplicate event` into `conflicting event identifier`. Fix:
   leave `(none)` out of the fingerprint (S3).
9. **New health counters cannot be added to `health`** (`keysAre` is exact at `:209`) without breaking the
   token-edit-and-append migration. They live in `usage.health`.
10. **A 6 h TTL on all pending entries** would evict legitimately long phase segments. The TTL applies to `agent.*`
    pending entries only, the ones that hold the fold point.
11. **"`workflow-metrics.test.mts` may need a v2 fixture."** It does not: every CLI test starts empty, and
    `blankState` writes v2. The file stays untouched unless S2 finds otherwise.
12. **No other reader exists.** `state-snapshot.mts` reads only `token-consumption.json` (`:342`). `state-pages.mts`
    only links the HTML (`:122`). Doctor, bundle-sync and setup-validator have no reference.
13. **LOC is about 1,190, not about 800.** Tests are about 57% of it. The file count is 7 to 9, not 7. Both stay
    within the big-batch cap.
14. **The existing conservation test (`:178-193`) stays green** under the LRU fold only if a fold is counted as
    `pitchFolds`, not as `overflowEvents`.
15. **A primary re-start after a dropped `Stop`** would be refused today (`activity already started`,
    `written: false`), which loses the new turn. v2 supersedes the open primary turn (counted) and keeps the refusal
    for phases.

## Wireframes (UI scopes only, light)

Not applicable: no UI scope. The S7 report changes are generated Markdown/HTML text, verified by content tests in all
three formats.

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)
