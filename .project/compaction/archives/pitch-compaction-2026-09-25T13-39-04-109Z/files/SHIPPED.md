# Shipped: Recoverable pitch compaction

**Pitch:** [pitch.md](pitch.md) · **Plan:** [plan.md](plan.md) · **Hill:** [hill.md](hill.md)
**Shipped:** 2026-09-25 · **Appetite:** epic, decomposed into 2 sequential big-batch scopes (C1, C2)

## Scope reconciliation

| Scope | Sub-pitch commitment | Delivered | Status |
|---|---|---|---|
| C1 | Incremental inventory, knowledge extraction, coverage ledger and done-work.md (`compaction-index.md`) | `/pitch-compress` skill + Codex/OpenCode/Cursor entry points; `pitch-compress.js` (`inventory`, `ledger`, `commit-ledger`, `write-done-work`); `done-work.md` scaffold; setup-validator scaffold check. | **Done** |
| C2 | Approved preservation-policy exception, verified recovery archive, transactional deletion and restore (`compaction-removal.md`) | `pitch-archive.js` (`archive`, `verify`, `remove`, `restore`, `recover`) reusing `skill-registry.js`'s already-audited `transact`/`recover`. Two real subprocess-kill interruption tests. | **Done** |

Totals: 40 tests for this pitch (100% line/branch/function), 151 across the whole skill surface,
doctor 0 failures, setup-validator READY (19 checks), knowledge graph clean.

## Confidence — read this before relying on it

**The audit was only partly independent.** Of four reviewers, only the code-reviewer completed;
the security-reviewer, test-coverage-checker and cross-pitch-conflict-checker died on a provider
rate limit. The security scenarios were instead run by the author in the main thread. That found
and closed four must-fix defects (below), but it is not a substitute for an independent review of
a tool that deletes files. The user chose to ship without waiting for the limit to reset;
independent re-review is queued as a followup (`_followups.md`). **This tool has not yet been run
against a real project pitch** — do that first on a low-stakes one, with a recovery archive kept.

## No-gos honored

- **No application implementation or decisions on La Salle infrastructure.** Only workflow tooling
  and project records were touched.
- **No silent override of instance customization, automatic historical deletion, invented token
  savings, or secrets.** Every mutating step needs `--apply`; deletion additionally needs a
  verified recovery archive, a complete ledger with each gap explicitly accepted, an unchanged
  source, and a human gate. Nothing was archived or deleted from this project during the build.
- **No installation or deletion during shaping.** Confirmed.
- **The narrow exception to the historical-records guardrail** is confined to
  `.project/pitches/<slug>/` of a pitch with a `SHIPPED.md`; never `_archive/`, `design/`, or
  `.project/runs/`.
- **`/state` is not invoked** — that command does not exist until `project-state-report` ships;
  the playbook says so instead of promising it.

## Rabbit holes — resolved as committed

- Instance data stays local: `.project/compaction/` and `done-work.md` are outside every
  `bundle-sync` synced directory.
- Planner: reuse over reimplementation — verified `skill-registry.js`'s exports are generic over
  `{roots, state}` before committing, and reran the prior 111-test surface to prove no regression.
- Implementer: transaction/recovery boundaries settled before any mutation code existed; real
  `SIGKILL` tests, not a hand-built fake journal.

## Audit findings — final disposition

See `audit-cycle-1.md`. Four must-fix, two should-fix, all fixed and re-verified with live
exploit scripts before and after:
1. `latestArchiveDir("foo")` returned `foo-bar`'s archive (prefix match).
2. `restore()` didn't verify the archive; a hostile manifest wrote outside the destination.
3. A ledger destination could sit inside the pitch being deleted (coverage 1.0, nothing kept).
4. A ledger's author could self-declare all sections "gaps" (coverage 0) and pass the deletion
   gate — caused by my own build weakening the plan's per-gap acceptance requirement.
Plus `inventory` crashing on a non-kebab directory name, and an unused import.

## Knowledge extracted

- `patterns/a-gate-must-not-trust-its-own-author.md` — includes the process lesson that a
  deviation which *relaxes a safety property* must be flagged for approval, not logged as routine.
- `issues/bare-prefix-match-crosses-entities.md` — test with ids where one is a prefix of another.

Graph: 8 entries (5 patterns, 3 issues), 11 links, clean.

## Followups generated

Added to `.project/pitches/_followups.md`: independent re-review of this pitch (security,
test-coverage, cross-pitch); first real-use trial of `/pitch-compress` on a low-stakes pitch;
wiring `/state` into the playbook once `project-state-report` ships.

## What downstream pitches can now build on

`project-state-report` can read `.project/done-work.md` (scaffold + writer exist) as one source.
It should treat that file as generated and read-only, per its header.

## Version

Bundle version is set at commit time by the changelog script, per this session's convention.
