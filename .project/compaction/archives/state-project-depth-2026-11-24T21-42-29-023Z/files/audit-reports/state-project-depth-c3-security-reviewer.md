# state-project-depth: audit cycle 3 (narrow), security-reviewer

Read-only re-check of the cycle-2 fixes, by code reading plus a run of the new tests. Nothing in the repo was edited and no proof files were needed.
Baseline: `bun test facts-gather.test.mts` gives 35 pass / 0 fail. `bun test bundle-sync.test.mts -t "pins the hashed"` gives 1 pass / 0 fail.

## New defects

| Severity | file:line | Rule | Failure scenario (command and output) | Fix |
|---|---|---|---|---|
| none | - | - | No new defect found in the three changed areas. | - |

Checked and found sound:
- `bundle-sync.mts:272-292` `readBounded`: the `pin` callback fires on the `fstat` of the open descriptor, after the lstat/fstat dev+ino agreement check and before any byte is read. The pinned identity is that of the hashed descriptor.
- `bundle-sync.mts:341-355` `resetStateReports`: the final check compares `lstatSync(item.file)` with that descriptor identity, with no await between the check and `unlinkSync`. The old extra `fs.lstat` pin is gone. A swap after the hash read leaves the swapped-in file with a different inode, so it is refused with `report-changed`.
- `facts-gather.mts:441-447`: `EEXIST` gives `report-not-owned`. Any other `linkSync` error falls back to an lstat recheck, where only `ENOENT` counts as absent, and then `renameSync`. Any other lstat error counts as "appeared" and is refused (fail closed).
- `facts-gather.mts:455-463`: the marker is replaced only when `lstat` shows a non-symlink regular file of 128 bytes or less holding one hex line. An absent marker is written with `wx` plus a rename. A foreign marker is left alone and the report path is still returned.

## Cycle-2 findings: fixed / not fixed

| Cycle-2 finding | Status |
|---|---|
| medium: `bundle-sync.mts` pin taken from a later `lstat`, not the hashed descriptor | **Fixed.** The pin now comes from the hashed descriptor's `fstat` via the `readBounded` callback. The new test swaps right after the `closeSync` of the hash read and passes, which is the exact hook the cycle-2 proof used. |
| low: `linkSync` failure of any kind reported as `report-not-owned` | **Fixed.** Only `EEXIST` maps to it. Other errors take the lstat-absent recheck and then rename. The residual window on link-less filesystems is documented and out of scope. |
| low: marker write could replace or follow a foreign path | **Fixed.** The marker is replaced only when absent or an earlier one-line hex marker. A symlink, directory or other content is left alone. |
| low (test gap): mutant that dropped the `ino` comparison survived | **Fixed.** The `writeReport refuses a same-bytes replacement inode` test and its companions were added and pass (35/35). I did not re-run mutants. |

## Unverified

- I did not re-run the cycle-2 mutants against the new tests, so the claim that each new test kills its mutant is unverified.
- Inode reuse after the hashed file is freed: the swapped-in file is created while the original still exists, so its inode differs, and the test relies on that. On filesystems that recycle inodes eagerly (ext4), an attacker who removes and recreates files repeatedly could in theory match the pinned inode. This is the same path-based window class as the known residuals, so it is not counted as a finding. I did not test it.
- `facts-gather.mts:458`: `readFileSync(marker)` follows the lstat check with a path-based read, so a FIFO swapped in between could block. I did not test this. The marker is the tool's own record and the same window class is already documented.
