# Code review: state-project-depth, cycle 2 (narrow)

Read-only review of the specified cycle-1 fixes, surrounding implementation and regression tests. Only this report was written in the repository. All copies, mutants, logs and proof fixtures are under `/private/tmp/state-c2-code-ixtxpfzu` or `/private/tmp/state-c2-reset-probe-*`. Known exclusions in the dispatch are not findings.

| severity | file:line | rule | failure scenario with command and output | fix |
|---|---|---|---|---|
| must-fix | ai-framework/scripts/bundle-sync.mts:348 | A gate must recheck the actual ownership witness; the new identity pin must identify the descriptor whose bytes were hashed. | The newly added `hashed = await fs.lstat(item.file)` samples the path **after** the final bounded read and hash. An atomic save in that interval supplies a new inode, which both new identity checks then accept. Run `bun /private/tmp/state-c2-code-ixtxpfzu/reset-pin-probe.mts`: output contains `"swapped": true`, `"pageExists": false`, and `Removed .project/reports/state.html; re-run /state after syncing.` The injected hash callback first computes the correct digest of delivered bytes, then renames a file containing `USER WORK` over the target before the new pin. The replacement and receipt are deleted. This is a defect in the new pinning implementation and leaves the cycle-1 deletion finding unresolved; it is **not** the excluded window after the final check and before unlink. | Return dev/ino from `fstatSync(fd)` together with the bytes from `readBounded`; compare the final pathname identity with that descriptor identity. Add a test swapping the target after its final read/hash but before the new asynchronous `lstat`, rather than only after that lstat. |

## Cycle-1 findings: fixed / not fixed

| Cycle-1 finding | Status | Evidence |
|---|---|---|
| Code reviewer: draft publication overwrites a concurrent edit or newly appearing file | Fixed for the specified identity/bytes and absent-destination cases | New destinations use hard-link publication; existing destinations require matching pinned identity and bytes immediately before rename. Both injected race scenarios pass; `publish-link` and `replace-check` mutants fail. The directory-pinning part of the broader cycle-1 recommendation was not independently verified in this narrow pass. |
| Code reviewer: FK references point at sanitized/truncated or omitted attributes | Fixed | References use the per-entity emitted-name map and require both source and target attributes to be emitted. `erd-reference` mutant fails the new invariant test. Real Archify validation passes. |
| Code reviewer: sanitization causes duplicate attribute names | Fixed | Deterministic `~N` suffixes allocate unique dot-free names per entity. `erd-unique` mutant fails the new invariant test; real validation passes. |
| Security reviewer: reset can delete a file swapped after hashing | **Not fixed** | The new check catches swaps after its pathname pin, but pins the wrong inode when a swap precedes that pin. Reproduction and correction are in the table above. The submitted late-swap regression does fail with `reset-identity` removed. |
| Security reviewer: absent destination is overwritten by rename | Fixed | Hard-link publication fails when the destination appears. `publish-link` mutant fails. |
| Security reviewer: self-FK makes the ERD fail validation | Fixed | Self-links are excluded from drawn relationships and counted in the note; `erd-self` mutant fails. The awkward-schema draft passes installed Archify validation. |
| Security reviewer: own undelivered draft cannot regenerate | Fixed | A matching `<name>.written-sha256` marker permits regeneration; edited bytes remain refused. `own-marker` mutant fails. |
| Security reviewer: receipt/draft path reads can follow a swapped link or over-read | Fixed by inspection | `readPinned` opens with NOFOLLOW/NONBLOCK where available, checks descriptor identity/type and bounds reads to limit+1. Separate descriptor-race mutation sensitivity was not established. |
| Test coverage: final reset rehash mutant survives | Fixed | New injected edit test fails with the rehash removed (`reset-rehash`). |
| Test coverage: composite primary/unique constraint ceilings untested | Fixed | New empty-constraint test independently fails both `primary-budget` and `unique-budget` mutants. |
| Test coverage: deliver → edit → sync → regenerate composition missing | **Not fixed** | `facts-gather.test.mts:509` still fabricates a receipt and regenerates without running bundle-sync. The edited bundle-sync integration test exercises unchanged/updated sync and preservation of other records, but never composes edited-draft retention with subsequent facts-gather regeneration. Existing cycle-1 coverage gap; not a new finding. |
| Reset on an unchanged apply | Fixed | Applied/pruned counts gate apply-time reset. The edited integration test verifies the unchanged case preserves the delivery; `reset-gate` mutant fails. |

Deferred rollout documentation and acknowledged doctor regression coverage were excluded as instructed.

## Verification

Baseline commands from the checkout (logs in the scratch directory):

- `bun test ai-framework/scripts/facts-gather.test.mts ai-framework/scripts/facts-project.test.mts`: **54 pass, 0 fail**, 3.18 seconds. All four installed Archify validation cases ran, including the new awkward-schema case.
- `bun test ai-framework/scripts/bundle-sync.test.mts --test-name-pattern 'report reset|apply changes no other'`: **26 pass, 26 filtered, 0 fail**, 1.06 seconds.

Mutation command: `python3 /private/tmp/state-c2-code-ixtxpfzu/mutate.py`. It mutates/restores only scratch source copies and invokes named regression tests there. **11/11 mutants killed**, each by an assertion failure (not import/setup failure): `erd-self`, `erd-unique`, `erd-reference`, `own-marker`, `publish-link`, `replace-check`, `reset-gate`, `reset-identity`, `reset-rehash`, `primary-budget`, `unique-budget`. Individual stdout/stderr is retained in `<mutant>.log`; the exact source replacements and test selectors are in `mutate.py`. Scratch Archify validation is intentionally absent; actual validation ran in the baseline checkout.

## Unverified

- Full suite, type checking, setup/graph/release checks and live project delivery are outside this narrow assignment.
- No OS scheduler stress test, FIFO race or directory replacement proof was performed. The reset proof uses deterministic runtime injection with real filesystem renames.
- No independent mutant was attempted for every descriptor-reader guard, every omission-note counter, or each suffix collision family. The new fixture covers underscore/dash/dot collisions, long reference names, omitted attributes and self-links; it does not cover every redaction/truncation collision permutation.
- Remaining final-check-to-rename/unlink windows and other dispatch exclusions were intentionally not reopened.

## Review summary

| Tier | Count |
|---|---|
| must-fix | 1 |
| should-fix | 0 |
| acknowledged | 0 |

Verdict: **BLOCK — the new reset identity pin does not establish ownership of the hashed inode.**
