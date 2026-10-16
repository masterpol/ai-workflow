# Pitch: unified-toon-config

**Date**: 2026-10-16  •  **Appetite**: big-batch
**Stack**: workflow-tooling (TypeScript runtime, doctor, bundle-sync, docs)
**Epic**: `workflow-v3` — pitch 2 of 5. Depends on `upstream-project-drift`. Target version: 3.0.0.

## Problem

A project owner configures the workflow across four files in three places (`ai_workflow_env.json`,
`.project/orchestration.json`, `.project/workflow-doctor.json`, `.project/skills/modes.json`). Nobody knows
which file holds which switch, and each format change means editing every project by hand.

## Knowledge consulted

- [patterns/resolve-config-only-from-trusted-root] — applies: read config only from the trusted project root.
- [patterns/parse-untrusted-values-and-re-emit-them] — applies: strict grammar, reject (never sanitize),
  write the file back from the parsed model.
- [decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers] — constrains: instance data
  stays local; bundle-sync must never overwrite the project's config.
- [issues/a-local-workflow-env-file-changes-which-runner-path-tests-spawn] — applies: process env still beats
  the file; tests pin the runner.
- [patterns/a-thin-cli-keeps-every-guard-in-the-library] — applies: the migrator CLI is a thin wrapper.
- Existing reader `ai-framework/scripts/runtime/env.mts` already enforces: regular file, ≤64 KiB, realpath
  inside root, allowlisted keys. Reuse those guards; do not write a second reader.

## Owner decisions (2026-10-16)

- One TOON file at the project root holds all four sources.
- Legacy files: migrator writes TOON, backs originals up under `.project/records/config-migration/`,
  deletes them. Readers warn on leftover legacy files for one minor version, then ignore them.
- `.project/skills/registry.json`, `lock.json`, `transaction.json` stay as machine state (not config).

## Solution sketch (breadboard)

**Places**: `ai-workflow.toon` (project root); `ai-framework/templates/ai-workflow.example.toon`;
`ai-framework/scripts/runtime/config.mts` (parse + validate + typed model); `ai-framework/scripts/config-migrate.mts`
(CLI); every current reader of the four files; `workflow-doctor`; `bundle-sync` exclusions; docs.

**Shape of the file** (illustrative; exact keys fixed in /plan):

```toon
schemaVersion: 1
runtime:
  runner: bun                # was AI_WORKFLOW_RUNNER
engines:
  orca: ">=1.4.224"          # package.json naming; parsed by orca-engines-range
orchestration:
  multiAgent: true           # was AI_WORKFLOW_ORCA_MULTI_AGENT
  enabled: true              # was use-orca-orchestration
  maxConcurrentWorkers: 3
  maxRetriesPerTask: 1
  coordinators:
    claude:
      roles:
        implementation[1]: opencode
        review[1]: codex
doctor:
  modelRouting: project
skills:
  modes:
    caveman: full
integrations:
  orca:
    cliCommand: orca
  notion:
    enabled: false
```

**Affordances**:
- `config.mts`: `loadConfig(root)` → typed model or a list of problems; env vars (`AI_WORKFLOW_RUNNER`,
  `AI_WORKFLOW_ORCA_MULTI_AGENT`) still override their keys.
- `config-migrate.mts`: `--dry-run` (default) prints the TOON it would write; `--apply` writes, backs up,
  deletes legacy files. Idempotent. Refuses when TOON already exists and differs, unless `--force`.
- Schema migrations: `schemaVersion` + an ordered list of `vN → vN+1` functions in the library, so 3.x → 4.x
  is a code step, not a manual edit.
- Writer: re-emits canonical TOON from the model (comments in the example template only).
- Doctor: config check (missing / valid / invalid with reasons / legacy-files-present → run migrator).
- bundle-sync: `ai-workflow.toon` is instance data; never synced, never overwritten.
- `integrations` section: open map per integration, each with its own validator; unknown integration keys
  are reported, not used.

**Connections**: legacy files → migrator → `ai-workflow.toon` → `loadConfig` → (runner select, orca policy,
launch gate, doctor, skill-defaults, state-snapshot, token-consumption hook).

## Rabbit holes

**Resolved here**:
- TOON parser source → strict in-repo subset parser + writer. The bundle has no `package.json` and ships into
  projects without install, so no npm dependency. Subset: objects by indentation, scalars (string, number,
  boolean, null), quoted strings, inline primitive arrays `key[N]: a,b`. No tabular arrays unless /plan needs
  them. Reject anything else with line/column.
- Env override precedence → process env > TOON > defaults (same as today).
- Where `engines.orca` lives → in this file; parsing its range is pitch 3. Here it is stored as a string.

**Pushed to /plan as risk** (owner: planner):
- Merge `AI_WORKFLOW_ORCA_MULTI_AGENT` and `use-orca-orchestration` into one switch, or keep both? Today both
  must be true. Recommend: keep both keys this version, document the AND.
- Count every reader of the four files (base grep: `orca-policy`, `orca-launch-gate`, `runtime/env`,
  `runtime/select`, `skill-defaults`, `state-snapshot`, `workflow-doctor`, `orca-eval-grader`,
  `token-consumption` hook, `.claude/skills/build/SKILL.md`, plus test fixtures). May push past 15 files;
  split readers vs migrator if so.
- TOON spec drift: pin the TOON spec version the subset follows and record it in the decision.

**Pushed to no-go**:
- Role arrays and higher worker cap → `orca-role-pools` (schema here allows arrays; behavior there).
- Version-range semantics → `orca-engines-range`.

## No-gos (this pitch)

- ✗ No YAML/JSON5/TOML alternative; TOON only.
- ✗ No secrets in the file; `.env` is never read.
- ✗ No auto-migration on read; migration runs only through the CLI (or `/setup` calling it).
- ✗ Standing workflow-tooling no-gos apply.

## Critique findings

(Empty until /critique runs.)

## Bet decision

☐ **Bet** (→ /plan)
☐ Re-shape — named gap: {…}
☐ Pass — reason: {…}
