const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const { POLICY_FILE, MAX_POLICY_BYTES, VENDORS, validatePolicy, readPolicy, report } = require("./orca-policy");
const EXAMPLE = path.resolve(__dirname, "../integrations/orca-vendors.example.json");
const SCRIPT = path.join(__dirname, "orca-policy.js");

function policy(enabled = true) {
  return { ...JSON.parse(fs.readFileSync(EXAMPLE, "utf8")), "use-orca-orchestration": enabled };
}
function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "orca-policy-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".project"));
  return root;
}
function write(root, value) {
  fs.writeFileSync(path.join(root, POLICY_FILE), typeof value === "string" ? value : JSON.stringify(value));
}
function run(root, args = [], options = {}) {
  return spawnSync(process.execPath, [SCRIPT, "report", "--root", root, "--vendor", "codex", "--json", ...args],
    { encoding: "utf8", timeout: 3000, ...options });
}

test("selects alternate workers for every invoking vendor without authorizing dispatch", (t) => {
  const root = fixture(t);
  write(root, policy());
  const before = fs.readFileSync(path.join(root, POLICY_FILE));
  for (const vendor of VENDORS) {
    const result = report(root, vendor);
    assert.equal(result.vendor, vendor);
    assert.deepEqual(result.workers, VENDORS.filter((entry) => entry !== vendor));
    assert.equal(result.roles.implementation, policy().coordinators[vendor].roles.implementation);
    assert.equal(result.eligible, true);
    assert.equal(result.route, "normal");
    assert.equal(result.dispatchReady, false);
    assert.equal(result.maxConcurrentWorkers, 2);
    assert.equal(result.maxRetriesPerTask, 1);
  }
  assert.deepEqual(fs.readFileSync(path.join(root, POLICY_FILE)), before);
  assert.deepEqual(fs.readdirSync(path.join(root, ".project")), ["orchestration.json"]);
});

test("keeps missing and disabled configuration on the normal workflow", (t) => {
  const root = fixture(t);
  assert.equal(report(root, "codex").reason, "policy-missing");
  fs.rmdirSync(path.join(root, ".project"));
  assert.equal(readPolicy(root).status, "missing");
  assert.deepEqual(fs.readdirSync(root), []);
  fs.mkdirSync(path.join(root, ".project"));
  write(root, policy(false));
  assert.deepEqual(report(root, "claude"), {
    schemaVersion: 1, vendor: "claude", policyStatus: "disabled", eligible: false,
    reason: "policy-disabled", route: "normal", dispatchReady: false,
    workers: [], roles: {}, maxConcurrentWorkers: 0, maxRetriesPerTask: 0,
  });
  const omitted = policy();
  delete omitted["use-orca-orchestration"];
  write(root, omitted);
  assert.equal(report(root, "codex").reason, "policy-disabled");
  assert.equal(readPolicy(root).policy["use-orca-orchestration"], false);
});

test("handles unconfigured coordinators and intentionally empty worker lists", (t) => {
  const root = fixture(t);
  const value = policy();
  delete value.coordinators.codex;
  write(root, value);
  assert.equal(report(root, "codex").reason, "coordinator-unconfigured");
  value.coordinators.codex = { workers: [], roles: {} };
  write(root, value);
  assert.equal(report(root, "codex").reason, "no-workers");
  assert.equal(validatePolicy(value).status, "valid");
});

