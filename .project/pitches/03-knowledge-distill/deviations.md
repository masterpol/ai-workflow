# Deviations: knowledge-distill

- 2026-11-26 (S0): the load method now runs queries with `--budget 60000`; changed before any compact text existed (see `pilot/load-method.md`).
- 2026-11-26 (S0): the planned single checker would see the originals before answering, so it could answer from memory. Split into a question
  writer (originals only) and a separate answerer (compact text only), both fresh; every answer must quote the compact text, and quotes are checked
  by script. The question writer runs first, before any compact text exists.
- 2026-11-26 (S0): source is this repository, author codex, checkers claude: the recommended defaults, taken when the owner approved without
  naming others. Threshold unchanged at 30%.
