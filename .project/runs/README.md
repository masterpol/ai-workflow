# Runs

History archive. Nothing here is loaded by default — search it when you need past context.

## Structure

```
runs/
├── README.md
├── YYYY-MM-DD-{slug}.md        # /ship: the pitch's full log, archived at close
├── YYYY-MM-DD-{slug}-hill.md   # /ship: the pitch's final hill chart
└── cooldown-YYYY-MM-DD.md      # /cooldown: promotion, pruning, and triage report
```

## Who writes here

- **`/ship`** archives a pitch's `log.md` and `hill.md` once it closes, and adds the ship to `status.md` → Recent ships.
- **`/cooldown`** writes its report and counts ships here since the last `cooldown-*.md` to know when it is due.

Live, in-progress state never lives here: it is in `pitches/{slug}/` (pitch, plan, hill, log, deviations, checkpoint) and indexed by `status.md`.
