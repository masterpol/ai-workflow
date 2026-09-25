const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const { context, snapshot, readRegistry } = require("./skill-registry");

const CATALOG = require("../integrations/skill-defaults.json");
// Kept explicit rather than derived from the catalog so a malformed catalog entry can never
// silently widen what resolveMode() accepts; a test cross-checks this set against the catalog.
const MODES = new Set(["lite", "full", "ultra", "wenyan-lite", "wenyan-full", "wenyan-ultra"]);
const PHASES = new Set(["shape", "critique", "plan", "build", "audit", "ship", "cooldown"]);
const MODES_FILE = ".project/skills/modes.json";

function record(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }

// lstat on the leaf alone only catches modes.json itself being a symlink — an ancestor
// directory (e.g. .project/skills/) being a symlink would still resolve through it undetected.
// Resolving the real path and confirming it stays under the real project root (the same
// pattern bundle-sync.js's isSafeProjectPath already uses for exactly this reason) catches both.
function loadModes(root) {
  const full = path.join(root, MODES_FILE);
  if (!fs.existsSync(full)) return null;
  const realRoot = fs.realpathSync(root);
  const realFull = fs.realpathSync(full);
  const relative = path.relative(realRoot, realFull);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Mode state file resolves outside the project root");
  const value = JSON.parse(fs.readFileSync(full, "utf8"));
  if (!record(value) || value.schemaVersion !== 1) throw new Error("Unsupported or invalid mode state schema");
  const caveman = value.caveman;
  if (caveman !== undefined) {
    if (!record(caveman)) throw new Error("Invalid caveman mode state");
    if (caveman.enabled !== undefined && typeof caveman.enabled !== "boolean") throw new Error("caveman.enabled must be boolean");
    if (caveman.default !== undefined && !MODES.has(caveman.default)) throw new Error(`Invalid caveman.default: ${caveman.default}`);
    if (caveman.phases !== undefined) {
      if (!record(caveman.phases)) throw new Error("caveman.phases must be an object");
      for (const [phase, mode] of Object.entries(caveman.phases)) {
        if (!PHASES.has(phase)) throw new Error(`Unknown phase in caveman.phases: ${phase}`);
        if (!MODES.has(mode)) throw new Error(`Invalid mode for phase ${phase}: ${mode}`);
      }
    }
  }
  return value;
}

// invocationArg is scoped to this one call (and whatever it dispatches) and is never persisted;
// only an explicit modes.json edit (caveman.enabled/default/phases) persists across invocations.
function resolveMode(root, { phase, invocationArg } = {}) {
  if (!PHASES.has(phase)) throw new Error(`Unknown phase: ${phase}`);
  if (invocationArg !== undefined) {
    if (invocationArg !== "off" && !MODES.has(invocationArg)) throw new Error(`Choose --arg explicitly from ${[...MODES, "off"].join(",")}`);
    return invocationArg;
  }
  const modes = loadModes(root);
  const caveman = modes?.caveman || {};
  if (caveman.enabled === false) return "off";
  if (caveman.phases?.[phase]) return caveman.phases[phase];
  if (caveman.default) return caveman.default;
  return CATALOG.defaults.find((entry) => entry.id.endsWith("/caveman")).defaultMode;
}

function runtimeStatus(entry) {
  if (!entry.runtime) return null;
  try {
    execFileSync(entry.runtime.check[0], entry.runtime.check.slice(1), { stdio: "ignore", timeout: 5000 });
    return "available";
  } catch {
    return "unavailable";
  }
}

// Read-only: never installs, never mutates the registry. A default this project hasn't
// installed is reported "not-installed", not an error — installation stays an explicit,
// separate /add-skill action.
function report(root) {
  root = fs.realpathSync(root);
  let registry = { skills: {} };
  let registryError = null;
  try {
    const ctx = context(root, "project");
    if (snapshot(ctx, `${ctx.state}/transaction.json`)) registryError = "Interrupted skill transaction: run add-skill recover before trusting this report";
    else ({ registry } = readRegistry(ctx));
  } catch (error) {
    registryError = error.message;
  }
  const defaults = CATALOG.defaults.map((entry) => {
    const installed = registry.skills[entry.id];
    return {
      id: entry.id,
      purpose: entry.purpose,
      installed: Boolean(installed),
      enabled: installed ? installed.enabled : null,
      scope: installed ? installed.scope : null,
      runtime: runtimeStatus(entry),
    };
  });
  return { registryError, defaults };
}

function cli(argv) {
  const [action, ...rest] = argv;
  const options = { root: process.cwd() };
  for (let index = 0; index < rest.length; index++) {
    const arg = rest[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--root" && rest[index + 1]) options.root = rest[++index];
    else if (arg === "--phase" && rest[index + 1]) options.phase = rest[++index];
    else if (arg === "--arg" && rest[index + 1]) options.arg = rest[++index];
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (action === "resolve-mode") {
    const mode = resolveMode(options.root, { phase: options.phase, invocationArg: options.arg });
    return options.json ? JSON.stringify({ phase: options.phase, mode }, null, 2) : mode;
  }
  if (action === "report") {
    const result = report(options.root);
    if (options.json) return JSON.stringify(result, null, 2);
    const lines = result.defaults.map((entry) => `${entry.id}: ${entry.installed ? `installed (${entry.enabled ? "enabled" : "disabled"}, ${entry.scope})` : "not installed"}${entry.runtime ? `, runtime ${entry.runtime}` : ""}`);
    if (result.registryError) lines.push(`registry: ${result.registryError}`);
    return lines.join("\n");
  }
  throw new Error("Usage: node ai-framework/scripts/skill-defaults.js <resolve-mode --phase P [--arg V] | report> [--root /absolute/project] [--json]");
}

module.exports = { CATALOG, MODES, PHASES, resolveMode, report, loadModes };

if (require.main === module) {
  try {
    process.stdout.write(`${cli(process.argv.slice(2))}\n`);
  } catch (error) { process.stderr.write(`skill-defaults: ${error.message}\n`); process.exitCode = 1; }
}
