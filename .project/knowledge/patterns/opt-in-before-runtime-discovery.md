---
id: opt-in-before-runtime-discovery
type: pattern
created: 2026-10-07
updated: 2026-10-07
tags: [orchestration, configuration, subprocess, fallback, security]
related: [resolve-config-only-from-trusted-root, parse-untrusted-values-and-re-emit-them, guard-tests-can-fail-for-the-wrong-reason]
source: orca-vendor-foundation
confidence: low
---

# Pattern: explicit opt-in precedes runtime discovery

Validate the optional local policy before reading environment, selecting a launcher, checking
PATH, or probing a runtime. Missing or false opt-in, refused/malformed policy, empty routes,
and explicit worker context terminate discovery. Tests use environment getters and runners
that throw if touched, proving this ordering rather than merely counting child processes.

Distinguish policy eligibility, executable presence, documentation, session evidence,
authentication, and dispatch authority. Orca foundation always reports normal execution and
`dispatchReady: false`; an enabled JSON flag alone authorizes none of the later lifecycle.

Use the same absolute-entry PATH policy for presence checks and child execution. Audit found
that sanitizing only presence checks still let a child resolve a relative/empty PATH entry
against the inspected repository. The fixed preflight sanitizes the child's PATH too, refuses
dot-only launcher names, and preserves a single launcher after failure. Full environment
allowlisting remains deferred pending the confirmed Orca contract; PATH sanitation is not
claimed as complete subprocess isolation. See [[resolve-config-only-from-trusted-root]].
