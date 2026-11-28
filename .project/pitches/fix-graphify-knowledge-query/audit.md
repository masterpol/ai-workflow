# Audit — Graphify knowledge query

Two audit cycles. Reviewed the query implementation, its regression, and its documentation. The narrower cycle covered guarded graph reads and the new refusal tests.

## Code reviewer

model: gpt-6.2-sol (medium)
independent: yes
read-only: verified by scratch-copy review and repository guard
prompt-sha256: 240a638b6dcaedf027d99007668da71b57447bc23b4ab3d4fa0f27a8890176e9
cross-file interactions: reviewed CLI forwarding, output contract, docs and tests
canary: caught

Caught the planted option check at `ai-framework/scripts/graphify.mts:795`. The checkout already required exactly two arguments. The test now checks for empty prefix output after each option as well as forwarding. The reviewer could not run tests until the scratch dependencies were supplied. The coordinator ran the focused tests.

## Security reviewer

model: gpt-6.2-sol (medium)
independent: yes
read-only: verified by scratch-copy reviews and repository guard
prompt-sha256: 3b435ced3d755386c25001f81e2532dc34f7727fd91978c177fdd74e5c477c6f
cross-file interactions: reviewed query input, graph decoding and output against the descriptor-pinned reader and native passthrough
canary: caught

Cycle 1 prompt hash `7696db26afd220ad6ab2fbe9f26cec078fc3f94785f34416ae0653aaea04f612`. The reviewer caught the planted output-path bypass and confirmed the checkout’s separate stat/read gap. The narrower recheck caught the planted missing question bound and confirmed the reused reader checks regular-file identity and caps bytes during the read. It flagged the shared reader’s residual concurrent ancestor replacement issue. Native subprocess internals were outside both static passes.

## Test coverage checker

model: gpt-6-luna
independent: yes (cycle 2 caught the canary, cycle 1 missed its canary)
read-only: verified by scratch-copy reviews and repository guard
prompt-sha256: 47b2064043091d2a40014795844ece7307be03926203cf02a1e92f5d4be95f32
cross-file interactions: reviewed public query calls, wrapper output and reader coverage
canary: caught

Cycle 1 prompt hash `03b4bf73d3657a3a2899053b8884a442a74b4d2789e3df3fb4b2e110374998cc`. Added oversize, symlink, unsafe path and option assertions. The coordinator raised the graph size cap in a disposable copy, and the focused test failed at the empty-output assertion. Cycle 2 caught the planted vacuous assertion in that check and requested coverage for external configured directories. Added both absolute and relative out-of-project cases.

## Cross-pitch conflict checker

model: gpt-6-luna
independent: yes
read-only: verified by scratch-copy review and repository guard
prompt-sha256: 084e556b3a52c7c0997427e6c24cde9196f14542427c6db44ee974a2d73fca06
cross-file interactions: reviewed scope ownership against neighboring pitch and shipped records
canary: caught

The first reviewer missed the hidden project directory. The fresh rerun caught the planted claim in pitch 07. The actual pitch 07 names the installer, doctor and ignore-file surfaces. Pitch 03’s plan defers its graph/search work. Pitches 04–06 have no matching file ownership. Pitch 02 already shipped in local records and owns the separate index/tag changes in the same dirty files. Keep those changes distinct when staging.

## Eval runner

model: gpt-6-luna
independent: no (no planted canary)
read-only: verified by scratch-copy review and repository guard
prompt-sha256: d8f6f3e7a440573cbee0cd93a5bf562ecc4fe3e7e374ff9c809c19f62e0f5425
cross-file interactions: reviewed the Graphify CLI against the recorded pilot questions and compared stdout

The initial fixture lacked integrations dependencies. The retry and final comparison used the restored fixture. No model or prompt changed. This replay compares retrieval and output compatibility. It measures paths surfaced, while their relevance varies with the question.

| Pilot query | Native knowledge file hits | Shortlist paths | Native stdout preserved |
|---|---:|---:|---|
| Compact finished pitch and delete files safely | 4 | 5 | Byte-identical |
| Ledger coverage cap and too many files | 0 | 5 | Byte-identical |
| Retire a pitch directory tests still read | 0 | 5 | Byte-identical |

