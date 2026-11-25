# Deviations: package-less-ship-verification

- 2026-11-25 (S2): planned "a missing executable fails a required check and only warns for an optional one". Shipped for `manifest` checks only. The
  adapters throw `ENOENT` (Node and Bun); converting it for `package.json` routes too would let a project whose only check is optional `lint`
  pass with a missing package manager, which fails today.
- 2026-11-25 (S2): the test file's virtual host gained `realpathSync` and `lstatSync` stubs so its existing cases see no manifest.
- 2026-11-25: release recorded as 2.57.0 (minor).
- 2026-11-25 (/audit): a symlinked manifest path fails even when no manifest exists. This is stricter than "a `package.json` behaves as today"; kept
  fail-closed, documented in `4-ship.md`, tested.
- 2026-11-25 (/audit): names also refuse C1, format and line-separator characters.

## Evidence (2026-11-25, uncommitted tree on `feat/ship-state-project-sources`)

- `pre-ship-verify.test.mts`: 23 pass, 0 fail on Node and on Bun 1.4.5. After S1 alone: 17 pass on both.
- `node ai-framework/hooks/scripts/pre-ship-verify.mts`: exit 0, 108 s; suite 2,377 tests, 2,374 pass, 3 skip, 0 fail.
- `setup-validator`, `graphify --check`, `graphify-relations --check`: exit 0. `grep -c checks.toon 4-ship.md`: 1.
- Temporary directories without Git: no `package.json` exit 1 ("no checks configured"); `verify:base` alone, passing `test`, and a 65 s `test` exit 0.
- Not applicable: build, typecheck, lint, i18n (`stack.md`). Not run: full suite under Bun; Windows.
