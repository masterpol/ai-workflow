# Deviations: review-bench-hardening

- 2026-11-26 (/build): planned no build workers. The owner asked for Orca mode, so S1–S3 are dispatched to Orca workers one at a time (same
  files, shared checkout). Run `run_a45047840fc2`; vendors picked by the balancing rule. The coordinator verifies each result itself and writes
  anything under `.project/`.
- 2026-11-26 (/build): work moved to a new local branch `feat/review-bench-hardening`, with the uncommitted ship records carried along.
- 2026-11-26 (S3): the first OpenCode worker (`ctx_8f10c7972b7a`) failed with "Model is unavailable", twice, with no file changed. The
  coordinator's build briefs had set no model, so OpenCode used its own default, not the configured one (S1 and S2 also ran on their tools'
  defaults). With the owner's choice: `worker-stop` (Orca: failed, exited, released), then the ledger entry was moved `launched` → `failed`
  through the ledger's `update` (no CLI command does this), and S3 was relaunched on OpenCode with `opencode-go/minimax-m3`. Vendor named by hand.
- 2026-11-26 (S3, coordinator edits): added one test (the `/` before a cited path had no failing test; mutant survived, now fails) and one
  sentence in `3-audit.md` item 11 saying `prepare` runs project code.
- 2026-11-26: `3-audit.md` asks reviewers for full file names, which is stricter than the tool (it also accepts a unique bare name).
- 2026-11-26: `/ship-pitch` was interrupted before it wrote anything; the owner asked to close the `guard` gap first. Added as scope S4, built by an Orca worker.
- 2026-11-26 (S4): after the review, the coordinator added the executable bit to guard values (reproduced should-fix). Not re-reviewed.
