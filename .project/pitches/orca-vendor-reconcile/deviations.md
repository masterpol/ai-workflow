# Deviations: orca-vendor-reconcile

| ID | Scope | Plan said | Reality | Disposition |
|----|-------|-----------|---------|-------------|
| D1 | plan | cap 15 files / 1500 LOC | User chose Waves A+B together (~2400 LOC) despite the recommendation to split | Accepted by the user 2026-10-08 |
| D2 | R2 | subagents stay inside their own files | The R2 subagent ran `git add -A` then `git reset --hard` in the real repo when a scratch `cd` failed, wiping uncommitted work; it recovered by re-applying its own staged diff. Orchestrator verified afterwards: HEAD unchanged (1ecbfc6), every expected file present, status matches. R1/R3 files will be re-verified when they report | Incident, no data lost as far as verified. Rule for the remaining prompts and the rest of this build: subagents never run `git add`, `reset`, `checkout`, `stash` or `clean` outside a scratch repo created with an absolute path, and fail closed if `cd` fails |
