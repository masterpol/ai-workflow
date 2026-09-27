# Compaction record: independent-rereview-catch-up

Prepared 2026-09-27 from the shipped pitch and its review records. Test counts below are historical shipping evidence, not tests rerun during compaction. Complete prompts and detailed finding tables remain in the recovery archive.

## Section 1: SHIPPED.md#scope-reconciliation

S0 shipped review-bench prepare, guard snapshot/check, count, canary-check and record-check (22 tests). S1 completed five dispatches over three cycles, 13 compaction fixes in four files (75 tests). S2 completed five dispatches over three cycles, 12 metrics fixes in four files (79 tests). S3 completed five dispatches over two cycles, six fixes in five files (92 tests); a second review caught two incomplete fixes. S4 shipped the eight-rule audit reviewer contract, prompt template and per-role independence field, with an identical Cursor mirror. Total: 268 scope tests; ship-time full suite 390 tests, 389 pass, zero fail, one macOS platform skip for a Linux identity fixture. Doctor 746 checks, setup 21 checks and graph passed. Used 19/19 approved files.

## Section 2: SHIPPED.md#confidence-read-this-before-relying-on-it

The outer audit first independently reviewed review-bench itself and found four must-fix security defects: ancestor-symlink escape, symlink-following writes, raw filesystem error/path leaks and a FIFO read hang. All were fixed and mutation-verified. Earlier guard evidence rested on weaker defenses; no exploitation was observed and records say no untrusted input reached the bench. Independence means fresh context in the same model family, not independent blind spots. Every planted canary was caught, but S3a had no canary in its scratch. Two S3 fixes needed a second review. A cross-pitch authorship accusation was refuted from prior prompts and the other pitch records. Open limitations are preserved below, including cases not present as standalone backlog entries.

## Section 3: SHIPPED.md#no-gos-honored

The shipped record claims must-fix-only changes, no reviewer writes to the real repository and no author check presented as independent. Preserve the qualifications: S3 explicitly fixed three should-fix items within its approved five-file cap; S2 also lists lower-tier fixes, some promoted under mandatory security rules. S3 omitted guard snapshots, so read-only evidence was a weaker before/after status inference, not a guard diff. These documentary tensions must not become an unqualified claim that every original no-go was met.

## Section 4: SHIPPED.md#rabbit-holes-resolved-as-committed

The initial 15-file cap had a projected 17–21-file risk. User approved 15→16 to include a truncation regression test, then 16→19 and S3 4→5 files when review found further defects. Concurrent ownership was checked against prompts and diffs: collector lock/identity, path-safety work and quoted-font discovery belonged to other pitches. One outer-audit attribution was refuted; compatibility checks did not close those other pitches.

## Section 5: SHIPPED.md#deviations-that-changed-the-plan-see-deviationsmd

S4 ran ahead of S1–S3 while overlapping edits stabilized. S3 omitted pre-dispatch guard snapshots; unchanged status was weaker evidence. S3a lacked contract documents, with checks marked unavailable and later covered by the cross-file review. S1 P13/CRLF, S2 Q14 and final S3 corrections received PoC/regression/mutation checks but no further independent re-review. Source explanations disagree on how the three-cycle cap applied across slices; preserve the actual absence of final re-review rather than resolve that historical inconsistency.

## Section 6: SHIPPED.md#audit-findings-final-disposition

Outer audit fixed four bench security defects and left no open must-fix. The large-file guard uses size:mtime above 2 MB, so same-size timestamp-preserving changes can evade it; this was an acknowledged limitation, not an open action. Reviewer isolation is prompt convention plus detective controls, not a process sandbox. A collector authorship accusation was refuted and dropped. The font-overlap complaint misquoted a function-specific claim; no finding remained. Compaction compatibility, code review and mutation spot checks passed.

## Section 7: SHIPPED.md#knowledge-extracted

Reusable lessons already exist in [[a-gate-must-not-audit-its-own-instrument]] and [[false-cross-pitch-attribution-in-a-shared-uncommitted-file]]. Updated design records [[token-metrics-dimensions-design]] and [[project-state-report-design]] retain vendor-scoped notes, rejected snapshot retention, truthful truncation status and ancestor containment. [[a-gate-must-not-trust-its-own-author]] remains relevant. This compaction introduces no new implementation claim.

## Section 8: SHIPPED.md#followups-see-followupsmd-for-full-text

