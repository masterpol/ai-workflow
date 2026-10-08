# W2 verification

Verified 2026-10-07 (America/Bogota). G5-G8 are complete and await the big-batch scope gate. This wave does not authorize audit or ship; F1 and the combined audit remain separate work.

## Scope evidence

| Group | Node | Bun | Evidence |
|---|---:|---:|---|
| G5 archive and compaction | 80/80 | 80/80 | baseline-g5.md; five CLI fixtures match; required-section mutation fails and is restored |
| G6 snapshot and rendering | 95/95 | 95/95 | baseline-g6.md; snapshot/HTML hashes match; symlink mutation fails and is restored |
| G7 sync and doctor | 21/21 | 21/21 | baseline-g7.md; sorted doctor JSON and sync bytes match; missing-source mutation fails and is restored |
| G8 hooks | 33/33 | 33/33 | verification-w2-g8.md; 15 CLI captures match; isolated secret guard mutation fails and is restored |

All groups retain their documented .js launch paths. Source implementations use injected RuntimeDeps. G8 median startup increases are 27.24, 30.94 and 27.71 ms, below the 60 ms limit. Existing intentional hook stderr is preserved rather than forced empty.

## Shared-tree wave gate

- `node --experimental-strip-types --test`: 708 pass, 0 fail. Raw output: `.project/scratchpad/w2-node-suite.txt`.
- Explicit Node hidden suites (post-edit and native-safety analysis): 17 pass, 0 fail; these are omitted by root discovery.
- `bun test ai-framework/scripts`: 564 pass, 1 skip, 0 fail across 25 files. The skipped case only applies outside Bun. Raw output: `.project/scratchpad/w2-bun-scripts.txt`.
- Bun hook-directory run: 131 pass, 0 fail. Explicit hidden suites: 17 pass, 0 fail. Raw hook output: `.project/scratchpad/w2-bun-hooks.txt`. Hidden files require explicit `./` paths under Bun.
- Old-install upgrade suite separately rerun under Node and Bun: 3/3 on each (apply/prune, locally edited script, project-local Bun selection).
- Setup validator: READY, 22 checks. Workflow doctor: 0 failures. Knowledge graph: CLEAN, 36 entries. Tracked W2 diff whitespace check: clean.

The socket lease tests required execution outside the filesystem/network sandbox because loopback bind returned EPERM inside it. Approved runs passed; no test was skipped to hide that restriction.

## Ownership and runtime adjustments

W2 writers ran sequentially; independent preparation was read-only. W1/W3 changes arrived concurrently from external sessions. The user explicitly requested keeping the external bundle-sync work. That implementation and the externally migrated G8 hooks were preserved and verified read-only. Their baseline files were retained; G8 independently compared against original HEAD hook bytes.

W2 added raw child byte output and optional removable stream-error subscriptions to the runtime adapters. Entry and CLI now share project-root inference for scripts, ai-framework hook scripts, and .claude hooks. Adapter tests verify byte preservation, subscription removal, and the three path layouts. Existing concurrent runtime extensions were preserved.

Version/changelog recording belongs to the combined logical migration after its remaining scopes and gates; this wave does not declare the epic shipped.
