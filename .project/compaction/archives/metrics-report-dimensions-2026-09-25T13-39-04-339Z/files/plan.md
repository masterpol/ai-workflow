# Plan: metrics-report-dimensions

**Pitch**: pitch.md  •  **Appetite**: big-batch  •  **Hill**: hill.md

Test command for every scope: `node --test <file>` (Node v24.18.0, no package manager; `.project/context/stack.md` defines no build command and none is needed, since no scope is UI).

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S0 | Payload-field spike (no shipped code) | `spike-payloads.md` (pitch dir); throwaway capture script in scratchpad | ~60 doc | — | S1 | no: needs this session's live hooks and the user's approval for any transcript question | — |
| S1 | Collector core: schema v2, reversible dimensions, skill-use branch, safe keys | `ai-framework/hooks/scripts/token-consumption.js`, `token-consumption.test.js` | +220 / +260 test | — | S0 | no: the reversibility design is shared state every later scope reads; one owner | — (main session at `deep`) |
| S2 | Report renderer and usage headline | `ai-framework/hooks/scripts/token-report.js` (new), `token-report.test.js` (new); removes `markdown()`/`html()` from the collector | ~260 / ~150 test | S1 | S3 | yes: disjoint from S3, clear exit, contract fixed below | standard |
| S3 | Harness feeders: model, effort, skill events | `.opencode/plugins/token-consumption.js`, `.claude/settings.json`, `ai-framework/hooks/hooks.json`, `.codex/hooks.json` (only if S0 shows fields) | ~60 | S0, S1 | S2 | no: which fields exist is decided by S0's findings, and three harness files are edited together | — |
| S4 | Docs, doctor wiring, end-to-end check | `README.md` (Token Consumption section), `ai-framework/integrations/harnesses.md`, `ai-framework/scripts/workflow-doctor.js` | ~70 | S2, S3 | — | yes: mechanical, self-contained, exact edits listed | fast |

File count: 10 firm (collector, its test, `token-report.js`, its test, opencode plugin, `.claude/settings.json`, `hooks.json`, `README.md`, `harnesses.md`, `workflow-doctor.js`) plus `.codex/hooks.json` if S0 requires it, plus `CHANGELOG.md`/`VERSION` written by `/changelog` at ship. Maximum 13 of 15. Est. ~640 LOC, cap 1500. Two constraints keep it under the cap: the "Current Completion" table and its `Caveman mode` column stay exactly as they are (pinned by `skill-defaults.test.js:345-348`, so that test and `skill-defaults.md` need no edit), and `SETUP.md` needs no change (its three-file list is still true).

## Schema v2 contract (fixed here so S2 and S3 can proceed without S1's code)

```
snapshot.schemaVersion: 2
snapshot.lifetime            existing fields unchanged
snapshot.lifetime.vendors    { [vendor]: { completions, reportedUsageCount, unavailableCount, reportedCostUsd, pricedCount } }
snapshot.dimensions.since    ISO time of migration (or first write on a blank snapshot)
snapshot.dimensions.models   { [vendor]: { [model]:  Row } }
snapshot.dimensions.agents   { [vendor]: { [agent]:  Row } }
snapshot.dimensions.efforts  { [vendor]: { [effort]: Row } }
snapshot.dimensions.skills   { [vendor]: { [skill]:  { uses } } }
snapshot.recentSkillKeys     bounded ring, 50 entries, separate from recentEventKeys
Row = { completions, reportedUsageCount, unavailableCount, tokens, costUsd, pricedCount }
record.effort                string | null (allow-listed, trimmed, max 80 chars)
record.dimensions            { applied: boolean, model: key, agent: key, effort: key }   // routing stored, reused on reversal
```

- Bucket keys: real name, or `(unreported)` when the harness gave none, or `(other)` when the vendor already holds 25 distinct keys in that dimension or the name is reserved (`__proto__`, `constructor`, `prototype`). Keys are truncated to 80 characters before use.
- All maps are null-prototype objects at runtime, including the existing `vendors` map. The renderer never splits a key; it always iterates vendor, then name.
- `pricedCount` counts completions with a nonzero reported cost. Cost rankings use only those; the rest show "Unpriced".
- v1 files migrate in `readSnapshot`: `lifetime` is kept, `dimensions` starts empty with `since` set to the migration time, and existing `current`/`previous` records have no `dimensions.applied`, so reversal skips them.

## Exit criteria per scope (machine-checkable, ≥1 per scope)

