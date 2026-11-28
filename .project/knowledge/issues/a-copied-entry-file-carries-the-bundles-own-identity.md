---
id: a-copied-entry-file-carries-the-bundles-own-identity
type: issue
created: 2026-11-27
updated: 2026-11-27
confidence: high
tags: [setup, publishing, instance-data, validation, trust-boundary]
related: [installed-skill-wrappers-ship-as-orphans, a-gate-must-not-trust-its-own-author]
source: fix-install-inherits-bundle-identity
severity: high
resolved: true
---

# Issue: a new install kept this bundle's own project description and passed validation

## Summary
Setup copies the bundle's `AGENTS.md` and `CLAUDE.md`, and told the installer to extend them, so the bundle's "Project specifics" stayed in new projects.

## Symptoms
- A fresh install described `ai-workflow-portable` as its own product, with its stack and verification commands.
- `setup-validator` reported both files complete.

## Root Cause
The validator checked only that the section heading existed and the placeholder was gone. Two test fixtures modelled a finished install by copying the bundle's own files, so the tests agreed with the bug.

## Solution
Fail an install that still carries the bundle's identity sentence, pin that sentence to the bundle's files with a test, and say "replace" in the setup instructions.

## Prevention
- A completeness check must reject the shipped template's own content, not only its placeholder.
- A "completed install" fixture must change what a real setup changes.
- A file's presence does not prove which checkout you are in: a project can have its own `SETUP.md`. Test content that only the bundle writes. The first version of this fix used presence and the audit bypassed it.
