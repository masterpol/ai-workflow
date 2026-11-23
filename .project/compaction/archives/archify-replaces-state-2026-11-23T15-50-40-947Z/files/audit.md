# Audit cycle 1 — archify-replaces-state

Dispatched: code (5, independent: yes) | security (4, independent: yes) | test (9, independent: yes) | ux (n/a, no UI scope) | eval (n/a, no AI-prompt scope) | i18n (n/a, no i18n strings) | cross-pitch (4, independent: no)
Independence: three reviewers worked on scratch copies each holding a planted canary; all three canaries were caught (`review-bench canary-check`), and `review-bench guard check` found the repo unchanged after dispatch. The cross-pitch checker reads the live repo, so no canary was possible (`independent: no`). Models: security and code sonnet, test and cross-pitch haiku.
Orca: ready, no alternate-vendor scopes were planned, so no workers were dispatched.

## Must-fix (blocks /ship)
None. Four reviewer-reported must-fix items were checked against the real repo and refuted: COD-1 and TST-1 are the planted canaries, TST-2..4 are coverage gaps (real, fixed, re-tiered should-fix), X-1 is a misreading of `consolidation-carry.md`.

## Should-fix
| ID | Source | File | Issue | Disposition |
|----|--------|------|-------|-------------|
| SEC-1 | security, test | facts-gather.mts writeReport | directory created behind a hostile `.project` link before the containment check | fixed; test + mutant |
| SEC-2 | security, test | facts-gather.mts read() | symlinked ancestor inside the project was followed | fixed; 2 tests + mutant |
| SEC-4 | security, code | skill-source.mts | backtick pairing could hide a link from the link check | fixed; new scanner, 5 assertions, old regex killed |
| COD-2 | code | facts-gather.mts summary | printed 0 for unavailable facts | fixed; test rewritten |
| COD-3 | code, test | facts-gather.mts | silent caps left counts disagreeing with evidence | fixed; stale + note + "other" bucket |
| COD-5 | code | facts-gather.test.mts | no-op assertions, dead lines | fixed |
| TST-3 | test | facts-gather.mts redaction | 9 of 21 redaction families were missing or untested (list was a subset of the old snapshot's) | fixed; all restored, one assertion each |
| TST-4..7 | test | facts-gather.mts | 64 MiB bound, `--json`, `--now`, empty file, atomic replace untested | fixed |
| X-2 | cross-pitch | orca-start.mts, orca-start.test.mts, orca-preflight.mts | the runner fix overlaps `orca-bounded-control-receipts` (`lookupWorker`); attribution shared-diff | **open, for /ship**: commit separately with its own changelog entry; tell that pitch |

## Acknowledged
TOCTOU between lstat and read (needs a concurrent attacker); redaction stays heuristic and Archify's grammar for `@`, `=`, `&` is unverified; `migrate.mts` no longer rewrites legacy references to the retired scripts (intended); `wx` is a redundant layer; five historical records edited with owner approval (guardrail names only pitches/, design/, _archive/).

## Evidence
- Full suite after fixes: 2083 tests, 2080 pass, 0 fail, 3 skipped. `setup-validator` READY, `workflow-doctor` READY, `graphify --check` 0, `graphify-relations --check` 0.
- Mutation check (author-run, labelled as such): 10 mutants of facts-gather.mts plus the old regex of skill-source.mts, all killed; files restored and verified identical.
- The reviewers' own proofs re-run on the fixed repo: hostile `.project` link leaves the outside directory empty; in-project ancestor link is refused; empty status file reads as observed with count 0; `archify deliver` ok on the real repo.

## Not reviewed / unverified
Archify's inline-markup grammar for `@ = & $` (only `< > [ ] | { } \ ~ _ # !` and backticks are neutralised); the live behaviour of the new `/state` on OpenCode, Codex and Cursor; `bundle-sync`, `done-work-index`, `legacy-upgrade` and `installed-upgrade` test edits were reviewed from the patch only, though they pass in the full suite. No second review cycle ran: the fixes are not independently re-reviewed.
