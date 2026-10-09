# security review c2

independent: no
canary: caught semantically; source mutation isolated to scratch
read-only: verified by nonsecret scratch copies and secret-excluding RuntimeDeps repo guard (audit-guard-secret-safe.json), with clean before/after comparisons
prompt-sha256: 25a854c9f3c4feaf0723c58c5b05bb95af3f677a4601981f937e86d83e3635cb
model: claude-sonnet (placement sonnet)
cross-file interactions: reviewed

Exact prompt: `.project/metrics/codex-orca-parity/audit-security-c2-prompt.txt`. Launch input: `audit-security-c2.json` under the same metrics directory. Fresh Orca worker, explicit Codex coordinator. Claude is an alternate family to the current Codex author; no same-family independence claim is made. Review breadth and unexecuted checks are preserved in the report. The second-cycle timeout canary was described in copied deviation records, so its recognition is not a blind canary proof.

| Finding | Verified | Disposition |
|---------|----------|-------------|
| Scratch-only planted vendor/timeout defect | yes, against explicit source mutation and baseline/mutant tests | Excluded from checkout findings; actual vendor codex and host timeout8 verified by coordinator |
| Non-canary review findings | individually triaged in audit-cycle-1.md and audit-cycle-2.md | See confirmed fixes, deferrals and rejected claims |

## Original report

Reviewed scratch security-c2 (static reading plus 4 focused Node tests EXECUTED: all pass - doctor rejects shell text, doctor passes valid, post-probe elapsed, input accepts exactly 64KiB). One real defect: HIGH .codex/hooks.json line 18 has timeout 3 while contract and doctor (workflow-doctor.mts:312 'timeout !== 8') require 8; running doctor on installed registration would fail 'timeout is not 8' (static inference, doctor not run on installed file; orca-vendors.md:154 documents 8). Patch tests pass because they use fixtures with 8; not a patch-logic bug, a registration mismatch.
Checklist: (1) Exact executable command: PASS static - inline form equality (307) or assigned form endsWith + guardedAssignment regex (306) anchored ^$ with Git assignment and '||' fallback of 'exit 2' or printf of single-quoted text excluding ' and control chars \u0000-\u001f; no injection path (no quote, newline, $, backtick escapes) and echoed example text/comments rejected (test executed). (2) Guarded Git assignment validation: PASS static; installed hooks.json command matches this form. Low note: loose includes() checks at 295-300 only feed message wording, final decision is the strict equality. (3) Deadline budgets: PASS script 5000/decision 4000/min(remaining) at hook.mts:6-7,53-56; elapsed guard at :58 before success output (test executed). LOW: timer/end start at :34 after orcaMultiAgentEnabled (:33) sync env/config read, so that read is outside the 5s budget; bounded by file read, accept. (4) Root/prompt boundaries: PASS - root only from --root (:14-20), absolute + isDirectory required (:49-51) only for phase prompts, payload never supplies root; leading /phase or $phase only (:24); non-object/non-string prompt blocks, 64KiB cap (executed test). Note: first --root wins, a missing value falls back to cwd for the enable check only, then blocks invalid-root on phase prompts. (5) Host evidence limits: PASS - doctor comment (228-230, 153) and pass message state wiring only, no host activation claimed; criterion 7 unverified preserved. (6) Docs: harnesses.md:70-71 and orca-vendors.md:176-179 state Git-dependent root bootstrap, blocks even when Orca off, project-root-unavailable; consistent with hooks.json. Cross-file: doctor -> hooks.json/adapter/tests consistent EXCEPT timeout 3 vs 8. Unverified: live Codex host activation, full suite, Bun path, role file security-reviewer.md and rules/ read only by name not exhaustively. No files modified.
