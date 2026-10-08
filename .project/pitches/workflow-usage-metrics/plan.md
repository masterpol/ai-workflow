# Plan: workflow-usage-metrics

**Pitch:** pitch.md • **Appetite:** big-batch • **Hill:** hill.md
**State:** revised plan and impact approved; S1 verified and approved by user on 2026-10-08. S2 approved by “next”; S3 verified. All core scopes done; audit passed in three cycles; awaiting approval to ship. Big-batch phase gates remain in force.

**Revision:** retain only useful workflow usage data. Remove token/cost fields, resource reports, legacy import/comparison and legacy cost-display correction from this core. Existing historical files remain untouched; retiring their automatic collectors belongs to the capture migration.

## Contract decisions

Add `.project/metrics/workflow-usage.json` schema v1 plus generated `workflow-usage.md` and `.html`. New state stores useful activity, outcomes, attribution, trends, observed duration and collection health only. The report does not read or import legacy token state. Existing legacy files are neither copied into the new state nor deleted. New metrics count from their collection start; no historical backfill.

Generate a local project UUID at first event and store a safe display label, not an absolute path or Git remote. Cloned metrics retain that ID and reports state this limitation; adoption may add an explicit re-identification command. Resolve installed workflow version from the guarded `.project/.bundle-sync.json` sourceVersion marker; a root `VERSION` is only a labeled stale/unpacked fallback, consistent with `/state`. A caller's event version remains declared provenance, never proof of installation.

### Event input

`recordWorkflowEvent(input: unknown, root: string, deps: RuntimeDeps)` accepts an explicit allow-listed contract, never arbitrary raw hook payloads:

- Required: `eventId` (bounded opaque ID), `kind`, `vendor`, `source` (`manual`, `workflow`, `native`). `occurredAt` is optional and defaults to the injected clock; supplied values must be canonical UTC timestamps, no more than five minutes in the future. Store collection time separately.
- Kinds: `session.started`, `agent.started`, `agent.finished`, `phase.started`, `phase.paused`, `phase.resumed`, `phase.finished`, `skill.used`, `gate.decided`, `pitch.started`, `pitch.finished`, `audit.finished`.
- Optional identifier labels: `pitch`, `phase`, `skill`, `provider`, `model`, `role`, `workflowVersion`; opaque `sessionId`, `activityId`; `agentKind` (`primary`, `subagent`, `unknown`). Missing attribution gets an explicit unknown bucket.
- `agent.finished`, `phase.finished`, `pitch.finished`, `audit.finished` require `outcome` (`completed`, `failed`, `cancelled`). Gate decisions are `approve`, `revise`, `back`, `stop`. Audit completion may carry bounded integer `mustFixCount`. Count revisions and audit cycles from explicit events, never parse chat or infer a ship from phase completion. Only a completed `pitch.finished` is a ship.
- Session starts require `sessionId`; agent/phase lifecycle events require `activityId`. Match activities by kind family, vendor, session, activity and explicit pitch/phase. Phase resumes/pauses update known activities; missing starts remain unmatched. No attribution from `status.md`.
- Numeric fields are limited to observed timestamps and bounded integer outcome counts such as `mustFixCount`. Do not persist input/output/reasoning/cache tokens, cost, billing, execution estimates or savings. Elapsed duration is derived only from matching lifecycle events.
- Unknown fields are discarded before persistence. Invalid required fields reject the event without modifying state. Source is caller-declared provenance, not evidence of a verified adapter.

### Aggregation and limits

Use prototype-free maps. Cap labels at 80 ASCII identifier characters; opaque IDs at 128 characters. Reject unsafe identifiers into a displayed `other` bucket without copying free text. Rendering independently validates all persisted labels and dates.

Persist lifetime counts by kind/outcome and vendor, plus bounded vendor-scoped model/role/skill/phase dimensions, daily and pitch summaries. Count agent finishes, session starts, skills, audits and ships separately. Do not introduce message counts without a corresponding verified event type. Do not headline a cross-vendor completion ranking. Missing dimensions and overflow are visible.

- 512 recent event keys, including fingerprints: identical replay skips; a conflicting recent ID rejects. Deduplication beyond that window is unavailable and documented.
- 30 UTC daily buckets; older accepted events affect lifetime totals only. Display the actual retained interval; late arrivals never evict a newer day.
- 50 named pitch summaries, plus unknown/overflow buckets. 8 named vendors and 32 named entries per vendor/dimension, plus explicit overflow. Totals remain conserved after overflow.
- 64 pending activities. Completion/failed/cancelled removes a matched activity; no fabricated duration for missing or evicted starts. Paused activities remain visibly paused. Report elapsed start-to-finish time, including pauses and human wait; do not call it active work or productivity.
- Event stdin: 16 KiB; each source state: 4 MiB; generated reports: 4 MiB. Serialization checks these ceilings before commit. No event journal or historical transcript read.

