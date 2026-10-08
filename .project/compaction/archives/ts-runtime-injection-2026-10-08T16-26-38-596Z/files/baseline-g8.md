# Baseline G8 (hooks: pre-ship-verify, stuck-uphill-detector, post-edit-check), recorded before any edit on 2026-10-07

Node v24.21.0, Bun 1.4.2, macOS (Darwin 25.6.0).

## Test counts

None of the three scripts had a test file (no `.test.js`): node 0 / bun 0. New `.test.mts` files are added.

## CLI fixtures

Script: `scratchpad/g8/fixtures.mjs` (temp projects under the scratchpad, removed after). Columns: label | sha256
prefix of stdout | of stderr | exit code. Work/scratchpad paths in output are replaced by `<W>` / `<SP>` before
hashing; ISO timestamps in the stuck-uphill audit logs are replaced by `TS`. Old scripts ignore
`AI_WORKFLOW_RUNNER`; output identical for plain node, `AI_WORKFLOW_RUNNER=bun`, and across two runs.
`e3b0c44298fc` is the hash of empty output.

```
pe-clean | e3b0c44298fc | e3b0c44298fc | 0
pe-secret | 02a6bcae2b96 | 0b7102d7c6a4 | 2
pe-warn | 606a0bc85ec7 | e3b0c44298fc | 0
pe-long | 4c3ea7e8741f | e3b0c44298fc | 0
pe-md | e3b0c44298fc | e3b0c44298fc | 0
pe-testfile | e3b0c44298fc | e3b0c44298fc | 0
pe-nodemod | e3b0c44298fc | e3b0c44298fc | 0
pe-dotclaude | e3b0c44298fc | e3b0c44298fc | 0
pe-ts-good | e3b0c44298fc | e3b0c44298fc | 0
pe-ts-bad | e1d38b57ce8f | a4f53665cf84 | 2
pe-tsx-bad | aa3c4daf96c0 | a4f53665cf84 | 2
pe-ts-nots | e3b0c44298fc | e3b0c44298fc | 0
pe-missing | e3b0c44298fc | e3b0c44298fc | 0
pe-nopath | e3b0c44298fc | e3b0c44298fc | 0
pe-null | e3b0c44298fc | e3b0c44298fc | 0
pe-empty | e3b0c44298fc | e3b0c44298fc | 0
pe-badjson | e3b0c44298fc | e3b0c44298fc | 0
pe-numpath | e3b0c44298fc | e3b0c44298fc | 0
su-main | e3b0c44298fc | b6eb893d0848 | 0
su-log-a 8afea1877dde su-log-b 7c7fa67b162f arch-log false
su-nopitches | e3b0c44298fc | e3b0c44298fc | 0
su-error | e3b0c44298fc | 5fd31c18e585 | 0
ps-ok | f4831dd440c7 | f5588325b892 | 0
ps-fail-required | c09414c9e34f | 235d3861bacf | 1
ps-nopkg | e3b0c44298fc | 0bbcf28d0d3a | 0
ps-badjson | e3b0c44298fc | 486628aa28ba | 2
ps-noscripts | 89d319ed1f50 | aaccee2eeace | 1
ps-diffsanity-dbg | 30344751391c | 710f3b134e3b | 1
ps-secret | 30344751391c | f84215a1d387 | 1
ps-pm | 7d0f7ace73a2 | ed74e6026b42 | 0
```

## Hook latency (before)

Script: `scratchpad/g8/latency.mjs`: 1 warm-up + 20 timed runs of `sh -c "node <hook>.js < <fixture> >/dev/null 2>&1"`,
median ms. post-edit-check fixture: a clean `.js` edit JSON; stuck-uphill: empty stdin with one pitch;
pre-ship-verify: empty dir without package.json (runs the git diff-sanity commands).

```
post-edit-check median ms 32.7 min 31.1 max 37.7
stuck-uphill-detector median ms 31.5 min 30.1 max 33.9
pre-ship-verify median ms 97.5 min 93.4 max 127.0
```
