# Audit record: security review (cycle 1)

model: sonnet
independent: yes
canary: caught (planted in scratch-sec at orca-dispatch.mts:110, REFUSAL_CODE loosened to /^.+$/; the report cited :110; `review-bench canary-check` caught: true)
read-only: verified by review-bench guard snapshot/check on the repo (clean: true, headChanged: false) and a scratch copy
prompt-sha256: 91483a0d6dd09f066d98ed32770c3cba8f36ac88a7fd7c948872aa3c289dcda8
cross-file interactions: reviewed
dispatch: fresh agent, Agent tool `security-reviewer`, 45 tool-call budget; prompt in a file read first (outside the scratch dir), as in the previous audit

| id | tier | file:line | issue | verified | disposition |
|----|------|-----------|-------|----------|-------------|
| SEC-1 | must-fix | orca-dispatch.mts:110 | REFUSAL_CODE accepts any string | refuted for the real code: it is the planted canary; the real regex is strict and 89 dispatch tests passed | dropped; counted as the canary catch |
| SEC-2 | should-fix | orca-dispatch.mts:251,255 | failedStage goes unbounded into the reason | yes (existing code; reproduced, 100,014-character reason) | fixed: plain token only, else residual or unproven; test + 2 mutants |
| SEC-3 | should-fix | orca-start.mts lookup | fail-open: the active-only filter can miss a worker whose terminal is retained or being released while its dispatch is open, so a worker would coordinate | plausible, Orca semantics unverifiable without a real worker; the CLI lists exactly six terminal states | fixed by design: ask every state except released (an open dispatch cannot sit in a released terminal); tests incl. a retained worker; 3 mutants |
| SEC-4 | acknowledged | orca-start.mts:151-172 | a cursor starting with a dash could be read as an option | yes (cheap) | fixed anyway: such a cursor ends the walk; test + mutant |
| SEC-5 | acknowledged | orca-start.mts | resource bounds | n/a | all hold (cap 32, monotone ladder, shared bound, deadline) |
