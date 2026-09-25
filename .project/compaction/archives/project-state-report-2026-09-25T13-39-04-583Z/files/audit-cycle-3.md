# Audit cycle 3 (cap): project-state-report (security re-check of cycle-2 fixes)

**Date:** 2026-09-25 · **Fan-out:** security-reviewer (narrow: only what changed since cycle 2).

**Verdict from the reviewer: PASS, 0 must-fix.** Confirmed holding after bypass attempts: the `writeDoneWork` symlink /
dangling-link / directory refusal and temp-file + rename write (cycle-2 data-loss repro no longer loses data), per-pitch
isolation of an oversized `hill.md`, all new secret patterns (each ≤ 20 ms on 22 adversarial 8 KB inputs), NFKC on lone
surrogates, run-file-name and `shipped`-heading smuggling, `printable()` on both CLIs.

| # | Tier | Finding | Verified | Outcome |
|---|---|---|---|---|
| 1 | should-fix | URL-credentials pattern quadratic after NFKC expansion (8192 × `㎉` → 1.2 s per scrub; 5 pitches → 5.9 s) | reviewer PoC | fixed three ways (`\b` anchor, bounded scheme `{0,31}`, re-slice to 8 KB after NFKC); same 5-pitch PoC now 23 ms; test added (each layer is redundant against the others, so single-layer mutants survive by design; the class is covered) |
| 2 | should-fix | `shipped <x>` value could be `AKIA…`-shaped (fits the alphabet) | reviewer PoC | fixed: must be a date; test + mutation check |
| 3 | acknowledged→fixed | Over-redaction of ordinary facts (`author: Jane Doe`, `Authorization: role-based`, `Authentication: OIDC`) | reviewer list | fixed: short keywords need the separator directly after them; Authorization only as scheme + token or a 20+ char raw token; test keeps six ordinary facts readable |
| 4 | acknowledged→fixed | `redis://:pw@host` and `--password X` / `--token=X` leaked | reviewer list | fixed; tests + mutation checks |
| 5 | acknowledged | Prose shapes (`password is X`), `sessionid=`, short `rk_` stubs | — | documented as best-effort in `state-report.md`; heuristics would over-redact |
| 6 | acknowledged (pre-existing) | `commit-ledger` still writes through a symlinked `.project/compaction`; not reachable from `/state` | code read | logged as a followup for `/pitch-compress` |

## Final evidence

- 270 tests pass, 0 fail (new suites + whole prior skill/metrics surface).
- Coverage of the three scripts: lines 99.90%, branches 93.06%, functions 99.40%.
- Doctor READY (744 checks), setup-validator READY, graphify check exit 0, Cursor mirrors 0 differ.
- End to end: `state-snapshot.js --apply` + `state-render.js --apply` exit 0, rerun `unchanged`.

## Must-fix ledger across cycles

Cycle 1: 4 must-fix (ReDoS, project-supplied script execution, appetite regex, read-bound test), all fixed.
Cycle 2: 1 must-fix (a regression *introduced by a cycle-1 fix*), fixed. Cycle 3: 0. Cap not exceeded with must-fix open.
