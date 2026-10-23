# Review record: test-coverage-checker (audit cycle 1)

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check (repo clean after the dispatch)
prompt-sha256: 418de646e26b1468e3e6d45caf324e93fc3d1c704e1d4d913361c03c8e8f6166
model: sonnet
cross-file interactions: reviewed

Ran 50+ mutations in its scratch copy; every survivor is a guard with no test.

| ID | severity | file:line | issue | verified | disposition |
|----|----------|-----------|-------|----------|-------------|
| F1 | must-fix | ledger-schema.mts:78 | planted defect (canary) | yes: canary caught | not a repo defect |
| F2-F4 | should-fix | pitch-compress.mts commitLedgerV2 | pending journal, graph check, missing section untested for v2 | yes: mutations survived | tests added (cycle 1) |
| F5-F7 | should-fix | pitch-archive.mts requireCompleteLedgerV2 | otherFiles gap, absent file, whitespace acceptance untested | yes: mutations survived | tests added (cycle 1) |
| F9-F13 | should-fix | graphify.mts, outcome-record.mts, done-work-index.mts, graphify-relations.mts | hub rule, dedupe, budget, intermediate symlink, CLI, real manifest caps untested | yes / by grep | tests added (cycle 1) |
