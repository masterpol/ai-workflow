# Run: state-project-depth (2026-11-24)

Pitch: `.project/pitches/state-project-depth/` • Version 2.53.0 • big-batch • Orca Run `run_5412bcf5df8e` (coordinator claude)

## Timeline
- **/shape:** knowledge gate (archify-renders-the-state-report, untrusted-tree and report-ownership patterns, Archify ERD and tree support).
- **/critique:** four Orca workers (knowledge-historian and skeptic on codex; appetite-auditor and cross-pitch-projector on claude). 25 findings, folded in by one re-shape: two scopes, Drizzle only, safety constraints. Then bet.
- **/plan:** receipt fields settled on LAH's real delivery (`specification.sha256` is the draft, `artifact.sha256` is the page). The toon depth key was dropped. Scopes A1, B1 (wave 1, codex), A2 (wave 2, claude) and C1 (coordinator).
- **/build:** all three workers were collected, re-verified and released. The coordinator widened the framework list and removed a `node:crypto` import from a test. Live run on a copy of LAH: validate and deliver ok.
- **/audit:** 3 cycles of Orca workers (owner choice: in-repo, no canaries, `independent: no`). Must-fix M1 (a real schema broke the ERD), M2 (the reset pinned identity after the hash), M3 (marker `EACCES`). Should-fix S1 to S7 fixed, S8 deferred. Record: `.project/analysis/2026-11-24-state-project-depth-audit.md`.
- **/ship:**
  - Final verification:
    - Full suite on an independent clone with every change: **2,212 pass, 7 skip, 0 fail** (2,219 tests). The skips include 4 real-Archify cases, absent on the clone; they pass in this checkout.
    - Under Node: 111 of 111 tests pass across the three scripts.
    - Checks: doctor READY; setup-validator, `graphify --check`, `graphify-relations --check`, `changelog --check` and docs links pass.
    - No build, typecheck, lint or i18n command exists in this repository, so those steps are skipped.
    - Diff check: no secrets and no debug output.
  - The owner asked mid-ship to reset the report folders. `.project/reports/` in LAH and in this repo now hold only `README.md` (git-ignored files, so no tracked change).

## Hill
See `2026-11-24-state-project-depth-hill.md`: all four scopes are done.

## Orca workers (all released)
critique: crit-{knowledge-historian,skeptic,appetite-auditor,cross-pitch-projector}-1 • build: a1-1, b1-1, a2-1 • audit: aud1 ×4, aud2 ×3, aud3 ×2.
The Run stays bound with no open workers.
