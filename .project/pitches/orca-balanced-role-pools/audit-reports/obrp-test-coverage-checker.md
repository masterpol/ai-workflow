# Test Coverage Review: orca-balanced-role-pools

**Role:** test-coverage-checker (read-only)  
**Scope:** P1, P2, P3, P4, C1 of `.project/pitches/orca-balanced-role-pools/plan.md`  
**Date:** 2026-11-24

## Findings table

| severity | file:line | rule or check violated | concrete failure scenario with command and output | suggested fix |
|---|---|---|---|---|
| *(none)* | — | — | — | — |

No test-coverage findings were identified. All changed source files have sibling/co-located tests, every new public surface is asserted, and all 15 in-memory mutants were caught by the suite.

## Verification commands run

### 1. Full targeted test suite (passing)

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning \
  --test ai-framework/scripts/orca-assign.test.mts \
       ai-framework/scripts/orca-ledger.test.mts \
       ai-framework/scripts/orca-dispatch.test.mts \
       ai-framework/scripts/orca-run.test.mts \
       ai-framework/scripts/orca-eval-grader.test.mts
```

**Output (last 10 lines):**

```
ℹ tests 226
ℹ suites 0
ℹ pass 226
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 20240.68425
```

### 2. Golden grader case executes and passes

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning \
  ai-framework/scripts/orca-eval-grader.mts --root .
```

**Relevant excerpt:**

```json
{"id":"role-pools-balance-load-across-roles","mode":"executes","pass":true,
 "detail":"executed: 12 expectation(s) matched | notes: real loadOf/pickers with an in-memory ledger; explicit vendor through real dispatchScope"}
```

Full summary: `executes: { total: 9, passed: 9, failed: 0 }`, `parsesOnly: { total: 1, parsed: 1, failed: 0 }`, `liveOnly: { total: 3, notRun: 3 }`.

### 3. C1 integration checks (passing)

```sh
node ai-framework/scripts/workflow-doctor.mts --json
node ai-framework/scripts/setup-validator.mts
node ai-framework/scripts/graphify.mts --check
node ai-framework/scripts/graphify-relations.mts --check
node ai-framework/scripts/changelog.mts --check
node ai-framework/scripts/docs-links.mts ai-framework/integrations/orca-vendors.md ai-framework/workflow/phases/2-build.md .project/pitches/orca-balanced-role-pools
```

**Outputs:** workflow-doctor `failures: 0`; setup-validator `Setup status: READY`; graphify `Graph status: CLEAN`; graphify-relations `0 problem(s)`; changelog `VERSION: 2.54.0` with the pitch entry; docs-links `10 file(s) checked, 0 broken link(s)`.

### 4. In-memory mutant verification (all caught)

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning \
  /private/tmp/orca-balanced-mutants/verify-mutants-v2.mts
```

**Output (summary):**

```json
{ "total": 15, "caught": 15, "results": [ ... ] }
```

Per-file mutants:

| source file | mutants tried | caught |
|---|---|---|
| `orca-assign.mts` | ignore-load, ignore-rotation, skip-ignored | 3/3 |
| `orca-dispatch.mts` | clean-failure-as-load, drop-runId-filter, disable-load-changed-repick | 3/3 |
| `orca-ledger.mts` | no-runId-validation, runId-in-patch, ignore-admit | 3/3 |
| `orca-run.mts` | no-duplicate-key-check, no-runId-validation, drop-runId-output | 3/3 |
| `orca-eval-grader.mts` | observer-sees-expected, always-pass, balanced-ignores-load | 3/3 |

**Representative failure trace** (`orca-assign.mts` + ignore-load mutant):

```sh
cp ai-framework/scripts/orca-assign.mts ai-framework/scripts/orca-assign.mts.bak
sed -i '' 's/memberLoad(member, load)/0/g' ai-framework/scripts/orca-assign.mts
node --experimental-strip-types --disable-warning=ExperimentalWarning \
  --test ai-framework/scripts/orca-assign.test.mts
```

```
✖ least-loaded member wins, with plan position as the tie-break
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  - 'a'
  + 'b'

✖ reviewer still excludes the implementer and respects load
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
    {
      ok: true,
      source: 'round-robin',
  +   vendor: 'claude'
  -   vendor: 'opencode'
    }

✖ pool independence: shared load balances greedily across roles over a sequence
  AssertionError [ERR_ASSERTION]: implementer opencode at 2 is not least-loaded vs codex
