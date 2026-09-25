const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const { recordEvent, normalizedEvent, applyToSnapshot, blankSnapshot } = require("./token-consumption.js");

test("keeps one rolling snapshot and regenerates reports", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    recordEvent({ vendor: "opencode", event: "message.completed", agentType: "reviewer", model: "openai/gpt", costUsd: 0.01, raw: { session_id: "session-1", message_id: "one", tokens: { input: 10, output: 20, reasoning: 3, cache: { read: 4, write: 5 } } } }, root);
    recordEvent({ vendor: "opencode", event: "message.completed", agentType: "reviewer", model: "openai/gpt", costUsd: 0.02, raw: { session_id: "session-1", message_id: "two", tokens: { input: 15, output: 25, reasoning: 4, cache: { read: 5, write: 6 } } } }, root);
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

test("upgrades a completion without usage instead of counting it twice", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    recordEvent({ vendor: "claude", agentId: "agent-1", raw: { session_id: "session-1" } }, root);
    recordEvent({ vendor: "claude", agentId: "agent-1", metricScope: "final_request", raw: { session_id: "session-1", usage: { input_tokens: 9, output_tokens: 6 } } }, root);
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    assert.equal(snapshot.lifetime.agentCompletions, 1);
    assert.equal(snapshot.lifetime.unavailableCount, 0);
    assert.equal(snapshot.lifetime.tokens.total, 15);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("deduplicates replayed provider messages and supports a project root outside cwd", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  const nestedDirectory = path.join(root, "nested");
  fs.mkdirSync(nestedDirectory);
  const originalDirectory = process.cwd();
  try {
    const event = { vendor: "opencode", idempotencyKey: "message-1", raw: { tokens: { input: 8, output: 2 } } };
    process.chdir(nestedDirectory);
    recordEvent(event, root);
    const duplicate = recordEvent(event, root);
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    assert.equal(duplicate.reason, "duplicate event");
    assert.equal(snapshot.lifetime.agentCompletions, 1);
    assert.equal(snapshot.lifetime.tokens.total, 10);
  } finally {
    process.chdir(originalDirectory);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a recorded event picks up the current caveman mode when modes.json resolves one", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    fs.mkdirSync(path.join(root, ".project", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, ".project", "skills", "modes.json"), JSON.stringify({ schemaVersion: 1, caveman: { default: "lite" } }));
    recordEvent({ vendor: "opencode", event: "message.completed", raw: { session_id: "session-1", message_id: "one", tokens: { input: 1, output: 1 } } }, root);
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    assert.equal(snapshot.current.mode, "lite");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a recorded event falls back to the bundle default mode when modes.json sets no explicit default", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    fs.mkdirSync(path.join(root, ".project", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, ".project", "skills", "modes.json"), JSON.stringify({ schemaVersion: 1, caveman: {} }));
    recordEvent({ vendor: "opencode", event: "message.completed", raw: { session_id: "session-1", message_id: "one", tokens: { input: 1, output: 1 } } }, root);
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    assert.equal(snapshot.current.mode, "full");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a recorded event reports mode 'off' when modes.json persistently disables caveman", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    fs.mkdirSync(path.join(root, ".project", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, ".project", "skills", "modes.json"), JSON.stringify({ schemaVersion: 1, caveman: { enabled: false } }));
    recordEvent({ vendor: "opencode", event: "message.completed", raw: { session_id: "session-1", message_id: "one", tokens: { input: 1, output: 1 } } }, root);
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    assert.equal(snapshot.current.mode, "off");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a recorded event has a null mode when modes.json does not exist", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    recordEvent({ vendor: "opencode", event: "message.completed", raw: { session_id: "session-1", message_id: "one", tokens: { input: 1, output: 1 } } }, root);
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    assert.equal(snapshot.current.mode, null);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a recorded event has a null mode when modes.json resolves outside the project root via a symlinked ancestor", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-outside-"));
  try {
    fs.writeFileSync(path.join(outside, "modes.json"), JSON.stringify({ schemaVersion: 1, caveman: { default: "ultra" } }));
    fs.mkdirSync(path.join(root, ".project"));
    fs.symlinkSync(outside, path.join(root, ".project", "skills"));
    recordEvent({ vendor: "opencode", event: "message.completed", raw: { session_id: "session-1", message_id: "one", tokens: { input: 1, output: 1 } } }, root);
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    assert.equal(snapshot.current.mode, null, "an escaping symlink must never leak an outside mode value into an attribution field");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("a recorded event has a null mode when modes.json exists but configures no caveman state", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    fs.mkdirSync(path.join(root, ".project", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, ".project", "skills", "modes.json"), JSON.stringify({ schemaVersion: 1 }));
    recordEvent({ vendor: "opencode", event: "message.completed", raw: { session_id: "session-1", message_id: "one", tokens: { input: 1, output: 1 } } }, root);
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    assert.equal(snapshot.current.mode, null);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the mode field never affects the recentEventKeys dedup logic", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    fs.mkdirSync(path.join(root, ".project", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, ".project", "skills", "modes.json"), JSON.stringify({ schemaVersion: 1, caveman: { default: "lite" } }));
    const event = { vendor: "opencode", idempotencyKey: "message-mode-1", raw: { tokens: { input: 8, output: 2 } } };
    const first = recordEvent(event, root);
    assert.equal(first.written, true);
    assert.equal(first.record.mode, "lite");

    // Changing the instance mode between the original event and its replay must not change
    // whether the replay is recognized as a duplicate: the dedup key is the event id, not mode.
    fs.writeFileSync(path.join(root, ".project", "skills", "modes.json"), JSON.stringify({ schemaVersion: 1, caveman: { default: "ultra" } }));
    const duplicate = recordEvent(event, root);
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

test("deduplicates retried subagent completion hooks beyond the rolling comparison", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    const first = { vendor: "codex", event: "subagent-complete", raw: { session_id: "session-1", agent_id: "agent-1" } };
    recordEvent(first, root);
    recordEvent({ vendor: "codex", event: "subagent-complete", raw: { session_id: "session-1", agent_id: "agent-2" } }, root);
    recordEvent({ vendor: "codex", event: "subagent-complete", raw: { session_id: "session-1", agent_id: "agent-3" } }, root);
    const duplicate = recordEvent(first, root);
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, ".project", "metrics", "token-consumption.json"), "utf8"));
    assert.equal(duplicate.reason, "duplicate event");
    assert.equal(snapshot.lifetime.agentCompletions, 3);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function withRoot(action) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    return action(root);
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

test("a v1 snapshot migrates to v2 without losing its lifetime totals", () => {
  withRoot((root) => {
    fs.mkdirSync(path.join(root, ".project", "metrics"));
    fs.writeFileSync(metricsFile(root), JSON.stringify(v1Fixture()));
    recordEvent(message("m-1"), root);
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

test("upgrading a completion recorded before migration never subtracts from dimension rows", () => {
  withRoot((root) => {
    fs.mkdirSync(path.join(root, ".project", "metrics"));
    fs.writeFileSync(metricsFile(root), JSON.stringify(v1Fixture()));
    recordEvent({ vendor: "claude", event: "agent-result", agentType: "Explore", idempotencyKey: "tu-1", metricScope: "final_request", raw: { session_id: "s", usage: { input_tokens: 9, output_tokens: 6 } } }, root);
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

test("reversing a record uses its stored routing even after the cap has moved", () => {
  withRoot((root) => {
    // Same session, agent and turn, no idempotency key: the second event replaces the first.
    const event = (model) => ({ vendor: "opencode", agentType: "build", model, raw: { session_id: "s", turn_id: "t", tokens: { input: 1, output: 1 } } });
    for (let index = 0; index < 25; index += 1) recordEvent({ vendor: "opencode", agentType: "build", model: `model-${index}`, idempotencyKey: `k-${index}`, raw: { tokens: { input: 1, output: 1 } } }, root);
    recordEvent(event("model-26"), root);
    assert.equal(readSnapshot(root).dimensions.models.opencode["(other)"].completions, 1);
    recordEvent(event("model-3"), root);
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

test("a skill event counts the skill and leaves every completion field untouched", () => {
  withRoot((root) => {
    recordEvent(message("m-1"), root);
    const before = readSnapshot(root);
    recordEvent({ vendor: "claude", event: "skill-use", raw: { tool_use_id: "tu-9", tool_input: { skill: "shape", args: "SECRET-ARGS-MARKER" }, effort: { level: "high" } } }, root);
    recordEvent({ vendor: "claude", event: "skill-use", raw: { tool_use_id: "tu-9", tool_input: { skill: "shape" } } }, root);
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

test("a skill event without a usable name records nothing", () => {
  withRoot((root) => {
    const result = recordEvent({ vendor: "claude", event: "skill-use", raw: { tool_input: { args: "only args" } } }, root);
    assert.equal(result.written, false);
    assert.equal(fs.existsSync(metricsFile(root)), false);
  });
});

test("payload-controlled names can never write to Object.prototype", () => {
  withRoot((root) => {
    for (let round = 0; round < 2; round += 1) {
      recordEvent({ vendor: "__proto__", agentType: "__proto__", model: "__proto__", effort: "__proto__", idempotencyKey: `k-${round}`, raw: { tokens: { input: 3, output: 4 } } }, root);
      recordEvent({ vendor: "__proto__", event: "skill-use", skill: "__proto__", idempotencyKey: `s-${round}` }, root);
      recordEvent({ vendor: "opencode", agentType: "constructor", model: "prototype", effort: "constructor", idempotencyKey: `c-${round}`, raw: { tokens: { input: 1, output: 1 } } }, root);
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

test("names are truncated to 80 characters and the 26th distinct name goes to (other)", () => {
  withRoot((root) => {
    recordEvent(message("long", { model: "x".repeat(200) }), root);
    for (let index = 0; index < 25; index += 1) recordEvent(message(`m-${index}`, { model: `model-${index}` }), root);
    const models = readSnapshot(root).dimensions.models.opencode;
    assert.equal(models["x".repeat(80)].completions, 1);
    assert.equal(models["x".repeat(81)], undefined);
    assert.equal(models["(other)"].completions, 1, "25 real names fit; the 26th is folded");
    assert.equal(Object.keys(models).length, 26);
  });
});

test("a reported cost of 0 is not counted as priced", () => {
  withRoot((root) => {
    recordEvent(message("free", { costUsd: 0 }), root);
    recordEvent(message("paid", { costUsd: 0.5 }), root);
    const snapshot = readSnapshot(root);
    assert.equal(snapshot.dimensions.models.opencode["p/m"].pricedCount, 1);
    assert.equal(snapshot.dimensions.models.opencode["p/m"].costUsd, 0.5);
    assert.equal(snapshot.lifetime.vendors.opencode.pricedCount, 1);
  });
});

test("an async Claude launch leaves a model note instead of a completion, and the stop event uses it", () => {
  withRoot((root) => {
    const launch = { vendor: "claude", event: "agent-result", raw: { hook_event_name: "PostToolUse", session_id: "s", tool_use_id: "tu-1", effort: { level: "xhigh" }, tool_input: { subagent_type: "Explore", prompt: "PROMPT-MARKER" }, tool_response: { isAsync: true, status: "async_launched", agentId: "agent-7", resolvedModel: "claude-sonnet-5", prompt: "PROMPT-MARKER" } } };
    recordEvent(launch, root);
    let snapshot = readSnapshot(root);
    assert.equal(snapshot.lifetime.agentCompletions, 0, "a launch is not a completion");
    assert.equal(snapshot.current, null);
    assert.equal(snapshot.agentModels["agent:agent-7"], "claude-sonnet-5");
    recordEvent({ vendor: "claude", event: "subagent-complete", raw: { hook_event_name: "SubagentStop", session_id: "s", agent_id: "agent-7", agent_type: "Explore", effort: { level: "xhigh" }, last_assistant_message: "REPLY-MARKER" } }, root);
    snapshot = readSnapshot(root);
    assert.equal(snapshot.lifetime.agentCompletions, 1);
    assert.equal(snapshot.current.model, "claude-sonnet-5");
    assert.equal(snapshot.agentModels["agent:agent-7"], undefined, "a note is consumed once");
    assert.equal(snapshot.dimensions.models.claude["claude-sonnet-5"].completions, 1);
    assert.equal(snapshot.dimensions.models.claude["(unreported)"], undefined);
    assert.equal(snapshot.dimensions.agents.claude.Explore.completions, 1);
    assert.equal(snapshot.dimensions.efforts.claude.xhigh.completions, 1);
    assert.doesNotMatch(fs.readFileSync(metricsFile(root), "utf8"), /PROMPT-MARKER|REPLY-MARKER/);
  });
});

test("agent model notes stay bounded", () => {
  withRoot((root) => {
    for (let index = 0; index < 60; index += 1) {
      recordEvent({ vendor: "claude", event: "agent-result", raw: { session_id: "s", tool_use_id: `tu-${index}`, tool_response: { isAsync: true, status: "async_launched", agentId: `agent-${index}`, resolvedModel: "m" } } }, root);
    }
    const notes = Object.keys(readSnapshot(root).agentModels);
    assert.equal(notes.length, 50);
    assert.equal(notes.includes("agent:agent-0"), false);
    assert.equal(notes.includes("agent:agent-59"), true);
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

test("a stale lock left by a dead process is reclaimed instead of blocking the hook", () => {
  withRoot((root) => {
    const metrics = path.join(root, ".project", "metrics");
    fs.mkdirSync(metrics, { recursive: true });
    fs.writeFileSync(path.join(metrics, ".token-consumption.lock"), "99999999");
    recordEvent(message("after-stale-lock"), root);
    assert.equal(readSnapshot(root).lifetime.agentCompletions, 1);
    assert.equal(fs.existsSync(path.join(metrics, ".token-consumption.lock")), false);
  });
});

test("an unreadable lock file with no owner is reclaimed once it is old enough", () => {
  withRoot((root) => {
    const metrics = path.join(root, ".project", "metrics");
    fs.mkdirSync(metrics, { recursive: true });
    const lock = path.join(metrics, ".token-consumption.lock");
    fs.writeFileSync(lock, "not-a-pid");
    const old = new Date(Date.now() - 5000);
    fs.utimesSync(lock, old, old);
    recordEvent(message("after-orphan-lock"), root);
    assert.equal(readSnapshot(root).lifetime.agentCompletions, 1);
  });
});

const CLI = path.join(__dirname, "token-consumption.js");
const runCli = (root, event, payload, vendor = "claude") => spawnSync(process.execPath, [CLI, "--vendor", vendor, "--event", event, "--root", root], { input: typeof payload === "string" ? payload : JSON.stringify(payload), encoding: "utf8" });

test("the CLI records a Claude skill-use payload from stdin and never stores its args", () => {
  withRoot((root) => {
    const result = runCli(root, "skill-use", { tool_use_id: "tu-1", tool_input: { skill: "plan", args: "CLI-ARGS-MARKER" }, effort: { level: "high" } });
    assert.equal(result.status, 0);
    const snapshot = readSnapshot(root);
    assert.equal(snapshot.dimensions.skills.claude.plan.uses, 1);
    assert.equal(snapshot.lifetime.agentCompletions, 0);
    assert.doesNotMatch(fs.readFileSync(metricsFile(root), "utf8"), /CLI-ARGS-MARKER/);
  });
});

test("the CLI records a subagent completion and exits 0 on unusable input without echoing it", () => {
  withRoot((root) => {
    assert.equal(runCli(root, "subagent-complete", { session_id: "s", agent_id: "a1", agent_type: "Explore", effort: { level: "low" } }).status, 0);
    assert.equal(readSnapshot(root).dimensions.efforts.claude.low.completions, 1);
    const bad = runCli(root, "skill-use", "my secret prompt text");
    assert.equal(bad.status, 0, "telemetry never blocks the agent");
    assert.match(bad.stderr, /stdin is not valid JSON/);
    assert.doesNotMatch(bad.stderr, /secret/, "the parse error must not quote the payload");
    assert.equal(runCli(root, "skill-use", "").status, 0, "an empty payload is not an error");
  });
});

test("names outside the identifier allow-list are reported as (other), never stored", () => {
  withRoot((root) => {
    recordEvent({ vendor: "claude", event: "agent-result", raw: { session_id: "s", tool_use_id: "t", tool_input: { subagent_type: "[click](https://evil.example/x)" }, tool_response: { agentId: "a", resolvedModel: "![b](https://evil.example/b.png)" }, effort: { level: "\u001b]0;title\u0007" } } }, root);
    recordEvent({ vendor: "claude", event: "skill-use", raw: { tool_use_id: "u", tool_input: { skill: "<img src=x onerror=1>" } } }, root);
    for (const name of ["token-consumption.json", "token-consumption.md", "token-consumption.html"]) {
      const text = fs.readFileSync(metricsFile(root, name), "utf8");
      assert.doesNotMatch(text, /evil\.example|onerror|\u001b/, `${name} carries none of the unsafe names`);
    }
    const snapshot = readSnapshot(root);
    assert.equal(snapshot.dimensions.models.claude["(other)"].completions, 1);
    assert.equal(snapshot.dimensions.skills.claude["(other)"].uses, 1);
    assert.equal(recordEvent({ vendor: "claude", event: "agent-result", raw: { tool_response: { resolvedModel: "claude-sonnet-5" } } }, root).record.model, "claude-sonnet-5", "real model ids pass the allow-list");
    for (const name of ["gpt-5.6-terra", "openai/gpt-5.6-terra", "plugin:skill", "anthropic.claude-v1:0", "@scope/pkg"]) {
      assert.equal(normalizedEvent({ vendor: "opencode", model: name }).model, name);
    }
  });
});

test("ids and status are bounded, and free-text status is not stored", () => {
  withRoot((root) => {
    const long = "z".repeat(5000);
    recordEvent({ vendor: "claude", event: "agent-result", raw: { session_id: long, tool_use_id: long, stop_reason: `my prompt was: ${long}`, tool_response: { agentId: long, isAsync: false } } }, root);
    const { current } = readSnapshot(root);
    assert.equal(current.sessionId.length, 128);
    assert.equal(current.agentId.length, 128);
    assert.equal(current.id.length, "claude:".length + 128);
    assert.equal(current.status, "(other)");
    assert.ok(fs.statSync(metricsFile(root)).size < 20000);
  });
});

test("an implausible cost or token count is treated as unreported instead of wedging an aggregate", () => {
  withRoot((root) => {
    const event = (id, cost, agent) => ({ vendor: "opencode", agentType: agent, model: "p/m", costUsd: cost, raw: { session_id: "s", turn_id: agent, message_id: id, tokens: { input: 1, output: 1 } } });
    recordEvent(event("a", 1e20, "A"), root);
    recordEvent(event("b", 1, "B"), root);
    recordEvent({ ...event("c", 1, "A"), idempotencyKey: undefined, raw: { session_id: "s", turn_id: "A", tokens: { input: 2, output: 2 } } }, root);
    const models = readSnapshot(root).dimensions.models.opencode["p/m"];
    assert.equal(models.pricedCount, 2, "the 1e20 cost was dropped, the two real costs counted");
    assert.equal(normalizedEvent({ vendor: "opencode", raw: { tokens: { input: 1e308, output: 1 } } }).tokens.input, null);
  });
});

test("a metrics directory or .project that is a symlink out of the root is refused, and nothing is written there", () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  try {
    const victim = path.join(base, "victim");
    fs.mkdirSync(victim);
    fs.writeFileSync(path.join(victim, "token-consumption.md"), "precious");
    const repo = path.join(base, "repo");
    fs.mkdirSync(path.join(repo, ".project"), { recursive: true });
    fs.symlinkSync(victim, path.join(repo, ".project", "metrics"));
    const blocked = recordEvent(message("m-1"), repo);
    assert.equal(blocked.written, false);
    assert.match(blocked.reason, /outside the project root/);
    assert.equal(fs.readFileSync(path.join(victim, "token-consumption.md"), "utf8"), "precious");
    assert.deepEqual(fs.readdirSync(victim), ["token-consumption.md"]);

    const other = path.join(base, "other");
    fs.mkdirSync(other);
    const linked = path.join(base, "linked");
    fs.mkdirSync(linked);
    fs.symlinkSync(other, path.join(linked, ".project"));
    assert.equal(recordEvent(message("m-2"), linked).written, false);
    assert.deepEqual(fs.readdirSync(other), [], "no metrics directory was created through the symlink");

    const inside = path.join(base, "inside");
    fs.mkdirSync(path.join(inside, "real-metrics"), { recursive: true });
    fs.mkdirSync(path.join(inside, ".project"));
    fs.symlinkSync(path.join(inside, "real-metrics"), path.join(inside, ".project", "metrics"));
    assert.equal(recordEvent(message("m-3"), inside).written, true, "a symlink that stays inside the root is allowed");
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test("agent model notes keep the newest entries even when agent ids are all digits", () => {
  withRoot((root) => {
    for (let index = 100; index >= 0; index -= 1) {
      recordEvent({ vendor: "claude", event: "agent-result", raw: { session_id: "s", tool_use_id: `tu-${index}`, tool_response: { isAsync: true, status: "async_launched", agentId: String(index), resolvedModel: "m" } } }, root);
    }
    const notes = Object.keys(readSnapshot(root).agentModels);
    assert.equal(notes.length, 50);
    assert.equal(notes.includes("agent:0"), true, "the newest note survives");
    assert.equal(notes.includes("agent:100"), false, "the oldest note was evicted");
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
