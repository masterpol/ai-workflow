# Deviations: independent-rereview-catch-up

## S0 — 2026-09-26
- **Built the review bench as a script** (`review-bench.js` + test + doctor list = 3 files). The pitch named the bench as a place but not
  as code; the read-only guard, the canary rule and the file cap needed machinery to be machine-checkable. Counted against S0's budget of 3.
- **The canary is validated, not generated.** The main thread authors a `{file, find, replace}` per slice; the bench refuses one that
  matches other than exactly once, or that breaks no scratch test, or when the baseline is not green. The manifest sits beside the scratch
  tree so no reviewer input names it.
- **`count --since` is only trustworthy when this pitch is the sole writer.** See `log.md` (concurrency). Not fixed in S0: no tool change can
  attribute an edit to a session, so the pitch's file caps are unmeasurable while another session writes the same tree.
- **Plan assumption invalidated:** "no other active pitch" (cross-pitch check skipped at critique) no longer holds. Raised to the user at the
  S0 gate instead of continuing into S1.

## S4 — 2026-09-26
- **Built before S1–S3**, against the plan's dependency (S4 "records what S1–S3 showed"). Reason: the S0 gate decision was to wait for four
  overlapping pitches, and S4 overlaps nothing. The contract is grounded in the critique findings C1–C6 and the day's reviewer failures instead.
  **It will be amended after S1–S3** if the reviews show a rule that is wrong or missing; that amendment does not count as a new file.

## S1 — 2026-09-26
- **Verification budget applied per role-slice**, not per whole slice: S1 has three roles (security, whole-file code review, cross-boundary), each verified at most 8 claims.
- **Three audit cycles, five dispatches** (plan: ~3). The re-review of the fixes found real flaws in the fixes (a collision in my `sectionKeys`, several
  mandatory checklist-G gaps), so cycles 2 and 3 were used. The cap was reached with no must-fix open in reviewed code.
- **Round-3 fixes were not independently re-reviewed** (cycle cap): verified by PoC and mutation only. Recorded in `review-compaction.md`.
- **Checklist-G items count as must-fix**, per the tier markers in `security.md` ("Always do" items are must-fix if missing), even where a reviewer tiered them should-fix.
- **Fixed a shared-helper regression class on purpose:** `assertPlainPath` moved from `pitch-archive.js` into `pitch-compress.js` (exported) so both scripts use one implementation.
- **Stayed within the slice cap:** 4 files fixed (cap 4). The concurrent session's own edits to the same files are not counted.
- **Not fixed here, by decision:** `commitLedger`'s transaction context (owner `path-safety-hardening`), the ledger required-set design (followup), `/state` done-work truncation (S3).

## S2 — 2026-09-26
- **Fix cap reached exactly (4 files)**; the plugin and its test could not be edited within the cap, so the fake-model case (`undefined/undefined`) is guarded in
  the collector and the plugin hardening is a followup.
- **Total budget now 14 of 15.** S3 has one file of budget left; see the S2 gate.
- **New failure mode of my own approach:** a per-slice fix cap forces some fixes into the wrong layer (a collector guard for a plugin bug). Recorded rather than hidden.
- **Guard attribution by content, not time**, for three dispatches whose flagged files were written inside the dispatch window by a concurrent session; the guard cannot tell writers apart.
- **Edited a file another pitch has uncommitted changes in** (`token-consumption.js`); outside its lock and identity code only. Reconciliation followup written.
- **Round-3 changes were not independently re-reviewed** (cycle cap): verified by PoC and mutation checks only.

## S2 gate — 2026-09-27
- **User approved raising the appetite cap from 15 to 16 files**, at the S2 gate, so S3's must-fix
  (`state-snapshot.js` `done-work.md` truncation) ships with its regression test in this pitch rather than
  as a fix-without-a-test followup. `pitch.md`'s appetite line updated to record the approval.

## S3 gate — 2026-09-27 (second cap raise)
- **User approved a second cap raise**, total 16→19 and S3's per-slice fix cap 4→5, after the S3 independent
  re-review turned up three must-fix bugs across all three `/state` files (truncation reporting in
  `state-snapshot.js`, an ancestor-symlink bypass in `state-theme.js`, a null-element render crash in
  `state-render.js`), not just the one bug the first raise anticipated. Fixing all three with regression
  tests needs 5 files: `state-snapshot.js`, `state-snapshot.test.js`, `state-theme.js`, `state-render.js`,
  `state-html.test.js`. The three should-fix items land in the same 5 files at no extra file cost, so they
  are fixed in the same pass rather than deferred.
- **This is the second cap raise for this pitch.** Recorded honestly: the appetite estimate undercounted
  what independent re-review — the entire point of this pitch — would find. A `/cooldown` followup should
  ask whether a slice's file cap ought to reserve headroom for "review finds more than the known bug" as a
  standing pattern, not just for this pitch.

## S3 — 2026-09-27
- **No `guard snapshot` was taken before the five dispatches** (a process miss relative to S1/S2, which
  both snapshotted before every dispatch). Compensated for by comparing `git status` immediately before
  and after the dispatch sequence: the same set of pre-existing concurrently-modified files, nothing new.
  Recorded honestly as weaker evidence than a real `guard check` diff would have given.
- **s3a's scratch copy was missing the contract docs** (my `prepare --files` list omitted them on the
  first call); s3a's contract-bullet checks are recorded "n/a (doc absent)" rather than pass/fail. Not
  re-run — the missing checks were folded into the cross-file pass instead, which had the full doc set.
- **Two cap raises for this pitch** (15→16→19, per-slice fix cap 4→5), both user-approved. The second was
  because independent re-review — this pitch's whole purpose — found more must-fix bugs than the single
  bug the first raise was sized for. This is itself a `/cooldown` candidate: a slice's file-cap estimate
  should probably reserve headroom for "review finds more than the known bug," not just size to the known
  bug.
- **Five HTML nits triaged, not fixed** (no file budget left in this slice): 4 become one followup item,
  1 rejected with a reason. See `review-state.md`'s dedicated section.
- **Cycle-2 findings (the two incomplete fixes) were fixed but not given a third independent re-review
  cycle** — the big-batch cap is 3 cycles and this pitch used 2 for S3; the third-round patches are
  verified by regression test + mutation check only, the same standard as S2's round-3 fixes.
