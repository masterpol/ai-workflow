# Data Modeling Rules

## Lossless projection in replace-style upserts

When a client holds a **projection** of server data and echoes it back via a **replace-style upsert**
(semantics: fields not mentioned are overwritten with `null` / the submitted value), the projection
must be lossless.

### Three safe options (in preference order)

1. **Opaque pass-through field** — include the full original server row in a `serverRaw` or
   `_original` field on the client model; merge it back before submitting. Never reconstruct
   server-side fields from client-side display state.

2. **PATCH semantics** — use a mutation that only writes explicitly provided fields; omitted
   fields are left unchanged. Requires handler + schema support.

3. **Read-only projection** — if the projection is display-only and never sent back to the server,
   there is no round-trip problem.

### Anti-pattern

```ts
// ❌ Lossy: client reconstructs `serverRaw.hiddenField` from display value
const payload = { title: activity.displayTitle, steps: activity.steps };
await upsertActivity(payload); // hiddenField silently nulled out
```

### Why this matters

Silent data loss: if a projection field is reconstructed from display state (e.g., a trimmed
title, steps re-sorted for UI), the server receives a mutated value and overwrites the stored
record. The bug only surfaces when the hidden field is read — often in a different code path
(reports, AI generation) — and is hard to trace to the upsert.

Once you've hit this once, record it in `.project/knowledge/issues/` — it tends to recur across every feature that echoes a projection back through a replace-style upsert.
