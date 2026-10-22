# Status

> Index only — hard cap **100 lines**. Detail lives per-pitch in `pitches/{slug}/`; history in `runs/`.

## Active pitches
| Pitch | Hill | Phase | Appetite | Last touched |
|-------|------|-------|----------|--------------|
| workflow-v3-rollout | shaped | shape | small-batch | 2026-10-16 |

## Parked pitches
| Pitch | Parked | Reason |
|-------|--------|--------|
| restore-vendor-adapters | 2026-10-08 | Premise invalidated by critique: vendor adapters are already present and pass validators. |

## Recent ships (last 5)
| Pitch | Shipped | Notes |
|-------|---------|-------|
| token-time-report | 2026-10-21 | v2.41.0; JSON/Markdown/HTML token + stored-union time joins by exact pitch/phase/scope; guarded owned publication and state link; review guard caps/secret exclusion; Node 2472 pass / 3 skips, scoped Bun 257; direct verifier route owner-approved. See `pitches/token-time-report/SHIPPED.md`. |
| test-execution-performance | 2026-10-21 | v2.40.0; `run-tests.mts` portable test command (full/partial, Node/Bun, bounded workers); no speed setting promoted (unproven on a contended host; Node workers no-go, Bun fails 5 s timeouts); Node 2428 pass / 3 skips, Bun command test 11 pass; audit 2 cycles; owner approved package-less verifier fallback. See `pitches/test-execution-performance/SHIPPED.md`. |
| state-deep-evidence | 2026-10-21 | v2.39.0; bounded architecture/history/risks/tokens facts; Node 2398 pass / 3 skips, scoped Bun 140 pass; owner accepted LOC/live-quality exceptions and direct-check verifier fallback. See `pitches/state-deep-evidence/SHIPPED.md`. |
| workflow-usage-capture | 2026-10-21 | v2.38.0; metadata-only Claude/OpenCode capture; all scopes complete; Node 2360 and Bun 2338 pass, 3 existing skips each; audit complete; owner approved package-less verifier fallback. See `pitches/workflow-usage-capture/SHIPPED.md`. |
| state-ai-authoring | 2026-10-20 | v2.37.0; AI analysis fragments in the /state report: `state-fragment-inject.mts` (hash, header, guarded dir, `status`/`stamp`/`check`, loader, labelled container), renderer wiring with `--strict-fragments` and an `AI analysis:` summary line, `/state` Step 3 and Cursor copy; 15 of 15 files, 332 of 420 LOC; 3 review rounds + audit 1 cycle (2 canaries caught); **live claim blocked**: 72 runs, 51 pass (Claude Code 21/24, Codex 20/24, OpenCode 10/24). See `runs/2026-10-20-state-ai-authoring.md`. |

## Open rabbit holes across active pitches
- Legacy source access, content and media totals, and school-site ownership.
- Identity, privacy, data residency, infrastructure, and operational vendor decisions.
- Canonical paths and redirect treatment for current school domains.

## Followups backlog
→ `.project/pitches/_followups.md` (includes four token-time-report, five state-deep-evidence and five test-execution-performance followups; prior backlog retained)

## /cooldown reviewed 2026-10-21 (3 ships since; next due after 2)
Report: `runs/cooldown-2026-10-21.md`. Corrected the stale October 8 counter: nine completed pitches followed the preserved October 17 review. C4–C9 are pending recommendations; earlier C1–C3 and October 17 proposals remain unchanged. No promotions, archives, revivals or backlog bundles applied; individual approval required.
