# Deviations: fix-workflow-runner-env

The fix touches more than the test helper because the approved reproduction spans direct entry dispatch, inline hooks and workflow subprocess callers. Shared invocation selection avoids independent runner policies at those boundaries. No metrics schema changes are included.

Several pre-existing tests assumed that selecting the Node adapter under Bun meant the Node executable ran. They now align declarations and actual fixture launchers. The existing OpenCode live configuration probe still uses its prior Bun limitation; workflow-doctor reports it as unverified while completing static adapter checks. It does not override the configured runner to launch that check.

No release is recorded until audit and the ship gate are complete. Concurrent runtime-test-helpers records remain preserved.
