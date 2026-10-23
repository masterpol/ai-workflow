# Status

> Index only — hard cap **100 lines**. Detail lives per-pitch in `pitches/{slug}/`; history in `runs/`.

## Active pitches
| Pitch | Hill | Phase | Appetite | Last touched |
|-------|------|-------|----------|--------------|
| workflow-v3-rollout | shaped; amended 2026-10-21 | shape | small-batch | 2026-10-21 |
| package-less-ship-verification | draft | shape | small-batch | 2026-10-22 |
| orca-bounded-control-receipts | draft | shape | small-batch | 2026-10-22 |

## Parked pitches
_None. `restore-vendor-adapters` was removed 2026-10-22 (premise invalidated 2026-10-08; its `_parked/` directory no longer exists)._

## Recent ships (last 5)
| Pitch | Shipped | Notes |
|-------|---------|-------|
| connected-memory-consolidation | 2026-10-23 | v2.42.0-2.49.0; four tracks shipped under separate receipts (P1 process graph, P2a v2 schemas, P2d installed sync, P2c legacy upgrade): 20/20 scopes, all 46 legacy pitches upgraded to v2 outcomes with v1 siblings and archives preserved; Node 2709 pass / 0 fail / 3 skips; owner-approved exceptions: TTR 9.74% retained bytes, state-history fallback deferred to P2b; P2a overrun and author-run final evidence disclosed; cooldown due. See `records/shipped/connected-memory-consolidation.md` and `records/consolidation/rollup.md`. |
| fix-retired-live-evidence-path | 2026-10-23 | Exact original matrix retained at durable path; one regression path fixed; 54/54 and independent child347/347; full Node2709 pass/0 fail/3 skips; historical claim remains blocked; FRLE-D1 diagnostics deferred. See `runs/2026-10-23-fix-retired-live-evidence-path.md`. |
| token-time-report | 2026-10-21 | v2.41.0; JSON/Markdown/HTML token + stored-union time joins by exact pitch/phase/scope; guarded owned publication and state link; review guard caps/secret exclusion; Node 2472 pass / 3 skips, scoped Bun 257; direct verifier route owner-approved. See `pitches/token-time-report/SHIPPED.md`. |
| test-execution-performance | 2026-10-21 | v2.40.0; `run-tests.mts` portable test command (full/partial, Node/Bun, bounded workers); no speed setting promoted (unproven on a contended host; Node workers no-go, Bun fails 5 s timeouts); Node 2428 pass / 3 skips, Bun command test 11 pass; audit 2 cycles; owner approved package-less verifier fallback. See `pitches/test-execution-performance/SHIPPED.md`. |
| state-deep-evidence | 2026-10-21 | v2.39.0; bounded architecture/history/risks/tokens facts; Node 2398 pass / 3 skips, scoped Bun 140 pass; owner accepted LOC/live-quality exceptions and direct-check verifier fallback. See `pitches/state-deep-evidence/SHIPPED.md`. |

## Open rabbit holes across active pitches
- Legacy source access, content and media totals, and school-site ownership.
- Identity, privacy, data residency, infrastructure, and operational vendor decisions.
- Canonical paths and redirect treatment for current school domains.

## Followups backlog
→ `.project/pitches/_followups.md` (includes four token-time-report, five state-deep-evidence and five test-execution-performance followups; prior backlog retained)

## /cooldown reviewed 2026-10-21 (forced; 5 ships since; due now, no decision pre-approved; consolidation shipped)
Forced report: `runs/cooldown-2026-10-21-forced.md` (promoted C5, C8 rules; closed C4, C9 as already codified; bundled C6, C7 as candidate pitches). Earlier: `runs/cooldown-2026-10-21.md`. Corrected the stale October 8 counter: nine completed pitches followed the preserved October 17 review. C4–C9 decided; C1–C3 and the October 17 candidates approved 2026-10-22 (C1 closed as already implemented; C2, C3 and the 10-17 bundles are candidate pitches; C6, C7 are pitch drafts). No promotions, archives, revivals or backlog bundles applied; individual approval required.
