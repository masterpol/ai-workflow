const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const { MAX_OUTPUT_BYTES, CALL_TIMEOUT_MS, TOTAL_TIMEOUT_MS, SUPPORTED_VERSION,
  selectExecutable, executablePresent, report } = require("./orca-preflight");
const EXAMPLE = path.resolve(__dirname, "../integrations/orca-vendors.example.json");
const SCRIPT = path.join(__dirname, "orca-preflight.js");

function fixture(t, enabled = true) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "orca-preflight-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".project"));
  const policy = JSON.parse(fs.readFileSync(EXAMPLE, "utf8"));
  policy["use-orca-orchestration"] = enabled;
  fs.writeFileSync(path.join(root, ".project/orchestration.json"), JSON.stringify(policy));
  return root;
}
function receipts() {
  return [
    { name: "orca-cli", markdown: "worktree current; terminal" },
    { name: "orchestration", markdown: "worker-start; worker_done; orchestration check" },
    { ok: true, result: { target: { kind: "local" }, runtime: { reachable: true, state: "ready", appVersion: "1.4.222" },
      caller: { live: true, orcaSessionId: "fixture-session" } } },
  ];
}
function probe(values = receipts()) {
  const calls = [];
  return { calls, options: { probe: true, env: { ORCA_AGENT_SESSION_ID: "fixture-session" }, platform: "darwin",
    present: () => true, run: (command, args, options) => {
      calls.push({ command, args, options });
      return { status: 0, signal: null, stdout: JSON.stringify(values[calls.length - 1]), stderr: "" };
    } } };
}
const assertNormal = (result) => {
  assert.equal(result.route, "normal");
  assert.equal(result.dispatchReady, false);
  assert.equal(result.authentication, "unverified");
};

test("skips all Orca checks when false or missing, including explicit probe requests", (t) => {
  const root = fixture(t, false);
  const options = { probe: true, present: () => { throw Error("availability must not run"); }, run: () => { throw Error("probe must not run"); },
    get env() { throw Error("environment must not be inspected"); }, get platform() { throw Error("platform must not be inspected"); } };
  assertNormal(report(root, "codex", options));
  assert.equal(report(root, "codex", options).reason, "policy-disabled");
  const file = path.join(root, ".project/orchestration.json");
  const policy = JSON.parse(fs.readFileSync(file, "utf8"));
  delete policy["use-orca-orchestration"];
  fs.writeFileSync(file, JSON.stringify(policy));
  assert.equal(report(root, "codex", options).reason, "policy-disabled");
  fs.unlinkSync(file);
  assertNormal(report(root, "codex", options));
});

test("probe child gets only absolute PATH entries and dot-only override names are refused", (t) => {
  const root = fixture(t);
  const file = path.join(root, ".project/orchestration.json");
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  value["use-orca-orchestration"] = true;
  fs.writeFileSync(file, JSON.stringify(value));
  const harness = probe();
  harness.options.env.PATH = ["", ".", "rel", "/usr/bin"].join(path.delimiter);
  report(root, "codex", harness.options);
  assert.ok(harness.calls.length > 0);
  for (const call of harness.calls) assert.equal(call.options.env.PATH, "/usr/bin");
  for (const name of ["..", "."]) {
    const result = report(root, "codex", { env: { ORCA_CLI_COMMAND: name, PATH: "/usr/bin" }, platform: "darwin", present: () => true });
    assert.equal(result.reason, "executable-selection-unsupported");
  }
});

test("skips all checks for malformed/refused policy and unconfigured or empty routes", (t) => {
  const root = fixture(t);
  const options = { get env() { throw Error("must not inspect environment"); } };
  const file = path.join(root, ".project/orchestration.json");
  fs.writeFileSync(file, "not json");
  assert.equal(report(root, "codex", options).reason, "policy-malformed");
  assertNormal(report(root, "codex", options));
  fs.unlinkSync(file);
  fs.mkdirSync(file);
  assert.equal(report(root, "codex", options).reason, "policy-refused");
  assertNormal(report(root, "codex", options));
  fs.rmdirSync(file);
  for (const coordinators of [{}, { codex: { workers: [], roles: {} } }]) {
    const value = JSON.parse(fs.readFileSync(EXAMPLE, "utf8"));
    value["use-orca-orchestration"] = true;
    value.coordinators = coordinators;
    fs.writeFileSync(file, JSON.stringify(value));
    assert.equal(report(root, "codex", options).eligible, false);
    assertNormal(report(root, "codex", options));
  }
});

