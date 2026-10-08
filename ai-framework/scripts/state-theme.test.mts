import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix } from "node:path";
import test from "node:test";
import type { TestContext } from "node:test";
import { createRequire } from "node:module";

import type { RuntimeDeps, StatLike } from "./runtime/types.mts";
import {
  FALLBACK, MIN_CONTRAST, PAIRS, SETTINGS_FILE, THEME_FILE,
  contrastRatio, declarations, discoverTheme, parseColor, parseFontFamily, parseLength, ratioOf, readSettings, rgbOf, safeTheme, themeChanges,
} from "./state-theme.mts";

const ROOT = "/proj";

interface Fake { deps: RuntimeDeps; files: Map<string, string>; links: Map<string, string> }

const statOf = (kind: "file" | "link" | "dir", size: number): StatLike => ({
  isFile: () => kind === "file", isDirectory: () => kind === "dir", isSymbolicLink: () => kind === "link",
  size, mode: 0o644, mtimeMs: 1, ino: 1, dev: 1, nlink: 1, uid: 1,
});

/** In-memory fs. `links` maps a path to its target; realpath follows them for any ancestor too. */
function fake(files: Record<string, string>, links: Record<string, string> = {}): Fake {
  const map = new Map(Object.entries(files));
  const linkMap = new Map(Object.entries(links));
  const enoent = (file: string): Error => Object.assign(new Error(`ENOENT ${file}`), { code: "ENOENT" });
  const isDir = (p: string): boolean => [...map.keys(), ...linkMap.keys()].some((k) => k.startsWith(`${p}/`));
  const real = (file: string): string => {
    for (const [from, to] of linkMap) if (file === from || file.startsWith(`${from}/`)) return real(to + file.slice(from.length));
    if (!map.has(file) && !isDir(file) && file !== ROOT) throw enoent(file);
    return file;
  };
  const deps = {
    runtime: "node",
    fs: {
      realpathSync: real,
      lstatSync(file: string): StatLike {
        if (linkMap.has(file)) return statOf("link", 0);
        if (map.has(file)) return statOf("file", Buffer.byteLength(map.get(file) as string));
        if (isDir(file) || file === ROOT) return statOf("dir", 0);
        throw enoent(file);
      },
      readFileSync(file: string): string { const value = map.get(file); if (value === undefined) throw enoent(file); return value; },
      readdirEntriesSync(dir: string) {
        if (!isDir(dir) && dir !== ROOT) throw enoent(dir);
        const names = new Set<string>();
        for (const key of [...map.keys(), ...linkMap.keys()]) if (key.startsWith(`${dir}/`)) names.add(key.slice(dir.length + 1).split("/")[0]);
        return [...names].sort().map((name) => {
          const full = `${dir}/${name}`;
          return { name, isFile: () => map.has(full), isDirectory: () => !map.has(full) && !linkMap.has(full), isSymbolicLink: () => linkMap.has(full) };
        });
      },
    },
    path: posix,
    crypto: { sha256Hex: (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex") },
  } as unknown as RuntimeDeps;
  return { deps, files: map, links: linkMap };
}

const SHADCN = ":root{--background:0 0% 100%;--foreground:240 10% 3.9%;--primary:#18181b;--primary-foreground:#fafafa;--muted:240 4.8% 95.9%;--muted-foreground:240 3.8% 46.1%;--border:#e4e4e7;--radius:0.75rem}\n.dark{--background:240 10% 3.9%;--foreground:0 0% 98%;--primary:#fafafa;--primary-foreground:#18181b;--muted:240 3.7% 15.9%;--muted-foreground:240 5% 64.9%}\n";

test("every fallback pair meets the 4.5:1 contrast floor", () => {
  assert.equal(MIN_CONTRAST, 4.5);
  for (const mode of ["light", "dark"] as const) {
    for (const pair of PAIRS) assert.ok(ratioOf(FALLBACK[mode], pair) >= MIN_CONTRAST, `${mode} ${pair.join("/")}`);
  }
});

test("parseColor accepts hex, rgb and bare or wrapped hsl, and re-emits #rrggbb", () => {
  assert.deepEqual(parseColor("#abc"), { rgb: [170, 187, 204], css: "#aabbcc" });
  assert.equal(parseColor("#ABCDEF").css, "#abcdef");
  assert.equal(parseColor("rgb(1, 2, 3)").css, "#010203");
  assert.equal(parseColor("0 0% 100%").css, "#ffffff");
  assert.equal(parseColor("hsl(0, 0%, 0%)").css, "#000000");
});

test("parseColor rejects what it cannot verify, with a fixed reason and no pass-through", () => {
  assert.deepEqual(parseColor("rgb(300,0,0)"), { reason: "rgb channel above 255" });
  assert.deepEqual(parseColor("400 10% 10%"), { reason: "hsl component out of range" });
  assert.deepEqual(parseColor("oklch(0.5 0.1 200)"), { reason: "color space cannot be contrast-verified" });
  assert.deepEqual(parseColor("var(--x)"), { reason: "indirect var() reference is not resolved" });
  assert.deepEqual(parseColor("red; } body{display:none"), { reason: "value is outside the accepted color grammar" });
  assert.deepEqual(parseColor("hsl(0 0% 0%"), { reason: "value is outside the accepted color grammar" });
});

test("parseLength and parseFontFamily enforce their grammars", () => {
  assert.deepEqual(parseLength("1rem"), { css: "1rem" });
  assert.deepEqual(parseLength("0.50px"), { css: "0.5px" });
  assert.equal(parseLength("99rem").reason, "value is outside the accepted length grammar");
  assert.equal(parseLength("1vh").reason, "value is outside the accepted length grammar");
  assert.deepEqual(parseFontFamily("Inter, serif", "sans-serif"), { css: "Inter, serif" });
  assert.deepEqual(parseFontFamily("'My Font'", "monospace"), { css: '"My Font", monospace' });
  for (const hostile of ["url(x)", "a;b", "expression", "", "x".repeat(201)]) {
    assert.equal(parseFontFamily(hostile, "sans-serif").reason, "value is outside the accepted font-family grammar", hostile);
  }
});

test("contrastRatio and rgbOf match the WCAG definitions", () => {
  assert.equal(Math.round(contrastRatio([0, 0, 0], [255, 255, 255])), 21);
  assert.equal(contrastRatio([10, 20, 30], [10, 20, 30]), 1);
  assert.deepEqual(rgbOf("#102030"), [16, 32, 48]);
});

test("safeTheme drops non-grammar values and low-contrast modes back to the fallback", () => {
  const clean = safeTheme({
    light: { background: "#000000", foreground: "#010101", radius: "1rem", fontSans: "Inter, sans-serif", fontMono: "url(x)" },
    dark: { background: "red", primary: "#FAFAFA" },
  });
  assert.deepEqual(clean.light, FALLBACK.light, "background/foreground contrast is 1:1, so the whole mode falls back");
  assert.deepEqual(clean.dark, FALLBACK.dark);
  const ok = safeTheme({ light: { primary: "#111111", radius: "2rem", fontSans: "Inter, sans-serif", fontMono: "url(x)" }, dark: null });
  assert.equal(ok.light.primary, "#111111");
  assert.equal(ok.light.radius, "2rem");
  assert.equal(ok.light.fontSans, "Inter, sans-serif");
  assert.equal(ok.light.fontMono, FALLBACK.light.fontMono);
  assert.deepEqual(safeTheme(undefined), FALLBACK);
});

test("declarations returns each custom property with its selector chain and ignores comments", () => {
  const found = declarations("a{--x:1;b{--y:2}} /*c{--no:1}*/ :root{--z : 3}");
  assert.deepEqual(found.map((d) => `${d.chain}|${d.name}|${d.value}`).sort(), [":root|z|3", "a b|y|2", "a|x|1"]);
});

test("discoverTheme reads shadcn variables from project CSS and records provenance and sources", () => {
  const f = fake({ [`${ROOT}/src/app.css`]: SHADCN });
  const theme = discoverTheme(ROOT, {}, f.deps);
  assert.equal(theme.schemaVersion, 1);
  assert.equal(theme.mode, "partial", "dark does not define --border or --radius, which is recorded as a fallback");
  assert.equal(theme.light.background, "#ffffff");
  assert.equal(theme.light.radius, "0.75rem");
  assert.equal(theme.dark.background, "#09090b");
  assert.equal(theme.provenance.light.background, "discovered");
  assert.equal(theme.provenance.light.fontSans, "fallback");
  assert.deepEqual(theme.sources, [{ path: "src/app.css", sha256: createHash("sha256").update(SHADCN).digest("hex") }]);
  assert.equal(theme.reason, null);
});

test("discoverTheme rejects indirect and out-of-grammar values and reports why", () => {
  const f = fake({ [`${ROOT}/a.css`]: ":root{--background:var(--x);--foreground:#ffffff;--radius:99rem}\n" });
  const theme = discoverTheme(ROOT, {}, f.deps);
  assert.notEqual(theme.mode, "discovered");
  assert.ok(theme.rejected.some((r) => r.token === "background" && r.reason === "indirect var() reference is not resolved"));
  assert.ok(theme.rejected.some((r) => r.token === "radius"));
  assert.equal(theme.light.background, FALLBACK.light.background);
  assert.equal(theme.light.radius, FALLBACK.light.radius);
});

test("discoverTheme falls back per group when the discovered pair fails contrast", () => {
  const f = fake({ [`${ROOT}/a.css`]: ":root{--background:#777777;--foreground:#7a7a7a}\n" });
  const theme = discoverTheme(ROOT, {}, f.deps);
  assert.ok(theme.fallbacks.some((x) => x.scope === "light.text" && /contrast .*:1 is below 4\.5:1/.test(x.reason)));
  assert.equal(theme.light.background, FALLBACK.light.background);
  assert.equal(theme.mode === "discovered", false);
});

test("discoverTheme skips symlinked stylesheets, node_modules and oversize files", () => {
  const f = fake({
    [`${ROOT}/real.css`]: ":root{--background:#ffffff;--foreground:#000000}\n",
    [`${ROOT}/node_modules/x/skip.css`]: ":root{--background:#000000}\n",
    [`${ROOT}/big.css`]: `:root{--background:#ffffff}\n${"/* pad */".repeat(40000)}`,
    [`${ROOT}/outside.css`]: ":root{--background:#123456}\n",
  }, { [`${ROOT}/link.css`]: `${ROOT}/outside.css` });
  const theme = discoverTheme(ROOT, {}, f.deps);
  assert.deepEqual(theme.sources.map((s) => s.path), ["outside.css", "real.css"]);
  assert.ok(theme.notes.some((n) => /^big\.css skipped \(larger than 256 KB\)$/.test(n)));
  assert.ok(!theme.sources.some((s) => s.path.includes("node_modules") || s.path === "link.css"));
});

test("a stylesheet whose realpath leaves the project is not read", () => {
  const f = fake({ "/elsewhere/leak.css": ":root{--background:#123456}\n", [`${ROOT}/ok.css`]: ":root{--background:#ffffff;--foreground:#000000}\n" }, { [`${ROOT}/dir`]: "/elsewhere" });
  // Directory symlinks are never descended, so the leaked file cannot be collected through them.
  const theme = discoverTheme(ROOT, {}, f.deps);
  assert.deepEqual(theme.sources.map((s) => s.path), ["ok.css"]);
});

test("settings: themeMode fallback forces the documented theme; bad or unsafe settings are ignored with a note", () => {
  const css = { [`${ROOT}/a.css`]: ":root{--background:#ffffff;--foreground:#000000}\n" };
  const forced = discoverTheme(ROOT, {}, fake({ ...css, [`${ROOT}/${SETTINGS_FILE}`]: JSON.stringify({ schemaVersion: 1, themeMode: "fallback" }) }).deps);
  assert.equal(forced.mode, "fallback");
  assert.equal(forced.reason, "themeMode is fallback in .project/reports/settings.json");
  assert.deepEqual(forced.sources, []);
  const invalid = fake({ [`${ROOT}/${SETTINGS_FILE}`]: JSON.stringify({ schemaVersion: 2, themeMode: "auto" }) });
  assert.equal(readSettings(ROOT, invalid.deps).note, "settings.json ignored (expected {schemaVersion:1, themeMode:'auto'|'fallback'})");
  assert.equal(readSettings(ROOT, fake({}).deps).note, null);
  const big = fake({ [`${ROOT}/${SETTINGS_FILE}`]: "x".repeat(5000) });
  assert.equal(readSettings(ROOT, big.deps).note, "settings.json ignored (not a small regular file)");
  const linked = fake({ "/outside/settings.json": JSON.stringify({ schemaVersion: 1, themeMode: "fallback" }) }, { [`${ROOT}/${SETTINGS_FILE}`]: "/outside/settings.json" });
  assert.deepEqual(readSettings(ROOT, linked.deps), { themeMode: "auto", note: "settings.json ignored (not a small regular file)" });
});

test("settings read through an ANCESTOR symlink that leaves the project is ignored", () => {
  const f = fake({ "/outside/reports/settings.json": JSON.stringify({ schemaVersion: 1, themeMode: "fallback" }) }, { [`${ROOT}/.project`]: "/outside" });
  assert.deepEqual(readSettings(ROOT, f.deps), { themeMode: "auto", note: null }, "the leaf lstat fails through the fake, so the file is simply absent");
});

test("discoverTheme on an unresolvable root throws one fixed message with no path", () => {
  assert.throws(() => discoverTheme("/nonexistent-xyz", {}, fake({}).deps), (error: Error) => error.message === "root does not exist or is not resolvable");
});

test("themeChanges compares source hashes and never trusts the recorded file as theme input", () => {
  const record = (sources: unknown) => fake({ [`${ROOT}/${THEME_FILE}`]: JSON.stringify({ sources }) });
  const now = { sources: [{ path: "a.css", sha256: "1" }, { path: "b.css", sha256: "2" }] };
  assert.deepEqual(themeChanges(ROOT, now, record([{ path: "a.css", sha256: "1" }, { path: "b.css", sha256: "2" }]).deps), { recorded: true, changed: [] });
  assert.deepEqual(themeChanges(ROOT, now, record([{ path: "a.css", sha256: "OLD" }, { path: "gone.css", sha256: "3" }]).deps), { recorded: true, changed: ["a.css (changed)", "b.css (added)", "gone.css (removed)"] });
  assert.deepEqual(themeChanges(ROOT, now, record("not-an-array").deps), { recorded: true, changed: ["a.css (added)", "b.css (added)"] });
  assert.deepEqual(themeChanges(ROOT, now, fake({}).deps), { recorded: false, changed: [] });
  assert.deepEqual(themeChanges(ROOT, now, fake({ [`${ROOT}/${THEME_FILE}`]: "{not json" }).deps), { recorded: false, changed: [] });
  assert.deepEqual(themeChanges(ROOT, now, fake({ [`${ROOT}/${THEME_FILE}`]: "x".repeat(300 * 1024) }).deps), { recorded: false, changed: [] });
  const linked = fake({ "/o/theme.json": "{}" }, { [`${ROOT}/${THEME_FILE}`]: "/o/theme.json" });
  assert.deepEqual(themeChanges(ROOT, now, linked.deps), { recorded: false, changed: [] });
});

// ---- real fs through the default (Node) deps and the direct TypeScript command -----------------------------------------

function realProject(t: TestContext): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "state-theme-")));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function put(root: string, rel: string, text: string): void {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
}

