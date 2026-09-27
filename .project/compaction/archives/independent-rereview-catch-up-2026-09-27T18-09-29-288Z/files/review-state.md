# Review record: `/state` collector, theme and renderer (S3)

**Subject:** `ai-framework/scripts/state-snapshot.js`, `state-theme.js`, `state-render.js`, their tests
(`state-snapshot.test.js`, `state-html.test.js`).
**Code state reviewed:** the working tree on 2026-09-27, including the concurrent `state-quoted-fonts`
pitch's uncommitted rewrite of `parseFontFamily`/`collect()`'s font-variable resolution in
`state-theme.js` (not reviewed or edited: a different function from every fix below).
**Yardstick:** `decisions/project-state-report-design`, `ai-framework/integrations/state-report.md`,
`patterns/resolve-before-matching-a-protected-path-allowlist`,
`patterns/a-report-over-an-untrusted-tree-runs-only-bundle-code`,
`patterns/allow-list-untrusted-labels-at-ingest-and-at-render`,
`patterns/parse-untrusted-values-and-re-emit-them`, `security.md` section 9 and checklist G.
**Audit cycles:** 2 (cycle 1: dispatches s3a, s3b, s3c, cross — full fan-out plus the one cross-boundary
pass the plan called for; cycle 2: s3-fix, a narrow re-review of the fixes). Prompts are in
`prompts/s3-*.txt`.

independent: yes
canary: caught
read-only: verified by review-bench `prepare` (every dispatch confined to a scratch copy outside the
project); no `guard snapshot` was taken before dispatch (see Deviations) — `git status` before and after
the five dispatches shows the same set of pre-existing concurrently-modified files plus, later, exactly
the files this slice intentionally edited; nothing else changed.
prompt-sha256: a385c55dd85138f662905ebffb94cc87ad4c47a60179a8c3f49f0e72f56a787a
model: sonnet (all five dispatches)
cross-file interactions: reviewed (dedicated pass, dispatch "cross")

Meaning of `independent: yes` here: a fresh agent (not resumed, shown no earlier findings), same model
family as the author, and it found the planted defect in every dispatch that touched the canaried file.
**It is not proof of independence from the author's blind spots.**

## Dispatches

| id | role | model | tool calls | prompt-sha256 | canary planted | canary | guard |
|----|------|-------|-----------|---------------|----------------|--------|-------|
| s3a | code-reviewer, `state-snapshot.js` (collector) | sonnet | 21 | a385c55d…a787a | not in this scratch (esc() canary lives in state-render.js, reviewed separately) | n/a | not checked (contract docs missing from this scratch — see Deviations) |
| s3b | code-reviewer, `state-theme.js` (theme) | sonnet | 30 | c7da64c7…d727f | `esc()` drops `"` escaping (planted in state-render.js, same scratch) | caught (surfaced as an out-of-scope FYI, correctly not claimed as a theme.js finding) | clean |
| s3c | code-reviewer, `state-render.js` (renderer) | sonnet | 26 | 1bdf47c0…31510 | `esc()` drops `"` escaping | caught (reported as its own must-fix, exactly as designed) | clean |
| cross | code-reviewer, cross-boundary pass (producer/consumer contracts, shared helpers) | sonnet | 14 | 14594589…9cc16 | same scratch, same canary | caught (noted, correctly excluded as out of scope) | clean |
| s3-fix | code-reviewer, re-review of the 6 round-1 fixes (cycle 2) | sonnet | 23 | e0da2d8d…99410 | `esc()` drops `"` escaping (fresh scratch, same canary) | caught (noted, correctly excluded) | clean |

Bench note: the s3b contrast-boundary canary attempt (`< MIN_CONTRAST` → `<= MIN_CONTRAST`) was refused
because it broke no scratch test — no test exercises the exact-equality boundary of the contrast check.
Recorded as a test gap, not fixed in this slice (see Not fixed here).

## Findings (real defects only; the shared canary finding is excluded)

| id | source | finding | verified | tier | disposition |
|----|--------|---------|----------|------|-------------|
| M1 | s3a | `readMarkdown`'s 64 KB cap silently truncates `done-work.md`/`status.md`; truncated result still reported `status:"observed"` with no note — a shipped pitch or an active-pitch row past the cutoff vanishes or reads as "not listed" | 2 live PoCs (a 76 KB done-work.md, a 70 KB status.md, real content past byte 64K) | must-fix | fixed round 1 (`doneWorkSection`, `pitchesSection`'s `statusMd`); **incomplete** — s3-fix (cycle 2) found two more call sites still unconditionally `"observed"`; fixed round 2 (the "compacted" and "active" per-item facts, gated on whether the specific claim, not just the file, is uncertain); 3 tests, all mutation-verified |
| M2 | s3b | `readSettings`/`themeChanges` only `lstat` the leaf file; an ancestor-directory symlink on `.project` reads `settings.json`/`theme.json` from outside the project | live PoC: `.project` symlinked to an outside dir, `readSettings` returned the outside file's `themeMode` | must-fix | fixed: `insideProject()` helper (realpath + containment, matching `readSource`/`collect`'s pattern); re-confirmed fixed in cycle 2; 1 test, mutation-verified |
| M3 | s3c | `projectRows`/`pitchTable`/skills-installed index `fact.value` on raw array elements without the file's own `isFact` guard; a `null` element crashes the whole render instead of degrading one section | 3 live PoCs, one per call site, on a `schemaVersion:1` state.json a user could hand-edit | must-fix | fixed: `list()` filters non-fact elements before any consumer sees them; re-confirmed fixed in cycle 2 (also confirmed no legitimate fact is ever dropped); 1 test, mutation-verified |
| S1 | s3b | `safeTheme`'s font branch overwrote the fallback font with `undefined` when the key was absent (`undefined === undefined` passed the guard) | live PoC: a partial theme object, `fontSans`/`fontMono` absent | should-fix | fixed: `typeof source[key] !== "string"` short-circuits, matching every other field; re-confirmed fixed in cycle 2; 1 test, mutation-verified |
| S2 | s3c | `value()` and `fact.note` had no per-leaf-string length bound before `esc()`; one huge fact value renders as a multi-MB table cell | live PoC: 900 KB leaf value | should-fix | fixed: `boundedText()` (500 chars) applied at all three call sites; re-confirmed fixed in cycle 2 (one cosmetic astral-character truncation glitch noted, acknowledged, not fixed); 1 test, mutation-verified |
| S3 | s3c | a bad `--root` leaks its absolute path raw via an uncaught `realpathSync` ENOENT message | live PoC: `--root` a nonexistent path | should-fix | fixed in `state-render.js`/`state-theme.js`; **incomplete** — s3-fix (cycle 2) found `state-snapshot.js` has the same three call sites (`buildSnapshot`, `writeSnapshot`, its CLI) unfixed; fixed round 2 (`resolveRoot()` helper); 2 tests, mutation-verified |
| A1 | s3a | `problem()` returns the confusing string "token snapshot undefined" when a parsed JSON value is falsy (`0`/`null`/`false`); status is still correctly `unavailable` | live PoC | acknowledged | not fixed (cosmetic; no security or correctness impact) |

