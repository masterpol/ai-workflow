import assert from "node:assert/strict";
import { test } from "node:test";
import { main } from "./workflow-metrics.mts";
import { createTestDeps, captureIo, runScript, tempFixture } from "./runtime/test-helpers.mts";
import type { RuntimeDeps } from "./runtime/types.mts";
import { STATE_FILE } from "./workflow-metrics-state.mts";

const event = (eventId = "one") => ({ eventId, kind: "skill.used", vendor: "codex", source: "manual", skill: "build" });
test("records stdin with explicit or default root and returns no payload or opaque ID", async t => {
  const base = createTestDeps(), root = tempFixture(base, { ".project/.gitkeep": "" });
  t.after(() => base.fs.rmSync(root, { recursive: true, force: true }));
  const deps = captureIo({ ...base, proc: { ...base.proc, cwd: () => root }, io: { ...base.io, stdin: { readText: async () => JSON.stringify(event()) } } });
  assert.equal(await main(["record"], deps), 0);
  assert.deepEqual(deps.out, ['{"written":true}\n']); assert.deepEqual(deps.err, []);
  assert.equal(await main(["record", "--root", root], deps), 1);
  assert.deepEqual(deps.err, ["[workflow-metrics] duplicate event\n"]);
  assert.equal(await main(["record", "--root", root, "--best-effort"], deps), 0);
});

test("rejects bad commands, invalid JSON, excessive bytes and runtime errors with fixed messages", async () => {
  const base = createTestDeps();
  const deps = captureIo({ ...base, io: { ...base.io, stdin: { readText: async () => "{SECRET-MARKER" } } });
  for (const args of [[], ["unknown"], ["record", "--root"], ["record", "--bad", "SECRET"], ["record", "--root", "--best-effort"], ["report", "--format", "invalid"], ["record", "--format", "json"]]) assert.equal(await main(args, deps), args.includes("--best-effort") ? 0 : 1);
  assert.equal(await main(["record"], deps), 1); assert.match(deps.err.at(-1)!, /stdin is not valid JSON/);
  for (const [code, expected] of [["E2BIG", "stdin exceeds 16 KiB"], ["EACCES", "operation failed (EACCES)"]] as const) {
    const broken: RuntimeDeps = { ...deps, io: { ...deps.io, stdin: { readText: async () => { throw Object.assign(new Error("SECRET-MARKER/path"), { code }); } } } };
    assert.equal(await main(["record"], broken), 1); assert.match(deps.err.at(-1)!, new RegExp(expected.replace(/[()]/g, "\\$&")));
  }
  const invalid = { ...deps, io: { ...deps.io, stdin: { readText: async () => "{}" } } };
  assert.equal(await main(["record", "--best-effort"], invalid), 0);
  assert.doesNotMatch(deps.err.join(""), /SECRET-MARKER|SECRET|\/path/);
});

test("runs the real CLI with bounded byte input and preserves legacy files", t => {
  const deps = createTestDeps(), root = tempFixture(deps, { ".project/.gitkeep": "", ".project/metrics/token-consumption.json": "LEGACY-MARKER" });
  t.after(() => deps.fs.rmSync(root, { recursive: true, force: true }));
  const script = deps.path.join(import.meta.dirname, "workflow-metrics.mts");
  const env = { ...process.env, AI_WORKFLOW_RUNNER: deps.runtime };
  const run = (input: string, args = ["record", "--root", root]) => runScript(deps, script, args, { env, input, timeoutMs: 10_000 });
  const recorded = run(JSON.stringify({ ...event(), prompt: "PROMPT-MARKER", costUsd: 999, tokens: { output: 5 } }));
  assert.equal(recorded.status, 0, recorded.stderr); assert.equal(recorded.stdout, '{"written":true}\n');
  assert.equal(deps.fs.readFileSync(deps.path.join(root, ".project/metrics/token-consumption.json")), "LEGACY-MARKER");
  const saved = deps.fs.readFileSync(deps.path.join(root, ".project/metrics", STATE_FILE));
  assert.doesNotMatch(saved, /PROMPT-MARKER|costUsd|tokens/);
  assert.equal(run('"' + "é".repeat(9000) + '"').status, 1);
  assert.match(run('"' + "é".repeat(9000) + '"').stderr, /stdin exceeds 16 KiB/);
  assert.equal(deps.fs.readFileSync(deps.path.join(root, ".project/metrics", STATE_FILE)), saved);
});

