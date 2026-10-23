# Source-review supplement: state-report-redesign

Prepared 2026-10-22 from verified recovery sources. This is the durable record of the pitch bet and shipped 2026-10-19 as bundle 2.33.0 (big-batch) now that its done-work narrative is retired; no compact pitch-compression record exists. Results are historical evidence, not a new certification. Behavior now lives in the [state report guide](../../../ai-framework/integrations/state-report.md) and the [changelog](../../../CHANGELOG.md). Lessons: [prototype keys in counters](../../knowledge/issues/counting-untrusted-labels-in-a-plain-object-inherits-prototype-keys.md), [scratch copy must run its suites](../../knowledge/issues/an-audit-scratch-copy-must-run-its-own-suites.md). Design decisions: [project state report design](../../knowledge/decisions/project-state-report-design.md) and [bounded font discovery](../../knowledge/decisions/effective-sync-bases-and-bounded-font-discovery.md). Backlog: [followups](../../pitches/_followups.md), section "state-report-redesign leftovers". Contradictions between sources are kept as recorded under Historical contradictions.

## What shipped

Part 1 of 3 of the "state report v2" epic (owner request 2026-10-19: ugly HTML, deeper analysis, AI-authored diagrams); later parts are `state-fragment-sanitizer`, `state-ai-authoring` and `state-deep-evidence`. Problem: the report was plain linked pages of number tables with a gray fallback theme. Owner decisions: fix layout, typography, theme, navigation and charts; a single project uses its own theme, a monorepo uses the workflow default theme.

| Scope | Outcome |
|---|---|
| S1 | `state-test-helpers.mts` with markup-agnostic invariants (`assertInert`, `assertCspFirst`, `assertKnownMarkup`, `assertNavResolves`, `assertThemeContrast`); 71 tests, production untouched, mutant tests per assertion. Rewritten to plain throws after `workflow-doctor` flagged `node:assert` in a non-test file. |
| S2 | `structure.repoShape` detector with a 15+ case fixture matrix (OpenCode worker, applied by `git apply` because another session held dirty edits). |
| S3 | Slate/blue workflow default theme replaces the zinc fallback (name `FALLBACK` kept); monorepo never scans (spied fs). OpenCode worker via Orca reconcile. |
| S4 | `state-charts.mts` inline SVG bar charts, 17 tests; layout changed to horizontal bars after label overlap. |
| S5 | `state-design.mts` owns the only stylesheet and shell: CSP first, sidebar, responsive at 640px, print, dark mode; 72 `state-html` tests at the time. |
| S6 | Headline cards, four charts wired, five empty slots, `repoShape` to theme wiring. |
| S7 | `state-report.md` update and LOC/file gates, run inline because that file was dirty from another session. |

Files: 12 outside `.project/` (cap 13; pitch appetite 15 including CHANGELOG and VERSION); 414 production LOC added (cap 1,200). Code: [design](../../../ai-framework/scripts/state-design.mts), [charts](../../../ai-framework/scripts/state-charts.mts), [structure](../../../ai-framework/scripts/state-structure.mts), [theme](../../../ai-framework/scripts/state-theme.mts), [pages](../../../ai-framework/scripts/state-pages.mts), [render](../../../ai-framework/scripts/state-render.mts), [test helpers](../../../ai-framework/scripts/state-test-helpers.mts), [html tests](../../../ai-framework/scripts/state-html.test.mts), [chart tests](../../../ai-framework/scripts/state-charts.test.mts), [theme tests](../../../ai-framework/scripts/state-theme.test.mts), [snapshot tests](../../../ai-framework/scripts/state-snapshot.test.mts).

## Scope and contract

