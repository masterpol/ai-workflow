# Source-review supplement: state-deep-evidence

Prepared 2026-10-22 from verified recovery sources. This is the durable record of the pitch bet 2026-10-19 and shipped locally 2026-10-21 as bundle 2.39.0 (big-batch) now that its done-work narrative is retired. No compact pitch-compression record exists. Results are historical evidence, not a new certification. Contract: [state report guide](../../../ai-framework/integrations/state-report.md) ("Deep evidence"). Code: [graph](../../../ai-framework/scripts/state-graph.mts), [history](../../../ai-framework/scripts/state-history.mts), [snapshot](../../../ai-framework/scripts/state-snapshot.mts), [structure](../../../ai-framework/scripts/state-structure.mts); dataset [state-deep-evidence](../../evals/datasets/state-deep-evidence.json). Lessons: [scrubbing bypass](../../knowledge/issues/snapshot-metadata-bypassed-output-scrubbing.md), [guard snapshot cap](../../knowledge/issues/review-guard-snapshot-can-outgrow-its-reader.md), [package-less ship wrapper](../../knowledge/issues/package-less-bundle-ship-wrapper-cannot-select-checks.md), [state report design](../../knowledge/decisions/project-state-report-design.md), [allow-list at ingest](../../knowledge/patterns/allow-list-untrusted-labels-at-ingest-and-at-render.md), [parse and re-emit](../../knowledge/patterns/parse-untrusted-values-and-re-emit-them.md). Backlog: [followups](../../pitches/_followups.md). Run snapshots: [build log](../../runs/2026-10-21-state-deep-evidence.md) (identical to the pitch log) and [hill](../../runs/2026-10-21-state-deep-evidence-hill.md). Conflicting figures are kept as recorded under Historical contradictions.

## What shipped

State snapshots gain four additive top-level sections, `architecture`, `history`, `risks` and `tokens`, in release 2.39.0 (2.38.0 before). `schemaVersion` stays 1. Inputs (graph, history records, root manifest) are bounded and guarded; missing data is `unavailable`, never zero; entry-point paths must pass scrub equality; unsupported token-schema values are never copied into rejection notes; graph degree measures connectivity, not risk. No page rendering, skill or hook behavior changed.

| Scope | Result |
|---|---|
| S1 graph | Validated index, agreement/age/cap gates, modules/imports, graph-derived risks; 237 lines, 20 tests, 6 of 6 mutants killed |
| S2 history | Bounded record scanners, exact-slug archive joins, unavailable/partial semantics; 259 lines, 18 tests, 5 of 5 mutants killed |
| S3 entrypoints | Safe root main/bin paths; allow-list read-guard test; audit added scrub equality |
| S4 tokens | Copied totals, usage qualifiers, bounded model/flow rows, safe slug joins; 3 of 3 mutants killed |
| S5 assembly | One shared graph read and one token read, isolation, budgets, compatibility, dataset mapping; 5 of 5 mutants killed |
| S6 monorepo packages | Cut; `architecture.packages` is `unavailable`; followup state-monorepo-packages |
| S7 contract | state-report.md "Deep evidence" section; LOC amendment accepted |
| S8 live matrix | Evidence record with accepted risk (see Live evaluation) |

File budget: 13 of 15 authored files (pitch projected 11); added lines 1667 against the 1350 cap.

## Problem and corrections

The report's AI slots had nothing to cite for architecture, history, risks and tokens, so they would say nothing or invent. The part is 4 of 4 of the "state report v2" epic, landing after state-report-redesign S2 (`repoShape`), state-ai-authoring and token-attribution S5 (token snapshot revision 3). Corrections found against the code: the snapshot kept per-vendor counts only (lifetime tokens and per-model rows were dropped); `SUPPORTED_METRICS_SCHEMAS` is the token snapshot's version set, not the state snapshot's; degree is computed in-process from `links` (no Graphify or `uv`), matching the GRAPH_REPORT top two (RuntimeDeps 144, createNodeDeps() 131); TODO density needs source contents so it is `unavailable`; structured audit counts exist only in a few archives (10 of 37 had `audit.md` in three-plus heading styles) so must-fix counts are mostly `unavailable`; knowledge nodes carry source/created/updated so no file read is needed.

