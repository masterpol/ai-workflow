// Tests for facts-sql.mts, the pure SQL DDL reader behind /state project depth.
//
// Fixture provenance (K5: dialect forms come from real migrations, not from the reader's own grammar):
//  - SQLITE_*: the forms of three real Drizzle/libSQL migrations of an installed project (0000 CREATE TABLE with
//    backticks, FOREIGN KEY constraints, CREATE UNIQUE INDEX glued to `--> statement-breakpoint`; 0001 DROP INDEX and
//    `ALTER COLUMN ... TO`; 0002 `ALTER TABLE ... ADD` without COLUMN and an inline REFERENCES). Table and column names
//    are renamed; the statement shapes are kept. The SQLite expectations below were checked against the sqlite3 CLI
//    (3.54.0, 2026-11-24): the fixture minus its `ALTER COLUMN ... TO` line (libSQL syntax, which sqlite3 rejects) was
//    loaded and `pragma_table_info`, `pragma_foreign_key_list` and `pragma_index_list` agreed with the expected schema.
//  - PG_*: the forms of the Postgres migrations of another installed project (composite PRIMARY KEY, `CONSTRAINT ... UNIQUE`,
//    CHECK with regex strings, `ENABLE ROW LEVEL SECURITY`, `ADD CONSTRAINT ... FOREIGN KEY ... "public"."t"`, `CREATE INDEX
//    ... USING btree`, REVOKE, a `$$` function body with `;` inside, CREATE TRIGGER, `DROP CONSTRAINT`, `ADD COLUMN`). Renamed.
//    No Postgres engine is installed here, so these expectations were checked by hand against the Postgres grammar.
// Hostile-input tests: doubling timing (ratio under 3, own deadline), a 5 MB file, 10 000 statements, repeated openers, and
// two mutants (cursor-advance guard, dollar-quote branch) that must make the suite's probes fail.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readSql, type SqlFile } from "./facts-sql.mts";
import { createTestDeps, tempFixture, urlPath } from "./runtime/test-helpers.mts";

const deps = createTestDeps();

const f = (text: string, path = "m.sql"): SqlFile => ({ path, text });
const bt = (s: string) => s.replaceAll("§", "`");
const col = (name: string, type: string, pk = false, nullable = !pk) => ({ name, type, pk, nullable });
const rel = (from: string, fromColumns: string[], to: string, toColumns: string[], fromSchema = "", toSchema = "") => ({ from, fromSchema, fromColumns, to, toSchema, toColumns });
const BIG = { filesMax: 1e9, bytesPerFile: 1e9, bytesTotal: 1e9, statementsMax: 1e9, entitiesMax: 1e9, fieldsMax: 1e9, relationshipsMax: 1e9 };

// FIXTURE-SQLITE-BEGIN
const SQLITE_0 = bt(`CREATE TABLE §app_users§ (
	§id§ integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	§email§ text NOT NULL,
	§created_at§ text DEFAULT '2026-01-01T00:00:00.000Z' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX §app_users_email_unique§ ON §app_users§ (§email§);--> statement-breakpoint
CREATE TABLE §groups§ (
	§id§ integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	§name§ text NOT NULL,
	§active§ integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE §people§ (
	§id§ integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	§name§ text NOT NULL,
	§group_id§ integer,
	FOREIGN KEY (§group_id§) REFERENCES §groups§(§id§) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE §person_roles§ (
	§id§ integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	§person_id§ integer NOT NULL,
	§label§ text NOT NULL,
	FOREIGN KEY (§person_id§) REFERENCES §people§(§id§) ON UPDATE no action ON DELETE no action
);
`);
const SQLITE_1 = bt(`DROP INDEX "app_users_email_unique";--> statement-breakpoint
ALTER TABLE §app_users§ ALTER COLUMN "created_at" TO "created_at" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX §app_users_email_unique§ ON §app_users§ (§email§);`);
const SQLITE_2 = bt(`ALTER TABLE §people§ ADD §prefix§ text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE §people§ ADD §is_lead§ integer NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE §groups§ ADD §lead_person_id§ integer REFERENCES people(id);`);
// FIXTURE-SQLITE-END

