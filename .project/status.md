# Status

> Index only — hard cap **100 lines**. Detail lives per-pitch in `pitches/{slug}/`; history in `runs/`.

## Active pitches
| Pitch | Hill | Phase | Appetite | Last touched |
|-------|------|-------|----------|--------------|
| path-safety-hardening | done | audit in progress; approved trusted-directory contract | small-batch | 2026-09-27 |
| collector-robustness | downhill 75% | incomplete; re-plan needed; edits stable | small-batch | 2026-09-26 |

## Parked pitches
_none_

## Recent ships (last 5)
| Pitch | Shipped | Notes |
|-------|---------|-------|
| independent-rereview-catch-up | 2026-09-27 | S0–S4, 268 tests (390 whole repo suite), 31 fixes across 3 re-reviewed subjects + the review tool itself. Outer /audit found 4 must-fix in `review-bench.js` (never independently reviewed until then), all fixed; 1 cross-pitch false positive refuted. Two user-approved cap raises (15→16→19). See `runs/2026-09-27-independent-rereview-catch-up.md`. |
| native-safety-feasibility | 2026-09-26 | S1 done; four scratch files / 386 lines; audit passed; measured containment/lock limits; production parents remain incomplete. |
| state-quoted-fonts | 2026-09-26 | S1 done; bounded quoted fonts and one same-file variable hop; audit passed. |
| bundle-sync-marker-fix | 2026-09-26 | S1 done; repeated runs retain effective bases for unapplied files; audit passed. |
| project-state-report | 2026-09-25 | T1–T2, 87 tests (270 whole surface); 4 must-fix over 3 audit cycles incl. one regression a fix introduced, all fixed. Codex/Cursor **unverified in a host**; scrub is best-effort. Compacted 2026-09-25: see `done-work.md` (archive in `.project/compaction/`). |

## Open rabbit holes across active pitches
- Legacy source access, content and media totals, and school-site ownership.
- Identity, privacy, data residency, infrastructure, and operational vendor decisions.
- Canonical paths and redirect treatment for current school domains.

## Followups backlog
→ `.project/pitches/_followups.md` (21 items; 3 closed 2026-09-27 by `independent-rereview-catch-up`)

## /cooldown due in: 1 ship
