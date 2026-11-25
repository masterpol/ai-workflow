# Status

> Index only — hard cap **100 lines**. Detail lives per-pitch in `pitches/{slug}/`; history in `runs/`.

## Active pitches
| Pitch | Hill | Phase | Appetite | Last touched |
|-------|------|-------|----------|--------------|
| 01-review-bench-hardening | re-shaped, validated 2026-11-25 | shape (bet pending) | small-batch | 2026-11-25 |
| 02-workspace-slim | re-shaped: report + smaller loaded text, deletes nothing | shape (bet pending) | big-batch | 2026-11-25 |
| 03-knowledge-distill | re-shaped: compact rules, originals kept (tandem) | shape (bet pending) | big-batch | 2026-11-25 |
| 04-greenfield-kickoff | shaped, critiqued, re-shaped | shape (bet pending) | big-batch | 2026-11-25 |
| 05-workspace-recovery | draft: Git-backed removal, cut from slim | shape | unset | 2026-11-25 |
| 06-workflow-v3-rollout | shaped; amended 2026-10-21 | shape | small-batch | 2026-10-21 |

Folder numbers are the **implementation order** (lower first, ranked 2026-11-25 by impact and dependencies):
- **00** package-less-ship-verification: shipped 2026-11-25 (v2.57.0); other numbers unchanged.
- **01** review-bench-hardening: Security and trust: inspecting a repo runs its programs; audit gates can pass wrongly.
- **02** workspace-slim: The current pain: shows what takes space, shrinks loaded text; deletes nothing.
- **03** knowledge-distill: Compact rules loaded instead of originals; tandem with 02, its graph change lands after 02.
- **04** greenfield-kickoff: New-project start; needs 00 and the install-identity fix first.
- **05** workspace-recovery: Real file removal with Git-backed restore; the riskiest, builds on what 02 reports.
- **06** workflow-v3-rollout: Sync installed projects to a pinned release, so it follows the next version.
- **Before 00, two small bug fixes with no pitch** (`_followups.md`): installed skill packages are committed and indexed (the largest size win); new installs inherit this repository's identity.

## Parked pitches
_None. `restore-vendor-adapters` was removed 2026-10-22 (premise invalidated 2026-10-08; its `_parked/` directory no longer exists)._

## Recent ships (last 5)
| Pitch | Shipped | Notes |
|-------|---------|-------|
| package-less-ship-verification | 2026-11-25 | v2.57.0; the verifier runs `.project/context/checks.toon` when present (invalid never falls back), `verify:base` works without the document viewer, test scripts get 20 min; passes in this repo with no manual substitute; audit 1 cycle, Orca workers, no confirmed must-fix, its fixes not re-reviewed, test review not independent; checkout suite 2,379 pass / 3 skip / 0 fail (not a clean clone). See `pitches/00-package-less-ship-verification/SHIPPED.md` and `runs/2026-11-25-package-less-ship-verification.md`. |
| rename-ship-command-to-finish | 2026-11-25 | v2.56.0; the ship phase is started with `/ship-pitch` (the host built-in `/ship` shadowed it); one command-to-phase mapping, guard test, `bundle-sync --apply` removes old adapters only when their content was shipped by the bundle; Orca build and 2-cycle audit (not independent, last fixes not re-reviewed); clone suite 2,353 pass / 10 skip / 0 fail; direct-check verifier route (package-less). See `records/shipped/rename-ship-command-to-finish.md` and `runs/2026-11-25-rename-ship-command-to-finish.md`. |
| orca-balanced-role-pools | 2026-11-25 | v2.54.0 (merged in PR #12, shipped after); Orca role pools pick the least-loaded member of the Run across both roles, optional `runId`, pick re-checked under the claim lock, unlaunchable members skipped; Orca build and 2-cycle audit (not independent); later code-review changes not audited; dispatch key errors now exit 2; clone suite 2,329 pass / 10 skip / 0 fail; direct-check verifier route (package-less). See `records/shipped/orca-balanced-role-pools.md` and `runs/2026-11-25-orca-balanced-role-pools.md`. |
| state-project-sources | 2026-11-25 | v2.55.0; `/state` project depth is vendor-neutral: schema from a Drizzle snapshot or SQL migrations in any dialect (`facts-sql.mts`, a pure reader), monorepo workspaces, fail-closed status, credential-shaped names refused; Orca critique, build (claude S1, opencode S2, codex S3) and audit (3 cycles, not independent, cycle-3 fixes not re-reviewed); route map cut; LAH shows 13 tables; clone suite 2,329 pass / 10 skip / 0 fail; direct-check verifier route (package-less). See `records/shipped/state-project-sources.md` and `runs/2026-11-25-state-project-sources.md`. |
| state-project-depth | 2026-11-24 | v2.53.0; `/state` project depth for installed projects (Drizzle ERD, two-level tree, stack; this bundle stays simple) and receipt-verified report reset in `bundle-sync --apply`; Orca build (codex A1/B1, claude A2) and audit (3 cycles, Orca workers, not independent, no canaries); a real schema broke the first ERD (fixed); 5 followups. See `records/shipped/state-project-depth.md` and `runs/2026-11-24-state-project-depth.md`. |

## Open rabbit holes across active pitches
- Legacy source access, content and media totals, and school-site ownership.
- Identity, privacy, data residency, infrastructure, and operational vendor decisions.
- Canonical paths and redirect treatment for current school domains.

## Followups backlog
→ `.project/pitches/_followups.md` (includes six orca-balanced-role-pools followups, six state-project-sources followups, five state-project-depth followups, seven orca-api-currency-and-opencode2 followups, eight orca-bounded-control-receipts followups, nine archify-replaces-state followups and a "Superseded by archify-replaces-state" section; prior backlog retained)

## /cooldown reviewed 2026-10-21 (forced; 5 ships since; due now, no decision pre-approved; consolidation shipped)
Forced report: `runs/cooldown-2026-10-21-forced.md` (promoted C5, C8 rules; closed C4, C9 as already codified; bundled C6, C7 as candidate pitches). Earlier: `runs/cooldown-2026-10-21.md`. Corrected the stale October 8 counter: nine completed pitches followed the preserved October 17 review. C4–C9 decided; C1–C3 and the October 17 candidates approved 2026-10-22 (C1 closed as already implemented; C2, C3 and the 10-17 bundles are candidate pitches; C6, C7 are pitch drafts). No promotions, archives, revivals or backlog bundles applied; individual approval required.

## /cooldown due now (8 ships since the 2026-10-23 forced cooldown)