const PG_0 = `CREATE TABLE "bookmarks" (
	"account_id" text NOT NULL,
	"venue_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_pk" PRIMARY KEY("account_id","venue_id")
);
--> statement-breakpoint
ALTER TABLE "bookmarks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_id_nonblank" CHECK (btrim("accounts"."id") <> '')
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"note" varchar(255),
	"tags" text[],
	CONSTRAINT "venues_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "venues_ext_valid" CHECK (btrim("venues"."external_id") <> '' AND char_length("venues"."external_id") <= 512)
);
--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_account_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_venue_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookmarks_venue_idx" ON "bookmarks" USING btree ("venue_id");`;
const PG_1 = `REVOKE ALL ON TABLE "accounts", "venues", "bookmarks" FROM PUBLIC, anon, authenticated;--> statement-breakpoint
CREATE FUNCTION "touch"() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
	NEW."updated_at" = now();
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "accounts_touch" BEFORE UPDATE ON "accounts" FOR EACH ROW EXECUTE FUNCTION "touch"();`;
const PG_2 = `ALTER TABLE "accounts" DROP CONSTRAINT "accounts_id_nonblank";--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_id_valid" CHECK ("accounts"."id" ~ '^[!-~]{1,128}$');--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_email_valid" CHECK ("accounts"."email" IS NULL OR (char_length("accounts"."email") BETWEEN 1 AND 320 AND "accounts"."email" !~ '^[[:space:]]|[[:space:]]$'));`;

test("sqlite fixture: backticks, ADD without COLUMN, ALTER COLUMN TO, breakpoint glue", () => {
  const r = readSql([f(SQLITE_0, "0000.sql"), f(SQLITE_1, "0001.sql"), f(SQLITE_2, "0002.sql")]);
  assert.deepEqual(r, {
    dialect: "sqlite",
    entities: [
      { name: "app_users", schema: "", columns: [col("id", "integer", true), col("email", "text", false, false), col("created_at", "text", false, false)], unique: [["email"]] },
      { name: "groups", schema: "", columns: [col("id", "integer", true), col("name", "text", false, false), col("active", "integer", false, false), col("lead_person_id", "integer")], unique: [] },
      { name: "people", schema: "", columns: [col("id", "integer", true), col("name", "text", false, false), col("group_id", "integer"), col("prefix", "text", false, false), col("is_lead", "integer", false, false)], unique: [] },
      { name: "person_roles", schema: "", columns: [col("id", "integer", true), col("person_id", "integer", false, false), col("label", "text", false, false)], unique: [] },
    ],
    relationships: [rel("groups", ["lead_person_id"], "people", ["id"]), rel("people", ["group_id"], "groups", ["id"]), rel("person_roles", ["person_id"], "people", ["id"])],
    total: { entities: 4, relationships: 3 },
    approximate: ["app_users"],
    notUnderstood: 1,
    incomplete: "none",
  });
});

test("sqlite fixture: ALTER COLUMN TO counts as not understood and marks its table approximate", () => {
  const r = readSql([f(SQLITE_0), f(SQLITE_1)]);
  assert.equal(r.notUnderstood, 1);
  assert.deepEqual(r.approximate, ["app_users"]);
});

