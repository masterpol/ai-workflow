# Shipped: orca-engines-range
Bet: 2026-10-16  •  Shipped: 2026-10-16  •  Appetite: small-batch  •  Version: 2.26.0

## Scopes
| ID | Status | Notes |
|----|--------|-------|
| S1 | shipped | `runtime/semver-range.mts` (pure, no imports); 2480 npm-semver fixture rows, 57 tests, 3 in-memory mutants caught |
| S2 | shipped | preflight, launch gate and start hook check `integrations.orca.engine`; refusal names range and found version |
| S3 | shipped | config validation with position, doctor failure on a bad range, migrator/example default `>=1.4.224` |
| S4 | shipped | `orca-vendors.md`, changelog 2.26.0 |

## No-gos honored
- No network check for latest Orca; no prerelease/build metadata support; `engines.node`/`engines.bun` untouched.

## Rabbit holes
- Resolved: hand-written vs library (hand-written, fixtures from npm semver); prerelease (rejected); fixture source (generated once outside the repo).
- Deviations d1-d5 in `deviations.md`; notably an invalid range surfaces as `policy-malformed` because config validation runs first.

## Audit
1 cycle. code-reviewer and security-reviewer (sonnet), test-coverage-checker (haiku), `independent: yes`, planted canary caught by all three. 0 must-fix against the repo (the canary finding was refuted), hardening plus 4 coverage gaps fixed; 4 acknowledged. See `audit.md`.

## Verify
Full Node suite 1560 tests / 1558 pass / 0 fail / 2 skipped; setup-validator READY; graphify CLEAN; doctor READY WITH WARNINGS (1, existing Runtime boundary test warning). Bun suite not run. No build, typecheck, lint or i18n command exists in this repo. Orca was requested; the start hook reported ready.

## Upgrade note
A bare `engine: "1.4.224"` is now an exact pin. Use `>=1.4.224` for the old "this or later" behavior.

## Followups generated
Acknowledged items from `audit.md` (#4-#7) appended to `.project/pitches/_followups.md`; the Orca `worker-list` cap followup already existed.
