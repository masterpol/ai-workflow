# Run: state-fragment-sanitizer (2026-10-20)

Big-batch, 8 scopes, shipped as 2.35.0. Orca Run `run_76430abd338c`; S2 and S4 ran on Claude
workers, S3 was implemented by the coordinator after two worker launches were refused by an
interactive shell prompt, S5–S8 ran on Claude workers in the shared checkout with hash-verified
reconciliation. Three audit cycles; the third closed a live depth-guard defect.

Full records: `.project/pitches/state-fragment-sanitizer/` (pitch, plan, spike, log, deviations,
audit-cycle1–3, SHIPPED). Outcome in `SHIPPED.md`.

Key facts: 531 fragment/runtime tests pass (0 fail, 0 skipped, 0 todo); full repository suite
2 190 pass / 0 fail / 3 skipped; 666 production LOC against an 800 cap (parser 266/350,
validator 266/300, evidence 134/150); all 52 planned mutation rows resolved — 51 killed and M51
measured redundant under the approved S1 D10 decision; doctor 752 checks, setup-validator 23
checks, graph 100 entries CLEAN, docs-links 0 broken, changelog 2.35.0.

Incidents: sparse citation arrays (`every` skips holes, `for-of` visits them); Node strip-only
mode rejects constructor parameter properties; two Orca launches refused by an interactive Oh My
Zsh update prompt; a caller-supplied limits `Proxy` bypassed the hard depth-20 guard (audit A7,
fixed by resolving limits once into a validated plain snapshot).

Lessons promoted: `a-caller-supplied-limits-object-can-defeat-a-hard-cap`,
`a-measured-redundant-layer-is-not-a-deleted-layer`,
`a-golden-dataset-case-counts-only-when-a-named-test-passes`,
`a-sparse-array-hole-skips-every-but-visits-for-of`,
`node-strip-only-mode-rejects-constructor-parameter-properties`,
`an-interactive-shell-prompt-can-consume-an-agent-launch-command`.
