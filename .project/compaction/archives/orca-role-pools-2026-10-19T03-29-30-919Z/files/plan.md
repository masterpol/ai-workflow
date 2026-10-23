# Plan: orca-role-pools

**Pitch**: pitch.md  •  **Appetite**: big-batch  •  **Hill**: hill.md

> Bet logged 2026-10-16 (owner). Critique findings (A1–A4, S1–S6, K1–K7, X1–X5) were all Acknowledged and are folded in below; the
> "Source" column in Risks maps each one. Schema note: `integrations.orca.*` is the TOON path (pitch banner).

## Read-first facts (verified in code while planning)

- `config.mts` already accepts `roles.<role>: string | string[]` and 1..16 for `maxConcurrentWorkers`. `orca-policy.mts` (`policyFromConfig`, line ~112)
  keeps only `list[0]` and `validateCoordinator` caps `workers` at 2 and rejects `worker === vendor`. So a pool file loads today and silently loses members.
- The ledger record **already stores `vendor` per attempt** (`RECORD_KEYS`, `orca-ledger.mts:86`) and `taskKey` per scope. "Which member took which scope" and
  "who implemented the scope under review" are derivable with no new field → **no ledger `schemaVersion` bump** (resolves S4/K5).
- `dispatchScope` takes the worker `vendor` from the caller; nothing chooses a member. `dispatchWithRetries` re-sends the same `vendor` on every retry.
- `orca-apply.mts:466-469` refuses overlapping worker paths (`worker-overlap`, sorted by attemptKey); it does **not** integrate in arrival order as the pitch assumed.
  Overlap is therefore a refusal at integration time, not a silent merge: S6 moves that refusal earlier (at reserve).
- The launch gate and `policy.workers.includes(vendor)` run against the **coordinator** identity (`orca-dispatch.mts:113-125`); a worker of the same vendor
  is a separate process started with `--worker-context`, so allowing self-membership changes no authority holder.
- Orca 1.4.227's `orchestration worker-start --help` and top-level help document no terminal/agent cap.
- **Working-tree precondition (X2/X3):** `vendor-model-toon` is being built in this checkout *right now* (uncommitted; `config.mts` schemaVersion 3, `models` block,
  example toon, `test-helpers.mts`; its hill is `uphill 25%`). `skill-defaults.mts` already refuses the repo's own `ai-workflow.toon` (v2) for that reason.
  Role-pools edits those same files. **P0 below must hold before `/build`.**

## Preconditions (checked at /build start, not scopes)

- **P0 — SATISFIED 2026-10-16:** `vendor-model-toon` S1 landed as `df9683d` (schemaVersion 3); the repo's own `ai-workflow.toon` loads (`skill-defaults` resolves). Owner: "update to be valid". Remaining foreign dirt: `agent-model-sweep` edits (`workflow-doctor*`, `skill-defaults.test.mts`, `harnesses.md`, `model-routing.md`, one `effort` line in the example TOON) — never stage those hunks. Original check: `git status --short` shows no foreign changes in
  `runtime/config.mts`, `runtime/test-helpers.mts`, `ai-workflow.example.toon`, and the repo's own `ai-workflow.toon` loads cleanly. Role-pools adds **no**
  TOON `schemaVersion` bump; it targets whatever version is on the branch.

## Scopes

