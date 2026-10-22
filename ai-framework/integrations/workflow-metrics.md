# Workflow usage metrics

The workflow usage collector records useful activity within one initialized project. It stores
session starts, primary/subagent finishes, skill use, phase and pitch activity, gate decisions,
audit outcomes and successful pitch completions (ships). Reports group these by vendor, pitch,
UTC day, provider/model, role, skill and phase. Missing attribution and collection limits remain
visible. Counts describe recorded events, not all work performed in the project.

## Record and report

Run these commands from the installed project's root. Node 22.18+ runs `.mts` directly; on
Node 22.12–22.17 add `--experimental-strip-types --disable-warning=ExperimentalWarning`.
You can also invoke the same script with Bun.

```sh
node ai-framework/scripts/workflow-metrics.mts record --root . <<'JSON'
{"eventId":"example-build-use-1","kind":"skill.used","vendor":"codex","source":"manual","pitch":"example-pitch","phase":"build","skill":"build"}
JSON
node ai-framework/scripts/workflow-metrics.mts report --root . --format markdown
```

Use a new event ID for each actual occurrence; the example is a manual record, not automatic
capture. `record` accepts one JSON object on stdin. `report` accepts `json`, `markdown` (default)
or `html`, emits the selected format on stdout and regenerates both local report views.
Generating reports never records usage or initializes an empty event snapshot.

All files live under the target project's Git-ignored `.project/metrics/`:

| File | Purpose |
|------|---------|
| `workflow-usage.json` | Schema 2 event aggregates, time and flow state, and bounded internal bookkeeping |
| `workflow-usage.dropped` | Transient: one byte per capture that could not take the lease, removed when the next event is recorded |
| `workflow-usage.md` | Generated readable report |
| `workflow-usage.html` | Generated static browser report, without scripts or external assets |

The workflow-only JSON report omits project UUIDs, replay hashes and pending activity identifiers.
Its generator neither imports nor modifies `token-consumption.*` files. Usage starts at the
first accepted event; there is no historical backfill. The state is schema 2. A file written by
an earlier version (`schemaVersion` 1) is migrated by editing the version token and appending the `usage` block on
the next recorded event. A report reads it in memory only and never rewrites it, and shows time
and flow as "not yet counting" until that migration.

## Event contract

Required fields are `eventId`, `kind`, nonempty `vendor`, and `source` (`manual`, `workflow` or
`native`). `occurredAt` defaults to collection time; supplied timestamps must be canonical UTC
ISO strings, such as `2026-10-08T12:00:00.000Z`, no more than five minutes in the future.

| Kind | Additional required fields | Meaning |
|------|----------------------------|---------|
| `session.started` | `sessionId` | One explicitly recorded session start |
| `agent.started`, `agent.finished` | `activityId`; finishes also need `outcome` | Agent lifecycle |
| `phase.started`, `phase.paused`, `phase.resumed`, `phase.finished` | `activityId`; finishes also need `outcome` | Phase lifecycle |
| `skill.used` | None | One declared skill use |
| `gate.decided` | `decision` | One explicit gate decision |
| `pitch.started`, `pitch.finished` | Finishes need `outcome` | Pitch lifecycle; completed finish counts as a ship |
| `audit.finished` | `outcome` | One audit cycle |

Outcomes are `completed`, `failed` or `cancelled`; decisions are `approve`, `revise`, `back` or
`stop`. Optional labels are `pitch`, `phase`, `skill`, `provider`, `model`, `role` and
`workflowVersion`, plus `scope`, which is absent (shown as `(none)`) or a short label such as `S3`
(`S` and one to three digits); any other scope is stored as overflow and never matches.
`agentKind` is `primary`, `subagent` or `unknown`. An audit may supply integer `mustFixCount` from
zero through 1,000,000.

A start and its finish are matched by event family (agent or phase), vendor, `sessionId` and `activityId` only.
Labels are fixed at the start: a finish is attributed to the pitch and phase of its start.
A phase change in the middle of a turn therefore never moves the interval. A finish with no matching start is counted as unmatched
and adds no duration. Invalid vendor, pitch, phase or scope labels prevent matching; their events
still count, but finishes remain unmatched. A second start for the same primary turn replaces the
open one without a duration (counted as a superseded turn); a second start for a phase or
subagent is refused as already started. Combined provider/model labels exceeding 80 characters enter the
overflow bucket and count as model-attribution gaps.

Opaque event/session/activity identifiers have a maximum length of 128 characters. Labels
have a maximum of 80 ASCII identifier characters (letters, digits, `_ . : / @ + -`); invalid
labels enter an explicit overflow bucket and absent labels enter an unknown bucket. Unknown
input fields are discarded. No tokens, cost, savings, execution estimates, prompts, transcripts
or raw hook payloads are stored. Library callers use `recordWorkflowEvent(input, root, deps)`
from `workflow-metrics-state.mts`, with injected `RuntimeDeps`.

## Reading the evidence

