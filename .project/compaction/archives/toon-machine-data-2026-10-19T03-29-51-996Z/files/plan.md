# Plan: toon-machine-data

**Pitch**: pitch.md  •  **Appetite**: big-batch (15-file cap)  •  **Hill**: hill.md

Inputs honored: the pitch's "Proposed re-shape" and critique findings A1-A8, S1-S6, K1-K8, X1-X6, E1-E7. The pitch
body still lists a wider candidate set; this plan narrows to what the evidence supports and **S0 can narrow it further**.

**Impact scan (inline, grep-based):** the only repo readers of `.project/evals/datasets/*.json` are
`orca-eval-grader.mts` (+ test, `orca-vendor-orchestration.json`, script-read) and `instruction-loading.test.mts`
(`instruction-compression.json`, hash-pinned by another pitch). The `eval-runner` and `eval-regression-projector`
agents name the directory as input. Rules have no Cursor byte-copy (only agents and skills do), so the new rule needs
no mirror as long as no `SKILL.md` or agent is edited. `.claude/skills/*`, `.claude/agents/*` and their Cursor copies
are therefore **out of this plan's file set** (also keeps it disjoint from `instruction-compression`).

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S0 | Agent-load inventory (go/no-go) | `pitches/toon-machine-data/inventory.md` | 60 (doc) | — | — | no: judgment, small | — |
| S1 | Data grammar + parser/encoder | `.project/decisions/toon-data-grammar.md`, `ai-framework/scripts/runtime/toon-data.mts`, `runtime/toon-data.test.mts` | 400 | S0 | — | no: security-critical, one author | — |
| S2 | Shared reader/writer | `runtime/data-file.mts`, `runtime/data-file.test.mts` | 200 | S1 | — | no: depends on S1 internals | — |
| S3 | Converter + token report | `ai-framework/scripts/toon-convert.mts`, `toon-convert.test.mts` | 250 | S2 | S4 | yes: disjoint files, self-contained, clear exit | standard |
| S4 | Rule | `ai-framework/rules/machine-data-format.md`, `ai-framework/rules/eval-harness.md` (pointer line) | 70 (prose) | S0, S1 | S3 | yes: disjoint prose, clear exit | fast |
| S5 | Convert the one proven dataset + its reader | `.project/evals/datasets/orca-vendor-orchestration.toon` (replaces `.json`), `orca-eval-grader.mts`, `orca-eval-grader.test.mts` | 80 + data | S2, S3, S0=GO | — | no: touches a shared reader | — |
| S6 | Golden cases + close-out | `.project/evals/datasets/toon-machine-data.json` (extend), `VERSION`, `CHANGELOG.md` | 60 + entry | S5 | — | no | — |

**Count:** 15 files (S0 inventory lives in the pitch folder and is not counted). At the cap; nothing is added in `/build`
without a deviation entry. Any extra file means a second pitch.

**Sequencing gate (X1-X4, X6):** `/build` for S4 and S6 must not start while `instruction-compression` is shipping
rules or editing `workflow-contracts.test.mts` exits; S1-S3 (new files only) may run in parallel with it. Do not touch
`.project/evals/datasets/instruction-compression.json`, `instruction-loading.test.mts`, `skill-defaults.*` or any
`SKILL.md`. Do not convert this pitch's own golden dataset (K8).

## Exit criteria per scope (machine-checkable, ≥1 per scope)

Test runner: `node --experimental-strip-types --disable-warning=ExperimentalWarning --test <file>` (call it `T`).
No build/typecheck/lint/i18n command exists here, so those steps are skipped.

### S0 — Agent-load inventory
- `test -f .project/pitches/toon-machine-data/inventory.md` exit 0.
- `grep -c '^| ' inventory.md` ≥ 8: one row per candidate (3 datasets, `registry.json`, `skill-defaults.json`,
  `skill-vendors.json`, `orca-vendors.example.json`, ledgers family, metrics family), each with reader file:line,
  an agent-load evidence command and its output, and a verdict (convert / keep JSON / follow-up pitch).
