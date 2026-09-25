const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const { safeRelative, identity } = require("./skill-source");

const digest = (data) => crypto.createHash("sha256").update(data).digest("hex");
const json = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const same = (left, right) => (left?.hash || null) === (right?.hash || null) && (left?.mode || null) === (right?.mode || null);
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function context(project, scope, location) {
  if (!["project", "global"].includes(scope)) throw new Error("Choose --scope project|global explicitly");
  project = fs.realpathSync(project);
  if (scope === "global" && (!location || !path.isAbsolute(location))) throw new Error("Global scope requires an explicit absolute --location (user home root)");
  if (scope === "project" && location && path.resolve(location) !== project) throw new Error("Project location must equal --root; use --root to choose a project");
  const target = scope === "global" ? fs.realpathSync(location) : project;
  if (scope === "global" && target === project) throw new Error("Global location must be separate from the project");
  const state = scope === "global" ? ".ai-workflow/skills" : ".project/skills";
  return { roots: { project, target }, scope, state, registry: `${state}/registry.json` };
}

// Reject symlinks at every existing ancestor before reading or writing any managed path.
function resolveFile(ctx, relative, root = "target") {
  safeRelative(relative);
  if (!["target", "project"].includes(root)) throw new Error("Invalid transaction root");
  const base = ctx.roots[root];
  let current = base;
  for (const part of relative.split("/")) {
    current = path.join(current, part);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`Symlink destination forbidden: ${relative}`);
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  return current;
}

function snapshot(ctx, relative, root = "target") {
  const full = resolveFile(ctx, relative, root);
  try {
    const stat = fs.statSync(full);
    if (!stat.isFile()) throw new Error(`Destination is not a file: ${relative}`);
    const data = fs.readFileSync(full);
    return { data: data.toString("base64"), mode: stat.mode & 0o777, hash: digest(data) };
  } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

function readRegistry(ctx) {
  const stored = snapshot(ctx, ctx.registry);
  const registry = stored ? JSON.parse(Buffer.from(stored.data, "base64").toString()) : { schemaVersion: 1, skills: {} };
  if (!record(registry) || registry.schemaVersion !== 1 || !record(registry.skills)) throw new Error("Unsupported or invalid skill registry schema");
  const owners = new Set();
  for (const [id, entry] of Object.entries(registry.skills)) {
    const selected = identity(id);
    if (!record(entry) || entry.id !== id || typeof entry.enabled !== "boolean" || !Array.isArray(entry.phases) || !record(entry.owned) || !record(entry.adapters) || !record(entry.source) || !entry.packagePath) throw new Error(`Invalid registry entry: ${id}`);
    safeRelative(entry.packagePath);
    if (entry.name !== selected.name || entry.scope !== ctx.scope || !entry.phases.length || entry.phases.some((item) => typeof item !== "string")) throw new Error(`Invalid registry activation: ${id}`);
    if (entry.packagePath !== `${ctx.state}/packages/${id}`) throw new Error("Invalid package ownership root");
    const adapterPaths = Object.values(entry.adapters);
    if (!adapterPaths.length || adapterPaths.some((file) => typeof file !== "string" || !file.endsWith(`/${entry.name}/SKILL.md`) || !Object.hasOwn(entry.owned, file))) throw new Error("Invalid adapter ownership paths");
    for (const [file, owned] of Object.entries(entry.owned)) {
      safeRelative(file);
      if (owners.has(file.toLowerCase())) throw new Error(`Duplicate registry ownership: ${file}`);
      owners.add(file.toLowerCase());
      if (!owned || !/^[a-f0-9]{64}$/.test(owned.hash) || !/^[a-f0-9]{64}$/.test(owned.sourceHash) || ![0o644, 0o755].includes(owned.mode)) throw new Error(`Invalid ownership record: ${file}`);
      if (file === ctx.registry || file.startsWith(`${ctx.state}/`) && !file.startsWith(`${entry.packagePath}/`)) throw new Error(`Invalid owned path: ${file}`);
      if (!file.startsWith(`${entry.packagePath}/`) && !adapterPaths.includes(file)) throw new Error(`Unrecognized owned path: ${file}`);
    }
  }
  return { registry, stored };
}

function mkdirParents(ctx, file, root, created) {
  const base = ctx.roots[root];
  const relative = path.relative(base, path.dirname(file));
  let current = base;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) {
      fs.mkdirSync(current);
      created.push({ root, path: path.relative(base, current).split(path.sep).join("/") });
    }
  }
}

function writeAtomic(ctx, relative, value, root, created) {
  const full = resolveFile(ctx, relative, root);
  mkdirParents(ctx, full, root, created);
  if (value === null) { fs.rmSync(full, { force: true }); return; }
  const temporary = `${full}.skill-${crypto.randomUUID()}`;
  try {
    const handle = fs.openSync(temporary, "wx", value.mode);
    try { fs.fchmodSync(handle, value.mode); fs.writeFileSync(handle, Buffer.from(value.data, "base64")); fs.fsyncSync(handle); } finally { fs.closeSync(handle); }
    fs.renameSync(temporary, full);
  } finally { fs.rmSync(temporary, { force: true }); }
}

