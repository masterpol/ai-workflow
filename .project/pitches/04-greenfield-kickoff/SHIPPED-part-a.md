# Shipped: greenfield-kickoff, part A

Bet: 2026-11-27 • Shipped: 2026-11-27, bundle v2.60.0 • Appetite: big-batch, part A only

Part B is not planned or built, so the pitch stays open and this record is not `SHIPPED.md`.

## Scopes

| ID | Status | Hill done | Notes |
|----|--------|-----------|-------|
| A1 | shipped with limits | 2026-11-27 | Detector, tests and shipped-files list. Departs from the pitch for three operating-system file names; uses the shared startup. |
| A2 | shipped with limits | 2026-11-27 | Setup routing and the definition rule, with option 3: the install routes report `unclear`. |

**Departs from the plan:** an `existing` project was to see setup unchanged. On the documented install routes setup now asks one question first. All departures are in [deviations.md](deviations.md).

## No-gos honored

- No application code, scaffolding or package install: honored.
- No invented technology or rule: the instruction writes `open`; no live run reached that path.
- No write before approval except the draft: part A adds no draft. It adds one choice note, written with setup's other approved writes (instruction only, not exercised live).
- No secrets stored: the detector does not open the files it classifies and excludes secret file names from project evidence.
- No automatic shape, bet, plan or build: honored.
- No change to setup for an existing project except definition preservation: **not met** on the install routes (see above).

## Rabbit holes (part A)

- Shipped-file list: resolved with a committed list checked against Git.
- New: no install route reaches `empty` or `existing`; a README-only repository reports `existing`; `node_modules` exceeds the scan budget; Bun runs a project preload.

## Open at ship

- **Security high, not fixed:** under Bun, a project's `bunfig.toml` preload runs before any workflow script. The owner overrode the audit rule that blocks shipping; see [audit.md](audit.md). It needs its own `/fix`.
- Not run: the owner's live host smoke test and golden case `setup-refresh-keeps-definition`. The eval used the setup instructions from before the audit's fixes, which have no live run.

## Verification

`node ai-framework/hooks/scripts/pre-ship-verify.mts` on the final tree: see the run record. The bundle has no build, typecheck, lint or i18n command.

## Docs

`README.md`, `ai-framework/docs/setup.md` and `SETUP.md` describe the check. `README.md` also states the Bun issue. No decision record.

## Knowledge and follow-up

- Issue cards: [Bun preload](../../knowledge/issues/bun-runs-a-project-preload-before-any-workflow-script.md) (open), [install fixtures](../../knowledge/issues/fixtures-built-from-the-shipped-list-hide-what-a-real-install-holds.md) (open), [adapter constant](../../knowledge/issues/a-missing-adapter-constant-turns-an-access-check-into-existence.md).
- Deferred items: the "From greenfield-kickoff part A build" section of [the backlog](../_followups.md).
- Run record: [2026-11-27](../../runs/2026-11-27-greenfield-kickoff-part-a.md).
