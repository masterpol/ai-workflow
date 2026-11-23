import assert from "node:assert/strict";
import { test } from "node:test";
import { parseInstalledAgents, resolveOpenCodeAgentId } from "./orca-policy.mts";

// Exact output recorded from `orca agent installed --json` on Orca 1.4.271, 2026-11-23.
const RECORDED_INSTALLED = '{"ok": true, "result": {"agents": [{"id": "claude", "name": "Claude", "default": true}, {"id": "claude-agent-teams", "name": "Claude Agent Teams", "default": false}, {"id": "codex", "name": "Codex", "default": false}, {"id": "opencode", "name": "OpenCode", "default": false}]}}';
// In-memory mutations of the captured envelope; no CLI process or mock is needed.
const withAgents = (agents: unknown[]): string => {
  const captured = JSON.parse(RECORDED_INSTALLED);
  captured.result.agents = agents;
  return JSON.stringify(captured);
};

test("recorded installed-agent output parses and selects this host's opencode id", () => {
  const installedAgents = parseInstalledAgents(RECORDED_INSTALLED);
  assert.deepEqual(installedAgents, ["claude", "claude-agent-teams", "codex", "opencode"]);
  assert.deepEqual(resolveOpenCodeAgentId({ env: {}, installedAgents }), { agentId: "opencode" });
});

test("prefers opencode2 only when installed, regardless of list order", () => {
  for (const installedAgents of [["opencode"], ["opencode", "opencode2"], ["opencode2", "opencode"], ["opencode2"]]) {
    assert.deepEqual(resolveOpenCodeAgentId({ env: {}, installedAgents }), {
      agentId: installedAgents.includes("opencode2") ? "opencode2" : "opencode",
    });
  }
});

test("unavailable installed list refuses before checking any override", () => {
  for (const override of [undefined, "opencode", "opencode2", "hostile\nvalue"]) {
    assert.deepEqual(resolveOpenCodeAgentId({ env: { AI_WORKFLOW_ORCA_OPENCODE_AGENT: override }, installedAgents: undefined }),
      { error: "installed-agents-unavailable" });
  }
});

test("an available list without an OpenCode id refuses", () => {
  for (const installedAgents of [[], ["codex", "claude"], ["opencode3"]]) {
    assert.deepEqual(resolveOpenCodeAgentId({ env: {}, installedAgents }), { error: "no-opencode-agent-installed" });
  }
});

test("both exact overrides require membership and take precedence over preference", () => {
  for (const agentId of ["opencode", "opencode2"]) {
    const env = Object.freeze({ AI_WORKFLOW_ORCA_OPENCODE_AGENT: agentId });
    assert.deepEqual(resolveOpenCodeAgentId({ env, installedAgents: ["opencode", "opencode2"] }), { agentId });
    for (const installedAgents of [[], [agentId === "opencode" ? "opencode2" : "opencode"]]) {
      assert.deepEqual(resolveOpenCodeAgentId({ env, installedAgents }), { error: "agent-not-installed" });
    }
  }
});

const invalidOverrides = {
  empty: ["", " ", "\t\n", "\u00a0"],
  unknown: ["codex", "OpenCode2", "opencode3", "x".repeat(4096)],
  flags: ["--agent=opencode2", "opencode2 --help", "-opencode"],
  spaces: [" opencode2", "opencode2 ", "open code2", "opencode\u00a02"],
  controls: ["opencode2\n", "opencode\r", "opencode2\0", "opencode\t2", "\u001bopencode2", "opencode2\u007f"],
  shell: ["opencode2;whoami", "$(whoami)", "`whoami`", "opencode|cat"],
};
for (const [kind, values] of Object.entries(invalidOverrides)) {
  test(`invalid override fails closed: ${kind}`, () => {
    for (const value of values) {
      for (const installedAgents of [[], ["opencode", "opencode2"], [value]]) {
        const result = resolveOpenCodeAgentId({ env: { AI_WORKFLOW_ORCA_OPENCODE_AGENT: value }, installedAgents });
        assert.deepEqual(result, { error: "invalid-opencode-agent" });
        assert.equal(Object.hasOwn(result, "agentId"), false);
      }
    }
  });
}

test("parser ignores hostile entries while keeping only closed string ids", () => {
  const invalid = [null, [], "opencode2", 2, {}, { id: 3 }, { id: "" }, { id: "OpenCode" }, { id: "-opencode" },
    { id: "opencode2\n" }, { id: "opencode2;whoami" }, { id: "$(whoami)" }, { id: "opencode\0" },
    { id: "a".repeat(65) }, { id: "opencode --help" }, { id: "open_code" }];
  const installedAgents = parseInstalledAgents(withAgents([...invalid, { id: "a".repeat(64) }, { id: "opencode" }]));
  assert.deepEqual(installedAgents, ["a".repeat(64), "opencode"]);
  assert.deepEqual(resolveOpenCodeAgentId({ env: {}, installedAgents }), { agentId: "opencode" });
  assert.deepEqual(parseInstalledAgents(withAgents(invalid)), []);
});

test("parser returns at most 64 ids, excluding later launch candidates", () => {
  const ids = Array.from({ length: 64 }, (_, index) => `agent-${index}`);
  const installedAgents = parseInstalledAgents(withAgents([null, ...ids.map((id) => ({ id })), { id: "opencode2" }]));
  assert.deepEqual(installedAgents, ids);
  assert.deepEqual(resolveOpenCodeAgentId({ env: {}, installedAgents }), { error: "no-opencode-agent-installed" });
});

test("parser refuses malformed or oversized text and unexpected envelopes", () => {
  for (const text of ["{", "not JSON", "null", "[]", "1", '"text"', "{}", '{"agents":[]}',
    '{"result":null}', '{"result":[]}', '{"result":{"agents":{}}}', '{"result":{"agents":null}}',
    RECORDED_INSTALLED.padEnd(65537, " ")]) {
    assert.equal(parseInstalledAgents(text), undefined);
    assert.deepEqual(resolveOpenCodeAgentId({ env: {}, installedAgents: parseInstalledAgents(text) }),
      { error: "installed-agents-unavailable" });
  }
  assert.deepEqual(parseInstalledAgents(RECORDED_INSTALLED.padEnd(65536, " ")), ["claude", "claude-agent-teams", "codex", "opencode"]);
});
