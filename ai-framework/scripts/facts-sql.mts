// Pure SQL DDL reader for /state. Text in, schema out: no fs, no process, no network, no dynamic code.
// A one-pass lexer (strings, comments, dollar quotes) splits statements; a closed statement set is replayed
// in the order the caller gives. Anything else is counted, never guessed and never executed.

export interface SqlFile { path: string; text: string }
export interface SqlBudgets { filesMax?: number; bytesPerFile?: number; bytesTotal?: number; statementsMax?: number; entitiesMax?: number; fieldsMax?: number; relationshipsMax?: number }
export interface SqlSchema {
  dialect: string;
  entities: { name: string; schema: string; columns: { name: string; type: string; pk: boolean; nullable: boolean }[]; unique: string[][] }[];
  relationships: { from: string; fromSchema: string; fromColumns: string[]; to: string; toSchema: string; toColumns: string[] }[];
  total: { entities: number; relationships: number };
  approximate: string[];
  notUnderstood: number;
  incomplete: "none" | "lexical" | "budget";
}

const DEF = { filesMax: 200, bytesPerFile: 2_000_000, bytesTotal: 8_000_000, statementsMax: 5000, entitiesMax: 500, fieldsMax: 5000, relationshipsMax: 2000 };
const BREAK = "--> statement-breakpoint";
const HINT = new Map([["AUTOINCREMENT", "sqlite"], ["AUTO_INCREMENT", "mysql"], ["ENGINE", "mysql"], ["PLPGSQL", "postgresql"], ["UUID", "postgresql"], ["SERIAL", "postgresql"], ["JSONB", "postgresql"], ["TIMESTAMPTZ", "postgresql"]]);
const STOP = new Set(["NOT", "NULL", "DEFAULT", "PRIMARY", "UNIQUE", "REFERENCES", "CHECK", "CONSTRAINT", "COLLATE", "GENERATED", "AUTOINCREMENT", "AUTO_INCREMENT", "AS", "COMMENT", "ON"]);
const BENIGN = new Set(["GRANT", "REVOKE", "COMMENT", "SET", "BEGIN", "COMMIT", "PRAGMA"]);
const NEUTRAL = new Set(["ENABLE", "DISABLE", "FORCE", "NO", "OWNER", "REPLICA", "CLUSTER", "VALIDATE"]);

interface Tok { k: "w" | "i" | "s" | "p"; v: string; u: string }
interface Col { name: string; type: string; pk: boolean; nullable: boolean }
interface Fk { name: string; cols: string[]; to: string; toSchema: string; toCols: string[] }
interface Uq { name: string; cols: string[] }
interface Tbl { name: string; schema: string; cols: Map<string, Col>; uq: Uq[]; fks: Fk[]; pkName: string; checks: Set<string> }

