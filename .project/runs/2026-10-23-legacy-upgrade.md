# Shipped: legacy-upgrade (P2c)

Date: 2026-10-23. Appetite: big-batch. State: shipped after explicit owner approval. Track receipt: [ships/p2c.SHIPPED.md](../records/consolidation/tracks.md#p2c-legacy-upgrade); approved proposal hash sha256:01023861e631103c4c9b2e8445f33699531f9484ba9bb893a80e543687bd9fe2.

## Reconciliation

| Scope | Result | Behavior |
|---|---|---|
| P2c-S1 | done; proposed for ship | Legacy inventory and no-archive prepare |
| P2c-S2 | done; proposed for ship | Receipt-gated resumable apply |
| P2c-S3 | done; proposed for ship | All 19 tier-A upgrades |
| P2c-S4 | done; proposed for ship | All 22 B-small upgrades |
| P2c-S5 | done; proposed for ship | All five B-large upgrades and closing evidence |

No planned scope in this track is silently deferred. Historical scope counts and intermediate failures stay in [hill](2026-10-23-connected-memory-consolidation.md#complete-hill-as-of-closure), [log](2026-10-23-connected-memory-consolidation.md), [plan](../records/consolidation/plan.md) and [deviations](../records/consolidation/deviations.md). All 20 scopes across the four tracks are done; four distinct ship approvals/receipts are required by R14.

## Ownership and release attribution

legacy-upgrade and tests, narrow verified-evidence interfaces in pitch-compress, typed outcome navigation in graphify/outcome helpers, 46 v2 ledgers/v1 siblings, 46 outcomes, retained supplements, generated index and eleven approved campaign batches.

## Deviations, no-gos and rabbit holes

D22–D31 remain historical evidence. All source judgments are separately approved; audit is not substitute source review. Batch-3 broad archive search was unauthorized; complete scope is unknown because output truncated and that output is excluded from provenance. Later approvals do not authorize it retroactively. TTR retention is 26788/274950 bytes, 9.742862%, versus 5% target; the exact exception is owner-approved. The existing state-history recovery archive fallback is deferred to un-bet P2b; the original literal scan criterion did not pass. No coverage or slug exception was accepted. Metrics do not establish retrospective token/time totals.

No secret files were used for closing evidence. No commit, push, recovery deletion or downstream rollout is included. P2b ship-consolidate-step, P3a retire-safely and P3b state-from-records remain un-bet. The workflow-v3-rollout carry is separate. Both explicit campaign closing exceptions are retained in [owner acceptance](../records/consolidation/closing-exceptions.approved.toon).

## Audit acceptance

Separate clean P2d/P2c cycle1, owner approved. Code/security/coverage caught planted receipt/binding/claim controls; fresh completions finished applicable checks. Cross review verified actual shared hooks and release ownership. All 46 content reviews retain their own source receipts. Failed/incomplete fixture attempts remain recorded.

## Verification and its limits

The owner-approved direct-check route is documented in [ship verification](2026-10-22-connected-memory-consolidation-ship-verification.md). The package-less pre-ship wrapper still refuses with “No package.json or Muro document verifier found.” It was run and failed; it is not reported as passed. No temporary manifest or changed security/timing bound was used.

Supported full Node command: node ai-framework/scripts/run-tests.mts --runtime node --workers 1. Result: 86 files, 2712 tests, 2709 passed, zero failed, three existing skips, exit 0, 436.955 seconds. This is reused after records/knowledge-only closing edits because the 172 implementation-file hashes remain unchanged. The interrupted sandbox attempt is not a pass. No application build, compiler, package lint or i18n command exists for this bundle; setup validates the 175 TypeScript scripts. No UI, translated strings, new dependency or AI prompt applies. Bun is not represented as a newly completed whole-suite gate.

The separate evidence-path repair is already shipped: exact original 36920 bytes, one consumer path constant, final 54/54 parent and independent 347/347 child checks. Historical 72 runs, 51 pass/21 fail, twelve seeded bad, one Cursor not-run and Claim: blocked remain unchanged. The initial child346/347 failure cause is unconfirmed; FRLE-D1 diagnostics and existing timing work remain deferred.

Final setup, graph, relations, outcome lint/navigation, provenance, mirror and content/link checks are recorded in the shared ship verification run. Original sixteen decision files, all retained source supplements, v1 bytes and approval hashes remain intact. Later legitimate maintenance of living knowledge/index/backlog destinations does not rewrite apply-time binding evidence.

## Knowledge, followups and documentation

Two new issues (missing typed navigation and archive authorization boundary) plus accepted drift-binding decision, three P2c entries total. TTR source upgrade created no new cards. P2b owns the existing history fallback. Full incident dispositions and read accounting: [knowledge extraction](../records/consolidation/knowledge-extraction.md). Four new knowledge entries and two existing updates are shared totals, not four new entries per track. No rule promotion. All 46 outcome and retained-content records, eleven batch result/approval records and navigation evidence updated. No recovery archive deletion, lifecycle retirement scanner or automatic ship consolidator.

## Approval and closure

The owner approved this exact proposal on 2026-10-23. Closure increments the cooldown counter once; the connected-memory-consolidation umbrella stays active until the P1, P2a and P2d receipts exist. Nothing is committed or pushed.

## Scoped hill snapshot

| Scope | Position | Last moved | Notes |
|---|---|---|---|
| P2c-S1 | done | 2026-10-22 | 16/16 tests, 100% line coverage; 70 regressions + 99 integration pass (1 existing skip); live 46 = 19 A + 22 B-small + 5 B-large; graph rebuilt CLEAN; v2.46.0; approval pending before S2 |
| P2c-S2 | done | 2026-10-22 | 43/43 tests, 100% lines/functions; 306 regressions pass; five SIGKILL recovery points; seven mutations caught; introducing-commit proof, source approval and v1 retention; graph CLEAN; v2.47.0; S3 gate pending |
| P2c-S3 | done | 2026-10-22 | all 19/19 tier A upgraded; live status, per-slug outcome/archive/v1 proof and graph navigation verified across approved batches |
| P2c-S4 | done | 2026-10-23 | all 22/22 B-small upgraded; exact final-four apply owner-approved; status, outcomes, v1/archive integrity and graph navigation verified |
| P2c-S5 | done | 2026-10-23 | all 46 upgraded; zero legacy/partial/pointers; 46 index rows; integrity/setup/graph/links pass; both measured exceptions owner-approved; Node 2709 pass/0 fail/3 skips; build-end gate pending |

## Preserved source log (complete, as of closure)

# Build log: connected-memory-consolidation

## 2026-10-22 Wave 1 (P1-S1, P1-S1b, P1-S2, P1-S3, P2a-S1)

- Graph before-state (R10) is not rebuilt yet; it is recorded when P1-S4 starts (`built_at_commit` still `46c9290`).
- K11 test inventory (tests asserting a ledger `schemaVersion` or shape), after P2a-S1: `pitch-compress.test.mts` (60 tests, green),
  `pitch-archive.test.mts` (33, green, builds v1 ledgers at lines ~375/392/406; P2a-S2 adds v2 rows), `ledger-schema.test.mts` (3, new).
  `bundle-sync`, `setup-validator`, `state-*` tests contain no ledger-shape assertion today (P2a-S6 adds the validator check). The 46 real v1
  ledgers all pass `validateLedgerShape` (asserted by `ledger-schema.test.mts`).
- Mutation check on P2a-S1: disabling the stale-hash check fails "v2 binds each entry..."; disabling the unaccounted-file check fails
  "v2 needs an otherFiles entry...". Both restored, 60/60 green.
- `toon-convert.mts --report` only accepts a `.json` path, so the stored-vs-minified size report in the P1-S3 exit does not apply to
  `relations.toon`; size is checked by `wc -c` (8320 B, cap 16384).
- P1-S3 subagent judgment calls to review at the gate: `critique.phaseDoc` = `0-shape.md`; `shape -> critique` filed under `dispatches`
  (the validator has no skill-to-skill relation); `build` reads only `boundaries`, `coding-standards`.

## 2026-10-22 Wave 2 (P2a-S2, P2a-S3, P2a-S4)

- **R3 spike (record size cap):** `test-execution-performance` and `token-time-report` have no `pitch-compression` record (they were compacted without
  one), so the calibration used the legacy `done-work` entries (median 1352 B, max 7336 B) and the three largest existing `pitch-compression` records
  (8.0, 9.9, 14.7 KB). Cap chosen: `MAX_RECORD_BYTES = 3000` (below the median entry so a big pitch cannot cost more than a small one), 3-6 prose lines,
  12 links per field. Measured largest conforming record: 2958 B. The numbers are constants in `outcome-record.mts`, asserted by tests.
- **R4 spike (`.project/decisions/*.md`):** the two files (`toon-data-grammar.md`, `toon-subset-grammar.md`) are bundle design pins with a `**Status**: pinned`
  line, no id, tags or related. Parsing them into decision nodes would create two orphan warnings and a status outside `accepted|superseded|deprecated`.
  Took the plan's fallback: left untouched and not indexed as nodes; adoption into the single ADR home is deferred (follow-up, not a no-go).
- Mutation check on P2a-S2: disabling the stale-hash check fails "v2 ledger that has any doubt" and the K3 table. Restored; 37/37 green.
- Real-tree checks: `graphify.mts --check` CLEAN (16 decisions, all accepted by default, 0 new errors); `workflow-doctor` runs; setup-validator READY.
- Frontmatter keys may now contain hyphens (`applies-to`); previously such a line was silently ignored.

## 2026-10-22 P1-S4 graphify integration

- **R10 before-state** (graph rebuilt at `b26b45b`, before any workflow edge): 6789 nodes / 12686 links, 11 canonical files with a cross-file edge,
  44 isolated `.opencode` adapter nodes (the `46c9290` graph had the same 44). **After:** 6822 nodes / 13141 links (+23 stub nodes), 0 isolated adapters,
  and every one of the 68 canonical skill/agent/rule/phase file nodes has a workflow edge except `data-modeling`, `observability`, `tool-use`, which are
  `standalone` in the manifest (the exit allows an edge or a standalone reason).
- Edges in the graph: 135 mirrors, 41 reads, 20 dispatches, 8 phase-doc, 0 writes (no entry declares one), 130 references placed (182 derived; 52 name files Graphify does not index).
- **Finding: Graphify skips any folder named `build/`**, so `.claude/skills/build/SKILL.md` (the build phase) and its `.agents`/`.cursor` copies had no node in the
  graph; `.toml` adapters (`.codex/agents/`) have none either. A `!` negation in `.graphifyignore` does not bring `build/` back (tried, reverted).
  The overlay therefore adds a stub file node (`workflow_stub`, 23 of them) for a file named by a declared or mirror relation that has no node, and reports the count.
- **Finding: boilerplate hubs.** Without a limit, 3 files take 132 of 314 derived references (`skill-defaults.mts` 45, `harnesses.md` 41, `registry.json` 46: every skill's caveman paragraph and header).
  Rule added and tested: a target named by more than `REF_HUB_LIMIT` (20) sources yields no edge and is reported. Per-file budget raised 12 -> 20 after measuring the busiest real doc (16).
  After the rule no workflow node is among `graphify god-nodes`.
- **Precision check** (`precision.mts`, 12 `graphify explain` checks, 2-3 per edge type, run on the graph without workflow edges and with them):
  before 0/12 hit, after 12/12 (mirrors 3/3, phase-doc 2/2, dispatches 3/3, reads 2/2, references 2/2). Free-text `graphify query` was tried first and rejected as the
  measure: it matches labels lexically, starts from whichever node shares a word (the `.agents` mirror's heading for "ship"), and cuts results at its ~2000-token budget, so its
  hits did not change with the overlay (6 of 10 hit before and after). `writes` has no edge to test.
- `.graphifyignore` is only written when absent, so installed projects keep their own; nothing in this scope depends on a change to it.

## 2026-10-22 full-suite run after P1-S4

- `run-tests.mts` first run: 6 failures. 1 is **pre-existing at HEAD** (`state-fragment-dataset` "[dataset-mapping] the live record is valid": reads
  `.project/pitches/state-ai-authoring/live-runs.md`, deleted when `b26b45b` compacted that pitch; confirmed by running it in a clean `git worktree` of HEAD, 53 pass / 1 fail).
  The other 5 were mine: new template scaffold made `workflow-doctor` fail in this repo and in every real-bundle-copy / old-install test (fixed by D10, D11).
- Signal for P2d: an old install that syncs this bundle now needs `workflow-doctor --fix` (the existing `scaffold` next step) to get `.project/records/shipped/`, and
  its `graphify --check --json` gains `workflow` and `stats.decisionStatus`.

## 2026-10-22 P1-S5 acceptance (scenario H)

`graphify explain .claude/skills/<phase>/SKILL.md` per phase (non-`contains` connections): every phase lists its skill's phase doc (`phase-doc`) and its mirrors; roles and gating rules where the manifest declares them.
- shape: critique (dispatches), 0-shape.md. shape-lite: skeptic, appetite-auditor, knowledge-historian, security.md, 0-shape.md. critique: 5 projector/historian agents, 0-shape.md.
- plan: 1-plan.md (no agent or rule declared). build: build-error-resolver, boundaries.md, coding-standards.md, 2-build.md.
- audit: 7 reviewers (code-reviewer, security-reviewer, test-coverage-checker, ux-reviewer, i18n-checker, eval-runner, cross-pitch-conflict-checker), 5 rules, 3-audit.md.
- ship: 4-ship.md only; cooldown: 5-cooldown.md only. Unrelated community members: none; the remaining neighbours are `references` to scripts and docs the skill text names.
- Gap noted, not fixed here: ship, plan and cooldown list no roles or rules because their SKILL.md and phase docs name none to declare; the manifest records only what the files say.
- `instruction-loading.test.mts` 10/10 pass (11 tests, 1 skipped); AGENTS.md and CLAUDE.md identical. `changelog.mts` recorded 2.42.0. `setup-validator` READY. Full suite: only the pre-existing `[dataset-mapping]` failure.

## 2026-10-22 P2a-S5 generated done-work index

- `done-work-index.mts` owns "which pitches are compacted": `compactedSlugs` = legacy entries plus outcome-record file names, a record wins, one row per slug.
  `pitch-compress` (`doneWorkSlugs`) and `state-snapshot` (pitches + done-work sections) read it. Records are read from their folder, so they are found even when
  `done-work.md` is past the 64 KB read limit (it is 90.9 KB; its legacy entries past 64 KB are still not counted by the snapshot, which the index will fix as entries are replaced by lines in P2c).
- Applied to this repo: `.project/done-work.md` gains the empty generated block (`_No outcome records yet._`) before the first entry. 46 legacy entries byte-identical
  (checked against a saved copy: 90788 B before, 90905 B after; only the block was added). `pitch-compress inventory` output identical before/after (46 compacted), compared against a clean HEAD worktree.
- The 3 bundle-sync tests the plan expected to update did not need it (115 tests across bundle-sync, setup-validator, workflow-doctor green): they use their own fixtures, not the template header.
- **Process note (mine):** while capturing the inventory I ran `git stash` / `git stash pop` by mistake. Untracked files are not stashed; the pop restored every tracked change
  (25 modified files re-verified) and the two existing user stashes (`stash@{0}`, `stash@{1}`) were not touched. Nothing lost; no further stash commands.
- **LOC checkpoint (R1):** P2a ≈ 1,520 after S5, past the 1,500 stop line. Continued on the user's bare "Approve" to the gate that recommended option (a), S6 whole; flagged again at the next gate.

## 2026-10-22 audit (3 cycles, appetite cap reached)

- Reviews and records: see `audit-cycle-1..3.md` and `audit-records/`. Real defects found by reviewers: 1 must-fix class (case-aliased destination, v1 and v2), 14 should-fix, all fixed with tests. Every planted defect was caught by the reviewers given one.
- The first security dispatch (opus) hit an API timeout (3 min, then 10 min) and returned nothing. The audit's one allowed retry went to a fresh agent on a narrower scope. The harness then reported the original agent as resumed from its transcript; it finished too, so its report is recorded as a non-independent cross-check (`independent: no`).
- Author-run (not reviews): full suite after each cycle; v1 ledger bytes equal HEAD's (worktree comparison); six mutation checks on the new tests (all fail a test; removing the setup-validator FIFO guard makes the test hang instead of fail, which is weaker than a failing assertion in CI).
- Follow-up candidates (not done): fix or retire `[dataset-mapping]`; Graphify skips `build/` folders; `data-modeling`, `observability`, `tool-use` standalone; `writes` relation unused; adopt `.project/decisions/*.md`; the FIFO test should fail fast instead of hanging.

## 2026-10-22 P2d-S1 project-side migration

The owner requested P2d, then P2c with `orca=normal`. Startup confirmed bypassed; no workers were
dispatched. This authorizes build start; the plan's per-scope gates and the later per-slug campaign
approval/archive-read gates remain in force. S2/S3 and P2c are not implemented by this scope.

- `consolidation-migrate.mts` preflights every read before writes; no flags means dry run and `--apply`
  publishes only under `.project/`. Current project dry run reports 46 v1 ledgers, 46 legacy entries,
  16 status-less decisions and four unchanged scaffold steps. Nothing upgrades or deletes legacy records.
- Previous template SHA-256 values are pinned to b26b45b (README and decision template). Local copies
  are preserved and printed as comparisons. Marker insertion preserves every legacy entry and header
  byte; an existing generated block is validated and retained. All file reads are capped and pinned
  to descriptors; symlinks, hard links, nonregular files and unknown ledger versions are refused.
- Tests use real temporary trees; fixture identities use the shared realpath-aware helper. The POSIX
  FIFO probe is explicitly skipped on Windows. Test plan is the approved S1 behavior/refusal criteria,
  recorded in plan.md. No matching stack-specific rule companion exists beyond rules/README.md.
- Initial test failure: a swap-test mock spread a native Stats object and lost its prototype methods;
  the observed failure was `TypeError: opened.isFile is not a function`. The mock now preserves the
  Stats prototype and alters only the inode. The corrected test proves the expected refusal.
- Mutation proof: dry-run, local ownership, symlink, read-size, existing-index and concurrent-edit
  mutations each fail a relevant test. Removing only the first concurrent-edit check survives because
  the second check independently refuses the edit; removing both fails the concurrent-edit test.
  Mutations ran from temporary source/test copies; production source was not altered by mutation runs.
- No schema version is bumped. A full-suite pass is not claimed: the independently reproduced missing
  `state-ai-authoring/live-runs.md` test blocker from the ship attempt remains open.

Current-session exit evidence (`node --experimental-strip-types --disable-warning=ExperimentalWarning
--experimental-test-coverage --test-coverage-include='**/consolidation-migrate.mts' --test
ai-framework/scripts/consolidation-migrate.test.mts`, exit 0):

```text
ℹ tests 29
ℹ suites 0
ℹ pass 29
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
consolidation-migrate.mts | line 99.44% | branch 86.33% | functions 100.00%
```

Additional checks: setup-validator exit 0 (`READY`, 24 checks, 172 TypeScript entries parse);
workflow-doctor exit 0 (`READY WITH WARNINGS (1)`, existing state-graph.test.mts runtime-boundary warning);
relations exit 0 (`50 entries`, `0 problem(s)`); scoped diff whitespace check exit 0.
Changelog skill recorded the standalone utility as version 2.44.0 after workflow-doctor passed.
The S1 scope gate is pending; next approved work would be P2d-S2 integration, then P2d-S3 fixture.

## 2026-10-22 P2d-S2 sync and doctor integration

The owner approved S1 and continuation to S2. Orca remains bypassed for the original build invocation.
No workers were dispatched. S2 is implemented; the next scope gate precedes P2d-S3.

- Sync computes one consolidation next step when its source ships the migration tool. It names the
  command and a count of unique legacy compacted pitches. Fixtures hash all project records across
  dry run and two applies; only the existing sync baseline manifest is exempted. No migration or
  target-side script is executed. The source fixture's migration throws if executed, proving the boundary.
- Doctor labels valid legacy ledgers/entries as `info`, including this project's 46 compacted pitches,
  46 v1 ledgers, 46 legacy entries and 16 status-less decisions. Refused inventory is a `warn` with
  no count claimed; sync prints an unavailable count. Neither path misreads a refusal as zero.
- Shared inventory is read-only and uses S1's guarded reader. V1 sibling backups are excluded from
  active ledger totals and the same slug in a ledger and narrative entry counts once.
- The sync skill, its byte-identical Cursor mirror and the upgrade guide document old-tool first
  sync, new-tool second sync, then reviewed scaffold migration. Legacy content upgrades remain gated.
- Mutation checks from temporary source/test copies: removing guidance, changing doctor severity to
  fail, reporting refused inventory as zero, and double-counting ledger/entry slugs each fail their
  relevant behavior tests. No mutation remains in production files.

Current-session command evidence (all exit 0):

```text
node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/bundle-sync.test.mts ai-framework/scripts/workflow-doctor.test.mts ai-framework/scripts/consolidation-migrate.test.mts
ℹ tests 127
ℹ pass 126
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
ℹ duration_ms 39221.493834

node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/skill-defaults.test.mts
ℹ tests 28
ℹ pass 28
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 35884.010125
```

The single skip is the existing doctor Bun-syntax probe, conditional on the executing runtime;
this run used Node. Separate migration coverage: 30/30 tests pass, 99.47% lines, 86.71% branches,
100% functions. No full-suite pass is claimed; the prior stale live-evidence test blocker is unchanged.

`cmp .claude/skills/bundle-sync/SKILL.md .cursor/skills/bundle-sync/SKILL.md` exits 0.
`rg -n "consolidation-migrate" ai-framework/docs/versioning-and-sync.md .claude/skills/bundle-sync/SKILL.md`
finds both documented instructions. Setup-validator reports READY, 24 checks, 172 parsed TypeScript
entries. Workflow-doctor reports zero failures, the existing one runtime-boundary warning, and the
new informational legacy count. Graphify check is CLEAN with 119 knowledge entries. Scoped diff
whitespace checks pass. Changelog records integration version 2.45.0 after doctor passed.

## 2026-10-22 P2d-S3 partial implementation; three-strike stop

The owner approved S2 and continuation to S3. Orca startup confirmed bypassed. No workers were
dispatched. `installed-upgrade.test.mts` exports selected workflow/project paths from b26b45b;
it never exports secret files, recovery archives or historical pitch folders. The real installed
project fixture contains 46 v1 ledgers, 46 legacy entries, a locally installed registry-owned
skill and a project-local skill with an overlay.

The baseline upgrade now passes both sync passes, scaffold/config preparation, setup-validator
and graphify checks before consolidation migration (dual-read), delivered /state readers,
registry exemption, overlay validation, migration replay, legacy entry byte equality, durable
knowledge/ledger/overlay hashes, and conflicting local manifest preservation.

Three-line escalation record required by the build playbook:

- Tried: three current-session runs of `node --test ai-framework/scripts/installed-upgrade.test.mts`; corrected missing fresh-setup backlog/index generation and attempted to exclude installed-skill directories. The old-install case passed on runs 2 and 3; the fresh-install setup criterion failed on all three runs.
- Exact final failing output: `"status": "fail", "name": "Workflow doctor", "detail": "workflow doctor found a blocking issue"`. An isolated read-only doctor diagnostic reports `{status: 'fail', name: '.claude/skills/caveman/SKILL.md', detail: 'missing'}`.
- Hypothesis and proposed next step: `ownedPaths` returns lowercase `.claude/skills/caveman/skill.md`; the fixture's `.endsWith('/SKILL.md')` matches zero paths, so it copies an empty installed-skill directory. Read-only evidence: uppercaseSuffixMatches=0, lowercaseSuffixMatches=1. After human approval, normalize the suffix comparison and rerun the fresh-install exit, then the entire S3 test file. No fourth corrective edit/retry was made after the third result was observed.

The fixture's initial baseline conflict probe also needed its source-checkout marker
`ai-framework/workflow/overview.md`; that fixture correction is already present and the baseline
upgrade case passes. No installed-project production failure was found by that probe.

An additional safety acceptance from rollout input item 9 was reproduced separately: migration
did not refuse `.project/compaction/transaction.json`. The regression initially failed with
`AssertionError: Missing expected exception.` The migration now calls the existing shared
`requireNoPendingCompaction` before inventory or writes. The regression passes; removing the
call in a temporary source copy makes that same test fail. Migration plus pitch-compress tests:
96 passed, zero failed, zero skipped (current-session exit 0, duration 4914.097292 ms).
The migration suite alone is 31/31. This safety fix and the unfinished fixture are not released
or marked done; no S3 changelog entry has been created.

The fresh fixture uses the real knowledge renderer/overlay on an empty graph for offline
setup checks; P1 owns the separate real Graphify extraction proof. Hash preservation excludes
generated knowledge/index.md and the explicitly migrated README/template scaffold, while all
durable knowledge cards, ledgers and the local relations overlay remain checked byte for byte.

Current workspace setup-validator passes (READY, 24 checks, 173 TypeScript entries parse).
S3 remains downhill 75%, and P2c has not started. The full-suite diagnostic was launched before
the third S3 result was collected; its result will be appended separately. No fourth targeted
S3 attempt or further production/fixture edit follows this three-strike stop.

The already-running full-suite diagnostic has now completed: 85 files, 2,655 tests,
2,633 passed, 19 failed, three skipped, zero cancelled; exit 1, duration 112.380 seconds.
It reproduced the same fresh-install fixture failure. Other failures include the recorded
missing live-run file, the recorded load-sensitive 5 MB sanitizer time assertion (took
1799.9365000000003 ms) and dependent dataset-mapping assertions. These failures are not waived
or reported as passes. Diagnostic output: `/tmp/consolidation-p2d-full-tests.log`.

## 2026-10-22 P2d-S3 resumed after explicit approval

The owner approved correcting the lowercase suffix and resuming verification after the three-strike
stop. The fresh-copy filter now recognizes the lowercase paths returned by `ownedPaths` and removes
their whole installed-skill directories from a fresh bundle copy. A deterministic regression copies
a miniature source tree and proves no empty installed-skill directory remains while the canonical
skill survives. Restoring the uppercase suffix in a temporary test copy fails this regression with
`no empty orphan directory remains`; the production test file remains corrected.

The test helper explicitly selects the Node executable when hosted by Bun, since these installed
project checks exercise the documented Node invocation and flags. Fixture source exports, writes
and cleanup stay confined to owned temporary trees. No legacy-upgrade campaign or recovery archive
read was performed.

Current-session required S3 exit command, exit 0:

```text
node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/installed-upgrade.test.mts
✔ installed b26b45b project upgrades in two passes, preserving legacy data and project-owned relations (26650.434875ms)
✔ fresh-copy filtering excludes installed skill directories as well as their owned files (2.646333ms)
✔ fresh setup gets consolidation scaffold and passes verification without migration (7847.632875ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 34600.175
```

Current-session regression command, exit 0:

```text
node --test ai-framework/scripts/consolidation-migrate.test.mts ai-framework/scripts/pitch-compress.test.mts
ℹ tests 96
ℹ suites 0
ℹ pass 96
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5205.517667
```

Setup-validator is READY (24 checks, 173 TypeScript entries parse), graphify check is CLEAN
(119 knowledge entries), and workflow-doctor has zero failures with its one existing runtime-boundary
warning. The final installed fixture is 198 lines; current migration + migration tests + installed
fixture total 645 lines, leaving P2d below the 1,500-line cap including S2's recorded additions.
Scope exits are now green. The repository-wide diagnostic is still running and will be recorded
separately; its earlier dataset failures have not been fixed or waived by this scope.

The resumed full suite completed with 2,656 tests: 2,635 passed, 18 failed, three skipped,
zero cancelled (85 files; exit 1; duration 114.403 seconds). All three installed-upgrade tests
pass in that run. The failures are confined to state-fragment/state-fragment-dataset: the missing
live-run record, the 5 MB sanitizer timing assertion and its dataset-mapping cascade. This does
not establish a green repository suite or remove the prior ship blocker. Detailed local output:
`/tmp/consolidation-p2d-full-resumed.log`.

After workflow-doctor passed, changelog.mts recorded version 2.45.1 for the installed-project
verification and pending-compaction guard. No unrelated dataset tests were changed or skipped.

Final graph rebuild (`node ai-framework/scripts/graphify.mts`) exits 0: CLEAN, 119 knowledge
entries and 336 knowledge links; graph.json and the generated knowledge index refreshed, with
23 workflow stub nodes. S3 is done against its scope exits; the final scope gate is pending
before P2c-S1. The full-suite failures remain explicit and continue to block a ship claim.

## 2026-10-22 P2c-S1 status and read-only preparation

The owner approved P2d-S3 and continuation to P2c-S1. Startup confirmed Orca bypassed for the
original invocation. No workers were dispatched. No live archive read, content upgrade, ledger
rewrite, legacy narrative replacement or pitch removal was performed.

- `legacy-upgrade.mts status [--json]` classifies one row per slug from active ledgers, legacy
  entries, outcome records and generated index lines. A v2 ledger with a valid record/index is
  upgraded only after its legacy narrative is retired; incomplete combinations stay partial.
  Preserved v1 siblings retain the original tier without introducing duplicate rows.
- `prepare SLUG` collects the narrative entry, existing compact record and ledger-linked durable
  knowledge. Every unresolved content judgment and original section hash remains needs-decision.
  Evidence includes whole-file SHA-256 and a bounded excerpt with an explicit truncation flag.
  The draft mapping fails ledger validation; the draft outcome fails final outcome lint.
- Read-only spies guard archive existence/stat/list/open/read operations. Opt-in archive preparation
  requires a reason, appends a descriptor-pinned receipt before any archive access, then checks the
  chosen manifest/checksum and required source file hashes. It does not claim full archive verification;
  the S2 apply exit still requires pitch-archive verify. Only synthetic temporary archives exercised
  the approved-read branch in this scope.
- Guards cover wrong working directory, unsafe paths, secrets, symlinks, version refusals, byte
  budgets, malformed index markers, receipt bounds and pending compaction. Shared I/O and archive
  bounds are reused rather than copied. No schema version was bumped.
- Seven temporary source mutations are caught: default archive access, pointer-tier boundary,
  premature upgraded status, missing approval receipt, unchecked archived source hash, invented
  section hash and removed aggregate scan budget. Production source was not altered by mutation runs.

Current-session required tests (exit 0):

```text
node --experimental-strip-types --disable-warning=ExperimentalWarning --experimental-test-coverage --test-coverage-include='**/legacy-upgrade.mts' --test ai-framework/scripts/legacy-upgrade.test.mts
ℹ tests 16
ℹ suites 0
ℹ pass 16
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 299.4345
legacy-upgrade.mts | lines 100.00% | branches 83.13% | functions 100.00%
```

Live inventory (`node ai-framework/scripts/legacy-upgrade.mts status --json`, exit 0):

```text
{"count":46,"legacy":46,"A":19,"Bsmall":22,"Blarge":5}
```

Live read-only preparation (`node ai-framework/scripts/legacy-upgrade.mts prepare readme-split`, exit 0):

```text
{"slug":"readme-split","state":"needs-decision","sections":8,"evidence":2,"otherFilesState":"needs-decision"}
```

Current-session shared regression/integration commands (exit 0):

```text
node --test ai-framework/scripts/consolidation-migrate.test.mts ai-framework/scripts/pitch-archive.test.mts
ℹ tests 70
ℹ pass 70
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ duration_ms 9458.394583

node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/bundle-sync.test.mts ai-framework/scripts/workflow-doctor.test.mts ai-framework/scripts/installed-upgrade.test.mts
ℹ tests 100
ℹ pass 99
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ duration_ms 38226.488875
```

The one skip is the existing doctor Bun-syntax probe when hosted by Node. Setup-validator reports
READY (24 checks, 175 TypeScript entries parse); doctor has zero failures and its existing one
runtime-boundary warning. Graphify check and rebuild exit 0, CLEAN: 119 knowledge entries, 336
knowledge links, 23 workflow stub nodes. Scoped and new-file whitespace checks pass. Changelog
records version 2.46.0 after doctor passed. All 46 ledger bytes and the legacy narrative bytes
remain equal to HEAD. The prior full-suite state-fragment/dataset blockers are not fixed or waived;
no new full-suite pass is claimed.

Open planning details for the next scopes: original section hashes cannot be inferred from compact
summaries, even in tier A; S2 must prove provenance without bypassing archive approval. The active
baseline script currently counts the generated index heading as an extra entry (47 rather than 46)
and must exclude .v1 backups before S5 closing measurements. These are recorded in plan.md rather
than silently changing historical baseline facts. S1's scope gate is pending before S2 apply tooling.

## 2026-10-22 P2c-S2 approved apply tooling

The owner approved S1 and continuation to S2. The original build invocation still carries
`orca=normal`; startup reported bypassed. Read-only agents checked metrics and reviewed S2; no
parallel writer or Orca worker ran. No real archive was read and no real pitch was upgraded.

Apply now validates original archived source bodies through the same v2 section/file validator
as pitch-compress. The existing transaction atomically writes the exact preserved v1 sibling and
the v2 active ledger. Later stages publish a lint-clean outcome, generate the index, retire only
that slug's bound narrative, and rebuild/check the graph. Completed-stage replay rechecks the
approved payload, v1 bytes, archive, destination bindings and final records. Pending compaction
journals refuse and retain the existing recovery path. Dry-run validation only writes its explicitly
approved archive-read receipt. New approval inputs support the shared TOON/JSON reader.

Original destination content is checked against the commit that introduced the v1 ledger. A
reviewer caught that preparation-time hashes alone could not detect earlier changes; tests now
mutate a destination before preparation and require the historical refusal. Missing/shallow Git
history refuses rather than substituting freshly prepared evidence. Git object reads are bounded,
use literal paths, disable replacement objects and lazy fetching, and never echo raw Git output.
A newly chosen destination also needs its explicit approved hash. The focused rereview reports no
must-fix or should-fix findings. Campaign runs may stop on unavailable or changed historical proof;
this scope does not waive that refusal or authorize repairing history.

Current-session exit evidence:

```text
node --test --experimental-test-coverage --test-coverage-include='**/legacy-upgrade.mts' ai-framework/scripts/legacy-upgrade.test.mts
ℹ tests 43
ℹ suites 0
ℹ pass 43
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6691.472792
legacy-upgrade.mts | line 100.00% | branch 80.66% | functions 100.00%
exit 0
```

This includes SIGKILL after each of the five completed steps, subsequent successful replay,
immutable archive/v1 hash tables, snapshot and inventory deduplication before/during/after,
original source and current/historical destination conflicts, shared v2 refusals, explicit TOON
alternate-destination approval, CLI --apply gating, and real bundle graph validator/rebuild commands
with a fixture Graphify executable producing an empty extraction base. The fixture proves the real
knowledge overlay and index publication; it does not claim independent Graphify extraction.

```text
node --test ai-framework/scripts/pitch-compress.test.mts ai-framework/scripts/pitch-archive.test.mts ai-framework/scripts/outcome-record.test.mts ai-framework/scripts/done-work-index.test.mts ai-framework/scripts/ledger-schema.test.mts
ℹ tests 173
ℹ pass 173
ℹ fail 0
ℹ skipped 0
ℹ duration_ms 9896.388
exit 0

node --test ai-framework/scripts/consolidation-migrate.test.mts ai-framework/scripts/state-snapshot.test.mts
ℹ tests 133
ℹ pass 133
ℹ fail 0
ℹ skipped 0
ℹ duration_ms 6711.089167
exit 0
```

Seven isolated scratch mutations were caught: bypassed archive approval, skipped since-commit
comparison, skipped destination binding, missing original-body-hash refusal, skipped approval
identity, omitted narrative retirement and lost v1 sibling. The last mutation initially appeared
invalid to the scratch runner because its missing sibling raised ENOENT rather than an assertion;
a rerun added an explicit sibling-exists assertion in the scratch test and caught the mutation.
Every scratch file was removed. Production was never mutated.

Incident: the first real-graph integration assertion failed `0 !== 2` after apply itself succeeded.
Cause: the assertion looked at `type`, while Graphify overlay nodes use `node_kind: knowledge`.
Fix: assert the actual field and both knowledge entries; the full 43-test scope command passed twice.

```text
node ai-framework/scripts/workflow-doctor.mts
Workflow status: READY WITH WARNINGS (1)
Validated 765 checks.
exit 0 (existing runtime-boundary warning for state-graph.test.mts)

node ai-framework/scripts/setup-validator.mts
PASS  TypeScript entries: 175 TypeScript file(s) parse
Setup status: READY
Validated 24 checks.
exit 0

node ai-framework/scripts/graphify.mts --check
Knowledge graph: 119 entries (16 decisions, 53 patterns, 2 entities, 48 issues), 336 links.
Graph status: CLEAN
exit 0

node ai-framework/scripts/graphify-relations.mts --check
relations: 50 entries, 135 mirrors, 41 reads, 20 dispatches, 8 phase-doc, 0 problem(s)
exit 0

node ai-framework/scripts/graphify.mts
Graph status: CLEAN
Wrote graphify-out/graph.json and .project/knowledge/index.md; added 23 stub node(s).
exit 0

node ai-framework/scripts/legacy-upgrade.mts status --json
46 pitches; 46 legacy; 0 partial; 0 upgraded.
exit 0

Independent Git HEAD byte comparisons
46 unchanged active v1 ledgers; 46 unchanged legacy narratives.
exit 0
```

Changelog recorded version 2.47.0 after doctor passed. The utility and its tests remain below the
P2c tooling estimate, with shared-hook changes documented in plan.md/deviations.md. No application
build/typecheck/lint/i18n command applies to this script bundle. The full suite was not rerun in S2;
the prior 18 state-fragment/dataset failures remain open and unwaived, so this is not ship approval.

### Metrics validation requested during S2

Initial inspection at 17:05 UTC found only Claude usage in both local snapshots (last updated
15:57 UTC): automatic primary-turn Codex workflow capture is not wired, as harnesses.md documents.
Codex's existing native hook captures subagent completion events, with token/cost usage unavailable.
Neither build skill nor phase instructions require manual capture, so this was an integration gap.

At 17:08 UTC the existing workflow-metrics record API accepted truthful prospective Codex
phase.started and skill.used events for pitch connected-memory-consolidation, build scope S2,
activity codex-observed-p2c-s2-20261022-01. The schema accepts S2 rather than P2c-S2. The observed
segment begins at recording time, not at a fabricated historical scope start. The workflow snapshot
confirmed one Codex phase start and one build skill event. Native hooks also recorded the two
read-only subagent completions as Codex, with reportedUsageCount 0 and unavailableCount 2.
No token/cost totals were invented and no hook configuration was changed. A matching phase.finished
event is recorded when this observed scope segment is complete. Automatic primary-turn capture
remains unwired; these explicit events do not claim to repair that integration.

Scope gate: P2c-S2 is complete. Approval next enters P2c-S3 preparation; each real archive-reading
invocation still requires its own explicit per-slug approval. S3–S5 remain untouched.

## 2026-10-22 P2c-S3 preparation and source-read gate

The owner approved the completed S2 scope and entry into S3 preparation. The original build
invocation remains Orca-bypassed. Prospective Codex build S3 phase.started and skill.used events
were accepted before work; phase.paused was accepted at the source-read approval gate. Token/cost
usage remains unavailable. No worker was dispatched and no recovery archive was listed or read.

Read-only preparation succeeded for all 19 tier-A slugs. Every active v1 ledger matches its
introducing Git commit. Fifteen destination sets still match that commit; four have changed
historical destinations and remain stopped: codex-orca-coordinator-parity, orca-auto-start-all-phases,
runner-aware-runtime-boundary-validator and state-multipage-report. An initial prose count of
14 clear / 5 conflicting pitches was corrected against the actual preflight table (15 / 4) before
any campaign mutation.

The first source-review batch is bundle-sync-marker-fix, fix-workflow-runner-env and readme-split.
Their create-only TOON drafts live in this pitch's campaign directory. Proposed outcome links are
concrete; the 11 + 9 + 8 section classifications, dispositions and original hashes deliberately
remain unresolved. All three drafts parse through readDataFile; lintOutcomeText reports exactly
the intentional draft frontmatter error, so their proposed links otherwise pass. These are not
approved input files and cannot be committed as coverage.

Evidence: .project/runs/2026-10-22-p2c-s3-preflight.md. Current status remains 46 legacy, 0 partial,
0 upgraded; graphify --check is CLEAN (119 knowledge entries, 336 links). S3 remains open. Before
source review, request explicit archive-read approval naming these three slugs as required by the
approved P2c-S2 evidence contract; the previous approval authorized preparation only.

## 2026-10-22 P2c-S3 first-batch source review and apply preview

The owner approved source review for bundle-sync-marker-fix, fix-workflow-runner-env and readme-split.
Orca startup again reported bypassed for the original invocation. The existing Codex S3 activity
resumed through workflow-metrics before work. Each slug received a durable archive-read receipt
before its archive was inspected. Full archive verification passed; all source files were bounded,
checksum-verified and copied to a private temporary review cache. No source archive was written.

Verified source totals: bundle-sync-marker-fix 8,803 bytes / 8 files / 11 required sections / 7 other
files; fix-workflow-runner-env 23,059 bytes / 10 files / 9 sections / 10 other files; readme-split
17,154 bytes / 7 files / 8 sections / 7 other files. The audit-cycle file in the first pitch is
covered whole as a required section. Actual approval receipts are dated 17:33:55 UTC on 2026-10-22.

Three standard-profile read-only reviewers examined the full cached originals and existing retained
destinations. They neither read archives independently nor wrote repository files. Their findings
and subsequent proposal rereviews produced these staged supplements, without changing historical
compact records or backlog:

- bundle-sync-marker-fix: retain historical audit/verification scope, the sequential effective-base
  contract and exclusions. A rereview caught an overbroad draft statement about unknown bases;
  the supplement now distinguishes preserving an existing known base from absence of a never-known
  base. The behavioral section points to that precise supplemented contract.
- fix-workflow-runner-env: retain the original six audit acknowledgments, including unchanged
  operator-supplied evaluation, while distinguishing later old-Node uncertainty. Preserve child
  spawn-option/hook/fixture details, review budgets, author-run versus reviewer evidence, guard
  attribution and the unresolved sonnet versus gpt-6.1-sol provenance discrepancy. The original
  compact summary and backlog remain unchanged; the supplement explicitly describes their mismatch.
- readme-split: retain encoded-anchor/query-string and substring-reachability limitations, review
  exclusions, repair classes and documentation ownership rationale. The proposed outcome links
  to this concrete ownership decision rather than an unrelated standing installer decision.

The three proposed payloads are wrapped in state awaiting-apply-approval, so those files cannot be
mistaken for direct approved apply input. All 28 required sections are merged into durable content,
with original-body hashes computed from verified originals. All 24 other files are accounted for;
17 are retained and seven omitted as process-noise (three hill charts and four generic role prompts).
Material audit context and budgets from those prompts are retained in the runner supplement. There
are zero section omissions, zero other-reason gaps, zero accepted gaps and zero proposed new knowledge
entries. Every proposed outcome is below the shared 3,000-byte cap.

The proposed supplements remain staged under campaign/, with final destinations under
.project/records/legacy-upgrades/. Their relative links are authored for those final destinations.
No final supplement, outcome record or v2 ledger has been published. Required new and existing
destination hashes are bound into the proposed payloads.

Validation used isolated projected project trees. Existing knowledge dependencies were selected
through graph.json and copied only for the validator's dependency closure; the projected knowledge
graph was valid. The same P2a v2 validator accepted all three complete mappings, and outcome lint
accepted all three records including their staged final supplement links.

A second isolated rehearsal committed the exact v1 ledgers and unchanged destination bytes into
fixture Git history, reconstructed synthetic archives from the already-verified review cache,
published the staged supplements and exercised the real apply API. The actual bundle graph commands
ran against the fixture; a fixture Graphify executable supplied an empty extraction base. This does
not claim live one-hop navigation or independent Graphify extraction.

```text
node /tmp/p2c-s3-rehearse.mjs
bundle-sync-marker-fix: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
fix-workflow-runner-env: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
readme-split: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
Rehearsal: 3 generated index rows, 3 upgraded slugs; real bundle graph commands with fixture Graphify extraction; live archives not reopened
exit 0
```

The fixture was removed. Temporary verified review evidence is retained at
/var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/p2c-s3-source-review-LnhKLL
for any revisions before the live apply decision; it is not repository content and should be
removed once this batch is settled. The final payloads bind their original hashes independently.

Incident: temporary preview-generation code failed twice with `SyntaxError: missing ) after argument list`.
Cause: a nested Markdown backtick in a template string, then an array-style closing delimiter on push.
Fix: use an explicit backtick character and correct the delimiter; node --check and preview generation
then passed. No production script was edited and no fourth attempt occurred.

```text
node ai-framework/scripts/docs-links.mts .project/runs/2026-10-22-p2c-s3-preflight.md .project/runs/2026-10-22-p2c-s3-batch1-preview.md
2 file(s) checked, 0 broken link(s)
exit 0

node ai-framework/scripts/graphify.mts --check
Knowledge graph: 119 entries (16 decisions, 53 patterns, 2 entities, 48 issues), 336 links.
Graph status: CLEAN
exit 0

Independent HEAD byte comparisons
46 unchanged active v1 ledgers; 46 unchanged legacy narratives; all three historical compact records unchanged.
exit 0

legacy-upgrade status
46 legacy; 0 partial; 0 upgraded.
exit 0
```

The concrete mutation preview, including each full proposed outcome (at least ten lines), coverage,
closed omission reasons, supplement links and verification limits is in
.project/runs/2026-10-22-p2c-s3-batch1-preview.md. Approval next publishes these exact three supplements
and applies these exact three payloads, with explicitly authorized receipt-gated archive verification
for those named slugs. Live graph reachability and all per-slug live exits remain required afterward.
S3 remains open; four unrelated historical destination conflicts and the prior full-suite failures
remain unwaived. The S3 metrics activity pauses again at this apply gate rather than being completed.

## 2026-10-22 P2c-S3 batch 1 applied; navigation exit repaired

The owner approved the exact three-pitch preview, supplement publication and required verification
reads. Startup stayed Orca-bypassed. The S3 metrics activity resumed before work. Approved payloads
were unwrapped into create-only approved TOON inputs; all three exact supplement hashes matched.
One existing compaction transaction published the three final supplements, then the real CLI
applied bundle-sync-marker-fix, fix-workflow-runner-env and readme-split sequentially with --apply
and named archive-read approval reasons.

Each baseline-capture invocation logged its own receipt before archive I/O. Each apply invocation
also logged its receipt. Full before/after archive snapshots covered every source, manifest and
checksum: 10 + 12 + 9 = 31 files unchanged. All three original v1 ledgers are preserved byte-for-byte
as .v1.json siblings. The other 43 active v1 ledgers and the three historical compact records remain
byte-identical to HEAD. No source archive was written or removed. Exact hashes and identities are in
.project/runs/2026-10-22-p2c-s3-batch1-apply-evidence.toon.

Status is now 3 upgraded, 43 legacy and 0 partial. Three outcome records pass lint at 932, 1,044 and
964 bytes (shared cap 3,000). The generated index has three unique rows; 43 untouched legacy entries
remain. The shared compacted-slug reader counts all 46 exactly once. Initial affected legacy/outcome/
index tests passed 108/108 and setup-validator reported all 46 ledgers valid (43 v1, 3 v2).

Incident: the first live navigation exit failed despite graph rebuild/check succeeding. Each
`graphify explain <slug>` selected its outcome H1 with degree 1: only its containing page was linked.
Cause: outcome root-relative targets were not part of the inferred workflow-reference source set;
page and heading identity also differed from the node the user queries by slug.
Fix: add typed outcome-link edges from shared validated fields, attach them to matching slug headings
with page/stub fallback, and support outcome-only installed projects. Source bytes and path inspection
reuse the existing pinned reader/guard. Invalid or unsafe records refuse; compaction/secret targets
are rejected before inspection. Typed record links retain common destinations under their own shared
artifact bounds without increasing the 400-edge inferred-reference ceiling or disabling its hub rule.
No approved payload contents changed. D29 and the plan addendum own this necessary shared-reader repair.

The new behavior test reproduced the missing navigation before implementation. Two initial graph
regression runs then exposed the old fake runtime's missing lstat/ENOENT contract; adding realistic
lstat behavior resolved the 12 fake-only failures. The next graph/reader run passed 132 tests. A broader
342-test run found a single pitch-compress fixture whose published outcome was the placeholder
`record`; replace it with a valid no-link outcome so its positive destination-policy case tests the
intended policy. The destination-policy assertions are unchanged; the broad rerun passed all 342.
No same-exit failure sequence reached a third consecutive failed correction attempt.

Read-only review found accepted dot/empty path segments diverged between lint and graph targets.
Both now share normalizedTarget; tests cover ./README.md anchor dedup and docs//guide.md while
preserving traversal for refusal. The reviewer confirmed resolution with no remaining concrete
findings. Privacy I/O spies count attempts outside caught exceptions; five scratch mutations were
caught and removed (links, protected target gate, record lint, heading routing, shared-target retention).

```text
node --test ai-framework/scripts/graphify.test.mts ai-framework/scripts/graphify-refs.test.mts ai-framework/scripts/outcome-record.test.mts ai-framework/scripts/consolidation-migrate.test.mts ai-framework/scripts/legacy-upgrade.test.mts ai-framework/scripts/pitch-compress.test.mts ai-framework/scripts/state-snapshot.test.mts
ℹ tests 342
ℹ suites 9
ℹ pass 342
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 7531.55575
exit 0

node --test --experimental-test-coverage --test-coverage-include='**/graphify-refs.mts' ai-framework/scripts/graphify-refs.test.mts
19 passed; 0 failed/skipped; duration_ms 150.141416
graphify-refs.mts: 98.16% lines, 88.10% branches, 93.75% functions
exit 0

node ai-framework/scripts/graphify.mts explain bundle-sync-marker-fix
Degree: 6; five outgoing outcome-link destinations, including docs and decision.
node ai-framework/scripts/graphify.mts explain fix-workflow-runner-env
Degree: 6; five outgoing outcome-link destinations, including runtime docs and pattern.
node ai-framework/scripts/graphify.mts explain readme-split
Degree: 5; four outgoing outcome-link destinations, including README and retained ownership decision.
All exit 0. A direct graph assertion matches every declared destination file (5 + 5 + 4) in one hop.

node ai-framework/scripts/graphify.mts --check
Knowledge graph: 119 entries, 336 knowledge links.
Graph status: CLEAN
Workflow edges: 135 mirrors, 41 reads, 20 dispatches, 8 phase-doc, 189 references, 14 outcome-link
exit 0

node ai-framework/scripts/graphify-relations.mts --check
relations: 50 entries, 135 mirrors, 41 reads, 20 dispatches, 8 phase-doc, 0 problem(s)
exit 0

node ai-framework/scripts/outcome-record.mts lint <each of the three slugs>
All three exit 0.
node ai-framework/scripts/setup-validator.mts
READY; 25 checks; 46 valid ledgers (43 v1, 3 v2); 3 valid outcome records; 175 TS files parse.
exit 0
node ai-framework/scripts/workflow-doctor.mts
READY WITH WARNINGS (1); 765 checks; zero failures; existing state-graph.test.mts runtime-boundary warning.
exit 0
node ai-framework/scripts/docs-links.mts ai-framework/docs/knowledge-graph.md .project/records/legacy-upgrades
4 file(s) checked, 0 broken link(s)
exit 0
```

The navigation fix records version 2.47.1 after doctor passed. Core legacy tool/tests remain 722
lines; the small navigation/shared-reader/test additions keep P2c tooling below its 1,500-line cap,
though the original 950-line estimate now grows. The full suite was not rerun: the previous 18
state-fragment/dataset failures remain open and unwaived. No ship approval is claimed.

Result evidence: .project/runs/2026-10-22-p2c-s3-batch1-result.md. Batch 1 is done; S3 remains open.

### Tranche A current ledger

| Pitch | Campaign state | Evidence / next step |
|---|---|---|
| bundle-sync-marker-fix | done | batch-1 result; live exits pass |
| fix-workflow-runner-env | done | batch-1 result; live exits pass |
| readme-split | done | batch-1 result; live exits pass |
| opencode-handoff | done | batch-2 reviewed: 7 sections |
| orca-vendor-orchestration | done | batch-2 reviewed: 2 sections |
| orca-vendor-dispatch | done | batch-2 reviewed: 7 sections |
| orca-vendor-reconcile | done | batch-2 reviewed: 7 sections |
| ts-runtime-injection | done | batch-2 reviewed: 7 sections |
| independent-rereview-catch-up | source approval pending | batch-3 draft; introducing-commit evidence rechecked |
| native-safety-feasibility | source approval pending | batch-3 draft; introducing-commit evidence rechecked |
| orca-vendor-foundation | source approval pending | batch-3 draft; introducing-commit evidence rechecked |
| orca-vendor-reconcile-integration | source approval pending | batch-3 draft; introducing-commit evidence rechecked |
| runtime-test-helpers | source approval pending | batch-3 draft; introducing-commit evidence rechecked |
| state-quoted-fonts | not started | preflight passed |
| workflow-usage-metrics | not started | preflight passed |
| codex-orca-coordinator-parity | stopped: conflict | four destinations changed since introducing commit |
| orca-auto-start-all-phases | stopped: conflict | two destinations changed since introducing commit |
| runner-aware-runtime-boundary-validator | stopped: conflict | two destinations changed since introducing commit |
| state-multipage-report | stopped: conflict | one destination changed since introducing commit |

Five next-batch drafts were prepared without archive access. The next source-review request is
.project/runs/2026-10-22-p2c-s3-batch2-source-request.md; it names the five slugs explicitly and
covers source review only, with at most three read-only reviewers in either wave. No new archive
read or apply authorization is inferred. Metrics pauses S3 at that gate; scope is not complete.

Batch-1 cleanup: after the live exits and immutable-source evidence were recorded, the private
original-source review cache was removed. Approved payloads, original archive proofs and the
published supplements remain; no source history was copied into the campaign directory.

### P2c-S3 batch 2 — approved source review

The owner approved source review for opencode-handoff, orca-vendor-orchestration,
orca-vendor-dispatch, orca-vendor-reconcile and ts-runtime-injection. Each source-read
invocation logged its approval receipt before archive I/O; all five archives passed
full verification and all 42 original files were bounded, read and checked against
their manifests. Review uses private temporary copies. The shared parser identified
30 required sections and 42 other-file entries. At most three read-only source
reviewers run concurrently, in two waves. No batch-2 apply is authorized.

Metrics inspection confirms the S3 collector-clock activity is running, with three
recorded pause/resume pairs. This captures observed workflow activity; automatic
primary Codex token/cost capture remains unavailable. No token totals are inferred.

Batch-2 rehearsal incident: apply refused with “Commit-time destination evidence unavailable; upgrade stopped”.
Cause: the synthetic fixture committed records/knowledge but omitted the handoff's .project/context target.
Correction: include that unchanged context target in the fixture commitment; live targets were not modified.

Batch-2 link-check incident: running docs-links on the staged campaign location reported six missing targets.
Cause: supplement relative links intentionally resolve from their proposed final records/legacy-upgrades location.
Correction: check every supplement in the projected final tree with its linked targets copied; no published files changed.

### P2c-S3 batch 2 — exact apply gate prepared

Five source reviewers accounted for all 30 required sections and all 42 other files,
then checked the concrete proposals. Final payloads retain 28/30 sections (93.33%);
two process-only sections are omitted. Four other files are omitted: two process-noise
and two superseded. All six omissions use closed reasons; no accepted gaps or new
knowledge entries. Five supplements preserve missing lessons and explicit historical
contradictions without rewriting old records. Original bodies/hashes, not summaries,
bind the proposals. Original source totals: 185,845 bytes, 42 files.

Projected shared v2 validation, outcome lint and final-location supplement link checks
pass for all five. Outcome sizes: 963 / 1215 / 1077 / 1207 / 1258 bytes (cap 3000).
The final exact-payload isolated rehearsal passed real apply, upgraded status, lint,
v1 byte retention, synthetic-archive verification and idempotent replay for each slug.
The fixture used real Git commitments and real bundle graph commands with a fixture
Graphify extraction base; live one-hop navigation remains an apply exit. No root archive
was reopened for projected checks or rehearsal. Source cache remains private until batch
settlement so review revisions do not require another source read.

Concrete gate and full outcome samples: .project/runs/2026-10-22-p2c-s3-batch2-preview.md.
Proof hashes and outputs: .project/runs/2026-10-22-p2c-s3-batch2-preview-evidence.toon.
No batch-2 apply has run. Live status remains 43 legacy, zero partial, three upgraded;
the shared compacted-slug reader counts 46 once. Tier A remains 3/19; four historical
conflicts remain stopped. Prior 18 state-fragment/dataset failures remain open/unwaived.
Metrics recorded phase.paused at this apply gate (fourth pause, after three resumes),
keeping S3 incomplete. Observed workflow activity is captured; primary Codex token/cost
automation remains unavailable. Data-only staging requires no changelog increment.

Final pre-gate checks: graphify --check exit 0 (CLEAN, 119 entries/336 links); preview docs-links exit 0 (one file, zero broken links). Metrics re-read confirms S3 paused, four pauses/three resumes, zero unmatched transitions.

### P2c-S3 batch 2 — approved live apply complete

The owner approved the exact five-pitch preview. All supplements matched their approved
hashes and were published in one existing compaction transaction. Approved payloads match
the preview proof exactly. Each live invocation logged explicit approval before archive I/O.
All five status/lint/immutable-source/v1-retention exits passed. Native graphify explain
passes for every slug; direct graph assertions reach all 22 declared targets in one hop.
All 52 source/manifest/checksum files are unchanged. All 46 original v1 ledgers match HEAD.

Graphify check exit 0: CLEAN, 119 knowledge entries / 336 links, 36 outcome-link edges.
Relations exit 0: 50 entries, zero problems. Setup exit 0: READY, 25 checks, 175 TS entries
parse. Supplement docs-links exit 0: eight files, zero broken links. No code changed, so
no new version or broad regression rerun; 18 prior full-suite failures remain unwaived.
Live counts are 38 legacy / zero partial / eight upgraded; index eight rows / 38 narratives.
Tier A is 8/19; S3 is not complete. Four historical conflicts remain stopped.

Evidence: .project/runs/2026-10-22-p2c-s3-batch2-result.md and batch2-apply-evidence.toon.
Five next source drafts were prepared and Git-history checked without any archive access;
request: .project/runs/2026-10-22-p2c-s3-batch3-source-request.md. That gate authorizes only
source review. Metrics resumed then paused S3 (five pauses/four resumes); primary Codex
token/cost automation remains unavailable. Batch-2 private source cache removed on settlement.

### Owner-requested pause during batch-3 source review

The owner paused work before batch-3 proposals or apply. Approved source receipts and full
verification completed for independent-rereview-catch-up, native-safety-feasibility,
orca-vendor-foundation, orca-vendor-reconcile-integration and runtime-test-helpers.
The verified private cache remains at /var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/p2c-s3-batch3-review-GUxaba.
Inventory: 286,779 bytes, 63 files, 73 required sections, 61 other-file entries.
First-wave read-only reviewers read rereview/native/foundation sources; final mappings
were not yet assembled. Integration and helper source reviews remain pending. No batch-3
ledger/outcome/supplement publication or apply approval exists. Live tier A stays 8/19.
Metrics recorded the sixth pause after five resumes; no completion is claimed.

Archive-boundary incident to carry forward: native reviewer ran rg over .project with
patterns native-safety-feasibility|inode-anchoring|legacy.*ledger|ledger.*legacy and a
!*.json glob, reading archive text beyond the approved batch. Displayed archive matches
included native-safety-feasibility, independent-rereview-catch-up, ts-runtime-injection,
orca-role-pools, unified-toon-config, upstream-project-drift, collector-robustness and
path-safety-hardening. Output was truncated, so actual scanned scope is not established.
No displayed secret contents or writes were reported; undisplayed reads are not verified.
The reviewer stopped broad searches; inadvertent output is excluded from source provenance.
All three reviewers also reported filename-only rg --files .project enumeration; later
reads were constrained to the verified cache and explicit durable paths. Preserve this
incident candidly; do not retrospectively label those reads authorized.

### P2c-S3 batch 3 — exact apply gate prepared

Five source reviews were assembled into exact payloads from the verified private cache,
drafts and review notes only; no archive was listed, opened or searched. All 73 required
sections and 61 other files carry original-hash-bound judgments (286,779 source bytes,
63 files). Payloads retain 66/73 sections (90.41%); seven sections and 28 whole files
are omitted, all closed-reason process-noise. No accepted gaps, no new knowledge entries.
Five supplements preserve missing lessons and explicit historical contradictions. Outcome
sizes: 1424 / 1013 / 1371 / 1467 / 1208 bytes (cap 3000). Shared v2 validation, outcome
lint, final-location supplement link checks and the isolated apply/replay rehearsal
(fixture Git, synthetic archives, fixture Graphify) pass for all five.

Incidents: the first fixture link check reported one missing target each for two
supplements because linked files were not copied into the projected tree; corrected in the
fixture only. The review instruction to record a dangling wiki link in the orca-vendor-foundation
compact record was not borne out: its three [[...]] identifiers resolve to existing entries,
so the supplement notes only that the record uses identifiers and links the three files.
Native ship date (source 2026-09-26, index 2026-09-27) is unresolved; the outcome keeps the
index date.

Gate: .project/runs/2026-10-22-p2c-s3-batch3-preview.md; proof:
.project/runs/2026-10-22-p2c-s3-batch3-preview-evidence.toon. No batch-3 apply has run.
Live status remains 38 legacy, zero partial, eight upgraded; tier A 8/19; four historical
conflicts remain stopped.

### P2c-S3 batch 3 — approved live apply complete

The owner approved the exact five-pitch preview (.project/runs/2026-10-22-p2c-s3-batch3-preview.md).
All five supplement hashes matched; one compaction transaction published them, then the real
legacy-upgrade CLI applied independent-rereview-catch-up, native-safety-feasibility, orca-vendor-foundation,
orca-vendor-reconcile-integration and runtime-test-helpers sequentially with --apply and a named
archive-read approval reason each (receipts in .project/compaction/archive-reads.log). Approved inputs
are the unwrapped proposed payloads (campaign/*.approved.toon).

Exits: status shows 13 upgraded / 33 legacy / zero partial with zero problems; pitch-archive verify
valid for all five; all five v1 ledger siblings are byte-identical to HEAD; graphify rebuild then --check
CLEAN (119 entries / 336 links); relations 0 problems; setup-validator READY (25 checks); supplement
docs-links 13 files, 0 broken; graphify explain exits 0 for every new outcome record. Tier A is 13/19.
Not re-run: native-safety/foundation per-slug one-hop assertions beyond explain, and the full test suite
(no code changed; 18 prior failures remain unwaived). Four historical destination conflicts and the
token-time-report large-source proof remain open.

Metrics: S3 activity codex-observed-p2c-s3-20261022-01 resumed then paused (seventh pause, sixth resume)
at this boundary. The resume event was recorded after the work, so active time is undercounted. Primary
Codex token/cost capture remains unavailable. No evidence run file was written for this apply beyond
this entry.

### P2c-S3 batch 4 — source-review gate prepared

Remaining tier A is six: four have an unavailable compact-record destination (the historical destination
conflicts) and stay stopped. state-quoted-fonts (11 sections) and workflow-usage-metrics (22) are clean.
Their drafts came from `legacy-upgrade prepare` without --read-archive; no archive was opened. Request:
.project/runs/2026-10-22-p2c-s3-batch4-source-request.md. Awaiting owner approval for source review only.

### P2c-S3 batch 4 — exact apply gate prepared

The owner approved source review for state-quoted-fonts and workflow-usage-metrics. Each slug got a
durable archive-read receipt (.project/compaction/archive-reads.log), then full archive verification and a
private verified source cache; no archive was written. Two read-only reviewers worked from the cache and the
staged drafts. An assembly pass computed all hashes with the real bodyHashOf and ran the isolated rehearsal
(shared v2 validation, outcome lint, dry then real apply, v1 byte retention, archive verify, replay,
supplement links) against synthetic archives only. Retained sections 28/33 (84.85%); state-quoted-fonts
11/11, workflow-usage-metrics 17/22. 20 omissions, all process-noise; no accepted gaps.
One reviewer class (pointer) was outside the closed list and was recorded as know-how; one unsupported
reviewer claim (four planned scopes became three) was removed.
Preview: .project/runs/2026-10-22-p2c-s3-batch4-preview.md. No batch-4 apply has run. Live state remains
13 upgraded / 33 legacy; tier A 13/19; four historical destination conflicts remain stopped.

### P2c-S3 batch 4 — approved live apply complete

The owner approved the exact two-pitch preview. Both supplement hashes matched; one compaction transaction
published them, then the legacy-upgrade CLI applied state-quoted-fonts and workflow-usage-metrics with named
archive-read approval reasons. Status is 15 upgraded / 31 legacy / zero partial, zero problems. Archive verify
valid for both, v1 siblings byte-identical to HEAD, graph CLEAN (119/336), relations 0 problems, setup READY,
supplement docs-links 15 files 0 broken, graphify explain exits 0. Tier A is 15/19. Remaining four tier-A
pitches stay stopped on missing compact-record destinations. Full suite not re-run (18 prior failures
unwaived). Evidence: .project/runs/2026-10-22-p2c-s3-batch4-result.md and batch4-apply-evidence.toon.

### P2c-S3 remaining campaign: drift scan, guard decision, batch 5 started

A read-only scan (git only, no archive access) of the 30 remaining legacy pitches found 12 with byte-identical
destinations and 18 (the four tier-A conflicts and 14 B-small) whose living destinations changed after the
v1 ledger commit. Four tier-A "unavailable" notes were only the conventional compact-record path, which those
pitches never had; the real conflict is destination drift. The owner chose reviewed-drift acceptance.
Implemented in legacy-upgrade.mts (version 2.48.0, deviation D30): 46/46 legacy-upgrade tests on Node and
Bun, three mutants caught, changelog check and setup READY. The drift gate remains strict for any unreviewed
change.

The owner approved source review for agent-model-sweep, fix-instruction-conflicts, orca-engines-range,
path-safety-hardening and shape-lite. Each got a durable receipt, archive verification and a private verified
cache; five read-only reviewers worked from the cache. Assembly of the batch-5 apply gate is in progress; no
batch-5 apply has run. Live state: 15 upgraded / 31 legacy.

### P2c-S3 batch 5 — exact apply gate prepared

Assembly computed hashes with the real bodyHashOf and ran the isolated rehearsal (shared v2 validation, outcome
lint, dry then real apply, v1 byte retention, archive verify, replay, retired-narrative handling, supplement
links) against synthetic archives only: 5/5 pass. Sections 45/45 retained; 42 other files accounted, 33
retained, nine process-noise whole-file omissions (four hill.md, five reviewer prompts); no accepted gaps.
Unsupported reviewer claims were dropped. Preview: .project/runs/2026-10-22-p2c-s3-batch5-preview.md. No
batch-5 apply has run; live state 15 upgraded / 31 legacy.

### P2c-S3 batch 5 — approved live apply complete (with a tool fix)

The owner approved the exact five-pitch preview. Supplements published in one transaction; agent-model-sweep
applied. fix-instruction-conflicts then stopped with a narrative binding conflict: retiring the previous entry
had left an extra blank line that altered its neighbour's hash. No bytes were written by the failed call. Fixed
in 2.48.1 (retirement removes the entry's own separator; tests for last and middle entries, two mutants caught,
48/48 on Node and Bun); removed the one stray blank line from done-work.md after confirming it restored the
approved hash; applied the remaining four with named approval reasons. Status 20 upgraded / 26 legacy, zero
problems; all five archives valid, v1 siblings byte-identical to HEAD, narratives retired, graph CLEAN
(119/336), relations 0 problems, setup READY, docs-links 20 files 0 broken, explain exit 0. Not re-run: full
suite (18 prior failures unwaived). Evidence: runs/2026-10-22-p2c-s3-batch5-result.md and apply-evidence.toon.
Remaining: 26 legacy (4 tier-A drift conflicts needing drift acceptance, 16 B-small, 5 B-large).

### P2c-S3 batch 6 — exact apply gate prepared

The owner chose batch A (the clean pitches) and approved source review; capped at five per gate:
toon-machine-data, vendor-model-toon, workflow-usage-capture, orca-role-pools, upstream-project-drift
(instruction-compression and unified-toon-config deferred to the next batch). Each got a durable receipt,
archive verification and a private verified cache; five read-only reviewers worked from the cache. The first
assembly run was interrupted before writing anything and was relaunched from scratch. The isolated rehearsal
(shared v2 validation, outcome lint, dry then real apply, v1 byte retention, archive verify, replay, supplement
links, narrative retirement leaving 25 neighbouring entries byte-identical) passed for all five against
synthetic archives only. Sections 95/95 retained; 41 other files accounted, 35 retained; six process-noise
whole-file omissions (five hill.md, one build-start.md). Unsupported reviewer claims were dropped; plan.md and
shaping-draft.md of workflow-usage-capture were kept after a full read. Preview:
.project/runs/2026-10-22-p2c-s3-batch6-preview.md. No batch-6 apply has run; live state 20 upgraded / 26 legacy.

### P2c-S3 batch 6 — approved live apply complete

The owner approved the exact five-pitch preview. Supplements published in one transaction; toon-machine-data,
vendor-model-toon, workflow-usage-capture, orca-role-pools and upstream-project-drift applied sequentially on the
first attempt with named approval reasons (the 2.48.1 retirement fix held). Status 25 upgraded / 21 legacy, zero
problems; all five archives valid, v1 siblings byte-identical to HEAD, narratives retired (21 legacy narratives
remain), graph CLEAN (119/336), relations 0 problems, setup READY, docs-links 25 files 0 broken, explain exit 0.
Full suite not re-run (18 prior failures unwaived). Evidence: runs/2026-10-22-p2c-s3-batch6-result.md and
apply-evidence.toon. Remaining 21: the 4 tier-A drift pitches (codex-orca-coordinator-parity,
orca-auto-start-all-phases, runner-aware-runtime-boundary-validator, state-multipage-report), 15 B-small and
B-large (instruction-compression, unified-toon-config, and the rest of B-small).

### P2c-S3 batch 7 — exact apply gate prepared

Correction: the earlier note that clean B-small pitches remained was wrong; every clean B-small was already
done, and all 15 remaining B-small are drifted. Batch 7 is the last two clean pitches, instruction-compression
and unified-toon-config (both B-large). The owner said "next"; I took that as approval of source review.
Receipts, archive verification and a private verified cache preceded two read-only opus reviews. Assembly
verified each cited durable copy against the cache: the instruction-compression log/hill copies and the
unified-toon-config hill copy are byte-identical and are mapped to those copies; the s3-review analysis copy
differs (preface and rebased links), so its substance went into the supplement. Two unsupported claims dropped.
Isolated rehearsal passed for both (v2 validation, outcome lint, dry then real apply, v1 retention, archive
verify, replay, links, 20 neighbouring done-work entries byte-identical). Sections 55/55, 26/26 other files
retained, no omissions. Preview: .project/runs/2026-10-22-p2c-s3-batch7-preview.md. No apply has run; live
state 25 upgraded / 21 legacy.

### P2c-S3 batch 7 — approved live apply complete

The owner approved the exact two-pitch preview. Supplements published in one transaction; instruction-compression
and unified-toon-config applied sequentially on the first attempt with named approval reasons. Status 27 upgraded
/ 19 legacy, zero problems; archives valid, v1 siblings byte-identical to HEAD, narratives retired, graph CLEAN,
relations 0 problems, setup READY, explain exit 0. Full suite not re-run (18 prior failures unwaived). Every
clean pitch is now upgraded; the remaining 19 are destination-drift cases (4 tier A, 15 B-small) and need
acceptDestinationDrift with per-file before/after hashes. Evidence: runs/2026-10-22-p2c-s3-batch7-result.md
and apply-evidence.toon.

### P2c-S3 batch 8 — exact apply gate prepared (first reviewed-drift batch)

First drift batch, from the drift review (.project/runs/2026-10-22-p2c-s3-drift-review.md): state-ai-authoring,
state-deep-evidence, state-fragment-sanitizer, state-report-redesign and test-execution-performance, whose only
drift is .project/pitches/_followups.md (32 changed lines, none in their own followups lines). The owner
directed continuation; source review ran under receipts, archive verification and a private cache. Reviews and
assembly checked cited durable copies byte-for-byte; unsupported claims were dropped. Each payload carries
acceptDestinationDrift with committed sha256:b5b29119…ec10 and current sha256:d0404fd9…95f5 (re-verified
against the live file and the introducing commit b26b45b0 by the main thread). The isolated rehearsal refused
no-acceptance, wrong-committed, wrong-current and a later edit, and passed apply, replay, retention, archive
verify, links and 18 byte-identical neighbours. Sections 112/116 retained (96.55%); 45/47 other files; six
omissions (one superseded, five process-noise). One owner decision surfaced: state-ai-authoring live-runs.md
versus the failing state-fragment-dataset test. A premature "Apply" was held until the preview existed. No
batch-8 apply has run; live state 27 upgraded / 19 legacy. Preview:
.project/runs/2026-10-22-p2c-s3-batch8-preview.md.

### P2c-S3 batch 8 — approved live apply complete (reviewed drift)

The owner approved the exact five-pitch preview including the _followups.md drift pair. The live file's hash was
re-checked before publishing (unchanged), then supplements published and state-ai-authoring, state-deep-evidence,
state-fragment-sanitizer, state-report-redesign and test-execution-performance applied sequentially with
acceptDestinationDrift and named approval reasons. Status 32 upgraded / 14 legacy, zero problems; archives valid,
v1 siblings byte-identical to HEAD, narratives retired (14 remain), _followups.md untouched afterwards, graph CLEAN
(119/336), relations 0 problems, setup READY, docs-links 32 files 0 broken, explain exit 0. Full suite not re-run.
Open owner decision: live-runs.md vs the failing state-fragment-dataset test (recommended: restore and repoint,
as its own approved step). Remaining 14: four tier A (codex-orca-coordinator-parity, orca-auto-start-all-phases,
runner-aware-runtime-boundary-validator, state-multipage-report) and ten B-small (collector-robustness,
fix-orca-dispatch-resume-gate, metrics-report-dimensions, pitch-compaction, portable-skill-defaults,
portable-skill-installation, project-state-report, token-attribution, token-time-report, workflow-usage-state).
Evidence: runs/2026-10-22-p2c-s3-batch8-result.md and apply-evidence.toon.

### P2c-S3/S4 batch 9 — source reviews and exact gate ready

Owner directed completion and clarified review-only scope ends before repository work. Orca resume startup
blocked worker-identity-unavailable; owner explicitly chose orca=normal for this invocation; build startup
verified bypassed. Completed token-time-report large-source review: 39/39 full files, 34/34 full sections,
274950 source bytes, incremental scratch read ledger, all mappings and full supplement. Its preparation
log/hill copies are not byte-identical and were not used as lossless replacements.

Assembled five reviewed slugs (two tier A, three B-small), 90/90 retained sections and 79/79
other files accounted (60 retained, 19 omissions: three superseded and sixteen process-noise).
Shared-validator/outcome/transaction rehearsal against synthetic archives passes 5/5, 26 drift negative
controls refuse without state change, each preserves 13 neighbouring narratives and all source archive bytes.
Seven exact drift pairs bound to introducing commits and reviewed live files. No live archive reopened.
Preview: runs/2026-10-22-p2c-s3-batch9-preview.md; machine evidence adjacent. No batch-9 apply performed.
Live remains 32 upgraded / 14 legacy / zero partial. Nine will remain after batch 9; current tracker is
remaining-work.md. Focused fragment/dataset diagnostic: 208 tests, 207 pass, one missing live-record path;
earlier timing failures remain historical. Separate evidence-path repair and final gates remain required.

Batch-9 final staging checks: setup READY (25 checks; 46 ledgers, 32 outcomes, 175 TypeScript entries);
preview/tracker docs-links 2 files / 0 broken; all staged supplement hashes and existing bindings current.
Global diff --check still reports four existing blank-at-EOF findings in _followups.md, the active pitch,
workflow-v3-rollout pitch and forced cooldown run. Left bound/historical files unchanged.

### P2c-S3/S4 batch 9 — approved live apply complete

Owner approved exact preview. Published five approved supplements and applied five payloads sequentially
with seven reviewed drift pairs and named source-read receipts. Live status 37 upgraded / nine legacy /
zero partial or problems; all v1 siblings byte-identical, archives valid with unchanged manifest hashes,
outcomes valid, narratives retired, approved bindings unchanged. Dry replay preflight passes for each.
Setup READY (25 checks), graph CLEAN (119/336), relations zero problems, supplement links 37/0 broken;
each new outcome slug has direct graph links to supplement/backlog. Full suite not rerun; separate
evidence-path repair remains. Result and machine proof: runs/2026-10-22-p2c-s3-batch9-result.md and
batch9-apply-evidence.toon. Owner then approved the named batch-10 source reviews; no batch-10 apply
is authorized.

### P2c-S3/S4 batch 10 — full source reviews and exact apply gate ready

Owner approved the five named source reviews. Per-slug receipts preceded archive reads; all five
archives verified and private complete caches created. Read 56/56 files, 250846 source bytes,
and 92/92 section bodies. metrics-report-dimensions adds pitch.md#no-gos absent from old 17-section
ledger; all 18 recoverable sections retained. All 92 sections merged, 46 other files accounted
(41 retained, five omitted: four process-noise hills, one superseded SHIPPED with identical run).
Ten exact per-file drift pairs reviewed. Main shared hashing, anchors, tracked links and bindings
pass. Isolated transaction/replay/archive/v1/index tests pass 5/5, including 35 drift refusals and
eight byte-identical neighboring narratives per fixture. No live archive reopened for rehearsal.
Preview: runs/2026-10-22-p2c-s3-batch10-preview.md; machine evidence adjacent. No batch-10 apply
run. Live remains 37 upgraded / nine legacy. Read-only preflight for the final four produced
batch11-source-request.md; their archives remain unread/unapproved. Full suite not rerun and
separate missing-evidence-path repair remains required.

Batch-10 final staging validation: preview/result/source-request links 3 files, zero broken; all
exact preview payload hashes, staged supplements, original v1 hashes and existing destination bindings
rechecked current. Apply and final-four source decisions presented separately; neither inferred.

### Batch 10 — approved live apply complete; final source reviews started

Five exact supplements published. First absolute approval-file argument refused before ledger writes;
relative path corrected and the same approved payloads applied successfully. Status 42 upgraded / four
legacy / zero partial/problems; four narratives remain, all 19 tier A upgraded. Original v1 siblings
byte-identical; archives valid with reviewed manifests unchanged; outcomes, bindings and dry replay valid.
Graph CLEAN (119/336), relations zero problems, setup READY 25, links 42 files/zero broken; each outcome
slug has direct supplement navigation. Machine proof and result are in runs/batch10 evidence.

Owner approved final-four source review. Receipts and full archive verification precede caches:
pitch-compaction 10 files/52339 bytes/15 sections; portable-skill-defaults 13/63017/16;
portable-skill-installation 12/61274/19; project-state-report 11/54215/20. No final-four apply approved.

Closing audit discovered TTR retained bytes: outcome 1127 + supplement 25661 = 26788 /274950 (9.74%),
not planned <=5%; outcome alone 0.41%. Kept open, no implied waiver. Dedicated fix-retired-live-evidence-path
triage preserves exact original matrix and one path constant; scratch dataset suite passes 54/54,
production selected test still fails ENOENT. Two incomplete fixture attempts were corrected without
production edits. Original consolidation audit cycle cap remains, separate fix gate pending.

## 2026-10-23 — resume verification

Batch 10 remains applied: 42/46 upgraded. Final batch source review and preview are complete: 46 full files, 230845 bytes, 70 retained sections, 40 other files accounted, four rehearsals and 46 negative controls passed. Rechecked all four proposals against current existing bindings and staged supplement bytes; payload hashes remain identical to the batch-11 preview. Final-four apply, separate evidence-path repair triage and both named closing exceptions remain unapproved. Refreshed remaining-work.md, which still described batch 10 as pending. No archive reopened and no upgrade or repair applied during resume.

## 2026-10-23 — final-four apply and closing exceptions approved

Owner approved all three items of the preceding gate. Published the four exact reviewed supplements and applied pitch-compaction, portable-skill-defaults, portable-skill-installation and project-state-report. Initial graph rebuild hit the sandbox uv-cache restriction; resumed the same approvals outside the sandbox, all four applied. Verification: 46/46 upgraded; 46 original v1 siblings byte-identical to HEAD; 46 archives valid; 46 approval hashes/outcome lints/navigation paths present; final-four dry replays, manifest hashes and all destination bindings pass. Link check: 47 supplement/asset files, zero broken links. Baseline: zero legacy narratives, 46 index rows, 9638 bytes, zero ledger pointers to done-work, sixteen decisions unchanged. Setup READY (25 checks), graph CLEAN (119 entries, 336 knowledge links, 276 outcome links), relations zero problems. Both exact named closing exceptions are recorded as owner-approved without calling the original criteria passed. Full Node suite is running outside the sandbox with one worker after socket/lease restrictions invalidated the sandbox run. Separate evidence-path repair is applied and passes its 54-test production dataset suite; no audit advancement yet. Existing diff-check EOF warnings in four pre-existing/bound historical files remain untouched.

## 2026-10-23 — build verification complete

Full supported Node suite outside the sandbox: 86 files, 2712 tests, 2709 pass, zero fail, three existing skips, exit 0 (436.955 seconds). Exact command: node ai-framework/scripts/run-tests.mts --runtime node --workers 1. Production dataset repair: 54/54. Workflow precision: 0/12 before, 12/12 after; unrestricted queries used. Mirrors and scoped whitespace check pass. Audit ownership remains separate: the original P1/P2a audit reached its three-cycle cap; P2d and P2c require their own planned reviews and the exact evidence-path repair has its own bug-fix audit. This is build-end evidence, not a fourth original audit, final audit acceptance or ship. The existing owner-approved direct-check verifier route is recorded in the Oct22 ship-verification run; no redundant route approval is requested here.

## 2026-10-23 — separate P2d/P2c cycle1 audits complete

All required roles completed with zero production findings and no applicable unverified checks. Initial scratch controls were caught and incomplete fixture copies were not passed; fresh narrow completion supplied installed and exact-byte proof. Read-only guard clean with unchanged HEAD/status/tree;430 copied source hashes unchanged. Security installed completion was resumed, marked independent:no for that amendment; two25s timeouts retained before a bounded35s pass. Code and coverage independently passed installed acceptance. Ownership instrument omissions clarified, not production conflicts. See audit-p2d-p2c-cycle-1.md and exact validated role records. Both big-batch audit-end gates remain pending. Repair has its own clean cycle1 audit and may prepare its separately gated ship. Original P1/P2a three-cycle cap unchanged.

## 2026-10-23 — audit-end accepted; separate repair shipped

Owner approved the P2d/P2c clean audit-end gates and exact repair ship proposal. Repair closed under its own receipt, preserving historical Claim: blocked and deferred FRLE-D1; cooldown1sinceforcedreview. P1/P2a/P2d/P2c still require four separate reconciliations/ship receipts. Ship preparation is authorized; no blanket umbrella closure or downstream rollout.

## 2026-10-23 — four separate ship proposals prepared

Read and triaged the complete build log and D1–D31; recorded knowledge-extraction.md. Added three issues and one accepted drift-binding decision, updated graphify entity and raised existing installed-orphan issue confidence. Resolved the separately shipped repair blocker with a dated note; added CMC-A1/A2/G1 followups without altering historical source sections. Prepared ships/p1, p2a, p2d and p2c proposals with distinct scope/release/audit ownership and final gates. Original exceptions, P2a appetite overrun, P1 lexical-query limit and unauthorized source-search incident remain explicit. No track is yet closed.

## 2026-10-23 — parallel-session reconciliation (Claude session joins Codex)

Two sessions drove this campaign on the same checkout. A Claude session ran batches 4-8 (v2.48.0 reviewed-drift
acceptance, v2.48.1 retirement fix, batch 8 applied with the _followups.md pair) while the Codex session
independently prepared and applied batches 9-11 and the separate fix-retired-live-evidence-path repair. Batch
9 overlapped: the Claude session began source review of the same five pitches (token-attribution,
workflow-usage-state, token-time-report, orca-auto-start-all-phases, runner-aware-runtime-boundary-validator)
at 2026-10-23T00:15Z, under the owner's "must go to 100%" direction, duplicating five archive-read receipts in
archive-reads.log and overwriting their draft.toon files with equivalent unresolved drafts. Nothing from that
duplicate work was applied or published; the large-source review agent was rate-limited and was not resumed.
The Codex payloads, supplements and approvals (written after, from 19:32 local) were unaffected: final status
is 46 upgraded / 0 legacy, zero problems. This is the same class as the earlier concurrent-writer risk; the
duplicate reads are recorded here and must not be read as authorized review of an unreviewed pitch.
The Claude session's private caches for batches 3-9 were removed. On resume the doctor reported a stale
graph (Codex had added three issues, one decision and updated two entries); regenerated with
node ai-framework/scripts/graphify.mts: CLEAN, 124 entries / 348 links, setup READY, relations 0 problems,
doctor READY with one existing runtime-boundary warning. Open: the four separate ship proposals
(ships/p1, p2a, p2d, p2c) await owner approval; no track is closed. .project/runs/2026-10-22-p2c-s3-drift-review.md
is a superseded interim working note (its pair counts predate batches 9-11).

