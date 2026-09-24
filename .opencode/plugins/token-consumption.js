import collector from "../../ai-framework/hooks/scripts/token-consumption.js";

const agentsBySession = new Map();

export default async ({ directory }) => ({
  "chat.message": async (input) => {
    agentsBySession.set(input.sessionID, input.agent || "primary");
  },
  event: async ({ event }) => {
    if (event.type !== "message.updated") return;
    const message = event.properties.info;
    if (message.role !== "assistant" || !message.time.completed) return;
    try {
      collector.recordEvent({
        vendor: "opencode",
        event: "message.completed",
        agentType: agentsBySession.get(message.sessionID) || message.mode || "primary",
        model: `${message.providerID}/${message.modelID}`,
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
