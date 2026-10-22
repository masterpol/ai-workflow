> Moved on 2026-10-19 from `.project/pitches/toon-machine-data/inventory.md` when the pitch was compacted (`/pitch-compress`). The pitch's other files are in its recovery archive under `.project/compaction/archives/`; restore with `pitch-archive.mts restore toon-machine-data`.

# Inventory: which workflow-only data files does an agent actually load? (S0)

Date 2026-10-18. Method (plan.md S0): a file counts as agent-loaded only where an agent definition or skill tells an
agent to open it (file:line quoted). A script reading it does not count. Evidence = grep over `.claude/agents` and
`.claude/skills`; reader files from the critique and plan greps. No file was converted.

| File / family | Size | Reader | Agent told to open it? (evidence) | Verdict |
|---|---|---|---|---|
| `.project/evals/datasets/*.json` (future datasets) | — | `eval-runner`, `eval-regression-projector` | **Yes**: `.claude/agents/eval-runner.md:16`, `.claude/agents/eval-regression-projector.md:17` take the golden case files as input | **Convert / TOON by rule** for new datasets |
| `orca-vendor-orchestration.json` | 5.2 KB | `orca-eval-grader.mts` (script) | No: only `ai-framework/integrations/orca-vendors.md:408` (docs); no agent or skill opens it | Keep JSON |
| `instruction-compression.json` | 18.3 KB | `instruction-loading.test.mts` (test) | Agent-readable as a golden case, but hash-pinned by the active `instruction-compression` pitch (X1) | Keep JSON until that pitch ships |
| `toon-machine-data.json` | 3 KB | none yet | Golden case file for `eval-runner` | Keep JSON (K8: the gate must not grade its own instrument) |
| `.project/skills/registry.json` | 3.3 KB | `skill-registry.mts`, `skill-sync.mts`, `add-skill.mts`, `state-snapshot.mts`, `bundle-sync.mts`, `browser-runtime.mts` | **Yes, in every agent and phase**: the caveman banner in each of the 44+ `.claude/agents/*.md` and `SKILL.md` files tells the agent to "check `.project/skills/registry.json`" (e.g. `.claude/agents/skeptic.md:10`); 28 `SKILL.md` mention it | **Follow-up pitch.** Highest real saving, but 6 readers + 5 tests, `.gitignore` and bundle-sync "never synced" rules (A3, S3), and the banner prose belongs to `instruction-compression` |
| `ai-framework/integrations/skill-defaults.json` | 1 KB | `skill-defaults.mts` (static `import ... with {type:"json"}`), `bundle-sync`, `workflow-doctor`, hook | Partly: `.claude/skills/add-skill/SKILL.md:61` points an agent at it | Follow-up. Static JSON import must become a runtime read (A4); too small to matter |
| `ai-framework/integrations/skill-vendors.json` | 0.5 KB | `skill-vendors.mts` | No agent path | Keep JSON |
| `ai-framework/integrations/orca-vendors.example.json` | 0.5 KB | docs example only | No | Keep JSON |
| `.project/compaction/ledgers/*.json` (31 files, 156 KB) | 5 KB each | `pitch-compress.mts`, `pitch-archive.mts` | No: `.claude/skills/pitch-compress/SKILL.md:69` has the **script** write the ledger; nothing tells an agent to read it back | Keep JSON |
| `.project/metrics/*.json` | 3-28 KB | hooks, `workflow-metrics-*.mts`, `state-pages.mts` | No agent path | Keep JSON |
| `graphify-out/graph.json` | 5 MB | `graphify.mts` | No: agents query it through the script (`cooldown`/`resume`/`setup` `SKILL.md`), never open it | Keep JSON |
| `.project/reports/*.json` | small | `state-*.mts` | No | Keep JSON |
| `.claude/settings*.json`, `.codex/hooks.json`, `.opencode/*.json`, `package*.json`, `ai-framework/hooks/hooks.json` | — | the host tool | Host-native (wiring template for a host file) | Keep JSON, out by scope test 3 |

## Result

- Exactly one family qualifies and is safe to convert today: **datasets that `eval-runner` loads**, and no existing
  dataset is eligible (grader-only, hash-pinned, or the pitch's own gate). The conversion therefore applies to datasets
  created from now on.
- The registry is the only existing file agents really open on every phase. It is the real saving and needs its own
  pitch.
- Existing-file conversion in this pitch would save nothing measurable and break the scope test, so it is not done.

Decision: NO-GO

- **S5 is dropped.** S1-S4 and S6 proceed: the data module, shared reader/writer, converter + report, and the rule for
  new files. Plan file count falls from 15 to 12 (S5 removed `orca-vendor-orchestration.toon`, `orca-eval-grader.mts`,
  `orca-eval-grader.test.mts`; `integrations/orca-vendors.md` exception unused).
- **Follow-up pitch to shape later:** `toon-skill-registry` (registry + its 6 readers + 5 tests + ignore rules),
  sequenced after `instruction-compression` ships so the banner and registry reader change together.
- **S3 real-file round trip** uses `orca-vendor-orchestration.json` and the `instruction-compression.json` bytes
  **read-only** as test input; nothing in the repo is converted.
