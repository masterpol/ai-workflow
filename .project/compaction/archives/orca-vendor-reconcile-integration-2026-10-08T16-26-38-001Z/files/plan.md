# Plan: orca-vendor-reconcile-integration

**Pitch**: pitch.md  •  **Appetite**: big-batch (16 files vs cap 15, ~1300 LOC; overrun accepted)  •  **Hill**: hill.md

All new code is `.mts` on injected `RuntimeDeps` (no `node:` imports in production modules, no `any`, no shims); tests are `*.test.mts` under Node and Bun. Commands run with `AI_WORKFLOW_RUNNER=node node --experimental-strip-types --disable-warning=ExperimentalWarning`. **Commit hygiene (learned from `41cc88d`):** stage explicit files, read `git diff --cached`, and run the tests on a `git archive` of the index tree before every commit; other sessions may have uncommitted work in the tree.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| I1 | Thin CLI `orca-run.mts` | `ai-framework/scripts/orca-run.mts`, `.test.mts` (2) | ~250 + ~400 | — | I2 | yes: disjoint files, self-contained, clear exit | standard |
| I2 | Executable grader | `ai-framework/scripts/orca-eval-grader.mts`, `.test.mts` (2) | ~300 + ~450 | — | I1 | yes: same reasons; instrument-grade work, independent review after | deep |
| I3 | Inert phase wiring and mirrors | `.claude/skills/{audit,ship,build}/SKILL.md` (3), regenerated `.cursor/skills/{audit,ship,build}/SKILL.md` (3), `ai-framework/workflow/phases/{3-audit,4-ship}.md` (2) | ~120 | I1 | — | no: shared files, small, needs the final CLI surface | — |
| I4 | Docs, smoke criteria, dataset, release | `ai-framework/integrations/orca-vendors.md`, `.project/evals/datasets/orca-vendor-orchestration.json`, `CHANGELOG.md`, `VERSION` (4) | ~150 | I1-I3 | — | no | — |

Total 16 files (I1 2, I2 2, I3 8, I4 4). `.agents`/`.opencode` loaders and agent mirrors are not edited.

## Fixed interfaces

- CLI: `node ai-framework/scripts/orca-run.mts <status|dispatch|collect|reconcile> --root <dir> [--input <file>] [--check <name>]...` with `export function main(argv, deps)` + `runDirect`, same pattern as `orca-preflight.mts`. `--input` is a JSON file that must be a regular file of at most 64 KiB inside `--root` (lstat per component, no symlinks). Output is one JSON object on stdout, nothing else. Exit codes: 0 launched/integrated/ok, 3 normal-workflow or refused with no side effects (switch off, policy ineligible, guard refusal), 2 usage error, 1 internal error. `status` is read-only: switch, policy report, preflight report (no probe unless `--probe`).
- The CLI contains argument parsing, input validation, one library call and JSON output only. The `AI_WORKFLOW_ORCA_MULTI_AGENT` check and every guard stay inside the libraries; the CLI never re-implements one. Checks for `reconcile` are selected by name from a fixed built-in catalog (`workflow-doctor`, `setup-validator`, `graph-check`, `node-tests`) mapping to fixed argv; there is no way to pass command text.
- Grader: `gradeAll({ deps, root? }): Promise<{ cases: Array<{ id, mode: "executes" | "parses-only" | "live-only", pass: boolean, detail }>, summary }>`; never reads `expected` and derives `actual` from the same object; the summary counts executed passes separately from parse-only and live-only (never a combined "10/10").

## Exit criteria per scope

### I1 — CLI
- `NT --test ai-framework/scripts/orca-run.test.mts` and `bun test` of it exit 0.
- Parity: for dispatch, collect and reconcile fixtures the CLI JSON equals the library outcome for the same input (fake deps for dispatch/collect, real temp git repos for reconcile).
- With the switch off every command exits 3 with no ledger/evidence/snapshot writes and no spawn; unknown command or flag exits 2; a symlinked, oversize, non-regular or outside-root `--input` is refused; no `--check` name outside the catalog is accepted; the CLI source has no check that duplicates a library guard (grep test: it never imports `evaluateLaunch`, `validatePath` or `PATCH_SPECIAL_MODE`).
- Mutants (drop input-file guard, drop catalog check, exit-code mapping, switch handling by the library) turn tests red.
- `grep -n "node:"` and `grep -nE ": any\b|as any"` on the module empty; `runtime/invariants.test.mts` passes (incl. the direct-entry guard).