### S0 — Payload-field spike
- `test -f .project/pitches/metrics-report-dimensions/spike-payloads.md` exit 0
- `grep -c "^## " .project/pitches/metrics-report-dimensions/spike-payloads.md` ≥ 4 (Claude `SubagentStop`, Claude `PostToolUse(Agent)`, Claude `PostToolUse(Skill)`, OpenCode, Codex, one section each, with status `verified` or `unverified` per field)
- The file lists key names only. `grep -Ei "sk-|password|secret|bearer" .project/pitches/metrics-report-dimensions/spike-payloads.md` returns nothing
- `git diff --quiet -- .claude/settings.json .codex/hooks.json` exit 0 after the spike (any temporary wiring removed)
- Answers, per field (model, effort, agent type, skill name), one of: `payload`, `payload-elsewhere: <event>`, `transcript-only`, `not exposed`. A `transcript-only` result stops the plan and returns to the user (pitch decision of 2026-09-24).

### S1 — Collector core
- `node --test ai-framework/hooks/scripts/token-consumption.test.js` exit 0, including the 11 existing tests unchanged
- New tests (each named in the file): v1→v2 migration from an inline fixture with the exact v1 shape keeps `lifetime.agentCompletions`; apply-then-reverse returns the snapshot to its start state including a record whose routing went to `(other)`; a pre-migration `current` is upgraded without touching dimension buckets; skill event leaves `current`, `previous`, `agentCompletions` and `recentEventKeys` unchanged; `__proto__` as vendor, model, agent, skill and effort does not write to `Object.prototype` (`({}).polluted === undefined`); a name over 80 characters is truncated; the 26th distinct model for a vendor goes to `(other)`; payload with `tool_input.args` containing a marker string leaves that string absent from the snapshot text; cost `0` does not increment `pricedCount`
- `node -e` migration check on a copy of the real file: copy `.project/metrics/token-consumption.json` to a temp root, record one event, and assert `lifetime.agentCompletions` equals the original plus 1 (expected 194 at time of writing) and `schemaVersion === 2`
- `grep -n "Math.max" ai-framework/hooks/scripts/token-consumption.js` shows none inside the new dimension functions (reviewed at audit; the reversal test is the enforcing check)
- `node --test --experimental-test-coverage ai-framework/hooks/scripts/token-consumption.test.js` reports ≥ 90% line coverage for the collector (`ai-framework/rules/testing.md`: utilities 90%+; the file's previous work reached 100%)
- Security rules folded in: `ai-framework/rules/security.md` §2 (bounded strings) is satisfied by the 80-character truncation test; §3 (never store secrets) by the `args` test.

### S2 — Report renderer
- `node --test ai-framework/hooks/scripts/token-report.test.js ai-framework/hooks/scripts/token-consumption.test.js ai-framework/scripts/skill-defaults.test.js` exit 0 (the last file's assertions at lines 345-348 stay unchanged)
- `grep -c "function markdown\|function html" ai-framework/hooks/scripts/token-consumption.js` returns 0 (rendering moved out)
- Renderer tests: a snapshot with two vendors, several models, and null values renders a "Most used" headline that names its ranking basis, a "Unit" note per vendor (assistant messages vs subagent runs), "Unreported" for null, "Unpriced" for cost-less rows, the `since` date, and an `(other)` row; ranking never treats missing tokens as zero; every dynamic string in the HTML is escaped (test with `<script>` as a model name); a blank v2 snapshot renders without throwing
- Render cost: a script that runs 100 `recordEvent` calls against a temp root prints the median per call; recorded in the evidence file. If the median exceeds 100 ms, regeneration moves to on-demand before S2 is done.

### S3 — Harness feeders
- `node --test ai-framework/hooks/scripts/token-consumption.test.js` exit 0
- `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'));JSON.parse(require('fs').readFileSync('ai-framework/hooks/hooks.json','utf8'));JSON.parse(require('fs').readFileSync('.codex/hooks.json','utf8'))"` exit 0
- `grep -c '"matcher": "Skill"' .claude/settings.json ai-framework/hooks/hooks.json` returns 1 per file (settings and template stay in step)
- `node ai-framework/hooks/scripts/token-consumption.js --vendor claude --event skill-use --root <temp>` with a sample `PostToolUse(Skill)` payload on stdin exits 0 and records the skill name without recording `args`
- `node ai-framework/scripts/workflow-doctor.js` exit 0 (the doctor's wiring checks at `workflow-doctor.js:563-565` still pass)
- OpenCode: import-time check `node --input-type=module -e "import('./.opencode/plugins/token-consumption.js')"` exit 0; the plugin passes only allow-listed fields
- If S0 marks a field `not exposed` for a harness, that harness's report shows "Unreported" (no fabricated value); this is a pass, not a gap.

### S4 — Docs, doctor, end-to-end
- `node ai-framework/scripts/workflow-doctor.js` exit 0 and `node ai-framework/scripts/setup-validator.js` exit 0
- `grep -c "token-report" ai-framework/scripts/workflow-doctor.js` ≥ 2 (script and test in the verified script list at line 506)
- `grep -n "byModel\|models\|skills\|effort" ai-framework/integrations/harnesses.md README.md` matches the updated Token Consumption sections, and the collector section states that v2 files are not readable by older collectors and that dimensions start at `since`
- End to end: replaying the sample payloads from S3 into a temp root through the CLI produces `token-consumption.md` containing "Most used", every dimension heading, and none of the marker strings from the `args` test
- `node --test ai-framework/hooks/scripts/token-consumption.test.js ai-framework/hooks/scripts/token-report.test.js ai-framework/scripts/skill-defaults.test.js` exit 0
- Manual: open the regenerated `.project/metrics/token-consumption.html` in a browser once.

## Impact (blast radius, run inline because this plan touches 5+ existing files)

| Modified file | Consumers / references | Tests | Risk |
|---|---|---|---|
| `token-consumption.js` | `.opencode/plugins/token-consumption.js` (imports `recordEvent`); `.claude/settings.json` and `.codex/hooks.json` (CLI); `workflow-doctor.js:506,563-565`; `skill-defaults.test.js:335` (imports `recordEvent`) | `token-consumption.test.js` (11), `skill-defaults.test.js:335-348` (pins Markdown/HTML strings) | high: exported `recordEvent`/`normalizedEvent` shape and rendered strings are relied on |
| `.opencode/plugins/token-consumption.js` | `workflow-doctor.js:502,565` | none of its own; doctor checks for `recordEvent` | medium: loaded by OpenCode, an import error would drop all OpenCode metrics silently (the plugin already swallows errors) |
| `.claude/settings.json` | `workflow-doctor.js:563`; mirrored by `hooks.json` | doctor | medium: a malformed file disables every Claude hook |
| `ai-framework/hooks/hooks.json` | template, copied by users | none | low |
| `.codex/hooks.json` | `workflow-doctor.js:564` | doctor | low (conditional) |
| `README.md`, `harnesses.md` | `workflow-doctor.js:502` requires both to exist | doctor | low |
| `workflow-doctor.js` | `setup-validator.js` runs it | `setup-validator.js` | medium: a wrong script path fails every setup check |

Not affected: `SETUP.md`, `skill-defaults.md`, `skill-defaults.test.js` (as long as the "Current Completion" table stays as is).

## Risks (inherited from pitch rabbit holes)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| Which harnesses expose model, effort, skill name, agent type in hook payloads | S0, S3 | yes | S0 captures key names only and marks each field verified or unverified; S3 wires only what S0 proves. Codex and OpenCode cannot be run from this Claude session, so their fields may stay `unverified` and show "Unreported" |
| Claude model/effort source; transcript read would depart from today's collector | S0, S3 | yes | Payload-based sources first. Any transcript-only finding stops and asks the user again |
| Reversibility inside every `recordEvent` path (replay, identity update, Claude upgrade path) | S1 | no | Stored routing, `applied` flag, no clamp on new aggregates, apply-then-reverse tests for all three paths |
| v1→v2 migration wiping data or older collectors blanking v2 files | S1, S4 | no | Migration branch plus real-file copy check; the downgrade limitation is documented in S4 |
| Skill events corrupting completion state | S1 | no | Separate branch and its own ring; unchanged-state test |
| Untrusted keys | S1, S2 | no | Null-prototype maps, reserved names, 80-character bound, 25-key cap, HTML escaping tested in S2 |
| Rendering cost per hook event | S2 | measure | Median measured over 100 calls; on-demand rendering is the fallback |
| Renderer refactor breaks pinned strings | S2 | no | `skill-defaults.test.js` runs in S2's exit; the Current Completion table is kept verbatim |
| Cost `0` read as free | S1, S2 | no | `pricedCount` and "Unpriced" wording |
| Cross-vendor "most used" is not comparable | S2 | no | Per-vendor units and an explicit ranking basis in the headline |
| File cap | all | no | 13 files maximum; stop and split if S0 forces more |

## Parallel dispatch plan

1. Start S0 and S1 together. Neither shares files. S0 needs this session's live hooks, so I run it myself and do S1 in the same session.
2. When S1 lands, run S2 and S3 in parallel. Disjoint files: S2 owns `token-report.js`, its test, and the removal of the two render functions from the collector; S3 owns the harness files. S3 additionally needs S0's findings, so it starts only after both S0 and S1 are done.
3. S2 is dispatched as a subagent at `standard`: it is well specified by the schema contract above, but it has real design content in the headline and unit wording. S3 stays in the main session.
4. S4 runs last as a subagent at `fast`: exact edits, mechanical checks.
5. If the harness cannot dispatch nested agents, S2 and S4 fall back to sequential passes; nothing else changes.

## Wireframes (UI scopes only, light)

Not applicable: no UI scope. The HTML report is a generated static page; its table layout is set in S2.

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)
