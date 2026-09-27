---
id: false-cross-pitch-attribution-in-a-shared-uncommitted-file
type: issue
created: 2026-09-27
updated: 2026-09-27
tags: [cross-pitch, verification, false-positive, workflow-tooling]
related: [reviewer-reports-contradicted-by-measurement, a-gate-must-not-audit-its-own-instrument]
source: independent-rereview-catch-up
status: resolved
---

# Issue: a cross-pitch-conflict-checker cannot separate authorship in a file two uncommitted pitches share

## What happened

This project's convention is to commit only when the user asks, so several active pitches can have
uncommitted edits to the same file at once, layered together in the working tree with no diff boundary
between them. During `/audit`, a `cross-pitch-conflict-checker` dispatch read `token-consumption.js` (which
this pitch's S2 and the concurrent `collector-robustness` pitch had both edited) and reported that this
pitch's S2 slice had "implemented `collector-robustness`'s intended lock and identity changes despite audit
instruction to skip them" — a specific, plausible-sounding, wrong claim. It was refuted in minutes: this
pitch's own S2 prompt file, written and sha256-hashed before any S2 fix was made, already read "another
pitch is rewriting exactly those [functions]" in the present tense, and the other pitch's own `deviations.md`
independently described authoring that exact logic. The checker had no way to tell "this code is in the
file right now" apart from "this pitch's dispatch wrote this code" — it isn't a diff against a common
ancestor, because there is no clean ancestor to diff against when both edits are uncommitted.

## Root Cause

`git diff` (and any tool built on it) over an uncommitted shared file shows the *combined* result of every
session that has touched it since the last commit, not a per-author diff. A cross-pitch-conflict-checker
reasoning from that combined diff will attribute code to whichever pitch it's told to think about, because
nothing in the file distinguishes the two authors.

## Fix

None to the tool — this is a property of the git model, not a bug. The mitigation is procedural: **before
a cross-pitch finding enters must-fix, check it against something that predates the dispute** — the accused
pitch's own prompt files (if written and hashed before the disputed fix), its own review/build records, or
the *other* pitch's own deviations/log, all of which have their own independent timestamps and authorship.
Here, both existed and were decisive within one command's worth of `grep`.

## Prevention

- When dispatching a `cross-pitch-conflict-checker` over a file with concurrent uncommitted edits, tell it
  up front that authorship cannot be inferred from the diff alone, and ask it to name *what* overlaps
  (functions, line ranges) rather than assert *who wrote what*.
- Before triaging any of its findings as must-fix, re-check against a source with its own independent
  timestamp (a prompt file's content hash, the other pitch's own record) — the same "verify before triage"
  discipline `3-audit.md` already requires for every other kind of finding.

## Related Patterns

[[reviewer-reports-contradicted-by-measurement]], [[a-gate-must-not-audit-its-own-instrument]].
