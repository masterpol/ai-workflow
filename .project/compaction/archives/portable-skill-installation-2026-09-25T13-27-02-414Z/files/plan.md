# Plan: Tracked skill installation

**Pitch:** [pitch.md](pitch.md) · **Hill:** [hill.md](hill.md)
**Status:** Approved for build, 2026-09-24. User approval acknowledges impact and authorizes S1.
**Bet:** Approved by user. Defaults, compaction and state are also bet, queued after this foundation.

## Outcome

`add-skill` resolves exactly one requested skill, validates it before installation, asks for the missing location/scope and activation-phase choices, and installs a tracked copy usable by every vendor available in the receiving project. Missing or ambiguous skills and unsafe destinations produce no project changes. Bundle-sync carries the capability to existing instances without replacing their choices.

## Concrete contracts

### Source and selection

Accept a skills.sh skill URL or explicit `owner/repository/skill` identity. A bare skill name must resolve to one verified identity or present candidates before continuing. Verify repository revision, exact skill path, valid frontmatter, relative resources and license metadata in temporary staging. Network errors, missing skills, ambiguous identity and malformed contents are distinct failures, all without target writes. Do not execute downloaded code during inspection.

Use a pinned upstream Skills CLI only if a short compatibility spike proves exact selection, inspect-only behavior and resource preservation. Otherwise use explicit Git retrieval with argument arrays and checked paths. The persisted contract is independent of that choice. Never use a blanket install-all flag: the request is for one skill across project vendors, not every skill from its repository. Live verification can be a smoke test; regression tests use local repositories and deterministic fixtures.

### Local state and ownership

- `.project/skills/registry.json`: versioned identity, source URL/revision, license status, enabled state, phase bindings, runtime prerequisites, owned paths and original/current content hashes.
- `.project/skills/vendors.json`: validated project vendor descriptors and explicit overrides; no shell snippets. Bundle defaults live in `ai-framework/integrations/skill-vendors.json`.
- External skill source and resources live in `.project/skills/packages/<identity>/`; native entry points reference that source. This keeps external content distinct from the bundle-owned canonical catalog and avoids doctor treating upstream content as a workflow-authored skill with a required model profile.
- Global scope uses an equivalent registry and package store under an explicitly selected user location; the project registry records the link and relevant activation. Project bundle-sync must not silently mutate global files. If a host lacks the selected scope, show the conflict and require another explicit scope choice before installation.
- `list`, `disable`, `enable`, `update`, and `remove` are installer operations with the same ownership checks. Update previews source changes; removal deletes only unchanged owned files. Modified files remain as reported conflicts.
- Write a transaction journal and verified backups before replacing owned files; install registry last. A failed or interrupted operation restores the prior state. Revalidate hashes immediately before commit and serialize registry writes. Test crash recovery, not just normal exceptions.

### Vendor coverage

Determine project vendors from registered descriptors and existing harness artifacts. Here: Claude Code, OpenCode, Codex and Cursor. Missing local executables affect runtime verification, not inclusion. Contradictory config or an unknown vendor layout is an explicit unresolved coverage issue; never silently skip it or guess a destination.

Descriptors define skill paths, resource strategy, command wrappers, role invocation and capability limits. The registry is extensible to an additional project-local vendor. A fixture must demonstrate that extension without editing a hard-coded four-vendor branch. Shared destination directories must be deduplicated and collision-checked. Preserve existing native agents; add no new specialist role unless implementation proves one necessary. Agents invoking the workflow use the shared skill activation policy.

Keep canonical workflow commands at `.claude/skills/`, OpenCode wrappers in `.opencode/commands/`, Codex discovery in `.agents/skills/`, and generated Cursor mirrors in `.cursor/skills/`. Validate actual paths against the pinned host contracts rather than assuming upstream CLI defaults match this repository. On hosts without native commands or delegation, a discoverable skill invokes the same portable command or sequential role procedure.

### Sync and formatting

Bundle-sync continues to exclude source-project data. A separate, explicitly reported local migration initializes or upgrades only the receiving instance's skill metadata. New migration/adapter operations appear in dry run and are covered by the existing sync approval; no additional blanket approval loop.

Protected local skill files must not be misclassified as upstream removals or pruned. Record separate upstream hashes and installed/post-format hashes; formatting must not create recurring conflicts or hide genuine edits. Discover a target formatter from existing project configuration, run it with an explicit changed-file list, and abort/restore the skill transaction on failure. Do not introduce a formatter where none exists or run project-wide formatting.

Detect incompatible mixed schema/runtime versions after partial sync and stop activation with a repair report. Global registries remain untouched by project sync. Entry files and host configuration currently flagged for manual merge stay reviewable, preserving project-specific content. Document any required activation changes in the same report so copying files alone is not reported as full success.

## Delivery scopes

