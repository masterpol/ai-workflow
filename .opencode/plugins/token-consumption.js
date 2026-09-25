import collector from "../../ai-framework/hooks/scripts/token-consumption.js";

const agentsBySession = new Map();
const variantsBySession = new Map();
const MAX_SESSIONS = 200;

// Session lookups only matter while a session is live; the oldest entries are dropped.
function remember(map, key, value) {
  map.delete(key);
  map.set(key, value);
  while (map.size > MAX_SESSIONS) map.delete(map.keys().next().value);
}

export default async ({ directory }) => ({
  "chat.message": async (input) => {
    remember(agentsBySession, input.sessionID, input.agent || "primary");
    // `variant` is OpenCode's per-message reasoning setting; absent means the provider default.
    remember(variantsBySession, input.sessionID, input.variant || null);
  },
  "tool.execute.after": async (input) => {
    if (String(input.tool).toLowerCase() !== "skill") return;
    // Only the skill's name is passed on; its other arguments are free text and are never stored.
    const skill = typeof input.args?.name === "string" ? input.args.name : null;
    if (!skill) return;
    try {
      collector.recordEvent({ vendor: "opencode", event: "skill-use", skill, idempotencyKey: input.callID }, directory);
    } catch {
      // Consumption reporting is observational and cannot affect a tool call.
    }
  },
  event: async ({ event }) => {
    try {
      if (event.type !== "message.updated") return;
      const message = event.properties?.info;
      if (message?.role !== "assistant" || !message.time?.completed) return;
      collector.recordEvent({
        vendor: "opencode",
        event: "message.completed",
        agentType: agentsBySession.get(message.sessionID) || message.mode || "primary",
        model: `${message.providerID}/${message.modelID}`,
        effort: variantsBySession.get(message.sessionID) || null,
        status: message.error ? "error" : message.finish || "completed",
        metricScope: "agent_total",
        costUsd: message.cost,
        idempotencyKey: message.id,
        raw: { session_id: message.sessionID, message_id: message.id, tokens: message.tokens },
      }, directory);
    } catch {
      // Consumption reporting is observational and cannot affect an agent completion.
    }
  },
});
