# Build completion — 2026-10-18

**State:** the approved two-phase delivery and fixture repair are verified; R1 completion and `/build end` await approval. S3 is deferred, not passed. No actual audit, ship, commit, merge or publication has run.

## Delivered scope and approved revision

| Scope | Result | Evidence |
|-------|--------|----------|
| S1 — Build wrapper and reusable proof | Done and previously approved; 1,314→489 wrapper words | [build-evidence.md](build-evidence.md) |
| S2 — Audit wrapper | Done and previously approved; 941→468 wrapper words | [audit-evidence.md](audit-evidence.md) |
| S3 — Ship wrapper | Deferred by explicit approval; restored to 635 words | [s3-review.md](s3-review.md), failed trial preserved |
| R1 — Upgrade-fixture post-sync ignore merge | Done; six-line repair, real verification passed | Current record and [upgrade-repair.md](upgrade-repair.md) |

The user approved s3-review.md's recommended revision. Before restoring the four S3 files, the coordinator checked every recorded current hash and every snapshot hash. Canonical ship, Cursor ship and both shared proof files now exactly match their pre-S3 bytes. All six instruction-source hashes again match the accepted S2 report, manifest SHA-256 `f2e7a816a2d31cfdb9963c84cb4ee3718edeb97f5048c5cde64e023bfd3d35b4`.

R1 changes only `ai-framework/scripts/runtime/upgrade.test.mts`: temporary historical projects merge the documented eval run/cache ignore rules after sync/config migration, preserving existing rules. This fixes the three health assertions without weakening workflow-doctor. Current real `.gitignore`, dirty doctor and doctor tests, SETUP.md and the unchanged reviewer source retain their pre-revision hashes. Other pitch, knowledge and graph edits are preserved.

Version **2.31.8** was appended through changelog.mts after workflow-doctor passed. Prior entries and all rejected S3 observations remain unchanged. Cumulative implementation against pre-shape HEAD `7b3bbad86b399c454004ec9b4f8bd93e5cf21b5d`: **1,308 added+deleted lines / 1,500**, **11 actual changed paths**, including the 478-line dataset, Cursor copies, fixture repair and every version entry. The current HEAD is still that same commit. No cap increase or optional integration-owner edit was needed.

## Current-session verification

Actual upgrade tests, exit **0**:

```text
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 97142.467167
```

Complete Node suite, including nested runtime and hook tests, exit **0**:

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/*.test.mts ai-framework/scripts/runtime/*.test.mts ai-framework/hooks/scripts/*.test.mts
```

```text
ℹ tests 1686
ℹ suites 32
ℹ pass 1683
ℹ fail 0
ℹ cancelled 0
ℹ skipped 3
ℹ todo 0
ℹ duration_ms 104280.263625
```

The three skips are the existing Windows-drive case, the existing Bun-host parser case and the explicit live-mode test in the ordinary suite. No new skip hides the earlier upgrade failures; all three actual upgrade simulations now pass. Required live mode is run separately and does not skip.

| Required check | Current result |
|----------------|----------------|
| Shared five-file Node structural command | Exit 0; 84 total, 83 passed, 0 failed, 1 explicit live skip |
| Default Bun contracts/loading | Exit 0; 24 passed, 0 failed, 1 explicit live skip |
| Required accepted S2 evidence, Node | Exit 0; 11 passed, 0 failed, 0 skipped |
| Required accepted S2 evidence plus contracts, Bun | Exit 0; 25 passed, 0 failed, 0 skipped |
| Workflow doctor | READY; 751 checks |
| Setup validator | READY; 23 checks; all 125 TypeScript entries parse |
| Graph check | CLEAN; 84 entries, 240 links; read-only |
| Changelog check | Version 2.31.8 matches latest entry |
| Diff whitespace check | Exit 0 |
| Source/parity/hash checks | Exact restored S2 source manifest, byte-identical Cursor copies and protected unrelated files verified |

Required evidence command:

```sh
IC_EVAL_REQUIRED=1 IC_EVAL_POLICY=remaining-approved-2026-10-18 IC_PHASE=audit IC_EVAL_BASELINE=.project/evals/runs/instruction-compression/baseline.json IC_EVAL_REPORT=.project/evals/runs/instruction-compression/audit-candidate.json node --test ai-framework/scripts/instruction-loading.test.mts
```

This revalidates the unchanged accepted S2 evidence against the restored current source hashes. It is not a fresh behavioral trial and does not relabel the failed S3 run. Default strict mode and all 14 contracts remain. Missing evidence still fails; no baseline vector, dataset or criterion was altered.

There is no application build, typecheck, lint or i18n command for this bundle's prose/test surface. Its applicable checks are Node/Bun tests, script parsing, content/link/integrity checks and native evaluation evidence. No missing required command is treated as a passing application check.

Raw current command logs, completion/hash records and final-size.json are under ignored `.project/metrics/instruction-compression/s3-preparation/approved-revision/`. Earlier failed full-suite and S3 criterion results remain separate immutable observations.

## Evidence limits and unresolved record

The accepted S2 run covers 31 frozen cases and 124 criteria per executable vendor. Historical scores remain Claude 116/4/4 and OpenCode 86/16/22 satisfied/failed/unverified, with no new loss at that accepted trial. OpenCode loading remains unverified, Codex unverified and Cursor unavailable; actual reviewer guards and installed native effects remain unverified. Single-trial decisions do not establish all-vendor equivalence.

The later rejected S3 trial emitted PASS with missing test evidence. The unchanged reviewer PASS/incomplete conflict remains unresolved and recorded for the closure follow-up; restoring S2 does not prove it fixed. Its two failed criteria and the grader's two hidden known zeros remain in rejected ship-candidate.json. Actual audit must consider these limitations and apply the normal required-review, canary, read-only guard and completion contracts. No actual-audit obligation is waived.

Observed routine source-word proxies previously fell for build and audit; S3's probe was effectively flat and is not counted as a gain. No total-token, cost or general latency saving is claimed.

No new worker was launched during this restoration. Earlier attempts are settled; the bound Run has zero reclaimable resources and an empty coordinator inbox. Its 27 runtime-retained/user-owned terminals are preserved; 32 resources are released.

## Gate

**Approve R1 completion and `/build end` to begin `/audit` / Revise a specific scope / Back to `/plan` / Stop.** This presents both R1 evidence and the full hill roll-up required by the project's big-batch gates. The approved restoration/repair did not authorize advancing through actual audit or ship.

## Build-end decision — 2026-10-18

The user replied “Approve” to this gate. R1 completion and `/build end` are approved; actual `/audit` begins. S3 remains deferred. No approval for ship, commit or publication is implied.
