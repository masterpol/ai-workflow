# Plan: orca-auto-start-all-phases

**Pitch**: pitch.md  •  **Appetite**: big-batch (narrowed to batch A+B)  •  **Hill**: hill.md

## Facts established while planning (2026-10-08)

- **Worker identity (R11):** a Codex worker's environment has the same `ORCA_*` pane variables as the coordinator (probe `plan-envprobe-1`, names only). There is no `ORCA_WORKER_CONTEXT`, `ORCA_DISPATCH_ID` or `ORCA_AGENT_SESSION_ID` in either. Env markers cannot identify a worker; use the brief's `--worker-context` flag plus a terminal-handle lookup (`ORCA_TERMINAL_HANDLE` against `orca orchestration worker-list` agent terminals).
- **Claude Code hooks (docs, via the claude-code-guide agent; treat as unverified until S0 confirms):** a typed `/shape` bypasses `PreToolUse(Skill)`; it goes through `UserPromptExpansion` (matcher = command name, can block). `PreToolUse` exit 2 blocks and shows stderr to Claude; JSON `permissionDecision` `deny`/`ask` is the alternative. `timeout` is in seconds (command default 600) and **a timed-out PreToolUse command hook lets the call continue** (fail-open), so the script must enforce its own deadline below the hook timeout and exit 2 itself. Exact Skill `tool_input` keys and subagent firing are not documented; settings changes are picked up by the file watcher.
- **Slots:** two stale ledger entries (`attempt-smoke-test-2`, `live-smoke-opencode-1`) hold two of three `maxConcurrentWorkers` slots, so only one worker can run at a time until they are cleared (P0).

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| P0 | Free worker slots | `.project/metrics/orca-ledger/*` (git-ignored; 2 records, user approval) | 0 | — | S0 | no: destructive ledger edit needs the user's yes | — |
| S0 | Hook payload capture spike | temporary capture script + temporary hook entry (not shipped, not counted) | 40 | — | P0 | no: needs the user to type one command | — |
| S1 | `start` decision library | `ai-framework/scripts/orca-start.mts` (new), `orca-start.test.mts` (new) | 520 | — | S0 | yes: self-contained, disjoint files, clear exit | standard (Codex) |
| S2 | `orca-run.mts start` CLI | `ai-framework/scripts/orca-run.mts`, `orca-run.test.mts` | 140 | S1 | — | yes: two files, contract fixed by S1 | standard (Codex) |
| S3 | Claude hook | `ai-framework/hooks/scripts/orca-start-hook.mts` (new), `orca-start-hook.test.mts` (new), `ai-framework/hooks/hooks.json`, `.claude/settings.json` | 360 | S0, S1 | S2 | yes: disjoint files; builds against the S1 contract and S0 fixtures | standard (Codex) |
| S4 | Docs | `ai-framework/integrations/orca-vendors.md` | 70 | S1-S3 | — | yes: prose only | fast (OpenCode) |
| S5 | Stop-and-ask wording (separable) | `.claude/skills/{build,audit,ship}/SKILL.md`, `.cursor/skills/{build,audit,ship}/SKILL.md` | 60 | S2 | S4 | yes: prose, byte-identical mirrors | fast (OpenCode) |

Projected 15 delivery files with S5 (9 without), plus VERSION and CHANGELOG written by `changelog.mts` and not counted as delivery. **S5 is separable:** if S1-S4 end above 12 files or 1,300 lines, S5 moves to a followup pitch instead of squeezing past the cap. Review roles use the `opencode` worker per `.project/orchestration.json`.

### Contract between scopes (so they can be built from fixtures)

`decideStart(options)` in `orca-start.mts` returns `{ state, reason, line, workers? }`:

| state | when | exit via CLI | `line` |
|---|---|---|---|
| `off` | switch not exactly `true` (env first, then `ai_workflow_env.json`). Nothing else read, probed or spawned. | 0 | `""` |
| `worker` | `workerContext` flag, or the caller's `ORCA_TERMINAL_HANDLE` is an agent terminal of an open dispatch | 0 | `""` |
| `bypassed` | switch true and the invocation carries the whole token `orca=normal` | 0 | `Orca: bypassed by request (orca=normal)` |
| `ready` | switch true and `evaluateLaunch` allowed for every worker the coordinator's roles need, and the worker-side `orca` resolves to the probed executable | 0 | `Orca: ready (coordinator <v>, workers <list>)` |
| `blocked` | switch true and any check denies, times out or throws | 4 | `Orca requested but not ready: <reason>. Fix it, or re-invoke with orca=normal to run this phase without Orca.` |

Inputs are typed fields (`root`, `phase`, `vendor`, `argsText` raw and unparsed, `workerContext`, `terminalHandle`, `deadlineMs`, `deps`, `run`). Decision order is fixed: switch → bypass token → worker identity → gate. The bypass token is only honoured after the switch is true. A cumulative deadline (default 4 s) covers every probe; expiry is `blocked: timeout`. Nothing is cached; every call re-reads policy and re-probes.

