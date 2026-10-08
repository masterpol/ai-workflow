# Baseline G1b (skill-source), recorded before editing, 2026-10-07

Node v24, Bun 1.4.2. skill-source has no CLI and no test file of its own (exercised through caller suites).

| Caller suite | node pass | bun pass |
|---|---|---|
| add-skill.test.mts | 36 | 36 |
| skill-sync.test.mts | 21 | 21 |
| skill-vendors.test.mts | n/a | 13 pass, 1 fail (pre-existing, other group mid-edit; not skill-source related) |

Old skill-source.js: 133 lines, CJS, no tests. New skill-source.test.mts is a new file.
