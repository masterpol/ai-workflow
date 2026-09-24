---
name: bundle-sync
description: Validate structural drift between an already-unpacked project and a newer copy of the ai-workflow-portable source bundle, and apply approved updates.
---

# Bundle Sync

Run `node ai-framework/scripts/bundle-sync.js` from the target project root to compare against
the public GitHub `main` branch (add `--base-ref <ref>` on a first sync). Use `--source <path>`
only for an offline or unpublished source checkout. Add `--apply [--prune]` only after the human
approves the dry-run report. Local customizations are kept, never overwritten. See
`.claude/skills/bundle-sync/SKILL.md` for what is compared, what is flagged-only, and the
verification step.
