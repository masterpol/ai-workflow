# Completion proposal: path safety hardening

Status: draft for impact and revised-contract approval. The original plan and evidence remain intact. This proposal does not mark the original containment promise complete.

## Contract requiring approval

Keep the dependency-free Node runtime. Protect against static symlinks, malformed paths and ancestor replacements observed at the guarded boundaries. Require project directories and their ancestors to be controlled by cooperating users while managed transactions run. Do not promise continuous containment against a hostile process able to rename ancestors between the final check and a pathname operation. The native feasibility spike demonstrated that even a captured directory descriptor can follow an ancestor moved outside the root.

Approval explicitly replaces the stronger continuous-containment promise with this trusted-directory contract. Preserve the original promise as an unresolved stronger-security requirement in the closure record, rather than reporting it fixed.

## Completion scope P2

Additional implementation appetite: five existing files, at most 300 changed implementation/test/documentation lines, plus workflow records. Previously implemented registry guards remain part of final review. Execute sequentially; no implementation subagent because context construction and recovery semantics form one contract.

Files: `ai-framework/scripts/pitch-compress.js`, `pitch-archive.js`, their two test files, and `README.md`.

1. Export one compaction transaction-context constructor from pitch-compress and consume it from pitch-archive. This direction follows the existing import graph and avoids a circular import. Ledger, archive, removal and recovery must all use `.project/compaction` and the same target root.
2. Refuse pending compaction journals before any new ledger write, including direct exported API use. Preserve unrelated pending skill-installer state; do not silently move old journals. Document that legacy ledger journals under `.project/skills` require the installer recovery command.
3. Exercise an interrupted ledger transaction and recover it through pitch-archive. Check original/destination bytes and journal state, not merely return codes. Include symlinked ledger ancestors, interrupted-operation refusal and legacy-journal handling.
4. Document the trusted-directory requirement and the absence of a hostile-directory-race guarantee. Do not weaken existing guards, schema, retention, extraction or deletion approval.

## Impact and verification

Risk: high, because recovery gates file deletion. Direct consumers of pitch-compress include pitch-archive and state-snapshot. The already changed skill-registry serves add-skill, skill-sync, skill-vendors, skill-defaults, browser-runtime, pitch-archive and state-snapshot. No external dependency or process execution is introduced.

Commands required before done:

- `node --test ai-framework/scripts/add-skill.test.js ai-framework/scripts/pitch-compress.test.js ai-framework/scripts/pitch-archive.test.js`
- `node --test ai-framework/scripts/skill-defaults.test.js ai-framework/scripts/skill-sync.test.js ai-framework/scripts/skill-vendors.test.js ai-framework/scripts/state-snapshot.test.js ai-framework/scripts/bundle-sync.test.js`
- Run any browser-runtime test present in the repository.
- In isolated fixtures, a wrong transaction context must fail recovery tests, and weakening an ancestry guard must fail the outside-target preservation test.
- `node ai-framework/scripts/setup-validator.js`, `node ai-framework/scripts/graphify.js --check`, and `git diff --check` must pass.

Independent audit reviews the final source, including the earlier uncommitted registry changes. Record structural changes with the changelog skill. Ship closure retains the original threat-model limitation and requires its normal gate.

## Proposed hill

P2: uphill 0%, pending revised-contract approval. Original S1 remains incomplete until the approved contract and evidence are reconciled at ship.

## Approval and execution — 2026-09-27

User approved this proposal and its impact, then explicitly limited execution to path safety.
P2 is the active approved scope. The trusted-directory boundary supersedes the original
continuous-containment promise; that stronger guarantee remains unresolved and must be
reported at closure. Collector implementation is excluded from this work.

The approved behavior tests are real subprocess interruption/recovery and existing deterministic
ancestor-swap/symlink refusal fixtures, with in-memory mutation checks. Historical pitch and
native-spike evidence remains unchanged. A pending installer journal conservatively blocks
compaction regardless of whether it belongs to an older ledger or a skill operation; neither
journal contents nor unrelated installer data are modified by that refusal.
