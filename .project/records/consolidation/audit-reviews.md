# Audit reviews: connected-memory-consolidation

> Moved from `.project/pitches/connected-memory-consolidation/audit-records/` on 2026-10-23 when the pitch folder was compacted. The content is unchanged; only link targets were rewritten. The original bytes are in the compaction recovery archive.


Reviewer results and read-only witnesses, verbatim. Reviewer prompts are not kept here; their content is in the recovery archive and each result records its prompt hash.

## audit-records/2026-10-23-p2d-p2c-repair/actual-ownership.toon

````toon
@toon-data 1
tracks:
  P2d[12]: ai-framework/scripts/consolidation-migrate.mts,ai-framework/scripts/consolidation-migrate.test.mts,ai-framework/scripts/bundle-sync.mts,ai-framework/scripts/bundle-sync.test.mts,ai-framework/scripts/workflow-doctor.mts,ai-framework/scripts/workflow-doctor.test.mts,ai-framework/scripts/installed-upgrade.test.mts,ai-framework/docs/versioning-and-sync.md,".claude/skills/bundle-sync/SKILL.md",".cursor/skills/bundle-sync/SKILL.md",CHANGELOG.md,VERSION
  P2c[204]: ai-framework/scripts/legacy-upgrade.mts,ai-framework/scripts/legacy-upgrade.test.mts,ai-framework/scripts/consolidation-migrate.mts,ai-framework/scripts/consolidation-migrate.test.mts,ai-framework/scripts/outcome-record.mts,ai-framework/scripts/outcome-record.test.mts,ai-framework/scripts/graphify-refs.mts,ai-framework/scripts/graphify-refs.test.mts,ai-framework/scripts/graphify.mts,ai-framework/scripts/graphify.test.mts,ai-framework/docs/knowledge-graph.md,ai-framework/docs/versioning-and-sync.md,CHANGELOG.md,VERSION,".project/done-work.md",".project/compaction/ledgers/agent-model-sweep.v1.json",".project/compaction/ledgers/bundle-sync-marker-fix.v1.json",".project/compaction/ledgers/codex-orca-coordinator-parity.v1.json",".project/compaction/ledgers/collector-robustness.v1.json",".project/compaction/ledgers/fix-instruction-conflicts.v1.json",".project/compaction/ledgers/fix-orca-dispatch-resume-gate.v1.json",".project/compaction/ledgers/fix-workflow-runner-env.v1.json",".project/compaction/ledgers/independent-rereview-catch-up.v1.json",".project/compaction/ledgers/instruction-compression.v1.json",".project/compaction/ledgers/metrics-report-dimensions.v1.json",".project/compaction/ledgers/native-safety-feasibility.v1.json",".project/compaction/ledgers/opencode-handoff.v1.json",".project/compaction/ledgers/orca-auto-start-all-phases.v1.json",".project/compaction/ledgers/orca-engines-range.v1.json",".project/compaction/ledgers/orca-role-pools.v1.json",".project/compaction/ledgers/orca-vendor-dispatch.v1.json",".project/compaction/ledgers/orca-vendor-foundation.v1.json",".project/compaction/ledgers/orca-vendor-orchestration.v1.json",".project/compaction/ledgers/orca-vendor-reconcile-integration.v1.json",".project/compaction/ledgers/orca-vendor-reconcile.v1.json",".project/compaction/ledgers/path-safety-hardening.v1.json",".project/compaction/ledgers/pitch-compaction.v1.json",".project/compaction/ledgers/portable-skill-defaults.v1.json",".project/compaction/ledgers/portable-skill-installation.v1.json",".project/compaction/ledgers/project-state-report.v1.json",".project/compaction/ledgers/readme-split.v1.json",".project/compaction/ledgers/runner-aware-runtime-boundary-validator.v1.json",".project/compaction/ledgers/runtime-test-helpers.v1.json",".project/compaction/ledgers/shape-lite.v1.json",".project/compaction/ledgers/state-ai-authoring.v1.json",".project/compaction/ledgers/state-deep-evidence.v1.json",".project/compaction/ledgers/state-fragment-sanitizer.v1.json",".project/compaction/ledgers/state-multipage-report.v1.json",".project/compaction/ledgers/state-quoted-fonts.v1.json",".project/compaction/ledgers/state-report-redesign.v1.json",".project/compaction/ledgers/test-execution-performance.v1.json",".project/compaction/ledgers/token-attribution.v1.json",".project/compaction/ledgers/token-time-report.v1.json",".project/compaction/ledgers/toon-machine-data.v1.json",".project/compaction/ledgers/ts-runtime-injection.v1.json",".project/compaction/ledgers/unified-toon-config.v1.json",".project/compaction/ledgers/upstream-project-drift.v1.json",".project/compaction/ledgers/vendor-model-toon.v1.json",".project/compaction/ledgers/workflow-usage-capture.v1.json",".project/compaction/ledgers/workflow-usage-metrics.v1.json",".project/compaction/ledgers/workflow-usage-state.v1.json",".project/records/legacy-upgrades/agent-model-sweep.md",".project/records/legacy-upgrades/bundle-sync-marker-fix.md",".project/records/legacy-upgrades/codex-orca-coordinator-parity.md",".project/records/legacy-upgrades/collector-robustness.md",".project/records/legacy-upgrades/fix-instruction-conflicts.md",".project/records/legacy-upgrades/fix-orca-dispatch-resume-gate.md",".project/records/legacy-upgrades/fix-workflow-runner-env.md",".project/records/legacy-upgrades/independent-rereview-catch-up.md",".project/records/legacy-upgrades/instruction-compression.md",".project/records/legacy-upgrades/metrics-report-dimensions.md",".project/records/legacy-upgrades/native-safety-feasibility.md",".project/records/legacy-upgrades/opencode-handoff.md",".project/records/legacy-upgrades/orca-auto-start-all-phases.md",".project/records/legacy-upgrades/orca-engines-range.md",".project/records/legacy-upgrades/orca-role-pools.md",".project/records/legacy-upgrades/orca-vendor-dispatch.md",".project/records/legacy-upgrades/orca-vendor-foundation.md",".project/records/legacy-upgrades/orca-vendor-orchestration.md",".project/records/legacy-upgrades/orca-vendor-reconcile-integration.md",".project/records/legacy-upgrades/orca-vendor-reconcile.md",".project/records/legacy-upgrades/path-safety-hardening.md",".project/records/legacy-upgrades/pitch-compaction.md",".project/records/legacy-upgrades/portable-skill-defaults.md",".project/records/legacy-upgrades/portable-skill-installation.md",".project/records/legacy-upgrades/project-state-report.md",".project/records/legacy-upgrades/readme-split.md",".project/records/legacy-upgrades/runner-aware-runtime-boundary-validator.md",".project/records/legacy-upgrades/runtime-test-helpers.md",".project/records/legacy-upgrades/shape-lite.md",".project/records/legacy-upgrades/state-ai-authoring-live-runs.md",".project/records/legacy-upgrades/state-ai-authoring.md",".project/records/legacy-upgrades/state-deep-evidence.md",".project/records/legacy-upgrades/state-fragment-sanitizer.md",".project/records/legacy-upgrades/state-multipage-report.md",".project/records/legacy-upgrades/state-quoted-fonts.md",".project/records/legacy-upgrades/state-report-redesign.md",".project/records/legacy-upgrades/test-execution-performance.md",".project/records/legacy-upgrades/token-attribution.md",".project/records/legacy-upgrades/token-time-report.md",".project/records/legacy-upgrades/toon-machine-data.md",".project/records/legacy-upgrades/ts-runtime-injection.md",".project/records/legacy-upgrades/unified-toon-config.md",".project/records/legacy-upgrades/upstream-project-drift.md",".project/records/legacy-upgrades/vendor-model-toon.md",".project/records/legacy-upgrades/workflow-usage-capture.md",".project/records/legacy-upgrades/workflow-usage-metrics.md",".project/records/legacy-upgrades/workflow-usage-state.md",".project/records/shipped/.gitkeep",".project/records/shipped/_template.md",".project/records/shipped/agent-model-sweep.md",".project/records/shipped/bundle-sync-marker-fix.md",".project/records/shipped/codex-orca-coordinator-parity.md",".project/records/shipped/collector-robustness.md",".project/records/shipped/fix-instruction-conflicts.md",".project/records/shipped/fix-orca-dispatch-resume-gate.md",".project/records/shipped/fix-workflow-runner-env.md",".project/records/shipped/independent-rereview-catch-up.md",".project/records/shipped/instruction-compression.md",".project/records/shipped/metrics-report-dimensions.md",".project/records/shipped/native-safety-feasibility.md",".project/records/shipped/opencode-handoff.md",".project/records/shipped/orca-auto-start-all-phases.md",".project/records/shipped/orca-engines-range.md",".project/records/shipped/orca-role-pools.md",".project/records/shipped/orca-vendor-dispatch.md",".project/records/shipped/orca-vendor-foundation.md",".project/records/shipped/orca-vendor-orchestration.md",".project/records/shipped/orca-vendor-reconcile-integration.md",".project/records/shipped/orca-vendor-reconcile.md",".project/records/shipped/path-safety-hardening.md",".project/records/shipped/pitch-compaction.md",".project/records/shipped/portable-skill-defaults.md",".project/records/shipped/portable-skill-installation.md",".project/records/shipped/project-state-report.md",".project/records/shipped/readme-split.md",".project/records/shipped/runner-aware-runtime-boundary-validator.md",".project/records/shipped/runtime-test-helpers.md",".project/records/shipped/shape-lite.md",".project/records/shipped/state-ai-authoring.md",".project/records/shipped/state-deep-evidence.md",".project/records/shipped/state-fragment-sanitizer.md",".project/records/shipped/state-multipage-report.md",".project/records/shipped/state-quoted-fonts.md",".project/records/shipped/state-report-redesign.md",".project/records/shipped/test-execution-performance.md",".project/records/shipped/token-attribution.md",".project/records/shipped/token-time-report.md",".project/records/shipped/toon-machine-data.md",".project/records/shipped/ts-runtime-injection.md",".project/records/shipped/unified-toon-config.md",".project/records/shipped/upstream-project-drift.md",".project/records/shipped/vendor-model-toon.md",".project/records/shipped/workflow-usage-capture.md",".project/records/shipped/workflow-usage-metrics.md",".project/records/shipped/workflow-usage-state.md",".project/compaction/ledgers/agent-model-sweep.json",".project/compaction/ledgers/bundle-sync-marker-fix.json",".project/compaction/ledgers/codex-orca-coordinator-parity.json",".project/compaction/ledgers/collector-robustness.json",".project/compaction/ledgers/fix-instruction-conflicts.json",".project/compaction/ledgers/fix-orca-dispatch-resume-gate.json",".project/compaction/ledgers/fix-workflow-runner-env.json",".project/compaction/ledgers/independent-rereview-catch-up.json",".project/compaction/ledgers/instruction-compression.json",".project/compaction/ledgers/metrics-report-dimensions.json",".project/compaction/ledgers/native-safety-feasibility.json",".project/compaction/ledgers/opencode-handoff.json",".project/compaction/ledgers/orca-auto-start-all-phases.json",".project/compaction/ledgers/orca-engines-range.json",".project/compaction/ledgers/orca-role-pools.json",".project/compaction/ledgers/orca-vendor-dispatch.json",".project/compaction/ledgers/orca-vendor-foundation.json",".project/compaction/ledgers/orca-vendor-orchestration.json",".project/compaction/ledgers/orca-vendor-reconcile-integration.json",".project/compaction/ledgers/orca-vendor-reconcile.json",".project/compaction/ledgers/path-safety-hardening.json",".project/compaction/ledgers/pitch-compaction.json",".project/compaction/ledgers/portable-skill-defaults.json",".project/compaction/ledgers/portable-skill-installation.json",".project/compaction/ledgers/project-state-report.json",".project/compaction/ledgers/readme-split.json",".project/compaction/ledgers/runner-aware-runtime-boundary-validator.json",".project/compaction/ledgers/runtime-test-helpers.json",".project/compaction/ledgers/shape-lite.json",".project/compaction/ledgers/state-ai-authoring.json",".project/compaction/ledgers/state-deep-evidence.json",".project/compaction/ledgers/state-fragment-sanitizer.json",".project/compaction/ledgers/state-multipage-report.json",".project/compaction/ledgers/state-quoted-fonts.json",".project/compaction/ledgers/state-report-redesign.json",".project/compaction/ledgers/test-execution-performance.json",".project/compaction/ledgers/token-attribution.json",".project/compaction/ledgers/token-time-report.json",".project/compaction/ledgers/toon-machine-data.json",".project/compaction/ledgers/ts-runtime-injection.json",".project/compaction/ledgers/unified-toon-config.json",".project/compaction/ledgers/upstream-project-drift.json",".project/compaction/ledgers/vendor-model-toon.json",".project/compaction/ledgers/workflow-usage-capture.json",".project/compaction/ledgers/workflow-usage-metrics.json",".project/compaction/ledgers/workflow-usage-state.json",ai-framework/scripts/pitch-compress.mts,ai-framework/scripts/pitch-compress.test.mts
  repair[2]: ai-framework/scripts/state-fragment-dataset.test.mts,".project/records/legacy-upgrades/state-ai-authoring-live-runs.md"
sequencedSharedFiles: "R14 and D24/D29: main writes P1/P2a, then P2d, then P2c, then exact repair; shared helpers and release metadata have one writer at a time. P2d exports consumed by P2c; P2c data outcomes already refer to retained repair matrix summary and new asset adds the exact table."
otherActive[3]:
  -
    slug: workflow-v3-rollout
    state: "shaped, un-bet; downstream repositories only"
    writes[0]:
    potentialPaths[3]: per-project ai-framework/,".project/",ai-workflow.toon
    dependsOn: "P1/P2a/P2d shipped, P2c preferably shipped"
  -
    slug: package-less-ship-verification
    state: "draft, un-bet"
    writes[0]:
    potentialPaths[3]: ai-framework/hooks/scripts/pre-ship-verify.mts,".project/context/stack.md",ai-framework/workflow/phases/4-ship.md
  -
    slug: orca-bounded-control-receipts
    state: "draft, un-bet"
    writes[0]:
    potentialPaths[3]: ai-framework/scripts/orca-start.mts,ai-framework/scripts/orca-preflight.mts,Orca launch/claim adapter
attribution: "Plan table and deviations D18-D31 own these slices, not the aggregate dirty diff. Tool artifacts under the active consolidation pitch and runs are shared coordinator tracking. No parallel production writers."
releaseAttribution:
  P1: "2.42.0"
  P2a: "2.43.0"
  P2d[3]: "2.44.0","2.45.0","2.45.1"
  P2c[4]: "2.46.0","2.47.0","2.48.0","2.48.1"
  writer: "coordinator only, sequential per scope"
````

## audit-records/2026-10-23-p2d-p2c-repair/baseline-provenance.toon

````toon
@toon-data 1
originalRef: b26b45b
selectedPaths[742]: ".agents/skills/add-skill/SKILL.md",".agents/skills/audit/SKILL.md",".agents/skills/build/SKILL.md",".agents/skills/bundle-sync/SKILL.md",".agents/skills/changelog/SKILL.md",".agents/skills/checkpoint/SKILL.md",".agents/skills/cooldown/SKILL.md",".agents/skills/critique/SKILL.md",".agents/skills/dependency-security/SKILL.md",".agents/skills/eval-harness/SKILL.md",".agents/skills/fix/SKILL.md",".agents/skills/impact/SKILL.md",".agents/skills/knowledge-health/SKILL.md",".agents/skills/pitch-compress/SKILL.md",".agents/skills/plan/SKILL.md",".agents/skills/resume/SKILL.md",".agents/skills/search/SKILL.md",".agents/skills/setup-validator/SKILL.md",".agents/skills/setup/SKILL.md",".agents/skills/shape-lite/SKILL.md",".agents/skills/shape/SKILL.md",".agents/skills/ship/SKILL.md",".agents/skills/state/SKILL.md",".agents/skills/switch/SKILL.md",".agents/skills/sync/SKILL.md",".agents/skills/test-strategy/SKILL.md",".agents/skills/ui-design/SKILL.md",".agents/skills/workflow-doctor/SKILL.md",".claude/agents/appetite-auditor.md",".claude/agents/architect.md",".claude/agents/build-error-resolver.md",".claude/agents/code-reviewer.md",".claude/agents/cross-pitch-conflict-checker.md",".claude/agents/cross-pitch-projector.md",".claude/agents/eval-regression-projector.md",".claude/agents/eval-runner.md",".claude/agents/i18n-checker.md",".claude/agents/knowledge-historian.md",".claude/agents/planner.md",".claude/agents/refactor-cleaner.md",".claude/agents/security-reviewer.md",".claude/agents/skeptic.md",".claude/agents/test-coverage-checker.md",".claude/agents/ux-reviewer.md",".claude/hooks/post-edit-check.mts",".claude/hooks/post-edit-check.test.mts",".claude/settings.json",".claude/skills/add-skill/SKILL.md",".claude/skills/audit/SKILL.md",".claude/skills/build/SKILL.md",".claude/skills/bundle-sync/SKILL.md",".claude/skills/changelog/SKILL.md",".claude/skills/checkpoint/SKILL.md",".claude/skills/cooldown/SKILL.md",".claude/skills/critique/SKILL.md",".claude/skills/dependency-security/SKILL.md",".claude/skills/eval-harness/SKILL.md",".claude/skills/fix/SKILL.md",".claude/skills/impact/SKILL.md",".claude/skills/knowledge-health/SKILL.md",".claude/skills/pitch-compress/SKILL.md",".claude/skills/plan/SKILL.md",".claude/skills/resume/SKILL.md",".claude/skills/search/SKILL.md",".claude/skills/setup-validator/SKILL.md",".claude/skills/setup/SKILL.md",".claude/skills/shape-lite/SKILL.md",".claude/skills/shape/SKILL.md",".claude/skills/ship/SKILL.md",".claude/skills/state/SKILL.md",".claude/skills/switch/SKILL.md",".claude/skills/sync/SKILL.md",".claude/skills/test-strategy/SKILL.md",".claude/skills/ui-design/SKILL.md",".claude/skills/workflow-doctor/SKILL.md",".codex/agents/appetite-auditor.toml",".codex/agents/architect.toml",".codex/agents/build-error-resolver.toml",".codex/agents/code-reviewer.toml",".codex/agents/cross-pitch-conflict-checker.toml",".codex/agents/cross-pitch-projector.toml",".codex/agents/eval-regression-projector.toml",".codex/agents/eval-runner.toml",".codex/agents/i18n-checker.toml",".codex/agents/knowledge-historian.toml",".codex/agents/planner.toml",".codex/agents/refactor-cleaner.toml",".codex/agents/security-reviewer.toml",".codex/agents/skeptic.toml",".codex/agents/test-coverage-checker.toml",".codex/agents/ux-reviewer.toml",".codex/hooks.json",".cursor/agents/appetite-auditor.md",".cursor/agents/architect.md",".cursor/agents/build-error-resolver.md",".cursor/agents/code-reviewer.md",".cursor/agents/cross-pitch-conflict-checker.md",".cursor/agents/cross-pitch-projector.md",".cursor/agents/eval-regression-projector.md",".cursor/agents/eval-runner.md",".cursor/agents/i18n-checker.md",".cursor/agents/knowledge-historian.md",".cursor/agents/planner.md",".cursor/agents/refactor-cleaner.md",".cursor/agents/security-reviewer.md",".cursor/agents/skeptic.md",".cursor/agents/test-coverage-checker.md",".cursor/agents/ux-reviewer.md",".cursor/skills/add-skill/SKILL.md",".cursor/skills/audit/SKILL.md",".cursor/skills/build/SKILL.md",".cursor/skills/bundle-sync/SKILL.md",".cursor/skills/changelog/SKILL.md",".cursor/skills/checkpoint/SKILL.md",".cursor/skills/cooldown/SKILL.md",".cursor/skills/critique/SKILL.md",".cursor/skills/dependency-security/SKILL.md",".cursor/skills/eval-harness/SKILL.md",".cursor/skills/fix/SKILL.md",".cursor/skills/impact/SKILL.md",".cursor/skills/knowledge-health/SKILL.md",".cursor/skills/pitch-compress/SKILL.md",".cursor/skills/plan/SKILL.md",".cursor/skills/resume/SKILL.md",".cursor/skills/search/SKILL.md",".cursor/skills/setup-validator/SKILL.md",".cursor/skills/setup/SKILL.md",".cursor/skills/shape-lite/SKILL.md",".cursor/skills/shape/SKILL.md",".cursor/skills/ship/SKILL.md",".cursor/skills/state/SKILL.md",".cursor/skills/switch/SKILL.md",".cursor/skills/sync/SKILL.md",".cursor/skills/test-strategy/SKILL.md",".cursor/skills/ui-design/SKILL.md",".cursor/skills/workflow-doctor/SKILL.md",".gitignore",".graphifyignore",".opencode/agents/appetite-auditor.md",".opencode/agents/architect.md",".opencode/agents/build-error-resolver.md",".opencode/agents/code-reviewer.md",".opencode/agents/cross-pitch-conflict-checker.md",".opencode/agents/cross-pitch-projector.md",".opencode/agents/eval-regression-projector.md",".opencode/agents/eval-runner.md",".opencode/agents/i18n-checker.md",".opencode/agents/knowledge-historian.md",".opencode/agents/planner.md",".opencode/agents/refactor-cleaner.md",".opencode/agents/security-reviewer.md",".opencode/agents/skeptic.md",".opencode/agents/test-coverage-checker.md",".opencode/agents/ux-reviewer.md",".opencode/commands/add-skill.md",".opencode/commands/audit.md",".opencode/commands/build.md",".opencode/commands/bundle-sync.md",".opencode/commands/changelog.md",".opencode/commands/checkpoint.md",".opencode/commands/cooldown.md",".opencode/commands/critique.md",".opencode/commands/dependency-security.md",".opencode/commands/eval-harness.md",".opencode/commands/fix.md",".opencode/commands/impact.md",".opencode/commands/knowledge-health.md",".opencode/commands/pitch-compress.md",".opencode/commands/plan.md",".opencode/commands/resume.md",".opencode/commands/search.md",".opencode/commands/setup-validator.md",".opencode/commands/setup.md",".opencode/commands/shape-lite.md",".opencode/commands/shape.md",".opencode/commands/ship.md",".opencode/commands/state.md",".opencode/commands/switch.md",".opencode/commands/sync.md",".opencode/commands/test-strategy.md",".opencode/commands/ui-design.md",".opencode/commands/workflow-doctor.md",".opencode/opencode.json",".opencode/plugins/token-consumption.ts",".project/analysis/2026-10-16-upstream-drift-ledger-analysis.md",".project/analysis/2026-10-18-agent-load-inventory-analysis.md",".project/analysis/2026-10-18-instruction-compression-s3-review-analysis.md",".project/analysis/README.md",".project/analysis/native-safety-feasibility/bench.py",".project/analysis/native-safety-feasibility/bench.test.mts",".project/analysis/native-safety-feasibility/evidence.json",".project/analysis/native-safety-feasibility/report.md",".project/compaction/ledgers/agent-model-sweep.json",".project/compaction/ledgers/bundle-sync-marker-fix.json",".project/compaction/ledgers/codex-orca-coordinator-parity.json",".project/compaction/ledgers/collector-robustness.json",".project/compaction/ledgers/fix-instruction-conflicts.json",".project/compaction/ledgers/fix-orca-dispatch-resume-gate.json",".project/compaction/ledgers/fix-workflow-runner-env.json",".project/compaction/ledgers/independent-rereview-catch-up.json",".project/compaction/ledgers/instruction-compression.json",".project/compaction/ledgers/metrics-report-dimensions.json",".project/compaction/ledgers/native-safety-feasibility.json",".project/compaction/ledgers/opencode-handoff.json",".project/compaction/ledgers/orca-auto-start-all-phases.json",".project/compaction/ledgers/orca-engines-range.json",".project/compaction/ledgers/orca-role-pools.json",".project/compaction/ledgers/orca-vendor-dispatch.json",".project/compaction/ledgers/orca-vendor-foundation.json",".project/compaction/ledgers/orca-vendor-orchestration.json",".project/compaction/ledgers/orca-vendor-reconcile-integration.json",".project/compaction/ledgers/orca-vendor-reconcile.json",".project/compaction/ledgers/path-safety-hardening.json",".project/compaction/ledgers/pitch-compaction.json",".project/compaction/ledgers/portable-skill-defaults.json",".project/compaction/ledgers/portable-skill-installation.json",".project/compaction/ledgers/project-state-report.json",".project/compaction/ledgers/readme-split.json",".project/compaction/ledgers/runner-aware-runtime-boundary-validator.json",".project/compaction/ledgers/runtime-test-helpers.json",".project/compaction/ledgers/shape-lite.json",".project/compaction/ledgers/state-ai-authoring.json",".project/compaction/ledgers/state-deep-evidence.json",".project/compaction/ledgers/state-fragment-sanitizer.json",".project/compaction/ledgers/state-multipage-report.json",".project/compaction/ledgers/state-quoted-fonts.json",".project/compaction/ledgers/state-report-redesign.json",".project/compaction/ledgers/test-execution-performance.json",".project/compaction/ledgers/token-attribution.json",".project/compaction/ledgers/token-time-report.json",".project/compaction/ledgers/toon-machine-data.json",".project/compaction/ledgers/ts-runtime-injection.json",".project/compaction/ledgers/unified-toon-config.json",".project/compaction/ledgers/upstream-project-drift.json",".project/compaction/ledgers/vendor-model-toon.json",".project/compaction/ledgers/workflow-usage-capture.json",".project/compaction/ledgers/workflow-usage-metrics.json",".project/compaction/ledgers/workflow-usage-state.json",".project/compaction/previews/2026-09-26-finished-pitches.json",".project/compaction/previews/2026-09-26-finished-pitches.md",".project/compaction/previews/bundle-sync-marker-fix-ledger.json",".project/compaction/previews/bundle-sync-marker-fix-summary.md",".project/compaction/previews/independent-rereview-catch-up-deletion.json",".project/compaction/previews/independent-rereview-catch-up-deletion.md",".project/compaction/previews/independent-rereview-catch-up-ledger.json",".project/compaction/previews/independent-rereview-catch-up-summary.md",".project/compaction/previews/native-safety-feasibility-ledger.json",".project/compaction/previews/native-safety-feasibility-summary.md",".project/compaction/previews/state-quoted-fonts-ledger.json",".project/compaction/previews/state-quoted-fonts-summary.md",".project/context/README.md",".project/context/architecture.md",".project/context/codex-handoff.md",".project/context/opencode-handoff.md",".project/context/product.md",".project/context/stack.md",".project/decisions/toon-data-grammar.md",".project/decisions/toon-subset-grammar.md",".project/design/decisions/template.md",".project/design/plans/rollback-template.md",".project/design/plans/template.md",".project/design/template.md",".project/design/wireframes/template.md",".project/done-work.md",".project/evals/datasets/instruction-compression.json",".project/evals/datasets/orca-vendor-orchestration.json",".project/evals/datasets/state-ai-authoring.json",".project/evals/datasets/state-ai-fragments.json",".project/evals/datasets/state-deep-evidence.json",".project/evals/datasets/toon-machine-data.json",".project/knowledge/README.md",".project/knowledge/decisions/caveman-mode-is-default-everywhere.md",".project/knowledge/decisions/collector-metrics-lease-design.md",".project/knowledge/decisions/compaction-recovery-shares-context-and-trusted-directories.md",".project/knowledge/decisions/data-files-use-their-own-toon-grammar-not-the-config-parser.md",".project/knowledge/decisions/effective-sync-bases-and-bounded-font-discovery.md",".project/knowledge/decisions/inode-anchoring-and-stable-inode-locks.md",".project/knowledge/decisions/orca-auto-start-design.md",".project/knowledge/decisions/pitch-compaction-gate-and-recovery-design.md",".project/knowledge/decisions/profile-detection-lives-in-frontmatter-not-in-the-model-id.md",".project/knowledge/decisions/project-state-report-design.md",".project/knowledge/decisions/runtime-boundary-validator-design.md",".project/knowledge/decisions/shape-lite-is-a-gated-escalating-variant-of-shape.md",".project/knowledge/decisions/skill-defaults-attribution-guard-and-runtime-design.md",".project/knowledge/decisions/token-metrics-dimensions-design.md",".project/knowledge/decisions/unified-toon-config-schema-v2.md",".project/knowledge/decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers.md",".project/knowledge/entities/graphify.md",".project/knowledge/entities/orca-policy.md",".project/knowledge/index.md",".project/knowledge/issues/a-forced-fold-loop-spins-on-a-hand-edited-frontier.md",".project/knowledge/issues/a-headless-cli-follows-pwd-not-the-process-cwd.md",".project/knowledge/issues/a-local-workflow-env-file-changes-which-runner-path-tests-spawn.md",".project/knowledge/issues/a-missing-tracked-file-is-not-an-undeleted-deletion.md",".project/knowledge/issues/a-nested-node-test-child-inherits-the-parents-test-context.md",".project/knowledge/issues/a-probe-child-ran-a-bare-command-with-the-parent-path.md",".project/knowledge/issues/a-schema-version-bump-left-98-stale-tests-and-the-migrator-on-the-old-version.md",".project/knowledge/issues/a-simulated-clock-ahead-of-undelivered-events-folds-them-away.md",".project/knowledge/issues/a-sparse-array-hole-skips-every-but-visits-for-of.md",".project/knowledge/issues/a-temp-helper-that-realpaths-silently-voids-an-alias-guard.md",".project/knowledge/issues/a-workers-passing-tests-can-encode-the-wrong-data-shape.md",".project/knowledge/issues/an-audit-scratch-copy-must-run-its-own-suites.md",".project/knowledge/issues/an-idempotent-replay-path-returned-success-without-re-checking-the-gate.md",".project/knowledge/issues/an-interactive-shell-prompt-can-consume-an-agent-launch-command.md",".project/knowledge/issues/an-unbounded-mutation-run-hangs-on-a-mutant-that-removes-a-stall-guard.md",".project/knowledge/issues/an-unquoted-test-command-variable-fails-silently-under-zsh.md",".project/knowledge/issues/async-agent-launch-hook-counted-as-completion.md",".project/knowledge/issues/backtracking-regex-over-untrusted-text-is-quadratic.md",".project/knowledge/issues/bare-prefix-match-crosses-entities.md",".project/knowledge/issues/counting-untrusted-labels-in-a-plain-object-inherits-prototype-keys.md",".project/knowledge/issues/coverage-instrumentation-changes-exact-child-environments.md",".project/knowledge/issues/editing-a-canonical-file-alone-breaks-the-byte-identity-mirror-check.md",".project/knowledge/issues/false-cross-pitch-attribution-in-a-shared-uncommitted-file.md",".project/knowledge/issues/guard-tests-can-fail-for-the-wrong-reason.md",".project/knowledge/issues/hardening-a-shared-reader-made-its-writer-destructive.md",".project/knowledge/issues/history-projections-can-leak-hidden-values.md",".project/knowledge/issues/installed-skill-wrappers-ship-as-orphans.md",".project/knowledge/issues/instruction-copies-drift-into-contradictions.md",".project/knowledge/issues/macos-tmpdir-realpath-alias-breaks-path-assertions.md",".project/knowledge/issues/metrics-ancestor-swap-during-async-lease.md",".project/knowledge/issues/mutation-script-killed-leaves-source-mutated.md",".project/knowledge/issues/native-capture-needs-state-boundary-attribution.md",".project/knowledge/issues/node-strip-only-mode-rejects-constructor-parameter-properties.md",".project/knowledge/issues/orca-model-preflight-can-leave-unproven-ledger-ownership.md",".project/knowledge/issues/orca-workers-differ-from-the-coordinator-environment.md",".project/knowledge/issues/package-less-bundle-ship-wrapper-cannot-select-checks.md",".project/knowledge/issues/prose-instructions-must-specify-how-to-extract-from-free-form-arguments.md",".project/knowledge/issues/reusing-a-transaction-exposes-its-lock-reader-to-new-callers.md",".project/knowledge/issues/review-guard-hashes-ignored-secret-files.md",".project/knowledge/issues/review-guard-snapshot-can-outgrow-its-reader.md",".project/knowledge/issues/reviewer-reports-contradicted-by-measurement.md",".project/knowledge/issues/rounded-zero-timeout-disables-cancellation.md",".project/knowledge/issues/runcli-replaces-proc-argv-with-the-arguments-only.md",".project/knowledge/issues/snapshot-metadata-bypassed-output-scrubbing.md",".project/knowledge/issues/staging-substitution-can-redirect-cleanup.md",".project/knowledge/issues/status-dispatch-ready-false-is-not-launch-authority.md",".project/knowledge/issues/substring-hook-wiring-check-accepts-echoed-commands.md",".project/knowledge/issues/test-skip-is-a-follow-up-not-a-finish.md",".project/knowledge/meta/usage-log.md",".project/knowledge/patterns/a-blocking-hook-owns-its-runner-and-its-deadline.md",".project/knowledge/patterns/a-caller-supplied-limits-object-can-defeat-a-hard-cap.md",".project/knowledge/patterns/a-compression-pilot-keeps-failed-candidates-and-defers.md",".project/knowledge/patterns/a-gate-must-not-audit-its-own-instrument.md",".project/knowledge/patterns/a-gate-must-not-trust-its-own-author.md",".project/knowledge/patterns/a-gate-spawns-exactly-what-it-probed.md",".project/knowledge/patterns/a-golden-dataset-case-counts-only-when-a-named-test-passes.md",".project/knowledge/patterns/a-grader-reports-executed-and-unexecuted-cases-separately.md",".project/knowledge/patterns/a-lease-refused-capture-leaves-a-bounded-marker-for-the-next-lease.md",".project/knowledge/patterns/a-measured-redundant-layer-is-not-a-deleted-layer.md",".project/knowledge/patterns/a-pitch-can-pass-its-own-tests-and-break-on-the-real-file.md",".project/knowledge/patterns/a-planted-canary-makes-a-reviewer-finding-checkable.md",".project/knowledge/patterns/a-prose-example-in-a-model-instruction-is-followed-literally.md",".project/knowledge/patterns/a-report-never-overwrites-a-file-it-did-not-write.md",".project/knowledge/patterns/a-report-over-an-untrusted-tree-runs-only-bundle-code.md",".project/knowledge/patterns/a-source-scanner-fails-closed-on-what-it-cannot-read.md",".project/knowledge/patterns/a-thin-cli-keeps-every-guard-in-the-library.md",".project/knowledge/patterns/a-version-migrator-edits-the-token-not-the-model.md",".project/knowledge/patterns/a-writer-reinspects-the-target-at-the-publish-step.md",".project/knowledge/patterns/allow-list-untrusted-labels-at-ingest-and-at-render.md",".project/knowledge/patterns/an-ownership-predicate-must-mirror-the-claim-transactions-set.md",".project/knowledge/patterns/checks-on-doc-structure-name-the-owning-file.md",".project/knowledge/patterns/convert-a-format-only-where-an-agent-loads-the-file-and-measure-it.md",".project/knowledge/patterns/display-buckets-are-not-lifecycle-identities.md",".project/knowledge/patterns/dual-hash-tracking-for-transformed-content.md",".project/knowledge/patterns/git-against-a-workers-tree-runs-worker-code-unless-every-command-is-guarded.md",".project/knowledge/patterns/join-metrics-by-exact-identity-and-disclose-evidence-windows.md",".project/knowledge/patterns/keep-the-fakes-guarantee-the-thing-they-replace.md",".project/knowledge/patterns/local-eval-data-is-gitignored.md",".project/knowledge/patterns/mandatory-config-files-emit-one-top-level-failure.md",".project/knowledge/patterns/observational-hooks-check-budget-before-acquiring-a-lease.md",".project/knowledge/patterns/one-boundary-selects-the-child-runner.md",".project/knowledge/patterns/one-owner-per-instruction-topic-guarded-by-contract-tests.md",".project/knowledge/patterns/opt-in-before-runtime-discovery.md",".project/knowledge/patterns/parse-untrusted-values-and-re-emit-them.md",".project/knowledge/patterns/path-containment-compares-real-paths.md",".project/knowledge/patterns/pin-directory-identities-across-async-leases.md",".project/knowledge/patterns/prove-a-guard-test-with-an-in-memory-mutant.md",".project/knowledge/patterns/read-before-the-lease-commit-cursor-and-totals-together.md",".project/knowledge/patterns/reconcile-every-worker-of-a-wave-before-committing-any-scope.md",".project/knowledge/patterns/replace-a-library-with-a-fixture-table-from-the-library.md",".project/knowledge/patterns/resolve-before-matching-a-protected-path-allowlist.md",".project/knowledge/patterns/resolve-config-only-from-trusted-root.md",".project/knowledge/patterns/retry-only-on-positive-proof-of-a-clean-failure.md",".project/knowledge/patterns/reversible-aggregates-store-their-routing.md",".project/knowledge/patterns/settle-only-with-proof-bound-to-this-patch.md",".project/knowledge/patterns/subprocess-revalidation-against-on-disk-code.md",".project/knowledge/patterns/sync-tools-refuse-symlinks-in-source-and-destination.md",".project/knowledge/patterns/untrusted-text-reaches-the-terminal-through-error-messages.md",".project/knowledge/patterns/verify-run-binding-before-orca-dispatch.md",".project/knowledge/patterns/warn-text-must-be-self-consistent-with-the-code-it-ships.md",".project/knowledge/patterns/warn-text-patches-need-their-own-test-assertion.md",".project/knowledge/patterns/word-boundary-replacement-does-not-see-a-prefixed-property.md",".project/knowledge/templates/decision.md",".project/knowledge/templates/entity.md",".project/knowledge/templates/issue.md",".project/knowledge/templates/pattern.md",".project/pitches/_followups.md",".project/records/pitch-compression/bundle-sync-marker-fix.md",".project/records/pitch-compression/fix-workflow-runner-env.md",".project/records/pitch-compression/independent-rereview-catch-up.md",".project/records/pitch-compression/native-safety-feasibility.md",".project/records/pitch-compression/orca-vendor-dispatch.md",".project/records/pitch-compression/orca-vendor-foundation.md",".project/records/pitch-compression/orca-vendor-orchestration.md",".project/records/pitch-compression/orca-vendor-reconcile-integration.md",".project/records/pitch-compression/orca-vendor-reconcile.md",".project/records/pitch-compression/readme-split.md",".project/records/pitch-compression/runtime-test-helpers.md",".project/records/pitch-compression/state-quoted-fonts.md",".project/records/pitch-compression/ts-runtime-injection.md",".project/records/pitch-compression/workflow-usage-metrics.md",".project/records/unfinished-pitches-assessment-2026-09-27.md",".project/reports/README.md",".project/requirements/bugs/template.md",".project/requirements/features/template.md",".project/rules/README.md",".project/runs/2026-09-25-metrics-report-dimensions-hill.md",".project/runs/2026-09-25-metrics-report-dimensions.md",".project/runs/2026-09-25-pitch-compaction-hill.md",".project/runs/2026-09-25-pitch-compaction.md",".project/runs/2026-09-25-portable-skill-defaults-hill.md",".project/runs/2026-09-25-portable-skill-defaults.md",".project/runs/2026-09-25-portable-skill-installation-hill.md",".project/runs/2026-09-25-portable-skill-installation.md",".project/runs/2026-09-25-project-state-report-hill.md",".project/runs/2026-09-25-project-state-report.md",".project/runs/2026-09-26-bundle-sync-marker-fix.md",".project/runs/2026-09-26-native-safety-feasibility-hill.md",".project/runs/2026-09-26-native-safety-feasibility.md",".project/runs/2026-09-26-state-quoted-fonts.md",".project/runs/2026-09-27-collector-robustness.md",".project/runs/2026-09-27-independent-rereview-catch-up.md",".project/runs/2026-09-27-path-safety-hardening.md",".project/runs/2026-10-07-orca-vendor-foundation-hill.md",".project/runs/2026-10-07-orca-vendor-foundation.md",".project/runs/2026-10-07-shape-lite.md",".project/runs/2026-10-08-codex-orca-coordinator-parity-hill.md",".project/runs/2026-10-08-codex-orca-coordinator-parity.md",".project/runs/2026-10-08-fix-orca-dispatch-resume-gate.md",".project/runs/2026-10-08-fix-workflow-runner-env.md",".project/runs/2026-10-08-orca-auto-start-all-phases-hill.md",".project/runs/2026-10-08-orca-auto-start-all-phases.md",".project/runs/2026-10-08-orca-vendor-dispatch.md",".project/runs/2026-10-08-orca-vendor-reconcile-integration.md",".project/runs/2026-10-08-orca-vendor-reconcile.md",".project/runs/2026-10-08-readme-split.md",".project/runs/2026-10-08-runner-aware-runtime-boundary-validator-hill.md",".project/runs/2026-10-08-runner-aware-runtime-boundary-validator.md",".project/runs/2026-10-08-runtime-test-helpers-hill.md",".project/runs/2026-10-08-runtime-test-helpers.md",".project/runs/2026-10-08-state-multipage-report-hill.md",".project/runs/2026-10-08-state-multipage-report.md",".project/runs/2026-10-08-ts-runtime-injection.md",".project/runs/2026-10-08-workflow-usage-metrics-hill.md",".project/runs/2026-10-08-workflow-usage-metrics.md",".project/runs/2026-10-16-agent-model-sweep.md",".project/runs/2026-10-16-orca-engines-range.md",".project/runs/2026-10-16-unified-toon-config-hill.md",".project/runs/2026-10-16-unified-toon-config.md",".project/runs/2026-10-16-upstream-project-drift-hill.md",".project/runs/2026-10-16-upstream-project-drift.md",".project/runs/2026-10-17-orca-role-pools.md",".project/runs/2026-10-17-vendor-model-toon.md",".project/runs/2026-10-18-fix-instruction-conflicts.md",".project/runs/2026-10-19-instruction-compression-hill.md",".project/runs/2026-10-19-instruction-compression.md",".project/runs/2026-10-19-state-report-redesign-hill.md",".project/runs/2026-10-19-state-report-redesign.md",".project/runs/2026-10-19-token-attribution-hill.md",".project/runs/2026-10-19-token-attribution.md",".project/runs/2026-10-19-toon-machine-data-hill.md",".project/runs/2026-10-19-toon-machine-data.md",".project/runs/2026-10-20-state-ai-authoring-hill.md",".project/runs/2026-10-20-state-ai-authoring.md",".project/runs/2026-10-20-state-fragment-sanitizer-hill.md",".project/runs/2026-10-20-state-fragment-sanitizer.md",".project/runs/2026-10-20-workflow-usage-state-hill.md",".project/runs/2026-10-20-workflow-usage-state.md",".project/runs/2026-10-21-state-deep-evidence-hill.md",".project/runs/2026-10-21-state-deep-evidence.md",".project/runs/2026-10-21-test-execution-performance-hill.md",".project/runs/2026-10-21-test-execution-performance.md",".project/runs/2026-10-21-token-time-report-closure.json",".project/runs/2026-10-21-token-time-report-evidence.tar.gz",".project/runs/2026-10-21-token-time-report-evidence.tar.gz.manifest.json",".project/runs/2026-10-21-token-time-report-hill.md",".project/runs/2026-10-21-token-time-report-readiness.json",".project/runs/2026-10-21-token-time-report.md",".project/runs/2026-10-21-workflow-usage-capture-audit-evidence.manifest.json",".project/runs/2026-10-21-workflow-usage-capture-audit-evidence.tar.gz",".project/runs/2026-10-21-workflow-usage-capture-hill.md",".project/runs/2026-10-21-workflow-usage-capture.md",".project/runs/README.md",".project/runs/cooldown-2026-09-25.md",".project/runs/cooldown-2026-09-26.md",".project/runs/cooldown-2026-10-07.md",".project/runs/cooldown-2026-10-08-codex-orca-coordinator-parity.md",".project/runs/cooldown-2026-10-08-manual.md",".project/runs/cooldown-2026-10-08.md",".project/runs/cooldown-2026-10-17.md",".project/runs/cooldown-2026-10-21-forced.md",".project/runs/cooldown-2026-10-21.md",".project/runs/orca-smoke-2026-10-08.md",".project/status.md",AGENTS.md,CHANGELOG.md,CLAUDE.md,README.md,VERSION,ai-framework/docs/design-notes.md,ai-framework/docs/extending.md,ai-framework/docs/knowledge-graph.md,ai-framework/docs/pipeline.md,ai-framework/docs/setup-validator.md,ai-framework/docs/setup.md,ai-framework/docs/testing.md,ai-framework/docs/token-consumption.md,ai-framework/docs/vendors.md,ai-framework/docs/versioning-and-sync.md,ai-framework/docs/what-you-get.md,ai-framework/docs/workflow-doctor.md,ai-framework/hooks/hooks.json,ai-framework/hooks/scripts/metrics-lock.mts,ai-framework/hooks/scripts/metrics-lock.test.mts,ai-framework/hooks/scripts/opencode-plugin.test.mts,ai-framework/hooks/scripts/orca-start-codex-hook.mts,ai-framework/hooks/scripts/orca-start-codex-hook.test.mts,ai-framework/hooks/scripts/orca-start-hook.mts,ai-framework/hooks/scripts/orca-start-hook.test.mts,ai-framework/hooks/scripts/pre-ship-verify.mts,ai-framework/hooks/scripts/pre-ship-verify.test.mts,ai-framework/hooks/scripts/stuck-uphill-detector.mts,ai-framework/hooks/scripts/stuck-uphill-detector.test.mts,ai-framework/hooks/scripts/token-consumption.mts,ai-framework/hooks/scripts/token-consumption.test.mts,ai-framework/hooks/scripts/token-report.mts,ai-framework/hooks/scripts/token-report.test.mts,ai-framework/hooks/scripts/transcript-usage.mts,ai-framework/hooks/scripts/transcript-usage.test.mts,ai-framework/hooks/scripts/workflow-capture.mts,ai-framework/hooks/scripts/workflow-capture.test.mts,ai-framework/hooks/scripts/workflow-notice.mts,ai-framework/hooks/scripts/workflow-notice.test.mts,ai-framework/integrations/harnesses.md,ai-framework/integrations/orca-vendors.example.json,ai-framework/integrations/orca-vendors.md,ai-framework/integrations/skill-defaults.json,ai-framework/integrations/skill-defaults.md,ai-framework/integrations/skill-vendors.json,ai-framework/integrations/skills.md,ai-framework/integrations/state-report.md,ai-framework/integrations/workflow-metrics.md,ai-framework/rules/boundaries.md,ai-framework/rules/canonical-mirror-sync.md,ai-framework/rules/ci-deployment.md,ai-framework/rules/coding-standards.md,ai-framework/rules/component-architecture.md,ai-framework/rules/context-management.md,ai-framework/rules/data-modeling.md,ai-framework/rules/eval-harness.md,ai-framework/rules/i18n.md,ai-framework/rules/machine-data-format.md,ai-framework/rules/model-routing.md,ai-framework/rules/observability.md,ai-framework/rules/performance.md,ai-framework/rules/security.md,ai-framework/rules/testing.md,ai-framework/rules/tool-use.md,ai-framework/rules/ui-ux-review.md,ai-framework/scripts/add-skill.mts,ai-framework/scripts/add-skill.test.mts,ai-framework/scripts/agent-frontmatter-invariant.test.mts,ai-framework/scripts/browser-runtime.mts,ai-framework/scripts/browser-runtime.test.mts,ai-framework/scripts/bundle-sync.mts,ai-framework/scripts/bundle-sync.test.mts,ai-framework/scripts/changelog.mts,ai-framework/scripts/changelog.test.mts,ai-framework/scripts/config-migrate.mts,ai-framework/scripts/config-migrate.test.mts,ai-framework/scripts/docs-links.mts,ai-framework/scripts/docs-links.test.mts,ai-framework/scripts/entry-import.mts,ai-framework/scripts/entry-import.test.mts,ai-framework/scripts/flow-join.mts,ai-framework/scripts/flow-join.test.mts,ai-framework/scripts/flow-render.mts,ai-framework/scripts/flow-render.test.mts,ai-framework/scripts/flow-report.mts,ai-framework/scripts/flow-report.test.mts,ai-framework/scripts/graphify.mts,ai-framework/scripts/graphify.test.mts,ai-framework/scripts/instruction-loading.test.mts,ai-framework/scripts/opencode-service.mts,ai-framework/scripts/opencode-service.test.mts,ai-framework/scripts/orca-apply.mts,ai-framework/scripts/orca-apply.test.mts,ai-framework/scripts/orca-assign.mts,ai-framework/scripts/orca-assign.test.mts,ai-framework/scripts/orca-diff-admit.mts,ai-framework/scripts/orca-diff-admit.test.mts,ai-framework/scripts/orca-dispatch.mts,ai-framework/scripts/orca-dispatch.test.mts,ai-framework/scripts/orca-eval-grader.mts,ai-framework/scripts/orca-eval-grader.test.mts,ai-framework/scripts/orca-evidence.mts,ai-framework/scripts/orca-evidence.test.mts,ai-framework/scripts/orca-launch-gate.mts,ai-framework/scripts/orca-launch-gate.test.mts,ai-framework/scripts/orca-ledger.mts,ai-framework/scripts/orca-ledger.test.mts,ai-framework/scripts/orca-policy.mts,ai-framework/scripts/orca-policy.test.mts,ai-framework/scripts/orca-preflight.mts,ai-framework/scripts/orca-preflight.test.mts,ai-framework/scripts/orca-reconcile.mts,ai-framework/scripts/orca-reconcile.test.mts,ai-framework/scripts/orca-run.mts,ai-framework/scripts/orca-run.test.mts,ai-framework/scripts/orca-start.mts,ai-framework/scripts/orca-start.test.mts,ai-framework/scripts/pitch-archive.mts,ai-framework/scripts/pitch-archive.test.mts,ai-framework/scripts/pitch-compress.mts,ai-framework/scripts/pitch-compress.test.mts,ai-framework/scripts/review-bench.mts,ai-framework/scripts/review-bench.test.mts,ai-framework/scripts/run-tests.mts,ai-framework/scripts/run-tests.test.mts,ai-framework/scripts/runtime/README.md,ai-framework/scripts/runtime/bun.mts,ai-framework/scripts/runtime/cli.mts,ai-framework/scripts/runtime/config.mts,ai-framework/scripts/runtime/config.test.mts,ai-framework/scripts/runtime/data-file.mts,ai-framework/scripts/runtime/data-file.test.mts,ai-framework/scripts/runtime/entry.mts,ai-framework/scripts/runtime/entry.test.mts,ai-framework/scripts/runtime/env.mts,ai-framework/scripts/runtime/invariants.test.mts,ai-framework/scripts/runtime/migrate.mts,ai-framework/scripts/runtime/migrate.test.mts,ai-framework/scripts/runtime/node.mts,ai-framework/scripts/runtime/oex-lock.mts,ai-framework/scripts/runtime/runtime.test.mts,ai-framework/scripts/runtime/select.mts,ai-framework/scripts/runtime/semver-range.fixtures.json,ai-framework/scripts/runtime/semver-range.mts,ai-framework/scripts/runtime/semver-range.test.mts,ai-framework/scripts/runtime/test-helpers.mts,ai-framework/scripts/runtime/test-helpers.test.mts,ai-framework/scripts/runtime/toon-data.mts,ai-framework/scripts/runtime/toon-data.test.mts,ai-framework/scripts/runtime/types.mts,ai-framework/scripts/runtime/upgrade.test.mts,ai-framework/scripts/runtime/validate.mts,ai-framework/scripts/runtime/validate.test.mts,ai-framework/scripts/setup-validator.mts,ai-framework/scripts/setup-validator.test.mts,ai-framework/scripts/skill-compress-guard.mts,ai-framework/scripts/skill-compress-guard.test.mts,ai-framework/scripts/skill-defaults.mts,ai-framework/scripts/skill-defaults.test.mts,ai-framework/scripts/skill-registry.mts,ai-framework/scripts/skill-registry.test.mts,ai-framework/scripts/skill-source.mts,ai-framework/scripts/skill-source.test.mts,ai-framework/scripts/skill-sync.mts,ai-framework/scripts/skill-sync.test.mts,ai-framework/scripts/skill-vendors.mts,ai-framework/scripts/skill-vendors.test.mts,ai-framework/scripts/state-charts.mts,ai-framework/scripts/state-charts.test.mts,ai-framework/scripts/state-design.mts,ai-framework/scripts/state-fragment-dataset.test.mts,ai-framework/scripts/state-fragment-evidence.mts,ai-framework/scripts/state-fragment-evidence.test.mts,ai-framework/scripts/state-fragment-inject.mts,ai-framework/scripts/state-fragment-inject.test.mts,ai-framework/scripts/state-fragment-parse.mts,ai-framework/scripts/state-fragment-parse.test.mts,ai-framework/scripts/state-fragment.mts,ai-framework/scripts/state-fragment.test.mts,ai-framework/scripts/state-graph.mts,ai-framework/scripts/state-graph.test.mts,ai-framework/scripts/state-history.mts,ai-framework/scripts/state-history.test.mts,ai-framework/scripts/state-html.test.mts,ai-framework/scripts/state-pages.mts,ai-framework/scripts/state-render.mts,ai-framework/scripts/state-snapshot.mts,ai-framework/scripts/state-snapshot.test.mts,ai-framework/scripts/state-structure.mts,ai-framework/scripts/state-test-helpers.mts,ai-framework/scripts/state-theme.mts,ai-framework/scripts/state-theme.test.mts,ai-framework/scripts/toon-convert.mts,ai-framework/scripts/toon-convert.test.mts,ai-framework/scripts/workflow-contracts.test.mts,ai-framework/scripts/workflow-doctor.mts,ai-framework/scripts/workflow-doctor.test.mts,ai-framework/scripts/workflow-metrics-report.mts,ai-framework/scripts/workflow-metrics-report.test.mts,ai-framework/scripts/workflow-metrics-state.mts,ai-framework/scripts/workflow-metrics-state.test.mts,ai-framework/scripts/workflow-metrics.mts,ai-framework/scripts/workflow-metrics.test.mts,ai-framework/templates/ai-workflow.example.toon,ai-framework/templates/ai_workflow_env.example.json,ai-framework/templates/project/analysis/README.md,ai-framework/templates/project/context/README.md,ai-framework/templates/project/design/decisions/template.md,ai-framework/templates/project/design/plans/rollback-template.md,ai-framework/templates/project/design/plans/template.md,ai-framework/templates/project/design/template.md,ai-framework/templates/project/design/wireframes/template.md,ai-framework/templates/project/done-work.md,ai-framework/templates/project/knowledge/README.md,ai-framework/templates/project/knowledge/templates/decision.md,ai-framework/templates/project/knowledge/templates/entity.md,ai-framework/templates/project/knowledge/templates/issue.md,ai-framework/templates/project/knowledge/templates/pattern.md,ai-framework/templates/project/pitches/_archive/.gitkeep,ai-framework/templates/project/pitches/_parked/.gitkeep,ai-framework/templates/project/pitches/_templates/hill.md,ai-framework/templates/project/pitches/_templates/pitch.md,ai-framework/templates/project/pitches/_templates/plan.md,ai-framework/templates/project/reports/README.md,ai-framework/templates/project/requirements/bugs/template.md,ai-framework/templates/project/requirements/features/template.md,ai-framework/templates/project/rules/README.md,ai-framework/templates/project/runs/README.md,ai-framework/templates/project/status.md,ai-framework/workflow/overview.md,ai-framework/workflow/phases/0-shape.md,ai-framework/workflow/phases/1-plan.md,ai-framework/workflow/phases/2-build.md,ai-framework/workflow/phases/3-audit.md,ai-framework/workflow/phases/4-ship.md,ai-framework/workflow/phases/5-cooldown.md,graphify-out/GRAPH_REPORT.md,graphify-out/graph.json
selectedFiles: 742
snapshotTag: audit-baseline
snapshotCommit: f9d93114ceaecadee9d84e8072afd1cb055d600b
testHarnessAdaptation: Only the copied installed-test BASE_REF literal changes to audit-baseline. Git fixture contains the selected original b26b45b paths; no recovery archives/historical pitch folders/secrets exported. Current reviewed code remains byte-identical except this fixture locator.
````

## audit-records/2026-10-23-p2d-p2c-repair/completion-code.md

````markdown
# Narrow code completion — cycle1

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check; final repo guard clean
prompt-sha256: 8d69e308f52a827addac8fee51da2b5211f5f437bd5eb16f4ef09e2e603d6cfc
model: gpt-6.1-sol high
cross-file interactions: reviewed

All three candidates PASS; no applicable unverified checks. P2d migration31/31, integrations4/4, fresh2/2 and installed two-pass1/1 in24.391s. P2c binding/destination/approval/replay17/17. Repair54/54; raw bytes/hash and consumer before/after proof match. Comparison53/54, exact claim failure. All cross-file guards and required source ranges inspected.

| ID | severity | file:line | issue | verified | disposition |
|---|---|---|---|---|---|
| C-R2 | comparison only | state-ai-authoring-live-runs.md:33 | Comparison Claim: passed fails unchanged consumer; actual candidate remains blocked | yes; exact line and failing consumer independently reported | Deliberate scratch control, not a production finding |
| candidate | none | reviewed ranges in prompt | No production finding | yes; focused checks and source guards complete | PASS |

P2d: actual apply guard at consolidation-migrate.mts:179, refused/local handling and publication checks; installed fixture preserves46 legacy entries and owned hashes, uses both sync passes, migration and replay. P2c: current destination hashing at legacy-upgrade.mts:264–273, repeated at publication301 and final proof325; explicit archive admission285–289; shared source validation in pitch-compress417–479. Repair: complete36920bytes equal approved candidate; SHA256868e76e9eace40c14f8014e18a16a8fa5b702de13e5489ebcc29c4e7944fc24a;72runs,51pass/21fail,12seededbad all fail,oneCursor not-run,exactlyClaim: blocked. Consumer only changes path17, before/after hashes match proof;120000ms and16MiB unchanged. No new live-model claim.

The installed Git fixture is an isolated selected742-path export of original b26b45b, excluding secrets/recovery archives/historical pitch folders. The copied test BASE_REF alone changes to audit-baseline, a tag on the selected snapshot; production code does not change. Source/provenance is preserved in baseline-provenance.toon.

Prompt file: completion-code.prompt.md. Additional scheduling constrained installed tests to one at a time after the initial launch race. A single explicit35-second process allowance was used near the measured24.4-second margin; all other command bounds remain about20seconds. Security continuation received at most4 additional calls, no new review cycle. All initial limitations/timeouts are retained, not reported as passes.
````

## audit-records/2026-10-23-p2d-p2c-repair/completion-coverage.md

````markdown
# Narrow coverage completion — cycle1

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check; final repo guard clean
prompt-sha256: 6ced5302f80a690bd2472f94fe947345bf8a278a47e1f70dcbbd4e5e88ee4799
model: gpt-6.1-sol high
cross-file interactions: reviewed

All three candidates PASS; no applicable unverified checks. P2d migration31/31, integrations10/10, installed1/1 in24.660s, fresh2/2 in5.380s. P2c selection16/16. Repair54/54; exact bytes and claim counts verified. Comparison53/54. Additional owned mutants removing dry-run apply gate and new-destination equality both turn the intended regression red.

| ID | severity | file:line | issue | verified | disposition |
|---|---|---|---|---|---|
| C-R2 | comparison only | state-ai-authoring-live-runs.md:33 | Comparison Claim: passed fails unchanged consumer; actual candidate remains blocked | yes; exact line and failing consumer independently reported | Deliberate scratch control, not a production finding |
| candidate | none | reviewed ranges in prompt | No production finding | yes; focused checks and source guards complete | PASS |

P2d: actual apply guard at consolidation-migrate.mts:179, refused/local handling and publication checks; installed fixture preserves46 legacy entries and owned hashes, uses both sync passes, migration and replay. P2c: current destination hashing at legacy-upgrade.mts:264–273, repeated at publication301 and final proof325; explicit archive admission285–289; shared source validation in pitch-compress417–479. Repair: complete36920bytes equal approved candidate; SHA256868e76e9eace40c14f8014e18a16a8fa5b702de13e5489ebcc29c4e7944fc24a;72runs,51pass/21fail,12seededbad all fail,oneCursor not-run,exactlyClaim: blocked. Consumer only changes path17, before/after hashes match proof;120000ms and16MiB unchanged. No new live-model claim.

The installed Git fixture is an isolated selected742-path export of original b26b45b, excluding secrets/recovery archives/historical pitch folders. The copied test BASE_REF alone changes to audit-baseline, a tag on the selected snapshot; production code does not change. Source/provenance is preserved in baseline-provenance.toon.

Prompt file: completion-coverage.prompt.md. Additional scheduling constrained installed tests to one at a time after the initial launch race. A single explicit35-second process allowance was used near the measured24.4-second margin; all other command bounds remain about20seconds. Security continuation received at most4 additional calls, no new review cycle. All initial limitations/timeouts are retained, not reported as passes.
````

## audit-records/2026-10-23-p2d-p2c-repair/completion-security.md

````markdown
# Narrow security completion — cycle1

independent: no
canary: caught
read-only: verified by review-bench guard snapshot/check; final repo guard clean
prompt-sha256: 384d9046b1442561c1704a4cc8d89303b16ff1e1d47f591fb747cc0a18e460a8
model: gpt-6.1-sol high
cross-file interactions: reviewed

All three candidates PASS; no applicable unverified checks after resumed runtime amendment. Fresh source review and comparison detection completed independently; fresh final report originally left P2d installed acceptance incomplete. P2d migration31/31 and integrations6/6; P2c selection14/14; repair54/54; comparison53/54. Installed attempts timed out25.008s and25.013s; fresh-only result2/2 in3.817s was collected on resumption. One final unchanged installed suite passed3/3 in26.030s within explicitly allowed35s (two-pass test22.200s). Runtime amendment was resumed and is not claimed fresh/independent; the independent code and coverage reviewers separately passed installed acceptance. No source change or required-check waiver.

| ID | severity | file:line | issue | verified | disposition |
|---|---|---|---|---|---|
| C-R2 | comparison only | state-ai-authoring-live-runs.md:33 | Comparison Claim: passed fails unchanged consumer; actual candidate remains blocked | yes; exact line and failing consumer independently reported | Deliberate scratch control, not a production finding |
| candidate | none | reviewed ranges in prompt | No production finding | yes; focused checks and source guards complete | PASS |

P2d: actual apply guard at consolidation-migrate.mts:179, refused/local handling and publication checks; installed fixture preserves46 legacy entries and owned hashes, uses both sync passes, migration and replay. P2c: current destination hashing at legacy-upgrade.mts:264–273, repeated at publication301 and final proof325; explicit archive admission285–289; shared source validation in pitch-compress417–479. Repair: complete36920bytes equal approved candidate; SHA256868e76e9eace40c14f8014e18a16a8fa5b702de13e5489ebcc29c4e7944fc24a;72runs,51pass/21fail,12seededbad all fail,oneCursor not-run,exactlyClaim: blocked. Consumer only changes path17, before/after hashes match proof;120000ms and16MiB unchanged. No new live-model claim.

The installed Git fixture is an isolated selected742-path export of original b26b45b, excluding secrets/recovery archives/historical pitch folders. The copied test BASE_REF alone changes to audit-baseline, a tag on the selected snapshot; production code does not change. Source/provenance is preserved in baseline-provenance.toon.

Prompt file: completion-security.prompt.md. Additional scheduling constrained installed tests to one at a time after the initial launch race. A single explicit35-second process allowance was used near the measured24.4-second margin; all other command bounds remain about20seconds. Security continuation received at most4 additional calls, no new review cycle. All initial limitations/timeouts are retained, not reported as passes.
````

## audit-records/2026-10-23-p2d-p2c-repair/cross-complete.md

````markdown
# Cross-pitch cross-complete — cycle1

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check; final repo guard clean
prompt-sha256: fe6cee17816b9a61d17f125ca85750c701bffd2c7aaf109fbee602399b4c7630
model: gpt-6.1-sol high
cross-file interactions: reviewed

| ID | severity | file:line | issue | verified | disposition |
|---|---|---|---|---|---|
| C-X | scratch only | ownership.json:230 | Planted pending rollout writer collides with P2c, contrary to downstream-only un-bet card | yes; reviewer cited manifest disagreement and failing ownership.test.mjs | Not present in actual pending writer inventory |
| scope | should-fix, review instrument | plan.md:52–56; deviations.md:23 | Initial abbreviated inventory omitted integrations/hook and release attribution | yes; plan/deviation evidence identified | Expanded actual inventory and recorded release slices; no concurrent production writer |

Canonical checklist completed: other active cards/plans, deviations/logs, set intersections, dependency boundaries and actual ownership rather than dirty attribution. Complete-inventory review: P2d10 declared primary/integration files supplied; P2c data files need no new source judgment. Missing shared pitch-compress hook and P2d release attribution clarified in actual inventory. Repair exact test/asset hashes match approved source proof.

Rollout is downstream-only and depends on these releases; package-less wrapper and bounded Orca receipts remain un-bet candidates. P1/P2a then P2d then P2c then repair is the coordinator-only sequence. Shared helpers and release metadata are not simultaneous writers. Actual current inventory has no independent pending-writer collision. Missing copies of campaign data in this cross reviewer slice are a declared source-verification boundary, not missing ownership evidence: all paths are listed; 46 live artifacts were verified by the author and their contents already approved per slug. No new archive reads or content review.
````

## audit-records/2026-10-23-p2d-p2c-repair/cross.md

````markdown
# Cross-pitch cross — cycle1

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check; final repo guard clean
prompt-sha256: ac1d348c3f94705c408293c475c11dc80d93c9687267cafe9a22d262a36cb32b
model: gpt-6-luna high
cross-file interactions: reviewed

| ID | severity | file:line | issue | verified | disposition |
|---|---|---|---|---|---|
| C-X | scratch only | ownership.json:21 | Planted pending rollout writer collides with P2c, contrary to downstream-only un-bet card | yes; reviewer cited manifest disagreement and failing ownership.test.mjs | Not present in actual pending writer inventory |
| scope | should-fix, review instrument | plan.md:52–56; deviations.md:23 | Initial abbreviated inventory omitted integrations/hook and release attribution | yes; plan/deviation evidence identified | Expanded actual inventory and recorded release slices; no concurrent production writer |

Canonical checklist completed: other active cards/plans, deviations/logs, set intersections, dependency boundaries and actual ownership rather than dirty attribution. Initial primary-script manifest was incomplete; fresh complete-inventory retry followed.

Rollout is downstream-only and depends on these releases; package-less wrapper and bounded Orca receipts remain un-bet candidates. P1/P2a then P2d then P2c then repair is the coordinator-only sequence. Shared helpers and release metadata are not simultaneous writers. Actual current inventory has no independent pending-writer collision. Missing copies of campaign data in this cross reviewer slice are a declared source-verification boundary, not missing ownership evidence: all paths are listed; 46 live artifacts were verified by the author and their contents already approved per slug. No new archive reads or content review.
````

## audit-records/2026-10-23-p2d-p2c-repair/guard-and-source-witness.toon

````toon
@toon-data 1
schemaVersion: 1
guard:
  clean: true
  headChanged: false
  statusChanged: false
  changed[0]:
copiedSources:
  files: 430
  hashes:
    ai-framework/scripts/consolidation-migrate.mts: "8374daab56cac02d3bac575fe2191e8b332ee96860aa18a7910e268f4bfd74f6"
    ai-framework/scripts/consolidation-migrate.test.mts: c35da87119b5eb3cda0c000e31c96d220a86ca7dce1ccf7fe5d0d2449f697ab7
    ai-framework/scripts/done-work-index.mts: c31dabc332164f6faf4b8e143101b8ffd0065554fb322c8726b1cf7bc387fb2e
    ai-framework/scripts/done-work-index.test.mts: c5512956180a4be121c15b21098c1a560f09e0dfc03f51ee3006b60be41237b2
    ai-framework/scripts/graphify-refs.mts: b3d816aa913e16da3d50069cd310a92f83dd3790267d092e9d9e54f6d9f9ceba
    ai-framework/scripts/graphify-refs.test.mts: "24de7ac954d6d1ffe17de8e028444b9a6dab14f11c030350d1b3871179c3bb3e"
    ai-framework/scripts/graphify-relations.mts: "188a05a38c3aeb28dff9584d3915ce59436bb13e465630fbbd1181f21f20614e"
    ai-framework/scripts/graphify-relations.test.mts: "19dc94408c46fe6be23fc62b410bd6be8cdc235ee8b94512416d7e57ba435c70"
    ai-framework/scripts/installed-upgrade.test.mts: "8abf9eea79de9e02025fa710d94a0886da98b6a2725cd1c88c21c3c5b796367b"
    ai-framework/scripts/ledger-schema.mts: f3166ed20310c110b53fc2c26d2d55b06acafba4e592eb9124e2f158de54cf01
    ai-framework/scripts/ledger-schema.test.mts: b9a14c9c0cf5ffe3eb04c53f5b8ac23bfecf9b0459a64eeadb7706cef115a161
    ai-framework/scripts/legacy-upgrade.mts: "252a77e0bf0e926a812ac082774c4ea09e675716e3125cb4acba3d4a8236a95e"
    ai-framework/scripts/legacy-upgrade.test.mts: ab7788e9c067f6301f241765cca4cc42e229593094da681406634fb8fc3d8b94
    ai-framework/scripts/outcome-record.mts: bd5db227978b2e22c4b8842732cef663829fa0f191e6a786f2029a4cdcbe0524
    ai-framework/scripts/outcome-record.test.mts: "250a6c1e871cdb2332ca8c64ec0733aebad5535880f881786b35db0be5ad1d5a"
    ai-framework/templates/project/records/shipped/.gitkeep: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    ai-framework/templates/project/records/shipped/_template.md: c1d60dfa0eada8f2eeb3c317ea3dd0173b0b6bfc5695c99ec09273ce5fa90e59
    ai-framework/workflow/relations.toon: "1b9c854a1b0ada6eb7eede64571065213a035fa270fa45e9bbc32ab31acb896c"
    ".agents/skills/add-skill/SKILL.md": d7837a88324d9893b33da31c1488e7c70d8ce259f7c0e4a92ba73af5b7c18383
    ".agents/skills/audit/SKILL.md": "32d867694d321cd0393e17d8cfa4245c7da6e205c61bac9732920f98c8c8cfc4"
    ".agents/skills/build/SKILL.md": "22595bb21aeb07b260c7b8af5d082516d9367be95959b0d0d4d46416ccf0fd08"
    ".agents/skills/bundle-sync/SKILL.md": c0c161afa4744901449ad01a0d4563c9072db3abf16c8e4656b9fa0aeb2f1f32
    ".agents/skills/changelog/SKILL.md": d7d73123e3ffdfc65bffc53eb4f4b793e6b73684f2dd674ab409375491d06fd7
    ".agents/skills/checkpoint/SKILL.md": "96556aedde6a13aa5fb77e064736cca30a1ab8f92e7be250a89bf17019368a76"
    ".agents/skills/cooldown/SKILL.md": "3bc26b12ced53b161132efdaf651054ecce4e48a4090dcb0e476480260c43755"
    ".agents/skills/critique/SKILL.md": "11c21a8556ab25f4afb115f8a14bb452955f63e05388074aec89ab8d6fc9bbf8"
    ".agents/skills/dependency-security/SKILL.md": e4c1f4cdb80ed3c38f67d3dc53d31c5fb038754fb4b1a01dcc040c403ab513e6
    ".agents/skills/eval-harness/SKILL.md": "7dc9cab1549371b2b66f0f20b1e42e849deb28966e2457f1a69758af38a0c2b6"
    ".agents/skills/fix/SKILL.md": "5e2fe2aec889f5bbe6ae7cedf8fa494734e29a5f2b8a70d73f38cb40006ff16f"
    ".agents/skills/impact/SKILL.md": "938be82e10cfa944f000efc59a16074f731e35a252fc6a01b0fd3b4c172fbbd8"
    ".agents/skills/knowledge-health/SKILL.md": "427b596f307332471287f33827a3663fa645c9772acd81feb3e5ea4f79e41339"
    ".agents/skills/pitch-compress/SKILL.md": "3f15f6ee79fbc21807dd1ae81151b0c64294d42a151af34663ae65222dcb3dc1"
    ".agents/skills/plan/SKILL.md": "123c4edf8cc16034b151526cd004c73ff9cf889ed2dd68a7f6317fc32ad266be"
    ".agents/skills/resume/SKILL.md": "9f79d5026375dffbb792a8ab1e8c036f971fca0dadcc07870d87bf99df652615"
    ".agents/skills/search/SKILL.md": "5e18fe9870171d720bd4626230a38a8cf33283337369318a16b84f653eef2b41"
    ".agents/skills/setup-validator/SKILL.md": cbc5acbfbd37c681cf03ee4b4e8a5904ad82ca9699661dfd5d87dad655b3f7bb
    ".agents/skills/setup/SKILL.md": bfdaeb0013c1bf50279c5788045f19f9766f0124afdb1b467af7d96c7b513d48
    ".agents/skills/shape-lite/SKILL.md": "8db611a176e4aa8bce689cb69c5a4744be840a8cee8337c51de51bf06009d5d0"
    ".agents/skills/shape/SKILL.md": "997e8ffca9913d7750cc2220380d1daaee781c80a72641b24ac5d297d0bb96de"
    ".agents/skills/ship/SKILL.md": ab3169550c59630fcd76ba82ef7d6a8d4585469d00a237c8edb6d5cc10f84240
    ".agents/skills/state/SKILL.md": "5826d2916847ad938ece309158a36daf173ea9b5f3cf895b3ee0cb0e7f14cd20"
    ".agents/skills/switch/SKILL.md": "96fb35be2e5f0df6beb3108aeb6891efa8907d5b43404112c8a3374e4b75a0a5"
    ".agents/skills/sync/SKILL.md": b5dc6bc484d7f2bdc89c42dc6b55ddf167c41bbc0ca64888215f21247ad23d19
    ".agents/skills/test-strategy/SKILL.md": "22f0c4819c70efb45ad4d46dd7e86b5868e34466bc8ae3d1d41b62ce5f1e3787"
    ".agents/skills/ui-design/SKILL.md": "02c16453c5bea27aa35e38099159b5437e2de053a722546385f0f8658ac99e8e"
    ".agents/skills/workflow-doctor/SKILL.md": ec23c3cddbaf405e4b233e28d44d2b0be1e83fc54ef956c19612da565ce60b58
    ".claude/agents/appetite-auditor.md": "8eefe2784aa5abe39451f0cf3e62f5547e2f3be6371a365542d0bd42e6776dd3"
    ".claude/agents/architect.md": "946d7b59066d8bdf600427f9178ba82418c8e552c01e6a2cbabedd312774f03a"
    ".claude/agents/build-error-resolver.md": "46f47d4b31ad0e42923f4133a4c9732ca470348d8e3878ef82355647a8446fd5"
    ".claude/agents/code-reviewer.md": "66e01142e0a10ce05e03a117d210181346e4b12e6ea20c0adf9625983151e8aa"
    ".claude/agents/cross-pitch-conflict-checker.md": e7730afa362b81ddcdd6e6d2c70b7b2971020ab59e1f0b80f8c9707a3f91727e
    ".claude/agents/cross-pitch-projector.md": abde0dbeb4996ba4711e6691c7d0eb6bdb8afb8f5ffd6c22bcc9747328cea484
    ".claude/agents/eval-regression-projector.md": bd18787da6bda83fec81f2776511d85045bf9e35d320d9f7f4a9240f59115092
    ".claude/agents/eval-runner.md": cfea69c7b1e5aedc7d351cfa770f065d7289022973cb66d13b183ad3802ff2d9
    ".claude/agents/i18n-checker.md": "906c3cda8a507fedce3f0e1f13d96bc7ce8684173af0c457cec67e6003fbf250"
    ".claude/agents/knowledge-historian.md": df0db5fbbf9bcc9cc1eb54c4b0a877c7974a45f24393d56274a8996d2672acec
    ".claude/agents/planner.md": "400e2223c32cdfdb856a21f276f63e19f634a57eb7203e3cd6ce23e425d6327a"
    ".claude/agents/refactor-cleaner.md": fd309d0a7dd9e8c096d7b8eb6deef8ee33c88a48df5a65e0bd0f2b8b7a7b72da
    ".claude/agents/security-reviewer.md": "47447823a6a9e15b8ca65707847e7c98f2609d3872fade369d6899cec770e2d2"
    ".claude/agents/skeptic.md": "2d35896e104c4757552fa4c5fa974c6728bae32ab66b26635f0f76283997cba9"
    ".claude/agents/test-coverage-checker.md": b0e3bcff229aa21b76b21932ac65335f3aea7e7d22c31d2421766c82f1faf08c
    ".claude/agents/ux-reviewer.md": "08667ce6bf0d9624993bdc74fc2174a748853dee82fb0ac8530eb93a6deec03c"
    ".claude/skills/add-skill/SKILL.md": "22e4c0f23b6ac18b6db19d81e9201f4ef8125728c4a3b1ad38ea7451b3a8d378"
    ".claude/skills/audit/SKILL.md": "9e5f8eaff3076142e40d8e93503ab9d8a2762a187a341f2ed969b97fba049768"
    ".claude/skills/build/SKILL.md": "6662d53b595604b84c39530190825667161b788d24df895c6415c82b4d994b0e"
    ".claude/skills/bundle-sync/SKILL.md": "84e22bd6bdd331184c9c4e69f6702fc321937b640e8b7e0502f167bf8a4ec611"
    ".claude/skills/changelog/SKILL.md": "521942ea8e70e925d6605de021bfbc894979430b798ab03c29c4b690108c1a32"
    ".claude/skills/checkpoint/SKILL.md": "6dfd0aae2385b6ad32e82327318e56c75008385841eb2356fa843be3738c39ad"
    ".claude/skills/cooldown/SKILL.md": cfff5c90e9d90b4e5a26819c90a09e8763f3d88f5ea56f117d472105db2a4906
    ".claude/skills/critique/SKILL.md": "8b236983598ac5f71387bb847baa369ba5e8ab17a6cd2f67ebf7ac33c86341c9"
    ".claude/skills/dependency-security/SKILL.md": "02a6b95ad3f32f2794312f292bdb45f7afda53980167717344915c2112f13436"
    ".claude/skills/eval-harness/SKILL.md": d0b39faf3168f74de06e85d6a7047dc2e297d1bae728fe23627b54b6cf1eedca
    ".claude/skills/fix/SKILL.md": "25a7a4016e8b78a3f7d681759110258adae018ea6f347196242462eb11530033"
    ".claude/skills/impact/SKILL.md": bb717630ba8ae5405b3679e17560d6767ab819df8546f8c717fcbcdc2b9e715c
    ".claude/skills/knowledge-health/SKILL.md": "316cf25633a0487ba9326420ebb9b0ac509f4bef67bff6c77a3cf38c4ca3a26a"
    ".claude/skills/pitch-compress/SKILL.md": ea0ed82369db405bc787818eb303eeb6e74fed9ace4020baee74481eed0e4343
    ".claude/skills/plan/SKILL.md": "0df576503246063397d86755d16b01c57a8b0ccbd4bf47920892ca8413b06070"
    ".claude/skills/resume/SKILL.md": cf880065b8deb14115915d0901d913c9715b0e602131d4a1562d836e32e5d771
    ".claude/skills/search/SKILL.md": "23143001d0c245a6d55b62785ca821f069e2ac19a312e509568e4317f5922902"
    ".claude/skills/setup-validator/SKILL.md": "8ece5995655d6576644cd586d8d4838f94a033c4d23cc70c3bc34ade1add7e13"
    ".claude/skills/setup/SKILL.md": adc701890439fdf8d0b0817c3282dec963fae7e8aaf65581093de5f9e6c36fc4
    ".claude/skills/shape-lite/SKILL.md": "3a3cf74cd8ea694b11af10c94a4cb621b4465e22d454be5ea0635900ded44901"
    ".claude/skills/shape/SKILL.md": a2aa0fdb7f2eb3f929b771e9739dbc6380a54d4bff957e5aa964326b8a9aa11e
    ".claude/skills/ship/SKILL.md": aea1057d0dcd303da4d4fb98492726ce65b605f3462ad569cc52ac517b141f69
    ".claude/skills/state/SKILL.md": "531c1c02b8e4712455eb1041e99dcd488a1f588d3673b0aee671cc80555deab1"
    ".claude/skills/switch/SKILL.md": f188b1e0a68430c9be5201b223c927367dd5ed930a0cb24662ad4f297215d74e
    ".claude/skills/sync/SKILL.md": "1b1436c0edd3df80e54825f7cbd05f2fd1649beb23c9000d84152e089db3f206"
    ".claude/skills/test-strategy/SKILL.md": "077ddf11f6b9851d715a528b51062c3cb4bf3f9b834a5fd5bee0fbf180138ab1"
    ".claude/skills/ui-design/SKILL.md": b49b04f982e1869c2e6dc0e0c9dd361cc99633a5769905dc3e92bdad3b4d94fe
    ".claude/skills/workflow-doctor/SKILL.md": c80f03e8a893eb37e51ca8b16961ac4cf2cc5e3bbf33a207f758790d40c48116
    ".codex/agents/appetite-auditor.toml": "950d04aa91809e1f271fd4161def233e2af6cc381f0b3d24a1385b0adee06674"
    ".codex/agents/architect.toml": "5c7268383d8d443e5426d197674a308d31b26bbb71bad9d83fbc5d1fa66f53f1"
    ".codex/agents/build-error-resolver.toml": a7166d2de56ac842a4c3a362df329e7b5a0387ac7f15db29a090493afadce997
    ".codex/agents/code-reviewer.toml": "3c379b174dfca92bcbda008e61263a758ad48922e3bf7ba70d532e4637fd6eeb"
    ".codex/agents/cross-pitch-conflict-checker.toml": "24af3aebd95784bb070de363adbbfddc553b4ff899b30b023fa85dd47cd510ac"
    ".codex/agents/cross-pitch-projector.toml": "0d93072027c5325becbee585659ce3875662a92d085960d82b30bf4e97029ff2"
    ".codex/agents/eval-regression-projector.toml": "02937025ec7da86f92f736d0649ab68ca2e495a2d83b850de289347a4ffa9d76"
    ".codex/agents/eval-runner.toml": dd5f532db6ebf0ca3e3e10b0ee80ab846b8c2f308c589d71bb191e24f702f7fb
    ".codex/agents/i18n-checker.toml": d8af2b2e17ea0180f613b3993132b55cfefe29fff03bea47b5fe1a4a8d9f78f9
    ".codex/agents/knowledge-historian.toml": "7353de3fce2134043bce9394f9babb2b7ed87d9cf45486d8a60acccead569248"
    ".codex/agents/planner.toml": afbcacc2e157d89bb225173118d56f26b28209d118555a65549f69a7e3d4e7b4
    ".codex/agents/refactor-cleaner.toml": a56771324bf3eb9307feaa5aab560171de5edc7b8e4c918882a389520452aa81
    ".codex/agents/security-reviewer.toml": "824ab52cf562da785219195aced4b87c820b79d8c18280a8c518dad9e44cb6ba"
    ".codex/agents/skeptic.toml": "98fba04902c641565ba9c1fb5b00c472bf2249d4f37c03d2318e8c9218255a05"
    ".codex/agents/test-coverage-checker.toml": d61fab07a844c551bbc5fb82befadf97523532f6c84b065f2c9c0f7446586fb2
    ".codex/agents/ux-reviewer.toml": b19e62df117ed879d75b166c9ad8ac85a63c776c21aea200ed687eff2a654d29
    ".cursor/skills/add-skill/SKILL.md": "22e4c0f23b6ac18b6db19d81e9201f4ef8125728c4a3b1ad38ea7451b3a8d378"
    ".cursor/skills/audit/SKILL.md": "9e5f8eaff3076142e40d8e93503ab9d8a2762a187a341f2ed969b97fba049768"
    ".cursor/skills/build/SKILL.md": "6662d53b595604b84c39530190825667161b788d24df895c6415c82b4d994b0e"
    ".cursor/skills/bundle-sync/SKILL.md": "84e22bd6bdd331184c9c4e69f6702fc321937b640e8b7e0502f167bf8a4ec611"
    ".cursor/skills/changelog/SKILL.md": "521942ea8e70e925d6605de021bfbc894979430b798ab03c29c4b690108c1a32"
    ".cursor/skills/checkpoint/SKILL.md": "6dfd0aae2385b6ad32e82327318e56c75008385841eb2356fa843be3738c39ad"
    ".cursor/skills/cooldown/SKILL.md": cfff5c90e9d90b4e5a26819c90a09e8763f3d88f5ea56f117d472105db2a4906
    ".cursor/skills/critique/SKILL.md": "8b236983598ac5f71387bb847baa369ba5e8ab17a6cd2f67ebf7ac33c86341c9"
    ".cursor/skills/dependency-security/SKILL.md": "02a6b95ad3f32f2794312f292bdb45f7afda53980167717344915c2112f13436"
    ".cursor/skills/eval-harness/SKILL.md": d0b39faf3168f74de06e85d6a7047dc2e297d1bae728fe23627b54b6cf1eedca
    ".cursor/skills/fix/SKILL.md": "25a7a4016e8b78a3f7d681759110258adae018ea6f347196242462eb11530033"
    ".cursor/skills/impact/SKILL.md": bb717630ba8ae5405b3679e17560d6767ab819df8546f8c717fcbcdc2b9e715c
    ".cursor/skills/knowledge-health/SKILL.md": "316cf25633a0487ba9326420ebb9b0ac509f4bef67bff6c77a3cf38c4ca3a26a"
    ".cursor/skills/pitch-compress/SKILL.md": ea0ed82369db405bc787818eb303eeb6e74fed9ace4020baee74481eed0e4343
    ".cursor/skills/plan/SKILL.md": "0df576503246063397d86755d16b01c57a8b0ccbd4bf47920892ca8413b06070"
    ".cursor/skills/resume/SKILL.md": cf880065b8deb14115915d0901d913c9715b0e602131d4a1562d836e32e5d771
    ".cursor/skills/search/SKILL.md": "23143001d0c245a6d55b62785ca821f069e2ac19a312e509568e4317f5922902"
    ".cursor/skills/setup-validator/SKILL.md": "8ece5995655d6576644cd586d8d4838f94a033c4d23cc70c3bc34ade1add7e13"
    ".cursor/skills/setup/SKILL.md": adc701890439fdf8d0b0817c3282dec963fae7e8aaf65581093de5f9e6c36fc4
    ".cursor/skills/shape-lite/SKILL.md": "3a3cf74cd8ea694b11af10c94a4cb621b4465e22d454be5ea0635900ded44901"
    ".cursor/skills/shape/SKILL.md": a2aa0fdb7f2eb3f929b771e9739dbc6380a54d4bff957e5aa964326b8a9aa11e
    ".cursor/skills/ship/SKILL.md": aea1057d0dcd303da4d4fb98492726ce65b605f3462ad569cc52ac517b141f69
    ".cursor/skills/state/SKILL.md": "531c1c02b8e4712455eb1041e99dcd488a1f588d3673b0aee671cc80555deab1"
    ".cursor/skills/switch/SKILL.md": f188b1e0a68430c9be5201b223c927367dd5ed930a0cb24662ad4f297215d74e
    ".cursor/skills/sync/SKILL.md": "1b1436c0edd3df80e54825f7cbd05f2fd1649beb23c9000d84152e089db3f206"
    ".cursor/skills/test-strategy/SKILL.md": "077ddf11f6b9851d715a528b51062c3cb4bf3f9b834a5fd5bee0fbf180138ab1"
    ".cursor/skills/ui-design/SKILL.md": b49b04f982e1869c2e6dc0e0c9dd361cc99633a5769905dc3e92bdad3b4d94fe
    ".cursor/skills/workflow-doctor/SKILL.md": c80f03e8a893eb37e51ca8b16961ac4cf2cc5e3bbf33a207f758790d40c48116
    ".gitignore": "6b3798fef1a85f421f9564c35574dadfe7a6dde8e98c5d585566081e64c99bc0"
    ".graphifyignore": ac41f08adb3b692d4c61d68cd51e1e878b3d33fb6dadf19e36a8e1f644a57771
    ".opencode/agents/appetite-auditor.md": "6067c968c076d1557bf53e539aa56cad16d9eba9b3dc91d6b8b95c6bc90a73b9"
    ".opencode/agents/architect.md": a7a75598b94225f54361631692f8e3be28797fe8731bdd9dd8009afc494a7656
    ".opencode/agents/build-error-resolver.md": "3c4bf7b9b2b2b4cde6aca86250ed2555a08e59ca2ec13b901baf219f4af1dea9"
    ".opencode/agents/code-reviewer.md": "4b6b95d64769f432c9291f4523fc4522fcb5cc2d08374a74765b806d693f53ba"
    ".opencode/agents/cross-pitch-conflict-checker.md": f3523bd36501b3608538950dd48a66a644aefe2202eefd5f82ad8d7b5cfdbbf2
    ".opencode/agents/cross-pitch-projector.md": "05d3000704c89550343a1122d122413c5fd05dbf45d59c4ae7008a27840aef2b"
    ".opencode/agents/eval-regression-projector.md": "6a05af0ff60fc3abcd6e1c230a939e18545b729e5a3bd5bfb8254d9f806728f4"
    ".opencode/agents/eval-runner.md": edf8c488ab98d58beeab95232f0a8c1e2c44f93ab09cf07d25b467fae2e887bb
    ".opencode/agents/i18n-checker.md": "76c389a7d9169320935a24ca220ea89bb322ff79ff8f028b3cf5014cf0ebb22b"
    ".opencode/agents/knowledge-historian.md": "78decb1d8fffe8db93a067a889253d25089009cc2e94753dd23c2ebeb81ca6ca"
    ".opencode/agents/planner.md": "4593b7f3308081e1acfcb26b8c5dc92377e0440e2c0e1bba428ff597c2fdffdd"
    ".opencode/agents/refactor-cleaner.md": "0187f37319a323c67ebc5268429cbb414f4250f9bf48765940c2987e1e3d546d"
    ".opencode/agents/security-reviewer.md": df8da747d2e84db26c5d2d68740c696c5c151c62e220f864ed8faab7606fec8f
    ".opencode/agents/skeptic.md": bd8114fc3a698beabfaabbca4101d8ac857841b6545d3de286fb56113d21c44e
    ".opencode/agents/test-coverage-checker.md": c638436a5fc9613c1e2264af2d79340c060d45318100eda91c4fc7d052b505e1
    ".opencode/agents/ux-reviewer.md": e1746aebefb0fdaf9e018dab630c3b02fab47abf9f98991e786080588b361c99
    ".opencode/commands/add-skill.md": a24a853b7cfd2648bc3c6c7e5faceb503367a41125546706dc2e5c1a58eaefa0
    ".opencode/commands/audit.md": "3e1d85c40b6ea6c9affc8abdc69b5a881824144d30f76899f62aabbafd6c9632"
    ".opencode/commands/build.md": "161f807562f1303fd47e46a9fd1e78d477cb0195e53d750fbb6c729b2fc7b9ed"
    ".opencode/commands/bundle-sync.md": "4027c20d5bc08abc8d266eb680535984cebb21e49b365cefd4416ee869687c3f"
    ".opencode/commands/changelog.md": "28e390fc6fe6abcc2ea11b9118925b96dfd04d55d266499d1b2db84c6808bf83"
    ".opencode/commands/checkpoint.md": "35cbbe83dfb2d5a2b1dda2a755f96362bb0e5e92fba60cc19af464d7b967f51e"
    ".opencode/commands/cooldown.md": e03ff5f42597a08f31d57c2f7394404b6e90b91ea0d6f73d649af3c8b45e3e97
    ".opencode/commands/critique.md": b49ad5e6d69541594a3368923f0031ffe9a148862ee34cc75ea18da013d36cc4
    ".opencode/commands/dependency-security.md": "6222354d4bc3a9d52b0e0f4e036c6c2e7712ec609b2b6bed19a3fa9fb358c7ff"
    ".opencode/commands/eval-harness.md": f5af146facb0ffb883a2747abcd315e59c13280e81a7e7c2cf5680f9a01211fc
    ".opencode/commands/fix.md": d878f6ca6b857e220cab43eeb2aa518c28cca99a099c1fe9aa4598b32e6a6d76
    ".opencode/commands/impact.md": f068a208d34bc0ffed2926c61eb1a0c2f4e39d524898ff34c2a46535405991da
    ".opencode/commands/knowledge-health.md": "47bf002b60af30a0792015c940b7fd469a5d182f6919788174762072ce009c15"
    ".opencode/commands/pitch-compress.md": "840e1c204edf6d9b480f627742a7cf28bbe3eb587239dee529396f943d36bfaa"
    ".opencode/commands/plan.md": f5663a94fe039dc833ea7ccf34cf219e18e5b3bd30cd5bf7735e132c31f789f2
    ".opencode/commands/resume.md": "23cd3ebf64dcbbc4c5d85b7bbd7cf1168e33c41a7506e17d13d3e923ef33efaa"
    ".opencode/commands/search.md": "8c5d195c865f7f5f3e7b85f94134e8fb3d693ad136cd43c3e98804495a430957"
    ".opencode/commands/setup-validator.md": f91b775bfdc4a5ce9c0e9ed72f112aae4d419d2de07b04aeff2fe0cf02ef91ec
    ".opencode/commands/setup.md": "1f0112b7797923d620a08020802fa6e702b79a34051a393abcfd674de2d56b72"
    ".opencode/commands/shape-lite.md": a62d2cce2677a5d29cc0bdefc1034dab7d560e9e33b73d9a9464cb1c71787b0e
    ".opencode/commands/shape.md": a9c091ed89541016e40502a8458e83da5d8dfce072a6e04d8c787afbf301069b
    ".opencode/commands/ship.md": "0c854ecb8a070072dd97d30e90cbc5fee3c90ae756dc11467ba4f1a108ac69a8"
    ".opencode/commands/state.md": "6d860a5ee9bcc56943462b62e37e858cc09430fabf89f2324c98578a2794a419"
    ".opencode/commands/switch.md": "6d8565bf8f0b85fbc241cb3de0e389abec959bffb796e84e58678496f26e979d"
    ".opencode/commands/sync.md": "814817fd48af767c8b75b0a89e17970048d4fd02d59f1ad71a326758fc505886"
    ".opencode/commands/test-strategy.md": da062c2b25400b88e5d218e9b500b2a9c6a3502a3c02091a10420536597c7bdd
    ".opencode/commands/ui-design.md": "9f903532327b2af84c6e45f66ad4df50bca414c16d6c2ba6fef18161cda73e6a"
    ".opencode/commands/workflow-doctor.md": b511e97fa072cb1619d8e2b0c5c100172d1b59d5bd8cbf67c63be21d8c505fa5
    AGENTS.md: feb32484e13a3e18f30d3add7b4a99b676fcf8943ef3a6eaf6c1cf0b7f8fe99d
    CHANGELOG.md: da26e3d2b1714bbfa20f3778f21bafae3575aa7bf5dcfd453bff8343cff8047c
    CLAUDE.md: feb32484e13a3e18f30d3add7b4a99b676fcf8943ef3a6eaf6c1cf0b7f8fe99d
    README.md: "8b7cf7992df6b7c5401c418f8b87a8efdd0aa0399c046b12c34b7e27c3b9804b"
    SETUP.md: c1e234187bd02dc51bf42662ba6a41d6ae57595d5529301d3ecae36c57f8817f
    VERSION: "9bd51d4120f0ac96a8e2e9f9a3e68e8175db7659324704ba2306aa682dffec33"
    ai-framework/docs/design-notes.md: f4141e7d74b56f20e8e2deec14eb19baf5dbe233b925183025b9ebb5c848f54b
    ai-framework/docs/extending.md: "935499627ae1c09fe618f9c8736e66b3df6aebed4ce14206448e283949c7588c"
    ai-framework/docs/knowledge-graph.md: "6a98e9fbf1fe90fdfd712504403ac3faf2e7e29bf7ecbbfb80fb18f74b83ce1e"
    ai-framework/docs/pipeline.md: da7eb210d0263bf82b2a3f4de8046a5fe396623a7006aefc748dc09b2067942b
    ai-framework/docs/setup-validator.md: a616b2971976374fb0987ac53d0ec5cb641a39260b194db2b0a2125f1501302a
    ai-framework/docs/setup.md: "9792b1079b82f19e46ae3338cb01b2eb55823394cffc69ceda5aaa157f1c11ec"
    ai-framework/docs/testing.md: "2c6d49b64898f9b30250f07fa55ab7de29c4b5702733280595e304a0e209ef95"
    ai-framework/docs/token-consumption.md: c3c0b442989f000c323e851044f10c26b5c9bf065546d7734eff4bd0249132cc
    ai-framework/docs/vendors.md: "144911290b522d3ac1356d6d7f3de538a7fd0ed2b4fdac8b6cf609827b5d458e"
    ai-framework/docs/versioning-and-sync.md: "6993335e25990ee864d5050b8dad9e15544813c6ae4cb1ef3eff89f3e9f53e5d"
    ai-framework/docs/what-you-get.md: "7cb906b4029ce8d6b8231c60f88ec3d6ac22cd61db77728939b1262a730c0c7b"
    ai-framework/docs/workflow-doctor.md: "2a435ab9db182c9e251775e4961210db2b93e4bf2ecf50d7b183bacb79cf0b2d"
    ai-framework/hooks/hooks.json: a043f76bffe935b69ffcde83f8ee411ac0c8db390bf1e0b5ca0a515481aeb738
    ai-framework/hooks/scripts/metrics-lock.mts: "3735953435a9335c986077b676249ce84eb4c700c47842490a17738fbdc302aa"
    ai-framework/hooks/scripts/metrics-lock.test.mts: "64e98bcad00c630660891a4c337ae6f93871266ad2bd380ff7fc97cd0c7c0ce7"
    ai-framework/hooks/scripts/opencode-plugin.test.mts: f8c3cc0155dd27a1d15edc3a8eac8673625d4e974407dd9a670d64a7f6329323
    ai-framework/hooks/scripts/orca-start-codex-hook.mts: "04d1db5cbabd8a2d92c74ace3c4ed18aecbd86aa5e0d82c1ec5983d878bec9a5"
    ai-framework/hooks/scripts/orca-start-codex-hook.test.mts: "23b7dd3444ab20ece59faaa0e6ef9aaa8324c8c6afe46be288d241036a2feb06"
    ai-framework/hooks/scripts/orca-start-hook.mts: "37908c66cd1044e2e1b9b84c88819d495d1c8c2d7c1de18e8485700e0922babc"
    ai-framework/hooks/scripts/orca-start-hook.test.mts: "5f08b7a54a819b2aba16a6443110020d50e2c73c54eaa7a32738bc3dadb2c83e"
    ai-framework/hooks/scripts/pre-ship-verify.mts: bb32bd2d5885a9589c0e2ae2247dfc4db7d7ec5a891e4548e752aabd9e877e95
    ai-framework/hooks/scripts/pre-ship-verify.test.mts: d2fb5a3c8fc8ffc4beabe8ef6f7a8b1335f6fe6dc0f6ce35cba98a8e4d7c3ca9
    ai-framework/hooks/scripts/stuck-uphill-detector.mts: e3eea81bca629bd8ed4a4c6fdafd1c132b6e210814c64ca1a8b4dc7afd0807bb
    ai-framework/hooks/scripts/stuck-uphill-detector.test.mts: "555391b2434a5c7b990b50c9f0f44706f538fd65403c8c0421b2dc6f266dba70"
    ai-framework/hooks/scripts/token-consumption.mts: "59019aab893efd99e20ef3a909096811f5cd05c73d1a7444db32e6e9070b260c"
    ai-framework/hooks/scripts/token-consumption.test.mts: "9f2af606afd074ef84d734f79c116f6dc63cb2256d4fbde616e7d15b315e3fe5"
    ai-framework/hooks/scripts/token-report.mts: "16132e33e16b1758b46a82e5cb7f4f8b78f972d29d8491dcbc0fe3e14761780a"
    ai-framework/hooks/scripts/token-report.test.mts: "25261c9a3edb5c9ea11a6f50e548cea6987101c05b7dd405915e888ef78b40a8"
    ai-framework/hooks/scripts/transcript-usage.mts: eb61d064e51ec7dbffb15df93fa4c821b6abc9cdf5b3ce1e49000d8e14c75c6a
    ai-framework/hooks/scripts/transcript-usage.test.mts: d4f44ff24e69030a64474238d7a628a8d3554b320614e7d827426edfb164d612
    ai-framework/hooks/scripts/workflow-capture.mts: a405d52d6789dfabbe86ed697c459c96c24c8b862b75870fc106f3b8725cbf58
    ai-framework/hooks/scripts/workflow-capture.test.mts: "220a5ba991285e67165c0f26b73260aaea3c5a64065badb3df21d3ef657e0b78"
    ai-framework/hooks/scripts/workflow-notice.mts: "78922fb86d1dd5370c70186eb50f6e520808496d7324de0e2a8c3529e8b631b3"
    ai-framework/hooks/scripts/workflow-notice.test.mts: "71df25da12987497f1bfd071ce6ded207a08f1678927bc7d24b360266fcca6d4"
    ai-framework/integrations/harnesses.md: "0ef7fe3f102503aca042746a339479b83724bcdf36f72dbf86ecaa8fe843b827"
    ai-framework/integrations/orca-vendors.example.json: "9b02de69ebc7d86ca64b3a91b03722c22b4b51c83df30d88b58a31e077c0f24e"
    ai-framework/integrations/orca-vendors.md: "80cd5074f41697a305a921d3495fa9783929980a6503c61a47faac1df4308658"
    ai-framework/integrations/skill-defaults.json: "68df8f9dbe489506898f1c7468ade4264b7185c782ae4a67220702db1e251c31"
    ai-framework/integrations/skill-defaults.md: aed215e20cfdf1fa4ef52074fda880603e491694f2ba47028c0bf2423afaebd4
    ai-framework/integrations/skill-vendors.json: "984d7f2969bd6e7556604df438ab867002efd10341a01b6f0bc3eae4d8b436c1"
    ai-framework/integrations/skills.md: b23b038ec29166d37045703ecf1f99e512cd9ac44ea3efe29ff6768dba9f2403
    ai-framework/integrations/state-report.md: "2f7049c70c92d2209186632d3b9bc79e126f6bcffa75c43b99b75edac8df8dcf"
    ai-framework/integrations/workflow-metrics.md: dcb13ff9d2c8438df62dc7bf677f9fabbaf5d5f3caca2ad804241fbefe23bc0a
    ai-framework/rules/boundaries.md: "61a96a6c5f0080cc76bd9ed36334c5b7a78d4d9fa26ebfe99ce746a468d4256d"
    ai-framework/rules/canonical-mirror-sync.md: f7b6f1aea6da8ac7b632c17c9a8ff8d9f1a0c52e2cb23dbd34698007ad0e4d36
    ai-framework/rules/ci-deployment.md: "057352139e4a49be9f14ab4a768a5506a7efd9b0b898b49a32a214bb306d51e6"
    ai-framework/rules/coding-standards.md: "8cf88955b0a5875c55cfd289a34d1f3e095ac82091ed43c5ac9bdaeaf73fc87c"
    ai-framework/rules/component-architecture.md: "29f3a8bcd7448f9baf7187c117627c9a00401d79dd346b6c7a9ed58e6592b6e1"
    ai-framework/rules/context-management.md: dc17def4e97dbcb6ddc830b0ffab9e4e34e47337a743d3b2f25a924b69ec2355
    ai-framework/rules/data-modeling.md: "770be714ae5704510f8eb281d490775b9360d6fb0eeee1ba827a9f35199f6faf"
    ai-framework/rules/eval-harness.md: c4d2d61523679b9916c98eac78503a7875c6e16f2fbdf0acdbb15ed3060c07c1
    ai-framework/rules/i18n.md: "0b01cfaa7a5ad3a55fcd5584768834c7b65d639bfb3ad3e542436df34ccbb3ab"
    ai-framework/rules/machine-data-format.md: "4d1812f421e26771ae07e526dd0cd15f60315d8a1e7a7a3cf6348560b21a1d3e"
    ai-framework/rules/model-routing.md: "808a11a5bb154f60185c7aa89be669f6cc36e2ac58e6a2f74c1bce9a53747eda"
    ai-framework/rules/observability.md: "1a9dc8f8b13441fc0fd90d0da0d3ebaa1a4bde7e2c216db3a119b5a321e57fc7"
    ai-framework/rules/performance.md: "96a68ddf97587c6e30246a0168c2fba4e7253eec5981b742ec89af9a4e17252c"
    ai-framework/rules/security.md: a4ca5b64c845bceee7c022cfa71af90d30524183e84bab40fee0b6adf1bf98c4
    ai-framework/rules/testing.md: fdc77ea6b96206e672fc82d1417597a9a20e1f49a869a87decff997cea8023e4
    ai-framework/rules/tool-use.md: "502c479b4fde12525f8e612c6580e133efb1000829f77116a68811415826268c"
    ai-framework/rules/ui-ux-review.md: f44625f2cb8a7f615e22de2902d572d46056ae31894c19cf83b66e259d98a1cc
    ai-framework/scripts/add-skill.mts: "139e28020ea1e8364a5b1a477ebd04a3c23131752abb622a2a63ee7ae0b5c2a1"
    ai-framework/scripts/add-skill.test.mts: "457362b3cddaac608c53e900b8f58de0f64e74baf2341a1c467ada4a03b30a05"
    ai-framework/scripts/agent-frontmatter-invariant.test.mts: "6cd46140d41c9a829d0b257e289d13097db9e4c70c6e3b37a90857772859d62c"
    ai-framework/scripts/browser-runtime.mts: "1d41e97b1f475de584753f75373da01ed5311ae34e7d8aaad84f7fc048b30b1b"
    ai-framework/scripts/browser-runtime.test.mts: f887f452e1f734435b74d1cccd4e97d1161d5efbe962d8e255639214e3c04f9e
    ai-framework/scripts/bundle-sync.mts: "4e85d956e280ae4c699903e2373b67b55200f2f4c29ea1379a0bd9a8978ff8b5"
    ai-framework/scripts/bundle-sync.test.mts: "082b41ffee498dec13f5d70a5cd6dcbcd5dc60ba6593d205bc012713c213034f"
    ai-framework/scripts/changelog.mts: b6dcc744ccd1da5e621fb3298d9fc2d2b67fdf64ccbe45fc472724922207880b
    ai-framework/scripts/changelog.test.mts: "9f9d8de5c8bd881814a59fb817a6e3d92bcedec62519ab48a3dc8474fbc863ed"
    ai-framework/scripts/config-migrate.mts: "522e406ba032d4de9914926abf0eb271d6b6d16b32dd5801791230ffc90d8e34"
    ai-framework/scripts/config-migrate.test.mts: "09c90a02536f7e47ca8b73d82252dfa84ff1b11240f668738c29dfdd5c07f130"
    ai-framework/scripts/docs-links.mts: "69d9231c293ea15ba740d6584f8437d2b100029050c41290a9324030046e3ebe"
    ai-framework/scripts/docs-links.test.mts: "937774f162075024a1f2bfa68bd358836cf857a9f368cb449da78d5da95b6736"
    ai-framework/scripts/entry-import.mts: "452a6e05b8d92e1f8b190d99160e434b86f73a228bbc3bdc4f52359c8bfe42d4"
    ai-framework/scripts/entry-import.test.mts: ffd52ffd00f1459122060619309860eb6303dada847ca74f15b956ab108005dc
    ai-framework/scripts/flow-join.mts: e260428733adcbb214c2753725b96db55d592826e4de3a1245b28487bdb69149
    ai-framework/scripts/flow-join.test.mts: eb3f5f8281342cebd51779c44aaef8a728dabdc29864b2161f0fcbce6d4ae628
    ai-framework/scripts/flow-render.mts: "8781e59b3fe094be1f71c6f227d8440df70dcf7415ee13f0435e9e719735f482"
    ai-framework/scripts/flow-render.test.mts: "43264ce93320730f34547f1c0a9d971622248e5b8cb11c0d68fd3c239175a967"
    ai-framework/scripts/flow-report.mts: "452f07f06a6d57b268b53afbf80ef7ac5f4d94219998f2ace8e691d370376bb1"
    ai-framework/scripts/flow-report.test.mts: "908fb93e9f9b46d7a04f6afd952368db777beaeeb32713bfdf7d4d5493bdf0fb"
    ai-framework/scripts/graphify.mts: b15b994c411783aec7e8dca621088c9f9bef175688438eeed6ae4fe301801cb5
    ai-framework/scripts/graphify.test.mts: "1a4e95b3e13555004842b9af5c43173d356e2036a31e3530a40a0d851f1bda36"
    ai-framework/scripts/instruction-loading.test.mts: f430f3f61e72e42be161a10f8331965a6ee462a44f086f63cea25e0b8aa9039a
    ai-framework/scripts/opencode-service.mts: "6f20412410482657070a033d5e9309b7dfa6d9904245c25d9253ff25be39c003"
    ai-framework/scripts/opencode-service.test.mts: f74ae7c9c1d95ab13c00f087a7667082aa5f314aff5baffc311a3dbd036ec38e
    ai-framework/scripts/orca-apply.mts: "3031386c17d1941e899ba565a5ebab6cc8e1cfb9ff280bbca6cbebe3e766af26"
    ai-framework/scripts/orca-apply.test.mts: c677d2be9887b8d325f2a1b05035cec07d0b146c236fd8c724b4a7d4b6c73834
    ai-framework/scripts/orca-assign.mts: c90ff858e73f04328917eda589f904a0eb1d96643042eb8a1c87499eec90d052
    ai-framework/scripts/orca-assign.test.mts: "139c68c878e6ea6dc5a97d7b269b09491474e32b97bbd48f124efce11669b3ff"
    ai-framework/scripts/orca-diff-admit.mts: "1cda46e26b9a70a74753207b341a640b0cae42704002395f46fb4773277739b0"
    ai-framework/scripts/orca-diff-admit.test.mts: "3c337c6545bf846337d38635d810e220ace7fd2809dd718906e167c2b842a1ae"
    ai-framework/scripts/orca-dispatch.mts: "6ba5efb1e870eadfbf279f58353007188d72ae839afd4ec1f01076d5bfbcabe9"
    ai-framework/scripts/orca-dispatch.test.mts: "2948ecc2666aaeb54f139b074696ed68087f57fe5ea1649f03fe3a9b79b6ad19"
    ai-framework/scripts/orca-eval-grader.mts: aa4793bed42f7fb6d72580a83b18e8d10660ac239908f4e8c5eaa6135045be11
    ai-framework/scripts/orca-eval-grader.test.mts: c761186bc2e975446314af94fc10a62a0d4c793223aa00b9e3ac7e22b358c1c0
    ai-framework/scripts/orca-evidence.mts: "490ba3b395e1990dd2a52ce5b7d5732d734e59f65f154cb6b11308289952bb43"
    ai-framework/scripts/orca-evidence.test.mts: a39f7617c926eb5ff76bff449a901efb484a391eeeb476b645ba649309ac3035
    ai-framework/scripts/orca-launch-gate.mts: "6a1af51f400040781fc0ded7c9395b35c8bdfa94af537af46acc312092927e92"
    ai-framework/scripts/orca-launch-gate.test.mts: d4d1e01fdb9f4e4b0f191966e3d0907b3ef1a28f249c3a4882e09222187eb0d7
    ai-framework/scripts/orca-ledger.mts: fc0b481f7cf7608bd33bea386cef60fb70b24a526ec3f914a2529572dba3e333
    ai-framework/scripts/orca-ledger.test.mts: "2e287dc27fc617085cb3d0867396fd6ca0d98c056e0a24d6167b73ddb2b9029f"
    ai-framework/scripts/orca-policy.mts: "60cd83f4c6b47e10eebe48b9a4b156e4a535c249652f3d2dc3258d8ecea1a569"
    ai-framework/scripts/orca-policy.test.mts: efecdef629d7e758cea86b2256c2ca10450e8b3feec704c5462928b5ae002f44
    ai-framework/scripts/orca-preflight.mts: "225837b18440d8ce273ee4c4edda1fbc0a8121523a74649cd51318cc9df2c948"
    ai-framework/scripts/orca-preflight.test.mts: "64d7548c38a5722b1386bf92533b8223944198b91025ca31c72783a22874d794"
    ai-framework/scripts/orca-reconcile.mts: "27e707fbf19796e650cc2cb1a84d4eb1c9ea114972f11e8dd7e245b209dcde5c"
    ai-framework/scripts/orca-reconcile.test.mts: "6007c462299b3ecbb30c05887a4fd3a3cfcbc595de145e88808b2354bc1ec9c6"
    ai-framework/scripts/orca-run.mts: "5c0e0b1fe0f530d23c037133a8ada8a4623ee87e337e587c1443fe7354ec6b74"
    ai-framework/scripts/orca-run.test.mts: "6c1da356ebacebb46a888d7c0893a00eadbf1c54d65435822e62364f5e0dd75f"
    ai-framework/scripts/orca-start.mts: "2dab69fed6ab26485bfded1face68a073cbe7fba7f1eb15e9c836188e7575ac3"
    ai-framework/scripts/orca-start.test.mts: "4e9be424f41695abde281336fbc8a9409fe8be8e8cbb0b50eaae2525062d9496"
    ai-framework/scripts/pitch-archive.mts: ff8bcc2ab1e404be5647bba6c4b0170cdc692615680b8cbd0832854252be02b5
    ai-framework/scripts/pitch-archive.test.mts: "5daa7edc577b9cc06e575850254d1922b19f5e25cd499d55153e249189b03eca"
    ai-framework/scripts/pitch-compress.mts: b65221150ec1bb998c393065d7f9f24c74e79f86752b7d6e9d5a337d347835fe
    ai-framework/scripts/pitch-compress.test.mts: "9b951cd36bbb9820aadaf251458aa4cc984e8d1331295cfa0efaf7f2273311dd"
    ai-framework/scripts/review-bench.mts: "02a4a38ff2811ae851b2d3f3248f1b1e2a197516f99ec259d491ea8441b9fead"
    ai-framework/scripts/review-bench.test.mts: "0cbf0dd552002ebd9cb651beafee114e146b06e22365138d8de0736b02ed04a3"
    ai-framework/scripts/run-tests.mts: "6b6202eef04a7337cf30b43e3b651635b7c2e3dc41335cd2f0010b5a6e4799a7"
    ai-framework/scripts/run-tests.test.mts: "1b585a4f2d2d8ad77f812c4293c9e39c20924af84752153428a0dc9cf9c8362c"
    ai-framework/scripts/runtime/README.md: "4beec211f68764c4a2b219aad3e50fa1a0bfe0e4bd3a31434da9d323d922de20"
    ai-framework/scripts/runtime/bun.mts: "489795f0d02a8d4091e13602a21ede6d0171760e1acdabaa4635f9cd84a2d5ec"
    ai-framework/scripts/runtime/cli.mts: e11c515cba0a95bdccf04572f32b3c952380ce711bd86ab36fc043ead18ae78d
    ai-framework/scripts/runtime/config.mts: "0f305a481661cac02b794f88be45f804956de857d7eebcdd7f4a7896a6962980"
    ai-framework/scripts/runtime/config.test.mts: "9201ce7e1817efb1f9fcc6de062d4f170202b1a8f4465b4d3723960881aac5b4"
    ai-framework/scripts/runtime/data-file.mts: "929d6240eb82a5efabbf3009d9f3fd0c5bb0612a928379b952aa9c82d17e1a75"
    ai-framework/scripts/runtime/data-file.test.mts: b431039c1793ceb7d99844ac6005bbc6802348d7a19eefd6a5ed7a56f5ffcf78
    ai-framework/scripts/runtime/entry.mts: "62edee638b130c9eaeb2126c30467928509e3eb73c1879403238ab1b8e25698e"
    ai-framework/scripts/runtime/entry.test.mts: "369aa62e6f5f20c141b05b75f4ca757a0d890252db942ffb8c5e2fb8678cccd0"
    ai-framework/scripts/runtime/env.mts: "6c6a09653c454bddb7a4b5c3769633eb087cb18b9bd904f0065f7ba03ba82c6e"
    ai-framework/scripts/runtime/invariants.test.mts: "232159017258e7e183d824725dfc68fdef8c31e92e01b9b4d0b79059e2db8bcd"
    ai-framework/scripts/runtime/migrate.mts: "617f10fdcd383f80330305b5057a90840ad8b4c42a4e18ab2c7f9044b0ec8c3e"
    ai-framework/scripts/runtime/migrate.test.mts: "9d8e84638c35ea3ad7fb8f4b8495c45000dc02c74965166c09c9c9d250a8f599"
    ai-framework/scripts/runtime/node.mts: "45c1551bbcbc52e63d54eaae9973bc28dd25628bd63797fd5757909102a4a2e8"
    ai-framework/scripts/runtime/oex-lock.mts: c324476014d7feb59452c50b17ec583450d140ae224cdc4cb6191d64a15f17dc
    ai-framework/scripts/runtime/runtime.test.mts: "1a6216d224eb259bc93b316453a7805a47fc1f412f7cba30fc9cdddecc8273c5"
    ai-framework/scripts/runtime/select.mts: c68e5af73849bc642305cc341392bba7dc4166f270f43f1a083f15dc3856f630
    ai-framework/scripts/runtime/semver-range.fixtures.json: "4c127de6e98037f31ccbc74461bfe97ed07dc471af893d7f16dc97cb220e30be"
    ai-framework/scripts/runtime/semver-range.mts: d06baa220e9a3a4646c9e97aadf39d4ac8e57cfe566614f3c54ab7af1fb8e80c
    ai-framework/scripts/runtime/semver-range.test.mts: eb164fc979e9a434e682ddd283db3696f02df677d8a4af139f23da4807a9e7c6
    ai-framework/scripts/runtime/test-helpers.mts: b87441e3dc5d1c223ac7db566afbe5ec367248b4a4f8285485c9bcdc5d85994e
    ai-framework/scripts/runtime/test-helpers.test.mts: a320f8e7c4ccdcc72f92527d93bcacee0fc2a2144d46dac43ff7400df22249c7
    ai-framework/scripts/runtime/toon-data.mts: "3c2c402934a07b7da5056d776d6fa39091182102479fed9a349bb27e1191012f"
    ai-framework/scripts/runtime/toon-data.test.mts: fbec4a02e85e04c7d6c2313e0d9aa4de133c306bc222ddba49f99c425dfbd60f
    ai-framework/scripts/runtime/types.mts: "29992cf482d689126b23633194750fa28a3bfaa6143d9f12045a5a78a7e6a0b2"
    ai-framework/scripts/runtime/upgrade.test.mts: "77153c81dae500255f9ad0adb922dbaec46de46953347d55d0d97ef69b34c66b"
    ai-framework/scripts/runtime/validate.mts: "65576f08658f62fee0d4742006e95db894bf248a4654418782b9a2be25afeb7b"
    ai-framework/scripts/runtime/validate.test.mts: "3576a389182adc50dc05794f6e78e6e6e095e48714f225b53c0090fad2cdd1cc"
    ai-framework/scripts/setup-validator.mts: "132ff8995b1403b7ec479532df71b39aa69b4a1a337a1102c3c0e41b3ffce321"
    ai-framework/scripts/setup-validator.test.mts: "66476d0a0301f33325623909ad510938b6bec2a7fdd82cb16e60d3fe35cacc2f"
    ai-framework/scripts/skill-compress-guard.mts: "60a9c252d6955a33206db67477995a17dec245c4101d7eed2ad9eb736bc6e46f"
    ai-framework/scripts/skill-compress-guard.test.mts: dce94212236ac8bdb5642a648561be36b4b7af2b72789195e546555e5f363466
    ai-framework/scripts/skill-defaults.mts: b0d1faaa4d8edf3a983ac1fc054ae39994a3687e94c1bfa11bc3e582811d1955
    ai-framework/scripts/skill-defaults.test.mts: a712181bb389e4540f3068fe4ef25a2bfd00c397ae4539798269f71aeab8115b
    ai-framework/scripts/skill-registry.mts: c88bc17b9a056febaa298a62f5aa1ac83b6af24e060acf49475b287e2342dcda
    ai-framework/scripts/skill-registry.test.mts: df1bfbade1cb60fdad59f7c7a84c8cc35982b0402ee1935e937ba8ee6af6135b
    ai-framework/scripts/skill-source.mts: bf71133a6af736463f3633a62a4e7450a99115902dab7db1dfcf3b6a778610b3
    ai-framework/scripts/skill-source.test.mts: daba16d72dbe246df0e8605e50e2c81367b3afa8aa3969922c88a866be937259
    ai-framework/scripts/skill-sync.mts: "7dad4f0c56fd583377aeb71cfaad3823f1e738532679edfc2b0d2b642375d4ca"
    ai-framework/scripts/skill-sync.test.mts: d3622471616a428c5ef5419ba0dc953db1a36036c286e556774a384345a561a9
    ai-framework/scripts/skill-vendors.mts: "013a987c9ae527176ff5248ab3c458c34c8026dae0dacbf2e54f3ecba7c460c5"
    ai-framework/scripts/skill-vendors.test.mts: ebdcc633fcc6bf0a2cde01eb1ea259bcf86339e97d132916dde5f8b80b19434f
    ai-framework/scripts/state-charts.mts: dfd6516c509c89a66289cffef0803648f5891ad222594bac1403d3cf9f07ee0f
    ai-framework/scripts/state-charts.test.mts: "22bd405f1d994cb6d40d6ceefe3acc669190c2a16a9c8685c73ee1f5c5a217f9"
    ai-framework/scripts/state-design.mts: d992a544bc7c2daad1fb17e13be8dce2e22011fba1d2893273a396234e3eedd0
    ai-framework/scripts/state-fragment-dataset.test.mts: "59c5e3e24f7b32508e6be3835e4dd3274f315e1804c09d34de85cdcad92ab1f8"
    ai-framework/scripts/state-fragment-evidence.mts: "50380b5e5a7a7e82f7a179f464f437774b2fc8df3f71935ee5a9de8792416eac"
    ai-framework/scripts/state-fragment-evidence.test.mts: "25e49ec95e07d372d759195208733caee1e29b3fc7afb31226c0a96b876cc3f9"
    ai-framework/scripts/state-fragment-inject.mts: "71269a3070c2d64b31ad6be90bc598068a634a4321f78a4aefe6e4b980ce861f"
    ai-framework/scripts/state-fragment-inject.test.mts: "0908d064fb22fc1478dea909a387c0c7f841c27db38b59680e4364aa2a4c0fff"
    ai-framework/scripts/state-fragment-parse.mts: "8df6055a80ecb0a4cdf4da254676ace9a3fe86d805ccf7a19f31eec956193d0b"
    ai-framework/scripts/state-fragment-parse.test.mts: "5147ef205f61142ea656a03db86f062e3c4a00a35735b68db7bc58d603cf53f0"
    ai-framework/scripts/state-fragment.mts: "78ecbed5fada3d219f4ab43f6daa1798dce6fe05e846e5fab3a1426c32b201a5"
    ai-framework/scripts/state-fragment.test.mts: "6f51958f27645d141d2fbd1d8f16fe5b42438533b57bad98b547fa8a8c04bc6f"
    ai-framework/scripts/state-graph.mts: cde9c5f7df0e3ce159e20a11565ec681945415955397ec2c8747fed9455c2d7b
    ai-framework/scripts/state-graph.test.mts: d3903429ebdaafea675bc68a5dc048cf05b5a1aa71b23bcadbd2769af498fd73
    ai-framework/scripts/state-history.mts: "64241c5e5fd03c29d6675f6c0ab3193d846612af3af997e673e93cf0a77e4ec2"
    ai-framework/scripts/state-history.test.mts: "01a504a8f75ced89af315b2b0bf187d0899a1924bc08153abc812f55e9d59991"
    ai-framework/scripts/state-html.test.mts: f539844e21b2d836cd7df8556acf20a1e130065ceacb79c607b804693214f872
    ai-framework/scripts/state-pages.mts: adcb50917171fbc4fc1ac01965d08a0003dba004a3eb41dac869baec0f802d08
    ai-framework/scripts/state-render.mts: b04c2383693502ce91cef1ee0b00b854e305384364bb6c5f3aa24126fdcc5b53
    ai-framework/scripts/state-snapshot.mts: "65aa3f9a06f683938a5f2709a56cc498a27cc139a2436db694b7e99cbb7f64ac"
    ai-framework/scripts/state-snapshot.test.mts: "5ace7d8a47089c2a38fbc7aad52591e3c3ec4a0d75c9abecccc5effab7c8baab"
    ai-framework/scripts/state-structure.mts: a2e60745aedf7923b94bc4e7a223cf12b3b1a2049cb84a82dbdf8a8b122b7d6b
    ai-framework/scripts/state-test-helpers.mts: "3d71a4358c3ca3b17a0f0fa54d878b6dd663dacf2d6c5d5a62673cf81e5373bc"
    ai-framework/scripts/state-theme.mts: "3e1f778d8046718768c63ad45af09870b617ddcd7cf1e19294a617d855885cc8"
    ai-framework/scripts/state-theme.test.mts: d3240c16c2ad631335b57b9124d278bcd32184a36256a39f29c91fc862110f51
    ai-framework/scripts/toon-convert.mts: "10e305aa561aa4136409aed61b954db1bcf278faf8a9e62aa953d3efe26cd5a9"
    ai-framework/scripts/toon-convert.test.mts: "537503e2455ad1da326978dae0f13974bfd4e07f55cfe684ed3470f4b3c17a58"
    ai-framework/scripts/workflow-contracts.test.mts: "5fe4477b8d32c84b7c5bb3d194bdec66e4e69f5ae1c03bece46754579dc933cd"
    ai-framework/scripts/workflow-doctor.mts: "54fc4f0203ffdd3a2bf8adb760b980d1fe73e3ebbf2f69fdae859818d7be161d"
    ai-framework/scripts/workflow-doctor.test.mts: "15f5b2e21ea5dd54b2c8b03d18674273cf40f9abc252e2b09027595811ab3223"
    ai-framework/scripts/workflow-metrics-report.mts: "98a28139b2e5fc4a965be5adc04331f677e4449668069af2d6dbbf2d298b8662"
    ai-framework/scripts/workflow-metrics-report.test.mts: "26b2c361577908cf42bc3b2150328bb0f98be18ec0558bb3db462434592b75af"
    ai-framework/scripts/workflow-metrics-state.mts: "445170d9a49119f9479d522e53ae9421d567ba7a57886c048cd289a261c7fedb"
    ai-framework/scripts/workflow-metrics-state.test.mts: "0b5914c1446aa7757d328679871d0e19195be7027ec55a72ba02e40b98b124f5"
    ai-framework/scripts/workflow-metrics.mts: "8ec0824f72cf45cd0c9565483250c51664136ed679defc6301eccfcf9268d35f"
    ai-framework/scripts/workflow-metrics.test.mts: "97857efe0bbdadbf3b52bc5af44de832ce0685e6bbb6c4fa57f188bc32962b7e"
    ai-framework/templates/ai-workflow.example.toon: dc41ce03805031b0b4b7e2aa7153d05525bc8eeae65fcbd4790effe0146981c4
    ai-framework/templates/ai_workflow_env.example.json: "98dbcb3a7b9da4a149e67cd26c8dc4e416e7b1a7dcb22ce09f728c7924850017"
    ai-framework/templates/project/analysis/README.md: "9116655c8f8d3e6dcbdc69fcd32319804724b18bb6fb52b82ca23cdce9dd5a90"
    ai-framework/templates/project/context/README.md: "5e76c38ea55af9925fc68548f7fad48373d241c0cd180943b29561ea725a91c9"
    ai-framework/templates/project/design/decisions/template.md: "53811f0820d81415253f2a4efe16fdb45227a8ed55f04527d1b59e0d92373ce5"
    ai-framework/templates/project/design/plans/rollback-template.md: a78158600a847a6840ee761e2481890b80bf8609084a92862fe805a1ed812cab
    ai-framework/templates/project/design/plans/template.md: d62d8649f6cb97dd3db9622f4f86492ff75037ff5afd0e216aa12a9953d16c90
    ai-framework/templates/project/design/template.md: d3482dc696b3893231b2cc6a54c7457784119fe9df4e8a4976464f9c15628196
    ai-framework/templates/project/design/wireframes/template.md: d3482dc696b3893231b2cc6a54c7457784119fe9df4e8a4976464f9c15628196
    ai-framework/templates/project/done-work.md: c721b6ec084de8a11a31b5fae753746888c127b85952a335a860ce100264465d
    ai-framework/templates/project/knowledge/README.md: "99e824eb8d955ffb4ee50b41fa0ea2501c42fce1749690eeab2c42385fe023d5"
    ai-framework/templates/project/knowledge/templates/decision.md: eb7b93ef148d3da5eec03c75a6de427cf9a648354bdd4b52da412929a8fefe88
    ai-framework/templates/project/knowledge/templates/entity.md: "15485085bf9faf8fa4a61545df7d795467dd28befe6dfd3910a6816ae0c3eae8"
    ai-framework/templates/project/knowledge/templates/issue.md: "9270185df6ff085341fab5905134651cd7e0a5d3679ccd604686149100dcc542"
    ai-framework/templates/project/knowledge/templates/pattern.md: "27621bfc41afc5c984fbc16d310b20715353b6df4dd8b36d82fd2ab3c97773aa"
    ai-framework/templates/project/pitches/_archive/.gitkeep: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    ai-framework/templates/project/pitches/_parked/.gitkeep: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    ai-framework/templates/project/pitches/_templates/hill.md: "6d728f73ff5b532ff6ef77949221a2dbe4f38a158b6d90985fb4c789530559dc"
    ai-framework/templates/project/pitches/_templates/pitch.md: eb927ca736585fec3e9afc14539582b5cb9b261e49085759b11f68bf01f8cada
    ai-framework/templates/project/pitches/_templates/plan.md: "64f750a6d2b90bd36c37daee3427e6183b61f4fb04d937a402f1db122e093b86"
    ai-framework/templates/project/reports/README.md: "6a09eb48c81bf1eae76b757230c20436a1a1709b45b7a071dcc5081b52766a2a"
    ai-framework/templates/project/requirements/bugs/template.md: "54f0dc660d2177883bedf8c02be5d6e368b2e1eeb6a5e597c1b2d20d39039f75"
    ai-framework/templates/project/requirements/features/template.md: "0207eec5f811c08b303783a65c697129a4c4a7f1cd803a9e8db06655e20ad5fc"
    ai-framework/templates/project/rules/README.md: e1f7f7c7cb05a750ee338a346987bd450e4e53630aec0690a2ba267d9cd5883a
    ai-framework/templates/project/runs/README.md: "11e2d6c91b7b1a3abad781f73017979a59d403a31bc608850cf7ffe32c99f0a6"
    ai-framework/templates/project/status.md: "317486b3922fd511b627e5d14b3c28b23b6da25d8950f9461f6f00e6e2f7d8ab"
    ai-framework/workflow/overview.md: "873bb51f966fef96b0c9970f36a35c3a7b74b6897c64095de318aad7d0b14301"
    ai-framework/workflow/phases/0-shape.md: "0837ca21f826f0e48a18070f574348c730081915f410ecb9bd95fccb2a1485b7"
    ai-framework/workflow/phases/1-plan.md: eb9c56adc6f045daf50c0ec6708a5ad4f2a609b6baed789f76c6b42d7d07ac54
    ai-framework/workflow/phases/2-build.md: d1f1a816bd653e7ab45a2703075eb50ebb2450e7a8015f336e6d4cd29137efab
    ai-framework/workflow/phases/3-audit.md: "067275df459da6fca94d083ec081076273043e98ce81f3cab9a1f1557b6a603d"
    ai-framework/workflow/phases/4-ship.md: a8685a3628670eeca49a29359eb6d3d8a9ed66250d1a5b472d7d103602899a9c
    ai-framework/workflow/phases/5-cooldown.md: "828633bec26df18363126a04e649f15e3f512014527030b8692f9f1a8b37a59f"
    ".project/status.md": e427b798c76d837566837baa52361b95cfcc3b3630815134c5bc2cca96d0b2ad
    ".project/context/stack.md": "999ae0207160b3e6c28aba32873f40631a0693571e4e1d41a804d20c0e70b0d9"
    ".project/pitches/connected-memory-consolidation/plan.md": "259de12cf95ab9c0ad68c518824338610375a21e3c1451e5e06ddda0c3d0509f"
    ".project/pitches/connected-memory-consolidation/deviations.md": b37e078c68496b77876dcdea95d716fea2df6be976a3b208601ef3638d53f34a
    ".project/pitches/connected-memory-consolidation/closing-exceptions.approved.toon": aaa288e412348c12222072613543c0a606645618335a87a3d347a0a393a5d92a
    ".project/pitches/workflow-v3-rollout/pitch.md": eba3bf397244c34e26b68e4fe7fadc4929fa4a160979ea40ed2fe3c558a7cb83
    ".project/pitches/package-less-ship-verification/pitch.md": ea689efee7916d4392e9f1b0750fc0e1844c1f527387bbf05c894e8ed59b47b2
    ".project/pitches/orca-bounded-control-receipts/pitch.md": e1cca59fa538576cb37f47b76d756bb640274e2badc3e6d34e41e5eb88930e14
    ".project/pitches/fix-retired-live-evidence-path/log.md": a69f0a38e643e70f2ce1357a3a2232cdffb711c5172b3954cc4d45b13f5f7c44
    ".project/pitches/fix-retired-live-evidence-path/source-proof.toon": "38ead5dcdf39d369ce237443e8aae327cd4b514eda4f4100d0a17ed63def4704"
    ".project/records/legacy-upgrades/state-ai-authoring-live-runs.md": "868e76e9eace40c14f8014e18a16a8fa5b702de13e5489ebcc29c4e7944fc24a"
    ".project/evals/datasets/state-ai-fragments.json": d91d990a62f40de75cbf5ec0b01b03356587a369d8d7a0083bb6e18db91c7f1c
    ".project/evals/datasets/state-ai-authoring.json": dfb5857b0d6adbbd391c12450576ccf619e006e76d1a30f0c3fb6e67a0b2664c
initialBenchmarkManifests:
  p2d:
    files[428]{path,sha256}:
      ai-framework/scripts/consolidation-migrate.mts,"8374daab56cac02d3bac575fe2191e8b332ee96860aa18a7910e268f4bfd74f6"
      ai-framework/scripts/consolidation-migrate.test.mts,c35da87119b5eb3cda0c000e31c96d220a86ca7dce1ccf7fe5d0d2449f697ab7
      ai-framework/scripts/done-work-index.mts,c31dabc332164f6faf4b8e143101b8ffd0065554fb322c8726b1cf7bc387fb2e
      ai-framework/scripts/done-work-index.test.mts,c5512956180a4be121c15b21098c1a560f09e0dfc03f51ee3006b60be41237b2
      ai-framework/scripts/graphify-refs.mts,b3d816aa913e16da3d50069cd310a92f83dd3790267d092e9d9e54f6d9f9ceba
      ai-framework/scripts/graphify-refs.test.mts,"24de7ac954d6d1ffe17de8e028444b9a6dab14f11c030350d1b3871179c3bb3e"
      ai-framework/scripts/graphify-relations.mts,"188a05a38c3aeb28dff9584d3915ce59436bb13e465630fbbd1181f21f20614e"
      ai-framework/scripts/graphify-relations.test.mts,"19dc94408c46fe6be23fc62b410bd6be8cdc235ee8b94512416d7e57ba435c70"
      ai-framework/scripts/installed-upgrade.test.mts,"8abf9eea79de9e02025fa710d94a0886da98b6a2725cd1c88c21c3c5b796367b"
      ai-framework/scripts/ledger-schema.mts,f3166ed20310c110b53fc2c26d2d55b06acafba4e592eb9124e2f158de54cf01
      ai-framework/scripts/ledger-schema.test.mts,b9a14c9c0cf5ffe3eb04c53f5b8ac23bfecf9b0459a64eeadb7706cef115a161
      ai-framework/scripts/legacy-upgrade.mts,"252a77e0bf0e926a812ac082774c4ea09e675716e3125cb4acba3d4a8236a95e"
      ai-framework/scripts/legacy-upgrade.test.mts,ab7788e9c067f6301f241765cca4cc42e229593094da681406634fb8fc3d8b94
      ai-framework/scripts/outcome-record.mts,bd5db227978b2e22c4b8842732cef663829fa0f191e6a786f2029a4cdcbe0524
      ai-framework/scripts/outcome-record.test.mts,"250a6c1e871cdb2332ca8c64ec0733aebad5535880f881786b35db0be5ad1d5a"
      ai-framework/templates/project/records/shipped/.gitkeep,e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
      ai-framework/templates/project/records/shipped/_template.md,c1d60dfa0eada8f2eeb3c317ea3dd0173b0b6bfc5695c99ec09273ce5fa90e59
      ai-framework/workflow/relations.toon,"1b9c854a1b0ada6eb7eede64571065213a035fa270fa45e9bbc32ab31acb896c"
      ".agents/skills/add-skill/SKILL.md",d7837a88324d9893b33da31c1488e7c70d8ce259f7c0e4a92ba73af5b7c18383
      ".agents/skills/audit/SKILL.md","32d867694d321cd0393e17d8cfa4245c7da6e205c61bac9732920f98c8c8cfc4"
      ".agents/skills/build/SKILL.md","22595bb21aeb07b260c7b8af5d082516d9367be95959b0d0d4d46416ccf0fd08"
      ".agents/skills/bundle-sync/SKILL.md",c0c161afa4744901449ad01a0d4563c9072db3abf16c8e4656b9fa0aeb2f1f32
      ".agents/skills/changelog/SKILL.md",d7d73123e3ffdfc65bffc53eb4f4b793e6b73684f2dd674ab409375491d06fd7
      ".agents/skills/checkpoint/SKILL.md","96556aedde6a13aa5fb77e064736cca30a1ab8f92e7be250a89bf17019368a76"
      ".agents/skills/cooldown/SKILL.md","3bc26b12ced53b161132efdaf651054ecce4e48a4090dcb0e476480260c43755"
      ".agents/skills/critique/SKILL.md","11c21a8556ab25f4afb115f8a14bb452955f63e05388074aec89ab8d6fc9bbf8"
      ".agents/skills/dependency-security/SKILL.md",e4c1f4cdb80ed3c38f67d3dc53d31c5fb038754fb4b1a01dcc040c403ab513e6
      ".agents/skills/eval-harness/SKILL.md","7dc9cab1549371b2b66f0f20b1e42e849deb28966e2457f1a69758af38a0c2b6"
      ".agents/skills/fix/SKILL.md","5e2fe2aec889f5bbe6ae7cedf8fa494734e29a5f2b8a70d73f38cb40006ff16f"
      ".agents/skills/impact/SKILL.md","938be82e10cfa944f000efc59a16074f731e35a252fc6a01b0fd3b4c172fbbd8"
      ".agents/skills/knowledge-health/SKILL.md","427b596f307332471287f33827a3663fa645c9772acd81feb3e5ea4f79e41339"
      ".agents/skills/pitch-compress/SKILL.md","3f15f6ee79fbc21807dd1ae81151b0c64294d42a151af34663ae65222dcb3dc1"
      ".agents/skills/plan/SKILL.md","123c4edf8cc16034b151526cd004c73ff9cf889ed2dd68a7f6317fc32ad266be"
      ".agents/skills/resume/SKILL.md","9f79d5026375dffbb792a8ab1e8c036f971fca0dadcc07870d87bf99df652615"
      ".agents/skills/search/SKILL.md","5e18fe9870171d720bd4626230a38a8cf33283337369318a16b84f653eef2b41"
      ".agents/skills/setup-validator/SKILL.md",cbc5acbfbd37c681cf03ee4b4e8a5904ad82ca9699661dfd5d87dad655b3f7bb
      ".agents/skills/setup/SKILL.md",bfdaeb0013c1bf50279c5788045f19f9766f0124afdb1b467af7d96c7b513d48
      ".agents/skills/shape-lite/SKILL.md","8db611a176e4aa8bce689cb69c5a4744be840a8cee8337c51de51bf06009d5d0"
      ".agents/skills/shape/SKILL.md","997e8ffca9913d7750cc2220380d1daaee781c80a72641b24ac5d297d0bb96de"
      ".agents/skills/ship/SKILL.md",ab3169550c59630fcd76ba82ef7d6a8d4585469d00a237c8edb6d5cc10f84240
      ".agents/skills/state/SKILL.md","5826d2916847ad938ece309158a36daf173ea9b5f3cf895b3ee0cb0e7f14cd20"
      ".agents/skills/switch/SKILL.md","96fb35be2e5f0df6beb3108aeb6891efa8907d5b43404112c8a3374e4b75a0a5"
      ".agents/skills/sync/SKILL.md",b5dc6bc484d7f2bdc89c42dc6b55ddf167c41bbc0ca64888215f21247ad23d19
      ".agents/skills/test-strategy/SKILL.md","22f0c4819c70efb45ad4d46dd7e86b5868e34466bc8ae3d1d41b62ce5f1e3787"
      ".agents/skills/ui-design/SKILL.md","02c16453c5bea27aa35e38099159b5437e2de053a722546385f0f8658ac99e8e"
      ".agents/skills/workflow-doctor/SKILL.md",ec23c3cddbaf405e4b233e28d44d2b0be1e83fc54ef956c19612da565ce60b58
      ".claude/agents/appetite-auditor.md","8eefe2784aa5abe39451f0cf3e62f5547e2f3be6371a365542d0bd42e6776dd3"
      ".claude/agents/architect.md","946d7b59066d8bdf600427f9178ba82418c8e552c01e6a2cbabedd312774f03a"
      ".claude/agents/build-error-resolver.md","46f47d4b31ad0e42923f4133a4c9732ca470348d8e3878ef82355647a8446fd5"
      ".claude/agents/code-reviewer.md","66e01142e0a10ce05e03a117d210181346e4b12e6ea20c0adf9625983151e8aa"
      ".claude/agents/cross-pitch-conflict-checker.md",e7730afa362b81ddcdd6e6d2c70b7b2971020ab59e1f0b80f8c9707a3f91727e
      ".claude/agents/cross-pitch-projector.md",abde0dbeb4996ba4711e6691c7d0eb6bdb8afb8f5ffd6c22bcc9747328cea484
      ".claude/agents/eval-regression-projector.md",bd18787da6bda83fec81f2776511d85045bf9e35d320d9f7f4a9240f59115092
      ".claude/agents/eval-runner.md",cfea69c7b1e5aedc7d351cfa770f065d7289022973cb66d13b183ad3802ff2d9
      ".claude/agents/i18n-checker.md","906c3cda8a507fedce3f0e1f13d96bc7ce8684173af0c457cec67e6003fbf250"
      ".claude/agents/knowledge-historian.md",df0db5fbbf9bcc9cc1eb54c4b0a877c7974a45f24393d56274a8996d2672acec
      ".claude/agents/planner.md","400e2223c32cdfdb856a21f276f63e19f634a57eb7203e3cd6ce23e425d6327a"
      ".claude/agents/refactor-cleaner.md",fd309d0a7dd9e8c096d7b8eb6deef8ee33c88a48df5a65e0bd0f2b8b7a7b72da
      ".claude/agents/security-reviewer.md","47447823a6a9e15b8ca65707847e7c98f2609d3872fade369d6899cec770e2d2"
      ".claude/agents/skeptic.md","2d35896e104c4757552fa4c5fa974c6728bae32ab66b26635f0f76283997cba9"
      ".claude/agents/test-coverage-checker.md",b0e3bcff229aa21b76b21932ac65335f3aea7e7d22c31d2421766c82f1faf08c
      ".claude/agents/ux-reviewer.md","08667ce6bf0d9624993bdc74fc2174a748853dee82fb0ac8530eb93a6deec03c"
      ".claude/skills/add-skill/SKILL.md","22e4c0f23b6ac18b6db19d81e9201f4ef8125728c4a3b1ad38ea7451b3a8d378"
      ".claude/skills/audit/SKILL.md","9e5f8eaff3076142e40d8e93503ab9d8a2762a187a341f2ed969b97fba049768"
      ".claude/skills/build/SKILL.md","6662d53b595604b84c39530190825667161b788d24df895c6415c82b4d994b0e"
      ".claude/skills/bundle-sync/SKILL.md","84e22bd6bdd331184c9c4e69f6702fc321937b640e8b7e0502f167bf8a4ec611"
      ".claude/skills/changelog/SKILL.md","521942ea8e70e925d6605de021bfbc894979430b798ab03c29c4b690108c1a32"
      ".claude/skills/checkpoint/SKILL.md","6dfd0aae2385b6ad32e82327318e56c75008385841eb2356fa843be3738c39ad"
      ".claude/skills/cooldown/SKILL.md",cfff5c90e9d90b4e5a26819c90a09e8763f3d88f5ea56f117d472105db2a4906
      ".claude/skills/critique/SKILL.md","8b236983598ac5f71387bb847baa369ba5e8ab17a6cd2f67ebf7ac33c86341c9"
      ".claude/skills/dependency-security/SKILL.md","02a6b95ad3f32f2794312f292bdb45f7afda53980167717344915c2112f13436"
      ".claude/skills/eval-harness/SKILL.md",d0b39faf3168f74de06e85d6a7047dc2e297d1bae728fe23627b54b6cf1eedca
      ".claude/skills/fix/SKILL.md","25a7a4016e8b78a3f7d681759110258adae018ea6f347196242462eb11530033"
      ".claude/skills/impact/SKILL.md",bb717630ba8ae5405b3679e17560d6767ab819df8546f8c717fcbcdc2b9e715c
      ".claude/skills/knowledge-health/SKILL.md","316cf25633a0487ba9326420ebb9b0ac509f4bef67bff6c77a3cf38c4ca3a26a"
      ".claude/skills/pitch-compress/SKILL.md",ea0ed82369db405bc787818eb303eeb6e74fed9ace4020baee74481eed0e4343
      ".claude/skills/plan/SKILL.md","0df576503246063397d86755d16b01c57a8b0ccbd4bf47920892ca8413b06070"
      ".claude/skills/resume/SKILL.md",cf880065b8deb14115915d0901d913c9715b0e602131d4a1562d836e32e5d771
      ".claude/skills/search/SKILL.md","23143001d0c245a6d55b62785ca821f069e2ac19a312e509568e4317f5922902"
      ".claude/skills/setup-validator/SKILL.md","8ece5995655d6576644cd586d8d4838f94a033c4d23cc70c3bc34ade1add7e13"
      ".claude/skills/setup/SKILL.md",adc701890439fdf8d0b0817c3282dec963fae7e8aaf65581093de5f9e6c36fc4
      ".claude/skills/shape-lite/SKILL.md","3a3cf74cd8ea694b11af10c94a4cb621b4465e22d454be5ea0635900ded44901"
      ".claude/skills/shape/SKILL.md",a2aa0fdb7f2eb3f929b771e9739dbc6380a54d4bff957e5aa964326b8a9aa11e
      ".claude/skills/ship/SKILL.md",aea1057d0dcd303da4d4fb98492726ce65b605f3462ad569cc52ac517b141f69
      ".claude/skills/state/SKILL.md","531c1c02b8e4712455eb1041e99dcd488a1f588d3673b0aee671cc80555deab1"
      ".claude/skills/switch/SKILL.md",f188b1e0a68430c9be5201b223c927367dd5ed930a0cb24662ad4f297215d74e
      ".claude/skills/sync/SKILL.md","1b1436c0edd3df80e54825f7cbd05f2fd1649beb23c9000d84152e089db3f206"
      ".claude/skills/test-strategy/SKILL.md","077ddf11f6b9851d715a528b51062c3cb4bf3f9b834a5fd5bee0fbf180138ab1"
      ".claude/skills/ui-design/SKILL.md",b49b04f982e1869c2e6dc0e0c9dd361cc99633a5769905dc3e92bdad3b4d94fe
      ".claude/skills/workflow-doctor/SKILL.md",c80f03e8a893eb37e51ca8b16961ac4cf2cc5e3bbf33a207f758790d40c48116
      ".codex/agents/appetite-auditor.toml","950d04aa91809e1f271fd4161def233e2af6cc381f0b3d24a1385b0adee06674"
      ".codex/agents/architect.toml","5c7268383d8d443e5426d197674a308d31b26bbb71bad9d83fbc5d1fa66f53f1"
      ".codex/agents/build-error-resolver.toml",a7166d2de56ac842a4c3a362df329e7b5a0387ac7f15db29a090493afadce997
      ".codex/agents/code-reviewer.toml","3c379b174dfca92bcbda008e61263a758ad48922e3bf7ba70d532e4637fd6eeb"
      ".codex/agents/cross-pitch-conflict-checker.toml","24af3aebd95784bb070de363adbbfddc553b4ff899b30b023fa85dd47cd510ac"
      ".codex/agents/cross-pitch-projector.toml","0d93072027c5325becbee585659ce3875662a92d085960d82b30bf4e97029ff2"
      ".codex/agents/eval-regression-projector.toml","02937025ec7da86f92f736d0649ab68ca2e495a2d83b850de289347a4ffa9d76"
      ".codex/agents/eval-runner.toml",dd5f532db6ebf0ca3e3e10b0ee80ab846b8c2f308c589d71bb191e24f702f7fb
      ".codex/agents/i18n-checker.toml",d8af2b2e17ea0180f613b3993132b55cfefe29fff03bea47b5fe1a4a8d9f78f9
      ".codex/agents/knowledge-historian.toml","7353de3fce2134043bce9394f9babb2b7ed87d9cf45486d8a60acccead569248"
      ".codex/agents/planner.toml",afbcacc2e157d89bb225173118d56f26b28209d118555a65549f69a7e3d4e7b4
      ".codex/agents/refactor-cleaner.toml",a56771324bf3eb9307feaa5aab560171de5edc7b8e4c918882a389520452aa81
      ".codex/agents/security-reviewer.toml","824ab52cf562da785219195aced4b87c820b79d8c18280a8c518dad9e44cb6ba"
      ".codex/agents/skeptic.toml","98fba04902c641565ba9c1fb5b00c472bf2249d4f37c03d2318e8c9218255a05"
      ".codex/agents/test-coverage-checker.toml",d61fab07a844c551bbc5fb82befadf97523532f6c84b065f2c9c0f7446586fb2
      ".codex/agents/ux-reviewer.toml",b19e62df117ed879d75b166c9ad8ac85a63c776c21aea200ed687eff2a654d29
      ".cursor/skills/add-skill/SKILL.md","22e4c0f23b6ac18b6db19d81e9201f4ef8125728c4a3b1ad38ea7451b3a8d378"
      ".cursor/skills/audit/SKILL.md","9e5f8eaff3076142e40d8e93503ab9d8a2762a187a341f2ed969b97fba049768"
      ".cursor/skills/build/SKILL.md","6662d53b595604b84c39530190825667161b788d24df895c6415c82b4d994b0e"
      ".cursor/skills/bundle-sync/SKILL.md","84e22bd6bdd331184c9c4e69f6702fc321937b640e8b7e0502f167bf8a4ec611"
      ".cursor/skills/changelog/SKILL.md","521942ea8e70e925d6605de021bfbc894979430b798ab03c29c4b690108c1a32"
      ".cursor/skills/checkpoint/SKILL.md","6dfd0aae2385b6ad32e82327318e56c75008385841eb2356fa843be3738c39ad"
      ".cursor/skills/cooldown/SKILL.md",cfff5c90e9d90b4e5a26819c90a09e8763f3d88f5ea56f117d472105db2a4906
      ".cursor/skills/critique/SKILL.md","8b236983598ac5f71387bb847baa369ba5e8ab17a6cd2f67ebf7ac33c86341c9"
      ".cursor/skills/dependency-security/SKILL.md","02a6b95ad3f32f2794312f292bdb45f7afda53980167717344915c2112f13436"
      ".cursor/skills/eval-harness/SKILL.md",d0b39faf3168f74de06e85d6a7047dc2e297d1bae728fe23627b54b6cf1eedca
      ".cursor/skills/fix/SKILL.md","25a7a4016e8b78a3f7d681759110258adae018ea6f347196242462eb11530033"
      ".cursor/skills/impact/SKILL.md",bb717630ba8ae5405b3679e17560d6767ab819df8546f8c717fcbcdc2b9e715c
      ".cursor/skills/knowledge-health/SKILL.md","316cf25633a0487ba9326420ebb9b0ac509f4bef67bff6c77a3cf38c4ca3a26a"
      ".cursor/skills/pitch-compress/SKILL.md",ea0ed82369db405bc787818eb303eeb6e74fed9ace4020baee74481eed0e4343
      ".cursor/skills/plan/SKILL.md","0df576503246063397d86755d16b01c57a8b0ccbd4bf47920892ca8413b06070"
      ".cursor/skills/resume/SKILL.md",cf880065b8deb14115915d0901d913c9715b0e602131d4a1562d836e32e5d771
      ".cursor/skills/search/SKILL.md","23143001d0c245a6d55b62785ca821f069e2ac19a312e509568e4317f5922902"
      ".cursor/skills/setup-validator/SKILL.md","8ece5995655d6576644cd586d8d4838f94a033c4d23cc70c3bc34ade1add7e13"
      ".cursor/skills/setup/SKILL.md",adc701890439fdf8d0b0817c3282dec963fae7e8aaf65581093de5f9e6c36fc4
      ".cursor/skills/shape-lite/SKILL.md","3a3cf74cd8ea694b11af10c94a4cb621b4465e22d454be5ea0635900ded44901"
      ".cursor/skills/shape/SKILL.md",a2aa0fdb7f2eb3f929b771e9739dbc6380a54d4bff957e5aa964326b8a9aa11e
      ".cursor/skills/ship/SKILL.md",aea1057d0dcd303da4d4fb98492726ce65b605f3462ad569cc52ac517b141f69
      ".cursor/skills/state/SKILL.md","531c1c02b8e4712455eb1041e99dcd488a1f588d3673b0aee671cc80555deab1"
      ".cursor/skills/switch/SKILL.md",f188b1e0a68430c9be5201b223c927367dd5ed930a0cb24662ad4f297215d74e
      ".cursor/skills/sync/SKILL.md","1b1436c0edd3df80e54825f7cbd05f2fd1649beb23c9000d84152e089db3f206"
      ".cursor/skills/test-strategy/SKILL.md","077ddf11f6b9851d715a528b51062c3cb4bf3f9b834a5fd5bee0fbf180138ab1"
      ".cursor/skills/ui-design/SKILL.md",b49b04f982e1869c2e6dc0e0c9dd361cc99633a5769905dc3e92bdad3b4d94fe
      ".cursor/skills/workflow-doctor/SKILL.md",c80f03e8a893eb37e51ca8b16961ac4cf2cc5e3bbf33a207f758790d40c48116
      ".gitignore","6b3798fef1a85f421f9564c35574dadfe7a6dde8e98c5d585566081e64c99bc0"
      ".graphifyignore",ac41f08adb3b692d4c61d68cd51e1e878b3d33fb6dadf19e36a8e1f644a57771
      ".opencode/agents/appetite-auditor.md","6067c968c076d1557bf53e539aa56cad16d9eba9b3dc91d6b8b95c6bc90a73b9"
      ".opencode/agents/architect.md",a7a75598b94225f54361631692f8e3be28797fe8731bdd9dd8009afc494a7656
      ".opencode/agents/build-error-resolver.md","3c4bf7b9b2b2b4cde6aca86250ed2555a08e59ca2ec13b901baf219f4af1dea9"
      ".opencode/agents/code-reviewer.md","4b6b95d64769f432c9291f4523fc4522fcb5cc2d08374a74765b806d693f53ba"
      ".opencode/agents/cross-pitch-conflict-checker.md",f3523bd36501b3608538950dd48a66a644aefe2202eefd5f82ad8d7b5cfdbbf2
      ".opencode/agents/cross-pitch-projector.md","05d3000704c89550343a1122d122413c5fd05dbf45d59c4ae7008a27840aef2b"
      ".opencode/agents/eval-regression-projector.md","6a05af0ff60fc3abcd6e1c230a939e18545b729e5a3bd5bfb8254d9f806728f4"
      ".opencode/agents/eval-runner.md",edf8c488ab98d58beeab95232f0a8c1e2c44f93ab09cf07d25b467fae2e887bb
      ".opencode/agents/i18n-checker.md","76c389a7d9169320935a24ca220ea89bb322ff79ff8f028b3cf5014cf0ebb22b"
      ".opencode/agents/knowledge-historian.md","78decb1d8fffe8db93a067a889253d25089009cc2e94753dd23c2ebeb81ca6ca"
      ".opencode/agents/planner.md","4593b7f3308081e1acfcb26b8c5dc92377e0440e2c0e1bba428ff597c2fdffdd"
      ".opencode/agents/refactor-cleaner.md","0187f37319a323c67ebc5268429cbb414f4250f9bf48765940c2987e1e3d546d"
      ".opencode/agents/security-reviewer.md",df8da747d2e84db26c5d2d68740c696c5c151c62e220f864ed8faab7606fec8f
      ".opencode/agents/skeptic.md",bd8114fc3a698beabfaabbca4101d8ac857841b6545d3de286fb56113d21c44e
      ".opencode/agents/test-coverage-checker.md",c638436a5fc9613c1e2264af2d79340c060d45318100eda91c4fc7d052b505e1
      ".opencode/agents/ux-reviewer.md",e1746aebefb0fdaf9e018dab630c3b02fab47abf9f98991e786080588b361c99
      ".opencode/commands/add-skill.md",a24a853b7cfd2648bc3c6c7e5faceb503367a41125546706dc2e5c1a58eaefa0
      ".opencode/commands/audit.md","3e1d85c40b6ea6c9affc8abdc69b5a881824144d30f76899f62aabbafd6c9632"
      ".opencode/commands/build.md","161f807562f1303fd47e46a9fd1e78d477cb0195e53d750fbb6c729b2fc7b9ed"
      ".opencode/commands/bundle-sync.md","4027c20d5bc08abc8d266eb680535984cebb21e49b365cefd4416ee869687c3f"
      ".opencode/commands/changelog.md","28e390fc6fe6abcc2ea11b9118925b96dfd04d55d266499d1b2db84c6808bf83"
      ".opencode/commands/checkpoint.md","35cbbe83dfb2d5a2b1dda2a755f96362bb0e5e92fba60cc19af464d7b967f51e"
      ".opencode/commands/cooldown.md",e03ff5f42597a08f31d57c2f7394404b6e90b91ea0d6f73d649af3c8b45e3e97
      ".opencode/commands/critique.md",b49ad5e6d69541594a3368923f0031ffe9a148862ee34cc75ea18da013d36cc4
      ".opencode/commands/dependency-security.md","6222354d4bc3a9d52b0e0f4e036c6c2e7712ec609b2b6bed19a3fa9fb358c7ff"
      ".opencode/commands/eval-harness.md",f5af146facb0ffb883a2747abcd315e59c13280e81a7e7c2cf5680f9a01211fc
      ".opencode/commands/fix.md",d878f6ca6b857e220cab43eeb2aa518c28cca99a099c1fe9aa4598b32e6a6d76
      ".opencode/commands/impact.md",f068a208d34bc0ffed2926c61eb1a0c2f4e39d524898ff34c2a46535405991da
      ".opencode/commands/knowledge-health.md","47bf002b60af30a0792015c940b7fd469a5d182f6919788174762072ce009c15"
      ".opencode/commands/pitch-compress.md","840e1c204edf6d9b480f627742a7cf28bbe3eb587239dee529396f943d36bfaa"
      ".opencode/commands/plan.md",f5663a94fe039dc833ea7ccf34cf219e18e5b3bd30cd5bf7735e132c31f789f2
      ".opencode/commands/resume.md","23cd3ebf64dcbbc4c5d85b7bbd7cf1168e33c41a7506e17d13d3e923ef33efaa"
      ".opencode/commands/search.md","8c5d195c865f7f5f3e7b85f94134e8fb3d693ad136cd43c3e98804495a430957"
      ".opencode/commands/setup-validator.md",f91b775bfdc4a5ce9c0e9ed72f112aae4d419d2de07b04aeff2fe0cf02ef91ec
      ".opencode/commands/setup.md","1f0112b7797923d620a08020802fa6e702b79a34051a393abcfd674de2d56b72"
      ".opencode/commands/shape-lite.md",a62d2cce2677a5d29cc0bdefc1034dab7d560e9e33b73d9a9464cb1c71787b0e
      ".opencode/commands/shape.md",a9c091ed89541016e40502a8458e83da5d8dfce072a6e04d8c787afbf301069b
      ".opencode/commands/ship.md","0c854ecb8a070072dd97d30e90cbc5fee3c90ae756dc11467ba4f1a108ac69a8"
      ".opencode/commands/state.md","6d860a5ee9bcc56943462b62e37e858cc09430fabf89f2324c98578a2794a419"
      ".opencode/commands/switch.md","6d8565bf8f0b85fbc241cb3de0e389abec959bffb796e84e58678496f26e979d"
      ".opencode/commands/sync.md","814817fd48af767c8b75b0a89e17970048d4fd02d59f1ad71a326758fc505886"
      ".opencode/commands/test-strategy.md",da062c2b25400b88e5d218e9b500b2a9c6a3502a3c02091a10420536597c7bdd
      ".opencode/commands/ui-design.md","9f903532327b2af84c6e45f66ad4df50bca414c16d6c2ba6fef18161cda73e6a"
      ".opencode/commands/workflow-doctor.md",b511e97fa072cb1619d8e2b0c5c100172d1b59d5bd8cbf67c63be21d8c505fa5
      AGENTS.md,feb32484e13a3e18f30d3add7b4a99b676fcf8943ef3a6eaf6c1cf0b7f8fe99d
      CHANGELOG.md,da26e3d2b1714bbfa20f3778f21bafae3575aa7bf5dcfd453bff8343cff8047c
      CLAUDE.md,feb32484e13a3e18f30d3add7b4a99b676fcf8943ef3a6eaf6c1cf0b7f8fe99d
      README.md,"8b7cf7992df6b7c5401c418f8b87a8efdd0aa0399c046b12c34b7e27c3b9804b"
      SETUP.md,c1e234187bd02dc51bf42662ba6a41d6ae57595d5529301d3ecae36c57f8817f
      VERSION,"9bd51d4120f0ac96a8e2e9f9a3e68e8175db7659324704ba2306aa682dffec33"
      ai-framework/docs/design-notes.md,f4141e7d74b56f20e8e2deec14eb19baf5dbe233b925183025b9ebb5c848f54b
      ai-framework/docs/extending.md,"935499627ae1c09fe618f9c8736e66b3df6aebed4ce14206448e283949c7588c"
      ai-framework/docs/knowledge-graph.md,"6a98e9fbf1fe90fdfd712504403ac3faf2e7e29bf7ecbbfb80fb18f74b83ce1e"
      ai-framework/docs/pipeline.md,da7eb210d0263bf82b2a3f4de8046a5fe396623a7006aefc748dc09b2067942b
      ai-framework/docs/setup-validator.md,a616b2971976374fb0987ac53d0ec5cb641a39260b194db2b0a2125f1501302a
      ai-framework/docs/setup.md,"9792b1079b82f19e46ae3338cb01b2eb55823394cffc69ceda5aaa157f1c11ec"
      ai-framework/docs/testing.md,"2c6d49b64898f9b30250f07fa55ab7de29c4b5702733280595e304a0e209ef95"
      ai-framework/docs/token-consumption.md,c3c0b442989f000c323e851044f10c26b5c9bf065546d7734eff4bd0249132cc
      ai-framework/docs/vendors.md,"144911290b522d3ac1356d6d7f3de538a7fd0ed2b4fdac8b6cf609827b5d458e"
      ai-framework/docs/versioning-and-sync.md,"6993335e25990ee864d5050b8dad9e15544813c6ae4cb1ef3eff89f3e9f53e5d"
      ai-framework/docs/what-you-get.md,"7cb906b4029ce8d6b8231c60f88ec3d6ac22cd61db77728939b1262a730c0c7b"
      ai-framework/docs/workflow-doctor.md,"2a435ab9db182c9e251775e4961210db2b93e4bf2ecf50d7b183bacb79cf0b2d"
      ai-framework/hooks/hooks.json,a043f76bffe935b69ffcde83f8ee411ac0c8db390bf1e0b5ca0a515481aeb738
      ai-framework/hooks/scripts/metrics-lock.mts,"3735953435a9335c986077b676249ce84eb4c700c47842490a17738fbdc302aa"
      ai-framework/hooks/scripts/metrics-lock.test.mts,"64e98bcad00c630660891a4c337ae6f93871266ad2bd380ff7fc97cd0c7c0ce7"
      ai-framework/hooks/scripts/opencode-plugin.test.mts,f8c3cc0155dd27a1d15edc3a8eac8673625d4e974407dd9a670d64a7f6329323
      ai-framework/hooks/scripts/orca-start-codex-hook.mts,"04d1db5cbabd8a2d92c74ace3c4ed18aecbd86aa5e0d82c1ec5983d878bec9a5"
      ai-framework/hooks/scripts/orca-start-codex-hook.test.mts,"23b7dd3444ab20ece59faaa0e6ef9aaa8324c8c6afe46be288d241036a2feb06"
      ai-framework/hooks/scripts/orca-start-hook.mts,"37908c66cd1044e2e1b9b84c88819d495d1c8c2d7c1de18e8485700e0922babc"
      ai-framework/hooks/scripts/orca-start-hook.test.mts,"5f08b7a54a819b2aba16a6443110020d50e2c73c54eaa7a32738bc3dadb2c83e"
      ai-framework/hooks/scripts/pre-ship-verify.mts,bb32bd2d5885a9589c0e2ae2247dfc4db7d7ec5a891e4548e752aabd9e877e95
      ai-framework/hooks/scripts/pre-ship-verify.test.mts,d2fb5a3c8fc8ffc4beabe8ef6f7a8b1335f6fe6dc0f6ce35cba98a8e4d7c3ca9
      ai-framework/hooks/scripts/stuck-uphill-detector.mts,e3eea81bca629bd8ed4a4c6fdafd1c132b6e210814c64ca1a8b4dc7afd0807bb
      ai-framework/hooks/scripts/stuck-uphill-detector.test.mts,"555391b2434a5c7b990b50c9f0f44706f538fd65403c8c0421b2dc6f266dba70"
      ai-framework/hooks/scripts/token-consumption.mts,"59019aab893efd99e20ef3a909096811f5cd05c73d1a7444db32e6e9070b260c"
      ai-framework/hooks/scripts/token-consumption.test.mts,"9f2af606afd074ef84d734f79c116f6dc63cb2256d4fbde616e7d15b315e3fe5"
      ai-framework/hooks/scripts/token-report.mts,"16132e33e16b1758b46a82e5cb7f4f8b78f972d29d8491dcbc0fe3e14761780a"
      ai-framework/hooks/scripts/token-report.test.mts,"25261c9a3edb5c9ea11a6f50e548cea6987101c05b7dd405915e888ef78b40a8"
      ai-framework/hooks/scripts/transcript-usage.mts,eb61d064e51ec7dbffb15df93fa4c821b6abc9cdf5b3ce1e49000d8e14c75c6a
      ai-framework/hooks/scripts/transcript-usage.test.mts,d4f44ff24e69030a64474238d7a628a8d3554b320614e7d827426edfb164d612
      ai-framework/hooks/scripts/workflow-capture.mts,a405d52d6789dfabbe86ed697c459c96c24c8b862b75870fc106f3b8725cbf58
      ai-framework/hooks/scripts/workflow-capture.test.mts,"220a5ba991285e67165c0f26b73260aaea3c5a64065badb3df21d3ef657e0b78"
      ai-framework/hooks/scripts/workflow-notice.mts,"78922fb86d1dd5370c70186eb50f6e520808496d7324de0e2a8c3529e8b631b3"
      ai-framework/hooks/scripts/workflow-notice.test.mts,"71df25da12987497f1bfd071ce6ded207a08f1678927bc7d24b360266fcca6d4"
      ai-framework/integrations/harnesses.md,"0ef7fe3f102503aca042746a339479b83724bcdf36f72dbf86ecaa8fe843b827"
      ai-framework/integrations/orca-vendors.example.json,"9b02de69ebc7d86ca64b3a91b03722c22b4b51c83df30d88b58a31e077c0f24e"
      ai-framework/integrations/orca-vendors.md,"80cd5074f41697a305a921d3495fa9783929980a6503c61a47faac1df4308658"
      ai-framework/integrations/skill-defaults.json,"68df8f9dbe489506898f1c7468ade4264b7185c782ae4a67220702db1e251c31"
      ai-framework/integrations/skill-defaults.md,aed215e20cfdf1fa4ef52074fda880603e491694f2ba47028c0bf2423afaebd4
      ai-framework/integrations/skill-vendors.json,"984d7f2969bd6e7556604df438ab867002efd10341a01b6f0bc3eae4d8b436c1"
      ai-framework/integrations/skills.md,b23b038ec29166d37045703ecf1f99e512cd9ac44ea3efe29ff6768dba9f2403
      ai-framework/integrations/state-report.md,"2f7049c70c92d2209186632d3b9bc79e126f6bcffa75c43b99b75edac8df8dcf"
      ai-framework/integrations/workflow-metrics.md,dcb13ff9d2c8438df62dc7bf677f9fabbaf5d5f3caca2ad804241fbefe23bc0a
      ai-framework/rules/boundaries.md,"61a96a6c5f0080cc76bd9ed36334c5b7a78d4d9fa26ebfe99ce746a468d4256d"
      ai-framework/rules/canonical-mirror-sync.md,f7b6f1aea6da8ac7b632c17c9a8ff8d9f1a0c52e2cb23dbd34698007ad0e4d36
      ai-framework/rules/ci-deployment.md,"057352139e4a49be9f14ab4a768a5506a7efd9b0b898b49a32a214bb306d51e6"
      ai-framework/rules/coding-standards.md,"8cf88955b0a5875c55cfd289a34d1f3e095ac82091ed43c5ac9bdaeaf73fc87c"
      ai-framework/rules/component-architecture.md,"29f3a8bcd7448f9baf7187c117627c9a00401d79dd346b6c7a9ed58e6592b6e1"
      ai-framework/rules/context-management.md,dc17def4e97dbcb6ddc830b0ffab9e4e34e47337a743d3b2f25a924b69ec2355
      ai-framework/rules/data-modeling.md,"770be714ae5704510f8eb281d490775b9360d6fb0eeee1ba827a9f35199f6faf"
      ai-framework/rules/eval-harness.md,c4d2d61523679b9916c98eac78503a7875c6e16f2fbdf0acdbb15ed3060c07c1
      ai-framework/rules/i18n.md,"0b01cfaa7a5ad3a55fcd5584768834c7b65d639bfb3ad3e542436df34ccbb3ab"
      ai-framework/rules/machine-data-format.md,"4d1812f421e26771ae07e526dd0cd15f60315d8a1e7a7a3cf6348560b21a1d3e"
      ai-framework/rules/model-routing.md,"808a11a5bb154f60185c7aa89be669f6cc36e2ac58e6a2f74c1bce9a53747eda"
      ai-framework/rules/observability.md,"1a9dc8f8b13441fc0fd90d0da0d3ebaa1a4bde7e2c216db3a119b5a321e57fc7"
      ai-framework/rules/performance.md,"96a68ddf97587c6e30246a0168c2fba4e7253eec5981b742ec89af9a4e17252c"
      ai-framework/rules/security.md,a4ca5b64c845bceee7c022cfa71af90d30524183e84bab40fee0b6adf1bf98c4
      ai-framework/rules/testing.md,fdc77ea6b96206e672fc82d1417597a9a20e1f49a869a87decff997cea8023e4
      ai-framework/rules/tool-use.md,"502c479b4fde12525f8e612c6580e133efb1000829f77116a68811415826268c"
      ai-framework/rules/ui-ux-review.md,f44625f2cb8a7f615e22de2902d572d46056ae31894c19cf83b66e259d98a1cc
      ai-framework/scripts/add-skill.mts,"139e28020ea1e8364a5b1a477ebd04a3c23131752abb622a2a63ee7ae0b5c2a1"
      ai-framework/scripts/add-skill.test.mts,"457362b3cddaac608c53e900b8f58de0f64e74baf2341a1c467ada4a03b30a05"
      ai-framework/scripts/agent-frontmatter-invariant.test.mts,"6cd46140d41c9a829d0b257e289d13097db9e4c70c6e3b37a90857772859d62c"
      ai-framework/scripts/browser-runtime.mts,"1d41e97b1f475de584753f75373da01ed5311ae34e7d8aaad84f7fc048b30b1b"
      ai-framework/scripts/browser-runtime.test.mts,f887f452e1f734435b74d1cccd4e97d1161d5efbe962d8e255639214e3c04f9e
      ai-framework/scripts/bundle-sync.mts,"4e85d956e280ae4c699903e2373b67b55200f2f4c29ea1379a0bd9a8978ff8b5"
      ai-framework/scripts/bundle-sync.test.mts,"082b41ffee498dec13f5d70a5cd6dcbcd5dc60ba6593d205bc012713c213034f"
      ai-framework/scripts/changelog.mts,b6dcc744ccd1da5e621fb3298d9fc2d2b67fdf64ccbe45fc472724922207880b
      ai-framework/scripts/changelog.test.mts,"9f9d8de5c8bd881814a59fb817a6e3d92bcedec62519ab48a3dc8474fbc863ed"
      ai-framework/scripts/config-migrate.mts,"522e406ba032d4de9914926abf0eb271d6b6d16b32dd5801791230ffc90d8e34"
      ai-framework/scripts/config-migrate.test.mts,"09c90a02536f7e47ca8b73d82252dfa84ff1b11240f668738c29dfdd5c07f130"
      ai-framework/scripts/docs-links.mts,"69d9231c293ea15ba740d6584f8437d2b100029050c41290a9324030046e3ebe"
      ai-framework/scripts/docs-links.test.mts,"937774f162075024a1f2bfa68bd358836cf857a9f368cb449da78d5da95b6736"
      ai-framework/scripts/entry-import.mts,"452a6e05b8d92e1f8b190d99160e434b86f73a228bbc3bdc4f52359c8bfe42d4"
      ai-framework/scripts/entry-import.test.mts,ffd52ffd00f1459122060619309860eb6303dada847ca74f15b956ab108005dc
      ai-framework/scripts/flow-join.mts,e260428733adcbb214c2753725b96db55d592826e4de3a1245b28487bdb69149
      ai-framework/scripts/flow-join.test.mts,eb3f5f8281342cebd51779c44aaef8a728dabdc29864b2161f0fcbce6d4ae628
      ai-framework/scripts/flow-render.mts,"8781e59b3fe094be1f71c6f227d8440df70dcf7415ee13f0435e9e719735f482"
      ai-framework/scripts/flow-render.test.mts,"43264ce93320730f34547f1c0a9d971622248e5b8cb11c0d68fd3c239175a967"
      ai-framework/scripts/flow-report.mts,"452f07f06a6d57b268b53afbf80ef7ac5f4d94219998f2ace8e691d370376bb1"
      ai-framework/scripts/flow-report.test.mts,"908fb93e9f9b46d7a04f6afd952368db777beaeeb32713bfdf7d4d5493bdf0fb"
      ai-framework/scripts/graphify.mts,b15b994c411783aec7e8dca621088c9f9bef175688438eeed6ae4fe301801cb5
      ai-framework/scripts/graphify.test.mts,"1a4e95b3e13555004842b9af5c43173d356e2036a31e3530a40a0d851f1bda36"
      ai-framework/scripts/instruction-loading.test.mts,f430f3f61e72e42be161a10f8331965a6ee462a44f086f63cea25e0b8aa9039a
      ai-framework/scripts/opencode-service.mts,"6f20412410482657070a033d5e9309b7dfa6d9904245c25d9253ff25be39c003"
      ai-framework/scripts/opencode-service.test.mts,f74ae7c9c1d95ab13c00f087a7667082aa5f314aff5baffc311a3dbd036ec38e
      ai-framework/scripts/orca-apply.mts,"3031386c17d1941e899ba565a5ebab6cc8e1cfb9ff280bbca6cbebe3e766af26"
      ai-framework/scripts/orca-apply.test.mts,c677d2be9887b8d325f2a1b05035cec07d0b146c236fd8c724b4a7d4b6c73834
      ai-framework/scripts/orca-assign.mts,c90ff858e73f04328917eda589f904a0eb1d96643042eb8a1c87499eec90d052
      ai-framework/scripts/orca-assign.test.mts,"139c68c878e6ea6dc5a97d7b269b09491474e32b97bbd48f124efce11669b3ff"
      ai-framework/scripts/orca-diff-admit.mts,"1cda46e26b9a70a74753207b341a640b0cae42704002395f46fb4773277739b0"
      ai-framework/scripts/orca-diff-admit.test.mts,"3c337c6545bf846337d38635d810e220ace7fd2809dd718906e167c2b842a1ae"
      ai-framework/scripts/orca-dispatch.mts,"6ba5efb1e870eadfbf279f58353007188d72ae839afd4ec1f01076d5bfbcabe9"
      ai-framework/scripts/orca-dispatch.test.mts,"2948ecc2666aaeb54f139b074696ed68087f57fe5ea1649f03fe3a9b79b6ad19"
      ai-framework/scripts/orca-eval-grader.mts,aa4793bed42f7fb6d72580a83b18e8d10660ac239908f4e8c5eaa6135045be11
      ai-framework/scripts/orca-eval-grader.test.mts,c761186bc2e975446314af94fc10a62a0d4c793223aa00b9e3ac7e22b358c1c0
      ai-framework/scripts/orca-evidence.mts,"490ba3b395e1990dd2a52ce5b7d5732d734e59f65f154cb6b11308289952bb43"
      ai-framework/scripts/orca-evidence.test.mts,a39f7617c926eb5ff76bff449a901efb484a391eeeb476b645ba649309ac3035
      ai-framework/scripts/orca-launch-gate.mts,"6a1af51f400040781fc0ded7c9395b35c8bdfa94af537af46acc312092927e92"
      ai-framework/scripts/orca-launch-gate.test.mts,d4d1e01fdb9f4e4b0f191966e3d0907b3ef1a28f249c3a4882e09222187eb0d7
      ai-framework/scripts/orca-ledger.mts,fc0b481f7cf7608bd33bea386cef60fb70b24a526ec3f914a2529572dba3e333
      ai-framework/scripts/orca-ledger.test.mts,"2e287dc27fc617085cb3d0867396fd6ca0d98c056e0a24d6167b73ddb2b9029f"
      ai-framework/scripts/orca-policy.mts,"60cd83f4c6b47e10eebe48b9a4b156e4a535c249652f3d2dc3258d8ecea1a569"
      ai-framework/scripts/orca-policy.test.mts,efecdef629d7e758cea86b2256c2ca10450e8b3feec704c5462928b5ae002f44
      ai-framework/scripts/orca-preflight.mts,"225837b18440d8ce273ee4c4edda1fbc0a8121523a74649cd51318cc9df2c948"
      ai-framework/scripts/orca-preflight.test.mts,"64d7548c38a5722b1386bf92533b8223944198b91025ca31c72783a22874d794"
      ai-framework/scripts/orca-reconcile.mts,"27e707fbf19796e650cc2cb1a84d4eb1c9ea114972f11e8dd7e245b209dcde5c"
      ai-framework/scripts/orca-reconcile.test.mts,"6007c462299b3ecbb30c05887a4fd3a3cfcbc595de145e88808b2354bc1ec9c6"
      ai-framework/scripts/orca-run.mts,"5c0e0b1fe0f530d23c037133a8ada8a4623ee87e337e587c1443fe7354ec6b74"
      ai-framework/scripts/orca-run.test.mts,"6c1da356ebacebb46a888d7c0893a00eadbf1c54d65435822e62364f5e0dd75f"
      ai-framework/scripts/orca-start.mts,"2dab69fed6ab26485bfded1face68a073cbe7fba7f1eb15e9c836188e7575ac3"
      ai-framework/scripts/orca-start.test.mts,"4e9be424f41695abde281336fbc8a9409fe8be8e8cbb0b50eaae2525062d9496"
      ai-framework/scripts/pitch-archive.mts,ff8bcc2ab1e404be5647bba6c4b0170cdc692615680b8cbd0832854252be02b5
      ai-framework/scripts/pitch-archive.test.mts,"5daa7edc577b9cc06e575850254d1922b19f5e25cd499d55153e249189b03eca"
      ai-framework/scripts/pitch-compress.mts,b65221150ec1bb998c393065d7f9f24c74e79f86752b7d6e9d5a337d347835fe
      ai-framework/scripts/pitch-compress.test.mts,"9b951cd36bbb9820aadaf251458aa4cc984e8d1331295cfa0efaf7f2273311dd"
      ai-framework/scripts/review-bench.mts,"02a4a38ff2811ae851b2d3f3248f1b1e2a197516f99ec259d491ea8441b9fead"
      ai-framework/scripts/review-bench.test.mts,"0cbf0dd552002ebd9cb651beafee114e146b06e22365138d8de0736b02ed04a3"
      ai-framework/scripts/run-tests.mts,"6b6202eef04a7337cf30b43e3b651635b7c2e3dc41335cd2f0010b5a6e4799a7"
      ai-framework/scripts/run-tests.test.mts,"1b585a4f2d2d8ad77f812c4293c9e39c20924af84752153428a0dc9cf9c8362c"
      ai-framework/scripts/runtime/README.md,"4beec211f68764c4a2b219aad3e50fa1a0bfe0e4bd3a31434da9d323d922de20"
      ai-framework/scripts/runtime/bun.mts,"489795f0d02a8d4091e13602a21ede6d0171760e1acdabaa4635f9cd84a2d5ec"
      ai-framework/scripts/runtime/cli.mts,e11c515cba0a95bdccf04572f32b3c952380ce711bd86ab36fc043ead18ae78d
      ai-framework/scripts/runtime/config.mts,"0f305a481661cac02b794f88be45f804956de857d7eebcdd7f4a7896a6962980"
      ai-framework/scripts/runtime/config.test.mts,"9201ce7e1817efb1f9fcc6de062d4f170202b1a8f4465b4d3723960881aac5b4"
      ai-framework/scripts/runtime/data-file.mts,"929d6240eb82a5efabbf3009d9f3fd0c5bb0612a928379b952aa9c82d17e1a75"
      ai-framework/scripts/runtime/data-file.test.mts,b431039c1793ceb7d99844ac6005bbc6802348d7a19eefd6a5ed7a56f5ffcf78
      ai-framework/scripts/runtime/entry.mts,"62edee638b130c9eaeb2126c30467928509e3eb73c1879403238ab1b8e25698e"
      ai-framework/scripts/runtime/entry.test.mts,"369aa62e6f5f20c141b05b75f4ca757a0d890252db942ffb8c5e2fb8678cccd0"
      ai-framework/scripts/runtime/env.mts,"6c6a09653c454bddb7a4b5c3769633eb087cb18b9bd904f0065f7ba03ba82c6e"
      ai-framework/scripts/runtime/invariants.test.mts,"232159017258e7e183d824725dfc68fdef8c31e92e01b9b4d0b79059e2db8bcd"
      ai-framework/scripts/runtime/migrate.mts,"617f10fdcd383f80330305b5057a90840ad8b4c42a4e18ab2c7f9044b0ec8c3e"
      ai-framework/scripts/runtime/migrate.test.mts,"9d8e84638c35ea3ad7fb8f4b8495c45000dc02c74965166c09c9c9d250a8f599"
      ai-framework/scripts/runtime/node.mts,"45c1551bbcbc52e63d54eaae9973bc28dd25628bd63797fd5757909102a4a2e8"
      ai-framework/scripts/runtime/oex-lock.mts,c324476014d7feb59452c50b17ec583450d140ae224cdc4cb6191d64a15f17dc
      ai-framework/scripts/runtime/runtime.test.mts,"1a6216d224eb259bc93b316453a7805a47fc1f412f7cba30fc9cdddecc8273c5"
      ai-framework/scripts/runtime/select.mts,c68e5af73849bc642305cc341392bba7dc4166f270f43f1a083f15dc3856f630
      ai-framework/scripts/runtime/semver-range.fixtures.json,"4c127de6e98037f31ccbc74461bfe97ed07dc471af893d7f16dc97cb220e30be"
      ai-framework/scripts/runtime/semver-range.mts,d06baa220e9a3a4646c9e97aadf39d4ac8e57cfe566614f3c54ab7af1fb8e80c
      ai-framework/scripts/runtime/semver-range.test.mts,eb164fc979e9a434e682ddd283db3696f02df677d8a4af139f23da4807a9e7c6
      ai-framework/scripts/runtime/test-helpers.mts,b87441e3dc5d1c223ac7db566afbe5ec367248b4a4f8285485c9bcdc5d85994e
      ai-framework/scripts/runtime/test-helpers.test.mts,a320f8e7c4ccdcc72f92527d93bcacee0fc2a2144d46dac43ff7400df22249c7
      ai-framework/scripts/runtime/toon-data.mts,"3c2c402934a07b7da5056d776d6fa39091182102479fed9a349bb27e1191012f"
      ai-framework/scripts/runtime/toon-data.test.mts,fbec4a02e85e04c7d6c2313e0d9aa4de133c306bc222ddba49f99c425dfbd60f
      ai-framework/scripts/runtime/types.mts,"29992cf482d689126b23633194750fa28a3bfaa6143d9f12045a5a78a7e6a0b2"
      ai-framework/scripts/runtime/upgrade.test.mts,"77153c81dae500255f9ad0adb922dbaec46de46953347d55d0d97ef69b34c66b"
      ai-framework/scripts/runtime/validate.mts,"65576f08658f62fee0d4742006e95db894bf248a4654418782b9a2be25afeb7b"
      ai-framework/scripts/runtime/validate.test.mts,"3576a389182adc50dc05794f6e78e6e6e095e48714f225b53c0090fad2cdd1cc"
      ai-framework/scripts/setup-validator.mts,"132ff8995b1403b7ec479532df71b39aa69b4a1a337a1102c3c0e41b3ffce321"
      ai-framework/scripts/setup-validator.test.mts,"66476d0a0301f33325623909ad510938b6bec2a7fdd82cb16e60d3fe35cacc2f"
      ai-framework/scripts/skill-compress-guard.mts,"60a9c252d6955a33206db67477995a17dec245c4101d7eed2ad9eb736bc6e46f"
      ai-framework/scripts/skill-compress-guard.test.mts,dce94212236ac8bdb5642a648561be36b4b7af2b72789195e546555e5f363466
      ai-framework/scripts/skill-defaults.mts,b0d1faaa4d8edf3a983ac1fc054ae39994a3687e94c1bfa11bc3e582811d1955
      ai-framework/scripts/skill-defaults.test.mts,a712181bb389e4540f3068fe4ef25a2bfd00c397ae4539798269f71aeab8115b
      ai-framework/scripts/skill-registry.mts,c88bc17b9a056febaa298a62f5aa1ac83b6af24e060acf49475b287e2342dcda
      ai-framework/scripts/skill-registry.test.mts,df1bfbade1cb60fdad59f7c7a84c8cc35982b0402ee1935e937ba8ee6af6135b
      ai-framework/scripts/skill-source.mts,bf71133a6af736463f3633a62a4e7450a99115902dab7db1dfcf3b6a778610b3
      ai-framework/scripts/skill-source.test.mts,daba16d72dbe246df0e8605e50e2c81367b3afa8aa3969922c88a866be937259
      ai-framework/scripts/skill-sync.mts,"7dad4f0c56fd583377aeb71cfaad3823f1e738532679edfc2b0d2b642375d4ca"
      ai-framework/scripts/skill-sync.test.mts,d3622471616a428c5ef5419ba0dc953db1a36036c286e556774a384345a561a9
      ai-framework/scripts/skill-vendors.mts,"013a987c9ae527176ff5248ab3c458c34c8026dae0dacbf2e54f3ecba7c460c5"
      ai-framework/scripts/skill-vendors.test.mts,ebdcc633fcc6bf0a2cde01eb1ea259bcf86339e97d132916dde5f8b80b19434f
      ai-framework/scripts/state-charts.mts,dfd6516c509c89a66289cffef0803648f5891ad222594bac1403d3cf9f07ee0f
      ai-framework/scripts/state-charts.test.mts,"22bd405f1d994cb6d40d6ceefe3acc669190c2a16a9c8685c73ee1f5c5a217f9"
      ai-framework/scripts/state-design.mts,d992a544bc7c2daad1fb17e13be8dce2e22011fba1d2893273a396234e3eedd0
      ai-framework/scripts/state-fragment-dataset.test.mts,"59c5e3e24f7b32508e6be3835e4dd3274f315e1804c09d34de85cdcad92ab1f8"
      ai-framework/scripts/state-fragment-evidence.mts,"50380b5e5a7a7e82f7a179f464f437774b2fc8df3f71935ee5a9de8792416eac"
      ai-framework/scripts/state-fragment-evidence.test.mts,"25e49ec95e07d372d759195208733caee1e29b3fc7afb31226c0a96b876cc3f9"
      ai-framework/scripts/state-fragment-inject.mts,"71269a3070c2d64b31ad6be90bc598068a634a4321f78a4aefe6e4b980ce861f"
      ai-framework/scripts/state-fragment-inject.test.mts,"0908d064fb22fc1478dea909a387c0c7f841c27db38b59680e4364aa2a4c0fff"
      ai-framework/scripts/state-fragment-parse.mts,"8df6055a80ecb0a4cdf4da254676ace9a3fe86d805ccf7a19f31eec956193d0b"
      ai-framework/scripts/state-fragment-parse.test.mts,"5147ef205f61142ea656a03db86f062e3c4a00a35735b68db7bc58d603cf53f0"
      ai-framework/scripts/state-fragment.mts,"78ecbed5fada3d219f4ab43f6daa1798dce6fe05e846e5fab3a1426c32b201a5"
      ai-framework/scripts/state-fragment.test.mts,"6f51958f27645d141d2fbd1d8f16fe5b42438533b57bad98b547fa8a8c04bc6f"
      ai-framework/scripts/state-graph.mts,cde9c5f7df0e3ce159e20a11565ec681945415955397ec2c8747fed9455c2d7b
      ai-framework/scripts/state-graph.test.mts,d3903429ebdaafea675bc68a5dc048cf05b5a1aa71b23bcadbd2769af498fd73
      ai-framework/scripts/state-history.mts,"64241c5e5fd03c29d6675f6c0ab3193d846612af3af997e673e93cf0a77e4ec2"
      ai-framework/scripts/state-history.test.mts,"01a504a8f75ced89af315b2b0bf187d0899a1924bc08153abc812f55e9d59991"
      ai-framework/scripts/state-html.test.mts,f539844e21b2d836cd7df8556acf20a1e130065ceacb79c607b804693214f872
      ai-framework/scripts/state-pages.mts,adcb50917171fbc4fc1ac01965d08a0003dba004a3eb41dac869baec0f802d08
      ai-framework/scripts/state-render.mts,b04c2383693502ce91cef1ee0b00b854e305384364bb6c5f3aa24126fdcc5b53
      ai-framework/scripts/state-snapshot.mts,"65aa3f9a06f683938a5f2709a56cc498a27cc139a2436db694b7e99cbb7f64ac"
      ai-framework/scripts/state-snapshot.test.mts,"5ace7d8a47089c2a38fbc7aad52591e3c3ec4a0d75c9abecccc5effab7c8baab"
      ai-framework/scripts/state-structure.mts,a2e60745aedf7923b94bc4e7a223cf12b3b1a2049cb84a82dbdf8a8b122b7d6b
      ai-framework/scripts/state-test-helpers.mts,"3d71a4358c3ca3b17a0f0fa54d878b6dd663dacf2d6c5d5a62673cf81e5373bc"
      ai-framework/scripts/state-theme.mts,"3e1f778d8046718768c63ad45af09870b617ddcd7cf1e19294a617d855885cc8"
      ai-framework/scripts/state-theme.test.mts,d3240c16c2ad631335b57b9124d278bcd32184a36256a39f29c91fc862110f51
      ai-framework/scripts/toon-convert.mts,"10e305aa561aa4136409aed61b954db1bcf278faf8a9e62aa953d3efe26cd5a9"
      ai-framework/scripts/toon-convert.test.mts,"537503e2455ad1da326978dae0f13974bfd4e07f55cfe684ed3470f4b3c17a58"
      ai-framework/scripts/workflow-contracts.test.mts,"5fe4477b8d32c84b7c5bb3d194bdec66e4e69f5ae1c03bece46754579dc933cd"
      ai-framework/scripts/workflow-doctor.mts,"54fc4f0203ffdd3a2bf8adb760b980d1fe73e3ebbf2f69fdae859818d7be161d"
      ai-framework/scripts/workflow-doctor.test.mts,"15f5b2e21ea5dd54b2c8b03d18674273cf40f9abc252e2b09027595811ab3223"
      ai-framework/scripts/workflow-metrics-report.mts,"98a28139b2e5fc4a965be5adc04331f677e4449668069af2d6dbbf2d298b8662"
      ai-framework/scripts/workflow-metrics-report.test.mts,"26b2c361577908cf42bc3b2150328bb0f98be18ec0558bb3db462434592b75af"
      ai-framework/scripts/workflow-metrics-state.mts,"445170d9a49119f9479d522e53ae9421d567ba7a57886c048cd289a261c7fedb"
      ai-framework/scripts/workflow-metrics-state.test.mts,"0b5914c1446aa7757d328679871d0e19195be7027ec55a72ba02e40b98b124f5"
      ai-framework/scripts/workflow-metrics.mts,"8ec0824f72cf45cd0c9565483250c51664136ed679defc6301eccfcf9268d35f"
      ai-framework/scripts/workflow-metrics.test.mts,"97857efe0bbdadbf3b52bc5af44de832ce0685e6bbb6c4fa57f188bc32962b7e"
      ai-framework/templates/ai-workflow.example.toon,dc41ce03805031b0b4b7e2aa7153d05525bc8eeae65fcbd4790effe0146981c4
      ai-framework/templates/ai_workflow_env.example.json,"98dbcb3a7b9da4a149e67cd26c8dc4e416e7b1a7dcb22ce09f728c7924850017"
      ai-framework/templates/project/analysis/README.md,"9116655c8f8d3e6dcbdc69fcd32319804724b18bb6fb52b82ca23cdce9dd5a90"
      ai-framework/templates/project/context/README.md,"5e76c38ea55af9925fc68548f7fad48373d241c0cd180943b29561ea725a91c9"
      ai-framework/templates/project/design/decisions/template.md,"53811f0820d81415253f2a4efe16fdb45227a8ed55f04527d1b59e0d92373ce5"
      ai-framework/templates/project/design/plans/rollback-template.md,a78158600a847a6840ee761e2481890b80bf8609084a92862fe805a1ed812cab
      ai-framework/templates/project/design/plans/template.md,d62d8649f6cb97dd3db9622f4f86492ff75037ff5afd0e216aa12a9953d16c90
      ai-framework/templates/project/design/template.md,d3482dc696b3893231b2cc6a54c7457784119fe9df4e8a4976464f9c15628196
      ai-framework/templates/project/design/wireframes/template.md,d3482dc696b3893231b2cc6a54c7457784119fe9df4e8a4976464f9c15628196
      ai-framework/templates/project/done-work.md,c721b6ec084de8a11a31b5fae753746888c127b85952a335a860ce100264465d
      ai-framework/templates/project/knowledge/README.md,"99e824eb8d955ffb4ee50b41fa0ea2501c42fce1749690eeab2c42385fe023d5"
      ai-framework/templates/project/knowledge/templates/decision.md,eb7b93ef148d3da5eec03c75a6de427cf9a648354bdd4b52da412929a8fefe88
      ai-framework/templates/project/knowledge/templates/entity.md,"15485085bf9faf8fa4a61545df7d795467dd28befe6dfd3910a6816ae0c3eae8"
      ai-framework/templates/project/knowledge/templates/issue.md,"9270185df6ff085341fab5905134651cd7e0a5d3679ccd604686149100dcc542"
      ai-framework/templates/project/knowledge/templates/pattern.md,"27621bfc41afc5c984fbc16d310b20715353b6df4dd8b36d82fd2ab3c97773aa"
      ai-framework/templates/project/pitches/_archive/.gitkeep,e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
      ai-framework/templates/project/pitches/_parked/.gitkeep,e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
      ai-framework/templates/project/pitches/_templates/hill.md,"6d728f73ff5b532ff6ef77949221a2dbe4f38a158b6d90985fb4c789530559dc"
      ai-framework/templates/project/pitches/_templates/pitch.md,eb927ca736585fec3e9afc14539582b5cb9b261e49085759b11f68bf01f8cada
      ai-framework/templates/project/pitches/_templates/plan.md,"64f750a6d2b90bd36c37daee3427e6183b61f4fb04d937a402f1db122e093b86"
      ai-framework/templates/project/reports/README.md,"6a09eb48c81bf1eae76b757230c20436a1a1709b45b7a071dcc5081b52766a2a"
      ai-framework/templates/project/requirements/bugs/template.md,"54f0dc660d2177883bedf8c02be5d6e368b2e1eeb6a5e597c1b2d20d39039f75"
      ai-framework/templates/project/requirements/features/template.md,"0207eec5f811c08b303783a65c697129a4c4a7f1cd803a9e8db06655e20ad5fc"
      ai-framework/templates/project/rules/README.md,e1f7f7c7cb05a750ee338a346987bd450e4e53630aec0690a2ba267d9cd5883a
      ai-framework/templates/project/runs/README.md,"11e2d6c91b7b1a3abad781f73017979a59d403a31bc608850cf7ffe32c99f0a6"
      ai-framework/templates/project/status.md,"317486b3922fd511b627e5d14b3c28b23b6da25d8950f9461f6f00e6e2f7d8ab"
      ai-framework/workflow/overview.md,"873bb51f966fef96b0c9970f36a35c3a7b74b6897c64095de318aad7d0b14301"
      ai-framework/workflow/phases/0-shape.md,"0837ca21f826f0e48a18070f574348c730081915f410ecb9bd95fccb2a1485b7"
      ai-framework/workflow/phases/1-plan.md,eb9c56adc6f045daf50c0ec6708a5ad4f2a609b6baed789f76c6b42d7d07ac54
      ai-framework/workflow/phases/2-build.md,d1f1a816bd653e7ab45a2703075eb50ebb2450e7a8015f336e6d4cd29137efab
      ai-framework/workflow/phases/3-audit.md,"067275df459da6fca94d083ec081076273043e98ce81f3cab9a1f1557b6a603d"
      ai-framework/workflow/phases/4-ship.md,a8685a3628670eeca49a29359eb6d3d8a9ed66250d1a5b472d7d103602899a9c
      ai-framework/workflow/phases/5-cooldown.md,"828633bec26df18363126a04e649f15e3f512014527030b8692f9f1a8b37a59f"
      ".project/status.md",e427b798c76d837566837baa52361b95cfcc3b3630815134c5bc2cca96d0b2ad
      ".project/context/stack.md","999ae0207160b3e6c28aba32873f40631a0693571e4e1d41a804d20c0e70b0d9"
      ".project/pitches/connected-memory-consolidation/plan.md","259de12cf95ab9c0ad68c518824338610375a21e3c1451e5e06ddda0c3d0509f"
      ".project/pitches/connected-memory-consolidation/deviations.md",b37e078c68496b77876dcdea95d716fea2df6be976a3b208601ef3638d53f34a
      ".project/pitches/connected-memory-consolidation/closing-exceptions.approved.toon",aaa288e412348c12222072613543c0a606645618335a87a3d347a0a393a5d92a
      ".project/pitches/workflow-v3-rollout/pitch.md",eba3bf397244c34e26b68e4fe7fadc4929fa4a160979ea40ed2fe3c558a7cb83
      ".project/pitches/package-less-ship-verification/pitch.md",ea689efee7916d4392e9f1b0750fc0e1844c1f527387bbf05c894e8ed59b47b2
      ".project/pitches/orca-bounded-control-receipts/pitch.md",e1cca59fa538576cb37f47b76d756bb640274e2badc3e6d34e41e5eb88930e14
      ".project/pitches/fix-retired-live-evidence-path/log.md",a69f0a38e643e70f2ce1357a3a2232cdffb711c5172b3954cc4d45b13f5f7c44
      ".project/pitches/fix-retired-live-evidence-path/source-proof.toon","38ead5dcdf39d369ce237443e8aae327cd4b514eda4f4100d0a17ed63def4704"
      ".project/records/legacy-upgrades/state-ai-authoring-live-runs.md","868e76e9eace40c14f8014e18a16a8fa5b702de13e5489ebcc29c4e7944fc24a"
    canary:
      file: ai-framework/scripts/consolidation-migrate.mts
      line: 179
      findSha256: ba26dfade0a231175047fa6fd09d12b64138158d6279b9ac7c956c687e2f2d35
      replaceSha256: a83ec44af981b1e4fed2f76399e67c88b658ad4351495dd28621f41bbfdaa52a
    testCommand[3]: node,"--test",ai-framework/scripts/consolidation-migrate.test.mts
    baselinePassed: true
    canaryBreaksTests: true
  p2c:
    files[428]{path,sha256}:
      ai-framework/scripts/consolidation-migrate.mts,"8374daab56cac02d3bac575fe2191e8b332ee96860aa18a7910e268f4bfd74f6"
      ai-framework/scripts/consolidation-migrate.test.mts,c35da87119b5eb3cda0c000e31c96d220a86ca7dce1ccf7fe5d0d2449f697ab7
      ai-framework/scripts/done-work-index.mts,c31dabc332164f6faf4b8e143101b8ffd0065554fb322c8726b1cf7bc387fb2e
      ai-framework/scripts/done-work-index.test.mts,c5512956180a4be121c15b21098c1a560f09e0dfc03f51ee3006b60be41237b2
      ai-framework/scripts/graphify-refs.mts,b3d816aa913e16da3d50069cd310a92f83dd3790267d092e9d9e54f6d9f9ceba
      ai-framework/scripts/graphify-refs.test.mts,"24de7ac954d6d1ffe17de8e028444b9a6dab14f11c030350d1b3871179c3bb3e"
      ai-framework/scripts/graphify-relations.mts,"188a05a38c3aeb28dff9584d3915ce59436bb13e465630fbbd1181f21f20614e"
      ai-framework/scripts/graphify-relations.test.mts,"19dc94408c46fe6be23fc62b410bd6be8cdc235ee8b94512416d7e57ba435c70"
      ai-framework/scripts/installed-upgrade.test.mts,"8abf9eea79de9e02025fa710d94a0886da98b6a2725cd1c88c21c3c5b796367b"
      ai-framework/scripts/ledger-schema.mts,f3166ed20310c110b53fc2c26d2d55b06acafba4e592eb9124e2f158de54cf01
      ai-framework/scripts/ledger-schema.test.mts,b9a14c9c0cf5ffe3eb04c53f5b8ac23bfecf9b0459a64eeadb7706cef115a161
      ai-framework/scripts/legacy-upgrade.mts,"252a77e0bf0e926a812ac082774c4ea09e675716e3125cb4acba3d4a8236a95e"
      ai-framework/scripts/legacy-upgrade.test.mts,ab7788e9c067f6301f241765cca4cc42e229593094da681406634fb8fc3d8b94
      ai-framework/scripts/outcome-record.mts,bd5db227978b2e22c4b8842732cef663829fa0f191e6a786f2029a4cdcbe0524
      ai-framework/scripts/outcome-record.test.mts,"250a6c1e871cdb2332ca8c64ec0733aebad5535880f881786b35db0be5ad1d5a"
      ai-framework/templates/project/records/shipped/.gitkeep,e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
      ai-framework/templates/project/records/shipped/_template.md,c1d60dfa0eada8f2eeb3c317ea3dd0173b0b6bfc5695c99ec09273ce5fa90e59
      ai-framework/workflow/relations.toon,"1b9c854a1b0ada6eb7eede64571065213a035fa270fa45e9bbc32ab31acb896c"
      ".agents/skills/add-skill/SKILL.md",d7837a88324d9893b33da31c1488e7c70d8ce259f7c0e4a92ba73af5b7c18383
      ".agents/skills/audit/SKILL.md","32d867694d321cd0393e17d8cfa4245c7da6e205c61bac9732920f98c8c8cfc4"
      ".agents/skills/build/SKILL.md","22595bb21aeb07b260c7b8af5d082516d9367be95959b0d0d4d46416ccf0fd08"
      ".agents/skills/bundle-sync/SKILL.md",c0c161afa4744901449ad01a0d4563c9072db3abf16c8e4656b9fa0aeb2f1f32
      ".agents/skills/changelog/SKILL.md",d7d73123e3ffdfc65bffc53eb4f4b793e6b73684f2dd674ab409375491d06fd7
      ".agents/skills/checkpoint/SKILL.md","96556aedde6a13aa5fb77e064736cca30a1ab8f92e7be250a89bf17019368a76"
      ".agents/skills/cooldown/SKILL.md","3bc26b12ced53b161132efdaf651054ecce4e48a4090dcb0e476480260c43755"
      ".agents/skills/critique/SKILL.md","11c21a8556ab25f4afb115f8a14bb452955f63e05388074aec89ab8d6fc9bbf8"
      ".agents/skills/dependency-security/SKILL.md",e4c1f4cdb80ed3c38f67d3dc53d31c5fb038754fb4b1a01dcc040c403ab513e6
      ".agents/skills/eval-harness/SKILL.md","7dc9cab1549371b2b66f0f20b1e42e849deb28966e2457f1a69758af38a0c2b6"
      ".agents/skills/fix/SKILL.md","5e2fe2aec889f5bbe6ae7cedf8fa494734e29a5f2b8a70d73f38cb40006ff16f"
      ".agents/skills/impact/SKILL.md","938be82e10cfa944f000efc59a16074f731e35a252fc6a01b0fd3b4c172fbbd8"
      ".agents/skills/knowledge-health/SKILL.md","427b596f307332471287f33827a3663fa645c9772acd81feb3e5ea4f79e41339"
      ".agents/skills/pitch-compress/SKILL.md","3f15f6ee79fbc21807dd1ae81151b0c64294d42a151af34663ae65222dcb3dc1"
      ".agents/skills/plan/SKILL.md","123c4edf8cc16034b151526cd004c73ff9cf889ed2dd68a7f6317fc32ad266be"
      ".agents/skills/resume/SKILL.md","9f79d5026375dffbb792a8ab1e8c036f971fca0dadcc07870d87bf99df652615"
      ".agents/skills/search/SKILL.md","5e18fe9870171d720bd4626230a38a8cf33283337369318a16b84f653eef2b41"
      ".agents/skills/setup-validator/SKILL.md",cbc5acbfbd37c681cf03ee4b4e8a5904ad82ca9699661dfd5d87dad655b3f7bb
      ".agents/skills/setup/SKILL.md",bfdaeb0013c1bf50279c5788045f19f9766f0124afdb1b467af7d96c7b513d48
      ".agents/skills/shape-lite/SKILL.md","8db611a176e4aa8bce689cb69c5a4744be840a8cee8337c51de51bf06009d5d0"
      ".agents/skills/shape/SKILL.md","997e8ffca9913d7750cc2220380d1daaee781c80a72641b24ac5d297d0bb96de"
      ".agents/skills/ship/SKILL.md",ab3169550c59630fcd76ba82ef7d6a8d4585469d00a237c8edb6d5cc10f84240
      ".agents/skills/state/SKILL.md","5826d2916847ad938ece309158a36daf173ea9b5f3cf895b3ee0cb0e7f14cd20"
      ".agents/skills/switch/SKILL.md","96fb35be2e5f0df6beb3108aeb6891efa8907d5b43404112c8a3374e4b75a0a5"
      ".agents/skills/sync/SKILL.md",b5dc6bc484d7f2bdc89c42dc6b55ddf167c41bbc0ca64888215f21247ad23d19
      ".agents/skills/test-strategy/SKILL.md","22f0c4819c70efb45ad4d46dd7e86b5868e34466bc8ae3d1d41b62ce5f1e3787"
      ".agents/skills/ui-design/SKILL.md","02c16453c5bea27aa35e38099159b5437e2de053a722546385f0f8658ac99e8e"
      ".agents/skills/workflow-doctor/SKILL.md",ec23c3cddbaf405e4b233e28d44d2b0be1e83fc54ef956c19612da565ce60b58
      ".claude/agents/appetite-auditor.md","8eefe2784aa5abe39451f0cf3e62f5547e2f3be6371a365542d0bd42e6776dd3"
      ".claude/agents/architect.md","946d7b59066d8bdf600427f9178ba82418c8e552c01e6a2cbabedd312774f03a"
      ".claude/agents/build-error-resolver.md","46f47d4b31ad0e42923f4133a4c9732ca470348d8e3878ef82355647a8446fd5"
      ".claude/agents/code-reviewer.md","66e01142e0a10ce05e03a117d210181346e4b12e6ea20c0adf9625983151e8aa"
      ".claude/agents/cross-pitch-conflict-checker.md",e7730afa362b81ddcdd6e6d2c70b7b2971020ab59e1f0b80f8c9707a3f91727e
      ".claude/agents/cross-pitch-projector.md",abde0dbeb4996ba4711e6691c7d0eb6bdb8afb8f5ffd6c22bcc9747328cea484
      ".claude/agents/eval-regression-projector.md",bd18787da6bda83fec81f2776511d85045bf9e35d320d9f7f4a9240f59115092
      ".claude/agents/eval-runner.md",cfea69c7b1e5aedc7d351cfa770f065d7289022973cb66d13b183ad3802ff2d9
      ".claude/agents/i18n-checker.md","906c3cda8a507fedce3f0e1f13d96bc7ce8684173af0c457cec67e6003fbf250"
      ".claude/agents/knowledge-historian.md",df0db5fbbf9bcc9cc1eb54c4b0a877c7974a45f24393d56274a8996d2672acec
      ".claude/agents/planner.md","400e2223c32cdfdb856a21f276f63e19f634a57eb7203e3cd6ce23e425d6327a"
      ".claude/agents/refactor-cleaner.md",fd309d0a7dd9e8c096d7b8eb6deef8ee33c88a48df5a65e0bd0f2b8b7a7b72da
      ".claude/agents/security-reviewer.md","47447823a6a9e15b8ca65707847e7c98f2609d3872fade369d6899cec770e2d2"
      ".claude/agents/skeptic.md","2d35896e104c4757552fa4c5fa974c6728bae32ab66b26635f0f76283997cba9"
      ".claude/agents/test-coverage-checker.md",b0e3bcff229aa21b76b21932ac65335f3aea7e7d22c31d2421766c82f1faf08c
      ".claude/agents/ux-reviewer.md","08667ce6bf0d9624993bdc74fc2174a748853dee82fb0ac8530eb93a6deec03c"
      ".claude/skills/add-skill/SKILL.md","22e4c0f23b6ac18b6db19d81e9201f4ef8125728c4a3b1ad38ea7451b3a8d378"
      ".claude/skills/audit/SKILL.md","9e5f8eaff3076142e40d8e93503ab9d8a2762a187a341f2ed969b97fba049768"
      ".claude/skills/build/SKILL.md","6662d53b595604b84c39530190825667161b788d24df895c6415c82b4d994b0e"
      ".claude/skills/bundle-sync/SKILL.md","84e22bd6bdd331184c9c4e69f6702fc321937b640e8b7e0502f167bf8a4ec611"
      ".claude/skills/changelog/SKILL.md","521942ea8e70e925d6605de021bfbc894979430b798ab03c29c4b690108c1a32"
      ".claude/skills/checkpoint/SKILL.md","6dfd0aae2385b6ad32e82327318e56c75008385841eb2356fa843be3738c39ad"
      ".claude/skills/cooldown/SKILL.md",cfff5c90e9d90b4e5a26819c90a09e8763f3d88f5ea56f117d472105db2a4906
      ".claude/skills/critique/SKILL.md","8b236983598ac5f71387bb847baa369ba5e8ab17a6cd2f67ebf7ac33c86341c9"
      ".claude/skills/dependency-security/SKILL.md","02a6b95ad3f32f2794312f292bdb45f7afda53980167717344915c2112f13436"
      ".claude/skills/eval-harness/SKILL.md",d0b39faf3168f74de06e85d6a7047dc2e297d1bae728fe23627b54b6cf1eedca
      ".claude/skills/fix/SKILL.md","25a7a4016e8b78a3f7d681759110258adae018ea6f347196242462eb11530033"
      ".claude/skills/impact/SKILL.md",bb717630ba8ae5405b3679e17560d6767ab819df8546f8c717fcbcdc2b9e715c
      ".claude/skills/knowledge-health/SKILL.md","316cf25633a0487ba9326420ebb9b0ac509f4bef67bff6c77a3cf38c4ca3a26a"
      ".claude/skills/pitch-compress/SKILL.md",ea0ed82369db405bc787818eb303eeb6e74fed9ace4020baee74481eed0e4343
      ".claude/skills/plan/SKILL.md","0df576503246063397d86755d16b01c57a8b0ccbd4bf47920892ca8413b06070"
      ".claude/skills/resume/SKILL.md",cf880065b8deb14115915d0901d913c9715b0e602131d4a1562d836e32e5d771
      ".claude/skills/search/SKILL.md","23143001d0c245a6d55b62785ca821f069e2ac19a312e509568e4317f5922902"
      ".claude/skills/setup-validator/SKILL.md","8ece5995655d6576644cd586d8d4838f94a033c4d23cc70c3bc34ade1add7e13"
      ".claude/skills/setup/SKILL.md",adc701890439fdf8d0b0817c3282dec963fae7e8aaf65581093de5f9e6c36fc4
      ".claude/skills/shape-lite/SKILL.md","3a3cf74cd8ea694b11af10c94a4cb621b4465e22d454be5ea0635900ded44901"
      ".claude/skills/shape/SKILL.md",a2aa0fdb7f2eb3f929b771e9739dbc6380a54d4bff957e5aa964326b8a9aa11e
      ".claude/skills/ship/SKILL.md",aea1057d0dcd303da4d4fb98492726ce65b605f3462ad569cc52ac517b141f69
      ".claude/skills/state/SKILL.md","531c1c02b8e4712455eb1041e99dcd488a1f588d3673b0aee671cc80555deab1"
      ".claude/skills/switch/SKILL.md",f188b1e0a68430c9be5201b223c927367dd5ed930a0cb24662ad4f297215d74e
      ".claude/skills/sync/SKILL.md","1b1436c0edd3df80e54825f7cbd05f2fd1649beb23c9000d84152e089db3f206"
      ".claude/skills/test-strategy/SKILL.md","077ddf11f6b9851d715a528b51062c3cb4bf3f9b834a5fd5bee0fbf180138ab1"
      ".claude/skills/ui-design/SKILL.md",b49b04f982e1869c2e6dc0e0c9dd361cc99633a5769905dc3e92bdad3b4d94fe
      ".claude/skills/workflow-doctor/SKILL.md",c80f03e8a893eb37e51ca8b16961ac4cf2cc5e3bbf33a207f758790d40c48116
      ".codex/agents/appetite-auditor.toml","950d04aa91809e1f271fd4161def233e2af6cc381f0b3d24a1385b0adee06674"
      ".codex/agents/architect.toml","5c7268383d8d443e5426d197674a308d31b26bbb71bad9d83fbc5d1fa66f53f1"
      ".codex/agents/build-error-resolver.toml",a7166d2de56ac842a4c3a362df329e7b5a0387ac7f15db29a090493afadce997
      ".codex/agents/code-reviewer.toml","3c379b174dfca92bcbda008e61263a758ad48922e3bf7ba70d532e4637fd6eeb"
      ".codex/agents/cross-pitch-conflict-checker.toml","24af3aebd95784bb070de363adbbfddc553b4ff899b30b023fa85dd47cd510ac"
      ".codex/agents/cross-pitch-projector.toml","0d93072027c5325becbee585659ce3875662a92d085960d82b30bf4e97029ff2"
      ".codex/agents/eval-regression-projector.toml","02937025ec7da86f92f736d0649ab68ca2e495a2d83b850de289347a4ffa9d76"
      ".codex/agents/eval-runner.toml",dd5f532db6ebf0ca3e3e10b0ee80ab846b8c2f308c589d71bb191e24f702f7fb
      ".codex/agents/i18n-checker.toml",d8af2b2e17ea0180f613b3993132b55cfefe29fff03bea47b5fe1a4a8d9f78f9
      ".codex/agents/knowledge-historian.toml","7353de3fce2134043bce9394f9babb2b7ed87d9cf45486d8a60acccead569248"
      ".codex/agents/planner.toml",afbcacc2e157d89bb225173118d56f26b28209d118555a65549f69a7e3d4e7b4
      ".codex/agents/refactor-cleaner.toml",a56771324bf3eb9307feaa5aab560171de5edc7b8e4c918882a389520452aa81
      ".codex/agents/security-reviewer.toml","824ab52cf562da785219195aced4b87c820b79d8c18280a8c518dad9e44cb6ba"
      ".codex/agents/skeptic.toml","98fba04902c641565ba9c1fb5b00c472bf2249d4f37c03d2318e8c9218255a05"
      ".codex/agents/test-coverage-checker.toml",d61fab07a844c551bbc5fb82befadf97523532f6c84b065f2c9c0f7446586fb2
      ".codex/agents/ux-reviewer.toml",b19e62df117ed879d75b166c9ad8ac85a63c776c21aea200ed687eff2a654d29
      ".cursor/skills/add-skill/SKILL.md","22e4c0f23b6ac18b6db19d81e9201f4ef8125728c4a3b1ad38ea7451b3a8d378"
      ".cursor/skills/audit/SKILL.md","9e5f8eaff3076142e40d8e93503ab9d8a2762a187a341f2ed969b97fba049768"
      ".cursor/skills/build/SKILL.md","6662d53b595604b84c39530190825667161b788d24df895c6415c82b4d994b0e"
      ".cursor/skills/bundle-sync/SKILL.md","84e22bd6bdd331184c9c4e69f6702fc321937b640e8b7e0502f167bf8a4ec611"
      ".cursor/skills/changelog/SKILL.md","521942ea8e70e925d6605de021bfbc894979430b798ab03c29c4b690108c1a32"
      ".cursor/skills/checkpoint/SKILL.md","6dfd0aae2385b6ad32e82327318e56c75008385841eb2356fa843be3738c39ad"
      ".cursor/skills/cooldown/SKILL.md",cfff5c90e9d90b4e5a26819c90a09e8763f3d88f5ea56f117d472105db2a4906
      ".cursor/skills/critique/SKILL.md","8b236983598ac5f71387bb847baa369ba5e8ab17a6cd2f67ebf7ac33c86341c9"
      ".cursor/skills/dependency-security/SKILL.md","02a6b95ad3f32f2794312f292bdb45f7afda53980167717344915c2112f13436"
      ".cursor/skills/eval-harness/SKILL.md",d0b39faf3168f74de06e85d6a7047dc2e297d1bae728fe23627b54b6cf1eedca
      ".cursor/skills/fix/SKILL.md","25a7a4016e8b78a3f7d681759110258adae018ea6f347196242462eb11530033"
      ".cursor/skills/impact/SKILL.md",bb717630ba8ae5405b3679e17560d6767ab819df8546f8c717fcbcdc2b9e715c
      ".cursor/skills/knowledge-health/SKILL.md","316cf25633a0487ba9326420ebb9b0ac509f4bef67bff6c77a3cf38c4ca3a26a"
      ".cursor/skills/pitch-compress/SKILL.md",ea0ed82369db405bc787818eb303eeb6e74fed9ace4020baee74481eed0e4343
      ".cursor/skills/plan/SKILL.md","0df576503246063397d86755d16b01c57a8b0ccbd4bf47920892ca8413b06070"
      ".cursor/skills/resume/SKILL.md",cf880065b8deb14115915d0901d913c9715b0e602131d4a1562d836e32e5d771
      ".cursor/skills/search/SKILL.md","23143001d0c245a6d55b62785ca821f069e2ac19a312e509568e4317f5922902"
      ".cursor/skills/setup-validator/SKILL.md","8ece5995655d6576644cd586d8d4838f94a033c4d23cc70c3bc34ade1add7e13"
      ".cursor/skills/setup/SKILL.md",adc701890439fdf8d0b0817c3282dec963fae7e8aaf65581093de5f9e6c36fc4
      ".cursor/skills/shape-lite/SKILL.md","3a3cf74cd8ea694b11af10c94a4cb621b4465e22d454be5ea0635900ded44901"
      ".cursor/skills/shape/SKILL.md",a2aa0fdb7f2eb3f929b771e9739dbc6380a54d4bff957e5aa964326b8a9aa11e
      ".cursor/skills/ship/SKILL.md",aea1057d0dcd303da4d4fb98492726ce65b605f3462ad569cc52ac517b141f69
      ".cursor/skills/state/SKILL.md","531c1c02b8e4712455eb1041e99dcd488a1f588d3673b0aee671cc80555deab1"
      ".cursor/skills/switch/SKILL.md",f188b1e0a68430c9be5201b223c927367dd5ed930a0cb24662ad4f297215d74e
      ".cursor/skills/sync/SKILL.md","1b1436c0edd3df80e54825f7cbd05f2fd1649beb23c9000d84152e089db3f206"
      ".cursor/skills/test-strategy/SKILL.md","077ddf11f6b9851d715a528b51062c3cb4bf3f9b834a5fd5bee0fbf180138ab1"
      ".cursor/skills/ui-design/SKILL.md",b49b04f982e1869c2e6dc0e0c9dd361cc99633a5769905dc3e92bdad3b4d94fe
      ".cursor/skills/workflow-doctor/SKILL.md",c80f03e8a893eb37e51ca8b16961ac4cf2cc5e3bbf33a207f758790d40c48116
      ".gitignore","6b3798fef1a85f421f9564c35574dadfe7a6dde8e98c5d585566081e64c99bc0"
      ".graphifyignore",ac41f08adb3b692d4c61d68cd51e1e878b3d33fb6dadf19e36a8e1f644a57771
      ".opencode/agents/appetite-auditor.md","6067c968c076d1557bf53e539aa56cad16d9eba9b3dc91d6b8b95c6bc90a73b9"
      ".opencode/agents/architect.md",a7a75598b94225f54361631692f8e3be28797fe8731bdd9dd8009afc494a7656
      ".opencode/agents/build-error-resolver.md","3c4bf7b9b2b2b4cde6aca86250ed2555a08e59ca2ec13b901baf219f4af1dea9"
      ".opencode/agents/code-reviewer.md","4b6b95d64769f432c9291f4523fc4522fcb5cc2d08374a74765b806d693f53ba"
      ".opencode/agents/cross-pitch-conflict-checker.md",f3523bd36501b3608538950dd48a66a644aefe2202eefd5f82ad8d7b5cfdbbf2
      ".opencode/agents/cross-pitch-projector.md","05d3000704c89550343a1122d122413c5fd05dbf45d59c4ae7008a27840aef2b"
      ".opencode/agents/eval-regression-projector.md","6a05af0ff60fc3abcd6e1c230a939e18545b729e5a3bd5bfb8254d9f806728f4"
      ".opencode/agents/eval-runner.md",edf8c488ab98d58beeab95232f0a8c1e2c44f93ab09cf07d25b467fae2e887bb
      ".opencode/agents/i18n-checker.md","76c389a7d9169320935a24ca220ea89bb322ff79ff8f028b3cf5014cf0ebb22b"
      ".opencode/agents/knowledge-historian.md","78decb1d8fffe8db93a067a889253d25089009cc2e94753dd23c2ebeb81ca6ca"
      ".opencode/agents/planner.md","4593b7f3308081e1acfcb26b8c5dc92377e0440e2c0e1bba428ff597c2fdffdd"
      ".opencode/agents/refactor-cleaner.md","0187f37319a323c67ebc5268429cbb414f4250f9bf48765940c2987e1e3d546d"
      ".opencode/agents/security-reviewer.md",df8da747d2e84db26c5d2d68740c696c5c151c62e220f864ed8faab7606fec8f
      ".opencode/agents/skeptic.md",bd8114fc3a698beabfaabbca4101d8ac857841b6545d3de286fb56113d21c44e
      ".opencode/agents/test-coverage-checker.md",c638436a5fc9613c1e2264af2d79340c060d45318100eda91c4fc7d052b505e1
      ".opencode/agents/ux-reviewer.md",e1746aebefb0fdaf9e018dab630c3b02fab47abf9f98991e786080588b361c99
      ".opencode/commands/add-skill.md",a24a853b7cfd2648bc3c6c7e5faceb503367a41125546706dc2e5c1a58eaefa0
      ".opencode/commands/audit.md","3e1d85c40b6ea6c9affc8abdc69b5a881824144d30f76899f62aabbafd6c9632"
      ".opencode/commands/build.md","161f807562f1303fd47e46a9fd1e78d477cb0195e53d750fbb6c729b2fc7b9ed"
      ".opencode/commands/bundle-sync.md","4027c20d5bc08abc8d266eb680535984cebb21e49b365cefd4416ee869687c3f"
      ".opencode/commands/changelog.md","28e390fc6fe6abcc2ea11b9118925b96dfd04d55d266499d1b2db84c6808bf83"
      ".opencode/commands/checkpoint.md","35cbbe83dfb2d5a2b1dda2a755f96362bb0e5e92fba60cc19af464d7b967f51e"
      ".opencode/commands/cooldown.md",e03ff5f42597a08f31d57c2f7394404b6e90b91ea0d6f73d649af3c8b45e3e97
      ".opencode/commands/critique.md",b49ad5e6d69541594a3368923f0031ffe9a148862ee34cc75ea18da013d36cc4
      ".opencode/commands/dependency-security.md","6222354d4bc3a9d52b0e0f4e036c6c2e7712ec609b2b6bed19a3fa9fb358c7ff"
      ".opencode/commands/eval-harness.md",f5af146facb0ffb883a2747abcd315e59c13280e81a7e7c2cf5680f9a01211fc
      ".opencode/commands/fix.md",d878f6ca6b857e220cab43eeb2aa518c28cca99a099c1fe9aa4598b32e6a6d76
      ".opencode/commands/impact.md",f068a208d34bc0ffed2926c61eb1a0c2f4e39d524898ff34c2a46535405991da
      ".opencode/commands/knowledge-health.md","47bf002b60af30a0792015c940b7fd469a5d182f6919788174762072ce009c15"
      ".opencode/commands/pitch-compress.md","840e1c204edf6d9b480f627742a7cf28bbe3eb587239dee529396f943d36bfaa"
      ".opencode/commands/plan.md",f5663a94fe039dc833ea7ccf34cf219e18e5b3bd30cd5bf7735e132c31f789f2
      ".opencode/commands/resume.md","23cd3ebf64dcbbc4c5d85b7bbd7cf1168e33c41a7506e17d13d3e923ef33efaa"
      ".opencode/commands/search.md","8c5d195c865f7f5f3e7b85f94134e8fb3d693ad136cd43c3e98804495a430957"
      ".opencode/commands/setup-validator.md",f91b775bfdc4a5ce9c0e9ed72f112aae4d419d2de07b04aeff2fe0cf02ef91ec
      ".opencode/commands/setup.md","1f0112b7797923d620a08020802fa6e702b79a34051a393abcfd674de2d56b72"
      ".opencode/commands/shape-lite.md",a62d2cce2677a5d29cc0bdefc1034dab7d560e9e33b73d9a9464cb1c71787b0e
      ".opencode/commands/shape.md",a9c091ed89541016e40502a8458e83da5d8dfce072a6e04d8c787afbf301069b
      ".opencode/commands/ship.md","0c854ecb8a070072dd97d30e90cbc5fee3c90ae756dc11467ba4f1a108ac69a8"
      ".opencode/commands/state.md","6d860a5ee9bcc56943462b62e37e858cc09430fabf89f2324c98578a2794a419"
      ".opencode/commands/switch.md","6d8565bf8f0b85fbc241cb3de0e389abec959bffb796e84e58678496f26e979d"
      ".opencode/commands/sync.md","814817fd48af767c8b75b0a89e17970048d4fd02d59f1ad71a326758fc505886"
      ".opencode/commands/test-strategy.md",da062c2b25400b88e5d218e9b500b2a9c6a3502a3c02091a10420536597c7bdd
      ".opencode/commands/ui-design.md","9f903532327b2af84c6e45f66ad4df50bca414c16d6c2ba6fef18161cda73e6a"
      ".opencode/commands/workflow-doctor.md",b511e97fa072cb1619d8e2b0c5c100172d1b59d5bd8cbf67c63be21d8c505fa5
      AGENTS.md,feb32484e13a3e18f30d3add7b4a99b676fcf8943ef3a6eaf6c1cf0b7f8fe99d
      CHANGELOG.md,da26e3d2b1714bbfa20f3778f21bafae3575aa7bf5dcfd453bff8343cff8047c
      CLAUDE.md,feb32484e13a3e18f30d3add7b4a99b676fcf8943ef3a6eaf6c1cf0b7f8fe99d
      README.md,"8b7cf7992df6b7c5401c418f8b87a8efdd0aa0399c046b12c34b7e27c3b9804b"
      SETUP.md,c1e234187bd02dc51bf42662ba6a41d6ae57595d5529301d3ecae36c57f8817f
      VERSION,"9bd51d4120f0ac96a8e2e9f9a3e68e8175db7659324704ba2306aa682dffec33"
      ai-framework/docs/design-notes.md,f4141e7d74b56f20e8e2deec14eb19baf5dbe233b925183025b9ebb5c848f54b
      ai-framework/docs/extending.md,"935499627ae1c09fe618f9c8736e66b3df6aebed4ce14206448e283949c7588c"
      ai-framework/docs/knowledge-graph.md,"6a98e9fbf1fe90fdfd712504403ac3faf2e7e29bf7ecbbfb80fb18f74b83ce1e"
      ai-framework/docs/pipeline.md,da7eb210d0263bf82b2a3f4de8046a5fe396623a7006aefc748dc09b2067942b
      ai-framework/docs/setup-validator.md,a616b2971976374fb0987ac53d0ec5cb641a39260b194db2b0a2125f1501302a
      ai-framework/docs/setup.md,"9792b1079b82f19e46ae3338cb01b2eb55823394cffc69ceda5aaa157f1c11ec"
      ai-framework/docs/testing.md,"2c6d49b64898f9b30250f07fa55ab7de29c4b5702733280595e304a0e209ef95"
      ai-framework/docs/token-consumption.md,c3c0b442989f000c323e851044f10c26b5c9bf065546d7734eff4bd0249132cc
      ai-framework/docs/vendors.md,"144911290b522d3ac1356d6d7f3de538a7fd0ed2b4fdac8b6cf609827b5d458e"
      ai-framework/docs/versioning-and-sync.md,"6993335e25990ee864d5050b8dad9e15544813c6ae4cb1ef3eff89f3e9f53e5d"
      ai-framework/docs/what-you-get.md,"7cb906b4029ce8d6b8231c60f88ec3d6ac22cd61db77728939b1262a730c0c7b"
      ai-framework/docs/workflow-doctor.md,"2a435ab9db182c9e251775e4961210db2b93e4bf2ecf50d7b183bacb79cf0b2d"
      ai-framework/hooks/hooks.json,a043f76bffe935b69ffcde83f8ee411ac0c8db390bf1e0b5ca0a515481aeb738
      ai-framework/hooks/scripts/metrics-lock.mts,"3735953435a9335c986077b676249ce84eb4c700c47842490a17738fbdc302aa"
      ai-framework/hooks/scripts/metrics-lock.test.mts,"64e98bcad00c630660891a4c337ae6f93871266ad2bd380ff7fc97cd0c7c0ce7"
      ai-framework/hooks/scripts/opencode-plugin.test.mts,f8c3cc0155dd27a1d15edc3a8eac8673625d4e974407dd9a670d64a7f6329323
      ai-framework/hooks/scripts/orca-start-codex-hook.mts,"04d1db5cbabd8a2d92c74ace3c4ed18aecbd86aa5e0d82c1ec5983d878bec9a5"
      ai-framework/hooks/scripts/orca-start-codex-hook.test.mts,"23b7dd3444ab20ece59faaa0e6ef9aaa8324c8c6afe46be288d241036a2feb06"
      ai-framework/hooks/scripts/orca-start-hook.mts,"37908c66cd1044e2e1b9b84c88819d495d1c8c2d7c1de18e8485700e0922babc"
      ai-framework/hooks/scripts/orca-start-hook.test.mts,"5f08b7a54a819b2aba16a6443110020d50e2c73c54eaa7a32738bc3dadb2c83e"
      ai-framework/hooks/scripts/pre-ship-verify.mts,bb32bd2d5885a9589c0e2ae2247dfc4db7d7ec5a891e4548e752aabd9e877e95
      ai-framework/hooks/scripts/pre-ship-verify.test.mts,d2fb5a3c8fc8ffc4beabe8ef6f7a8b1335f6fe6dc0f6ce35cba98a8e4d7c3ca9
      ai-framework/hooks/scripts/stuck-uphill-detector.mts,e3eea81bca629bd8ed4a4c6fdafd1c132b6e210814c64ca1a8b4dc7afd0807bb
      ai-framework/hooks/scripts/stuck-uphill-detector.test.mts,"555391b2434a5c7b990b50c9f0f44706f538fd65403c8c0421b2dc6f266dba70"
      ai-framework/hooks/scripts/token-consumption.mts,"59019aab893efd99e20ef3a909096811f5cd05c73d1a7444db32e6e9070b260c"
      ai-framework/hooks/scripts/token-consumption.test.mts,"9f2af606afd074ef84d734f79c116f6dc63cb2256d4fbde616e7d15b315e3fe5"
      ai-framework/hooks/scripts/token-report.mts,"16132e33e16b1758b46a82e5cb7f4f8b78f972d29d8491dcbc0fe3e14761780a"
      ai-framework/hooks/scripts/token-report.test.mts,"25261c9a3edb5c9ea11a6f50e548cea6987101c05b7dd405915e888ef78b40a8"
      ai-framework/hooks/scripts/transcript-usage.mts,eb61d064e51ec7dbffb15df93fa4c821b6abc9cdf5b3ce1e49000d8e14c75c6a
      ai-framework/hooks/scripts/transcript-usage.test.mts,d4f44ff24e69030a64474238d7a628a8d3554b320614e7d827426edfb164d612
      ai-framework/hooks/scripts/workflow-capture.mts,a405d52d6789dfabbe86ed697c459c96c24c8b862b75870fc106f3b8725cbf58
      ai-framework/hooks/scripts/workflow-capture.test.mts,"220a5ba991285e67165c0f26b73260aaea3c5a64065badb3df21d3ef657e0b78"
      ai-framework/hooks/scripts/workflow-notice.mts,"78922fb86d1dd5370c70186eb50f6e520808496d7324de0e2a8c3529e8b631b3"
      ai-framework/hooks/scripts/workflow-notice.test.mts,"71df25da12987497f1bfd071ce6ded207a08f1678927bc7d24b360266fcca6d4"
      ai-framework/integrations/harnesses.md,"0ef7fe3f102503aca042746a339479b83724bcdf36f72dbf86ecaa8fe843b827"
      ai-framework/integrations/orca-vendors.example.json,"9b02de69ebc7d86ca64b3a91b03722c22b4b51c83df30d88b58a31e077c0f24e"
      ai-framework/integrations/orca-vendors.md,"80cd5074f41697a305a921d3495fa9783929980a6503c61a47faac1df4308658"
      ai-framework/integrations/skill-defaults.json,"68df8f9dbe489506898f1c7468ade4264b7185c782ae4a67220702db1e251c31"
      ai-framework/integrations/skill-defaults.md,aed215e20cfdf1fa4ef52074fda880603e491694f2ba47028c0bf2423afaebd4
      ai-framework/integrations/skill-vendors.json,"984d7f2969bd6e7556604df438ab867002efd10341a01b6f0bc3eae4d8b436c1"
      ai-framework/integrations/skills.md,b23b038ec29166d37045703ecf1f99e512cd9ac44ea3efe29ff6768dba9f2403
      ai-framework/integrations/state-report.md,"2f7049c70c92d2209186632d3b9bc79e126f6bcffa75c43b99b75edac8df8dcf"
      ai-framework/integrations/workflow-metrics.md,dcb13ff9d2c8438df62dc7bf677f9fabbaf5d5f3caca2ad804241fbefe23bc0a
      ai-framework/rules/boundaries.md,"61a96a6c5f0080cc76bd9ed36334c5b7a78d4d9fa26ebfe99ce746a468d4256d"
      ai-framework/rules/canonical-mirror-sync.md,f7b6f1aea6da8ac7b632c17c9a8ff8d9f1a0c52e2cb23dbd34698007ad0e4d36
      ai-framework/rules/ci-deployment.md,"057352139e4a49be9f14ab4a768a5506a7efd9b0b898b49a32a214bb306d51e6"
      ai-framework/rules/coding-standards.md,"8cf88955b0a5875c55cfd289a34d1f3e095ac82091ed43c5ac9bdaeaf73fc87c"
      ai-framework/rules/component-architecture.md,"29f3a8bcd7448f9baf7187c117627c9a00401d79dd346b6c7a9ed58e6592b6e1"
      ai-framework/rules/context-management.md,dc17def4e97dbcb6ddc830b0ffab9e4e34e47337a743d3b2f25a924b69ec2355
      ai-framework/rules/data-modeling.md,"770be714ae5704510f8eb281d490775b9360d6fb0eeee1ba827a9f35199f6faf"
      ai-framework/rules/eval-harness.md,c4d2d61523679b9916c98eac78503a7875c6e16f2fbdf0acdbb15ed3060c07c1
      ai-framework/rules/i18n.md,"0b01cfaa7a5ad3a55fcd5584768834c7b65d639bfb3ad3e542436df34ccbb3ab"
      ai-framework/rules/machine-data-format.md,"4d1812f421e26771ae07e526dd0cd15f60315d8a1e7a7a3cf6348560b21a1d3e"
      ai-framework/rules/model-routing.md,"808a11a5bb154f60185c7aa89be669f6cc36e2ac58e6a2f74c1bce9a53747eda"
      ai-framework/rules/observability.md,"1a9dc8f8b13441fc0fd90d0da0d3ebaa1a4bde7e2c216db3a119b5a321e57fc7"
      ai-framework/rules/performance.md,"96a68ddf97587c6e30246a0168c2fba4e7253eec5981b742ec89af9a4e17252c"
      ai-framework/rules/security.md,a4ca5b64c845bceee7c022cfa71af90d30524183e84bab40fee0b6adf1bf98c4
      ai-framework/rules/testing.md,fdc77ea6b96206e672fc82d1417597a9a20e1f49a869a87decff997cea8023e4
      ai-framework/rules/tool-use.md,"502c479b4fde12525f8e612c6580e133efb1000829f77116a68811415826268c"
      ai-framework/rules/ui-ux-review.md,f44625f2cb8a7f615e22de2902d572d46056ae31894c19cf83b66e259d98a1cc
      ai-framework/scripts/add-skill.mts,"139e28020ea1e8364a5b1a477ebd04a3c23131752abb622a2a63ee7ae0b5c2a1"
      ai-framework/scripts/add-skill.test.mts,"457362b3cddaac608c53e900b8f58de0f64e74baf2341a1c467ada4a03b30a05"
      ai-framework/scripts/agent-frontmatter-invariant.test.mts,"6cd46140d41c9a829d0b257e289d13097db9e4c70c6e3b37a90857772859d62c"
      ai-framework/scripts/browser-runtime.mts,"1d41e97b1f475de584753f75373da01ed5311ae34e7d8aaad84f7fc048b30b1b"
      ai-framework/scripts/browser-runtime.test.mts,f887f452e1f734435b74d1cccd4e97d1161d5efbe962d8e255639214e3c04f9e
      ai-framework/scripts/bundle-sync.mts,"4e85d956e280ae4c699903e2373b67b55200f2f4c29ea1379a0bd9a8978ff8b5"
      ai-framework/scripts/bundle-sync.test.mts,"082b41ffee498dec13f5d70a5cd6dcbcd5dc60ba6593d205bc012713c213034f"
      ai-framework/scripts/changelog.mts,b6dcc744ccd1da5e621fb3298d9fc2d2b67fdf64ccbe45fc472724922207880b
      ai-framework/scripts/changelog.test.mts,"9f9d8de5c8bd881814a59fb817a6e3d92bcedec62519ab48a3dc8474fbc863ed"
      ai-framework/scripts/config-migrate.mts,"522e406ba032d4de9914926abf0eb271d6b6d16b32dd5801791230ffc90d8e34"
      ai-framework/scripts/config-migrate.test.mts,"09c90a02536f7e47ca8b73d82252dfa84ff1b11240f668738c29dfdd5c07f130"
      ai-framework/scripts/docs-links.mts,"69d9231c293ea15ba740d6584f8437d2b100029050c41290a9324030046e3ebe"
      ai-framework/scripts/docs-links.test.mts,"937774f162075024a1f2bfa68bd358836cf857a9f368cb449da78d5da95b6736"
      ai-framework/scripts/entry-import.mts,"452a6e05b8d92e1f8b190d99160e434b86f73a228bbc3bdc4f52359c8bfe42d4"
      ai-framework/scripts/entry-import.test.mts,ffd52ffd00f1459122060619309860eb6303dada847ca74f15b956ab108005dc
      ai-framework/scripts/flow-join.mts,e260428733adcbb214c2753725b96db55d592826e4de3a1245b28487bdb69149
      ai-framework/scripts/flow-join.test.mts,eb3f5f8281342cebd51779c44aaef8a728dabdc29864b2161f0fcbce6d4ae628
      ai-framework/scripts/flow-render.mts,"8781e59b3fe094be1f71c6f227d8440df70dcf7415ee13f0435e9e719735f482"
      ai-framework/scripts/flow-render.test.mts,"43264ce93320730f34547f1c0a9d971622248e5b8cb11c0d68fd3c239175a967"
      ai-framework/scripts/flow-report.mts,"452f07f06a6d57b268b53afbf80ef7ac5f4d94219998f2ace8e691d370376bb1"
      ai-framework/scripts/flow-report.test.mts,"908fb93e9f9b46d7a04f6afd952368db777beaeeb32713bfdf7d4d5493bdf0fb"
      ai-framework/scripts/graphify.mts,b15b994c411783aec7e8dca621088c9f9bef175688438eeed6ae4fe301801cb5
      ai-framework/scripts/graphify.test.mts,"1a4e95b3e13555004842b9af5c43173d356e2036a31e3530a40a0d851f1bda36"
      ai-framework/scripts/instruction-loading.test.mts,f430f3f61e72e42be161a10f8331965a6ee462a44f086f63cea25e0b8aa9039a
      ai-framework/scripts/opencode-service.mts,"6f20412410482657070a033d5e9309b7dfa6d9904245c25d9253ff25be39c003"
      ai-framework/scripts/opencode-service.test.mts,f74ae7c9c1d95ab13c00f087a7667082aa5f314aff5baffc311a3dbd036ec38e
      ai-framework/scripts/orca-apply.mts,"3031386c17d1941e899ba565a5ebab6cc8e1cfb9ff280bbca6cbebe3e766af26"
      ai-framework/scripts/orca-apply.test.mts,c677d2be9887b8d325f2a1b05035cec07d0b146c236fd8c724b4a7d4b6c73834
      ai-framework/scripts/orca-assign.mts,c90ff858e73f04328917eda589f904a0eb1d96643042eb8a1c87499eec90d052
      ai-framework/scripts/orca-assign.test.mts,"139c68c878e6ea6dc5a97d7b269b09491474e32b97bbd48f124efce11669b3ff"
      ai-framework/scripts/orca-diff-admit.mts,"1cda46e26b9a70a74753207b341a640b0cae42704002395f46fb4773277739b0"
      ai-framework/scripts/orca-diff-admit.test.mts,"3c337c6545bf846337d38635d810e220ace7fd2809dd718906e167c2b842a1ae"
      ai-framework/scripts/orca-dispatch.mts,"6ba5efb1e870eadfbf279f58353007188d72ae839afd4ec1f01076d5bfbcabe9"
      ai-framework/scripts/orca-dispatch.test.mts,"2948ecc2666aaeb54f139b074696ed68087f57fe5ea1649f03fe3a9b79b6ad19"
      ai-framework/scripts/orca-eval-grader.mts,aa4793bed42f7fb6d72580a83b18e8d10660ac239908f4e8c5eaa6135045be11
      ai-framework/scripts/orca-eval-grader.test.mts,c761186bc2e975446314af94fc10a62a0d4c793223aa00b9e3ac7e22b358c1c0
      ai-framework/scripts/orca-evidence.mts,"490ba3b395e1990dd2a52ce5b7d5732d734e59f65f154cb6b11308289952bb43"
      ai-framework/scripts/orca-evidence.test.mts,a39f7617c926eb5ff76bff449a901efb484a391eeeb476b645ba649309ac3035
      ai-framework/scripts/orca-launch-gate.mts,"6a1af51f400040781fc0ded7c9395b35c8bdfa94af537af46acc312092927e92"
      ai-framework/scripts/orca-launch-gate.test.mts,d4d1e01fdb9f4e4b0f191966e3d0907b3ef1a28f249c3a4882e09222187eb0d7
      ai-framework/scripts/orca-ledger.mts,fc0b481f7cf7608bd33bea386cef60fb70b24a526ec3f914a2529572dba3e333
      ai-framework/scripts/orca-ledger.test.mts,"2e287dc27fc617085cb3d0867396fd6ca0d98c056e0a24d6167b73ddb2b9029f"
      ai-framework/scripts/orca-policy.mts,"60cd83f4c6b47e10eebe48b9a4b156e4a535c249652f3d2dc3258d8ecea1a569"
      ai-framework/scripts/orca-policy.test.mts,efecdef629d7e758cea86b2256c2ca10450e8b3feec704c5462928b5ae002f44
      ai-framework/scripts/orca-preflight.mts,"225837b18440d8ce273ee4c4edda1fbc0a8121523a74649cd51318cc9df2c948"
      ai-framework/scripts/orca-preflight.test.mts,"64d7548c38a5722b1386bf92533b8223944198b91025ca31c72783a22874d794"
      ai-framework/scripts/orca-reconcile.mts,"27e707fbf19796e650cc2cb1a84d4eb1c9ea114972f11e8dd7e245b209dcde5c"
      ai-framework/scripts/orca-reconcile.test.mts,"6007c462299b3ecbb30c05887a4fd3a3cfcbc595de145e88808b2354bc1ec9c6"
      ai-framework/scripts/orca-run.mts,"5c0e0b1fe0f530d23c037133a8ada8a4623ee87e337e587c1443fe7354ec6b74"
      ai-framework/scripts/orca-run.test.mts,"6c1da356ebacebb46a888d7c0893a00eadbf1c54d65435822e62364f5e0dd75f"
      ai-framework/scripts/orca-start.mts,"2dab69fed6ab26485bfded1face68a073cbe7fba7f1eb15e9c836188e7575ac3"
      ai-framework/scripts/orca-start.test.mts,"4e9be424f41695abde281336fbc8a9409fe8be8e8cbb0b50eaae2525062d9496"
      ai-framework/scripts/pitch-archive.mts,ff8bcc2ab1e404be5647bba6c4b0170cdc692615680b8cbd0832854252be02b5
      ai-framework/scripts/pitch-archive.test.mts,"5daa7edc577b9cc06e575850254d1922b19f5e25cd499d55153e249189b03eca"
      ai-framework/scripts/pitch-compress.mts,b65221150ec1bb998c393065d7f9f24c74e79f86752b7d6e9d5a337d347835fe
      ai-framework/scripts/pitch-compress.test.mts,"9b951cd36bbb9820aadaf251458aa4cc984e8d1331295cfa0efaf7f2273311dd"
      ai-framework/scripts/review-bench.mts,"02a4a38ff2811ae851b2d3f3248f1b1e2a197516f99ec259d491ea8441b9fead"
      ai-framework/scripts/review-bench.test.mts,"0cbf0dd552002ebd9cb651beafee114e146b06e22365138d8de0736b02ed04a3"
      ai-framework/scripts/run-tests.mts,"6b6202eef04a7337cf30b43e3b651635b7c2e3dc41335cd2f0010b5a6e4799a7"
      ai-framework/scripts/run-tests.test.mts,"1b585a4f2d2d8ad77f812c4293c9e39c20924af84752153428a0dc9cf9c8362c"
      ai-framework/scripts/runtime/README.md,"4beec211f68764c4a2b219aad3e50fa1a0bfe0e4bd3a31434da9d323d922de20"
      ai-framework/scripts/runtime/bun.mts,"489795f0d02a8d4091e13602a21ede6d0171760e1acdabaa4635f9cd84a2d5ec"
      ai-framework/scripts/runtime/cli.mts,e11c515cba0a95bdccf04572f32b3c952380ce711bd86ab36fc043ead18ae78d
      ai-framework/scripts/runtime/config.mts,"0f305a481661cac02b794f88be45f804956de857d7eebcdd7f4a7896a6962980"
      ai-framework/scripts/runtime/config.test.mts,"9201ce7e1817efb1f9fcc6de062d4f170202b1a8f4465b4d3723960881aac5b4"
      ai-framework/scripts/runtime/data-file.mts,"929d6240eb82a5efabbf3009d9f3fd0c5bb0612a928379b952aa9c82d17e1a75"
      ai-framework/scripts/runtime/data-file.test.mts,b431039c1793ceb7d99844ac6005bbc6802348d7a19eefd6a5ed7a56f5ffcf78
      ai-framework/scripts/runtime/entry.mts,"62edee638b130c9eaeb2126c30467928509e3eb73c1879403238ab1b8e25698e"
      ai-framework/scripts/runtime/entry.test.mts,"369aa62e6f5f20c141b05b75f4ca757a0d890252db942ffb8c5e2fb8678cccd0"
      ai-framework/scripts/runtime/env.mts,"6c6a09653c454bddb7a4b5c3769633eb087cb18b9bd904f0065f7ba03ba82c6e"
      ai-framework/scripts/runtime/invariants.test.mts,"232159017258e7e183d824725dfc68fdef8c31e92e01b9b4d0b79059e2db8bcd"
      ai-framework/scripts/runtime/migrate.mts,"617f10fdcd383f80330305b5057a90840ad8b4c42a4e18ab2c7f9044b0ec8c3e"
      ai-framework/scripts/runtime/migrate.test.mts,"9d8e84638c35ea3ad7fb8f4b8495c45000dc02c74965166c09c9c9d250a8f599"
      ai-framework/scripts/runtime/node.mts,"45c1551bbcbc52e63d54eaae9973bc28dd25628bd63797fd5757909102a4a2e8"
      ai-framework/scripts/runtime/oex-lock.mts,c324476014d7feb59452c50b17ec583450d140ae224cdc4cb6191d64a15f17dc
      ai-framework/scripts/runtime/runtime.test.mts,"1a6216d224eb259bc93b316453a7805a47fc1f412f7cba30fc9cdddecc8273c5"
      ai-framework/scripts/runtime/select.mts,c68e5af73849bc642305cc341392bba7dc4166f270f43f1a083f15dc3856f630
      ai-framework/scripts/runtime/semver-range.fixtures.json,"4c127de6e98037f31ccbc74461bfe97ed07dc471af893d7f16dc97cb220e30be"
      ai-framework/scripts/runtime/semver-range.mts,d06baa220e9a3a4646c9e97aadf39d4ac8e57cfe566614f3c54ab7af1fb8e80c
      ai-framework/scripts/runtime/semver-range.test.mts,eb164fc979e9a434e682ddd283db3696f02df677d8a4af139f23da4807a9e7c6
      ai-framework/scripts/runtime/test-helpers.mts,b87441e3dc5d1c223ac7db566afbe5ec367248b4a4f8285485c9bcdc5d85994e
      ai-framework/scripts/runtime/test-helpers.test.mts,a320f8e7c4ccdcc72f92527d93bcacee0fc2a2144d46dac43ff7400df22249c7
      ai-framework/scripts/runtime/toon-data.mts,"3c2c402934a07b7da5056d776d6fa39091182102479fed9a349bb27e1191012f"
      ai-framework/scripts/runtime/toon-data.test.mts,fbec4a02e85e04c7d6c2313e0d9aa4de133c306bc222ddba49f99c425dfbd60f
      ai-framework/scripts/runtime/types.mts,"29992cf482d689126b23633194750fa28a3bfaa6143d9f12045a5a78a7e6a0b2"
      ai-framework/scripts/runtime/upgrade.test.mts,"77153c81dae500255f9ad0adb922dbaec46de46953347d55d0d97ef69b34c66b"
      ai-framework/scripts/runtime/validate.mts,"65576f08658f62fee0d4742006e95db894bf248a4654418782b9a2be25afeb7b"
      ai-framework/scripts/runtime/validate.test.mts,"3576a389182adc50dc05794f6e78e6e6e095e48714f225b53c0090fad2cdd1cc"
      ai-framework/scripts/setup-validator.mts,"132ff8995b1403b7ec479532df71b39aa69b4a1a337a1102c3c0e41b3ffce321"
      ai-framework/scripts/setup-validator.test.mts,"66476d0a0301f33325623909ad510938b6bec2a7fdd82cb16e60d3fe35cacc2f"
      ai-framework/scripts/skill-compress-guard.mts,"60a9c252d6955a33206db67477995a17dec245c4101d7eed2ad9eb736bc6e46f"
      ai-framework/scripts/skill-compress-guard.test.mts,dce94212236ac8bdb5642a648561be36b4b7af2b72789195e546555e5f363466
      ai-framework/scripts/skill-defaults.mts,b0d1faaa4d8edf3a983ac1fc054ae39994a3687e94c1bfa11bc3e582811d1955
      ai-framework/scripts/skill-defaults.test.mts,a712181bb389e4540f3068fe4ef25a2bfd00c397ae4539798269f71aeab8115b
      ai-framework/scripts/skill-registry.mts,c88bc17b9a056febaa298a62f5aa1ac83b6af24e060acf49475b287e2342dcda
      ai-framework/scripts/skill-registry.test.mts,df1bfbade1cb60fdad59f7c7a84c8cc35982b0402ee1935e937ba8ee6af6135b
      ai-framework/scripts/skill-source.mts,bf71133a6af736463f3633a62a4e7450a99115902dab7db1dfcf3b6a778610b3
      ai-framework/scripts/skill-source.test.mts,daba16d72dbe246df0e8605e50e2c81367b3afa8aa3969922c88a866be937259
      ai-framework/scripts/skill-sync.mts,"7dad4f0c56fd583377aeb71cfaad3823f1e738532679edfc2b0d2b642375d4ca"
      ai-framework/scripts/skill-sync.test.mts,d3622471616a428c5ef5419ba0dc953db1a36036c286e556774a384345a561a9
      ai-framework/scripts/skill-vendors.mts,"013a987c9ae527176ff5248ab3c458c34c8026dae0dacbf2e54f3ecba7c460c5"
      ai-framework/scripts/skill-vendors.test.mts,ebdcc633fcc6bf0a2cde01eb1ea259bcf86339e97d132916dde5f8b80b19434f
      ai-framework/scripts/state-charts.mts,dfd6516c509c89a66289cffef0803648f5891ad222594bac1403d3cf9f07ee0f
      ai-framework/scripts/state-charts.test.mts,"22bd405f1d994cb6d40d6ceefe3acc669190c2a16a9c8685c73ee1f5c5a217f9"
      ai-framework/scripts/state-design.mts,d992a544bc7c2daad1fb17e13be8dce2e22011fba1d2893273a396234e3eedd0
      ai-framework/scripts/state-fragment-dataset.test.mts,"59c5e3e24f7b32508e6be3835e4dd3274f315e1804c09d34de85cdcad92ab1f8"
      ai-framework/scripts/state-fragment-evidence.mts,"50380b5e5a7a7e82f7a179f464f437774b2fc8df3f71935ee5a9de8792416eac"
      ai-framework/scripts/state-fragment-evidence.test.mts,"25e49ec95e07d372d759195208733caee1e29b3fc7afb31226c0a96b876cc3f9"
      ai-framework/scripts/state-fragment-inject.mts,"71269a3070c2d64b31ad6be90bc598068a634a4321f78a4aefe6e4b980ce861f"
      ai-framework/scripts/state-fragment-inject.test.mts,"0908d064fb22fc1478dea909a387c0c7f841c27db38b59680e4364aa2a4c0fff"
      ai-framework/scripts/state-fragment-parse.mts,"8df6055a80ecb0a4cdf4da254676ace9a3fe86d805ccf7a19f31eec956193d0b"
      ai-framework/scripts/state-fragment-parse.test.mts,"5147ef205f61142ea656a03db86f062e3c4a00a35735b68db7bc58d603cf53f0"
      ai-framework/scripts/state-fragment.mts,"78ecbed5fada3d219f4ab43f6daa1798dce6fe05e846e5fab3a1426c32b201a5"
      ai-framework/scripts/state-fragment.test.mts,"6f51958f27645d141d2fbd1d8f16fe5b42438533b57bad98b547fa8a8c04bc6f"
      ai-framework/scripts/state-graph.mts,cde9c5f7df0e3ce159e20a11565ec681945415955397ec2c8747fed9455c2d7b
      ai-framework/scripts/state-graph.test.mts,d3903429ebdaafea675bc68a5dc048cf05b5a1aa71b23bcadbd2769af498fd73
      ai-framework/scripts/state-history.mts,"64241c5e5fd03c29d6675f6c0ab3193d846612af3af997e673e93cf0a77e4ec2"
      ai-framework/scripts/state-history.test.mts,"01a504a8f75ced89af315b2b0bf187d0899a1924bc08153abc812f55e9d59991"
      ai-framework/scripts/state-html.test.mts,f539844e21b2d836cd7df8556acf20a1e130065ceacb79c607b804693214f872
      ai-framework/scripts/state-pages.mts,adcb50917171fbc4fc1ac01965d08a0003dba004a3eb41dac869baec0f802d08
      ai-framework/scripts/state-render.mts,b04c2383693502ce91cef1ee0b00b854e305384364bb6c5f3aa24126fdcc5b53
      ai-framework/scripts/state-snapshot.mts,"65aa3f9a06f683938a5f2709a56cc498a27cc139a2436db694b7e99cbb7f64ac"
      ai-framework/scripts/state-snapshot.test.mts,"5ace7d8a47089c2a38fbc7aad52591e3c3ec4a0d75c9abecccc5effab7c8baab"
      ai-framework/scripts/state-structure.mts,a2e60745aedf7923b94bc4e7a223cf12b3b1a2049cb84a82dbdf8a8b122b7d6b
      ai-framework/scripts/state-test-helpers.mts,"3d71a4358c3ca3b17a0f0fa54d878b6dd663dacf2d6c5d5a62673cf81e5373bc"
      ai-framework/scripts/state-theme.mts,"3e1f778d8046718768c63ad45af09870b617ddcd7cf1e19294a617d855885cc8"
      ai-framework/scripts/state-theme.test.mts,d3240c16c2ad631335b57b9124d278bcd32184a36256a39f29c91fc862110f51
      ai-framework/scripts/toon-convert.mts,"10e305aa561aa4136409aed61b954db1bcf278faf8a9e62aa953d3efe26cd5a9"
      ai-framework/scripts/toon-convert.test.mts,"537503e2455ad1da326978dae0f13974bfd4e07f55cfe684ed3470f4b3c17a58"
      ai-framework/scripts/workflow-contracts.test.mts,"5fe4477b8d32c84b7c5bb3d194bdec66e4e69f5ae1c03bece46754579dc933cd"
      ai-framework/scripts/workflow-doctor.mts,"54fc4f0203ffdd3a2bf8adb760b980d1fe73e3ebbf2f69fdae859818d7be161d"
      ai-framework/scripts/workflow-doctor.test.mts,"15f5b2e21ea5dd54b2c8b03d18674273cf40f9abc252e2b09027595811ab3223"
      ai-framework/scripts/workflow-metrics-report.mts,"98a28139b2e5fc4a965be5adc04331f677e4449668069af2d6dbbf2d298b8662"
      ai-framework/scripts/workflow-metrics-report.test.mts,"26b2c361577908cf42bc3b2150328bb0f98be18ec0558bb3db462434592b75af"
      ai-framework/scripts/workflow-metrics-state.mts,"445170d9a49119f9479d522e53ae9421d567ba7a57886c048cd289a261c7fedb"
      ai-framework/scripts/workflow-metrics-state.test.mts,"0b5914c1446aa7757d328679871d0e19195be7027ec55a72ba02e40b98b124f5"
      ai-framework/scripts/workflow-metrics.mts,"8ec0824f72cf45cd0c9565483250c51664136ed679defc6301eccfcf9268d35f"
      ai-framework/scripts/workflow-metrics.test.mts,"97857efe0bbdadbf3b52bc5af44de832ce0685e6bbb6c4fa57f188bc32962b7e"
      ai-framework/templates/ai-workflow.example.toon,dc41ce03805031b0b4b7e2aa7153d05525bc8eeae65fcbd4790effe0146981c4
      ai-framework/templates/ai_workflow_env.example.json,"98dbcb3a7b9da4a149e67cd26c8dc4e416e7b1a7dcb22ce09f728c7924850017"
      ai-framework/templates/project/analysis/README.md,"9116655c8f8d3e6dcbdc69fcd32319804724b18bb6fb52b82ca23cdce9dd5a90"
      ai-framework/templates/project/context/README.md,"5e76c38ea55af9925fc68548f7fad48373d241c0cd180943b29561ea725a91c9"
      ai-framework/templates/project/design/decisions/template.md,"53811f0820d81415253f2a4efe16fdb45227a8ed55f04527d1b59e0d92373ce5"
      ai-framework/templates/project/design/plans/rollback-template.md,a78158600a847a6840ee761e2481890b80bf8609084a92862fe805a1ed812cab
      ai-framework/templates/project/design/plans/template.md,d62d8649f6cb97dd3db9622f4f86492ff75037ff5afd0e216aa12a9953d16c90
      ai-framework/templates/project/design/template.md,d3482dc696b3893231b2cc6a54c7457784119fe9df4e8a4976464f9c15628196
      ai-framework/templates/project/design/wireframes/template.md,d3482dc696b3893231b2cc6a54c7457784119fe9df4e8a4976464f9c15628196
      ai-framework/templates/project/done-work.md,c721b6ec084de8a11a31b5fae753746888c127b85952a335a860ce100264465d
      ai-framework/templates/project/knowledge/README.md,"99e824eb8d955ffb4ee50b41fa0ea2501c42fce1749690eeab2c42385fe023d5"
      ai-framework/templates/project/knowledge/templates/decision.md,eb7b93ef148d3da5eec03c75a6de427cf9a648354bdd4b52da412929a8fefe88
      ai-framework/templates/project/knowledge/templates/entity.md,"15485085bf9faf8fa4a61545df7d795467dd28befe6dfd3910a6816ae0c3eae8"
      ai-framework/templates/project/knowledge/templates/issue.md,"9270185df6ff085341fab5905134651cd7e0a5d3679ccd604686149100dcc542"
      ai-framework/templates/project/knowledge/templates/pattern.md,"27621bfc41afc5c984fbc16d310b20715353b6df4dd8b36d82fd2ab3c97773aa"
      ai-framework/templates/project/pitches/_archive/.gitkeep,e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
      ai-framework/templates/project/pitches/_parked/.gitkeep,e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
      ai-framework/templates/project/pitches/_templates/hill.md,"6d728f73ff5b532ff6ef77949221a2dbe4f38a158b6d90985fb4c789530559dc"
      ai-framework/templates/project/pitches/_templates/pitch.md,eb927ca736585fec3e9afc14539582b5cb9b261e49085759b11f68bf01f8cada
      ai-framework/templates/project/pitches/_templates/plan.md,"64f750a6d2b90bd36c37daee3427e6183b61f4fb04d937a402f1db122e093b86"
      ai-framework/templates/project/reports/README.md,"6a09eb48c81bf1eae76b757230c20436a1a1709b45b7a071dcc5081b52766a2a"
      ai-framework/templates/project/requirements/bugs/template.md,"54f0dc660d2177883bedf8c02be5d6e368b2e1eeb6a5e597c1b2d20d39039f75"
      ai-framework/templates/project/requirements/features/template.md,"0207eec5f811c08b303783a65c697129a4c4a7f1cd803a9e8db06655e20ad5fc"
      ai-framework/templates/project/rules/README.md,e1f7f7c7cb05a750ee338a346987bd450e4e53630aec0690a2ba267d9cd5883a
      ai-framework/templates/project/runs/README.md,"11e2d6c91b7b1a3abad781f73017979a59d403a31bc608850cf7ffe32c99f0a6"
      ai-framework/templates/project/status.md,"317486b3922fd511b627e5d14b3c28b23b6da25d8950f9461f6f00e6e2f7d8ab"
      ai-framework/workflow/overview.md,"873bb51f966fef96b0c9970f36a35c3a7b74b6897c64095de318aad7d0b14301"
      ai-framework/workflow/phases/0-shape.md,"0837ca21f826f0e48a18070f574348c730081915f410ecb9bd95fccb2a1485b7"
      ai-framework/workflow/phases/1-plan.md,eb9c56adc6f045daf50c0ec6708a5ad4f2a609b6baed789f76c6b42d7d07ac54
      ai-framework/workflow/phases/2-build.md,d1f1a816bd653e7ab45a2703075eb50ebb2450e7a8015f336e6d4cd29137efab
      ai-framework/workflow/phases/3-audit.md,"067275df459da6fca94d083ec081076273043e98ce81f3cab9a1f1557b6a603d"
      ai-framework/workflow/phases/4-ship.md,a8685a3628670eeca49a29359eb6d3d8a9ed66250d1a5b472d7d103602899a9c
      ai-framework/workflow/phases/5-cooldown.md,"828633bec26df18363126a04e649f15e3f512014527030b8692f9f1a8b37a59f"
      ".project/status.md",e427b798c76d837566837baa52361b95cfcc3b3630815134c5bc2cca96d0b2ad
      ".project/context/stack.md","999ae0207160b3e6c28aba32873f40631a0693571e4e1d41a804d20c0e70b0d9"
      ".project/pitches/connected-memory-consolidation/plan.md","259de12cf95ab9c0ad68c518824338610375a21e3c1451e5e06ddda0c3d0509f"
      ".project/pitches/connected-memory-consolidation/deviations.md",b37e078c68496b77876dcdea95d716fea2df6be976a3b208601ef3638d53f34a
      ".project/pitches/connected-memory-consolidation/closing-exceptions.approved.toon",aaa288e412348c12222072613543c0a606645618335a87a3d347a0a393a5d92a
      ".project/pitches/workflow-v3-rollout/pitch.md",eba3bf397244c34e26b68e4fe7fadc4929fa4a160979ea40ed2fe3c558a7cb83
      ".project/pitches/package-less-ship-verification/pitch.md",ea689efee7916d4392e9f1b0750fc0e1844c1f527387bbf05c894e8ed59b47b2
      ".project/pitches/orca-bounded-control-receipts/pitch.md",e1cca59fa538576cb37f47b76d756bb640274e2badc3e6d34e41e5eb88930e14
      ".project/pitches/fix-retired-live-evidence-path/log.md",a69f0a38e643e70f2ce1357a3a2232cdffb711c5172b3954cc4d45b13f5f7c44
      ".project/pitches/fix-retired-live-evidence-path/source-proof.toon","38ead5dcdf39d369ce237443e8aae327cd4b514eda4f4100d0a17ed63def4704"
      ".project/records/legacy-upgrades/state-ai-authoring-live-runs.md","868e76e9eace40c14f8014e18a16a8fa5b702de13e5489ebcc29c4e7944fc24a"
    canary:
      file: ai-framework/scripts/legacy-upgrade.mts
      line: 270
      findSha256: "4444b3ee24266e245818511d5bb41a3321b7371467178969a99159f6abb6dee6"
      replaceSha256: b0fea39dcfc16790dcb56eebfaceee45022a9a3c9aabc28b43e67608bb2161d6
    testCommand[3]: node,"--test",ai-framework/scripts/legacy-upgrade.test.mts
    baselinePassed: true
    canaryBreaksTests: true
  repair:
    files[430]{path,sha256}:
      ai-framework/scripts/consolidation-migrate.mts,"8374daab56cac02d3bac575fe2191e8b332ee96860aa18a7910e268f4bfd74f6"
      ai-framework/scripts/consolidation-migrate.test.mts,c35da87119b5eb3cda0c000e31c96d220a86ca7dce1ccf7fe5d0d2449f697ab7
      ai-framework/scripts/done-work-index.mts,c31dabc332164f6faf4b8e143101b8ffd0065554fb322c8726b1cf7bc387fb2e
      ai-framework/scripts/done-work-index.test.mts,c5512956180a4be121c15b21098c1a560f09e0dfc03f51ee3006b60be41237b2
      ai-framework/scripts/graphify-refs.mts,b3d816aa913e16da3d50069cd310a92f83dd3790267d092e9d9e54f6d9f9ceba
      ai-framework/scripts/graphify-refs.test.mts,"24de7ac954d6d1ffe17de8e028444b9a6dab14f11c030350d1b3871179c3bb3e"
      ai-framework/scripts/graphify-relations.mts,"188a05a38c3aeb28dff9584d3915ce59436bb13e465630fbbd1181f21f20614e"
      ai-framework/scripts/graphify-relations.test.mts,"19dc94408c46fe6be23fc62b410bd6be8cdc235ee8b94512416d7e57ba435c70"
      ai-framework/scripts/installed-upgrade.test.mts,"8abf9eea79de9e02025fa710d94a0886da98b6a2725cd1c88c21c3c5b796367b"
      ai-framework/scripts/ledger-schema.mts,f3166ed20310c110b53fc2c26d2d55b06acafba4e592eb9124e2f158de54cf01
      ai-framework/scripts/ledger-schema.test.mts,b9a14c9c0cf5ffe3eb04c53f5b8ac23bfecf9b0459a64eeadb7706cef115a161
      ai-framework/scripts/legacy-upgrade.mts,"252a77e0bf0e926a812ac082774c4ea09e675716e3125cb4acba3d4a8236a95e"
      ai-framework/scripts/legacy-upgrade.test.mts,ab7788e9c067f6301f241765cca4cc42e229593094da681406634fb8fc3d8b94
      ai-framework/scripts/outcome-record.mts,bd5db227978b2e22c4b8842732cef663829fa0f191e6a786f2029a4cdcbe0524
      ai-framework/scripts/outcome-record.test.mts,"250a6c1e871cdb2332ca8c64ec0733aebad5535880f881786b35db0be5ad1d5a"
      ai-framework/templates/project/records/shipped/.gitkeep,e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
      ai-framework/templates/project/records/shipped/_template.md,c1d60dfa0eada8f2eeb3c317ea3dd0173b0b6bfc5695c99ec09273ce5fa90e59
      ai-framework/workflow/relations.toon,"1b9c854a1b0ada6eb7eede64571065213a035fa270fa45e9bbc32ab31acb896c"
      ".agents/skills/add-skill/SKILL.md",d7837a88324d9893b33da31c1488e7c70d8ce259f7c0e4a92ba73af5b7c18383
      ".agents/skills/audit/SKILL.md","32d867694d321cd0393e17d8cfa4245c7da6e205c61bac9732920f98c8c8cfc4"
      ".agents/skills/build/SKILL.md","22595bb21aeb07b260c7b8af5d082516d9367be95959b0d0d4d46416ccf0fd08"
      ".agents/skills/bundle-sync/SKILL.md",c0c161afa4744901449ad01a0d4563c9072db3abf16c8e4656b9fa0aeb2f1f32
      ".agents/skills/changelog/SKILL.md",d7d73123e3ffdfc65bffc53eb4f4b793e6b73684f2dd674ab409375491d06fd7
      ".agents/skills/checkpoint/SKILL.md","96556aedde6a13aa5fb77e064736cca30a1ab8f92e7be250a89bf17019368a76"
      ".agents/skills/cooldown/SKILL.md","3bc26b12ced53b161132efdaf651054ecce4e48a4090dcb0e476480260c43755"
      ".agents/skills/critique/SKILL.md","11c21a8556ab25f4afb115f8a14bb452955f63e05388074aec89ab8d6fc9bbf8"
      ".agents/skills/dependency-security/SKILL.md",e4c1f4cdb80ed3c38f67d3dc53d31c5fb038754fb4b1a01dcc040c403ab513e6
      ".agents/skills/eval-harness/SKILL.md","7dc9cab1549371b2b66f0f20b1e42e849deb28966e2457f1a69758af38a0c2b6"
      ".agents/skills/fix/SKILL.md","5e2fe2aec889f5bbe6ae7cedf8fa494734e29a5f2b8a70d73f38cb40006ff16f"
      ".agents/skills/impact/SKILL.md","938be82e10cfa944f000efc59a16074f731e35a252fc6a01b0fd3b4c172fbbd8"
      ".agents/skills/knowledge-health/SKILL.md","427b596f307332471287f33827a3663fa645c9772acd81feb3e5ea4f79e41339"
      ".agents/skills/pitch-compress/SKILL.md","3f15f6ee79fbc21807dd1ae81151b0c64294d42a151af34663ae65222dcb3dc1"
      ".agents/skills/plan/SKILL.md","123c4edf8cc16034b151526cd004c73ff9cf889ed2dd68a7f6317fc32ad266be"
      ".agents/skills/resume/SKILL.md","9f79d5026375dffbb792a8ab1e8c036f971fca0dadcc07870d87bf99df652615"
      ".agents/skills/search/SKILL.md","5e18fe9870171d720bd4626230a38a8cf33283337369318a16b84f653eef2b41"
      ".agents/skills/setup-validator/SKILL.md",cbc5acbfbd37c681cf03ee4b4e8a5904ad82ca9699661dfd5d87dad655b3f7bb
      ".agents/skills/setup/SKILL.md",bfdaeb0013c1bf50279c5788045f19f9766f0124afdb1b467af7d96c7b513d48
      ".agents/skills/shape-lite/SKILL.md","8db611a176e4aa8bce689cb69c5a4744be840a8cee8337c51de51bf06009d5d0"
      ".agents/skills/shape/SKILL.md","997e8ffca9913d7750cc2220380d1daaee781c80a72641b24ac5d297d0bb96de"
      ".agents/skills/ship/SKILL.md",ab3169550c59630fcd76ba82ef7d6a8d4585469d00a237c8edb6d5cc10f84240
      ".agents/skills/state/SKILL.md","5826d2916847ad938ece309158a36daf173ea9b5f3cf895b3ee0cb0e7f14cd20"
      ".agents/skills/switch/SKILL.md","96fb35be2e5f0df6beb3108aeb6891efa8907d5b43404112c8a3374e4b75a0a5"
      ".agents/skills/sync/SKILL.md",b5dc6bc484d7f2bdc89c42dc6b55ddf167c41bbc0ca64888215f21247ad23d19
      ".agents/skills/test-strategy/SKILL.md","22f0c4819c70efb45ad4d46dd7e86b5868e34466bc8ae3d1d41b62ce5f1e3787"
      ".agents/skills/ui-design/SKILL.md","02c16453c5bea27aa35e38099159b5437e2de053a722546385f0f8658ac99e8e"
      ".agents/skills/workflow-doctor/SKILL.md",ec23c3cddbaf405e4b233e28d44d2b0be1e83fc54ef956c19612da565ce60b58
      ".claude/agents/appetite-auditor.md","8eefe2784aa5abe39451f0cf3e62f5547e2f3be6371a365542d0bd42e6776dd3"
      ".claude/agents/architect.md","946d7b59066d8bdf600427f9178ba82418c8e552c01e6a2cbabedd312774f03a"
      ".claude/agents/build-error-resolver.md","46f47d4b31ad0e42923f4133a4c9732ca470348d8e3878ef82355647a8446fd5"
      ".claude/agents/code-reviewer.md","66e01142e0a10ce05e03a117d210181346e4b12e6ea20c0adf9625983151e8aa"
      ".claude/agents/cross-pitch-conflict-checker.md",e7730afa362b81ddcdd6e6d2c70b7b2971020ab59e1f0b80f8c9707a3f91727e
      ".claude/agents/cross-pitch-projector.md",abde0dbeb4996ba4711e6691c7d0eb6bdb8afb8f5ffd6c22bcc9747328cea484
      ".claude/agents/eval-regression-projector.md",bd18787da6bda83fec81f2776511d85045bf9e35d320d9f7f4a9240f59115092
      ".claude/agents/eval-runner.md",cfea69c7b1e5aedc7d351cfa770f065d7289022973cb66d13b183ad3802ff2d9
      ".claude/agents/i18n-checker.md","906c3cda8a507fedce3f0e1f13d96bc7ce8684173af0c457cec67e6003fbf250"
      ".claude/agents/knowledge-historian.md",df0db5fbbf9bcc9cc1eb54c4b0a877c7974a45f24393d56274a8996d2672acec
      ".claude/agents/planner.md","400e2223c32cdfdb856a21f276f63e19f634a57eb7203e3cd6ce23e425d6327a"
      ".claude/agents/refactor-cleaner.md",fd309d0a7dd9e8c096d7b8eb6deef8ee33c88a48df5a65e0bd0f2b8b7a7b72da
      ".claude/agents/security-reviewer.md","47447823a6a9e15b8ca65707847e7c98f2609d3872fade369d6899cec770e2d2"
      ".claude/agents/skeptic.md","2d35896e104c4757552fa4c5fa974c6728bae32ab66b26635f0f76283997cba9"
      ".claude/agents/test-coverage-checker.md",b0e3bcff229aa21b76b21932ac65335f3aea7e7d22c31d2421766c82f1faf08c
      ".claude/agents/ux-reviewer.md","08667ce6bf0d9624993bdc74fc2174a748853dee82fb0ac8530eb93a6deec03c"
      ".claude/skills/add-skill/SKILL.md","22e4c0f23b6ac18b6db19d81e9201f4ef8125728c4a3b1ad38ea7451b3a8d378"
      ".claude/skills/audit/SKILL.md","9e5f8eaff3076142e40d8e93503ab9d8a2762a187a341f2ed969b97fba049768"
      ".claude/skills/build/SKILL.md","6662d53b595604b84c39530190825667161b788d24df895c6415c82b4d994b0e"
      ".claude/skills/bundle-sync/SKILL.md","84e22bd6bdd331184c9c4e69f6702fc321937b640e8b7e0502f167bf8a4ec611"
      ".claude/skills/changelog/SKILL.md","521942ea8e70e925d6605de021bfbc894979430b798ab03c29c4b690108c1a32"
      ".claude/skills/checkpoint/SKILL.md","6dfd0aae2385b6ad32e82327318e56c75008385841eb2356fa843be3738c39ad"
      ".claude/skills/cooldown/SKILL.md",cfff5c90e9d90b4e5a26819c90a09e8763f3d88f5ea56f117d472105db2a4906
      ".claude/skills/critique/SKILL.md","8b236983598ac5f71387bb847baa369ba5e8ab17a6cd2f67ebf7ac33c86341c9"
      ".claude/skills/dependency-security/SKILL.md","02a6b95ad3f32f2794312f292bdb45f7afda53980167717344915c2112f13436"
      ".claude/skills/eval-harness/SKILL.md",d0b39faf3168f74de06e85d6a7047dc2e297d1bae728fe23627b54b6cf1eedca
      ".claude/skills/fix/SKILL.md","25a7a4016e8b78a3f7d681759110258adae018ea6f347196242462eb11530033"
      ".claude/skills/impact/SKILL.md",bb717630ba8ae5405b3679e17560d6767ab819df8546f8c717fcbcdc2b9e715c
      ".claude/skills/knowledge-health/SKILL.md","316cf25633a0487ba9326420ebb9b0ac509f4bef67bff6c77a3cf38c4ca3a26a"
      ".claude/skills/pitch-compress/SKILL.md",ea0ed82369db405bc787818eb303eeb6e74fed9ace4020baee74481eed0e4343
      ".claude/skills/plan/SKILL.md","0df576503246063397d86755d16b01c57a8b0ccbd4bf47920892ca8413b06070"
      ".claude/skills/resume/SKILL.md",cf880065b8deb14115915d0901d913c9715b0e602131d4a1562d836e32e5d771
      ".claude/skills/search/SKILL.md","23143001d0c245a6d55b62785ca821f069e2ac19a312e509568e4317f5922902"
      ".claude/skills/setup-validator/SKILL.md","8ece5995655d6576644cd586d8d4838f94a033c4d23cc70c3bc34ade1add7e13"
      ".claude/skills/setup/SKILL.md",adc701890439fdf8d0b0817c3282dec963fae7e8aaf65581093de5f9e6c36fc4
      ".claude/skills/shape-lite/SKILL.md","3a3cf74cd8ea694b11af10c94a4cb621b4465e22d454be5ea0635900ded44901"
      ".claude/skills/shape/SKILL.md",a2aa0fdb7f2eb3f929b771e9739dbc6380a54d4bff957e5aa964326b8a9aa11e
      ".claude/skills/ship/SKILL.md",aea1057d0dcd303da4d4fb98492726ce65b605f3462ad569cc52ac517b141f69
      ".claude/skills/state/SKILL.md","531c1c02b8e4712455eb1041e99dcd488a1f588d3673b0aee671cc80555deab1"
      ".claude/skills/switch/SKILL.md",f188b1e0a68430c9be5201b223c927367dd5ed930a0cb24662ad4f297215d74e
      ".claude/skills/sync/SKILL.md","1b1436c0edd3df80e54825f7cbd05f2fd1649beb23c9000d84152e089db3f206"
      ".claude/skills/test-strategy/SKILL.md","077ddf11f6b9851d715a528b51062c3cb4bf3f9b834a5fd5bee0fbf180138ab1"
      ".claude/skills/ui-design/SKILL.md",b49b04f982e1869c2e6dc0e0c9dd361cc99633a5769905dc3e92bdad3b4d94fe
      ".claude/skills/workflow-doctor/SKILL.md",c80f03e8a893eb37e51ca8b16961ac4cf2cc5e3bbf33a207f758790d40c48116
      ".codex/agents/appetite-auditor.toml","950d04aa91809e1f271fd4161def233e2af6cc381f0b3d24a1385b0adee06674"
      ".codex/agents/architect.toml","5c7268383d8d443e5426d197674a308d31b26bbb71bad9d83fbc5d1fa66f53f1"
      ".codex/agents/build-error-resolver.toml",a7166d2de56ac842a4c3a362df329e7b5a0387ac7f15db29a090493afadce997
      ".codex/agents/code-reviewer.toml","3c379b174dfca92bcbda008e61263a758ad48922e3bf7ba70d532e4637fd6eeb"
      ".codex/agents/cross-pitch-conflict-checker.toml","24af3aebd95784bb070de363adbbfddc553b4ff899b30b023fa85dd47cd510ac"
      ".codex/agents/cross-pitch-projector.toml","0d93072027c5325becbee585659ce3875662a92d085960d82b30bf4e97029ff2"
      ".codex/agents/eval-regression-projector.toml","02937025ec7da86f92f736d0649ab68ca2e495a2d83b850de289347a4ffa9d76"
      ".codex/agents/eval-runner.toml",dd5f532db6ebf0ca3e3e10b0ee80ab846b8c2f308c589d71bb191e24f702f7fb
      ".codex/agents/i18n-checker.toml",d8af2b2e17ea0180f613b3993132b55cfefe29fff03bea47b5fe1a4a8d9f78f9
      ".codex/agents/knowledge-historian.toml","7353de3fce2134043bce9394f9babb2b7ed87d9cf45486d8a60acccead569248"
      ".codex/agents/planner.toml",afbcacc2e157d89bb225173118d56f26b28209d118555a65549f69a7e3d4e7b4
      ".codex/agents/refactor-cleaner.toml",a56771324bf3eb9307feaa5aab560171de5edc7b8e4c918882a389520452aa81
      ".codex/agents/security-reviewer.toml","824ab52cf562da785219195aced4b87c820b79d8c18280a8c518dad9e44cb6ba"
      ".codex/agents/skeptic.toml","98fba04902c641565ba9c1fb5b00c472bf2249d4f37c03d2318e8c9218255a05"
      ".codex/agents/test-coverage-checker.toml",d61fab07a844c551bbc5fb82befadf97523532f6c84b065f2c9c0f7446586fb2
      ".codex/agents/ux-reviewer.toml",b19e62df117ed879d75b166c9ad8ac85a63c776c21aea200ed687eff2a654d29
      ".cursor/skills/add-skill/SKILL.md","22e4c0f23b6ac18b6db19d81e9201f4ef8125728c4a3b1ad38ea7451b3a8d378"
      ".cursor/skills/audit/SKILL.md","9e5f8eaff3076142e40d8e93503ab9d8a2762a187a341f2ed969b97fba049768"
      ".cursor/skills/build/SKILL.md","6662d53b595604b84c39530190825667161b788d24df895c6415c82b4d994b0e"
      ".cursor/skills/bundle-sync/SKILL.md","84e22bd6bdd331184c9c4e69f6702fc321937b640e8b7e0502f167bf8a4ec611"
      ".cursor/skills/changelog/SKILL.md","521942ea8e70e925d6605de021bfbc894979430b798ab03c29c4b690108c1a32"
      ".cursor/skills/checkpoint/SKILL.md","6dfd0aae2385b6ad32e82327318e56c75008385841eb2356fa843be3738c39ad"
      ".cursor/skills/cooldown/SKILL.md",cfff5c90e9d90b4e5a26819c90a09e8763f3d88f5ea56f117d472105db2a4906
      ".cursor/skills/critique/SKILL.md","8b236983598ac5f71387bb847baa369ba5e8ab17a6cd2f67ebf7ac33c86341c9"
      ".cursor/skills/dependency-security/SKILL.md","02a6b95ad3f32f2794312f292bdb45f7afda53980167717344915c2112f13436"
      ".cursor/skills/eval-harness/SKILL.md",d0b39faf3168f74de06e85d6a7047dc2e297d1bae728fe23627b54b6cf1eedca
      ".cursor/skills/fix/SKILL.md","25a7a4016e8b78a3f7d681759110258adae018ea6f347196242462eb11530033"
      ".cursor/skills/impact/SKILL.md",bb717630ba8ae5405b3679e17560d6767ab819df8546f8c717fcbcdc2b9e715c
      ".cursor/skills/knowledge-health/SKILL.md","316cf25633a0487ba9326420ebb9b0ac509f4bef67bff6c77a3cf38c4ca3a26a"
      ".cursor/skills/pitch-compress/SKILL.md",ea0ed82369db405bc787818eb303eeb6e74fed9ace4020baee74481eed0e4343
      ".cursor/skills/plan/SKILL.md","0df576503246063397d86755d16b01c57a8b0ccbd4bf47920892ca8413b06070"
      ".cursor/skills/resume/SKILL.md",cf880065b8deb14115915d0901d913c9715b0e602131d4a1562d836e32e5d771
      ".cursor/skills/search/SKILL.md","23143001d0c245a6d55b62785ca821f069e2ac19a312e509568e4317f5922902"
      ".cursor/skills/setup-validator/SKILL.md","8ece5995655d6576644cd586d8d4838f94a033c4d23cc70c3bc34ade1add7e13"
      ".cursor/skills/setup/SKILL.md",adc701890439fdf8d0b0817c3282dec963fae7e8aaf65581093de5f9e6c36fc4
      ".cursor/skills/shape-lite/SKILL.md","3a3cf74cd8ea694b11af10c94a4cb621b4465e22d454be5ea0635900ded44901"
      ".cursor/skills/shape/SKILL.md",a2aa0fdb7f2eb3f929b771e9739dbc6380a54d4bff957e5aa964326b8a9aa11e
      ".cursor/skills/ship/SKILL.md",aea1057d0dcd303da4d4fb98492726ce65b605f3462ad569cc52ac517b141f69
      ".cursor/skills/state/SKILL.md","531c1c02b8e4712455eb1041e99dcd488a1f588d3673b0aee671cc80555deab1"
      ".cursor/skills/switch/SKILL.md",f188b1e0a68430c9be5201b223c927367dd5ed930a0cb24662ad4f297215d74e
      ".cursor/skills/sync/SKILL.md","1b1436c0edd3df80e54825f7cbd05f2fd1649beb23c9000d84152e089db3f206"
      ".cursor/skills/test-strategy/SKILL.md","077ddf11f6b9851d715a528b51062c3cb4bf3f9b834a5fd5bee0fbf180138ab1"
      ".cursor/skills/ui-design/SKILL.md",b49b04f982e1869c2e6dc0e0c9dd361cc99633a5769905dc3e92bdad3b4d94fe
      ".cursor/skills/workflow-doctor/SKILL.md",c80f03e8a893eb37e51ca8b16961ac4cf2cc5e3bbf33a207f758790d40c48116
      ".gitignore","6b3798fef1a85f421f9564c35574dadfe7a6dde8e98c5d585566081e64c99bc0"
      ".graphifyignore",ac41f08adb3b692d4c61d68cd51e1e878b3d33fb6dadf19e36a8e1f644a57771
      ".opencode/agents/appetite-auditor.md","6067c968c076d1557bf53e539aa56cad16d9eba9b3dc91d6b8b95c6bc90a73b9"
      ".opencode/agents/architect.md",a7a75598b94225f54361631692f8e3be28797fe8731bdd9dd8009afc494a7656
      ".opencode/agents/build-error-resolver.md","3c4bf7b9b2b2b4cde6aca86250ed2555a08e59ca2ec13b901baf219f4af1dea9"
      ".opencode/agents/code-reviewer.md","4b6b95d64769f432c9291f4523fc4522fcb5cc2d08374a74765b806d693f53ba"
      ".opencode/agents/cross-pitch-conflict-checker.md",f3523bd36501b3608538950dd48a66a644aefe2202eefd5f82ad8d7b5cfdbbf2
      ".opencode/agents/cross-pitch-projector.md","05d3000704c89550343a1122d122413c5fd05dbf45d59c4ae7008a27840aef2b"
      ".opencode/agents/eval-regression-projector.md","6a05af0ff60fc3abcd6e1c230a939e18545b729e5a3bd5bfb8254d9f806728f4"
      ".opencode/agents/eval-runner.md",edf8c488ab98d58beeab95232f0a8c1e2c44f93ab09cf07d25b467fae2e887bb
      ".opencode/agents/i18n-checker.md","76c389a7d9169320935a24ca220ea89bb322ff79ff8f028b3cf5014cf0ebb22b"
      ".opencode/agents/knowledge-historian.md","78decb1d8fffe8db93a067a889253d25089009cc2e94753dd23c2ebeb81ca6ca"
      ".opencode/agents/planner.md","4593b7f3308081e1acfcb26b8c5dc92377e0440e2c0e1bba428ff597c2fdffdd"
      ".opencode/agents/refactor-cleaner.md","0187f37319a323c67ebc5268429cbb414f4250f9bf48765940c2987e1e3d546d"
      ".opencode/agents/security-reviewer.md",df8da747d2e84db26c5d2d68740c696c5c151c62e220f864ed8faab7606fec8f
      ".opencode/agents/skeptic.md",bd8114fc3a698beabfaabbca4101d8ac857841b6545d3de286fb56113d21c44e
      ".opencode/agents/test-coverage-checker.md",c638436a5fc9613c1e2264af2d79340c060d45318100eda91c4fc7d052b505e1
      ".opencode/agents/ux-reviewer.md",e1746aebefb0fdaf9e018dab630c3b02fab47abf9f98991e786080588b361c99
      ".opencode/commands/add-skill.md",a24a853b7cfd2648bc3c6c7e5faceb503367a41125546706dc2e5c1a58eaefa0
      ".opencode/commands/audit.md","3e1d85c40b6ea6c9affc8abdc69b5a881824144d30f76899f62aabbafd6c9632"
      ".opencode/commands/build.md","161f807562f1303fd47e46a9fd1e78d477cb0195e53d750fbb6c729b2fc7b9ed"
      ".opencode/commands/bundle-sync.md","4027c20d5bc08abc8d266eb680535984cebb21e49b365cefd4416ee869687c3f"
      ".opencode/commands/changelog.md","28e390fc6fe6abcc2ea11b9118925b96dfd04d55d266499d1b2db84c6808bf83"
      ".opencode/commands/checkpoint.md","35cbbe83dfb2d5a2b1dda2a755f96362bb0e5e92fba60cc19af464d7b967f51e"
      ".opencode/commands/cooldown.md",e03ff5f42597a08f31d57c2f7394404b6e90b91ea0d6f73d649af3c8b45e3e97
      ".opencode/commands/critique.md",b49ad5e6d69541594a3368923f0031ffe9a148862ee34cc75ea18da013d36cc4
      ".opencode/commands/dependency-security.md","6222354d4bc3a9d52b0e0f4e036c6c2e7712ec609b2b6bed19a3fa9fb358c7ff"
      ".opencode/commands/eval-harness.md",f5af146facb0ffb883a2747abcd315e59c13280e81a7e7c2cf5680f9a01211fc
      ".opencode/commands/fix.md",d878f6ca6b857e220cab43eeb2aa518c28cca99a099c1fe9aa4598b32e6a6d76
      ".opencode/commands/impact.md",f068a208d34bc0ffed2926c61eb1a0c2f4e39d524898ff34c2a46535405991da
      ".opencode/commands/knowledge-health.md","47bf002b60af30a0792015c940b7fd469a5d182f6919788174762072ce009c15"
      ".opencode/commands/pitch-compress.md","840e1c204edf6d9b480f627742a7cf28bbe3eb587239dee529396f943d36bfaa"
      ".opencode/commands/plan.md",f5663a94fe039dc833ea7ccf34cf219e18e5b3bd30cd5bf7735e132c31f789f2
      ".opencode/commands/resume.md","23cd3ebf64dcbbc4c5d85b7bbd7cf1168e33c41a7506e17d13d3e923ef33efaa"
      ".opencode/commands/search.md","8c5d195c865f7f5f3e7b85f94134e8fb3d693ad136cd43c3e98804495a430957"
      ".opencode/commands/setup-validator.md",f91b775bfdc4a5ce9c0e9ed72f112aae4d419d2de07b04aeff2fe0cf02ef91ec
      ".opencode/commands/setup.md","1f0112b7797923d620a08020802fa6e702b79a34051a393abcfd674de2d56b72"
      ".opencode/commands/shape-lite.md",a62d2cce2677a5d29cc0bdefc1034dab7d560e9e33b73d9a9464cb1c71787b0e
      ".opencode/commands/shape.md",a9c091ed89541016e40502a8458e83da5d8dfce072a6e04d8c787afbf301069b
      ".opencode/commands/ship.md","0c854ecb8a070072dd97d30e90cbc5fee3c90ae756dc11467ba4f1a108ac69a8"
      ".opencode/commands/state.md","6d860a5ee9bcc56943462b62e37e858cc09430fabf89f2324c98578a2794a419"
      ".opencode/commands/switch.md","6d8565bf8f0b85fbc241cb3de0e389abec959bffb796e84e58678496f26e979d"
      ".opencode/commands/sync.md","814817fd48af767c8b75b0a89e17970048d4fd02d59f1ad71a326758fc505886"
      ".opencode/commands/test-strategy.md",da062c2b25400b88e5d218e9b500b2a9c6a3502a3c02091a10420536597c7bdd
      ".opencode/commands/ui-design.md","9f903532327b2af84c6e45f66ad4df50bca414c16d6c2ba6fef18161cda73e6a"
      ".opencode/commands/workflow-doctor.md",b511e97fa072cb1619d8e2b0c5c100172d1b59d5bd8cbf67c63be21d8c505fa5
      AGENTS.md,feb32484e13a3e18f30d3add7b4a99b676fcf8943ef3a6eaf6c1cf0b7f8fe99d
      CHANGELOG.md,da26e3d2b1714bbfa20f3778f21bafae3575aa7bf5dcfd453bff8343cff8047c
      CLAUDE.md,feb32484e13a3e18f30d3add7b4a99b676fcf8943ef3a6eaf6c1cf0b7f8fe99d
      README.md,"8b7cf7992df6b7c5401c418f8b87a8efdd0aa0399c046b12c34b7e27c3b9804b"
      SETUP.md,c1e234187bd02dc51bf42662ba6a41d6ae57595d5529301d3ecae36c57f8817f
      VERSION,"9bd51d4120f0ac96a8e2e9f9a3e68e8175db7659324704ba2306aa682dffec33"
      ai-framework/docs/design-notes.md,f4141e7d74b56f20e8e2deec14eb19baf5dbe233b925183025b9ebb5c848f54b
      ai-framework/docs/extending.md,"935499627ae1c09fe618f9c8736e66b3df6aebed4ce14206448e283949c7588c"
      ai-framework/docs/knowledge-graph.md,"6a98e9fbf1fe90fdfd712504403ac3faf2e7e29bf7ecbbfb80fb18f74b83ce1e"
      ai-framework/docs/pipeline.md,da7eb210d0263bf82b2a3f4de8046a5fe396623a7006aefc748dc09b2067942b
      ai-framework/docs/setup-validator.md,a616b2971976374fb0987ac53d0ec5cb641a39260b194db2b0a2125f1501302a
      ai-framework/docs/setup.md,"9792b1079b82f19e46ae3338cb01b2eb55823394cffc69ceda5aaa157f1c11ec"
      ai-framework/docs/testing.md,"2c6d49b64898f9b30250f07fa55ab7de29c4b5702733280595e304a0e209ef95"
      ai-framework/docs/token-consumption.md,c3c0b442989f000c323e851044f10c26b5c9bf065546d7734eff4bd0249132cc
      ai-framework/docs/vendors.md,"144911290b522d3ac1356d6d7f3de538a7fd0ed2b4fdac8b6cf609827b5d458e"
      ai-framework/docs/versioning-and-sync.md,"6993335e25990ee864d5050b8dad9e15544813c6ae4cb1ef3eff89f3e9f53e5d"
      ai-framework/docs/what-you-get.md,"7cb906b4029ce8d6b8231c60f88ec3d6ac22cd61db77728939b1262a730c0c7b"
      ai-framework/docs/workflow-doctor.md,"2a435ab9db182c9e251775e4961210db2b93e4bf2ecf50d7b183bacb79cf0b2d"
      ai-framework/hooks/hooks.json,a043f76bffe935b69ffcde83f8ee411ac0c8db390bf1e0b5ca0a515481aeb738
      ai-framework/hooks/scripts/metrics-lock.mts,"3735953435a9335c986077b676249ce84eb4c700c47842490a17738fbdc302aa"
      ai-framework/hooks/scripts/metrics-lock.test.mts,"64e98bcad00c630660891a4c337ae6f93871266ad2bd380ff7fc97cd0c7c0ce7"
      ai-framework/hooks/scripts/opencode-plugin.test.mts,f8c3cc0155dd27a1d15edc3a8eac8673625d4e974407dd9a670d64a7f6329323
      ai-framework/hooks/scripts/orca-start-codex-hook.mts,"04d1db5cbabd8a2d92c74ace3c4ed18aecbd86aa5e0d82c1ec5983d878bec9a5"
      ai-framework/hooks/scripts/orca-start-codex-hook.test.mts,"23b7dd3444ab20ece59faaa0e6ef9aaa8324c8c6afe46be288d241036a2feb06"
      ai-framework/hooks/scripts/orca-start-hook.mts,"37908c66cd1044e2e1b9b84c88819d495d1c8c2d7c1de18e8485700e0922babc"
      ai-framework/hooks/scripts/orca-start-hook.test.mts,"5f08b7a54a819b2aba16a6443110020d50e2c73c54eaa7a32738bc3dadb2c83e"
      ai-framework/hooks/scripts/pre-ship-verify.mts,bb32bd2d5885a9589c0e2ae2247dfc4db7d7ec5a891e4548e752aabd9e877e95
      ai-framework/hooks/scripts/pre-ship-verify.test.mts,d2fb5a3c8fc8ffc4beabe8ef6f7a8b1335f6fe6dc0f6ce35cba98a8e4d7c3ca9
      ai-framework/hooks/scripts/stuck-uphill-detector.mts,e3eea81bca629bd8ed4a4c6fdafd1c132b6e210814c64ca1a8b4dc7afd0807bb
      ai-framework/hooks/scripts/stuck-uphill-detector.test.mts,"555391b2434a5c7b990b50c9f0f44706f538fd65403c8c0421b2dc6f266dba70"
      ai-framework/hooks/scripts/token-consumption.mts,"59019aab893efd99e20ef3a909096811f5cd05c73d1a7444db32e6e9070b260c"
      ai-framework/hooks/scripts/token-consumption.test.mts,"9f2af606afd074ef84d734f79c116f6dc63cb2256d4fbde616e7d15b315e3fe5"
      ai-framework/hooks/scripts/token-report.mts,"16132e33e16b1758b46a82e5cb7f4f8b78f972d29d8491dcbc0fe3e14761780a"
      ai-framework/hooks/scripts/token-report.test.mts,"25261c9a3edb5c9ea11a6f50e548cea6987101c05b7dd405915e888ef78b40a8"
      ai-framework/hooks/scripts/transcript-usage.mts,eb61d064e51ec7dbffb15df93fa4c821b6abc9cdf5b3ce1e49000d8e14c75c6a
      ai-framework/hooks/scripts/transcript-usage.test.mts,d4f44ff24e69030a64474238d7a628a8d3554b320614e7d827426edfb164d612
      ai-framework/hooks/scripts/workflow-capture.mts,a405d52d6789dfabbe86ed697c459c96c24c8b862b75870fc106f3b8725cbf58
      ai-framework/hooks/scripts/workflow-capture.test.mts,"220a5ba991285e67165c0f26b73260aaea3c5a64065badb3df21d3ef657e0b78"
      ai-framework/hooks/scripts/workflow-notice.mts,"78922fb86d1dd5370c70186eb50f6e520808496d7324de0e2a8c3529e8b631b3"
      ai-framework/hooks/scripts/workflow-notice.test.mts,"71df25da12987497f1bfd071ce6ded207a08f1678927bc7d24b360266fcca6d4"
      ai-framework/integrations/harnesses.md,"0ef7fe3f102503aca042746a339479b83724bcdf36f72dbf86ecaa8fe843b827"
      ai-framework/integrations/orca-vendors.example.json,"9b02de69ebc7d86ca64b3a91b03722c22b4b51c83df30d88b58a31e077c0f24e"
      ai-framework/integrations/orca-vendors.md,"80cd5074f41697a305a921d3495fa9783929980a6503c61a47faac1df4308658"
      ai-framework/integrations/skill-defaults.json,"68df8f9dbe489506898f1c7468ade4264b7185c782ae4a67220702db1e251c31"
      ai-framework/integrations/skill-defaults.md,aed215e20cfdf1fa4ef52074fda880603e491694f2ba47028c0bf2423afaebd4
      ai-framework/integrations/skill-vendors.json,"984d7f2969bd6e7556604df438ab867002efd10341a01b6f0bc3eae4d8b436c1"
      ai-framework/integrations/skills.md,b23b038ec29166d37045703ecf1f99e512cd9ac44ea3efe29ff6768dba9f2403
      ai-framework/integrations/state-report.md,"2f7049c70c92d2209186632d3b9bc79e126f6bcffa75c43b99b75edac8df8dcf"
      ai-framework/integrations/workflow-metrics.md,dcb13ff9d2c8438df62dc7bf677f9fabbaf5d5f3caca2ad804241fbefe23bc0a
      ai-framework/rules/boundaries.md,"61a96a6c5f0080cc76bd9ed36334c5b7a78d4d9fa26ebfe99ce746a468d4256d"
      ai-framework/rules/canonical-mirror-sync.md,f7b6f1aea6da8ac7b632c17c9a8ff8d9f1a0c52e2cb23dbd34698007ad0e4d36
      ai-framework/rules/ci-deployment.md,"057352139e4a49be9f14ab4a768a5506a7efd9b0b898b49a32a214bb306d51e6"
      ai-framework/rules/coding-standards.md,"8cf88955b0a5875c55cfd289a34d1f3e095ac82091ed43c5ac9bdaeaf73fc87c"
      ai-framework/rules/component-architecture.md,"29f3a8bcd7448f9baf7187c117627c9a00401d79dd346b6c7a9ed58e6592b6e1"
      ai-framework/rules/context-management.md,dc17def4e97dbcb6ddc830b0ffab9e4e34e47337a743d3b2f25a924b69ec2355
      ai-framework/rules/data-modeling.md,"770be714ae5704510f8eb281d490775b9360d6fb0eeee1ba827a9f35199f6faf"
      ai-framework/rules/eval-harness.md,c4d2d61523679b9916c98eac78503a7875c6e16f2fbdf0acdbb15ed3060c07c1
      ai-framework/rules/i18n.md,"0b01cfaa7a5ad3a55fcd5584768834c7b65d639bfb3ad3e542436df34ccbb3ab"
      ai-framework/rules/machine-data-format.md,"4d1812f421e26771ae07e526dd0cd15f60315d8a1e7a7a3cf6348560b21a1d3e"
      ai-framework/rules/model-routing.md,"808a11a5bb154f60185c7aa89be669f6cc36e2ac58e6a2f74c1bce9a53747eda"
      ai-framework/rules/observability.md,"1a9dc8f8b13441fc0fd90d0da0d3ebaa1a4bde7e2c216db3a119b5a321e57fc7"
      ai-framework/rules/performance.md,"96a68ddf97587c6e30246a0168c2fba4e7253eec5981b742ec89af9a4e17252c"
      ai-framework/rules/security.md,a4ca5b64c845bceee7c022cfa71af90d30524183e84bab40fee0b6adf1bf98c4
      ai-framework/rules/testing.md,fdc77ea6b96206e672fc82d1417597a9a20e1f49a869a87decff997cea8023e4
      ai-framework/rules/tool-use.md,"502c479b4fde12525f8e612c6580e133efb1000829f77116a68811415826268c"
      ai-framework/rules/ui-ux-review.md,f44625f2cb8a7f615e22de2902d572d46056ae31894c19cf83b66e259d98a1cc
      ai-framework/scripts/add-skill.mts,"139e28020ea1e8364a5b1a477ebd04a3c23131752abb622a2a63ee7ae0b5c2a1"
      ai-framework/scripts/add-skill.test.mts,"457362b3cddaac608c53e900b8f58de0f64e74baf2341a1c467ada4a03b30a05"
      ai-framework/scripts/agent-frontmatter-invariant.test.mts,"6cd46140d41c9a829d0b257e289d13097db9e4c70c6e3b37a90857772859d62c"
      ai-framework/scripts/browser-runtime.mts,"1d41e97b1f475de584753f75373da01ed5311ae34e7d8aaad84f7fc048b30b1b"
      ai-framework/scripts/browser-runtime.test.mts,f887f452e1f734435b74d1cccd4e97d1161d5efbe962d8e255639214e3c04f9e
      ai-framework/scripts/bundle-sync.mts,"4e85d956e280ae4c699903e2373b67b55200f2f4c29ea1379a0bd9a8978ff8b5"
      ai-framework/scripts/bundle-sync.test.mts,"082b41ffee498dec13f5d70a5cd6dcbcd5dc60ba6593d205bc012713c213034f"
      ai-framework/scripts/changelog.mts,b6dcc744ccd1da5e621fb3298d9fc2d2b67fdf64ccbe45fc472724922207880b
      ai-framework/scripts/changelog.test.mts,"9f9d8de5c8bd881814a59fb817a6e3d92bcedec62519ab48a3dc8474fbc863ed"
      ai-framework/scripts/config-migrate.mts,"522e406ba032d4de9914926abf0eb271d6b6d16b32dd5801791230ffc90d8e34"
      ai-framework/scripts/config-migrate.test.mts,"09c90a02536f7e47ca8b73d82252dfa84ff1b11240f668738c29dfdd5c07f130"
      ai-framework/scripts/docs-links.mts,"69d9231c293ea15ba740d6584f8437d2b100029050c41290a9324030046e3ebe"
      ai-framework/scripts/docs-links.test.mts,"937774f162075024a1f2bfa68bd358836cf857a9f368cb449da78d5da95b6736"
      ai-framework/scripts/entry-import.mts,"452a6e05b8d92e1f8b190d99160e434b86f73a228bbc3bdc4f52359c8bfe42d4"
      ai-framework/scripts/entry-import.test.mts,ffd52ffd00f1459122060619309860eb6303dada847ca74f15b956ab108005dc
      ai-framework/scripts/flow-join.mts,e260428733adcbb214c2753725b96db55d592826e4de3a1245b28487bdb69149
      ai-framework/scripts/flow-join.test.mts,eb3f5f8281342cebd51779c44aaef8a728dabdc29864b2161f0fcbce6d4ae628
      ai-framework/scripts/flow-render.mts,"8781e59b3fe094be1f71c6f227d8440df70dcf7415ee13f0435e9e719735f482"
      ai-framework/scripts/flow-render.test.mts,"43264ce93320730f34547f1c0a9d971622248e5b8cb11c0d68fd3c239175a967"
      ai-framework/scripts/flow-report.mts,"452f07f06a6d57b268b53afbf80ef7ac5f4d94219998f2ace8e691d370376bb1"
      ai-framework/scripts/flow-report.test.mts,"908fb93e9f9b46d7a04f6afd952368db777beaeeb32713bfdf7d4d5493bdf0fb"
      ai-framework/scripts/graphify.mts,b15b994c411783aec7e8dca621088c9f9bef175688438eeed6ae4fe301801cb5
      ai-framework/scripts/graphify.test.mts,"1a4e95b3e13555004842b9af5c43173d356e2036a31e3530a40a0d851f1bda36"
      ai-framework/scripts/instruction-loading.test.mts,f430f3f61e72e42be161a10f8331965a6ee462a44f086f63cea25e0b8aa9039a
      ai-framework/scripts/opencode-service.mts,"6f20412410482657070a033d5e9309b7dfa6d9904245c25d9253ff25be39c003"
      ai-framework/scripts/opencode-service.test.mts,f74ae7c9c1d95ab13c00f087a7667082aa5f314aff5baffc311a3dbd036ec38e
      ai-framework/scripts/orca-apply.mts,"3031386c17d1941e899ba565a5ebab6cc8e1cfb9ff280bbca6cbebe3e766af26"
      ai-framework/scripts/orca-apply.test.mts,c677d2be9887b8d325f2a1b05035cec07d0b146c236fd8c724b4a7d4b6c73834
      ai-framework/scripts/orca-assign.mts,c90ff858e73f04328917eda589f904a0eb1d96643042eb8a1c87499eec90d052
      ai-framework/scripts/orca-assign.test.mts,"139c68c878e6ea6dc5a97d7b269b09491474e32b97bbd48f124efce11669b3ff"
      ai-framework/scripts/orca-diff-admit.mts,"1cda46e26b9a70a74753207b341a640b0cae42704002395f46fb4773277739b0"
      ai-framework/scripts/orca-diff-admit.test.mts,"3c337c6545bf846337d38635d810e220ace7fd2809dd718906e167c2b842a1ae"
      ai-framework/scripts/orca-dispatch.mts,"6ba5efb1e870eadfbf279f58353007188d72ae839afd4ec1f01076d5bfbcabe9"
      ai-framework/scripts/orca-dispatch.test.mts,"2948ecc2666aaeb54f139b074696ed68087f57fe5ea1649f03fe3a9b79b6ad19"
      ai-framework/scripts/orca-eval-grader.mts,aa4793bed42f7fb6d72580a83b18e8d10660ac239908f4e8c5eaa6135045be11
      ai-framework/scripts/orca-eval-grader.test.mts,c761186bc2e975446314af94fc10a62a0d4c793223aa00b9e3ac7e22b358c1c0
      ai-framework/scripts/orca-evidence.mts,"490ba3b395e1990dd2a52ce5b7d5732d734e59f65f154cb6b11308289952bb43"
      ai-framework/scripts/orca-evidence.test.mts,a39f7617c926eb5ff76bff449a901efb484a391eeeb476b645ba649309ac3035
      ai-framework/scripts/orca-launch-gate.mts,"6a1af51f400040781fc0ded7c9395b35c8bdfa94af537af46acc312092927e92"
      ai-framework/scripts/orca-launch-gate.test.mts,d4d1e01fdb9f4e4b0f191966e3d0907b3ef1a28f249c3a4882e09222187eb0d7
      ai-framework/scripts/orca-ledger.mts,fc0b481f7cf7608bd33bea386cef60fb70b24a526ec3f914a2529572dba3e333
      ai-framework/scripts/orca-ledger.test.mts,"2e287dc27fc617085cb3d0867396fd6ca0d98c056e0a24d6167b73ddb2b9029f"
      ai-framework/scripts/orca-policy.mts,"60cd83f4c6b47e10eebe48b9a4b156e4a535c249652f3d2dc3258d8ecea1a569"
      ai-framework/scripts/orca-policy.test.mts,efecdef629d7e758cea86b2256c2ca10450e8b3feec704c5462928b5ae002f44
      ai-framework/scripts/orca-preflight.mts,"225837b18440d8ce273ee4c4edda1fbc0a8121523a74649cd51318cc9df2c948"
      ai-framework/scripts/orca-preflight.test.mts,"64d7548c38a5722b1386bf92533b8223944198b91025ca31c72783a22874d794"
      ai-framework/scripts/orca-reconcile.mts,"27e707fbf19796e650cc2cb1a84d4eb1c9ea114972f11e8dd7e245b209dcde5c"
      ai-framework/scripts/orca-reconcile.test.mts,"6007c462299b3ecbb30c05887a4fd3a3cfcbc595de145e88808b2354bc1ec9c6"
      ai-framework/scripts/orca-run.mts,"5c0e0b1fe0f530d23c037133a8ada8a4623ee87e337e587c1443fe7354ec6b74"
      ai-framework/scripts/orca-run.test.mts,"6c1da356ebacebb46a888d7c0893a00eadbf1c54d65435822e62364f5e0dd75f"
      ai-framework/scripts/orca-start.mts,"2dab69fed6ab26485bfded1face68a073cbe7fba7f1eb15e9c836188e7575ac3"
      ai-framework/scripts/orca-start.test.mts,"4e9be424f41695abde281336fbc8a9409fe8be8e8cbb0b50eaae2525062d9496"
      ai-framework/scripts/pitch-archive.mts,ff8bcc2ab1e404be5647bba6c4b0170cdc692615680b8cbd0832854252be02b5
      ai-framework/scripts/pitch-archive.test.mts,"5daa7edc577b9cc06e575850254d1922b19f5e25cd499d55153e249189b03eca"
      ai-framework/scripts/pitch-compress.mts,b65221150ec1bb998c393065d7f9f24c74e79f86752b7d6e9d5a337d347835fe
      ai-framework/scripts/pitch-compress.test.mts,"9b951cd36bbb9820aadaf251458aa4cc984e8d1331295cfa0efaf7f2273311dd"
      ai-framework/scripts/review-bench.mts,"02a4a38ff2811ae851b2d3f3248f1b1e2a197516f99ec259d491ea8441b9fead"
      ai-framework/scripts/review-bench.test.mts,"0cbf0dd552002ebd9cb651beafee114e146b06e22365138d8de0736b02ed04a3"
      ai-framework/scripts/run-tests.mts,"6b6202eef04a7337cf30b43e3b651635b7c2e3dc41335cd2f0010b5a6e4799a7"
      ai-framework/scripts/run-tests.test.mts,"1b585a4f2d2d8ad77f812c4293c9e39c20924af84752153428a0dc9cf9c8362c"
      ai-framework/scripts/runtime/README.md,"4beec211f68764c4a2b219aad3e50fa1a0bfe0e4bd3a31434da9d323d922de20"
      ai-framework/scripts/runtime/bun.mts,"489795f0d02a8d4091e13602a21ede6d0171760e1acdabaa4635f9cd84a2d5ec"
      ai-framework/scripts/runtime/cli.mts,e11c515cba0a95bdccf04572f32b3c952380ce711bd86ab36fc043ead18ae78d
      ai-framework/scripts/runtime/config.mts,"0f305a481661cac02b794f88be45f804956de857d7eebcdd7f4a7896a6962980"
      ai-framework/scripts/runtime/config.test.mts,"9201ce7e1817efb1f9fcc6de062d4f170202b1a8f4465b4d3723960881aac5b4"
      ai-framework/scripts/runtime/data-file.mts,"929d6240eb82a5efabbf3009d9f3fd0c5bb0612a928379b952aa9c82d17e1a75"
      ai-framework/scripts/runtime/data-file.test.mts,b431039c1793ceb7d99844ac6005bbc6802348d7a19eefd6a5ed7a56f5ffcf78
      ai-framework/scripts/runtime/entry.mts,"62edee638b130c9eaeb2126c30467928509e3eb73c1879403238ab1b8e25698e"
      ai-framework/scripts/runtime/entry.test.mts,"369aa62e6f5f20c141b05b75f4ca757a0d890252db942ffb8c5e2fb8678cccd0"
      ai-framework/scripts/runtime/env.mts,"6c6a09653c454bddb7a4b5c3769633eb087cb18b9bd904f0065f7ba03ba82c6e"
      ai-framework/scripts/runtime/invariants.test.mts,"232159017258e7e183d824725dfc68fdef8c31e92e01b9b4d0b79059e2db8bcd"
      ai-framework/scripts/runtime/migrate.mts,"617f10fdcd383f80330305b5057a90840ad8b4c42a4e18ab2c7f9044b0ec8c3e"
      ai-framework/scripts/runtime/migrate.test.mts,"9d8e84638c35ea3ad7fb8f4b8495c45000dc02c74965166c09c9c9d250a8f599"
      ai-framework/scripts/runtime/node.mts,"45c1551bbcbc52e63d54eaae9973bc28dd25628bd63797fd5757909102a4a2e8"
      ai-framework/scripts/runtime/oex-lock.mts,c324476014d7feb59452c50b17ec583450d140ae224cdc4cb6191d64a15f17dc
      ai-framework/scripts/runtime/runtime.test.mts,"1a6216d224eb259bc93b316453a7805a47fc1f412f7cba30fc9cdddecc8273c5"
      ai-framework/scripts/runtime/select.mts,c68e5af73849bc642305cc341392bba7dc4166f270f43f1a083f15dc3856f630
      ai-framework/scripts/runtime/semver-range.fixtures.json,"4c127de6e98037f31ccbc74461bfe97ed07dc471af893d7f16dc97cb220e30be"
      ai-framework/scripts/runtime/semver-range.mts,d06baa220e9a3a4646c9e97aadf39d4ac8e57cfe566614f3c54ab7af1fb8e80c
      ai-framework/scripts/runtime/semver-range.test.mts,eb164fc979e9a434e682ddd283db3696f02df677d8a4af139f23da4807a9e7c6
      ai-framework/scripts/runtime/test-helpers.mts,b87441e3dc5d1c223ac7db566afbe5ec367248b4a4f8285485c9bcdc5d85994e
      ai-framework/scripts/runtime/test-helpers.test.mts,a320f8e7c4ccdcc72f92527d93bcacee0fc2a2144d46dac43ff7400df22249c7
      ai-framework/scripts/runtime/toon-data.mts,"3c2c402934a07b7da5056d776d6fa39091182102479fed9a349bb27e1191012f"
      ai-framework/scripts/runtime/toon-data.test.mts,fbec4a02e85e04c7d6c2313e0d9aa4de133c306bc222ddba49f99c425dfbd60f
      ai-framework/scripts/runtime/types.mts,"29992cf482d689126b23633194750fa28a3bfaa6143d9f12045a5a78a7e6a0b2"
      ai-framework/scripts/runtime/upgrade.test.mts,"77153c81dae500255f9ad0adb922dbaec46de46953347d55d0d97ef69b34c66b"
      ai-framework/scripts/runtime/validate.mts,"65576f08658f62fee0d4742006e95db894bf248a4654418782b9a2be25afeb7b"
      ai-framework/scripts/runtime/validate.test.mts,"3576a389182adc50dc05794f6e78e6e6e095e48714f225b53c0090fad2cdd1cc"
      ai-framework/scripts/setup-validator.mts,"132ff8995b1403b7ec479532df71b39aa69b4a1a337a1102c3c0e41b3ffce321"
      ai-framework/scripts/setup-validator.test.mts,"66476d0a0301f33325623909ad510938b6bec2a7fdd82cb16e60d3fe35cacc2f"
      ai-framework/scripts/skill-compress-guard.mts,"60a9c252d6955a33206db67477995a17dec245c4101d7eed2ad9eb736bc6e46f"
      ai-framework/scripts/skill-compress-guard.test.mts,dce94212236ac8bdb5642a648561be36b4b7af2b72789195e546555e5f363466
      ai-framework/scripts/skill-defaults.mts,b0d1faaa4d8edf3a983ac1fc054ae39994a3687e94c1bfa11bc3e582811d1955
      ai-framework/scripts/skill-defaults.test.mts,a712181bb389e4540f3068fe4ef25a2bfd00c397ae4539798269f71aeab8115b
      ai-framework/scripts/skill-registry.mts,c88bc17b9a056febaa298a62f5aa1ac83b6af24e060acf49475b287e2342dcda
      ai-framework/scripts/skill-registry.test.mts,df1bfbade1cb60fdad59f7c7a84c8cc35982b0402ee1935e937ba8ee6af6135b
      ai-framework/scripts/skill-source.mts,bf71133a6af736463f3633a62a4e7450a99115902dab7db1dfcf3b6a778610b3
      ai-framework/scripts/skill-source.test.mts,daba16d72dbe246df0e8605e50e2c81367b3afa8aa3969922c88a866be937259
      ai-framework/scripts/skill-sync.mts,"7dad4f0c56fd583377aeb71cfaad3823f1e738532679edfc2b0d2b642375d4ca"
      ai-framework/scripts/skill-sync.test.mts,d3622471616a428c5ef5419ba0dc953db1a36036c286e556774a384345a561a9
      ai-framework/scripts/skill-vendors.mts,"013a987c9ae527176ff5248ab3c458c34c8026dae0dacbf2e54f3ecba7c460c5"
      ai-framework/scripts/skill-vendors.test.mts,ebdcc633fcc6bf0a2cde01eb1ea259bcf86339e97d132916dde5f8b80b19434f
      ai-framework/scripts/state-charts.mts,dfd6516c509c89a66289cffef0803648f5891ad222594bac1403d3cf9f07ee0f
      ai-framework/scripts/state-charts.test.mts,"22bd405f1d994cb6d40d6ceefe3acc669190c2a16a9c8685c73ee1f5c5a217f9"
      ai-framework/scripts/state-design.mts,d992a544bc7c2daad1fb17e13be8dce2e22011fba1d2893273a396234e3eedd0
      ai-framework/scripts/state-fragment-dataset.test.mts,"59c5e3e24f7b32508e6be3835e4dd3274f315e1804c09d34de85cdcad92ab1f8"
      ai-framework/scripts/state-fragment-evidence.mts,"50380b5e5a7a7e82f7a179f464f437774b2fc8df3f71935ee5a9de8792416eac"
      ai-framework/scripts/state-fragment-evidence.test.mts,"25e49ec95e07d372d759195208733caee1e29b3fc7afb31226c0a96b876cc3f9"
      ai-framework/scripts/state-fragment-inject.mts,"71269a3070c2d64b31ad6be90bc598068a634a4321f78a4aefe6e4b980ce861f"
      ai-framework/scripts/state-fragment-inject.test.mts,"0908d064fb22fc1478dea909a387c0c7f841c27db38b59680e4364aa2a4c0fff"
      ai-framework/scripts/state-fragment-parse.mts,"8df6055a80ecb0a4cdf4da254676ace9a3fe86d805ccf7a19f31eec956193d0b"
      ai-framework/scripts/state-fragment-parse.test.mts,"5147ef205f61142ea656a03db86f062e3c4a00a35735b68db7bc58d603cf53f0"
      ai-framework/scripts/state-fragment.mts,"78ecbed5fada3d219f4ab43f6daa1798dce6fe05e846e5fab3a1426c32b201a5"
      ai-framework/scripts/state-fragment.test.mts,"6f51958f27645d141d2fbd1d8f16fe5b42438533b57bad98b547fa8a8c04bc6f"
      ai-framework/scripts/state-graph.mts,cde9c5f7df0e3ce159e20a11565ec681945415955397ec2c8747fed9455c2d7b
      ai-framework/scripts/state-graph.test.mts,d3903429ebdaafea675bc68a5dc048cf05b5a1aa71b23bcadbd2769af498fd73
      ai-framework/scripts/state-history.mts,"64241c5e5fd03c29d6675f6c0ab3193d846612af3af997e673e93cf0a77e4ec2"
      ai-framework/scripts/state-history.test.mts,"01a504a8f75ced89af315b2b0bf187d0899a1924bc08153abc812f55e9d59991"
      ai-framework/scripts/state-html.test.mts,f539844e21b2d836cd7df8556acf20a1e130065ceacb79c607b804693214f872
      ai-framework/scripts/state-pages.mts,adcb50917171fbc4fc1ac01965d08a0003dba004a3eb41dac869baec0f802d08
      ai-framework/scripts/state-render.mts,b04c2383693502ce91cef1ee0b00b854e305384364bb6c5f3aa24126fdcc5b53
      ai-framework/scripts/state-snapshot.mts,"65aa3f9a06f683938a5f2709a56cc498a27cc139a2436db694b7e99cbb7f64ac"
      ai-framework/scripts/state-snapshot.test.mts,"5ace7d8a47089c2a38fbc7aad52591e3c3ec4a0d75c9abecccc5effab7c8baab"
      ai-framework/scripts/state-structure.mts,a2e60745aedf7923b94bc4e7a223cf12b3b1a2049cb84a82dbdf8a8b122b7d6b
      ai-framework/scripts/state-test-helpers.mts,"3d71a4358c3ca3b17a0f0fa54d878b6dd663dacf2d6c5d5a62673cf81e5373bc"
      ai-framework/scripts/state-theme.mts,"3e1f778d8046718768c63ad45af09870b617ddcd7cf1e19294a617d855885cc8"
      ai-framework/scripts/state-theme.test.mts,d3240c16c2ad631335b57b9124d278bcd32184a36256a39f29c91fc862110f51
      ai-framework/scripts/toon-convert.mts,"10e305aa561aa4136409aed61b954db1bcf278faf8a9e62aa953d3efe26cd5a9"
      ai-framework/scripts/toon-convert.test.mts,"537503e2455ad1da326978dae0f13974bfd4e07f55cfe684ed3470f4b3c17a58"
      ai-framework/scripts/workflow-contracts.test.mts,"5fe4477b8d32c84b7c5bb3d194bdec66e4e69f5ae1c03bece46754579dc933cd"
      ai-framework/scripts/workflow-doctor.mts,"54fc4f0203ffdd3a2bf8adb760b980d1fe73e3ebbf2f69fdae859818d7be161d"
      ai-framework/scripts/workflow-doctor.test.mts,"15f5b2e21ea5dd54b2c8b03d18674273cf40f9abc252e2b09027595811ab3223"
      ai-framework/scripts/workflow-metrics-report.mts,"98a28139b2e5fc4a965be5adc04331f677e4449668069af2d6dbbf2d298b8662"
      ai-framework/scripts/workflow-metrics-report.test.mts,"26b2c361577908cf42bc3b2150328bb0f98be18ec0558bb3db462434592b75af"
      ai-framework/scripts/workflow-metrics-state.mts,"445170d9a49119f9479d522e53ae9421d567ba7a57886c048cd289a261c7fedb"
      ai-framework/scripts/workflow-metrics-state.test.mts,"0b5914c1446aa7757d328679871d0e19195be7027ec55a72ba02e40b98b124f5"
      ai-framework/scripts/workflow-metrics.mts,"8ec0824f72cf45cd0c9565483250c51664136ed679defc6301eccfcf9268d35f"
      ai-framework/scripts/workflow-metrics.test.mts,"97857efe0bbdadbf3b52bc5af44de832ce0685e6bbb6c4fa57f188bc32962b7e"
      ai-framework/templates/ai-workflow.example.toon,dc41ce03805031b0b4b7e2aa7153d05525bc8eeae65fcbd4790effe0146981c4
      ai-framework/templates/ai_workflow_env.example.json,"98dbcb3a7b9da4a149e67cd26c8dc4e416e7b1a7dcb22ce09f728c7924850017"
      ai-framework/templates/project/analysis/README.md,"9116655c8f8d3e6dcbdc69fcd32319804724b18bb6fb52b82ca23cdce9dd5a90"
      ai-framework/templates/project/context/README.md,"5e76c38ea55af9925fc68548f7fad48373d241c0cd180943b29561ea725a91c9"
      ai-framework/templates/project/design/decisions/template.md,"53811f0820d81415253f2a4efe16fdb45227a8ed55f04527d1b59e0d92373ce5"
      ai-framework/templates/project/design/plans/rollback-template.md,a78158600a847a6840ee761e2481890b80bf8609084a92862fe805a1ed812cab
      ai-framework/templates/project/design/plans/template.md,d62d8649f6cb97dd3db9622f4f86492ff75037ff5afd0e216aa12a9953d16c90
      ai-framework/templates/project/design/template.md,d3482dc696b3893231b2cc6a54c7457784119fe9df4e8a4976464f9c15628196
      ai-framework/templates/project/design/wireframes/template.md,d3482dc696b3893231b2cc6a54c7457784119fe9df4e8a4976464f9c15628196
      ai-framework/templates/project/done-work.md,c721b6ec084de8a11a31b5fae753746888c127b85952a335a860ce100264465d
      ai-framework/templates/project/knowledge/README.md,"99e824eb8d955ffb4ee50b41fa0ea2501c42fce1749690eeab2c42385fe023d5"
      ai-framework/templates/project/knowledge/templates/decision.md,eb7b93ef148d3da5eec03c75a6de427cf9a648354bdd4b52da412929a8fefe88
      ai-framework/templates/project/knowledge/templates/entity.md,"15485085bf9faf8fa4a61545df7d795467dd28befe6dfd3910a6816ae0c3eae8"
      ai-framework/templates/project/knowledge/templates/issue.md,"9270185df6ff085341fab5905134651cd7e0a5d3679ccd604686149100dcc542"
      ai-framework/templates/project/knowledge/templates/pattern.md,"27621bfc41afc5c984fbc16d310b20715353b6df4dd8b36d82fd2ab3c97773aa"
      ai-framework/templates/project/pitches/_archive/.gitkeep,e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
      ai-framework/templates/project/pitches/_parked/.gitkeep,e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
      ai-framework/templates/project/pitches/_templates/hill.md,"6d728f73ff5b532ff6ef77949221a2dbe4f38a158b6d90985fb4c789530559dc"
      ai-framework/templates/project/pitches/_templates/pitch.md,eb927ca736585fec3e9afc14539582b5cb9b261e49085759b11f68bf01f8cada
      ai-framework/templates/project/pitches/_templates/plan.md,"64f750a6d2b90bd36c37daee3427e6183b61f4fb04d937a402f1db122e093b86"
      ai-framework/templates/project/reports/README.md,"6a09eb48c81bf1eae76b757230c20436a1a1709b45b7a071dcc5081b52766a2a"
      ai-framework/templates/project/requirements/bugs/template.md,"54f0dc660d2177883bedf8c02be5d6e368b2e1eeb6a5e597c1b2d20d39039f75"
      ai-framework/templates/project/requirements/features/template.md,"0207eec5f811c08b303783a65c697129a4c4a7f1cd803a9e8db06655e20ad5fc"
      ai-framework/templates/project/rules/README.md,e1f7f7c7cb05a750ee338a346987bd450e4e53630aec0690a2ba267d9cd5883a
      ai-framework/templates/project/runs/README.md,"11e2d6c91b7b1a3abad781f73017979a59d403a31bc608850cf7ffe32c99f0a6"
      ai-framework/templates/project/status.md,"317486b3922fd511b627e5d14b3c28b23b6da25d8950f9461f6f00e6e2f7d8ab"
      ai-framework/workflow/overview.md,"873bb51f966fef96b0c9970f36a35c3a7b74b6897c64095de318aad7d0b14301"
      ai-framework/workflow/phases/0-shape.md,"0837ca21f826f0e48a18070f574348c730081915f410ecb9bd95fccb2a1485b7"
      ai-framework/workflow/phases/1-plan.md,eb9c56adc6f045daf50c0ec6708a5ad4f2a609b6baed789f76c6b42d7d07ac54
      ai-framework/workflow/phases/2-build.md,d1f1a816bd653e7ab45a2703075eb50ebb2450e7a8015f336e6d4cd29137efab
      ai-framework/workflow/phases/3-audit.md,"067275df459da6fca94d083ec081076273043e98ce81f3cab9a1f1557b6a603d"
      ai-framework/workflow/phases/4-ship.md,a8685a3628670eeca49a29359eb6d3d8a9ed66250d1a5b472d7d103602899a9c
      ai-framework/workflow/phases/5-cooldown.md,"828633bec26df18363126a04e649f15e3f512014527030b8692f9f1a8b37a59f"
      ".project/status.md",e427b798c76d837566837baa52361b95cfcc3b3630815134c5bc2cca96d0b2ad
      ".project/context/stack.md","999ae0207160b3e6c28aba32873f40631a0693571e4e1d41a804d20c0e70b0d9"
      ".project/pitches/connected-memory-consolidation/plan.md","259de12cf95ab9c0ad68c518824338610375a21e3c1451e5e06ddda0c3d0509f"
      ".project/pitches/connected-memory-consolidation/deviations.md",b37e078c68496b77876dcdea95d716fea2df6be976a3b208601ef3638d53f34a
      ".project/pitches/connected-memory-consolidation/closing-exceptions.approved.toon",aaa288e412348c12222072613543c0a606645618335a87a3d347a0a393a5d92a
      ".project/pitches/workflow-v3-rollout/pitch.md",eba3bf397244c34e26b68e4fe7fadc4929fa4a160979ea40ed2fe3c558a7cb83
      ".project/pitches/package-less-ship-verification/pitch.md",ea689efee7916d4392e9f1b0750fc0e1844c1f527387bbf05c894e8ed59b47b2
      ".project/pitches/orca-bounded-control-receipts/pitch.md",e1cca59fa538576cb37f47b76d756bb640274e2badc3e6d34e41e5eb88930e14
      ".project/pitches/fix-retired-live-evidence-path/log.md",a69f0a38e643e70f2ce1357a3a2232cdffb711c5172b3954cc4d45b13f5f7c44
      ".project/pitches/fix-retired-live-evidence-path/source-proof.toon","38ead5dcdf39d369ce237443e8aae327cd4b514eda4f4100d0a17ed63def4704"
      ".project/records/legacy-upgrades/state-ai-authoring-live-runs.md","868e76e9eace40c14f8014e18a16a8fa5b702de13e5489ebcc29c4e7944fc24a"
      ".project/evals/datasets/state-ai-fragments.json",d91d990a62f40de75cbf5ec0b01b03356587a369d8d7a0083bb6e18db91c7f1c
      ".project/evals/datasets/state-ai-authoring.json",dfb5857b0d6adbbd391c12450576ccf619e006e76d1a30f0c3fb6e67a0b2664c
    canary:
      file: ".project/records/legacy-upgrades/state-ai-authoring-live-runs.md"
      line: 33
      findSha256: "102e3f41817028fe2d1af2bc904a3e53ac5debfd1fd8fe7a369603bfb838910a"
      replaceSha256: dda9bf66c7684f0f478c00fe20800bac0bbf0e818d26710c247e66b3ad7b292d
    testCommand[3]: node,"--test",ai-framework/scripts/state-fragment-dataset.test.mts
    baselinePassed: true
    canaryBreaksTests: true
````

## audit-records/2026-10-23-p2d-p2c-repair/initial-code.md

````markdown
# Initial code review — cycle1

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check; final repo guard clean
prompt-sha256: c6915e2a28fbf3a8e3be7c0bc0e7e5d3587fd8a18ca3711e3bb1682839e6a684
model: gpt-6.1-sol high
cross-file interactions: reviewed

Status: BLOCK/INCOMPLETE: seeded failures; installed runtime and original raw identity not independently completed in first copy.

Exact loaded prompt is initial-code.prompt.md. These are summaries of the fresh agent reports, not invented clean results. Reported failures are in planted scratch copies; no original checkout or recovery sources were given to reviewers.

| ID | severity | file:line | issue | verified | disposition |
|---|---|---|---|---|---|
| C-D | must-fix, scratch only | consolidation-migrate.mts:179 | Planted unconditional publication violates dry-run | yes; reviewer reported and focused regression failed | Not present in checkout; actual options.apply guard and source hash verified |
| C-C | must-fix, scratch only | legacy-upgrade.mts:270 | Planted existence-only binding check | yes; reviewer reported and missing-binding regression failed | Not present in checkout; actual hash equality and source hash verified |
| C-R | scratch inconsistency | state-ai-authoring-live-runs.md:33 | Planted Claim: passed contradicts matrix | yes; reviewer reported and unchanged consumer failed | Not present in checkout; actual blocked claim and complete36920bytes verified |

Focused evidence: P2d31 tests30pass1fail; sync/doctor4/4. P2c67 tests64pass3fail; graph2/2. Repair54 tests53pass1fail.

Source checklist completed: P2d guarded reads, pending transactions, local/refused template distinction, publication conflict/replay and sync/doctor read-only inventory; P2c receipt/admission, introducing-commit and drift pairs, source/section/file hash validation, preserved v1 bytes, five-stage replay and authoritative outcome-link interfaces; repair complete consumer, matrix and unchanged timing/buffer assertions. Code followed migrate/pending guard/registry and apply/archivedEvidence/validateEvidence/transaction interfaces. Security walked applicable C/D/E/G, A/B/F N/A to local CLI. Coverage checked behavior/refusal assertions and fault/replay stages.

Installed fixture omissions and exact-byte checks were not waved through: the fresh narrow completion reviews below supply the missing evidence. No production patch was required.
````

## audit-records/2026-10-23-p2d-p2c-repair/initial-coverage.md

````markdown
# Initial coverage review — cycle1

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check; final repo guard clean
prompt-sha256: d20df12e082a0791639abaa1be710f9158aaba0da37c4209db9e6fde5e476718
model: gpt-6.1-sol high
cross-file interactions: reviewed

Status: INCOMPLETE: seeded failures; installed fixture source-reviewed only. All required source/test interfaces inspected, completion retry needed.

Exact loaded prompt is initial-coverage.prompt.md. These are summaries of the fresh agent reports, not invented clean results. Reported failures are in planted scratch copies; no original checkout or recovery sources were given to reviewers.

| ID | severity | file:line | issue | verified | disposition |
|---|---|---|---|---|---|
| C-D | must-fix, scratch only | consolidation-migrate.mts:179 | Planted unconditional publication violates dry-run | yes; reviewer reported and focused regression failed | Not present in checkout; actual options.apply guard and source hash verified |
| C-C | must-fix, scratch only | legacy-upgrade.mts:270 | Planted existence-only binding check | yes; reviewer reported and missing-binding regression failed | Not present in checkout; actual hash equality and source hash verified |
| C-R | scratch inconsistency | state-ai-authoring-live-runs.md:33 | Planted Claim: passed contradicts matrix | yes; reviewer reported and unchanged consumer failed | Not present in checkout; actual blocked claim and complete36920bytes verified |

Focused evidence: P2d30pass1fail; integration4/4. P2c111pass3fail across114 tests; graph2/2. Repair53pass1fail.

Source checklist completed: P2d guarded reads, pending transactions, local/refused template distinction, publication conflict/replay and sync/doctor read-only inventory; P2c receipt/admission, introducing-commit and drift pairs, source/section/file hash validation, preserved v1 bytes, five-stage replay and authoritative outcome-link interfaces; repair complete consumer, matrix and unchanged timing/buffer assertions. Code followed migrate/pending guard/registry and apply/archivedEvidence/validateEvidence/transaction interfaces. Security walked applicable C/D/E/G, A/B/F N/A to local CLI. Coverage checked behavior/refusal assertions and fault/replay stages.

Installed fixture omissions and exact-byte checks were not waved through: the fresh narrow completion reviews below supply the missing evidence. No production patch was required.
````

## audit-records/2026-10-23-p2d-p2c-repair/initial-security.md

````markdown
# Initial security review — cycle1

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check; final repo guard clean
prompt-sha256: 76274c1ae4e641795b89b9a84b55ea6b7a40e9ad7a5ded229726311bc61fbfc6
model: gpt-6.1-sol high
cross-file interactions: reviewed

Status: BLOCK/INCOMPLETE: seeded failures, omitted installed-fixture inputs and missing exact original comparison. No additional candidate security issue reported.

Exact loaded prompt is initial-security.prompt.md. These are summaries of the fresh agent reports, not invented clean results. Reported failures are in planted scratch copies; no original checkout or recovery sources were given to reviewers.

| ID | severity | file:line | issue | verified | disposition |
|---|---|---|---|---|---|
| C-D | must-fix, scratch only | consolidation-migrate.mts:179 | Planted unconditional publication violates dry-run | yes; reviewer reported and focused regression failed | Not present in checkout; actual options.apply guard and source hash verified |
| C-C | must-fix, scratch only | legacy-upgrade.mts:270 | Planted existence-only binding check | yes; reviewer reported and missing-binding regression failed | Not present in checkout; actual hash equality and source hash verified |
| C-R | scratch inconsistency | state-ai-authoring-live-runs.md:33 | Planted Claim: passed contradicts matrix | yes; reviewer reported and unchanged consumer failed | Not present in checkout; actual blocked claim and complete36920bytes verified |

Focused evidence: P2d30pass1fail; sync/doctor4/4; fresh subset1pass1missing-fixture failure. P2c45pass3fail; refs19/19; graph3/3. Repair53pass1fail.

Source checklist completed: P2d guarded reads, pending transactions, local/refused template distinction, publication conflict/replay and sync/doctor read-only inventory; P2c receipt/admission, introducing-commit and drift pairs, source/section/file hash validation, preserved v1 bytes, five-stage replay and authoritative outcome-link interfaces; repair complete consumer, matrix and unchanged timing/buffer assertions. Code followed migrate/pending guard/registry and apply/archivedEvidence/validateEvidence/transaction interfaces. Security walked applicable C/D/E/G, A/B/F N/A to local CLI. Coverage checked behavior/refusal assertions and fault/replay stages.

Installed fixture omissions and exact-byte checks were not waved through: the fresh narrow completion reviews below supply the missing evidence. No production patch was required.
````

## audit-records/cycle1-code-graph.md

````markdown
# Review record: code-reviewer (graph and manifest) (audit cycle 1)

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check (repo clean after the dispatch)
prompt-sha256: da9989a1665bd73411361bea9fd027a4a1b38887fd0872dad9fb52aa22ec40a3
model: sonnet
cross-file interactions: reviewed

| ID | severity | file:line | issue | verified | disposition |
|----|----------|-----------|-------|----------|-------------|
| F1 | must-fix | graphify-relations.mts:242 | planted defect (canary) | yes: canary caught | not a repo defect |
| F2 | should-fix | graphify-relations.mts:106-112 | isFile follows symlinked parents | yes: probe | fixed (cycle 1) |
| F3 | acknowledged | graphify-relations.mts:243-247 | duplicate targets give duplicate edges | traced | fixed (cycle 1) |
| F4 | acknowledged | graphify.mts:254-269 | superseded_by on a non-superseded decision; self-supersede | traced | fixed (cycle 1) |
| F5 | acknowledged | graphify.mts | 786 lines | yes | acknowledged |
````

## audit-records/cycle1-code-schemas.md

````markdown
# Review record: code-reviewer (ledger, outcome record, index, validator) (audit cycle 1)

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check (repo clean after the dispatch)
prompt-sha256: f1cfc613cd224f6dc105e8c5135f5f895f15b83ff1e5d4c0b3f309484e1da795
model: sonnet
cross-file interactions: reviewed

state-snapshot was not read and the v1 path was not diffed against HEAD by this reviewer; both were covered by the author (v1 ledger bytes identical to HEAD, labelled author-run).

| ID | severity | file:line | issue | verified | disposition |
|----|----------|-----------|-------|----------|-------------|
| F1 | must-fix | pitch-archive.mts:163 | planted defect (canary) | yes: canary caught | not a repo defect |
| F2 | should-fix | outcome-record.mts lintInto | symlinked ancestor followed | yes: repro | fixed (cycle 1) |
| F3 | should-fix | done-work-index.mts scanRecords | marker injection | yes: repro | fixed (cycle 1) |
````

## audit-records/cycle1-cross-pitch.md

````markdown
# Review record: cross-pitch-conflict-checker (audit cycle 1)

independent: no
canary: none (no defect planted for this role)
read-only: verified by review-bench guard snapshot/check (repo clean after the dispatch)
prompt-sha256: 5979e3b90d6c29cf8717d8f58673e25d5b6d6c2179846cbf19615a0c9199a1cf
model: sonnet
cross-file interactions: reviewed

Judged from the other pitches' documents in a scratch copy. No canary, so independence is not claimed; the author re-read the verdicts against the named files.

| ID | severity | file:line | issue | verified | disposition |
|----|----------|-----------|-------|----------|-------------|
| X1 | clean | workflow-v3-rollout | adjacent: consumes this pitch's deliverables, edits none | yes | none needed |
| X2 | clean | package-less-ship-verification | disjoint | yes | none needed |
| X3 | clean | orca-bounded-control-receipts | disjoint | yes | none needed |
````

## audit-records/cycle1-security-resumed.md

````markdown
# Review record: security-reviewer (original dispatch, resumed after an API failure) (audit cycle 1)

independent: no
canary: caught
read-only: verified by review-bench guard snapshot/check (repo clean after the dispatch)
prompt-sha256: a5033143aff2b062440236f8e8e69606c683b5a7a9553a0d8ed27ac65d0a411f
model: opus
cross-file interactions: reviewed

The original agent failed with an API error, was resumed from its transcript and finished. A resumed agent is not fresh, so this is a cross-check, not an independent review. It found the planted defect (SEC-3 at done-work-index.mts:129) and every real item the fresh retry found (case-aliased destination, preamble text in no section), plus a FIFO hang in the validator, error text with absolute paths and an unbounded record read.

| ID | severity | file:line | issue | verified | disposition |
|----|----------|-----------|-------|----------|-------------|
| SEC-1 | must-fix | pitch-compress.mts:383-385; ledger-schema.mts:78 | case-aliased pitch destination passes; remove deletes the only copy | yes: reproduced on this disk | fixed (cycle 1) |
| SEC-3 | must-fix | done-work-index.mts:129 | planted defect (canary) | yes: canary caught | not a repo defect |
| SEC-2 | should-fix | pitch-compress.mts:378-393 | symlink into another pitch's folder accepted | yes: reproduced | fixed (cycle 1) |
| SEC-4 | should-fix | pitch-compress.mts:285-339 | text outside any section is never judged | yes: reproduced | fixed (cycle 1) |
| SEC-5 | should-fix | setup-validator.mts | FIFO in the ledger folder blocks the validator | yes: reproduced | fixed (cycle 1) |
| SEC-6/7/8/9 | should-fix | done-work-index, outcome-record, graphify-refs | error text with paths; unbounded read; case alias in lint | yes / traced | fixed (cycle 1) |
````

## audit-records/cycle1-security-retry.md

````markdown
# Review record: security-reviewer (fresh retry, narrower scope) (audit cycle 1)

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check (repo clean after the dispatch)
prompt-sha256: 0abc16d78af9c61f19e7dfa98ecdae03b44d543951fa7754b163ffac6c26b9bc
model: opus
cross-file interactions: reviewed

The first dispatch returned nothing (API error); this is the one allowed retry on a narrower scope with a fresh agent and its own canary.

| ID | severity | file:line | issue | verified | disposition |
|----|----------|-----------|-------|----------|-------------|
| S1 | must-fix | ledger-schema.mts:78; pitch-compress.mts:383-385; outcome-record.mts:112 | pitch destination spelled in another case accepted | yes: reproduced | fixed (cycle 1) |
| S2 | must-fix | done-work-index.mts:129 | planted defect (canary) | yes: canary caught | not a repo defect |
| S3 | should-fix | done-work-index.mts:69,94 | lint and index read different text; marker injection breaks regeneration | yes: reproduced | fixed (cycle 1, hardened cycle 2) |
| S4 | should-fix | outcome-record.mts:131 | lint follows a symlinked ancestor | yes: reproduced | fixed (cycle 1) |
| S5 | should-fix | pitch-compress.mts:290-339 | preamble text in no section | yes: reproduced | fixed (cycle 1) |
| S6 | should-fix | done-work-index.mts:79 | unbounded read of a record | yes: measured | fixed (cycle 1) |
| S7 | should-fix | done-work-index.mts, outcome-record.mts | terminal escape injection | yes: od -c | fixed (cycle 1) |
````

## audit-records/cycle1-test-coverage.md

````markdown
# Review record: test-coverage-checker (audit cycle 1)

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check (repo clean after the dispatch)
prompt-sha256: 418de646e26b1468e3e6d45caf324e93fc3d1c704e1d4d913361c03c8e8f6166
model: sonnet
cross-file interactions: reviewed

Ran 50+ mutations in its scratch copy; every survivor is a guard with no test.

| ID | severity | file:line | issue | verified | disposition |
|----|----------|-----------|-------|----------|-------------|
| F1 | must-fix | ledger-schema.mts:78 | planted defect (canary) | yes: canary caught | not a repo defect |
| F2-F4 | should-fix | pitch-compress.mts commitLedgerV2 | pending journal, graph check, missing section untested for v2 | yes: mutations survived | tests added (cycle 1) |
| F5-F7 | should-fix | pitch-archive.mts requireCompleteLedgerV2 | otherFiles gap, absent file, whitespace acceptance untested | yes: mutations survived | tests added (cycle 1) |
| F9-F13 | should-fix | graphify.mts, outcome-record.mts, done-work-index.mts, graphify-relations.mts | hub rule, dedupe, budget, intermediate symlink, CLI, real manifest caps untested | yes / by grep | tests added (cycle 1) |
````

## audit-records/cycle2-security.md

````markdown
# Review record: security-reviewer (narrow re-check) (audit cycle 2)

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check (repo clean after the dispatch)
prompt-sha256: e316d5c5647274ea980ace50f252b71d4de9291f89d519cf7f6f656a42a307a7
model: opus
cross-file interactions: reviewed

| ID | severity | file:line | issue | verified | disposition |
|----|----------|-----------|-------|----------|-------------|
| F1 | must-fix | pitch-compress.mts:390 | planted defect (canary) | yes: canary caught | not a repo defect |
| F2 | should-fix | outcome-record.mts:113; ledger-schema.mts:79 | character folding (U+017F) beats toLowerCase | yes: repro | fixed (cycle 2) |
| F3 | should-fix | done-work-index.mts:104 | single-pass marker strip can be rebuilt from fragments | yes: repro | fixed (cycle 2) |
| F4 | should-fix | setup-validator.mts:61,68 | control characters in validator output | yes: repro | fixed (cycle 2) |
| F5 | should-fix | setup-validator.mts:48 | symlinked ledger folder followed and echoed | yes: repro | fixed (cycle 2) |
| F6 | acknowledged | graphify-relations.mts:287 | control characters in CLI output | yes | fixed (cycle 2) |
````

## audit-records/cycle3-security.md

````markdown
# Review record: security-reviewer (narrow re-check, last cycle) (audit cycle 3)

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check (repo clean after the dispatch)
prompt-sha256: 3e70370597e3ccf22ae47f292d39067bc47a58c27cc164b15c5f40abd2b82411
model: opus
cross-file interactions: reviewed

| ID | severity | file:line | issue | verified | disposition |
|----|----------|-----------|-------|----------|-------------|
| C3-1 | must-fix | done-work-index.mts:104 | planted defect (canary) | yes: canary caught | not a repo defect |
| C3-2 | should-fix | outcome-record.mts:129; graphify-relations.mts:288 | a line feed in a file name forges report lines | yes: repro (setup-validator) | fixed (cycle 3) |
````
