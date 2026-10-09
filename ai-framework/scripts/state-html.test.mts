import { NODE_FLAGS } from "./runtime/entry.mts";
const RUNTIME_FLAGS = process.versions.bun ? [] : NODE_FLAGS;
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { buildSnapshot } from "./state-snapshot.mts";
import { createNodeDeps } from "./runtime/node.mts";
import { createBunDeps } from "./runtime/bun.mts";
import { createStateRender, main, renderHtml, render, safeEvidencePath, stylesheet, esc } from "./state-render.mts";
import * as theme from "./state-theme.mts";

const SNAPSHOT_SCRIPT = path.join(import.meta.dirname, "state-snapshot.mts");
const RENDER_SCRIPT = path.join(import.meta.dirname, "state-render.mts");
const NOW = "2026-09-25T12:00:00.000Z";

test("parses quoted fonts canonically and rejects hostile or indirect family tokens", () => {
  assert.equal(theme.parseFontFamily("'Open Sans', monospace", "sans-serif").css, '"Open Sans", monospace');
  assert.equal(theme.parseFontFamily('"123 Font"', "sans-serif").css, '"123 Font", sans-serif');
  for (const value of ['"evil; color:red"', '"evil</style>"', '"a\\22b"', 'var(--font)', '"a,b"', "'unclosed", 'url(x)', '"   "', 'x'.repeat(201)]) assert.ok(theme.parseFontFamily(value, "sans-serif").reason, value);
  const custom = { light: { ...theme.FALLBACK.light, fontSans: '"Open Sans", sans-serif' }, dark: theme.FALLBACK.dark };
  assert.equal(theme.safeTheme(custom).light.fontSans, '"Open Sans", sans-serif');
  custom.light.fontSans = '"evil</style>"';
  assert.equal(theme.safeTheme(custom).light.fontSans, theme.FALLBACK.light.fontSans);
});

test("resolves one same-file variable with final source order and mode precedence", () => {
  const root = project({ "global.css": ':root{--face:"First";--font-sans:Arial;--font-sans:var(--face);--face:"Open Sans"}.dark{--face:"Dark Face";--font-sans:var(--face)}' });
  try {
    const result = theme.discoverTheme(root);
    assert.equal(result.light.fontSans, '"Open Sans", sans-serif');
    assert.equal(result.dark.fontSans, '"Dark Face", sans-serif');
    assert.match(page(root), /"Open Sans", sans-serif/);
  } finally { cleanup(root); }
});

test("rejects nested cycles and cross-file font variables", () => {
  for (const css of [':root{--face:var(--font-sans);--font-sans:var(--face)}', ':root{--face:var(--other);--other:Arial;--font-sans:var(--face)}', ':root{--font-sans:var(--elsewhere)}', ':root{--font-sans:var(--missing, Arial)}']) {
    const root = project({ "a.css": css, "b.css": ':root{--elsewhere:"Another File"}' });
    try {
      const result = theme.discoverTheme(root);
      assert.equal(result.light.fontSans, theme.FALLBACK.light.fontSans);
      assert.ok(result.rejected.some((item) => item.token === "fontSans"));
    } finally { cleanup(root); }
  }
});

function project(files = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "state-html-")));
  fs.mkdirSync(path.join(root, ".project"), { recursive: true });
  for (const [name, value] of Object.entries(files)) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, typeof value === "string" ? value : JSON.stringify(value));
  }
  return root;
}
const cleanup = (...roots) => roots.forEach((root) => fs.rmSync(root, { recursive: true, force: true }));
const snapshotOf = (root) => buildSnapshot(root, { now: NOW });
const page = (root, custom = theme.discoverTheme(root), snapshot = snapshotOf(root)) => renderHtml(snapshot, custom, { root });
const run = (script, root, ...args) => spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "--root", root, ...args], { encoding: "utf8" });

const LIGHT_DARK_CSS = `:root{--background:0 0% 100%;--foreground:240 10% 3.9%;--primary:240 5.9% 10%;--primary-foreground:0 0% 98%;--muted:240 4.8% 95.9%;--muted-foreground:240 3.8% 36%;--border:240 5.9% 90%;--radius:0.75rem;--font-sans:Inter, Helvetica Neue, sans-serif}
.dark{--background:240 10% 3.9%;--foreground:0 0% 98%;--primary:0 0% 98%;--primary-foreground:240 5.9% 10%;--muted:240 3.7% 15.9%;--muted-foreground:240 5% 64.9%;--border:240 3.7% 15.9%}`;

