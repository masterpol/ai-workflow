# G6 baseline and verification

Measured before changing G6 sources: Node and Bun both passed 92 tests across state-snapshot.test.js and state-html.test.js. After migration, both passed 95 tests across the corresponding .test.mts files, with zero failures or skips.

The fixed fixture is `.project/scratchpad/ts-runtime-g6/fixture`; its README and VERSION are fixed, its stored state.json comes from the pre-change snapshot command, and the timestamp is `2026-09-25T12:00:00.000Z`. No fixture is stored in /tmp. Both CLI commands use plain `node` without flags. Every recorded command exits 0 with empty stderr (SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`).

| CLI invocation | Before stdout SHA-256 | After Node and AI_WORKFLOW_RUNNER=bun |
|---|---|---|
| `node ai-framework/scripts/state-snapshot.js --root <fixture> --now 2026-09-25T12:00:00.000Z --json` | `2cd0243f47f92260ce9d15fdf51c7551f7486570be00fd93db3d156c1bcde77f` | Identical |
| `node ai-framework/scripts/state-render.js --root <fixture> --json` | `b288ccf718355f790b30e871b95087879df450c0a4ccb8b7a781197853762dc3` | Identical |

Commands: `node --experimental-strip-types --test ai-framework/scripts/state-snapshot.test.mts ai-framework/scripts/state-html.test.mts` and `bun test ai-framework/scripts/state-snapshot.test.mts ai-framework/scripts/state-html.test.mts`.

Added behavior coverage checks injected clock and output, independent factory bindings, injected evidence filesystem, and trusted-bundle reconcile path/timeout. The existing pre-planted temporary-file test now intercepts deps.fs.writeFileSync instead of patching ambient Node fs; it retains the same EEXIST and untouched-victim assertions under both adapters.

Mutation: disabling only the evidence-path symlink rejection caused the named existing test to fail with `docs/inside-link.md`, actual true versus expected false (1 failing assertion). Restoring the guard made that test pass. Raw records: `before.json`, `after.json`, `before-node.txt`, `before-bun.txt`, `after-node.txt`, `after-bun.txt`, `mutation.txt`, `mutation-restored.txt` under the scratch directory above.

Implementation: `.js` entry names remain two-line CJS shims; all former library exports remain, with optional trailing RuntimeDeps. Factories bind runtime operations per instance. Snapshot source reads retain symlink/root/size/normalization limits. Child reconciliation resolves skill-sync from the reporting bundle's import.meta.dirname, never from the inspected project. Registry and skill-defaults report calls receive the injected runtime, including registry callbacks. No runtime interface edits or audit/ship actions were made.

Bun required the registry sibling import to pass through its CJS shim, avoiding simultaneous direct ESM/CJS loading of the same migrated registry graph while W1 completed skill-source. No behavior or runtime contract change was needed.
