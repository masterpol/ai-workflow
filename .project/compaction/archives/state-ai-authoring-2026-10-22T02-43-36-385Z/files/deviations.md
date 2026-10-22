# Deviations: state-ai-authoring

## S1 preflight (2026-10-20)

Base: dfb291e7f8f3841fa8b46fe4932a593d13ba19d3
Recount: 15 files
R9: helper-edit-needed
Baseline: 531 tests

Prerequisites: `.project/status.md` lists `state-report-redesign` (2026-10-19, v2.33.0) and `state-fragment-sanitizer`
(2026-10-20, v2.35.0) under Recent ships. The plan's first form of the check, `grep -cE "^## (…) — shipped"
.project/done-work.md`, returns 0 because done-work uses a different heading; the plan allows status.md as the alternative.

Contract greps: `sanitizeFragment`/`rejectionMessage` 2, `checkCitations` 1, `state-design.mts` exists, `assertKnownMarkup` 1.
`SLOT_NAMES` in `state-pages.mts` returns 0 — see D1.

| ID | Plan said | Code has | Consequence |
|----|-----------|----------|-------------|
| D1 | `SLOT_NAMES` in `state-pages.mts` | `SLOT_NAMES` and `slot(name)` live in `state-design.mts:15-16`; `slot()` is a stub returning `""`; pages call `slot("overview"\|"architecture"\|"history"\|"risks"\|"tokens")` at `state-pages.mts:130-150` | S3/S4 change `slot()` to take loaded content. `state-design.mts` is already counted. Slot placement already matches `SLOT_PAGES` except `risks` (end of index page) |
| D2 | `readSource`, `writeAtomic`, `printable` reused from the snapshot module | all three are module-private in `state-snapshot.mts` (lines 34, 95, 428), not exported | **Open decision.** Exporting means editing `state-snapshot.mts` (plan says unchanged; 16th file). Re-implementing them in `state-fragment-inject.mts` costs ~40 lines against the 330 cap and duplicates the symlink/size guard. Needs owner ruling |
| D3 | `sanitizeFragment` options include a `hrefPrefix` | `Options = { classes?, tokens?, markers?, limits? }` (`state-fragment.mts:7`); no `hrefPrefix` | Plan already adds it (S3, ~8 lines). Confirmed absent |
| D4 | redesign exports class/token/marker lists | none; `DEFAULT_TOKENS` is exported by `state-fragment.mts:11`; classes and markers have no default list in `state-design.mts` | Matches plan correction 3: the fragment class list is added to `state-design.mts` in S3 |
| D5 | `sha256Hex` available | only as `RuntimeDeps.sha256Hex` (`runtime/types.mts:135`) | Inject module takes deps, as planned |

R9 detail: tags the sanitizer allows but `assertKnownMarkup` (`state-test-helpers.mts:9`) rejects: `h4`, `pre`, `data`,
`ellipse`, `polyline`, `polygon`, `tspan`, `title`. Attributes likewise: `value`, `points`, `dx`, `dy`, `transform`,
`rx`/`ry` on non-rect is fine, `stroke-width` present. Page tests that include a fragment need the helper extended,
so `state-test-helpers.mts` becomes the contingent 15th file (14 + 1). If D2 resolves as "export from
`state-snapshot.mts`" the count is 16 and the cut line applies; resolving D2 as "re-implement" keeps 15.

Baseline run: `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/state-*.test.mts ai-framework/scripts/runtime/invariants.test.mts` → exit 0, 531 pass / 0 fail.

**D2 ruling (2026-10-20, owner):** re-implement the guarded read, atomic write and `printable` in
`state-fragment-inject.mts`. `state-snapshot.mts` stays unchanged; file count stays 15 (with `state-test-helpers.mts`).
Cohesive-unit exception for `state-fragment-inject.mts` (≤ 330 lines vs 80-line default), reason: one header grammar
written by `stamp` and parsed by `loadFragments`; one round record; one check pipeline; one directory guard; a single
audit record. Alternative (separate header/hash files) rejected: 17 files against the cap of 15.

## S2 (2026-10-20)

| ID | Planned | Shipped | Why |
|----|---------|---------|-----|
| D6 | D2 ruling: re-implement guarded read, atomic write, `printable` | Reused `createStateSnapshot(deps)`'s `readSource(root, rel, maxBytes)`, `writeAtomic` and `printable` | S1 was wrong: they are not private. They are returned by `createStateSnapshot` (state-snapshot.mts:473) and exported. No snapshot edit, no duplicated guard; the D2 ruling's cost (~40 lines) was avoided |
| D7 | `FRAGMENT_CLASSES` added in S3 | Added to `state-design.mts` in S2 (`ai-note`, `ai-card`, `ai-grid`, `ai-muted`, `ai-figure`) | `validate` needs the class list now; the container CSS stays in S3 |
| D8 | Inject module ≤ 200 lines at end of S2 | 218 lines after a trim (235 before); 200 is not reachable without cramming lines further (many are already 150+ characters) | Exit `wc -l ≤ 200` FAILS. The CLI, directory guard and round parser are in. With S3's ~110 lines the module would reach ~345 against the 330 cap. Needs a ruling: trim, raise the S2 gate, or move the CLI out |
| D9 | `stamp` result shape `{ok:true} \| Rejection` | `{ok:true} \| Failure` (`{ok:false, reason, message}`), reasons from the sanitizer's closed set plus fixed inject codes (`round-stale`, `retry-exhausted`, `draft-predates-round`, `draft-missing`, `draft-changed`, `evidence-truncated`, `tokens-href`, `no-citation`, `fragments-dir`, `no-snapshot`, `header`, `body-changed`) | `reject()` collapses unknown reasons to `syntax`, so inject codes cannot go through it |
| D10 | `status` returns `{hash, slots}` | `{ok:true, hash, slots, ignored:{count,names}}` or `Failure` | Ignored-file count is in the contract; failures need a channel |

**D8 ruling (2026-10-20, owner):** S2 gate raised to ≤ 220 lines (actual 218). Final cap stays 330; S3 must fit in ~112 lines.

## S3 (2026-10-20)

| ID | Planned | Shipped | Why |
|----|---------|---------|-----|
| D11 | "any other `hrefPrefix` value throws" | `sanitizeFragment` returns the closed rejection `invalid-options` | The sanitizer never throws (its contract); every bad option already maps to this reason. Tested for `"x/"`, `"/"`, `".."`, `"../"`, `"../../x"`, `5`, `null` |
| D12 | `FRAGMENT_CLASSES` named `ai-*` (S2 stub) | `frag-note`, `frag-card`, `frag-grid`, `frag-muted`, `frag-figure` | The plan's drift test forbids class names matching `^(status\|ai-)`, which the S2 stub violated. `.ai-analysis` is reserved for the container |
| D13 | `fragmentContainer` is "" only when the directory is absent | Same; a missing file in an existing directory renders the label with "No AI analysis shown: missing." | Dataset case failure-isolation requires a visible reason for each failure, including a missing file. S4 should expect this once `status` has created the directory |
| D14 | `loadFragments(root, snapshot, {strict})` | Adds a `deps` 4th argument; `Loaded` is `{shown, html, hrefs, stale, reason, stamped, model, hash}` | Same deps-injection idiom as S2 |

## S4 (2026-10-20)

| ID | Planned | Shipped | Why |
|----|---------|---------|-----|
| D15 | Byte identity "to the pre-S4 renderer at Base" | Identical to the pre-S4 `state-render.mts` and `state-pages.mts` (HEAD) running with the current `state-design.mts` | S3 added fragment CSS to the shared stylesheet, so every page differs from Base by that stylesheet. Identity of the page bodies and file set is what S4 controls. Checked in the scratchpad: `diff -r` of `.project/reports` from both renderers, no fragments directory, is empty |
| D16 | Contingent 15th file only if needed | `state-test-helpers.mts` edited (R9 `helper-edit-needed`): tags `h4 pre data ellipse polyline polygon tspan title`, attributes `value points dx dy transform` | `assertKnownMarkup` rejected the sanitizer's own output on a page. File count is now 15 of 15, with `live-runs.md` still to create in S8, which brings it to 15 (it was already counted); no slack remains |
| D17 | `renderPages(snapshot, theme, {root,name,cap})` | adds `fragments: {full, omitted}` (HTML per slot); `build()` takes a `slot` fill function and `state-design.mts`'s stub `slot()` is no longer imported by pages | Lets the cap loop try the full fragments, then the omission notices, then the page-omitted notice |
| D18 | M22 "leave fragment bytes out of the cap loop" | Mutant removes the omission fallback instead | Fragment bytes enter the loop by construction (the page is rebuilt with them); the observable guarantee is the fallback |

## S5 (2026-10-20)

| ID | Planned | Shipped | Why |
|----|---------|---------|-----|
| D19 | S8 creates the placeholder `live-runs.md` | S5 creates it (36 `not-run` rows, one cursor row, `Claim: blocked`) | S5's validator needs a file to read; S8 then adds the harness section and S9 the matrix. The file stays one counted new file |
| D20 | Live-record row format not fixed | Pipe table, columns `case, vendor, kind, author, grader, stamp, verdict, recheck, note`; `kind` is `run`, `seeded` or `not-run`; cursor row is `all \| cursor \| not-run` | The validator and S8/S9 must agree on one grammar |
| D21 | `# skip 0` in the TAP summary | Node's `# skipped 0` | Node's real reporter key; the plan used shorthand (already noted in the sanitizer's S7) |
| D22 | M26 "claim ignores codex not-run" | A not-run row beside two passes must still block | Without it the mutant survived: the pass-count rule already blocked. The control now adds a not-run row next to two passes |
| D23 | S4 tests named freely | Two S4 summary tests renamed to start `[step-skipped-is-visible]` | The dataset test maps the id by test-name prefix; S6 adds the skill-order test under the same id |

