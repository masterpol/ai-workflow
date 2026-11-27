# Cross-pitch conflict review: fix-install-inherits-bundle-identity

**Review scope:** READ-ONLY comparison of `CHANGE.patch` (the bug-fix diff for pitch `fix-install-inherits-bundle-identity`) against the plans of all active pitches listed in `.project/status.md`.

**Changed files in the patch:**

```
.claude/skills/setup/SKILL.md
.cursor/skills/setup/SKILL.md
SETUP.md
ai-framework/docs/setup-validator.md
ai-framework/scripts/installed-upgrade.test.mts
ai-framework/scripts/setup-validator.mts
ai-framework/scripts/setup-validator.test.mts
```

Command used to extract the list:

```sh
grep '^diff --git' CHANGE.patch | sed 's/diff --git a\///g; s/ b\/.*$//g'
```

Output:

```
.claude/skills/setup/SKILL.md
.cursor/skills/setup/SKILL.md
SETUP.md
ai-framework/docs/setup-validator.md
ai-framework/scripts/installed-upgrade.test.mts
ai-framework/scripts/setup-validator.mts
ai-framework/scripts/setup-validator.test.mts
```

---

## Checklist (item-by-item)

| # | Check | Result |
|---|-------|--------|
| 1 | Read `.project/status.md` and enumerate active pitches | Done. Active: `fix-install-inherits-bundle-identity`, `04-greenfield-kickoff`, `05-workspace-recovery`, `06-workflow-v3-rollout`, `07-archify-local-library`. |
| 2 | Extract file set from `CHANGE.patch` | Done. 7 files changed; see list above. |
| 3 | Compare patch files with `04-greenfield-kickoff/plan.md` and `pitch.md` | **Pure overlap** on `.claude/skills/setup/SKILL.md`, `.cursor/skills/setup/SKILL.md`, and `SETUP.md` (A2 scope). The plan explicitly identifies the install-identity fix as a blocking entry condition. |
| 4 | Compare patch files with `05-workspace-recovery/pitch.md` | **Disjoint**. No shared files or adjacent concerns. |
| 5 | Compare patch files with `06-workflow-v3-rollout/pitch.md` and `consolidation-carry.md` | **Adjacent overlap**. Rollout will hand-merge root files (including `SETUP.md`) and depends on `setup-validator` passing in every project. |
| 6 | Compare patch files with `07-archify-local-library/pitch.md` | **Pure overlap** on `SETUP.md`. The pitch plans to edit bundle `.gitignore` / `SETUP.md` to keep canonical ignore rules visible. |
| 7 | Compare patch files with `fix-install-inherits-bundle-identity` own records | This pitch owns the changed files; the conflict review is against the other active pitches. |
| 8 | Record concrete failure scenarios with commands and outputs | Done below. |
| 9 | Write report to authorized path | Done (`reports/cross.md`). |

---

## Classification summary

| Pitch | Overlap class | Primary shared files | Severity |
|-------|---------------|----------------------|----------|
| `fix-install-inherits-bundle-identity` | Own change (reference baseline) | All 7 files | — |
| `04-greenfield-kickoff` | **Pure overlap** | `.claude/skills/setup/SKILL.md:123`, `.cursor/skills/setup/SKILL.md:123`, `SETUP.md:224` | High |
| `07-archify-local-library` | **Pure overlap** | `SETUP.md` (bundle setup docs) | Medium |
| `06-workflow-v3-rollout` | **Adjacent overlap** | `SETUP.md`, root entry files via hand-merge; `setup-validator` acceptance | Medium |
| `05-workspace-recovery` | **Disjoint** | None | None |

---

## Detailed findings

### 1. `04-greenfield-kickoff` — pure overlap (High)

**Owning evidence**

`04-greenfield-kickoff/plan.md` lines 21, 33, 87–88:

```
21: **The install-identity bug must ship first.** ... That fix edits `SETUP.md`, the entry files and `setup-validator`. Scope A2 also edits `SETUP.md` ...
33: | A2 | `/setup` routing and definition preservation | `.claude/skills/setup/SKILL.md`, `.cursor/skills/setup/SKILL.md` (full mirror), `SETUP.md`, `ai-framework/docs/setup.md` | ...
87: | `.claude/skills/setup/SKILL.md` | Claude directly; Codex ... OpenCode ... Cursor has a full mirror |
88: | `SETUP.md` | Every new install; `bundle-sync` (a flagged file, merged by hand); review-bench guard roots |
```

Command:

