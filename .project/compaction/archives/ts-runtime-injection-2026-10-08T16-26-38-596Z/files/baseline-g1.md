# Baseline G1 (skill libraries), recorded before editing, 2026-10-07

Node v24, Bun 1.4.2. Command: `node --test <file>` / `bun test <file>`.

| Old test file | node tests/pass | bun pass |
|---|---|---|
| skill-vendors.test.js | 9 / 9 | 9 |
| entry-import.test.js | 10 / 10 | 10 |
| skill-registry, skill-source | no test of their own | - |

Caller suites (node pass): add-skill 32, skill-sync 17, pitch-archive 31, browser-runtime 6, state-snapshot 51, bundle-sync 17.

## CLI: skill-vendors.js (only CLI in G1)

Fixture: temp project built by `scratchpad/g1/cli.sh <label>` (`.claude/skills/{demo,shape}`, `.claude/agents/r.md`, `.cursor/skills/shape` customized). No timestamps printed; no normalisation needed. Label `base` is used for both baseline and after runs (the badroot stderr contains the project path).

| Invocation | exit | stdout sha256[:12] | stderr sha256[:12] |
|---|---|---|---|
| cursor-mirrors --root P | 0 | d23cd3d98b80 | e3b0c44298fc (empty) |
| cursor-mirrors --root P --apply | 0 | 1435ee74fb2e | e3b0c44298fc |
| same again (rerun) | 0 | c305f4a4bdad | e3b0c44298fc |
| cursor-mirrors --force | 1 | e3b0c44298fc (empty) | 9b11436b266c |
| (no action) | 1 | e3b0c44298fc | 3cf11a003941 |
| cursor-mirrors --root P/nope | 1 | e3b0c44298fc | dcb2a91af20b |

Resulting tree hash after the runs: b25338c78d3f. Identical under `AI_WORKFLOW_RUNNER=bun`.
