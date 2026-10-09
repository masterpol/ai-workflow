# Deviations: runner-aware-runtime-boundary-validator

- 2026-10-08 V3: the plan Contract omitted the `unparsed` Violation kind that the code and V1 exit criteria include, and listed `clock`/`io`/`proc` among suggestion targets although the module-to-field table covers fs/path/os/child/crypto/net (process globals suggest deps.proc or deps.io). README documents the code.
- 2026-10-08 audit note: an unparsed or oversize production file is a doctor warning, not a failure, so a violation inside a file the lexer cannot parse would not fail the check. Check in /audit.
- 2026-10-08 audit cycle 2: the amended rule means a purely computed `import(x)`/uncalled `require` is an advisory, not a failure (the spec first said fail; the legitimate hook import proved that too strict). Cycle cap reached; final fixes verified by coordinator-run probes and suites, not by a third independent review.
- 2026-10-08 build: worker attempt `audit8-fix-1` ended `failed` in the ledger (it stopped on the rule conflict by design); `audit8-fix-2` completed the work.
