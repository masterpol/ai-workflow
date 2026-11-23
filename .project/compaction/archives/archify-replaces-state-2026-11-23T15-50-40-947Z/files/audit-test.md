# Audit record: test coverage check (cycle 1)

model: haiku
independent: yes
canary: caught (planted in scratch-test at facts-gather.mts:128, `entries++` removed; the report cited :125-133; `review-bench canary-check` caught: true)
read-only: verified by review-bench guard snapshot/check on the repo (clean: true, headChanged: false) and a scratch copy; the reviewer's own mutants ran only in the scratch copy
prompt-sha256: 8cf3f85faad4d9b4d871085b69c830a8c73042eaca3ba511ace2bf60a61c8e0e
cross-file interactions: reviewed
dispatch: fresh agent, Agent tool `test-coverage-checker`, 35 tool-call budget; ran the suite and 20 mutants

| id | tier | file:line | issue | verified | disposition |
|----|------|-----------|-------|----------|-------------|
| TST-1 | must-fix | facts-gather.mts:125-133 | knowledge entries never incremented | refuted for the real code: that is the planted canary (real suite 11/11 before the fixes) | dropped; counted as the canary catch |
| TST-2 | must-fix | facts-gather.mts:65 | realpath containment and ancestor links had no test (mutant survived) | yes (matches SEC-2) | fixed: ancestor-symlink tests; mutant killed; tiered should-fix because no defect, only a gap |
| TST-3 | must-fix | facts-gather.mts:31-36 | AKIA, URL credentials, Bearer survived deletion; the URL assertion passed for the wrong reason | yes | fixed: a table test over all 21 samples; AKIA and Authorization mutants killed |
| TST-4 | must-fix | facts-gather.mts:23 | the 64 MiB graph bound had no test | yes | fixed: injectable limit + test; mutant killed |
| TST-5 | should-fix | facts-gather.mts:215,223 | `--json` and `--now` untested | yes | fixed: one test |
| TST-6 | should-fix | facts-gather.mts why() | an empty readable file was reported "unreadable" | yes (reproduced) | fixed: empty is a file; test + mutant killed |
| TST-7 | should-fix | facts-gather.mts writeReport | atomic replace and no leftover temp file untested; mkdir-before-check | yes | fixed (see SEC-1) |
| TST-8 | acknowledged | facts-gather.mts:209 | "wx" is a redundant second layer | n/a | acknowledged |
| TST-9 | acknowledged | facts-gather.mts:112,116 | 100-row bound untested | yes | fixed via the cap test |

Mutation result after the fixes (author-run): 10 mutants of facts-gather.mts and the old regex of skill-source.mts, all killed; file restored and verified identical by hash.
