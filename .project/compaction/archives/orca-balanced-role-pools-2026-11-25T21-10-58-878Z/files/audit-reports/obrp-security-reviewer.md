# Security review: orca-balanced-role-pools (audit cycle 1, security-reviewer, read-only)

Scope: orca-assign.mts, orca-dispatch.mts, orca-ledger.mts, orca-run.mts, orca-eval-grader.mts, their tests, the orca-vendors.md Assignment section, and the 2-build.md pointer. Diff is vs `main`.
Proofs live under `/private/tmp/obrp-sec/` (`scan.mts`, `root/*.json`). Nothing in the repo was edited.

**Result: no critical, high or medium findings. 0 important, 4 low, 2 info.**

## Findings

| Severity | file:line | Rule or check violated | Concrete failure scenario (command, output) | Suggested fix |
|---|---|---|---|---|
| low | ai-framework/scripts/orca-dispatch.mts:303 | Re-pick should re-run the launch gate the same way the first pick did (security.md §9 "re-validate"; `retry-only-on-positive-proof...`) | The re-pick branch for a non-OpenCode vendor runs `delete gateOptions.agentId`. `gateOptions` is `{...options}`, so a library caller's own `options.agentId` (`LaunchOptions.agentId`, orca-launch-gate.mts:111) is dropped on the re-pick path only. The first-pick path keeps it for non-OpenCode vendors. The CLI cannot set `agentId` (`dispatchInput` has no such key), so it is not reachable from input. It is a behaviour divergence between the two paths, not an escalation. Read from the code and not executed. | Restore the caller's original value instead of deleting: `gateOptions.agentId = options.agentId`. Or make the first path do the same, so both paths agree. |
| low | ai-framework/scripts/orca-dispatch.mts:261-263 | Fail-closed behaviour | `admit` is built only if the second `list()` is ok and the pool is an array. Otherwise `admit` stays `undefined` and the claim goes ahead unchecked. This fails open for balancing only. Ownership, capacity and overlap are still enforced inside `reserve`, which returns `refused` or `corrupt` on a non-ok list (orca-ledger.mts:309-314). No ownership change is possible. | Either note in the code that balancing fails open by design, or return `blocked: ledger-*` when the list is not ok. |
| low | ai-framework/scripts/orca-dispatch.mts:162-263 | An ownership predicate must mirror the claim transaction's set (pattern 1) | `buildAdmit` is built for every assignment pick, including the rotation-after-clean-failure pick (`nextMember`) and, for the same reason, a recorded-owner pick. The rotation pick is chosen by pool order, not by load. `admit` then requires that vendor to hold the minimum load, which it may not. The result is a spurious `load-changed`. The re-pick resolves to the same rotation vendor and claims without `admit`, so the outcome is correct. The cost is a second `resolveAssignment` and a second OpenCode installed-agent probe (a spawned child). Ownership is unaffected. This is a reasoned trace, not executed. | Build `admit` only when the pick came from `pickImplementer` or `pickReviewer`, that is, when `failed.length === 0` and there is no recorded owner. Have `resolveAssignment` return its pick source. |
| low | ai-framework/scripts/orca-run.mts:190-207, orca-dispatch.mts:223 | `runId` is untrusted input; the integrity of the load scope | `runId` is only shape-checked (`^run_[a-z0-9]{6,32}$`). Nothing ties it to a real Orca Run. The doc says "verified at phase start", but no code enforces that. Whoever composes the input can pass a fresh `runId` per dispatch and reset load to zero, which degrades to plain rotation by `planIndex`. It cannot move an owned task, because `resolveAssignment` returns the owner before load is read. The effect is lost balancing only. | Keep it as documented. Optionally have the run helper inject or verify the `runId` from `orca run-current` rather than trusting the input file. |
| info | ai-framework/scripts/orca-run.mts:190-207 | Duplicate-key scan coverage | The scan checks top-level keys only (`depth === 1`). Nested duplicates (`assign`, `placement`, `scope`) fall through to last-wins in `JSON.parse`. Proof: `/private/tmp/obrp-sec/scan.mts`, case `nested-dup-top` returns `ok:2`. That is fine for `runId`, which is top-level only. A nested duplicate `assign.role` would be seen only as its last value. All values are still re-validated by `exactKeys`, so there is no new bypass. | None needed. Optionally document that only top-level duplicates are refused. |
| info | ai-framework/scripts/orca-run.mts:240-241 | `exactKeys` usage errors | With `exactKeys` now taking `usage("dispatch")`, every key-set error in a dispatch input (unknown key, missing key, bad `runId`) exits 2 (`usage`) instead of 3 (`input-refused`). Executed: `dup.json` exits 2 with `{"error":"usage","reason":"dispatch"}`, and `proto.json` still exits 3 with `input-prototype-key`. Both outputs are fixed tokens and nothing from the input is echoed. Callers that branch on exit 3 for bad dispatch keys will see a changed code. | Confirm this is intended (the pitch deviation list) and that the docs describe it. |

## Checked, nothing found

