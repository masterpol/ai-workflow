import { NODE_FLAGS } from "../../scripts/runtime/entry.mts";
const RUNTIME_FLAGS = process.versions.bun ? [] : NODE_FLAGS;
// Bun child processes can deadlock when requiring the same .mts file concurrently; use Node for the writer fixture.
const CHILD_EXEC = process.versions.bun ? "node" : process.execPath;
const CHILD_FLAGS = process.versions.bun ? NODE_FLAGS : RUNTIME_FLAGS;
import assert from "node:assert/strict";
import { createTestDeps, fileUrl, urlPath, spawnTestChild, spawnSync, adapterNet as net } from "../../scripts/runtime/test-helpers.mts";
const testDeps = createTestDeps();
const fs = testDeps.fs;
const os = testDeps.os;
const path = testDeps.path;
import test, { after } from "node:test";
import type { TestContext } from "node:test";

import type { RuntimeDeps, WriteOptions } from "../../scripts/runtime/types.mts";
import { createNodeDeps } from "../../scripts/runtime/node.mts";
import { recordEvent, normalizedEvent, applyToSnapshot, blankSnapshot, main, SNAPSHOT_REVISION, resolvePhaseContext, activeContext, transcriptTokens } from "./token-consumption.mts";
import type { CollectorInput, CompletionRecord, Routing } from "./token-consumption.mts";
import { endpointFor } from "./metrics-lock.mts";

const here = path.dirname(urlPath(import.meta.url));
// Snapshot JSON read back from disk is whatever JSON.parse returns (untyped in the TS lib); tests index into it
// as the old tests did. No explicit escape-hatch type is written here.
type Json = ReturnType<typeof JSON.parse>;

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

