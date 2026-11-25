---
id: prove-ownership-by-shipped-content-before-removing-a-renamed-file
type: pattern
created: 2026-11-25
updated: 2026-11-25
tags: [bundle-sync, upgrade, deletion, ownership, security, fail-closed]
related: [pin-the-descriptor-you-hashed-before-removing-or-replacing, a-report-never-overwrites-a-file-it-did-not-write, a-workflow-command-can-be-shadowed-by-a-host-built-in]
source: rename-ship-command-to-finish
confidence: low
---

# Pattern: remove a renamed bundle file automatically only when its bytes are ones you shipped

## Summary
A rename leaves the old file in every installed project, where it can break checks. Deleting it automatically needs proof that it is yours. A sync receipt or a chosen
base ref is **project data**: it can vouch for any file, including the owner's own skill at the same path.

## The Pattern
- **Proof is an inventory of content hashes the bundle actually shipped** (from its history). Anything else, including a one-byte or line-ending change, stays.
- **Require evidence of the rename** in the source (the new file exists). A partial source that merely lacks the old path removes nothing.
- Read through a pinned descriptor, refuse links, then re-check identity **and bytes** with no `await` before the unlink; write down the remaining path window.
- **Never clean parent folders recursively**: a non-recursive `rmdir` cannot take a file that appeared meanwhile.
- Match protected paths **ignoring case**, so another spelling cannot reach a weaker deletion path.
- The dry run lists what will be deleted; one failed removal must not lose the record of the others; advice about a kept file must not tell anyone to delete through a link.
- Test each protection with an injected race and show that removing it fails a test: one race test first injected too early and proved nothing.

## What happened
The first version trusted "unchanged since the last sync". A security review deleted a customized file, a user's own skill and a file outside the project in temporary repositories.
An old-project upgrade test had shown why removal was needed at all: leftover files failed the upgraded project's doctor and graph.
