---
id: reviewer-reports-contradicted-by-measurement
type: issue
created: 2026-09-25
updated: 2026-09-25
tags: [audit, subagents, verification, process]
related: [async-agent-launch-hook-counted-as-completion, a-gate-must-not-trust-its-own-author]
source: project-state-report
severity: medium
resolved: true
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
- Related: [[async-agent-launch-hook-counted-as-completion]], [[a-gate-must-not-trust-its-own-author]].