Snapshot readers return `missing`, `valid`, or `refused` with a bounded reason. Refuse corrupt, unsupported, oversized, symlinked and non-regular state without replacement. No automatic reset, repair or deletion.

All workflow state/report writes hold the existing `withLease(metricsDirectory, ...)` protocol, use the same real directory and respect `.token-consumption.lock`. Validate root containment and destinations before creating/writing; use exclusive temporary files, rename and cleanup. Persist state first; report failure leaves valid state and returns an explicit warning. Multi-file report generation is not an atomic transaction: display source timestamps so stale views are identifiable.

### CLI and reporting

`node ai-framework/scripts/workflow-metrics.mts record --root <project>` reads one structured usage event from stdin. Manual invalid input/refusal exits nonzero with fixed, bounded error output. An explicit `--best-effort` mode returns zero for future observational adapters, while reporting a skip/warning; no automatic hook wiring in this pitch.

`node ai-framework/scripts/workflow-metrics.mts report --root <project> [--format json|markdown|html]` regenerates views from existing safe state, emits the selected view, and does not initialize empty event state. Missing workflow events produce an honest empty-state report with collection status and instructions for recording supported events. It never records a report invocation as usage.

Reports include source paths/timestamps and observed/stale/unavailable/unconfigured states. Stale means more than seven days since last event, not an assumption that collection is broken. They show activity/outcomes, daily trends, pitches, phases, skills, vendors/provider/models/roles, pending activities, unmatched durations, overflow and attribution gaps. Configured, declared native and actually verified adapters are different concepts; core declares automatic workflow capture unconfigured.

Exclude current-versus-previous completion comparisons, vendor winners, resource totals, opaque IDs and raw events from user reports. Retain bounded event keys and pending identifiers only as internal deduplication/lifecycle bookkeeping. Unknown model/role labels become attribution-gap counts, not ranked usage entries.

## Scopes

Paths below are under `ai-framework/` unless explicitly stated. Estimates include behavior tests; total approximately 1,160 changed lines, 10 delivery files. Required pitch/status/evidence records are tracked separately, as in existing phase plans. Stop and split before exceeding 15 delivery files or 1,500 changed lines.

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | Useful event state, safe writer and record CLI | `scripts/workflow-metrics-state.mts`, `scripts/workflow-metrics-state.test.mts`, `scripts/workflow-metrics.mts`, `scripts/workflow-metrics.test.mts` | 600 | — | — | no: coupled contract and write safety; own sequentially | — |
| S2 | Useful activity reports | `scripts/workflow-metrics-report.mts`, `scripts/workflow-metrics-report.test.mts`; extend S1 CLI/tests | 360 | S1 | — | no: shared CLI ownership and schema; own sequentially | — |
| S3 | Contract docs and final compatibility | `integrations/workflow-metrics.md`, `docs/token-consumption.md`, root `VERSION`, root `CHANGELOG.md` | 200 | S1, S2 | — | no: reconciliation and serialized version ownership | — |

S1 ships a usable record API/CLI; S2 adds useful reports against that stable contract. S3 documents the complete core and the separately gated capture migration.

## Exit criteria

### S1

`node --test ai-framework/scripts/workflow-metrics-state.test.mts ai-framework/scripts/workflow-metrics.test.mts` and `bun test` with the same files must exit 0.

Behavior assertions: kinds/required fields/unknown labels; session starts and primary/subagent distinction; deterministic clock; exact dedup/conflict behavior; replay beyond documented window; retained days/pitches/dimensions; overflow conservation; outcomes/gates/audits/ships; matching, pause/resume and unmatched/evicted starts; byte bounds; no secret marker, token, cost or arbitrary numeric field storage; refused state byte-for-byte preserved; explicit legacy-lock skip; simultaneous old/new collector processes using the same endpoint; cleanup and lease release after failure. CLI exits must match manual and best-effort modes.

### S2

`node --test ai-framework/scripts/workflow-metrics-report.test.mts ai-framework/scripts/workflow-metrics.test.mts` and equivalent `bun test` must exit 0.

Fixture: two vendors, two pitches, primary and subagent work, phase pause/resume, approved and revised gates, two audit outcomes, one ship, one failure, unknown model/role attribution and an unmatched finish. Assert independently calculated headlines and JSON/Markdown/HTML agreement. Exercise the actual CLI with hostile persisted snapshots and labels, empty/missing state, unknown schemas, unsafe destinations and stale timestamps. Assert report-only mode never increments counts, reads legacy state or modifies legacy files. Payloads containing tokens/cost/free-text markers must leave none of those fields in JSON, Markdown or HTML. Report failures must preserve event state; no report claims live adapter coverage.

