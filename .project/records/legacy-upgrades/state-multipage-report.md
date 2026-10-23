# State multipage report: retained source detail

This supplement preserves decisions, audit evidence and historical corrections from the 2026-10-08 big-batch pitch. The [ship record](../../runs/2026-10-08-state-multipage-report.md) is tracked and byte-identical to the cached SHIPPED.md. Its eight sections retain the shipped implementation, scope counts, constraints, rabbit-hole resolutions, deviations, verification, extracted knowledge and followups. These are historical results, not a claim that today's checkout has been reverified.

## Historical corrections and limits

The live done-work narrative agrees with the final sources on v2.19.1, seven pages, additive schemaVersion 1, three audit cycles, real Orca participation in cycles 2 and 3, and final Node/Bun pass counts. Its marker-only replacement summary omits the one-time legacy unmarked-page exception recorded in the [ownership pattern](../../knowledge/patterns/a-report-never-overwrites-a-file-it-did-not-write.md). Its staging description must not imply a fully transactional filesystem swap: audit cycle 1 changed misleading “nothing was replaced” output to “N of M”; path-based renames retain an accepted race window.

The pitch proposed removing stale marked HTML. Audit cycle 1 demonstrated that public markers are not deletion authority, so final behavior deletes nothing in the shared directory. Cycle 2 additionally prohibited replacement of unmarked files even when they have generated-set names. The stale .state-stage lock survives a crash and needs manual removal. Pinning device/inode and refusing concurrent runs reduce exposure; Node's missing openat leaves a race against a local process with write access.

The pitch/plan's Orca fallback on dispatchReady was historically wrong. The first deviation blamed an absent Orca terminal; the next blamed ORCA_AGENT_SESSION_ID. The final correction says evaluateLaunch allowed both vendors all along. The [launch-authority issue](../../knowledge/issues/status-dispatch-ready-false-is-not-launch-authority.md) preserves the final rule: use the per-worker launch gate, stop and ask on denial, never silently fall back. The last deviation still says vendor completion is unproven; the later build-log smoke records and real audit cycles supersede that temporal caveat. Preserve both as sequence, not simultaneous claims.

Hill/log records say v2.19.0; the corrected ship record says v2.19.1. Planned source sizes and test counts grew through fixes: render/page net growth moved from about 180 to about 230 lines, and HTML tests from 53 to 65 to 70; snapshot tests moved from 66 to 76 to 82. These are checkpoints, not conflicting final totals. The plan projected 14 files within a 15-file cap; the added export-key test brought the documented count to 15. The pitch said five vendor mirrors should be identical, while the plan explicitly retained short-form agents/OpenCode adapters and used cmp on Claude/Cursor. Final SHIPPED counts four skill mirrors. Do not infer a live-host verification claim from those filesystem checks.

The knowledge-page top-tags/recent-decisions sketch did not ship in full; audit cycle 1 deferred it, and grouping repeated folder decisions by decision was deferred too. Per-type folder roles stayed minimal rather than labeling unknown directories. Decisions map to at most three folders; base-skill phases are not read. Only names inform project type; mixed lists all detected types. An old snapshot without additive sections renders unavailable pages. Graph/metrics links are conditional and those reports are not rebuilt.

## Followups and later drift

At ship, deferred items were metadata walkers lacking ancestor containment (F4), reports-directory mkdir before ancestor validation (F6), directory enumeration before visit caps (F9), collect refusing outside-project report paths, idle terminals retaining slots until worker-release, PATH-empty tests needing runner pinning, intermittent token-consumption timing failures, and the separately shaped orca-auto-start-all-phases pitch. Also retain cycle-1 deferred grouping and knowledge-page content noted above. These remain historical deferrals rather than newly asserted current bugs.

Against ship commit 1db913a2bc2a7fbcd97c358984916ee21097422d, all seven bound durable files except _followups.md are unchanged. That backlog has +218/-2 lines. Its own state-report runner item is now struck through with a 2026-10-17 host-runner-pinning resolution; the rest of this pitch's section remains present. Preserve that later resolution while retaining the historical unresolved flag on the [runner issue](../../knowledge/issues/a-local-workflow-env-file-changes-which-runner-path-tests-spawn.md). Other additions and the other removed line belong to later work. No backlog or archived pitch is used as a durable mapping destination.

## Pitch decisions and constraints