test("postgres fixture: composite pk, checks, public schema, $$ body, grants", () => {
  const r = readSql([f(PG_0, "0000.sql"), f(PG_1, "0001.sql"), f(PG_2, "0002.sql")]);
  assert.equal(r.dialect, "postgresql");
  assert.deepEqual(r.entities, [
    { name: "bookmarks", schema: "", columns: [col("account_id", "text", true), col("venue_id", "uuid", true), col("created_at", "timestamp with time zone", false, false)], unique: [] },
    { name: "accounts", schema: "", columns: [col("id", "text", true), col("created_at", "timestamp with time zone", false, false), col("email", "text"), col("verified", "boolean", false, false)], unique: [] },
    { name: "venues", schema: "", columns: [col("id", "uuid", true), col("external_id", "text", false, false), col("note", "varchar(255)"), col("tags", "text[]")], unique: [["external_id"]] },
  ]);
  assert.deepEqual(r.relationships, [rel("bookmarks", ["account_id"], "accounts", ["id"]), rel("bookmarks", ["venue_id"], "venues", ["id"])]);
  assert.equal(r.notUnderstood, 2); // CREATE FUNCTION and CREATE TRIGGER; the body's `;` do not add statements
  assert.deepEqual(r.approximate, []);
  assert.equal(r.incomplete, "none");
});

test("identifier styles: double quotes, brackets, schema prefix, unquoted case", () => {
  const r = readSql([f(`CREATE TABLE [dbo].[Orders] ([Id] int PRIMARY KEY, "Note" varchar(10)); CREATE TABLE app.Items (id int, order_id int REFERENCES dbo.Orders(Id)); ALTER TABLE items ADD COLUMN qty int;`)]);
  assert.deepEqual(r.entities.map((e) => [e.schema, e.name, e.columns.map((c) => c.name)]), [["dbo", "Orders", ["Id", "Note"]], ["app", "items", ["id", "order_id"]]]); // unquoted names fold to lower case, quoted ones keep theirs
  assert.deepEqual(r.relationships, [rel("items", ["order_id"], "Orders", ["Id"], "app", "dbo")]); // an unquoted reference finds the one table or column that matches ignoring case, and is emitted under its real name
  assert.equal(r.notUnderstood, 1); // ALTER on `items` (no schema) does not match app.items: counted, not guessed
  assert.deepEqual(r.approximate, ["items"]);
});

test("table constraints: unique, add primary key, add foreign key, drop column, drop constraint", () => {
  const r = readSql([f(`
    CREATE TABLE a (id int, k text, UNIQUE (k), CONSTRAINT u2 UNIQUE (id, k));
    CREATE TABLE b (id int, a_id int, junk text);
    ALTER TABLE a ADD PRIMARY KEY (id);
    ALTER TABLE b ADD CONSTRAINT bfk FOREIGN KEY (a_id) REFERENCES a;
    ALTER TABLE b DROP COLUMN junk;
    ALTER TABLE a DROP CONSTRAINT u2;
  `)]);
  const [a, b] = r.entities;
  assert.deepEqual(a.unique, [["k"]]);
  assert.equal(a.columns[0].pk, true);
  assert.deepEqual(b.columns.map((c) => c.name), ["id", "a_id"]);
  assert.deepEqual(r.relationships, [rel("b", ["a_id"], "a", ["id"])]); // target columns fall back to the target's key
  assert.equal(r.notUnderstood, 0);
  const dropped = readSql([f(`CREATE TABLE a (id int PRIMARY KEY); CREATE TABLE b (x int REFERENCES a(id)); ALTER TABLE b DROP COLUMN x;`)]);
  assert.deepEqual(dropped.relationships, []);
});

test("DROP TABLE then re-CREATE replays in order", () => {
  const r = readSql([f(`CREATE TABLE t (a int, b int); DROP TABLE IF EXISTS t;`, "1.sql"), f(`CREATE TABLE t (c int);`, "2.sql")]);
  assert.deepEqual(r.entities.map((e) => e.columns.map((c) => c.name)), [["c"]]);
});

test("not understood statements are counted; RENAME and ALTER COLUMN mark their table approximate", () => {
  const r = readSql([f(`
    CREATE TABLE t (id int);
    ALTER TABLE t RENAME TO u;
    ALTER TABLE t ALTER COLUMN id TYPE bigint;
    CREATE FUNCTION f() RETURNS int AS $$ SELECT 1; $$ LANGUAGE sql;
    CREATE TRIGGER x BEFORE UPDATE ON t FOR EACH ROW EXECUTE FUNCTION f();
    INSERT INTO t VALUES (1);
    GRANT ALL ON t TO someone;
  `)]);
  assert.equal(r.notUnderstood, 5);
  assert.deepEqual(r.approximate, ["t"]);
  assert.equal(r.incomplete, "none");
});

