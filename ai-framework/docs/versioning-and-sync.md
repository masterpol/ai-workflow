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

Run `node ai-framework/scripts/workflow-doctor.mts` and
`node ai-framework/scripts/setup-validator.mts` after the update. Resolve any reported old
paths or missing plugin files before relying on hooks. See the bundle-sync playbook for
instance-specific next steps and the [runtime documentation](../scripts/runtime/README.md).

---

See also: [extending](extending.md) · [vendors](vendors.md)
