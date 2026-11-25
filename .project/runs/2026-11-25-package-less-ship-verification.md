# Run: package-less-ship-verification (2026-11-25)

Pitch: `.project/pitches/00-package-less-ship-verification/` • Version 2.57.0 • small-batch • audit Orca Run `run_8d450cc7ffed` (coordinator claude)

## Timeline
- **/plan:** running it was recorded as the bet. A spike showed the suite takes 97–111 s and plain uncommitted changes do not break the doctor
  tests, so the manifest runs the suite in the checkout.
- **/build:** S1 then S2 in the coordinator thread, no workers. The real verifier passed here with no manual substitute.
- **/audit:** the bound Orca Run belonged to other work; the owner chose a new one. Code (claude), security (codex) and test coverage
  (opencode). The third dispatch was refused at the cap of 4 because two stale entries from `run_89271af6dc37` held slots; it went out after
  one review was collected. No confirmed must-fix; should-fixes applied. One cycle: those fixes were not re-reviewed. The test review is
  `independent: no`. All workers released.
- **/ship-pitch:** the owner accepted both limits. Verifier exit 0 (2,379 pass, 3 skip, 0 fail). One earlier run failed on a timing-ratio test
  and passed on rerun. Checked in this checkout with uncommitted changes, not on an independent clone.
- **After close-out:** a further run on the closed tree exited 1 on the same timing test (another case, 3.52). Later results are on the pull request.

## Records
[hill](2026-11-25-package-less-ship-verification-hill.md) • reconciliation: `SHIPPED.md` and `audit-cycle-1.md` in the pitch folder • no `log.md`
(no build incident)
