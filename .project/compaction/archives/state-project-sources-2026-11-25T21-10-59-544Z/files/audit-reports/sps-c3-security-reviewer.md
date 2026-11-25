# Audit cycle 3 – security-reviewer – pitch state-project-sources

**Model:** Claude Sonnet 5.5 (claude-sonnet-5-5), worker default.
**Checklist walked:** yes. `ai-framework/rules/security.md` section 9 and the three named patterns: snapshot-metadata-bypassed-output-scrubbing, a-source-scanner-fails-closed-on-what-it-cannot-read, backtracking-regex-over-untrusted-text-is-quadratic. I checked these by reading the code and running probes. I did not reread the pattern files line by line.
**Cross-file interactions reviewed:** yes (facts-project.mts → facts-gather.mts `clean` / `projectPanels` / explainer sources; facts-sql.mts → facts-project.mts → panels).
**Scope:** read-only. Probes ran under `/private/tmp/sps-audit3-security-reviewer/` on copies of the three scripts and the runtime directory. The tool-call budget was nearly used up, so the items marked "unverified" below were not run.

## Verdict on the cycle-2 fixes

| Fix | Holds? |
|---|---|
| C2-SEC-1 `credentialShaped` tests the name and every suffix after `_ - . /`; migration names allow-listed | Holds for names of 200 characters or fewer: `x/AKIA…` → true. It does not cover longer names (C3-SEC-1). |
| C2-SEC-2 `scrubLabel` redacts the raw name before markup substitution | Holds for the markup-substitution ordering. It still checks the raw name only up to the 200-character slice and before NFKC (C3-SEC-1, C3-SEC-2). |
| Stateful global regexes in `SECRET_PATTERNS` | Holds. A grep for `.test(` and `.exec(` across the three files found none applied to a `SECRET_PATTERNS` member. `credentialShaped` uses `String.search`, which ignores and restores `lastIndex`. `clean` uses `.replace`, which resets it. The remaining `.test` / `.exec` calls are on non-global literals. |
| Cost of `credentialShaped` on hostile names | Holds. The sample is capped at 200 characters, so the worst case is about 200 slices × 21 patterns. Probes took ≤0.5 ms per call (200 dashes 0.21 ms, `a-` ×100 0.47 ms, `password_` ×22 0.05 ms, repeated `Authorization:` and BEGIN markers about 0 ms). |
| `facts-sql.mts` regex cost on hostile SQL | Holds. Probes of 2 MB of spaces, 300k columns, 500k open parens, 150k `CREATE TABLE`, 500k quotes, 100k `REFERENCES` and 500k `a.` ran in 0–153 ms each. |

## Findings

| ID | Severity | file:line | Defect | Failure scenario | Verified |
|---|---|---|---|---|---|
| C3-SEC-1 | should-fix | `ai-framework/scripts/facts-project.mts:51` (`credentialShaped`: `text.slice(0, 200)`), callers `:137` (`scrubLabel`, cap 1024) and `:124-131` (`scrubPath`, cap 4096) | The credential check looks only at the first 200 characters, but the callers accept up to 1024 characters (labels) and 4096 characters (paths). A credential shape that starts after character 200 is never refused. This is fail-open on what the scanner cannot see. | Ran `credentialShaped("a"×250 + "/AKIAABCDEFGHIJKLMNOP")` → `false` and `("a"×250 + "_npm_" + "a"×30)` → `false`; the same name shorter than 200 → `true`. End to end: a pnpm workspace `packages/*` with a directory named `a×210_AKIAABCDEFGHIJKLMNOP`, and a package `name` of the same text. `createProjectFacts(...).workspaces()` returned both unredacted, so the AKIA key is in `path` and in `name`. The page cleaner (`facts-gather.mts:58-60`) redacts the rendered panels. The `--json` facts output and any `evidence` path that reaches `sources` (`facts-gather.mts:354`, `title: file, path: file`) carry the name raw. Fix: test the whole string. Cap the sample at the caller's own cap (the work is linear per separator, and the probes show it is cheap), or reject any name over 200 characters, like the migration allow-list does. | yes (workspace path and name); evidence-path reach via the database source not reproduced: unverified (my probe tree under an unconventional directory was not discovered) |
| C3-SEC-2 | should-fix | `facts-project.mts:134-138` (`scrubLabel`) | The credential check runs on the raw name before NFKC normalization and before control and format characters are removed, but the returned label is the normalized one. A fullwidth or otherwise compatibility-form credential passes the check and leaves the function as a real credential. (`scrubPath` normalizes first, so it does not have this problem.) | `package.json` name `ＡＫＩＡＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰ` (fullwidth) in a workspace package. `workspaces().value` → `"name":"AKIAABCDEFGHIJKLMNOP"`, unredacted, in the facts JSON. Fix: normalize and strip `\p{Cf}`, control characters and whitespace first, then run `credentialShaped` on the normalized text. | yes |
| C3-SEC-3 | nit | `facts-sql.mts` / `facts-project.mts` database value (entity, column, relationship names) | SQL and snapshot identifiers (table and column names) are copied into the facts value without `credentialShaped` or `scrubLabel`. The page path is covered by `clean` (via `label` / `fit`). The `--json` output is not. The pitch's own scrub rule applies to names that come from project files. | A migration `CREATE TABLE "AKIAABCDEFGHIJKLMNOP" (… "npm_aaaa…" text …)` → `readSql` returned the entity name `AKIAABCDEFGHIJKLMNOP` and the column `npm_aaaa…` unchanged. This is the same class as the acknowledged SEC-8 (raw names in the facts JSON), so it is low priority. Identifiers that look like credentials are rare. | yes (readSql output); end-to-end JSON not rerun |
| C3-SEC-4 | nit | `facts-gather.mts:354-355` (explainer `sources`) | Evidence paths go into `sources[].title` / `.path` raw (not through `clean`). The paths come from scrubbed sources, so exposure depends on C3-SEC-1. Passing the evidence through `clean` here would remove the dependency. | Reasoned from the code; not reproduced (see C3-SEC-1). | no |

## Checked and clean

- Fail-closed reads: a `pnpm-workspace.yaml` or `package.json` that cannot be read is a refusal (`incomplete`), not an absence. A declared package that does not exist is skipped and not counted as refused (`ENOENT` only). A workspace glob cut at the entry budget is marked truncated (stale with a note). I read these paths and found no fail-open branch.
- Path walking (`stat`) uses `lstat` on every segment and rejects symlinks, `..`, `.` and empty segments, so a link cannot take the scanner outside the root.
- SQL byte budgets (8 MB per source, 16 MB total) bound reading. Migration file names are allow-listed (`MIGRATION_NAME`, 200 characters) and checked with `credentialShaped` before they reach evidence.
- `stripComment` and `pnpmPackages` use no nested quantifiers and run in linear time. The flow-list scan is capped at 200 lines.
- `SECRET_PATTERNS` itself: the quantifiers are bounded (`{0,40}`, `\s{0,3}`, `{0,31}`) or have a fixed start anchor. The private-key pattern `[\s\S]*?(?:END|$)` is linear per BEGIN. I saw no catastrophic backtracking.

## Not reported (acknowledged in the brief)

SEC-8 raw directory names in `structure.nodes`; the branch overlap with c997781; the route-map cut; size over the LOC cap; the VERSION and CHANGELOG deferral; the two worktree doctor tests; RENAME / ALTER COLUMN TYPE not understood.
