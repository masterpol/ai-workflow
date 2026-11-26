# Check questions (frozen before any compact text existed)

SHA-256 of the writer's file: `6209330636e47517b7d8b5e0b13c4f737cb357d03bde96f9e6d806423afa05d6`

## Q01 (rule, a-bounded-ledger-needs-a-group-entry-bound-by-a-tree-hash)
A destructive gate must prove every file it will delete was judged, but a hard cap on per-file entries makes large folders uncompactable. What should you do, and why not just raise the cap?

Expected: Let one group entry cover a folder prefix, bound by a tree hash, instead of a larger cap. Raising the cap only moves the wall and grows the ledger.

## Q02 (rule, a-bounded-ledger-needs-a-group-entry-bound-by-a-tree-hash)
What must bind a folder group entry, who computes it, and which changes must it detect?

Expected: The member count and a hash over every member's path and hash in a fixed order. The tool computes it and the gate recomputes it. Any add, drop, rename or edit changes the hash.

## Q03 (limit, a-bounded-ledger-needs-a-group-entry-bound-by-a-tree-hash)
When using group entries, what must be refused, what limit must still apply, and how do you keep the writer and the remover agreeing on coverage?

Expected: Refuse overlap (a file belongs to only one entry) and a group that matches nothing. Keep a separate bound on total files. Put the coverage rule in one pure function used by both the writer and the remover.

## Q04 (evidence, a-bounded-ledger-needs-a-group-entry-bound-by-a-tree-hash)
Which faults did mutation checks show the group-entry protections catch, and what happened with the one mutation that survived?

Expected: Caught: ignoring the count, ignoring the tree hash, hashing without member hashes, dropping the overlap check, ignoring unaccounted files, accepting a stale group hash at commit, hashing only part of the folder. Hashing without a count prefix survived, showing the prefix inside the hash was redundant, so it was removed.

## Q05 (conflict, a-ledger-for-judged-files-lists-every-file)
A folder holds files whose loss matters one by one, such as decisions and approval records. May a count-and-tree-hash group entry cover them, and why? How does this differ from the case of ordinary bulk files?

Expected: No. Give every file its own ledger entry: a hash proves the set did not change, not that anyone judged each member. Folder groups are for bulk, not for files a person must judge individually.

## Q06 (exception, a-ledger-for-judged-files-lists-every-file)
If files that must each be judged exceed the ledger's entry cap, what do you do?

Expected: Stop and split the pitch folder. Do not fall back to a group entry.

## Q07 (rule, live-test-evidence-outlived-its-pitch-path)
What must you inventory and do before retiring or compacting a pitch directory so that tests and tools keep working?

Expected: Inventory test and tool consumers of its source paths, not only prose links. Move required full assets to durable ownership, prove complete bytes against an approved original, update the consumer, and run its unchanged regression.

## Q08 (rule, live-test-evidence-outlived-its-pitch-path)
A test fails because compaction removed a machine-readable evidence file it reads, and only a narrative summary remains. Which fixes are not acceptable, and why?

Expected: A summary, a skipped assertion or a newly invented successful run cannot replace the input. The summary does not preserve the complete data the consumer needs. Restore the exact original bytes from a verified, approval-gated source to a durable location, verify hashes against the approved proof, repoint the consumer and keep its assertions unchanged. The root problem was a test input kept in a removable pitch file.

## Q09 (limit, live-test-evidence-outlived-its-pitch-path)
May ordinary tests read recovery archives, and what should you check before restoring any old path?

Expected: No, ordinary tests must not read recovery archives. Check the recorded deletion intent before restoring any old path.

## Q10 (evidence, live-test-evidence-outlived-its-pitch-path)
For the retired live-run evidence that was restored, what does it contain, how was the restoration verified, and what claim does it support?

Expected: 72 runs, 12 seeded bad rows and a Cursor not-run row. Exactly 36,920 original UTF-8 bytes restored from the approval-gated verified source cache to .project/records/legacy-upgrades/state-ai-authoring-live-runs.md; only LIVE_RECORD in state-fragment-dataset.test.mts was repointed. Raw SHA-256 (868e76e9...) and original normalized source hash match the approved proof. The computed historical claim is blocked; this preserves old evidence and is not a new live-model result.

## Q11 (unverified, live-test-evidence-outlived-its-pitch-path)
What is known about the cause of the final-verification child failure seen during the evidence-path repair, and who tracks the follow-up?

Expected: It is an independent, unconfirmed incident; later passing runs do not establish its cause. Bounded parent diagnostics are tracked as FRLE-D1, and existing timing-under-load work keeps its own owner.

## Q12 (exception, pitch-compaction-gate-and-recovery-design)
Pitch records are normally never rewritten. Is there any exception, and under what condition?

