# Deviations: state-deep-evidence

## Cohesive-unit exceptions (coding-standards.md)
- `state-graph.mts` (237 lines, limit 80): one validated node Map, one degree accumulator, one limits record; splitting would export the unvalidated index. `bindStateGraph` is a closure binder over 50 lines (same pattern as `bindStateStructure`); every inner function is 50 lines or fewer.
- `state-history.mts` (259 lines): one per-pitch join, one bounded line scanner, one truncation policy.
- `state-snapshot.mts` (494 lines before this pitch): at most 160 added lines; followup to split `metrics` and `tokens` out.

## S1 deviations (worker-reported, parent verified exits)
1. `createStateGraph(deps)` takes `RuntimeDeps & { scrub }` (circular import otherwise). S5 passes `{ ...deps, scrub }`.
2. `architectureFacts` / `riskGraphFacts` take a trailing `{ treeTruncated?, repoShape? }`; with `repoShape: "monorepo"` the dominant-module split is skipped.
3. The index may be `{ unavailable }`; both fact functions return unavailable facts, `knowledgeEntries` returns `[]`.
4. Split rule counts the module's own direct files as one group, so a split needs at least two groups (log.md's "two tree children" wording did not match its own numbers). Result on this repo matches the spike.
5. Stale knowledge compares whole days: `floor(days) > 60`. `testFiles.code` counts non-test files; `ratio = test / code`, 3 decimals.

## S2 deviations
1. `audit` is a sub-field `{ value: { cycles, mustFix }, availability, reason? }`; audit-cycle-N archives give cycles = name count, `mustFix: null`, availability `partial`.
2. `ScanLimits.markdownBytes` caps text inside the module too; over-cap downgrades the field to `partial` (item or followups: `stale`).
3. Slug allow-list rejects non-string slugs; items sorted by slug; archive fallback covers `audit.md` and `pitch.md` only.
4. Tests use an in-test `readMarkdown` emulating `readSource` (the real one is not exported).

## Open for S5
Pass the real `readMarkdown`, `pitches.items`, `doneWork` and `knowledgeEntries` output into `historySection`; make `pitchesSection` emit `(invalid name)` for non-slug directories.

## S4/S5 deviations
1. **Citation path.** Plan wrote `risks.openFollowups.value.open`; `checkCitations` unwraps facts before each segment, so the bindable path is `risks.openFollowups.open` (likewise `tokens.totals.total`; only sub-fields that are not facts, such as `history.items.N.audit.value.mustFix`, need `.value`). The pitch's `<data value="risks.openFollowups.value">` example is wrong for the same reason. S7 documents the unwrapped paths.
2. **`structure.tree` still lists scrubbed directory names** (pre-existing, outside this pitch). The end-to-end injection test asserts on every section this pitch adds or hardens (`pitches`, `architecture`, `history`, `risks`, `tokens`) and keeps a control proving the tree still carries the name. Followup: tree names that fail a conservative charset should be dropped or replaced.
3. **Thrown-builder isolation.** Not forced in a dedicated test: no seam makes `structure` or `historySection` throw without a test-only hook. Isolation relies on `section()` (existing "broken source only marks its own section" test) plus the broken-graph test naming its dependency. `architecture.modules` reports "depends on structure" only when `structure.tree` is absent.
4. **`state-snapshot.mts` grew 178 lines** (494 to 672) against the planned 160 (S4 flows and by-model rows are the bulk). Followup unchanged: move `metrics` and `tokens` into their own module.
5. **Existing test hygiene.** "writeAtomic refuses a pre-planted temp path" overrode `fs.writeFileSync` on a shared deps object and never restored it; it now restores in `finally`. Without that, any later test that writes a snapshot hits the planted-temp path. Test-only change.
6. **Root `package.json` is now read twice** (repoShape and entryPoints); the guard mutant injects its extra read once.
7. `architecture.packages` ships `unavailable` ("deferred to followup pitch state-monorepo-packages") until the S7 LOC gate decides S6.

## S7 deviations
1. **LOC cap gate fails: 1636 against 1350.** Not remedied by the plan's cuts (S6 already cut; `history.dates` cannot close the gap). Open for the owner: accept the overage (file cap 13 of 15 holds) or direct cuts.
2. Docs were edited inline rather than by a `fast` subagent.

## S8 deviations
1. OpenCode not run (provider quota); recorded `not-run` rather than substituting a model, which would break the cross-vendor comparison.
2. S8 ran as three author agents plus two grader agents (not one per vendor with in-agent grading); the fixtures and seeded fragments came from a shared builder. Author runs used Claude Code subagents, not Orca workers.
3. `database-deployment-claim` and `risks-capped-lists-are-not-totals` cannot match their case text exactly (see live-runs.md); graded against the real snapshot.


## Audit deviations and dispositions (2026-10-21)

1. The owner's `orca=noraml` invocation was interpreted as `orca=normal`; normal startup was verified for this invocation only. Native reviewers replaced no live Orca worker: the preceding refused dispatch had launched none.
2. Added two behavioral regressions and three small production validation changes. Measured added LOC is now **1667**, not the historical S7 measurement of 1636; the cap of 1350 is still unmet. The new tests were proven red before the patches and green afterward; no existing assertion or timing bound was weakened.
3. The deterministic injection case now explicitly describes only new deep-evidence sections and hardened pitch facts. Its earlier package-name vector was not implemented because S6 was cut, and existing structure.tree directory labels were already excluded by the mapped test. This corrects the coverage claim; it does not establish full-snapshot prompt-injection resistance.
4. `review-bench guard check` refused its own 3,400,558-byte generated snapshot. Comparing complete before/after snapshots verified identical HEAD, status and hashes instead. Named deferred tooling candidate: **review-bench-large-snapshot-read-cap**; changing that shared helper is outside this pitch.
5. Prospective release-metadata overlap with test-execution-performance is deferred to serialized ship order and a fresh ownership check when its implementation plan exists. No current implementation collision was found. VERSION/CHANGELOG remain reserved for the pitch's eventual ship; this audit does not declare the unfinished feature released.
6. Existing live AI failures, unrun vendor rows, scope cuts, snapshot growth exception and tree-label followup remain open as previously recorded. The request to resume and finish was not treated as acceptance of those risks. `audit.md` owns the current synthesis and gate.


## Owner-approved closure (2026-10-21)

The owner approved the 1667-added-line appetite amendment and the recorded live failures/unrun rows, then separately approved the documented direct-command verification fallback and closing the pitch. Those are explicit accepted exceptions, not repaired quality measurements. v2.39.0 closes the pitch locally. The current scope has no unaccepted must-fix; the package-less wrapper, live reliability, deferred package map, and shared review tooling remain followups. Followup and knowledge details are in SHIPPED.md.
