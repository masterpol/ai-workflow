const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

const { context, snapshot, readRegistry } = require("./skill-registry");
const { CATALOG } = require("./skill-defaults");

const ENTRY_ID = "vercel-labs/agent-browser/agent-browser";

function catalogEntry() {
  const found = CATALOG.defaults.find((item) => item.id === ENTRY_ID);
  if (!found) throw new Error(`Catalog is missing ${ENTRY_ID}`);
  return found;
}

// Presence-only check: the exact same pattern already proven in skill-sync.js's
// discoverFormatter. Never runs `npm i -g agent-browser` or `agent-browser install` — this is
// report-only, always.
function cliStatus() {
  try {
    execFileSync("agent-browser", ["--version"], { stdio: "ignore", timeout: 5000 });
    return "available";
  } catch {
    return "unavailable";
  }
}

// A missing CLI is a host capability fact, not a failure of this project's install state, so it
// takes priority over installed/enabled: without the CLI nothing here can run regardless of what
// the registry says. When the CLI is present, installed vs not-installed vs installed-but-
// disabled are reported distinctly, never collapsed into one another.
function overallStatus({ installed, enabled, cli }) {
  if (cli !== "available") return "unsupported";
  if (!installed) return "not-installed";
  if (enabled === false) return "installed-disabled";
  return "ready";
}

// Read-only: never installs the skill, never invokes the CLI's own install flow. A default this
// project hasn't installed, or whose CLI hasn't been set up on this host, is reported as an
// explicit status string — never as an error, and never silently reported as "installed".
function report(root) {
  root = fs.realpathSync(root);
  const entry = catalogEntry();
  let registry = { skills: {} };
  let registryError = null;
  try {
    const ctx = context(root, "project");
    if (snapshot(ctx, `${ctx.state}/transaction.json`)) registryError = "Interrupted skill transaction: run add-skill recover before trusting this report";
    else ({ registry } = readRegistry(ctx));
  } catch (error) {
    registryError = error.message;
  }
  const installedEntry = registry.skills[entry.id];
  const installed = Boolean(installedEntry);
  const enabled = installed ? installedEntry.enabled : null;
  const scope = installed ? installedEntry.scope : null;
  const cli = cliStatus();
  return {
    id: entry.id,
    purpose: entry.purpose,
    installed,
    enabled,
    scope,
    cli,
    status: overallStatus({ installed, enabled, cli }),
    registryError,
  };
}

function cli(argv) {
  const [action, ...rest] = argv;
  const options = { root: process.cwd() };
  for (let index = 0; index < rest.length; index++) {
    const arg = rest[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--root" && rest[index + 1]) options.root = rest[++index];
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (action === "report") {
    const result = report(options.root);
    if (options.json) return JSON.stringify(result, null, 2);
    const lines = [`${result.id}: ${result.status} (installed=${result.installed}, enabled=${result.enabled === null ? "n/a" : result.enabled}, cli=${result.cli})`];
    if (result.registryError) lines.push(`registry: ${result.registryError}`);
    return lines.join("\n");
  }
  throw new Error("Usage: node ai-framework/scripts/browser-runtime.js report [--root /absolute/project] [--json]");
}

module.exports = { ENTRY_ID, report };

if (require.main === module) {
  try {
    process.stdout.write(`${cli(process.argv.slice(2))}\n`);
  } catch (error) { process.stderr.write(`browser-runtime: ${error.message}\n`); process.exitCode = 1; }
}
