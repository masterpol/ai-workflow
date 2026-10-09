# Pitch: workflow-usage-metrics

**Date**: 2026-10-08 • **Appetite**: big-batch (core; capture/adoption are dependent pitches)
**Stack**: portable workflow tooling

## Problem

Project owners cannot see which pitches, phases, skills, vendors and agents receive work, where work repeats, or whether collection works. Current totals mix messages with subagent runs, miss primary sessions, and show $0 without positively priced records.

At 2026-10-08T13:02:44.083Z this checkout reported 1,135 completions; 1,008 lacked tokens. These are collected events, not complete activity. Collection continues.

## Knowledge consulted

- `token-metrics-dimensions-design`: preserve totals; define units and missing usage.
- `reversible-aggregates-store-their-routing`: preserve reversal routing; never invent history.
- `async-agent-launch-hook-counted-as-completion`: distinguish launches from completions.
- `collector-metrics-lease-design`: serialize shared writers; telemetry stays best-effort.
- `project-state-report-design` and `allow-list-untrusted-labels-at-ingest-and-at-render`: evidence/status for claims; validate labels at both boundaries.
- Standing tooling no-gos apply. No relevant stack companion exists under `.project/rules/`; harness and model-routing rules apply.

## Solution sketch

**Places:** local collector, bounded state, JSON/Markdown/HTML reports; later native adapters and project integration.

**Connection:** explicit actions and supported native events feed a deduplicated contract and bounded aggregates. Unknown attribution stays unknown, never inferred from the latest active pitch.

Reports show:
- Project identity/version, sessions, primary/subagent activity, vendor, provider/model, agent role, phase and skill.
- Per-pitch starts, completions, gates, revisions, audits, ships, failures and cancellations; bounded daily trends with separate units.
- Observed elapsed duration from matching starts/ends. Open/paused work is distinct; no execution-time estimates.
- Source, last event, collection start, missing fields, unattributed activity and adapter verification. No coverage percentage without a denominator.
- Retain only useful usage and collection-health metrics. Exclude token/cost fields, resource totals and current-versus-previous completion comparisons from new state and reports.

**Delivery:**
1. Core: useful event schema/writer, retention/deduplication and activity reports. Do not import legacy token data; leave historical files untouched. Verify headlines against aggregates and transition fixtures.
2. Capture: separately shape explicit lifecycle instrumentation and Claude/Codex/OpenCode/Cursor adapters, including mirrors and retirement of automatic token collection. Require live proof or explicit unverified status. Represent primary activity where supported.
3. Adoption: separately shape `/state`, setup/doctor, bundle-sync and rollout. Data stays local. Optional comparison takes explicitly supplied roots. Existing application updates require their own repository scope.

Full reform requires capture and adoption, not just core fixtures.

## Rabbit holes

Resolved: missing historical usage cannot be reconstructed; no transcript fallback.

Planner owns event identity/timestamps, reversal/retention, migration/recovery and file count. Shared writes use the existing lease. Test concurrent collectors, hostile persisted snapshots, symlinks, FIFOs and unsupported schemas; never initialize over refused state. Split above 15 files / 1,500 LOC. Adapter contracts belong to capture.

## No-gos

No prompts/responses/arguments, history deletion, unlimited journals, billing reconciliation, savings estimates, central upload, background repository discovery, or automatic fleet rollout. Preserve Orca ledger/evidence and metrics-path guards; leave active implementations alone. Configuration and fixtures are not live coverage.

## Critique findings

- Knowledge-historian: evidence/status and unsafe labels; addressed above. Independently check report arithmetic.
- Skeptic: writer races and destructive recovery; addressed above. Canonical role rerun on available parent model after configured model failed.
- Appetite-auditor: estimated 14 files / 1,250 LOC, near cap; freeze one reporting path and split if exceeded.
- Cross-pitch-projector: core has no projected shared implementation files; Orca metrics namespace is adjacent. Preserve guards; recheck overlaps for dependent pitches.

## Bet decision

**Bet approved by user on 2026-10-08.** Proceed to core planning. Capture and adoption remain dependent pitches with their own gates.

## Revisions

| Date | Trigger | What changed |
|------|---------|--------------|
| 2026-10-08 | User: “just useful metrics should be preserved” | Narrowed new state/reports to useful usage, outcomes, elapsed duration and collection health. Removed token/cost data, legacy imports and cost-display repair; historical files remain untouched. Three planned scopes replace four. |
