# Testing

← [Back to README](../../README.md)

Run the suite with `node ai-framework/scripts/run-tests.mts` from the project root. It runs on Node
or Bun (`AI_WORKFLOW_RUNNER`, or `--runtime node|bun`), reports one summary line, and exits with the
child run's status.

```sh
node ai-framework/scripts/run-tests.mts                      # full suite: every *.test.mts under ai-framework/ and .claude/hooks/
node ai-framework/scripts/run-tests.mts path/to/a.test.mts   # partial: only the named files
node ai-framework/scripts/run-tests.mts --list               # print the selection without running it
```

## Full and partial runs

- **Full** discovers `*.test.mts` files deterministically (sorted; `node_modules` and symlinks are
  skipped), so new tests are included automatically. It is the only mode that counts as delivery
  verification.
- **Partial** runs just the files you name, for fast feedback while developing. The summary says
  `partial (not full verification)`. It never replaces a full run before `/ship`: a static import
  graph misses fixture, source-reading, subprocess and instruction-contract dependencies, so the
  command does not pick tests from changed files.
- An empty selection, a missing file, a non-`.test.mts` file, or a path outside the project exits 2
  without launching anything.

## Options

| Option | Effect |
|---|---|
| `--runtime node\|bun` | Child runtime. The summary reports the runtime actually launched, which can differ from the outer executable. |
| `--workers N` | 1 to 64. Node: `--test-concurrency=N` (file workers). Bun: `--parallel=N`, refused when `bun test --help` does not list it. |
| `--cache DIR` | Node only: sets `NODE_COMPILE_CACHE`. Refused with Bun and with `--coverage`, because cached functions give less precise coverage. |
| `--coverage` | Node `--experimental-test-coverage`, Bun `--coverage`. |
| `--root DIR` | Project root (default: this checkout). Relative file arguments resolve against the current directory. |

Unsupported settings are refused, not silently dropped. Defaults are unchanged: no flag is on unless you
pass it. Whole-suite test concurrency, removing file isolation, and automatic changed-test selection are
deliberately not offered.

## Measured speed (2026-10-21, full suite, 75 files)

Settings are **not promoted**. Three full runs per candidate on a fixed snapshot, host contended by two
foreign CPU-bound processes (load 6 to 33); details in `.project/pitches/test-execution-performance/measurements.md`.

| Candidate | Median | vs same-runtime default |
|---|---|---|
| Node default | 98.5 s | baseline |
| Node `--workers 4` | 121.9 s | 24% slower: do not use |
| Node `--cache` | 90.8 s | 8% faster: below the 20% bar, unproven |
| Bun default | 268.8 s | baseline, exits 1 |
| Bun `--workers 4` | 92.4 s | 66% faster, but exits 1 |

Under Bun, two `workflow-doctor` real-bundle-copy tests fail on Bun's 5-second default test timeout in
every run, while Node passes them. Until an idle-host rerun shows Bun's default exits 0, use Node for
delivery verification. Do not lengthen test timeouts to make Bun pass. Measure again on an idle machine
before trusting any speed claim; a sample of a few files does not predict the full suite.

## Why some tests stay slow

Several tests launch real subprocesses on purpose (for example the Codex start hook matrix: 48 launches),
exercise real deadlines, or validate modules just replaced on disk. A runtime flag cannot remove that work.
Cheaper unit seams for those matrices are a follow-up, not part of this command.

---

See also: [workflow-doctor](workflow-doctor.md) · [setup-validator](setup-validator.md)