async function withRoot<T>(action: (root: string) => Promise<T>): Promise<T> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-"));
  fs.mkdirSync(path.join(root, ".project"));
  try {
    return await action(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const metricsFile = (root: string, name = "token-consumption.json"): string => path.join(root, ".project", "metrics", name);
const readSnapshot = (root: string): Json => JSON.parse(fs.readFileSync(metricsFile(root), "utf8"));
const message = (id: string, extra: CollectorInput = {}): CollectorInput => ({ vendor: "opencode", event: "message.completed", agentType: "build", model: "p/m", idempotencyKey: id, raw: { tokens: { input: 10, output: 5 } }, ...extra });

// The exact shape a v1 collector wrote, including a Claude completion with no usage.
function v1Fixture(): Json {
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

test("a v1 snapshot migrates to the current token snapshot revision without losing its lifetime totals", async () => {
  await withRoot(async (root) => {
    fs.mkdirSync(path.join(root, ".project", "metrics"));
    fs.writeFileSync(metricsFile(root), JSON.stringify(v1Fixture()));
    await recordEvent(message("m-1"), root);
    const snapshot = readSnapshot(root);
    assert.equal(snapshot.schemaVersion, SNAPSHOT_REVISION);
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
  assert.equal(overflow.dimensions?.models, "(other)");
  assert.equal(snapshot.dimensions.models.opencode["(other)"].completions, 1);
  assert.equal(snapshot.dimensions.efforts.opencode.high.pricedCount, 1);
  applyToSnapshot(snapshot, overflow, -1);
  assert.equal(JSON.stringify(snapshot.dimensions), before);
});

test("reversing a record uses its stored routing even after the cap has moved", async () => {
  await withRoot(async (root) => {
    // Same session, agent and turn, no idempotency key: the second event replaces the first.
    const event = (model: string): CollectorInput => ({ vendor: "opencode", agentType: "build", model, raw: { session_id: "s", turn_id: "t", tokens: { input: 1, output: 1 } } });
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
  record.dimensions = { applied: true, models: "p/m", agents: "build", efforts: "(unreported)" } satisfies Routing;
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

const CLI = path.join(here, "token-consumption.mts");
const runCli = (root: string, event: string, payload: unknown, vendor = "claude") => spawnSync(process.execPath, [...RUNTIME_FLAGS, CLI, "--vendor", vendor, "--event", event, "--root", root], { input: typeof payload === "string" ? payload : JSON.stringify(payload), encoding: "utf8" });

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
    const event = (id: string, cost: number, agent: string): Json => ({ vendor: "opencode", agentType: agent, model: "p/m", costUsd: cost, raw: { session_id: "s", turn_id: agent, message_id: id, tokens: { input: 1, output: 1 } } });
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

const COLLECTOR = path.join(here, "token-consumption.mts");
function metricsRoot(t: TestContext): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-review-"));
  fs.mkdirSync(path.join(root, ".project"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
const snapshotFile = (root: string): string => path.join(root, ".project", "metrics", "token-consumption.json");
const readSnap = (root: string): Json => JSON.parse(fs.readFileSync(snapshotFile(root), "utf8"));
const cli = (root: string, payload: unknown, args = ["--vendor", "claude", "--event", "subagent-complete"], timeout = 8000) => spawnSync(process.execPath, [...RUNTIME_FLAGS, COLLECTOR, ...args, "--root", root], { input: typeof payload === "string" ? payload : JSON.stringify(payload), encoding: "utf8", timeout, maxBuffer: 1 << 26 });
const event = (extra: Json = {}): { vendor: string; event: string; raw: Json } => ({ vendor: "claude", event: "subagent-complete", raw: { agent_type: "x", model: "m", usage: { input_tokens: 5 }, session_id: "s", agent_id: "a", ...extra } });

test("fractional token counts are treated as unreported, so a later reversal can never underflow and lose an event", async (t) => {
  const root = metricsRoot(t);
  const send = async (turn: string, tokens: number) => recordEvent({ vendor: "opencode", event: "agent-complete", raw: { usage: { input_tokens: tokens }, model: "m", session_id: "s", turn_id: turn } }, root);
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
  const newer = SNAPSHOT_REVISION + 1;
  const original = JSON.stringify({ schemaVersion: newer, lifetime: { agentCompletions: 500 }, recentEventKeys: [] });
  fs.writeFileSync(snapshotFile(root), original);
  const result = await recordEvent(event(), root);
  assert.equal(result.written, false);
  assert.match(result.reason, new RegExp(`schemaVersion ${newer} is newer`));
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
  if (process.platform === "win32" || (process.getuid && process.getuid() === 0)) { t.skip("requires POSIX directory permissions without root privileges"); return; }
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

// Six hostile snapshots each require three real collector processes; retain every case with an integration budget.
test("a snapshot whose dimension rows or stored routing are hostile is replaced, not left to fail every later event", { timeout: 30000 }, async (t) => {
  const seeded = async (mutate: (snapshot: Json) => void): Promise<string> => {
    const root = metricsRoot(t);
    await recordEvent(event(), root);
    const snapshot = readSnap(root);
    mutate(snapshot);
    fs.writeFileSync(snapshotFile(root), JSON.stringify(snapshot));
    return root;
  };
  const cases: ((s: Json) => void)[] = [
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
  const cases: ((s: Json) => void)[] = [
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

// ---- collector-robustness C3: every writer holds the kernel lease (metrics-lock.mts) ----

// A lease or test server left open by a failed assertion must fail this file, not hang it (see metrics-lock.test.mts).
// Node only: `node --test` runs each file in its own process, but `bun test <dir>` runs every file in ONE process,
// where this timer would end the whole run (and its report) two seconds after this file finished.
if (typeof (globalThis as { Bun?: unknown }).Bun === "undefined") after(() => {
  setTimeout(() => {
    process.stderr.write("Test leaked a lease, server or child after cleanup\n");
    process.exit(1);
  }, 2000).unref();
});

// Each child waits at a barrier (one stdin line) so all of them contend at once, then records five
// events of its own plus one event whose id every child shares.
const WRITER_BARRIER_MS = typeof (globalThis as { Bun?: unknown }).Bun !== "undefined" ? 30000 : 5000;
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
    // The writer imports the collector, which re-executes itself under the configured runner; pin it to the Node child.
    const child = spawnTestChild(CHILD_EXEC, [...CHILD_FLAGS, "-e", WRITER, COLLECTOR, root, `w${index}`], { stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, AI_WORKFLOW_RUNNER: "node" } });
    let output = "";
    let errors = "";
    child.stdout.on("data", (chunk: Buffer) => { output += chunk; });
    child.stderr.on("data", (chunk: Buffer) => { errors += chunk; });
    t.after(() => { if (child.exitCode == null && child.signalCode == null) child.kill("SIGKILL"); });
    const exited = new Promise((resolve) => child.on("exit", resolve));
    const ready = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("writer never reached the barrier")), WRITER_BARRIER_MS);
      child.stdout.on("data", () => { if (output.includes("ready")) { clearTimeout(timer); resolve(); } });
    });
    return { child, exited, ready, result: () => ({ output, errors }) };
  });
  await Promise.all(writers.map((writer) => writer.ready));
  for (const writer of writers) writer.child.stdin.write("go\n");
  const codes: unknown = await Promise.race([Promise.all(writers.map((writer) => writer.exited)), new Promise((_, reject) => setTimeout(() => reject(new Error("writers did not finish")), 60000).unref())]);
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
  await new Promise<void>((resolve) => squatter.listen({ host: "127.0.0.1", port: endpointFor(metrics).port, exclusive: true }, resolve));
  t.after(() => new Promise<void>((resolve) => squatter.close(() => resolve())));
  const skipped = await recordEvent(event(), root, { lock: { waitMs: 150 } });
  assert.equal(skipped.written, false);
  assert.match(skipped.reason, /held by another writer/);
  assert.equal(fs.existsSync(snapshotFile(root)), false);
  await new Promise<void>((resolve) => squatter.close(() => resolve()));
  assert.equal((await recordEvent(event(), root)).written, true);
});

test("the lease is released even when recording throws, so the next event is not blocked", async (t) => {
  const root = metricsRoot(t);
  await recordEvent(event(), root);
  const base = createNodeDeps();
  let failures = 0;
  const deps: RuntimeDeps = {
    ...base,
    fs: { ...base.fs, writeFileSync(file, data, options) {
      if (String(file).includes("token-consumption.json.") && options?.flag === "wx") {
        failures += 1;
        throw Object.assign(new Error("injected write failure"), { code: "EACCES" });
      }
      return base.fs.writeFileSync(file, data, options);
    } },
  };
  await assert.rejects(() => recordEvent(event({ agent_id: "b" }), root, {}, deps), { code: "EACCES" });
  assert.equal(failures, 1, "the write failed after acquiring the lease");
  const next = await recordEvent(event({ agent_id: "c" }), root, { lock: { waitMs: 100 } });
  assert.equal(next.written, true, "a failure inside the lease did not leave it held");
  assert.equal(readSnap(root).lifetime.agentCompletions, 2, "the failed event never changed the snapshot");
});

// ---- ts-runtime-injection: main(argv, deps) driven by injected deps (stdin, stderr, clock, crypto, pid, cwd) ----

interface FakeRun { deps: RuntimeDeps; err: string[]; out: string[]; writes: { file: string; options?: WriteOptions }[] }
function fakeRun(stdin: string | Error, overrides: { cwd?: string; fs?: Partial<RuntimeDeps["fs"]> } = {}): FakeRun {
  const base = createNodeDeps({});
  const err: string[] = [];
  const out: string[] = [];
  const writes: { file: string; options?: WriteOptions }[] = [];
  const deps: RuntimeDeps = {
    ...base,
    fs: {
      ...base.fs,
      writeFileSync: (file, data, options) => { writes.push({ file: String(file), options }); base.fs.writeFileSync(file, data, options); },
      ...overrides.fs,
    },
    crypto: { ...base.crypto, randomBytes: (length) => new Uint8Array(length).map((_, index) => index + 10), randomUUID: () => "00000000-0000-4000-8000-000000000000" },
    clock: { ...base.clock, now: () => Date.UTC(2026, 9, 7, 12, 0, 0) },
    io: {
      stdout: { write: (text) => { out.push(text); }, isTTY: false },
      stderr: { write: (text) => { err.push(text); }, isTTY: false },
      stdin: { readText: () => (stdin instanceof Error ? Promise.reject(stdin) : Promise.resolve(stdin)) },
    },
    proc: { ...base.proc, pid: 4242, cwd: () => overrides.cwd ?? "/nonexistent-cwd" },
  };
  return { deps, err, out, writes };
}

test("main(): a payload on stdin is recorded with the injected clock, pid and random bytes, and returns 0 with no output", async (t) => {
  const root = metricsRoot(t);
  const f = fakeRun(JSON.stringify({ session_id: "s", agent_id: "a1", agent_type: "Explore", usage: { input_tokens: 5 }, last_assistant_message: "MAIN-REPLY-MARKER" }));
  assert.equal(await main(["--vendor", "claude", "--event", "subagent-complete", "--root", root], f.deps), 0);
  assert.deepEqual(f.err, []);
  assert.deepEqual(f.out, []);
  const snapshot = readSnap(root);
  assert.equal(snapshot.current.recordedAt, "2026-10-07T12:00:00.000Z");
  assert.equal(snapshot.dimensions.since, "2026-10-07T12:00:00.000Z");
  assert.equal(snapshot.current.id, JSON.stringify(["claude", "subagent", "s", "a1", "subagent-complete"]));
  const temp = f.writes.map((write) => write.file);
  assert.ok(temp.includes(`${snapshotFile(root)}.4242.0a0b0c0d0e0f.tmp`), temp.join("\n"));
  assert.ok(f.writes.every((write) => write.options?.mode === 0o600 && write.options.flag === "wx"), "every write is an exclusive 0600 temp file");
  assert.equal(fs.statSync(snapshotFile(root)).mode & 0o777, 0o600);
  assert.equal(fs.statSync(path.dirname(snapshotFile(root))).mode & 0o777, 0o700);
  assert.doesNotMatch(fs.readFileSync(snapshotFile(root), "utf8"), /MAIN-REPLY-MARKER/);
});

test("main(): without --root the injected cwd is the project root", async (t) => {
  const root = metricsRoot(t);
  const f = fakeRun(JSON.stringify({ tool_use_id: "tu-1", tool_input: { skill: "plan" } }), { cwd: root });
  assert.equal(await main(["--vendor", "claude", "--event", "skill-use"], f.deps), 0);
  assert.deepEqual(f.err, []);
  assert.equal(readSnap(root).dimensions.skills.claude.plan.uses, 1);
});

test("main(): skips, invalid JSON and an oversize stdin are one stderr line each and still return 0", async (t) => {
  const missing = fakeRun("{}");
  assert.equal(await main(["--root", "/nonexistent-root-g9"], missing.deps), 0);
  assert.deepEqual(missing.err, ["[token-consumption] skipped: .project is not initialized\n"]);

  const bad = fakeRun("my secret prompt");
  assert.equal(await main(["--root", metricsRoot(t)], bad.deps), 0);
  assert.deepEqual(bad.err, ["[token-consumption] stdin is not valid JSON\n"]);

  const big = fakeRun(Object.assign(new Error("stdin is larger than 1048576 bytes"), { code: "E2BIG" }));
  assert.equal(await main(["--root", metricsRoot(t)], big.deps), 0);
  assert.deepEqual(big.err, ["[token-consumption] stdin is larger than 1 MB\n"], "the old fixed message, not the adapter's");

  const empty = fakeRun("");
  assert.equal(await main(["--vendor", "claude", "--event", "skill-use", "--root", metricsRoot(t)], empty.deps), 0);
  assert.deepEqual(empty.err, ["[token-consumption] skipped: skill name unavailable\n"]);
});

test("main(): a file-system error is reported by code only, and any other message is printable ASCII and bounded", async (t) => {
  const root = metricsRoot(t);
  const fsError = Object.assign(new Error(`EACCES: permission denied, mkdir '${root}/.project/metrics'`), { code: "EACCES", syscall: "mkdir" });
  const denied = fakeRun("{}", { fs: { mkdirSync: () => { throw fsError; } } });
  assert.equal(await main(["--root", root], denied.deps), 0);
  assert.deepEqual(denied.err, ["[token-consumption] file system error (EACCES)\n"]);

  const odd = fakeRun("{}", { fs: { existsSync: () => { throw new Error(`bad\u0007name ${"x".repeat(300)}`); } } });
  assert.equal(await main(["--root", root], odd.deps), 0);
  assert.equal(odd.err.length, 1);
  assert.match(odd.err[0], /^\[token-consumption\] bad\?name x+\n$/);
  assert.equal(odd.err[0].length, "[token-consumption] ".length + 160 + 1);
});

// ---- ts-runtime-injection K2: the collector's lease and legacy-lock skip on the Node AND Bun adapters ----

const inBun = typeof (globalThis as { Bun?: unknown }).Bun !== "undefined";
const ADAPTER = inBun ? "bun" : "node";
async function adapterDeps(): Promise<RuntimeDeps> {
  if (!inBun) return createNodeDeps();
  const url = fileUrl(path.join(here, "..", "..", "scripts", "runtime", "bun.mts"));
  const { createBunDeps } = (await import(url)) as { createBunDeps(): RuntimeDeps };
  return createBunDeps();
}

test(`lease parity (${ADAPTER} adapter): a stale legacy lock is skipped exactly as before, a held lease refuses a second writer, and recording resumes`, async (t) => {
  const deps = await adapterDeps();
  assert.equal(deps.runtime, ADAPTER);
  const root = metricsRoot(t);
  const metrics = path.join(root, ".project", "metrics");
  fs.mkdirSync(metrics, { recursive: true });
  const legacy = path.join(metrics, ".token-consumption.lock");
  fs.writeFileSync(legacy, "99999999");
  fs.utimesSync(legacy, new Date(0), new Date(0));
  const skipped = await recordEvent(event(), root, {}, deps);
  assert.deepEqual(skipped, { written: false, reason: "legacy lock .project/metrics/.token-consumption.lock is present; stop old collectors, then remove it (see README, Token Consumption)" });
  assert.equal(fs.readFileSync(legacy, "utf8"), "99999999", "never reclaimed");
  assert.equal(fs.existsSync(snapshotFile(root)), false);
  fs.rmSync(legacy);

  const squatter = net.createServer();
  await new Promise<void>((resolve) => squatter.listen({ host: "127.0.0.1", port: endpointFor(metrics, deps).port, exclusive: true }, resolve));
  const busy = await recordEvent(event(), root, { lock: { waitMs: 150 } }, deps);
  await new Promise<void>((resolve) => squatter.close(() => resolve()));
  assert.deepEqual(busy, { written: false, reason: "metrics lock is held by another writer; event not recorded" });
  assert.equal(fs.existsSync(snapshotFile(root)), false);

  const written = await recordEvent(event(), root, {}, deps);
  assert.equal(written.written, true);
  assert.equal(readSnap(root).lifetime.agentCompletions, 1);
  const record: CompletionRecord | undefined = written.record;
  assert.equal(record?.vendor, "claude");
});

test(`privacy (${ADAPTER} adapter): path containment, symlinked snapshot refusal and the payload field filter hold through injected deps`, async (t) => {
  const deps = await adapterDeps();
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "token-consumption-adapter-"));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const victim = path.join(base, "victim");
  fs.mkdirSync(victim);
  const repo = path.join(base, "repo");
  fs.mkdirSync(path.join(repo, ".project"), { recursive: true });
  fs.symlinkSync(victim, path.join(repo, ".project", "metrics"));
  assert.match((await recordEvent(event(), repo, {}, deps)).reason as string, /metrics directory resolves outside the project root/);
  assert.deepEqual(fs.readdirSync(victim), []);

  const linkRoot = metricsRoot(t);
  fs.mkdirSync(path.join(linkRoot, ".project/metrics"), { recursive: true });
  fs.symlinkSync(path.join(victim, "nothing.json"), snapshotFile(linkRoot));
  assert.match((await recordEvent(event(), linkRoot, {}, deps)).reason as string, /symlink or not a regular file/);

  const root = metricsRoot(t);
  await recordEvent({ vendor: "claude", event: "agent-result", raw: { session_id: "s", tool_use_id: "tu", tool_input: { subagent_type: "Explore", prompt: "ADAPTER-PROMPT" }, tool_response: { agentId: "a", content: "ADAPTER-RESPONSE", transcript_path: "/x/ADAPTER-TRANSCRIPT" }, transcript_path: "/x/ADAPTER-TRANSCRIPT", usage: { input_tokens: 3 } } }, root, {}, deps);
  for (const name of ["token-consumption.json", "token-consumption.md", "token-consumption.html"]) {
    assert.doesNotMatch(fs.readFileSync(metricsFile(root, name), "utf8"), /ADAPTER-(PROMPT|RESPONSE|TRANSCRIPT)/, name);
  }
});

// ---- Token snapshot revision 3: append-only migration, validated blocks, directory-identity pin ----

const v2Fixture = (): Json => ({ ...v1Fixture(), schemaVersion: 2, dimensions: { since: "2026-09-25T00:00:00.000Z", models: {}, agents: {}, efforts: {}, skills: {} } });
const BLOCKS = ["flows", "transcripts", "contexts"];
const withoutBlocks = (snapshot: Json): Json => Object.fromEntries(Object.entries(snapshot).filter(([key]) => !BLOCKS.includes(key)));
const oneRow = { completions: 1, reportedUsageCount: 1, unavailableCount: 0, tokens: 3, costUsd: 0, pricedCount: 0 };

test("a v2 snapshot migrates to revision 3 append-only and survives a strict re-read", async () => {
  await withRoot(async (root) => {
    fs.mkdirSync(path.join(root, ".project", "metrics"));
    const original = v2Fixture();
    fs.writeFileSync(metricsFile(root), JSON.stringify(original));
    const first = await recordEvent({ vendor: "opencode", event: "message.completed", idempotencyKey: "m-0", raw: { tokens: { input: 1, output: 2 } } }, root);
    assert.equal(first.written, true);
    const migrated = readSnapshot(root);
    assert.equal(migrated.schemaVersion, 3);
    assert.deepEqual(Object.keys(migrated.flows.pitches), ["(unattributed)"], "the first completion after migration is the first flow row");
    assert.ok(migrated.flows.since);
    assert.deepEqual(migrated.transcripts, {});
    assert.deepEqual(migrated.contexts, {});
    assert.equal(migrated.dimensions.since, original.dimensions.since, "earlier blocks are carried over");
    assert.equal(migrated.lifetime.agentCompletions, original.lifetime.agentCompletions + 1);
    assert.equal((await recordEvent(message("m-1"), root)).written, true, "the migrated file is re-read without being rejected");
    assert.equal(fs.existsSync(`${metricsFile(root)}.rejected`), false);
    assert.equal(readSnapshot(root).lifetime.agentCompletions, original.lifetime.agentCompletions + 2);
  });
});

test("migration only appends: untouched earlier blocks come through equal, and the new blocks are the only additions", async () => {
  await withRoot(async (root) => {
    fs.mkdirSync(path.join(root, ".project", "metrics"));
    const original = v2Fixture();
    original.note = "kept";
    fs.writeFileSync(metricsFile(root), JSON.stringify(original));
    await recordEvent(message("m-2"), root);
    const migrated = readSnapshot(root);
    assert.equal(migrated.schemaVersion, 3);
    assert.deepEqual(migrated.lifetime.vendors.claude, { ...original.lifetime.vendors.claude, pricedCount: 0 }, "an untouched vendor row is unchanged");
    assert.deepEqual(migrated.recentEventKeys.slice(1), original.recentEventKeys);
    assert.deepEqual(migrated.dimensions.models.claude, undefined);
    assert.deepEqual(Object.keys(migrated).filter((key) => !(key in original)).sort(), [...BLOCKS, "agentModels", "recentSkillKeys"].sort());
  });
});

test("a revision newer than this collector is refused and its bytes stay unchanged", async () => {
  await withRoot(async (root) => {
    fs.mkdirSync(path.join(root, ".project", "metrics"));
    const original = JSON.stringify({ ...v2Fixture(), schemaVersion: SNAPSHOT_REVISION + 1 });
    fs.writeFileSync(metricsFile(root), original);
    const result = await recordEvent(message("m-3"), root);
    assert.equal(result.written, false);
    assert.match(String(result.reason), /is newer than this collector understands/);
    assert.equal(fs.readFileSync(metricsFile(root), "utf8"), original);
  });
});

test("hostile flows, contexts or transcripts, and flow routing that resolves to no row, are replaced and kept aside", async () => {
  const blocks: Json[] = [
    { flows: { since: null, pitches: { p: { phases: { build: { scopes: { S1: { claude: { completions: -1 } } } } } } } } },
    { flows: { since: 5, pitches: {} } },
    { flows: [] },
    { contexts: { s: { pitch: 1, phase: "build", scope: "S1", at: "x" } } },
    { transcripts: { k: { offset: "9", size: 1, ino: 1, dev: 1, recentIds: [], at: "x" } } },
    { current: { ...v1Fixture().current, flow: { applied: true, pitch: "p", phase: "build", scope: "S1" } } },
  ];
  for (const bad of blocks) {
    await withRoot(async (root) => {
      fs.mkdirSync(path.join(root, ".project", "metrics"));
      const text = JSON.stringify({ ...v2Fixture(), schemaVersion: 3, flows: { since: null, pitches: {} }, transcripts: {}, contexts: {}, ...bad });
      fs.writeFileSync(metricsFile(root), text);
      assert.equal((await recordEvent(message("m-4"), root)).written, true);
      assert.equal(readSnapshot(root).lifetime.agentCompletions, 1, "a blank snapshot replaced the hostile one");
      assert.equal(fs.readFileSync(`${metricsFile(root)}.rejected`, "utf8"), text, "the original text is kept byte-equal");
    });
  }
});

test("a stored flow whose row exists is accepted", async () => {
  await withRoot(async (root) => {
    fs.mkdirSync(path.join(root, ".project", "metrics"));
    const current = { ...v1Fixture().current, flow: { applied: true, pitch: "p", phase: "build", scope: "S1" } };
    const flows = { since: "2026-09-25T00:00:00.000Z", pitches: { p: { phases: { build: { scopes: { S1: { claude: oneRow } } } } } } };
    fs.writeFileSync(metricsFile(root), JSON.stringify({ ...v2Fixture(), schemaVersion: 3, current, flows, transcripts: {}, contexts: {} }));
    assert.equal((await recordEvent(message("m-5"), root)).written, true);
    assert.equal(fs.existsSync(`${metricsFile(root)}.rejected`), false);
    assert.equal(readSnapshot(root).flows.pitches.p.phases.build.scopes.S1.claude.completions, 1);
  });
});

test("a metrics directory swapped for a link while the lease is awaited is not followed, and the next event records", async () => {
  await withRoot(async (root) => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "token-outside-"));
    try {
      const metrics = path.join(root, ".project", "metrics");
      const parked = path.join(root, "parked");
      fs.mkdirSync(metrics);
      const base = createNodeDeps({});
      let swaps = 0;
      const deps: RuntimeDeps = { ...base, net: { tryListen: async () => {
        if (swaps++ === 0) { fs.renameSync(metrics, parked); fs.symlinkSync(outside, metrics); }
        return { server: { close: async () => {} } };
      } } };
      const result = await recordEvent(message("m-6"), root, {}, deps);
      assert.equal(result.written, false);
      assert.match(String(result.reason), /metrics directory changed while waiting for the lease/);
      assert.deepEqual(fs.readdirSync(outside), [], "nothing was written through the link");
      fs.rmSync(metrics, { force: true });
      fs.renameSync(parked, metrics);
      assert.equal((await recordEvent(message("m-7"), root, {}, deps)).written, true, "the lease was released and recording resumes");
      assert.equal(readSnapshot(root).lifetime.agentCompletions, 1);
    } finally { fs.rmSync(outside, { recursive: true, force: true }); }
  });
});

// ---- Active-context pointer and phase-start event ----

interface SpyDeps { deps: RuntimeDeps; listens: () => number; setNow: (ms: number) => void }
// An in-memory lease keeps these tests off the shared loopback port derived from the project path.
function spyDeps(start = Date.UTC(2026, 9, 19, 12)): SpyDeps {
  const base = createNodeDeps({});
  let listens = 0;
  let now = start;
  const deps: RuntimeDeps = { ...base, clock: { ...base.clock, now: () => now }, net: { tryListen: async () => { listens += 1; return { server: { close: async () => {} } }; } } };
  return { deps, listens: () => listens, setNow: (ms: number) => { now = ms; } };
}
const slash = (name: string, args: string, extra: Json = {}): CollectorInput => ({ vendor: "claude", event: "phase-start", raw: { session_id: "sess-1", expansion_type: "slash_command", command_name: name, command_args: args, ...extra } });
const pitchDir = (root: string, slug: string): void => fs.mkdirSync(path.join(root, ".project", "pitches", slug), { recursive: true });

test("resolvePhaseContext: a slug, a closed phase and an S<n> scope; everything else is dropped", async () => {
  await withRoot(async (root) => {
    pitchDir(root, "token-attribution");
    const { deps } = spyDeps();
    assert.deepEqual(resolvePhaseContext("build", "token-attribution S5 anything else", root, deps), { pitch: "token-attribution", phase: "build", scope: "S5" });
    assert.deepEqual(resolvePhaseContext("/Build", "token-attribution", root, deps), { pitch: "token-attribution", phase: "build", scope: "(none)" });
    assert.deepEqual(resolvePhaseContext("plan", undefined, root, deps), { pitch: "(unattributed)", phase: "plan", scope: "(none)" });
    assert.equal(resolvePhaseContext("deploy", "token-attribution", root, deps), null, "not a phase");
    assert.equal(resolvePhaseContext("build:other", "", root, deps), null);
    assert.equal(resolvePhaseContext({}, "", root, deps), null);
  });
});

test("pitch argument validation: missing or linked directories and odd names never become keys", async () => {
  await withRoot(async (root) => {
    pitchDir(root, "real-one");
    pitchDir(root, "_parked");
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "pitch-outside-"));
    try {
      fs.symlinkSync(outside, path.join(root, ".project", "pitches", "linked"));
      const { deps } = spyDeps();
      const pitchOf = (args: string): string => resolvePhaseContext("build", args, root, deps)!.pitch;
      assert.equal(pitchOf("real-one"), "real-one");
      for (const bad of ["missing", "linked", "_parked", "Real-One", "../real-one", "real-one/x", "__proto__", "a".repeat(81), "S5 real-one"]) assert.equal(pitchOf(bad), "(unattributed)", bad);
      assert.equal(resolvePhaseContext("build", "real-one S1000 S12", root, deps)!.scope, "S12", "a scope needs one to three digits");
      assert.equal(resolvePhaseContext("build", "real-one S5x s5 S", root, deps)!.scope, "(none)");
    } finally { fs.rmSync(outside, { recursive: true, force: true }); }
  });
});

test("a UserPromptExpansion command sets the session context and never counts a completion", async () => {
  await withRoot(async (root) => {
    pitchDir(root, "token-attribution");
    const spy = spyDeps();
    const result = await recordEvent(slash("build", "token-attribution S6 SECRET-TEXT"), root, {}, spy.deps);
    assert.equal(result.written, true);
    const snapshot = readSnapshot(root);
    assert.deepEqual(snapshot.contexts["sess-1"], { pitch: "token-attribution", phase: "build", scope: "S6", at: "2026-10-19T12:00:00.000Z" });
    assert.equal(snapshot.lifetime.agentCompletions, 0);
    for (const name of ["token-consumption.json", "token-consumption.md", "token-consumption.html"]) assert.doesNotMatch(fs.readFileSync(metricsFile(root, name), "utf8"), /SECRET-TEXT/, name);
  });
});

test("the skill-use path sets a context for a phase skill and not for another skill", async () => {
  await withRoot(async (root) => {
    pitchDir(root, "p-one");
    const spy = spyDeps();
    const skill = (name: string, args = ""): CollectorInput => ({ vendor: "claude", event: "skill-use", raw: { session_id: "sess-2", tool_use_id: `tu-${name}`, tool_input: { skill: name, args } } });
    await recordEvent(skill("caveman"), root, {}, spy.deps);
    assert.deepEqual(readSnapshot(root).contexts, {}, "a non-phase skill leaves no pointer");
    await recordEvent(skill("audit", "p-one"), root, {}, spy.deps);
    const snapshot = readSnapshot(root);
    assert.equal(snapshot.contexts["sess-2"].phase, "audit");
    assert.equal(snapshot.contexts["sess-2"].pitch, "p-one");
    assert.equal(snapshot.dimensions.skills.claude.audit.uses, 1, "the skill is still counted by name");
    await recordEvent({ vendor: "opencode", event: "skill-use", skill: "plan", raw: { session_id: "oc-1" } }, root, {}, spy.deps);
    assert.equal(readSnapshot(root).contexts["oc-1"].phase, "plan", "the OpenCode shape sets one too");
  });
});

test("a subagent's own call never overwrites the parent's context", async () => {
  await withRoot(async (root) => {
    const spy = spyDeps();
    await recordEvent(slash("build", ""), root, {}, spy.deps);
    const result = await recordEvent(slash("ship", "", { agent_id: "helper-1" }), root, {}, spy.deps);
    assert.equal(result.written, false);
    assert.equal(readSnapshot(root).contexts["sess-1"].phase, "build");
  });
});

test("a command that is not a phase returns before the directory or the lease is touched", async () => {
  await withRoot(async (root) => {
    const spy = spyDeps();
    for (const input of [slash("help", ""), slash("build", "", { expansion_type: "other" }), slash("build", "", { session_id: undefined }), { vendor: "claude", event: "phase-start", raw: {} }]) {
      assert.equal((await recordEvent(input, root, {}, spy.deps)).written, false);
    }
    assert.equal(spy.listens(), 0, "the lease was never requested");
    assert.equal(fs.existsSync(path.join(root, ".project", "metrics")), false);
  });
});

test("the context expires after the TTL, and an attributed refresh keeps it alive", async () => {
  await withRoot(async (root) => {
    const spy = spyDeps();
    const hour = 60 * 60 * 1000;
    const start = Date.UTC(2026, 9, 19, 12);
    await recordEvent(slash("build", ""), root, {}, spy.deps);
    assert.ok(activeContext(readSnapshot(root), "sess-1", start + 6 * hour), "exactly at the TTL it is still live");
    assert.equal(activeContext(readSnapshot(root), "sess-1", start + 6 * hour + 1), null, "one millisecond later it is not");
    assert.equal(activeContext(readSnapshot(root), null, start), null);
    spy.setNow(start + 5 * hour);
    await recordEvent(slash("checkpoint", ""), root, {}, spy.deps);
    assert.ok(activeContext(readSnapshot(root), "sess-1", start + 10 * hour), "checkpoint refreshed it");
    spy.setNow(start + 20 * hour);
    assert.equal((await recordEvent(slash("checkpoint", ""), root, {}, spy.deps)).written, false, "an expired pointer is not revived");
    assert.equal((await recordEvent(slash("checkpoint", "", { session_id: "never-started" }), root, {}, spy.deps)).written, false, "checkpoint alone writes nothing");
  });
});

test("the 33rd session evicts the least recently touched pointer", async () => {
  await withRoot(async (root) => {
    const spy = spyDeps();
    for (let index = 1; index <= 32; index += 1) {
      spy.setNow(Date.UTC(2026, 9, 19, 12) + index * 1000);
      await recordEvent(slash("build", "", { session_id: `s-${index}` }), root, {}, spy.deps);
    }
    spy.setNow(Date.UTC(2026, 9, 19, 12) + 40000);
    await recordEvent(slash("build", "", { session_id: "s-33" }), root, {}, spy.deps);
    const contexts = readSnapshot(root).contexts;
    assert.equal(Object.keys(contexts).length, 32);
    assert.equal(contexts["s-1"], undefined, "the oldest was evicted");
    assert.ok(contexts["s-33"] && contexts["s-2"]);
  });
});

test("the phase-start hook prints nothing and exits 0 for valid, malformed, oversized and hostile input", async (t) => {
  const root = metricsRoot(t);
  const args = ["--vendor", "claude", "--event", "phase-start"];
  const inputs: unknown[] = [slash("build", "x").raw, "{not json", "", { command_name: "build", command_args: "A".repeat(2 * 1024 * 1024), session_id: "s" }, { command_name: "__proto__", session_id: "s" }, [1, 2], { command_name: "build", command_args: { a: 1 }, session_id: "s" }];
  for (const input of inputs) {
    const result = cli(root, input, args);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "", "stdout would be added to the model's context");
    assert.ok(!result.stderr.includes(root), result.stderr);
  }
});

