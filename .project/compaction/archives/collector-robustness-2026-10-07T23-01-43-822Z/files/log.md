# Build evidence

## S1 — 2026-09-26

`node --test ai-framework/hooks/scripts/token-consumption.test.js ai-framework/hooks/scripts/token-report.test.js ai-framework/hooks/scripts/opencode-plugin.test.js`: 59 tests, 58 pass, 1 skipped on macOS (Linux kernel identity fixture), zero failures.

New behavior tests distinguish colon-collision identities and agent IDs from types, count type-only completions independently, preserve explicit replay dedup, retain old live and EPERM locks, and reject a replacement installed during reclaim comparison. Existing v1/v2 migration fixtures preserve lifetime totals. Dead and malformed aged locks remain recoverable.

In-memory mutations changing structured identity to colon joining and disabling malformed-lock age reclamation each fail their focused test (exit 1). The Linux reused-PID test was not exercised on this macOS host; no claim of cross-platform reuse recovery or atomic replacement safety is made.

## C2 + C3 — 2026-09-27 (completion plan, approved)

**Built.** `ai-framework/hooks/scripts/metrics-lock.js` (new): a kernel-held loopback lease on `127.0.0.1`,
port derived from the metrics directory's real path (20000–29999), exclusive bind, no protocol, one ~1 s
monotonic deadline, fail-closed on any bind error other than "in use", never a fallback port or lock file.
`token-consumption.js`: `recordEvent` is now async and holds the lease across read, snapshot write and both
report writes; the old pathname lock, PID/age reclaim and `processStart` are removed; a present legacy
`.token-consumption.lock` makes every event skip with a fixed reason and is never touched. The CLI awaits;
both OpenCode plugin callbacks await inside their existing catch. Every test caller awaits (no mixed path).
README: one-writer contract, limits, and a two-step quiescent migration.

**Evidence.**
- `node --test metrics-lock.test.js` → 10 pass: cross-process contention and hand-over, a SIGSTOPped holder
  (stopped state confirmed by `ps`, not by elapsed time) keeps the lease, SIGKILL frees it, bounded wait,
  squatter on the derived port → skip, canonical-path endpoint, fail-closed non-"in use" error, release on
  return/throw/async throw, refused connections do not hold the port, 20 timed-out attempts leave no stray
  handle or unhandled event (the child exits on its own).
- C3: 6 writer processes released from one stdin barrier, 5 own events + 1 shared id each → exactly 31
  completions, 62 tokens, the shared id stored once; legacy lock → skip via API and CLI (exit 0, no path),
  file left byte-identical, recording resumes after removal; squatter → skip then resume; an EACCES inside
  the lease rejects and the next event still records; plugin stays best-effort on skip and rejection.
- Required suites: collector/report/plugin/skill-defaults + lock → 116 pass. Full repo suite: 403 tests;
  6 of 7 full runs 403/403; one run failed `token-report.test.js` "an unsafe agent id…" at 987 ms (see below).
  setup-validator READY, workflow-doctor READY, graph CLEAN, `git diff --check` clean.
- Mutations (scratch copy, each reverted): contender moves to another port → 7 fail; `reusePort` → 8 fail;
  no legacy-lock check → 2 fail; plugin event callback not awaited → 4 fail; plugin skill callback not
  awaited → 1 fail; CLI not awaited → 6 fail; release not in `finally` → 4 fail; non-"in use" error retried
  → 2 fail; no lease in `recordEvent` → 2 fail (incl. the 6-process lost-update test). **Survivor:** the
  guard that closes a server whose `listen` completes after its attempt timed out — unreachable without
  timing fault injection (a loopback bind finishes far inside the 50 ms floor). Recorded, not tested.

**Found while building.**
- My first mutation runs hung instead of failing: failed assertions left a test's own squatter server or a
  wrongly granted lease open. Fixed in the tests (`expectRefused` releases an unexpected lease; squatters
  close in `t.after`; a 2 s post-suite exit watchdog in both files so a leaked lease fails the file).
- The one full-suite failure (987 ms, just under the 1 s deadline) is most likely two unrelated temp
  directories hashing to the same port while a test held a long lease in another parallel file — the
  cross-project collision the contract accepts as a skip. Not confirmed (no output captured from that run).
- The approved plan's C2/C3 work was committed as `c948231 update` by someone other than this session
  mid-build; the later test hardening is uncommitted.
- Platform: macOS only. Linux and Windows are not verified.

## /audit cycle 2 — 2026-09-27

Record: `audit-cycle-2.md` (record-check ok). Four fresh sonnet reviewers plus one narrow re-review; every planted canary
caught. One real must-fix (F1: a late accept error on a granted lease closed it, letting a second writer in) — found by
the security reviewer as a should-fix, reproduced by the main thread, raised to must-fix, fixed with a test that fails
without the guard. Two should-fix (a vacuous timing bound; README overstating which programs block the lease) fixed.
Cross-pitch clean. Must-fix open: 0. Suites 117/117, full repo 404/404 ×3.
