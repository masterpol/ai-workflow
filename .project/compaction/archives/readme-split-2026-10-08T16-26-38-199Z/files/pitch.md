# Pitch: readme-split

**Date**: 2026-10-07  •  **Appetite**: big-batch (≈14 files: 1 README + ~11 new docs + workflow-doctor.js + 1-2 inbound refs; escalated from shape-lite)
**Stack**: docs + Node tooling (no UI, no AI prompts)

## Problem

A newcomer or maintainer must scan one 438-line README to find setup, diagnostics, vendor or extension guidance; sections are hard to link to, and the file mixes orientation with reference.

## Knowledge consulted

- decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers — standing no-gos apply (no unrelated rewrites).
- patterns/opt-in-before-runtime-discovery — doctor checks should name explicit files, not discover them.
- No prior README/docs entry in graph (tags: bundle-sync, sync only). Rules: none specific to docs.

## Solution sketch (breadboard)

**Places**: `README.md` (short index) · `ai-framework/docs/*.md` (one topic each) · `workflow-doctor.js` `readmeChecks`.

**Affordances**: README keeps title, intro, Concepts, a "Documentation" link table (topic → relative link), quick Set up (2 steps). Each doc: H1, one-line purpose, "← Back to README" link, "See also" links. Sections move verbatim.

**Proposed split** (from current H2/H3): setup (Set up + OpenCode model setup) · token-consumption · workflow-doctor · setup-validator · knowledge-graph · versioning-and-sync · what-you-get · vendors (One source, every vendor) · pipeline (+ Beyond the core) · extending (How to improve this flow) · design-notes (+ managed-write safety).

**Connections**: README → docs (relative links); docs ↔ docs by relative links; in-README `#anchors` rewritten to doc paths. Doctor `readmeChecks` retargeted: each pattern names the doc file that now owns the heading. Exit: link-check script/command (every relative link + anchor resolves).

## Rabbit holes

**Resolved here**:
- Folder name `docs/` collides — SETUP.md copies bundle contents to the target root, where the project's own `docs/` likely exists → resolution: use `ai-framework/docs/` (bundle-owned namespace, no collision, already synced).
- Doctor greps README headings (9 patterns, `readmeChecks` ~line 535; no dedicated test references it) → resolution: retarget to the new files; keep `README.md` in `coreFiles`; add a check that README links the docs.
- Inbound refs: bundle-sync/SKILL.md:22 (+ `.cursor` mirror) cites "One source, every vendor"; README line 205/295 cross-links → resolution: update to new paths; grep `README` for `#`-anchors after the move.

**Pushed to /plan as risk**:
- bundle-sync coverage of `ai-framework/docs/` — verify it syncs the folder (it syncs `ai-framework/`); owner: plan T1.
- Graph/validator treating new .md as records — run `graphify.js --check` and `setup-validator.js`.
- Cross-pitch overlap with ts-runtime-injection (touches `workflow-doctor`/scripts?) — check at plan.

**Pushed to no-go**: rewriting prose; a docs site generator; translating.

## No-gos (this pitch)

- ✗ No content rewrites beyond move + link/heading-level fixes.
- ✗ No edits to historical pitches/design/archive.
- ✗ No new dependencies or docs tooling; link check is a dependency-free Node script.
- ✗ No root `docs/` folder.

## Critique findings

(Not required: no AI-prompt scope. Big-batch auto-critique offered at gate.)

## Bet decision

☑ **Bet** (→ /plan) — 2026-10-07
☐ Re-shape
☐ Pass
