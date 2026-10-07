const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");

// The plugin is an ES module that OpenCode V2 loads; it is driven here through a fake V2 plugin
// context (`ctx.tool.hook` + `ctx.event.subscribe`), so the wiring between OpenCode's events and
// the collector is tested.
const pluginUrl = pathToFileURL(path.join(__dirname, "..", "..", "..", ".opencode", "plugins", "token-consumption.js")).href;

// An async iterable the test pushes events into. `drained()` resolves once the plugin's
// for-await loop has requested one more event than was pushed — i.e. every pushed event has
// been fully processed (the plugin awaits the collector before pulling the next event).
function fakeEventStream() {
  const queue = [];
  const parked = [];
  let requested = 0;
  let pushed = 0;
  let waiters = [];
  const notify = () => {
    const ready = waiters.filter((wait) => requested > pushed);
    waiters = waiters.filter((wait) => requested <= pushed);
    ready.forEach((resolve) => resolve());
  };
  const iterable = {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      requested += 1;
      notify();
      if (queue.length) return Promise.resolve(queue.shift());
      return new Promise((resolve) => parked.push(resolve));
    },
    return() {
      return Promise.resolve({ done: true });
    },
  };
  return {
    iterable,
    push(event) {
      pushed += 1;
      const value = { value: event, done: false };
      if (parked.length) parked.shift()(value);
      else queue.push(value);
    },
    drained() {
      if (requested > pushed) return Promise.resolve();
      return new Promise((resolve) => waiters.push(resolve));
    },
  };
}

async function withPlugin(action) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    const { default: plugin } = await import(pluginUrl);
    assert.equal(plugin.id, "token-consumption");
    assert.equal(typeof plugin.setup, "function");
    const stream = fakeEventStream();
    const toolHooks = {};
    const ctx = {
      location: { directory: root },
      tool: {
        hook: async (name, callback) => {
          toolHooks[name] = callback;
          return { dispose: async () => {} };
        },
      },
      event: {
        subscribe: () => stream.iterable,
      },
    };
    const cleanup = await plugin.setup(ctx);
    const snapshot = () => JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    return await action({ hooks: toolHooks, stream, snapshot, root });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const completed = (id, sessionID, extra = {}) => ({
  type: "message.updated",
  data: {
    sessionID,
    info: {
      id,
      sessionID,
      role: "assistant",
      time: { completed: 1 },
      providerID: "opencode-go",
      modelID: "kimi-k2.7-code",
      agent: "build",
      variant: "max",
      cost: 0.01,
      tokens: { input: 5, output: 5, reasoning: 0, cache: { read: 0, write: 0 } },
      finish: "stop",
      ...extra,
    },
  },
});

test("a completed assistant message records model, agent, effort and tokens", async () => {
  await withPlugin(async ({ stream, snapshot }) => {
    stream.push(completed("m1", "s1"));
    await stream.drained();
    const { dimensions, lifetime } = snapshot();
    assert.equal(lifetime.agentCompletions, 1);
    assert.equal(dimensions.models.opencode["opencode-go/kimi-k2.7-code"].tokens, 10);
    assert.equal(dimensions.agents.opencode.build.completions, 1);
    assert.equal(dimensions.efforts.opencode.max.completions, 1);
  });
});

test("a message without agent or variant falls back to mode and unreported effort", async () => {
  await withPlugin(async ({ stream, snapshot }) => {
    stream.push(completed("m1", "unseen", { agent: undefined, variant: undefined, mode: "plan" }));
    await stream.drained();
    const { dimensions } = snapshot();
    assert.equal(dimensions.efforts.opencode["(unreported)"].completions, 1);
    assert.equal(dimensions.agents.opencode.plan.completions, 1);
  });
});

test("a skill tool call is counted by name only, and other tools and events are ignored", async () => {
  await withPlugin(async ({ hooks, stream, snapshot, root }) => {
    await hooks["execute.after"]({ tool: "Skill", sessionID: "s1", id: "c1", input: { name: "plan", prompt: "PLUGIN-ARGS-MARKER" }, status: "completed", result: {} });
    await hooks["execute.after"]({ tool: "skill", sessionID: "s1", id: "c1", input: { name: "plan" }, status: "completed", result: {} });
    await hooks["execute.after"]({ tool: "bash", sessionID: "s1", id: "c2", input: { name: "ignored" }, status: "completed", result: {} });
    await hooks["execute.after"]({ tool: "skill", sessionID: "s1", id: "c3", input: {}, status: "completed", result: {} });
    stream.push({ type: "session.idle", data: {} });
    stream.push(completed("m-user", "s1", { role: "user" }));
    stream.push(completed("m-open", "s1", { time: {} }));
    await stream.drained();
    const { dimensions, lifetime } = snapshot();
    assert.deepEqual(Object.keys(dimensions.skills.opencode), ["plan"]);
    assert.equal(dimensions.skills.opencode.plan.uses, 1, "a replayed call id counts once");
    assert.equal(lifetime.agentCompletions, 0);
    assert.doesNotMatch(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"), /PLUGIN-ARGS-MARKER/);
  });
});

test("malformed events never throw out of the plugin", async () => {
  await withPlugin(async ({ hooks, stream }) => {
    stream.push({ type: "message.updated", data: {} });
    stream.push({ type: "message.updated" });
    stream.push(completed("m1", "s1", { tokens: null }));
    await stream.drained();
    await hooks["execute.after"]({ tool: null, input: null, status: "completed", result: {} });
  });
});

test("the plugin awaits the collector and stays best-effort when it skips or rejects", async () => {
  await withPlugin(async ({ hooks, stream, snapshot, root }) => {
    const metrics = path.join(root, ".project", "metrics");
    fs.mkdirSync(metrics, { recursive: true });
    const legacy = path.join(metrics, ".token-consumption.lock");
    fs.writeFileSync(legacy, "12345");
    stream.push(completed("m-legacy", "s1"));
    await stream.drained();
    await hooks["execute.after"]({ tool: "skill", sessionID: "s1", id: "c-legacy", input: { name: "plan" }, status: "completed", result: {} });
    assert.equal(fs.existsSync(path.join(metrics, "token-consumption.json")), false, "a legacy lock skips the event");
    fs.rmSync(legacy);

    if (!(process.getuid && process.getuid() === 0)) {
      stream.push(completed("m-first", "s1"));
      await stream.drained();
      fs.chmodSync(metrics, 0o500); // the collector's write now rejects inside its lease
      try {
        stream.push(completed("m-denied", "s1"));
        await stream.drained();
        await hooks["execute.after"]({ tool: "skill", sessionID: "s1", id: "c-denied", input: { name: "plan" }, status: "completed", result: {} });
      } finally {
        fs.chmodSync(metrics, 0o700);
      }
    }
    stream.push(completed("m-after", "s1"));
    await stream.drained();
    assert.equal(snapshot().current.id, JSON.stringify(["opencode", "event", "m-after"]), "the awaited call has finished writing when the event is consumed");
  });
});