test("rejects malformed routing and bounds with exact fallback outcomes", async (t) => {
  const variants = [
    ["flag wrong type", (p) => { p["use-orca-orchestration"] = "true"; }],
    ["flag null", (p) => { p["use-orca-orchestration"] = null; }],
    ["legacy mode rejected", (p) => { p.mode = "auto"; }],
    ["concurrency low", (p) => { p.maxConcurrentWorkers = 0; }],
    ["concurrency high", (p) => { p.maxConcurrentWorkers = 4; }],
    ["concurrency fractional", (p) => { p.maxConcurrentWorkers = 1.5; }],
    ["retries low", (p) => { p.maxRetriesPerTask = -1; }],
    ["retries high", (p) => { p.maxRetriesPerTask = 3; }],
    ["retries fractional", (p) => { p.maxRetriesPerTask = 0.5; }],
    ["unknown field", (p) => { p.command = "SECRET_MARKER"; }],
    ["unknown coordinator", (p) => { p.coordinators.cursor = { workers: [], roles: {} }; }],
    ["self worker", (p) => { p.coordinators.codex = { workers: ["codex"], roles: { implementation: "codex", review: "codex" } }; }],
    ["duplicate worker", (p) => { p.coordinators.codex = { workers: ["claude", "claude"], roles: { implementation: "claude", review: "claude" } }; }],
    ["unknown worker", (p) => { p.coordinators.codex = { workers: ["cursor"], roles: { implementation: "cursor", review: "cursor" } }; }],
    ["too many workers", (p) => { p.coordinators.codex.workers = ["claude", "opencode", "claude"]; }],
    ["worker wrong type", (p) => { p.coordinators.codex.workers = "claude"; }],
    ["route outside workers", (p) => { p.coordinators.codex.roles.review = "codex"; }],
    ["unknown role", (p) => { p.coordinators.codex.roles.owner = "claude"; }],
    ["unknown coordinator field", (p) => { p.coordinators.codex.command = "SECRET_MARKER"; }],
    ["coordinator null", (p) => { p.coordinators.codex = null; }],
    ["roles null", (p) => { p.coordinators.codex.roles = null; }],
    ["schema wrong type", (p) => { p.schemaVersion = "1"; }],
    ["missing field", (p) => { delete p.maxRetriesPerTask; }],
  ];
  for (const [name, change] of variants) await t.test(name, (t) => {
    const root = fixture(t);
    const value = policy();
    change(value);
    write(root, value);
    const result = report(root, "codex");
    assert.equal(result.reason, "policy-malformed");
    assert.equal(result.eligible, false);
    assert.deepEqual(result.workers, []);
    assert.ok(!JSON.stringify(result).includes("SECRET_MARKER"));
  });
});

test("accepts configured integer boundaries and rejects unsafe keys at every level", () => {
  for (const concurrency of [1, 3]) for (const retries of [0, 2]) {
    const value = policy();
    value.maxConcurrentWorkers = concurrency;
    value.maxRetriesPerTask = retries;
    assert.equal(validatePolicy(value).status, "valid");
  }
  for (const level of ["top", "coordinators", "coordinator", "roles"]) {
    const value = policy();
    const target = level === "top" ? value : level === "coordinators" ? value.coordinators
      : level === "coordinator" ? value.coordinators.codex : value.coordinators.codex.roles;
    for (const key of ["__proto__", "constructor", "prototype"]) {
      Object.defineProperty(target, key, { value: "SECRET_MARKER", enumerable: true, configurable: true });
      assert.equal(validatePolicy(value).status, "malformed");
      delete target[key];
    }
  }
  for (const value of [null, [], 1, "bad", Object.create({ schemaVersion: 1 })]) {
    assert.equal(validatePolicy(value).status, "malformed");
  }
});

test("distinguishes unsupported versions and invalid JSON without exposing content", (t) => {
  const root = fixture(t);
  write(root, { ...policy(), schemaVersion: 2 });
  assert.equal(report(root, "codex").reason, "policy-unsupported-schema");
  write(root, "{SECRET_MARKER");
  const result = run(root);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).reason, "policy-malformed");
  assert.ok(!result.stdout.includes("SECRET_MARKER"));
  assert.equal(result.stderr, "");
});

test("refuses symlinked files and ancestors without reading their targets", (t) => {
  const root = fixture(t);
  const outside = fixture(t);
  write(outside, policy());
  fs.symlinkSync(path.join(outside, POLICY_FILE), path.join(root, POLICY_FILE));
  assert.equal(readPolicy(root).status, "refused");
  fs.unlinkSync(path.join(root, POLICY_FILE));
  fs.rmdirSync(path.join(root, ".project"));
  fs.symlinkSync(path.join(outside, ".project"), path.join(root, ".project"));
  assert.equal(report(root, "codex").reason, "policy-refused");
  assert.equal(readPolicy(outside).status, "valid");
});