test("coordinates concurrent legacy and workflow collector processes on the same lease", { timeout: 15_000 }, async t => {
  const deps = createTestDeps(), root = tempFixture(deps, { ".project/.gitkeep": "" });
  t.after(() => deps.fs.rmSync(root, { recursive: true, force: true }));
  const workflow = deps.path.join(import.meta.dirname, "workflow-metrics.mts");
  const legacy = deps.path.join(import.meta.dirname, "../hooks/scripts/token-consumption.mts");
  const env = { ...process.env, AI_WORKFLOW_RUNNER: deps.runtime };
  const tasks = [
    deps.child.run(deps.proc.execPath, [workflow, "record", "--root", root], { env, input: JSON.stringify(event("shared")), timeoutMs: 10_000 }),
    deps.child.run(deps.proc.execPath, [workflow, "record", "--root", root], { env, input: JSON.stringify(event("shared")), timeoutMs: 10_000 }),
    deps.child.run(deps.proc.execPath, [workflow, "record", "--root", root], { env, input: JSON.stringify(event("second")), timeoutMs: 10_000 }),
    deps.child.run(deps.proc.execPath, [legacy, "--vendor", "codex", "--event", "subagent-complete", "--root", root], { env, input: JSON.stringify({ agent_id: "agent", session_id: "session" }), timeoutMs: 10_000 }),
  ];
  const results = await Promise.all(tasks);
  assert.equal(results.filter(r => r.status === 0).length, 3, JSON.stringify(results));
  assert.equal(results.filter(r => r.stderr.includes("duplicate event")).length, 1);
  const current = JSON.parse(deps.fs.readFileSync(deps.path.join(root, ".project/metrics", STATE_FILE)));
  assert.equal(current.totals.events["skill.used"], 2);
  const old = JSON.parse(deps.fs.readFileSync(deps.path.join(root, ".project/metrics/token-consumption.json")));
  assert.equal(old.lifetime.agentCompletions, 1);
});

test("reports JSON, Markdown and HTML without reading stdin or creating an empty event snapshot", async t => {
  const base = createTestDeps(), root = tempFixture(base, { ".project/.gitkeep": "" });
  t.after(() => base.fs.rmSync(root, { recursive: true, force: true }));
  const deps = captureIo({ ...base, proc: { ...base.proc, cwd: () => root }, io: { ...base.io, stdin: { readText: async () => { throw new Error("must not read stdin"); } } } });
  assert.equal(await main(["report", "--format", "json"], deps), 0);
  assert.equal(JSON.parse(deps.out[0]).collection.status, "unavailable");
  assert.equal(await main(["report"], deps), 0); assert.match(deps.out[1], /^# Workflow usage/);
  assert.equal(await main(["report", "--root", root, "--format", "html"], deps), 0); assert.match(deps.out[2], /^<!doctype html>/);
  assert.equal(base.fs.existsSync(base.path.join(root, ".project/metrics", STATE_FILE)), false);
  base.fs.writeFileSync(base.path.join(root, ".project/metrics", STATE_FILE), "SECRET-MALFORMED");
  assert.equal(await main(["report", "--format", "json"], deps), 1);
  assert.match(deps.err.at(-1)!, /invalid workflow state JSON/);
  assert.equal(await main(["report", "--best-effort"], deps), 0);
  assert.doesNotMatch(deps.err.join(""), /SECRET-MALFORMED/);
});

test("keeps a root-resolution failure in fixed error output", async () => {
  const base = createTestDeps();
  const deps = captureIo({ ...base, proc: { ...base.proc, cwd: () => { throw Object.assign(new Error("SECRET/path"), { code: "ENOENT" }); } } });
  assert.equal(await main(["report"], deps), 1);
  assert.deepEqual(deps.err, ["[workflow-metrics] operation failed (ENOENT)\n"]);
});
