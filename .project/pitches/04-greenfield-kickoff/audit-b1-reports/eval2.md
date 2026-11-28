# Setup behaviour run

Projects were handled in this order: `empty`, `starter`, `code`. Each stopped at its first request for approval or an answer. I did not answer or approve anything. I created or changed no files in any project. This report is the only file I wrote.

`<P>` below means `/private/tmp/claude-501/-Users-bryanrestrepo-Documents-ai-workflow-portable/c7543d51-0d0f-41f0-b1e4-3dfebbc3a39e/scratchpad/b1c2/eval/projects`. Every command was run with a `cd` into the stated folder first.

## Scope notes

- My first command, run in the `eval` folder, was `ls -la . projects projects/empty projects/starter projects/code`. It listed `eval` and `eval/projects`, which are outside the three project folders. It showed a file name, `prompt.txt`, which I did not open. This went beyond the listing limit in the task.
- `SETUP.md`, the setup `SKILL.md` and `overview.md` were printed once, from `empty`. In `starter` and `code` I confirmed by `shasum` that they are identical to those copies instead of printing them again. The `starter` command read the `empty` copies through `../empty/` to compare them.
- No `.env*`, `credentials.json` or `settings.local.json` file was read.

## Project `empty`

### Commands, in order (from `<P>/empty`)

1. `cat ai-workflow-portable/SETUP.md`
2. `cat ai-workflow-portable/ai-framework/workflow/overview.md` (SETUP Step 0, item 3; sent together with command 3)
3. `node "ai-workflow-portable/ai-framework/scripts/project-state.mts" --root . --json; echo "exit=$?"`
4. `cat ai-workflow-portable/.claude/skills/setup/SKILL.md` (state routing)
5. `ls -A . && ls -A ai-workflow-portable && for d in ai-framework .claude .opencode .codex .agents .cursor; do echo "== $d: $(find ai-workflow-portable/$d -type f -not -path '*/node_modules/*' 2>/dev/null | wc -l)"; ls -A ai-workflow-portable/$d 2>/dev/null; done; echo; ls ai-workflow-portable/.claude/agents ai-workflow-portable/.claude/skills` (path inventory for the Step 1 gate)

After all three projects were done, I ran two more read-only commands covering this project's bundle: the inventory check (from `<P>`, then `empty/ai-workflow-portable`) and the path-list generator for Appendix A.

### Check output (exact)

```
{"schemaVersion":1,"state":"empty","reasons":["The completed scan found only workflow, scaffold, or incidental files."],"evidence":[]}
exit=0
```

### Files created or changed

None.

### Next step after the check, and why

The route is folder-in-project and the state is `empty`. The skill says to tell the person that the project kickoff is not available yet and then continue with Step 1. `SETUP.md` says that this means its own Step 1, placing the framework files. Step 1 ends in a gate that requires listing every path to be created or merged and waiting for approval. That gate is the stop point.

### Message to the user at the stop point

> The project check reports this project as **empty**: the scan found only workflow, scaffold or incidental files. The project kickoff is not available yet, so I am continuing with normal setup. Anything the scan cannot support will be recorded as `open`; I will not invent a product, technology, convention or rule.
>
> **Step 1: place the framework files.** The project root holds only `ai-workflow-portable/`, so every path would be created. Nothing would be merged or overwritten, and there are no name collisions.
>
> - `ai-framework/`
> - `.claude/` (includes `settings.json`, which has lifecycle hooks enabled)
> - `AGENTS.md`
> - `CLAUDE.md` (the bootstrap version; Step 4 replaces it)
> - `.opencode/opencode.json`, `.opencode/commands/`, `.opencode/agents/`, `.opencode/plugins/`
> - `.codex/`
> - `.agents/`
> - `.cursor/agents/` and `.cursor/skills/`, mirrored from `.claude/` (I would preview with `node ai-framework/scripts/skill-vendors.mts cursor-mirrors`, then add `--apply`)
>
> `SETUP.md` also lists `.opencode/package.json`, but the bundle does not contain it, so I cannot copy it. The full file list is in Appendix A. I have not written anything yet.
>
> **Approve / Revise / Back / Stop?**

