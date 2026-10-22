import { runDirect } from "../../scripts/runtime/cli.mts";
import { createNodeDeps } from "../../scripts/runtime/node.mts";
import { recordWorkflowEvent } from "../../scripts/workflow-metrics-state.mts";
import { resolvePhaseContext } from "./token-consumption.mts";

import type { RuntimeDeps } from "../../scripts/runtime/types.mts";
import type { PhaseContext } from "./token-consumption.mts";

type Vendor = "claude" | "opencode";
type Outcome = "completed" | "failed" | "cancelled";
type AgentKind = "primary" | "subagent" | "unknown";
type Hash = (value: string) => string;
export type CaptureResolver = (name: unknown, args: unknown) => PhaseContext | null;
type Activity =
  | { kind: "session.started" }
  | { kind: "agent.started"; activityId: string; agentKind: AgentKind }
  | { kind: "agent.finished"; activityId: string; agentKind: AgentKind; outcome: Outcome }
  | ({ kind: "phase.started"; activityId: string } & PhaseContext)
  | { kind: "phase.finished"; activityId: string; outcome: "cancelled" };
interface Origin { vendor: Vendor; source: "native"; sessionId: string; occurredAt: string; eventId: string }
export type CaptureEvent = Origin & Activity;
interface Firing { vendor: Vendor; name: string; session: string; at: string; hash: Hash }
type Payload = Record<string, unknown>;
const object = (value: unknown): value is Payload => value !== null && typeof value === "object" && !Array.isArray(value);
// Prefixes leave headroom under the state's 128-character activity identifier cap.
const identifier = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 96 && !/[^A-Za-z0-9_-]/.test(value);
const boundedText = (value: unknown, max: number): value is string => typeof value === "string" && value.length > 0 && value.length <= max;
const exact = (value: string, pattern: RegExp): boolean => pattern.exec(value)?.[0] === value;
const hasAgent = (payload: Payload): boolean => Object.hasOwn(payload, "agent_id");
function firing(vendor: Vendor, name: string, session: unknown, now: number, hash: Hash): Firing | null {
  if (!identifier(session) || !Number.isSafeInteger(now) || now < 0 || now > 8_640_000_000_000_000) return null;
  const at = new Date(now).toISOString();
  return at.length === 24 ? { vendor, name, session, at, hash } : null;
}
function emit(origin: Firing, activity: Activity): CaptureEvent {
  return { vendor: origin.vendor, source: "native", sessionId: origin.session, occurredAt: origin.at,
    eventId: origin.hash(JSON.stringify([origin.vendor, origin.name, origin.session, origin.at, activity])), ...activity };
}
function phase(origin: Firing, name: unknown, args: unknown, resolve: CaptureResolver): CaptureEvent[] {
  if (!boundedText(name, 80) || args !== undefined && (typeof args !== "string" || args.length > 64 * 1024)) return [];
  const context = resolve(name, args);
  if (!context || typeof context.pitch !== "string" || !exact(context.pitch, /^(?:[a-z0-9][a-z0-9-]{0,79}|\(unattributed\))$/) ||
    typeof context.phase !== "string" || !exact(context.phase, /^[a-z][a-z-]{0,23}$/) ||
    typeof context.scope !== "string" || !exact(context.scope, /^(?:S\d{1,3}|\(none\))$/)) return [];
  // Select the resolver's three validated labels; extra fields can never become event data.
  return [emit(origin, { kind: "phase.started", activityId: `segment:${origin.session}`,
    pitch: context.pitch, phase: context.phase, scope: context.scope })];
}
function turnId(payload: Payload, origin: Firing): string | null {
  if (Object.hasOwn(payload, "prompt_id") && !identifier(payload.prompt_id)) return null;
  return `turn:${payload.prompt_id ?? origin.session}`;
}
function claudeTurn(payload: Payload, origin: Firing): CaptureEvent[] {
  if (hasAgent(payload)) return [];
  const activityId = turnId(payload, origin);
  if (activityId === null) return [];
  if (origin.name === "UserPromptSubmit") return [emit(origin, { kind: "agent.started", activityId, agentKind: "primary" })];
  if (origin.name === "Stop") {
    if (payload.stop_hook_active !== undefined && payload.stop_hook_active !== false) return [];
    return [emit(origin, { kind: "agent.finished", activityId, agentKind: "primary", outcome: "completed" })];
  }
  return [emit(origin, { kind: "agent.finished", activityId, agentKind: "primary", outcome: "cancelled" }),
    emit(origin, { kind: "phase.finished", activityId: `segment:${origin.session}`, outcome: "cancelled" })];
}
function claudeActivity(payload: Payload, origin: Firing, resolve: CaptureResolver): CaptureEvent[] {
  switch (origin.name) {
    case "SessionStart":
      return !hasAgent(payload) && ["startup", "resume", "clear"].includes(payload.source as string) ? [emit(origin, { kind: "session.started" })] : [];
    case "UserPromptSubmit": case "Stop": case "SessionEnd": return claudeTurn(payload, origin);
    case "SubagentStart":
      return identifier(payload.agent_id) ? [emit(origin, { kind: "agent.started", activityId: payload.agent_id, agentKind: "subagent" })] : [];
    case "SubagentStop":
      return identifier(payload.agent_id) ? [emit(origin, { kind: "agent.finished", activityId: payload.agent_id, agentKind: "subagent", outcome: "completed" })] : [];
    case "UserPromptExpansion":
      return !hasAgent(payload) && payload.expansion_type === "slash_command" ? phase(origin, payload.command_name, payload.command_args, resolve) : [];
    case "PostToolUse": {
      if (hasAgent(payload) || payload.tool_name !== "Skill" || !object(payload.tool_input)) return [];
      return phase(origin, payload.tool_input.skill, payload.tool_input.args, resolve);
    }
    default: return [];
  }
}
/** Pure mapping: only the injected resolver sees invocation arguments; the caller supplies one clock reading. */
export function mapClaudeEvent(payload: unknown, resolve: CaptureResolver, now: number, hash: Hash = createNodeDeps().crypto.sha256Hex): CaptureEvent[] {
  try {
    if (!object(payload) || !boundedText(payload.hook_event_name, 80)) return [];
    const origin = firing("claude", payload.hook_event_name, payload.session_id, now, hash);
    return origin === null ? [] : claudeActivity(payload, origin, resolve);
  } catch {
    // Malformed accessors or a failed resolver are discarded at this observational boundary.
    return [];
  }
}
function openCodeActivity(payload: Payload, resolve: CaptureResolver, now: number, hash: Hash): CaptureEvent[] {
  if (!boundedText(payload.type, 80) || !object(payload.data)) return [];
  const data = payload.data, origin = firing("opencode", payload.type, data.sessionID, now, hash);
  if (origin === null) return [];
  if (payload.type === "tool.execute.after") {
    if (data.tool !== "skill" || !object(data.input)) return [];
    return phase(origin, data.input.name, undefined, resolve);
  }
  if (!identifier(data.assistantMessageID)) return [];
  const activityId = data.assistantMessageID;
  // Steps are intervals, not verified user turns. Unknown kind never opens A1's primary-turn wait gap.
  switch (payload.type) {
    case "session.step.started": return [emit(origin, { kind: "agent.started", activityId, agentKind: "unknown" })];
    case "session.step.ended": return [emit(origin, { kind: "agent.finished", activityId, agentKind: "unknown", outcome: "completed" })];
    case "session.step.failed": return [emit(origin, { kind: "agent.finished", activityId, agentKind: "unknown", outcome: "failed" })];
    default: return [];
  }
}
/** V1 messages and unverified user boundaries emit nothing; V2 step and skill metadata share the Claude contract. */
export function mapOpenCodeEvent(payload: unknown, resolve: CaptureResolver, now: number, hash: Hash = createNodeDeps().crypto.sha256Hex): CaptureEvent[] {
  try {
    return object(payload) ? openCodeActivity(payload, resolve, now, hash) : [];
  } catch {
    return [];
  }
}