// ---- Flows, caps and transcript usage ----

const leavesOf = (snapshot: Json): number => Object.values<Json>(snapshot.flows.pitches).reduce((sum: number, pitch: Json) => sum + Object.values<Json>(pitch.phases).reduce((inner: number, phase: Json) => inner + Object.values<Json>(phase.scopes).reduce((n: number, v: Json) => n + Object.keys(v).length, 0), 0), 0);
const flowCompletions = (snapshot: Json): number => Object.values<Json>(snapshot.flows.pitches).reduce((sum: number, pitch: Json) => sum + Object.values<Json>(pitch.phases).reduce((inner: number, phase: Json) => inner + Object.values<Json>(phase.scopes).reduce((n: number, v: Json) => n + Object.values<Json>(v).reduce((c: number, row: Json) => c + row.completions, 0), 0), 0), 0);

async function startPhase(root: string, deps: RuntimeDeps, name: string, args = "", session = "sess-1"): Promise<void> {
  await recordEvent(slash(name, args, { session_id: session }), root, {}, deps);
}
const stop = (agent: string, extra: Json = {}, session = "sess-1"): CollectorInput => ({ vendor: "claude", event: "subagent-complete", raw: { session_id: session, agent_id: agent, agent_type: "Explore", ...extra } });

test("a completion is stamped with the session's pitch, phase and scope, and an unknown session is unattributed", async () => {
  await withRoot(async (root) => {
    pitchDir(root, "token-attribution");
    const spy = spyDeps();
    await startPhase(root, spy.deps, "build", "token-attribution S7");
    await recordEvent(stop("a1"), root, {}, spy.deps);
    await recordEvent(stop("a2", {}, "other-session"), root, {}, spy.deps);
    const snapshot = readSnapshot(root);
    assert.equal(snapshot.flows.pitches["token-attribution"].phases.build.scopes.S7.claude.completions, 1);
    assert.equal(snapshot.flows.pitches["(unattributed)"].phases["(unattributed)"].scopes["(none)"].claude.completions, 1);
    assert.deepEqual(snapshot.previous.flow, { applied: true, pitch: "token-attribution", phase: "build", scope: "S7" });
    assert.equal(flowCompletions(snapshot), snapshot.lifetime.agentCompletions);
  });
});