```

## Exit criteria → named test mapping

### P1 — Least-load picker

| Exit criterion | Named test in `orca-assign.test.mts` |
|---|---|
| `bun test ai-framework/scripts/orca-assign.test.mts` exit 0 | Entire suite (226 tests pass overall) |
| Without load: old round-robin preserved | `load absent or empty preserves today's exact round-robin` |
| With load: lowest load wins | `least-loaded member wins, with plan position as the tie-break` |
| Ties fall back to rotation from `planIndex` | `least-loaded member wins...` and `determinism with load...` |
| `skip` honoured | `a skipped member is removed before spreading...` and `load absent or empty...` |
| Reviewer excludes implementer | `reviewer still excludes the implementer and respects load` |
| Pool independence / greedy fairness | `pool independence: shared load balances greedily across roles over a sequence` |
| `recorded` still wins | `recorded vendor wins even when it has the highest load` |
| Non-member load ignored | `load keys for non-members are ignored` |
| Determinism ×1000 | `determinism with load: the same arguments give the same answer x1000` |
| Mutants: removing load ordering or tie rotation fails | `mutants: ignoring load or tie rotation fails a load-based test` |
| `git status --porcelain` shows only P1 files | **No automated test** — manual file-scope check |

### P3 — `runId` dispatch input

| Exit criterion | Named test in `orca-run.test.mts` |
|---|---|
| `bun test ai-framework/scripts/orca-run.test.mts` exit 0 | Entire suite |
| Valid `runId` passes through | `dispatch runId reaches the dispatch options with and without retries; absent stays absent` |
| `RUN_X`, `run_`, `run_../x`, 33+ chars refused with exit 2 / `dispatch` | `invalid, duplicate or misspelt dispatch runId is usage dispatch before any Orca call` |
| Non-string refused | same test |
| Duplicate / misspelt key refused | same test |
| Absent unchanged | `dispatch runId reaches the dispatch options...; absent stays absent` |
| Only two P3 files changed | **No automated test** — manual diff check |

### P2 — Ledger `runId`, Run-scoped load, recheck under the lock

| Exit criterion | Named test |
|---|---|
| `bun test ...orca-ledger.test.mts ...orca-dispatch.test.mts` exit 0 | Entire suites |
| `runId` validated, stored at claim, set once | `runId is validated at every input boundary and stored set-once at claim` (`orca-ledger.test.mts`) |
| Old records without `runId` stay valid | `records without a runId stay valid and replay with the normalized record` |
| `reserve` with `admit` false gives `load-changed`, writes nothing | `reserve runs admit inside the mutation lock on the same list and writes nothing on load-changed` |
| `admit` sees same `list()` | same test |
| Load ownership-state matrix | `loadOf counts the owning set and scopes to the runId` (`orca-dispatch.test.mts`) |
| Other Runs / no-`runId` count 0; no-`runId` live-only | same test |
| Recorded owner still wins | `resolveAssignment picks the least-loaded eligible member using Run-scoped load` and `resolveAssignment keeps a recorded owner even when another vendor has a lower load` |
| Clean-failure rotation unchanged | covered by existing `pools: a proven-clean failure rotates to the next member...` and the golden case |
| Unknown-liveness never moved | `pools: every non-failed holder keeps its vendor, including unknown-liveness` and grader case |
| `invalid-run-id` before side effect | `dispatch rejects an invalid runId before any ledger write or spawn` |
| Interleaved dispatches re-resolve | `load-changed: an interleaved load change makes the second dispatch re-resolve to a different vendor` |
| Explicit `vendor` unaffected | `dispatch with explicit vendor stores runId and bypasses load balancing` |
| Assign-picked opencode resolves agent id | `assign-picked opencode still resolves the installed agent id` |
| Mutants: clean-failure as load, drop runId filter, drop admit | `mutant: counting a clean failure as load...`, `mutant: dropping the runId filter...`, `mutant: dropping the admit callback from reserve...` |
| 4 P2 files only | **No automated test** — manual diff check |

### P4 — Golden case executes

| Exit criterion | Named test |
|---|---|
| Case rewritten with explicit runIds, matrix, clean failure, unknown-liveness, planIndex/skip, degenerate pool, explicit vendor | Dataset content inspected; exercised by `role-pools-balance-load-across-roles` case |
| Grader executes it and it passes | `the real dataset: every executable case runs and passes...` and direct `orca-eval-grader.mts --root .` run |
| Mode map and counts updated (9 executed, 1 parses-only, 3 live-only) | same test |
| In-memory mutant: picker ignoring load turns case red | `mutation proof: each broken library turns its case red...`; also `balanced roles: ownership...` |

### C1 — Guidance, contract test, release

