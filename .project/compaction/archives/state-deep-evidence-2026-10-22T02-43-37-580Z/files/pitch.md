# Pitch: state-deep-evidence

**Date**: 2026-10-19  •  **Appetite**: big-batch (≤15 files; projected 11, about 600 production LOC and 650 test LOC)  •  **AI-prompt scope**: yes (it changes the context that the `/state` AI step reads once `state-ai-authoring` ships)
**Stack**: backend (Node `.mts` snapshot readers)

Part 4 of 4 of the epic "state report v2". It lands after three pieces of work: `state-report-redesign` S2 (`structure.repoShape`), `state-ai-authoring` (the consumer of these facts) and `token-attribution` S5 (token snapshot revision 3 adds `3` to `SUPPORTED_METRICS_SCHEMAS`). No decomposition is needed: 11 files fit the cap. If production LOC passes 1,200, the cut line is the monorepo package map (P3), which then becomes its own small pitch.

## Problem

The owner asks: what is this project, how is it built, how did it get here, what is risky, and where did the tokens go? The snapshot can answer only with counts of pitches, skills and completions. The AI that writes the report's `architecture`, `history`, `risks` and `tokens` slots has nothing to cite, so it either says nothing or invents.

## Corrections to the seed, found against the code

1. **"Vendor and model totals as today."** Today the snapshot keeps per-vendor completion counts only. `metricsSection` drops `lifetime.tokens` and `dimensions.models`, and the v2 token file has both (on this repo: 4 vendors, 6 Claude model rows).
2. **Version handling.** `SUPPORTED_METRICS_SCHEMAS` is the version set of the *token* snapshot. The state snapshot always writes `schemaVersion: 1`, and `state-render.mts` `loadSnapshot` refuses anything `!== 1`.
3. **"God nodes from the graph."** `graphify.mts god-nodes` passes through to Graphify via `uv`, which the snapshot must never run. Degree is computed in-process from the `links` in `graph.json`. Excluding non-code nodes, this repo's computation matches the `GRAPH_REPORT.md` list (RuntimeDeps 144, createNodeDeps() 131).
4. **"TODO density."** The graph holds no comments, so counting TODOs means reading source file contents, which the carried-over constraint forbids. The count is reported `unavailable` with that reason.
5. **"Phases, revises, audit cycles and must-fix counts from `done-work.md`, `status.md` and runs."** These sources hold prose. Structured counts exist only in `audit.md` (10 of 37 compaction archives have one, in three heading styles) and in `## Revisions` tables (1 archive). Only 3 of the 61 run logs use dated bullets. `done-work.md` is 79 KB, past the 64 KB markdown cap, so the `doneWork` fact on this repo is already truncated.
6. **"Lessons from `.project/knowledge/`."** No file read is needed. Every knowledge node in the graph carries `source` (the pitch slug), `created` and `updated`.
7. **Stale reference.** The seed's re-entry line names `state-ai-fragments`, which was split into `state-fragment-sanitizer` and `state-ai-authoring`.

## Knowledge consulted

- decisions/project-state-report-design: every fact has a status and evidence. Text past the 64 KB cap must downgrade the fact to `stale`, never misreport it (independent re-review). History over the 79 KB `done-work.md` follows this rule.
- patterns/a-report-over-an-untrusted-tree-runs-only-bundle-code and `ai-framework/rules/security.md` §9: one guarded reader, input bounded before any regex, and only bundle code runs. So no `uv`, Graphify or project script runs, and `graph.json` and the manifests are treated as untrusted data.
- patterns/allow-list-untrusted-labels-at-ingest-and-at-render and patterns/parse-untrusted-values-and-re-emit-them: symbol labels, module paths and package names are allow-listed, never copied.
- patterns/a-source-scanner-fails-closed-on-what-it-cannot-read: an audit record in a format the parser does not recognize is `unavailable`, never 0.
- issues/a-schema-version-bump-left-98-stale-tests-and-the-migrator-on-the-old-version: the argument against bumping the state snapshot version.
- patterns/display-buckets-are-not-lifecycle-identities: lossy `(other)` model buckets are never joined to pitches.
- entities/graphify: the graph schema (`source_file` on nodes, `imports`/`imports_from` links, the knowledge overlay).
- `.project/rules/` holds only `README.md`, so no stack companion applies. The 60-day staleness rule from `/knowledge-health` is reused for stale knowledge.

