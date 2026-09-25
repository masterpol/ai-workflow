# Build deviations

## D1 — 2026-09-25

- Opportunistic fix while touching `workflow-doctor.js` for this scope's own doctor check:
  `bundle-sync.js` and `skill-sync.js` (from the shipped `portable-skill-installation`) were
  missing from the doctor's `node --check` script list. Added both, plus this scope's own
  `skill-defaults.js`. Unrelated to D1's contract; one-line fix in a file already being edited.

## D2 — 2026-09-25

- `token-consumption.js`'s new `mode` attribution field resolves only `caveman.enabled`/
  `caveman.default` from `.project/skills/modes.json`, not `caveman.phases[phase]` — a
  token-consumption event is emitted by agent-completion hooks, which have no phase context to
  look up a per-phase override against. Plan.md's "resolved default" language is satisfied by
  the instance-default/bundle-default chain; phase-level resolution remains `skill-defaults.js`'s
  `resolveMode()` alone, which does have a phase argument. Not a gap — a token-consumption record
  genuinely cannot know which phase (if any) emitted it.
- Added an empty-string-target case to `skill-compress-guard.js`'s `canCompress()` beyond the
  four refusal cases named in the plan, since it needed distinct handling anyway (falls under
  "not an exact path" otherwise, but deserves its own reason string).

## D3 — 2026-09-25

- Implemented `browser-runtime.js` as a single-entry report (`agent-browser` only), not a
  "per-vendor + overall" breakdown — `agent-browser` is a global `PATH`-resolved CLI, not a
  per-project-vendor concern the way skill wrapper coverage is. Nothing from the parent pitch's
  vendor-acceptance requirement was dropped: this scope adds no new skill/command/agent surface
  of its own to mirror per vendor (see plan.md's "Vendor acceptance" section).
- `workflow-doctor.js`'s script list did not yet include `skill-compress-guard.js` or
  `browser-runtime.js` when D2/D3 finished (both scopes correctly left doctor integration to D1
  per the plan); added both immediately after, in the same pass as reconciling D2/D3.

## Audit cycle 1 — 2026-09-25

- Fixed 2 must-fix from security-reviewer: `skill-compress-guard.js`'s protected-path matching
  used the raw lexical path (bypassable via a symlink at an allowed location, or via case
  folding on the default macOS/Windows filesystem). Now resolves the real path first and
  lowercases the comparison; also tightened to refuse any resolution outside the project root.
- Fixed 1 must-fix from test-coverage-checker: D1's own "doctor fails loudly on malformed
  catalog" exit criterion had no automated test. Added one (real bundle copy, clean-then-
  corrupted).
- Fixed 2 should-fix from security-reviewer: `loadModes()`/`currentCavemanMode()` only checked
  the leaf file for a symlink, missing a symlinked ancestor directory; `pythonAvailable()` was
  missing the `timeout: 5000` its sibling presence-checks both set.
- All security findings independently reproduced with live PoC scripts before and after the
  fix, not accepted on the subagent report alone. See `audit-cycle-1.md`.
