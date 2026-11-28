# Cross-pitch conflict check — `fix-bun-project-preload`

**Role:** cross-pitch-conflict-checker · **Mode:** read-only review · **Date:** 2026-11-27
**Subject of the diff:** `pitches/fix-bun-project-preload/plan.md` (uncommitted change = `CHANGE.patch`)
**Compared against:** `pitches/04-greenfield-kickoff` (part B2), `pitches/05-workspace-recovery`,
`pitches/06-workflow-v3-rollout`, `pitches/07-archify-local-library`, and `status.md`.

All paths below are relative to the bundle root, as they appear in the pitch records. No file outside
the work folder was read: the repository checkout, `.env*`, `credentials.json` and
`settings.local.json` were not opened.

## 1. The diff under review

`CHANGE.patch` touches 21 files:

| # | File | # | File |
|---|---|---|---|
| 1 | `.claude/skills/workflow-doctor/SKILL.md` | 12 | `ai-framework/scripts/runtime/entry.mts` |
| 2 | `.cursor/skills/workflow-doctor/SKILL.md` | 13 | `ai-framework/scripts/runtime/entry.test.mts` |
| 3 | `README.md` | 14 | `ai-framework/scripts/runtime/runtime.test.mts` |
| 4 | `ai-framework/docs/workflow-doctor.md` | 15 | `ai-framework/scripts/setup-validator.mts` |
| 5 | `ai-framework/hooks/scripts/pre-ship-verify.mts` | 16 | `ai-framework/scripts/setup-validator.test.mts` |
| 6 | `ai-framework/hooks/scripts/pre-ship-verify.test.mts` | 17 | `ai-framework/scripts/workflow-doctor.mts` |
| 7 | `ai-framework/scripts/orca-eval-grader.mts` | 18 | `ai-framework/scripts/workflow-doctor.test.mts` |
| 8 | `ai-framework/scripts/orca-eval-grader.test.mts` | 19 | `ai-framework/templates/shipped-files.txt` |
| 9 | `ai-framework/scripts/orca-run.mts` | 20 | `ai-framework/scripts/runtime/bun-isolated.toml` (new) |
| 10 | `ai-framework/scripts/orca-run.test.mts` | 21 | `ai-framework/scripts/runtime/bun-isolated-tsconfig.json` (new) |
| 11 | `ai-framework/scripts/runtime/README.md` | | |

The plan claims the same count: `pitches/fix-bun-project-preload/plan.md:14` — "Expected union with
the starting point: 21 files; accepted ceiling about 22."

## 2. Overlap table

