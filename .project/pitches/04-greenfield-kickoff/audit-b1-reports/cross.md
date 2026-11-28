# Cross-pitch conflict review — greenfield-kickoff part B1

**Reviewer**: cross-pitch-conflict-checker · **Change**: `CHANGE.patch` (greenfield-kickoff part B1) · **Date**: 2026-11-27
**Scope**: read-only. Only `scratchpad/b1-audit/cross/` was read: `CHANGE.patch`, `status.md` and `pitches/{04,05,06,07}/`.
The repository checkout, the other review folders (`code/`, `security/`, `tests/`) and the parent folder were not read. No test was run.

---

## 1. Conclusion first

The change does **not** conflict with any other active pitch at the level of shared code. The overlap is concentrated in **instruction text**, in exactly three files: `SETUP.md`, `ai-framework/docs/setup.md` and `ai-framework/scripts/workflow-doctor.mts`. One of them, `SETUP.md`, is touched by the change (B1), claimed by pitch 07, and hand-merged downstream by pitch 06 — a three-way adjacency that needs an explicit order, and pitch 07 does not have one recorded.

| Other active pitch | Overlap with B1 | Basis |
|---|---|---|
| **05-workspace-recovery** | **disjoint** | Zero shared file. `.project/pitches/05-workspace-recovery/pitch.md:20` (extends `pitch-archive.mts` / `ledger-schema.mts`), `:26` (no history rewrite, knowledge and rules out of scope). The ownership grep over its folder returned no hit at all. |
| **06-workflow-v3-rollout** | **adjacent** (consumer, not co-writer) | It syncs the files B1 rewrites into three projects: `.project/pitches/06-workflow-v3-rollout/consolidation-carry.md:13` (P2d owns `consolidation-migrate.mts`, `bundle-sync`), `.project/pitches/04-greenfield-kickoff/pitch.md:120` ("root entry files are merged by hand there"). |
| **07-archify-local-library** | **adjacent** (co-writer of the same files) | `.project/pitches/07-archify-local-library/pitch.md:25` ("Bundle `.gitignore` / `SETUP.md`: keep the canonical rules visible so fresh installs and manual setups inherit them"), `:20` ("setup docs"), `:24` (a new `workflow-doctor` check). |

**No pure overlap** (same file, same lines, same intent) exists between B1 and any other active pitch. The nearest thing to pure is `ai-framework/docs/setup.md`, where B1 rewrote the "Set up" region and 07 wants to add the canonical ignore rules to that same region.

**Proposed merge order** (this is the actionable part):

1. **04-greenfield-kickoff B1 — ship first.** It is at the build end gate (`status.md:8`, "B1 built, not reviewed or committed"). It owns the detector and the install-route text; every later pitch reads it.
2. **07-archify-local-library — second, rebased.** It must be rebased onto B1's shipped `SETUP.md` / `ai-framework/docs/setup.md` (see F1, F2). Its doctor check must land before step 3 so the three projects get the final doctor.
3. **06-workflow-v3-rollout — third.** Pin a release that contains 04 (A + B1) **and** 07; re-run `readiness.md` at that release (`consolidation-carry.md:4-5`); hand-merge the two-route text and the root entry files into LAH, RN and climbing.
4. **05-workspace-recovery — last, despite its lower folder number.** See F7: its prior art (`legacy-upgrade.mts`, `pitch-archive.mts`, `ledger-schema.mts`) belongs to pitch 06's carried work.
5. **04 part B2 — after 06.** B2 writes `ai-framework/workflow/relations.toon` (`.project/pitches/04-greenfield-kickoff/pitch.md:110`), which pitch 06's P1 owns as bundle-owned (`consolidation-carry.md:11`).

Note the conflict with the recorded order: `status.md:13` says "Folder numbers are the **implementation order** (lower first…)" and lists 04 → 05 → 06 → 07. That order puts 05 before 06, and it puts 07 after 06 — the reverse of what the merge requires for 07, whose doctor check must precede the rollout's "doctor clean" gate (`06 pitch.md:28`).

