---
description: Parallel fan-out audit phase. Dispatches code-reviewer + security-reviewer + test-coverage + ux-reviewer + i18n-checker + eval-runner + cross-pitch-conflict-checker as parallel subagents, synthesizes findings, applies must-fix patches, loops ≤3 cycles.
model: opencode-go/minimax-m3
---

Load `.claude/skills/audit/SKILL.md` and follow it exactly. Dispatch the applicable audit roles in parallel when available; otherwise run them sequentially. $ARGUMENTS
