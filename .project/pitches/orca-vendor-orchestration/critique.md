## Critique findings

Parallel passes completed: knowledge-historian, skeptic, appetite-auditor, eval-regression-projector. No other active pitch was indexed, so cross-pitch-projector did not trigger; existing uncommitted OpenCode edits remain an explicit integration constraint. Two role adapters failed because their `gpt-5.6` model was unavailable; their passes were rerun with the inherited available model.

| ID | Severity / perspective | Finding and disposition |
|---|---|---|
| A1 | High / appetite | ~19 files / 1900 LOC exceeds one batch. Addressed: two dependent pitches, each separately gated and counted in /plan. |
| A2 | Medium / appetite | Live compatibility missing. Addressed: dispatch bet requires installed-version evidence; static fixtures cannot substitute. |
| K1–K2 | High–medium / knowledge | Launch is not completion; age/PID/idleness cannot settle ownership. Addressed: attempt-specific evidence and proven settlement required. Consult `async-agent-launch-hook-counted-as-completion` and `collector-metrics-lease-design`. |
| K3–K4 | Medium / knowledge | Review the gate itself independently. Addressed: preflight/reconciliation receive independent review before relying on them. Consult `a-gate-must-not-trust-its-own-author` and `a-gate-must-not-audit-its-own-instrument`. |
| S1 | High / skeptic | Recovery refusal cannot mean absence. Addressed: distinct refused/corrupt/missing outcomes; preserve ownership on uncertainty. Consult `hardening-a-shared-reader-made-its-writer-destructive`. |
| S2 | High / skeptic | Evidence can disappear on cleanup. Addressed: retain and verify accepted evidence outside retired worker resources before release/cleanup. |
| E1–E2 | High / eval | Missing completion/provenance adversarial cases. Addressed: expanded fixtures; deterministic graders and integrated-tree verification required in /plan. |
| E3–E5 | Medium / eval | Vendor permutations, stateful recovery and executable graders absent. Addressed: expanded fixture families; separate fake-receipt checks and live smoke acceptance. |

