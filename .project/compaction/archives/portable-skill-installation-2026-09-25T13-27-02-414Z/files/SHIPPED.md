# Shipped: Tracked skill installation

**Pitch:** [pitch.md](pitch.md) · **Plan:** [plan.md](plan.md) · **Hill:** [hill.md](hill.md)
**Shipped:** 2026-09-25 · **Appetite:** epic, decomposed into 3 sequential big-batch scopes (S1/S2/S3)

## Scope reconciliation

| Scope | Pitch commitment | Delivered | Status |
|---|---|---|---|
| S1 | Verified, transactional CLI and vendor registry | `add-skill.js`, `skill-registry.js`, `skill-source.js`, `skill-vendors.js` + 27 tests. Exact Git-object resolution (no checkout/hooks), symlink/traversal/secret-name rejection, atomic transact()/journal with crash recovery, project+global scope. | **Done** |
| S2 | Native command and project activation across vendors | Native `add-skill` entry points for Claude Code, Codex, OpenCode, and generated Cursor mirror; `workflow-doctor`/`setup-validator` recognize registry-managed skills by ownership instead of canonical mirror rules; `skill-vendors.js cursor-mirrors` materializes missing Cursor mirrors. 9 more tests. | **Done** |
| S3 | Repeatable bundle-sync migration and formatting | Registry-owned paths excluded from `bundle-sync`'s structural comparison (never misread as removed/pruned); `skill-sync.js reconcile` re-renders drifted vendor wrappers after a sync, covered by the same approval; optional Prettier formatting of installed content with dual-hash tracking; formatter failure aborts with zero writes. 26 more tests (16 skill-sync + 10 bundle-sync). | **Done** |

All three scopes are complete. Total: 63 tests passing, 100% line coverage on
`skill-registry.js`/`skill-source.js`/`skill-sync.js`/`skill-vendors.js`, 0 doctor/setup-validator
failures, knowledge graph clean.

## No-gos honored

- **No application implementation or decisions on La Salle infrastructure.** Confirmed: every
  touched file is under `ai-framework/`, `.claude/`, `.agents/`, `.opencode/`, `.cursor/`, or
  `.project/pitches/`/`knowledge/` — nothing in an application/district layer (none exists yet).
- **No silent override of instance customization, automatic historical deletion, invented token
  savings, or secrets in reports.** Confirmed: `reconcile()` and `update()` both refuse to touch
  a locally modified owned file (reported as `conflict`, never overwritten); `remove` verifies
  hashes before deleting; this pitch makes no token/savings claims; the `SECRET` filename
  pattern (`.env*`, `credentials.json`, `settings.local.json`) is enforced on both the fetch
  side and every destination write path (verified directly in audit cycle 1's security review).
- **No installation or deletion during shaping.** Confirmed: no external skill was installed
  into this checkout at any point in build; all fixture installs ran against temporary
  directories or isolated scratch copies of the bundle.

## Rabbit holes — resolved as committed

- **"Instance data stays local; only portable machinery/defaults sync"** — confirmed:
  `.project/skills/{registry.json,packages/,vendors.json,global.json}` are never in
  `bundle-sync.js`'s `SYNCED_DIRS`; only the installer scripts, vendor-descriptor defaults, and
  SKILL.md documentation sync.
- **"Planner: pin upstream contracts, count all mirrors/tests, split if appetite exceeded"** —
  confirmed: a bounded Skills-CLI compatibility spike (S1) led to explicit Git-object
  retrieval instead of wrapping the upstream CLI (logged in `deviations.md`); the pitch was
  pre-split into S1/S2/S3 and each scope stayed within its file-count budget (S2 used 14 of a
  15-file limit; S1/S3 stayed within their 9–12 file estimates).
- **"Implementer: define transaction/recovery boundaries and host capability tests before
  mutation"** — confirmed: `transact()`/`recover()` (journal + lock + crash recovery) were
  built and tested in S1 before any install path existed; `runtime: unverified` is recorded on
  every installed skill until an agent reviews it; real host smoke tests were run for Claude
  Code (verified) and OpenCode (discovery verified) in S2, with Codex/Cursor recorded as
  unverified rather than assumed.

## Audit findings — final disposition

See `audit-cycle-1.md` for full detail. Zero must-fix. One should-fix fixed (YAML
frontmatter escape-sequence bug in `skill-source.js`, with regression tests). One should-fix
deferred with reason (a TOCTOU ancestor-symlink race requiring an already-write-capable local
co-resident process — outside this tool's actual threat model; logged in `deviations.md`). One
low-confidence security note resolved by a regression test proving the code already had the
property in question (formatter `--config` only ever resolves from the trusted project root).

## Knowledge extracted

- `.project/knowledge/patterns/dual-hash-tracking-for-transformed-content.md`
- `.project/knowledge/patterns/subprocess-revalidation-against-on-disk-code.md`
- `.project/knowledge/patterns/resolve-config-only-from-trusted-root.md`
- `.project/knowledge/issues/macos-tmpdir-realpath-alias-breaks-path-assertions.md` (recurred
  independently twice in this pitch — S1 and S3 — promoted rather than left in `log.md`)

Graph rebuilt: 4 entries, 4 links, `graphify.js --check` CLEAN.

## Followups generated

Added to `.project/pitches/_followups.md`:
- The deferred TOCTOU should-fix (ancestor-symlink race in `skill-registry.js`'s `resolveFile`
  callers) — candidate for a future hardening pass if the threat model ever changes.
- The pre-existing `bundle-sync.js` marker-semantics quirk found during S3 manual verification
  (an unverified-and-unapplied file can misclassify as `local` on the next sync) — unrelated to
  this pitch's scope, not fixed here.

## What downstream pitches can now build on

`portable-skill-defaults`, `pitch-compaction`, and `project-state-report` (all bet, queued) each
assumed specific infrastructure from this pitch in their "Solution sketch" sections. Verified by
the cross-pitch-conflict-checker in audit cycle 1: no contradiction between what was built and
what those pitches assume — the registry schema, all-vendor adapter coverage, and bundle-sync
integration they depend on are in place as described.

## Version

Shipped as bundle version **2.4.0** (`CHANGELOG.md`) — at the user's request, S1+S2+S3 are one
consolidated release rather than 2.4.0 (S1+S2) followed by a separate 2.5.0 (S3); `VERSION` and
`CHANGELOG.md` were reset to the pre-feature 2.3.0 baseline and regenerated once through
`changelog.js` with a single entry covering the complete feature. This is a workflow-tooling
release, not an application release — no application build/typecheck/lint/i18n commands exist
yet for this project (`.project/context/stack.md` records the application stack as still
undecided), so the verify gauntlet ran this workspace's actual gates instead: the full skill
test suite (63/63), `node --check` on every touched script, `workflow-doctor.js`,
`setup-validator.js`, and `graphify.js --check` — all clean. `git diff` reviewed for
secrets/debug leftovers: none found.
