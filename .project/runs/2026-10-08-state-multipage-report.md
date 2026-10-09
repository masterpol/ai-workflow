# Shipped: state-multipage-report

**Shipped**: 2026-10-08  •  **Version**: 2.19.1  •  **Appetite**: big-batch  •  **Audit**: 3 cycles, zero must-fix at exit

## Pitch ↔ implementation

| Pitch promise | Result |
|---|---|
| Six linked pages plus the original `state.html` | Done: `index`, `structure`, `skills`, `metrics`, `knowledge`, `pitches`; written as one set |
| Folder diagram that varies by project type, with decisions attached to folders | Done: `workflow-bundle`, `web`, `backend`, `mobile`, `ai-prompts`, `mixed`, `unknown` from names only; collapsible tree; decisions mapped to up to 3 folders. Per-type role templates are minimal (known roles only, rest unlabeled) |
| Base skills vs project skills | Done: base = `.claude/skills` directory names (phases not read), project = registry entries |
| Links to knowledge graph and metrics | Done: shown only when the file exists and passes the link checks; "unavailable" text otherwise |
| Script-free, escaped, CSP, schemaVersion 1, old `state.json` still renders | Done, with tests |
| Orca orchestration | Partly: S0 policy created; S1, S2 and audit cycle 1 ran on ordinary subagents by mistake (see Deviations); audit cycles 2 and 3 and the cycle-2 fixes ran through real Orca workers (Codex, OpenCode) |

## Scopes
S0 done, S1 done, S2 done, S3 done. Files: `state-structure.mts` (199 lines, new), `state-pages.mts` (208, new), `state-render.mts`, `state-snapshot.mts`, `state-theme.mts` (1 export), tests, `state-report.md`, 4 skill mirrors, reports README, changelog. Within the 15-file cap; render files grew about 230 lines net, under the 700 checkpoint.

## No-gos honored
No scripts or external loads in pages; no manifest or source contents read; graph and metrics reports linked, not rebuilt; `status.md` and `runs/` untouched by the report; no project script executed; workers did not ship or answer prompts; `/state` not wired into `/pitch-compress`. Note: the stage-directory lock and a user-file ownership rule were added beyond the pitch (audit findings).

## Rabbit holes
R1 Orca policy: resolved. R2 type detection by names: `mixed` lists every type. R3 page size: 512 KB cap incl. `state.html`. R4 mirrors: done. R5 scan reuse: `insideProject` reused, shared secret policy. R6 staged write: pinned dev/ino, lock, accepted residual path-based race (documented). A1 LOC tight: ended under the checkpoint.

## Deviations (see deviations.md)
Orca misread: `dispatchReady:false` taken as "cannot launch" (it never grants authority); `evaluateLaunch` allowed all along. Corrected in deviations, changelog 2.19.1 and knowledge issue `status-dispatch-ready-false-is-not-launch-authority`. A subagent used `git stash` mid-build (no loss).

## Verification at ship
Node: 1095 tests, 1094 pass, 0 fail, 1 skipped. Bun: 1086 tests, 1085 pass, 0 fail, 1 skipped. `setup-validator` READY, `graphify --check` CLEAN. No build, typecheck, lint or i18n command exists in this repo (skipped). Real commands also run under Bun (7 pages, ownership rule, no scripts). Two failures seen in the first full run were not from this pitch: an invariant test caught `any` in `state-pages.mts` (fixed), and `browser-runtime` fails locally only because `ai_workflow_env.json` selects bun while the test empties PATH (passes with `AI_WORKFLOW_RUNNER=node`).

## Knowledge extracted
Issues: `status-dispatch-ready-false-is-not-launch-authority`, `orca-workers-differ-from-the-coordinator-environment`, `a-local-workflow-env-file-changes-which-runner-path-tests-spawn`. Pattern: `a-report-never-overwrites-a-file-it-did-not-write`. Decision `project-state-report-design` extended.

## Followups
Added to `_followups.md`: snapshot metadata walkers' ancestor containment, mkdir-before-validation and uncapped enumeration, Orca report-path and worker-release notes, runner-pinning in PATH-emptying tests, the new pitch `orca-auto-start-all-phases`.
