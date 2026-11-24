import assert from "node:assert/strict";
import { test } from "node:test";
import { createTestDeps, tempFixture } from "./runtime/test-helpers.mts";
import { createProjectFacts, type ProjectBudgets } from "./facts-project.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

const deps = createTestDeps();
const { fs, path } = deps;
const roots: string[] = [];
function fixture(files: Record<string, string> = {}) {
  const root = tempFixture(deps, files); roots.push(root); return root;
}
function put(root: string, rel: string, value: unknown) {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), typeof value === "string" ? value : JSON.stringify(value));
}
function api(budgets: ProjectBudgets = {}, runtime: RuntimeDeps = deps, reads: string[] = []) {
  return createProjectFacts(runtime, {
    clean: () => { throw new Error("raw names must not be cleaned here"); },
    read(root, rel, maxBytes = 1024 * 1024) {
      reads.push(rel);
      try {
        let current = root;
        if (fs.lstatSync(root).isSymbolicLink()) return { error: "refused" };
        for (const part of rel.split("/")) {
          current = path.join(current, part);
          if (fs.lstatSync(current).isSymbolicLink()) return { error: "refused" };
        }
        const stat = fs.lstatSync(current);
        if (!stat.isFile() || stat.size > maxBytes) return { error: "refused" };
        return { text: fs.readFileSync(current) };
      } catch (error) { return (error as { code?: string }).code === "ENOENT" ? { missing: true } : { error: "PRIVATE ERROR password=secret" }; }
    },
  }, budgets);
}
const journal = (n: number) => ({ version: "7", dialect: "postgresql", entries: Array.from({ length: n }, (_, idx) => ({ idx, version: "7", when: 100 + idx, tag: `000${idx}_migration`, breakpoints: true })) });
const schema = () => ({
  version: "7", dialect: "postgresql", tables: {
    "public.users": { name: "users", columns: { id: { name: "id", type: "uuid", primaryKey: true, notNull: true }, email: { name: "email", type: "text", notNull: false } }, uniqueConstraints: { email_unique: { columns: ["email"] } }, foreignKeys: {} },
    "public.posts": { name: "posts", columns: { id: { name: "id", type: "integer", notNull: true }, user: { name: "user_id", type: "uuid", notNull: true } }, compositePrimaryKeys: { pk: { columns: ["id", "user_id"] } }, foreignKeys: { author: { tableFrom: "posts", columnsFrom: ["user_id"], tableTo: "users", columnsTo: ["id"] } } },
  },
});
function drizzle(n = 3) {
  const root = fixture(); put(root, "drizzle/meta/_journal.json", journal(n)); put(root, "drizzle/meta/0002_snapshot.json", schema()); return root;
}

// Keep fixture cleanup in this file: no large or generated fixtures are committed.
import { after } from "node:test";
after(() => { for (const root of roots) fs.rmSync(root, { recursive: true, force: true }); });

test("Drizzle reads only the newest snapshot and journal, including columns, keys and relationships", () => {
  const root = drizzle(), reads: string[] = [];
  put(root, "drizzle/meta/0000_snapshot.json", "invalid old snapshot");
  put(root, "drizzle/meta/schema.ts", "throw new Error('must never run')");
  const result = api({}, deps, reads).database(root), value = result.value as any;
  assert.equal(result.status, "observed");
  assert.equal(value.dialect, "postgresql");
  assert.deepEqual(value.total, { entities: 2, relationships: 1 });
  assert.deepEqual(value.entities[0], { name: "users", columns: [{ name: "id", type: "uuid", pk: true, nullable: false }, { name: "email", type: "text", pk: false, nullable: true }], unique: [["email"]] });
  assert.ok(value.entities[1].columns.every((column: any) => column.pk));
  assert.deepEqual(value.relationships, [{ from: "posts", fromColumns: ["user_id"], to: "users", toColumns: ["id"] }]);
  assert.deepEqual(reads.sort(), ["drizzle/meta/0002_snapshot.json", "drizzle/meta/_journal.json"]);
});

test("LAH journal with twelve entries and snapshot 0002 is stale with both counts", () => {
  const result = api().database(drizzle(12));
  assert.equal(result.status, "stale");
  assert.equal(result.note, "journal lists 12 migrations; newest snapshot covers 3");
});