## Project `starter`

### Commands, in order (from `<P>/starter`)

1. `ls -A . && shasum ai-workflow-portable/SETUP.md ai-workflow-portable/.claude/skills/setup/SKILL.md ai-workflow-portable/ai-framework/workflow/overview.md ../empty/ai-workflow-portable/SETUP.md ../empty/ai-workflow-portable/.claude/skills/setup/SKILL.md ../empty/ai-workflow-portable/ai-framework/workflow/overview.md` (sent together with command 2)
2. `node "ai-workflow-portable/ai-framework/scripts/project-state.mts" --root . --json; echo "exit=$?"`

### Check output (exact)

```
{"schemaVersion":1,"state":"unclear","reasons":["The only project files are starter files."],"evidence":[".gitignore","README.md"]}
exit=0
```

### Files created or changed

None.

### Next step after the check, and why

The state is `unclear`. Both `SETUP.md` and the skill require asking the person to choose New project or Existing project, showing the reasons and evidence. Setup cannot route until they answer, so this question is the stop point. After the answer, the next step would be SETUP Step 1 and its approval gate. The choice note goes into `.project/status.md` only with the later approved writes (skill Step 5), so nothing is written now. I did not open `README.md` or `.gitignore`.

### Message to the user at the stop point

> I checked the project before writing anything, and I can't tell whether it is new or existing.
>
> Reason: "The only project files are starter files."
>
> Evidence (file names found):
>
>     .gitignore
>     README.md
>
> Is this a **New project** or an **Existing project**?
>
> I will record your choice and this evidence in `.project/status.md` later, together with the other writes you approve. Nothing has been written yet.

## Project `code`

### Commands, in order (from `<P>/code`)

1. `ls -A . && shasum ai-workflow-portable/SETUP.md ai-workflow-portable/.claude/skills/setup/SKILL.md ai-workflow-portable/ai-framework/workflow/overview.md` (sent together with command 2; all three hashes match `empty`)
2. `node "ai-workflow-portable/ai-framework/scripts/project-state.mts" --root . --json; echo "exit=$?"`

The Step 1 path list reuses the inventory taken from the `empty` copy of the bundle. I did not inventory this copy file by file, and matching hashes of three documents do not prove that the rest of the two bundles is identical. This project's root listing showed only `ai-workflow-portable`, `package.json` and `src`, so none of the Step 1 target paths exists.

### Check output (exact)

```
{"schemaVersion":1,"state":"existing","reasons":["The scan found project files."],"evidence":["package.json","src/app.ts"]}
exit=0
```

### Files created or changed

None.

### Next step after the check, and why

The state is `existing`. The skill says to continue with Step 1 unchanged and to offer no way into a project kickoff; in `SETUP.md` that means Step 1, placing the framework files. Its gate is the first point that needs approval. I did not open `package.json` or `src/app.ts`, since the project scan belongs to Step 4.

### Message to the user at the stop point

> The project check found an **existing** project (`package.json`, `src/app.ts`).
>
> **Step 1: place the framework files.** None of the target paths exists yet, so every path would be created. Nothing would be merged or overwritten, there are no name collisions, and `package.json` and `src/` are not touched by this step.
>
> - `ai-framework/`
> - `.claude/` (includes `settings.json`, which has lifecycle hooks enabled)
> - `AGENTS.md`
> - `CLAUDE.md` (the bootstrap version; Step 4 replaces it)
> - `.opencode/opencode.json`, `.opencode/commands/`, `.opencode/agents/`, `.opencode/plugins/`
> - `.codex/`
> - `.agents/`
> - `.cursor/agents/` and `.cursor/skills/`, mirrored from `.claude/` (I would preview with `node ai-framework/scripts/skill-vendors.mts cursor-mirrors`, then add `--apply`)
>
> `SETUP.md` also lists `.opencode/package.json`, but the bundle does not contain it, so I cannot copy it. The full file list is in Appendix A. I have not written anything yet.
>
> **Approve / Revise / Back / Stop?**

