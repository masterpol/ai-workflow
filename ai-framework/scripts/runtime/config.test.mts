import { describe, test } from "node:test";
import assert from "node:assert";
import { loadConfig, inspectConfig, errorCodes, MAX_CONFIG_BYTES, inspectPath, oexLock, wxRename, registerIntegrationValidator, registerEngineValidator, registerCoordinatorValidator } from "./config.mts";
import { createTestDeps, memoryFs, memoryToonFs, runScript, tempFixture, toonFixtureText } from "./test-helpers.mts";
import type { FsDeps, RuntimeDeps, StatLike } from "./types.mts";

/*
mutant-7-parserPrototypePollution-nestedKey
mutant-7-parserWithinRoleDuplicate-duplicateImplementation
mutant-7-parserUnrecognized-weirdKey
mutant-7-lexerUnreadable-eacces
mutant-7-lexerOversize-64kPlusOne
mutant-7-lexerSymlink-symlinkedLeaf
mutant-7-regexpBacktracking-quotedCommas
mutant-a3-wxRename-failureLeavesTargetIntact
mutant-a3-inspectPath-realpathEscape
mutant-a3-loadConfig-unknownSchemaVersion
mutant-a3-inspectPath-caseFoldedLeafIgnored
mutant-a3-readBoundedFile-identityPin
*/

const CONFIG_URL = new URL("./config.mts", import.meta.url).href;
const NODE_URL = new URL("./node.mts", import.meta.url).href;
const PROBE_SCRIPT = [
    `import { loadConfig, oexLock } from ${JSON.stringify(CONFIG_URL)};`,
    `import { createNodeDeps } from ${JSON.stringify(NODE_URL)};`,
    "const [mode, root] = process.argv.slice(2);",
    "const deps = createNodeDeps();",
    "if (mode === \"lock\") {",
    "  const held = oexLock(root + \"/ai-workflow.toon\", deps);",
    "  if (\"release\" in held) { held.release(); console.log(JSON.stringify({ acquired: true })); }",
    "  else console.log(JSON.stringify({ acquired: false, code: held.refused.code }));",
    "} else {",
    "  const result = loadConfig(root, deps);",
    "  if (\"model\" in result) console.log(JSON.stringify({ ok: true, problems: result.problems.length, runner: result.model.runtime.runner }));",
    "  else console.log(JSON.stringify({ ok: false, code: result.code }));",
    "}",
].join("\n");

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
    "schemaVersion: 2",
    "runtime:",
    "  runner: node",
    "integrations:",
    "  orca:",
    "    engine: \"1.4.224\"",
    "    multiAgent: false",
    "    enabled: false",
    "    maxConcurrentWorkers: 3",
    "    maxRetriesPerTask: 1",
    "doctor:",
    "  modelRouting: project",
    "skills:",
    "  modes:",
    "    caveman: full",
].join("\n");

const ROLES_BASELINE_TOON = [
    "schemaVersion: 2",
    "runtime:",
    "  runner: node",
    "integrations:",
    "  orca:",
    "    engine: \"1.4.224\"",
    "    multiAgent: false",
    "    enabled: false",
    "    maxConcurrentWorkers: 3",
    "    maxRetriesPerTask: 1",
    "    coordinators:",
    "      claude:",
    "        roles:",
    "          implementation[2]: opencode,codex",
    "doctor:",
    "  modelRouting: project",
    "skills:",
    "  modes:",
    "    caveman: full",
].join("\n");

test("loadConfig parses a minimal TOON file", () => {
    const deps = createTestDeps();
    const toon = [
        "schemaVersion: 2",
        "runtime:",
        "  runner: node",
        "integrations:",
        "  orca:",
        "    engine: \"1.4.224\"",
        "    multiAgent: false",
        "    enabled: false",
        "    maxConcurrentWorkers: 3",
        "    maxRetriesPerTask: 1",
        "doctor:",
        "  modelRouting: project",
        "skills:",
        "  modes:",
        "    caveman: full",
    ].join("\n");
    const root = tempFixture(deps, { "ai-workflow.toon": toon });
    try {
        const result = loadConfig(root, deps);
        assert.ok("model" in result, "loadConfig should return a model");
        const { model, problems } = result as { model: NonNullable<unknown>; problems: unknown[] };
        assert.equal((model as { schemaVersion: number }).schemaVersion, 2);
        assert.deepEqual((model as { runtime: { runner: string } }).runtime, { runner: "node" });
        assert.equal(problems.length, 0);
    } finally {
        deps.fs.rmSync(root, { recursive: true, force: true });
    }
});

