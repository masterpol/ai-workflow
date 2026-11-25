# Code review: orca-balanced-role-pools, audit cycle 2 (narrow), role code-reviewer

Scope: cycle-1 fixes only, read-only. Verified the four listed cycle-2 changes in
`ai-framework/scripts/orca-dispatch.mts`, `ai-framework/scripts/orca-dispatch.test.mts`,
`ai-framework/scripts/orca-ledger.test.mts`, and `ai-framework/integrations/orca-vendors.md`.
Only this report was written to the repository.

## Findings

| severity | file:line | rule | failure scenario with command and output | fix |
|----------|-----------|------|------------------------------------------|-----|

No new defects were introduced by the cycle-1 fixes.

## Verification of the cycle-1 fixes

### 1. `resolveAssignment` returns `balanced: true` only for load picks; `dispatchScope` builds `admit` only for balanced picks and for a missing ledger directory; re-pick restores `agentId`

Source check:

- `ai-framework/scripts/orca-dispatch.mts:215` — `balanced: true` is emitted only when `failed.length === 0`, i.e. a load-based pick.
- `ai-framework/scripts/orca-dispatch.mts:264` — `admit` is built only when `resolved.balanced` is true and the ledger list is `ok` or `missing`.
- `ai-framework/scripts/orca-dispatch.mts:305-309` — on re-pick, the caller's original `options.agentId` is restored for non-OpenCode vendors.

The new tests cover the missing-directory and rotation cases:

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning \
  --test --test-name-pattern='load-changed: a first dispatch with no ledger directory|a clean-failure rotation pick is claimed' \
  ai-framework/scripts/orca-dispatch.test.mts
```

Output:

```text
✔ load-changed: a first dispatch with no ledger directory is re-checked, and a competing claim made just before it moves it to the next vendor
✔ a clean-failure rotation pick is claimed without a load re-check or an extra installed-agent probe
ℹ tests 2
ℹ pass 2
ℹ fail 0
```

### 2. `orca-ledger.test.mts`: the "mutant: dropping the admit callback" test actually removes the guard

Source check at `ai-framework/scripts/orca-ledger.test.mts:647-661`:

- Defines the exact guard string.
- Asserts the source contains it.
- Replaces it with the empty string and asserts the mutant differs from the original.
- Asserts the mutant claims instead of returning `load-changed`.

Command:

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning \
  --test --test-name-pattern='mutant: dropping the admit callback from reserve claims instead of returning load-changed' \
  ai-framework/scripts/orca-ledger.test.mts
```

Output:

```text
✔ mutant: dropping the admit callback from reserve claims instead of returning load-changed
ℹ tests 1
ℹ pass 1
ℹ fail 0
```

### 3. `orca-dispatch.test.mts`: `LedgerRecord` type import and `balanced` expectations

- `ai-framework/scripts/orca-dispatch.test.mts:10` now has `import type { LedgerRecord } from "./orca-ledger.mts";`.
- Existing `resolveAssignment` tests now expect `balanced: true` for load picks, e.g. lines 1091, 1095, 1113, 1135, 1204.
- New tests at lines 1278 and 1302 cover first-dispatch admission and clean-failure rotation.

### 4. `orca-vendors.md` Assignment section

`ai-framework/integrations/orca-vendors.md:395-402` now documents:

- Input errors (unknown/missing/duplicated top-level keys, bad `runId`) are usage errors (exit 2).
- `runId` is shape-checked but not verified against a real Orca Run.
- Only picks made by load are re-checked; recorded owners and clean-failure rotations are not.
- The first dispatch of a Run is included in re-checking.

## Cycle-1 findings: fixed / not fixed

| cycle-1 finding | status | evidence |
|-----------------|--------|----------|
| Code review #1: missing first-dispatch admission (`orca-dispatch.mts:261`) | **fixed** | `admit` is now built for `resolved.balanced && (listed.status === "ok" || listed.status === "missing")`; new test `load-changed: a first dispatch with no ledger directory...` passes. |
| Code review #2: mutant test did not actually drop the admit guard (`orca-ledger.test.mts:650`) | **fixed** | Test now asserts the guard is present, removes it, and asserts the mutant claims. |
| Code review #3: missing `LedgerRecord` type import (`orca-dispatch.test.mts:1157`) | **fixed** | `import type { LedgerRecord }` added at line 10; type reference resolves. |
| Security review #1: re-pick dropped caller's `agentId` (`orca-dispatch.mts:303`) | **fixed** | Re-pick branch now restores `options.agentId` for non-OpenCode vendors (lines 305-309). |
| Security review #3: clean-failure rotation pick was re-checked against load (`orca-dispatch.mts:162-263`) | **fixed** | `balanced: true` is emitted only for load picks, so `admit` is not built for rotation picks; new test confirms no spurious re-pick. |

## Unverified

- Live Orca dispatch, true cross-process concurrency, and OpenCode port behavior on this host: not exercised by this read-only worker.
- Full-repository typecheck and the complete test suite outside the five targeted files: not run.
- Independent-clone full suite: not run.
- The new first-dispatch test simulates a competing claim by intercepting `openSync` on `.mutation-lock`; it does not exercise the real production lock's blocking behavior. This is the documented known limitation.

## Review summary

| tier | count |
|------|-------|
| must-fix | 0 |
| should-fix | 0 |
| acknowledged | 0 |

Verdict: PASS — no new must-fix, should-fix, or acknowledged findings introduced by the cycle-1 fixes.