test("an upgrade reuses the stored routing even if the context moved to another phase in between", async () => {
  await withRoot(async (root) => {
    pitchDir(root, "p1");
    const spy = spyDeps();
    await startPhase(root, spy.deps, "plan", "p1");
    await recordEvent({ vendor: "claude", event: "subagent-complete", raw: { session_id: "sess-1", agent_id: "a1", agent_type: "Explore" } }, root, {}, spy.deps);
    await startPhase(root, spy.deps, "build", "p1");
    await recordEvent({ vendor: "claude", event: "agent-result", metricScope: "final_request", raw: { session_id: "sess-1", tool_use_id: "tu-1", tool_input: { subagent_type: "Explore" }, usage: { input_tokens: 9, output_tokens: 6 } } }, root, {}, spy.deps);
    const snapshot = readSnapshot(root);
    assert.equal(snapshot.lifetime.agentCompletions, 1);
    assert.equal(snapshot.flows.pitches.p1.phases.plan.scopes["(none)"].claude.tokens, 15, "the upgraded record stayed under plan");
    assert.equal(snapshot.flows.pitches.p1.phases.build, undefined);
  });
});

test("applying then reversing a record restores flows, an underflow throws, and a record without flow.applied is skipped", () => {
  const snapshot = blankSnapshot();
  const start = JSON.stringify(snapshot.flows);
  const record = normalizedEvent({ vendor: "claude", event: "subagent-complete", agentId: "a", raw: { session_id: "s", usage: { input_tokens: 4, output_tokens: 1 } } }, "/nowhere");
  applyToSnapshot(snapshot, record, 1, { pitch: "p", phase: "build", scope: "S1" });
  assert.equal(snapshot.flows.pitches.p.phases.build.scopes.S1.claude.tokens, 5);
  applyToSnapshot(snapshot, record, -1);
  assert.equal(JSON.stringify({ ...snapshot.flows, pitches: snapshot.flows.pitches }).replace(/"since":[^,]*,/, ""), start.replace(/"since":[^,]*,/, ""));
  assert.throws(() => applyToSnapshot(snapshot, record, -1), /underflow/, "no clamping");
  const old = normalizedEvent({ vendor: "claude", event: "subagent-complete", agentId: "b", raw: { session_id: "s" } }, "/nowhere");
  applyToSnapshot(snapshot, old, 1);
  assert.equal(old.flow, undefined, "no intent and no stored routing: nothing is added to flows");
  assert.doesNotThrow(() => applyToSnapshot(snapshot, old, -1));
});

