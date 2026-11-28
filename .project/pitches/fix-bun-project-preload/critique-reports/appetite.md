# Appetite audit — `fix-bun-project-preload`

Read-only pre-bet check of `.project/pitches/fix-bun-project-preload/pitch.md` against the real
size of the uncommitted change. Role: `.claude/agents/appetite-auditor.md` (fast profile).
Nothing in the repository checkout was created or changed.

Declared appetite: **big-batch** (pitch.md:3). Caps from the role prompt
(`.claude/agents/appetite-auditor.md:30`): **≤15 files, ≤1500 LOC**.

## Verdict

**Projected combined ship: 18 files / ~450–560 insertions (LOC counted as insertions).**
**Files: over the 15-file cap (1.2×). LOC: about a third of the 1500-line cap.**

This is a borderline case (medium), not a runaway (high), and the binding dimension is the file
count only. The pitch's own size sentence is arithmetically inconsistent with the numbers it
states, and the worst case is two to three files higher than the pitch's figure because it
depends on a /plan decision the pitch has not priced.

Recommendation: **do not accept the overage as a blanket waiver; take the cut the pitch already
contains.** The pitch splits its own work in two — the breadboard (pitch.md:24–28) and the
rabbit holes pushed to /plan (pitch.md:48–50) — and those two scopes have different file counts.
Ship them as two units, with the isolation change riding along in the first. The second unit is
the one that restores the pitch's rule.

## Findings

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| A1 | appetite-auditor | medium | scope-overrun | The combined ship projects 18 files against a 15-file cap (`ai-framework/agents` role caps, `.claude/agents/appetite-auditor.md:30`). pitch.md:64 states "up to 8 files" of new work against "already 15 files" and then calls the sum "about 18" — 15 + 8 is 23, so the 18 is only reachable if 5 of the 8 new-work files are already inside the isolation set. That overlap is real (README.md, `ai-framework/scripts/runtime/README.md`, `runtime/entry.mts`, `runtime/entry.test.mts`, `setup-validator.test.mts` are all in the current diff) but pitch.md:64 never states it, and the figure silently depends on it. State the overlap and quote a range (18–21) instead of "about 18", so the bet decision is made on a number that survives a /plan change. |
| A2 | appetite-auditor | medium | unpriced-dependency | The "which node is real" rabbit hole (pitch.md:48) is a prerequisite for the parse-check rows (pitch.md:25–26), not an optional extra, and it is not in the 8-file / 300-line projection at pitch.md:64. Parsing with Node under Bun needs a Node that is real and outside the checked tree; a bare `node` can resolve to the project's `node_modules/.bin/node`. There is no such resolver in `ai-framework/scripts/runtime/` today (grep over `runtime/*.mts` finds only `process.execPath` uses), so this is new code. If /plan gives it its own runtime module, it adds 3 files — module, its test, and the `ADAPTERS` registration it needs because that allowlist is explicit and lists only four files (`ai-framework/scripts/runtime/invariants.test.mts:14`, sources auto-enumerated at line 25). At 21 files the projection reaches 1.4× the cap, which is the role's high threshold, so price this in /plan before the bet or fold it into `runtime/entry.mts` and keep the 8-file shape. |
| A3 | appetite-auditor | acknowledged | headroom | LOC is not the binding dimension and the pitch should say so plainly. Measured: the uncommitted isolation change is +244/−40 across 15 tracked files, of which 7 inserted lines are records (`.project/status.md`, `.project/pitches/_followups.md`), so the code part is ~+237/−40; the new work estimates to ~170–320 lines across its 8 files, or ~+120–200 more if the real-Node resolver becomes its own module. Combined that is ~450–560 insertions against the 1500 LOC cap (`.claude/agents/appetite-auditor.md:30`) — roughly a third. The file overage comes from breadth (11 launch sites plus their test and doc companions), not from size. Keep the LOC cap in the pitch as the real guard, and state the file overage as a named concession. |
| A4 | appetite-auditor | medium | cut-option | The safe cut is already inside the pitch. Scope 1 = the built isolation change plus the parse-check removal (setup-validator.mts + workflow-doctor.mts + their tests): 18 files, 3 over cap, ship as one unit with the overage recorded. Scope 2 = the work pushed to /plan (pitch.md:48–50): the real-Node selection, the summary that must not read as a pass when files were not parsed, and the marker test for Node's two parse forms — 3–8 files, well inside cap on its own. Keep the README edits (pitch.md:28) in scope 2, since the shipped README must not claim the full rule before scope 2 lands. |
| A5 | appetite-auditor | medium | sequencing-risk | Neither scope can ship alone while the other's claim sits in the READMEs. The macro hole in the two parse checks is pre-existing code, not something the isolation change introduces (audit.md:78–79: "The same command exists before this fix"; the isolation diff never touches `setup-validator.mts` or `workflow-doctor.mts`), so shipping the isolation change first is not a regression against the pre-change bundle — but it would ship a bundle whose README states that Bun "never reads project source as code" (pitch.md:20, pitch.md:32) while the parse checks still expand project macros. Either narrow that sentence in the shipped README or accept the 3-file overage explicitly. Do not let the overage be absorbed by the short "Betting accepts that" clause at pitch.md:64 — the audit has already said the fix "must not ship as it stands" (audit.md:5), so the concession needs a name and an owner. |

## What I checked

Measurements and file-level facts, each reproduced from the checkout:

