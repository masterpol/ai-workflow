# Design notes

← [Back to README](../../README.md)

- **Keep local settings and secrets out of distribution.** Never copy or commit a harness-local
  `settings.local.json`, credentials, `.env`, or `.env.local` file with this bundle. Setup
  preserves an existing local settings file and generates `.project/` data and entry-file
  specifics from the target project.
- **Model routing is profile-based with bundled defaults.** The core workflow uses
  `fast`/`standard`/`deep`; OpenCode adapters pin provider-qualified model IDs, while Codex
  adapters use Codex-native model identifiers. Connect the required OpenCode providers or
  explicitly change the affected adapters. See `ai-framework/integrations/harnesses.md`.
- **Portability is the AI's job, not a bash script's** — `SETUP.md` drives any assistant to
  place files, convert per-tool integration, and fill templates, so it works cross-platform
  (including Windows) and cross-tool. The few scripts that do exist (`graphify.mts`,
  `workflow-doctor.mts`, the hooks) are deterministic *checks and generators*, not the
  installer — the AI still drives placement, gating, and judgment calls.

See `SETUP.md` for the full step-by-step and `ai-framework/workflow/overview.md` for the
pipeline mechanics.

## Managed-write safety and interrupted compaction

Skill installation and pitch compaction require trusted project directories and ancestors:
cooperating users must not rename or replace them while a managed transaction runs. The tools
reject static symlinks and observed ancestor replacements and use atomic file replacement.
These checks do **not** guarantee continuous containment against a hostile local process that
can swap an ancestor after the final check. Directory-relative native operations alone would
not solve relocation of an already-open directory either. Keep that stronger threat model out
of the portable runtime's guarantees.

Ledger commits, archives and removals share `.project/compaction/transaction.json` and its
transaction roots. Before upgrading or running this version, stop every process using older
compaction scripts, including long-lived sessions that imported them, and recover any pending
legacy transaction using the installer recovery command below. Do not run old and new
compaction writers concurrently: they use different locks, and absence of a legacy journal
does not prove an old writer cannot resume. After an interruption, recover with:

```sh
node ai-framework/scripts/pitch-archive.mts recover --root /absolute/project --apply
```

Older ledger commits used the installer journal at `.project/skills/transaction.json`.
A pending legacy or installer journal blocks new compaction mutations; it is never silently
moved, discarded or recovered with the wrong roots. After ensuring the original writer has
stopped, recover that journal with:

```sh
node ai-framework/scripts/add-skill.mts recover --scope project --root /absolute/project --apply
```

Recovery rolls back the interrupted transaction and refuses conflicting file edits. Inspect
and resolve any reported conflict rather than deleting its journal or lock. Existing archive
verification, coverage requirements and human approval before pitch deletion still apply.

---

See also: [extending](extending.md) · [versioning-and-sync](versioning-and-sync.md)
