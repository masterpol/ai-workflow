# Audit cycle 3 — connected-memory-consolidation (last cycle for big-batch)

Dispatched (narrow): security (1, fresh opus, independent: yes, canary caught). Guard: repo clean. Record: `audit-records/cycle3-security.md`.

## Must-fix
None in the repository. The reported item was the planted defect (`/zzz/` in place of `/[<>]/` in the scratch copy; the real line is intact).

## Should-fix
| ID | Issue | Status |
|----|-------|--------|
| C3-2 | A line feed in a ledger file name could forge extra PASS lines in the validator's text report (`printable` skipped U+000A; the relations CLI had the same gap). | fixed: `printable` and the CLI replace line feeds; tests added |

Cycle cap reached. No cycle-4 review of the cycle-3 change: it is a one-character-class widening in two regular expressions, covered by new tests, and the author-run mutation check below.