- `git status --short`, `git diff --stat`, `git diff --cached --stat` (staged diff empty) at
  `<repo>`: 15 tracked files modified, +244/−40.
  Untracked new source files: `ai-framework/scripts/runtime/bun-isolated.toml` (2 lines),
  `ai-framework/scripts/runtime/bun-isolated-tsconfig.json` (1 line). Also untracked: the pitch
  folder, another pitch folder, and a repo-root `critique-out/` directory that belongs to other
  workers — none counted.
- Records inside the diff: `.project/pitches/_followups.md` (+6) and `.project/status.md` (+1).
  Excluding them, the isolation change is 13 modified code/doc files + 2 new = **15 files**, which
  matches pitch.md:64 exactly. That claim is accurate.
- The isolation file set, from the diff: `README.md`, `ai-framework/hooks/scripts/pre-ship-verify.mts`
  (+ `.test.mts`), `ai-framework/scripts/orca-eval-grader.mts` (+ `.test.mts`), `ai-framework/scripts/orca-run.mts`
  (+ `.test.mts`), `ai-framework/scripts/runtime/README.md`, `ai-framework/scripts/runtime/entry.mts`
  (+ `.test.mts`), `ai-framework/scripts/runtime/runtime.test.mts`, `ai-framework/scripts/setup-validator.test.mts`,
  `ai-framework/templates/shipped-files.txt`, plus the two new config files.
- Overlap between that set and the breadboard rows at pitch.md:24–28: five files recur
  (`README.md`, `runtime/README.md`, `runtime/entry.mts`, `runtime/entry.test.mts`,
  `setup-validator.test.mts`). The remaining breadboard files are new to the ship:
  `ai-framework/scripts/setup-validator.mts`, `ai-framework/scripts/workflow-doctor.mts`,
  `ai-framework/scripts/workflow-doctor.test.mts`.
- Code read for the new work: `ai-framework/scripts/setup-validator.mts:269-305` (the Bun branch at
  line 287 is `["build", "--no-bundle", file]`; the info-level "not parse-checked" path at lines
  291-292 is already gated on `!bun`, so it is the row at pitch.md:27 that carries over); and
  `ai-framework/scripts/workflow-doctor.mts:26` (`BUN_PARSE_SCRIPT` using `Bun.Transpiler`) with
  `checkNode` at lines 452-461.
- The isolation change already in the tree: `ai-framework/scripts/runtime/entry.mts:12-19`
  (`bunIsolationOptions`) and 26-35 (`workflowInvocation`), where the runner switch picks a bare
  name — the same bare-name problem pitch.md:48 raises.
- No existing real-Node resolver: `grep` over `ai-framework/scripts/runtime/*.mts` for
  `execPath`/`realNode` returns only `process.execPath` uses (`entry.mts:26`, `node.mts:407`).
- Cost of a new runtime module: `ai-framework/scripts/runtime/invariants.test.mts:14` keeps an
  explicit four-entry `ADAPTERS` allowlist for files allowed to import `node:*`, and line 25
  auto-enumerates every non-test `.mts`/`.ts` as a source, so a new runtime module that imports
  `node:fs`/`node:path` needs that file edited too.
- Baseline for prior-work calibration: `ai-framework/scripts/runtime/entry.mts` is 68 lines,
  `entry.test.mts` 185, `setup-validator.mts` 348, `setup-validator.test.mts` 616,
  `workflow-doctor.mts` 1173, `workflow-doctor.test.mts` 1108, `runtime/node.mts` 443. Prior runs
  under `.project/runs/` (177 files) record narrative build evidence rather than a consistent
  file/LOC field, so the only directly comparable baseline is the isolation change itself.
- Audit context: `audit.md:78-79` (the two open must-fix findings, both about macros in the parse
  checks), `audit.md:5` ("The fix must not ship as it stands"), `log.md:30` (the built scope's file
  list, matching the diff).

## What I infer

Judgements and estimates, not verified facts:

- The per-file line counts for the new work are my estimates from the size of the code that has to
  change (for example, `checkTypeScriptEntries` at setup-validator.mts:271-305 is ~35 lines and the
  Bun branch is one of them). No plan exists yet, so there is nothing to measure against.
- That the real-Node selection becomes its own runtime module is my expectation from the repo's
  one-concern-per-file layout and from the `ADAPTERS` allowlist, not something the pitch states. If
  /plan folds it into `runtime/entry.mts`, the union is 18 files; if it gets its own module it is
  20–21.
- That the isolation change introduces no new project-code execution is an inference from the audit
  (audit.md:93 "Closed for workflow-started Bun launches, in the cases probed") plus the diff
  itself; I did not re-run the marker probes.
- That removing the Bun parse branches fully closes the two must-fix findings is a code-review
  question I did not answer. One scope risk is worth flagging to that reviewer: `checkNode`
  (workflow-doctor.mts:456) sends `.js` files through the Bun transpiler today and through
  `node --check` under Node, and the pitch row at pitch.md:26 wants one Node parse for both
  runners including its `.js` files — the two paths may not accept the same files in a directory
  without `"type": "module"`. I did not verify that.
- The "about 18" reading of pitch.md:64 assumes the author meant the file union, not the sum.
  I read it as the union because 15 + 8 = 23 and 18 = 15 + 3, which is the union count.

## Note on the output path

The task lists `.project/pitches/fix-bun-project-preload/critique-out/appetite.md` as an
authorized path, but the same task forbids writing anything inside the repository checkout and
names the scratchpad report as the only output file. I followed the no-write rule: this report and
one probe marker live under the scratchpad, and the checkout is untouched.