- `grep -q '^Decision: GO\|^Decision: NO-GO' inventory.md` exit 0. **NO-GO** means S5 is dropped, S1-S4 still ship
  (the value is then the module, converter and rule for new files) and the owner is told before `/build` continues.
- Method rule: a file counts as agent-loaded only with a path where an agent definition or skill tells an agent to
  open it (file:line quoted). "A script reads it" does not count.

### S1 — Data grammar and parser
- `T ai-framework/scripts/runtime/toon-data.test.mts` exit 0.
- Grammar doc declares **data grammar 1.0**, separate from the config grammar 1.0 in `toon-subset-grammar.md`, and
  states how `key[N]{f1,f2}:` relates to the config `[N]` token (config parser unchanged; `config.test.mts` still green:
  `T ai-framework/scripts/runtime/config.test.mts` exit 0).
- Tests include: tabular rows with quoted commas, `#`, colons, empty strings, `"007"`, `"true"`, `"null"` stay strings (E3, E4,
  S5); `[N]` ≠ row count is rejected (E2); key-order preserved, missing/extra key falls back to non-tabular (E5); the
  forbidden keys (`__proto__`, `constructor`, `prototype`) rejected at every depth; oversize rejected; a 200k-line
  input parses in a bounded time (K3, linear scanner, no backtracking regex over input); error texts contain no input
  content (pattern in Knowledge consulted).
- Result type separates **parsed**, **absent** and **refused** (K1): `grep -n "absent\|refused" toon-data.test.mts`
  shows a test per outcome.
- `grep -c "JSON.parse" ai-framework/scripts/runtime/toon-data.mts` = 0.

### S2 — Shared reader/writer
- `T ai-framework/scripts/runtime/data-file.test.mts` exit 0.
- Reuses config's bounded read and symlink checks (no second copy): `grep -n "inspectPath\|readBoundedFile" data-file.mts`.
- Tests against hostile shapes for **both reader and writer** (K1): symlink, oversize, malformed, unreadable. A refused
  read never lets `writeData` overwrite; `.json` and `.toon` both present is an error (S4); writes are `wx`-style
  atomic, and keep line endings.
- One top-level failure per bad file, never a cascade (K6): a test reads three bad files and asserts one problem each.

### S3 — Converter and token report
- `T ai-framework/scripts/toon-convert.test.mts` exit 0.
- `--dry-run` writes nothing (`git status --porcelain` empty in a temp copy); `--apply` first parses both outputs and
  deep-equals them (E1) before writing, and never replaces a file it did not write (K5); the `.json` is removed only
  by an explicit flag.
- Real-file round trip, not a stub (K7): a test converts the real `orca-vendor-orchestration.json` and
  `toon-machine-data.json` and deep-equals. Run: `node ai-framework/scripts/toon-convert.mts --dry-run
  .project/evals/datasets/orca-vendor-orchestration.json` exit 0.
- `--report` prints per file: bytes before/after, the **named proxy** (chars/4 and whitespace-split count, both stated
  as proxies, no model tokenizer) and says "no saving" or "larger" when true (E7).

### S4 — Rule
- `test -f ai-framework/rules/machine-data-format.md` exit 0; front matter matches sibling rules (`id`, `type: rule`, `tags`).
- `grep -c "scope test\|host-native\|tabular\|both present\|measured" ai-framework/rules/machine-data-format.md` ≥ 5.
- Rule states the three-part scope test, the host-native list, tabular-first for uniform lists, that savings are
  measured per file, and that new agent-loaded data starts in TOON. It points at S1's grammar doc and S3's report;
  it restates nothing the grammar owns.
- `grep -n "machine-data-format" ai-framework/rules/eval-harness.md` exit 0 (one pointer line only).
- `node ai-framework/scripts/setup-validator.mts` exit 0 and `node ai-framework/scripts/workflow-doctor.mts` shows no new failures.
- `T ai-framework/scripts/workflow-contracts.test.mts` exit 0 (unchanged contracts).
- No `.claude/skills`, `.claude/agents` or `.cursor/*` file is in `git diff --name-only` (keeps mirror and sibling-pitch disjointness).

