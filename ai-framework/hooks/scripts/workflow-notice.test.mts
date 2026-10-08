import assert from "node:assert/strict";
import { test } from "node:test";
import { main } from "./workflow-notice.mts";
import { captureIo, createTestDeps, runScript } from "../../scripts/runtime/test-helpers.mts";

const base = createTestDeps();
function notice(input: string, platform = base.proc.platform) {
  return captureIo({ ...base, proc: { ...base.proc, platform }, io: { ...base.io, stdin: { readText: async () => input } } });
}

test("development guard retains blocked exit and Windows pass-through", async () => {
  const input = JSON.stringify({ tool_input: { command: "pnpm dev" } });
  const blocked = notice(input, "darwin");
  assert.equal(await main(["dev-server"], blocked), 2); assert.deepEqual(blocked.out, []);
  assert.match(blocked.err.join(""), /BLOCKED/);
  const windows = notice(input, "win32"); assert.equal(await main(["dev-server"], windows), 0);
  assert.deepEqual(windows.out, [input + "\n"]);
});

test("push and PR notices preserve input and produce review guidance", async () => {
  const push = notice('{"tool_input":{"command":"git push"}}');
  assert.equal(await main(["push"], push), 0); assert.match(push.err.join(""), /Continuing with push/);
  const pr = notice(JSON.stringify({ tool_input: { command: "gh pr create" }, tool_output: { output: "https://github.com/owner/repo/pull/42" } }));
  assert.equal(await main(["pull-request"], pr), 0);
  assert.match(pr.err.join(""), /gh pr review 42 --repo owner\/repo/);
  assert.equal(JSON.parse(pr.out[0]).tool_input.command, "gh pr create");
  for (const input of ["bad JSON", "null", "{}", '{"tool_input":{"command":7}}']) {
    const malformed = notice(input); assert.equal(await main(["push"], malformed), 0);
    assert.deepEqual(malformed.out, [input + "\n"]); assert.deepEqual(malformed.err, []);
  }
});

test("real notice entry honors the effective runner and bounded stdin", () => {
  const script = base.path.join(import.meta.dirname, "workflow-notice.mts");
  const result = runScript(base, script, ["push"], { input: '{"tool_input":{"command":"git push"}}', timeoutMs: 10_000 });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stderr, /Review changes/);
  const oversized = runScript(base, script, ["push"], { input: "x".repeat(65 * 1024), timeoutMs: 10_000 });
  assert.equal(oversized.status, 1); assert.equal(oversized.stdout, "");
});
