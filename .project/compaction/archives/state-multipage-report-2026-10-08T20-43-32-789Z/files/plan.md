# Plan: state-multipage-report

**Pitch**: pitch.md  •  **Appetite**: big-batch  •  **Hill**: hill.md

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S0 | Enable Orca policy | `.project/orchestration.json` (git-ignored instance file, not counted) | 20 | — | — | no: single config file, coordinator-owned trust decision | — |
| S1 | Snapshot: structure + base/project skills | `ai-framework/scripts/state-structure.mts` (new), `state-snapshot.mts`, `state-snapshot.test.mts` | 450 | S0 | S2 | yes: disjoint files, fixture-defined contract, clear exit | standard |
| S2 | Multipage render + staged atomic write | `ai-framework/scripts/state-pages.mts` (new), `state-render.mts`, `state-html.test.mts` | 650 | S0 | S1 | yes: disjoint files, builds against a hand-written fixture snapshot, clear exit | standard |
| S3 | Docs, skill mirrors, changelog | `ai-framework/integrations/state-report.md`, `.claude/skills/state/SKILL.md`, `.cursor/skills/state/SKILL.md`, `.agents/skills/state/SKILL.md`, `.opencode/commands/state.md`, `ai-framework/templates/project/reports/README.md`, `VERSION`+`CHANGELOG.md` (via `changelog.mts`) | 250 | S1, S2 | — | yes: prose only, disjoint files | fast |

Projected 14 files (cap 15). **LOC checkpoint after S2** (critique A1): if `state-render.mts` + `state-pages.mts` pass ~700 net lines, stop and re-shape rather than add a file.

### Contract between S1 and S2 (so they can run in parallel)

Additive, `schemaVersion` stays `1`. New facts, all `{ value, status, evidence, note? }`:
- `structure.projectType` — `workflow-bundle | web | backend | mobile | ai-prompts | mixed | unknown`
- `structure.tree` — array of `{ path, kind: "dir", role, depth }` facts, ≤500 entries, depth ≤3
- `structure.decisions` — array of `{ path, id, title }` mapping a folder to decision entries
- `skills.base` and `skills.project` — arrays of `{ id, enabled, phases, scope }` facts (existing `skills.installed` stays for old readers)

Missing sections render as `unavailable` pages (old `state.json` still renders).

## Exit criteria per scope (machine-checkable, ≥1 per scope)

### S0 — Enable Orca policy
- `node ai-framework/scripts/orca-preflight.mts report --vendor claude --json` shows `"policyStatus"` other than `"missing"`
- `node ai-framework/scripts/orca-run.mts status --root .` exits 0 or 3 (3 = documented normal-workflow route; record which and why in `deviations.md`)
- `git check-ignore .project/orchestration.json` exits 0 (instance file stays out of version control)
- If status shows Orca is not dispatch-ready (runtime absent, or vendor unproven), S1/S2 run on the normal path; this is recorded, never faked.

### S1 — Snapshot: structure + base/project skills
- `node --test ai-framework/scripts/state-snapshot.test.mts` exit 0, including new tests for: type detection per template (bundle, web, backend, mobile, ai-prompts, mixed, unknown); depth and entry caps; skipped `node_modules`/`.git`/build output; symlink and ancestor-symlink refusal (K1, S2); secret-shaped names omitted; no file contents read (spy on reads); base/project skills split keyed by skill id
- `node ai-framework/scripts/state-snapshot.mts --json` exit 0 and `structure` present
- `grep -c "insideProject\|collect" ai-framework/scripts/state-structure.mts` ≥ 1 (reuses the shared containment check, no second hand-rolled walker; export it from `state-theme.mts` if needed)
- `node --test ai-framework/scripts/pitch-compress*.test.mts` still exit 0 (shared reader regression, per `hardening-a-shared-reader-made-its-writer-destructive`)

