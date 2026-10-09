---
id: a-gate-spawns-exactly-what-it-probed
type: pattern
created: 2026-10-08
updated: 2026-10-08
tags: [security, subprocess, gates]
related: [a-gate-must-not-trust-its-own-author, opt-in-before-runtime-discovery, resolve-config-only-from-trusted-root]
source: orca-vendor-dispatch
---

# Pattern: a launch gate spawns exactly the executable and role it verified

## Summary

A gate that proves one thing (the probed Orca binary, a coordinator's eligibility) and then lets the caller choose
another (a different launcher, the coordinator as its own worker, free-text flags) proves nothing. Security review of
the dispatch core found all three.

## The Pattern

- The gate returns the executable it probed; the spawn uses that value and refuses a caller-supplied different one.
- Authority is per pair: the coordinator selects the policy entry, and the worker must be listed in it.
- Flags come from a typed allow-list with value grammars, never free text; the task brief starts with plain text so
  a parser cannot read it as a flag.
- Re-read policy and re-probe on every launch, never cache; put the user-facing opt-in switch
  (`AI_WORKFLOW_ORCA_MULTI_AGENT`) first so nothing is read or spawned when it is off.
- Adapters must give the gate real signals: `errorCode` for timeout and overflow, a deadline that a grandchild holding a
  pipe cannot extend.
