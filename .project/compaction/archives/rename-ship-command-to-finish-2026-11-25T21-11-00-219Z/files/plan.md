# Plan: rename-ship-command-to-finish

**Pitch**: pitch.md  •  **Appetite**: big-batch with a declared mechanical-rename exception  •  **Hill**: hill.md  •  **Mode**: Orca (new Run at /build)

## Blast radius (traced 2026-11-25)

**A typed command becomes a phase in three places** (`workflow-capture.mts` reuses the third through `resolvePhaseContext`):
`orca-start-hook.mts` (`PHASES.has(name)` on the Skill tool or slash command), `orca-start-codex-hook.mts` (`leadingPhase`, `/name` or `$name`),
and `token-consumption.mts` (`resolvePhaseContext`). Today the command name and the phase name are the same string, so each keeps its own
closed set. `.claude/settings.json` matchers are `Skill` or `*`: no wiring change.

**Phase names that stay**: `orca-run.mts` `--phase`, `flow-join.mts`, `skill-defaults.mts`, `add-skill.mts`, `skill-defaults.json`.

**Tests that read the real skill directory** (not synthetic fixtures): `instruction-loading.test.mts` (`.claude/skills/${phase}` for build, audit,
ship; Cursor copy checks), `workflow-contracts.test.mts` (lines 16, 230, 239), `skill-defaults.test.mts` (phase-skill directories). The `graphify*`
tests use synthetic fixtures with a `skills/ship` path and need no change. The golden dataset `.project/evals/datasets/instruction-compression.json`
(case `owner-loading-ship`) says "Invoke /ship".

**Command-form references outside history:** 33 files, 73 lines (`/ship`, `$ship`, `skills/ship/`, `commands/ship.md`), plus 3 lines of the form
"→ ship" or "| ship |" to judge by hand.

## Contract fixed here

New pure module `ai-framework/scripts/phase-commands.mts` (no imports with side effects):

```ts
/** Command a person types -> phase name. The only entry where they differ is ship-pitch -> ship. */
export const COMMAND_PHASES: ReadonlyMap<string, string>;   // shape, shape-lite, critique, plan, build, audit, ship-pitch→ship, cooldown, fix, resume, switch, checkpoint
export function phaseOfCommand(name: string): string | undefined;
export function skillDirOfPhase(phase: string): string;     // "ship" -> "ship-pitch", otherwise the phase
```

`ship` is **not** a command any more: typing `/ship` reaches the host's built-in, so no hook may record it as the ship phase or run the Orca start check
for it. The phase id stays `ship` everywhere it is stored or passed with `--phase`.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S0 | Is `finish` free? | none (record the result here) | — | — | — | no: needs a person at each host | — |
| S1 | One command-to-phase mapping in the three hooks | `phase-commands.mts` + test, `orca-start-hook.mts` + test, `orca-start-codex-hook.mts` + test, `token-consumption.mts` + test (8) | ~60 + ~90 | S0 | S2, S3 | yes: disjoint, contract above | standard |
| S2 | Move the skill and its adapters | `.claude`, `.cursor`, `.agents` `skills/ship-pitch/SKILL.md`, `.opencode/commands/ship-pitch.md` (4 moves), `relations.toon`, `instruction-loading.test.mts`, `workflow-contracts.test.mts`, `skill-defaults.test.mts`, the golden dataset (9) | ~40 | S0; uses `skillDirOfPhase` from the contract | S1, S3 | yes: disjoint | standard |
| S3 | Tell installed projects | `bundle-sync.mts` + test (2) | ~15 + ~25 | S0 | S1, S2 | yes: disjoint | fast |
| S4 | Text sweep and guard | about 28 files of one-line edits, plus `command-name-guard.test.mts` (new) | ~75 lines + ~50 | S2 | — | no: coordinator, one rule applied by reading each line | — |
| C1 | Doctor list, changelog, followups | `workflow-doctor.mts`, `CHANGELOG.md`, `VERSION`, `_followups.md` | docs | S1–S4 | — | no: coordinator | — |

**Size, corrected from the pitch:** about 20 files carry logic or tests (S1 8, S2 9, S3 2, guard 1), not "about 12" as the pitch estimated, plus about
28 mechanical text files. This is above the 15-file cap even without the sweep.

## Exit criteria per scope (machine-checkable)

### S0 — name check
- In Claude Code, Codex and OpenCode (all three are installed on this host), a person types `/fin` before the skill exists and confirms no built-in or other command is named `finish`; the result and host versions are written in the deviations log. Cursor is recorded as not checked unless run.
- If any host owns `finish`, the name becomes `ship-pitch` everywhere below, and S1–S4 are re-read before dispatch.

### S1 — mapping
- `bun test` and `node --experimental-strip-types --disable-warning=ExperimentalWarning --test` pass on `phase-commands`, `orca-start-hook`, `orca-start-codex-hook` and `token-consumption` tests.
- Tests: `ship-pitch` (Skill call, slash command, `/ship-pitch`, `$ship-pitch`) reaches the Orca start decision with `phase: "ship"` and records metrics phase `ship`; `ship` does neither (no decision, no phase, exit 0); every other command is unchanged.
- A stored event with phase `ship` and a new one from `ship-pitch` fall in the same phase in the report test.
- `! grep -nE '"audit", *"ship", *"cooldown"' ai-framework/hooks/scripts/{orca-start-hook,orca-start-codex-hook,token-consumption}.mts` (no private command lists left).
- Mutant: mapping `ship-pitch` to `ship-pitch` fails a named test.

