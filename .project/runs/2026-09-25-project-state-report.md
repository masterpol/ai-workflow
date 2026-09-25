# Build log and deviations: project-state-report


## 2026-09-25 — T1 built

Built `state-snapshot.js` (collector), its tests, the `/state` skill for every vendor, the reports
template README, and `state-report.md`.

**Evidence**
- `node --test ai-framework/scripts/state-snapshot.test.js` → 25 pass, 0 fail.
- `node --check ai-framework/scripts/state-snapshot.js` → ok.
- Mutation checks (guard removed → a test fails): symlink refusal, outside-root refusal, secret
  redaction. The `not yet|undecided` heading mutation is equivalent (case-insensitive `undecided`
  still matches) and was not counted.
- `workflow-doctor.js` → READY (732 checks); `setup-validator.js` → READY (21 checks); Cursor mirror
  0 differ, 43 current.
- This repo: database `unconfigured`; technology "Stated Direction" `proposed`, "Not Yet Installed
  Or Decided" `unconfigured`; token metrics `observed` with note "partial: 104 of 214 completions
  reported usage" (schema v2 read tolerantly).
- Vendors: Claude Code lists `state` as a skill (live). OpenCode `opencode debug skill` returns
  `state` from `.agents/skills/state/SKILL.md`. Codex and Cursor: mirror/pointer present and
  byte-consistent, **not verified in a running host**.

**Found while building (test-caught, fixed)**
- `skills.caveman` cited `.project/skills/registry.json` as evidence when caveman was not installed
  (a non-existent file). `checkSnapshot` caught it; evidence is now cited only when installed.
- `writeSnapshot` reported `wrote` on every run because `generatedAt` differs; it now compares
  ignoring the clock, so a rerun on an unchanged project is `unchanged`.

## 2026-09-25 — T2 built

Built `state-theme.js` (discovery, strict grammar, contrast), `state-render.js` (escaped,
self-contained HTML), `state-html.test.js`, the settings-survive-sync test, and the skill/doc updates.

**Evidence**
- `node --test ai-framework/scripts/state-html.test.js` → 27 pass, 0 fail.
- Coverage (`state-snapshot`, `state-theme`, `state-render` together, 52 tests): lines 99.32%, branches
  90.79%, functions 98.10% (threshold 90% lines).
- `bundle-sync.test.js` → 14 pass, including the new case: `.project/reports/{settings,theme}.json` and
  `state.html` unchanged after two applies; sync never writes the reports README into `.project/` and
  names it as a scaffold NEXT STEP instead.
- Whole prior surface (pitch-compress, pitch-archive, bundle-sync, add-skill, skill-vendors, skill-sync,
  skill-defaults, skill-compress-guard, browser-runtime, token-consumption + both new suites): 228 pass,
  0 fail. Doctor READY (742 checks); setup-validator READY; Cursor mirrors 0 differ, 43 current.
- End to end in this repo: `state-snapshot.js --apply` then `state-render.js --apply` exit 0; rerun
  reports `unchanged`; page has no `<script>`, no external URL, CSP meta; theme `fallback` (this repo
  has no stylesheets).
- Mutation checks (guard removed → a test fails): tag escaping, quote escaping, theme re-validation in
  the renderer, secret-shaped link refusal, in-project symlink refusal, path-character regex, group
  contrast fallback, whole-mode fallback, oklch rejection, oversize-file skip. Two mutations
  (`cssFiles` symlink skip, `collect` lstat) survive individually by design: each is a redundant second
  guard against the same symlink, and the leak needs both removed.

**Found while building (test-caught, fixed)**
- Scroll regions used `aria-labelledby` ids that did not exist (`pitch-records`, `pitches-h`,
  `theme-h`); now `aria-label` from the caption, and a test asserts every referenced id resolves.
- `mode: "partial"` was reported for a fully themed project that simply had no dark `--font-sans`;
  now only when something the project defined was replaced (a recorded fallback).
- Three `esc()`/link-path guards were unreachable through the public surface and initially uncovered;
  added direct tests (quote escaping, in-project symlink, unusual filename characters).
- `.project/reports/` fully git-ignored would have dropped the README scaffold on a fresh clone and
  failed the doctor scaffold check; `.gitignore` now ignores `reports/*` except the README.