## Findings

| Tier | Finding | Disposition | Verified |
|---|---|---|---|
| Must-fix | Graph reading used separate pathname stat and unbounded read | Reused the descriptor-pinned project reader. Added size and symlink tests. | Focused suite and size-cap mutation |
| Should-fix | Query and graph fields could feed unbounded text to tokenization | Capped question, term count, labels and tags before ranking. | Source review and live pilot replay |
| Should-fix | Shared reader can race concurrent replacement of an ancestor during inspection | Deferred as shared-reader hardening. See deviations. | Confirmed by static review |
| Should-fix | Test lacked external configured-directory fallback assertions | Added absolute and relative escape cases. | Focused suite |
| Acknowledged | Planted option, output, test, and ownership defects | Present only in isolated reviewer copies. | Canary checks and comparison with the checkout |

No confirmed must-fix findings remain. UI and localization checks have no applicable surface for this CLI change.

## Reviewer prompts

```text
code
Model gpt-6.2-sol medium. READ-ONLY, work only in /tmp/awp-graphify-audit.vvWau8/code, use absolute workdir for every shell call. Do not read .env*, credentials.json or settings.local.json. Max 8 calls, each under 20s. Return even if unfinished. Audit intended Graphify CLI fix in ai-framework/scripts/graphify.mts:391-437 and :785-803 and ai-framework/docs/knowledge-graph.md:13-27, with test at ai-framework/scripts/graphify.test.mts:100-142. Read applicable coding-standards and boundaries rules in scratch. Contract: plain query adds at most five ranked typed knowledge paths, preserves native command output/exit and all explicit options, handles malformed/legacy/configured graphs. Prior workspace-slim changes to renderIndex and tagIndex are outside scope. Walk ranking/output bounds, invocation compatibility, configuration/error fallback, file interactions. Return each checklist result, concrete findings with severity/full relative file:line and verification evidence, and unfinished checks. Concise.
```

```text
security
Model gpt-6.2-sol medium. READ-ONLY, work only in /tmp/awp-graphify-audit.vvWau8/security, use absolute workdir for every shell call. Do not read .env*, credentials.json or settings.local.json. Max 8 calls, each under 20s. Return even if unfinished. Audit Graphify CLI fix in ai-framework/scripts/graphify.mts:391-437 and :785-803 and runtime interfaces. Applicable security.md sections 2, 3, 4 and command/input rules. Inspect graph-file resource bounds, trusted/untrusted data handling, path containment, safe terminal output, secrets, command arguments and side effects. Static defensive review and mitigation only. Walk checklist item by item and return concrete findings with severity/full relative file:line, contract, evidence, and any unfinished checks. Existing renderIndex, tagIndex, Git hooks outside scope. Concise.
```

```text
tests
Model gpt-6-luna. READ-ONLY, work only in /tmp/awp-graphify-audit.vvWau8/tests, use absolute workdir for every shell call. Do not read .env*, credentials.json or settings.local.json. Max 7 calls, each under 20s. Return even if unfinished. Audit ai-framework/scripts/graphify.test.mts:100-142 against Graphify query code ai-framework/scripts/graphify.mts:391-437,785-803 and applicable testing.md. Contract: bounded list of at most five typed paths, rank relevance, explicit query flags pass through, malformed and alternate graphs handled. Check fail-before behavior via static review or existing test command, behavioral coverage, false passes, clipping, alternate paths and failure cases. Walk items and report concrete gaps with severity/full relative file:line and evidence, plus unfinished checks. Concise.
```

```text
cross
Model gpt-6-luna. READ-ONLY, work only in /tmp/awp-graphify-audit.vvWau8/cross, use absolute workdir for every shell call. Do not read .env*, credentials.json or settings.local.json. Max 7 calls, each under 20s. Return even if unfinished. Audit Graphify query fix ownership (ai-framework/scripts/graphify.mts query only, ai-framework/scripts/graphify.test.mts query regression only, ai-framework/docs/knowledge-graph.md query paragraphs) against copied .project/status.md and 02–07 pitch records. 02 has shipped records but still shares dirty diff. Determine actual ownership vs shared dirty attribution; distinguish pure overlap, adjacent overlap and disjoint, suggest integration order if relevant. Walk each applicable pitch and return concrete findings with severity and full relative file:line, evidence and unfinished checks. Concise.
```

