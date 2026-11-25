# Audit cycle 1 — security-reviewer

Model: GPT-6-based Codex worker (the runtime does not expose a more specific model identifier). Checklist walked: yes, security.md section 9 and the three requested ownership/symlink patterns; incomplete items are explicitly marked unverified below. Cross-file interactions reviewed: yes, bundle-sync classification, baseline lookup, registry exclusions, removal and directory cleanup; shared phase mapping, Claude/Codex startup hooks and metrics ingestion.

Scope: uncommitted rename to `ship-pitch`, with `ship` retained as phase data. I read the pitch and plan including the deviations log, inspected `git status --short`, saved `git diff HEAD` to the scratch directory, reviewed the executable changes and untracked mapping/tests/adapters, and compared the canonical and Cursor skill copies. All execution and fixtures were under `/private/tmp/rsc-audit-security-reviewer/`; no implementation files were changed.

## Findings

| ID | Severity (must-fix/should-fix/nit) | file:line | defect | failure scenario with the command you ran and its output | verified (yes/no) |
|---|---|---|---|---|---|
| SEC-1 | must-fix | ai-framework/scripts/bundle-sync.mts:615 | Automatic adapter removal trusts an earlier hash and a path-only symlink check. It neither rehashes immediately before removal nor pins the hashed descriptor and ancestor identities. | Ran `node /private/tmp/rsc-audit-security-reviewer/probe.mts`. In `hash-race`, an injected `readBytesSync` reads the baseline bytes and then writes `user customized after hash` before returning them: output is `{"name":"hash-race","status":0,"oldExists":false}`. The customized file is deleted by `--apply` without `--prune`. In `guard-parent-race`, injected `lstat` returns a real parent directory's stat, then moves that directory aside and replaces it with a symlink to a scratch victim directory before the guard continues: output is `{"name":"guard-parent-race","status":0,"oldExists":false}`. A subsequent Python existence check prints `outside-victim-exists=False` and `original-adapter-exists=True`: the outside user skill was deleted while the hashed adapter was retained. | yes |
| SEC-2 | must-fix | ai-framework/scripts/bundle-sync.mts:413 | Cleanup checks directory contents and then recursively removes the directory. Any file appearing after the listing is deleted without an ownership check. The new automatic removal reaches this pre-existing unsafe helper without explicit pruning. | Ran `node /private/tmp/rsc-audit-security-reviewer/probe.mts`. In `parent-race`, injected `readdir` obtains an empty listing, creates `late-user-file.txt` containing `valuable user data`, and returns that listing. Output is `{"name":"parent-race","status":0,"lateUserExists":false}`: `--apply` recursively deleted the new user file. A stable `notes.txt` control is preserved (`parent-other-file`, `extraExists:true`). A directory containing only an ignored `.DS_Store` is also recursively removed (`parent-metadata`, `metadataExists:false`). | yes |
| SEC-3 | must-fix | ai-framework/scripts/bundle-sync.mts:613 | A retired pathname plus equality with arbitrary baseline data is treated as proof that the file belongs to the bundle. There is no verification against known shipped adapter contents or evidence that the source actually performed this rename. | Ran `node /private/tmp/rsc-audit-security-reviewer/probe.mts`. `forged-base-own-skill` writes an unrelated local skill and a `.project/.bundle-sync.json` entry hashing those exact unrelated bytes. Output is `{"name":"forged-base-own-skill","status":0,"oldExists":false}`. `arbitrary-base-own-skill` instead commits those unrelated bytes in a temporary source repository and passes that commit through `--base-ref`; the same deletion occurs. `partial-source` supplies only `ai-framework/workflow/overview.md`, sufficient to pass source validation, and a recorded baseline: output is `{"name":"partial-source","status":0,"oldExists":false}`. Thus merely omitting the old path from an incomplete source can trigger removal without `--prune`, and a forged baseline can authorize deletion of customized content. | yes |

Recommended corrections:

- SEC-1: use the existing bounded descriptor-reader approach for retired adapters, retain the descriptor's device/inode and exact digest, pin ancestor identities, and revalidate bytes and identities immediately before unlinking. Refuse changes or symlinks. Add injected hash-time and guard-time substitutions, including a same-byte replacement inode, as regression tests. Document the residual path-based unlink window.
- SEC-2: remove only an actually empty directory with non-recursive `rmdir`, fail safely on `ENOTEMPTY`, and validate directory identities and symlink status before cleanup. Never use recursive removal for supposedly empty parents.
- SEC-3: restrict implicit retirement to verifiable bundle-owned adapter versions using a trusted inventory of shipped hashes or equivalent provenance; require positive rename evidence from a complete source. Treat missing, inconsistent or untrusted baseline evidence as unverified and leave the file for explicit review. A user-controlled receipt alone cannot establish ownership.

## Probe coverage and controls