## Exit criteria per scope (machine-checkable, ≥1 per scope)

### P0 — Free worker slots
- `ls .project/metrics/orca-ledger | wc -l` shows the two stale records gone only after the user approves; each is first shown (`cat`) so the user sees what is deleted.
- A trial `orca-run.mts dispatch` for a harmless read-only scope returns `route: launched` instead of `max-concurrent-workers`.

### S0 — Hook payload capture spike
- A capture file `.project/metrics/orca-smoke/hook-capture.jsonl` (git-ignored) holds one record each for: a `Skill`-tool call, a user-typed `/state`, and (if reachable) a skill call inside a subagent, with field names recorded in `deviations.md`.
- Answers recorded: skill-name key, args key, whether `UserPromptExpansion` exists on this Claude Code version and its command-name/args keys, whether a subagent skill call fires `PreToolUse`. The temporary hook entry is removed and `git diff -- .claude/settings.json` is empty afterwards.
- If `UserPromptExpansion` does not exist or cannot see typed commands, S3 falls back to `UserPromptSubmit` matching a leading `/<phase>`; the plan records which.

### S1 — `start` decision library
- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/orca-start.test.mts` exit 0 and `bun test ai-framework/scripts/orca-start.test.mts` exit 0.
- Tests prove: switch off touches nothing (env/PATH/spawn getters that throw if touched); each row of the decision table; bypass token grammar (whole token only, duplicates, empty and `--` args, quoted or embedded `orca=normal` ignored, never honoured when the switch is off); worker identity by flag and by terminal-handle lookup, and `blocked` when the lookup cannot run; gate denial per worker; cumulative-deadline expiry; worker-side `orca` PATH check (the `/usr/local/bin/orca` failure from `orca-workers-differ-from-the-coordinator-environment`); internal error → `blocked`, never a pass; no caching between calls.
- Guard tests are proven with in-memory mutants (remove the switch check, remove the worker check, invert the deadline) that turn at least one test red, run in a scratch copy only.
- `grep -nE ':\s*any\b|\bas any\b|from "node:' ai-framework/scripts/orca-start.mts` prints nothing (invariants test) and `node --test ai-framework/scripts/runtime/invariants.test.mts` exit 0.

### S2 — `orca-run.mts start`
- `node --test ai-framework/scripts/orca-run.test.mts` and `bun test` the same file exit 0 with new cases: `start --phase shape` with the switch off prints one JSON line `{"state":"off",...}` exit 0; blocked exits 4; usage errors exit 2; free-form `--args-text "orca=normal fix the login bug"` is accepted whole; an unknown phase is a usage error.
- `node ai-framework/scripts/orca-run.mts start --root . --phase shape --vendor claude` prints one JSON object and exits 0 or 4 on this machine (real run, result recorded in `log.md`).
- Exit codes already in use (0, 1, 2, 3) are unchanged: `node --test ai-framework/scripts/orca-eval-grader.test.mts` exit 0.

### S3 — Claude hook
- `node --test ai-framework/hooks/scripts/orca-start-hook.test.mts` and `bun test` the same file exit 0. Tests spawn the real script: switch off → exit 0, empty stdout, with `PATH` emptied and `AI_WORKFLOW_RUNNER=bun` (the R14 case); non-phase skill → pass-through; `ready` → exit 0 with `hookSpecificOutput.additionalContext`; `blocked` → exit 2 with the reason on stderr and no JSON on stdout; deadline expiry → exit 2 (not a pass-through); malformed or oversize stdin with the switch on → exit 2, with it off → exit 0; `orca=normal` → exit 0 with the bypass note; a worker → exit 0 silent.
- The script imports no `node:*` module except through the same allowlisted entry the other hooks use, runs under plain Node without `runDirect`'s re-exec, and loads `orca-start.mts` only after the switch reads `true` (asserted by a test that makes that import throw when the switch is off).
- `node ai-framework/scripts/workflow-doctor.mts` exit 0 and `node --test ai-framework/scripts/workflow-doctor.test.mts` exit 0 (it parses `hooks.json` and `.claude/settings.json`); `node ai-framework/scripts/setup-validator.mts` READY.
- Live: with the switch on, typing a phase command in a fresh session shows the `Orca: ready` line or the blocked question (manual, recorded in `log.md`); with the switch off, no extra output.

### S4 — Docs
- `grep -c "orca=normal" ai-framework/integrations/orca-vendors.md` ≥ 2 and the decision table is present; `node ai-framework/scripts/setup-validator.mts` READY; `node ai-framework/scripts/graphify.mts --check` CLEAN.

### S5 — Stop-and-ask wording
- `cmp .claude/skills/build/SKILL.md .cursor/skills/build/SKILL.md` (and audit, ship) exit 0; `grep -c "stop and ask" .claude/skills/{build,audit,ship}/SKILL.md` ≥ 1 each; the old "continue with the normal single-agent path" sentence is gone from the Orca blocks only; `node --test ai-framework/scripts/skill-defaults.test.mts` exit 0; `node ai-framework/scripts/setup-validator.mts` READY.

## Risks (inherited from pitch rabbit holes)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| R1 typed commands bypass `PreToolUse(Skill)`; `UserPromptExpansion` unverified | S0, S3 | yes (S0) | capture real payloads; fall back to `UserPromptSubmit` |
| R2 exit 2 blocks (docs) but a timeout lets the call through | S3 | no | script-owned deadline below the hook timeout, exits 2 itself |
| R3 other hosts unverified | — | no | deferred to the adapters pitch; documented as not live-proven |
| R4 meaning of "Orca starts" for phases without fan-out | S3, S4 | no | minimum = the start line and honouring `blocked`; dispatch wiring stays in `critique`, `audit`, `build` as today |
| R5 readiness source | S1 | no | `evaluateLaunch` per needed worker |
| R6 mirror drift across 12 skills | — | no | deferred (rollout pitch) |
| R7 hook budget | S1, S3 | no | cumulative 4 s deadline, hook `timeout` 8 s |
| R9 worker-side `orca` path, shared checkout, slots | S1, P0 | no | PATH resolution check under the worker env allowlist; no git commands in the probe; P0 |
| R10 cumulative deadline + JSON/human separation | S1, S3 | no | one deadline object passed to every probe; hook prints JSON only when `ready`, stderr text when `blocked` |
| R11 worker identity | S1 | no (spike done) | flag + terminal-handle lookup; cannot-tell → `blocked` |
| R12 refusal after `ready` falls back to normal | S5 | no | prose only; dispatch core untouched (no-go) |
| R13 bypass grammar | S1 | no | whole-token parser reusing `extractInvocationArg`'s style, tests listed above |
| R14 off path re-exec | S3 | no | hook is plain Node and reads the switch first; CLI `start` is not the hook path |
| R15 validator overlap | S1, S3 | no | no `node:*` imports, `RuntimeDeps` only; coordinate with `runner-aware-runtime-boundary-validator` before landing |
| Slot starvation (one worker at a time) | P0 | no | clear the two stale ledger entries or build sequentially |

## Blast radius (`/impact`, from grep over the repo)

- `orca-run.mts` ← `orca-run.test.mts`, `orca-eval-grader.mts` and its test (exit codes and command list), the `build`/`audit`/`ship` Orca blocks, `orca-vendors.md`.
- `hooks.json` and `.claude/settings.json` ← `workflow-doctor.mts` (parses both, matches the token-consumption entry) and its test; `setup-validator.mts`.
- `runtime/invariants.test.mts` scans every production `.mts` for `any` and `node:` imports; `runner-aware-runtime-boundary-validator` (active pitch) will scan new files too.
- `skill-defaults.mts` supplies the token-extraction pattern to mirror; no change to it.
- Run after S1: invariants, orca-run, eval-grader tests; after S3: workflow-doctor, setup-validator; after S5: skill-defaults tests. Node and Bun for every touched test file.
- Rules folded in: `ai-framework/rules/testing.md` (guards proven with mutants, runner coverage), `security.md` §9 (guarded reads, bounded input, fixed-text errors); `.project/rules/` has no companions here.

## Parallel dispatch plan

- Orca policy is valid and `evaluateLaunch` allowed codex and opencode earlier today; the slot cap is the limit. After P0, S1 and S3 can run as two Codex workers at once (S3 built against the contract above and S0 fixtures), then S2 and S4/S5.
- Without P0, run S1 → S2 → S3 → S4 → S5 one worker at a time, which only costs time.
- Briefs state: scratch-safe commands only, no git write commands, no `--apply` against the real repo, read-only on everything outside the owned files, findings and counts in the `worker_done` body, no files list outside the project. Workers share this checkout, so after each worker the coordinator runs `git status` against a saved baseline and re-runs the scope's exit commands itself.
- Reviews at /audit go to the `opencode` worker (security + tests), with a planted canary in a scratch copy, as in `state-multipage-report`.

## Wireframes (UI scopes only, light)

No UI scope. Operator experience (text):

```
(switch off)   /shape ...                      → runs as today, no extra output
(switch on)    /shape ...                      → "Orca: ready (coordinator claude, workers codex, opencode)" then the phase
(switch on, not ready)  /shape ...             → blocked: "Orca requested but not ready: <reason>.
                                                   Fix it, or re-invoke with orca=normal." (phase does not start)
(switch on, orca=normal) /shape orca=normal .. → "Orca: bypassed by request" then the phase
```

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)
