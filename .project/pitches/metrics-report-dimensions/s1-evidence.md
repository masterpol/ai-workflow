# S0 and S1 evidence

Run 2026-09-24 (system clock reads 2026-09-25 UTC).

## S0
- `spike-payloads.md` exists with 6 `## ` sections; the secret-word grep returns nothing; `git diff --quiet -- .claude/settings.json .codex/hooks.json` exit 0 after the temporary capture hooks were removed.
- Outcome: no field is `transcript-only`, so the plan's stop condition did not trigger. One deviation logged (D1, `deviations.md`).

## S1 (`ai-framework/hooks/scripts/token-consumption.js`, `token-consumption.test.js`)
- `node --test ai-framework/hooks/scripts/token-consumption.test.js ai-framework/scripts/skill-defaults.test.js`: 45 tests, 45 pass, 0 fail (the 11 original collector tests and the 22 skill-defaults tests unchanged; 12 new collector tests).
- New tests cover: v1 fixture migration; upgrade of a pre-migration record; apply-then-reverse including `(other)`; reversal using stored routing after the cap moved; loud failure on underflow; skill event leaves completion state untouched and dedups by `tool_use_id`; nameless skill event writes nothing; `__proto__`/`constructor`/`prototype` as vendor, model, agent, effort and skill, across a reload; 80-character truncation and the 25-name cap; cost `0` not priced; async launch note then stop event; bounded model notes; skill `args`, prompt and reply text absent from all three output files.
- Real-file copy check: a copy of `.project/metrics/token-consumption.json` (v1, 210 completions, 816,478 tokens) plus one event became v2 with 211 completions and 816,480 tokens, `dimensions.since` set.
- Coverage: `node --test --experimental-test-coverage` on the collector reports 91.34% lines (target 90%). The uncovered lines are the Markdown/HTML renderers, the CLI entry, and the lock-recovery branches; S2 moves the renderers out.
- No `Math.max` in the new dimension functions (`applyToRow`, `applyDimensions`); the one `Math.max` added is `pricedCount` on the existing lifetime `vendors` entry, matching that block's existing style.

## Open notes for the roll-up
- The real `.project/metrics` file is still v1; it migrates on the next hook event.
- D1 changes what "a completion" means for async Claude agents from now on; history is not corrected.
- Renderers still live in the collector until S2.