test("no snapshot (including Prisma-only trees) is unconfigured and names checked paths", () => {
  for (const files of [{}, { "prisma/schema.prisma": "model User {}", "drizzle/meta/_journal.json": JSON.stringify(journal(12)) }]) {
    const result = api().database(fixture(files));
    assert.equal(result.status, "unconfigured"); assert.equal(result.value, null);
    assert.match(result.note!, /drizzle\/meta\/_journal.json/); assert.match(result.note!, /drizzle\/meta\/NNNN_snapshot.json/);
  }
});

test("invalid and oversized snapshots fail with fixed reasons", () => {
  const root = drizzle(); put(root, "drizzle/meta/0002_snapshot.json", "password=do-not-echo {");
  const invalid = api().database(root);
  assert.equal(invalid.status, "unavailable"); assert.equal(invalid.note, "Drizzle snapshot is not valid JSON");
  put(root, "drizzle/meta/0002_snapshot.json", "x".repeat(1024 * 1024 + 1));
  const large = api().database(root);
  assert.equal(large.status, "unavailable"); assert.equal(large.note, "Drizzle snapshot could not be read within the file limit");
});

test("missing, invalid or unreadable journal makes only snapshot freshness stale", () => {
  const root = drizzle(); fs.rmSync(path.join(root, "drizzle/meta/_journal.json"));
  assert.equal(api().database(root).status, "stale");
  put(root, "drizzle/meta/_journal.json", "broken"); assert.equal(api().database(root).status, "stale");
  put(root, "drizzle/meta/_journal.json", {}); assert.equal(api().database(root).status, "stale");
});

test("linked snapshots and journals are refused without reading their targets", () => {
  const root = drizzle(), outside = fixture({ "snapshot.json": JSON.stringify(schema()), "journal.json": JSON.stringify(journal(3)) });
  fs.rmSync(path.join(root, "drizzle/meta/0002_snapshot.json"));
  fs.symlinkSync(path.join(outside, "snapshot.json"), path.join(root, "drizzle/meta/0002_snapshot.json"));
  assert.equal(api().database(root).status, "unavailable");
  fs.rmSync(path.join(root, "drizzle/meta/0002_snapshot.json"));
  put(root, "drizzle/meta/0002_snapshot.json", schema());
  fs.rmSync(path.join(root, "drizzle/meta/_journal.json"));
  fs.symlinkSync(path.join(outside, "journal.json"), path.join(root, "drizzle/meta/_journal.json"));
  assert.equal(api().database(root).status, "stale");
});

test("schema names remain raw and bounded, including prototype keys and hostile labels", () => {
  const root = drizzle(), tables = new Map<string, unknown>();
  for (const label of ["constructor", "toString", "__proto__", "|@=$&\nsecret", "x".repeat(2000)]) tables.set(label, { name: label, columns: { a: { name: label, type: "text" } } });
  put(root, "drizzle/meta/0002_snapshot.json", { dialect: "postgresql", tables: Object.fromEntries(tables) });
  const value = api().database(root).value as any;
  assert.equal(value.total.entities, 5); assert.equal(value.entities[2].name, "__proto__");
  assert.equal(value.entities[3].name, "|@=$&\nsecret"); assert.equal(value.entities[4].name.length, 1024);
});

test("schema entity, field and relationship budgets are independent of the 30-entity rendering cap", () => {
  const root = drizzle(), columns = Object.fromEntries(Array.from({ length: 3000 }, (_, i) => [`f${i}`, { name: `f${i}`, type: "text" }]));
  put(root, "drizzle/meta/0002_snapshot.json", { dialect: "postgresql", tables: { huge: { name: "huge", columns } } });
  let result = api().database(root), value = result.value as any;
  assert.equal(value.entities[0].columns.length, 1000); assert.equal(result.status, "stale"); assert.match(result.note!, /at least/);
  result = api({ fieldsTotal: 2 }).database(root); assert.equal((result.value as any).entities[0].columns.length, 2);
  put(root, "drizzle/meta/0002_snapshot.json", { dialect: "postgresql", tables: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`t${i}`, { name: `t${i}`, columns: {} }])) });
  assert.equal((api().database(root).value as any).entities.length, 40);
  result = api({ entities: 2 }).database(root); assert.equal(result.status, "stale"); assert.equal((result.value as any).total.entities, 2);
  put(root, "drizzle/meta/0002_snapshot.json", schema());
  result = api({ relationships: 0 }).database(root); assert.equal(result.status, "stale"); assert.equal((result.value as any).relationships.length, 0);
});

