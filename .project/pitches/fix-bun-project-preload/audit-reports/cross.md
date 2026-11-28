# Cross-pitch conflict review — `fix-bun-project-preload` (uncommitted bug fix)

**Role:** cross-pitch-conflict-checker. **Change reviewed:** `CHANGE.patch` in the work folder (an uncommitted
bug fix for the Bun preload leak, scoped by `contract/log.md`). **Compared against:** `.project/pitches/04-greenfield-kickoff`
(part B2 outline), `05-workspace-recovery`, `06-workflow-v3-rollout`, `07-archify-local-library`, and `.project/status.md`.
**Repository checkout was not read** (out of scope for this task): every statement about bundle code is derived from the
patch plus the pitch records, and is marked UNVERIFIED where the checkout would be needed.

---

## 1. The change, file by file

`CHANGE.patch` touches 11 tracked paths and adds 1 new file:

| Path | Kind of change |
|---|---|
| `ai-framework/scripts/runtime/entry.mts:12` (new `bunIsolationOptions()`), `:29` (applied to every non-test Bun child) | shared launcher semantics |
| `ai-framework/scripts/runtime/bun-isolated.toml` | **new file** (comments only) |
| `ai-framework/scripts/orca-run.mts:46` | direct script launches get the same options |
| `ai-framework/scripts/orca-eval-grader.mts:214` | direct `-e` launches get the same options |
| `ai-framework/scripts/runtime/entry.test.mts`, `ai-framework/scripts/runtime/runtime.test.mts`, `ai-framework/scripts/orca-run.test.mts`, `ai-framework/scripts/orca-eval-grader.test.mts`, `ai-framework/scripts/setup-validator.test.mts` | tests |
| `ai-framework/templates/shipped-files.txt:337` | adds `ai-framework/scripts/runtime/bun-isolated.toml` to the shipped-path list |
| `README.md:71` and `README.md:104`, `ai-framework/scripts/runtime/README.md:8`, `:41`, `:146` | documentation of the new Bun behavior |

Scope check against the contract: `contract/log.md:30` lists exactly these paths (plus `runtime.test.mts` and
`setup-validator.test.mts`, which the coordinator added per `contract/log.md:45`). **No scope violation, and no
`.project/` file is touched** — `contract/log.md:30` says "The coordinator makes every `.project/` change", and the
patch does not write there.

## 2. Cross-pitch comparison

### 2.1 `04-greenfield-kickoff` part B2 — **one PURE OVERLAP, one adjacent overlap, rest disjoint**

**PURE OVERLAP — `ai-framework/templates/shipped-files.txt`**

- Fix side: `ai-framework/templates/shipped-files.txt:337` adds `ai-framework/scripts/runtime/bun-isolated.toml`.
- Pitch side: `04-greenfield-kickoff/plan-b1.md:14` — B2's file set includes "pipeline doc, relations, **shipped list**".
  The list is `ai-framework/templates/shipped-files.txt` (named at `04-greenfield-kickoff/deviations.md:3`).
- Same file, two writers, both regenerating a generated artifact.

**Merge order that matters (and it is already recorded):** `04-greenfield-kickoff/audit.md:120` —
"Merge order: this ships before pitch 07 edits the doctor and `SETUP.md`, and before pitch 06 pins a release";
`04-greenfield-kickoff/audit-b1.md:72` — "B1 before pitch 07, both before pitch 06 pins a release and hand-merges
the two routes". For this fix the order is: **the Bun `/fix` lands first, then B2 is planned on top of it.**
`.project/status.md:9` already states it: 04's phase is "plan (B2), **after the Bun `/fix`**".

**The mechanical merge is clean; the hazard is regeneration order, not text.** I simulated the three-way merge on the
list region the patch touches (`probe/merge/`):

```
$ git merge-file -p after-fix.txt base.txt after-b2-added.txt
ai-framework/scripts/run-tests.test.mts
ai-framework/scripts/runtime/README.md
ai-framework/scripts/runtime/bun-isolated.toml      <- the fix's line survives
ai-framework/scripts/runtime/bun.mts
ai-framework/scripts/kickoff-publish.mts
ai-framework/templates/project/context/definition.md
(exit 0)                                              <- no conflict
```

**Residual failure scenario (loud, not silent):** the shipped list is regenerated, not hand-edited —
`04-greenfield-kickoff/deviations.md:3`: "A test in the bundle checkout compares the list with Git (tracked plus
untracked, unignored files) and **fails when it is stale**; every later bundle file added or removed must regenerate
it." If B2 regenerates the list **on a branch based before this fix**, its list omits
`ai-framework/scripts/runtime/bun-isolated.toml`; after the merge the tree contains the file but the list does not,
so the Git-list staleness test fails and `node ai-framework/hooks/scripts/pre-ship-verify.mts` exits non-zero.
Requirement on B2's plan: it must branch from the fixed tree and its shipped-list step must be a regeneration over
the merged tree, not a copy of a list generated elsewhere.

