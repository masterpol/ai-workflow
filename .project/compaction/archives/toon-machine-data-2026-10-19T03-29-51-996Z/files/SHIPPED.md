# Shipped: toon-machine-data
Bet: 2026-10-18  •  Shipped: 2026-10-19  •  Appetite: big-batch (12 files vs a 15-file cap)  •  Versions: 2.32.0, 2.32.1

## Scopes
| ID | Status | Hill done | Notes |
|----|--------|-----------|-------|
| S0 | shipped | 2026-10-18 | inventory.md, `Decision: NO-GO`: no existing dataset is agent-loaded and eligible |
| S1 | shipped | 2026-10-19 | TOON data grammar 1.0 + parser/encoder (`toon-data.mts`), decision doc; 30 tests |
| S2 | shipped | 2026-10-19 | `data-file.mts` reader/writer (parsed/absent/refused, pair error, race-safe publish); 27 tests; own inspector instead of reusing the config one |
| S3 | shipped | 2026-10-19 | `toon-convert.mts` (dry-run default, round trip proof, honest two-proxy report); 21 tests |
| S4 | shipped | 2026-10-19 | `machine-data-format.md` + one pointer line in `eval-harness.md` |
| S5 | dropped | 2026-10-18 | S0 NO-GO, see deviations.md |
| S6 | shipped | 2026-10-19 | 9 golden cases added (13 total: 8 enforced by named tests, 5 live-only not run); 2.32.0 then 2.32.1 |

## No-gos honored
- ✅ host-native files, `graphify-out/graph.json` and script-only files not converted; nothing in the repository was converted
- ✅ no skill, agent or Cursor copy edited; `instruction-compression.json` and its tests untouched
- ✅ no token-saving claim without a per-file report; proxies are named and "mixed" is reported as mixed
- ⚠️ the rule file and the golden dataset landed while `instruction-compression` was still shipping; no file overlap, shared bookkeeping files merged in order

## Rabbit holes
- ✅ resolved as planned: which files count (inventory), whether TOON always saves (it does not), parser safety (own grammar, linear scan, mutants), refusal vs absence
- ⚠️ surfaced new: check-then-write races in the writer and converter cleanup (fixed in audit), JSON depth vs TOON depth (fixed), the real saving is the skill registry (follow-up)

## Result against the original ask
New agent-loaded data files can be written in TOON, with a rule, a converter and a reader. Existing files were not converted because none qualified. On this repo's datasets TOON beat the pretty-printed file and was mixed against minified JSON.

## Followups generated
- toon-skill-registry (med): the one existing file agents open every phase; 6 readers, 5 tests, `.gitignore` and bundle-sync rules; sequence after the banner rewrite
- wire `eval-runner` and other readers to `readData` so "every reader" becomes true (low)
- converter: detect JSON loss the parser hides (integers beyond 2^53, duplicate keys); refuse hard links; keep file mode on replace (low)
- run the 5 live-only golden cases when an eval harness exists (med)
