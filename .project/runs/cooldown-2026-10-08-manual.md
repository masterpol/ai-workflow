# Cooldown — 2026-10-08 (manual)

Trigger: manual. Three ships since `cooldown-2026-10-08`: `runtime-test-helpers`, `fix-workflow-runner-env`, `orca-vendor-reconcile-integration`. Status line said "due in 2 ships"; user invoked early. No `cooldown-*.md` rename; this report carries a `-manual` suffix so the automatic-gate counter and the manual log do not collide.

## Knowledge health

Graph rebuilt and checked: 50 entries (11 decisions, 25 patterns, 14 issues), 139 links, zero broken links, zero orphans, zero problems. Confidence distribution: 44 unspecified, six low, zero medium/high. Earliest dated entry is 2026-09-25; no low-confidence entry is at least 60 days old, so no archive is proposed. No entries created after the last cooldown, so no fresh candidates are advanced by new reproduction. No parked pitches exist.

Pitch-reference scan (text match on slug inside any `.md` under each non-template, non-archive, non-parked pitch) confirms the standing-3+ picture is unchanged since the last cooldown: `prove-a-guard-test-with-an-in-memory-mutant` (5), `async-agent-launch-hook-counted-as-completion` (4), `a-gate-must-not-trust-its-own-author` (4), `false-cross-pitch-attribution-in-a-shared-uncommitted-file` (3), `hardening-a-shared-reader-made-its-writer-destructive` (3), `reviewer-reports-contradicted-by-measurement` (3), `resolve-config-only-from-trusted-root` (3), `a-gate-must-not-audit-its-own-instrument` (3). All of these were either already proposed in the prior cooldown or were on the standing-3+ promotion line and have been on the table since 2026-10-08.

No `deviations.md` written or modified after 2026-10-08 introduced a new reference to any of the six previously-proposed issues, so the "≥2 later-deviations of the same class" promotion path does not advance any of them this cycle. The standing count alone already qualified them on the previous cooldown, where the user-approved-per-item policy still applies.

## Per-item rule proposals

No new proposals. The six proposals from `cooldown-2026-10-08` remain pending and are restated here for the manual log so the user can approve, revise, or discard them individually:

| Source | Proposed target/action | Evidence | Approval |
|--------|------------------------|----------|----------|
| `false-cross-pitch-attribution-in-a-shared-uncommitted-file` | Reconcile ownership-evidence guidance in `workflow/phases/3-audit.md` | Referenced by orchestration, dispatch and reconcile pitches; distinguish actual ownership from a shared dirty diff | ☐ |
| `async-agent-launch-hook-counted-as-completion` | Codify event-unit and supported completion-evidence guidance in `rules/testing.md` | Four pitch references including metrics; lifecycle launch cannot count as completion | ☐ |
| `reviewer-reports-contradicted-by-measurement` | Reconcile reviewer contract and measured-evidence guidance in `workflow/phases/3-audit.md` | Three later pitch references; existing guard/prompt/canary requirements already cover much of this | ☐ |
| `macos-tmpdir-realpath-alias-breaks-path-assertions` | Codify fixture realpath/shared-helper guidance in `rules/testing.md` | `runtime-test-helpers`, reconcile and runtime-injection references; current helper solves the alias by default | ☐ |
| `hardening-a-shared-reader-made-its-writer-destructive` | Reconcile reader/writer missing-versus-refused guidance in `rules/security.md` | Three later pitch references; metrics also tests explicit refusal preservation | ☐ |
| Cohesive module size exceptions | Define evidence/ownership requirements for size exceptions in `rules/coding-standards.md` | Same deviation class in `orca-vendor-foundation` and `workflow-usage-metrics`; avoid arbitrary splitting of guarded transactions | ☐ |

Two additional standing-3+ candidates were not on the previous proposal list and are now added so the user can choose them in the same per-item flow:

| Source | Proposed target/action | Evidence | Approval |
|--------|------------------------|----------|----------|
| `a-gate-must-not-trust-its-own-author` (4 pitch refs) | Promote to a hard rule referenced by relevant subagent prompts (security-reviewer, code-reviewer, audit playbook) | Repeated reproduction across dispatch, orchestration, reconcile, reconcile-integration | ☐ |
| `a-gate-must-not-audit-its-own-instrument` (3 pitch refs) | Promote to a hard rule referenced by review-tooling and audit prompts | Cross-pitch pattern; self-audit appears in orchestration, reconcile, reconcile-integration | ☐ |
| `resolve-config-only-from-trusted-root` (3 pitch refs) | Codify trusted-root config resolution in `rules/security.md` | dispatch, orchestration, ts-runtime-injection reference it; same class as the existing security rule's broader trusted-path guidance | ☐ |
| `prove-a-guard-test-with-an-in-memory-mutant` (5 pitch refs) | Codify guard-test proof-by-mutant in `rules/testing.md` | Highest pitch-ref count of any candidate; the runtime-test-helpers and orca pitches repeatedly leaned on it | ☐ |

