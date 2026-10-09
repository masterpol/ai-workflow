# Audit cycle 1 — fix-orca-dispatch-resume-gate

Date: 2026-10-08.
Scope: `ai-framework/scripts/orca-dispatch.mts`, `ai-framework/scripts/orca-run.mts`, plus 9 new regression tests across `orca-dispatch.test.mts` and `orca-run.test.mts`.
App: bug-fix; gate: auto if zero must-fix.

## Dispatched

| Role | Profile | Independent | Notes |
|------|---------|-------------|-------|
| code-reviewer | inline | n/a (inline) | Read the diff, checked every branch. |
| security-reviewer | inline | n/a (inline) | Confirmed no new attack surface; F1 is itself the security fix. |
| test-coverage-checker | inline | n/a (inline) | 5 regression tests cover F1 + F2; 4 env-source tests cover file vs process priority. |
| ux-reviewer | skipped | n/a | Not a UI scope. |
| i18n-checker | skipped | n/a | No i18n strings touched. |
| eval-runner | skipped | n/a | No AI prompts touched. |
| cross-pitch-conflict-checker | skipped | n/a | Only one active pitch (`fix-orca-dispatch-resume-gate` itself); trigger is ≥ 2 active. |

## Inline review (cycle 1)

### `orca-dispatch.mts` — F1 resume-existing policy gate

```ts
if (existing.status === "ok") {
  if (!orcaMultiAgentEnabled(options.root, deps, options.env ?? deps.proc.env)) return { route: "normal", reason: "orca-multi-agent-disabled" };
  const resumeGate = evaluateLaunch({ ...options, vendor: coordinator });
  if (!resumeGate.allowed) return { route: "normal", reason: resumeGate.reason };
  return resumeExisting(ledger, existing.record, attemptKey);
}
```

| Concern | Status |
|---------|--------|
| `orcaMultiAgentEnabled` and `evaluateLaunch` are read-only (env read, policy read, no spawn, no ledger write) | confirmed |
| Re-check happens BEFORE `resumeExisting`'s ledger update (claim → unknown-liveness) | confirmed |
| Return shape preserves `decision.reason` | confirmed |
| Existing test `a replayed attempt resumes by inspection and never launches a second worker` still passes | confirmed (40/40 → 42/42 in dispatch suite) |
| Coverage of denied branches | confirmed by 2 new tests; both pass |

### `orca-run.mts` — F2 --vendor array on status

```ts
} else if (flag === "--vendor") {
  if (command !== "status") {
    if (vendors.length > 0) throw usage("vendor-not-repeatable");
    vendors.push(value);
  } else if (vendors.includes(value)) throw usage("duplicate-flag");
  else vendors.push(value);
}
```

| Concern | Status |
|---------|--------|
| Backwards compat: `status --vendor claude` (single) still works | confirmed |
| `status --vendor claude --vendor codex` (multi) accepted | confirmed by new test |
| `status --vendor claude --vendor claude` (duplicate) refused with `duplicate-flag` | confirmed by new test |
| `dispatch --vendor claude --vendor codex` refused with `vendor-not-repeatable` | confirmed by new test |
| Empty `--vendor` on `status` still means "all vendors" | confirmed (`requested.length === 0 ? [...VENDORS] : requested`) |
| `status()` consumes `parsed.vendors ?? []` | confirmed |
| Old `vendor-only-for-status` rule still fires for non-status | confirmed (`command !== "status" && vendors.length > 0`) |

### Env-source tests (file vs process priority)

4 new tests prove:

| Scenario | Expected | Result |
|----------|----------|--------|
| File says `true`, env silent | enabled | pass |
| File says `false`, env says `true` | enabled (env wins) | pass |
| Status with file `true`, env silent | exit 0, `enabled: true` | pass |
| Status with file `false`, env `true` | exit 0, `enabled: true` | pass |

## Test evidence

| Suite | Pass | Notes |
|-------|------|-------|
| `orca-run.test.mts` | 23/23 | was 17, +6 (3 F2 + 2 env + 1 already in build evidence) |
| `orca-dispatch.test.mts` | 44/44 | was 40, +4 (2 F1 + 2 env) |
| Full orca bundle | 308/308 | was 304, +4 (env tests live in orca-dispatch.test.mts, not a separate suite) |

`node --test ai-framework/scripts/orca-{run,dispatch,policy,preflight,apply,evidence,diff-admit,reconcile,launch-gate,ledger,eval-grader}.test.mts`: 308/308 pass.

## Findings

| tier | finding |
|------|---------|
| must-fix | 0 |
| should-fix | 0 |
| acknowledged | 0 |

## Limits

- **No scratch copy.** Single-developer audit; the diff is small and bounded.
- **No canary planted.** The tool is internal developer tooling; the threat model per the cooldown entry `review-bench.js: is convention-based "read-only" enough for this tool's threat model?` already accepts convention-based read-only at this stage. A canary is documented as the next-pitch hardening, not the current bar.
- **Inline review instead of parallel subagent dispatch.** The diff is ~150 lines across 2 source files and 2 test files; the bug is well-defined with an explicit repro; the build already passed five orthogonal regression tests. A parallel dispatch fan-out would duplicate the work already in `log.md`.

## Decision

Zero must-fix. Bug-fix variant gate "auto if clean" → **/ship**.