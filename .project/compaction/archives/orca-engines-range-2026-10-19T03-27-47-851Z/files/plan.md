# Plan: orca-engines-range

**Pitch**: pitch.md  •  **Appetite**: small-batch  •  **Hill**: hill.md

> Bet: `/plan` was invoked on a pitch whose Bet box is unchecked; treated as the bet (small-batch, no critique required).
> Schema note (pitch banner): `engines.orca` = `integrations.orca.engine` (a string, already required by `config.mts:476`).

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | Pure range engine + npm-semver fixtures | `ai-framework/scripts/runtime/semver-range.mts` (new), `semver-range.test.mts` (new), `semver-range.fixtures.json` (new) | ~220 src, ~120 test | — | — | no: critical-path, one coherent module | — |
| S2 | Wire range into preflight, launch gate, start hook | `orca-preflight.mts`, `orca-launch-gate.mts`, `orca-start.mts` + their tests | ~60 src, ~80 test | S1 | S3 | no: three call sites share one helper, ~140 LOC total | — |
| S3 | Config validation, doctor, migrator default, example TOON | `runtime/config.mts`, `workflow-doctor.mts`, `config-migrate.mts`, `ai-workflow.toon` template under `ai-framework/templates/project/`, tests | ~50 src, ~60 test | S1 | S2 | no: tiny, disjoint from S2 but not worth a worker round-trip | — |
| S4 | Docs and version record | `ai-framework/integrations/orca-vendors.md` (lines ~35, 87-93, 280), `CHANGELOG.md`/`VERSION` via `changelog` skill | ~40 docs | S2, S3 | — | no | — |

Total ≈ 10 files touched, ~700 LOC with tests. Parallel dispatch is not worth it at this size; S2 and S3 are disjoint and may be interleaved in-session.

## Exit criteria per scope (machine-checkable, ≥1 per scope)

Test command `T` = `node --experimental-strip-types --disable-warning=ExperimentalWarning --test`.

### S1 — Pure range engine
- `T ai-framework/scripts/runtime/semver-range.test.mts` exit 0
- Module has zero imports: `! grep -nE "^import|require\(" ai-framework/scripts/runtime/semver-range.mts`
- Fixture file exists and every row is replayed by the test: `test -f ai-framework/scripts/runtime/semver-range.fixtures.json` and the test asserts `rows.length >= 150`
- Grammar covered by fixtures: exact, `^`, `~`, `>=`/`>`/`<=`/`<`, space-AND, `||`, `1.4.x`/`1.x`, hyphen range
- Rejections covered: prerelease/build (`1.5.0-beta.1`, `+x`), leading zeros, parts > 6 digits, unknown operator, empty range, oversized input (> 256 chars), empty `||` arm; `parseRange` error carries a character position
- ReDoS guard: a 100k-char hostile range and version each return in < 50 ms (test asserts elapsed); implementation uses a hand-written scanner, no backtracking regex
- Guard test proved by an in-memory mutant (flip `>=` to `>` in a copy; the suite must fail)

### S2 — Wire into preflight, launch gate, start hook
- `T ai-framework/scripts/orca-preflight.test.mts ai-framework/scripts/orca-launch-gate.test.mts ai-framework/scripts/orca-start.test.mts` exit 0
- `isSupportedVersion` no longer hard-codes the floor: `grep -n "SUPPORTED_VERSION" ai-framework/scripts/orca-preflight.mts` shows it only as the default range `>=1.4.224` (`DEFAULT_ENGINE_RANGE`)
- Config absent or `engine` empty → default range used; behavior unchanged for 1.4.223 (denied) and 1.4.224+ (allowed)
- `engine: ">=1.4.224 <1.6.0"` with reported `1.6.0` → `runtime-version-unsupported`; reason text names the range and found version
- Invalid configured range → fail closed with a distinct `engine-range-invalid` reason; never falls back to the default silently
- Run `orca-start` and `orca-launch-gate` suites with a version-drift fixture (`orca-eval-grader.mts` `version-drift` mode still passes: `T ai-framework/scripts/orca-eval-grader.test.mts` if present)

### S3 — Config, doctor, migrator, example
- `T ai-framework/scripts/runtime/config.test.mts ai-framework/scripts/runtime/migrate.test.mts` exit 0
- `registerEngineValidator("orca", …)` calls `parseRange`; a bad range yields a config problem with position, not a thrown exception
- `node ai-framework/scripts/workflow-doctor.mts` on a temp project with `engine: "^^1"` → "Config validators" is `fail` and names the range; with a valid range → `pass`
- `config-migrate.mts` `DEFAULT_ENGINE` becomes `">=1.4.224"` (a bare `1.4.224` would now mean exact-match; see Risks); `grep -n 'DEFAULT_ENGINE =' ai-framework/scripts/config-migrate.mts` shows the range
- Real-file load check (pattern `a-pitch-can-pass-its-own-tests-and-break-on-the-real-file`): `node -e` / script calling `loadConfig(".")` on the repo's own `ai-workflow.toon` returns no problems

### S4 — Docs and record
- `node ai-framework/scripts/setup-validator.mts` exit 0
- `node ai-framework/scripts/graphify.mts --check` exit 0
- `grep -n "isSupportedVersion.*1.4.224" ai-framework/integrations/orca-vendors.md` returns nothing stale; docs describe the supported range grammar and the no-prerelease rule
- Version bump recorded via `changelog` skill (`git diff --stat -- VERSION CHANGELOG.md` non-empty)

## Risks (inherited from pitch rabbit holes)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| Fixture source: expected results must come from npm `semver`, not from our own code | S1 | yes, small (≈15 min) | Generate once in the scratchpad (`npm i semver@7` outside the repo), commit only the JSON rows (range, version, expected, `semver` version noted in a header field). Drop rows using prerelease features, which are no-goed. |
| Behavior change: migrator writes bare `1.4.224`, which as a range now means exact-match and would block 1.4.225 | S3 | no | Change `DEFAULT_ENGINE` to `>=1.4.224`; add a migrate test asserting it; consider treating an existing bare-version `engine` in the doctor as `warn` ("exact pin") |
| Backtracking regex / quadratic scan over untrusted version text (`issues/backtracking-regex-over-untrusted-text-is-quadratic`) | S1 | no | Hand-written linear scanner, input length cap, timing assertion |
| Hot path now reads config: start hook has a 4 s budget and runs before every phase | S2 | no | One `loadConfig` per decision, no network; test measures no extra subprocess calls |
| Reading config at three call sites could disagree | S2 | no | Single helper `engineRange(root, deps)` exported from `orca-preflight.mts`, used by gate and start |
| Existing tests rely on `SUPPORTED_VERSION` export (`orca-eval-grader.mts:7,125`) | S2 | no | Keep the export as the default floor version; `/impact` not needed (5 touched call sites, all listed) |
| Separate, unrelated blocker found during planning: `worker-list` output (265 KB) exceeds `MAX_OUTPUT_BYTES` (256 KiB) and blocks the Orca start hook (`worker-identity-unavailable`) | none | no | Out of scope for this pitch; record in `_followups.md` as a candidate fix (page with smaller `--limit`) |

## Parallel dispatch plan

- Critical path: S1 → (S2 ‖ S3) → S4. Orca reports ready (coordinator claude; workers opencode, codex) but no scope is flagged for dispatch: the whole pitch is ~700 LOC and S1 gates everything, so worker round-trips cost more than they save.
- If you want S2 and S3 dispatched anyway, they are file-disjoint; use `fast`/`standard` models respectively. Default recommendation: build in-session.

## Wireframes

N/A (no UI scopes).

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)