**ADJACENT OVERLAP — `ai-framework/scripts/setup-validator.test.mts`** is owned by the fix
(`CHANGE.patch:365-384`, the Bun-runtime transpile-check expectation) and is the file a `setup-validator` check for
ledger v2 would most likely extend; see 2.3.

**Everything else in B2 is disjoint.** B2's named set (plan-b1.md:14) is: `kickoff` skill + Claude/Cursor/Codex/OpenCode
adapters, pipeline doc, relations, definition template, draft/publication rules with tests, `first-version` hand-over,
entry files, eval dataset. The fix touches none of them.

**One cross-pitch conflict that exists between 04 and 06, not involving this fix** (recorded for the coordinator,
out of this change's scope): B2's "relations" (`plan-b1.md:14`) and 06's P1 track
(`06-workflow-v3-rollout/consolidation-carry.md:11`) both name `ai-framework/workflow/relations.toon`. The fix does
not touch that file.

### 2.2 `05-workspace-recovery` — **DISJOINT**

`05-workspace-recovery/pitch.md:16` names `legacy-upgrade.mts`; `:20` names `pitch-archive.mts` and
`ledger-schema.mts`; the pitch's subject is compaction-recovery copies and session evidence. The fix touches none of
these paths and none of the records 05 reads (`done-work.md`, ledgers, archives). **No conflict, no merge order.**
The only adjacent remark: 05 binds refusal cases to "uncommitted or untracked content" (`05-workspace-recovery/pitch.md:22`),
and this fix is uncommitted with one new untracked file (`ai-framework/scripts/runtime/bun-isolated.toml`). If 05's
removal pass ever considers the bundle tree, an untracked file is exactly its refusal trigger; 05's own scope is
`.project/` compaction and session evidence, so this does not apply as written.

### 2.3 `06-workflow-v3-rollout` — **ADJACENT OVERLAP (highest impact)**

No file of the fix is in 06's named file set. 06's set is per-project `ai-framework/`, `.project/`, root
`ai-workflow.toon` (`06-workflow-v3-rollout/pitch.md:21`) plus the carry list
(`consolidation-carry.md:11-14`): `ai-framework/workflow/relations.toon`, `graphify-relations.mts`,
`graphify-refs.mts`, `consolidation-migrate.mts`, `legacy-upgrade.mts`, `ai-framework/docs/versioning-and-sync.md`.
The overlap is by **content that bundle-sync carries**, not by a shared path in the pitch.

**Merge order that matters:** the fix must be in the release 06 pins. `06-workflow-v3-rollout/consolidation-carry.md:4-5`:
"`readiness.md` … **must be re-run** against the release that contains the work before any project PR is opened", and
`06-workflow-v3-rollout/pitch.md:55`: "`readiness.md` (bundle 2.30.0) is historical and must be re-run at the release
that includes this work."

**Concrete failure scenario:** RN carries local edits that "mostly `bun ai-framework/...` wording"
(`06-workflow-v3-rollout/readiness.md:18`; 23 of 33 kept-local edits "differ only in runner wording", `:19`), and 06's
RN step says to take upstream for "the 7 stale and the 23 runner-only local edits" (`:32`). This fix rewrites exactly
that wording upstream: `README.md:104` removes "Run scripts directly as … or `bun ai-framework/scripts/<name>.mts`"
(`CHANGE.patch:27-29`), and `ai-framework/scripts/runtime/README.md:8` replaces
`bun ai-framework/scripts/graphify.mts --check` with `AI_WORKFLOW_RUNNER=bun node …`. If 06's RN PR is prepared
against a release that lacks this fix, RN's copy keeps the vulnerable launch instruction and the merge does the
opposite of what the fix intends.
Check in any installed project: `grep -rn "bun ai-framework/scripts" README.md ai-framework/scripts/runtime/README.md`
— non-empty means that project still documents the unprotected launch.

**Second concrete failure scenario — the new file must reach the three projects.** `bundle-sync` carries
`ai-framework/scripts/` (evidence in `04-greenfield-kickoff/audit-b1.md:76`: "`ai-framework/scripts` is synced"),
so `ai-framework/scripts/runtime/bun-isolated.toml` travels with the scripts; but
`ai-framework/templates/shipped-files.txt` sits in `templates/`, and the installed copy's **own** shipped list decides
its exclusions ("The installed copy's own shipped list and scaffold decide exclusions | By design: the installed
bundle is the authority for itself", `04-greenfield-kickoff/audit.md:118`). If `templates/` is not in the sync set,
the installed project's list stays at the previous release while its scripts are new — the pair must be re-checked
together after 06's sync, or the installed detector's `empty`/`unclear` decision changes
(`04-greenfield-kickoff/plan.md:45-47`).
UNVERIFIED: the contents of `bundle-sync.mts`'s `SYNCED_DIRS` (checkout not read). **This is the one item the
coordinator should confirm before 06 pins a release.**

**Third, smaller overlap — `ai-framework/scripts/setup-validator.test.mts`.** 06's carry track P2a ships a
"`setup-validator` check" (`06-workflow-v3-rollout/consolidation-carry.md:12`). The pitch names the `setup-validator`
surface but **not** the test file, so this is an adjacent overlap, not a pure one: if P2a's check is implemented with a
case in `ai-framework/scripts/setup-validator.test.mts`, that file is already owned by this fix
(`CHANGE.patch:365-384`). Different hunks, so the merge is expected to be clean; the fix should land first so P2a is
written against the fixed expectations.

### 2.4 `07-archify-local-library` — **DISJOINT**

07's named set (`07-archify-local-library/pitch.md:20`): "add-skill install/update, workflow-doctor, project
.gitignore, bundle .gitignore / setup docs". The fix touches none of them: no doctor change, no `.gitignore`, no
`SETUP.md`, no `add-skill`. The only adjacency is structural: 07 edits `workflow-doctor.mts` and `SETUP.md`, and
`04-greenfield-kickoff/audit.md:120` already records the order "this ships before pitch 07 edits the doctor and
`SETUP.md`". The fix changes neither, so it does not disturb that order. The new file
`ai-framework/scripts/runtime/bun-isolated.toml` is a bundle file with no `.gitignore` implication for skill packages.

### 2.5 `.project/status.md` — consistent

`status.md:8` lists the fix as "S1 built and verified; not reviewed, not committed"; `:9` puts 04 at "plan (B2),
after the Bun `/fix`". Both match the merge order above. No conflict between the change and the status file.

---

## 3. Findings, in the required format

### Finding 1 — MEDIUM — `README.md:104` / `ai-framework/scripts/runtime/README.md:8` vs `06-workflow-v3-rollout/readiness.md:18`

- **Severity:** medium
- **File:line:** `README.md:104` (patch `CHANGE.patch:27-29`); `ai-framework/scripts/runtime/README.md:8` (patch `CHANGE.patch:159-160`)
- **Rule violated:** 06's own rule — "`readiness.md` … must be re-run against the release that contains the work"
  (`06-workflow-v3-rollout/consolidation-carry.md:4-5`), plus the recorded order "before pitch 06 pins a release"
  (`04-greenfield-kickoff/audit.md:120`). Also 06's no-go "No merge without owner review of each PR"
  (`06-workflow-v3-rollout/pitch.md:43`).
- **Failure scenario:** 06 opens the RN PR against a release without this fix. RN's local "runner-only" edits
  (`readiness.md:19`, `:32`) are resolved to upstream, but upstream still carries the old `bun ai-framework/...`
  instruction that this fix deletes. The installed project keeps documenting the unprotected launch, and the fix's
  stated purpose — "A direct `bun <script>` command still loads the working folder's `bunfig.toml` preload"
  (`README.md:76`) — is not reflected in the three synced projects.
- **Command run and output:** I could not run this check against an installed project (checkout out of scope). The
  equivalent check to run in each synced project is
  `grep -rn "bun ai-framework/scripts" README.md ai-framework/scripts/runtime/README.md` — any hit means that project
  still documents the unprotected launch. In the work folder the patch shows the line being removed:
  `-Run scripts directly as `node ai-framework/scripts/<name>.mts` on Node 22.18 or later, or`
  `-`bun ai-framework/scripts/<name>.mts`. Node 22.12–22.17 requires` (`CHANGE.patch:27-29`).

### Finding 2 — MEDIUM — `ai-framework/templates/shipped-files.txt:337` vs `04-greenfield-kickoff/plan-b1.md:14`

- **Severity:** medium (loud failure, no silent corruption)
- **File:line:** `ai-framework/templates/shipped-files.txt:337`
- **Rule violated:** "every later bundle file added or removed must regenerate it" and the Git-list staleness test
  (`04-greenfield-kickoff/deviations.md:3`); the recorded order "plan (B2), after the Bun `/fix`"
  (`.project/status.md:9`).
- **Failure scenario:** B2 is planned and built on a branch that predates this fix. B2's shipped-list regeneration
  produces a list that matches B2's tree and omits `ai-framework/scripts/runtime/bun-isolated.toml`. Merging B2 into
  the fixed tree yields a tree whose Git file set is not equal to its list, so the staleness test fails and
  `pre-ship-verify` exits non-zero at ship time. The fix's own list entry is correct as written (the patch adds the
  new file at line 337); the risk is entirely in B2's regeneration base.
- **Command run and output:** the three-way merge on the list region is clean, so this is not a textual conflict:
  ```
  $ git merge-file -p after-fix.txt base.txt after-b2-added.txt
  ...
  ai-framework/scripts/runtime/bun-isolated.toml      <- fix's line kept
  ai-framework/scripts/kickoff-publish.mts
  ai-framework/templates/project/context/definition.md
  (exit 0)
  ```
  The stale-list check to run after the merge is the bundle's own test (per `deviations.md:3`, the test compares the
  list with Git tracked plus untracked-unignored files) — UNVERIFIED here: the checkout's test file was not read.

