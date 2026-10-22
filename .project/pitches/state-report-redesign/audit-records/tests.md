# Audit record: tests

independent: no
canary: INCOMPLETE: state-html and state-snapshot suites could not load in scratch #1; retried as tests2
read-only: verified by review-bench guard check (scratch-copy only); changed set = this thread's cycle-1 patches plus a concurrent token-attribution session, nothing from the reviewers
prompt-sha256: 1ca1514f59ce39077eaa9c4a2ae3048f61198a15e080152b1a11293d4c99eb7c
model: sonnet
cross-file interactions: not reviewed
scratch: scratch #1

| ID | severity | location | note | verified |
|----|----------|----------|------|----------|
| T1 | must-fix | state-charts.mts:21 label regex | canary artifact | refuted |
| T2 | should-fix | monorepo test overclaims 'lists the tree' | real: only css read count was asserted; listings now asserted 0 | confirmed, fixed |
