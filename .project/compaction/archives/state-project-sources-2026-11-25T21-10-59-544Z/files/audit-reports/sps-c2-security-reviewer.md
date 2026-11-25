# Cycle 2 security review: state-project-sources

Model: Codex, GPT-6 family; the exact worker model variant was not exposed in this session.
Checklist walked: yes, including security.md section 9 and the four named knowledge entries.
Cross-file interactions reviewed: yes, from SQL and workspace ingestion through facts, evidence, notes, and projectPanels rendering.

This was a narrow, read-only review of the full SQL and project readers, projectPanels and its supporting cleaner/evidence rendering, and their relevant tests against the pitch and plan. No repository file was changed except this report. All executable probes and copied bundle code are under `/private/tmp/sps-audit2-security-reviewer/`. All credentials below are synthetic repeated-character fixtures; no secret file was opened.

## Findings

| ID | Severity (must-fix/should-fix/nit) | file:line | defect | failure scenario with the command you ran and its output | verified (yes/no) |
|---|---|---|---|---|---|
| C2-SEC-1 | must-fix | ai-framework/scripts/facts-project.mts:34; ai-framework/scripts/facts-gather.mts:381 | The new path scrubber omits credential families already recognized by the collector, including npm tokens. Migration evidence is then copied directly into draft source titles and paths without another scrub. Reuse a shared credential detector before copying evidence, with provider shapes recognized inside filename prefixes as well as at word boundaries. | `node /private/tmp/sps-audit2-security-reviewer/probe.mts` used `db/0002_npm_` followed by 30 `A` characters and `.sql` beside a safe migration. Output was an `observed` database with that entire filename in `evidence`. `node /private/tmp/sps-audit2-security-reviewer/confirm.mts` printed `migration-provider` followed by that exact filename twice: the token survives unchanged in both draft source title and path. A real token accidentally present in a migration filename is published by the report despite the credential-refusal contract. | yes |
| C2-SEC-2 | must-fix | ai-framework/scripts/facts-project.mts:96; ai-framework/scripts/facts-project.mts:163; ai-framework/scripts/facts-gather.mts:358 | Workspace package names receive markup substitution before provider-token redaction. Replacing `_` with `-` destroys the GitHub-token signature, so the subsequent shared renderer cannot recognize it. Redact the raw package name with the shared credential cleaner before markup substitution; do not independently approximate the shared cleaner. | `node /private/tmp/sps-audit2-security-reviewer/probe.mts` used a safe workspace path with package name `ghp_` plus 30 `A` characters. Output was `name: ghp-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA` in facts and `draft-package-label true`. `node /private/tmp/sps-audit2-security-reviewer/confirm.mts` printed that same transformed value in the draft. The complete credential payload is disclosed and its known prefix is trivially recoverable. | yes |
| C2-SEC-3 | should-fix | ai-framework/scripts/facts-project.mts:199; ai-framework/scripts/facts-project.mts:675 | Workspace glob expansion now caps the sorted listing, but loses whether it was truncated. Neither `overflow` nor `incomplete` is set. Carry an entry-budget flag into workspace status and its note, so the existing Workspace list renderer can disclose the partial result. | `node /private/tmp/sps-audit2-security-reviewer/probe.mts` created three workspace directories and called the reader with `entriesPerDir: 2`. Output `glob-cap` listed only `apps/a` and `apps/b`, with `status: observed`, `unresolved: 0`, and no note. A large listing can hide valid packages after the cap while presenting the list as complete; the renderer consequently omits its new Workspace list warning. | yes |
| C2-SEC-4 | should-fix | ai-framework/scripts/facts-project.mts:54; ai-framework/scripts/facts-project.mts:234; ai-framework/scripts/facts-project.mts:671 | Refused or unreadable workspace configuration still becomes absent, and multiline flow YAML becomes an empty package list. Preserve missing/refused/unsupported outcomes separately and mark found-but-unreadable or unparsed workspace configuration stale/unavailable. | `node /private/tmp/sps-audit2-security-reviewer/probe.mts` printed `linked-config` with `status: unconfigured`, `evidence: []`, and `no workspace configuration found` for a symlinked pnpm configuration; an oversized regular configuration produced the same claim with the YAML file in evidence. `node /private/tmp/sps-audit2-security-reviewer/probe2.mts` used valid `packages: [` followed by two quoted paths on following lines and `]`; output `multiline-flow` was again `unconfigured`, although both packages existed. These branches violate fail-closed source accounting and suppress the new workspace warning row. | yes |

## Rechecking the cycle 1 fixes

The 82 copied SQL/project tests passed on both Node and Bun. The selected renderer suite passed 9 tests and skipped 4 real Archify validations. Results are saved in `tests.log`, `bun-tests.log`, and `gather-tests.log` in the scratch directory.

