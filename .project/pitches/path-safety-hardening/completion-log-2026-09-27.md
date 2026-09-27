# Path safety completion log — 2026-09-27

The user approved the trusted-directory contract and P2 scope, then selected path safety only.
Collector robustness remains unfinished; no collector implementation was changed in this run.

Knowledge check: the shared-reader refusal issue requires refused destinations to remain errors,
never fresh writes. Existing tests already cover symlinked/non-regular done-work destinations,
symlinked ledger ancestors and outside-target preservation. These remain in the regression set.

P2 unifies ledger/archive contexts and pending-journal guards. Legacy installer journals retain
their original recovery route. Added real SIGKILL fixtures cover existing and new ledgers, exact
rollback bytes, direct API refusal while pending, and old-context recovery. README records the
approved trust boundary and both recovery commands. Scope uses the five approved files.

## Build verification

Direct suites: 110 passed, zero failed. Shared callers: 121 passed, zero failed, including
browser-runtime. Four isolated in-memory mutants failed their focused checks: wrong ledger
transaction namespace, disabled legacy-journal refusal, disabled ancestor identity checks and
disabled ledger symlink refusal. No production source was mutated by these checks.

The audit bench's current tree guard does not skip secret filenames. To honor the project rule,
the audit uses a private copy with its tree-walk skip predicate extended by its existing
SECRET_NAME matcher. This avoids reading secrets without changing the shared bench source.
