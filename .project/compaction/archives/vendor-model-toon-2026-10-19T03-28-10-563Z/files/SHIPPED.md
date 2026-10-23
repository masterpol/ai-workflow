# Shipped: vendor-model-toon
Bet: 2026-10-16  •  Shipped: 2026-10-17  •  Appetite: small-batch  •  Version: 2.29.0

## Scopes
| ID | Status | Notes |
|----|--------|-------|
| S1 | shipped | `models` block (schemaVersion 3): strict validation (vendor/key/profile allowlists, all three profiles per listed vendor, `effort` for any vendor), in-place v2→v3 `config-migrate --apply` (`convertV2`), example toon, README "Model configuration". Part landed 2026-10-16 (`df9683d`), completed 2026-10-17. |

## No-gos honored
- ✅ no agent file, doctor routing, dependency, secret or alias/fallback changes.
- ⚠️ the pitch said it would ship after `workflow-v3-rollout`; it landed first and orca-role-pools / agent-model-sweep built on it. `workflow-v3-rollout` must expect a v3 config.

## Rabbit holes
- ✅ resolved: v2 read path without weakening `loadConfig` (textual conversion + strict round trip); helper fixtures and refusal literals bumped in lockstep; local toon is v3.
- ⚠️ surfaced: the baseline shipped with validator gaps (unknown vendor/key, missing profile) and no migrator; closed in the completion pass.

## Audit
1 Orca cycle (Run `run_cd8ca4ec5029`): code, security, test reviewers on a scratch copy with a planted canary, all caught; 0 real must-fix; 2 should-fix patched (byte preservation, emitter keeps custom models). Cycle 2 author-run. `review-bench record-check` ok. See `audit.md`.

## Verify
`pre-ship-verify.mts` reports "No package.json or Muro document verifier" (this repo has none), so checks ran by hand: config + migrator suites 137/137, doctor suite 56/56, full Node suite 1464/1470 (the 3 failures are `runtime/upgrade.test.mts`, identical at HEAD, logged), setup-validator READY, graphify CLEAN. No build, typecheck, lint or i18n command. Bun not run. Diff has no secret files or debug output.

## Followups generated
- `upgrade.test.mts` old-install fixture vs mandatory toon (already logged).
- Coverage gaps A2: empty/non-string `model`, non-object vendor/profile, quoted or duplicate `schemaVersion` in `convertV2`.
- Review-prompt hashes are recorded now; OpenCode workers cannot be given an explicit model at launch.