test("the direct TypeScript command loads the same API for non-migrated callers (old signatures, default deps)", (t) => {
  const root = realProject(t);
  put(root, "src/app.css", SHADCN);
  const shim = createRequire(import.meta.url)("./state-theme.mts") as typeof import("./state-theme.mts");
  assert.deepEqual(Object.keys(shim).sort(), ["FALLBACK", "MIN_CONTRAST", "PAIRS", "SETTINGS_FILE", "THEME_FILE", "contrastRatio", "declarations", "discoverTheme", "insideProject", "parseColor", "parseFontFamily", "parseLength", "ratioOf", "readSettings", "rgbOf", "safeTheme", "themeChanges"]);
  const theme = shim.discoverTheme(root);
  assert.equal(theme.mode, "partial");
  assert.equal(theme.light.background, "#ffffff");
  assert.deepEqual(theme.light, discoverTheme(root).light);
  assert.deepEqual(shim.themeChanges(root, theme), { recorded: false, changed: [] });
});

test("real fs: a .project directory that is a symlink out of the project cannot supply settings or a recorded theme", (t) => {
  const root = realProject(t);
  const outside = realProject(t);
  put(outside, "reports/settings.json", JSON.stringify({ schemaVersion: 1, themeMode: "fallback" }));
  put(outside, "reports/theme.json", JSON.stringify({ sources: [] }));
  put(root, "a.css", ":root{--background:#ffffff;--foreground:#000000}\n");
  symlinkSync(outside, join(root, ".project"));
  assert.deepEqual(readSettings(root), { themeMode: "auto", note: "settings.json ignored (resolves outside the project)" });
  assert.equal(discoverTheme(root).mode !== "fallback" || discoverTheme(root).sources.length > 0, true, "the escaped settings must not force the fallback theme");
  assert.deepEqual(themeChanges(root, { sources: [] }), { recorded: false, changed: [] });
});