---

## 2. What the change touches

Command run (work folder `…/b1-audit/cross`):

```sh
grep -n "^diff --git" CHANGE.patch
```

Output — 14 files:

```
1:diff --git a/.claude/skills/setup/SKILL.md
31:diff --git a/.cursor/skills/setup/SKILL.md
61:diff --git a/.project/evals/datasets/greenfield-kickoff.json
88:diff --git a/.project/pitches/04-greenfield-kickoff/deviations.md
105:diff --git a/.project/pitches/04-greenfield-kickoff/hill.md
120:diff --git a/.project/pitches/04-greenfield-kickoff/log.md
150:diff --git a/.project/pitches/04-greenfield-kickoff/plan-b1.md
162:diff --git a/.project/pitches/_followups.md
174:diff --git a/.project/status.md
187:diff --git a/README.md
235:diff --git a/SETUP.md
339:diff --git a/ai-framework/docs/setup.md
382:diff --git a/ai-framework/scripts/project-state.mts
456:diff --git a/ai-framework/scripts/project-state.test.mts
```

Ownership grep across the three other active pitches:

```sh
grep -rn "SETUP\.md\|README\.md\|docs/setup\.md\|project-state\|consolidation-migrate\|entry-import\|workflow-doctor\|gitignore\|\.gitignore\|status\.md\|_followups" \
  pitches/05-workspace-recovery pitches/06-workflow-v3-rollout pitches/07-archify-local-library
```

Output (abridged to the hits that establish ownership):

