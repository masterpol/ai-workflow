# Pitch: archify-replaces-state

**Date**: 2026-11-23  •  **Appetite**: epic → decomposed into 3 big-batch slices (S1 spike, S2 swap, S3 removal)
**Stack**: backend tooling (Node `.mts` scripts, skills, vendor mirrors, docs)

## Problem

A maintainer who wants to see where the project stands today runs `/state`, which is ~10k lines of bespoke
snapshot, theme, fragment-validation and HTML-render code that we maintain ourselves. The maintainer wants
the report surface owned by Archify (tt-a1i/archify v3.3.0, ~99k stars, actively released) instead, so we stop
maintaining a renderer. Decision made with the user: **full replace** (not hybrid).

## Knowledge consulted

- [decisions/project-state-report-design] — every claim cites evidence; facts carry observed/proposed/stale/
  unavailable/unconfigured; HTML is inert. Constrains the replacement: these guarantees must be kept or the
  loss named and accepted.
- [decisions/…] related: `a-report-over-an-untrusted-tree-runs-only-bundle-code`,
  `parse-untrusted-values-and-re-emit-them`, `a-report-never-overwrites-a-file-it-did-not-write` — the report
  runs over untrusted trees; an external renderer is third-party code in that path.
- [issues/native-capture-needs-state-boundary-attribution] — metrics feed `/state`; `metrics.html` consumers
  must be re-pointed or dropped.
- `_followups.md` — `independent-rereview-catch-up` (deeper review of /state) and `live-host-verification`
  (/state on Codex and Cursor) become moot or move to Archify; close them at ship.
- Footprint measured: 25+ `state-*.mts` scripts (~10,010 lines), `state` skill mirrored in `.claude`,
  `.cursor`, `.agents`, `.opencode`; ~60 files reference state (docs, relations.toon, doctor, registry,
  migrate, bundle-sync/installed-upgrade tests, pitch-compress, review agents, README, `.gitignore`).

## Research finding (changes the shape)

Archify is a **diagram/explainer renderer**: agent writes typed JSON, Archify validates and renders
self-contained HTML (10 diagram types, explainer mode, code-analysis, PR walkthrough). It has **no** notion of
pitches, knowledge, tokens, skills inventory or a facts snapshot. So a full replace means:

- Archify renders; **something still has to collect facts**. Replacement = agent (or a thin script) gathers
  facts from `.project/`, `graphify-out/`, metrics, then emits Archify explainer/diagram JSON.
- Lost with no equivalent: the machine-checked `state.json` contract, the fragment evidence/number-binding
  checks, theme extraction from the host project, the `status` freshness model.
- Unverified (research read parts of README only): CLI path, zero-dependency claim, exact install behaviour,
  and that stable manifest still points at v3.2.0 pending v3.3.0 digest. Licence: Apache-2.0 for 3.3.0.

## Solution sketch (breadboard)

**Places**: `.claude/skills/state/SKILL.md` (becomes the thin Archify-driving playbook), vendor mirrors,
`ai-framework/integrations/state-report.md` (contract rewritten), `.project/reports/` (output dir),
installed Archify skill (via `/add-skill`, tracked ownership), `relations.toon`, doctor/registry/migrate.

**Affordances**: `/state` → (1) gather facts from existing sources into a small JSON the playbook defines;
(2) `archify validate` the typed document; (3) `archify deliver`/render to `.project/reports/state.html`;
(4) report receipt (validation JSON) so "observed vs proposed" labelling still lives in the document itself.

**Connections**: `/state` ← facts (status.md, graph, knowledge, metrics) → Archify document → HTML. Archify
is an *external, optional-install skill*; `/state` without it prints the install step and stops.

## Slices

- **S1 — Spike/validate (answers the user's "validate and check how it works")**: install v3.3.0 in a scratch
  dir via add-skill's mechanism, run `doctor`, `demo`, and a real explainer over this repo's facts. Exit:
  written findings with pinned version, CLI path, what runs offline, network calls (update check), output
  size, and a keep/stop recommendation. No repo changes besides findings.
- **S2 — Swap**: rewrite `state` skill + `state-report.md` contract + vendor mirrors to drive Archify; keep a
  minimal fact-gather step; run behind the old scripts still present. Exit: `/state` produces an Archify HTML
  report on Claude Code and OpenCode; validator + graph checks green.
- **S3 — Removal**: delete `state-*.mts` and tests, prune references (relations.toon, doctor, registry,
  migrate, bundle-sync tests, README, `.gitignore`, followups), add upgrade migration for installed projects
  that have `.project/reports/` + old scripts. Exit: grep for removed names empty; setup-validator, graphify
  `--check`, relations `--check` and full test suite green.

## Rabbit holes

**Resolved here**:
- Hybrid vs full replace → full replace chosen by the user (2026-11-23); S1 can still return "stop".
- Where the facts come from → keep sources of truth (`status.md`, graph, `.project/knowledge`, metrics);
  only the *report* is replaced.

**Pushed to /plan as risk**:
- Installed projects with old `state.json`/scripts: needs a migration path (`config-migrate`/`installed-upgrade`).
- Untrusted-tree safety: Archify HTML built from repo content; confirm no script injection and that its
  update-check network GET is disabled (`ARCHIFY_UPDATE_CHECK_DISABLED=1`) by default in our invocation.
- Vendor parity: Archify installs per agent (`--agent`); Codex/Cursor/OpenCode paths unverified.
- Pinning: bundle must pin an Archify version (stable manifest lags release); no floating `@latest`.
- Metrics/token page: no Archify equivalent; decide drop vs explainer table in S2.

**Pushed to no-go**:
- Re-implementing Archify features (themes, exports) locally.

## No-gos

- ✗ Vendoring or forking Archify source into this bundle.
- ✗ Floating/unpinned install, or auto-update at report time.
- ✗ Editing `.project/status.md`, `runs/` or pitch records from the report.
- ✗ Keeping both renderers long-term (S3 removes the old one).
- ✗ AI-prompt scope: none claimed (the playbook is a skill instruction, not a model-behaviour change under
  eval) — confirm at /critique.

## Critique findings

(Empty until /critique runs; appetite is epic-decomposed big-batch, so /critique is expected.)

## Bet decision

☑ **Bet** (→ /plan) — 2026-11-23, user: "bet all" (S1, S2, S3). /critique not run before bet at the user's direction; critique findings remain open and /plan should treat S2/S3 as conditional on S1's keep recommendation.
☐ Re-shape
☐ Pass