test("structure stops at depth two, skips generated and dot directories, counts prototype keys", () => {
  const root = fixture({ "root.txt": "", "src/a.ts": "", "src/lib/b.ts": "", "src/lib/third/hidden.ts": "" });
  for (const dir of ["node_modules", ".git", "dist", "build", "coverage", "graphify-out", "storybook-static", ".cache", ".project/skills/packages"]) put(root, `${dir}/hidden.txt`, "");
  for (const dir of ["constructor", "toString", "__proto__"]) put(root, `${dir}/file.txt`, "");
  const result = api().structure(root), value = result.value as any;
  assert.equal(result.status, "observed"); assert.deepEqual(value.total, { dirs: 5, files: 6 });
  const nodes = new Map(value.nodes.map((node: any) => [node.path, node]));
  assert.equal((nodes.get("constructor") as any).files, 1);
  assert.equal((nodes.get("toString") as any).files, 1); assert.equal((nodes.get("__proto__") as any).files, 1);
  assert.deepEqual(nodes.get("src/lib"), { path: "src/lib", label: "lib", parent: "src", files: 1 });
  assert.equal(nodes.has("src/lib/third"), false);
});

test("structure refuses linked directories, files, roots and ancestors", () => {
  const outside = fixture({ "leak.txt": "" }), root = fixture({ "safe/a.txt": "" });
  fs.symlinkSync(outside, path.join(root, "linked"));
  fs.symlinkSync(path.join(outside, "leak.txt"), path.join(root, "leak"));
  const result = api().structure(root), value = result.value as any;
  assert.equal(value.nodes.some((node: any) => node.path === "linked"), false);
  assert.equal(value.total.files, 1); assert.equal(result.status, "stale");
  assert.equal(api().structure(path.join(root, "linked")).status, "unavailable");
  fs.symlinkSync(outside, path.join(root, "drizzle"));
  assert.equal(api().database(root).status, "unavailable");
});

test("structure budgets mark lower bounds; display cap does not cap discovery", () => {
  const root = fixture({ "one/a": "", "two/b": "", "three/c": "" });
  for (const budgets of [{ entriesPerDir: 1 }, { dirsVisited: 1 }, { treeNodes: 1 }]) {
    const result = api(budgets).structure(root); assert.equal(result.status, "stale"); assert.match(result.note!, /at least/);
  }
  const value = api({ treeNodes: 1 }).structure(root).value as any;
  assert.equal(value.nodes.length, 1); assert.deepEqual(value.total, { dirs: 3, files: 3 });
});

test("directory names cannot collide with aggregate counter keys; dot files are counted", () => {
  const root = fixture({ "dirs/a": "", "files/b": "", "visited/c": "", ".gitignore": "" });
  const result = api().structure(root), value = result.value as any;
  assert.equal(result.status, "observed");
  assert.deepEqual(value.total, { dirs: 3, files: 4 });
  assert.ok(value.nodes.every((node: any) => node.files === 1));
});

test("5000 directory entries stop processing at the entry budget with only lstat and readdir", () => {
  const root = fixture(); for (let i = 0; i < 5000; i++) put(root, `file-${i}`, "");
  let probes = 0;
  const restricted = new Proxy(deps.fs, { get(target, key) {
    if (key === "lstatSync") return (file: string) => { probes++; return target.lstatSync(file); };
    if (key === "readdirSync") return target.readdirSync;
    throw new Error(`forbidden fs API ${String(key)}`);
  } });
  const result = api({ entriesPerDir: 100 }, { ...deps, fs: restricted }).structure(root);
  assert.equal(result.status, "stale"); assert.match(result.note!, /at least/);
  assert.equal((result.value as any).total.files, 100); assert.ok(probes <= 201);
});

