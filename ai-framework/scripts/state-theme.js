#!/usr/bin/env node
/*
 * Theme discovery for the /state HTML report. Reads a project's CSS custom properties
 * (shadcn-style `--background`, Tailwind v4 `@theme` `--color-*`) and produces a theme the
 * renderer can write into a stylesheet. Theme values are untrusted input that ends up inside
 * CSS, so nothing is ever copied through: a value is parsed against a strict grammar and the
 * accepted result is re-emitted from parsed numbers (colors become #rrggbb), so a hostile value
 * cannot survive as text. Anything outside the grammar is rejected, not sanitized. Every
 * text/background pair is contrast-checked (WCAG AA 4.5:1) and falls back to the documented
 * shadcn-style theme, for that group only, with a recorded reason.
 * See ai-framework/integrations/state-report.md and .project/knowledge/decisions/project-state-report-design.md.
 */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const MAX_FILES = 200;
const MAX_FILE_BYTES = 256 * 1024;
const MAX_DEPTH = 6;
const MAX_REJECTIONS = 50;
const MIN_CONTRAST = 4.5;
const SKIP_DIRS = new Set(["node_modules", ".git", ".project", "dist", "build", ".next", ".cursor", ".claude", ".opencode", ".codex", ".agents", "coverage"]);
const THEME_FILE = ".project/reports/theme.json";
const SETTINGS_FILE = ".project/reports/settings.json";

