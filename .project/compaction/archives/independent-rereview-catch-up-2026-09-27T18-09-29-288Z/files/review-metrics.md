# Review record: metrics collector, renderer and plugin (S2)

**Subject:** `ai-framework/hooks/scripts/token-consumption.js` (collector), `token-report.js` (renderer), `.opencode/plugins/token-consumption.js`, their tests.
**Code state reviewed:** the working tree on 2026-09-26 ~19:50, including the concurrent session's uncommitted rewrite of the lock and identity-key code (skipped by instruction: that pitch owns it).
**Yardstick:** `decisions/token-metrics-dimensions-design`, `patterns/allow-list-untrusted-labels-at-ingest-and-at-render`, `patterns/reversible-aggregates-store-their-routing`, `security.md` sections 2, 4, 9.
**Audit cycles:** 3 (cycle 1: dispatches a–c; cycle 2: d; cycle 3, the cap: e). Prompts are in `prompts/s2-*.txt`.

independent: yes
canary: caught
read-only: verified by review-bench guard (snapshot before every dispatch, check after; see the guard column)
prompt-sha256: 6ee52f85d3c4ab2eed9bb17b04ee40bc5a80555d1a7a22cc4c30b2eda38b7315
model: sonnet (dispatches a, b, c), opus (dispatches d, e)
cross-file interactions: reviewed

Meaning of `independent: yes` here: a fresh agent (not resumed, shown no earlier findings), same model family as the author, and it found the planted defect. **It is not proof of independence from the author's blind spots.** `cross-pitch-conflict-checker`: the concurrent pitch `collector-robustness` owns the lock and identity code in the same file; its area was excluded from every prompt, and its uncommitted edits were reviewed only where they touch the code outside that area.

## Dispatches

| id | role | model | tool calls | prompt-sha256 | canary planted | canary | guard |
|----|------|-------|-----------|---------------|----------------|--------|-------|
| a | security-reviewer, collector | sonnet | 21 | 6ee52f85…7b315 | `SAFE_NAME` allowed `()[]` (Markdown injection reopened) | caught | flagged `native-safety-feasibility/*` and `status.md`, written 19:54–19:55 **inside** the dispatch window (prompt at 19:51:40); attributed to the concurrent session by **content** (a new pitch on an unrelated topic), not by time |
| b | security-reviewer, renderer + plugin | sonnet | 18 | e2bb684d…055c3 | `SAFE_LABEL` in the renderer allowed `()[]` | caught | flagged the same concurrent pitch's files (`bench.py`, `evidence.json`, deviations); attributed by content |
| c | code-reviewer, cross-boundary (snapshot schema, event contract, hook wiring, helpers) | sonnet | 16 | a3c5f9a3…bd76 | plugin sent `variant:` instead of `effort:` | caught | flagged only that pitch's files; attributed by content |
| d | security-reviewer, re-review of the round-1 fixes (cycle 2) | opus | 21 | e44e4454…38164 | `MODE` regex without its end anchor | caught | clean |
| e | security-reviewer, re-review of the round-2 fixes (cycle 3, the cap) | opus | 15 | 053b0aa3…de2b3 | mdCell URL escape matched `:///` instead of `://` | caught | flagged `.project/compaction/archives/bundle-sync-marker-fix-*` (the concurrent session compacting its own pitch); attributed by content |

Bench note: three canary attempts were refused because they broke no scratch test: renaming the snapshot's `since` field, changing the plugin's `metricScope` value, and weakening the address escape to `@[a-z]`. Those interface values had no test guarding them.

## Findings (real defects only; each reviewer's canary finding is excluded)

Verification budget: 8 claims per role-slice. Every claim was reproduced by a script against the repo code (scripts `w1`–`w7`); claims resting on reading or on the reviewer's own run say so.

