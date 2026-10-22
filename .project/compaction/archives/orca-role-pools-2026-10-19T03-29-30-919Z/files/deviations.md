# Deviations: orca-role-pools

## D1 — 2026-10-16 — S0 baseline repair added (not in plan)
Owner said "update to be valid". HEAD (`df9683d`, vendor-model-toon S1) left 98 failing tests: `config-migrate.mts` still emitted
`schemaVersion: 2` and matched "only 2 is supported", and `config.test.mts` / `config-migrate.test.mts` hard-coded v2. Fixed in this pitch
(`config-migrate.mts` lines 209/235/291/294; test literals) so the Wave 1 full-suite gate can be green. Not repaired: in-place v2→v3 conversion
(the reader's refusal text promises it; a v2 file still needs `--force`). Logged to `_followups.md`.

## D2 — 2026-10-16 — Pools hold distinct *vendor* names, so a pool has at most 3 members
`VENDORS = [claude, codex, opencode]` and pool members must be distinct, so the pitch's "1..N" is 1..3 and "16" is concurrency across scopes,
not pool size. Same vendor running several scopes at once is `maxConcurrentWorkers`. Plan's "4-member pool" test cases became 3-member.

## D3 — 2026-10-16 — `config.mts` unchanged
Plan S3 listed `runtime/config.mts` edits. Config already rejects duplicate (`PARSER-WITHIN-ROLE-DUPLICATE`) and empty pools; only pinning tests were added.

## D4 — 2026-10-16 — Example TOON edit landed inside agent-model-sweep's commit `0c2bb35`
A concurrent session committed with a dirty tree; the `implementation[2]: opencode,codex` / `review[2]: codex,opencode` pool example is in that commit.

## D5 — 2026-10-16 — S4 live spike skipped
Spawning real agent workers to probe Orca's concurrency needs funds and a supervised session; not done unattended. Result: `unverified above 3 live workers`;
the shipped default stays 3 and the 1..16 bound is unchanged. `orca-vendors.md` says so. Re-run with a supervised Orca (4/8/16 no-op workers) before raising a default.

## D6 — 2026-10-16 — `.opencode/commands/build.md` and `.codex` need no edit
Plan S7 expected an Orca paragraph in the OpenCode build command; that file has no Orca section (a separate smaller adapter). `.codex/` has no build skill and
`.agents/skills/build/SKILL.md` is a stub pointing at `.claude`. Only `.claude` and the byte-identical `.cursor` mirror changed. `skill-vendors cursor-mirrors --apply`
only creates missing mirrors, so the Cursor copy was refreshed with `cp`.

## D7 — 2026-10-16 — Review-independence rule and pool size
Owner left the degenerate-review policy to the builder ("as you see fits"): chosen = blocked + humanAction, no flag. Pools hold distinct vendors, so max 3 (see D1/D2).

## D8 — 2026-10-16 — Release bumped in S7, not at /ship
`changelog.mts --bump minor` ran in S7 (2.27.0, single release per owner). /ship should reconcile rather than bump again.

## D9 — 2026-10-16 — Existing tests changed for the overlap guard
`orca-dispatch.test.mts` (capacity test) and `orca-run.test.mts` (`opencodeInput`) reused one `authorizedPaths` across different scopes; they now use a path per scope, which is the behavior the guard enforces.