## Unclear, contradictory or impossible instructions

These apply to all three projects unless stated otherwise.

1. **`.opencode/package.json` is missing.** Step 1 says to copy it and Step 7 expects it, but the inspected bundle's `.opencode/` holds only `agents`, `commands`, `opencode.json` and `plugins`. That part of both steps cannot be done. I cannot tell whether this comes from how these test projects were prepared or from the bundle itself.
2. **Agent count.** Step 7 expects `.claude/agents/` to hold 18 agents; the bundle has 16.
3. **Rule count.** "What's in this bundle" and Step 5 say there are 15 rules; `ls ai-framework/rules` shows 17 entries. I did not open the folder to see whether some entries are not rules.
4. **Confirming the root (`empty`, `starter`).** Step 0, item 1 describes the root as where `package.json`, `pyproject.toml`, `go.mod` or `.git` lives. Neither project has any of these, and the text gives no instruction for that case. I used the stated project root. `code` has `package.json`.
5. **Order within Step 0.** The check appears after the numbered list, which includes reading `overview.md`. It must run before Step 1 copies files, but its order relative to that read is not stated. It has no practical effect here.
6. **Two different "Step 1"s.** The skill's routing says "continue with Step 1", and the skill's own Step 1 is the project scan. `SETUP.md` resolves this explicitly, but a reader of only the skill could scan instead of placing files.
7. **"List every path".** The Step 1 gate does not say whether directory-level entries are enough or every file must be listed. A full list runs to several hundred lines. I showed grouped paths and put the file list in Appendix A.
8. **`.cursor/` source.** The bundle ships its own `.cursor/` folder, which "What's in this bundle" does not list, while Step 1 says to build `.cursor/` from `.claude/`. In the inspected copy the file names under `agents` and `skills` match; I did not compare contents.
9. **Preview before the gate.** The `cursor-mirrors` preview uses `ai-framework/scripts/...` at the project root, which exists only after copying. It therefore cannot inform the Step 1 gate when run as written, and the gate's `.cursor/` file list has to be inferred from `.claude/`.
10. **Question format (`starter`).** The preamble requires a confirmation gate for steps that write files, and the workflow uses Approve / Revise / Back / Stop. The New or Existing question has no stated format or Stop option. I asked it as a plain two-way choice.

## Appendix A: Step 1 file list

This list is part of the stop-point message for `empty` and `code`. It was generated from the bundle copy in `empty`. The `.cursor/` entries are the expected mirrors of `.claude/agents` and `.claude/skills`; the preview command has not been run.

