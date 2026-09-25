# Instance-managed skills

The installer is a portable Node CLI with a native `add-skill` entry point for every bundled
vendor: `.claude/skills/add-skill/` (canonical playbook), `.agents/skills/add-skill/` (Codex),
`.opencode/commands/add-skill.md` (OpenCode), and the generated `.cursor/skills/add-skill/`
(Cursor). The playbook runs inspect → review → explicit choices → preview → approval → apply.
`ai-framework/scripts/skill-sync.js` migrates instance skill metadata during `bundle-sync` (see
below) and formats installed content where the receiving project already configures a
formatter. No application dependencies or package manager are required to run the installer
itself.

`inspect` returns the fetched `SKILL.md` as `instructions` so the agent can review what it is
about to install without executing anything from the source.

## Inspect, choose and install

```sh
node ai-framework/scripts/add-skill.js inspect juliusbrussee/caveman/caveman --path skills/caveman/SKILL.md
node ai-framework/scripts/add-skill.js install juliusbrussee/caveman/caveman --path skills/caveman/SKILL.md --scope project --phases shape,plan
node ai-framework/scripts/add-skill.js install juliusbrussee/caveman/caveman --path skills/caveman/SKILL.md --scope project --phases shape,plan --apply
```

An exact `https://skills.sh/<owner>/<repository>/<skill>` URL is also accepted. Bare names
abort as ambiguous; specify the repository identity. If a repository has multiple matching
variants, the error lists their paths: choose `--path <repository-path>/SKILL.md`. The registry
retains that exact path for updates. Missing/invalid sources abort before
target writes. `--ref <commit-or-ref>` selects a revision; the registry always records the
resolved commit. `--repo /absolute/local/repository` is the offline/test source option.
Git must be available. Git failures are reported without echoing potentially sensitive stderr.

Commands return JSON. Mutations default to a preview; `--apply` performs the displayed class
of operation. Re-running the command revalidates the source and ownership. Pin `--ref` when
the applied upstream revision must match a reviewed preview. No remote source code is run.

Installation requires an explicit `--scope project|global` and `--phases` choice. Supported
phases: `shape,critique,plan,build,audit,ship,cooldown,manual`. Use `manual` for a skill that
should only be invoked explicitly. Wrappers carry these activation instructions; model
compliance is not a security boundary. Host policies and workflow gates retain precedence.

`--root /absolute/project` selects the receiving project. For project scope the project root
is the installation location. Global scope additionally requires `--location /absolute/user-root`:
this is the home-like root under which each vendor's global skill path is resolved. It must
already exist and differ from the project root. No global location is assumed. Global mode
shares its activation settings with other projects using that same global registry.

## All vendors available in the project

Baseline layouts live in `ai-framework/integrations/skill-vendors.json`. Detect project vendors
from their artifacts, without requiring installed executables. This project includes Claude
Code, OpenCode, Codex and Cursor. Registered local vendors always participate.

Extend or override layouts in `.project/skills/vendors.json`:

```json
{
  "schemaVersion": 1,
  "vendors": [
    {
      "id": "additional-vendor",
      "detect": [".additional-vendor"],
      "project": ".additional-vendor/skills",
      "global": ".config/additional-vendor/skills"
    }
  ]
}
```

Paths are relative to the chosen root. Set `global` to `null` for a project-only host; a global
installation then fails for the whole selection until a compatible scope is chosen. There
is no active-vendor-only installation shortcut. Unregistered hidden vendor directories with
a `skills` directory block installation. Other unconventional layouts need explicit registration;
the CLI does not claim to infer vendors from arbitrary prose or proprietary configuration.

Equivalent destinations share one wrapper. Case-colliding destinations, unowned files,
reserved canonical skill names, symlink ancestors and traversal are rejected. Wrapper links
point to the installed source; resolve that source's resource paths from its own directory.
The command copies no API keys or provider settings and never installs a vendor application.

## Registry and source packages

Project state:

- `.project/skills/registry.json`: schema version 1 and a `skills` map keyed by owner/repo/skill.
- `.project/skills/packages/<owner>/<repo>/<skill>/`: exact selected skill directory and resources.
- `.project/skills/vendors.json`: instance vendor descriptors.
- `.project/skills/global.json`: links to explicitly selected global roots.

Global state uses `.ai-workflow/skills/` under the selected root. Global descriptors still come
from the receiving project. Project sync must not mutate these global roots implicitly.

Each registry entry records identity, resolved Git revision/source path, license presence,
description, enabled state, selected phases, scope, adapter paths, and owned file SHA-256
hashes/modes. `sourceHash` preserves the original materialized content hash; `hash` is the
current owned baseline. Runtime prerequisites are explicitly `unverified` until reviewed;
installation does not imply scripts, browsers, hooks or dependencies are ready to run.
License text is preserved when found at the repository root; absence is reported rather
than inventing a license. Installation does not confer redistribution permission.

Git objects are inspected without checkout or filters. The skill must have matching `name`
and nonempty `description` frontmatter. Plain/quoted scalars and block descriptions are
supported; the installer is not a general YAML parser. All files beneath the selected skill
directory are copied, including executable modes. Source symlinks/submodules and secret
filenames are rejected. Inline relative Markdown links in SKILL.md must resolve inside the
package. Dynamic/script references and semantic suitability still require agent review.
Limits are 1,000 selected files and 25 MiB of selected content; Git calls time out after 60s.

## Lifecycle and recovery

```sh
node ai-framework/scripts/add-skill.js list --scope project
node ai-framework/scripts/add-skill.js disable owner/repo/skill --scope project --apply
node ai-framework/scripts/add-skill.js enable owner/repo/skill --scope project --apply
node ai-framework/scripts/add-skill.js update owner/repo/skill --scope project
node ai-framework/scripts/add-skill.js update owner/repo/skill --scope project --ref COMMIT --apply
node ai-framework/scripts/add-skill.js remove owner/repo/skill --scope project --apply
node ai-framework/scripts/add-skill.js recover --scope project --apply
```