test("stack reads dependency counts, fixed frameworks and script names, never bodies", () => {
  const root = fixture({ "package.json": JSON.stringify({ dependencies: { react: "1", next: "2", arbitrary: "3" }, devDependencies: { typescript: "5", vite: "6" }, scripts: { dev: "password=secret", "|@=$&": "PRIVATE BODY" } }), "bun.lock": "invalid data never read" });
  const reads: string[] = [], result = api({}, deps, reads).stack(root);
  assert.deepEqual(result.value, { manager: "bun", language: "TypeScript", dependencies: 3, devDependencies: 2, frameworks: ["next", "react", "vite"], scripts: ["dev", "|@=$&"] });
  assert.equal(result.status, "observed"); assert.deepEqual(reads, ["package.json"]);
  assert.doesNotMatch(JSON.stringify(result), /password|PRIVATE BODY/);
});

for (const [lock, manager] of [["bun.lock", "bun"], ["pnpm-lock.yaml", "pnpm"], ["yarn.lock", "yarn"], ["package-lock.json", "npm"]]) {
  test(`manager comes from ${lock}`, () => {
    const result = api().stack(fixture({ "package.json": "{}", [lock]: "" }));
    assert.equal((result.value as any).manager, manager); assert.equal((result.value as any).language, "JavaScript");
  });
}

test("no package is unconfigured; non-JS manifests report only the language without reading bodies", () => {
  assert.equal(api().stack(fixture()).status, "unconfigured");
  for (const [file, language] of [["pyproject.toml", "Python"], ["go.mod", "Go"], ["Cargo.toml", "Rust"]]) {
    const reads: string[] = [], result = api({}, deps, reads).stack(fixture({ [file]: "password=never-read" }));
    assert.deepEqual(result.value, { manager: null, language, dependencies: 0, devDependencies: 0, frameworks: [], scripts: [] });
    assert.equal(result.status, "observed"); assert.deepEqual(reads, ["package.json"]);
  }
});

test("stack invalid, oversized or symlinked input fails closed with fixed text", () => {
  for (const content of ["{ password=private", "x".repeat(1024 * 1024 + 1)]) assert.equal(api().stack(fixture({ "package.json": content })).status, "unavailable");
  const root = fixture(), outside = fixture({ "package.json": "{}" });
  fs.symlinkSync(path.join(outside, "package.json"), path.join(root, "package.json"));
  assert.equal(api().stack(root).status, "unavailable");
});

test("all readers avoid process, network and database APIs", () => {
  let forbidden = 0;
  const runtime = new Proxy(deps, { get(target, key) {
    if (key === "child" || key === "net" || key === "db" || key === "database") { forbidden++; throw new Error("forbidden API"); }
    return Reflect.get(target, key);
  } });
  const root = drizzle(); put(root, "package.json", { scripts: { malicious: "touch forbidden" } });
  const readers = api({}, runtime);
  assert.equal(readers.database(root).status, "observed");
  assert.equal(readers.structure(root).status, "observed");
  assert.equal(readers.stack(root).status, "observed");
  assert.equal(forbidden, 0);
});

test("constraint discovery has its own ceiling: 3000 empty composite primary keys stop at the budget", () => {
  const root = drizzle(3);
  const compositePrimaryKeys = Object.fromEntries(Array.from({ length: 3000 }, (_, i) => [`pk${i}`, { columns: [] }]));
  const uniqueConstraints = Object.fromEntries(Array.from({ length: 3000 }, (_, i) => [`u${i}`, { columns: [] }]));
  put(root, "drizzle/meta/0002_snapshot.json", { dialect: "postgresql", tables: { t: { name: "t", columns: { id: { name: "id", type: "text" } }, compositePrimaryKeys } } });
  let result = api().database(root);
  assert.equal(result.status, "stale"); assert.match(result.note!, /discovery budget reached/);
  put(root, "drizzle/meta/0002_snapshot.json", { dialect: "postgresql", tables: { t: { name: "t", columns: { id: { name: "id", type: "text" } }, uniqueConstraints } } });
  result = api().database(root);
  assert.equal(result.status, "stale"); assert.match(result.note!, /discovery budget reached/);
});
