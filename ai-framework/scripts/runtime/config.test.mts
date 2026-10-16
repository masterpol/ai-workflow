import { test } from "node:test";
import assert from "node:assert";
import { loadConfig, errorCodes } from "./config.mts";
import { createTestDeps, tempFixture } from "./test-helpers.mts";

test("loadConfig parses a minimal TOON file", () => {
    const deps = createTestDeps();
    const toon = [
        "schemaVersion: 1",
        "runtime:",
        "  runner: node",
        "engines:",
        "  orca: \"1.4.224\"",
        "orchestration:",
        "  multiAgent: false",
        "  enabled: false",
        "  maxConcurrentWorkers: 3",
        "  maxRetriesPerTask: 1",
        "doctor:",
        "  modelRouting: project",
        "skills:",
        "  modes:",
        "    caveman: full",
        "integrations: {}",
    ].join("\n");
    const root = tempFixture(deps, { "ai-workflow.toon": toon });
    try {
        const result = loadConfig(root, deps);
        assert.ok("model" in result, "loadConfig should return a model");
        const { model, problems } = result as { model: NonNullable<unknown>; problems: unknown[] };
        assert.equal((model as { schemaVersion: number }).schemaVersion, 1);
        assert.deepEqual((model as { runtime: { runner: string } }).runtime, { runner: "node" });
        assert.equal(problems.length, 0);
    } finally {
        deps.fs.rmSync(root, { recursive: true, force: true });
    }
});

test("loadConfig reports unknown schemaVersion", () => {
    const deps = createTestDeps();
    const toon = [
        "schemaVersion: 2",
        "runtime:",
        "  runner: node",
        "engines:",
        "  orca: \"1.4.224\"",
        "orchestration:",
        "  multiAgent: false",
        "  enabled: false",
        "  maxConcurrentWorkers: 3",
        "  maxRetriesPerTask: 1",
        "doctor:",
        "  modelRouting: project",
        "skills:",
        "  modes:",
        "    caveman: full",
        "integrations: {}",
    ].join("\n");
    const root = tempFixture(deps, { "ai-workflow.toon": toon });
    try {
        const result = loadConfig(root, deps);
        assert.ok("status" in result, "unknown schemaVersion should be refused");
        assert.equal((result as { code: string }).code, errorCodes.schemaVersionUnknown);
    } finally {
        deps.fs.rmSync(root, { recursive: true, force: true });
    }
});
