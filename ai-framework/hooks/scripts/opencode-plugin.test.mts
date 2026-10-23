import assert from "node:assert/strict";
import test from "node:test";

import { nodeFs } from "../../scripts/runtime/node.mts";
import { createTestDeps, fileUrl, urlPath } from "../../scripts/runtime/test-helpers.mts";
import type { UsageState } from "../../scripts/workflow-metrics-state.mts";
const testDeps = createTestDeps();
const fs = testDeps.fs;
const os = testDeps.os;
const path = testDeps.path;
const here = path.dirname(urlPath(import.meta.url));

type Event = Record<string, unknown>;
type ToolHook = (input: Event, output?: Event) => Promise<void>;
interface V1Hooks { event(args: { event: Event }): Promise<void>; "tool.execute.after": ToolHook }
interface V1Plugin { id: string; server(ctx: { directory: string }): Promise<V1Hooks>; setup(ctx: unknown): Promise<() => void> }
interface PluginRun {
  v1?: { hooks: V1Hooks; emit(event: Event): Promise<void>; snapshot(): ReturnType<typeof JSON.parse>; root: string };
  v2?: { emit(event: Event): Promise<void>; toolHook(event: Event): Promise<void>; snapshot(): ReturnType<typeof JSON.parse>; waitForSnapshot(timeoutMs?: number): Promise<void>; root: string };
}

const pluginUrl = fileUrl(path.join(here, "..", "..", "..", ".opencode", "plugins", "token-consumption.ts"));

