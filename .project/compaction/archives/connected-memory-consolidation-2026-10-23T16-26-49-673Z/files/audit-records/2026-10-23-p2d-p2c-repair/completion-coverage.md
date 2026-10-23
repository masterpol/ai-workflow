# Narrow coverage completion — cycle1

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check; final repo guard clean
prompt-sha256: 6ced5302f80a690bd2472f94fe947345bf8a278a47e1f70dcbbd4e5e88ee4799
model: gpt-6.1-sol high
cross-file interactions: reviewed

All three candidates PASS; no applicable unverified checks. P2d migration31/31, integrations10/10, installed1/1 in24.660s, fresh2/2 in5.380s. P2c selection16/16. Repair54/54; exact bytes and claim counts verified. Comparison53/54. Additional owned mutants removing dry-run apply gate and new-destination equality both turn the intended regression red.

| ID | severity | file:line | issue | verified | disposition |
|---|---|---|---|---|---|
| C-R2 | comparison only | state-ai-authoring-live-runs.md:33 | Comparison Claim: passed fails unchanged consumer; actual candidate remains blocked | yes; exact line and failing consumer independently reported | Deliberate scratch control, not a production finding |
| candidate | none | reviewed ranges in prompt | No production finding | yes; focused checks and source guards complete | PASS |

P2d: actual apply guard at consolidation-migrate.mts:179, refused/local handling and publication checks; installed fixture preserves46 legacy entries and owned hashes, uses both sync passes, migration and replay. P2c: current destination hashing at legacy-upgrade.mts:264–273, repeated at publication301 and final proof325; explicit archive admission285–289; shared source validation in pitch-compress417–479. Repair: complete36920bytes equal approved candidate; SHA256868e76e9eace40c14f8014e18a16a8fa5b702de13e5489ebcc29c4e7944fc24a;72runs,51pass/21fail,12seededbad all fail,oneCursor not-run,exactlyClaim: blocked. Consumer only changes path17, before/after hashes match proof;120000ms and16MiB unchanged. No new live-model claim.

The installed Git fixture is an isolated selected742-path export of original b26b45b, excluding secrets/recovery archives/historical pitch folders. The copied test BASE_REF alone changes to audit-baseline, a tag on the selected snapshot; production code does not change. Source/provenance is preserved in baseline-provenance.toon.

Prompt file: completion-coverage.prompt.md. Additional scheduling constrained installed tests to one at a time after the initial launch race. A single explicit35-second process allowance was used near the measured24.4-second margin; all other command bounds remain about20seconds. Security continuation received at most4 additional calls, no new review cycle. All initial limitations/timeouts are retained, not reported as passes.
