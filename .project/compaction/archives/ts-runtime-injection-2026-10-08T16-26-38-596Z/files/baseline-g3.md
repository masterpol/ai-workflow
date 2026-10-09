# Baseline G3 (orca-policy, orca-preflight, docs-links)

Recorded 2026-10-07 before editing. Node v24.21.0, Bun 1.4.2.

## Test counts (old .test.js)

| file | node --test | bun test |
|---|---|---|
| orca-policy.test.js | 46 pass (incl. subtests) | 20 pass |
| orca-preflight.test.js | 16 pass | 16 pass |
| docs-links.test.js | 10 pass | 10 pass |

## CLI fixtures

Harness: `scratchpad/g3/cases.sh` (env -i, fixed PATH, fixtures under scratchpad/g3/proj, no timestamps printed by any of these CLIs so nothing normalised). Columns: case, sha256[:12] of stdout, of stderr, exit code. e3b0c44298fc = empty.

```
policy-en-claude-json|6ffc31633c13|e3b0c44298fc|0
policy-en-codex-json|f95f64bd8b42|e3b0c44298fc|0
policy-en-plain|0045de6f0bd1|e3b0c44298fc|0
policy-dis-json|9cf0bfd452dc|e3b0c44298fc|0
policy-bad-json|c89d021b3f5c|e3b0c44298fc|0
policy-missing|1e880ea2de74|e3b0c44298fc|0
policy-badvendor|e3b0c44298fc|d21c7a99e691|1
policy-noargs|e3b0c44298fc|d21c7a99e691|1
policy-dup|e3b0c44298fc|d21c7a99e691|1
policy-cwd|f8ac5cfe2698|e3b0c44298fc|0
pre-en-json|67c90218d3aa|e3b0c44298fc|0
pre-en-probe|67c90218d3aa|e3b0c44298fc|0
pre-en-worker|8d0e0f313f3d|e3b0c44298fc|0
pre-plain|bde52eceb9ab|e3b0c44298fc|0
pre-bad|e3b0c44298fc|94da55cd37db|1
pre-noargs|e3b0c44298fc|94da55cd37db|1
pre-env-orca|6d3fccd58bdb|e3b0c44298fc|0
docs-dir|c66590467429|e3b0c44298fc|1
docs-json|331943ae7677|e3b0c44298fc|1
docs-noargs|e3b0c44298fc|c30d4934334d|2
docs-missing|e3b0c44298fc|e9889f4fbe9b|2
docs-clean|bed77da85113|e3b0c44298fc|0
```
