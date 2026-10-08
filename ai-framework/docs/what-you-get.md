# What you get

← [Back to README](../../README.md)

```
ai-framework/      Portable core — rules/ workflow/ templates/ integrations/ scripts/ hooks/
.claude/           Claude Code role prompts, skills, and hooks (canonical — see below)
.opencode/         OpenCode commands and native role adapters (thin mirrors)
.codex/            Codex configuration and native role adapters (thin mirrors)
.agents/           Codex-native phase skills (thin mirrors)
AGENTS.md          Cross-tool entry point (OpenCode/Codex/Cursor auto-read this)
CLAUDE.md          Claude Code entry point — self-triggers setup on first load
SETUP.md           The AI-followable install guide (start here)
```

`.cursor/{agents,skills}/` aren't shipped in the bundle — `SETUP.md` generates them at install
time as mirrors of `.claude/agents/` and `.claude/skills/`, since Cursor uses the same format
(`node ai-framework/scripts/skill-vendors.mts cursor-mirrors --apply` creates missing ones).

External skills (for example from skills.sh) are added with `/add-skill`, which installs one
verified skill for every vendor in the project with an explicit scope and workflow phases. See
`ai-framework/integrations/skills.md`.

---

See also: [vendors](vendors.md) · [pipeline](pipeline.md)