### S5 — Convert one proven dataset (runs only if S0 = GO)
- `T ai-framework/scripts/orca-eval-grader.test.mts` exit 0, with the dataset read through `readData`.
- `test ! -e .project/evals/datasets/orca-vendor-orchestration.json && test -f ...orca-vendor-orchestration.toon`.
- Same cases and same verdicts: the grader's own report on the `.toon` deep-equals its report on the git-HEAD `.json`
  (test fixture from `git show HEAD:...`).
- `grep -rn "orca-vendor-orchestration.json" ai-framework .claude .cursor .agents .opencode .codex SETUP.md` shows
  no stale path (update `integrations/orca-vendors.md` only if it names the path; that is a pre-approved 16th-file
  exception, logged as a deviation).
- Measurement recorded from S3's `--report`, honest if the saving is small (5 KB file).

### S6 — Golden cases and close-out
- `node -e "JSON.parse(require('fs').readFileSync('.project/evals/datasets/toon-machine-data.json','utf8'))"` exit 0.
- Dataset gains cases for E1-E7 (round trip, both-format load, `[N]` mismatch, coercion, quoting, key order, per-field
  probe, honest report) **where scriptable they point at the S1-S3 tests that enforce them**; `executionStatus` stays
  `not-run` for live-only cases (do not claim an executed eval).
- Eval gate: AI-prompt scope, so audit runs `eval-runner`; the golden dataset stays JSON until the parser is proven (K8).
- `node ai-framework/scripts/changelog.mts` records the entry; `grep -n "toon-machine-data\|machine-data" CHANGELOG.md` exit 0.
- `node ai-framework/scripts/graphify.mts --check` exit 0; full suite
  `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/*.test.mts ai-framework/scripts/runtime/*.test.mts`
  has 0 fail (any pre-existing skips named).

## Risks (inherited from pitch rabbit holes and critique)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| Almost no candidate is agent-loaded, so measured savings are near zero (S1 skeptic) | S0, S5 | **yes** | S0 gate decides; NO-GO still ships tooling + rule; report says so plainly |
| Parser safety: prototype keys, ReDoS, symlink, size, no content in errors (K3) | S1 | no | Linear scanner, mutants, 200k-line timing, own caps and codes, config parser untouched |
| Refusal read as absent makes writers destructive (K1) | S1, S2 | no | Three-way result type; writer tests on hostile shapes |
| Grammar bump left stale tests (K2) | S1 | no | Separate data grammar, new constants; config version unchanged, so no fixture churn |
| Quoting/multiline in `reason`/`input` text (S5, E4) | S1, S3 | **yes**, inside S3 on real files | Round trip over every real candidate before any `--apply` |
| `.json` and `.toon` both present shadows (S4) | S2 | no | Both present = error, tested |
| LLM misreads long tabular rows (S6) | S6 | no | Per-field probe case recorded; not run now, flagged `live-only` |
| Sibling pitch overlap (X1-X6) | S4, S5, S6 | no | File set excludes skills/agents/hash-pinned dataset; sequencing gate above |
| Downstream sync of converted files (K5, X6) | — | no | **Out of this plan.** Follow-up pitch; this plan converts one in-repo file only and tells `bundle-sync` nothing new |
| Tokenizer absent (E7) | S3 | no | Two named proxies; the claim is never gated on them |

## Parallel dispatch plan

- S0 → S1 → S2 strictly sequential (each builds on the last; S1 is security-critical).
- After S2: **S3 ∥ S4** in parallel as two subagents (disjoint files, self-contained, each with its own exit
  command; harness supports nested dispatch). S4's rule text depends only on S0 and S1's grammar doc, not on S3 code.
- S5 then S6 sequential, in the main session (shared reader, close-out).
- Orca: ready (coordinator claude, workers opencode, codex). `/build` decides the dispatch through the Orca path;
  this plan does not launch workers.

## Wireframes (UI scopes only, light)

None. No UI scope.

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)
