# S3 evidence

Files: `.claude/settings.json`, `ai-framework/hooks/hooks.json`, `.opencode/plugins/token-consumption.js`. `.codex/hooks.json` unchanged (S0: no Codex fields verified).

- `JSON.parse` of `.claude/settings.json`, `ai-framework/hooks/hooks.json`, `.codex/hooks.json`: ok.
- `grep -c '"matcher": "Skill"'`: 1 in `.claude/settings.json`, 1 in `ai-framework/hooks/hooks.json`.
- CLI: a `PostToolUse(Skill)` payload with `tool_input.args` set to a marker string, piped to `token-consumption.js --vendor claude --event skill-use`, exits 0, records `skills.claude.shape.uses = 1`, and the marker appears in none of the three output files (0 matches each).
- OpenCode plugin, driven with stubbed hook inputs: a `Skill` tool call records `skills.opencode.plan.uses = 1`; a non-skill tool call is ignored; a completed message after `chat.message` with `variant: "high"` records `efforts.opencode.high`; the extra tool argument marker appears in no output file.

## What this does not prove
- OpenCode's `variant` value and skill tool id are checked against a stub built from the type definitions, not a live OpenCode session. If either differs live, the report shows "Unreported" for that dimension; nothing is guessed.
- The new Claude `Skill` hook fires from the same payload shape S0 captured live for `PostToolUse(Skill)`, but the wired hook itself has not yet been observed running; that happens when a skill is next invoked in a session that loads this `settings.json`.
