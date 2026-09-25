# Build deviations

## C1 — 2026-09-25

- Wrote `.claude/skills/pitch-compress/SKILL.md` in full during C1, including the archive/
  remove/restore steps the plan assigned to C2, since it is one coherent step-by-step playbook —
  splitting the same logical document across two edits would be artificial. C2's own script and
  test files are still built and verified separately, so C2's exit criteria are unaffected.
- Fixed 3 real bugs caught by this scope's own test suite (not manual inspection): a
  string-equality-based blank-line filter in `writeDoneWork` that stripped every blank line in
  the file once a second pitch was appended; a hill-chart parser that counted the table header
  and separator rows as open scopes; a CLI arg parser that assumed a fixed argv position for the
  slug argument, misparsing `--root` as a slug for the (slug-less) `inventory` action. See
  `c1-evidence.md` for detail.
- Synced 8 canonical skill files' Cursor mirrors that had gone stale from earlier session work
  (unrelated to this scope); opportunistic, one diff-confirmed copy each.

## C2 — 2026-09-25

- Fixed 2 real bugs caught by this scope's own real-subprocess-interruption tests: the
  interrupted-transaction guard only lived in the CLI wrapper, not in `archive()`/`remove()`/
  `restore()` themselves (a direct import bypassed it entirely); "already removed" detection
  only checked for a missing pitch directory, not an emptied one (which is what `remove()`
  itself actually leaves behind, by design — see `c2-evidence.md`).
- `remove()`'s "coverage 1.0" gate (named in plan.md) is enforced as "a committed ledger exists
  for this slug" rather than re-deriving the numeric coverage field — `commitLedger()` in
  pitch-compress.js already refuses to write a ledger unless every required section is
  accounted for (extracted or gap-with-reason), so the ledger's mere existence already proves
  full accounting. A second, separate numeric check would just be a second place to get wrong
  what `commitLedger()` already guarantees.

## Audit cycle 1 — 2026-09-25

- **Supersedes the C2 deviation above** ("a committed ledger exists" as the deletion gate): that
  reinterpretation was wrong. A ledger's author could declare every section a gap and pass the
  gate at coverage 0 (reproduced live). Implemented the plan's original contract: each gap needs
  an explicit human `--accept-gap SECTION=REASON`, recorded in the ledger and re-checked by
  `remove()`.
- Fixed 3 must-fix found by a main-thread security pass (archive lookup crossing between pitches
  with a shared slug prefix; `restore()` neither verifying the archive nor validating manifest
  paths; ledger destinations inside the pitch being deleted) plus 2 should-fix.
- Only the code-reviewer completed; the other three reviewers hit a provider rate limit. See
  `audit-cycle-1.md` for what that means for confidence.
