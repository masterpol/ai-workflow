# Baseline G9 (collector, security path), recorded before any edit on 2026-10-07

Node v24.21.0, Bun 1.4.2, macOS (Darwin 25.6.0).

## Test counts (old `.test.js`)

| File | node --test | bun test |
|---|---|---|
| metrics-lock.test.js | 11 pass / 0 fail | 11 pass / 0 fail |
| token-consumption.test.js | 57 pass / 0 fail | 57 pass / 0 fail |
| token-report.test.js | 21 pass / 0 fail | 21 pass / 0 fail |
| opencode-plugin.test.js | 5 pass / 0 fail | 5 pass / 0 fail |

## CLI fixtures

Only `token-consumption.js` has a CLI (hook entry in `.claude/settings.json`, `ai-framework/hooks/hooks.json`,
`.codex/hooks.json`). `metrics-lock.js` and `token-report.js` are libraries with no CLI and no hook entry.

Script: `scratchpad/g9/cli-fixtures.sh` (temp roots under the scratchpad). Columns: sha256 prefix of stdout,
of stderr (scratchpad path replaced by `<SP>`), exit code. Report files are hashed after replacing ISO
timestamps with `TS` (the collector stamps `recordedAt`, `updatedAt`, `since` with the wall clock).
Identical output with plain `node` and with `AI_WORKFLOW_RUNNER=bun` (the old script ignores the variable),
and identical across two runs.

```
ok-subagent | e3b0c44298fc | e3b0c44298fc | 0
ok-skill | e3b0c44298fc | e3b0c44298fc | 0
dup-skill | e3b0c44298fc | 4f1c6a3713ea | 0
dup-subagent | e3b0c44298fc | 4f1c6a3713ea | 0
badjson | e3b0c44298fc | 65b03d235436 | 0
empty | e3b0c44298fc | 69e596b278a0 | 0
big | e3b0c44298fc | 49f697c41835 | 0
file token-consumption.json | 7401ea010c67
file token-consumption.md | 62c5f83df5cf
file token-consumption.html | d2f2215dd660
mode 700 600
noproject | e3b0c44298fc | 726c8bdf7c17 | 0
legacy | e3b0c44298fc | 1a67da03e1fe | 0
symlink-out | e3b0c44298fc | 4c85a0c4fa56 | 0
outside-entries 0
eacces | e3b0c44298fc | d30c112023dc | 0
newer-schema | e3b0c44298fc | c842a84cc570 | 0
fifo | e3b0c44298fc | 698713cd8b16 | 0
secret-files 0
```

## Hook latency (criterion 6)

Script: `scratchpad/g9/latency.mjs`. 20 timed runs (after one warm-up) of
`node ai-framework/hooks/scripts/token-consumption.js --vendor claude --event agent-result --root <tmp>` with one
fixed stdin payload that writes on every run (no idempotency key, so the stored record is replaced: full
lease + read + three atomic writes).

| Run | median ms | min | max |
|---|---|---|---|
| node, 1 | 46.7 | 44.3 | 50.2 |
| node, 2 | 46.3 | 44.2 | 49.4 |
| node, 3 | 47.6 | 45.6 | 51.2 |
| AI_WORKFLOW_RUNNER=bun (ignored by old script) | 49.3 | 45.8 | 54.7 |

Baseline median: **46.7 ms** (middle of the three node runs). `token-report.js` has no hook entry.

## After migration (2026-10-07)

| File | node --test | bun test |
|---|---|---|
| metrics-lock.test.mts | 19 pass / 0 fail (11 ported + 8 new) | 19 pass / 0 fail |
| token-consumption.test.mts | 63 pass / 0 fail (57 ported + 6 new) | 63 pass / 0 fail |
| token-report.test.mts | 23 pass / 0 fail (21 ported + 2 new) | 23 pass / 0 fail |
| opencode-plugin.test.mts | 6 pass / 0 fail (5 ported + 1 new) | 6 pass / 0 fail |

Every old test name is present in the new file (checked by script). CLI fixtures: output identical to the
baseline block above, line for line, with plain `node` and with `AI_WORKFLOW_RUNNER=bun` (bun path proven taken:
with `bun` removed from PATH the same command prints `AI_WORKFLOW_RUNNER=bun but "bun" was not found on PATH`).

Latency: interleaved A/B (`scratchpad/g9/latency3.mjs`, old = scratch copy of the pre-migration files, 20 runs
each, alternating), load average about 8.5:

| Run | old wall median | new wall median | delta | old CPU (user+sys) | new CPU | delta |
|---|---|---|---|---|---|---|
| 1 | 47.7 ms | 79.3 ms | +31.6 ms | 30 ms | 130 ms | +100 ms |
| 2 | 48.4 ms | 78.9 ms | +30.5 ms | 30 ms | 130 ms | +100 ms |
| 3 | 48.3 ms | 79.0 ms | +30.7 ms | 30 ms | 130 ms | +100 ms |

Under heavy load (load average about 17, `latency2.mjs`) the wall delta was +73, +84 and +40 ms. Most of the
cost is the shared runtime bootstrap, not the collector: a migrated no-op (`token-report.js`, `main()` returns 0)
takes about 50 ms wall / 70 ms CPU against 20 ms / 10 ms for `node -e ""`.
