# Run: state-ai-authoring (2026-10-20)

Big-batch, 10 scopes, shipped as 2.37.0 with the live claim `blocked`. Orca bypassed (`orca=normal`); no workers. S2–S6 built inline; three independent review rounds in S7 (code on Fable, security on Opus); S8–S9 drove `claude`, `opencode` and `codex` headlessly; audit cycle 1 used six reviewers with two planted canaries.

Full records: `.project/pitches/state-ai-authoring/` (pitch, plan, deviations D1–D43, log, live-runs, SHIPPED). Raw run outputs: git-ignored `.project/evals/runs/state-ai-authoring/`.

Key facts: inject module 297 of 330 lines, production +332 of 420, 15 of 15 files; 651 state/skill/contract/invariant tests pass; full suite 2312 tests, 2293 pass, 3 skipped, 16 red that all trace to one existing wall-clock sanitizer test under load; mutants M1–M44 killed; live matrix 72 runs, 51 pass (Claude Code 21/24, Codex 20/24, OpenCode 10/24), 9 seeded-bad failed by every blind grader; graph CLEAN with 3 new entries; docs-links 0 broken. `setup-validator` and `workflow-doctor` were INCOMPLETE for part of the session because the local git-ignored `ai-workflow.toon` was edited mid-session (claude worker missing from its coordinator list); the owner fixed it and both are READY. Independent of this pitch.

Incidents: `$T` unquoted under zsh (existing issue card); OpenCode ignores the process cwd and follows `PWD`; Codex needs `--skip-git-repo-check` and closed stdin; a skill example ("leave tokens empty when unavailable") made every model stop at an empty slot; two audit must-fixes were the planted canaries; `review-bench guard` cannot snapshot once 72 run directories exist.