| Fix | Result and evidence |
|---|---|
| SEC-1 / TC1 migration filename allowlist | Holds for syntax, counted skips, and the tested provider families. The independent `migration-names` probe rejected password, ghp, sk and markup-shaped filenames, retained safe ASCII and Unicode-letter names, and returned stale with `4 migration file(s) not read`. C2-SEC-1 records the remaining provider-family gap. |
| SEC-2 separator and key-shape checks | The `_` and `-` regression tests pass, as do safe tokenizer/design-tokens controls. The specified key shapes are present in the detector. Provider coverage is still narrower than the collector's own credential cleaner, as C2-SEC-1 demonstrates. |
| SEC-3 linear render | The long token-type timing test passes on both runtimes; Node completed it in about 98 ms. The lexer doubling, hostile openers, deadline and mutant tests also pass. |
| SEC-4 per-source/per-scan SQL byte bounds | Holds. `probe2.mts` supplied three folders with eleven approximately 900 KB files each. Actual SQL reads were 8,099,802 bytes from each of two folders and zero from the third, 16,199,604 bytes total, within both 8 MiB per source and 16 MiB per scan. The resulting fact was stale and disclosed skipped files/budgets. Static inspection confirms size is checked before calling the reader. |
| SEC-5 enqueue bound and index loop | Holds by code inspection and the enormous-sibling-list regression. Visited enqueue entries are capped at twice the directory budget; iteration uses an index. |
| SEC-6 / CR4 pnpm key position, flow lists, quoted hashes | The existing single-line forms and key-position regressions pass. An independent quoted-hash flow-list probe finds both packages. Multiline flow lists still fail closedness, recorded in C2-SEC-4. |
| SEC-7 workspace entry cap | The work is capped, but its truncation is not disclosed; C2-SEC-3 is a residual defect in this fix. |
| SEC-9 SQL identifier lengths | `idv` cuts parsed identifiers at 200 characters before they become schema names. No new executable or markup interpretation was found. |
| SEC-10 refused migrations retain siblings | Both linked-migration regression tests pass; the isolated-source test confirms a stale readable schema rather than unavailable. |
| SEC-11 declared types | Explicit SQL column/entity/relationship aliases are present; type-only imports introduce no runtime dependency. |
| CR1 identifier identity | Quoted-case and unquoted-fold regressions pass, with real emitted entity names used in relationship ends. No new cross-file relationship mismatch was found in the selected renderer checks. |
| CR2 guarded ADD COLUMN | The existing column remains unchanged in the passing regression. |
| CR3 / TC2 journal plus one migration | Passing regression finds one-file sources with a journal and excludes isolated one-file folders. |
| CR5 workspace stale status and warning row | The more-than-20-packages and refused-literal-path regressions pass; the Stack warning row renders when the input fact is stale. Entry truncation and refused configuration do not set that status, as C2-SEC-3/4 show. |
| CR6 total field budget | The passing regression caps columns across tables and reports budget incompleteness. |
| CR7 partial unique indexes | The passing regression recognizes a partial index without adding an unconditional unique key. |
| TC4 isolated one-file test | The isolated test and neighboring-larger-source control pass. |
| C2/C3 documentation | The changed SQL source, naming and workspace descriptions match the intended fixed behavior. The credential-scrubbing and flow-list claims still overstate actual behavior in the findings above. |

## Commands and unsuccessful attacks

Commands were run from the scratch copy with `TMPDIR=/private/tmp/sps-audit2-security-reviewer`, through a Python subprocess timeout of 18 seconds per test invocation:

- `node --test ai-framework/scripts/facts-sql.test.mts ai-framework/scripts/facts-project.test.mts`: 82 passed, 0 failed, about 5.4 seconds.
- `bun test ai-framework/scripts/facts-sql.test.mts ai-framework/scripts/facts-project.test.mts`: 82 passed, 0 failed, about 6 seconds.
- `node --test --test-name-pattern='database wording|workspace|SQL ERD|hostile names|facts-gather itself' ai-framework/scripts/facts-gather.test.mts`: 9 passed, 0 failed, 4 skipped.
- `node /private/tmp/sps-audit2-security-reviewer/probe.mts`, `probe2.mts`, and `confirm.mts`: all exit 0; source and output logs remain in scratch for reproduction.

Attempts to bypass the fixed migration-name allowlist with markup, to expose the tested ghp/sk/password filename shapes, to exceed either SQL read budget across three folders, or to break quoted-hash YAML did not succeed. The existing symlink-refusal, directory-ancestor, no-process/network, malformed lexer and timing probes passed; the guarded reader rejects non-regular files by inspection, but a fresh FIFO probe was not run. The surviving failures are in the findings table; no broad injection or arbitrary execution claim is made.

A combined source-inspection command tried to read `runtime/index.mts`; that file does not exist. I then inspected the actual imported runtime entry, node and test-helper modules. This did not affect the probes.

The real Archify checks did not run because the copied scratch tree does not contain the installed Archify package. They are **unverified**, not successful validation. The broader gather suite, live application repositories, and external dependency vulnerability databases were not exercised in this narrow review. No dependencies changed in the reviewed modules; the SQL reader is pure and the collector uses bundle-local imports and runtime-provided filesystem operations. There is no `.project/rules/backend.md`; server auth, tenant isolation, HTTP endpoints and database execution are not applicable to these readers. The preexisting report writer and publish-race guards were outside this narrow cycle's scope.

## Security summary

| Tier | Count |
|---|---|
| must-fix | 2 |
| should-fix | 2 |
| acknowledged | 0 |

Checked: applicable section 9 guarded reads/listings, source byte limits, regex/lexer progress and timing, bundle-only execution, path/label/evidence scrubbing, fixed error notes, refusal accounting, and ingestion-to-rendering interactions. The four named knowledge entries and the role's gate-trust pattern informed the review. The specific already-acknowledged exclusions were not re-reported.

Unverified: real Archify validation (4 selected tests skipped) and a fresh FIFO probe; broader gather/integration suite, external vulnerability databases, and live-project checks were outside this narrow review. No review claim is made for those items.

Verdict: BLOCK — 2 must-fix credential-disclosure findings require resolution; 2 should-fix fail-closed accounting defects remain. The unverified checks above remain explicitly open.
