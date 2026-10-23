# Plan: state-fragment-sanitizer

**Pitch**: pitch.md  •  **Appetite**: big-batch  •  **Hill**: hill.md  •  **Planned**: 2026-10-19

The sanitizer is a library. It takes untrusted fragment text and either returns re-emitted markup with its
citations or a rejection. It does not read fragment files, inject anything or write a report; that is
`state-ai-authoring`. No runtime dependency is added (pitch no-go). The hand-written allow-list counts as
the "DOMPurify or equivalent" that `ai-framework/rules/security.md` §4 asks for, by owner decision
2026-10-19.

## Grounding in the real code (reuse, do not copy)

| Need | Existing code | How this pitch uses it |
|------|---------------|------------------------|
| Evidence-path check | `safeEvidencePath(root, relative, deps)` in `ai-framework/scripts/state-render.mts:47` (exported wrapper :283). Charset `^[A-Za-z0-9._/@+-]+$`, ≤200 chars, no leading `/`, no empty, `.` or `..` segment, `isSecretName` on every segment, lstat refuses a symlink on every segment, must be a regular file, realpath must stay inside the root | Final authority for every cited path. It is called once through `createStateRender(deps).safeEvidencePath`, never re-implemented. It returns only a boolean, so S4 classifies the shape first to get a named reason, and the shared check still decides |
| Secret names | `isSecretName` in `state-structure.mts:34` | Already applied inside the shared check. Imported only to name the `secret-path` reason |
| Snapshot facts | `facts(node)` generator in `state-snapshot.mts` (bounded at depth 32) | The set of evidence paths in the snapshot is the union of `fact.evidence` over `facts(snapshot)` |
| Terminal-safe text | `printable` in `state-snapshot.mts:34` | Second layer on every rejection message (S6) |
| Untrusted file reader | `readSource` in `state-snapshot.mts:95` (refuses symlinks, non-regular files and so FIFOs, realpath outside the root, files over 1 MiB, and keeps only error codes). The data-file equivalent is `readData` in `runtime/data-file.mts` | The sanitizer reads no files. `readSource` is named here as the reader `state-ai-authoring` must use for fragment files. S7 reads the dataset with `readData(root, ".project/evals/datasets/state-ai-fragments")` (no extension), so a later TOON conversion does not break it |
| Design tokens | `FALLBACK` in `state-theme.mts:57`. The color keys are `background, foreground, primary, primaryForeground, muted, mutedForeground, border`; `COLOR_TOKENS` is not exported | The built-in default token list is these seven names. A drift test checks it against `Object.keys(FALLBACK.light)` without editing `state-theme.mts` |
| Page classes | Used by `state-render.mts`/`state-pages.mts` today: `skip, scroll, legend, status, status-<status>, sub, none, summary, role, tree, type, cards` | Not in the default fragment class list. `status` and `status-*` are explicitly refused, so a fragment cannot imitate the observed-fact style (half of dataset case `ai-label-always-present-and-unspoofable`) |
| Mutant convention | `X_UNDER_TEST` env import, for example `orca-diff-admit.test.mts:15` | New tests import `process.env.STATE_FRAGMENT_PARSE_UNDER_TEST ?? "./state-fragment-parse.mts"`. The same pattern is used for `STATE_FRAGMENT_UNDER_TEST` and `STATE_FRAGMENT_EVIDENCE_UNDER_TEST` |
| Fixtures | `tempFixture(deps, files, { resolve })` in `runtime/test-helpers.mts:20` (realpaths by default) | Evidence tests use it. One test passes `resolve: false` to prove the checker canonicalizes an aliased macOS `/var` root |
| Repo invariants | `runtime/invariants.test.mts`: no `node:*` import outside runtime adapters, no `any`, every production module imports silently, one `runDirect` per `main` | Every new production module must pass it. The new modules are pure or take `deps` |

**Script enumerations checked.** `setup-validator.mts:35` parses every file in the `ai-framework/scripts`
directory, so it picks up the new files automatically. `bundle-sync.mts:66` syncs `ai-framework/scripts`
as a whole directory. `runtime/migrate.mts:11 SCRIPT_NAMES` is the map for legacy `.js` to `.mts` renames,
and new modules never had a `.js` name, so it does not change. `workflow-doctor.mts:972` has a syntax-check
list that is already partial (`state-pages` and `state-structure` are missing). It is left unchanged and the
gap is recorded as a followup. None of these needs an edit.