test("unterminated quote, comment and dollar quote set incomplete lexical", () => {
  for (const tail of [`'open`, `"open`, `[open`, `/* open`, `$tag$ open`, `$$ open`]) {
    const r = readSql([f(`CREATE TABLE ok (id int); ${tail}; CREATE TABLE lost (id int);`)]);
    assert.equal(r.incomplete, "lexical", tail);
    assert.deepEqual(r.entities.map((e) => e.name), ["ok"], tail);
  }
  assert.equal(readSql([f(`CREATE TABLE a (id int); -- trailing comment without newline`)]).incomplete, "none");
});

test("budgets: each hit sets incomplete budget and keeps what was read", () => {
  const two = [f(`CREATE TABLE a (id int);`), f(`CREATE TABLE b (id int);`)];
  assert.equal(readSql(two, { filesMax: 1 }).incomplete, "budget");
  assert.deepEqual(readSql(two, { filesMax: 1 }).entities.map((e) => e.name), ["a"]);
  assert.equal(readSql(two, { bytesPerFile: 5 }).incomplete, "budget");
  assert.equal(readSql(two, { bytesTotal: 30 }).entities.length, 1);
  assert.equal(readSql(two, { statementsMax: 1 }).incomplete, "budget");
  const r = readSql([f(`CREATE TABLE a (x int, y int); CREATE TABLE b (id int REFERENCES a(x)); CREATE TABLE c (id int REFERENCES a(x));`)], { entitiesMax: 2, fieldsMax: 1, relationshipsMax: 1 });
  assert.equal(r.incomplete, "budget");
  assert.deepEqual([r.entities.length, r.entities[0].columns.length, r.relationships.length], [2, 1, 1]);
  assert.deepEqual(r.total, { entities: 3, relationships: 2 });
});

test("hostile names are kept as text and never reach prototypes", () => {
  const names = ['a"b', "x.y", "~tilde", "sp ace", "new\nline", "__proto__", "constructor", "toString"];
  const q = (n: string) => `"${n.replaceAll('"', '""')}"`;
  const sql = names.map((n) => `CREATE TABLE ${q(n)} (${q(n)} int PRIMARY KEY, ${q("__proto__")} int REFERENCES ${q("__proto__")}(${q("constructor")}));`).join("\n");
  const r = readSql([f(sql)]);
  assert.deepEqual(r.entities.map((e) => e.name), names);
  assert.deepEqual(r.entities[0].columns[0].name, 'a"b');
  assert.equal(r.relationships.length, names.length);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
  assert.equal(Object.getPrototypeOf(r.entities[5].columns[0]), Object.prototype);
  const dotted = readSql([f(`CREATE TABLE "my.schema"."a.b" (id int);`)]);
  assert.deepEqual([dotted.entities[0].schema, dotted.entities[0].name], ["my.schema", "a.b"]);
});

const stmts = (n: number) => Array.from({ length: n }, (_, i) => `CREATE TABLE t${i} (id integer PRIMARY KEY, a text NOT NULL, b integer REFERENCES t0(id));\n`).join("");
const timed = (fn: () => void) => { const t = performance.now(); fn(); return performance.now() - t; };

