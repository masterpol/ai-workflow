# Graph Report - ai-workflow-portable  (2026-10-08)

## Corpus Check
- 443 files · ~376,706 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 23 file(s) not represented in the graph (top: .toml 17, (none) 6)

## Summary
- 4595 nodes · 7785 edges · 400 communities (272 shown, 128 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 371 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9e7cf8ec`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- skill-registry.mts
- orca-evidence.mts
- pitch-archive.mts
- bindStateSnapshot
- token-report.mts
- review-bench.mts
- bundle-sync.mts
- token-consumption.mts
- Security Rules
- ref_node_path
- orca-ledger.mts
- main
- state-theme.mts
- ref_node_assert
- state-structure.mts
- Nielsen's 10 Usability Heuristics for Evaluation
- Component Architecture Patterns
- orca-apply.mts
- Context Management
- Coding Standards
- .claude/agents/architect.md
- .cursor/agents/architect.md
- graphify.mts
- state-snapshot.mts
- Compaction record: independent-rereview-catch-up
- metrics-lock.test.mts
- FsDeps
- orca-apply.test.mts
- Eval Harness Skill
- Eval Harness Skill
- orca-diff-admit.test.mts
- add-skill.mts
- types.mts
- Observability Rules
- Performance Rules
- pitch-compress.mts
- orca-launch-gate.mts
- CI/CD & Deployment Rules
- orca-policy.mts
- orca-diff-admit.mts
- skill-vendors.test.mts
- Pattern: keep the fake's guarantee the same as the thing it replaces
- Rabbit holes
- /search — Search Project Knowledge
- /setup — Project Setup & Context Generation
- /test-strategy — Smart Testing
- /search — Search Project Knowledge
- /setup — Project Setup & Context Generation
- /test-strategy — Smart Testing
- Pattern: a read-only report over a project tree treats the tree as data, never as code
- pre-ship-verify.mts
- workflow-metrics-report.mts
- makeValidator
- full
- skill-source.mts
- browser-runtime.test.mts
- changelog.test.mts
- orca-eval-grader.mts
- skill-defaults.mts
- insideProject
- Phase 3: Audit
- Compaction record: orca-vendor-foundation
- bundle-sync.test.mts
- Compaction record: workflow-usage-metrics
- AI-Assisted Development Workflow
- Knowledge Graph
- Knowledge Graph
- state-html.test.mts
- Model Routing Strategy
- orca-run.mts
- .mkdtempSync
- Activities (in order)
- Phase 1: Plan
- Phase 2: Build
- Security Reviewer
- /sync — Sync Tasks with Notion
- Steps
- Security Reviewer
- /sync — Sync Tasks with Notion
- Steps
- review-bench.test.mts
- Issue: Matching entities by a bare `${id}-` prefix lets one entity resolve to another's
- Plan: state-multipage-report
- AI Tool Use Constraints & Enforcement
- Phase 5: Cooldown
- /impact — Impact Analysis
- /impact — Impact Analysis
- AGENTS.md
- token-consumption.test.mts
- Architectural Boundaries
- PitchCompressApi
- Phase 4: Ship
- AGENTS.md
- .claude/agents/code-reviewer.md
- Steps
- .cursor/agents/code-reviewer.md
- Steps
- Done Work
- Pattern: the tool that verifies independence must itself be independently verified
- token-consumption.ts
- Rollback Plan: [Feature Name]
- Design: [Feature Name]
- Build Error Resolver
- .claude/agents/planner.md
- Refactor & Dead Code Cleaner
- Build Error Resolver
- .cursor/agents/planner.md
- Refactor & Dead Code Cleaner
- Rollback Plan: [Feature Name]
- Design: [Feature Name]
- node.mts
- Compaction record: bundle-sync-marker-fix
- Compaction record: state-quoted-fonts
- stuck-uphill-detector.mts
- token-report.test.mts
- Eval Harness
- commitLedger
- install
- Wireframe: [Feature Name]
- Wireframe: [Feature Name]
- Audit
- Audit
- Wireframe: [Feature Name]
- Wireframe: [Feature Name]
- Compaction record: native-safety-feasibility
- Examples in Codebase
- Harness Integration Guide
- [2.12.0] - 2026-10-08
- Internationalization (i18n) Rules
- Testing Rules
- createPitchArchive
- ADR-NNNN: [Decision Title]
- Feature: [Feature Name]
- Pitch Compress
- Pitch Compress
- ADR-NNNN: [Decision Title]
- Feature: [Feature Name]
- node
- README.md
- orca-run.test.mts
- skill-vendors.mts
- reconcile
- verifyEvidence
- state-render.mts
- bindStateRender
- Entity: Name
- Pitch: {slug}
- Plan: {slug}
- Bug: [Short Description]
- Plan
- Plan
- Entity: Name
- RuntimeDeps
- createNodeDeps
- skill-registry.test.mts
- Bundle default skills
- Pitch: {slug}
- Plan: {slug}
- Bug: [Short Description]
- Pattern: parse an untrusted value against a grammar and re-emit it from the parsed numbers
- hooks
- orca-reconcile.mts
- Decision: workflow-tooling pitches share the same no-gos, and the installer's design answers stand
- State report
- Issue: Title
- Pattern: Title
- Status
- Changelog
- Shape
- Shape
- Architecture Context
- Knowledge Index
- add-skill.test.mts
- Issue: Title
- Pattern: Title
- skill-sync.test.mts
- orca-launch-gate.test.mts
- Status
- Compaction record: orca-vendor-reconcile-integration
- Decision Title
- Bundle Sync
- Cooldown
- Critique
- Shape Lite
- Ship
- State
- Bundle Sync
- Cooldown
- Critique
- Shape Lite
- Ship
- State
- Product Context
- Issue: making a shared reader treat a symlink as "absent" turned its writer into a data-destroyer
- Compaction record: readme-split
- skill-sync.mts
- Compaction record: orca-vendor-dispatch
- orca-policy.test.mts
- Decision Title
- Compaction record: orca-vendor-reconcile
- Pattern: A safety gate must not accept the claims of whoever it is gating — and must re-check at the destructive step
- Lossless projection in replace-style upserts
- .claude/agents/eval-runner.md
- Dependency Security
- build
- .cursor/agents/eval-runner.md
- Dependency Security
- skill-defaults.test.mts
- opencode.json
- Stack Context
- docs/setup.md
- orca-dispatch.mts
- Workflow usage metrics
- entry-import.test.mts
- workflow-metrics-state.mts
- Compaction record: ts-runtime-injection
- opencode-plugin.test.mts
- Compaction record: orca-vendor-orchestration
- Instance-managed skills
- isObject
- Issue: a skill installed in the source checkout ships to every synced project as a broken orphan
- [2.18.0] - 2026-10-08
- [2.4.0] - 2026-09-25
- Hill chart: {slug}
- .claude/agents/appetite-auditor.md
- .claude/agents/cross-pitch-conflict-checker.md
- .claude/agents/cross-pitch-projector.md
- .claude/agents/eval-regression-projector.md
- .claude/agents/i18n-checker.md
- .claude/agents/knowledge-historian.md
- .claude/agents/skeptic.md
- .claude/agents/test-coverage-checker.md
- .claude/agents/ux-reviewer.md
- Changelog
- .cursor/agents/appetite-auditor.md
- .cursor/agents/cross-pitch-conflict-checker.md
- .cursor/agents/cross-pitch-projector.md
- .cursor/agents/eval-regression-projector.md
- .cursor/agents/i18n-checker.md
- .cursor/agents/knowledge-historian.md
- .cursor/agents/skeptic.md
- .cursor/agents/test-coverage-checker.md
- .cursor/agents/ux-reviewer.md
- Changelog
- [2.8.1] - 2026-09-25
- decideCleanup
- Hill chart: {slug}
- index.md
- Hill chart: state-multipage-report
- Pattern: Resolve the real path before matching it against a protected-directory list
- [2.0.1] - 2026-09-23
- Portable AI Development Workflow
- Runs
- /switch — Switch Pitches
- /switch — Switch Pitches
- Issue: A hook that fires at launch was counted as a completion, so async agents counted twice
- [2.18.1] - 2026-10-08
- [2.8.2] - 2026-09-26
- docs-links.mts
- [2.8.3] - 2026-09-26
- isPlain
- [1.0.0] - 2026-09-23
- Reports
- /checkpoint — Save Pitch Progress
- /resume — Resume a Pitch
- /checkpoint — Save Pitch Progress
- /resume — Resume a Pitch
- [2.15.1] - 2026-10-08
- [2.19.0] - 2026-10-08
- [2.2.0] - 2026-09-23
- log.md
- [2.16.0] - 2026-10-08
- SETUP — Portable AI Development Workflow
- .agents/skills/add-skill/SKILL.md
- .agents/skills/audit/SKILL.md
- .agents/skills/bundle-sync/SKILL.md
- .agents/skills/changelog/SKILL.md
- .agents/skills/checkpoint/SKILL.md
- .agents/skills/cooldown/SKILL.md
- .agents/skills/critique/SKILL.md
- .agents/skills/dependency-security/SKILL.md
- .agents/skills/eval-harness/SKILL.md
- .agents/skills/fix/SKILL.md
- .agents/skills/impact/SKILL.md
- .agents/skills/knowledge-health/SKILL.md
- .agents/skills/pitch-compress/SKILL.md
- .agents/skills/plan/SKILL.md
- .agents/skills/resume/SKILL.md
- .agents/skills/search/SKILL.md
- .agents/skills/setup/SKILL.md
- .agents/skills/setup-validator/SKILL.md
- .agents/skills/shape-lite/SKILL.md
- .agents/skills/shape/SKILL.md
- .agents/skills/ship/SKILL.md
- .agents/skills/state/SKILL.md
- .agents/skills/switch/SKILL.md
- .agents/skills/sync/SKILL.md
- .agents/skills/test-strategy/SKILL.md
- .agents/skills/ui-design/SKILL.md
- .agents/skills/workflow-doctor/SKILL.md
- analysis/README.md
- project/context/README.md
- project/done-work.md
- project/rules/README.md
- [1.1.0] - 2026-09-23
- [1.1.1] - 2026-09-23
- [1.2.0] - 2026-09-23
- Guards and Fixes
- [2.0.0] - 2026-09-23
- Issue: A prose skill instruction referenced a CLI flag as if invocation arguments were already a clean single value, but they are free-form text
- [2.10.0] - 2026-10-07
- Audit cycle 1 — state-multipage-report
- [2.11.1] - 2026-10-08
- orca-evidence.test.mts
- Issue: a worker's environment differs from the coordinator's, and the first live smoke tests failed for that reason
- Pitch: orca-auto-start-all-phases
- Audit cycle 3 — state-multipage-report
- [2.13.0] - 2026-10-08
- StatLike
- [2.14.0] - 2026-10-08
- report
- [2.8.4] - 2026-09-26
- [2.3.0] - 2026-09-24
- Decision: caveman brevity mode is the default for every skill, agent, and session
- Add Skill
- [2.8.6] - 2026-09-28
- /fix — Bug-Fix Entry
- .claude/skills/setup-validator/SKILL.md
- .claude/skills/workflow-doctor/SKILL.md
- .cursor/skills/setup-validator/SKILL.md
- .cursor/skills/workflow-doctor/SKILL.md
- .project/context/README.md
- /fix — Bug-Fix Entry
- Step 2 — Wire all harnesses
- [2.9.0] - 2026-10-07
- formatFiles
- unfinished-pitches-assessment-2026-09-27.md
- .project/rules/README.md
- [2.9.1] - 2026-10-07
- Exit criteria per scope (machine-checkable, ≥1 per scope)
- ClockDeps
- DirEntryLike
- [2.8.0] - 2026-09-25
- Issue: the git-ignored `ai_workflow_env.json` (runner `bun`) makes a test that empties PATH fail on a developer machine
- Pattern: a generated-report writer owns only what carries its marker
- PitchArchiveApi
- [2.15.0] - 2026-10-08
- [2.5.0] - 2026-09-25
- [2.8.5] - 2026-09-26
- createPitchCompress
- [2.16.2] - 2026-10-08
- [2.17.0] - 2026-10-08
- [2.6.0] - 2026-09-25
- [2.7.0] - 2026-09-25
- Optional Orca vendor policy
- [2.14.1] - 2026-10-08

## God Nodes (most connected - your core abstractions)
1. `RuntimeDeps` - 124 edges
2. `createNodeDeps()` - 113 edges
3. `createPitchCompress()` - 51 edges
4. `FsDeps` - 51 edges
5. `bindStateSnapshot()` - 41 edges
6. `Changelog` - 40 edges
7. `main()` - 35 edges
8. `runDirect()` - 32 edges
9. `Followups` - 32 edges
10. `createPitchArchive()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `Summary` --references--> `dispatchScope()`  [INFERRED]
  .project/knowledge/issues/an-idempotent-replay-path-returned-success-without-re-checking-the-gate.md → ai-framework/scripts/orca-dispatch.mts
- `Symptoms` --references--> `deepEqual()`  [INFERRED]
  .project/knowledge/issues/editing-a-canonical-file-alone-breaks-the-byte-identity-mirror-check.md → ai-framework/scripts/orca-eval-grader.mts
- `Fix / rule` --references--> `evaluateLaunch()`  [INFERRED]
  .project/knowledge/issues/status-dispatch-ready-false-is-not-launch-authority.md → ai-framework/scripts/orca-launch-gate.mts
- `Summary` --references--> `evaluateLaunch()`  [INFERRED]
  .project/knowledge/issues/status-dispatch-ready-false-is-not-launch-authority.md → ai-framework/scripts/orca-launch-gate.mts
- `Examples in Codebase` --references--> `requireCompleteLedger()`  [INFERRED]
  .project/knowledge/patterns/a-gate-must-not-trust-its-own-author.md → ai-framework/scripts/pitch-archive.mts

## Import Cycles
- None detected.

## Communities (400 total, 128 thin omitted)

### Community 0 - "skill-registry.mts"
Cohesion: 0.15
Nodes (27): acquire(), cleanup(), codeOf(), Created, defaultDeps(), digest(), fromBase64(), Journal (+19 more)

### Community 1 - "orca-evidence.mts"
Cohesion: 0.09
Nodes (24): Entry, absolutePath(), budget(), Bytes, CleanupDecision, CleanupResult, CopyResult, DEFAULT_GIT_TIMEOUT_MS (+16 more)

### Community 2 - "pitch-archive.mts"
Cohesion: 0.10
Nodes (24): archive(), ArchiveOptions, ArchiveResult, CliOptions, CompactionContext, cli(), defaultDeps(), Ledger (+16 more)

### Community 3 - "bindStateSnapshot"
Cohesion: 0.18
Nodes (28): bindStateSnapshot(), buildSnapshot(), contextFacts(), count(), databaseSection(), doneWorkSection(), fact(), firstParagraph() (+20 more)

### Community 4 - "token-report.mts"
Cohesion: 0.10
Nodes (51): AVAILABILITY, basisText(), change(), cleanDimension(), CleanRecord, CleanSnapshot, collect(), Collected (+43 more)

### Community 5 - "review-bench.mts"
Cohesion: 0.06
Nodes (61): BOOKKEEPING_FILES, BOOKKEEPING_PREFIXES, canaryCheck(), CanaryResult, CanarySpec, cli(), CliResult, count() (+53 more)

### Community 6 - "bundle-sync.mts"
Cohesion: 0.08
Nodes (46): argValue(), BaseLookup, classify(), codeOf(), colors, commandFailure(), Digest, Flagged (+38 more)

### Community 7 - "token-consumption.mts"
Cohesion: 0.08
Nodes (50): addNumber(), applyDimensions(), applyRecord(), applyToRow(), applyToSnapshot(), blankRow(), boundedId(), boundedName() (+42 more)

### Community 8 - "Security Rules"
Cohesion: 0.04
Nodes (44): 1. Authentication & Authorization, 2. Data Validation, 3. Secrets & Credentials, 4. Input Safety (XSS Prevention), 5. API Routes, 6. Multi-Tenancy / Organization Isolation, 7. File Uploads (if applicable), 8. Security Anti-Patterns (Auto-Flagged) (+36 more)

### Community 9 - "ref_node_path"
Cohesion: 0.05
Nodes (30): seedShippedPitch(), write(), NODE_FLAGS, ADAPTERS, files, root, SKIP, sources (+22 more)

### Community 10 - "orca-ledger.mts"
Cohesion: 0.07
Nodes (43): acceptMismatchedDispatch(), settleWithoutEvidence(), ATTEMPT_PREFIX, canonical(), ClaimResult, createLedger(), claim(), inspectFile() (+35 more)

### Community 11 - "main"
Cohesion: 0.21
Nodes (33): inspectWorkflowEnv(), main(), absolute(), checkAgent(), checkCavemanState(), checkKnowledgeGraph(), checkNode(), checkOpenCodeResolution() (+25 more)

### Community 12 - "state-theme.mts"
Cohesion: 0.08
Nodes (42): stylesheet(), assemble(), Built, channel(), collect(), COLOR_TOKENS, contrastRatio(), CSS_NAMES (+34 more)

### Community 13 - "ref_node_assert"
Cohesion: 0.14
Nodes (26): base, notice(), fixture(), memory(), nodeDeps, SCRIPT, runWorkflowSync(), base (+18 more)

### Community 14 - "state-structure.mts"
Cohesion: 0.11
Nodes (29): safeEvidencePath(), baseSkills(), bindStateStructure(), baseSkills(), detect(), mapDecisions(), realDir(), realFile() (+21 more)

### Community 15 - "Nielsen's 10 Usability Heuristics for Evaluation"
Cohesion: 0.06
Nodes (33): Consistency, Control & Freedom, Efficiency, Error Handling, H10: Help & Documentation, H1: Visibility of System Status, H2: Match Between System and Real World, H3: User Control & Freedom (+25 more)

### Community 16 - "Component Architecture Patterns"
Cohesion: 0.06
Nodes (31): Accept the minimum data needed, Component Architecture Patterns, Component Layers, Component Size Rules, Cross-feature dependency?, Dual-Path Rendering Parity, Enforcement during `/build`, Extract a component when: (+23 more)

### Community 17 - "orca-apply.mts"
Cohesion: 0.10
Nodes (32): AdmittedEntry, applyAdmitted(), ApplyResult, entryPaths(), ENV_ALLOWLIST, Fail, git(), gitEnv() (+24 more)

### Community 18 - "Context Management"
Cohesion: 0.07
Nodes (29): 1. Loading Everything, 2. No Transition Summaries, 3. Ignoring Previous Sessions, 4. Inline History, Anti-Patterns, Before Each Skill Runs, Context Loading Priority, Context Loading Protocol (+21 more)

### Community 19 - "Coding Standards"
Cohesion: 0.07
Nodes (28): Avoiding Future Refactors, Booleans: prefix with `is/has/can/should`, Code Organization Checklist, Code Quality Principles, Coding Standards, Cohesive module size exceptions, Comments, Constants: `UPPER_SNAKE_CASE` (+20 more)

### Community 20 - ".claude/agents/architect.md"
Cohesion: 0.07
Nodes (27): 1. Current State Analysis, 1. Modularity & Separation of Concerns, 2. Requirements Gathering, 2. Scalability, 3. Design Proposal, 3. Maintainability, 4. Security, 4. Trade-Off Analysis (+19 more)

### Community 21 - ".cursor/agents/architect.md"
Cohesion: 0.07
Nodes (27): 1. Current State Analysis, 1. Modularity & Separation of Concerns, 2. Requirements Gathering, 2. Scalability, 3. Design Proposal, 3. Maintainability, 4. Security, 4. Trade-Off Analysis (+19 more)

### Community 22 - "graphify.mts"
Cohesion: 0.08
Nodes (35): buildGraph(), ensureProjectFiles(), extractTitle(), extractWikiLinks(), FrontmatterValue, GITIGNORE_BLOCK, Graph, GRAPH_FILE (+27 more)

### Community 23 - "state-snapshot.mts"
Cohesion: 0.09
Nodes (23): RootName, checkSnapshot(), cli(), facts(), checkSnapshot(), { context, readRegistry, resolveFile, snapshot: registrySnapshot }, createStateSnapshot(), defaultDeps() (+15 more)

### Community 24 - "Compaction record: independent-rereview-catch-up"
Cohesion: 0.07
Nodes (26): Compaction record: independent-rereview-catch-up, Section 10: pitch.md#rabbit-holes, Section 11: audit-cycle-1.md, Section 12: deviations.md#s0-2026-09-26, Section 13: deviations.md#s4-2026-09-26, Section 14: deviations.md#s1-2026-09-26, Section 15: deviations.md#s2-2026-09-26, Section 16: deviations.md#s2-gate-2026-09-27 (+18 more)

### Community 25 - "metrics-lock.test.mts"
Cohesion: 0.09
Nodes (25): acquire(), Acquired, codeOf(), defaultDeps(), Endpoint, endpointFor(), Lease, Leased (+17 more)

### Community 26 - "FsDeps"
Cohesion: 0.08
Nodes (4): FsDeps, The Pattern, The Pattern, Metrics collector: TOCTOU on reads, and clamped lifetime totals

### Community 27 - "orca-apply.test.mts"
Cohesion: 0.14
Nodes (13): BASE, deps, Entry, failSecondWrite(), GIT_ENV, makeRepo(), patchFrom(), put() (+5 more)

### Community 28 - "Eval Harness Skill"
Cohesion: 0.08
Nodes (25): 1. Code-Based Grader, 1. Define (Before Coding), 2. Implement, 2. Model-Based Grader, 3. Evaluate, 3. Human Grader, 4. Report, Best Practices (+17 more)

### Community 29 - "Eval Harness Skill"
Cohesion: 0.08
Nodes (25): 1. Code-Based Grader, 1. Define (Before Coding), 2. Implement, 2. Model-Based Grader, 3. Evaluate, 3. Human Grader, 4. Report, Best Practices (+17 more)

### Community 30 - "orca-diff-admit.test.mts"
Cohesion: 0.07
Nodes (21): addCollision(), admitChecked(), AdmitResult, applyToBaseline(), Entry, Fixture, git(), SETUP_ENV (+13 more)

### Community 31 - "add-skill.mts"
Cohesion: 0.11
Nodes (22): AddSkillOptions, AddSkillResult, checkNamespace(), cli(), { context, digest, json, snapshot, readRegistry, transact, recover, resolveFile }, defaultDeps(), { discoverVendors, adapters }, globalLink() (+14 more)

### Community 32 - "types.mts"
Cohesion: 0.09
Nodes (34): main(), execute(), runCli(), runDirect(), inferRoot(), isDirect(), readRunner(), runnerEnvironment() (+26 more)

### Community 33 - "Observability Rules"
Cohesion: 0.08
Nodes (23): 1. Error Boundaries, 2. User Feedback (Toasts / Alerts / Inline Messages), 3. Loading States, 4. Logging Conventions, 5. Error Recovery Patterns, 6. Not-Found / Missing-Resource Handling, Backend/handler layer: throw user-friendly errors for expected failures, Do NOT put business logic in error boundaries (+15 more)

### Community 34 - "Performance Rules"
Cohesion: 0.08
Nodes (23): 1. Minimize Client-Side JavaScript, 2. Data-Access / Query Performance, 3. Bundle Size, 4. Loading States, 5. Caching, Avoid N+1 queries — don't fetch inside a loop, Avoid unnecessary re-renders, Don't fetch inside loops (+15 more)

### Community 35 - "pitch-compress.mts"
Cohesion: 0.13
Nodes (18): AcceptedGap, CliOptions, CommitOptions, CommitResult, defaultDeps(), DoneResult, extractSection(), Gap (+10 more)

### Community 36 - "orca-launch-gate.mts"
Cohesion: 0.06
Nodes (49): BriefResult, CONTROL, Env, isWorkerContext(), Json, LaunchDecision, launcherAcceptable(), LaunchOptions (+41 more)

### Community 37 - "CI/CD & Deployment Rules"
Cohesion: 0.09
Nodes (21): 1. Pre-Merge Requirements (Local), 2. Backend/Schema Deployment, 3. Environment Variables, 4. Rollback Plan, 5. Deployment Checklist, 6. What Must NOT Go to Production, 7. Multi-Service Deployment Order, Backend environment variables (+13 more)

### Community 38 - "orca-policy.mts"
Cohesion: 0.17
Nodes (18): boundedInteger(), cli(), Coordinator, defaultDeps(), errorCode(), hasKeys(), inspectPath(), isRecord() (+10 more)

### Community 39 - "orca-diff-admit.mts"
Cohesion: 0.09
Nodes (31): ADMIT_BUDGET_MS, admitDiff(), AdmitOptions, AdmitResult, byteLength(), CONTROL, DIFF_FLAGS, encoder (+23 more)

### Community 40 - "skill-vendors.test.mts"
Cohesion: 0.10
Nodes (16): BUNDLE, captureDeps(), { context, readRegistry }, __dirname, { discoverVendors, externalSkillReport, cursorMirrors }, fixture(), git(), MirrorReport (+8 more)

### Community 41 - "Pattern: keep the fake's guarantee the same as the thing it replaces"
Cohesion: 0.06
Nodes (36): Issue: a temp-fixture helper that realpaths its result silently voids a macOS alias guard, Prevention, Related, Root Cause, Solution, Summary, Issue: macOS resolves `os.tmpdir()` through a `/private/var` alias, breaking exact-path assertions in tests, Prevention (+28 more)

### Community 42 - "Rabbit holes"
Cohesion: 0.50
Nodes (4): Beyond the core pipeline, The pipeline, sync(), Rabbit holes

### Community 43 - "/search — Search Project Knowledge"
Cohesion: 0.10
Nodes (20): 1. Parse Search Query, 2. Search by Scope, 3. Rank Results, 4. Present Results, 5. Offer Actions, ADRs (`/search adrs "query"`), All (default), Date filter (`since:`) (+12 more)

### Community 44 - "/setup — Project Setup & Context Generation"
Cohesion: 0.10
Nodes (20): `AGENTS.md` project specifics (project root), `CLAUDE.md` (required project root mirror), If files exist (re-run mode):, If no files exist (first-time mode):, Important Rules, `.project/context/architecture.md`, `.project/context/product.md`, `.project/context/stack.md` (+12 more)

### Community 45 - "/test-strategy — Smart Testing"
Cohesion: 0.10
Nodes (20): 1. Load transition summary, 2. Read testing rules, 3. Strategy pass, 4. Build and present test plan, 5. Get approval on the test plan, 6. Write the tests, 7. Run tests, 8. Check coverage (+12 more)

### Community 46 - "/search — Search Project Knowledge"
Cohesion: 0.10
Nodes (20): 1. Parse Search Query, 2. Search by Scope, 3. Rank Results, 4. Present Results, 5. Offer Actions, ADRs (`/search adrs "query"`), All (default), Date filter (`since:`) (+12 more)

### Community 47 - "/setup — Project Setup & Context Generation"
Cohesion: 0.10
Nodes (20): `AGENTS.md` project specifics (project root), `CLAUDE.md` (required project root mirror), If files exist (re-run mode):, If no files exist (first-time mode):, Important Rules, `.project/context/architecture.md`, `.project/context/product.md`, `.project/context/stack.md` (+12 more)

### Community 48 - "/test-strategy — Smart Testing"
Cohesion: 0.10
Nodes (20): 1. Load transition summary, 2. Read testing rules, 3. Strategy pass, 4. Build and present test plan, 5. Get approval on the test plan, 6. Write the tests, 7. Run tests, 8. Check coverage (+12 more)

### Community 49 - "Pattern: a read-only report over a project tree treats the tree as data, never as code"
Cohesion: 0.20
Nodes (11): Pattern: a read-only report over a project tree treats the tree as data, never as code, Related Patterns, Summary, What happened, When NOT to Use, When to Use, Pattern: git run against a worker's tree executes worker code unless every command is guarded, Summary (+3 more)

### Community 50 - "pre-ship-verify.mts"
Cohesion: 0.18
Nodes (17): asRecord(), buildChecks(), changedFiles(), Check, CheckResult, commandOutput(), diffSanity(), errorMessage() (+9 more)

### Community 51 - "workflow-metrics-report.mts"
Cohesion: 0.13
Nodes (27): allTables(), buildReport(), Cell, createReports(), display(), Format, HEADLINES, HEALTH (+19 more)

### Community 52 - "makeValidator"
Cohesion: 0.29
Nodes (15): main(), makeValidator(), checkCavemanEntryFiles(), checkContext(), checkCursorMirrors(), checkEntryFiles(), checkKnowledgeGraph(), checkScaffold() (+7 more)

### Community 53 - "full"
Cohesion: 0.20
Nodes (17): Response style (caveman mode), assertPlainPath(), classify(), codeOf(), assertPlainPath(), checkDestination(), checkSlug(), doneWorkSlugs() (+9 more)

### Community 54 - "skill-source.mts"
Cohesion: 0.16
Nodes (19): defaultDeps(), frontmatter(), git(), gitBytes(), GitFailure, gitRun(), identity(), InspectedSource (+11 more)

### Community 55 - "browser-runtime.test.mts"
Cohesion: 0.13
Nodes (20): BrowserReport, catalogEntry(), cli(), CliOptions, CliState, cliStatus(), defaultDeps(), defaultRegistry (+12 more)

### Community 56 - "changelog.test.mts"
Cohesion: 0.18
Nodes (19): allArgs(), arg(), buildEntry(), bump(), codeOf(), Context, EntryParts, fail() (+11 more)

### Community 57 - "orca-eval-grader.mts"
Cohesion: 0.07
Nodes (61): MailMessage, allTrue(), argAfter(), Behaviour, BRIEF_FIELDS, CaseResult, catalog(), compare() (+53 more)

### Community 58 - "skill-defaults.mts"
Cohesion: 0.15
Nodes (14): CatalogEntry, cli(), CliOptions, defaultDeps(), defaultRegistry, DefaultReport, main(), messageOf() (+6 more)

### Community 59 - "insideProject"
Cohesion: 0.20
Nodes (10): insideProject(), themeChanges, Bet decision, Critique findings (auto-populated by /critique for big-batch + AI scopes), Knowledge consulted, No-gos (this pitch), Pitch: state-multipage-report, Problem (+2 more)

### Community 60 - "Phase 3: Audit"
Cohesion: 0.10
Nodes (20): Adaptive gate, Confirmation gate, Cross-pitch conflict check, Eval gate (AI changes — hard), Evidence rule (same as /build), Finding contract (every subagent), Loop discipline, Measurement over assertion (+12 more)

### Community 61 - "Compaction record: orca-vendor-foundation"
Cohesion: 0.09
Nodes (22): Compaction record: orca-vendor-foundation, Section 10: pitch.md#rabbit-holes, Section 11: audit-cycle-1.md, Section 12: deviations.md#d1-explicit-orca-opt-in, Section 13: deviations.md#d2-portable-fixture-assertions, Section 14: deviations.md#d3-cohesive-policy-module, Section 15: deviations.md#d4-conservative-runtime-proof, Section 16: log.md#s1-test-review (+14 more)

### Community 62 - "bundle-sync.test.mts"
Cohesion: 0.20
Nodes (15): ADD_SKILL, commit(), __dirname, fixture(), git(), read(), run(), runJson() (+7 more)

### Community 63 - "Compaction record: workflow-usage-metrics"
Cohesion: 0.09
Nodes (21): Compaction record: workflow-usage-metrics, Section 10: deviations.md#d3-audit-hardening-and-path-check-boundary, Section 11: deviations.md#d4-coupled-modules-and-explicit-schema-validation, Section 12: log.md#2026-10-08-s1-start, Section 13: log.md#s1-verification-attempt-1, Section 14: log.md#s1-compatibility-run, Section 15: log.md#s1-exit-evidence-complete, Section 16: log.md#s2-start-approved (+13 more)

### Community 64 - "AI-Assisted Development Workflow"
Cohesion: 0.11
Nodes (17): Adaptive confirmation gate, AI-Assisted Development Workflow, Big-batch feature (full pipeline), Bug fix, Confirmation gate philosophy, Hill chart, Hotfix, Lite shape (small task or user rejection) (+9 more)

### Community 65 - "Knowledge Graph"
Cohesion: 0.12
Nodes (16): Auditing, Confidence Levels, Decisions (`decisions/`), Entities (`entities/`), Entry Format, How Knowledge is Used, Index Format, Issues (`issues/`) (+8 more)

### Community 66 - "Knowledge Graph"
Cohesion: 0.12
Nodes (16): Auditing, Confidence Levels, Decisions (`decisions/`), Entities (`entities/`), Entry Format, How Knowledge is Used, Index Format, Issues (`issues/`) (+8 more)

### Community 67 - "state-html.test.mts"
Cohesion: 0.14
Nodes (17): ALLOWED_ATTRS, ALLOWED_TAGS, evidenceHeavy(), fact(), fixture(), page(), PAGES, pageSize() (+9 more)

### Community 68 - "Model Routing Strategy"
Cohesion: 0.12
Nodes (15): Always, Cascade Pipeline, Conditional Phases, Context budget discipline, Cost Measurement, Cost Optimization Rules, Don't over-front-load context, Model Routing Strategy (+7 more)

### Community 69 - "orca-run.mts"
Cohesion: 0.13
Nodes (35): DispatchOptions, bad(), checkCatalog(), CliError, collectInput(), Command, COMMANDS, defaultDeps() (+27 more)

### Community 70 - ".mkdtempSync"
Cohesion: 0.18
Nodes (9): fixture(), withCli(), write(), commandFixture(), scratch(), OsDeps, put(), realProject() (+1 more)

### Community 71 - "Activities (in order)"
Cohesion: 0.12
Nodes (15): 1. Knowledge gate (mandatory, FIRST), 2. Set boundaries, 3. Breadboard (not wireframe), 4. Address rabbit holes, 5. Write no-gos, 6. /critique (auto for big-batch + AI-prompt scopes), 7. Bet decision (three outcomes), Activities (in order) (+7 more)

### Community 72 - "Phase 1: Plan"
Cohesion: 0.12
Nodes (15): 1. Decompose into scopes, 2. Define machine-checkable exit criteria per scope, 3. Identify parallelism, 4. Inherit risks from pitch, 5. Wireframes (UI scopes only, light), 6. Initialize hill chart, Activities (in order), Adaptive plan size (+7 more)

### Community 73 - "Phase 2: Build"
Cohesion: 0.12
Nodes (15): Adaptive gate, Bug-fix variant, Confirmation gate (big-batch only), Inline UX 5-question check (UI scopes only), log.md and deviations.md discipline, Output, Parallel subagents, Per-scope inner loop (+7 more)

### Community 74 - "Security Reviewer"
Cohesion: 0.12
Nodes (16): 1. Initial Scan, 2. OWASP Top 10 Check, 3. Code Pattern Review, Analysis Commands, Common False Positives, Core Responsibilities, Emergency Response, Hard rules (always apply, no exceptions) (+8 more)

### Community 75 - "/sync — Sync Tasks with Notion"
Cohesion: 0.12
Nodes (15): After `/ship`, Arguments, Config File, During `/resume`, Error Handling, First-Time Setup, Full Sync (Default), Manual: `/sync` (+7 more)

### Community 76 - "Steps"
Cohesion: 0.12
Nodes (15): 1. Understand the UI requirement, 2. Load design rules, 3. Design component hierarchy, 4. ASCII wireframe (for complex layouts), 5. Generate component skeletons, 6. Generate i18n key list (if applicable), 7. Self-validate each generated file, 8. Present for approval (+7 more)

### Community 77 - "Security Reviewer"
Cohesion: 0.12
Nodes (16): 1. Initial Scan, 2. OWASP Top 10 Check, 3. Code Pattern Review, Analysis Commands, Common False Positives, Core Responsibilities, Emergency Response, Hard rules (always apply, no exceptions) (+8 more)

### Community 78 - "/sync — Sync Tasks with Notion"
Cohesion: 0.12
Nodes (15): After `/ship`, Arguments, Config File, During `/resume`, Error Handling, First-Time Setup, Full Sync (Default), Manual: `/sync` (+7 more)

### Community 79 - "Steps"
Cohesion: 0.12
Nodes (15): 1. Understand the UI requirement, 2. Load design rules, 3. Design component hierarchy, 4. ASCII wireframe (for complex layouts), 5. Generate component skeletons, 6. Generate i18n key list (if applicable), 7. Self-validate each generated file, 8. Present for approval (+7 more)

### Community 80 - "review-bench.test.mts"
Cohesion: 0.12
Nodes (15): Call, Fake, CANARY, Fake, git(), GUARD_GIT, here, repo() (+7 more)

### Community 81 - "Issue: Matching entities by a bare `${id}-` prefix lets one entity resolve to another's"
Cohesion: 0.29
Nodes (7): Issue: Matching entities by a bare `${id}-` prefix lets one entity resolve to another's, Prevention, Related, Root Cause, Solution, Summary, Symptoms

### Community 82 - "Plan: state-multipage-report"
Cohesion: 0.22
Nodes (8): Blast radius (`/impact`, from grep over the repo), Contract between S1 and S2 (so they can run in parallel), Living-spec deviations log, Parallel dispatch plan, Plan: state-multipage-report, Risks (inherited from pitch rabbit holes), Scopes, Wireframes (UI scopes only, light)

### Community 83 - "AI Tool Use Constraints & Enforcement"
Cohesion: 0.13
Nodes (14): 1. Document in system prompt, 2. Add server-side deduplication, 3. Add tests, 4. Monitor and log, AI Tool Use Constraints & Enforcement, Checklist, Core Rule, Implementation Pattern (+6 more)

### Community 84 - "Phase 5: Cooldown"
Cohesion: 0.13
Nodes (14): 1. Knowledge health audit, 2. Issue → pattern → rule promotion, 3. Parked pitches review, 4. Followups triage, 5. Output: cooldown report, 6. User approval gate, Activities (in order), Adaptive frequency (+6 more)

### Community 85 - "/impact — Impact Analysis"
Cohesion: 0.13
Nodes (14): 1. Load the design plan, 2. Trace downstream consumers, 3. Check boundary violations, 4. Identify affected tests, 5. Check knowledge graph for relevant warnings, 6. Risk summary, Confirmation Gate, Context Budget (+6 more)

### Community 86 - "/impact — Impact Analysis"
Cohesion: 0.13
Nodes (14): 1. Load the design plan, 2. Trace downstream consumers, 3. Check boundary violations, 4. Identify affected tests, 5. Check knowledge graph for relevant warnings, 6. Risk summary, Confirmation Gate, Context Budget (+6 more)

### Community 87 - "AGENTS.md"
Cohesion: 0.15
Nodes (11): Architecture, Confirmation gate (always), Guardrails, Product, Project Records, Project specifics, Subagents, Technology (+3 more)

### Community 88 - "token-consumption.test.mts"
Cohesion: 0.11
Nodes (15): CollectorInput, CompletionRecord, Routing, adapterDeps(), CLI, COLLECTOR, FakeRun, here (+7 more)

### Community 89 - "Architectural Boundaries"
Cohesion: 0.14
Nodes (13): App-local code (routes, screens, UI), Architectural Boundaries, Backend, Checklist, Dependency Placement, Dependency Rule, Purpose, Refactor Triggers (+5 more)

### Community 91 - "Phase 4: Ship"
Cohesion: 0.13
Nodes (14): 1. Final /verify (mandatory), 2. Pitch ↔ implementation reconciliation → SHIPPED.md, 3. Knowledge extraction (mandatory, structured), 4. Status compaction (≤100 lines hard cap), 5. Followups handling, 6. Doc updates (conditional, recorded), Activities (in order), Confirmation gate (+6 more)

### Community 92 - "AGENTS.md"
Cohesion: 0.15
Nodes (12): AGENTS.md, Architecture, Confirmation gate (always), Guardrails, Product, Project Records, Project specifics, Subagents (+4 more)

### Community 93 - ".claude/agents/code-reviewer.md"
Cohesion: 0.13
Nodes (14): Approval criteria, Best Practices (LOW), Code Quality (HIGH), Confidence-Based Filtering, Frontend Framework Patterns (HIGH), Hard rules (always apply, no exceptions), Node.js/Backend Patterns (HIGH), Output structure (+6 more)

### Community 94 - "Steps"
Cohesion: 0.14
Nodes (13): 1. Inventory all knowledge entries, 2. Check for staleness, 3. Check usage (pattern references), 4. Issue-to-Rule Promotion Check, 5. Cross-reference validation, 6. Tag coverage, 7. Generate recommendations, 8. Update usage log (+5 more)

### Community 95 - ".cursor/agents/code-reviewer.md"
Cohesion: 0.13
Nodes (14): Approval criteria, Best Practices (LOW), Code Quality (HIGH), Confidence-Based Filtering, Frontend Framework Patterns (HIGH), Hard rules (always apply, no exceptions), Node.js/Backend Patterns (HIGH), Output structure (+6 more)

### Community 96 - "Steps"
Cohesion: 0.14
Nodes (13): 1. Inventory all knowledge entries, 2. Check for staleness, 3. Check usage (pattern references), 4. Issue-to-Rule Promotion Check, 5. Cross-reference validation, 6. Tag coverage, 7. Generate recommendations, 8. Update usage log (+5 more)

### Community 97 - "Done Work"
Cohesion: 0.08
Nodes (23): bundle-sync-marker-fix — shipped 2026-09-26, collector-robustness — shipped 2026-09-27, Done Work, fix-orca-dispatch-resume-gate — shipped 2026-10-08, fix-workflow-runner-env — shipped 2026-10-08, independent-rereview-catch-up — shipped 2026-09-27, metrics-report-dimensions — shipped 2026-09-25, native-safety-feasibility — shipped 2026-09-27 (+15 more)

### Community 98 - "Pattern: the tool that verifies independence must itself be independently verified"
Cohesion: 0.10
Nodes (21): Consequences, Decision, Decision: `/shape-lite` is a compressed variant of `/shape` that escalates mechanically, Fix, Issue: a cross-pitch-conflict-checker cannot separate authorship in a file two uncommitted pitches share, Prevention, Related Patterns, Root Cause (+13 more)

### Community 99 - "token-consumption.ts"
Cohesion: 0.32
Nodes (7): BusEvent, hook(), MessageInfo, PluginContext, setup(), subscribe(), ToolEvent

### Community 100 - "Rollback Plan: [Feature Name]"
Cohesion: 0.15
Nodes (12): Code rollback:, Communication, Deployment Steps, If feature-flagged:, If schema change involved:, Notes, Post-Rollback, Pre-Deployment Checklist (+4 more)

### Community 101 - "Design: [Feature Name]"
Cohesion: 0.15
Nodes (12): Component Design, Data Model Changes, Design Decisions, Design: [Feature Name], Files to Create/Modify, Implementation Steps, Open Questions, Overview (+4 more)

### Community 102 - "Build Error Resolver"
Cohesion: 0.15
Nodes (12): 1. Collect All Errors, 2. Fix Strategy (MINIMAL CHANGES), 3. Common Fixes, Build Error Resolver, Core Responsibilities, Diagnostic Commands, DO and DON'T, Priority Levels (+4 more)

### Community 103 - ".claude/agents/planner.md"
Cohesion: 0.15
Nodes (12): 1. Requirements Analysis, 2. Architecture Review, 3. Step Breakdown, 4. Implementation Order, Best Practices, Plan Format, Planning Process, Red Flags to Check (+4 more)

### Community 104 - "Refactor & Dead Code Cleaner"
Cohesion: 0.15
Nodes (12): 1. Analyze, 2. Verify, 3. Remove Safely, 4. Consolidate Duplicates, Core Responsibilities, Detection Commands, Key Principles, Refactor & Dead Code Cleaner (+4 more)

### Community 105 - "Build Error Resolver"
Cohesion: 0.15
Nodes (12): 1. Collect All Errors, 2. Fix Strategy (MINIMAL CHANGES), 3. Common Fixes, Build Error Resolver, Core Responsibilities, Diagnostic Commands, DO and DON'T, Priority Levels (+4 more)

### Community 106 - ".cursor/agents/planner.md"
Cohesion: 0.15
Nodes (12): 1. Requirements Analysis, 2. Architecture Review, 3. Step Breakdown, 4. Implementation Order, Best Practices, Plan Format, Planning Process, Red Flags to Check (+4 more)

### Community 107 - "Refactor & Dead Code Cleaner"
Cohesion: 0.15
Nodes (12): 1. Analyze, 2. Verify, 3. Remove Safely, 4. Consolidate Duplicates, Core Responsibilities, Detection Commands, Key Principles, Refactor & Dead Code Cleaner (+4 more)

### Community 108 - "Rollback Plan: [Feature Name]"
Cohesion: 0.15
Nodes (12): Code rollback:, Communication, Deployment Steps, If feature-flagged:, If schema change involved:, Notes, Post-Rollback, Pre-Deployment Checklist (+4 more)

### Community 109 - "Design: [Feature Name]"
Cohesion: 0.15
Nodes (12): Component Design, Data Model Changes, Design Decisions, Design: [Feature Name], Files to Create/Modify, Implementation Steps, Open Questions, Overview (+4 more)

### Community 110 - "node.mts"
Cohesion: 0.11
Nodes (10): commitFixtureLedger(), placeLedger(), seedShippedPitch(), write(), nodeChild, nodeFs, nodeNet, readStdin() (+2 more)

### Community 111 - "Compaction record: bundle-sync-marker-fix"
Cohesion: 0.15
Nodes (12): Compaction record: bundle-sync-marker-fix, Section 10: audit-cycle-1.md, Section 11: log.md#s1-2026-09-26, Section 1: SHIPPED.md#scope-reconciliation, Section 2: SHIPPED.md#verification, Section 3: SHIPPED.md#audit, Section 4: SHIPPED.md#no-gos-honored, Section 5: SHIPPED.md#rabbit-holes-and-deviations (+4 more)

### Community 112 - "Compaction record: state-quoted-fonts"
Cohesion: 0.15
Nodes (12): Compaction record: state-quoted-fonts, Section 10: audit-cycle-1.md, Section 11: log.md#s1-2026-09-26, Section 1: SHIPPED.md#scope-reconciliation, Section 2: SHIPPED.md#verification, Section 3: SHIPPED.md#audit, Section 4: SHIPPED.md#no-gos-honored, Section 5: SHIPPED.md#rabbit-holes-and-deviations (+4 more)

### Community 113 - "stuck-uphill-detector.mts"
Cohesion: 0.42
Nodes (9): appendAudit(), detectStuck(), HillRow, listActivePitches(), main(), parseHill(), pitchesDir(), StuckScope (+1 more)

### Community 114 - "token-report.test.mts"
Cohesion: 0.14
Nodes (15): blankDimensions(), blankSnapshot(), blankTotals(), Dimensions, nullMap(), readSnapshot(), reviveMaps(), Snapshot (+7 more)

### Community 115 - "Eval Harness"
Cohesion: 0.17
Nodes (11): Adding a new case, Adding a new judge rubric, Cost control, Dataset format, Directory map, Eval Harness, Interpreting the report, Known scope (example) (+3 more)

### Community 116 - "commitLedger"
Cohesion: 0.16
Nodes (11): checkDestination(), CompactionContext, buildLedger(), checkGraph(), commitLedger(), compactionContext(), requireNoPendingCompaction(), encode() (+3 more)

### Community 117 - "install"
Cohesion: 0.16
Nodes (13): Formatting installed content, files(), walk(), commit(), git(), install(), Install flow, Add Skill (+5 more)

### Community 118 - "Wireframe: [Feature Name]"
Cohesion: 0.17
Nodes (11): Accessibility Notes, Component Map, Design Tokens Used, Desktop (>= 1024px), Interactive Elements, Mobile (< 768px), Open Questions, Screen Layout (+3 more)

### Community 119 - "Wireframe: [Feature Name]"
Cohesion: 0.17
Nodes (11): Accessibility Notes, Component Map, Design Tokens Used, Desktop (>= 1024px), Interactive Elements, Mobile (< 768px), Open Questions, Screen Layout (+3 more)

### Community 120 - "Audit"
Cohesion: 0.15
Nodes (12): Adaptive gate, Audit, Confirmation gate, Evidence rule, Loop discipline, Optional Orca multi-agent (off by default), Reviewer contract, Subagent dispatch (parallel) (+4 more)

### Community 121 - "Audit"
Cohesion: 0.15
Nodes (12): Adaptive gate, Audit, Confirmation gate, Evidence rule, Loop discipline, Optional Orca multi-agent (off by default), Reviewer contract, Subagent dispatch (parallel) (+4 more)

### Community 122 - "Wireframe: [Feature Name]"
Cohesion: 0.17
Nodes (11): Accessibility Notes, Component Map, Design Tokens Used, Desktop (>= 1024px), Interactive Elements, Mobile (< 768px), Open Questions, Screen Layout (+3 more)

### Community 123 - "Wireframe: [Feature Name]"
Cohesion: 0.17
Nodes (11): Accessibility Notes, Component Map, Design Tokens Used, Desktop (>= 1024px), Interactive Elements, Mobile (< 768px), Open Questions, Screen Layout (+3 more)

### Community 124 - "Compaction record: native-safety-feasibility"
Cohesion: 0.17
Nodes (11): Compaction record: native-safety-feasibility, Section 10: log.md#2026-09-26-shipped, Section 1: SHIPPED.md#reconciliation, Section 2: SHIPPED.md#verification-and-audit, Section 3: SHIPPED.md#no-gos-and-documentation, Section 4: SHIPPED.md#knowledge-and-remaining-work, Section 5: SHIPPED.md#delivery, Section 6: pitch.md#no-gos (+3 more)

### Community 125 - "Examples in Codebase"
Cohesion: 0.40
Nodes (6): Compress guard, canCompress(), resolveReal(), isRecord(), loadModes(), Examples in Codebase

### Community 126 - "Harness Integration Guide"
Cohesion: 0.20
Nodes (9): Capability Profiles, Caveman Mode, Claude Code, Codex, Harness Integration Guide, Instance-managed Skills, Role Profiles, Sub-agent Dispatch (+1 more)

### Community 128 - "Internationalization (i18n) Rules"
Cohesion: 0.18
Nodes (10): AI Language Behavior (if applicable), Hardcoded Copy Policy, Internationalization (i18n) Rules, Key Design, Locale Strategy, Message File Structure, Plurals and Variable Messages, Scope (+2 more)

### Community 129 - "Testing Rules"
Cohesion: 0.18
Nodes (10): Coverage Targets (starting point — adjust per project), E2E Scope, File Organization, Guards and Fixes: Prove the Test Can Fail, Mocking Discipline, Naming Convention, Testing Checklist for New Features, Testing Rules (+2 more)

### Community 130 - "createPitchArchive"
Cohesion: 0.20
Nodes (23): codeOf(), createPitchArchive(), archive(), checkSlug(), isRegularFile(), latestArchiveDir(), ledgerCommitted(), ledgerPath() (+15 more)

### Community 131 - "ADR-NNNN: [Decision Title]"
Cohesion: 0.18
Nodes (10): ADR-NNNN: [Decision Title], Alternatives Considered, Consequences, Context, Decision, Negative, Option A: [Name], Option B: [Name] (+2 more)

### Community 132 - "Feature: [Feature Name]"
Cohesion: 0.18
Nodes (10): Acceptance Criteria, Affected Areas, Description, Feature: [Feature Name], i18n Requirements, In Scope, Notes, Out of Scope (+2 more)

### Community 133 - "Pitch Compress"
Cohesion: 0.18
Nodes (10): Pitch Compress, Restore, Step 1 — Inventory, Step 2 — Build the coverage ledger (real extraction work, not a script), Step 3 — Write done-work.md, Step 4 — Archive (recovery, before anything is removed), Step 5 — Gate, Step 6 — Remove (only after approval) (+2 more)

### Community 134 - "Pitch Compress"
Cohesion: 0.18
Nodes (10): Pitch Compress, Restore, Step 1 — Inventory, Step 2 — Build the coverage ledger (real extraction work, not a script), Step 3 — Write done-work.md, Step 4 — Archive (recovery, before anything is removed), Step 5 — Gate, Step 6 — Remove (only after approval) (+2 more)

### Community 135 - "ADR-NNNN: [Decision Title]"
Cohesion: 0.18
Nodes (10): ADR-NNNN: [Decision Title], Alternatives Considered, Consequences, Context, Decision, Negative, Option A: [Name], Option B: [Name] (+2 more)

### Community 136 - "Feature: [Feature Name]"
Cohesion: 0.18
Nodes (10): Acceptance Criteria, Affected Areas, Description, Feature: [Feature Name], i18n Requirements, In Scope, Notes, Out of Scope (+2 more)

### Community 137 - "node"
Cohesion: 0.08
Nodes (24): node(), Choosing Node or Bun, Guarantees checked by tests, Running tests, Script runtime, Runner env followups — 2026-10-08, Compaction record: fix-workflow-runner-env, Section 1: SHIPPED.md#final-verification (+16 more)

### Community 138 - "README.md"
Cohesion: 0.21
Nodes (8): Design notes, Managed-write safety and interrupted compaction, How to improve this flow, Knowledge Graph, One source, every vendor, Upgrade from JavaScript entry files, Version Log & Bundle Sync, What you get

### Community 139 - "orca-run.test.mts"
Cohesion: 0.07
Nodes (26): attemptKeyOf(), taskKeyOf(), CATALOG, complete(), deps, ENV, Fixture, git() (+18 more)

### Community 140 - "skill-vendors.mts"
Cohesion: 0.14
Nodes (17): context(), Registry, RegistryEntry, AdapterFile, cursorMirrors(), defaultDeps(), defaults, discoverVendors() (+9 more)

### Community 141 - "reconcile"
Cohesion: 0.22
Nodes (6): checkCollisions(), ownedPaths(), reconcile(), reconcileEntry(), RegistryApi, VendorsApi

### Community 142 - "verifyEvidence"
Cohesion: 0.36
Nodes (11): copyEvidence(), encode(), errorCode(), manifestFiles(), readRegular(), readTreeFile(), recordFinalState(), serializeManifest() (+3 more)

### Community 143 - "state-render.mts"
Cohesion: 0.12
Nodes (18): GENERATOR_MARKER, Loose, PAGE_BYTE_CAP, PAGE_NAMES, PROJECT_TYPES, TITLES, loadSnapshot(), render() (+10 more)

### Community 144 - "bindStateRender"
Cohesion: 0.30
Nodes (18): bindStateRender(), cli(), pitchTable(), projectRows(), renderHtml(), row(), scroll(), section() (+10 more)

### Community 145 - "Entity: Name"
Cohesion: 0.22
Nodes (8): Dependencies, Entity: Name, Interactions, Key APIs, Location, Notes, Responsibilities, Summary

### Community 146 - "Pitch: {slug}"
Cohesion: 0.22
Nodes (8): Bet decision, Critique findings (auto-populated by /critique for big-batch + AI scopes), Knowledge consulted, No-gos (this pitch), Pitch: {slug}, Problem, Rabbit holes, Solution sketch (breadboard, NOT wireframe)

### Community 147 - "Plan: {slug}"
Cohesion: 0.22
Nodes (8): Exit criteria per scope (machine-checkable, ≥1 per scope), Living-spec deviations log, Parallel dispatch plan, Plan: {slug}, Risks (inherited from pitch rabbit holes), S1 — {name}, Scopes, Wireframes (UI scopes only, light)

### Community 148 - "Bug: [Short Description]"
Cohesion: 0.22
Nodes (8): Affected Files, Bug: [Short Description], Description, Environment, Expected Behavior, Fix, Reproduction Steps, Root Cause

### Community 149 - "Plan"
Cohesion: 0.22
Nodes (8): Activities, Adaptive plan size, Confirmation gate, Output, Plan, Transition, Verification at /plan exit, When to use

### Community 150 - "Plan"
Cohesion: 0.22
Nodes (8): Activities, Adaptive plan size, Confirmation gate, Output, Plan, Transition, Verification at /plan exit, When to use

### Community 151 - "Entity: Name"
Cohesion: 0.22
Nodes (8): Dependencies, Entity: Name, Interactions, Key APIs, Location, Notes, Responsibilities, Summary

### Community 152 - "RuntimeDeps"
Cohesion: 0.15
Nodes (14): Fake, ApplyOptions, Ctx, RollbackOptions, Mem, RuntimeDeps, Bet decision, Critique findings (auto-populated by /critique for big-batch + AI scopes) (+6 more)

### Community 153 - "createNodeDeps"
Cohesion: 0.12
Nodes (16): createNodeDeps(), CryptoDeps, CompressVerdict, defaultDeps(), PROTECTED_DIRS, pythonAvailable(), check(), fileUrl() (+8 more)

### Community 154 - "skill-registry.test.mts"
Cohesion: 0.15
Nodes (5): Operation, RegistryContext, require, shim, withKill()

### Community 155 - "Bundle default skills"
Cohesion: 0.25
Nodes (7): Browser runtime, Bundle default skills, Caveman mode, Coverage: every skill and every agent, Existing projects (upgrading from an older bundle version), Token-usage attribution, Verification

### Community 156 - "Pitch: {slug}"
Cohesion: 0.22
Nodes (8): Bet decision, Critique findings (auto-populated by /critique for big-batch + AI scopes), Knowledge consulted, No-gos (this pitch), Pitch: {slug}, Problem, Rabbit holes, Solution sketch (breadboard, NOT wireframe)

### Community 157 - "Plan: {slug}"
Cohesion: 0.22
Nodes (8): Exit criteria per scope (machine-checkable, ≥1 per scope), Living-spec deviations log, Parallel dispatch plan, Plan: {slug}, Risks (inherited from pitch rabbit holes), S1 — {name}, Scopes, Wireframes (UI scopes only, light)

### Community 158 - "Bug: [Short Description]"
Cohesion: 0.22
Nodes (8): Affected Files, Bug: [Short Description], Description, Environment, Expected Behavior, Fix, Reproduction Steps, Root Cause

### Community 159 - "Pattern: parse an untrusted value against a grammar and re-emit it from the parsed numbers"
Cohesion: 0.11
Nodes (19): Consequences, Decision, Decision: Effective sync bases and bounded font discovery, References, Summary, Consequences, Decision, Decision: how `/state` builds its snapshot and themed HTML report (+11 more)

### Community 160 - "hooks"
Cohesion: 0.25
Nodes (7): _comment, hooks, PostToolUse, PreToolUse, SessionStart, SubagentStop, $schema

### Community 161 - "orca-reconcile.mts"
Cohesion: 0.06
Nodes (39): AdmittedWorker, DispatchOutcome, ReportOutcome, DATASET_FILE, GradeOptions, GradeReport, GraderLibraries, HOSTILE_SUMMARY_CASE (+31 more)

### Community 162 - "Decision: workflow-tooling pitches share the same no-gos, and the installer's design answers stand"
Cohesion: 0.09
Nodes (25): Consequences, Context, Decision, Decision: workflow-tooling pitches share the same no-gos, and the installer's design answers stand, References, Summary, Pattern: Dual-hash tracking for content that gets transformed after fetch, Related Patterns (+17 more)

### Community 163 - "State report"
Cohesion: 0.15
Nodes (12): Installed version, Reading the token metrics, Related, Run it, Single-page details, Snapshot additions (still `schemaVersion: 1`), Snapshot contract (`schemaVersion: 1`), State report (+4 more)

### Community 164 - "Issue: Title"
Cohesion: 0.25
Nodes (7): Issue: Title, Prevention, Related, Root Cause, Solution, Summary, Symptoms

### Community 165 - "Pattern: Title"
Cohesion: 0.25
Nodes (7): Examples in Codebase, Pattern: Title, Related Patterns, Summary, The Pattern, When NOT to Use, When to Use

### Community 166 - "Status"
Cohesion: 0.25
Nodes (7): Active pitches, /cooldown due in: 5 ships, Followups backlog, Open rabbit holes across active pitches, Parked pitches, Recent ships (last 5), Status

### Community 167 - "Changelog"
Cohesion: 0.20
Nodes (9): [1.2.1] - 2026-09-23, [2.11.0] - 2026-10-08, [2.16.1] - 2026-10-08, [2.1.0] - 2026-09-23, Added, Changed, Changed, Changed (+1 more)

### Community 168 - "Shape"
Cohesion: 0.25
Nodes (7): Activities (in order), AI-prompt scopes (extra discipline), Confirmation gate, Output, Shape, Transition, When to use

### Community 169 - "Shape"
Cohesion: 0.25
Nodes (7): Activities (in order), AI-prompt scopes (extra discipline), Confirmation gate, Output, Shape, Transition, When to use

### Community 170 - "Architecture Context"
Cohesion: 0.25
Nodes (7): Architecture Context, Data Flow, Integrations, Layout, Optional Orca policy diagnostics, Overview, Project Records

### Community 171 - "Knowledge Index"
Cohesion: 0.25
Nodes (8): Decisions (11 entries), Entities (0 entries), Graph, Issues (17 entries), Knowledge Index, Patterns (25 entries), Tag Index, Traversal

### Community 172 - "add-skill.test.mts"
Cohesion: 0.24
Nodes (11): phases, afterWrite(), captureDeps(), commit(), { context, digest, json, snapshot, readRegistry, transact, recover, resolveFile }, fixture(), git(), here (+3 more)

### Community 173 - "Issue: Title"
Cohesion: 0.25
Nodes (7): Issue: Title, Prevention, Related, Root Cause, Solution, Summary, Symptoms

### Community 174 - "Pattern: Title"
Cohesion: 0.25
Nodes (7): Examples in Codebase, Pattern: Title, Related Patterns, Summary, The Pattern, When NOT to Use, When to Use

### Community 175 - "skill-sync.test.mts"
Cohesion: 0.31
Nodes (8): captureDeps(), { context, snapshot }, fixture(), git(), here, installFakePrettier(), sourceRepo(), write()

### Community 176 - "orca-launch-gate.test.mts"
Cohesion: 0.15
Nodes (12): common, EXAMPLE, fixture(), nodeDeps, Obj, ok, prober(), receipts() (+4 more)

### Community 177 - "Status"
Cohesion: 0.29
Nodes (6): Active pitches, /cooldown due in: 4 ships, Followups backlog, Open rabbit holes across active pitches, Parked pitches, Status

### Community 178 - "Compaction record: orca-vendor-reconcile-integration"
Cohesion: 0.20
Nodes (9): Compaction record: orca-vendor-reconcile-integration, Section 1: SHIPPED.md#final-verification, Section 2: SHIPPED.md#reconciliation, Section 3: SHIPPED.md#audit, Section 4: SHIPPED.md#no-gos-honored, Section 5: SHIPPED.md#followups, Section 6: pitch.md#no-gos, Section 7: pitch.md#rabbit-holes (+1 more)

### Community 179 - "Decision Title"
Cohesion: 0.29
Nodes (6): Consequences, Context, Decision, Decision Title, References, Summary

### Community 180 - "Bundle Sync"
Cohesion: 0.25
Nodes (7): Bundle Sync, Next steps (what a sync cannot do for the project), Step 1 — Dry run, Step 2 — Gate, Step 3 — Apply (only after approval), Step 4 — Verify, What it compares

### Community 181 - "Cooldown"
Cohesion: 0.29
Nodes (6): Activities (in order), Cooldown, Output, Per-item approval, Transition, When to use

### Community 182 - "Critique"
Cohesion: 0.29
Nodes (6): Critique, Disposition (advisory, not gating), Output, Perspective subagents (parallel fan-out), Transition, When to use

### Community 183 - "Shape Lite"
Cohesion: 0.29
Nodes (6): Arguments, Guardrails, Shape Lite, Steps, Transition, When to use

### Community 184 - "Ship"
Cohesion: 0.25
Nodes (7): Activities (in order), Confirmation gate, Optional Orca multi-agent (off by default), Output, Ship, Transition, When to use

### Community 185 - "State"
Cohesion: 0.29
Nodes (6): State, Step 1 — Preview, Step 2 — Write the snapshot (only if the user wants it kept), Step 3 — Render the HTML report (only if the user wants it), Step 4 — Report, What this skill never touches

### Community 186 - "Bundle Sync"
Cohesion: 0.25
Nodes (7): Bundle Sync, Next steps (what a sync cannot do for the project), Step 1 — Dry run, Step 2 — Gate, Step 3 — Apply (only after approval), Step 4 — Verify, What it compares

### Community 187 - "Cooldown"
Cohesion: 0.29
Nodes (6): Activities (in order), Cooldown, Output, Per-item approval, Transition, When to use

### Community 188 - "Critique"
Cohesion: 0.29
Nodes (6): Critique, Disposition (advisory, not gating), Output, Perspective subagents (parallel fan-out), Transition, When to use

### Community 189 - "Shape Lite"
Cohesion: 0.29
Nodes (6): Arguments, Guardrails, Shape Lite, Steps, Transition, When to use

### Community 190 - "Ship"
Cohesion: 0.25
Nodes (7): Activities (in order), Confirmation gate, Optional Orca multi-agent (off by default), Output, Ship, Transition, When to use

### Community 191 - "State"
Cohesion: 0.29
Nodes (6): State, Step 1 — Preview, Step 2 — Write the snapshot (only if the user wants it kept), Step 3 — Render the HTML report (only if the user wants it), Step 4 — Report, What this skill never touches

### Community 192 - "Product Context"
Cohesion: 0.29
Nodes (6): Core Capabilities, Product, Product Constraints, Product Context, Product Goal, Users

### Community 193 - "Issue: making a shared reader treat a symlink as "absent" turned its writer into a data-destroyer"
Cohesion: 0.11
Nodes (24): Consequences, Decision: the metrics collector holds a kernel-owned loopback lease, not a lock file, References, Summary, Decision: shared compaction recovery context and trusted directories, Decision and consequences, Decision: Inode anchoring and stable-inode locks, Observations (+16 more)

### Community 194 - "Compaction record: readme-split"
Cohesion: 0.20
Nodes (9): Compaction record: readme-split, Section 1: SHIPPED.md#final-verification, Section 2: SHIPPED.md#reconciliation, Section 3: SHIPPED.md#no-gos-honored, Section 4: SHIPPED.md#followups, Section 5: pitch.md#no-gos, Section 6: pitch.md#rabbit-holes, Section 7: log.md#2026-10-07 (+1 more)

### Community 195 - "skill-sync.mts"
Cohesion: 0.13
Nodes (15): CONFIG_NAMES, { context, digest, json, snapshot, readRegistry, transact, resolveFile }, defaultDeps(), { discoverVendors, adapters }, FormatResult, Formatter, main(), messageOf() (+7 more)

### Community 196 - "Compaction record: orca-vendor-dispatch"
Cohesion: 0.22
Nodes (8): Compaction record: orca-vendor-dispatch, Section 1: SHIPPED.md#final-verification, Section 2: SHIPPED.md#reconciliation, Section 3: SHIPPED.md#audit, Section 4: SHIPPED.md#no-gos-honored, Section 5: SHIPPED.md#followups, Section 6: pitch.md#no-gos, Section 7: pitch.md#rabbit-holes

### Community 197 - "orca-policy.test.mts"
Cohesion: 0.13
Nodes (8): MAX_POLICY_BYTES, POLICY_FILE, Coord, EXAMPLE, MemNode, nodeDeps, Policy, SCRIPT

### Community 198 - "Decision Title"
Cohesion: 0.29
Nodes (6): Consequences, Context, Decision, Decision Title, References, Summary

### Community 199 - "Compaction record: orca-vendor-reconcile"
Cohesion: 0.22
Nodes (8): Compaction record: orca-vendor-reconcile, Section 1: SHIPPED.md#final-verification, Section 2: SHIPPED.md#reconciliation, Section 3: SHIPPED.md#audit, Section 4: SHIPPED.md#no-gos-honored, Section 5: SHIPPED.md#followups, Section 6: pitch.md#no-gos, Section 7: pitch.md#rabbit-holes

### Community 200 - "Pattern: A safety gate must not accept the claims of whoever it is gating — and must re-check at the destructive step"
Cohesion: 0.12
Nodes (18): Issue: an idempotent replay path returned a success-shaped outcome without re-checking the gate, Prevention, Summary, Symptoms, Examples in Codebase, Pattern: A safety gate must not accept the claims of whoever it is gating — and must re-check at the destructive step, Prevention (process), Related Patterns (+10 more)

### Community 201 - "Lossless projection in replace-style upserts"
Cohesion: 0.33
Nodes (5): Anti-pattern, Data Modeling Rules, Lossless projection in replace-style upserts, Three safe options (in preference order), Why this matters

### Community 202 - ".claude/agents/eval-runner.md"
Cohesion: 0.33
Nodes (5): Constraints, Gates, Inputs (provided by dispatcher), Output structure, Process

### Community 203 - "Dependency Security"
Cohesion: 0.33
Nodes (5): After Approved Remediation, Dependency Security, Output, Procedure, Safety Rules

### Community 204 - "build"
Cohesion: 0.46
Nodes (8): OpenCode, createStatePages(), build(), renderPages(), shell(), skillGroup(), structureBody(), section()

### Community 205 - ".cursor/agents/eval-runner.md"
Cohesion: 0.33
Nodes (5): Constraints, Gates, Inputs (provided by dispatcher), Output structure, Process

### Community 206 - "Dependency Security"
Cohesion: 0.33
Nodes (5): After Approved Remediation, Dependency Security, Output, Procedure, Safety Rules

### Community 207 - "skill-defaults.test.mts"
Cohesion: 0.13
Nodes (9): MODES, BUNDLE, Canonical, Check, Checks, { externalSkillReport }, Fake, here (+1 more)

### Community 208 - "opencode.json"
Cohesion: 0.33
Nodes (5): agent, build, model, instructions, $schema

### Community 209 - "Stack Context"
Cohesion: 0.33
Nodes (5): Commands, Environment, Not Applicable, Runtime, Stack Context

### Community 210 - "docs/setup.md"
Cohesion: 0.28
Nodes (4): Set up, Setup Validator, Token Consumption, Workflow Doctor

### Community 211 - "orca-dispatch.mts"
Cohesion: 0.08
Nodes (48): Switch: `AI_WORKFLOW_ORCA_MULTI_AGENT`, classifyLiveness(), collectReport(), defaultDeps(), dispatchIdOf(), dispatchScope(), dispatchWithRetries(), LIVE_STATES (+40 more)

### Community 212 - "Workflow usage metrics"
Cohesion: 0.25
Nodes (8): completed(), Bounds and failures, Event contract, Reading the evidence, Record and report, Workflow usage metrics, skill(), Verify the OpenCode effort and skill wiring in a live session

### Community 213 - "entry-import.test.mts"
Cohesion: 0.14
Nodes (12): defaultDeps(), effectiveEntryText(), EntryKind, EntryResolution, outsideCode(), resolveClaudeEntry(), __dirname, memoryDeps() (+4 more)

### Community 214 - "workflow-metrics-state.mts"
Cohesion: 0.08
Nodes (54): Dispatch core (opt-in, library only), Registry and source packages, main(), generateReport(), scenario(), activityKey(), add(), applyEvent() (+46 more)

### Community 215 - "Compaction record: ts-runtime-injection"
Cohesion: 0.22
Nodes (8): Compaction record: ts-runtime-injection, Section 1: SHIPPED.md#final-verification, Section 2: SHIPPED.md#reconciliation, Section 3: SHIPPED.md#audit, Section 4: SHIPPED.md#no-gos-honored, Section 5: SHIPPED.md#followups, Section 6: pitch.md#no-gos, Section 7: pitch.md#rabbit-holes

### Community 216 - "opencode-plugin.test.mts"
Cohesion: 0.22
Nodes (8): Event, fakeEventStream(), here, Plugin, PluginRun, Stream, ToolHook, withPlugin()

### Community 217 - "Compaction record: orca-vendor-orchestration"
Cohesion: 0.50
Nodes (3): Compaction record: orca-vendor-orchestration, Section 1: pitch.md#no-gos, Section 2: pitch.md#rabbit-holes

### Community 218 - "Instance-managed skills"
Cohesion: 0.25
Nodes (7): All vendors available in the project, Bundle-sync migration (`skill-sync.mts`), Doctor and setup integration, Inspect, choose and install, Instance-managed skills, Lifecycle and recovery, Verification

### Community 219 - "isObject"
Cohesion: 0.50
Nodes (8): hasFields(), isCount(), isCountOrNull(), isObject(), isStoredRecord(), routingResolves(), usableShape(), validDimensions()

### Community 220 - "Issue: a skill installed in the source checkout ships to every synced project as a broken orphan"
Cohesion: 0.17
Nodes (12): Issue: editing a canonical file alone breaks the byte-identity mirror check, Prevention, Root Cause, Solution, Summary, Symptoms, Issue: a skill installed in the source checkout ships to every synced project as a broken orphan, Prevention (+4 more)

### Community 223 - "Hill chart: {slug}"
Cohesion: 0.40
Nodes (4): Hill chart: {slug}, Hill positions reference, Positions, Stuck-uphill watch

### Community 224 - ".claude/agents/appetite-auditor.md"
Cohesion: 0.40
Nodes (4): Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 225 - ".claude/agents/cross-pitch-conflict-checker.md"
Cohesion: 0.40
Nodes (4): Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 226 - ".claude/agents/cross-pitch-projector.md"
Cohesion: 0.40
Nodes (4): Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 227 - ".claude/agents/eval-regression-projector.md"
Cohesion: 0.40
Nodes (4): Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 228 - ".claude/agents/i18n-checker.md"
Cohesion: 0.40
Nodes (4): Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 229 - ".claude/agents/knowledge-historian.md"
Cohesion: 0.40
Nodes (4): Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 230 - ".claude/agents/skeptic.md"
Cohesion: 0.40
Nodes (4): Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 231 - ".claude/agents/test-coverage-checker.md"
Cohesion: 0.40
Nodes (4): Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 232 - ".claude/agents/ux-reviewer.md"
Cohesion: 0.40
Nodes (4): Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 233 - "Changelog"
Cohesion: 0.40
Nodes (4): Changelog, How to run it, What it writes, When to run it

### Community 234 - ".cursor/agents/appetite-auditor.md"
Cohesion: 0.40
Nodes (4): Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 235 - ".cursor/agents/cross-pitch-conflict-checker.md"
Cohesion: 0.40
Nodes (4): Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 236 - ".cursor/agents/cross-pitch-projector.md"
Cohesion: 0.40
Nodes (4): Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 237 - ".cursor/agents/eval-regression-projector.md"
Cohesion: 0.40
Nodes (4): Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 238 - ".cursor/agents/i18n-checker.md"
Cohesion: 0.40
Nodes (4): Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 239 - ".cursor/agents/knowledge-historian.md"
Cohesion: 0.40
Nodes (4): Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 240 - ".cursor/agents/skeptic.md"
Cohesion: 0.40
Nodes (4): Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 241 - ".cursor/agents/test-coverage-checker.md"
Cohesion: 0.40
Nodes (4): Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 242 - ".cursor/agents/ux-reviewer.md"
Cohesion: 0.40
Nodes (4): Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 243 - "Changelog"
Cohesion: 0.40
Nodes (4): Changelog, How to run it, What it writes, When to run it

### Community 245 - "decideCleanup"
Cohesion: 0.29
Nodes (8): Reconcile core (opt-in, library only), decideCleanup(), keep(), parseRaw(), parseSettlement(), performCleanup(), settlementIsPositive(), cleanupAttempt()

### Community 246 - "Hill chart: {slug}"
Cohesion: 0.40
Nodes (4): Hill chart: {slug}, Hill positions reference, Positions, Stuck-uphill watch

### Community 247 - "index.md"
Cohesion: 0.21
Nodes (13): Issue: a missing tracked file is not an undeleted deletion, Prevention, Root Cause, Solution, Summary, Symptoms, Issue: guard tests can fail for the wrong reason, Issue: rounding a remaining budget to zero disables subprocess cancellation (+5 more)

### Community 248 - "Hill chart: state-multipage-report"
Cohesion: 0.40
Nodes (4): Hill chart: state-multipage-report, Hill positions reference, Positions, Stuck-uphill watch

### Community 249 - "Pattern: Resolve the real path before matching it against a protected-directory list"
Cohesion: 0.17
Nodes (12): Consequences, Decision: how the default-skills machinery attributes, guards, and reports readiness, References, Summary, Symptoms, Solution, Pattern: Resolve the real path before matching it against a protected-directory list, Related Patterns (+4 more)

### Community 251 - "Portable AI Development Workflow"
Cohesion: 0.40
Nodes (5): Choose the script runtime, Concepts (read this first), Documentation, Portable AI Development Workflow, Set up

### Community 252 - "Runs"
Cohesion: 0.50
Nodes (3): Runs, Structure, Who writes here

### Community 253 - "/switch — Switch Pitches"
Cohesion: 0.50
Nodes (3): Parallel pitches, Steps, /switch — Switch Pitches

### Community 254 - "/switch — Switch Pitches"
Cohesion: 0.50
Nodes (3): Parallel pitches, Steps, /switch — Switch Pitches

### Community 255 - "Issue: A hook that fires at launch was counted as a completion, so async agents counted twice"
Cohesion: 0.09
Nodes (26): Consequences, Decision, Decision: how token metrics record and report vendor, model, agent, effort and skill, References, Summary, Issue: A hook that fires at launch was counted as a completion, so async agents counted twice, Prevention, Related (+18 more)

### Community 258 - "docs-links.mts"
Cohesion: 0.31
Nodes (10): anchorsOf(), BrokenLink, checkLinks(), collect(), defaultDeps(), LinkReport, linksOf(), main() (+2 more)

### Community 260 - "isPlain"
Cohesion: 0.83
Nodes (4): isPlain(), parseManifest(), safeRelPath(), validEntry()

### Community 272 - "SETUP — Portable AI Development Workflow"
Cohesion: 0.18
Nodes (10): Guardrails (apply during setup and after), SETUP — Portable AI Development Workflow, Step 0 — Orient, Step 1 — Place the framework files, Step 4 — Generate project context + entry file, Step 5 — Generate stack-specific rules (and agents, if needed), Step 6 — Verify lifecycle hooks, Step 7 — Verify (+2 more)

### Community 307 - "Guards and Fixes"
Cohesion: 0.22
Nodes (6): Guards and Fixes, The Pattern, The Pattern, The Pattern, TOCTOU: ancestor-symlink race between resolveFile's check and the later write, Section 3: SHIPPED.md#audit

### Community 309 - "Issue: A prose skill instruction referenced a CLI flag as if invocation arguments were already a clean single value, but they are free-form text"
Cohesion: 0.24
Nodes (10): extractInvocationArg(), resolveMode(), Decision, Issue: A prose skill instruction referenced a CLI flag as if invocation arguments were already a clean single value, but they are free-form text, Prevention, Related, Root Cause, Solution (+2 more)

### Community 311 - "Audit cycle 1 — state-multipage-report"
Cohesion: 0.20
Nodes (9): writeSet(), writeSetInner(), state report hardening leftovers (audit cycles 2-3 of state-multipage-report, 2026-10-08), Acknowledged → log.md, Audit cycle 1 — state-multipage-report, False positives, Fixes applied (coordinator re-ran every check), Must-fix (blocks /ship) (+1 more)

### Community 313 - "orca-evidence.test.mts"
Cohesion: 0.19
Nodes (9): copy(), deps, entries, ENTRY, Fixture, git(), POSITIVE, proven() (+1 more)

### Community 314 - "Issue: a worker's environment differs from the coordinator's, and the first live smoke tests failed for that reason"
Cohesion: 0.20
Nodes (8): Issue: a worker's environment differs from the coordinator's, and the first live smoke tests failed for that reason, Rule, Summary, What failed, and what fixed it, Fix / rule, Issue: `dispatchReady: false` from `orca-run status` was read as "Orca cannot launch", so whole phases ran without Orca, Summary, Symptoms

### Community 315 - "Pitch: orca-auto-start-all-phases"
Cohesion: 0.25
Nodes (7): Bet decision, Critique findings (auto-populated by /critique for big-batch + AI scopes), Knowledge consulted, No-gos (this pitch), Pitch: orca-auto-start-all-phases, Problem, Solution sketch (breadboard, NOT wireframe)

### Community 316 - "Audit cycle 3 — state-multipage-report"
Cohesion: 0.29
Nodes (6): Acknowledged → log.md / followups, Audit cycle 3 — state-multipage-report, Gate, Must-fix, Verification by the coordinator (before triage), Worker result (data, quoted and bounded)

### Community 318 - "StatLike"
Cohesion: 0.40
Nodes (4): ensureParents(), errorCode(), Location, StatLike

### Community 320 - "report"
Cohesion: 0.47
Nodes (3): RegistryApi, report, runtimeStatus()

### Community 323 - "Decision: caveman brevity mode is the default for every skill, agent, and session"
Cohesion: 0.40
Nodes (5): Consequences, Context, Decision, Decision: caveman brevity mode is the default for every skill, agent, and session, Related

### Community 324 - "Add Skill"
Cohesion: 0.33
Nodes (5): Add Skill, Bundle default skills, Guardrails, Lifecycle, When to use

### Community 326 - "/fix — Bug-Fix Entry"
Cohesion: 0.33
Nodes (5): 1. Triage (gated), 2. Build → Audit → Ship, Agent recommendations, /fix — Bug-Fix Entry, When NOT to use /fix

### Community 332 - "/fix — Bug-Fix Entry"
Cohesion: 0.33
Nodes (5): 1. Triage (gated), 2. Build → Audit → Ship, Agent recommendations, /fix — Bug-Fix Entry, When NOT to use /fix

### Community 333 - "Step 2 — Wire all harnesses"
Cohesion: 0.33
Nodes (6): 2a — Claude Code, 2b — OpenCode, 2c — Codex, 2d — Cursor, 2e — Other CLI agents, Step 2 — Wire all harnesses

### Community 335 - "formatFiles"
Cohesion: 0.50
Nodes (5): makeEntry(), discoverFormatter(), formatFiles(), Examples in Codebase, Examples in Codebase

### Community 383 - "Exit criteria per scope (machine-checkable, ≥1 per scope)"
Cohesion: 0.40
Nodes (5): Exit criteria per scope (machine-checkable, ≥1 per scope), S0 — Enable Orca policy, S1 — Snapshot: structure + base/project skills, S2 — Multipage render + staged atomic write, S3 — Docs, skill mirrors, changelog

### Community 387 - "Issue: the git-ignored `ai_workflow_env.json` (runner `bun`) makes a test that empties PATH fail on a developer machine"
Cohesion: 0.50
Nodes (3): Issue: the git-ignored `ai_workflow_env.json` (runner `bun`) makes a test that empties PATH fail on a developer machine, Rule, Summary

### Community 422 - "createPitchCompress"
Cohesion: 0.20
Nodes (19): buildLedger(), commitLedger(), createPitchCompress(), bodyUnder(), classify(), cli(), extractSection(), headingLines() (+11 more)

### Community 434 - "Optional Orca vendor policy"
Cohesion: 0.13
Nodes (12): CLI, grader and live-smoke status, Explicit runtime inspection, Inspect without execution, Optional Orca vendor policy, Policy contract, Workflow doctor, 2026-10-08 — correction to the S0 entry, 2026-10-08 — S0: Orca policy valid, dispatch not ready (+4 more)

## Knowledge Gaps
- **2309 isolated node(s):** `TsDiagnostic`, `Plain`, `$schema`, `instructions`, `model` (+2304 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2731 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **128 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RuntimeDeps` connect `RuntimeDeps` to `skill-registry.mts`, `orca-evidence.mts`, `docs-links.mts`, `pitch-archive.mts`, `createPitchArchive`, `review-bench.mts`, `bundle-sync.mts`, `token-consumption.mts`, `ref_node_path`, `orca-ledger.mts`, `orca-run.test.mts`, `skill-vendors.mts`, `ref_node_assert`, `state-structure.mts`, `state-render.mts`, `state-theme.mts`, `orca-apply.mts`, `graphify.mts`, `state-snapshot.mts`, `metrics-lock.test.mts`, `createNodeDeps`, `orca-apply.test.mts`, `skill-registry.test.mts`, `orca-diff-admit.test.mts`, `add-skill.mts`, `types.mts`, `orca-reconcile.mts`, `pitch-compress.mts`, `orca-launch-gate.mts`, `orca-policy.mts`, `orca-diff-admit.mts`, `skill-vendors.test.mts`, `add-skill.test.mts`, `skill-sync.test.mts`, `orca-launch-gate.test.mts`, `pre-ship-verify.mts`, `workflow-metrics-report.mts`, `skill-source.mts`, `browser-runtime.test.mts`, `changelog.test.mts`, `orca-eval-grader.mts`, `orca-evidence.test.mts`, `skill-defaults.mts`, `report`, `skill-sync.mts`, `orca-policy.test.mts`, `orca-run.mts`, `skill-defaults.test.mts`, `review-bench.test.mts`, `orca-dispatch.mts`, `Workflow usage metrics`, `entry-import.test.mts`, `workflow-metrics-state.mts`, `Compaction record: ts-runtime-injection`, `token-consumption.test.mts`, `Done Work`, `node.mts`, `stuck-uphill-detector.mts`, `commitLedger`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `RuntimeDeps` (e.g. with `Event contract` and `ts-runtime-injection — shipped 2026-10-08`) actually correct?**
  _`RuntimeDeps` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `TsDiagnostic`, `Plain`, `$schema` to the rest of the system?**
  _2309 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `orca-evidence.mts` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Why does `createNodeDeps()` connect `createNodeDeps` to `skill-registry.mts`, `docs-links.mts`, `pitch-archive.mts`, `review-bench.mts`, `token-consumption.mts`, `ref_node_path`, `orca-ledger.mts`, `orca-run.test.mts`, `skill-vendors.mts`, `ref_node_assert`, `state-structure.mts`, `state-render.mts`, `state-theme.mts`, `state-snapshot.mts`, `metrics-lock.test.mts`, `skill-registry.test.mts`, `orca-apply.test.mts`, `orca-diff-admit.test.mts`, `add-skill.mts`, `types.mts`, `orca-reconcile.mts`, `pitch-compress.mts`, `orca-launch-gate.mts`, `orca-policy.mts`, `skill-vendors.test.mts`, `add-skill.test.mts`, `skill-sync.test.mts`, `orca-launch-gate.test.mts`, `pre-ship-verify.mts`, `skill-source.mts`, `browser-runtime.test.mts`, `orca-evidence.test.mts`, `orca-eval-grader.mts`, `skill-defaults.mts`, `skill-sync.mts`, `state-html.test.mts`, `orca-policy.test.mts`, `orca-run.mts`, `skill-defaults.test.mts`, `orca-dispatch.mts`, `entry-import.test.mts`, `token-consumption.test.mts`, `node.mts`, `stuck-uphill-detector.mts`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `createPitchCompress()` (e.g. with `assertPlainPath()` and `buildLedger()`) actually correct?**
  _`createPitchCompress()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Should `pitch-archive.mts` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._