test("caps: the 51st pitch gets a row, totals are kept by folding into (other), and the reversal of current still resolves", () => {
  const snapshot = blankSnapshot();
  const records = [];
  for (let index = 0; index < 60; index += 1) {
    const record = normalizedEvent({ vendor: "claude", event: "subagent-complete", agentId: `a${index}`, raw: { session_id: "s", usage: { input_tokens: 1, output_tokens: 1 } } }, "/nowhere");
    record.recordedAt = new Date(Date.UTC(2026, 9, 19, 12, 0, index)).toISOString();
    snapshot.previous = snapshot.current;
    snapshot.current = record;
    applyToSnapshot(snapshot, record, 1, { pitch: `pitch-${index}`, phase: "build", scope: "S1" });
    records.push(record);
  }
  const names = Object.keys(snapshot.flows.pitches);
  assert.ok(names.includes("pitch-59"), "the newest pitch has its own row");
  assert.ok(names.includes("(other)"));
  assert.ok(names.filter((name) => name !== "(other)").length <= 50);
  assert.equal(flowCompletions(snapshot as Json), 60, "the sum of all flow leaves equals the completions recorded");
  assert.doesNotThrow(() => applyToSnapshot(snapshot, snapshot.current as CompletionRecord, -1), "current still resolves after folds");
});

