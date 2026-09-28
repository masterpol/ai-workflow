# Audit cycle 1: independent-rereview-catch-up

**Date:** 2026-09-27 · **Fan-out:** security-reviewer, code-reviewer, test-coverage-checker,
cross-pitch-conflict-checker (≥2 other active pitches share files with this one: `path-safety-hardening`,
`collector-robustness`, plus the already-shipped-but-uncommitted `state-quoted-fonts`). ux-reviewer,
i18n-checker, eval-runner: not applicable (no UI scope built or redesigned here, no i18n strings, no
`lib/ai/prompts/` touched).

**Scope.** This pitch's own S0–S3 deliverables only: the new `review-bench.js`/`review-bench.test.js`
tool, S1's fixes to `pitch-compress.js`/`pitch-archive.js` and their tests, S2's fixes to
`token-consumption.js`/`token-report.js` and their tests, S3's fixes to `state-snapshot.js`/
`state-theme.js`/`state-render.js` and their tests, and S4's `3-audit.md`/audit `SKILL.md` pair. S1–S3
already ran their own extensive independent re-review process (5 dispatches and up to 3 cycles each,
recorded in `review-compaction.md`/`review-metrics.md`/`review-state.md`); this cycle's marginal job is
what that process could not check on itself: `review-bench.js` (the tool those records' evidence rests
on, never independently reviewed until now), documentation accuracy, and real cross-pitch overlap in the
shared working tree.

## Findings and triage

| # | Tier | Source | Finding | Verified | Outcome |
|---|---|---|---|---|---|
| 1 | must-fix | security | `review-bench.js`'s `inside(root, out)`/`inside(root, target)` checks (`prepare --out`, `guard --file`) compare the literal path, not its realpath; an ancestor directory can be a symlink back into the project even when the leaf doesn't exist yet, defeating "scratch dir must be outside the project" | Live PoC (reviewer's, re-run by main thread): `.project`/scratch-parent symlinked back into the project; `prepare`/`guard snapshot` proceeded and wrote inside the real tree | fixed: `realOrNearest()` resolves the longest existing prefix's realpath before every `inside()` check; 1 test, mutation-verified |
| 2 | must-fix | security | `prepare`'s manifest write and `guard snapshot`'s write use plain `fs.writeFileSync`, following any existing symlink at the target — an arbitrary-file-overwrite primitive | Live PoC: a symlink at `--file` pointed at a victim file outside the project; `guard snapshot` silently overwrote the victim's content | fixed: `writeGuarded()` refuses an existing symlink/non-regular target and writes via temp+`wx`+rename; 1 test, mutation-verified |
| 3 | must-fix | security | `guard check`'s snapshot read, `canary-check`'s manifest/report reads, and `record-check`'s `lstatSync` are not wrapped the way the tool's own `readGuarded` is; a missing file throws a raw fs error (absolute path included) past every `fail()` and out through the top-level catch — violates the tool's own docstring claim ("no raw error text") and checklist G4 | Live PoC: `record-check` on a nonexistent path printed `ENOENT: … lstat '/private/…'` to stderr | fixed: `readGuardedAbsolute()` used at all four call sites, returning a fixed `Cannot read <label>` message; 2 tests, mutation-verified |
| 4 | must-fix | security | `canary-check`'s manifest/report reads had no symlink/non-regular check and no size cap before buffering the whole file — a FIFO at `--report` hangs the process indefinitely | Live PoC (reviewer's): `mkfifo` at `--report`, `canary-check` hung, had to be killed. Re-reproduced by the main thread via mutation (reverting the fix hung the real test suite; process killed to recover) | fixed: same `readGuardedAbsolute()` as #3 closes this too (non-regular file refused before any read); 1 dedicated test proves the FIFO case returns in <2s instead of hanging |
| 5 | acknowledged | security | Files over 2 MB in `guard`'s tree walk are tracked by `size:mtime`, not content hash; a same-size, same-millisecond-mtime swap would evade detection | reviewer's analysis, not independently reproduced | not fixed: low priority for this internal tool; would need attacker-controlled write+timestamp precision the guard already exists to catch in the first place |
| 6 | acknowledged | security | `guard`/`prepare` are genuine technical controls for what they check, but nothing in the tool *forces* an orchestrator to call `guard` around every dispatch, and no reviewer subprocess is sandboxed from touching the real project beyond being told the scratch path | reviewer's analysis | not fixed (would need process-level sandboxing, out of appetite for this pitch); recorded as a followup — see below |
| 7 | refuted | cross-pitch (initial claim) | Cross-pitch-conflict-checker's first read claimed S2 "implemented `collector-robustness`'s lock and identity changes despite audit instruction to skip them" | Re-checked by the main thread: `prompts/s2-s2a.txt` (written before any S2 fix, timestamped 2026-09-26) already says "another pitch is rewriting exactly those [lock/identity functions]" — present tense, meaning that code predates S2. `collector-robustness`'s own `deviations.md` independently documents authoring that exact device/inode-reclaim and structured-identity-tuple logic as its own work. The checker had no way to separate authorship in a shared, uncommitted file — same class of limitation as `review-bench.js count`'s own documented caveat | **false positive, dropped**; the real, already-recorded fact (both pitches' changes coexist in one uncommitted file and need reconciliation at commit time) was already a followup before this cycle and needs no new action |
| 8 | acknowledged | cross-pitch | `review-state.md`'s claim that S3 and `state-quoted-fonts` "touch different functions and do not overlap" was characterized by the checker as "technically incorrect" because both edit `parseFontFamily()` | Re-checked: the actual claim in `review-state.md` names four specific functions (`insideProject`, `readSettings`, `themeChanges`, `safeTheme`'s font branch) as not overlapping — it does not claim the whole file is disjoint, and `parseFontFamily()` was correctly excluded from that claim. The checker's summary of the record was imprecise, not the record itself | no finding; record stands as written, confirmed accurate |
| 9 | pass | cross-pitch | `pitch-compress.js`/`pitch-archive.js` vs. `path-safety-hardening`: S1 already implements the path-safety invariants that pitch was building (`assertPlainPath`, `checkDestination`, guarded `walk`, atomic restore) | 75 tests pass; checker traced both sides' functions | compatible; any additional transaction-context work `path-safety-hardening` still owns is the pre-existing `commitLedger` followup, unchanged by this cycle |
| 10 | pass | code review | `review-bench.js` code quality against `coding-standards.md`/`boundaries.md`; the CLI's "`--root` before command" bug class does not reproduce in the current parser | traced both argument orderings | no finding |
| 11 | pass | code review | S4's reviewer contract (`3-audit.md`, `SKILL.md`) accurately reflects what S1–S3's records actually did; `.claude`/`.cursor` copies byte-identical | compared contract's 8 rules against all three records line by line | no finding; minor gaps noted (verification-budget number and canary-refusal handling aren't spelled out in the contract itself) are followups, not contradictions |
| 12 | pass | test coverage | 6 spot-checked fixes across S1/S2/S3 (unicode slugs, restore symlink refusal, FIFO snapshot guard, mode-field bounding, 64 KB truncation status) each independently reverted and reconfirmed caught by their regression test | live revert + test run per fix | no finding; no untested new public function found |

