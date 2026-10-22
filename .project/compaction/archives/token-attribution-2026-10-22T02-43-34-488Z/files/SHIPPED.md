# Shipped: token-attribution
Bet: 2026-10-19  •  Shipped: 2026-10-19  •  Appetite: big-batch (12 of 15 files, cap 15 / 1,500 LOC)  •  Version 2.34.0

## Scopes
| ID | Status | Hill done | Notes |
|----|--------|-----------|-------|
| S1 | shipped | 2026-10-19 | spike: `snapshot-map` placement, TTL 6 h / 32 sessions, lease baseline 0/12 |
| S2 | shipped | 2026-10-19 | spike: Codex `session-log` (unconfirmed shape); Codex pair deferred |
| S3 | shipped | 2026-10-19 | spike: `subagent-file`; last-line-wins for repeated ids; `Stop` approved |
| S4 | shipped | 2026-10-19 | worker output rewritten on the main thread (wrong data shape) |
| S5 | shipped | 2026-10-19 | revision 3, append-only migration, directory-identity pin (cf8ecfe) |
| S6 | shipped | 2026-10-19 | phase-start hook and `resolvePhaseContext` export (556a60f) |
| S7 | shipped | 2026-10-19 | flows with caps, transcript cursors, `Stop` session-turn (101b4ba) |
| S8 | shipped | 2026-10-19 | By Flow and Unattributed share (b577c54); worker output reviewed |
| S9 | shipped | 2026-10-19 | docs (67dce8d); worker output reviewed |
| S10 | shipped | 2026-10-19 | rollout record, scratch bundle-sync dry run, release 2.34.0 |

## No-gos honored
- ✅ no transcript text, prompts, responses or tool arguments stored (marker tests over every metrics file and stderr)
- ✅ no estimated tokens or cost; Claude cost stays `Unpriced`
- ✅ no per-message logs or unbounded arrays (caps 50/25/600 leaves, 200 cursors, 32 contexts)
- ✅ lease mechanism unchanged; collector exits 0 always
- ⚠️ plan deviations: `status.md` fallback dropped (owner), Codex and OpenCode pairs deferred (owner), `Stop` wiring moved from S6 to S7, `upgradeClaudeCompletion` is `canUpgradeClaudeCompletion` (see `plan.md` D1–D8)

## Rabbit holes
- ✅ resolved: pointer placement, key caps (LRU fold), exactly-once under replay/partial/shorter/failed write, path safety incl. macOS alias, lease-port flake (0/12 at S1, S6, S7)
- ⚠️ surfaced: oversized-line cursor stall, label collisions in the report, unverified live payloads (`Stop` `transcript_path`, foreground hook order) → followups

## Audit
One cycle (security independent: yes; code and test independent: no, canary cited loosely), 0 real must-fix after refuting three planted canaries, 5 should-fix fixed with tests and mutants. See `audit.md`.

## Followups generated
8 items in `_followups.md` (Codex usage parser, OpenCode child ids, live payload checks, worktree join, cap edge cases, equivalent mutants, cross-pitch ruling, worker briefing).

## Doc updates
`ai-framework/docs/token-consumption.md` and `state-report.md` updated in-pitch. No ADR-worthy decision beyond the pitch records.