### Finding 3 — LOW — `ai-framework/scripts/setup-validator.test.mts` vs `06-workflow-v3-rollout/consolidation-carry.md:12`

- **Severity:** low
- **File:line:** `ai-framework/scripts/setup-validator.test.mts` (patch `CHANGE.patch:365-384`)
- **Rule violated:** the disjoint-file-set rule for parallel scopes (`04-greenfield-kickoff/plan.md:32-33`) applied
  across pitches: this fix and 06's P2a will both want the same test file's expectations.
- **Failure scenario:** P2a adds its `setup-validator` check and a case in `ai-framework/scripts/setup-validator.test.mts`
  against the old Bun `build` expectation while this fix changes that same expectation to
  `[...bunIsolationOptions(), "build", "--no-bundle", ...]`. The hunks are in different regions of the file, so the
  merge should be clean; if P2a rewrites the file wholesale, the conflict lands on the fix's expectation and the
  setup-validator test fails for the wrong reason. Fix first, then P2a.

### Finding 4 — LOW — `ai-framework/scripts/runtime/bun-isolated.toml` vs 06's sync of `ai-framework/templates/`

- **Severity:** low (contingent; UNVERIFIED)
- **File:line:** `ai-framework/scripts/runtime/bun-isolated.toml` (new), `ai-framework/templates/shipped-files.txt:337`
- **Rule violated:** the installed copy's own shipped list decides its exclusions (`04-greenfield-kickoff/audit.md:118`),
  so the list and the files it names must travel together.
