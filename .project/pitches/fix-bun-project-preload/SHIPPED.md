# Shipped: fix-bun-project-preload

Bet: 2026-11-27  •  Shipped: 2026-11-27  •  Appetite: big-batch, over its 15-file cap with the owner's acceptance (22 files besides records and the rebuilt graph; about 22 accepted)  •  Version: 2.62.0

The workflow's read-only checks no longer run a checked project's code through the five routes found: Bun preload, `.env`, TypeScript path mappings, Bun macros, and the project's Graphify script; the live OpenCode step, which loads project plugins, is now opt-in.

It began as a bug fix, reached the two-cycle audit cap with macros open, and was re-shaped.

## Scopes

| ID | Status | Hill done | Notes |
|----|--------|-----------|-------|
| Earlier isolation | shipped | 2026-11-27 | Shared Bun options; audited in [audit.md](audit.md) and again in [audit-reshape.md](audit-reshape.md) |
| S1 | shipped | 2026-11-27 | Parse only on Node; unparsed files warn. Coordinator added the macro tests |
| S2 | shipped | 2026-11-27 | Doctor's own Graphify; `--live-opencode`; documents. Coordinator restored README warnings |

The 22nd file is `ai-framework/docs/setup-validator.md`, added with the owner's request to update the READMEs.

## No-gos

- ✅ Runner selection and its settings files unchanged.
- ✅ The doctor's `uv` and Git calls unchanged.
- ✅ No claim for a direct `bun <script>`, `BUN_OPTIONS`, `NODE_OPTIONS` or a hostile installed bundle.
- ✅ No new parser dependency, home-made parser or Node search.
- ✅ No claim beyond Bun 1.4.5 and OpenCode 2.4.2 on macOS.

## Rabbit holes

- ✅ No Node search was added. Bun skips parse checks.
- ✅ OpenCode: the plan probe showed project plugins loading; the owner chose opt-in.
- ✅ `uv --version` and the doctor's Git path command ran nothing in the probed cases.
- ✅ The skip follows the process that would parse; marker tests show the two Node parse forms run nothing.
- ✅ Parse failures show fixed text. Other doctor paths still print raw errors (backlog).
- ⚠️ Surfaced: `doctor --fix` follows template symlinks. It is in earlier releases too. Not fixed.
- ⚠️ Surfaced: the upgrade tests run an older doctor, which leaves an OpenCode service running.
- ⚠️ Deferred as planned: the `package.json` script fallback and the runner switch by bare name.

## Verification

- `pre-ship-verify` before the ship records: exit 0; 2,562 tests, 2,560 pass, 2 skipped, 0 fail. The run after the records is in the [run record](../../runs/2026-11-27-fix-bun-project-preload.md).
- On the committed code: validator and doctor tests 138 pass on Node and on Bun; launcher 14 pass on Bun; plan searches and skill mirrors pass.
- Real doctor and validator over a project with a marker Graphify script and marker plugins, under Node and Bun: no marker, no OpenCode service afterwards.
- No build, typecheck, lint or i18n command exists in this repository.
- Audit: [audit-reshape.md](audit-reshape.md). Four reviews; each of the three with a planted defect caught it; no must-fix in the real change.
- Behavior cases: both passed, Claude, one run each; limits in the audit record. Other vendors not-run.

## Not independently reviewed or not run

- The last README and setup-validator guide edits.
- Linux, Windows and other Bun or OpenCode versions.

## Documents

READMEs, the workflow doctor guide, the setup validator guide and the workflow-doctor skill are updated. No design decision record: the rule is kept as a knowledge pattern.

## Followups

In [_followups.md](../_followups.md) under the three `fix-bun-project-preload` headings and build notes. The earlier Bun preload item is closed.

## Release

Draft pull request #18, stacked on #17 over #16, #14 and #13. Shipping closes the pitch; it does not merge it.