test("refuses nonregular paths and oversized files; accepts the exact byte limit", (t) => {
  assert.equal(MAX_POLICY_BYTES, 65536, "The policy contract fixes the byte limit independently of the implementation");
  const root = fixture(t);
  fs.mkdirSync(path.join(root, POLICY_FILE));
  assert.equal(readPolicy(root).status, "refused");
  fs.rmdirSync(path.join(root, POLICY_FILE));
  const text = JSON.stringify(policy());
  write(root, text.padEnd(MAX_POLICY_BYTES, " "));
  assert.equal(readPolicy(root).status, "valid");
  write(root, text.padEnd(MAX_POLICY_BYTES + 1, " "));
  assert.equal(readPolicy(root).status, "refused");
  fs.unlinkSync(path.join(root, POLICY_FILE));
  fs.rmdirSync(path.join(root, ".project"));
  fs.writeFileSync(path.join(root, ".project"), "SECRET_MARKER");
  assert.equal(readPolicy(root).status, "refused");
});

test("refuses a FIFO immediately rather than blocking", { skip: process.platform === "win32" }, (t) => {
  const root = fixture(t);
  assert.equal(spawnSync("mkfifo", [path.join(root, POLICY_FILE)]).status, 0);
  const result = run(root);
  assert.equal(result.status, 0, result.error?.code);
  assert.equal(JSON.parse(result.stdout).reason, "policy-refused");
});

test("refuses a FIFO substituted between inspection and opening without blocking", { skip: process.platform === "win32" }, (t) => {
  const root = fixture(t);
  write(root, policy());
  const code = `const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
    const { readPolicy, POLICY_FILE } = require(process.argv[1]);
    const root = process.argv[2], file = path.join(root, POLICY_FILE), original = fs.openSync;
    fs.openSync = (...args) => { fs.unlinkSync(file); cp.execFileSync('mkfifo', [file]); return original(...args); };
    console.log(JSON.stringify(readPolicy(root)));`;
  const result = spawnSync(process.execPath, ["-e", code, SCRIPT, root], { encoding: "utf8", timeout: 1500 });
  assert.equal(result.status, 0, result.error?.code);
  assert.equal(JSON.parse(result.stdout).status, "refused");
});

test("reports access denial as refusal rather than missing or a raw exception", (t) => {
  const root = fixture(t);
  write(root, policy());
  // Root bypasses chmod restrictions; inject the OS failure at the filesystem boundary instead.
  t.mock.method(fs, "lstatSync", () => { throw Object.assign(new Error("SECRET_MARKER"), { code: "EACCES" }); });
  assert.equal(report(root, "codex").reason, "policy-refused");
});

test("refuses open failures and checks the descriptor identity before reading", (t) => {
  const root = fixture(t);
  write(root, policy());
  const realOpen = fs.openSync;
  t.mock.method(fs, "openSync", () => { throw Object.assign(new Error("SECRET_MARKER"), { code: "ELOOP" }); });
  assert.equal(readPolicy(root).status, "refused");
  fs.openSync.mock.restore();
  const realStat = fs.fstatSync;
  t.mock.method(fs, "fstatSync", (fd) => Object.assign(realStat(fd), { ino: -1 }));
  assert.equal(readPolicy(root).status, "refused");
  fs.fstatSync.mock.restore();
  assert.equal(fs.openSync, realOpen);
});

test("bounds a file that grows after descriptor inspection", (t) => {
  const root = fixture(t);
  write(root, policy());
  const actualRead = fs.readSync;
  let grew = false;
  t.mock.method(fs, "readSync", (...args) => {
    if (!grew) { grew = true; fs.appendFileSync(path.join(root, POLICY_FILE), " ".repeat(MAX_POLICY_BYTES)); }
    return actualRead(...args);
  });
  assert.equal(readPolicy(root).status, "refused");
});