const ALLOWED_TAGS = new Set(["html", "head", "meta", "title", "style", "body", "a", "header", "h1", "h2", "p", "nav", "ul", "li", "main", "section", "div", "table", "caption", "thead", "tr", "th", "tbody", "td", "span", "br", "code", "dl", "dt", "dd", "h3", "details", "summary"]);
const ALLOWED_ATTRS = new Set(["lang", "charset", "name", "content", "http-equiv", "class", "href", "id", "aria-label", "aria-labelledby", "role", "tabindex", "scope", "colspan", "aria-current", "open"]);
function assertOnlyKnownMarkup(html) {
  const body = html.replace(/<style>[\s\S]*?<\/style>/, "<style></style>");
  for (const [, name, attrs] of body.matchAll(/<([a-z][a-z0-9]*)((?:\s+[a-z-]+(?:="[^"]*")?)*)\s*\/?>/g)) {
    assert.ok(ALLOWED_TAGS.has(name), `unexpected tag <${name}>`);
    for (const [, attribute] of attrs.matchAll(/\s([a-z-]+)(?:="[^"]*")?/g)) assert.ok(ALLOWED_ATTRS.has(attribute), `unexpected attribute ${attribute} on <${name}>`);
  }
  // Every "<" that starts markup was matched above; a stray one means an escape was missed.
  const stripped = body.replace(/<!-- generated by state-render -->/g, "").replace(/<\/?[a-z][a-z0-9]*(?:\s+[a-z-]+(?:="[^"]*")?)*\s*\/?>/g, "").replace(/<!doctype html>/i, "");
  assert.ok(!stripped.includes("<"), `unescaped "<" outside a known tag: ${stripped.slice(stripped.indexOf("<"), stripped.indexOf("<") + 60)}`);
}

test("output is self-contained: no scripts, no external loads, CSP present, only known markup", () => {
  const root = project({ ".project/context/product.md": "# Product\n\n## Overview\n\nA product described with enough words to count as a filled file.\n" });
  try {
    const html = page(root);
    assert.ok(!/<script/i.test(html));
    assert.ok(!/\b(?:src|action|data)=/i.test(html));
    assert.ok(!/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(html.replace(/http-equiv|www\.w3\.org/g, "")), "no external URL");
    assert.ok(!/url\(|@import/i.test(html));
    assert.match(html, /<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'/);
    assertOnlyKnownMarkup(html);
  } finally { cleanup(root); }
});

test("hostile snapshot content renders inert", () => {
  const root = project();
  const hostile = ["<script>alert(1)</script>", '"><img src=x onerror=alert(1)>', "</style><script>alert(2)</script>", "javascript:alert(3)", "<a href='javascript:x'>", "&lt;already&gt;"];
  try {
    const snapshot = snapshotOf(root);
    snapshot.project = { readme: { value: { title: hostile[0], summary: hostile[1] }, status: "observed", evidence: [hostile[3], "data:text/html,<script>1</script>"], note: hostile[2] }, description: [{ value: { heading: hostile[4], summary: hostile[5] }, status: hostile[0], evidence: [] }] };
    snapshot.pitches.items = [{ value: { slug: hostile[1], title: hostile[0], phase: hostile[2], appetite: hostile[4], hill: { scopes: hostile[0], done: hostile[1] } }, status: "observed", evidence: [hostile[3]], note: hostile[0] }];
    snapshot.metrics = { value: { nested: { deeper: { deepest: { gone: hostile[0] } } }, list: hostile }, status: "observed", evidence: [], note: hostile[1] };
    snapshot.generatedAt = hostile[0];
    snapshot.authority = hostile[1];
    const html = renderHtml(snapshot, theme.discoverTheme(root), { root });
    assertOnlyKnownMarkup(html);
    assert.ok(!html.includes("<script"));
    assert.ok(!html.includes("<img"));
    assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
    assert.ok(html.includes("&amp;lt;already&amp;gt;"), "entities are escaped once, not interpreted");
    assert.ok(!/href="javascript:/i.test(html));
  } finally { cleanup(root); }
});

test("evidence links: only safe project-relative existing files; everything else is plain text", () => {
  const outside = project({ "secret.md": "outside" });
  const root = project({ "docs/a.md": "ok", ".env": "K=V", ".project/credentials.json": "{}", ".claude/settings.local.json": "{}" });
  try {
    fs.symlinkSync(path.join(outside, "secret.md"), path.join(root, "docs/link.md"));
    fs.symlinkSync(outside, path.join(root, "linked-dir"));
    const cases = { "docs/a.md": true, "docs/missing.md": false, "/etc/passwd": false, "../outside.md": false, "docs/../docs/a.md": false, "javascript:alert(1)": false, "data:text/html,x": false, "https://evil.example/x": false, "//evil.example/x": false, ".env": false, ".project/credentials.json": false, ".claude/settings.local.json": false, "docs/link.md": false, "linked-dir/secret.md": false, "docs/a b.md": false, "docs\\a.md": false, "": false, "docs": false, [`docs/${"a".repeat(300)}`]: false };
    for (const [candidate, expected] of Object.entries(cases)) assert.equal(safeEvidencePath(root, candidate), expected, candidate);
    assert.equal(safeEvidencePath(null, "docs/a.md"), false, "no root, no links");
    assert.equal(safeEvidencePath(root, 42), false);

    const snapshot = snapshotOf(root);
    snapshot.database = { value: "x", status: "observed", evidence: ["docs/a.md", "docs/missing.md", "javascript:alert(1)", "../outside.md", ".env"] };
    const html = renderHtml(snapshot, theme.discoverTheme(root), { root });
    assert.ok(html.includes('<a href="../../docs/a.md">docs/a.md</a>'));
    for (const plain of ["docs/missing.md", "javascript:alert(1)", "../outside.md", ".env"]) {
      assert.ok(html.includes(`<code>${plain}</code>`), plain);
      assert.ok(!html.includes(`href="../../${plain}"`) && !html.includes(`href="${plain}"`), plain);
    }
  } finally { cleanup(root, outside); }
});

test("esc neutralizes every HTML-significant character exactly once", () => {
  assert.equal(esc(`<a href="x" onclick='y'>&amp;</a>`), "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;amp;&lt;/a&gt;");
  assert.equal(esc(null), "");
  assert.equal(esc(undefined), "");
  assert.equal(esc(0), "0");
});

test("evidence paths with unusual characters or in-project symlinks are never linked", () => {
  const root = project({ "docs/a b.md": "x", 'docs/q".md': "x", "docs/real.md": "x", "docs/semi;colon.md": "x" });
  try {
    fs.symlinkSync(path.join(root, "docs/real.md"), path.join(root, "docs/inside-link.md"));
    for (const name of ["docs/a b.md", 'docs/q".md', "docs/semi;colon.md", "docs/inside-link.md"]) assert.equal(safeEvidencePath(root, name), false, name);
    assert.equal(safeEvidencePath(root, "docs/real.md"), true);
  } finally { cleanup(root); }
});

test("themed project: tokens discovered (shadcn hsl, bare components), hashes recorded, hostile theme values inert", () => {
  const root = project({ "src/styles/globals.css": LIGHT_DARK_CSS });
  try {
    const found = theme.discoverTheme(root);
    assert.equal(found.mode, "discovered");
    assert.equal(found.light.background, "#ffffff");
    assert.equal(found.light.radius, "0.75rem");
    assert.equal(found.light.fontSans, "Inter, Helvetica Neue, sans-serif");
    assert.equal(found.dark.background, "#09090b");
    assert.equal(found.sources.length, 1);
    assert.match(found.sources[0].sha256, /^[0-9a-f]{64}$/);
    for (const mode of ["light", "dark"]) for (const pair of theme.PAIRS) assert.ok(theme.ratioOf(found[mode], pair) >= 4.5, `${mode} ${pair}`);
    assert.ok(stylesheet(found).includes("--radius:0.75rem"));
  } finally { cleanup(root); }
});

test("Tailwind v4 @theme aliases are discovered; var() indirection is rejected with a reason", () => {
  const direct = project({ "app.css": "@theme { --color-background: #ffffff; --color-foreground: #111111; --color-primary: #1d4ed8; --color-primary-foreground: #ffffff; --color-muted: #f3f4f6; --color-muted-foreground: #4b5563; }" });
  const indirect = project({ "app.css": ":root{--background: oklch(1 0 0)}\n@theme inline { --color-background: var(--background); }" });
  try {
    const found = theme.discoverTheme(direct);
    assert.equal(found.light.primary, "#1d4ed8");
    assert.equal(found.provenance.light.primary, "discovered");
    const rejected = theme.discoverTheme(indirect);
    assert.equal(rejected.mode, "fallback");
    assert.ok(rejected.rejected.some((item) => /contrast-verified|var\(\)/.test(item.reason)));
  } finally { cleanup(direct, indirect); }
});

test("no stylesheet, or themeMode fallback, yields the documented fallback and skips discovery", () => {
  const none = project();
  const themed = project({ "a.css": LIGHT_DARK_CSS, ".project/reports/settings.json": { schemaVersion: 1, themeMode: "fallback" } });
  try {
    const bare = theme.discoverTheme(none);
    assert.equal(bare.mode, "fallback");
    assert.deepEqual(bare.light, theme.FALLBACK.light);
    assert.match(bare.reason, /no theme tokens/);
    const forced = theme.discoverTheme(themed);
    assert.equal(forced.mode, "fallback");
    assert.equal(forced.sources.length, 0);
    assert.match(forced.reason, /themeMode is fallback/);
  } finally { cleanup(none, themed); }
});

test("invalid settings.json is ignored with a note, never trusted", () => {
  for (const settings of ["{not json", { schemaVersion: 2, themeMode: "auto" }, { schemaVersion: 1, themeMode: "<script>" }]) {
    const root = project({ ".project/reports/settings.json": settings });
    try {
      const found = theme.discoverTheme(root);
      assert.equal(found.themeMode, "auto");
      assert.ok(found.notes.some((note) => /settings\.json ignored/.test(note)));
    } finally { cleanup(root); }
  }
});

test("an ancestor-directory symlink on .project cannot smuggle settings.json or theme.json from outside the project", () => {
  const outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "state-html-outside-")));
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "state-html-")));
  try {
    fs.mkdirSync(path.join(outside, "reports"), { recursive: true });
    fs.writeFileSync(path.join(outside, "reports/settings.json"), JSON.stringify({ schemaVersion: 1, themeMode: "fallback" }));
    fs.writeFileSync(path.join(outside, "reports/theme.json"), JSON.stringify({ sources: [{ path: "evil.css", sha256: "x" }] }));
    fs.symlinkSync(outside, path.join(root, ".project"));
    const settings = theme.readSettings(root);
    assert.equal(settings.themeMode, "auto", "settings.json read through an ancestor symlink must be ignored, not trusted");
    assert.match(settings.note, /outside the project/);
    const changes = theme.themeChanges(root, { sources: [] });
    assert.equal(changes.recorded, false, "theme.json read through an ancestor symlink must be ignored, not trusted");
  } finally { cleanup(root, outside); }
});

test("every documented fallback pair is at least 4.5:1 in light and dark", () => {
  for (const mode of ["light", "dark"]) for (const pair of theme.PAIRS) assert.ok(theme.ratioOf(theme.FALLBACK[mode], pair) >= 4.5, `${mode} ${pair.join("/")}`);
  assert.equal(theme.contrastRatio([0, 0, 0], [255, 255, 255]).toFixed(1), "21.0");
});

test("grammar violations are rejected, never sanitized, and never reach the stylesheet", () => {
  const evil = [
    "#000; } body { background: url(https://evil.example/x) } :root { --x: 1",
    "url(javascript:alert(1))", "expression(alert(1))", "red", "#12", "rgb(300, 0, 0)", "hsl(400 10% 10%)", "<script>", "\\0041", "#000 !important",
  ];
  const root = project({ "a.css": `:root{${evil.map((value, index) => `--primary${index ? "-foreground" : ""}: ${value};`).join("\n")} --background: #ffffff; --foreground: #000000; --radius: 1rem; } body{--font-sans: "Comic Sans", url(x); }` });
  try {
    const found = theme.discoverTheme(root);
    const css = stylesheet(found);
    for (const bad of ["evil.example", "javascript", "expression", "<script", "!important", "url("]) assert.ok(!css.includes(bad), bad);
    assert.ok(found.rejected.length >= 1);
    assertOnlyKnownMarkup(page(root, found));
  } finally { cleanup(root); }
});

test("hostile values handed straight to the renderer are re-validated and fall back", () => {
  const root = project();
  try {
    const hostile = { light: { ...theme.FALLBACK.light, background: "red;}</style><script>alert(1)</script>", radius: "1px;}", fontSans: "a;}b", primary: "url(x)" }, dark: { ...theme.FALLBACK.dark, foreground: "#000000", background: "#010101" } };
    const html = renderHtml(snapshotOf(root), hostile, { root });
    assertOnlyKnownMarkup(html);
    assert.ok(!html.includes("alert(1)"));
    assert.ok(html.includes(`--bg:${theme.FALLBACK.light.background}`));
    // The low-contrast dark pair (#000 on #010101) is not used either.
    assert.ok(html.includes(`--fg:${theme.FALLBACK.dark.foreground}`));
  } finally { cleanup(root); }
});

test("safeTheme keeps the fallback font when fontSans/fontMono is absent, not undefined", () => {
  const partial = { light: { background: "#ffffff", foreground: "#000000" }, dark: { background: "#000000", foreground: "#ffffff" } };
  const safe = theme.safeTheme(partial);
  for (const mode of ["light", "dark"]) for (const key of ["fontSans", "fontMono"]) {
    assert.equal(typeof safe[mode][key], "string", `${mode}.${key} must stay a string, never undefined`);
    assert.equal(safe[mode][key], theme.FALLBACK[mode][key]);
  }
  assert.ok(!stylesheet(safe).includes("undefined"), "a stylesheet must never emit the literal text \"undefined\"");
});

test("low-contrast text pair falls back for that group only, with a recorded reason", () => {
  const root = project({ "a.css": `:root{--background:#ffffff;--foreground:#eeeeee;--primary:#1d4ed8;--primary-foreground:#ffffff;--muted:#f3f4f6;--muted-foreground:#4b5563;}` });
  try {
    const found = theme.discoverTheme(root);
    assert.equal(found.provenance.light.foreground, "fallback");
    assert.equal(found.provenance.light.background, "fallback");
    assert.equal(found.provenance.light.primary, "discovered", "accent group kept");
    assert.ok(found.fallbacks.some((item) => item.scope === "light.text" && /contrast .*below 4\.5/.test(item.reason)));
    assert.equal(found.mode, "partial");
  } finally { cleanup(root); }
});

test("an oklch() pair cannot be contrast-verified and falls back with a reason", () => {
  const root = project({ "a.css": `:root{--background:#ffffff;--foreground:#111111;--primary:oklch(0.5 0.2 250);--primary-foreground:#ffffff;}` });
  try {
    const found = theme.discoverTheme(root);
    assert.equal(found.provenance.light.primary, "fallback");
    assert.ok(found.fallbacks.some((item) => item.scope === "light.accent" && /contrast-verified/.test(item.reason)));
    assert.equal(found.provenance.light.background, "discovered");
  } finally { cleanup(root); }
});

test("a discovered background that clashes with the fallback accent sends the whole mode to fallback", () => {
  const root = project({ "a.css": `:root{--background:#000000;--foreground:#ffffff;}` });
  try {
    const found = theme.discoverTheme(root);
    assert.deepEqual(found.light, theme.FALLBACK.light);
    assert.ok(found.fallbacks.some((item) => item.scope === "light" && /whole light theme falls back/.test(item.reason)));
  } finally { cleanup(root); }
});

test("light-only themes use the fallback dark mode and say so", () => {
  const root = project({ "a.css": `:root{--background:#ffffff;--foreground:#111111;--primary:#1d4ed8;--primary-foreground:#ffffff;--muted:#f3f4f6;--muted-foreground:#4b5563;}` });
  try {
    const found = theme.discoverTheme(root);
    assert.deepEqual(found.dark, theme.FALLBACK.dark);
    assert.ok(found.fallbacks.some((item) => item.scope === "dark" && /no dark tokens/.test(item.reason)));
  } finally { cleanup(root); }
});

test("scan bounds: oversized and excess stylesheets are skipped with a note; symlinks and skipped directories are ignored", () => {
  const outside = project({ "evil.css": LIGHT_DARK_CSS });
  const root = project({ "big.css": `:root{--background:#ffffff}${" ".repeat(300 * 1024)}`, "node_modules/x/a.css": LIGHT_DARK_CSS, ".project/skipped.css": LIGHT_DARK_CSS });
  try {
    fs.symlinkSync(path.join(outside, "evil.css"), path.join(root, "link.css"));
    for (let index = 0; index < 205; index++) fs.writeFileSync(path.join(root, `f${String(index).padStart(3, "0")}.css`), "a{color:red}");
    const found = theme.discoverTheme(root);
    assert.equal(found.mode, "fallback");
    assert.equal(found.sources.length, 0);
    assert.ok(found.notes.some((note) => /beyond the 200-file scan limit/.test(note)));
    fs.rmSync(path.join(root, "f000.css"));
  } finally { cleanup(root, outside); }
  const big = project({ "big.css": `:root{--background:#ffffff}${" ".repeat(300 * 1024)}` });
  try { assert.ok(theme.discoverTheme(big).notes.some((note) => /larger than 256 KB/.test(note))); } finally { cleanup(big); }
});

test("editing a stylesheet refreshes the theme and reports the change; render --apply records hashes", () => {
  const root = project({ "a.css": LIGHT_DARK_CSS });
  try {
    assert.equal(run(SNAPSHOT_SCRIPT, root, "--apply").status, 0);
    const first = run(RENDER_SCRIPT, root, "--apply");
    assert.equal(first.status, 0, first.stderr);
    const recorded = JSON.parse(fs.readFileSync(path.join(root, theme.THEME_FILE), "utf8"));
    assert.equal(recorded.sources.length, 1);
    assert.match(run(RENDER_SCRIPT, root, "--apply").stdout, /unchanged/);

    fs.writeFileSync(path.join(root, "a.css"), LIGHT_DARK_CSS.replace("0.75rem", "1rem"));
    const preview = run(RENDER_SCRIPT, root);
    assert.match(preview.stdout, /changed: a\.css \(changed\)/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, theme.THEME_FILE), "utf8")).sources[0].sha256, recorded.sources[0].sha256, "preview does not write");
    const refreshed = run(RENDER_SCRIPT, root, "--apply");
    assert.match(refreshed.stdout, /wrote/);
    assert.notEqual(JSON.parse(fs.readFileSync(path.join(root, theme.THEME_FILE), "utf8")).sources[0].sha256, recorded.sources[0].sha256);
    assert.match(fs.readFileSync(path.join(root, ".project/reports/state.html"), "utf8"), /--radius:1rem/);
  } finally { cleanup(root); }
});

test("a hand-edited theme.json is never trusted as theme input", () => {
  const root = project({ ".project/reports/theme.json": { light: { background: "red;}</style><script>x</script>" }, sources: "not-an-array" } });
  try {
    assert.equal(run(SNAPSHOT_SCRIPT, root, "--apply").status, 0);
    assert.equal(run(RENDER_SCRIPT, root, "--apply").status, 0);
    const html = fs.readFileSync(path.join(root, ".project/reports/state.html"), "utf8");
    assert.ok(!html.includes("<script"));
  } finally { cleanup(root); }
});

test("structure: language, landmarks, ordered headings, table scopes, viewport, mobile, print, color scheme", () => {
  const root = project({ ".project/status.md": "# Status\n\n## Active pitches\n| Pitch | Hill |\n|---|---|\n| a | b |\n", "a.css": LIGHT_DARK_CSS });
  try {
    const html = page(root);
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
    for (const landmark of ["<header>", "<nav aria-label=", "<main id=\"main\">"]) assert.ok(html.includes(landmark), landmark);
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    assert.ok(!/<h3/.test(html));
    const headings = [...html.matchAll(/<h([1-6])/g)].map((match) => Number(match[1]));
    headings.forEach((level, index) => assert.ok(index === 0 ? level === 1 : level - headings[index - 1] <= 1));
    assert.ok(!/<th>/.test(html), "every th has a scope");
    assert.equal((html.match(/<table>/g) || []).length, (html.match(/<caption>/g) || []).length, "every table has a caption");
    assert.ok(/<th scope="col">/.test(html) && /<th scope="row">/.test(html));
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, "ids are unique");
    for (const [, target] of html.matchAll(/aria-labelledby="([^"]+)"/g)) assert.ok(ids.includes(target), `aria-labelledby ${target} resolves`);
    for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(target), `anchor #${target} resolves`);
    assert.match(html, /@media \(max-width:640px\)/);
    assert.match(html, /@media print/);
    assert.match(html, /@media \(prefers-color-scheme:dark\)/);
    assert.match(html, /color-scheme:light dark/);
    assert.match(html, /:focus-visible/);
  } finally { cleanup(root); }
});