- **`runId` shape.**
  - The regex is `^run_[a-z0-9]{6,32}$` and is applied at three layers: `dispatchInput` (orca-run.mts:242), `dispatchScope` (orca-dispatch.mts:226) and `validateRecord` (orca-ledger.mts:164).
  - `$` has no multiline flag and JS does not match before a trailing newline. Executed: `"run_aaaaaa\n"` gives usage exit (`nl.json`), and so does the uppercase `run_AAAAAA` (`up.json`).
  - Characters outside `[a-z0-9]` cannot form a prototype key, and the value is stored as a plain own string property.
- **Prototype keys.** `__proto__` at the top level is refused as `input-prototype-key` (exit 3, `proto.json`). `rejectPrototypeKeys` still runs before the new scan.
- **Duplicate-key scan: correctness.**
  - It decodes keys with `JSON.parse(part)`, so `"runId"` is caught. Executed: `dupesc.json` gives usage.
  - Braces inside strings are consumed by the string alternative first, so depth is never miscounted. Executed: `brace-in-string` gives `dup:runId`.
  - U+2028 in a string and the escaped-key duplicate are both caught.
  - The input is already valid JSON because `JSON.parse` runs first, so the regex never sees unterminated strings. A backslash followed by U+2028 is invalid JSON and is rejected before the scan.
  - The scan runs only for the `dispatch` command.
- **Duplicate-key scan: cost and ReDoS.**
  - The pattern `"(?:[^"\\]|\\.)*"` has disjoint alternatives on their first character, so there is no catastrophic backtracking.
  - The `/^\s*:/` lookahead is anchored and scans only the whitespace after each string token.
  - Input is capped at `MAX_INPUT_BYTES = 64 KiB` (orca-run.mts:26) and is read through the guarded reader.
  - Executed, in `/private/tmp/obrp-sec/scan.mts` (output lines `manykeys`, `strvals`, `ws`, `bigstr`, `arrstr`): about 6.6k keys in 65 KB took 2.3 ms; 5.5k string values took 1.9 ms; 64 KB of whitespace took 0.1 ms; 15k array strings took 0.9 ms. The time is linear, with no quadratic `slice` cost observed.
- **Load counting.**
  - `loadOf` with a `runId` counts only records of that Run that pass `holds`, which is the reserve task-owned set plus settled-with-report and `processOwnerPid`. A settled clean failure, another Run and a record without `runId` all count as zero. Without a `runId` it counts live attempts only.
  - Vendor keys come from ledger records, which `validateRecord` constrains, and the tally is a `Map`, so there is no prototype pollution through `vendor`.
  - A worker has no path to write `runId`: `PATCH_KEYS` excludes it, so it is claim-time only.
- **No ownership change from balancing.**
  - In `resolveAssignment` the `attempts.find(holds)` check returns the owner before `loadOf` is consulted.
  - `reserve` runs `task-owned` and `path-overlap` before the capacity and `admit` checks (orca-ledger.mts:313-328). `admit` can only turn a claim into `load-changed`, never into a claim on an owned task.
  - The re-pick's second `reserve` has no `admit`, so there is no loop. It is bounded to one re-pick.
- **Re-pick and the launch gate.**
  - The pre-pick gate result (`decision`) does not depend on the worker vendor, because `gateOptions.vendor` is the coordinator.
  - `worker-not-configured` is re-checked for the new vendor (orca-dispatch.mts:305).
  - OpenCode agent resolution is redone when the new vendor is `opencode` (`gateOptions.agentId` is set).
  - `launchWorker` re-gates immediately before the spawn.
  - The `delete gateOptions.agentId` divergence is the low finding above.
- **Fail-closed behaviour.** A refused, corrupt or non-ok list makes `reserve` return `refused` or `corrupt` and never `claimed`. A `load-changed` outcome on a named-`vendor` dispatch (`admit` is undefined there) is unreachable, and the code blocks it anyway (`ledger-claim-load-changed`). `withMutationLock` releases the lease in `finally` (orca-ledger.mts:287), so a throwing `admit` cannot leak the lock.
- **Replay.** `runId` is part of the canonical record comparison (`canonical(...)`). The same attempt key with a different `runId` returns `conflict` and is never silently re-labelled. A resume of an existing attempt takes the early `existing` path and ignores the new `runId`.
- **Eval grader (new executed case).** All inputs come from the repo's own dataset, and the observer only drives in-memory records through the real `loadOf` and the pickers. The explicit-vendor probe uses a fake Orca under a fresh temp root. Nothing from untrusted output reaches a command, a path or a reason string.
- **Docs.** The 2-build.md pointer line adds no instruction that overrides a gate. The Assignment section matches the code (the `runId` regex, the `load-changed` single re-pick, and unchanged rotation).
- **Existing tests.** `bun test` on orca-assign, orca-ledger and orca-run: 94 pass, 0 fail.

## Unverified

- Whether the dispatch and grader tests pass: only the three suites named above were run. orca-dispatch.test.mts and orca-eval-grader.test.mts were not run (time and tool budget).
- The spurious `load-changed` on the rotation pick (finding 3) and the `agentId` divergence (finding 1) were not reproduced against `dispatchScope`. They are reasoned from the code.
- Concurrent behaviour of the real mutation lock was not exercised. It is the recorded deviation, and `buildAdmit` stays inside the lock because `admit` runs inside `reserve`.
- Whether the exit-code change from 3 to 2 matches the pitch contract (`pitch.md`, `plan.md`) was not cross-checked.
