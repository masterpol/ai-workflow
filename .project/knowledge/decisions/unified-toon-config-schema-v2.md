---
id: unified-toon-config-schema-v2
type: decision
created: 2026-10-16
updated: 2026-10-16
tags: [config, toon, schema, orca, migration, fail-closed]
related: [a-gate-must-not-trust-its-own-author, orca-auto-start-design, a-blocking-hook-owns-its-runner-and-its-deadline]
source: unified-toon-config
---
# Decision: one `ai-workflow.toon`, schemaVersion 2, Orca nested under `integrations.orca`

## Context
Settings lived in `ai_workflow_env.json`, `.project/orchestration.json` and `.project/skills/modes.json`. The pitch merged them into one root TOON file. The first layout used top-level `engines` and `orchestration` (schemaVersion 1); the owner asked for a nested layout before release, so the shipped schema is version 2.

## Decision
- `integrations.orca` holds `engine`, `enabled`, `multiAgent`, `maxConcurrentWorkers` (1..16), `maxRetriesPerTask` and `coordinators.<vendor>.{workers, roles}`. No alias for the v1 keys; any other version is refused.
- A present but invalid or refused TOON file contributes nothing and never falls back to a legacy file; only a missing file falls back (one minor, `X11_no_remove`).
- `config-migrate.mts` never deletes legacy files, backs up first, verifies in a fresh process, and does NOT convert a v1 file: `--force` replaces it with one built from the legacy files or defaults, keeping a backup.
- `orca-policy` still enforces its own bounds (at most 2 workers per coordinator, first role target only, retries 0..2) until the orca-role-pools pitch.

## Consequences
Pitches 3 and 4 register validators through `registerEngineValidator` / `registerIntegrationValidator`. The local root `ai-workflow.toon` is gitignored, so tests must not depend on it.
