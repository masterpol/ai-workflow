# Baseline G4 (pre-change, 2026-10-07, Node v24.21.0, Bun 1.4.2)

Group G4: changelog, browser-runtime, review-bench, state-theme.

- `node --test browser-runtime.test.js`: tests 6 pass 6 fail 0; `bun test`: 6 pass 0 fail
- `node --test review-bench.test.js`: tests 22 pass 22 fail 0; `bun test`: 22 pass 0 fail
- changelog and state-theme had no test (new tests added).

Hashes come from the probe `scratchpad/g4/probe.js` (fixtures rebuilt in a temp project under the scratchpad; the
changelog CLI ran with cwd = the temp project, never the repo root). Each line is
`label stdout-sha256-prefix stderr-sha256-prefix rc`. Changelog write output embeds today's date (2026-10-07), not
normalised (same day for before and after). `agent-browser` is not installed on this host; the "present" case uses a
fake executable on PATH. state-theme has no CLI: its probe hashes a JSON dump of every export on a fixture.

```
changelog check d21f0cb211602c4f e3b0c44298fc1c14 rc=0
changelog check-json fa7d92b57fcfb5d5 e3b0c44298fc1c14 rc=0
changelog write 82462aea26afa78c e3b0c44298fc1c14 rc=0
  files 64d23f858ef51b0f 38627fa31b0f331b
changelog write-json d7a60cd74d2d5986 e3b0c44298fc1c14 rc=0
  files 10e2e117b0152389 10b841e5b75b464d
changelog bad-bump e3b0c44298fc1c14 e42d06b1437c5bad rc=1
changelog bad-bump-json 203ca17be4d43eec e3b0c44298fc1c14 rc=1
changelog bad-cat e3b0c44298fc1c14 013d1fed5a8d5f26 rc=1
changelog no-summary e3b0c44298fc1c14 d3b1786e91a3d368 rc=1
changelog bad-version e3b0c44298fc1c14 ab7da2926b5538bf rc=1
changelog empty-check e14ecd71950ae950 e3b0c44298fc1c14 rc=0
changelog empty-write b743df9539eaf449 e3b0c44298fc1c14 rc=0
  files 59854984853104df 33452b96c2101879
browser absent plain 5dd68f61fb966387 e3b0c44298fc1c14 rc=0
browser absent json 792d4fe712437edd e3b0c44298fc1c14 rc=0
browser present plain 962dcd6586d3a0ba e3b0c44298fc1c14 rc=0
browser present json fe8c268a3632996e e3b0c44298fc1c14 rc=0
browser badregistry 535cff5aa8ab6128 e3b0c44298fc1c14 rc=0
browser bogus e3b0c44298fc1c14 0aaf21b4b2e3b89e rc=1
browser badopt e3b0c44298fc1c14 19ce62b479515a0a rc=1
browser noargs e3b0c44298fc1c14 0aaf21b4b2e3b89e rc=1
bench prepare be3eb7dce547d206 e3b0c44298fc1c14 rc=0
  manifest a91c3c7fe4218b56 tree 2f8453ac38377192
bench prepare-again e3b0c44298fc1c14 05e65744e0983b9c rc=1
bench prepare-badjson e3b0c44298fc1c14 d289c22aa1d8d767 rc=1
bench prepare-inside e3b0c44298fc1c14 41e04a0f86c6b4ac rc=1
bench prepare-secret e3b0c44298fc1c14 06d19720d5fde0e6 rc=1
bench snapshot b846f7486837a83f e3b0c44298fc1c14 rc=0
  snap 7cf4eb8f9a12b3e4
bench check-clean e18ce6361b66b32d e3b0c44298fc1c14 rc=0
bench check-dirty 85a459bd9a70b742 e3b0c44298fc1c14 rc=1
bench guard-bogus e3b0c44298fc1c14 2282cea4b820ece3 rc=1
bench guard-nofile e3b0c44298fc1c14 1eefc81a81433969 rc=1
bench guard-inside e3b0c44298fc1c14 2e2926d68a382753 rc=1
bench count a60b5e3c6d242883 e3b0c44298fc1c14 rc=0
bench count-max a60b5e3c6d242883 e3b0c44298fc1c14 rc=1
bench count-bad e3b0c44298fc1c14 9d413afea05c8d6e rc=1
bench canary-hit ab93b058a8e28b2f e3b0c44298fc1c14 rc=0
bench canary-miss 0cd9a93251e5ae29 e3b0c44298fc1c14 rc=1
bench canary-nomanifest e3b0c44298fc1c14 1e640479b79bbfd2 rc=1
bench record-ok bb31fa14740e806c e3b0c44298fc1c14 rc=0
bench record-bad 2cab8e5e9ff3e7b4 e3b0c44298fc1c14 rc=1
bench record-none e3b0c44298fc1c14 dd12470a153be9f8 rc=1
bench bogus e3b0c44298fc1c14 420ae290aba92507 rc=1
bench noargs e3b0c44298fc1c14 420ae290aba92507 rc=1
theme api a7858a07475ce368 e3b0c44298fc1c14 rc=0
```

## After (G4 migrated)

- `node --experimental-strip-types --test changelog/browser-runtime/review-bench/state-theme .test.mts`: tests 73 pass 73 fail 0
- `bun test` same files: 73 pass 0 fail (browser-runtime 6 -> 13, review-bench 22 -> 32, changelog 0 -> 10, state-theme 0 -> 18)
- Probe re-run: byte-identical to the baseline above under plain `node` and under `AI_WORKFLOW_RUNNER=bun` (`diff` empty).
