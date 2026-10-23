# One source, every vendor

← [Back to README](../../README.md)

> **Caveman mode** rides the same architecture: one instruction, carried by every canonical skill
> and agent (and both entry files), resolved per invocation by `skill-defaults.mts`. Vendor mirrors
> point at the canonical files or are byte copies — see
> [`ai-framework/integrations/skill-defaults.md`](../integrations/skill-defaults.md).

Every skill, agent, and command is written **once**, canonically, and every vendor consumes
that same source — no vendor maintains its own copy of the logic:

- **Skills** — canonical at `.claude/skills/<name>/SKILL.md`. Mirrored as
  `.opencode/commands/<name>.md` (OpenCode) and `.agents/skills/<name>/SKILL.md` (Codex), and as
  `.cursor/skills/<name>/` (Cursor). Every skill has all three mirrors —
  not just the 7 pipeline phases (`workflow-doctor.mts` enforces this, so no count is kept here).
- **Agents** — canonical at `.claude/agents/<name>.md`. Mirrored as `.opencode/agents/<name>.md`
  and `.codex/agents/<name>.toml`, and as `.cursor/agents/<name>.md`.
- **Two mirror mechanisms, never a fork.**
  - *OpenCode and Codex mirrors are pointers.* Their content is "load the canonical file and follow it exactly", plus
    host-native settings: a `model:`/frontmatter line picked from the profile the canonical file declares, and host
    permissions (for example a reviewer's `edit: deny` or `sandbox_mode = "read-only"`). Any other logic in a pointer
    is drift — delete it and point back at the canonical file.
  - *Cursor mirrors are committed byte copies.* Cursor reads the same format as Claude Code, so `.cursor/skills/` and
    `.cursor/agents/` hold exact copies of the canonical files. A difference from the canonical file is drift unless it
    is a deliberate local customization.
- **Refreshing Cursor copies.** `node ai-framework/scripts/skill-vendors.mts cursor-mirrors` lists `created`
  (missing) and `differs` (stale) copies; `--apply` writes only the missing ones and never overwrites a differing
  file. After you change a canonical file, review each `differs` entry and, when it is not a deliberate customization,
  copy the canonical file over it (`cp .claude/<path> .cursor/<path>`). The doctor and the skill-defaults tests fail on
  a stale copy, so the refresh belongs in the same change as the canonical edit.
- **The profile is declared once, in the canonical file** — a skill's
  `> **Recommended capability profile:** `fast`/`standard`/`deep`` banner, or an agent's
  `profile:` frontmatter key (`fast` / `standard` / `deep`). The actual model id for each
  profile lives in the project-root `ai-workflow.toon` `models.<vendor>.<profile>.model` entry
  (see `ai-framework/integrations/harnesses.md`). The mirrors' `model:` lines and
  `workflow-doctor.mts`'s checks both derive from that single toon block.

**This is enforced, not just documented.** `workflow-doctor.mts` doesn't check a fixed list —
it discovers every directory under `.claude/skills/` and every file under `.claude/agents/` at
run time, derives each one's expected profile from its own canonical content, and fails if a
pointer mirror is missing, doesn't load the canonical file, or doesn't carry the model that profile
implies; setup-validator warns when a Cursor copy differs from its canonical file. Add a new skill or agent with a declared profile and working mirrors, and the doctor
validates it automatically on the next run — nothing to register by hand. Run it after adding or
changing any skill or agent to confirm all four vendors would actually work.

---

See also: [versioning-and-sync](versioning-and-sync.md) · [pipeline](pipeline.md) · [extending](extending.md)
