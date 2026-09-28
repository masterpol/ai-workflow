# Build deviations

## S1 — 2026-09-24

- Used explicit Git-object retrieval rather than wrapping the upstream Skills CLI. It preserves source pinning, avoids checkout/filter execution, and provides the ownership/transaction contract required by the approved plan.
- Live Caveman inspection found multiple vendor variants. Added `--path` selection, candidate reporting, and persisted source-path selection for updates; ambiguity still aborts before mutation.
- Kept four cohesive tooling modules as planned. Source inspection and transaction/CLI modules exceed the generic 80-line utility guideline; splitting their invariants into tiny files would obscure this first ownership implementation. They remain below 200 lines each; tests are co-located.
- This delivery provides the CLI and filesystem adapters only. Native command registration, doctor handling of external wrappers, entry-file activation and sync migrations remain explicitly S2/S3 work. No external skill was installed into this checkout.

## S2 — 2026-09-24

- `inspect` now returns the fetched SKILL.md as `instructions`, so the playbook's review step
  can read what will be installed without a checkout; an S1 test asserts it.
- Cursor mirror materialization is a script (`skill-vendors.js cursor-mirrors`) instead of
  agent-performed copying, so "setup is rerunnable and materializes missing mirrors" is
  testable. It creates only missing files and reports differing ones.
- The setup validator now requires a Cursor mirror for every canonical skill and agent, not
  just `shape` and `code-reviewer`; differing mirrors are warnings.
- The doctor's registry view (`externalSkillReport`) lives in `skill-vendors.js` rather than
  the doctor, so it is unit-testable; the doctor syntax-checks the four skill scripts too.
- Session handoff: implemented in Claude Code after the Codex session ran out of quota.

## S3 — 2026-09-25

- Reconciliation logic lives in `skill-sync.js`, calling `skill-registry.js`/`skill-vendors.js`
  directly rather than reusing `add-skill.js`'s `run()`, to avoid a circular require
  (`add-skill.js` imports `skill-sync.js` for formatting). The small amount of duplicated
  wrapper-render/collision logic is covered by `skill-sync.test.js` directly.
- `bundle-sync.js` invokes `skill-sync.js reconcile` as a subprocess (not a direct `require`)
  specifically so a sync that updates `skill-sync.js`/`skill-registry.js` itself validates the
  registry against the just-applied, on-disk code rather than the process's already-loaded
  (pre-sync) module — this is what lets it "detect incompatible mixed schema/runtime versions
  after partial sync" as the plan requires.
- Formatting supports Prettier specifically (config-file or `package.json#prettier` discovery,
  `node_modules/.bin` resolved before `PATH`) rather than an arbitrary configured command; this
  matches the plan's own "deterministic fake formatter" testing note and the most common real
  convention, while still satisfying "discover... do not introduce a formatter where none
  exists." A different formatter convention is a follow-up, not required by the plan's exits.
- During manual verification, found that `bundle-sync.js`'s existing (pre-S3) marker semantics
  can classify an unverified-and-never-applied file as `local` on the next run once a marker is
  written, because the marker snapshots the full current source manifest regardless of what was
  actually applied. This is a pre-existing quirk unrelated to S3's scope (skill registry
  protection/reconciliation/formatting); not fixed here — flagged in `log.md` as a followup.

## Audit cycle 1 — 2026-09-25

- Fixed a should-fix from code-reviewer: `frontmatter()` in `skill-source.js` now unescapes
  double-quoted (`JSON.parse`) and single-quoted (`''`→`'`) YAML scalars instead of a bare
  slice; regression tests added.
- Deferred a should-fix from security-reviewer: a TOCTOU window between `resolveFile`'s
  ancestor-symlink check and the later write. Requires an independent local process with
  existing write access to the same project directory racing filesystem operations — not
  reachable from malicious upstream skill content (already rejected at fetch time). Given that
  precondition already exceeds this tool's threat model and a proper fix is a nontrivial
  cross-cutting change, not implementing it in this cycle. See `audit-cycle-1.md`.
- Added a spy-based regression test confirming the formatter's `--config` argument always
  resolves from the trusted project root, never from fetched skill content, closing out a
  security-reviewer note that could not be empirically verified in-sandbox (no prettier binary
  available); the code already had this property, no fix was needed.
