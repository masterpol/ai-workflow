---
description: Entry point for the bug-fix workflow. Searches knowledge for similar issues, confirms reproduction and root cause, then runs the bug-fix variant of /build → /audit → /ship. Use for known bugs with clear reproduction steps.
model: opencode/mimo-v2.5-free
---

Load `.claude/skills/fix/SKILL.md` and follow it exactly. Use the `fast` capability profile from `ai-framework/integrations/harnesses.md`. $ARGUMENTS
