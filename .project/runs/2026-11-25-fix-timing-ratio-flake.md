# Run: fix-timing-ratio-flake (2026-11-25)

Bug fix on PR #14 • test-only • audit Orca Run `run_069a26f39106` (coordinator claude) • no hill chart (single implicit scope)

## Timeline
- **Trigger:** the new verifier failed at random on two SQL scaling-ratio tests (3 of 6 full runs).
- **/fix:** reproduced under CPU load. The first fix (alternating samples) failed more often than the old test under steady load and was
  discarded. The shipped one compares equal work in thread CPU time and measures again at the limit; the limit stays 3.
- **/audit:** code (claude) and security (codex) completed; the test coverage worker (opencode) was lost without a report. A fresh codex worker
  completed it later and found five missing guards and an untested floor; they were added and not re-reviewed. No confirmed must-fix.
- **/ship-pitch:** verifier exit 0 (2,387 pass, 3 skip, 0 fail).

## Records
`pitches/fix-timing-ratio-flake/` holds `log.md`, `audit-cycle-1.md` and `SHIPPED.md`.
