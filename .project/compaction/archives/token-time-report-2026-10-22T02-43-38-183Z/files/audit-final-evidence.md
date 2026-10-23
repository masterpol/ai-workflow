# Final audit evidence: token-time-report

**Status: COMPLETE — no open must-fix findings; awaiting the owner's audit-end approval before ship.** This supersedes the open status in audit.md without rewriting the preserved incomplete reviews. Source and test files are unchanged during this evidence-only pass.

## Authorization and scope

The owner explicitly approved the prepared proposal for one additional bounded evidence pass after the automatic retry limit. This is audit cycle 3, the final big-batch cycle. Four fresh Claude Sonnet reviewers covered only M1–M5. The approved plan/metrics contract were copied to visible-root REVIEW-CONTRACT.md and supplied concisely inline. Every packet had its own scratch canary, proven by a passing baseline and a failing modified scratch test. No earlier reviewer findings were supplied.

Audit Run: `run_d637f70c7cec`. Four exact own worker_done messages were accepted; four resources released with captured archives, four attempt ledgers settled, deliveries acknowledged. The previously retained human-owned coverage-retry terminal remains untouched.

## Blocker closure

| Blocker | Independent evidence | Disposition |
|---|---|---|
| M1 contract/provenance | Code reviewer read the contract; 120 flow/state tests pass; NOTES traced to fixed bundle constants; cohesion rationale assessed | closed; real exception-ownership documentation gap fixed in matching plan.md/deviations.md addenda |
| M2 lease/runtime safety | Security POCs cover missing metrics, preview, contention, refusal, legacy lock, safe release and unsafe ancestry; runtime command/environment traced | closed; loopback lease creates no project files; test children inherit the parent environment under the existing trusted-operator model |
| M3 coverage/guard evidence | Independent report modules 100% line coverage; 102 state-snapshot + 79 state-html tests; source-size refusal assertion passes; direct render cap and snapshot cap mutants caught; stalled-write mutant times out at 15s | closed with the mutant limitations below; no blanket claim of independent isolation for every redundant per-file read cap |
| M4 final static UX | Separate POCs execute warning counts (3 pending / 0 settled), inert URL/email labels, captions/IDs/headers, keyboard attributes and fixed state link | closed; planted keyboard defect absent from canonical source; browser geometry/contrast remain outside the approved static scope |
| M5 secret-exclusion patch | Code and coverage trap the planted missing skip; security independently reproduces secret-shaped reads in the scratch variant; coverage walkfix POC passes all 35 guard tests | closed; canonical source contains the skip before lstat/read and matches the prepared source |

Detailed records: audit-approved-evidence-code.md, audit-approved-evidence-security.md, audit-approved-evidence-coverage.md and audit-approved-evidence-ux.md. All four pass record-check. Older incomplete records remain unchanged and are not relabelled as clean reviews.

## Measurement corrections and limits

- All four reviewers semantically caught their actual planted defect. Code and UX also pass automated raw citation matching. Security and coverage misnumbered source locations, so their raw automated citation checks fail. The coordinator confirmed the exact missing predicate, executed-failure description, scratch diff and manifest at review-bench.mts:175. Raw reports remain intact; the corrected location and manual detection evidence are explicit in the records. This is not a claim of four automated citation passes.
- The coverage review's 1e12 source/per-file-read cap mutants are discarded as allocation-confounded: readText allocates maxBytes+1. A coordinator finite 4MiB-to-8MiB source-cap mutant fails precisely at the oversized-source assertion (unexpected-shape refusal instead of expected size refusal). This rerun is labelled author-run supplementary evidence, not independent execution. The independent normal source-size refusal test passes; direct render-output-cap and snapshot-cap mutants have named intended failures. No independent intended-reason proof is claimed for every secondary existing-file/staged-file read cap.
- The disabled stalled-write guard is caught as a 15-second timeout, not an assertion failure. It is not a redundant guard. The previously documented target-mtime check remains a redundant conservative refusal layer; it is not claimed to have an independent killing test.
- Fresh reviewer / same author model family / caught canary does not prove independence from family blind spots. It establishes the bounded evidence contract actually used here.
- Trusted-root Git execution, strict count parsing, dot-prefix snapshot destinations/raw-error polish and optional static-report usability remain the named TTR-A1–A4 follow-ups. No untrusted-root safety, isolated test environment, atomic three-file publication, browser geometry or contrast claim is added.

## Read-only and verification evidence

The live repository guard was clean after all four workers completed, before coordinator documentation amendments. Each of the 54 manifest files in each scratch tree matches its baseline except the single exact planted mutation. No worker source/test/live edits were detected. The guard's known size/mtime-only treatment of four large saved evaluation graph fixtures remains acknowledged.

Current source/test bytes still have the prior full Node result: **2472 pass, 0 fail, 3 existing skips** (2475 total, exit 0). New independent scoped runs add evidence without requiring another identical full-suite run. Current report-module line coverage is 100%; branches join 95.49%, render 96.63%, CLI 90.97%. The final guard suite passes 35 Node and 35 Bun tests on the canonical source from the preceding repair verification. Setup validation, graph check and diff check are rerun after documentation amendments.

Implementation/test/contract size remains **1479 changed lines across 11 files**, under the unchanged 1500-line / 15-file cap. Release metadata has 21 lines remaining and is deferred to ship. VERSION/CHANGELOG are untouched.

## Audit-end gate

The owner approved the additional review pass, not shipment. **Approve → ship / Revise / Back to build / Stop.** Do not auto-advance. No further review retry is authorized by this report.
