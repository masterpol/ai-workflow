# Pitch: state-report-redesign

**Date**: 2026-10-19  •  **Appetite**: big-batch (≤15 files; projected ~14, ~2,000 LOC including tests; the cap is judged on files and on production LOC, ~1,200)
**Stack**: backend (Node `.mts` renderers) producing static HTML/CSS/inline SVG

Part 1 of 3 of the epic "state report v2" (owner request 2026-10-19: ugly HTML, deeper analysis, AI-authored diagrams). Order: this pitch, then `state-ai-fragments`, then `state-deep-evidence`. The epic is too large for one pitch, so it is decomposed here.

## Problem

The owner opens `.project/reports/index.html` and finds plain linked pages with tables of numbers: no hierarchy, no navigation that feels like one report, no charts, and a gray fallback theme for most projects. The report is hard to read and does not look like something to share.

## Knowledge consulted

- decisions/project-state-report-design — theme rediscovered from the project's CSS every run, `theme.json` is a record only, contrast fallback per group, inert pages (CSP, no scripts, all text escaped). The inert rule stays; the fallback theme is what this pitch revisits.
- decisions/effective-sync-bases-and-bounded-font-discovery — supersedes the old "quoted fonts rejected" rule (critique R1); quoted ASCII font families are already accepted.
- patterns/a-report-over-an-untrusted-tree-runs-only-bundle-code; patterns/parse-untrusted-values-and-re-emit-them; patterns/allow-list-untrusted-labels-at-ingest-and-at-render — every new chart label and theme value is parsed and re-emitted, never copied.
- patterns/a-report-never-overwrites-a-file-it-did-not-write — the render keeps its staging directory and refuses foreign files.
- `.project/rules/` and `ai-framework/rules/ui-ux-review.md` — accessibility and contrast expectations (4.5:1 pairs asserted in tests).
- state-structure already reports `projectType: mixed` from folder names; that is not monorepo detection.

Owner decisions (2026-10-19): fix layout and typography, theme, navigation and charts. Theme rule: a single project uses the project's own theme; a monorepo uses the AI workflow's default theme.

## Solution sketch (breadboard, NOT wireframe)

**Places**: P1 monorepo detector (new, in the snapshot/structure code); P2 theme resolver (`state-theme.mts`); P3 design system (one shared stylesheet string, tokens, components); P4 page renderers (`state-render.mts`, `state-pages.mts`); P5 chart module (new, inline SVG from numbers); P6 page slots reserved for AI fragments (empty in this pitch).

**Affordances per place**:
- P1: reports `repoShape`: `single` or `monorepo` with evidence (workspaces field, `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json`, or several manifests in sibling package directories). Names only, no content reads beyond the allow-list.
- P2: `single` → discover the project's theme as today; `monorepo` → the workflow default theme, a deliberate built-in light/dark pair (replaces the plain zinc fallback), contrast asserted ≥4.5:1; project theme still used per-group where it passes contrast.
- P3: sidebar navigation on every page (current page marked), a header with project name, workflow version and generated time, cards, status chips for observed/proposed/stale/unavailable/unconfigured, a type scale, spacing tokens, responsive layout down to phone width, light/dark through `prefers-color-scheme`, print stylesheet.
- P4: every page uses P3; overview shows headline cards (active pitches, shipped, knowledge entries, token totals, sync attention) instead of a fact dump; evidence paths stay visible and link only to real project files.
- P5: charts drawn as inline SVG with text alternatives and a data table fallback: token share by vendor/model, pitch status, knowledge by type, folder size; built from numbers only, labels allow-listed and truncated.
- P6: each page keeps named empty slots (`overview`, `architecture`, `history`, `risks`, `tokens`) that render nothing when no fragment exists.

**Connections**: `state.json` snapshot → render → detector decides theme source → design system + charts → pages written through the existing staging directory.

## Rabbit holes

**Resolved here** (with answer):
- Inert pages stay inert: no JavaScript, same CSP, charts are static SVG. Navigation is plain links.
- Monorepo versus mixed → separate field `repoShape`; `mixed` projectType stays a name-based guess.
- Existing contrast rule applies to every new pair; the default theme is tested the same way as the fallback.

