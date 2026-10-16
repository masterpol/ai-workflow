import { describe, test } from "node:test";
import assert from "node:assert";
import { loadConfig, errorCodes, MAX_CONFIG_BYTES } from "./config.mts";
import { createTestDeps, memoryFs, tempFixture } from "./test-helpers.mts";
import type { FsDeps, RuntimeDeps, StatLike } from "./types.mts";

/*
mutant-7-parserPrototypePollution-nestedKey
mutant-7-parserWithinRoleDuplicate-duplicateImplementation
mutant-7-parserUnrecognized-weirdKey
mutant-7-lexerUnreadable-eacces
mutant-7-lexerOversize-64kPlusOne
mutant-7-lexerSymlink-symlinkedLeaf
mutant-7-regexpBacktracking-quotedCommas
*/

function assertProblemCode(problems: { code: string }[], code: string): void {
    if (problems.some((p) => p.code === code)) return;
    throw new Error("expected problem code " + code + ", got " + JSON.stringify(problems));
}

function memoryDeps(mem: Partial<FsDeps>): RuntimeDeps {
    const base = createTestDeps();
    const descriptors = new Map<number, { file: string; position: number }>();
    let nextFd = 3;
    const fs = {
        ...base.fs,
        ...mem,
        realpathSync: (file: string): string => file,
        openSync: (file: string): number => {
            const fd = nextFd++;
            descriptors.set(fd, { file, position: 0 });
            return fd;
        },
        fstatSync: (fd: number): StatLike => {
            const d = descriptors.get(fd);
            if (!d) throw Object.assign(new Error("EBADF"), { code: "EBADF" });
            return mem.lstatSync!(d.file);
        },
        readSync: (fd: number, buffer: Uint8Array, offset: number, length: number, position: number | null): number => {
            const d = descriptors.get(fd);
            if (!d) throw Object.assign(new Error("EBADF"), { code: "EBADF" });
            const text = mem.readFileSync!(d.file);
            const bytes = new TextEncoder().encode(text);
            const pos = position === null ? d.position : position;
            const count = Math.max(0, Math.min(length, bytes.length - pos));
            buffer.set(bytes.subarray(pos, pos + count), offset);
            if (position === null) d.position += count;
            return count;
        },
        closeSync: (fd: number): void => { descriptors.delete(fd); },
    };
    return { ...base, fs: fs as RuntimeDeps["fs"] };
}

const BASELINE_TOON = [
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

const ROLES_BASELINE_TOON = [
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
    "  coordinators:",
    "    claude:",
    "      roles:",
    "        implementation[2]: opencode,codex",
    "doctor:",
    "  modelRouting: project",
    "skills:",
    "  modes:",
    "    caveman: full",
    "integrations: {}",
].join("\n");

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

// mutant-7-parserPrototypePollution-nestedKey
describe("mutant-7-parserPrototypePollution-nestedKey", () => {
    // marker grouping the parserPrototypePollution mutant tests
});

test("mutant-7-parserPrototypePollution-nestedKey baseline", () => {
    const files = { "/project/ai-workflow.toon": BASELINE_TOON };
    const links = {};
    const deps = memoryDeps(memoryFs(files, links));
    const result = loadConfig("/project", deps);
    assert.ok(!("status" in result), "baseline should return a model");
    assert.equal(result.problems.length, 0, "baseline problems should be empty");
});

test("mutant-7-parserPrototypePollution-nestedKey mutation", () => {
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
        "  __proto__: x",
        "doctor:",
        "  modelRouting: project",
        "skills:",
        "  modes:",
        "    caveman: full",
        "integrations: {}",
    ].join("\n");
    const files = { "/project/ai-workflow.toon": toon };
    const links = {};
    const deps = memoryDeps(memoryFs(files, links));
    const result = loadConfig("/project", deps);
    assert.ok(!("status" in result), "mutation should return a model with problems");
    assertProblemCode(result.problems, errorCodes.parserPrototypePollution);
});

// mutant-7-parserWithinRoleDuplicate-duplicateImplementation
describe("mutant-7-parserWithinRoleDuplicate-duplicateImplementation", () => {
    // marker grouping the parserWithinRoleDuplicate mutant tests
});

test("mutant-7-parserWithinRoleDuplicate-duplicateImplementation baseline", () => {
    const files = { "/project/ai-workflow.toon": ROLES_BASELINE_TOON };
    const links = {};
    const deps = memoryDeps(memoryFs(files, links));
    const result = loadConfig("/project", deps);
    assert.ok(!("status" in result), "baseline should return a model");
    assert.equal(result.problems.length, 0, "baseline problems should be empty");
});

test("mutant-7-parserWithinRoleDuplicate-duplicateImplementation mutation", () => {
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
        "  coordinators:",
        "    claude:",
        "      roles:",
        "        implementation[2]: opencode,opencode",
        "doctor:",
        "  modelRouting: project",
        "skills:",
        "  modes:",
        "    caveman: full",
        "integrations: {}",
    ].join("\n");
    const files = { "/project/ai-workflow.toon": toon };
    const links = {};
    const deps = memoryDeps(memoryFs(files, links));
    const result = loadConfig("/project", deps);
    assert.ok(!("status" in result), "mutation should return a model with problems");
    assertProblemCode(result.problems, errorCodes.parserWithinRoleDuplicate);
});

// mutant-7-parserUnrecognized-weirdKey
describe("mutant-7-parserUnrecognized-weirdKey", () => {
    // marker grouping the parserUnrecognized mutant tests
});

