# SHIPPED: rename-ship-command-to-finish

**Bet**: 2026-11-25  •  **Shipped**: 2026-11-25  •  **Version**: 2.56.0  •  **Appetite**: big-batch with a declared mechanical-rename exception  •  **Mode**: Orca, Run `run_89271af6dc37`

## Summary

The ship phase is now started with **`/ship-pitch`**. Claude Code's built-in `/ship` had shadowed the workflow command. The phase is still called `ship` wherever it is data.
(The pitch folder keeps its first slug; the owner chose `ship-pitch` over `finish` at the start of the build.)

- `phase-commands.mts` is the one command-to-phase mapping for the Claude and Codex startup hooks and metrics capture. Typing `/ship` records no phase.
- The skill and its Cursor, Codex and OpenCode adapters moved; instructions say `/ship-pitch`; a guard test refuses the old command or path in bundle-owned text.
- `bundle-sync --apply` removes the old adapters in installed projects, only a file whose content this bundle shipped and only from a source that has the renamed skill.

## Scope status

| Scope | Status | Who |
|---|---|---|
| S0 name check | not verified | the owner chose the name; host built-ins were not checked |
| S1 shared mapping in three hooks | done | Orca codex |
| S2 skill and adapters moved | done | Orca claude |
| S3 sync next step | done | Orca opencode; amended at S4 and at audit |
| S4 text sweep and guard | done | coordinator |
| C1 doctor list, changelog, followups | done | coordinator |

## No-gos

- ✅ No rename of the phase id, `SHIPPED.md`, `records/shipped/`, `4-ship.md`, `pre-ship-verify.mts` or any stored value. No change to what the close-out does. No historical record edited.
- ✅ No blind replacement of the word "ship"; a customized `ship` skill in an installed project is never deleted.
- ⚠️ **Amended with the owner's approval:** `--apply` deletes the retired adapters without `--prune` (the pitch said `--prune` only), because leftovers failed an upgraded project's doctor and graph.

## Rabbit holes

- Resolved: keep the phase name; no `ship` alias; history untouched; metrics join because the mapping happens at ingestion.
- Surfaced new: leftover files break upgrades; the previous project-template hash had to be registered in `consolidation-migrate`; automatic deletion needs proof of ownership (pattern `prove-ownership-by-shipped-content-before-removing-a-renamed-file`).
- Open: whether `ship-pitch` collides with a built-in in any host.

## Deviations

- `/critique` was not run before the bet. About 20 logic or test files against a pitch estimate of 12, plus the text sweep.
- The build ran on the open PR #13 branch (owner's choice).

## Audit

2 cycles. 3 must-fix (all in automatic deletion) and the should-fix findings fixed. **`independent: no`.** **The fixes made after the second cycle were not re-reviewed**, and the owner approved shipping without the third cycle.
The test-coverage worker ended as failed (timeouts) and was not rerun; the cycle-2 security review calls itself incomplete.
Record: `.project/analysis/2026-11-25-rename-ship-command-audit.md`. Raw reports: `audit-reports/`.

## Verification at ship

- Full suite on a clean clone with every change: **2,353 pass, 10 skip, 0 fail** (2,363 tests).
- The 10 changed test files under Node: 295 pass, 1 skip, 0 fail (without the old-project upgrade test).
- `pre-ship-verify.mts` fails for this package-less bundle; direct checks were run instead. No build, typecheck, lint or i18n command exists. No secret-named files and no debug output in the diff.
- Live: the `ship-pitch` skill loaded as a skill and ran this close-out, and the Orca startup hook fired for it. **Not checked:** typing `/ship-pitch` in a fresh session, other hosts, Windows, a case-sensitive volume.

## Doc updates

`AGENTS.md`, `CLAUDE.md`, `orca-vendors.md`, the bundle-sync skill and the live `.project` instruction files were updated in the build and audit.

## Followups

See `_followups.md`, section "From rename-ship-command-to-finish".