Plan-time corrections: `structure.tree` lists directories only (depth 3, 500 entries), so graph/tree agreement is a directory-prefix check (133 of 135 checkable files on this repo); six junk code `source_file` values (`node:fs`, `//u006eode:fs`, string-concatenation artifacts) needed a charset allow-list `^[A-Za-z0-9._@+/-]{1,300}$`; `_followups.md` has no single resolution marker so the fact counts sections (45 sections, 47 KB), not items; the existing `pitches` section copied non-slug directory names, so it now emits `(invalid name)`; no resolver export existed, so history joins on slug only and never calls the hook-time resolver; `lifetime.tokens.total` (6,415,679) excludes `cacheRead` (155,768,150) and every Claude model row has `reportedUsageCount: 0`, so tokens are copied, never summed, and `null` when unreported; file-node degree (types.mts 123, node.mts 111, test-helpers.mts 98) is excluded from most-connected; cases moved to their own dataset because the sanitizer pins an exact 22-case partition of state-ai-fragments.json; the dataset `enforcedBy` for `old-snapshot-version-skew` named the wrong module (the `unknown-fact` rejection is `checkCitations`).

## No-gos and constraints

- No Graphify, `uv`, `git`, project script, test or network execution by collectors; graph.json and manifests are untrusted data.
- No reading of source contents, transcripts, secret-named files, or archive files other than `files/{audit,pitch}.md`; `audit-cycle-N.md` are counted by name only.
- No count inferred from prose; no 0 where a value is unavailable.
- No edit to `state-render.mts`, `state-pages.mts`, `state-html.test.mts`, the `/state` skill or mirrors, the shared fragment dataset, hooks, or the audit/ship/log formats (logged as a followup).
- No schemaVersion bump, YAML/TOML parser, TODO/LOC/coverage scan; the root `package.json` is the only manifest read.
- Pitch file projection (11): state-snapshot, state-structure, state-graph (new), state-history (new), their tests, state-report.md, the dataset, CHANGELOG, VERSION.

## Design decisions

- Version stays 1 (additive keys; precedent in state-report.md). A bump would force renderer and fixture sweeps (the 98-stale-tests issue). Contract test "schemaVersion stays 1: additive keys only" with frozen `PRE_PITCH_PATHS`; older snapshots lack the keys and cited new paths fail as `unknown-fact`.
- Graph: parsed once (64 MiB shared with knowledge; 16 MiB cap for deep evidence), 50k nodes / 200k links cap with `limits.truncated`; per-element validation, Map or null-prototype storage, unknown endpoints ignored; relative paths, no `..`, no backslash, `isSecretName` and scrub equality per component; `.graphify_root` never read; named "graph degree", never "god nodes". Agreement thresholds 0.9 / 0.5 / 10 files; stale after 7 days; `built_at_commit` kept only as 40 hex.
- Module key rule (spike on this repo: 151 validated code files; `ai-framework/scripts` 124, 83%): first two directory segments; root files in `rootFiles`; a module with more than 60% of files and two or more tree children with code is split one level deeper (max three segments); kept only if its key is a tree path; monorepo uses package directories.
- Record formats: only `## Must-fix (cycle N)` and `## Cycle N` with `### Must-fix` are parsed; anything else is `unavailable`, never 0; `mustFix` is a number only when every cycle has a table, refuted rows excluded. Linear line scanners, no regex over whole files, timing tests at 64 KB and 1 MiB.
- Budgets: architecture and history 256 KB each, risks and tokens 32 KB each; shrink lists, then counts, marked `stale`; global 960 KiB shrink order risks, history, architecture, tokens against the renderer's 1 MiB read cap.
- Ownership rulings: this pitch owns record-derived counts and token totals/by-model rows; token-time-report owns event-derived transitions and per-flow rows. Order: redesign S2, token-attribution S5, then this pitch.
- Risks pushed to plan with owners: manifest reads loosening the read-guard test (re-narrowed to an allow-list with mutants), token flows join (E2b decides), flat-layout module key (spike), contention on state-snapshot/state-structure/state-report.md. Deferred: TODO counts, LOC per file, coverage, YAML/TOML parsing.

## Critique rulings

Run 2026-10-19 (advisory): S4 graph/tree agreement; S5 hostile-graph validation; S6 additive-only versioning; DE-1 linear scanners; separate dataset (X1); record-derived counts owned here (X2); single resolver owner (X3, later found not exported); `state.json` owns token totals (X4); serialize state-report.md and changelog edits (X7, X15, X16). Owner chose Bet on 2026-10-19.

