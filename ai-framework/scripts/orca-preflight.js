const fs = require("node:fs");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { spawnSync } = require("node:child_process");

const { report: policyReport } = require("./orca-policy");

const MAX_OUTPUT_BYTES = 256 * 1024;
const CALL_TIMEOUT_MS = 5000;
const TOTAL_TIMEOUT_MS = 20000;
const SUPPORTED_VERSION = "1.4.222";
const CALLS = Object.freeze({
  cliGuide: ["skills", "get", "orca-cli", "--json"],
  orchestrationGuide: ["skills", "get", "orchestration", "--json"],
  status: ["status", "--json"],
});

function selectExecutable(env, platform) {
  if (env.ORCA_CLI_COMMAND) {
    const command = env.ORCA_CLI_COMMAND;
    // Paths may contain spaces, but an override is never interpreted as command text.
    if (typeof command !== "string" || command.length > 4096 || /[\0\r\n]/.test(command)) return null;
    if (!path.isAbsolute(command) && !/^(?!\.+$)[a-zA-Z0-9._-]+$/.test(command)) return null;
    return command;
  }
  if (env.ORCA_DEV_REPO_ROOT) return "orca-dev";
  if (platform === "linux" && !env.ORCA_TERMINAL_HANDLE && !env.ORCA_AGENT_SESSION_ID) return "orca-ide";
  return ["darwin", "linux", "win32"].includes(platform) ? "orca" : null;
}

// Absolute PATH entries only, so an empty or relative entry cannot resolve to a file inside the inspected repo.
const absolutePathEntries = (env) => (env.PATH || "").split(path.delimiter).filter((directory) => path.isAbsolute(directory)).slice(0, 64);

function executablePresent(command, env, platform) {
  const extensions = platform === "win32" ? ["", ".exe"] : [""];
  const directories = path.isAbsolute(command) ? [""] : absolutePathEntries(env);
  for (const directory of directories) for (const extension of extensions) {
    const file = directory ? path.join(directory, `${command}${extension}`) : `${command}${extension}`;
    try {
      if (!fs.statSync(file).isFile()) continue;
      fs.accessSync(file, platform === "win32" ? fs.constants.F_OK : fs.constants.X_OK);
      return true;
    } catch { /* Missing or inaccessible executables are unavailable, never an install request. */ }
  }
  return false;
}

function readReceipt(command, args, context) {
  const remaining = TOTAL_TIMEOUT_MS - (context.now() - context.started);
  if (remaining < 1) return { reason: "probe-time-budget" };
  let receipt;
  try {
    receipt = context.run(command, [...args], { cwd: context.root, env: context.env, shell: false,
      encoding: "utf8", timeout: Math.min(CALL_TIMEOUT_MS, Math.floor(remaining)),
      maxBuffer: MAX_OUTPUT_BYTES, killSignal: "SIGKILL", windowsHide: true });
  } catch { return { reason: "probe-failed" }; }
  if (!receipt || typeof receipt.stdout !== "string" || typeof receipt.stderr !== "string") return { reason: "probe-invalid-output" };
  if (Buffer.byteLength(receipt.stdout) > MAX_OUTPUT_BYTES || Buffer.byteLength(receipt.stderr) > MAX_OUTPUT_BYTES) return { reason: "probe-output-limit" };
  if (receipt.error) return { reason: receipt.error.code === "ETIMEDOUT" ? "probe-timeout"
    : receipt.error.code === "ENOBUFS" ? "probe-output-limit" : "probe-failed" };
  if (receipt.status !== 0 || receipt.signal || context.now() - context.started >= TOTAL_TIMEOUT_MS) return { reason: "probe-failed" };
  try { return { value: JSON.parse(receipt.stdout) }; }
  catch { return { reason: "probe-invalid-output" }; }
}

function verifyGuide(value, name, markers) {
  return value?.name === name && typeof value.markdown === "string"
    && markers.every((marker) => value.markdown.includes(marker));
}

