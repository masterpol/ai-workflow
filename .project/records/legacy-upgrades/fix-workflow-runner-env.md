# Source-review supplement: fix-workflow-runner-env

Prepared 2026-10-22 from the verified recovery source. This supplements the unchanged [compact record](../pitch-compression/fix-workflow-runner-env.md) for the 2026-10-08 bug-fix release 2.16.2. All verification below is historical.

## Acknowledged items and verification limits

The compact record's Section 6 does not reproduce the original six acknowledgments exactly. The original audit acknowledged literal Node hook bootstraps; missing hooks.json wiring assertions; the deliberate oversized-input exit; parse-check arguments chosen from deps.runtime; empty child runner values selecting Node; and unchanged execution of operator-supplied review-bench.mts -e arguments. The retained backlog also records Node parity not repeated at ship time and unproven Node 22.12–22.17 flag handling. Those are verification limits, not replacements for an original acknowledgment.

## Implementation and fixture lessons

[Compact record Section 8](../pitch-compression/fix-workflow-runner-env.md#section-8-logmdapproved-build-2026-10-08) retains central invocation selection, canonical runner export and the six migrated callers. Both child APIs preserve supplied spawn options. Direct entries dispatch in both runner directions; Node-only compatibility flags apply only to Node. Hook regressions covered blocked development commands, Windows pass-through, malformed input, PR/push guidance and oversized stdin. Hook bootstrapping dispatches before hook logic. Sanitized child environments must preserve PATH when runner switching needs executable lookup; parent secrets must not be merged back. The [runner-boundary pattern](../../knowledge/patterns/one-boundary-selects-the-child-runner.md) retains the owning policy and executable assertions.

Initial failures included stale exact-call expectations, incomplete injected processes and fixtures declaring Node while launching Bun. Fixtures were corrected before the successful broad run. The OpenCode live configuration probe remained unverified under Bun while static adapter checks completed, without overriding the configured runner. The wider fix was justified by the reproduced entry, hook and subprocess boundaries rather than a metrics-schema change.

## Audit provenance

One audit cycle reported zero must-fix and zero should-fix findings. Four roles reviewed a scratch copy without Git metadata or .env* files. The saved prompts required whole-file and cross-file review, focused Bun tests, at most twelve tool calls, shell commands under twenty seconds and explicit reporting of unfinished checks. Independence was explicitly no: there was no canary and reviewers received the contract and build log. The summary names sonnet, while saved prompts/context specify gpt-6.1-sol; the retained evidence does not resolve that discrepancy.

Historical focused results were 24 pass and 153 pass/4 skip for code; 19 pass for security; 97 pass/4 skip and 139 pass for coverage; 19 pass plus six live hook probes for conflict review. Probes covered runner precedence under both bootstraps, missing-executable failure without fallback, invalid-runner rejection, development blocking, guidance pass-through and oversized input.

Reviewers did not verify the full Bun suite, Node parity, bundle-sync/setup-validator sibling tests or old-Node flag handling. The boundaries checklist walk was incomplete. Full-suite/build evidence remains author-run; Node parity reported 296 pass, one Bun-specific skip and zero failures. The guard observed status/concurrent-log touches outside the scratch reviewers' write surface; the original audit attributed them as external touches, with no content diff in the concurrent log. Generic role prompts and transient lookup paths add no independent verification evidence.
