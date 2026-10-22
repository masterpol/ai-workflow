# Audit review record: security-retry

independent: not-completed
canary: caught
read-only: verified by review-bench guard-retry-check.json with exact coordinator-patch and secret-exclusion accounting
prompt-sha256: e9d088bee271e9f822fdbfb5d028ccf621046efd1fb14d8de93312dabf35b80c
model: claude-sonnet-5-5
cross-file interactions: reviewed

Coordinator assessment: the scratch canary was cited and its failure reproduced. It is absent from the live source or pitch artifacts. "not-completed" preserves missing required evidence; a worker_done proves report delivery, not a clean review. Guard snapshots/checks verified original files, within the documented size/mtime limitation for files larger than 2MiB.

The original first-wave guard is clean. The retry guard differs only in the coordinator's review-bench source/test repair and eight newly excluded secret-shaped paths; HEAD/status are unchanged and no reviewer edits were detected. No secret contents are included in this record.

Exact prompt: `.project/metrics/token-time-report-audit/prompt-security-retry.txt`. Scratch manifest: `/var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/ttr-audit-security-retry-4d0n3hql.manifest.json`. Dispatch/completion/release receipts remain under the same local evidence directory. Coverage-retry resource release was retained with reason `user_takeover`; the human-owned terminal was not closed or retried. All nine attempt ledgers are settled after accepting their own completion messages.

## Verbatim worker report

Worker self-assigned metadata and verdicts below describe the scratch copy; the coordinator assessment above governs completeness and independence.

# Security review: token-time-report, whole-file slice (scratch copy)

independent: no
read-only: verified by scratch-only cwd and absolute paths; nothing outside the scratch directory was read or written
prompt-sha256: not-provided-to-worker
model: claude-sonnet-5-5
cross-file interactions: reviewed

Verdict: **BLOCK**. One confirmed must-fix (F1): `ownsFormat` never checks the Markdown or HTML marker, so `--apply` overwrites a foreign `flow-report.md` or `flow-report.html`. Two scratch tests fail because of it. Not PASS.

## Rules read

Read in full before any code: `ai-framework/rules/security.md` (318 lines, sections 1-9 plus checklist A-G) and `.project/rules/README.md`. The README is the only concrete companion; it holds no concrete rules.

## Selected scratch tests (node --experimental-strip-types --test)

| File | tests | pass | fail |
|---|---|---|---|
| flow-render.test.mts | 4 | 3 | **1** ("generator ownership needs the exact format marker", flow-render.test.mts:63-67) |
| flow-report.test.mts | 22 | 21 | **1** ("existing unowned, linked, directory and FIFO targets are refused", flow-report.test.mts:266, case `flow-report.md` containing "# my own notes") |
| flow-join.test.mts | 15 | 15 | 0 |
| review-bench.test.mts | 34 | 34 | 0 |
| state-html.test.mts | 79 | 79 | 0 |

Bun, the full suite, setup-validator and the graph check were not run (out of scope).

## Findings

| # | Severity | Location | Rule | Input -> wrong outcome | Evidence | Fix | verified |
|---|---|---|---|---|---|---|---|
| F1 | **High (must-fix, BLOCK)** | flow-render.mts:21-23 (`ownsFormat`); `MARKER_START` at :16-19 is declared and never used; consumer flow-report.mts:124 | sec. 9 "Writers refuse ... replace atomically", checklist G; plan.md:56 "unmarked files ... are refused and preserved" | A user's own regular file `.project/metrics/flow-report.md` or `.html` (e.g. "# my own notes\n"). `ownsFormat("markdown"\|"html", anyText)` returns true, so `--apply` renames the staged report over it. Data loss, exit 0. | Both scratch tests above fail. flow-report test output: expected `[1, '']`, actual `[0, 'flow-report: published flow-report.json, flow-report.md, flow-report.html ...']`. flow-render test line 67 asserts `!ownsFormat("markdown", ...)` and fails. | In `ownsFormat`, return `MARKER_START[format].test(text)` for markdown and html (anchored at the start, generation ID regex already defined). | yes (two failing tests) |
| F2 | Medium | review-bench.mts:115-120 (`git()`), used by `state()` :188 and `count()` :211 | sec. 9 "Execute only bundle code" and "Resolve config only from a trusted root" | Analysed repo's `.git/config` sets `core.fsmonitor=<script>`. `review-bench count` (and `guard`) runs `git diff` / `ls-files` / `status` with `-C <root>`, which runs the project-supplied script. | POC in scratch `poc/repo`: after `review-bench.mts count --root poc/repo --since <HEAD>` the marker file `poc/FSMON_RAN` exists. | Run git with `-c core.fsmonitor=false -c core.hooksPath=/dev/null` (and similar), and drop `GIT_*` env; or document that the tool is for trusted repos only. | yes (POC) |
| F3 | Low | review-bench.mts:56-59 (`inside`), used at :142 and :193 | sec. 9 path containment | `inside()` uses `rel.startsWith("..")`, so an in-project path whose first segment starts with `..` (e.g. `<root>/..snap.json`) counts as outside. `guard snapshot --file <root>/..snap.json` passes the "must be outside the project" check. The reverse case fails closed. | POC: file `..snap.json` was created inside `poc/repo`. Impact is small (operator-chosen path, and the guard walk does not cover it). | Compare `rel === ".." \|\| rel.startsWith(".." + path.sep)` as metricsDirectory does at workflow-metrics-state.mts:556. | yes (POC) |
| F4 | Low | review-bench.mts:270-272 (`main` catch) with raw fs errors from :79/:111/:255 | sec. 9 "Never copy error text into output", checklist G "no raw error text or absolute path" | A missing `--root` prints Node's raw error with an absolute path. `printable()` strips control characters but keeps the text. Only operator-supplied paths are echoed, so the leak is limited. | POC: `review-bench: ENOENT: no such file or directory, lstat '/private/var/.../poc/nonexistent'`, exit 1. | Map fs errors to `errorCode()` (as flow-report does) before printing. | yes (POC) |

