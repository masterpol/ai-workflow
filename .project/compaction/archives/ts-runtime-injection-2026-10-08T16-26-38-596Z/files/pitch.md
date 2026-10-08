# Pitch: ts-runtime-injection

**Date**: 2026-10-07  •  **Appetite**: epic, decomposed into 4 big-batch slices (T1-T4); T1 is the only slice bet now
**Stack**: backend (Node.js tooling, no app code)

## Problem

Maintainers of the bundle run 49 CommonJS scripts (14,193 LOC) that call Node APIs directly, so scripts cannot be type-checked, cannot run under Bun, and cannot be unit-tested without touching the real filesystem and processes. They want typed, functional scripts whose Node/Bun APIs are passed in, with the runtime picked by a single env setting.

## Knowledge consulted

- [decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers] — standing no-gos apply (no new deps, no historical-record rewrites).
- [issues/macos-tmpdir-realpath-alias-breaks-path-assertions] — injected `fs`/`os` adapter must keep `realpath` semantics; tests need the same alias handling.
- [patterns/resolve-config-only-from-trusted-root] — the runner `.env` is read only from the trusted project root, never from cwd of untrusted content.
- [issues/subprocess-revalidation-against-on-disk-code] — scripts spawn other scripts; the spawn adapter must pick the runtime and `.ts` path consistently.
- [patterns/prove-a-guard-test-with-an-in-memory-mutant] — an in-memory adapter makes this pattern cheap; use it for guard tests.
- Rules: `ai-framework/rules/coding-standards.md`, `security.md` (hooks are guard paths).

## Solution sketch (breadboard, NOT wireframe)

**Places**
- `ai-framework/runtime/` (new): `types.ts` (adapter interfaces), `node.ts`, `bun.ts`, `select.ts`, `env.ts`.
- Each script becomes `name.ts`: pure `run(args, deps): Result` plus a thin `main.ts`-style entry that builds deps and calls it.
- Hook wiring (`.claude/settings.json`, `ai-framework/hooks/hooks.json`, `.opencode/plugins`, templates) and docs that name `.js` paths.

**Affordances**
- `RuntimeDeps` = `{ fs, path, os, crypto, childProcess, net, clock, env, stdout, stderr, exit }`. Every function takes `deps` as its first or last parameter. No top-level `require`/`import` of `node:*` in script logic.
- `selectRuntime(env)` reads `AI_WORKFLOW_RUNNER`. Unset → `nodeDeps`. Set (value `bun`) → `bunDeps`, using `Bun.file`, `Bun.write`, `Bun.spawn`, `Bun.CryptoHasher`. Any other value → fail fast with a clear error.
- `.env` read by a ~30-line parser in `env.ts`, trusted project root only. Process env wins over `.env`.
- Entry shim: `node file.ts` (Node 24 strips types natively) or `bun file.ts`. No build step, no `tsc` required to run.

**Connections**
- Hook/command → `node|bun script.ts` → `selectRuntime` → `run(args, deps)` → exit code.
- Tests build an in-memory `deps` (fake fs, scripted spawn) and call `run` directly. A smaller set of integration tests runs each entry under both runtimes.

**Slices (each its own build, gated)**
- **T1 foundation:** `runtime/` adapters + selector + `.env` parser + tests; migrate 3 pilot scripts (`skill-defaults`, `graphify`, `setup-validator`) and the test runner command for both runtimes. Proves the pattern.
- **T2:** remaining `ai-framework/scripts` (about 34 files incl. tests), avoiding files the Orca pitches touch until they ship.
- **T3:** `ai-framework/hooks/scripts` (9) + `.claude/hooks` + `.opencode/plugins` + hook wiring. Security path: reviewed by `security-reviewer`.
- **T4:** docs, templates in `ai-framework/templates/project/`, `CLAUDE.md`/`AGENTS.md`, `bundle-sync` and `setup-validator` updated to expect `.ts`; delete `.js`.

## Rabbit holes

**Resolved here** (with answer):
- Env name `AI-WORKFLOW-RUNNER` is not a valid shell/dotenv identifier → use `AI_WORKFLOW_RUNNER`. Value `bun` selects Bun; unset selects Node.
- Build step needed? No. Node 24 (installed: v24.21.0) strips types; Bun 1.4.2 runs `.ts`. Constraint: erasable syntax only (no `enum`, `namespace`, parameter properties), explicit `.ts` import extensions, `import type`.
- "All functional" → pure core `run(args, deps)` returning data, I/O only through `deps`; side effects at the entry edge. Not a mandate for FP style inside every helper.
- Which API is "Node API": every `node:*` module found by grep (`path`, `fs`, `child_process`, `os`, `crypto`, `net`, `url`, `perf_hooks`, `fs/promises`) plus `process.*`. `node:test` and `node:assert` stay in tests (see no-go).