Update retains selected phases unless `--phases` is supplied; it retains disabled state.
Disable writes non-activating wrappers and keeps source resources. Removal deletes only
owned files after verifying their hashes and modes. Any modified/missing owned file aborts
the mutation; unrelated files are retained. No force-overwrite option is provided.

A process lock serializes writes. A journal holds original file bytes/modes and expected
new hashes. Ordinary failures roll back. An interrupted process leaves evidence and blocks
new mutations until `recover --apply`. Recovery checks every file before restoring any;
a concurrent edit produces a conflict instead of overwriting user work. Preserve the journal
for manual resolution if recovery reports conflict. File-level replacement is atomic; the
whole multi-file install is recoverable, not an atomic filesystem snapshot. This covers
process interruption, not a promise of durability against hardware/power failure.

## Formatting installed content

If the receiving project already configures Prettier (a `.prettierrc*`/`prettier.config.*` file,
or a `"prettier"` key in its root `package.json`, resolved to an installed `prettier` binary —
`node_modules/.bin/prettier` first, then `PATH`), `install`/`update` format the newly staged
package content (never the generated vendor wrapper files) with it before writing anything. A
formatter failure aborts the whole operation with no target writes; nothing needs rolling back.
The registry then records both hashes for each formatted file: `sourceHash` is the untouched
upstream digest, `hash` is the formatted baseline actually written and reverified on every later
run, so a clean reinstall of unchanged content produces no diff. No formatter is introduced where
none is already configured, and formatting an already-installed skill's package content happens
only through `install`/`update`, never through `bundle-sync` or `reconcile` (see below), which
touch vendor wrapper files only.

## Bundle-sync migration (`skill-sync.js`)

`bundle-sync` (see `.claude/skills/bundle-sync/SKILL.md`) excludes every path this project's
skill registry owns from its structural comparison — those files were never part of the
canonical bundle, so they are never misread as "removed upstream" and are never a prune
candidate, in every receiving project independently of what it has installed.

After syncing, and covered by that same approval (never a second gate), bundle-sync runs
`node ai-framework/scripts/skill-sync.js reconcile [--apply]` against whatever is now on disk.
For each installed skill it re-renders only vendor wrapper files against the current vendor
descriptors and wrapper template — package content is never re-fetched or reformatted. This is
how a project vendor registered or activated *after* a skill was installed (including one this
same sync just added) gets that skill's adapter without a separate `add-skill update`. A skill
with a locally modified owned file, or a target collision with something unowned, is left
untouched and reported as a conflict rather than overwritten. An unrecognized vendor layout, an
unsupported/incompatible registry schema, or a pending `add-skill` transaction blocks the whole
registry (not the rest of the structural sync) until resolved. Global registries are never read
or written by a project sync. Run it directly with `--root /absolute/project [--apply] [--json]`
outside of `bundle-sync` to check or fix registry/vendor drift on its own.

## Doctor and setup integration

Registry-managed skills own wrappers under vendor skill directories, including
`.claude/skills/<name>/`, but they are upstream content, not canonical workflow skills. The
workflow doctor therefore skips its canonical profile/mirror checks for them and instead
reports, per registry entry: missing owned files (fail), wrappers that do not load the package
or disagree with the registry's phases or enabled state (fail), project vendors without an
adapter or with an adapter path that differs from the current descriptor (fail — run `update`),
and locally modified owned files (warn). Unregistered vendor layouts, invalid registries and
pending transactions are failures. Global registries are reported, not validated, from a project.

Cursor mirrors of canonical skills and agents are byte copies. Materialize missing ones with:

```sh
node ai-framework/scripts/skill-vendors.js cursor-mirrors            # preview
node ai-framework/scripts/skill-vendors.js cursor-mirrors --apply    # create missing only
```

It never overwrites a differing mirror: the setup validator reports those as warnings and every
missing mirror as a failure. Registry-managed skills are excluded; they carry their own Cursor
adapter. The command refuses to run while the registry is invalid or a transaction is pending,
so external wrappers cannot be mistaken for canonical skills.

## Verification

```sh
node --test ai-framework/scripts/add-skill.test.js ai-framework/scripts/skill-vendors.test.js ai-framework/scripts/skill-sync.test.js ai-framework/scripts/bundle-sync.test.js
node --check ai-framework/scripts/add-skill.js ai-framework/scripts/skill-sync.js ai-framework/scripts/bundle-sync.js
node --test --experimental-test-coverage '--test-coverage-include=**/skill-*.js' --test-coverage-lines=90 ai-framework/scripts/add-skill.test.js
```

Tests use temporary projects and local Git repositories. They cover all baseline vendors,
an additional vendor, shared paths, global/project rollback, resource integrity, ownership
conflicts and real subprocess interruption. `skill-vendors.test.js` also runs the real doctor and setup
validator against a copy of this bundle with an installed fixture skill. `skill-sync.test.js`
covers formatting (a deterministic fake `prettier`, success, no-formatter, and failure-aborts
cases) and reconciliation (drift, conflict, unowned collisions, invalid schema, unresolved
vendor coverage). `bundle-sync.test.js` covers the full three-way classification (new, changed,
local, conflict, unverified, removed/prune, flagged), two projects with different installed
skills retaining those differences after apply and prune, registry-owned files never
misclassified as removed, and the skill-sync report surfacing in the same sync. These are
filesystem/CLI checks, not evidence that every vendor application has executed the skill; record
host smoke tests separately and report hosts that were not run as unverified.