## Verification

Every must-fix finding above was re-read in the real file (not trusted from the report), then fixed, then
proven by a scratch-copy mutation of the exact fix: reverting each of the four closed the corresponding new
test, including reproducing finding 4's hang live and killing the stuck process to recover. `record-check`'s
size-limit test message was updated to match the new, more specific error text (`too large` instead of the
old combined `regular file` match) — a deliberate, documented behavior change, not a silent regression.

## Evidence

- `node --test ai-framework/scripts/review-bench.test.js`: **22 tests, 22 pass** (18 existing + 4 new).
- Full repo suite (`ai-framework/scripts/*.test.js ai-framework/hooks/scripts/*.test.js`): **390 tests, 389
  pass, 0 fail, 1 skipped**.
- Doctor READY, setup-validator READY.
- Files touched by this cycle's fixes: `ai-framework/scripts/review-bench.js`,
  `ai-framework/scripts/review-bench.test.js` — both already counted in the S0 file budget; **no new files,
  cap stays at 19 of 19.**

## Followups opened

- `review-bench.js`'s "read-only" guarantee for a reviewer subprocess is convention (the scratch path is
  named in the prompt) plus the now-hardened `guard`/`prepare` detective controls, not process-level
  sandboxing (finding 6). Worth a `/cooldown` question about whether this internal tool's threat model
  should extend that far, given it is not exposed to untrusted end users.
- The `size:mtime` tracking for files over 2 MB in `guard`'s tree walk (finding 5) is a known-limitation
  note, not an open action.
