const fs = require("node:fs");
const path = require("node:path");

const POLICY_FILE = ".project/orchestration.json";
const MAX_POLICY_BYTES = 64 * 1024;
const VENDORS = Object.freeze(["claude", "codex", "opencode"]);
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const hasKeys = (value, allowed) => isRecord(value) && Object.keys(value).every((key) => allowed.includes(key));
const boundedInteger = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

function validateCoordinator(vendor, value) {
  if (!hasKeys(value, ["workers", "roles"]) || !Array.isArray(value.workers) || value.workers.length > 2) return null;
  if (value.workers.some((worker) => !VENDORS.includes(worker) || worker === vendor)
    || new Set(value.workers).size !== value.workers.length) return null;
  if (!hasKeys(value.roles, ["implementation", "review"])
    || Object.values(value.roles).some((worker) => !value.workers.includes(worker))) return null;
  return { workers: [...value.workers], roles: Object.fromEntries(Object.entries(value.roles)) };
}

function validatePolicy(value) {
  if (!hasKeys(value, ["schemaVersion", "use-orca-orchestration", "maxConcurrentWorkers", "maxRetriesPerTask", "coordinators"])) return { status: "malformed" };
  if (!Number.isInteger(value.schemaVersion)) return { status: "malformed" };
  if (value.schemaVersion !== 1) return { status: "unsupported-schema" };
  if ((Object.hasOwn(value, "use-orca-orchestration") && typeof value["use-orca-orchestration"] !== "boolean")
    || !boundedInteger(value.maxConcurrentWorkers, 1, 3)
    || !boundedInteger(value.maxRetriesPerTask, 0, 2) || !hasKeys(value.coordinators, VENDORS)) return { status: "malformed" };
  const coordinators = {};
  for (const [vendor, entry] of Object.entries(value.coordinators)) {
    const normalized = validateCoordinator(vendor, entry);
    if (!normalized) return { status: "malformed" };
    coordinators[vendor] = normalized;
  }
  return {
    status: value["use-orca-orchestration"] === true ? "valid" : "disabled",
    policy: { schemaVersion: 1, "use-orca-orchestration": value["use-orca-orchestration"] === true, maxConcurrentWorkers: value.maxConcurrentWorkers,
      maxRetriesPerTask: value.maxRetriesPerTask, coordinators },
  };
}

function inspectPath(root) {
  const base = fs.realpathSync(root);
  let file = base;
  for (const part of POLICY_FILE.split("/")) {
    file = path.join(file, part);
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || (part !== "orchestration.json" && !stat.isDirectory())) return { status: "refused" };
  }
  const relative = path.relative(base, fs.realpathSync(file));
  if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) return { status: "refused" };
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.size > MAX_POLICY_BYTES) return { status: "refused" };
  return { base, file, stat };
}

function readBoundedFile(location) {
  let descriptor;
  try {
    // A replaced FIFO must not block between lstat and open; a replaced leaf symlink is refused.
    descriptor = fs.openSync(location.file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
    const opened = fs.fstatSync(descriptor);
    if (!opened.isFile() || opened.size > MAX_POLICY_BYTES || opened.dev !== location.stat.dev || opened.ino !== location.stat.ino) return { status: "refused" };
    const current = inspectPath(location.base);
    if (current.status || current.stat.dev !== opened.dev || current.stat.ino !== opened.ino) return { status: "refused" };
    const buffer = Buffer.alloc(MAX_POLICY_BYTES + 1);
    let size = 0;
    while (size < buffer.length) {
      const count = fs.readSync(descriptor, buffer, size, buffer.length - size, null);
      if (!count) break;
      size += count;
    }
    if (size > MAX_POLICY_BYTES) return { status: "refused" };
    return { text: buffer.subarray(0, size).toString("utf8") };
  } finally { if (descriptor !== undefined) fs.closeSync(descriptor); }
}

function readPolicy(root) {
  let location;
  try { location = inspectPath(root); }
  catch (error) { return { status: error.code === "ENOENT" ? "missing" : "refused" }; }
  if (location.status) return location;
  let contents;
  try { contents = readBoundedFile(location); }
  catch { return { status: "refused" }; }
  if (contents.status) return contents;
  let value;
  try { value = JSON.parse(contents.text); }
  catch { return { status: "malformed" }; }
  return validatePolicy(value);
}

function report(root, vendor) {
  if (!VENDORS.includes(vendor)) throw new Error("invalid-vendor");
  const result = readPolicy(root);
  const selected = result.policy?.coordinators[vendor];
  const eligible = result.status === "valid" && Boolean(selected?.workers.length);
  const reason = result.status !== "valid" ? `policy-${result.status}`
    : !selected ? "coordinator-unconfigured" : !selected.workers.length ? "no-workers" : "policy-eligible";
  return { schemaVersion: 1, vendor, policyStatus: result.status, eligible, reason, route: "normal",
    dispatchReady: false, workers: eligible ? selected.workers : [], roles: eligible ? selected.roles : {},
    maxConcurrentWorkers: eligible ? result.policy.maxConcurrentWorkers : 0,
    maxRetriesPerTask: eligible ? result.policy.maxRetriesPerTask : 0 };
}

function cli(argv) {
  if (argv[0] !== "report") throw new Error("invalid-invocation");
  const options = { root: process.cwd(), json: false };
  const seen = new Set();
  for (let index = 1; index < argv.length; index++) {
    const flag = argv[index];
    if (!["--root", "--vendor", "--json"].includes(flag) || seen.has(flag)) throw new Error("invalid-invocation");
    seen.add(flag);
    if (flag === "--json") options.json = true;
    else {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error("invalid-invocation");
      options[flag.slice(2)] = value;
    }
  }
  const result = report(options.root, options.vendor);
  return options.json ? JSON.stringify(result, null, 2) : `Orca policy: ${result.reason}; normal workflow; dispatch disabled.`;
}

module.exports = { POLICY_FILE, MAX_POLICY_BYTES, VENDORS, validatePolicy, readPolicy, report };

if (require.main === module) {
  try { process.stdout.write(`${cli(process.argv.slice(2))}\n`); }
  catch { process.stderr.write("orca-policy: invalid invocation or internal failure\n"); process.exitCode = 1; }
}
