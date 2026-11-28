# Independent check: **not passed**

25 of 26 answered fully (one of them weakly); **Q15 is a miss**. The rule is that any miss blocks the item.

- Question writer: claude, saw only the five originals, ran before the author.
- Answerer: a different fresh claude worker, saw only the compact text and the questions without expected answers or source names.
- All 26 quotes were checked by script to be exact substrings of the compact text. The questions file was unchanged since frozen.
- Isolation: separate scratch folders and brief rules, **not a barrier**. Transcripts showed no read of repository knowledge, the other pilot folders or the private folder. The author's transcript lists some repository paths only as `git status` lines; none of their content appears.
- Grader: the coordinator, who also set the pilot up. A lenient grader could pass Q15.
- Retry with a new answerer: **not run**. The load test had already failed, and the missing words are not in the text for any answerer to find.

| id | grade | note |
|----|-------|------|
| Q01 | pass |  |
| Q02 | pass |  |
| Q03 | pass |  |
| Q04 | pass |  |
| Q05 | pass |  |
| Q06 | pass |  |
| Q07 | pass |  |
| Q08 | pass |  |
| Q09 | pass |  |
| Q10 | pass |  |
| Q11 | pass |  |
| Q12 | pass |  |
| Q13 | pass |  |
| Q14 | pass |  |
| Q15 | miss | The contrast "not a fabricated journal" is gone: the compact text says only to test with real SIGKILL subprocesses. A limit on how to test was dropped. |
| Q16 | pass |  |
| Q17 | pass |  |
| Q18 | pass |  |
| Q19 | pass |  |
| Q20 | pass, weak | Both recovery benefits and both limits are present; the framing of extraction as a real cost is gone. |
| Q21 | pass |  |
| Q22 | pass |  |
| Q23 | pass |  |
| Q24 | pass |  |
| Q25 | pass |  |
| Q26 | pass |  |

## Answers

**Q01** For bulk eligible for a single judgment, use one folder-prefix (group) entry. This avoids the growing ledger and the recurring ceiling that come with raising the per-entry cap.

> For bulk eligible for a single judgment, one folder-prefix entry avoids the growing ledger and recurring ceiling of raising the per-entry cap.

**Q02** A member count plus a tree hash of every member's path and content hash in fixed order. The tool computes them and the gate recomputes them. Additions, removals, renames and edits change the hash.

> The tool computes and the gate recomputes the member count and a tree hash of every member’s path and content hash in fixed order. Additions, removals, renames and edits change the hash.

**Q03** Refuse empty groups, overlap and unaccounted files. Keep a separate total-file bound, and use one pure coverage function in both the writer and the remover.

> Reject empty groups, overlap and unaccounted files. Keep a separate total-file bound and use one pure coverage function in the writer and remover.

**Q04** They caught ignored counts or tree hashes, missing member hashes, partial folder hashing, allowed overlap or unaccounted files, and stale group hashes accepted at commit. The surviving mutation dropped the count prefix from the hash; the redundant prefix was removed and the separate count check stays.

> Mutation tests caught ignored counts or tree hashes, missing member hashes, partial folder hashing, allowed overlap or unaccounted files, and stale group hashes accepted at commit. Dropping the count prefix from the hash survived and the redundant prefix was removed. The separate count check stays.

**Q05** No. Where each file's loss needs its own judgment, list each file separately. Count and tree hash only prove that group membership and content stayed intact; each file still needs a recorded judgment. A single group entry is for bulk eligible for a single judgment.

> Where each file’s loss needs its own judgment, such as decisions and approvals, list each file separately. Count and tree hash prove group membership and content stayed intact. Each file still needs a recorded judgment.

**Q06** Stop and split the pitch folder.

> Stop and split the pitch folder if the entry cap is reached.

**Q07** Inventory tests and tools that use its source paths, as well as prose links. Move required full assets to durable ownership, verify complete bytes against an approved original, update the consumer and run its unchanged regression.

> Before retiring a pitch, inventory tests and tools using its source paths as well as prose links. Move required full assets to durable ownership, verify complete bytes against an approved original, update the consumer and run its unchanged regression.

**Q08** Skipping the assertion or inventing a successful run is not acceptable, because either would lose the historical result. A narrative summary also could not supply the machine-readable matrix.

> A narrative summary could not supply it. Skipping the assertion or inventing a successful run would lose the historical result.

**Q09** No: keep ordinary tests independent of recovery archives. Before restoring an old path, check recorded deletion intent.

> Keep ordinary tests independent of recovery archives. Check recorded deletion intent before restoring an old path.

**Q10** It contains a machine-readable matrix of 72 runs, 12 seeded bad rows and a Cursor not-run row. The exact 36,920 UTF-8 bytes were restored from the verified, approval-gated source cache; raw SHA-256 868e76e9eace40c14f8014e18a16a8fa5b702de13e5489ebcc29c4e7944fc24a and the original normalized source hash matched approved proof. Unchanged assertions validate the historical `Claim: blocked`; the repair gave no new live-model result.

> Its machine-readable matrix had 72 runs, 12 seeded bad rows and a Cursor not-run row. A narrative summary could not supply it. Skipping the assertion or inventing a successful run would lose the historical result.

The repair restored the exact 36,920 UTF-8 bytes from the verified, approval-gated source cache to `.project/records/legacy-upgrades/state-ai-authoring-live-runs.md` and repointed only `LIVE_RECORD` in `state-fragment-dataset.test.mts`. Raw SHA-256 `868e76e9eace40c14f8014e18a16a8fa5b702de13e5489ebcc29c4e7944fc24a` and the original normalized source hash matched approved proof. Unchanged assertions validate the preserved historical `Claim: blocked`. The repair supplied no new live-model result.

