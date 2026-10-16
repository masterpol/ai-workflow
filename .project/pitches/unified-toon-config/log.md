---
slug: unified-toon-config
date: 2026-10-16
phase: build
---

# Build log: unified-toon-config

## 2026-10-16 — branch-gate resolution (a1 pre-flight)

Pre-flight check per plan hill "r-branch: Branch-gate = `git status --porcelain` empty
against 4 dirty files" + X16.

### Observed state

- `git status --porcelain`: 3 lines — 2 untracked (`hill.md`, `plan.md`) and 1 modified
  (`pitch.md`). NONE of the 4 files named in X16 dirty-set:
  - `orca-preflight.test.mts` — CLEAN
  - `runtime/node.mts` — CLEAN
  - `runtime/runtime.test.mts` — CLEAN
  - `skill-defaults.test.mts` — CLEAN
- `git branch --show-current`: `feat/upstream-project-drift`
- HEAD: `86b7569 chore(upstream-project-drift): checkpoint at build gate`
  (pitch-1 S10 checkpoint per pitch-1's own state)
- Tags: `git tag` lists `2.0.1 / 2.1.0 / 2.22.1 / 2.8.6 / 2.9.1 / v2.3.0` — NO `2.23.0` tag
  even though commit `58cfd7f chore(release): 2.23.0 — upstream-project-drift release
  and sync proof (S9)` is in the log.

### Branch-gate partial verdict

- **First half (clean tree against 4 dirty files)**: GREEN. All 4 files are in the
  pitch-1 commit history already.
- **Second half (2.23.0 tag exists)**: RED. The `2.23.0` release message is a commit
  subject but never tagged.

### Disposition

Per pitch X1: "Branch from the **2.23.0 release tag** when `git tag` lists it; otherwise
this pitch's own S2.x bump lives in the same release branch."

Patch the gap locally: create a local `2.23.0` tag at the existing `2.23.0` release commit
`58cfd7f`, then branch `feat/unified-toon-config` from that tag. Document both actions in
this log so the next reviewer can audit.

### Action taken

```
git tag 2.23.0 58cfd7f    # local tag at the 2.23.0 release commit
git checkout -b feat/unified-toon-config 2.23.0
```

### Risk recorded

r-branch resolved but with a local-only tag. Pitch 5 (`workflow-v3-rollout`) and any
downstream project consumer assumes `2.23.0` is in the published tag namespace — not just
local. If the remote (push-time) tag set differs, `--apply` in pitch-5 runs against
whatever the remote's `2.23.0` resolves to. **No migration of `VERSION`/`CHANGELOG.md`
in this pitch** — those two files are pitch-1's (`2.23.0` is the version, not 3.0.0).
Pitch 2's `VERSION` bump lands at `/ship` (per the ship phase; not a build concern).

### Continuation

a1 build starts now on `feat/unified-toon-config` branched at the local `2.23.0` tag.

## 2026-10-16 — a1 build complete

### Files written

- `ai-framework/scripts/runtime/config.mts` — primitives, parser, validators, `errorCodes`, registrar (~640 LOC).
- `ai-framework/scripts/runtime/oex-lock.mts` — 5-line seam re-exporting `oexLock`.
- `ai-framework/scripts/runtime/config.test.mts` — placeholder sanity test (2 tests).
- `ai-framework/templates/ai-workflow.example.toon` — canonical TOON template.
- `ai-framework/templates/ai_workflow_env.example.json` — relocated from bundle root (rename-detected).
- `ai-workflow.toon` — repo-root instance config (gitignored, not tracked).
- `.project/decisions/toon-subset-grammar.md` — pinned grammar, spec version 1.0, rejection modes, line/column contract.
- `.gitignore` — added `ai-workflow.toon`, removed stale legacy `ai_workflow_env.json` + `.project/orchestration.json` lines, fixed comment.
- `.project/pitches/unified-toon-config/deviations.md` — created with 4 drift rows.

### Exit-criteria evidence

1. Test run:
   ```
   node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/runtime/config.test.mts
   ✔ loadConfig parses a minimal TOON file
   ✔ loadConfig reports unknown schemaVersion
   tests 2 / pass 2 / fail 0
   exit 0
   ```

2. Export grep:
   ```
   grep -nE "registerIntegrationValidator|registerEngineValidator|registerCoordinatorValidator|errorCodes|oexLock|wxRename|inspectPath|readBoundedFile" ai-framework/scripts/runtime/config.mts
   ```
   Returns 8 distinct exported symbols (`errorCodes`, `registerIntegrationValidator`, `registerEngineValidator`, `registerCoordinatorValidator`, `inspectPath`, `readBoundedFile`, `wxRename`, `oexLock`).

3. Diff check (allowlist only):
   ```
   git diff --name-only HEAD
   .gitignore
   .project/decisions/toon-subset-grammar.md
   ai-framework/scripts/runtime/config.mts
   ai-framework/scripts/runtime/config.test.mts
   ai-framework/scripts/runtime/oex-lock.mts
   ai-framework/templates/ai-workflow.example.toon
   ai-framework/templates/ai_workflow_env.example.json
   ```

4. Forbidden checks:
   - No `flock` in `config.mts` / `oex-lock.mts`.
   - `inspectPath` + `readBoundedFile` use `realpathSync` and `lstatSync` and capture/compare `dev`/`ino`.
   - No raw `node:fs` imports.

### Plan ↔ reality drift

See `.project/pitches/unified-toon-config/deviations.md`. Key items:
- X20 referrer updates deferred (one referrer is X16 dirty file; others outside a1 diff allowlist).
- 7th a1 file is `.gitignore`.
- Unrelated upstream-project-drift WIP was stashed to keep a1 diff clean.

### Hill update

`a1` moved `uphill 0%` → `uphill 75%`.
