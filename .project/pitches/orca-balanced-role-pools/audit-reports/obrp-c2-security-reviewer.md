# Cycle-2 security review: orca-balanced-role-pools

Narrow review of the named cycle-1 fixes only. No new security defects found. Findings: critical 0, high 0, medium 0, low 0, info 0.

| severity | file:line | rule | failure scenario with command and output | fix |
|---|---|---|---|---|

## Cycle-1 findings: fixed / not fixed

| Cycle-1 finding | Status | Evidence |
|---|---|---|
| Security low: caller agentId lost on re-pick | Fixed | `orca-dispatch.mts:305–308` restores the caller's value, deleting only when originally absent. Executed scratch proof below: after an OpenCode-to-Codex re-pick, removing the caller's agent from the installed list causes the final gate to refuse; zero workers launch. |
| Security low: balancing fails open when ledger cannot be listed | Fixed by documentation; behavior intentionally retained | `orca-dispatch.mts:263` and `orca-vendors.md:401–402` state the behavior and retain reserve ownership/capacity/overlap guards. This accepted limitation is not a new defect. |
| Security low: recorded owners / clean-failure rotation subjected to load admission | Fixed | `orca-dispatch.mts:201,214–215,264`: owner and rotation returns omit balanced; only a load pick returns balanced:true and receives admission. Recorded-owner and clean-failure tests pass; the rotation test proves only two installed-agent reads. |
| Security low: runId is not verified against Orca | Fixed by documentation; verification intentionally absent | `orca-vendors.md:397–398` explicitly states shape-only validation and the balancing consequence. This accepted limitation is not a new defect. |
| Security info: nested duplicate-key scan coverage | Fixed by documentation; nested duplicate rejection intentionally absent | `orca-vendors.md:395–396` states top-level-only duplicate rejection and continued nested validation. |
| Security info: dispatch key errors now exit 2 | Fixed by documentation | `orca-vendors.md:395–396` documents unknown/missing/duplicate top-level keys and bad runId as exit-2 usage errors, distinguishing exit-3 input refusal. |
| Code-review medium: no admission on first dispatch with missing ledger directory | Fixed | `orca-dispatch.mts:264` includes missing as empty history. The new first-dispatch test inserts a competing real reserve before lock acquisition and verifies re-pick to OpenCode. |
| Code-review medium: admit mutant never removed the guard | Fixed | `orca-ledger.test.mts:649–660` asserts the guard exists, removes it, asserts changed source, imports the mutant, and observes claimed with a false callback. The adjacent intact implementation test observes load-changed with no record write. Both executed successfully. |
| Code-review low: missing LedgerRecord type import | Fixed | Explicit `import type { LedgerRecord }` at `orca-dispatch.test.mts:10`. Full typecheck not run. |

The cross-pitch branch/version findings are outside these named fixes and were not re-reviewed.

## Executed evidence

All proof files and test fixtures were restricted to `/private/tmp`; production modules were read unchanged. Test launches used fake Orca receipts and did not dispatch workers.

```sh
TMPDIR=/private/tmp node --experimental-strip-types --disable-warning=ExperimentalWarning --test --test-name-pattern='load-changed: a first dispatch|a clean-failure rotation pick|resolveAssignment|mutant: dropping the admit|reserve runs admit' ai-framework/scripts/orca-dispatch.test.mts ai-framework/scripts/orca-ledger.test.mts
```

Output: `tests 7`, `pass 7`, `fail 0`, exit 0. Includes malformed assignment refusal, least-loaded resolve, recorded-owner resolve, first-dispatch admission, rotation without extra probe, intact admission, and actual guard-removal mutant.

```sh
TMPDIR=/private/tmp node --experimental-strip-types --disable-warning=ExperimentalWarning --test --test-name-pattern='c2-security caller' /private/tmp/obrp-c2-security/agent-preservation.test.mts
```

Output: `caller agent restored: final gate agent-not-installed; worker-start count 0; repicked vendor codex`; `tests 1`, `pass 1`, `fail 0`, exit 0. The scratch test uses the existing fixture helpers and unchanged production imports, injects a competing OpenCode claim before reserve, then removes the caller's original agent from the fake installed list before the final gate. This verifies the restored caller constraint is actually enforced after re-pick.

Read `.claude/agents/security-reviewer.md`, `ai-framework/rules/security.md`, the cycle-1 reports, and the named production/test/documentation changes. No project backend companion exists at `.project/rules/backend.md`.

## Unverified

- Live Orca/OpenCode behavior and real multiprocess locking: not exercised; the known stale-read test limitation remains excluded.
- Full repository tests, dependency audit, typecheck, and unrelated cycle-1 branch/version findings: outside this narrow re-check.
- Already documented limitations listed in the worker brief were not re-audited.

## Security summary

| Tier | Count |
|---|---|
| must-fix | 0 |
| should-fix | 0 |
| acknowledged | 0 |

Checked: all named cycle-1 security fixes and related code-review fixes, with eight focused passing tests and source/documentation inspection above.
Unverified: broader/live checks listed above; no unfinished item within the requested narrow scope.

Verdict: PASS for the narrow cycle-2 security re-check.