| Exit criterion | Named test / verification |
|---|---|
| `orca-vendors.md` § Assignment owns the coordinator rule | Contract test `one owner for the assignment rule...` asserts the rule sentence exists |
| `2-build.md` gains one pointer line | Same contract test |
| Contract test asserts rule sentence, pointer, no restatement | Same contract test |
| Live checks: P2/P4 dispatched with `assign`, vendors recorded | **No automated test** — live build log evidence in `plan.md` |
| At least one assign-picked opencode dispatch | **No automated test** — live build log evidence in `plan.md` |
| `workflow-doctor` READY, `setup-validator`, `graphify --check`, `graphify-relations --check`, `changelog --check`, `docs-links` exit 0 | Verified above |
| Full suite on independent clone 0 new failures | **Unverified** in this read-only review |

## Exit criteria with no named automated test

These are manual or live checks that the unit suite does not exercise:

1. **P1:** `git status --porcelain` shows only the two P1 files changed by the worker.
2. **P3:** Only the two P3 files are changed.
3. **P2:** Only the four P2 files are changed.
4. **C1:** Live dispatch log evidence that P2 and P4 were dispatched with `assign`, with picked vendors recorded.
5. **C1:** At least one assign-picked **opencode** dispatch occurred during the build.
6. **C1:** Full suite on an independent clone has 0 new failures.

## Checked, nothing found

- All 226 targeted unit tests pass.
- The golden grader case `role-pools-balance-load-across-roles` executes and passes.
- Every new exported function/surface (`leastLoaded`, `loadOf`, `dispatchInput`, `observeBalancedRoles`) has at least one direct assertion.
- Authorization/input-validation paths (invalid `runId`, duplicate keys, malformed `assign`, unknown keys) are tested for refusal.
- All 15 in-memory mutants (3 per changed source file) were caught by the suite.
- C1 integration checks (`workflow-doctor`, `setup-validator`, `graphify --check`, `graphify-relations --check`, `changelog --check`, `docs-links`) exit cleanly.
- The contract test confirms `orca-vendors.md` owns the rule and `2-build.md` points to it, with no other phase doc restating it.

## Unverified

- **C1 live smoke:** Whether the coordinator actually dispatched P2/P4 with `assign`, recorded the picked vendors, and ran at least one assign-picked opencode dispatch. The evidence is recorded in `plan.md` live-evidence notes; no automated test reproduces it.
- **Independent-clone full suite:** Whether the full suite passes on a fresh independent clone with 0 new failures. Not run in this read-only review.

## Mutant verification details

Mutations were applied to copies under `/private/tmp/orca-balanced-mutants/`; the repository was never modified. The verification harness re-ran the relevant test file for each mutation and confirmed the suite failed.

| file | mutant | how the suite caught it |
|---|---|---|
| `orca-assign.mts` | ignore-load | `least-loaded member wins...`, `reviewer still excludes...`, `pool independence...` fail because load no longer orders picks. |
| `orca-assign.mts` | ignore-rotation | Tie-break tests expect rotation from `planIndex`; mutant always picks the first eligible member. |
| `orca-assign.mts` | skip-ignored | `a skipped member is removed...` and reviewer tests fail because skipped members are no longer removed. |
| `orca-dispatch.mts` | clean-failure-as-load | `loadOf counts the owning set...` asserts a failed record contributes 0 load. |
| `orca-dispatch.mts` | drop-runId-filter | `loadOf counts the owning set...` asserts records from another Run are excluded. |
| `orca-dispatch.mts` | disable-load-changed-repick | `load-changed: an interleaved load change...` fails because the second dispatch no longer re-resolves. |
| `orca-ledger.mts` | no-runId-validation | `runId is validated at every input boundary...` expects invalid runIds to be rejected. |
| `orca-ledger.mts` | runId-in-patch | `runId is validated...` / update tests reject patches that mention `runId`. |
| `orca-ledger.mts` | ignore-admit | `reserve runs admit inside the mutation lock...` expects `load-changed` when `admit` returns false. |
| `orca-run.mts` | no-duplicate-key-check | `invalid, duplicate or misspelt dispatch runId...` expects duplicate keys to yield `usage: dispatch`. |
| `orca-run.mts` | no-runId-validation | Same test expects malformed runIds to be rejected. |
| `orca-run.mts` | drop-runId-output | `dispatch runId reaches the dispatch options...` asserts `base.runId` is present when supplied. |
| `orca-eval-grader.mts` | observer-sees-expected | `the module imports no node: module...` / source-invariant tests assert observers never receive `expected`. |
| `orca-eval-grader.mts` | always-pass | `actual never comes from expected...` flips expectations and expects failures; a mutant that ignores mismatches makes the case pass incorrectly. |
| `orca-eval-grader.mts` | balanced-ignores-load | `role-pools-balance-load-across-roles` fails because greedy fairness no longer holds. |

## Count of findings by severity

- **must-fix:** 0
- **should-fix:** 0
- **acknowledged:** 0
- **unverified:** 2 (C1 live smoke; independent-clone full suite)
