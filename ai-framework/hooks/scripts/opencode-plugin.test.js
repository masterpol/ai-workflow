const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");

// The plugin is an ES module that OpenCode loads; it is driven here with the hook inputs the
// plugin API documents, so the wiring between OpenCode's events and the collector is tested.
const pluginUrl = pathToFileURL(path.join(__dirname, "..", "..", "..", ".opencode", "plugins", "token-consumption.js")).href;

async function withPlugin(action) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    const { default: plugin } = await import(pluginUrl);
    const hooks = await plugin({ directory: root });
    const snapshot = () => JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    return await action(hooks, snapshot, root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const completed = (id, sessionID, extra = {}) => ({ event: { type: "message.updated", properties: { info: { id, sessionID, role: "assistant", time: { completed: 1 }, providerID: "openai", modelID: "gpt-5.6-terra", cost: 0.01, tokens: { input: 5, output: 5, reasoning: 0, cache: { read: 0, write: 0 } }, finish: "stop", ...extra } } } });

test("a completed assistant message records model, agent, effort and tokens", async () => {
  await withPlugin(async (hooks, snapshot) => {
    await hooks["chat.message"]({ sessionID: "s1", agent: "build", variant: "high" });
    await hooks.event(completed("m1", "s1"));
    const { dimensions, lifetime } = snapshot();
    assert.equal(lifetime.agentCompletions, 1);
    assert.equal(dimensions.models.opencode["openai/gpt-5.6-terra"].tokens, 10);
    assert.equal(dimensions.agents.opencode.build.completions, 1);
    assert.equal(dimensions.efforts.opencode.high.completions, 1);
  });
});

test("a message from a session with no chat.message reports effort as unreported", async () => {
  await withPlugin(async (hooks, snapshot) => {
    await hooks.event(completed("m1", "unseen", { mode: "plan" }));
    const { dimensions } = snapshot();
    assert.equal(dimensions.efforts.opencode["(unreported)"].completions, 1);
    assert.equal(dimensions.agents.opencode.plan.completions, 1);
  });
});

test("a skill tool call is counted by name only, and other tools and events are ignored", async () => {
  await withPlugin(async (hooks, snapshot, root) => {
    await hooks["tool.execute.after"]({ tool: "Skill", sessionID: "s1", callID: "c1", args: { name: "plan", prompt: "PLUGIN-ARGS-MARKER" } });
    await hooks["tool.execute.after"]({ tool: "skill", sessionID: "s1", callID: "c1", args: { name: "plan" } });
    await hooks["tool.execute.after"]({ tool: "bash", sessionID: "s1", callID: "c2", args: { name: "ignored" } });
    await hooks["tool.execute.after"]({ tool: "skill", sessionID: "s1", callID: "c3", args: {} });
    await hooks.event({ event: { type: "session.idle", properties: {} } });
    await hooks.event(completed("m-user", "s1", { role: "user" }));
    await hooks.event(completed("m-open", "s1", { time: {} }));
    const { dimensions, lifetime } = snapshot();
    assert.deepEqual(Object.keys(dimensions.skills.opencode), ["plan"]);
    assert.equal(dimensions.skills.opencode.plan.uses, 1, "a replayed callID counts once");
    assert.equal(lifetime.agentCompletions, 0);
    assert.doesNotMatch(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"), /PLUGIN-ARGS-MARKER/);
  });
});

test("malformed events never throw out of the plugin", async () => {
  await withPlugin(async (hooks) => {
    await hooks.event({ event: { type: "message.updated", properties: {} } });
    await hooks.event({ event: { type: "message.updated", properties: { info: { role: "assistant" } } } });
    await hooks.event(completed("m1", "s1", { tokens: null }));
    await hooks["tool.execute.after"]({ tool: null, args: null });
  });
});

test("session lookups stay bounded", async () => {
  await withPlugin(async (hooks, snapshot) => {
    for (let index = 0; index < 300; index += 1) await hooks["chat.message"]({ sessionID: `s${index}`, agent: `a${index}`, variant: "low" });
    await hooks.event(completed("old", "s0"));
    await hooks.event(completed("new", "s299"));
    const { dimensions } = snapshot();
    assert.equal(dimensions.agents.opencode.a299.completions, 1, "a recent session keeps its agent");
    assert.equal(dimensions.agents.opencode.a0, undefined, "the oldest session was pruned");
  });
});
