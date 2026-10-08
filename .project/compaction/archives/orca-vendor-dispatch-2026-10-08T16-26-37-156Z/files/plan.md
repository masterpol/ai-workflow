# Plan: orca-vendor-dispatch

**Pitch**: pitch.md  •  **Appetite**: big-batch (dispatch-core; reconcile is `../orca-vendor-reconcile`)  •  **Hill**: hill.md

All new code is `.mts` on injected `RuntimeDeps` (no `node:` imports, no `.js` shims), tests are `*.test.mts` under Node and Bun, child processes go through `deps.child.run` with `errorCode` as the only timeout/overflow signal. Commands run with `AI_WORKFLOW_RUNNER=node node --experimental-strip-types --disable-warning=ExperimentalWarning`; abbreviated `NT` below.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S0 | Live runtime contract spike (gate) | `.project/pitches/orca-vendor-dispatch/runtime-contract.md` (1) | ~120 doc | — | — | no: launches real workers and needs the user's approval and judgement | — |
| S1 | Launch gate, env allowlist, recursion guard | `ai-framework/scripts/orca-launch-gate.mts`, `.test.mts` (2) | ~100 impl + ~250 test | S0 | S2 | yes: disjoint files, self-contained, clear exit | standard |
| S2 | Ownership ledger (missing/refused/corrupt distinct, symlink-safe) | `ai-framework/scripts/orca-ledger.mts`, `.test.mts` (2) | ~120 impl + ~230 test | S0 | S1 | yes: same reasons | standard |
| S3 | Dispatch: briefs, launch, replay, liveness, bounded retries, untrusted mail | `ai-framework/scripts/orca-dispatch.mts`, `.test.mts` (2) | ~250 impl + ~400 test | S1, S2 | — | no: consumes both interfaces and the stateful fake | — |
| S4 | Build-phase wiring, docs, release | `.claude/skills/build/SKILL.md`, `.agents/skills/build/SKILL.md`, `.cursor/skills/build/SKILL.md`, `.opencode/commands/build.md`, `ai-framework/integrations/orca-vendors.md`, `CHANGELOG.md`, `VERSION` (7) | ~120 | S3 | — | no: shared files, small | — |

Total 14 files, ~1590 LOC including tests. LOC cap: if S3 exceeds 500 lines (impl+test together beyond ~750) stop and decompose (move liveness/retry into `orca-supervise.mts`) rather than overrun; file cap leaves one spare file.

## Exit criteria per scope

### S0 — live runtime contract (gate; no build scope that launches a worker starts before this is accepted)
- User approves selecting `/Applications/Orca.app/Contents/Resources/bin/orca` once (the `/usr/local/bin/orca` symlink fails with a readlink error; do not fall through silently).
- `runtime-contract.md` records, from a disposable fixture outside this repo: version, launch (`worker-start`), Run-scoped peer message with receipt, attempt-specific completion payload (real key names), settlement, and isolation — for each of claude, codex, opencode — each marked observed or unverified, with exact commands and outputs.
- `test -s .project/pitches/orca-vendor-dispatch/runtime-contract.md` and `grep -c "observed" ...` ≥ 1 per vendor; no source edits, commits or publications in this repo during S0 (`git status --short` unchanged).
- If launch, messaging or completion cannot be observed: stop, plan returns to /shape (critique A5) — S1-S4 estimates are invalid.

### S1 — launch gate
- `NT --test ai-framework/scripts/orca-launch-gate.test.mts` and `bun test` of the same file exit 0.
- Re-reads policy and re-probes immediately before each launch (test: policy flipped or version changed between two calls ⇒ second launch refused; injected fakes throw if touched out of order).
- Version change after launch ⇒ `unknown-liveness`, ownership preserved, no relaunch.
- Child env is an allowlist and PATH is sanitized; relative/dot launcher entries refused (throw-if-touched runner).
- Recursion guard: brief always carries `--worker-context`; without the flag, env `ORCA_*` default-denies (adversarial test: worker runs preflight without the flag).
- Guard tests proven against an in-memory mutant (remove the re-probe ⇒ test red).
- `grep -n "node:" ai-framework/scripts/orca-launch-gate.mts` empty; `grep -nE ": any\b|as any"` empty; invariants test passes.