Two waves (A3). Wave 1 is shippable on its own and fixes the live silent-truncation defect; Wave 2 assumes Wave 1 and the S4 spike.

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| **Wave 1 — pool model** | | | | | | | |
| S1 | Policy carries pools (fix truncation, drop 2-worker cap, allow self) | `orca-policy.mts`, `orca-policy.test.mts` | ~70 src, ~150 test | P0 | — | no: owns the type every later scope consumes | — |
| S2 | Consumers read pools (start probes every member; preflight/run unchanged-but-proved) | `orca-start.mts`, `orca-start.test.mts`, `orca-preflight.test.mts`, `orca-run.test.mts` | ~25 src, ~90 test | S1 | S3 | no: ~115 LOC, three small edits | — |
| S3 | Config validation, example, migrator proof, fixtures, docs | `runtime/config.mts`, `runtime/config.test.mts`, `runtime/test-helpers.mts`, `templates/ai-workflow.example.toon`, `config-migrate.test.mts`, `integrations/orca-vendors.md` | ~35 src, ~80 test, ~60 docs | S1 | S2 | no: shares dirty files with `vendor-model-toon`; one editor only | — |
| **Wave 2 — assignment** | | | | | | | |
| S4 | Spike: does Orca cap concurrent agents/terminals? | none (result recorded in `deviations.md` + `orca-vendors.md` note) | 0 | S3 | S5 | no: needs a human-supervised live Orca | — |
| S5 | Pure assignment module | `orca-assign.mts` (new), `orca-assign.test.mts` (new) | ~110 src, ~170 test | S1 | S4 | yes: new self-contained file, zero imports from dispatch, clear exit; disjoint from S4/S6 files | standard |
| S6 | Dispatch uses pools; ledger path-overlap guard | `orca-dispatch.mts`, `orca-dispatch.test.mts`, `orca-ledger.mts`, `orca-ledger.test.mts`, `orca-run.mts`, `orca-run.test.mts` | ~120 src, ~260 test | S5 | — | no: security-sensitive launch/claim path; critical path; keep in the coordinator | — |
| S7 | Grader fixtures, build skill + mirrors, docs, release record | `orca-eval-grader.mts`, `orca-eval-grader.test.mts`, `.claude/skills/build/SKILL.md`, `.cursor/skills/build/SKILL.md` (generated), `.opencode/commands/build.md`, `integrations/orca-vendors.md`, `CHANGELOG.md`, `VERSION` | ~40 src, ~60 test, ~80 docs | S6, S4 | — | no | — |

Total ≈ 27 files touched (13 source/doc, 11 test, 3 record/mirror), ~1,000 src+docs and ~800 test LOC. Wave 1 ≈ 10 files / ~450 LOC; Wave 2 ≈ 17 files / ~1,350 LOC.
Wave 2 is above the big-batch cap on its own if the live-spike result forces extra work, so Wave 2 gets its own scope gate.
**Owner decision (2026-10-16): one release (2.27.0)**, one audit after both waves. Wave 1 still gets its own full-suite gate and commit.

## Exit criteria per scope (machine-checkable, ≥1 per scope)

Test command `T` = `node --experimental-strip-types --disable-warning=ExperimentalWarning --test`. No build/typecheck/lint/i18n command exists in this repo (stack.md), so those exits are skipped, not faked.