```
.agents/skills/add-skill/SKILL.md
.agents/skills/audit/SKILL.md
.agents/skills/build/SKILL.md
.agents/skills/bundle-sync/SKILL.md
.agents/skills/changelog/SKILL.md
.agents/skills/checkpoint/SKILL.md
.agents/skills/cooldown/SKILL.md
.agents/skills/critique/SKILL.md
.agents/skills/dependency-security/SKILL.md
.agents/skills/eval-harness/SKILL.md
.agents/skills/fix/SKILL.md
.agents/skills/impact/SKILL.md
.agents/skills/knowledge-health/SKILL.md
.agents/skills/pitch-compress/SKILL.md
.agents/skills/plan/SKILL.md
.agents/skills/resume/SKILL.md
.agents/skills/search/SKILL.md
.agents/skills/setup-validator/SKILL.md
.agents/skills/setup/SKILL.md
.agents/skills/shape-lite/SKILL.md
.agents/skills/shape/SKILL.md
.agents/skills/ship-pitch/SKILL.md
.agents/skills/state/SKILL.md
.agents/skills/switch/SKILL.md
.agents/skills/sync/SKILL.md
.agents/skills/test-strategy/SKILL.md
.agents/skills/ui-design/SKILL.md
.agents/skills/workflow-doctor/SKILL.md
.claude/agents/appetite-auditor.md
.claude/agents/architect.md
.claude/agents/build-error-resolver.md
.claude/agents/code-reviewer.md
.claude/agents/cross-pitch-conflict-checker.md
.claude/agents/cross-pitch-projector.md
.claude/agents/eval-regression-projector.md
.claude/agents/eval-runner.md
.claude/agents/i18n-checker.md
.claude/agents/knowledge-historian.md
.claude/agents/planner.md
.claude/agents/refactor-cleaner.md
.claude/agents/security-reviewer.md
.claude/agents/skeptic.md
.claude/agents/test-coverage-checker.md
.claude/agents/ux-reviewer.md
.claude/hooks/post-edit-check.mts
.claude/hooks/post-edit-check.test.mts
.claude/settings.json
.claude/skills/add-skill/SKILL.md
.claude/skills/audit/SKILL.md
.claude/skills/build/SKILL.md
.claude/skills/bundle-sync/SKILL.md
.claude/skills/changelog/SKILL.md
.claude/skills/checkpoint/SKILL.md
.claude/skills/cooldown/SKILL.md
.claude/skills/critique/SKILL.md
.claude/skills/dependency-security/SKILL.md
.claude/skills/eval-harness/SKILL.md
.claude/skills/fix/SKILL.md
.claude/skills/impact/SKILL.md
.claude/skills/knowledge-health/SKILL.md
.claude/skills/pitch-compress/SKILL.md
.claude/skills/plan/SKILL.md
.claude/skills/resume/SKILL.md
.claude/skills/search/SKILL.md
.claude/skills/setup-validator/SKILL.md
.claude/skills/setup/SKILL.md
.claude/skills/shape-lite/SKILL.md
.claude/skills/shape/SKILL.md
.claude/skills/ship-pitch/SKILL.md
.claude/skills/state/SKILL.md
.claude/skills/switch/SKILL.md
.claude/skills/sync/SKILL.md
.claude/skills/test-strategy/SKILL.md
.claude/skills/ui-design/SKILL.md
.claude/skills/workflow-doctor/SKILL.md
.codex/agents/appetite-auditor.toml
.codex/agents/architect.toml
.codex/agents/build-error-resolver.toml
.codex/agents/code-reviewer.toml
.codex/agents/cross-pitch-conflict-checker.toml
.codex/agents/cross-pitch-projector.toml
.codex/agents/eval-regression-projector.toml
.codex/agents/eval-runner.toml
.codex/agents/i18n-checker.toml
.codex/agents/knowledge-historian.toml
.codex/agents/planner.toml
.codex/agents/refactor-cleaner.toml
.codex/agents/security-reviewer.toml
.codex/agents/skeptic.toml
.codex/agents/test-coverage-checker.toml
.codex/agents/ux-reviewer.toml
.codex/config.toml
.codex/hooks.json
.cursor/agents/appetite-auditor.md
.cursor/agents/architect.md
.cursor/agents/build-error-resolver.md
.cursor/agents/code-reviewer.md
.cursor/agents/cross-pitch-conflict-checker.md
.cursor/agents/cross-pitch-projector.md
.cursor/agents/eval-regression-projector.md
.cursor/agents/eval-runner.md
.cursor/agents/i18n-checker.md
.cursor/agents/knowledge-historian.md
.cursor/agents/planner.md
.cursor/agents/refactor-cleaner.md
.cursor/agents/security-reviewer.md
.cursor/agents/skeptic.md
.cursor/agents/test-coverage-checker.md
.cursor/agents/ux-reviewer.md
.cursor/skills/add-skill/SKILL.md
.cursor/skills/audit/SKILL.md
.cursor/skills/build/SKILL.md
.cursor/skills/bundle-sync/SKILL.md
.cursor/skills/changelog/SKILL.md
.cursor/skills/checkpoint/SKILL.md
.cursor/skills/cooldown/SKILL.md
.cursor/skills/critique/SKILL.md
.cursor/skills/dependency-security/SKILL.md
.cursor/skills/eval-harness/SKILL.md
.cursor/skills/fix/SKILL.md
.cursor/skills/impact/SKILL.md
.cursor/skills/knowledge-health/SKILL.md
.cursor/skills/pitch-compress/SKILL.md
.cursor/skills/plan/SKILL.md
.cursor/skills/resume/SKILL.md
.cursor/skills/search/SKILL.md
.cursor/skills/setup-validator/SKILL.md
.cursor/skills/setup/SKILL.md
.cursor/skills/shape-lite/SKILL.md
.cursor/skills/shape/SKILL.md
.cursor/skills/ship-pitch/SKILL.md
.cursor/skills/state/SKILL.md
.cursor/skills/switch/SKILL.md
.cursor/skills/sync/SKILL.md
.cursor/skills/test-strategy/SKILL.md
.cursor/skills/ui-design/SKILL.md
.cursor/skills/workflow-doctor/SKILL.md
.opencode/agents/appetite-auditor.md
.opencode/agents/architect.md
.opencode/agents/build-error-resolver.md
.opencode/agents/code-reviewer.md
.opencode/agents/cross-pitch-conflict-checker.md
.opencode/agents/cross-pitch-projector.md
.opencode/agents/eval-regression-projector.md
.opencode/agents/eval-runner.md
.opencode/agents/i18n-checker.md
.opencode/agents/knowledge-historian.md
.opencode/agents/planner.md
.opencode/agents/refactor-cleaner.md
.opencode/agents/security-reviewer.md
.opencode/agents/skeptic.md
.opencode/agents/test-coverage-checker.md
.opencode/agents/ux-reviewer.md
.opencode/commands/add-skill.md
.opencode/commands/audit.md
.opencode/commands/build.md
.opencode/commands/bundle-sync.md
.opencode/commands/changelog.md
.opencode/commands/checkpoint.md
.opencode/commands/cooldown.md
.opencode/commands/critique.md
.opencode/commands/dependency-security.md
.opencode/commands/eval-harness.md
.opencode/commands/fix.md
.opencode/commands/impact.md
.opencode/commands/knowledge-health.md
.opencode/commands/pitch-compress.md
.opencode/commands/plan.md
.opencode/commands/resume.md
.opencode/commands/search.md
.opencode/commands/setup-validator.md
.opencode/commands/setup.md
.opencode/commands/shape-lite.md
.opencode/commands/shape.md
.opencode/commands/ship-pitch.md
.opencode/commands/state.md
.opencode/commands/switch.md
.opencode/commands/sync.md
.opencode/commands/test-strategy.md
.opencode/commands/ui-design.md
.opencode/commands/workflow-doctor.md
.opencode/opencode.json
.opencode/plugins/token-consumption.ts
AGENTS.md
ai-framework/docs/design-notes.md
ai-framework/docs/extending.md
ai-framework/docs/knowledge-graph.md
ai-framework/docs/pipeline.md
ai-framework/docs/setup-validator.md
ai-framework/docs/setup.md
ai-framework/docs/testing.md
ai-framework/docs/token-consumption.md
ai-framework/docs/vendors.md
ai-framework/docs/versioning-and-sync.md
ai-framework/docs/what-you-get.md
ai-framework/docs/workflow-doctor.md
ai-framework/hooks/hooks.json
ai-framework/hooks/scripts/metrics-lock.mts
ai-framework/hooks/scripts/metrics-lock.test.mts
ai-framework/hooks/scripts/opencode-plugin.test.mts
ai-framework/hooks/scripts/orca-start-codex-hook.mts
ai-framework/hooks/scripts/orca-start-codex-hook.test.mts
ai-framework/hooks/scripts/orca-start-hook.mts
ai-framework/hooks/scripts/orca-start-hook.test.mts
ai-framework/hooks/scripts/pre-ship-verify.mts
ai-framework/hooks/scripts/pre-ship-verify.test.mts
ai-framework/hooks/scripts/stuck-uphill-detector.mts
ai-framework/hooks/scripts/stuck-uphill-detector.test.mts
ai-framework/hooks/scripts/token-consumption.mts
ai-framework/hooks/scripts/token-consumption.test.mts
ai-framework/hooks/scripts/token-report.mts
ai-framework/hooks/scripts/token-report.test.mts
ai-framework/hooks/scripts/transcript-usage.mts
ai-framework/hooks/scripts/transcript-usage.test.mts
ai-framework/hooks/scripts/workflow-capture.mts
ai-framework/hooks/scripts/workflow-capture.test.mts
ai-framework/hooks/scripts/workflow-notice.mts
ai-framework/hooks/scripts/workflow-notice.test.mts
ai-framework/integrations/harnesses.md
ai-framework/integrations/orca-vendors.example.json
ai-framework/integrations/orca-vendors.md
ai-framework/integrations/skill-defaults.json
ai-framework/integrations/skill-defaults.md
ai-framework/integrations/skill-vendors.json
ai-framework/integrations/skills.md
ai-framework/integrations/state-report.md
ai-framework/integrations/workflow-metrics.md
ai-framework/rules/boundaries.md
ai-framework/rules/canonical-mirror-sync.md
ai-framework/rules/ci-deployment.md
ai-framework/rules/coding-standards.md
ai-framework/rules/component-architecture.md
ai-framework/rules/context-management.md
ai-framework/rules/data-modeling.md
ai-framework/rules/eval-harness.md
ai-framework/rules/i18n.md
ai-framework/rules/machine-data-format.md
ai-framework/rules/model-routing.md
ai-framework/rules/observability.md
ai-framework/rules/performance.md
ai-framework/rules/security.md
ai-framework/rules/testing.md
ai-framework/rules/tool-use.md
ai-framework/rules/ui-ux-review.md
ai-framework/scripts/add-skill.mts
ai-framework/scripts/add-skill.test.mts
ai-framework/scripts/agent-frontmatter-invariant.test.mts
ai-framework/scripts/browser-runtime.mts
ai-framework/scripts/browser-runtime.test.mts
ai-framework/scripts/bundle-sync.mts
ai-framework/scripts/bundle-sync.test.mts
ai-framework/scripts/changelog.mts
ai-framework/scripts/changelog.test.mts
ai-framework/scripts/command-name-guard.test.mts
ai-framework/scripts/config-migrate.mts
ai-framework/scripts/config-migrate.test.mts
ai-framework/scripts/consolidation-migrate.mts
ai-framework/scripts/consolidation-migrate.test.mts
ai-framework/scripts/docs-links.mts
ai-framework/scripts/docs-links.test.mts
ai-framework/scripts/done-work-index.mts
ai-framework/scripts/done-work-index.test.mts
ai-framework/scripts/entry-import.mts
ai-framework/scripts/entry-import.test.mts
ai-framework/scripts/facts-gather.mts
ai-framework/scripts/facts-gather.test.mts
ai-framework/scripts/facts-project.mts
ai-framework/scripts/facts-project.test.mts
ai-framework/scripts/facts-sql.mts
ai-framework/scripts/facts-sql.test.mts
ai-framework/scripts/flow-join.mts
ai-framework/scripts/flow-join.test.mts
ai-framework/scripts/flow-render.mts
ai-framework/scripts/flow-render.test.mts
ai-framework/scripts/flow-report.mts
ai-framework/scripts/flow-report.test.mts
ai-framework/scripts/graphify-refs.mts
ai-framework/scripts/graphify-refs.test.mts
ai-framework/scripts/graphify-relations.mts
ai-framework/scripts/graphify-relations.test.mts
ai-framework/scripts/graphify.mts
ai-framework/scripts/graphify.test.mts
ai-framework/scripts/installed-upgrade.test.mts
ai-framework/scripts/instruction-loading.test.mts
ai-framework/scripts/ledger-schema.mts
ai-framework/scripts/ledger-schema.test.mts
ai-framework/scripts/legacy-upgrade.mts
ai-framework/scripts/legacy-upgrade.test.mts
ai-framework/scripts/opencode-service.mts
ai-framework/scripts/opencode-service.test.mts
ai-framework/scripts/orca-agent-id.test.mts
ai-framework/scripts/orca-apply.mts
ai-framework/scripts/orca-apply.test.mts
ai-framework/scripts/orca-assign.mts
ai-framework/scripts/orca-assign.test.mts
ai-framework/scripts/orca-contract.mts
ai-framework/scripts/orca-contract.snapshot.json
ai-framework/scripts/orca-contract.test.mts
ai-framework/scripts/orca-diff-admit.mts
ai-framework/scripts/orca-diff-admit.test.mts
ai-framework/scripts/orca-dispatch.mts
ai-framework/scripts/orca-dispatch.test.mts
ai-framework/scripts/orca-eval-grader.mts
ai-framework/scripts/orca-eval-grader.test.mts
ai-framework/scripts/orca-evidence.mts
ai-framework/scripts/orca-evidence.test.mts
ai-framework/scripts/orca-launch-gate.mts
ai-framework/scripts/orca-launch-gate.test.mts
ai-framework/scripts/orca-ledger.mts
ai-framework/scripts/orca-ledger.test.mts
ai-framework/scripts/orca-policy.mts
ai-framework/scripts/orca-policy.test.mts
ai-framework/scripts/orca-preflight.mts
ai-framework/scripts/orca-preflight.test.mts
ai-framework/scripts/orca-reconcile.mts
ai-framework/scripts/orca-reconcile.test.mts
ai-framework/scripts/orca-run.mts
ai-framework/scripts/orca-run.test.mts
ai-framework/scripts/orca-start.mts
ai-framework/scripts/orca-start.test.mts
ai-framework/scripts/outcome-record.mts
ai-framework/scripts/outcome-record.test.mts
ai-framework/scripts/phase-commands.mts
ai-framework/scripts/phase-commands.test.mts
ai-framework/scripts/pitch-archive.mts
ai-framework/scripts/pitch-archive.test.mts
ai-framework/scripts/pitch-compress.mts
ai-framework/scripts/pitch-compress.test.mts
ai-framework/scripts/project-state.mts
ai-framework/scripts/project-state.test.mts
ai-framework/scripts/review-bench.mts
ai-framework/scripts/review-bench.test.mts
ai-framework/scripts/run-tests.mts
ai-framework/scripts/run-tests.test.mts
ai-framework/scripts/runtime/bun.mts
ai-framework/scripts/runtime/cli.mts
ai-framework/scripts/runtime/config.mts
ai-framework/scripts/runtime/config.test.mts
ai-framework/scripts/runtime/data-file.mts
ai-framework/scripts/runtime/data-file.test.mts
ai-framework/scripts/runtime/entry.mts
ai-framework/scripts/runtime/entry.test.mts
ai-framework/scripts/runtime/env.mts
ai-framework/scripts/runtime/invariants.test.mts
ai-framework/scripts/runtime/migrate.mts
ai-framework/scripts/runtime/migrate.test.mts
ai-framework/scripts/runtime/node.mts
ai-framework/scripts/runtime/oex-lock.mts
ai-framework/scripts/runtime/README.md
ai-framework/scripts/runtime/runtime.test.mts
ai-framework/scripts/runtime/select.mts
ai-framework/scripts/runtime/semver-range.fixtures.json
ai-framework/scripts/runtime/semver-range.mts
ai-framework/scripts/runtime/semver-range.test.mts
ai-framework/scripts/runtime/test-helpers.mts
ai-framework/scripts/runtime/test-helpers.test.mts
ai-framework/scripts/runtime/toon-data.mts
ai-framework/scripts/runtime/toon-data.test.mts
ai-framework/scripts/runtime/types.mts
ai-framework/scripts/runtime/upgrade.test.mts
ai-framework/scripts/runtime/validate.mts
ai-framework/scripts/runtime/validate.test.mts
ai-framework/scripts/setup-validator.mts
ai-framework/scripts/setup-validator.test.mts
ai-framework/scripts/skill-compress-guard.mts
ai-framework/scripts/skill-compress-guard.test.mts
ai-framework/scripts/skill-defaults.mts
ai-framework/scripts/skill-defaults.test.mts
ai-framework/scripts/skill-registry.mts
ai-framework/scripts/skill-registry.test.mts
ai-framework/scripts/skill-source.mts
ai-framework/scripts/skill-source.test.mts
ai-framework/scripts/skill-sync.mts
ai-framework/scripts/skill-sync.test.mts
ai-framework/scripts/skill-vendors.mts
ai-framework/scripts/skill-vendors.test.mts
ai-framework/scripts/toon-convert.mts
ai-framework/scripts/toon-convert.test.mts
ai-framework/scripts/workflow-contracts.test.mts
ai-framework/scripts/workflow-doctor.mts
ai-framework/scripts/workflow-doctor.test.mts
ai-framework/scripts/workflow-metrics-report.mts
ai-framework/scripts/workflow-metrics-report.test.mts
ai-framework/scripts/workflow-metrics-state.mts
ai-framework/scripts/workflow-metrics-state.test.mts
ai-framework/scripts/workflow-metrics.mts
ai-framework/scripts/workflow-metrics.test.mts
ai-framework/scripts/workspace-report.mts
ai-framework/scripts/workspace-report.test.mts
ai-framework/templates/ai_workflow_env.example.json
ai-framework/templates/ai-workflow.example.toon
ai-framework/templates/project/analysis/README.md
ai-framework/templates/project/context/README.md
ai-framework/templates/project/design/decisions/template.md
ai-framework/templates/project/design/plans/rollback-template.md
ai-framework/templates/project/design/plans/template.md
ai-framework/templates/project/design/template.md
ai-framework/templates/project/design/wireframes/template.md
ai-framework/templates/project/done-work.md
ai-framework/templates/project/knowledge/README.md
ai-framework/templates/project/knowledge/templates/decision.md
ai-framework/templates/project/knowledge/templates/entity.md
ai-framework/templates/project/knowledge/templates/issue.md
ai-framework/templates/project/knowledge/templates/pattern.md
ai-framework/templates/project/pitches/_archive/.gitkeep
ai-framework/templates/project/pitches/_parked/.gitkeep
ai-framework/templates/project/pitches/_templates/hill.md
ai-framework/templates/project/pitches/_templates/pitch.md
ai-framework/templates/project/pitches/_templates/plan.md
ai-framework/templates/project/records/shipped/_template.md
ai-framework/templates/project/records/shipped/.gitkeep
ai-framework/templates/project/reports/README.md
ai-framework/templates/project/requirements/bugs/template.md
ai-framework/templates/project/requirements/features/template.md
ai-framework/templates/project/rules/README.md
ai-framework/templates/project/runs/README.md
ai-framework/templates/project/status.md
ai-framework/templates/shipped-files.txt
ai-framework/workflow/overview.md
ai-framework/workflow/phases/0-shape.md
ai-framework/workflow/phases/1-plan.md
ai-framework/workflow/phases/2-build.md
ai-framework/workflow/phases/3-audit.md
ai-framework/workflow/phases/4-ship.md
ai-framework/workflow/phases/5-cooldown.md
ai-framework/workflow/relations.toon
CLAUDE.md
```
