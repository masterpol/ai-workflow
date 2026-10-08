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

Set `AI_WORKFLOW_RUNNER` in the environment or in the project-root `ai_workflow_env.json` (the environment wins):

| Value | Runtime |
|---|---|
| unset, empty or `node` | Node, using `node:*` APIs |
| `bun` | Bun, using `Bun.file`, `Bun.write`, `Bun.spawn` and `Bun.CryptoHasher` where Bun has its own API |
| anything else | one error line, exit 1 |

A direct entry starts the selected executable with the same TypeScript file and arguments,
including Node → Bun and Bun → Node. Node must support TypeScript loading before selection can
run when it is the initial launcher. The resolved runner is forwarded to workflow children.
Use `runWorkflow` or `runWorkflowSync` from `runtime/entry.mts` for child workflow commands;
they apply Node's compatibility flags only to Node and honor an explicit child runner override.
An explicit child environment replaces the inherited environment; include `PATH` when selecting
another executable by name. A sanitized environment without a runner keeps the parent's selection.

`ai_workflow_env.json` (a flat object; see `ai_workflow_env.example.json`) is read only from the project root that
contains `ai-framework/`, never from an unrelated working directory, and the secret-bearing `.env` is never read. A
symlink leaving that root, a non-regular file, a file over 64 KiB or malformed JSON is ignored. Only the two keys
`AI_WORKFLOW_RUNNER` and `AI_WORKFLOW_ORCA_MULTI_AGENT` (string or boolean) are taken from it; other keys never reach a
child process. The Orca switch is read by the same loader through the Orca launch gate. A selected executable missing from `PATH` fails with an error; it never falls back to
another runtime. Portable reminder hooks and review-bench test commands use the same selection.

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
- Tests build those dependencies with `runtime/test-helpers.mts` instead of importing `node:fs`,
  `node:os`, `node:path` or `node:child_process` directly: `createTestDeps()`, `tempFixture()`,
  `runScript()`, `memoryFs()` and `captureIo()`. `node:test` and `node:assert` stay as they are —
  Bun supports both under `bun test`.
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
