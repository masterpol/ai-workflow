# Code review — install inherits bundle identity

## Findings

1. **High / ai-framework/scripts/setup-validator.mts:140 / Planned fix, .project/pitches/fix-install-inherits-bundle-identity/log.md:5.** The predicate ignores the `install` flag computed on line 139. The actual bundle retains the identity text in both entry files by design. When its root contains `SETUP.md`, a completed bundle therefore reports inherited specifics for both files and exits 1 instead of reporting READY. The install half of the regression reaches and passes both failure-message assertions before the bundle half fails. Use the computed flag in the shared predicate so both entry checks respect the same contract.

   Commands and relevant output:

   ```text
   node --experimental-strip-types --test --test-name-pattern='kept the bundle|entry files still carry|READY run|bootstrap CLAUDE' ai-framework/scripts/setup-validator.test.mts
   not ok 3 - an install that kept the bundle's own project specifics fails; the bundle checkout itself passes
   1 !== 0
   expected: 0
   actual: 1
   ai-framework/scripts/setup-validator.test.mts:193:10
   # pass 3
   # fail 1
   exit 1

   bun test --test-name-pattern='kept the bundle|entry files still carry|READY run|bootstrap CLAUDE' ai-framework/scripts/setup-validator.test.mts
   (fail) an install that kept the bundle's own project specifics fails; the bundle checkout itself passes
   1 !== 0
   ai-framework/scripts/setup-validator.test.mts:193:10
   3 pass
   26 filtered out
   1 fail
   exit 1
   ```

2. **Low / ai-framework/scripts/installed-upgrade.test.mts:9 and ai-framework/docs/setup-validator.md:8 / Boundaries, .project/pitches/fix-install-inherits-bundle-identity/log.md:7.** The patch contains two files beyond the explicit allowlist. The Build section records both additions, and the fixture change serves the acceptance tests. The expanded file list still differs from the written boundary. Reconcile the boundary with these additions before sign-off. The concrete review failure is that a file-set check against the agreed five paths rejects this seven-path patch.

   ```text
   git apply --stat CHANGE.patch
    ai-framework/docs/setup-validator.md            |    4 +++-
    ai-framework/scripts/installed-upgrade.test.mts |   11 +++++++++++
    7 files changed, 58 insertions(+), 7 deletions(-)
   ```

## Checklist

| Item | Result |
| --- | --- |
| Patch coverage | Reviewed all 13 hunks across the seven files. `git apply --check --reverse CHANGE.patch` exited 0, confirming the scratch source matched the patched side. |
| Planned fix and boundaries | The install rejection works in the focused fixture. The bundle exemption fails on Node and Bun. The two extra paths are recorded in Build and absent from Boundaries. `cmp AGENTS.md CLAUDE.md` exited 0, and neither root entry file appears in the diff. |
| Validator implementation | Read the complete `makeValidator` closure, including the full `checkEntryFiles` function, the existence and reporting helpers, and the surrounding validation and exit paths. The AGENTS placeholder check and the CLAUDE bootstrap, full mirror, append-only merge, and invalid-import branches remain present. The unused flag breaks both identity branches. |
| Effective entry files | Read the full `entry-import.mts`. The valid native import concatenates CLAUDE.md and AGENTS.md before the identity check. Invalid imports still return their existing diagnostic first. The focused test passed its stubbed invalid-import check. A live filesystem import fixture was unverified. |
| Workflow doctor | Read the root classification, presence and text checks in `workflow-doctor.mts`. The doctor checks root `SETUP.md` for its bundle-only checks and does not enforce the entry identity. A doctor pass cannot prevent the validator's independent failure. Full doctor run unverified. |
| Bundle sync and other callers | Reviewed `bundle-sync.mts` flagged-file comparison and entry-file next steps. Entry files are flagged for manual reconciliation, and valid CLAUDE imports are resolved for caveman guidance. Sync has no automatic repair for this failure. The Orca phase command and pre-ship verifier invoke the validator, so its nonzero result is observable there. The runtime migration's entry handling targets script suffixes and leaves the identity sentence intact. End-to-end calls unverified. |
| Validator regression and phrase pin | Read both full test callbacks and their fixture helpers. The pin passes for both actual entry files. The focused run passed READY for normal project text and passed bootstrap and invalid-import checks. The combined install and bundle test fails at the bundle assertion on both runtimes. |
| Fresh install and historical upgrade fixtures | Read the full affected helper, baseline function and acceptance callbacks. The entry files are copied before the shared helper changes their marker. The helper intentionally replaces just the marker, so these fixtures demonstrate absence of the marker while retaining the wider install and upgrade assertions. Historical and full fresh-copy integration tests unverified. |
| Setup instructions and mirrors | Reviewed Step 1 and all of Step 4, plus the canonical and Cursor skill context surrounding the replacements. The new setup directions say to replace Project specifics and preserve a valid import. The docs describe the planned exemption, which the current predicate fails to enforce. `cmp .claude/skills/setup/SKILL.md .cursor/skills/setup/SKILL.md` exited 0. The root files' older wording and bootstrap document mismatch were already outside the pitch boundary. |
| Coding standards and architectural boundaries | The new predicate is short and typed. It introduces no new dependency, application layer, deep import, or catch. The affected leaf functions remain under 50 lines. The validator and its enclosing function already exceed the generic size guidelines. No source refactor was performed during review. The exact-sentence limitation recorded in Build remains. |

## Attempts and limits

- `cat .claude/agents/code-reviewer.md` returned `No such file or directory`. The review used the supplied role brief and the two available rule files. The scratch copy also lacked the local caveman and Orca CLI skill files at the checked locations. The completion message uses the supplied Orca CLI contract and requested brevity.
- The full suite and the install and upgrade integrations would create fixtures on disk. The scratch copy also lacks the Git history required by the historical test. Those results and the Build section's full pre-ship result were unverified. The focused runs used only in-memory tests and read-only phrase checks, and independently contradict the bundle-pass claim for this patch.
