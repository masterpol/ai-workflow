---
description: Validate structural drift between an already-unpacked project and a newer copy of the ai-workflow-portable source bundle, and apply approved updates.
model: openai/gpt-5.6-terra
---

Run `node ai-framework/scripts/bundle-sync.js` to compare against the public GitHub `main`
branch (use `--source <path>` only for an offline or unpublished checkout). See
`.claude/skills/bundle-sync/SKILL.md` for the full dry-run/gate/apply flow) and present the
drift report to the user before ever passing `--apply`. $ARGUMENTS
