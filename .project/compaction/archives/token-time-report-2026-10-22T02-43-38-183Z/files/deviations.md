# Deviations: token-time-report

## S1 — 2026-10-21

- Usage projection admits the existing reader's 52 pitch buckets and 18 phase buckets, including overflow labels; the token projection retains the planned 51/16 limits. No source schema changed. The original plan applied token caps too broadly to the usage projection.
- S1 actual size is 869 lines versus the 700 estimate after required safety/history/coverage cases. Whole-pitch projection is now 1,465 lines; stop and revise/split before exceeding 1,500.
- Independent review fixes followed the worker's own successful completion inside the same authorized file set. Final evidence refers to coordinator reruns, not the worker's pre-fix 24-test report.

## S2 — 2026-10-21

- CLI uses mutually exclusive preview-format and apply modes: `--format <format>` previews one format; `--apply` publishes all formats and prints a publication summary. Combining them is a usage error rather than silently ignoring a selected format. The help and S3 contract must state this explicitly.
- Static report UX retains the approved multi-table structure, internal horizontal scrolling and a neutral UA light/dark stylesheet; no frontend brand system or browser geometry check is claimed. See S2-evidence.md.
- S2 delta is 491 lines, bringing report code/tests to 1,360. Whole-pitch projection with S3 is 1,456; the 1,500-line cap remains unchanged.
- Generated graph/index were rebuilt after this substantial code addition; generated artifacts are administrative, not additional implementation modules.

## S3 — 2026-10-21

- First full Node run had one unchanged geometry timing-bound failure while graph rebuilding overlapped it. The unchanged test file and then the identical full command passed after background work finished; no parser/test/runtime changes. Both attempts remain in evidence.
- S3 used 67 changed lines across its three files. Implementation/test/contract total is 1427; release metadata remains deferred to ship with 73 lines available under the cap.

## Audit cycle 1 — 2026-10-21

- Owner authorized Orca repair. Corrected reviewer authorized paths and repaired review-bench snapshot read/write size agreement, with 34 Node and 34 Bun tests passing. This adds two implementation/test files within the unchanged appetite.
- All five scratch canaries were caught. Code, security and coverage reviewers skipped required generic rule bodies; they receive one fresh narrowed retry. Security also read one live-file diff despite its scratch-only prompt; its first-pass independence is not claimed.
- Confirmed and patched Markdown bare-autolink escaping and repeated provisional warnings beside both time tables. Tightened guard-mutant assertions to verify an actual successful publication instead of matching scenario labels.
- Trace-class credential exposure is refuted for the CLI path: workflow-metrics-state.mts:484-485 restricts class to start and the fixed transition enum before projectUsage runs. Valid JSON snapshots of the wrong shape fail closed; cleaner diagnostics are deferred as low-impact tooling polish.
- A separate stale-source banner is deferred: Sources is already the first table, with per-source status, timestamp and fixed reason; a repeated banner is not required by the approved contract. Optional back navigation, display-unit formatting and the single-row time-table row-header polish are acknowledged, with the existing internal-tool UX exception retained.
- First post-repair full Node run: 2469 pass, 2 fail, 3 skips. Unchanged runtime descendant-output test read a partial readiness JSON; unchanged geometry test took 1589.445334ms against 1000ms. The unchanged two files passed 216/216 in isolation. Full verification remains pending a repeat after source patches; thresholds and runtime settings are unchanged.

## Audit recovery closeout — 2026-10-21

- Final guard repair also excludes secret-shaped paths before lstat/read. A fake-filesystem regression fails on any attempt to read its synthetic credential-shaped entry. Node and Bun each pass 35 guard tests. The retry repository comparison accounts exactly for the coordinator source/test repair and eight newly excluded paths; no reviewer writes were detected.
- All nine reports caught their planted canary and all nine durable review records pass record-check. First-wave security's live diff read violated its scratch-only instruction; no live writes occurred and independence is not claimed. Required reviewers left missing checks after the one fresh retry. Their reports remain incomplete, not clean; no author-run result replaces them.
- The code retry claims plan.md and workflow-metrics.md were absent. The coordinator independently verified those files exist in its scratch copy; the absence claim is refuted, while the missing review remains unresolved. The retry intentionally omitted deviations.md to avoid showing earlier findings; accepted limits were provided directly in its brief.
- Follow-up candidate TTR-A1: harden review-bench git execution against project fsmonitor and other config-driven execution. Its existing runner is used here only on this trusted checkout; do not treat it as safe for an untrusted repository. This is a confirmed medium pre-existing issue, deferred because safe config/environment handling needs its own reviewed contract and regressions.
- Follow-up candidate TTR-A2: review-bench count should strictly validate --max and use NUL-delimited git file names. Current appetite is independently calculated from explicit paths and numstat; neither fragile count path is used as approval evidence.
- Follow-up candidate TTR-A3: fix inside() accepting in-root names beginning with '..' as outside, and map raw missing-root filesystem diagnostics to fixed errors. Both are pre-existing operator-input paths; all audit snapshot paths here are actual outside temp paths. Malformed-snapshot diagnostics and canary/record parser strictness belong with this bounded tooling hardening.
- The target-mtime guard survives mutation. Retain it as a redundant conservative refusal layer: inode/device/size/content protect publication, and unchanged-byte rewrites are harmless. This is an acknowledged survivor, not evidence that every layer has an independent failing test.
- Optional unavailable-time notes beside every time table and moving Path to the first row-header column are deferred as TTR-A4 static-report usability polish. Source reasons remain in the first table, unavailable values remain explicit, and the approved contract requires neither sticky columns nor per-table repetition of missing-source reasons.
- Final implementation/test/contract size is 1,479 changed lines across 11 files. The unchanged 1,500-line cap leaves 21 lines for the deferred release metadata; VERSION and CHANGELOG remain untouched. The new secret-exclusion patch has author-run regression/full-suite evidence but still needs independent review.
- Final full Node retry passes 2,472 tests with zero failures and three existing skips (2,475 total; 90.717s runner duration). The prior two-failure run and isolated 216-test pass remain preserved. Current report modules retain 100% line coverage. Final audit status remains open for missing independent evidence, with no ship advancement.

## Cohesive module size exception — audit addendum, 2026-10-21

This records the existing implementation structure, without changing its behavior or appetite. The generic 80-line utility limit is exceeded by these cohesive units:

- `ai-framework/scripts/flow-join.mts` (322 lines): one bounded projection/join transaction shares typed source status, exact/source-specific identity, checked accumulators, omission counts and the single FlowReport output. Splitting per source/type would distribute the bounds and identity proof across extra modules without an independent consumer.
- `ai-framework/scripts/flow-report.mts` (223 lines): one guarded read/publication transaction shares pinned directories, target and stage identities, cleanup ownership and incomplete-publication accounting. Splitting per filesystem operation would fragment its recovery path and make identity checks harder to audit together.
- `ai-framework/scripts/flow-render.mts` (122 lines): one shared table model feeds all three formats, preserving status/window/timing semantics with format-specific escaping and ownership markers. Splitting per table/format would duplicate or hide that common proof surface.

The alternative of mechanical per-function/per-type extraction was considered and rejected for these reasons; no concrete shared consumer justifies it. The independent code reviewer accepted the substantive cohesion rationale and requested this ownership record in both plan.md and deviations.md. Security, testing and the hard 15-file/1,500-line cap remain binding; actual implementation/test/contract size is 1,479 lines across 11 files.