The complete retained pitch below includes the original breadboard, bounded scan contract, critique dispositions, no-gos and initial Orca assumptions. Its prospective promises are historical; the corrections above and final ship record distinguish what actually shipped.


**Date**: 2026-10-08  •  **Appetite**: big-batch (≤15 files)
**Stack**: backend (Node `.mts` tooling, static HTML output)

## Problem

Someone running `/state` gets one long page of fact tables. They cannot see how the project is laid out,
which skills are bundle-provided versus project-installed, where the knowledge graph and token metrics live,
or which recorded decisions shaped which folders. The data exists in separate generated files
(`graphify-out/graph.html`, `.project/metrics/*.html`, `registry.json`) but `/state` never connects them.

## Knowledge consulted

- [decisions/project-state-report-design] — constrains: facts carry a status and evidence; HTML is inert (no scripts, no external loads, CSP `default-src 'none'`); theme parsed and re-emitted; `state-render` reads `state.json` from disk; report never edits `status.md`/`runs/`. Every new page inherits all of it.
- [patterns/a-report-over-an-untrusted-tree-runs-only-bundle-code] — applies: the folder scan and project-type detection must never execute or import project code.
- [patterns/parse-untrusted-values-and-re-emit-them] — applies: directory names and registry fields are untrusted; re-emit through the allow-listed escaper.
- [patterns/allow-list-untrusted-labels-at-ingest-and-at-render] — applies: folder labels and skill names get allow-listed at both ends.
- [patterns/display-buckets-are-not-lifecycle-identities] — applies: "base" versus "project" skills is a display bucket, not an identity; key by skill id.
- [issues/hardening-a-shared-reader-made-its-writer-destructive] — warns: any change to a shared reader (`readMarkdown`, `inventory()`) needs the writer's tests rerun.
- [patterns/checks-on-doc-structure-name-the-owning-file] and [issues/editing-a-canonical-file-alone-breaks-the-byte-identity-mirror-check] — the `/state` skill and its mirrors (`.agents/`, `.opencode/`, `.cursor/`, `.codex/`) must change together.
- `ai-framework/integrations/orca-vendors.md` — constrains Orca use: opt-in policy file, workers never ship, completion counted only from the attempt's own `worker_done`.
- Existing generated assets to link, not rebuild: `graphify-out/graph.html`, `graphify-out/GRAPH_REPORT.md`, `.project/metrics/token-consumption.html`, `.project/metrics/workflow-usage.html`.

## Solution sketch (breadboard, NOT wireframe)

**Places** (all static files written to `.project/reports/`, one shared stylesheet and nav):

| Place | Contents |
|---|---|
| `index.html` | Status summary, detected project type, one card per page, direct links to the graph and metrics |
| `structure.html` | Folder-structure diagram (inline SVG or nested CSS, no script) annotated with each folder's role and the recorded decisions that touch it |
| `skills.html` | Two groups: **base skills** shipped by the bundle (`.claude/skills/`) and **project skills** from `.project/skills/registry.json`, each with enabled state and phases |
| `metrics.html` | Token snapshot summary with its `measured`/`partial`/`unavailable` status, plus links to the full token and workflow-usage reports |
| `knowledge.html` | Entry counts by type, top tags, recent decisions, link to `graphify-out/graph.html` and `GRAPH_REPORT.md` |
| `pitches.html` | Active, shipped and compacted pitches (what the current page shows today) |

**Affordances per place**: the shared nav bar; evidence-path links (same `safeEvidencePath` rule as today);
status chips (observed / proposed / stale / unavailable / unconfigured); in `structure.html`, a folder node
links to its decisions and to the owning skill or rule file when one exists.

**Connections**: `state-snapshot --apply` writes `state.json` (gains `structure` and `skills.base`/`skills.project`
sections); `state-render --apply` reads it and writes all pages atomically as one set; pages link to each
other and out to the existing graph/metrics HTML by relative path, only if the target file exists.

**Backend operation sequence**
1. `state-snapshot.mts`: bounded directory scan (depth ≤3, names only, skip `node_modules`/`.git`/build output/symlinks/secret-shaped names, ≤500 entries) → `structure` section with detected project type.
2. Project-type detection from manifest *file names present* (`package.json`, `pyproject.toml`, `ios/`, `android/`, `lib/ai/prompts/`, `ai-framework/`) → one of `workflow-bundle`, `web`, `backend`, `mobile`, `ai-prompts`, `mixed`, `unknown`. Names only; no manifest contents read.
3. Type selects the diagram template: which folders are expected, their role labels, and which decision/rule sources annotate them.
4. Skills split: base = directory listing of the bundle's skills; project = `registry.json`; both already partly read by the snapshot.
5. `state-render.mts`: page functions share one layout; the set writes via a staging directory then renames, so a failed render never leaves half a report.
6. `/state` SKILL.md and `state-report.md` updated; mirrors synced.

