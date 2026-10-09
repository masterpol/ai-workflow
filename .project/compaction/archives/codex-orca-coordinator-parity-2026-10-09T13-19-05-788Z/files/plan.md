# Plan: codex-orca-coordinator-parity

**Pitch:** [pitch.md](pitch.md) • **Appetite:** big-batch • **Hill:** [hill.md](hill.md)
**State:** approved. The user said “next” after the combined impact/plan gate; S1 implementation and its specified behavioral test matrix are authorized.

## Scopes

| ID | Name | Files | LOC estimate | Dependencies | Parallel with | Subagent? | Dispatch profile |
|----|------|-------|--------------|--------------|---------------|-----------|------------------|
| S1 | Codex coordinator parity, including activation evidence | The nine paths below | 700–900; hard cap 1500 | Existing Orca decision/CLI/runtime libraries | Disjoint owned tasks within S1 | Yes: bounded hook/test and doctor tasks; coordinator owns integration and documentation | Claude standard for hook/test; OpenCode fast for doctor wiring, if available; otherwise configured model with profile limitation recorded |

One scope keeps the hook, installation contract, instructions, and verification coherent. No partial completion is declared before all exits pass. The work contains no application UI or LLM prompt/API scope, so UI wireframes and golden LLM evaluations do not apply.

### Exact implementation files

1. `.codex/hooks.json` — retain `SubagentStop`; add `UserPromptSubmit` startup registration.
2. `ai-framework/hooks/scripts/orca-start-codex-hook.mts` — new Codex adapter.
3. `ai-framework/hooks/scripts/orca-start-codex-hook.test.mts` — new behavior tests using runtime helpers.
4. `AGENTS.md` — coordinator startup and preparation instructions, scoped explicitly to Codex.
5. `CLAUDE.md` — exact required mirror of the entry-file change.
6. `ai-framework/integrations/harnesses.md` — Codex hook activation and instruction path.
7. `ai-framework/integrations/orca-vendors.md` — Codex coordinator contract and evidence status.
8. `ai-framework/scripts/workflow-doctor.mts` — one startup wiring check and hook syntax/presence coverage.
9. `ai-framework/scripts/workflow-doctor.test.mts` — missing/misconfigured/valid hook wiring behavior.

No canonical phase skills, runtime APIs, launch/reconciliation code, OpenCode adapter, or global configuration change. Release outputs and knowledge/run/pitch records are separate workflow artifacts. Add structural release history through `changelog.mts` at ship; do not edit generated history manually.

## Adapter contract

- Receive one bounded JSON object on stdin. Handle only `UserPromptSubmit`; ignore other recognized host activity without probing Orca. Bound raw input to 64 KiB before parsing or matching; do not echo prompt contents or raw errors.
- Recognize only a leading `/phase` or `$phase`, with an exact supported phase name and whitespace/end delimiter. Cover all 12 names accepted by `orca-run start`. Quoted examples, command prefixes, unrelated skills, ordinary prose, and command names embedded later in text do not match. Preserve the original arguments after the matched name, including newlines; do not shell-parse them.
- Select `vendor: "codex"` in code. Never infer it from prompt text and never accept a vendor override from hook payloads. Reuse `decideStart` and its quoted-bypass/terminal-worker checks.
- Resolve the project root from the trusted hook command's explicit `--root` argument, supplied from the invocation checkout. Do not let stdin `cwd`, prompt text, or another vendor's root environment variable redirect policy reads. Verify a usable local root. The hook command uses the same checkout to locate the script and root argument; tests exercise cwd in a nested directory and a conflicting payload cwd.
- Force `AI_WORKFLOW_RUNNER=node` in the POSIX registration with the existing Node compatibility flags. Preserve the installed shell/platform limits in docs; do not claim Windows cmd support. Direct-entry execution retains the required `runDirect` convention. Guard runner/bootstrap limits explicitly in activation evidence rather than pretending every host failure can be blocked.
- Off returns silently before policy discovery or stdin parsing. For a matching command, `worker` is silent, `bypassed` and `ready` add `hookSpecificOutput.additionalContext`, and `blocked` writes the safe exact reason to stderr and returns 2. No Run creation or worker launch occurs in the hook.
- Own a five-second script deadline below the eight-second host timeout, and cap the decision at four seconds or the smaller remaining budget. Check elapsed time after synchronous probes as well as using a timer. Hung input/probes, invalid matching input, import failure, and internal decision failure must fail with a safe blocking reason.
- Do not invent a native Codex subagent payload marker. For Orca workers, reuse the observed terminal-membership lookup. Explicit worker contexts in entry instructions must not become coordinators. Record any host-specific native-subagent event behavior that cannot be verified.

## Coordinator instructions and preparation

