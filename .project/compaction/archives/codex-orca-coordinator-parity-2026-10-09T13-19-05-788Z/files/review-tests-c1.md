# tests review c1

independent: no
canary: caught semantically; source mutation isolated to scratch
read-only: verified by nonsecret scratch copies and secret-excluding RuntimeDeps repo guard (audit-guard-secret-safe.json), with clean before/after comparisons
prompt-sha256: d41b420dc393391fe5679f668c8f3b99851c79ef9dafcce3324fffae8fb70262
model: claude-haiku (placement haiku)
cross-file interactions: reviewed

Exact prompt: `.project/metrics/codex-orca-parity/audit-tests-prompt.txt`. Launch input: `audit-tests-c1.json` under the same metrics directory. Fresh Orca worker, explicit Codex coordinator. Claude is an alternate family to the current Codex author; no same-family independence claim is made. Review breadth and unexecuted checks are preserved in the report. The second-cycle timeout canary was described in copied deviation records, so its recognition is not a blind canary proof.

| Finding | Verified | Disposition |
|---------|----------|-------------|
| Scratch-only planted vendor/timeout defect | yes, against explicit source mutation and baseline/mutant tests | Excluded from checkout findings; actual vendor codex and host timeout8 verified by coordinator |
| Non-canary review findings | individually triaged in audit-cycle-1.md and audit-cycle-2.md | See confirmed fixes, deferrals and rejected claims |

## Original report

I reviewed the scratch copy read-only: the hook, .codex/hooks.json, and the test file, plus the plan adapter contract, using 3 of 12 tool calls. The main finding is a blocking defect at ai-framework/hooks/scripts/orca-start-codex-hook.mts:55, where decideStart is called with vendor 'claude' instead of 'codex'; the focused run of the test 'vendor is always codex' (node 24.21.0, --test-name-pattern) fails with actual 'coordinator claude, workers codex' versus expected 'coordinator codex, workers claude', and the vendor mutant anchor at the test's line 227 is absent from the hook source. Not verified: the other ~20 hook tests, the Bun run, the workflow-doctor test, the AGENTS.md/harnesses/orca-vendors Codex sections, and the fresh Codex host cases (explicitly unverified under criterion 7); fix the vendor literal and rerun the full hook test file.
