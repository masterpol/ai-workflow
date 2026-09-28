# Build log: independent-rereview-catch-up

## 2026-09-26 — S0 built (review bench)

`ai-framework/scripts/review-bench.js` (commands `prepare`, `guard snapshot|check`, `count`, `canary-check`, `record-check`)
and `review-bench.test.js`; `review-bench.js` added to the doctor's script list.

**Evidence**
- `node --check ai-framework/scripts/review-bench.js` → ok.
- `node --test ai-framework/scripts/review-bench.test.js` → 18 pass, 0 fail (100% lines, 86.9% branches).
- Mutation checks, 23 mutants applied one at a time to a scratch copy; all caught after two rounds:
  - Round 1 survivors and their fixes: the guard's `head` comparison, its `status` comparison, and symlink retargeting had no test.
    Added "an empty commit is not a clean guard", "an index-only change (status differs, bytes do not)", and "a retargeted symlink".
  - Removing canary application, the exactly-once rule, the red-baseline refusal, the canary-must-break-a-test rule, the
    `node`-only command rule, the secret-name/symlink/size refusals, the scratch-outside-repo rule, the ignored-path tree hash,
    the snapshot-outside-repo rule, the ref-format check, the bookkeeping and own-pitch exclusions, the ±3 line window,
    `independent: yes requires canary: caught`, and the hook/report skip list each make a test fail.
- `grep -c review-bench ai-framework/scripts/workflow-doctor.js` → 1; `workflow-doctor.js` READY; `setup-validator.js` READY.
- Checklist G applied to the bench itself: one guarded reader (symlinks, non-regular files, out-of-project realpaths,
  secret-shaped names, 512 KB bound); the only executables spawned are `git` and `node` (asserted by a test); the test command
  must start with `node` and runs only in the scratch copy; JSON-parse errors use a fixed message; terminal output is stripped
  of control characters.

**Found while building (test-caught, fixed)**
- `cli` took the command from `argv[0]`, so `--root <dir> <command>` was mis-parsed. Options and positionals are now separated first.

## 2026-09-26 — Concurrency found before S1 (build paused)

While measuring S0 with `count --since 42fbb58`, the count was 25 files, mostly not this pitch's. Another session has four small
pitches in build (`path-safety-hardening`, `collector-robustness`, `bundle-sync-marker-fix`, `state-quoted-fonts`) and has modified
`pitch-compress.js`, `pitch-compress.test.js`, `skill-registry.js`, `token-consumption.js`, `state-theme.js`, `state-html.test.js`,
`state-report.md`, `bundle-sync.js` and their tests, and rewritten `_followups.md`/`status.md`. Those are the review subjects of S1–S3.

Consequences for this plan:
1. The plan's critique skipped the cross-pitch check because this was the only active pitch; that is no longer true. A real
   cross-pitch overlap exists on all three subjects.
2. `guard check` cannot tell a reviewer's write from the other session's edit, so it would report false positives during any dispatch.
3. `count --since` cannot attribute changes; the 15-file cap and per-slice cap cannot be measured while another session writes the same tree.
4. Reviewing files while they are being changed reviews code that will not ship in that form.
Build stopped after S0; nothing in S1–S3 has been dispatched or patched.

## 2026-09-26 — S4 built ahead of S1–S3 (audit reviewer contract, first pass)

Decision at the S0 gate: wait for the four overlapping small pitches to ship before reviewing their code; do S4 meanwhile because it touches
no overlapping file (`3-audit.md`, `.claude/skills/audit/SKILL.md`, the Cursor copy).

**Evidence** (plan S4 exit criteria)
- `grep -c "independent:" ai-framework/workflow/phases/3-audit.md` → 3 (≥1); `grep -c "Reviewer contract"` → 1 in `3-audit.md`, 2 in the skill (≥1 each).
- Prompt template contains `whole-file review`, `hard limits`, `scratch`, `model`, `checklist`, `known defects` (each ≥1); `Verify before triage` appears twice.
- `diff .claude/skills/audit/SKILL.md .cursor/skills/audit/SKILL.md` → identical; `skill-vendors.js cursor-mirrors` → `"differs": []`.
- `wc -l < .claude/skills/audit/SKILL.md` → 80 (≤95). `workflow-doctor.js` READY, `setup-validator.js` READY, `bundle-sync.test.js` 16 pass.
- File count so far: S0 = 3, S4 = 3 → 6 of 15 (measured by name; `count --since` is unreliable while another session writes the tree).

