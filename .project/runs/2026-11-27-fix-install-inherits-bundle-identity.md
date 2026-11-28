# fix-install-inherits-bundle-identity run

Closed 2026-11-27 in bundle v2.59.3. See [the ship record](../pitches/fix-install-inherits-bundle-identity/SHIPPED.md), [the log](../pitches/fix-install-inherits-bundle-identity/log.md) and [the audit](../pitches/fix-install-inherits-bundle-identity/audit.md).

- Orca Run `run_845fcbdbc50d`. Reviewers ran one at a time because three older ledger records still counted against the four-worker cap.
- The first two review cycles set no model on any dispatch; rounds 3 and 4 did.
- The owner chose Revise at the audit gate ("fix all errors prior to ship"), then approved shipping with older shared-helper items deferred.
- Final verifier: exit 0, 2,474 tests, 2,471 pass, three skips, zero failures.
