# Pitch: toon-machine-data

**Date**: 2026-10-18  •  **Appetite**: big-batch (decompose into waves in /plan)
**Stack**: workflow-tooling + ai-prompts (a rule and data files that agents load into context)

## Problem

Data files that only the workflow reads (eval datasets, skill registry, ledgers, metrics) are JSON that agents load whole,
paying for braces, quotes and repeated keys on every row. The owner wants every workflow-only data file written in TOON,
and a rule so new ones start that way, with fewer tokens ingested and no loss of fields.

## Knowledge consulted

- [decisions/toon-subset-grammar] — constrains: the pinned parser has no tabular arrays, which is where TOON saves most.
  Widening needs a grammar version bump, a parser change and a migration, never a silent extension.
- [decisions/unified-toon-config-schema-v2] — applies: precedent for one TOON file, fail-closed readers, `config-migrate`.
- [patterns/a-pitch-can-pass-its-own-tests-and-break-on-the-real-file] — applies: convert real files and run the real readers.
- [patterns/untrusted-text-reaches-the-terminal-through-error-messages] — applies: new parse errors must not echo content.
- [patterns/a-version-migrator-edits-the-token-not-the-model] — applies: converters keep values, comments and line endings.
- Adjacent pitch `instruction-compression` (active, prose scope: skills, agents, rules, phase specs). Disjoint by file set;
  this pitch only adds one rule file there and must not rewrite the prose.

## Solution sketch (breadboard, NOT wireframe)

**Places**: new rule `ai-framework/rules/machine-data-format.md`; TOON parser/writer in `ai-framework/scripts/runtime/`;
the data files; their readers in `ai-framework/scripts/` and `hooks/scripts/`; `.project/decisions/toon-subset-grammar.md`.

