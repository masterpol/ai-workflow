# Audit — vendor-model-toon (cycles 1–2, 2026-10-17)

Dispatched via Orca (Run `run_cd8ca4ec5029`, coordinator claude): code (1, codex `gpt-6.1-sol` high, independent: yes) | security (1, opencode, model not selectable — launch-time model unsupported by this OpenCode TUI, so the worker used its configured default; independent: yes, canary caught) | test (1, codex `gpt-6-luna` high, independent: yes) | ux n/a | i18n n/a | eval n/a | cross-pitch n/a (1 other active pitch, shaped only)

- read-only: verified by `review-bench.mts guard snapshot|check` (clean: no head/status/tree change) plus scratch copy at scratchpad `rv` (26 files).
- canary: `convertV2` version regex widened from `2` to `[0-9]` in the scratch copy; baseline passed, canary broke scratch tests (`review-bench prepare`). Caught by all three reviewers.
- cross-file interactions: reviewed by the code reviewer (emitToon/loadConfig callers, verify/revalidate, state hashes). Pitch directory and `integrations/` docs were not in the scratch copy, so pitch/default-table parity was checked by the author (author-run).
- prompt hash: not recorded (`record-check` not run; prompts kept in the session scratchpad `p-*.txt`).

## Must-fix
None real. The reviewers' P1/medium findings on `convertV2` accepting versions 0/1/3/7/9 are the planted canary, not a defect in the shipped code (verified: shipped regex is `2` only; new test rejects 0, 1, 3, 7, 9).

## Should-fix (fixed this pass)
| ID | Source | File | Issue | Disposition |
|----|--------|------|-------|-------------|
| S1 | code | config-migrate.mts convertV2 | CRLF, trailing blank lines and an inline comment on the version line were not preserved | fixed (only the digit changes; EOL detected); test added |
| S2 | code | config-migrate.mts emitToon | always wrote the default models block, dropping a custom one on re-emit | fixed (emits `model.models` when present; `/` allowed in model ids); test added |

## Acknowledged
| ID | Source | Issue |
|----|--------|-------|
| A1 | code/test | A v3 file with `models` omitted or empty loads with no problems. By design: the block is optional in the reader and `workflow-doctor`'s mandatory check (agent-model-sweep) enforces presence. |
| A2 | test | Gaps: empty or non-string `model`, non-object vendor/profile, quoted or duplicate `schemaVersion` in `convertV2`. Branches are small and guarded; deferred to `/cooldown`. |
| A3 | security | No security findings beyond the canary; checklist (injection, ReDoS, symlink/TOCTOU, prototype keys, error echo, laundering) walked. |

## Cycle 2 (author-run, not an independent review)
Re-ran after the S1/S2 patches: config + migrator suites 137/137; full suite 1464/1470 with the same 3 `runtime/upgrade.test.mts` failures that fail at HEAD (followup logged); setup-validator READY; graph CLEAN. No re-dispatch: the patched surfaces are small and each has a direct behavior test.

## Orca bookkeeping
Workers `ctx_22eb4197b42d` (code) and `ctx_6e08fe41af26` (security) sent `worker_done`; release returned `retained` (terminals still open); `ctx_3f626c369a22` (test) released. Deliveries acknowledged.

## Reviewer record (cycle 1)

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check (clean) + scratch copy
model: gpt-6.1-sol (code), opencode default (security; launch-time model selection unsupported), gpt-6-luna (test)
cross-file interactions: reviewed
prompt-sha256: e99e27296b37e787dfcaaac9c318474d902cc16650bcbb5ab1ac62a499ac6897

| Reviewer | Prompt sha256 | Finding | Severity | verified |
|----------|---------------|---------|----------|----------|
| code (e99e27296b37) | convertV2 accepts any digit version | P1 | canary (planted), refuted as defect |
| code | convertV2 drops CRLF / trailing blanks / version-line comment | P2 | confirmed, fixed (S1) |
| code | emitToon drops custom models | P3 | confirmed, fixed (S2) |
| security (25bef56f8c91) | convertV2 launders non-2 versions | medium | canary (planted), refuted as defect |
| test (9b077733b6c7) | models/convertV2 coverage gaps | P2 | confirmed, acknowledged (A2) |
| test | omitted models block accepted | P1 | refuted: by design (A1) |
