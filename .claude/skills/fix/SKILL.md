---
name: fix
description: Entry point for the bug-fix workflow. Searches knowledge for similar issues, confirms reproduction and root cause, then runs the bug-fix variant of /build → /audit → /ship. Use for known bugs with clear reproduction steps.
---

# /fix — Bug-Fix Entry

> **Recommended capability profile:** use `fast` for a simple bug with a clear reproduction; use `standard` for an unknown root cause or multi-file fix. Select an available model using `ai-framework/integrations/harnesses.md`.

> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.js resolve-mode --phase utility --args-text "$ARGUMENTS"` (pass the raw, unparsed invocation text — the script extracts a `caveman=<mode>` token if present and ignores everything else; no `caveman=` mention is not an error, it just falls through to the instance/bundle default). If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this skill's other instructions; pass the same resolved mode to any subagent this skill dispatches. If not installed, proceed normally — this is optional, never required.

`/fix` is the front door to the **bug-fix variant** in `ai-framework/workflow/overview.md`:

```
/fix (triage) → /build (single implicit scope) → /audit → /ship
```

It skips `/shape` and `/plan`; the bug report *is* the plan.

## 1. Triage (gated)

1. Get the bug description and reproduction steps — ask if missing.
2. **Search knowledge first**: traverse `.project/knowledge/graph.json` (tag index, then `issues/` entries) for similar symptoms or root causes. If one matches, show its root cause and solution and ask whether it looks related.
3. Locate the affected code and state the root cause (or the leading hypothesis, labelled as such).
4. Create `.project/pitches/fix-{slug}/log.md` with the 3-line entry: symptom, root cause, planned fix. Add a row to `.project/status.md` → Active pitches (appetite `bug-fix`, phase `build`).

**Gate:** confirm the bug understanding and root cause — Approve / Revise / Back / Stop.

## 2. Build → Audit → Ship

Hand off to `/build` in its bug-fix variant (see `ai-framework/workflow/phases/2-build.md` → "Bug-fix variant"): minimal fix in the correct layer (`ai-framework/rules/boundaries.md`), a regression test that fails before and passes after, full test suite and `<build-command>` green, evidence pasted. The three-strike rule applies. Then `/audit` (bug-fix gate: auto if clean) and `/ship`, which extracts the bug into `knowledge/issues/` if it is novel.

## Agent recommendations

| Condition | Agent | Profile |
|-----------|-------|---------|
| Unknown root cause, systemic issue | `architect` | deep |
| Build/type errors after the fix | `build-error-resolver` | standard |
| Dead code or unused imports left by the fix | `refactor-cleaner` | fast |

## When NOT to use /fix

Go through `/shape` instead if the bug needs schema/data-model changes, spans multiple components, has an unclear root cause after triage, needs architectural refactoring, or the fix will exceed ~50 changed lines.
