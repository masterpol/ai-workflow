# New installs no longer inherit this bundle's identity

Shipped 2026-11-27 in bundle v2.59.3. Appetite: bug fix, widened by the owner at the audit gate.

## Reconciliation

The implicit scope in [log.md](log.md) shipped. `setup-validator` now fails an install whose `AGENTS.md` or `CLAUDE.md` keeps the bundle's identity sentence, and `SETUP.md` and `/setup` say to replace the copied "Project specifics" section.

The work grew past the planned five files and about 40 lines:

- The audit found that any project `SETUP.md` switched the new check off. Only the bundle's own title now marks the bundle checkout, and the workflow doctor uses the same test.
- The owner then asked to fix all errors before shipping. The validator's listed project files now go through the guarded reader, its failures print fixed text and codes, it runs its own bundle's helper scripts, its placeholder scan is linear and it validates child counts. Two bundle-only tests skip inside installs.
- The owner also asked for the readmes to describe the changes: `README.md` and the setup, setup-validator and workflow-doctor docs were updated after the audit. No reviewer saw those edits.

**Behavior change:** a symbolic or hard-linked `AGENTS.md` or `CLAUDE.md` now fails validation. A one-line `@AGENTS.md` import still passes.

**Not in this fix:** neutral entry files (`starter-install`), and the older unguarded reads in shared helpers.

## Verification

- Each behavior fix had a test that failed first. Some added coverage tests passed on first run.
- `node ai-framework/hooks/scripts/pre-ship-verify.mts` exited 0: 2,474 tests, 2,471 pass, three skips, zero failures. The bundle has no build, typecheck, lint or i18n command.
- The [audit](audit.md) ran four rounds. Every reviewer that had a planted defect caught it. No confirmed must-fix is open. The two low fixes after the last round were not re-reviewed.
- Eval case [replaces-copied-specifics](../../evals/datasets/install-entry-specifics.json): one Claude run passed; no baseline exists.

## Limits

- The check matches one sentence. A reworded copy passes, as does a project that keeps the bundle's `SETUP.md`.
- LAH's content was not checked; the read was denied.

## Knowledge and follow-up

- Added [the issue card](../../knowledge/issues/a-copied-entry-file-carries-the-bundles-own-identity.md) and rebuilt the knowledge graph.
- Deferred shared-reader items are in [the backlog](../_followups.md). The original backlog entry is marked closed.
- Run record: [2026-11-27](../../runs/2026-11-27-fix-install-inherits-bundle-identity.md).
