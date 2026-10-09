import assert from "node:assert/strict";
import { test } from "node:test";
import { NODE_FLAGS, runWorkflow, runWorkflowSync, workflowInvocation } from "./entry.mts";
import { createTestDeps } from "./test-helpers.mts";

const base = createTestDeps();
test("workflow children select the declared executable in both directions", () => {
  for (const current of ["node", "bun"] as const) {
    for (const selected of ["node", "bun"] as const) {
      const deps = { ...base, runtime: current, proc: { ...base.proc, execPath: `/runtime/${current}`,
        versions: current === "bun" ? { bun: "test" } : {}, env: { AI_WORKFLOW_RUNNER: selected } } };
      const invocation = workflowInvocation(deps, [...NODE_FLAGS, "script.mts", "--experimental-strip-types", "a b"]);
      assert.equal(invocation.command, current === selected ? `/runtime/${current}` : selected);
      assert.deepEqual(invocation.args, [...(selected === "node" ? NODE_FLAGS : []), "script.mts", "--experimental-strip-types", "a b"]);
      assert.equal(invocation.options.env?.AI_WORKFLOW_RUNNER, selected);
    }
  }
});

test("child overrides win, sanitized environments retain the selected runner, invalid choices fail", () => {
  const deps = { ...base, proc: { ...base.proc, env: { AI_WORKFLOW_RUNNER: "bun", SECRET: "parent-only" } } };
  const overridden = workflowInvocation(deps, ["script.mts"], { env: { AI_WORKFLOW_RUNNER: " NODE ", PATH: "/custom" } });
  assert.equal(overridden.options.env?.AI_WORKFLOW_RUNNER, "node");
  assert.equal(overridden.options.env?.PATH, "/custom");
  assert.equal(overridden.options.env?.SECRET, undefined);
  assert.deepEqual(workflowInvocation(deps, ["script.mts"], { env: { PATH: "/custom" } }).options.env,
    { PATH: "/custom", AI_WORKFLOW_RUNNER: "bun" });
  assert.throws(() => workflowInvocation(deps, ["script.mts"], { env: { AI_WORKFLOW_RUNNER: "deno" } }), /AI_WORKFLOW_RUNNER/);
  assert.deepEqual(workflowInvocation(deps, ["--test", "test.mts"]).args, ["test", "test.mts"]);
});

test("sync and async workflow dispatch use the same selection and preserve spawn options", async () => {
  const calls: unknown[] = [];
  const result = { status: 7, signal: null, stdout: "out", stderr: "err" };
  const deps = { ...base, child: { ...base.child,
    runSync: (...args: Parameters<typeof base.child.runSync>) => { calls.push(args); return result; },
    run: async (...args: Parameters<typeof base.child.run>) => { calls.push(args); return result; } } };
  const options = { env: { ...base.proc.env, AI_WORKFLOW_RUNNER: "bun" }, timeoutMs: 100, input: "payload", cwd: "/root" };
  assert.equal(runWorkflowSync(deps, ["script.mts"], options), result);
  assert.equal(await runWorkflow(deps, ["script.mts"], options), result);
  assert.deepEqual(calls[0], calls[1]);
  assert.deepEqual((calls[0] as unknown[])[2], options);
});
