# Audit: state-project-depth

Appetite: big-batch, cap 3 cycles (all 3 used).

**Dispatched as Orca workers** under Run `run_5412bcf5df8e`, by the owner's choice:
- Cycle 1: security (claude), code (codex), test-coverage (codex), cross-pitch (claude).
- Cycle 2: security, code and test-coverage, narrow.
- Cycle 3: security and code, narrow.

**Independence:** `independent: no` for every role. The workers reviewed the repository read-only, not scratch copies, so no canary was planted. A clean report from them is therefore not proof of a clean audit on its own. Every finding below was re-checked by the coordinator against the code, and most were also checked with a mutant.

**Workers:** all 9 were collected (`worker_done`) and released. No worker terminals are left open.

## Must-fix (blocks /ship)

| ID | Source | File | Issue | Cycle | Status |
|----|--------|------|-------|-------|--------|
| M1 | security C1-3, code C1-2/3 | `facts-gather.mts` `projectPanels` | The ERD fails Archify validation, so `/state` fails for the whole project. Causes: a self-referencing foreign key (common, for example `parent_id`); a foreign key pointing at a column that was truncated, cut by the 15-attribute cap, or in a table not shown; and distinct columns that clean to the same name (`a_b` and `a-b`). | 1 | **fixed**. Self-references are counted, not drawn. Emitted attribute names are unique per entity (`~N`). References name only emitted attributes, and the rest are counted in the note. Real `archify validate` passes on the awkward fixture. Removing the self filter fails 2 tests. |
| M2 | code C2, security C2 (medium) | `bundle-sync.mts` `resetStateReports` | The cycle-1 identity pin came from a `lstat` taken *after* the hash read, so a file swapped in that gap was still deleted. | 2 | **fixed**. The pin is now the `fstat` identity of the descriptor whose bytes were hashed, passed out of `readBounded`. The new test "pins the hashed descriptor" fails on the cycle-2 version. |
| M3 | code C3 | `facts-gather.mts` marker write | Any error while reading an existing `<name>.written-sha256` (for example `EACCES`) was treated as absence, and the file was overwritten. | 3 | **fixed**. Only `ENOENT` counts as absent. An `EACCES` test was added and fails without the fix. Author-verified only: the cycle cap is reached, so it was not re-reviewed. |

## Should-fix

| ID | Source | File | Issue | Disposition |
|----|--------|------|-------|-------------|
| S1 | code C1-1 (filed as must-fix, triaged should-fix because it needs a concurrent writer), security C1-2 | `facts-gather.mts` `writeReport` | A draft could be overwritten when it was created after the absent check, or edited after the ownership check. | fixed. A new draft is published with a hard link, which fails if anything appeared meanwhile. An owned draft is re-checked (identity and bytes) immediately before the rename. Three race tests were added, and the mutants of both identity halves fail. |
| S2 | security C1-1 | `bundle-sync.mts` reset | A file renamed over `state.html` after the hash check was deleted. | fixed (with M2). Two race tests were added (an edit after the preflight hash, a rename before the unlink). Both mutants fail. |
| S3 | security C1-4 | `facts-gather.mts` | A draft whose `validate` failed has no receipt, so it could never be regenerated (a dead end). | fixed. The tool records `<name>.written-sha256` and accepts it as ownership. The record is written only over an absent path or an earlier one-line hex marker. |
| S4 | security C1-5 | `facts-gather.mts` `ownedByReceipt` | The receipt and the draft were read by path, with no `O_NOFOLLOW` or descriptor identity. | fixed. `readPinned` uses `lstat`, then an `O_NOFOLLOW|O_NONBLOCK` open, an `fstat` identity match and a `limit+1` read. A test misdirects the descriptor. |
| S5 | coordinator (open at /build end) | `bundle-sync.mts` | The reset ran on every `--apply`, even one that changed nothing. | fixed. It runs only when the sync applies or prunes files (on a dry run, when it would). The test covers "nothing new keeps the delivery". |
| S6 | security C2 | `facts-gather.mts` | A hard-link failure of any kind was reported as `report-not-owned`, for example on a filesystem without links. | fixed. Only `EEXIST` refuses. Any other error re-checks that the path is absent, then renames. A test simulates `EPERM`. |
| S7 | test-coverage C1 | tests | Missing tests: the reset's re-hash guard, the composite-primary-key budget, a sync-then-regenerate end-to-end run, and the identity halves. | fixed. Tests were added, and each mutant now fails: the re-hash guard, the pk budget, `readPinned` identity and the recheck identity. |
| S8 | cross-pitch C1 | `workflow-v3-rollout` | Its `bundle-sync --apply` on LAH, RN and climbing will now reset `/state` deliveries. | defer: followup to note it in that pitch before its apply. The file is another pitch's record. |