Detector precedence (fixed): strong signals mean `monorepo` (root `pnpm-workspace.yaml`, root `lerna.json`, `package.json` `workspaces` as a non-empty string array or `{packages:[non-empty]}`); otherwise two or more sibling manifests (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml` under `packages|apps|libs|services|modules/<child>/`) mean `monorepo`; `turbo.json` or `nx.json` alone, or anything ambiguous or unreadable, means `single`. Evidence is capped at 6 names, there is no upward walk, and the only content read is one bounded (64 KB, symlink-refusing) root `package.json`; the "tree scan reads no file contents" test was narrowed to allow exactly that file. Chart contract: ids from a fixed set, non-negative safe integers, labels matched against `^[A-Za-z0-9 ._/-]{1,40}$` and cut to 24 characters (else `other`), at most 8 bars plus "other (N more)", `<title>`/`<desc>` plus a data table, at most 4,096 bytes per chart, deterministic output. Shell at most 10,240 bytes empty; CSP meta is the first `<head>` child; charset stays in the first 1,024 bytes. Render treats only the exact string `"monorepo"` as monorepo, so a hostile `state.json` can at most force the safe default theme. `SLOT_NAMES` are `overview`, `architecture`, `history`, `risks`, `tokens` (empty without fragments).

Plan corrections found against the code: (1) the snapshot has no token totals or model dimension, so token charts became completions by vendor; (2) no folder sizes, so subfolders per top-level folder; (3) the `workspaces` signal needs a content read; (4) CSP was not first in `<head>`; (5) `render()` called `discoverTheme(root, deps)` against the signature `(root, options, deps)`, so injected deps never applied (fixed in S6); (6) the markup allow-list regex missed SVG camelCase attributes; (7) `state-ai-fragments` was split into `state-fragment-sanitizer` and `state-ai-authoring`.

Critique (2026-10-19, five perspectives, advisory): skeptic S1-S4 (no monorepo scan; precedence and ties to `single`; CSP first and no `url()`; invariants before test rewrite), knowledge-historian R1 (stale "quoted fonts rejected" rule superseded), appetite A1-A3, cross-pitch X1-X11 (this pitch ships first among the state pitches; token cards read the existing metrics section and show `unavailable` until `token-attribution` extends it; rollout dry run re-run afterwards).

## Standing constraints

- No script, external load, web font, network call, `style=` or `url()` in a generated page (asserted by `assertInert` on all 7 pages).
- No edits to `status.md`, `runs/` or lifecycle records from the report.
- No new snapshot facts beyond the additive `structure.repoShape`; `schemaVersion` stays 1.
- Project CSS text is never copied; theme values are parsed and re-emitted.
- Skills and mirrors were untouched (`git diff --quiet 633adb3 -- .claude/skills ...` exit 0).
- Honest deviation: the token-share and folder-size charts were replaced because the snapshot holds no token or size data.

## Audit triage

One cycle (code, security x2, test x2, ux, cross-pitch; eval and i18n not applicable), models sonnet and haiku, with planted canaries in two scratch copies (label regex in `state-charts.mts:19`; exact `"monorepo"` match at `state-render.mts:194`). Every reviewer "must-fix" or "high" came from a canary and was refuted against the repo. The first security and test runs were INCOMPLETE (scratch copy could not load `state-html`/`state-snapshot` suites) and were retried as sec2/tests2. The code reviewer cited a line five away from the canary, so it is recorded `independent: no`; UX and cross-pitch have no canary path. No reviewer wrote to the repo. Seven should-fix findings were fixed:

- SE2: `counts` object inherited `constructor`/`toString` and lost `__proto__`; fixed with `Object.create(null)` and a regression test.
- T2: monorepo test title overclaimed; it now asserts zero directory listings.
- TT2: 5 of 9 reviewer mutants survived (focus/print CSS, `startsWith('mono')`, singular "1 row omitted", tie-break order); 3 tests added.
- U1: `main nav a` and `summary` under 44px; `min-height:44px`.
- U2: link on muted background (`tr:target`) was not in `PAIRS`; the muted background was removed.
- U3: chart labels about 7px at 360px; SVG hidden below 640px, the data table stays.
- X3: sibling manifest scan was unbounded; it now stops at 2 siblings and 200 entries per directory.

Refuted: C1, C4 (9 rects for 12 rows is spec: 8 plus "other"), S1, SE1, T1, TT1. Cross-pitch X1: `state-ai-authoring`, `state-deep-evidence` and `state-fragment-sanitizer` edit the same files; merge order is this pitch first.

## Verification history

- Four state suites (`state-html`, `state-theme`, `state-snapshot`, `state-charts`): 200 pass / 0 fail, up from a 170 baseline (70 + 18 + 82), on Node 24.21.0; 191 at the S5 merge and 197 at S6.
- Full Node suite: first run 1821 tests, 1817 pass, 3 skipped, 1 failure (`old install upgrades...`, a 111 s timeout under load); retried alone (pass, 34 s) and in full: 1837 tests, 1834 pass, 0 fail, 3 skipped. Bun not run.
- `setup-validator` READY, `workflow-doctor` READY WITH WARNINGS, `graphify --check` CLEAN.
- During audit, `setup-validator` and `workflow-doctor` failed on the gitignored `ai-workflow.toon` (`workers[2]: codex,opencode,claude`, `PARSER-UNRECOGNIZED array size [2] does not match 3 values`), modified by another actor at 12:20; both passed earlier and at ship. Not caused by this pitch.
- Deviations during build: S2 applied by `git apply` (another session's dirty overlap), whose commit `cf8ecfe` later swept the S2 test and `state-report.md` edits (content intact, attribution mixed); S7 inline for the same reason; gates measured against `633adb3` because `git merge-base HEAD main` is far behind.

## Contract and docs

[state-report.md](../../../ai-framework/integrations/state-report.md) was updated for layout, charts, slots, `repoShape` and theme precedence (monorepo always uses the workflow default theme and is never scanned). The `/state` skill text "theme is rediscovered from the project's own CSS" is stale for monorepos; skills were frozen by the pitch, the CLI preview line names the monorepo reason, and updating the skill and mirrors is a followup. The template `reports/README.md` stayed valid (page names unchanged).

## Limits and open items

Backlog lives in [followups](../../pitches/_followups.md) under "state-report-redesign leftovers (2026-10-19)":

- Update the `/state` skill and mirrors (medium).
- `writeSetInner` runs `mkdirSync(recursive)` before its symlink check (low, pre-existing).
- Ownership marker matched with `includes` anywhere in a page; `readSource` reads up to 1 MiB before the 64 KB slice (low, pre-existing).
- Small duplication: `esc`, three unavailable chips, `isFact` twice, unused `h.CSP` (low).
- The structure page still renders `structure.tree` for a monorepo (low; decide whether the no-listing rule should cover it).
- Not viewed in a browser at 360px (sidebar height, chart fallback) or in print (static checks only; sidebar wrapped to about 130px unverified).
- The `old install upgrades with its own bundle-sync` test is flaky under load (111 s, passes alone).

## Historical contradictions

- Files: pitch said at most 15 (projected about 14); plan counted 13 across scopes plus CHANGELOG and VERSION = 15; shipped record says 12 outside `.project/` against a cap of 13.
- Production LOC: plan estimated about 850; actual 414.
- Pitch charts (token share by vendor/model, folder size) differ from shipped (completions by vendor, subfolders per folder).
- Pitch scope owners (S1 theme, S2 test churn, S3 charts) predate the plan numbering (S1 helper, S2 detector, S3 theme, S4 charts).
- The shipped note says canaries were caught by the security and tests retries; the code reviewer's canary was not caught mechanically.
- The wireframe shows "workflow 2.32.1" as sample text; the release is 2.33.0.

The final hill chart is kept byte-identical in the [hill run copy](../../runs/2026-10-19-state-report-redesign-hill.md); test counts 71, 191 and 197 are summarised above.
