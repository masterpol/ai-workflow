# fix-install-inherits-bundle-identity (bug-fix)

- **Symptom:** a new install keeps this bundle's own "Project specifics" (`ai-workflow-portable` product, stack and verification commands) in its `AGENTS.md` and `CLAUDE.md`, and `setup-validator` passes both files as complete. Reproduced on 2026-11-27 with a `git archive` copy of HEAD plus the project template, without `SETUP.md`: "AGENTS.md: project specifics are filled" and "CLAUDE.md: full project mirror is present" both PASS.
- **Root cause:** `SETUP.md` Step 1 copies the bundle's `AGENTS.md` and `CLAUDE.md` as they are, and the bundle's own section is in them. `SETUP.md` Step 4 and the `/setup` skill then say to **extend** that file, so the bundle's section survives. `setup-validator.mts` `checkEntryFiles` only tests for the `## Project specifics` heading and the absence of the placeholder text, so the bundle's own section counts as filled.
- **Planned fix:** (1) `setup-validator` fails `AGENTS.md` and `CLAUDE.md` when the effective text still contains the bundle's identity sentence and the root has no `SETUP.md` (an install, not this bundle; the same test the doctor uses). (2) `SETUP.md` Step 4 and the `/setup` skill, with its Cursor mirror, say to **replace** the copied section. (3) A regression test that fails before the change and passes after, plus a test that the bundle's own `AGENTS.md` still contains the sentence, so a rewording cannot silently disable the check.

**Boundaries:** `ai-framework/scripts/setup-validator.mts` and its test, `SETUP.md`, `.claude/skills/setup/SKILL.md` and `.cursor/skills/setup/SKILL.md`. Added during build and audit: `installed-upgrade.test.mts` (fixtures), `ai-framework/docs/setup-validator.md` and the eval dataset `install-entry-specifics.json`. No change to the bundle's own `AGENTS.md` or `CLAUDE.md`. About 40 changed lines.
**Checked elsewhere:** `lasallenorandi`, `climbing-lab-monorepo` and `RN` do not contain the sentence. `LAH` could not be read from this session (permission denied), so it is unverified.
**Not in this fix:** shipping neutral entry files (the `starter-install` followup) and the bootstrap stub that the docs still describe.

## Build (2026-11-27)

- **Regression red, then green:** the new test "an install that kept the bundle's own project specifics fails" failed with only the `BUNDLE_IDENTITY` constant added (29 pass, 1 fail), then passed after the check: 30 of 30 on Node and Bun.
- **Reproduction re-run:** the same `git archive` install copy now reports "FAIL AGENTS.md" and "FAIL CLAUDE.md: project specifics are still this bundle's own". This checkout still reports READY.
- **Fixtures that relied on the bug:** both fixtures in `installed-upgrade.test.mts` (the b26b45b upgrade and the fresh setup) copied the bundle's own entry files and expected the validator to pass. A shared helper now replaces the identity sentence, as a completed setup would, and asserts the sentence was present first: 3 of 3 pass.
- **Instructions:** `SETUP.md` Step 4 and the `/setup` skill now say to **replace** the copied `## Project specifics` section. The Cursor mirror body is identical. `ai-framework/docs/setup-validator.md` names the new failure.
- **Verifier:** `node ai-framework/hooks/scripts/pre-ship-verify.mts` exited 0, with 2,461 tests (2,458 pass, 3 skipped, 0 fail).
- **Limit:** the check matches one fixed sentence. A reworded copy, or one with the sentence removed but the rest of the bundle's specifics kept, would pass. A test pins the sentence to the bundle's own `AGENTS.md` and `CLAUDE.md`, so a rewording in the bundle fails loudly.

## Revision before ship (2026-11-27, owner: "fix all errors prior to ship")

The owner chose Revise at the audit gate. This widens the bug fix past its roughly 50-line guideline.

- **Guarded reads:** every project text file `setup-validator.mts` reads (the three context files, `AGENTS.md`, `CLAUDE.md`, `SETUP.md`, `.project/status.md`) now goes through `readProjectText`: one plain UTF-8 file of at most 1 MiB inside the project; links, FIFOs and oversized files are refused. A refused `SETUP.md` keeps the install check on.
- **No raw text in output:** `.cursor`, knowledge graph, doctor, parse-check and unexpected-error failures now print fixed text and an error code. Control characters in names and details are replaced. `entry-import.mts` no longer echoes a rejected import line.
- **Behavior change:** a project whose `AGENTS.md` or `CLAUDE.md` is a symbolic or hard link now fails setup validation.
- **Red then green:** 10 new or updated assertions failed on the previous code (the FIFO case hung until its 20-second timeout), then 55 of 55 passed on Node and Bun across the three affected files. The verifier exited 0: 2,469 tests, 2,466 pass, 3 skipped, 0 fail.
- **Still open:** `resolveClaudeEntry` reads the imported `AGENTS.md` after its own type, containment and size checks, without a pinned descriptor.

- **Review rounds 3 and 4:** fixed bundle-script dispatch, shared bundle detection with the doctor, install-safe bundle tests, a linear placeholder scan, validated child counts and safe child-end codes. `entry-import.mts` and `workflow-doctor.mts` joined the changed files. Final verifier: 2,474 tests, 2,471 pass, 3 skipped, 0 fail. See [audit.md](audit.md).
- **Closed 2026-11-27:** shipped in v2.59.3.