test("keeps worker ownership ahead of coordinator auto-selection without probing", (t) => {
  const root = fixture(t);
  const result = report(root, "claude", { workerContext: true, probe: true, get env() { throw Error("must not inspect environment"); } });
  assert.equal(result.role, "worker");
  assert.equal(result.reason, "worker-context");
  assert.equal(result.eligible, false);
  assert.equal(result.candidate, false);
  assertNormal(result);
});

test("selects one launcher by session/platform precedence and never interprets shell syntax", () => {
  assert.equal(selectExecutable({ ORCA_CLI_COMMAND: "/Application Support/Orca/bin/orca", ORCA_DEV_REPO_ROOT: "/dev" }, "darwin"), "/Application Support/Orca/bin/orca");
  assert.equal(selectExecutable({ ORCA_CLI_COMMAND: "orca-custom" }, "linux"), "orca-custom");
  assert.equal(selectExecutable({ ORCA_DEV_REPO_ROOT: "/dev" }, "darwin"), "orca-dev");
  assert.equal(selectExecutable({}, "linux"), "orca-ide");
  assert.equal(selectExecutable({ ORCA_TERMINAL_HANDLE: "fixture" }, "linux"), "orca");
  assert.equal(selectExecutable({ ORCA_AGENT_SESSION_ID: "fixture" }, "linux"), "orca");
  assert.equal(selectExecutable({}, "darwin"), "orca");
  assert.equal(selectExecutable({}, "win32"), "orca");
  assert.equal(selectExecutable({}, "unsupported"), null);
  for (const command of [42, "orca --json", "orca;whoami", "orca\n", "orca\0", "x".repeat(4097)]) {
    assert.equal(selectExecutable({ ORCA_CLI_COMMAND: command }, "darwin"), null);
  }
});

test("checks executable presence without launching it or using relative PATH entries", (t) => {
  const root = fixture(t);
  const file = path.join(root, "orca");
  fs.writeFileSync(file, "unused");
  fs.chmodSync(file, 0o755);
  assert.equal(executablePresent("orca", { PATH: root }, process.platform), true);
  assert.equal(executablePresent(file, {}, process.platform), true);
  assert.equal(executablePresent("missing", { PATH: root }, process.platform), false);
  assert.equal(executablePresent("orca", { PATH: "." }, process.platform), false);
  fs.mkdirSync(path.join(root, "directory"));
  assert.equal(executablePresent("directory", { PATH: root }, process.platform), false);
  fs.renameSync(file, `${file}.exe`);
  assert.equal(executablePresent("orca", { PATH: root }, "win32"), true);
  assert.equal(executablePresent("missing", {}, "win32"), false);
});

test("reports candidates statically without starting a process", (t) => {
  const root = fixture(t);
  for (const vendor of ["claude", "codex", "opencode"]) {
    const result = report(root, vendor, { platform: "darwin", env: {}, present: (command) => command !== "opencode", run: () => { throw Error("static report must not probe"); } });
    assert.equal(result.vendor, vendor);
    assert.equal(result.candidate, true);
    assert.equal(result.reason, "runtime-not-probed");
    assert.equal(result.runtime, "not-checked");
    assertNormal(result);
  }
});

test("falls back for unavailable launchers/workers and unsupported selection", (t) => {
  const root = fixture(t);
  assert.equal(report(root, "codex", { env: {}, platform: "unsupported" }).reason, "executable-selection-unsupported");
  assert.equal(report(root, "codex", { env: {}, platform: "darwin", present: () => false }).reason, "orca-unavailable");
  assert.equal(report(root, "codex", { env: {}, platform: "darwin", present: (name) => name === "orca" }).reason, "no-available-workers");
});