**Q11** The cause is unknown: it is an independent, unconfirmed incident, and later passes leave it unresolved. Bounded parent diagnostics are tracked as FRLE-D1 (the text names no person as owner).

> The final-verification child failure during repair remains an independent, unconfirmed incident. Later passes leave the cause unresolved. Bounded parent diagnostics are tracked as FRLE-D1.

**Q12** Yes. `pitch-compaction` is the sole human-approved exception to the ban on rewriting `.project/pitches/`.

> `pitch-compaction` is the sole human-approved exception to the ban on rewriting `.project/pitches/`.

**Q13** Every mutation needs `--apply`. Deletion requires manual approval, a verified archive, a complete ledger and unchanged source.

> Every mutation needs `--apply`. Deletion requires manual approval, a verified archive, a complete ledger, and unchanged source.

**Q14** Each gap needs explicit human acceptance, recorded via `commit-ledger --accept-gap SECTION=REASON`, and `remove` rechecks it. This was needed because a ledger-existence check let all sections be declared gaps and pass at 0% coverage in a live reproduction; audit reversed it.

> Record explicit human acceptance for each gap via `commit-ledger --accept-gap SECTION=REASON`. `remove` rechecks it. A ledger-existence check let all sections be declared gaps and pass at 0% coverage in a live reproduction. Audit reversed it

**Q15** `pitch-archive.js` reuses the audited `transact`/`recover` from `skill-registry.js` with `{roots, state}`. Test interruption with real `SIGKILL` subprocesses.

> `pitch-archive.js` reuses audited `skill-registry.js` `transact`/`recover` with `{roots, state}`. Test interruption with real `SIGKILL` subprocesses.

**Q16** Inside `archive`, `remove` and `restore`, so that direct imports are covered.

> Guard interrupted transactions inside `archive`, `remove` and `restore` so direct imports are covered.

**Q17** `remove` leaves the emptied directory and treats either an empty or a missing directory as already removed. `inventory` treats an empty directory as compacted when its slug appears in `done-work.md`; it reports non-slug directories as preserved and continues.

> `remove` leaves the emptied directory and detects either an empty or missing directory as already removed. `inventory` treats an empty directory as compacted when its slug appears in `done-work.md`, and reports non-slug directories as preserved while continuing.

**Q18** Archive lookup is anchored to the exact timestamp shape; `verify` rejects another slug's manifest; `restore` requires a verified archive and checks containment before each write.

> Anchor archive lookup to the exact timestamp shape. `verify` rejects another slug’s manifest ([[bare-prefix-match-crosses-entities]]). `restore` requires a verified archive and checks containment before each write.

**Q19** A real, nonempty, in-project file outside the pitch being deleted.

> Ledger destinations must be real, nonempty in-project files outside the pitch being deleted.

**Q20** The stated limit is that the ledger destination check is only mechanical: humans or agents still do the extraction, and every skipped section is a named decision. On the recovery side, removal is recoverable via the archive and Git history. The text gives no explicit comparison of downsides against that benefit.

> This check is mechanical. Humans or agents still do the extraction, and every skipped section is a named decision.

**Q21** No hand edits. done-work.md is generated with one section per pitch, and a rerun replaces that section in place.

> Generate `done-work.md` with one section per pitch and replace it in place on reruns. Keep hand edits out.

**Q22** Trace the change to the shared reader through its writers.

> Trace changes to shared readers through their writers

**Q23** To keep the playbook coherent. It did not leave C2 unverified: C2 scripts and tests were built and verified separately.

> To keep the playbook coherent, C1 wrote all of `.claude/skills/pitch-compress/SKILL.md`, including C2 steps. C2 scripts and tests were built and verified separately.

**Q24** The connected-memory-consolidation pitch held 242 files (6.1 MB), drew 74 incoming links and hit commit-ledger's then-limit of 200 files outside covered sections. About 185 were campaign staging (regenerable unresolved drafts, proposals, approved inputs of unwrapped proposals, and supplements, 46 of 47 byte-identical to published copies), another 27 were reviewer prompts and results, five run files copied the full 95 KB log, and each of 11 batches left 4–6 run files. The ledger lacked group coverage.

> The connected-memory-consolidation pitch could not use the compaction flow it built. It held 242 files (6.1 MB), drew 74 incoming links, and hit `commit-ledger`’s then-limit of 200 files outside covered sections. About 185 were campaign staging (unresolved drafts `prepare` regenerates, proposals, approved inputs consisting of unwrapped proposals, and supplements, 46 of 47 byte-identical to published copies). Another 27 were reviewer prompts and results. Five run files copied the full 95 KB log, and each of 11 batches left 4–6 run files. No step consumed, merged or deleted the buildup. The ledger lacked group coverage.

**Q25** Version 2.49.0 added group entries and a 2,000-file bound. The pitch-compress and ship playbooks now specify what to keep, where to stage, and that a shared log gets one snapshot.

> Version 2.49.0 added group entries and a 2,000-file bound. The pitch-compress and ship playbooks specify what to keep, where to stage, and that a shared log gets one snapshot.

**Q26** Classify it as durable, derivable or disposable at creation. Stage derivable and disposable files where the batch result deletes them.

> Classify outputs written into a pitch folder as durable, derivable or disposable at creation. Stage derivable and disposable files where the batch result deletes them.

