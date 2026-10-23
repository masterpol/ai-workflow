# Version Log & Bundle Sync

← [Back to README](../../README.md)

This repo tracks its own history in `VERSION` and `CHANGELOG.md` at the root. Run
`node ai-framework/scripts/changelog.mts --check` for the current version and latest entry, or
see [How to improve this flow](extending.md) for when to add one — never hand-edit
either file, always go through the `changelog` skill/script.

A project that already unpacked this bundle can pull upstream improvements without re-running
`/setup` (which only refreshes generated `.project/` content, not the bundle's own canonical
files) — run `node ai-framework/scripts/bundle-sync.mts` from that project's root for a dry-run
comparison against the public GitHub `main` branch, then `--apply` after reviewing it. Use
`--source <path-to-a-newer-checkout>` only for offline or unpublished changes. See
`.claude/skills/bundle-sync/SKILL.md` for exactly what is compared, what is flagged for manual
review, and the post-sync verification step.

## Upgrade from JavaScript entry files

This release runs the TypeScript entries directly and removes the old JavaScript copies.
Use Node 22.18 or later, or add `--experimental-strip-types --disable-warning=ExperimentalWarning`
before every TypeScript path on Node 22.12–22.17. Bun can run those entries directly.

An older installation must start its first update using the script it already has:

```sh
node ai-framework/scripts/bundle-sync.mts --source <newer-checkout> --base-ref <installed-ref>
node ai-framework/scripts/bundle-sync.mts --source <newer-checkout> --base-ref <installed-ref> --apply --prune
```

Review the dry run before applying, including removed files and local customizations. `--prune`
removes only unmodified retired files; a locally edited JavaScript script needs a separate
review and migration into its TypeScript counterpart. A sync without pruning leaves the old
files on disk until that review is complete.