**Orchestration (Orca)**: build scopes are marked for parallel alternate-vendor dispatch where independent
(snapshot sections vs. page renderers vs. docs/mirrors). See rabbit hole R1: Orca is not ready on this checkout today.

## Rabbit holes

**Resolved here** (with answer):
- Schema compatibility → resolution: additive sections only; `schemaVersion` stays `1`, the renderer treats missing new sections as `unavailable` pages, so old `state.json` files still render.
- Links to non-inert pages (`graph.html` contains scripts) → resolution: `state.html` pages stay script-free and only *link* to it; the link is shown only when the file exists inside the project and passes the existing path checks. The graph page's own safety is not this pitch's concern.
- "Different decisions depending on the project" → resolution: interpreted as (a) per-project-type diagram templates and (b) decision entries from `.project/knowledge/decisions/` and `.project/design/decisions/` attached to the folders their evidence paths touch. Confirm this reading at the bet gate.
- Multi-page atomicity → resolution: stage into a temp dir under `.project/reports/` and rename; stale pages from an earlier run are removed only if they carry the generator marker.

**Pushed to /plan as risk** (with named owner):
- R1: Orca is not usable here yet. `ai_workflow_env.json` sets the switch to `true`, but `.project/orchestration.json` is missing (`policy-missing`, route `normal`), and the only candidate, `ai-framework/integrations/orca-vendors.json`, is untracked. Plan scope S0 must create the opted-in policy (instance file, git-ignored) and run `orca-run.mts status` before any dispatch; Orca live proof exists for Claude only.
- R2: Project-type detection from names alone will misclassify monorepos; plan decides whether `mixed` lists each detected type or just flags it.
- R3: Page-count growth versus the 64 KB/size bounds; plan sets a per-page byte cap and tests it with a hostile large tree.
- R4: The `.codex`/`.cursor`/`.opencode`/`.agents` mirror of `/state` must stay byte-identical; plan lists them explicitly.
- R5 (from K1, S1, S2): the folder scan reuses the existing `insideProject()`/`collect()` containment checks and the symlink-refusal rules in `patterns/sync-tools-refuse-symlinks-in-source-and-destination`; no second hand-rolled walker. Every new page reads its section through the shared `list()`/`isFact` guard, with a hostile-`state.json` test per new section.
- R6 (from S3): the staged multi-page write pins the staging directory's identity and rechecks it before the final rename; plan defines what a concurrent `--apply` does (refuse, not overwrite). Tests on macOS compare realpaths (K2).

**Pushed to no-go** (deferred):
- Live deployment or database inspection; client-side interactivity in the report.

## No-gos (this pitch)

- ✗ Any script, external load or network call in the generated pages.
- ✗ Reading file contents of project manifests, source files or secret-shaped files for structure detection.
- ✗ Rebuilding or restyling the knowledge graph or the token-metrics reports; link to them only.
- ✗ Editing `.project/status.md` or `.project/runs/` from the report.
- ✗ Running any project-supplied script during the scan.
- ✗ Letting a worker vendor ship, answer trust prompts, or approve gates.
- ✗ Wiring `/state` into `/pitch-compress`.

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

Run 2026-10-08 as normal subagents (Orca route was `normal`: policy missing). Advisory, not gating.

