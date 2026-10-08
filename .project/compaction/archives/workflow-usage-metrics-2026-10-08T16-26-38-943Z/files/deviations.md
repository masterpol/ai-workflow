# Deviations: workflow-usage-metrics

No scope deviations at build start. S1 implements state/recording; S2 will add report generation. The approved core does not alter existing vendor hooks or legacy token files.

## D1 — Explicit runner for compatibility verification

The existing Node concurrent-writer test times out with ambient runner selection and passes when `AI_WORKFLOW_RUNNER=node` is explicit. Use explicit runtime selection in compatibility commands to test the intended adapter. No changes to the unrelated runtime implementation or existing collector tests. New CLI subprocess tests already select their executing runtime explicitly.

## D2 — Explicit successful-pitch counter

S2 needs a ship headline, but S1's combined terminal outcomes cannot identify successful pitch finishes. Add an optional backward-compatible `ships` counter to summaries. Fresh summaries track it directly. Pre-counter summaries with previous pitch finishes retain an unknown value; summaries with no prior pitch finishes can initialize zero exactly. Existing totals are preserved; no past success is invented. Validate this behavior through state and report tests. No legacy token imports.

## D3 — Audit hardening and path-check boundary

Confirmed ancestor replacement across the asynchronous lease could follow external state/reports. Pin directory identities and guard filesystem effects inside the lease. Interrupted operations fail closed and release descriptors/lease. Node/Bun regressions and reviewer scheduling-point proofs validate this. Per-operation rechecks do not claim atomic protection against malicious rename inside a syscall. If a directory is replaced after private temporary-file creation, cleanup cannot safely follow the new path; it may leave the private temp in the original directory rather than delete an external file.

## D4 — Coupled modules and explicit schema validation

Generic utility-size (<80 lines), function-size (<50 lines), import-order and boolean-prefix conventions do not match the approved bounded state/report modules. Keep normalization, aggregation and guarded storage in the approved state module and rendering in the report module; defer mechanical splitting/style cleanup rather than add delivery files with no behavior benefit. Manual exact-schema validators are deliberate for this dependency-free bundle. Behavioral regressions and hostile persisted-state checks cover them; no new validation-library dependency is introduced. A later mechanical refactor can reconcile size conventions with separate ownership/appetite.