test("with every cap filled the serialized snapshot stays far below the file cap", () => {
  const snapshot = blankSnapshot();
  let index = 0;
  for (let pitch = 0; pitch < 70; pitch += 1) {
    for (const phase of ["shape", "plan", "build", "audit", "ship"]) {
      for (let scope = 1; scope <= 30; scope += 1) {
        const record = normalizedEvent({ vendor: index % 2 ? "claude" : "opencode", event: "message.completed", idempotencyKey: `k${index}`, raw: { session_id: "s", tokens: { input: 1, output: 1 } } }, "/nowhere");
        record.recordedAt = new Date(Date.UTC(2026, 9, 19, 12) + index * 1000).toISOString();
        snapshot.previous = snapshot.current;
        snapshot.current = record;
        applyToSnapshot(snapshot, record, 1, { pitch: `pitch-${pitch}`, phase, scope: `S${scope}` });
        index += 1;
      }
    }
  }
  assert.ok(leavesOf(snapshot as Json) <= 700, `leaves ${leavesOf(snapshot as Json)}`);
  assert.equal(flowCompletions(snapshot as Json), index, "totals are kept through every fold");
  assert.ok(JSON.stringify(snapshot).length < 2 * 1024 * 1024, "well below the 4 MiB file cap");
});

// -- transcript usage --

