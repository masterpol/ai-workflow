# S2 brief: the doctor runs nothing from the checked folder by default

Read first: `../plan.md` (S2 behavior, exit criteria, risks), `../pitch.md` (solution table, threat boundary, plan probe), `../log.md` (S1 result), `ai-framework/scripts/workflow-doctor.mts` (`checkKnowledgeGraph`, `checkOpenCodeResolution`, argument handling) and its test, how `setup-validator.mts` picks its helper scripts (`bundleScript`), `README.md`, `ai-framework/scripts/runtime/README.md`, `ai-framework/docs/workflow-doctor.md`, `.claude/skills/workflow-doctor/SKILL.md`, `ai-framework/rules/security.md`, `ai-framework/rules/testing.md`.

This is a defensive fix. Tests use harmless marker files in temporary folders only.

## The checkout already has uncommitted work

An earlier fix and S1 are uncommitted. **Keep them.** Never run `git checkout`, `git restore`, `git reset`, `git stash`, `git clean` or `git commit`. In files you may edit, change only what S2 needs; do not rewrite or weaken what is already there, including S1's behavior and tests. Change no other file. If you need one, ask the coordinator and wait.

## Behavior

plan.md "S2 — behavior" 1 to 3.

- Graphify: run the `graphify.mts` that sits beside the running doctor module, resolved from the module's own location. The working folder stays the checked project. The doctor still requires and parse-checks the project's own copy.
- OpenCode: without `--live-opencode` the doctor starts no `opencode` process at all, and records one `info` row named `OpenCode` saying the static adapter checks ran and the live configuration was not checked, because OpenCode can run project plugins; name the flag and say to use it only in a trusted project. With the flag, keep today's outcomes (including the Bun "run with Node" row). The setup validator, the ship verifier and the Orca catalog must not pass the flag; confirm by search, without editing them.
- Documents, plain and accurate, no claim beyond what was tested:
  - Workflow-started Bun loads no project preload, `.env` or TypeScript path settings (already written); the setup validator and doctor do not parse-check under Bun and say so; run them with `AI_WORKFLOW_RUNNER=node` for parse checks. Old Node versions without type stripping also report the files as not parse-checked.
  - The doctor uses its own Graphify script.
  - `--live-opencode`: what it runs, that OpenCode can load and run the project's plugins, use only in a trusted project, and that the command can leave an OpenCode service running (`node ai-framework/scripts/opencode-service.mts free` stops it; check that script's usage before describing it).
  - Not protected: a checkout whose own workflow scripts, hooks or harness settings are hostile (they are the code being run); a direct `bun <script>` call; `NODE_OPTIONS` and `BUN_OPTIONS`; tools found by bare name through `PATH`.
  - Probes were Bun 1.4.5 and OpenCode 2.4.2 on macOS only.
  - Remove or correct every sentence in these files that now says something false, for example that the doctor checks OpenCode's resolved configuration by default.
- The `.cursor` skill file must equal the `.claude` one after the first six lines.

## Tests (write first, record the failing run)

- A checked scratch tree with a marker `ai-framework/scripts/graphify.mts` and a `.project/knowledge/` folder: with the real doctor under the Node runner, and under the Bun runner (may skip only without `bun`; must run here), the marker never appears. Show the same test failing before your change. Also assert the exact helper path the doctor launches.
- Without the flag, the doctor never starts `opencode` (a spy in process, and a real run with a fake `opencode` on `PATH` that would write a marker). With the flag it does; cover missing, non-zero exit, bad JSON, success and the Bun case.
- No test may reach a real `opencode`: control `PATH`, and pin the runner in the child environment.
- Knowledge-graph results still describe the checked project, not the doctor's own repository: for example a broken knowledge entry in the checked tree still fails.

## Exit commands (all must exit 0)

- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/setup-validator.test.mts ai-framework/scripts/workflow-doctor.test.mts`
- `bun test` on the same two files (report skips and why)
- the Node command on `ai-framework/scripts/runtime/invariants.test.mts`
- `! grep -n 'absolute("ai-framework/scripts/graphify.mts")' ai-framework/scripts/workflow-doctor.mts`
- `diff <(sed 1,6d .claude/skills/workflow-doctor/SKILL.md) <(sed 1,6d .cursor/skills/workflow-doctor/SKILL.md)` prints nothing
- `grep -l -- '--live-opencode' .claude/skills/workflow-doctor/SKILL.md ai-framework/docs/workflow-doctor.md` lists both
- `git diff --check`

Do not run the full verifier; the coordinator runs it. Estimate: about 120 changed lines. Report if you will exceed 250.
