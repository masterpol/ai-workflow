# Cross-pitch projection — `fix-bun-project-preload`

Role: `cross-pitch-projector` (pre-bet, projected file sets, not actual diffs).
Date: 2026-11-27. Target: `.project/pitches/fix-bun-project-preload/pitch.md`.
Repository read: `<repo>` (read-only; nothing in the checkout was created or changed).

## Conclusion

Five projected findings against four active pitches (04 part B2, 05, 06, 07). The load-bearing one is **X1**: the re-shaped pitch adds a *new* edit to `ai-framework/scripts/workflow-doctor.mts`, and pitch 07 names that same file. The audit-time cross report on the old change called 07 "disjoint" only because the change it reviewed never touched the doctor (`.project/pitches/fix-bun-project-preload/audit-reports/cross.md`, §2.4). The re-shape creates that overlap, and the required order is already recorded elsewhere: "this ships before pitch 07 edits the doctor and `SETUP.md`" (`.project/pitches/04-greenfield-kickoff/audit.md:120`).

Pitch 05 is disjoint by named file. Pitch 06 shares one module with the fix (`setup-validator`) and carries the fix's wording into the three installed projects.

## Projected file set for this pitch

From the breadboard Places table (`.project/pitches/fix-bun-project-preload/pitch.md:22-28`) plus the uncommitted tree.

| Place (pitch.md) | Projected files |
|---|---|
| Shared launcher (`:24`) — keep the built isolation | `ai-framework/scripts/runtime/entry.mts` (new `bunIsolationOptions()`, lines 12-19), `ai-framework/scripts/runtime/bun-isolated.toml` (new), `ai-framework/scripts/runtime/bun-isolated-tsconfig.json` (new), `ai-framework/scripts/runtime/entry.test.mts`, `ai-framework/scripts/runtime/runtime.test.mts`, `ai-framework/scripts/orca-run.mts` + `.test.mts`, `ai-framework/scripts/orca-eval-grader.mts` + `.test.mts`, `ai-framework/hooks/scripts/pre-ship-verify.mts` + `.test.mts`, `ai-framework/templates/shipped-files.txt` (two new lines) |
| Setup validator parse check (`:25`) — drop the `bun build` branch | `ai-framework/scripts/setup-validator.mts` (Bun branch at `:287`, "not parse-checked" at `:291-292`), `ai-framework/scripts/setup-validator.test.mts` |
| Workflow doctor parse check (`:26`) — drop `Bun.Transpiler` | `ai-framework/scripts/workflow-doctor.mts` (`BUN_PARSE_SCRIPT` at `:26`, branch at `:456`), `ai-framework/scripts/workflow-doctor.test.mts` |
| No usable Node (`:27`) — report, never fall back | `ai-framework/scripts/setup-validator.mts:291-292`, `ai-framework/scripts/workflow-doctor.mts:458` |
| READMEs (`:28`) | `README.md` (lines 71-84, 103-107), `ai-framework/scripts/runtime/README.md` (`:8`, `:41-52`, `:146`) |

Uncommitted state at review time (`git status --porcelain`): 15 tracked files modified plus 2 new untracked runtime configs. That is the isolation half, already in the tree; the parse-check half above is the new work this projection is about. The pitch itself projects "up to 8 files, under 300 lines" and a combined ship of about 18 files, over the 15-file cap (`pitch.md:64`).

## Other active pitches — planned files as named

Only files a pitch actually names are used. Nothing is guessed.