### P0 — precondition
- `git status --short -- ai-framework/scripts/runtime ai-framework/templates ai-workflow.toon` prints nothing that is not part of this pitch
- `node ai-framework/scripts/skill-defaults.mts resolve-mode --phase build --args-text ""` exits 0 (repo's own TOON loads)

### S1 — Policy carries pools
- `T ai-framework/scripts/orca-policy.test.mts` exit 0
- Pool survives: TOON `roles.implementation[2]: opencode,claude` → `report().pools.implementation` is `["opencode","claude"]` and `report().roles.implementation` is `"opencode"` (back-compat, first member)
- No silent loss: `workers` in the report equals the union of all role pools plus any explicit `workers`; a test with 3 and 5 distinct workers returns all of them
- `grep -n "workers.length > 2" ai-framework/scripts/orca-policy.mts` returns nothing
- Self-membership: coordinator `claude` with `workers: [claude, codex]` and `implementation: [claude, codex]` is `valid`; duplicate worker inside one pool, an unknown vendor, an empty pool, and a role other than `implementation`/`review` are `malformed`
- Legacy `.project/orchestration.json` (string roles) still loads and reports one-element `pools`; a legacy file with 3 workers loads too (LAH's file)
- Fail-closed unchanged: invalid TOON never falls back to legacy JSON (existing tests still pass)
- Consumers of `report().roles` type compile-by-test: `grep -rn "\.roles" ai-framework/scripts/*.mts | grep -v test` list is reviewed and each hit is covered by S2 (output pasted in `log.md`)

### S2 — Consumers read pools
- `T ai-framework/scripts/orca-start.test.mts ai-framework/scripts/orca-preflight.test.mts ai-framework/scripts/orca-run.test.mts` exit 0
- `orca-start` blocks `<worker>:worker-unavailable` when the **second** member of a pool lacks an executable (previously never probed) — test with a 2-member pool whose 2nd member is missing
- Ready line lists every distinct pool member: `Orca: ready (coordinator claude, workers opencode, codex, claude)` shape asserted
- `grep -n "typeof worker === \"string\"" ai-framework/scripts/orca-start.mts` returns nothing (no string-only role filter)
- `preflight.report().vendors` has an entry for every pool member (test with 4 members)
- `orca-run.mts prepareOpencode` still frees the port when `opencode` is a non-first pool member (test)

### S3 — Config, example, fixtures, docs
- `T ai-framework/scripts/runtime/config.test.mts ai-framework/scripts/config-migrate.test.mts ai-framework/scripts/workflow-doctor.test.mts` exit 0
- Config rejects a pool with a duplicate member, and an empty `roles.<role>[0]` pool; error names the key path; no throw
- Example TOON contains a pool role (`implementation[2]: …`) and `loadConfig` on it returns no problems; `maxConcurrentWorkers` comment states 1..16
- Migrator: legacy `roles.implementation: "codex"` still migrates to a one-element array and round-trips (existing + new test)
- Real-file load check (`a-pitch-can-pass-its-own-tests-and-break-on-the-real-file`): `loadConfig(".")` on the repo's own `ai-workflow.toon` returns no problems after the edit
- `orca-vendors.md` no longer says "at most 2 workers" or "uses only its first target": `grep -n -i "at most 2 workers\|uses only its first target" ai-framework/integrations/orca-vendors.md` returns nothing
- `node ai-framework/scripts/setup-validator.mts` exit 0; `node ai-framework/scripts/graphify.mts --check` exit 0
- **Wave 1 gate:** full suite green — `T $(git ls-files -co --exclude-standard 'ai-framework/*.test.mts')` exit 0

### S4 — Spike: Orca concurrency cap
- Written result in `deviations.md`: number of simultaneously live `worker-start` workers tried (target 4, 8, 16), outcome per count, Orca version (`orca --version`), and the date
- Decision recorded: default `maxConcurrentWorkers` stays 3 unless the spike shows ≥ N works; `orca-vendors.md` gets one sentence stating the verified ceiling or "unverified above N"
- Safety: spike uses no-op specs in a throwaway worktree; no write scope; all spike workers released (`orca orchestration worker-list` shows none live after)
- If a live probe is not possible this session: record `spike-skipped: unverified above 3` and keep the default at 3. Never block Wave 2 code on it, but S7 must not claim a verified ceiling.

### S5 — Pure assignment module
- `T ai-framework/scripts/orca-assign.test.mts` exit 0
- Module has zero imports of `orca-dispatch`/`orca-ledger`/`orca-launch-gate`: `! grep -nE "from \"\./orca-(dispatch|ledger|launch-gate)" ai-framework/scripts/orca-assign.mts`
- Determinism: same `(scopeId, planIndex, poolSnapshot, skip set)` returns the same member across 1,000 randomized calls; result never depends on call order or prior calls (no module state — `grep -n "^let \|^var " ai-framework/scripts/orca-assign.mts` returns nothing)
- Round-robin: `planIndex % eligible.length` over the pool after removing preflight-failed members; 16-member pool with 40 scopes spreads within ±1
- Resume stability: a function `memberFor(existing attempt vendor | undefined, …)` returns the **recorded** vendor when one exists, even if the pool changed since (the S3 scenario)
- Review: returns a member ≠ the implementer when the pool allows it; with a one-member pool equal to the implementer returns `{ ok:false, reason:"review-independence-unavailable" }`; never returns an excluded member
- Retry: `nextMember(pool, tried)` rotates in pool order, skips tried members, returns `exhausted` after one lap
- Mutation proof (pattern `guard-test-needs-mutant-proof`): in a scratch copy flip `!==` to `===` in the reviewer check; the suite must fail

### S6 — Dispatch uses pools; ledger overlap guard
- `T ai-framework/scripts/orca-dispatch.test.mts ai-framework/scripts/orca-ledger.test.mts ai-framework/scripts/orca-run.test.mts` exit 0
- Back-compat: the caller-supplied `vendor` path behaves exactly as before (all existing dispatch tests untouched and green)
- New input: `dispatchScope`/CLI accept exactly one of `vendor` or `{ role, planIndex, reviewOf? }`; both or neither → `route:"normal", reason:"invalid-assignment"` before any side effect (no ledger write, no spawn)
- Resume never reassigns: with an existing attempt for the task, the recorded `vendor` is reused; a pool change between runs does not move the scope (test)
- Retry rotation only on `retryable` (proven-clean failure): `unknown-liveness`, `launch-failed:unproven`, `launch-failed:<stage>`, timeout, signal exit **never** rotate (one test per reason, each asserts exactly 1 attempt in the ledger and 0 additional spawns)
- Every rotated attempt goes through the full gate: spy asserts `evaluateLaunch` called once per attempt, and a gate denial for the new member stops the rotation (K3)
- Reviewer ≠ implementer: reviewer chosen from `roles.review` pool, excluding the vendor recorded for `reviewOf`'s task; if impossible → `route:"blocked", reason:"review-independence-unavailable", humanAction` set (owner decision: blocked means stop and ask), no spawn
- Capacity: `maxConcurrentWorkers: 16` with 16 simultaneous `reserve` calls on distinct tasks all claim; the 17th returns `at-capacity` (test uses fake clock/fs from `test-helpers`)
- Ledger overlap guard: `reserve` returns `path-overlap` (new outcome, mapped to `route:"normal", reason:"authorized-paths-overlap"`) when a live attempt (claimed/launched/unknown-liveness) of **another task** has an overlapping `authorizedPaths` entry; non-overlapping and same-task replays are unaffected
- Ledger schema untouched: `git diff -U0 ai-framework/scripts/orca-ledger.mts | grep -E "RECORD_KEYS|SCHEMA_VERSION"` shows no added/removed lines
- Evidence binding (K6): a completed attempt's evidence is looked up by its own `attemptKey`; test that a retry on a second member does not inherit the first member's evidence

### S7 — Grader, skill, mirrors, docs, record
- `T ai-framework/scripts/orca-eval-grader.test.mts` exit 0, with a new fixture mode that uses a 3-member pool, `maxConcurrentWorkers: 16`, and the old `index % workers.length` assignment replaced by `orca-assign`
- `grep -n "maxConcurrentWorkers: 3" ai-framework/scripts/orca-eval-grader.mts` returns nothing hard-coded (parameterised)
- Build skill describes pool dispatch (`role`/`planIndex`/`reviewOf`), split review semantics, and the blocked-means-stop rule inside the `orca-multi-agent` markers; `.claude` and `.cursor` copies identical: `node ai-framework/scripts/skill-vendors.mts cursor-mirrors` (dry run) reports no drift
- `.opencode/commands/build.md` carries the same Orca paragraph (diff of the marked section against `.claude`); `.codex/` has no build skill and `.agents/skills/build/SKILL.md` is a stub that points at `.claude` — both intentionally unchanged
- `node ai-framework/scripts/workflow-doctor.mts` exit 0; `node ai-framework/scripts/setup-validator.mts` exit 0; `node ai-framework/scripts/graphify.mts --check` exit 0
- Release record via `changelog` skill: `git diff --stat -- VERSION CHANGELOG.md` non-empty; `VERSION` is 2.27.0 (single release)
- Full suite green (same command as the Wave 1 gate); Bun not claimed unless actually run

## Risks (inherited from pitch rabbit holes + critique)

| Risk | Source | Scope | Spike needed? | Mitigation |
|------|--------|-------|---------------|------------|
| Pool arrays load but are truncated by policy and `orca-start`'s string-only filter | S1, X1 | S1, S2 | no | Test-first: write the failing 3-member-pool tests, then fix |
| `report().roles` type widening breaks consumers | S1 | S1, S2 | no | Keep `roles` as first-member string; add `pools`; consumer list grepped and pasted in `log.md` |
| Uncommitted `vendor-model-toon` edits collide with `config.mts`, `test-helpers.mts`, example TOON | X2, X3, X5 | S3 | no | P0; single editor for those files; no schemaVersion bump here |
| Orca may cap concurrent terminals/agents | pitch | S4, S7 | **yes** (live, human-supervised) | Default stays 3; document "unverified above N" if spike skipped |
| Round-robin assignment drifts on resume/preflight skip → two writers for one scope | S3 | S5, S6 | no | Assignment is a pure function; recorded ledger `vendor` always wins on resume; rotation only on proven-clean failure |
| Retry rotation reuses an attempt key and skips the gate / reuses evidence | K3, K6 | S6 | no | New attempt id per rotation (`-r<n>` already exists); full gate each time; evidence keyed by attemptKey |
| Coordinator in its own pool read as a change to launch authority | S2, K4 | S1, S6 | no | Gate stays on coordinator identity; worker is a separate `--worker-context` process; tests assert identical denial reasons for self and non-self members |
| Reviewer cannot differ from implementer (one-member / same pool) | S5 | S5, S6 | no | Owner rule: blocked + `humanAction`; no silent same-vendor review; no new flag |
| Parallel implementers on overlapping files | pitch, K2 | S6 | no | `reserve` refuses overlapping `authorizedPaths` across live tasks; `orca-apply` `worker-overlap` stays as the backstop; reconcile all workers of a wave before committing any (existing pattern, cited in skill text) |
| Ledger schema change locks out older readers | S4 | S6 | no | None needed: no new key, no version bump (asserted by diff check) |
| Per-member preflight uses the coordinator environment | K7 | S2 | no | `orca-start` already probes workers with `buildWorkerEnv`; test that every pool member is probed with the worker env |
| Grader fixtures encode single-role, 3-worker semantics | pitch, S6 | S7 | no | Parameterise; add 3-member and 16-worker fixtures |
| Legacy JSON path and pinned legacy readers diverge | S1 | S1 | no | Legacy keeps string roles; reader accepts >2 workers; pinned legacy readers are not modified (listed in `deviations.md` if touched) |
| Hot path: `orca-start` now probes more executables inside its 4 s budget | K7 | S2 | no | Probe distinct members once; assert call count equals distinct members in test |

## Parallel dispatch plan

- Wave 1: S1 first (alone). Then S2 and S3 are file-disjoint and may be interleaved in-session; S3 stays with a single editor because of the shared dirty files (P0). No worker dispatch.
- Wave 2: S4 (human, live) and S5 (self-contained, one worker is fine at `standard`) run in parallel after S1. S6 waits for S5 and stays in the coordinator. S7 last.
- If S5 is dispatched to an alternate vendor under Orca: authorized paths are exactly `orca-assign.mts` and `orca-assign.test.mts`; independently re-run its exit criteria; do not accept worker numbers.
- Audit (once, after both waves; owner chose one release): code-reviewer, security-reviewer (launch/claim path), test-coverage-checker; skip ux/i18n/eval (no UI, no strings, no AI prompt).

## Wireframes

Not applicable (no UI scopes).

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)
