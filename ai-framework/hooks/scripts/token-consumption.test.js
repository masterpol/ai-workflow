const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const { recordEvent, normalizedEvent, applyToSnapshot, blankSnapshot } = require("./token-consumption.js");

test("keeps one rolling snapshot and regenerates reports", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    await recordEvent({ vendor: "opencode", event: "message.completed", agentType: "reviewer", model: "openai/gpt", costUsd: 0.01, raw: { session_id: "session-1", message_id: "one", tokens: { input: 10, output: 20, reasoning: 3, cache: { read: 4, write: 5 } } } }, root);
    await recordEvent({ vendor: "opencode", event: "message.completed", agentType: "reviewer", model: "openai/gpt", costUsd: 0.02, raw: { session_id: "session-1", message_id: "two", tokens: { input: 15, output: 25, reasoning: 4, cache: { read: 5, write: 6 } } } }, root);
    const metrics = path.join(root, ".project", "metrics");
    const snapshot = JSON.parse(fs.readFileSync(path.join(metrics, "token-consumption.json"), "utf8"));
    assert.equal(snapshot.current.tokens.total, 44);
    assert.equal(snapshot.previous.tokens.total, 33);
    assert.equal(snapshot.lifetime.agentCompletions, 2);
    assert.equal(snapshot.lifetime.tokens.total, 77);
    assert.equal(snapshot.lifetime.reportedCostUsd, 0.03);
    assert.match(fs.readFileSync(path.join(metrics, "token-consumption.md"), "utf8"), /Agent Token Consumption/);
    assert.match(fs.readFileSync(path.join(metrics, "token-consumption.html"), "utf8"), /Current Completion/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("upgrades a completion without usage instead of counting it twice", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    await recordEvent({ vendor: "claude", agentId: "agent-1", raw: { session_id: "session-1" } }, root);
    await recordEvent({ vendor: "claude", agentId: "agent-1", metricScope: "final_request", raw: { session_id: "session-1", usage: { input_tokens: 9, output_tokens: 6 } } }, root);
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    assert.equal(snapshot.lifetime.agentCompletions, 1);
    assert.equal(snapshot.lifetime.unavailableCount, 0);
    assert.equal(snapshot.lifetime.tokens.total, 15);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("deduplicates replayed provider messages and supports a project root outside cwd", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  const nestedDirectory = path.join(root, "nested");
  fs.mkdirSync(nestedDirectory);
  const originalDirectory = process.cwd();
  try {
    const event = { vendor: "opencode", idempotencyKey: "message-1", raw: { tokens: { input: 8, output: 2 } } };
    process.chdir(nestedDirectory);
    await recordEvent(event, root);
    const duplicate = await recordEvent(event, root);
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    assert.equal(duplicate.reason, "duplicate event");
    assert.equal(snapshot.lifetime.agentCompletions, 1);
    assert.equal(snapshot.lifetime.tokens.total, 10);
  } finally {
    process.chdir(originalDirectory);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a recorded event picks up the current caveman mode when modes.json resolves one", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    fs.mkdirSync(path.join(root, ".project", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, ".project", "skills", "modes.json"), JSON.stringify({ schemaVersion: 1, caveman: { default: "lite" } }));
    await recordEvent({ vendor: "opencode", event: "message.completed", raw: { session_id: "session-1", message_id: "one", tokens: { input: 1, output: 1 } } }, root);
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    assert.equal(snapshot.current.mode, "lite");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a recorded event falls back to the bundle default mode when modes.json sets no explicit default", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    fs.mkdirSync(path.join(root, ".project", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, ".project", "skills", "modes.json"), JSON.stringify({ schemaVersion: 1, caveman: {} }));
    await recordEvent({ vendor: "opencode", event: "message.completed", raw: { session_id: "session-1", message_id: "one", tokens: { input: 1, output: 1 } } }, root);
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    assert.equal(snapshot.current.mode, "full");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a recorded event reports mode 'off' when modes.json persistently disables caveman", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    fs.mkdirSync(path.join(root, ".project", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, ".project", "skills", "modes.json"), JSON.stringify({ schemaVersion: 1, caveman: { enabled: false } }));
    await recordEvent({ vendor: "opencode", event: "message.completed", raw: { session_id: "session-1", message_id: "one", tokens: { input: 1, output: 1 } } }, root);
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    assert.equal(snapshot.current.mode, "off");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a recorded event has a null mode when modes.json does not exist", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    await recordEvent({ vendor: "opencode", event: "message.completed", raw: { session_id: "session-1", message_id: "one", tokens: { input: 1, output: 1 } } }, root);
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    assert.equal(snapshot.current.mode, null);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a recorded event has a null mode when modes.json resolves outside the project root via a symlinked ancestor", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-outside-"));
  try {
    fs.writeFileSync(path.join(outside, "modes.json"), JSON.stringify({ schemaVersion: 1, caveman: { default: "ultra" } }));
    fs.mkdirSync(path.join(root, ".project"));
    fs.symlinkSync(outside, path.join(root, ".project", "skills"));
    await recordEvent({ vendor: "opencode", event: "message.completed", raw: { session_id: "session-1", message_id: "one", tokens: { input: 1, output: 1 } } }, root);
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    assert.equal(snapshot.current.mode, null, "an escaping symlink must never leak an outside mode value into an attribution field");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("a recorded event has a null mode when modes.json exists but configures no caveman state", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    fs.mkdirSync(path.join(root, ".project", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, ".project", "skills", "modes.json"), JSON.stringify({ schemaVersion: 1 }));
    await recordEvent({ vendor: "opencode", event: "message.completed", raw: { session_id: "session-1", message_id: "one", tokens: { input: 1, output: 1 } } }, root);
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    assert.equal(snapshot.current.mode, null);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the mode field never affects the recentEventKeys dedup logic", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    fs.mkdirSync(path.join(root, ".project", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, ".project", "skills", "modes.json"), JSON.stringify({ schemaVersion: 1, caveman: { default: "lite" } }));
    const event = { vendor: "opencode", idempotencyKey: "message-mode-1", raw: { tokens: { input: 8, output: 2 } } };
    const first = await recordEvent(event, root);
    assert.equal(first.written, true);
    assert.equal(first.record.mode, "lite");

    // Changing the instance mode between the original event and its replay must not change
    // whether the replay is recognized as a duplicate: the dedup key is the event id, not mode.
    fs.writeFileSync(path.join(root, ".project", "skills", "modes.json"), JSON.stringify({ schemaVersion: 1, caveman: { default: "ultra" } }));
    const duplicate = await recordEvent(event, root);
    assert.equal(duplicate.written, false);
    assert.equal(duplicate.reason, "duplicate event");

    const snapshot = JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    assert.equal(snapshot.lifetime.agentCompletions, 1);
    assert.equal(snapshot.recentEventKeys.length, 1);
    assert.equal(snapshot.current.mode, "lite", "the original recorded mode is untouched by the later, rejected replay");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("deduplicates retried subagent completion hooks beyond the rolling comparison", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    const first = { vendor: "codex", event: "subagent-complete", raw: { session_id: "session-1", agent_id: "agent-1" } };
    await recordEvent(first, root);
    await recordEvent({ vendor: "codex", event: "subagent-complete", raw: { session_id: "session-1", agent_id: "agent-2" } }, root);
    await recordEvent({ vendor: "codex", event: "subagent-complete", raw: { session_id: "session-1", agent_id: "agent-3" } }, root);
    const duplicate = await recordEvent(first, root);
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    assert.equal(duplicate.reason, "duplicate event");
    assert.equal(snapshot.lifetime.agentCompletions, 3);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

async function withRoot(action) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    return await action(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const metricsFile = (root, name = "token-consumption.json") => path.join(root, ".project", "metrics", name);
const readSnapshot = (root) => JSON.parse(fs.readFileSync(metricsFile(root), "utf8"));
const message = (id, extra = {}) => ({ vendor: "opencode", event: "message.completed", agentType: "build", model: "p/m", idempotencyKey: id, raw: { tokens: { input: 10, output: 5 } }, ...extra });

// The exact shape a v1 collector wrote, including a Claude completion with no usage.
function v1Fixture() {
  const record = { id: "claude:s:agent-1:subagent-complete", identityKey: "claude:s:agent-1:subagent-complete", recordedAt: "2026-09-24T00:00:00.000Z", vendor: "claude", event: "subagent-complete", sessionId: "s", turnId: null, agentId: "agent-1", agentType: "Explore", model: null, status: "completed", metricScope: "completion", availability: "unavailable", tokens: { input: null, output: null, reasoning: null, cacheRead: null, cacheWrite: null, total: null }, costUsd: null, mode: null };
  return {
    schemaVersion: 1,
    updatedAt: record.recordedAt,
    current: record,
    previous: null,
    lifetime: { agentCompletions: 5, reportedUsageCount: 3, unavailableCount: 2, reportedCostUsd: 0, reportedCostCount: 3, tokens: { input: 90, output: 30, reasoning: 0, cacheRead: 7, cacheWrite: 0, total: 120 }, vendors: { opencode: { completions: 3, reportedUsageCount: 3, unavailableCount: 0, reportedCostUsd: 0 }, claude: { completions: 2, reportedUsageCount: 0, unavailableCount: 2, reportedCostUsd: 0 } } },
    recentEventKeys: [record.id],
  };
}

test("a v1 snapshot migrates to v2 without losing its lifetime totals", async () => {
  await withRoot(async (root) => {
    fs.mkdirSync(path.join(root, ".project", "metrics"));
    fs.writeFileSync(metricsFile(root), JSON.stringify(v1Fixture()));
    await recordEvent(message("m-1"), root);
    const snapshot = readSnapshot(root);
    assert.equal(snapshot.schemaVersion, 2);
    assert.equal(snapshot.lifetime.agentCompletions, 6);
    assert.equal(snapshot.lifetime.tokens.total, 135);
    assert.equal(snapshot.lifetime.vendors.claude.completions, 2);
    assert.equal(snapshot.lifetime.vendors.claude.pricedCount, 0);
    assert.ok(snapshot.dimensions.since);
    assert.equal(snapshot.dimensions.models.opencode["p/m"].completions, 1, "only post-migration completions are in the dimensions");
    assert.equal(snapshot.dimensions.models.claude, undefined);
  });
});

test("upgrading a completion recorded before migration never subtracts from dimension rows", async () => {
  await withRoot(async (root) => {
    fs.mkdirSync(path.join(root, ".project", "metrics"));
    fs.writeFileSync(metricsFile(root), JSON.stringify(v1Fixture()));
    await recordEvent({ vendor: "claude", event: "agent-result", agentType: "Explore", idempotencyKey: "tu-1", metricScope: "final_request", raw: { session_id: "s", usage: { input_tokens: 9, output_tokens: 6 } } }, root);
    const snapshot = readSnapshot(root);
    assert.equal(snapshot.lifetime.agentCompletions, 5, "the upgrade replaces the old completion, it does not add one");
    assert.equal(snapshot.dimensions.agents.claude.Explore.completions, 1);
    assert.equal(snapshot.dimensions.agents.claude.Explore.tokens, 15);
  });
});

test("applying then reversing a record returns the dimensions to their start, including the (other) bucket", () => {
  const snapshot = blankSnapshot();
  for (let index = 0; index < 25; index += 1) applyToSnapshot(snapshot, normalizedEvent(message(`m-${index}`, { model: `model-${index}` })), 1);
  const before = JSON.stringify(snapshot.dimensions);
  const overflow = normalizedEvent(message("m-x", { model: "model-26", costUsd: 0.25, effort: "high" }));
  applyToSnapshot(snapshot, overflow, 1);
  assert.equal(overflow.dimensions.models, "(other)");
  assert.equal(snapshot.dimensions.models.opencode["(other)"].completions, 1);
  assert.equal(snapshot.dimensions.efforts.opencode.high.pricedCount, 1);
  applyToSnapshot(snapshot, overflow, -1);
  assert.equal(JSON.stringify(snapshot.dimensions), before);
});

test("reversing a record uses its stored routing even after the cap has moved", async () => {
  await withRoot(async (root) => {
    // Same session, agent and turn, no idempotency key: the second event replaces the first.
    const event = (model) => ({ vendor: "opencode", agentType: "build", model, raw: { session_id: "s", turn_id: "t", tokens: { input: 1, output: 1 } } });
    for (let index = 0; index < 25; index += 1) await recordEvent({ vendor: "opencode", agentType: "build", model: `model-${index}`, idempotencyKey: `k-${index}`, raw: { tokens: { input: 1, output: 1 } } }, root);
    await recordEvent(event("model-26"), root);
    assert.equal(readSnapshot(root).dimensions.models.opencode["(other)"].completions, 1);
    await recordEvent(event("model-3"), root);
    const models = readSnapshot(root).dimensions.models.opencode;
    assert.equal(models["(other)"], undefined, "the replaced record left (other)");
    assert.equal(models["model-3"].completions, 2);
  });
});

test("reversing a row that was never applied fails loudly instead of clamping", () => {
  const record = normalizedEvent(message("m-1"));
  record.dimensions = { applied: true, models: "p/m", agents: "build", efforts: "(unreported)" };
  assert.throws(() => applyToSnapshot(blankSnapshot(), record, -1), /underflow/);
});

test("a skill event counts the skill and leaves every completion field untouched", async () => {
  await withRoot(async (root) => {
    await recordEvent(message("m-1"), root);
    const before = readSnapshot(root);
    await recordEvent({ vendor: "claude", event: "skill-use", raw: { tool_use_id: "tu-9", tool_input: { skill: "shape", args: "SECRET-ARGS-MARKER" }, effort: { level: "high" } } }, root);
    await recordEvent({ vendor: "claude", event: "skill-use", raw: { tool_use_id: "tu-9", tool_input: { skill: "shape" } } }, root);
    const after = readSnapshot(root);
    assert.deepEqual(after.current, before.current);
    assert.deepEqual(after.previous, before.previous);
    assert.equal(after.lifetime.agentCompletions, before.lifetime.agentCompletions);
    assert.deepEqual(after.recentEventKeys, before.recentEventKeys);
    assert.equal(after.dimensions.skills.claude.shape.uses, 1, "a replayed tool_use_id is counted once");
    assert.deepEqual(after.recentSkillKeys, ["claude:tu-9"]);
    for (const name of ["token-consumption.json", "token-consumption.md", "token-consumption.html"]) {
      assert.doesNotMatch(fs.readFileSync(metricsFile(root, name), "utf8"), /SECRET-ARGS-MARKER/, `${name} never carries skill args`);
    }
  });
});

test("a skill event without a usable name records nothing", async () => {
  await withRoot(async (root) => {
    const result = await recordEvent({ vendor: "claude", event: "skill-use", raw: { tool_input: { args: "only args" } } }, root);
    assert.equal(result.written, false);
    assert.equal(fs.existsSync(metricsFile(root)), false);
  });
});

test("payload-controlled names can never write to Object.prototype", async () => {
  await withRoot(async (root) => {
    for (let round = 0; round < 2; round += 1) {
      await recordEvent({ vendor: "__proto__", agentType: "__proto__", model: "__proto__", effort: "__proto__", idempotencyKey: `k-${round}`, raw: { tokens: { input: 3, output: 4 } } }, root);
      await recordEvent({ vendor: "__proto__", event: "skill-use", skill: "__proto__", idempotencyKey: `s-${round}` }, root);
      await recordEvent({ vendor: "opencode", agentType: "constructor", model: "prototype", effort: "constructor", idempotencyKey: `c-${round}`, raw: { tokens: { input: 1, output: 1 } } }, root);
    }
    assert.equal({}.completions, undefined);
    assert.equal({}.uses, undefined);
    assert.equal({}.tokens, undefined);
    assert.deepEqual(Object.keys(Object.prototype), []);
    const snapshot = readSnapshot(root);
    assert.equal(Object.getOwnPropertyDescriptor(snapshot.lifetime.vendors, "__proto__").value.completions, 2, "a __proto__ vendor is an ordinary own key, kept across a reload");
    assert.equal(snapshot.dimensions.models.opencode["(other)"].completions, 2, "reserved names fold into (other)");
    assert.equal(snapshot.dimensions.skills.opencode, undefined);
    assert.equal(Object.getOwnPropertyDescriptor(snapshot.dimensions.skills, "__proto__").value["(other)"].uses, 2);
  });
});

test("names are truncated to 80 characters and the 26th distinct name goes to (other)", async () => {
  await withRoot(async (root) => {
    await recordEvent(message("long", { model: "x".repeat(200) }), root);
    for (let index = 0; index < 25; index += 1) await recordEvent(message(`m-${index}`, { model: `model-${index}` }), root);
    const models = readSnapshot(root).dimensions.models.opencode;
    assert.equal(models["x".repeat(80)].completions, 1);
    assert.equal(models["x".repeat(81)], undefined);
    assert.equal(models["(other)"].completions, 1, "25 real names fit; the 26th is folded");
    assert.equal(Object.keys(models).length, 26);
  });
});

test("a reported cost of 0 is not counted as priced", async () => {
  await withRoot(async (root) => {
    await recordEvent(message("free", { costUsd: 0 }), root);
    await recordEvent(message("paid", { costUsd: 0.5 }), root);
    const snapshot = readSnapshot(root);
    assert.equal(snapshot.dimensions.models.opencode["p/m"].pricedCount, 1);
    assert.equal(snapshot.dimensions.models.opencode["p/m"].costUsd, 0.5);
    assert.equal(snapshot.lifetime.vendors.opencode.pricedCount, 1);
  });
});

test("an async Claude launch leaves a model note instead of a completion, and the stop event uses it", async () => {
  await withRoot(async (root) => {
    const launch = { vendor: "claude", event: "agent-result", raw: { hook_event_name: "PostToolUse", session_id: "s", tool_use_id: "tu-1", effort: { level: "xhigh" }, tool_input: { subagent_type: "Explore", prompt: "PROMPT-MARKER" }, tool_response: { isAsync: true, status: "async_launched", agentId: "agent-7", resolvedModel: "claude-sonnet-5", prompt: "PROMPT-MARKER" } } };
    await recordEvent(launch, root);
    let snapshot = readSnapshot(root);
    assert.equal(snapshot.lifetime.agentCompletions, 0, "a launch is not a completion");
    assert.equal(snapshot.current, null);
    assert.equal(snapshot.agentModels["agent:claude:agent-7"], "claude-sonnet-5");
    await recordEvent({ vendor: "claude", event: "subagent-complete", raw: { hook_event_name: "SubagentStop", session_id: "s", agent_id: "agent-7", agent_type: "Explore", effort: { level: "xhigh" }, last_assistant_message: "REPLY-MARKER" } }, root);
    snapshot = readSnapshot(root);
    assert.equal(snapshot.lifetime.agentCompletions, 1);
    assert.equal(snapshot.current.model, "claude-sonnet-5");
    assert.equal(snapshot.agentModels["agent:claude:agent-7"], undefined, "a note is consumed once");
    assert.equal(snapshot.dimensions.models.claude["claude-sonnet-5"].completions, 1);
    assert.equal(snapshot.dimensions.models.claude["(unreported)"], undefined);
    assert.equal(snapshot.dimensions.agents.claude.Explore.completions, 1);
    assert.equal(snapshot.dimensions.efforts.claude.xhigh.completions, 1);
    assert.doesNotMatch(fs.readFileSync(metricsFile(root), "utf8"), /PROMPT-MARKER|REPLY-MARKER/);
  });
});

test("agent model notes stay bounded", async () => {
  await withRoot(async (root) => {
    for (let index = 0; index < 60; index += 1) {
      await recordEvent({ vendor: "claude", event: "agent-result", raw: { session_id: "s", tool_use_id: `tu-${index}`, tool_response: { isAsync: true, status: "async_launched", agentId: `agent-${index}`, resolvedModel: "m" } } }, root);
    }
    const notes = Object.keys(readSnapshot(root).agentModels);
    assert.equal(notes.length, 50);
    assert.equal(notes.includes("agent:claude:agent-0"), false);
    assert.equal(notes.includes("agent:claude:agent-59"), true);
  });
});

test("reversing more than a row holds fails loudly, and a float rounding residue does not", () => {
  const snapshot = blankSnapshot();
  const small = normalizedEvent(message("small", { costUsd: 0.1 }));
  applyToSnapshot(snapshot, small, 1);
  const large = normalizedEvent(message("large"));
  large.dimensions = small.dimensions;
  large.tokens.total = 999;
  assert.throws(() => applyToSnapshot(snapshot, large, -1), /underflow/);

  const floats = blankSnapshot();
  const first = normalizedEvent(message("f1", { costUsd: 0.1 }));
  const second = normalizedEvent(message("f2", { costUsd: 0.2 }));
  applyToSnapshot(floats, first, 1);
  applyToSnapshot(floats, second, 1);
  applyToSnapshot(floats, first, -1);
  applyToSnapshot(floats, second, -1);
  assert.deepEqual(Object.keys(floats.dimensions.models), [], "rows and empty vendor maps are removed at zero");
});

test("keeps colon-separated identities distinct", async () => {
  await withRoot(async (root) => {
    const first = { vendor: "claude", sessionId: "a:b", agentId: "c", turnId: "d" };
    const second = { vendor: "claude", sessionId: "a", agentId: "b:c", turnId: "d" };
    assert.notEqual(normalizedEvent(first).identityKey, normalizedEvent(second).identityKey);
    await recordEvent(first, root);
    await recordEvent(second, root);
    assert.equal(readSnapshot(root).lifetime.agentCompletions, 2);
    assert.notEqual(normalizedEvent({ vendor: "claude", sessionId: "s", agentId: "Explore" }).identityKey, normalizedEvent({ vendor: "claude", sessionId: "s", agentType: "Explore" }).identityKey);
  });
});

test("counts type-only subagent completions separately and still deduplicates explicit keys", async () => {
  await withRoot(async (root) => {
    const input = { vendor: "claude", event: "subagent-complete", sessionId: "s", agentType: "Explore" };
    await recordEvent(input, root);
    await recordEvent(input, root);
    assert.equal(readSnapshot(root).lifetime.agentCompletions, 2);
    await recordEvent({ ...input, idempotencyKey: "stable" }, root);
    await recordEvent({ ...input, idempotencyKey: "stable" }, root);
    assert.equal(readSnapshot(root).lifetime.agentCompletions, 3);
  });
});

const CLI = path.join(__dirname, "token-consumption.js");
const runCli = (root, event, payload, vendor = "claude") => spawnSync(process.execPath, [CLI, "--vendor", vendor, "--event", event, "--root", root], { input: typeof payload === "string" ? payload : JSON.stringify(payload), encoding: "utf8" });

test("the CLI records a Claude skill-use payload from stdin and never stores its args", async () => {
  await withRoot(async (root) => {
    const result = runCli(root, "skill-use", { tool_use_id: "tu-1", tool_input: { skill: "plan", args: "CLI-ARGS-MARKER" }, effort: { level: "high" } });
    assert.equal(result.status, 0);
    const snapshot = readSnapshot(root);
    assert.equal(snapshot.dimensions.skills.claude.plan.uses, 1);
    assert.equal(snapshot.lifetime.agentCompletions, 0);
    assert.doesNotMatch(fs.readFileSync(metricsFile(root), "utf8"), /CLI-ARGS-MARKER/);
  });
});

test("the CLI records a subagent completion and exits 0 on unusable input without echoing it", async () => {
  await withRoot(async (root) => {
    assert.equal(runCli(root, "subagent-complete", { session_id: "s", agent_id: "a1", agent_type: "Explore", effort: { level: "low" } }).status, 0);
    assert.equal(readSnapshot(root).dimensions.efforts.claude.low.completions, 1);
    const bad = runCli(root, "skill-use", "my secret prompt text");
    assert.equal(bad.status, 0, "telemetry never blocks the agent");
    assert.match(bad.stderr, /stdin is not valid JSON/);
    assert.doesNotMatch(bad.stderr, /secret/, "the parse error must not quote the payload");
    assert.equal(runCli(root, "skill-use", "").status, 0, "an empty payload is not an error");
  });
});

test("names outside the identifier allow-list are reported as (other), never stored", async () => {
  await withRoot(async (root) => {
    await recordEvent({ vendor: "claude", event: "agent-result", raw: { session_id: "s", tool_use_id: "t", tool_input: { subagent_type: "[click](https://evil.example/x)" }, tool_response: { agentId: "a", resolvedModel: "![b](https://evil.example/b.png)" }, effort: { level: "\u001b]0;title\u0007" } } }, root);
    await recordEvent({ vendor: "claude", event: "skill-use", raw: { tool_use_id: "u", tool_input: { skill: "<img src=x onerror=1>" } } }, root);
    for (const name of ["token-consumption.json", "token-consumption.md", "token-consumption.html"]) {
      const text = fs.readFileSync(metricsFile(root, name), "utf8");
      assert.doesNotMatch(text, /evil\.example|onerror|\u001b/, `${name} carries none of the unsafe names`);
    }
    const snapshot = readSnapshot(root);
    assert.equal(snapshot.dimensions.models.claude["(other)"].completions, 1);
    assert.equal(snapshot.dimensions.skills.claude["(other)"].uses, 1);
    assert.equal((await recordEvent({ vendor: "claude", event: "agent-result", raw: { tool_response: { resolvedModel: "claude-sonnet-5" } } }, root)).record.model, "claude-sonnet-5", "real model ids pass the allow-list");
    for (const name of ["gpt-5.6-terra", "openai/gpt-5.6-terra", "plugin:skill", "anthropic.claude-v1:0", "@scope/pkg"]) {
      assert.equal(normalizedEvent({ vendor: "opencode", model: name }).model, name);
    }
  });
});

test("ids and status are bounded, and free-text status is not stored", async () => {
  await withRoot(async (root) => {
    const long = "z".repeat(5000);
    await recordEvent({ vendor: "claude", event: "agent-result", raw: { session_id: long, tool_use_id: long, stop_reason: `my prompt was: ${long}`, tool_response: { agentId: long, isAsync: false } } }, root);
    const { current } = readSnapshot(root);
    assert.equal(current.sessionId.length, 128);
    assert.equal(current.agentId.length, 128);
    assert.deepEqual(JSON.parse(current.id), ["claude", "event", "z".repeat(128)]);
    assert.equal(current.status, "(other)");
    assert.ok(fs.statSync(metricsFile(root)).size < 20000);
  });
});

test("an implausible cost or token count is treated as unreported instead of wedging an aggregate", async () => {
  await withRoot(async (root) => {
    const event = (id, cost, agent) => ({ vendor: "opencode", agentType: agent, model: "p/m", costUsd: cost, raw: { session_id: "s", turn_id: agent, message_id: id, tokens: { input: 1, output: 1 } } });
    await recordEvent(event("a", 1e20, "A"), root);
    await recordEvent(event("b", 1, "B"), root);
    await recordEvent({ ...event("c", 1, "A"), idempotencyKey: undefined, raw: { session_id: "s", turn_id: "A", tokens: { input: 2, output: 2 } } }, root);
    const models = readSnapshot(root).dimensions.models.opencode["p/m"];
    assert.equal(models.pricedCount, 2, "the 1e20 cost was dropped, the two real costs counted");
    assert.equal(normalizedEvent({ vendor: "opencode", raw: { tokens: { input: 1e308, output: 1 } } }).tokens.input, null);
  });
});

test("a metrics directory or .project that is a symlink out of the root is refused, and nothing is written there", async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  try {
    const victim = path.join(base, "victim");
    fs.mkdirSync(victim);
    fs.writeFileSync(path.join(victim, "token-consumption.md"), "precious");
    const repo = path.join(base, "repo");
    fs.mkdirSync(path.join(repo, ".project"), { recursive: true });
    fs.symlinkSync(victim, path.join(repo, ".project", "metrics"));
    const blocked = await recordEvent(message("m-1"), repo);
    assert.equal(blocked.written, false);
    assert.match(blocked.reason, /outside the project root/);
    assert.equal(fs.readFileSync(path.join(victim, "token-consumption.md"), "utf8"), "precious");
    assert.deepEqual(fs.readdirSync(victim), ["token-consumption.md"]);

    const other = path.join(base, "other");
    fs.mkdirSync(other);
    const linked = path.join(base, "linked");
    fs.mkdirSync(linked);
    fs.symlinkSync(other, path.join(linked, ".project"));
    assert.equal((await recordEvent(message("m-2"), linked)).written, false);
    assert.deepEqual(fs.readdirSync(other), [], "no metrics directory was created through the symlink");

    const inside = path.join(base, "inside");
    fs.mkdirSync(path.join(inside, "real-metrics"), { recursive: true });
    fs.mkdirSync(path.join(inside, ".project"));
    fs.symlinkSync(path.join(inside, "real-metrics"), path.join(inside, ".project", "metrics"));
    assert.equal((await recordEvent(message("m-3"), inside)).written, true, "a symlink that stays inside the root is allowed");
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test("agent model notes keep the newest entries even when agent ids are all digits", async () => {
  await withRoot(async (root) => {
    for (let index = 100; index >= 0; index -= 1) {
      await recordEvent({ vendor: "claude", event: "agent-result", raw: { session_id: "s", tool_use_id: `tu-${index}`, tool_response: { isAsync: true, status: "async_launched", agentId: String(index), resolvedModel: "m" } } }, root);
    }
    const notes = Object.keys(readSnapshot(root).agentModels);
    assert.equal(notes.length, 50);
    assert.equal(notes.includes("agent:claude:0"), true, "the newest note survives");
    assert.equal(notes.includes("agent:claude:100"), false, "the oldest note was evicted");
  });
});

test("reversing costs in a different order than they were added does not trip on float residue", () => {
  // 0.1 + 0.7 - 0.7 - 0.1 is -2.8e-17 in IEEE doubles: a real reversal must not read as an underflow.
  const snapshot = blankSnapshot();
  const first = normalizedEvent(message("f1", { costUsd: 0.1 }));
  const second = normalizedEvent(message("f2", { costUsd: 0.7 }));
  applyToSnapshot(snapshot, first, 1);
  applyToSnapshot(snapshot, second, 1);
  applyToSnapshot(snapshot, second, -1);
  assert.doesNotThrow(() => applyToSnapshot(snapshot, first, -1));
  assert.deepEqual(Object.keys(snapshot.dimensions.models), []);
});

// ---- Independent re-review (S2): findings verified against the real collector ----

const COLLECTOR = path.join(__dirname, "token-consumption.js");
function metricsRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-review-"));
  fs.mkdirSync(path.join(root, ".project"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
const snapshotFile = (root) => path.join(root, ".project", "metrics", "token-consumption.json");
const readSnap = (root) => JSON.parse(fs.readFileSync(snapshotFile(root), "utf8"));
const cli = (root, payload, args = ["--vendor", "claude", "--event", "subagent-complete"], timeout = 8000) => spawnSync(process.execPath, [COLLECTOR, ...args, "--root", root], { input: typeof payload === "string" ? payload : JSON.stringify(payload), encoding: "utf8", timeout, maxBuffer: 1 << 26 });
const event = (extra = {}) => ({ vendor: "claude", event: "subagent-complete", raw: { agent_type: "x", model: "m", usage: { input_tokens: 5 }, session_id: "s", agent_id: "a", ...extra } });

test("fractional token counts are treated as unreported, so a later reversal can never underflow and lose an event", async (t) => {
  const root = metricsRoot(t);
  const send = async (turn, tokens) => recordEvent({ vendor: "opencode", event: "agent-complete", raw: { usage: { input_tokens: tokens }, model: "m", session_id: "s", turn_id: turn } }, root);
  await send("a", 0.3); await send("b", 0.6); await send("a", 0);
  await assert.doesNotReject(() => send("b", 0));
  assert.equal(readSnap(root).lifetime.tokens.total, 0);
});

test("a caveman mode from modes.json is one short lowercase word or it is not stored", async (t) => {
  for (const [value, expected] of [["full", "full"], ["wenyan-lite", "wenyan-lite"], ["[x](https://evil.example)", null], ["x".repeat(100000), null], ["Full", null], ["a b", null]]) {
    const root = metricsRoot(t);
    fs.mkdirSync(path.join(root, ".project/skills"), { recursive: true });
    fs.writeFileSync(path.join(root, ".project/skills/modes.json"), JSON.stringify({ schemaVersion: 1, caveman: { enabled: true, default: value } }));
    await recordEvent(event(), root);
    const snapshot = readSnap(root);
    assert.equal(snapshot.current.mode, expected, JSON.stringify(value).slice(0, 40));
    assert.ok(fs.statSync(snapshotFile(root)).size < 20000);
    assert.doesNotMatch(fs.readFileSync(path.join(root, ".project/metrics/token-consumption.md"), "utf8"), /evil\.example/);
  }
});

test("a hostile event name is bounded and allow-listed, and stdin is capped", (t) => {
  const root = metricsRoot(t);
  cli(root, { hook_event_name: "E".repeat(500000), agent_type: "x", model: "m", usage: { input_tokens: 5 } }, ["--vendor", "claude"]);
  assert.ok(fs.statSync(snapshotFile(root)).size < 20000, "the snapshot stays small");
  assert.equal(readSnap(root).current.event.length <= 80, true);
  const big = cli(metricsRoot(t), JSON.stringify({ agent_type: "x", pad: "P".repeat(2000000) }));
  assert.match(big.stderr, /stdin is larger than 1 MB/);
  assert.equal(big.status, 0, "the hook never exits nonzero");
});

test("a FIFO or a symlink at the snapshot path is refused without blocking or reading it, and is never overwritten", async (t) => {
  const fifoRoot = metricsRoot(t);
  fs.mkdirSync(path.join(fifoRoot, ".project/metrics"), { recursive: true });
  assert.equal(spawnSync("mkfifo", [snapshotFile(fifoRoot)]).status, 0);
  const started = Date.now();
  const fifo = cli(fifoRoot, event().raw, undefined, 5000);
  assert.equal(fifo.error, undefined, "the hook must return, not hang on the pipe");
  assert.ok(Date.now() - started < 4000);
  assert.match(fifo.stderr, /not a regular file/);

  const linkRoot = metricsRoot(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.mkdirSync(path.join(linkRoot, ".project/metrics"), { recursive: true });
  fs.writeFileSync(path.join(outside, "s.json"), JSON.stringify({ schemaVersion: 2, lifetime: { agentCompletions: 0, reportedUsageCount: 0, unavailableCount: 0, tokens: { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, vendors: {} }, recentEventKeys: [], secretkey: "OUTSIDE-CONTENT" }));
  fs.symlinkSync(path.join(outside, "s.json"), snapshotFile(linkRoot));
  const result = await recordEvent(event(), linkRoot);
  assert.equal(result.written, false);
  assert.match(result.reason, /symlink or not a regular file/);
  assert.ok(fs.lstatSync(snapshotFile(linkRoot)).isSymbolicLink(), "the link was left alone");
  assert.doesNotMatch(fs.readFileSync(path.join(outside, "s.json"), "utf8"), /"agentCompletions": [1-9]/);
});

test("a snapshot from a newer schema is not read, downgraded or overwritten; an oversize one is refused", async (t) => {
  const root = metricsRoot(t);
  fs.mkdirSync(path.join(root, ".project/metrics"), { recursive: true });
  const original = JSON.stringify({ schemaVersion: 3, lifetime: { agentCompletions: 500 }, recentEventKeys: [] });
  fs.writeFileSync(snapshotFile(root), original);
  const result = await recordEvent(event(), root);
  assert.equal(result.written, false);
  assert.match(result.reason, /schemaVersion 3 is newer/);
  assert.equal(fs.readFileSync(snapshotFile(root), "utf8"), original);
  fs.writeFileSync(snapshotFile(root), `{"schemaVersion":2,"pad":"${"x".repeat(5 * 1024 * 1024)}"}`);
  assert.match((await recordEvent(event(), root)).reason, /larger than 4 MB/);
});

test("a well-formed snapshot with the wrong shape starts a fresh one instead of breaking every later event", async (t) => {
  for (const bad of [{ schemaVersion: 2, lifetime: {}, recentEventKeys: [] }, { schemaVersion: 2, lifetime: { agentCompletions: 1, reportedUsageCount: 0, unavailableCount: 0, tokens: null, vendors: {} }, recentEventKeys: [] }, { schemaVersion: 2, lifetime: { agentCompletions: "1", reportedUsageCount: 0, unavailableCount: 0, tokens: { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, recentEventKeys: [] }]) {
    const root = metricsRoot(t);
    fs.mkdirSync(path.join(root, ".project/metrics"), { recursive: true });
    fs.writeFileSync(snapshotFile(root), JSON.stringify(bad));
    assert.equal((await recordEvent(event(), root)).written, true);
    assert.equal(readSnap(root).lifetime.agentCompletions, 1);
    assert.equal((await recordEvent(event({ agent_id: "b" }), root)).written, true, "the second event works too");
    assert.ok(fs.existsSync(path.join(root, ".project/metrics/token-consumption.md")));
  }
});

test("a model note left by one vendor is never consumed by another vendor's completion", async (t) => {
  const root = metricsRoot(t);
  await recordEvent({ vendor: "claude", event: "agent-result", raw: { agent_id: "AID", tool_response: { isAsync: true, status: "async_launched", agentId: "AID" }, resolvedModel: "claude-secret-model" } }, root);
  await recordEvent({ vendor: "codex", event: "subagent-complete", raw: { agent_id: "AID", session_id: "s", usage: { input_tokens: 5 } } }, root);
  const models = readSnap(root).dimensions.models;
  assert.equal(JSON.stringify(models).includes("claude-secret-model"), false, JSON.stringify(models));
});

test("an unset model built from missing parts is reported as unreported, not as a model named undefined/undefined", async (t) => {
  const root = metricsRoot(t);
  await recordEvent({ vendor: "opencode", event: "message.completed", model: "undefined/undefined", raw: { session_id: "s", message_id: "m1", tokens: { input: 5, output: 1 } } }, root);
  await recordEvent({ vendor: "opencode", event: "message.completed", model: "openai/undefined", raw: { session_id: "s", message_id: "m2", tokens: { input: 5, output: 1 } } }, root);
  const models = Object.keys(readSnap(root).dimensions.models.opencode);
  assert.deepEqual(models, ["(unreported)"]);
});

test("error output carries a code and no absolute path, even for a dangling metrics symlink, and creates nothing outside the project", (t) => {
  const root = metricsRoot(t);
  const gone = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gone-")), "missing");
  t.after(() => fs.rmSync(path.dirname(gone), { recursive: true, force: true }));
  fs.symlinkSync(gone, path.join(root, ".project/metrics"));
  const result = cli(root, event().raw);
  assert.equal(result.status, 0);
  assert.ok(!result.stderr.includes(root) && !result.stderr.includes(gone), result.stderr);
  assert.match(result.stderr, /skipped: metrics directory resolves outside the project root/, "refused before mkdir could follow the link");
  assert.equal(fs.existsSync(gone), false, "mkdir did not follow the dangling link outside the project");
});

test("a report that cannot be rendered does not stop the next event from being recorded, and no temp file is left behind", async (t) => {
  const root = metricsRoot(t);
  await recordEvent(event(), root);
  fs.rmSync(path.join(root, ".project/metrics/token-consumption.md"));
  fs.mkdirSync(path.join(root, ".project/metrics/token-consumption.md"));
  const second = await recordEvent(event({ agent_id: "b" }), root);
  assert.equal(second.written, true);
  assert.equal(second.warning, "reports could not be rendered");
  assert.equal(readSnap(root).lifetime.agentCompletions, 2);
  assert.deepEqual(fs.readdirSync(path.join(root, ".project/metrics")).filter((name) => name.endsWith(".tmp")), []);
});

test("stored current and previous records with the wrong shape start a fresh snapshot", async (t) => {
  const lifetime = { agentCompletions: 1, reportedUsageCount: 0, unavailableCount: 0, tokens: { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, vendors: {} };
  for (const bad of [{ current: {} }, { current: { tokens: null, identityKey: "k" } }, { previous: { tokens: {}, identityKey: 5 } }, { current: "x" }]) {
    const root = metricsRoot(t);
    fs.mkdirSync(path.join(root, ".project/metrics"), { recursive: true });
    fs.writeFileSync(snapshotFile(root), JSON.stringify({ schemaVersion: 2, lifetime, recentEventKeys: [], ...bad }));
    assert.equal((await recordEvent(event(), root)).written, true, JSON.stringify(bad));
    assert.equal(readSnap(root).lifetime.agentCompletions, 1, "the malformed snapshot was replaced, not extended");
  }
});

test("a file-system error reaches stderr as a code, never with the project path", async (t) => {
  if (process.getuid && process.getuid() === 0) return;
  const root = metricsRoot(t);
  await recordEvent(event(), root);
  const directory = path.join(root, ".project/metrics");
  fs.chmodSync(directory, 0o555);
  try {
    const result = cli(root, event({ agent_id: "b" }).raw);
    assert.equal(result.status, 0);
    assert.match(result.stderr, /file system error \(EACCES\)/);
    assert.ok(!result.stderr.includes(root), result.stderr);
  } finally { fs.chmodSync(directory, 0o755); }
});

// ---- Audit cycle 2 of the S2 re-review ----

test("a FIFO or oversize modes.json is skipped without blocking, and the mode simply stays unavailable", async (t) => {
  const fifoRoot = metricsRoot(t);
  fs.mkdirSync(path.join(fifoRoot, ".project/skills"), { recursive: true });
  assert.equal(spawnSync("mkfifo", [path.join(fifoRoot, ".project/skills/modes.json")]).status, 0);
  const started = Date.now();
  const result = cli(fifoRoot, event().raw, undefined, 5000);
  assert.equal(result.error, undefined, "the hook must return, not hang holding the lock");
  assert.ok(Date.now() - started < 4000);
  assert.equal(readSnap(fifoRoot).current.mode, null);
  assert.equal((await recordEvent(event({ agent_id: "b" }), fifoRoot)).written, true, "the lease was released: the next event records");

  const bigRoot = metricsRoot(t);
  fs.mkdirSync(path.join(bigRoot, ".project/skills"), { recursive: true });
  fs.writeFileSync(path.join(bigRoot, ".project/skills/modes.json"), `{"schemaVersion":1,"caveman":{"enabled":true,"default":"full"},"pad":"${"x".repeat(200 * 1024)}"}`);
  await recordEvent(event(), bigRoot);
  assert.equal(readSnap(bigRoot).current.mode, null, "an oversize modes.json is not read");
});

test("a snapshot whose dimension rows or stored routing are hostile is replaced, not left to fail every later event", async (t) => {
  const seeded = async (mutate) => {
    const root = metricsRoot(t);
    await recordEvent(event(), root);
    const snapshot = readSnap(root);
    mutate(snapshot);
    fs.writeFileSync(snapshotFile(root), JSON.stringify(snapshot));
    return root;
  };
  const cases = [
    (s) => { s.dimensions.efforts.claude["(unreported)"].completions = -5; },
    (s) => { s.dimensions.models.claude.m.tokens = "x"; },
    (s) => { s.dimensions.agents = "nope"; },
    (s) => { s.current.dimensions = { applied: true, models: { not: "a string" } }; },
    (s) => { s.lifetime.reportedCostUsd = "7"; },
    (s) => { s.lifetime.vendors.claude.completions = -1; },
  ];
  for (const [index, mutate] of cases.entries()) {
    const root = await seeded(mutate);
    for (const id of ["b", "c", "d"]) assert.equal(cli(root, event({ agent_id: id }).raw).stderr, "", `case ${index}`);
    assert.equal(readSnap(root).lifetime.agentCompletions, 3, `case ${index}: events are recorded again`);
  }
});

test("a model note read back from the snapshot goes through the same allow-list as a payload name", async (t) => {
  const root = metricsRoot(t);
  await recordEvent(event(), root);
  const snapshot = readSnap(root);
  snapshot.agentModels["agent:claude:b"] = "[x](https://evil.example)";
  fs.writeFileSync(snapshotFile(root), JSON.stringify(snapshot));
  await recordEvent({ vendor: "claude", event: "subagent-complete", raw: { agent_id: "b", session_id: "s2", usage: { input_tokens: 5 } } }, root);
  assert.equal(JSON.stringify(readSnap(root)).includes("evil.example"), false);
});

test("the stdin cap counts bytes, not characters", (t) => {
  const root = metricsRoot(t);
  const wide = cli(root, JSON.stringify({ agent_type: "x", pad: "€".repeat(500000) }));
  assert.match(wide.stderr, /stdin is larger than 1 MB/, "1.5 MB of 3-byte characters exceeds the cap");
});

test("a snapshot rejected for its shape is replaced but kept aside, and a stored routing that resolves to no row is rejected", async (t) => {
  const root = metricsRoot(t);
  fs.mkdirSync(path.join(root, ".project/metrics"), { recursive: true });
  const hostile = JSON.stringify({ schemaVersion: 2, lifetime: { agentCompletions: 500, reportedUsageCount: 0, unavailableCount: 0, tokens: { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, vendors: { claude: {} } }, recentEventKeys: [] });
  fs.writeFileSync(snapshotFile(root), hostile);
  await recordEvent(event(), root);
  assert.equal(readSnap(root).lifetime.agentCompletions, 1);
  assert.equal(fs.readFileSync(`${snapshotFile(root)}.rejected`, "utf8"), hostile, "the rejected snapshot's history is preserved");
  // routing names must resolve to a real row
  const seeded = metricsRoot(t);
  await recordEvent({ vendor: "claude", event: "subagent-complete", raw: { agent_type: "x", session_id: "s", agent_id: "a" } }, seeded);
  const snapshot = readSnap(seeded);
  snapshot.current.dimensions = { applied: true, models: "no-such-row", agents: "x", efforts: "(unreported)" };
  fs.writeFileSync(snapshotFile(seeded), JSON.stringify(snapshot));
  assert.equal(cli(seeded, { agent_type: "x", usage: { input_tokens: 5 }, session_id: "s2" }, ["--vendor", "claude", "--event", "agent-result"]).stderr, "", "no underflow: the file was rejected up front");
  assert.equal(fs.existsSync(`${snapshotFile(seeded)}.rejected`), true);
});

test("rows, vendors, stored tokens and model notes must carry every counter: one missing field cannot wipe the history on a later read", async (t) => {
  const cases = [
    (s) => { s.dimensions.models.claude.m = {}; },
    (s) => { s.lifetime.vendors.claude = {}; },
    (s) => { s.agentModels = null; },
    (s) => { s.agentModels = { "agent:claude:b": 5 }; },
    (s) => { s.current.tokens = { total: 5 }; },
    (s) => { s.current.vendor = 5; },
    (s) => { s.dimensions.skills = { claude: { foo: {} } }; },
  ];
  for (const [index, mutate] of cases.entries()) {
    const root = metricsRoot(t);
    for (const id of ["a", "b", "c"]) await recordEvent(event({ agent_id: id, session_id: `s${id}` }), root);
    const snapshot = readSnap(root);
    mutate(snapshot);
    fs.writeFileSync(snapshotFile(root), JSON.stringify(snapshot));
    await recordEvent(event({ agent_id: "z", session_id: "sz" }), root);
    await recordEvent(event({ agent_id: "y", session_id: "sy" }), root);
    const after = readSnap(root).lifetime;
    assert.equal(after.agentCompletions, 2, `case ${index}: the shape was rejected once, up front, and counting resumed cleanly`);
    assert.ok(fs.existsSync(`${snapshotFile(root)}.rejected`), `case ${index}: the rejected file was kept`);
  }
});

test("a real-shaped snapshot from this collector validates and keeps its totals across further events", async (t) => {
  const root = metricsRoot(t);
  for (const id of ["a", "b", "c", "d"]) await recordEvent(event({ agent_id: id, session_id: `s${id}` }), root);
  await recordEvent({ vendor: "opencode", event: "skill-use", skill: "plan", raw: {} }, root);
  await recordEvent({ vendor: "claude", event: "agent-result", raw: { agent_id: "L", tool_response: { isAsync: true, status: "async_launched", agentId: "L" }, resolvedModel: "claude-x" } }, root);
  for (const id of ["e", "f"]) await recordEvent(event({ agent_id: id, session_id: `s${id}` }), root);
  assert.equal(readSnap(root).lifetime.agentCompletions, 6);
  assert.equal(fs.existsSync(`${snapshotFile(root)}.rejected`), false, "nothing the collector itself wrote is ever rejected");
});

// ---- collector-robustness C3: every writer holds the kernel lease (metrics-lock.js) ----

const { endpointFor } = require("./metrics-lock.js");
// A lease or test server left open by a failed assertion must fail this file, not hang it (see metrics-lock.test.js).
require("node:test").after(() => { setTimeout(() => process.exit(), 2000).unref(); });
const net = require("node:net");
const { spawn } = require("node:child_process");

// Each child waits at a barrier (one stdin line) so all of them contend at once, then records five
// events of its own plus one event whose id every child shares.
const WRITER = `
const { recordEvent } = require(process.argv[1]);
const [root, prefix] = [process.argv[2], process.argv[3]];
const send = async (id) => (await recordEvent({ vendor: "opencode", event: "message.completed", agentType: "build", model: "p/m", idempotencyKey: id, raw: { tokens: { input: 1, output: 1 } } }, root, { lock: { waitMs: 20000 } })).written;
process.stdin.once("data", async () => {
  const written = [];
  for (let index = 0; index < 5; index += 1) written.push(await send(prefix + "-" + index));
  written.push(await send("shared"));
  process.stdout.write(JSON.stringify(written) + "\\n");
  process.stdin.pause();
});
process.stdout.write("ready\\n");`;

test("concurrent writer processes keep exact totals, and a shared event id is counted once", async (t) => {
  const root = metricsRoot(t);
  const writers = Array.from({ length: 6 }, (_, index) => {
    const child = spawn(process.execPath, ["-e", WRITER, COLLECTOR, root, `w${index}`], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    let errors = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { errors += chunk; });
    t.after(() => { if (child.exitCode === null) child.kill("SIGKILL"); });
    const exited = new Promise((resolve) => child.on("exit", resolve));
    const ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("writer never reached the barrier")), 5000);
      child.stdout.on("data", () => { if (output.includes("ready")) { clearTimeout(timer); resolve(); } });
    });
    return { child, exited, ready, result: () => ({ output, errors }) };
  });
  await Promise.all(writers.map((writer) => writer.ready));
  for (const writer of writers) writer.child.stdin.write("go\n");
  const codes = await Promise.race([Promise.all(writers.map((writer) => writer.exited)), new Promise((_, reject) => setTimeout(() => reject(new Error("writers did not finish")), 60000).unref())]);
  assert.deepEqual(codes, [0, 0, 0, 0, 0, 0]);
  const results = writers.map((writer) => { const { output, errors } = writer.result(); assert.equal(errors, ""); return JSON.parse(output.split("\n")[1]); });
  for (const written of results) assert.deepEqual(written.slice(0, 5), [true, true, true, true, true], "no writer lost or skipped its own events");
  assert.equal(results.filter((written) => written[5] === true).length, 1, "exactly one child recorded the shared id");
  const snapshot = readSnap(root);
  assert.equal(snapshot.lifetime.agentCompletions, 31);
  assert.equal(snapshot.lifetime.tokens.total, 62);
  assert.equal(snapshot.dimensions.models.opencode["p/m"].completions, 31);
  assert.equal(snapshot.recentEventKeys.filter((key) => key === JSON.stringify(["opencode", "event", "shared"])).length, 1);
});

test("a legacy pathname lock makes every writer skip until an operator removes it; it is never reclaimed", async (t) => {
  const root = metricsRoot(t);
  const metrics = path.join(root, ".project", "metrics");
  fs.mkdirSync(metrics, { recursive: true });
  const legacy = path.join(metrics, ".token-consumption.lock");
  fs.writeFileSync(legacy, "99999999"); // a dead PID: the old collector would have reclaimed this
  fs.utimesSync(legacy, new Date(0), new Date(0)); // and an ancient one
  const skipped = await recordEvent(event(), root);
  assert.equal(skipped.written, false);
  assert.match(skipped.reason, /legacy lock \.project\/metrics\/\.token-consumption\.lock is present/);
  assert.equal(fs.existsSync(snapshotFile(root)), false, "nothing was written");
  assert.equal(fs.readFileSync(legacy, "utf8"), "99999999", "the legacy lock is left exactly as found");

  const viaCli = cli(root, event().raw);
  assert.equal(viaCli.status, 0, "the CLI stays best-effort");
  assert.match(viaCli.stderr, /skipped: legacy lock/);
  assert.ok(!viaCli.stderr.includes(root), "no absolute path in the message");

  fs.rmSync(legacy);
  assert.equal((await recordEvent(event(), root)).written, true, "after explicit removal the collector records again");
});

test("another program on the metrics endpoint makes recordEvent skip within its deadline, then recording resumes", async (t) => {
  const root = metricsRoot(t);
  const metrics = path.join(root, ".project", "metrics");
  fs.mkdirSync(metrics, { recursive: true });
  const squatter = net.createServer();
  await new Promise((resolve) => squatter.listen({ host: "127.0.0.1", port: endpointFor(metrics).port, exclusive: true }, resolve));
  t.after(() => new Promise((resolve) => squatter.close(() => resolve())));
  const skipped = await recordEvent(event(), root, { lock: { waitMs: 150 } });
  assert.equal(skipped.written, false);
  assert.match(skipped.reason, /held by another writer/);
  assert.equal(fs.existsSync(snapshotFile(root)), false);
  await new Promise((resolve) => squatter.close(() => resolve()));
  assert.equal((await recordEvent(event(), root)).written, true);
});

test("the lease is released even when recording throws, so the next event is not blocked", async (t) => {
  if (process.getuid && process.getuid() === 0) { t.skip("root ignores directory permissions"); return; }
  const root = metricsRoot(t);
  await recordEvent(event(), root);
  // A metrics directory that cannot be written makes the atomic write throw while the lease is held.
  const metrics = path.join(root, ".project", "metrics");
  fs.chmodSync(metrics, 0o500);
  try {
    await assert.rejects(() => recordEvent(event({ agent_id: "b" }), root), { code: "EACCES" });
  } finally { fs.chmodSync(metrics, 0o700); }
  const next = await recordEvent(event({ agent_id: "c" }), root, { lock: { waitMs: 100 } });
  assert.equal(next.written, true, "a failure inside the lease did not leave it held");
});