## Plan and exit criteria

Plan at 633adb3, build base d225ce5. Entry gate E1-E6 (repoShape landed, token revision 3, flows documented, `checkCitations` exported, state-ai-authoring shipped, green base, contention). Scopes S1/S2 ran in isolated worktrees, S3-S5 inline, S6 cut by default if LOC over 1240, S7 doc and LOC gate, S8 live matrix (grader other than author, seeded known-bad per case, threshold 2 of 2 runs per executed case, drop over 0.3 blocks ship). Blast radius reviewed for the renderer, pages, html tests, the read-guard test, token metrics, determinism, `writeSnapshot` unchanged detection, `checkCitations`, token-time-report and doctor/validator entry lists. Every scope had at least one machine-checkable exit and mutant proofs (in-memory mutant method: baseline passes in the same harness before each kill).

## Build deviations

- Cohesive-unit exceptions: state-graph.mts 237 lines (limit 80; one validated Map, one degree accumulator, one limits record; `bindStateGraph` closure binder over 50 lines, inner functions 50 or fewer); state-history.mts 259 lines (one join, one scanner, one truncation policy); state-snapshot.mts grew from 494 to 672 lines (+178 against a planned 160), followup to split metrics and tokens out.
- S1: `createStateGraph(deps)` takes `RuntimeDeps & { scrub }`; fact functions take a trailing `{ treeTruncated?, repoShape? }` and skip the dominant-module split for monorepos; an unavailable index gives unavailable facts and empty knowledge entries; split rule counts a module's own direct files as one group; stale knowledge uses whole days (`floor(days) > 60`); `testFiles.code` counts non-test files, ratio to 3 decimals.
- S2: `audit` is a sub-field `{ value: { cycles, mustFix }, availability, reason? }` (archive `audit-cycle-N` names give cycles with `mustFix: null`, `partial`); `markdownBytes` cap applies inside the module; slug allow-list rejects non-strings and items sort by slug; archive fallback covers `audit.md` and `pitch.md` only.
- S4/S5: citation path is `risks.openFollowups.open` and `tokens.totals.total` (facts unwrap before each segment; only non-fact sub-fields such as `history.items.N.audit.value.mustFix` need `.value`); `structure.tree` still lists scrubbed directory names (pre-existing; end-to-end injection test covers only sections this pitch adds or hardens, with a control that the tree still carries the name); thrown-builder isolation relies on `section()` plus the broken-graph test; a pre-existing "writeAtomic refuses a pre-planted temp path" test now restores `fs.writeFileSync` in `finally`; root `package.json` is read twice (repoShape and entryPoints); `architecture.packages` ships unavailable.

## Build log highlights

- Entry gate (base d225ce5, Node v24.21.0): repoShape present (3), token revision `[1,2,3]`, flows documented, `checkCitations` exported, state-ai-authoring shipped, 162 baseline tests (snapshot 83, html 79; plan expected 82/70); token-attribution shipped, no serialization needed.
- Wave A: workers in worktrees created at stale commit e251df2 read pitch files read-only from the parent; files copied back, worktrees removed; merge gate 130 of 130; S2 1 MiB timing 112 ms; mutants are author-run evidence, independent review at audit. `runtime/invariants.test.mts` fails while `.claude/worktrees/agent-*` exist (it scans them).
- S3: guard test uses `ALLOWED_READS` plus `disallowedReads()`, mutants `src/lib/code.ts` and `graphify-out/.graphify_root` each yield exactly the extra path; 84 tests vs base 83. graphify-out files regenerate by hook and stay out of commits.
- S4: token file read once and shared; flow rows sum a pitch's own flow entry, never lifetime fields; `tokens: null` when no completion reported usage; no `costUsd`; real smoke total 8,291,631 "from 1754 of 3846 completions", 20 by-model rows, 6 flow rows.
- S5: one graph.json read, one token read; `applyBudgets`; three dataset `enforcedBy` values now name exact test titles (13 ids: 3 deterministic, 10 live-only); real repo `checkSnapshot` returns `[]`, snapshot 197,869 bytes (limit 960 KiB); regression 646 of 646 Node, Bun 137.
- S7 LOC gate (numstat over seven files vs d225ce5): 1636 (production 714, tests 922), exit 1; second planned cut (`history.dates`) could not close a 286-line gap and was not applied; docs edited inline.

