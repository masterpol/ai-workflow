# Shipped: test-execution-performance

**Version: 2.40.0.** Bet: 2026-10-21. Shipped locally: 2026-10-21 (pending owner gate). Appetite: small-batch, within budget: 5 files (`run-tests.mts` 136 lines, `run-tests.test.mts` 176, `testing.md`, `VERSION`, `CHANGELOG.md`), about 400 lines including the guide.

## Result

A portable test command, `node ai-framework/scripts/run-tests.mts`: deterministic full discovery (75 files under `ai-framework/` and `.claude/hooks/`), labelled partial runs for named files, Node or Bun selection reporting the effective child runtime, bounded `--workers`, Node-only `--cache`, `--coverage`, `--list`, and nonzero exit propagation. Unsupported settings are refused, not dropped. **No speed setting was promoted:** the pitch's ≥20% median reduction was not shown, so defaults are unchanged and the guide says so.

## Scopes

| ID | Status | Hill done | Notes |
|----|--------|-----------|-------|
| S1 | shipped | 2026-10-21 | Worker cap fixed at 64 (no CPU-count dependency); audit hardened path containment to real paths |
| S2 | shipped as evidence record | 2026-10-21 | 15 full-suite runs on a fixed snapshot, host contended by two stray processes: result unproven |
| S3 | shipped | 2026-10-21 | `testing.md`, VERSION 2.40.0 |

## Measured outcome (full suite, medians; details in `measurements.md`)

| Candidate | Median | vs same-runtime default | Verdict |
|---|---|---|---|
| Node 4 workers | 121.9 s | 24% slower | no-go |
| Node compile cache | 90.8 s | 8% faster | below target, not promoted |
| Bun `--parallel=4` | 92.4 s | 66% faster | not promoted: Bun's own default fails two 5 s timeouts |

## No-gos honored

- ✅ no assertion removal, skips, retries or shortened deadlines; ✅ no runtime-default change; ✅ no dependency selection, CI sharding or verification integration; ✅ no test-matrix rewrite.
- ⚠️ Two stray CPU-bound processes (not part of this repo) were killed at the owner's request after the benchmark; their effect on timings is recorded, not corrected.

## Rabbit holes

- ✅ resolved: effective child runtime reported through `workflowInvocation`; Bun `--parallel` gated on `bun test --help`; cache refused with coverage.
- ⚠️ unresolved: idle-host baseline. Case-name parity between runtimes was compared by counts only.

## Verification

| Check | Result |
|---|---|
| `run-tests.test.mts` | 11 pass on Node, 11 pass on Bun |
| Full Node suite via the new command | exit 0; 2428 pass, 0 fail, 3 existing skips; 89.6 s |
| Setup validator / workflow doctor / docs-links | READY / exit 0 / 17 pass |
| Graph check | CLEAN |
| `pre-ship-verify.mts` | **FAILED: "No package.json or Muro document verifier found"** (known package-less-bundle limitation); direct checks above substitute and need owner approval |
| Build, typecheck, lint, i18n | not applicable: none exist in this repository (`stack.md`) |
| Diff review | no secrets, no debug output in the new files |

## Audit

2 cycles, zero open must-fix; seven should-fix items fixed (symlinked-parent and symlinked-root containment, `..x` names, option-value swallowing, five test gaps), three acknowledged. Read-only verified by git status because the review-bench guard refused its own 3.4 MB snapshot. See `audit.md`.

## Followups generated

- Idle-host rerun of the five candidates; amend `measurements.md` and the guide (med).
- Bun full-suite exit 1: two workflow-doctor tests and a state size-bound test exceed Bun's 5 s timeout; decide whether the tests or the harness change (med). Do not extend deadlines without a decision.
- Signal forwarding and signal reporting in `run-tests.mts` (low).
- In-process unit seams for repeated subprocess matrices (Codex start hook: 48 launches) (med, from research).
- Fix `review-bench guard` snapshot cap (already tracked; confidence raised).

## Doc updates

`ai-framework/docs/testing.md` added. No README link (file budget). No ADR-worthy decision; no architecture change.
