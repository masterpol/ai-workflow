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

## Boundary validator

`validateRuntimeImports(root, paths, options, deps?)` in `runtime/validate.mts` scans the listed
source paths under `root` and returns a `Violation[]`. Each violation carries `file`, `line`,
`kind`, `module` (when applicable), and `suggestion`. Kinds are `import`, `export-from`,
`dynamic-import`, `require`, `global`, `dynamic-computed`, and `unparsed`; `unparsed` is emitted when a file cannot be
read safely or the lexer fails. Lexer errors retain earlier findings. Module string line
continuations (LF, CRLF, U+2028 and U+2029) are decoded; escaped identifiers produce `unparsed` conservatively.

The scanner is a small lexer, not a TypeScript parser. It detects:

- `import … from 'node:…'`, including side-effect and multi-line declarations
- `export … from 'node:…'`
- `import(…)` arguments containing a string or template literal starting with `node:`
- `require(…)`, optional, comma-operator and tagged-template calls containing such a literal

It skips type-only declarations, inline and block comments, string literals, template text,
and member access like `object.require('node:fs')`. Nested `${…}` expressions are scanned as code.
A default binding named `type` remains a value import. Dynamic import and require arguments are inspected through nested parentheses,
conditionals, concatenations, templates, comma expressions and optional calls. A plain string
argument is classified by module; other arguments containing a `node:` literal receive the
suggestion "non-literal import specifier; pass the capability from a caller". Arguments
containing literals without a `node:` prefix produce no finding. Require declarations and
object keys are excluded. In test files—by
default files matching `/\.test\.(mts|ts)$/`—it also skips `node:test`, `node:assert`, and
`node:assert/strict`. An `adapters` option supplies an allowlist of file paths whose imports and
globals are suppressed entirely.

`process.*` globals are advisory and off by default. When `includeGlobals` is true, uses of
`process.env`, `argv`, `exit`, `cwd`, `platform`, `stdin`, `stdout`, and `stderr` are reported with
kind `global` and suggestion `deps.proc or deps.io`. Arguments with no literal at all,
such as `import(fileUrl(x))` or `import(variable)`, and uncalled `require` references produce
opt-in `dynamic-computed` advisories with the suggestion "computed import specifier; review
manually or pass the capability from a caller". These advisories never fail the boundary check
and are counted as computed imports in the doctor advisory line.

The suggestion field maps known modules to `RuntimeDeps` fields:

| Module | Suggestion |
|---|---|
| `node:fs` | `deps.fs` |
| `node:path` | `deps.path` |
| `node:os` | `deps.os` |
| `node:child_process` | `deps.child` |
| `node:crypto` | `deps.crypto` |
| `node:net` | `deps.net` |
| other `node:*` modules | pass the capability from a caller |

The validator is read-only: it never rewrites source, adds no dependency, and refuses symlinks and
files over 1 MiB. `runtime/invariants.test.mts` calls the same validator for production code and
fails on production import violations or unparsed sources; global and computed advisories are excluded. `workflow-doctor` summarizes test findings
as warnings and fails on production findings, unparsed sources, and paths skipped because of
scan limits, symlinks, or unreadable state. Doctor text and JSON output strip C0/C1 and bidi
controls from printed file names.

Many existing tests still import `node:fs`, `node:os`, `node:path` or `node:child_process`; they
will be migrated by a later pitch, not by the validator. New tests should use the helpers in
`runtime/test-helpers.mts` instead: `createTestDeps()`, `tempFixture()`, `runScript()`,
`memoryFs()` and `captureIo()`.

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

Audit regression coverage includes invalid escapes, regex newline and template EOF, root
symlink refusal, descriptor size/type changes before reading, default dependency construction,
plain doctor output, non-directory scan roots and scan caps exhausted before later roots.
Scratch mutants under the OS temporary directory prove the node literal rule, computed advisory,
import argument, require identifier, template expression, value binding named type, Unicode continuation, bidi output and planted
unparsed invariant guards. No S7 cases from the audit list remain deferred.
