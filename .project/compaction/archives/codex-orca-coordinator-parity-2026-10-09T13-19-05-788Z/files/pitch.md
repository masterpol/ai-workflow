# Pitch: codex-orca-coordinator-parity

**Date**: 2026-10-08 • **Appetite**: big-batch (≤15 implementation files / ≤1500 lines)
**Stack**: workflow tooling

## Problem

Users enabling Orca expect Codex to coordinate alternate vendors throughout the workflow, as Claude does. Codex currently lacks a startup hook, phase instructions can select the default Claude coordinator, and readiness does not establish a bound Run.

## Knowledge consulted

- `decisions/orca-auto-start-design`: reuse `decideStart` with the actual vendor; blocked means stop.
- `patterns/a-blocking-hook-owns-its-runner-and-its-deadline`: pin Node; enforce deadlines below host timeout.
- `issues/status-dispatch-ready-false-is-not-launch-authority`: use `evaluateLaunch`, never diagnostic status.
- `issues/orca-workers-differ-from-the-coordinator-environment`: independently verify workers and release settled resources.
- `patterns/retry-only-on-positive-proof-of-a-clean-failure`: inspect unknown launches before retry.
- `issues/prose-instructions-must-specify-how-to-extract-from-free-form-arguments`: pass raw arguments unchanged.
- `issues/false-cross-pitch-attribution-in-a-shared-uncommitted-file` and `editing-a-canonical-file-alone-breaks-the-byte-identity-mirror-check`: preserve others’ edits and required mirrors.
- Rules: injected runtime dependencies, bounded project reads, behavioral tests, explicit phase gates.

## Solution sketch (breadboard)

**Places:** Codex hooks, a startup adapter, shared entry instructions, Orca CLI, integration docs.

**Connections:** `UserPromptSubmit` recognizes an explicit leading workflow command and calls `decideStart` with `vendor: codex`. Ready adds context; blocked prevents the invocation. Ordinary prose and quoted examples do not trigger the hook. Reuse the decision library; keep host-specific payload handling in the adapter. Preserve switch-off silence, worker suppression, and raw per-call `orca=normal` bypass.

Entry instructions require fresh startup before every phase, including phases inferred from conversation. Before dispatch, inspect `run-current`; bind a Run if absent, reuse the correct Run, and stop on an unrelated binding. Use `coordinator: codex` in dispatch input, collect the worker’s authoritative completion, and verify results independently. Hooks do not create Runs or launch workers. Document `/hooks` trust and fresh-session activation; untrusted hooks never excuse skipping the instructed startup path.

**Files:** `.codex/hooks.json`; new hook and test under `ai-framework/hooks/scripts/`; `AGENTS.md`/`CLAUDE.md`; `integrations/{harnesses,orca-vendors}.md`; one doctor wiring check and its test. Preserve the metrics hook. Expected nine files / 700–900 lines; release outputs and workflow records accounted for separately.

**Acceptance:** fixtures cover all 12 phases, off/bypass/blocked/ready/worker states, malformed input, quoted examples, prose false positives, deadlines and hung probes, and explicit Codex routing. Node/Bun pass sequentially; setup, doctor and graph checks pass; production boundary violations stay zero. Live worker dispatch/collection/release must pass. Host hook activation requires separate observation; unavailable activation remains unverified.

## Rabbit holes

**Resolved:** Run binding was absent despite ready startup. Binding `run_86cdf117ec09` enabled successful Codex coordination of Claude/OpenCode critique workers; all four reports were collected, workers released, and ledgers settled.

**Plan risks (coordinator owns):** trusted root selection, parser edge cases, nested-worker suppression, deadline behavior, hook-trust activation evidence, and raw-argument handling.

## No-gos

OpenCode/Cursor adapters; 12-skill rollout; 43-test migration; global configuration edits; trust bypass; local policy changes; launch/reconciliation guard changes; historical record rewrites; application repositories.

## Critique findings

- **K1–K3:** add retry, shared-attribution and raw-argument lessons. Addressed above; retain pre-edit prompt/baseline evidence during build.
- **S1 high:** resolve Run binding before bet. Addressed by successful live recovery and four settled reviews.
- **S2–S3 medium:** strict command parsing, separate hook activation evidence, fixture coverage for stalled probes, shared decision library. Addressed in scope/acceptance.
- **A1–A3:** appetite fits; bound doctor changes, reuse test fixtures, limit entry edits to the mirror pair. Addressed.
- **C1 medium:** OpenCode handoff reads docs this pitch changes. No implementation write overlap; preserve its record and recheck documentation claims at audit. Shared status index requires narrow edits.

## Bet decision

**Bet approved:** the user said “next” after the shape approval gate. Planning is authorized; implementation has not started.

## Evidence

Official hook contract: https://learn.chatgpt.com/docs/hooks (2026-10-08). Local receipts, reports and recovery reasoning: `.project/metrics/codex-orca-parity/`. Original launch receipts were not preserved; recovery used observed `run: null` plus installed Orca 1.4.222 prelaunch control flow. Full critique reports remain in the delivery receipts.
