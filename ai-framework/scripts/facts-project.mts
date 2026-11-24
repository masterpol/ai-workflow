/** Read-only project metadata. Project files are data; labels are cleaned by the renderer. */
import type { RuntimeDeps } from "./runtime/types.mts";
import type { Fact, Status } from "./facts-gather.mts";
import type { SqlFile, SqlSchema, SqlBudgets } from "./facts-sql.mts";
import { readSql as importedReadSql } from "./facts-sql.mts";

export interface ProjectBudgets {
  entriesPerDir?: number; dirsVisited?: number; treeNodes?: number;
  entities?: number; fieldsTotal?: number; relationships?: number;
}

const FILE_BYTES = 1024 * 1024;
const NAME_LENGTH = 1024;
const MAX_WORKSPACES = 20;
const SKIP = new Set(["node_modules", "dist", "build", ".next", "ios", "android", "fixtures", "coverage", "graphify-out", "storybook-static"]);
const FRAMEWORKS = ["next", "react", "vue", "nuxt", "svelte", "@sveltejs/kit", "astro", "angular", "@angular/core", "express", "fastify", "hono", "@nestjs/core", "@tanstack/react-start", "@tanstack/react-router", "@remix-run/react", "solid-js", "vite", "drizzle-orm", "prisma", "@prisma/client"];

const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const name = (value: unknown): string => typeof value === "string" ? value.slice(0, NAME_LENGTH) : "";
const strings = (value: unknown): string[] => Array.isArray(value) ? value.slice(0, 1000).filter((v): v is string => typeof v === "string").map(name) : [];

// Credential shapes, shared with the page cleaner in facts-gather: that one redacts them, this module refuses names that carry one.
export const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY[A-Z ]*-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY[A-Z ]*-----|$)/g,
  /AKIA[0-9A-Z]{16}/g,
  /\bnpm_[A-Za-z0-9]{20,}/g,
  /\bglpat-[A-Za-z0-9_-]{16,}/g,
  /\bdop_v1_[a-f0-9]{20,}/g,
  /\bwhsec_[A-Za-z0-9]{16,}/g,
  /\bSG\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  /hooks\.slack\.com\/services\/\S+/g,
  /\bssh-(?:rsa|ed25519|dss)\s+[A-Za-z0-9+\/=]{20,}/g,
  /\bAuthorization\s{0,3}:\s{0,3}(?:(?:Bearer|Basic|Token|Digest|ApiKey|OAuth|AWS4-HMAC-SHA256)\s+\S+|[A-Za-z0-9._~+\/=-]{20,})/gi,
  /--(?:password|passwd|token|secret|api-?key)[ =]\S+/gi,
  /\b(?:sk|pk|rk)[-_](?:live_|test_)?[A-Za-z0-9_-]{16,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/g,
  /\bAIza[0-9A-Za-z_-]{30,}/g,
  /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g,
  /\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+\/=-]{8,}/g,
  /\b[a-z][a-z0-9+.-]{0,31}:\/\/[^\/\s:@]*:[^\/\s]+@/gi,
  // No leading \b: DB_PASSWORD and AWS_SECRET_ACCESS_KEY have the keyword after an underscore.
  /(?:password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|credential)[A-Za-z0-9_-]{0,40}["']?\s{0,3}[:=]\s{0,3}["']?\S+/gi,
  // Short words only at a word start, so "compass: north" is not touched.
  /(?<![A-Za-z])(?:pwd|pass|passphrase|auth|signature|sig)["']?\s{0,3}[:=]\s{0,3}["']?\S+/gi,
];

/**
 * True when the text, or any part of it that starts after a separator (_ - .), looks like a credential: `0002_npm_<token>` has no word boundary
 * before `npm_`. The text is normalized first (a fullwidth key is still a key). The patterns run over the whole text (linear); the suffix scan
 * is per path segment, and a segment too long to scan (over 256 characters) is refused, so nothing is ever skipped because it was long.
 */
export function credentialShaped(text: string): boolean {
  const whole = text.slice(0, 4096).normalize("NFKC").replace(/\p{Cf}/gu, "");
  if (SECRET_PATTERNS.some((pattern) => whole.search(pattern) !== -1)) return true;
  for (const segment of whole.split("/")) {
    if (segment.length > 256) return true;
    for (let i = 1; i < segment.length; i++) {
      if ("_-.".includes(segment[i - 1]) && SECRET_PATTERNS.some((pattern) => segment.slice(i).search(pattern) !== -1)) return true;
    }
  }
  return false;
}

type SqlEntity = SqlSchema["entities"][number];
type SqlColumn = SqlEntity["columns"][number];
type SqlRelationship = SqlSchema["relationships"][number];
type ReadSqlFn = (files: readonly SqlFile[], budgets?: SqlBudgets) => SqlSchema;

const emptySqlSchema: SqlSchema = {
  dialect: "", entities: [], relationships: [], total: { entities: 0, relationships: 0 },
  approximate: [], notUnderstood: 0, incomplete: "none",
};

// `_` and `-` count as separators, so db_password_prod is refused but tokenizer and design-tokens are not; the shared credential shapes are refused anywhere.
const SECRET_WORD = /(?:^|[^a-z0-9])(?:password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|credential)(?:[^a-z0-9]|$)/i;
// A migration file name is shown in evidence, so it is allow-listed: letters, digits and . _ - space only.
const MIGRATION_NAME = /^[\p{L}\p{N}._ -]{1,200}$/u;
const SQL_BYTES_PER_SOURCE = 8 * 1024 * 1024;
const SQL_BYTES_ALL = 16 * 1024 * 1024;

/** Cuts a YAML comment: a `#` starts one only outside quotes and at the start or after a space. */
function stripComment(text: string): string {
  let quote = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) { if (ch === quote) quote = ""; }
    else if (ch === "'" || ch === '"') quote = ch;
    else if (ch === "#" && (i === 0 || /\s/.test(text[i - 1]))) return text.slice(0, i);
  }
  return text;
}