- **Failure scenario:** bundle-sync carries `ai-framework/scripts/` (evidence: `04-greenfield-kickoff/audit-b1.md:76`)
  but not `ai-framework/templates/`. The installed project then holds the new runtime file while its shipped list
  predates it, so the installed detector's `empty` / `existing` / `unclear` decision for that project is made against
  a list that does not describe its own bundle tree (`04-greenfield-kickoff/plan.md:45-47`). Check after 06's sync, in
  each installed project: confirm `ai-framework/templates/shipped-files.txt` and
  `ai-framework/scripts/runtime/bun-isolated.toml` are from the same release.
- **Command run and output:** none — the checkout was not read; `bundle-sync.mts`'s `SYNCED_DIRS` is UNVERIFIED.

### Finding 5 — INFO — `05-workspace-recovery` and `07-archify-local-library`: disjoint, no action

- **Severity:** informational
- **File:line:** none shared. `05-workspace-recovery/pitch.md:16`, `:20`; `07-archify-local-library/pitch.md:20`.
- **Rule violated:** none.
- **Failure scenario:** none identified. 07's doctor/`SETUP.md` work is ordered after 04 by
  `04-greenfield-kickoff/audit.md:120` and `audit-b1.md:72`, and this fix changes neither.

---

## 4. Merge order that matters