The two shaped slices are refined into three sequential deliverables to include tests and all mirrors within the appetite. Each is independently usable as a CLI or incremental integration; the entire feature is complete only after S3. Estimates exclude project planning records but include release records and generated mirrors. Re-scope before building if a deliverable exceeds 15 files or 1,500 LOC.

| ID | Deliverable | Files | LOC estimate | Depends on | Parallel with | Subagent? | Dispatch model |
|---|---|---|---:|---|---|---|---|
| S1 | Verified, transactional CLI and vendor registry | File set A (9 files) | 1,100–1,450 | — | — | No: resolver/ownership contracts must settle together | — |
| S2 | Native command and project activation across vendors | File set B (12 files) | 650–1,000 | S1 shipped | — | No: shares registry and validator contracts | — |
| S3 | Repeatable bundle-sync migration and formatting | File set C (12 files) | 900–1,400 | S2 shipped | — | No: sync ownership changes require sequential integration | — |

### File set A

Create:
1. `ai-framework/scripts/add-skill.js` — CLI and orchestration.
2. `ai-framework/scripts/skill-registry.js` — schema, ownership, transaction/recovery.
3. `ai-framework/scripts/skill-source.js` — source resolution and staging.
4. `ai-framework/scripts/skill-vendors.js` — validated descriptors and adapter rendering.
5. `ai-framework/scripts/add-skill.test.js` — local source fixtures and transactions.
6. `ai-framework/integrations/skill-vendors.json` — baseline vendor descriptors.
7. `ai-framework/integrations/skills.md` — API, state schema, lifecycle and host contract.
Update `VERSION` and `CHANGELOG.md` through the changelog script at release.

### File set B

Create `.claude/skills/add-skill/SKILL.md`, `.agents/skills/add-skill/SKILL.md`, `.opencode/commands/add-skill.md`, and `ai-framework/scripts/skill-vendors.test.js`.
Generate `.cursor/skills/add-skill/SKILL.md` in installed projects.
Update `ai-framework/scripts/workflow-doctor.js`, `ai-framework/scripts/setup-validator.js`, `ai-framework/integrations/harnesses.md`, `SETUP.md`, and `README.md`.
Update `VERSION` and `CHANGELOG.md` at release.

### File set C

Create `ai-framework/scripts/skill-sync.js`, `ai-framework/scripts/skill-sync.test.js`, and `ai-framework/scripts/bundle-sync.test.js`.
Update `ai-framework/scripts/bundle-sync.js`, `.claude/skills/bundle-sync/SKILL.md`, `.agents/skills/bundle-sync/SKILL.md`, `.opencode/commands/bundle-sync.md`, and `ai-framework/integrations/skills.md`.
Refresh `.cursor/skills/bundle-sync/SKILL.md` in installed projects; update `SETUP.md`, `VERSION`, and `CHANGELOG.md`.

## Machine-checkable exits

The following new test files are planned implementation outputs; they do not exist yet. Build must attach actual command results before marking a scope done.

### S1

`node --test ai-framework/scripts/add-skill.test.js` exits 0 and proves:
- Valid exact identity preserves every referenced resource; missing, ambiguous and invalid sources leave the destination unchanged.
- Explicit scope and phase selection is mandatory before commit, including noninteractive calls.
- Traversal, escaping symlinks, reserved-name collisions, duplicate destination paths and unowned overwrites are rejected.
- Repeated installation is idempotent; disable/enable works; remove/update preserve local edits.
- Partial write and simulated interrupted-process recovery restore a valid previous registry and package set.
- Additional registered project vendor participates; absent executables do not shrink coverage; incompatible host scope fails explicitly.

`node --check ai-framework/scripts/add-skill.js` exits 0.

### S2

`node --test ai-framework/scripts/skill-vendors.test.js` exits 0 and proves:
- Every project vendor discovers add-skill and an installed fixture skill; wrappers resolve the same content and retain resource paths.
- Common phase settings are consistent; declared overrides remain traceable; unknown vendor descriptors fail coverage checks.
- Doctor handles registry-managed external skills without requiring workflow-specific frontmatter from their upstream authors.
- Setup is rerunnable, preserves custom configuration, and materializes missing Cursor mirrors.

`node ai-framework/scripts/workflow-doctor.js --json` and `node ai-framework/scripts/setup-validator.js --json` exit 0.
Run real invocation smoke tests on available hosts and record unavailable-host runs as unverified, separate from fixture success.

### S3

`node --test ai-framework/scripts/skill-sync.test.js ai-framework/scripts/bundle-sync.test.js` exits 0 and proves:
- Two target projects with different skill choices retain those differences after apply and prune.
- Dry run changes no files; source `.project/` content is never imported; migrations alter only allowed receiving-instance metadata.
- Modified skill files and global scope remain untouched; conflicts and unsupported schema versions are reported.
- Changed-file formatting runs only where configured; formatter failure rolls back; repeated sync after successful formatting is clean.
- A newly registered target vendor receives owned adapters after reconciliation; an unrecognized layout blocks full-coverage success.
- Existing new/changed/local/conflict/unverified/removed behavior remains intact, including first sync without a known base.