**Blast radius (inline /impact).** No existing production module is edited. The new modules import
`state-render.mts`, `state-snapshot.mts` and `state-structure.mts` read-only. The only existing files that
change are `ai-framework/integrations/state-report.md`, `VERSION` and `CHANGELOG.md`. Nothing consumes the
sanitizer downstream until `state-ai-authoring`. Required regression runs: `state-html.test.mts`,
`state-snapshot.test.mts`, `state-theme.test.mts` and `runtime/invariants.test.mts`.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | Security spike: parser approach, caps, line budget, allow-list, reason codes, API contract, mutation list | `.project/pitches/state-fragment-sanitizer/spike-s1.md` (new); throwaway prototype in the session scratchpad only | 200 (doc) | — | — | no: the decisions gate every other scope and need owner-visible reasoning, so the coordinator runs it inline | — |
| S2 | Fragment parser (strict XML subset, iterative, capped, linear) | `ai-framework/scripts/state-fragment-parse.mts` (new), `ai-framework/scripts/state-fragment-parse.test.mts` (new) | 350 + 250 | S1 | S4 | yes: disjoint files, contract fixed by S1, clear exit. Use its own worktree (no parallel writers in one worktree). **Security-critical: independent review at /audit** | deep |
| S3 | Allow-list validator, content model, re-emit, idempotence | `ai-framework/scripts/state-fragment.mts` (new), `ai-framework/scripts/state-fragment.test.mts` (new) | 300 + 200 | S2 | S4 | yes: builds on S2's tree type, self-contained. **Security-critical: independent review at /audit** | deep |
| S4 | Evidence-path and number checker | `ai-framework/scripts/state-fragment-evidence.mts` (new), `ai-framework/scripts/state-fragment-evidence.test.mts` (new) | 150 + 200 | S1 | S2, S3 | yes: disjoint files, input is S1's `Citations` contract (not the tree), reuses the shared check. Separate worktree | standard |
| S5 | Table-driven mutation matrix, positive controls, named reasons, timed fuzz, mutant proofs | `ai-framework/scripts/state-fragment.test.mts`, `ai-framework/scripts/state-fragment-parse.test.mts`, `spike-s1.md` (status column only) | 300 | S3, S4 | — | yes: mechanical from the S1 vector list and the dataset | standard |
| S6 | Rejection messages never echo content | `ai-framework/scripts/state-fragment.mts` (`rejectionMessage`), `ai-framework/scripts/state-fragment.test.mts` | 40 + 80 | S5 | — | yes: small and well-specified; shares a test file with S5, so it runs after it | fast |
| S7 | Golden dataset mapping (every sanitizer-owned deterministic case maps to a named passing test; a skip never counts) | `ai-framework/scripts/state-fragment-dataset.test.mts` (new); `.project/evals/datasets/state-ai-fragments.json` (committed unchanged, open action A5) | 150 | S6 | — | yes: self-contained, but TAP and skip semantics are subtle | standard |
| S8 | Docs and version log | `ai-framework/integrations/state-report.md`, `VERSION`, `CHANGELOG.md` (through `changelog.mts`) | 40 | S7 | — | yes: prose only | fast |

**File count: 12 against the cap of 15.**
- New (8): 3 production modules, 4 test files and `spike-s1.md`.
- Committed unchanged (1): the dataset.
- Edited (3): `state-report.md`, `VERSION`, `CHANGELOG.md`.
- Not counted, as in earlier plans: `plan.md`, `hill.md` and /build's own log and deviation records.

The pitch projected about 6 files because it did not count the docs, the version log, the spike record,
the per-module test files or the mapping test.

**LOC budgets (hard, set by S1).** Production code is capped at 800 lines in total:
- parser ≤ 350
- validator and emitter ≤ 300
- evidence and number checker ≤ 150

Tests are about 1,000 lines. If S1's prototype shows the parser cannot fit 350 lines, stop and run
`/shape-lite` on the pitch. Trim the allow-list (for example, drop `table`) rather than raise the cap.

## Shared contract fixed by S1 (lets S2 ∥ S4 and S3 ∥ S4)

```ts
// state-fragment-parse.mts (pure, no deps)
type Node = { kind: "element"; name: string; attrs: [string, string][]; children: Node[] } | { kind: "text"; text: string };
parseFragment(text: unknown, limits?: Partial<Limits>): { ok: true; nodes: Node[] } | Rejection;
// state-fragment.mts (pure, no deps)
sanitizeFragment(text: unknown, options?: { classes?: string[]; tokens?: string[]; markers?: string[]; limits?: Partial<Limits> })
  : { ok: true; html: string; citations: Citations } | Rejection;
rejectionMessage(r: Rejection): string;
// state-fragment-evidence.mts (deps-injected)
checkCitations(citations: Citations, snapshot: unknown, root: string, deps?: RuntimeDeps): { ok: true } | Rejection;
type Citations = { hrefs: string[]; numbers: { path: string; text: string }[]; unbound: number };
type Rejection = { ok: false; reason: ReasonCode; count: number; token: string | null }; // token is a name from a closed grammar, never a value
```

Token, class and marker lists are injected parameters. The built-in defaults are minimal: the 7 color
tokens, no page classes, and one marker class `marker-arrow`. `state-ai-authoring` passes
`state-report-redesign`'s exported lists at the integration point (see risk R2).

