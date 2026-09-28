const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const { discoverVendors, adapters } = require("./skill-vendors");
const { context, digest, json, snapshot, readRegistry, transact, resolveFile } = require("./skill-registry");

// Registry-owned paths must never be misclassified as "removed upstream" by bundle-sync's
// canonical-directory comparison, nor pruned. An unreadable/invalid registry protects nothing
// here; reconcile() below is the one that surfaces that incompatibility loudly.
function ownedPaths(root) {
  try {
    const ctx = context(fs.realpathSync(root), "project");
    const { registry } = readRegistry(ctx);
    const owned = new Set();
    for (const entry of Object.values(registry.skills)) for (const file of Object.keys(entry.owned)) owned.add(file.toLowerCase());
    return owned;
  } catch {
    return new Set();
  }
}

const CONFIG_NAMES = [".prettierrc", ".prettierrc.json", ".prettierrc.yaml", ".prettierrc.yml", ".prettierrc.json5", ".prettierrc.js", ".prettierrc.cjs", ".prettierrc.mjs", "prettier.config.js", "prettier.config.cjs", "prettier.config.mjs"];
const FORMATTABLE = /\.(md|markdown|json|ya?ml|jsx?|cjs|mjs)$/i;

// Discover a formatter from the receiving project's OWN configuration; never introduce one.
// node_modules/.bin is checked before a global PATH lookup so a project's pinned version (or a
// test fixture's fake binary) always wins over whatever happens to be globally installed.
function discoverFormatter(root) {
  let configPath = CONFIG_NAMES.map((name) => path.join(root, name)).find((candidate) => fs.existsSync(candidate));
  if (!configPath) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
      if (pkg && Object.hasOwn(pkg, "prettier")) configPath = path.join(root, "package.json");
    } catch {
      // No root package.json, or invalid JSON: no formatter configured.
    }
  }
  if (!configPath) return null;
  const local = path.join(root, "node_modules/.bin/prettier");
  let bin = null;
  if (fs.existsSync(local)) bin = local;
  else {
    try { execFileSync("prettier", ["--version"], { stdio: "ignore" }); bin = "prettier"; } catch {
      // Configured but not installed: report nothing to format rather than fail an install.
    }
  }
  return bin ? { bin, configPath, label: "prettier" } : null;
}