// Scaling ratios on a busy machine. Wall time over "3 small runs, then 3 large" failed on linear code, so:
// - this thread's processor time, so waiting is not counted, nor is other threads' work (it still varies with load, only less);
// - equal work per sample: the small input twice against the large input once, because a shorter sample gets better
//   conditions than a longer one can; the two alternate, so both see the same stretches of load;
// - a result at the limit or above is measured again, a bounded number of times. Only a cost that is mostly super-linear is
//   caught: a purely quadratic one reads near 4, and a mix with a linear part reads between 2 and 4.
// t1 is the cost of one small run (floor 1 ms), so a linear function reads t2 / t1 near 2.
const RATIO_LIMIT = 3;
// Older runtimes without the thread clock fall back to the process clock.
type CpuSource = Partial<Pick<NodeJS.Process, "threadCpuUsage">> & Pick<NodeJS.Process, "cpuUsage">;
const cpuClock = (since?: NodeJS.CpuUsage, source: CpuSource = process) => (source.threadCpuUsage ?? source.cpuUsage).call(source, since);
const cpuTimed = (fn: () => void) => { const u = cpuClock(); fn(); const d = cpuClock(u); return (d.user + d.system) / 1000; };
const scaling = (small: () => void, large: () => void, time: (fn: () => void) => number = cpuTimed) => {
  let t1 = 0;
  let t2 = 0;
  for (let attempt = 0; attempt < 5; attempt++) {
    let pair = Infinity;
    t2 = Infinity;
    for (let round = 0; round < 7; round++) {
      pair = Math.min(pair, time(() => { small(); small(); }));
      t2 = Math.min(t2, time(large));
    }
    t1 = Math.max(pair / 2, 1);
    if (t2 / t1 < RATIO_LIMIT) break;
  }
  return { t1, t2 };
};

// A scripted machine: each input costs fixed units and `slowdown` decides how much a whole sample is stretched.
const scripted = (smallCost: number, largeCost: number, slowdown: (cost: number, sample: number) => number) => {
  let units = 0;
  let samples = 0;
  return {
    small: () => { units += smallCost; }, large: () => { units += largeCost; },
    time: (fn: () => void) => { units = 0; fn(); return units * slowdown(units, ++samples); },
    samples: () => samples,
  };
};

test("scaling: by default, time spent waiting is not counted", () => {
  const sleep = (ms: number) => () => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); };
  // On a wall clock these read as a ratio of 5.
  const { t1, t2 } = scaling(sleep(5), sleep(25));
  assert.ok(t2 < 5 && t2 / t1 < RATIO_LIMIT, `a 25 ms sleep counted as ${t2}ms (ratio ${t2 / t1})`);
});

test("scaling: the thread clock is used when there is one, else the process clock", () => {
  const read = (user: number) => () => ({ user, system: 0 });
  assert.equal(cpuClock(undefined, { threadCpuUsage: read(1), cpuUsage: read(2) }).user, 1);
  assert.equal(cpuClock(undefined, { cpuUsage: read(2) }).user, 2);
});

test("scaling: a ratio at the limit is measured again and one just under it is not", () => {
  const at = scripted(10, 10 * RATIO_LIMIT, () => 1);
  scaling(at.small, at.large, at.time);
  assert.equal(at.samples(), 70);
  const under = scripted(10, 29, () => 1);
  scaling(under.small, under.large, under.time);
  assert.equal(under.samples(), 14);
  assert.equal(RATIO_LIMIT, 3);
});

test("scaling: the fastest sample counts, wherever it falls in a measurement", () => {
  // Samples alternate pair, large. Every large sample is slowed except the third.
  const m = scripted(10, 20, (cost, sample) => (sample % 2 === 0 && sample !== 6 ? 4 : 1));
  const { t1, t2 } = scaling(m.small, m.large, m.time);
  assert.deepEqual([t1, t2, m.samples()], [10, 20, 14]);
});

test("scaling: one small run counts as at least 1 ms", () => {
  const m = scripted(0.1, 0.2, () => 1);
  assert.equal(scaling(m.small, m.large, m.time).t1, 1);
});

test("scaling: a machine that only slows longer samples does not change a linear ratio", () => {
  const m = scripted(10, 20, (cost) => (cost > 10 ? 4 : 1));
  const { t1, t2 } = scaling(m.small, m.large, m.time);
  assert.equal(t2 / t1, 2);
});