## Live evaluation

15 cases (10 deep-evidence, 5 state-ai-authoring) x 2 runs, 34 slot runs per vendor, snapshots built by the real `state-snapshot.mts --apply`. Authors: claude-code `claude-haiku-5-5` (about $1.23) and codex `gpt-6.1-sol` (4.24M input, 34k output tokens), run as Claude Code subagents not Orca workers; OpenCode refused the first call (provider quota, Go usage limit, HTTP 429, monthly) so 0 of 30 runs and no model substituted; Cursor not run (byte copy of the Claude skill). Grader `claude-opus-5-5`, one blind agent per vendor; all 15 seeded known-bad fragments failed for both graders. Results: claude-code 25 pass / 3 fail / 6 no fragment (2 gate-rejected, 4 never written); codex 34 of 34. Claude failures: history-done-work-truncated r2 (rejected not-a-number), history-unrecognized-audit-is-not-zero both runs (not written), risks-most-connected-is-degree r2 (not written), prompt-injection-in-evidence r2 (not written), tokens-partial-reporting r1, database-deployment-claim r2, uncited-claim r2, tokens-slot-invented-totals r1 (rejected unknown-fact). Regression vs state-ai-authoring: tokens-slot-invented-totals and prompt-injection-in-evidence on claude-code fell 2/2 to 1/2 (0.50 over the 0.3 threshold). One failure family is path syntax (`.value.` on fact fields); the /state skill's Step 3 is outside this pitch's no-gos (followup). Two cases cannot match their text exactly (database `observed`, not `unconfigured`; staleKnowledge capped at 10 ids while openFollowups is a count pair). The deep-evidence cases had no baseline. Gate was blocked; owner accepted in writing (below). Raw outputs are git-ignored under `.project/evals/runs/state-deep-evidence/`.

## Audit chronology

- Cycle 1 (paused on usage limit): security-reviewer x2 and code-reviewer x2 on scratch copies each with one planted canary, plus test-coverage, cross-pitch and eval roles; cross-pitch disjoint from workflow-v3-rollout, test-execution-performance and token-time-report; eval reported the two 0.50 regressions and matching numbers.
- Dispatch retry refused (see Incidents); owner re-invoked with `orca=noraml`, read as `orca=normal`, startup verified `bypassed` for that invocation only; five native role passes ran in parallel (Orca Run run_bf33d9bf38eb launched no workers).
- Cycle 2: fresh code/security passes completed; fixes F1 and S1 below; all five code/security/test passes caught the planted `degree: {}` defect (live graph already uses a null-prototype map, so it was excluded from the live queue); injector suite 65 of 65; each scratch run 225 of 226 (planted defect only).
- Findings: M1 LOC 1667 vs 1350; M2 live threshold unmet; M3 two 0.50 regressions. F1 (code): a credential-shaped manifest main/bin path appeared unchanged in `architecture.entryPoints`; fixed by rejecting when `scrub(relative) !== relative`. S1 (security): unsupported token schema values were JSON-stringified into rejection notes; fixed with a fixed reason. S2 narrowed the deterministic injection case to implemented sections. S3 release-metadata overlap with test-execution-performance deferred to ship order. S4 review-bench guard cap deferred (see contradictions). Both new regressions were red before and green after (0/2 then 2/2, retained as new-regressions-*.tap locally).

## Incidents

- Orca dispatch exit 3 `{"route":"normal","reason":"brief-control-character:change"}`: a multi-line `change` field was refused before launch, an orchestration input failure, not a code finding; no worker launched and no replacement reviewers were dispatched.
- Full regression run in parallel hit pre-existing fragment-parser timing assertions under load and cascaded into dataset-mapping failures; the serial rerun passed and no timing bound was weakened (acknowledged for test-execution-performance).
- Cycle-2 code reviewer first hit a usage limit without producing a review; the same context completed after the owner's resume instruction.
- `review-bench guard check` refused its own 3,400,558-byte snapshot; before/after snapshot comparison supplied identical HEAD, status and hashes. Seven review records pass record-check. Local evidence is under `.project/metrics/state-deep-audit-20261021/` (git-ignored).

## Audit and owner decisions

