# Pitch: state-multipage-report

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
