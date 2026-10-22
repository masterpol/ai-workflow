# Test execution research

Date: 2026-10-20. Shape research only; no runner or production code changed.

## Knowledge gate

Queried the existing Graphify graph before repository searches or writing this pitch:

```sh
node ai-framework/scripts/graphify.mts query 'test execution performance node bun concurrency subprocess suite'
```

Read these matching sources:

- `.project/knowledge/patterns/subprocess-revalidation-against-on-disk-code.md`: a subprocess is necessary when validating modules just replaced on disk; replacing every subprocess with imports would lose this guarantee.
- `.project/knowledge/issues/an-audit-scratch-copy-must-run-its-own-suites.md`: fixtures need their imports and data to run independently; reducing fixture copies must retain that completeness.
- `ai-framework/rules/testing.md`: preserve behavior assertions, guard mutation proofs, and meaningful verification.
- `ai-framework/rules/performance.md`: measure costs before introducing caching or changing execution.
- `.project/rules/README.md`: this checkout has no stack-specific testing companion. `.project/context/stack.md` documents direct Node/Bun commands.

## Observed checkout

- Installed Node: v24.21.0. Installed Bun: 1.4.3. Host reports 12 logical CPUs.
- 69 `*.test.mts` files under `ai-framework/`; one more at `.claude/hooks/post-edit-check.test.mts`.
- Static scan of the 69 files finds 150 `spawnSync`/`execFileSync` call sites, 22 timer/sleep call sites, and eight direct `process.env.NAME =` assignments. These are source counts, not invocation counts, timing attribution, or a complete mutation inventory.
- Some tests explicitly require Node even under Bun. Selecting the outer runner alone does not establish the runtime of every child.
- Another session was already running a full Node suite with `--test-concurrency=1`. Its process was left untouched. The checkout also had substantial existing edits, including another active pitch's untracked tests. Results describe a changing, contended workspace, not a fixed revision.
- Active `workflow-v3-rollout` concerns configuration/migration; `state-fragment-sanitizer` has ongoing test and audit work. Projected implementation files below avoid their known files. Recheck overlap during planning.

## Exploratory full probe

Launched Node with `--test --test-reporter=tap` and an explicit sorted list of the 69 tests under `ai-framework/`. The probe intentionally had a 90-second investigation budget and timed out at 90.006 seconds. The hidden hook test was not included; this is not a completed full-suite baseline or a passing verification result.

The captured TAP contained 774 completed top-level timing records and no reported `not ok` lines at capture time. TAP buffers file output; that count neither describes all tests executed nor guarantees unreported outcomes.

Selected slow test cases from the partial log:

| Case | Duration |
|---|---:|
| Every phase accepts slash/dollar invocation and reports the Codex coordinator | 29.632 s |
| Mutation proof: broken libraries turn cases red | 17.363 s |
| Concurrent graders publish policies without races | 15.074 s |
| Doctor validates TOON Orca policy without probing or rewriting | 13.326 s |
| Every executable dataset case runs and passes | 10.487 s |

The first case loops over 12 phases, two sigils, and two argument forms: 48 real hook subprocess launches, each potentially launching fake vendor probes. It sits in `ai-framework/hooks/scripts/orca-start-codex-hook.test.mts`. The same file intentionally exercises approximately five-second deadlines. This explains meaningful work that a runtime flag cannot remove. Reported case durations include contention; they are not isolated cost estimates.

Temporary full-probe log: `/tmp/ai-workflow-tests-node-baseline.tap`. Temporary logs are not durable evidence dependencies.

## Repeated sample experiment

Used the same ten explicit files for each variant:

```text
ai-framework/scripts/runtime/semver-range.test.mts
ai-framework/scripts/runtime/toon-data.test.mts
ai-framework/scripts/runtime/config.test.mts
ai-framework/scripts/runtime/data-file.test.mts
ai-framework/scripts/state-charts.test.mts
ai-framework/scripts/state-theme.test.mts
ai-framework/scripts/orca-policy.test.mts
ai-framework/scripts/orca-ledger.test.mts
ai-framework/scripts/workflow-metrics.test.mts
ai-framework/scripts/instruction-loading.test.mts
```

Each variant ran three times, sequentially, in the table's order per round. Output went to files; elapsed wall time was measured around the child process. This was not randomized and the other session remained active. The cache variant used one fresh temporary cache directory shared across its three runs; its first run was cold, the next two warm. No coverage collection was enabled.

| Variant and command prefix | Run 1 | Run 2 | Run 3 | Median |
|---|---:|---:|---:|---:|
| `node --test --test-reporter=tap` | 1.872 s | 2.478 s | 2.205 s | 2.205 s |
| `node --test --test-reporter=tap --test-concurrency=4` | 1.754 s | 1.799 s | 1.919 s | 1.799 s |
| `NODE_COMPILE_CACHE=<temporary-directory> node --test --test-reporter=tap` | 1.466 s | 1.193 s | 1.236 s | 1.236 s |
| `bun test` | 2.663 s | 2.285 s | 3.022 s | 2.663 s |
| `bun test --parallel=4` | 2.463 s | 1.842 s | 1.697 s | 1.842 s |

