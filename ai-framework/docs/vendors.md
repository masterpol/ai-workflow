# One source, every vendor

← [Back to README](../../README.md)

> **Caveman mode** rides the same architecture: one instruction, carried by every canonical skill
> and agent (and both entry files), resolved per invocation by `skill-defaults.mts`. Vendor mirrors
> point at the canonical files or are byte copies — see
> [`ai-framework/integrations/skill-defaults.md`](../integrations/skill-defaults.md).

Every skill, agent, and command is written **once**, canonically, and every vendor consumes
that same source — no vendor maintains its own copy of the logic:

- **Skills** — canonical at `.claude/skills/<name>/SKILL.md`. Mirrored as
  `.opencode/commands/<name>.md` (OpenCode) and `.agents/skills/<name>/SKILL.md` (Codex), and at
  install time as `.cursor/skills/<name>/` (Cursor). Every skill has all three mirrors —
  not just the 7 pipeline phases (`workflow-doctor.mts` enforces this, so no count is kept here).
- **Agents** — canonical at `.claude/agents/<name>.md`. Mirrored as `.opencode/agents/<name>.md`
  and `.codex/agents/<name>.toml`, and at install time as `.cursor/agents/<name>.md`.
- **A mirror is a pointer, never a fork.** Every mirror's entire content is "load the canonical
  file and follow it exactly," plus a `model:`/frontmatter line picked from the profile the
  canonical file itself declares. If you ever find a mirror with actual logic in it instead of a
  pointer, that's drift — fix it by deleting the logic and pointing back at the canonical file.
- **The profile is declared once, in the canonical file** — a skill's
  `> **Recommended capability profile:** `fast`/`standard`/`deep`` line, or an agent's `model:`
  frontmatter (`claude-haiku-*` → fast, `claude-sonnet-*` → standard, `claude-opus-*` → deep).
  Nothing in this bundle hardcodes a second copy of that assignment — the mirrors' models and
  `workflow-doctor.mts`'s checks both derive from it.

**This is enforced, not just documented.** `workflow-doctor.mts` doesn't check a fixed list —
it discovers every directory under `.claude/skills/` and every file under `.claude/agents/` at
run time, derives each one's expected profile from its own canonical content, and fails if a
mirror is missing, doesn't load the canonical file, or doesn't carry the model that profile
implies. Add a new skill or agent with a declared profile and working mirrors, and the doctor
validates it automatically on the next run — nothing to register by hand. Run it after adding or
changing any skill or agent to confirm all four vendors would actually work.

---

See also: [versioning-and-sync](versioning-and-sync.md) · [pipeline](pipeline.md) · [extending](extending.md)