## Acknowledged
- `workflow-doctor.mts` syntax-list entries have no regression assertion (test-coverage C1).
- Documented residuals:
  - `readdirSync` loads one directory before its budget applies.
  - A directory-swap race inside the `facts-project` listings (names only).
  - The path-based window between the final identity check and the `unlink` or `rename` (there is no `openat`), and the rename fallback on filesystems without links.
- Two tables with the same name bind a foreign key to the first one. This affects diagram integrity only, not a security boundary.
- The listing shows directory names such as `secrets` (names only, never contents).
- `assertNoSymlinkPath` now also lstat-checks its base. This is benign, because `cwd` is a realpath.

## Refuted or dropped
None. Every finding held on re-reading. Code C1-1's must-fix was re-tiered to should-fix (S1), because it needs a concurrent writer, and it was fixed anyway.

## Evidence (author-run)
- **Full suite on an independent clone with all changes before M3:** 2,211 pass, 7 skip, 0 fail. The skips include the 4 real-Archify cases, because the clone has no Archify installed.
- **After M3:** in this checkout, 36 of 36 `facts-gather` tests pass under Bun, including real Archify validation, and 111 of 111 across the three changed scripts pass under Node.
- **Checks:** `workflow-doctor` reports READY; `graphify --check`, `docs-links`, `setup-validator` and `changelog --check` pass.
- **Live run on a copy of LAH:** validate ok and deliver ok. The page shows the ERD of 9 tables (stale: 12 migrations, snapshot covers 3), the tree and the stack. The tool regenerates its own undelivered draft and refuses an edited one.

## Review records
### Security review, cycles 1 to 3
independent: no
canary: none (Orca workers reviewing the repo read-only, by owner choice)
read-only: verified by review-bench guard snapshot/check around each cycle. The only changes were the coordinator's own edits, made after each review returned (cycle 2: `bundle-sync` and `facts-gather` plus tests; cycle 3: `facts-gather` plus test). The reviewers wrote only to `audit-out/` (untracked, outside the guarded roots). The checks ran after the coordinator's fixes, so separation rests on timing, not on a clean diff.
prompt-sha256: 8950cc5212b588e33835516b9a76511a2015feee9c10341a07d7a04469dd7f87 (c1), a84231e83f445c25555feb2ca5d44e91563e2eca6af8a3d8bc66e97c508c27dc (c2), fd844e5345465634543dab3fdda5b82ed7213b0474a3f59cc414a2b21f522d62 (c3)
model: claude (Orca worker, vendor default model)
cross-file interactions: reviewed (facts-gather ↔ facts-project, bundle-sync ↔ Archify receipt fields, docs ↔ behaviour)
Checklist: security.md section 9 / checklist G walked, plus the three report and sync patterns. Proofs ran under /private/tmp.

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1 | should-fix | bundle-sync.mts:344-350 | reset unlinks a file swapped in after the hash | confirmed by reading and an injected test; fixed (M2/S2) |
| 2 | should-fix | facts-gather.mts:389 | a new destination is overwritten by rename | confirmed; fixed (S1) |
| 3 | must-fix | facts-gather.mts:237 | a self-FK fails Archify validate | confirmed with real validate; fixed (M1) |
| 4 | should-fix | facts-gather.mts:386 | an undelivered draft is a dead end | confirmed; fixed (S3) |
| 5 | should-fix | facts-gather.mts:349 | the receipt read has no descriptor bound | confirmed by reading; fixed (S4) |
| 6 | must-fix | bundle-sync.mts:341 (c2) | pin taken after the hash read | confirmed; fixed (M2) |
| 7 | should-fix | facts-gather.mts link/marker (c2) | link errors and the marker path | confirmed by reading; fixed (S3, S6) |
| 8 | — | c3 | all cycle-2 findings fixed, no new defects | consistent with tests |

