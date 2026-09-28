# C2 completion evidence

Scope: immutable recovery archive, transactional deletion, restore. Runtime: Node v24.18.0.
No real project pitch was archived or deleted — all testing used fixture pitches in temporary
directories.

## Behavior tests and coverage

```sh
node --test --experimental-test-coverage '--test-coverage-include=ai-framework/scripts/pitch-compress.js,ai-framework/scripts/pitch-archive.js' --test-coverage-lines=90 ai-framework/scripts/pitch-compress.test.js ai-framework/scripts/pitch-archive.test.js
```
Exit 0: 31 tests, 31 pass (17 C1 + 14 C2). Line coverage 100%, function 100%, branch 100%
combined (individually: pitch-archive.js 100%/100%/83.91%).

Tests cover: `archive` writes a byte-identical copy plus a verifiable manifest/checksum outside
`.project/pitches/`, refuses a symlink in the source tree; `verify` distinguishes a tampered
archived file from a tampered manifest, reports "no archive" distinctly; `remove` refuses
without a verified archive, without a committed ledger, on a content conflict (edited after
archiving) and on a file-set conflict (added/removed file after archiving), only then deletes,
and is a true no-op once already removed; `restore` reproduces the original directory
byte-for-byte, refuses to overwrite a non-empty destination without `--force`, and supports an
explicit `--to` for inspection without restoring in place; multiple archives per slug and
`latestArchiveDir`; full CLI coverage including `recover`.

**Two real subprocess-interruption tests** (not simulated): a purpose-built child process calls
the actual `transact()` with a real `afterWrite` callback that sends `SIGKILL` to itself
mid-transaction — matching the same real-kill approach S1's own tests already established, not
a hand-constructed fake journal. One test confirms the kill leaves genuinely partial state (not
silently whole) and that `remove()` refuses to proceed past a pending transaction; the other
confirms `recover()` restores the exact pre-interruption file content and that `remove()`
proceeds cleanly afterward.

## Bugs found and fixed during this scope's own testing

1. **The interrupted-transaction guard only lived in the CLI wrapper**, not in `archive()`,
   `remove()`, or `restore()` themselves — a caller importing this module directly (as its own
   test suite does) got no protection at all against operating past a pending transaction.
   Found by a real-kill test that expected `remove()` to refuse and instead hit an unrelated
   conflict error. Fixed by moving the check into each mutating function via a shared
   `requireNoPendingTransaction()` helper, matching `add-skill.js`'s pattern of guarding in the
   shared function every caller goes through, not only the CLI's own dispatch.
2. **"Already removed" detection only checked for a missing directory**, not an emptied one.
   `remove()` deliberately deletes files, not the containing directory (so a rerun can be
   detected in the first place, and so a human can still see where the pitch used to live) — so
   after a successful removal the directory persists, empty. The check now treats "directory
   missing or empty" as already-removed, matching what `remove()` itself actually leaves behind.

Both were caught by the test suite's own real end-to-end scenarios, not by re-reading the code.

## Manual end-to-end verification

Beyond the automated suite, ran the full real flow by hand against an isolated fixture copy of
this bundle before writing the formal tests: commit a ledger, archive (preview then apply),
verify, remove, restore — confirming byte-identical restored content — which is what surfaced
the need for the two fixes above before the formal suite ever ran.

## Syntax and workflow verification

`node --check ai-framework/scripts/pitch-archive.js`: exit 0.
`node ai-framework/scripts/workflow-doctor.js --json`: exit 0, 0 failures.
`node ai-framework/scripts/setup-validator.js`: exit 0, READY, 19 checks.
`node ai-framework/scripts/graphify.js --check`: CLEAN.

## Regression: reusing skill-registry.js's exports caused no breakage

```sh
node --test ai-framework/scripts/bundle-sync.test.js ai-framework/scripts/add-skill.test.js ai-framework/scripts/skill-vendors.test.js ai-framework/scripts/skill-sync.test.js ai-framework/scripts/skill-defaults.test.js ai-framework/scripts/skill-compress-guard.test.js ai-framework/scripts/browser-runtime.test.js ai-framework/hooks/scripts/token-consumption.test.js
```
111 tests, 111 pass — the entire prior skill surface (`portable-skill-installation` and
`portable-skill-defaults`) is unaffected by this pitch's direct reuse of `transact`/`recover`/
`resolveFile`/`snapshot`/`digest`/`json`.

## Remaining

Both scopes of `pitch-compaction` are complete. This pitch has not been used against any real
project pitch — that first real use (compacting `portable-skill-installation` or
`portable-skill-defaults` once they are old enough to be candidates) is a follow-on action, not
part of this pitch's own build.
