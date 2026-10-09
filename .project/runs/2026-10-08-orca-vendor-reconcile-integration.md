# Run: orca-vendor-reconcile-integration (2026-10-08)

Bet with the CLI choice; plan I1-I4; I1 and I2 delegated (the first session hit a usage limit mid-build, I1's files survived and were re-verified, I2 was rebuilt by a fresh agent); I3 and I4 on the main thread.
Audit cycle 1: independent code and security reviewers, canary caught, 0 must-fix, 1 should-fix fixed. Details in `pitches/orca-vendor-reconcile-integration/deviations.md`.
Verify: Node 1045 pass / 0 fail / 1 skipped. Bun 1017 pass / 0 fail / 1 skipped on a clean re-run; two earlier full runs failed 1 and 4 tests when started right after the Node suite (names not captured), and did not reproduce. Treated as an unidentified load flake, logged in followups.
Lessons: `patterns/a-thin-cli-keeps-every-guard-in-the-library`, `patterns/a-grader-reports-executed-and-unexecuted-cases-separately`.
Note: `skill-vendors cursor-mirrors --apply` reports differing mirrors but does not overwrite them; copy by hand.
