# Build deviations

## Coverage runner

Bun 1.4.2 crashed while reporting coverage after the targeted behavioral cases ran (`panic: range end index 3155 out of range for slice of length 1024`, exit 134). The transcript is `.project/metrics/codex-orca-parity/bun-build-tests.txt`. Run Bun parity without coverage and use Node coverage for the changed production code. This changes evidence collection, not implementation scope.

## Host activation evidence

A fresh, ephemeral Codex 0.161.0 invocation in an isolated scratch Git project completed with `PROBE_OK`. It produced no observed startup context or blocked-phase result. Both host cases remain unverified under the plan's explicit evidence classification. Hook trust was not bypassed and global configuration was not changed. Explicit coordinator startup remains required by the entry instructions.

## Audit: Git root bootstrap availability boundary

The registration resolves a Git root before Node can read the Orca switch. If Git lookup fails, it exits 2 even when Orca is off or the prompt is not a phase. This is a registration/bootstrap exception to the adapter's off/no-probe contract. The shell fixture now asserts both on and off cases; the integrations docs state that Git and a Git checkout are required. Support for non-Git projects is deferred: this pitch preserves a trusted root and a blocking root-resolution failure rather than weakening that guard, and the approved registration already relies on Git. Missing Node/non-POSIX bootstrap remain separately unverified.

## Audit: review and test refinements

The first test reviewer stopped after catching a planted vendor canary. A fresh Sonnet review completed the checklist; the security review was also supplemented with a complete checklist pass. Both supplemented reviews caught a separate planted three-second host-timeout canary. These defects existed only in scratch copies, not the checkout. Claude reviews are recorded as independent: no under the framework's same-model-family criterion.

Confirmed doctor echo/comment false-positive wiring was fixed inside the approved doctor files, with a regression proven failing before the fix. Tests additionally verify the exact 64 KiB boundary and prove removal of the post-probe elapsed guard is detected. No new implementation files or runtime APIs were introduced.

## Audit coverage and guard tooling boundaries

Broad Node coverage instrumentation adds NODE_V8_COVERAGE, which violates an existing exact-environment assertion. The normal seven-file suite is green; coverage is measured on the changed hook/doctor subset, where all tests pass. No existing environment guard was weakened.

The existing review-bench repo guard hashed ignored local settings before its missing secret exclusion was discovered. No contents were displayed. The final guard uses secret-excluding injected RuntimeDeps; the stored checksum was replaced by an excluded-content sentinel. A direct CLI secret-path exclusion is a separate follow-up, not an extra implementation file in this pitch. Review independence and rule-reading limits are explicit in the audit records.
