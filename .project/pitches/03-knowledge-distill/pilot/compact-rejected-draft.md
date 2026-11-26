# Pitch compaction

Proposed **summary knowledge entry**. It combines compaction decisions, conditional ledger patterns, and incident evidence whose scope and verification status matter.

Source IDs

- `a-bounded-ledger-needs-a-group-entry-bound-by-a-tree-hash`
- `a-ledger-for-judged-files-lists-every-file`
- `live-test-evidence-outlived-its-pitch-path`
- `pitch-compaction-gate-and-recovery-design`
- `pitch-folders-accumulate-staging-nothing-consumes`

## Deletion gate

`pitch-compaction` is the sole human-approved exception to the ban on rewriting `.project/pitches/`. Every mutation needs `--apply`. Deletion requires manual approval, a verified archive, a complete ledger, and unchanged source. Record explicit human acceptance for each gap via `commit-ledger --accept-gap SECTION=REASON`. `remove` rechecks it. A ledger-existence check let all sections be declared gaps and pass at 0% coverage in a live reproduction. Audit reversed it ([[a-gate-must-not-trust-its-own-author]]). Ledger destinations must be real, nonempty in-project files outside the pitch being deleted. This check is mechanical. Humans or agents still do the extraction, and every skipped section is a named decision.

## Recovery

`pitch-archive.js` reuses audited `skill-registry.js` `transact`/`recover` with `{roots, state}`. Test interruption with real `SIGKILL` subprocesses. Guard interrupted transactions inside `archive`, `remove` and `restore` so direct imports are covered. Anchor archive lookup to the exact timestamp shape. `verify` rejects another slug’s manifest ([[bare-prefix-match-crosses-entities]]). `restore` requires a verified archive and checks containment before each write. Removal is recoverable via the archive and Git history. Trace changes to shared readers through their writers ([[hardening-a-shared-reader-made-its-writer-destructive]]).

## Inventory and records

`remove` leaves the emptied directory and detects either an empty or missing directory as already removed. `inventory` treats an empty directory as compacted when its slug appears in `done-work.md`, and reports non-slug directories as preserved while continuing. Generate `done-work.md` with one section per pitch and replace it in place on reruns. Keep hand edits out.

Implementation references are `pitch-compress.js` and `pitch-archive.js`. To keep the playbook coherent, C1 wrote all of `.claude/skills/pitch-compress/SKILL.md`, including C2 steps. C2 scripts and tests were built and verified separately. See [[workflow-tooling-pitches-share-standing-no-gos-and-design-answers]].

## Group coverage

A destructive gate must prove every file slated for deletion was judged. For bulk eligible for a single judgment, one folder-prefix entry avoids the growing ledger and recurring ceiling of raising the per-entry cap. The tool computes and the gate recomputes the member count and a tree hash of every member’s path and content hash in fixed order. Additions, removals, renames and edits change the hash. Reject empty groups, overlap and unaccounted files. Keep a separate total-file bound and use one pure coverage function in the writer and remover.

Mutation tests caught ignored counts or tree hashes, missing member hashes, partial folder hashing, allowed overlap or unaccounted files, and stale group hashes accepted at commit. Dropping the count prefix from the hash survived and the redundant prefix was removed. The separate count check stays.

## Individual judgment

Where each file’s loss needs its own judgment, such as decisions and approvals, list each file separately. Count and tree hash prove group membership and content stayed intact. Each file still needs a recorded judgment. Stop and split the pitch folder if the entry cap is reached.

## Staging

The connected-memory-consolidation pitch could not use the compaction flow it built. It held 242 files (6.1 MB), drew 74 incoming links, and hit `commit-ledger`’s then-limit of 200 files outside covered sections. About 185 were campaign staging (unresolved drafts `prepare` regenerates, proposals, approved inputs consisting of unwrapped proposals, and supplements, 46 of 47 byte-identical to published copies). Another 27 were reviewer prompts and results. Five run files copied the full 95 KB log, and each of 11 batches left 4–6 run files. No step consumed, merged or deleted the buildup. The ledger lacked group coverage.

Version 2.49.0 added group entries and a 2,000-file bound. The pitch-compress and ship playbooks specify what to keep, where to stage, and that a shared log gets one snapshot. Classify outputs written into a pitch folder as durable, derivable or disposable at creation. Stage derivable and disposable files where the batch result deletes them.

## Evidence retention

Before retiring a pitch, inventory tests and tools using its source paths as well as prose links. Move required full assets to durable ownership, verify complete bytes against an approved original, update the consumer and run its unchanged regression. Keep ordinary tests independent of recovery archives. Check recorded deletion intent before restoring an old path.

## Live evidence repair

Compaction removed `state-ai-authoring/live-runs.md`, causing `ENOENT` in the historical dataset regression. Its machine-readable matrix had 72 runs, 12 seeded bad rows and a Cursor not-run row. A narrative summary could not supply it. Skipping the assertion or inventing a successful run would lose the historical result.

The repair restored the exact 36,920 UTF-8 bytes from the verified, approval-gated source cache to `.project/records/legacy-upgrades/state-ai-authoring-live-runs.md` and repointed only `LIVE_RECORD` in `state-fragment-dataset.test.mts`. Raw SHA-256 `868e76e9eace40c14f8014e18a16a8fa5b702de13e5489ebcc29c4e7944fc24a` and the original normalized source hash matched approved proof. Unchanged assertions validate the preserved historical `Claim: blocked`. The repair supplied no new live-model result.

The final-verification child failure during repair remains an independent, unconfirmed incident. Later passes leave the cause unresolved. Bounded parent diagnostics are tracked as FRLE-D1. Timing-under-load work keeps its existing owner.