| ID | Perspective | Severity | Type | Suggestion | Disposition |
|----|-------------|----------|------|------------|-------------|
| K1 | knowledge-historian | high | missed-knowledge | `patterns/sync-tools-refuse-symlinks-in-source-and-destination` gives the symlink-refusal rules the folder scan needs | Address: added to R5 |
| K2 | knowledge-historian | medium | missed-knowledge | `issues/macos-tmpdir-realpath-alias-breaks-path-assertions`: staging-dir tests on macOS must compare realpaths | Address: added to R3 note |
| S1 | skeptic | high | rabbit-hole | New `structure`/`skills.base`/`skills.project` consumers must go through the existing `list()`/`isFact` shape guard, or a hostile `state.json` crashes the whole render again | Address: R5 |
| S2 | skeptic | high | rabbit-hole | A depth-3 walker repeats the ancestor-symlink bug unless it reuses `insideProject()`/`collect()` rather than a hand-rolled walker | Address: R5 |
| S3 | skeptic | high | rabbit-hole | Multi-page staged write spans several awaits; pin the staging directory identity (inode/device) and recheck before the final rename; define concurrent `--apply` behavior (`pin-directory-identities-across-async-leases`, `metrics-ancestor-swap-during-async-lease`) | Address: R6 |
| A1 | appetite-auditor | medium | borderline | Projected 10 files, about 1,400 LOC against a 15-file / 1,500-LOC cap; `state-render.mts` (+~400 LOC) is the overrun risk | Acknowledge: plan sets a LOC checkpoint after S2; split pages into a second module if exceeded |
| A2 | appetite-auditor | info | file-list | Five `/state` skill mirrors must stay byte-identical | Already R4 |
| A3 | appetite-auditor | info | scope-clarity | Tests must prove old `state.json` (no new sections) still renders | Already resolved-here; becomes an exit criterion |

## Bet decision

☑ **Bet** (→ /plan) — approved 2026-10-08. Critique findings K1/K2/S1-S3 addressed (R5, R6); A1 acknowledged (LOC checkpoint after S2). Reading of "decisions depending on the project" and Orca policy-file-first scope accepted as proposed.  
☐ Re-shape — named gap: {which rabbit hole un-resolved? which critique finding?}  
☐ Pass — moved to `.project/pitches/_parked/{slug}/`; reason: {…}

## Plan contract and verification design

The plan below retains the parallel S1/S2 fact contract, exit criteria, impact consumers, LOC checkpoint and orchestration assumptions. Its dispatchReady fallback is superseded by the correction above. Staging did not ultimately provide an all-or-nothing multi-file rename.


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

## Audit cycle 1


Dispatched: code (1, sonnet, independent: no) | security (1, opus, independent: no) | test-coverage (1, sonnet, independent: no) | ux (1, sonnet, independent: no) | eval (n/a: no prompts) | i18n (n/a) | cross-pitch (n/a: one active pitch)
Independence: `no` for every role — no canary was planted in the scratch copy, so none can claim `independent: yes` under the reviewer contract. Reviewers ran in a scratch copy; `review-bench guard check` after the dispatch: `clean: true`, `changed: []` (read-only: verified by guard snapshot/check). Cross-file interactions: reviewed by code and security; test-coverage reviewer ran two suites only; UX reviewer did not open index.html or pitches.html and rendered nothing in a browser.

## Must-fix (blocks /ship)
| ID | Source | File | Issue | Verified |
|----|--------|------|-------|----------|
| M1 | security | state-render.mts:38 `esc` (+ pages) | A `state.json` field `{"toString":1}` makes `String()` throw; the whole render fails and writes nothing, violating "hostile state.json degrades one section" (R5/S1) | yes: my run with skills.base[0].value.id = {"toString":1} → `state-render: No default value`, exit nonzero |
| M2 | security | state-pages.mts:159-163 | Stale-page cleanup deletes any `*.html` carrying the public marker, including a user's own file | yes: my run, `team-notes.html` with the marker was gone after `--apply` |
| M3 | test-coverage | state-snapshot.test.mts:767 | Symlink/ancestor-symlink scan test passes with all three guards removed (`Dirent.isDirectory()` is already false for links): R5/K1 mitigation untested | reviewer mutation run (66/66 green with guards removed); not re-run by me → fixed by adding the test and re-mutating |
| M4 | code | state-pages.mts:139-150 | 512 KB cap not honoured: pitches/decisions/evidence not bounded by `limit`; PoC gave 1.06 MB structure.html and 1.17 MB pitches.html, written anyway; contradicts state-report.md | reviewer PoC; contract text read by me |
| M5 | ux | structure.html | Tree is a wall (134 of ~150 roles "unclassified", no collapse) | yes: grep count 134 "unclassified", 0 `<details>` |

