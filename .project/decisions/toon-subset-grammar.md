# Decision: TOON subset grammar for `ai-workflow.toon`

**Date**: 2026-10-16  
**Scope**: `unified-toon-config` a1  
**Status**: pinned

## Spec version

TOON subset version **1.0**. This pitch only parses the subset below. A later pitch that widens the grammar must bump this version and update the parser before it accepts new syntax.

## Subset grammar

- **Document**: a single root object. No top-level scalars or arrays.
- **Indentation**: spaces only. The parser compares raw leading-space counts; a child line must be indented more than its parent object opener.
- **Key**: `[a-zA-Z0-9_-]+`, optionally followed by `[N]` to mark an inline primitive array of size `N`.
- **Separator**: colon (`:`). A line with a colon and a value is a key/value pair. A line with a colon and no value opens a nested object.
- **Scalar values**: quoted strings (`"..."` or `'...'`), numbers (`-?\d+(\.\d+)?`), booleans (`true`/`false`), `null`.
- **Inline primitive arrays**: comma-separated scalars. May be declared with `key[N]: a,b,c` or inferred from a comma in the value.
- **Comments**: `#` to end of line, ignored outside quoted strings.
- **No tabular arrays**, no multi-line strings, no anchors/aliases, no tags.

## Rejection modes

The parser refuses the following with a fixed-text error code:

- `__proto__`, `constructor`, or `prototype` anywhere a key can appear → `PARSER-PROTOTYPE-POLLUTION`.
- A `roles.<role>` array containing duplicate strings → `PARSER-WITHIN-ROLE-DUPLICATE`.
- An unrecognized root key, `integrations.orca` key, coordinator key, integration key, or malformed line → `PARSER-UNRECOGNIZED`.
- `schemaVersion` other than `2` → `CONFIG-SCHEMA-VERSION-UNKNOWN`.
- File cannot be read, is a symlink, or exceeds `MAX_CONFIG_BYTES` (64 KiB) → `LEXER-UNREADABLE`, `LEXER-SYMLINK`, `LEXER-OVERSIZE`.

## Line/column contract

Every `Problem` emitted by the parser carries `line` and `column` when the offending token can be located. `column` is the 1-based index of the first non-space character of the line. Mutant harnesses in a2 assert on `errorCodes.foo`, not on the human text.

## Migration rule

Unknown future grammar is refused at read time. The writer re-emits only this subset; any key it does not understand is preserved as a parsed model value only if the parser accepted it. A new grammar version must ship with a `schemaVersion` bump and a migration function.

## Config schema (schemaVersion 2)

schemaVersion 2 is the `integrations.orca` nesting. schemaVersion 1 (flat top-level `engines`/`orchestration`) is no longer loaded: it is refused with `CONFIG-SCHEMA-VERSION-UNKNOWN`; run `ai-framework/scripts/config-migrate.mts` to upgrade.

Root keys: `schemaVersion`, `runtime`, `integrations`, `doctor`, `skills`. The former top-level `engines` and `orchestration` sections were removed outright (unreleased; no alias): they are now `PARSER-UNRECOGNIZED` unknown root keys. Orca configuration lives under `integrations.orca`:

```
integrations:
  orca:
    engine: "1.4.224"          # was engines.orca; required string
    enabled: true              # was orchestration.enabled
    multiAgent: true           # was orchestration.multiAgent
    maxConcurrentWorkers: 3    # integer 1..3 (matches orca-policy; pitch 4 widens per coordinator)
    maxRetriesPerTask: 1       # integer >= 0
    coordinators:
      claude:
        workers[2]: codex,opencode   # per-coordinator; replaces the single global orchestration.workers
        roles:
          implementation[1]: opencode
          review[1]: codex
```

- `integrations.orca` is required and validated by the built-in orca validator in `runtime/config.mts`; unknown keys in the block or in a coordinator entry are `PARSER-UNRECOGNIZED`. Other `integrations.<name>` blocks need `registerIntegrationValidator(name, fn)`; `integrations: {}` is no longer valid.
- A coordinator that lists `workers` must list every worker its `roles` use (`ORCHESTRATION-WORKERS-INCOMPLETE`, checked per coordinator).
- Extension seams kept: `registerIntegrationValidator` (also runs for `orca`, after the built-in), `registerCoordinatorValidator`, and `registerEngineValidator(key, fn)`, whose function now receives the value of `integrations.<key>.engine` (key `orca` gets the Orca version string; pitch 3's range parser registers there).