- **04-greenfield-kickoff, part B2** (outline only; no B2 `plan.md` exists): the kickoff skill and its Claude, Cursor, Codex and OpenCode adapters; `project-state.mts` + test; the `/setup` skill and its Cursor mirror; the definition template; `relations.toon`; "the doctor's script list"; `SETUP.md`; `AGENTS.md`; `CLAUDE.md`; the eval dataset (`.project/pitches/04-greenfield-kickoff/pitch.md:108-110`; `.project/pitches/04-greenfield-kickoff/plan-b1.md:14`).
- **05-workspace-recovery** (draft, not shaped): `legacy-upgrade.mts`, `pitch-archive.mts`, `ledger-schema.mts`, `done-work.md`, the compaction journal; scope is compaction-recovery copies and session evidence (`.project/pitches/05-workspace-recovery/pitch.md:9`, `:16-22`).
- **06-workflow-v3-rollout**: per-project `ai-framework/`, `.project/`, root `ai-workflow.toon` (`.project/pitches/06-workflow-v3-rollout/pitch.md:21`); carry list adds `ai-framework/workflow/relations.toon`, `graphify-relations.mts`, `graphify-refs.mts`, `consolidation-migrate.mts`, `legacy-upgrade.mts`, `ai-framework/docs/versioning-and-sync.md`, and a `setup-validator` check (`.project/pitches/06-workflow-v3-rollout/consolidation-carry.md:11-12`).
- **07-archify-local-library**: `add-skill` install/update, `workflow-doctor`, project `.gitignore`, bundle `.gitignore` / setup docs (`.project/pitches/07-archify-local-library/pitch.md:20`); it names `ai-framework/scripts/workflow-doctor.mts` explicitly (`:15`) and plans a new `.gitignore (skill packages)` check in it (`:24`).

## Findings

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| X1 | cross-pitch-projector | high | projected-conflict (pure, same file) | The re-shaped pitch edits `ai-framework/scripts/workflow-doctor.mts` — removing `BUN_PARSE_SCRIPT` (`:26`) and the Bun branch (`:456`) — while 07 names that exact file for a new `.gitignore (skill packages)` check (`.project/pitches/07-archify-local-library/pitch.md:15`, `:24`). Pure overlap on a non-trivial file (~1,100 lines). The old audit-time report called 07 disjoint only because the reviewed change never touched the doctor (`.project/pitches/fix-bun-project-preload/audit-reports/cross.md` §2.4); the re-shape creates the overlap. **Suggestion:** keep the recorded order — "this ships before pitch 07 edits the doctor and `SETUP.md`" (`.project/pitches/04-greenfield-kickoff/audit.md:120`) — and write it into this pitch's Connections so 07 does not open its doctor edit first. The two edits sit in different functions (parse branch vs. a new check), so the merge is expected to be clean; the risk is two writers picking the same file in the same window. |
| X2 | cross-pitch-projector | medium | projected-adjacent (three writers, one file) | 04 part B2 touches "the doctor's script list" (`.project/pitches/04-greenfield-kickoff/pitch.md:110`), which is the `scripts` array in `ai-framework/scripts/workflow-doctor.mts:1048`. The Bun fix edits the same file, and 07 will add a check to it as well — one file, three writers, no owner named for it. **Suggestion:** sequence the file explicitly: Bun fix first, then B2's list step, then 07's check; and require the B2 plan to name `ai-framework/scripts/workflow-doctor.mts` explicitly rather than "the doctor's script list", so the order is visible in the plan. |
| X3 | cross-pitch-projector | acknowledged (known, still live) | projected-conflict (pure, generated file) | `ai-framework/templates/shipped-files.txt` is already edited by the uncommitted change (two added lines: `bun-isolated-tsconfig.json`, `bun-isolated.toml`) and B2 owns the same list (`.project/pitches/04-greenfield-kickoff/plan-b1.md:14`). The list is a committed generated file and a test compares it with Git, failing when stale (`.project/pitches/04-greenfield-kickoff/deviations.md:3`). Already logged in this pitch's own audit as backlog (`.project/pitches/fix-bun-project-preload/audit.md:86`). **Suggestion:** keep it in this pitch's Connections rather than leaving it as backlog, and require B2's plan to *regenerate* the list over the merged tree, not copy a list generated on a pre-fix branch — a stale list fails `pre-ship-verify` loudly at ship time, with no data loss. |
| X4 | cross-pitch-projector | medium | projected-adjacent (shared module) | The new parse-check work lands in `ai-framework/scripts/setup-validator.mts:287` (the `bun build` branch) and `ai-framework/scripts/setup-validator.test.mts`, and 06's P2a track ships a "`setup-validator` check" (`.project/pitches/06-workflow-v3-rollout/consolidation-carry.md:12`). Different hunks in one test file; the fix also changes the Bun-runtime expectation that such a check would be written against. **Suggestion:** the fix ships first so P2a is written against the fixed expectations; and 06 must pin a release that contains the fix — its own rule is that `readiness.md` "must be re-run" at that release (`.project/pitches/06-workflow-v3-rollout/pitch.md:55`). |
| X5 | cross-pitch-projector | medium | projected-content (docs carried by 06) | The READMEs place rewrites the runner wording (`README.md:71-84` and `:103-107`, `ai-framework/scripts/runtime/README.md:8`), and the re-shape adds more sentences (what is protected, that parse checks need Node, what is not protected). RN carries 136 edits "mostly `bun ai-framework/...` wording" and 23 kept-local edits that "differ only in runner wording" (`.project/pitches/06-workflow-v3-rollout/readiness.md:18-19`), which 06 resolves by taking upstream (`:32`). Every added sentence widens that wording gap. **Suggestion:** add to this pitch's Connections: the release pinned by 06 contains this fix, and 06's RN PR is opened after it. After the sync, check each installed project for the old instruction (`grep -rn "bun ai-framework/scripts" README.md ai-framework/scripts/runtime/README.md`) — a hit means that project still documents the unprotected launch. |

