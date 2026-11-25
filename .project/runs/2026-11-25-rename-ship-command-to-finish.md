# Run: rename-ship-command-to-finish (2026-11-25)

Pitch: `.project/pitches/rename-ship-command-to-finish/` • Version 2.56.0 • big-batch • Orca Run `run_89271af6dc37` (coordinator claude)

## Timeline
- **Trigger:** `/ship` ran the host's built-in (pushed, opened a pull request, reviewed) instead of the workflow close-out.
- **/shape, /plan:** rename the command, not the phase. The owner ran `/plan` without `/critique`.
- **/build:** the owner chose `ship-pitch` over `finish` and asked to build on the PR #13 branch. S1 codex, S2 claude, S3 opencode; S4 and C1 coordinator. The old-project upgrade test found that leftover `ship` files fail the upgraded doctor and graph; the owner chose automatic removal of unchanged files.
- **/audit:** cycle 1 found three must-fix deletion defects (races, recursive cleanup, ownership taken from the sync receipt). Rewritten around shipped content hashes. Cycle 2: no must-fix, three should-fix and two nits, fixed without a third cycle.
- **/ship-pitch:** the first run of the renamed skill. Clean-clone suite 2,353 pass, 10 skip, 0 fail. `pre-ship-verify.mts` fails for this package-less bundle; direct checks instead.

## Hill
See `2026-11-25-rename-ship-command-to-finish-hill.md`.

## Orca workers (all released)
build: rsc-s1-1, rsc-s2-1, rsc-s3-1 • audit: rsc-aud1 ×4 (test coverage ended failed), rsc-aud2-security-1.
