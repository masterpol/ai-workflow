# Decision: TOON data grammar 1.0 for workflow-only data files

**Date**: 2026-10-18  
**Scope**: `toon-machine-data` S1  
**Status**: pinned

## Why a second grammar

`toon-subset-grammar.md` pins the grammar of `ai-workflow.toon`: a closed-schema configuration with a fixed key
whitelist, a 64 KiB cap, comments, and `key[N]: a,b` meaning an inline array inferred from a comma. Data files (eval
datasets and similar) are open-schema, larger, and must round-trip with JSON exactly. The config parser
(`runtime/config.mts`) is **unchanged** and still owns `ai-workflow.toon`. Data grammar 1.0 is implemented only in
`ai-framework/scripts/runtime/toon-data.mts`. Config grammar stays at its own version; nothing here bumps `schemaVersion`.

## Data grammar 1.0

- **Header**: the first non-blank line is exactly `@toon-data 1`. Missing or different is refused (also stops a
  truncated file reading as an empty one). A leading BOM and CRLF are accepted on read; the writer emits LF.
- **Document**: one root object. Two-space indentation; tabs and odd steps are refused. No comments.
- **Keys**: bare `[A-Za-z_][A-Za-z0-9_./-]*`, otherwise a JSON-style quoted string. `__proto__`, `constructor`,
  `prototype` are refused everywhere a key can appear (also quoted, also as a table column).
- **Scalars**: `true`, `false`, `null`, numbers (JSON number syntax; `-0` kept), and strings. A string is written
  unquoted only when it is non-empty, has no surrounding space, is not `true`/`false`/`null`, does not start with a digit
  or one of `- + . @`, and has none of `, : " \ # [ ] { }` or control characters. Anything else is a JSON-style
  quoted string (`\" \\ \/ \b \f \n \r \t \uXXXX`). The reader refuses an unquoted value that breaks these rules, so
  there is one canonical spelling.
- **Objects**: `key: scalar`, or `key:` followed by children indented by two spaces (no children means `{}`).
- **Arrays** always carry their size and are checked against it:
  - `key[0]:` empty array.
  - `key[N]: a,b,c` inline primitives (commas inside values are quoted).
  - `key[N]{f1,f2}:` then N rows at +2: a **table**, used only when every item is a plain object with the same keys in
    the same order and only primitive values. Anything else (different order, missing or extra keys, nested values) is
    written as a list.
  - `key[N]:` then N list lines at +2: `- scalar`, `- [M]: a,b` (array of primitives), or `-` alone with the object's
    fields at +2 deeper (`-` with no children is `{}`).
- **Not carried**: arrays containing arrays of non-primitives, sparse arrays, non-plain objects (dates, class
  instances), non-finite numbers, `undefined`, functions, symbols, bigint, nesting beyond 32 levels. The encoder
  returns a refusal; the converter then leaves the file in JSON.

## Contracts

- **Outcomes**: the text parser returns `parsed` or `refused` (one fixed-text problem: code, line, column, never input
  text). `absent` exists only at file level (`data-file.mts`) and only for a missing file; a refusal is never `absent`.
- **Limits**: `MAX_DATA_BYTES` 1 MiB, `MAX_DATA_DEPTH` 32. Scanning is a single pass of character loops; no
  backtracking regular expression runs over input text.
- **Round trip**: `parse(encode(x))` deep-equals `x` for every value the encoder accepts; the writer and converter
  verify this before replacing anything.
- **Versioning**: a change that alters what a file means bumps the number in the header and ships a migrator in the
  same commit as the writer, refusal text and fixtures; the reader refuses headers it does not know.