## Should-fix (fix this pass)
| ID | Source | Issue | Disposition |
|----|--------|-------|-------------|
| S1 | code | `insideProject` `startsWith("..")` drops real dirs named `..foo`; shared with theme/settings | fix (line read by me: confirmed) |
| S2 | security | `writeSet` rethrows raw fs errors with absolute paths | fix |
| S3 | code+security | "nothing was replaced" false after first rename | fix wording to "N of M" |
| S4 | security | `name`/readme title unbounded; `generatedAt` escaped twice | fix |
| S5 | ux | skills tables side by side, no h3; nav tap target; `tr:target`; metrics partial lead; links buried / silently omitted when missing; narrow-screen tree indent | fix |
| S6 | test | MAX_VISITED, decision caps, hostile tree path assertion, byte cap via render --apply | fix (tests) |

## Acknowledged → log.md
Check-then-use race on path (Node has no openat); folder names not allow-listed at ingest (render allow-lists, XSS probe passed); unbounded read of `*.html` in stale loop (moot once deletion is removed); decisions table repeats a decision per folder (defer: group by decision); knowledge page lacks "top tags/recent decisions" from the pitch sketch (defer → followup); `.ssh`/`.aws` dir names listed (names only).

## False positives
None refuted. UX reviewer's "must-fix" labels re-tiered by me; its `.status-inferred` remark has no matching status in the snapshot contract.

## Fixes applied (coordinator re-ran every check)
- M1: `{"toString":1}` in skills.base id and structure role → 7 of 7 pages written, exit 0 (before: "No default value", nothing written).
- M2: user `team-notes.html` carrying the marker survives a rewriting `--apply` (before: deleted).
- M3: author's mutation table accepted as author-run evidence (not independent); two guards are redundant by construction (stated by author). Cycle 2 reviewer to re-mutate.
- M4/M5/S1-S6: state-snapshot 76/76, state-html 65/65, state-theme 18/18, pitch-compress 48/48, workflow-doctor 6 pass 1 skipped, skill-registry 16/16, skill-defaults 27/27. Rendered pages: 1 `<details>`, 0 "unclassified", no `<script`.
- Guard check vs pre-audit snapshot lists exactly the fixed files plus this record: no unexpected writes.
Open: cycle 2 re-review (security + test-coverage) not yet run; Orca dispatch for it pending the user's decision.

## Audit cycle 2


Dispatched via Orca (coordinator claude): security (1, codex worker, independent: yes) | test-coverage (1, opencode worker, independent: yes) | code, ux, eval, i18n, cross-pitch (not re-dispatched: cycle-1 findings in those areas were fixed and re-verified; no new surface)
Independence: both workers were fresh dispatches (no resume, no earlier findings in the brief). A canary was planted in the scratch copy only (the `isSecretName` call removed from the folder scan, state-structure.mts:108, which breaks one scratch test). Codex named the unused secret-name predicate (F2, cited :111, within 3 lines of the plant); OpenCode ran the tests, saw exactly that one failure and named the same cause: canary caught by both. Read-only: verified by `review-bench guard check` (clean, no changes) against a snapshot taken before dispatch, and workers were pointed at a scratch copy outside the project. Model family: differs from the author (Codex gpt-6.1-sol, OpenCode via Kimi K2.7 Code). Cross-file interactions: reviewed by security; test-coverage reviewer ran two suites only.
Orca notes: a worker shares the coordinator's checkout (`worktree reused`), so read-only was enforced by prompt + guard, not by isolation. `collect` refused Codex's first report (`invalid-files`) because it listed a report path outside the project; the slot was freed by `worker-release` (closes the idle terminal), then Orca reported exited+settled and the ledger was set to `settled` through the library transition. OpenCode's second brief forbade file lists and `collect` accepted it.

## Must-fix (blocks /ship)
| ID | Source | File | Issue | Verified |
|----|--------|------|-------|----------|
| M1 | security F1 | state-pages.mts:193 | A user's own `.project/reports/index.html` (or any generated-set name) is replaced with no ownership check | yes: my run with a hand-written index.html, content gone after `--apply` |
| M2 | security F7 | state-snapshot.mts:406 `facts()` / render value() | A deeply nested `state.json` (20,000 levels) overflows the stack: the whole render fails with a raw "Maximum call stack size exceeded." | yes: my run |

