const fs = require("node:fs");
const path = require("node:path");

const defaults = require("../integrations/skill-vendors.json");
const { safeRelative } = require("./skill-source");
const { context, resolveFile, snapshot, readRegistry } = require("./skill-registry");

function discoverVendors(project) {
  const config = resolveFile({ roots: { target: project } }, ".project/skills/vendors.json");
  let local = { schemaVersion: 1, vendors: [] };
  if (fs.existsSync(config)) {
    if (fs.lstatSync(config).isSymbolicLink()) throw new Error("Vendor config cannot be a symlink");
    local = JSON.parse(fs.readFileSync(config, "utf8"));
  }
  if (local.schemaVersion !== 1 || !Array.isArray(local.vendors)) throw new Error("Unsupported vendor descriptor schema");
  const combined = new Map(defaults.vendors.map((vendor) => [vendor.id, vendor]));
  const localIds = new Set();
  for (const vendor of local.vendors) {
    if (!vendor || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(vendor.id) || localIds.has(vendor.id)) throw new Error("Invalid or duplicate vendor id");
    localIds.add(vendor.id);
    combined.set(vendor.id, vendor);
  }
  const active = [];
  for (const vendor of combined.values()) {
    if (!Array.isArray(vendor.detect) || !vendor.detect.length || vendor.detect.some((item) => typeof item !== "string")) throw new Error(`Missing detection paths for ${vendor.id}`);
    vendor.detect.forEach(safeRelative);
    safeRelative(vendor.project);
    if (vendor.global !== null) safeRelative(vendor.global);
    if (localIds.has(vendor.id) || vendor.detect.some((item) => fs.existsSync(path.join(project, item)))) active.push(vendor);
  }
  // A new native skills directory is evidence of a project vendor, even without a descriptor.
  const known = new Set([...combined.values()].flatMap((vendor) => [vendor.project.split("/")[0], ...vendor.detect.map((item) => item.split("/")[0])]));
  for (const entry of fs.readdirSync(project, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith(".") && !known.has(entry.name) && entry.name !== ".project" && fs.existsSync(path.join(project, entry.name, "skills"))) throw new Error(`Unregistered project vendor: ${entry.name}; add a vendor descriptor`);
  }
  if (!active.length) throw new Error("No project vendors found; register project vendors before installation");
  return active;
}

function adapters(vendors, scope, name, packagePath, description, phases, enabled) {
  const files = {};
  const paths = {};
  for (const vendor of vendors) {
    const directory = vendor[scope];
    if (!directory) throw new Error(`${vendor.id} does not support ${scope} scope; choose a supported scope`);
    const target = safeRelative(`${directory}/${name}/SKILL.md`);
    // Identical destinations are shared; never overwrite with a second divergent wrapper.
    const existing = Object.keys(files).find((key) => key.toLowerCase() === target.toLowerCase());
    if (existing && existing !== target) throw new Error(`Case-colliding vendor destination: ${target}`);
    paths[vendor.id] = target;
    const source = path.posix.relative(path.posix.dirname(target), `${packagePath}/SKILL.md`);
    const body = enabled
      ? `Use only in these workflow phases: ${phases.join(", ")}. Outside these phases, do not activate automatically.\n\nLoad [the installed skill](${source}) and follow it for the selected task. Resolve its scripts and resources relative to that source file, not this wrapper. Respect host instructions and workflow gates.\n`
      : "This skill is disabled in the workflow registry. Do not load or execute it.\n";
    files[target] = { data: Buffer.from(`---\nname: ${name}\ndescription: ${JSON.stringify(enabled ? description : "Disabled workflow skill; do not activate.")}\n---\n\n${body}`), mode: 0o644 };
  }
  return { files, paths };
}

