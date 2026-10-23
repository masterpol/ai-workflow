---
id: node-strip-only-mode-rejects-constructor-parameter-properties
type: issue
created: 2026-10-20
updated: 2026-10-20
tags: [node, typescript, strip-types, runtime, build]
related: [a-version-migrator-edits-the-token-not-the-model, reviewer-reports-contradicted-by-measurement]
source: state-fragment-sanitizer
severity: low
resolved: true
confidence: medium
---

# Issue: Node's strip-only TypeScript mode rejects constructor parameter properties

## Summary

The bundle runs `.mts` files directly on Node with `--experimental-strip-types`. That mode only
erases types; it does not transform syntax. A TypeScript constructor parameter property
(`constructor(private readonly reason: Reason) {}`) is a *transform*, not an annotation, so the
file failed to load with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` before any test ran.

## Symptoms

- The test file failed at import time with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`.
- No assertion ran, so the failure looked like a broken test rather than a broken module.
- The same code is valid TypeScript and would compile under a real transpiler, which is exactly
  why the mistake survived review.

## Root cause

Type-erasure-only execution accepts erasable syntax only. `private`/`public` parameter
properties, `enum` with runtime meaning, namespaces and parameter decorators all need emit.

## Solution

Declare the field explicitly and assign it in the constructor body. The next run passed all
110 tests present at the time.

## Prevention

- In this repo, write erasable-only TypeScript in `ai-framework/**/*.mts`: explicit field
  declarations, `as const` over `enum`, `import type` for type-only imports.
- When a test fails before its first assertion with a module-level error, check the module's
  syntax against strip-only mode before reading the assertions.
- Remember that the failure mode is "nothing ran" — never report such a run as a test failure
  of the logic ([[reviewer-reports-contradicted-by-measurement]]).
