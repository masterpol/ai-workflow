import assert from "node:assert/strict";
import { test } from "node:test";
import { createTestDeps, tempFixture } from "./runtime/test-helpers.mts";
import { createProjectFacts, credentialShaped, type ProjectBudgets } from "./facts-project.mts";
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
type TestSqlSchema = { dialect: string; entities: any[]; relationships: any[]; total: { entities: number; relationships: number }; approximate: string[]; notUnderstood: number; incomplete: "none" | "lexical" | "budget" };
type TestReadSql = (files: readonly { path: string; text: string }[], budgets?: unknown) => TestSqlSchema;
function api(budgets: ProjectBudgets = {}, runtime: RuntimeDeps = deps, reads: string[] = [], readSql?: TestReadSql) {
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
    readSql,
  }, budgets);
}
const journal = (n: number) => ({ version: "7", dialect: "postgresql", entries: Array.from({ length: n }, (_, idx) => ({ idx, version: "7", when: 100 + idx, tag: `000${idx}_migration`, breakpoints: true })) });

const countingReadSql: TestReadSql = (files) => {
  const entities: { name: string; schema: string; columns: any[]; unique: any[] }[] = [];
  for (const file of files) {
    for (const line of file.text.split(/\r?\n/)) {
      const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?/gi;
      for (const match of line.matchAll(regex)) {
        if (!entities.find((entity) => entity.name === match[1])) entities.push({ name: match[1], schema: "", columns: [], unique: [] });
      }
    }
  }
  return { dialect: "sqlite", entities, relationships: [], total: { entities: entities.length, relationships: 0 }, approximate: [], notUnderstood: 0, incomplete: "none" };
};
const readSqlWith = (patch: Partial<TestSqlSchema>): TestReadSql => (files, budgets) => ({ ...countingReadSql(files, budgets), ...patch });
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
  assert.deepEqual(value.entities[0], { name: "users", schema: "", columns: [{ name: "id", type: "uuid", pk: true, nullable: false }, { name: "email", type: "text", pk: false, nullable: true }], unique: [["email"]] });
  assert.ok(value.entities[1].columns.every((column: any) => column.pk));
  assert.deepEqual(value.relationships, [{ from: "posts", fromSchema: "", fromColumns: ["user_id"], to: "users", toSchema: "", toColumns: ["id"] }]);
  assert.deepEqual(reads.sort(), ["drizzle/meta/0002_snapshot.json", "drizzle/meta/_journal.json"]);
});

test("LAH journal with twelve entries and snapshot 0002 is stale with both counts", () => {
  const result = api().database(drizzle(12));
  assert.equal(result.status, "stale");
  assert.equal(result.note, "journal lists 12 migrations; newest snapshot covers 3");
});

test("no snapshot is unconfigured with the schema-source-found wording", () => {
  const result = api().database(fixture());
  assert.equal(result.status, "unconfigured"); assert.equal(result.value, null);
  assert.equal(result.note, "no schema source found");
});

