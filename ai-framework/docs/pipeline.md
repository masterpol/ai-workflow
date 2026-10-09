# The pipeline

← [Back to README](../../README.md)

```
(brainstorm) → /shape → /critique → bet → /plan → /build → /audit → /ship
                                                            every 5 ships → /cooldown
```

| Phase | Does | Capability profile |
|-------|------|--------------------|
| shape | frame problem, appetite, rabbit holes, no-gos | deep |
| critique | pre-bet red-team | fast + standard |
| plan | independent scopes with machine-checkable exits | deep / standard |
| build | execute, hill-tracked, verify-before-done | standard |
| audit | review / security / test / ux / i18n / eval fan-out | standard |
| ship | reconcile, extract knowledge, compact status | fast |
| cooldown | issue→pattern→rule promotion, prune, triage | standard |

Full mechanics — workflow variants (big-batch/small-batch/bug-fix/hotfix), the adaptive gate
matrix, hill-chart positions, multi-pitch parallel work — live in
`ai-framework/workflow/overview.md`; per-phase detail in `ai-framework/workflow/phases/*.md`.

## Beyond the core pipeline

`.claude/skills/` ships more than the 7 pipeline phases — every one of them is a native command
in every supported vendor, not just Claude Code (see [One source, every vendor](vendors.md)):

| Category | Skills |
|---|---|
| Core pipeline | `shape`, `critique`, `plan`, `build`, `audit`, `ship`, `cooldown` |
| Navigate & maintain | `search`, `resume`, `switch`, `checkpoint`, `workflow-doctor`, `setup-validator`, `dependency-security`, `knowledge-health`, `impact`, `fix` |
| Bundle maintenance | `changelog` (this repo only — version-log an improvement), `bundle-sync` (target projects — pull structural updates from a newer source checkout) |
| Engineering depth | `eval-harness`, `test-strategy`, `ui-design` |
| Integrations | `sync` (Notion task sync) |

---

See also: [vendors](vendors.md) · [knowledge-graph](knowledge-graph.md) · [extending](extending.md)