Agent finishes, session starts, skills, phase finishes, audits and ships have separate units.
Combined terminal outcomes count finish events across agents, phases, pitches and audits;
they are not unique tasks. Unknown model/role attribution appears as gaps rather than ranked
entries. A successful phase does not imply a shipped pitch. Early snapshots without the ship
counter show unavailable historical ships when prior pitch finishes cannot be reconstructed.

Elapsed time exists only for matching agent/phase starts and finishes. It includes pauses and
human wait. Summed intervals may overlap, so they are not active work time or productivity.
Pending, paused, unmatched and evicted activity counts explain incomplete evidence.

### Time and flow

The `usage` block adds two measures that are exact unions, not sums:

- **Active time** is the measure of the union of matched agent intervals: primary turns and
  subagents. Phase segments are not active time, because they span the gaps between turns; they
  keep only their `elapsedMs`.
- **Wait time** is elapsed between turns, not necessarily think-time. In one session it runs from
  a completed primary finish to that session's next primary start, capped at eight hours (time
  over the cap counts in `gapsOverCap`). Only the part not covered by active time at the same level
  counts, so a subagent running inside a gap reduces the wait by exactly that part.

Each interval or measured gap is credited to the total, its pitch, its pitch and phase, and its
pitch, phase and scope. Counters are `turnsStarted`, `turnsFinished`, `gapsMeasured`,
`gapsUnmeasured` and `gapsOverCap`. A gap is unmeasured when the clock sources differ (the
collector clock against a caller-supplied time), when the next prompt is earlier than the Stop, when
a turn was still open, or when its session was evicted. A cancelled or failed finish opens no gap.
An agent interval whose start and finish use different clocks keeps its `elapsedMs` but adds no
active time (`mixedClockIntervals`).

Time is folded as soon as nothing pending can overlap it. Closed intervals wait in a bounded list
until then. If the list fills, the fold is forced forward and the lost part is counted as clipped
(`clippedIntervals`), so active and wait stay a lower bound and are never inflated. Dropped
captures that never reached the lease are counted from the marker file the same way: a lower
bound, because the marker holds at most 4,096 bytes.

Phase order is recorded per pitch without any text: each phase start is classified against the
previous one as `repeat`, `forward`, `back` or `other` by the pipeline order (shape, critique,
plan, build, audit, ship), with the newest 32 starts kept as a short trace. No gate decision is
inferred from it.

### Hook-to-event mapping (planned)

Written by `workflow-usage-capture`; not wired by this core. The state accepts these events from
any caller today.

| Hook | Event | Notes |
|------|-------|-------|
| `SessionStart` | `session.started` | Opens a session |
| `UserPromptSubmit` | `agent.started`, `agentKind: primary` | One turn; never a completion |
| `Stop` | `agent.finished`, `outcome: completed` | Closes the turn and opens a wait gap |
| `SubagentStop` | `agent.finished`, `agentKind: subagent` | Matches an earlier subagent start |
| `SessionEnd` | `agent.finished`, `outcome: cancelled` | Closes an open turn without a gap |
| Phase start | `phase.started` | Carries the pitch, phase and scope labels |

Native capture uses `segment:<sessionId>` as the phase activity identity. A new native phase start on that identity
closes the previous segment as completed and opens its replacement in the same leased write. The derived phase
finish has a deterministic identifier, credits the old segment's labels and elapsed time, and never counts an
agent completion or active time. Replaying the incoming event does not repeat the close; a start earlier than the
open segment's last event is refused. Manual phase lifecycles retain their existing explicit finish requirement.

A native agent start with no pitch, phase or scope inherits those labels from its vendor/session's canonical open
segment. Explicit labels take precedence. A turn submitted before phase expansion retains the preceding segment's
labels; an initial turn without a segment stays unknown. Finishes preserve their start's labels, including scope,
when the phase changes mid-turn. The resolver's `(unattributed)` pitch and `(none)` scope are accepted explicitly;
arbitrary parenthesized labels still fold into the non-matchable other bucket. These are extensions of the accepted
values within schema 2; no persisted fields or lease behavior change.

Collection is `observed`, `stale` (more than seven days since the last recorded event) or
`unavailable`. Staleness does not prove collection failure. Automatic capture is computed from the
last event whose source was declared `native`: `unconfigured` when there is none, `observed` within
seven days, `stale` after that. Source labels are caller declarations; even a `native` event does
not verify an adapter, and this core wires no capture. Native hook migration, `/state` adoption and rollout into other projects are separate
work. Installed workflow version uses guarded `.project/.bundle-sync.json` source-version
evidence; root `VERSION` is only an explicitly unverified fallback. A first event creates a
local project UUID and safe display label; copying metrics into another project retains that
identity and is not a supported way to begin independent collection.

## Bounds and failures

