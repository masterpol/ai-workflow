# Audit cycle 1: state-report-redesign

Dispatched: code (1, independent: no) | security (2: first INCOMPLETE, retry complete, independent: yes) | test (2: first INCOMPLETE, retry complete, independent: yes) | ux (1, independent: no, no shell tools) | cross-pitch (1, independent: no) | eval (n/a, no AI-prompt scope) | i18n (n/a)
Models: code, security, test, ux sonnet; cross-pitch haiku. Scratch copies #1 and #2 with planted canaries (label regex in `state-charts.mts:19`; exact `"monorepo"` match in `state-render.mts:194`). Records: `audit-records/*.md`, all pass `review-bench.mts record-check`.
Read-only: `review-bench.mts guard check` reports the repo changed during the audit; the changed set is this thread's own cycle-1 patches plus a concurrent `token-attribution` session. No reviewer wrote to the repo. One reviewer wrote a stray file under the OS temp directory (outside the repo); a fresh run is unaffected.
Independence limit: the code reviewer described the canary but cited a line 5 away from it (mechanical check false), so it is recorded `independent: no`; it returned findings, not a clean pass. The UX and cross-pitch roles have no canary path.

## Must-fix
None. Every "must-fix" a reviewer raised came from a planted canary in the scratch copy and was refuted against the repo (`grep` of `state-render.mts:194`, passing `LABEL_RE` tests).

## Should-fix (all fixed this cycle)
| ID | Source | File | Issue | Disposition |
|----|--------|------|-------|-------------|
| SE2 | security | state-pages.mts | `counts` object inherited `constructor`/`toString`; `__proto__` vanished | fixed (`Object.create(null)`), regression test added |
| T2 | tests | state-html.test.mts | monorepo test title claimed "never lists the tree" but asserted only CSS reads | fixed: asserts zero directory listings |
| TT2 | tests | theme/charts/html tests | 5 of 9 mutants survived | fixed: 3 tests added; `startsWith("mono")` mutant now fails the theme suite |
| U1 | ux | state-design.mts | `main nav a`, `summary` under 44px | fixed (`min-height:44px`) |
| U2 | ux | state-design.mts | link color on muted background not in `PAIRS` | fixed: `tr:target` has no muted background; `PAIRS` unchanged |
| U3 | ux | state-design.mts | chart labels about 7px at 360px | fixed: SVG hidden below 640px, data table stays |
| X3 | cross | state-structure.mts | sibling manifest scan unbounded | fixed: stops at 2 siblings, 200 entries per directory |

## Acknowledged / followups
- `writeSetInner` runs `mkdirSync(recursive)` before its symlink check (pre-existing, code and security reviewers): followup.
- Marker check uses `includes` anywhere in the file; `readSource` reads up to 1 MiB before the 64 KB slice (pre-existing).
- Small duplication: `esc`, unavailable chip, `isFact`, unused `h.CSP`, dangling lint comment.
- The structure page still renders `structure.tree` for a monorepo (spec scopes "never scans" to theme discovery).
- Sidebar height on mobile and the 640px chart fallback not viewed in a browser.
- Cross-pitch: `state-ai-authoring`, `state-deep-evidence` and `state-fragment-sanitizer` plan to edit the same files and docs; they are later parts of this epic and depend on this pitch. Merge order: this pitch first. Attribution: plan-named, not shared-diff.

## Evidence after fixes
`node --experimental-strip-types --disable-warning=ExperimentalWarning --test` on `state-html`, `state-theme`, `state-snapshot`, `state-charts`: `tests 200 / pass 200 / fail 0`. Skills untouched (`git diff --quiet 633adb3 -- .claude/skills ...` exit 0).

## Environment blocker (not from this pitch)
`setup-validator` and `workflow-doctor` now fail on `ai-workflow.toon` (gitignored): `workers[2]: codex,opencode,claude` lists three values for a declared size of 2 (`PARSER-UNRECOGNIZED array size [2] does not match 3 values`). The file was modified at 12:20 by something other than this thread; both checks passed earlier in this session.
