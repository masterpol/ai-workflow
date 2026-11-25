# Run: state-project-sources (2026-11-25)

Pitch: `.project/pitches/state-project-sources/` • Version 2.55.0 • big-batch • Orca Run `run_05080422e84d` (coordinator claude)

## Timeline
- **Trigger:** a validation of `/state` against five installed projects found a schema in only one (LAH, stale); RN, climbing-lab and the docs-only projects read "unconfigured".
- **/shape:** knowledge gate (the 2.53.0 decision, the ERD issue, untrusted-tree and fail-closed patterns). Appetite big-batch.
- **/critique:** four Orca workers (knowledge-historian, skeptic, appetite-auditor, cross-pitch-projector), assigned through the new least-load pools. 4 high findings and 8 medium or low; one re-shape: the route map was cut, fail-closed status rules, scrub at ingest, linear lexer.
- **/plan:** contracts fixed so S1 and S2 run in parallel (`readSql`, the database and workspaces facts). Scopes S1, S2 (wave 1), S3 (wave 2), C1.
- **/build:** S1 claude (420 lines), S2 opencode (about 2 hours, 4 defects fed back), S3 codex. A released opencode terminal resurfaced after a restart and received the S2 dispatch in its old session; redirected by message.
- **/audit:** 3 cycles of Orca workers (not independent, no canaries): 7 must-fix and about 20 should-fix fixed; cycle-3 fixes not re-reviewed. Record: `.project/analysis/2026-11-24-state-project-sources-audit.md`.
- **/ship:**
  - Full suite on an independent clone of `main`: **2,329 pass, 10 skip, 0 fail**.
  - Checks: doctor, setup validator, graph, docs links. `pre-ship-verify.mts` fails for this package-less bundle, so direct checks were run.
  - PR #12 (which also carried 2.53.0 and 2.54.0) was merged by the owner before ship; `main` was at `a6be3f9`.
  - LAH was synced to 2.54.0 (PR #18) and its `/state` run shows 13 tables.

## Hill
See `2026-11-25-state-project-sources-hill.md`: all four scopes are done.

## Orca workers (all released)
critique: sps-crit-{knowledge-historian,skeptic,appetite-auditor,cross-pitch-projector}-1 • build: sps-s1-1, sps-s2-1, sps-s3-1 • audit: sps-aud1 ×4, sps-aud2 ×2, sps-aud3 ×2.
The Run stays bound with no open workers.