test("probes only fixed read-only argv with one executable and bounded process options", (t) => {
  const root = fixture(t);
  const { calls, options } = probe();
  options.env.ORCA_CLI_COMMAND = "/fixture/Orca launcher";
  const result = report(root, "codex", options);
  assert.deepEqual(calls.map((entry) => entry.args), [
    ["skills", "get", "orca-cli", "--json"], ["skills", "get", "orchestration", "--json"], ["status", "--json"],
  ]);
  for (const entry of calls) {
    assert.equal(entry.command, "/fixture/Orca launcher");
    assert.equal(entry.options.shell, false);
    assert.ok(entry.options.timeout > 0 && entry.options.timeout <= 5000);
    assert.equal(entry.options.maxBuffer, 262144);
    assert.equal(entry.options.killSignal, "SIGKILL");
    assert.equal(entry.options.cwd, root);
  }
  assert.equal(result.candidate, true);
  assert.equal(result.session, "verified");
  assert.equal(result.capabilities, "documented");
  assert.equal(result.orchestration, "unverified");
  assert.equal(result.reason, "orchestration-unverified");
  assert.equal(result.runtimeVersion, "1.4.222");
  assertNormal(result);
});

test("stops on broken launcher or process failure without switching executables or exposing errors", (t) => {
  const root = fixture(t);
  const scenarios = [
    ["probe-failed", () => ({ status: 1, stdout: "", stderr: "Unable to determine Orca.app path from symlink: /usr/local/bin/orca" })],
    ["probe-failed", () => { throw Error("SECRET_MARKER"); }],
    ["probe-timeout", () => ({ status: null, stdout: "", stderr: "", error: { code: "ETIMEDOUT", message: "SECRET_MARKER" } })],
    ["probe-output-limit", () => ({ status: null, stdout: "", stderr: "", error: { code: "ENOBUFS" } })],
    ["probe-failed", () => ({ status: null, stdout: "", stderr: "", error: { code: "ENOENT" } })],
    ["probe-failed", () => ({ status: 0, signal: "SIGTERM", stdout: "{}", stderr: "" })],
    ["probe-invalid-output", () => ({ status: 0, stdout: "SECRET_MARKER", stderr: "" })],
    ["probe-invalid-output", () => null],
    ["probe-output-limit", () => ({ status: 0, stdout: "x".repeat(262145), stderr: "" })],
    ["probe-output-limit", () => ({ status: 0, stdout: "{}", stderr: "x".repeat(262145) })],
  ];
  for (const [reason, run] of scenarios) {
    let count = 0;
    const result = report(root, "codex", { ...probe().options, run: (...args) => { count++; return run(...args); } });
    assert.equal(result.reason, reason);
    assert.equal(count, 1);
    assert.ok(!JSON.stringify(result).includes("SECRET_MARKER"));
    assertNormal(result);
  }
});

test("refuses unsupported guides and unproven runtime/caller receipts", (t) => {
  const root = fixture(t);
  const cases = [
    ["cli-guide-unsupported", (values) => { values[0].name = "other"; }],
    ["cli-guide-unsupported", (values) => { values[0].markdown = "terminal"; }],
    ["orchestration-guide-unsupported", (values) => { values[1].markdown = "worker-start"; }],
    ["runtime-unverified", (values) => { values[2].ok = false; }],
    ["runtime-unverified", (values) => { values[2].result.target.kind = "remote"; }],
    ["runtime-unreachable", (values) => { values[2].result.runtime.reachable = false; }],
    ["runtime-unreachable", (values) => { values[2].result.runtime.state = "starting"; }],
    ["runtime-version-unsupported", (values) => { delete values[2].result.runtime.appVersion; }],
    ["runtime-version-unsupported", (values) => { values[2].result.runtime.appVersion = "99.0.0"; }],
    ["caller-unverified", (values) => { delete values[2].result.caller; }],
    ["caller-unverified", (values) => { values[2].result.caller.live = false; }],
    ["caller-unverified", (values) => { values[2].result.caller.orcaSessionId = "stale-session"; }],
  ];
  for (const [reason, change] of cases) {
    const values = receipts();
    change(values);
    const result = report(root, "codex", probe(values).options);
    assert.equal(result.reason, reason);
    assertNormal(result);
  }
  const options = probe().options;
  options.env = {};
  assert.equal(report(root, "codex", options).reason, "caller-unverified");
});

