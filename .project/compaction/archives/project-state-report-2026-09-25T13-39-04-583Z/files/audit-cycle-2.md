# Audit cycle 2: project-state-report (security re-check only)

**Date:** 2026-09-25 · **Fan-out:** security-reviewer (one agent; the other cycle-1 findings were fixed with tests and mutation checks and were not re-dispatched).

**Cycle-1 fixes confirmed holding after bypass attempts:** linear regexes + 64 KB cap (worst case 2.3 s for a 1 MB
all-`|` `hill.md`, everything else ≤ 0.5 s), fixed-string error reporting, prototype-free `byType`, symlink/FIFO/
directory handling, `printable`, `wx` temp files, HTML/CSP/theme injection surface.

## Findings and triage

| # | Tier | Finding | Verified | Outcome |
|---|---|---|---|---|
| 1 | **must-fix (regression I introduced)** | `readText` now reads a symlinked `done-work.md` as absent, but `writeDoneWork` still wrote through the link: `write-done-work --apply` destroyed the link target's older entries | reproduced: target lost `## old — shipped 2026-01-01` | fixed: `writeDoneWork` refuses a symlink / non-regular file, and replaces via temp file + rename; 2 tests; mutation-checked |
| 2 | should-fix | More credential shapes leaked (`pwd=`, `Authorization: Token …`, `npm_`, `glpat-`, `dop_v1_`, Slack webhook, `whsec_`, `SG.`, `ssh-rsa`, PGP block, URL password containing `@`, zero-width/fullwidth splits) | PoC list | fixed (new patterns, NFKC + format-character strip, short keywords only at a word start so "compass: north" survives); tests + mutation checks |
| 3 | should-fix | `shipped <x>` from `done-work.md` emitted unscrubbed and unbounded | PoC | fixed: bounded safe alphabet, end-anchored |
| 4 | should-fix | `.project/runs` file names emitted unscrubbed | PoC | fixed: safe alphabet, and a name that `scrub` would change is omitted |
| 5 | should-fix | One oversized `hill.md` made the whole pitches section unavailable | PoC | fixed: `classify` reports it for that pitch only |
| 6 | acknowledged→fixed | CLI printed `basename(root)` and error text without `printable` | `od -c` | fixed |
| 7 | acknowledged | Cyrillic homoglyphs / free-text "the password is …", 40-hex strings, base64 blobs, `IDENTIFIED BY` not caught | PoC | documented in `state-report.md` as a best-effort second layer; not pursued (heuristics would over-redact) |
| 8 | acknowledged | Bidi/format characters in the HTML report; `plain()` cosmetic stripping (`__init__` → `init`); classifying every pitch before the 100-entry slice; `readSource` lstat/read TOCTOU | — | logged for `/cooldown` |

**Lesson worth keeping:** a hardening change to a shared reader (`readText` returning "absent" for a symlink) must
be traced through every writer that treats "absent" as "safe to create". The cycle-1 security pass did not
catch this; the cycle-2 re-check of the *fix* did — re-review the fix, not just the finding.
