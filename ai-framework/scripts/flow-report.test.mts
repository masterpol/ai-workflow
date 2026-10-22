import assert from "node:assert/strict";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { collectSources, main, parseArgs } from "./flow-report.mts";
import type { FlowReport } from "./flow-join.mts";
import { blankState } from "./workflow-metrics-state.mts";
import { captureIo, createTestDeps, fileUrl, listTree, runScript, tempFixture, urlPath } from "./runtime/test-helpers.mts";
import type { CapturedDeps } from "./runtime/test-helpers.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

const AT = "2026-10-21T12:00:00.000Z";
const SCRIPT = urlPath(new URL("./flow-report.mts", import.meta.url));
const leaf = { completions: 2, reportedUsageCount: 1, unavailableCount: 1, tokens: 9, costUsd: 0, pricedCount: 0 };
const tokenText = (vendor = "claude"): string => JSON.stringify({ schemaVersion: 3, updatedAt: AT, flows: { since: AT, pitches: { alpha: { phases: { build: { scopes: { S1: { [vendor]: leaf } } } } } } } });
function usageText(deps: RuntimeDeps, since: string | null = AT): string {
  const state = blankState(deps, "example"), row = { activeMs: 40, waitMs: 5, turnsStarted: 1, turnsFinished: 1, gapsMeasured: 0, gapsUnmeasured: 0, gapsOverCap: 0 };
  state.usage.since = since;
  state.usage.pitches.alpha = { lastAt: AT, row, phases: { build: { row, scopes: { S1: row } } }, transitions: { repeat: 0, forward: 0, back: 0, other: 0 }, trace: [], lastPhase: "build" };
  state.pending["b".repeat(64)] = { startedAt: AT, lastAt: AT, status: "running" };
  state.usage.sessions["c".repeat(64)] = { lastAt: AT, lastStopAt: null, clock: "event", open: false, pitch: "alpha", phase: "build", scope: "S1" };
  return `${JSON.stringify(state)}\n`;
}
const historyText = JSON.stringify({ schemaVersion: 1, generatedAt: "2026-10-20T12:00:00.000Z", history: { items: [{ value: { slug: "alpha", phase: "shipped", shipped: "2026-10-01", audit: { value: { cycles: 1, mustFix: 0 }, availability: "observed" } }, status: "observed", evidence: [] }], limits: { value: { truncatedItems: 0, maxItems: 100 }, status: "observed", evidence: [] } } });

interface Harness { deps: RuntimeDeps; root: string; metrics: string; leases: { acquired: number; released: number }; io: () => CapturedDeps }
function harness(t: TestContext, files: Record<string, string> | null, onAcquire: () => void = () => {}): Harness {
  const base = createTestDeps(), leases = { acquired: 0, released: 0 };
  const deps: RuntimeDeps = { ...base, clock: { ...base.clock, now: () => Date.parse(AT) },
    net: { ...base.net, tryListen: async () => { leases.acquired++; onAcquire(); return { server: { close: async () => { leases.released++; } } }; } } };
  const root = tempFixture(deps, files ?? { ".project/.gitkeep": "" });
  t.after(() => deps.fs.rmSync(root, { recursive: true, force: true }));
  return { deps, root, metrics: deps.path.join(root, ".project/metrics"), leases, io: () => captureIo(deps) };
}
const full = (deps: RuntimeDeps): Record<string, string> => ({ ".project/metrics/token-consumption.json": tokenText(), ".project/metrics/workflow-usage.json": usageText(deps), ".project/reports/state.json": historyText });
async function preview(h: Harness, args: string[] = []): Promise<{ code: number; out: string; err: string }> {
  const io = h.io(), code = await main(["--root", h.root, ...args], io);
  return { code, out: io.out.join(""), err: io.err.join("") };
}
const parse = (text: string): FlowReport => JSON.parse(text) as FlowReport;
function bytes(deps: RuntimeDeps, dir: string): string {
  return listTree(deps, dir).map(rel => { const full = deps.path.join(dir, rel), stat = deps.fs.lstatSync(full); return `${rel}:${stat.isFile() ? deps.fs.readFileSync(full) : "dir"}`; }).join("\n");
}

