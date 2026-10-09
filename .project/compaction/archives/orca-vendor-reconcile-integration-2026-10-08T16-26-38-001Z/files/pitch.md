# Pitch: orca-vendor-reconcile-integration

> **Revised and bet 2026-10-08 (critique C1-C9, user decisions).** Shape: one thin CLI (`orca-run.mts`) so phases name a command instead of importing TypeScript; an executable grader for the ~6 deterministic golden cases (rest tagged parses-only or live-only); inert phase wiring behind `AI_WORKFLOW_ORCA_MULTI_AGENT`; live smoke recorded as pass / fail / not-run; one release step. Checks the CLI can run come from a fixed built-in catalog by name, never from agent-supplied command text.

**Date**: 2026-10-08 • **Appetite**: big-batch; revised estimate ~16 files / ~1300 LOC (one file over the 15-file cap, accepted with the CLI choice)
**Stack**: Node.js workflow tooling (`.mts` on injected `RuntimeDeps`) / agent instructions
**Depends on**: `../orca-vendor-reconcile/pitch.md` (reconcile-core API)
**Parent**: `../orca-vendor-orchestration/pitch.md`

## Problem

Reconcile-core can integrate verified worker changes, but the phases do not use it, the dataset of golden cases is only static, and release records are missing.

## Solution sketch

Executable grader for `.project/evals/datasets/orca-vendor-orchestration.json` (decide which cases it executes versus parses; independent review of the grader itself); audit and ship phase wiring in `.claude` and `.cursor` (the `.agents`/`.opencode` loaders only if they need a line); live smoke criteria for each vendor and peer messaging; one release step (docs, CHANGELOG, VERSION).

## Rabbit holes (push to /plan)

- Grader scope and fixtures; grader is an instrument and needs its own review. Mirror parity across vendors. One release step, not one per scope.

## No-gos

Standing no-gos (`decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers`).

## Bet decision

☑ **Bet** — 2026-10-08, user decision, with the CLI in scope and the file-cap overrun by one accepted.
☐ Re-shape ☐ Pass

## Critique findings (2026-10-08)

Reviewers: knowledge-historian, skeptic, appetite-auditor (sonnet each). Advisory.

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| C1 | skeptic | high | rabbit-hole | Nobody can call the libraries: phases are markdown and only `orca-policy` and `orca-preflight` have a `main()` (verified). Either add one thin CLI (`orca-run.mts`, argv -> library -> JSON, no logic of its own, same pattern as preflight) or leave the phases advisory. Phase text must name only that command. |
| C2 | skeptic | high | rabbit-hole | A CLI must not be a second untested path: identical outcomes to the library on the same fixtures; the switch check stays inside the library; non-zero exit and no side effects when the gate is closed; no path or id that bypasses the library's guards. |
| C3 | skeptic | high | rabbit-hole | Worker text (summaries, file lists, commit messages) reaching the coordinator is data, never instructions: quoted, length-capped, never choosing commands, paths, vendors or approvals; gates stay human; add a hostile-summary golden case. |
| C4 | skeptic + historian | high | rabbit-hole | The grader must not grade itself: tag each case `executes` or `parses-only`; mutation tests that break the library turn the grader red; never derive actual from the expected object; independent review of the grader; `static-fixtures-do-not-prove-runtime` stays `unverified`; do not count parse-only cases toward a green claim. The dataset case still says `dispatchBetReady: false`, which is stale since dispatch shipped. |
| C5 | skeptic | medium | rabbit-hole | No doctor/validator check keeps `.cursor` copies equal to `.claude`; `.agents`/`.opencode` loaders need no edit. Regenerate cursor mirrors with `skill-vendors.mts cursor-mirrors --apply` and gate with setup-validator; update `3-audit.md`/`4-ship.md` with the skills; fix the now-stale "reconcile is a separate capability" sentence in build/SKILL.md. |
| C6 | skeptic | high | rabbit-hole | Live smoke with two vendors unfunded: outcomes are pass, fail or `not-run (no funds)`, never folded into pass; documented manual checklist with a recorded evidence file; hard spend cap; release notes list per-vendor status. |
| C7 | skeptic | high | rabbit-hole | Wire the phases inert: behind `AI_WORKFLOW_ORCA_MULTI_AGENT`, defaulting to the single-agent path, text says "unverified live", one removable block per file, release note "library + optional wiring, live unverified". |
| C8 | appetite-auditor | high | scope-overrun | Real size is ~13 files / ~1000 LOC (grader ~800 incl. tests, 3 canonical skill edits, 3 generated cursor mirrors, docs, dataset tweak, CHANGELOG/VERSION): big-batch, not small-batch. A CLI adds ~2-3 files / ~270 LOC and pushes it to ~16 files / ~1300 LOC (over the file cap). Cap the grader at the ~6 deterministic cases; defer the git-heavy case if LOC passes ~1300. Stays one pitch. |
| C9 | historian | high | missed-knowledge | Cite and apply `a-gate-must-not-audit-its-own-instrument`, `a-gate-must-not-trust-its-own-author`, `prove-a-guard-test-with-an-in-memory-mutant`, `settle-only-with-proof-bound-to-this-patch`, `retry-only-on-positive-proof-of-a-clean-failure`, `git-against-a-workers-tree-runs-worker-code-unless-every-command-is-guarded`, `a-gate-spawns-exactly-what-it-probed`, `installed-skill-wrappers-ship-as-orphans` (run bundle-sync as a release exit check), `checks-on-doc-structure-name-the-owning-file`, `keep-the-fakes-guarantee-the-thing-they-replace`. (Historian judged from titles and tags; bodies unread.) |

Open decision (user): CLI in or out of this pitch (C1/C2/C8 conflict: the appetite auditor says phases can call the library directly, the skeptic shows an agent would have to write unreviewed `node -e` scripts).