**Pushed to /plan as risk** (with named owner):
- The workflow default theme itself (palette, type) — owner: S1; design review with the `artifact-design`/`ui-ux-review` rules, not invented ad hoc.
- Pinned header tests in `state-html.test.mts` (1,071 lines) assert current markup; plan which tests change versus are rewritten — owner: S2.
- Chart label growth and key caps for large projects — owner: S3.
- Theme root per `repoShape` (critique S1): discovery is a depth-6, 200-file alphabetical scan built for one project. For `monorepo` it is not run at all (workflow default theme only); no mixing of tokens from different packages. Test: a monorepo never takes project tokens — owner: S1.
- Monorepo detection edge cases (critique S2): workspaces as array or `{packages:[]}`; `turbo.json`/`nx.json`/`pnpm-workspace.yaml` in a single-package repo; sibling manifests in fixtures or `templates/`; nested workspace root versus git root. Fixed precedence order, ties go to `single`, evidence capped; a fixture matrix is a plan exit — owner: S1.
- CSP and charts (critique S3): the CSP is a `<meta>`, so it must be the first element in `<head>` (tested) and slots emit after it; charts use presentation attributes only, no `url()`, `filter` or SVG `<style>` — owner: S3.
- Test churn (critique S4): first extract the invariants (no script, CSP, escaping, contrast, navigation resolves) into a markup-agnostic helper, then rewrite pinned-markup tests, so tests are not weakened to pass. Sidebar duplicates links on every page; review anchor-count assertions — owner: S2.
- Cap accounting (critique A1, A2): skill files and their mirrors are not touched in this pitch. If charts push production LOC past the cap, cut to two charts (tokens by vendor, pitch status) and defer the rest — owner: plan.
- Order (cross-pitch X4, X9): land after the `token-attribution` snapshot revision if the overview token cards read the token snapshot, using the same reader; edits to `state-*.mts` land before the `workflow-v3-rollout` dry run.

**Pushed to no-go** (deferred):
- AI-written content and diagrams (`state-ai-fragments`).
- New snapshot facts (`state-deep-evidence`).
- Quoted-font handling: already solved by decisions/effective-sync-bases-and-bounded-font-discovery (quoted ASCII families accepted, re-emitted, re-validated); this pitch only reuses it.

## No-gos (this pitch)

- ✗ Any script, external load, web font or network call in a generated page.
- ✗ Editing `status.md`, `runs/` or any lifecycle record from the report.
- ✗ New facts beyond what the snapshot already holds.
- ✗ Copying project CSS text into the page; theme values are parsed and re-emitted.
- ✗ Changing the snapshot `schemaVersion` except an additive `repoShape` section.

## Critique findings

Run 2026-10-19 by five perspective subagents (shared run with `state-ai-fragments`). Advisory.

| ID | Perspective | Severity | Disposition |
|----|-------------|----------|-------------|
| S1 | skeptic | high | Addressed: no theme scan in monorepo mode; test added to plan |
| S2 | skeptic | high | Addressed: precedence, tie to `single`, fixture matrix |
| S3 | skeptic | medium | Addressed: meta first in head, no `url()` in charts |
| S4 | skeptic | medium | Addressed: invariants extracted before test rewrite |
| R1 | knowledge-historian | high | Addressed: stale rule removed, superseding entry cited |
| A1, A2, A3 | appetite-auditor | medium | Addressed: projection corrected to ~14 files; skill mirrors out; charts may shrink |
| X2, X4, X9 | cross-pitch-projector | high/medium | Acknowledged: this pitch ships first among the state pitches; token snapshot reader shared with `token-attribution`; rollout dry run re-run after |
| X1, X3, X6, X10, X11 | cross-pitch-projector | various | Acknowledged: ordering recorded; instruction-compression preparation copies stay out of audits |

## Bet decision

☑ **Bet** (→ /plan) — 2026-10-19, owner approved after critique; critique findings S1-S4, R1, A1-A3 addressed above, X-findings acknowledged as ordering.
☐ Re-shape — named gap: {…}  
☐ Pass — moved to `.project/pitches/_parked/{slug}/`; reason: {…}
