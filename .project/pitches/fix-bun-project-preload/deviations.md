# Deviations: fix-bun-project-preload

| Date | Scope | Planned | Done | Why |
|---|---|---|---|---|
| 2026-11-27 | S1 | The worker writes the S1 tests, including real-Bun macro-marker tests | The coordinator added the two macro tests | The worker's real-Bun tests used inert TypeScript, so a plan exit criterion was unmet. Its report said the macro reproduction was unverified, not that the tests were absent |
| 2026-11-27 | S2 | The worker writes the documents, keeping what the earlier change already said | The coordinator restored text in both READMEs | The worker's rewrite dropped the explicit warning that a direct `bun <script>` loads the preload and `.env` and can have its script replaced, and that workflow-started Bun scripts get no project `.env` variables |
| 2026-11-27 | audit | The pitch declares no AI-prompt scope | Two behavior cases added at `/audit` | The workflow-doctor skill edit changes instructions given to a model; `/shape` missed it, so no case existed before the bet |
| 2026-11-27 | plan record | "No new file, so the shipped list does not change again" | Unchanged text; clarified here | The sentence covers S1 and S2 only. The earlier part of this change adds `bun-isolated.toml` and `bun-isolated-tsconfig.json` to `shipped-files.txt`; part B2 must regenerate over a tree that holds both |
| 2026-11-27 | audit | Should-fix findings fixed or deferred with a reason | Four reviewer coverage and symlink items deferred | None is a live defect in this change; changing reviewed code now would need another review cycle. The symlink behavior exists in the released code |
