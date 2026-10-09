# Deviations: orca-vendor-reconcile-integration

| ID | Scope | Plan said | Reality | Disposition |
|----|-------|-----------|---------|-------------|
| D1 | plan | cap 15 files | 16 files with the CLI (user chose the CLI knowing it is one over) | Accepted by the user 2026-10-08 |

## Audit cycle 1 (2026-10-08)

Dispatched: code-reviewer (sonnet) and security-reviewer (sonnet), fresh agents, scratch copy, whole-file review. independent: yes for both (canary caught: a disabled symlink guard planted in the scratch copy). read-only: verified by scratch copy (the repo was not given to them; `review-bench guard snapshot` taken before dispatch). cross-file interactions: signatures only; library internals were audited in earlier pitches. test-coverage-checker: not dispatched; author-run full suite (Node and Bun) listed as `author-run`.

| tier | finding | verified | disposition |
|---|---|---|---|
| none | canary `false && isSymbolicLink` (orca-run.mts:119) | planted by the author; the real file is intact and its 17 tests pass | not a defect |
| should-fix | grader `readDataset` used lstat then readFileSync with no parent-link check or bounded read | yes (read the code) | fixed: component walk, O_NOFOLLOW, dev/ino check, bounded read; new test pins `dataset refused` for a symlinked file, symlinked parent and oversize file (Node 10/10, Bun 10/10) |
| acknowledged | `reconcile` with no `--check` passes `runChecks: []` to the library (library decides); phase blocks always pass `--check` | n/a | logged for /cooldown |
| acknowledged | grader copies up to 200 chars of error text into its report (temp fixture paths only) | yes | logged |
| acknowledged | CLI prints the library outcome verbatim, including any launch stdout/stderr it carries | not traced | logged; trace in the live smoke |

Must-fix: 0.
