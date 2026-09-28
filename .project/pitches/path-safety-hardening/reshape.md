# Re-shape addendum — 2026-09-26

The original pitch and implemented partial work remain intact. The original no-go on platform-specific descriptor APIs prevents the promised final-race closure under its existing appetite.

## Proposed next step

Bet native-safety-feasibility first. Prove directory-relative mutation behavior against ancestor replacement and movement in scratch fixtures before selecting a production helper. API availability alone is insufficient: an open directory descriptor can still identify a directory that was moved elsewhere.

## Pending contract decisions

- Required platforms and helper runtime availability.
- Exact root/ancestry threat model and behavior when directories are renamed during an operation.
- Fail-closed capability detection, transaction/recovery compatibility, bounded helper protocol.

S1 remains downhill 75%. No full-race closure or new implementation approval is implied by this addendum. Existing code is stable for independent re-review.