test("rechecks the path after opening and refuses changed ownership before reading", (t) => {
  const root = fixture(t);
  write(root, policy());
  const actualStat = fs.fstatSync;
  t.mock.method(fs, "fstatSync", (fd) => {
    const stat = actualStat(fd);
    fs.renameSync(path.join(root, POLICY_FILE), path.join(root, ".project/original.json"));
    write(root, policy(false));
    return stat;
  });
  const reader = t.mock.method(fs, "readSync");
  assert.equal(readPolicy(root).status, "refused");
  assert.equal(reader.mock.callCount(), 0);
});

test("refuses an oversized opened descriptor before reading bytes", (t) => {
  const root = fixture(t);
  write(root, policy());
  const actualStat = fs.fstatSync;
  t.mock.method(fs, "fstatSync", (fd) => Object.assign(actualStat(fd), { size: MAX_POLICY_BYTES + 1 }));
  const reader = t.mock.method(fs, "readSync");
  assert.equal(readPolicy(root).status, "refused");
  assert.equal(reader.mock.callCount(), 0);
});

test("refuses a nonregular opened descriptor before reading bytes", (t) => {
  const root = fixture(t);
  write(root, policy());
  const actualStat = fs.fstatSync;
  t.mock.method(fs, "fstatSync", (fd) => Object.assign(actualStat(fd), { isFile: () => false }));
  const reader = t.mock.method(fs, "readSync");
  assert.equal(readPolicy(root).status, "refused");
  assert.equal(reader.mock.callCount(), 0);
});

test("refuses a resolved path outside the trusted root", (t) => {
  const root = fixture(t);
  write(root, policy());
  const actualRealpath = fs.realpathSync;
  t.mock.method(fs, "realpathSync", (file) => file === path.join(root, POLICY_FILE)
    ? path.join(path.dirname(root), "outside", "orchestration.json") : actualRealpath(file));
  assert.equal(readPolicy(root).status, "refused");
});

test("grades the shaped policy permutation family with executed assertions", (t) => {
  // Translate all-coordinator-and-policy-permutations into portable assertions; project-local
  // shaping records are not copied into projects by bundle-sync.
  const root = fixture(t);
  write(root, policy());
  for (const vendor of VENDORS) {
    const result = report(root, vendor);
    assert.equal(result.vendor, vendor);
    assert.equal(result.workers.length, 2);
    assert.ok(result.maxConcurrentWorkers <= 3);
    assert.equal(result.dispatchReady, false);
  }
});

test("validates the shipped example as disabled, and normalizes CLI diagnostics", (t) => {
  assert.equal(validatePolicy(JSON.parse(fs.readFileSync(EXAMPLE, "utf8"))).status, "disabled");
  const root = fixture(t);
  write(root, policy());
  const result = run(root);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).eligible, true);
  const plain = spawnSync(process.execPath, [SCRIPT, "report", "--root", root, "--vendor", "claude"], { encoding: "utf8" });
  assert.equal(plain.status, 0);
  assert.match(plain.stdout, /normal workflow; dispatch disabled/);
  assert.throws(() => report(root, "cursor"), /invalid-vendor/);
});

test("rejects unknown, duplicate, missing and invalid CLI arguments with fixed errors", (t) => {
  const root = fixture(t);
  for (const args of [["--unknown", "SECRET_MARKER"], ["--json"], ["--root"], ["--vendor", "cursor"]]) {
    const result = run(root, args);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "orca-policy: invalid invocation or internal failure\n");
  }
  for (const args of [[], ["invalid"], ["report", "--vendor"], ["report", "--root", "--json"]]) {
    const result = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 1);
  }
  const defaultRoot = spawnSync(process.execPath, [SCRIPT, "report", "--vendor", "codex", "--json"], { cwd: root, encoding: "utf8" });
  assert.equal(defaultRoot.status, 0);
  assert.equal(JSON.parse(defaultRoot.stdout).policyStatus, "missing");
});
