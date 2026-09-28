# Ship record — collector-robustness

**Date:** 2026-09-27
**Approval:** User approved the completion plan, the build gate, the audit gate and the ship gate in sequence.

The metrics collector now serializes writers through a kernel-held loopback lease (`metrics-lock.js`) instead of an
age/PID-reclaimed lock file; `recordEvent` is async and awaited by the CLI and both OpenCode callbacks; a legacy lock file
makes events skip until an operator removes it after stopping old writers. Structured identities from S1 are kept.

Evidence: 117 required tests; full repo suite 404/404 (×3); doctor and setup-validator READY; graph CLEAN. Audit cycle 2:
5 fresh dispatches, all canaries caught, one must-fix (late error dropped a granted lease) fixed. macOS only.

Reconciliation: `.project/pitches/collector-robustness/SHIPPED.md`. Knowledge: `decisions/collector-metrics-lease-design`.
3 followups closed, 1 owned followup open. No Git commit or version bump by this session.
