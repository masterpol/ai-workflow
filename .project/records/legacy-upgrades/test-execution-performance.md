# Source-review supplement: test-execution-performance

Prepared 2026-10-22 from verified recovery sources. Durable record of the small-batch pitch (bet 2026-10-21, bundle 2.40.0); its done-work narrative is retired. Results are historical evidence, not a certification. Guide: [testing guide](../../../ai-framework/docs/testing.md). Code: [run-tests](../../../ai-framework/scripts/run-tests.mts), [its tests](../../../ai-framework/scripts/run-tests.test.mts). Rules: [testing](../../../ai-framework/rules/testing.md), [performance](../../../ai-framework/rules/performance.md). Lessons: [real-path containment](../../knowledge/patterns/path-containment-compares-real-paths.md), [nested test context](../../knowledge/issues/a-nested-node-test-child-inherits-the-parents-test-context.md), [runCli argv](../../knowledge/issues/runcli-replaces-proc-argv-with-the-arguments-only.md), [guard snapshot bound](../../knowledge/issues/review-guard-snapshot-can-outgrow-its-reader.md), [subprocess revalidation](../../knowledge/patterns/subprocess-revalidation-against-on-disk-code.md), [scratch copy suites](../../knowledge/issues/an-audit-scratch-copy-must-run-its-own-suites.md). Backlog: [followups](../../pitches/_followups.md). Conflicting figures are kept under Historical contradictions.

## What shipped
`node ai-framework/scripts/run-tests.mts`: deterministic full discovery (75 files under `ai-framework/` and `.claude/hooks/`), labelled partial runs, Node or Bun selection reporting the effective child runtime, bounded `--workers`, Node-only `--cache`, `--coverage`, `--list`, nonzero exit propagation. Unsupported settings are refused, not dropped. No speed setting was promoted: the 20% median reduction target was not shown, defaults are unchanged. Budget: 5 files (run-tests 136 lines, test 176, guide, VERSION, CHANGELOG), about 400 lines.

## Scopes and deviations
- S1 shipped: worker cap fixed at 64 (planned CPU-count injection dropped since OsDeps has no CPU count and adding one touches runtime adapters, a no-go); audit hardened path containment to real paths.
- S2 shipped as evidence record: 15 full-suite runs on a fixed snapshot, host contended, result unproven.
- S3 shipped: testing.md, VERSION 2.39.0 to 2.40.0 via changelog.mts, no README link.
- Discovery is dynamic: the file count is informational.

## Measured outcome
Snapshot: working tree at 42362f8 plus 30 changed paths, fingerprint 9d267ac71e97...; Node 24.21.0, Bun 1.4.3, 12 CPUs; 3 sequential runs per candidate, rotated order. Two foreign CPU-bound processes ran throughout (load 5.9 to 33) and were killed after the runs at the owner's request; effect recorded, not corrected.

| Candidate | Median | vs default | Verdict |
|---|---|---|---|
| Node default | 98.5 s | baseline | |
| Node 4 workers | 121.9 s | 24% slower | no-go |
| Node compile cache | 90.8 s | 8% faster | below target, not promoted |
| Bun default | 268.8 s | baseline, exit 1 | |
| Bun `--parallel=4` | 92.4 s | 66% faster | not promoted: parity fails |

Cold vs warm cache was not separable. Bun fails 5 s default timeouts that Node passes: default fails both workflow-doctor real-bundle-copy tests; `--parallel=4` also failed the "every cap filled" size-bound test in two rounds. Promote Bun only after an idle rerun shows default exit 0 and every case passing; never lengthen deadlines. Raw counts differ by runtime (Bun omits nested `t.test`), so only like-for-like was compared.

## No-gos
No assertion removal, added skips/retries, shortened deadlines, global isolation removal, automatic dependency selection, runtime-default change, test-matrix rewrite, CI sharding, verification integration or model behavior change. All held.

## Rabbit holes
Resolved: effective child runtime reported via `workflowInvocation`; Bun `--parallel` gated on `bun test --help`; cache refused with coverage; file vs test concurrency differ and shared env mutations (8 direct `process.env.NAME =`) preclude blanket concurrency; both runtimes catch failing nested assertions. Unresolved: idle-host baseline; case-name parity compared by counts only.

## Verification and audit
run-tests.test.mts 11 pass on Node and Bun; full Node suite via the command exit 0, 2428 pass, 0 fail, 3 skip, 89.6 s; doctor and validator exit 0; docs-links 17 pass; graph clean. `pre-ship-verify.mts` failed ("No package.json or Muro document verifier found", known package-less limitation) and direct checks substituted pending owner approval. No build, typecheck, lint or i18n exists here.
Audit: appetite cap 2 cycles; three fresh reviewers on a scratch copy with a planted canary (dropped node_modules skip), caught by all. Seven should-fix fixed (symlinked parent and root containment, `..x` names, option-value swallowing, test gaps, stronger refusal assertions), three acknowledged (no SIGINT/SIGTERM forwarding, `--root` default untested directly, NODE_TEST_CONTEXT leak not reproduced). Cycle 2 was author-run with mutation proofs. Read-only verified by git status because the review-bench guard refused its own 3.4 MB snapshot.
Build lessons: runCli overwrites argv with args only, so the root is inferred from `import.meta.filename`; NODE_TEST_CONTEXT is stripped from the child env.

## Research notes
Ten-file sample (contended) suggested Node workers ~18%, cache ~44%, Bun parallel ~31% gains; the full suite did not confirm them. Slowest case: Codex start hook matrix (48 hook launches, 29.6 s). Excluded by design: whole-suite concurrency, isolation removal, auto test selection. Deferred ideas: in-process seams for subprocess matrices, injected clocks for deadline cases, CI sharding.

## Open followups
Idle-host rerun of five candidates (amend guide, med); Bun full-suite timeouts, decide tests vs harness (med); signal forwarding (low); in-process seams for the Codex hook matrix (med); review-bench guard snapshot cap (already tracked).

## Historical contradictions
- Narrative dates shipped 2026-10-22; SHIPPED.md says 2026-10-21 pending owner gate.
- Pitch and research say 70 files (69+1); shipped suite has 75.
- Full Node suite 2425 pass (hill, measurements) vs 2428 (verification).
- Hill lists 8 tests at S1 done; final 11 after audit.

Kept byte-identical in the run copies: the [build log](../../runs/2026-10-21-test-execution-performance.md) and the [hill chart](../../runs/2026-10-21-test-execution-performance-hill.md). Left out as process noise: the plan file (scaffolding whose exit criteria were met) and the documentation-update note (the testing guide exists and no ADR was needed).
