# S2 evidence: report renderer and usage headline

Run on 2026-09-24, Node v24, from the repository root.

## Files

- New: `ai-framework/hooks/scripts/token-report.js` (exports `markdown`, `html`), `ai-framework/hooks/scripts/token-report.test.js` (14 tests).
- Changed: `ai-framework/hooks/scripts/token-consumption.js` (render code removed, `require("./token-report.js")` added; no other line changed).

## Exit criteria

1. `node --test ai-framework/hooks/scripts/token-report.test.js ai-framework/hooks/scripts/token-consumption.test.js ai-framework/scripts/skill-defaults.test.js`

   ```
   ℹ tests 59
   ℹ pass 59
   ℹ fail 0
   ```

   Exit 0. `skill-defaults.test.js` is unchanged, so its pinned strings at lines 345-348 still pass.

2. `grep -c "function markdown\|function html" ai-framework/hooks/scripts/token-consumption.js`

   ```
   0
   ```

3. `node --test --experimental-test-coverage ai-framework/hooks/scripts/token-report.test.js ai-framework/hooks/scripts/token-consumption.test.js`

   ```
   ℹ tests 37
   ℹ pass 37
   ℹ file                    | line % | branch % | funcs % | uncovered lines
   ℹ    token-consumption.js |  89.44 |    90.91 |   89.19 | 82-83 176-177 299-303 316-328 330 400-408 410-417 420-424
   ℹ    token-report.js      | 100.00 |    98.61 |  100.00 |
   ```

   `token-report.js` is at 100% lines. Note: the collector is now at 89.44% lines. Its S1 exit criterion asks for at least 90%. Moving the render code out removed lines that its tests covered, and the remaining uncovered lines are the lock-contention and stale-lock paths and two underflow guards (all S1 code, unchanged here). This needs a decision at S1's re-check or audit; S2 did not touch `token-consumption.test.js`.

4. Render cost: scratchpad script `render-cost.js` (not in the repo) makes 100 `recordEvent` calls into a temp root, cycling 3 vendors, 7 agents, 11 models and 2 efforts, and prints the median per call. Two runs:

   ```
   median 5.95 ms, p95 6.48 ms, max 12.54 ms
   median 6.22 ms, p95 6.68 ms, max 12.22 ms
   ```

   Median about 6 ms per call, far under the 100 ms limit, so regeneration on each event stays.

5. `node ai-framework/scripts/workflow-doctor.js --no-color`

   ```
   Workflow status: READY
   ```

   Exit 0. The doctor does not yet list `token-report.js` (S4 adds it).

## Renderer behavior checked by tests

- "Usage" section sits right after the intro paragraph; names most used vendor and model, the ranking basis, the vendors that report no tokens, and the unit per vendor.
- Missing tokens are never zero: a vendor with 1 reported token outranks one with 500 completions and no tokens. With no reported tokens anywhere, the ranking is by completions and says so.
- "Unreported", "Unpriced" and "Other (overflow)" wording; "No data yet" for empty input; "Not yet counted" for a null `since`.
- A `<script>` name is escaped in every HTML position; a `|` or newline in a name adds no Markdown column or row.
- A blank v2 snapshot, a snapshot with no `dimensions`, and a `__proto__` vendor render without throwing.
- End to end: `recordEvent` writes `.md` and `.html` containing "Most used" and every table heading.

## Deviations from the plan

- Vendor totals in the headline come from the model rows (so tokens and completions share the `dimensions.since` window); with no model rows they fall back to `lifetime.vendors`, which has no token totals, so that ranking is by completions and the basis sentence says so.
- Added a small "By Vendor Unit" table (vendor and completions unit) rather than changing the existing "By Vendor" header, which stays verbatim.