All 15 commands exited zero. Node reported 325 pass / 1 skip; Bun reported 299 pass / 1 skip. The existing skip requires live instruction-compression evidence. No skips were added for the experiment. Sample selection is partial and cannot replace full verification.

Within this sample, median reductions versus each runtime's default were approximately 18% for Node with four workers, 44% for Node with compile cache, and 31% for Bun with four workers. These are observations under contention, not causal estimates or promises for the full suite. Node and Bun run different runtime adapters, so comparisons also exercise different implementations.

A preliminary single run before these repetitions returned 1.915 / 2.001 / 2.329 / 1.472 seconds for Node default / Node four workers / Bun default / Bun four workers. That instability reinforces the need for controlled baselines.

### Count difference probe

The sample has 26 nested `t.test` variants in the malformed-routing policy test. Bun reports the parent as one test and does not list those 26 nested variants as separate results. A disposable `node:test` file containing one parent and one nested assertion printed a marker from the nested body on both runtimes. With a passing assertion both exited zero; changing that assertion to fail made both exit one. This explains the sample's count difference without establishing parity for every runner feature. Future validation must compare meaningful cases and failures, rather than demand identical raw test counts.

## Strategies and tradeoffs

| Strategy | Decision for this pitch | Reason |
|---|---|---|
| Targeted explicit files during development | Include | Avoids rerunning unrelated integration matrices; label output partial and retain full delivery verification. |
| Node file worker tuning | Include experiment | Node already parallelizes files by default; a bounded count can reduce oversubscription from nested subprocesses. Four is a candidate, not a universal default. |
| Bun file parallelism with isolation | Include experiment | Installed Bun supports `--parallel=4`, which implies fresh per-file globals. Do not confuse this with `--concurrent`. |
| Node compile cache | Include experiment | Promising sample result; compare cold and warm runs and preserve child-environment behavior. Disable it for precise coverage collection. |
| Whole-suite test concurrency | Exclude | Environment mutations and synchronous child launches make this a poor blanket optimization. |
| Removing file isolation | Exclude | Shared globals/module caches introduce correctness risks; Node also loses file concurrency when isolation is disabled. |
| Replacing repeated CLI matrices with in-process cases | Follow-up | Could remove substantial launch work, but needs deliberate retention of executable wiring, argument parsing, and fresh-module tests. |
| Injected clocks for deadline unit cases | Follow-up | Retain real deadline smoke cases; changing current production timeout contracts is outside scope. |
| CI sharding and duration-aware scheduling | Follow-up | No CI workflow was found at the repository root. Establish a portable local command first. |
| Automatic changed-test dependency selection | Exclude | A static import graph alone misses fixture, source-reading, subprocess, and instruction-contract dependencies. |

## Proposed bounded implementation

Five projected implementation files: `ai-framework/scripts/run-tests.mts`, its adjacent behavior test, a testing guide under `ai-framework/docs/`, `VERSION`, and `CHANGELOG.md`. Records are phase artifacts. Reuse runtime dependency injection and existing child supervision; no package manager, new dependencies, runtime-adapter edits, or skill changes are included. If those become necessary or the 400-LOC limit cannot hold, re-shape before expanding.

The command should discover full suites deterministically, accept explicit target files, expose runtime and bounded workers, report selection/runtime/duration, and preserve nonzero exits. Full mode must include newly added tests automatically. Reject an empty selection and unsupported execution settings. Targeted mode must never claim full verification.

Planning must capture a fixed-snapshot, uncontended baseline; pin outer and effective child runtimes; validate the installed Bun flag surface and the supported-version policy; and distinguish cold/warm cache measurements. Compare three complete runs per candidate against the corresponding default. Seek a ≥20% median reduction for each runtime with unchanged meaningful cases/outcomes, including deliberate failure propagation. If measurements do not support a faster setting, record that no-go instead of changing defaults or promising an improvement. Full-suite caching/isolation compatibility remains unresolved.

## Primary sources checked

- [Node 24.21 CLI: test concurrency](https://nodejs.org/download/release/v24.21.0/docs/api/cli.html#--test-concurrency): default file concurrency is available parallelism minus one; disabling isolation makes concurrency one.
- [Node 24.21 CLI: test isolation](https://nodejs.org/download/release/v24.21.0/docs/api/cli.html#--test-isolationmode): default is process isolation; Node 22 uses the earlier experimental flag spelling.
- [Node 24.21 module compile cache](https://nodejs.org/download/release/v24.21.0/docs/api/module.html#module-compile-cache): cache is version-specific; cached functions can produce less precise V8 coverage, so disable it for precise coverage runs.
- [Bun parallel and isolated tests](https://bun.com/docs/test/parallel): distinguishes file workers, concurrent async tests, isolated globals, sharding, and duration-based scheduling. Installed `bun test --help` confirms `--parallel`, `--isolate`, `--shard`, and `--timings` are available in 1.4.3; this does not establish support in older Bun releases.

## Phase boundary

The pitch remains unbet. No implementation, verification-hook changes, version bump, or advancement to planning occurred. Critique is not required for this non-AI small-batch proposal. Follow-ups that modify phase instructions or expand the file budget require classification and shaping separately.
