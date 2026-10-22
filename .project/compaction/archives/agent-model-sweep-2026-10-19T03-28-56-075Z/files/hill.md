# Hill: agent-model-sweep (Bet 2 — Canonical sweep)

**Pitch**: pitch.md  •  **Plan**: plan.md

## Positions

Hill positions: `uphill 0%` → `uphill 25%` → `uphill 75%` → `over-the-hill` → `downhill 25%` → `downhill 75%` → `done`.

| Scope | Starting position | Notes |
|-------|-------------------|-------|
| S1 — Canonical agent frontmatter sweep | done | 16 agents: `model:` → `profile:`. Verified. |
| S2 — Cursor mirror regen | done | 16 mirrors regenerated via `cursor-mirrors` + manual copy. Byte-identical. |
| S3 — OpenCode top-level model config | done | `opencode.json`: top-level `model: opencode-go/kimi-k2.7-code`; `agent.build.model` removed. |
| S4 — Doctor legacy-prefix cleanup | done | `agentProfileByModelPrefix` + fallback branch removed. Doctor compiles, 0 fails. |
| S5 — Tests and pre-flight invariant | done | 1 new invariant test passes; 1 obsolete test rewritten. Doctor tests 54/54. |
| S6 — Doc sweep | done | `extending.md`, `vendors.md`, `harnesses.md` updated. |
| S7 — Release record | done | CHANGELOG 2.28.0, VERSION bumped. |