// Formats only the files `include` selects, in a scratch directory so preview (no --apply)
// never touches the target project. Throws on formatter failure so the caller aborts before
// any write — nothing has been committed yet, so there is nothing to roll back.
function formatFiles(root, files, include = () => true) {
  const formatter = discoverFormatter(root);
  const targets = Object.keys(files).filter((file) => include(file) && FORMATTABLE.test(file));
  if (!formatter || !targets.length) return { formatter: null, files, changed: [] };
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "skill-format-"));
  try {
    const scratchPaths = targets.map((file) => path.join(scratch, file));
    targets.forEach((file, index) => {
      fs.mkdirSync(path.dirname(scratchPaths[index]), { recursive: true });
      fs.writeFileSync(scratchPaths[index], files[file].data);
    });
    try {
      execFileSync(formatter.bin, ["--config", formatter.configPath, "--write", ...scratchPaths], { stdio: ["ignore", "ignore", "pipe"], timeout: 30000 });
    } catch (error) {
      throw new Error(`Formatter failed (${formatter.label}): ${(error.stderr?.toString() || error.message).trim()}`);
    }
    const updated = { ...files };
    const changed = [];
    targets.forEach((file, index) => {
      const data = fs.readFileSync(scratchPaths[index]);
      if (!data.equals(files[file].data)) { updated[file] = { ...files[file], data }; changed.push(file); }
    });
    return { formatter: formatter.label, files: updated, changed };
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

function checkCollisions(project, ctx, entry, files) {
  for (const target of Object.keys(files).filter((file) => !file.startsWith(`${ctx.state}/`))) {
    if (entry.owned[target]) continue;
    const directory = resolveFile(ctx, path.posix.dirname(target));
    if (fs.existsSync(directory) && fs.readdirSync(directory).length) throw new Error(`Existing skill directory is not owned: ${target}`);
  }
}

// Re-renders only vendor wrapper files for one entry against the CURRENT vendor descriptors and
// wrapper template. Package content is read back unchanged, never re-fetched or re-formatted:
// reconciliation is a local metadata operation, not a source update.
function reconcileEntry(project, ctx, entry, vendors) {
  const rendered = adapters(vendors, entry.scope, entry.name, entry.packagePath, entry.description, entry.phases, entry.enabled);
  const files = {};
  for (const file of Object.keys(entry.owned).filter((item) => item.startsWith(`${entry.packagePath}/`))) {
    const current = snapshot(ctx, file);
    if (!current) throw new Error(`Missing owned file: ${file}`);
    files[file] = { data: Buffer.from(current.data, "base64"), mode: current.mode };
  }
  Object.assign(files, rendered.files);
  if (fs.existsSync(path.join(project, ".claude/skills", entry.name, "SKILL.md")) && !entry.owned[`.claude/skills/${entry.name}/SKILL.md`]) throw new Error(`Reserved workflow skill name: ${entry.name}`);
  checkCollisions(project, ctx, entry, files);
  const updated = {
    ...entry, adapters: rendered.paths,
    owned: Object.fromEntries(Object.entries(files).map(([file, value]) => [file, { hash: digest(value.data), sourceHash: entry.owned[file]?.sourceHash ?? digest(value.data), mode: value.mode }])),
  };
  return { updated, files };
}

// Reconciles every installed project-scope skill's vendor coverage against the vendor
// descriptors and wrapper template currently on disk (i.e. whatever bundle-sync or setup just
// synced). Global registries are never read or written here. A modified owned file, an
// unresolved vendor layout, or an invalid/incompatible registry blocks that skill (or the whole
// run) rather than silently overwriting or skipping it.
function reconcile(root, options = {}) {
  const project = fs.realpathSync(root);
  if (!fs.existsSync(path.join(project, ".project"))) return { status: "not-installed", skills: [] };
  const ctx = context(project, "project");
  if (snapshot(ctx, `${ctx.state}/transaction.json`)) return { status: "pending-transaction", skills: [] };
  let registry, stored;
  try {
    ({ registry, stored } = readRegistry(ctx));
  } catch (error) {
    return { status: "incompatible", error: error.message, skills: [] };
  }
  if (!Object.keys(registry.skills).length) return { status: "clean", skills: [] };
  let vendors;
  try {
    vendors = discoverVendors(project);
  } catch (error) {
    return { status: "coverage-unresolved", error: error.message, skills: [] };
  }
  const results = [];
  const operations = [];
  let nextRegistry = null;
  for (const [id, entry] of Object.entries(registry.skills)) {
    const rendered = adapters(vendors, entry.scope, entry.name, entry.packagePath, entry.description, entry.phases, entry.enabled);
    const drift = vendors.filter((vendor) => entry.adapters[vendor.id] !== rendered.paths[vendor.id]).map((vendor) => vendor.id);
    if (!drift.length) { results.push({ id, status: "current" }); continue; }
    const edited = Object.entries(entry.owned).some(([file, owned]) => {
      const current = snapshot(ctx, file);
      return !current || current.hash !== owned.hash || current.mode !== owned.mode;
    });
    if (edited) { results.push({ id, status: "conflict", vendors: drift }); continue; }
    if (!options.apply) { results.push({ id, status: "needs-reconciliation", vendors: drift }); continue; }
    try {
      const { updated, files } = reconcileEntry(project, ctx, entry, vendors);
      if (!nextRegistry) nextRegistry = structuredClone(registry);
      nextRegistry.skills[id] = updated;
      for (const [file, value] of Object.entries(files)) {
        const current = snapshot(ctx, file);
        if (current?.hash === digest(value.data) && current.mode === value.mode) continue;
        operations.push({ path: file, expected: current?.hash || null, expectedMode: current?.mode || null, value });
      }
      results.push({ id, status: "reconciled", vendors: drift });
    } catch (error) {
      results.push({ id, status: "conflict", vendors: drift, error: error.message });
    }
  }
  if (options.apply && nextRegistry) {
    const data = json(nextRegistry);
    if (!stored || stored.hash !== digest(data)) operations.push({ path: ctx.registry, expected: stored?.hash || null, expectedMode: stored?.mode || null, value: { data, mode: 0o644 } });
    if (operations.length) transact(ctx, operations);
  }
  const status = results.some((item) => item.status === "conflict")
    ? "conflict"
    : results.some((item) => item.status === "needs-reconciliation")
      ? "needs-reconciliation"
      : "clean";
  return { status, skills: results, applied: Boolean(options.apply && operations.length) };
}

module.exports = { ownedPaths, discoverFormatter, formatFiles, reconcile };

if (require.main === module) {
  const [action, ...rest] = process.argv.slice(2);
  const options = { root: process.cwd(), apply: false, json: false };
  try {
    for (let index = 0; index < rest.length; index++) {
      if (rest[index] === "--apply") options.apply = true;
      else if (rest[index] === "--json") options.json = true;
      else if (rest[index] === "--root" && rest[index + 1]) options.root = rest[++index];
      else throw new Error(`Unknown option: ${rest[index]}`);
    }
    if (action !== "reconcile") throw new Error("Usage: node ai-framework/scripts/skill-sync.js reconcile [--root /absolute/project] [--apply] [--json]");
    const result = reconcile(options.root, options);
    process.stdout.write(options.json ? `${JSON.stringify(result, null, 2)}\n` : `${result.status}: ${result.skills.map((item) => `${item.id} (${item.status})`).join(", ") || "no installed skills"}\n`);
    process.exitCode = ["conflict", "incompatible", "coverage-unresolved", "pending-transaction"].includes(result.status) ? 1 : 0;
  } catch (error) { process.stderr.write(`skill-sync: ${error.message}\n`); process.exitCode = 1; }
}
