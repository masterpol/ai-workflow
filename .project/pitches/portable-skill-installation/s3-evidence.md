# S3 completion evidence

Scope: bundle-sync migration of instance skill metadata, protection of registry-owned files
from bundle-sync's structural comparison, and formatting of installed skill content.
Runtime: Node v24.18.0.

## What was built

- `ai-framework/scripts/skill-sync.js` (new): `ownedPaths()` (registry-owned paths for
  bundle-sync to exclude), `discoverFormatter()`/`formatFiles()` (project-configured Prettier,
  scratch-directory formatting so preview never writes the target), and `reconcile()` (re-renders
  only drifted vendor wrapper files for installed skills against current descriptors/template,
  through the existing transact()/journal machinery — package content is never re-fetched).
  CLI: `skill-sync.js reconcile [--root] [--apply] [--json]`.
- `ai-framework/scripts/bundle-sync.js` (updated): excludes registry-owned paths from both the
  "new" and "removed" comparison sides; runs `skill-sync.js reconcile` as a subprocess against
  the ON-DISK (just-synced) code after its own apply loop, folding the result into the same
  summary/report — one approval, no second gate.
- `ai-framework/scripts/add-skill.js` (updated): `makeEntry()` now formats staged package content
  (never generated wrapper files) when the project configures a formatter, and records separate
  `sourceHash` (pre-format upstream digest) and `hash` (formatted baseline) per owned file, plus
  an optional `entry.formatting` record. A formatter failure throws before any write.
- `.claude/skills/bundle-sync/SKILL.md`, `ai-framework/integrations/skills.md`: document the
  skill-registry report, reconciliation semantics, and formatting.

## Behavior tests and coverage

```sh
node --test --experimental-test-coverage '--test-coverage-include=**/skill-*.js' --test-coverage-lines=90 ai-framework/scripts/add-skill.test.js ai-framework/scripts/skill-vendors.test.js ai-framework/scripts/skill-sync.test.js ai-framework/scripts/bundle-sync.test.js
```

Exit 0: 62 tests, 62 pass (27 S1 + 9 S2 + 16 skill-sync + 10 bundle-sync). Line coverage 100%
on skill-registry, skill-source, skill-sync and skill-vendors; skill-sync functions 90.91%
(CLI default-argument branch only); aggregate branches 94.12%.

`skill-sync.test.js` proves: registry-owned paths reported (and an invalid registry protects
nothing, never throws); no-formatter passthrough; Prettier discovered via config file or
`package.json#prettier`, resolved from `node_modules/.bin` first; a configured-but-uninstalled
formatter is treated as absent; formatter failure throws with nothing queued; install records
distinct upstream/post-format hashes and reinstalling formatted content is clean; a formatter
failure during install leaves the target byte-for-byte unwritten; reconcile's `not-installed`,
`pending-transaction`, `clean`, `incompatible` (global scope untouched), `coverage-unresolved`
and `conflict` (both a modified owned file and an unowned destination collision) states; a newly
registered vendor is reconciled in preview (no writes) and apply, then idempotent; the CLI's
preview/apply/exit-code behavior.

`bundle-sync.test.js` proves: dry run writes nothing and never imports source `.project/`
content; changed/conflict classification against a known base, only changed applies; prune
removes only unmodified-vs-base removed files, keeps a locally edited one; two target projects
with different installed skills keep those differences after apply and prune; registry-owned
skill files never appear as "removed" and are never pruned; flagged files are reported, never
auto-applied; a newly registered target vendor is reconciled for an installed skill in the same
apply (no second approval); an unsupported skill-registry schema is reported without blocking
the rest of the structural sync; global scope (`.ai-workflow/skills/`) is never read or written;
first sync without a known base reports differences as unverified, not silently applied.

## Manual end-to-end verification

Beyond the automated suite, ran the actual flow by hand against isolated fixture copies of this
bundle (not this checkout): installed a fixture skill, added/activated a vendor descriptor, ran
`bundle-sync.js --source ... --apply` and confirmed the new vendor's adapter was rendered in the
same apply, a second apply was idempotent, and a failing fake `prettier` aborted `add-skill
install` with zero bytes written (verified via a before/after content hash of the whole target
tree).

## Workflow verification

- `node --check ai-framework/scripts/add-skill.js ai-framework/scripts/skill-sync.js ai-framework/scripts/bundle-sync.js`: exit 0.
- `node ai-framework/scripts/workflow-doctor.js --json`: exit 0, 0 failures (597 results).
- `node ai-framework/scripts/setup-validator.js`: exit 0, `Setup status: READY`, 18 checks.
- `node ai-framework/scripts/graphify.js --check`: CLEAN.
- `node --test ai-framework/hooks/scripts/token-consumption.test.js`: exit 0, 4/4 pass.

## Remaining / known limitations

- Formatting supports Prettier only (the plan named this as the deterministic-fake-formatter
  spike; a differently-formatted project simply gets no formatting, matching "do not introduce a
  formatter where none exists").
- `skill-sync reconcile` never removes a vendor's adapter when that vendor is later unregistered
  (conservative: no automatic deletion); not required by the plan's exit criteria.
- Real host application runs for this scope are unverified beyond the S2 smoke tests already on
  record (Claude Code verified end to end; OpenCode discovery verified; Codex blocked on quota;
  Cursor not installed locally) — S3 added no new CLI surface those hosts invoke differently.

This completes the three-scope `portable-skill-installation` plan. See `deviations.md` for S3
changes.