## S6 (2026-10-20)

| ID | Planned | Shipped | Why |
|----|---------|---------|-----|
| D24 | Step runs `status --json` | Runs `status` (plain lines: `slot: state (reason)`, snapshot hash, ignored count) | The shipped CLI has no `--json`; the model needs only the four states. `render --json` carries the machine-readable view |
| D25 | M28-M30 as separate in-memory swap mutants | One contract test with the three swaps as negative controls on `skillProblems` | The skill is text, not code: the controls prove the checker rejects each swap. Each control fails the contract if the checker is weakened |
| D26 | "Same commit" mirror check | Not run yet; nothing is committed. Byte-identity and cursor-mirrors checks pass now | Re-check when S6 is committed, with the Cursor copy in the same commit |

## S7 (2026-10-20)

| ID | Planned | Shipped | Why |
|----|---------|---------|-----|
| D27 | `status` is a read-only report plus round creation | Every `status` starts a new round (attempts reset; `rejected` kept for the same hash) and reports what the loader would show | Review finding: a slot rejected twice stayed locked, and `startedAt` went stale. Trade-off: the two-attempt cap now depends on the skill's "status once per refresh"; it was already resettable by deleting `.round.json`. The cap and draft-age checks are workflow aids, not security boundaries |
| D28 | `check` (no `--draft`) re-runs sanitize and citations | Reports the loader's verdict for the slot (body hash, canonical form, stale flag, validate); prints `(stale)` | Review must-fix 1: `check` was weaker than the loader and is the `recheck` command in `live-runs.md` |
| D29 | `loadFragments` ignores `.round.json` | Reads it so a twice-rejected slot shows its code; only codes `stamp` can record are accepted from the file | Review must-fix 2 and an echo-channel note |
| D30 | Reads through `readSource` | `readBounded`: lstat, one `O_NOFOLLOW`/`O_NONBLOCK` open, fstat same dev/ino and size cap, fragments-dir identity checked before and after; draft identity re-checked before the write | Security review: read race and directory swap. New reasons `draft-too-large`, `draft-unreadable` |
| D31 | Palette tokens unspecified | Aliases `--background`, `--foreground`, `--primaryForeground`, `--mutedForeground` defined in the stylesheet; header `snapshot` normalised to 64 hex or stale; page cap tries full fragments at the top row limit only, then omission notices before any row is dropped | Review should-fixes 5, 6 and security finding 2 |
| D32 | Skill step 3 as first written | Adds the `value` omission example, colour syntax and token list, 4,000-character text limit, non-content rejection codes, empty slot when nothing is citable | Review should-fix 7: a model following the first text failed three ways |

