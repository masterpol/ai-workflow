# Unfinished pitches assessment — 2026-09-27

The user requested completion of unresolved pitches. Inventory contains two unfinished scopes: path-safety-hardening and collector-robustness. Both explicitly require re-planning; neither can honestly close its original safety promise from the current code or the earlier native feasibility spike.

Fresh baseline: 191 tests across add-skill, pitch-compress, pitch-archive, token-consumption, token-report and opencode-plugin; 190 passed, zero failed, one Linux-only identity fixture skipped on macOS. This verifies the current bounded defenses, not the unresolved races.

A temporary in-memory Node subprocess probe showed that a live listening socket excludes a second process (EADDRINUSE) and confirmed holder death permits acquisition. A SIGSTOP request also left contention, but the probe did not acknowledge the stopped state. It is preliminary evidence only; no source or production metrics were changed.

Draft completion plans are stored alongside both live pitches as completion-plan-2026-09-27.md. Path safety proposes an explicit trusted-directory boundary and unified ledger/archive transaction recovery. Collector robustness proposes a dependency-free kernel socket lease with an awaited API and explicit quiescent legacy migration. Both need acknowledgement of changed contracts; collector scope expansion also requires critique before final plan approval. Existing pitch/history files and live metrics remain untouched.