Existing rules already address portions of these lessons; each proposal should confirm the existing clause before adding wording. No promotion is applied.

## Parked pitches review

None parked. Skip.

## Followups triage

No new followups were added since `cooldown-2026-10-08`. The five candidate bundles carried over from the last cooldown remain pending and are restated for visibility (the per-item approval from that cooldown still governs them):

| Candidate bundle | Source items | Disposition |
|------------------|--------------|-------------|
| `workflow-usage-capture` | New core-dependent workflow/native capture plus existing live host verification | Pending shape/bet; retain actual primary/subagent support and live-proof requirements; do not collect legacy resource fields |
| `workflow-usage-adoption` | State/setup/doctor/bundle-sync and explicitly scoped application rollout | Pending separate shape/bet after capture contracts; no automatic fleet action |
| `metrics-lease-platform-proof` | Existing Linux/Windows exclusivity and port-collision item plus repeated best-effort compatibility skips | Retain existing source item; collision explanation remains plausible, not measured for each transient failure |
| `runtime-and-metrics-maintainability` | Existing runtime per-module testing plus cohesive-module/validation-convention followup | Proposal only; preserve shared helper ownership and behavior-based checks |
| Existing Orca reconcile integration | Existing active integration pitch and reconciliation followups | Retain active pitch; no new overlapping candidate or workflow wiring here |

The commit-order blocker in `Test runtime helpers followups — 2026-10-08` is a `/ship`-time concern, not a candidate pitch; it is preserved as source text and is not bundled here. No backlog item was discarded or rewritten.

## Archive proposed

None.

## Result

Learning review complete; user approved all 10 per-item proposals (6 carried from the prior cooldown, 4 added this cycle). Applied edits:

- `ai-framework/rules/testing.md` — added "Guards and Fixes" section covering `async-agent-launch-hook-counted-as-completion`, `macos-tmpdir-realpath-alias-breaks-path-assertions`, `prove-a-guard-test-with-an-in-memory-mutant`.
- `ai-framework/rules/security.md` — added "Resolve config only from a trusted root" clause for `resolve-config-only-from-trusted-root`. The existing "Never let a helper's absent result stand for refused" clause (line 268) already covers `hardening-a-shared-reader-made-its-writer-destructive`; no edit needed.
- `ai-framework/rules/coding-standards.md` — added "Cohesive module size exceptions" subsection.
- `ai-framework/workflow/phases/3-audit.md` — added "Measurement over assertion" subsection covering `reviewer-reports-contradicted-by-measurement` and `false-cross-pitch-attribution-in-a-shared-uncommitted-file`.
- `.claude/agents/security-reviewer.md` — added "Hard rules" subsection referencing `a-gate-must-not-trust-its-own-author`.
- `.claude/agents/code-reviewer.md` — added "Hard rules" subsection referencing `a-gate-must-not-trust-its-own-author` and `a-gate-must-not-audit-its-own-instrument`.

Graph rebuilt and rechecked (`node ai-framework/scripts/graphify.mts`): 50 entries, 139 links, CLEAN. Five candidate bundles from prior cooldown remain pending (no user action this cycle). Next automatic cooldown is five subsequent ships.

**Addendum (post-approval, same manual cooldown).** A local orca smoke ran against the installed
Orca 1.4.222 after the per-item approvals above (see `runs/orca-smoke-2026-10-08.md`). Two real
findings added to `_followups.md` under a new `## Orca smoke followups — 2026-10-08` heading:

- F1 (medium) — `resumeExisting` skips the policy gate; CLI exits 0 on a `resume` outcome.
- F2 (low) — `parseArgs` rejects repeated `--vendor` on `status`.

Bundled into a candidate pitch `orca-dispatch-resume-gate` (small build, ≤2 files:
`orca-dispatch.mts`, `orca-run.mts`, with existing test coverage). Pending shape/bet.