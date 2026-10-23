# Plan: test-execution-performance

**Pitch**: pitch.md  •  **Appetite**: small-batch (≤5 files / ≤400 LOC / ≤1 day)  •  **Hill**: hill.md

Mini-plan. Non-AI, non-UI. Five projected files; four are new (`run-tests.mts`, its test, the testing guide) or bookkeeping (`VERSION`, `CHANGELOG.md`). Pitch/run records are phase artifacts and do not count.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | Test command: discovery, targets, runtime, workers, cache, exit/timing | `ai-framework/scripts/run-tests.mts`, `ai-framework/scripts/run-tests.test.mts` | ~260 | — | — | no: one cohesive CLI plus its test; small enough that a handoff costs more than it saves | — |
| S2 | Controlled measurement and promote/no-go decision | pitch record only (`measurements.md` in the pitch dir); no production files | 0 | S1 | — | no: timing runs must be sequential and uncontended; any parallel work corrupts the measurement | — |
| S3 | Testing guide and version log | `ai-framework/docs/testing.md`, `VERSION`, `CHANGELOG.md` (via `changelog.mts`) | ~90 | S2 | — | no: content depends on S2's findings | — |

## Exit criteria per scope (machine-checkable, ≥1 per scope)

### S1 — Test command
Behavior (in `run-tests.test.mts`, injected `RuntimeDeps`/fake child where launch is not the subject; one real-launch smoke case):
- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/run-tests.test.mts` exit 0, and under `bun test ai-framework/scripts/run-tests.test.mts` exit 0.
- Full-mode discovery returns every `*.test.mts` under `ai-framework/` and `.claude/hooks/`, sorted, and includes a newly added fixture test automatically; today's count is 70 (`node ai-framework/scripts/run-tests.mts --list --full | wc -l` ≥ 70 and equals `git ls-files`+untracked `*.test.mts` count for those two roots).
- Explicit files run only those files, and the output is labelled `partial` and never `full`; empty selection exits nonzero.
- Unsupported settings are refused with a nonzero exit and no child launch: unknown runtime, workers <1 or non-integer or above a cap (the cap value is chosen in S1 with the CPU count injected), Bun flag not present in `bun test --help`, cache with Bun, cache with a coverage run.
- Child failure and a deliberately failing nested assertion both propagate a nonzero exit (proved for Node and Bun through real launch of a disposable failing fixture in a temp dir).
- Effective child runtime: the reported runtime is the one actually launched (`AI_WORKFLOW_RUNNER` honored through `workflowInvocation`), not the outer executable.
- Report line carries selection kind (`full`/`partial`), file count, runtime, workers, cache state, duration in seconds, exit status.
- Mutation proof: force a failing child exit to 0 and the propagation case turns red; restore and it passes.
- `wc -l ai-framework/scripts/run-tests.mts` ≤ 200 (production LOC share of the 400 budget; test file ≤ 200).
- No new dependency: `git diff --name-only -- '*package*.json' '*lock*'` prints nothing.

### S2 — Controlled measurement
- `test -f .project/pitches/test-execution-performance/measurements.md` and it records, per candidate (Node default, Node 4 workers, Node compile cache cold+warm, Bun default, Bun `--parallel=4`): three complete full-suite runs, the commit/diff fingerprint, Node and Bun versions, CPU count, and an idle-host check taken before each round.
- Every candidate run used the same fixed snapshot (record `git stash create`-style tree hash or a copy; confirm unchanged between runs) and ran sequentially in a rotated order, not the research order.
- Each candidate row shows exit status and case/outcome parity against its runtime's default (same names, same pass/fail, skips unchanged; raw count differences between Node and Bun are explained, not compared).
- `grep -cE 'promote|no-go' .project/pitches/test-execution-performance/measurements.md` ≥ 1 per runtime: a candidate is promoted only if its median full-suite wall time is ≥20% below the same runtime's default and parity holds; otherwise the record says no-go. No `ai-framework/` file changes in this scope (`git diff --stat -- ai-framework | wc -l` unchanged from the S1 end state).
- If no idle host is achievable, record the contention and downgrade the result to "unproven"; do not promote.

### S3 — Guide and version log
- `test -f ai-framework/docs/testing.md`; `node ai-framework/scripts/docs-links.test.mts`-style check: `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/docs-links.test.mts` exit 0.
- Guide states: the command, partial vs full semantics (targeted runs never replace delivery verification), the S2 outcome per runtime (promoted settings or no-go, with the measured median), cache-disabled-for-coverage, Bun support floor from the checked flag surface, and what stays out of scope.
- `node ai-framework/scripts/changelog.mts` records the entry; `git diff VERSION` shows a minor bump and `head -20 CHANGELOG.md` shows the entry.
- `node ai-framework/scripts/workflow-doctor.mts` exit 0 and `node ai-framework/scripts/setup-validator.mts` exit 0.
- Final delivery verification unchanged: full Node suite via the new command in full mode exits 0; Bun scoped run of `run-tests.test.mts` exit 0.

## Risks (inherited from pitch rabbit holes)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| No idle host: another session is running suites in this checkout, so timings are contended | S2 | yes (first step of S2: check load and processes, pick a fixed snapshot copy) | Measure in a copied tree at a pinned revision; refuse to promote on contended data; record "unproven" |
| Effective child runtime differs from outer runtime; some tests require Node even under Bun | S1, S2 | no | Report effective runtime via `workflowInvocation`; compare only like-for-like per runtime |
| Case parity across runtimes (Node counts nested `t.test`, Bun does not) | S2 | no | Compare names/outcomes per runtime against its own default, plus deliberate-failure propagation |
| Unsupported Bun/Node flags on older versions | S1 | no | Probe `bun test --help` and gate on Node version; refuse rather than silently drop a flag |
| Compile cache vs precise coverage and cold/warm effects | S1, S2 | no | Cache off whenever coverage is requested; report cold and warm runs separately; fresh temp cache dir per candidate |
| Shared env mutations (8 direct `process.env.NAME =`) break blanket concurrency | S1 | no | Only file-level workers; no whole-suite test concurrency; no isolation removal (no-go) |
| 400-LOC budget | S1, S3 | no | Caps above (≤200 + ≤200 + guide); if exceeded, re-shape before expanding |
| Overlap with active `workflow-v3-rollout` and in-flight edits to `VERSION`/`CHANGELOG.md` | S3 | no | Recheck `git status` for those two files before S3; use `changelog.mts`, never hand-edit |
| Applicable rules: `ai-framework/rules/testing.md` (keep assertions, mutation proofs), `performance.md` (measure before caching); `.project/rules/` has no testing companion | S1, S2 | no | Folded into S1 mutation proof and S2 measurement gate |

## Parallel dispatch plan

Strictly sequential: S1 → S2 → S3. No subagents: S1 is one cohesive unit, S2 requires an uncontended host (parallel work would invalidate timings), and S3 depends on S2's results. Orca is ready but not used. `/impact` skipped: the plan edits two existing files (`VERSION`, `CHANGELOG.md`) and adds the rest; no shared code changes and no downstream consumers.

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)
