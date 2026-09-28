# Compaction record: state-quoted-fonts

Prepared 2026-09-26. This record preserves closure evidence and constraints; the recovery archive retains the full source history.

Durable decision: [[effective-sync-bases-and-bounded-font-discovery]].

## Section 1: SHIPPED.md#scope-reconciliation

S1 accepts bounded quoted family tokens and one same-file variable hop, emits canonical values and revalidates at rendering.

## Section 2: SHIPPED.md#verification

The ship-time combined run reported 286 tests: 285 passed, zero failed, one unrelated Linux-only collector test skipped on macOS. The affected sync/HTML/snapshot suites were rerun at closure. Workflow doctor (746 checks), setup validator (21 checks), graph check and git diff --check passed. Build, typecheck, lint and i18n commands are not configured.

## Section 3: SHIPPED.md#audit

Fresh read-only code, security, test and cross-pitch reviews found no unresolved findings for this slice; code review ran 101 tests. UI, i18n and AI eval were inapplicable. independent-rereview-catch-up must review settled source and rerun affected suites after later fixes; it had no overlapping implementation edit in this reviewed slice.

## Section 4: SHIPPED.md#no-gos-honored

CSS remains bounded and validated; no external stylesheet loading, general CSS evaluation, historical deletion or application changes. Shared sync slice protects customization and overwrite policy.

## Section 5: SHIPPED.md#rabbit-holes-and-deviations

No implementation deviation. Canonical double quotes preserve family semantics. Escapes, punctuation, nested references and cross-file lookup are rejected. Final declarations win within each mode; dark may inherit light/root. File discovery precedence and final safeTheme validation remain intact.

## Section 6: SHIPPED.md#knowledge-and-followups

Design is preserved in [[effective-sync-bases-and-bounded-font-discovery]], superseding the old quoted-font rejection without rewriting it. No new followup; production safety pitches remain incomplete.

## Section 7: SHIPPED.md#delivery

User selected 1 at the 2026-09-26 ship gate. Workflow records closed; no Git commit, merge, deployment or publication occurred. path-safety-hardening and collector-robustness remain incomplete; this approval does not ship them. No new followup was added.

## Section 8: pitch.md#no-gos

No weakening renderer validation or contrast checks, no external stylesheet loading, and no changes to report facts or lifecycle records.

## Section 9: pitch.md#rabbit-holes

Resolved bounded one-level same-file lookup and parsing quotes as syntax. Planner owned source-order and light/dark precedence, covered by tests. General CSS evaluation, cross-file variables, color var() and new color spaces remain excluded.

## Section 10: audit-cycle-1.md

Fresh read-only code, security, test and cross-pitch reviews found no unresolved findings for this slice; code review ran 101 tests. UI, i18n and AI eval were inapplicable. independent-rereview-catch-up must review settled source and rerun affected suites after later fixes; it had no overlapping implementation edit in this reviewed slice. Quoted families, one-hop lookup, renderer rejection, CSP and contrast checks passed. The historical pre-gate audit status is superseded by SHIPPED.md approval.

## Section 11: log.md#s1-2026-09-26

85 HTML/snapshot tests passed, zero failures: canonical and numeric quoted names, hostile renderer values, one-hop lookup, declaration order, mode override, cycles, nested/unresolved/cross-file references and fallbacks. Module load exited 0. An in-memory grammar-bypass mutant caused the hostile-font test to fail (exit 1); markup/CSP and contrast tests passed.
