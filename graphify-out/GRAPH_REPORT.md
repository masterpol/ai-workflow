# Graph Report - ai-workflow-orca-pr  (2026-11-23)

## Corpus Check
- 695 files · ~715,786 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 30 file(s) not represented in the graph (top: .toml 17, (none) 10, .toon 3)

## Summary
- 7229 nodes · 13953 edges · 414 communities (312 shown, 102 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 720 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a4ed58c7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- skill-registry.mts
- orca-evidence.mts
- orca-dispatch.mts
- orca-contract.mts
- token-report.mts
- Followups
- toon-data.mts
- token-consumption.mts
- Security Rules
- pitch-archive.mts
- Issue: a worker's environment differs from the coordinator's, and the first live smoke tests failed for that reason
- workflow-metrics-report.mts
- flow-report.test.mts
- Source-review supplement: token-attribution
- Issue: the git-ignored `ai_workflow_env.json` (runner `bun`) makes a test that empties PATH fail on a developer machine
- Nielsen's 10 Usability Heuristics for Evaluation
- Component Architecture Patterns
- semver-range.mts
- Context Management
- Coding Standards
- FsDeps
- .cursor/agents/architect.md
- State multipage report: retained source detail
- review-bench.mts
- createLedger
- token-consumption.test.mts
- graphify.mts
- main
- Eval Harness Skill
- Eval Harness Skill
- config-migrate.mts
- workflow-metrics-state.mts
- Compaction record: independent-rereview-catch-up
- Observability Rules
- Performance Rules
- skill-vendors.test.mts
- Source-review supplement: state-ai-authoring
- CI/CD & Deployment Rules
- runtime.test.mts
- orca-diff-admit.mts
- config.test.mts
- workflow-doctor.mts
- orca-eval-grader.test.mts
- Pattern: Allow-list untrusted labels at ingest, and again at the place they are rendered
- /setup — Project Setup & Context Generation
- Phase 4: Ship
- Codex handoff — start here
- validUsage
- browser-runtime.test.mts
- convertV2
- skill-defaults.mts
- Issue: making a shared reader treat a symlink as "absent" turned its writer into a data-destroyer
- workflow-metrics-state.test.mts
- instruction-loading.test.mts
- review-bench.test.mts
- flow-join.mts
- orca-reconcile.test.mts
- orca-eval-grader.mts
- flow-report.mts
- /test-strategy — Smart Testing
- Phase 3: Audit
- Compaction record: orca-vendor-foundation
- /test-strategy — Smart Testing
- skill-source.mts
- AI-Assisted Development Workflow
- Knowledge Graph
- Knowledge Graph
- config-migrate.test.mts
- Model Routing Strategy
- orca-run.mts
- graphify-relations.mts
- facts-gather.test.mts
- .project/knowledge/patterns/a-writer-reinspects-the-target-at-the-publish-step.md
- orca-reconcile.mts
- Compaction record: workflow-usage-metrics
- /sync — Sync Tasks with Notion
- Security Reviewer
- OpenCode + Orca Handoff
- Pattern: local eval data must be gitignored alongside the dataset specs
- validate.test.mts
- bundle-sync.mts
- skill-defaults.test.mts
- State
- AI Tool Use Constraints & Enforcement
- installed-upgrade.test.mts
- createFactsGather
- RuntimeDeps
- usableShape
- Build Error Resolver
- makeValidator
- PitchCompressApi
- Issue: a missing tracked file is not an undeleted deletion
- orca-start.test.mts
- Source-review supplement: workflow-usage-capture
- .project/knowledge/patterns/keep-the-fakes-guarantee-the-thing-they-replace.md
- Audit cycle1 — P2d and P2c (separate from completed P1/P2a audit)
- loadConfig
- .cursor/agents/code-reviewer.md
- config.mts
- ledger-schema.mts
- Rollback Plan: [Feature Name]
- Design: [Feature Name]
- .claude/agents/code-reviewer.md
- .claude/agents/planner.md
- Refactor & Dead Code Cleaner
- Steps
- spawnSync
- migrate.mts
- Rollback Plan: [Feature Name]
- Design: [Feature Name]
- /impact — Impact Analysis
- orca-preflight.mts
- README.md
- outcome-record.mts
- token-report.test.mts
- Harness Integration Guide
- node.mts
- changelog.mts
- Wireframe: [Feature Name]
- Wireframe: [Feature Name]
- Compaction record: state-quoted-fonts
- AGENTS.md
- Wireframe: [Feature Name]
- Wireframe: [Feature Name]
- Compaction record: native-safety-feasibility
- Audit reviews: connected-memory-consolidation
- /setup — Project Setup & Context Generation
- orca-ledger.mts
- stuck-uphill-detector.mts
- .project/knowledge/patterns/a-gate-must-not-trust-its-own-author.md
- opencode-plugin.test.mts
- ADR-NNNN: [Decision Title]
- Feature: [Feature Name]
- pre-ship-verify.mts
- orca-vendors.md
- ADR-NNNN: [Decision Title]
- Feature: [Feature Name]
- types.mts
- Security Reviewer
- orca-run.test.mts
- data-file.mts
- skill-sync.mts
- orca-dispatch.test.mts
- 2. Search by Scope
- orca-policy.mts
- Entity: Name
- Pitch: {slug}
- Plan: {slug}
- Bug: [Short Description]
- 2. Search by Scope
- test-helpers.mts
- Entity: Name
- upgrade.test.mts
- .project/knowledge/patterns/a-gate-must-not-audit-its-own-instrument.md
- add-skill.mts
- toon-machine-data
- Phase 1: Plan
- .project/knowledge/patterns/a-version-migrator-edits-the-token-not-the-model.md
- Bug: [Short Description]
- workflow-doctor.test.mts
- Testing Rules
- .project/knowledge/issues/orca-worker-list-concise-view-hides-the-worker-identity-fields.md
- legacy-upgrade.mts
- Source-review supplement: state-fragment-sanitizer
- Issue: Title
- Pattern: Title
- Compaction record: bundle-sync-marker-fix
- Changelog
- standalone
- .claude/skills/critique/SKILL.md
- Codex Orca coordinator parity: retained source evidence
- add-skill.test.mts
- .claude/skills/bundle-sync/SKILL.md
- Issue: Title
- Pattern: Title
- .claude/agents/cross-pitch-conflict-checker.md
- /search — Search Project Knowledge
- .project/knowledge/decisions/profile-detection-lives-in-frontmatter-not-in-the-model-id.md
- Compaction record: ts-runtime-injection
- Decision Title
- Pitch: {slug}
- Steps
- Decision: workflow-tooling pitches share the same no-gos, and the installer's design answers stand
- Instance-managed skills
- legacy-upgrades/portable-skill-installation.md
- Phase 2: Build
- Rule: every canonical-file edit ships its Cursor byte-copy regen in the same commit
- Pattern: Warn text patches need their own test assertion
- pitch-archive.test.mts
- Source-review supplement: instruction-compression
- Source-review supplement: state-deep-evidence
- legacy-upgrade.test.mts
- Source-review supplement: unified-toon-config
- Source-review supplement: fix-instruction-conflicts
- Compaction record: readme-split
- State report
- token-consumption.ts
- transcript-usage.mts
- Decision Title
- Activities (in order)
- reportShape
- Lossless projection in replace-style upserts
- .claude/agents/eval-runner.md
- Optional Orca vendor policy
- orca-apply.test.mts
- .claude/agents/test-coverage-checker.md
- .project/knowledge/patterns/a-grader-reports-executed-and-unexecuted-cases-separately.md
- Done Work
- flow-join.test.mts
- Issue: A prose skill instruction referenced a CLI flag as if invocation arguments were already a clean single value, but they are free-form text
- .claude/skills/dependency-security/SKILL.md
- [2.12.0] - 2026-10-08
- .claude/agents/eval-regression-projector.md
- Architectural Boundaries
- Build Error Resolver
- .claude/skills/shape-lite/SKILL.md
- Pitch: package-less-ship-verification
- orca-start.mts
- [2.13.0] - 2026-10-08
- [2.17.0] - 2026-10-08
- .claude/skills/changelog/SKILL.md
- makeSync
- .claude/skills/switch/SKILL.md
- Ledger
- setup-validator.mts
- Pitch: connected-memory-consolidation
- .claude/agents/cross-pitch-projector.md
- Shipped: connected-process-graph
- Exit criteria per scope (machine-checkable, ≥1 per scope)
- .claude/agents/architect.md
- Shipped: consolidation-schemas
- .claude/skills/eval-harness/SKILL.md
- Shipped: installed-sync
- Phase 0: Shape
- decision
- Entity: Graphify (knowledge-graph front end)
- [2.50.1] - 2026-10-23
- Source-review supplement: token-time-report
- .project/knowledge/issues/a-headless-cli-follows-pwd-not-the-process-cwd.md
- Workflow variants
- Critique
- [2.8.4] - 2026-09-26
- Testing
- Step 2: Generate Documents
- Bundle Sync
- Step 2: Generate Documents
- workflow-capture.mts
- pitch-compress.mts
- Compaction record: orca-vendor-dispatch
- validateReport
- Shape
- workflow-contracts.test.mts
- Runs
- Ship knowledge extraction and incident triage
- Phase 5: Cooldown
- checkAgent
- [2.24.0] - 2026-10-16
- [2.20.0] - 2026-10-08
- Rollout readiness: workflow-v3-rollout
- orca-diff-admit.test.mts
- AGENTS.md
- [1.1.0] - 2026-09-23
- Collector robustness: retained implementation history
- [2.31.4] - 2026-10-18
- post-edit-check.mts
- project/records/shipped/_template.md
- Eval Workflow
- createNodeDeps
- Eval Workflow
- flow-render.mts
- Version Log & Bundle Sync
- Architecture Context
- SETUP — Portable AI Development Workflow
- Shape
- Pitch: review-bench-hardening
- Project state report: retained source detail
- Decision: TOON subset grammar for `ai-workflow.toon`
- [2.15.0] - 2026-10-08
- .project/knowledge/issues/valid-outcome-records-can-lack-queryable-navigation.md
- Grader Types
- Integration Patterns
- _followups.md
- Grader Types
- Integration Patterns
- Exit criteria per scope (machine-checkable, ≥1 per scope)
- skill-compress-guard.test.mts
- Critique
- consolidation-migrate.mts
- Pitch Compress
- /search — Search Project Knowledge
- .project/status.md
- [2.30.1] - 2026-10-17
- Source-review supplement: state-report-redesign
- [2.49.0] - 2026-10-23
- analysis/README.md
- project/context/README.md
- Done Work
- project/rules/README.md
- [2.48.1] - 2026-10-22
- entry-import.mts
- harnesses.md
- Metrics report dimensions: retained source detail
- [2.26.0] - 2026-10-16
- .claude/agents/knowledge-historian.md
- [2.34.0] - 2026-10-19
- [2.0.1] - 2026-09-23
- [2.11.0] - 2026-10-08
- [2.18.0] - 2026-10-08
- [2.46.0] - 2026-10-22
- [2.50.2] - 2026-11-23
- [2.6.0] - 2026-09-25
- [2.8.1] - 2026-09-25
- [2.37.0] - 2026-10-20
- [2.45.1] - 2026-10-22
- [2.35.0] - 2026-10-20
- [2.18.1] - 2026-10-08
- [2.40.0] - 2026-10-21
- [2.8.3] - 2026-09-26
- [2.48.0] - 2026-10-22
- .project/context/README.md
- Live runs: state-ai-authoring
- hooks
- [2.22.0] - 2026-10-09
- [2.22.3] - 2026-10-09
- unfinished-pitches-assessment-2026-09-27.md
- .project/rules/README.md
- [2.50.0] - 2026-10-23
- [2.43.0] - 2026-10-22
- knowledge
- [2.45.0] - 2026-10-22
- [2.22.5] - 2026-10-09
- [2.5.0] - 2026-09-25
- Track ship records: connected-memory-consolidation
- .project/knowledge/decisions/effective-sync-bases-and-bounded-font-discovery.md
- Source-review supplement: shape-lite
- [2.27.0] - 2026-10-16
- [2.31.8] - 2026-10-19
- [2.43.1] - 2026-10-22
- Source-review supplement: orca-engines-range
- Portable AI Development Workflow
- .claude/skills/ship/SKILL.md
- [2.22.4] - 2026-10-09
- checkProjectScaffold
- Steps
- .claude/skills/setup/SKILL.md
- [2.47.0] - 2026-10-22
- index.md
- [2.9.0] - 2026-10-07
- Plan: connected-memory-consolidation
- [2.11.1] - 2026-10-08
- [2.14.0] - 2026-10-08
- [2.14.1] - 2026-10-08
- Shipped: connected-memory-consolidation
- [2.10.0] - 2026-10-07
- [2.16.1] - 2026-10-08
- [2.31.1] - 2026-10-18
- [2.31.2] - 2026-10-18
- [2.42.0] - 2026-10-22
- [2.44.0] - 2026-10-22
- [2.9.1] - 2026-10-07
- stack.md
- [2.4.0] - 2026-09-25
- [2.22.2] - 2026-10-09
- .project/knowledge/decisions/project-state-report-design.md
- [2.50.3] - 2026-11-23
- [2.8.0] - 2026-09-25
- [2.8.2] - 2026-09-26
- [2.20.1] - 2026-10-08
- Audit cycle 2 — connected-memory-consolidation
- [2.30.0] - 2026-10-17
- [2.51.0] - 2026-11-23
- [2.8.6] - 2026-09-28
- .project/records/shipped/_template.md
- [2.16.2] - 2026-10-08
- [2.1.0] - 2026-09-23
- Bundle Sync
- [2.21.0] - 2026-10-09
- Hill chart: {slug}
- [2.29.0] - 2026-10-17
- Pitch: workflow-v3-rollout
- [2.2.0] - 2026-09-23
- [2.31.7] - 2026-10-19
- Portable skill defaults: retained design and verification
- [2.35.1] - 2026-10-20
- [2.47.1] - 2026-10-22
- [2.52.0] - 2026-11-23
- [2.25.0] - 2026-10-16
- Pitch Compress
- Shipped: legacy-upgrade
- [2.0.0] - 2026-09-23
- usage-log.md
- .claude/agents/appetite-auditor.md
- [1.1.1] - 2026-09-23
- [2.23.0] - 2026-10-16
- [2.15.1] - 2026-10-08
- [2.22.1] - 2026-10-09
- Hill chart: {slug}
- [2.38.0] - 2026-10-21
- [2.3.0] - 2026-09-24
- [2.32.1] - 2026-10-19
- Closing criteria requiring an owner decision
- 4. Design recommendations
- [1.2.1] - 2026-09-23
- orca-apply.mts
- connected-memory-consolidation
- [2.32.0] - 2026-10-19
- Workflow usage metrics
- [2.39.0] - 2026-10-21
- [2.36.0] - 2026-10-20
- [2.7.0] - 2026-09-25
- [2.31.5] - 2026-10-18
- [2.37.1] - 2026-10-20
- [2.41.0] - 2026-10-22

## God Nodes (most connected - your core abstractions)
1. `RuntimeDeps` - 163 edges
2. `createNodeDeps()` - 123 edges
3. `Changelog` - 99 edges
4. `createTestDeps()` - 98 edges
5. `createPitchCompress()` - 70 edges
6. `tempFixture()` - 65 edges
7. `Followups` - 64 edges
8. `main()` - 57 edges
9. `FsDeps` - 55 edges
10. `spawnSync()` - 53 edges

## Surprising Connections (you probably didn't know these)
- `Context` --references--> `claude()`  [INFERRED]
  .project/knowledge/decisions/opencode-agent-id-comes-from-the-installed-agent-list.md → ai-framework/hooks/scripts/workflow-capture.test.mts
- `P2d-S2 implementation and test strategy (2026-10-22)` --references--> `legacyInventory()`  [INFERRED]
  .project/records/consolidation/plan.md → ai-framework/scripts/consolidation-migrate.mts
- `Problem and corrections` --references--> `pitches()`  [INFERRED]
  .project/records/legacy-upgrades/state-deep-evidence.md → ai-framework/scripts/facts-gather.mts
- `What this project uses` --references--> `knowledge()`  [INFERRED]
  AGENTS.md → ai-framework/scripts/facts-gather.mts
- `1. Parse Search Query` --references--> `knowledge()`  [INFERRED]
  .claude/skills/search/SKILL.md → ai-framework/scripts/facts-gather.mts

## Import Cycles
- None detected.

## Communities (414 total, 102 thin omitted)

### Community 0 - "skill-registry.mts"
Cohesion: 0.06
Nodes (49): acquire(), cleanup(), codeOf(), context(), Created, fromBase64(), Journal, json() (+41 more)

### Community 1 - "orca-evidence.mts"
Cohesion: 0.08
Nodes (47): Reconcile core (opt-in, library only), Entry, absolutePath(), budget(), Bytes, CleanupDecision, CleanupResult, copyEvidence() (+39 more)

### Community 2 - "orca-dispatch.mts"
Cohesion: 0.05
Nodes (65): Switch: `AI_WORKFLOW_ORCA_MULTI_AGENT`, eligible(), nextMember(), Pick, PickFailure, pickImplementer(), PickInput, pickReviewer() (+57 more)

### Community 3 - "orca-contract.mts"
Cohesion: 0.09
Nodes (35): buildSnapshot(), byteLength(), checkUsedAgainstSnapshot(), CONTRACT_MAX_BYTES, ContractDiff, ContractEntry, ContractResult, ContractSnapshot (+27 more)

### Community 4 - "token-report.mts"
Cohesion: 0.08
Nodes (61): AVAILABILITY, basisText(), change(), cleanDimension(), CleanFlowPhase, CleanFlowPitch, CleanFlows, CleanRecord (+53 more)

### Community 5 - "Followups"
Cohesion: 0.04
Nodes (48): agent-model-sweep-bet-3 (cooldown 2026-10-17, bundled from SHIPPED.md followups) — **approved as a candidate pitch 2026-10-22**, bundle-sync-stale-ledger (cooldown 2026-10-17, bundled) — **approved as a candidate pitch 2026-10-22**, Candidate pitches (cooldown 2026-09-25, approved item by item), codex-orca-coordinator-parity — 2026-10-08, codex-trusted-hook-smoke (cooldown 2026-10-08 C2, approved 2026-10-22 as a candidate pitch), commitLedger's transaction context differs from pitch-archive's guard and recover, Confirm the new Claude Skill hook fires in a fresh session, connected-memory-consolidation — ship preparation (2026-10-23) (+40 more)

### Community 6 - "toon-data.mts"
Cohesion: 0.10
Nodes (34): DATA_GRAMMAR_VERSION, DATA_HEADER, DataError, dataErrorCodes, DataProblem, encodeArray(), encodeData(), encodeObject() (+26 more)

### Community 7 - "token-consumption.mts"
Cohesion: 0.06
Nodes (66): LockOptions, activeContext, applyTranscript(), boundedId(), boundedName(), bundleDefaultMode(), ByVendor, codeOf() (+58 more)

### Community 8 - "Security Rules"
Cohesion: 0.05
Nodes (44): 1. Authentication & Authorization, 2. Data Validation, 3. Secrets & Credentials, 4. Input Safety (XSS Prevention), 5. API Routes, 6. Multi-Tenancy / Organization Isolation, 7. File Uploads (if applicable), 8. Security Anti-Patterns (Auto-Flagged) (+36 more)

### Community 9 - "pitch-archive.mts"
Cohesion: 0.06
Nodes (58): LedgerFileV2, LedgerSectionV2, ApprovedUpgrade, archive(), ArchiveOptions, ArchiveResult, CliOptions, codeOf() (+50 more)

### Community 10 - "Issue: a worker's environment differs from the coordinator's, and the first live smoke tests failed for that reason"
Cohesion: 0.05
Nodes (48): Consequences, Decision, Decision: how Orca starts automatically on workflow phases, Summary, Dependencies, Entity: Orca Policy loader (`.project/orchestration.json`), Interactions, Key APIs (+40 more)

### Community 11 - "workflow-metrics-report.mts"
Cohesion: 0.09
Nodes (37): main(), allTables(), buildReport(), Capture, CAPTURE_NOTES, captureStatus(), Cell, createReports() (+29 more)

### Community 12 - "flow-report.test.mts"
Cohesion: 0.12
Nodes (22): apply(), bytes(), FsOverrides, full(), generations(), historyText, leaf, mutant() (+14 more)

### Community 13 - "Source-review supplement: token-attribution"
Cohesion: 0.08
Nodes (33): addNumber(), applyDimensions(), applyFlows(), applyRecord(), applyToRow(), applyToSnapshot(), blankRow(), bucketKey() (+25 more)

### Community 14 - "Issue: the git-ignored `ai_workflow_env.json` (runner `bun`) makes a test that empties PATH fail on a developer machine"
Cohesion: 0.06
Nodes (30): node(), Issue: the git-ignored `ai_workflow_env.json` (runner `bun`) makes a test that empties PATH fail on a developer machine, Rule, Summary, Issue: macOS resolves `os.tmpdir()` through a `/private/var` alias, breaking exact-path assertions in tests, Prevention, Related, Root Cause (+22 more)

### Community 15 - "Nielsen's 10 Usability Heuristics for Evaluation"
Cohesion: 0.06
Nodes (33): Consistency, Control & Freedom, Efficiency, Error Handling, H10: Help & Documentation, H1: Visibility of System Status, H2: Match Between System and Real World, H3: User Control & Freedom (+25 more)

### Community 16 - "Component Architecture Patterns"
Cohesion: 0.06
Nodes (31): Accept the minimum data needed, Component Architecture Patterns, Component Layers, Component Size Rules, Cross-feature dependency?, Dual-Path Rendering Parity, Enforcement during `/build`, Extract a component when: (+23 more)

### Community 17 - "semver-range.mts"
Cohesion: 0.11
Nodes (26): bump(), Comparator, compareVersions(), desugar(), holds(), isDigit(), isPlain(), low() (+18 more)

### Community 18 - "Context Management"
Cohesion: 0.07
Nodes (29): 1. Loading Everything, 2. No Transition Summaries, 3. Ignoring Previous Sessions, 4. Inline History, Anti-Patterns, Before Each Skill Runs, Context Loading Priority, Context Loading Protocol (+21 more)

### Community 19 - "Coding Standards"
Cohesion: 0.07
Nodes (30): Avoiding Future Refactors, Booleans: prefix with `is/has/can/should`, Code Organization Checklist, Code Quality Principles, Coding Standards, Cohesive module size exceptions, Comments, Constants: `UPPER_SNAKE_CASE` (+22 more)

### Community 20 - "FsDeps"
Cohesion: 0.07
Nodes (9): What it reads, and what it never does, FsDeps, injectBoundaryFile(), The Pattern, The Pattern, The Pattern, The Pattern, Metrics collector: TOCTOU on reads, and clamped lifetime totals (+1 more)

### Community 21 - ".cursor/agents/architect.md"
Cohesion: 0.07
Nodes (27): 1. Current State Analysis, 1. Modularity & Separation of Concerns, 2. Requirements Gathering, 2. Scalability, 3. Design Proposal, 3. Maintainability, 4. Security, 4. Trade-Off Analysis (+19 more)

### Community 22 - "State multipage report: retained source detail"
Cohesion: 0.05
Nodes (38): valid(), 2026-10-08 — correction to the S0 entry, 2026-10-08 — S0: Orca policy valid, dispatch not ready, 2026-10-08 — S1 touched `state-theme.test.mts` (1 line), 2026-10-08 — second correction to the S0 entry (supersedes the one above), 2026-10-08 — stale `.state-stage` blocks --apply, Acknowledged → log.md, Acknowledged → log.md / followups (+30 more)

### Community 23 - "review-bench.mts"
Cohesion: 0.11
Nodes (39): BOOKKEEPING_FILES, BOOKKEEPING_PREFIXES, canaryCheck(), CanaryResult, CanarySpec, cli(), CliResult, count() (+31 more)

### Community 24 - "createLedger"
Cohesion: 0.20
Nodes (26): retryAfterResidual(), settleWithoutEvidence(), canonical(), createLedger(), acquireIntegration(), acquireLock(), claim(), claimUnlocked() (+18 more)

### Community 25 - "token-consumption.test.mts"
Cohesion: 0.06
Nodes (30): CollectorInput, CompletionRecord, Routing, SNAPSHOT_REVISION, adapterDeps(), BLOCKS, Claude, CLI (+22 more)

### Community 26 - "graphify.mts"
Cohesion: 0.05
Nodes (56): OpenCode port before the first OpenCode worker, buildGraph(), DECISION_STATUSES, DecisionStatus, ensureProjectFiles(), extractTitle(), extractWikiLinks(), FrontmatterValue (+48 more)

### Community 27 - "main"
Cohesion: 0.20
Nodes (36): main(), absolute(), checkCavemanState(), checkClaudeCaptureWiring(), checkClaudeStartupWiring(), checkCodexStartupWiring(), checkConfigValidators(), checkConsolidation() (+28 more)

### Community 28 - "Eval Harness Skill"
Cohesion: 0.17
Nodes (12): Best Practices, Capability Evals, Eval Harness Skill, Eval Storage, Eval Types, Example: Adding Authentication, Metrics, pass@k (+4 more)

### Community 29 - "Eval Harness Skill"
Cohesion: 0.17
Nodes (12): Best Practices, Capability Evals, Eval Harness Skill, Eval Storage, Eval Types, Example: Adding Authentication, Metrics, pass@k (+4 more)

### Community 30 - "config-migrate.mts"
Cohesion: 0.09
Nodes (41): assertPinned(), buildModel(), ConfigMigration, DEFAULT_MODELS_TOON, DirPin, emitToon(), ensureDirectory(), entry() (+33 more)

### Community 31 - "workflow-metrics-state.mts"
Cohesion: 0.06
Nodes (70): activityKey(), add(), addRecord(), addRow(), addSummary(), applyEvent(), blankNode(), blankPhaseNode() (+62 more)

### Community 32 - "Compaction record: independent-rereview-catch-up"
Cohesion: 0.08
Nodes (26): Compaction record: independent-rereview-catch-up, Section 10: pitch.md#rabbit-holes, Section 11: audit-cycle-1.md, Section 12: deviations.md#s0-2026-09-26, Section 13: deviations.md#s4-2026-09-26, Section 14: deviations.md#s1-2026-09-26, Section 15: deviations.md#s2-2026-09-26, Section 16: deviations.md#s2-gate-2026-09-27 (+18 more)

### Community 33 - "Observability Rules"
Cohesion: 0.08
Nodes (23): 1. Error Boundaries, 2. User Feedback (Toasts / Alerts / Inline Messages), 3. Loading States, 4. Logging Conventions, 5. Error Recovery Patterns, 6. Not-Found / Missing-Resource Handling, Backend/handler layer: throw user-friendly errors for expected failures, Do NOT put business logic in error boundaries (+15 more)

### Community 34 - "Performance Rules"
Cohesion: 0.09
Nodes (23): 1. Minimize Client-Side JavaScript, 2. Data-Access / Query Performance, 3. Bundle Size, 4. Loading States, 5. Caching, Avoid N+1 queries — don't fetch inside a loop, Avoid unnecessary re-renders, Don't fetch inside loops (+15 more)

### Community 35 - "skill-vendors.test.mts"
Cohesion: 0.10
Nodes (17): BUNDLE, captureDeps(), { context, readRegistry }, __dirname, { discoverVendors, externalSkillReport, cursorMirrors }, fixture(), git(), MirrorReport (+9 more)

### Community 36 - "Source-review supplement: state-ai-authoring"
Cohesion: 0.15
Nodes (13): value(), slot(), Audit cycle 1, Build deviations and rulings, Follow-ups and limits, Historical contradictions, Knowledge and lessons, Live harness and matrix (+5 more)

### Community 37 - "CI/CD & Deployment Rules"
Cohesion: 0.09
Nodes (21): 1. Pre-Merge Requirements (Local), 2. Backend/Schema Deployment, 3. Environment Variables, 4. Rollback Plan, 5. Deployment Checklist, 6. What Must NOT Go to Production, 7. Multi-Service Deployment Order, Backend environment variables (+13 more)

### Community 38 - "runtime.test.mts"
Cohesion: 0.06
Nodes (38): fixture(), tmpdir(), withCli(), here, NOW, testDeps, tmpdir(), modelsToon() (+30 more)

### Community 39 - "orca-diff-admit.mts"
Cohesion: 0.09
Nodes (30): ADMIT_BUDGET_MS, admitDiff(), AdmitOptions, AdmitResult, byteLength(), CONTROL, DIFF_FLAGS, encoder (+22 more)

### Community 40 - "config.test.mts"
Cohesion: 0.12
Nodes (14): Existing, Prior, Location, errorCodes, Location, MAX_CONFIG_BYTES, BASELINE_TOON, loadAny() (+6 more)

### Community 41 - "workflow-doctor.mts"
Cohesion: 0.15
Nodes (9): Workflow Doctor, hasRawHook(), hooksDir(), SNAPSHOT_PATH, runWorkflow(), inspectWorkflowEnv(), checkGraphHooks(), Workflow Doctor (+1 more)

### Community 42 - "orca-eval-grader.test.mts"
Cohesion: 0.09
Nodes (20): ReportOutcome, DATASET_FILE, GradeOptions, GradeReport, GraderLibraries, HOSTILE_SUMMARY_CASE, caseOf(), deps (+12 more)

### Community 43 - "Pattern: Allow-list untrusted labels at ingest, and again at the place they are rendered"
Cohesion: 0.04
Nodes (61): Consequences, Decision: the metrics collector holds a kernel-owned loopback lease, not a lock file, References, Summary, Consequences, Decision, Decision: how token metrics record and report vendor, model, agent, effort and skill, References (+53 more)

### Community 44 - "/setup — Project Setup & Context Generation"
Cohesion: 0.14
Nodes (13): If files exist (re-run mode):, If no files exist (first-time mode):, Important Rules, /setup — Project Setup & Context Generation, Step 0: Detect Existing Setup, Step 1: Scan Project Structure, Step 2b: Generate Stack-Specific Rules (and an Agent, if needed), Step 3: Present Findings to User (+5 more)

### Community 45 - "Phase 4: Ship"
Cohesion: 0.14
Nodes (14): 1. Final verification (mandatory), 2. Pitch ↔ implementation reconciliation → SHIPPED.md, 3. Knowledge extraction (mandatory, structured), 4. Status compaction (≤100 lines hard cap), 5. Followups handling, 6. Doc updates (conditional, recorded), Activities (in order), Confirmation gate (+6 more)

### Community 46 - "Codex handoff — start here"
Cohesion: 0.22
Nodes (8): Codex handoff — start here, How Codex finds things here, Orca (opt-in, off unless `AI_WORKFLOW_ORCA_MULTI_AGENT` is exactly `true`), Rules that bite, Run and verify, State right now, Suggested first steps in Codex, What this repository is

### Community 47 - "validUsage"
Cohesion: 0.26
Nodes (23): count(), date(), keysAre(), normalizeEvent(), object(), scopeKey(), storedName(), storedPitch() (+15 more)

### Community 48 - "browser-runtime.test.mts"
Cohesion: 0.10
Nodes (26): Formatting installed content, BrowserReport, catalogEntry(), cli(), CliOptions, CliState, cliStatus(), defaultDeps() (+18 more)

### Community 49 - "convertV2"
Cohesion: 0.15
Nodes (13): Built, convertV2(), ConfigModel, Why, Follow-ups and historical limits, Historical contradictions, Audit and review chronology, Design decisions (+5 more)

### Community 50 - "skill-defaults.mts"
Cohesion: 0.13
Nodes (18): CatalogEntry, cli(), CliOptions, defaultDeps(), defaultRegistry, DefaultReport, isRecord(), loadLegacyModes() (+10 more)

### Community 51 - "Issue: making a shared reader treat a symlink as "absent" turned its writer into a data-destroyer"
Cohesion: 0.07
Nodes (27): Decision: shared compaction recovery context and trusted directories, Decision and consequences, Decision: Inode anchoring and stable-inode locks, Observations, Issue: making a shared reader treat a symlink as "absent" turned its writer into a data-destroyer, Prevention, Root Cause, Solution (+19 more)

### Community 52 - "workflow-metrics-state.test.mts"
Cohesion: 0.07
Nodes (34): nativeAt(), scenario(), blankState(), name(), SCHEMA_VERSION, apply(), at(), capture() (+26 more)

### Community 53 - "instruction-loading.test.mts"
Cohesion: 0.09
Nodes (25): CASE_STATUS, CaseSpec, Context, Criterion, cursor(), Dataset, deps, diskFiles() (+17 more)

### Community 54 - "review-bench.test.mts"
Cohesion: 0.12
Nodes (16): Fake, CANARY, Fake, git(), GUARD_GIT, here, repo(), run() (+8 more)

### Community 55 - "flow-join.mts"
Cohesion: 0.06
Nodes (46): Agg, Availability, Bounds, cells(), child(), cmp(), count(), exactPhase() (+38 more)

### Community 56 - "orca-reconcile.test.mts"
Cohesion: 0.13
Nodes (12): CheckSpec, CATALOG, complete(), deps, ENV, Fixture, git(), read() (+4 more)

### Community 57 - "orca-eval-grader.mts"
Cohesion: 0.07
Nodes (66): Failure mode this prevents, agentProbe(), allTrue(), argAfter(), Behaviour, BRIEF_FIELDS, CaseResult, catalog() (+58 more)

### Community 58 - "flow-report.mts"
Cohesion: 0.11
Nodes (37): REASONS, Format, renderFormats(), applyReport(), Chain, Collected, collectSources(), failure() (+29 more)

### Community 59 - "/test-strategy — Smart Testing"
Cohesion: 0.11
Nodes (19): 1. Load transition summary, 2. Read testing rules, 3. Strategy pass, 4. Build and present test plan, 5. Get approval on the test plan, 6. Write the tests, 7. Run tests, 8. Check coverage (+11 more)

### Community 60 - "Phase 3: Audit"
Cohesion: 0.10
Nodes (21): Adaptive gate, Confirmation gate, Cross-pitch conflict check, Eval gate (AI changes — hard), Evidence rule (same as /build), Finding contract (every subagent), Incomplete reviews, Loop discipline (+13 more)

### Community 61 - "Compaction record: orca-vendor-foundation"
Cohesion: 0.09
Nodes (22): Compaction record: orca-vendor-foundation, Section 10: pitch.md#rabbit-holes, Section 11: audit-cycle-1.md, Section 12: deviations.md#d1-explicit-orca-opt-in, Section 13: deviations.md#d2-portable-fixture-assertions, Section 14: deviations.md#d3-cohesive-policy-module, Section 15: deviations.md#d4-conservative-runtime-proof, Section 16: log.md#s1-test-review (+14 more)

### Community 62 - "/test-strategy — Smart Testing"
Cohesion: 0.10
Nodes (19): 1. Load transition summary, 2. Read testing rules, 3. Strategy pass, 4. Build and present test plan, 5. Get approval on the test plan, 6. Write the tests, 7. Run tests, 8. Check coverage (+11 more)

### Community 63 - "skill-source.mts"
Cohesion: 0.13
Nodes (23): defaultDeps(), frontmatter(), git(), gitBytes(), GitFailure, gitRun(), identity(), InspectedSource (+15 more)

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
Nodes (10): BACKUP_DIR, main(), STATE_FILE, capture(), deps, LEGACY, POLICY, SCRIPTS_DIR (+2 more)

### Community 68 - "Model Routing Strategy"
Cohesion: 0.13
Nodes (15): Always, Cascade Pipeline, Conditional Phases, Context budget discipline, Cost Measurement, Cost Optimization Rules, Don't over-front-load context, Model Routing Strategy (+7 more)

### Community 69 - "orca-run.mts"
Cohesion: 0.12
Nodes (38): DispatchOptions, report(), bad(), checkCatalog(), CliError, collectInput(), Command, COMMANDS (+30 more)

### Community 70 - "graphify-relations.mts"
Cohesion: 0.08
Nodes (39): adapterFiles(), canonicalFiles(), canonicalOf(), CheckOptions, checkRelations(), DECLARED, declaredEdges(), DeclaredRelation (+31 more)

### Community 71 - "facts-gather.test.mts"
Cohesion: 0.12
Nodes (16): Fact, Facts, INERT, Limits, REPORT_DIRECTORY, SECRET_PATTERNS, Status, STATUSES (+8 more)

### Community 72 - ".project/knowledge/patterns/a-writer-reinspects-the-target-at-the-publish-step.md"
Cohesion: 0.07
Nodes (24): Do, Pattern: a writer re-inspects the target at the publish step, and cleans up only what it wrote, Summary, Pattern: git run against a worker's tree executes worker code unless every command is guarded, Summary, The Pattern, Pattern: settle an attempt only with proof bound to this attempt's patch, and make reruns re-prove it, Summary (+16 more)

### Community 73 - "orca-reconcile.mts"
Cohesion: 0.17
Nodes (19): AdmittedWorker, GIT_HARDENING, WorktreeRef, AttemptResult, AttemptState, CHECK_DEFINITIONS, CheckResult, claimsMatch() (+11 more)

### Community 74 - "Compaction record: workflow-usage-metrics"
Cohesion: 0.10
Nodes (21): Compaction record: workflow-usage-metrics, Section 10: deviations.md#d3-audit-hardening-and-path-check-boundary, Section 11: deviations.md#d4-coupled-modules-and-explicit-schema-validation, Section 12: log.md#2026-10-08-s1-start, Section 13: log.md#s1-verification-attempt-1, Section 14: log.md#s1-compatibility-run, Section 15: log.md#s1-exit-evidence-complete, Section 16: log.md#s2-start-approved (+13 more)

### Community 75 - "/sync — Sync Tasks with Notion"
Cohesion: 0.06
Nodes (31): sync, After `/ship`, Arguments, Config File, During `/resume`, Error Handling, First-Time Setup, Full Sync (Default) (+23 more)

### Community 76 - "Security Reviewer"
Cohesion: 0.12
Nodes (16): 1. Initial Scan, 2. OWASP Top 10 Check, 3. Code Pattern Review, Analysis Commands, Common False Positives, Core Responsibilities, Emergency Response, Hard rules (always apply, no exceptions) (+8 more)

### Community 77 - "OpenCode + Orca Handoff"
Cohesion: 0.12
Nodes (14): Configuration, Current adapter state, How to verify, Known blockers, Next steps to make Orca work from OpenCode, OpenCode + Orca Handoff, Orca runtime probe, Related files (+6 more)

### Community 78 - "Pattern: local eval data must be gitignored alongside the dataset specs"
Cohesion: 0.14
Nodes (13): Issue: a killed in-place mutation script leaves the source mutated, Prevention, Resolution, Summary, Pattern: shorten instructions behind a frozen baseline; keep rejected candidates and defer a scope rather than tune it, Summary, Examples in Codebase, Pattern: local eval data must be gitignored alongside the dataset specs (+5 more)

### Community 79 - "validate.test.mts"
Cohesion: 0.09
Nodes (24): ADAPTERS, boundaryFindings(), files, root, SKIP, sources, testDeps, tmpdir() (+16 more)

### Community 80 - "bundle-sync.mts"
Cohesion: 0.12
Nodes (16): BaseLookup, classify(), colors, Digest, Flagged, FLAGGED_FILES, IGNORE_NAMES, Manifest (+8 more)

### Community 81 - "skill-defaults.test.mts"
Cohesion: 0.06
Nodes (37): acquire(), Acquired, codeOf(), defaultDeps(), Endpoint, endpointFor(), Lease, Leased (+29 more)

### Community 82 - "State"
Cohesion: 0.13
Nodes (15): preview(), State, Step 1 — Preview the facts, Step 2 — Check Archify is installed (stop here if it is not), Step 3 — Write the draft, Step 4 — Validate and render with Archify, Step 5 — Report, What this skill never touches (+7 more)

### Community 83 - "AI Tool Use Constraints & Enforcement"
Cohesion: 0.13
Nodes (14): 1. Document in system prompt, 2. Add server-side deduplication, 3. Add tests, 4. Monitor and log, AI Tool Use Constraints & Enforcement, Checklist, Core Rule, Implementation Pattern (+6 more)

### Community 84 - "installed-upgrade.test.mts"
Cohesion: 0.21
Nodes (15): baseline(), command(), deps, durableHashes(), exists(), flags, git(), legacyText() (+7 more)

### Community 85 - "createFactsGather"
Cohesion: 0.32
Nodes (14): createFactsGather(), clean(), cli(), explainer(), gather(), pitches(), read(), skills() (+6 more)

### Community 86 - "RuntimeDeps"
Cohesion: 0.19
Nodes (10): Fake, Context, Fake, ApplyOptions, Ctx, RollbackOptions, RuntimeDeps, RegistryApi (+2 more)

### Community 87 - "usableShape"
Cohesion: 0.35
Nodes (13): hasFields(), isCount(), isCountOrNull(), isObject(), isStoredFlow(), isStoredRecord(), isText(), routingResolves() (+5 more)

### Community 88 - "Build Error Resolver"
Cohesion: 0.17
Nodes (12): 1. Collect All Errors, 2. Fix Strategy (MINIMAL CHANGES), 3. Common Fixes, Build Error Resolver, Core Responsibilities, Diagnostic Commands, DO and DON'T, Priority Levels (+4 more)

### Community 89 - "makeValidator"
Cohesion: 0.27
Nodes (17): main(), makeValidator(), checkCavemanEntryFiles(), checkConsolidation(), checkContext(), checkCursorMirrors(), checkEntryFiles(), checkKnowledgeGraph() (+9 more)

### Community 91 - "Issue: a missing tracked file is not an undeleted deletion"
Cohesion: 0.07
Nodes (28): Issue: a missing tracked file is not an undeleted deletion, Prevention, Root Cause, Solution, Summary, Symptoms, Issue: editing a canonical file alone breaks the byte-identity mirror check, Prevention (+20 more)

### Community 92 - "orca-start.test.mts"
Cohesion: 0.06
Nodes (37): agentProber(), common, engineRoot(), EXAMPLE, fixture(), nodeDeps, Obj, ok (+29 more)

### Community 93 - "Source-review supplement: workflow-usage-capture"
Cohesion: 0.17
Nodes (12): A1 prerequisite, Historical contradictions, Limits and open items, Measurements, Plan and event mapping, Rollout check, Scope and contract, Shaping origin and part B (+4 more)

### Community 94 - ".project/knowledge/patterns/keep-the-fakes-guarantee-the-thing-they-replace.md"
Cohesion: 0.08
Nodes (25): Issue: a sparse array hole skips `every` but is visited by `for-of`, Prevention, Related, Root cause, Solution, Summary, Symptoms, Issue: a temp-fixture helper that realpaths its result silently voids a macOS alias guard (+17 more)

### Community 95 - "Audit cycle1 — P2d and P2c (separate from completed P1/P2a audit)"
Cohesion: 0.12
Nodes (16): Acknowledged (log.md), Audit cycle1 — P2d and P2c (separate from completed P1/P2a audit), audit-cycle-1, Audit cycle 1 — connected-memory-consolidation (P1 and P2a), audit-cycle-3, Audit cycle 3 — connected-memory-consolidation (last cycle for big-batch), Audit cycles: connected-memory-consolidation, Audit-end gate (+8 more)

### Community 96 - "loadConfig"
Cohesion: 0.35
Nodes (11): inspectExisting(), unsupportedVersion(), inspectConfig(), inspectPath(), loadConfig(), missing(), ModelEntry, readBoundedFile() (+3 more)

### Community 97 - ".cursor/agents/code-reviewer.md"
Cohesion: 0.13
Nodes (14): Approval criteria, Best Practices (LOW), Code Quality (HIGH), Confidence-Based Filtering, Frontend Framework Patterns (HIGH), Hard rules (always apply, no exceptions), Node.js/Backend Patterns (HIGH), Output structure (+6 more)

### Community 98 - "config.mts"
Cohesion: 0.08
Nodes (39): CAVEMAN_MODES, COORDINATOR_KEYS, coordinatorValidators, defaultDeps(), defaultOrca(), engineValidators, expectBoolean(), expectInteger() (+31 more)

### Community 99 - "ledger-schema.mts"
Cohesion: 0.07
Nodes (39): checkEntry(), CLASSES, Disposition, DISPOSITIONS, DONE_WORK_FILE, FILE_KEYS, FileAccount, FileRef (+31 more)

### Community 100 - "Rollback Plan: [Feature Name]"
Cohesion: 0.15
Nodes (12): Code rollback:, Communication, Deployment Steps, If feature-flagged:, If schema change involved:, Notes, Post-Rollback, Pre-Deployment Checklist (+4 more)

### Community 101 - "Design: [Feature Name]"
Cohesion: 0.15
Nodes (12): Component Design, Data Model Changes, Design Decisions, Design: [Feature Name], Files to Create/Modify, Implementation Steps, Open Questions, Overview (+4 more)

### Community 102 - ".claude/agents/code-reviewer.md"
Cohesion: 0.12
Nodes (14): Approval criteria, Best Practices (LOW), Code Quality (HIGH), Confidence-Based Filtering, Frontend Framework Patterns (HIGH), Hard rules (always apply, no exceptions), Node.js/Backend Patterns (HIGH), Output structure (+6 more)

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
Cohesion: 0.07
Nodes (37): stopped(), fixture(), run(), flags, repo, script, testDeps, tmpdir() (+29 more)

### Community 107 - "migrate.mts"
Cohesion: 0.36
Nodes (11): addMissingHooks(), FILES, groupScripts(), isRecord(), migrateHooks(), migrateInstanceEntries(), REFERENCES, regular() (+3 more)

### Community 108 - "Rollback Plan: [Feature Name]"
Cohesion: 0.15
Nodes (12): Code rollback:, Communication, Deployment Steps, If feature-flagged:, If schema change involved:, Notes, Post-Rollback, Pre-Deployment Checklist (+4 more)

### Community 109 - "Design: [Feature Name]"
Cohesion: 0.15
Nodes (12): Component Design, Data Model Changes, Design Decisions, Design: [Feature Name], Files to Create/Modify, Implementation Steps, Open Questions, Overview (+4 more)

### Community 110 - "/impact — Impact Analysis"
Cohesion: 0.06
Nodes (29): impact, 1. Load the design plan, 2. Trace downstream consumers, 3. Check boundary violations, 4. Identify affected tests, 5. Check knowledge graph for relevant warnings, 6. Risk summary, Confirmation Gate (+21 more)

### Community 111 - "orca-preflight.mts"
Cohesion: 0.04
Nodes (69): BriefResult, CONTROL, Env, InstalledAgentsOptions, Json, LaunchDecision, LaunchOptions, LaunchRequest (+61 more)

### Community 112 - "README.md"
Cohesion: 0.16
Nodes (10): Design notes, Managed-write safety and interrupted compaction, How to improve this flow, Set up, Setup Validator, Token Consumption, One source, every vendor, What you get (+2 more)

### Community 113 - "outcome-record.mts"
Cohesion: 0.06
Nodes (44): Pitch Compress, DEFAULT_PER_FILE_REFS, DEFAULT_REF_BUDGET, DEFAULT_TOTAL_REFS, DeriveInput, deriveRefs(), DeriveResult, dropHubTargets() (+36 more)

### Community 114 - "token-report.test.mts"
Cohesion: 0.13
Nodes (18): blankDimensions(), blankFlows(), blankSnapshot(), blankTotals(), Dimensions, Flows, nullMap(), readSnapshot() (+10 more)

### Community 115 - "Harness Integration Guide"
Cohesion: 0.17
Nodes (12): Capability Profiles, Caveman Mode, Claude Code, Codex, Harness Integration Guide, Instance-managed Skills, Mandatory: project-root `ai-workflow.toon`, OpenCode (+4 more)

### Community 116 - "node.mts"
Cohesion: 0.08
Nodes (14): boundedClose(), cleanupError(), closedChildren, nodeNet, ownedChildren, pendingChildPids(), posixGroupIsRunning(), ProcessGroupInspection (+6 more)

### Community 117 - "changelog.mts"
Cohesion: 0.26
Nodes (15): allArgs(), arg(), buildEntry(), bump(), codeOf(), EntryParts, fail(), insertEntry() (+7 more)

### Community 118 - "Wireframe: [Feature Name]"
Cohesion: 0.17
Nodes (11): Accessibility Notes, Component Map, Design Tokens Used, Desktop (>= 1024px), Interactive Elements, Mobile (< 768px), Open Questions, Screen Layout (+3 more)

### Community 119 - "Wireframe: [Feature Name]"
Cohesion: 0.17
Nodes (11): Accessibility Notes, Component Map, Design Tokens Used, Desktop (>= 1024px), Interactive Elements, Mobile (< 768px), Open Questions, Screen Layout (+3 more)

### Community 120 - "Compaction record: state-quoted-fonts"
Cohesion: 0.17
Nodes (12): Compaction record: state-quoted-fonts, Section 10: audit-cycle-1.md, Section 11: log.md#s1-2026-09-26, Section 1: SHIPPED.md#scope-reconciliation, Section 2: SHIPPED.md#verification, Section 3: SHIPPED.md#audit, Section 4: SHIPPED.md#no-gos-honored, Section 5: SHIPPED.md#rabbit-holes-and-deviations (+4 more)

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
Cohesion: 0.18
Nodes (11): Compaction record: native-safety-feasibility, Section 10: log.md#2026-09-26-shipped, Section 1: SHIPPED.md#reconciliation, Section 2: SHIPPED.md#verification-and-audit, Section 3: SHIPPED.md#no-gos-and-documentation, Section 4: SHIPPED.md#knowledge-and-remaining-work, Section 5: SHIPPED.md#delivery, Section 6: pitch.md#no-gos (+3 more)

### Community 125 - "Audit reviews: connected-memory-consolidation"
Cohesion: 0.10
Nodes (20): audit-records/2026-10-23-p2d-p2c-repair/actual-ownership.toon, audit-records/2026-10-23-p2d-p2c-repair/baseline-provenance.toon, audit-records/2026-10-23-p2d-p2c-repair/completion-code.md, audit-records/2026-10-23-p2d-p2c-repair/completion-coverage.md, audit-records/2026-10-23-p2d-p2c-repair/completion-security.md, audit-records/2026-10-23-p2d-p2c-repair/cross-complete.md, audit-records/2026-10-23-p2d-p2c-repair/cross.md, audit-records/2026-10-23-p2d-p2c-repair/guard-and-source-witness.toon (+12 more)

### Community 126 - "/setup — Project Setup & Context Generation"
Cohesion: 0.15
Nodes (13): If files exist (re-run mode):, If no files exist (first-time mode):, Important Rules, /setup — Project Setup & Context Generation, Step 0: Detect Existing Setup, Step 1: Scan Project Structure, Step 2b: Generate Stack-Specific Rules (and an Agent, if needed), Step 3: Present Findings to User (+5 more)

### Community 127 - "orca-ledger.mts"
Cohesion: 0.07
Nodes (35): ATTEMPT_PREFIX, authorizedPathsOverlap(), ClaimResult, Dir, INTEGRATION_LOCK, LEDGER_DIR_PARTS, LedgerLease, LedgerPatch (+27 more)

### Community 128 - "stuck-uphill-detector.mts"
Cohesion: 0.34
Nodes (12): appendAudit(), checkPitchFile(), detectStuck(), HillRow, insidePitches(), listActivePitches(), main(), parseHill() (+4 more)

### Community 129 - ".project/knowledge/patterns/a-gate-must-not-trust-its-own-author.md"
Cohesion: 0.04
Nodes (54): Consequences, Context, Decision, Decision: accept reviewed destination drift by binding both versions, Consequences, Decision, Decision: how `/pitch-compress` decides a deletion is safe, References (+46 more)

### Community 130 - "opencode-plugin.test.mts"
Cohesion: 0.11
Nodes (12): Event, here, PluginRun, pluginUrl, snapshot(), snapshotOf(), testDeps, ToolHook (+4 more)

### Community 131 - "ADR-NNNN: [Decision Title]"
Cohesion: 0.18
Nodes (10): ADR-NNNN: [Decision Title], Alternatives Considered, Consequences, Context, Decision, Negative, Option A: [Name], Option B: [Name] (+2 more)

### Community 132 - "Feature: [Feature Name]"
Cohesion: 0.18
Nodes (10): Acceptance Criteria, Affected Areas, Description, Feature: [Feature Name], i18n Requirements, In Scope, Notes, Out of Scope (+2 more)

### Community 133 - "pre-ship-verify.mts"
Cohesion: 0.14
Nodes (22): asRecord(), buildChecks(), Check, CheckResult, CLI_BY_MANAGER, diffSanity(), errorMessage(), git() (+14 more)

### Community 134 - "orca-vendors.md"
Cohesion: 0.10
Nodes (17): Audit, Audit, Execute, Optional Orca coordination, Audit, Execute, Optional Orca coordination, Fix (+9 more)

### Community 135 - "ADR-NNNN: [Decision Title]"
Cohesion: 0.18
Nodes (10): ADR-NNNN: [Decision Title], Alternatives Considered, Consequences, Context, Decision, Negative, Option A: [Name], Option B: [Name] (+2 more)

### Community 136 - "Feature: [Feature Name]"
Cohesion: 0.18
Nodes (10): Acceptance Criteria, Affected Areas, Description, Feature: [Feature Name], i18n Requirements, In Scope, Notes, Out of Scope (+2 more)

### Community 137 - "types.mts"
Cohesion: 0.07
Nodes (39): main(), discover(), FULL_ROOTS, launch, main(), Options, parseArgs(), select() (+31 more)

### Community 138 - "Security Reviewer"
Cohesion: 0.12
Nodes (16): 1. Initial Scan, 2. OWASP Top 10 Check, 3. Code Pattern Review, Analysis Commands, Common False Positives, Core Responsibilities, Emergency Response, Hard rules (always apply, no exceptions) (+8 more)

### Community 139 - "orca-run.test.mts"
Cohesion: 0.09
Nodes (22): Calls, dispatching(), dispatchInput(), EXAMPLE, failing, Fixture, git(), Harness (+14 more)

### Community 140 - "data-file.mts"
Cohesion: 0.10
Nodes (40): What to do, candidates(), checkJsonValue(), dataFileErrorCodes, DataFormat, DataReadResult, DataRefusal, DataWriteResult (+32 more)

### Community 141 - "skill-sync.mts"
Cohesion: 0.10
Nodes (23): checkCollisions(), CONFIG_NAMES, { context, digest, json, snapshot, readRegistry, transact, resolveFile }, defaultDeps(), discoverFormatter(), { discoverVendors, adapters }, formatFiles(), FormatResult (+15 more)

### Community 142 - "orca-dispatch.test.mts"
Cohesion: 0.09
Nodes (35): agentOf(), agentsOf(), assertRequestRefusal(), assigned(), base(), Behaviour, done(), EXAMPLE (+27 more)

### Community 143 - "2. Search by Scope"
Cohesion: 0.18
Nodes (11): 1. Parse Search Query, 2. Search by Scope, 3. Rank Results, 4. Present Results, 5. Offer Actions, ADRs (`/search adrs "query"`), All (default), Knowledge (`/search knowledge "query"`) (+3 more)

### Community 144 - "orca-policy.mts"
Cohesion: 0.06
Nodes (41): OpenCode agent id, request ids and releasing workers, invalidOverrides, boundedInteger(), cli(), Coordinator, defaultDeps(), errorCode(), hasKeys() (+33 more)

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

### Community 149 - "2. Search by Scope"
Cohesion: 0.18
Nodes (11): 1. Parse Search Query, 2. Search by Scope, 3. Rank Results, 4. Present Results, 5. Offer Actions, ADRs (`/search adrs "query"`), All (default), Knowledge (`/search knowledge "query"`) (+3 more)

### Community 150 - "test-helpers.mts"
Cohesion: 0.04
Nodes (78): blocked(), blockedText(), deps, fixture(), run(), PHASES, repo, script (+70 more)

### Community 151 - "Entity: Name"
Cohesion: 0.22
Nodes (8): Dependencies, Entity: Name, Interactions, Key APIs, Location, Notes, Responsibilities, Summary

### Community 152 - "upgrade.test.mts"
Cohesion: 0.14
Nodes (19): Beyond the core pipeline, The pipeline, assertHealthy(), COMMANDS, comparable(), docsOnlyDoctorFailures(), graphifyShape(), migrateConfig() (+11 more)

### Community 153 - ".project/knowledge/patterns/a-gate-must-not-audit-its-own-instrument.md"
Cohesion: 0.04
Nodes (53): Consequences, Decision, Decision: how the runtime boundary is validated, Summary, Fix, Issue: a cross-pitch-conflict-checker cannot separate authorship in a file two uncommitted pitches share, Prevention, Related Patterns (+45 more)

### Community 154 - "add-skill.mts"
Cohesion: 0.09
Nodes (27): AddSkillOptions, AddSkillResult, checkNamespace(), cli(), { context, digest, json, snapshot, readRegistry, transact, recover, resolveFile }, defaultDeps(), { discoverVendors, adapters }, globalLink() (+19 more)

### Community 155 - "toon-machine-data"
Cohesion: 0.06
Nodes (31): Adding a new case, Adding a new judge rubric, Cost control, Dataset format, Directory map, Eval Harness, Interpreting the report, Known scope (example) (+23 more)

### Community 156 - "Phase 1: Plan"
Cohesion: 0.04
Nodes (40): Plan, 1. Decompose into scopes, 2. Define machine-checkable exit criteria per scope, 3. Identify parallelism, 4. Inherit risks from pitch, 5. Wireframes (UI scopes only, light), 6. Initialize hill chart, Activities (in order) (+32 more)

### Community 157 - ".project/knowledge/patterns/a-version-migrator-edits-the-token-not-the-model.md"
Cohesion: 0.20
Nodes (9): Issue: Node's strip-only TypeScript mode rejects constructor parameter properties, Prevention, Root cause, Solution, Summary, Symptoms, How to apply, Pattern: an additive schema migration edits the version token and appends, then proves it through the strict reader (+1 more)

### Community 158 - "Bug: [Short Description]"
Cohesion: 0.22
Nodes (8): Affected Files, Bug: [Short Description], Description, Environment, Expected Behavior, Fix, Reproduction Steps, Root Cause

### Community 159 - "workflow-doctor.test.mts"
Cohesion: 0.10
Nodes (23): captureSettings(), after(), project(), fixture(), readFileSync(), settings, sourceSettings, testDeps (+15 more)

### Community 160 - "Testing Rules"
Cohesion: 0.13
Nodes (14): Coverage Targets (starting point — adjust per project), E2E Scope, File Organization, Guards and Fixes, Guards and Fixes: Prove the Test Can Fail, Mocking Discipline, Testing Checklist for New Features, Testing Rules (+6 more)

### Community 161 - ".project/knowledge/issues/orca-worker-list-concise-view-hides-the-worker-identity-fields.md"
Cohesion: 0.09
Nodes (22): Context, Decision, Decision: the Orca caller-identity lookup is bounded by live work, and a refused start keeps its reason without weakening ownership, Delivered scopes, no-gos and rabbit holes (kept when the pitch folder was compacted, 2026-11-23), Summary, Follow-up: make the gate tolerate the next update (2.51.2), Issue: an Orca CLI upgrade silently changed output the launch gate parses, Prevention (+14 more)

### Community 162 - "legacy-upgrade.mts"
Cohesion: 0.18
Nodes (31): projectNames(), readProjectBytes(), readProjectText(), deriveOutcomeRefs(), destinationPath(), destinationRefusal(), apply(), ApplyOptions (+23 more)

### Community 163 - "Source-review supplement: state-fragment-sanitizer"
Cohesion: 0.20
Nodes (10): Audit triage, Build history, Design decisions, Historical contradictions, Limits and open items, Scope and contract, Source-review supplement: state-fragment-sanitizer, Standing constraints (+2 more)

### Community 164 - "Issue: Title"
Cohesion: 0.25
Nodes (7): Issue: Title, Prevention, Related, Root Cause, Solution, Summary, Symptoms

### Community 165 - "Pattern: Title"
Cohesion: 0.25
Nodes (7): Examples in Codebase, Pattern: Title, Related Patterns, Summary, The Pattern, When NOT to Use, When to Use

### Community 166 - "Compaction record: bundle-sync-marker-fix"
Cohesion: 0.17
Nodes (12): Compaction record: bundle-sync-marker-fix, Section 10: audit-cycle-1.md, Section 11: log.md#s1-2026-09-26, Section 1: SHIPPED.md#scope-reconciliation, Section 2: SHIPPED.md#verification, Section 3: SHIPPED.md#audit, Section 4: SHIPPED.md#no-gos-honored, Section 5: SHIPPED.md#rabbit-holes-and-deviations (+4 more)

### Community 167 - "Changelog"
Cohesion: 0.09
Nodes (23): [1.0.0] - 2026-09-23, [1.2.0] - 2026-09-23, [2.16.0] - 2026-10-08, [2.19.0] - 2026-10-08, [2.19.1] - 2026-10-08, [2.28.0] - 2026-10-16, [2.31.0] - 2026-10-17, [2.31.3] - 2026-10-18 (+15 more)

### Community 168 - "standalone"
Cohesion: 0.25
Nodes (8): standalone(), Process relations in the graph, Consequences for the rollout, Open inputs the rollout must close before bet, Rollout input: connected-memory-consolidation work, What is being built and what each project receives, P1-S4 — Graphify integration, 6. Acceptance scenarios

### Community 170 - "Codex Orca coordinator parity: retained source evidence"
Cohesion: 0.20
Nodes (10): Audit method and attribution, Codex Orca coordinator parity: retained source evidence, Coverage and guard lessons, Findings and dispositions, Historical discrepancies and durable drift, Host and bootstrap limits, Knowledge and followups, Per-review evidence limits (+2 more)

### Community 171 - "add-skill.test.mts"
Cohesion: 0.07
Nodes (35): afterWrite(), captureDeps(), commit(), { context, digest, json, snapshot, readRegistry, transact, recover, resolveFile }, files(), walk(), fixture(), git() (+27 more)

### Community 172 - ".claude/skills/bundle-sync/SKILL.md"
Cohesion: 0.15
Nodes (8): Bundle Sync, Instrumentation and shared adapters, Module and adapter decisions, Parity and discovery evidence, Scope and historical limits, Source-review supplement: ts-runtime-injection, Upgrade and audit lessons, ts-runtime-injection

### Community 173 - "Issue: Title"
Cohesion: 0.25
Nodes (7): Issue: Title, Prevention, Related, Root Cause, Solution, Summary, Symptoms

### Community 174 - "Pattern: Title"
Cohesion: 0.25
Nodes (7): Examples in Codebase, Pattern: Title, Related Patterns, Summary, The Pattern, When NOT to Use, When to Use

### Community 175 - ".claude/agents/cross-pitch-conflict-checker.md"
Cohesion: 0.17
Nodes (8): Constraints, Inputs (provided by dispatcher), Output structure, Process, Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 176 - "/search — Search Project Knowledge"
Cohesion: 0.22
Nodes (9): Date filter (`since:`), Decision filter (`decision:`), Error filter (`error:`), Important Rules, /search — Search Project Knowledge, Search Tips, Special Filters, Usage Patterns (+1 more)

### Community 177 - ".project/knowledge/decisions/profile-detection-lives-in-frontmatter-not-in-the-model-id.md"
Cohesion: 0.28
Nodes (8): Alternatives Considered, Consequences, Decision, Decision: Agent profile detection lives in frontmatter, not in the model id, Negative, Positive, Status, When to Revisit

### Community 178 - "Compaction record: ts-runtime-injection"
Cohesion: 0.25
Nodes (8): Compaction record: ts-runtime-injection, Section 1: SHIPPED.md#final-verification, Section 2: SHIPPED.md#reconciliation, Section 3: SHIPPED.md#audit, Section 4: SHIPPED.md#no-gos-honored, Section 5: SHIPPED.md#followups, Section 6: pitch.md#no-gos, Section 7: pitch.md#rabbit-holes

### Community 179 - "Decision Title"
Cohesion: 0.29
Nodes (6): Consequences, Context, Decision, Decision Title, References, Summary

### Community 180 - "Pitch: {slug}"
Cohesion: 0.22
Nodes (8): Bet decision, Critique findings (auto-populated by /critique for big-batch + AI scopes), Knowledge consulted, No-gos (this pitch), Pitch: {slug}, Problem, Rabbit holes, Solution sketch (breadboard, NOT wireframe)

### Community 181 - "Steps"
Cohesion: 0.12
Nodes (15): 1. Understand the UI requirement, 2. Load design rules, 3. Design component hierarchy, 4. ASCII wireframe (for complex layouts), 5. Generate component skeletons, 6. Generate i18n key list (if applicable), 7. Self-validate each generated file, 8. Present for approval (+7 more)

### Community 182 - "Decision: workflow-tooling pitches share the same no-gos, and the installer's design answers stand"
Cohesion: 0.05
Nodes (46): Consequences, Context, Decision, Decision: caveman brevity mode is the default for every skill, agent, and session, Related, Consequences, Decision, Decision: `/shape-lite` is a compressed variant of `/shape` that escalates mechanically (+38 more)

### Community 183 - "Instance-managed skills"
Cohesion: 0.25
Nodes (8): All vendors available in the project, Bundle-sync migration (`skill-sync.mts`), Doctor and setup integration, Inspect, choose and install, Instance-managed skills, Lifecycle and recovery, Registry and source packages, Verification

### Community 184 - "legacy-upgrades/portable-skill-installation.md"
Cohesion: 0.08
Nodes (20): Add Skill, Add Skill, Bundle default skills, Guardrails, Install flow, Lifecycle, When to use, Add Skill (+12 more)

### Community 185 - "Phase 2: Build"
Cohesion: 0.13
Nodes (15): Adaptive gate, Bug-fix variant, Confirmation gate (when the overview's `/build end` row says gated: big-batch, bug-fix, hotfix), Inline UX 5-question check (UI scopes only), log.md and deviations.md discipline, Output, Parallel subagents, Per-scope inner loop (+7 more)

### Community 186 - "Rule: every canonical-file edit ships its Cursor byte-copy regen in the same commit"
Cohesion: 0.14
Nodes (12): Exemptions, Related, Rule: every canonical-file edit ships its Cursor byte-copy regen in the same commit, The rule, Verification, When this rule does NOT apply, Why this rule exists, agent (+4 more)

### Community 187 - "Pattern: Warn text patches need their own test assertion"
Cohesion: 0.25
Nodes (8): Examples in Codebase, Pattern: Warn text patches need their own test assertion, Related Patterns, Summary, The Pattern, What happened, When NOT to Use, When to Use

### Community 188 - "pitch-archive.test.mts"
Cohesion: 0.26
Nodes (14): overlayKnowledge(), renderIndex(), commitFixtureLedger(), editLedger(), fixture(), keepV2(), killMidTransaction(), placeLedger() (+6 more)

### Community 189 - "Source-review supplement: instruction-compression"
Cohesion: 0.13
Nodes (15): Baseline experiment and S1 amendment, Delivered scope, Historical contradictions, Native observation and measurements, No-gos, rabbit holes and limits, Open items, Operational lessons, Plan, boundary and exit contract (+7 more)

### Community 190 - "Source-review supplement: state-deep-evidence"
Cohesion: 0.12
Nodes (16): Audit and owner decisions, Audit chronology, Build deviations, Build log highlights, Critique rulings, Design decisions, Historical contradictions, Knowledge and followups (+8 more)

### Community 191 - "legacy-upgrade.test.mts"
Cohesion: 0.14
Nodes (16): MAX_LEGACY_SCAN_BYTES, MAX_RECEIPT_BYTES, applyDeps, approvalOptions, approvedFixture(), base, driftFixture(), fixture (+8 more)

### Community 192 - "Source-review supplement: unified-toon-config"
Cohesion: 0.10
Nodes (26): Naming Convention, describe(), safeCode(), errorCode(), oexLock(), registerCoordinatorValidator(), registerEngineValidator(), registerIntegrationValidator() (+18 more)

### Community 193 - "Source-review supplement: fix-instruction-conflicts"
Cohesion: 0.25
Nodes (8): Findings and owners, Historical limits, Knowledge and durable owners, No-gos, Review chronology, Source-review supplement: fix-instruction-conflicts, Validation pass, Verification and evidence

### Community 194 - "Compaction record: readme-split"
Cohesion: 0.12
Nodes (14): Audit evidence and exclusions, Checker limits and review provenance, Documentation ownership, Source-review supplement: readme-split, Compaction record: readme-split, Section 1: SHIPPED.md#final-verification, Section 2: SHIPPED.md#reconciliation, Section 3: SHIPPED.md#no-gos-honored (+6 more)

### Community 195 - "State report"
Cohesion: 0.29
Nodes (7): Facts contract (`schemaVersion: 1`), Failure modes, How it is run here, Pinned Archify, Related, Run it, State report

### Community 196 - "token-consumption.ts"
Cohesion: 0.15
Nodes (18): hook(), recordCapture(), recordCompletion(), recordSkillUse(), subscribe(), tokenConsumptionV1(), tokenConsumptionV2(), V1BusEvent (+10 more)

### Community 197 - "transcript-usage.mts"
Cohesion: 0.19
Nodes (15): TranscriptRead, admit(), claudeProjects(), count(), field(), isObject(), MessageUsage, parse() (+7 more)

### Community 198 - "Decision Title"
Cohesion: 0.29
Nodes (6): Consequences, Context, Decision, Decision Title, References, Summary

### Community 199 - "Activities (in order)"
Cohesion: 0.22
Nodes (9): 1. Knowledge gate (mandatory, FIRST), 2. Set boundaries, 3. Breadboard (not wireframe), 4. Address rabbit holes, 5. Write no-gos, 6. /critique (auto for big-batch + AI-prompt scopes), 7. Bet decision (three outcomes), Activities (in order) (+1 more)

### Community 200 - "reportShape"
Cohesion: 0.33
Nodes (6): loadReport(), object(), parse(), readBounded(), reportShape(), Review rounds

### Community 201 - "Lossless projection in replace-style upserts"
Cohesion: 0.33
Nodes (5): Anti-pattern, Data Modeling Rules, Lossless projection in replace-style upserts, Three safe options (in preference order), Why this matters

### Community 202 - ".claude/agents/eval-runner.md"
Cohesion: 0.14
Nodes (10): Constraints, Gates, Inputs (provided by dispatcher), Output structure, Process, Constraints, Gates, Inputs (provided by dispatcher) (+2 more)

### Community 203 - "Optional Orca vendor policy"
Cohesion: 0.20
Nodes (12): claude(), Automatic start (every workflow phase), CLI, grader and live-smoke status, Codex startup and coordinator preparation, Contract check, Explicit runtime inspection, Inspect without execution, `integrations.orca` in `ai-workflow.toon` (schemaVersion 3) (+4 more)

### Community 204 - "orca-apply.test.mts"
Cohesion: 0.14
Nodes (13): BASE, deps, Entry, failSecondWrite(), GIT_ENV, makeRepo(), patchFrom(), put() (+5 more)

### Community 205 - ".claude/agents/test-coverage-checker.md"
Cohesion: 0.17
Nodes (8): Constraints, Inputs (provided by dispatcher), Output structure, Process, Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 206 - ".project/knowledge/patterns/a-grader-reports-executed-and-unexecuted-cases-separately.md"
Cohesion: 0.05
Nodes (35): Evidence, Pattern: a grader reports executed and unexecuted cases separately, Summary, The Pattern, How to apply, Pattern: a parenthetical example in a model instruction acts as a rule, so test it on the case it names, Summary, What happened (+27 more)

### Community 207 - "Done Work"
Cohesion: 0.29
Nodes (7): archify-replaces-state — shipped 2026-11-23, connected-memory-consolidation — shipped 2026-10-23, Done Work, fix-retired-live-evidence-path — shipped 2026-10-23, orca-api-currency-and-opencode2 — shipped 2026-11-23, orca-bounded-control-receipts — shipped 2026-11-23, Shipped index (generated)

### Community 208 - "flow-join.test.mts"
Cohesion: 0.12
Nodes (27): entries(), FlowReport, guard(), isDate(), isObj(), label(), Loaded, nullableStamp() (+19 more)

### Community 209 - "Issue: A prose skill instruction referenced a CLI flag as if invocation arguments were already a clean single value, but they are free-form text"
Cohesion: 0.12
Nodes (18): Browser runtime, Bundle default skills, Caveman mode, Compress guard, Coverage: every skill and every agent, Existing projects (upgrading from an older bundle version), Token-usage attribution, Verification (+10 more)

### Community 210 - ".claude/skills/dependency-security/SKILL.md"
Cohesion: 0.13
Nodes (11): Dependency Security, After Approved Remediation, Dependency Security, Output, Procedure, Safety Rules, After Approved Remediation, Dependency Security (+3 more)

### Community 212 - ".claude/agents/eval-regression-projector.md"
Cohesion: 0.17
Nodes (8): Constraints, Inputs (provided by dispatcher), Output structure, Process, Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 213 - "Architectural Boundaries"
Cohesion: 0.15
Nodes (13): App-local code (routes, screens, UI), Architectural Boundaries, Backend, Checklist, Dependency Placement, Dependency Rule, Purpose, Refactor Triggers (+5 more)

### Community 214 - "Build Error Resolver"
Cohesion: 0.15
Nodes (12): 1. Collect All Errors, 2. Fix Strategy (MINIMAL CHANGES), 3. Common Fixes, Build Error Resolver, Core Responsibilities, Diagnostic Commands, DO and DON'T, Priority Levels (+4 more)

### Community 215 - ".claude/skills/shape-lite/SKILL.md"
Cohesion: 0.07
Nodes (21): shape-lite, Constraints, Inputs (provided by dispatcher), Output structure, Process, Arguments, Guardrails, Shape Lite (+13 more)

### Community 216 - "Pitch: package-less-ship-verification"
Cohesion: 0.22
Nodes (8): Bet decision, Critique findings, Knowledge consulted, No-gos (this pitch), Pitch: package-less-ship-verification, Problem, Rabbit holes, Solution sketch (breadboard)

### Community 217 - "orca-start.mts"
Cohesion: 0.06
Nodes (61): blockedLine(), leadingPhase(), main(), object(), ObjectValue, PHASES, rootArgument(), prompt() (+53 more)

### Community 220 - ".claude/skills/changelog/SKILL.md"
Cohesion: 0.15
Nodes (9): Changelog, Changelog, How to run it, What it writes, When to run it, Changelog, How to run it, What it writes (+1 more)

### Community 221 - "makeSync"
Cohesion: 0.23
Nodes (22): argValue(), codeOf(), commandFailure(), main(), makeSync(), applyEntry(), assertNoSymlinkPath(), compareDir() (+14 more)

### Community 222 - ".claude/skills/switch/SKILL.md"
Cohesion: 0.18
Nodes (7): switch, Parallel pitches, Steps, /switch — Switch Pitches, Parallel pitches, Steps, /switch — Switch Pitches

### Community 224 - "setup-validator.mts"
Cohesion: 0.11
Nodes (14): Setup Validator, MAX_LEDGER_BYTES, CONFIG_FILE, CheckResult, CheckRun, ClaudeEntry, CursorReport, defaultLibs (+6 more)

### Community 225 - "Pitch: connected-memory-consolidation"
Cohesion: 0.22
Nodes (8): Amendment (2026-10-21, human at /plan Revise), Bet decision, Critique findings, Knowledge consulted, No-gos, Pitch: connected-memory-consolidation, Problem, Solution sketch (breadboard)

### Community 226 - ".claude/agents/cross-pitch-projector.md"
Cohesion: 0.17
Nodes (8): Constraints, Inputs (provided by dispatcher), Output structure, Process, Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 227 - "Shipped: connected-process-graph"
Cohesion: 0.25
Nodes (8): Approval and closure, Audit acceptance, Deviations, no-gos and rabbit holes, Knowledge, followups and documentation, Ownership and release attribution, Scope reconciliation, Shipped: connected-process-graph, Verification and its limits

### Community 228 - "Exit criteria per scope (machine-checkable, ≥1 per scope)"
Cohesion: 0.13
Nodes (15): consolidation(), Exit criteria per scope (machine-checkable, ≥1 per scope), P1-S1 — Relations manifest reader + validator, P1-S2 — Derived path-reference edges, P1-S3 — Populate `relations.toon`, P1-S5 — Acceptance, docs, release record, P2a-S3 — Decision `status` / `supersedes`, P2a-S5 — Generated `done-work.md` index (+7 more)

### Community 229 - ".claude/agents/architect.md"
Cohesion: 0.04
Nodes (38): fix, 1. Current State Analysis, 1. Modularity & Separation of Concerns, 2. Requirements Gathering, 2. Scalability, 3. Design Proposal, 3. Maintainability, 4. Security (+30 more)

### Community 230 - "Shipped: consolidation-schemas"
Cohesion: 0.25
Nodes (8): Approval and closure, Audit acceptance, Deviations, no-gos and rabbit holes, Knowledge, followups and documentation, Ownership and release attribution, Scope reconciliation, Shipped: consolidation-schemas, Verification and its limits

### Community 232 - "Shipped: installed-sync"
Cohesion: 0.25
Nodes (8): Approval and closure, Audit acceptance, Deviations, no-gos and rabbit holes, Knowledge, followups and documentation, Ownership and release attribution, Scope reconciliation, Shipped: installed-sync, Verification and its limits

### Community 233 - "Phase 0: Shape"
Cohesion: 0.29
Nodes (7): Confirmation gate, Lite variant, Output, Phase 0: Shape, Purpose, Transition, Trigger

### Community 234 - "decision"
Cohesion: 0.33
Nodes (6): decision(), Ledger version 2 (the authoring format), Step 2 — Build the coverage ledger (real extraction work, not a script), Ledger version 2 (the authoring format), Step 2 — Build the coverage ledger (real extraction work, not a script), P2a-S1 — Ledger v2 commit + dual-read

### Community 235 - "Entity: Graphify (knowledge-graph front end)"
Cohesion: 0.20
Nodes (10): Dispatch core (opt-in, library only), Dependencies, Entity: Graphify (knowledge-graph front end), Interactions, Key APIs, Location, Notes, Responsibilities (+2 more)

### Community 237 - "Source-review supplement: token-time-report"
Cohesion: 0.15
Nodes (13): Audit evidence and limits, Audit triage, Build and Orca history, Cohesive module exceptions, Design decisions, Historical contradictions, Lessons and open items, Release and recovery records (+5 more)

### Community 238 - ".project/knowledge/issues/a-headless-cli-follows-pwd-not-the-process-cwd.md"
Cohesion: 0.06
Nodes (31): Issue: a headless CLI can work in the wrong directory even when the process cwd is right, Prevention, Solution, Summary, Issue: a `node --test` child started from inside a test inherits `NODE_TEST_CONTEXT`, Also seen, Fix, Issue: a scratch copy that cannot load the suite makes three reviewers return INCOMPLETE (+23 more)

### Community 239 - "Workflow variants"
Cohesion: 0.33
Nodes (6): Big-batch feature (full pipeline), Bug fix, Hotfix, Lite shape (small task or user rejection), Small-batch feature (light pipeline, fewer gates), Workflow variants

### Community 240 - "Critique"
Cohesion: 0.33
Nodes (6): Critique, Disposition (advisory, not gating), Output, Perspective subagents (parallel fan-out), Transition, When to use

### Community 242 - "Testing"
Cohesion: 0.40
Nodes (5): Full and partial runs, Measured speed (2026-10-21, full suite, 75 files), Options, Testing, Why some tests stay slow

### Community 243 - "Step 2: Generate Documents"
Cohesion: 0.33
Nodes (6): `AGENTS.md` project specifics (project root), `CLAUDE.md` (required project root mirror), `.project/context/architecture.md`, `.project/context/product.md`, `.project/context/stack.md`, Step 2: Generate Documents

### Community 244 - "Bundle Sync"
Cohesion: 0.29
Nodes (7): Bundle Sync, Next steps (what a sync cannot do for the project), Step 1 — Dry run, Step 2 — Gate, Step 3 — Apply (only after approval), Step 4 — Verify, What it compares

### Community 245 - "Step 2: Generate Documents"
Cohesion: 0.33
Nodes (6): `AGENTS.md` project specifics (project root), `CLAUDE.md` (required project root mirror), `.project/context/architecture.md`, `.project/context/product.md`, `.project/context/stack.md`, Step 2: Generate Documents

### Community 246 - "workflow-capture.mts"
Cohesion: 0.08
Nodes (43): Activity, AgentKind, argumentsOf(), boundedText(), capture(), CAPTURE_MESSAGES, CaptureEvent, CaptureResolver (+35 more)

### Community 247 - "pitch-compress.mts"
Cohesion: 0.06
Nodes (75): accountFiles(), bodyHashOf(), groupHashOf(), isGroupPath(), AcceptedGap, assertPlainPath(), buildLedger(), checkDestination() (+67 more)

### Community 248 - "Compaction record: orca-vendor-dispatch"
Cohesion: 0.13
Nodes (13): Audit and historical limits, Runtime receipts and ownership, Scope and source discrepancies, Source-review supplement: orca-vendor-dispatch, Compaction record: orca-vendor-dispatch, Section 1: SHIPPED.md#final-verification, Section 2: SHIPPED.md#reconciliation, Section 3: SHIPPED.md#audit (+5 more)

### Community 249 - "validateReport"
Cohesion: 0.36
Nodes (8): criteriaOf(), fixture(), problemsAfter(), sha(), validateReport(), vectorSha(), dataset(), Audit and verification history

### Community 250 - "Shape"
Cohesion: 0.25
Nodes (7): Activities (in order), AI-prompt scopes (extra discipline), Confirmation gate, Output, Shape, Transition, When to use

### Community 251 - "workflow-contracts.test.mts"
Cohesion: 0.32
Nodes (5): auditRequirements(), buildRequirements(), { fs, path }, read(), ROOT

### Community 252 - "Runs"
Cohesion: 0.50
Nodes (3): Runs, Structure, Who writes here

### Community 253 - "Ship knowledge extraction and incident triage"
Cohesion: 0.40
Nodes (4): Incident dispositions, Knowledge ownership and promotion review, Read accounting, Ship knowledge extraction and incident triage

### Community 254 - "Phase 5: Cooldown"
Cohesion: 0.06
Nodes (27): Cooldown, 1. Knowledge health audit, 2. Issue → pattern → rule promotion, 3. Parked pitches review, 4. Followups triage, 5. Output: cooldown report, 6. User approval gate, Activities (in order) (+19 more)

### Community 255 - "checkAgent"
Cohesion: 0.21
Nodes (13): checkAgent(), extractAgentProfile(), What happened, Audit chronology, Build decisions and incidents, Follow-ups and historical limits, Historical contradictions, Knowledge and lessons (+5 more)

### Community 258 - "Rollout readiness: workflow-v3-rollout"
Cohesion: 0.25
Nodes (7): Bundle fixes found by this run (applied), Per-project steps for the PR, Resolved after this run (2026-10-17, same day), Results, Rollout readiness: workflow-v3-rollout, Rollout step added, Still open (flagged)

### Community 259 - "orca-diff-admit.test.mts"
Cohesion: 0.08
Nodes (16): addCollision(), admitChecked(), AdmitResult, applyToBaseline(), Entry, Fixture, git(), SETUP_ENV (+8 more)

### Community 260 - "AGENTS.md"
Cohesion: 0.13
Nodes (13): Architecture, Codex Orca coordination, Confirmation gate (always), Guardrails, Product, Project Records, Project specifics, Response style (caveman mode) (+5 more)

### Community 262 - "Collector robustness: retained implementation history"
Cohesion: 0.25
Nodes (8): Audit findings and method, Collector robustness: retained implementation history, Confidence and followups, Delivered contract, Identity and migration, Retired lock and planning contradictions, Source-review findings, Verification chronology

### Community 264 - "post-edit-check.mts"
Cohesion: 0.20
Nodes (11): check(), fileUrl(), loadTypescript(), main(), Plain, resolveMain(), Fake, projectWithTypescript() (+3 more)

### Community 266 - "Eval Workflow"
Cohesion: 0.40
Nodes (5): 1. Define (Before Coding), 2. Implement, 3. Evaluate, 4. Report, Eval Workflow

### Community 267 - "createNodeDeps"
Cohesion: 0.08
Nodes (35): defaultDeps(), anchorsOf(), BrokenLink, checkLinks(), collect(), defaultDeps(), LinkReport, linksOf() (+27 more)

### Community 268 - "Eval Workflow"
Cohesion: 0.40
Nodes (5): 1. Define (Before Coding), 2. Implement, 3. Evaluate, 4. Report, Eval Workflow

### Community 269 - "flow-render.mts"
Cohesion: 0.13
Nodes (26): FLOW_LIMITS, FlowNode, TokenCell, Cellish, checked(), FILE_NAMES, flatten(), GENERATOR (+18 more)

### Community 270 - "Version Log & Bundle Sync"
Cohesion: 0.40
Nodes (5): Consolidation scaffold migration, Large pitch folders, Per-pitch legacy upgrades, Upgrade from JavaScript entry files, Version Log & Bundle Sync

### Community 271 - "Architecture Context"
Cohesion: 0.25
Nodes (7): Architecture Context, Data Flow, Integrations, Layout, Optional Orca policy diagnostics, Overview, Project Records

### Community 272 - "SETUP — Portable AI Development Workflow"
Cohesion: 0.11
Nodes (17): 2a — Claude Code, 2b — OpenCode, 2c — Codex, 2d — Cursor, 2e — Other CLI agents, Guardrails (apply during setup and after), SETUP — Portable AI Development Workflow, Step 0 — Orient (+9 more)

### Community 273 - "Shape"
Cohesion: 0.29
Nodes (7): Activities (in order), AI-prompt scopes (extra discipline), Confirmation gate, Output, Shape, Transition, When to use

### Community 274 - "Pitch: review-bench-hardening"
Cohesion: 0.22
Nodes (8): Bet decision, Critique findings, Knowledge consulted, No-gos (this pitch), Pitch: review-bench-hardening, Problem, Rabbit holes, Solution sketch (breadboard)

### Community 275 - "Project state report: retained source detail"
Cohesion: 0.22
Nodes (9): Audit cycle 1, Audit cycle 2 and destructive-reader regression, Audit cycle 3 and final confidence, Build verification and test-caught defects, Followups, knowledge and later history, Project state report: retained source detail, Report contract and authorities, Scope, vendor requirements and no-gos (+1 more)

### Community 276 - "Decision: TOON subset grammar for `ai-workflow.toon`"
Cohesion: 0.40
Nodes (5): Decision: TOON subset grammar for `ai-workflow.toon`, Migration rule, Rejection modes, Spec version, Subset grammar

### Community 278 - ".project/knowledge/issues/valid-outcome-records-can-lack-queryable-navigation.md"
Cohesion: 0.40
Nodes (4): Issue: lint-clean outcome records did not prove navigable retained content, Observation, Prevention, Resolution

### Community 279 - "Grader Types"
Cohesion: 0.50
Nodes (4): 1. Code-Based Grader, 2. Model-Based Grader, 3. Human Grader, Grader Types

### Community 280 - "Integration Patterns"
Cohesion: 0.50
Nodes (4): During Implementation, Integration Patterns, Post-Implementation, Pre-Implementation

### Community 281 - "_followups.md"
Cohesion: 0.04
Nodes (47): Context, Decision, Decision: one `ai-workflow.toon`, schemaVersion 2, Orca nested under `integrations.orca`, Fix, How to avoid, Issue: bumping `ai-workflow.toon` to schemaVersion 3 left `config-migrate` writing 2 and 98 tests red at HEAD, Summary, Fix and rule (+39 more)

### Community 282 - "Grader Types"
Cohesion: 0.50
Nodes (4): 1. Code-Based Grader, 2. Model-Based Grader, 3. Human Grader, Grader Types

### Community 283 - "Integration Patterns"
Cohesion: 0.50
Nodes (4): During Implementation, Integration Patterns, Post-Implementation, Pre-Implementation

### Community 284 - "Exit criteria per scope (machine-checkable, ≥1 per scope)"
Cohesion: 0.40
Nodes (5): Exit criteria per scope (machine-checkable, ≥1 per scope), S0 — Enable Orca policy, S1 — Snapshot: structure + base/project skills, S2 — Multipage render + staged atomic write, S3 — Docs, skill mirrors, changelog

### Community 287 - "skill-compress-guard.test.mts"
Cohesion: 0.21
Nodes (8): canCompress(), CompressVerdict, defaultDeps(), PROTECTED_DIRS, pythonAvailable(), resolveReal(), testDeps, Examples in Codebase

### Community 289 - "Critique"
Cohesion: 0.29
Nodes (6): Critique, Disposition (advisory, not gating), Output, Perspective subagents (parallel fan-out), Transition, When to use

### Community 290 - "consolidation-migrate.mts"
Cohesion: 0.07
Nodes (46): Change, ensureDirectory(), errorCode(), inspect(), legacyInventory(), main(), MAX_MIGRATION_FILES, MAX_TEMPLATE_BYTES (+38 more)

### Community 291 - "Pitch Compress"
Cohesion: 0.20
Nodes (10): Keep a pitch small while it is built, Pitch Compress, Restore, Step 1 — Inventory, Step 3 — Write done-work.md, Step 4 — Archive (recovery, before anything is removed), Step 5 — Gate, Step 6 — Remove (only after approval) (+2 more)

### Community 292 - "/search — Search Project Knowledge"
Cohesion: 0.14
Nodes (10): search, Date filter (`since:`), Decision filter (`decision:`), Error filter (`error:`), Important Rules, /search — Search Project Knowledge, Search Tips, Special Filters (+2 more)

### Community 294 - ".project/status.md"
Cohesion: 0.07
Nodes (18): checkpoint, resume, /checkpoint — Save Pitch Progress, Steps, /resume — Resume a Pitch, Steps, /checkpoint — Save Pitch Progress, Steps (+10 more)

### Community 297 - "Source-review supplement: state-report-redesign"
Cohesion: 0.13
Nodes (15): What was dropped from the old report, esc(), tokens(), state-report-redesign leftovers (2026-10-19), What shipped, Must-fix (blocks /ship), Audit triage, Contract and docs (+7 more)

### Community 306 - "entry-import.mts"
Cohesion: 0.28
Nodes (8): defaultDeps(), effectiveEntryText(), EntryKind, EntryResolution, outsideCode(), resolveClaudeEntry(), Symptom, shape-lite followups — 2026-10-07

### Community 309 - "harnesses.md"
Cohesion: 0.11
Nodes (16): Examples in Codebase, Pattern: Mandatory config files emit one top-level failure, not N per-consumer failures, Related Patterns, Summary, The Pattern, When NOT to Use, When to Use, Examples in Codebase (+8 more)

### Community 310 - "Metrics report dimensions: retained source detail"
Cohesion: 0.22
Nodes (9): Audit cycle 1, Audit cycle 2, Behavior and schema contract, Constraints and bounds, Followups, lessons and later history, Metrics report dimensions: retained source detail, Payload spike and async correction, Scope execution and deviations (+1 more)

### Community 312 - ".claude/agents/knowledge-historian.md"
Cohesion: 0.17
Nodes (8): Constraints, Inputs (provided by dispatcher), Output structure, Process, Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 332 - "Live runs: state-ai-authoring"
Cohesion: 0.40
Nodes (4): rejected(), Grading (S9, 2026-10-20), Harness, Live runs: state-ai-authoring

### Community 333 - "hooks"
Cohesion: 0.15
Nodes (12): _comment, hooks, PostToolUse, PreToolUse, SessionEnd, SessionStart, Stop, SubagentStart (+4 more)

### Community 340 - "knowledge"
Cohesion: 0.14
Nodes (14): Knowledge Graph, knowledge(), outcome(), Step 5b: Build the Knowledge Graph, Step 5b: Build the Knowledge Graph, Decisions (20 entries, 20 accepted, 0 superseded, 0 deprecated), Entities (2 entries), Graph (+6 more)

### Community 346 - "Track ship records: connected-memory-consolidation"
Cohesion: 0.29
Nodes (7): Approval receipt (p1.approved.toon), Approval receipt (p2a.approved.toon), Approval receipt (p2d.approved.toon), P1 connected-process-graph, P2a consolidation-schemas, P2d installed-sync, Track ship records: connected-memory-consolidation

### Community 347 - ".project/knowledge/decisions/effective-sync-bases-and-bounded-font-discovery.md"
Cohesion: 0.11
Nodes (15): Consequences, Decision, Decision: Effective sync bases and bounded font discovery, References, Summary, Audit context, Effective-base contract and boundaries, Source-review supplement: bundle-sync-marker-fix (+7 more)

### Community 348 - "Source-review supplement: shape-lite"
Cohesion: 0.33
Nodes (6): Audit and review chronology, Build decisions and deviations, Historical limits, Release and deliverables, Scope and limits, Source-review supplement: shape-lite

### Community 352 - "Source-review supplement: orca-engines-range"
Cohesion: 0.29
Nodes (7): Followups, Historical verification, Limits and no-gos, Problem and design, Scopes and behavior, Source-review supplement: orca-engines-range, Upgrade note

### Community 353 - "Portable AI Development Workflow"
Cohesion: 0.33
Nodes (6): Choose the script runtime, Concepts (read this first), Documentation, Orca mode (multi-agent), Portable AI Development Workflow, Set up

### Community 355 - ".claude/skills/ship/SKILL.md"
Cohesion: 0.11
Nodes (15): Ship, Activities (in order), Confirmation gate, Optional Orca multi-agent (off by default), Output, Ship, Transition, When to use (+7 more)

### Community 358 - "checkProjectScaffold"
Cohesion: 0.60
Nodes (5): checkProjectScaffold(), copyMissing(), isSafeProjectPath(), statOrNull(), templatePaths()

### Community 360 - "Steps"
Cohesion: 0.06
Nodes (27): knowledge-health, 1. Inventory all knowledge entries, 2. Check for staleness, 3. Check usage (pattern references), 4. Issue-to-Rule Promotion Check, 5. Cross-reference validation, 6. Tag coverage, 7. Generate recommendations (+19 more)

### Community 361 - ".claude/skills/setup/SKILL.md"
Cohesion: 0.07
Nodes (22): setup, Active pitches, /cooldown due in: 5 ships, Followups backlog, Open rabbit holes across active pitches, Parked pitches, Recent ships (last 5), Status (+14 more)

### Community 365 - "index.md"
Cohesion: 0.07
Nodes (37): Consequences, Context, Decision: the OpenCode `--agent` id is read from the host's installed agents, never guessed from a version, Summary, Why not the alternatives, Fix, Issue: a `failedStage` that was not a string read as "no failed stage", so an empty residual list looked cleanly retryable, Lesson (+29 more)

### Community 370 - "Plan: connected-memory-consolidation"
Cohesion: 0.14
Nodes (14): Baseline drift found at plan time (supersedes `shaping-evidence.md` numbers), Downstream rollout, Living-spec deviations log, P2c-S1 preparation contract and test strategy (2026-10-22), P2c-S2 evidence and recovery contract (2026-10-22), P2c-S3 live navigation repair (2026-10-22), P2d-S1 implementation and test strategy (2026-10-22), P2d-S2 implementation and test strategy (2026-10-22) (+6 more)

### Community 374 - "Shipped: connected-memory-consolidation"
Cohesion: 0.40
Nodes (5): Approval and closure, Exceptions and open items carried forward (none waived silently), Followups and what stays un-bet, Shipped: connected-memory-consolidation, Track receipts

### Community 383 - "stack.md"
Cohesion: 0.05
Nodes (25): test-strategy, ui-design, AI Language Behavior (if applicable), Hardcoded Copy Policy, Internationalization (i18n) Rules, Key Design, Locale Strategy, Message File Structure (+17 more)

### Community 386 - ".project/knowledge/decisions/project-state-report-design.md"
Cohesion: 0.03
Nodes (70): State, Reports, Structure, Consequences, Context, Decision, Decision: `/state` is a fact collector plus the pinned Archify skill, not a bundled renderer, Delivered scopes, no-gos and rabbit holes (kept when the pitch folder was compacted, 2026-11-23) (+62 more)

### Community 391 - "Audit cycle 2 — connected-memory-consolidation"
Cohesion: 0.50
Nodes (4): audit-cycle-2, Audit cycle 2 — connected-memory-consolidation, Must-fix, Should-fix (all fixed, each with a test)

### Community 398 - "Bundle Sync"
Cohesion: 0.29
Nodes (7): Bundle Sync, Next steps (what a sync cannot do for the project), Step 1 — Dry run, Step 2 — Gate, Step 3 — Apply (only after approval), Step 4 — Verify, What it compares

### Community 400 - "Hill chart: {slug}"
Cohesion: 0.40
Nodes (4): Hill chart: {slug}, Hill positions reference, Positions, Stuck-uphill watch

### Community 402 - "Pitch: workflow-v3-rollout"
Cohesion: 0.22
Nodes (8): Amendment (2026-10-21), Bet decision, Knowledge consulted, No-gos (this pitch), Pitch: workflow-v3-rollout, Problem, Rabbit holes, Solution sketch (breadboard)

### Community 405 - "Portable skill defaults: retained design and verification"
Cohesion: 0.20
Nodes (10): Audit findings and closure, Binding drift review, D1 mode and catalog behavior, D2 attribution and compression guard, D3 browser readiness, Grounding decisions, Knowledge release and downstream limits, Portable skill defaults: retained design and verification (+2 more)

### Community 430 - "Pitch Compress"
Cohesion: 0.20
Nodes (10): Keep a pitch small while it is built, Pitch Compress, Restore, Step 1 — Inventory, Step 3 — Write done-work.md, Step 4 — Archive (recovery, before anything is removed), Step 5 — Gate, Step 6 — Remove (only after approval) (+2 more)

### Community 431 - "Shipped: legacy-upgrade"
Cohesion: 0.20
Nodes (10): Approval and closure, Approval receipt (p2c.approved.toon), Audit acceptance, Deviations, no-gos and rabbit holes, Knowledge, followups and documentation, Ownership and release attribution, P2c legacy-upgrade, Scope reconciliation (+2 more)

### Community 461 - ".claude/agents/appetite-auditor.md"
Cohesion: 0.17
Nodes (8): Constraints, Inputs (provided by dispatcher), Output structure, Process, Constraints, Inputs (provided by dispatcher), Output structure, Process

### Community 475 - "Hill chart: {slug}"
Cohesion: 0.40
Nodes (4): Hill chart: {slug}, Hill positions reference, Positions, Stuck-uphill watch

### Community 491 - "Closing criteria requiring an owner decision"
Cohesion: 0.33
Nodes (5): Closing criteria requiring an owner decision, Decision, Existing history collector reads recovery archives, Owner decision — 2026-10-23, Scenario-C retained bytes

### Community 492 - "4. Design recommendations"
Cohesion: 0.15
Nodes (12): 1. Is the "disconnected files" problem real?, 2. What already works (extend, do not replace), 3. What fails the brief, 4.1 Process connections (capability 1), 4.2 Where consolidation lives (capability 2), 4.3 Destinations and single ownership (capability 2), 4.4 Selective retention (capability 3), 4.5 Retirement and recovery (capability 4) (+4 more)

### Community 501 - "orca-apply.mts"
Cohesion: 0.10
Nodes (34): AdmittedEntry, applyAdmitted(), ApplyResult, ensureParents(), entryPaths(), ENV_ALLOWLIST, errorCode(), Fail (+26 more)

### Community 502 - "connected-memory-consolidation"
Cohesion: 0.15
Nodes (7): 2026-10-23 — umbrella closure approved and published, Closure log entry: connected-memory-consolidation, Remaining work: connected-memory-consolidation, baseline.mts, Measurement scripts: connected-memory-consolidation, precision.mts, connected-memory-consolidation

### Community 508 - "Workflow usage metrics"
Cohesion: 0.29
Nodes (7): Bounds and failures, Hook-to-event mapping (planned), Joined token/time report, Reading the evidence, Record and report, Time and flow, Workflow usage metrics

## Knowledge Gaps
- **3496 isolated node(s):** `TsDiagnostic`, `Plain`, `testDeps`, `$schema`, `plugin` (+3491 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 3867 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **102 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RuntimeDeps` connect `RuntimeDeps` to `skill-registry.mts`, `orca-evidence.mts`, `orca-dispatch.mts`, `orca-contract.mts`, `token-consumption.mts`, `pitch-archive.mts`, `Issue: a worker's environment differs from the coordinator's, and the first live smoke tests failed for that reason`, `workflow-metrics-report.mts`, `flow-report.test.mts`, `review-bench.mts`, `token-consumption.test.mts`, `graphify.mts`, `config-migrate.mts`, `workflow-metrics-state.mts`, `skill-vendors.test.mts`, `Source-review supplement: state-ai-authoring`, `runtime.test.mts`, `orca-diff-admit.mts`, `config.test.mts`, `workflow-doctor.mts`, `orca-eval-grader.test.mts`, `Codex handoff — start here`, `browser-runtime.test.mts`, `skill-defaults.mts`, `workflow-metrics-state.test.mts`, `review-bench.test.mts`, `orca-eval-grader.mts`, `flow-report.mts`, `skill-source.mts`, `config-migrate.test.mts`, `orca-run.mts`, `graphify-relations.mts`, `facts-gather.test.mts`, `orca-reconcile.mts`, `validate.test.mts`, `bundle-sync.mts`, `skill-defaults.test.mts`, `orca-start.test.mts`, `config.mts`, `spawnSync`, `migrate.mts`, `orca-preflight.mts`, `outcome-record.mts`, `node.mts`, `changelog.mts`, `orca-ledger.mts`, `stuck-uphill-detector.mts`, `pre-ship-verify.mts`, `types.mts`, `orca-run.test.mts`, `data-file.mts`, `skill-sync.mts`, `orca-dispatch.test.mts`, `orca-policy.mts`, `test-helpers.mts`, `.project/knowledge/patterns/a-gate-must-not-audit-its-own-instrument.md`, `add-skill.mts`, `workflow-doctor.test.mts`, `legacy-upgrade.mts`, `add-skill.test.mts`, `Compaction record: ts-runtime-injection`, `legacy-upgrade.test.mts`, `transcript-usage.mts`, `orca-apply.test.mts`, `flow-join.test.mts`, `orca-start.mts`, `setup-validator.mts`, `Entity: Graphify (knowledge-graph front end)`, `workflow-capture.mts`, `pitch-compress.mts`, `orca-diff-admit.test.mts`, `post-edit-check.mts`, `createNodeDeps`, `skill-compress-guard.test.mts`, `consolidation-migrate.mts`, `entry-import.mts`, `orca-apply.mts`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `RuntimeDeps` (e.g. with `Event contract` and `Boundary validator`) actually correct?**
  _`RuntimeDeps` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `TsDiagnostic`, `Plain`, `testDeps` to the rest of the system?**
  _3496 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `skill-registry.mts` be split into smaller, more focused modules?**
  _Cohesion score 0.06246799795186892 - nodes in this community are weakly interconnected._
- **Why does `Changelog` connect `Changelog` to `[2.36.0] - 2026-10-20`, `[2.7.0] - 2026-09-25`, `[2.31.5] - 2026-10-18`, `[2.37.1] - 2026-10-20`, `[2.41.0] - 2026-10-22`, `[2.12.0] - 2026-10-08`, `[2.13.0] - 2026-10-08`, `[2.17.0] - 2026-10-08`, `[2.50.1] - 2026-10-23`, `[2.8.4] - 2026-09-26`, `[2.24.0] - 2026-10-16`, `[2.20.0] - 2026-10-08`, `[1.1.0] - 2026-09-23`, `[2.31.4] - 2026-10-18`, `[2.15.0] - 2026-10-08`, `_followups.md`, `[2.30.1] - 2026-10-17`, `[2.49.0] - 2026-10-23`, `[2.48.1] - 2026-10-22`, `[2.26.0] - 2026-10-16`, `[2.34.0] - 2026-10-19`, `[2.0.1] - 2026-09-23`, `[2.11.0] - 2026-10-08`, `[2.18.0] - 2026-10-08`, `[2.46.0] - 2026-10-22`, `[2.50.2] - 2026-11-23`, `[2.6.0] - 2026-09-25`, `[2.8.1] - 2026-09-25`, `[2.37.0] - 2026-10-20`, `[2.45.1] - 2026-10-22`, `[2.35.0] - 2026-10-20`, `[2.18.1] - 2026-10-08`, `[2.40.0] - 2026-10-21`, `[2.8.3] - 2026-09-26`, `[2.48.0] - 2026-10-22`, `[2.22.0] - 2026-10-09`, `[2.22.3] - 2026-10-09`, `[2.50.0] - 2026-10-23`, `[2.43.0] - 2026-10-22`, `[2.45.0] - 2026-10-22`, `[2.22.5] - 2026-10-09`, `[2.5.0] - 2026-09-25`, `[2.27.0] - 2026-10-16`, `[2.31.8] - 2026-10-19`, `[2.43.1] - 2026-10-22`, `[2.22.4] - 2026-10-09`, `[2.47.0] - 2026-10-22`, `[2.9.0] - 2026-10-07`, `[2.11.1] - 2026-10-08`, `[2.14.0] - 2026-10-08`, `[2.14.1] - 2026-10-08`, `[2.10.0] - 2026-10-07`, `[2.16.1] - 2026-10-08`, `[2.31.1] - 2026-10-18`, `[2.31.2] - 2026-10-18`, `[2.42.0] - 2026-10-22`, `[2.44.0] - 2026-10-22`, `[2.9.1] - 2026-10-07`, `[2.4.0] - 2026-09-25`, `[2.22.2] - 2026-10-09`, `[2.50.3] - 2026-11-23`, `[2.8.0] - 2026-09-25`, `[2.8.2] - 2026-09-26`, `[2.20.1] - 2026-10-08`, `[2.30.0] - 2026-10-17`, `[2.51.0] - 2026-11-23`, `[2.8.6] - 2026-09-28`, `[2.16.2] - 2026-10-08`, `[2.1.0] - 2026-09-23`, `[2.21.0] - 2026-10-09`, `[2.29.0] - 2026-10-17`, `[2.2.0] - 2026-09-23`, `[2.31.7] - 2026-10-19`, `[2.35.1] - 2026-10-20`, `[2.47.1] - 2026-10-22`, `[2.52.0] - 2026-11-23`, `[2.25.0] - 2026-10-16`, `[2.0.0] - 2026-09-23`, `[1.1.1] - 2026-09-23`, `[2.23.0] - 2026-10-16`, `[2.15.1] - 2026-10-08`, `[2.22.1] - 2026-10-09`, `[2.38.0] - 2026-10-21`, `[2.3.0] - 2026-09-24`, `[2.32.1] - 2026-10-19`, `[1.2.1] - 2026-09-23`, `[2.32.0] - 2026-10-19`, `[2.39.0] - 2026-10-21`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createNodeDeps()` (e.g. with `readStdin()` and `Build decisions and deviations`) actually correct?**
  _`createNodeDeps()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `orca-evidence.mts` be split into smaller, more focused modules?**
  _Cohesion score 0.08244680851063829 - nodes in this community are weakly interconnected._