## Should-fix
| ID | Source | Issue | Disposition |
|----|--------|-------|-------------|
| S1 | security F2 (real part) | Decision source file names and base-skill directory names are not checked with `isSecretName`; the tree filter is (the tree part of F2 was the planted canary) | fix: one shared secret-name policy |
| S2 | security F3 | Evidence links test only the last path component; `.env.d/readme.md`, `credentials/store.md`, `secret.md`, `*.jks` are linkable | fix with the same shared policy |
| S3 | security F10 | Raw fs errors from source reads/atomic writes still reach CLI output with absolute paths | fix: code-only text |
| S4 | security F8 | `state.html` bypasses the 512 KB cap | fix or document with a test |
| S5 | test-coverage | 4 tests can pass for the wrong reason (installedVersion "intact" proxy; overwrite-of-generated-page not asserted; "unavailable" word only; per-file decision failure injected at helper level) | fix |
| S6 | test-coverage | Untested branches: frontend/backend detection, `--json` CLI, `value()` depth cap, per-file decision failure, base-skill cap | add tests |

## Acknowledged → log.md / followups
- F5 (path-based operations keep a race window after identity checks): Node has no `openat`; local-process attacker with write access only; residual accepted and written into state-report.md.
- F4 (snapshot metadata walkers lack ancestor containment): pre-existing code outside this pitch's diff; followup.
- F6 (mkdir before destination validation), F9 (directory enumeration work not capped before the visit cap): local cost only; followup.

## Audit cycle 3


Dispatched via Orca (coordinator claude): security re-review (1, opencode worker, independent: yes). Narrowed to the area that changed in cycle 2 (ownership rule, depth/error bounds, shared secret policy, page caps); code/ux/test reviewers not re-dispatched: their cycle-2 items were verified by the coordinator (all 7 suites rerun green) and no new surface was added.
Independence: fresh dispatch, no earlier findings in the brief. Canary planted in the scratch copy only: the ownership check `&& !existing?.includes(GENERATOR_MARKER)` removed at state-pages.mts:184, which fails 2 scratch tests. The worker cited state-pages.mts:184 and listed both failing tests: canary caught. Read-only: verified by `review-bench guard check` (clean, no changes). Different vendor model from the author. Cross-file interactions: the brief covered all four modules; not separately attested.

## Worker result (data, quoted and bounded)
Counts 70 tests (68 pass, 2 fail) in the scratch copy and 82/82 snapshot; checklist items 2, 3, 5, 6 PASS; item 1 FAIL at state-pages.mts:184 (+ rename race at :199); item 4 FAIL at state-html.test.mts:902 (pitches cap).

## Verification by the coordinator (before triage)
- Item 1 FAIL = the planted canary (:184). The rename race at :199 is the known accepted residual (Node has no `openat`), already documented in state-report.md by the cycle-2 fix.
- Item 4 FAIL = side effect of the canary: the two failing scratch tests are "--apply only overwrites generated pages…" and "the 512 KB cap holds through render --apply"; on the real tree the same file passes 70/70 (`node --test state-html.test.mts`). A hostile 4 MB state.json is refused at read with fixed text ("too large to read"), so the cap test's input class is bounded earlier.
- Real-code reruns: state-snapshot 82/82, state-html 70/70, state-theme 18/18, pitch-compress 48/48, workflow-doctor 6 pass + 1 skipped, skill-registry 16/16, skill-defaults 27/27.

## Must-fix
None. Cycle 2's M1 (user file overwritten) and M2 (deep-nesting crash) reproduced fixed on the real code: user `index.html` kept and named in output; 20,000-level state.json renders without a crash.

## Acknowledged → log.md / followups
Path-based race window after identity checks (documented); F4 snapshot metadata walkers' ancestor containment (pre-existing, followup); F6 mkdir-before-validation and F9 uncapped directory enumeration (local cost, followup).

## Gate
Zero must-fix after 3 cycles (cap for big-batch). Options: Approve → /ship / Revise / Back to /build / Stop.

## Deviations and correction sequence


## 2026-10-08 — S0: Orca policy valid, dispatch not ready
`.project/orchestration.json` created (copy of `ai-framework/integrations/orca-vendors.json`, git-ignored). `orca-run.mts status --root .` exit 0:
policy `valid`, `eligible: true`, codex + opencode binaries present, but `dispatchReady: false` (`runtime-not-probed`; with `--probe`: `caller-unverified`, because this
session is not launched from inside an Orca terminal). Route is `normal`. Per plan, S1/S2 do not use Orca worker dispatch; they run as harness subagents
(disjoint files, same contract). No worker launched, nothing faked.

## 2026-10-08 — S1 touched `state-theme.test.mts` (1 line)
Export-key pin test needed `insideProject` after it was exported for reuse. Plan listed `state-theme.mts` only implicitly; acceptable, files count 15 with the test.

