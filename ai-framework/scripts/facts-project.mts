/** Read-only project metadata. Project files are data; labels are cleaned by the renderer. */
import type { RuntimeDeps } from "./runtime/types.mts";
import type { Fact, Status } from "./facts-gather.mts";

export interface ProjectBudgets {
  entriesPerDir?: number; dirsVisited?: number; treeNodes?: number;
  entities?: number; fieldsTotal?: number; relationships?: number;
}
const FILE_BYTES = 1024 * 1024;
const NAME_LENGTH = 1024;
const SKIP = new Set(["node_modules", "dist", "build", "coverage", "graphify-out", "storybook-static"]);
const FRAMEWORKS = ["next", "react", "vue", "nuxt", "svelte", "@sveltejs/kit", "astro", "angular", "@angular/core", "express", "fastify", "hono", "@nestjs/core", "@tanstack/react-start", "@tanstack/react-router", "@remix-run/react", "solid-js", "vite", "drizzle-orm", "prisma", "@prisma/client"];
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const name = (value: unknown): string => typeof value === "string" ? value.slice(0, NAME_LENGTH) : "";
const strings = (value: unknown): string[] => Array.isArray(value) ? value.slice(0, 1000).filter((v): v is string => typeof v === "string").map(name) : [];

export function createProjectFacts(deps: RuntimeDeps, helpers: {
  read: (root: string, rel: string, maxBytes?: number) => { text?: string; missing?: true; error?: string };
  clean: (text: unknown) => string;
}, budgets: ProjectBudgets = {}): {
  database(root: string): Fact; structure(root: string): Fact; stack(root: string): Fact;
} {
  const { fs, path } = deps;
  const limit = (n: number | undefined, fallback: number) => n === undefined || !Number.isFinite(n) ? fallback : Math.max(0, Math.floor(n));
  const entriesLimit = limit(budgets.entriesPerDir, 1000), dirsLimit = limit(budgets.dirsVisited, 500);
  const nodesLimit = limit(budgets.treeNodes, 60), entitiesLimit = limit(budgets.entities, 300);
  const fieldsLimit = limit(budgets.fieldsTotal, 1000), relationsLimit = limit(budgets.relationships, 1000);
  const fact = (value: unknown, status: Status, evidence: string[], note?: string): Fact =>
    note === undefined ? { value, status, evidence } : { value, status, evidence, note };
  const unavailable = (evidence: string[], note: string) => fact(null, "unavailable", evidence, note);
  const safe = (run: (root: string) => Fact) => (root: string): Fact => {
    try { return run(root); } catch { return unavailable([], "project metadata could not be read"); }
  };
  // Every segment is checked before a directory listing or metadata probe.
  function stat(root: string, rel: string) {
    let full = root;
    let result = fs.lstatSync(full);
    if (result.isSymbolicLink() || !result.isDirectory()) throw new Error("directory refused");
    const parts = rel ? rel.split("/") : [];
    for (let i = 0; i < parts.length; i++) {
      if (!parts[i] || parts[i] === "." || parts[i] === ".." || /[/\\]/.test(parts[i])) throw new Error("path refused");
      full = path.join(full, parts[i]);
      result = fs.lstatSync(full);
      if (result.isSymbolicLink() || (i < parts.length - 1 && !result.isDirectory())) throw new Error("path refused");
    }
    return result;
  }
  function present(root: string, rel: string): boolean {
    try { return stat(root, rel).isFile(); }
    catch (error) { if ((error as { code?: string }).code === "ENOENT") return false; throw error; }
  }
  function json(root: string, rel: string) {
    const source = helpers.read(root, rel, FILE_BYTES);
    if (source.text === undefined) return { ...source, value: undefined as unknown };
    if (source.text.length > FILE_BYTES) return { error: "size", value: undefined as unknown };
    try { return { value: JSON.parse(source.text) as unknown }; }
    catch { return { error: "json", value: undefined as unknown }; }
  }

  function database(root: string): Fact {
    const journalPath = "drizzle/meta/_journal.json", directory = "drizzle/meta";
    let listing: string[];
    try {
      if (!stat(root, directory).isDirectory()) return unavailable([directory], "Drizzle metadata directory refused");
      listing = fs.readdirSync(path.join(root, directory));
    } catch (error) {
      if ((error as { code?: string }).code === "ENOENT") return fact(null, "unconfigured", [], "checked drizzle/meta/_journal.json and drizzle/meta/NNNN_snapshot.json; no Drizzle snapshot");
      return unavailable([directory], "Drizzle metadata directory refused");
    }
    let capped = listing.length > entriesLimit;
    const snapshots = listing.slice(0, entriesLimit).filter((file) => /^\d{4}_snapshot\.json$/.test(file)).sort();
    const latest = snapshots.at(-1);
    if (!latest) return capped ? unavailable([directory], "Drizzle metadata discovery budget reached") : fact(null, "unconfigured", [], "checked drizzle/meta/_journal.json and drizzle/meta/NNNN_snapshot.json; no Drizzle snapshot");
    const snapshotPath = `${directory}/${latest}`, source = json(root, snapshotPath);
    if (source.value === undefined) return unavailable([snapshotPath], source.error === "json" ? "Drizzle snapshot is not valid JSON" : "Drizzle snapshot could not be read within the file limit");
    const snapshot = object(source.value);
    if (!snapshot.tables || typeof snapshot.tables !== "object" || Array.isArray(snapshot.tables)) return unavailable([snapshotPath], "Drizzle snapshot has no tables object");
    const counts = new Map<string, number>([["entities", 0], ["fields", 0], ["relationships", 0], ["primaryKeys", 0], ["uniqueKeys", 0]]);
    const entities: { name: string; columns: { name: string; type: string; pk: boolean; nullable: boolean }[]; unique: string[][] }[] = [];
    const relationships: { from: string; fromColumns: string[]; to: string; toColumns: string[] }[] = [];
    for (const key in object(snapshot.tables)) {
      if (!Object.hasOwn(snapshot.tables, key)) continue;
      if (counts.get("entities")! >= entitiesLimit) { capped = true; break; }
      counts.set("entities", counts.get("entities")! + 1);
      const table = object(object(snapshot.tables)[key]), tableName = name(table.name) || name(key);
      const columns: typeof entities[number]["columns"] = [], unique: string[][] = [];
      const primary = new Set<string>();
      for (const k in object(table.compositePrimaryKeys)) {
        if (counts.get("primaryKeys")! >= fieldsLimit) { capped = true; break; }
        counts.set("primaryKeys", counts.get("primaryKeys")! + 1);
        for (const column of strings(object(object(table.compositePrimaryKeys)[k]).columns).slice(0, fieldsLimit)) primary.add(column);
      }
      for (const columnKey in object(table.columns)) {
        if (!Object.hasOwn(object(table.columns), columnKey)) continue;
        if (counts.get("fields")! >= fieldsLimit) { capped = true; break; }
        counts.set("fields", counts.get("fields")! + 1);
        const column = object(object(table.columns)[columnKey]), columnName = name(column.name) || name(columnKey);
        columns.push({ name: columnName, type: name(column.type), pk: column.primaryKey === true || primary.has(columnName), nullable: column.notNull !== true });
      }
      // Constraint processing has a global ceiling too, including empty constraints.
      for (const k in object(table.uniqueConstraints)) {
        if (counts.get("uniqueKeys")! >= fieldsLimit) { capped = true; break; }
        counts.set("uniqueKeys", counts.get("uniqueKeys")! + 1);
        unique.push(strings(object(object(table.uniqueConstraints)[k]).columns).slice(0, fieldsLimit));
      }
      entities.push({ name: tableName, columns, unique });
      for (const k in object(table.foreignKeys)) {
        if (counts.get("relationships")! >= relationsLimit) { capped = true; break; }
        counts.set("relationships", counts.get("relationships")! + 1);
        const relation = object(object(table.foreignKeys)[k]);
        relationships.push({ from: name(relation.tableFrom) || tableName, fromColumns: strings(relation.columnsFrom), to: name(relation.tableTo), toColumns: strings(relation.columnsTo) });
      }
    }
    const journal = json(root, journalPath), evidence = [snapshotPath];
    const notes: string[] = [];
    if (capped) notes.push("discovery budget reached; counts are at least the reported totals");
    if (journal.value !== undefined) {
      evidence.push(journalPath);
      const entries = object(journal.value).entries;
      if (Array.isArray(entries)) {
        const covered = Number(latest.slice(0, 4)) + 1;
        if (entries.length > covered) notes.push(`journal lists ${entries.length} migrations; newest snapshot covers ${covered}`);
      } else notes.push("Drizzle journal has no entries array; snapshot freshness unavailable");
    } else notes.push("Drizzle journal unavailable; snapshot freshness unavailable");
    return fact({ dialect: name(snapshot.dialect), entities, relationships, total: { entities: counts.get("entities"), relationships: counts.get("relationships") } }, notes.length ? "stale" : "observed", evidence, notes.length ? notes.join("; ") : undefined);
  }

  function structure(root: string): Fact {
    const counts = new Map<string, number>([["dirs", 0], ["files", 0], ["visited", 0]]);
    const directoryFiles = new Map<string, number>();
    const nodes: { path: string; label: string; parent: string | null; files: number }[] = [];
    let capped = false, incomplete = false;
    function walk(rel: string, depth: number) {
      if (counts.get("visited")! >= dirsLimit) { capped = true; return; }
      if (!stat(root, rel).isDirectory()) throw new Error("directory refused");
      counts.set("visited", counts.get("visited")! + 1);
      const listing = fs.readdirSync(rel ? path.join(root, rel) : root);
      if (listing.length > entriesLimit) capped = true;
      for (const entry of listing.slice(0, entriesLimit)) {
        if (SKIP.has(entry)) continue;
        const target = rel ? `${rel}/${entry}` : entry;
        let info;
        try { info = stat(root, target); } catch { incomplete = true; continue; }
        if (info.isFile()) {
          counts.set("files", counts.get("files")! + 1);
          if (rel) directoryFiles.set(rel, (directoryFiles.get(rel) ?? 0) + 1);
        } else if (info.isDirectory() && !entry.startsWith(".") && depth < 2) {
          counts.set("dirs", counts.get("dirs")! + 1);
          if (nodes.length < nodesLimit) nodes.push({ path: name(target), label: name(entry), parent: rel ? name(rel) : null, files: 0 });
          else capped = true;
          walk(target, depth + 1);
        }
      }
    }
    walk("", 0);
    for (const node of nodes) node.files = directoryFiles.get(node.path) ?? 0;
    return fact({ nodes, total: { dirs: counts.get("dirs"), files: counts.get("files") } }, capped || incomplete ? "stale" : "observed", ["."], capped ? "discovery or display budget reached; counts are at least the reported totals" : incomplete ? "some directory entries refused; counts are at least the reported totals" : undefined);
  }

  function stack(root: string): Fact {
    const source = json(root, "package.json");
    if (source.value === undefined) {
      if (!source.missing) return unavailable(["package.json"], "package.json could not be read as bounded JSON");
      for (const [file, language] of [["pyproject.toml", "Python"], ["go.mod", "Go"], ["Cargo.toml", "Rust"]]) {
        if (present(root, file)) return fact({ manager: null, language, dependencies: 0, devDependencies: 0, frameworks: [], scripts: [] }, "observed", [file]);
      }
      return fact(null, "unconfigured", [], "no package.json, pyproject.toml, go.mod or Cargo.toml");
    }
    if (source.value === null || typeof source.value !== "object" || Array.isArray(source.value)) return unavailable(["package.json"], "package.json has no metadata object");
    const pkg = object(source.value), counts = new Map<string, number>();
    const packages = new Set<string>();
    for (const field of ["dependencies", "devDependencies"]) {
      counts.set(field, 0);
      for (const key in object(pkg[field])) if (Object.hasOwn(object(pkg[field]), key)) { counts.set(field, counts.get(field)! + 1); packages.add(key); }
    }
    const evidence = ["package.json"];
    let manager: string | null = null;
    for (const [lock, candidate] of [["bun.lock", "bun"], ["pnpm-lock.yaml", "pnpm"], ["yarn.lock", "yarn"], ["package-lock.json", "npm"]]) {
      if (present(root, lock)) { manager = candidate; evidence.push(lock); break; }
    }
    const scripts = Object.keys(object(pkg.scripts));
    const capped = scripts.length > entriesLimit;
    const typescript = packages.has("typescript") || present(root, "tsconfig.json");
    return fact({ manager, language: typescript ? "TypeScript" : "JavaScript", dependencies: counts.get("dependencies"), devDependencies: counts.get("devDependencies"), frameworks: FRAMEWORKS.filter((framework) => packages.has(framework)), scripts: scripts.slice(0, entriesLimit).map(name) }, capped ? "stale" : "observed", evidence, capped ? "script display budget reached; counts are at least the reported totals" : undefined);
  }
  return { database: safe(database), structure: safe(structure), stack: safe(stack) };
}