/** The entries of the top-level `packages:` key of a pnpm-workspace.yaml (block or flow list), wherever it sits among other keys. */
function pnpmPackages(text: string): string[] | null {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const head = /^packages\s*:(.*)$/.exec(lines[i]);
    if (!head) continue;
    const rest = stripComment(head[1]).trim();
    if (rest.startsWith("[")) {
      let joined = rest;
      for (let j = i + 1; j < lines.length && j < i + 200 && !joined.includes("]"); j++) joined += ` ${stripComment(lines[j]).trim()}`;
      if (!joined.includes("]")) return ["- ?"]; // unterminated: counted as one pattern that could not be resolved, never read as complete
      const body = joined.replace(/^\[/, "").replace(/\][\s\S]*$/, "");
      const items: string[] = [];
      let current = "", quote = "";
      for (const ch of body) {
        if (quote) { current += ch; if (ch === quote) quote = ""; }
        else if (ch === "'" || ch === '"') { quote = ch; current += ch; }
        else if (ch === ",") { items.push(current); current = ""; }
        else current += ch;
      }
      if (current.trim()) items.push(current);
      return items.map((item) => `- ${item.trim()}`);
    }
    if (rest) return [`- ${rest}`];
    const items: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j];
      if (!line.trim() || line.trim().startsWith("#")) continue;
      if (/^\S/.test(line) && !line.startsWith("-")) break; // the next top-level key ends the block (a dash at column 0 is still an item)
      if (/^\s*-/.test(line)) items.push(line.trim());
    }
    return items;
  }
  return null;
}

/** Paths are normalized and checked for credential-shaped names; other characters are left as-is. */
function scrubPath(text: string): { ok: true; value: string } | { ok: false; reason: string } {
  const original = text;
  let out = original.slice(0, 4096).normalize("NFKC").replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ");
  if (SECRET_WORD.test(out) || credentialShaped(out)) {
    return { ok: false, reason: "path refused by scrub" };
  }
  if (out !== original) return { ok: false, reason: "path refused by scrub" };
  return { ok: true, value: out };
}