test("arguments: unknown flags and unsupported formats exit 2 before any read", async t => {
  const h = harness(t, null);
  for (const args of [["--bogus"], ["--apply", "--format", "json"], ["--format", "xml"], ["--format"], ["--root", "--format", "json"], ["stray"]]) {
    const io = h.io();
    assert.equal(await main(args, io), 2, args.join(" "));
    assert.match(io.err.join(""), /^flow-report: .*\nUsage:/s);
    assert.equal(io.out.length, 0);
  }
  assert.equal(h.leases.acquired, 0);
  assert.deepEqual(parseArgs(["--root", "p", "--format", "html"]), { root: "p", format: "html", apply: false });
  assert.deepEqual(parseArgs(["--apply"]), { root: null, format: "json", apply: true });
});

test("importing the CLI has no side effect and direct execution reports usage errors", t => {
  const h = harness(t, { "probe.mts": `await import(${JSON.stringify(fileUrl(SCRIPT))});\n` });
  const imported = runScript(h.deps, h.deps.path.join(h.root, "probe.mts"));
  assert.deepEqual([imported.status, imported.stdout, imported.stderr], [0, "", ""]);
  const direct = runScript(h.deps, SCRIPT, ["--format", "xml"]);
  assert.equal(direct.status, 2);
});

test("preview joins both stores and history under one lease, changes nothing and emits sanitized JSON", async t => {
  const h = harness(t, null);
  for (const [rel, text] of Object.entries(full(h.deps))) { h.deps.fs.mkdirSync(h.deps.path.dirname(h.deps.path.join(h.root, rel)), { recursive: true }); h.deps.fs.writeFileSync(h.deps.path.join(h.root, rel), text); }
  const before = bytes(h.deps, h.root);
  const { code, out, err } = await preview(h);
  assert.deepEqual([code, err, h.leases], [0, "", { acquired: 1, released: 1 }]);
  const report = parse(out), scope = report.pitches[0].children[0].children[0];
  assert.deepEqual([report.pitches[0].label, scope.label, scope.sources, scope.tokens?.[0].status, scope.time?.activeMs], ["alpha", "S1", ["tokens", "usage"], "partial", 40]);
  assert.deepEqual([report.sources.tokens.status, report.sources.usage.status, report.sources.history.status, report.pitches[0].history?.shipped], ["observed", "observed", "observed", "2026-10-01"]);
  assert.equal(report.timing.provisional, true); assert.equal(report.timing.pendingActivities, 1);
  for (const hidden of ["b".repeat(64), "c".repeat(64), "example", "sessions", h.root]) assert.equal(out.includes(hidden), false, hidden);
  assert.equal(bytes(h.deps, h.root), before);
});

test("preview without a metrics directory reports missing sources and creates nothing", async t => {
  const h = harness(t, null), before = listTree(h.deps, h.root);
  const { code, out } = await preview(h);
  const report = parse(out);
  assert.deepEqual([code, report.sources.tokens.status, report.sources.usage.status, report.sources.history.status, h.leases.acquired], [0, "missing", "missing", "missing", 0]);
  assert.deepEqual(listTree(h.deps, h.root), before);
  const uninitialized = harness(t, { "readme.txt": "x" }), io = uninitialized.io();
  assert.equal(await main(["--root", uninitialized.root], io), 1);
  assert.equal(io.err.join(""), "flow-report: project is not initialized\n");
});

