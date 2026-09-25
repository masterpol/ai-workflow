const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { recordEvent } = require("./token-consumption.js");

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