**Scope test (the rule's core).** A file is in scope only if all hold: (1) written and read only by the workflow, (2) an
agent loads it into context (not only a script), (3) the host does not need its own format. Measured, not guessed:
- In scope candidates: `.project/evals/datasets/*.json`, `.project/compaction/ledgers/*.json`,
  `.project/skills/registry.json`, `ai-framework/integrations/{skill-defaults,skill-vendors,orca-vendors.example}.json`.
- Out by test 3 (host-native): `.claude/settings*.json`, `.codex/hooks.json`, `.opencode/*.json`, `package*.json`.
- Out by test 2 unless a measured agent path proves otherwise: `graphify-out/graph.json` (5 MB, queried through
  `graphify.mts`), `.project/metrics/*.json` (script-written, script-read), `.project/reports/*.json`.
- `ai-framework/hooks/hooks.json` is the wiring template for a host hook file: decide in /plan with evidence.

**Affordances**:
- Grammar 1.1: tabular arrays `key[N]{f1,f2}:` plus rows, version bump, refused when malformed, count mismatch is an error.
- One shared reader/writer (`readData`/`writeData`) that picks the parser by extension, so each caller changes one call.
- Converter script: JSON to TOON, `--dry-run` first, lossless round trip check (parse both, deep-equal) before write.
- The rule: scope test, tabular-first for uniform lists, JSON stays for host-native, new files start in TOON, template
  scaffolds follow it. Mirrored per `canonical-mirror-sync.md` where required.
- Token report: before/after count per converted file with the counting method named.

**Connections**: scope inventory (measured) → grammar 1.1 + shared reader → convert one file family at a time with its
readers → rule + templates → token report.

For AI/prompt: eval-runner and the rule are context given to a model. Success criterion: same cases and verdicts from a
TOON dataset as from JSON. Golden cases at `.project/evals/datasets/toon-machine-data.json`.

## Rabbit holes

**Resolved here** (with answer):
- Which files count → resolved: the three-part scope test above; script-only files are out because converting them saves
  zero ingestion tokens and adds risk.
- Does TOON always save → resolved: no. Savings come from uniform arrays; a flat object may save little. The rule says
  tabular-first and the report measures each file; a file that does not shrink stays JSON.

**Pushed to /plan as risk** (with named owner):
- Grammar 1.1 parser safety (prototype keys, ReDoS, symlink, size cap, no content in errors) — planner, with mutant tests.
- Dual-read period so a half-converted tree still works, and rollback for a bad converter run — planner.
- Strings that need quoting or multi-line text (ledger `reason`, eval `input`) — spike on real files before converting.
- Tokenizer for the report: no model tokenizer is bundled — planner picks a named, reproducible proxy and states it.
- Bundle-sync and `config-migrate` must carry converted files to downstream projects without overwriting local data.

**Pushed to no-go** (deferred):
- Converting prose, markdown, or knowledge entries (that is `instruction-compression`).

## No-gos (this pitch)

- ✗ Converting host-native files or anything a host tool parses itself.
- ✗ Converting `graphify-out/graph.json` or other files agents never load.
- ✗ Claiming token savings that were not measured per file.
- ✗ Rewriting skills, agents or phase prose (`instruction-compression` owns that).
- ✗ A full TOON spec: only the tabular-array widening is added.
- ✗ Reading `.env` or secret files while scanning for candidates.

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

Five perspectives ran 2026-10-18. Projected 75 files / ~3,000 LOC against a 15-file cap, so the pitch is re-scoped below.

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| A1/A2 | appetite-auditor | high | scope-overrun | ~75 files is epic-sized; split P1 core, P2 converter+rule, P3 datasets, P4 ledgers, P5 registry/integrations |
| A8 | appetite-auditor | ack | rescope | Keep P1+P2+P3 (agent-loaded set, highest saving); defer the rest |
| A3/A4/A6 | appetite-auditor | high | reader-fanout | Registry has 6 readers + 5 tests; `skill-defaults.json` is a static JSON import; ledgers fail scope test 2 |
| S1 | skeptic | high | wrong-claim | Only eval datasets are shown to be agent-loaded; the other candidates are script-read. Inventory is a gate |
| S2 | skeptic | high | rabbit-hole | Config parser is closed-schema with a 64 KiB cap; data needs its own module, caps, error codes and a second decision doc; `[N]` token meaning changes |
| S3/S4 | skeptic | high/med | rabbit-hole | ~300 `JSON.parse` sites; mirrors, templates and `.gitignore` carry paths; if `.json` and `.toon` both exist, which wins |
| S5/S6 | skeptic | med | rabbit-hole | Quoting, `#`, commas in cells; LLM misreads of long tabular rows must be measured; no tokenizer, so the claim is a proxy |
| K1 | knowledge-historian | high | missed-knowledge | `issues/hardening-a-shared-reader-made-its-writer-destructive`: refusal must differ from absent |
| K2 | knowledge-historian | high | missed-knowledge | `issues/a-schema-version-bump-left-98-stale-tests...`: bump constant, writer, refusal text, fixtures in one commit |
| K3-K7 | knowledge-historian | med/high | missed-knowledge | Quadratic-regex issue; canonical-mirror issue; sync symlink pattern; one top-level failure; real parser in tests; report never overwrites a file it did not write |
| K8 | knowledge-historian | low | self-reference | Keep the golden dataset in JSON until the parser is proven (`a-gate-must-not-audit-its-own-instrument`) |
| X1/X2 | cross-pitch-projector | high | conflict | `instruction-compression.json` is hash-pinned and read by its tests: exclude it until that pitch ships |
| X3-X6 | cross-pitch-projector | med | conflict | VERSION/CHANGELOG, a new rule vs its exits, integrations tests, workflow-v3-rollout pins a source: sequence after instruction-compression |
| E1-E7 | eval-regression-projector | high/med | eval blind spot | Add deterministic cases: lossless round trip, both formats load, `[N]` mismatch rejected, string/number coercion, quoting, key order, per-field probes, honest token report |

## Proposed re-shape (not yet applied to the sections above)

If you choose Re-shape, these edits apply:
- **Appetite** big-batch limited to P1+P2+P3: grammar 1.1 data module (own caps and error codes, own decision doc), converter with round-trip check, the rule, and eval datasets only.
- **Scope** shrinks to agent-loaded files: `.project/evals/datasets/*.json` except `instruction-compression.json` (X1) and this pitch's golden dataset (K8) until proven.
- **Follow-up pitches**: ledgers, registry and the integrations JSON, each gated on a measured agent-load path (S1).
- **Sequencing**: starts after `instruction-compression` ships (X1-X4); `workflow-v3-rollout` waits or pins before this lands (X6).
- **New golden cases** for E1-E7 and a `.json`+`.toon` precedence rule (both present is an error).

## Bet decision

☑ **Bet** (→ /plan), 2026-10-18  
☐ Re-shape  
☐ Pass

Critique findings acknowledged, not addressed in the pitch body. The shaper recommended Re-shape; the owner chose Bet
without stating a reason. The "Proposed re-shape" section is therefore a required input to `/plan`: the plan must
decompose to the 15-file cap (A1/A2), gate every non-dataset family on a measured agent-load path (S1), and exclude
`instruction-compression.json` (X1) until that pitch ships.