| id | source | finding | verified | tier | disposition |
|----|--------|---------|----------|------|-------------|
| Q1 | a | a FIFO at the snapshot path hangs the hook; a symlinked snapshot is read and its keys copied | w1: hung at 4 s; out-of-root content copied into the local snapshot | must-fix (G1 mandatory, never blocks the agent) | fixed: guarded snapshot reader (symlink, non-regular, size cap) with its own skip outcome; 3 tests |
| Q2 | a, c | a snapshot with an unrecognised (newer) schemaVersion was overwritten as if absent | w5: schemaVersion 3, 500 completions became 1 | must-fix (`hardening-a-shared-reader…` class) | fixed: refused and never overwritten; test |
| Q3 | a, b, c, d | the `mode` from modes.json was stored unbounded and rendered as a Markdown link (100 KB → a 102 KB snapshot) | w1, w5 | must-fix | fixed: one short lowercase word or not stored; renderer re-checks; tests |
| Q4 | a | `hook_event_name` unbounded (a 3 MB payload gave a 3.0 MB snapshot); stdin accepted 20 MB | w2 | must-fix (the decision entry's "bounded snapshot" claim was false) | fixed: event name allow-listed, stdin capped at 1 MB counted in bytes; tests |
| Q5 | a, b, c | a snapshot with a wrong-shaped body (`lifetime: {}`, a cost string) made every later event throw, and the reports never regenerated (JSON written first, render then threw) | w1 (F7), w3 (e2e: report never created) | must-fix | fixed: full shape validation, reports rendered after the snapshot in a guarded step; tests |
| Q6 | b | the renderer allow-listed only the agent label: vendor, model, mode, scope, dates reached the Markdown raw (heading injected via `updatedAt`), and numeric fields went unescaped into HTML | w3 | must-fix (security 4 XSS) | fixed: `cleanSnapshot` re-checks every string, number and date at render; 3 tests |
| Q7 | b | the renderer threw on plausible malformed snapshots | w3: 4 throw cases | must-fix | fixed with Q6; test |
| Q8 | a | raw error text and an absolute path on stderr | w1 | must-fix (G4 mandatory) | fixed: error codes only, printable ASCII, bounded; tests |
| Q9 | a | float token counts made a later reversal throw an underflow and lose the event | frac.js against the repo: (0.3, 0.6) throws | should-fix | fixed: token counts are whole numbers; test |
| Q10 | a | a Claude model note could be consumed by another vendor's completion | w1: `{"codex":{"claude-secret-model":…}}` | should-fix | fixed: vendor-scoped note key; test |
| Q11 | b, c | the plugin records a model named `undefined/undefined` when provider/model ids are absent | w4.mjs | should-fix | guarded in the collector (`knownModel`); the plugin is not edited (see followup) |
| Q12 | d | the modes.json read was unguarded: a FIFO hung the hook **and left the metrics lock held** | w6 | must-fix (G1) | fixed: lstat + regular-file + 64 KB bound; test |
| Q13 | d | a `-5` dimension row wedged every later Claude completion; a model note read back bypassed the allow-list; bare URLs in labels became live Markdown links | w6 | should-fix (mandatory §2/§4 items) | fixed: row validation, note re-validated, `://` and `www.` neutralized in Markdown; tests |
| Q14 | e | round-2 gaps in my validators: a row `{}`, a vendor `{}`, `agentModels: null` or a stored record with partial tokens still passed and then wiped the history on the next read; `_www.` slipped past a `\b` | w7 (C, D, E reproduced; G did not) | must-fix (my own fix) | fixed: every counter required, routing must resolve to a real row, the rejected file is kept as `token-consumption.json.rejected`; 6 tests |
| Q15 | c | `since` and `metricScope` are not asserted by any collector→renderer test (the bench refused both canaries) | bench refusal | should-fix | followup (test gap) |

Not fixed here (recorded): plugin hardening (null event objects throw; unbounded per-session map values; undefined `sessionID` shares a key; no edit within the file cap), TOCTOU between lstat and read (needs `O_NOFOLLOW|O_NONBLOCK` + `fstat`), lifetime totals clamped with `Math.max(0, …)` (the reversible-aggregates pattern says "never clamp"), the overflow bucket's label also covers rejected names, `metricScope` from the plugin path is unbounded, the lock/identity issues (owned by `collector-robustness`).

## Checklist results (final state)

| item | result | evidence |
|------|--------|----------|
| G1 reader refuses symlinks/FIFOs/oversize | pass | snapshot and modes.json readers; 5 tests |
| G2 linear regexes, capped input | pass | names sliced before matching; stdin, snapshot, modes.json capped |
| G3 no project script executed | pass | relative `require` only |
| G4 no raw error text or absolute path | pass | code-only messages, printable ASCII |
| G5 atomic writers that never follow symlinks | pass | `wx` + random suffix + cleanup in `finally`; the rejected-file copy uses the same writer |
| Sec. 4 output safety (HTML, Markdown links) | pass | `escapeHtml`, render-time allow-list, autolink triggers neutralized; the reviewer could not run a real GFM renderer, so entity decoding by every viewer is **unverified** |
| Sec. 9 "absent" vs "refused" | pass for refusal outcomes; blank-on-malformed is deliberate, and the rejected text is now kept aside |

## Evidence

- Suites: `node --test` on the three token test files plus `state-snapshot`, `state-html`, `pitch-compress`, `pitch-archive`: **244 tests, 243 pass, 0 fail** (one skipped); doctor READY, setup-validator READY.
- The repo's own real snapshot (417 completions) still validates and keeps its totals across a new event.
- Mutation checks: about 48 mutants applied one at a time to scratch copies over the three rounds; all caught except two kept on purpose: the `record.vendor` type check in `isStoredRecord` (the routing check already covers it) and the keep-aside branch in `reviveMaps` (unreachable now that validation covers everything it needs).
- Files changed by this slice (fix cap 4): `token-consumption.js`, `token-report.js`, `token-consumption.test.js`, `token-report.test.js`.
- **The concurrent `collector-robustness` pitch has uncommitted edits in `token-consumption.js` too.** I edited the working copy in regions outside its lock and identity code; whoever commits first will need to reconcile.
- **Not independently re-reviewed:** the round-3 changes (Q14) were made after the last dispatch; they are verified by PoC and mutation checks only.