// Documented fallback: a shadcn-style (zinc) light/dark pair. Every pair below is asserted >= 4.5:1 in tests.
const FALLBACK = {
  light: { background: "#ffffff", foreground: "#09090b", primary: "#18181b", primaryForeground: "#fafafa", muted: "#f4f4f5", mutedForeground: "#52525b", border: "#d4d4d8", radius: "0.5rem", fontSans: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif", fontMono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
  dark: { background: "#09090b", foreground: "#fafafa", primary: "#fafafa", primaryForeground: "#18181b", muted: "#27272a", mutedForeground: "#a1a1aa", border: "#3f3f46", radius: "0.5rem", fontSans: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif", fontMono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
};

// The report's real text/background combinations. A theme is only used when all of these pass.
const PAIRS = [["foreground", "background"], ["primaryForeground", "primary"], ["primary", "background"], ["mutedForeground", "muted"], ["mutedForeground", "background"], ["foreground", "muted"]];
const GROUPS = { text: ["background", "foreground"], accent: ["primary", "primaryForeground"], subdued: ["muted", "mutedForeground"] };
const COLOR_TOKENS = ["background", "foreground", "primary", "primaryForeground", "muted", "mutedForeground", "border"];
const CSS_NAMES = { background: "background", foreground: "foreground", primary: "primary", primaryForeground: "primary-foreground", muted: "muted", mutedForeground: "muted-foreground", border: "border", radius: "radius", fontSans: "font-sans", fontMono: "font-mono" };

// shadcn names (--background) and Tailwind v4 @theme aliases (--color-background) map to the same token.
const TOKEN_BY_NAME = Object.create(null);
for (const [token, cssName] of Object.entries(CSS_NAMES)) {
  TOKEN_BY_NAME[cssName] = token;
  if (COLOR_TOKENS.includes(token)) TOKEN_BY_NAME[`color-${cssName}`] = token;
}
const hex = (rgb) => `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

// Returns { rgb, css } for an accepted color or { reason } for a rejected one.
function parseColor(raw) {
  const value = String(raw).trim().replace(/\s+/g, " ");
  let match;
  if ((match = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i))) {
    const digits = match[1].length === 3 ? [...match[1]].map((digit) => digit + digit).join("") : match[1];
    const rgb = [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16));
    return { rgb, css: hex(rgb) };
  }
  if ((match = value.match(/^rgb\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)$/i))) {
    const rgb = match.slice(1).map(Number);
    return rgb.every((channel) => channel <= 255) ? { rgb, css: hex(rgb) } : { reason: "rgb channel above 255" };
  }
  // shadcn stores hsl components bare ("240 10% 3.9%") and wraps them at use.
  if ((match = value.match(/^(?:hsl\(\s*)?(\d{1,3}(?:\.\d+)?)(?:deg)?\s*[, ]\s*(\d{1,3}(?:\.\d+)?)%\s*[, ]\s*(\d{1,3}(?:\.\d+)?)%\s*\)?$/i)) && (value.startsWith("hsl(") === value.endsWith(")"))) {
    const [h, s, l] = match.slice(1).map(Number);
    if (h > 360 || s > 100 || l > 100) return { reason: "hsl component out of range" };
    const rgb = hslToRgb(h, s, l);
    return { rgb, css: hex(rgb) };
  }
  if (/^(?:oklch|oklab|lab|lch|color|color-mix|hwb)\(/i.test(value)) return { reason: "color space cannot be contrast-verified" };
  if (/^var\(/i.test(value)) return { reason: "indirect var() reference is not resolved" };
  return { reason: "value is outside the accepted color grammar" };
}

function parseLength(raw) {
  const match = String(raw).trim().match(/^(\d{1,3}(?:\.\d+)?)(px|rem|em)$/);
  return match && Number(match[1]) <= 64 ? { css: `${Number(match[1])}${match[2]}` } : { reason: "value is outside the accepted length grammar" };
}

const GENERIC_FAMILIES = new Set(["serif", "sans-serif", "monospace", "system-ui", "ui-monospace", "ui-sans-serif", "ui-serif", "cursive", "fantasy"]);
function parseFontFamily(raw, generic) {
  const value = String(raw).trim();
  // Quotes are rejected on purpose (reject, don't sanitize): unquoted multi-word names are valid CSS.
  if (!/^[A-Za-z0-9 ,_-]{1,200}$/.test(value)) return { reason: "value is outside the accepted font-family grammar" };
  const families = value.split(",").map((family) => family.trim());
  if (families.some((family) => !family || /^(?:url|expression|import|javascript|var|calc)$/i.test(family))) return { reason: "value is outside the accepted font-family grammar" };
  if (!GENERIC_FAMILIES.has(families[families.length - 1].toLowerCase())) families.push(generic);
  return { css: families.join(", ") };
}

const channel = (value) => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
function contrastRatio(left, right) {
  const [a, b] = [luminance(left), luminance(right)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}
const rgbOf = (hexColor) => [1, 3, 5].map((offset) => parseInt(hexColor.slice(offset, offset + 2), 16));
const ratioOf = (theme, [foreground, background]) => contrastRatio(rgbOf(theme[foreground]), rgbOf(theme[background]));

// Renderer-side gate: whatever a theme object claims, only grammar-valid values reach the CSS.
function safeTheme(theme) {
  const clean = {};
  for (const mode of ["light", "dark"]) {
    const source = theme?.[mode] || {};
    clean[mode] = { ...FALLBACK[mode] };
    for (const token of COLOR_TOKENS) if (typeof source[token] === "string" && /^#[0-9a-f]{6}$/i.test(source[token])) clean[mode][token] = source[token].toLowerCase();
    if (typeof source.radius === "string" && parseLength(source.radius).css === source.radius) clean[mode].radius = source.radius;
    for (const [key, generic] of [["fontSans", "sans-serif"], ["fontMono", "monospace"]]) {
      const parsed = typeof source[key] === "string" ? parseFontFamily(source[key], generic) : {};
      if (parsed.css === source[key]) clean[mode][key] = source[key];
    }
    if (PAIRS.some((pair) => ratioOf(clean[mode], pair) < MIN_CONTRAST)) clean[mode] = { ...FALLBACK[mode] };
  }
  return clean;
}

// Every custom property with the selector chain it appeared under. Bounded and non-recursive
// beyond nesting depth 8, so a pathological stylesheet cannot run away.
function declarations(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const found = [];
  const state = { blocks: 0 };
  const record = (chain, statement) => {
    const match = statement.match(/^(--[A-Za-z0-9_-]+)\s*:\s*([\s\S]+)$/);
    if (match) found.push({ chain: chain.join(" "), name: match[1].slice(2), value: match[2].trim() });
  };
  const walk = (body, chain) => {
    let index = 0;
    let segment = 0;
    while (index < body.length) {
      const char = body[index];
      if (char === "{") {
        let depth = 1;
        let end = index + 1;
        while (end < body.length && depth) { if (body[end] === "{") depth++; else if (body[end] === "}") depth--; end++; }
        if (++state.blocks > 5000 || chain.length >= 8) return;
        walk(body.slice(index + 1, depth ? body.length : end - 1), [...chain, body.slice(segment, index).trim()]);
        index = end;
        segment = index;
      } else if (char === ";") {
        record(chain, body.slice(segment, index).trim());
        index++;
        segment = index;
      } else index++;
    }
    record(chain, body.slice(segment).trim());
  };
  walk(text, []);
  return found;
}

function modeOf(chain) {
  if (/\.dark\b|\[data-theme=["']?dark|prefers-color-scheme:\s*dark/i.test(chain)) return "dark";
  if (/:root|(^|\s)html\b|(^|\s)body\b|@theme|\.light\b|\[data-theme=["']?light/i.test(chain)) return "light";
  return null;
}

function cssFiles(root) {
  const files = [];
  const skipped = [];
  let visited = 0;
  const walk = (relative, depth) => {
    if (depth > MAX_DEPTH || visited > 20000) return;
    let entries;
    try { entries = fs.readdirSync(path.join(root, relative), { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (++visited > 20000) return;
      if (entry.isSymbolicLink()) continue;
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) { if (!SKIP_DIRS.has(entry.name)) walk(child, depth + 1); } else if (/\.css$/i.test(entry.name)) files.push(child);
    }
  };
  walk("", 0);
  files.sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));
  if (files.length > MAX_FILES) skipped.push(`${files.length - MAX_FILES} stylesheet(s) beyond the ${MAX_FILES}-file scan limit`);
  return { files: files.slice(0, MAX_FILES), skipped };
}

function readSettings(root) {
  const result = { themeMode: "auto", note: null };
  const file = path.join(root, SETTINGS_FILE);
  let stat;
  try { stat = fs.lstatSync(file); } catch { return result; }
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 4096) return { ...result, note: "settings.json ignored (not a small regular file)" };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (parsed?.schemaVersion === 1 && ["auto", "fallback"].includes(parsed.themeMode)) return { themeMode: parsed.themeMode, note: null };
  } catch { /* fall through */ }
  return { ...result, note: "settings.json ignored (expected {schemaVersion:1, themeMode:'auto'|'fallback'})" };
}

function collect(root) {
  const { files, skipped } = cssFiles(root);
  const found = { light: {}, dark: {} };
  const sources = [];
  const rejected = [];
  const notes = [...skipped];
  const reject = (entry) => { if (rejected.length < MAX_REJECTIONS) rejected.push(entry); };
  for (const relative of files) {
    const full = path.join(root, relative);
    let stat;
    try { stat = fs.lstatSync(full); } catch { continue; }
    if (stat.isSymbolicLink() || !stat.isFile()) continue;
    if (stat.size > MAX_FILE_BYTES) { notes.push(`${relative} skipped (larger than ${MAX_FILE_BYTES / 1024} KB)`); continue; }
    const real = path.relative(root, fs.realpathSync(full));
    if (real.startsWith("..") || path.isAbsolute(real)) continue;
    const text = fs.readFileSync(full, "utf8");
    let recognised = false;
    for (const { chain, name, value } of declarations(text)) {
      const mode = modeOf(chain);
      const token = TOKEN_BY_NAME[name];
      if (!mode || !token) continue;
      recognised = true;
      if (found[mode][token]?.css) continue; // earlier (shallower, then alphabetical) definition wins
      const parsed = COLOR_TOKENS.includes(token) ? parseColor(value) : token === "radius" ? parseLength(value) : parseFontFamily(value, token === "fontMono" ? "monospace" : "sans-serif");
      if (parsed.css) found[mode][token] = { ...parsed, source: relative };
      else if (!found[mode][token]) { found[mode][token] = { reason: parsed.reason }; reject({ token, mode, file: relative, reason: parsed.reason }); }
    }
    if (recognised) sources.push({ path: relative, sha256: crypto.createHash("sha256").update(text).digest("hex") });
  }
  return { found, sources, rejected, notes };
}

function assemble(mode, found, fallbacks) {
  const fallback = FALLBACK[mode];
  const theme = { ...fallback };
  const provenance = Object.fromEntries(Object.keys(fallback).map((token) => [token, "fallback"]));
  const usable = (token) => Boolean(found[token]?.css);
  const use = (token) => { theme[token] = found[token].css; provenance[token] = "discovered"; };
  const groupFallback = (group, reason) => { for (const token of GROUPS[group]) { theme[token] = fallback[token]; provenance[token] = "fallback"; } fallbacks.push({ scope: `${mode}.${group}`, reason }); };
  const missing = (group) => GROUPS[group].filter((token) => !usable(token));

  for (const group of ["text", "accent", "subdued"]) {
    const lacking = missing(group);
    if (lacking.length === GROUPS[group].length && lacking.every((token) => !found[token])) continue; // nothing discovered: silent fallback
    if (lacking.length) { const why = lacking.map((token) => `${token}: ${found[token]?.reason || "not defined"}`).join("; "); fallbacks.push({ scope: `${mode}.${group}`, reason: `fallback used (${why})` }); continue; }
    GROUPS[group].forEach(use);
    const checks = PAIRS.filter((pair) => pair.every((token) => (group === "text" ? GROUPS.text : [...GROUPS[group], ...GROUPS.text]).includes(token)));
    const worst = Math.min(...checks.map((pair) => ratioOf(theme, pair)));
    if (worst < MIN_CONTRAST) groupFallback(group, `contrast ${worst.toFixed(2)}:1 is below ${MIN_CONTRAST}:1`);
  }
  for (const token of ["border", "radius", "fontSans", "fontMono"]) {
    if (usable(token)) use(token); else if (found[token]) fallbacks.push({ scope: `${mode}.${token}`, reason: `fallback used (${found[token].reason})` });
  }
  // Groups were each verified against the discovered background; verify the final assembly too, because
  // a fallback accent can still clash with a discovered background.
  const worst = Math.min(...PAIRS.map((pair) => ratioOf(theme, pair)));
  if (worst < MIN_CONTRAST) {
    fallbacks.push({ scope: `${mode}`, reason: `assembled theme contrast ${worst.toFixed(2)}:1 is below ${MIN_CONTRAST}:1; whole ${mode} theme falls back` });
    return { theme: { ...fallback }, provenance: Object.fromEntries(Object.keys(fallback).map((token) => [token, "fallback"])) };
  }
  return { theme, provenance };
}

function discoverTheme(root, options = {}) {
  root = fs.realpathSync(root);
  const settings = options.settings || readSettings(root);
  const fallbacks = [];
  const forced = settings.themeMode === "fallback";
  const scan = forced ? { found: { light: {}, dark: {} }, sources: [], rejected: [], notes: [] } : collect(root);
  const built = {};
  for (const mode of ["light", "dark"]) {
    if (!forced && scan.sources.length && !Object.keys(scan.found[mode]).length) fallbacks.push({ scope: mode, reason: `no ${mode} tokens found; documented fallback used` });
    built[mode] = assemble(mode, scan.found[mode], fallbacks);
  }
  const discovered = Object.values(built).some(({ provenance }) => Object.values(provenance).includes("discovered"));
  // "partial" means something the project defined was replaced (recorded in fallbacks); an optional
  // token the project simply does not define (e.g. a mono font) is not a fallback worth reporting.
  const partial = fallbacks.length > 0;
  return {
    schemaVersion: 1,
    mode: forced ? "fallback" : !discovered ? "fallback" : partial ? "partial" : "discovered",
    themeMode: settings.themeMode,
    reason: forced ? "themeMode is fallback in .project/reports/settings.json" : scan.sources.length ? null : "no theme tokens found in project stylesheets",
    light: built.light.theme,
    dark: built.dark.theme,
    provenance: { light: built.light.provenance, dark: built.dark.provenance },
    fallbacks,
    rejected: scan.rejected,
    notes: [...scan.notes, ...(settings.note ? [settings.note] : [])],
    sources: scan.sources,
  };
}

// Compares against the recorded theme.json only to report what changed; the recorded file is
// never trusted as theme input, so a hand-edited record cannot inject anything.
function themeChanges(root, theme) {
  let recorded;
  try {
    const file = path.join(fs.realpathSync(root), THEME_FILE);
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 256 * 1024) return { recorded: false, changed: [] };
    recorded = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch { return { recorded: false, changed: [] }; }
  const before = new Map((Array.isArray(recorded.sources) ? recorded.sources : []).map((item) => [String(item?.path), item?.sha256]));
  const now = new Map(theme.sources.map((item) => [item.path, item.sha256]));
  const changed = [];
  for (const [file, sha] of now) { if (!before.has(file)) changed.push(`${file} (added)`); else if (before.get(file) !== sha) changed.push(`${file} (changed)`); }
  for (const file of before.keys()) if (!now.has(file)) changed.push(`${file} (removed)`);
  return { recorded: true, changed: changed.sort() };
}

module.exports = { FALLBACK, PAIRS, MIN_CONTRAST, THEME_FILE, SETTINGS_FILE, parseColor, parseLength, parseFontFamily, contrastRatio, rgbOf, ratioOf, safeTheme, declarations, discoverTheme, themeChanges, readSettings };
