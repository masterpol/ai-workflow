---
id: substring-hook-wiring-check-accepts-echoed-commands
type: issue
created: 2026-10-08
updated: 2026-10-08
tags: [validation, hooks, shell]
related: [parse-untrusted-values-and-re-emit-them]
source: codex-orca-coordinator-parity
severity: low
resolved: true
confidence: low
---

# Issue: Substring hook wiring check accepts echoed commands

The first Codex doctor check looked for Node flags, an adapter path and trusted-root text anywhere in a command. An `echo` containing all those strings passed even though it did not start the hook. A scratch regression expecting failure reproduced the incorrect pass.

The fix recognizes the exact supported inline invocation or an anchored guarded Git assignment followed by the exact invocation. Echoes, comments and trailing shell commands fail; existing inline and installed guarded registrations pass. This is structural validation only; trusted host activation remains a separate unverified case.

Evidence: workflow-doctor.mts checkCodexStartupWiring, its shell-text and installed-registration tests, codex-orca-coordinator-parity audit-cycle-2.md. The guard regression failed before the fix and passed after it under Node and Bun.