1. **This Bun fix lands and is committed before 04 part B2 is planned.** B2 owns the shipped list
   (`plan-b1.md:14`); B2 must regenerate it over a tree that already contains
   `ai-framework/scripts/runtime/bun-isolated.toml`. `.project/status.md:9` already orders this ("plan (B2), after
   the Bun `/fix`"); the requirement to add to B2's plan is that the shipped-list step is a regeneration over the
   merged tree, not a copy of a list generated on a pre-fix branch.
2. **This fix is in the release 06 pins.** 06's readiness must be re-run at that release
   (`consolidation-carry.md:4-5`), and RN's runner-wording conflicts (`readiness.md:18`, `:19`, `:32`) must be
   resolved against the fix's new wording, not the old one. Also confirm that `ai-framework/templates/shipped-files.txt`
   and the new runtime file reach the installed projects together (Finding 4).
3. **This fix before 07 edits the doctor and `SETUP.md`** — already recorded at `04-greenfield-kickoff/audit.md:120`
   and `audit-b1.md:72`. This fix touches neither file, so the order is unaffected, but the fix must not be folded
   into 07's change set.
4. **05 needs no order.** Disjoint.

## 5. Unverified items (checkout not read, as required by this task)

- Whether `bundle-sync.mts`'s `SYNCED_DIRS` includes `ai-framework/templates/` (Finding 4) — the highest-value check
  for the coordinator before 06 pins a release.
- Whether `ai-framework/scripts/runtime/entry.mts` already imports `fileURLToPath` from `node:url` (the patch adds a
  `fileURLToPath(new URL(...))` call at `entry.mts:13`; the import line is outside the patch's context).
- The exact bundle test that enforces the shipped-list staleness rule (`deviations.md:3`) and the exact
  `pre-ship-verify` command that would fail on a stale list.
- Whether the 04-B2 plan, when written, names `ai-framework/templates/shipped-files.txt` explicitly (the B2 outline
  says only "shipped list").
- The fix's own test results were not re-run; they are the coordinator's figures (`contract/log.md:48-53`).

## 6. What I tried that did not work

- **Reproducing a merge conflict in `ai-framework/templates/shipped-files.txt`.** I built three synthetic versions of
  the list region (`probe/merge/`) and ran `git merge-file` for the "B2 regenerated the whole file" case and the
  "B2 appended its own paths" case. Both merged cleanly with exit 0 and the fix's line preserved
  (`probe/merge/` output in Finding 2). The scenario that actually breaks is a *regeneration on a pre-fix branch*,
  which is a process failure, not a textual merge conflict — so this finding is stated as a regeneration-order
  requirement rather than a merge conflict.
- **Proving the shipped list and the runtime file travel together through `bundle-sync`.** Not possible without the
  checkout; the only evidence available in the records is `04-greenfield-kickoff/audit-b1.md:76` ("`ai-framework/scripts`
  is synced"), which says nothing about `templates/`. Marked UNVERIFIED in Finding 4.
- **Running the bundle's own test suite** (staleness test, `pre-ship-verify`) to confirm the shipped-list rule end to
  end: out of scope (repository checkout). The report therefore states the rule from `deviations.md:3` and marks the
  executing test unverified.
- **A first pass at the intersection used `grep -rn` over the whole `.project/pitches` tree** and produced many
  incidental `README.md` hits; I narrowed it to full-path matches, which is what section 2 uses, and I did not infer
  any file for a pitch that does not name it.

## 7. Behavioral note from the local Bun probe (evidence for the fix's own claims, not a cross-pitch issue)

A throwaway probe inside `probe/bun/` (marker-only preload and marker-only `.env`, Bun 1.4.5) reproduces the triage
table in `contract/log.md:7-19` and adds one fact the contract does not state:

```
$ bun ./marker.mts                                    # preload + .env leak
PRELOAD-MARKER
ENV-MARKER
$ bun --config="$PWD/isolated.toml" --no-env-file --no-install ./marker.mts
no-env
$ bun --config="$PWD/isolated with space.toml" --no-env-file --no-install ./marker.mts
no-env
$ bun --config="$PWD/nope.toml" --no-env-file --no-install ./marker.mts
ENOENT: /…/probe/bun/nope.toml: No such file or directory (open())
while reading config "/…/probe/bun/nope.toml"
exit=1
$ bun --config="$PWD/isolated.toml" --no-env-file --no-install -e 'console.log(process.env.WF_MARKER ?? "no-env");'
no-env
$ bun test t.test.mts
 1 pass
 0 fail
```

**Additional fact for the coordinator (not a pitch conflict):** a missing `--config=` target is a hard Bun failure
(exit 1), not a silent fallback. The patch already accounts for this in the one fixture that copies runtime files
selectively (`ai-framework/scripts/runtime/runtime.test.mts`, `CHANGE.patch:361` copies `bun-isolated.toml`
explicitly). Any other bundle test or fixture that copies `ai-framework/scripts/runtime/*.mts` into a scratch tree
must copy the `.toml` as well, or its Bun runs exit 1 with the ENOENT above. I could not enumerate those fixtures
without the checkout, so the sweep is UNVERIFIED and is the single most likely source of a surprise failure in this
change's own test run.
