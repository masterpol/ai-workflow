# Run: state-report-redesign (2026-10-19)

Big-batch, 7 scopes, shipped as 2.33.0. Wave 2 (S2 repo shape, S3 theme, S4 charts) ran on three OpenCode workers in child worktrees under Orca run `run_4c0fd3ffbed7`; S3 and S4 merged by `orca-run reconcile`, S2 by reviewed `git apply` because another session held uncommitted edits in the same file. S1, S5, S6, S7 inline.

Plan, hill, deviations and audit: `.project/pitches/state-report-redesign/` (`plan.md` "Deviations logged during /build", `audit.md`, `audit-records/`). Outcome in `SHIPPED.md`.

Key facts: 200 state tests (baseline 170); 414 production LOC; audit 1 cycle, 0 real must-fix, 7 should-fix fixed; two audit scratch copies, canaries caught on the retry round; full Node suite first run 1817/1821 (1 load timeout), retry 1834/1837, 0 fail.

Lessons promoted: `counting-untrusted-labels-in-a-plain-object-inherits-prototype-keys`, `an-audit-scratch-copy-must-run-its-own-suites`.
