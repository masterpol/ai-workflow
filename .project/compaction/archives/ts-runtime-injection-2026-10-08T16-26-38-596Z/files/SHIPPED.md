# Shipped: ts-runtime-injection

Bet: 2026-10-07. Shipped: 2026-10-08; user approved audit and [1] ship. Appetite: big-batch (epic slice T1-T4). Release: see CHANGELOG.

## Final verification

| Step | Result |
|---|---|
| Build / typecheck / lint / i18n | Not applicable: no such command in this repo (`stack.md`) |
| Tests | Node 762/762 pass: `node --experimental-strip-types --test` over `ai-framework/scripts/*.test.mts`, `scripts/runtime/*.test.mts`, `hooks/scripts/*.test.mts`, `.claude/hooks/*.test.mts`. Bun `bun test`: 731 pass, 1 skip, 0 fail |
| Workflow checks | `setup-validator.mts` READY (22 checks); `graphify.mts --check` CLEAN; doctor zero failures |
| Diff | No `.js` workflow files remain; no secrets added |

## Reconciliation

Scope S1-S6 (runtime adapters, pilots, wiring, upgrade sim) and groups G1-G10 (all scripts, hooks, OpenCode plugin, bench) shipped as direct `.mts` on `RuntimeDeps`.
Final user decision (supersedes plan Revision 1): **no `.js` shims and no `entry.js` relaunch**; hook and doc commands call `.mts` directly with `--experimental-strip-types`; `runtime/migrate.mts` rewrites old instance entries. Old installs upgrade with their own `bundle-sync.js` then the `.mts` one (`upgrade.test.mts` 3/3).

## Audit

Cycle 2 on the direct tree: security (opus), code (sonnet), test (sonnet), all canary-caught, `independent: yes`. 3 must-fix (bundle-sync source/target symlinks, hook `typescript` main escape) and 4 should-fix, all fixed and re-proved. Record in `log.md`.

## No-gos honored

No dependencies added, no historical records rewritten.

## Followups

See `_followups.md` (ts-runtime-injection 2026-10-08).