**Vendor matrix (feature-by-vendor acceptance)**
| Vendor | Result |
|---|---|
| Claude Code | live: `state` appears in the session's skill list |
| OpenCode | live: `opencode debug skill` returns `state` from `.agents/skills/state/SKILL.md` |
| Codex | pointer present and consistent; **not verified in a running host** (not attempted; quota) |
| Cursor | byte-identical mirror of the canonical playbook (43 current, 0 differ); **not verified in a running host** |

## 2026-09-25 — Audit (3 cycles)

Four reviewers in cycle 1 (three lost to a rate limit and resumed; two stalled once on the watchdog),
security-only re-checks in cycles 2 and 3. Details: `audit-cycle-1.md`, `audit-cycle-2.md`, `audit-cycle-3.md`.

- Cycle 1: 4 must-fix + 11 should-fix fixed (ReDoS, executing project scripts, appetite regex, size-bound test; secret
  scrub, error echoes, symlinked directories, terminal escapes, temp-file `wx`, UX/a11y items).
- Cycle 2: 1 must-fix — a data-loss regression my `readText` hardening introduced in `writeDoneWork` — fixed.
- Cycle 3: 0 must-fix; 2 should-fix (quadratic URL pattern under NFKC, key-shaped `shipped` value) fixed.
- Suite: 270 tests, 0 failures. Coverage: 99.90% lines / 93.06% branches.


## T1
- **Doctor script list gained three entries, not one.** `pitch-compress.js` and `pitch-archive.js`
  were missing from the doctor's required-script list already; `state-snapshot.js` requires
  `pitch-compress.js` at load time, so the list now covers all three. Small, in-scope hygiene.
- **`state-snapshot.js` reuses `pitch-compress.inventory`** rather than re-implementing pitch
  classification, so shipped/active/compacted can never disagree between `/state` and
  `/pitch-compress`.
- **VERSION/CHANGELOG not touched yet** — deferred to commit time via the changelog script, as planned.

## T2
- **Theme fallback is per group, not per single pair.** The plan said "per-pair fallback"; pairs share
  tokens (`mutedForeground` sits on both `muted` and `background`), so replacing one token could not be
  done independently. Groups are `text`, `accent`, `subdued`; if the assembled mode still fails, the
  whole mode falls back. Both levels are tested.
- **`theme.json` is a record only.** The plan said an unchanged hash set is "reused"; reusing a file a
  user can hand-edit would make it an injection path, so the theme is always recomputed and the record
  is compared only to report `changed:`. Cost: a stylesheet scan per run (bounded).
- **`state-render.js` reads `state.json` from disk** (run the snapshot first) instead of collecting
  again, so the renderer's untrusted-input path is the one users actually hit.
- **Quoted font names are rejected** (reject, don't sanitize): `'Inter', sans-serif` falls back rather than
  being partially trusted. Real projects using quoted families or `var(--font-x)` get the fallback font.
  This is the most likely user-visible cost of the plan's strict grammar.
- **VERSION/CHANGELOG still not touched** — bumped at commit time via the changelog script.

## Audit cycle 1 (scope changes made while fixing)
- **`ai-framework/scripts/pitch-compress.js` was modified**, outside the T1/T2 file lists: `readText` now
  treats a symlink or non-regular file as absent and refuses files over 4 MB; `classify` and
  `listPitchSlugs` no longer follow a symlinked `SHIPPED.md` or pitches directory. `/state` reuses
  `inventory()`, so the untrusted-tree hardening had to live there. Behavior for ordinary files is
  unchanged (pitch-compress and pitch-archive suites pass unmodified).
- **`/state` runs the bundle's own `skill-sync.js`, not the target project's.** A project checkout that
  is not itself a bundle install (no `.project/skills/registry.json` and no sync marker) now reports
  partial-sync as `unavailable` instead of running anything.
- **Contrast pairs unchanged.** UX suggested adding `--border` on `--bg` at 3:1; rejected because real
  shadcn themes fail it and would all fall back. The attention outline uses `--fg` instead.
- **Extra scope: ~40 tests** beyond the plan's exit criteria, all for audit findings.