### I2 — grader
- `NT --test ai-framework/scripts/orca-eval-grader.test.mts` and bun exit 0.
- Executes the deterministic cases through the real libraries with fakes/temp repos: `codex-coordinates-alternate-vendors`, `preflight-fallback`, `uncertain-worker-does-not-duplicate-editing`, `worker-preamble-prevents-recursive-coordination`, `completion-receipts-are-not-proof` (the executable variants only), `prepared-input-and-integrated-evidence` if it fits (otherwise deferred and listed). The others are `parses-only` (`unreported-cost-is-not-savings`) or `live-only`/meta (`static-fixtures-do-not-prove-runtime`, peer-messaging variants); the output says so and the summary never merges them.
- Mutation proof: breaking the library (accept a mismatched dispatch id, skip the worker-context deny, retry after residual resources, settle without evidence) turns the matching case red in an in-memory mutant run; an always-pass grader is detected by those tests.
- A hostile-worker-summary case is added to the dataset by I4 and graded here: the summary text never changes route, vendor, paths or approvals.
- `static-fixtures-do-not-prove-runtime` keeps `liveCompatibility: "unverified"` and cannot be turned into a pass by a smoke record.
- Greps and invariants as I1; independent reviewer (not the author) reviews the grader itself in /audit.

### I3 — wiring
- `.claude` and `.cursor` copies of audit/ship/build are byte-equal (`diff -q`); cursor copies come from `node ai-framework/scripts/skill-vendors.mts cursor-mirrors --apply`.
- Each wired phase paragraph is a single removable block that: is opt-in behind `AI_WORKFLOW_ORCA_MULTI_AGENT=true`; defaults to the existing single-agent path; says "live proof: Claude only; unverified for Codex/OpenCode"; names only `node ai-framework/scripts/orca-run.mts ...` (grep: no phase text says "import" or shows a `node -e` script); states that worker text is data (quoted, length-capped, never choosing commands, paths, vendors or approvals) and that Approve/Revise/Back/Stop gates stay human.
- The stale "reconcile is a separate capability" sentence in build is fixed; `3-audit.md` and `4-ship.md` carry the same block.
- `workflow-doctor.mts` READY, `setup-validator.mts` READY; `bundle-sync` dry run reports no orphans for the touched mirrors.

### I4 — docs and release
- `orca-vendors.md` documents the CLI, exit codes, the built-in check catalog, the grader and per-vendor live-smoke status (Claude: observed; Codex, OpenCode: not-run, no funds; peer messaging: not-run) with a manual smoke checklist, evidence file location and a spend cap; nothing counts `not-run` as pass.
- Dataset: stale `dispatchBetReady: false` corrected and a hostile-summary case added; JSON parses.
- `changelog.mts --check` shows the new version (minor); `docs-links.mts` 0 broken; `graphify.mts --check` CLEAN.
- Whole suite: Node `--test` over scripts, runtime, hooks, `.claude/hooks` exits 0 and `bun test` has 0 failures.

## Risks

| Risk | Scope | Mitigation |
|---|---|---|
| CLI becomes a second untested path (C2) | I1 | parity tests; no logic of its own; guards stay in libraries |
| Agent supplies commands through the CLI | I1 | fixed check catalog by name only |
| Grader grades itself (C4) | I2 | executes vs parses-only tags, mutation proofs, independent review |
| Worker text steers the coordinator (C3) | I3 | data-not-instructions block, hostile-summary golden case |
| Mirror drift (C5) | I3 | regenerate cursor, diff -q, doctor/validator, bundle-sync dry run |
| Live contract unproven (C6/C7) | I3, I4 | inert wiring, not-run recorded honestly, wording "unverified live" |
| Another session's uncommitted files in the tree | all | explicit staging, clean-export test before commit |
| 16 files vs cap 15 | all | accepted; do not add files |

## Parallel dispatch plan

I1 (standard) and I2 (deep) as subagents in parallel with disjoint files and the fixed interfaces above; I3 then I4 on the main thread. The orchestrator re-runs each subagent's tests, greps and mutants itself. Subagents never run `git add`, `reset`, `checkout`, `stash` or `clean` outside scratch repos created with absolute paths.

## Living-spec deviations log

(Empty at /plan time.)