## Solution sketch (breadboard, NOT wireframe)

**Places**:
- P1 graph reader (`state-snapshot.mts`): one bounded parse of `graphify-out/graph.json`, shared by `knowledge` (existing), P2, P4 and P5.
- P2 `state-graph.mts` (new): module map, import edges between modules, most-connected symbols, test-file counts, graph freshness.
- P3 manifests (`state-structure.mts`, next to the `repoShape` detector): entry points, workspace packages and their internal dependencies.
- P4 `state-history.mts` (new): the pitch timeline.
- P5 risks and tokens assembly (`state-snapshot.mts`).
- P6 the contract doc (`state-report.md`) and golden cases.

**Affordances**: four additive top-level sections, named after the AI slots. Every leaf is a fact. `facts()` stops at the first fact it meets, so a fact never nests inside another fact's value.
- `architecture`:
  - `modules[]`: the module key is the first two path segments of `source_file`, or the package directory in a monorepo. A module is kept only if it appears in `structure.tree`. Each module records its file count and test count.
  - `imports[]`: edges between kept modules, with edge counts. External `ref_*` targets are only counted.
  - `entryPoints`: `main` and `bin` paths that are relative and resolve to real files.
  - `packages[]`: monorepo only. Each holds a name, the manifest kind, internal dependencies and an external dependency count. Non-JS manifests give the kind, with dependencies `unavailable`.
  - `graph`: node and link counts, `built_at_commit` (if it is 40 hex characters), mtime, and limits. Stale after 7 days.
- `history`:
  - `items[]`, one per pitch, built from `pitches.items` and `doneWork`:
    - identity: slug, phase, appetite, shipped date
    - scopes done, from `hill.md` or `runs/*-hill.md`
    - lessons: up to 10 knowledge ids whose graph `source` is the slug
    - `audit {cycles, mustFix}`, from a parser for the two current formats only (`## Must-fix (cycle N)`; `## Cycle N` with `### Must-fix`). Refuted rows are excluded.
    - `revisions`, from a `## Revisions` table
    - first and last date, from dated log bullets
    - when a source is missing or unrecognized, that field is `unavailable` with a reason
  - `cooldowns`: names of `runs/cooldown-*.md` files.
- `risks`:
  - `mostConnected[]`: the top 10 code symbols by graph degree, with allow-listed labels and the source file as evidence.
  - `testFiles {code, test, ratio}`: counted from graph code files.
  - `openFollowups`: `## ` items in `_followups.md` without a `**Resolved` line.
  - `staleKnowledge`: entries whose `updated` date is more than 60 days before `--now`, up to 10 ids.
  - `todoMarkers`: always `unavailable`.
- `tokens`:
  - `totals`: from `lifetime.tokens`, noted as "from N of M completions that reported usage".
  - `byModel[]`: vendor, model, completions, reported count and tokens, at most 20 per vendor.
  - `flows`: `unavailable` until the token snapshot has a revision with `flows`.

**New named reads**: every read goes through `readSource`/`readMarkdown`, which refuse symlinks and FIFOs and bound file size.
- `package.json` files under `{packages,apps,libs,services,modules}/<child>/`: monorepo only, at most 50, at most 64 KB each.
- `.project/pitches/<slug>/{audit,log}.md` and `runs/<date>-<slug>.md`.
- For compacted pitches only: the newest `.project/compaction/archives/<slug>-<ISO>/files/{audit,pitch}.md`, matched by exact slug and a timestamp regex.
- `.project/pitches/_followups.md`.

**Connections**: `buildSnapshot` runs these steps in order:
1. `structure`, with `repoShape`
2. graph parse
3. `knowledge` and `architecture` (graph, tree, `repoShape`, manifests)
4. `history` (pitches, `doneWork`, runs, hill, audit and pitch records, graph knowledge nodes)
5. `risks`
6. `tokens` (the token file is read once and shared with `metrics`)
7. `checkSnapshot` (every evidence path exists)
8. the size budget check
9. write `state.json`

Each section is isolated in `section()`. If a dependency fails, the section is `unavailable` with that dependency named. Consumers:
- `state-ai-authoring` fragments bind numbers by path, for example `<data value="risks.openFollowups.value">`.
- The renderer shows the new facts only in its status counts.

