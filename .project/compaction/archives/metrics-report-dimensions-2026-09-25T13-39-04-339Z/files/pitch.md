# Pitch: metrics-report-dimensions

**Date**: 2026-09-24  •  **Appetite**: big-batch (projected 10-13 files, cap 15)
**Stack**: backend (Node hook scripts, harness plugins, generated reports)

## Problem

The maintainer opens `.project/metrics/token-consumption.md` to learn how the workflow is actually being used, and cannot. It shows one vendor table and two numbers. It cannot say which model does the most work, which agents or skills get used, what reasoning effort runs use, or which vendor and model is used most. Those answers are not just hidden by the report: the snapshot never aggregates them, so no report change alone can fix this.

## Knowledge consulted

- [decisions/caveman-mode-is-default-everywhere] — the collector already stamps each record with the caveman `mode` from `modes.json`; that field is the precedent for adding a best-effort, nullable dimension without breaking dedup (`token-consumption.test.js` has a test for exactly that).
- [patterns/a-gate-must-not-trust-its-own-author] — the collector applies and reverses records (`applyRecord` with direction ±1) when a completion is upgraded or replayed. Every new aggregate must be reversible the same way, or a re-recorded completion double-counts.
- [issues/bare-prefix-match-crosses-entities] — identity is `vendor:identity`. New per-model, per-agent and per-skill keys must not collide across vendors (`opencode/gpt-5.6-terra` vs a Claude alias), so keys are namespaced by vendor, never matched by prefix.
- [patterns/resolve-config-only-from-trusted-root] — hook payload fields are external input. Model, agent and skill names become object keys, so they need a length bound and prototype-safe storage.
- `ai-framework/integrations/harnesses.md` (Token Consumption Collector section) — the documented invariant: stores "numeric usage, cost, identifiers, and model metadata: never prompts, responses, or transcripts", no per-run log files, at most 100 idempotency keys.
- `ai-framework/rules/observability.md` and `.project/rules/` — no metrics-specific rule exists; nothing further constrains this pitch.
- Existing data: `.project/metrics/token-consumption.json` holds 193 completions (86 claude, 3 codex, 104 opencode). Claude and Codex records carry null model and null agent type, and no usage. Only OpenCode reports a model.

## Solution sketch (breadboard, NOT wireframe)

**Places**:
- Collector: `ai-framework/hooks/scripts/token-consumption.js` (normalize, aggregate, persist).
- Report renderer: a new sibling module (working name `token-report.js`), split out of the collector so the collector stops owning three output formats.
- Harness feeders: `.opencode/plugins/token-consumption.js`, the Claude hook entries in `.claude/settings.json` (mirrored in `ai-framework/hooks/hooks.json`), `.codex/hooks.json`.
- Outputs: `.project/metrics/token-consumption.{json,md,html}` (Git-ignored, local).
- Docs: `harnesses.md` collector section, `CHANGELOG.md`/`VERSION`.

**Affordances per place**:
- Collector records two new optional fields per completion: `effort` (harness-reported reasoning effort, or null) and, from a separate skill-use event, a skill name. It keeps lifetime aggregates per dimension: `byVendor` (exists), `byModel`, `byAgent`, `byEffort`, `bySkill`. Each aggregate row holds completions, tokens, cost and availability counts, and keys are `vendor`-namespaced.
- Snapshot moves to `schemaVersion: 2`. The dimension aggregates carry a `since` timestamp, because the 193 existing completions cannot be back-filled (records are not retained).
- Renderer produces a "Usage" headline (most used vendor, most used model, each with the ranking basis stated), then tables by vendor, model, agent, skill and effort. Rows with no reported value show "Unreported", never a blank or zero. Top N rows per table plus an "other" row.
- Feeders: Claude adds a `Skill` PostToolUse hook that records only `tool_input.skill`, never `args`. OpenCode's plugin adds the skill tool event and the effort/variant field if the message exposes it. Codex changes only if its payload exposes any of the new fields; otherwise it stays "unavailable".

**Connections**: harness event → `normalizedEvent` (allow-listed fields only) → `recordEvent` under the existing lock → `applyRecord` updates all aggregates → atomic write of JSON → renderer reads the snapshot and writes md/html. Skill events take a separate branch that updates `bySkill` only; they never rotate `current`/`previous` and are not joined to a completion.

