# Closing criteria requiring an owner decision

Both findings are observed. Neither requirement is marked passed, and no exception is inferred from the earlier batch approvals.

## Scenario-C retained bytes

Original target: <=5% of source. Published, previously approved token-time-report outcome: 1127 bytes; supplement: 25661; total 26788/274950 = **9.74%**. Outcome alone is 0.41% and under the shared 3000-byte cap, but that does not satisfy total retained bytes. Its dated run copies were not identical and cannot replace the full retention supplement.

Proposed named exception: accept these exact hash-bound records at 9.74% for this one large-source proof, preserving all coverage, hash/byte evidence, outcome cap and knowledge-entry limits. Alternative: revise retained-content design and re-review affected destinations/approval bindings until total meets 5%.

## Existing history collector reads recovery archives

The planned closing scan found ai-framework/scripts/state-history.mts, in addition to the approval-gated legacy-upgrade utility. Lines 162–174 choose and load archived audit/pitch files, lines 193–209 use them for audit/revision history, and line 241 lists the archive directory. This collector predates the campaign and was not edited here. The literal original repo-wide read criterion is therefore **not met**.

Proposed scope exception: defer replacement of that existing fallback to the explicitly un-bet P2b consumer/ship-flow work; this campaign introduces no routine archive consumer. Do not call the original literal criterion passed. Alternative: plan/review and implement the history consumer change before closing this campaign, preserving unavailable-versus-zero and existing evidence limits.

## Decision

Approve both explicit exceptions / Require original targets / Revise / Stop. Approval changes only these named closing constraints; it does not authorize routine agent archive browsing, erase failed evidence, ship, or expand downstream rollout. Machine values: closing-exceptions.proposed.toon.

## Owner decision — 2026-10-23

Owner replied “Approve” to the explicit three-item gate covering final-four apply, the separate evidence-path repair and both closing exceptions. Both named exceptions are accepted. Exact machine proposal and its hash are preserved by closing-exceptions.approved.toon. The 9.74% total and existing state-history archive fallback remain measured exceptions; neither original criterion is represented as passed. Replacement of the pre-existing fallback stays with un-bet P2b consumer/ship-flow work. Final ship remains separately gated.
