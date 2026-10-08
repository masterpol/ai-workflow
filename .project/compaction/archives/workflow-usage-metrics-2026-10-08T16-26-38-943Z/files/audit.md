# Audit — workflow-usage-metrics

**Date:** 2026-10-08. **Result:** PASS after three cycles; zero open must-fix.

Dispatched: code (gpt-6.1-sol high, independent: no) | security (gpt-6.1-sol high, independent: no) | test coverage (gpt-6-luna high, independent: no) | UX (gpt-6.1-sol medium, independent: no) | cross-pitch (gpt-6-luna medium, independent: no).
I18n not applicable: no configured locales or translation catalog. AI eval not applicable: no prompts or LLM call sites changed. No canary was planted, so these reviews do not claim canary-qualified independence. Reviewers ran scratch-only proofs with command/tool limits; exact prompts, hashes and per-pass findings are in audit-prompts/ and audit-reviews/.

## Verified triage

| ID | Tier | Issue | verified | Disposition |
|---|---|---|---|---|
| M1 | must-fix / high | Ancestor substitution during async lease permits outside reads/writes | yes: scheduling-point PoC | Pinned parent/directory identities, guarded effects and guarded action dependencies; lease/before-open/after-write proofs refuse outside effects and recover |
| M2 | must-fix / exit coverage | Unsafe destination lacked actual CLI proof | yes: test inspection | Added nonzero fixed error/empty stdout plus state, outside target and prior-view preservation assertions |
| S1 | should-fix | Concurrent first-directory creation throws EEXIST | yes: deterministic interleaving and reviewer test failure | Re-inspect and accept safe winner; refuse symlink/file winners |
| S2 | should-fix | Invalid scope labels fabricate matched lifecycle duration | yes: distinct raw labels normalize identically | Invalid vendor/pitch/phase scope counts events but cannot match duration |
| S3 | should-fix | Oversized composite provider/model loss hidden | yes: valid 40+40 labels | Explicit gap and overflow count; totals preserved |
| S4 | should-fix | Provider/model separator collisions merge distinct pairs | yes: three distinct tuples | Canonical component encoding with distinct decoded report labels |
| S5 | should-fix | Encoded unsafe/reserved model identity becomes attributed Unknown row | yes: persisted percent-key fixtures | Validate decoded allowlist and canonical encoding; malformed/reserved keys refused |
| S6 | should-fix | Wide tables inaccessible to keyboard scrolling | yes: static markup | Named focusable regions with visible focus ring; UX rechecked |
| S7 | should-fix | First-use recording guidance too low and incomplete | yes: static markup | Guidance and executable structured-event example precede Activity; UX rechecked |
| S8 | should-fix | Format agreement checks only selected headlines | yes: test inspection | All independently expected activity counts checked in JSON/Markdown/HTML |
| F1 | refuted | Isolated CLI smoke supposedly requires an automated test | no | Approved criterion is an executed isolated smoke; author-run command and SHA256 evidence already recorded |

Cycle 1 full applicable fan-out found M1/M2 and S1/S2/S3/S6/S7/S8. Cycle 2 narrowed to code/security/coverage/UX: prior fixes passed, S4 identified. Cycle 3 code/security/coverage examined encoding; S5 found and fixed, code verified the final correction within the same cycle. No fourth cycle or unresolved blocking queue.

## Verification and limits

- Final explicit Node, sequential eight-file suite: 156/156 pass (38 metrics, 13 shared helpers, 88 existing collector/plugin/lease, 17 docs-links).
- Final equivalent Bun suite: 156/156 pass. Intermediate unchanged legacy failures remain in log.md; final runs passed without unrelated collector patches.
- Setup READY (22 checks); graph CLEAN (41 entries); two changed docs have zero broken links; whitespace check clean.
- Current ignored project reports regenerated; one genuine manual skill event remains, source state SHA256 unchanged. Automatic capture remains unconfigured.
- Security reviewer reproduced original outside-state modification before fix, then confirmed no outside reads/writes and successful recovery after each interruption. Code reviewer checked descriptor closing after an opened-file interruption. UX H8=2/3 passes the threshold; review is static, not browser proof.
- Guard cycle 1 changed only concurrent orca-apply.test.mts and runtime/test-helpers.mts; cycle 2 changed only concurrent runtime-test-helpers/deviations.md and its status row. No metrics delivery paths changed during those reviews. Cycle 3/final guards were globally clean. No reviewer modified the repository.
- Path checks are per-operation checks, not an atomic guarantee against hostile renames inside OS syscalls. On substitution after temporary creation, guarded cleanup refuses the substituted path and may leave one private temporary file in the original directory; no external file is removed. See D3.
- Large coupled modules/manual schema validation are acknowledged conventions reconciled in D4. No dependency, native-hook, legacy collector or shared helper implementation edits belong to this pitch. Shared release records preserve the earlier Orca entries; version remains 2.16.0 for this logical core change.

**Gate:** audit evidence ready for user approval to ship the core. Capture/adoption remain dependent work.
