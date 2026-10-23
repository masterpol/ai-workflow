# Source-review supplement: workflow-usage-metrics

Prepared 2026-10-22 from verified recovery sources. This supplements the unchanged [compact record](../pitch-compression/workflow-usage-metrics.md) for the 2026-10-08 workflow usage metrics core, release 2.16.0. Results below are historical evidence, not a new certification. The current event contract is owned by the [workflow metrics guide](../../../ai-framework/integrations/workflow-metrics.md); code lives in [state](../../../ai-framework/scripts/workflow-metrics-state.mts), [report](../../../ai-framework/scripts/workflow-metrics-report.mts) and [CLI](../../../ai-framework/scripts/workflow-metrics.mts).

## Scope and revision

Bet approved 2026-10-08 with three core scopes. After the bet the user narrowed the work to just useful metrics: new state and reports keep usage, outcomes, observed elapsed duration and collection health, and drop token, cost, resource and legacy-import or comparison fields. Legacy token files and collectors were left unchanged; retiring them belongs to the capture followup. Native capture and adoption (`/state`, setup, doctor, bundle-sync, rollout) remained separate dependent pitches, so the core is not native capture proof. The pitch's problem figures (1,135 completions, 1,008 without tokens at 2026-10-08T13:02:44Z) describe the legacy collector at that time.

## Contract limits (historical)

The approved plan bounded state at 512 recent event keys for replay, 30 UTC daily buckets, 50 pitch summaries, 8 vendors with 32 entries per dimension and explicit overflow, 64 pending activities, 16 KiB event input and 4 MiB state or report files. These are the plan's numbers at ship time; the guide above owns the current bounds. Source is caller-declared provenance, not adapter verification. Report writes are not one atomic transaction, so source timestamps expose stale views. Only a completed `pitch.finished` counts as a ship; elapsed time includes pauses and human wait and is not work time or productivity.

## Audit triage and provenance

Three cycles, zero open must-fix. Reviews: code, security, test coverage, UX and cross-pitch checks, every one recorded `independent: no` with no canary planted; reviewers worked in a scratch copy with saved prompts and before/after repository guards. Guards in cycles 1 and 2 saw concurrent unrelated edits (a test, runtime test helpers, and a status row); no metrics delivery file changed, and cycle 3 and final guards were clean.

Findings fixed: M1 ancestor substitution during the async lease (pinned identities, guarded effects, recovery proven); M2 missing actual-CLI unsafe-destination proof; S1 concurrent first-directory EEXIST; S2 invalid scope labels fabricating matched duration; S3 hidden loss from oversized composite attribution; S4 provider/model separator collisions (canonical component encoding); S5 encoded unsafe or reserved model keys becoming attributed Unknown rows (decoded allowlist, canonical roundtrip, malformed UTF-8 refusal); S6 keyboard access to scrollable tables; S7 first-use recording guidance placed above Activity; S8 format agreement checking only selected headlines. F1, the claim that the isolated CLI smoke must be an automated test, was refuted: the approved criterion is an executed smoke with SHA256 evidence. UX H8 scored 2/3 by static review, not browser proof. See [display buckets](../../knowledge/patterns/display-buckets-are-not-lifecycle-identities.md), [pinned identities](../../knowledge/patterns/pin-directory-identities-across-async-leases.md) and the [ancestor-swap issue](../../knowledge/issues/metrics-ancestor-swap-during-async-lease.md).

## Historical counts

Counts changed as work progressed: Graphify 41 entries during audit and 44 entries with 124 links at ship (three entries added); delivery about 1,004 lines for six files after S2, about 1,130 at build close and about 1,275 over ten files after audit and release additions; metrics tests 20, 33, 37, then 38, inside combined suites of 108, 138 and 156. Setup stayed at 22 checks and workflow doctor reported 729 checks at S3. A 36/37 run during audit was a corrected expected overflow total (70 to 75), with no conservation assertion removed. The fifth ship at that point triggered a proposal-only cooldown.

## Limitations

Per-operation path checks are not an atomic guarantee against hostile renames inside a syscall; cleanup may leave one private temp file. Unchanged legacy collector tests failed transiently under simultaneous runtime suites or endpoint contention (Node concurrent-writer barrier, name truncation, mode and cost cases; one Bun lease parity case); they passed standalone with the runner pinned and were not patched. Size and manual-validation conventions were waived for the state and report modules (D4). Native capture is unconfigured; the single real event was a manual build-skill use. Historical open items require comparison with later work before being called current defects.