### S2 — skill move
- `test ! -e .claude/skills/ship && test ! -e .cursor/skills/ship && test ! -e .agents/skills/ship && test ! -e .opencode/commands/ship.md`.
- `cmp .claude/skills/ship-pitch/SKILL.md .cursor/skills/ship-pitch/SKILL.md`; the skill's frontmatter `name` is `ship-pitch`; it still passes `--phase ship`.
- `instruction-loading`, `workflow-contracts`, `skill-defaults` and `graphify*` tests pass under Bun and Node.
- `node ai-framework/scripts/graphify-relations.mts --check` passes; the git history shows the four files as renames.

### S3 — installed projects
- `bundle-sync` tests pass. A target that still has `.claude/skills/ship/SKILL.md` or `.opencode/commands/ship.md` gets one next step naming the paths, saying the built-in command shadows it, and that `--prune` removes it only when unmodified. A target without them gets none. A modified `ship` skill is never deleted (test with `--apply --prune`).

### S4 — sweep and guard
- `command-name-guard.test.mts` fails when a bundle-owned file (under `ai-framework/`, `.claude/`, `.cursor/`, `.agents/`, `.opencode/`; plus `AGENTS.md`, `CLAUDE.md`, `README.md`, `SETUP.md` only in the bundle checkout, that is without `.project/.bundle-sync.json`) contains `/ship`, `$ship`, `skills/ship/` or `commands/ship.md`, or when a `ship` adapter exists. Allow-list: the guard itself and the `bundle-sync` message and test that name the old paths. A mutant that adds `/ship` to a doc fails it.
- `! git diff -U0 | grep -E '^-.*(SHIPPED\.md|records/shipped|pre-ship-verify|4-ship\.md|--phase ship)' ` unless the same line is re-added unchanged (no phase-name text was renamed).
- `node ai-framework/scripts/docs-links.mts ai-framework/docs ai-framework/integrations .claude/skills` reports 0 broken; no file under `.project/pitches`, `.project/runs`, `.project/records` or `CHANGELOG.md` history is edited by the sweep.

### C1 — release
- `workflow-doctor` and `setup-validator` READY (the new module and test are in the doctor's syntax list); `graphify --check` clean; `changelog --check` passes; full suite on an independent clone: 0 fail.
- Live: in a fresh Claude Code session, `/ship-pitch` loads this skill and the Orca start line appears; recorded as evidence only.
- The version number is chosen when the changelog entry is written.

## Risks (inherited from pitch rabbit holes)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| `finish` is taken by a host | S0 | **yes** | person checks three hosts first; fallback `ship-pitch` |
| Metrics split between old `ship` and new `ship-pitch` | S1 | no | map at ingestion; the stored phase stays `ship`; report test |
| Instruction-structure tests pin the old path or text | S2 | no | the three tests are named above; run all of them |
| Replacing the word "ship" too widely | S4 | no | command forms only, read line by line; diff check on phase-name strings |
| Guard test fails in installed projects over their own entry files | S4 | no | entry files are checked only in the bundle checkout |
| Installed project keeps a stale or customized `ship` skill | S3 | no | next step; never delete a modified file |
| The golden dataset edit changes the live-eval baseline hash | S2 | no | the live eval is opt-in; note that an old baseline report no longer matches |

## Parallel dispatch plan

S0 first. Then S1, S2 and S3 together under a new Orca Run (`assign: implementation`, planIndex 0, 1, 2, with the `runId`); their files do not overlap.
The coordinator re-runs each scope's exit commands, runs S1 and S2 together once both are in, then does S4 and C1. OpenCode port freed before any OpenCode launch.
**Branch:** build on `next/workflow-upgrade-and-improvement`, fast-forwarded to `main` after PR #13 merges (it adds 2.55.0). If PR #13 is still open at /build, ask before stacking.

## Living-spec deviations log

- **2026-11-25 (/build start, owner):** the command is **`ship-pitch`**, not `finish`. The pitch folder keeps its old slug. Everything above has been updated to `ship-pitch`; S0's heading and the first risk row describe the original `finish` check.
- **S0:** the owner chose the new name instead of reporting a check. No user-level command or skill named `ship-pitch` was searched for beyond this repo's and the user config folders for `finish`; availability in each host's built-ins is **not verified**.
- **Branch (owner):** build on the open PR #13 branch (`feat/ship-state-project-sources`), not on `next/workflow-upgrade-and-improvement`.
- **S4, template hashes:** the sweep edited `templates/project/knowledge/README.md`; `consolidation-migrate` pins hashes of earlier templates, so the previous one was registered and the test's old fixture now undoes the rename.
- **Upgrade defect found by the old-project upgrade test:** after a sync without `--prune`, the leftover `ship` files fail the doctor (OpenCode model route) and the graph. **Owner decision:** `bundle-sync --apply` also removes the retired `ship` adapters when unmodified; a customized copy stays and is reported. This amends S3's "do not change prune or apply behaviour" and the pitch's "--prune removes it only when unmodified".
- **The first sweep search missed 4 lines** (`/ship.` at the end of a sentence, `.cursor/agents`); the new guard test found them.
- **C1:** version 2.56.0 (minor), chosen when the entry was written; the command change is breaking for people who type `/ship`. Live check of `/ship-pitch` in a fresh session has not been done.
- **Audit:** auto-removal was rewritten: only content this bundle shipped is removable (the sync baseline is not consulted), from a source that has the renamed skill, with pinned and re-checked removal and non-recursive cleanup.
