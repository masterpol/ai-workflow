---
id: reviewer-reports-contradicted-by-measurement
type: issue
created: 2026-09-25
updated: 2026-10-21
tags: [audit, subagents, verification, process]
related: [async-agent-launch-hook-counted-as-completion, a-gate-must-not-trust-its-own-author, a-caller-supplied-limits-object-can-defeat-a-hard-cap]
source: project-state-report
severity: medium
resolved: true
confidence: high
---

# Issue: a subagent's audit report contained numbers and names the code and the test run contradicted

## Summary

The test-coverage subagent reported 100% line/branch/function coverage (measured 99.3% / 90.8%),
cited a `NEVER_READ` allowlist that does not exist, and listed `FIELD_LIMIT` and the file-count bound
as untested (mutation showed both were caught). The code-review subagent returned "one must-fix"
after three tool calls. Three of four first-cycle reviewers died on a rate limit and two stalled on
the watchdog; only a fresh security agent with strict step limits completed.

## Symptoms

A confident, well-formatted report whose specifics did not match the code or the coverage output.
Its one genuine finding (an untested 1 MB read bound) was correct, so the report as a whole looked
trustworthy.

## Root Cause

A small model summarizing tool output it partly did not run, writing plausible detail. The audit
skill's "verify before triage" rule is what caught it; there is no automatic check.

## Solution

Re-ran the cited command, the coverage measurement, and every mutation in a scratch copy before
triaging each claim; recorded the discrepancies in `audit-cycle-1.md`.

## Prevention

- Treat every specific in a subagent report (a name, a line, a percentage) as a claim to re-check
  with one command before it enters triage.
- A short or fast "clean" review is an unreviewed area, not a pass.
- For long-running review work, give the agent hard limits (each command under ~20 s, final report
  within N tool calls); a stalled agent leaves no partial findings in its output file.
- A worker's *completion report* is a claim like any other: the sanitizer's S8 worker wrote that
  canonical output never equals the input and that no module imports the library, and both
  statements were false against the code it had just written.
- A canary is a planted defect, so a reviewer that reports it is not evidence of a real defect:
  re-read the live guard before triaging the finding.
- Related: [[async-agent-launch-hook-counted-as-completion]], [[a-gate-must-not-trust-its-own-author]],
  [[a-caller-supplied-limits-object-can-defeat-a-hard-cap]].

## Additional evidence — 2026-10-21

Capture audit recurrence (2026-10-21): a reviewer claimed absent/duplicate/unexpected-event wiring cases lacked tests. The tests already existed at workflow-doctor.test.mts:942-977; the coordinator reran all four successfully and dropped the claim. Scratch-only canary failures were also kept separate from source findings.

## Recurrence: token-time-report (2026-10-21)

A reviewer claimed contract files were absent although they existed in its scratch packet. Required checks remained incomplete until an owner-approved bounded pass supplied visible-root and inline contracts. Two later source citations were misnumbered: automated canary citation matching failed, while explicit defect descriptions and executed POCs detected the planted predicate omission. The coordinator preserved raw reports, corrected locations and distinguished manual detection from automated matching.

A cap mutant raised readText's maxBytes to 1e12; readText allocates maxBytes+1, so its test failures were allocation-confounded. Those claims were discarded. A finite 4MiB-to-8MiB author-run mutant instead failed at the intended oversized-source reason assertion. Do not promote the corrected author run to independent reviewer execution. Confidence remains at the high ceiling; the issue is recurrent, and measurement-before-triage remains the resolution.