Final regression commands: `node ai-framework/scripts/setup-validator.js`, `node ai-framework/scripts/graphify.js --check`, and `node --test ai-framework/hooks/scripts/token-consumption.test.js` exit 0. Run changelog only after doctor passes and only for the implemented release.

## Impact analysis

Read-only inspection completed against the current checkout. No application dependencies or application build command exist, so these Node CLI scopes have no UI-build gate.

| Changed surface | Observed consumers | Required verification | Risk |
|---|---|---|---|
| `bundle-sync.js` fixed `SYNCED_DIRS`, source-hash marker and prune paths | Canonical bundle-sync skill, Codex/OpenCode wrappers, installed Cursor mirror | New three-way regression fixtures and post-format baseline tests | High: external skill files can look removed upstream |
| `workflow-doctor.js` discovers `.claude/skills` and checks profile/wrapper contracts | `setup-validator.js`, setup, ship and sync verification | Distinguish external registry entries; keep canonical checks intact | High: upstream skill frontmatter differs |
| `setup-validator.js` checks baseline Cursor mirrors and invokes doctor | Setup completion and project verification | Registry/vendor fixture plus existing validator | Medium: presence is not invocation evidence |
| `SETUP.md` / `harnesses.md` / README installation contract | Existing projects and all vendor entry points | Fresh setup and rerun fixtures | Medium: paths vary by host and upstream version |
| New instance registry and owned packages | Later Caveman settings/stats, compaction registration and state report | Schema/version contract, explicit missing-data behavior | High: later pitches depend on stable ownership |

Unique proposed paths: 27, including 15 new paths and 12 existing modifications in this checkout; two of those paths are generated Cursor mirrors (one new and one refreshed). Each release touches at most 12 paths because shared documentation and release records recur. No standalone tests for bundle-sync or doctor were found; add the tests above. Existing token-consumption tests supply a regression check for unchanged metrics behavior.

Boundary: new modules remain in the existing CommonJS Node tooling workspace (`ai-framework/scripts/package.json`); no application framework, database or UI dependency. Canonical source distributes under existing sync roots; local registries and package stores stay outside upstream copying. No new specialist agent is required, so existing role adapter files stay unchanged.

Knowledge graph contains zero entries. Applicable rules are `boundaries.md` (tooling isolation), `security.md` (validated paths and no secret reads), and `context-management.md` (load only selected skills). Project-specific stack companions are not yet configured.

## Risks and spike decisions

| Risk | Scope | Spike needed? | Mitigation / owner |
|---|---|---|---|
| Upstream CLI contract and host paths differ | S1 | Yes, bounded before implementation | Implementer inspects pinned CLI/version and exact selection; use explicit retrieval fallback if it cannot satisfy the contract |
| Global selection versus project-only host | S1 | No | Resolver validates scope for every project vendor before writes; explicit user choice resolves incompatibility |
| Concurrent edits and crash recovery | S1 | Yes, local fault injection | Implementer tests commit ordering, journal replay and stale hashes |
| Local external skills appear as upstream removals | S3 | Yes, two target fixtures | Sync uses registry ownership, not directory presence alone |
| Formatting defeats three-way hashes | S3 | Yes, deterministic fake formatter | Keep upstream and materialized hashes separate |
| Partial sync leaves mismatched registry readers | S3 | No | Version guards prevent activation and report exact repair steps |
| More adapter work exceeds appetite | All | No | Split delivery before build; preserve every project vendor in acceptance |

## Parallel dispatch

S1 → S2 → S3. No parallel implementation because registry, adapters and sync share evolving interfaces. Independent audit roles run at the existing audit gate. Defaults follow S3; compaction follows the registration contract; state follows the metrics and done-work contracts. Their detailed plans will use the implemented APIs rather than speculative paths.

## Gate

User approved the impact and plan on 2026-09-24. S1 is now implemented with evidence in `s1-evidence.md`. The current big-batch gate is S1 completion: Approve to proceed to S2 / Revise / Back / Stop. No external skill was installed into this checkout; no upstream sync or pitch deletion was performed.

## Living-spec deviations

Planning split the original portability slice into native activation (S2) and bundle-sync integration (S3) to keep each delivery bounded. The approved behavior is unchanged.

## Build authorization and test strategy

2026-09-24 — User approved the plan and impact. S1 tests were approved as part of its machine-checkable exits: unit validation for source/vendor/schema inputs; temporary-project integration tests for install/update/disable/remove; subprocess tests for actual interruption and recovery. No additional test-plan approval is needed.
