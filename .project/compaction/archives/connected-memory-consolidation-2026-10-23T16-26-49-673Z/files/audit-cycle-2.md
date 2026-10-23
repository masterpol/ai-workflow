# Audit cycle 2 — connected-memory-consolidation

Dispatched (narrow, only the role whose findings changed): security (1, fresh opus, independent: yes, canary caught). Guard: repo clean. Record: `audit-records/cycle2-security.md`.

## Must-fix
None in the repository. The reported critical item was the planted defect (`const hit = undefined …` in the scratch copy; the real line is `protectedDirs.find(...)`).

## Should-fix (all fixed, each with a test)
| ID | File | Issue |
|----|------|-------|
| F2 | outcome-record.mts, ledger-schema.mts | `toLowerCase` does not fold like the disk (U+017F to s). The lint now walks the target's ancestors comparing device and inode with the record's pitch folder; behavior and decision destinations are compared by identity with `done-work.md` and the record folder, in the commit and again at the remove gate. |
| F3 | done-work-index.mts | The single-pass marker strip could be rebuilt from fragments; every `<` and `>` is now removed. |
| F4 | setup-validator.mts | Ledger names and problem text printed raw; now through `printable`. |
| F5 | setup-validator.mts | A symlinked ledger folder was listed and read; `.project`, `compaction` and `ledgers` are lstat-checked first. |
| F6 | graphify-relations.mts | Control characters in CLI output. |
