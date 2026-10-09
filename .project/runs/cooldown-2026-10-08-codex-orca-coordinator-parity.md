# Cooldown — Codex Orca coordinator parity, 2026-10-08

Triggered: overdue automatic review after approved ship. Nine ships since the prior2026-10-08 cooldown review, as recorded in the status index. This report supplements the two existing same-date cooldown records without rewriting them.

## Knowledge health

Graph check:66 entries (13 decisions,29 patterns,24 issues),190 related links,0 broken links,0 orphans,0 mechanical problems. Graph traversal used node_kind=knowledge. Confidence distribution:{'unspecified': 56, 'low': 10}. Earliest updated/created date:2026-09-25. Low-confidence entries older than60days:0. No archive proposed; unspecified confidence is not high confidence.

New ship knowledge: three connected issues and one low-confidence pattern. Run binding is observed in this one pitch and is not promoted to a hard rule solely because it repeated in multiple phases. The no-secret-read rule already exists; the repo guard defect needs an implementation fix, not another duplicate rule. Existing evidence-attribution, completion-unit and reviewer-measurement rules were already approved in the prior manual cooldown, so they are not proposed again.

## Concrete proposals (per-item approval pending)

| ID | Proposed action | Scope / evidence | State |
|----|-----------------|------------------|-------|
| C1 | Priority bug-fix candidate: review-guard-secret-exclusion | review-bench.mts walker + its existing test; exclude secret names before reads/hashes even when ignored, prove with a read-refusing spy and nonsecret-change control; keep snapshot/check semantics and metadata safety | Proposed, not implemented |
| C2 | Host-verification candidate: codex-trusted-hook-smoke | Verify current UserPromptSubmit definition via /hooks and a fresh Codex host; observe ready context and blocked phase, worker suppression and budgets; no trust bypass/global config edits | Proposed, requires explicit hook trust and observed evidence |
| C3 | Bundle coverage runner followups: workflow-coverage-instrumentation | Exact environment guard compatibility without weakening it, separate Node instrumentation and Bun1.4.2 coverage-crash evidence, retain ordinary runtime regression commands | Proposed; keep backlog intact |

Git bootstrap/non-Git support remains a low-priority explicit support decision, not bundled into urgent guard fix. Existing43-test migration and12-skill rollout items remain separate work. The Codex adapter portion of the earlier adapters followup is now shipped; OpenCode/Cursor remain future work. No existing backlog item is discarded or historical entry rewritten.

## Parked pitches

restore-vendor-adapters: recommend keep parked; its premise was invalidated because adapter files already exist and validators pass. If revived for a different generator requirement, preserve Codex startup registration and doctor checks. No revival/discard action was applied.

## Approval boundary

The cooldown skill requires approval of each proposed action individually. No rule promotion, archive, revival, candidate pitch creation or new implementation was applied by this review. C1 is the recommended next task; C2 is the remaining host evidence limitation. Current release2.22.0 is shipped, with these followups explicit.

Next automatic cooldown: five subsequent ships. Pending prior proposals remain pending.
