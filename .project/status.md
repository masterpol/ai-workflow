# Status

> Index only — hard cap **100 lines**. Detail lives per-pitch in `pitches/{slug}/`; history in `runs/`.

## Active pitches
| Pitch | Hill | Phase | Appetite | Last touched |
|-------|------|-------|----------|--------------|
| workflow-v3-rollout | shaped; amended 2026-10-21 | shape | small-batch | 2026-10-21 |
| package-less-ship-verification | draft | shape | small-batch | 2026-10-22 |
| review-bench-hardening | draft | shape | small-batch | 2026-10-23 |
| orca-balanced-role-pools | audit done (2 cycles, 0 must-fix open) | audit → ship | big-batch | 2026-11-24 |

## Parked pitches
_None. `restore-vendor-adapters` was removed 2026-10-22 (premise invalidated 2026-10-08; its `_parked/` directory no longer exists)._

## Recent ships (last 5)
| Pitch | Shipped | Notes |
|-------|---------|-------|
| state-project-depth | 2026-11-24 | v2.53.0; `/state` project depth for installed projects (Drizzle ERD, two-level tree, stack; this bundle stays simple) and receipt-verified report reset in `bundle-sync --apply`; Orca build (codex A1/B1, claude A2) and audit (3 cycles, Orca workers, not independent, no canaries); a real schema broke the first ERD (fixed); 5 followups. See `records/shipped/state-project-depth.md` and `runs/2026-11-24-state-project-depth.md`. |
| orca-api-currency-and-opencode2 | 2026-11-23 | v2.52.0; contract snapshot + offline doctor check, capability preflight, OpenCode agent id from `orca agent installed` (opencode2 was wrong on this host), request ids and `--timeout-ms`; audit fixed a non-string failedStage gap; three real captures; R4b-2 dropped; 15 scopes, 2 audit cycles; Orca 1.4.272 not yet installed |
| orca-bounded-control-receipts | 2026-11-23 | v2.51.3 + 2.51.4; the Orca identity lookup is bounded (live and kept-open worker terminals, per state, concise view, page size halves on an oversize page, own reason `worker-list-too-large`) and a refused worker start keeps its code as `launch-failed:refused:<code>` with ownership unchanged; S3 (capture a real refusal receipt) deferred; audit 0 must-fix, 5 should-fix fixed, not independently re-reviewed; Node 2101 pass / 0 fail / 3 skips; direct-check verifier route (package-less); built on the unpushed `feat/archify-replaces-state` branch and still to be committed on its own. See `records/shipped/orca-bounded-control-receipts.md` and `runs/2026-11-23-orca-bounded-control-receipts.md`. |
| archify-replaces-state | 2026-11-23 | v2.51.0 (+ separate Orca fixes 2.51.1, 2.51.2); `/state` is now `facts-gather.mts` plus the pinned Archify skill (v3.3.0, commit af3aaf3c, installed per checkout); 25 state scripts and 3 datasets removed, five shipped records retargeted with owner approval; audit 0 must-fix, 11 should-fix fixed, not independently re-reviewed; Node 2087 pass / 0 fail / 3 skips; direct-check verifier route (package-less); Orca runner fix is a separate change awaiting its own commit. See `records/shipped/archify-replaces-state.md` and `runs/2026-11-23-archify-replaces-state.md`. |
| connected-memory-consolidation | 2026-10-23 | v2.42.0-2.49.0; four tracks shipped under separate receipts (P1 process graph, P2a v2 schemas, P2d installed sync, P2c legacy upgrade): 20/20 scopes, all 46 legacy pitches upgraded to v2 outcomes with v1 siblings and archives preserved; Node 2709 pass / 0 fail / 3 skips; owner-approved exceptions: TTR 9.74% retained bytes, state-history fallback deferred to P2b; P2a overrun and author-run final evidence disclosed; cooldown due. See `records/shipped/connected-memory-consolidation.md` and `records/consolidation/rollup.md`. |

## Open rabbit holes across active pitches
- Legacy source access, content and media totals, and school-site ownership.
- Identity, privacy, data residency, infrastructure, and operational vendor decisions.
- Canonical paths and redirect treatment for current school domains.

## Followups backlog
→ `.project/pitches/_followups.md` (includes five state-project-depth followups, seven orca-api-currency-and-opencode2 followups, eight orca-bounded-control-receipts followups, nine archify-replaces-state followups and a "Superseded by archify-replaces-state" section; prior backlog retained)

## /cooldown reviewed 2026-10-21 (forced; 5 ships since; due now, no decision pre-approved; consolidation shipped)
Forced report: `runs/cooldown-2026-10-21-forced.md` (promoted C5, C8 rules; closed C4, C9 as already codified; bundled C6, C7 as candidate pitches). Earlier: `runs/cooldown-2026-10-21.md`. Corrected the stale October 8 counter: nine completed pitches followed the preserved October 17 review. C4–C9 decided; C1–C3 and the October 17 candidates approved 2026-10-22 (C1 closed as already implemented; C2, C3 and the 10-17 bundles are candidate pitches; C6, C7 are pitch drafts). No promotions, archives, revivals or backlog bundles applied; individual approval required.

## /cooldown due in: 1 ship (4 since the 2026-10-23 forced cooldown)