test("missing metrics and database are labeled, never blank or zero", () => {
  const root = project();
  try {
    const html = page(root);
    assert.match(html, /Token metrics are unavailable for this project; nothing is estimated/);
    assert.match(html, /status-unavailable">unavailable<\/span><\/td><td><code>|status-unavailable">unavailable</);
    assert.match(html, /status-unconfigured">unconfigured</);
    assert.ok(!/<td>0<\/td>/.test(html));
    assertOnlyKnownMarkup(html);
  } finally { cleanup(root); }
});

test("a snapshot with sections removed still renders, labeling the gaps", () => {
  const root = project();
  try {
    const snapshot = { schemaVersion: 1, generatedAt: NOW };
    const html = renderHtml(snapshot, theme.discoverTheme(root), { root });
    assert.match(html, /this section is missing from the snapshot/);
    assertOnlyKnownMarkup(html);
  } finally { cleanup(root); }
});

test("a null or non-fact element in project/pitches/skills arrays is dropped, not a crash", () => {
  const root = project();
  try {
    const snapshot = snapshotOf(root);
    snapshot.project.description = [null, "bare-string", { status: "observed" }, { value: { heading: "H", summary: "ok" }, status: "observed", evidence: [] }];
    snapshot.pitches.items = [null, { value: { slug: "ok" }, status: "observed", evidence: [] }];
    snapshot.skills = { installed: [null, { value: { id: "skill-a" }, status: "observed", evidence: [] }], caveman: { value: null, status: "unconfigured", evidence: [] } };
    let html;
    assert.doesNotThrow(() => { html = renderHtml(snapshot, theme.discoverTheme(root), { root }); });
    assert.ok(html.includes("skill-a"));
    assert.ok(html.includes(">ok<") || html.includes("ok</th"));
    assertOnlyKnownMarkup(html);
  } finally { cleanup(root); }
});

test("a single oversized leaf string or note is bounded before it reaches the page", () => {
  const root = project();
  try {
    const huge = "&".repeat(900 * 1024);
    const snapshot = snapshotOf(root);
    snapshot.metrics = { value: huge, status: "observed", evidence: [], note: huge };
    const html = renderHtml(snapshot, theme.discoverTheme(root), { root });
    assert.ok(html.length < 100 * 1024, `page grew to ${html.length} bytes from one leaf string/note`);
    assertOnlyKnownMarkup(html);
  } finally { cleanup(root); }
});

test("rendering is deterministic and --apply is idempotent", () => {
  const root = project({ "a.css": LIGHT_DARK_CSS });
  try {
    assert.equal(page(root), page(root));
    run(SNAPSHOT_SCRIPT, root, "--apply", "--now", NOW);
    assert.match(run(RENDER_SCRIPT, root, "--apply").stdout, /wrote/);
    assert.match(run(RENDER_SCRIPT, root, "--apply").stdout, /unchanged/);
    assert.deepEqual(fs.readdirSync(path.join(root, ".project/reports")).sort(), ["index.html", "knowledge.html", "metrics.html", "pitches.html", "skills.html", "state.html", "state.json", "structure.html", "theme.json"]);
  } finally { cleanup(root); }
});

test("CLI: preview writes nothing; missing or unsupported snapshots and unknown options fail clearly", () => {
  const root = project();
  try {
    const missing = run(RENDER_SCRIPT, root);
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /run node ai-framework\/scripts\/state-snapshot\.mts --apply first/);
    fs.mkdirSync(path.join(root, ".project/reports"));
    fs.writeFileSync(path.join(root, ".project/reports/state.json"), JSON.stringify({ schemaVersion: 7 }));
    assert.match(run(RENDER_SCRIPT, root).stderr, /unsupported schemaVersion/);
    fs.writeFileSync(path.join(root, ".project/reports/state.json"), "{nope");
    assert.match(run(RENDER_SCRIPT, root).stderr, /not valid JSON/);
    run(SNAPSHOT_SCRIPT, root, "--apply");
    const preview = run(RENDER_SCRIPT, root);
    assert.equal(preview.status, 0);
    assert.match(preview.stdout, /preview only/);
    assert.ok(!fs.existsSync(path.join(root, ".project/reports/state.html")));
    assert.match(run(RENDER_SCRIPT, root, "--bogus").stderr, /Unknown option/);
  } finally { cleanup(root); }
});

