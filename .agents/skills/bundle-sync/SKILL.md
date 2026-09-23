---
name: bundle-sync
description: Validate structural drift between an already-unpacked project and a newer copy of the ai-workflow-portable source bundle, and apply approved updates.
---

# Bundle Sync

Run `node ai-framework/scripts/bundle-sync.js --source <path>` from the target project root (add
`--base-ref <ref>` on a first sync); add `--apply [--prune]` only after the human approves the
dry-run report. Local customizations are kept, never overwritten. See
`.claude/skills/bundle-sync/SKILL.md` for what is compared, what is flagged-only, and the
verification step.
