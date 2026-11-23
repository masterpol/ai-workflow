# State report

`/state` answers "what is this project and where does it stand?" with a page every reader can check.
It is derived, non-authoritative output: `.project/status.md` and `.project/runs/` remain the lifecycle
authorities, and a stale or wrong report is fixed by regenerating it, never by editing it.

Since pitch `archify-replaces-state` the page is rendered by the [Archify](https://github.com/tt-a1i/archify)
skill. This bundle owns only the fact collector, `ai-framework/scripts/facts-gather.mts`.

## Run it

```sh
node ai-framework/scripts/facts-gather.mts                                  # preview: counts by status, writes nothing
node ai-framework/scripts/facts-gather.mts --json                           # full facts on stdout
node ai-framework/scripts/facts-gather.mts --explainer state.explainer.json # write the Archify draft
```

Then, with Archify installed at the pinned revision (below):

```sh
ARCHIFY_UPDATE_CHECK_DISABLED=1 node .project/skills/packages/tt-a1i/archify/archify/bin/archify.mjs validate explainer .project/reports/state.explainer.json --json
ARCHIFY_UPDATE_CHECK_DISABLED=1 node .project/skills/packages/tt-a1i/archify/archify/bin/archify.mjs deliver explainer .project/reports/state.explainer.json .project/reports/state.html --json
```

`--root <dir>` targets another project; `--now <ISO time>` fixes the stamp. Generated files in
`.project/reports/` are git-ignored. `--explainer` takes a plain file name ending in `.explainer.json` and
writes only inside `.project/reports/`, creating `.project` and `reports` only after checking that any existing one is a plain directory (never a link).

## Pinned Archify

| Field | Value |
|---|---|
| Repository | `https://github.com/tt-a1i/archify.git` |
| Release | v3.3.0 |
| Pinned commit | `af3aaf3c36762f2afb62a4a09533f6c7273b07e5` |
| Skill path | `archify/SKILL.md` |
| Licence | Apache-2.0 (earlier releases MIT) |
| Size | 596 files, 22.5 MiB of `add-skill`'s 25 MiB cap, so a new upstream release can stop installing |

Archify is **instance data**, like caveman: installed per checkout, git-ignored, never shipped by
bundle-sync. A fresh clone does not have it, and `/state` then stops after the facts preview and prints this
install command. Do not float the revision or update at report time.

```sh
node ai-framework/scripts/add-skill.mts install tt-a1i/archify/archify \
  --ref af3aaf3c36762f2afb62a4a09533f6c7273b07e5 --path archify/SKILL.md \
  --scope project --phases manual --apply
```

`add-skill` gives each git step 60 seconds, and the upstream history is about 1.9 GB. On a slow link make a
local mirror first and point the install at it without changing the recorded source:
`git clone <url> /path/mirror`, then run the install with
`GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=url./path/mirror.insteadOf GIT_CONFIG_VALUE_0=https://github.com/tt-a1i/archify.git`.

### How it is run here

- `ARCHIFY_UPDATE_CHECK_DISABLED=1` always: the only default network call Archify makes is a daily update check.
- Only `validate` and `deliver` for `explainer`. Not `preview`, `start`, `code-analysis`, `pr`, `story`, `finalize`
  (`finalize` is fine for an owner who wants a receipt; the playbook does not use it).
- Archify's own `SKILL.md` defaults to making explainer pages unasked (`proactive`) and tells the agent to edit
  a global rules file. Neither applies to `/state`; the playbook says so, and the wrapper is `manual`-phase only.
- Archify rejects instead of sanitizing: raw HTML and `javascript:` links fail `validate`. A failing `validate`
  is a failed `/state`.

## Facts contract (`schemaVersion: 1`)

Every leaf is a fact: `{ value, status, evidence: [project-relative paths], note? }`.

| Status | Meaning |
|---|---|
| `observed` | Read directly from a cited file. |
| `proposed` | The source states a direction or proposal, not a decision. (Reserved: no current section produces it.) |
| `unconfigured` | Nothing exists for it yet (for example no skills installed). |
| `stale` | Observed, but weaker than it looks: a bare `VERSION` that sync never updates, or a source cut at the 64 KB read limit. The `note` says why. |
| `unavailable` | Could not be read. The `note` always says why; nothing is guessed. |

Sections: `workflow.installedVersion`, `pitches.active`, `pitches.shippedListed`, `knowledge`, `skills`.
A section that cannot be built is `unavailable` on its own; the others still report.

### What was dropped from the old report

The old snapshot (`state-snapshot`, `state-render`, fragment checking) is replaced, not ported. Gone, by decision:
the `project`, `database`, `doneWork`, `runs`, `metrics` and `tokens` sections; the folder-structure diagram and
project-type guess; theme extraction from the project's CSS; the AI-analysis fragments and their
evidence/number-binding checks. Token and time figures come from the token report, not `/state`. What stays:
status labels, evidence paths, bounded reads, secret redaction and symlink refusal.

## What it reads, and what it never does

Reads a fixed allowlist: `.project/status.md` (the "Active pitches" and "Recent ships" tables),
`.project/.bundle-sync.json`, `VERSION`, `graphify-out/graph.json` and `.project/skills/registry.json`.
Every path segment is checked with `lstat`, so a symlink at any level (not only the file) is refused, as is any path that
resolves outside the project. Reads are size-bounded (1 MiB, 64 MiB for the graph, 64 KB of markdown scanned). Lists are
capped at 100 rows and 20 knowledge types (the rest count under `other`); a capped or truncated fact is `stale` with a note,
its true count is still reported, and the page says "at least". An unavailable fact never prints a number.

Never reads `.env*`, `credentials.json`, `settings.local.json` or session transcripts, never opens a database or
network connection, never runs a script the analyzed project supplies, and starts no child process. Every
captured string is cut to 200 characters, normalised, scrubbed of credential-shaped text (replaced with
`(redacted)`) and stripped of characters Archify would parse (`< > ` * [ ] | { } \ ~ _ # !` become inert
look-alikes), so a pitch named `<script>` or `[x](javascript:…)` arrives as plain text.

Counts in the page come from the collector. Any analysis a model adds is chat-only, labelled
"proposed, not observed", and never enters the draft.

## Failure modes

| Symptom | Meaning | Action |
|---|---|---|
| Preview prints `unavailable` facts | A source is missing or unreadable; the note says which | Fix the source or accept the gap |
| Archify missing or at another revision | `/state` stops after the facts preview | Run the install command above |
| `validate` fails | The draft held something Archify rejects | Report the diagnostic; never edit the draft by hand |
| `--explainer` refuses | Bad file name, symlinked destination, or `.project/reports` resolving outside the project | Use a plain name; remove the link |
| `add-skill` says `Unsafe relative path` | Fixed in `skill-source.mts` (inline code spans are no longer read as links); a different skill may still trip it | Inspect the named path |

## Related

- `.project/knowledge/decisions/project-state-report-design.md` — the superseded design and its safety lessons, which
  this collector keeps (bounded reads, symlink refusal, redaction, never run project code).
- `.project/analysis/2026-11-23-archify-v3.3.0-validation.md` — the validation of Archify v3.3.0 this contract rests on.