Before every Codex workflow phase, run the existing `orca-run start` with `--vendor codex`, the actual phase, and untouched invocation arguments via `--args-text`. This instruction covers ordinary conversation and untrusted/unavailable hooks; a hook is supplementary host automation. Use structured arguments or a file-safe wrapper when invoking commands; never interpolate prompt contents into shell code.

For `ready`, before the first dispatch inspect `orca orchestration run-current --json`. If absent, use the same Orca executable to create a Run with the pitch objective. If bound, verify the objective/current coordinator before reusing it; an unrelated binding requires an explicit choice rather than replacement. Preserve the Run ID in local evidence. `ready` is not proof of a bound Run or worker authentication.

Dispatch inputs always use `coordinator: codex` and a configured alternate vendor. A blocked/refused/error result stops and reports its exact reason. No silent single-agent fallback. Only the user's per-invocation `orca=normal` bypass selects normal phase execution. Collect each worker's own completion; verify shared-checkout edits and commands independently; release settled workers and acknowledge processed deliveries. Unknown-liveness attempts remain owned until recovery evidence supports classification.

## Exit criteria for S1

Every command runs from the project root. Node and Bun suites run sequentially.

1. Node behavior and regression tests pass:

   ```sh
   AI_WORKFLOW_RUNNER=node node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/hooks/scripts/orca-start-codex-hook.test.mts ai-framework/hooks/scripts/orca-start-hook.test.mts ai-framework/scripts/orca-start.test.mts ai-framework/scripts/orca-run.test.mts ai-framework/scripts/workflow-doctor.test.mts ai-framework/scripts/runtime/invariants.test.mts ai-framework/scripts/skill-defaults.test.mts
   ```

2. Bun parity passes on the same set, after Node finishes:

   ```sh
   AI_WORKFLOW_RUNNER=bun bun test ai-framework/hooks/scripts/orca-start-codex-hook.test.mts ai-framework/hooks/scripts/orca-start-hook.test.mts ai-framework/scripts/orca-start.test.mts ai-framework/scripts/orca-run.test.mts ai-framework/scripts/workflow-doctor.test.mts ai-framework/scripts/runtime/invariants.test.mts ai-framework/scripts/skill-defaults.test.mts
   ```

3. `AI_WORKFLOW_RUNNER=node node ai-framework/scripts/setup-validator.mts` and `AI_WORKFLOW_RUNNER=node node ai-framework/scripts/workflow-doctor.mts --json` exit 0. Doctor startup check passes; production runtime boundary remains at zero violations and zero unparsed sources. The existing warning for legacy test imports may remain; the new hook test uses `createTestDeps`, `tempFixture`, `captureIo`, and `runScript` rather than adding direct filesystem/process imports.
4. `node ai-framework/scripts/graphify.mts --check`, `git diff --check`, and `cmp AGENTS.md CLAUDE.md` exit 0. Docs links remain valid, and existing metrics hook registration is preserved.
5. Tests assert off/no probes, the 12 phase names, explicit Codex worker routes, raw/quoted bypass semantics, malformed and oversized input, false positives, root selection, worker suppression, timeout/import failure, and the exact registration command under a shell with configured-but-missing Bun. Use an in-memory or scratch mutant for a critical vendor/blocking guard to prove the assertion catches the defect.
6. Live `orca-run start --phase build --vendor codex` returns `ready`, and coordinator preparation verifies the bound Run. Reuse the observed critique dispatch/collect/release receipts as positive library smoke evidence; this is not hook activation evidence. Build workers also use this actual Codex coordinator route.
7. After installing the adapter, attempt a fresh Codex host invocation in a scratch project without bypassing hook trust or modifying global config. The real host must observe ready context and a blocked phase after hook trust; if user trust or host access is unavailable, mark these host cases **unverified** in the record and final report. A shell fixture never counts as a passed host case. This evidence limitation does not invalidate the already-proven coordinator library path.

No build, typecheck, lint, or i18n command exists here; these are not replaced with invented commands. Broad full-suite tests are reserved for final audit/verify if required by those playbooks.

## Risks

