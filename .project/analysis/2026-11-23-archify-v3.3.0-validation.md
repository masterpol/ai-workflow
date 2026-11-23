# S1 findings: validating Archify v3.3.0

Run 2026-11-23, all execution in a scratch directory outside the repo (clone, `HOME` redirected to an empty
directory, `ARCHIFY_UPDATE_CHECK_DISABLED=1`, Node v24.21.0). Nothing in the repo was changed by this scope except this file.

**Verdict**: KEEP (conditional — see Verdict section; S2 needs four prerequisites and the user must accept the fit loss)

## Pinned version+commit

- Tag `v3.3.0` → `af3aaf3c36762f2afb62a4a09533f6c7273b07e5` (`git rev-parse HEAD` after `git checkout v3.3.0`).
- `main` was `3ca198d867ce4b616332f846ff66e5c8e5e60f95`, 6 commits ahead of the tag. Pin the tag commit, never `main`.
- `archify/skill-release.json`: version 3.3.0, channel stable. Its `updateManifestUrl` is
  `https://tt-a1i.github.io/archify/skill-updates/archify/stable.json`.
- Skill root inside the repo is `archify/` (`archify/SKILL.md`), not the repository root.
- Full clone is 1.9 GB (`.git` 1.8 GB); `add-skill` clones with `--no-checkout`, so a pinned install still downloads the history.

## Install path

`bun ai-framework/scripts/add-skill.mts inspect tt-a1i/archify/archify --repo <local clone> --ref af3aaf3c… --path archify/SKILL.md --root .`
(preview only, no `--apply`) **fails**:

```
add-skill: Unsafe relative path: "/abs/path/checkout-timing.html"
```

Cause: `validateLinks` in `ai-framework/scripts/skill-source.mts` strips fenced code blocks but not inline code. `archify/SKILL.md`
line 158 holds the example ``Created [Checkout request timing](/abs/path/checkout-timing.html)`` inside backticks, which the
validator reads as a real relative link. With inline code excluded, all 21 real links resolve (0 bad; 3 bad as-is — measured with a
scratch script, not the product code). No repo changes resulted from the failed inspect (`git status --porcelain` identical before and after).

Other `add-skill` limits against this package: 596 files (limit 1000, ok); **23,619,501 bytes = 22.53 MiB against a 25 MiB cap**
(10 MB is the vendored `modules/code-analysis/vendor/typescript.cjs`); no symlinks or submodules found; repo-root `LICENSE` is Apache-2.0
and would be captured as the licence. **Correction (S2):** installed skills are one package copy under `.project/skills/packages/` plus a ~700-byte wrapper per vendor, all git-ignored instance data, so the footprint is ~24 MB once per checkout, not ×4.
Whether upstream's next release crosses 25 MiB is unknown; the margin is 10%.

## Offline behaviour

- `archify doctor` exit 0 (all renderer/schema/runtime checks `[ok]`, "Archify is ready."), 0.04 s.
- `archify demo <dir>` exit 0, wrote one self-contained `archify-demo.html` (936,875 bytes).
- Explainer delivered from `examples/delivery.explainer.json`: exit 0, 176,978-byte single HTML file.
- With `HOME` redirected and the update check disabled, **no files were written outside the output directory** (`find $HOME -type f` empty).
- Only Node is needed (`engines: node >=18`); the CLI was run with `node`, not `bun` — Bun compatibility is untested.

## Network calls

- The only default outbound call found in source is the stale-release check (`bin/delivery-update.mjs`, `scripts/check-update.mjs`):
  a bounded GET (1 s timeout, 32 KB cap, 24 h cache) of the manifest URL above. `ARCHIFY_UPDATE_CHECK_DISABLED=1` turns it off
  (`delivery-update.mjs:52`, `check-update.mjs:55`); `finalize` forces it off for its `deliver` stage.
- Other `fetch`/`http` users: `bin/preview.mjs` and `modules/code-analysis/bin/serve.mjs` (local servers) and
  `modules/code-analysis/lib/pull-request.mjs` (PR import from GitHub). None runs in the explainer/diagram path.
- Not tested: the enabled update check in a live run (it would make a network call and write cache state), the local servers, browser-check.
- The generated explainer HTML references external URLs only as licence/doc links and user-supplied source links (redis.io links came
  from the example's own `source:` entries); it embeds `<script type="application/json">` data blocks plus two inline `<script>` reader blocks.

## Safety over untrusted input

Three hostile explainer drafts built from the shipped example (`validate` / `deliver`):

| Payload | Result |
|---|---|
| `<script>…</script>` in title, `<img onerror=…>` in summary, `</script><script>` in a step | **Rejected**: `explainer/inline-html` "Raw HTML is not part of the explainer inline language" (exit 1; no file written) |
| `[x](javascript:alert(1))` link | **Rejected**: `explainer/inline-target` (exit 1; no file written) |
| `x" onmouseover="window.PWNED_ATTR=1` in step text, `5 > 3 &amp; …` in summary | **Delivered, escaped**: `onmouseover=&quot;…` in HTML text; 0 live handler attributes |

Archify rejects instead of sanitizing, the same stance as `parse-untrusted-values-and-re-emit-them`. So facts gathered from the repo
(pitch titles, knowledge text) must be emitted as plain text/markdown and a failing `validate` must surface as a failed `/state`, not be
worked around. Not tested: very large inputs, `source:` links to files outside the repo root, the `--repo-root` evidence option with symlinks.

## Fit against /state

- Archify has **no equivalent** of `state.json` facts, status labels (observed/proposed/stale/unavailable/unconfigured), evidence-path
  citation checks, number binding, pitches/knowledge/metrics/skills pages, or theme extraction. The fact-gathering script in S2 is
  net-new code and the checks listed above are lost unless re-created.
- `archify/SKILL.md` is 25,479 bytes; its explainer mode is **`proactive` by default** — it tells the agent to make a page unasked for
  "a complex flow, diagnosis, comparison or test report". Installed globally it conflicts with this repo's default brevity style and
  adds ~25 KB to every session that loads it. It also tells the agent to write an `[archify explainer: …]` line into a global rules
  file when asked. S2 must set `[archify explainer: on-demand]` in our invocation and not pass a rules-file instruction to the agent.
- Closest direct replacement for the old `structure.html`: Code Analysis (`archify code-analysis prepare <repo> --out <dir>`);
  not run here (needs a language toolchain choice and was out of S1's scope).

## Verdict

**KEEP, conditional.** Technically sound: validates and renders offline, rejects hostile input, update check is switchable, licence is
Apache-2.0. It does not replace `/state`'s facts; it can only replace the rendering. Four prerequisites for S2 (added to plan risks):

1. Fix `validateLinks` to ignore inline code spans, with a test (our bug; blocks any skill that shows an example link in backticks).
2. Accept the install footprint: 22.5 MiB of a 25 MiB cap, repeated per vendor, 1.9 GB clone to fetch. Decide whether to vendor a
   trimmed `archify/` (no `modules/code-analysis/vendor` if Code Analysis is not used) — that departs from the plan's no-gos
   ("no vendoring or forking") and needs the user's decision.
3. Run Archify with `ARCHIFY_UPDATE_CHECK_DISABLED=1` and `[archify explainer: on-demand]`, and make `/state` print install instructions when absent.
4. Accept the loss of the facts/evidence/number-binding checks and the metrics/pitches/knowledge pages unless rebuilt as Archify explainer panels.

If prerequisite 2 or 4 is unacceptable, the verdict is STOP and the keep-both hybrid from the original shape question applies.