test("does not infer launch authority from an unpinned experimental feature field", (t) => {
  const root = fixture(t);
  for (const enabled of [false, true]) {
    const values = receipts();
    values[2].result.runtime.orchestrationEnabled = enabled;
    const result = report(root, "codex", probe(values).options);
    assert.equal(result.orchestration, "unverified");
    assert.equal(result.reason, "orchestration-unverified");
    assertNormal(result);
  }
});

test("bounds the complete probe and reduces per-call timeout to remaining budget", (t) => {
  const root = fixture(t);
  assert.equal(CALL_TIMEOUT_MS, 5000);
  assert.equal(TOTAL_TIMEOUT_MS, 20000);
  assert.equal(MAX_OUTPUT_BYTES, 262144);
  assert.equal(SUPPORTED_VERSION, "1.4.222");
  const { options, calls } = probe();
  let time = 0;
  options.now = () => time;
  const original = options.run;
  options.run = (...args) => { const receipt = original(...args); time = 19999; return receipt; };
  assert.equal(report(root, "codex", options).reason, "orchestration-unverified");
  assert.equal(calls[1].options.timeout, 1);
  const expired = probe().options;
  let readings = 0;
  expired.now = () => readings++ === 0 ? 0 : 20000;
  expired.run = () => { throw Error("must not execute with expired budget"); };
  assert.equal(report(root, "codex", expired).reason, "probe-time-budget");
  const fractional = probe().options;
  let fractionalReadings = 0;
  fractional.now = () => fractionalReadings++ === 0 ? 0 : 19999.5;
  fractional.run = () => { throw Error("must not execute with a zero millisecond timeout"); };
  assert.equal(report(root, "codex", fractional).reason, "probe-time-budget");
  const overshot = probe().options;
  time = 0;
  overshot.now = () => time;
  overshot.run = () => { time = 20000; return { status: 0, stdout: "{}", stderr: "" }; };
  assert.equal(report(root, "codex", overshot).reason, "probe-failed");
});

test("terminates slow/oversized real fixture processes within fixed limits", { skip: process.platform === "win32" }, (t) => {
  const root = fixture(t);
  const fixtureRunner = (command, args, options) => spawnSync(process.execPath,
    ["-e", "setTimeout(() => {}, 2000)"], { ...options, timeout: 50 });
  assert.equal(report(root, "codex", { ...probe().options, run: fixtureRunner }).reason, "probe-timeout");
  const overflowRunner = (command, args, options) => spawnSync(process.execPath,
    ["-e", "process.stdout.write('x'.repeat(300000))"], options);
  assert.equal(report(root, "codex", { ...probe().options, run: overflowRunner }).reason, "probe-output-limit");
});

test("keeps public CLI default/probe/worker diagnostics read-only and normal", (t) => {
  const root = fixture(t, false);
  for (const args of [[], ["--probe"], ["--worker-context"]]) {
    const result = spawnSync(process.execPath, [SCRIPT, "report", "--root", root, "--vendor", "codex", "--json", ...args], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assertNormal(JSON.parse(result.stdout));
  }
  const plain = spawnSync(process.execPath, [SCRIPT, "report", "--root", root, "--vendor", "codex"], { encoding: "utf8" });
  assert.equal(plain.status, 0);
  assert.match(plain.stdout, /policy-disabled; normal workflow/);
  const cwd = spawnSync(process.execPath, [SCRIPT, "report", "--vendor", "codex", "--json"], { cwd: root, encoding: "utf8" });
  assert.equal(cwd.status, 0);
  for (const args of [[], ["invalid"], ["report"], ["report", "--vendor", "cursor"], ["report", "--root"],
    ["report", "--vendor", "--json"], ["report", "--unknown"], ["report", "--probe", "--probe"]]) {
    const result = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, "orca-preflight: invalid invocation or internal failure\n");
  }
});

