# Status

> Index only — hard cap **100 lines**. Detail lives per-pitch in `pitches/{slug}/`; history in `runs/`.

## Active pitches
| Pitch | Hill | Phase | Appetite | Last touched |
|-------|------|-------|----------|--------------|
| upstream-project-drift | uphill 0% (S0-S9) | plan (awaiting approval) | big-batch (10 scopes) | 2026-10-16 |
| orca-engines-range | shaped | shape | small-batch | 2026-10-16 |
| orca-role-pools | shaped | shape (critique pending) | big-batch | 2026-10-16 |
| workflow-v3-rollout | shaped | shape | small-batch | 2026-10-16 |

## Parked pitches
| Pitch | Parked | Reason |
|-------|--------|--------|
| restore-vendor-adapters | 2026-10-08 | Premise invalidated by critique: vendor adapters are already present and pass validators. |

## Recent ships (last 5)
| Pitch | Shipped | Notes |
|-------|---------|-------|
| unified-toon-config | 2026-10-16 | v2.25.0; one `ai-workflow.toon` (schemaVersion 2, Orca under `integrations.orca`), `config-migrate`, fail-closed readers, pinned legacy readers; Node 1492/1494, Bun 143/143; audit 2 cycles (1 ReDoS + 1 escape-echo must-fix fixed), orca=normal. See `runs/2026-10-16-unified-toon-config.md`. |
| codex-orca-coordinator-parity | 2026-10-08 | v2.22.0; Codex startup hook, explicit startup/Run binding, doctor wiring; Node169pass/1skip, Bun170pass; host activation unverified. See `runs/2026-10-08-codex-orca-coordinator-parity.md`. |
| opencode-handoff | 2026-10-08 | Created `.project/context/opencode-handoff.md` documenting OpenCode's Orca adapter state, missing `.opencode/`/`.agents/`/`.codex/` directories, live probe result (`caller-unverified`), and verification commands. Small-batch lite; no code changes. See `.project/pitches/opencode-handoff/SHIPPED.md`. |
| runner-aware-runtime-boundary-validator | 2026-10-08 | `validateRuntimeImports` (`runtime/validate.mts`), a workflow-doctor `Runtime boundary` check (production and unparsed sources fail, 43 test files warn as one line) and a stricter invariants test; v2.21.0; Node 1238/1239, Bun 1229/1230; audit 2 cycles via Codex/OpenCode workers, 9 valid-JS evasions closed. See `runs/2026-10-08-runner-aware-runtime-boundary-validator.md`. |
| orca-auto-start-all-phases | 2026-10-08 | Orca decision runs automatically on the 12 workflow phases when the switch is true (`decideStart`, `orca-run start`, Claude hook on `PreToolUse(Skill)` + `UserPromptExpansion`); blocked means stop and ask, `orca=normal` bypasses one call; v2.20.0; Node 1148/1149, Bun 1139/1140; audit 2 cycles, built and audited through real Codex/OpenCode workers. See `runs/2026-10-08-orca-auto-start-all-phases.md`. |

## Open rabbit holes across active pitches
- Legacy source access, content and media totals, and school-site ownership.
- Identity, privacy, data residency, infrastructure, and operational vendor decisions.
- Canonical paths and redirect treatment for current school domains.

## Followups backlog
→ `.project/pitches/_followups.md` (includes four Orca foundation followups; prior history retained)

## /cooldown due in: 4 ships
Last review2026-10-08: `runs/cooldown-2026-10-08-codex-orca-coordinator-parity.md`. Prior same-date reports and pending proposals remain intact. New proposals:C1 guard secret exclusion,C2 trusted Codex hook smoke,C3 coverage instrumentation. No proposal applied; individual approval required.
