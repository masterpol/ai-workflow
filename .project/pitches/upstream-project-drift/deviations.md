# Deviations: upstream-project-drift

## D1 (plan) — S3 rewires the version call sites now
See plan.md "Living-spec deviations log" D1 (critique X1 overridden; pitch 3 changes only the function body).

## D2 (plan) — climbing ownership fixes stay in this pitch
See plan.md D2 (critique X2 partly overridden; `orca-policy.mts` shape and grader fixtures left to pitch 4).

## D3 (S0, 2026-10-16) — S8 and S1 shrink: most climbing docs/rules are project adaptations
- **Plan said**: S8 ports climbing `docs/{vendors,extending,setup,design-notes,workflow-doctor}.md` and
  `integrations/harnesses.md`; S1 triages climbing `rules/{context-management,model-routing,security}.md`.
- **Reality**: those files carry climbing's "Original bundle reference" banners, project model routing and
  links to its own `.project/rules/` companions. Classified `project-local` in the ledger.
- **Now**: S8 = climbing `workflow/` + `templates/` hunks only (13 files). S1 = `coding-standards.md`
  (`406ecc5` hunk), LAH `rules/testing.md` "verification discipline" section, graphify finish.

## D4 (S0) — RN is mostly a runner rewrite, not improvements
- 47 RN rows are `node → bun` text only. Kept project-local. The portable fix (runner-aware usage text, hook
  commands, doctor runner checks) moves to `unified-toon-config`, recorded as a follow-up.
- RN real improvements are 10 rows: the Orca start hooks, `stuck-uphill-detector`, `pre-ship-verify`,
  `hooks.json` path fix (S6) and the `skill-defaults.test.mts` `IN_BUNDLE_REPO` guard (S7, not in plan).
