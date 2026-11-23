# Audit record: test coverage check (cycle 1)

model: haiku
independent: yes
canary: caught (planted in scratch-test at orca-start.mts:133, the ENOBUFS check replaced by false; the report cited :131-135; `review-bench canary-check` caught: true)
read-only: verified by review-bench guard snapshot/check on the repo (clean: true, headChanged: false) and a scratch copy; the reviewer's own 19 mutants ran only in the scratch copy and were hash-restored
prompt-sha256: 405a12324310a8762aee5b19e01599c1d05dce36264d0e5a3160e0e6ba71e5a4
cross-file interactions: reviewed
dispatch: fresh agent, Agent tool `test-coverage-checker`, 35 tool-call budget

| id | tier | file:line | issue | verified | disposition |
|----|------|-----------|-------|----------|-------------|
| TST-1 | must-fix | orca-start.mts:131-135 | suite red, ENOBUFS path is dead code | refuted for the real code: it is the planted canary (real suite 54/54) | dropped; counted as the canary catch |
| TST-2 | should-fix | orca-start.mts:134 | an oversize stderr is not tested (mutant survived) | yes (re-run as a mutant on the real code) | fixed: test; mutant killed |
| TST-3 | should-fix | orca-start.mts:118 | a row settled only by its state word is not tested (mutant survived) | yes | fixed: test; mutant killed |
| TST-4 | acknowledged | orca-dispatch.test.mts:~531 | the humanAction assertion pins a double-negative wording | n/a | acknowledged |

Mutation result after the fixes (author-run): 10 mutants of orca-start.mts and orca-dispatch.mts killed, including both survivors; files hash-restored.