test("scaling: a bad stretch of load is measured again", () => {
  const m = scripted(10, 20, (cost, sample) => (sample <= 14 && sample % 2 === 0 ? 4 : 1));
  const { t1, t2 } = scaling(m.small, m.large, m.time);
  assert.equal(t2 / t1, 2);
  assert.equal(m.samples(), 28);
});

test("scaling: a quadratic cost stays over the limit after the last repeat", () => {
  const m = scripted(10, 40, () => 1);
  const { t1, t2 } = scaling(m.small, m.large, m.time);
  assert.equal(t2 / t1, 4);
  assert.equal(m.samples(), 70);
});

test("5 MB file and 10 000 statements finish inside their own deadline", { timeout: 30000 }, () => {
  const big = stmts(60000);
  assert.ok(big.length > 5_000_000);
  let r!: ReturnType<typeof readSql>;
  const ms = timed(() => { r = readSql([f(big)], BIG); });
  assert.ok(ms < 10000, `5 MB took ${ms}ms`);
  assert.deepEqual([r.total.entities, r.incomplete], [60000, "none"]);
  assert.equal(readSql([f(big)]).incomplete, "budget"); // default budgets refuse it without reading
  const ten = readSql([f(stmts(10000))], BIG);
  assert.deepEqual([ten.total.entities, ten.incomplete], [10000, "none"]);
  assert.equal(readSql([f(stmts(10000))]).incomplete, "budget");
});

test("repeated unterminated openers stay linear and finish", { timeout: 30000 }, () => {
  for (const unit of [`'x `, `"x `, `/* x `, `$a$ x `, `[x `, `$$`, `$a$a$a$`, `-- c\n'`, `(`, ``]) {
    const small = `CREATE TABLE t (a int); ` + unit.repeat(20000);
    const ms = timed(() => assert.ok(readSql([f(small)], BIG).entities.length >= 0));
    assert.ok(ms < 3000, `${JSON.stringify(unit)} took ${ms}ms`);
  }
});

test("doubling the input keeps the time ratio under 3", { timeout: 60000 }, () => {
  const cases: [string, (n: number) => string, (n: number) => number][] = [
    ["valid statements", (n) => stmts(n), (n) => n],
    ["quoted noise", (n) => `CREATE TABLE a (id int); ` + `'it''s' "q""x" /* c */ -- l\n`.repeat(n), () => 1],
    ["unterminated openers", (n) => `CREATE TABLE a (id int); ` + `$a$ ' " /* [ `.repeat(n), () => 1],
  ];
  for (const [name, gen, tables] of cases) {
    const one = gen(30000);
    const two = gen(60000);
    let small: ReturnType<typeof readSql> | undefined;
    let large: ReturnType<typeof readSql> | undefined;
    const { t1, t2 } = scaling(() => { small = readSql([f(one)], BIG); }, () => { large = readSql([f(two)], BIG); });
    assert.deepEqual([small?.total.entities, large?.total.entities], [tables(30000), tables(60000)], name);
    assert.ok(t2 < 5000, `${name} doubled took ${t2}ms`);
    assert.ok(t2 / t1 < RATIO_LIMIT, `${name}: ratio ${(t2 / t1).toFixed(2)} (${t1.toFixed(1)}ms -> ${t2.toFixed(1)}ms)`);
  }
});