const asst = (id: string, output = 5, extra: Json = {}): string => `${JSON.stringify({ type: "assistant", message: { id, model: "claude-sonnet-5-5", role: "assistant", content: [{ type: "text", text: "TRANSCRIPT-TEXT-MARKER" }], usage: { input_tokens: 10, cache_creation_input_tokens: 2, cache_read_input_tokens: 3, output_tokens: output, ...extra } }, toolUseResult: "TRANSCRIPT-TEXT-MARKER" })}\n`;
interface Claude { root: string; home: string; deps: RuntimeDeps; transcript: string; snapshot: () => Json }
function claude(t: TestContext): Claude {
  const root = metricsRoot(t);
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "claude-home-")));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const projects = path.join(home, ".claude", "projects", "s", "subagents");
  fs.mkdirSync(projects, { recursive: true });
  const spy = spyDeps();
  const deps: RuntimeDeps = { ...createTestDeps({ HOME: home, CLAUDE_CONFIG_DIR: undefined }), clock: spy.deps.clock, net: spy.deps.net };
  return { root, home, deps, transcript: path.join(projects, "agent-1.jsonl"), snapshot: () => readSnap(root) };
}
const withTranscript = (c: Claude, agent: string, file = c.transcript): CollectorInput => stop(agent, { agent_transcript_path: file });

test("a SubagentStop counts the agent's transcript usage as a reported agent total, unpriced", async (t) => {
  const c = claude(t);
  fs.writeFileSync(c.transcript, asst("m1", 5) + asst("m1", 9) + asst("m2", 4));
  await recordEvent(withTranscript(c, "a1"), c.root, {}, c.deps);
  const snapshot = c.snapshot();
  assert.equal(snapshot.lifetime.agentCompletions, 1);
  assert.equal(snapshot.lifetime.tokens.input, 20);
  assert.equal(snapshot.lifetime.tokens.output, 13, "the last line of a repeated message id wins");
  assert.equal(snapshot.lifetime.tokens.cacheRead, 6);
  assert.equal(snapshot.lifetime.tokens.cacheWrite, 4);
  assert.equal(snapshot.current.metricScope, "agent_total");
  assert.equal(snapshot.current.availability, "reported");
  assert.equal(snapshot.current.costUsd, null);
  assert.equal(snapshot.current.model, "claude-sonnet-5-5");
  const keys = Object.keys(snapshot.transcripts);
  assert.equal(keys.length, 1);
  assert.match(keys[0], /^[0-9a-f]{64}$/, "keyed by a hash of the real path, never the path");
});

test("a repeated SubagentStop counts tokens once, with or without an agent id", async (t) => {
  const c = claude(t);
  fs.writeFileSync(c.transcript, asst("m1") + asst("m2"));
  await recordEvent(withTranscript(c, "a1"), c.root, {}, c.deps);
  await recordEvent(withTranscript(c, "a1"), c.root, {}, c.deps);
  await recordEvent({ vendor: "claude", event: "subagent-complete", raw: { session_id: "sess-1", agent_type: "Explore", agent_transcript_path: c.transcript } }, c.root, {}, c.deps);
  await recordEvent({ vendor: "claude", event: "subagent-complete", raw: { session_id: "sess-1", agent_type: "Explore", agent_transcript_path: c.transcript } }, c.root, {}, c.deps);
  assert.equal(c.snapshot().lifetime.tokens.input, 20, "each message was counted once");
});

test("a partial trailing line is counted only once a later event reads it complete; a shorter file never double counts", async (t) => {
  const c = claude(t);
  const partial = asst("m2").trimEnd();
  fs.writeFileSync(c.transcript, asst("m1") + partial);
  await recordEvent(withTranscript(c, "a1"), c.root, {}, c.deps);
  assert.equal(c.snapshot().lifetime.tokens.input, 10);
  fs.appendFileSync(c.transcript, "\n");
  await recordEvent(withTranscript(c, "a2"), c.root, {}, c.deps);
  assert.equal(c.snapshot().lifetime.tokens.input, 20);
  fs.writeFileSync(c.transcript, asst("m1") + asst("m2") + asst("m3").slice(0, 10));
  await recordEvent(withTranscript(c, "a3"), c.root, {}, c.deps);
  assert.equal(c.snapshot().lifetime.tokens.input, 20, "m1 and m2 are in the id window");
});

test("a failed snapshot write leaves the offset and totals unchanged, and the next event counts each message once", async (t) => {
  const c = claude(t);
  fs.writeFileSync(c.transcript, asst("m1") + asst("m2"));
  await recordEvent(withTranscript(c, "seed"), c.root, {}, c.deps);
  fs.appendFileSync(c.transcript, asst("m3"));
  const before = fs.readFileSync(snapshotFile(c.root), "utf8");
  let armed = true;
  const failing: RuntimeDeps = { ...c.deps, fs: { ...c.deps.fs, renameSync: (from: string, to: string) => { if (armed && to.endsWith("token-consumption.json")) { armed = false; throw new Error("disk"); } c.deps.fs.renameSync(from, to); } } };
  await assert.rejects(() => recordEvent(withTranscript(c, "a2"), c.root, {}, failing));
  assert.equal(fs.readFileSync(snapshotFile(c.root), "utf8"), before);
  await recordEvent(withTranscript(c, "a2"), c.root, {}, c.deps);
  assert.equal(c.snapshot().lifetime.tokens.input, 30, "m3 counted exactly once");
});

test("two events interleaved on one transcript count each message once", async (t) => {
  const c = claude(t);
  fs.writeFileSync(c.transcript, asst("m1") + asst("m2"));
  await Promise.all([recordEvent(withTranscript(c, "a1"), c.root, {}, c.deps), recordEvent(withTranscript(c, "a2"), c.root, {}, c.deps)]);
  const snapshot = c.snapshot();
  assert.equal(snapshot.lifetime.tokens.input, 20);
  assert.equal(snapshot.lifetime.agentCompletions, 2);
});

test("a foreground agent-result after a SubagentStop reported from its transcript is absorbed, and fills a missing model", async (t) => {
  const c = claude(t);
  fs.writeFileSync(c.transcript, `${JSON.stringify({ message: { id: "m1", usage: { input_tokens: 10, output_tokens: 5 } } })}\n`);
  await recordEvent(withTranscript(c, "a1"), c.root, {}, c.deps);
  assert.equal(c.snapshot().current.model, null);
  await recordEvent({ vendor: "claude", event: "agent-result", metricScope: "final_request", raw: { session_id: "sess-1", tool_use_id: "tu-9", model: "claude-opus-5-5", tool_input: { subagent_type: "Explore" }, usage: { input_tokens: 99, output_tokens: 99 } } }, c.root, {}, c.deps);
  const snapshot = c.snapshot();
  assert.equal(snapshot.lifetime.agentCompletions, 1);
  assert.equal(snapshot.lifetime.tokens.total, 15, "transcript totals stay");
  assert.equal(snapshot.current.model, "claude-opus-5-5");
  assert.equal(snapshot.dimensions.models.claude["claude-opus-5-5"].completions, 1);
  assert.equal(flowCompletions(snapshot), 1);
});

