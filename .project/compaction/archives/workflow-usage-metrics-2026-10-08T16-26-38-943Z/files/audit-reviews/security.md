# security review — workflow-usage-metrics

model: gpt-6.1-sol
independent: no
canary: not planted; no canary-qualified independence claim
read-only: verified by review-bench scoped before/after SHA256 guard; reviewers used scratch only
prompt-sha256: cf71a8ec2f39c3bcf8de04b04a63d58b973cf005974a83c032c6782aea9f98e0
cross-file interactions: reviewed

Exact dispatch: [prompt](../audit-prompts/security.txt). Full-file and interface targets are in that prompt.
Cycle 1/2 global guards found concurrent helper/status edits, listed in audit.md; no metrics delivery path changed. Cycle 3 and final verification global guards were clean.

| Severity | File/check | Finding | verified |
|---|---|---|---|
| must-fix / high | state:297; report:110 | Ancestor swap during lease follows outside state/reports | yes; original PoC now refused |
