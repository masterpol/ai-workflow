# Audit cycle 1 and 2 — toon-machine-data (2026-10-19)

Dispatched cycle 1: code (1, independent: yes) | security (1, independent: yes) | test (1, independent: yes) | eval (1, independent: yes for the enforced cases; live-only cases not run) | cross-pitch (1, independent: no, no canary applies) | ux n/a | i18n n/a.
Dispatched cycle 2 (narrow): security (1, independent: yes) | code (1, independent: yes).
Orca: bypassed by request (`orca=normal`); no Run, no workers. Reviews were native subagents with an explicit model each.

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check. Cycle 2: HEAD unchanged and the only changed paths since the snapshot are the four files the coordinator patched. Cycle 1: scratch copies only; the shared checkout was also edited by the `instruction-compression` session during the audit, so the cycle-1 guard cannot separate reviewer effects from that session's ship records. No reviewer was given the live checkout except cross-pitch (read-only commands).
model: opus (security, both cycles), sonnet (code, test, eval, cross-pitch, cycle 2 code)
cross-file interactions: reviewed
prompt-sha256: 025a779b451b441f2eb41dff122d11b246d0f599faeb3fc7de5e193eba6edd66

Prompt hashes (SHA-256 of the exact text sent): security 025a779b…, code ded36cac…, test 2a97672f…, eval b85e65f5…. The cross-pitch prompt and both cycle-2 prompts were sent but not stored as files, so their hashes are not recorded.

**Canaries (planted in scratch copies; none is a defect of the shipped files):** security cycle 1 removed the symlink check in `data-file.mts` `inspect()` (reported as "missing at :76"); code cycle 1 changed `verdictOf` "mixed" to "smaller" (reported must-fix); test/eval cycle 1 blanked the table row-count check in `toon-data.mts` (reported by both); cycle 2 security replaced the link-based publish with `rename` (reported as the must-fix); cycle 2 code removed the `current.text !== source.text` comparison (reported as a red test). All were refuted against the live files.

## Must-fix (cycle 1)
| ID | Source | File | Issue | verified | Disposition |
|----|--------|------|-------|----------|-------------|
| M1 | security, code, test | toon-data.mts readHeader | table header column check quadratic (20k columns 301 ms, ×4 per doubling) | confirmed by timing in the live repo | fixed: `Set` + index scan; 50k-column test; mutant killed |
| M2 | security, code, test | toon-data.mts scalarToken, data-file.mts writeData | lone surrogate written unquoted, becomes U+FFFD on disk, writer reports "written" | confirmed (`encodeData` output inspected) | fixed: escape lone surrogates; writer judges the decoded bytes; mutants killed (the byte check itself is defense in depth, unreachable today) |
| M3 | security, code, test | toon-convert.mts | `--remove-json` "json changed" check could never fire (both files exist, so the read returned both-present) | confirmed by code reading and an injected-edit test | fixed: pinned `readDataFile` re-read, compare text and value, keep both on any difference; mutants killed |
| M0 | code | toon-convert.mts verdictOf | returns "smaller" when proxies disagree | refuted: live code returns "mixed" (canary) | none |
| M0b | security | data-file.mts:76 | symlink check missing | refuted: live code has it (canary) | none |

## Should-fix (cycle 1, all fixed with a regression test and a killed mutant)
| ID | Source | File | Issue | verified | Disposition |
|----|--------|------|-------|----------|-------------|
| S1 | code | toon-data.mts | DEL accepted by the encoder, refused by the reader | confirmed | fixed (`quote()` escapes U+007F) |
| S2 | code, security | toon-data.mts | `1e999` parsed to Infinity; padded array sizes accepted | confirmed | fixed |
| S3 | security | data-file.mts | short writes ignored | confirmed (injected 5-byte short write) | fixed: write loop, zero-byte write refused |
| S4 | security, test | data-file.mts | check-then-write race: last-instant file, replaced target, swapped directory, converter existence check | confirmed with injected hooks | fixed: re-inspect before publish, link-based publish for new files, `createOnly` |
| S5 | test | toon-data.mts dataEquals | depth limit disagreed with the encoder | confirmed | fixed |
| S6 | security | toon-convert.mts | source and written toon read with unpinned reads | confirmed | fixed: `readDataFile` |
| S7 | test | toon-convert.test.mts | test read a sibling pitch's untracked dataset | confirmed | fixed: only tracked datasets listed |
| S8 | security | data-file.mts | `orca-vendor-orchestration.json` described as gitignored | refuted: `git ls-files` lists it | none |

