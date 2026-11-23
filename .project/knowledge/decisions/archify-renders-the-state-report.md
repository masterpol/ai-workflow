---
id: archify-renders-the-state-report
type: decision
status: accepted
created: 2026-11-23
updated: 2026-11-23
tags: [state-report, archify, skills, rendering, supply-chain]
related: [project-state-report-design, a-report-over-an-untrusted-tree-runs-only-bundle-code, parse-untrusted-values-and-re-emit-them, a-report-never-overwrites-a-file-it-did-not-write, package-less-bundle-ship-wrapper-cannot-select-checks]
alternatives: [hybrid-keep-facts-layer, trimmed-vendored-copy]
applies-to: [state, add-skill, ship]
source: archify-replaces-state
---

# Decision: `/state` is a fact collector plus the pinned Archify skill, not a bundled renderer

## Summary

`/state` gathers facts with `ai-framework/scripts/facts-gather.mts` and lets the installed Archify skill (tt-a1i/archify v3.3.0, commit `af3aaf3c`, Apache-2.0) validate and render the page; the roughly 10,000 lines of snapshot, theme, structure and AI-fragment code were deleted.

## Context

The old `/state` was a bespoke snapshot, themed renderer and AI-fragment checker the bundle had to maintain. The owner chose a full replace over keeping the facts layer. Archify is a diagram and explainer renderer: it has no notion of pitches, knowledge, tokens or a facts snapshot, so the facts layer had to be rebuilt.

## Decision

- **Full replace**, not hybrid. Accepted losses: the `state.json` contract, evidence and number-binding checks on AI text, theme extraction, the folder-structure diagram, and the project, database, runs, metrics and token sections. Token and time figures come from the token report.
- **Install as-is, pinned.** The package is 22.5 MiB of `add-skill`'s 25 MiB cap and the upstream history is about 1.9 GB. No vendored or trimmed copy (the pitch's no-go held). Archify is instance data like caveman: git-ignored, never shipped by bundle-sync, so `/state` stops after the facts preview when it is absent.
- **Run it narrowly.** Only `validate` and `deliver` for `explainer`, with `ARCHIFY_UPDATE_CHECK_DISABLED=1`. Its own skill text defaults to making pages unasked and to editing a global rules file; the playbook disclaims both.
- **Facts stay ours and untrusted.** Every number in the page comes from the collector; every captured string is redacted and made inert for Archify's markup. Archify rejects raw HTML and `javascript:` links instead of sanitizing, so a failing `validate` is a failed `/state`.
- **Safety lessons of [[project-state-report-design]] still bind**: bounded reads, symlink refusal at every path segment, no project code run, atomic writes that never create a directory behind a link.

## Consequences

- **Pros**: about 10,000 fewer maintained lines; a maintained renderer with exports and themes.
- **Cons**: a third-party dependency with a 10% size margin under the install cap; the loss of per-fact checking on any model-written text; every host must install Archify to get the page.
- **Implications**: `flow-report.mts` still reads an optional `state.json` history nothing writes now (followup); bumping the pinned revision needs a size re-check.

## Delivered scopes, no-gos and rabbit holes (kept when the pitch folder was compacted, 2026-11-23)

**Scopes (all shipped, one session).** S1 validated Archify v3.3.0 (verdict KEEP, conditional; full write-up in `.project/analysis/2026-11-23-archify-v3.3.0-validation.md`). S2 swapped `/state` onto a new `facts-gather.mts` plus the pinned skill. S3a deleted 25 `state-*.mts` scripts and 3 eval datasets. S3b pruned references and added the installed-project prune test. Deviation: S3 was split in two so a failing suite after the deletion points at a missing consumer, and three consumer tests moved forward from S3b.

**No-gos honored.** No vendored or forked Archify (it is installed from the pinned commit into git-ignored instance data); no floating install and no auto-update at report time; the report never edits `status.md`, `runs/` or pitch records; no second renderer kept; no AI-prompt scope (the draft's text comes from the collector). One owner-approved exception: five shipped outcome records had their `code:` link retargeted, because the graph refuses missing link targets.

**Rabbit holes.** Resolved: install footprint (22.5 MiB of the 25 MiB cap, installed as-is by owner choice), untrusted input (Archify rejects raw HTML and `javascript:` links; the collector makes captured text inert), vendor wrappers git-ignored, update check off, metrics page dropped, facts rebuilt as panels. Surfaced and resolved: the `add-skill` link check mis-read inline code ([[a-link-check-that-strips-code-with-one-regex-can-hide-links]]); shipped records block deletion of the files they cite ([[deleting-a-file-breaks-shipped-outcome-records-that-link-to-it]]). Open: `flow-report.mts` reads a `state.json` history nothing writes; a live `/state` run on OpenCode, Codex and Cursor.

**Verification at ship.** Full suite 2087 pass, 0 fail, 3 skipped; setup-validator, workflow-doctor, graph, relations and changelog checks pass; audit cycle 1 had 0 must-fix and 11 should-fix fixed (`.project/analysis/2026-11-23-archify-replaces-state-audit.md`), not independently re-reviewed.