Then use the updated direct entry for a second dry run and apply. The old sync may not know
new directories such as `.opencode/plugins/`; this pass installs the current complete set:

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning ai-framework/scripts/bundle-sync.mts --source <newer-checkout> --base-ref <installed-ref> --json
node --experimental-strip-types --disable-warning=ExperimentalWarning ai-framework/scripts/bundle-sync.mts --source <newer-checkout> --base-ref <installed-ref> --apply --prune
```

Use the same `--base-ref` for both passes, and review the second report before applying it.
The first pass may report that skill reconciliation is unavailable after the old entry is
removed; the second pass uses the new tool and reconciles those adapters.

Commands and hooks must now target `.mts` entries; the OpenCode plugin is
`.opencode/plugins/token-consumption.ts`. During `--apply`, the new sync updates recognized
workflow script references in regular `AGENTS.md`/`CLAUDE.md` files and recognized hook commands
in `.claude/settings.json` and `.codex/hooks.json`. It preserves unrelated instructions and
settings, adds the shipped Node flags to those commands, and reports unsupported or customized
commands for manual merging. Malformed or symlinked configuration also needs manual review.
Check that report and merge any remaining current commands, keeping the project's instructions
and entry-file relationship intact. A JavaScript launcher from an earlier version can no longer
be used after its removal.

The sync also adds the bundle's workflow hook groups that an older `.claude/settings.json` or
`.codex/hooks.json` does not register yet (for example the Orca start hooks). It never changes or
removes an existing entry; a hook that already runs the same workflow script under the same matcher,
even wrapped or customized, counts as registered.

`ai-workflow.toon` is instance data, so the sync never creates or edits it. Create or upgrade it
after the sync, then check it:

```sh
node ai-framework/scripts/config-migrate.mts --dry-run --root .
node ai-framework/scripts/config-migrate.mts --apply --root .
```

Without the file, `--apply` builds it from the legacy settings files (or defaults) and adds the
default `models` block; a `schemaVersion: 2` file is converted in place.

Run `node ai-framework/scripts/workflow-doctor.mts` and
`node ai-framework/scripts/setup-validator.mts` after the update. Resolve any reported old
paths or missing plugin files before relying on hooks. See the bundle-sync playbook for
instance-specific next steps and the [runtime documentation](../scripts/runtime/README.md).

## Consolidation scaffold migration

Complete both sync passes before migrating instance data. The project's old sync script installs
the new scripts on the first pass; run the newly installed sync script for a second dry run and
approved apply against the same source/base. A fix inside the new script cannot help the old
script's first pass.

When the source ships the migration tool, the new sync reports one `consolidation` next step
with the count of legacy compacted pitches. It does not migrate those records or templates itself.
The sync's own baseline manifest remains its existing exception under `.project/`.

```sh
node ai-framework/scripts/consolidation-migrate.mts
# Review the reported plan, including local template comparisons, before applying:
node ai-framework/scripts/consolidation-migrate.mts --apply
```

The migration creates missing outcome-record scaffold, refreshes only recognized previous bundle
templates and adds index markers without changing legacy entries or local headers. Locally edited
templates stay untouched. It reports v1 ledgers and status-less decisions; dual-read keeps them valid.
Upgrading legacy pitch content requires its own approval and does not happen during scaffold migration.
Workflow-doctor reports this legacy inventory as information. An unsafe or unsupported inventory is
reported as unavailable with a warning, rather than as an empty count or successful migration.

---

See also: [extending](extending.md) · [vendors](vendors.md)

## Per-pitch legacy upgrades

`legacy-upgrade.mts status --json` inventories compacted pitches without opening recovery archives.
`prepare SLUG` emits an unresolved draft, evidence hashes, original-destination bindings and the
legacy narrative hash. Review the content and supply a v2 `mapping`, a lint-clean `outcomeRecord`,
`ledgerHash`, `legacyEntryHash` and `bindings` in an approved data file. Prefer TOON using the shared
`runtime/data-file.mts` writer; the command also reads existing JSON inputs. Remove draft markers
and unresolved judgments. Bind each newly chosen destination's complete bytes in `bindings` too;
each value is `sha256:<hex>`. Every section and other-file judgment needs its original content hash.

Original source bodies are required even when the old ledger already points to durable documents.
A retained summary cannot prove those hashes. Each archive-reading invocation needs explicit
approval for that pitch and a reason; the tool appends its receipt before any archive access.
Without `--apply`, validation still appends that approved-read receipt, but publishes no upgrade.

```sh
node ai-framework/scripts/legacy-upgrade.mts prepare SLUG --read-archive --approve-archive-read 'Approved reason for this pitch'
node ai-framework/scripts/legacy-upgrade.mts apply SLUG --file approved.toon --read-archive --approve-archive-read 'Approved reason for this pitch'
# After reviewing the validation result, repeat with --apply to publish.
```

The v1 ledger must match its introducing Git commit in complete history, and its old durable
destinations must still match that commit. Missing history or changed destinations stop the upgrade;
a freshly prepared hash is insufficient proof of the old commitment. No historical file is repaired
or overwritten to resolve that refusal. Separately review the changed evidence before deciding how
to proceed. Source archives are verified and remain immutable.

A living destination (a backlog, changelog or generated index) can legitimately change after the
v1 commit. After reviewing exactly what changed, an approved file may carry `acceptDestinationDrift`:
for each drifted file, its `committed` hash at the introducing commit, its `current` hash and a
written `reason`. Any other change, a wrong hash, an entry that matches no drifted file, a blank
reason or an unsafe path still stops the upgrade with no write, and an edit after approval
invalidates the entry. Retiring a narrative removes its own separator newline, so neighbouring
narratives stay byte-identical and their own bindings still hold.

### Large pitch folders

A v2 ledger accounts for every file outside the covered sections: one entry per file, or one
**group** entry (a `path` ending in `/`) for a folder, bound by a count and a tree hash over every
member's path and hash. The writer computes both; `pitch-archive.mts remove` recomputes them and
refuses if any member was added, dropped, renamed or edited. Limits are 200 ledger entries and 2000
files outside the covered sections (`ledger-schema.mts`). Keeping campaign staging, drafts and
duplicate log snapshots out of the pitch folder is the first remedy; see the pitch-compress playbook.

Apply atomically preserves `<slug>.v1.json` and commits the validated v2 ledger, publishes the outcome
record, regenerates the index, then retires only that slug's narrative and rebuilds/checks the graph.
Rerun the same approved file with renewed archive-read authorization after a completed-step
interruption. A pending compaction transaction must be recovered through the existing compaction
recovery command first; this tool refuses to guess ownership or create a second journal.
