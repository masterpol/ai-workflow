# Workflow usage capture — ready for final decision

Prepared: 2026-10-21. Bet: 2026-10-19. Version: 2.38.0. Appetite: big-batch.
Status: **not shipped or closed**; audit cycle 2 V1 is open for the known verification-wrapper routing
failure. All actual repository verification below passes. No external publish, tag, push or project sync.

## Decision required

The mandated `node ai-framework/hooks/scripts/pre-ship-verify.mts` exits 1 before any project check:
“No package.json or Muro document verifier found. Define project checks before shipping.”
The existing issue is tracked at _followups.md:366,463,473 and prior ship records. This bundle has neither
prerequisite. No fake package or unrelated application tool was created. The ship skill says a failed
required check returns to audit; audit-cycle-2.md keeps that gate open.

**Approve the documented package-less-bundle fallback to the actual checks below and close v2.38.0**, or
**hold** for a durable wrapper repair. Approval explicitly accepts this wrapper-routing exception; it does
not claim the wrapper passed or weaken any actual test. A durable wrapper fix adds implementation scope
outside these 15 files and needs review. This decision also authorizes the final ship/status compaction.

## Actual verification

| Check | Result |
|-------|--------|
| Full Node suite, including hidden Claude hook tests | 2363 tests; 2360 pass; 3 existing skips; 0 fail |
| Full Bun suite | 2341 tests; 2338 pass; 3 existing skips; 0 fail |
| Release/document contracts | 38 pass; 0 fail |
| Workflow doctor | exit 0; zero failures |
| Setup validator | READY; 23 checks; 148 parsed TypeScript entries |
| Knowledge graph | CLEAN; 112 entries, 319 links; graph/report/index rebuilt |
| Privacy | recursive .project/metrics marker scan: zero files |
| Diff sanity | no sensitive paths or debug additions; git diff --check passes |
| Application build/typecheck/lint/i18n | not applicable: no commands exist in stack.md |
| Generic pre-ship wrapper | exit 1: unsupported package-less routing; decision pending |

Node command: `node --experimental-strip-types --disable-warning=ExperimentalWarning --test
--test-concurrency=1 'ai-framework/**/*.test.mts' '.claude/**/*.test.mts'`. Serial execution is an invocation
choice, not a changed runtime default or benchmark recommendation. It passes without the earlier sanitizer
baseline exception. Bun ran separately: `bun test ai-framework`. Full outputs are /tmp/capture-ship-{node,bun}-full.log.
Release contracts: changelog.test.mts, skill-vendors.test.mts and workflow-contracts.test.mts. VERSION and
CHANGELOG were prepared using changelog.mts after the doctor passed; no historical release was hand-edited.

## Pitch reconciliation

| Scope | Implemented result | Evidence |
|-------|--------------------|----------|
| P0 | approved A1 prerequisite: resolver sentinels, label inheritance, atomic phase replacement | state tests and mutants; schema remains 2 |
| S1 | observed payload keys, event order, identities, latency budget, G1 choices | spike-s1-payloads.md and owner decisions |
| S2 | pure metadata maps, identifier/label bounds, resolver field selection | mapper tests and 14 mutants |
| S3 | bounded Claude CLI and shared in-process writer boundary | handler tests, 4 mutants, lease/budget/error proofs |
| S4 | eight separate Claude capture groups, matching template/live settings, migration | exact shell tests; p95 100 ms vs 250 ms budget; 0/60 coexistence skips |
| S5 | exact per-registration doctor checks and script parsing | doctor tests and 6 mutants |
| S6 | OpenCode V2 step intervals and V1/V2 phase skill capture after token writes settle | plugin tests; lease failures 0/12 before and after |
| S7 | docs, RN-shaped scratch sync, release preparation, complete final verification | rollout.md, full suite logs, changelog and this record |

All implementation scopes are complete; none deferred. Original shaping estimates were replaced by the
approved plan: 15 authored implementation/release files, 1325 added lines (cap 1500), including the explicit
A1 prerequisite exception. Two mandatory machine-generated graph artifacts are ship bookkeeping and
reported separately, along with project records. No extra implementation file was silently added.

## No-gos and deliberate plan refinements