// Mutants: the probe runs in a child process (a hang is killed), against a copy of the reader with one safeguard removed.
const SRC = deps.fs.readFileSync(urlPath(new URL("./facts-sql.mts", import.meta.url)));
const FLAGS = process.versions.bun ? [] : ["--experimental-strip-types", "--disable-warning=ExperimentalWarning"];
function probe(mutate: (s: string) => string) {
  const mutated = mutate(SRC);
  const probeText = (reader: string) => `import { readSql } from ${JSON.stringify(deps.path.join(reader, "reader.mts"))};
const a = readSql([{ path: "a", text: "CREATE TABLE a (id int);\\n\\tCREATE TABLE b (id int);" }]);
const b = readSql([{ path: "b", text: ${JSON.stringify(PG_1)} }]);
process.stdout.write(JSON.stringify([a.entities.length, b.notUnderstood]));`;
  const dir = tempFixture(deps, { "reader.mts": mutated });
  try {
    deps.fs.writeFileSync(deps.path.join(dir, "probe.mts"), probeText(dir));
    const r = deps.child.runSync(deps.proc.execPath, [...FLAGS, deps.path.join(dir, "probe.mts")], { cwd: dir, timeoutMs: 4000 });
    return { mutated, out: r.status === 0 ? r.stdout : `failed:${r.status ?? r.signal ?? r.error?.message}` };
  } finally { deps.fs.rmSync(dir, { recursive: true, force: true }); }
}

test("mutant: the unmodified reader passes the probe", () => {
  assert.equal(probe((s) => s).out, "[2,2]");
});

test("mutant: removing the cursor-advance guard is caught", () => {
  const m = probe((s) => { assert.ok(s.includes("// guard:advance")); return s.replace(/^.*\/\/ guard:advance.*$/m, ""); });
  assert.notEqual(m.out, "[2,2]");
  assert.match(m.out, /^failed:/); // the cursor never moves on whitespace: killed by the timeout
});

test("mutant: removing the dollar-quote branch is caught", () => {
  const m = probe((s) => { assert.ok(s.includes("/*dollar*/")); return s.replace("/*dollar*/", "&& false"); });
  assert.notEqual(m.out, "[2,2]"); // the function body splits at its inner semicolons
});

// ---- audit cycle 1 regressions (code CR1, CR2, CR6, CR7; security SEC-3) ----

test("quoted identifiers keep their case: \"Foo\" and \"foo\" are two tables, and an unquoted reference finds its folded table", () => {
  const two = readSql([f(`CREATE TABLE "Foo" ("ID" int PRIMARY KEY, "id" text); CREATE TABLE "foo" (id int);`)]);
  assert.deepEqual(two.entities.map((e) => e.name), ["Foo", "foo"]);
  assert.deepEqual(two.entities[0].columns.map((c) => c.name), ["ID", "id"]);
  const link = readSql([f(`CREATE TABLE Users (Id int PRIMARY KEY); CREATE TABLE posts (uid int REFERENCES users(id));`)]);
  assert.deepEqual(link.entities.map((e) => e.name), ["users", "posts"]);
  assert.equal(link.relationships[0].to, link.entities[0].name, "the relationship names the entity exactly as it is emitted");
});

test("ADD COLUMN IF NOT EXISTS leaves an existing column as it was", () => {
  const r = readSql([f(`CREATE TABLE t (id integer PRIMARY KEY); ALTER TABLE t ADD COLUMN IF NOT EXISTS id text; ALTER TABLE t ADD COLUMN IF NOT EXISTS extra text;`)]);
  assert.deepEqual(r.entities[0].columns, [{ name: "id", type: "integer", pk: true, nullable: false }, { name: "extra", type: "text", pk: false, nullable: true }]);
  assert.equal(r.notUnderstood, 0);
});

test("a partial unique index is understood but is not a unique key on its columns", () => {
  const r = readSql([f(`CREATE TABLE t(id int, active boolean); CREATE UNIQUE INDEX u ON t(id) WHERE active = true; CREATE UNIQUE INDEX v ON t(active);`)]);
  assert.deepEqual(r.entities[0].unique, [["active"]]);
  assert.equal(r.notUnderstood, 0);
  assert.deepEqual(r.approximate, []);
});

test("fieldsMax counts columns across all tables, and a hit is a budget hit", () => {
  const r = readSql([f(`CREATE TABLE a (x int, y int); CREATE TABLE b (x int, y int);`)], { fieldsMax: 3 });
  assert.equal(r.entities.reduce((n, e) => n + e.columns.length, 0), 3);
  assert.equal(r.incomplete, "budget");
  assert.equal(readSql([f(`CREATE TABLE a (x int, y int); CREATE TABLE b (x int, y int);`)], { fieldsMax: 4 }).incomplete, "none");
});