## 2026-10-08 — stale `.state-stage` blocks --apply
Stage dir doubles as lock; a crash leaves it until removed by hand (error says so). Accepted by design.

## 2026-10-08 — correction to the S0 entry
The S0 note says dispatch was not ready because the session is "not launched from inside an Orca terminal". Wrong: `ORCA_*` pane variables are set; the gate (`orca-preflight.mts:131`) failed because `ORCA_AGENT_SESSION_ID` is unset, so the live caller cannot be matched. Same wording in the 2.19.0 CHANGELOG entry; fix on next changelog pass.

## 2026-10-08 — second correction to the S0 entry (supersedes the one above)
Orca *could* launch. `status` reports `dispatchReady: false` by design; the launch authority is `orca-launch-gate.mts` `evaluateLaunch`, which deliberately accepts `caller-unverified`. Run in this session after the fact it returned `allowed: true` for codex and opencode. Phases of this pitch that ran on ordinary subagents (S1, S2, audit cycle 1, fixes) did so because I misread `dispatchReady: false`, not because Orca was unavailable. Remaining caveat: worker vendor authentication and Codex/OpenCode completion are not live-proven here.

## Build incidents and live proof

The [worker-environment issue](../../knowledge/issues/orca-workers-differ-from-the-coordinator-environment.md) confirms that workers share the checkout, a stale root symlink and an old server caused distinct smoke failures, outside-root report lists fail collection, and settled terminals require release. The source log additionally retains exact smoke attempt identities, the ignored policy concurrency change, plugin versions, the unsafe stash incident and coordinator rerun counts. These observations are historical; no environment repair is performed by this supplement.


- 2026-10-08 S0 done. Evidence: preflight `policyStatus: valid`; `git check-ignore .project/orchestration.json` prints the path (ignored); `orca-run status` exit 0, `dispatchReady: false`.
- S1 done (state-structure.mts 199 lines; snapshot 66/66 tests). S2 done (state-pages.mts 173 + render +7; html 53/53). Coordinator reran snapshot, html, theme, pitch-compress, workflow-doctor, skill-registry, skill-defaults tests: 0 fail. Real `--apply` wrote 7 pages, no `<script`. LOC checkpoint: ~180 net on render files, well under 700.
- Incident: S1 subagent ran git stash/pop while S2 edited; S2 verified its files intact. Worker briefs now should forbid git stash.
- S3 done by coordinator (prose-only, faster than briefing a worker). Evidence: setup-validator 22 checks READY; graphify --check CLEAN; cmp claude/cursor SKILL.md identical; changelog 2.19.0; state-report.md covers structure/skills/knowledge pages.
- Audit cycle 1 done 2026-10-08: 5 must-fix + 6 should-fix fixed and re-verified by coordinator. Cycle 2 pending. New user requirement raised mid-audit: Orca flow must auto-start on every workflow skill when the switch is true (separate pitch).
- Live Orca smoke 2026-10-08: codex dispatch launched (ctx_fc082e1445fd), worker completed the read-only task correctly but could not send worker_done (broken /usr/local/bin/orca symlink in its PATH). opencode launch refused: max-concurrent-workers (codex attempt still open + older attempt-smoke-test-2).
- Live Orca smoke complete 2026-10-08: codex (attempt live-smoke-codex-2) and opencode (attempt live-smoke-opencode-2) each launched, sent their own worker_done, and collect accepted both with filesModified []. Fixes that made it work: repoint /usr/local/bin/orca (root symlink was broken); restart stale opencode server (running binary inode differed from on-disk v2.0.25). maxConcurrentWorkers raised 2→3 in the git-ignored policy because attempt-smoke-test-2 and live-smoke-opencode-1 remain unknown-liveness (preserved, not deleted). .opencode/package.json (ignored) plugin pin 1.18.30→1.18.35; opencode-plugin tests 6/6.
- Audit cycles 2 and 3 run through Orca (security: codex then opencode; tests: opencode; fixes: codex in the shared checkout). Both reviews independent: yes (fresh, canary caught, guard clean). Cycle 2: 2 must-fix + 6 should-fix, all fixed and re-verified. Cycle 3: no must-fix. Followups: F4, F6, F9; Orca worker-report path outside project is refused by collect; idle worker holds a slot until worker-release.
