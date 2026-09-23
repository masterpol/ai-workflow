---
description: Validate and sync structural changes from a newer ai-workflow-portable source bundle into this already-unpacked project.
model: openai/gpt-5.6-terra
---

Run `node ai-framework/scripts/bundle-sync.js --source <path>` (see
`.claude/skills/bundle-sync/SKILL.md` for the full dry-run/gate/apply flow) and present the
drift report to the user before ever passing `--apply`. $ARGUMENTS
