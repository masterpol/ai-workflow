# state-project-depth: audit cycle 2 (narrow), security-reviewer

Read-only re-check of the cycle-1 fixes. Proofs ran only in a copy under `/private/tmp/c2`; nothing in the repo was edited.
Baseline: `bun test facts-gather.test.mts facts-project.test.mts` gives 54 pass / 0 fail, and `bun test bundle-sync.test.mts` gives 52 pass / 0 fail.

## New defects introduced by the fixes

| Severity | file:line | Rule | Failure scenario (command and output) | Fix |
|---|---|---|---|---|
| medium | `bundle-sync.mts:341-343` (`resetStateReports`, pin taken with `await fs.lstat(item.file)` after the re-hash) | Checklist G: re-inspect the target by identity before removing; pattern `a-report-never-overwrites-a-file-it-did-not-write` | The C1 fix pins identity from a fresh `lstat` taken **after** `readBounded` has closed its fd, not from the fstat of the descriptor that was hashed. A file renamed over `state.html` after the re-hash read and before that `lstat` becomes the pinned file, so the later identity check passes and `unlinkSync` deletes the user's file. Narrower than C1 (one await instead of two), but the C1 scenario is still reachable. Proof: in `/private/tmp/c2`, copy of the repo's "renamed over the hashed one" test with the swap hook moved from `lstatSync` to the `closeSync` of the 2nd `state.html` open (right after the hash read). `bun test bundle-sync.test.mts -t PROOF` fails: `ENOENT: no such file or directory, open '.../target/.project/reports/state.html'` at the assertion `read(target, state.html) === "USER WORK"`. The swap had happened and the swapped-in file was removed. The repo's own test does not catch this because its hook fires on the `lstatSync` that comes after the pin. | Return `{ bytes, dev, ino, mtimeMs }` from `readBounded` (it already has `opened = fstatSync(fd)`), use those as `hashed`, and compare to the final `lstatSync`. Drop the extra `fs.lstat` pin. Add a test that swaps right after the hash read (the `closeSync` hook above). |
| low | `facts-gather.mts:431-445` (hard-link publish) | Availability | `linkSync` failure of any kind, including `EPERM`/`ENOTSUP` on filesystems without hard links (FAT/exFAT, some SMB/FUSE mounts), is reported as `report-not-owned: <name>`, although the destination is absent. `/state` then fails with a misleading error on such a project directory. Reasoned from the code (`catch { throw new FactsError(report-not-owned) }`), not run, as the sandbox filesystem supports links. | Throw `report-not-owned` only for `EEXIST`. On other codes, fall back to `renameSync` after an `lstat`-absent recheck, or report a distinct error (`report-link-unsupported`). |
| low | `facts-gather.mts:455-460` (marker write) | Checklist G: touch only what the writer wrote | After the draft is published the marker `<name>.written-sha256` is written with `rename` over whatever regular file is at that path, with only a symlink check. A user file with that name is silently overwritten. If the marker path is a directory, `renameSync` throws after the report was already published, so the CLI exits in error with a written draft. Reasoned from the code, not run. The name is tool-specific, so the likelihood is low. | `lstat` the marker: accept only absent or a regular file; if it is anything else, skip the marker instead of throwing. Write it with `wx` plus rename only when absent or already tool-owned. |
| low (test gap) | `facts-gather.test.mts` (tests for the recheck) | Test coverage | Mutant M3b (drop `|| again.ino !== owned.ino` from the recheck before `renameSync`) leaves all 54 tests green. The byte-hash comparison masks it, so the identity half of "identity+bytes recheck" is untested. | Add a case that replaces the draft with a different inode holding identical bytes between the ownership check and the recheck, and expects `report-not-owned`. |

No high or critical defects were found.

## Cycle-1 findings: fixed / not fixed

| Cycle-1 finding | Status |
|---|---|
| medium `bundle-sync.mts` file identity not pinned before unlink | **Partially fixed.** The race from a swap between the final checks and the unlink is closed (mutant M4 caught). A swap between the hash read and the new `lstat` pin is still deleted (see the medium row above). |
| medium `facts-gather.mts` new destination replaced by `renameSync` | **Fixed.** A new draft is published with `linkSync`, which fails on `EEXIST`. Mutant M2 (rename instead of link) is caught by the "created after the absent check" test. |
| medium self-referencing FK breaks Archify `validate` | **Fixed.** Self-references are dropped and counted in the note. Mutant M1 is caught by two tests, including the real `archify validate`. A case-variant fuzz (`ID`/`id`/`Id`, `x~2` duplicates, `a b`, `a~b`, FKs into suffixed columns) also passed `archify validate` with status 0. |
| low receipt-less draft is a dead end | **Fixed.** The own `<name>.written-sha256` marker lets a tool-written draft be regenerated. Mutant M3 (recheck removed) is caught. |
| low `ownedByReceipt` read without a no-follow, bounded descriptor | **Fixed.** `readPinned` uses `lstat`, `O_NOFOLLOW|O_NONBLOCK`, an `fstat` identity match and a `limit+1` read. |

Other mutants run, all caught: M5 (remove the `updated` gate in `resetStateReports`) fails the "apply changes no other project records" test. Only M3b (above) survived.

## Unverified

- The two low items for the hard-link fallback and the marker overwrite were read from the code, not reproduced.
- Whether Archify's `validate` is case-insensitive for attribute names was probed only through the one fuzz case above, not exhaustively.
- Known residuals (path-based window before `rename`/`unlink`, the `readdirSync` budget, the directory-swap race, the workflow-v3-rollout note, the doctor list test) were not re-examined.
