# Compaction record: ts-runtime-injection

Prepared 2026-10-08. This record preserves closure evidence and constraints; the recovery archive retains the full source history.

Durable knowledge: [[one-boundary-selects-the-child-runner]], [[keep-the-fakes-guarantee-the-thing-they-replace]], [[workflow-tooling-pitches-share-standing-no-gos-and-design-answers]].

## Section 1: SHIPPED.md#final-verification

Node 762/762 pass over the scripts, runtime, hook and `.claude/hooks` suites; Bun 731 pass, 1 skip, 0 fail. setup-validator READY (22 checks), graphify CLEAN, doctor zero failures. No `.js` workflow files remain and no secrets were added. No build/typecheck/lint/i18n commands exist.

## Section 2: SHIPPED.md#reconciliation

Scopes S1-S6 (runtime adapters, pilots, wiring, upgrade simulation) and groups G1-G10 (all scripts, hooks, the OpenCode plugin, the bench) shipped as direct `.mts` on `RuntimeDeps`. Final user decision, superseding plan Revision 1: no `.js` shims and no `entry.js` relaunch; hook and doc commands call `.mts` directly with `--experimental-strip-types`; `runtime/migrate.mts` rewrites old instance entries. Old installs upgrade with their own `bundle-sync.js` and then the `.mts` one (`upgrade.test.mts` 3/3).

## Section 3: SHIPPED.md#audit

Cycle 2 on the direct tree: security (opus), code (sonnet) and test (sonnet) reviewers, all with caught canaries and `independent: yes`. 3 must-fix (bundle-sync source/target symlinks, hook `typescript` main escape) and 4 should-fix, all fixed and re-proved.

## Section 4: SHIPPED.md#no-gos-honored

No dependencies added and no historical records rewritten.

## Section 5: SHIPPED.md#followups

Tracked in `_followups.md` under ts-runtime-injection 2026-10-08.

## Section 6: pitch.md#no-gos

No behaviour changes beyond adapter injection and typing; no new npm dependencies and no bundler or build step; no rewrite of historical records under pitches or design; tests keep node:test (Bun supports it); no runtimes other than Node and Bun (no Deno).

## Section 7: pitch.md#rabbit-holes

Resolved: the env name is `AI_WORKFLOW_RUNNER` (the hyphenated name is not a valid identifier; `bun` selects Bun, unset selects Node); no build step (Node 22.18+ strips types, Bun runs .ts; erasable syntax only, explicit .ts imports, `import type`); a pure core `run(args, deps)` with I/O only through `deps`; every `node:*` module and `process.*` goes through deps, with node:test and node:assert staying in tests. Risks with owners: Bun parity gaps (async `Bun.spawn`, unix sockets and inode locks), minimum Node version 22.18, distribution through bundle-sync manifests, and overlap with the Orca foundation pitch (started only after foundation shipped). Deferred: a full tsc type-check gate in CI.