### S2 — Multipage render + staged atomic write
- `node --test ai-framework/scripts/state-html.test.mts` exit 0, including: all six pages written as one set; every page script-free with the CSP meta (`! grep -l "<script" .project/reports/*.html`); nav links resolve between pages; graph and metrics links appear only when the target file exists; a `state.json` without the new sections still renders; per-new-section hostile-`state.json` tests go through the shared `list()`/`isFact` guard (S1); staging directory identity pinned and rechecked before rename, concurrent `--apply` refused (S3); macOS realpath comparison in staging tests (K2); per-page byte cap enforced against a hostile large tree
- `node ai-framework/scripts/state-snapshot.mts --apply && node ai-framework/scripts/state-render.mts --apply` exit 0, then `test -f .project/reports/{index,structure,skills,metrics,knowledge,pitches}.html`
- `wc -l ai-framework/scripts/state-render.mts ai-framework/scripts/state-pages.mts` reviewed against the LOC checkpoint

### S3 — Docs, skill mirrors, changelog
- `node ai-framework/scripts/setup-validator.mts` exit 0
- `node ai-framework/scripts/graphify.mts --check` exit 0 after rebuilding with `node ai-framework/scripts/graphify.mts`
- `cmp .claude/skills/state/SKILL.md .cursor/skills/state/SKILL.md` per the mirror check the validator enforces (R4); `.agents` and `.opencode` keep their existing short-form shape
- `grep -c "structure.html\|skills.html\|knowledge.html" ai-framework/integrations/state-report.md` ≥ 3
- `node ai-framework/scripts/changelog.mts` records the entry; `VERSION` bumped

## Risks (inherited from pitch rabbit holes)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| R1 Orca not ready (policy missing; live proof Claude only) | S0 | no | S0 creates the policy and records the real `status` result; fall back to the normal path |
| R2 Name-only type detection misclassifies monorepos | S1 | no | `mixed` lists every detected type; unknown shown as `unknown`, never guessed |
| R3 Page-size growth | S2 | no | per-page byte cap + hostile large-tree test |
| R4 Mirrors drift | S3 | no | validator + `cmp` exit criteria |
| R5 Second walker repeats ancestor-symlink bug; new sections crash render | S1, S2 | no | reuse `insideProject()`/`collect()`; hostile-`state.json` test per new section |
| R6 Staged multi-page write TOCTOU / concurrent apply | S2 | yes, 30 min: confirm `writeAtomic` reuse vs a new staging helper; pattern `pin-directory-identities-across-async-leases` | pin inode/device, recheck before rename, refuse concurrent run |
| A1 LOC tightness | S2 | no | checkpoint above |

## Blast radius (`/impact`, from grep over the repo)

Consumers of the changed modules: `state-snapshot.mts` ← `state-render.mts`, `state-theme.mts`, `skill-defaults.mts`, `skill-registry.mts`, `workflow-doctor.mts`, `runtime/migrate.mts`. Tests: `state-snapshot.test.mts`, `state-html.test.mts`, `state-theme.test.mts`, plus the doctor scaffold check for `.project/reports/README.md`. Run `workflow-doctor` and `skill-registry` tests after S1 and S3.

Rules folded in: `ai-framework/rules/testing.md` (behavior tests, no render-only assertions); `.project/rules/` has no stack companions, so none apply.

## Parallel dispatch plan

- S0 first, by the coordinator (Claude), never a worker.
- S1 and S2 in parallel (disjoint files, contract above). Per `orca-vendors.json`: Claude coordinates, `codex` implements, `opencode` reviews, `maxConcurrentWorkers` 2. Only if S0 shows dispatch-ready; otherwise sequential.
- Coordinator re-measures changed files and reruns each scope's exit commands itself; a worker's own numbers never count. Workers never ship or answer prompts.
- S3 after S1 and S2 land (docs describe the real output).
- Worker briefs state the pitch no-gos verbatim.

## Wireframes (UI scopes only, light)

Report pages are static HTML with a shared nav; no component work, so `/ui-design` is skipped. Fat-marker layout:

```
┌ nav: Overview · Structure · Skills · Metrics · Knowledge · Pitches ┐
│ index:     status chips · project type · cards → each page        │
│ structure: [type badge] tree ── folder ─ role ─ decisions ↗       │
│ skills:    Base (bundle)  |  Project (registry)  — enabled/phases │
│ metrics:   completeness chip · totals · ↗ full token / usage report│
│ knowledge: counts by type · top tags · ↗ graph.html · GRAPH_REPORT │
└────────────────────────────────────────────────────────────────────┘
```

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)