```sh
grep -nE '\.claude/skills/setup|\.cursor/skills/setup|SETUP\.md|setup-validator' .project/pitches/04-greenfield-kickoff/plan.md
```

Output confirms A2 owns the same three files the patch touches.

**Severity:** High

**Files/lines:**
- `.claude/skills/setup/SKILL.md:123–129`
- `.cursor/skills/setup/SKILL.md:123–129`
- `SETUP.md:224–242`

**Rule violated:** `patterns/one-owner-per-instruction-topic-guarded-by-contract-tests` and the plan's own entry-condition rule that the install-identity fix must ship before A2 starts.

**Concrete failure scenario:**
If greenfield A2 is branched from a base that already contains the install-identity fix but the A2 worker is unaware of the new wording, their edits to the `/setup` skill can revert the "replace project specifics" instruction and the validator-failure wording. A later install would again keep the bundle's identity sentence, causing `setup-validator` to fail.

Verification that the patch adds the failing sentence the validator looks for:

```sh
grep -n "project specifics are still this bundle's own" CHANGE.patch
```

Output:

```
56:+ * ("This repository is the `ai-workflow-portable` bundle itself") fails. A missing `.project`
127:+    const inheritedDetail = "project specifics are still this bundle's own (ai-workflow-portable); replace them with this project's";
```