### Code review, cycles 1 to 3
independent: no
canary: none (Orca workers, owner choice)
read-only: verified by review-bench guard snapshot/check (as above; the reviewers' only writes were their reports under `audit-out/`)
prompt-sha256: 3a90e7ed0a7ac307a6e930417244299881e966b1e3f00bccb9cd2bcc8a396fe4 (c1), c2d576dfe49f631f048af1a5d47a418f81814d5853a177ff74d377b4ae1caf14 (c2), 9814ff1089e59cb2cdeed59095b7b0dbdb456f5aa2826c0af603abd76dec7ea2 (c3)
model: codex (Orca worker, vendor default model)
cross-file interactions: reviewed (A1 interface consumed by A2; the reset against the Archify receipt producer; docs)

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1 | should-fix (filed must-fix) | facts-gather.mts:389 | ownership changes before publication | reproduced by the reviewer with an injected fs; fixed (S1) |
| 2 | must-fix | facts-gather.mts:250 | FK references truncated or omitted columns | reproduced with Archify's renderer; fixed (M1) |
| 3 | must-fix | facts-gather.mts:260 | colliding cleaned attribute names | reproduced; fixed (M1) |
| 4 | must-fix | bundle-sync.mts:348 (c2) | identity pin after the hash read | reproduced; fixed (M2) |
| 5 | must-fix | facts-gather.mts:462 (c3) | EACCES on the marker treated as absent | reproduced with a real chmod; fixed (M3), author-verified |

### Test coverage, cycles 1 and 2
independent: no
canary: none
read-only: verified by review-bench guard snapshot/check (as above); mutants ran in copies under /private/tmp
prompt-sha256: 089f37d5aad7e7a282cab0239444dc07a4558ee1a85debd1ac821fc849310778 (c1), 57812c65f2c719a914c6240470995a4659b5ce9c36637a65eccf609ce2ac5b30 (c2)
model: codex (Orca worker, vendor default model)
cross-file interactions: reviewed (exit criteria of A1, A2 and B1 mapped to tests)

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1 | should-fix | bundle-sync.mts:344 | the re-hash guard mutant survives | confirmed; test added, mutant now fails |
| 2 | should-fix | facts-project.mts:89 | the pk-constraint budget mutant survives | confirmed; test added, mutant now fails |
| 3 | should-fix | facts-gather.test.mts:464 | no sync-then-regenerate end-to-end test | confirmed; test added |
| 4 | should-fix (c2) | facts-gather.mts:384, 437 | identity-half mutants survive | confirmed; tests added, both mutants fail |
| 5 | acknowledged | workflow-doctor.mts:1047 | doctor list entries have no assertion | confirmed; acknowledged |

### Cross-pitch, cycle 1
independent: no
canary: none
read-only: verified by review-bench guard snapshot/check
prompt-sha256: 3f5fcf5fdc3e01f23d0044b0a258460d902cf80451fc673094b979f33217c51a
model: claude (Orca worker, vendor default model)
cross-file interactions: reviewed (this diff against the plans and pitches of the three other active pitches)

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1 | should-fix | bundle-sync.mts vs workflow-v3-rollout | the rollout's apply now resets `/state` deliveries | confirmed (adjacent, no shared file); deferred to a followup |
| 2 | — | — | package-less-ship-verification and review-bench-hardening: disjoint | consistent with `git status` |