### S3

- Run both runtimes across all three new tests and existing collector/plugin/lease test files; exit 0.
- `node --test ai-framework/scripts/docs-links.test.mts` exits 0.
- `node ai-framework/scripts/setup-validator.mts` exits 0.
- `node ai-framework/scripts/graphify.mts --check` exits 0 after necessary graph refresh at ship.
- CLI smoke in an isolated initialized project: record fixture events, generate all formats, compare totals, rerun report with no changes, and verify legacy JSON checksum unchanged. Label this CLI proof, not native capture proof.
- Record the structural change through the changelog skill at build completion, coordinated with concurrent version edits; no version bump during planning.

No application build/typecheck/lint exists here. HTML is an inert report generated by the CLI; its behavior and safety are covered by renderer/CLI tests rather than an invented build command.

## Impact analysis

Risk: **medium**, concentrated in local state integrity and report truthfulness. Direct delivery: 3 modified files (token docs and two version files), 7 new files: 10 total. No package dependency or runtime-adapter edits.

| Existing surface | Consumers / evidence | Required compatibility |
|------------------|----------------------|------------------------|
| `token-consumption.mts` (unchanged) | Claude settings, Codex hooks, OpenCode plugin; plugin and collector tests | No edits during core. Capture migration will replace automatic token collection with useful usage capture and document retirement |
| `metrics-lock.mts` (unchanged) | Existing collector and lock tests; new writer | Same directory endpoint and legacy-lock policy; no nested lease acquisition |
| Legacy metrics files (not read) | Existing `/state` reader and collectors | No modification, import or deletion. `/state` replacement is separately gated adoption work |
| Runtime deps (unchanged) | Current Node/Bun adapters, concurrently changed by runtime-helper work | Use existing injected interfaces; no test-helper/API changes required |
| Metrics namespace | Orca reconcile ledger/evidence and apply exclusion guards | New filenames only; no ledger/evidence access or weakening of exclusions |
| Version log | Concurrent Orca/runtime work | Serialize final changelog entry against the current version |

Boundary checks: state module contains validation/aggregation/storage and depends on injected runtime plus existing lease; report module depends on explicit safe data, not project executables; CLI composes both with `runDirect`. No application imports or dynamic code from an analyzed root.

Applicable constraints: security rules require guarded reads, bounded input, path containment, exclusive atomic writes, fixed errors and reader/writer distinction. Testing rules require state-transition, failure and hostile-input behavior checks. Existing knowledge requires explicit provenance, independent arithmetic verification and matching launch/finish semantics. Retain these as exit criteria, not reviewer-only checklists.

## Risks and mitigations

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| Lifecycle contract exceeds appetite | S1/S2 | yes, within S1 | Freeze listed kinds; measure changed LOC after S1; split before adding capture |
| Dedup/retention misrepresents totals | S1/S2 | no | Publish windows; conserve lifetime/overflow totals; test late events |
| Corrupt/refused state becomes empty | S1 | no | Explicit refusal result; preserve bytes; never auto-reset |
| Concurrent writers / unavailable loopback lease | S1 | yes, process tests | Reuse endpoint; skip boundedly; no fabricated loss percentage |
| Reports lag persisted state | S2 | no | State-first commit; source timestamps; explicit warning and regeneration |
| Missing native lifecycle data | S2/S3 | no | Show unconfigured/attribution gaps; no legacy backfill or fabricated activity |
| Concurrent work expands scope | S3 | no | Keep dirty files outside ownership; recheck version and runtime interfaces |

## Parallel dispatch

S1, S2 and S3 run sequentially. No worker dispatch is needed: report integration shares CLI ownership, and legacy renderer edits have been removed. Preserve concurrent runtime and Orca edits.

## Report sketch

```text
Workflow usage — project / workflow version / source timestamps
Collection status and missing attribution
Session starts | primary finishes | subagent finishes | skills | ships
Daily activity and outcomes (last 30 UTC days)
Pitch / phase summaries; paused and unmatched activities
Vendor / provider / model / role / skill tables with units
Evidence sources, retention/overflow and unverified capture
```

## Living-spec deviations

2026-10-08 — User requested that only useful metrics be preserved. Removed resource fields, legacy fallback/import, comparison tables and cost-repair scope. Useful usage and collection health remain. Historical files stay untouched; core does not authorize transcript access, native adapter wiring, historical deletion or application rollout.

## Confirmation

**Approved by user on 2026-10-08.** Impact acknowledged, plan finalized, core build start authorized. Dependent capture/adoption phases remain separately gated.