test("doctor validates optional local policy without probing or repairing it", { skip: process.platform === "win32" }, (t) => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "orca-doctor-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const bundle = path.resolve(__dirname, "../..");
  const skip = new Set(["node_modules", "caveman", "settings.local.json", "credentials.json", ".aws"]);
  const filter = (source) => !skip.has(path.basename(source)) && !path.basename(source).startsWith(".env");
  for (const item of [".claude", ".agents", ".codex", ".cursor", ".opencode", "ai-framework",
    "AGENTS.md", "CLAUDE.md", "README.md", "SETUP.md"]) {
    fs.cpSync(path.join(bundle, item), path.join(root, item), { recursive: true, filter });
  }
  // No project-local registry/packages or their external wrappers belong to this bundle fixture.
  fs.rmSync(path.join(root, ".opencode/skills"), { recursive: true, force: true });
  const bin = path.join(root, "fixture-bin");
  fs.mkdirSync(bin);
  const marker = path.join(root, "orca-was-executed");
  const launcher = path.join(bin, "orca");
  const sentinel = `#!${process.execPath}\nrequire('node:fs').writeFileSync(${JSON.stringify(marker)}, 'executed');\n`;
  for (const vendor of ["orca", "orca-dev", "orca-ide", "claude", "codex"]) {
    fs.writeFileSync(path.join(bin, vendor), sentinel, { mode: 0o755 });
  }
  const env = { ...process.env, PATH: bin, ORCA_CLI_COMMAND: launcher, NO_COLOR: "1" };
  const run = (...args) => spawnSync(process.execPath, ["ai-framework/scripts/workflow-doctor.js", "--json", ...args],
    { cwd: root, encoding: "utf8", env, timeout: 10000, maxBuffer: 1024 * 1024 });
  const assertDoctor = (status, expected, args = []) => {
    const result = run(...args);
    const report = JSON.parse(result.stdout);
    assert.equal(result.status, expected, result.stderr || JSON.stringify(report.results.filter((item) => item.status === "fail")));
    assert.equal(report.results.find((item) => item.name === "Orca policy").status, status);
    assert.equal(report.failures, expected);
    assert.equal(fs.existsSync(marker), false, "doctor must never execute Orca or alternate vendors");
    assert.ok(!result.stdout.includes("SECRET_MARKER"));
    return report;
  };
  assertDoctor("info", 0, ["--fix"]);
  assert.equal(fs.existsSync(path.join(root, ".project")), false);
  fs.mkdirSync(path.join(root, ".project"));
  // Only install the normal scaffold; optional orchestration is not a template requirement.
  fs.cpSync(path.join(root, "ai-framework/templates/project"), path.join(root, ".project"), { recursive: true });
  fs.writeFileSync(path.join(root, ".project/pitches/_followups.md"), "# Follow-ups\n");
  const file = path.join(root, ".project/orchestration.json");
  assertDoctor("info", 0, ["--fix"]);
  assert.equal(fs.existsSync(file), false, "doctor must not create optional policy in an installed project");
  const value = JSON.parse(fs.readFileSync(EXAMPLE, "utf8"));
  fs.writeFileSync(file, JSON.stringify(value));
  assertDoctor("info", 0);
  value["use-orca-orchestration"] = true;
  fs.writeFileSync(file, JSON.stringify(value));
  const valid = assertDoctor("pass", 0);
  assert.match(valid.results.find((item) => item.name === "Orca policy").detail, /runtime unverified; normal workflow; dispatch disabled/);
  for (const text of ["SECRET_MARKER", JSON.stringify({ ...value, schemaVersion: 2 }),
    JSON.stringify({ ...value, "use-orca-orchestration": "true" })]) {
    fs.writeFileSync(file, text);
    assertDoctor("fail", 1, ["--fix"]);
    assert.equal(fs.readFileSync(file, "utf8"), text, "doctor must not rewrite invalid policy");
  }
  fs.unlinkSync(file);
  fs.mkdirSync(file);
  assertDoctor("fail", 1, ["--fix"]);
  assert.equal(fs.statSync(file).isDirectory(), true);
  fs.rmdirSync(file);
  const target = path.join(root, "outside-policy.json");
  fs.writeFileSync(target, "SECRET_MARKER");
  fs.symlinkSync(target, file);
  assertDoctor("fail", 1, ["--fix"]);
  assert.equal(fs.lstatSync(file).isSymbolicLink(), true);
  assert.equal(fs.readFileSync(target, "utf8"), "SECRET_MARKER");
});
