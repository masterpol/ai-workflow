import { recordEvent } from "../../ai-framework/hooks/scripts/token-consumption.mts";
import { captureWorkflowEvent } from "../../ai-framework/hooks/scripts/workflow-capture.mts";

// --- V1 types (kept for the legacy server() entrypoint) ---
interface V1ToolInput { tool?: unknown; callID?: string; sessionID?: string; args?: { name?: unknown } }
interface V1MessageInfo {
  id?: string; role?: string; sessionID?: string; agent?: string; mode?: string; providerID?: string; modelID?: string;
  variant?: string; error?: unknown; finish?: string; cost?: number; tokens?: unknown; time?: { completed?: unknown };
}
interface V1BusEvent { type?: string; properties?: { info?: V1MessageInfo } }
interface V1PluginContext { directory: string }

// --- V2 types (hand-mirrored so the plugin loads on V2 without a hard dependency on @opencode/plugin) ---
interface V2ModelRef { id: string; providerID: string }
interface V2ToolExecuteAfterEvent {
  tool?: unknown;
  id?: string;
  sessionID?: string;
  input?: { name?: unknown };
}
interface V2StepStartedEvent {
  type: "session.step.started";
  data: { sessionID: string; assistantMessageID: string; agent: string; model: V2ModelRef };
}
interface V2StepEndedEvent {
  type: "session.step.ended";
  data: {
    sessionID: string;
    assistantMessageID: string;
    tokens: { input: number; output: number; reasoning: number; cache: { read: number; write: number } };
    cost?: number;
    finish?: string;
  };
}
interface V2StepFailedEvent {
  type: "session.step.failed";
  data: {
    sessionID: string;
    assistantMessageID: string;
    tokens?: { input: number; output: number; reasoning: number; cache: { read: number; write: number } };
    cost?: number;
    finish?: string;
    error?: unknown;
  };
}
type V2Event = V2StepStartedEvent | V2StepEndedEvent | V2StepFailedEvent | { type: string; data: unknown };
interface V2PluginContext {
  location: { directory: string };
  tool: { hook(name: "execute.after", handler: (event: V2ToolExecuteAfterEvent) => Promise<void>): Promise<void> | void };
  event: { subscribe(options: { signal: AbortSignal }): AsyncIterable<V2Event> };
}

// --- Shared helpers ---
async function recordCapture(payload: unknown, directory: string): Promise<void> {
  try { await captureWorkflowEvent("opencode", payload, directory); }
  catch { /* Capture failure must not interrupt the host or token reporting. */ }
}

async function recordSkillUse(skill: string, callID: string | undefined, sessionID: string | undefined, directory: string): Promise<void> {
  try {
    await recordEvent({
      vendor: "opencode",
      event: "skill-use",
      skill,
      idempotencyKey: callID,
      raw: { session_id: sessionID },
    }, directory);
  } catch {
    // Observational reporting must not interrupt the tool or leak a rejected promise.
  }
}

async function recordCompletion(
  directory: string,
  idempotencyKey: string | undefined,
  sessionID: string | undefined,
  agentType: string | null,
  model: V2ModelRef | null,
  effort: string | null,
  status: string,
  costUsd: number | undefined,
  tokens: unknown,
): Promise<void> {
  try {
    await recordEvent({
      vendor: "opencode",
      event: "message.completed",
      agentType,
      model: model ? `${model.providerID}/${model.id}` : null,
      effort,
      status,
      metricScope: "agent_total",
      costUsd,
      idempotencyKey,
      raw: { session_id: sessionID, message_id: idempotencyKey, tokens },
    }, directory);
  } catch {
    // Observational reporting must not interrupt the event stream.
  }
}

// --- V1 entrypoint (legacy OpenCode 1.x) ---
async function tokenConsumptionV1(ctx: V1PluginContext) {
  const directory = ctx.directory;
  return {
    "tool.execute.after": async (input: V1ToolInput) => {
      if (String(input?.tool).toLowerCase() !== "skill") return;
      const skill = typeof input.args?.name === "string" ? input.args.name : null;
      if (!skill) return;
      await recordSkillUse(skill, input.callID, input.sessionID, directory);
      await recordCapture({ type: "tool.execute.after", data: { tool: "skill", sessionID: input.sessionID, input: { name: skill } } }, directory);
    },
    event: async ({ event }: { event?: V1BusEvent }) => {
      if (event?.type !== "message.updated") return;
      const message = event.properties?.info;
      if (message?.role !== "assistant" || !message.time?.completed) return;
      await recordCompletion(
        directory,
        message.id,
        message.sessionID,
        message.agent || message.mode || "primary",
        message.providerID && message.modelID ? { providerID: message.providerID, id: message.modelID } : null,
        message.variant || null,
        message.error ? "error" : message.finish || "completed",
        message.cost,
        message.tokens,
      );
    },
  };
}

// --- V2 entrypoint (OpenCode 2.x) ---
async function tokenConsumptionV2(ctx: V2PluginContext): Promise<() => void> {
  const directory = ctx.location.directory;
  const controller = new AbortController();
  const steps = new Map<string, { agent: string; model: V2ModelRef }>();

  // Skill tool calls are reported from the tool hook so the skill name is available exactly once per call.
  await ctx.tool.hook("execute.after", async (event) => {
    if (String(event.tool).toLowerCase() !== "skill") return;
    const skill = typeof event.input?.name === "string" ? event.input.name : null;
    if (!skill) return;
    await recordSkillUse(skill, event.id, event.sessionID, directory);
    await recordCapture({ type: "tool.execute.after", data: { tool: "skill", sessionID: event.sessionID, input: { name: skill } } }, directory);
  });

  // Assistant completions are reported from the event stream so token/cost data is authoritative.
  void (async () => {
    try {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        try {
          if (event.type === "session.step.started") {
            const d = event.data;
            if (d.assistantMessageID && typeof d.agent === "string" && d.model?.id && d.model?.providerID) {
              steps.set(d.assistantMessageID, { agent: d.agent, model: d.model });
            }
            await recordCapture(event, directory);
            continue;
          }

          if (event.type === "session.step.ended" || event.type === "session.step.failed") {
            const d = event.data;
            const meta = steps.get(d.assistantMessageID);
            const agentType = meta?.agent ?? d.agent ?? "primary";
            const model = meta?.model ?? (d.model?.id && d.model?.providerID ? d.model : null);
            const status = event.type === "session.step.failed" ? "error" : (d.finish || "completed");
            await recordCompletion(
              directory,
              d.assistantMessageID,
              d.sessionID,
              agentType,
              model,
              null, // V2 step events do not expose the model variant/effort.
              status,
              d.cost,
              d.tokens,
            );
            steps.delete(d.assistantMessageID);
          }
          await recordCapture(event, directory);
        } catch {
          // Each event is handled independently; one malformed event must not kill the stream.
        }
      }
    } catch {
      // A closed or failed event stream stops reporting until the plugin reloads; never propagate.
    }
  })();

  return () => controller.abort();
}

// Dual-compatible default export:
// - OpenCode V1 calls `server()`.
// - OpenCode V2 calls `setup()`.
export default {
  id: "token-consumption",
  server: tokenConsumptionV1,
  setup: tokenConsumptionV2,
};