The synthesis template's `Dispatched:` line now carries a per-role `independent:` field and an `Independence:` note.

## 2026-09-26 — S1 built (compaction re-review)

Five fresh reviewer dispatches over three audit cycles; record `review-compaction.md`, prompts in `prompts/`. The four overlapping pitches
were reported "edits stable", so the current working tree was reviewed as it stood.

**Evidence**
- All five canaries caught (`canary-check` exit 0); `guard check` clean after dispatches b–e; after dispatch a it flagged four paths written
  at 07:33:39 by the concurrent session, before the reviewer's prompt existed (07:33:50). Attributed by mtime, recorded in the record.
- 16 real findings verified with scripts (`v1`–`v8`), 13 fixed in 4 files (`pitch-compress.js`, `pitch-archive.js`, both test files), 1 owned by the
  concurrent pitch, 1 carried to S3, 1 recorded design limit.
- `node --test` on `pitch-compress`, `pitch-archive`, `state-snapshot`, `state-html` → 160 pass, 0 fail. Doctor READY, setup-validator READY.
- 41 mutants over three rounds; two survive by design.

**Found while building**
- The bench refused a red baseline in the scratch copy and exposed a fragile test of mine (a CLI test that depended on the working directory).
- My round-1 fix `sectionKeys` had a collision bug and my round-2 fixes left several checklist-G gaps; both were found by the re-review, which is exactly what the "re-review the fix" rule is for.
- Real-world evidence for a finding: the `metrics-report-dimensions` ledger created last week really did omit that pitch's "No-gos (this pitch)" section (P9).
- The other session's uncommitted `commitLedger` change introduced a transaction-context mismatch (P14); flagged, not fixed here.

## 2026-09-26 — S2 built (metrics collector re-review)

Five fresh reviewer dispatches over three audit cycles; record `review-metrics.md`, prompts in `prompts/s2-*.txt`. The concurrent
`collector-robustness` pitch still has uncommitted lock and identity edits in the same file; its area was excluded from every prompt.

**Evidence**
- All five canaries caught. Three earlier canary attempts were refused by the bench because they broke no scratch test (two interface values, and a
  weak regex weakening): each is a test gap, recorded.
- `guard check`: clean after dispatches d; flagged only the concurrent session's files after a, b, c and e. Three of those flagged paths fall inside the
  dispatch windows, so attribution is by content (unrelated pitches, a different topic, compaction archives), not by time; the record says so.
- 15 real findings verified with scripts (`w1`–`w7`); 12 fixed in 4 files (`token-consumption.js`, `token-report.js`, both test files), 1 guarded in the collector
  instead of the plugin, 1 left as a followup, 1 test gap recorded.
- `node --test` on the token suites plus state, pitch-compress and pitch-archive → 244 tests, 243 pass, 0 fail, 1 skipped. Doctor and setup-validator READY.
- The repo's real 417-completion snapshot still validates and keeps its totals.

**Found while building**
- My round-1 renderer sanitizer left string-typed numeric fields and stored records unvalidated; my round-2 validators accepted rows with missing counters, which
  became `NaN`, then `null`, and the next read wiped the whole history. Both were found by the re-reviews of the fixes, not by the first pass.
- The decision entry's "bounded snapshot" claim was false: a 3 MB `hook_event_name` produced a 3 MB snapshot.
- `writeAtomically` now writes a rejected snapshot aside as `token-consumption.json.rejected` instead of silently discarding its history.

## 2026-09-27 — S3 built (`/state` collector, theme, renderer re-review)

Five fresh reviewer dispatches over two cycles (cycle 1: three narrow single-file reviews + one cross-file
pass, as planned; cycle 2: one narrow re-review of the fixes themselves). Record `review-state.md`,
prompts in `prompts/s3-*.txt`.

