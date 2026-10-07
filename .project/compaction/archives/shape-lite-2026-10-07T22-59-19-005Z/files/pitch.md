# Pitch: shape-lite

**Date**: 2026-10-07  •  **Appetite**: big-batch (by file count: 3 vendor mirrors + docs + doctor; each file small)
**Stack**: workflow tooling (skills, phase docs, doctor)

## Problem

Someone using the workflow has a small task, or rejects part of a plan/pitch mid-flow, and the only option is the full `/shape` ceremony or skipping framing entirely. They need a fast, bounded, compressed framing step that works alone or inside an active pitch, without losing the knowledge gate or agent checks.

## Knowledge consulted

- decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers — standing no-gos apply (no silent override of customization, nothing installed/deleted while shaping).
- decisions/caveman-mode-is-default-everywhere — a new skill must carry the caveman instruction and mirror to every vendor; `workflow-doctor.js` fails otherwise.
- decisions/pitch-compaction-gate-and-recovery-design + pattern a-gate-must-not-trust-its-own-author — the lite step must not self-approve its own escalation test.
- issues/prose-instructions-must-specify-how-to-extract-from-free-form-arguments — lite's args are free text; say how to extract the task/target pitch.
- `ai-framework/rules/` + `.project/rules/` — only `README.md` exists in project rules; no stack companions apply.

## Solution sketch (breadboard)

**Places**: new skill `shape-lite` (canonical `.claude/skills/`, mirrors in `.agents/`, `.cursor/`); `0-shape.md` + `overview.md` (document the variant and its gate row); `workflow-doctor.js` (+test) skill/mirror counts; `VERSION`/`CHANGELOG.md`.

**Affordances** (`/shape-lite <task or rejection>`):
1. **Detect context** — active pitch in `status.md`? yes = *inline* (patch it), no = *standalone*.
2. **Knowledge gate, graph-only** — tagIndex lookup, read ≤3 matches, surface 1-3 hits. No bulk read.
3. **Frame in 4 lines** — problem, appetite check, ≤3 rabbit holes (one-line disposition each), ≤3 no-gos.
4. **Escalation test (hard triggers → full `/shape`)** — >2 files or >100 LOC projected, touches `lib/ai/prompts/` or LLM calls, touches a security-rules path, or overlaps another active pitch's files.
5. **Agents, parallel, fast profile, only when needed** — `appetite-auditor` if file count uncertain; `knowledge-historian` if graph returns 0 or ambiguous hits; `skeptic` only on escalation edge cases.
6. **One gate**: Approve / Revise / Back / Stop, then hand to `/build` (small-batch auto path, inline exit check instead of `/plan`; inline mode keeps the target pitch's own appetite and gate row).

**Outputs (compressed)**: *inline* = edit existing `pitch.md` sections plus one row in a `## Revisions` table (date, trigger, change); *standalone* = one ≤150-token card `.project/pitches/{slug}/pitch.md` tagged `lite`. Knowledge entry (≤15 lines, then `graphify.js`) only when the rejection or decision is reusable; otherwise none.

**Connections**: user rejection or small task → `/shape-lite` → (inline) pitch.md patch → `/plan`/`/build` continue; (standalone) card → `/build`; escalation → `/shape`.

## Rabbit holes

**Resolved here**:
- Escalation drift (lite grows into full shape) → fixed hard triggers above, evaluated before writing; any hit stops lite and says why.
- Recording a user rejection without bloating the pitch → one `Revisions` row; knowledge entry only if reusable.
- AI-prompt golden-eval hard gate bypass → lite refuses AI-prompt scopes (trigger 4).

**Pushed to /plan as risk** (owner: planner):
- Doctor/test hard-coded skill counts (26 skills, 3 mirror sets) and per-vendor mirror parity; enumerate every count before scoping.
- Whether OpenCode/Codex need a command/agent adapter file (`.opencode/commands/`) — verify per `harnesses.md`.

**Pushed to no-go**:
- Cross-pitch conflict check in lite (escalation trigger covers overlap by file set only).

## No-gos (this pitch)

- ✗ No change to full `/shape` behaviour, template, or its gates.
- ✗ No critique fan-out inside lite; no new agents (reuse existing ones).
- ✗ No auto-advance past the single gate; no silent edits to a pitch the user did not name.
- ✗ Standing workflow-tooling no-gos (no application work, no secrets, no installs/deletions during shaping).

## Critique findings

Run 2026-10-07: knowledge-historian, skeptic, appetite-auditor (cross-pitch skipped: no active pitches; eval skipped: not AI-prompt).

| ID | Sev | Finding | Disposition |
|----|-----|---------|-------------|
| K1 | high | issues/async-agent-launch-hook-counted-as-completion: parallel agent dispatch | Addressed: lite counts completions only, never launches; plan verifies |
| K2 | high | patterns/a-gate-must-not-audit-its-own-instrument: escalation test is a new gate | Addressed: triggers are mechanical (file/LOC count, path match), evaluated by `appetite-auditor`, not lite's own judgement |
| K3 | high | issues/installed-skill-wrappers-ship-as-orphans: mirrors ship downstream | Pushed to /plan: check git status and sync after adding mirrors |
| K4 | med | decisions/skill-defaults-attribution-guard-and-runtime-design: doctor enforcement | Pushed to /plan |
| S1 | high | Inline lite on a big-batch pitch could silently downgrade its gates | Resolved: lite reads the target pitch's appetite and keeps its gate row; handoff never substitutes small-batch auto path |
| S2 | high | Free-text args: which pitch when ≥2 active? | Resolved: ≥2 active pitches and no named slug = refuse and ask; never guess |
| S3 | med | Gate omits "Back" | Resolved: gate is Approve / Revise / Back / Stop, per overview.md |
| A1 | info | Appetite OK: ~8 files / ~193 LOC (big-batch by file count only). `workflow-doctor.js` discovers skills dynamically, so likely no code change | Plan confirms; doctor-count risk downgraded |

## Bet decision

☑ **Bet** (→ /plan) — 2026-10-07, user invoked `/plan`
☐ Re-shape — named gap: {…}
☐ Pass — `.project/pitches/_parked/shape-lite/`; reason: {…}
