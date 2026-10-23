# P2c-S3 batch 2 — applied and verified

The owner approved the exact five-pitch apply preview. All five upgrades completed through the existing compaction transaction and legacy-upgrade CLI. No code changed; VERSION remains 2.47.1.

| Pitch | State | Outcome bytes | One-hop targets | Unchanged archive files |
|---|---|---:|---:|---:|
| opencode-handoff | upgraded | 963 | 3 | 4 |
| orca-vendor-orchestration | upgraded | 1215 | 4 | 8 |
| orca-vendor-dispatch | upgraded | 1077 | 4 | 9 |
| orca-vendor-reconcile | upgraded | 1207 | 5 | 8 |
| ts-runtime-injection | upgraded | 1258 | 6 | 23 |

All five outcome records pass lint. Every declared target is reachable from its outcome heading in one hop (22 targets total); all five native graphify explain commands exit 0. Each archive passed verification and before/after byte-hash equality for all source, manifest and checksum files (52 unchanged files total). All 46 original v1 ledger commitments remain byte-identical to HEAD, either active v1 files or preserved .v1 siblings. Old compact records and historical destinations were not rewritten.

Current counts: 38 legacy, zero partial, eight upgraded. Tier A is 8/19 upgraded; the shared compacted-slug reader counts 46 once. The index has eight rows and 38 legacy narratives. Four historical destination conflicts remain stopped and unaccepted.

## Verification evidence

```text
{"slug":"opencode-handoff","status":"upgraded","archiveDirectory":"opencode-handoff-2026-10-09T14-29-23-592Z","archiveManifestHash":"sha256:067b2e9bb9ba5b2b485d96682b567bbc0d98b27357146358c0d34eebfaa7bd32","unchangedArchiveFiles":4,"v1Hash":"sha256:ccd196d70684ead1a8782dbe821fb1fdfde644c056c81c92d72178a6c9ee5575","outcomeBytes":963,"applyOutput":{"slug":"opencode-handoff","applied":true}}
{"slug":"orca-vendor-orchestration","status":"upgraded","archiveDirectory":"orca-vendor-orchestration-2026-10-08T16-26-37-615Z","archiveManifestHash":"sha256:12ad2ecbbc3f55910b590d65abc4d0a41ca27da6b8bcf286a255787bc4979a9a","unchangedArchiveFiles":8,"v1Hash":"sha256:749f09ef8f3f6671b4a448a7dab15b20de501724b8cfcdbd9484cbeae4aed22e","outcomeBytes":1215,"applyOutput":{"slug":"orca-vendor-orchestration","applied":true}}
{"slug":"orca-vendor-dispatch","status":"upgraded","archiveDirectory":"orca-vendor-dispatch-2026-10-08T16-26-37-156Z","archiveManifestHash":"sha256:fb9d818e38ee22e219325b3b85489168f3bc64636cc4acd35bf8924c0189ca81","unchangedArchiveFiles":9,"v1Hash":"sha256:9c75b457ffe021b322e5713f0e0f775e50094e0e7a4a03bae3f41aecce581ec0","outcomeBytes":1077,"applyOutput":{"slug":"orca-vendor-dispatch","applied":true}}
{"slug":"orca-vendor-reconcile","status":"upgraded","archiveDirectory":"orca-vendor-reconcile-2026-10-08T16-26-37-800Z","archiveManifestHash":"sha256:06aa4e0e05806430fc342fbc7b8b42f1974d13b4f9215c701f145cb23ab35ea7","unchangedArchiveFiles":8,"v1Hash":"sha256:d7660d2ab260fd05d03b646ec427f8bf83ef77889de6a9f916cc6fbda95ae73b","outcomeBytes":1207,"applyOutput":{"slug":"orca-vendor-reconcile","applied":true}}
{"slug":"ts-runtime-injection","status":"upgraded","archiveDirectory":"ts-runtime-injection-2026-10-08T16-26-38-596Z","archiveManifestHash":"sha256:3788b2121d9136951c7c0a52cf52689383a8b936983637f1a5e05f91c41aa71a","unchangedArchiveFiles":23,"v1Hash":"sha256:e258c63d1ce710154472f797202e4f0bb70384ae7999ae4c4d45111ff98bd866","outcomeBytes":1258,"applyOutput":{"slug":"ts-runtime-injection","applied":true}}
{"legacy":38,"partial":0,"upgraded":8}
```

