# Deviations: project-state-report

## T1
- **Doctor script list gained three entries, not one.** `pitch-compress.js` and `pitch-archive.js`
  were missing from the doctor's required-script list already; `state-snapshot.js` requires
  `pitch-compress.js` at load time, so the list now covers all three. Small, in-scope hygiene.
- **`state-snapshot.js` reuses `pitch-compress.inventory`** rather than re-implementing pitch
  classification, so shipped/active/compacted can never disagree between `/state` and
  `/pitch-compress`.
- **VERSION/CHANGELOG not touched yet** — deferred to commit time via the changelog script, as planned.

## T2
- **Theme fallback is per group, not per single pair.** The plan said "per-pair fallback"; pairs share
  tokens (`mutedForeground` sits on both `muted` and `background`), so replacing one token could not be
  done independently. Groups are `text`, `accent`, `subdued`; if the assembled mode still fails, the
  whole mode falls back. Both levels are tested.
- **`theme.json` is a record only.** The plan said an unchanged hash set is "reused"; reusing a file a
  user can hand-edit would make it an injection path, so the theme is always recomputed and the record
  is compared only to report `changed:`. Cost: a stylesheet scan per run (bounded).
- **`state-render.js` reads `state.json` from disk** (run the snapshot first) instead of collecting
  again, so the renderer's untrusted-input path is the one users actually hit.
- **Quoted font names are rejected** (reject, don't sanitize): `'Inter', sans-serif` falls back rather than
  being partially trusted. Real projects using quoted families or `var(--font-x)` get the fallback font.
  This is the most likely user-visible cost of the plan's strict grammar.
- **VERSION/CHANGELOG still not touched** — bumped at commit time via the changelog script.
