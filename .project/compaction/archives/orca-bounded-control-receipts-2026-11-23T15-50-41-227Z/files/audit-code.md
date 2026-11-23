# Audit record: code review (cycle 1)

model: sonnet
independent: yes
canary: caught (planted in scratch-code at orca-start.mts:125, ladder [100,50,25,10] to [100,50,50,10]; the report cited :125; `review-bench canary-check` caught: true)
read-only: verified by review-bench guard snapshot/check on the repo (clean: true, headChanged: false) and a scratch copy
prompt-sha256: f74438f3985e56ce952fefb04e98d14f37f1779defc7bb8b7c91cff99234e077
cross-file interactions: reviewed
dispatch: fresh agent, Agent tool `code-reviewer`, 45 tool-call budget

| id | tier | file:line | issue | verified | disposition |
|----|------|-----------|-------|----------|-------------|
| COD-1 | must-fix | orca-start.mts:125 | wrong limit ladder, fallback sends --limit undefined | refuted for the real code: it is the planted canary; the real ladder is 100/50/25/10 and 54 tests passed | dropped; counted as the canary catch |
| COD-2 | should-fix | orca-vendors.md:208 | the worker-list row still says a rejected --full is asked again without it | yes | fixed; the rows now describe the final behaviour |
| COD-3 | acknowledged | orca-dispatch.mts:255 | failedStage echoed unchecked | yes (same as SEC-2) | fixed |
| COD-4 | acknowledged | orca-start.mts | a cursor is reused after the limit changes mid-walk; whether Orca accepts that is unconfirmed | unverified | acknowledged; followup (the walks are now short, one state at a time) |
