# Build log: readme-split

## 2026-10-07

- S1: `docs-links.js` + `docs-links.test.js`; `node --test` 6/6 pass; only `node:fs`/`node:path` required.
- S2: 11 docs in `ai-framework/docs/` via a throwaway split script (headings shifted up one level, `../` fix on one link, back-link + See also added). Line-preservation check: 0 lost lines except 4 intentionally rewritten link lines (anchors → `vendors.md`/`extending.md`/`../integrations/…`). `docs-links.js ai-framework/docs` exit 0.
- S3: README 438 → 64 lines; 0 `](#` anchors; `docs-links.js README.md ai-framework/docs` exit 0.
- S4: doctor `readmeChecks` → `docsChecks` per doc, `# ` heading patterns, new README-links-every-doc check, `docs-links.js` syntax check; `SYNCED_DIRS` + test list add `ai-framework/docs`; new bundle-sync test. `bundle-sync.test.js` 17/17; doctor exit 0; negative check in scratch copy (renamed `# Knowledge Graph`) → doctor FAIL on that check.
- S5: bundle-sync SKILL.md (.claude, .cursor) point to `ai-framework/docs/vendors.md`; SETUP.md tree; architecture.md line. `skill-vendors.js cursor-mirrors` differs: [].
- Gates: setup-validator exit 0, `graphify.js --check` exit 0, doctor exit 0, docs-links over README+docs+SETUP.md exit 0.

## Audit cycle 1
- 0 must-fix; 6 should-fix fixed (see audit.md); cross-pitch "must-fix" ×3 refuted (disjoint hunks). `docs-links.test.js` now 10 tests.
