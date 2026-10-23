---
id: snapshot-metadata-bypassed-output-scrubbing
type: issue
created: 2026-10-21
updated: 2026-10-21
tags: [state, security, validation, secrets, reports]
related: [allow-list-untrusted-labels-at-ingest-and-at-render, parse-untrusted-values-and-re-emit-them, a-report-over-an-untrusted-tree-runs-only-bundle-code]
source: state-deep-evidence
severity: high
resolved: true
confidence: low
---

# Issue: snapshot metadata bypassed output scrubbing

The deep-evidence audit found two paths around the report's scrubber. A package.json main or bin value could be an identifier-shaped credential string pointing to a real file. Entry-point validation checked charset, secret filenames and realpath containment, but copied this value into both the fact and evidence without scrub equality. Separately, unsupported token schemaVersion values were JSON-stringified into rejection notes, preserving synthetic password text even when the rest of the snapshot reported zero redactions.

The fixes reject entrypoint paths whose scrubbed form differs and use a fixed unsupported-schema reason in both metrics and tokens readers. Evidence paths are rejected, never rewritten to a nonexistent sanitized file. Parent reproduction used an actual temporary filesystem; new regressions cover main, both bin forms, a safe control, and scalar/object/array schema values. Both tests failed before the patches and passed afterward; fresh code and security reviews passed the fixes.

This is an application of existing output-validation patterns, not proof of full-snapshot prompt-injection resistance. Existing structure.tree directory labels remain outside the narrowed deterministic case. Evidence: state-deep-evidence/audit.md and the two named behavioral tests in state-snapshot.test.mts. No actual credential is included in this entry.
