# Compaction record: readme-split

Prepared 2026-10-08. This record preserves closure evidence and constraints; the recovery archive retains the full source history.

Durable knowledge: [[workflow-tooling-pitches-share-standing-no-gos-and-design-answers]].

## Section 1: SHIPPED.md#final-verification

514 tests pass, 0 fail, 0 skipped over the scripts and hook script suites. workflow-doctor, setup-validator and graphify --check exit 0; changelog check shows 2.11.0; docs-links over README, ai-framework/docs and SETUP.md: 13 files, 0 broken. `git diff --check` clean, no secrets or debug code. No build/typecheck/lint/i18n commands exist.

## Section 2: SHIPPED.md#reconciliation

S1 link checker `docs-links` (10 tests: 6 built, 4 added after audit). S2 eleven docs in `ai-framework/docs/` with no lost lines except 4 intentional link rewrites. S3 README cut from 438 to 64 lines with 0 `](#` anchors. S4 tooling: doctor `docsChecks` plus a README-links-every-doc check, `ai-framework/docs` added to `SYNCED_DIRS`, a new bundle-sync test and a negative check in a scratch copy. S5 references updated in the bundle-sync and changelog skills (.claude, .cursor), the SETUP.md tree and architecture.md. Release 2.11.0. Rabbit holes resolved: the `docs/` name collision (use `ai-framework/docs/`), the doctor retarget and inbound references, the bundle-sync allowlist.

## Section 3: SHIPPED.md#no-gos-honored

No prose rewrites beyond headings, link fixes and three dropped 'below's; no historical records touched; no dependencies; no root `docs/` folder.

## Section 4: SHIPPED.md#followups

The doctor has no dedicated test; the link checker ignores reference-style links, HTML anchors and setext headings. One missed reference was found and fixed during ship (the changelog skill cited the README's 'How to improve this flow' in both mirrors). Provenance gap: audit reviewers were not canary-tested (`independent: no`).

## Section 5: pitch.md#no-gos

No content rewrites beyond move plus link and heading-level fixes; no edits to historical pitches, design or archive; no new dependencies or docs tooling (the link check is a dependency-free Node script); no root `docs/` folder.

## Section 6: pitch.md#rabbit-holes

Resolved: `docs/` collides with a consumer project's own folder, so docs live in the bundle-owned `ai-framework/docs/` (already synced); the doctor greps README headings and was retargeted to the new files with README kept in `coreFiles`; inbound references (bundle-sync skill and its Cursor mirror, README cross-links) updated and anchors checked. Risks: the graph or validator treating new .md files as records (checked with graphify and setup-validator) and overlap with ts-runtime-injection (checked at plan). Pushed to no-go: rewriting prose, a docs site generator, translation.

## Section 7: log.md#2026-10-07

S1 link checker with 6 tests using only fs and path. S2 eleven docs via a throwaway split script (headings shifted up one level, a `../` link fix, back-links and See also added) with a line-preservation check. S3 README 438 to 64 lines. S4 doctor, SYNCED_DIRS and bundle-sync test changes; a negative check (renamed heading) made the doctor fail on that check. S5 mirrors updated; cursor mirrors reported no differences. Gates: setup-validator, graphify, doctor and docs-links all exit 0.

## Section 8: log.md#audit-cycle-1

0 must-fix; 6 should-fix fixed; 3 cross-pitch must-fix claims refuted (disjoint hunks). The link checker test suite grew to 10 tests.
