# OpenCode + Orca Handoff

> Context for agents picking up this project. Captures the current OpenCode integration state, Orca multi-agent configuration, known blockers, and the exact commands to verify it.
> **Last updated: 2026-10-08 after critique findings.**

## What this is

This checkout is the `ai-workflow-portable` bundle itself. It defines a portable AI development workflow that runs inside Claude Code, OpenCode, Codex, and Cursor. One optional layer is **Orca multi-agent orchestration**: when `AI_WORKFLOW_ORCA_MULTI_AGENT=true`, a coordinator vendor can dispatch read-only or scoped work to alternate vendors.

OpenCode is configured as both a **worker** (used by Claude/Codex coordinators) and a **coordinator** (can dispatch to Claude/Codex). Live proof for OpenCode is **unverified**.

## Configuration

Orca membership is defined in `ai-framework/integrations/orca-vendors.json`:

```json
{
  "coordinators": {
    "claude": { "workers": ["codex", "opencode"], ... },
    "codex": { "workers": ["claude", "opencode"], ... },
    "opencode": { "workers": ["claude", "codex"], ... }
  }
}
```

OpenCode's coordinator role is `normal` (no special routing). Its workers are Claude for implementation and Codex for review.

## Current adapter state

**Correction:** the adapter directories are present and tracked, not missing.

| Surface | Count | Status |
|---|---|---|
| `.opencode/commands/*.md` | 28 (+ `caveman` is registry-managed under `.opencode/skills/caveman/`) | present and passing doctor |
| `.opencode/agents/*.md` | 16 | present and passing doctor |
| `.codex/agents/*.toml` | 16 | present and passing doctor |
| `.agents/skills/*/SKILL.md` | 29 | present and passing doctor |
| `.opencode/opencode.json` | 1 | present and passing doctor |
| `.opencode/plugins/token-consumption.ts` | 1 | present and passing doctor |
| `.opencode/package.json` | 1 | present as local instance data (git-ignored) |
| `.codex/config.toml` | 1 | present and passing doctor |
| `.codex/hooks.json` | 1 | present and passing doctor |

`caveman` is intentionally excluded from the generated command tree because it is a registry-managed external skill (see `.project/knowledge/issues/installed-skill-wrappers-ship-as-orphans.md`).

## Validator status

On this machine (2026-10-08):

```bash
node ai-framework/scripts/workflow-doctor.mts --json
node ai-framework/scripts/setup-validator.mts --json
```

Both exit 0. `workflow-doctor` reports 770–772 checks with the vendor-adapter checks passing. The only warnings are unrelated (test-runtime boundary, `AI_WORKFLOW_RUNNER` env handling).

## Orca runtime probe

Orca CLI is installed:

```text
$ which orca
/Applications/Orca.app/Contents/Resources/bin/orca

$ orca --version
1.4.222
```

`1.4.222` matches `SUPPORTED_VERSION` in `ai-framework/scripts/orca-preflight.mts`.

Probe from the project root:

```bash
node ai-framework/scripts/orca-run.mts status --root . --vendor opencode --probe
```

Result:

- `enabled: true` (the switch is on)
- `eligible: true`
- `reason: caller-unverified`
- `workers.claude: present`
- `workers.codex: present`

## What `caller-unverified` means

`caller-unverified` is a **version-proven** reason (`orca-launch-gate.mts:VERSION_PROVEN_REASONS`), so the launch gate allows a dispatch. However, the preflight probe could not confirm that the current process is a live Orca caller:

- `status --json` returned a live `caller.orcaSessionId`, but
- the local env lacks `ORCA_AGENT_SESSION_ID`, or
- the local `ORCA_AGENT_SESSION_ID` does not match Orca's session id.

In other words: Orca is installed, reachable, and the right version, but **this OpenCode session is not running inside an Orca-managed terminal/agent session**. A worker launched from here would start, but it would not inherit a trusted Orca caller context.

## Known blockers

1. **No live Orca session context.** `caller-unverified` means real cross-vendor dispatches from this OpenCode session are unproven.
2. **Active Codex parity pitch is blocked at live dispatch.** `.project/pitches/codex-orca-coordinator-parity/pitch.md` attempted critique dispatches with `coordinator: codex` and each returned `launch-failed:unproven`. No retry, release, or fallback was performed. This suggests worker launches can fail even when policy says they are allowed; the OpenCode path has no equivalent trial yet.
3. **OpenCode plugin untested live.** `harnesses.md` notes the `token-consumption.ts` plugin field mapping was written against type stubs and is unverified in a live session.
4. **Adapter drift prevention is manual.** Unlike Cursor mirrors (`skill-vendors.mts cursor-mirrors`), OpenCode/Codex pointer stubs have no in-repo generator; adding a new canonical skill/agent requires hand-editing three mirror trees.

## How to verify

1. Confirm the switch:

   ```bash
   node ai-framework/scripts/orca-run.mts status --root . --vendor opencode --probe
   ```

2. Confirm all vendors on PATH:

   ```bash
   which orca claude codex opencode
   ```

3. Confirm validators pass:

   ```bash
   node ai-framework/scripts/workflow-doctor.mts --json
   node ai-framework/scripts/setup-validator.mts --json
   ```

4. If inside an Orca-managed terminal, check the session:

   ```bash
   env | grep ORCA_AGENT_SESSION_ID
   orca status --json | jq '.result.caller'
   ```

5. Test a start decision from OpenCode:

   ```bash
   node ai-framework/scripts/orca-run.mts start --root . --phase shape --vendor opencode
   ```

   A `ready` outcome means policy + runtime preflight pass. A `blocked` outcome records the exact reason in the output.

6. Test dispatch only after `start` returns `ready` and you are inside an Orca-managed session:

   ```bash
   # build a dispatch payload first; see ai-framework/integrations/orca-vendors.md
   node ai-framework/scripts/orca-run.mts dispatch --root . --input <payload.json>
   ```

## Next steps to make Orca work from OpenCode

- **Wait for `codex-orca-coordinator-parity` to ship.** It is currently `done | build complete; awaiting audit gate`. Its audit findings and live smoke results will tell us whether the `launch-failed:unproven` blocker is in Orca core, the host environment, or the coordinator setup. OpenCode-specific work should start only after that signal.
- Run the verification commands above **inside an Orca-managed OpenCode session** and record the exact results.
- If dispatch still returns `launch-failed:*`, inspect the ledger under `.project/metrics/orca-ledger/` and the worker stdout/stderr in the output.
- If the only blocker is `caller-unverified`, the fix is environmental (run inside an Orca terminal), not code.
- Consider a small follow-up pitch to add `opencode-mirrors`/`codex-mirrors` generators to `skill-vendors.mts` for drift prevention; this does not unblock live Orca but removes a maintenance gap.
- Once live proof exists, update this handoff with the passing commands and remove the blocker lines.

## Related files

- `ai-framework/integrations/orca-vendors.json` — membership/policy
- `ai-framework/integrations/harnesses.md` — OpenCode adapter notes and unverified items
- `ai-framework/integrations/orca-vendors.md` — dispatch/reconcile contract
- `ai-framework/scripts/orca-preflight.mts` — probe logic
- `ai-framework/scripts/orca-launch-gate.mts` — launch authority
- `.project/pitches/codex-orca-coordinator-parity/pitch.md` — parallel Codex parity work
