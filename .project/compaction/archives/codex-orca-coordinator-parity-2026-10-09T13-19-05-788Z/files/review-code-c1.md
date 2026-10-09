# code review c1

independent: no
canary: caught semantically; source mutation isolated to scratch
read-only: verified by nonsecret scratch copies and secret-excluding RuntimeDeps repo guard (audit-guard-secret-safe.json), with clean before/after comparisons
prompt-sha256: afbc57cbb932769bd135aa8eb94a9f84aa52cdd9b1d74d685d1bef4590a0f405
model: claude-sonnet (placement sonnet)
cross-file interactions: reviewed

Exact prompt: `.project/metrics/codex-orca-parity/audit-code-prompt.txt`. Launch input: `audit-code-c1.json` under the same metrics directory. Fresh Orca worker, explicit Codex coordinator. Claude is an alternate family to the current Codex author; no same-family independence claim is made. Review breadth and unexecuted checks are preserved in the report. The second-cycle timeout canary was described in copied deviation records, so its recognition is not a blind canary proof.

| Finding | Verified | Disposition |
|---------|----------|-------------|
| Scratch-only planted vendor/timeout defect | yes, against explicit source mutation and baseline/mutant tests | Excluded from checkout findings; actual vendor codex and host timeout8 verified by coordinator |
| Non-canary review findings | individually triaged in audit-cycle-1.md and audit-cycle-2.md | See confirmed fixes, deferrals and rejected claims |

## Original report

Review done (read-only, scratch copy). Read hook, .codex/hooks.json, plan Adapter contract, doctor wiring (workflow-doctor.mts:231-309) and its tests; ran one focused test.

FINDINGS
1. BLOCKER / ai-framework/hooks/scripts/orca-start-codex-hook.mts:55 / plan contract "Select vendor: codex in code" / hook calls decideStart with vendor:"claude". Codex policy, readiness, worker-suppression and the ready line are evaluated for the Claude coordinator, so a Codex run can show ready or blocked from Claude's policy, and the context line wrongly says coordinator claude. Repro (scratch): AI_WORKFLOW_RUNNER=node node --experimental-strip-types --disable-warning=ExperimentalWarning --test --test-name-pattern="vendor is always" ai-framework/hooks/scripts/orca-start-codex-hook.test.mts -> FAIL; actual 'Orca: ready (coordinator claude, workers codex, opencode)' vs expected 'coordinator codex, workers claude, opencode'. The test's own mutant (line 227) swaps exactly this string, so the scratch copy appears to hold the mutant, or the fix was never applied. Fix: vendor:"codex". Note: if the repo copy already has "codex", this scratch is stale or mutated, so re-check the repo file before acting.
2. LOW / orca-start-codex-hook.mts:31-33 / contract "Off returns silently before policy discovery" / root falls back to deps.proc.cwd() when --root is missing, so the off check reads policy from cwd. A missing --root only blocks later for matching prompts, so the off check can read a different root than the trusted one. Harmless given the current registration, but untrusted-root policy read is possible. Suggest: no --root -> treat as invalid-root only when a phase matches, and skip the cwd fallback.
3. LOW / workflow-doctor.mts:278 / the wiring check matches by substring "includes" on one entry. A hook with the right string inside a comment or echo passes. It also does not check that the check is not shadowed by an earlier hook entry that exits 0. Structural only, accepted per criterion 7.
4. INFO / workflow-doctor.mts:~296 / the check hard-codes timeout===8 and the exact flag order; any legitimate reformatting (e.g. extra flags) fails. Acceptable, but brittle.

CHECKLIST
- Input matching: pass. Anchored /^[/$]token, exact PHASES set (12 names), args preserved with newlines, 64KiB cap, non-UserPromptSubmit returns 0. Leading whitespace not matched (matches contract).
- Root selection: pass except finding 2. Root only from --root, absolute and directory-checked; payload cwd ignored.
- Deadlines: pass. 5s timer, decision capped at min(4s, remaining), elapsed re-check after sync probes, finally clears timer. Not exercised live: timer path.
- State mapping: pass. blocked->stderr+exit 2; ready/bypassed->additionalContext; worker and off silent. Vendor wrong, see finding 1.
- Worker suppression: relies on decideStart terminal lookup; not independently verified, because finding 1 passes the wrong vendor into it.
- Direct entry: pass (runDirect(import.meta.url, main)).
- coding-standards/boundaries: hook imports runtime/ helpers only, no direct fs/process; pass. Dynamic import failure maps to block("internal").
- Cross-file callers reviewed: hooks.json command (git-root guard, Node pin, timeout 8 > 5), doctor check + tests (lines 396-486), AGENTS.md==CLAUDE.md (cmp same), AGENTS.md Codex section (start --vendor codex instruction consistent with plan). Not reviewed in depth: harnesses.md and orca-vendors.md Codex sections (only skimmed via grep), orca-start.mts internals beyond vendor use, Bun run.
- Tried that did not work: `timeout` binary missing on macOS (used perl alarm); no full test run (12-call limit).

SHARED CHECKOUT
Restore-vendor-adapters is pitch-only (no plan/code), so no real file overlap with the nine Codex files; only a proposed overlap on doctor/hooks generators. Suggested merge order: land Codex parity first (fix finding 1), then rebase restore-vendor-adapters on the new doctor check. OpenCode handoff touched only context records, no overlap.

KNOWN LIMITS (not passing): host trust/ready/blocked live cases unverified; missing-Node/non-POSIX bootstrap unverified.