function scrubLabel(text: string): string {
  const original = text.slice(0, NAME_LENGTH);
  const inert: Record<string, string> = { "<": "‹", ">": "›", "`": "'", "*": "∗", "[": "(", "]": ")", "|": "¦", "{": "(", "}": ")", "\\": "/", "~": "-", "_": "-", "#": "№", "!": "." };
  if (credentialShaped(original)) return "(redacted)";
  let out = original.normalize("NFKC").replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ").trim();
  out = out.replace(/[<>`*\[\]|{}\\~_#!]/g, (character) => inert[character] ?? character).replace(/:\/\//g, ":/ /");
  if (/\b(?:password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|credential)\b/i.test(out)) return "(redacted)";
  return out || "(unnamed)";
}

export function createProjectFacts(deps: RuntimeDeps, helpers: {
  read: (root: string, rel: string, maxBytes?: number) => { text?: string; missing?: true; error?: string };
  clean: (text: unknown) => string;
  readSql?: ReadSqlFn;
}, budgets: ProjectBudgets = {}): {
  database(root: string): Fact; structure(root: string): Fact; stack(root: string): Fact; workspaces(root: string): Fact;
} {
  const { fs, path } = deps;
  const readSql = helpers.readSql ?? importedReadSql ?? (() => emptySqlSchema);
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
  function fileExists(root: string, rel: string): boolean {
    try { return stat(root, rel).isFile(); } catch { return false; }
  }
  function json(root: string, rel: string) {
    const source = helpers.read(root, rel, FILE_BYTES);
    if (source.text === undefined) return { ...source, value: undefined as unknown };
    if (source.text.length > FILE_BYTES) return { error: "size", value: undefined as unknown };
    try { return { value: JSON.parse(source.text) as unknown }; }
    catch { return { error: "json", value: undefined as unknown }; }
  }

  function readPackage(root: string, rel: string): { name: string; frameworks: string[] } {
    const source = json(root, rel ? `${rel}/package.json` : "package.json");
    const pkg = object(source.value);
    const dependencies = new Set<string>();
    for (const field of ["dependencies", "devDependencies"]) {
      const obj = object(pkg[field]);
      for (const key in obj) if (Object.hasOwn(obj, key)) dependencies.add(key);
    }
    return {
      name: scrubLabel(name(pkg.name)),
      frameworks: FRAMEWORKS.filter((framework) => dependencies.has(framework)),
    };
  }

  function parseWorkspaceLine(line: string): { literal?: string; expand?: string; unresolved: boolean } {
    line = stripComment(line).trim();
    if (!line) return { unresolved: false };
    line = line.replace(/^- /, "").trim();
    if ((line.startsWith("'") && line.endsWith("'")) || (line.startsWith('"') && line.endsWith('"'))) {
      line = line.slice(1, -1);
    }
    if (line.startsWith("!")) return { unresolved: true };
    if (line.includes("{") || line.includes("}") || line.includes("?")) return { unresolved: true };
    const star = line.indexOf("*");
    if (star !== -1) {
      if (line.endsWith("/*") && star === line.length - 1) {
        const base = line.slice(0, -2).replace(/^\.\//, "").replace(/\/$/, "");
        return { expand: base, unresolved: false };
      }
      return { unresolved: true };
    }
    return { literal: line.replace(/^\.\//, "").replace(/\/$/, ""), unresolved: false };
  }

  function expandWorkspace(root: string, spec: { literal?: string; expand?: string }, unresolved: () => void, add: (rel: string) => void, refused: () => void, truncated: () => void) {
    if (spec.unresolved) { unresolved(); return; }
    if (spec.literal) { add(spec.literal); return; }
    if (spec.expand) {
      const base = spec.expand;
      const scrub = scrubPath(base);
      if (!scrub.ok) { unresolved(); return; }
      let info;
      try { info = stat(root, base); } catch { unresolved(); return; }
      if (!info.isDirectory()) { unresolved(); return; }
      let listing: string[];
      try { listing = fs.readdirSync(path.join(root, base)).sort(); } catch { unresolved(); return; }
      if (listing.length > entriesLimit) { truncated(); listing = listing.slice(0, entriesLimit); }
      for (const entry of listing) {
        if (entry.startsWith(".") || SKIP.has(entry)) continue;
        const child = `${base}/${entry}`;
        let childInfo;
        try { childInfo = stat(root, child); } catch { refused(); continue; }
        if (childInfo.isDirectory()) add(child);
      }
    }
  }

  function discoverWorkspaces(root: string): {
    packages: { path: string; name: string; frameworks: string[] }[];
    unresolved: number;
    evidence: string[];
    incomplete: boolean;
    overflow: boolean;
    truncated: boolean;
  } {
    const packages: { path: string; name: string; frameworks: string[] }[] = [];
    let unresolved = 0;
    const evidence: string[] = [];
    let incomplete = false;
    let overflow = false;
    let truncated = false;
    const add = (rel: string) => {
      if (packages.some((item) => item.path === rel)) return; // the same package named in both files counts once
      const scrub = scrubPath(rel);
      if (!scrub.ok) { incomplete = true; return; }
      let info;
      try { info = stat(root, rel); } catch (error) { if ((error as { code?: string }).code !== "ENOENT") incomplete = true; return; } // a declared package that does not exist is not a refusal
      if (!info.isDirectory()) return;
      if (packages.length >= MAX_WORKSPACES) { overflow = true; return; }
      packages.push({ path: rel, ...readPackage(root, rel) });
    };
    const countUnresolved = () => { unresolved++; };
    const markRefused = () => { incomplete = true; };
    const markTruncated = () => { truncated = true; };

    // A configuration file that exists but cannot be opened (a link, a non-regular file) is a refusal, not an absence.
    const refusedFile = (rel: string): boolean => { try { return fs.lstatSync(path.join(root, rel)) !== undefined && !fileExists(root, rel); } catch { return false; } };
    if (refusedFile("pnpm-workspace.yaml") || refusedFile("package.json")) { incomplete = true; evidence.push(refusedFile("pnpm-workspace.yaml") ? "pnpm-workspace.yaml" : "package.json"); }
    if (fileExists(root, "pnpm-workspace.yaml")) {
      const pnpm = helpers.read(root, "pnpm-workspace.yaml", FILE_BYTES);
      evidence.push("pnpm-workspace.yaml");
      if (pnpm.text === undefined) incomplete = true; // found but refused or unreadable: never the same as absent
      else {
        for (const raw of pnpmPackages(pnpm.text) ?? []) {
          const spec = parseWorkspaceLine(raw);
          expandWorkspace(root, spec, countUnresolved, add, markRefused, markTruncated);
        }
      }
    }

    if (fileExists(root, "package.json")) {
      const pkgSource = json(root, "package.json");
    if (pkgSource.value === undefined) { incomplete = true; evidence.push("package.json"); } // present but unreadable or invalid: not an absence
    if (pkgSource.value !== undefined) {
      evidence.push("package.json");
      const pkg = object(pkgSource.value);
      let list: unknown;
      if (Array.isArray(pkg.workspaces)) list = pkg.workspaces;
      else if (typeof pkg.workspaces === "object" && pkg.workspaces !== null) list = object(pkg.workspaces).packages;
      if (Array.isArray(list)) {
        for (const item of list) {
          if (typeof item !== "string") { unresolved++; continue; }
          const spec = parseWorkspaceLine(item);
          expandWorkspace(root, spec, countUnresolved, add, markRefused, markTruncated);
        }
      }
      }
    }
    return { packages, unresolved, evidence, incomplete, overflow, truncated };
  }

  interface SourceCandidate {
    kind: "drizzle-snapshot" | "sql-migrations";
    path: string;
    files: number;
    tables: number;
    schema: SqlSchema;
    complete: boolean;
    evidence: string[];
    readError?: string;
    ignored?: string;
    skipped?: number;
  }

  function parseDrizzleSnapshot(snapshot: unknown, budgets: { entities: number; fields: number; relations: number }): {
    schema: SqlSchema; capped: boolean; tablesError?: string;
  } {
    const data = object(snapshot);
    if (!data.tables || typeof data.tables !== "object" || Array.isArray(data.tables)) {
      return { schema: emptySqlSchema, capped: false, tablesError: "Drizzle snapshot has no tables object" };
    }
    const counts = new Map<string, number>([["entities", 0], ["fields", 0], ["relationships", 0], ["primaryKeys", 0], ["uniqueKeys", 0]]);
    const entities: SqlEntity[] = [];
    const relationships: SqlRelationship[] = [];
    let capped = false;
    for (const key in object(data.tables)) {
      if (!Object.hasOwn(data.tables, key)) continue;
      if (counts.get("entities")! >= budgets.entities) { capped = true; break; }
      counts.set("entities", counts.get("entities")! + 1);
      const table = object(object(data.tables)[key]), tableName = name(table.name) || name(key);
      const columns: SqlColumn[] = [], unique: string[][] = [];
      const primary = new Set<string>();
      for (const k in object(table.compositePrimaryKeys)) {
        if (counts.get("primaryKeys")! >= budgets.fields) { capped = true; break; }
        counts.set("primaryKeys", counts.get("primaryKeys")! + 1);
        for (const column of strings(object(object(table.compositePrimaryKeys)[k]).columns).slice(0, budgets.fields)) primary.add(column);
      }
      for (const columnKey in object(table.columns)) {
        if (!Object.hasOwn(object(table.columns), columnKey)) continue;
        if (counts.get("fields")! >= budgets.fields) { capped = true; break; }
        counts.set("fields", counts.get("fields")! + 1);
        const column = object(object(table.columns)[columnKey]), columnName = name(column.name) || name(columnKey);
        columns.push({ name: columnName, type: name(column.type), pk: column.primaryKey === true || primary.has(columnName), nullable: column.notNull !== true });
      }
      for (const k in object(table.uniqueConstraints)) {
        if (counts.get("uniqueKeys")! >= budgets.fields) { capped = true; break; }
        counts.set("uniqueKeys", counts.get("uniqueKeys")! + 1);
        unique.push(strings(object(object(table.uniqueConstraints)[k]).columns).slice(0, budgets.fields));
      }
      entities.push({ name: tableName, schema: name(table.schema), columns, unique });
      for (const k in object(table.foreignKeys)) {
        if (counts.get("relationships")! >= budgets.relations) { capped = true; break; }
        counts.set("relationships", counts.get("relationships")! + 1);
        const relation = object(object(table.foreignKeys)[k]);
        relationships.push({
          from: name(relation.tableFrom) || tableName, fromSchema: name(relation.schemaFrom) || name(table.schema),
          fromColumns: strings(relation.columnsFrom), to: name(relation.tableTo), toSchema: name(relation.schemaTo), toColumns: strings(relation.columnsTo),
        });
      }
    }
    return {
      schema: {
        dialect: name(data.dialect), entities, relationships,
        total: { entities: counts.get("entities")!, relationships: counts.get("relationships")! },
        approximate: [], notUnderstood: 0, incomplete: capped ? "budget" : "none",
      },
      capped,
    };
  }

  function readDrizzleCandidate(root: string, dir: string, snapshots: string[]): SourceCandidate | undefined {
    const scrub = scrubPath(dir);
    if (!scrub.ok) return undefined;
    const sorted = snapshots.slice().sort();
    const latest = sorted.at(-1);
    if (!latest) return undefined;
    const snapshotPath = `${dir}/${latest}`;
    const journalPath = `${dir}/_journal.json`;
    const snapshotSource = json(root, snapshotPath);
    if (snapshotSource.value === undefined) {
      const note = snapshotSource.error === "json" ? "Drizzle snapshot is not valid JSON" : "Drizzle snapshot could not be read within the file limit";
      return { kind: "drizzle-snapshot", path: dir, files: snapshots.length, tables: 0, schema: emptySqlSchema, complete: false, evidence: [snapshotPath], readError: note };
    }
    const parsed = parseDrizzleSnapshot(snapshotSource.value, { entities: entitiesLimit, fields: fieldsLimit, relations: relationsLimit });
    if (parsed.tablesError) {
      return { kind: "drizzle-snapshot", path: dir, files: snapshots.length, tables: 0, schema: emptySqlSchema, complete: false, evidence: [snapshotPath], readError: parsed.tablesError };
    }
    const journalSource = json(root, journalPath);
    let complete = false;
    let freshnessNote: string | undefined;
    if (journalSource.value !== undefined) {
      const entries = object(journalSource.value).entries;
      if (Array.isArray(entries)) {
        const covered = Number(latest.slice(0, 4)) + 1;
        complete = entries.length <= covered;
        if (entries.length > covered) freshnessNote = `journal lists ${entries.length} migrations; newest snapshot covers ${covered}`;
      } else {
        freshnessNote = "Drizzle journal has no entries array; snapshot freshness unavailable";
      }
    } else {
      freshnessNote = "Drizzle journal unavailable; snapshot freshness unavailable";
    }
    return {
      kind: "drizzle-snapshot", path: dir, files: snapshots.length,
      tables: parsed.schema.total.entities, schema: parsed.schema, complete,
      evidence: [snapshotPath, journalPath],
    };
  }

  // Bytes of SQL read in one detection pass, so many candidate folders cannot add up to more than SQL_BYTES_ALL.
  let sqlBytesLeft = SQL_BYTES_ALL;

  function readSqlCandidate(root: string, dir: string, migrationFiles: string[]): SourceCandidate | undefined {
    const scrub = scrubPath(dir);
    if (!scrub.ok) return undefined;
    const evidence: string[] = [];
    const files: SqlFile[] = [];
    let skipped = 0;
    let bytes = 0;
    for (const file of migrationFiles) {
      const rel = dir ? `${dir}/${file}` : file;
      // A file name that does not survive the scrub is never copied anywhere: the file is skipped and counted.
      if (!MIGRATION_NAME.test(file) || credentialShaped(file)) { skipped++; continue; }
      let size = 0;
      try { size = stat(root, rel).size; } catch { skipped++; continue; }
      if (bytes + size > SQL_BYTES_PER_SOURCE || size > sqlBytesLeft) { skipped++; continue; }
      const source = helpers.read(root, rel, FILE_BYTES);
      if (source.text === undefined) { skipped++; continue; }
      bytes += size;
      sqlBytesLeft -= size;
      evidence.push(rel);
      files.push({ path: rel, text: source.text });
    }
    if (files.length === 0) {
      return { kind: "sql-migrations", path: dir, files: migrationFiles.length, tables: 0, schema: emptySqlSchema, complete: true, evidence, readError: "SQL migrations could not be read", skipped };
    }
    const schema = readSql(files, {
      filesMax: migrationFiles.length, entitiesMax: entitiesLimit, fieldsMax: fieldsLimit, relationshipsMax: relationsLimit,
    });
    return {
      kind: "sql-migrations", path: dir, files: files.length,
      tables: schema.total.entities, schema, complete: true, evidence, skipped,
    };
  }

  function detectSources(root: string): {
    candidates: SourceCandidate[]; found: { kind: string; path: string }[];
    capped: boolean; incomplete: boolean; drizzleHint: boolean; refusedDrizzle: boolean;
  } {
    const candidates: SourceCandidate[] = [];
    const found: { kind: string; path: string }[] = [];
    let capped = false;
    let incomplete = false;
    let drizzleHint = false;
    let refusedDrizzle = false;
    let dirsCount = 0;
    sqlBytesLeft = SQL_BYTES_ALL;

    const workspaceRoots = discoverWorkspaces(root).packages.map((p) => p.path);
    const queue: { rel: string; depth: number; configRel: string | null }[] = [];
    const visited = new Set<string>();
    const enqueue = (rel: string, depth: number, configRel: string | null) => {
      const scrub = scrubPath(rel);
      if (!scrub.ok) { incomplete = true; return; }
      if (visited.has(rel)) return;
      let info;
      try { info = stat(root, rel); } catch { incomplete = true; return; }
      if (!info.isDirectory()) return;
      if (visited.size >= dirsLimit * 2) { capped = true; return; } // bounds the probes, not only the directories listed
      visited.add(rel);
      queue.push({ rel, depth, configRel });
    };
    enqueue("", 0, null);
    for (const rel of workspaceRoots) enqueue(rel, 0, null);

    for (let at = 0; at < queue.length; at++) {
      const { rel, depth, configRel } = queue[at];
      if (dirsCount >= dirsLimit) { capped = true; continue; }
      let info;
      try { info = stat(root, rel); } catch { incomplete = true; continue; }
      if (!info.isDirectory()) continue;
      dirsCount++;
      let listing: string[];
      try { listing = fs.readdirSync(rel ? path.join(root, rel) : root).sort(); } catch { incomplete = true; continue; }
      if (listing.length > entriesLimit) capped = true;
      const entries = listing.slice(0, entriesLimit);
      const files: string[] = [];
      for (const entry of entries) {
        const target = rel ? `${rel}/${entry}` : entry;
        let entryInfo;
        try {
          entryInfo = fs.lstatSync(rel ? path.join(root, target) : path.join(root, entry));
        } catch { incomplete = true; continue; }
        if (entryInfo.isFile() || entryInfo.isSymbolicLink()) files.push(entry);
      }

      const snapshots = files.filter((f) => /^\d{4}_snapshot\.json$/.test(f));
      const hasJournal = files.includes("_journal.json");
      if (snapshots.length > 0) {
        const candidate = readDrizzleCandidate(root, rel, snapshots);
        if (candidate) candidates.push(candidate);
      } else if (hasJournal) {
        drizzleHint = true;
      }

      const migrationFiles = files.filter((f) => /^\d+_.*\.sql$/.test(f)).sort((a, b) => Number(/^\d+/.exec(a)![0]) - Number(/^\d+/.exec(b)![0]) || (a < b ? -1 : a > b ? 1 : 0));
      // Two or more sequentially named files, or one file beside a Drizzle journal.
      const journalBeside = hasJournal || fileExists(root, rel ? `${rel}/meta/_journal.json` : "meta/_journal.json");
      if (migrationFiles.length >= 2 || (migrationFiles.length === 1 && journalBeside)) {
        const candidate = readSqlCandidate(root, rel, migrationFiles);
        if (candidate) candidates.push(candidate);
      }

      const hasSchemaTs = files.includes("schema.ts");
      const hasDrizzleConfig = files.some((f) => f.startsWith("drizzle.config."));
      const activeConfig = hasDrizzleConfig ? rel : configRel;
      for (const f of files) {
        const filePath = rel ? `${rel}/${f}` : f;
        if (f === "schema.prisma") found.push({ kind: "prisma", path: filePath });
        if (f === "models.py") found.push({ kind: "python-models", path: filePath });
      }
      if (hasSchemaTs && activeConfig !== null) {
        const filePath = rel ? `${rel}/schema.ts` : "schema.ts";
        found.push({ kind: "typescript-schema", path: filePath });
      }

      if (depth < 5) {
        for (const entry of entries) {
          if (entry.startsWith(".") || SKIP.has(entry)) continue;
          const childRel = rel ? `${rel}/${entry}` : entry;
          if (visited.has(childRel)) continue;
          let childInfo;
          try { childInfo = stat(root, childRel); } catch {
            try {
              if (entry === "drizzle" && fs.lstatSync(rel ? path.join(root, childRel) : path.join(root, entry)).isSymbolicLink()) refusedDrizzle = true;
            } catch { /* ignore */ }
            incomplete = true;
            continue;
          }
          if (!childInfo.isDirectory()) continue;
          enqueue(childRel, depth + 1, activeConfig);
        }
      }
    }

    return { candidates, found, capped, incomplete, drizzleHint, refusedDrizzle };
  }

  function sameProject(drizzlePath: string, sqlPath: string): boolean {
    const parent = drizzlePath.replace(/\/meta$/, "");
    return sqlPath === parent || sqlPath.startsWith(`${parent}/`);
  }

  function chooseSource(candidates: SourceCandidate[]): SourceCandidate {
    const sqlSources = candidates.filter((c) => c.kind === "sql-migrations");
    const completeDrizzle = candidates.filter((c) => c.kind === "drizzle-snapshot" && c.complete);
    const staleDrizzle = candidates.filter((c) => c.kind === "drizzle-snapshot" && !c.complete);
    const disqualified = new Set<SourceCandidate>();
    for (const d of staleDrizzle) {
      if (sqlSources.some((s) => sameProject(d.path, s.path) && s.tables > 0)) disqualified.add(d);
    }
    // A complete Drizzle snapshot wins over SQL migrations from the same project folder; unrelated sources compete by tables.
    const sqlToDrop = new Set<SourceCandidate>();
    for (const d of completeDrizzle) {
      for (const s of sqlSources) if (sameProject(d.path, s.path)) sqlToDrop.add(s);
    }
    const eligible = candidates.filter((c) => !disqualified.has(c) && !sqlToDrop.has(c));
    eligible.sort((a, b) => b.tables - a.tables || a.path.localeCompare(b.path));
    return eligible[0];
  }

  function database(root: string): Fact {
    const { candidates, found, capped, incomplete, drizzleHint, refusedDrizzle } = detectSources(root);
    if (candidates.length === 0) {
      const emptyValue = { dialect: "", entities: [], relationships: [], total: { entities: 0, relationships: 0 }, source: null, approximate: [], notUnderstood: 0, alternatives: [], found };
      if (refusedDrizzle) return fact(emptyValue, "unavailable", [], "Drizzle metadata directory refused");
      if (capped) return fact(emptyValue, "stale", [], "discovery budget reached; no schema source could be confirmed");
      if (incomplete) return fact(emptyValue, "stale", [], "some directory entries refused; no schema source could be confirmed");
      if (drizzleHint) return fact(null, "unconfigured", [], "checked drizzle/meta/_journal.json and drizzle/meta/NNNN_snapshot.json; no Drizzle snapshot");
      if (found.length) return fact(emptyValue, "unavailable", [], "schema source found but not read");
      return fact(null, "unconfigured", [], "no schema source found");
    }

    const chosen = chooseSource(candidates);
    const alternatives = candidates
      .filter((c) => c !== chosen && c.tables > 0 && !c.readError)
      .map((c) => ({ kind: c.kind, path: c.path, tables: c.tables }));

    if (chosen.kind === "drizzle-snapshot" && chosen.complete) {
      const snapshotNames = new Set(chosen.schema.entities.map((entity) => entity.name));
      const ignored = candidates
        .filter((c) => c.kind === "sql-migrations" && sameProject(chosen.path, c.path) && c.schema.entities.some((entity) => !snapshotNames.has(entity.name)))
        .map((c) => c.path);
      if (ignored.length) chosen.ignored = ignored.join(", ");
    }

    if (chosen.readError) {
      return fact(null, "unavailable", chosen.evidence, chosen.readError);
    }
    if (chosen.tables === 0) {
      return fact(null, "unavailable", chosen.evidence, `source at ${chosen.path} produced no tables`);
    }

    const notes: string[] = [];
    if (chosen.skipped) notes.push(`${chosen.skipped} migration file(s) not read`);
    if (capped) notes.push("discovery budget reached; counts are at least the reported totals");
    if (incomplete) notes.push("some directory entries refused; counts are at least the reported totals");
    if (chosen.schema.incomplete === "budget") notes.push("discovery budget reached; counts are at least the reported totals");
    if (chosen.schema.incomplete === "lexical") notes.push("incomplete: lexical");
    if (chosen.ignored) notes.push(`ignored: ${chosen.ignored}`);

    if (chosen.kind === "drizzle-snapshot" && !chosen.complete) {
      const journalPath = `${chosen.path}/_journal.json`;
      const journal = json(root, journalPath);
      if (journal.value !== undefined) {
        const entries = object(journal.value).entries;
        if (Array.isArray(entries)) {
          const snapshotFile = chosen.evidence.find((e) => /\d{4}_snapshot\.json$/.test(e));
          const latest = snapshotFile ? snapshotFile.split("/").pop()! : "0000_snapshot.json";
          const covered = Number(latest.slice(0, 4)) + 1;
          if (entries.length > covered) notes.push(`journal lists ${entries.length} migrations; newest snapshot covers ${covered}`);
        } else {
          notes.push("Drizzle journal has no entries array; snapshot freshness unavailable");
        }
      } else {
        notes.push("Drizzle journal unavailable; snapshot freshness unavailable");
      }
    } else if (chosen.kind === "sql-migrations") {
      if (chosen.schema.incomplete !== "none") notes.push(`incomplete: ${chosen.schema.incomplete}`);
      if (chosen.schema.notUnderstood) notes.push(`${chosen.schema.notUnderstood} statement(s) not understood`);
      if (chosen.schema.approximate.length) notes.push(`approximate table(s): ${chosen.schema.approximate.join(", ")}`);
    }

    const status: Status = (capped || incomplete || !!chosen.skipped || chosen.schema.incomplete !== "none" || chosen.schema.approximate.length > 0 || chosen.schema.notUnderstood > 0 || (chosen.kind === "drizzle-snapshot" && !chosen.complete)) ? "stale" : "observed";
    const value = {
      ...chosen.schema,
      source: { kind: chosen.kind, path: chosen.path, files: chosen.files, ...(chosen.ignored ? { ignored: chosen.ignored } : {}) },
      approximate: chosen.schema.approximate,
      notUnderstood: chosen.schema.notUnderstood,
      alternatives,
      found,
    };
    const text = [...new Set(notes)].join("; ");
    return fact(value, status, chosen.evidence, text || undefined);
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
      const listing = fs.readdirSync(rel ? path.join(root, rel) : root).sort();
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
    for (const [lock, candidate] of [["bun.lock", "bun"], ["bun.lockb", "bun"], ["pnpm-lock.yaml", "pnpm"], ["yarn.lock", "yarn"], ["package-lock.json", "npm"]]) {
      if (present(root, lock)) { manager = candidate; evidence.push(lock); break; }
    }
    const scripts = Object.keys(object(pkg.scripts));
    const capped = scripts.length > entriesLimit;
    const typescript = packages.has("typescript") || present(root, "tsconfig.json");
    return fact({ manager, language: typescript ? "TypeScript" : "JavaScript", dependencies: counts.get("dependencies"), devDependencies: counts.get("devDependencies"), frameworks: FRAMEWORKS.filter((framework) => packages.has(framework)), scripts: scripts.slice(0, entriesLimit).map(name) }, capped ? "stale" : "observed", evidence, capped ? "script display budget reached; counts are at least the reported totals" : undefined);
  }

  function workspaces(root: string): Fact {
    const { packages, unresolved, evidence, incomplete, overflow, truncated } = discoverWorkspaces(root);
    if (packages.length === 0 && unresolved === 0 && !incomplete && !overflow && !truncated) {
      return fact(null, "unconfigured", evidence, "no workspace configuration found");
    }
    const value = { packages, unresolved };
    if (overflow) return fact(value, "stale", evidence, `more than ${MAX_WORKSPACES} workspace packages; the first ${MAX_WORKSPACES} are listed`);
    if (truncated) return fact(value, "stale", evidence, "a workspace directory has more entries than the entry budget; the list is at least the reported packages");
    if (incomplete) return fact(value, "stale", evidence, "some workspace configuration or paths could not be read; the list is at least the reported packages");
    return fact(value, "observed", evidence, unresolved ? `${unresolved} workspace pattern(s) could not be resolved` : undefined);
  }

  return { database: safe(database), structure: safe(structure), stack: safe(stack), workspaces: safe(workspaces) };
}
