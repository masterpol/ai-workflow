# tests review c2

independent: no
canary: caught semantically; source mutation isolated to scratch
read-only: verified by nonsecret scratch copies and secret-excluding RuntimeDeps repo guard (audit-guard-secret-safe.json), with clean before/after comparisons
prompt-sha256: 599eb5056221261b5f510f78fa5ea8857371d3d04e47eff1757edf1ea80fe42c
model: claude-sonnet (placement sonnet)
cross-file interactions: reviewed

Exact prompt: `.project/metrics/codex-orca-parity/audit-tests-c2-prompt.txt`. Launch input: `audit-tests-c2.json` under the same metrics directory. Fresh Orca worker, explicit Codex coordinator. Claude is an alternate family to the current Codex author; no same-family independence claim is made. Review breadth and unexecuted checks are preserved in the report. The second-cycle timeout canary was described in copied deviation records, so its recognition is not a blind canary proof.

| Finding | Verified | Disposition |
|---------|----------|-------------|
| Scratch-only planted vendor/timeout defect | yes, against explicit source mutation and baseline/mutant tests | Excluded from checkout findings; actual vendor codex and host timeout8 verified by coordinator |
| Non-canary review findings | individually triaged in audit-cycle-1.md and audit-cycle-2.md | See confirmed fixes, deferrals and rejected claims |

## Original report

TESTS REVIEW (scratch tests-c2, read-only, 5 tool calls; no repo writes).
FINDING 1 HIGH: .codex/hooks.json UserPromptSubmit hook has "timeout": 3 (contract/docs/doctor/tests require 8; script deadline 5s > 3s host timeout, so host may kill before script blocks, breaking the 5s/4s/8s contract). Violates plan criterion (5s<8s host) + testing.md guard rule. EXECUTED: 'doctor passes the installed guarded Codex registration' (workflow-doctor.test.mts:504-510) FAILS with falsy assert (doctor reports 'timeout is not 8', workflow-doctor.mts:312-314). Also test orca-start-codex-hook.test.mts:208+ asserts hook.timeout===8 (static read: would fail; not executed). Fix: set timeout 8 in installed hooks.json. Doctor and test correctly catch it.
CHECKLIST: (1) echo/comment/trailing-command regressions: PASS, executed 'doctor rejects shell text...' (4 inputs: echo, #, ;echo done, true;#), workflow-doctor.mts:303-311 exact-match/anchored guardedAssignment regex. (2) installed registration: FAIL (finding 1), legacy inline registration PASS executed ('doctor passes a valid...'); guarded legacy 'exit 2' form accepted by regex statically (static only). (3) exact 64KiB accepted / +1 rejected: PASS executed. (4) post-probe elapsed guard mutation: PASS executed (guard at hook .mts:58 removed by mutant, ready leaks, assertion catches). (5) ordinary hook behavior preserved: static review of test list (off, phases, pass-through, worker, root) only; not executed (no full suite per brief). (6) Cross-file: doctor<->hooks.json<->hook script<->orca-vendors.md:154 (8s/5s/4s) consistent except hooks.json=3. Doctor malformed-fields test (462-481) and JSON test (483) static only. Docs prose Git-dependent root block: not verified. Host activation unverified (accepted criterion 7, no fake proof). Minor LOW: doctor detail string lacks check that timeout>script deadline relation beyond ===8 (acceptable).
UNVERIFIED: full suite, Bun, harnesses.md prose, live Codex host.