test("mutant-7-parserUnrecognized-weirdKey baseline", () => {
    const files = { "/project/ai-workflow.toon": BASELINE_TOON };
    const links = {};
    const deps = memoryDeps(memoryFs(files, links));
    const result = loadConfig("/project", deps);
    assert.ok(!("status" in result), "baseline should return a model");
    assert.equal(result.problems.length, 0, "baseline problems should be empty");
});

test("mutant-7-parserUnrecognized-weirdKey mutation", () => {
    const toon = [
        "schemaVersion: 1",
        "@weird: foo",
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
    const files = { "/project/ai-workflow.toon": toon };
    const links = {};
    const deps = memoryDeps(memoryFs(files, links));
    const result = loadConfig("/project", deps);
    assert.ok(!("status" in result), "mutation should return a model with problems");
    assertProblemCode(result.problems, errorCodes.parserUnrecognized);
});

// mutant-7-lexerUnreadable-eacces
describe("mutant-7-lexerUnreadable-eacces", () => {
    // marker grouping the lexerUnreadable mutant tests
});

test("mutant-7-lexerUnreadable-eacces baseline", () => {
    const files = { "/project/ai-workflow.toon": BASELINE_TOON };
    const links = {};
    const deps = memoryDeps(memoryFs(files, links));
    const result = loadConfig("/project", deps);
    assert.ok(!("status" in result), "baseline should return a model");
    assert.equal(result.problems.length, 0, "baseline problems should be empty");
});

test("mutant-7-lexerUnreadable-eacces mutation", () => {
    const files = { "/project/ai-workflow.toon": BASELINE_TOON };
    const links = {};
    const deps = memoryDeps(memoryFs(files, links));
    deps.fs.openSync = () => { throw Object.assign(new Error("EACCES"), { code: "EACCES" }); };
    const result = loadConfig("/project", deps);
    assert.ok("status" in result, "mutation should be refused");
    assert.equal(result.code, errorCodes.lexerUnreadable, "expected LEXER-UNREADABLE, got " + result.code);
});

// mutant-7-lexerOversize-64kPlusOne
describe("mutant-7-lexerOversize-64kPlusOne", () => {
    // marker grouping the lexerOversize mutant tests
});

test("mutant-7-lexerOversize-64kPlusOne baseline", () => {
    const files = { "/project/ai-workflow.toon": BASELINE_TOON };
    const links = {};
    const deps = memoryDeps(memoryFs(files, links));
    const result = loadConfig("/project", deps);
    assert.ok(!("status" in result), "baseline should return a model");
    assert.equal(result.problems.length, 0, "baseline problems should be empty");
});

test("mutant-7-lexerOversize-64kPlusOne mutation", () => {
    const files = { "/project/ai-workflow.toon": "x".repeat(MAX_CONFIG_BYTES + 1) };
    const links = {};
    const deps = memoryDeps(memoryFs(files, links));
    const result = loadConfig("/project", deps);
    assert.ok("status" in result, "mutation should be refused");
    assert.equal(result.code, errorCodes.lexerOversize, "expected LEXER-OVERSIZE, got " + result.code);
});

// mutant-7-lexerSymlink-symlinkedLeaf
describe("mutant-7-lexerSymlink-symlinkedLeaf", () => {
    // marker grouping the lexerSymlink mutant tests
});

test("mutant-7-lexerSymlink-symlinkedLeaf baseline", () => {
    const files = { "/project/ai-workflow.toon": BASELINE_TOON };
    const links = {};
    const deps = memoryDeps(memoryFs(files, links));
    const result = loadConfig("/project", deps);
    assert.ok(!("status" in result), "baseline should return a model");
    assert.equal(result.problems.length, 0, "baseline problems should be empty");
});

test("mutant-7-lexerSymlink-symlinkedLeaf mutation", () => {
    const files = { "/project/real/ai-workflow.toon": BASELINE_TOON };
    const links = { "/project/ai-workflow.toon": "/project/real/ai-workflow.toon" };
    const deps = memoryDeps(memoryFs(files, links));
    const result = loadConfig("/project", deps);
    assert.ok("status" in result, "mutation should be refused");
    assert.equal(result.code, errorCodes.lexerSymlink, "expected LEXER-SYMLINK, got " + result.code);
});

// mutant-7-regexpBacktracking-quotedCommas
describe("mutant-7-regexpBacktracking-quotedCommas", () => {
    // marker grouping the regexpBacktracking mutant tests
});

test("mutant-7-regexpBacktracking-quotedCommas baseline", () => {
    const files = { "/project/ai-workflow.toon": BASELINE_TOON };
    const links = {};
    const deps = memoryDeps(memoryFs(files, links));
    const start = Date.now();
    const result = loadConfig("/project", deps);
    const elapsed = Date.now() - start;
    assert.ok(!("status" in result), "baseline should return a model");
    assert.ok(elapsed < 50, "baseline should parse in <50ms, took " + elapsed + "ms");
});

test("mutant-7-regexpBacktracking-quotedCommas mutation", () => {
    const payload = '"a",' + '"a",'.repeat(12000);
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
        "  modelRouting: " + payload,
        "skills:",
        "  modes:",
        "    caveman: full",
        "integrations: {}",
    ].join("\n");
    const files = { "/project/ai-workflow.toon": toon };
    const links = {};
    const deps = memoryDeps(memoryFs(files, links));
    const start = Date.now();
    const result = loadConfig("/project", deps);
    const elapsed = Date.now() - start;
    assert.ok(!("status" in result), "pathological content should parse to a model");
    assert.ok(elapsed < 50, "parser should finish in <50ms, took " + elapsed + "ms");
    assert.ok(!result.problems.some((p) => p.code === errorCodes.regexpBacktracking), "REGEXP-BACKTRACKING should be absent");
});
