# Source-review supplement: state-quoted-fonts

Prepared 2026-10-22 from verified recovery sources. This supplements the unchanged [compact record](../pitch-compression/state-quoted-fonts.md) for the 2026-09-26 quoted-font and same-file variable fix. Results are historical evidence, not a new certification.

## Scope and problem

Projects whose stylesheets used ordinary quoted font families or a local CSS font variable saw the state report fall back to its default typeface. The small-batch pitch (about 3 files, up to 300 lines) had one scope, S1. The plan was approved on 2026-09-26 and ran sequentially, because discovery and renderer validation share one grammar. It touched the [theme parser](../../../ai-framework/scripts/state-theme.mts), the HTML test and the state-report contract document. The impact analysis rated risk medium; the renderer and snapshot tests consume the parser. The design lives in the [decision](../../knowledge/decisions/effective-sync-bases-and-bounded-font-discovery.md).

## Review and verification chronology

The code review covered both the sync and font changes and ran 101 tests. A separate security reviewer inspected all five changed implementation modules, and a separate test reviewer ran the combined suites. Final verification covered twelve relevant suites (286 tests, 285 passed, one Linux-only test skipped on macOS). The S1 build evidence was 85 HTML and snapshot tests. These counts have different scopes and none supersedes another. Doctor (746) and validator (21) checks are ship-time values.

## Mutation proof

The plan required a mutation check: bypassing the family-name grammar must fail the hostile-font test. It did (exit 1), so the parser grammar, not only renderer validation, is exercised.

## Historical naming

Sources refer to `state-theme.js` and the matching `.js` tests; the current files are `.mts` modules in `ai-framework/scripts/`. The audit text saying no ship approval had been received predates the approval recorded at the 2026-09-26 ship gate.