const INPUT_BYTES = 64 * 1024;
const BUDGET_MS = 3000;
const LEASE_BUSY = "metrics lease unavailable; event not recorded";
export const CAPTURE_MESSAGES = {
  input: "[workflow-capture] input rejected\n",
  arguments: "[workflow-capture] arguments rejected\n",
  busy: "[workflow-capture] lease busy\n",
  deadline: "[workflow-capture] deadline reached\n",
  unavailable: "[workflow-capture] capture unavailable\n",
} as const;
type Notice = keyof typeof CAPTURE_MESSAGES;
interface Timing { started: number; occurredAt: number }
function diagnostic(deps: RuntimeDeps, notice: Notice): void {
  try { deps.io.stderr.write(CAPTURE_MESSAGES[notice]); }
  catch { /* A closed diagnostic stream cannot interrupt the host or reveal the original error. */ }
}
async function writeEvent(event: CaptureEvent, root: string, deps: RuntimeDeps, started: number): Promise<"recorded" | "busy" | "deadline" | "unavailable"> {
  for (let attempt = 0; attempt < 2; attempt++) {
    // Never schedule a timer that could interrupt an acquired lease or an atomic write.
    if (deps.clock.monotonicMs() - started >= BUDGET_MS) return "deadline";
    const result = await recordWorkflowEvent(event, root, deps);
    if (result.written || result.reason === "duplicate event") return "recorded";
    if (result.reason !== LEASE_BUSY) return "unavailable";
  }
  return "busy";
}
async function capture(vendor: Vendor, payload: unknown, root: string, deps: RuntimeDeps, timing: Timing): Promise<void> {
  const resolve: CaptureResolver = (name, args) => resolvePhaseContext(name, args, root, deps);
  const map = vendor === "claude" ? mapClaudeEvent : mapOpenCodeEvent;
  const events = map(payload, resolve, timing.occurredAt, deps.crypto.sha256Hex);
  let notice: Notice | undefined;
  for (const event of events) {
    const result = await writeEvent(event, root, deps, timing.started);
    if (result !== "recorded") notice ??= result;
    if (result === "deadline") break;
  }
  if (notice !== undefined) diagnostic(deps, notice);
}
/** In-process vendor entry; writes happen after mapping and never inside another collector's lease. */
export async function captureWorkflowEvent(vendor: Vendor, payload: unknown, root: string, deps: RuntimeDeps = createNodeDeps()): Promise<void> {
  try {
    await capture(vendor, payload, root, deps, { started: deps.clock.monotonicMs(), occurredAt: deps.clock.now() });
  } catch { diagnostic(deps, "unavailable"); }
}
function argumentsOf(argv: string[]): { root?: string } | null {
  let root: string | undefined, vendor: string | undefined;
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i], value = argv[i + 1];
    if (!value || value.startsWith("--")) return null;
    if (flag === "--root" && root === undefined) root = value;
    else if (flag === "--vendor" && vendor === undefined) vendor = value;
    else return null;
  }
  return vendor === "claude" ? { root } : null;
}
/** Observational CLI: bounded input, no stdout and only fixed diagnostics, including on malformed host input. */
export async function main(argv: string[], deps: RuntimeDeps): Promise<number> {
  try {
    const timing = { started: deps.clock.monotonicMs(), occurredAt: deps.clock.now() };
    const args = argumentsOf(argv);
    if (args === null) { diagnostic(deps, "arguments"); return 0; }
    let payload: unknown;
    try {
      const text = await deps.io.stdin.readText(INPUT_BYTES);
      if (new TextEncoder().encode(text).length > INPUT_BYTES) { diagnostic(deps, "input"); return 0; }
      payload = JSON.parse(text);
    } catch { diagnostic(deps, "input"); return 0; }
    await capture("claude", payload, args.root ?? deps.proc.cwd(), deps, timing);
  } catch { diagnostic(deps, "unavailable"); }
  return 0;
}

runDirect(import.meta.url, main);
