# Shipped: readme-split

Bet: 2026-10-07. Shipped: 2026-10-08; user selected [1] ship. Appetite: big-batch (~16 files). Release: 2.11.0.

## Final verification

| Step | Result |
|---|---|
| Build / typecheck / lint / i18n | Not applicable: no such command in this repo (`stack.md`) |
| Tests | 514 pass, 0 fail, 0 skipped: `node --experimental-strip-types --test ai-framework/scripts/*.test.js ai-framework/scripts/*.test.mts ai-framework/hooks/scripts/*.test.js` |
| Workflow checks | `workflow-doctor.js`, `setup-validator.js`, `graphify.js --check` exit 0; `changelog.js --check` shows 2.11.0 |
| Links | `docs-links.js README.md ai-framework/docs SETUP.md`: 13 files, 0 broken |
| Diff | `git diff --check` clean; no secret or debug code added (`console.log` only as the CLI's output) |

## Reconciliation

| Scope | Status | Evidence |
|---|---|---|
| S1 link checker | shipped | `docs-links.js` + 10 tests (6 built, 4 added after audit, plus hardening) |
| S2 docs | shipped | 11 files in `ai-framework/docs/`; 0 lost lines except 4 intentional link rewrites |
| S3 README | shipped | 438 → 64 lines; 0 `](#` anchors |
| S4 tooling | shipped | doctor `docsChecks` + `docsLinkCheck`; `ai-framework/docs` in `SYNCED_DIRS`; new bundle-sync test; negative check in a scratch copy |
| S5 references | shipped | bundle-sync and changelog skills (.claude, .cursor), `SETUP.md` tree, `architecture.md` |

Rabbit holes: `docs/` collision resolved by `ai-framework/docs/`; doctor retarget and inbound refs resolved; bundle-sync allowlist resolved. Audit: 0 must-fix; 6 should-fix fixed; 3 cross-pitch claims refuted (`audit.md`).

## No-gos honored

No prose rewrites beyond headings, link fixes and three dropped "below"s; no historical records touched; no dependencies; no root `docs/`.

## Followups

Doctor has no dedicated test; link checker ignores reference-style links, HTML anchors and setext headings (both in `_followups.md`). One missed reference found during ship: the changelog skill cited "README's How to improve this flow" and was fixed in both mirrors. Provenance gap: audit reviewers were not canary-tested (`independent: no`).
