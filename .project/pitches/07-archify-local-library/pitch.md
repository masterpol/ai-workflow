# Pitch: archify-local-library

**Date**: 2026-11-26  •  **Appetite**: small-batch  
**Stack**: workflow-tooling

## Problem

Installed skill packages — especially Archify — are landing as tracked source in projects like `../LAH`, turning the repository into a mostly-JavaScript artifact store (601 tracked Archify files vs. 390 project TypeScript files). The bundle already decided Archify is instance data, but receiving projects are not reliably gitignoring it, so `add-skill` installs become accidental commits.

## Knowledge consulted

- [decisions/archify-renders-the-state-report](../../knowledge/decisions/archify-renders-the-state-report.md) — already says Archify is instance data like caveman: git-ignored, never shipped by bundle-sync. This pitch enforces that decision in installed projects.
- [decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers](../../knowledge/decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers.md) — constrains tooling pitches to shared no-gos; this one stays inside the installer/doctor surface.
- [ai-framework/integrations/skills.md](../../../ai-framework/integrations/skills.md) — documents `.project/skills/packages/<owner>/<repo>/<skill>/` as the package path and `bundle-sync` exclusion of registry-owned files.
- [ai-framework/scripts/workflow-doctor.mts](../../../ai-framework/scripts/workflow-doctor.mts) — currently only checks `.project/evals/runs/` and `.project/evals/.cache/` in `.gitignore`; skill packages are unchecked.
- Evidence from `../LAH`: `.gitignore` omits `.project/skills/packages/` and Archify wrapper paths; `git ls-files` shows 601 tracked Archify paths vs. 390 tracked `.ts`/`.tsx` files.

## Solution sketch (breadboard, NOT wireframe)

**Places**: `add-skill` install/update, `workflow-doctor`, project `.gitignore`, bundle `.gitignore` / setup docs.

**Affordances per place**:
- `add-skill install` / `update`: before writing package files, ensure `.gitignore` contains the generic `.project/skills/packages/` rule and the per-skill wrapper path rules (e.g. `.claude/skills/archify/`). Append missing rules; never remove or reorder existing rules.
- `workflow-doctor`: add a `.gitignore (skill packages)` check that fails when `.project/skills/packages/` or installed-skill wrapper directories are not ignored.
- Bundle `.gitignore` / `SETUP.md`: keep the canonical rules visible so fresh installs and manual setups inherit them.

**Connections**: human runs `/add-skill` → installer writes registry + package + wrappers and guarantees `.gitignore` ignores them → doctor fails clean checkouts that are missing the rule → project never commits a 22.5 MiB renderer as source.

## Rabbit holes

**Resolved here**:
- What about projects that already committed Archify (e.g., `../LAH`)? → `add-skill update` will append the ignore rules on the next Archify bump; the previously committed files become untracked only when a person `git rm --cached` them. This pitch only writes the ignore rule, not a repo-wide cleanup.
- Should wrapper paths be per-skill or a blanket `.claude/skills/*/`? → Per-skill explicit rules match the bundle root `.gitignore` and avoid accidentally ignoring canonical workflow skills.
- Does `bundle-sync` need to change? → No. `skills.md` already excludes registry-owned files from sync; this pitch only fixes the `.gitignore` side.

**Pushed to /plan as risk**:
- Exact rule format that works for both Git and the doctor's parser (regex vs. literal). Owner: build phase.
- Whether to fail doctor on wrapper-path misses when the skill is not installed in that checkout. Owner: build phase.

**Pushed to no-go**:
- Automated removal of already-committed Archify files from existing projects.
- Changing the install location away from `.project/skills/packages/` (the decision to use that path stands).

## No-gos (this pitch)

- ✗ Do not move Archify out of `.project/skills/packages/`.
- ✗ Do not delete or rewrite existing `.gitignore` content beyond appending missing rules.
- ✗ Do not add a bundled/vendored Archify copy.
- ✗ Do not change the `bundle-sync` classification of skill-owned files.

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

(Empty until /critique runs. This pitch is small-batch and not an AI-prompt scope, so /critique is not triggered.)

## Bet decision

☐ **Bet** (→ /plan)  
☐ Re-shape — named gap: {which rabbit hole un-resolved? which critique finding?}  
☐ Pass — moved to `.project/pitches/_parked/{slug}/`; reason: {…}

Queued at the end of current work per user request.