**Pushed to /plan as risk** (with named owner):
- Bun parity gaps: `Bun.spawn` is async, `node:child_process.spawnSync` is sync; `net` unix sockets/FIFOs and inode locks (collector lock design) may differ. Owner: T1 spike on `token-consumption` lock code before T3.
- Minimum Node version: type stripping needs ≥22.18. Check `engines`/docs; consumers on older Node must use Bun or a flag. Owner: T1.
- Distribution to consumer projects: `bundle-sync` copies `.js` today; moving to `.ts` changes sync manifests and `merge-base` state. Owner: T4.
- Overlap with `orca-vendor-foundation` (in build/audit) and `orca-vendor-orchestration`: foundation edits `workflow-doctor.js` and adds `orca-policy.js`/`orca-preflight.js`; its exit gates run `skill-defaults.test.js`, `setup-validator.js` and `graphify.js --check`, which T1 would change. No shared file edited (corrected by critique X2). T1 starts only after foundation ships. Owner: `/plan` via `cross-pitch-projector`.

**Pushed to no-go** (deferred):
- Full type-check gate with `tsc` in CI (no dependency allowed yet; add as follow-up).

## No-gos (this pitch)

- ✗ No behaviour changes beyond adapter injection and typing.
- ✗ No new npm dependencies and no bundler/build step.
- ✗ No rewrite of historical records under `.project/pitches/` or `.project/design/`.
- ✗ Tests keep `node:test` (Bun supports it); no test-framework swap.
- ✗ No support for runtimes other than Node and Bun (no Deno).
- ✗ No migration of the `.project/analysis/native-safety-feasibility` script (historical analysis, not a tool).

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| K1 | knowledge-historian | high | missed-knowledge | `issues/installed-skill-wrappers-ship-as-orphans` applies to T4: old consumers run their old `bundle-sync.js` and keep syncing `.js`. Keep `.js` shims or a two-version sync window; simulate an old-version sync before publish. |
| K2 | knowledge-historian | medium | missed-knowledge | `decisions/inode-anchoring-and-stable-inode-locks`: the Bun-parity lock spike must test lock-inode stability under both runtimes. |
| K3 | knowledge-historian | medium | missed-knowledge | `decisions/skill-defaults-attribution-guard-and-runtime-design`: doctor's `node --check` list and `setup-validator` must list `.ts` entries; compress guard keeps resolve-before-match under injected `fs.realpath`. Add as T1 exit checks. |
| K4 | knowledge-historian | low | missed-knowledge | `patterns/dual-hash-tracking-for-transformed-content`: only if T4 rehashes the sync manifest. |
| X1 | cross-pitch-projector | medium | projected-adjacent | No shared file edited, but T1 changes commands foundation's S3 exit gates run. Keep T1 behind foundation shipping; keep `.js` entry shims until foundation is audited. |
| X2 | cross-pitch-projector | acknowledged | stale-rationale | Foundation plan edits `workflow-doctor.js` (not `graphify.js`/`setup-validator.js`) plus new `orca-*.js`. Overlap note corrected below; ordering still holds. |
| X3 | cross-pitch-projector | medium | projected-adjacent | Orchestration/dispatch will add `orca-*` scripts to `ai-framework/scripts/`; T2 scope must include any that land first. Re-check when dispatch has a plan. |
| X4 | cross-pitch-projector | acknowledged | projected-adjacent | Dispatch likely touches phase mirrors; overlaps T3/T4 only. T1 avoids hook wiring and mirrors. |
| A1 | appetite-auditor | medium | borderline-LOC | T1 projects ~14 files and ~1950 LOC vs big-batch 15 files / 1500 LOC. |
| A2 | appetite-auditor | medium | hidden-new-work | `graphify` and `setup-validator` have no tests; "with their tests" means 2 new suites (~300 LOC). |
| A3 | appetite-auditor | medium | scope-overrun | Split T1 into T1a (adapters + selector + `.env` + tests, ~5 files) and T1b (3 pilots, ~9 files); fold entry shims into each script file. |
| S1 | skeptic | medium | rabbit-hole | Extensionless `require("./skill-defaults")` in `state-snapshot`, `browser-runtime`, `workflow-doctor` (T2 scope) breaks once the `.js` is gone. Grep all callers before deleting any pilot `.js`, or leave a `.js` re-export shim. |
| S2 | skeptic | medium | rabbit-hole | Verify `node --test` and `bun test` both discover `*.test.ts` (count discovered files before/after rename) as a T1 exit check; a silently skipped suite stays green. |
| S3 | skeptic | medium | rabbit-hole | `post-edit-check` runs on every `Edit|Write`; measure `node script.ts` startup latency before/after before T3 ships. |

## Bet decision

☒ **Bet** (→ /plan) for T1 only, after orca-vendor-foundation ships (2026-10-07)  
☐ Re-shape — named gap: {…}  
☐ Pass — moved to `.project/pitches/_parked/ts-runtime-injection/`; reason: {…}

**Critique disposition (2026-10-07): Acknowledge all (K1-K4, X1-X4, A1-A3, S1-S3).** The user bet without choosing Address and gave no further reason. Findings are not edited into the pitch body. `/plan` must carry them in: split T1 into T1a/T1b (A1-A3), add exit checks for S1/S2/K3, and carry K1/K2/S3 into the T2-T4 risks. Precondition X1 is met: `orca-vendor-foundation` shipped 2026-10-07 (v2.10.0).

**Bet extension (2026-10-07, user):** "continue with the migration, all js files should be migrated". Bet widened from T1 to T1-T4; see plan.md Extension 1. Pitch body and original no-gos unchanged (bench.py stays Python, per user).