If A2 overwrites `setup-validator.mts` or the setup skill text without preserving `BUNDLE_IDENTITY` and `inheritedDetail`, the new test in `setup-validator.test.mts` (patch lines 165–182) will fail:

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/setup-validator.test.mts
```

Expected symptom:

```
FAIL  AGENTS.md: project specifics are still this bundle's own (ai-workflow-portable); replace them with this project's
FAIL  CLAUDE.md: project specifics are still this bundle's own (ai-workflow-portable); replace them with this project's
```

**Merge order:** `fix-install-inherits-bundle-identity` must ship first (already the plan's entry condition). `04-greenfield-kickoff` A2 must rebase on top of it and re-run the mirror-diff and setup-validator exit commands before its own `/build` is marked done.

---

### 2. `07-archify-local-library` — pure overlap on `SETUP.md` (Medium)

**Owning evidence**

`07-archify-local-library/pitch.md` lines 20, 25, 47:

```
20: **Places**: `add-skill` install/update, `workflow-doctor`, project `.gitignore`, bundle `.gitignore` / setup docs.
25: Bundle `.gitignore` / `SETUP.md`: keep the canonical rules visible so fresh installs and manual setups inherit them.
47: - ✗ Do not delete or rewrite existing `.gitignore` content beyond appending missing rules.
```

Command:

```sh
grep -nE 'SETUP\.md|setup docs|\.gitignore' .project/pitches/07-archify-local-library/pitch.md
```

Output shows the pitch intends to edit `SETUP.md` (bundle setup docs) to keep ignore rules visible.

**Severity:** Medium

**File/line:** `SETUP.md:224–242` (patch section) overlaps with the archify pitch's planned `SETUP.md` edits.

**Rule violated:** No explicit rule conflict, but the no-go at line 47 means archify must append, not rewrite. The patch rewrites the `AGENTS.md` project-specifics paragraph in `SETUP.md`; a second append-only edit to the same section could create a contradictory instruction if merged in the wrong order.

**Concrete failure scenario:**
If archify merges second and appends its ignore-rule guidance immediately after the patch's new project-specifics paragraph without reconciling the two, a reader following `SETUP.md` step 4 may replace the project specifics but still miss the required `.gitignore` rules. Conversely, if archify merges first and the identity fix later overwrites the section, the ignore-rule guidance is lost.

Command to show the patch's `SETUP.md` context:

```sh
grep -n -A4 -B2 "Project specifics" SETUP.md
```

Output (from the patched scratch copy):

```
224: 3. Draft the root entry file:
225:     - All harnesses → `AGENTS.md`: keep the workflow sections placed in Step 1 and **replace** its `## Project specifics`
226:       section, which describes the `ai-workflow-portable` bundle, not this project (`setup-validator` fails a kept copy)
```

**Merge order:** Because `07-archify-local-library` is queued "at the end of current work" (`pitch.md:61`), it should merge after the install-identity fix. The archify edit must append its ignore rules and verify that the project-specifics replacement instruction remains intact.

---

### 3. `06-workflow-v3-rollout` — adjacent overlap (Medium)

**Owning evidence**

`04-greenfield-kickoff/plan.md` line 26 (cross-p dependency):

```
26: - `workflow-v3-rollout` merges root files by hand, so A2's `SETUP.md` change needs a reviewed merge there.
```

`06-workflow-v3-rollout/consolidation-carry.md` lines 12, 34:

```
12: | P2a | `consolidation-schemas` | ... `setup-validator` check | none until migrated |
34: 6. **Legacy data stays valid.** After sync without migration, every project must still pass `setup-validator`, doctor and `/state`
```

`06-workflow-v3-rollout/pitch.md` line 43:

```
43: - ✗ No merge without owner review of each PR.
```

Command:

```sh
grep -nE 'setup-validator|merge|root files|SETUP\.md|AGENTS\.md|CLAUDE\.md' .project/pitches/06-workflow-v3-rollout/pitch.md .project/pitches/06-workflow-v3-rollout/consolidation-carry.md
```

Output confirms rollout depends on `setup-validator` passing and on hand-merged root files.

**Severity:** Medium

**Files/lines:**
- `SETUP.md:224–242` (patch)
- `.claude/skills/setup/SKILL.md:123–129` and `.cursor/skills/setup/SKILL.md:123–129` (patch)
- `ai-framework/scripts/setup-validator.mts:111–144` (patch)

**Rule violated:** The rollout's no-go "No merge without owner review of each PR" and the cross-pitch rule that root-file changes must be hand-merged into the rollout.

**Concrete failure scenario:**
The rollout campaign will sync a release containing `SETUP.md`, the setup skill files, and `setup-validator.mts` into three projects. If the release containing the install-identity fix is not clearly tagged, or if the rollout's hand-merge of root files drops the new `BUNDLE_IDENTITY` check, installed projects could ship with entry files that still describe `ai-workflow-portable` instead of the project. `setup-validator` would then fail in those projects, breaking the rollout acceptance gate.

Command that would catch this in a rollout dry-run:

```sh
node ai-framework/scripts/setup-validator.mts --no-color
```

Expected failure output if the merge drops the identity check:

```
FAIL  AGENTS.md: project specifics are still this bundle's own (ai-workflow-portable); replace them with this project's
FAIL  CLAUDE.md: project specifics are still this bundle's own (ai-workflow-portable); replace them with this project's
```

**Merge order:** The install-identity fix ships in a release before the rollout campaign. The rollout's per-project PR checklist must include a verified `setup-validator` run and a manual diff review of `SETUP.md` and the entry files.

---

### 4. `05-workspace-recovery` — disjoint (None)

**Owning evidence**

`05-workspace-recovery/pitch.md` scopes the work to compaction recovery copies, session evidence, Git-backed restore, `pitch-archive.mts`, `ledger-schema.mts`, and `legacy-upgrade.mts`.

Command:

```sh
grep -nE 'setup|SETUP|validator|SKILL\.md|entry' .project/pitches/05-workspace-recovery/pitch.md
```

Output:

```
no matches
```

**Classification:** Disjoint.

**Files/lines:** None.

**Rule violated:** None.

**Concrete failure scenario:** None identified. The patch does not touch archive, ledger, compaction, or recovery code.

---

## Merge order recommendation

1. **`fix-install-inherits-bundle-identity`** — ship first (bug-fix, already marked next in status).  
2. **`04-greenfield-kickoff` part A** — rebase on the shipped fix; A2 must preserve the new project-specifics replacement wording and the `setup-validator` identity check while adding detection/routing text.  
3. **`07-archify-local-library`** — merge after the identity fix; append ignore-rule guidance to `SETUP.md` without overwriting the project-specifics instruction.  
4. **`06-workflow-v3-rollout`** — pick up a release that already contains the identity fix; hand-merge `SETUP.md` and entry files per project and verify `setup-validator` passes in each scratch-copy dry run.  
5. **`05-workspace-recovery`** — no merge dependency from this patch.

---

## What was tried that did not work

- Attempted `git diff --stat` in the scratch directory; it is not a git repository (`fatal: not a git repository`). File inspection relied on `grep` and `read` instead.
- The first `sed` command to list patch files contained an unescaped newline and failed. A corrected `sed` expression was used:

```sh
grep '^diff --git' CHANGE.patch | sed 's/diff --git a\///g; s/ b\/.*$//g'
```

- `07-archify-local-library` has no `plan.md` yet (still in `shape`), so the overlap assessment is based on `pitch.md` only. The exact lines and scope of its `SETUP.md` edit are therefore not verified.

---

*Report written by cross-pitch-conflict-checker for task `task_a0a9cb9a826b`.*
