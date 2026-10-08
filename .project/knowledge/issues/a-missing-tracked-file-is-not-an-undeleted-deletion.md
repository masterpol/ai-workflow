---
id: a-missing-tracked-file-is-not-an-undeleted-deletion
type: issue
created: 2026-10-08
updated: 2026-10-08
tags: [workflow-tooling, git, recovery, discipline]
related: [checks-on-doc-structure-name-the-owning-file, installed-skill-wrappers-ship-as-orphans, hardening-a-shared-reader-made-its-writer-destructive]
source: fix-orca-dispatch-resume-gate
severity: medium
resolved: true
---

# Issue: a missing tracked file is not an undeleted deletion

## Summary

When a test or a `git diff` reported that `.env.example` was missing, I ran `git show HEAD:.env.example` and recreated the file. CHANGELOG 2.18.0 had already recorded that the file was replaced by `ai_workflow_env.example.json`, the test fixture had been updated to the new name, and the `.gitignore` line for the new file was in place. The recreation contradicted a recorded decision and was only noticed at the changelog step, after `/verify` had already passed.

## Symptoms

The recreated `.env.example` shadowed the new tracked template; a reader following the README link to `ai_workflow_env.example.json` would find an old `.env`-shaped template at the old path instead. The test failure that motivated the recreation (an ENOENT for `.env.example` in `orca-preflight.test.mts`'s fixture) was actually caused by the staged `workflow-doctor.mts` "Workflow settings" check running against a fixture that did not write a settings file — a separate issue, with a different fix.

## Root Cause

A test or `git diff` that says a file is missing is evidence about *this* tree, not a record of intent. The branch had decided, in a recorded and committed note, that this file was gone. I treated the evidence as a request to undo that decision, with no further check.

This is a small instance of the broader "trusted-by-the-ocean" failure: a tool's output was trusted above the recorded decision, and the gap was discovered only at the next gate rather than at the tool's output itself.

## Solution

The recreated file is deleted again; the change to `stack.md` (the only genuine stale-doc issue) is the only thing that ships. The mistake is written up here so the next session sees it.

## Prevention

- When a test or a `git diff` reports a missing tracked file, check the recorded decision (CHANGELOG, README link, `.gitignore`) before restoring anything.
- A `git show HEAD:<file>` "restore" is a deletion of intent unless paired with a check that the deletion was never recorded.
- The `/verify` gauntlet does not include a check for "the pitch made a decision that contradicts a recorded one"; consider adding one whenever a tracked file is rewritten wholesale rather than edited.
- Related: [[checks-on-doc-structure-name-the-owning-file]], [[hardening-a-shared-reader-made-its-writer-destructive]].