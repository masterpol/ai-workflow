# Pitch: orca-vendor-orchestration

**Date**: 2026-10-07 • **Appetite**: decomposed initiative; two dependent big-batch pitches, each ≤15 files / ≤1500 LOC / ≤1 week
**Stack**: workflow tooling / agent instructions / Node.js

## Problem

Users cannot configure Claude, Codex, and OpenCode to collaborate under the vendor running the current workflow. They want independent work divided across vendors, communication between workers, and one coordinator responsible for reconciliation, while retaining the normal workflow when Orca delegation is unavailable.

## Knowledge consulted

- `decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers.md`: preserve customization; no installation during shaping or invented savings.
- `patterns/resolve-config-only-from-trusted-root.md`: resolve launch policy from the trusted project root.
- `issues/false-cross-pitch-attribution-in-a-shared-uncommitted-file.md`: isolate writers and preserve provenance.
- `issues/reviewer-reports-contradicted-by-measurement.md`: independently verify reported completion.
- `decisions/token-metrics-dimensions-design.md`: missing usage and cost remain unavailable.
- `ai-framework/integrations/harnesses.md`, `ai-framework/rules/model-routing.md`: scoped context, role profiles, isolated writers, existing fallback. `.project/rules/README.md` adds no stack-specific rule.

## Solution sketch (breadboard, NOT wireframe)

**Places**: project-local policy, capability preflight, existing phase dispatch, Orca Run/Task/Dispatch and inboxes, isolated worker worktrees, coordinator reconciliation record.

**Affordances**: enable automatic Orca delegation; select workers and role routes separately for each coordinator vendor; cap concurrency and retries; inspect capability and outcomes; send peer messages; resume reconciliation.

**Connections**:
1. Phase entry passes the actual harness identity (`claude`, `codex`, `opencode`); that vendor remains coordinator. A worker preamble takes precedence and prevents accidental coordinator recursion.
2. Read trusted local configuration. Enable Orca only when configured, inside a verified Orca session, and required launch, messaging, placement, and completion capabilities exist. Otherwise run the existing native/sequential workflow with a reason; preserve every gate.
3. Coordinator splits independent scopes with ownership, dependencies, constrained context, and observable acceptance. Use all configured eligible other vendors when enough useful scopes exist; serialize dependent work and avoid redundant jobs merely to occupy vendors.
4. Use Orca's supervised dispatch and messaging. Parallel writers receive isolated checkouts from the same explicit source baseline; workers can send peer questions and contract updates within the Run. Only the coordinator changes ownership and integration decisions.
5. Coordinator checks dispatch identity, changed files, reports, and test evidence; reconciles accepted changes into its checkout and runs combined checks. Workers cannot ship. Preserve unrelated dirty changes, workflow gates, and completion records.
6. Missing capability before launch falls back normally. After launch, preserve attempts and inspect residual resources. Never start replacement editing while an earlier worker might still own it. Resume or fall back only after ownership is safely settled.

Reuse Orca's lifecycle rather than building a scheduler. First release covers local Git repositories. Execute two separately gated pitches: `../orca-vendor-foundation/pitch.md` (policy, preflight, normal fallback; estimate 7 files / 550 LOC), then `../orca-vendor-dispatch/pitch.md` (build/audit dispatch, messaging, recovery, reconciliation; estimate 12 files / 1350 LOC). The foundation alone never enables delegation. Other phase gates remain unchanged. Proposed policy and investigation: `investigation.md`. Golden cases: `.project/evals/datasets/orca-vendor-orchestration.json`.

Measure completed-task elapsed time, attributable reported usage/cost, rework, and integrated acceptance failures against comparable normal runs. Include coordinator and integration overhead. Speed, quality, and cost are goals, not guarantees.

## Rabbit holes

- **Resolved here — feasibility**: upstream documents all three agents, supervised dispatch, isolated placement, and peer messaging. Installed CLI fails before discovery; live compatibility is unverified.
- **Push to /plan — runtime contract, owner: planner**: pin the installed guide/version and prove launches, peer delivery, and completion for all three vendors before shipping. OpenCode model overrides have placement restrictions; use configured defaults initially.
- **Push to /plan — baseline/reconciliation, owner: planner**: prove identical input baselines, handling of uncommitted work, bounded conflict recovery, and completion evidence tied to the final integrated tree.
- **Push to /plan — failure ownership, owner: planner**: test partial launches, duplicate/replayed mail, timeouts, restart, rate limits, and unavailable providers without duplicate writers.
- **Push to /plan — appetite, owner: planner**: count mirrors, setup/validator integration, tests, and release records; split foundation and phase integration before implementation if >15 files or >1500 LOC.

## No-gos (this pitch)

- Remote/SSH/WSL coordination, new providers, custom scheduler, IDE UI, or cross-repository work.
- Automatic installations, login, permission bypass, historical rewrites, or committed credentials.
- Forced parallelism, estimated savings, blind merges, recursive worker fan-out, or fallback over uncertain live edits.
- Broad rewrite of every phase or existing metrics collector; retain vendor model defaults unless explicitly configured and supported.

## Critique findings

Four parallel passes completed; full findings and addressed dispositions: `critique.md`. Scope exceeds one batch: split foundation and dispatch. Dispatch requires installed-runtime evidence. Add distinct refused/corrupt recovery outcomes, retain evidence outside cleanup, independently review adapter gates, and grade adversarial completion/baseline/recovery cases. All added to child pitches and fixtures. No cross-pitch pass triggered; existing OpenCode edits remain a constraint.

## Bet decision

☐ **Bet** — proceed to /plan only after user approval.
☐ **Re-shape** — revise named gap.
☐ **Pass** — park this pitch.

Awaiting user decision; no implementation authorized by this shaping gate.