// Doctor view of registry-managed skills. External wrappers lack workflow profiles by design, so
// they are validated against registry ownership and vendor coverage instead of canonical rules.
function externalSkillReport(project) {
  const results = [];
  const managed = new Set();
  const add = (status, name, detail) => results.push({ status, name, detail });
  const ctx = context(project, "project");
  let registry;
  try {
    if (snapshot(ctx, `${ctx.state}/transaction.json`)) add("fail", ctx.state, "interrupted skill transaction; run add-skill recover --scope project --apply");
    if (!snapshot(ctx, ctx.registry)) return { managed, results };
    ({ registry } = readRegistry(ctx));
  } catch (error) {
    add("fail", ctx.registry, error.message);
    return { managed, results };
  }
  let vendors = null;
  try { vendors = discoverVendors(project); } catch (error) { add("fail", "Skill vendors", `coverage unresolved: ${error.message}`); }
  for (const entry of Object.values(registry.skills)) {
    managed.add(entry.name);
    const problems = [];
    const edited = [];
    for (const [file, owned] of Object.entries(entry.owned)) {
      const current = snapshot(ctx, file);
      if (!current) problems.push(`missing owned file ${file}`);
      else if (current.hash !== owned.hash || current.mode !== owned.mode) edited.push(file);
    }
    if (!Object.hasOwn(entry.owned, `${entry.packagePath}/SKILL.md`)) problems.push("package has no SKILL.md");
    for (const vendor of vendors || []) {
      const expected = `${vendor.project}/${entry.name}/SKILL.md`;
      if (!entry.adapters[vendor.id]) problems.push(`not activated for ${vendor.id}; run add-skill update`);
      else if (entry.adapters[vendor.id] !== expected) problems.push(`${vendor.id} adapter ${entry.adapters[vendor.id]} differs from descriptor path ${expected}; run add-skill update`);
    }
    for (const target of new Set(Object.values(entry.adapters))) {
      const current = snapshot(ctx, target);
      if (!current) continue;
      const text = Buffer.from(current.data, "base64").toString();
      const link = text.match(/\[the installed skill\]\(([^)]+)\)/)?.[1];
      if (entry.enabled && (!link || path.posix.join(path.posix.dirname(target), link) !== `${entry.packagePath}/SKILL.md`)) problems.push(`${target} does not load ${entry.packagePath}/SKILL.md`);
      if (entry.enabled && !text.includes(`workflow phases: ${entry.phases.join(", ")}.`)) problems.push(`${target} phases differ from registry`);
      if (!entry.enabled && !/disabled in the workflow registry/.test(text)) problems.push(`${target} is active but registry says disabled`);
    }
    if (problems.length) add("fail", `Skill ${entry.id}`, problems.join("; "));
    else add("pass", `Skill ${entry.id}`, `${entry.enabled ? "enabled" : "disabled"} for ${Object.keys(entry.adapters).sort().join(", ")}; phases ${entry.phases.join(", ")}; runtime ${entry.runtime?.status || "unverified"}`);
    if (edited.length) add("warn", `Skill ${entry.id}`, `locally modified owned file(s): ${edited.join(", ")}; update and remove will stop until resolved`);
  }
  try {
    const links = snapshot(ctx, ".project/skills/global.json");
    if (links) add("info", ".project/skills/global.json", `${JSON.parse(Buffer.from(links.data, "base64").toString()).locations.length} global location(s) linked; validate them with add-skill list --scope global`);
  } catch (error) { add("fail", ".project/skills/global.json", error.message); }
  return { managed, results };
}

function listFiles(root, relative) {
  const directory = path.join(root, relative);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.name !== ".DS_Store").flatMap((entry) => {
    const child = `${relative}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Symlink in canonical source: ${child}`);
    return entry.isDirectory() ? listFiles(root, child) : [child];
  });
}

// Cursor reads the same format as Claude Code, so its mirrors are byte copies of canonical files.
// Only missing mirrors are written; a differing file is reported, never overwritten.
function cursorMirrors(project, options = {}) {
  project = fs.realpathSync(project);
  const ctx = { roots: { target: project } };
  const { managed, results } = externalSkillReport(project);
  // An unreadable registry would let external wrappers masquerade as canonical skills.
  const blocked = results.find((result) => result.status === "fail" && [".project/skills", ".project/skills/registry.json"].includes(result.name));
  if (blocked) throw new Error(`Resolve ${blocked.name} before mirroring: ${blocked.detail}`);
  const skills = fs.existsSync(path.join(project, ".claude/skills")) ? fs.readdirSync(path.join(project, ".claude/skills"), { withFileTypes: true }).filter((entry) => entry.isDirectory() && !managed.has(entry.name)).map((entry) => entry.name) : [];
  const sources = [...skills.flatMap((name) => listFiles(project, `.claude/skills/${name}`)), ...listFiles(project, ".claude/agents").filter((file) => file.endsWith(".md"))];
  const report = { created: [], differs: [], current: 0, applied: Boolean(options.apply) };
  for (const source of sources.sort()) {
    const target = source.replace(/^\.claude\//, ".cursor/");
    const destination = resolveFile(ctx, target);
    const data = fs.readFileSync(resolveFile(ctx, source));
    if (!fs.existsSync(destination)) {
      report.created.push(target);
      if (!options.apply) continue;
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, data, { flag: "wx", mode: fs.statSync(path.join(project, source)).mode & 0o777 });
    } else if (fs.readFileSync(destination).equals(data)) report.current++;
    else report.differs.push(target);
  }
  return report;
}

module.exports = { discoverVendors, adapters, externalSkillReport, cursorMirrors };

if (require.main === module) {
  const [action, ...rest] = process.argv.slice(2);
  const options = { root: process.cwd(), apply: false };
  try {
    for (let index = 0; index < rest.length; index++) {
      if (rest[index] === "--apply") options.apply = true;
      else if (rest[index] === "--root" && rest[index + 1]) options.root = rest[++index];
      else throw new Error(`Unknown option: ${rest[index]}`);
    }
    if (action !== "cursor-mirrors") throw new Error("Usage: node ai-framework/scripts/skill-vendors.js cursor-mirrors [--root /absolute/project] [--apply]");
    process.stdout.write(`${JSON.stringify(cursorMirrors(options.root, options), null, 2)}\n`);
  } catch (error) { process.stderr.write(`skill-vendors: ${error.message}\n`); process.exitCode = 1; }
}
