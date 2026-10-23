# Source-review supplement: toon-machine-data

Prepared 2026-10-22 from verified recovery sources. This is the only retained narrative for the pitch shaped and bet 2026-10-18 and shipped 2026-10-19 (bundle 2.32.0, hardened in 2.32.1) now that its done-work entry is retired; no compact pitch-compression record exists. Results are historical evidence, not a new certification. Current behaviour is owned by the [machine-data-format rule](../../../ai-framework/rules/machine-data-format.md), the [data grammar decision](../../decisions/toon-data-grammar.md), the [decision entry](../../knowledge/decisions/data-files-use-their-own-toon-grammar-not-the-config-parser.md) and the code named below. Differences between sources are kept under Historical limits.

## What shipped

Problem: data files that only the workflow reads (eval datasets, skill registry, ledgers, metrics) were JSON that agents load whole, paying for braces, quotes and repeated keys on every row. Appetite big-batch; the plan cap was 15 files and 12 shipped after S5 was dropped.

- S0 (2026-10-18): agent-load inventory with `Decision: NO-GO` (see Inventory and no-go decision). No existing dataset qualified; nothing in the repository was converted.
- S1: TOON "data grammar 1.0" with a parser and encoder, [toon-data.mts](../../../ai-framework/scripts/runtime/toon-data.mts) (30 tests, [toon-data.test.mts](../../../ai-framework/scripts/runtime/toon-data.test.mts)), and the decision [toon-data-grammar](../../decisions/toon-data-grammar.md). It is kept separate from the closed-schema config parser (config grammar unchanged, see [toon-subset-grammar](../../decisions/toon-subset-grammar.md)). The grammar states that "absent" is a file-level outcome: the parser returns parsed or refused. The plan's test list for it named tabular rows with quoting cases, `[N]` count mismatch, key order, forbidden keys (`__proto__`, `constructor`, `prototype`) at every depth, an oversize refusal, a 200k-line linear-time input and error texts that contain no input content.
- S2: [data-file.mts](../../../ai-framework/scripts/runtime/data-file.mts) reader and writer (27 tests, [data-file.test.mts](../../../ai-framework/scripts/runtime/data-file.test.mts)). Parsed, absent and refused are never collapsed; a `.toon` plus `.json` pair is an error. It has its own small inspector (lstat per component, O_NOFOLLOW, identity pin, bounded read) because the config inspector is hard-wired to `ai-workflow.toon` and a 64 KiB cap. Audit hardening added: short writes continued (a zero-byte write is refused), target and directories re-inspected including size and mtime before publishing, new files published with a hard link, `createOnly`, and the published dev/ino returned. The reader accepts CRLF and BOM; the writer always emits LF.
- S3: [toon-convert.mts](../../../ai-framework/scripts/toon-convert.mts) (21 tests, [toon-convert.test.mts](../../../ai-framework/scripts/toon-convert.test.mts)). Dry run is the default; a round trip is proved (parse both, deep-equal) before writing; a json changed since it was read is kept; cleanup removes only the inode it wrote. `--report` prints two named proxies, chars/4 and a whitespace-split count, because no model tokenizer is bundled, and says "mixed" when they disagree.
- S4: the [machine-data-format rule](../../../ai-framework/rules/machine-data-format.md) (the three-part scope test from the pitch, tabular-first, measure per file) plus one pointer line in [eval-harness](../../../ai-framework/rules/eval-harness.md).
- S5: dropped (S0 NO-GO). It would have converted `orca-vendor-orchestration.json` and its grader.
- S6: golden cases in the [toon-machine-data dataset](../../evals/datasets/toon-machine-data.json): 9 added, 13 in total, 8 enforced by named tests and 5 live-only and not run; 2.32.0 then 2.32.1. The dataset stays JSON because a gate must not grade its own instrument.

Result against the original ask: new agent-loaded data files can be written in TOON, with a rule, a converter and a reader. Existing files were not converted because none qualified. On this repository's datasets TOON beat the pretty-printed file and was mixed against minified JSON; the saving is not large on prose-heavy files.

## Inventory and no-go decision