function inspectRuntime(command, context) {
  const cli = readReceipt(command, CALLS.cliGuide, context);
  if (cli.reason) return { reason: cli.reason };
  if (!verifyGuide(cli.value, "orca-cli", ["worktree current", "terminal"])) return { reason: "cli-guide-unsupported" };
  const guide = readReceipt(command, CALLS.orchestrationGuide, context);
  if (guide.reason) return { reason: guide.reason };
  if (!verifyGuide(guide.value, "orchestration", ["worker-start", "worker_done", "orchestration check"])) return { reason: "orchestration-guide-unsupported" };
  const status = readReceipt(command, CALLS.status, context);
  if (status.reason) return { reason: status.reason };
  const result = status.value?.ok === true ? status.value.result : null;
  if (!result || result.target?.kind !== "local") return { reason: "runtime-unverified" };
  if (result.runtime?.reachable !== true || result.runtime.state !== "ready") return { reason: "runtime-unreachable" };
  if (result.runtime.appVersion !== SUPPORTED_VERSION) return { reason: "runtime-version-unsupported" };
  if (result.caller?.live !== true || typeof result.caller.orcaSessionId !== "string"
    || !context.env.ORCA_AGENT_SESSION_ID || result.caller.orcaSessionId !== context.env.ORCA_AGENT_SESSION_ID) return { reason: "caller-unverified" };
  // The pinned status contract does not advertise an enabled orchestration field or validate
  // all worker capabilities. A matching live caller is evidence, never launch authority.
  return { reason: "orchestration-unverified", session: "verified", capabilities: "documented",
    version: SUPPORTED_VERSION };
}

function report(root, vendor, options = {}) {
  const policy = policyReport(root, vendor);
  const result = { ...policy, role: options.workerContext ? "worker" : "coordinator", candidate: false,
    runtime: "not-checked", session: "unverified", orchestration: "unverified", capabilities: "unverified",
    authentication: "unverified", vendors: {} };
  // This guard precedes even reading PATH or selecting an Orca executable.
  if (options.workerContext) return { ...result, eligible: false, reason: "worker-context" };
  if (!policy.eligible) return result;
  const env = options.env || process.env;
  const platform = options.platform || process.platform;
  const present = options.present || executablePresent;
  const command = selectExecutable(env, platform);
  if (!command) return { ...result, reason: "executable-selection-unsupported" };
  if (!present(command, env, platform)) return { ...result, reason: "orca-unavailable" };
  result.vendors = Object.fromEntries(policy.workers.map((worker) => [worker, present(worker, env, platform) ? "present" : "unavailable"]));
  if (!Object.values(result.vendors).includes("present")) return { ...result, reason: "no-available-workers" };
  result.candidate = true;
  if (!options.probe) return { ...result, reason: "runtime-not-probed" };
  const now = options.now || (() => performance.now());
  const context = { root: fs.realpathSync(root), env: { ...env, PATH: absolutePathEntries(env).join(path.delimiter) }, run: options.run || spawnSync, now, started: now() };
  const runtime = inspectRuntime(command, context);
  return { ...result, reason: runtime.reason, runtime: runtime.session ? "reachable" : "unverified",
    session: runtime.session || "unverified", capabilities: runtime.capabilities || "unverified",
    ...(runtime.version ? { runtimeVersion: runtime.version } : {}) };
}

function cli(argv) {
  if (argv[0] !== "report") throw new Error("invalid-invocation");
  const options = { root: process.cwd(), json: false };
  const seen = new Set();
  for (let index = 1; index < argv.length; index++) {
    const flag = argv[index];
    if (!["--root", "--vendor", "--json", "--probe", "--worker-context"].includes(flag) || seen.has(flag)) throw new Error("invalid-invocation");
    seen.add(flag);
    if (["--json", "--probe", "--worker-context"].includes(flag)) options[flag === "--worker-context" ? "workerContext" : flag.slice(2)] = true;
    else {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error("invalid-invocation");
      options[flag.slice(2)] = value;
    }
  }
  const result = report(options.root, options.vendor, options);
  return options.json ? JSON.stringify(result, null, 2) : `Orca preflight: ${result.reason}; normal workflow; dispatch disabled.`;
}

module.exports = { MAX_OUTPUT_BYTES, CALL_TIMEOUT_MS, TOTAL_TIMEOUT_MS, SUPPORTED_VERSION,
  selectExecutable, executablePresent, report };

if (require.main === module) {
  try { process.stdout.write(`${cli(process.argv.slice(2))}\n`); }
  catch { process.stderr.write("orca-preflight: invalid invocation or internal failure\n"); process.exitCode = 1; }
}
