---
id: mandatory-config-files-emit-one-top-level-failure
type: pattern
created: 2026-10-16
updated: 2026-10-16
tags: [validation, doctor, configuration, gates]
related: [a-gate-must-not-trust-its-own-author, a-gate-must-not-audit-its-own-instrument]
source: agent-model-sweep
---

# Pattern: Mandatory config files emit one top-level failure, not N per-consumer failures

## Summary

When a config file is mandatory for a downstream check (a doctor's agent loop, a build's
capability table, a runtime's feature flag), the failure path must emit **one** top-level
check record that names the fix. Per-consumer checks that reference the missing config
should demote to `warn` (or skip entirely) so a first install sees one clear "copy this file"
message instead of 16+ cascading failures.

## The Pattern

```typescript
// 1. One top-level mandatory check, wired into the parallel validate() list.
async function checkToonMandatory() {
  const result = loadConfig(root, deps);
  if ("status" in result && result.status === "missing") {
    record("fail", "ai-workflow.toon (mandatory)", "<file> is absent and is mandatory: <one-sentence-fix>. Copy <path> from <example>.");
    return;
  }
  // ... other failure branches ...
  record("pass", "ai-workflow.toon (mandatory)", "<file> present, schemaVersion N, <block> complete");
}

// 2. Per-consumer checks reference the mandatory check, not the raw file.
async function checkAgent(name) {
  const models = await loadModelsBlock();
  if (!models) {
    // Demote to warn: the mandatory check above already recorded the single fail.
    record("warn", CONFIG_FILE, `<file> is absent or has problems; cannot validate ${name}. The "<mandatory-check-name>" check above names the fix.`);
    return;
  }
  // ... rest of the check ...
}
```

## When to Use

- A config file is a hard dependency for a doctor / validator / build to function.
- The config file's absence causes N downstream checks to fail (one per consumer).
- A first-install developer would benefit from one clear "copy this file" instruction instead
  of N cascading failures that obscure the root cause.

## When NOT to Use

- The config is optional (use `info` instead of `fail`).
- The N cascading failures are *meaningful per-consumer context* (e.g. per-agent validation that
  needs to name the specific agent that could not be validated). In that case, keep the
  per-consumer `fail` and skip the top-level mandatory check.
- A single consumer reads the config; the per-consumer failure is already a single message.

## Examples in Codebase

- `ai-framework/scripts/workflow-doctor.mts:757-797` — `checkToonMandatory()` (top-level fail)
  + `checkAgent:819-823` (per-agent warn when the toon is absent).

## Related Patterns

- `a-gate-must-not-trust-its-own-author` — the mandatory check is the independent witness; the
  per-consumer checks are not.
- `a-gate-must-not-audit-its-own-instrument` — the doctor (the consumer) does not own the
  toon (the instrument); the toon is authoritative.