Method: a file counts as agent-loaded only where an agent definition or skill tells an agent to open it (`file:line` quoted); a script reading it does not count. 14 candidate rows were examined.

- Eligible by rule: datasets that `eval-runner` and `eval-regression-projector` take as input (named at `eval-runner.md:16` and `eval-regression-projector.md:17`). No existing dataset qualified: `orca-vendor-orchestration.json` (5.2 KB) is read only by the grader script; `instruction-compression.json` (18.3 KB) was hash-pinned by the then-active instruction-compression pitch; `toon-machine-data.json` (3 KB) is this pitch's own gate.
- Keep JSON: `skill-vendors.json`, `orca-vendors.example.json`, compaction ledgers (31 files, 156 KB; the script writes them and nothing tells an agent to read them back), `.project/metrics/*.json`, `.project/reports/*.json`, `graphify-out/graph.json` (5 MB, queried through the script) and host-native files (`.claude/settings*.json`, `.codex/hooks.json`, `.opencode/*.json`, `package*.json`, `ai-framework/hooks/hooks.json`).
- Follow-up only: `ai-framework/integrations/skill-defaults.json` (1 KB; a static JSON import would have to become a runtime read; too small to matter) and `.project/skills/registry.json` (3.3 KB). The registry is the one existing file agents open in every phase (the caveman banner in each of the 44+ agent and SKILL files tells the agent to check it) and is the real saving. It has 6 readers (`skill-registry`, `skill-sync`, `add-skill`, `state-snapshot`, `bundle-sync`, `browser-runtime`), 5 tests, `.gitignore` and bundle-sync "never synced" rules, and the banner prose belonged to instruction-compression, so it needs its own pitch sequenced after that one.
- Consequences: S5 dropped, plan file count 15 to 12 (S5 would have changed `orca-vendor-orchestration.toon`, the grader and its test), and the S3 real-file round trip uses `orca-vendor-orchestration.json` and the `instruction-compression.json` bytes read-only as test input.

## Scope and limits

No-gos (pitch): no conversion of host-native files or anything a host tool parses itself; none of `graphify-out/graph.json` or other files agents never load; no token-saving claim without a per-file measurement; no rewrite of skills, agents or phase prose (instruction-compression owned that); no full TOON spec, only the tabular-array widening; no reading of `.env` or secrets while scanning for candidates.

Honored: nothing in the repository was converted; no skill, agent or Cursor copy was edited; `instruction-compression.json` and its tests were untouched; proxies are named and "mixed" is reported as mixed. Caveat: the rule file and the golden dataset landed while instruction-compression was still shipping. There was no file overlap, and the shared bookkeeping files (VERSION, CHANGELOG, status.md, graphify-out) were merged in order: that pitch first, then this one, rebuilding the graph once.

## Lessons and rabbit holes

Resolved in the pitch: which files count (the three-part scope test; script-only files are out because converting them saves no ingestion tokens and adds risk); TOON does not always save (savings come from uniform arrays, so the rule is tabular-first, each file is measured and a file that does not shrink stays JSON).

Pushed to plan with owner planner: parser safety (prototype keys, ReDoS, symlink, size cap, no content in errors, mutant tests); a dual-read period and rollback for a bad converter run; quoting and multi-line strings (ledger `reason`, eval `input`); a named reproducible token proxy; carrying converted files to downstream projects through bundle-sync and config-migrate without overwriting local data (left out of the plan).

Pushed to no-go: converting prose, markdown or knowledge entries (instruction-compression).

Surfaced later: check-then-write races in the writer and converter cleanup, JSON depth versus TOON depth, and the finding that the real saving is the skill registry.

Critique (five perspectives, 2026-10-18) projected about 75 files and 3,000 lines against the 15-file cap and advised splitting into P1 core, P2 converter and rule, P3 datasets, P4 ledgers and P5 registry and integrations. Other findings: only eval datasets were shown to be agent-loaded; the config parser is closed-schema with a 64 KiB cap, so data needs its own module, caps, error codes and a second decision doc; refusal must differ from absence (a shared reader once made its writer destructive); keep the golden dataset JSON until the parser is proven; exclude `instruction-compression.json` until that pitch ships; both formats present is an error. The shaper recommended Re-shape; the owner chose Bet without stating a reason, so the proposed re-shape became a required input to the plan.

