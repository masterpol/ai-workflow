# C1 completion evidence

Scope: `/pitch-compress` entry points, inventory, coverage ledger, done-work.md.
Runtime: Node v24.18.0. No pitch was archived or deleted (C2's job); no knowledge entry was
written for a real pitch (that happens when this tool is actually used, not during its own build).

## Behavior tests and coverage

```sh
node --test --experimental-test-coverage '--test-coverage-include=ai-framework/scripts/pitch-compress.js' --test-coverage-lines=90 ai-framework/scripts/pitch-compress.test.js
```
Exit 0: 17 tests, 17 pass. Line coverage 100%, function 97.44%, branch 87.80%.

Tests cover: inventory correctly classifies shipped-with-SHIPPED.md as eligible and reports a
specific reason for active (real hill.md header-driven parsing, not a fixed column index),
no-SHIPPED.md, and already-compacted (directory gone, recorded in done-work.md) pitches; an
all-"done" hill chart still correctly falls through to "no SHIPPED.md" (not miscounted as
active); `ledger` enumerates every required section against the fixture shape the parent pitch
names (a unique decision, a negative constraint, an unresolved followup implied by a real
deviations/log entry, and a stale cross-reference), and correctly excludes genuinely empty
no-gos/rabbit-holes sections; `commit-ledger` accepts a complete mapping and is idempotent,
rejects a missing required section, a nonexistent destination, an unknown source, a duplicate
source, a gap without a reason, and — critically — a mapping whose destination is a new
knowledge entry that fails `graphify.js --check` (real subprocess call against a copied,
dependency-free `graphify.js`, not mocked); `write-done-work` is idempotent (a same-content
rerun is a true no-op; a changed rerun for one slug never disturbs another slug's section —
found and fixed a real bug here, see `deviations.md`); full CLI coverage including a real
argument-parsing bug (see below).

## Bugs found and fixed during this scope's own testing

1. `writeDoneWork`'s "append new section" logic used a line-filter keyed on string equality
   against the file's last line to decide which blank line to trim — since every blank line in
   a Markdown file *is* the same string (`""`), this stripped every blank line in the file, not
   just the trailing one, the moment a second pitch's section was appended after a first.
   Rewritten as trimmed string joins instead of positional-equality-by-value filtering.
2. `classify()`'s hill-chart open-scope count used a fixed regex assuming the "Position" column
   was always in the same place and never excluded the table header/separator rows from the
   count — both header and separator rows were being counted as "not done" scope rows. Rewritten
   to parse the real header row to find the Position column by name and explicitly skip the
   separator row (all-dash cells).
3. The CLI parser assumed `argv[1]` was always a slug; `inventory` takes no slug, so
   `--root` was misparsed as the slug argument. Rewritten to collect all `--flag value` pairs
   first and take positional arguments from whatever remains, not by fixed index.

All three were caught by the test suite itself (a red run, not manual inspection), confirming
the tests are actually exercising real behavior rather than mirroring the implementation's own
assumptions.

## Syntax and workflow verification

`node --check ai-framework/scripts/pitch-compress.js`: exit 0.

`node ai-framework/scripts/workflow-doctor.js --json`: exit 0, 0 failures. Confirmed the
plan's claim that no doctor code change was needed — `pitch-compress` was validated entirely by
doctor's existing generic skill-discovery/profile checks, and `ai-framework/templates/project/done-work.md`
was picked up automatically by doctor's existing generic scaffold-template walker.

`node ai-framework/scripts/setup-validator.js`: exit 0, `Setup status: READY`, 19 checks
(was 18) — the new `.project/done-work.md` scaffold check and the materialized
`.cursor/skills/pitch-compress/SKILL.md` mirror.

## Opportunistic fix: stale Cursor mirrors

Materializing the new `pitch-compress` Cursor mirror surfaced 8 other canonical skill files
(the 7 phase files plus `bundle-sync`) whose Cursor mirrors had gone stale from earlier work
this session (the Caveman-mode paragraph added to each phase file) and were never re-synced.
Confirmed via direct diff that the only difference was that missing paragraph (no real
customization at risk), then synced all 8. Unrelated to this scope's own contract; fixed
opportunistically since `setup-validator` was already flagging it as a warning.

## Remaining

C2 (recovery archive, transactional deletion, restore) is next, built directly on this scope's
ledger schema and `pitch-compress` skill entry point.