## Cycle 2 (security + code, narrow)
| ID | Source | File | Issue | verified | Disposition |
|----|--------|------|-------|----------|-------------|
| C1 | security | data-file.mts publish | publish uses rename for new files | refuted: live uses `linkSync` (canary) | none |
| C2 | security | data-file.mts re-inspect | in-place edit of the target not seen (only dev/ino compared) | confirmed | fixed: size and mtime compared; mutant killed |
| C3 | security | toon-convert.mts cleanup | cleanup unlinks a path that may now be another writer's file | confirmed | fixed: `writeData` reports dev/ino, cleanup removes only that inode; mutants killed |
| C4 | code | toon-convert.test.mts | suite red | refuted: live code compares text (canary); live suite 21/21 | none |
| C5 | code | data-file.mts checkJsonValue | JSON depth counted arrays, TOON counts objects only | confirmed | fixed: 32 object levels, looser container cap; boundary test; mutants killed |

## Acknowledged
| ID | Source | Issue | verified |
|----|--------|-------|----------|
| A1 | security | hard links not refused; mode reset to 0644 on replace; no directory fsync | known, deferred |
| A2 | security | integers beyond 2^53 and duplicate keys in JSON text are not detected by the converter (`--remove-json` deletes the original text) | known, deferred |
| A3 | code, security | `parseData` `maxBytes` counts UTF-16 units; `readData` caps real bytes | known |
| A4 | security | `1e-999` reads as 0 (same as JSON.parse) | known |
| A5 | cross-pitch | VERSION, CHANGELOG, status.md, graphify-out shared with `instruction-compression`; merge order: that pitch first, then this one, rebuild graph once | recorded |
| A6 | eval | "every reader" in the dataset and rule text is true only for `data-file.mts` and the converter; no other reader is wired to it | recorded; the rule scopes it to new files |

## Eval gate (AI-prompt scope)
No LLM eval harness and no baseline run exist in this repository, so there are no scores and no regression delta was computed.
The dataset now has 13 cases: 8 are enforced by named repository tests (each cited test was run, and mutations of 4 of them failed as required), 5 are live-only and not run (agent-ingested-new-data-file, host-native-config-stays-json, script-only-file-not-converted, toon-dataset-same-verdict, agent-reads-long-table-field). The 5 live-only cases are unverified model behavior; **residual risk to accept or run later.**

## Author-run checks (not reviews), after the cycle-2 patches
- Mutation harness (`mutate.py`, restores in `finally`, `--test-timeout`): three final runs of 16, 6 and 7 mutants over the cycle-1 and cycle-2 patches. All were killed except `bytesRoundTrip` (unreachable: the encoder already escapes what UTF-8 would change). Two mutants (`recheckDirs`, `recheckAgain`) survived the first run because the code was redundant; the redundant lines were removed and the remaining checks are killed.
- Full Node suite: 1764 tests, 1761 pass, 0 fail, 3 skipped (unrelated: Windows worktree, Bun syntax, `IC_EVAL_REQUIRED`). Bun not run.
- `setup-validator` READY; `workflow-doctor` READY (752 checks, runtime boundary 0 violations); `graphify --check` run after the graph rebuild below.

## Incident
A mutation run was left hanging for 37 minutes by a mutant that removed the stall guard in the write loop (an infinite loop), and was stopped by the owner. No source file stayed mutated (checked by diff against the backup and by a clean run of all three suites). Later mutation runs use a harness that restores in `finally` and applies a per-test timeout.