Not fixed here (recorded): the contrast-boundary test gap (S3b's refused canary); the astral-character
truncation glitch in `boundedText()` (S2's cycle-2 note); the "token snapshot undefined" note text (A1).

## Checklist results (final state)

| item | result | evidence |
|------|--------|----------|
| G1 reader refuses symlinks/FIFOs/oversize, directory listings checked | pass | `readSource`/`collect`; `readSettings`/`themeChanges` fixed to match (M2) |
| G2 linear regexes, capped input before and after expansion | pass for structure (`MAX_ITEMS`/`MAX_DEPTH`); fixed for a single leaf string (S2) |
| G3 no project-supplied script executed | pass | no `child_process` in any of the three files |
| G4 no raw error text or absolute path | pass after fixes (S3, both rounds) | `resolveRoot()`/render()'s and discoverTheme()'s try/catch |
| G5 atomic writers that never follow symlinks | pass | `writeAtomic` (state-snapshot.js), reused by `state-render.js` |

## Five HTML nits (triaged, per `plan.md`)

Original finding (project-state-report audit cycle 1, item 17, acknowledged, never actioned):
`lang="en"` hard-coded (project text may be Spanish); no `<time>`; tap-target size; `.none` dash noise;
no `color-scheme` meta. No file budget remained in this slice (19 of 19 used by the fixes above) to
action any of these, so triage here is disposition only, not a fix.

| nit | disposition | reason |
|---|---|---|
| `lang="en"` hard-coded | followup | Real i18n gap if a project's own text is not English; needs a small design decision (detect vs. a config knob), not a one-line fix. |
| no `<time>` element for dates | followup | Cheap, but every call site that renders a date (`generatedAt`, `shipped`, run names) needs the same treatment; a real fix, not a triage-time patch. |
| tap-target size | followup | Needs an actual measurement pass against the rendered CSS (badges/links), not a guess. |
| `.none` dash noise | followup | Borderline: repeated `<span class="none">—</span>` across a full table may or may plausibly need `aria-hidden`; needs a UX-reviewer pass to confirm before spending a fix. |
| no `color-scheme` meta | **rejected** | Already covered: `stylesheet()` sets `color-scheme:light dark` on `:root` inline in `<head>` (state-render.js), and this is a single self-contained page with no external stylesheet load delay for the meta tag to pre-empt. The meta tag would be redundant. |

Consolidated as one followup item in `_followups.md` (the four "followup" nits); not a new pitch on its
own — small enough to fold into whichever pitch next touches `state-render.js`.

## Evidence

- Suites: `node --test` on `state-snapshot.test.js` + `state-html.test.js`: **92 tests, 92 pass, 0 fail**
  (6 new regression tests: M1×2 scenarios, M2, M3, S1, S2, S3×2 call sites). Full repo suite (all
  `*.test.js` under `ai-framework/`): **386 tests, 385 pass, 0 fail, 1 skipped**. Doctor READY,
  setup-validator READY, knowledge graph CLEAN.
- Mutation checks: all 9 fix-points (M1's 3 call sites, M2, M3, S1, S2, S3's 3 call sites across two
  files) individually reverted in scratch copies; every revert was caught by its regression test. None
  kept on purpose.
- Files changed by this slice (fix cap raised 4→5 by user approval; 5 used):
  `state-snapshot.js`, `state-snapshot.test.js`, `state-theme.js`, `state-render.js`, `state-html.test.js`.
- **`state-theme.js` has separate uncommitted changes from the concurrent `state-quoted-fonts` pitch**
  (`parseFontFamily`, `collect()`'s font-variable resolution). Confirmed by diff before editing: that
  pitch's changes and this slice's fixes (`insideProject`, `readSettings`, `themeChanges`, `safeTheme`'s
  font branch) touch different functions and do not overlap.
- **No `guard snapshot` was taken before the five dispatches** (see Deviations) — a process gap relative
  to S1/S2. `git status` immediately after the dispatches showed only the same pre-existing
  concurrently-modified files as at the start of this segment, so no repo write happened during any
  dispatch window; this is inferred from a before/after comparison, not from `guard check`'s own diff.