test("a main-session Stop counts new transcript usage once per turn, and degrades to unavailable without a path", async (t) => {
  const c = claude(t);
  const main = path.join(c.home, ".claude", "projects", "s", "main.jsonl");
  fs.writeFileSync(main, asst("t1") + asst("t2"));
  const turn: CollectorInput = { vendor: "claude", event: "session-turn", raw: { session_id: "sess-1", transcript_path: main } };
  await recordEvent(turn, c.root, {}, c.deps);
  let snapshot = c.snapshot();
  assert.equal(snapshot.lifetime.agentCompletions, 1);
  assert.equal(snapshot.current.agentType, "primary");
  assert.equal(snapshot.lifetime.tokens.input, 10, "the newest group waits until the file is final or another id follows");
  await recordEvent(turn, c.root, {}, c.deps);
  assert.equal(c.snapshot().lifetime.agentCompletions, 1, "no new usage: no empty completion");
  fs.appendFileSync(main, asst("t3"));
  await recordEvent(turn, c.root, {}, c.deps);
  snapshot = c.snapshot();
  assert.equal(snapshot.lifetime.agentCompletions, 2);
  assert.equal(snapshot.lifetime.tokens.input, 20);
  await recordEvent({ vendor: "claude", event: "session-turn", raw: { session_id: "sess-1" } }, c.root, {}, c.deps);
  assert.equal(c.snapshot().lifetime.unavailableCount, 1, "no transcript_path: counted as an unavailable completion");
});

test("a refused transcript still counts the completion as unavailable, writes no cursor, and touches nothing outside the metrics directory", async (t) => {
  const c = claude(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "tx-outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.writeFileSync(path.join(outside, "o.jsonl"), asst("o1"));
  fs.symlinkSync(path.join(outside, "o.jsonl"), path.join(path.dirname(c.transcript), "link.jsonl"));
  const fifo = path.join(path.dirname(c.transcript), "pipe.jsonl");
  assert.equal(spawnSync("mkfifo", [fifo]).status, 0);
  const before = fs.readdirSync(outside);
  for (const file of [path.join(path.dirname(c.transcript), "link.jsonl"), path.join(outside, "o.jsonl"), fifo, path.join(path.dirname(c.transcript), "missing.jsonl")]) {
    await recordEvent(withTranscript(c, `a-${path.basename(file)}`, file), c.root, {}, c.deps);
  }
  const snapshot = c.snapshot();
  assert.equal(snapshot.lifetime.agentCompletions, 4);
  assert.equal(snapshot.lifetime.unavailableCount, 4);
  assert.deepEqual(snapshot.transcripts, {});
  assert.deepEqual(fs.readdirSync(outside), before);
});

test("transcript text never reaches a metrics file, an id block or stderr", async (t) => {
  const c = claude(t);
  fs.writeFileSync(c.transcript, asst("m1") + asst("m2"));
  await recordEvent(withTranscript(c, "a1"), c.root, {}, c.deps);
  const ran = spawnSync(process.execPath, [...RUNTIME_FLAGS, COLLECTOR, "--vendor", "claude", "--event", "subagent-complete", "--root", c.root], { input: JSON.stringify(withTranscript(c, "a9").raw), encoding: "utf8", env: { ...process.env, HOME: c.home, CLAUDE_CONFIG_DIR: "" } });
  assert.equal(ran.status, 0);
  assert.doesNotMatch(ran.stderr, /TRANSCRIPT-TEXT-MARKER/);
  const directory = path.join(c.root, ".project", "metrics");
  for (const name of fs.readdirSync(directory)) {
    if (fs.lstatSync(path.join(directory, name)).isFile()) assert.doesNotMatch(fs.readFileSync(path.join(directory, name), "utf8"), /TRANSCRIPT-TEXT-MARKER|\/claude-home-/, name);
  }
});

test("reader values are re-validated at the write point", () => {
  const messages = [{ input: 1.5, output: -1, cacheRead: 2e12, cacheWrite: null }, { input: 3, output: 4, cacheRead: null, cacheWrite: 5 }];
  assert.deepEqual(transcriptTokens([messages[0]]), { input: null, output: null, reasoning: null, cacheRead: null, cacheWrite: null, total: null });
  const mixed = transcriptTokens(messages);
  assert.equal(mixed.input, 3);
  assert.equal(mixed.output, 4);
  assert.equal(mixed.total, 7);
});

test("a replay of the same completion identity keeps its stored routing after the context moved", async () => {
  await withRoot(async (root) => {
    pitchDir(root, "p1");
    const spy = spyDeps();
    const turn = (tokens: number): CollectorInput => ({ vendor: "claude", event: "agent-complete", raw: { session_id: "sess-1", turn_id: "t1", usage: { input_tokens: tokens } } });
    await startPhase(root, spy.deps, "plan", "p1");
    await recordEvent(turn(1), root, {}, spy.deps);
    await startPhase(root, spy.deps, "build", "p1");
    await recordEvent(turn(5), root, {}, spy.deps);
    const snapshot = readSnapshot(root);
    assert.equal(snapshot.lifetime.agentCompletions, 1, "the replay replaced the first record");
    assert.equal(snapshot.flows.pitches.p1.phases.plan.scopes["(none)"].claude.tokens, 5);
    assert.equal(snapshot.flows.pitches.p1.phases.build, undefined);
  });
});

test("a transcript path over the length cap is ignored: the completion is unavailable and no cursor is written", async (t) => {
  const c = claude(t);
  const long = path.join(path.dirname(c.transcript), "a".repeat(4100));
  await recordEvent(withTranscript(c, "a1", long), c.root, {}, c.deps);
  const snapshot = c.snapshot();
  assert.equal(snapshot.lifetime.unavailableCount, 1);
  assert.deepEqual(snapshot.transcripts, {});
});

test("at most 200 transcript cursors are kept, the least recently used going first", async (t) => {
  const c = claude(t);
  const dir = path.dirname(c.transcript);
  for (let index = 0; index < 202; index += 1) {
    const file = path.join(dir, `agent-${index}.jsonl`);
    fs.writeFileSync(file, asst(`m${index}`));
    await recordEvent(withTranscript(c, `a${index}`, file), c.root, {}, c.deps);
  }
  const keys = Object.keys(c.snapshot().transcripts);
  assert.equal(keys.length, 200);
});

test("a transcript rewritten shorter on the same inode counts its new messages under the lease", async (t) => {
  const c = claude(t);
  fs.writeFileSync(c.transcript, asst("m1") + asst("m2") + asst("m3"));
  await recordEvent(withTranscript(c, "a1"), c.root, {}, c.deps);
  assert.equal(c.snapshot().lifetime.tokens.input, 30);
  fs.writeFileSync(c.transcript, asst("m9"));
  await recordEvent(withTranscript(c, "a2"), c.root, {}, c.deps);
  assert.equal(c.snapshot().lifetime.tokens.input, 40, "m9 counted once; the old ids are not counted again");
});