- Prompt, response and transcript fields are not selected or stored. Only validated identifiers and
  canonical labels become capture events. Invocation arguments go only to the existing phase resolver,
  as explicitly approved by the plan; arbitrary argument text is never persisted.
- No emission instructions were added to skill/phase prose. Token snapshot schema, state schema fields
  and lease implementation remain unchanged. The A1 value/attribution repair was explicitly approved.
- CLI stdout stays empty, normal observational paths exit zero, diagnostics are fixed. Exact Node
  commands, type/matcher/timeout and cardinality are verified. Registered hooks have 5-second timeouts;
  the shared pre-acquisition budget is 3 seconds, without forced cancellation after lease acquisition.
- Original “second command in a shared phase group” sketch became separate capture-owned groups under
  the approved plan. Existing Orca and token groups stay at their established positions.
- OpenCode user-turn timing is unverified; no wait gap is inferred. Wait is Unavailable. V1 has no verified
  start time, so completions create no interval. Codex and Cursor automatic capture remain unwired.
- Gates, must-fix counts, ships, token schema/report changes and external project rollout remain out of scope.

Live Claude key evidence and shell fixtures are recorded. OpenCode V2 stream compatibility remains
fixture-verified, not live-proven. Missing host fields do not become fabricated time or token values.

## Audit and follow-ups

Cycle 1 completed the required code, security, coverage and cross-pitch roles through Orca. All reported
must-fix source defects were planted scratch canaries and verified absent from source. A missing-test claim
was refuted by existing tests and a 4/4 rerun. All six successful workers were released; ledger attempts
settled; deliveries acknowledged. Unsupported OpenCode model-pin preflight was recovered using positive
runtime/version/code-path proof; configured Claude alternates were used without changing vendor settings.

No source-code must-fix remains. Cycle 2 V1 is solely the known wrapper-routing decision above. Deferred
backlog owners cover metrics-doc wording, pre-existing OpenCode metadata-map retention and Orca safe
model-capability/preflight receipts. Existing wrapper/guard backlog items remain open; none is represented
as repaired by this release. workflow-v3-rollout must rerun its scratch-copy dry run before a real sync.

## Knowledge and preserved records

Four issue cards, one low-confidence reusable pattern and two existing confidence updates were extracted.
Graph and index were rebuilt and validated. No new coding rule was silently adopted. Cooldown promotion
candidates: observational lease budgets, pre-dispatch brief validation and consistent guard size bounds.

Full preparation log/hill snapshots: runs/2026-10-21-workflow-usage-capture{,-hill}.md. The source pitch
history remains intact. Raw audit prompts, hashes, manifests, reports and receipts are preserved in
runs/2026-10-21-workflow-usage-capture-audit-evidence.tar.gz with an adjacent per-file SHA-256 manifest.
The known local metrics copies were removed only after exact archive-member verification, restoring the
literal recursive marker scan to zero. Extract that archive into a temporary directory for inspection.

After approval: write SHIPPED.md, append the closing decision to preserved logs, remove the active pitch
row and add the recent-ship record, preserve the other active pitches, and run the due cooldown review.
No additional product/architecture rewrite is needed: the integration guide documents the new capture
surface; the existing hook/plugin/state boundaries and schemas remain the architecture.


## Final closure — 2026-10-21

The owner explicitly approved the documented package-less verification fallback and closing v2.38.0 with “Approve”. V1 is resolved by that approved exception, not by a wrapper repair: pre-ship-verify.mts still exits 1 because neither package.json nor a Muro verifier exists. The actual repository checks passed: Node 2360 passed / 3 existing skips / 0 failed; Bun 2338 passed / 3 existing skips / 0 failed; release contracts 38 passed; doctor 0 failures; setup READY; graph CLEAN (112 entries, 319 links); privacy marker scan 0 files. The final Node run needs no sanitizer exception. No production source changed after audit.

Release 2.38.0 is shipped locally; all P0/S1–S7 scopes are complete. SHIPPED.md records reconciliation and limits. The status index is compacted; historical pitch, run and audit evidence is preserved. The durable wrapper repair remains in the followups backlog. No tag, push, publication or application rollout is implied. The due cooldown review follows without applying unapproved proposals.
