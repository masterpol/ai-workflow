---
id: orca-policy
type: entity
created: 2026-10-18
updated: 2026-10-18
tags: [orca, policy, configuration, service]
related: [orca-auto-start-design, status-dispatch-ready-false-is-not-launch-authority, verify-run-binding-before-orca-dispatch, opt-in-before-runtime-discovery]
source: knowledge-health-audit
---

# Entity: Orca Policy loader (`.project/orchestration.json`)

## Summary

The script that loads, validates, and reports on the project's local Orca orchestration policy
file (`.project/orchestration.json`, max 64 KB). Owns the opt-in switch, the per-role worker
pools, and the concurrency/retries limits that the Orca coordinator reads on every dispatch.
Refuses symlinks, missing files, malformed JSON, unsupported schema versions, and the
explicitly-disabled state with a single typed status; never throws or destructively rewrites.

## Location

- Main script: `ai-framework/scripts/orca-policy.mts`
- Policy file: `.project/orchestration.json`
- Migrated config: `ai-workflow.toon` (schemaVersion 3, `integrations.orca.multiAgent` opt-in)

## Responsibilities

- Read the policy file with the workflow's "refuse symlinks, bounded read" guard; never follow
  a symlinked `.project/orchestration.json` and never read more than `MAX_POLICY_BYTES`.
- Validate `schemaVersion === 1`; the `use-orca-orchestration` opt-in flag (must be explicit);
  the per-vendor coordinator block (claude, codex, opencode); `pools` (ordered worker list per
  role) and the back-compat `roles` shape (first member of each pool).
- Surface one of `missing | refused | malformed | unsupported-schema | disabled | valid`
  with the policy attached on success.
- Report through `workflow-doctor` so an install that has an absent, broken, or disabled
  policy is flagged with the fix instruction (copy the example, run `config-migrate`, or set
  `use-orca-orchestration: true`).

## Dependencies

- Depends on: `ai-framework/scripts/runtime/config.mts` (TOON loader), `node.mts` (deferred
  `RuntimeDeps`), and the standard "refuse symlink, bounded read" helpers.
- Used by: `ai-framework/scripts/workflow-doctor.mts` (policy report), `orca-run.mts` (start
  gate), and every phase that dispatches through Orca.

## Key APIs

```typescript
export const POLICY_FILE = ".project/orchestration.json";
export const MAX_POLICY_BYTES = 64 * 1024;
export const VENDORS: readonly string[] = ["claude", "codex", "opencode"];

export interface PolicyResult { status: Status; policy?: Policy }
export function loadPolicy(root: string, deps: RuntimeDeps): PolicyResult;
```

## Interactions

```
.ai-workflow.toon (multiAgent: true)
        │
        ▼
config-migrate.mts ──writes──▶ .project/orchestration.json
                                       │
                                       ▼
                              orca-policy.mts
                                       │
                                       ▼
                       orca-run.mts (start gate)
                                       │
                                       ▼
                       workflow-doctor.mts (report)
```

## Notes

- The policy is intentionally small (≤64 KB) and human-editable; agents may read and edit it.
- `use-orca-orchestration: false` is the safe default; nothing dispatches through Orca until
  the project opts in (matches `opt-in-before-runtime-discovery`).
- The `pools` field is the authoritative source; `roles` is kept only for back-compat
  consumers that read the first member.
- A newer `schemaVersion` is `unsupported-schema` until `orca-policy.mts` itself bumps the
  accepted range.
