# Shipped: Configurable default skills

**Pitch:** [pitch.md](pitch.md) · **Plan:** [plan.md](plan.md) · **Hill:** [hill.md](hill.md)
**Shipped:** 2026-09-25 · **Appetite:** epic, decomposed into 3 sequential/parallel big-batch scopes (D1, then D2+D3 in parallel)

## Scope reconciliation

| Scope | Sub-pitch commitment | Delivered | Status |
|---|---|---|---|
| D1 | Default catalog, mode precedence and propagation to phases and children (`caveman-modes.md`) | `ai-framework/integrations/skill-defaults.json` catalog, `skill-defaults.js` (precedence resolution: invocation > phase override > instance default > bundle default), one consistent paragraph added to all 7 canonical phase skills, a new doctor check validating the catalog's structural shape. 12 tests. | **Done** |
| D2 | Stats integration, metrics deduplication and explicit compression safeguards (`caveman-metrics-compression.md`) | `token-consumption.js` tags records with the active mode (never parses `caveman-stats`'s own hooks); `skill-compress-guard.js` blocks `caveman-compress` from touching this project's protected historical records and reports Python readiness. 22+ tests. | **Done** |
| D3 | Agent-browser registration, runtime readiness and browser workflow adapters (`browser-runtime.md`) | `browser-runtime.js` reports whether the `agent-browser` skill is installed and its CLI is present — never installs either. 6+ tests. | **Done** |

All three scopes complete. Total: 108 tests passing across the whole skill surface (44 new/
changed for this pitch + 64 from the already-shipped `portable-skill-installation` confirmed
unaffected), 100% line/branch/function coverage on all three new scripts, 0 doctor/
setup-validator failures, knowledge graph clean.

## Grounding decision that shaped the build

Before writing scopes, the four real upstream skills were inspected read-only
(`add-skill.js inspect`, no checkout, no execution — the same guarantee the shipped installer
already provides). That inspection eliminated a spike the shape phase had flagged as a risk for
`caveman-stats` (its actual token/attribution format was unknown): rather than parse its
Claude-Code-specific internal hook files, this pitch tags only its own `token-consumption.js`
records with the active mode. This is documented in `plan.md`'s "Grounding" section and is the
reason D2 shipped with no spike needed.

## No-gos honored

- **No application implementation or decisions on La Salle infrastructure.** Confirmed: every
  touched file is under `ai-framework/`, `.claude/skills/`, `.project/pitches/`, or
  `.project/knowledge/` — nothing in an application/district layer.
- **No silent override of instance customization, automatic historical deletion, invented token
  savings, or secrets in reports.** Confirmed: `.project/skills/modes.json` (instance mode
  choices) is never touched by `bundle-sync` (regression-tested); `skill-compress-guard.js`
  blocks historical-record paths rather than allowing silent rewrites; `token-consumption.js`'s
  new `mode` field is a plain attribution string, no savings/cost inference added; the catalog
  never carries secrets.
- **No installation or deletion during shaping.** Confirmed: the catalog is proposal-only —
  nothing in this pitch installed any of the four skills into any project, including this
  bundle's own checkout. Upstream inspection during planning was read-only.
- Parent pitch: no parent behavior contract was dropped to fit appetite — all three sub-pitch
  contracts are represented in D1/D2/D3 above, each well under its 15-file/1500-LOC cap.

## Audit findings — final disposition

See `audit-cycle-1.md`. 3 must-fix (2 real, independently-reproduced security bypasses in the
compress guard's path matching — a symlink and a case-folding bypass on this project's default
case-insensitive filesystem — plus a missing automated test for a doctor check), 2 should-fix
(an ancestor-directory symlink bypass in mode-file loading; a missing subprocess timeout). All
five fixed and re-verified; every security finding was independently reproduced with a live
proof-of-concept before being trusted, and re-run after the fix to confirm closure. Zero
findings remain open.

## Knowledge extracted

- `.project/knowledge/patterns/resolve-before-matching-a-protected-path-allowlist.md` — the
  distinct, generalizable lesson from the two must-fix security bypasses: a protected-path
  guard checked with a lexical string comparison is bypassable via a symlink at an allowed
  location, or via case-folding on the default macOS/Windows filesystem; both are closed the
  same way (resolve the real path, lowercase before matching). Linked to (and back-linked from)
  the prior pitch's `[[resolve-config-only-from-trusted-root]]`, the closest existing related
  pattern.

Graph rebuilt: 5 entries (4 patterns, 1 issue), 6 links, `graphify.js --check` CLEAN.

## Followups generated

None new. The two followups already queued from `portable-skill-installation`'s ship remain
open and unrelated to this pitch.

## What downstream pitches can now build on

`pitch-compaction` and `project-state-report` (both bet, queued) were checked by the
cross-pitch-conflict-checker in audit cycle 1: no contradiction between what this pitch built
and what those pitches' shape documents assume. Both explicitly reference the
"installation → defaults → compaction → state" ordering; `pitch-compaction` is next per that
order and its own stated dependency (the registration contract, already satisfied since S1+S2
of the installer).

## Version

Not yet bumped — deferred to the commit step per this session's established convention
(`VERSION`/`CHANGELOG.md` are regenerated once at commit time, not per pitch-internal scope).
No application build/typecheck/lint/i18n commands exist yet for this project
(`.project/context/stack.md` — application stack still undecided), so the verify gauntlet ran
this workspace's actual gates instead: the full skill test suite (108/108), `node --check` on
every touched/new script, `workflow-doctor.js`, `setup-validator.js`, and `graphify.js --check`
— all clean. `git diff`/new-file scan reviewed for secrets/debug leftovers: none found.