Open work in .project/pitches/_followups.md includes plugin null-event/map/model hardening; since/metricScope contract tests; lstat/read races; lifetime clamping versus the reversal pattern and overflow label; collector commit reconciliation; four HTML nits; final S3 independent re-review; bench process isolation; and cap headroom at cooldown. S1 also retains transaction-context recovery ownership with path-safety-hardening and ledger content-binding/required-set design limits. Exact contrast equality, astral truncation, cosmetic token-snapshot note text, GFM viewer behavior, final S1/S2 re-review and guard precision remain explicit limitations even where no standalone backlog action exists.

## Section 9: pitch.md#no-gos

Original constraints: no new features/refactors; must-fix independent findings only; should-fix, acknowledged and known deferred defects belong in followups; no edits to compacted archives/ledgers/done-work/history; reviewers read-only and prohibited from secrets; author checks never labeled independent; no repeat of completed state security cycles 2–3; no live-host verification. Compare these intended constraints with the documented departures above, especially lower-tier fixes and the missing S3 guard snapshots.

## Section 10: pitch.md#rabbit-holes

Fresh agents must not resume prior context or see earlier findings; author verifies cited claims. Failed reviewers get one narrower fresh retry, then remain not independently reviewed. Prompts use bounded roughly 500-line slices, explicit models, whole-file/checklist and cross-file review, hard limits, known-defect exclusions, scratch-only PoCs and measured canaries. Three-cycle stop and claim-verification budgets bound the work; unknown overflow remains unresolved. Planner owns sizing/models/rate limits; build owns repeat review and restricted-tool feasibility. Harness-enforced budgets and automatic cross-vendor routing were excluded. Concurrent work invalidated the initial assumption of no other active pitch.

## Section 11: audit-cycle-1.md

Four outer-audit roles covered security, code, tests and cross-pitch overlap; UX/i18n/AI roles were inapplicable. Live PoCs confirmed an ancestor-symlink outside-root bypass, arbitrary overwrite via a symlinked snapshot target, raw path leaks and an indefinitely blocking FIFO read. Fixes resolve the nearest existing ancestor before containment checks, use guarded temp+wx+rename writes and bounded regular-file reads with fixed messages. Each fix was reverted in scratch and caught, including the FIFO hang. Bench suite: 22 pass; full suite: 389 pass, one skip, zero fail; no additional budget files. Six subject-fix spot checks passed. Large-file size:mtime and unsandboxed reviewer processes remain limitations. Attribution was verified against predating prompts and collector deviations; the accusation was false. S4 copies match; omitted claim-budget and canary-refusal wording remain documentation followups.

## Section 12: deviations.md#s0-2026-09-26

S0 added the bench, its tests and doctor registration within its three-file budget. The author supplies a canary replacement; the bench requires exactly one match, a green baseline and a failing mutated test, with the manifest outside reviewer input. count --since cannot attribute edits among concurrent sessions. The no-other-active-pitch assumption failed and was raised before S1.

## Section 13: deviations.md#s4-2026-09-26

S4 was built first while four overlapping pitches were awaited. Its initial contract used critique findings C1–C6 and observed reviewer failures, with amendments after S1–S3 allowed within the same files.

## Section 14: deviations.md#s1-2026-09-26

S1 used a verification budget of eight claims per role-slice, five dispatches across three cycles. Independent rechecks found a heading-key collision and security gaps in prior fixes. Final-round P13 and CRLF patches were PoC/mutation-checked only. Mandatory security checklist requirements were promoted to must-fix. assertPlainPath became a shared exported implementation. Four-file slice cap held; transaction-context repair remained with path-safety-hardening, required-set design went to followup and done-work truncation went to S3.

## Section 15: deviations.md#s2-2026-09-26

S2 used four files, reaching 14/15 total. The cap pushed a plugin model defect guard into the collector; plugin hardening remained open. Concurrent guard differences during three review windows were attributed by content, not timestamps. Collector edits excluded another pitch’s lock/identity region and require reconciliation. Final Q14 corrections lacked another independent pass.

## Section 16: deviations.md#s2-gate-2026-09-27

User approved 15→16 total files so the known done-work truncation defect could ship with a regression test rather than an untested fix.

## Section 17: deviations.md#s3-gate-2026-09-27-second-cap-raise

