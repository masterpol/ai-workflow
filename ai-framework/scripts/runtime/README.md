# Script runtime

Workflow tools and hooks are TypeScript ES modules executed directly, without compilation or
JavaScript entry files:

```sh
node ai-framework/scripts/graphify.mts --check
bun ai-framework/scripts/graphify.mts --check
```

The Node command above requires Node 22.18 or later. For Node 22.12–22.17, pass the type-stripping
flags before the entry path:

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning ai-framework/scripts/graphify.mts --check
```

Shipped hook commands include these flags so they also work on Node 22.12–22.17. Older Node
versions cannot load these entries; launch them with Bun or update Node before running them.
If `NODE_OPTIONS` disables type stripping, pass `--experimental-strip-types` explicitly.

## Choosing Node or Bun

Set `AI_WORKFLOW_RUNNER` in the environment or the project's `.env` (the environment wins):

| Value | Runtime |
|---|---|
| unset, empty or `node` | Node, using `node:*` APIs |
| `bun` | Bun, using `Bun.file`, `Bun.write`, `Bun.spawn` and `Bun.CryptoHasher` where Bun has its own API |
| anything else | one error line, exit 1 |

A direct entry launched through Node with `AI_WORKFLOW_RUNNER=bun` starts Bun with the same
TypeScript file and arguments. Node must support TypeScript loading before that selection can
run. Launching `bun <entry>.mts` also works; set `AI_WORKFLOW_RUNNER=bun` to select its Bun adapter.

`.env` is read only from the project root that contains `ai-framework/`, never from an unrelated
working directory. A `.env` symlink leaving that root is ignored. Only the runner setting is
used. With Bun selected but missing from `PATH`, the command prints one error line and exits 1.

## Writing a script

- Use `.mts`, erasable TypeScript (no `enum`, `namespace` or constructor parameter properties),
  `import type`, and explicit `.mts` import extensions.
- Take `deps: RuntimeDeps` from `runtime/types.mts` and use its filesystem, process, child,
  crypto, clock and I/O adapters. Runtime adapters own the platform imports.
- Export `main(argv, deps)` returning the exit code, plus functions other scripts use.
- Call `runDirect(import.meta.url, main)` from `runtime/cli.mts` once. It runs the command only
  when the file was invoked directly; a library import has no CLI side effects.
- Keep tests beside their source as `<name>.test.mts` using `node:test`; use in-memory dependencies
  when testing behavior without a real project tree.
- The OpenCode plugin is `.opencode/plugins/token-consumption.ts`: its host discovers `.ts`
  files, while shared libraries remain `.mts`.

## Running tests

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --test
bun test
```

The suite uses `*.test.mts`. No compilation output or JavaScript test copies are required.

## Guarantees checked by tests

`runtime/invariants.test.mts` rejects JavaScript replicas, checks typed entry paths and direct
execution guards, and enforces runtime adapter boundaries. Runtime tests cover runner selection,
Node/Bun behavior and imports without CLI execution. `runtime/upgrade.test.mts` exercises an old
install's update to the direct TypeScript entries; see the
[existing-install upgrade steps](../../docs/versioning-and-sync.md).
