# Plan: fix-bun-project-preload

**Pitch**: pitch.md  •  **Appetite**: big-batch  •  **Hill**: hill.md

**Starting point:** the uncommitted isolation change (15 files besides records) stays as it is. Its history is in log.md and audit.md. It is not a new scope; `/audit` reviews it again with the new work.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | No project source to Bun | `setup-validator.mts` + test, `workflow-doctor.mts` + test | ~170 | — | — | yes: clear exits, one worker | standard (Codex `gpt-6.2-sol` medium) |
| S2 | Doctor runs nothing from the checked folder; documents | `workflow-doctor.mts` + test, `.claude` and `.cursor` `skills/workflow-doctor/SKILL.md`, `ai-framework/docs/workflow-doctor.md`, `README.md`, `ai-framework/scripts/runtime/README.md` | ~120 | S1 (same two files) | — | yes: starts after S1 is verified | standard (same) |

Expected union with the starting point: 21 files; accepted ceiling about 22. A 23rd file goes back to the owner.

## S1 — behavior

1. A parse runs only when the checking process is Node. It uses the existing launcher with the child environment's `AI_WORKFLOW_RUNNER=node`, which selects that same executable. No new spawn path, no `node` search. Decide from `deps.proc.versions`, falling back to `deps.runtime`.
2. Otherwise no parse child starts. Delete `BUN_PARSE_SCRIPT` and the `bun build` arguments.
3. Unparsed files, under Bun or an old Node (exit 3): one `warn` row per command with the count and the reason, naming `AI_WORKFLOW_RUNNER=node` for Bun. No per-file `pass`. The validator's "N TypeScript file(s) parse" counts parsed files only and is absent when none was parsed. Missing-file checks still run.
4. The doctor row is named `Syntax check`. When the validator's child report holds it, the validator's `Workflow doctor` row is `warn`, not `pass`, and the final human summary says that files were not parse-checked. Exit codes do not change for warnings.
5. A doctor parse failure reports fixed text and the exit code, never the child's stderr.

**Exit criteria**
- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/setup-validator.test.mts ai-framework/scripts/workflow-doctor.test.mts` exit 0.
- `bun test` on the same two files exit 0, with the new real-Bun tests run, not skipped.
- New real-Bun tests run each real command over a scratch tree with marker macros imported by relative path, absolute path and package name: no marker. The same tree is recorded leaving a marker before the change.
- A test fails when either command gives a project file to a Bun child (shown with a planted mutant).
- A marker test shows both Node parse forms (type stripping and `--check`) run nothing.
- Tests cover all-unparsed, mixed parsed/unparsed, old Node, JSON and the human summaries. Runner-dependent tests pin the runner in the child environment.
- `! grep -nE 'Bun\.Transpiler|--no-bundle' ai-framework/scripts/setup-validator.mts ai-framework/scripts/workflow-doctor.mts`

## S2 — behavior

1. The doctor runs `graphify.mts` from its own folder. It still requires and parse-checks the project's copy.
2. `opencode debug config` runs only with `--live-opencode`. Without it: one `info` row saying the live configuration was not checked because OpenCode can run project plugins. With it under Bun, the existing "run with Node" row stays. The validator, the ship verifier and the Orca catalog never pass the flag.
3. Documents: what is protected; Bun skips parse checks; how to get them; the new flag, used only in a trusted project, leaving an OpenCode service running; what is not protected (hostile installed bundle or harness settings, direct `bun <script>`, `NODE_OPTIONS`, `BUN_OPTIONS`, bare-name tool lookup through `PATH`). Probes: Bun 1.4.5 and OpenCode 2.4.2 on macOS only.

**Exit criteria**
- The S1 test commands still pass.
- Tests: under both runner values a marker `graphify.mts` in the checked tree never runs; a run without the flag never starts `opencode` (sentinel); with the flag it does, keeping the existing outcomes.
- `! grep -n 'absolute("ai-framework/scripts/graphify.mts")' ai-framework/scripts/workflow-doctor.mts`
- `diff <(sed 1,6d .claude/skills/workflow-doctor/SKILL.md) <(sed 1,6d .cursor/skills/workflow-doctor/SKILL.md)` is empty.
- `grep -l -- '--live-opencode' .claude/skills/workflow-doctor/SKILL.md ai-framework/docs/workflow-doctor.md` lists both.
- `node ai-framework/hooks/scripts/pre-ship-verify.mts` exit 0 (coordinator); `git diff --check` exit 0.
- Coordinator smoke test: the real doctor over the scratch trees from the probes (marker Graphify; marker plugins with a temporary `HOME`) leaves no marker and no new OpenCode service.

## Risks

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| OpenCode runs project plugins | S2 | done 2026-11-27: yes | Owner chose opt-in (A) |
| Doctor's `uv` and Git calls run project settings | S2 | done: `uv --version` and `git rev-parse --git-path hooks` ran nothing in a hostile scratch repository; `git status` control did | No change; only these cases were probed |
| A parse still reaches Bun through the launcher's runner choice | S1 | no | Behavior 1; tests with both environment values |
| A real doctor run hangs a test | S1, S2 | no | Fixture trees; bounded timeouts; no live OpenCode |
| Worker reverts or rewrites the uncommitted isolation | both | no | Brief names it as protected; coordinator compares the diff of untouched files before and after |
| Other tests expect the old rows or the live OpenCode call | both | no | Full verifier |

## Dispatch

S1, coordinator verification, then S2, in the shared checkout through Orca. One writer at a time. The coordinator makes every `.project/` change.

**`/audit`:** three cycles (big-batch). It covers the whole diff, including the starting point. No reviewer from the implementer's vendor.

## Blast radius

Done by direct search in this session; the `/impact` skill was not run. Consumers of the two commands: `pre-ship-verify` (exit code), the Orca check catalog, `bundle-sync` messages, and tests that run them in copied trees. No new file, so the shipped list does not change again. The skill edit has one `.cursor` mirror. Two other documents tell a person to run `opencode debug config` by hand (`ai-framework/docs/setup.md`, `integrations/harnesses.md`); they are left unchanged.

## Order

Ships before pitch 07 edits the doctor; pitch 04 part B2 regenerates the shipped list afterwards; pitch 06 pins a release that holds this.

## Living-spec deviations log

(Empty at /plan time.)
