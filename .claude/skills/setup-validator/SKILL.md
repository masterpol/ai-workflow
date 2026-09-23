---
name: setup-validator
description: Verify that workflow setup generated complete project context, entry files, knowledge graph, and harness mirrors.
---

# Setup Validator

> **Recommended capability profile:** `fast` — deterministic validation of generated setup artifacts. Use the paid fast route because setup context can contain broad project information.

Run `node ai-framework/scripts/setup-validator.js` from the target project root after `/setup`.
It is read-only and validates the generated `.project/` layer, project-specific `AGENTS.md` and
`CLAUDE.md`, knowledge graph, pitch scaffold, Cursor mirrors, and the portable workflow doctor.

If it reports failures, re-run `/setup` and use its confirmation gates. Do not hand-write
generated context documents, entry-file mirrors, or knowledge graph artifacts to satisfy the
validator. Use `--json` for automation or `--no-color` for plain text.
