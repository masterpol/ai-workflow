#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const { identity, inspectSource } = require("./skill-source");
const { discoverVendors, adapters } = require("./skill-vendors");
const { context, digest, json, snapshot, readRegistry, transact, recover, resolveFile } = require("./skill-registry");
const { formatFiles } = require("./skill-sync");

const PHASES = new Set(["shape", "critique", "plan", "build", "audit", "ship", "cooldown", "manual"]);

function phases(value) {
  const selected = typeof value === "string" ? value.split(",") : value;
  if (!Array.isArray(selected) || !selected.length || selected.some((phase) => !PHASES.has(phase)) || new Set(selected).size !== selected.length) throw new Error(`Choose --phases explicitly from ${[...PHASES].join(",")}`);
  return selected;
}

function makeEntry(source, ctx, vendors, selectedPhases, enabled) {
  const packagePath = `${ctx.state}/packages/${source.id}`;
  const rendered = adapters(vendors, ctx.scope, source.name, packagePath, source.description, selectedPhases, enabled);
  const files = { ...rendered.files };
  for (const [relative, value] of Object.entries(source.files)) files[`${packagePath}/${relative}`] = value;
  if (source.license && !source.files["UPSTREAM-LICENSE.txt"]) files[`${packagePath}/UPSTREAM-LICENSE.txt`] = { data: Buffer.from(source.license.text), mode: 0o644 };
  // Upstream package content only, never the generated wrapper templates: formatting a wrapper
  // could fight its exact activation-instruction text. sourceHash freezes the pre-format
  // upstream digest; hash becomes the formatted baseline actually written and re-verified.
  const sourceHashes = Object.fromEntries(Object.keys(files).map((file) => [file, digest(files[file].data)]));
  const { formatter, files: formatted, changed } = formatFiles(ctx.roots.target, files, (file) => file.startsWith(`${packagePath}/`) && file !== `${packagePath}/UPSTREAM-LICENSE.txt`);
  const entry = {
    id: source.id, name: source.name, description: source.description, scope: ctx.scope,
    source: { url: source.url, revision: source.revision, path: source.sourcePath },
    license: source.license ? { status: "present", sourcePath: source.license.path } : { status: "not-found" },
    enabled, phases: selectedPhases, packagePath, adapters: rendered.paths,
    runtime: { status: "unverified", note: "Inspect upstream instructions for prerequisites before execution" },
    owned: Object.fromEntries(Object.entries(formatted).map(([file, value]) => [file, { hash: digest(value.data), sourceHash: sourceHashes[file], mode: value.mode }])),
  };
  if (formatter) entry.formatting = { tool: formatter, changed };
  return { entry, files: formatted };
}

function operationsFor(ctx, oldEntry, files, registry, stored) {
  const operations = [];
  const owned = oldEntry?.owned || {};
  for (const file of new Set([...Object.keys(owned), ...Object.keys(files)])) {
    const current = snapshot(ctx, file);
    if (owned[file]) {
      if (current?.hash !== owned[file].hash || current.mode !== owned[file].mode) throw new Error(`Local modification or missing owned file: ${file}`);
    } else if (current) throw new Error(`Unowned destination collision: ${file}`);
    const value = files[file] || null;
    if (value && current?.hash === digest(value.data) && current.mode === value.mode) continue;
    operations.push({ path: file, expected: current?.hash || null, expectedMode: current?.mode || null, value });
  }
  const data = json(registry);
  if (!stored || stored.hash !== digest(data)) operations.push({ path: ctx.registry, expected: stored?.hash || null, expectedMode: stored?.mode || null, value: { data, mode: 0o644 } });
  return operations;
}

function checkNamespace(project, ctx, name, previous, files) {
  const canonical = path.join(project, ".claude/skills", name, "SKILL.md");
  if (fs.existsSync(canonical) && !(ctx.scope === "project" && previous?.owned[`.claude/skills/${name}/SKILL.md`])) throw new Error(`Reserved workflow skill name: ${name}`);
  for (const target of Object.keys(files).filter((file) => !file.startsWith(`${ctx.state}/`))) {
    const directory = resolveFile(ctx, path.posix.dirname(target));
    if (!previous?.owned[target] && fs.existsSync(directory) && fs.readdirSync(directory).length) throw new Error(`Existing skill directory is not owned: ${target}`);
  }
}

function globalLink(ctx, operations) {
  if (ctx.scope !== "global") return;
  const file = ".project/skills/global.json";
  const old = snapshot(ctx, file, "project");
  const value = old ? JSON.parse(Buffer.from(old.data, "base64").toString()) : { schemaVersion: 1, locations: [] };
  if (value.schemaVersion !== 1 || !Array.isArray(value.locations) || value.locations.some((item) => typeof item !== "string")) throw new Error("Invalid project global-skill links");
  if (!value.locations.includes(ctx.roots.target)) {
    value.locations.push(ctx.roots.target);
    // The registry remains the last commit record, after the cross-root link.
    operations.unshift({ root: "project", path: file, expected: old?.hash || null, expectedMode: old?.mode || null, value: { data: json(value), mode: 0o644 } });
  }
}

