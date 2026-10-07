# Plan: shape-lite

**Pitch**: pitch.md  •  **Appetite**: big-batch  •  **Hill**: hill.md

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | Canonical skill + 3 mirrors | `.claude/skills/shape-lite/SKILL.md`, `.cursor/skills/shape-lite/SKILL.md` (verbatim copy), `.agents/skills/shape-lite/SKILL.md` (stub), `.opencode/commands/shape-lite.md` | ~110 | — | S2 | no: one coherent text, mirrors derive from it | — |
| S2 | Phase doc + overview + entry-file rows | `ai-framework/workflow/phases/0-shape.md`, `ai-framework/workflow/overview.md`, `AGENTS.md`, `CLAUDE.md` | ~50 | — | S1 | no: small, shares vocabulary with S1 | — |
| S3 | Version log + verification | `VERSION`, `CHANGELOG.md` (via `changelog.js --bump minor`) | ~15 | S1, S2 | — | no | — |

8 files + 2 entry files = 10 (≤15). Doctor needs no code change: it discovers skills with `listDirNames(".claude/skills")` and checks mirrors per skill.

## Exit criteria per scope

### S1 — Canonical skill + mirrors
- `node ai-framework/scripts/workflow-doctor.js` exit 0 with no `shape-lite` fail/warn (checks caveman line, `.agents` reference, `.opencode` model for `standard` profile, exact `SKILL.md` name)
- `diff .claude/skills/shape-lite/SKILL.md .cursor/skills/shape-lite/SKILL.md` empty
- `node ai-framework/scripts/skill-vendors.js cursor-mirrors` reports no differing/missing `shape-lite` mirror
- `grep -c "Approve / Revise / Back / Stop" .claude/skills/shape-lite/SKILL.md` ≥ 1
- `grep -E "resolve-mode --phase shape" .claude/skills/shape-lite/SKILL.md` matches, with `$ARGUMENTS` as raw args
- SKILL text contains each pitch behaviour, checked by grep: graph-only knowledge gate (≤3 reads), the 4 escalation triggers, "keep target pitch's appetite and gate row", "≥2 active pitches and no slug → ask", `## Revisions` row, standalone card ≤150 tokens, knowledge entry ≤15 lines then `graphify.js`
- Skill states agents dispatched as `Agent` calls in one parallel turn, completions counted once (K1)
- `/shape-lite` standalone card path uses the existing pitch folder layout; no new directory type

### S2 — Docs
- `grep -n "shape-lite" ai-framework/workflow/phases/0-shape.md ai-framework/workflow/overview.md AGENTS.md CLAUDE.md` hits all 4
- Overview has a "Lite shape" variant entry and notes the gate row follows the target pitch's appetite
- `node ai-framework/scripts/setup-validator.js` exit 0
- `0-shape.md` states full `/shape` behaviour is unchanged (no-go) — diff touches only added sections

### S3 — Version + verification
- `node ai-framework/scripts/changelog.js --check` exit 0; `VERSION` reads `2.9.0`
- `node --test ai-framework/scripts/` exit 0 (whole suite)
- `node ai-framework/scripts/graphify.js --check` CLEAN
- `git status --short` lists only the files above plus pitch records (K3: no orphan install artifacts)
- Smoke (manual, optional): run `/shape-lite` on a throwaway task; confirm escalation fires on a >2-file task

## Risks (inherited from pitch)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| Hard-coded skill counts / mirror parity (K3, K4) | S1, S3 | no: doctor is dynamic (appetite-auditor) | Doctor + `cursor-mirrors` + full suite as exits |
| `.opencode` adapter model/effort | S1 | no | `standard` profile → `openai/gpt-5.6-terra`, no `reasoningEffort` (only deep requires it) |
| Escalation test judged by lite itself (K2) | S1 | no | Triggers are counts/path matches; `appetite-auditor` dispatched when file count uncertain |
| Inline mode downgrades a big-batch pitch (S1/S2 critique) | S1 | no | Skill text requires reading target pitch appetite and keeping its gate row; grep exit above |
| Free-text arg ambiguity (S2 critique) | S1 | no | Rule + grep exit above |
| Skill-defaults catalog may list phases/skills | S1 | yes, 5 min | `grep` `skill-defaults.json` for per-skill entries before writing; `--phase shape` is already valid |

## Parallel dispatch plan

S1 and S2 touch disjoint files and could run in parallel, but both are small and share wording, so build them inline in one session. S3 runs last. No subagents; `code-reviewer` and the audit fan-out run at `/audit`.

## Living-spec deviations log

(Empty at /plan time.)
