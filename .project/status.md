# Status

> Index only — hard cap **100 lines**. Detail lives per-pitch in `pitches/{slug}/`; history in `runs/`.

## Active pitches
| Pitch | Hill | Phase | Appetite | Last touched |
|-------|------|-------|----------|--------------|
| 04-greenfield-kickoff | parts A (v2.60.0) and B1 (v2.61.0) shipped; **Bun security high open, `/fix` still due**; B2 outline only, must split or cut | plan (B2), after the Bun `/fix` | big-batch | 2026-11-27 |
| 05-workspace-recovery | draft: Git-backed removal, cut from slim | shape | unset | 2026-11-25 |
| 06-workflow-v3-rollout | shaped; amended 2026-10-21 | shape | small-batch | 2026-10-21 |
| 07-archify-local-library | shaped: gitignore skill packages so Archify does not commit as source | shape | small-batch | 2026-11-26 |

Folder numbers are the **implementation order** (lower first, ranked 2026-11-25 by impact and dependencies):
- **00** package-less-ship-verification: shipped 2026-11-25 (v2.57.0); other numbers unchanged.
- **01** review-bench-hardening: shipped 2026-11-26 (v2.58.1).
- **02** workspace-slim: shipped 2026-11-26 (v2.59.1).
- **03** knowledge-distill: passed and parked 2026-11-27 (see Parked pitches).
- **04** greenfield-kickoff: New-project start; needs 00 and the install-identity fix first.
- **05** workspace-recovery: Real file removal with Git-backed restore; the riskiest, builds on what 02 reports.
- **06** workflow-v3-rollout: Sync installed projects to a pinned release, so it follows the next version.
- **07** archify-local-library: Enforce `.gitignore` rules for installed skill packages so Archify stays local instance data instead of tracked source.
- **Before 00, two small bug fixes with no pitch** (`_followups.md`): installed skill packages are committed and indexed (the largest size win); new installs inherit this repository's identity.

## Parked pitches
- **03-knowledge-distill** (2026-11-27, kept at `pitches/03-knowledge-distill/` because records link to it): summaries loaded more text; a single-topic loader does not fit real gate questions, which miss cards rather than load too many words. See `parking-decision.md` and `pilot/gate-comparison.md`.

## Recent ships (last 5)
| Pitch | Shipped | Notes |
|-------|---------|-------|
| greenfield-kickoff part B1 | 2026-11-27 | v2.61.0. Folder-in-project setup tells new from existing; starter-only asks. Copy-to-root still reports `unclear`; no live owner run. See `pitches/04-greenfield-kickoff/SHIPPED-part-b1.md` and `runs/2026-11-27-greenfield-kickoff-part-b1.md`. |
| greenfield-kickoff part A | 2026-11-27 | v2.60.0. Read-only project-state check and setup routing; install routes report `unclear`. **Shipped by owner override with a security high open (Bun preload); run `/fix` next.** See `pitches/04-greenfield-kickoff/SHIPPED-part-a.md` and `runs/2026-11-27-greenfield-kickoff-part-a.md`. |
| fix-install-inherits-bundle-identity | 2026-11-27 | v2.59.3. A new install that keeps the bundle's project specifics now fails setup validation; linked entry files now fail too. Verifier 2,471 pass, three skips. See `pitches/fix-install-inherits-bundle-identity/SHIPPED.md` and `runs/2026-11-27-fix-install-inherits-bundle-identity.md`. |
| fix-graphify-knowledge-query | 2026-11-26 | v2.59.2. Plain Graphify queries show up to five ranked knowledge paths before native traversal. Final verifier passed with 2,456 tests and three skips. See `pitches/fix-graphify-knowledge-query/SHIPPED.md` and `runs/2026-11-26-fix-graphify-knowledge-query.md`. |
| workspace-slim | 2026-11-26 | v2.59.1; read-only `workspace-report.mts` (disk and tracked size per area) and a knowledge index cut from 123,059 to 32,367 bytes at build; Orca build and 2-cycle audit, no open confirmed must-fix, cycle 1 security not independent; checkout suite 2,455 pass / 3 skip / 0 fail. Package-ignore fix still pending (LAH and climbing-lab track packages). See `pitches/02-workspace-slim/SHIPPED.md` and `runs/2026-11-26-workspace-slim.md`. |

## Open rabbit holes across active pitches
- Legacy source access, content and media totals, and school-site ownership.
- Identity, privacy, data residency, infrastructure, and operational vendor decisions.
- Canonical paths and redirect treatment for current school domains.

## Followups backlog
→ `.project/pitches/_followups.md` (includes six orca-balanced-role-pools followups, six state-project-sources followups, five state-project-depth followups, seven orca-api-currency-and-opencode2 followups, eight orca-bounded-control-receipts followups, nine archify-replaces-state followups and a "Superseded by archify-replaces-state" section; prior backlog retained)

## /cooldown reviewed 2026-10-21 (forced; 5 ships since; due now, no decision pre-approved; consolidation shipped)
Forced report: `runs/cooldown-2026-10-21-forced.md` (promoted C5, C8 rules; closed C4, C9 as already codified; bundled C6, C7 as candidate pitches). Earlier: `runs/cooldown-2026-10-21.md`. Corrected the stale October 8 counter: nine completed pitches followed the preserved October 17 review. C4–C9 decided; C1–C3 and the October 17 candidates approved 2026-10-22 (C1 closed as already implemented; C2, C3 and the 10-17 bundles are candidate pitches; C6, C7 are pitch drafts). No promotions, archives, revivals or backlog bundles applied; individual approval required.

## /cooldown due now (15 ships since the 2026-10-23 forced cooldown)