```text
cross_retry
Model gpt-6-luna. READ-ONLY, work only in /tmp/awp-graphify-audit.vvWau8/cross; use absolute workdir. Read .project/status.md and .project/pitches/02–07 by direct paths or rg --hidden (hidden directories do exist). Do not read .env*, credentials.json or settings.local.json. Max 7 calls, each under 20s. Return even if unfinished. Audit query-only Graphify fix ownership in graphify.mts, graphify.test.mts and knowledge-graph.md against those pitch plans and shipped records. Distinguish pure overlap, adjacent overlap and disjoint. Walk each pitch and return severity/full relative file:line, evidence and any unfinished checks. Concise.
```

```text
eval
Model gpt-6-luna. READ-ONLY, work only in /tmp/awp-graphify-audit.vvWau8/eval, use absolute workdir for every shell call. Do not read .env*, credentials.json or settings.local.json. Max 7 calls, each under 20s. Return even if unfinished. Run recorded pilot questions from .project/pitches/03-knowledge-distill/pilot/load-method.md with ai-framework/scripts/graphify.mts query. Use --budget 2000 as baseline for native traversal and compare to plain query. Report per question paths surfaced, native output preservation and relevance plainly; check pilot contract and note limits of synthetic scores. Use read-only scoped fixture commands and no file edits. Walk each criterion and report concrete full relative file:line with evidence and unfinished checks. Concise.
```

```text
eval_retry
Model gpt-6-luna. READ-ONLY, work only in /tmp/awp-graphify-audit.vvWau8/eval, set absolute workdir for every shell call. Do not read .env*, credentials.json or settings.local.json. Max 7 calls, each under 20s. Return even if unfinished. The integrations dependencies have been copied. Compare three recorded questions in .project/pitches/03-knowledge-distill/pilot/load-method.md using node ai-framework/scripts/graphify.mts query with --budget 2000 and with no options. Count knowledge paths surfaced and compare native output line-for-line with plain query after its prefix. Identify likely relevant paths and caveats. Report per criterion and all unfinished checks. The prior distillation effort and its word-reduction target are outside this regression check. Concise.
```

```text
eval_finish
Still read-only in /tmp/awp-graphify-audit.vvWau8/eval only. Canonical role prompt and latest target/test files are now in the scratch copy. Finish the pending comparison using a machine check: for each of the three exact pilot questions, capture stdout for plain and `--budget 2000`, strip the shortlist through the first blank line only from the plain output, compare the remaining bytes, and count native `NODE ... src=.project/knowledge/` file hits separately from shortlist paths. Use a heredoc Node/Python script without editing files. Return per-case output and any unverified checks.
```

```text
security2
Model gpt-6.2-sol medium. READ-ONLY, work only in /tmp/awp-graphify-audit.vvWau8/security2; use absolute workdir. Do not read .env*, credentials.json or settings.local.json. Max 7 calls each under 20s. Return even if unfinished. Review the Graphify shortlist implementation in ai-framework/scripts/graphify.mts:393-442, the called reader at ai-framework/scripts/consolidation-migrate.mts:32-78 and passthrough at graphify.mts:791-808. Walk applicable security.md §9 input bounds, path containment, descriptor identity and bytes, safe output, and no execution/secret logging. Static defense only. Report concrete severity/full relative file:line, evidence, and any unverified items. Concise.
```

```text
tests2
Model gpt-6-luna. READ-ONLY, work only in /tmp/awp-graphify-audit.vvWau8/tests2; use absolute workdir. Do not read .env*, credentials.json or settings.local.json. Max 7 calls each under 20s. Return even if unfinished. Narrowly audit the complete test at ai-framework/scripts/graphify.test.mts:99-165, against graphify.mts:393-442,791-808 and testing.md. Review actual assertions for oversize, symlink, unsafe paths and explicit options, positive controls, and runtime-safety contracts. Run the focused test if useful; Node 22.11 requires --experimental-strip-types. Report concrete gaps with severity/full relative file:line and all unfinished checks. Concise.
```