## What I checked (direct reads)

- Target pitch `.project/pitches/fix-bun-project-preload/pitch.md`, its `audit.md` and `audit-reports/cross.md`.
- `.project/status.md` (active pitch list, hill state, recorded orders).
- 04: `pitch.md`, `plan-b1.md`, `deviations.md`, `audit.md`. 05: `pitch.md`. 06: `pitch.md`, `consolidation-carry.md`, `readiness.md`. 07: `pitch.md`.
- Checkout code: `ai-framework/scripts/setup-validator.mts:279-302`, `ai-framework/scripts/workflow-doctor.mts:25-26`, `:455-458`, `:1048`, `ai-framework/scripts/runtime/entry.mts`, `ai-framework/scripts/runtime/README.md`, `ai-framework/templates/shipped-files.txt` (diff), `README.md` (diff), `git status --porcelain`, `git diff --stat`.
- Classification vocabulary taken from `.claude/agents/cross-pitch-projector.md` (pure / adjacent / disjoint; high / medium / acknowledged) and `.claude/agents/cross-pitch-conflict-checker.md` (pure = same file edited in both).

## What I infer (projection, not fact)

- B2 has no `plan.md`; its file set is the outline only. Mapping "the doctor's script list" to `ai-framework/scripts/workflow-doctor.mts:1048` is my reading of `04-greenfield-kickoff/pitch.md:110` — the pitch names no path.
- The pitch's parse-check changes are projected from the Places table; no hunks are written yet. The pitch names "one parse helper" (`:30`) without a path; if it lands under `ai-framework/scripts/runtime/`, it must reach the shipped list and 06's sync together.
- Whether 07's new doctor check lands near the parse branch is unknown until 07 plans.
- 05: no shared file with this pitch. The one ordering caveat is inferred, not observed: 05's recovery points at Git and refuses "uncommitted or untracked content" (`.project/pitches/05-workspace-recovery/pitch.md:9`, `:22`, `:26`), while this fix is uncommitted with two untracked files. If 05's removal pass ever reaches `ai-framework/`, Git cannot restore the isolation change. 05's stated scope is compaction and session evidence, so this does not apply as written — unverified either way.
- Appetite pressure is not a cross-pitch finding but raises the odds of contention: the pitch projects about 18 files against the 15-file cap (`pitch.md:64`), and B2 must "split or cut before any build" (`plan-b1.md:16`), so both sides are likely to reach for the same shared files.

## Unverified

- The Bun probe for "which `node` is real" (`pitch.md:48`) and the marker-macro cases: not run here; out of scope for a projection.
- Whether `ai-framework/templates/` is inside 06's `bundle-sync` sync set: not re-checked in this pass; the prior audit report marks it unverified (`audit-reports/cross.md`, §6). It matters for the shipped list and the two new runtime configs travelling together.
- The exact B2 plan, its scope files and its writer order: B2 has not been planned.
- Whether 05's removal scope ever includes bundle code: not determined.

## Note on output location

The dispatcher's authorized-path list names `.project/pitches/fix-bun-project-preload/critique-out/cross.md`, but the task also states that nothing may be written inside the checkout and that this report file is the only output. This report was written to the scratchpad path only; no checkout file was created or modified. For information: an untracked `critique-out/` directory exists at the repository root containing `ws-appetite-auditor.md`, which is outside the authorized path for that sibling role.
