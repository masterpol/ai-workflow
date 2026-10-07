---
id: shape-lite-is-a-gated-escalating-variant-of-shape
type: decision
created: 2026-10-07
updated: 2026-10-07
tags: [shape-lite, shape, gates, escalation, small-batch, workflow, cross-vendor]
related: [a-gate-must-not-trust-its-own-author, a-gate-must-not-audit-its-own-instrument, caveman-mode-is-default-everywhere, prose-instructions-must-specify-how-to-extract-from-free-form-arguments]
source: shape-lite
---

# Decision: `/shape-lite` is a compressed variant of `/shape` that escalates mechanically

## Decision
- One skill, four vendors (canonical `.claude`, byte-copy `.cursor`, `.agents` stub, `.opencode` command, `standard` profile). Full `/shape` is unchanged.
- Inline (patches the one named/active pitch, one `## Revisions` row) or standalone (≤150-token card). ≥2 active pitches and no slug → ask, never guess.
- Inline mode keeps the target pitch's appetite and gate row; lite never substitutes the small-batch auto path.
- Escalation to `/shape` is evidence-based and runs first and after every Revise/Back: >2 files or >100 LOC, any prompt/LLM call site, a security-rules path, overlap with another active pitch. A trigger that cannot be ruled out counts as fired ([[a-gate-must-not-trust-its-own-author]]).
- Graph-only knowledge gate (≤3 reads); knowledge entry only if reusable and never when escalated. Gate is Approve / Revise / Back / Stop.
- Caveman line uses `--phase utility`: non-phase skills must resolve as utility (enforced by `skill-defaults.test.js`).

## Consequences
- A relaxed escalation trigger must update this entry. Skill-count tests are dynamic; a new skill needs only the four files above.