function cleanup(ctx, created) {
  for (const item of [...created].reverse()) {
    try { fs.rmdirSync(resolveFile(ctx, item.path, item.root)); } catch (error) {
      if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes(error.code)) throw error;
    }
  }
}

function acquire(ctx, recovering, created) {
  const lock = resolveFile(ctx, `${ctx.state}/lock.json`);
  mkdirParents(ctx, lock, "target", created);
  if (fs.existsSync(lock)) {
    const owner = JSON.parse(fs.readFileSync(lock, "utf8"));
    let alive = true;
    if (!Number.isSafeInteger(owner.pid) || owner.pid <= 0) throw new Error("Invalid lock; inspect it before recovery");
    try { process.kill(owner.pid, 0); } catch (error) { if (error.code === "ESRCH") alive = false; }
    if (alive || !recovering) throw new Error(alive ? "Skill registry is locked by another process" : "Interrupted transaction: run recover");
    fs.unlinkSync(lock);
  }
  const handle = fs.openSync(lock, "wx", 0o600);
  try { fs.writeFileSync(handle, json({ pid: process.pid })); fs.fsyncSync(handle); } finally { fs.closeSync(handle); }
  return () => fs.rmSync(lock, { force: true });
}

function recoverJournal(ctx) {
  const journalPath = `${ctx.state}/transaction.json`;
  const journalFile = snapshot(ctx, journalPath);
  if (!journalFile) return false;
  const journal = JSON.parse(Buffer.from(journalFile.data, "base64").toString());
  if (journal.schemaVersion !== 1 || !Array.isArray(journal.operations) || JSON.stringify(journal.roots) !== JSON.stringify(ctx.roots)) throw new Error("Invalid recovery journal or changed transaction roots");
  // Check every file before restoring any: a concurrent local edit must never be overwritten.
  for (const operation of journal.operations) {
    const current = snapshot(ctx, operation.path, operation.root);
    if (!same(current, operation.before) && !same(current, operation.after)) throw new Error(`Recovery conflict: ${operation.path}`);
    for (const value of [operation.before, operation.after]) {
      if (value && (!Number.isInteger(value.mode) || value.mode < 0 || value.mode > 0o777 || digest(Buffer.from(value.data, "base64")) !== value.hash)) throw new Error("Damaged recovery backup");
    }
  }
  const created = [];
  for (const operation of [...journal.operations].reverse()) writeAtomic(ctx, operation.path, operation.before, operation.root, created);
  fs.unlinkSync(resolveFile(ctx, journalPath));
  cleanup(ctx, journal.created || []);
  return true;
}

function recover(ctx) {
  const created = [];
  const release = acquire(ctx, true, created);
  try { return recoverJournal(ctx); } finally { release(); cleanup(ctx, created); }
}

function transact(ctx, operations, options = {}) {
  const created = [];
  let release;
  const journalPath = `${ctx.state}/transaction.json`;
  try {
    release = acquire(ctx, false, created);
    if (snapshot(ctx, journalPath)) throw new Error("Interrupted transaction: run recover");
    const seen = new Set();
    const prepared = operations.map((operation) => {
      const root = operation.root || "target";
      const full = resolveFile(ctx, operation.path, root).toLowerCase();
      if ([...seen].some((item) => item === full || item.startsWith(`${full}${path.sep}`) || full.startsWith(`${item}${path.sep}`))) throw new Error(`Duplicate or overlapping transaction destination: ${operation.path}`);
      seen.add(full);
      const before = snapshot(ctx, operation.path, root);
      if ((before?.hash || null) !== operation.expected || Object.hasOwn(operation, "expectedMode") && (before?.mode || null) !== operation.expectedMode) throw new Error(`Concurrent edit or ownership conflict: ${operation.path}`);
      const after = operation.value === null ? null : { data: operation.value.data.toString("base64"), mode: operation.value.mode, hash: digest(operation.value.data) };
      return { root, path: operation.path, before, after };
    });
    const journal = { schemaVersion: 1, roots: ctx.roots, operations: prepared, created };
    writeAtomic(ctx, journalPath, { data: json(journal).toString("base64"), mode: 0o600 }, "target", created);
    try {
      for (let index = 0; index < prepared.length; index++) {
        const operation = prepared[index];
        if (!same(snapshot(ctx, operation.path, operation.root), operation.before)) throw new Error(`Concurrent edit: ${operation.path}`);
        writeAtomic(ctx, operation.path, operation.after, operation.root, created);
        // Persist the directory ledger too so process interruption can be recovered.
        writeAtomic(ctx, journalPath, { data: json(journal).toString("base64"), mode: 0o600 }, "target", created);
        options.afterWrite?.(index);
      }
      for (const operation of prepared) {
        if (!same(snapshot(ctx, operation.path, operation.root), operation.after)) throw new Error(`Concurrent edit before commit: ${operation.path}`);
      }
      fs.unlinkSync(resolveFile(ctx, journalPath));
    } catch (error) {
      recoverJournal(ctx);
      throw error;
    }
  } finally { if (release) release(); cleanup(ctx, created); }
}

module.exports = { digest, json, context, resolveFile, snapshot, readRegistry, transact, recover };