## Exit criteria per scope (machine-checkable, ≥1 per scope)

`T` below stands for `node --experimental-strip-types --disable-warning=ExperimentalWarning --test`. There
is no build, typecheck or lint command in this repository (`.project/context/stack.md`, "Not
Applicable"). The backend-scope rule "no untyped validators" is enforced by
`T ai-framework/scripts/runtime/invariants.test.mts`, which rejects `any`.

**Mutant proof method (S2-S7).** It follows `patterns/prove-a-guard-test-with-an-in-memory-mutant` and
`issues/guard-tests-can-fail-for-the-wrong-reason`. The author runs a scratchpad script that is never
committed. Placing a mutant under `ai-framework/` would also break the quiet-import invariant.
1. Read the module and require the guard's `before` string to occur exactly once.
2. Replace it with `after`.
3. Rewrite `from "./` to the absolute `file://` URL of `ai-framework/scripts/` and write the mutant into the
   scratchpad.
4. Run the named test with `<MODULE>_UNDER_TEST=<mutant>` and `--test-name-pattern "<name>"`.
5. Before any mutant counts, the unmodified copy must exit 0 through the same harness, in the same fixture
   layout.
6. A mutant counts as killed only when the run exits 1 and the failing assertion names the expected reason.
   A fixture error or ENOENT does not count, and a timeout means the test's cleanup must be fixed.
7. Survivors are recorded as either a missing test or a redundant layer, with the reason (testing.md
   "Prove the Test Can Fail").

This is `author-run` evidence. It is not independent review.

### S1 — Security spike
- `test -f .project/pitches/state-fragment-sanitizer/spike-s1.md` exit 0
- Caps table with numbers: `grep -cE '^\| (MAX_FRAGMENT_BYTES|MAX_DEPTH|MAX_NODES|MAX_ATTRS|MAX_ATTR_VALUE|MAX_PATH_D|MAX_TEXT|MAX_NAME|MAX_CITATIONS|FUZZ_TIME_BOUND_MS) \| [0-9][0-9,]* \|' spike-s1.md` = 10. These are proposed starting values that the spike confirms or changes with a reason:

  | Cap | Value |
  |-----|-------|
  | `MAX_FRAGMENT_BYTES` (UTF-8, checked before any scan) | 65,536 |
  | `MAX_DEPTH` | 20 |
  | `MAX_NODES` | 2,000 |
  | `MAX_ATTRS` | 12 per element |
  | `MAX_ATTR_VALUE` | 512 |
  | `MAX_PATH_D` | 8,192 |
  | `MAX_TEXT` (per text node) | 4,000 |
  | `MAX_NAME` | 32 |
  | `MAX_CITATIONS` | 50 (same as `MAX_ITEMS` in `state-render.mts`) |
  | `FUZZ_TIME_BOUND_MS` (per vector) | 1,000 |
- Line budget recorded: `grep -cE '^\| (PARSER|VALIDATOR|EVIDENCE)_LINE_BUDGET \| [0-9]+ \|' spike-s1.md` = 3. A prototype timing over a 2 MB adversarial input in the scratchpad is recorded: `grep -c 'measured:' spike-s1.md` ≥ 1.
- Decisions recorded: `grep -cE '^- \*\*D[0-9]+' spike-s1.md` ≥ 9. Each one is decided, not left open:
  - D1 parser approach (hand-written single-pass scanner with an explicit stack; no regex over unbounded input)
  - D2 entity rule (only `&amp; &lt; &gt; &quot; &apos;`; numeric and other named references reject)
  - D3 element and attribute allow-list per namespace
  - D4 content model against the HTML parser differential. Covers: no HTML element inside `svg`; text only in SVG `title`/`desc` (HTML integration points); no block inside `p`; no `a` inside `a`; strict `table > caption? thead? tbody > tr > th|td`; no void or self-closed HTML elements
  - D5 browser behavior list as fixtures or as a manual cross-browser check (pitch risk; the critique's list is not persisted in the repo, so the spike rebuilds it)
  - D6 number binding (see R5)
  - D7 color, class and marker rule (`var(--token)` presentation values or class-only, re-emitted from the parsed token)
  - D8 transcript-path patterns
  - D9 canonical href form (project-relative; the `../../` prefix belongs to the injector)
- Mutation list skeleton (failing-then-passing): `grep -cE '^\| M[0-9]+ \|.*\| \[[a-z-]+\].*\| planned \|$' spike-s1.md` ≥ 30. The columns are id, guard, module, exact `before` string, test name `[case-id] …`, expected reason and status. Every row is `planned` until S5 flips it.
- Reason-code table: every reason named in the M rows appears in the closed reason list. A one-line `node -e` cross-check over the file exits 0.
- Pitch base recorded for the no-shared-edit checks: `grep -c '^Base: [0-9a-f]\{40\}$' spike-s1.md` = 1
- Gate: if `PARSER_LINE_BUDGET` > 350 or production total > 800, stop and run `/shape-lite` (no build starts)

### S2 — Fragment parser
- `T ai-framework/scripts/state-fragment-parse.test.mts` exit 0, with one test per vector, each asserting `reason`:
  - positive controls: the dataset's `accept-valid-fragment` markup, SVG self-closing elements, all five predefined entities
  - one rejection each: `doctype`, `entity-declaration`, `cdata`, `comment`, `processing-instruction`, `namespace-prefix` (`<svg:script>`, `xlink:href`), `character-reference` (`&#106;`, `&Tab;`, `&nbsp;`), `unclosed`, `mismatched-close`, `duplicate-attribute`, `unquoted-attribute`, `control-character` (C0/C1, U+202A-202E, U+2066-2069)
  - every cap: the value at the cap is accepted, and cap+1 rejects with that cap's reason (`size-limit`, `depth-limit`, `node-limit`, `attribute-limit`, `attribute-length`, `path-length`, `text-length`, `name-length`)
  - iterative: 100,000 nested `<g>` with `limits.maxDepth` raised to 1e6 and the byte cap raised parses with no `RangeError`
  - linear: a 2 MB adversarial input (repeated `<a`, `&`, `<!`, unclosed attribute quote) with caps raised finishes in < `FUZZ_TIME_BOUND_MS`
- `test $(wc -l < ai-framework/scripts/state-fragment-parse.mts) -le 350` (or the S1 budget, if lower)
- `T ai-framework/scripts/runtime/invariants.test.mts` exit 0 (no `node:*` import, no `any`, silent import)
- Mutant proof: every parser row of the S1 mutation list (caps, structural rejects, entity rule, control characters) is killed through `STATE_FRAGMENT_PARSE_UNDER_TEST`
- /audit: an independent `security-reviewer` and `code-reviewer` run on a different model than the author's (`patterns/a-gate-must-not-trust-its-own-author`)

### S3 — Allow-list validator, content model, re-emit, idempotence
- `T ai-framework/scripts/state-fragment.test.mts` exit 0, covering:
  - positive control: the `accept-valid-fragment` markup is accepted (headings, table, `code`, SVG shapes, `text`, `title`, `desc`, marker class, anchor to a cited file)
  - idempotence: `sanitize(sanitize(x)).html === sanitize(x).html` byte for byte over every positive control
  - one rejection per class with a named reason: `element-not-allowed` (`script`, `style`, `animate`, `set`, `use`, `foreignObject`, `image`, `iframe`, `object`, `math`, `template`), `event-handler` (`on*`), `style-attribute` (including `style=""`), `id-attribute`, `url-reference` (any `url(` in any value), `script-scheme` (`javascript:` after entity decoding and after removing tab/newline), `attribute-not-allowed`, `class-not-allowed` (including `status`, `status-observed`), `color-not-token`, `marker-not-allowed`
  - content-model rejections (S1 D4), each with reason `content-model`
  - emit escapes `& < > " '` in text and attributes; geometry and `d` are re-emitted from parsed numbers
- Injection works: custom `classes`/`tokens`/`markers` are accepted, and anything outside them rejects. Drift test: the default token list equals the color keys of `FALLBACK.light`.
- `test $(wc -l < ai-framework/scripts/state-fragment.mts) -le 300`
- `T ai-framework/scripts/runtime/invariants.test.mts` exit 0
- Mutant proof: every validator and emitter row is killed through `STATE_FRAGMENT_UNDER_TEST`. Rows include: allow-list lookup, `on*` check, `url(` check, scheme check, class check, content model, escape on emit and canonical numbers.
- /audit: independent security review on a different model (security-critical)

### S4 — Evidence-path and number checker
- `T ai-framework/scripts/state-fragment-evidence.test.mts` exit 0. The fixture is a hand-built snapshot written with `tempFixture`. One vector per test, each with a named reason:
  - `evidence-path-not-in-snapshot` case: the file exists on disk but not in the snapshot (`not-in-snapshot`), `../x` (`traversal`), `/etc/passwd` (`absolute-path`), `.env` that is in the hostile snapshot and on disk (`secret-path`), and a transcript path (`*.jsonl` under `.claude/projects/`, or the S1 D8 patterns) that is in the hostile snapshot and on disk (`transcript-path`)
  - `reject-external-anchor` case: `https://example.com` (`scheme`), `//host/x` (`protocol-relative`), `../secrets` (`traversal`), `%2e%2e/x` (`percent-encoding`), `file:///etc/passwd` (`scheme`), plus a backslash vector (`backslash`)
  - a symlink inside the project that is in the snapshot rejects through the shared check (`unsafe-path`)
  - positive controls: a real cited file that is in the snapshot is accepted, and the same file under an aliased root (`tempFixture(..., { resolve: false })`) is accepted
  - `number-mismatch` case: `<data value="pitches.items.length">12</data>` against 3 items (`number-mismatch`); a bare numeral in prose (`unbound-number`, per S1 D6); an unknown path (`unknown-fact`); a non-numeric leaf (`not-a-number`); a `__proto__` or `constructor` segment (`unknown-fact`); a bound equal number is accepted
  - more than `MAX_CITATIONS` citations reject with `citation-limit`
- Reuse, not copy: `grep -c 'safeEvidencePath' ai-framework/scripts/state-fragment-evidence.mts` ≥ 1 and `grep -c 'function safeEvidencePath' ai-framework/scripts/state-fragment-evidence.mts` = 0
- No shared state modules are edited by this pitch: `git diff --name-only <Base from spike-s1.md> HEAD -- ai-framework/scripts/state-render.mts ai-framework/scripts/state-snapshot.mts ai-framework/scripts/state-structure.mts ai-framework/scripts/state-theme.mts ai-framework/scripts/state-pages.mts` is empty for this pitch's commits
- `test $(wc -l < ai-framework/scripts/state-fragment-evidence.mts) -le 150`
- `T ai-framework/scripts/runtime/invariants.test.mts` exit 0
- Mutant proof through `STATE_FRAGMENT_EVIDENCE_UNDER_TEST` kills every evidence row. These include removing the snapshot-membership check, removing the shared-check call (the symlink vector must then fail), the transcript check, numeric equality and the `__proto__` guard.

### S5 — Mutation matrix, positive controls, timed fuzz
- `T ai-framework/scripts/state-fragment.test.mts ai-framework/scripts/state-fragment-parse.test.mts` exit 0
- Every attack vector is a top-level `test()` named `[<dataset-case-id>] <vector>` and asserts `ok === false` and the exact `reason`. Each vector has a paired positive control: the same fragment with only the vector removed must be accepted, which proves the vector caused the rejection. Check: `T --test-reporter=tap <both files> | grep -cE '^ok [0-9]+ - \[(reject|accept)-'` ≥ the number of vectors listed in `spike-s1.md`
- Timed fuzz `[reject-oversize-and-deep]`: 100,000 nested groups, a 5 MB `path d` and an unclosed construct 200,000 lines long. Each rejects in < `FUZZ_TIME_BOUND_MS` with no `RangeError`, through the real `sanitizeFragment` with default caps. S2's raised-cap linearity test stays, so the size cap is not the only defense
- TAP summary for both files shows `# skip 0` and `# todo 0`
- Mutant proof: every `M` row in `spike-s1.md` reads `killed` or `redundant-layer: <reason>`. `grep -cE '\| planned \|' spike-s1.md` = 0
- Regression: `T ai-framework/scripts/state-html.test.mts ai-framework/scripts/state-snapshot.test.mts ai-framework/scripts/state-theme.test.mts` exit 0

### S6 — Rejection messages never echo content
- `T ai-framework/scripts/state-fragment.test.mts` exit 0, with `[rejection-message-does-not-echo]` vectors:
  - an attribute value holding `\u001b]0;pwned\u0007`, a 10 KB canary string, U+202E, a newline and `<script>`
  - an element or attribute name outside the name grammar is shown as `(other)`
- Each message matches `/^fragment rejected: [a-z-]{1,40} \(\d{1,6}\)( at (<[a-z][a-zA-Z0-9-]{0,31}>|\(other\)))?$/`, is ≤ 120 characters and contains no part of the canary. `JSON.stringify(rejection)` contains no part of the canary either, because the rejection object is a channel too
- Mutant proof: taking the token from the value instead of the validated name makes the test fail; so does removing the `printable` pass

### S7 — Golden dataset mapping
- `T ai-framework/scripts/state-fragment-dataset.test.mts` exit 0. The test:
  - reads the dataset through `readData` and asserts 22 unique ids
  - asserts the owned set and the closed deferred set (`OWNED_BY_STATE_AI_AUTHORING`) are disjoint and together equal the dataset exactly. A new case with no mapping fails
  - spawns `node <NODE_FLAGS> --test --test-reporter=tap` over the three test files and requires, for each owned id, ≥ 1 `ok` line whose name starts with `[id]` and carries no `# SKIP` or `# TODO` directive. It also requires child exit 0 and a summary of `# skip 0`, `# todo 0`, `# fail 0`
  - includes negative controls in the same file: a synthetic TAP report where an id's only test is `ok … # SKIP`, `ok … # TODO`, `not ok`, or absent marks that id unenforced
- Owned (13, deterministic, enforced here):
  - `reject-script-element`, `reject-event-handler`, `reject-smil-href`, `reject-external-use`, `reject-style-attribute`, `reject-entity-encoded-javascript`, `reject-structural-constructs` (11 vectors, each with its own reason) → S2/S3/S5
  - `reject-external-anchor`, `evidence-path-not-in-snapshot`, `number-mismatch` → S4
  - `reject-oversize-and-deep` → S5 fuzz
  - `accept-valid-fragment` → S3/S5 positive controls and idempotence
  - `rejection-message-does-not-echo` → S6
- Deferred to `state-ai-authoring`, out of scope and stated in the test:
  - 5 live-only cases: `database-deployment-claim`, `uncited-claim`, `tokens-slot-invented-totals`, `prompt-injection-in-evidence`, `sparse-snapshot`. Their deterministic post-checks will call this pitch's `sanitizeFragment` and `checkCitations`.
  - 4 deterministic injector cases: `failure-isolation`, `stale-fragment-default-and-strict`, `reuse-only-when-hash-unchanged`, `ai-label-always-present-and-unspoofable`. The sanitizer half of the last one (classes outside the tokens reject, `status-*` refused) is also tested here as `[ai-label-always-present-and-unspoofable:sanitizer]`, but the case stays deferred.
- Mutant proof: a mutant TAP parser that accepts `# SKIP` lines fails the negative-control test
- Dataset tracked (open action A5, after the owner approves the commit): `git ls-files --error-unmatch .project/evals/datasets/state-ai-fragments.json` exit 0, by /ship at the latest

### S8 — Docs and version log
- `grep -c 'state-fragment' ai-framework/integrations/state-report.md` ≥ 1. The section states that the sanitizer is a library that is not wired yet (`state-ai-authoring`), lists the caps and reason classes, and says rejection messages never echo content
- `node ai-framework/scripts/docs-links.mts ai-framework/integrations/state-report.md` exit 0
- `node ai-framework/scripts/changelog.mts --bump minor --category Added --summary "..." --files "..."` exit 0; `node ai-framework/scripts/changelog.mts --check` exit 0
- `node ai-framework/scripts/setup-validator.mts` exit 0 (it also parses the new `.mts` files)
- `node ai-framework/scripts/graphify.mts --check` exit 0 (no knowledge edits expected before /ship)
- Full state regression: `T ai-framework/scripts/state-*.test.mts ai-framework/scripts/runtime/invariants.test.mts` exit 0

## Risks (inherited from pitch rabbit holes, plus found while planning)

Pitch owners `S1`/`S2` were named before planning. Pitch `S1` maps to plan S1, and pitch `S2` (token and
marker set) maps to plan S3.

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| R1 (pitch) Hand-written parser grows past the cap (upper estimate 800+ lines) | S1, S2 | **yes** | Spike prototype and a hard budget of ≤ 350 parser lines and ≤ 800 production lines. If exceeded, `/shape-lite` trims the allow-list. The cap is never raised during build |
| R2 (pitch) Marker set and class or token list come from `state-report-redesign`, which is planned in parallel and not built. That pitch's design system lists tokens, chips and charts but **no SVG marker set**, and its charts forbid `url()`, so marker defs need ids the sanitizer refuses | S3 | no | Lists are injected parameters with a minimal default (7 color tokens, no page classes, `marker-arrow`). Markers are class-based, and the page's CSS owns `marker-end`. Integration point: `state-ai-authoring` passes redesign's exported lists. Followup to redesign: export the class, token and marker lists and own the marker defs |
| R3 (pitch) Use the critique's browser behavior list as fixtures, or add a cross-browser check by hand. The list is **not persisted** anywhere in the repo | S1 | **yes** | Spike D5 rebuilds it from the dataset and from HTML-parser rules: foreign-content breakout, integration points, foster parenting, implied end tags, entity decoding, case folding, self-closing non-void. It lands as content-model fixtures in S3. There is no browser in the stack and no new dependency, so the default is fixtures only. An owner manual check in one browser is an optional smoke, recorded if done |
| R4 The shared check has no transcript rule and returns only a boolean (pitch assumed both) | S4 | no | Local shape pre-classification for named reasons (traversal, absolute, scheme, percent, backslash, secret, transcript). The shared `safeEvidencePath` stays the final authority. Followup: fold the transcript rule into the shared check once `state-report-redesign` releases `state-render.mts` |
| R5 How a stated number is tied to a fact is not specified. The snapshot has no "active pitches" number (dataset `number-mismatch`) | S1, S4 | **yes** (D6) | Default: numbers bind through `<data value="<path>">N</data>`. The path is resolved over own properties, with `.length` allowed on arrays and `__proto__`/`constructor`/`prototype` refused. Bare numerals in prose reject as `unbound-number`, except inside `code` (and ISO dates in `time`, if D6 allows them). D6 also decides numerals in SVG `text` |
| R6 Idempotence against link rewriting | S3 | no | Canonical output keeps project-relative hrefs. The injector (`state-ai-authoring`) adds the `../../` prefix after sanitizing |
| R7 Import cycle once the injector makes `state-render.mts` import the sanitizer (`state-render` → `state-fragment-evidence` → `state-render`) | S4 | no | No top-level use of imported bindings. The quiet-import invariant test covers it. Recorded for `state-ai-authoring`, which can inject the check if needed |
| R8 macOS tmpdir realpath alias (`issues/macos-tmpdir-realpath-alias-breaks-path-assertions`) | S4 | no | The checker realpaths `root` once. Tests compare realpaths, and one aliased-root positive control proves it |
| R9 Guard tests fail for the wrong reason (`issues/guard-tests-can-fail-for-the-wrong-reason`) | S2-S7 | no | One vector per test, an exact named reason, a paired positive control, and a baseline pass in the same layout before mutants. Fixture failures do not count as kills |
| R10 Quadratic regex over untrusted text (`issues/backtracking-regex-over-untrusted-text-is-quadratic`) | S2, S3 | no | The size cap applies before any scan. Regexes run only on already-bounded name or value slices. A 2 MB raised-cap timing test |
| R11 Dataset is untracked (A5). `rules/machine-data-format.md` says new agent-loaded datasets start as TOON, but also keep a gating dataset in JSON until the TOON reader is proven, and do not convert a file another active pitch pins | S7 | no | Keep JSON and commit it unchanged at owner approval. Read it through `readData` without an extension so conversion stays non-breaking. Conversion is a followup after `state-ai-authoring` ships |
| R12 The pitch says the deterministic cases are enforced here, but 4 of 17 are injector tests | S7 | no | A closed deferred list with owner `state-ai-authoring`, and an exact-partition assertion |
| R13 Cross-pitch: `state-report-redesign` edits `state-render.mts`/`state-theme.mts` in parallel. A signature change to `safeEvidencePath` or `FALLBACK` breaks S3/S4. The pitches may also contend on `VERSION`/`CHANGELOG.md` | S3, S4, S8 | no | Import only, never edit. The no-shared-edit exit check. Re-run S3/S4 tests after redesign lands. `cross-pitch-conflict-checker` at /audit. `changelog.mts` runs last, on the current `VERSION` |
| R14 `var(--token)` in SVG presentation attributes under the CSP (`style-src 'unsafe-inline'` only) | S1, S3 | **yes** (D7) | Choose class-only colors if presentation `var()` is uncertain. Either way, emit from the parsed token name, never copy |
| R15 The TAP reporter is Node-specific, but tests can also run under `bun test` | S7 | no | The mapping test always spawns Node (`process.execPath` when on Node; `node` on PATH under Bun). If Node is unavailable it fails and says so; it never skips |
| R16 Validators recurse while walking the tree | S3 | no | The parser is iterative. Validator and emitter recursion is bounded by `MAX_DEPTH` (20), which the S2 tree guarantees. Stated in the spike |

**Rules folded into exits.**
- `rules/security.md` §2: length caps on every string. §4: allow-list only; no `<script>`, `on*` or `javascript:`; links validated. §5: no internal detail in errors (S6).
- `rules/coding-standards.md`: no `any`, enforced by the invariants test; named exports; `UPPER_SNAKE` caps.
- `rules/testing.md`: mutant proofs, the macOS tmpdir clause, and re-review of every fix at /audit.
- `rules/machine-data-format.md`: R11.
- `rules/canonical-mirror-sync.md` does not apply, because no skill or agent file is edited; the `/state` skill mirrors belong to `state-ai-authoring`.
- `.project/rules/` holds only `README.md`, with no stack companions, so it adds no constraints.

Knowledge folded:
- `parse-untrusted-values-and-re-emit-them` (re-emit from the parse)
- `a-source-scanner-fails-closed-on-what-it-cannot-read` (any cap or parse failure rejects the whole fragment)
- `untrusted-text-reaches-the-terminal-through-error-messages` (S6)
- `a-gate-must-not-trust-its-own-author` and `a-gate-must-not-audit-its-own-instrument` (author mutants are not review)

## Parallel dispatch plan

1. **S1** runs inline with the coordinator at `deep`. Its record is reviewed at the spike checkpoint. If the line budget fails, go to `/shape-lite`.
2. **S2** (worktree A, `deep`) and **S4** (worktree B, `standard`) start in parallel after S1. Their file sets are disjoint, and S4 builds against S1's `Citations` contract rather than the tree. No two writers share a worktree (`harnesses.md`, "Other dispatch rules").
3. **S3** (worktree A, `deep`) runs after S2 merges and can overlap with S4.
4. **S5** (`standard`) runs after S3 and S4 merge into one tree, so the matrix and mutants run against the integrated modules.
5. **S6** (`fast`) and then **S7** (`standard`) run sequentially, because S6 shares `state-fragment.test.mts` with S5 and S7 needs the final test names.
6. **S8** (`fast`) runs last, so `changelog.mts` records the final file list.

Claude Code supports nested dispatch. On a harness without it, run the same scopes sequentially in the
same order. /audit runs `security-reviewer` and `code-reviewer` on S2, S3 and S4 with a model other than
the one that wrote them, plus `test-coverage-checker` and `cross-pitch-conflict-checker`. `eval-runner`
does not apply, because this is not an AI-prompt scope; the live cases run under `state-ai-authoring`.

## Wireframes (UI scopes only, light)

Not applicable. No scope renders a page. The sanitizer returns markup, and placing it in a page belongs to
`state-ai-authoring`.

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)

## Approved test strategy — S2/S4 build wave (2026-10-19)

Owner approved S2/S4 implementation after the S1 gate. This strategy uses the detailed behavioral
exits above; it adds no new product scope. Node built-in unit tests cover both utilities.

| File | Behavior to test | Test type | Test file |
|------|------------------|-----------|-----------|
| state-fragment-parse.mts | Accepted trees/entities; named malformed-input rejection; exact cap boundaries; iterative deep parsing and raised-cap timing | Unit | state-fragment-parse.test.mts |
| state-fragment-evidence.mts | Real snapshot citation membership and safe files; alias/symlink/unsafe-path rejection; own-property numeric resolution and mismatch/unbound rejection | Unit with real filesystem fixtures | state-fragment-evidence.test.mts |

Tests use paired positive controls and named reason assertions, then author-run guard mutants.
No E2E or browser tests apply to these libraries. Node experimental coverage is measured for
the new production modules with a utility target of 90%; it does not replace the mutant exits.

## Approved test strategy — S3 (2026-10-19)

Owner approved S3 after the S2/S4 evidence gate. Tests remain those in the detailed S3 exits.

| File | Behavior to test | Test type | Test file |
|------|------------------|-----------|-----------|
| state-fragment.mts | Allow-listed HTML/SVG, exact named refusals, parser-differential content rules, option/geometry boundaries, citations, escaped canonical output and byte-idempotence | Unit | state-fragment.test.mts |

Grounding correction: FALLBACK.light includes radius/fontSans/fontMono as well as seven colors.
The drift assertion compares the seven color-valued keys, preserving S1 D7's exact token set.
This corrects the plan's all-keys assertion; it does not widen the accepted token vocabulary.

## S5 dependency correction and approved test strategy — 2026-10-20

Owner approved S5 with full Orca coordination. M50/M51 target S6 rejection messages and M52
targets S7 TAP parsing; those implementations do not yet exist. The S5 proof exit therefore
applies to M1–M49. Later rows retain explicit deferred ownership until their scopes prove them,
and all rows must be resolved by build completion. No later proof is claimed early.
Node TAP emits `# skipped 0`; this satisfies the intended zero-skips exit (the plan's `# skip 0`
is shorthand). Exact TAP output is retained rather than rewritten.

| File | Behavior | Test type | Test file |
|------|----------|-----------|-----------|
| sanitizer and parser | Named attack vectors with paired controls; parser and canonical caps; timed default-cap sanitizer fuzz; guard removal fails the expected assertion | Unit/adversarial | state-fragment.test.mts and state-fragment-parse.test.mts |

One worker writes the two test files sequentially in the shared checkout because the integrated
modules are uncommitted. The coordinator snapshots existing bytes, independently inspects the
actual edits and reruns exits; no concurrent worker writes and no blind patch application.

## Approved test strategy — S6 (2026-10-20)

Owner approved S6 after the S5 evidence gate. One sequential Orca writer owns the formatter
and its existing test file; the coordinator snapshots, inspects, and reruns exits.

| File | Behavior | Test type | Test file |
|------|----------|-----------|-----------|
| state-fragment.mts | Closed bounded rejection messages, no value echo in metadata, malformed runtime objects, token-provenance mutant and measured printable defense | Unit/adversarial | state-fragment.test.mts |

S1 D10 governs M51: measure the printable-removal mutant and document redundancy with
closed-grammar enforcement if it survives; do not weaken the formatter to make it observable.

## Approved test strategy — S7 (2026-10-20)

Owner approved S7 after the S6 evidence gate. The dataset is already tracked; preserve its bytes.

| File | Behavior | Test type | Test file |
|------|----------|-----------|-----------|
| state-fragment-dataset.test.mts | Exact 22-case partition; 13 owned cases enforced by actual passing child tests; nine explicitly deferred; SKIP/TODO/fail/missing never count; skip-parser mutant fails | Dataset contract and subprocess integration | state-fragment-dataset.test.mts |

Use actual Node TAP `# skipped 0`, as corrected in S5. One sequential Orca writer adds only
the mapping test; coordinator independently inspects, verifies immutable input hashes, reruns
exits and M52 before scope completion. No live authoring claims or dataset status edits.
