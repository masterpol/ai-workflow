# Audit dispatch prompts

## Cycle 1 — code

```text
Model: gpt-6-sol. Caveman mode: full.
READ-ONLY. Work only in the scratch copy at /var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/native-audit-dbZg8L/code; never touch any other path. Do not read .env*, credentials.json or settings.local.json. Do not spawn agents. Proofs of concept may create private temporary fixtures only.
Limits: each shell command under 20 seconds; at most 10 tool calls; send final report even if unfinished, mark unfinished unverified.
Target: whole-file review of .project/analysis/native-safety-feasibility/{bench.py,bench.test.js,evidence.json,report.md}, supplied plan/rules and other pitch records. Ignore diff-only filters.
Contract: the supplied plan; scratch-only feasibility, four files <=400 lines, measured guarantees with no production changes.
Checklist: Review Python/Node process ownership, barriers, error handling, cleanup, evidence/report consistency and unsupported behavior. Apply coding-standards.md and boundaries.md. Walk correctness, error paths, security, tests, maintainability individually.
Known limitations (do not report as defects): directory relocation escapes continuous containment; same-user inode replacement splits advisory locks; legacy noncooperation; Linux unverified. These are the spike's measured results.
Return findings: severity / file:line / rule violated / concrete failure scenario, command and output. Walk checklist with a result per item; cross-file interactions must be reviewed. Say what attempts did not work. Do not edit supplied files.
```

## Cycle 1 — security

```text
Model: gpt-6-sol. Caveman mode: full.
READ-ONLY. Work only in the scratch copy at /var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/native-audit-dbZg8L/security; never touch any other path. Do not read .env*, credentials.json or settings.local.json. Do not spawn agents. Proofs of concept may create private temporary fixtures only.
Limits: each shell command under 20 seconds; at most 10 tool calls; send final report even if unfinished, mark unfinished unverified.
Target: whole-file review of .project/analysis/native-safety-feasibility/{bench.py,bench.test.js,evidence.json,report.md}, supplied plan/rules and other pitch records. Ignore diff-only filters.
Contract: the supplied plan; scratch-only feasibility, four files <=400 lines, measured guarantees with no production changes.
Checklist: Review scratch isolation, executable provenance, symlink flags, deletion targets, PID/process-group ownership, deadlines/output bounds, secret/error leakage, and the report threat boundaries. Walk security.md section 9 item by item; mark inapplicable application categories explicitly.
Known limitations (do not report as defects): directory relocation escapes continuous containment; same-user inode replacement splits advisory locks; legacy noncooperation; Linux unverified. These are the spike's measured results.
Return findings: severity / file:line / rule violated / concrete failure scenario, command and output. Walk checklist with a result per item; cross-file interactions must be reviewed. Say what attempts did not work. Do not edit supplied files.
```

## Cycle 1 — test

```text
Model: gpt-6-luna. Caveman mode: full.
READ-ONLY. Work only in the scratch copy at /var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/native-audit-dbZg8L/test; never touch any other path. Do not read .env*, credentials.json or settings.local.json. Do not spawn agents. Proofs of concept may create private temporary fixtures only.
Limits: each shell command under 20 seconds; at most 10 tool calls; send final report even if unfinished, mark unfinished unverified.
Target: whole-file review of .project/analysis/native-safety-feasibility/{bench.py,bench.test.js,evidence.json,report.md}, supplied plan/rules and other pitch records. Ignore diff-only filters.
Contract: the supplied plan; scratch-only feasibility, four files <=400 lines, measured guarantees with no production changes.
Checklist: Run the four tests and inspect every plan exit criterion, including real behavior versus fabricated labels, guard-removal failures, deadlines, unsupported/runtime failure, and cleanup assertions. Walk testing.md guard checks and scenario gaps item by item.
Known limitations (do not report as defects): directory relocation escapes continuous containment; same-user inode replacement splits advisory locks; legacy noncooperation; Linux unverified. These are the spike's measured results.
Return findings: severity / file:line / rule violated / concrete failure scenario, command and output. Walk checklist with a result per item; cross-file interactions must be reviewed. Say what attempts did not work. Do not edit supplied files.
```

## Cycle 1 — cross

```text
Model: gpt-6-luna. Caveman mode: full.
READ-ONLY. Work only in the scratch copy at /var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/native-audit-dbZg8L/cross; never touch any other path. Do not read .env*, credentials.json or settings.local.json. Do not spawn agents. Proofs of concept may create private temporary fixtures only.
Limits: each shell command under 20 seconds; at most 10 tool calls; send final report even if unfinished, mark unfinished unverified.
Target: whole-file review of .project/analysis/native-safety-feasibility/{bench.py,bench.test.js,evidence.json,report.md}, supplied plan/rules and other pitch records. Ignore diff-only filters.
Contract: the supplied plan; scratch-only feasibility, four files <=400 lines, measured guarantees with no production changes.
Checklist: Review current-files.json as this pitch actual file list against all other active pitch plans/logs/deviations and status. Walk pure overlap, adjacent import/export coupling and shared index merge ordering. Include bookkeeping changes to status and own pitch records separately.
Known limitations (do not report as defects): directory relocation escapes continuous containment; same-user inode replacement splits advisory locks; legacy noncooperation; Linux unverified. These are the spike's measured results.
Return findings: severity / file:line / rule violated / concrete failure scenario, command and output. Walk checklist with a result per item; cross-file interactions must be reviewed. Say what attempts did not work. Do not edit supplied files.
```

## Cycle 2 — code

```text
Model: gpt-6-sol. Caveman mode: full.
READ-ONLY. Work only in /var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/native-audit-dbZg8L/code-cycle2. Never touch other paths or read secret files. No agents. Each command under 20 seconds; maximum 8 tool calls; final report required, unfinished items unverified.
Review the four supplied whole files, especially bench.test.js unsupported-runtime mutation gating and cross-file evidence consistency. A prior code finding was that guard mutants demand rejection even when missing Python returns unsupported; independently verify the fix with PATH unavailable. Walk capability gating, mutation sensitivity, cleanup, deadline behavior and evidence/report agreement. Production limitations are intentionally measured: directory movement escapes containment, replaced lock inodes split ownership, advisory locks need cooperation, Linux unverified.
Return severity/file:line/rule/concrete failure command and output, checklist per item, cross-file interactions and failed attempts. Do not edit supplied files.
```
