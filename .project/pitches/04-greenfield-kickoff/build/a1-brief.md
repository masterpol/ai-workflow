# A1 brief: project-state detector

Read first: `.project/pitches/04-greenfield-kickoff/plan.md` (sections "Detector output contract", "A1" exit criteria, "Risks"), `deviations.md` beside it, `pitch.md` (Affordances 1-2), `ai-framework/rules/security.md` section 9 and checklist G, `ai-framework/rules/coding-standards.md`, `ai-framework/rules/boundaries.md`, `ai-framework/rules/testing.md`, `ai-framework/scripts/runtime/README.md`.

## Build
- `ai-framework/scripts/project-state.mts`: `node ai-framework/scripts/project-state.mts [--root <dir>] --json` prints one object `{ schemaVersion: 1, state, reasons[], evidence[] }`. Exit 0 for every state, 2 for a usage error. Export the decision as a function with injected `RuntimeDeps`, following sibling scripts. Without `--json`, print a short human form.
- `ai-framework/templates/shipped-files.txt`: sorted, one root-relative path per line, for every file a `SETUP.md` Step 1 install places: `ai-framework/`, `.claude/`, `.agents/`, `.codex/`, `.cursor/`, `.opencode/{opencode.json,commands/,agents/,plugins/,package.json}`, `AGENTS.md`, `CLAUDE.md`. Base it on Git (tracked plus untracked unignored files). Read the list from beside the running script, never from the scanned project.
- `ai-framework/scripts/project-state.test.mts`.
- Add the two new scripts to the syntax-check list in `ai-framework/scripts/workflow-doctor.mts` (that list only).

## Rules for the detector
- Order: `.project/kickoff/draft.toon` first. Regular file gives `resume`; anything else at that path gives `unclear`.
- `empty` only after a COMPLETED scan that found nothing outside the shipped list and the scaffold (`.project/` files whose relative path exists in the bundle's `templates/project/`).
- `existing`: at least one application, manifest, infrastructure, notebook, SQL or document file outside those. Name each in `evidence` (cap the list and say it was capped).
- `unclear`: a symlink, unreadable directory, special file, scan over budget (bounded entries and depth), an unrecognised file inside a harness folder or `.project/`, or any other file you cannot classify. Any `unclear` cause wins over `empty`; decide and document precedence between `unclear` and `existing`, favouring `unclear` when the scan did not complete.
- Exclude by exact path, never by base name. Folder skips allowed only for `.git/` and `.opencode/node_modules/`. Never read `.env*`, `credentials.json` or `settings.local.json` (their presence may count; their content is never opened). `.claude/settings.local.json`, `ai-workflow.toon` and OS litter such as `.DS_Store` must not turn a fresh install into `existing`; justify each exclusion in a comment.
- Read-only. Spawn no process (no Git, no shell, no project program). File names in output are untrusted: strip control characters and bound their length. No raw error messages or absolute paths in output, only error codes.
- Use the guarded reading style of `readProjectText` in `consolidation-migrate.mts` where a file is read; prefer not reading project file contents at all.

## Tests (exit criteria)
- Fixtures are built from a real install: copy the bundle into a temp folder following SETUP.md's copy list (use the shipped list's source files), never a hand-made empty folder. Cases, each expecting one state: nothing added (`empty`); nested/monorepo code; SQL only; notebook only; infrastructure only; documents only; manifest only; user file inside `.claude/skills/`; symlink; unreadable folder; scan past budget; draft present (`resume`); draft not a regular file.
- A test whose name starts with `[not-actually-empty]` binds golden case `not-actually-empty` in `.project/evals/datasets/greenfield-kickoff.json` (read it; keep it JSON and unchanged).
- The fixture tree is byte-identical after a run.
- A bundle-only test (skip outside the bundle checkout, the same way `setup-validator.test.mts` does) fails when `shipped-files.txt` differs from Git. With environment variable `UPDATE_SHIPPED_FILES=1` it rewrites the file instead. Tests also ship into installs: no other test may depend on Git history.
- Mutation proof: an in-memory mutant that removes the fail-closed branch makes the `[not-actually-empty]` or a named fail-closed test fail. Record it as author-run.
- Both pass: `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/project-state.test.mts` and `bun test ai-framework/scripts/project-state.test.mts`. Also run `node ai-framework/scripts/workflow-doctor.mts` and `node ai-framework/scripts/setup-validator.mts` (exit 0).
- Follow TDD: write failing tests first. Estimate 650-850 lines for script plus tests; report if you will exceed 1,000.