Findings I looked for and did not find, with the evidence for each, are in the walk below.

## Rule-section walk (security.md)

| Section | Result | Evidence |
|---|---|---|
| 1 Authentication / authorization | N/A | No handlers, users or roles; local CLI scripts only. |
| 2 Data validation | checked | flow-report.mts `parseArgs` :24-39 allow-lists `--format`, rejects unknown args and `--apply` with `--format`. flow-join.mts `projectTokens`/`projectUsage`/`projectHistory` use exact shape checks (`isObj`, `num`, `isDate`, SLUG/SAFE/PHASES). Bounds: 51/52 pitches, 16/18 phases, 26 scopes, 600 leaves, 200 history items, trace at most 32. Prototype keys rejected (RESERVED, :49, :80). No accept-anything type. |
| 3 Secrets | checked | No hardcoded secrets or env reads in the named files. `SECRET` patterns (flow-join.mts:54-56) are linear and bounded; `safeText` redacts at emit (:81, :303, :306), including vendor, history phase and trace phase/scope. Trace `class` is enum-checked by `validTrace` (workflow-metrics-state.mts:70-73). review-bench `SECRET_NAME` (:25) blocks secret-shaped names in `readGuarded`. Note: `walkTree` hashes files under the guard roots including secret-named ones; it records only a sha256, never content. Not a finding. |
| 4 XSS / injection | checked | flow-render.mts: HTML `esc` covers & < > " ' (:90), no raw interpolation except validated generation ID and fixed constants; CSP meta `default-src 'none'; base-uri 'none'; form-action 'none'` (:103), no scripts, links or external resources. Markdown `mdCell` escapes punctuation including `\|`, `[`, `<`, `/`, `.`, `@` (:75); control characters stripped by `text()` (:34). flow-render tests (hostile labels) pass. No `href` built from report data. No eval/Function. |
| 5 API routes | N/A | No servers. Error-detail rule applied under sec. 9 instead. |
| 6 Multi-tenancy | N/A | No tenants. |
| 7 File uploads | N/A | None. |
| 8 Anti-patterns | checked | No `process.env` in client files, no secret logging, no raw-HTML rendering of untrusted text. |
| 9 Project-tree scripts | see below | |

### Section 9 items

- Guarded reader: flow-report reads only through `readText` (workflow-metrics-state.mts:560-576): lstat, symlink / non-regular / size refusal, `O_NOFOLLOW|O_NONBLOCK` open, fstat identity match against the lstat, bounded read, fatal UTF-8. FIFO refused before open. Directory listings: no listings in flow-report. `pinChain` / `guardedMetricsDeps` recheck type, identity and realpath on every fs call. `metricsDirectory` (:543-559) refuses symlinks and out-of-project realpaths. **checked**. The `readHistory` ancestry is pinned separately. Residual path-check-to-syscall race is an accepted design limit.
- Input bounds before regex and after growth: no regex is applied to unbounded input. Labels are at most 80 characters (SAFE `{1,80}`) before `SECRET` matching. NFKC is not used anywhere in the named files. review-bench `canaryCheck` regex runs on a report capped at 256 KiB with an escaped file name; quantifiers are linear. **checked**.
- Execute only bundle code: flow-report, flow-render, flow-join execute nothing. review-bench `prepare` runs `node` on files copied into scratch (by design, the canary mechanism). **F2** covers git config execution in `count`/`guard`. **checked with F2**.
- Parse and re-emit untrusted values: flow-join projections copy only needed fields; labels allow-listed at ingest (`label`) and again at render (`safeText`, `text`, `esc`, `mdCell`). **checked**.
- No error text in output: flow-report maps every failure to a fixed string or `errorCode` (:112-115, :178); `Refused` messages contain only fixed file names. **checked for flow-report**. review-bench prints raw fs error text: **F4**.
- Atomic writes, symlink-refusing destinations: flow-report writes into an exclusive `0o700` staging directory (`wx` files), link or rename per target, with pinned ancestry and reinspection. Symlinks, directories and FIFOs are refused (the three non-regular cases in the failing test pass; only the foreign-regular-file Markdown case fails: **F1**). review-bench `writeGuarded` refuses a symlinked or non-regular target and uses `wx` temp plus rename. **checked with F1**.
- "Absent" vs "refused": flow-report keeps `missing` and `refused` separate (readJson :44-48, `lstatIfPresent`, `inspectOwned`). `readHistory` returns `missing` only for ENOENT-class absence and `refused` for unsafe ancestry. Apply writers act on `prior === null` only when `lstat` reports ENOENT; a refused reader throws `Refused`. **checked**.
- Config from a trusted root: flow-report takes no config. review-bench git config comes from the analysed repo (**F2**). `runWorkflowSync` command resolution was not read: **unverified**.

