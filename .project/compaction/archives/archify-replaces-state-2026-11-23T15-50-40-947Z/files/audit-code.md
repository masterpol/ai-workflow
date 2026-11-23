# Audit record: code review (cycle 1)

model: sonnet
independent: yes
canary: caught (planted in scratch-code at facts-gather.mts:95, `rows.slice(1)` to `slice(2)`; the report cited :95; `review-bench canary-check` caught: true)
read-only: verified by review-bench guard snapshot/check on the repo (clean: true, headChanged: false) and a scratch copy
prompt-sha256: a992dde3787344ef5494dba368bf6948b9c0281e3ce486ded4b4bededd255831
cross-file interactions: reviewed
dispatch: fresh agent, Agent tool `code-reviewer`, 45 tool-call budget, same scratch layout as the security review

| id | tier | file:line | issue | verified | disposition |
|----|------|-----------|-------|----------|-------------|
| COD-1 | must-fix | facts-gather.mts:95 | tableRows `slice(2)` drops the first row | refuted for the real code: that is the planted canary; the real file reads `slice(1)` | dropped; counted as the canary catch |
| COD-2 | should-fix | facts-gather.mts:188 | summary printed "0 ..." for unavailable facts, and the test enshrined it | yes | fixed: "label: unavailable"; stale counts read "at least N"; test rewritten |
| COD-3 | should-fix | facts-gather.mts:131,112,141 | silent caps (20 types, 100 rows) left counts that disagree with their evidence, still "observed" | yes | fixed: true count kept, "other" bucket, status stale with a note; test + 2 mutants killed |
| COD-4 | should-fix | skill-source.mts:127 | backtick pairing hides links | yes (probe) | fixed with SEC-4 |
| COD-5 | should-fix | facts-gather.test.mts:97,132,178 | no-op assertions and dead lines | yes | fixed |
| COD-6 | acknowledged | facts-gather.mts:53,158,148 | dead `](` branch, identity map, `FACTS_DEBUG` hook | yes | removed |
| COD-7 | acknowledged | facts-gather.mts:133,144 | a stale fact's reason was missing from the page | yes | fixed: the note is shown in the draft |
| COD-8 | acknowledged | migrate.mts hunk | legacy .js references to the retired scripts are no longer rewritten | n/a | intended (a rewrite would point at a removed script) |
