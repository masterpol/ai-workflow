# Source-review supplement: opencode-handoff

Prepared 2026-10-22 from the verified original recovery source. This supplements the unchanged [handoff](../../context/opencode-handoff.md). The original SHIPPED record is dated 2026-10-08; the legacy shipped index says 2026-10-09. The outcome keeps the index date without resolving that historical discrepancy.

## Scope and evidence limits

The handoff captured this checkout's OpenCode adapter state, Orca coordinator and worker configuration, known blockers and verification commands. It was project-local context for the next agent. It implemented no fixes and created no reusable knowledge entry. The original scope excluded changes to Orca core logic, the launch gate and reconciliation. Live coordinator or worker failures belonged to later verification and a separate fix pitch; implementation remained separate from Codex coordinator parity.

The initial claim that adapter directories were absent was corrected: .opencode, .codex and .agents/skills were present and tracked. The missing-adapter investigation was a resolved false positive. The retained handoff's historical 1.4.222 probe reported eligible and caller-unverified; this did not establish successful live OpenCode dispatch. Its original line-count and status checks were acceptance evidence only. The reconciliation table and size budget add no further shipped behavior.

Consult the [current Orca contract](../../../ai-framework/integrations/orca-vendors.md) for runtime requirements, coordinator preparation, Run binding and observed vendor coverage. The old handoff's environment interpretation and verification sequence are historical context, not current launch authority.