function run(options = {}) {
  const action = options.action || "install";
  const project = fs.realpathSync(options.root || process.cwd());
  if (action === "inspect") {
    const source = inspectSource(options.skill, options);
    return { id: source.id, revision: source.revision, description: source.description, sourcePath: source.sourcePath, license: source.license ? "present" : "not-found", files: Object.keys(source.files), instructions: source.files["SKILL.md"].data.toString() };
  }
  if (!["install", "update", "list", "enable", "disable", "remove", "recover"].includes(action)) throw new Error(`Unknown action: ${action}`);
  // Existence is resolved before asking callers for an installation choice, without target writes.
  const source = action === "install" ? inspectSource(options.skill, options) : null;
  const ctx = context(project, options.scope, options.location);
  if (action === "recover") {
    if (!options.apply) return { action, pending: Boolean(snapshot(ctx, `${ctx.state}/transaction.json`)), applied: false };
    return { action, recovered: recover(ctx), applied: true };
  }
  if (snapshot(ctx, `${ctx.state}/transaction.json`)) throw new Error("Interrupted transaction: run recover before continuing");
  const { registry, stored } = readRegistry(ctx);
  if (action === "list") return { scope: ctx.scope, skills: Object.values(registry.skills) };
  const id = identity(options.skill).id;
  const previous = registry.skills[id];
  if (action !== "install" && !previous) throw new Error(`Skill is not installed: ${id}`);
  let files = {};
  let entry;
  if (action === "remove") {
    delete registry.skills[id];
  } else if (action === "install" || action === "update") {
    const selectedPhases = phases(options.phases || (action === "update" ? previous.phases : undefined));
    const updated = source || inspectSource(id, { ...options, path: options.path || previous.source.path, repo: options.repo || (path.isAbsolute(previous.source.url) ? previous.source.url : undefined) });
    if (Object.values(registry.skills).some((item) => item.name === updated.name && item.id !== id)) throw new Error(`Skill name already belongs to another source: ${updated.name}`);
    ({ entry, files } = makeEntry(updated, ctx, discoverVendors(project), selectedPhases, previous?.enabled ?? true));
    checkNamespace(project, ctx, updated.name, previous, files);
    registry.skills[id] = entry;
  } else {
    entry = structuredClone(previous);
    entry.enabled = action === "enable";
    const rendered = adapters(discoverVendors(project), ctx.scope, entry.name, entry.packagePath, entry.description, entry.phases, entry.enabled);
    // Keep package files intact; re-render only owned vendor entry points.
    for (const file of Object.keys(entry.owned).filter((file) => file.startsWith(`${entry.packagePath}/`))) {
      const current = snapshot(ctx, file);
      if (!current) throw new Error(`Missing owned file: ${file}`);
      files[file] = { data: Buffer.from(current.data, "base64"), mode: current.mode };
    }
    Object.assign(files, rendered.files);
    checkNamespace(project, ctx, entry.name, previous, files);
    entry.adapters = rendered.paths;
    entry.owned = Object.fromEntries(Object.entries(files).map(([file, value]) => [file, { hash: digest(value.data), sourceHash: previous.owned[file]?.sourceHash || digest(value.data), mode: value.mode }]));
    registry.skills[id] = entry;
  }
  const operations = operationsFor(ctx, previous, files, registry, stored);
  if (action !== "remove") globalLink(ctx, operations);
  if (options.apply && operations.length) transact(ctx, operations, options.transaction);
  return { action, id, applied: Boolean(options.apply), changed: operations.map((operation) => operation.path), vendors: Object.keys(entry?.adapters || previous.adapters), phases: entry?.phases || previous.phases, revision: entry?.source.revision || previous.source.revision, license: entry?.license || previous.license, runtime: entry?.runtime || previous.runtime };
}

function cli(argv) {
  const options = {};
  const valued = new Set(["root", "scope", "location", "phases", "repo", "ref", "path"]);
  const flags = new Set(["apply", "json", "help"]);
  const positional = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (!arg.startsWith("--")) { positional.push(arg); continue; }
    const key = arg.slice(2);
    if (Object.hasOwn(options, key)) throw new Error(`Duplicate option: ${arg}`);
    if (flags.has(key)) options[key] = true;
    else if (valued.has(key) && argv[index + 1] && !argv[index + 1].startsWith("--")) options[key] = argv[++index];
    else throw new Error(`Unknown option or missing value: ${arg}`);
  }
  if (positional.length > 2) throw new Error("Expected an action and at most one skill identity");
  options.action = positional[0] || "help";
  options.skill = positional[1];
  if (options.help || options.action === "help") return "Usage: node ai-framework/scripts/add-skill.js <inspect|install|update|list|enable|disable|remove|recover> [owner/repo/skill]\nChoose --scope project|global and --phases shape,build,... for install. Global also needs --location /absolute/user-root.\nDefault: preview. Use --apply to write. --root selects project; --repo selects an offline repository; --ref pins a commit; --path selects an exact repository SKILL.md.\n";
  return run(options);
}

if (require.main === module) {
  try {
    const result = cli(process.argv.slice(2));
    process.stdout.write(typeof result === "string" ? result : `${JSON.stringify(result, null, 2)}\n`);
  } catch (error) { process.stderr.write(`add-skill: ${error.message}\n`); process.exitCode = 1; }
}

module.exports = { run, cli, phases };
