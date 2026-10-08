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
| `workflow-usage.json` | Schema-v1 event aggregates and bounded internal bookkeeping |
| `workflow-usage.md` | Generated readable report |
| `workflow-usage.html` | Generated static browser report, without scripts or external assets |

The public JSON report omits project UUIDs, replay hashes and pending activity identifiers.
Existing `token-consumption.*` files are neither imported nor modified. Usage starts at the
first accepted event; there is no historical backfill.

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
`workflowVersion`. `agentKind` is `primary`, `subagent` or `unknown`. An audit may supply integer
`mustFixCount` from zero through 1,000,000. Use the same optional `sessionId`, pitch and phase
attribution throughout an agent/phase lifecycle, along with its vendor and `activityId`.
Invalid vendor/pitch/phase labels prevent duration matching; their events still count, but
finishes remain unmatched. Combined provider/model labels exceeding 80 characters enter the
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

Collection is `observed`, `stale` (more than seven days since the last recorded event) or
`unavailable`. Staleness does not prove collection failure. **Automatic capture is unconfigured
by this core.** Source labels are caller declarations; even a `native` event does not verify an
adapter. Native hook migration, `/state` adoption and rollout into other projects are separate
work. Installed workflow version uses guarded `.project/.bundle-sync.json` source-version
evidence; root `VERSION` is only an explicitly unverified fallback. A first event creates a
local project UUID and safe display label; copying metrics into another project retains that
identity and is not a supported way to begin independent collection.

## Bounds and failures

The collector retains 512 recent event keys/fingerprints, 30 UTC daily buckets, 50 named
pitches, eight named vendors, 32 named labels per vendor/dimension, and 64 pending activities.
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
