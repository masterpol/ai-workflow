# Graph Report - ai-workflow-portable  (2026-11-26)

## Corpus Check
- 751 files · ~796,958 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 30 file(s) not represented in the graph (top: .toml 17, (none) 9, .toon 4)

## Summary
- 7706 nodes · 14804 edges · 450 communities (336 shown, 114 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 776 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1a04bbb6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- skill-registry.mts
- orca-evidence.mts
- skill-vendors.test.mts
- Issue: the git-ignored `ai_workflow_env.json` (runner `bun`) makes a test that empties PATH fail on a developer machine
- token-report.mts
- Followups
- toon-data.mts
- token-consumption.mts
- Security Rules
- pitch-archive.mts
- Pattern: local eval data must be gitignored alongside the dataset specs
- workflow-metrics-report.mts
- orca-start.test.mts
- _followups.md
- connected-memory-consolidation
- Nielsen's 10 Usability Heuristics for Evaluation
- Component Architecture Patterns
- semver-range.mts
- Context Management
- Coding Standards
- runtime.test.mts
- .cursor/agents/architect.md
- State multipage report: retained source detail
- review-bench.mts
- bundle-sync.mts
- token-consumption.test.mts
- graphify.mts
- installed-upgrade.test.mts
- Eval Harness Skill
- Eval Harness Skill
- config-migrate.mts
- workflow-metrics-state.mts
- flow-report.test.mts
- Observability Rules
- Performance Rules
- orca-launch-gate.mts
- Source-review supplement: state-ai-authoring
- CI/CD & Deployment Rules
- legacy-upgrade.test.mts
- orca-diff-admit.mts
- token-consumption.ts
- Issue: a worker's environment differs from the coordinator's, and the first live smoke tests failed for that reason
- facts-sql.mts
- index.md
- /setup — Project Setup & Context Generation
- Phase 4: Ship
- orca-preflight.mts
- legacy-upgrades/unified-toon-config.md
- orca-diff-admit.test.mts
- config.test.mts
- types.mts
- .project/knowledge/patterns/a-gate-must-not-trust-its-own-author.md
- workflow-metrics-state.test.mts
- instruction-loading.test.mts
- .project/knowledge/patterns/a-grader-reports-executed-and-unexecuted-cases-separately.md
- flow-join.mts
- makeValidator
- orca-eval-grader.mts
- flow-report.mts
- node.mts
- Phase 3: Audit
- Compaction record: orca-vendor-foundation
- /test-strategy — Smart Testing
- skill-source.mts
- AI-Assisted Development Workflow
- Knowledge Graph
- Knowledge Graph
- config-migrate.test.mts
- Model Routing Strategy
- orca-run.test.mts
- graphify-relations.mts
- facts-project.test.mts
- Compaction record: workflow-usage-metrics
- Testing Rules
- orca-start.mts
- /sync — Sync Tasks with Notion
- Security Reviewer
- OpenCode + Orca Handoff
- Issue: a subagent's audit report contained numbers and names the code and the test run contradicted
- orca-start-codex-hook.test.mts
- facts-gather.test.mts
- validate.test.mts
- State report
- AI Tool Use Constraints & Enforcement
- workflow-capture.test.mts
- createFactsGather
- main
- Source-review supplement: test-execution-performance
- .claude/agents/build-error-resolver.md
- facts-project.mts
- PitchCompressApi
- graphify.test.mts
- migrate.mts
- post-edit-check.mts
- fail
- Audit cycle1 — P2d and P2c (separate from completed P1/P2a audit)
- readSnapshot
- .project/knowledge/issues/orca-worker-list-concise-view-hides-the-worker-identity-fields.md
- config.mts
- ledger-schema.mts
- Rollback Plan: [Feature Name]
- Design: [Feature Name]
- Decision: how `/pitch-compress` decides a deletion is safe
- .claude/agents/planner.md
- Refactor & Dead Code Cleaner
- Steps
- spawnSync
- tempFixture
- Rollback Plan: [Feature Name]
- Design: [Feature Name]
- /impact — Impact Analysis
- makeSync
- orca-reconcile.test.mts
- outcome-record.mts
- token-report.test.mts
- Harness Integration Guide
- orca-dispatch.mts
- changelog.test.mts
- Wireframe: [Feature Name]
- Wireframe: [Feature Name]
- facts-sql.test.mts
- AGENTS.md
- Wireframe: [Feature Name]
- Wireframe: [Feature Name]
- Compaction record: native-safety-feasibility
- Audit reviews: connected-memory-consolidation
- /setup — Project Setup & Context Generation
- orca-ledger.mts
- stuck-uphill-detector.mts
- .project/knowledge/patterns/keep-the-fakes-guarantee-the-thing-they-replace.md
- opencode-plugin.test.mts
- ADR-NNNN: [Decision Title]
- Feature: [Feature Name]
- pre-ship-verify.mts
- ownedPaths
- ADR-NNNN: [Decision Title]
- Feature: [Feature Name]
- Source-review supplement: token-attribution
- toon-machine-data
- orca-launch-gate.test.mts
- data-file.mts
- add-skill.mts
- orca-dispatch.test.mts
- stack.md
- orca-policy.mts
- Entity: Name
- Pitch: {slug}
- Plan: {slug}
- Bug: [Short Description]
- browser-runtime.test.mts
- skill-defaults.test.mts
- Entity: Name
- upgrade.test.mts
- Compaction record: independent-rereview-catch-up
- orca-contract.mts
- pitch-archive.test.mts
- /test-strategy — Smart Testing
- .claude/skills/dependency-security/SKILL.md
- Bug: [Short Description]
- createProjectFacts
- Compaction record: bundle-sync-marker-fix
- validUsage
- legacy-upgrade.mts
- .project/knowledge/patterns/an-ownership-predicate-must-mirror-the-claim-transactions-set.md
- Issue: Title
- Pattern: Title
- Source-review supplement: vendor-model-toon
- Changelog
- orca-run.mts
- Pitch: {slug}
- hooks
- Compaction record: orca-vendor-dispatch
- Source-review supplement: state-quoted-fonts
- Issue: Title
- Pattern: Title
- .claude/agents/cross-pitch-conflict-checker.md
- Compaction record: state-quoted-fonts
- orca-start-codex-hook.mts
- Plan: package-less-ship-verification
- Decision Title
- Source-review supplement: workflow-usage-capture
- Steps
- .claude/skills/cooldown/SKILL.md
- Source-review supplement: token-time-report
- Pattern: a source scanner fails closed on whatever it cannot read
- .project/knowledge/patterns/warn-text-must-be-self-consistent-with-the-code-it-ships.md
- Source-review supplement: instruction-compression
- .claude/skills/bundle-sync/SKILL.md
- Source-review supplement: agent-model-sweep
- Security Reviewer
- Source-review supplement: state-deep-evidence
- Phase 5: Cooldown
- Testing
- createNodeDeps
- Compaction record: readme-split
- workflow-contracts.test.mts
- .claude/skills/critique/SKILL.md
- workflow-doctor.test.mts
- Decision Title
- Activities (in order)
- Steps
- Lossless projection in replace-style upserts
- .claude/agents/eval-runner.md
- Status
- orca-apply.test.mts
- .claude/agents/test-coverage-checker.md
- Metrics report dimensions: retained source detail
- Optional Orca vendor policy
- Phase 0: Shape
- bundle-sync-marker-fix
- Bundle default skills
- [2.12.0] - 2026-10-08
- .claude/agents/eval-regression-projector.md
- Architectural Boundaries
- Shipped: package-less-ship-verification
- test-helpers.mts
- .claude/skills/ship-pitch/SKILL.md
- /fix — Bug-Fix Entry
- [2.13.0] - 2026-10-08
- [2.17.0] - 2026-10-08
- .claude/skills/changelog/SKILL.md
- README.md
- Source-review supplement: path-safety-hardening
- /impact — Impact Analysis
- setup-validator.mts
- .claude/skills/workflow-doctor/SKILL.md
- .claude/agents/cross-pitch-projector.md
- Pitch compaction: retained delivery and safety history
- Exit criteria per scope (machine-checkable, ≥1 per scope)
- Eval Harness
- Pitch: workspace-slim
- .claude/skills/eval-harness/SKILL.md
- Pitch: knowledge-distill
- transcript-usage.mts
- Portable skill installation: retained source history
- orca-vendors.md
- [2.50.1] - 2026-10-23
- Critique
- usableShape
- Codex Orca coordinator parity: retained source evidence
- Shape
- Shape
- .claude/skills/shape-lite/SKILL.md
- Phase 2: Build
- Bundle Sync
- Bundle Sync
- workflow-capture.mts
- pitch-compress.mts
- Track ship records: connected-memory-consolidation
- Decision: workflow-tooling pitches share the same no-gos, and the installer's design answers stand
- Portable AI Development Workflow
- knowledge
- Runs
- Pitch: greenfield-kickoff
- .claude/skills/impact/SKILL.md
- skill-compress-guard.test.mts
- .cwd
- Phase 1: Plan
- /fix — Bug-Fix Entry
- Pitch: package-less-ship-verification
- AGENTS.md
- Ship knowledge extraction and incident triage
- add-skill.test.mts
- [2.31.4] - 2026-10-18
- Shipped: consolidation-schemas
- project/records/shipped/_template.md
- Eval Workflow
- .claude/skills/checkpoint/SKILL.md
- Eval Workflow
- flow-render.mts
- captureWorkflowEvent
- Status
- SETUP — Portable AI Development Workflow
- Shipped: installed-sync
- Pitch: review-bench-hardening
- Plan: connected-memory-consolidation
- .project/knowledge/decisions/profile-detection-lives-in-frontmatter-not-in-the-model-id.md
- [2.15.0] - 2026-10-08
- Shipped: legacy-upgrade
- Grader Types
- Integration Patterns
- Plan: review-bench-hardening
- Grader Types
- Integration Patterns
- 2. Search by Scope
- Rule: workflow-only data that agents load starts as TOON
- 2. Search by Scope
- Shipped: connected-process-graph
- Audit
- [1.2.0] - 2026-09-23
- consolidation-migrate.mts
- Pitch Compress
- .claude/agents/architect.md
- [2.18.0] - 2026-10-08
- standalone
- [2.18.1] - 2026-10-08
- Done Work
- Shipped: review-bench-hardening
- Pitch: workflow-v3-rollout
- Compaction record: orca-vendor-reconcile-integration
- analysis/README.md
- project/context/README.md
- Done Work
- project/rules/README.md
- Build Error Resolver
- Collector robustness: retained implementation history
- /search — Search Project Knowledge
- Architecture Context
- Compaction record: ts-runtime-injection
- [2.20.0] - 2026-10-08
- [2.23.0] - 2026-10-16
- Audit cycle 2 — connected-memory-consolidation
- .claude/agents/knowledge-historian.md
- [1.1.0] - 2026-09-23
- .claude/skills/resume/SKILL.md
- [2.25.0] - 2026-10-16
- Source-review supplement: fix-instruction-conflicts
- [2.11.0] - 2026-10-08
- Critique: greenfield-kickoff — eval-regression-projector
- Rule: every canonical-file edit ships its Cursor byte-copy regen in the same commit
- Critique
- [2.14.0] - 2026-10-08
- [2.8.1] - 2026-09-25
- /switch — Switch Pitches
- .cursor/agents/code-reviewer.md
- [2.28.0] - 2026-10-16
- [2.22.3] - 2026-10-09
- Hill chart: package-less-ship-verification
- toon-convert.test.mts
- [2.8.3] - 2026-09-26
- [2.48.0] - 2026-10-22
- .project/context/README.md
- [2.40.0] - 2026-10-21
- skill-sync.mts
- isSupportedVersion
- [2.49.0] - 2026-10-23
- unfinished-pitches-assessment-2026-09-27.md
- .project/rules/README.md
- Pitch Compress
- Source-review supplement: fix-orca-dispatch-resume-gate
- [2.29.0] - 2026-10-17
- [2.55.0] - 2026-11-25
- [2.8.4] - 2026-09-26
- [2.2.0] - 2026-09-23
- Eval regression projection: workspace-slim + knowledge-distill
- fix-timing-ratio-flake (bug-fix, 2026-11-25)
- Portable skill defaults: retained design and verification
- Appetite-auditor critique: workspace-slim + knowledge-distill
- [2.31.5] - 2026-10-18
- .claude/agents/code-reviewer.md
- [1.2.1] - 2026-09-23
- Pattern: a read-only report over a project tree treats the tree as data, never as code
- [2.20.1] - 2026-10-08
- Issue: a skill installed in the source checkout ships to every synced project as a broken orphan
- greenfield-kickoff-cross-pitch-projector.md
- [2.37.0] - 2026-10-20
- Closing criteria requiring an owner decision
- [2.43.1] - 2026-10-22
- [2.30.0] - 2026-10-17
- [2.58.1] - 2026-11-26
- [2.31.6] - 2026-10-19
- [2.37.1] - 2026-10-20
- [2.44.0] - 2026-10-22
- /search — Search Project Knowledge
- greenfield-kickoff-knowledge-historian.md
- [2.16.0] - 2026-10-08
- Plan
- [2.9.0] - 2026-10-07
- [1.0.0] - 2026-09-23
- [2.45.0] - 2026-10-22
- [2.11.1] - 2026-10-08
- [2.16.2] - 2026-10-08
- [2.14.1] - 2026-10-08
- [2.47.1] - 2026-10-22
- [2.22.0] - 2026-10-09
- [2.10.0] - 2026-10-07
- [2.16.1] - 2026-10-08
- [2.31.1] - 2026-10-18
- [2.1.0] - 2026-09-23
- [2.50.2] - 2026-11-23
- [2.52.1] - 2026-11-24
- [2.57.0] - 2026-11-25
- [2.22.2] - 2026-10-09
- Plan: {slug}
- [2.31.3] - 2026-10-18
- [2.8.0] - 2026-09-25
- [2.8.2] - 2026-09-26
- [2.30.1] - 2026-10-17
- [2.27.0] - 2026-10-16
- Project state report: retained source detail
- Version Log & Bundle Sync
- .project/records/shipped/_template.md
- [2.22.4] - 2026-10-09
- Shipped: fix-timing-ratio-flake
- [2.21.0] - 2026-10-09
- Hill chart: {slug}
- [2.31.2] - 2026-10-18
- [2.19.1] - 2026-10-08
- [2.31.0] - 2026-10-17
- [2.45.1] - 2026-10-22
- [2.48.1] - 2026-10-22
- [2.32.1] - 2026-10-19
- [2.35.0] - 2026-10-20
- [2.8.5] - 2026-09-26
- [2.42.0] - 2026-10-22
- [2.51.0] - 2026-11-23
- [2.47.0] - 2026-10-22
- [2.43.0] - 2026-10-22
- [2.50.0] - 2026-10-23
- [2.22.5] - 2026-10-09
- [2.5.0] - 2026-09-25
- [2.58.0] - 2026-11-26
- Knowledge Index
- Hill chart: review-bench-hardening
- [2.7.0] - 2026-09-25
- Compaction record: orca-vendor-reconcile
- [2.33.0] - 2026-10-19
- [2.35.1] - 2026-10-20
- skillDirOfPhase
- [2.50.3] - 2026-11-23
- [2.19.0] - 2026-10-08
- [2.9.1] - 2026-10-07
- [2.54.0] - 2026-11-24
- Product Context
- [2.22.1] - 2026-10-09
- decision
- Workflow variants
- Step 2: Generate Documents
- [2.31.7] - 2026-10-19
- [2.0.0] - 2026-09-23
- Step 2: Generate Documents
- Source-review supplement: workflow-usage-metrics
- [2.52.0] - 2026-11-23
- .claude/skills/pitch-compress/SKILL.md
- Shipped: connected-memory-consolidation
- .claude/agents/ux-reviewer.md
- Source-review supplement: orca-vendor-orchestration
- usage-log.md
- .claude/agents/appetite-auditor.md
- [1.1.1] - 2026-09-23
- [2.15.1] - 2026-10-08
- Hill chart: {slug}
- [2.38.0] - 2026-10-21
- [2.3.0] - 2026-09-24
- RuntimeDeps
- [2.32.0] - 2026-10-19
- Workflow usage metrics
- [2.39.0] - 2026-10-21
- [2.36.0] - 2026-10-20

## God Nodes (most connected - your core abstractions)
1. `RuntimeDeps` - 166 edges
2. `createNodeDeps()` - 124 edges
3. `Changelog` - 107 edges
4. `createTestDeps()` - 101 edges
5. `Followups` - 75 edges
6. `createPitchCompress()` - 70 edges
7. `tempFixture()` - 70 edges
8. `main()` - 57 edges
9. `FsDeps` - 55 edges
10. `spawnSync()` - 54 edges

## Surprising Connections (you probably didn't know these)
- `P2d-S2 implementation and test strategy (2026-10-22)` --references--> `legacyInventory()`  [INFERRED]
  .project/records/consolidation/plan.md → ai-framework/scripts/consolidation-migrate.mts
- `S4: guard sees a second edit to an already-changed file (added after audit, owner request, 2026-11-26)` --references--> `clean()`  [INFERRED]
  .project/pitches/01-review-bench-hardening/plan.md → ai-framework/scripts/facts-gather.mts
- `Problem and corrections` --references--> `pitches()`  [INFERRED]
  .project/records/legacy-upgrades/state-deep-evidence.md → ai-framework/scripts/facts-gather.mts
- `1. Parse Search Query` --references--> `knowledge()`  [INFERRED]
  .claude/skills/search/SKILL.md → ai-framework/scripts/facts-gather.mts
- `What this project uses` --references--> `knowledge()`  [INFERRED]
  CLAUDE.md → ai-framework/scripts/facts-gather.mts

## Import Cycles
- None detected.

## Communities (450 total, 114 thin omitted)

### Community 0 - "skill-registry.mts"
Cohesion: 0.06
Nodes (50): acquire(), cleanup(), codeOf(), context(), Created, defaultDeps(), fromBase64(), Journal (+42 more)

### Community 1 - "orca-evidence.mts"
Cohesion: 0.05
Nodes (70): Reconcile core (opt-in, library only), AdmittedWorker, Entry, absolutePath(), budget(), Bytes, CleanupDecision, CleanupResult (+62 more)

### Community 2 - "skill-vendors.test.mts"
Cohesion: 0.10
Nodes (17): BUNDLE, captureDeps(), { context, readRegistry }, __dirname, { discoverVendors, externalSkillReport, cursorMirrors }, fixture(), git(), MirrorReport (+9 more)

### Community 3 - "Issue: the git-ignored `ai_workflow_env.json` (runner `bun`) makes a test that empties PATH fail on a developer machine"
Cohesion: 0.08
Nodes (21): Issue: a headless CLI can work in the wrong directory even when the process cwd is right, Prevention, Solution, Summary, Issue: the git-ignored `ai_workflow_env.json` (runner `bun`) makes a test that empties PATH fail on a developer machine, Rule, Summary, Issue: a `node --test` child started from inside a test inherits `NODE_TEST_CONTEXT` (+13 more)

### Community 4 - "token-report.mts"
Cohesion: 0.08
Nodes (60): AVAILABILITY, basisText(), change(), cleanDimension(), CleanFlowPhase, CleanFlowPitch, CleanFlows, CleanRecord (+52 more)

### Community 5 - "Followups"
Cohesion: 0.04
Nodes (51): agent-model-sweep-bet-3 (cooldown 2026-10-17, bundled from SHIPPED.md followups) — **approved as a candidate pitch 2026-10-22**, bundle-sync-stale-ledger (cooldown 2026-10-17, bundled) — **approved as a candidate pitch 2026-10-22**, Candidate pitches (cooldown 2026-09-25, approved item by item), codex-orca-coordinator-parity — 2026-10-08, codex-trusted-hook-smoke (cooldown 2026-10-08 C2, approved 2026-10-22 as a candidate pitch), commitLedger's transaction context differs from pitch-archive's guard and recover, Confirm the new Claude Skill hook fires in a fresh session, connected-memory-consolidation — ship preparation (2026-10-23) (+43 more)

### Community 6 - "toon-data.mts"
Cohesion: 0.12
Nodes (26): toon(), DATA_GRAMMAR_VERSION, DATA_HEADER, DataError, dataErrorCodes, DataProblem, encodeArray(), encodeData() (+18 more)

### Community 7 - "token-consumption.mts"
Cohesion: 0.06
Nodes (64): withLease(), activeContext, applyTranscript(), boundedId(), boundedName(), bundleDefaultMode(), ByVendor, codeOf() (+56 more)

### Community 8 - "Security Rules"
Cohesion: 0.05
Nodes (44): 1. Authentication & Authorization, 2. Data Validation, 3. Secrets & Credentials, 4. Input Safety (XSS Prevention), 5. API Routes, 6. Multi-Tenancy / Organization Isolation, 7. File Uploads (if applicable), 8. Security Anti-Patterns (Auto-Flagged) (+36 more)

### Community 9 - "pitch-archive.mts"
Cohesion: 0.06
Nodes (59): bodyHashOf(), LedgerFileV2, LedgerSectionV2, ApprovedUpgrade, archive(), ArchiveOptions, ArchiveResult, CliOptions (+51 more)

### Community 10 - "Pattern: local eval data must be gitignored alongside the dataset specs"
Cohesion: 0.06
Nodes (28): Dependencies, Entity: Graphify (knowledge-graph front end), Interactions, Key APIs, Notes, Summary, Issue: lint-clean outcome records did not prove navigable retained content, Observation (+20 more)

### Community 11 - "workflow-metrics-report.mts"
Cohesion: 0.08
Nodes (41): main(), allTables(), buildReport(), Capture, CAPTURE_NOTES, captureStatus(), Cell, createReports() (+33 more)

### Community 12 - "orca-start.test.mts"
Cohesion: 0.11
Nodes (20): RunOptions, capabilityMutant(), base, clock(), CONCISE_CLOSED, CONCISE_NO_TERMINAL, env, example (+12 more)

### Community 13 - "_followups.md"
Cohesion: 0.03
Nodes (77): State, Reports, Structure, Consequences, Context, Decision, Decision: `/state` is a fact collector plus the pinned Archify skill, not a bundled renderer, Delivered scopes, no-gos and rabbit holes (kept when the pitch folder was compacted, 2026-11-23) (+69 more)

### Community 14 - "connected-memory-consolidation"
Cohesion: 0.15
Nodes (7): 2026-10-23 — umbrella closure approved and published, Closure log entry: connected-memory-consolidation, Remaining work: connected-memory-consolidation, baseline.mts, Measurement scripts: connected-memory-consolidation, precision.mts, connected-memory-consolidation

### Community 15 - "Nielsen's 10 Usability Heuristics for Evaluation"
Cohesion: 0.06
Nodes (33): Consistency, Control & Freedom, Efficiency, Error Handling, H10: Help & Documentation, H1: Visibility of System Status, H2: Match Between System and Real World, H3: User Control & Freedom (+25 more)

### Community 16 - "Component Architecture Patterns"
Cohesion: 0.06
Nodes (31): Accept the minimum data needed, Component Architecture Patterns, Component Layers, Component Size Rules, Cross-feature dependency?, Dual-Path Rendering Parity, Enforcement during `/build`, Extract a component when: (+23 more)

### Community 17 - "semver-range.mts"
Cohesion: 0.08
Nodes (37): versionDetail(), bump(), Comparator, compareVersions(), desugar(), holds(), isDigit(), isPlain() (+29 more)

### Community 18 - "Context Management"
Cohesion: 0.07
Nodes (29): 1. Loading Everything, 2. No Transition Summaries, 3. Ignoring Previous Sessions, 4. Inline History, Anti-Patterns, Before Each Skill Runs, Context Loading Priority, Context Loading Protocol (+21 more)

### Community 19 - "Coding Standards"
Cohesion: 0.07
Nodes (30): Avoiding Future Refactors, Booleans: prefix with `is/has/can/should`, Code Organization Checklist, Code Quality Principles, Coding Standards, Cohesive module size exceptions, Comments, Constants: `UPPER_SNAKE_CASE` (+22 more)

### Community 20 - "runtime.test.mts"
Cohesion: 0.04
Nodes (35): withCli(), pendingChildPids(), adapters, commandFixture(), delay(), direct(), fileSymlinks, here (+27 more)

### Community 21 - ".cursor/agents/architect.md"
Cohesion: 0.07
Nodes (27): 1. Current State Analysis, 1. Modularity & Separation of Concerns, 2. Requirements Gathering, 2. Scalability, 3. Design Proposal, 3. Maintainability, 4. Security, 4. Trade-Off Analysis (+19 more)

### Community 22 - "State multipage report: retained source detail"
Cohesion: 0.05
Nodes (42): valid(), 2026-10-08 — correction to the S0 entry, 2026-10-08 — S0: Orca policy valid, dispatch not ready, 2026-10-08 — S1 touched `state-theme.test.mts` (1 line), 2026-10-08 — stale `.state-stage` blocks --apply, Acknowledged → log.md, Acknowledged → log.md / followups, Acknowledged → log.md / followups (+34 more)

### Community 23 - "review-bench.mts"
Cohesion: 0.05
Nodes (73): BOOKKEEPING_FILES, BOOKKEEPING_PREFIXES, canaryCheck(), CanaryResult, CanarySpec, checkGitRepository(), checkSection(), Citation (+65 more)

### Community 24 - "bundle-sync.mts"
Cohesion: 0.10
Nodes (23): BaseLookup, classify(), colors, commandFailure(), Digest, Flagged, FLAGGED_FILES, IGNORE_NAMES (+15 more)

### Community 25 - "token-consumption.test.mts"
Cohesion: 0.07
Nodes (29): CollectorInput, CompletionRecord, Routing, SNAPSHOT_REVISION, BLOCKS, Claude, CLI, COLLECTOR (+21 more)

### Community 26 - "graphify.mts"
Cohesion: 0.06
Nodes (42): buildGraph(), DECISION_STATUSES, DecisionStatus, ensureProjectFiles(), extractTitle(), extractWikiLinks(), FrontmatterValue, GITIGNORE_BLOCK (+34 more)

### Community 27 - "installed-upgrade.test.mts"
Cohesion: 0.18
Nodes (17): SYNCED_DIRS, INDEX_START, baseline(), command(), deps, durableHashes(), exists(), flags (+9 more)

### Community 28 - "Eval Harness Skill"
Cohesion: 0.17
Nodes (12): Best Practices, Capability Evals, Eval Harness Skill, Eval Storage, Eval Types, Example: Adding Authentication, Metrics, pass@k (+4 more)

### Community 29 - "Eval Harness Skill"
Cohesion: 0.17
Nodes (12): Best Practices, Capability Evals, Eval Harness Skill, Eval Storage, Eval Types, Example: Adding Authentication, Metrics, pass@k (+4 more)

### Community 30 - "config-migrate.mts"
Cohesion: 0.07
Nodes (61): Dispatch core (opt-in, library only), Naming Convention, assertPinned(), buildModel(), convertV2(), DEFAULT_MODELS_TOON, describe(), DirPin (+53 more)

### Community 31 - "workflow-metrics-state.mts"
Cohesion: 0.06
Nodes (69): activityKey(), add(), addRecord(), addRow(), addSummary(), applyEvent(), blankNode(), blankPhaseNode() (+61 more)

### Community 32 - "flow-report.test.mts"
Cohesion: 0.12
Nodes (22): apply(), bytes(), FsOverrides, full(), generations(), historyText, leaf, NAMES (+14 more)

### Community 33 - "Observability Rules"
Cohesion: 0.08
Nodes (23): 1. Error Boundaries, 2. User Feedback (Toasts / Alerts / Inline Messages), 3. Loading States, 4. Logging Conventions, 5. Error Recovery Patterns, 6. Not-Found / Missing-Resource Handling, Backend/handler layer: throw user-friendly errors for expected failures, Do NOT put business logic in error boundaries (+15 more)

### Community 34 - "Performance Rules"
Cohesion: 0.09
Nodes (23): 1. Minimize Client-Side JavaScript, 2. Data-Access / Query Performance, 3. Bundle Size, 4. Loading States, 5. Caching, Avoid N+1 queries — don't fetch inside a loop, Avoid unnecessary re-renders, Don't fetch inside loops (+15 more)

### Community 35 - "orca-launch-gate.mts"
Cohesion: 0.05
Nodes (52): prompt(), resumeExisting(), BriefResult, CONTROL, defaultDeps(), Env, evaluateLaunch(), InstalledAgentsOptions (+44 more)

### Community 36 - "Source-review supplement: state-ai-authoring"
Cohesion: 0.18
Nodes (11): slot(), Audit cycle 1, Build deviations and rulings, Follow-ups and limits, Historical contradictions, Live harness and matrix, Review rounds, Scope and contract (+3 more)

### Community 37 - "CI/CD & Deployment Rules"
Cohesion: 0.09
Nodes (21): 1. Pre-Merge Requirements (Local), 2. Backend/Schema Deployment, 3. Environment Variables, 4. Rollback Plan, 5. Deployment Checklist, 6. What Must NOT Go to Production, 7. Multi-Service Deployment Order, Backend environment variables (+13 more)

### Community 38 - "legacy-upgrade.test.mts"
Cohesion: 0.14
Nodes (16): MAX_LEGACY_SCAN_BYTES, MAX_RECEIPT_BYTES, applyDeps, approvalOptions, approvedFixture(), base, driftFixture(), fixture (+8 more)

### Community 39 - "orca-diff-admit.mts"
Cohesion: 0.06
Nodes (41): ADMIT_BUDGET_MS, admitDiff(), AdmitOptions, AdmitResult, byteLength(), CONTROL, DIFF_FLAGS, encoder (+33 more)

### Community 40 - "token-consumption.ts"
Cohesion: 0.15
Nodes (18): hook(), recordCapture(), recordCompletion(), recordSkillUse(), subscribe(), tokenConsumptionV1(), tokenConsumptionV2(), V1BusEvent (+10 more)

### Community 41 - "Issue: a worker's environment differs from the coordinator's, and the first live smoke tests failed for that reason"
Cohesion: 0.05
Nodes (50): Consequences, Decision: the OpenCode `--agent` id is read from the host's installed agents, never guessed from a version, Summary, Why not the alternatives, Consequences, Decision, Decision: how Orca starts automatically on workflow phases, Summary (+42 more)

### Community 42 - "facts-sql.mts"
Cohesion: 0.13
Nodes (22): BENIGN, Col, Cur, DEF, dollar(), Fk, fold(), HINT (+14 more)

### Community 43 - "index.md"
Cohesion: 0.04
Nodes (67): Consequences, Decision: the metrics collector holds a kernel-owned loopback lease, not a lock file, References, Summary, Decision and consequences, Decision: Inode anchoring and stable-inode locks, Observations, Consequences (+59 more)

### Community 44 - "/setup — Project Setup & Context Generation"
Cohesion: 0.15
Nodes (13): If files exist (re-run mode):, If no files exist (first-time mode):, Important Rules, /setup — Project Setup & Context Generation, Step 0: Detect Existing Setup, Step 1: Scan Project Structure, Step 2b: Generate Stack-Specific Rules (and an Agent, if needed), Step 3: Present Findings to User (+5 more)

### Community 45 - "Phase 4: Ship"
Cohesion: 0.14
Nodes (14): 1. Final verification (mandatory), 2. Pitch ↔ implementation reconciliation → SHIPPED.md, 3. Knowledge extraction (mandatory, structured), 4. Status compaction (≤100 lines hard cap), 5. Followups handling, 6. Doc updates (conditional, recorded), Activities (in order), Confirmation gate (+6 more)

### Community 46 - "orca-preflight.mts"
Cohesion: 0.08
Nodes (35): refusal(), absolutePathEntries(), byteLength(), CALL_TIMEOUT_MS, CALLS, cli(), Context, DEFAULT_ENGINE_RANGE (+27 more)

### Community 47 - "legacy-upgrades/unified-toon-config.md"
Cohesion: 0.05
Nodes (38): Decision: shared compaction recovery context and trusted directories, Context, Decision, Decision: one `ai-workflow.toon`, schemaVersion 2, Orca nested under `integrations.orca`, Fix, How to avoid, Issue: bumping `ai-workflow.toon` to schemaVersion 3 left `config-migrate` writing 2 and 98 tests red at HEAD, Summary (+30 more)

### Community 48 - "orca-diff-admit.test.mts"
Cohesion: 0.06
Nodes (27): Holder, addCollision(), admitChecked(), AdmitResult, applyToBaseline(), Entry, Fixture, git() (+19 more)

### Community 49 - "config.test.mts"
Cohesion: 0.08
Nodes (26): MAX_CONFIG_BYTES, registerCoordinatorValidator(), registerEngineValidator(), registerIntegrationValidator(), BASELINE_TOON, loadAny(), loadText(), memoryDeps() (+18 more)

### Community 50 - "types.mts"
Cohesion: 0.06
Nodes (50): discover(), FULL_ROOTS, launch, main(), MAX_WORKERS, Options, parseArgs(), select() (+42 more)

### Community 51 - ".project/knowledge/patterns/a-gate-must-not-trust-its-own-author.md"
Cohesion: 0.04
Nodes (45): Consequences, Decision, Decision: `/shape-lite` is a compressed variant of `/shape` that escalates mechanically, Fix and rule, Issue: a loop that appends to a string and reads `s[s.length - 1]` is quadratic without any regex, Symptom, Issue: a wall-clock ratio test can block a ship on a busy machine, Fix and rule (+37 more)

### Community 52 - "workflow-metrics-state.test.mts"
Cohesion: 0.08
Nodes (33): usageState(), blankState(), name(), SCHEMA_VERSION, apply(), at(), capture(), credited() (+25 more)

### Community 53 - "instruction-loading.test.mts"
Cohesion: 0.09
Nodes (32): CASE_STATUS, CaseSpec, Context, criteriaOf(), Criterion, Dataset, deps, Evidence (+24 more)

### Community 54 - ".project/knowledge/patterns/a-grader-reports-executed-and-unexecuted-cases-separately.md"
Cohesion: 0.08
Nodes (21): Evidence, Pattern: a grader reports executed and unexecuted cases separately, Summary, The Pattern, How to apply, Pattern: a parenthetical example in a model instruction acts as a rule, so test it on the case it names, Summary, What happened (+13 more)

### Community 55 - "flow-join.mts"
Cohesion: 0.05
Nodes (76): Agg, Availability, Bounds, cells(), child(), cmp(), count(), entries() (+68 more)

### Community 56 - "makeValidator"
Cohesion: 0.21
Nodes (19): dataset(), main(), makeValidator(), checkCavemanEntryFiles(), checkConsolidation(), checkContext(), checkCursorMirrors(), checkEntryFiles() (+11 more)

### Community 57 - "orca-eval-grader.mts"
Cohesion: 0.07
Nodes (69): Placement, ScopeSpec, agentProbe(), allTrue(), argAfter(), Behaviour, BRIEF_FIELDS, CaseResult (+61 more)

### Community 58 - "flow-report.mts"
Cohesion: 0.11
Nodes (39): Format, ownsFormat(), renderFormats(), applyReport(), Collected, collectSources(), failure(), inspectOwned() (+31 more)

### Community 59 - "node.mts"
Cohesion: 0.08
Nodes (13): boundedClose(), cleanupError(), closedChildren, nodeNet, ownedChildren, posixGroupIsRunning(), ProcessGroupInspection, reconcileClosedOwner() (+5 more)

### Community 60 - "Phase 3: Audit"
Cohesion: 0.10
Nodes (21): Adaptive gate, Confirmation gate, Cross-pitch conflict check, Eval gate (AI changes — hard), Evidence rule (same as /build), Finding contract (every subagent), Incomplete reviews, Loop discipline (+13 more)

### Community 61 - "Compaction record: orca-vendor-foundation"
Cohesion: 0.07
Nodes (28): Open items, Pinned runtime contract, Review and release provenance, Scope and policy contract, Source-review supplement: orca-vendor-foundation, Verification and mutation evidence, Compaction record: orca-vendor-foundation, Section 10: pitch.md#rabbit-holes (+20 more)

### Community 62 - "/test-strategy — Smart Testing"
Cohesion: 0.10
Nodes (20): 1. Load transition summary, 2. Read testing rules, 3. Strategy pass, 4. Build and present test plan, 5. Get approval on the test plan, 6. Write the tests, 7. Run tests, 8. Check coverage (+12 more)

### Community 63 - "skill-source.mts"
Cohesion: 0.11
Nodes (27): Fake, Fake, SpawnOptions, defaultDeps(), frontmatter(), git(), gitBytes(), GitFailure (+19 more)

### Community 64 - "AI-Assisted Development Workflow"
Cohesion: 0.18
Nodes (11): Adaptive confirmation gate, AI-Assisted Development Workflow, Confirmation gate philosophy, Hill chart, Multi-pitch parallel work (first-class), Phase details, Pipeline, Pitch folder layout (+3 more)

### Community 65 - "Knowledge Graph"
Cohesion: 0.12
Nodes (16): Auditing, Confidence Levels, Decisions (`decisions/`), Entities (`entities/`), Entry Format, How Knowledge is Used, Index Format, Issues (`issues/`) (+8 more)

### Community 66 - "Knowledge Graph"
Cohesion: 0.12
Nodes (16): Auditing, Confidence Levels, Decisions (`decisions/`), Entities (`entities/`), Entry Format, How Knowledge is Used, Index Format, Issues (`issues/`) (+8 more)

### Community 67 - "config-migrate.test.mts"
Cohesion: 0.11
Nodes (11): BACKUP_DIR, main(), STATE_FILE, after(), capture(), deps, LEGACY, POLICY (+3 more)

### Community 68 - "Model Routing Strategy"
Cohesion: 0.13
Nodes (15): Always, Cascade Pipeline, Conditional Phases, Context budget discipline, Cost Measurement, Cost Optimization Rules, Don't over-front-load context, Model Routing Strategy (+7 more)

### Community 69 - "orca-run.test.mts"
Cohesion: 0.09
Nodes (22): Calls, dispatching(), dispatchInput(), EXAMPLE, failing, Fixture, git(), Harness (+14 more)

### Community 70 - "graphify-relations.mts"
Cohesion: 0.08
Nodes (37): adapterFiles(), canonicalFiles(), canonicalOf(), CheckOptions, checkRelations(), DECLARED, declaredEdges(), DeclaredRelation (+29 more)

### Community 71 - "facts-project.test.mts"
Cohesion: 0.18
Nodes (13): ProjectBudgets, api(), countingReadSql(), deps, drizzle(), fixture(), journal(), put() (+5 more)

### Community 72 - "Compaction record: workflow-usage-metrics"
Cohesion: 0.10
Nodes (21): Compaction record: workflow-usage-metrics, Section 10: deviations.md#d3-audit-hardening-and-path-check-boundary, Section 11: deviations.md#d4-coupled-modules-and-explicit-schema-validation, Section 12: log.md#2026-10-08-s1-start, Section 13: log.md#s1-verification-attempt-1, Section 14: log.md#s1-compatibility-run, Section 15: log.md#s1-exit-evidence-complete, Section 16: log.md#s2-start-approved (+13 more)

### Community 73 - "Testing Rules"
Cohesion: 0.18
Nodes (11): Coverage Targets (starting point — adjust per project), E2E Scope, File Organization, Guards and Fixes, Guards and Fixes: Prove the Test Can Fail, Mocking Discipline, Testing Checklist for New Features, Testing Rules (+3 more)

### Community 74 - "orca-start.mts"
Cohesion: 0.10
Nodes (29): fake(), buildWorkerEnv(), Receipt, ACTIVE_DISPATCH, ACTIVE_WORKER, blocked(), Budget, decideStart() (+21 more)

### Community 75 - "/sync — Sync Tasks with Notion"
Cohesion: 0.06
Nodes (31): sync, After `/ship-pitch`, Arguments, Config File, During `/resume`, Error Handling, First-Time Setup, Full Sync (Default) (+23 more)

### Community 76 - "Security Reviewer"
Cohesion: 0.12
Nodes (16): 1. Initial Scan, 2. OWASP Top 10 Check, 3. Code Pattern Review, Analysis Commands, Common False Positives, Core Responsibilities, Emergency Response, Hard rules (always apply, no exceptions) (+8 more)

### Community 77 - "OpenCode + Orca Handoff"
Cohesion: 0.12
Nodes (14): Configuration, Current adapter state, How to verify, Known blockers, Next steps to make Orca work from OpenCode, OpenCode + Orca Handoff, Orca runtime probe, Related files (+6 more)

### Community 78 - "Issue: a subagent's audit report contained numbers and names the code and the test run contradicted"
Cohesion: 0.07
Nodes (25): Issue: removing code can break the graph through records that cite it, Prevention, Root Cause, Solution, Summary, Symptoms, Fix, Issue: a cross-pitch-conflict-checker cannot separate authorship in a file two uncommitted pitches share (+17 more)

### Community 79 - "orca-start-codex-hook.test.mts"
Cohesion: 0.06
Nodes (41): blocked(), blockedText(), deps, fixture(), run(), PHASES, repo, script (+33 more)

### Community 80 - "facts-gather.test.mts"
Cohesion: 0.09
Nodes (21): api, archify, AWKWARD_TABLES, Block, blocksOf(), databaseNote(), deps, diagrams() (+13 more)

### Community 81 - "validate.test.mts"
Cohesion: 0.13
Nodes (14): createValidator(), lex(), MAX_SOURCE_BYTES, scan(), suggestions, base, check(), evasions (+6 more)

### Community 82 - "State report"
Cohesion: 0.09
Nodes (23): Failure modes, How it is run here, Ownership and reset, Pinned Archify, Related, Run it, State report, What it reads, and what it never does (+15 more)

### Community 83 - "AI Tool Use Constraints & Enforcement"
Cohesion: 0.13
Nodes (14): 1. Document in system prompt, 2. Add server-side deduplication, 3. Add tests, 4. Monitor and log, AI Tool Use Constraints & Enforcement, Checklist, Core Rule, Implementation Pattern (+6 more)

### Community 84 - "workflow-capture.test.mts"
Cohesion: 0.15
Nodes (11): directory(), main(), CAPTURE_REGISTRATIONS, captureFixture(), raw(), state(), CaptureHookGroup, CONTEXT (+3 more)

### Community 85 - "createFactsGather"
Cohesion: 0.14
Nodes (28): All vendors available in the project, Bundle-sync migration (`skill-sync.mts`), Doctor and setup integration, Inspect, choose and install, Instance-managed skills, Lifecycle and recovery, Registry and source packages, Verification (+20 more)

### Community 86 - "main"
Cohesion: 0.13
Nodes (54): legacyInventory(), hasRawHook(), hooksDir(), checkUsedAgainstSnapshot(), readSnapshotFile(), errorCodes, ModelsConfig, runWorkflow() (+46 more)

### Community 87 - "Source-review supplement: test-execution-performance"
Cohesion: 0.20
Nodes (10): Historical contradictions, Measured outcome, No-gos, Open followups, Rabbit holes, Research notes, Scopes and deviations, Source-review supplement: test-execution-performance (+2 more)

### Community 88 - ".claude/agents/build-error-resolver.md"
Cohesion: 0.10
Nodes (13): test-strategy, 1. Collect All Errors, 2. Fix Strategy (MINIMAL CHANGES), 3. Common Fixes, Build Error Resolver, Core Responsibilities, Diagnostic Commands, DO and DON'T (+5 more)

### Community 89 - "facts-project.mts"
Cohesion: 0.11
Nodes (20): Depth, Fact, Facts, INERT, Limits, REPORT_DIRECTORY, Status, STATUSES (+12 more)

### Community 91 - "graphify.test.mts"
Cohesion: 0.14
Nodes (14): OpenCode port before the first OpenCode worker, RAW_HOOK_END, RAW_HOOK_START, BASE_GRAPH, cleanTree(), decisionTree(), deps, entry() (+6 more)

### Community 92 - "migrate.mts"
Cohesion: 0.23
Nodes (16): ConfigMigration, addMissingHooks(), Change, EntryMigration, FILES, groupScripts(), isRecord(), migrateHooks() (+8 more)

### Community 93 - "post-edit-check.mts"
Cohesion: 0.20
Nodes (11): check(), fileUrl(), loadTypescript(), main(), Plain, resolveMain(), Fake, projectWithTypescript() (+3 more)

### Community 94 - "fail"
Cohesion: 0.29
Nodes (10): fail(), parseCells(), parseData(), parseScalar(), Reader, readHeader(), readKey(), readQuoted() (+2 more)

### Community 95 - "Audit cycle1 — P2d and P2c (separate from completed P1/P2a audit)"
Cohesion: 0.12
Nodes (16): Acknowledged (log.md), Audit cycle1 — P2d and P2c (separate from completed P1/P2a audit), audit-cycle-1, Audit cycle 1 — connected-memory-consolidation (P1 and P2a), audit-cycle-3, Audit cycle 3 — connected-memory-consolidation (last cycle for big-batch), Audit cycles: connected-memory-consolidation, Audit-end gate (+8 more)

### Community 96 - "readSnapshot"
Cohesion: 0.16
Nodes (21): addNumber(), applyDimensions(), applyFlows(), applyRecord(), applyToRow(), applyToSnapshot(), blankDimensions(), blankFlows() (+13 more)

### Community 97 - ".project/knowledge/issues/orca-worker-list-concise-view-hides-the-worker-identity-fields.md"
Cohesion: 0.09
Nodes (22): Context, Decision, Decision: the Orca caller-identity lookup is bounded by live work, and a refused start keeps its reason without weakening ownership, Delivered scopes, no-gos and rabbit holes (kept when the pitch folder was compacted, 2026-11-23), Summary, Follow-up: make the gate tolerate the next update (2.51.2), Issue: an Orca CLI upgrade silently changed output the launch gate parses, Prevention (+14 more)

### Community 98 - "config.mts"
Cohesion: 0.07
Nodes (43): CAVEMAN_MODES, COORDINATOR_KEYS, coordinatorValidators, defaultDeps(), defaultOrca(), engineValidators, expectBoolean(), expectInteger() (+35 more)

### Community 99 - "ledger-schema.mts"
Cohesion: 0.07
Nodes (44): accountFiles(), checkEntry(), CLASSES, Disposition, DISPOSITIONS, DONE_WORK_FILE, FILE_KEYS, FileAccount (+36 more)

### Community 100 - "Rollback Plan: [Feature Name]"
Cohesion: 0.15
Nodes (12): Code rollback:, Communication, Deployment Steps, If feature-flagged:, If schema change involved:, Notes, Post-Rollback, Pre-Deployment Checklist (+4 more)

### Community 101 - "Design: [Feature Name]"
Cohesion: 0.15
Nodes (12): Component Design, Data Model Changes, Design Decisions, Design: [Feature Name], Files to Create/Modify, Implementation Steps, Open Questions, Overview (+4 more)

### Community 102 - "Decision: how `/pitch-compress` decides a deletion is safe"
Cohesion: 0.05
Nodes (35): Consequences, Context, Decision, Decision: accept reviewed destination drift by binding both versions, Consequences, Decision, Decision: how `/pitch-compress` decides a deletion is safe, References (+27 more)

### Community 103 - ".claude/agents/planner.md"
Cohesion: 0.07
Nodes (24): 1. Requirements Analysis, 2. Architecture Review, 3. Step Breakdown, 4. Implementation Order, Best Practices, Plan Format, Planning Process, Red Flags to Check (+16 more)

### Community 104 - "Refactor & Dead Code Cleaner"
Cohesion: 0.07
Nodes (24): 1. Analyze, 2. Verify, 3. Remove Safely, 4. Consolidate Duplicates, Core Responsibilities, Detection Commands, Key Principles, Refactor & Dead Code Cleaner (+16 more)

### Community 105 - "Steps"
Cohesion: 0.13
Nodes (15): 1. Understand the UI requirement, 2. Load design rules, 3. Design component hierarchy, 4. ASCII wireframe (for complex layouts), 5. Generate component skeletons, 6. Generate i18n key list (if applicable), 7. Self-validate each generated file, 8. Present for approval (+7 more)

### Community 106 - "spawnSync"
Cohesion: 0.09
Nodes (33): stopped(), fixture(), run(), flags, repo, script, testDeps, tmpdir() (+25 more)

### Community 107 - "tempFixture"
Cohesion: 0.16
Nodes (11): fixture(), run(), repo(), withWorkflowRoot(), tempFixture(), The Pattern, Deviations: package-less-ship-verification, Evidence (2026-11-25, uncommitted tree on `feat/ship-state-project-sources`) (+3 more)

### Community 108 - "Rollback Plan: [Feature Name]"
Cohesion: 0.15
Nodes (12): Code rollback:, Communication, Deployment Steps, If feature-flagged:, If schema change involved:, Notes, Post-Rollback, Pre-Deployment Checklist (+4 more)

### Community 109 - "Design: [Feature Name]"
Cohesion: 0.15
Nodes (12): Component Design, Data Model Changes, Design Decisions, Design: [Feature Name], Files to Create/Modify, Implementation Steps, Open Questions, Overview (+4 more)

### Community 110 - "/impact — Impact Analysis"
Cohesion: 0.14
Nodes (14): 1. Load the design plan, 2. Trace downstream consumers, 3. Check boundary violations, 4. Identify affected tests, 5. Check knowledge graph for relevant warnings, 6. Risk summary, Confirmation Gate, Context Budget (+6 more)

### Community 111 - "makeSync"
Cohesion: 0.24
Nodes (23): argValue(), codeOf(), makeSync(), applyEntry(), archifyPinStep(), assertNoSymlinkPath(), compareDir(), compareFlagged() (+15 more)

### Community 112 - "orca-reconcile.test.mts"
Cohesion: 0.11
Nodes (15): CheckSpec, CATALOG, complete(), deps, ENV, Fixture, git(), node() (+7 more)

### Community 113 - "outcome-record.mts"
Cohesion: 0.07
Nodes (47): scanRecords(), DEFAULT_PER_FILE_REFS, DEFAULT_REF_BUDGET, DEFAULT_TOTAL_REFS, DeriveInput, deriveRefs(), DeriveResult, dropHubTargets() (+39 more)

### Community 114 - "token-report.test.mts"
Cohesion: 0.13
Nodes (11): Dimensions, Flows, Snapshot, main(), here, Loose, Nested, SnapshotParts (+3 more)

### Community 115 - "Harness Integration Guide"
Cohesion: 0.17
Nodes (12): Capability Profiles, Caveman Mode, Claude Code, Codex, Harness Integration Guide, Instance-managed Skills, Mandatory: project-root `ai-workflow.toon`, OpenCode (+4 more)

### Community 116 - "orca-dispatch.mts"
Cohesion: 0.05
Nodes (72): eligible(), leastLoaded(), memberLoad(), nextMember(), Pick, PickFailure, pickImplementer(), PickInput (+64 more)

### Community 117 - "changelog.test.mts"
Cohesion: 0.17
Nodes (21): allArgs(), arg(), buildEntry(), bump(), codeOf(), Context, EntryParts, fail() (+13 more)

### Community 118 - "Wireframe: [Feature Name]"
Cohesion: 0.17
Nodes (11): Accessibility Notes, Component Map, Design Tokens Used, Desktop (>= 1024px), Interactive Elements, Mobile (< 768px), Open Questions, Screen Layout (+3 more)

### Community 119 - "Wireframe: [Feature Name]"
Cohesion: 0.17
Nodes (11): Accessibility Notes, Component Map, Design Tokens Used, Desktop (>= 1024px), Interactive Elements, Mobile (< 768px), Open Questions, Screen Layout (+3 more)

### Community 120 - "facts-sql.test.mts"
Cohesion: 0.11
Nodes (12): SqlFile, BIG, cpuClock(), CpuSource, cpuTimed(), deps, probe(), rel() (+4 more)

### Community 121 - "AGENTS.md"
Cohesion: 0.13
Nodes (14): AGENTS.md, Architecture, Codex Orca coordination, Confirmation gate (always), Guardrails, Product, Project Records, Project specifics (+6 more)

### Community 122 - "Wireframe: [Feature Name]"
Cohesion: 0.17
Nodes (11): Accessibility Notes, Component Map, Design Tokens Used, Desktop (>= 1024px), Interactive Elements, Mobile (< 768px), Open Questions, Screen Layout (+3 more)

### Community 123 - "Wireframe: [Feature Name]"
Cohesion: 0.17
Nodes (11): Accessibility Notes, Component Map, Design Tokens Used, Desktop (>= 1024px), Interactive Elements, Mobile (< 768px), Open Questions, Screen Layout (+3 more)

### Community 124 - "Compaction record: native-safety-feasibility"
Cohesion: 0.11
Nodes (16): Assurance limits, Audit triage, Problem and plan contract, Source-review supplement: native-safety-feasibility, Compaction record: native-safety-feasibility, Section 10: log.md#2026-09-26-shipped, Section 1: SHIPPED.md#reconciliation, Section 2: SHIPPED.md#verification-and-audit (+8 more)

### Community 125 - "Audit reviews: connected-memory-consolidation"
Cohesion: 0.10
Nodes (20): audit-records/2026-10-23-p2d-p2c-repair/actual-ownership.toon, audit-records/2026-10-23-p2d-p2c-repair/baseline-provenance.toon, audit-records/2026-10-23-p2d-p2c-repair/completion-code.md, audit-records/2026-10-23-p2d-p2c-repair/completion-coverage.md, audit-records/2026-10-23-p2d-p2c-repair/completion-security.md, audit-records/2026-10-23-p2d-p2c-repair/cross-complete.md, audit-records/2026-10-23-p2d-p2c-repair/cross.md, audit-records/2026-10-23-p2d-p2c-repair/guard-and-source-witness.toon (+12 more)

### Community 126 - "/setup — Project Setup & Context Generation"
Cohesion: 0.15
Nodes (13): If files exist (re-run mode):, If no files exist (first-time mode):, Important Rules, /setup — Project Setup & Context Generation, Step 0: Detect Existing Setup, Step 1: Scan Project Structure, Step 2b: Generate Stack-Specific Rules (and an Agent, if needed), Step 3: Present Findings to User (+5 more)

### Community 127 - "orca-ledger.mts"
Cohesion: 0.06
Nodes (60): authorizedPathsOverlap(), canonical(), ClaimResult, computeArgsDigest(), createLedger(), acquireIntegration(), acquireLock(), claim() (+52 more)

### Community 128 - "stuck-uphill-detector.mts"
Cohesion: 0.30
Nodes (13): appendAudit(), checkPitchFile(), detectStuck(), HillRow, insidePitches(), listActivePitches(), main(), parseHill() (+5 more)

### Community 129 - ".project/knowledge/patterns/keep-the-fakes-guarantee-the-thing-they-replace.md"
Cohesion: 0.04
Nodes (46): Fix, Issue: a `failedStage` that was not a string read as "no failed stage", so an empty residual list looked cleanly retryable, Lesson, Summary, Issue: hand-written fixtures that list the contract broke four times as the contract grew, What helped, Issue: a sparse array hole skips `every` but is visited by `for-of`, Prevention (+38 more)

### Community 130 - "opencode-plugin.test.mts"
Cohesion: 0.04
Nodes (35): Knowledge Graph, Event, here, PluginRun, pluginUrl, snapshot(), snapshotOf(), testDeps (+27 more)

### Community 131 - "ADR-NNNN: [Decision Title]"
Cohesion: 0.18
Nodes (10): ADR-NNNN: [Decision Title], Alternatives Considered, Consequences, Context, Decision, Negative, Option A: [Name], Option B: [Name] (+2 more)

### Community 132 - "Feature: [Feature Name]"
Cohesion: 0.18
Nodes (10): Acceptance Criteria, Affected Areas, Description, Feature: [Feature Name], i18n Requirements, In Scope, Notes, Out of Scope (+2 more)

### Community 133 - "pre-ship-verify.mts"
Cohesion: 0.10
Nodes (32): asRecord(), buildChecks(), Check, CHECK_KEYS, CheckResult, CheckSource, CLI_BY_MANAGER, diffSanity() (+24 more)

### Community 134 - "ownedPaths"
Cohesion: 0.22
Nodes (6): checkCollisions(), ownedPaths(), reconcile(), reconcileEntry(), RegistryApi, VendorsApi

### Community 135 - "ADR-NNNN: [Decision Title]"
Cohesion: 0.18
Nodes (10): ADR-NNNN: [Decision Title], Alternatives Considered, Consequences, Context, Decision, Negative, Option A: [Name], Option B: [Name] (+2 more)

### Community 136 - "Feature: [Feature Name]"
Cohesion: 0.18
Nodes (10): Acceptance Criteria, Affected Areas, Description, Feature: [Feature Name], i18n Requirements, In Scope, Notes, Out of Scope (+2 more)

### Community 137 - "Source-review supplement: token-attribution"
Cohesion: 0.18
Nodes (15): leafCount(), leastRecentPitch(), resolveFlow(), routedTo(), From token-attribution (2026-10-19), Audit history, Build notes, Deviations (+7 more)

### Community 138 - "toon-machine-data"
Cohesion: 0.09
Nodes (18): _comment, $schema, Contracts, Data grammar 1.0, Decision: TOON data grammar 1.0 for workflow-only data files, Why a second grammar, Decision: workflow data files use their own TOON grammar, separate from the configuration parser, Issue: a mutant that removes a loop's stall guard hangs an unbounded test run (+10 more)

### Community 139 - "orca-launch-gate.test.mts"
Cohesion: 0.11
Nodes (19): agentProber(), common, engineRoot(), EXAMPLE, fixture(), nodeDeps, Obj, ok (+11 more)

### Community 140 - "data-file.mts"
Cohesion: 0.13
Nodes (28): What to do, candidates(), checkJsonValue(), dataFileErrorCodes, DataFormat, DataReadResult, DataRefusal, DataWriteResult (+20 more)

### Community 141 - "add-skill.mts"
Cohesion: 0.10
Nodes (25): AddSkillOptions, AddSkillResult, checkNamespace(), cli(), { context, digest, json, snapshot, readRegistry, transact, recover, resolveFile }, defaultDeps(), { discoverVendors, adapters }, globalLink() (+17 more)

### Community 142 - "orca-dispatch.test.mts"
Cohesion: 0.07
Nodes (38): classifyLiveness(), ORCA_TIMEOUT_MARGIN_MS, agentOf(), agentsOf(), assertRequestRefusal(), assigned(), base(), Behaviour (+30 more)

### Community 143 - "stack.md"
Cohesion: 0.05
Nodes (33): Plan, ui-design, AI Language Behavior (if applicable), Hardcoded Copy Policy, Internationalization (i18n) Rules, Key Design, Locale Strategy, Message File Structure (+25 more)

### Community 144 - "orca-policy.mts"
Cohesion: 0.07
Nodes (39): OpenCode agent id, request ids and releasing workers, boundedInteger(), cli(), Coordinator, defaultDeps(), errorCode(), hasKeys(), inspectPath() (+31 more)

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

### Community 149 - "browser-runtime.test.mts"
Cohesion: 0.06
Nodes (39): Formatting installed content, BrowserReport, catalogEntry(), cli(), CliOptions, CliState, cliStatus(), defaultDeps() (+31 more)

### Community 150 - "skill-defaults.test.mts"
Cohesion: 0.06
Nodes (42): CatalogEntry, cli(), CliOptions, defaultDeps(), defaultRegistry, DefaultReport, extractInvocationArg(), isRecord() (+34 more)

### Community 151 - "Entity: Name"
Cohesion: 0.22
Nodes (8): Dependencies, Entity: Name, Interactions, Key APIs, Location, Notes, Responsibilities, Summary

### Community 152 - "upgrade.test.mts"
Cohesion: 0.15
Nodes (19): Beyond the core pipeline, The pipeline, assertHealthy(), COMMANDS, comparable(), docsOnlyDoctorFailures(), graphifyShape(), migrateConfig() (+11 more)

### Community 153 - "Compaction record: independent-rereview-catch-up"
Cohesion: 0.06
Nodes (31): Compaction review detail, Historical inconsistencies, Metrics and state review detail, Reviewer protocol rationale, Source-review supplement: independent-rereview-catch-up, Compaction record: independent-rereview-catch-up, Section 10: pitch.md#rabbit-holes, Section 11: audit-cycle-1.md (+23 more)

### Community 154 - "orca-contract.mts"
Cohesion: 0.10
Nodes (32): buildSnapshot(), byteLength(), CONTRACT_MAX_BYTES, ContractDiff, ContractEntry, ContractResult, ContractSnapshot, diffContract() (+24 more)

### Community 155 - "pitch-archive.test.mts"
Cohesion: 0.22
Nodes (15): overlayKnowledge(), renderIndex(), commitFixtureLedger(), editLedger(), fixture(), keepV2(), killMidTransaction(), placeLedger() (+7 more)

### Community 156 - "/test-strategy — Smart Testing"
Cohesion: 0.10
Nodes (20): 1. Load transition summary, 2. Read testing rules, 3. Strategy pass, 4. Build and present test plan, 5. Get approval on the test plan, 6. Write the tests, 7. Run tests, 8. Check coverage (+12 more)

### Community 157 - ".claude/skills/dependency-security/SKILL.md"
Cohesion: 0.13
Nodes (11): Dependency Security, After Approved Remediation, Dependency Security, Output, Procedure, Safety Rules, After Approved Remediation, Dependency Security (+3 more)

### Community 158 - "Bug: [Short Description]"
Cohesion: 0.22
Nodes (8): Affected Files, Bug: [Short Description], Description, Environment, Expected Behavior, Fix, Reproduction Steps, Root Cause

### Community 159 - "createProjectFacts"
Cohesion: 0.18
Nodes (29): Project depth (pitch `state-project-depth`), createProjectFacts(), chooseSource(), database(), detectSources(), discoverWorkspaces(), expandWorkspace(), fileExists() (+21 more)

### Community 160 - "Compaction record: bundle-sync-marker-fix"
Cohesion: 0.17
Nodes (12): Compaction record: bundle-sync-marker-fix, Section 10: audit-cycle-1.md, Section 11: log.md#s1-2026-09-26, Section 1: SHIPPED.md#scope-reconciliation, Section 2: SHIPPED.md#verification, Section 3: SHIPPED.md#audit, Section 4: SHIPPED.md#no-gos-honored, Section 5: SHIPPED.md#rabbit-holes-and-deviations (+4 more)

### Community 161 - "validUsage"
Cohesion: 0.26
Nodes (23): count(), date(), keysAre(), normalizeEvent(), object(), scopeKey(), storedName(), storedPitch() (+15 more)

### Community 162 - "legacy-upgrade.mts"
Cohesion: 0.14
Nodes (35): projectNames(), readProjectBytes(), readProjectText(), legacyEntries(), deriveOutcomeRefs(), destinationPath(), destinationRefusal(), apply() (+27 more)

### Community 163 - ".project/knowledge/patterns/an-ownership-predicate-must-mirror-the-claim-transactions-set.md"
Cohesion: 0.10
Nodes (18): Decision, Decision: an Orca pool pick takes the least-loaded eligible member of the current Run, Limits (kept), Summary, Fix and rule, Issue: a worker that fails before it is claimed never gains load, so least-load picks it every time, Symptom, How to apply (+10 more)

### Community 164 - "Issue: Title"
Cohesion: 0.25
Nodes (7): Issue: Title, Prevention, Related, Root Cause, Solution, Summary, Symptoms

### Community 165 - "Pattern: Title"
Cohesion: 0.25
Nodes (7): Examples in Codebase, Pattern: Title, Related Patterns, Summary, The Pattern, When NOT to Use, When to Use

### Community 166 - "Source-review supplement: vendor-model-toon"
Cohesion: 0.25
Nodes (8): Built, ConfigModel, Design decisions, Historical contradictions, Historical limits, Scope and limits, Source-review supplement: vendor-model-toon, Verification history

### Community 167 - "Changelog"
Cohesion: 0.08
Nodes (25): [2.0.1] - 2026-09-23, [2.24.0] - 2026-10-16, [2.26.0] - 2026-10-16, [2.31.8] - 2026-10-19, [2.34.0] - 2026-10-19, [2.41.0] - 2026-10-22, [2.46.0] - 2026-10-22, [2.4.0] - 2026-09-25 (+17 more)

### Community 168 - "orca-run.mts"
Cohesion: 0.08
Nodes (52): Assignment, DispatchOptions, dispatchWithRetries(), report(), bad(), checkCatalog(), CliError, collectInput() (+44 more)

### Community 169 - "Pitch: {slug}"
Cohesion: 0.22
Nodes (8): Bet decision, Critique findings (auto-populated by /critique for big-batch + AI scopes), Knowledge consulted, No-gos (this pitch), Pitch: {slug}, Problem, Rabbit holes, Solution sketch (breadboard, NOT wireframe)

### Community 170 - "hooks"
Cohesion: 0.20
Nodes (10): hooks, PostToolUse, PreToolUse, SessionEnd, SessionStart, Stop, SubagentStart, SubagentStop (+2 more)

### Community 171 - "Compaction record: orca-vendor-dispatch"
Cohesion: 0.13
Nodes (13): Audit and historical limits, Runtime receipts and ownership, Scope and source discrepancies, Source-review supplement: orca-vendor-dispatch, Compaction record: orca-vendor-dispatch, Section 1: SHIPPED.md#final-verification, Section 2: SHIPPED.md#reconciliation, Section 3: SHIPPED.md#audit (+5 more)

### Community 172 - "Source-review supplement: state-quoted-fonts"
Cohesion: 0.25
Nodes (6): Historical naming, Mutation proof, Review and verification chronology, Scope and problem, Source-review supplement: state-quoted-fonts, state-quoted-fonts

### Community 173 - "Issue: Title"
Cohesion: 0.25
Nodes (7): Issue: Title, Prevention, Related, Root Cause, Solution, Summary, Symptoms

### Community 174 - "Pattern: Title"
Cohesion: 0.25
Nodes (7): Examples in Codebase, Pattern: Title, Related Patterns, Summary, The Pattern, When NOT to Use, When to Use

### Community 175 - ".claude/agents/cross-pitch-conflict-checker.md"
Cohesion: 0.17
Nodes (8): Constraints, Inputs (provided by dispatcher), Output structure, Process, Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 176 - "Compaction record: state-quoted-fonts"
Cohesion: 0.17
Nodes (12): Compaction record: state-quoted-fonts, Section 10: audit-cycle-1.md, Section 11: log.md#s1-2026-09-26, Section 1: SHIPPED.md#scope-reconciliation, Section 2: SHIPPED.md#verification, Section 3: SHIPPED.md#audit, Section 4: SHIPPED.md#no-gos-honored, Section 5: SHIPPED.md#rabbit-holes-and-deviations (+4 more)

### Community 177 - "orca-start-codex-hook.mts"
Cohesion: 0.23
Nodes (12): blockedLine(), leadingPhase(), main(), object(), ObjectValue, rootArgument(), blockedLine(), main() (+4 more)

### Community 178 - "Plan: package-less-ship-verification"
Cohesion: 0.22
Nodes (8): Exit criteria per scope (machine-checkable), Living-spec deviations log, Parallel dispatch plan, Plan: package-less-ship-verification, Risks, S1, S2, Spike results (2026-11-25, Node 24.21.0, commit 81e1bcb)

### Community 179 - "Decision Title"
Cohesion: 0.29
Nodes (6): Consequences, Context, Decision, Decision Title, References, Summary

### Community 180 - "Source-review supplement: workflow-usage-capture"
Cohesion: 0.13
Nodes (16): resolvePhaseContext(), What shipped, A1 prerequisite, Delivered behavior, Historical contradictions, Limits and open items, Measurements, Payload facts (+8 more)

### Community 181 - "Steps"
Cohesion: 0.12
Nodes (15): 1. Understand the UI requirement, 2. Load design rules, 3. Design component hierarchy, 4. ASCII wireframe (for complex layouts), 5. Generate component skeletons, 6. Generate i18n key list (if applicable), 7. Self-validate each generated file, 8. Present for approval (+7 more)

### Community 182 - ".claude/skills/cooldown/SKILL.md"
Cohesion: 0.11
Nodes (13): Cooldown, Activities (in order), Cooldown, Output, Per-item approval, Transition, When to use, Activities (in order) (+5 more)

### Community 183 - "Source-review supplement: token-time-report"
Cohesion: 0.15
Nodes (13): Audit evidence and limits, Audit triage, Build and Orca history, Cohesive module exceptions, Design decisions, Historical contradictions, Lessons and open items, Release and recovery records (+5 more)

### Community 184 - "Pattern: a source scanner fails closed on whatever it cannot read"
Cohesion: 0.07
Nodes (25): Consequences, Decision, Decision: how the runtime boundary is validated, Summary, Pattern: resolve a caller-supplied limits object once, into a plain snapshot, before any cap is checked, Related, Summary, The Pattern (+17 more)

### Community 185 - ".project/knowledge/patterns/warn-text-must-be-self-consistent-with-the-code-it-ships.md"
Cohesion: 0.08
Nodes (22): Examples in Codebase, Pattern: Mandatory config files emit one top-level failure, not N per-consumer failures, Related Patterns, Summary, The Pattern, When NOT to Use, When to Use, Examples in Codebase (+14 more)

### Community 186 - "Source-review supplement: instruction-compression"
Cohesion: 0.13
Nodes (15): Baseline experiment and S1 amendment, Delivered scope, Historical contradictions, Native observation and measurements, No-gos, rabbit holes and limits, Open items, Operational lessons, Plan, boundary and exit contract (+7 more)

### Community 187 - ".claude/skills/bundle-sync/SKILL.md"
Cohesion: 0.15
Nodes (8): Bundle Sync, Instrumentation and shared adapters, Module and adapter decisions, Parity and discovery evidence, Scope and historical limits, Source-review supplement: ts-runtime-injection, Upgrade and audit lessons, ts-runtime-injection

### Community 188 - "Source-review supplement: agent-model-sweep"
Cohesion: 0.18
Nodes (12): extractAgentProfile(), What happened, Audit chronology, Build decisions and incidents, Follow-ups and historical limits, Historical contradictions, Knowledge and lessons, No-gos and resolved rabbit holes (+4 more)

### Community 189 - "Security Reviewer"
Cohesion: 0.12
Nodes (16): 1. Initial Scan, 2. OWASP Top 10 Check, 3. Code Pattern Review, Analysis Commands, Common False Positives, Core Responsibilities, Emergency Response, Hard rules (always apply, no exceptions) (+8 more)

### Community 190 - "Source-review supplement: state-deep-evidence"
Cohesion: 0.09
Nodes (22): Facts contract (`schemaVersion: 1`), What was dropped from the old report, tokens(), Audit and owner decisions, Audit chronology, Build deviations, Build log highlights, Critique rulings (+14 more)

### Community 191 - "Phase 5: Cooldown"
Cohesion: 0.14
Nodes (14): 1. Knowledge health audit, 2. Issue → pattern → rule promotion, 3. Parked pitches review, 4. Followups triage, 5. Output: cooldown report, 6. User approval gate, Activities (in order), Adaptive frequency (+6 more)

### Community 192 - "Testing"
Cohesion: 0.40
Nodes (5): Full and partial runs, Measured speed (2026-10-21, full suite, 75 files), Options, Testing, Why some tests stay slow

### Community 193 - "createNodeDeps"
Cohesion: 0.07
Nodes (35): FakeNet, defaultDeps(), defaultDeps(), effectiveEntryText(), EntryKind, EntryResolution, outsideCode(), resolveClaudeEntry() (+27 more)

### Community 194 - "Compaction record: readme-split"
Cohesion: 0.12
Nodes (14): Audit evidence and exclusions, Checker limits and review provenance, Documentation ownership, Source-review supplement: readme-split, Compaction record: readme-split, Section 1: SHIPPED.md#final-verification, Section 2: SHIPPED.md#reconciliation, Section 3: SHIPPED.md#no-gos-honored (+6 more)

### Community 195 - "workflow-contracts.test.mts"
Cohesion: 0.32
Nodes (5): auditRequirements(), buildRequirements(), { fs, path }, read(), ROOT

### Community 197 - "workflow-doctor.test.mts"
Cohesion: 0.14
Nodes (17): CaptureGroup, captureMiswirings, captureWiring(), Check, checks(), contractCheck(), fixture(), injectBoundaryFile() (+9 more)

### Community 198 - "Decision Title"
Cohesion: 0.29
Nodes (6): Consequences, Context, Decision, Decision Title, References, Summary

### Community 199 - "Activities (in order)"
Cohesion: 0.22
Nodes (9): 1. Knowledge gate (mandatory, FIRST), 2. Set boundaries, 3. Breadboard (not wireframe), 4. Address rabbit holes, 5. Write no-gos, 6. /critique (auto for big-batch + AI-prompt scopes), 7. Bet decision (three outcomes), Activities (in order) (+1 more)

### Community 200 - "Steps"
Cohesion: 0.06
Nodes (27): knowledge-health, 1. Inventory all knowledge entries, 2. Check for staleness, 3. Check usage (pattern references), 4. Issue-to-Rule Promotion Check, 5. Cross-reference validation, 6. Tag coverage, 7. Generate recommendations (+19 more)

### Community 201 - "Lossless projection in replace-style upserts"
Cohesion: 0.33
Nodes (5): Anti-pattern, Data Modeling Rules, Lossless projection in replace-style upserts, Three safe options (in preference order), Why this matters

### Community 202 - ".claude/agents/eval-runner.md"
Cohesion: 0.14
Nodes (10): Constraints, Gates, Inputs (provided by dispatcher), Output structure, Process, Constraints, Gates, Inputs (provided by dispatcher) (+2 more)

### Community 203 - "Status"
Cohesion: 0.25
Nodes (8): Active pitches, /cooldown due now (10 ships since the 2026-10-23 forced cooldown), /cooldown reviewed 2026-10-21 (forced; 5 ships since; due now, no decision pre-approved; consolidation shipped), Followups backlog, Open rabbit holes across active pitches, Parked pitches, Recent ships (last 5), Status

### Community 204 - "orca-apply.test.mts"
Cohesion: 0.14
Nodes (13): BASE, deps, Entry, failSecondWrite(), GIT_ENV, makeRepo(), patchFrom(), put() (+5 more)

### Community 205 - ".claude/agents/test-coverage-checker.md"
Cohesion: 0.17
Nodes (8): Constraints, Inputs (provided by dispatcher), Output structure, Process, Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 206 - "Metrics report dimensions: retained source detail"
Cohesion: 0.22
Nodes (9): Audit cycle 1, Audit cycle 2, Behavior and schema contract, Constraints and bounds, Followups, lessons and later history, Metrics report dimensions: retained source detail, Payload spike and async correction, Scope execution and deviations (+1 more)

### Community 207 - "Optional Orca vendor policy"
Cohesion: 0.16
Nodes (14): claude(), Automatic start (every workflow phase), CLI, grader and live-smoke status, Codex startup and coordinator preparation, Contract check, Explicit runtime inspection, Inspect without execution, `integrations.orca` in `ai-workflow.toon` (schemaVersion 3) (+6 more)

### Community 208 - "Phase 0: Shape"
Cohesion: 0.29
Nodes (7): Confirmation gate, Lite variant, Output, Phase 0: Shape, Purpose, Transition, Trigger

### Community 209 - "bundle-sync-marker-fix"
Cohesion: 0.33
Nodes (4): Audit context, Effective-base contract and boundaries, Source-review supplement: bundle-sync-marker-fix, bundle-sync-marker-fix

### Community 210 - "Bundle default skills"
Cohesion: 0.25
Nodes (8): Browser runtime, Bundle default skills, Caveman mode, Compress guard, Coverage: every skill and every agent, Existing projects (upgrading from an older bundle version), Token-usage attribution, Verification

### Community 212 - ".claude/agents/eval-regression-projector.md"
Cohesion: 0.17
Nodes (8): Constraints, Inputs (provided by dispatcher), Output structure, Process, Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 213 - "Architectural Boundaries"
Cohesion: 0.15
Nodes (13): App-local code (routes, screens, UI), Architectural Boundaries, Backend, Checklist, Dependency Placement, Dependency Rule, Purpose, Refactor Triggers (+5 more)

### Community 214 - "Shipped: package-less-ship-verification"
Cohesion: 0.13
Nodes (13): Audit cycle 1: package-less-ship-verification, Evidence after fixes, Findings, Reviewers, Audit, Docs, Final verification, Followups generated (+5 more)

### Community 215 - "test-helpers.mts"
Cohesion: 0.03
Nodes (81): acquire(), Acquired, codeOf(), defaultDeps(), Endpoint, endpointFor(), Lease, Leased (+73 more)

### Community 216 - ".claude/skills/ship-pitch/SKILL.md"
Cohesion: 0.11
Nodes (15): Ship pitch, Activities (in order), Confirmation gate, Optional Orca multi-agent (off by default), Output, Ship pitch, Transition, When to use (+7 more)

### Community 217 - "/fix — Bug-Fix Entry"
Cohesion: 0.33
Nodes (5): 1. Triage (gated), 2. Build → Audit → Ship, Agent recommendations, /fix — Bug-Fix Entry, When NOT to use /fix

### Community 220 - ".claude/skills/changelog/SKILL.md"
Cohesion: 0.15
Nodes (9): Changelog, Changelog, How to run it, What it writes, When to run it, Changelog, How to run it, What it writes (+1 more)

### Community 221 - "README.md"
Cohesion: 0.16
Nodes (11): Design notes, Managed-write safety and interrupted compaction, How to improve this flow, Set up, Setup Validator, Token Consumption, One source, every vendor, What you get (+3 more)

### Community 222 - "Source-review supplement: path-safety-hardening"
Cohesion: 0.25
Nodes (8): Audit chronology, Contract and delivered behavior, Delivery, Historical contradictions, Historical limits, Scope and no-gos, Source-review supplement: path-safety-hardening, Verification history

### Community 223 - "/impact — Impact Analysis"
Cohesion: 0.14
Nodes (14): 1. Load the design plan, 2. Trace downstream consumers, 3. Check boundary violations, 4. Identify affected tests, 5. Check knowledge graph for relevant warnings, 6. Risk summary, Confirmation Gate, Context Budget (+6 more)

### Community 224 - "setup-validator.mts"
Cohesion: 0.11
Nodes (14): Setup Validator, MAX_LEDGER_BYTES, CONFIG_FILE, CheckResult, CheckRun, ClaudeEntry, CursorReport, defaultLibs (+6 more)

### Community 225 - ".claude/skills/workflow-doctor/SKILL.md"
Cohesion: 0.29
Nodes (3): Workflow Doctor, Workflow Doctor, Workflow Doctor

### Community 226 - ".claude/agents/cross-pitch-projector.md"
Cohesion: 0.17
Nodes (8): Constraints, Inputs (provided by dispatcher), Output structure, Process, Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 227 - "Pitch compaction: retained delivery and safety history"
Cohesion: 0.29
Nodes (7): Audit failures, fixes and confidence, Build verification and unique lessons, Followups, version and later narrative, Pitch compaction: retained delivery and safety history, Preservation and deletion contract, Scope and eligibility, Shared machinery and generated context

### Community 228 - "Exit criteria per scope (machine-checkable, ≥1 per scope)"
Cohesion: 0.14
Nodes (14): consolidation(), Exit criteria per scope (machine-checkable, ≥1 per scope), P1-S1b — Project-local overlay and registry exemption (so installed projects pass `--check`), P1-S2 — Derived path-reference edges, P1-S3 — Populate `relations.toon`, P1-S5 — Acceptance, docs, release record, P2a-S3 — Decision `status` / `supersedes`, P2a-S6 — Validators, install carry, skill doc, release record (+6 more)

### Community 229 - "Eval Harness"
Cohesion: 0.18
Nodes (11): Adding a new case, Adding a new judge rubric, Cost control, Dataset format, Directory map, Eval Harness, Interpreting the report, Known scope (example) (+3 more)

### Community 230 - "Pitch: workspace-slim"
Cohesion: 0.15
Nodes (12): Bet decision, Critique findings (auto-populated by /critique for big-batch + AI scopes), Evaluation (AI-prompt scope), Knowledge consulted, No-gos (this pitch), Order and size, Pitch: workspace-slim, Problem (+4 more)

### Community 232 - "Pitch: knowledge-distill"
Cohesion: 0.17
Nodes (11): Bet decision, Critique findings (auto-populated by /critique for big-batch + AI scopes), Evaluation (AI-prompt scope), Knowledge consulted, No-gos (this pitch), Pitch: knowledge-distill, Problem, Rabbit holes (+3 more)

### Community 233 - "transcript-usage.mts"
Cohesion: 0.19
Nodes (15): TranscriptRead, admit(), claudeProjects(), count(), field(), isObject(), MessageUsage, parse() (+7 more)

### Community 234 - "Portable skill installation: retained source history"
Cohesion: 0.29
Nodes (7): Audit findings and confidence, Delivered behavior and ownership, Followups and release history, Portable skill installation: retained source history, Sync and formatting decisions, Vendor parity and activation, Verification and incidents

### Community 235 - "orca-vendors.md"
Cohesion: 0.06
Nodes (26): Audit, fix, setup, switch, Audit, Execute, Optional Orca coordination, Parallel pitches (+18 more)

### Community 237 - "Critique"
Cohesion: 0.29
Nodes (6): Critique, Disposition (advisory, not gating), Output, Perspective subagents (parallel fan-out), Transition, When to use

### Community 238 - "usableShape"
Cohesion: 0.35
Nodes (13): hasFields(), isCount(), isCountOrNull(), isObject(), isStoredFlow(), isStoredRecord(), isText(), routingResolves() (+5 more)

### Community 239 - "Codex Orca coordinator parity: retained source evidence"
Cohesion: 0.20
Nodes (10): Audit method and attribution, Codex Orca coordinator parity: retained source evidence, Coverage and guard lessons, Findings and dispositions, Historical discrepancies and durable drift, Host and bootstrap limits, Knowledge and followups, Per-review evidence limits (+2 more)

### Community 240 - "Shape"
Cohesion: 0.29
Nodes (7): Activities (in order), AI-prompt scopes (extra discipline), Confirmation gate, Output, Shape, Transition, When to use

### Community 241 - "Shape"
Cohesion: 0.25
Nodes (7): Activities (in order), AI-prompt scopes (extra discipline), Confirmation gate, Output, Shape, Transition, When to use

### Community 242 - ".claude/skills/shape-lite/SKILL.md"
Cohesion: 0.07
Nodes (21): shape-lite, Constraints, Inputs (provided by dispatcher), Output structure, Process, Arguments, Guardrails, Shape Lite (+13 more)

### Community 243 - "Phase 2: Build"
Cohesion: 0.13
Nodes (15): Adaptive gate, Bug-fix variant, Confirmation gate (when the overview's `/build end` row says gated: big-batch, bug-fix, hotfix), Inline UX 5-question check (UI scopes only), log.md and deviations.md discipline, Output, Parallel subagents, Per-scope inner loop (+7 more)

### Community 244 - "Bundle Sync"
Cohesion: 0.29
Nodes (7): Bundle Sync, Next steps (what a sync cannot do for the project), Step 1 — Dry run, Step 2 — Gate, Step 3 — Apply (only after approval), Step 4 — Verify, What it compares

### Community 245 - "Bundle Sync"
Cohesion: 0.29
Nodes (7): Bundle Sync, Next steps (what a sync cannot do for the project), Step 1 — Dry run, Step 2 — Gate, Step 3 — Apply (only after approval), Step 4 — Verify, What it compares

### Community 246 - "workflow-capture.mts"
Cohesion: 0.13
Nodes (27): Activity, AgentKind, argumentsOf(), boundedText(), CAPTURE_MESSAGES, CaptureEvent, CaptureResolver, claudeActivity() (+19 more)

### Community 247 - "pitch-compress.mts"
Cohesion: 0.05
Nodes (74): AcceptedGap, assertPlainPath(), buildLedger(), checkDestination(), classify(), CliOptions, codeOf(), commitLedger() (+66 more)

### Community 248 - "Track ship records: connected-memory-consolidation"
Cohesion: 0.29
Nodes (7): Approval receipt (p1.approved.toon), Approval receipt (p2a.approved.toon), Approval receipt (p2d.approved.toon), P1 connected-process-graph, P2a consolidation-schemas, P2d installed-sync, Track ship records: connected-memory-consolidation

### Community 249 - "Decision: workflow-tooling pitches share the same no-gos, and the installer's design answers stand"
Cohesion: 0.04
Nodes (52): Add Skill, Consequences, Decision: caveman brevity mode is the default for every skill, agent, and session, Related, Consequences, Decision: how the default-skills machinery attributes, guards, and reports readiness, References, Summary (+44 more)

### Community 250 - "Portable AI Development Workflow"
Cohesion: 0.29
Nodes (7): Choose the script runtime, Concepts (read this first), Documentation, Model configuration, Orca mode (multi-agent), Portable AI Development Workflow, Set up

### Community 251 - "knowledge"
Cohesion: 0.11
Nodes (18): What this project uses, knowledge(), outcome(), Step 5b: Build the Knowledge Graph, Step 5b: Build the Knowledge Graph, P2a-S4 — Outcome-record template + lint, 1. Is the "disconnected files" problem real?, 2. What already works (extend, do not replace) (+10 more)

### Community 252 - "Runs"
Cohesion: 0.50
Nodes (3): Runs, Structure, Who writes here

### Community 253 - "Pitch: greenfield-kickoff"
Cohesion: 0.18
Nodes (10): Bet decision, Critique findings (auto-populated by /critique for big-batch + AI scopes), Evaluation (AI-prompt scope), Knowledge consulted, No-gos (this pitch), Pitch: greenfield-kickoff, Problem, Rabbit holes (+2 more)

### Community 255 - "skill-compress-guard.test.mts"
Cohesion: 0.21
Nodes (8): canCompress(), CompressVerdict, defaultDeps(), PROTECTED_DIRS, pythonAvailable(), resolveReal(), testDeps, Examples in Codebase

### Community 257 - "Phase 1: Plan"
Cohesion: 0.13
Nodes (15): 1. Decompose into scopes, 2. Define machine-checkable exit criteria per scope, 3. Identify parallelism, 4. Inherit risks from pitch, 5. Wireframes (UI scopes only, light), 6. Initialize hill chart, Activities (in order), Adaptive plan size (+7 more)

### Community 258 - "/fix — Bug-Fix Entry"
Cohesion: 0.40
Nodes (5): 1. Triage (gated), 2. Build → Audit → Ship, Agent recommendations, /fix — Bug-Fix Entry, When NOT to use /fix

### Community 259 - "Pitch: package-less-ship-verification"
Cohesion: 0.22
Nodes (8): Bet decision, Critique findings, Knowledge consulted, No-gos (this pitch), Pitch: package-less-ship-verification, Problem, Rabbit holes, Solution sketch (breadboard)

### Community 260 - "AGENTS.md"
Cohesion: 0.14
Nodes (12): Architecture, Codex Orca coordination, Confirmation gate (always), Guardrails, Product, Project Records, Project specifics, Response style (caveman mode) (+4 more)

### Community 261 - "Ship knowledge extraction and incident triage"
Cohesion: 0.40
Nodes (4): Incident dispositions, Knowledge ownership and promotion review, Read accounting, Ship knowledge extraction and incident triage

### Community 262 - "add-skill.test.mts"
Cohesion: 0.06
Nodes (37): phases, afterWrite(), captureDeps(), commit(), { context, digest, json, snapshot, readRegistry, transact, recover, resolveFile }, files(), walk(), fixture() (+29 more)

### Community 264 - "Shipped: consolidation-schemas"
Cohesion: 0.25
Nodes (8): Approval and closure, Audit acceptance, Deviations, no-gos and rabbit holes, Knowledge, followups and documentation, Ownership and release attribution, Scope reconciliation, Shipped: consolidation-schemas, Verification and its limits

### Community 266 - "Eval Workflow"
Cohesion: 0.40
Nodes (5): 1. Define (Before Coding), 2. Implement, 3. Evaluate, 4. Report, Eval Workflow

### Community 267 - ".claude/skills/checkpoint/SKILL.md"
Cohesion: 0.22
Nodes (5): checkpoint, /checkpoint — Save Pitch Progress, Steps, /checkpoint — Save Pitch Progress, Steps

### Community 268 - "Eval Workflow"
Cohesion: 0.40
Nodes (5): 1. Define (Before Coding), 2. Implement, 3. Evaluate, 4. Report, Eval Workflow

### Community 269 - "flow-render.mts"
Cohesion: 0.09
Nodes (34): FLOW_LIMITS, TokenCell, Cellish, checked(), esc(), FILE_NAMES, flatten(), GENERATOR (+26 more)

### Community 270 - "captureWorkflowEvent"
Cohesion: 0.67
Nodes (4): capture(), captureWorkflowEvent(), diagnostic(), writeEvent()

### Community 271 - "Status"
Cohesion: 0.25
Nodes (7): Active pitches, /cooldown due in: 5 ships, Followups backlog, Open rabbit holes across active pitches, Parked pitches, Recent ships (last 5), Status

### Community 272 - "SETUP — Portable AI Development Workflow"
Cohesion: 0.11
Nodes (17): 2a — Claude Code, 2b — OpenCode, 2c — Codex, 2d — Cursor, 2e — Other CLI agents, Guardrails (apply during setup and after), SETUP — Portable AI Development Workflow, Step 0 — Orient (+9 more)

### Community 273 - "Shipped: installed-sync"
Cohesion: 0.25
Nodes (8): Approval and closure, Audit acceptance, Deviations, no-gos and rabbit holes, Knowledge, followups and documentation, Ownership and release attribution, Scope reconciliation, Shipped: installed-sync, Verification and its limits

### Community 274 - "Pitch: review-bench-hardening"
Cohesion: 0.22
Nodes (8): Bet decision, Critique findings, Knowledge consulted, No-gos (this pitch), Pitch: review-bench-hardening, Problem, Rabbit holes, Solution sketch (breadboard)

### Community 275 - "Plan: connected-memory-consolidation"
Cohesion: 0.15
Nodes (13): Baseline drift found at plan time (supersedes `shaping-evidence.md` numbers), Downstream rollout, Living-spec deviations log, P2c-S1 preparation contract and test strategy (2026-10-22), P2c-S2 evidence and recovery contract (2026-10-22), P2c-S3 live navigation repair (2026-10-22), P2d-S1 implementation and test strategy (2026-10-22), P2d-S2 implementation and test strategy (2026-10-22) (+5 more)

### Community 276 - ".project/knowledge/decisions/profile-detection-lives-in-frontmatter-not-in-the-model-id.md"
Cohesion: 0.28
Nodes (8): Alternatives Considered, Consequences, Decision, Decision: Agent profile detection lives in frontmatter, not in the model id, Negative, Positive, Status, When to Revisit

### Community 278 - "Shipped: legacy-upgrade"
Cohesion: 0.20
Nodes (10): Approval and closure, Approval receipt (p2c.approved.toon), Audit acceptance, Deviations, no-gos and rabbit holes, Knowledge, followups and documentation, Ownership and release attribution, P2c legacy-upgrade, Scope reconciliation (+2 more)

### Community 279 - "Grader Types"
Cohesion: 0.50
Nodes (4): 1. Code-Based Grader, 2. Model-Based Grader, 3. Human Grader, Grader Types

### Community 280 - "Integration Patterns"
Cohesion: 0.50
Nodes (4): During Implementation, Integration Patterns, Post-Implementation, Pre-Implementation

### Community 281 - "Plan: review-bench-hardening"
Cohesion: 0.15
Nodes (12): Decisions, Exit criteria per scope (machine-checkable), Living-spec deviations log, Parallel dispatch plan, Plan: review-bench-hardening, Risks, S1, S2 (+4 more)

### Community 282 - "Grader Types"
Cohesion: 0.50
Nodes (4): 1. Code-Based Grader, 2. Model-Based Grader, 3. Human Grader, Grader Types

### Community 283 - "Integration Patterns"
Cohesion: 0.50
Nodes (4): During Implementation, Integration Patterns, Post-Implementation, Pre-Implementation

### Community 284 - "2. Search by Scope"
Cohesion: 0.18
Nodes (11): 1. Parse Search Query, 2. Search by Scope, 3. Rank Results, 4. Present Results, 5. Offer Actions, ADRs (`/search adrs "query"`), All (default), Knowledge (`/search knowledge "query"`) (+3 more)

### Community 285 - "Rule: workflow-only data that agents load starts as TOON"
Cohesion: 0.50
Nodes (4): Guardrails, Measure, never assume, Rule: workflow-only data that agents load starts as TOON, Scope test (all three must hold)

### Community 286 - "2. Search by Scope"
Cohesion: 0.18
Nodes (11): 1. Parse Search Query, 2. Search by Scope, 3. Rank Results, 4. Present Results, 5. Offer Actions, ADRs (`/search adrs "query"`), All (default), Knowledge (`/search knowledge "query"`) (+3 more)

### Community 287 - "Shipped: connected-process-graph"
Cohesion: 0.25
Nodes (8): Approval and closure, Audit acceptance, Deviations, no-gos and rabbit holes, Knowledge, followups and documentation, Ownership and release attribution, Scope reconciliation, Shipped: connected-process-graph, Verification and its limits

### Community 288 - "Audit"
Cohesion: 0.50
Nodes (3): Audit, Execute, Optional Orca coordination

### Community 290 - "consolidation-migrate.mts"
Cohesion: 0.07
Nodes (44): Change, ensureDirectory(), errorCode(), inspect(), main(), MAX_MIGRATION_FILES, MAX_TEMPLATE_BYTES, migrate() (+36 more)

### Community 291 - "Pitch Compress"
Cohesion: 0.20
Nodes (10): Keep a pitch small while it is built, Pitch Compress, Restore, Step 1 — Inventory, Step 3 — Write done-work.md, Step 4 — Archive (recovery, before anything is removed), Step 5 — Gate, Step 6 — Remove (only after approval) (+2 more)

### Community 292 - ".claude/agents/architect.md"
Cohesion: 0.07
Nodes (27): 1. Current State Analysis, 1. Modularity & Separation of Concerns, 2. Requirements Gathering, 2. Scalability, 3. Design Proposal, 3. Maintainability, 4. Security, 4. Trade-Off Analysis (+19 more)

### Community 294 - "standalone"
Cohesion: 0.20
Nodes (9): standalone(), Process relations in the graph, greenfield-kickoff: appetite-auditor, Consequences for the rollout, Open inputs the rollout must close before bet, Rollout input: connected-memory-consolidation work, What is being built and what each project receives, P1-S4 — Graphify integration (+1 more)

### Community 296 - "Done Work"
Cohesion: 0.18
Nodes (11): archify-replaces-state — shipped 2026-11-23, connected-memory-consolidation — shipped 2026-10-23, Done Work, fix-retired-live-evidence-path — shipped 2026-10-23, orca-api-currency-and-opencode2 — shipped 2026-11-23, orca-balanced-role-pools — shipped 2026-11-25, orca-bounded-control-receipts — shipped 2026-11-23, rename-ship-command-to-finish — shipped 2026-11-25 (+3 more)

### Community 297 - "Shipped: review-bench-hardening"
Cohesion: 0.08
Nodes (22): Audit: review-bench-hardening, Code reviewer, cycle 1, Cycle 1 findings and disposition, Cycle 2 findings, Evidence on the final code, Scope S4 review (follow-up after cycle 2, owner request), Security re-check, cycle 2, first attempt, Security re-check, cycle 2, retry (+14 more)

### Community 298 - "Pitch: workflow-v3-rollout"
Cohesion: 0.22
Nodes (8): Amendment (2026-10-21), Bet decision, Knowledge consulted, No-gos (this pitch), Pitch: workflow-v3-rollout, Problem, Rabbit holes, Solution sketch (breadboard)

### Community 299 - "Compaction record: orca-vendor-reconcile-integration"
Cohesion: 0.22
Nodes (9): Compaction record: orca-vendor-reconcile-integration, Section 1: SHIPPED.md#final-verification, Section 2: SHIPPED.md#reconciliation, Section 3: SHIPPED.md#audit, Section 4: SHIPPED.md#no-gos-honored, Section 5: SHIPPED.md#followups, Section 6: pitch.md#no-gos, Section 7: pitch.md#rabbit-holes (+1 more)

### Community 304 - "Build Error Resolver"
Cohesion: 0.15
Nodes (12): 1. Collect All Errors, 2. Fix Strategy (MINIMAL CHANGES), 3. Common Fixes, Build Error Resolver, Core Responsibilities, Diagnostic Commands, DO and DON'T, Priority Levels (+4 more)

### Community 305 - "Collector robustness: retained implementation history"
Cohesion: 0.25
Nodes (8): Audit findings and method, Collector robustness: retained implementation history, Confidence and followups, Delivered contract, Identity and migration, Retired lock and planning contradictions, Source-review findings, Verification chronology

### Community 306 - "/search — Search Project Knowledge"
Cohesion: 0.22
Nodes (9): Date filter (`since:`), Decision filter (`decision:`), Error filter (`error:`), Important Rules, /search — Search Project Knowledge, Search Tips, Special Filters, Usage Patterns (+1 more)

### Community 307 - "Architecture Context"
Cohesion: 0.25
Nodes (7): Architecture Context, Data Flow, Integrations, Layout, Optional Orca policy diagnostics, Overview, Project Records

### Community 308 - "Compaction record: ts-runtime-injection"
Cohesion: 0.25
Nodes (8): Compaction record: ts-runtime-injection, Section 1: SHIPPED.md#final-verification, Section 2: SHIPPED.md#reconciliation, Section 3: SHIPPED.md#audit, Section 4: SHIPPED.md#no-gos-honored, Section 5: SHIPPED.md#followups, Section 6: pitch.md#no-gos, Section 7: pitch.md#rabbit-holes

### Community 311 - "Audit cycle 2 — connected-memory-consolidation"
Cohesion: 0.50
Nodes (4): audit-cycle-2, Audit cycle 2 — connected-memory-consolidation, Must-fix, Should-fix (all fixed, each with a test)

### Community 312 - ".claude/agents/knowledge-historian.md"
Cohesion: 0.17
Nodes (8): Constraints, Inputs (provided by dispatcher), Output structure, Process, Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 314 - ".claude/skills/resume/SKILL.md"
Cohesion: 0.20
Nodes (5): resume, /resume — Resume a Pitch, Steps, /resume — Resume a Pitch, Steps

### Community 316 - "Source-review supplement: fix-instruction-conflicts"
Cohesion: 0.25
Nodes (8): Findings and owners, Historical limits, Knowledge and durable owners, No-gos, Review chronology, Source-review supplement: fix-instruction-conflicts, Validation pass, Verification and evidence

### Community 318 - "Critique: greenfield-kickoff — eval-regression-projector"
Cohesion: 0.40
Nodes (4): Critique: greenfield-kickoff — eval-regression-projector, Summary, What the golden cases currently catch, What they do NOT catch

### Community 319 - "Rule: every canonical-file edit ships its Cursor byte-copy regen in the same commit"
Cohesion: 0.25
Nodes (8): Exemptions, Failure mode this prevents, Related, Rule: every canonical-file edit ships its Cursor byte-copy regen in the same commit, The rule, Verification, When this rule does NOT apply, Why this rule exists

### Community 320 - "Critique"
Cohesion: 0.33
Nodes (6): Critique, Disposition (advisory, not gating), Output, Perspective subagents (parallel fan-out), Transition, When to use

### Community 323 - "/switch — Switch Pitches"
Cohesion: 0.50
Nodes (3): Parallel pitches, Steps, /switch — Switch Pitches

### Community 324 - ".cursor/agents/code-reviewer.md"
Cohesion: 0.13
Nodes (14): Approval criteria, Best Practices (LOW), Code Quality (HIGH), Confidence-Based Filtering, Frontend Framework Patterns (HIGH), Hard rules (always apply, no exceptions), Node.js/Backend Patterns (HIGH), Output structure (+6 more)

### Community 327 - "Hill chart: package-less-ship-verification"
Cohesion: 0.40
Nodes (4): Hill chart: package-less-ship-verification, Hill positions reference, Positions, Stuck-uphill watch

### Community 328 - "toon-convert.test.mts"
Cohesion: 0.10
Nodes (22): dataEquals(), Conversion, formatMeasure(), main(), measure, deps, project(), REAL (+14 more)

### Community 333 - "skill-sync.mts"
Cohesion: 0.14
Nodes (17): CONFIG_NAMES, { context, digest, json, snapshot, readRegistry, transact, resolveFile }, defaultDeps(), discoverFormatter(), { discoverVendors, adapters }, formatFiles(), FormatResult, Formatter (+9 more)

### Community 334 - "isSupportedVersion"
Cohesion: 0.24
Nodes (10): isSupportedVersion(), Build log and lessons, Delivered scope, Drift ledger and sync proof, Historical contradictions, Problem and pitch, Release state and open items, Scope and limits (+2 more)

### Community 338 - "Pitch Compress"
Cohesion: 0.20
Nodes (10): Keep a pitch small while it is built, Pitch Compress, Restore, Step 1 — Inventory, Step 3 — Write done-work.md, Step 4 — Archive (recovery, before anything is removed), Step 5 — Gate, Step 6 — Remove (only after approval) (+2 more)

### Community 339 - "Source-review supplement: fix-orca-dispatch-resume-gate"
Cohesion: 0.20
Nodes (10): Audit history, Contract and later drift, Historical contradictions, Incidents and lessons, Limits and open items, Root cause and fix, Source-review supplement: fix-orca-dispatch-resume-gate, Standing constraints (+2 more)

### Community 344 - "Eval regression projection: workspace-slim + knowledge-distill"
Cohesion: 0.50
Nodes (3): Eval regression projection: workspace-slim + knowledge-distill, Findings, Gradability summary

### Community 345 - "fix-timing-ratio-flake (bug-fix, 2026-11-25)"
Cohesion: 0.33
Nodes (5): Evidence (final file), Final verification, fix-timing-ratio-flake (bug-fix, 2026-11-25), Reproduction, What changed during the fix

### Community 346 - "Portable skill defaults: retained design and verification"
Cohesion: 0.20
Nodes (10): Audit findings and closure, Binding drift review, D1 mode and catalog behavior, D2 attribution and compression guard, D3 browser readiness, Grounding decisions, Knowledge release and downstream limits, Portable skill defaults: retained design and verification (+2 more)

### Community 349 - ".claude/agents/code-reviewer.md"
Cohesion: 0.08
Nodes (19): Approval criteria, Best Practices (LOW), Code Quality (HIGH), Confidence-Based Filtering, Frontend Framework Patterns (HIGH), Hard rules (always apply, no exceptions), Node.js/Backend Patterns (HIGH), Output structure (+11 more)

### Community 351 - "Pattern: a read-only report over a project tree treats the tree as data, never as code"
Cohesion: 0.10
Nodes (21): Consequences, Context, Decision, Decision: what the review bench protects against, References, Summary, Fix and rule, How it was missed (+13 more)

### Community 353 - "Issue: a skill installed in the source checkout ships to every synced project as a broken orphan"
Cohesion: 0.06
Nodes (31): Decision, Decision: the command a person types is `ship-pitch`; the phase keeps the name `ship`, Limits (kept), Summary, Issue: a missing tracked file is not an undeleted deletion, Prevention, Root Cause, Solution (+23 more)

### Community 357 - "Closing criteria requiring an owner decision"
Cohesion: 0.33
Nodes (5): Closing criteria requiring an owner decision, Decision, Existing history collector reads recovery archives, Owner decision — 2026-10-23, Scenario-C retained bytes

### Community 364 - "/search — Search Project Knowledge"
Cohesion: 0.14
Nodes (10): search, Date filter (`since:`), Decision filter (`decision:`), Error filter (`error:`), Important Rules, /search — Search Project Knowledge, Search Tips, Special Filters (+2 more)

### Community 367 - "Plan"
Cohesion: 0.22
Nodes (8): Activities, Adaptive plan size, Confirmation gate, Output, Plan, Transition, Verification at /plan exit, When to use

### Community 386 - "Plan: {slug}"
Cohesion: 0.22
Nodes (8): Exit criteria per scope (machine-checkable, ≥1 per scope), Living-spec deviations log, Parallel dispatch plan, Plan: {slug}, Risks (inherited from pitch rabbit holes), S1 — {name}, Scopes, Wireframes (UI scopes only, light)

### Community 393 - "Project state report: retained source detail"
Cohesion: 0.22
Nodes (9): Audit cycle 1, Audit cycle 2 and destructive-reader regression, Audit cycle 3 and final confidence, Build verification and test-caught defects, Followups, knowledge and later history, Project state report: retained source detail, Report contract and authorities, Scope, vendor requirements and no-gos (+1 more)

### Community 394 - "Version Log & Bundle Sync"
Cohesion: 0.40
Nodes (5): Consolidation scaffold migration, Large pitch folders, Per-pitch legacy upgrades, Upgrade from JavaScript entry files, Version Log & Bundle Sync

### Community 398 - "Shipped: fix-timing-ratio-flake"
Cohesion: 0.12
Nodes (14): Audit cycle 1: fix-timing-ratio-flake, Evidence on the final file, Findings, Test coverage retry (fresh worker, committed code at `d9bd8cf`), Audit, Boundaries honored, Deviations, Docs (+6 more)

### Community 400 - "Hill chart: {slug}"
Cohesion: 0.40
Nodes (4): Hill chart: {slug}, Hill positions reference, Positions, Stuck-uphill watch

### Community 419 - "Knowledge Index"
Cohesion: 0.25
Nodes (8): Decisions (25 entries, 25 accepted, 0 superseded, 0 deprecated), Entities (2 entries), Graph, Issues (65 entries), Knowledge Index, Patterns (62 entries), Tag Index, Traversal

### Community 420 - "Hill chart: review-bench-hardening"
Cohesion: 0.40
Nodes (4): Hill chart: review-bench-hardening, Hill positions reference, Positions, Stuck-uphill watch

### Community 422 - "Compaction record: orca-vendor-reconcile"
Cohesion: 0.13
Nodes (13): Historical assurance and limitations, Review and commit provenance, Scope and build decisions, Source-review supplement: orca-vendor-reconcile, Compaction record: orca-vendor-reconcile, Section 1: SHIPPED.md#final-verification, Section 2: SHIPPED.md#reconciliation, Section 3: SHIPPED.md#audit (+5 more)

### Community 425 - "skillDirOfPhase"
Cohesion: 0.48
Nodes (7): cursor(), diskFiles(), loadingProblems(), mutate(), orcaBlock(), wrappers(), skillDirOfPhase()

### Community 432 - "Product Context"
Cohesion: 0.29
Nodes (6): Core Capabilities, Product, Product Constraints, Product Context, Product Goal, Users

### Community 434 - "decision"
Cohesion: 0.33
Nodes (6): decision(), Ledger version 2 (the authoring format), Step 2 — Build the coverage ledger (real extraction work, not a script), Ledger version 2 (the authoring format), Step 2 — Build the coverage ledger (real extraction work, not a script), P2a-S1 — Ledger v2 commit + dual-read

### Community 435 - "Workflow variants"
Cohesion: 0.33
Nodes (6): Big-batch feature (full pipeline), Bug fix, Hotfix, Lite shape (small task or user rejection), Small-batch feature (light pipeline, fewer gates), Workflow variants

### Community 437 - "Step 2: Generate Documents"
Cohesion: 0.33
Nodes (6): `AGENTS.md` project specifics (project root), `CLAUDE.md` (required project root mirror), `.project/context/architecture.md`, `.project/context/product.md`, `.project/context/stack.md`, Step 2: Generate Documents

### Community 440 - "Step 2: Generate Documents"
Cohesion: 0.33
Nodes (6): `AGENTS.md` project specifics (project root), `CLAUDE.md` (required project root mirror), `.project/context/architecture.md`, `.project/context/product.md`, `.project/context/stack.md`, Step 2: Generate Documents

### Community 441 - "Source-review supplement: workflow-usage-metrics"
Cohesion: 0.33
Nodes (6): Audit triage and provenance, Contract limits (historical), Historical counts, Limitations, Scope and revision, Source-review supplement: workflow-usage-metrics

### Community 444 - "Shipped: connected-memory-consolidation"
Cohesion: 0.40
Nodes (5): Approval and closure, Exceptions and open items carried forward (none waived silently), Followups and what stays un-bet, Shipped: connected-memory-consolidation, Track receipts

### Community 446 - ".claude/agents/ux-reviewer.md"
Cohesion: 0.17
Nodes (8): Constraints, Inputs (provided by dispatcher), Output structure, Process, Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 448 - "Source-review supplement: orca-vendor-orchestration"
Cohesion: 0.40
Nodes (5): Closure and provenance, Configuration and coordination boundaries, Historical feasibility, Source-review supplement: orca-vendor-orchestration, Validation boundaries

### Community 461 - ".claude/agents/appetite-auditor.md"
Cohesion: 0.17
Nodes (8): Constraints, Inputs (provided by dispatcher), Output structure, Process, Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 475 - "Hill chart: {slug}"
Cohesion: 0.40
Nodes (4): Hill chart: {slug}, Hill positions reference, Positions, Stuck-uphill watch

### Community 501 - "RuntimeDeps"
Cohesion: 0.06
Nodes (53): Existing, Chain, Prior, AdmittedEntry, applyAdmitted(), ApplyOptions, ApplyResult, Ctx (+45 more)

### Community 508 - "Workflow usage metrics"
Cohesion: 0.29
Nodes (7): Bounds and failures, Hook-to-event mapping (planned), Joined token/time report, Reading the evidence, Record and report, Time and flow, Workflow usage metrics

## Knowledge Gaps
- **3724 isolated node(s):** `TsDiagnostic`, `Plain`, `testDeps`, `$schema`, `plugin` (+3719 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 4132 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **114 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RuntimeDeps` connect `RuntimeDeps` to `skill-registry.mts`, `orca-evidence.mts`, `skill-vendors.test.mts`, `token-consumption.mts`, `pitch-archive.mts`, `Pattern: local eval data must be gitignored alongside the dataset specs`, `workflow-metrics-report.mts`, `orca-start.test.mts`, `runtime.test.mts`, `review-bench.mts`, `bundle-sync.mts`, `token-consumption.test.mts`, `graphify.mts`, `config-migrate.mts`, `workflow-metrics-state.mts`, `flow-report.test.mts`, `orca-launch-gate.mts`, `Source-review supplement: state-ai-authoring`, `legacy-upgrade.test.mts`, `orca-diff-admit.mts`, `Issue: a worker's environment differs from the coordinator's, and the first live smoke tests failed for that reason`, `orca-preflight.mts`, `orca-diff-admit.test.mts`, `config.test.mts`, `types.mts`, `workflow-metrics-state.test.mts`, `flow-join.mts`, `orca-eval-grader.mts`, `flow-report.mts`, `node.mts`, `skill-source.mts`, `config-migrate.test.mts`, `orca-run.test.mts`, `graphify-relations.mts`, `facts-project.test.mts`, `orca-start.mts`, `orca-start-codex-hook.test.mts`, `validate.test.mts`, `workflow-capture.test.mts`, `main`, `facts-project.mts`, `graphify.test.mts`, `migrate.mts`, `post-edit-check.mts`, `config.mts`, `outcome-record.mts`, `orca-dispatch.mts`, `changelog.test.mts`, `orca-ledger.mts`, `stuck-uphill-detector.mts`, `pre-ship-verify.mts`, `orca-launch-gate.test.mts`, `data-file.mts`, `add-skill.mts`, `orca-dispatch.test.mts`, `orca-policy.mts`, `browser-runtime.test.mts`, `skill-defaults.test.mts`, `orca-contract.mts`, `legacy-upgrade.mts`, `orca-run.mts`, `orca-start-codex-hook.mts`, `Pattern: a source scanner fails closed on whatever it cannot read`, `createNodeDeps`, `workflow-doctor.test.mts`, `orca-apply.test.mts`, `test-helpers.mts`, `setup-validator.mts`, `transcript-usage.mts`, `workflow-capture.mts`, `pitch-compress.mts`, `skill-compress-guard.test.mts`, `add-skill.test.mts`, `consolidation-migrate.mts`, `Compaction record: ts-runtime-injection`, `toon-convert.test.mts`, `skill-sync.mts`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `RuntimeDeps` (e.g. with `Event contract` and `Boundary validator`) actually correct?**
  _`RuntimeDeps` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `TsDiagnostic`, `Plain`, `testDeps` to the rest of the system?**
  _3724 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `skill-registry.mts` be split into smaller, more focused modules?**
  _Cohesion score 0.06101190476190476 - nodes in this community are weakly interconnected._
- **Why does `Changelog` connect `Changelog` to `[2.36.0] - 2026-10-20`, `legacy-upgrades/unified-toon-config.md`, `[2.12.0] - 2026-10-08`, `[2.13.0] - 2026-10-08`, `[2.17.0] - 2026-10-08`, `[2.50.1] - 2026-10-23`, `[2.31.4] - 2026-10-18`, `[2.15.0] - 2026-10-08`, `[1.2.0] - 2026-09-23`, `[2.18.0] - 2026-10-08`, `[2.18.1] - 2026-10-08`, `[2.20.0] - 2026-10-08`, `[2.23.0] - 2026-10-16`, `[1.1.0] - 2026-09-23`, `[2.25.0] - 2026-10-16`, `[2.11.0] - 2026-10-08`, `[2.14.0] - 2026-10-08`, `[2.8.1] - 2026-09-25`, `[2.28.0] - 2026-10-16`, `[2.22.3] - 2026-10-09`, `[2.8.3] - 2026-09-26`, `[2.48.0] - 2026-10-22`, `[2.40.0] - 2026-10-21`, `[2.49.0] - 2026-10-23`, `[2.29.0] - 2026-10-17`, `[2.55.0] - 2026-11-25`, `[2.8.4] - 2026-09-26`, `[2.2.0] - 2026-09-23`, `[2.31.5] - 2026-10-18`, `[1.2.1] - 2026-09-23`, `[2.20.1] - 2026-10-08`, `[2.37.0] - 2026-10-20`, `[2.43.1] - 2026-10-22`, `[2.30.0] - 2026-10-17`, `[2.58.1] - 2026-11-26`, `[2.31.6] - 2026-10-19`, `[2.37.1] - 2026-10-20`, `[2.44.0] - 2026-10-22`, `[2.16.0] - 2026-10-08`, `[2.9.0] - 2026-10-07`, `[1.0.0] - 2026-09-23`, `[2.45.0] - 2026-10-22`, `[2.11.1] - 2026-10-08`, `[2.16.2] - 2026-10-08`, `[2.14.1] - 2026-10-08`, `[2.47.1] - 2026-10-22`, `[2.22.0] - 2026-10-09`, `[2.10.0] - 2026-10-07`, `[2.16.1] - 2026-10-08`, `[2.31.1] - 2026-10-18`, `[2.1.0] - 2026-09-23`, `[2.50.2] - 2026-11-23`, `[2.52.1] - 2026-11-24`, `[2.57.0] - 2026-11-25`, `[2.22.2] - 2026-10-09`, `[2.31.3] - 2026-10-18`, `[2.8.0] - 2026-09-25`, `[2.8.2] - 2026-09-26`, `[2.30.1] - 2026-10-17`, `[2.27.0] - 2026-10-16`, `[2.22.4] - 2026-10-09`, `[2.21.0] - 2026-10-09`, `[2.31.2] - 2026-10-18`, `[2.19.1] - 2026-10-08`, `[2.31.0] - 2026-10-17`, `[2.45.1] - 2026-10-22`, `[2.48.1] - 2026-10-22`, `[2.32.1] - 2026-10-19`, `[2.35.0] - 2026-10-20`, `[2.8.5] - 2026-09-26`, `[2.42.0] - 2026-10-22`, `[2.51.0] - 2026-11-23`, `[2.47.0] - 2026-10-22`, `[2.43.0] - 2026-10-22`, `[2.50.0] - 2026-10-23`, `[2.22.5] - 2026-10-09`, `[2.5.0] - 2026-09-25`, `[2.58.0] - 2026-11-26`, `[2.7.0] - 2026-09-25`, `[2.33.0] - 2026-10-19`, `[2.35.1] - 2026-10-20`, `[2.50.3] - 2026-11-23`, `[2.19.0] - 2026-10-08`, `[2.9.1] - 2026-10-07`, `[2.54.0] - 2026-11-24`, `[2.22.1] - 2026-10-09`, `[2.31.7] - 2026-10-19`, `[2.0.0] - 2026-09-23`, `[2.52.0] - 2026-11-23`, `[1.1.1] - 2026-09-23`, `[2.15.1] - 2026-10-08`, `[2.38.0] - 2026-10-21`, `[2.3.0] - 2026-09-24`, `[2.32.0] - 2026-10-19`, `[2.39.0] - 2026-10-21`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createNodeDeps()` (e.g. with `readStdin()` and `Build decisions and deviations`) actually correct?**
  _`createNodeDeps()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `orca-evidence.mts` be split into smaller, more focused modules?**
  _Cohesion score 0.04697380307136405 - nodes in this community are weakly interconnected._