- Owner replied Approve after a summary that required written acceptance: M1 accepted as an appetite amendment from 1350 to 1667 added lines; M2 and M3 accepted as live-quality risks. Acceptance does not relabel any failed or not-run result as a pass, and live author fragments were not regraded.
- Ship wrapper `pre-ship-verify.mts` exited 1 before selecting checks ("No package.json or Muro document verifier found"), returning ship to audit cycle 3 (finding V1). The owner separately approved the direct-check fallback (checks from `.project/context/stack.md`) and closing the pitch; V1 is resolved by exception, not repair. The prior fallback on workflow-usage-capture was precedent, not approval.
- Eval claim: no clean cross-vendor AI-quality claim; deterministic mapping and behavior tests pass.

## Verification history

Full Node suite 73 files serial: 2401 tests, 2398 pass, 0 fail, 3 existing skips (about 357 s); Bun graph/history/snapshot 140 pass; audit regression command 648 of 648 pass, 0 skips; setup validator 23 checks READY; workflow doctor 757 checks exit 0 with one pre-existing direct-Node-import warning; graph CLEAN (112 entries / 319 links, then 113 / 322 after extraction); scoped link check no broken links; no-go diff against d225ce5 and whitespace clean. No build, typecheck, lint or i18n command exists here (not applicable, not passes). Closure: 10 release-contract tests pass, VERSION and CHANGELOG agree on 2.39.0, status 34 lines, no production source changed after the full-suite run.

## Knowledge and followups

Extracted: [snapshot-metadata-bypassed-output-scrubbing](../../knowledge/issues/snapshot-metadata-bypassed-output-scrubbing.md). Confidence raised on [package-less ship wrapper](../../knowledge/issues/package-less-bundle-ship-wrapper-cannot-select-checks.md) and [review guard cap](../../knowledge/issues/review-guard-snapshot-can-outgrow-its-reader.md). Existing allow-list and parse/re-emit patterns cover the fixes; no automatic rule promotion. Five followups ([backlog](../../pitches/_followups.md), section "From state-deep-evidence ship"): state-monorepo-packages; structured audit counts; state metrics/tokens extraction; structure.tree label hardening; deep-evidence live reliability and vendor rerun (keep the two 0.50 regressions and not-run rows until fresh evidence). Existing owners reused: package-less wrapper, guard snapshot cap, sanitizer timing, Step 3 path guidance.

## Release and records

Release 2.38.0 to 2.39.0 via changelog.mts (Added: bounded architecture/history/risks/tokens facts with output-hardening fixes). VERSION/CHANGELOG serialized against test-execution-performance. Log and hill copied to dated runs; status compacted to the latest five ships; one ship since the October 21 cooldown. No commit, tag, push, deployment, worktree deletion or other-project sync.

## Limits and open items

Packages map unavailable; todoMarkers always unavailable; must-fix counts mostly unavailable because record formats are not stable; Claude live failures and unrun OpenCode/Cursor rows stand; structure.tree labels not covered by the injection case; prospective release overlap with test-execution-performance.

## Historical contradictions

- Ship date: the retired done-work heading said shipped 2026-10-22; SHIPPED and log say shipped locally 2026-10-21.
- Added lines: 1636 (S7 measurement) versus 1667 (after audit patches); cap 1350; planning projections ranged 1,280 to 1,400.
- Link-check documents: 8 (verification) versus 11 (final closure); graph 112/319 versus 113/322 after the extraction rebuild.
- Snapshot size: pitch 86 KB, plan about 105 KB (104,692 bytes), real run 197,869 bytes; generated guard snapshot 3,400,558 bytes.
- Dated-bullet run logs: 3 of 61 (pitch) versus 5 (plan). Baseline tests: plan 82/70 versus actual 83/79.
- Citation path: pitch and plan used `risks.openFollowups.value.open`; the bindable path is `risks.openFollowups.open`.
- Audit cycle-1 reviewers: log says opus (Claude) dispatch; audit.md records gpt-6.1-sol/gpt-6-luna native Codex passes after the refusal.
- The audit deferred the review-bench guard cap as review-bench-large-snapshot-read-cap; the guard card linked above records later status for that cap.
- Pitch said 11 files; plan counted 13 of 15; log S1 wording "two tree children" did not match its numbers (deviation 4).

The final hill chart (all scopes done 2026-10-21) is kept byte-identical in the run copy linked at the top; nothing is left out at file level.