test("a Drizzle journal without a snapshot is unconfigured and names checked paths", () => {
  const result = api().database(fixture({ "drizzle/meta/_journal.json": JSON.stringify(journal(12)) }));
  assert.equal(result.status, "unconfigured"); assert.equal(result.value, null);
  assert.match(result.note!, /drizzle\/meta\/_journal.json/); assert.match(result.note!, /drizzle\/meta\/NNNN_snapshot.json/);
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

for (const [lock, manager] of [["bun.lock", "bun"], ["bun.lockb", "bun"], ["pnpm-lock.yaml", "pnpm"], ["yarn.lock", "yarn"], ["package-lock.json", "npm"]]) {
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

test("directory discovery is sorted, so the capped tree does not depend on the filesystem's listing order", () => {
  const root = fixture({ "zeta/a.ts": "", "alpha/a.ts": "", "mid/a.ts": "", "beta/a.ts": "" });
  const reversed = new Proxy(deps.fs, { get(target, key) {
    if (key === "readdirSync") return (dir: string) => [...target.readdirSync(dir)].sort().reverse();
    return (target as any)[key];
  } });
  const sorted = (api({ entriesPerDir: 2 }, { ...deps, fs: reversed }).structure(root).value as any).nodes.map((node: any) => node.path);
  const natural = (api({ entriesPerDir: 2 }).structure(root).value as any).nodes.map((node: any) => node.path);
  assert.deepEqual(sorted, natural);
  assert.deepEqual(sorted, ["alpha", "beta"], "the first two names in sorted order are kept");
});

test("a table in another schema keeps its schema, and a foreign key keeps the schema it names", () => {
  const root = fixture(); put(root, "drizzle/meta/0000_snapshot.json", { dialect: "postgresql", tables: {
    "auth.users": { name: "users", schema: "auth", columns: {}, foreignKeys: {} },
    "public.posts": { name: "posts", schema: "public", columns: {}, foreignKeys: { a: { tableFrom: "posts", columnsFrom: ["u"], tableTo: "users", schemaTo: "auth", columnsTo: ["id"] } } },
  } });
  const value = api().database(root).value as any;
  assert.deepEqual(value.entities.map((entity: any) => entity.schema), ["auth", "public"]);
  assert.equal(value.relationships[0].toSchema, "auth");
  assert.equal(value.relationships[0].fromSchema, "public");
});

// S2 — workspaces

test("workspaces is unconfigured when no workspace configuration exists", () => {
  assert.equal(api().workspaces(fixture()).status, "unconfigured");
});

test("workspaces reads only the top-level packages block of pnpm-workspace.yaml", () => {
  const root = fixture({
    "pnpm-workspace.yaml": "packages:\n  - 'apps/*'\n  - 'packages/*'\n  - '!apps/old'\n  - 'packages/*/shared'\ncatalog:\n  react: ^18\noverrides:\n  foo: ^1",
    "apps/web/package.json": JSON.stringify({ name: "web", dependencies: { next: "1" } }),
    "packages/shared/package.json": JSON.stringify({ name: "shared", dependencies: { react: "1" } }),
  });
  const result = api().workspaces(root), value = result.value as any;
  assert.equal(result.status, "observed");
  assert.equal(value.packages.length, 2);
  assert.deepEqual(value.packages.map((p: any) => p.path).sort(), ["apps/web", "packages/shared"]);
  assert.equal(value.unresolved, 2);
  assert.equal(value.packages[0].name, value.packages[0].path === "apps/web" ? "web" : "shared");
});

test("workspaces reads package.json workspaces as array or {packages}", () => {
  const rootArray = fixture({
    "package.json": JSON.stringify({ workspaces: ["packages/*", "tools/a"] }),
    "packages/a/package.json": JSON.stringify({ name: "a" }),
    "tools/a/package.json": JSON.stringify({ name: "ta" }),
  });
  const array = api().workspaces(rootArray).value as any;
  assert.equal(array.packages.length, 2);
  assert.equal(array.unresolved, 0);
  const rootObject = fixture({
    "package.json": JSON.stringify({ workspaces: { packages: ["packages/*"] } }),
    "packages/b/package.json": JSON.stringify({ name: "b" }),
  });
  const object = api().workspaces(rootObject).value as any;
  assert.equal(object.packages.length, 1);
  assert.equal(object.packages[0].path, "packages/b");
});

test("workspaces caps at 20 packages", () => {
  const files: Record<string, string> = { "pnpm-workspace.yaml": "packages:\n" + Array.from({ length: 25 }, (_, i) => `  - 'p${i}'`).join("\n") };
  for (let i = 0; i < 25; i++) files[`p${i}/package.json`] = JSON.stringify({ name: `p${i}` });
  const result = api().workspaces(fixture(files)).value as any;
  assert.equal(result.packages.length, 20);
});

test("a linked workspace leaves its siblings readable", () => {
  const outside = fixture({ "bad/package.json": JSON.stringify({ name: "bad" }) });
  const root = fixture({
    "pnpm-workspace.yaml": "packages:\n  - 'packages/*'",
    "packages/good/package.json": JSON.stringify({ name: "good" }),
  });
  fs.symlinkSync(path.join(outside, "bad"), path.join(root, "packages/bad"));
  const result = api().workspaces(root), value = result.value as any;
  assert.equal(result.status, "stale");
  assert.equal(value.packages.length, 1);
  assert.equal(value.packages[0].path, "packages/good");
});

// S2 — database detection and source choice

test("climbing-lab shape finds nested drizzle meta snapshots", () => {
  const root = fixture({
    "apps/api/drizzle/meta/_journal.json": JSON.stringify(journal(5)),
    "apps/api/drizzle/meta/0004_snapshot.json": JSON.stringify(schema()),
  });
  const result = api().database(root), value = result.value as any;
  assert.equal(result.status, "observed");
  assert.equal(value.source.kind, "drizzle-snapshot");
  assert.equal(value.source.path, "apps/api/drizzle/meta");
  assert.deepEqual(value.total, { entities: 2, relationships: 1 });
});

test("RN shape finds two SQL migration folders and lists the TypeScript schema as found", () => {
  const root = fixture({
    "package.json": JSON.stringify({}),
    "apps/guaca-app/src/db/migrations/0001_a.sql": "CREATE TABLE users (id INT); CREATE TABLE posts (id INT); CREATE TABLE comments (id INT);",
    "apps/guaca-app/src/db/migrations/0002_b.sql": "CREATE TABLE logs (id INT);",
    "packages/data/src/drizzle/0001_b.sql": "CREATE TABLE accounts (id INT); CREATE TABLE sessions (id INT);",
    "packages/data/src/drizzle/0002_c.sql": "CREATE TABLE tokens (id INT);",
    "packages/data/src/schema.ts": "export const schema = {};",
    "packages/data/src/drizzle.config.ts": "export default {};",
  });
  const result = api({}, deps, [], countingReadSql).database(root), value = result.value as any;
  assert.equal(result.status, "observed");
  assert.equal(value.source.kind, "sql-migrations");
  assert.equal(value.source.path, "apps/guaca-app/src/db/migrations");
  assert.equal(value.total.entities, 4);
  assert.equal(value.found.length, 1);
  assert.equal(value.found[0].kind, "typescript-schema");
  assert.equal(value.found[0].path, "packages/data/src/schema.ts");
  assert.equal(value.alternatives.length, 1);
  assert.equal(value.alternatives[0].path, "packages/data/src/drizzle");
});

test("LAH stale snapshot loses to 12 SQL files from the same project", () => {
  const files: Record<string, string> = {
    "drizzle/meta/_journal.json": JSON.stringify(journal(12)),
    "drizzle/meta/0002_snapshot.json": JSON.stringify(schema()),
  };
  for (let i = 0; i < 12; i++) files[`drizzle/${String(i).padStart(4, "0")}_migration.sql`] = `CREATE TABLE t${i}a (id INT); CREATE TABLE t${i}b (id INT);`;
  const root = fixture(files);
  const result = api({}, deps, [], countingReadSql).database(root), value = result.value as any;
  assert.equal(result.status, "observed");
  assert.equal(value.source.kind, "sql-migrations");
  assert.equal(value.source.path, "drizzle");
  assert.equal(value.total.entities, 24);
  assert.equal(value.alternatives[0].kind, "drizzle-snapshot");
  assert.equal(value.alternatives[0].tables, 2);
});

test("complete snapshot wins over extra SQL migrations and names ignored sources", () => {
  const files: Record<string, string> = {
    "drizzle/meta/_journal.json": JSON.stringify(journal(2)),
    "drizzle/meta/0001_snapshot.json": JSON.stringify(schema()),
    "drizzle/0002_extra.sql": "CREATE TABLE extra (id INT);",
    "drizzle/0003_extra.sql": "CREATE TABLE extra2 (id INT);",
  };
  const root = fixture(files);
  const result = api({}, deps, [], countingReadSql).database(root), value = result.value as any;
  assert.equal(result.status, "observed");
  assert.equal(value.source.kind, "drizzle-snapshot");
  assert.equal(value.source.ignored, "drizzle");
  assert.equal(value.alternatives.length, 1);
  assert.equal(value.alternatives[0].kind, "sql-migrations");
});

test("docs-only project reports unconfigured for database", () => {
  const root = fixture({ "README.md": "# docs", "package.json": JSON.stringify({}) });
  assert.equal(api().database(root).status, "unconfigured");
});

test("directory budget hit is stale, never unconfigured", () => {
  const files: Record<string, string> = {
    "drizzle/meta/_journal.json": JSON.stringify(journal(2)),
    "drizzle/meta/0001_snapshot.json": JSON.stringify(schema()),
  };
  for (const char of "abcdefghijklmnopqrstuvwxyz") files[`${char}/b/c/d/e/f/.keep`] = "";
  const result = api({ dirsVisited: 2 }).database(fixture(files));
  assert.equal(result.status, "stale");
  assert.match(result.note!, /budget/);
  assert.notEqual(result.value, null);
});

test("lone .sql files and one-file folders are not migrations, and ignored dirs are never entered", () => {
  const root = fixture({
    "fixtures/0001_seed.sql": "CREATE TABLE seed (id INT);",
    "solo/0001_only.sql": "CREATE TABLE only (id INT);",
    "node_modules/db/migrations/0001_a.sql": "CREATE TABLE a (id INT);",
    "node_modules/db/migrations/0002_b.sql": "CREATE TABLE b (id INT);",
    "real/0001_a.sql": "CREATE TABLE a (id INT);",
    "real/0002_b.sql": "CREATE TABLE b (id INT);",
  });
  const result = api({}, deps, [], countingReadSql).database(root), value = result.value as any;
  assert.equal(value.source.path, "real");
  assert.equal(value.total.entities, 2);
});

test("SQL migrations are read in sorted name order", () => {
  const root = fixture({
    "migrations/0002_second.sql": "CREATE TABLE second (id INT);",
    "migrations/0001_first.sql": "CREATE TABLE first (id INT);",
  });
  const reads: string[] = [];
  api({}, deps, reads, countingReadSql).database(root);
  assert.deepEqual(reads.filter((r) => r.endsWith(".sql")), ["migrations/0001_first.sql", "migrations/0002_second.sql"]);
});

test("source choice ties by path when table counts are equal", () => {
  const root = fixture({
    "b/migrations/0001_a.sql": "CREATE TABLE a (id INT);",
    "b/migrations/0002_b.sql": "CREATE TABLE b (id INT);",
    "a/migrations/0001_a.sql": "CREATE TABLE a (id INT);",
    "a/migrations/0002_b.sql": "CREATE TABLE b (id INT);",
  });
  const result = api({}, deps, [], countingReadSql).database(root), value = result.value as any;
  assert.equal(value.source.path, "a/migrations");
});

test("database detection reaches sources inside workspace packages beyond root depth", () => {
  const root = fixture({
    "pnpm-workspace.yaml": "packages:\n  - 'packages/*'",
    "packages/very/deep/nested/drizzle/meta/_journal.json": JSON.stringify(journal(2)),
    "packages/very/deep/nested/drizzle/meta/0001_snapshot.json": JSON.stringify(schema()),
  });
  const result = api().database(root), value = result.value as any;
  assert.equal(value.source.path, "packages/very/deep/nested/drizzle/meta");
});

test("database detection stops at depth five from each workspace root", () => {
  const root = fixture({
    "pnpm-workspace.yaml": "packages:\n  - 'packages/*'",
    "packages/a/1/2/3/4/5/6/drizzle/meta/_journal.json": JSON.stringify(journal(2)),
    "packages/a/1/2/3/4/5/6/drizzle/meta/0001_snapshot.json": JSON.stringify(schema()),
  });
  assert.equal(api().database(root).status, "unconfigured");
});

test("found-not-read sources are reported by path only", () => {
  const root = fixture({
    "prisma/schema.prisma": "model User {}",
    "api/models.py": "class User: pass",
    "packages/data/src/schema.ts": "export const schema = {};",
    "packages/data/src/drizzle.config.ts": "export default {};",
  });
  const result = api().database(root), value = result.value as any;
  assert.equal(result.status, "unavailable");
  const kinds = new Map(value.found.map((f: any) => [f.kind, f.path]));
  assert.equal(kinds.get("prisma"), "prisma/schema.prisma");
  assert.equal(kinds.get("python-models"), "api/models.py");
  assert.equal(kinds.get("typescript-schema"), "packages/data/src/schema.ts");
});

test("credential-shaped paths are refused and do not appear in facts JSON", () => {
  const root = fixture({
    "db/password/migrations/0001_a.sql": "CREATE TABLE a (id INT);",
    "db/password/migrations/0002_b.sql": "CREATE TABLE b (id INT);",
  });
  const result = api({}, deps, [], countingReadSql).database(root);
  assert.equal(result.status, "stale");
  assert.equal(JSON.stringify(result).includes("password"), false);
});

test("database is stale when the SQL reader reports incomplete, approximate or not-understood statements", () => {
  const root = fixture({
    "migrations/0001_a.sql": "CREATE TABLE a (id INT);",
    "migrations/0002_b.sql": "CREATE TABLE b (id INT);",
  });
  for (const [label, readSql] of [
    ["incomplete", readSqlWith({ incomplete: "lexical" })],
    ["approximate", readSqlWith({ approximate: ["a"] })],
    ["notUnderstood", readSqlWith({ notUnderstood: 1 })],
  ] as [string, TestReadSql][]) {
    const result = api({}, deps, [], readSql).database(root);
    assert.equal(result.status, "stale", label);
  }
});

test("database is unavailable when a source exists but produces no tables", () => {
  const root = fixture({
    "migrations/0001_drop.sql": "DROP TABLE users;",
    "migrations/0002_drop.sql": "DROP TABLE posts;",
  });
  assert.equal(api({}, deps, [], countingReadSql).database(root).status, "unavailable");
});

test("a symlinked source file is refused and leaves siblings readable", () => {
  const outside = fixture({ "0001_a.sql": "CREATE TABLE a (id INT);" });
  const root = fixture({
    "real/0001_a.sql": "CREATE TABLE a (id INT);",
    "real/0002_b.sql": "CREATE TABLE b (id INT);",
    "other/0001_a.sql": "CREATE TABLE a (id INT);",
    "other/0002_b.sql": "CREATE TABLE b (id INT);",
  });
  fs.rmSync(path.join(root, "other/0001_a.sql"));
  fs.symlinkSync(path.join(outside, "0001_a.sql"), path.join(root, "other/0001_a.sql"));
  const result = api({}, deps, [], countingReadSql).database(root), value = result.value as any;
  assert.equal(value.source.path, "real");
  assert.equal(value.total.entities, 2);
  // The other folder keeps what could be read (one file), and says it is incomplete; the link's name is never copied.
  const other = value.alternatives.find((alt: any) => alt.path === "other");
  assert.equal(other?.tables, 1);
  assert.doesNotMatch(JSON.stringify(result), /0001_a\.sql.*outside|"other\/0001_a\.sql"/);
});

test("a symlinked migration in the only folder leaves a stale source of the files that could be read, not an unavailable one", () => {
  const outside = fixture({ "0001_a.sql": "CREATE TABLE a (id INT);" });
  const root = fixture({ "db/0002_b.sql": "CREATE TABLE b (id INT);", "db/0003_c.sql": "CREATE TABLE c (id INT);" });
  fs.symlinkSync(path.join(outside, "0001_a.sql"), path.join(root, "db/0001_a.sql"));
  const result = api({}, deps, [], countingReadSql).database(root), value = result.value as any;
  assert.equal(result.status, "stale");
  assert.equal(value.total.entities, 2);
  assert.match(result.note!, /1 migration file\(s\) not read/);
  assert.doesNotMatch(JSON.stringify(result), /0001_a/, "the refused file's name is not copied into the facts");
});

// ---- audit cycle 1 regressions: security SEC-1 .. SEC-7, code CR3 .. CR5, test-coverage TC1 .. TC4 ----

test("credential-shaped migration file names are skipped, counted, and never reach the facts JSON", () => {
  const token = "A".repeat(30);
  const root = fixture({
    "db/migrations/0001_init.sql": "CREATE TABLE a (id INT);", "db/migrations/0002_next.sql": "CREATE TABLE b (id INT);",
    "db/migrations/0003_AKIAIOSFODNN7EXAMPLE.sql": "CREATE TABLE c (id INT);", ["db/migrations/0004_npm_" + token + ".sql"]: "CREATE TABLE d (id INT);",
    "db/migrations/0005_ghp_abcdefghijklmnopqrstuvwxyz0123.sql": "CREATE TABLE e (id INT);", "db/migrations/0006_<img src=x>.sql": "CREATE TABLE f (id INT);",
    "db/migrations/0007_add_password_reset.sql": "CREATE TABLE g (id INT);",
  });
  const result = api({}, deps, [], countingReadSql).database(root);
  const text = JSON.stringify(result);
  assert.equal((result.value as any).total.entities, 3, "a, b and g: a credential WORD in a migration name is ordinary; a credential SHAPE or markup is not");
  assert.equal(result.status, "stale");
  assert.match(result.note!, /4 migration file\(s\) not read/);
  for (const raw of ["AKIA", "npm_", "ghp_", "<img", token]) assert.equal(text.includes(raw), false, `${raw} must not appear in the facts`);
});

test("a workspace package name that is a credential is redacted before markup substitution (audit C2-SEC-2)", () => {
  const token = `ghp_${"A".repeat(30)}`;
  const root = fixture({ "package.json": JSON.stringify({ workspaces: ["apps/web"] }), "apps/web/package.json": JSON.stringify({ name: token }) });
  const result = api().workspaces(root);
  assert.equal(JSON.stringify(result).includes("AAAAAAAA"), false);
  assert.equal((result.value as any).packages[0].name, "(redacted)");
});

test("workspace configuration that is found but cannot be read, or cannot be parsed, is not 'unconfigured' (audit C2-SEC-4)", () => {
  const outside = fixture({ "pnpm-workspace.yaml": "packages:\n  - apps/*\n" });
  const linked = fixture({ "apps/a/package.json": "{}" });
  fs.symlinkSync(path.join(outside, "pnpm-workspace.yaml"), path.join(linked, "pnpm-workspace.yaml"));
  assert.equal(api().workspaces(linked).status, "stale");
  const multiline = api().workspaces(fixture({ "pnpm-workspace.yaml": "packages: [\n  'apps/a',\n  'apps/b',\n]\n", "apps/a/package.json": "{}", "apps/b/package.json": "{}" }));
  assert.deepEqual((multiline.value as any).packages.map((item: any) => item.path), ["apps/a", "apps/b"], "a flow list may span lines");
  const dashes = api().workspaces(fixture({ "pnpm-workspace.yaml": "packages:\n- 'apps/*'\n- libs/x\n", "apps/a/package.json": "{}", "libs/x/package.json": "{}" }));
  assert.deepEqual((dashes.value as any).packages.map((item: any) => item.path), ["apps/a", "libs/x"], "dashes at column 0 are items");
});

test("a workspace glob cut at the entry budget is stale and says so, a package named twice counts once, a missing 21st literal is not an overflow", () => {
  const dirs: Record<string, string> = {};
  for (const name of ["a", "b", "c"]) dirs[`apps/${name}/package.json`] = "{}";
  const cut = api({ entriesPerDir: 2 }).workspaces(fixture({ ...dirs, "pnpm-workspace.yaml": "packages:\n  - apps/*\n" }));
  assert.equal(cut.status, "stale");
  assert.match(cut.note!, /entry budget/);
  const twice = api().workspaces(fixture({ ...dirs, "pnpm-workspace.yaml": "packages:\n  - apps/a\n", "package.json": JSON.stringify({ workspaces: ["apps/a"] }) }));
  assert.deepEqual((twice.value as any).packages.map((item: any) => item.path), ["apps/a"]);
  const many: Record<string, string> = { "pnpm-workspace.yaml": "packages:\n  - pkgs/*\n  - missing-literal\n" };
  for (let i = 0; i < 20; i++) many[`pkgs/p${String(i).padStart(2, "0")}/package.json`] = "{}";
  assert.equal(api().workspaces(fixture(many)).status, "observed");
});

test("migrations replay in numeric prefix order, so 10_ follows 9_ and not 1_", () => {
  const root = fixture({ "db/1_a.sql": "CREATE TABLE a (id INT);", "db/2_b.sql": "ALTER TABLE a ADD COLUMN x INT;", "db/10_c.sql": "ALTER TABLE a ADD COLUMN y INT;" });
  const result = api().database(root), value = result.value as any;
  assert.deepEqual(value.entities[0].columns.map((column: any) => column.name), ["id", "x", "y"]);
  assert.equal(result.status, "observed");
});
test("credential-shaped folder names are refused with _ and - as separators, while tokenizer and design-tokens are not", () => {
  for (const [dir, refused] of [["db_password_prod", true], ["my-secret-dir", true], ["AKIAIOSFODNN7EXAMPLE", true], ["tokenizer", false], ["design-tokens", false], ["secrets-of-the-sea", false]] as const) {
    const root = fixture({ [`${dir}/migrations/0001_a.sql`]: "CREATE TABLE a (id INT);", [`${dir}/migrations/0002_b.sql`]: "CREATE TABLE b (id INT);" });
    const result = api({}, deps, [], countingReadSql).database(root);
    assert.equal(result.value !== null && (result.value as any).total.entities === 2, !refused, `${dir}: ${JSON.stringify(result).slice(0, 160)}`);
    if (refused) assert.equal(JSON.stringify(result).includes(dir), false, `${dir} must not appear in the facts`);
  }
});

test("a migration folder of one file with a Drizzle journal is a source; one file without a journal is not", () => {
  const withJournal = fixture({ "drizzle/0000_init.sql": "CREATE TABLE t (id INT);", "drizzle/meta/_journal.json": JSON.stringify(journal(1)) });
  const sourced = api({}, deps, [], countingReadSql).database(withJournal);
  assert.equal((sourced.value as any)?.total.entities, 1);
  assert.equal((sourced.value as any).source.kind, "sql-migrations");
  const alone = fixture({ "db/0000_init.sql": "CREATE TABLE t (id INT);" });
  const none = api({}, deps, [], countingReadSql).database(alone);
  assert.equal(none.status, "unconfigured");
  assert.equal(none.value, null);
});

test("workspaces: packages may follow other top-level keys, a quoted path may contain #, and a flow list is read", () => {
  const files = { "packages/a/package.json": JSON.stringify({ name: "a" }), "packages/good/package.json": JSON.stringify({ name: "good" }), "a#b/package.json": JSON.stringify({ name: "hash" }), "x/package.json": JSON.stringify({ name: "x" }), "y/package.json": JSON.stringify({ name: "y" }) };
  const names = (yaml: string) => { const r = api().workspaces(fixture({ ...files, "pnpm-workspace.yaml": yaml })); return ((r.value as any)?.packages ?? []).map((p: any) => p.path).sort(); };
  assert.deepEqual(names("catalog:\n  react: 19\npackages:\n  - packages/*\n"), ["packages/a", "packages/good"], "keys before packages");
  assert.deepEqual(names("packages:\n  - 'a#b' # a comment\n  - packages/a\noverrides:\n  x: 1\n"), ["a#b", "packages/a"], "a # inside quotes belongs to the path");
  assert.deepEqual(names("packages: [\"x\", 'y']\n"), ["x", "y"], "flow list");
  assert.deepEqual(names("overrides:\n  - packages/a\n"), [], "a list under another key is not a workspace list");
});

test("workspaces: more than 20 packages is stale with a note, and a list that was entirely refused is not unconfigured", () => {
  const many: Record<string, string> = {};
  for (let i = 0; i < 25; i++) many[`pkgs/p${String(i).padStart(2, "0")}/package.json`] = JSON.stringify({ name: `p${i}` });
  const capped = api().workspaces(fixture({ ...many, "pnpm-workspace.yaml": "packages:\n  - pkgs/*\n" }));
  assert.equal(capped.status, "stale");
  assert.equal((capped.value as any).packages.length, 20);
  assert.match(capped.note!, /more than 20 workspace packages/);
  const refused = api().workspaces(fixture({ "pnpm-workspace.yaml": "packages:\n  - db_password_prod/app\n" }));
  assert.notEqual(refused.status, "unconfigured", "an entry that was refused is not the same as no workspace configuration");
});

test("SQL bytes are bounded across files and across folders, and a skipped file makes the source stale", () => {
  const big = `CREATE TABLE t (${"c int, ".repeat(100)}z int);\n` + "-- ".padEnd(900_000, "x");
  const files: Record<string, string> = {};
  for (let i = 0; i < 12; i++) files[`db/${String(i).padStart(4, "0")}_m.sql`] = big.replace("TABLE t", `TABLE t${i}`);
  const result = api({}, deps, [], countingReadSql).database(fixture(files));
  assert.equal(result.status, "stale");
  assert.match(result.note!, /migration file\(s\) not read/);
  assert.ok((result.value as any).total.entities < 12, "files past the byte budget were not read");
});

test("directory probes are bounded: an enormous sibling list stops at a budget and says so", () => {
  const files: Record<string, string> = {};
  for (let i = 0; i < 80; i++) files[`d${String(i).padStart(3, "0")}/f.txt`] = "x";
  const result = api({ dirsVisited: 10 }, deps, [], countingReadSql).database(fixture(files));
  assert.equal(result.status, "stale", "a budget hit is stale, never unconfigured");
});

test("an isolated one-file folder is not a migration source, and a larger source beside it does not hide that", () => {
  const solo = api({}, deps, [], countingReadSql).database(fixture({ "solo/0001_a.sql": "CREATE TABLE only_one (id INT);" }));
  assert.equal(solo.status, "unconfigured");
  const beside = api({}, deps, [], countingReadSql).database(fixture({ "solo/0001_a.sql": "CREATE TABLE only_one (id INT);", "big/0001_a.sql": "CREATE TABLE a (id INT);", "big/0002_b.sql": "CREATE TABLE b (id INT);" }));
  assert.equal((beside.value as any).alternatives.some((alt: any) => alt.path === "solo"), false);
  assert.equal(JSON.stringify(beside).includes("only_one"), false);
});


test("the no-process guard covers the new workspaces reader", () => {
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
  assert.equal(readers.workspaces(root).status, "unconfigured");
  assert.equal(forbidden, 0);
});

// Live-project regression tests (coordinator live-check)

test("normal dot folders and underscores are not treated as refused directory entries", () => {
  const root = fixture({
    ".git/config": "",
    "node_modules/x/y.sql": "CREATE TABLE a (id INT);",
    "_archive/migrations/0001_a.sql": "CREATE TABLE a (id INT);",
    "_archive/migrations/0002_b.sql": "CREATE TABLE b (id INT);",
  });
  const result = api({}, deps, [], countingReadSql).database(root);
  assert.equal(result.status, "observed");
  assert.equal((result.value as any).source.path, "_archive/migrations");
});

test("a complete snapshot beats same-project SQL but loses to a larger unrelated SQL source", () => {
  const root = fixture({
    "packages/data/src/drizzle/meta/_journal.json": JSON.stringify(journal(2)),
    "packages/data/src/drizzle/meta/0001_snapshot.json": JSON.stringify(schema()),
    "packages/data/src/drizzle/0002_extra.sql": "CREATE TABLE extra (id INT);",
    "apps/guaca-app/src/db/migrations/0001_a.sql": "CREATE TABLE a (id INT); CREATE TABLE b (id INT); CREATE TABLE c (id INT);",
    "apps/guaca-app/src/db/migrations/0002_b.sql": "CREATE TABLE d (id INT);",
  });
  const result = api({}, deps, [], countingReadSql).database(root), value = result.value as any;
  assert.equal(result.status, "observed");
  assert.equal(value.source.path, "apps/guaca-app/src/db/migrations");
  assert.equal(value.total.entities, 4);
});

test("schema.ts is found when a drizzle config sits in an ancestor directory", () => {
  const root = fixture({
    "packages/data/drizzle.config.ts": "export default {};",
    "packages/data/src/schema.ts": "export const schema = {};",
  });
  const result = api().database(root), value = result.value as any;
  assert.equal(result.status, "unavailable");
  assert.equal(value.found[0].path, "packages/data/src/schema.ts");
});

test("ignored is not set when same-project SQL migrations are a subset of the snapshot", () => {
  const root = fixture({
    "drizzle/meta/_journal.json": JSON.stringify(journal(2)),
    "drizzle/meta/0001_snapshot.json": JSON.stringify(schema()),
    "drizzle/0002_extra.sql": "CREATE TABLE users (id INT);",
    "drizzle/0003_extra.sql": "CREATE TABLE posts (id INT);",
  });
  const result = api({}, deps, [], countingReadSql).database(root), value = result.value as any;
  assert.equal(result.status, "observed");
  assert.equal(value.source.kind, "drizzle-snapshot");
  assert.equal(value.source.ignored, undefined);
});

// ---- audit cycle 3 regressions (security C3-SEC-1/2, code C3-CR-1/2/4) ----

test("credentialShaped sees a key anywhere: after 200 characters, after a separator, fullwidth, and refuses a segment too long to scan", () => {
  const key = "AKIAABCDEFGHIJKLMNOP";
  assert.equal(credentialShaped(`${"a".repeat(210)}/${key}`), true, "a late path segment");
  assert.equal(credentialShaped(`${"a".repeat(210)}_${key}`), true, "late in one name, after a separator");
  assert.equal(credentialShaped(`0002_npm_${"A".repeat(30)}`), true, "no word boundary before npm_");
  assert.equal(credentialShaped("ＡＫＩＡＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰ"), true, "fullwidth form of a key");
  assert.equal(credentialShaped("a".repeat(300)), true, "a segment over 256 characters is refused, never skipped");
  assert.equal(credentialShaped("apps/web/src/tokenizer-2"), false);
  const started = performance.now();
  for (let i = 0; i < 200; i++) credentialShaped(`${"a-".repeat(120)}/${"b_".repeat(120)}`);
  assert.ok(performance.now() - started < 3000, "hostile separators stay cheap");
});

test("a workspace package whose name hides a credential in a fullwidth or late form is redacted", () => {
  const late = fixture({ "package.json": JSON.stringify({ workspaces: ["apps/web"] }), "apps/web/package.json": JSON.stringify({ name: `${"a".repeat(210)}_AKIAABCDEFGHIJKLMNOP` }) });
  assert.equal((api().workspaces(late).value as any).packages[0].name, "(redacted)");
  const wide = fixture({ "package.json": JSON.stringify({ workspaces: ["apps/web"] }), "apps/web/package.json": JSON.stringify({ name: "ＡＫＩＡＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰ" }) });
  assert.equal((api().workspaces(wide).value as any).packages[0].name, "(redacted)");
});

test("a package.json that exists but is invalid or oversized is a refusal, not an absence; an unterminated flow list is not read as complete", () => {
  const broken = api().workspaces(fixture({ "package.json": "{broken" }));
  assert.notEqual(broken.status, "unconfigured");
  const beside = api().workspaces(fixture({ "pnpm-workspace.yaml": "packages:\n  - apps/*\n", "package.json": "{broken", "apps/a/package.json": "{}" }));
  assert.equal(beside.status, "stale");
  const open = api().workspaces(fixture({ "pnpm-workspace.yaml": "packages: [apps/web\n", "apps/web/package.json": "{}" }));
  assert.equal((open.value as any).packages.length, 0, "the unterminated list is not read as a package");
  assert.equal((open.value as any).unresolved, 1);
});