test("missing, symlinked, oversized and FIFO sources are refused distinctly and never followed", async t => {
  const h = harness(t, { ".project/metrics/workflow-usage.json": "x", "outside/secret.json": "OUTSIDE-DO-NOT-READ" });
  const token = h.deps.path.join(h.metrics, "token-consumption.json");
  const status = async (): Promise<FlowReport> => parse((await preview(h)).out);
  h.deps.fs.rmSync(h.deps.path.join(h.metrics, "workflow-usage.json"));
  assert.deepEqual([(await status()).sources.tokens.status, (await status()).sources.usage.status], ["missing", "missing"]);
  h.deps.fs.symlinkSync(h.deps.path.join(h.root, "outside/secret.json"), token);
  const linked = await status();
  assert.deepEqual([linked.sources.tokens.status, linked.sources.tokens.reason], ["refused", "source is unsafe, oversized or changed"]);
  h.deps.fs.rmSync(token);
  h.deps.fs.writeFileSync(token, "x".repeat(4 * 1024 * 1024 + 1));
  assert.equal((await status()).sources.tokens.reason, "source is unsafe, oversized or changed");
  h.deps.fs.rmSync(token);
  const made = h.deps.child.runSync("mkfifo", [token]);
  if (made.status === 0) assert.equal((await status()).sources.tokens.status, "refused");
  h.deps.fs.rmSync(token, { force: true });
  h.deps.fs.writeFileSync(token, "{not json");
  assert.equal((await status()).sources.tokens.reason, "source has an unexpected shape");
  assert.equal(h.deps.fs.readFileSync(h.deps.path.join(h.root, "outside/secret.json")), "OUTSIDE-DO-NOT-READ");
  assert.equal(h.leases.acquired, h.leases.released);
});

test("lease failures exit 1 with fixed reasons and release what they acquired", async t => {
  const busy = harness(t, full(createTestDeps()));
  const base = busy.deps, blocked: RuntimeDeps = { ...base, clock: { ...base.clock, monotonicMs: (() => { let n = 0; return () => (n += 1000); })(), sleep: async () => {} }, net: { ...base.net, tryListen: async () => ({ busy: true as const }) } };
  const io = captureIo(blocked);
  assert.equal(await main(["--root", busy.root], io), 1);
  assert.deepEqual([io.out.length, io.err.join("")], [0, "flow-report: metrics lease unavailable; event not recorded\n"]);
  const legacy = harness(t, { ...full(createTestDeps()), ".project/metrics/.token-consumption.lock": "" });
  const result = await preview(legacy);
  assert.deepEqual([result.code, result.out, result.err, legacy.leases], [1, "", "flow-report: legacy metrics lock is present\n", { acquired: 1, released: 1 }]);
  const refusing = harness(t, { ...full(createTestDeps()), ".project/metrics/token-consumption.json": "[]" });
  assert.equal((await preview(refusing)).code, 0);
  assert.deepEqual(refusing.leases, { acquired: 1, released: 1 });
});

test("a metrics directory swapped during acquisition fails closed and leaves outside files untouched", async t => {
  const outside = tempFixture(createTestDeps(), { "token-consumption.json": tokenText(), "workflow-usage.json": "OUTSIDE" });
  t.after(() => createTestDeps().fs.rmSync(outside, { recursive: true, force: true }));
  let swap = (): void => {};
  const h = harness(t, full(createTestDeps()), () => swap());
  swap = () => { h.deps.fs.renameSync(h.metrics, `${h.metrics}.moved`); h.deps.fs.symlinkSync(outside, h.metrics); };
  const before = bytes(h.deps, outside), { code, out, err } = await preview(h);
  assert.deepEqual([code, out, err, h.leases], [1, "", "flow-report: unsafe metrics directory\n", { acquired: 1, released: 1 }]);
  assert.equal(bytes(h.deps, outside), before);
});