| severity | other pitch | our file | their planned file | overlap class | merge-order recommendation |
|---|---|---|---|---|---|
| must-fix | 04-greenfield-kickoff (B2) | `ai-framework/templates/shipped-files.txt` | `ai-framework/templates/shipped-files.txt` (shipped list) | pure | this pitch commits first; B2 regenerates the list after — **already recorded** (`plan.md:71`, `pitch.md:78`, `status.md:9`) |
| must-fix | 07-archify-local-library | `ai-framework/scripts/workflow-doctor.mts` | `ai-framework/scripts/workflow-doctor.mts` (doctor check) | pure | this pitch ships first; 07 edits the doctor afterwards — **already recorded** in `plan.md:71` / `pitch.md:78`, **not** in `status.md` |
| should-fix | 07-archify-local-library | `ai-framework/scripts/workflow-doctor.test.mts` | not named by 07 (same doctor test module) | adjacent (acknowledged tier) | 07 rebases onto the new doctor before writing its assertions |
| should-fix | 06-workflow-v3-rollout (carries P2a) | `ai-framework/scripts/setup-validator.mts` | `setup-validator` check (P2a) | adjacent | 06 pins a release containing both — **already recorded** (`plan.md:71`) |
| should-fix | — (this pitch's own record) | `pitches/fix-bun-project-preload/plan.md:67` | — | documentation | amend the blast-radius sentence before B2 is planned |
| should-fix | — (shared index) | `status.md:9`, `status.md:12` | — | coordination | record the 07 order in the status index |
| — | 05-workspace-recovery | — | `pitch-archive.mts`, `ledger-schema.mts`, `legacy-upgrade.mts` | disjoint | no order needed |
| — | 04-greenfield-kickoff (B2, other files) | — | kickoff skill + 4 adapters, definition template, draft/publication rules, entry files, eval dataset | disjoint | no order needed |
| — | 06-workflow-v3-rollout (own file set) | — | `ai-framework/workflow/relations.toon`, `graphify-relations.mts`, `graphify-refs.mts`, `consolidation-migrate.mts`, `ai-framework/docs/versioning-and-sync.md` | disjoint | no order needed |

Summary: **2 pure overlaps, 2 adjacent overlaps, 5 disjoint relations.** Both pure overlaps are
already covered by an order rule written in this pitch's own plan, so the residual work is
verification at the other pitch's plan/build time, not a new decision.

## 3. Findings

### F1 — must-fix — pure overlap — `ai-framework/templates/shipped-files.txt:338-339`

- **Other pitch:** 04-greenfield-kickoff, part B2.
- **Their line:** `pitches/04-greenfield-kickoff/plan-b1.md:14` — the B2 outline row names
  "pipeline doc, relations, **shipped list**; definition template; …". The concrete path is given in
  `pitches/04-greenfield-kickoff/deviations.md:3` — "the shipped-path list is a committed file,
  `ai-framework/templates/shipped-files.txt`, one path per line … A test in the bundle checkout
  compares the list with Git (tracked plus untracked, unignored files) and fails when it is stale;
  every later bundle file added or removed must regenerate it."
- **Our line:** `CHANGE.patch`, hunk `@@ -334,6 +334,8 @@` on `ai-framework/templates/shipped-files.txt`
  — adds `ai-framework/scripts/runtime/bun-isolated-tsconfig.json` (new line 338) and
  `ai-framework/scripts/runtime/bun-isolated.toml` (new line 339), the two new files of the shared
  Bun isolation launcher.
- **Rule violated:** one owner per generated artifact; two active pitches edit the same generated
  file. The generator is 04's (its staleness test), the consumer of the two new entries is this
  pitch's.
- **Concrete failure scenario:** 04 part B2 builds its list regeneration before this diff lands.
  B2's regeneration rewrites the whole list; when this diff is then applied on top, the
  `shipped-files.txt` hunk is contested at the same alphabetical insertion point (both sides insert
  inside the `ai-framework/scripts/runtime/` block). If the merge keeps B2's side, the two new
  runtime files stay on disk but lose their list entries while 04's staleness test compares the
  list against Git — the test then fails and blocks B2's build; if the test is skipped or the
  comparison is regenerated from a tree where the files are absent, the detector's exclusion set
  silently misses two bundle files (`ai-framework/scripts/runtime/bun-isolated.toml`,
  `ai-framework/scripts/runtime/bun-isolated-tsconfig.json`). Per
  `pitches/04-greenfield-kickoff/pitch.md:43-44` ("Shipped bundle files are excluded **by path** …
  `empty` only after a completed scan that found no application files"), an installed project that
  holds only bundle files would then be reported `existing`/`unclear` instead of `empty`, and
  `pitches/04-greenfield-kickoff/plan.md:44-47` routes `empty`/`resume` into the kickoff interview
  while `existing` keeps today's setup path — the wrong route for a genuinely new project.
- **Merge order that matters:** this pitch's two files must be committed and listed **before** 04
  part B2 regenerates the shipped list. **The plan already records it:**
  `pitches/fix-bun-project-preload/plan.md:71` — "pitch 04 part B2 regenerates the shipped list
  afterwards"; `pitches/fix-bun-project-preload/pitch.md:78` — "pitch 04 part B2 regenerates the
  shipped list after it"; and `status.md:9` — 04 is at "plan (B2), after the Bun `/fix`".
  Residual action: 04's B2 plan must state that its regeneration runs against a tree that contains
  this diff, and its staleness test must be run, not skipped.

### F2 — must-fix — pure overlap — `ai-framework/scripts/workflow-doctor.mts`

- **Other pitch:** 07-archify-local-library.
- **Their line:** `pitches/07-archify-local-library/pitch.md:24` — "`workflow-doctor`: add a
  `.gitignore (skill packages)` check that fails when `.project/skills/packages/` or
  installed-skill wrapper directories are not ignored." The file path is named at
  `pitches/07-archify-local-library/pitch.md:15` —
  "`[ai-framework/scripts/workflow-doctor.mts]` — currently only checks `.project/evals/runs/` and
  `.project/evals/.cache/` in `.gitignore`; skill packages are unchecked."
- **Our lines** (`CHANGE.patch`, `ai-framework/scripts/workflow-doctor.mts`): old line 27, deleted (
  `const BUN_PARSE_SCRIPT = …`), new lines 36 (`const bun = deps.proc.versions ? …`), new lines
  450-470 (`checkNode` → `checkSyntax`, new `warn` row named `Syntax check`),
  new lines 675-680 (`checkOpenCodeResolution` gated behind `--live-opencode`),
  new lines 709 (`const graphify = path.join(import.meta.dirname, "graphify.mts")`),
  new lines 1128-1134 (the `checks` array: `...scripts.map(checkNode)` → `checkSyntax(scripts)`).
- **Rule violated:** one owner per file in flight; this pitch's own plan requires "One writer at a
  time" (`pitches/fix-bun-project-preload/plan.md:61`). Two active pitches hold the same file.
- **Concrete failure scenario:** 07's check has to be registered in the doctor's `checks` array —
  the array this diff rewrites at new line 1131, one line above `checkOpenCodeResolution()`. A 07
  branch cut from the pre-fix HEAD conflicts in exactly that hunk. If the conflict is resolved by
  keeping 07's side, the deleted `BUN_PARSE_SCRIPT` (new line 26) comes back and the per-file Bun
  parse rows return, so the doctor hands project source to Bun's transpiler again — the exact
  defect this pitch closes (`pitches/fix-bun-project-preload/pitch.md:9`, `:23`, `:28`) and the
  security high that is still open on 04 (`status.md:32`: "**Shipped by owner override with a
  security high open (Bun preload)**"). A second failure mode: 07's new check will spawn or read
  `.gitignore`/Git state through the doctor's `runProcess`, whose options type this diff changes
  (new line 391 adds `env?: RuntimeDeps["proc"]["env"]`), and the Bun detection it must branch on
  changes at new line 36 — a 07 check written against the old `deps.proc.versions.bun` test and
  the old `runProcess` contract can pass a wrong runner decision.
- **Merge order that matters:** this pitch ships first; 07 edits the doctor afterwards.
  **The plan already records it:** `pitches/fix-bun-project-preload/plan.md:71` — "Ships before
  pitch 07 edits the doctor"; `pitches/fix-bun-project-preload/pitch.md:78` — "ships before pitch 07
  edits the doctor". It is **not** recorded in `status.md` (see F6), which is the index a 07 planner
  would read first.

### F3 — should-fix — adjacent overlap — `ai-framework/scripts/workflow-doctor.test.mts`

- **Other pitch:** 07-archify-local-library (adjacent, acknowledged tier: 07 names no test file).
- **Their line:** `pitches/07-archify-local-library/pitch.md:24` (doctor check), `:37` ("Exact rule
  format that works for both Git and the doctor's parser"), `:38` ("Whether to fail doctor on
  wrapper-path misses when the skill is not installed in that checkout. Owner: build phase.").
- **Our line:** `ai-framework/scripts/workflow-doctor.test.mts` — the whole file is rewritten by
  this diff.
- **Shared-module evidence (not "near filename"):** the doctor test imports the doctor's `main` and
  the `RuntimeDeps` type and asserts on the doctor's `results` rows. This diff changes that row
  shape: `checkSyntax` records a `warn` row named `Syntax check` instead of one `pass`/`fail` row
  per script, and `requireFile(relativePath, reportPresent = true)` (new line 177) suppresses the
  per-file `pass` row. 07's check produces a row in the same `results` array, so 07's assertions
  and this diff's assertions live in the same module against the same row contract.
- **Concrete failure scenario:** 07's doctor test is written against the pre-fix doctor and
  asserts on the doctor's rows for a fixture tree. After this diff lands, a doctor run under Bun
  emits an extra `warn` row named `Syntax check` (`ai-framework/scripts/workflow-doctor.mts:468`)
  that did not exist before, and a doctor run under Node no longer emits per-script rows. A 07 test
  that counts rows or asserts "no warnings" fails against the new doctor even though 07's own check
  is correct, and a 07 test that expects a per-script `pass` row never arrives. 07 must rebase its
  test expectations, not just its implementation.
- **Merge order that matters:** 07 rebases onto the new doctor and its test module before writing
  assertions. **The plan records the file-level order only** (`plan.md:71`), not the test-level one.

### F4 — should-fix — adjacent overlap — `ai-framework/scripts/setup-validator.mts`

- **Other pitch:** 06-workflow-v3-rollout, for the work it carries (P2a `consolidation-schemas`).
- **Their line:** `pitches/06-workflow-v3-rollout/consolidation-carry.md:12` — P2a ships
  "ledger v2 (dual-read, v1 still valid), decision `status`/`supersedes`, outcome-record template
  + lint, generated `done-work.md` index, **`setup-validator` check**";
  `pitches/06-workflow-v3-rollout/pitch.md:57` — "Depends additionally on: `connected-memory-consolidation`
  P1, P2a, P2d shipped". The check is owned by P2a, not by 06 itself; 06 only carries and pins it.
- **Our line:** `ai-framework/scripts/setup-validator.mts:139-145` (new lines 142-144) — the internal
  helper changes from `async function run(command: string, args: string[])` to
  `async function run(args: string[], env?: RuntimeDeps["proc"]["env"])`, and the old
  `command === deps.proc.execPath ? runWorkflow(...) : deps.child.run(...)` branch is replaced by a
  single `runWorkflow` call. Callers are updated at new line 224 and new line 259.
- **Rule violated:** a changed internal API is a shared contract; a second pitch that adds a check
  to the same module is adjacent to the API change, not disjoint from it.
- **Concrete failure scenario:** P2a adds its ledger check to `setup-validator.mts` and calls the
  helper in the form it had before this diff (`run(deps.proc.execPath, [...])`). After this diff
  lands, that call passes the executable path where the args array is expected and routes every
  command through the workflow launcher instead of `deps.child.run`, so the new check either throws
  or reports a false failure — and a false failure in the validator is blocking
  (`ai-framework/scripts/setup-validator.mts:345-347, 354`: a `fail` row makes the validator exit 1).
  P2a is not one of the four pitches under review, so this is a carried-work adjacency rather than
  a two-pitch file clash, and it is only reachable if P2a is written against a base without this
  diff.
- **Merge order that matters:** 06 pins a release that contains both this change and P2a's check.
  **The plan already records it:** `pitches/fix-bun-project-preload/plan.md:71` — "pitch 06 pins a
  release that holds this".

### F5 — should-fix — documentation — `pitches/fix-bun-project-preload/plan.md:67`

- **Rule violated:** the plan's blast radius must state the real file set; a plan that understates
  it misleads the next pitch that shares a generated file (the pitch's own "README claims must
  match what ships", `pitches/fix-bun-project-preload/pitch.md:93`).
- **The line:** `pitches/fix-bun-project-preload/plan.md:67` — "No new file, so the shipped list
  does not change again."
- **The contradicting evidence:** `CHANGE.patch` adds two new bundle files
  (`ai-framework/scripts/runtime/bun-isolated.toml`, `ai-framework/scripts/runtime/bun-isolated-tsconfig.json`)
  and edits `ai-framework/templates/shipped-files.txt` to list them (new lines 338-339). The
  sentence is true for the new S1/S2 work only; the starting-point isolation change did change the
  shipped list.
- **Concrete failure scenario:** 04's B2 planner reads this pitch's plan as the authority on the
  shipped list, concludes that this pitch has no coupling to it, and regenerates the list without
  checking whether the two isolation configs are listed. The result is the F1 scenario (stale list
  or missing exclusion entries) arriving through a documented justification.
- **Fix:** amend `plan.md:67` to state that the shipped list gained the two isolation configs, and
  that B2's regeneration must include them. The plan is a living record and `deviations.md` exists
  for exactly this.

### F6 — should-fix — coordination record — `status.md:9`, `status.md:12`

- **Rule violated:** the status index is the shared, read-first record of active pitches and their
  constraints; an ordering rule that lives only in one pitch's plan is invisible to the other
  pitch's planner.
- **The lines:** `status.md:9` — 04 is at "plan (B2), after the Bun `/fix`" (the 04 order **is**
  recorded). `status.md:12` — 07 is "shaped: gitignore skill packages so Archify does not commit as
  source", with no constraint on 07's start. `status.md:8` — this pitch is "built S1 and S2,
  verifier passed; not yet re-audited; **nothing committed**".
- **Concrete failure scenario:** 07 is queued behind this pitch in `pitches/fix-bun-project-preload/pitch.md:78`
  and `plan.md:71`, but the index a 07 planner reads (`status.md:12`) shows no such dependency, so
  07 can be planned or built against the pre-fix doctor and produce the F2 conflict — with a merge
  that restores the Bun parse branch.
- **Fix:** add the 07 order to the 07 row of `status.md` when this pitch ships. Also note
  `status.md:9` still reads "**Bun security high open, `/fix` still due**" for 04: that is this
  pitch, so 04's row must be updated at this pitch's ship (the `.project/` change is the
  coordinator's, per `plan.md:61`).

## 4. Disjoint relations (checked, no finding)

- **05-workspace-recovery** — disjoint. It names `pitch-archive.mts`, `ledger-schema.mts`,
  `legacy-upgrade.mts` and the compaction journal
  (`pitches/05-workspace-recovery/pitch.md:16-20`); none of them is in the 21-file diff. It is
  still a draft at "shape" with appetite unset (`status.md:10`) and has no plan file, so it names
  no further files. Nothing to order.
- **04-greenfield-kickoff B2, other files** — disjoint. B2's outline names a `kickoff` skill with
  four adapters, a definition template, draft/publication rules with tests, the entry files
  (`AGENTS.md`, `CLAUDE.md`) and the eval dataset
  (`pitches/04-greenfield-kickoff/plan-b1.md:14`); none appears in the diff. `README.md` was B1's
  file (`pitches/04-greenfield-kickoff/plan-b1.md:32`) and B1 has shipped (`status.md:31`); B2's
  outline does not name `README.md`. Only the shipped list (F1) is a shared file.
- **06-workflow-v3-rollout, own file set** — disjoint. Its bundle-side files are
  `ai-framework/workflow/relations.toon`, `graphify-relations.mts`, `graphify-refs.mts`,
  `consolidation-migrate.mts` and `ai-framework/docs/versioning-and-sync.md`
  (`pitches/06-workflow-v3-rollout/consolidation-carry.md:11`, `:13`, `:33`); none is in the diff.
  06 syncs a pinned release into other repositories (LAH, RN, climbing-lab), so it does not edit
  this checkout's files in the same pass. The only adjacency is the carried P2a validator check (F4).

## 5. Merge order that matters, and whether the plan records it

| Order | Recorded in the plan? | Where else |
|---|---|---|
| this pitch commits/ships → 04 part B2 regenerates the shipped list | **Yes** — `pitches/fix-bun-project-preload/plan.md:71` | `pitch.md:78`, `status.md:9` |
| this pitch ships → 07 edits the doctor | **Yes** — `plan.md:71` | `pitch.md:78`; **not** in `status.md` (F6) |
| this pitch ships → 06 pins a release that contains it | **Yes** — `plan.md:71` | `pitch.md:78` |
| 05 vs this pitch | not needed (disjoint) | — |

Both pure overlaps are therefore already sequenced by this pitch's own plan. The remaining risk is
execution, not decision: the order must be carried into 04's B2 plan, 07's plan and `status.md`,
and the two generated-file tests (04's shipped-list staleness test, this pitch's full verifier)
must be run after each merge rather than skipped.

## 6. What I tried that did not work

- Looked for a B2 plan file (`pitches/04-greenfield-kickoff/plan-b2.md` or any `plan*.md`): it does
  not exist in the work folder — `ls` shows only `pitch.md`, `plan.md`, `plan-b1.md` and
  `deviations.md` for 04. B2's file list could not be read directly; I used the outline row at
  `plan-b1.md:14` and the file-level facts at `deviations.md:3` instead.
- Looked for `plan.md`, `deviations.md` and `log.md` for 05, 06 and 07 (role step 2 — additional
  touched files): none exist. 05 and 07 have only `pitch.md`; 06 has `pitch.md`,
  `consolidation-carry.md` and `readiness.md`. Their file sets could only be taken from the pitch
  text, so the 05/06/07 classifications are "no file named by them", not "no file touched by them".
- Grepped the whole `pitches/` tree for "shipped|doctor|setup-validator|README|relations|entry
  file": the result set was truncated at 80 matches, so I re-read the six files that carry the
  evidence directly instead of trusting the truncated list.
- Tried to find the shipped-list path in 04's `plan.md`/`plan-b1.md`: neither names a path; the
  path `ai-framework/templates/shipped-files.txt` comes from `deviations.md:3` only.
- Did not read the repository checkout, so I could not confirm the shipped-list generation
  procedure, the staleness test's current behaviour, or whether `SETUP.md`'s copy list and
  `shipped-files.txt` are the same set. 04's `deviations.md:3` is used as the statement of the
  procedure.

## 7. Unverified items

- **B2's full overlap surface.** B2 has no plan file; its scope is an outline row of "about 17 or
  more" files and `status.md:9` says B2 "must split or cut" before it is built. Only the shipped
  list is nameable today. Any B2 file that lands on one of the 21 files above cannot be checked
  from the evidence in this work folder — **unverified**, and it is the main residual risk.
- **Whether the shipped-list staleness test currently passes with this diff applied** (it depends on
  the two new files being tracked or untracked-but-unignored in the real checkout) — **unverified**,
  the checkout was not read.
- **07's test file.** 07 names no test file; F3's mapping onto
  `ai-framework/scripts/workflow-doctor.test.mts` is inferred from there being one doctor test
  module — acknowledged tier, not a named overlap.
- **P2a's validator check.** Its exact call shape and base revision are unknown (P2a's plan is not
  in this work folder), so F4's failure scenario is conditional on P2a being written against a
  pre-change base — **unverified**.
- **07's `.gitignore` rules vs this diff:** 07 names the bundle `.gitignore` and `SETUP.md`
  (`pitch.md:20`, `:25`); neither is in the diff, so no overlap was claimed there.
