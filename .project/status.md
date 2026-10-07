# Status

> Index only — hard cap **100 lines**. Detail lives per-pitch in `pitches/{slug}/`; history in `runs/`.

## Active pitches
| Pitch | Hill | Phase | Appetite | Last touched |
|-------|------|-------|----------|--------------|
| orca-vendor-orchestration | — | foundation bet; dispatch awaiting prerequisites | decomposed: foundation + dispatch | 2026-10-07 |
| orca-vendor-foundation | S1/S2 done; S3 uphill 0% | build; S2 gate pending | big-batch | 2026-10-07 |

## Parked pitches
_none_

## Recent ships (last 5)
| Pitch | Shipped | Notes |
|-------|---------|-------|
| shape-lite | 2026-10-07 | `/shape-lite` compressed framing (standalone or inline, mechanical escalation, 4 vendors) + `@AGENTS.md` import validation; v2.9.1; audit 2 cycles, 2 must-fix fixed. See `runs/2026-10-07-shape-lite.md`. |
| collector-robustness | 2026-09-27 | Kernel-held loopback lease replaces the age/PID lock file; async `recordEvent` awaited by CLI and plugin; legacy lock skips until removed. 117 tests (404 repo suite); audit: 1 must-fix fixed. **macOS only.** See `runs/2026-09-27-collector-robustness.md`. |
| path-safety-hardening | 2026-09-27 | Approved trusted-directory contract; shared ledger/archive recovery; 231 tests passed, audited, version 2.8.6. See runs/2026-09-27-path-safety-hardening.md. |
| independent-rereview-catch-up | 2026-09-27 | S0–S4, 268 tests (390 whole repo suite), 31 fixes across 3 re-reviewed subjects + the review tool itself. Outer /audit found 4 must-fix in `review-bench.js` (never independently reviewed until then), all fixed; 1 cross-pitch false positive refuted. Two user-approved cap raises (15→16→19). See `runs/2026-09-27-independent-rereview-catch-up.md`. |
| native-safety-feasibility | 2026-09-26 | S1 done; four scratch files / 386 lines; audit passed; measured containment/lock limits; production parents remain incomplete. |

## Open rabbit holes across active pitches
- Legacy source access, content and media totals, and school-site ownership.
- Identity, privacy, data residency, infrastructure, and operational vendor decisions.
- Canonical paths and redirect treatment for current school domains.

## Followups backlog
→ `.project/pitches/_followups.md` (26 items; 3 closed 2026-09-27 by `collector-robustness`)

## /cooldown due now
