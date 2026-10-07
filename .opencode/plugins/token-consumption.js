import collector from "../../ai-framework/hooks/scripts/token-consumption.js";

// OpenCode V2 plugin API: a default definition with an `id` and a `setup` function.
// Consumption reporting is observational — it must never affect a session, so every
// collector call is awaited inside its own catch.
export default {
  id: "token-consumption",
  async setup(ctx) {
    const directory = ctx.location.directory;
    const controller = new AbortController();

    // V2's execute.after event carries { tool, sessionID, agent, messageID, id, input, status }.
    await ctx.tool.hook("execute.after", async (event) => {
      if (String(event.tool).toLowerCase() !== "skill") return;
      // Only the skill's name is passed on; its other arguments are free text and are never stored.
      const skill = typeof event.input?.name === "string" ? event.input.name : null;
      if (!skill) return;
      try {
        // Awaited so a rejection lands in this catch instead of becoming an unhandled rejection in OpenCode.
        await collector.recordEvent({ vendor: "opencode", event: "skill-use", skill, idempotencyKey: event.id }, directory);
      } catch {
        // Consumption reporting is observational and cannot affect a tool call.
      }
    });

    // V2's completed assistant message carries `agent` and `variant` directly, so no
    // per-session tracking is needed; `variant` absent means the provider default.
    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
          if (event.type !== "message.updated") continue;
          const message = event.data?.info;
          if (message?.role !== "assistant" || !message.time?.completed) continue;
          try {
            await collector.recordEvent({
              vendor: "opencode",
              event: "message.completed",
              agentType: message.agent || message.mode || "primary",
              model: `${message.providerID}/${message.modelID}`,
              effort: message.variant || null,
              status: message.error ? "error" : message.finish || "completed",
              metricScope: "agent_total",
              costUsd: message.cost,
              idempotencyKey: message.id,
              raw: { session_id: message.sessionID, message_id: message.id, tokens: message.tokens },
            }, directory);
          } catch {
            // Consumption reporting is observational and cannot affect an agent completion.
          }
        }
      } catch {
        // A closed or failed event stream stops reporting until the plugin reloads; never propagate.
      }
    })();

    return () => controller.abort();
  },
};