| Risk | Affects | Spike needed? | Owner and mitigation |
|------|---------|---------------|----------------------|
| Hook payload/root ambiguity | Adapter | No; specified here | Hook worker uses explicit trusted root and bounded payload; coordinator reviews nested cwd/conflicting input tests |
| False phase matches or quoted bypass | Adapter | No | Hook worker uses anchored exact phase matching and existing `hasNormalBypass`; coordinator runs realistic raw invocations |
| Recursive coordinator dispatch | Adapter/instructions | No | Reuse observed Orca terminal lookup; suppress explicit worker context; do not invent host subagent fields |
| Host trust and fresh-session activation | Live verification | Yes, bounded host probe | Coordinator separates trusted-host proof from fixtures; no trust bypass/global config changes; record unverified cases |
| Deadline or runner failure lets phase continue | Adapter | No | Pin Node registration; enforce timer and synchronous elapsed check; test the exact command under missing Bun; report bootstrap limitations |
| Ready but unbound/unrelated Run | Instructions | No; live prerequisite resolved | Coordinator requires run-current/create/reuse decision before dispatch and preserves Run receipt |
| Shared checkout and concurrent OpenCode handoff | Entire scope | No | Preserve other files/status rows; baseline prompts and hashes before worker edits; review combined diff without authorship assumptions |
| New doctor check disrupts older installations | Doctor | No | Worker tests valid/missing/misconfigured startup registration; docs describe upgrading/trusting project hooks; no auto-overwrite of entry files |

## Parallel dispatch plan

1. Before editing, capture the current diff/file hashes and persist each self-contained worker spec under `.project/metrics/codex-orca-parity/`. Confirm the startup gate and correct bound Run.
2. Dispatch the hook worker to Claude through `orca-run dispatch` with ownership limited to the adapter, its new test, and `.codex/hooks.json`. Standard reasoning fits host payload/deadline work. It is not alone; preserve all other edits, do not alter shared runtime APIs, and use exact injected completion IDs.
3. In parallel, the coordinator owns `AGENTS.md`, its `CLAUDE.md` mirror, and the two integration docs. These files are disjoint from the hook worker. Existing CLI contract and names are fixed by this plan; do not claim unobserved activation.
4. Dispatch doctor wiring to OpenCode once the hook registration/file names are present. Ownership is limited to doctor and its existing test; task is mechanical and suited to fast. Use an available configured model if the profile cannot be selected, recording the limitation. No default/native subagent fallback from a blocked Orca dispatch.
5. Collect each worker's authoritative completion, inspect every changed path, rerun exits sequentially, then release and settle each worker. Coordinator owns fixes crossing ownership boundaries and final evidence. S1 reaches `done` only when the aggregate exit criteria and evidence classifications are satisfied.

## Impact analysis (acknowledged)

**Direct:** seven modified files and two new files. **Risk:** medium: host lifecycle behavior, execution trust, and phase gating. There are no runtime API or data-schema changes.

| Surface | Downstream consumers | Existing tests to verify | Planned action |
|---------|----------------------|--------------------------|----------------|
| `.codex/hooks.json` | Trusted Codex project configuration; token completion registration; setup/doctor JSON checks | `workflow-doctor.test.mts`, new adapter test | Preserve metrics; test exact startup command and new wiring check |
| New adapter | Only the new Codex registration; imports existing runtime/decision libraries | New test, `runtime/invariants.test.mts`, existing `orca-start*.test.mts` | Adapter depends inward on framework runtime; no imports from apps or vendor-private runtime; no production `node:*` or `any` |
| `AGENTS.md`/`CLAUDE.md` | All harness entry readers; setup mirror check; skill-defaults; bundle-sync manual-review entries | `skill-defaults.test.mts`, setup validation | Exact mirror; new instructions explicitly apply to Codex; bundle-sync does not automatically replace existing project entry files |
| Integration docs | Human setup readers, README topic links, doctor contracts, concurrent OpenCode handoff | Docs-link validation through doctor | Keep existing Claude contract; record Codex library proof separately from host activation; do not edit the other handoff |
| Doctor wiring | Setup validator delegates portable checks to doctor; CLI/reporting fixtures | `workflow-doctor.test.mts` | One new startup wiring check; syntax/presence checks for new adapter; do not broaden repair or policy mutation |

Knowledge alerts are the eight entries referenced in the pitch: launch authority, runner/deadline ownership, worker environment, clean-failure recovery, raw argument extraction, shared-file attribution, and required mirrors. The `.project/rules/` directory contains only its README, so no stack companion adds further constraints. Graph traversal preceded targeted raw consumer searches.

The concurrent `opencode-handoff` pitch writes its own context document. There is no planned implementation write overlap; `.project/status.md` is a shared index and requires a narrow row update. Its snapshot may predate these integration-doc edits; preserve its history and flag stale claims at audit instead of rewriting it.

**Recommendation:** proceed within the approved big-batch appetite, retain one coherent scope, and the user acknowledged the combined impact/plan gate before implementation.

## Wireframes

Not applicable: this change is workflow tooling with no UI.

## Living-spec deviations log

S1 is implemented within the approved nine-file scope. Bun coverage reporting crashed; Node supplies coverage and Bun parity passed without coverage. The fresh Codex host probe produced no activation evidence, so both trusted-host cases remain explicitly unverified under exit criterion 7. Details are in `deviations.md` and `log.md`; no runtime contracts or implementation file set changed.