Lessons recorded across the work: a quadratic table-header column check; lone surrogates and DEL escaping; a "json changed" check that could never fire; check-then-write races, answered with link publish; the array-versus-object depth rule; a mutation harness must restore in `finally` and apply timeouts (see the [hang issue](../../knowledge/issues/an-unbounded-mutation-run-hangs-on-a-mutant-that-removes-a-stall-guard.md) and the [writer re-inspection pattern](../../knowledge/patterns/a-writer-reinspects-the-target-at-the-publish-step.md)); planted canaries; the gate must not grade its own instrument. Conversion guidance: [convert only where an agent loads the file and measure it](../../knowledge/patterns/convert-a-format-only-where-an-agent-loads-the-file-and-measure-it.md).

## Build decisions and deviations

Plan sequencing: S0, S1, S2 sequential; S3 and S4 parallel after S2; S5 only on GO; S6 closes; S4 and S6 waited on instruction-compression shipping rules and shared exits. The plan had dispatch models (standard and fast) for S3 and S4. The build ran with `orca=normal`, no Run, no workers, and S3 and S4 ran sequentially in the main session. "Approve all" counted as every per-scope gate and `/build end` stayed gated.

Deviations as recorded:

- S5 dropped (NO-GO); 12 files remain; the toon-skill-registry follow-up was to be shaped later.
- S1: "absent" is file-level, so `toon-data.mts` returns parsed or refused and its tests assert a non-text input is refused, not absent.
- S2: own inspector instead of reusing config's `inspectPath` and `readBoundedFile`, which would have changed `config.mts`; the exit grep for `inspectPath` was replaced by hostile-shape tests. The writer is LF-only although the plan said "keeps line endings".
- S2/S3: rename publish and an `existsSync` check were replaced (audit) by hard-link publish, `createOnly`, re-inspect including size and mtime, and the dev/ino return.
- S3: the converter test lists only tracked datasets, because `instruction-compression.json` is untracked and owned by another pitch.
- S2: the JSON reader limits objects to 32 levels and total containers to 68 (arrays counted as depth before the audit).
- Close-out: 2.32.0 only was planned; audit fixes shipped as 2.32.1.

Build findings: `toon-convert --report` showed TOON smaller than the stored pretty file but mixed against minified JSON; the runtime boundary check refused `node:util` in production code, so `dataEquals` was written in toon-data.mts. At 2.32.0 the full suite was 1741 tests, 1738 pass, 0 fail, 3 skipped, with setup-validator READY, doctor READY and graphify clean.

## Audit and review chronology

Cycle 1: code, security, test, eval and cross-pitch reviewers (cross-pitch not independent; no canary applies). Cycle 2 narrow: security and code. Orca was bypassed (`orca=normal`); reviews were native subagents with an explicit model each (opus for security in both cycles, sonnet for the rest), on scratch copies with review-bench guard snapshots. The cycle-1 guard could not separate reviewer effects from the other session's ship records, because the shared checkout was edited by the instruction-compression session during the audit. Prompt hashes were recorded for four cycle-1 prompts only; the cross-pitch and cycle-2 prompts were not stored as files.

Canaries (planted in scratch copies, all caught and refuted against live files): removed symlink check in `data-file.mts` `inspect()`; `verdictOf` "mixed" changed to "smaller"; blanked table row-count check in `toon-data.mts` (caught by test and eval reviewers); rename instead of link publish; removed `current.text !== source.text` comparison.

Must-fix, fixed with tests and killed mutants:
- M1: quadratic table-header column check (20k columns 301 ms, growing about 4x per doubling), replaced by a Set and index scan with a 50k-column test.
- M2: a lone surrogate was written unquoted and read back as U+FFFD while the writer reported "written"; now escaped, and the writer judges the decoded bytes (the byte check itself is defense in depth, unreachable today).
- M3: the `--remove-json` "json changed" check could never fire; now a pinned `readDataFile` re-read comparing text and value, keeping both files on any difference.