## Rabbit holes

**Resolved here** (with answer):
- "Most used" across vendors is not comparable by completion count: OpenCode records one completion per assistant message, Claude and Codex one per subagent stop. → resolution: each table states its unit. The headline ranks by reported tokens where a vendor reports them and shows completions beside it, and says explicitly when a vendor's tokens are unavailable (today Claude and Codex), instead of implying a winner.
- Old data cannot be re-aggregated by model, agent, skill or effort. → resolution: no backfill. Aggregates start at migration and the report shows "since <date>". Existing lifetime totals are kept unchanged.
- Skill names, model names and agent names are untrusted keys. → resolution: trim, length-bound, store in a prototype-safe structure, and cap distinct keys per dimension with an "other" bucket so the snapshot stays bounded.
- "Level of effort" is ambiguous (reasoning effort vs. the workflow's `fast`/`standard`/`deep` capability profile). → resolution: reasoning effort, confirmed by the user at the gate on 2026-09-24. The capability profile is not recorded.
- Schema v1→v2 wipes existing data (critique S1). `readSnapshot` today returns a blank snapshot for any version other than 1. → resolution: an explicit v1→v2 migration branch keeps `lifetime` and adds empty dimension aggregates with `since`. A downgraded checkout may still blank a v2 file, so the doc states that v2 files are not readable by older collectors. Tested against a real v1 fixture (the current file's shape).
- Reversibility is not what `applyRecord` does today (S1, K1). → resolution: the new aggregates use no `Math.max(0, …)` clamp, so over-subtraction fails loudly in tests. A stored record carries a flag saying whether its dimensions were applied, and the bucket it was routed to (including "other"). Reversal uses that stored routing, never a recomputed one. The migration and reversal tests run against the collector on disk, not a cached module.
- A skill event must not enter the completion path (S2). → resolution: a separate skill-use branch that skips `current`/`previous` rotation, `applyRecord`, and `recentEventKeys`. It has its own small bounded dedup ring. Test: a skill event leaves `current`, `previous`, `agentCompletions` and `recentEventKeys` unchanged.
- Untrusted keys and ambiguous `vendor:key` strings (S3). → resolution: dimensions are nested by vendor (`byVendor[vendor].models`, and so on) in prototype-free maps, and the existing `vendors` map moves to the same structure. Reserved names (`__proto__`, `constructor`, `prototype`) are bucketed to "other". Names are truncated to 80 characters before use as a key and before entering `identityKey`. The renderer never splits keys. Tests cover `__proto__` in vendor, model, agent and skill.
- Cost `0` reads as free (S4). → resolution: cost is ranked only over completions where the harness reported a nonzero cost. The table shows "Unpriced" for the rest and states this basis.

**Pushed to /plan as risk** (with named owner):
- Which harnesses actually expose model, effort and skill use in their hook payloads. Claude's `SubagentStop` records null model and agent type today. Owner: planner runs a one-scope spike that captures real payload field names (keys only, no content) for Claude, OpenCode and Codex before any schema is fixed.
- How to get model (and possibly effort) for Claude subagents. Options: `PostToolUse(Agent)` `tool_response`, the session's start payload, or reading the subagent transcript for allow-listed fields only. Reading a transcript is a departure from today's collector, which never opens one, even though nothing from it would be persisted. Owner: planner. The user decided on 2026-09-24 to leave this to the plan spike: try payload-based sources first, and ask the user again before any transcript read. If no payload source exists, Claude model and effort show "Unreported".
- Proving the reversibility design above inside every path of `recordEvent`: replay, the identity-key update, and the Claude "upgrade unavailable completion" path. Owner: build, with a property-style test that applies then reverses a record and expects the snapshot unchanged, including a record recorded before migration.
- Rendering cost on every hook event (md and html regenerate each time). Owner: plan measures it; the fallback is regenerating views on demand.

**Pushed to no-go** (deferred):
- Time-series history and trends (needs per-run storage the collector deliberately avoids).
- A dashboard beyond the existing static md and html.

## No-gos (this pitch)

- ✗ No prompts, responses, tool arguments, or skill `args` are stored, ever. Only allow-listed identifiers and numbers.
- ✗ No per-run log files or unbounded arrays; the rolling snapshot stays bounded.
- ✗ No backfill or estimation of history that harnesses never reported.
- ✗ No Cursor collector (no portable completion payload exists).
- ✗ No estimating cost or tokens for Claude or Codex when they report none.
- ✗ No change to caveman-mode attribution or the token-consumption hook's "never block the agent" behavior.
- ✗ No committing metrics output; `.project/metrics/` stays Git-ignored.

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

Ran 2026-09-24: knowledge-historian, skeptic, appetite-auditor. `cross-pitch-projector` skipped (no other active pitch touches these files). `eval-regression-projector` skipped (no AI-prompt scope). Findings are advisory. The last column is the recommended disposition; the user's choice is recorded in the Bet decision.

| ID | Perspective | Severity | Type | Suggestion | Recommended |
|----|-------------|----------|------|------------|-------------|
| S1 | skeptic | high | rabbit-hole | `readSnapshot` accepts only `schemaVersion === 1` and otherwise returns a blank snapshot, so bumping to 2 without a migration branch wipes the 193 recorded completions (and a downgraded checkout would blank a v2 file). `applyRecord`'s `Math.max(0, …)` clamps hide over-subtraction, so an apply-then-reverse test can pass while the snapshot is wrong. Records recorded before migration would be reversed against dimension buckets they were never added to. Fix: explicit v1→v2 migration keeping `lifetime`; reverse dimension aggregates only for records that were applied to them (flag or `since` check); store the routing bucket (including "other") on the stored record; no clamp on the new aggregates; test against a real v1 fixture. | Address |
| S2 | skeptic | high | rabbit-hole | A skill event goes through the completion path today: it would rotate `current`/`previous`, bump `agentCompletions`, and its `tool_use_id` would evict completion keys from the 100-entry `recentEventKeys` window. Fix: a separate skill-use branch that skips rotation and `applyRecord`, with its own bounded dedup or documented none; test that a skill event leaves `current`, `previous`, `agentCompletions` and `recentEventKeys` unchanged. | Address |
| S3 | skeptic | high | rabbit-hole | `totals.vendors[record.vendor] ||= {…}` breaks for a vendor named `__proto__` (writes land on `Object.prototype`); the same pattern for model/agent/skill keys would take payload strings. Flat `vendor:model` keys are ambiguous because names contain `:` and `/`. Fix: nested `byVendor[vendor].models` in prototype-free maps (also for the existing `vendors`), reserved-name handling, length bound (~80) before use as a key and in `identityKey`, never split keys in the renderer, tests for `__proto__` in each dimension. | Address |
| S4 | skeptic | low | rabbit-hole | Cost `0` is accepted as reported cost (`numberOrNull`), so unpriced OpenCode messages read as free. Any cost ranking must state its basis or treat 0 as unpriced. | Address (report wording) |
| K1 | knowledge-historian | medium | missed-knowledge | `patterns/subprocess-revalidation-against-on-disk-code` (schema versioning): the migration and reversibility tests should exercise the collector as it exists on disk, not a cached module. Related to S1. | Acknowledge, fold into S1's test |
| K2 | knowledge-historian | low | missed-knowledge | `patterns/dual-hash-tracking-for-transformed-content`. The snapshot stores no hashes, so the fit is weak. | Override: does not apply |
| A1 | appetite-auditor | none | appetite-ok | 12 files (2 new, 10 modified: collector, its test, renderer, renderer test, opencode plugin, `.claude/settings.json`, `hooks.json`, `.codex/hooks.json`, `harnesses.md`, CHANGELOG/VERSION, `workflow-doctor.js`), about 670 LOC touched against caps of 15 files / 1500 LOC. No mismatch. If addressing S1-S3 pushes the file count past 15, split the renderer. | None needed |

## Bet decision

☑ **Bet** (→ /plan)  
☐ Re-shape — named gap: {which rabbit hole un-resolved? which critique finding?}  
☐ Pass — moved to `.project/pitches/_parked/{slug}/`; reason: {…}

2026-09-24: the user chose "Revise, then Bet". Critique S1-S4 were addressed in the Rabbit holes section above. K1 is acknowledged and folded into the S1 test design. K2 is overridden as not applicable: the snapshot stores no hashes. A1 (appetite fits) needed no action. Plan-time work still open: the payload-field spike per harness, and the Claude model/effort source.
