# Deviations: unified-toon-config

| ID | Plan / instruction | Reality | Disposition |
|----|--------------------|---------|-------------|
| d1 | X20 says update 4 referrers when relocating `ai_workflow_env.example.json`. | One referrer is `orca-preflight.test.mts` (X16 dirty file, must stay clean during a1); the others (`README.md`, `SETUP.md`, `runtime/README.md`, `workflow-doctor.mts`) are outside the a1 diff allowlist. Relocation + root-delete still landed in a1; referrer updates deferred to c2.1/c2.2/d. | Logged; no block. |
| d2 | a1 file list originally implied 7 files but only named 6 explicitly. | Added `.gitignore` as the 7th a1 file (X15 owns the root `.gitignore` edit). | Within scope; documented. |
| d3 | Branch-gate resolution expected a clean tree. | The working tree carried unrelated upstream-project-drift remnants (modified tracked files and untracked audit artifacts). Stashed them with `--include-untracked --keep-index` to keep a1 diff clean; will restore after a1 commit. | Housekeeping; no block. |
| d4 | `.gitignore` no longer ignores `ai_workflow_env.json` / `.project/orchestration.json`. | Local untracked copies of those legacy files existed; they were stashed along with the unrelated WIP. Their tracked deletion belongs to scope `d`. | No block. |
