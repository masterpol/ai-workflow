---
id: package-less-bundle-ship-wrapper-cannot-select-checks
type: issue
created: 2026-10-21
updated: 2026-10-21
tags: [workflow, ship, verification, portability, configuration]
related: [one-boundary-selects-the-child-runner, a-gate-must-not-trust-its-own-author]
source: workflow-usage-capture
severity: medium
resolved: false
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
