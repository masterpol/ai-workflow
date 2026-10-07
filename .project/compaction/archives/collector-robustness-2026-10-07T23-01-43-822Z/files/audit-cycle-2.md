# Audit cycle 2 — collector-robustness (completion plan C2 + C3)

**Date**: 2026-09-27 · **Fan-out**: security-reviewer, code-reviewer, test-coverage-checker (each in its own
review-bench scratch copy with one planted canary), cross-pitch-conflict-checker (read-only on the repo), then one
narrow fresh re-review of the fixes (security-reviewer). ux, i18n, eval: not applicable.
`audit-cycle-1.md` is the 2026-09-26 audit of the retired S1 lock and is unchanged.

independent: yes
canary: caught
read-only: verified by review-bench guard (snapshot before each fan-out, check after; see Guard)
prompt-sha256: 723aa48ccb9790b0b31e04e054c67bea005b605f20082d407a89e23da026836b
model: sonnet (all five dispatches)
cross-file interactions: reviewed

`independent: yes` means fresh agents (not resumed, shown no earlier findings) of the same model family as the author,
each of which caught its planted defect. It is not proof of independence from the author's blind spots.

## Dispatches

| id | role | model | tool calls | prompt-sha256 (prompts/) | canary planted | canary |
|----|------|-------|-----------|--------------------------|----------------|--------|
| sec | security-reviewer, `metrics-lock.js` + lease boundary | sonnet | 19 | 723aa48c…026836b (`audit-sec.txt`) | `HOST` = `0.0.0.0` | caught |
| code | code-reviewer, async callers, plugin, README | sonnet | 12 | 883558a9…b51054 (`audit-code.txt`) | plugin skill callback without `await` | caught |
| cov | test-coverage-checker, exit criteria | sonnet | 39 | 0ca354c7…f437501 (`audit-cov.txt`) | `legacyLockPresent` returns false | caught |
| xpitch | cross-pitch-conflict-checker | sonnet | 15 | 870334b4…1671 (`audit-xpitch.txt`) | none (repo read-only) | n/a |
| fix | security-reviewer, re-review of the fixes (cycle 2) | sonnet | 9 | 4a0a334c…e6a64 (`audit-fix.txt`) | `acquire` ignores `waitMs` | caught |

The code review was light (12 tool calls). It walked the async callers and the README by grep and trace, but ran no
proof of concept beyond the suite.

## Findings (real defects only; each reviewer's canary finding is excluded)

| # | tier | source | finding | verified | disposition |
|---|------|--------|---------|----------|-------------|
| F1 | must-fix (raised from should-fix) | sec | `listenOnce`: an `error` after a successful listen (Node emits accept failures such as EMFILE this way) closed the listening socket, so the lease was silently lost while the holder was still writing; a second writer could then enter | main thread: captured the server, emitted `EMFILE`, a contender got the lease | fixed: a post-grant error is ignored and only `release()` closes; new test "a late accept error on a granted lease does not close it"; guard removal → that test fails; cycle-2 reviewer confirmed no other path closes a granted lease |
| F2 | should-fix | cov | "waiting for a busy lease is bounded" allowed 2 s for a 150 ms request, so ignoring the caller's `waitMs` passed | reviewer mutation, re-run by main thread | fixed: 100 ms request, < 700 ms bound; the `waitMs`-ignored mutation now fails; also the cycle-2 canary |
| F3 | should-fix | main thread (prompted by F1's analysis) | README said any program on the derived port makes the writer skip; on macOS a program listening on all interfaces does not block the `127.0.0.1` bind | node -e proof (wildcard listener, collector still acquires); reproduced independently by the cycle-2 reviewer | fixed: README names `127.0.0.1` and states the wildcard case; not a corruption risk (that program is not a metrics writer) |
| F4 | acknowledged | xpitch | `_followups.md` still carried the old "stale lock silently stops telemetry" item for the retired pathname lock | read | close or rewrite at /ship |
| F5 | acknowledged | cov | one flaky ENOENT on the first collector test in its scratch run, not reproduced in 4 reruns | not reproduced | consistent with known defect (2): three audit scratch copies were running lease-holding tests at once; covered by the existing followup |

Cross-pitch: no file, function or directory overlap with `path-safety-hardening` (which shipped during this cycle);
Claude and Codex hook wiring (`.claude/settings.json`, `.codex/hooks.json`) keep the CLI invocation shape; the doctor's
`recordEvent` presence check is unaffected.

## Checklist results (security.md §9 / checklist G, from sec, final state)

| item | result | evidence |
|------|--------|----------|
| G1 reader refuses symlinks/FIFOs/oversize | pass | `readSnapshot`, `currentCavemanMode`; `legacyLockPresent` only stats |
| G2 linear regexes, capped input | pass | names sliced before matching |
| G3 no project script executed | pass | only JSON data from the project |
| G4 no raw error text or absolute path | pass | CLI prints codes or bounded ASCII; skip reasons are fixed strings |
| G5 atomic, symlink-refusing writers | pass | `wx` + rename |
| Lease contract (127.0.0.1, exclusive, no protocol, no fallback, fail closed, monotonic bounded wait, held across writes, released in finally, legacy lock never reclaimed) | pass after F1 | sec contract table; F1 closed the one gap |

## Guard

Fan-out: `changed` listed this cycle's prompt files (written by the main thread after the snapshot), the three
main-thread fixes, and a concurrent session's `path-safety-hardening` ship (its pitch records, run log, `status.md`,
`CHANGELOG.md`, `VERSION`, `_followups.md`), attributed by content — the guard cannot tell writers apart. No reviewer
wrote to the repo. Cycle-2 re-review: only `prompts/audit-fix.txt` (main thread).

## Evidence

- Required suites: `metrics-lock`, `token-consumption`, `token-report`, `opencode-plugin`, `skill-defaults` → 117/117;
  `state-snapshot` + `state-html` → 92/92; full repo suite 404/404 in three consecutive runs.
- Mutation re-checks after the fixes: late-error guard removed → 1 fail; `waitMs` ignored → 1 fail.
- setup-validator READY, workflow-doctor READY, graph CLEAN, `git diff --check` clean.
- Must-fix open: 0.