The collector retains 512 recent event keys/fingerprints, 30 UTC daily buckets, 50 named
pitches, eight named vendors, 32 named labels per vendor/dimension, and 64 pending activities.
Time and flow add: 16 phases per pitch, 25 scopes per phase and 600 scope rows in total (extra
phases and scopes go to an overflow row), 32 sessions, a trace of 32 phase starts per pitch, and
256 closed intervals awaiting a fold. The least recently used pitch folds into the overflow pitch
when a 51st arrives, in both stores at once, unless a pending activity, open interval or session
still points to it; a fold is counted as `pitchFolds`, not as overflow. A pending agent activity
older than six hours is evicted (`pendingEvictions`); phase activities are evicted only by the
pending cap, oldest start first. The state, with every cap full, measures about 1 MB.
Overflow preserves aggregate totals; older events affect lifetime totals without evicting newer
days. Replay protection applies only inside the recent-key window; older replays can count again.
Input is capped at 16 KiB and each snapshot/report at 4 MiB. There is no raw event journal.

Writers share the existing loopback metrics lease and respect `.token-consumption.lock`.
Directory identities are pinned before lease acquisition and rechecked before filesystem
effects; ancestor replacement during the asynchronous wait is refused. Concurrent first
writers accept an existing directory only after checking that it is safe.
Unsafe directories, symlinks, non-regular files, corrupt or unsupported snapshots are refused
without reset or replacement. Writes use exclusive temporary files and atomic rename. Both
report destinations are checked first, but the two report writes are not one atomic transaction:
a failure may leave views from different generations. Source and generation timestamps identify
them; regenerate reports after resolving the failure. Report failures preserve event state.

Manual failures and duplicate records exit nonzero with fixed messages. `--best-effort` returns
zero for observational callers while still printing the skip/failure; inspect the receipt instead
of treating exit zero as evidence that an event was saved. No automatic repair or deletion occurs.

See also: [legacy token collector](../docs/token-consumption.md).

## Joined token/time report

`flow-report.mts` reads token schema 3 and usage schema 2 under one shared metrics lease.
It never records events, rewrites snapshots or reads transcripts. Rendering and publication happen
after releasing that lease; the optional `.project/reports/state.json` history is read separately.

```sh
node ai-framework/scripts/flow-report.mts --root .
node ai-framework/scripts/flow-report.mts --root . --format markdown
node ai-framework/scripts/flow-report.mts --root . --format html
node ai-framework/scripts/flow-report.mts --root . --apply
```

Default output is JSON on stdout. Preview creates no files or directories. `--apply` publishes all
three fixed `.project/metrics/flow-report.{json,md,html}` files and prints a publication summary;
it cannot be combined with `--format`. `/state` links the existing HTML only when its path is safe;
it never generates or refreshes this report. Node compatibility flags and Bun support match the commands above.

Rows join exact canonical pitch/phase/scope keys, including `(none)` for no scope. Unknown,
unattributed, overflow and noncanonical keys remain separate per source. One-sided rows, independent
store folds, omitted rows, capture health and unmatched/unjoinable counts stay visible. Token rollups
sum disjoint leaves once; timing uses stored union rows, never child sums or vendor copies.

Tokens are vendor-reported flow totals with completion/reporting coverage, not a normalized work unit.
Unreported tokens are null; partial reporting shows its known sum and coverage. Active and wait values
are settled milliseconds. Wait is a lower bound of elapsed time between turns, not necessarily
think-time; pending/buffered intervals make timing provisional without extrapolation. Sources show
their separate observation windows and freshness (stale after seven days). Effort, cache/output-input
ratios and time-efficiency metrics are unavailable because flow fields or comparable windows are absent.

History reuses schema-1 `state.json` facts by exact slug, preserving audit/revision availability and
stale/truncated evidence. Missing history is unavailable; no audit/pitch records are reparsed and no
history is backfilled. Missing, refused and unsupported sources have distinct fixed reasons, not zeros.
Each input and output is capped at 4 MiB. Token projection allows 51 pitch buckets, 16 phases, 26
scopes and 600 vendor leaves; usage respects its reader's 52/18 overflow-inclusive limits. Output
keeps 100 leaf rows plus ancestors in stable order, with omitted counts and separate full/displayed totals.

All formats carry an explicit generator marker and the same generation ID. HTML is standalone,
script-free and CSP-protected; wide tables have keyboard-focusable scroll regions. Apply preserves
unmarked files, symlinks and non-files. It uses exclusive staging, pinned directory identities,
destination reinspection and exclusive creation or verified replacement; cleanup touches only its files.
Publication is one file at a time, not an atomic set. Interrupted writes exit nonzero and identify known
published files; compare generation IDs and rerun after resolving the cause. A changed/foreign staging
directory is preserved. If `.flow-report.staging` remains, first establish that no apply is running and
inspect its ownership before removing it; the tool never deletes an unknown stage automatically.
Path-based operations still have a check-to-syscall race; these guards do not claim anchored OS isolation.

Successful previews (including unavailable-source reports) and complete applies exit 0; unsafe paths,
lease failures or refused/incomplete publication exit 1; invalid options exit 2. Errors do not echo raw
source values. No token, cost, productivity or historical savings estimates are generated.