User then approved 16→19 total and S3 4→5 files after review found truncation, ancestor-symlink and null-render defects across three implementations plus two test files. Three should-fix changes landed in those same files. Repeated underestimate became a cooldown question about reserving headroom for newly discovered defects.

## Section 18: deviations.md#s3-2026-09-27

S3 took no guard snapshot before its five dispatches; status comparison is weaker evidence. S3a omitted contract docs; missing checks moved to the complete-doc cross-file pass, not a rerun. Four HTML nits went to followup and redundant color-scheme metadata was rejected. Two incomplete fixes were corrected and mutation-tested without a further independent review. Its cycle-cap justification is inconsistent with the per-slice cycle counts elsewhere; the review limitation is retained without endorsing that explanation.

## Section 19: log.md#2026-09-26-s0-built-review-bench

S0 syntax and 18 tests passed, with 100% line and 86.9% branch coverage reported. Twenty-three scratch mutants were caught after adding tests for HEAD, index-only status and symlink-retarget changes. Guards cover canary application, single-match/green-baseline requirements, command restrictions, secret/symlink/size refusal, outside-root paths, ignored-tree detection, file-count exclusions and independence/canary fields. CLI --root-before-command parsing was fixed. Only git/node spawned; readers bound to 512 KB. Doctor/setup passed. Later outer-audit findings qualify these initial security claims.

## Section 20: log.md#2026-09-26-concurrency-found-before-s1-build-paused

Before S1, count --since showed 25 files dominated by four concurrent pitches. They overlapped compaction, metrics and theme code plus shared records. Guard/count could not attribute writers, and reviewing changing code risked stale conclusions. Build paused after S0; no S1–S3 review had run yet.

## Section 21: log.md#2026-09-26-s4-built-ahead-of-s1s3-audit-reviewer-contract-first-pass

S4 delivered the reviewer contract and per-role independence field first. Required prompt terms and fields were checked; Claude/Cursor copies were identical, skill length 80 lines, doctor/setup passed and 16 bundle-sync tests passed. Named file count was six of the original 15; Git-based counting was unreliable under concurrency.

## Section 22: log.md#2026-09-26-s1-built-compaction-re-review

S1 ran five fresh dispatches, all planted canaries caught. Guards b–e were clean; a flagged four concurrent paths written before its prompt. Sixteen findings yielded 13 fixes across four files; one belonged to another pitch, one moved to S3 and one was a design limit. Shared suites: 160 pass; doctor/setup passed. Forty-one mutants had two intentional survivors (redundant line cap and unreachable graph stderr fallback). Review caught flaws in heading-key and guard fixes and a cwd-dependent test. An existing metrics ledger had omitted No-gos; the transaction-context mismatch remained owned elsewhere.

## Section 23: log.md#2026-09-26-s2-built-metrics-collector-re-review

S2 ran five dispatches, all final canaries caught; three candidate canaries were refused because tests did not detect since, metricScope or weak address-escape changes. Guard d was clean; others reflected concurrent records/archives, some attributed by content inside review windows. Fifteen findings led to 12 fixes in four files, a collector-side plugin guard and followups. Shared suite: 244 tests, 243 pass, one skip, zero fail. The real 417-completion snapshot retained totals. Rechecks found malformed counters/records that would wipe history; rejected snapshots now remain as token-consumption.json.rejected. About 48 mutants had two deliberate redundant/unreachable survivors.

## Section 24: log.md#2026-09-27-s3-built-state-collector-theme-renderer-re-review

S3 ran five fresh dispatches across two cycles. S3a had no canary and missing documents; every dispatch touching the canaried renderer caught it. Seven findings: three must-fix, three should-fix fixed and one cosmetic acknowledgement. Independent recheck caught two missed truncation sites and three snapshot root-resolution error sites; all were fixed with tests/mutations. State suites: 92 pass; full pre-outer-audit suite: 385 pass, one skip. Contrast-equality mutant survived and became a gap. Four HTML nits deferred; redundant color-scheme meta rejected. Named count: 19/19 versus unassignable combined Git count 45.

## Section 25: log.md#2026-09-27-audit-cycle-1

The outer audit found four real bench vulnerabilities that its own tests had missed; all fixed and mutation-verified. Earlier records retain weaker pre-fix safety guarantees, without evidence of exploitation. The cross-pitch lock/identity accusation was refuted using an earlier S2 prompt and collector-owned deviations. No open must-fix remained. Ship-time suite and confidence caveats are preserved above.
