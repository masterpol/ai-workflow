# Shipped: orca-vendor-foundation

Bet: 2026-10-07. Prepared: 2026-10-07. Shipped: 2026-10-07; user selected [1] ship.
Appetite: big-batch, at most 15 implementation files / 1,500 lines / one week.
Release entry: 2.10.0 in the current shared checkout; the earlier S3 record's 2.9.0 predates the concurrent shape-lite release and external release commit.

The user reported audit completion in another agent and requested the next phase. Accepted
that phase handoff using `audit-cycle-1.md`, which records two independent review cycles,
canaries, four real fixes, and zero remaining must-fix findings. Its missing prompt hashes
are a recorded audit-process limitation, not silently represented as complete review provenance.

## Final verification

| Step | Result |
|---|---|
| Build | Not applicable: no build command or build step |
| Typecheck | Not applicable: no typecheck command |
| Lint | Not applicable: no lint command |
| Tests | 109 pass, zero skipped: policy, preflight, skill-defaults, skill-vendors, bundle-sync |
| i18n | Not applicable: no i18n command or localized product UI |
| Diff | Clean whitespace check; no secret/debug source added |

Commands: `node --test ai-framework/scripts/orca-policy.test.js ai-framework/scripts/orca-preflight.test.js ai-framework/scripts/skill-defaults.test.js ai-framework/scripts/skill-vendors.test.js ai-framework/scripts/bundle-sync.test.js`; setup validator; graphify check; changelog check; git diff check. The test suite needed an authorized outside-sandbox rerun because the existing token-report socket lease is denied in the sandbox. That rerun passed 109/109; no source workaround or skip was introduced. Build-stage and external audit mutations supplement this final test evidence; they do not prove live Orca readiness.

## Reconciliation

| Scope | Status | Hill done | Evidence |
|---|---|---|---|
| S1: policy | shipped | 2026-10-07 | Guarded reader, schema, exact optional flag, three vendor routes, example and tests; s1-evidence.md |
| S2: preflight | shipped | 2026-10-07 | Opt-in guard, explicit worker context, bounded fixed read-only probes and conservative fallback; s2-evidence.md |
| S3: diagnostics/docs | shipped | 2026-10-07 | Static doctor, optional config ignore, schema guide, version entry and integration tests; s3-evidence.md |

Six new and four modified implementation paths remain within the file cap; approximately
1,100 added implementation lines including tests/docs, below 1,500. Audit fixes preserve
these boundaries. Current release is 2.10.0; no additional version bump was made for ship records.

## No-gos honored

No worker launch, messages, lifecycle mutation, integration of worker changes, remote
execution, installation, authentication, credential handling, or runtime setting changes.
No fabricated cost, speed, or quality claims. No partial dispatch path: every foundation
result reports normal workflow execution and `dispatchReady: false`. Missing/false flag
performs no Orca discovery, including explicit `--probe` requests. Doctor reads local policy
only; it never runs Orca or creates/rewrites this optional config.

## Rabbit holes and deviations

Policy path/schema/ownership settled without making the config a required scaffold artifact.
Three established read-only commands and the inspected 1.4.222 contract bound discovery;
unproved capabilities stay unverified. The chosen launcher remains broken; upstream evidence
and fixture receipts are not local runtime proof. The separate dispatch pitch still requires
successful live proof before its bet. Authoritative worker-context guard prevents recursion,
but foundation does not launch workers or infer ownership from terminal presence.

D1-D4 remain accepted: user's explicit flag replaced mode; tests are portable independently
of local shaping records; cohesive utilities exceed generic size guidance; runtime evidence
is conservative. Cross-platform live verification and full child-environment allowlisting
remain open. Audit fixed child PATH sanitation and dot-only overrides, plus fallback/bounds
coverage. No external shared-checkout commit was created or reverted by this ship phase.

## Knowledge extraction

- Issue: guard tests may fail for a missing fixture or invalid native-object mock instead of the guard named.
- Issue: flooring a fractional remaining budget to zero disables Node subprocess cancellation.
- Pattern: explicit opt-in precedes runtime discovery; presence, documentation, session evidence, authentication, and dispatch authority are distinct. Presence and child PATH must share sanitation.

All three new cards have IDs, tags, and related graph links. Mutation baseline discipline and
cohesive-utility deviations are flagged for cooldown review. Sandbox lease failure is an
existing environmental constraint; no additional duplicate issue card was created.

## Followups generated

Four backlog entries: confirm/allowlist child environment; freeze JSON contract and rerun
dispatch overlap review; presence-only cwd/relative-PATH fixture; preserve exact reviewer
prompts and hashes. Existing dispatch pitch retains live-readiness prerequisites.

## Documentation and status

Portable guide already documents the product surface. Added optional Orca policy data flow
to project architecture context; no entry-file mirror change was needed. Run and hill
snapshots prepared under `.project/runs/2026-10-07-orca-vendor-foundation*.md`.

User selected [1] ship on 2026-10-07. Foundation is closed and status is compacted to Recent ships; parent remains active with dispatch prerequisites pending. Run and hill snapshots are retained. No commit, publication, worktree deletion, or live dispatch is part of this closing action. Cooldown review completed after closing; two optional followup bundles remain proposals in runs/cooldown-2026-10-07.md.

## Closing gate

Completed: user selected [1] ship on 2026-10-07.