async function withPlugin(action: (run: PluginRun) => Promise<void>): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    const { default: plugin } = (await import(pluginUrl)) as { default: V1Plugin };
    assert.ok(plugin && typeof plugin === "object", "OpenCode loads an exported plugin definition");
    assert.equal(plugin.id, "token-consumption", "plugin id is stable");
    assert.equal(typeof plugin.server, "function", "V1 entrypoint is exported as server()");
    assert.equal(typeof plugin.setup, "function", "V2 entrypoint is exported as setup()");

    const v1Hooks = await plugin.server({ directory: root });
    assert.equal(typeof v1Hooks.event, "function");
    assert.equal(typeof v1Hooks["tool.execute.after"], "function");

    const run: PluginRun = {
      v1: { hooks: v1Hooks, emit: event => v1Hooks.event({ event }), snapshot: snapshotOf(root), root },
    };

    // V2 setup: capture the registrations the plugin makes on the context.
    const v2Events: Event[] = [];
    const acknowledgments = new Map<Event, () => void>();
    let acknowledge: (() => void) | undefined;
    let pendingResolve: ((result: IteratorResult<Event>) => void) | null = null;
    let v2ToolHandler: ((event: Event) => Promise<void>) | undefined;
    const controller = new AbortController();
    const v2Ctx = {
      location: { directory: root },
      tool: {
        hook: async (name: string, handler: (event: Event) => Promise<void>) => {
          assert.equal(name, "execute.after", "V2 registers the tool execute.after hook");
          v2ToolHandler = handler;
        },
      },
      event: {
        subscribe: ({ signal }: { signal: AbortSignal }) => ({
          [Symbol.asyncIterator]() {
            return {
              async next() {
                acknowledge?.();
                acknowledge = undefined;
                if (signal.aborted) return { done: true, value: undefined };
                const event = v2Events.shift();
                if (event) {
                  acknowledge = acknowledgments.get(event);
                  acknowledgments.delete(event);
                  return { done: false, value: event };
                }
                return new Promise<IteratorResult<Event>>((resolve) => {
                  pendingResolve = resolve;
                  signal.addEventListener("abort", () => {
                    if (pendingResolve === resolve) {
                      pendingResolve = null;
                      resolve({ done: true, value: undefined });
                    }
                  });
                });
              },
            };
          },
        }),
      },
    };

    const cleanup = await plugin.setup(v2Ctx);
    assert.equal(typeof cleanup, "function", "V2 setup returns a cleanup function");
    assert.ok(v2ToolHandler, "V2 registers a tool hook handler");

    const snapshotPath = path.join(root, ".project", "metrics", "token-consumption.json");
    run.v2 = {
      emit: async (event) => {
        const processed = new Promise<void>((resolve) => acknowledgments.set(event, resolve));
        v2Events.push(event);
        if (pendingResolve) {
          const resolve = pendingResolve;
          pendingResolve = null;
          v2Events.shift();
          acknowledge = acknowledgments.get(event);
          acknowledgments.delete(event);
          resolve({ done: false, value: event });
        }
        await processed;
      },
      toolHook: v2ToolHandler!,
      snapshot: snapshotOf(root),
      waitForSnapshot: async (timeoutMs = 2000) => {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
          if (fs.existsSync(snapshotPath)) return;
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        throw new Error(`snapshot did not appear within ${timeoutMs}ms`);
      },
      root,
    };

    try {
      await action(run);
    } finally {
      cleanup();
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function snapshotOf(root: string) {
  return () => JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
}

const v1Completed = (id: string, sessionID: string, extra: Record<string, unknown> = {}): Event => ({
  type: "message.updated",
  properties: {
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

function v2Step(sessionID: string, assistantMessageID: string, extra: Record<string, unknown> = {}): Event {
  return {
    type: "session.step.started",
    data: {
      sessionID,
      assistantMessageID,
      agent: "build",
      model: { providerID: "opencode-go", id: "kimi-k2.7-code" },
      ...extra,
    },
  };
}

function v2StepEnded(sessionID: string, assistantMessageID: string, extra: Record<string, unknown> = {}): Event {
  return {
    type: "session.step.ended",
    data: {
      sessionID,
      assistantMessageID,
      tokens: { input: 5, output: 5, reasoning: 0, cache: { read: 0, write: 0 } },
      cost: 0.01,
      finish: "stop",
      ...extra,
    },
  };
}

test("V1: a completed assistant message records model, agent, effort and tokens", async () => {
  await withPlugin(async ({ v1 }) => {
    if (!v1) throw new Error("V1 run not available");
    await v1.emit(v1Completed("m1", "s1"));

    const { dimensions, lifetime } = v1.snapshot();
    assert.equal(lifetime.agentCompletions, 1);
    assert.equal(dimensions.models.opencode["opencode-go/kimi-k2.7-code"].tokens, 10);
    assert.equal(dimensions.agents.opencode.build.completions, 1);
    assert.equal(dimensions.efforts.opencode.max.completions, 1);
  });
});

test("V1: a message without agent or variant falls back to mode and unreported effort", async () => {
  await withPlugin(async ({ v1 }) => {
    if (!v1) throw new Error("V1 run not available");
    await v1.emit(v1Completed("m1", "unseen", { agent: undefined, variant: undefined, mode: "plan" }));

    const { dimensions } = v1.snapshot();
    assert.equal(dimensions.efforts.opencode["(unreported)"].completions, 1);
    assert.equal(dimensions.agents.opencode.plan.completions, 1);
  });
});

test("V1: a skill tool call is counted by name only, and other tools and events are ignored", async () => {
  await withPlugin(async ({ v1 }) => {
    if (!v1) throw new Error("V1 run not available");
    await v1.hooks["tool.execute.after"]({ tool: "Skill", sessionID: "s1", callID: "c1", args: { name: "plan", prompt: "PLUGIN-ARGS-MARKER" }, status: "completed", result: {} });
    await v1.hooks["tool.execute.after"]({ tool: "skill", sessionID: "s1", callID: "c1", args: { name: "plan" }, status: "completed", result: {} });
    await v1.hooks["tool.execute.after"]({ tool: "bash", sessionID: "s1", callID: "c2", args: { name: "ignored" }, status: "completed", result: {} });
    await v1.hooks["tool.execute.after"]({ tool: "skill", sessionID: "s1", callID: "c3", args: {}, status: "completed", result: {} });
    await v1.emit({ type: "session.idle", properties: {} });
    await v1.emit(v1Completed("m-user", "s1", { role: "user" }));
    await v1.emit(v1Completed("m-open", "s1", { time: {} }));

    const { dimensions, lifetime } = v1.snapshot();
    assert.deepEqual(Object.keys(dimensions.skills.opencode), ["plan"]);
    assert.equal(dimensions.skills.opencode.plan.uses, 1, "a replayed call id counts once");
    assert.equal(lifetime.agentCompletions, 0);
    assert.doesNotMatch(fs.readFileSync(path.join(v1.root, ".project", "metrics", "token-consumption.json"), "utf8"), /PLUGIN-ARGS-MARKER/);
  });
});

test("V1: malformed events never throw out of the plugin", async () => {
  await withPlugin(async ({ v1 }) => {
    if (!v1) throw new Error("V1 run not available");
    await v1.emit({ type: "message.updated", properties: {} });
    await v1.emit({ type: "message.updated" });
    await v1.emit(v1Completed("m1", "s1", { tokens: null }));

    await v1.hooks["tool.execute.after"]({ tool: null, args: null, status: "completed", result: {} });
  });
});

test("V1: the plugin awaits the collector and stays best-effort when it skips or rejects", async (t) => {
  await withPlugin(async ({ v1 }) => {
    if (!v1) throw new Error("V1 run not available");
    const metrics = path.join(v1.root, ".project", "metrics");
    fs.mkdirSync(metrics, { recursive: true });
    const legacy = path.join(metrics, ".token-consumption.lock");
    fs.writeFileSync(legacy, "12345");
    await v1.emit(v1Completed("m-legacy", "s1"));

    await v1.hooks["tool.execute.after"]({ tool: "skill", sessionID: "s1", callID: "c-legacy", args: { name: "plan" }, status: "completed", result: {} });
    assert.equal(fs.existsSync(path.join(metrics, "token-consumption.json")), false, "a legacy lock skips the event");
    fs.rmSync(legacy);

    await v1.emit(v1Completed("m-first", "s1"));
    const write = nodeFs.writeFileSync;
    let failures = 0;
    const failure = t.mock.method(nodeFs, "writeFileSync", (file, data, options) => {
      if (String(file).startsWith(path.join(metrics, "token-consumption.json.")) && options?.flag === "wx") {
        failures += 1;
        throw Object.assign(new Error("injected collector failure"), { code: "EACCES" });
      }
      return write(file, data, options);
    });
    try {
      await v1.emit(v1Completed("m-denied", "s1"));
      await v1.hooks["tool.execute.after"]({ tool: "skill", sessionID: "s1", callID: "c-denied", args: { name: "plan" } });
      assert.equal(failures, 2, "both host hooks awaited a rejecting collector");
      assert.equal(v1.snapshot().lifetime.agentCompletions, 1, "neither failed write changed the snapshot");
    } finally {
      failure.mock.restore();
    }
    await v1.emit(v1Completed("m-after", "s1"));

    assert.equal(v1.snapshot().lifetime.agentCompletions, 2, "recording recovers after both failures");
    assert.equal(v1.snapshot().current.id, JSON.stringify(["opencode", "event", "m-after"]), "the awaited hook has finished writing when it returns");
  });
});

test("V2: a completed assistant step records model, agent and tokens", async () => {
  await withPlugin(async ({ v2 }) => {
    if (!v2) throw new Error("V2 run not available");
    await v2.emit(v2Step("s1", "m1"));
    await v2.emit(v2StepEnded("s1", "m1"));
    await v2.waitForSnapshot();

    const { dimensions, lifetime } = v2.snapshot();
    assert.equal(lifetime.agentCompletions, 1);
    assert.equal(dimensions.models.opencode["opencode-go/kimi-k2.7-code"].tokens, 10);
    assert.equal(dimensions.agents.opencode.build.completions, 1);
  });
});

test("V2: a failed step records error status", async () => {
  await withPlugin(async ({ v2 }) => {
    if (!v2) throw new Error("V2 run not available");
    await v2.emit(v2Step("s1", "m-fail"));
    await v2.emit({ type: "session.step.failed", data: { sessionID: "s1", assistantMessageID: "m-fail", tokens: { input: 1, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, cost: 0, error: { message: "boom" } } });
    await v2.waitForSnapshot();

    const { current } = v2.snapshot();
    assert.equal(current.status, "error");
  });
});

test("V2: a skill tool call is counted by name only", async () => {
  await withPlugin(async ({ v2 }) => {
    if (!v2) throw new Error("V2 run not available");
    await v2.toolHook({ tool: "Skill", id: "c1", sessionID: "s1", input: { name: "plan", prompt: "PLUGIN-ARGS-MARKER" }, status: "completed", result: {} });
    await v2.toolHook({ tool: "skill", id: "c1", sessionID: "s1", input: { name: "plan" }, status: "completed", result: {} });
    await v2.toolHook({ tool: "bash", id: "c2", sessionID: "s1", input: { name: "ignored" }, status: "completed", result: {} });
    await v2.toolHook({ tool: "skill", id: "c3", sessionID: "s1", input: {}, status: "completed", result: {} });

    const { dimensions, lifetime } = v2.snapshot();
    assert.deepEqual(Object.keys(dimensions.skills.opencode), ["plan"]);
    assert.equal(dimensions.skills.opencode.plan.uses, 1, "a replayed call id counts once");
    assert.equal(lifetime.agentCompletions, 0);
    assert.doesNotMatch(fs.readFileSync(path.join(v2.root, ".project", "metrics", "token-consumption.json"), "utf8"), /PLUGIN-ARGS-MARKER/);
  });
});

test("V2: malformed events never throw out of the plugin", async () => {
  await withPlugin(async ({ v2 }) => {
    if (!v2) throw new Error("V2 run not available");
    await v2.emit({ type: "session.step.started", data: {} });
    await v2.emit({ type: "session.step.ended", data: {} });
    await v2.toolHook({ tool: null, input: null, status: "completed", result: {} });
  });
});

test("the discovered TypeScript plugin imports the direct collector module", async () => {
  const direct = (await import(fileUrl(path.join(here, "token-consumption.mts")))) as Record<string, unknown>;
  for (const name of ["recordEvent", "normalizedEvent", "applyToSnapshot", "blankSnapshot"]) {
    assert.equal(typeof direct[name], "function", name);
  }
  const pluginPath = path.resolve(here, "../../../.opencode/plugins/token-consumption.ts");
  assert.match(fs.readFileSync(pluginPath, "utf8"), /import \{ recordEvent \} from "\.\.\/\.\.\/ai-framework\/hooks\/scripts\/token-consumption\.mts"/);
  assert.equal(fs.existsSync(pluginPath.replace(/\.ts$/, ".js")), false);
});

function usageOf(root: string): UsageState {
  return JSON.parse(fs.readFileSync(path.join(root, ".project/metrics/workflow-usage.json"), "utf8"));
}

test("V2 capture matches completed and failed step intervals without inferring turns or wait", async () => {
  await withPlugin(async ({ v2 }) => {
    assert.ok(v2);
    await v2.emit(v2Step("s1", "done"));
    await new Promise((resolve) => setTimeout(resolve, 5));
    await v2.emit(v2StepEnded("s1", "done"));
    await v2.emit(v2Step("s1", "failed"));
    await v2.emit({ type: "session.step.failed", data: { sessionID: "s1", assistantMessageID: "failed" } });
    const state = usageOf(v2.root);
    assert.equal(state.totals.matchedFinishes, 2);
    assert.equal(state.totals.outcomes.completed, 1);
    assert.equal(state.totals.outcomes.failed, 1);
    assert.equal(state.totals.unknownFinishes, 2);
    assert.deepEqual(Object.keys(state.pending), []);
    assert.deepEqual(Object.keys(state.usage.sessions), []);
    assert.ok(state.usage.total.activeMs > 0);
    assert.equal(state.usage.total.waitMs, 0);
    assert.equal(state.usage.total.turnsStarted, 0);
  });
});

test("V1 completions and unverified user events never create workflow intervals", async () => {
  await withPlugin(async ({ v1, v2 }) => {
    assert.ok(v1); assert.ok(v2);
    await v1.emit(v1Completed("v1", "s1"));
    await v2.emit({ type: "message.updated", data: { role: "user", sessionID: "s1", text: "CAPTURE-TEXT-MARKER" } });
    assert.equal(fs.existsSync(path.join(v1.root, ".project/metrics/workflow-usage.json")), false);
    assert.equal(v1.snapshot().lifetime.agentCompletions, 1);
  });
});

for (const version of ["v1", "v2"] as const) {
  test(`${version} capture resolves a phase skill and ignores its text arguments`, async () => {
    await withPlugin(async (run) => {
      const host = run[version]; assert.ok(host);
      const root = host.root;
      const hook = version === "v1" ? run.v1!.hooks["tool.execute.after"] : run.v2!.toolHook;
      await hook({ tool: "Skill", sessionID: "s1", callID: "c1", id: "c1",
        args: { name: "plan", prompt: "CAPTURE-TEXT-MARKER" }, input: { name: "plan", text: "CAPTURE-TEXT-MARKER" } });
      const state = usageOf(root);
      assert.equal(state.totals.events["phase.started"], 1);
      const phase = Object.values(state.pending)[0];
      assert.equal(phase.phase, "plan");
      assert.equal(phase.pitch, "(unattributed)");
      assert.equal(phase.scope, "(none)");
      assert.equal(host.snapshot().dimensions.skills.opencode.plan.uses, 1);
      for (const file of fs.readdirSync(path.join(root, ".project/metrics"))) {
        const name = path.join(root, ".project/metrics", file);
        if (fs.statSync(name).isFile()) assert.doesNotMatch(fs.readFileSync(name, "utf8"), /CAPTURE-TEXT-MARKER/);
      }
    });
  });
}

test("V2 capture never persists message text from step events", async () => {
  await withPlugin(async ({ v2 }) => {
    assert.ok(v2);
    await v2.emit(v2Step("s1", "m1", { text: "CAPTURE-TEXT-MARKER", prompt: "CAPTURE-TEXT-MARKER" }));
    await v2.emit(v2StepEnded("s1", "m1", { text: "CAPTURE-TEXT-MARKER", response: "CAPTURE-TEXT-MARKER" }));
    for (const file of fs.readdirSync(path.join(v2.root, ".project/metrics"))) {
      const name = path.join(v2.root, ".project/metrics", file);
      if (fs.statSync(name).isFile()) assert.doesNotMatch(fs.readFileSync(name, "utf8"), /CAPTURE-TEXT-MARKER/);
    }
    assert.equal(usageOf(v2.root).totals.matchedFinishes, 1);
  });
});

test("plugin awaits token settlement before capture and contains rejected capture calls", () => {
  // Compile the real plugin in memory with only its two module boundaries replaced.
  // Node supplies the TypeScript stripper for both Node and Bun test runs.
  const script = `
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import {stripTypeScriptTypes} from 'node:module';
    const source = fs.readFileSync(process.argv[1], 'utf8');
    const js = stripTypeScriptTypes(source).replace(/^import .*;$/gm, '').replace('export default', 'return');
    const order = [];
    let release;
    let barrier = new Promise(resolve => { release = resolve; });
    const record = async () => { order.push('token-start'); await barrier; order.push('token-settled'); };
    const capture = async () => { order.push('capture'); throw new Error('rejected workflow writer'); };
    const plugin = new Function('recordEvent', 'captureWorkflowEvent', js)(record, capture);
    const v1 = await plugin.server({directory: '/unused'});
    const pending = v1['tool.execute.after']({tool: 'skill', sessionID: 's', args: {name: 'plan'}});
    await Promise.resolve();
    assert.deepEqual(order, ['token-start']);
    release(); await pending;
    assert.deepEqual(order, ['token-start', 'token-settled', 'capture']);
    order.length = 0;
    let tool;
    let finished;
    const done = new Promise(resolve => { finished = resolve; });
    const cleanup = await plugin.setup({location: {directory: '/unused'},
      tool: {hook: (_, handler) => { tool = handler; }},
      event: {subscribe: async function* () {
        yield {type: 'session.step.started', data: {sessionID: 's', assistantMessageID: 'a'}};
        yield {type: 'session.step.ended', data: {sessionID: 's', assistantMessageID: 'a'}};
        yield {type: 'session.step.failed', data: null};
        finished();
      }}});
    await done; cleanup();
    assert.deepEqual(order, ['capture', 'token-start', 'token-settled', 'capture']);
    order.length = 0;
    await tool({tool: 'skill', sessionID: 's', input: {name: 'plan'}});
    assert.deepEqual(order, ['token-start', 'token-settled', 'capture']);
  `;
  const result = testDeps.child.runSync("node", ["--disable-warning=ExperimentalWarning", "--input-type=module", "-e", script, urlPath(pluginUrl)], { timeoutMs: 5000 });
  assert.equal(result.status, 0, result.stderr);
});