The reproduction program imports the copied production `main`, uses real filesystem operations and temporary Git repositories, and injects only the documented race points through RuntimeDeps. It invokes the equivalent of `bundle-sync --source <temporary source> --apply --json`, without `--prune`. The fixture output and exact injected operations remain in `probe.mts` and `probe-output.jsonl` under the scratch directory.

| Requested case | Observed result |
|---|---|
| Unmodified retired adapter | Removed on apply, as the amended plan requires. |
| Whitespace or CRLF customization | Both preserved and classified modified. Hashing is byte-sensitive. |
| Case-only directory rename | Preserved and classified unverified; the temporary volume is case-insensitive, so existence checks for both spellings are true. |
| Pre-existing symlinked adapter or immediate parent | Both skipped by traversal and preserved; neither victim was deleted. The later parent-substitution failure is SEC-1. |
| Missing baseline | Preserved, classified unverified. |
| Invalid/nonexistent base ref | Preserved, classified modified with a null base digest. An unrelated but valid baseline is covered in SEC-3. |
| Forged baseline / unrelated own skill | Deleted; SEC-3. |
| Partial source merely lacking the adapter | Accepted and deletion performed; SEC-3. |
| Valid registry-managed skill named ship | Preserved and excluded from removed entries even with a matching baseline. |
| Dry run | Old adapter preserved. |
| Parent contains a stable unrelated file | Stable file preserved. Late arrival is deleted; SEC-2. |
| Hash-to-remove gap | Customized replacement deleted; SEC-1. |
| Ancestor changes during deletion guard | Outside user file deleted; SEC-1. |

## Hooks and mapping

`node /private/tmp/rsc-audit-security-reviewer/hooks-probe.mts` exercised the copied startup hooks and metrics resolver. `ship-pitch` maps to `ship`; `ship`, `__proto__`, `constructor`, `toString`, path-like command names and semicolon-suffixed names are ignored with no subprocess probes. Arguments containing `--phase audit` do not change the mapped metrics phase. Source inspection confirms startup arguments remain data passed to the readiness decision, rather than being appended to an executable command. Metrics retain the prior case-normalization behavior. No command-to-phase injection or prototype-key finding was reproduced.

Targeted existing tests, run only from the copied code with `TMPDIR=/private/tmp/rsc-audit-security-reviewer`:

- `node --test --test-name-pattern='old ship|without.*prune|registry-owned skill' <scratch>/code/ai-framework/scripts/bundle-sync.test.mts`: 4 passed, 0 failed.
- `node --test --test-name-pattern='ship-pitch' <scratch>/code/ai-framework/hooks/scripts/orca-start-hook.test.mts <scratch>/code/ai-framework/hooks/scripts/orca-start-codex-hook.test.mts <scratch>/code/ai-framework/hooks/scripts/token-consumption.test.mts`: 4 passed, 0 failed. These include actual decision-phase assertions for Skill/slash/dollar invocation forms and joining old/new metrics in phase ship.
- `node --test <scratch>/code/ai-framework/scripts/phase-commands.test.mts`: 2 passed, 0 failed.

These passing tests do not exercise the destructive interleavings or forged ownership above.

## Attempts that did not work and limits

The first scratch probe failed with `ERR_MODULE_NOT_FOUND` because the copied scripts statically import `ai-framework/integrations/skill-vendors.json`. I copied the integrations directory into the scratch code tree and reran successfully. Repeated in-process CLI calls emitted a MaxListenersExceededWarning from repeated stdout error handlers; the individual calls still returned and produced the recorded results. Pre-existing symlinks, whitespace/CRLF changes, prototype command keys, an invalid base ref, registry ownership and dry-run probes did not bypass their respective protections.

The repository stack context specifies no core package dependencies and no configured lint command, so no core package-manager audit or security linter applies. An independent external vulnerability audit of the unchanged OpenCode plugin dependencies is unverified. FIFO/non-regular and oversized input probes, permission-denied baselines, full-suite execution, Bun execution, case-sensitive-volume behavior and exhaustive mutation testing are unverified. The general fileHash/manifest reader and marker writer remain outside the descriptor-guarded reader used for reports; the confirmed deletion defects above are sufficient to block this change. No secret files were read, and no network calls were needed.

## Security summary

| Tier | Count |
|---|---|
| must-fix | 3 |
| should-fix | 0 |
| acknowledged | 0 |

Checked: section 9 reader/writer/deletion principles against the changed retirement path; descriptor ownership, symlink refusal, parent cleanup and baseline provenance; registry exclusion; command mapping and cross-file metrics behavior; 18 filesystem scenarios and 10 passing existing targeted tests. Cross-file interactions were reviewed.

Unverified: FIFO/non-regular and oversize input probes, permission-denied baselines, external dependency vulnerability audit, full suite, Bun, case-sensitive-volume behavior and exhaustive mutation tests. No claim of a fully clean checklist is made.

Verdict: BLOCK — 3 must-fix findings require resolution.
