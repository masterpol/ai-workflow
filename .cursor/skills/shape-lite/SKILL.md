---
name: shape-lite
description: Fast, compressed framing for a small task or a user rejection mid-flow. Works standalone or patches an active pitch in place. Graph-only knowledge gate, hard escalation triggers back to full /shape, one gate.
---

# Shape Lite

> **Recommended capability profile:** `standard` — bounded framing, no deep breadboarding. Select an available model using `ai-framework/integrations/harnesses.md`.

Variant of `/shape` (`ai-framework/workflow/phases/0-shape.md`). Full `/shape` is unchanged; this is the short path.
> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.mts resolve-mode --phase utility --args-text "$ARGUMENTS"` (pass the raw, unparsed invocation text — the script extracts a `caveman=<mode>` token if present and ignores everything else; no `caveman=` mention is not an error, it just falls through to the instance/bundle default). If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this skill's other instructions; pass the same resolved mode to any subagent this skill dispatches. If not installed, proceed normally — this is optional, never required.

## When to use

- A small task (≤2 files, ≤100 LOC) that needs framing but not a full pitch.
- The user rejected or changed part of a plan, pitch, or build result and the framing must be patched.

Not for: AI-prompt scopes, security-path changes, or anything the escalation test below catches.

## Arguments

`$ARGUMENTS` is free text. Extract: (a) the task or rejection, (b) an optional pitch slug if it names a folder under `.project/pitches/` (exact match only). Anything else is the task text.

## Steps

1. **Detect mode.** Read `.project/status.md` → Active pitches.
   - 0 active, or the task is clearly unrelated to the named pitch → **standalone**.
   - exactly 1 active pitch, or a slug was named → **inline** on that pitch.
   - ≥2 active pitches and no slug named → **stop and ask which one**. Never guess.
   - Inline: read that pitch's `pitch.md` appetite and `## Bet decision`. Its appetite and gate row (`ai-framework/workflow/overview.md` → Adaptive confirmation gate) stay in force. Lite never replaces them with the small-batch auto path.
2. **Knowledge gate, graph-only.** Look up `graphify-out/graph.json` (`tagIndex`, `related` edges; rebuild with `node ai-framework/scripts/graphify.mts` if missing or stale). Read at most 3 matched entries plus any matching `ai-framework/rules/` or `.project/rules/*.md` file. Surface 1-3 hits inline. No bulk reads.
3. **Escalation test (mechanical, before framing or any pitch or knowledge write; re-run after every Revise or Back).** Stop lite, say which trigger fired, and hand to full `/shape` if ANY holds:
   - projected >2 files or >100 LOC;
   - touches prompt files, `lib/ai/prompts/`, or any LLM call site, however the project lays them out (the golden-eval hard gate lives in `/shape`);
   - touches a path covered by `ai-framework/rules/security.md`;
   - the projected file set overlaps another active pitch's `plan.md` or `pitch.md` files.

   The counts and path matches are the test, not a feeling. Quote the evidence for each trigger (file list, grep of the paths). When the file count is uncertain, or you cannot name the files, dispatch `appetite-auditor` (below); do not self-grade. A trigger you cannot rule out counts as fired.
4. **Frame in four lines (only after the test passed).** Problem (user-centric, one sentence) · appetite check · up to 3 rabbit holes, each with a one-line disposition (resolved / pushed to plan / pushed to no-go) · up to 3 no-gos.
5. **Agents (only when needed, one parallel turn, fast profile, resolved caveman mode passed).**

   | Condition | Agent |
   |---|---|
   | File count uncertain | `appetite-auditor` |
   | Graph returns 0 or ambiguous hits | `knowledge-historian` |
   | Escalation edge case, rabbit holes unclear | `skeptic` |

   Launch all needed agents in one message. Count each agent once, on completion; a launch notice is not a result.
6. **Write the output (compressed).**
   - **Inline:** edit only the affected sections of the existing `pitch.md`, and append one row to a `## Revisions` table at the end (create the table if absent): `| date | trigger (what the user rejected or changed) | what changed |`. Do not create new files. Do not touch sections the user did not mention.
   - **Standalone:** create `.project/pitches/{slug}/pitch.md` as a card of ≤150 tokens (Problem · Knowledge hit · Rabbit holes · No-gos · Exit check), tagged `**Appetite**: small-batch (lite)`. The Exit check is one machine-checkable command, replacing `/plan`.
   - **Knowledge (never when escalated):** write a ≤15-line entry under `.project/knowledge/{decisions,issues,patterns}/` only if the rejection or decision is reusable beyond this task; then run `node ai-framework/scripts/graphify.mts`. Otherwise write none.
7. **Gate.** Show the frame and any escalation result. **Approve / Revise / Back / Stop.** Never auto-advance.

## Transition

- Approve, standalone → `/build` (small-batch auto path; the Exit check is the scope's exit criterion).
- Approve, inline → the pitch's next phase under its own gate row (`/plan` or `/build`).
- Escalated → `/shape`.
- Back → re-frame in lite. Stop → write nothing further.

## Guardrails

- Never read or copy secret-bearing files.
- Never rewrite historical records under `.project/pitches/_archive/` or `.project/design/`.
- No `/critique` fan-out here; no new agents.
