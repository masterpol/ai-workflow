# Audit: token-time-report

**Status: OPEN — required independent reviews incomplete.** Orca recovery succeeded. This is not a clean audit and is not a ship approval.

Owner authorized recovery with “Fix orca”. Audit Run `run_d637f70c7cec`, coordinator `term_1cbc70ba-633b-4237-a76c-881b1335ba38`. Cycle 1 ran the full applicable fan-out; cycle 2 covered the renderer/mutant changes and one fresh narrowed retry of incomplete code/security/coverage reviews. No additional retries bypass the review contract.

## Orca recovery and verification

Corrected nonempty authorizedPaths on read-only reviewer payloads. Repaired review-bench snapshot writer/reader agreement with a separate 16MiB bound; report/manifest readers retain 256KiB. Excluded secret-shaped paths before the guard reads them. Regressions cover round-trip above 256KiB, edit detection, oversized writer refusal, and no credential-shaped reads; existing symlink/FIFO tests remain passing.

Nine authoritative completion messages were accepted; nine canaries caught and nine record-check results valid. Eight resources were released. Coverage retry was retained with `user_takeover`; no forced cleanup. All attempt ledgers are settled and deliveries acknowledged. A settled worker report does not imply a completed independent review.

Repository guard cycle 1 is clean. Retry comparison differs only in the coordinator's final guard source/test patch and the eight newly excluded secret-shaped paths. HEAD/status are unchanged and no reviewer edits were detected. The guard still uses size/mtime for four >2MiB saved evaluation graph fixtures; that limitation is acknowledged, not claimed tamper-proof.

## Review evidence

| Role | Reports | Canary | Independent/completeness | Evidence |
|---|---|---|---|---|
| Code | first + one fresh retry | both caught | not-completed; retry omitted contract/provenance/exception checks | audit-review-code.md, audit-review-code-retry.md |
| Security | first + one fresh retry | both caught | not-completed; lease lifecycle/runtime environment left unverified; first pass also read a live diff | audit-review-security.md, audit-review-security-retry.md |
| Test coverage | first + one fresh retry | both caught | not-completed; required target/guard proof left unverified; original retry lacked findings-table verified column | audit-review-coverage.md, audit-review-coverage-retry.md |
| UX | first + focused recheck | both caught | first static review complete within its scope; final recheck self-declared incomplete | audit-review-ux.md, audit-review-ux-recheck.md |
| Cross-pitch | first | caught | complete ownership check; actual live pitches are disjoint | audit-review-cross.md |
| i18n | N/A | N/A | no configured locale system or locale keys | bundle context and .project/rules/README.md |
| Eval | N/A | N/A | deterministic local report; no AI-prompt scope | approved plan |

Browser geometry and contrast are outside this approved static-code review scope; their absence alone is not the audit blocker. Author-run full-suite and coverage numbers below do not fill missing independent reviews.

## Must-fix / evidence blockers

| ID | Source | Issue | Verified | Disposition |
|---|---|---|---|---|
| M1 | Code | Required contract/provenance checks unfinished after fresh retry | yes, report explicitly lists them | independent: not-completed; do not ship |
| M2 | Security | Required lease/runtime safety evidence unfinished | yes, report explicitly lists it | independent: not-completed; do not ship |
| M3 | Coverage | Required coverage/guard proof remains unverified | yes, report explicitly lists it | independent: not-completed; do not ship |
| M4 | UX | Focused final report explicitly claims incomplete checks | yes, report text | preserve incomplete status; do not claim a clean final review |
| M5 | Guard repair | Final secret-exclusion patch is only author-tested | yes, patch and 35-test runs | needs independent review |

No confirmed high/critical defect remains in the live report implementation. All high findings in scratch are planted canaries, deliberately absent from live code/pitch artifacts. Missing evidence itself keeps the audit open.

## Confirmed fixes and reruns

| Fix | Failure / proof before | Current evidence | Verified |
|---|---|---|---|
| Snapshot cap | original checker refused its own large checkout snapshot | 35 Node + 35 Bun guard tests; live round-trip | yes, author-run |
| Secret-shaped guard reads | old walker hashed protected-name entries | regression refuses any read of synthetic credential-shaped file | yes, author-run |
| Bare Markdown links | labels containing https://, www. and email emitted unescaped punctuation | regression checks escaped URL/email text; renderer suite passes | yes, author-run |
| Provisional timing warnings | warning appeared only by observation window | three warnings in Markdown/HTML beside time tables | yes, author-run |
| Guard-mutant specificity | rejection regex could match a scenario label | assertion now requires actual exit 0/publication versus expected refusal | yes, author-run |

The initial new regression injected a plain URL into HTML while the pre-existing assertion rejects any URL text; separated the Markdown fixture and retained the original inert-HTML assertion. The initial stricter mutant matcher omitted the actual `flow-report:` stdout prefix; corrected it and reran successfully. Failed and successful logs remain under local audit evidence.

## Should-fix dispositions / acknowledgements

Confirmed pre-existing review-bench Git config execution, numeric cap/path quoting, in-root '..' snapshot names and raw errors are deferred to TTR-A1/A2/A3 in deviations.md. They are not used as safety/appetite claims on untrusted roots here. Source-level unavailable/stale reasons already appear in the first table; additional repeated banners, Path-first row headers and help polish are deferred as TTR-A4. Retain mtime as a documented redundant conservative layer. Numerical row headers, raw developer details, optional back navigation and neutral internal-tool styling are acknowledged.

Refuted: trace-class credential leak is unreachable through the validated CLI reader, which enforces a fixed enum. Scratch-only ownership/keyboard/cross-pitch defects are not live failures. The code retry's claim of absent plan.md/workflow-metrics.md is contradicted by their existence in its own scratch; required reading was still not completed, so that false claim does not close M1.

## Current author-run verification

- Full Node: **2472 pass, 0 fail, 3 existing skips**, 2475 total, 90.717s, exit 0. Prior audit run: 2469 pass / 2 fail / 3 skips; unchanged runtime readiness-JSON race and geometry timing limit. Both unchanged files passed 216/216 in isolation. No threshold/runtime setting changes.
- Scoped Node before final secret exclusion: 75/75; final guard Node: 35/35. Scoped Bun before final exclusion: 154/154 including state link; final guard Bun: 35/35.
- Report modules: **100% line coverage**, branches join 95.49%, render 96.63%, CLI 90.97%; exit 0.
- Setup validator: 23 checks; graph: CLEAN, 116 entries / 328 links; final reruns recorded locally. git diff --check passes.
- 11 implementation/test/contract files, **1479 changed lines / 1500 cap**. Release metadata deferred with 21 lines left; VERSION/CHANGELOG untouched.
- Local report regenerated successfully, generation `72a94aa2-ffb6-4984-978f-a08896b62657`. Reviewable artifact: `.project/metrics/flow-report.html`; no public artifact published.

## Gate

Audit remains open under 3-audit.md "Incomplete reviews". Approve cannot advance to ship while M1–M5 remain. The next owner decision can revise the review approach (for example, explicitly supply the missing contract inline), go back to build, or stop. Do not spend further review retries or claim independence by substituting author checks without an explicit revised direction.

## Subsequent approved evidence pass — 2026-10-21

The owner explicitly approved the additional bounded review proposal. M1–M5 are now closed by the independent checks and measured corrections recorded in audit-final-evidence.md. The historical open status and incomplete reports above remain preserved. Current status: audit complete, awaiting the owner audit-end gate; no automatic ship advancement.
