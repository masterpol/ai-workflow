# code review c2

independent: no
canary: caught semantically; source mutation isolated to scratch
read-only: verified by nonsecret scratch copies and secret-excluding RuntimeDeps repo guard (audit-guard-secret-safe.json), with clean before/after comparisons
prompt-sha256: 27ede8307d7b8ca09c1dfad6a3d8cf2d73c1d7dc454d61aafa19695229edab63
model: claude-sonnet (placement sonnet)
cross-file interactions: reviewed

Exact prompt: `.project/metrics/codex-orca-parity/audit-code-c2-prompt.txt`. Launch input: `audit-code-c2.json` under the same metrics directory. Fresh Orca worker, explicit Codex coordinator. Claude is an alternate family to the current Codex author; no same-family independence claim is made. Review breadth and unexecuted checks are preserved in the report. The second-cycle timeout canary was described in copied deviation records, so its recognition is not a blind canary proof.

| Finding | Verified | Disposition |
|---------|----------|-------------|
| Scratch-only planted vendor/timeout defect | yes, against explicit source mutation and baseline/mutant tests | Excluded from checkout findings; actual vendor codex and host timeout8 verified by coordinator |
| Non-canary review findings | individually triaged in audit-cycle-1.md and audit-cycle-2.md | See confirmed fixes, deferrals and rejected claims |

## Original report

EXECUTED (node --test focused): 'doctor passes a valid' PASS, 'doctor rejects shell text' PASS (echo/#comment/trailing '; echo done'/'true; #' all fail with 'does not execute'), 'input accepts exactly 64 KiB' PASS, 'post-probe elapsed guard' PASS; 'doctor passes the installed guarded registration' FAIL. DEFECT (HIGH, executed): scratch .codex/hooks.json UserPromptSubmit hook has "timeout": 3, but workflow-doctor.mts checkCodexStartupWiring requires timeout === 8 (line ~290 'timeout is not 8') and orca-vendors.md:154 plus plan say 8s host timeout; installed registration fails doctor with 'timeout is not 8' and violates 5s script/4s decision/8s host contract (3s host < 5s script deadline, so host can kill hook before script blocks). Fix: set timeout to 8; this looks like the planted 3s canary described in deviations.md line 17. CHECKLIST (static unless noted): whitelist correctness OK - inlineCommand exact equality and assigned form via endsWith + anchored guardedAssignment regex (guard prefix accepts only 'exit 2; ' or a printf-with-single-quoted-literal block; quotes/control chars excluded) so echo/comments/trailing commands fail, legacy inline form passes (executed); regex/quoting safety OK (anchored, no ReDoS-prone nesting, [^'] excludes injected quote); loose pre-checks (includes/regex at problems for runner and root) are redundant but harmless; test assertions OK, though the rejection test checks only 'does not execute' text and the installed-registration test is the only one catching timeout; doc contract consistency OK except hooks.json timeout; cross-file doctor->hooks.json->adapter->test callers: doctor test reads repo .codex/hooks.json so the timeout defect surfaces there; adapter timers (5s/4s) consistent with docs; harnesses.md lines 59-68 prose consistent with orca-vendors.md. UNVERIFIED: live Codex host activation (accepted plan criterion 7, no host proof), full suite and Bun not run per instructions, other rules files only skimmed by name, not read in full. No files modified.