test("loadConfig refuses schemaVersion 1 (legacy flat layout)", () => {
    const deps = createTestDeps();
    const toon = [
        "schemaVersion: 1",
        "runtime:",
        "  runner: node",
        "integrations:",
        "  orca:",
        "    engine: \"1.4.224\"",
        "    multiAgent: false",
        "    enabled: false",
        "    maxConcurrentWorkers: 3",
        "    maxRetriesPerTask: 1",
        "doctor:",
        "  modelRouting: project",
        "skills:",
        "  modes:",
        "    caveman: full",
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
        "schemaVersion: 2",
        "runtime:",
        "  runner: node",
        "integrations:",
        "  orca:",
        "    engine: \"1.4.224\"",
        "    multiAgent: false",
        "    enabled: false",
        "    maxConcurrentWorkers: 3",
        "    maxRetriesPerTask: 1",
        "    __proto__: x",
        "doctor:",
        "  modelRouting: project",
        "skills:",
        "  modes:",
        "    caveman: full",
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
        "schemaVersion: 2",
        "runtime:",
        "  runner: node",
        "integrations:",
        "  orca:",
        "    engine: \"1.4.224\"",
        "    multiAgent: false",
        "    enabled: false",
        "    maxConcurrentWorkers: 3",
        "    maxRetriesPerTask: 1",
        "    coordinators:",
        "      claude:",
        "        roles:",
        "          implementation[2]: opencode,opencode",
        "doctor:",
        "  modelRouting: project",
        "skills:",
        "  modes:",
        "    caveman: full",
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
        "schemaVersion: 2",
        "@weird: foo",
        "runtime:",
        "  runner: node",
        "integrations:",
        "  orca:",
        "    engine: \"1.4.224\"",
        "    multiAgent: false",
        "    enabled: false",
        "    maxConcurrentWorkers: 3",
        "    maxRetriesPerTask: 1",
        "doctor:",
        "  modelRouting: project",
        "skills:",
        "  modes:",
        "    caveman: full",
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
        "schemaVersion: 2",
        "runtime:",
        "  runner: node",
        "integrations:",
        "  orca:",
        "    engine: \"1.4.224\"",
        "    multiAgent: false",
        "    enabled: false",
        "    maxConcurrentWorkers: 3",
        "    maxRetriesPerTask: 1",
        "doctor:",
        "  modelRouting: " + payload,
        "skills:",
        "  modes:",
        "    caveman: full",
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

// ---------------------------------------------------------------------------
// a3 — writer/path mutants (5). Each: describe marker + passing baseline in the
// identical fixture layout + single flipped behaviour asserting the fixed-text
// errorCodes contract. dual-hash / `.rejected` are migrator guards (b1/b3).
// ---------------------------------------------------------------------------

function refusal(result: unknown): { status: string; code?: string; text?: string } {
    assert.ok(result !== null && typeof result === "object" && "status" in (result as object), "expected a refusal, got " + JSON.stringify(result));
    return result as { status: string; code?: string; text?: string };
}

// mutant-a3-wxRename-failureLeavesTargetIntact
describe("mutant-a3-wxRename-failureLeavesTargetIntact", () => {
    // marker grouping the wxRename write-then-rename mutant tests
});

test("mutant-a3-wxRename-failureLeavesTargetIntact baseline", () => {
    const files = { "/project/ai-workflow.toon": "old" };
    const deps = memoryDeps(memoryFs(files, {}));
    const result = wxRename("/project/ai-workflow.toon", (tmp) => deps.fs.writeFileSync(tmp, "new", { flag: "wx" }), deps);
    assert.deepEqual(result, { ok: true });
    assert.equal(deps.fs.readFileSync("/project/ai-workflow.toon"), "new");
    assert.deepEqual(deps.fs.readdirSync("/project"), ["ai-workflow.toon"], "no temp file may remain after success");
});

test("mutant-a3-wxRename-failureLeavesTargetIntact mutation", () => {
    // rename fails: target keeps old bytes, temp is cleaned, code is the io-error contract.
    const files = { "/project/ai-workflow.toon": "old" };
    const mem = memoryFs(files, {});
    const deps = memoryDeps({ ...mem, renameSync: () => { throw Object.assign(new Error("EXDEV"), { code: "EXDEV" }); } });
    const result = wxRename("/project/ai-workflow.toon", (tmp) => deps.fs.writeFileSync(tmp, "new", { flag: "wx" }), deps);
    assert.equal(refusal("refused" in result ? result.refused : result).code, errorCodes.wxRenameIoError);
    assert.equal(deps.fs.readFileSync("/project/ai-workflow.toon"), "old", "target must be untouched when rename fails");
    assert.deepEqual(deps.fs.readdirSync("/project"), ["ai-workflow.toon"], "temp must be cleaned when rename fails");
    // writer hits an existing temp (O_EXCL collision): distinct already-exists code, target still intact.
    const clash = wxRename("/project/ai-workflow.toon", () => { throw Object.assign(new Error("EEXIST"), { code: "EEXIST" }); }, deps);
    assert.equal(refusal("refused" in clash ? clash.refused : clash).code, errorCodes.wxRenameAlreadyExists);
    assert.equal(deps.fs.readFileSync("/project/ai-workflow.toon"), "old");
});

// mutant-a3-inspectPath-realpathEscape
describe("mutant-a3-inspectPath-realpathEscape", () => {
    // marker grouping the realpath-escape mutant tests
});

test("mutant-a3-inspectPath-realpathEscape baseline", () => {
    const deps = memoryDeps(memoryToonFs("/project", toonFixtureText()));
    const location = inspectPath("/project", deps);
    assert.ok(!("status" in location), "baseline stays inside the root");
    assert.equal(location.file, "/project/ai-workflow.toon");
});

test("mutant-a3-inspectPath-realpathEscape mutation", () => {
    const base = memoryDeps(memoryToonFs("/project", toonFixtureText()));
    const deps = { ...base, fs: { ...base.fs, realpathSync: (f: string) => (f.endsWith("ai-workflow.toon") ? "/outside/ai-workflow.toon" : f) } } as RuntimeDeps;
    assert.equal(refusal(inspectPath("/project", deps)).code, errorCodes.inspectPathEscape);
    const dotdot = { ...base, fs: { ...base.fs, realpathSync: (f: string) => (f.endsWith("ai-workflow.toon") ? "/project/../etc/ai-workflow.toon" : f) } } as RuntimeDeps;
    assert.equal(refusal(inspectPath("/project", dotdot)).code, errorCodes.inspectPathEscape);
});

// mutant-a3-loadConfig-unknownSchemaVersion
describe("mutant-a3-loadConfig-unknownSchemaVersion", () => {
    // marker grouping the unknown schemaVersion mutant tests
});

test("mutant-a3-loadConfig-unknownSchemaVersion baseline", () => {
    const deps = memoryDeps(memoryToonFs("/project", toonFixtureText({ schemaVersion: 2 })));
    const result = loadConfig("/project", deps);
    assert.ok(!("status" in result));
    assert.equal(result.problems.length, 0);
});

test("mutant-a3-loadConfig-unknownSchemaVersion mutation", () => {
    for (const version of [1, 0, 3, "two"]) {
        const deps = memoryDeps(memoryToonFs("/project", toonFixtureText({ schemaVersion: version })));
        const result = refusal(loadConfig("/project", deps));
        assert.equal(result.status, "refused");
        assert.equal(result.code, errorCodes.schemaVersionUnknown, "schemaVersion " + version);
    }
});

// mutant-a3-inspectPath-caseFoldedLeafIgnored
describe("mutant-a3-inspectPath-caseFoldedLeafIgnored", () => {
    // marker grouping the lowercase-allowlist mutant tests
});

test("mutant-a3-inspectPath-caseFoldedLeafIgnored baseline", () => {
    const deps = memoryDeps(memoryToonFs("/project", toonFixtureText()));
    assert.ok(!("status" in loadConfig("/project", deps)));
});

test("mutant-a3-inspectPath-caseFoldedLeafIgnored mutation", () => {
    // Only a case-variant leaf exists; the lowercase allowlist must not treat it as the config.
    for (const name of ["AI-Workflow.toon", "AI-WORKFLOW.TOON"]) {
        const deps = memoryDeps(memoryToonFs("/project", toonFixtureText(), { name }));
        const result = refusal(loadConfig("/project", deps));
        assert.equal(result.status, "missing", name);
        assert.equal(result.code, errorCodes.loadConfigRefused);
    }
});

// mutant-a3-readBoundedFile-identityPin
describe("mutant-a3-readBoundedFile-identityPin", () => {
    // marker grouping the dev/ino identity-pin mutant tests
});

test("mutant-a3-readBoundedFile-identityPin baseline", () => {
    const deps = memoryDeps(memoryToonFs("/project", toonFixtureText()));
    assert.ok(!("status" in loadConfig("/project", deps)));
});

test("mutant-a3-readBoundedFile-identityPin mutation", () => {
    // File swapped between inspect and open: fstat reports a different inode.
    const base = memoryDeps(memoryToonFs("/project", toonFixtureText()));
    const swapped = { ...base, fs: { ...base.fs, fstatSync: (fd: number) => ({ ...base.fs.fstatSync(fd), ino: 99 }) } } as RuntimeDeps;
    assert.equal(refusal(loadConfig("/project", swapped)).code, errorCodes.inspectPathSymlink);
    // Isolates the inspect-vs-open pin: the swap is stable after inspect (open and re-inspect agree on ino 5).
    let seen = 0;
    const swappedEarly = { ...base, fs: { ...base.fs,
        lstatSync: (f: string) => { const s = base.fs.lstatSync(f); seen++; return seen > 2 ? { ...s, ino: 5 } : s; },
        fstatSync: (fd: number) => ({ ...base.fs.fstatSync(fd), ino: 5 }),
    } } as RuntimeDeps;
    assert.equal(refusal(loadConfig("/project", swappedEarly)).code, errorCodes.inspectPathSymlink);
    // Swapped between open and read: the re-inspect sees a different inode than the open descriptor.
    let calls = 0;
    const racing = { ...base, fs: { ...base.fs, lstatSync: (f: string) => { const s = base.fs.lstatSync(f); calls++; return calls > 2 ? { ...s, ino: 77 } : s; } } } as RuntimeDeps;
    assert.equal(refusal(loadConfig("/project", racing)).code, errorCodes.inspectPathSymlink);
});

// ---------------------------------------------------------------------------
// a3 — alias-guard tests (K3-2 + K4-2 + K3-3): tempFixture({ resolve: false })
// and expected paths built from the same form the code returns.
// ---------------------------------------------------------------------------

test("alias: resolve:false root loads and the returned base is the realpath form", () => {
    const deps = createTestDeps();
    const aliasRoot = tempFixture(deps, { "ai-workflow.toon": toonFixtureText() }, { resolve: false });
    try {
        const realRoot = deps.fs.realpathSync(aliasRoot);
        const location = inspectPath(aliasRoot, deps);
        assert.ok(!("status" in location));
        assert.equal(location.base, realRoot, "expected path built from the form the code returns");
        assert.equal(location.file, deps.path.join(realRoot, "ai-workflow.toon"));
        if (aliasRoot !== realRoot) {
            assert.notEqual(location.base, aliasRoot, "an aliased root must come back realpathed, not echoed");
        }
        assert.ok(!("status" in loadConfig(aliasRoot, deps)));
    } finally {
        deps.fs.rmSync(aliasRoot, { recursive: true, force: true });
    }
});

test("alias: resolved fixture root is already in the code's form (both directions agree)", () => {
    const deps = createTestDeps();
    const root = tempFixture(deps, { "ai-workflow.toon": toonFixtureText() });
    const aliasRoot = root; // resolved default: raw tmpdir alias must not leak into expectations
    try {
        const location = inspectPath(aliasRoot, deps);
        assert.ok(!("status" in location));
        assert.equal(location.base, root);
        assert.equal(deps.fs.realpathSync(location.base), location.base);
    } finally {
        deps.fs.rmSync(root, { recursive: true, force: true });
    }
});

test("alias: a symlinked root directory resolves and loads", () => {
    const deps = createTestDeps();
    const real = tempFixture(deps, { "ai-workflow.toon": toonFixtureText() }, { resolve: false });
    const holder = tempFixture(deps, {}, { resolve: false });
    const link = deps.path.join(holder, "root-link");
    try {
        deps.fs.symlinkSync(real, link);
        const location = inspectPath(link, deps);
        assert.ok(!("status" in location));
        assert.equal(location.base, deps.fs.realpathSync(real));
        assert.ok(!("status" in loadConfig(link, deps)));
    } finally {
        deps.fs.rmSync(real, { recursive: true, force: true });
        deps.fs.rmSync(holder, { recursive: true, force: true });
    }
});

test("alias: a symlinked leaf under a resolve:false root is refused as lexerSymlink", () => {
    const deps = createTestDeps();
    const aliasRoot = tempFixture(deps, { "elsewhere.toon": toonFixtureText() }, { resolve: false });
    try {
        deps.fs.symlinkSync(deps.path.join(aliasRoot, "elsewhere.toon"), deps.path.join(aliasRoot, "ai-workflow.toon"));
        assert.equal(refusal(loadConfig(aliasRoot, deps)).code, errorCodes.lexerSymlink);
    } finally {
        deps.fs.rmSync(aliasRoot, { recursive: true, force: true });
    }
});

// ---------------------------------------------------------------------------
// a3 — lock contention + stale recovery (real fs, O_EXCL; no flock).
// ---------------------------------------------------------------------------

test("lock contention: second acquirer is refused busy until the holder releases", () => {
    const deps = createTestDeps();
    const root = tempFixture(deps, { "ai-workflow.toon": toonFixtureText() });
    const target = deps.path.join(root, "ai-workflow.toon");
    try {
        const first = oexLock(target, deps);
        assert.ok("release" in first, "first acquire succeeds");
        const second = oexLock(target, deps);
        assert.ok("refused" in second);
        assert.equal(second.refused.code, errorCodes.oexLockBusy);
        assert.ok(deps.fs.existsSync(`${target}.lock`));
        first.release();
        assert.ok(!deps.fs.existsSync(`${target}.lock`), "release removes the lock file");
        const third = oexLock(target, deps);
        assert.ok("release" in third, "acquire after release succeeds");
        third.release();
    } finally {
        deps.fs.rmSync(root, { recursive: true, force: true });
    }
});

test("lock contention: a separate process sees the held lock as busy", () => {
    const deps = createTestDeps();
    const root = tempFixture(deps, { "ai-workflow.toon": toonFixtureText(), "probe.mts": PROBE_SCRIPT });
    const target = deps.path.join(root, "ai-workflow.toon");
    try {
        const held = oexLock(target, deps);
        assert.ok("release" in held);
        const busy = runScript(deps, deps.path.join(root, "probe.mts"), ["lock", root]);
        assert.equal(busy.status, 0, busy.stderr);
        assert.equal(JSON.parse(busy.stdout).code, errorCodes.oexLockBusy);
        held.release();
        const free = runScript(deps, deps.path.join(root, "probe.mts"), ["lock", root]);
        assert.equal(JSON.parse(free.stdout).acquired, true);
        assert.ok(!deps.fs.existsSync(`${target}.lock`), "the subprocess released its lock");
    } finally {
        deps.fs.rmSync(root, { recursive: true, force: true });
    }
});

test("stale recovery: a crashed holder's leftover lock fails closed, explicit removal recovers", () => {
    const deps = createTestDeps();
    const root = tempFixture(deps, { "ai-workflow.toon": toonFixtureText(), "ai-workflow.toon.lock": "" });
    const target = deps.path.join(root, "ai-workflow.toon");
    try {
        const stale = oexLock(target, deps);
        assert.ok("refused" in stale);
        assert.equal(stale.refused.code, errorCodes.oexLockBusy, "no silent lock stealing");
        assert.ok(deps.fs.existsSync(`${target}.lock`), "the stale lock must not be removed by a refused acquire");
        deps.fs.unlinkSync(`${target}.lock`);
        const recovered = oexLock(target, deps);
        assert.ok("release" in recovered);
        recovered.release();
        recovered.release(); // idempotent: a second release of an already-removed lock must not throw
    } finally {
        deps.fs.rmSync(root, { recursive: true, force: true });
    }
});

test("lock io error: an unwritable lock location reports oexLockIoError, not busy", () => {
    const deps = createTestDeps();
    const root = tempFixture(deps, {});
    try {
        const refusedLock = oexLock(deps.path.join(root, "missing-dir", "ai-workflow.toon"), deps);
        assert.ok("refused" in refusedLock);
        assert.equal(refusedLock.refused.code, errorCodes.oexLockIoError);
    } finally {
        deps.fs.rmSync(root, { recursive: true, force: true });
    }
});

// ---------------------------------------------------------------------------
// a3 — K2-3 subprocess revalidation: a fresh process re-reads the on-disk TOON,
// so a stale in-process (cached) validation cannot vouch for rewritten bytes.
// ---------------------------------------------------------------------------

test("K2-3 subprocess: a fresh process re-reads on-disk TOON and sees the rewrite", () => {
    const deps = createTestDeps();
    const root = tempFixture(deps, { "ai-workflow.toon": toonFixtureText(), "probe.mts": PROBE_SCRIPT });
    const probe = deps.path.join(root, "probe.mts");
    const target = deps.path.join(root, "ai-workflow.toon");
    try {
        // Valid on disk: in-process and subprocess agree.
        assert.ok(!("status" in loadConfig(root, deps)));
        const before = runScript(deps, probe, ["load", root]);
        assert.equal(before.status, 0, before.stderr);
        assert.deepEqual(JSON.parse(before.stdout), { ok: true, problems: 0, runner: "node" });

        // Rewrite on disk (same path, new bytes). The already-loaded module must not vouch for it.
        deps.fs.writeFileSync(target, toonFixtureText({ schemaVersion: 1 }));
        const after = runScript(deps, probe, ["load", root]);
        assert.equal(after.status, 0, after.stderr);
        assert.equal(JSON.parse(after.stdout).code, errorCodes.schemaVersionUnknown);
        assert.equal((loadConfig(root, deps) as { code?: string }).code, errorCodes.schemaVersionUnknown, "in-process re-read agrees with the subprocess");

        // Rewrite back to valid with a changed value: the subprocess reports the new bytes, not the earlier ones.
        deps.fs.writeFileSync(target, toonFixtureText().replace("runner: node", "runner: bun"));
        const healed = runScript(deps, probe, ["load", root]);
        assert.deepEqual(JSON.parse(healed.stdout), { ok: true, problems: 0, runner: "bun" });
    } finally {
        deps.fs.rmSync(root, { recursive: true, force: true });
    }
});

// ---------------------------------------------------------------------------
// integrations.orca schema (engines/orchestration removed outright, no alias)
// ---------------------------------------------------------------------------

function loadText(text: string) {
    const result = loadConfig("/project", memoryDeps(memoryFs({ "/project/ai-workflow.toon": text }, {})));
    assert.ok(!("status" in result), "should return a model with problems");
    return result;
}

test("integrations.orca: per-coordinator workers and roles load into the model", () => {
    const result = loadText(ROLES_BASELINE_TOON.replace("        roles:", "        workers[2]: opencode,codex\n        roles:"));
    assert.equal(result.problems.length, 0);
    assert.deepEqual(result.model.integrations.orca.coordinators?.claude, { workers: ["opencode", "codex"], roles: { implementation: ["opencode", "codex"] } });
    assert.equal(result.model.integrations.orca.engine, "1.4.224");
});

test("integrations.orca: legacy top-level engines/orchestration keys are rejected, not aliased", () => {
    const result = loadText(`${BASELINE_TOON}\nengines:\n  orca: "1.4.224"\norchestration:\n  enabled: true`);
    assert.equal(result.problems.filter((p) => p.code === errorCodes.parserUnrecognized && /unknown root key/.test(p.text)).length, 2);
});

test("integrations.orca: missing block, missing engine, bad bounds and unknown keys are reported", () => {
    const noOrca = loadConfig("/project", memoryDeps(memoryFs({ "/project/ai-workflow.toon": BASELINE_TOON.replace(/integrations:[\s\S]*?doctor:/, "integrations: {}\ndoctor:") }, {})));
    assert.ok("status" in noOrca && noOrca.code === errorCodes.loadConfigRefused, "missing orca block refuses the load");
    const bad = loadText(BASELINE_TOON.replace('    engine: "1.4.224"\n', "").replace("maxConcurrentWorkers: 3", "maxConcurrentWorkers: 17").replace("maxRetriesPerTask: 1", "maxRetriesPerTask: -1\n    bogus: 1"));
    const texts = bad.problems.map((p) => p.text).join("|");
    assert.match(texts, /integrations\.orca\.engine is required/);
    assert.match(texts, /maxConcurrentWorkers must be between 1 and 16/);
    assert.equal(loadText(BASELINE_TOON.replace("maxConcurrentWorkers: 3", "maxConcurrentWorkers: 16")).problems.length, 0, "16 is accepted");
    assert.match(texts, /maxRetriesPerTask must be >= 0/);
    assert.match(texts, /unknown key "bogus" in integrations\.orca/);
});

test("integrations.orca: a role worker missing from that coordinator's workers is incomplete", () => {
    const text = ROLES_BASELINE_TOON.replace("        roles:", "        workers[1]: opencode\n        roles:");
    assertProblemCode(loadText(text).problems, errorCodes.orchestrationWorkersIncomplete);
});

// ---------------------------------------------------------------------------
// Audit cycle 1 (F1): parser linearity, validator isolation, array typing, seams.
// ---------------------------------------------------------------------------

function loadAny(text: string) {
    return loadConfig("/project", memoryDeps(memoryFs({ "/project/ai-workflow.toon": text }, {})));
}

test("parser: pathological `key:` + spaces + lone line terminator stays linear at the 64 KiB cap", () => {
    const cases: Record<string, string> = {
        CR: "\r",
        LS: "\u2028",
        PS: "\u2029",
        spaces: " ",
    };
    for (const [name, terminator] of Object.entries(cases)) {
        const head = "a:";
        const tail = terminator + "x\n";
        const filler = " ".repeat(MAX_CONFIG_BYTES - 5 - (name === "spaces" ? 0 : terminator.length === 1 && terminator.charCodeAt(0) > 0x7f ? 2 : 0));
        const text = head + filler + tail;
        assert.ok(Buffer.byteLength(text) <= MAX_CONFIG_BYTES, name + " fixture within cap");
        const start = Date.now();
        const result = loadAny(text);
        const elapsed = Date.now() - start;
        assert.ok(elapsed < 500, name + " took " + elapsed + "ms");
        assert.ok("status" in result || result.problems.length > 0, name + " must not be accepted silently");
    }
});

test("parser: a lone CR/LS/PS inside a line is unrecognized, trailing CRLF still works", () => {
    for (const bad of ["a: b\rc", "a: b\u2028c", "a: b\u2029c", "a\rb: 1"]) {
        const result = loadAny(BASELINE_TOON + "\n" + bad);
        assert.ok("model" in result, "should parse to a model with problems");
        assert.ok(result.problems.some((p) => p.code === errorCodes.parserUnrecognized && p.text === "unrecognized TOON line"), JSON.stringify(bad));
    }
    const crlf = loadAny(BASELINE_TOON.split("\n").join("\r\n"));
    assert.ok("model" in crlf);
    assert.equal(crlf.problems.length, 0);
});

test("parser: line grammar equivalence for normal and malformed lines", () => {
    const ok = loadAny(ROLES_BASELINE_TOON.replace("          implementation[2]: opencode,codex", "          implementation[2]  :   opencode,codex   \n          solo   : opencode"));
    assert.ok("model" in ok);
    assert.equal(ok.problems.length, 0);
    assert.deepEqual(ok.model.integrations.orca.coordinators?.claude.roles, { implementation: ["opencode", "codex"], solo: "opencode" });
    for (const bad of ["  : x", "has space: 1", "a[x]: 1", "a[1: 1", "a b", "\tkey: 1", "a[1][2]: 1", "ke.y: 1"]) {
        const result = loadAny(BASELINE_TOON + "\n" + bad);
        assert.ok("model" in result, JSON.stringify(bad));
        assertProblemCode(result.problems, errorCodes.parserUnrecognized);
        assert.ok(result.problems.some((p) => p.text === "unrecognized TOON line"), "line rejected: " + JSON.stringify(bad));
    }
});

test("parser: duplicate-key check ignores inherited Object.prototype names", () => {
    const text = ROLES_BASELINE_TOON.replace("          implementation[2]: opencode,codex", "          toString: opencode");
    const result = loadAny(text);
    assert.ok("model" in result);
    assert.equal(result.problems.length, 0, JSON.stringify(result.problems));
    assert.equal(result.model.integrations.orca.coordinators?.claude.roles?.toString, "opencode");
    const dup = loadAny(ROLES_BASELINE_TOON.replace("          implementation[2]: opencode,codex", "          toString: a\n          toString: b"));
    assert.ok("model" in dup && dup.problems.some((p) => /duplicate key "toString"/.test(p.text)));
});

test("loadConfig never throws when a registered validator throws", () => {
    const boom = (): never => { throw new Error("boom"); };
    registerEngineValidator("orca", boom);
    try {
        const result = loadAny(BASELINE_TOON);
        assert.ok("model" in result);
        assert.ok(result.problems.some((p) => p.code === errorCodes.validationType && /engine validator/.test(p.text) && /boom/.test(p.text)), JSON.stringify(result.problems));
    } finally { registerEngineValidator("orca", () => null); }
    registerIntegrationValidator("orca", boom);
    try {
        const result = loadAny(BASELINE_TOON);
        assert.ok("model" in result);
        assert.ok(result.problems.some((p) => p.code === errorCodes.validationType && /integration validator/.test(p.text)), JSON.stringify(result.problems));
    } finally { registerIntegrationValidator("orca", () => null); }
    registerCoordinatorValidator("claude", boom);
    try {
        const result = loadAny(ROLES_BASELINE_TOON);
        assert.ok("model" in result);
        assert.ok(result.problems.some((p) => p.code === errorCodes.validationType && /coordinator validator/.test(p.text)), JSON.stringify(result.problems));
    } finally { registerCoordinatorValidator("claude", () => null); }
});

test("registered validators are invoked with the right value and their problems surface", () => {
    const calls: Array<[string, string, unknown]> = [];
    const finding = (code: string, text: string) => ({ code, text });
    registerEngineValidator("orca", (k, v) => { calls.push(["engine", k, v]); return finding("ENGINE-X", "engine bad"); });
    registerIntegrationValidator("orca", (k, v) => { calls.push(["integration", k, v]); return finding("INTEG-X", "integration bad"); });
    registerCoordinatorValidator("claude", (k, v) => { calls.push(["coordinator", k, v]); return finding("COORD-X", "coordinator bad"); });
    try {
        const result = loadAny(ROLES_BASELINE_TOON);
        assert.ok("model" in result);
        const codes = result.problems.map((p) => p.code);
        assert.ok(codes.includes("ENGINE-X") && codes.includes("INTEG-X") && codes.includes("COORD-X"), codes.join(","));
        assert.deepEqual(calls.find((c) => c[0] === "engine"), ["engine", "orca", "1.4.224"]);
        const integ = calls.find((c) => c[0] === "integration");
        assert.equal(integ?.[1], "orca");
        assert.equal((integ?.[2] as { engine: string }).engine, "1.4.224");
        const coord = calls.find((c) => c[0] === "coordinator");
        assert.equal(coord?.[1], "claude");
        assert.deepEqual((coord?.[2] as { roles: unknown }).roles, { implementation: ["opencode", "codex"] });
    } finally {
        registerEngineValidator("orca", () => null);
        registerIntegrationValidator("orca", () => null);
        registerCoordinatorValidator("claude", () => null);
    }
});

test("unknown integration slot is reported until a validator is registered for it", () => {
    const text = BASELINE_TOON.replace("doctor:", "  extra:\n    k: v\ndoctor:");
    const before = loadAny(text);
    assert.ok("model" in before && before.problems.some((p) => /unknown integration "extra"/.test(p.text)));
    let seen: unknown;
    registerIntegrationValidator("extra", (_k, v) => { seen = v; return null; });
    try {
        const after = loadAny(text);
        assert.ok("model" in after);
        assert.equal(after.problems.length, 0);
        assert.deepEqual(seen, { k: "v" });
        assert.deepEqual(after.model.integrations.extra, { k: "v" });
    } finally { registerIntegrationValidator("extra", () => null); }
});

test("coordinator role arrays reject non-string items", () => {
    const result = loadAny(ROLES_BASELINE_TOON.replace("implementation[2]: opencode,codex", "implementation[2]: 7,null"));
    assert.ok("model" in result);
    assert.ok(result.problems.some((p) => p.code === errorCodes.validationType && /roles\.implementation/.test(p.text)), JSON.stringify(result.problems));
});

test("maxConcurrentWorkers: 0 is rejected, 1 is accepted", () => {
    const zero = loadAny(BASELINE_TOON.replace("maxConcurrentWorkers: 3", "maxConcurrentWorkers: 0"));
    assert.ok("model" in zero);
    assert.ok(zero.problems.some((p) => /maxConcurrentWorkers must be between 1 and 16/.test(p.text)));
    const one = loadAny(BASELINE_TOON.replace("maxConcurrentWorkers: 3", "maxConcurrentWorkers: 1"));
    assert.ok("model" in one);
    assert.equal(one.problems.length, 0);
});

test("inspectConfig returns the model when clean and a refusal when the load has problems", () => {
    const clean = inspectConfig("/project", memoryDeps(memoryFs({ "/project/ai-workflow.toon": BASELINE_TOON }, {})));
    assert.ok(!("status" in clean));
    assert.equal(clean.schemaVersion, 2);
    const proto = inspectConfig("/project", memoryDeps(memoryFs({ "/project/ai-workflow.toon": BASELINE_TOON + "\n__proto__: x" }, {})));
    assert.equal(refusal(proto).status, "refused");
    const unknown = inspectConfig("/project", memoryDeps(memoryFs({ "/project/ai-workflow.toon": BASELINE_TOON + "\nbogus: 1" }, {})));
    assert.equal(refusal(unknown).status, "refused");
    const absent = inspectConfig("/project", memoryDeps(memoryFs({}, {})));
    assert.equal(refusal(absent).status, "missing");
});

test("schemaVersion refusal wording matches migrator behavior; a BOM has its own message", () => {
    const v1 = refusal(loadAny(BASELINE_TOON.replace("schemaVersion: 2", "schemaVersion: 1")));
    assert.equal(v1.code, errorCodes.schemaVersionUnknown);
    assert.doesNotMatch(v1.text ?? "", /upgrade a v1 file/);
    assert.match(v1.text ?? "", /replace|backup/i);
    const bom = refusal(loadAny("\uFEFF" + BASELINE_TOON));
    assert.equal(bom.code, errorCodes.schemaVersionUnknown);
    assert.match(bom.text ?? "", /byte order mark|BOM/i);
    assert.doesNotMatch(bom.text ?? "", /undefined/);
});
