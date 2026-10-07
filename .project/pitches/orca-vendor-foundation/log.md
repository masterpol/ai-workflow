# Build log: orca-vendor-foundation

## S1 — Test review

Symptom: the descriptor-identity test mocked a native `Stats` object with object spread, dropping its prototype methods.
Root cause: the guarded reader could report refusal due to that malformed mock instead of the intended identity mismatch.
Fix: preserve the native `Stats` prototype while changing its inode; add post-open path replacement and opened-size checks with explicit zero-read assertions. Security mutation checks follow this correction.

## S2 — Boundary and evidence review

Corrected a submillisecond remaining-time boundary: flooring a positive fraction to zero could disable the process timeout. Refuse calls with less than one millisecond remaining; the new behavior assertion detects removing this guard.

The first mutation scratch layout lacked the example fixture, causing unrelated failures. Discarded those results, copied the full relative fixture layout, required a passing unmodified baseline, and reran all fifteen mutations before recording evidence.
