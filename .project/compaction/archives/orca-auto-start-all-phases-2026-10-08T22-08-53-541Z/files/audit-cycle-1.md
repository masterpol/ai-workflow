# Audit cycle 1 — orca-auto-start-all-phases

Dispatched via Orca (coordinator claude): security (1, codex, independent: yes) | test-coverage (1, opencode, independent: yes) | code review + cross-pitch (1, codex, independent: yes) | ux, i18n, eval (n/a: no UI, strings or prompts)
Independence: fresh dispatches. A canary was planted in the scratch copy only: the bypass check moved before the switch check (`orca-start.mts:123`), which fails 2 scratch tests. All three workers cited `orca-start.mts:123` and the failing tests: canary caught by every reviewer. Read-only: verified by `review-bench guard check` (clean, no changes). Models differ from the author's (Codex, OpenCode). Cross-file interactions: reviewed by the code and security workers.

## Must-fix (blocks /ship)
| ID | Source | File | Issue | Verified |
|----|--------|------|-------|----------|
| M1 | security F3 | orca-start.mts (lookupWorker, status probe, ~lines 143-175) | The probe runs bare `orca` with the full parent env. `resolveExecutable` only inspects absolute PATH entries, but the child resolves `orca` through the original PATH, relative entries included. A project-local `./orca` with `.` on PATH forged the worker list and made `decideStart` return `worker`, skipping readiness | yes: my run on the real tree returned `{"state":"worker"}` for a forged `./orca` |
| M2 | security F2 / code P1 | hook command wiring (.claude/settings.json, hooks.json) | The hook goes through `runDirect`, which re-execs the configured runner before `main`. With the switch ON, `AI_WORKFLOW_RUNNER=bun` and no bun on PATH it exits 1 (non-blocking): the phase proceeds with no readiness check. | yes: my run, exit 1 with `bun was not found`. With `AI_WORKFLOW_RUNNER=node` forced the same input exits 2 (blocked), as designed |

## Should-fix
| ID | Source | Issue | Disposition |
|----|--------|-------|-------------|
| S1 | security F4 / code P2 | build/audit/ship prose tells the agent to run `start --phase <name>` without the required `--root`, and stops only on exit 3/4 (usage exit 2 and internal 1 are uncovered) | fix: `--root .` and stop on 1, 2, 3 and 4, canonical + Cursor mirrors |
| S2 | test-coverage | Hook branch coverage 57%: untested non-slash `UserPromptExpansion`, unknown `hook_event_name`, non-string phase. `orca-start.mts` untested: malformed pagination object, `gate-error` to `internal`, win32 path | add tests |
| S3 | security F2 | An invalid runner value in the env is echoed raw (first 40 chars) in the pre-main error | resolved by M2 (hook never selects the file runner) |

## Canary
F1 (switch must precede bypass), reported by all three workers, is the planted defect, not a defect in the real code (the real file has the right order and 29/29 tests pass). Not a finding.

## Acknowledged → followups
- Cross-pitch (`runner-aware-runtime-boundary-validator`): `orca-start-hook.test.mts` imports `node:child_process`, `node:fs`, `node:os`, `node:path` directly and `orca-start.test.mts:325` has a dynamic `node:module` import; the future validator will flag them. Production files are clean (no `node:`, no `any`). Followup: migrate these tests to `runtime/test-helpers`.
- Repeated whole `orca=normal` tokens and Unicode whitespace separators are accepted as the token; harmless (the user typed it).
- Orca CLI children still see the parent's env for the coordinator-side `evaluateLaunch` calls; that path belongs to the existing launch gate (out of scope per no-go).

## Fix spec (for the cycle-1 fix worker)
M1: run `orca` only through the absolute realpath that `resolveExecutable` returned, and pass children `buildWorkerEnv(env, deps)` (allowlisted env, absolute PATH entries only) for both the worker-list lookup and the status probe. Tests: a forged `orca` in a relative PATH entry and in the project root is never executed; an empty PATH entry; the lookup result for the real executable is unchanged.
M2: both hook commands (`.claude/settings.json`, `ai-framework/hooks/hooks.json`) start with `AI_WORKFLOW_RUNNER=node ` before `node --experimental-strip-types`. The hook test reads the command from the settings file, asserts the prefix, and runs the hook with that env: switch ON, runner configured as bun, no bun on PATH, expects exit 2; switch OFF same setup expects exit 0, no output. Update the 'Automatic start' docs limitation accordingly (POSIX shell prefix; not valid in Windows cmd).
S1, S2 as above.
