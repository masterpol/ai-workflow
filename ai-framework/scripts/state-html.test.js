const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const { buildSnapshot } = require("./state-snapshot");
const { renderHtml, render, safeEvidencePath, stylesheet, esc } = require("./state-render");
const theme = require("./state-theme");

const SNAPSHOT_SCRIPT = path.join(__dirname, "state-snapshot.js");
const RENDER_SCRIPT = path.join(__dirname, "state-render.js");
const NOW = "2026-09-25T12:00:00.000Z";

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
const run = (script, root, ...args) => spawnSync(process.execPath, [script, "--root", root, ...args], { encoding: "utf8" });

const LIGHT_DARK_CSS = `:root{--background:0 0% 100%;--foreground:240 10% 3.9%;--primary:240 5.9% 10%;--primary-foreground:0 0% 98%;--muted:240 4.8% 95.9%;--muted-foreground:240 3.8% 36%;--border:240 5.9% 90%;--radius:0.75rem;--font-sans:Inter, Helvetica Neue, sans-serif}
.dark{--background:240 10% 3.9%;--foreground:0 0% 98%;--primary:0 0% 98%;--primary-foreground:240 5.9% 10%;--muted:240 3.7% 15.9%;--muted-foreground:240 5% 64.9%;--border:240 3.7% 15.9%}`;

const ALLOWED_TAGS = new Set(["html", "head", "meta", "title", "style", "body", "a", "header", "h1", "h2", "p", "nav", "ul", "li", "main", "section", "div", "table", "caption", "thead", "tr", "th", "tbody", "td", "span", "br", "code", "dl", "dt", "dd"]);
const ALLOWED_ATTRS = new Set(["lang", "charset", "name", "content", "http-equiv", "class", "href", "id", "aria-label", "aria-labelledby", "role", "tabindex", "scope", "colspan"]);
function assertOnlyKnownMarkup(html) {
  const body = html.replace(/<style>[\s\S]*?<\/style>/, "<style></style>");
  for (const [, name, attrs] of body.matchAll(/<([a-z][a-z0-9]*)((?:\s+[a-z-]+(?:="[^"]*")?)*)\s*\/?>/g)) {
    assert.ok(ALLOWED_TAGS.has(name), `unexpected tag <${name}>`);
    for (const [, attribute] of attrs.matchAll(/\s([a-z-]+)(?:="[^"]*")?/g)) assert.ok(ALLOWED_ATTRS.has(attribute), `unexpected attribute ${attribute} on <${name}>`);
  }
  // Every "<" that starts markup was matched above; a stray one means an escape was missed.
  const stripped = body.replace(/<\/?[a-z][a-z0-9]*(?:\s+[a-z-]+(?:="[^"]*")?)*\s*\/?>/g, "").replace(/<!doctype html>/i, "");
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

test("rendering is deterministic and --apply is idempotent", () => {
  const root = project({ "a.css": LIGHT_DARK_CSS });
  try {
    assert.equal(page(root), page(root));
    run(SNAPSHOT_SCRIPT, root, "--apply", "--now", NOW);
    assert.match(run(RENDER_SCRIPT, root, "--apply").stdout, /wrote/);
    assert.match(run(RENDER_SCRIPT, root, "--apply").stdout, /unchanged/);
    assert.deepEqual(fs.readdirSync(path.join(root, ".project/reports")).sort(), ["state.html", "state.json", "theme.json"]);
  } finally { cleanup(root); }
});

test("CLI: preview writes nothing; missing or unsupported snapshots and unknown options fail clearly", () => {
  const root = project();
  try {
    const missing = run(RENDER_SCRIPT, root);
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /run node ai-framework\/scripts\/state-snapshot\.js --apply first/);
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
  for (const file of ["state-render.js", "state-theme.js"]) {
    const source = fs.readFileSync(path.join(__dirname, file), "utf8");
    assert.ok(!/require\(["'](?:node:)?(?:https?|net|tls|dgram|dns|child_process)["']\)/.test(source), file);
    assert.ok(!/\bfetch\(|\beval\(|new Function/.test(source), file);
  }
});
