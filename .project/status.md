# Status

> Index only — hard cap **100 lines**. Detail lives per-pitch in `pitches/{slug}/`; history in `runs/`.

## Active pitches
| Pitch | Hill | Phase | Appetite | Last touched |
|-------|------|-------|----------|--------------|
| orca-role-pools | shaped | shape (critiqued, bet pending) | big-batch | 2026-10-16 |
| workflow-v3-rollout | shaped | shape | small-batch | 2026-10-16 |

## Parked pitches
| Pitch | Parked | Reason |
|-------|--------|--------|
| restore-vendor-adapters | 2026-10-08 | Premise invalidated by critique: vendor adapters are already present and pass validators. |

## Recent ships (last 5)
| Pitch | Shipped | Notes |
|-------|---------|-------|
| orca-engines-range | 2026-10-16 | v2.26.0; `integrations.orca.engine` is an npm-style version range (new pure `runtime/semver-range.mts`, 2480 npm-semver fixture rows); checked by preflight, launch gate and start hook; invalid range is a config error; a bare version is now an exact pin; Node 1558/0 (2 skipped), Bun not run; audit 1 cycle, canary caught by 3 reviewers, 0 must-fix. See `runs/2026-10-16-orca-engines-range.md`. |
| upstream-project-drift | 2026-10-16 | v2.23.0; S0-S10 (climbing/LAH/RN improvements into base, OpenCode port freed, Orca floor 1.4.224); Node 1327/0, Bun 1323/0; sync proof dry-run only; not yet merged to `main`. See `runs/2026-10-16-upstream-project-drift.md`. |
| unified-toon-config | 2026-10-16 | v2.25.0; one `ai-workflow.toon` (schemaVersion 2, Orca under `integrations.orca`), `config-migrate`, fail-closed readers, pinned legacy readers; Node 1492/1494, Bun 143/143; audit 2 cycles (1 ReDoS + 1 escape-echo must-fix fixed), orca=normal. See `runs/2026-10-16-unified-toon-config.md`. |
| codex-orca-coordinator-parity | 2026-10-08 | v2.22.0; Codex startup hook, explicit startup/Run binding, doctor wiring; Node169pass/1skip, Bun170pass; host activation unverified. See `runs/2026-10-08-codex-orca-coordinator-parity.md`. |
| opencode-handoff | 2026-10-08 | Created `.project/context/opencode-handoff.md` documenting OpenCode's Orca adapter state, missing `.opencode/`/`.agents/`/`.codex/` directories, live probe result (`caller-unverified`), and verification commands. Small-batch lite; no code changes. See `.project/pitches/opencode-handoff/SHIPPED.md`. |

## Open rabbit holes across active pitches
- Legacy source access, content and media totals, and school-site ownership.
- Identity, privacy, data residency, infrastructure, and operational vendor decisions.
- Canonical paths and redirect treatment for current school domains.

## Followups backlog
→ `.project/pitches/_followups.md` (includes four Orca foundation followups; prior history retained)

## /cooldown due in: 2 ships
Last review2026-10-08: `runs/cooldown-2026-10-08-codex-orca-coordinator-parity.md`. Prior same-date reports and pending proposals remain intact. New proposals:C1 guard secret exclusion,C2 trusted Codex hook smoke,C3 coverage instrumentation. No proposal applied; individual approval required.
