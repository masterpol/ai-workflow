# Cross-pitch conflict check — `state-project-sources` (audit cycle 1)

**Model:** opencode-go/kimi-k2.7-code  
**Checklist walked item by item:** yes — followed `.claude/agents/cross-pitch-conflict-checker.md` and `ai-framework/workflow/phases/3-audit.md` § *Cross-pitch conflict check* (extracted scope file lists from every active pitch, computed set intersections vs. this diff, and checked branch commit file lists).  
**Cross-file interactions reviewed:** yes — reviewed the interfaces among `facts-gather.mts` (caller), `facts-project.mts` (detection / workspaces / source choice), and `facts-sql.mts` (pure reader), including the `Facts`/`Fact`/`Status` types and the `projectPanels` consumer.

## Current pitch diff

Working-tree changes against `HEAD` (`c997781`):

```text
 M .claude/skills/state/SKILL.md
 M .cursor/skills/state/SKILL.md
 M .project/knowledge/index.md
 M .project/pitches/_followups.md
 M .project/status.md
 M ai-framework/integrations/state-report.md
 M ai-framework/scripts/facts-gather.mts
 M ai-framework/scripts/facts-gather.test.mts
 M ai-framework/scripts/facts-project.mts
 M ai-framework/scripts/facts-project.test.mts
 M ai-framework/scripts/workflow-doctor.mts
 M ai-framework/scripts/workflow-doctor.test.mts
 M graphify-out/GRAPH_REPORT.md
 M graphify-out/graph.json
?? .project/knowledge/decisions/state-sql-migrations-as-a-neutral-schema-source.md
?? .project/pitches/state-project-sources/
?? ai-framework/scripts/facts-sql.mts
?? ai-framework/scripts/facts-sql.test.mts
```

## Per-pitch classification

| Other pitch / branch | Class | Notes |
|---|---|---|
| `orca-balanced-role-pools` (active, audit → ship) | **pure overlap** | 13 files already touched by branch commit `c997781` overlap with this diff. Merge order: ship `orca-balanced-role-pools` first, then `state-project-sources`. |
| `workflow-v3-rollout` (active, shape) | **disjoint** | Scope is per-project `bundle-sync`/`config-migrate`/`consolidation-migrate` in installed projects; no shared files with this diff. |
| `package-less-ship-verification` (active, draft) | **disjoint** | Scope is `pre-ship-verify.mts`, `.project/context/stack.md`, `4-ship.md`; none touched here. |
| `review-bench-hardening` (active, draft) | **disjoint** | Scope is `review-bench.mts`/`review-bench.test.mts`; none touched here. |
| Branch baseline `4a46383` (`state-project-depth`, shipped) | **pure overlap (expected)** | The same state-report pipeline files are modified because this pitch extends `state-project-depth`; this is the intended baseline, not a contention. |

## Findings

| ID | Severity | file:line | rule violated or defect | failure scenario with the command you ran and its output | verified |
|---|---|---|---|---|---|
| C1 | must-fix | (multiple files; see failure scenario) | Cross-pitch **pure overlap** with the active pitch `orca-balanced-role-pools` (branch commit `c997781`) per `ai-framework/workflow/phases/3-audit.md` § *Cross-pitch conflict check*. | Ran `git status --short` and `comm -12 <current-files> <branch-files>` after collecting the file lists from commits `4a46383` and `c997781`. The current diff shares 13 files with `c997781`: `.claude/skills/state/SKILL.md`, `.cursor/skills/state/SKILL.md`, `.project/knowledge/index.md`, `.project/pitches/_followups.md`, `.project/status.md`, `ai-framework/integrations/state-report.md`, `ai-framework/scripts/facts-gather.mts`, `ai-framework/scripts/facts-gather.test.mts`, `ai-framework/scripts/facts-project.mts`, `ai-framework/scripts/facts-project.test.mts`, `ai-framework/scripts/workflow-doctor.mts`, `ai-framework/scripts/workflow-doctor.test.mts`, `graphify-out/GRAPH_REPORT.md`, `graphify-out/graph.json`. Both pitches edit the same files. `orca-balanced-role-pools` is scheduled to ship first; `state-project-sources` already defers `CHANGELOG.md`/`VERSION` to after that ship, but the file overlap is wider than release bookkeeping. | yes |
| C2 | should-fix | `ai-framework/scripts/facts-sql.mts:267` and `:351` | Docs list a smaller closed statement set than the code implements. | The decision entry `.project/knowledge/decisions/state-sql-migrations-as-a-neutral-schema-source.md:24-25` and `ai-framework/integrations/state-report.md:91` state the reader understands only `CREATE TABLE`, `ALTER TABLE` add/drop column / add FK/PK, and `DROP TABLE`. However, `grep -nE "createIndex|dropIndex|CREATE INDEX|DROP INDEX" ai-framework/scripts/facts-sql.mts` returned function definitions at lines 267 and 351 and dispatch at lines 369-370. The code parses `CREATE UNIQUE INDEX` (adding unique constraints) and `DROP INDEX` (removing unique constraints by name) and silently accepts non-unique `CREATE INDEX`. A maintainer reading only the decision or state-report would believe these statements are counted as "not understood", which contradicts the actual closed set. | yes |
| C3 | nit | `ai-framework/integrations/state-report.md:86` | Wording "A migration folder has at least 2 sequentially named `.sql` files **or a journal**" is ambiguous versus the code. | `facts-project.mts:402-406` only creates a SQL-migration candidate when `migrationFiles.length >= 2`. A folder that contains only a Drizzle journal (`_journal.json`) but no snapshots becomes `unconfigured` (`facts-project.mts:473`). The "or a journal" clause appears to describe Drizzle snapshots, not SQL migrations, but a reader could expect a single `.sql` file plus a journal to qualify as a migration folder. | yes |

## What I tried that did not work

- `git diff c997781 -- .claude/skills/state/SKILL.md` returned no output even though `git show --stat c997781` listed `.claude/skills/state/SKILL.md` as changed. The overlap with that file is therefore file-level only, not a visible line-level delta against the branch tip.
- No adjacent overlaps were found with any other active pitch; every non-Orca active pitch is disjoint from this diff.
