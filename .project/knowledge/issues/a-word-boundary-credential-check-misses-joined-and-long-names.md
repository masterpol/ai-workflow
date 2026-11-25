---
id: a-word-boundary-credential-check-misses-joined-and-long-names
type: issue
created: 2026-11-25
updated: 2026-11-25
tags: [security, untrusted-input, credentials, state-report, scrubbing, fail-closed]
related: [snapshot-metadata-bypassed-output-scrubbing, allow-list-untrusted-labels-at-ingest-and-at-render, a-source-scanner-fails-closed-on-what-it-cannot-read, state-sql-migrations-as-a-neutral-schema-source]
source: state-project-sources
severity: high
resolved: true
---

# Issue: a name check built on word boundaries and a length cut let credential-shaped names through

## Symptom
`/state` copied project names (migration files, workspace folders, package names) into its facts and draft behind a check that refused credential-looking text.
Three audit cycles broke that check three ways, each with a probe:
- **`\b` and `_`.** `_` is a word character, so `db_password_prod` and `0002_npm_<token>` have no boundary before the keyword and passed.
- **Order of operations.** A package name `ghp_<30 chars>` had `_` replaced with `-` for markup safety before the credential test, which destroyed the shape; a fullwidth key was checked before normalization and left as a real key.
- **A length cutoff.** The check looked at the first 200 characters; a key after character 200 of a 4096-character path was never seen. The scanner failed open on what it could not see.

## Fix and rule
- Test **every part of the name that starts after a separator** (`_ - .`) as well as the whole, with the same shared pattern list the page cleaner redacts with (one list, exported once).
- **Normalize first** (NFKC, strip format characters), then test; test the raw name before any substitution.
- **Never skip by length.** Run the linear patterns over the whole text, do the per-separator scan per path segment, and refuse a segment too long to scan.
- A migration file name is allow-listed (letters, digits, `. _ - space`) on top of that; a refused file is skipped and counted, and its name is never copied.
- A credential *word* in a migration name (`0007_add_password_reset.sql`) is ordinary; a credential *shape* is not. Directory names keep the stricter word test.
Regression tests cover each form; the audit's last cycle fixes were not re-reviewed.
