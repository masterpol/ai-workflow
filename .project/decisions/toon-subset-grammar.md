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
- An unrecognized root key, engine key, integration key, or malformed line → `PARSER-UNRECOGNIZED`.
- `schemaVersion` other than `1` → `CONFIG-SCHEMA-VERSION-UNKNOWN`.
- File cannot be read, is a symlink, or exceeds `MAX_CONFIG_BYTES` (64 KiB) → `LEXER-UNREADABLE`, `LEXER-SYMLINK`, `LEXER-OVERSIZE`.

## Line/column contract

Every `Problem` emitted by the parser carries `line` and `column` when the offending token can be located. `column` is the 1-based index of the first non-space character of the line. Mutant harnesses in a2 assert on `errorCodes.foo`, not on the human text.

## Migration rule

Unknown future grammar is refused at read time. The writer re-emits only this subset; any key it does not understand is preserved as a parsed model value only if the parser accepted it. A new grammar version must ship with a `schemaVersion` bump and a migration function.
