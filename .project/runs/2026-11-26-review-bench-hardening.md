# Run: review-bench-hardening (2026-11-25 to 2026-11-26)

Pitch: `.project/pitches/01-review-bench-hardening/` • Versions 2.58.0, 2.58.1 • small-batch • Orca Run `run_a45047840fc2` (coordinator claude)

## Timeline
- **/plan:** a spike found two routes missing from the pitch (`post-index-change` hook, submodule config); running `/plan` was recorded as the bet.
- **/build:** the owner asked for Orca. S1 codex, S2 claude, S3 opencode, one at a time. The first S3 worker failed with "Model is unavailable"
  (the briefs set no model); with the owner's choice it was stopped, its ledger entry moved to `failed`, and S3 relaunched with the configured model.
- **/audit:** cycle 1 (security claude, code codex, tests opencode) found real must-fixes, among them configured Git hooks still running. Patched in
  the coordinator thread. Cycle 2's first security reviewer disqualified itself; the retry completed. The committed pre-change bench gated the audit.
- **Follow-up S4:** `/ship-pitch` was interrupted to close the `guard` second-edit gap (codex build, claude review, executable-bit fix by the
  coordinator, not re-reviewed).
- **/ship-pitch:** verifier exit 0 (2,431 pass, 3 skip, 0 fail).

## Records
[hill](2026-11-26-review-bench-hardening-hill.md) • in the pitch folder: `SHIPPED.md`, `audit.md`, `deviations.md` • no `log.md`