test("history is read outside the lease through pinned ancestry and a swapped reports directory is refused", async t => {
  const outside = tempFixture(createTestDeps(), { "state.json": historyText });
  t.after(() => createTestDeps().fs.rmSync(outside, { recursive: true, force: true }));
  const h = harness(t, full(createTestDeps()));
  const reports = h.deps.path.join(h.root, ".project/reports");
  h.deps.fs.rmSync(reports, { recursive: true });
  h.deps.fs.symlinkSync(outside, reports);
  const linked = parse((await preview(h)).out);
  assert.deepEqual([linked.sources.history.status, linked.sources.history.reason, linked.pitches[0].history?.availability], ["refused", "source is unsafe, oversized or changed", "unavailable"]);
  assert.equal(linked.sources.tokens.status, "observed");
  const plain = harness(t, full(createTestDeps()));
  const io = plain.io(), collected = await collectSources(plain.root, io);
  assert.equal(collected.ok, true);
  assert.equal(plain.leases.acquired, 1); // the history read adds no lease
});

test("a reports directory replaced by a same-named directory between pin and read is refused", async t => {
  const h = harness(t, full(createTestDeps())), reports = h.deps.path.join(h.root, ".project/reports");
  // The swap lands after readText's own file checks, so only the pinned directory identity can notice it.
  let swapped = false;
  const swapping: RuntimeDeps = { ...h.deps, fs: { ...h.deps.fs, readSync: (fd, buffer, offset, length, position) => {
    const read = h.deps.fs.readSync(fd, buffer, offset, length, position);
    if (!swapped && read === historyText.length) {
      swapped = true;
      h.deps.fs.renameSync(reports, `${reports}.old`);
      h.deps.fs.mkdirSync(reports);
      h.deps.fs.writeFileSync(h.deps.path.join(reports, "state.json"), historyText);
    }
    return read;
  } } };
  const collected = await collectSources(h.root, swapping);
  assert.ok(collected.ok);
  assert.deepEqual([collected.inputs.history.status, collected.inputs.tokens.status, collected.inputs.usage.status], ["refused", "valid", "valid"]);
  assert.equal(h.deps.fs.existsSync(`${reports}.old`), true);
});

test("a v1 usage state is unsupported and its file stays byte-identical", async t => {
  const h = harness(t, null), file = h.deps.path.join(h.metrics, "workflow-usage.json");
  h.deps.fs.mkdirSync(h.metrics, { recursive: true });
  const { usage: _usage, ...legacy } = JSON.parse(usageText(h.deps)) as Record<string, unknown>;
  const text = `${JSON.stringify({ ...legacy, schemaVersion: 1 })}\n`;
  h.deps.fs.writeFileSync(file, text);
  const report = parse((await preview(h)).out);
  assert.deepEqual([report.sources.usage.status, report.sources.usage.reason], ["unsupported", "usage state predates schema 2 and is not joinable"]);
  assert.equal(h.deps.fs.readFileSync(file), text);
  assert.equal(listTree(h.deps, h.metrics).join(), "workflow-usage.json");
});

test("hostile labels are refused or redacted across the whole output", async t => {
  const h = harness(t, { ...full(createTestDeps()), ".project/metrics/token-consumption.json": tokenText("token:abcdef0123") });
  const { code, out } = await preview(h);
  assert.equal(code, 0);
  assert.equal(out.includes("abcdef0123"), false);
  assert.ok(out.includes('"vendor": "(redacted)"'));
  const proto = harness(t, { ...full(createTestDeps()), ".project/metrics/token-consumption.json": '{"schemaVersion":3,"updatedAt":null,"flows":{"since":null,"pitches":{"__proto__":{"phases":{}}}}}' });
  const refused = parse((await preview(proto)).out);
  assert.deepEqual([refused.sources.tokens.status, refused.sources.tokens.reason], ["refused", "source contains an unsafe label"]);
  assert.equal(Object.getPrototypeOf(refused.sources.tokens.details), Object.prototype);
});

