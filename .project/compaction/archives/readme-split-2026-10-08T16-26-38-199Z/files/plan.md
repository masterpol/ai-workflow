# Plan: readme-split

**Pitch**: pitch.md  •  **Appetite**: big-batch (≈16 files)  •  **Hill**: hill.md

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | Link checker | `ai-framework/scripts/docs-links.js`, `docs-links.test.js` | ~130 | — | — | no: defines the exit tool every later scope uses | — |
| S2 | Move sections to docs | `ai-framework/docs/{setup,token-consumption,workflow-doctor,setup-validator,knowledge-graph,versioning-and-sync,what-you-get,vendors,pipeline,extending,design-notes}.md` (11 new) | ~440 moved, ~60 new (headers, back/see-also links) | S1 | — | yes: mechanical, disjoint new files, clear exit (link check + diff-of-text) | fast |
| S3 | README as index | `README.md` | ~-330 / +50 | S2 | S4 | no: depends on final doc names, one file | — |
| S4 | Tooling retarget + sync | `ai-framework/scripts/workflow-doctor.js` (`readmeChecks` block only), `bundle-sync.js` (`SYNCED_DIRS`), `bundle-sync.test.js` (`SYNCED`) | ~30 | S2 | S3 | no: shared files, small | — |
| S5 | Inbound refs + context | `.claude/skills/bundle-sync/SKILL.md`, `.cursor/skills/bundle-sync/SKILL.md`, `SETUP.md` (tree + README line), `.project/context/architecture.md` | ~15 | S2 | S3, S4 | no: tiny | — |

## Exit criteria per scope (machine-checkable, ≥1 per scope)

### S1 — Link checker
- `node --test ai-framework/scripts/docs-links.test.js` exit 0 (cases: broken file link, broken `#anchor`, valid link, fenced code ignored, external URL ignored).
- `node ai-framework/scripts/docs-links.js README.md ai-framework/docs` exits 0 on a tree of valid links and non-zero on a seeded broken one (covered by the test).
- No dependencies: `grep -c "require(" ai-framework/scripts/docs-links.js` lists only node built-ins.

### S2 — Move sections to docs
- `ls ai-framework/docs | wc -l` = 11.
- Content preserved: every non-blank line of the original README sections appears verbatim in exactly one doc (script compares `git show HEAD:README.md` lines to the union of docs + README; allowed diffs = heading level changes and rewritten intra-doc anchors). Report must list zero lost lines.
- Each doc starts with an H1, has a `← Back to README` link and a `See also` line.
- `node ai-framework/scripts/docs-links.js ai-framework/docs` exit 0.

### S3 — README as index
- `wc -l README.md` ≤ 120.
- README keeps the intro, Concepts and a 2-step Set up; has a Documentation table linking all 11 docs.
- `node ai-framework/scripts/docs-links.js README.md ai-framework/docs` exit 0 (no stale `#anchor` links).
- `grep -c "](#" README.md` = 0 for anchors to moved sections.

### S4 — Tooling retarget + sync
- `node ai-framework/scripts/workflow-doctor.js` exit 0 and the 9 README checks now pass against the new files (stdout names them).
- Negative check: temporarily removing `## Knowledge Graph` from `ai-framework/docs/knowledge-graph.md` makes the doctor fail that check (run in a scratch copy).
- Doctor also verifies README links all docs (`docs-links.js` result) — new check passes.
- `node --test ai-framework/scripts/bundle-sync.test.js` exit 0 with a case showing `ai-framework/docs` content is synced.
- `node ai-framework/scripts/setup-validator.js` and `node ai-framework/scripts/graphify.js --check` exit 0.

### S5 — Inbound refs + context
- `grep -rn "One source, every vendor" .claude .cursor SETUP.md` shows each reference pointing at `ai-framework/docs/vendors.md`.
- `node ai-framework/scripts/skill-vendors.js cursor-mirrors` (dry run) reports no drift for the edited `.claude`/`.cursor` bundle-sync SKILL.md pair.
- `node ai-framework/scripts/docs-links.js README.md ai-framework/docs SETUP.md` exit 0.

## Final gate (bundle)
Every `node --test ai-framework/scripts/*.test.js` suite touched passes; `workflow-doctor.js`, `setup-validator.js`, `graphify.js --check` exit 0. No build/typecheck/lint/i18n command exists in this repo (stack.md) — skipped.

## Risks (inherited from pitch rabbit holes)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| `ai-framework/docs` not in `SYNCED_DIRS` (allowlist in `bundle-sync.js:70`, duplicated in test) → docs never reach installed projects | S4 | no | Add to both lists; test case |
| Doctor `readmeChecks` retarget breaks installed-project mode (checks run only in bundle repo, `inPortableBundleRepo`) | S4 | no | Keep that guard; check docs path only in the bundle repo |
| Cross-pitch: `workflow-doctor.js` has uncommitted foundation edits; `ts-runtime-injection` S5 edits its `--check` list | S4 | no | Edit only the `readmeChecks` block; run S4 after foundation edits are committed; ts S5 uses a different block — re-verify at build |
| Lost/duplicated content or stale `#anchors` after the move | S2/S3 | no | Line-preservation script + link checker in exit criteria |
| New `.md` files read as knowledge/records by graph or validator | S4 | no | `graphify.js --check`, `setup-validator.js` in exit |
| Heading-level changes (H2→H1/H2) break the doctor's `^## ` patterns | S2/S4 | no | Decision: doc H1 is the topic; doctor patterns updated to `^# ` for those files |
| Repeated owned-by-nobody drift: README and docs both explain Set up | S3 | no | Canonical home = `docs/setup.md`; README holds only the 2 steps + link |

## Parallel dispatch plan

S1 → S2 (fast subagent, mechanical extraction by line range from `git show HEAD:README.md`) → S3 ∥ S4 ∥ S5 (disjoint files). Cross-pitch: no file overlap with `ts-runtime-injection` except `workflow-doctor.js` (different block).

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)