test("a symlinked state.json, html destination, or reports directory is refused", () => {
  const outside = project({ "victim.json": "{}" });
  const linkedInput = project();
  const linkedOutput = project();
  try {
    fs.mkdirSync(path.join(linkedInput, ".project/reports"));
    fs.symlinkSync(path.join(outside, "victim.json"), path.join(linkedInput, ".project/reports/state.json"));
    assert.match(run(RENDER_SCRIPT, linkedInput).stderr, /symlink refused/);

    run(SNAPSHOT_SCRIPT, linkedOutput, "--apply");
    fs.symlinkSync(path.join(outside, "victim.html"), path.join(linkedOutput, ".project/reports/state.html"));
    const blocked = run(RENDER_SCRIPT, linkedOutput, "--apply");
    assert.equal(blocked.status, 1);
    assert.match(blocked.stderr, /Symlink destination forbidden/);
    assert.ok(!fs.existsSync(path.join(outside, "victim.html")));
    assert.throws(() => render(linkedOutput, { apply: true }), /Symlink destination forbidden/);
  } finally { cleanup(outside, linkedInput, linkedOutput); }
});

test("a nonexistent --root fails with a fixed reason, never the raw absolute path", () => {
  const bogus = path.join(os.tmpdir(), `state-html-missing-${Date.now()}`);
  try {
    const result = run(RENDER_SCRIPT, bogus);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /root does not exist or is not resolvable/);
    assert.ok(!result.stderr.includes(bogus), "the raw --root path must not reach stderr");
    assert.throws(() => theme.discoverTheme(bogus), /root does not exist or is not resolvable/);
  } finally { /* bogus was never created */ }
});

test("end to end on a real-shaped project: snapshot then render produce a page that passes every structural check", () => {
  const root = project({
    ".project/status.md": "# Status\n\n## Active pitches\n| Pitch | Hill | Phase | Appetite | Last touched |\n|---|---|---|---|---|\n| alpha | uphill 0% | plan | small-batch | 2026-09-20 |\n",
    ".project/pitches/alpha/pitch.md": "# Pitch: Alpha\n\n**Appetite**: small-batch • **Status**: bet\n",
    ".project/context/product.md": "# Product\n\n## Overview\n\nA product described with enough words to count as a filled file for tests.\n",
    "README.md": "# Alpha App\n\nAn app used in an end to end test.\n",
    "src/globals.css": LIGHT_DARK_CSS,
    "db/migrations/001_init.sql": "select 1;\n",
  });
  try {
    assert.equal(run(SNAPSHOT_SCRIPT, root, "--apply").status, 0);
    const rendered = run(RENDER_SCRIPT, root, "--apply");
    assert.equal(rendered.status, 0, rendered.stderr);
    const html = fs.readFileSync(path.join(root, ".project/reports/state.html"), "utf8");
    assertOnlyKnownMarkup(html);
    assert.match(html, /State report — Alpha App/);
    assert.match(html, /theme: discovered|--radius:0\.75rem/);
    assert.ok(html.includes('<a href="../../db/migrations/001_init.sql">'));
    assert.ok(html.includes("alpha"));
  } finally { cleanup(root); }
});

