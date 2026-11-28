---
id: a-leftover-opencode-service-stalls-the-workflow-doctor
type: issue
created: 2026-11-27
updated: 2026-11-27
confidence: medium
tags: [opencode, doctor, testing, orca]
related: [a-wall-clock-ratio-test-can-block-a-ship-under-load, a-headless-cli-follows-pwd-not-the-process-cwd]
source: greenfield-kickoff
severity: medium
resolved: false
---

# Issue: a leftover OpenCode service stalls the workflow doctor

## Summary
A background OpenCode service left by reviewer workers made the full verifier fail on a timing test.

## Symptoms
- The setup validator's linear-time test took 15.2 s against a 10 s limit, also when its file ran alone.
- The workflow doctor took 16 s in an empty folder.
- The code under test had not changed.

## Root Cause
The doctor runs `opencode debug config`. It hung until its 15 s limit while `opencode serve --service` held the port. Observed once.

## Solution
After confirming that no worker or live attempt was using it, `node ai-framework/scripts/opencode-service.mts free --json`. The test then took under 1 s.

## Prevention
- Free the port after the last OpenCode worker is released, not only before the first launch.
- When a timing test fails with unchanged code, time the external commands it calls before changing the limit.
