---
name: audit
description: Parallel fan-out audit phase. Dispatches code-reviewer + security-reviewer + test-coverage + ux-reviewer + i18n-checker + eval-runner + cross-pitch-conflict-checker as parallel subagents, synthesizes findings, applies must-fix patches, loops ≤3 cycles.
---

# Audit

Follow `.claude/skills/audit/SKILL.md` and `ai-framework/workflow/phases/3-audit.md`. Spawn each applicable audit role in parallel, wait for all results, then synthesize and fix must-fix findings before shipping.
