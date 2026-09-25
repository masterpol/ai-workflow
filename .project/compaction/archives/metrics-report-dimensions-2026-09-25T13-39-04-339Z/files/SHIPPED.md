# Shipped: Metrics report dimensions

**Pitch:** [pitch.md](pitch.md) · **Plan:** [plan.md](plan.md) · **Hill:** [hill.md](hill.md)
**Shipped:** 2026-09-25 · **Appetite:** big-batch (13 files including CHANGELOG/VERSION, cap 15)

## What changed for the user

`.project/metrics/token-consumption.md` and `.html` now open with a **Usage** summary (most used vendor and model, and the basis they were ranked on), followed by tables by vendor, model, agent, reasoning effort and skill. Values a harness does not report show `Unreported`; completions with no nonzero cost show `Unpriced`. The new tables count from the schema v2 migration date, printed in the report; nothing is back-filled.

## Scope reconciliation

| Scope | Commitment | Delivered | Status |
|---|---|---|---|
| S0 | Payload-field spike, key names only | `spike-payloads.md`: Claude fields verified live (effort, agent type, model via a join, skill name); OpenCode from type definitions; Codex not inspected. No transcript read was needed | **Done** |
| S1 | Collector core: schema v2, reversible dimensions, separate skill branch, safe keys | `token-consumption.js` v2 with v1 migration, stored-routing reversal, prototype-free maps, name allow-list, id/cost/token bounds, symlink containment, async-launch model notes (deviation D1). 34 collector tests, 98.9% line coverage | **Done** |
| S2 | Report renderer and usage headline | New `token-report.js` (100% lines) with the Usage headline, per-vendor units, five tables. Existing Current Completion table kept verbatim. Median render about 6 ms | **Done** |
| S3 | Harness feeders | Claude `Skill` PostToolUse hook (`.claude/settings.json` and the `hooks.json` template), OpenCode plugin passes effort (`variant`) and counts skill calls. `.codex/hooks.json` untouched | **Done** (OpenCode fields and the wired Claude hook unverified live, see followups) |
| S4 | Docs, doctor, end-to-end | `README.md` and `harnesses.md` sections, `workflow-doctor.js` script list and skill-hook check, CLI replay with marker strings | **Done** |

Verify at close: 76 tests pass (collector, renderer, plugin, and the unchanged `skill-defaults.test.js`); `workflow-doctor.js` READY; `setup-validator.js` READY; `graphify.js --check` CLEAN. This project has no build, typecheck or lint command, so those steps were skipped. Diff hygiene: no `.env` or secret files, no debug statements added.

## Audit

Two cycles (`audit-cycle-1.md`, `audit-cycle-2.md`). Cycle 1: 2 must-fix (missing automated tests for the CLI and the OpenCode plugin) and 5 should-fix security items from the security reviewer (Markdown injection through names, symlinked metrics directory, unbounded ids and status, float underflow, plus three smaller items), all fixed, each reproduced first. Cycle 2 re-check found a further gap in the fix (agent ids shown as labels), fixed.

**Partly independent audit.** The cycle 2 security re-check was dispatched three times and never returned a report (rate limit, then two stalls). The checks were re-run by the author and are recorded as author-run. The user approved shipping on that basis (2026-09-25).

## No-gos honored

- **No prompts, responses, tool arguments, skill args or transcripts stored:** tests place marker strings in skill `args`, agent prompts, and last-assistant messages across the CLI, both hooks and the plugin, and grep all three output files (0 matches).
- **No per-run logs or unbounded arrays:** the snapshot stays bounded (rings of 100, 50 and 50; 25 names per dimension per vendor; ids 128 characters). 2,000 events with 9,000-character ids produced a 3 KB file.
- **No backfill:** aggregates start at migration; the report says so.
- **No Cursor collector; no estimated tokens or cost for Claude or Codex:** confirmed, those show `Unavailable`.
- **Caveman-mode attribution and never-block-the-agent behavior unchanged:** existing tests pass untouched; every hook path exits 0 on bad input.
- **`.project/metrics/` stays Git-ignored:** confirmed (`git check-ignore`).

## Rabbit holes

All resolved as recorded in `pitch.md`, with the payload spike (S0) answering the harness-field question and the plan-time transcript question closing without a transcript read.

## Deviations (`deviations.md`)

D1 async Claude launches double-counted (fixed for new data, history not corrected); D2 S4 built inline; D3 collector coverage restored after S2 moved the renderers out; D4 separate "By Vendor Unit" table; D5 cycle 1 fixes and deferrals; D6 cycle 2 security re-check not completed by an agent.

## Followups generated (`pitches/_followups.md`)

Collector lock never reclaims a live or reused PID; collector identity keys can collide across entities; verify OpenCode `variant` and the skill tool id in a live session; confirm the wired Claude `Skill` hook fires in a fresh session; consider an independent security re-review of the cycle 1 fixes.

## Notes for /cooldown

- The fast-profile `code-reviewer` returned "no findings" while the standard security reviewer found five real issues and the coverage reviewer two real gaps; consider routing code review to the standard profile.
- Three security-reviewer dispatches failed in one cycle; a provider limit and a stall were the causes. Audit needs a documented fallback for when the one reviewer that matters cannot finish.
- Hook events were assumed to mean what their names say until a live capture showed otherwise ([[async-agent-launch-hook-counted-as-completion]]).
- A mutation pass found a test that did not test its guard; worth making it a routine audit step for security-relevant code.
- New knowledge: `async-agent-launch-hook-counted-as-completion`, `allow-list-untrusted-labels-at-ingest-and-at-render`, `reversible-aggregates-store-their-routing`.
