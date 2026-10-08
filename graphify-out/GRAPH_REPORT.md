# Graph Report - ai-workflow-portable  (2026-10-07)

## Corpus Check
- 416 files · ~297,822 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 24 file(s) not represented in the graph (top: .toml 17, (none) 6, .example 1)

## Summary
- 3868 nodes · 5776 edges · 367 communities (243 shown, 124 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 184 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `53bca034`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- skill-registry.mts
- node.mts
- pitch-archive.mts
- bindStateSnapshot
- token-report.mts
- review-bench.mts
- bundle-sync.mts
- token-consumption.mts
- Security Rules
- ref_node_assert
- ref_node_child_process
- main
- state-theme.mts
- docs-links.test.mts
- createNodeDeps
- Nielsen's 10 Usability Heuristics for Evaluation
- Component Architecture Patterns
- Instance-managed skills
- Context Management
- Coding Standards
- .claude/agents/architect.md
- .cursor/agents/architect.md
- graphify.mts
- setup-validator.mts
- Compaction record: independent-rereview-catch-up
- Plan: ts-runtime-injection
- FsDeps
- Followups
- Eval Harness Skill
- Eval Harness Skill
- state-html.test.mts
- add-skill.mts
- types.mts
- Observability Rules
- Performance Rules
- pitch-compress.mts
- orca-preflight.mts
- CI/CD & Deployment Rules
- orca-policy.mts
- bindStateRender
- skill-vendors.test.mts
- index.md
- bun.mts
- /search — Search Project Knowledge
- /setup — Project Setup & Context Generation
- /test-strategy — Smart Testing
- /search — Search Project Knowledge
- /setup — Project Setup & Context Generation
- /test-strategy — Smart Testing
- Pattern: Resolve the real path before matching it against a protected-directory list
- review-bench.test.mts
- token-consumption.test.mts
- orca-policy.test.mts
- full
- skill-source.mts
- browser-runtime.test.mts
- changelog.test.mts
- orca-preflight.test.mts
- RuntimeDeps
- Decision: workflow-tooling pitches share the same no-gos, and the installer's design answers stand
- Phase 3: Audit
- pre-ship-verify.mts
- bundle-sync.test.mts
- Shipped: ts-runtime-injection
- AI-Assisted Development Workflow
- Knowledge Graph
- Knowledge Graph
- normalizedEvent
- Model Routing Strategy
- requiredSections
- [1.0.0] - 2026-09-23
- Activities (in order)
- Phase 1: Plan
- Phase 2: Build
- Security Reviewer
- /sync — Sync Tasks with Notion
- Steps
- Security Reviewer
- /sync — Sync Tasks with Notion
- Steps
- Issue: A hook that fires at launch was counted as a completion, so async agents counted twice
- Issue: Matching entities by a bare `${id}-` prefix lets one entity resolve to another's
- Plan: orca-vendor-foundation
- AI Tool Use Constraints & Enforcement
- Phase 5: Cooldown
- /impact — Impact Analysis
- /impact — Impact Analysis
- AGENTS.md
- opencode-plugin.test.mts
- Architectural Boundaries
- PitchCompressApi
- Activities (in order)
- AGENTS.md
- Review Checklist
- Steps
- Review Checklist
- Steps
- Done Work
- Pattern: the tool that verifies independence must itself be independently verified
- recordEvent
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
- Plan: readme-split
- Compaction record: bundle-sync-marker-fix
- Compaction record: state-quoted-fonts
- stuck-uphill-detector.mts
- token-report.test.mts
- Eval Harness
- createPitchCompress
- Pattern: parse an untrusted value against a grammar and re-emit it from the parsed numbers
- Wireframe: [Feature Name]
- Wireframe: [Feature Name]
- Audit
- Audit
- Wireframe: [Feature Name]
- Wireframe: [Feature Name]
- Compaction record: native-safety-feasibility
- README.md
- Harness Integration Guide
- [2.12.0] - 2026-10-08
- Internationalization (i18n) Rules
- Testing Rules
- add-skill.test.mts
- ADR-NNNN: [Decision Title]
- Feature: [Feature Name]
- Pitch Compress
- Pitch Compress
- ADR-NNNN: [Decision Title]
- Feature: [Feature Name]
- SETUP — Portable AI Development Workflow
- versioning-and-sync.md
- State report
- Pitch: ts-runtime-injection
- Issue: A prose skill instruction referenced a CLI flag as if invocation arguments were already a clean single value, but they are free-form text
- [2.7.0] - 2026-09-25
- ref_node_test
- Shipped: orca-vendor-foundation
- Entity: Name
- Pitch: {slug}
- Plan: {slug}
- Bug: [Short Description]
- Plan
- Plan
- Entity: Name
- Pitch: orca-vendor-dispatch
- Pitch: orca-vendor-foundation
- Pitch: orca-vendor-orchestration
- Pitch: readme-split
- Pitch: {slug}
- Plan: {slug}
- Bug: [Short Description]
- upgrade.test.mts
- hooks
- Bundle default skills
- Pattern: Dual-hash tracking for content that gets transformed after fetch
- .rmSync
- Issue: Title
- Pattern: Title
- Status
- Changelog
- Shape
- Shape
- Architecture Context
- Knowledge Index
- Pattern: A safety gate must not accept the claims of whoever it is gating — and must re-check at the destructive step
- Issue: Title
- Pattern: Title
- Build log: orca-vendor-foundation
- Orca feasibility investigation
- Status
- Script runtime
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
- DirEntryLike
- Decision Title
- S1 completion evidence
- Optional Orca vendor policy
- Lossless projection in replace-style upserts
- .claude/agents/eval-runner.md
- Dependency Security
- /fix — Bug-Fix Entry
- .cursor/agents/eval-runner.md
- Dependency Security
- /fix — Bug-Fix Entry
- opencode.json
- Stack Context
- G7 migration evidence — 2026-10-07
- Audit cycles 1-2 — orca-vendor-foundation
- Deviations: orca-vendor-foundation
- S3 evidence — diagnostic integration and portable documentation
- Online feasibility verification
- G7 baseline and verification
- Baseline G9 (collector, security path), recorded before any edit on 2026-10-07
- Step 2 — Wire all harnesses
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
- Installed Orca verification
- Hill chart: {slug}
- Baseline G8 (hooks: pre-ship-verify, stuck-uphill-detector, post-edit-check), recorded before any edit on 2026-10-07
- Hill chart: ts-runtime-injection
- W2 verification
- Independent W2/G8 verification
- Portable AI Development Workflow
- Runs
- /switch — Switch Pitches
- /switch — Switch Pitches
- Hill chart: readme-split
- Build log: readme-split
- Baseline G3 (orca-policy, orca-preflight, docs-links)
- Reports
- /checkpoint — Save Pitch Progress
- /resume — Resume a Pitch
- /checkpoint — Save Pitch Progress
- /resume — Resume a Pitch
- Hill chart: orca-vendor-foundation
- Baseline (pre-change, 2026-10-07, Node v24.21.0, Bun 1.4.2)
- Baseline G1 (skill libraries), recorded before editing, 2026-10-07
- Baseline G2 (before migration, 2026-10-07)
- Baseline G4 (pre-change, 2026-10-07, Node v24.21.0, Bun 1.4.2)
- G5 baseline and migration evidence
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
- [1.2.1] - 2026-09-23
- [2.0.0] - 2026-09-23
- [2.0.1] - 2026-09-23
- [2.10.0] - 2026-10-07
- [2.11.0] - 2026-10-08
- [2.11.1] - 2026-10-08
- [2.1.0] - 2026-09-23
- [2.2.0] - 2026-09-23
- [2.3.0] - 2026-09-24
- [2.4.0] - 2026-09-25
- [2.5.0] - 2026-09-25
- [2.6.0] - 2026-09-25
- [2.8.1] - 2026-09-25
- [2.8.2] - 2026-09-26
- [2.8.3] - 2026-09-26
- [2.8.4] - 2026-09-26
- [2.8.5] - 2026-09-26
- [2.8.6] - 2026-09-28
- .claude/skills/setup-validator/SKILL.md
- .claude/skills/workflow-doctor/SKILL.md
- .cursor/skills/setup-validator/SKILL.md
- .cursor/skills/workflow-doctor/SKILL.md
- .project/context/README.md
- orca-vendor-orchestration/critique.md
- baseline-g1b.md
- baseline-g6.md
- ts-runtime-injection/checkpoint.md
- unfinished-pitches-assessment-2026-09-27.md
- .project/rules/README.md

## God Nodes (most connected - your core abstractions)
1. `createNodeDeps()` - 89 edges
2. `RuntimeDeps` - 88 edges
3. `createPitchCompress()` - 50 edges
4. `FsDeps` - 47 edges
5. `bindStateSnapshot()` - 39 edges
6. `main()` - 32 edges
7. `createPitchArchive()` - 31 edges
8. `runDirect()` - 28 edges
9. `Changelog` - 28 edges
10. `Compaction record: independent-rereview-catch-up` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Examples in Codebase` --references--> `requireCompleteLedger()`  [INFERRED]
  .project/knowledge/patterns/a-gate-must-not-trust-its-own-author.md → ai-framework/scripts/pitch-archive.mts
- `Response style (caveman mode)` --references--> `full()`  [INFERRED]
  AGENTS.md → ai-framework/scripts/pitch-compress.mts
- `Response style (caveman mode)` --references--> `full()`  [INFERRED]
  CLAUDE.md → ai-framework/scripts/pitch-compress.mts
- `Context` --references--> `full()`  [INFERRED]
  .project/knowledge/decisions/caveman-mode-is-default-everywhere.md → ai-framework/scripts/pitch-compress.mts
- `Decision` --references--> `full()`  [INFERRED]
  .project/knowledge/decisions/caveman-mode-is-default-everywhere.md → ai-framework/scripts/pitch-compress.mts

## Import Cycles
- None detected.

## Communities (367 total, 124 thin omitted)

### Community 0 - "skill-registry.mts"
Cohesion: 0.06
Nodes (49): acquire(), cleanup(), codeOf(), context(), Created, defaultDeps(), digest(), fromBase64() (+41 more)

### Community 1 - "node.mts"
Cohesion: 0.11
Nodes (10): commitFixtureLedger(), placeLedger(), seedShippedPitch(), write(), nodeChild, nodeFs, nodeNet, readStdin() (+2 more)

### Community 2 - "pitch-archive.mts"
Cohesion: 0.07
Nodes (48): archive(), ArchiveOptions, ArchiveResult, CliOptions, codeOf(), CompactionContext, createPitchArchive(), archive() (+40 more)

### Community 3 - "bindStateSnapshot"
Cohesion: 0.08
Nodes (52): inventory(), RegistryContext, RootName, bindStateSnapshot(), buildSnapshot(), checkSnapshot(), cli(), contextFacts() (+44 more)

### Community 4 - "token-report.mts"
Cohesion: 0.10
Nodes (51): AVAILABILITY, basisText(), change(), cleanDimension(), CleanRecord, CleanSnapshot, collect(), Collected (+43 more)

### Community 5 - "review-bench.mts"
Cohesion: 0.08
Nodes (47): BOOKKEEPING_FILES, BOOKKEEPING_PREFIXES, canaryCheck(), CanaryResult, CanarySpec, cli(), CliResult, count() (+39 more)

### Community 6 - "bundle-sync.mts"
Cohesion: 0.07
Nodes (54): argValue(), BaseLookup, classify(), codeOf(), colors, commandFailure(), Digest, Flagged (+46 more)

### Community 7 - "token-consumption.mts"
Cohesion: 0.08
Nodes (45): LockOptions, addNumber(), applyDimensions(), applyRecord(), applyToRow(), applyToSnapshot(), blankDimensions(), blankRow() (+37 more)

### Community 8 - "Security Rules"
Cohesion: 0.05
Nodes (43): 1. Authentication & Authorization, 2. Data Validation, 3. Secrets & Credentials, 4. Input Safety (XSS Prevention), 5. API Routes, 6. Multi-Tenancy / Organization Isolation, 7. File Uploads (if applicable), 8. Security Anti-Patterns (Auto-Flagged) (+35 more)

### Community 9 - "ref_node_assert"
Cohesion: 0.08
Nodes (19): Compress guard, fixture(), readFileSync(), settings, write(), Call, healthy(), libs (+11 more)

### Community 10 - "ref_node_child_process"
Cohesion: 0.08
Nodes (14): __dirname, memoryDeps(), require, { resolveClaudeEntry }, seedShippedPitch(), write(), NODE_FLAGS, ADAPTERS (+6 more)

### Community 11 - "main"
Cohesion: 0.16
Nodes (37): main(), absolute(), checkAgent(), checkCavemanState(), checkKnowledgeGraph(), checkNode(), checkOpenCodeResolution(), checkOrcaPolicy() (+29 more)

### Community 12 - "state-theme.mts"
Cohesion: 0.08
Nodes (40): stylesheet(), assemble(), Built, channel(), collect(), COLOR_TOKENS, contrastRatio(), CSS_NAMES (+32 more)

### Community 13 - "docs-links.test.mts"
Cohesion: 0.19
Nodes (13): anchorsOf(), BrokenLink, checkLinks(), collect(), defaultDeps(), LinkReport, linksOf(), main() (+5 more)

### Community 14 - "createNodeDeps"
Cohesion: 0.05
Nodes (35): acquire(), Acquired, codeOf(), defaultDeps(), Endpoint, endpointFor(), Lease, Leased (+27 more)

### Community 15 - "Nielsen's 10 Usability Heuristics for Evaluation"
Cohesion: 0.06
Nodes (33): Consistency, Control & Freedom, Efficiency, Error Handling, H10: Help & Documentation, H1: Visibility of System Status, H2: Match Between System and Real World, H3: User Control & Freedom (+25 more)

### Community 16 - "Component Architecture Patterns"
Cohesion: 0.06
Nodes (31): Accept the minimum data needed, Component Architecture Patterns, Component Layers, Component Size Rules, Cross-feature dependency?, Dual-Path Rendering Parity, Enforcement during `/build`, Extract a component when: (+23 more)

### Community 17 - "Instance-managed skills"
Cohesion: 0.08
Nodes (26): All vendors available in the project, Bundle-sync migration (`skill-sync.mts`), Doctor and setup integration, Formatting installed content, Inspect, choose and install, Instance-managed skills, Lifecycle and recovery, Registry and source packages (+18 more)

### Community 18 - "Context Management"
Cohesion: 0.07
Nodes (29): 1. Loading Everything, 2. No Transition Summaries, 3. Ignoring Previous Sessions, 4. Inline History, Anti-Patterns, Before Each Skill Runs, Context Loading Priority, Context Loading Protocol (+21 more)

### Community 19 - "Coding Standards"
Cohesion: 0.07
Nodes (27): Avoiding Future Refactors, Booleans: prefix with `is/has/can/should`, Code Organization Checklist, Code Quality Principles, Coding Standards, Comments, Constants: `UPPER_SNAKE_CASE`, CSS Scoping for Shared Component Classes (+19 more)

### Community 20 - ".claude/agents/architect.md"
Cohesion: 0.07
Nodes (27): 1. Current State Analysis, 1. Modularity & Separation of Concerns, 2. Requirements Gathering, 2. Scalability, 3. Design Proposal, 3. Maintainability, 4. Security, 4. Trade-Off Analysis (+19 more)

### Community 21 - ".cursor/agents/architect.md"
Cohesion: 0.07
Nodes (27): 1. Current State Analysis, 1. Modularity & Separation of Concerns, 2. Requirements Gathering, 2. Scalability, 3. Design Proposal, 3. Maintainability, 4. Security, 4. Trade-Off Analysis (+19 more)

### Community 22 - "graphify.mts"
Cohesion: 0.08
Nodes (33): buildGraph(), ensureProjectFiles(), extractTitle(), extractWikiLinks(), FrontmatterValue, GITIGNORE_BLOCK, Graph, GRAPH_FILE (+25 more)

### Community 23 - "setup-validator.mts"
Cohesion: 0.17
Nodes (22): CheckResult, ClaudeEntry, CursorReport, defaultLibs, main(), makeValidator(), checkCavemanEntryFiles(), checkContext() (+14 more)

### Community 24 - "Compaction record: independent-rereview-catch-up"
Cohesion: 0.07
Nodes (26): Compaction record: independent-rereview-catch-up, Section 10: pitch.md#rabbit-holes, Section 11: audit-cycle-1.md, Section 12: deviations.md#s0-2026-09-26, Section 13: deviations.md#s4-2026-09-26, Section 14: deviations.md#s1-2026-09-26, Section 15: deviations.md#s2-2026-09-26, Section 16: deviations.md#s2-gate-2026-09-27 (+18 more)

### Community 25 - "Plan: ts-runtime-injection"
Cohesion: 0.08
Nodes (24): direct(), run(), Exit criteria (every group; machine-checkable), Exit criteria per scope (machine-checkable, ≥1 per scope), Extension 1 (user, 2026-10-07): migrate every remaining script (T2-T4), Living-spec deviations log, Parallel dispatch plan, Plan-time spike results (2026-10-07, Node v24.21.0, Bun 1.4.2) (+16 more)

### Community 26 - "FsDeps"
Cohesion: 0.06
Nodes (8): FsDeps, The Pattern, Pattern: a copy/prune tool refuses symlinks on both sides, Summary, The Pattern, Metrics collector: TOCTOU on reads, and clamped lifetime totals, Audit: readme-split, Cycle 1 (2026-10-07)

### Community 27 - "Followups"
Cohesion: 0.08
Nodes (23): event(), env(), skill(), bundle-sync marker misclassifies un-applied unverified files as `local` on the next run, Candidate pitches (cooldown 2026-09-25, approved item by item), commitLedger's transaction context differs from pitch-archive's guard and recover, Confirm the new Claude Skill hook fires in a fresh session, /cooldown: should a slice's file cap reserve headroom for "review finds more than the known bug"? (+15 more)

### Community 28 - "Eval Harness Skill"
Cohesion: 0.08
Nodes (25): 1. Code-Based Grader, 1. Define (Before Coding), 2. Implement, 2. Model-Based Grader, 3. Evaluate, 3. Human Grader, 4. Report, Best Practices (+17 more)

### Community 29 - "Eval Harness Skill"
Cohesion: 0.08
Nodes (25): 1. Code-Based Grader, 1. Define (Before Coding), 2. Implement, 2. Model-Based Grader, 3. Evaluate, 3. Human Grader, 4. Report, Best Practices (+17 more)

### Community 30 - "state-html.test.mts"
Cohesion: 0.12
Nodes (20): ALLOWED_ATTRS, ALLOWED_TAGS, page(), RENDER_SCRIPT, SNAPSHOT_SCRIPT, snapshotOf(), cli(), createStateRender() (+12 more)

### Community 31 - "add-skill.mts"
Cohesion: 0.05
Nodes (55): AddSkillOptions, AddSkillResult, checkNamespace(), cli(), { context, digest, json, snapshot, readRegistry, transact, recover, resolveFile }, defaultDeps(), { discoverVendors, adapters }, globalLink() (+47 more)

### Community 32 - "types.mts"
Cohesion: 0.15
Nodes (21): execute(), runCli(), runDirect(), inferRoot(), isDirect(), readRunner(), runnerEnvironment(), DOTENV_MAX_BYTES (+13 more)

### Community 33 - "Observability Rules"
Cohesion: 0.08
Nodes (23): 1. Error Boundaries, 2. User Feedback (Toasts / Alerts / Inline Messages), 3. Loading States, 4. Logging Conventions, 5. Error Recovery Patterns, 6. Not-Found / Missing-Resource Handling, Backend/handler layer: throw user-friendly errors for expected failures, Do NOT put business logic in error boundaries (+15 more)

### Community 34 - "Performance Rules"
Cohesion: 0.08
Nodes (23): 1. Minimize Client-Side JavaScript, 2. Data-Access / Query Performance, 3. Bundle Size, 4. Loading States, 5. Caching, Avoid N+1 queries — don't fetch inside a loop, Avoid unnecessary re-renders, Don't fetch inside loops (+15 more)

### Community 35 - "pitch-compress.mts"
Cohesion: 0.11
Nodes (23): AcceptedGap, buildLedger(), CliOptions, commitLedger(), CommitOptions, CommitResult, cli(), parseJson() (+15 more)

### Community 36 - "orca-preflight.mts"
Cohesion: 0.14
Nodes (21): absolutePathEntries(), byteLength(), CALL_TIMEOUT_MS, CALLS, cli(), Context, defaultDeps(), defaultRun() (+13 more)

### Community 37 - "CI/CD & Deployment Rules"
Cohesion: 0.09
Nodes (21): 1. Pre-Merge Requirements (Local), 2. Backend/Schema Deployment, 3. Environment Variables, 4. Rollback Plan, 5. Deployment Checklist, 6. What Must NOT Go to Production, 7. Multi-Service Deployment Order, Backend environment variables (+13 more)

### Community 38 - "orca-policy.mts"
Cohesion: 0.15
Nodes (21): boundedInteger(), cli(), Coordinator, defaultDeps(), errorCode(), hasKeys(), inspectPath(), isRecord() (+13 more)

### Community 39 - "bindStateRender"
Cohesion: 0.25
Nodes (19): bindStateRender(), loadSnapshot(), pitchTable(), projectRows(), render(), renderHtml(), row(), scroll() (+11 more)

### Community 40 - "skill-vendors.test.mts"
Cohesion: 0.10
Nodes (16): BUNDLE, captureDeps(), { context, readRegistry }, __dirname, { discoverVendors, externalSkillReport, cursorMirrors }, fixture(), git(), MirrorReport (+8 more)

### Community 41 - "index.md"
Cohesion: 0.20
Nodes (14): Issue: guard tests can fail for the wrong reason, Issue: macOS resolves `os.tmpdir()` through a `/private/var` alias, breaking exact-path assertions in tests, Prevention, Related, Root Cause, Summary, Symptoms, Issue: rounding a remaining budget to zero disables subprocess cancellation (+6 more)

### Community 42 - "bun.mts"
Cohesion: 0.13
Nodes (10): bunApi, bunChild(), BunHasher, BunProc, BunSpawnOptions, BunSyncResult, createBunDeps(), decode() (+2 more)

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

### Community 49 - "Pattern: Resolve the real path before matching it against a protected-directory list"
Cohesion: 0.13
Nodes (16): Pattern: a read-only report over a project tree treats the tree as data, never as code, Related Patterns, Summary, What happened, When NOT to Use, When to Use, Pattern: Resolve the real path before matching it against a protected-directory list, Related Patterns (+8 more)

### Community 50 - "review-bench.test.mts"
Cohesion: 0.12
Nodes (15): Call, Fake, CANARY, Fake, git(), GUARD_GIT, here, repo() (+7 more)

### Community 51 - "token-consumption.test.mts"
Cohesion: 0.12
Nodes (15): CollectorInput, CompletionRecord, Routing, adapterDeps(), CLI, COLLECTOR, FakeRun, here (+7 more)

### Community 52 - "orca-policy.test.mts"
Cohesion: 0.10
Nodes (10): Location, MAX_POLICY_BYTES, Coord, EXAMPLE, Mem, MemNode, nodeDeps, Policy (+2 more)

### Community 53 - "full"
Cohesion: 0.24
Nodes (15): assertPlainPath(), classify(), codeOf(), assertPlainPath(), checkDestination(), checkSlug(), doneWorkSlugs(), full() (+7 more)

### Community 54 - "skill-source.mts"
Cohesion: 0.18
Nodes (17): frontmatter(), git(), gitBytes(), GitFailure, gitRun(), identity(), InspectedSource, inspectSource() (+9 more)

### Community 55 - "browser-runtime.test.mts"
Cohesion: 0.13
Nodes (20): BrowserReport, catalogEntry(), cli(), CliOptions, CliState, cliStatus(), defaultDeps(), defaultRegistry (+12 more)

### Community 56 - "changelog.test.mts"
Cohesion: 0.18
Nodes (19): allArgs(), arg(), buildEntry(), bump(), codeOf(), Context, EntryParts, fail() (+11 more)

### Community 57 - "orca-preflight.test.mts"
Cohesion: 0.12
Nodes (13): Receipt, RunOptions, SUPPORTED_VERSION, EXAMPLE, Harness, nodeDeps, Obj, okRun() (+5 more)

### Community 58 - "RuntimeDeps"
Cohesion: 0.07
Nodes (29): RuntimeDeps, CatalogEntry, cli(), CliOptions, defaultDeps(), defaultRegistry, DefaultReport, isRecord() (+21 more)

### Community 59 - "Decision: workflow-tooling pitches share the same no-gos, and the installer's design answers stand"
Cohesion: 0.13
Nodes (16): Consequences, Decision, Decision: Effective sync bases and bounded font discovery, References, Summary, Consequences, Decision, Decision: how `/state` builds its snapshot and themed HTML report (+8 more)

### Community 60 - "Phase 3: Audit"
Cohesion: 0.11
Nodes (18): Adaptive gate, Confirmation gate, Cross-pitch conflict check, Eval gate (AI changes — hard), Evidence rule (same as /build), Finding contract (every subagent), Loop discipline, Output (+10 more)

### Community 61 - "pre-ship-verify.mts"
Cohesion: 0.18
Nodes (17): asRecord(), buildChecks(), changedFiles(), Check, CheckResult, commandOutput(), diffSanity(), errorMessage() (+9 more)

### Community 62 - "bundle-sync.test.mts"
Cohesion: 0.20
Nodes (15): ADD_SKILL, commit(), __dirname, fixture(), git(), read(), run(), runJson() (+7 more)

### Community 63 - "Shipped: ts-runtime-injection"
Cohesion: 0.29
Nodes (6): Audit, Final verification, Followups, No-gos honored, Reconciliation, Shipped: ts-runtime-injection

### Community 64 - "AI-Assisted Development Workflow"
Cohesion: 0.11
Nodes (17): Adaptive confirmation gate, AI-Assisted Development Workflow, Big-batch feature (full pipeline), Bug fix, Confirmation gate philosophy, Hill chart, Hotfix, Lite shape (small task or user rejection) (+9 more)

### Community 65 - "Knowledge Graph"
Cohesion: 0.12
Nodes (16): Auditing, Confidence Levels, Decisions (`decisions/`), Entities (`entities/`), Entry Format, How Knowledge is Used, Index Format, Issues (`issues/`) (+8 more)

### Community 66 - "Knowledge Graph"
Cohesion: 0.12
Nodes (16): Auditing, Confidence Levels, Decisions (`decisions/`), Entities (`entities/`), Entry Format, How Knowledge is Used, Index Format, Issues (`issues/`) (+8 more)

### Community 67 - "normalizedEvent"
Cohesion: 0.23
Nodes (16): boundedId(), boundedName(), bundleDefaultMode(), currentCavemanMode(), field(), integerOrNull(), isoNow(), knownModel() (+8 more)

### Community 68 - "Model Routing Strategy"
Cohesion: 0.12
Nodes (15): Always, Cascade Pipeline, Conditional Phases, Context budget discipline, Cost Measurement, Cost Optimization Rules, Don't over-front-load context, Model Routing Strategy (+7 more)

### Community 69 - "requiredSections"
Cohesion: 0.33
Nodes (9): bodyUnder(), extractSection(), headingLines(), loosely(), looseSectionHasContent(), markdownHeadings(), requiredSections(), sectionKeys() (+1 more)

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
Nodes (15): 1. Initial Scan, 2. OWASP Top 10 Check, 3. Code Pattern Review, Analysis Commands, Common False Positives, Core Responsibilities, Emergency Response, Key Principles (+7 more)

### Community 75 - "/sync — Sync Tasks with Notion"
Cohesion: 0.12
Nodes (15): After `/ship`, Arguments, Config File, During `/resume`, Error Handling, First-Time Setup, Full Sync (Default), Manual: `/sync` (+7 more)

### Community 76 - "Steps"
Cohesion: 0.12
Nodes (15): 1. Understand the UI requirement, 2. Load design rules, 3. Design component hierarchy, 4. ASCII wireframe (for complex layouts), 5. Generate component skeletons, 6. Generate i18n key list (if applicable), 7. Self-validate each generated file, 8. Present for approval (+7 more)

### Community 77 - "Security Reviewer"
Cohesion: 0.12
Nodes (15): 1. Initial Scan, 2. OWASP Top 10 Check, 3. Code Pattern Review, Analysis Commands, Common False Positives, Core Responsibilities, Emergency Response, Key Principles (+7 more)

### Community 78 - "/sync — Sync Tasks with Notion"
Cohesion: 0.12
Nodes (15): After `/ship`, Arguments, Config File, During `/resume`, Error Handling, First-Time Setup, Full Sync (Default), Manual: `/sync` (+7 more)

### Community 79 - "Steps"
Cohesion: 0.12
Nodes (15): 1. Understand the UI requirement, 2. Load design rules, 3. Design component hierarchy, 4. ASCII wireframe (for complex layouts), 5. Generate component skeletons, 6. Generate i18n key list (if applicable), 7. Self-validate each generated file, 8. Present for approval (+7 more)

### Community 80 - "Issue: A hook that fires at launch was counted as a completion, so async agents counted twice"
Cohesion: 0.10
Nodes (22): Consequences, Decision: the metrics collector holds a kernel-owned loopback lease, not a lock file, References, Summary, Consequences, Decision, Decision: how token metrics record and report vendor, model, agent, effort and skill, References (+14 more)

### Community 81 - "Issue: Matching entities by a bare `${id}-` prefix lets one entity resolve to another's"
Cohesion: 0.29
Nodes (7): Issue: Matching entities by a bare `${id}-` prefix lets one entity resolve to another's, Prevention, Related, Root Cause, Solution, Summary, Symptoms

### Community 82 - "Plan: orca-vendor-foundation"
Cohesion: 0.12
Nodes (15): Confirmation gate, Exit criteria per scope, Impact analysis — acknowledged, Living-spec deviations log, Parallel dispatch plan, Plan: orca-vendor-foundation, Policy contract, Preflight contract (+7 more)

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
Cohesion: 0.14
Nodes (12): Architecture, Confirmation gate (always), Guardrails, Product, Project Records, Project specifics, Response style (caveman mode), Subagents (+4 more)

### Community 88 - "opencode-plugin.test.mts"
Cohesion: 0.20
Nodes (8): Event, fakeEventStream(), here, Plugin, PluginRun, Stream, ToolHook, withPlugin()

### Community 89 - "Architectural Boundaries"
Cohesion: 0.14
Nodes (13): App-local code (routes, screens, UI), Architectural Boundaries, Backend, Checklist, Dependency Placement, Dependency Rule, Purpose, Refactor Triggers (+5 more)

### Community 91 - "Activities (in order)"
Cohesion: 0.14
Nodes (13): 1. Final /verify (mandatory), 2. Pitch ↔ implementation reconciliation → SHIPPED.md, 3. Knowledge extraction (mandatory, structured), 4. Status compaction (≤100 lines hard cap), 5. Followups handling, 6. Doc updates (conditional, recorded), Activities (in order), Confirmation gate (+5 more)

### Community 92 - "AGENTS.md"
Cohesion: 0.14
Nodes (13): AGENTS.md, Architecture, Confirmation gate (always), Guardrails, Product, Project Records, Project specifics, Response style (caveman mode) (+5 more)

### Community 93 - "Review Checklist"
Cohesion: 0.14
Nodes (13): Approval criteria, Best Practices (LOW), Code Quality (HIGH), Confidence-Based Filtering, Frontend Framework Patterns (HIGH), Node.js/Backend Patterns (HIGH), Output structure, Performance (MEDIUM) (+5 more)

### Community 94 - "Steps"
Cohesion: 0.14
Nodes (13): 1. Inventory all knowledge entries, 2. Check for staleness, 3. Check usage (pattern references), 4. Issue-to-Rule Promotion Check, 5. Cross-reference validation, 6. Tag coverage, 7. Generate recommendations, 8. Update usage log (+5 more)

### Community 95 - "Review Checklist"
Cohesion: 0.14
Nodes (13): Approval criteria, Best Practices (LOW), Code Quality (HIGH), Confidence-Based Filtering, Frontend Framework Patterns (HIGH), Node.js/Backend Patterns (HIGH), Output structure, Performance (MEDIUM) (+5 more)

### Community 96 - "Steps"
Cohesion: 0.14
Nodes (13): 1. Inventory all knowledge entries, 2. Check for staleness, 3. Check usage (pattern references), 4. Issue-to-Rule Promotion Check, 5. Cross-reference validation, 6. Tag coverage, 7. Generate recommendations, 8. Update usage log (+5 more)

### Community 97 - "Done Work"
Cohesion: 0.14
Nodes (13): bundle-sync-marker-fix — shipped 2026-09-26, collector-robustness — shipped 2026-09-27, Done Work, independent-rereview-catch-up — shipped 2026-09-27, metrics-report-dimensions — shipped 2026-09-25, native-safety-feasibility — shipped 2026-09-27, path-safety-hardening — shipped 2026-09-27, pitch-compaction — shipped 2026-09-25 (+5 more)

### Community 98 - "Pattern: the tool that verifies independence must itself be independently verified"
Cohesion: 0.12
Nodes (18): Fix, Issue: a cross-pitch-conflict-checker cannot separate authorship in a file two uncommitted pitches share, Prevention, Related Patterns, Root Cause, What happened, Issue: a subagent's audit report contained numbers and names the code and the test run contradicted, Prevention (+10 more)

### Community 99 - "recordEvent"
Cohesion: 0.19
Nodes (12): hex(), isLink(), recordEvent(), staysUnderRoot(), writeAtomically(), BusEvent, hook(), MessageInfo (+4 more)

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

### Community 110 - "Plan: readme-split"
Cohesion: 0.15
Nodes (12): Exit criteria per scope (machine-checkable, ≥1 per scope), Final gate (bundle), Living-spec deviations log, Parallel dispatch plan, Plan: readme-split, Risks (inherited from pitch rabbit holes), S1 — Link checker, S2 — Move sections to docs (+4 more)

### Community 111 - "Compaction record: bundle-sync-marker-fix"
Cohesion: 0.15
Nodes (12): Compaction record: bundle-sync-marker-fix, Section 10: audit-cycle-1.md, Section 11: log.md#s1-2026-09-26, Section 1: SHIPPED.md#scope-reconciliation, Section 2: SHIPPED.md#verification, Section 3: SHIPPED.md#audit, Section 4: SHIPPED.md#no-gos-honored, Section 5: SHIPPED.md#rabbit-holes-and-deviations (+4 more)

### Community 112 - "Compaction record: state-quoted-fonts"
Cohesion: 0.15
Nodes (12): Compaction record: state-quoted-fonts, Section 10: audit-cycle-1.md, Section 11: log.md#s1-2026-09-26, Section 1: SHIPPED.md#scope-reconciliation, Section 2: SHIPPED.md#verification, Section 3: SHIPPED.md#audit, Section 4: SHIPPED.md#no-gos-honored, Section 5: SHIPPED.md#rabbit-holes-and-deviations (+4 more)

### Community 113 - "stuck-uphill-detector.mts"
Cohesion: 0.36
Nodes (10): appendAudit(), detectStuck(), HillRow, listActivePitches(), main(), parseHill(), pitchesDir(), StuckScope (+2 more)

### Community 114 - "token-report.test.mts"
Cohesion: 0.17
Nodes (9): Dimensions, Snapshot, main(), here, Loose, Nested, SnapshotParts, snapshotWith() (+1 more)

### Community 115 - "Eval Harness"
Cohesion: 0.17
Nodes (11): Adding a new case, Adding a new judge rubric, Cost control, Dataset format, Directory map, Eval Harness, Interpreting the report, Known scope (example) (+3 more)

### Community 116 - "createPitchCompress"
Cohesion: 0.20
Nodes (15): checkDestination(), CompactionContext, createPitchCompress(), buildLedger(), checkGraph(), classify(), commitLedger(), compactionContext() (+7 more)

### Community 117 - "Pattern: parse an untrusted value against a grammar and re-emit it from the parsed numbers"
Cohesion: 0.12
Nodes (16): Fix and rule, Issue: a lazy fence-stripping regex over CLAUDE.md was quadratic, Pattern: Allow-list untrusted labels at ingest, and again at the place they are rendered, Related Patterns, Summary, The Pattern, What happened, When NOT to Use (+8 more)

### Community 118 - "Wireframe: [Feature Name]"
Cohesion: 0.17
Nodes (11): Accessibility Notes, Component Map, Design Tokens Used, Desktop (>= 1024px), Interactive Elements, Mobile (< 768px), Open Questions, Screen Layout (+3 more)

### Community 119 - "Wireframe: [Feature Name]"
Cohesion: 0.17
Nodes (11): Accessibility Notes, Component Map, Design Tokens Used, Desktop (>= 1024px), Interactive Elements, Mobile (< 768px), Open Questions, Screen Layout (+3 more)

### Community 120 - "Audit"
Cohesion: 0.17
Nodes (11): Adaptive gate, Audit, Confirmation gate, Evidence rule, Loop discipline, Reviewer contract, Subagent dispatch (parallel), Synthesis (+3 more)

### Community 121 - "Audit"
Cohesion: 0.17
Nodes (11): Adaptive gate, Audit, Confirmation gate, Evidence rule, Loop discipline, Reviewer contract, Subagent dispatch (parallel), Synthesis (+3 more)

### Community 122 - "Wireframe: [Feature Name]"
Cohesion: 0.17
Nodes (11): Accessibility Notes, Component Map, Design Tokens Used, Desktop (>= 1024px), Interactive Elements, Mobile (< 768px), Open Questions, Screen Layout (+3 more)

### Community 123 - "Wireframe: [Feature Name]"
Cohesion: 0.17
Nodes (11): Accessibility Notes, Component Map, Design Tokens Used, Desktop (>= 1024px), Interactive Elements, Mobile (< 768px), Open Questions, Screen Layout (+3 more)

### Community 124 - "Compaction record: native-safety-feasibility"
Cohesion: 0.17
Nodes (11): Compaction record: native-safety-feasibility, Section 10: log.md#2026-09-26-shipped, Section 1: SHIPPED.md#reconciliation, Section 2: SHIPPED.md#verification-and-audit, Section 3: SHIPPED.md#no-gos-and-documentation, Section 4: SHIPPED.md#knowledge-and-remaining-work, Section 5: SHIPPED.md#delivery, Section 6: pitch.md#no-gos (+3 more)

### Community 125 - "README.md"
Cohesion: 0.19
Nodes (9): How to improve this flow, Knowledge Graph, The pipeline, Set up, Setup Validator, Token Consumption, One source, every vendor, What you get (+1 more)

### Community 126 - "Harness Integration Guide"
Cohesion: 0.18
Nodes (10): Capability Profiles, Caveman Mode, Claude Code, Codex, Harness Integration Guide, Instance-managed Skills, OpenCode, Role Profiles (+2 more)

### Community 128 - "Internationalization (i18n) Rules"
Cohesion: 0.18
Nodes (10): AI Language Behavior (if applicable), Hardcoded Copy Policy, Internationalization (i18n) Rules, Key Design, Locale Strategy, Message File Structure, Plurals and Variable Messages, Scope (+2 more)

### Community 129 - "Testing Rules"
Cohesion: 0.18
Nodes (10): Coverage Targets (starting point — adjust per project), E2E Scope, File Organization, Guards and Fixes: Prove the Test Can Fail, Mocking Discipline, Naming Convention, Testing Checklist for New Features, Testing Rules (+2 more)

### Community 130 - "add-skill.test.mts"
Cohesion: 0.27
Nodes (10): phases, afterWrite(), captureDeps(), commit(), { context, digest, json, snapshot, readRegistry, transact, recover, resolveFile }, fixture(), git(), here (+2 more)

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

### Community 137 - "SETUP — Portable AI Development Workflow"
Cohesion: 0.18
Nodes (11): Guardrails (apply during setup and after), SETUP — Portable AI Development Workflow, Step 0 — Orient, Step 1 — Place the framework files, Step 3 — Scaffold the per-project data directory, Step 4 — Generate project context + entry file, Step 5 — Generate stack-specific rules (and agents, if needed), Step 6 — Verify lifecycle hooks (+3 more)

### Community 138 - "versioning-and-sync.md"
Cohesion: 0.25
Nodes (4): Design notes, Managed-write safety and interrupted compaction, Upgrade from JavaScript entry files, Version Log & Bundle Sync

### Community 139 - "State report"
Cohesion: 0.20
Nodes (9): Installed version, Reading the token metrics, Related, Run it, Snapshot contract (`schemaVersion: 1`), State report, The HTML report, Theme (+1 more)

### Community 140 - "Pitch: ts-runtime-injection"
Cohesion: 0.20
Nodes (8): Bet decision, Critique findings (auto-populated by /critique for big-batch + AI scopes), Knowledge consulted, No-gos (this pitch), Pitch: ts-runtime-injection, Problem, Rabbit holes, Solution sketch (breadboard, NOT wireframe)

### Community 141 - "Issue: A prose skill instruction referenced a CLI flag as if invocation arguments were already a clean single value, but they are free-form text"
Cohesion: 0.16
Nodes (14): extractInvocationArg(), resolveMode(), Consequences, Decision, Decision: how the default-skills machinery attributes, guards, and reports readiness, References, Summary, Issue: A prose skill instruction referenced a CLI flag as if invocation arguments were already a clean single value, but they are free-form text (+6 more)

### Community 143 - "ref_node_test"
Cohesion: 0.20
Nodes (10): check(), fileUrl(), loadTypescript(), main(), Plain, resolveMain(), Fake, projectWithTypescript() (+2 more)

### Community 144 - "Shipped: orca-vendor-foundation"
Cohesion: 0.20
Nodes (9): Closing gate, Documentation and status, Final verification, Followups generated, Knowledge extraction, No-gos honored, Rabbit holes and deviations, Reconciliation (+1 more)

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

### Community 152 - "Pitch: orca-vendor-dispatch"
Cohesion: 0.22
Nodes (8): Bet decision, Critique findings, Knowledge consulted, No-gos, Pitch: orca-vendor-dispatch, Problem, Rabbit holes, Solution sketch (breadboard, NOT wireframe)

### Community 153 - "Pitch: orca-vendor-foundation"
Cohesion: 0.22
Nodes (8): Bet decision, Critique findings, Knowledge consulted, No-gos, Pitch: orca-vendor-foundation, Problem, Rabbit holes, Solution sketch (breadboard, NOT wireframe)

### Community 154 - "Pitch: orca-vendor-orchestration"
Cohesion: 0.22
Nodes (8): Bet decision, Critique findings, Knowledge consulted, No-gos (this pitch), Pitch: orca-vendor-orchestration, Problem, Rabbit holes, Solution sketch (breadboard, NOT wireframe)

### Community 155 - "Pitch: readme-split"
Cohesion: 0.22
Nodes (8): Bet decision, Critique findings, Knowledge consulted, No-gos (this pitch), Pitch: readme-split, Problem, Rabbit holes, Solution sketch (breadboard)

### Community 156 - "Pitch: {slug}"
Cohesion: 0.22
Nodes (8): Bet decision, Critique findings (auto-populated by /critique for big-batch + AI scopes), Knowledge consulted, No-gos (this pitch), Pitch: {slug}, Problem, Rabbit holes, Solution sketch (breadboard, NOT wireframe)

### Community 157 - "Plan: {slug}"
Cohesion: 0.22
Nodes (8): Exit criteria per scope (machine-checkable, ≥1 per scope), Living-spec deviations log, Parallel dispatch plan, Plan: {slug}, Risks (inherited from pitch rabbit holes), S1 — {name}, Scopes, Wireframes (UI scopes only, light)

### Community 158 - "Bug: [Short Description]"
Cohesion: 0.22
Nodes (8): Affected Files, Bug: [Short Description], Description, Environment, Expected Behavior, Fix, Reproduction Steps, Root Cause

### Community 159 - "upgrade.test.mts"
Cohesion: 0.22
Nodes (11): Beyond the core pipeline, assertHealthy(), COMMANDS, comparable(), docsOnlyDoctorFailures(), nodeExecutable, repoRoot, run() (+3 more)

### Community 160 - "hooks"
Cohesion: 0.25
Nodes (7): _comment, hooks, PostToolUse, PreToolUse, SessionStart, SubagentStop, $schema

### Community 161 - "Bundle default skills"
Cohesion: 0.25
Nodes (7): Browser runtime, Bundle default skills, Caveman mode, Coverage: every skill and every agent, Existing projects (upgrading from an older bundle version), Token-usage attribution, Verification

### Community 162 - "Pattern: Dual-hash tracking for content that gets transformed after fetch"
Cohesion: 0.14
Nodes (14): Examples in Codebase, Pattern: Dual-hash tracking for content that gets transformed after fetch, Related Patterns, Summary, The Pattern, When NOT to Use, When to Use, Examples in Codebase (+6 more)

### Community 163 - ".rmSync"
Cohesion: 0.15
Nodes (13): fixture(), withCli(), write(), commandFixture(), scratch(), OsDeps, makeRepo(), put() (+5 more)

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
Cohesion: 0.25
Nodes (7): [2.8.0] - 2026-09-25, [2.9.0] - 2026-10-07, [2.9.1] - 2026-10-07, Added, Added, Changelog, Fixed

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
Nodes (8): Decisions (11 entries), Entities (0 entries), Graph, Issues (12 entries), Knowledge Index, Patterns (13 entries), Tag Index, Traversal

### Community 172 - "Pattern: A safety gate must not accept the claims of whoever it is gating — and must re-check at the destructive step"
Cohesion: 0.10
Nodes (22): Consequences, Context, Decision, Decision: caveman brevity mode is the default for every skill, agent, and session, Related, Consequences, Decision, Decision: `/shape-lite` is a compressed variant of `/shape` that escalates mechanically (+14 more)

### Community 173 - "Issue: Title"
Cohesion: 0.25
Nodes (7): Issue: Title, Prevention, Related, Root Cause, Solution, Summary, Symptoms

### Community 174 - "Pattern: Title"
Cohesion: 0.25
Nodes (7): Examples in Codebase, Pattern: Title, Related Patterns, Summary, The Pattern, When NOT to Use, When to Use

### Community 175 - "Build log: orca-vendor-foundation"
Cohesion: 0.25
Nodes (7): Audit cycles 1-2, Build log: orca-vendor-foundation, S1 — Test review, S2 — Boundary and evidence review, S3 — Fixture and sandbox verification, Ship closed — 2026-10-07, Ship preparation — 2026-10-07

### Community 176 - "Orca feasibility investigation"
Cohesion: 0.25
Nodes (7): Conclusion and evidence limits, Critique additions, Documented surfaces, Orca feasibility investigation, Proposed instance configuration, Proposed validation, Reconciliation and fallback contract

### Community 177 - "Status"
Cohesion: 0.25
Nodes (7): Active pitches, /cooldown due in: 4 ships, Followups backlog, Open rabbit holes across active pitches, Parked pitches, Recent ships (last 5), Status

### Community 178 - "Script runtime"
Cohesion: 0.29
Nodes (5): Choosing Node or Bun, Guarantees checked by tests, Running tests, Script runtime, Writing a script

### Community 179 - "Decision Title"
Cohesion: 0.29
Nodes (6): Consequences, Context, Decision, Decision Title, References, Summary

### Community 180 - "Bundle Sync"
Cohesion: 0.29
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
Cohesion: 0.29
Nodes (6): Activities (in order), Confirmation gate, Output, Ship, Transition, When to use

### Community 185 - "State"
Cohesion: 0.29
Nodes (6): State, Step 1 — Preview, Step 2 — Write the snapshot (only if the user wants it kept), Step 3 — Render the HTML report (only if the user wants it), Step 4 — Report, What this skill never touches

### Community 186 - "Bundle Sync"
Cohesion: 0.29
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
Cohesion: 0.29
Nodes (6): Activities (in order), Confirmation gate, Output, Ship, Transition, When to use

### Community 191 - "State"
Cohesion: 0.29
Nodes (6): State, Step 1 — Preview, Step 2 — Write the snapshot (only if the user wants it kept), Step 3 — Render the HTML report (only if the user wants it), Step 4 — Report, What this skill never touches

### Community 192 - "Product Context"
Cohesion: 0.29
Nodes (6): Core Capabilities, Product, Product Constraints, Product Context, Product Goal, Users

### Community 193 - "Issue: making a shared reader treat a symlink as "absent" turned its writer into a data-destroyer"
Cohesion: 0.13
Nodes (18): Decision: shared compaction recovery context and trusted directories, Decision and consequences, Decision: Inode anchoring and stable-inode locks, Observations, Consequences, Decision, Decision: how `/pitch-compress` decides a deletion is safe, References (+10 more)

### Community 198 - "Decision Title"
Cohesion: 0.29
Nodes (6): Consequences, Context, Decision, Decision Title, References, Summary

### Community 199 - "S1 completion evidence"
Cohesion: 0.29
Nodes (6): Approved test strategy, Behavior delivered, Executed commands and outcomes, Guard mutation checks, Preservation and remaining work, S1 completion evidence

### Community 200 - "Optional Orca vendor policy"
Cohesion: 0.33
Nodes (5): Explicit runtime inspection, Inspect without execution, Optional Orca vendor policy, Policy contract, Workflow doctor

### Community 201 - "Lossless projection in replace-style upserts"
Cohesion: 0.33
Nodes (5): Anti-pattern, Data Modeling Rules, Lossless projection in replace-style upserts, Three safe options (in preference order), Why this matters

### Community 202 - ".claude/agents/eval-runner.md"
Cohesion: 0.33
Nodes (5): Constraints, Gates, Inputs (provided by dispatcher), Output structure, Process

### Community 203 - "Dependency Security"
Cohesion: 0.33
Nodes (5): After Approved Remediation, Dependency Security, Output, Procedure, Safety Rules

### Community 204 - "/fix — Bug-Fix Entry"
Cohesion: 0.33
Nodes (5): 1. Triage (gated), 2. Build → Audit → Ship, Agent recommendations, /fix — Bug-Fix Entry, When NOT to use /fix

### Community 205 - ".cursor/agents/eval-runner.md"
Cohesion: 0.33
Nodes (5): Constraints, Gates, Inputs (provided by dispatcher), Output structure, Process

### Community 206 - "Dependency Security"
Cohesion: 0.33
Nodes (5): After Approved Remediation, Dependency Security, Output, Procedure, Safety Rules

### Community 207 - "/fix — Bug-Fix Entry"
Cohesion: 0.33
Nodes (5): 1. Triage (gated), 2. Build → Audit → Ship, Agent recommendations, /fix — Bug-Fix Entry, When NOT to use /fix

### Community 208 - "opencode.json"
Cohesion: 0.33
Nodes (5): agent, build, model, instructions, $schema

### Community 209 - "Stack Context"
Cohesion: 0.33
Nodes (5): Commands, Environment, Not Applicable, Runtime, Stack Context

### Community 215 - "Audit cycles 1-2 — orca-vendor-foundation"
Cohesion: 0.33
Nodes (5): Acknowledged, Audit cycles 1-2 — orca-vendor-foundation, Evidence, Findings, Must-fix

### Community 216 - "Deviations: orca-vendor-foundation"
Cohesion: 0.33
Nodes (5): D1 — Explicit Orca opt-in, D2 — Portable fixture assertions, D3 — Cohesive policy module, D4 — Conservative runtime proof, Deviations: orca-vendor-foundation

### Community 217 - "S3 evidence — diagnostic integration and portable documentation"
Cohesion: 0.33
Nodes (5): Next gate, Result, S3 evidence — diagnostic integration and portable documentation, Scope and remaining limits, Verification

### Community 218 - "Online feasibility verification"
Cohesion: 0.33
Nodes (5): Limits, Newly surfaced prerequisite, Online feasibility verification, Verified interfaces, What the workflow must implement

### Community 219 - "G7 baseline and verification"
Cohesion: 0.33
Nodes (5): Deterministic CLI parity, G7 baseline and verification, Mutation and static evidence, Ownership, Test counts

### Community 220 - "Baseline G9 (collector, security path), recorded before any edit on 2026-10-07"
Cohesion: 0.33
Nodes (5): After migration (2026-10-07), Baseline G9 (collector, security path), recorded before any edit on 2026-10-07, CLI fixtures, Hook latency (criterion 6), Test counts (old `.test.js`)

### Community 221 - "Step 2 — Wire all harnesses"
Cohesion: 0.33
Nodes (6): 2a — Claude Code, 2b — OpenCode, 2c — Codex, 2d — Cursor, 2e — Other CLI agents, Step 2 — Wire all harnesses

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

### Community 245 - "Installed Orca verification"
Cohesion: 0.40
Nodes (4): Current conclusion, Installed Orca verification, Observed facts, Prepared live verification scope

### Community 246 - "Hill chart: {slug}"
Cohesion: 0.40
Nodes (4): Hill chart: {slug}, Hill positions reference, Positions, Stuck-uphill watch

### Community 247 - "Baseline G8 (hooks: pre-ship-verify, stuck-uphill-detector, post-edit-check), recorded before any edit on 2026-10-07"
Cohesion: 0.40
Nodes (4): Baseline G8 (hooks: pre-ship-verify, stuck-uphill-detector, post-edit-check), recorded before any edit on 2026-10-07, CLI fixtures, Hook latency (before), Test counts

### Community 248 - "Hill chart: ts-runtime-injection"
Cohesion: 0.40
Nodes (4): Hill chart: ts-runtime-injection, Hill positions reference, Positions, Stuck-uphill watch

### Community 249 - "W2 verification"
Cohesion: 0.40
Nodes (4): Ownership and runtime adjustments, Scope evidence, Shared-tree wave gate, W2 verification

### Community 250 - "Independent W2/G8 verification"
Cohesion: 0.40
Nodes (4): Behavior tests, CLI parity and startup, Guard mutation and wiring, Independent W2/G8 verification

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

### Community 259 - "Hill chart: readme-split"
Cohesion: 0.50
Nodes (3): Hill chart: readme-split, Hill positions reference, Positions

### Community 260 - "Build log: readme-split"
Cohesion: 0.50
Nodes (3): 2026-10-07, Audit cycle 1, Build log: readme-split

### Community 261 - "Baseline G3 (orca-policy, orca-preflight, docs-links)"
Cohesion: 0.50
Nodes (3): Baseline G3 (orca-policy, orca-preflight, docs-links), CLI fixtures, Test counts (old .test.js)

## Knowledge Gaps
- **2072 isolated node(s):** `TsDiagnostic`, `Plain`, `$schema`, `instructions`, `model` (+2067 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2475 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **124 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RuntimeDeps` connect `RuntimeDeps` to `skill-registry.mts`, `node.mts`, `add-skill.test.mts`, `pitch-archive.mts`, `bindStateSnapshot`, `review-bench.mts`, `bundle-sync.mts`, `token-consumption.mts`, `ref_node_assert`, `ref_node_child_process`, `state-theme.mts`, `docs-links.test.mts`, `createNodeDeps`, `ref_node_test`, `Pitch: ts-runtime-injection`, `graphify.mts`, `setup-validator.mts`, `Plan: ts-runtime-injection`, `state-html.test.mts`, `add-skill.mts`, `types.mts`, `pitch-compress.mts`, `orca-preflight.mts`, `orca-policy.mts`, `skill-vendors.test.mts`, `bun.mts`, `review-bench.test.mts`, `token-consumption.test.mts`, `orca-policy.test.mts`, `skill-source.mts`, `browser-runtime.test.mts`, `changelog.test.mts`, `orca-preflight.test.mts`, `pre-ship-verify.mts`, `Shipped: ts-runtime-injection`, `G7 migration evidence — 2026-10-07`, `stuck-uphill-detector.mts`, `createPitchCompress`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createNodeDeps()` (e.g. with `readStdin()` and `Deviations: ts-runtime-injection`) actually correct?**
  _`createNodeDeps()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `TsDiagnostic`, `Plain`, `$schema` to the rest of the system?**
  _2072 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `skill-registry.mts` be split into smaller, more focused modules?**
  _Cohesion score 0.06400409626216078 - nodes in this community are weakly interconnected._
- **Why does `createNodeDeps()` connect `createNodeDeps` to `skill-registry.mts`, `node.mts`, `add-skill.test.mts`, `pitch-archive.mts`, `bindStateSnapshot`, `review-bench.mts`, `bundle-sync.mts`, `token-consumption.mts`, `ref_node_assert`, `ref_node_child_process`, `state-theme.mts`, `docs-links.test.mts`, `ref_node_test`, `state-html.test.mts`, `add-skill.mts`, `types.mts`, `pitch-compress.mts`, `orca-preflight.mts`, `orca-policy.mts`, `skill-vendors.test.mts`, `bun.mts`, `token-consumption.test.mts`, `orca-policy.test.mts`, `skill-source.mts`, `browser-runtime.test.mts`, `orca-preflight.test.mts`, `RuntimeDeps`, `pre-ship-verify.mts`, `stuck-uphill-detector.mts`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `RuntimeDeps` (e.g. with `Deviations: ts-runtime-injection` and `Per script `X.js``) actually correct?**
  _`RuntimeDeps` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Should `node.mts` be split into smaller, more focused modules?**
  _Cohesion score 0.10822510822510822 - nodes in this community are weakly interconnected._