# tests review c1b

independent: no
canary: caught semantically; source mutation isolated to scratch
read-only: verified by nonsecret scratch copies and secret-excluding RuntimeDeps repo guard (audit-guard-secret-safe.json), with clean before/after comparisons
prompt-sha256: 9bc2ea04b9248a4c49701628b48b25ab928ba249b07f16977c18052eebfc6f5a
model: claude-sonnet (placement sonnet)
cross-file interactions: reviewed

Exact prompt: `.project/metrics/codex-orca-parity/audit-tests-c1b-prompt.txt`. Launch input: `audit-tests-c1b.json` under the same metrics directory. Fresh Orca worker, explicit Codex coordinator. Claude is an alternate family to the current Codex author; no same-family independence claim is made. Review breadth and unexecuted checks are preserved in the report. The second-cycle timeout canary was described in copied deviation records, so its recognition is not a blind canary proof.

| Finding | Verified | Disposition |
|---------|----------|-------------|
| Scratch-only planted vendor/timeout defect | yes, against explicit source mutation and baseline/mutant tests | Excluded from checkout findings; actual vendor codex and host timeout8 verified by coordinator |
| Non-canary review findings | individually triaged in audit-cycle-1.md and audit-cycle-2.md | See confirmed fixes, deferrals and rejected claims |

## Original report

Tests review of scratch tests-complete done (tool calls ~12/16; no edits). Ran focused tests: hook 5 pass/1 FAIL (registration test), doctor Codex pattern 6/6 pass; scratch doctor --json exit 1.

FINDINGS
1. HIGH | .codex/hooks.json:23 (scratch) | plan contract: script deadline 5s below 8s host timeout; test hook.timeout===8 (orca-start-codex-hook.test.mts:183); doctor requires 8 (workflow-doctor.mts ~L303) | Scratch snapshot has "timeout": 3; live repo has 8 (diff -q differs; grep shows 3 vs 8). Command: node --test --test-name-pattern='exact Codex registration' hook.test -> "3 !== 8" at test.mts:183. Doctor on scratch: "Codex startup wiring" fails, exit 1. Failure attribution: SOURCE/registration (scratch copy stale vs live), not test defect. If 3 shipped, host kills hook at 3s before the 4s decision budget/5s deadline, so a slow probe fails open and the phase proceeds un-gated. Action: confirm shipped value is 8 and re-snapshot; consider a test asserting timeout > DEADLINE_MS.
2. MEDIUM | orca-start-codex-hook.test.mts:135-141 | plan "check elapsed after synchronous probes" | Stalled-probe test asserts only blocked("timeout") and <8000ms; does not prove which guard fired (decideStart deadline vs post-probe elapsed check at hook.mts:58 vs timer). No mutant removes the line-58 check. Plan crit 5 required a mutant only for vendor/blocking guard; those two mutants exist (test.mts:216-235, vendor + return 2->0) and pass, but the elapsed-check and root-validation (hook.mts:49-51) and invalid-input guards have no mutant proof.
3. MEDIUM | orca-start-codex-hook.test.mts:18-25 fake fidelity | The fake orca/claude/codex/opencode binary is one script returning canned JSON for every subcommand; version 1.4.222 and fixed worker handle 'worker' are hardcoded. It cannot show real Orca output shape drift, refused auth, or non-JSON output; worker-suppression test (L103-107) only proves terminal lookup against this canned list. Static fixtures ≠ runtime proof (known limit, not counted as passing).
4. MEDIUM | test.mts:143-156 | edge/timing | Hung-stdin test measures real wall clock 4500–7500ms (flaky under load; whole file ~24s). Also the test passes proc.exit stub so the real process.exit(2) path is never executed end-to-end; and the 64 KiB bound is tested at 65 KiB 'x' and 33K 'é' but not exact boundary 65536 bytes (off-by-one untested).
5. LOW | hook.mts:14-19 rootArgument | returns first --root; "--root" followed by another flag (e.g. ["--root","--foo"]) yields "--foo", caught as invalid-root (not absolute) - covered only for ["--root"] and ""; duplicate --root first-wins not tested. leadingPhase regex /^[/$]([^\s]*)/ - Unicode whitespace/NBSP delimiter untested ("/plan x" -> token "plan x" non-match; fine but unasserted).
6. LOW | workflow-doctor.mts:~278-309 | doctor matches by substring "ai-framework/hooks/scripts/orca-start-codex-hook.mts" and takes the first matching entry; a second UserPromptSubmit entry or wrong matcher/ missing description is not flagged; test.mts hook asserts exactly 1 entry but doctor does not. Doctor requires only type/runner/root/timeout; it does not check the git-failure exit-2 guard (test case 'unbound root' covers only missing workflow_root). Non-integer/string timeout ("8") is rejected by !==8 but is untested; numeric type case absent.

CHECKLIST (result per item)
- testing.md rules: guard-mutant rule met for vendor + exit-code only (PARTIAL); createTestDeps/tempFixture/captureIo/runScript used (PASS); macOS realpath alias not exercised (UNVERIFIED).
- 12 phases + slash/dollar: PASS (test.mts:71-77, 8.4s). Arg preservation incl newline: PASS.
- off: PASS (silent + in-process spies no stdin/child; L56-69).
- Bypass quoting: PASS (L94-101 six quoted/embedded negatives, three positives).
- Worker suppression: PASS vs fake (L103-107); real Orca UNVERIFIED.
- Input bounds/malformed/mistyped: PASS (ran, L128-133) except exact-boundary (see 4).
- Trusted roots: PASS (nested cwd, payload cwd, CLAUDE_PROJECT_DIR decoy, inline --root=, relative/missing/file) ran green.
- Deadlines: stalled-probe + hung-stdin present; hung-stdin not rerun (time cap), stalled-probe not rerun; PARTIAL (finding 2,4).
- Import error: present (L165-174, not rerun); UNVERIFIED by me.
- Mutants: vendor + exit mutants ran and passed (PASS); others missing.
- Registration/shell: FAIL in scratch due to timeout 3 (finding 1); Bun-missing shell case present at L176-213 (not independently verified past the L183 failure; later asserts did not execute).
- Doctor tests: 6/6 pass; they cover missing/wrong event/no runner prefix/flags/root variants/wrong timeout 5/type prompt/malformed JSON; scratch doctor run fails live, consistent with finding 1.
- Plan coverage mapped to assertions: crit 5 items all have assertions; crit 6 live ready and crit 7 host cases remain UNVERIFIED (accepted, not counted; deviations.md confirms Codex 0.161.0 probe produced no activation evidence).
- Node/Bun claims: Node only run by me; Bun parity and Node 100% hook coverage / 78.61% doctor claims NOT re-run (cap). Bun coverage crash documented in deviations.md, not reproduced.

CROSS-FILE: reviewed hook.mts, hook test, .codex/hooks.json, doctor wiring + tests, plan.md, deviations.md, orca-vendors.md lines 153-183 (8s/5s/4s budget stated; consistent with live 8, contradicts scratch 3). NOT reviewed in depth: AGENTS.md/CLAUDE.md Codex section prose, harnesses.md Codex section, orca-start.mts internals, orca-start-hook.test.mts (Claude), restore-vendor-adapters overlap. Overlap assessment: sibling pitch has no plan/impl, so actual overlap with doctor/hook generators is nil today; suggest merging codex-orca-coordinator-parity first, then rebasing restore-vendor-adapters generators onto the new startup check.

TRIED / DID NOT WORK: no 'timeout' binary needed; used python3 subprocess timeout=18. Did not run full hook suite (24s) so the timing/import/stalled tests are unexecuted by me. Nothing else failed.
