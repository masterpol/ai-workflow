---
id: review-guard-hashes-ignored-secret-files
type: issue
created: 2026-10-08
updated: 2026-10-21
tags: [security, review-tooling, secrets]
related: [a-gate-must-not-trust-its-own-author]
source: codex-orca-coordinator-parity
severity: medium
resolved: true
confidence: high
---

# Issue: Repo review guard hashes ignored secret files

The review-bench scratch reader rejects secret names, but its repo snapshot walker hashes every small regular file under guarded directories, including ignored `.claude/settings.local.json`. `rg --files` without `--no-ignore` omitted the file during the initial audit check. The guard read and hashed it before the omission was discovered; no contents were displayed.

For this audit, injected RuntimeDeps exclude secret-name content reads. The saved checksum was removed from the temporary snapshot and the corrected before/after check returned clean with the excluded path listed. This mitigates the invocation, not the production CLI. Follow-up: skip secret paths before opening them in the guard walker; prove this with a read-refusing filesystem spy, a secret-file fixture and a nonsecret mutation control. Do not use Git ignore as the secret allowlist.

Evidence: codex-orca-coordinator-parity audit-cycle-2.md; local audit-guard-secret-safe.json. Production review-bench remains unfixed.

## Resolution: token-time-report (2026-10-21)

The production walker now checks SECRET_NAME before lstat, hashing or other file reads. A read-refusing fake-filesystem spy proves that a synthetic credential-shaped entry is never read while a nonsecret entry remains covered. Node and Bun each pass the final 35-case review-bench suite. A real checkout snapshot/check now excludes eight protected-name entries and reports clean. Fresh code, security and coverage reviewers detected the same omission planted only in separate scratch copies; canonical source retains the predicate. See token-time-report/audit-final-evidence.md and audit-approved-evidence records. This closes the production CLI follow-up; Git ignore is not used as the secrecy boundary.
