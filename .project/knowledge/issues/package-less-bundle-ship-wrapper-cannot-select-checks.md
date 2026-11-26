---
id: package-less-bundle-ship-wrapper-cannot-select-checks
type: issue
created: 2026-10-21
updated: 2026-11-25
tags: [workflow, ship, verification, portability, configuration]
related: [one-boundary-selects-the-child-runner, a-gate-must-not-trust-its-own-author, hardening-a-shared-reader-made-its-writer-destructive, a-wall-clock-ratio-test-can-block-a-ship-under-load]
source: workflow-usage-capture
severity: medium
resolved: true
confidence: high
---

# Issue: the ship wrapper cannot select checks for the package-less bundle

pre-ship-verify.mts selects package.json scripts or a Muro-specific viewer verifier. This source bundle
has neither. The command exits 1 before running project checks: No package.json or Muro document verifier
found. The failure predates capture and is recorded at _followups.md:366,463,473 and prior ship records.

The actual bundle commands live in .project/context/stack.md: Node/Bun tests, workflow-doctor,
setup-validator and graph validation. No application build, typecheck, lint or i18n command exists.
Do not create a fake package.json, add another application's verifier, or report the wrapper as passed.
A failed required wrapper returns ship to audit; an explicit owner-approved actual-command fallback is
an exception, not a durable repair. Keep the pitch open until that decision or a reviewed route fix.

A durable fix should accept a bounded bundle-local check contract without inventing an application
package. Keep command selection trusted, commands direct, time/output bounded, and failures propagated.
Evidence: capture audit-cycle-2.md and pre-ship log; the actual serial full Node suite passes all 2360
non-skipped tests, which proves the wrapper-routing failure is distinct from test execution.


## Recurrence: state-deep-evidence (2026-10-21)

The mandatory wrapper again exited 1 before selecting checks. The owner explicitly approved the documented direct-check fallback and closing this pitch after reviewing 2398 passing full-suite Node tests (three existing skips), 140 passing scoped Bun tests, validators and link checks. The wrapper remains unresolved; accepted fallback is not a passing wrapper. See state-deep-evidence/ship-readiness.md and SHIPPED.md. Confidence is increased for the recurring route limitation.

## Resolution (package-less-ship-verification, 2026-11-25, 2.57.0)

`.project/context/checks.toon` is now the whole check list when present (`argv` arrays, no shell). An unreadable or invalid file fails with no
fallback. Two more route bugs were fixed: `verify:base` alone failed for lack of one application's document viewer, and test scripts timed out at
60 seconds. This repository's verifier passed here without a manual substitute.

Two lessons. A "the manifest is absent, so fall back" branch must test for `absent` only: the shared reader answers `refused` for an unsafe path
even when no manifest exists, so a symlinked `.project/context` now fails a `package.json` project, on purpose. And the claim that two doctor tests
fail from any dirty checkout did not reproduce: plain edits pass; a new knowledge card without a graph rebuild fails one of them, correctly.

Installed projects get this fix only after they sync.