test("a column type of hundreds of thousands of tokens is read in linear time (render stopped at 80 characters)", () => {
  const at = (n: number) => `create table a(x ${"int ".repeat(n)});`;
  const types: number[] = [];
  const read = (text: string) => () => { types.push(readSql([f(text)], { bytesPerFile: 10_000_000, bytesTotal: 10_000_000 }).entities[0]?.columns[0]?.type.length ?? -1); };
  read(at(1000))(); // warm up
  types.length = 0; // only the timed runs count below
  const { t1: one, t2: two } = scaling(read(at(150_000)), read(at(300_000)));
  assert.deepEqual([...new Set(types)], [80], "every run read the column, and its type stops at 80 characters");
  assert.ok(two < 3000, `doubled input took ${two}ms`);
  assert.ok(two / one < RATIO_LIMIT, `ratio ${(two / one).toFixed(2)} (${one.toFixed(1)}ms -> ${two.toFixed(1)}ms)`);
});

// ---- audit cycle 2 regressions (code A, B, E, Q, U) ----

test("emitted names agree with the real ones: a unique key and an approximate table use the entity's own spelling", () => {
  const u = readSql([f(`CREATE TABLE t ("Email" text, id int); CREATE UNIQUE INDEX i ON t (email);`)]);
  assert.deepEqual(u.entities[0].unique, [["Email"]]);
  const a = readSql([f(`CREATE TABLE "Users"(id int); ALTER TABLE users ALTER COLUMN id TYPE bigint;`)]);
  assert.deepEqual(a.approximate, ["Users"]);
});

test("CREATE TABLE IF NOT EXISTS is a no-op for a name that differs only in case, and DROP TABLE of an ambiguous name is counted", () => {
  const c = readSql([f(`CREATE TABLE users(id int); CREATE TABLE IF NOT EXISTS "Users"(id int, x int);`)]);
  assert.deepEqual(c.entities.map((e) => e.name), ["users"]);
  const d = readSql([f(`CREATE TABLE "Users"(id int); CREATE TABLE "USERS"(id int); DROP TABLE users;`)]);
  assert.equal(d.entities.length, 2);
  assert.equal(d.notUnderstood, 1);
});

test("a partial unique index with an INCLUDE list is still partial", () => {
  const r = readSql([f(`CREATE TABLE t (a int, b int, c int); CREATE UNIQUE INDEX i ON t (a) INCLUDE (b) WHERE c > 0;`)]);
  assert.deepEqual(r.entities[0].unique, []);
  assert.equal(r.notUnderstood, 0);
});

// ---- audit cycle 3 regression (code C3-CR-3) ----

test("DROP INDEX, DROP CONSTRAINT and DROP COLUMN find constraints by name ignoring case, like every other lookup", () => {
  const index = readSql([f(`CREATE TABLE t (id int, "Email" text); CREATE UNIQUE INDEX "EmailIdx" ON t ("Email"); DROP INDEX emailidx;`)]);
  assert.deepEqual(index.entities[0].unique, []);
  const column = readSql([f(`CREATE TABLE t (id int, "Email" text, CONSTRAINT u UNIQUE (email)); ALTER TABLE t DROP COLUMN "Email";`)]);
  assert.deepEqual(column.entities[0].columns.map((c) => c.name), ["id"]);
  assert.deepEqual(column.entities[0].unique, [], "no orphan unique key on a dropped column");
  const constraint = readSql([f(`CREATE TABLE t (id int, k text, CONSTRAINT "UK" UNIQUE (k)); ALTER TABLE t DROP CONSTRAINT uk;`)]);
  assert.deepEqual(constraint.entities[0].unique, []);
  assert.equal(constraint.notUnderstood, 0);
});
