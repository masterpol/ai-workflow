# Rollout readiness: workflow-v3-rollout

**Date**: 2026-10-17  •  **Bundle**: 2.30.0 (`5726b3a` + the portability fixes below)  •  **Method**: dry run on
scratch copies of LAH `bfb81b6`, RN `48a721d`, climbing-lab-monorepo `02a2f91` (no `node_modules`, no `.env*`,
`settings.local.json` or `credentials.json`). The three real projects were verified untouched afterwards (HEAD,
`git status --ignored` and hashes of the config and hook files identical before and after).

Each copy ran: own 2.22.5 `bundle-sync` dry run + `--apply --prune`, the delivered sync's dry run + apply, a
no-op third pass, `config-migrate --dry-run` + `--apply`, then doctor, setup-validator, graphify, skill-sync,
Orca policy/preflight/start (readiness only) and the full workflow test suite under Node and Bun.

## Results

| | LAH | climbing | RN |
|---|---|---|---|
| Sync conflicts / kept local | 13 / 0 | 159 / 39 | 143 / 33 |
| Conflicts byte-equal to an old bundle version | 5 | 20 | 7 |
| Conflicts that are real local edits | 8 (all superseded by `orca-engines-range`) | 139 (systematic: "inherit the active model" policy across agents, skills and mirrors) | 136 (mostly `bun ai-framework/...` wording; rule rewrites) |
| Kept-local edits that differ only in runner wording | 0 | 0 | 23 of 33 |
| `config-migrate` | clean (runner `bun`) | clean (runner `node`) | clean (runner `bun`) |
| Hook groups added by the sync | Orca start (Claude, Codex) | Orca start (Claude, Codex) | none (already wired by hand) |
| After resolving (take upstream) + project fixes: doctor / validator | READY / READY | READY / READY | READY / READY |
| Full suite Node / Bun (fail) | 1 flake / 0 | 1 artifact / 1 artifact | 1 flake / 0 |

"Flake": token-consumption tests intermittently see the metrics lock held (1 in ~12 isolated runs); pre-existing.
"Artifact": climbing's add-skill route test reads `harnesses.md`, which the simulation replaced with upstream; a real
merge keeps climbing's `openai/gpt-5.6-terra` routes and the test passes.

## Per-project steps for the PR

- **LAH (ready now)**: take upstream for all 13 conflicts; `config-migrate --apply`; merge the 5 flagged files.
- **RN**: take upstream for the 7 stale and the 23 runner-only local edits (the runner now comes from
  `ai-workflow.toon`); move the rule rewrites (`ai-framework/rules/*`, 7 files kept local + rule conflicts) into
  `.project/rules/` per the drift ledger; **rewire the Orca start hooks** in `.claude/settings.json` and
  `.codex/hooks.json` from `bun "..."` to the canonical `AI_WORKFLOW_RUNNER=node node --experimental-strip-types ...`
  form (a missing Bun would otherwise skip the readiness gate; the doctor fails the Codex one, the Claude one is not
  checked — see followups).
- **climbing**: decide once on the "inherit the active model" policy. Upstream now carries it as `profile:`
  frontmatter plus `doctor.modelRouting: project`, so the agent/skill conflicts can take upstream and the OpenCode
  and Codex routes stay project-owned. Keep `harnesses.md`'s project routes. Add `profile:` to the project's own
  `e2e-runner` and `tdd-guide` agents and copy their Cursor mirrors. Review the ~30 rule/doc/script edits by hand.
- **lasallenorandi**: out of scope. No sync marker, JavaScript-era bundle, and its directory has no repository of
  its own (the parent `~/Documents` is an empty git repo). Needs a fresh install, not a sync.

## Bundle fixes found by this run (applied)

- `graphify.mts` singularised `entities/` as `entitie`, warning on every entity entry (climbing had patched it locally).
- Tests that only hold in the bundle repo now skip or adapt in an install: the Orca grader dataset tests, the
  `opencode.json` contract test, the exact 16-agent count, and the toon Orca-policy doctor test (host-owned skill
  wrappers and a host routing file no longer leak into its fixture).

## Resolved after this run (2026-10-17, same day)

- `doctor.modelRouting` is now authoritative: the doctor reads it from `ai-workflow.toon` (legacy
  `.project/workflow-doctor.json` only without a toon), the reader rejects values other than `bundle`/`project`, and
  `config-migrate` carries the legacy file's value (default `bundle`, the old doctor default). Re-migrated copies:
  LAH and RN `bundle` (enforced, doctor READY), climbing `project` (from its legacy file). **A toon written by the
  2.30.x migrator says `project` regardless; re-run `config-migrate --apply --force` (it backs the old toon up) or set
  the value by hand in each project.**
- Graph hooks: `graphify.mts setup` installs overlay-aware post-commit/post-checkout hooks and replaces Graphify's raw
  blocks in place; the doctor warns while a raw block remains. All three copies migrated by `setup`, doctor READY.
- The doctor now checks the Claude Orca start hooks too ("Claude startup wiring"); RN's original bun-wired hooks fail it.

## Still open (flagged)

- `skill-vendors cursor-mirrors --apply` does not refresh mirrors of project-added agents.
- token-consumption tests flake on a held metrics lock.

## Rollout step added

After `config-migrate --apply`, run `node ai-framework/scripts/graphify.mts setup` in each project to replace the raw
Graphify hooks.
