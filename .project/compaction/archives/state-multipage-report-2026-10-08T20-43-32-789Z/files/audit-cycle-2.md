# Audit cycle 2 — state-multipage-report

Dispatched via Orca (coordinator claude): security (1, codex worker, independent: yes) | test-coverage (1, opencode worker, independent: yes) | code, ux, eval, i18n, cross-pitch (not re-dispatched: cycle-1 findings in those areas were fixed and re-verified; no new surface)
Independence: both workers were fresh dispatches (no resume, no earlier findings in the brief). A canary was planted in the scratch copy only (the `isSecretName` call removed from the folder scan, state-structure.mts:108, which breaks one scratch test). Codex named the unused secret-name predicate (F2, cited :111, within 3 lines of the plant); OpenCode ran the tests, saw exactly that one failure and named the same cause: canary caught by both. Read-only: verified by `review-bench guard check` (clean, no changes) against a snapshot taken before dispatch, and workers were pointed at a scratch copy outside the project. Model family: differs from the author (Codex gpt-6.1-sol, OpenCode via Kimi K2.7 Code). Cross-file interactions: reviewed by security; test-coverage reviewer ran two suites only.
Orca notes: a worker shares the coordinator's checkout (`worktree reused`), so read-only was enforced by prompt + guard, not by isolation. `collect` refused Codex's first report (`invalid-files`) because it listed a report path outside the project; the slot was freed by `worker-release` (closes the idle terminal), then Orca reported exited+settled and the ledger was set to `settled` through the library transition. OpenCode's second brief forbade file lists and `collect` accepted it.

## Must-fix (blocks /ship)
| ID | Source | File | Issue | Verified |
|----|--------|------|-------|----------|
| M1 | security F1 | state-pages.mts:193 | A user's own `.project/reports/index.html` (or any generated-set name) is replaced with no ownership check | yes: my run with a hand-written index.html, content gone after `--apply` |
| M2 | security F7 | state-snapshot.mts:406 `facts()` / render value() | A deeply nested `state.json` (20,000 levels) overflows the stack: the whole render fails with a raw "Maximum call stack size exceeded." | yes: my run |

## Should-fix
| ID | Source | Issue | Disposition |
|----|--------|-------|-------------|
| S1 | security F2 (real part) | Decision source file names and base-skill directory names are not checked with `isSecretName`; the tree filter is (the tree part of F2 was the planted canary) | fix: one shared secret-name policy |
| S2 | security F3 | Evidence links test only the last path component; `.env.d/readme.md`, `credentials/store.md`, `secret.md`, `*.jks` are linkable | fix with the same shared policy |
| S3 | security F10 | Raw fs errors from source reads/atomic writes still reach CLI output with absolute paths | fix: code-only text |
| S4 | security F8 | `state.html` bypasses the 512 KB cap | fix or document with a test |
| S5 | test-coverage | 4 tests can pass for the wrong reason (installedVersion "intact" proxy; overwrite-of-generated-page not asserted; "unavailable" word only; per-file decision failure injected at helper level) | fix |
| S6 | test-coverage | Untested branches: frontend/backend detection, `--json` CLI, `value()` depth cap, per-file decision failure, base-skill cap | add tests |

## Acknowledged → log.md / followups
- F5 (path-based operations keep a race window after identity checks): Node has no `openat`; local-process attacker with write access only; residual accepted and written into state-report.md.
- F4 (snapshot metadata walkers lack ancestor containment): pre-existing code outside this pitch's diff; followup.
- F6 (mkdir before destination validation), F9 (directory enumeration work not capped before the visit cap): local cost only; followup.
