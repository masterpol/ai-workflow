# Baseline G2 (before migration, 2026-10-07)

| Script | node --test (old .test.js) | bun test (old .test.js) |
|---|---|---|
| skill-sync | 17 pass / 0 fail | 17 pass |
| skill-compress-guard | 15 pass / 0 fail | 15 pass |
| add-skill | 32 pass / 0 fail | 32 pass |

CLI fixtures (script `scratchpad/g2/cli.sh`): fixed temp project + git repo with fixed commit dates; each line is
`name exit stdout-sha256[:12] stderr-sha256[:12]`. No timestamps printed by either CLI (nothing normalised).
skill-compress-guard has no CLI.

```
ss-usage 1 e3b0c44298fc 87fc9b727b7e
ss-bad 1 e3b0c44298fc eb027f375218
ss-notinst 1 e3b0c44298fc 782d66d6bbcf
ss-clean 0 27feebe6a418 e3b0c44298fc
as-help 0 88bbd9f05bcf e3b0c44298fc
as-bad 1 e3b0c44298fc 3c7309b6f968
as-dup 1 e3b0c44298fc e6e3431d9556
as-inspect 0 5bb9f6f7171f e3b0c44298fc
as-preview 0 767b15f72c1b e3b0c44298fc
as-apply 0 b2700b392932 e3b0c44298fc
as-list 0 25ca6542107d e3b0c44298fc
ss-current 0 b1b99135ef40 e3b0c44298fc
ss-json 1 6841d35ab788 e3b0c44298fc
ss-apply 1 6841d35ab788 e3b0c44298fc
ss-after 1 fd028d2640cb e3b0c44298fc
as-disable 1 e3b0c44298fc 71df33b20b76
as-recover 0 80ca2a192010 e3b0c44298fc
as-remove 1 e3b0c44298fc 71df33b20b76
```

## After (G2 migration)

| Script | node (.test.mts) | bun (.test.mts) | CLI hashes node | CLI hashes AI_WORKFLOW_RUNNER=bun |
|---|---|---|---|---|
| skill-sync | 21 pass (was 17) | 21 pass | identical | identical |
| skill-compress-guard | 18 pass (was 15) | 18 pass | n/a (no CLI) | n/a |
| add-skill | 36 pass (was 32) | 36 pass | identical | identical |
