# Audit cycle 1 — codex-orca-coordinator-parity

Dispatched: code (Sonnet, independent: no) | security (Sonnet plus fresh completion pass, independent: no) | test (Haiku plus fresh Sonnet completion pass, independent: no) | cross-pitch (Haiku, independent: no). UX/i18n/eval: not applicable; no UI, translated strings, LLM call sites or golden-prompt changes. Each dispatched worker used the real Orca route with `coordinator: codex`, an explicit model, a nonsecret scratch copy, command/time/tool-call limits and an authoritative completion. Max concurrency was three. Individual `review-*.md` records carry exact prompt hashes, original reports and verification classifications.

## Verification and independence

The vendor canary existed only in three scratch hook copies (line 55 changed to Claude). Baseline vendor test exited 0 and the mutated copy exited 1; every first reviewer detected it. The actual checkout uses Codex and its vendor/root tests pass. `review-bench canary-check` for the code report returned `caught: true`. These are canary findings, not actual checkout vulnerabilities.

The first test report stopped after the canary and left most coverage unreviewed. A fresh Sonnet reviewer completed the checklist; a fresh security pass supplemented rule/interface coverage. Their scratch registrations carried a three-second timeout canary; both recognized the mismatch against the 5s/4s/8s contract. The actual registration has timeout8. No independent: yes claim is made: reviewers use an alternate family to the current Codex author, and their unexecuted checks/rule-reading limits remain explicit. Main-thread verification is **author-run**, never substituted for an independent review.

The initial repo guard also observed concurrent changes to the parked vendor-adapter pitch, OpenCode ship record and status index. These occurred before reviewer work; implementation files were unchanged. The snapshot was refreshed without attributing those records to reviewers. All subsequent before/after guards were clean. The secret-reading guard incident and corrected final guard are documented in cycle 2.

## Must-fix

None after checking the actual checkout. Planted defects are excluded, not counted as fixed production bugs.

## Should-fix

| ID | Source | File | Issue | Verified | Disposition |
|----|--------|------|-------|----------|-------------|
| S1 | code/security | ai-framework/scripts/workflow-doctor.mts:278 | Substring wiring checks accept an echo/comment example instead of executing the adapter | yes: author-run scratch regression failed, doctor returned pass | Fixed and re-reviewed in cycle 2 |
| S2 | test completion | ai-framework/hooks/scripts/orca-start-codex-hook.test.mts:135 | Exact 64 KiB boundary and isolated post-probe elapsed guard lacked direct proof | yes: inspected prior assertions; stalled probe could be caught by decision budget alone | Added boundary and elapsed-guard removal tests in cycle 2 |
| S3 | cross-pitch | .codex/hooks.json:20 | Git-root bootstrap blocks before the adapter switch check, including when off | yes: exact command and shell regression | Documented Git/checkout requirement and bootstrap exception; non-Git support deferred |
| S4 | code/security | ai-framework/hooks/scripts/orca-start-codex-hook.mts:32 | Missing trusted root falls back to cwd for the switch read | yes; matching phases subsequently block invalid-root | Defer unsupported direct-entry configuration; installed hook always supplies trusted root and payload cannot select it |
| S5 | test completion | ai-framework/hooks/scripts/orca-start-codex-hook.test.mts:178 | Hung-input timer uses wall clock and an exit spy, not a fresh trusted host | yes, unit test limitation; no observed flake | Retain behavior test within host budget; actual host activation remains unverified under approved criterion7 |

## Acknowledged and rejected claims

- Canned Orca binaries are unit fixtures. They do not prove authentication/runtime compatibility or host activation. Live Codex dispatch/collection/release evidence is recorded separately; actual worker-hook host activation is not inferred.
- Missing mutants for every possible argument variant are not a missing plan exit: the approved plan specifically required a vendor/blocking mutant, both present. The synchronous elapsed guard now gets its own removal proof.
- The reported NBSP non-match is refuted: the parser uses JavaScript `\s`, which recognizes NBSP. No parsing bug was reproduced. Duplicate roots/flag-looking values are unsupported trusted-registration arguments and cannot override payload roots; no unsafe ready result was shown.
- `done` in the status hill column means S1 implementation done; the phase column explicitly awaited the audit gate. Criterion7 permits unverified host cases. The claim that completion required fabricated hook proof is rejected.
- The sibling vendor-adapter pitch was parked for an invalid premise and has no implementation/plan overlap. A proposed generator file set is not pure overlap. Preserve this Codex hook if that pitch is ever revived; do not overwrite parked history.
- OpenCode handoff and ship notes are separate dated records; their corrected/current context and present adapter files do not establish an overlap. Do not rewrite their history from this pitch.

## Cycle transition

Main thread fixed S1, strengthened S2, recorded S3–S5 and dispatched only code/security/test reviewers for cycle 2. No extra implementation files or runtime APIs.