// ---- Formats and publication ----
const SOURCES = ["token-consumption.json", "workflow-usage.json"];
const NAMES = ["flow-report.json", "flow-report.md", "flow-report.html"];
const GENERATION = /generation(?:Id)?[": ]+([0-9a-f-]{36})/;
type Run = typeof main;
type FsOverrides = Partial<RuntimeDeps["fs"]>;
async function apply(h: Harness, fs: FsOverrides = {}, run: Run = main): Promise<{ code: number; out: string; err: string }> {
  const io = captureIo({ ...h.deps, fs: { ...h.deps.fs, ...fs } }), code = await run(["--root", h.root, "--apply"], io);
  return { code, out: io.out.join(""), err: io.err.join("") };
}
const read = (h: Harness, name: string): string => h.deps.fs.readFileSync(h.deps.path.join(h.metrics, name));
const generations = (h: Harness): string[] => NAMES.map(name => GENERATION.exec(read(h, name))?.[1] ?? "");
const outsideDir = (t: TestContext): string => {
  const dir = tempFixture(createTestDeps(), { "keep.txt": "OUTSIDE" });
  t.after(() => createTestDeps().fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const seeded = (t: TestContext, extra: Record<string, string> = {}): Harness => harness(t, { ...full(createTestDeps()), ...extra });

test("preview renders markdown and html to stdout only, and apply rejects a format", async t => {
  const h = seeded(t), before = bytes(h.deps, h.root);
  const md = await preview(h, ["--format", "markdown"]), html = await preview(h, ["--format", "html"]);
  assert.deepEqual([md.code, html.code, md.out.startsWith("<!-- generator: ai-workflow/flow-report; format: markdown"), html.out.startsWith("<!doctype html>\n<!-- generator")], [0, 0, true, true]);
  assert.equal(bytes(h.deps, h.root), before);
  assert.equal((await preview(h, ["--apply", "--format", "html"])).code, 2);
});

test("apply publishes all three files under one generation using a single lease and leaves the sources untouched", async t => {
  const h = seeded(t), sources = SOURCES.map(name => read(h, name));
  const first = await apply(h);
  assert.deepEqual([first.code, first.err, h.leases, listTree(h.deps, h.metrics)], [0, "", { acquired: 1, released: 1 }, [...NAMES, "token-consumption.json", "workflow-usage.json"].sort()]);
  assert.match(first.out, /not as an atomic set/);
  const [id] = generations(h);
  assert.deepEqual(generations(h), [id, id, id]);
  assert.equal(h.deps.fs.lstatSync(h.deps.path.join(h.metrics, NAMES[0])).mode & 0o777, 0o644);
  assert.deepEqual(SOURCES.map(name => read(h, name)), sources);
  assert.equal((await apply(h)).code, 0);
  const [next] = generations(h);
  assert.notEqual(next, id);
  assert.deepEqual(generations(h), [next, next, next]);
  assert.equal(h.leases.acquired, 2);
});

test("apply creates a missing metrics directory and a missing project is refused", async t => {
  const h = harness(t, null), result = await apply(h);
  assert.deepEqual([result.code, listTree(h.deps, h.metrics)], [0, NAMES.slice().sort()]);
  assert.ok(read(h, NAMES[1]).includes("| tokens | missing |"));
  const bare = harness(t, { "x.txt": "x" });
  assert.deepEqual([(await apply(bare)).err, listTree(bare.deps, bare.root)], ["flow-report: project is not initialized\n", ["x.txt"]]);
});

async function unownedScenario(t: TestContext, run: Run): Promise<void> {
  const outside = outsideDir(t), cases: [string, (h: Harness, file: string) => void][] = [
    ["flow-report.json", (h, f) => h.deps.fs.writeFileSync(f, '{"schemaVersion":1,"mine":true}')],
    ["flow-report.md", (h, f) => h.deps.fs.writeFileSync(f, "# my own notes\n")],
    ["flow-report.html", (h, f) => h.deps.fs.symlinkSync(h.deps.path.join(outside, "keep.txt"), f)],
    ["flow-report.md", (h, f) => h.deps.fs.mkdirSync(f)],
    ["flow-report.html", (h, f) => { assert.equal(h.deps.child.runSync("mkfifo", [f]).status, 0); }],
  ];
  for (const [name, make] of cases) {
    const h = seeded(t), file = h.deps.path.join(h.metrics, name);
    make(h, file);
    const before = bytes(h.deps, h.metrics), result = await apply(h, {}, run);
    assert.deepEqual([result.code, result.out], [1, ""], name);
    assert.match(result.err, new RegExp(`publication refused: ${name} exists and is not a report this tool wrote; left unchanged`));
    assert.equal(bytes(h.deps, h.metrics), before, name);
    assert.equal(h.deps.fs.readFileSync(h.deps.path.join(outside, "keep.txt")), "OUTSIDE");
  }
}
test("existing unowned, linked, directory and FIFO targets are refused before anything is written", t => unownedScenario(t, main));

test("a leftover or concurrent staging directory fails closed and a later retry succeeds", async t => {
  const h = seeded(t, { ".project/metrics/.flow-report.staging/other.tmp": "THEIRS" }), stage = h.deps.path.join(h.metrics, ".flow-report.staging");
  const result = await apply(h);
  assert.deepEqual([result.code, listTree(h.deps, stage), h.deps.fs.existsSync(h.deps.path.join(h.metrics, NAMES[0]))], [1, ["other.tmp"], false]);
  assert.match(result.err, /another apply is running or left \.flow-report\.staging/);
  h.deps.fs.rmSync(stage, { recursive: true });
  assert.equal((await apply(h)).code, 0);
});

async function swapScenario(t: TestContext, run: Run, which: ".project" | ".project/metrics", kind: "symlink" | "dir"): Promise<void> {
  const outside = outsideDir(t), h = seeded(t), target = h.deps.path.join(h.root, which);
  let swapped = false;
  // The swap lands on a lookup verification never makes, so the next guarded call is the first to see it.
  const lstatSync: FsOverrides["lstatSync"] = path => {
    if (!swapped && path.endsWith(NAMES[0])) {
      swapped = true;
      h.deps.fs.renameSync(target, `${target}.moved`);
      if (kind === "symlink") h.deps.fs.symlinkSync(outside, target); else h.deps.fs.mkdirSync(target);
    }
    return h.deps.fs.lstatSync(path);
  };
  const before = bytes(h.deps, outside), result = await apply(h, { lstatSync }, run);
  assert.deepEqual([result.code, result.out, swapped], [1, "", true], `${which} ${kind}`);
  assert.match(result.err, /unsafe directory/);
  assert.equal(bytes(h.deps, outside), before);
  assert.equal(listTree(h.deps, which === ".project" ? target : h.deps.path.join(h.root, ".project")).some(f => f.includes("flow-report")), false);
  assert.equal(h.deps.fs.existsSync(h.deps.path.join(`${h.metrics}.moved`, NAMES[0])), false);
}
test("project or metrics directories swapped after the snapshot are refused and nothing outside is written", async t => {
  for (const which of [".project", ".project/metrics"] as const) for (const kind of ["symlink", "dir"] as const) await swapScenario(t, main, which, kind);
});

test("a target changed or created between preflight and publish is preserved and the incomplete set is reported", async t => {
  const h = seeded(t);
  assert.equal((await apply(h)).code, 0);
  const [old] = generations(h), json = h.deps.path.join(h.metrics, NAMES[0]);
  let fsyncs = 0;
  const changed = await apply(h, { fsyncSync: fd => { if (!fsyncs++) { h.deps.fs.rmSync(json); h.deps.fs.writeFileSync(json, "USER EDIT"); } h.deps.fs.fsyncSync(fd); } });
  assert.deepEqual([changed.code, read(h, NAMES[0]), generations(h).slice(1)], [1, "USER EDIT", [old, old]]);
  assert.match(changed.err, /publication refused: flow-report\.json changed during publish; left unchanged/);
  assert.equal(listTree(h.deps, h.metrics).some(f => f.includes("staging")), false);
  const fresh = seeded(t), html = fresh.deps.path.join(fresh.metrics, NAMES[2]);
  let count = 0;
  const created = await apply(fresh, { fsyncSync: fd => { if (++count === 3) fresh.deps.fs.writeFileSync(html, "USER HTML"); fresh.deps.fs.fsyncSync(fd); } });
  assert.deepEqual([created.code, read(fresh, NAMES[2]), listTree(fresh.deps, fresh.metrics).some(f => f.includes("staging"))], [1, "USER HTML", false]);
  assert.match(created.err, /publication incomplete: flow-report\.html appeared during publish; left unchanged\. Published: flow-report\.json, flow-report\.md; generation .*mix generations/);
});

test("a staging directory swapped after a link, during a re-read or after staging never redirects a delete, rename or publish", async t => {
  const outside = outsideDir(t), decoy = (h: Harness): void => h.deps.fs.writeFileSync(h.deps.path.join(outside, NAMES[0]), "OUTSIDE JSON");
  const toLink = (h: Harness): void => { const stage = h.deps.path.join(h.metrics, ".flow-report.staging"); h.deps.fs.renameSync(stage, `${stage}.moved`); h.deps.fs.symlinkSync(outside, stage); };
  const linked = seeded(t); decoy(linked);
  const afterLink = await apply(linked, { linkSync: (from, to) => { linked.deps.fs.linkSync(from, to); toLink(linked); } });
  assert.deepEqual([afterLink.code, read(linked, NAMES[0]).includes(GENERATION.exec(afterLink.err)?.[1] ?? "?"), linked.deps.fs.readFileSync(linked.deps.path.join(outside, NAMES[0]))], [1, true, "OUTSIDE JSON"]);
  assert.match(afterLink.err, /publication incomplete: .*Published: flow-report\.json;/);
  const reread = seeded(t), owned = await apply(reread);
  assert.equal(owned.code, 0);
  let opens = 0;
  const [old] = generations(reread), swapped = await apply(reread, { openSync: (file, flags, mode) => { if (file.endsWith(NAMES[0]) && !file.includes("staging") && ++opens === 2) toLink(reread); return reread.deps.fs.openSync(file, flags, mode); } });
  assert.deepEqual([swapped.code, generations(reread)[0], reread.deps.fs.readFileSync(reread.deps.path.join(outside, NAMES[0]))], [1, old, "OUTSIDE JSON"]);
  const tamper = seeded(t), stagedJson = tamper.deps.path.join(tamper.metrics, ".flow-report.staging", NAMES[0]);
  let first = true;
  const forged = await apply(tamper, { fsyncSync: fd => { if (first) { first = false; tamper.deps.fs.writeFileSync(stagedJson, `X${tamper.deps.fs.readFileSync(stagedJson).slice(1)}`); } tamper.deps.fs.fsyncSync(fd); } });
  assert.match(forged.err, /publication refused: staged file changed/);
  assert.equal(NAMES.some(n => tamper.deps.fs.existsSync(tamper.deps.path.join(tamper.metrics, n))), false);
  const failing = seeded(t);
  let unlinks = 0;
  const kept = await apply(failing, { unlinkSync: file => { if (!unlinks++) throw Object.assign(new Error("boom"), { code: "EIO" }); failing.deps.fs.unlinkSync(file); } });
  assert.match(kept.err, /publication incomplete: publish failed \(EIO\)\. Published: flow-report\.json;/);
  assert.ok(read(failing, NAMES[0]).includes("generationId"));
});

test("a swapped staging directory is never cleaned or published from", async t => {
  const h = seeded(t), stage = h.deps.path.join(h.metrics, ".flow-report.staging");
  let done = false;
  const result = await apply(h, { fsyncSync: fd => {
    if (!done) { done = true; h.deps.fs.renameSync(stage, `${stage}.moved`); h.deps.fs.mkdirSync(stage); h.deps.fs.writeFileSync(h.deps.path.join(stage, "keep.txt"), "USER"); }
    h.deps.fs.fsyncSync(fd);
  } });
  assert.match(result.err, /publication refused: unsafe directory/);
  assert.deepEqual([listTree(h.deps, stage), NAMES.some(n => h.deps.fs.existsSync(h.deps.path.join(h.metrics, n)))], [["keep.txt"], false]);
});

test("short writes are completed, stalled writes publish nothing, and a rename fault leaves a visibly mixed set", async t => {
  const h = seeded(t);
  assert.equal((await apply(h, { writeSync: (fd, data) => h.deps.fs.writeSync(fd, typeof data === "string" ? data : data.subarray(0, 7)) })).code, 0);
  const text = read(h, NAMES[1]), [first] = generations(h);
  assert.ok(text.endsWith("\n") && ownsAll(h));
  const stalled = await apply(h, { writeSync: () => 0 });
  assert.deepEqual([stalled.code, read(h, NAMES[1]), generations(h)], [1, text, [first, first, first]]);
  assert.match(stalled.err, /short write/);
  let renames = 0;
  const faulty = await apply(h, { renameSync: (from, to) => { if (++renames === 2) throw Object.assign(new Error("boom"), { code: "EIO" }); h.deps.fs.renameSync(from, to); } });
  const ids = generations(h);
  assert.match(faulty.err, /publication incomplete: publish failed \(EIO\)\. Published: flow-report\.json;.*mix generations/);
  assert.deepEqual([ids[0] !== first, ids[1], ids[2], listTree(h.deps, h.metrics).some(f => f.includes("staging"))], [true, first, first, false]);
  assert.equal((await apply(h)).code, 0);
  assert.equal(new Set(generations(h)).size, 1);
});
function ownsAll(h: Harness): boolean { return NAMES.every(name => read(h, name).includes("ai-workflow/flow-report")); }

// ---- Guard mutants: the same scenarios must fail when a guard is removed, proving they test that guard. ----
async function mutant(t: TestContext, from: string, to: string): Promise<Run> {
  const deps = createTestDeps(), source = deps.fs.readFileSync(SCRIPT);
  assert.ok(source.includes(from), "mutation site exists");
  const dir = deps.fs.mkdtempSync(`${deps.os.tmpdir()}/flow-mutant-`), file = deps.path.join(dir, "mutant.mts");
  t.after(() => deps.fs.rmSync(dir, { recursive: true, force: true }));
  deps.fs.writeFileSync(file, source.replace(from, to).replaceAll('from "./', `from "${fileUrl(deps.path.dirname(SCRIPT))}/`));
  return (await import(fileUrl(file)) as { main: Run }).main;
}
function publishedInsteadOfRefused(error: unknown): boolean {
  return error instanceof assert.AssertionError && error.operator === "deepStrictEqual"
    && Array.isArray(error.actual) && error.actual[0] === 0 && typeof error.actual[1] === "string"
    && error.actual[1].startsWith("flow-report: published flow-report.json, flow-report.md, flow-report.html")
    && Array.isArray(error.expected) && error.expected[0] === 1;
}
test("ownership and ancestor-swap tests fail for the intended reason when the guard is removed", async t => {
  const ownership = await mutant(t, ' || !ownsFormat(format, loaded.text)', "");
  await assert.rejects(() => unownedScenario(t, ownership), publishedInsteadOfRefused);
  const identity = await mutant(t, "stat.ino !== pinned[i].ino || stat.dev !== pinned[i].dev || ", "");
  await assert.rejects(() => swapScenario(t, identity, ".project/metrics", "dir"), publishedInsteadOfRefused);
  await swapScenario(t, main, ".project/metrics", "dir");
});
