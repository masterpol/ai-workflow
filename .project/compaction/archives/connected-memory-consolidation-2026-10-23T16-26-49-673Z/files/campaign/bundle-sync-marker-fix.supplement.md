# Source-review supplement: bundle-sync-marker-fix

Prepared 2026-10-22 from the verified original recovery source for the legacy-ledger upgrade. This supplements the unchanged [compact record](../pitch-compression/bundle-sync-marker-fix.md); statements below describe the 2026-09-26 closure, not newly executed tests.

## Audit context

The original audit covered both the sync and font slices and their surrounding implementation. A separate security reviewer inspected all five changed implementation modules; a separate test reviewer ran the combined relevant suites. AI eval, i18n and UX were inapplicable because those slices changed no AI prompts, translated strings or interactive UI. The combined historical verification covered twelve relevant suites. Independent-rereview-catch-up was still required to review settled source and rerun affected suites after subsequent patches.

## Effective-base contract and boundaries

The [durable decision](../../knowledge/decisions/effective-sync-bases-and-bounded-font-discovery.md#decision) retains the per-outcome marker contract: verified equality and applied content establish the current source base; unapplied entries preserve their previous known base; unverified files without a known base remain absent from the marker; local/conflict/retained-removal entries preserve their prior base; pruned entries disappear. Repeated comparisons must retain that classification. Removal/prune cases without a target digest require explicit per-status evidence; source comparison and next-marker writing form one sequential contract.

This closure did not approve application changes, forced conflict overwrites, new conflict UI, unrelated skill reconciliation or synchronization of instance data. Path-safety-hardening and collector-robustness remained incomplete. No Git commit, merge, deployment or publication was part of that historical approval. The archived plan's scheduling, appetite figures and intermediate hill positions add no further shipped behavior.
