# Codex handoff — start here

Written 2026-10-08 for a Codex session that continues work on this repository. Facts below were observed in the previous Claude Code session; anything marked "unverified" was not run from Codex.

## What this repository is
`ai-workflow-portable` is the bundle itself, not an application: a ShapeUp-style pipeline (`/shape → /critique → /plan → /build → /audit → /ship`, `/cooldown` every 5 ships), role prompts, rules, hooks and Node scripts that get copied into other projects. Read `AGENTS.md` first (Codex loads it automatically), then `ai-framework/workflow/overview.md`.

## State right now
- Branch `use-orca-multiagent`, version **2.21.0**, open PR: https://github.com/masterpol/ai-workflow/pull/5 (base `main`). Working tree clean after commit `d1d3b57`.
- No active pitch (`.project/status.md`). Shipped today: `state-multipage-report` (2.19.x), `orca-auto-start-all-phases` (2.20.0), `runner-aware-runtime-boundary-validator` (2.21.0). `/cooldown` is due in 1 ship.
- Backlog: `.project/pitches/_followups.md` (about 14 items). Biggest: migrate the 43 test files that still import `node:*` directly; the start block in each of the 12 phase skills; Codex/OpenCode/Cursor triggers for the Orca start.
- Knowledge: `.project/knowledge/` (57+ entries). Query with `node ai-framework/scripts/graphify.mts query "<question>"` before raw searches.

## How Codex finds things here
- Skills: `.agents/skills/<name>/SKILL.md` are short pointers to the canonical `.claude/skills/<name>/SKILL.md`; load the canonical file and follow it exactly.
- Role prompts: `.codex/agents/*.toml` load `.claude/agents/*.md`. `.codex/config.toml` only caps concurrency (8); it sets no model.
- Codex does not spawn nested agents by itself; ask explicitly.
- Hooks: `.codex/hooks.json` only records `SubagentStop` for token metrics. **There is no Orca start hook for Codex** (the Claude Code hook in `.claude/settings.json` does not run in Codex).

## Run and verify
- Node 22.18+ runs `.mts` directly; Bun 1.4 also works. The project's `ai_workflow_env.json` (git-ignored) selects the runner; process env wins. Use `AI_WORKFLOW_RUNNER=node` when a test empties PATH.
- Tests: `node --experimental-strip-types --disable-warning=ExperimentalWarning --test <file>` or `bun test <file>`. Full suites: Node 1239 tests (1 skipped), Bun 1230 (1 skipped), 0 failures expected. Run Node and Bun one after the other, not at the same time (one `token-consumption` test is timing-sensitive under load).
- Checks: `node ai-framework/scripts/setup-validator.mts` (READY), `node ai-framework/scripts/workflow-doctor.mts` (exit 0), `node ai-framework/scripts/graphify.mts --check` (CLEAN). No build, typecheck, lint or i18n command exists.
- Production `.mts` files may not import `node:*` or use `any`; take capabilities through `RuntimeDeps` (`runtime/invariants.test.mts`, `runtime/validate.mts`). The doctor's `Runtime boundary` line must stay at 0 production violations.

## Orca (opt-in, off unless `AI_WORKFLOW_ORCA_MULTI_AGENT` is exactly `true`)
- Contract: `ai-framework/integrations/orca-vendors.md`, "Automatic start" section. README section "Orca mode".
- As a **worker**, Codex has been dispatched many times and works. As a **coordinator**, Codex is unverified: the library and CLI accept it (`node ai-framework/scripts/orca-run.mts start --root . --phase <name> --vendor codex`), and `build`/`audit`/`ship` tell the agent to run it first and to stop and ask when it exits 1-4. Honor that rule: never fall back to the normal flow silently; `orca=normal` in the invocation is the user's per-call bypass.
- Readiness comes from `evaluateLaunch` (`orca-launch-gate.mts`), not from `orca-run.mts status` (its `dispatchReady: false` is by design).
- Local setup (not in git): `.project/orchestration.json` (copy `ai-framework/integrations/orca-vendors.example.json`, set `use-orca-orchestration: true`), the real `orca` binary first on PATH (a stale `/usr/local/bin/orca` symlink once broke worker reports), and logged-in Codex/OpenCode CLIs. Workers share this checkout, so check every worker diff and re-run exit commands yourself.

## Rules that bite
- Every gated phase ends with **Approve / Revise / Back / Stop**; never auto-advance.
- Never read or commit `.env*`, `credentials.json`, `settings.local.json`. Never rewrite historical records under `.project/pitches/` or `_archive/` (only `/pitch-compress` may remove a shipped pitch, with an archive and your approval).
- Generated files are not hand-edited: `graphify-out/*`, `.project/knowledge/index.md`, `CHANGELOG.md`/`VERSION` (use `node ai-framework/scripts/changelog.mts`), `.project/reports/*`.
- Edit canonical files and their mirrors together (`.claude/skills` and `.cursor/skills` are byte copies; the setup validator checks).
- Responses default to brevity (caveman `full`) unless the user says otherwise.

## Suggested first steps in Codex
1. `git status`, `git log --oneline -5`, read `.project/status.md` and `.project/pitches/_followups.md`.
2. Run the three checks above and one test file to confirm the environment.
3. Ask the user which followup to shape; start with `/shape` (read `.claude/skills/shape/SKILL.md`).