| D33 | D30: fragments-dir identity "checked before and after" closes the swap | It detects a swap, including swap-and-restore (directory `ctimeMs` is part of `dirId`), but does not prevent one. `stamp` re-checks the directory before `writeAtomic` and before each draft delete (`removeDraft`); `status` re-checks around `readdirSync`; a missing `ctimeMs` makes a draft identity unprovable so the draft is kept | Third security round (3 should-fix). **Residual risk, accepted:** `writeAtomic` (shared with `state.json`) and `rmSync` still act by path, so a same-user racer that swaps the directory inside those few instructions can redirect one write of `<slot>.fragment`/`.round.json` or the delete of a `<slot>.draft`. Full prevention needs `process.chdir` into the directory in the CLI process or fd-relative file calls, which Node lacks. The racer already has the user's own file access |

**D33 acknowledged (2026-10-20, owner: "continue").** Residual write/delete race accepted; `process.chdir` hardening logged as a follow-up.

## S9 (2026-10-20)

| ID | Planned | Shipped | Why |
|----|---------|---------|-----|
| D34 | Live-record validator needs 2 passing runs or a not-run row per case and vendor | Needs 2 recorded runs (pass or fail) or a not-run row; passing is the claim's rule | With failing runs the plan's wording forced fake `not-run` rows. Structure and claim are now separate; a negative control covers failing-but-recorded runs. The claim is unchanged: `supported` still needs 2 passes everywhere |
| D35 | Runs in `.project/evals/runs/...` | Runs executed in the scratchpad, then copied (without `ai-framework/` and `.claude/`) with raw logs to `.project/evals/runs/state-ai-authoring/<vendor>/<case>/<n>/` | The repository's AGENTS.md and CLAUDE.md would otherwise load into every vendor session. The `check` replay uses the copy as `--root` |
| D36 | Skill step as written at S7 | Corrected during S9: an unavailable or partial fact still gets a fragment stating that and citing what the snapshot holds; empty only when nothing is citable | The S7 sentence made all `tokens-slot-invented-totals` runs stop at an empty slot. Claude, Codex (tokens, risks+tokens, sparse, partial) and all OpenCode runs were re-run on the final text |
| D37 | Harness as spiked | Codex needs `--skip-git-repo-check`; OpenCode needs `PWD` set to the fixture (it ignores the process cwd); both recorded in the harness lines. First batches (all OpenCode, all Codex) were discarded and re-run | Harness bugs, not model results |
| D38 | Grader replaced if it passes any seeded bad | No replacement needed: 3 graders, 9 seeded-bad each, all failed. 3 seeded fragments (script, `.env` link, script) are rejected by the gate and need no grader | Seeded fragments were mixed blind into each grader's packet |
| D39 | Matrix pass threshold 100% | 51 of 72 pass; claim `blocked` | See `live-runs.md` Grading. The step is not proven on all vendors; OpenCode/haiku follows it in half the runs |

## Audit cycle 1 (2026-10-20)

| ID | Planned | Shipped | Why |
|----|---------|---------|-----|
| D40 | Container reason line "No AI analysis shown: <code>." | Adds a plain next step; stale fragments also show a `status-stale` pill under the label | UX review H9/H1 |
| D41 | Draft decoded leniently | `TextDecoder` fatal, BOM kept: invalid UTF-8 drafts are refused as `draft-unreadable` | Code review: bytes were being repaired silently |
| D42 | Validator needs a seeded row only through the claim | Also a structural problem when a live id has no seeded row | Code review |
| D43 | Read-only guard `review-bench guard check` | Not usable: the snapshot exceeded the tool's size limit once `.project/evals/runs/` (72 runs) existed; read-only verified by an mtime sweep instead. Follow-up: have the guard skip `.project/evals/runs/` | |
Deferred should-fix items and the accepted live-claim block: see log.md "Audit cycle 1".