**Golden cases** (AI-prompt scope; an open action before the bet): add these to `.project/evals/datasets/state-ai-fragments.json`:
- `architecture-edges-only-from-snapshot`: a module edge that is not in `architecture.imports` is rejected by the post-check.
- `history-unrecognized-audit-is-not-zero`: the fragment says the counts are unavailable rather than 0.
- `risks-todo-unavailable`: no TODO number appears.
- `tokens-flows-before-attribution`: per-pitch tokens are stated as unavailable.

## Rabbit holes

**Resolved here** (with answer):
- `schemaVersion` → stays `1`, with additive sections, following the precedent in `state-report.md` ("Snapshot additions (still `schemaVersion: 1`)"). A bump would force a change to the renderer and a sweep of every fixture (the 98-stale-tests issue), and no consumer needs it. An older `state.json` simply lacks the new keys, and the fragment checker rejects unknown paths (`unknown-fact`). Exit checks: `grep -c "schemaVersion: 1"` is unchanged, and a pre-pitch `state.json` still renders.
- The graph is untrusted and large → it is parsed once (the 64 MB cap already exists), and processing stops at 50k nodes or 200k links, with `limits.truncated` and `stale`. Every `source_file` must pass four checks:
  - relative, never absolute (this repo's graph has one that fails)
  - no `..`
  - no backslash
  - every path component passes `isSecretName` and scrub-equality

  `.graphify_root` (an absolute home path) is never read. The count is named "graph degree", never Graphify's "god nodes".
- Record formats vary → only structured shapes are parsed, and an unrecognized format is `unavailable` with a reason, never 0. Prose in `done-work`, `status` and logs is not parsed beyond dated bullets. Overlap with `token-time-report`, which also lists revises, audit cycles and must-fix counts: this pitch owns the counts derived from records, and `token-time-report` owns the flow outcomes derived from events. It joins on the slug and does not parse audit records again.
- Snapshot size against the renderer's 1 MiB read cap (the `readSource` default) → per-section budgets:

  | Section | Budget |
  |---|---|
  | `architecture` | 256 KB |
  | `history` | 256 KB |
  | `risks` | 32 KB |
  | `tokens` | 32 KB |

  A section over budget first shrinks its lists (top-N, then counts only) and is marked `stale` with a note. Test: a maximal fixture stays under 768 KiB and renders. Today's file is 86 KB.

**Pushed to /plan as risk** (with named owner):
- Manifest reads loosen the pinned test "the tree scan reads no file contents", which redesign S2 narrows to the root `package.json`. Re-narrow it to an explicit allow-list, with a mutant that reads `src/` and must fail. If `repoShape` is not merged yet, `packages` is `unavailable` — owner: manifests scope.
- Token flows join: if `token-attribution` has shipped by /plan, read the pitch-level `flows` totals (top 20) and join them on the slug. Otherwise ship the `unavailable` fact — owner: tokens scope.
- Module key for flat layouts, such as a repo where everything sits under `src/` (two segments can be too coarse or too fine). Needs a single-directory fixture — owner: graph scope.
- Contention with redesign S2/S7, `token-attribution` S5 and `state-ai-authoring` over `state-snapshot.mts`, its test, `state-structure.mts` and `state-report.md`. Rebase after those land and rerun the cross-pitch projection — owner: plan.

**Pushed to no-go** (deferred):
- TODO/FIXME counts, LOC per file and coverage (these need source contents or test runs).
- YAML and TOML parsing (`pnpm-workspace.yaml` globs, `Cargo.toml` and `pyproject.toml` dependencies).

## No-gos (this pitch)

- ✗ Running Graphify, `uv`, `git`, the project's scripts or tests, or any network call.
- ✗ Reading source file contents, transcripts, secret-named files, or any archive file other than `files/{audit,pitch}.md`.
- ✗ Inferring a count from prose, or writing 0 where the value is unavailable.
- ✗ Rendering the new sections on pages, or editing `state-render.mts`, `state-pages.mts` or `state-html.test.mts`. The AI slots carry these facts through `state-ai-authoring`.
- ✗ Changing the `/audit`, `/ship` or log formats to make counting easier (logged as a followup instead).
- ✗ Bumping the state snapshot `schemaVersion`, or touching the `/state` skill and its mirrors.

**File projection (11)**:
- production: `state-snapshot.mts`, `state-structure.mts`, `state-graph.mts` (new), `state-history.mts` (new)
- tests: `state-snapshot.test.mts`, `state-graph.test.mts` (new), `state-history.test.mts` (new)
- doc and data: `ai-framework/integrations/state-report.md`, `.project/evals/datasets/state-ai-fragments.json`
- release: `CHANGELOG.md`, `VERSION`

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

Run 2026-10-19 by five perspective subagents (shared with `state-ai-authoring` and `token-time-report`). Advisory. Cross-pitch ownership rulings below were recorded as defaults by the coordinator and are open to the owner at the bet.

| ID | Perspective | Severity | Disposition |
|----|-------------|----------|-------------|
| S4 | skeptic | high | Add to /plan: compute the fraction of graph `source_file` entries that exist in `structure.tree`; below a threshold `architecture` and `risks.mostConnected` downgrade to `stale`/`unavailable`; the AI never cites degree from a graph that disagrees with the tree |
| S5 | skeptic | medium | Add to /plan: per-element validation, string ids only, prototype-free maps, links with unknown endpoints ignored, lower byte cap for this reader, hostile fixture (deep nesting, 200k links, `__proto__` ids) |
| S6 | skeptic | medium | Ruling: `schemaVersion` stays 1; a change to the meaning of an existing path requires a bump, purely additive keys do not; a contract test pins the rule; also a case for new keys read by an older renderer |
| DE-1 | knowledge-historian | high | Added to Knowledge consulted: issues/backtracking-regex-over-untrusted-text-is-quadratic; audit, revisions and log parsers are linear scanners with a timing test at the size cap |
| SD1, SD2 | appetite-auditor | acknowledged/medium | Restated: ~1,400 LOC (production ~730); the cut line is now total projected LOC over 1,350 (monorepo package map first); if `repoShape` has not landed from redesign S2, `packages` ships `unavailable` |
| E8-E15 | eval-regression-projector | medium | Addressed: the new cases live in their own dataset `.project/evals/datasets/state-deep-evidence.json` (not the 22-case file); it covers the truncated `done-work.md`, a stale or truncated graph, degree is not risk, capped lists, absent-versus-zero for every count, injection through graph labels, partial token reporting, old-snapshot skew, and shrunk lists |
| X1 | cross-pitch-projector | high | Ruling: separate dataset removes the conflict with the sanitizer's exact-22 partition |
| X2 | cross-pitch-projector | high | Ruling: this pitch owns every record-derived count (audit cycles, must-fix, revisions); `token-time-report` reads them by slug and keeps only event-derived `transitions` |
| X3 | cross-pitch-projector | high | Ruling: `token-attribution`'s exported resolver is the single owner of pitch/phase/scope; `history` joins on slug and records any divergence from hill-file scopes |
| X4 | cross-pitch-projector | high | Ruling: `state.json` owns token totals and by-model rows (this pitch); the flow report owns per-flow rows only; the AI `tokens` slot reads `state.json` |
| X5, X14 | cross-pitch-projector | high/medium | Order: redesign S2, then `token-attribution` S5, then this pitch; re-narrow the single-read test to an explicit allow-list with a mutant |
| X10, X11, X13 | cross-pitch-projector | medium | Acknowledged: slot reads only its cited paths and the snapshot cap is stated; clock-derived fields (`staleKnowledge`, graph mtime, `--now`) are excluded from the fragment hash; exit adds a live re-run on every vendor |
| X7, X15, X16 | cross-pitch-projector | medium | Acknowledged: serialize `state-report.md` edits and changelog bumps by ship order |

## Bet decision

☑ **Bet** (→ /plan) — 2026-10-19, owner chose "Bet" at the critique gate; the cross-pitch rulings in the critique table stand as defaults.  
☐ Re-shape — named gap: {which rabbit hole un-resolved? which critique finding?}  
☐ Pass — moved to `.project/pitches/_parked/{slug}/`; reason: {…}

Open action before bet (done): the four original golden cases and the new critique cases are in `.project/evals/datasets/state-deep-evidence.json` (hard gate for AI-prompt scopes), not in the shared 22-case file.
