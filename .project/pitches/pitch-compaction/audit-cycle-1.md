# Audit cycle 1 — pitch-compaction (C1+C2)

**Dispatch:** code-reviewer, security-reviewer, test-coverage-checker, cross-pitch-conflict-checker.

## Honest limits of this cycle

Only the **code-reviewer** completed. The security-reviewer, test-coverage-checker and
cross-pitch-conflict-checker all failed mid-run with a provider session-limit error (HTTP 429,
resets 11:10pm America/Bogota). The security review was the one that mattered most for a feature
whose job is deleting files, so rather than wait, the highest-risk attack scenarios were run
**directly in the main thread** against the real code with live proof-of-concept scripts.
That is *not* an independent review: the author of the code chose and ran these checks.
**Recommended before ship: re-dispatch the three failed reviewers after the limit resets, for
an independent second opinion.** Coverage numbers below come from my own runs, not the
test-coverage-checker; the cross-pitch check has not been done at all.

## Findings and disposition

| # | Source | Severity | Finding | Verified? | Disposition |
|---|---|---|---|---|---|
| 1 | main-thread security pass | **must-fix** | `latestArchiveDir("foo")` matched `foo-bar`'s archive (bare `${slug}-` prefix), so `verify`/`remove`/`restore` for one pitch could act on another pitch's archive | Live two-pitch PoC: returned `foo-bar-…` for `foo` | **Fixed** — anchored to the exact timestamp shape; `verify` also rejects a manifest whose `slug` differs. |
| 2 | main-thread security pass | **must-fix** | `restore()` never verified the archive or validated manifest keys: a tampered manifest with `../` keys wrote outside the destination, and a tampered archive was silently restored as original | Live PoC: a file was written outside the destination | **Fixed** — `restore` now refuses unless `verify()` passes; `verify` rejects unsafe manifest paths via `safeRelative`; `restore` also checks containment before every write. |
| 3 | main-thread security pass | **must-fix** | `commitLedger` accepted a destination inside the pitch's own directory (deleted by `remove`), or an empty file / directory / path outside the project, so coverage 1.0 could preserve nothing | Live PoC: accepted, coverage 1 | **Fixed** — destination must be a real nonempty file, realpath-resolved (so symlinks can't dodge it), inside the project and outside the pitch. |
| 4 | code-reviewer | **must-fix** (substance confirmed; suggested fix rejected) | `remove()` only checked that a ledger *exists*; a ledger whose own author declared every section a "gap" (coverage 0) passed the deletion gate. Plan required each gap to be accepted explicitly; my C2 deviation had wrongly collapsed that into "ledger exists" | Live PoC: coverage-0 ledger → `remove` deleted all files. The reviewer's proposed fix (`coverage === 1.0`) would make accepting any gap impossible, contradicting the plan | **Fixed properly** — `commit-ledger --accept-gap SECTION=REASON` (repeatable, recorded in the ledger); an unaccepted gap fails the commit; `remove()` independently re-reads the ledger and refuses on any unaccepted gap, malformed, wrong-slug or hand-placed ledger. The earlier deviation entry is superseded. |
| 5 | main-thread security pass | should-fix | `inventory` threw on any directory whose name isn't strict kebab-case, hiding every other pitch | Live PoC: threw `Invalid pitch slug` | **Fixed** — reported as preserved with a reason. |
| 6 | code-reviewer | should-fix | Unused `resolveFile` import in `pitch-archive.js` | Confirmed | **Fixed.** |

## Evidence after fixes

- All five exploit scenarios re-run against the fixed code: each now BLOCKED.
- `node --test --experimental-test-coverage ... pitch-compress.test.js pitch-archive.test.js`:
  40 tests, 40 pass; 100% line/branch/function.
- Whole skill surface regression (10 test files): 151 tests, 151 pass.
- `workflow-doctor.js`: 0 failures · `setup-validator.js`: READY (19 checks) · `graphify.js --check`: CLEAN.

## Cycle result

3 must-fix from the main-thread pass + 1 must-fix from the code-reviewer + 2 should-fix, all
fixed and re-verified. No open findings **from the reviews that ran**. Independent security,
test-coverage and cross-pitch review still outstanding (see above).