**Evidence**
- Canary caught in every dispatch that touched the canaried file (`state-render.js`'s `esc()`); one
  dispatch (s3a, `state-snapshot.js`) had no canary in its own scratch and is recorded as such, not
  claimed as caught.
- 7 real findings verified with live PoCs by fresh reviewers: 3 must-fix, 3 should-fix, 1 acknowledged
  (not fixed, cosmetic). All 6 actioned findings fixed with regression tests, all mutation-verified.
- **Cycle 2 found the fix-verification cycle earns its keep**: two of the six round-1 fixes were
  incomplete. `M1`'s truncation fix covered `doneWorkSection` and the `statusMd` fact but missed two more
  per-pitch-item call sites in `pitchesSection` that still claimed `"observed"` unconditionally. `S3`'s
  error-leak fix covered `state-render.js`/`state-theme.js` but missed `state-snapshot.js`'s own three
  `realpathSync(root)` call sites (same defect class, sibling file, not touched by the original fix).
  Both gaps were found by an independent fresh re-review, not by re-reading my own diff — this is the
  exact failure mode the pitch exists to catch, now caught in itself.
- 386 tests across the full repo suite, 385 pass, 0 fail, 1 skipped. Doctor READY, setup-validator READY,
  knowledge graph CLEAN.
- Five HTML nits from the original project-state-report audit (never actioned) triaged: 4 followup
  (consolidated in `_followups.md`), 1 rejected (color-scheme already covered by the existing stylesheet).

**Found while building**
- My own S3 `prepare` calls initially omitted the contract docs (`project-state-report-design.md`, the
  pattern docs, `security.md`) from the reviewer's scratch copy — s3a's dispatch correctly reported every
  contract-doc-dependent check as "n/a (doc absent)" rather than guessing. Fixed for s3b/s3c/cross by
  adding the docs to `prepare --files`; not re-run for s3a (see Deviations).
- The first canary attempt on `state-theme.js` (a `<` → `<=` contrast-boundary mutation) was refused by
  the bench: it broke no scratch test. Recorded as a test gap, not fixed in this slice.

**Exit-criterion note:** `review-bench.js count --since 42fbb58` reports 45 (its `--pitch` filter does not
separate concurrent sessions' writes, same limitation already recorded in `hill.md` for S1/S2). The
trustworthy figure is the by-name tally in `hill.md`: 19 of 19 files, matching the twice-raised,
user-approved cap. `plan.md`'s original "≤4 slice / ≤9 cumulative" exit numbers predate both cap-raise
deviations and are superseded by them, not silently missed.

## 2026-09-27 — /audit cycle 1

Four parallel dispatches: security-reviewer, code-reviewer, test-coverage-checker, cross-pitch-conflict-checker.
Record `audit-cycle-1.md`.

**The headline finding:** `review-bench.js` — the tool every S0-S3 record's `read-only:`/`canary:` evidence
rests on — had never itself been independently reviewed, only self-tested. It had 4 real must-fix security
bugs: an ancestor-symlink escape past the "outside the project" check, unguarded symlink-following writes
(a live arbitrary-file-overwrite PoC), raw fs-error/absolute-path leaks on three read call sites, and an
unguarded FIFO read that hangs `canary-check` indefinitely (reproduced live, had to kill the process).
All four fixed in this file, all four mutation-verified (including re-reproducing the hang by reverting the
fix and killing the resulting stuck test run). This does not retroactively invalidate S1-S3's records — the
canary-plant-and-verify mechanism itself was confirmed sound by the security reviewer — but it means any
record whose `guard check` ran on a symlink-escapable path, before this fix, rested on a weaker guarantee
than its prose claimed.

**Cross-pitch conflict check surfaced one false positive, caught by verification, not passed through:** its
first read claimed S2 had implemented `collector-robustness`'s lock/identity logic despite instructions to
skip it. Re-checked against my own S2 prompt file (already excluding that code, present tense, dated before
any S2 fix) and `collector-robustness`'s own deviations.md (independently describing authoring that exact
logic) — refuted, dropped, recorded as a false positive rather than acted on. This is exactly what "verify
before triage" is for.

Zero must-fix findings remain open. Gate: Approve → /ship / Revise / Back to /build / Stop.