```text
Knowledge graph: 119 entries (16 decisions, 53 patterns, 2 entities, 48 issues), 336 links.

Graph status: CLEAN
Workflow edges: 135 mirrors, 41 reads, 20 dispatches, 8 phase-doc, 190 references, 36 outcome-link
Boilerplate references skipped (named by more than 20 files): .project/skills/registry.json (46), ai-framework/scripts/skill-defaults.mts (45), ai-framework/integrations/harnesses.md (41)
Dry run (check) — no files written.
```

```text
relations: 50 entries, 135 mirrors, 41 reads, 20 dispatches, 8 phase-doc, 0 problem(s)
```

```text
PASS  Knowledge graph: graphify validated 119 entry(ies)
PASS  Workflow doctor: portable workflow contracts passed
PASS  TypeScript entries: 175 TypeScript file(s) parse

Setup status: READY
Generated setup artifacts and portable workflow contracts passed.
Validated 25 checks. Use --json for automation or --no-color for plain text.
```

```text
8 file(s) checked, 0 broken link(s)
```

```json
{
  "pitches": [
    {
      "slug": "opencode-handoff",
      "oneHopTargets": [
        ".project/context/opencode-handoff.md",
        ".project/records/legacy-upgrades/opencode-handoff.md",
        "ai-framework/integrations/orca-vendors.md"
      ],
      "lint": "pass"
    },
    {
      "slug": "orca-vendor-orchestration",
      "oneHopTargets": [
        ".project/knowledge/patterns/a-grader-reports-executed-and-unexecuted-cases-separately.md",
        ".project/records/legacy-upgrades/orca-vendor-orchestration.md",
        ".project/records/pitch-compression/orca-vendor-orchestration.md",
        "ai-framework/integrations/orca-vendors.md"
      ],
      "lint": "pass"
    },
    {
      "slug": "orca-vendor-dispatch",
      "oneHopTargets": [
        ".project/records/legacy-upgrades/orca-vendor-dispatch.md",
        ".project/records/pitch-compression/orca-vendor-dispatch.md",
        "ai-framework/integrations/orca-vendors.md",
        "ai-framework/scripts/orca-dispatch.mts"
      ],
      "lint": "pass"
    },
    {
      "slug": "orca-vendor-reconcile",
      "oneHopTargets": [
        ".project/knowledge/patterns/settle-only-with-proof-bound-to-this-patch.md",
        ".project/records/legacy-upgrades/orca-vendor-reconcile.md",
        ".project/records/pitch-compression/orca-vendor-reconcile.md",
        "ai-framework/integrations/orca-vendors.md",
        "ai-framework/scripts/orca-reconcile.mts"
      ],
      "lint": "pass"
    },
    {
      "slug": "ts-runtime-injection",
      "oneHopTargets": [
        ".project/knowledge/patterns/sync-tools-refuse-symlinks-in-source-and-destination.md",
        ".project/records/legacy-upgrades/ts-runtime-injection.md",
        ".project/records/pitch-compression/ts-runtime-injection.md",
        "ai-framework/docs/versioning-and-sync.md",
        "ai-framework/scripts/runtime/README.md",
        "ai-framework/scripts/runtime/select.mts"
      ],
      "lint": "pass"
    }
  ],
  "preservedOriginalV1Ledgers": 46,
  "compactedCount": 46,
  "indexRows": 8,
  "legacyNarratives": 38,
  "tierAUpgraded": 8
}
```

Data-only apply used the approved shared validators and previously rehearsed exact payloads. No broader test suite was needed for these data changes. The previously recorded 18 state-fragment/dataset failures remain open and unwaived; no ship-ready claim is made.

## Metrics and continuation

The observed S3 activity resumed for apply and paused at the next source gate. Local metrics now has five pauses/four resumes with zero unmatched transitions. Automatic primary Codex token/cost capture remains unavailable; no missing totals or historical timestamps are inferred.

Next five read-only drafts were prepared without archive listing/inspection/reads. Each current v1 ledger and its old destination match the introducing Git commit. Their explicit source-review request is [batch 3](2026-10-22-p2c-s3-batch3-source-request.md). The exact apply evidence is [batch 2 proof](2026-10-22-p2c-s3-batch2-apply-evidence.toon).

After settlement the private batch-2 original-source cache was removed. Original archives, approved payloads, manifest proofs and published supplements remain.