Expected: Pitch compaction is the single exception, and it is human-approved.

## Q13 (rule, pitch-compaction-gate-and-recovery-design)
What is required before pitch compaction mutates or deletes anything?

Expected: Every mutating step needs --apply. Deletion needs a verified archive, a complete ledger, an unchanged source and a human gate. Nothing is automatic.

## Q14 (rule, pitch-compaction-gate-and-recovery-design)
How are gaps (skipped sections) in the ledger accepted and enforced, and what failure made this necessary?

Expected: Each gap needs its own explicit human acceptance (commit-ledger --accept-gap SECTION=REASON), recorded in the ledger and re-checked by remove. An earlier deviation reduced this to 'a ledger exists', letting a ledger declare every section a gap and pass at coverage 0 (reproduced live); reversed at audit.

## Q15 (rule, pitch-compaction-gate-and-recovery-design)
What transaction machinery should pitch archiving use, and how must interruption be tested?

Expected: Reuse the audited machinery: pitch-archive.js runs on skill-registry.js transact/recover with a {roots, state} context. Interruption is tested with real SIGKILL subprocesses, not a fabricated journal.

## Q16 (rule, pitch-compaction-gate-and-recovery-design)
Where must the interrupted-transaction guard live, and why?

Expected: Inside archive, remove and restore themselves, not only in the CLI wrapper, so a direct import cannot bypass it.

## Q17 (rule, pitch-compaction-gate-and-recovery-design)
After removal, what remains of the pitch directory, and how do remove and inventory treat missing, emptied or oddly named directories?

Expected: remove leaves the emptied directory; its already-removed detection handles both missing and empty. inventory treats an empty directory whose slug is in done-work.md as compacted, and reports a non-slug directory name as preserved instead of throwing and hiding the rest.

## Q18 (rule, pitch-compaction-gate-and-recovery-design)
What checks protect archive lookup, verification and restore?

Expected: Lookup is anchored to the exact timestamp shape (not a bare prefix that could match another entity); verify rejects a manifest for another slug; restore refuses an unverified archive and checks containment before each write.

## Q19 (rule, pitch-compaction-gate-and-recovery-design)
What is a valid ledger destination for extracted content?

Expected: A real, nonempty, in-project file outside the pitch being deleted.

## Q20 (limit, pitch-compaction-gate-and-recovery-design)
What are the downsides or limits of the compaction design compared with its recovery benefit?

Expected: Removal is recoverable (archive plus git history) and every skipped section is a named decision, but extraction is real human/agent work and the ledger's destination check is only mechanical.

## Q21 (rule, pitch-compaction-gate-and-recovery-design)
May done-work.md be edited by hand, and what happens to a pitch's section on a rerun?

Expected: No. It is generated, one section per pitch, replaced in place on rerun.

## Q22 (rule, pitch-compaction-gate-and-recovery-design)
You change a shared reader used by the compaction scripts. What must you check?

Expected: Trace the change through the writers that use it, since hardening a shared reader once made its writer destructive.

## Q23 (evidence, pitch-compaction-gate-and-recovery-design)
Why was the compaction playbook written whole in the first scope (C1), including C2 steps, and did that mean C2 code went unverified?

Expected: One coherent document should not be split across two edits. C2's scripts and tests were still built and verified separately.

## Q24 (evidence, pitch-folders-accumulate-staging-nothing-consumes)
What made a pitch folder impossible to compact: its scale, the limit it hit and what the files were?

Expected: 242 files (6.1 MB of staging, prompts and copies). commit-ledger refuses more than 200 files outside covered sections; 74 links pointed into the folder. About 185 were per-pitch campaign staging (regenerable unresolved draft, proposal, approved input that was the unwrapped proposal, supplement identical to published copy in 46 of 47), 27 were reviewer prompts and results; a 95 KB log was copied into five run files and each of 11 batches left 4-6 run files. Nothing consumed, merged or deleted them, and the ledger could not account for a folder as a unit.

## Q25 (limit, pitch-folders-accumulate-staging-nothing-consumes)
What capability and bounds resolved the uncompactable folder, and what did the playbooks start saying?

Expected: Version 2.49.0 added group entries (folder prefix bound by count and tree hash) and a 2000-file bound. The pitch-compress and ship playbooks now say what to keep, where to stage, and to snapshot a shared log only once.

## Q26 (rule, pitch-folders-accumulate-staging-nothing-consumes)
When a flow writes a file into a pitch folder, how must it be classified, when, and where do non-durable files go?

Expected: At creation, classify it as durable, derivable or disposable. Derivable and disposable files go in a staging path that the batch result deletes.

