---
id: machine-data-format
type: rule
created: 2026-10-18
updated: 2026-10-18
tags: [toon, data-files, token-cost, evals]
related: [toon-data-grammar, canonical-mirror-sync]
source: toon-machine-data
---

# Rule: workflow-only data that agents load starts as TOON

Data an agent reads into context costs tokens for every brace, quote and repeated key. TOON (data grammar 1.0) writes
the same values without them. The grammar, limits and refusal codes are owned by
`.project/decisions/toon-data-grammar.md`; this rule only says which files use it.

## Scope test (all three must hold)

1. **Workflow-only.** Only the workflow writes and reads the file. No host tool, package manager or CI job parses it.
2. **Agent-loaded.** An agent or skill is told to open the file (quote the `file:line`). A file that only scripts read
   costs no ingestion tokens, so converting it is all risk and no gain. Query tools such as
   `node ai-framework/scripts/graphify.mts` are how agents use large generated files; never load them whole.
3. **Not host-native.** `.claude/settings*.json`, `.codex/hooks.json`, `.opencode/*.json`, `package*.json` and the hook
   wiring template `ai-framework/hooks/hooks.json` stay in the host's format.

Today the only family that meets all three is **eval datasets that `eval-runner` loads** (`.project/evals/datasets/`).
The skill registry meets them too but is deferred to its own pitch because six readers and their tests change with it.

## What to do

- **New** agent-loaded data file: create it as `.toon`. Use `writeData`/`readData` from
  `ai-framework/scripts/runtime/data-file.mts`; do not hand-write the header or call `JSON.parse` on it.
- **Existing** JSON file that meets the scope test: convert with
  `node ai-framework/scripts/toon-convert.mts --report <file.json>` first, then `--remove-json`. A `.json` and a `.toon`
  for the same name together is an error for every reader, so finish the conversion in one change.
- **Uniform lists** (rows with the same keys in the same order, primitive values) are where the saving is. A flat
  object or prose-heavy file may shrink little: read the report and keep JSON when it does not.
- A value the grammar cannot carry (arrays of non-primitive arrays, non-plain objects) is left as JSON; the converter says so.

## Measure, never assume

`--report` prints `chars/4` and `lexemes` for the stored file and for minified JSON. They are proxies, not a model
tokenizer. Call a result "smaller" only when neither proxy is larger and at least one is smaller; if one rises while the other falls, it is reported as mixed. Do not state a token saving
in a pitch, ship record or changelog that the report did not print for that file.

## Guardrails

- A reader refusal is not "file missing". Never create or overwrite a data file after a refusal; fix or restore the file.
- Keep the golden dataset that gates a change in JSON until the TOON reader has shipped and been proven, so the gate does
  not grade its own instrument.
- Do not convert a file another active pitch pins by hash or reads with its own tests until that pitch ships.