### S2 — ownership ledger
- `NT --test ai-framework/scripts/orca-ledger.test.mts` and bun exit 0.
- Reads distinguish `missing`, `refused` (symlink/FIFO/oversize) and `corrupt`; a writer given refused/corrupt never treats it as absent (test reproduces `hardening-a-shared-reader-made-its-writer-destructive`).
- Every path component is `lstat`-checked; a symlink pointing at a victim file leaves the victim untouched (probe test); realpath-aware assertions on macOS.
- Attempt and task join keys are prefixed; replayed record is idempotent; restart reads back the same ownership.
- Mutant proof: drop the symlink check ⇒ probe test red.

### S3 — dispatch
- `NT --test ai-framework/scripts/orca-dispatch.test.mts` and bun exit 0, using a stateful fake Orca on injected `RuntimeDeps` and a fake clock.
- Cases (E1-E5 subset for core): partial launch, replayed/duplicate mail, unknown liveness (inspect and preserve, never duplicate edit), restart with partial startup, bounded retries and rate limits, remaining budget under 1 ms refused, `ETIMEDOUT`/`ENOBUFS` from `errorCode` (not elapsed time), every vendor permutation of eligible/ineligible.
- Completion only from the worker's authoritative attempt-specific report; a launch ack or event name never counts (test for `async-agent-launch-hook-counted-as-completion`).
- Peer mail parsed against a grammar, re-emitted and allow-listed at ingest and render; quadratic-regex guard on a 64 KB body.
- Unsupported delegation before launch falls back to the normal workflow with no side effects.
- Static golden fixtures in `.project/evals/datasets/orca-vendor-orchestration.json` remain valid (`node -e` JSON parse exit 0); executable grader is reconcile's scope, not this one.
- `grep -n "node:"` empty on the new module; `ai-framework/scripts/runtime/invariants.test.mts` passes.

### S4 — wiring, docs, release
- Build skill mirrors (`.claude`, `.agents`, `.cursor`, `.opencode`) are consistent: `AI_WORKFLOW_RUNNER=node node ... workflow-doctor.mts` exit 0 and `setup-validator.mts` READY.
- `ai-framework/integrations/orca-vendors.md` documents the launch gate, ledger and fallback; `docs-links.mts` reports 0 broken.
- `changelog.mts --check` shows the new version; `graphify.mts --check` CLEAN.
- Whole suite: Node `--test` over scripts, runtime, hooks and `.claude/hooks` exit 0 (≥762 + new); `bun test` 0 fail.
- Dispatch stays disabled by default: `dispatchReady` remains false unless the launch gate passes under an opt-in policy.

## Risks (inherited from pitch and critique)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| Installed Orca launch/message/completion contract unverified; launcher symlink unreadable | S0, all | yes (S0) | Mandatory gate; bundled launcher chosen once with approval; stop and re-shape on failure |
| Launch authority does not exist (foundation always `dispatchReady: false`) | S1 | no | Launch gate re-reads and re-probes before each launch |
| Worker recursion guard is self-declared | S1 | no | Inject flag in every brief; env default-deny; adversarial test |
| Async, long-running dispatch vs sync preflight | S3 | no | `deps.child.run`, `deps.clock`, `errorCode`; stateful fake |
| Child PATH/env isolation deferred by foundation | S1 | no | Env allowlist and sanitized PATH |
| Launch ack mistaken for completion; zero-rounded timeout | S3 | no | Authoritative report only; refuse <1 ms budget |
| Symlinked worktree/ledger paths | S2 | no | Per-component lstat, probe test (`sync-tools-refuse-symlinks...` pattern) |
| Estimate over the cap | S3 | no | Decompose trigger at ~750 lines for S3; reconcile already split out |
| Phase-mirror sprawl | S4 | no | Build mirrors only; audit mirrors belong to reconcile |

Applicable rules checked: `ai-framework/rules/security.md` §9 (bundle-owned code only, guarded readers, no project text into commands), `testing.md` (guards and fixes: mutant proofs), and `.project/rules/` companion for the TS runtime.

## Parallel dispatch plan

S0 first, alone, with user approval (it launches real workers). Then S1 and S2 in parallel (standard subagents, disjoint files, each with a mutant proof). S3 on the main thread after both land. S4 last. The orchestrator re-runs each subagent's tests itself and does not accept worker-asserted counts.

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)