Should-fix, all fixed with a regression test and a killed mutant: DEL accepted by the encoder but refused by the reader; `1e999` parsed as Infinity and padded array sizes accepted; short writes ignored; check-then-write races (last-instant file, replaced target, swapped directory, converter existence check); depth limit disagreed with the encoder; converter read source and written toon with unpinned reads; a test read a sibling pitch's untracked dataset. Refuted: S8 claimed `orca-vendor-orchestration.json` is gitignored, but `git ls-files` lists it.

Cycle 2 fixed: an in-place edit of the target was not seen (size and mtime now compared); cleanup could unlink another writer's file (now only the written inode); JSON depth counted arrays while TOON counts objects only (32 object levels with a looser container cap).

Acknowledged: hard links not refused, mode reset to 0644 on replace, no directory fsync; integers beyond 2^53 and duplicate keys in JSON text not detected by the converter (`--remove-json` deletes the original text); `parseData` `maxBytes` counts UTF-16 units while `readData` caps real bytes; `1e-999` reads as 0; "every reader" in the dataset and rule is true only for `data-file.mts` and the converter (the rule scopes it to new files); shared bookkeeping files with instruction-compression.

Eval gate: no LLM eval harness or baseline exists, so there are no scores and no regression delta. 8 golden cases are enforced by named tests (each cited test was run and mutations of 4 of them failed as required). 5 are live-only and not run (agent-ingested-new-data-file, host-native-config-stays-json, script-only-file-not-converted, toon-dataset-same-verdict, agent-reads-long-table-field); they are unverified model behaviour and residual risk.

Author-run checks (not reviews): a mutation harness over the patches (16, 6 and 7 mutants; all killed except the unreachable `bytesRoundTrip`; two redundant checks removed). Full Node suite after 2.32.1: 1764 tests, 1761 pass, 0 fail, 3 skipped (unrelated: Windows worktree, Bun syntax, `IC_EVAL_REQUIRED`). Bun not run. setup-validator READY; workflow-doctor READY (752 checks, runtime boundary 0 violations).

Incident: a mutation run hung 37 minutes on a mutant that removed the write-loop stall guard (an infinite loop); the owner stopped it and no source stayed mutated (checked by diff against the backup and a clean run of all three suites). Later harnesses restore in `finally` and apply a per-test timeout.

## Followups

Carried in the [followups backlog](../../pitches/_followups.md) (section "toon-machine-data leftovers (2026-10-19)"): toon-skill-registry (medium; sequence after the banner rewrite); wire `eval-runner` and other readers to `readData` so "every reader" becomes true (low); converter should detect JSON loss the parser hides (integers beyond 2^53, duplicate keys), refuse hard links and keep file mode on replace (low); run the 5 live-only golden cases when an eval harness exists (medium).

## Historical limits

Contradictions kept as recorded, not rewritten: the pitch said grammar 1.1 and `toon-subset-grammar.md`, while the ship is data grammar 1.0 in `toon-data-grammar.md`; the plan said 15 files and 12 shipped; the plan said version 2.32.0 while the audit fixes shipped as 2.32.1; test counts are 30, 27 and 21 (SHIPPED) versus 26, 14 and 15 (hill chart, written before the audit); the hill chart says 9 golden cases (7 enforced, 2 live-only) while SHIPPED and the audit report 13 total (8 enforced, 5 live-only), and the sources do not explain the difference; suite totals are 1741 (2.32.0) versus 1764 (2.32.1); the log says "4 planted canaries and 1 more per cycle" while the audit lists five; the plan said the converter test uses three real datasets and a rename publish, which shipped otherwise (see deviations). Compare with later work before calling any item a current defect.

Whole files left out of the ledger as process noise: the hill chart (positions, with counts that conflict with SHIPPED) and the build-start brief (approval and Orca readiness; its limits are repeated in the pitch and SHIPPED no-gos). The sources' `runtime/` paths are `ai-framework/scripts/runtime/`.