## Canonical checklist A-G

- A Authentication: N/A. B Authorization: N/A. F Multi-tenancy: N/A.
- C Data validation: checked (see sec. 2 above). Client-side Zod is N/A.
- D Secrets: checked (no hardcoded secrets, no env use, no logging).
- E XSS / injection: checked (no unsafe raw HTML, no user URLs rendered, no eval).
- G Scripts: reader refusals checked; regex bounds checked; project-supplied script execution **fails for git config (F2)**; raw error text **fails for review-bench (F4)**; writers' non-regular/symlink refusal checked but the ownership check **fails (F1)**.

## State-pages link and state-html tests

state-pages.mts:132 adds the fixed relative target `.project/metrics/flow-report.html` through the existing `links()` helper (:125). The helper builds `href="../../<esc(rel)>"` only if `safeEvidencePath` (state-render.mts:49-60) passes: charset allow-list, no `.`/`..`/empty parts, no secret names, no symlink at any component, regular file via `statSync`, realpath inside root. Otherwise it prints an "unavailable" line. State rendering never calls flow-report. **checked**: tests at state-html.test.mts:102-135, 584 and the full file (79 of 79) pass. A directory, FIFO or symlink named `flow-report.html` yields no link.

## Cross-file interaction pass (reviewed)

- flow-report `inspectOwned` -> flow-render `ownsFormat`: the ownership contract depends on it, and it is broken for Markdown and HTML (F1).
- flow-report -> workflow-metrics-state: `readText`, `readWorkflowState`, `metricsDirectory` and `withMetricsLease` are used as the plan says, one lease acquisition, guarded deps passed into the read. Lease-skipped and legacy-lock results become fixed strings (`KNOWN_LEASE_REASONS`). `pinChain` and `guardedMetricsDeps` use the same verify logic and do not conflict.
- flow-join <- workflow-metrics-state: `projectUsage` re-validates labels and bounds on top of `validState`; USAGE_BOUNDS (52/18) match the state reader's limit-plus-two-overflow rule (`validRows`, :62-64). Trace class cannot carry free text.
- flow-join -> flow-render: only allow-listed or redacted labels reach `tables()`; numeric cells go through `text()`.
- state-pages -> flow-report.html: link-only coupling, safe (above).
- review-bench stands alone; it shares no state with the flow files. `printable` and `readGuarded` do not interact with them.

## What I tried that did not produce a finding

- Looked for markdown/HTML injection through labels, trace, details and notes: none (escapes verified by reading and the hostile-label test).
- Looked for prototype-key pollution in `projectTokens`/`projectUsage`: RESERVED rejection precedes use.
- Looked for a symlink/FIFO bypass in `readText` and `inspectOwned`: none (lstat plus O_NOFOLLOW plus fstat identity).
- Looked for leftover staging on failure: `finally` removes only files this attempt created and only while the staging directory identity matches; a foreign directory is left alone.
- Looked for secret leakage via `guard` snapshots: only sha256 hashes and relative paths are recorded.

## Not verified

- Preview "creates no files or directories" while taking the metrics lease: the plan test passes, but I did not read `withLease` in `../hooks/scripts/metrics-lock.mts`, so lease file lifecycle is unverified.
- `runWorkflowSync` / runtime `node.mts` internals (environment passed to child processes): unverified.
- Accepted design limits (non-atomic three-file set, path-check-to-syscall race, static report UA styling) were not counted as findings.
- Bun, full suite, setup-validator, graph check: not run (out of scope).

Disposition: BLOCK until F1 is fixed (one-line change; both failing tests are the exit check). F2 should be fixed or recorded as a deviation. F3 and F4 are low.