test("the renderer and theme module load no network capability", () => {
  for (const file of ["state-render.mts", "state-theme.mts"]) {
    const source = fs.readFileSync(path.join(import.meta.dirname, file), "utf8");
    assert.ok(!/require\(["'](?:node:)?(?:https?|net|tls|dgram|dns|child_process)["']\)/.test(source), file);
    assert.ok(!/\bfetch\(|\beval\(|new Function/.test(source), file);
  }
});

test("audit fixes: one landmark per table, notes in their own column, readable keys, visible attention cue, summary and legend first", () => {
  const root = project({
    ".project/status.md": "# Status\n\n## Active pitches\n| Pitch | Hill |\n|---|---|\n| listed | x |\n",
    ".project/pitches/listed/pitch.md": "# Pitch: listed\n\n**Appetite**: small-batch\n",
    ".project/pitches/unlisted/pitch.md": "# Pitch: Unlisted title\n\n**Appetite**: small-batch\n",
    "README.md": "# App\n\n**Bold** claim with `code` and a [link](http://evil.example/x).\n",
  });
  try {
    run(SNAPSHOT_SCRIPT, root, "--apply", "--now", NOW);
    const html = page(root, theme.discoverTheme(root), JSON.parse(fs.readFileSync(path.join(root, ".project/reports/state.json"), "utf8")));
    assert.ok(!/role="region"/.test(html.replace(/<style>[\s\S]*<\/style>/, "")), "scroll wrappers are groups; only sections are landmarks");
    assert.match(html, /<th scope="col">Notes<\/th>/);
    assert.match(html, /<td>directory is not listed in \.project\/status\.md, the lifecycle authority<\/td>/);
    assert.ok(!/listed<br><span class="sub">listed<\/span>/.test(html), "title equal to slug is not repeated");
    assert.ok(/unlisted<br><span class="sub">Unlisted title<\/span>/.test(html));
    assert.ok(!/<dt>[a-z]+[A-Z][A-Za-z]*<\/dt>/.test(html), "camelCase keys are humanized");
    assert.match(html, /<p class="summary">\d+ observed/);
    assert.ok(html.indexOf('id="legend"') < html.indexOf('id="workflow"'), "legend before the data");
    assert.match(html, /td,th,a,code\{overflow-wrap:anywhere\}/);
    assert.match(html, /\.status-stale[^{]*\{border:2px dashed var\(--fg\)\}/);
    assert.match(html, /\.scroll tbody th\{position:sticky/);
    assert.ok(!/\*\*|`|evil\.example/.test(html.replace(/<style>[\s\S]*<\/style>/, "")), "markdown and link targets do not leak into summaries");
    assertOnlyKnownMarkup(html);
  } finally { cleanup(root); }
});

test("theme scan is depth-bounded: a stylesheet 5 levels down is read, one 8 levels down is not", () => {
  const shallow = project({ "a/b/c/d/e/theme.css": LIGHT_DARK_CSS });
  const deep = project({ "a/b/c/d/e/f/g/h/theme.css": LIGHT_DARK_CSS });
  try {
    assert.equal(theme.discoverTheme(shallow).sources.length, 1);
    assert.equal(theme.discoverTheme(deep).sources.length, 0);
  } finally { cleanup(shallow, deep); }
});

test("terminal escapes from a hand-edited theme.json or a hostile CSS filename never reach the terminal raw", () => {
  const root = project({ ".project/reports/theme.json": { sources: [{ path: "\u001b[2J\u001b]0;pwned\u0007FAKE", sha256: "x" }] } });
  try {
    run(SNAPSHOT_SCRIPT, root, "--apply");
    const out = run(RENDER_SCRIPT, root).stdout;
    assert.ok(!/[\u0000-\u0008\u000b-\u001f\u007f]/.test(out), JSON.stringify(out));
    assert.match(out, /changed:/);
  } finally { cleanup(root); }
});

test("an oversized recorded theme.json is ignored, and symlinked files in the CSS scan are never read", () => {
  const root = project({ ".project/reports/theme.json": `{"sources":[],"pad":"${"x".repeat(300 * 1024)}"}` });
  try { assert.deepEqual(theme.themeChanges(root, { sources: [{ path: "a.css", sha256: "y" }] }), { recorded: false, changed: [] }); } finally { cleanup(root); }
});

test("custom property names that are Object internals are not treated as tokens", () => {
  const root = project({ "a.css": ":root{--constructor:zzz;--__proto__:zzz;--toString:zzz;--hasOwnProperty:zzz;}" });
  try {
    const found = theme.discoverTheme(root);
    assert.equal(found.sources.length, 0);
    assert.equal(found.mode, "fallback");
  } finally { cleanup(root); }
});

test("secret-shaped names beyond .env are not linked", () => {
  const root = project({ ".npmrc": "x", ".netrc": "x", "id_ed25519": "x", "keys/a.p12": "x", "docs/ok.md": "x" });
  try {
    for (const name of [".npmrc", ".netrc", "id_ed25519", "keys/a.p12"]) assert.equal(safeEvidencePath(root, name), false, name);
    assert.equal(safeEvidencePath(root, "docs/ok.md"), true);
  } finally { cleanup(root); }
});

test("injected evidence filesystem controls links and renderer main writes only injected output", () => {
  const root = project({ "README.md": "# Injected\n\nFixture." });
  try {
    const deps = typeof globalThis.Bun === "undefined" ? createNodeDeps() : createBunDeps();
    const api = createStateRender(deps);
    assert.equal(api.safeEvidencePath(root, "README.md"), true);
    const original = deps.fs.lstatSync;
    deps.fs.lstatSync = (file) => { if (file.endsWith("README.md")) throw new Error("denied"); return original(file); };
    assert.equal(api.safeEvidencePath(root, "README.md"), false);
    const output: string[] = [];
    deps.io.stderr.write = (text) => { output.push(text); };
    assert.equal(main(["--root", root], deps), 1);
    assert.match(output[0], /state.json not found/);
  } finally { cleanup(root); }
});

// ---- multipage report (state-pages.mts) ----
const fact = (value, extra = {}) => ({ value, status: "observed", evidence: [], ...extra });
const PAGES = ["index", "structure", "skills", "metrics", "knowledge", "pitches"];
function fixture(overrides = {}) {
  return {
    schemaVersion: 1, generatedAt: NOW,
    structure: {
      projectType: fact("workflow-bundle"),
      tree: [fact({ path: "ai-framework", kind: "dir", role: "framework", depth: 1 }), fact({ path: "ai-framework/scripts", kind: "dir", role: "node tools", depth: 2 }), fact({ path: ".project", kind: "dir", role: "project records", depth: 1 })],
      decisions: [fact({ path: "ai-framework", id: "dec-1", title: "Keep it portable" }, { evidence: ["NOTES.md"] })],
    },
    skills: { base: [fact({ id: "shape", enabled: true, phases: ["shape"], scope: "base" })], project: [fact({ id: "mine", enabled: false, phases: [], scope: "project" })] },
    ...overrides,
  };
}
function withState(snapshot, files = {}) {
  const root = project({ "README.md": "# Hi\n", "NOTES.md": "n", ...files });
  fs.mkdirSync(path.join(root, ".project/reports"), { recursive: true });
  fs.writeFileSync(path.join(root, ".project/reports/state.json"), JSON.stringify(snapshot));
  return root;
}
const reports = (root) => path.join(root, ".project/reports");
const read = (root, name) => fs.readFileSync(path.join(reports(root), name), "utf8");

test("multipage: all six pages and state.html are written together, script-free, CSP on each, nav resolves", () => {
  const root = withState(fixture());
  try {
    const result = render(root, { apply: true });
    assert.equal(result.pages.length, 7);
    for (const name of [...PAGES.map((p) => `${p}.html`), "state.html"]) {
      const html = read(root, name);
      assert.ok(!/<script/i.test(html), name);
      assert.match(html, /<meta http-equiv="Content-Security-Policy" content="default-src 'none'/);
      assertOnlyKnownMarkup(html);
      for (const [, href] of html.matchAll(/href="([a-z]+\.html)"/g)) assert.ok(fs.existsSync(path.join(reports(root), href)), `${name} -> ${href}`);
    }
    assert.deepEqual(fs.readdirSync(reports(root)).filter((n) => n.startsWith(".")), [], "no staging directory left behind");
    const structure = read(root, "structure.html");
    assert.match(structure, /workflow-bundle/);
    assert.match(structure, /<code>scripts\/<\/code>/);
    assert.match(structure, /href="#dec-0">dec-1</);
    assert.match(structure, /href="\.\.\/\.\.\/NOTES\.md"/);
    assert.match(read(root, "skills.html"), /Base skills[\s\S]*shape[\s\S]*Project skills[\s\S]*mine/);
    assert.equal(render(root, { apply: true }).pages.some((p) => p.changed), false, "idempotent");
  } finally { cleanup(root); }
});

test("multipage: metrics and graph links appear only when the target file exists", () => {
  const without = withState(fixture());
  const withFiles = withState(fixture(), { ".project/metrics/token-consumption.html": "<p>x</p>", ".project/metrics/workflow-usage.html": "<p>y</p>", "graphify-out/graph.html": "<p>g</p>", "graphify-out/GRAPH_REPORT.md": "# r" });
  const linked = withState(fixture());
  try {
    render(without, { apply: true }); render(withFiles, { apply: true });
    assert.ok(!/token-consumption|workflow-usage/.test(read(without, "metrics.html")));
    assert.ok(!/graph\.html|GRAPH_REPORT/.test(read(without, "knowledge.html")));
    assert.match(read(without, "metrics.html"), /Full token consumption report: <span class="none">unavailable \(file not found\)/);
    assert.match(read(without, "metrics.html"), /Workflow usage report: <span class="none">unavailable/);
    assert.match(read(without, "knowledge.html"), /Interactive knowledge graph: <span class="none">unavailable[\s\S]*Graph report: <span class="none">unavailable/);
    assert.ok(read(without, "metrics.html").indexOf("<ul><li>") < read(without, "metrics.html").indexOf("<table>"), "links sit directly under the heading, above the table");
    assert.match(read(withFiles, "metrics.html"), /href="\.\.\/\.\.\/\.project\/metrics\/token-consumption\.html"[\s\S]*workflow-usage\.html/);
    assert.match(read(withFiles, "knowledge.html"), /href="\.\.\/\.\.\/graphify-out\/graph\.html"[\s\S]*GRAPH_REPORT\.md/);
    // a symlinked target is not linked
    fs.mkdirSync(path.join(linked, "graphify-out")); fs.writeFileSync(path.join(linked, "real.html"), "x");
    fs.symlinkSync(path.join(linked, "real.html"), path.join(linked, "graphify-out/graph.html"));
    render(linked, { apply: true });
    assert.ok(!/graph\.html/.test(read(linked, "knowledge.html")));
  } finally { cleanup(without, withFiles, linked); }
});

test("multipage: an old state.json without the new sections renders every page as unavailable", () => {
  const root = withState({ schemaVersion: 1, generatedAt: NOW });
  try {
    render(root, { apply: true });
    for (const p of PAGES) assert.ok(fs.existsSync(path.join(reports(root), `${p}.html`)));
    assert.match(read(root, "structure.html"), /No folder tree[\s\S]*unavailable/);
    assert.match(read(root, "skills.html"), /None listed\. <span class="status status-unavailable">unavailable<\/span>/);
    assert.match(read(root, "structure.html"), /<span class="status status-unavailable">unknown/);
  } finally { cleanup(root); }
});

test("multipage: hostile new sections degrade that section only, never the render", () => {
  const lone = { value: null, status: "unavailable", evidence: [], note: "n" };
  const hostile = [{ projectType: { ...lone, value: "unknown", status: "unconfigured" }, tree: lone, decisions: lone, base: lone }, null, 7, "str", [], [null, 1, "x", {}, { status: "observed" }], { projectType: 5 }, { projectType: fact({ a: 1 }), tree: "no", decisions: 9 }, { tree: [fact(null), fact("s"), fact({ path: 5 }), fact({ path: "../../etc", kind: "dir" }), fact({ path: "a/b/c/d/e", kind: "dir" }), fact({ path: "/abs", kind: "dir" }), fact({ path: ".env", kind: "file" })], decisions: [fact(null), fact([1]), fact({ path: {}, id: [], title: null })] }];
  for (const bad of hostile) {
    for (const snapshot of [fixture({ structure: bad }), fixture({ skills: bad }), fixture({ skills: { base: bad?.base ?? bad, project: bad } }), fixture({ structure: { tree: bad, decisions: bad, projectType: bad } })]) {
      const root = withState(snapshot);
      try {
        assert.doesNotThrow(() => render(root, { apply: true }), JSON.stringify(bad));
        for (const p of PAGES) assert.ok(read(root, `${p}.html`).includes("</html>"));
      } finally { cleanup(root); }
    }
  }
  const huge = Array.from({ length: 5000 }, (_, i) => fact({ path: `d${i}`, kind: "dir", role: "r", depth: 1 }));
  const root = withState(fixture({ structure: { tree: huge, decisions: huge.map((f) => fact({ path: f.value.path, id: "x", title: "t" })) } }));
  try {
    render(root, { apply: true });
    assert.ok((read(root, "structure.html").match(/<code>d\d+\/<\/code>/g) || []).length <= 500);
  } finally { cleanup(root); }
});

test("multipage: hostile strings in new sections are escaped", () => {
  const evil = '<img src=x onerror=alert(1)>"\'&';
  const root = withState(fixture({ structure: { projectType: fact(evil), tree: [fact({ path: "a", kind: "dir", role: evil, depth: 1 })], decisions: [fact({ path: "a", id: evil, title: evil })] }, skills: { base: [fact({ id: evil, enabled: true, phases: [evil], scope: evil })], project: [] } }));
  try {
    render(root, { apply: true });
    for (const p of PAGES) { const html = read(root, `${p}.html`); assert.ok(!html.includes("<img"), p); assertOnlyKnownMarkup(html); }
    assert.match(read(root, "skills.html"), /&lt;img src=x onerror=alert\(1\)&gt;&quot;&#39;&amp;/);
  } finally { cleanup(root); }
});

test("multipage: a page over the byte cap is rebuilt smaller, never written oversized", () => {
  const { renderPages } = (() => { const deps = createNodeDeps(); const api = createStateRender(deps); return { renderPages: (s, cap) => api.renderPages(s, theme.discoverTheme(os.tmpdir()), { root: null, name: "x", cap }) }; })();
  const big = fixture({ structure: { tree: Array.from({ length: 500 }, (_, i) => fact({ path: `dir${i}`, kind: "dir", role: "x".repeat(400), depth: 1 })), decisions: [] } });
  const full = renderPages(big, 10 * 1024 * 1024)["structure.html"];
  const capped = renderPages(big, 40 * 1024)["structure.html"];
  assert.ok(Buffer.byteLength(full) > 70 * 1024);
  assert.ok(Buffer.byteLength(capped) <= 40 * 1024);
  assert.match(capped, /to stay within the page size cap/);
});

test("multipage: a leftover or concurrent staging directory refuses --apply with a fixed message and writes nothing", () => {
  const root = withState(fixture());
  try {
    fs.mkdirSync(path.join(reports(root), ".state-stage"));
    const blocked = run(RENDER_SCRIPT, root, "--apply");
    assert.equal(blocked.status, 1);
    assert.match(blocked.stderr, /another state-render --apply is running or left a staging directory/);
    assert.ok(!blocked.stderr.includes(root), "no absolute path");
    assert.ok(!fs.existsSync(path.join(reports(root), "index.html")));
    assert.ok(fs.existsSync(path.join(reports(root), ".state-stage")), "a foreign stage is never removed");
    fs.rmdirSync(path.join(reports(root), ".state-stage"));
    assert.equal(run(RENDER_SCRIPT, root, "--apply").status, 0);
  } finally { cleanup(root); }
});

test("multipage: swapping the staging directory mid-write is detected before any rename and the substitute is untouched", () => {
  const root = withState(fixture());
  const outside = project({ "keep.txt": "keep" });
  try {
    const deps = createNodeDeps();
    const originalWrite = deps.fs.writeFileSync;
    let writes = 0;
    deps.fs.writeFileSync = (file, data, options) => {
      originalWrite(file, data, options);
      if (typeof file === "string" && file.includes(".state-stage") && ++writes === 2) {
        const stage = path.join(reports(root), ".state-stage");
        fs.renameSync(stage, `${stage}-moved`);
        fs.symlinkSync(outside, stage);
      }
    };
    try { assert.throws(() => createStateRender(deps).render(root, { apply: true }), /report directory changed while writing/); } finally { deps.fs.writeFileSync = originalWrite; }
    assert.deepEqual(fs.readdirSync(outside).filter((n) => n !== ".project"), ["keep.txt"], "outside directory untouched");
    assert.ok(!fs.existsSync(path.join(reports(root), "index.html")), "nothing was renamed into place");
    assert.ok(fs.lstatSync(path.join(reports(root), ".state-stage")).isSymbolicLink(), "substituted path is not followed or removed");
  } finally { cleanup(root, outside); }
});

test("multipage: swapping the reports directory itself (inode change) is refused", () => {
  const root = withState(fixture());
  try {
    const deps = createNodeDeps();
    const originalWrite = deps.fs.writeFileSync;
    let writes = 0;
    deps.fs.writeFileSync = (file, data, options) => {
      originalWrite(file, data, options);
      if (typeof file === "string" && file.includes(".state-stage") && ++writes === 1) {
        const moved = `${reports(root)}-moved`;
        fs.renameSync(reports(root), moved); fs.mkdirSync(reports(root)); fs.mkdirSync(path.join(reports(root), ".state-stage"));
      }
    };
    try { assert.throws(() => createStateRender(deps).render(root, { apply: true }), /report directory changed while writing/); } finally { deps.fs.writeFileSync = originalWrite; }
    assert.deepEqual(fs.readdirSync(reports(root)), [".state-stage"]);
  } finally { cleanup(root); }
});

test("multipage: --apply only overwrites generated pages; a user file (even one carrying the marker) and symlinks survive", () => {
  const root = withState(fixture());
  try {
    const mine = `<!doctype html>\n<!-- generated by state-render -->\n<p>team notes</p>`;
    fs.writeFileSync(path.join(reports(root), "team-notes.html"), mine);
    fs.writeFileSync(path.join(reports(root), "mine.html"), "<p>hand written</p>");
    fs.symlinkSync(path.join(root, "README.md"), path.join(reports(root), "linked.html"));
    fs.writeFileSync(path.join(reports(root), "index.html"), "<p>user overview</p>");
    fs.writeFileSync(path.join(reports(root), "state.html"), "<p>legacy report</p>");
    fs.writeFileSync(path.join(reports(root), "skills.html"), "<!-- generated by state-render -->old skills");
    const result = render(root, { apply: true });
    assert.deepEqual(result.skipped, ["index.html"]);
    assert.equal(read(root, "index.html"), "<p>user overview</p>");
    assert.match(read(root, "state.html"), /<!-- generated by state-render -->/);
    assert.ok(!read(root, "state.html").includes("legacy report"));
    assert.ok(!read(root, "skills.html").includes("old skills"));
    assert.ok(result.pages.find((page) => page.path.endsWith("skills.html")).changed);
    assert.match(run(RENDER_SCRIPT, root, "--apply").stdout, /skipped user-owned page\(s\): index\.html/);
    assert.equal(fs.readFileSync(path.join(reports(root), "team-notes.html"), "utf8"), mine);
    assert.ok(fs.existsSync(path.join(reports(root), "mine.html")));
    assert.ok(fs.lstatSync(path.join(reports(root), "linked.html")).isSymbolicLink());
  } finally { cleanup(root); }
});

test("multipage: a symlinked page destination is refused on macOS-style tmp aliases too (realpath comparison)", () => {
  const root = withState(fixture());
  const outside = project({ "victim.html": "victim" });
  try {
    assert.equal(fs.realpathSync(root), root, "project() already returns the realpath form of os.tmpdir()");
    const alias = path.join(os.tmpdir(), path.basename(root));
    assert.equal(fs.realpathSync(alias), fs.realpathSync(root));
    fs.symlinkSync(path.join(outside, "victim.html"), path.join(reports(root), "structure.html"));
    assert.throws(() => render(alias, { apply: true }), /Symlink destination forbidden/);
    assert.equal(fs.readFileSync(path.join(outside, "victim.html"), "utf8"), "victim");
    assert.ok(!fs.existsSync(path.join(reports(root), ".state-stage")));
  } finally { cleanup(root, outside); }
});

// ---- audit cycle 1 fixes ----
const pageSize = (root, name) => fs.statSync(path.join(reports(root), name)).size;

test("multipage: esc and every state.json stringification accept only scalars; hostile values never throw", () => {
  assert.equal(esc({ toString: 1 }), "");
  assert.equal(esc([1, 2]), "");
  assert.equal(esc(null), "");
  assert.equal(esc(5), "5");
  assert.equal(esc(false), "false");
  const hostileValues = [{ toString: 1 }, { toString: {}, valueOf: 1 }, [1, [2, { toString: 1 }]], null, { a: { b: { c: { toString: 1 } } } }, 5, true, ["x"], {}];
  for (const h of hostileValues) {
    // Parse from JSON text, exactly as a hand-edited state.json arrives.
    const snapshot = JSON.parse(JSON.stringify({
      schemaVersion: 1, generatedAt: h, authority: h,
      project: { readme: fact({ title: h, summary: h }, { evidence: [h], note: h }), description: [fact({ heading: h, summary: h })], architecture: [fact({ heading: 5, summary: h })], technology: [fact({ heading: [1], summary: h })] },
      pitches: { items: [fact({ slug: h, title: h, phase: h, appetite: h, hill: { scopes: h, done: h } }, { evidence: [h, "ok"], note: h }), fact({ slug: "s", title: h, hill: h })] },
      skills: { base: [fact({ id: h, enabled: h, phases: h, scope: h }), fact({ id: "a", phases: [h, h], scope: h })], project: [fact({ id: h, enabled: h, phases: [h], scope: h })], installed: [fact({ id: h }), fact(h)], caveman: fact(h) },
      structure: { projectType: fact(h), tree: [fact({ path: h, kind: "dir", role: h }), fact({ path: "a", kind: "dir", role: h }), fact({ path: "a/b", kind: "dir", role: h })], decisions: [fact({ path: h, id: h, title: h }, { evidence: [h] }), fact({ path: "a", id: h, title: h })] },
      metrics: fact(h), knowledge: fact(h), database: fact(h), workflow: { installedVersion: fact(h), lastSync: fact(h) },
    }));
    const root = withState(snapshot);
    try {
      assert.doesNotThrow(() => render(root, { apply: true }), JSON.stringify(h));
      for (const name of [...PAGES.map((p) => `${p}.html`), "state.html"]) { const html = read(root, name); assert.ok(html.includes("</html>"), name); assert.ok(!/\[object|undefined/.test(html.replace(/<style>[\s\S]*?<\/style>/, "")), `${name} leaks a stringified value for ${JSON.stringify(h)}`); }
    } finally { cleanup(root); }
  }
});

test("multipage: tree, decision and pitch values that are not scalars render empty, per section", () => {
  const bad = { toString: 1 };
  const snapshot = fixture({
    structure: { projectType: fact(bad), tree: [fact({ path: "ok", kind: "dir", role: bad }), fact({ path: bad, kind: "dir", role: "r" })], decisions: [fact({ path: "ok", id: bad, title: bad }), fact({ path: bad, id: "dx", title: "t" })] },
    skills: { base: [fact({ id: bad, enabled: true, phases: bad, scope: bad })], project: [fact({ id: "p", enabled: true, phases: [bad, "build"], scope: bad })] },
    pitches: { items: [fact({ slug: "pitch-a", title: bad, phase: bad, appetite: bad, hill: { done: bad, scopes: bad } })] },
  });
  const root = withState(snapshot);
  try {
    render(root, { apply: true });
    assert.match(read(root, "structure.html"), /<code>ok\/<\/code>/);
    assert.match(read(root, "skills.html"), /<th scope="row">p<\/th>[\s\S]*build/);
    assert.match(read(root, "pitches.html"), /pitch-a/);
  } finally { cleanup(root); }
});

test("multipage: a hostile tree path (../x, with a space, very long) never reaches a page", () => {
  const root = withState(fixture({ structure: { projectType: fact("web"), tree: [fact({ path: "../x", kind: "dir", role: "r" }), fact({ path: "a b", kind: "dir", role: "r" }), fact({ path: "z".repeat(300), kind: "dir", role: "r" }), fact({ path: "fine", kind: "dir", role: "r" })], decisions: [fact({ path: "../x", id: "d", title: "t" })] } }));
  try {
    render(root, { apply: true });
    const html = read(root, "structure.html");
    assert.match(html, /<code>fine\/<\/code>/);
    assert.ok(!html.includes("../x</code>/") && !/<code>\.\.\/x\/<\/code>/.test(html));
    assert.ok(!html.includes("a b/"));
    assert.ok(!html.includes("z".repeat(50)));
  } finally { cleanup(root); }
});

const evidenceHeavy = (n, per, width) => Array.from({ length: n }, (_, i) => fact({ slug: `pitch-${i}`, title: `T${i}`, phase: "build", appetite: "small" }, { evidence: Array.from({ length: per }, (_, j) => `${i}-${j}-`.padEnd(width, "e")) }));

test("multipage: pitch rows, decision rows and evidence links obey the byte cap through renderPages", () => {
  const api = createStateRender(createNodeDeps());
  const themeValue = theme.discoverTheme(os.tmpdir());
  const cap = 60 * 1024;
  const pitches = fixture({ pitches: { items: evidenceHeavy(100, 50, 200) } });
  const out = api.renderPages(pitches, themeValue, { root: null, name: "x", cap });
  assert.ok(Buffer.byteLength(pitches && JSON.stringify(pitches.pitches)) > cap * 10, "input is far over the cap");
  assert.ok(Buffer.byteLength(out["pitches.html"]) <= cap, "pitches page");
  assert.match(out["pitches.html"], /<\/html>/);
  const decisions = fixture({ structure: { projectType: fact("web"), tree: [fact({ path: "a", kind: "dir", role: "r" })], decisions: Array.from({ length: 300 }, (_, i) => fact({ path: "a", id: `d${i}`, title: "t".repeat(120) }, { evidence: Array.from({ length: 50 }, (_, j) => `${i}-${j}-`.padEnd(200, "e")) })) } });
  const dec = api.renderPages(decisions, themeValue, { root: null, name: "x", cap });
  assert.ok(Buffer.byteLength(dec["structure.html"]) <= cap, "decision rows");
  const one = fixture({ pitches: { items: evidenceHeavy(1, 50, 200) } });
  const small = api.renderPages(one, themeValue, { root: null, name: "x", cap: 20 * 1024 });
  assert.ok(Buffer.byteLength(small["pitches.html"]) <= 20 * 1024, "evidence-heavy fact");
});

test("multipage: a cap too small even for zero entries yields a short valid notice page, never an oversized one", () => {
  const api = createStateRender(createNodeDeps());
  const out = api.renderPages(fixture({ pitches: { items: evidenceHeavy(5, 50, 200) } }), theme.discoverTheme(os.tmpdir()), { root: null, name: "N".repeat(5000), cap: 1 });
  for (const name of Object.keys(out)) { assert.match(out[name], /Page omitted: exceeds size cap\./, name); assert.ok(out[name].includes("</html>"), name); assertOnlyKnownMarkup(out[name]); }
  assert.ok(!out["index.html"].includes("N".repeat(600)), "project name is bounded");
  // A metrics fact whose value is enormous in nested form cannot be shrunk by limit; the notice replaces the body.
  const wide = (d) => (d === 0 ? "w".repeat(400) : Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`k${i}`, wide(d - 1)])));
  const metricsOut = api.renderPages(fixture({ metrics: fact(wide(2)) }), theme.discoverTheme(os.tmpdir()), { root: null, name: "x", cap: 30 * 1024 });
  assert.ok(Buffer.byteLength(metricsOut["metrics.html"]) <= 30 * 1024);
});

test("multipage: the 512 KB cap holds through render --apply (default cap, CLI)", () => {
  const root = withState(fixture({ pitches: { items: evidenceHeavy(80, 50, 200) } }));
  try {
    assert.ok(fs.statSync(path.join(reports(root), "state.json")).size < 1024 * 1024);
    const result = run(RENDER_SCRIPT, root, "--apply");
    assert.equal(result.status, 0, result.stderr);
    for (const name of [...PAGES.map((p) => `${p}.html`), "state.html"]) assert.ok(pageSize(root, name) <= 512 * 1024, name);
    assert.ok(pageSize(root, "pitches.html") > 1024, "still a real page");
    // and through render() with an explicit small cap
    render(root, { apply: true, cap: 40 * 1024 });
    for (const name of [...PAGES.map((p) => `${p}.html`), "state.html"]) assert.ok(pageSize(root, name) <= 40 * 1024, name);
  } finally { cleanup(root); }
});

test("multipage: project name and readme title are bounded and generatedAt is escaped exactly once", () => {
  const root = withState(fixture({ generatedAt: "<g&>", project: { readme: fact({ title: "T".repeat(5000) }) } }));
  try {
    render(root, { apply: true });
    for (const p of PAGES) { const html = read(root, `${p}.html`); assert.ok(!html.includes("T".repeat(600)), p); assert.ok(html.includes("Generated &lt;g&amp;&gt;."), p); assert.ok(!html.includes("&amp;lt;")); }
  } finally { cleanup(root); }
});

test("multipage: structure.html collapses big folders, hides unknown roles, summarises mirror skills and keeps print/target/nav styles", () => {
  const kids = (parent, n, role = "unclassified") => Array.from({ length: n }, (_, i) => fact({ path: `${parent}/k${i}`, kind: "dir", role }));
  const tree = [fact({ path: "big", kind: "dir", role: "Big role" }), ...kids("big", 12), fact({ path: "big/k0", kind: "dir", role: "x" }), ...kids("big/k1", 10), fact({ path: "big/k1", kind: "dir", role: "r" }), fact({ path: ".claude", kind: "dir", role: "Claude Code adapters" }), fact({ path: ".claude/skills", kind: "dir", role: "agent skills" }), ...Array.from({ length: 40 }, (_, i) => fact({ path: `.claude/skills/sk${i}`, kind: "dir", role: "unclassified" })), fact({ path: "small", kind: "dir", role: "unclassified" })];
  const root = withState(fixture({ structure: { projectType: fact("web"), tree, decisions: [] } }));
  try {
    render(root, { apply: true });
    const html = read(root, "structure.html");
    assert.match(html, /<details open><summary>12 folders<\/summary>/, "depth-1 big folder is open");
    assert.match(html, /<details><summary>10 folders<\/summary>/, "deeper big folder is collapsed");
    assert.ok(!/unclassified/.test(html.replace(/<style>[\s\S]*?<\/style>/, "")), "unknown roles are not printed");
    assert.match(html, /<span class="role">40 skills<\/span>/);
    assert.ok(!html.includes("sk7/"), "mirror skill children are not listed");
    assert.match(html, /tr:target\{/);
    assert.match(html, /@media \(max-width:640px\)\{\.tree ul\{padding-left:\.5rem\}/);
    assert.match(html, /@media print\{details>ul\{display:block\}\}/);
    assert.match(html, /nav a\{display:inline-block;padding:\.5rem \.6rem\}/);
    assert.match(html, /a\[aria-current="page"\]\{[^}]*border-bottom:2px solid/);
    assert.ok(!/text-decoration:none/.test(html.match(/a\[aria-current="page"\]\{[^}]*\}/)[0]), "current page keeps its underline");
    assert.ok(!/<script/.test(html));
  } finally { cleanup(root); }
});

test("multipage: skills.html stacks Base then Project under h3 headings; base drops the constant columns", () => {
  const root = withState(fixture());
  try {
    render(root, { apply: true });
    const html = read(root, "skills.html");
    assert.match(html, /<h3>Base skills[^<]*<\/h3>[\s\S]*<h3>Project skills[^<]*<\/h3>/);
    const baseTable = html.slice(html.indexOf("<h3>Base"), html.indexOf("<h3>Project"));
    assert.ok(!/Phases|Scope|Status/.test(baseTable));
    const projectTable = html.slice(html.indexOf("<h3>Project"));
    assert.match(projectTable, /Phases[\s\S]*Scope[\s\S]*Status/);
    assert.ok(!html.includes('class="cols"'));
  } finally { cleanup(root); }
});

test("multipage: metrics.html leads with the reported/total counts only when completeness is partial", () => {
  const partial = withState(fixture({ metrics: fact({ completeness: "partial", reportedUsage: 3, completions: 5 }) }));
  const measured = withState(fixture({ metrics: fact({ completeness: "measured", reportedUsage: 5, completions: 5 }) }));
  const noCounts = withState(fixture({ metrics: fact({ completeness: "partial" }) }));
  try {
    render(partial, { apply: true }); render(measured, { apply: true }); render(noCounts, { apply: true });
    assert.match(read(partial, "metrics.html"), /<p>Partial data: 3 of 5 completions reported token usage/);
    assert.ok(!/Partial data/.test(read(measured, "metrics.html")));
    assert.ok(!/Partial data/.test(read(noCounts, "metrics.html")), "no numbers are invented");
  } finally { cleanup(partial, measured, noCounts); }
});

test("multipage: a write failure is reported with the error code and a project-relative name only", () => {
  const root = withState(fixture());
  try {
    fs.chmodSync(reports(root), 0o555);
    if (process.getuid?.() === 0) return;
    let message = "";
    try { render(root, { apply: true }); } catch (error) { message = error.message; } finally { fs.chmodSync(reports(root), 0o755); }
    assert.equal(message, ".project/reports: EACCES");
    assert.ok(!message.includes(root));
    const cli = (() => { fs.chmodSync(reports(root), 0o555); try { return run(RENDER_SCRIPT, root, "--apply"); } finally { fs.chmodSync(reports(root), 0o755); } })();
    assert.equal(cli.status, 1);
    assert.ok(!cli.stderr.includes(root), "stderr has no absolute path");
  } finally { try { fs.chmodSync(reports(root), 0o755); } catch { /* gone */ } cleanup(root); }
});

test("multipage: a change after some pages were already replaced says how many", () => {
  const root = withState(fixture());
  const outside = project({ "keep.txt": "keep" });
  try {
    const deps = createNodeDeps();
    const originalRename = deps.fs.renameSync;
    let renames = 0;
    deps.fs.renameSync = (from, to) => {
      originalRename(from, to);
      if (++renames === 1) { const stage = path.join(reports(root), ".state-stage"); fs.renameSync(stage, `${stage}-moved`); fs.symlinkSync(outside, stage); }
    };
    try { assert.throws(() => createStateRender(deps).render(root, { apply: true }), /^Error: report directory changed while writing; 1 of 7 pages were already replaced$/); } finally { deps.fs.renameSync = originalRename; }
  } finally { cleanup(root, outside); }
});

test("deep state.json and value depth limits produce fixed placeholders without stack overflow", () => {
  const root = withState(fixture());
  try {
    const deep = '{"child":'.repeat(20000) + '"deep-leaf"' + '}'.repeat(20000);
    fs.writeFileSync(path.join(reports(root), "state.json"), '{"schemaVersion":1,"extra":' + deep + '}');
    const result = run(RENDER_SCRIPT, root, "--apply");
    assert.equal(result.status, 0, result.stderr);
    const api = createStateRender(createNodeDeps());
    assert.equal(api.value(JSON.parse(deep), 33), "[depth limit]");
    assert.equal(api.value("leaf", 33), "[depth limit]");
    assert.ok(!api.value(JSON.parse(deep)).includes("deep-leaf"));
    for (const name of [...PAGES.map((p) => `${p}.html`), "state.html"]) assert.ok(!/<script/i.test(read(root, name)));
  } finally { cleanup(root); }
});

test("every secret-shaped evidence component is refused without reading its file", () => {
  const root = project();
  try {
    const base = createNodeDeps();
    const deps = { ...base, fs: { ...base.fs }, proc: { ...base.proc } };
    let inspected = 0;
    deps.fs.lstatSync = () => { inspected++; throw new Error("must not inspect secret paths"); };
    for (const name of [".env.d/readme.md", "credentials/store.md", "secret.md", "store.jks", "safe/secret-folder/readme.md"]) assert.equal(safeEvidencePath(root, name, deps), false, name);
    assert.equal(inspected, 0);
  } finally { cleanup(root); }
});

test("render --json returns parseable page results and skipped ownership names", () => {
  const root = withState(fixture());
  try {
    fs.writeFileSync(path.join(reports(root), "index.html"), "mine");
    const preview = run(RENDER_SCRIPT, root, "--json");
    assert.equal(preview.status, 0, preview.stderr);
    assert.equal(JSON.parse(preview.stdout).pages.length, 7);
    assert.ok(!fs.existsSync(path.join(reports(root), "state.html")));
    const applied = run(RENDER_SCRIPT, root, "--json", "--apply");
    assert.equal(applied.status, 0, applied.stderr);
    assert.deepEqual(JSON.parse(applied.stdout).skipped, ["index.html"]);
    assert.equal(read(root, "index.html"), "mine");
  } finally { cleanup(root); }
});

test("internal renderer errors and source read failures never expose messages or absolute paths", () => {
  const root = withState(fixture());
  try {
    for (const kind of ["read", "internal", "atomic"]) {
      const base = createNodeDeps();
    const deps = { ...base, fs: { ...base.fs }, proc: { ...base.proc } };
      let stderr = "";
      deps.io.stderr.write = (text) => { stderr += text; };
      const raw = `${root}/private: sensitive details`;
      if (kind === "read") { const read = deps.fs.readFileSync; deps.fs.readFileSync = (file) => { if (file.endsWith("state.json")) throw Object.assign(new Error(raw), { code: "EACCES" }); return read(file); }; }
      if (kind === "internal") deps.proc.cwd = () => { throw new Error(raw); };
      if (kind === "atomic") { const write = deps.fs.writeFileSync; deps.fs.writeFileSync = (file, ...args) => { if (String(file).includes("theme.json.tmp-")) throw Object.assign(new Error(raw), { code: "EACCES" }); return write(file, ...args); }; }
      assert.equal(main(["--root", root, "--apply"], deps), 1, kind);
      assert.ok(!stderr.includes(root) && !stderr.includes("sensitive details"), stderr);
      assert.match(stderr, kind === "internal" ? /state-render: internal error/ : /EACCES/);
    }
  } finally { cleanup(root); }
});

test("oversized full report uses the omitted notice under the shared page cap", () => {
  const root = withState(fixture({ pitches: { items: evidenceHeavy(80, 50, 200) } }));
  try {
    render(root, { apply: true, cap: 12 * 1024 });
    assert.ok(pageSize(root, "state.html") <= 12 * 1024);
    assert.match(read(root, "state.html"), /Page omitted: exceeds size cap/);
  } finally { cleanup(root); }
});