const isWord = (c: number) => (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c === 36 || c > 127;

// End index after the closing quote, or -1 when unterminated. A doubled closer is an escape. Linear.
function scanQ(text: string, i: number, close: string): number {
  let j = i + 1;
  for (;;) {
    j = text.indexOf(close, j);
    if (j < 0) return -1;
    if (text[j + 1] === close) { j += 2; continue; }
    return j + 1;
  }
}

// -1: no dollar quote starts at i; -2: opened but never closed; else the index after the closing tag. Tags are at most 64 chars.
function dollar(text: string, i: number): number {
  let j = i + 1;
  const c0 = text.charCodeAt(j);
  if (c0 !== 36) {
    if (!isWord(c0) || (c0 >= 48 && c0 <= 57)) return -1;
    while (j < i + 64 && isWord(text.charCodeAt(j)) && text.charCodeAt(j) !== 36) j++;
    if (text.charCodeAt(j) !== 36) return -1;
  }
  const tag = text.slice(i, j + 1);
  const e = text.indexOf(tag, j + 1);
  return e < 0 ? -2 : e + tag.length;
}

// One pass, cursor always advances. `emit` gets each statement's tokens and returns false to stop. Returns true when lexically incomplete.
function lex(text: string, emit: (t: Tok[]) => boolean, votes: Map<string, number>): boolean {
  let toks: Tok[] = [];
  let bad = false;
  let i = 0;
  const n = text.length;
  const push = (k: Tok["k"], v: string) => { toks.push({ k, v, u: k === "w" ? v.toUpperCase() : "" }); };
  const flush = () => { const t = toks; toks = []; return t.length === 0 || emit(t); };
  while (i < n) {
    const c = text.charCodeAt(i);
    let j = i;
    let d = -1;
    if (c <= 32) { /* whitespace */ }
    else if (c === 45 && text.charCodeAt(i + 1) === 45) {
      if (text.startsWith(BREAK, i) && !flush()) return bad;
      j = text.indexOf("\n", i);
      if (j < 0) j = n;
    } else if (c === 47 && text.charCodeAt(i + 1) === 42) {
      j = text.indexOf("*/", i + 2);
      if (j < 0) { bad = true; j = n; } else j += 2;
    } else if (c === 39 || c === 34 || c === 96 || (c === 91 && text.charCodeAt(i + 1) !== 93 && !isWord(text.charCodeAt(i - 1)))) {
      const close = c === 91 ? "]" : text[i];
      const e = scanQ(text, i, close);
      if (e < 0) { bad = true; j = n; }
      else {
        j = e;
        if (c === 96) votes.set("bt", 1);
        push(c === 39 ? "s" : "i", c === 39 ? "" : text.slice(i + 1, e - 1).split(close + close).join(close));
      }
    } else if (c === 36 && (d = dollar(text, i)) !== -1 /*dollar*/) {
      if (d === -2) { bad = true; j = n; } else { j = d; push("s", ""); votes.set("postgresql", (votes.get("postgresql") ?? 0) + 1); }
    } else if (isWord(c)) {
      while (j < n && isWord(text.charCodeAt(j))) j++;
      push("w", text.slice(i, j));
      const h = HINT.get(toks[toks.length - 1].u);
      if (h) votes.set(h, (votes.get(h) ?? 0) + 1);
    } else if (c === 59) {
      j = i + 1;
      if (!flush()) return bad;
    } else push("p", text[i]); // punctuation: the guard below advances
    if (j <= i) j = i + 1; // guard:advance
    i = j;
  }
  flush();
  return bad;
}

// Linear: stops once 80 characters exist and tracks the last character itself (no re-reading of a growing string).
const render = (ts: Tok[]) => {
  let s = "";
  let last = "";
  for (const t of ts) {
    if (s.length >= 80) break;
    const part = t.k === "p" ? t.v : (last && !"([,.".includes(last) ? " " : "") + t.v;
    s += part;
    if (part) last = part[part.length - 1];
  }
  return s.slice(0, 80);
};
// Identity of an identifier: unquoted names fold to lower case (as Postgres does), quoted names keep their case. Names are cut at 200.
const idv = (t: Tok) => (t.k === "w" ? t.v.toLowerCase() : t.v).slice(0, 200);

// Split on top-level commas.
function split(ts: Tok[]): Tok[][] {
  const out: Tok[][] = [];
  let cur: Tok[] = [];
  let depth = 0;
  for (const t of ts) {
    if (t.k === "p" && t.v === "(") depth++;
    else if (t.k === "p" && t.v === ")") depth--;
    if (depth === 0 && t.k === "p" && t.v === ",") { out.push(cur); cur = []; } else cur.push(t);
  }
  if (cur.length) out.push(cur);
  return out;
}

class Cur {
  T: Tok[];
  p = 0;
  constructor(T: Tok[], p = 0) { this.T = T; this.p = p; }
  is(u: string, o = 0) { const t = this.T[this.p + o]; return !!t && t.k === "w" && t.u === u; }
  eat(...us: string[]) { if (us.every((u, o) => this.is(u, o))) { this.p += us.length; return true; } return false; }
  punct(v: string) { const t = this.T[this.p]; if (t && t.k === "p" && t.v === v) { this.p++; return true; } return false; }
  ident() { const t = this.T[this.p]; if (t && (t.k === "w" || t.k === "i")) { this.p++; return idv(t); } return null; }
  name() {
    let nm = this.ident();
    if (nm === null) return null;
    let sch = "";
    while (this.punct(".")) { const b = this.ident(); if (b === null) return null; sch = nm; nm = b; }
    return { name: nm, schema: sch.toLowerCase() === "public" ? "" : sch };
  }
  // Tokens up to the matching ")" (the opener is already consumed); null when unbalanced.
  group() {
    const out: Tok[] = [];
    let depth = 1;
    while (this.p < this.T.length) {
      const t = this.T[this.p++];
      if (t.k === "p" && t.v === "(") depth++;
      else if (t.k === "p" && t.v === ")" && --depth === 0) return out;
      out.push(t);
    }
    return null;
  }
  // "(" ident [ASC|..], ... ")" -> names; null for expressions or a bad shape.
  cols() {
    if (!this.punct("(")) return null;
    const g = this.group();
    if (!g) return null;
    const names: string[] = [];
    for (const part of split(g)) {
      if (!part[0] || (part[0].k !== "w" && part[0].k !== "i") || part[1]?.v === "(") return null;
      names.push(idv(part[0]));
    }
    return names;
  }
  refs(): { to: string; toSchema: string; toCols: string[] } | null {
    if (!this.eat("REFERENCES")) return null;
    const q = this.name();
    if (!q) return null;
    const toCols = this.T[this.p]?.v === "(" && this.T[this.p].k === "p" ? this.cols() : [];
    return toCols ? { to: q.name, toSchema: q.schema, toCols } : null;
  }
}

const tkey = (schema: string, name: string) => `${schema}\0${name}`;
// Exact key first; otherwise the one key that matches ignoring case (SQLite, MySQL and SQL Server fold case, Postgres folds unquoted names).
// Two candidates that differ only in case are not guessed between.
// Constraint and index names are compared exactly or ignoring case.
const sameName = (a: string, b: string) => a === b || a.toLowerCase() === b.toLowerCase();
const fold = (m: Map<string, unknown>, k: string): string | undefined => {
  if (m.has(k)) return k;
  const lower = k.toLowerCase();
  let hit: string | undefined;
  for (const x of m.keys()) if (x.toLowerCase() === lower) { if (hit !== undefined) return undefined; hit = x; }
  return hit;
};

export function readSql(files: readonly SqlFile[], budgets?: SqlBudgets): SqlSchema {
  const lim = (k: keyof typeof DEF) => { const v = budgets?.[k]; return typeof v === "number" && v >= 0 ? v : DEF[k]; };
  const tables = new Map<string, Tbl>();
  const approx = new Set<string>();
  const votes = new Map<string, number>();
  let nu = 0;
  let budget = false;
  let lexical = false;
  let count = 0;
  let touched = "";
  const colKey = (s: string) => s;
  const getT = (schema: string, name: string) => { const k = fold(tables, tkey(schema, name)); return k === undefined ? undefined : tables.get(k); };
  const actual = (owner: Tbl | undefined, n: string) => (owner && getC(owner, n)?.name) || n;
  const getC = (t: Tbl, name: string) => { const k = fold(t.cols, colKey(name)); return k === undefined ? undefined : t.cols.get(k); };

  const setPk = (t: Tbl, cols: string[], name: string) => {
    for (const c of t.cols.values()) c.pk = false;
    for (const n of cols) { const c = getC(t, n); if (c) { c.pk = true; c.nullable = false; } }
    t.pkName = name;
  };
  const addFk = (t: Tbl, name: string, cols: string[], r: { to: string; toSchema: string; toCols: string[] }) => { t.fks.push({ name, cols, ...r }); };

  // Column definition: name, type up to the first constraint keyword, then inline constraints.
  const addCol = (t: Tbl, ts: Tok[]): boolean => {
    const first = ts[0];
    if (!first || (first.k !== "w" && first.k !== "i")) return false;
    let i = 1;
    let depth = 0;
    for (; i < ts.length; i++) {
      const x = ts[i];
      if (x.k === "p") depth += x.v === "(" ? 1 : x.v === ")" ? -1 : 0;
      else if (depth === 0 && x.k === "w" && STOP.has(x.u)) break;
    }
    const fname = idv(first);
    const col: Col = { name: fname, type: render(ts.slice(1, i)), pk: false, nullable: true };
    const c = new Cur(ts, i);
    let cname = "";
    while (c.p < ts.length) {
      if (c.punct("(")) { c.group(); continue; }
      if (c.eat("CONSTRAINT")) { cname = c.ident() ?? ""; continue; }
      if (c.eat("PRIMARY", "KEY")) { col.pk = true; col.nullable = false; t.pkName = cname; }
      else if (c.eat("NOT", "NULL")) col.nullable = false;
      else if (c.eat("UNIQUE")) t.uq.push({ name: cname, cols: [fname] });
      else if (c.is("REFERENCES")) { const r = c.refs(); if (!r) return false; addFk(t, cname, [fname], r); }
      else c.p++;
    }
    t.cols.set(colKey(fname), col);
    return true;
  };

  // A table-level constraint ("CONSTRAINT n" already handled by the caller): returns false if the shape is not understood.
  const constraint = (t: Tbl, c: Cur, name: string): boolean => {
    if (c.eat("PRIMARY", "KEY")) { const cs = c.cols(); if (!cs) return false; setPk(t, cs, name); return true; }
    if (c.eat("FOREIGN", "KEY")) {
      if (c.T[c.p]?.v !== "(") c.ident();
      const cs = c.cols();
      const r = cs && c.refs();
      if (!cs || !r) return false;
      addFk(t, name, cs, r);
      return true;
    }
    if (c.eat("UNIQUE")) {
      c.eat("KEY") || c.eat("INDEX");
      let n = name;
      if (c.T[c.p]?.v !== "(") n = c.ident() ?? name;
      const cs = c.cols();
      if (!cs) return false;
      t.uq.push({ name: n, cols: cs });
      return true;
    }
    if (c.is("CHECK")) { t.checks.add(colKey(name)); return true; }
    return false;
  };

  const createTable = (c: Cur): boolean => {
    const ifne = c.eat("IF", "NOT", "EXISTS");
    const q = c.name();
    if (!q) return false;
    touched = q.name;
    if (!c.punct("(")) return false;
    const g = c.group();
    if (!g) return false;
    const key = tkey(q.schema, q.name);
    if (ifne && fold(tables, key) !== undefined) return true;
    const t: Tbl = { name: q.name, schema: q.schema, cols: new Map(), uq: [], fks: [], pkName: "", checks: new Set() };
    let ok = true;
    for (const it of split(g)) {
      const ic = new Cur(it);
      const name = ic.eat("CONSTRAINT") ? ic.ident() ?? "" : "";
      if (ic.is("PRIMARY") || ic.is("FOREIGN") || ic.is("UNIQUE") || ic.is("CHECK")) ok = constraint(t, ic, name) && ok;
      else if (ic.is("KEY") || ic.is("INDEX") || ic.is("FULLTEXT") || ic.is("SPATIAL") || ic.is("EXCLUDE") || ic.is("LIKE")) continue;
      else ok = addCol(t, it) && ok;
    }
    tables.set(key, t);
    return ok;
  };

  const createIndex = (c: Cur): boolean => {
    const unique = c.eat("UNIQUE");
    if (!c.eat("INDEX")) return false;
    c.eat("CONCURRENTLY");
    c.eat("IF", "NOT", "EXISTS");
    const idx = c.is("ON") ? "" : c.name()?.name ?? "";
    if (!c.eat("ON")) return false;
    c.eat("ONLY");
    const q = c.name();
    if (!q) return false;
    if (c.eat("USING")) c.p++;
    if (!unique) return true;
    const t = getT(q.schema, q.name);
    const cs = c.cols();
    touched = t?.name ?? q.name;
    if (!t || !cs) return false;
    if (c.eat("INCLUDE")) { c.punct("(") && c.group(); }
    if (!c.is("WHERE")) t.uq.push({ name: idx, cols: cs }); // a partial index is understood, but it is not a unique key on its columns
    return true;
  };

  const dropColumn = (t: Tbl, name: string) => {
    const found = getC(t, name)?.name;
    if (found !== undefined) t.cols.delete(colKey(found));
    const hit = (cs: string[]) => cs.some((x) => sameName(x, found ?? name));
    t.fks = t.fks.filter((f) => !hit(f.cols));
    t.uq = t.uq.filter((u) => !hit(u.cols));
  };

  const action = (t: Tbl, c: Cur): boolean => {
    if (c.eat("ADD")) {
      let name = "";
      if (c.eat("CONSTRAINT")) name = c.ident() ?? "";
      if (c.is("PRIMARY") || c.is("FOREIGN") || c.is("UNIQUE") || c.is("CHECK")) return constraint(t, c, name);
      if (name) return false;
      c.eat("COLUMN");
      const guarded = c.eat("IF", "NOT", "EXISTS");
      const head = c.T[c.p];
      if (guarded && head && getC(t, idv(head))) return true; // the guard means: leave the existing column as it is
      return addCol(t, c.T.slice(c.p));
    }
    if (c.eat("DROP")) {
      if (c.eat("CONSTRAINT")) {
        c.eat("IF", "EXISTS");
        const n = c.ident();
        if (!n) return false;
        const before = t.fks.length + t.uq.length;
        t.fks = t.fks.filter((f) => !sameName(f.name, n));
        t.uq = t.uq.filter((u) => !sameName(u.name, n));
        if (t.pkName && sameName(t.pkName, n)) setPk(t, [], "");
        else if (before === t.fks.length + t.uq.length && !t.checks.has(colKey(n))) return false;
        return true;
      }
      if (c.eat("PRIMARY", "KEY")) { setPk(t, [], ""); return true; }
      c.eat("COLUMN");
      c.eat("IF", "EXISTS");
      const n = c.ident();
      if (!n) return false;
      dropColumn(t, n);
      return true;
    }
    return NEUTRAL.has(c.T[0]?.u ?? "");
  };

  const alterTable = (c: Cur): boolean => {
    c.eat("IF", "EXISTS");
    c.eat("ONLY");
    const q = c.name();
    if (!q) return false;
    touched = q.name;
    const t = getT(q.schema, q.name);
    if (!t) return false;
    touched = t.name;
    let ok = true;
    for (const a of split(c.T.slice(c.p))) ok = action(t, new Cur(a)) && ok;
    return ok;
  };

  const dropTable = (c: Cur): boolean => {
    c.eat("IF", "EXISTS");
    do {
      const q = c.name();
      if (!q) return false;
      const k = fold(tables, tkey(q.schema, q.name));
      if (k !== undefined) tables.delete(k);
      else if ([...tables.keys()].some((x) => x.toLowerCase() === tkey(q.schema, q.name).toLowerCase())) return false; // ambiguous: not guessed
    } while (c.punct(","));
    return true;
  };

  const dropIndex = (c: Cur): boolean => {
    c.eat("CONCURRENTLY");
    c.eat("IF", "EXISTS");
    const q = c.name();
    if (!q) return false;
    for (const t of tables.values()) t.uq = t.uq.filter((u) => !sameName(u.name, q.name));
    return true;
  };

  // Returns false when the reader should stop (statement budget).
  const stmt = (T: Tok[]): boolean => {
    if (++count > lim("statementsMax")) { budget = true; return false; }
    const c = new Cur(T);
    touched = "";
    let ok = false;
    if (T[0].k === "w" && BENIGN.has(T[0].u)) ok = true;
    else if (c.eat("CREATE")) {
      while (c.eat("TEMP") || c.eat("TEMPORARY") || c.eat("UNLOGGED") || c.eat("GLOBAL") || c.eat("LOCAL")) { /* modifiers */ }
      ok = c.eat("TABLE") ? createTable(c) : createIndex(c);
    } else if (c.eat("DROP")) ok = c.eat("TABLE") ? dropTable(c) : c.eat("INDEX") ? dropIndex(c) : false;
    else if (c.eat("ALTER", "TABLE")) ok = alterTable(c);
    if (!ok) {
      nu++;
      if (touched) approx.add(touched);
    }
    return true;
  };

  let used = 0;
  let bytes = 0;
  for (const f of files) {
    if (used >= lim("filesMax")) { budget = true; break; }
    const len = f.text.length;
    if (len > lim("bytesPerFile") || bytes + len > lim("bytesTotal")) { budget = true; continue; }
    used++;
    bytes += len;
    if (lex(f.text, stmt, votes)) lexical = true;
    if (budget && count > lim("statementsMax")) break;
  }

  const all = [...tables.values()];
  const kept = all.slice(0, lim("entitiesMax"));
  if (all.length > kept.length) budget = true;
  const rels: SqlSchema["relationships"] = [];
  for (const t of all) {
    for (const f of t.fks) {
      const target = getT(f.toSchema, f.to);
      // Names are emitted exactly as the entities they point at, so the renderer can match them.
      const toColumns = f.toCols.length ? f.toCols.map((n) => actual(target, n)) : [...(target?.cols.values() ?? [])].filter((x) => x.pk).map((x) => x.name);
      rels.push({ from: t.name, fromSchema: t.schema, fromColumns: f.cols.map((n) => actual(t, n)), to: target?.name ?? f.to, toSchema: target?.schema ?? f.toSchema, toColumns });
    }
  }
  if (rels.length > lim("relationshipsMax")) budget = true;
  let dialect = "";
  let best = 0;
  let fields = 0;
  for (const [k, v] of votes) if (k !== "bt" && v > best) { best = v; dialect = k; }
  if (!dialect && votes.has("bt")) dialect = "mysql";
  return {
    dialect,
    entities: kept.map((t) => {
      const cols = [...t.cols.values()];
      const room = Math.max(0, lim("fieldsMax") - fields); // fieldsMax counts columns across all tables
      if (cols.length > room) budget = true;
      fields += Math.min(cols.length, room);
      return { name: t.name, schema: t.schema, columns: cols.slice(0, room).map((x) => ({ ...x })), unique: t.uq.map((u) => u.cols.map((n) => actual(t, n))) };
    }),
    relationships: rels.slice(0, lim("relationshipsMax")),
    total: { entities: all.length, relationships: rels.length },
    approximate: [...approx].slice(0, lim("entitiesMax")),
    notUnderstood: nu,
    incomplete: lexical ? "lexical" : budget ? "budget" : "none",
  };
}