```
pitches/06-workflow-v3-rollout/readiness.md:55:  `.project/workflow-doctor.json` only without a toon), the reader rejects values other than `bundle`/`project`, and
pitches/06-workflow-v3-rollout/consolidation-carry.md:13:| P2d | `installed-sync` | `consolidation-migrate.mts`, `bundle-sync` next step `consolidation`, doctor `info` on legacy data, two-pass sync docs | ...
pitches/06-workflow-v3-rollout/consolidation-carry.md:25:   files plus the dry-run/apply of `consolidation-migrate.mts` (scaffold + markers only).
pitches/06-workflow-v3-rollout/consolidation-carry.md:33:   `graphify.mts setup`, then `consolidation-migrate.mts` (dry run, review, `--apply`). Document in `ai-framework/docs/versioning-and-sync.md` (P2d-S2).
pitches/06-workflow-v3-rollout/consolidation-carry.md:52:- Climbing Orca 1.4.224+ prerequisite (`_followups.md`) is unchanged.
pitches/07-archify-local-library/pitch.md:15:- [ai-framework/scripts/workflow-doctor.mts](...) — currently only checks `.project/evals/runs/` and `.project/evals/.cache/` in `.gitignore`; skill packages are unchecked.
pitches/07-archify-local-library/pitch.md:16:- Evidence from `../LAH`: `.gitignore` omits `.project/skills/packages/` and Archify wrapper paths; ...
pitches/07-archify-local-library/pitch.md:20:**Places**: `add-skill` install/update, `workflow-doctor`, project `.gitignore`, bundle `.gitignore` / setup docs.
pitches/07-archify-local-library/pitch.md:23:- `add-skill install` / `update`: before writing package files, ensure `.gitignore` contains the generic `.project/skills/packages/` rule ...
pitches/07-archify-local-library/pitch.md:24:- `workflow-doctor`: add a `.gitignore (skill packages)` check that fails when `.project/skills/packages/` or installed-skill wrapper directories are not ignored.
pitches/07-archify-local-library/pitch.md:25:- Bundle `.gitignore` / `SETUP.md`: keep the canonical rules visible so fresh installs and manual setups inherit them.
pitches/07-archify-local-library/pitch.md:27:**Connections**: human runs `/add-skill` → installer writes registry + package + wrappers and guarantees `.gitignore` ignores them → doctor fails clean checkouts that are missing the rule → project never commits a 22.5 MiB renderer as source.
pitches/07-archify-local-library/pitch.md:33:- Should wrapper paths be per-skill or a blanket `.claude/skills/*/`? → Per-skill explicit rules match the bundle root `.gitignore` ...
pitches/07-archify-local-library/pitch.md:34:- Does `bundle-sync` need to change? → No. `skills.md` already excludes registry-owned files from sync; this pitch only fixes the `.gitignore` side.
pitches/07-archify-local-library/pitch.md:47:- ✗ Do not delete or rewrite existing `.gitignore` content beyond appending missing rules.
```

**Zero hits** came from `pitches/05-workspace-recovery/`. That is the disjointness evidence for pitch 05: no shared file, no shared topic.

Also note the two grep hits that are *absence* evidence: **`entry-import` and `project-state` produce no hit in any other active pitch record.** `project-state.mts` is 04's own file (`pitch.md:109`, `plan-b1.md:31`); `entry-import.mts` — the module the change now imports `isBundleSetup` from — is **claimed by no active record**.

---

## 3. Findings

Severity scale: **high** = must-fix before ship; **medium** = must-fix or an explicit merge step recorded before the second pitch starts; **low** = record and order, no code change needed.

### F1 — medium — `SETUP.md` is co-owned by two active pitches and pitch 07 was shaped against text the change replaced

- **file:line**: `.project/pitches/07-archify-local-library/pitch.md:25` (ownership: "Bundle `.gitignore` / `SETUP.md`: keep the canonical rules visible so fresh installs and manual setups inherit them"), `.project/pitches/07-archify-local-library/pitch.md:20` ("setup docs"), `.project/pitches/04-greenfield-kickoff/plan-b1.md:32` (B1-S2 owns `SETUP.md`), `SETUP.md` as changed at `CHANGE.patch:235-338` (new "### Check project state on first-time setup" section at `CHANGE.patch:266-292`; the old "Project state (first-time only)" block deleted at `CHANGE.patch:326-334`; the `## Step 1` heading moved at `CHANGE.patch:253-258`).
- **rule violated**: one owner per instruction topic — `.project/pitches/04-greenfield-kickoff/pitch.md:22` cites the knowledge pattern `one-owner-per-instruction-topic-guarded-by-contract-tests` and `instruction-copies-drift-into-contradictions`; a pitch must record the files it writes, and 07 (`:20`) and B1 (`plan-b1.md:32`) both claim `SETUP.md` with no merge order between them.
- **failure scenario**: 07 was shaped 2026-11-26 (`status.md:11`). Part A already rewrote `SETUP.md` on 2026-11-27 (`.project/pitches/04-greenfield-kickoff/SHIPPED-part-a.md:41`: "`README.md`, `ai-framework/docs/setup.md` and `SETUP.md` describe the check"), and B1 rewrote it again. If 07's implementer applies its "canonical rules visible" text to the file as it looked on 2026-11-26, the patch context no longer exists (the `## Step 1` heading and the "Project state (first-time only)" paragraph moved), and the result is either a rejected patch or a silently dropped section. The concrete failure: the bundle ships an install route where the first-time check never runs, because the new "Check project state on first-time setup" section was replaced by 07's older text — the `unclear` question is never asked, setup proceeds on an empty project, and the detection result B1 exists to produce is lost on every fresh install.
- **command and output**: `grep -n "^diff --git" CHANGE.patch` → `235:diff --git a/SETUP.md` (only one writer of `SETUP.md` in the change); `grep -rn "SETUP\.md" pitches/07-archify-local-library` → `pitch.md:25` and `pitch.md:20`.
- **fix**: 07 is rebased on B1's shipped `SETUP.md`; or B1 merges 07's canonical-rules block itself before shipping so there is one writer. Record the order in `status.md`.

### F2 — low — `ai-framework/docs/setup.md` — same region, two writers, contradictory routing sentences

- **file:line**: `ai-framework/docs/setup.md` as changed at `CHANGE.patch:339-378` (steps 1–2 replaced by two route bullets at `CHANGE.patch:354-361`; the `unclear` bullet reworded at `CHANGE.patch:370`; the "Current limit" paragraph deleted at `CHANGE.patch:373-377`), `.project/pitches/07-archify-local-library/pitch.md:20` ("setup docs"), `.project/pitches/07-archify-local-library/pitch.md:25`.
- **rule violated**: same as F1 — one owner per instruction topic; a second writer in a rewritten region.
- **failure scenario**: 07 adds "keep the canonical rules visible" to this document. The natural insertion point is the "Set up" region that B1 just rewrote. The document then carries, side by side, B1's "Folder-in-project … It can tell a new project from an existing one" and a 07 sentence about the ignore rules; if 07's text also restates the detection limit ("the bundle's own files make it `unclear`"), the doc asserts two different behaviours of the same check with only route qualification to separate them. An installer reading the unqualified sentence skips the `unclear` question and proceeds as an existing project — the exact departure part A already had to record (`.project/pitches/04-greenfield-kickoff/SHIPPED-part-a.md:23`: "**not met** on the install routes").
- **fix**: 07 appends to the end of the document, or into a dedicated "Skill packages" section, and does not restate detection behaviour.

### F3 — medium — the detector gains a dependency (`entry-import.mts`) that no active record owns, and keeps one (`consolidation-migrate.mts`) that pitch 06 owns and syncs

- **file:line**: `ai-framework/scripts/project-state.mts` as changed at `CHANGE.patch:390` (`+import { isBundleSetup } from "./entry-import.mts";`) and `CHANGE.patch:389` (the pre-existing `readProjectText` import from `consolidation-migrate.mts`), `.project/pitches/06-workflow-v3-rollout/consolidation-carry.md:13` (P2d owns `consolidation-migrate.mts` and ships it to the projects), `.project/pitches/04-greenfield-kickoff/plan.md:89` ("`bundle-sync` (`SYNCED_DIRS`) … Sync picks the script up automatically").
- **rule violated**: every file a shipped script imports must have an owner and must travel with it (one owner per file; the sync must carry the detector's dependencies).
- **failure scenario**: pitch 06 pins a release and syncs `ai-framework/scripts/` into LAH, RN and climbing (`06 pitch.md:21-30`). If `entry-import.mts` is not in the shipped list or the sync set, the installed `project-state.mts` fails at import: `node ai-framework/scripts/project-state.mts --json` exits non-zero instead of printing a state, so the first-time setup check in those three projects **crashes rather than reporting `unclear`**, and setup has no fallback. If P2d later changes `readProjectText`'s contract, the detector's read semantics change in the installed projects with no record noticing.
- **command and output**: `grep -rn "entry-import" pitches/05-workspace-recovery pitches/06-workflow-v3-rollout pitches/07-archify-local-library` → no output (no other pitch claims it); the same grep over `pitches/04-greenfield-kickoff` → the module is not listed in 04's file list either (`pitch.md:108-111`, `plan-b1.md:31-32`).
- **unverified**: whether `entry-import.mts` is in `ai-framework/templates/shipped-files.txt` and in `bundle-sync`'s `SYNCED_DIRS`. I could not check: the repository checkout is out of bounds for this review. Check with `grep -n "entry-import" ai-framework/templates/shipped-files.txt` and `grep -n "SYNCED_DIRS" -A6 ai-framework/scripts/bundle-sync.mts`.

### F4 — medium — the rollout hand-merge of the new routing text is acknowledged but owned by nobody, and B1's plan carries no exit criterion for it

- **file:line**: `.project/pitches/04-greenfield-kickoff/pitch.md:120` ("`workflow-v3-rollout` should pin a release; root entry files are merged by hand there, so routing text needs a reviewed merge"), `.project/pitches/04-greenfield-kickoff/pitch.md:141` ("cross-pitch X2–X4 | guard roots, rollout pin, root-file merges | **Acknowledged**: listed under dependencies"), `.project/pitches/04-greenfield-kickoff/plan-b1.md:60-67` (B1-S2 exit criteria — none mention pitch 06 or a downstream merge), `.project/pitches/04-greenfield-kickoff/plan.md:88` (part A did record it: "Hand-merge note in the changelog entry. Rollout pitch 06 is told"), `.project/pitches/06-workflow-v3-rollout/consolidation-carry.md:4-5` ("`readiness.md` … **must be re-run** against the release that contains the work below"), `.project/pitches/06-workflow-v3-rollout/readiness.md:16` (conflict counts 13 / 159 / 143, measured at bundle 2.30.0), `status.md:8` ("B1 built, not reviewed or committed").
- **rule violated**: a dependency that changes shipped instruction text needs an owned merge step and a pinned release; an acknowledged cross-pitch finding must be carried into the plan that implements it (`plan-b1.md` dropped what `plan.md:26` and `plan.md:88` had for part A).
- **failure scenario**: pitch 06 pins the natural release — the one containing part A, since B1 is "built, not reviewed or committed" (`status.md:8`). The three projects then receive the copy-to-root-only text, because B1 **removes** "Copy the contents of this folder to the root of your target project" (`CHANGE.patch:209`) and replaces it with a two-route list (`CHANGE.patch:211-216`). A person in LAH follows a route the bundle no longer documents, and the folder-in-project route never reaches the three installed projects. If instead 06 pins after B1, the three PRs must hand-merge the two-route text, and `readiness.md`'s conflict table is stale — it was measured at 2.30.0 and the bundle is at 2.60.0 (`status.md:8`).
- **fix**: 06 pins a release containing 04 (A + B1) and 07; re-run `readiness.md` at that release; add the hand-merge of `README.md`, `SETUP.md`, `ai-framework/docs/setup.md` and the setup-skill mirror to each project's PR checklist.

### F5 — medium — on the new folder-in-project route the copied root entry files point at a `SETUP.md` that is not at the project root, and the change decided not to touch them

- **file:line**: `.project/pitches/04-greenfield-kickoff/deviations.md:100` (spike item 2: "`AGENTS.md` and `CLAUDE.md` say to read `SETUP.md` when `.project/` is missing, and Step 1 does not copy `SETUP.md`. The gap already exists today on the `SETUP.md` route between Step 1 and Step 3"), `.project/pitches/04-greenfield-kickoff/plan-b1.md:97` (deviation: "Nothing moves and the entry files do not change"), `README.md` as changed at `CHANGE.patch:199-201` and `CHANGE.patch:211-216`, `SETUP.md` as changed at `CHANGE.patch:316-318`, `.project/pitches/04-greenfield-kickoff/pitch.md:110` (`AGENTS.md`; `CLAUDE.md` are in 04's file list), `.project/pitches/04-greenfield-kickoff/pitch.md:120` (rollout merges root entry files by hand), `status.md:31` (the shipped `fix-install-inherits-bundle-identity` pitch owns the entry files' identity text).
- **rule violated**: an instruction must name a file that exists in the route it describes; one owner per instruction topic — the entry files' first-setup text belongs to the shipped identity fix and to 04's file list, and the change altered the route those files describe without updating them.
- **failure scenario**: a person follows the README's folder-in-project route (`CHANGE.patch:211-213`). Setup Step 1 copies `AGENTS.md` and `CLAUDE.md` to the project root. In the next session the tool auto-reads the root `AGENTS.md`, which still says "if `.project/` does not exist yet, read `SETUP.md` and install itself" — but on this route `SETUP.md` is at `ai-workflow-portable/SETUP.md`, not at the root, and the README's own wording only says the entry file self-starts "on the copy-to-root route" (`CHANGE.patch:201`). The tool either fails to find `SETUP.md`, or reads an unrelated file of that name in the project. Setup never starts, so the detection B1 exists to deliver never runs. Pitch 06 then hand-merges the same stale pointer into LAH, RN and climbing (`pitch.md:120`).
- **fix**: either the entry files learn the new route ("read `ai-workflow-portable/SETUP.md`" when that folder is present), or the change records the gap as an explicit open item in 04 with a named owner, so 06's hand merge does not propagate it.

### F6 — low — `_followups.md` and `status.md` are shared append targets of all four active pitches

- **file:line**: `.project/pitches/_followups.md` as changed at `CHANGE.patch:162-173` (new "From greenfield-kickoff B1 build" section), `.project/status.md` as changed at `CHANGE.patch:174-186` (the 04 row), `status.md:3` ("Index only — hard cap **100 lines**"), `status.md:42` (the backlog pointer), `.project/pitches/06-workflow-v3-rollout/consolidation-carry.md:52` ("`_followups.md`" prerequisite for climbing).
- **rule violated**: one writer per shared index at a time; the ship step owns the status row.
- **failure scenario**: 05, 06 and 07 will each append to `_followups.md` and rewrite their row in `status.md` when they ship. Two of them landing in the same review window produce a lost row in the active-pitch table, and the index stops listing an active pitch. The 100-line cap is not close (47 lines today), so the cap is not the risk; the lost row is.
- **fix**: keep the append-only discipline; the status row is written by the ship step, not by the build.

### F7 — low — pitch 05 is disjoint from the change, but its recorded position in the implementation order contradicts its real dependency

- **file:line**: `.project/pitches/05-workspace-recovery/pitch.md:17` ("Prior art: `legacy-upgrade.mts` `committedDestinations` already refuses shallow history and hashes blob bytes"), `.project/pitches/05-workspace-recovery/pitch.md:20` ("Prefer extending `pitch-archive.mts` and `ledger-schema.mts` over a second archive tool"), `.project/pitches/06-workflow-v3-rollout/consolidation-carry.md:12` (P2a owns the ledger v2 schemas), `.project/pitches/06-workflow-v3-rollout/consolidation-carry.md:14` (P2c owns `legacy-upgrade.mts`), `.project/pitches/06-workflow-v3-rollout/pitch.md:57` ("Depends additionally on: `connected-memory-consolidation` P1, P2a, P2d shipped (P2c tool preferably)"), `status.md:13` and `status.md:19-21` (folder order 04 → 05 → 06 → 07).
- **rule violated**: the implementation order must follow the dependencies; the recorded order does not.
- **failure scenario**: the folder order puts 05 before 06, but 05 extends `legacy-upgrade.mts` (P2c) and `ledger-schema.mts` (P2a), which pitch 06 gates on being shipped first. Starting 05 first means either extending tools that do not exist in the bundle yet or shipping the second archive tool that 05's own note forbids ("over a second archive tool", appetite A5).
- **unverified**: whether P1/P2a/P2d already shipped in this bundle. `status.md:28-34` shows only the last five ships (greenfield part A, the two fixes, workspace-slim, review-bench-hardening); none of them is the consolidation work. Check `grep -n "connected-memory-consolidation\|consolidation" .project/status.md` and the changelog.
- **fix**: state the dependency in 05's record, or move 05 after 06's P2a/P2c in the folder order.

### F8 — low — `ai-framework/scripts/workflow-doctor.mts` has three writers across the active set; B1's green gate is verified against a doctor that will change under it

- **file:line**: `.project/pitches/04-greenfield-kickoff/pitch.md:110` ("the doctor's script list"), `.project/pitches/07-archify-local-library/pitch.md:24` ("add a `.gitignore (skill packages)` check"), `.project/pitches/06-workflow-v3-rollout/consolidation-carry.md:13` ("doctor `info` on legacy data"), `.project/pitches/04-greenfield-kickoff/plan-b1.md:67` ("`setup-validator`, `workflow-doctor` and `graphify-relations --check` exit 0"), `.project/pitches/06-workflow-v3-rollout/pitch.md:28` ("Gauntlet: … doctor clean").
- **rule violated**: a green gate is only valid against the tools it names; three writers need an order.
- **failure scenario**: B1's exit gate passes with today's doctor. Pitch 07 then adds a check that fails when `.project/skills/packages/` or the wrapper directories are not ignored. Pitch 06's rollout gauntlet requires "doctor clean" in all three projects; LAH's `.gitignore` omits exactly those paths (`07 pitch.md:16`: "`.gitignore` omits `.project/skills/packages/`"), so the new check fails there and the rollout's last step blocks after the merge is already done.
- **fix**: 07 before 06 (already in the proposed order); B1 re-runs its doctor exit criterion if 07 lands first.

---

## 4. Overlap classification, per pitch, with the ownership line

### 04-greenfield-kickoff B1 vs 05-workspace-recovery — **disjoint**

Ownership: `.project/pitches/05-workspace-recovery/pitch.md:20` (`pitch-archive.mts`, `ledger-schema.mts`), `:17` (`legacy-upgrade.mts`), `:26` (no history rewrite; knowledge entries and rules out of scope). The change touches none of them: no shared file, no shared topic, and the ownership grep produced **no hit** under `pitches/05-workspace-recovery/`. The only common surface is the two shared index files (`_followups.md`, `status.md`) — see F6. Ordering consequence: none from the change; 05's position relative to 06 is F7.

### 04-greenfield-kickoff B1 vs 06-workflow-v3-rollout — **adjacent (downstream consumer)**

Ownership: 06 owns the sync, not the text. `.project/pitches/06-workflow-v3-rollout/pitch.md:21-30` (per-project `bundle-sync` dry-run → review → apply, one branch and PR per project), `.project/pitches/06-workflow-v3-rollout/consolidation-carry.md:13` (P2d ships `consolidation-migrate.mts` and the sync), `.project/pitches/04-greenfield-kickoff/pitch.md:120` (root entry files are merged by hand there). B1 rewrites exactly the files 06 hands over: `README.md`, `SETUP.md`, `ai-framework/docs/setup.md`, `.claude/skills/setup/SKILL.md` + the Cursor mirror, and `ai-framework/scripts/project-state.mts` + its test. Shared dependency on `consolidation-migrate.mts` (F3). Not pure: 06 never edits these files in the bundle, it copies them into other repositories. Merge order: 06 after 04 and 07.

### 04-greenfield-kickoff B1 vs 07-archify-local-library — **adjacent (co-writer of the same files)**

Ownership: `.project/pitches/07-archify-local-library/pitch.md:20` ("`add-skill` install/update, `workflow-doctor`, project `.gitignore`, bundle `.gitignore` / setup docs"), `:25` ("Bundle `.gitignore` / `SETUP.md`: keep the canonical rules visible so fresh installs and manual setups inherit them"), `:23` (the installer appends the ignore rules), `:24` (the doctor check), `:34` ("Does `bundle-sync` need to change? → No"). 07's writes land on B1's rewritten `SETUP.md` and `ai-framework/docs/setup.md`, and on the doctor that B1's exit criterion names. The band is the same topic — install-time file rules — which is why this is adjacent rather than disjoint, and why the order must be recorded. Not pure: the sections differ (routes vs ignore rules). Merge order: 07 after 04 B1, before 06.

### Cross-check against the previous audit

The part A audit already reached the same ordering and is the precedent for it: `.project/pitches/04-greenfield-kickoff/audit.md:120` — "Acknowledged | cross-pitch | Merge order: this ships before pitch 07 edits the doctor and `SETUP.md`, and before pitch 06 pins a release | Order recorded | Pitch records"; and `audit.md:117` — "Should-fix | cross-pitch | Installed skills add paths the shipped list lacks, so such a project is `unclear` (**pitch 07 owns that surface**); the list is generated from the working folder | Deferred; `unclear` is the safe result | Source". Part A's audit therefore already linked the detector to pitch 07's surface; B1 deepens that link by adding the source-folder skip and the starter-file rule, without re-recording the order.

---

## 5. Unverified items

- `entry-import.mts` membership in `ai-framework/templates/shipped-files.txt` and in `bundle-sync`'s `SYNCED_DIRS` — the checkout is out of bounds for this review. Needed for F3.
- Whether P1/P2a/P2d/P2c have shipped in this bundle (F7). `status.md`'s recent-ship table covers the last five only.
- Whether the pitch 06 hand-merge of `README.md`/`SETUP.md`/`docs/setup.md` actually happened in any installed project — needs `../LAH`, `../RN` and the climbing repo, all outside this folder.
- The live behaviour of the two routes (no live host ran the new instructions; `log.md` in the patch records "Not run: owner live smoke and golden case `check-before-copy`"). Out of scope here.
- I did not run any test, per the task; no behavioural claim in this report depends on a test result.

## 6. What I tried that did not work

- Reading `ai-framework/scripts/entry-import.mts`, `ai-framework/templates/shipped-files.txt`, `ai-framework/scripts/bundle-sync.mts` and the pre-change `project-state.mts`: **out of bounds** (repository checkout). F3 therefore stays partly unverified.
- Looking for an owner of `entry-import.mts` in the records: `grep -rn "entry-import" pitches/05-workspace-recovery pitches/06-workflow-v3-rollout pitches/07-archify-local-library` → **no output**. The same grep over `pitches/04-greenfield-kickoff` → the module is not in 04's file list either (`pitch.md:108-111`, `plan-b1.md:31-32`). Conclusion: no active record owns it.
- Looking for any cross-pitch note about `entry-import` or `isBundleSetup` in the four pitch folders: none exists; the change introduces the dependency silently.
- Searching the records for a merge-order entry that covers B1 specifically: `audit.md:120` records the order for **part A** only ("this ships before pitch 07 edits the doctor and `SETUP.md`"). B1 edits the same two surfaces and no record repeats the order for B1 — that is the gap F1/F8 report.

---

## 7. Summary table

| # | Severity | File:line | Rule | Pitch |
|---|---|---|---|---|
| F1 | medium | `.project/pitches/07-archify-local-library/pitch.md:25` + `SETUP.md` (`CHANGE.patch:235-338`) | one owner per instruction topic | 07 |
| F2 | low | `ai-framework/docs/setup.md` (`CHANGE.patch:339-378`) + `07 pitch.md:20` | one owner per instruction topic | 07 |
| F3 | medium | `ai-framework/scripts/project-state.mts` (`CHANGE.patch:390`) + `06 consolidation-carry.md:13` | owned and shipped dependencies | 06 |
| F4 | medium | `04 pitch.md:120`, `04 pitch.md:141`, `plan-b1.md:60-67`, `06 consolidation-carry.md:4-5` | acknowledged dependency must be owned in the plan | 06 |
| F5 | medium | `04 deviations.md:100`, `plan-b1.md:97`, `README.md` (`CHANGE.patch:199-216`), `04 pitch.md:120` | instructions must point at a file that exists | 06 / shipped identity fix |
| F6 | low | `.project/pitches/_followups.md` (`CHANGE.patch:162-173`), `.project/status.md` (`CHANGE.patch:174-186`) | one writer per shared index | 05, 06, 07 |
| F7 | low | `05 pitch.md:17`, `05 pitch.md:20`, `06 consolidation-carry.md:12,14`, `06 pitch.md:57`, `status.md:13,19-21` | implementation order follows dependencies | 05 |
| F8 | low | `04 pitch.md:110`, `07 pitch.md:24`, `06 consolidation-carry.md:13`, `plan-b1.md:67`, `06 pitch.md:28` | three writers of the doctor need an order | 07, 06 |
