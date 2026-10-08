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
import type { RuntimeDeps } from "./runtime/types.mts";
import { createNodeDeps } from "./runtime/node.mts";

export type Mode = "light" | "dark";
export type ThemeValues = Record<string, string>;
export interface Parsed { css?: string; rgb?: number[]; reason?: string }
export interface Found extends Parsed { source?: string }
export interface Rejection { token: string; mode: string; file: string; reason: string | undefined }
export interface Fallback { scope: string; reason: string }
export interface Source { path: string; sha256: string }
export interface Settings { themeMode: string; note: string | null }
export interface Declaration { chain: string; name: string; value: string }
export interface Theme {
  schemaVersion: number;
  mode: string;
  themeMode: string;
  reason: string | null;
  light: ThemeValues;
  dark: ThemeValues;
  provenance: { light: Record<string, string>; dark: Record<string, string> };
  fallbacks: Fallback[];
  rejected: Rejection[];
  notes: string[];
  sources: Source[];
}
export interface ThemeChanges { recorded: boolean; changed: string[] }
interface Built { theme: ThemeValues; provenance: Record<string, string> }

let nodeDeps: RuntimeDeps | undefined;
/** Lazily created Node deps, so old-signature callers (state-render, tests) need no change. */
function defaultDeps(): RuntimeDeps {
  return (nodeDeps ??= createNodeDeps());
}

const MAX_FILES = 200;
const MAX_FILE_BYTES = 256 * 1024;
const MAX_DEPTH = 6;
const MAX_REJECTIONS = 50;
export const MIN_CONTRAST = 4.5;
const SKIP_DIRS = new Set(["node_modules", ".git", ".project", "dist", "build", ".next", ".cursor", ".claude", ".opencode", ".codex", ".agents", "coverage"]);
export const THEME_FILE = ".project/reports/theme.json";
export const SETTINGS_FILE = ".project/reports/settings.json";

// Documented fallback: a shadcn-style (zinc) light/dark pair. Every pair below is asserted >= 4.5:1 in tests.
export const FALLBACK: Record<Mode, ThemeValues> = {
  light: { background: "#ffffff", foreground: "#09090b", primary: "#18181b", primaryForeground: "#fafafa", muted: "#f4f4f5", mutedForeground: "#52525b", border: "#d4d4d8", radius: "0.5rem", fontSans: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif", fontMono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
  dark: { background: "#09090b", foreground: "#fafafa", primary: "#fafafa", primaryForeground: "#18181b", muted: "#27272a", mutedForeground: "#a1a1aa", border: "#3f3f46", radius: "0.5rem", fontSans: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif", fontMono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
};

// The report's real text/background combinations. A theme is only used when all of these pass.
export const PAIRS: Array<[string, string]> = [["foreground", "background"], ["primaryForeground", "primary"], ["primary", "background"], ["mutedForeground", "muted"], ["mutedForeground", "background"], ["foreground", "muted"]];
const GROUPS: Record<string, string[]> = { text: ["background", "foreground"], accent: ["primary", "primaryForeground"], subdued: ["muted", "mutedForeground"] };
const COLOR_TOKENS = ["background", "foreground", "primary", "primaryForeground", "muted", "mutedForeground", "border"];
const CSS_NAMES: Record<string, string> = { background: "background", foreground: "foreground", primary: "primary", primaryForeground: "primary-foreground", muted: "muted", mutedForeground: "muted-foreground", border: "border", radius: "radius", fontSans: "font-sans", fontMono: "font-mono" };

// shadcn names (--background) and Tailwind v4 @theme aliases (--color-background) map to the same token.
const TOKEN_BY_NAME = Object.create(null) as Record<string, string>;
for (const [token, cssName] of Object.entries(CSS_NAMES)) {
  TOKEN_BY_NAME[cssName] = token;
  if (COLOR_TOKENS.includes(token)) TOKEN_BY_NAME[`color-${cssName}`] = token;
}
const hex = (rgb: number[]): string => `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;

function hslToRgb(h: number, s: number, l: number): number[] {
  s /= 100; l /= 100;
  const k = (n: number): number => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

// Returns { rgb, css } for an accepted color or { reason } for a rejected one.
export function parseColor(raw: unknown): Parsed {
  const value = String(raw).trim().replace(/\s+/g, " ");
  let match: RegExpMatchArray | null;
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

export function parseLength(raw: unknown): Parsed {
  const match = String(raw).trim().match(/^(\d{1,3}(?:\.\d+)?)(px|rem|em)$/);
  return match && Number(match[1]) <= 64 ? { css: `${Number(match[1])}${match[2]}` } : { reason: "value is outside the accepted length grammar" };
}

const GENERIC_FAMILIES = new Set(["serif", "sans-serif", "monospace", "system-ui", "ui-monospace", "ui-sans-serif", "ui-serif", "cursive", "fantasy"]);
export function parseFontFamily(raw: unknown, generic: string): Parsed {
  const value = String(raw).trim();
  if (!value.length || value.length > 200) return { reason: "value is outside the accepted font-family grammar" };
  const families: string[] = [];
  for (const token of value.split(",")) {
    const family = token.trim();
    const quoted = family.match(/^(?:"([A-Za-z0-9 _-]+)"|'([A-Za-z0-9 _-]+)')$/);
    const name = (quoted ? quoted[1] || quoted[2] : family).trim().replace(/\s+/g, " ");
    if (!/^[A-Za-z0-9 _-]+$/.test(name) || /^(?:url|expression|import|javascript|var|calc)$/i.test(name)) return { reason: "value is outside the accepted font-family grammar" };
    families.push(quoted ? `"${name}"` : name);
  }
  if (!GENERIC_FAMILIES.has(families[families.length - 1].toLowerCase())) families.push(generic);
  return { css: families.join(", ") };
}

const channel = (value: number): number => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]: number[]): number => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
export function contrastRatio(left: number[], right: number[]): number {
  const [a, b] = [luminance(left), luminance(right)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}
export const rgbOf = (hexColor: string): number[] => [1, 3, 5].map((offset) => parseInt(hexColor.slice(offset, offset + 2), 16));
export const ratioOf = (theme: ThemeValues, [foreground, background]: [string, string]): number => contrastRatio(rgbOf(theme[foreground]), rgbOf(theme[background]));

// Renderer-side gate: whatever a theme object claims, only grammar-valid values reach the CSS.
export function safeTheme(theme: unknown): Record<Mode, ThemeValues> {
  const clean = {} as Record<Mode, ThemeValues>;
  const modes = theme as Record<string, Record<string, unknown> | null | undefined> | null | undefined;
  for (const mode of ["light", "dark"] as Mode[]) {
    const source: Record<string, unknown> = modes?.[mode] || {};
    clean[mode] = { ...FALLBACK[mode] };
    for (const token of COLOR_TOKENS) if (typeof source[token] === "string" && /^#[0-9a-f]{6}$/i.test(source[token] as string)) clean[mode][token] = (source[token] as string).toLowerCase();
    if (typeof source.radius === "string" && parseLength(source.radius).css === source.radius) clean[mode].radius = source.radius;
    for (const [key, generic] of [["fontSans", "sans-serif"], ["fontMono", "monospace"]]) {
      if (typeof source[key] !== "string") continue; // absent/wrong-typed: keep the fallback, never assign undefined
      if (parseFontFamily(source[key], generic).css === source[key]) clean[mode][key] = source[key] as string;
    }
    if (PAIRS.some((pair) => ratioOf(clean[mode], pair) < MIN_CONTRAST)) clean[mode] = { ...FALLBACK[mode] };
  }
  return clean;
}

// Every custom property with the selector chain it appeared under. Bounded and non-recursive
// beyond nesting depth 8, so a pathological stylesheet cannot run away.
export function declarations(css: string): Declaration[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const found: Declaration[] = [];
  const state = { blocks: 0 };
  const record = (chain: string[], statement: string): void => {
    const match = statement.match(/^(--[A-Za-z0-9_-]+)\s*:\s*([\s\S]+)$/);
    if (match) found.push({ chain: chain.join(" "), name: match[1].slice(2), value: match[2].trim() });
  };
  const walk = (body: string, chain: string[]): void => {
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

function modeOf(chain: string): Mode | null {
  if (/\.dark\b|\[data-theme=["']?dark|prefers-color-scheme:\s*dark/i.test(chain)) return "dark";
  if (/:root|(^|\s)html\b|(^|\s)body\b|@theme|\.light\b|\[data-theme=["']?light/i.test(chain)) return "light";
  return null;
}

function cssFiles(root: string, deps: RuntimeDeps): { files: string[]; skipped: string[] } {
  const { fs, path } = deps;
  const files: string[] = [];
  const skipped: string[] = [];
  let visited = 0;
  const walk = (relative: string, depth: number): void => {
    if (depth > MAX_DEPTH || visited > 20000) return;
    let entries;
    try { entries = fs.readdirEntriesSync(path.join(root, relative)); } catch { return; }
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

// A leaf-only symlink check is not enough: an ancestor directory (".project" itself, say) can be a
// symlink, and the OS follows it transparently before the leaf is ever inspected. Resolve the whole
// path and check containment, the same way readSource/collect do, before trusting "not a symlink".
export function insideProject(root: string, file: string, deps: RuntimeDeps): string | null {
  const { fs, path } = deps;
  let real;
  try { real = fs.realpathSync(file); } catch { return null; }
  const within = path.relative(root, real);
  return within === ".." || within.startsWith("../") || within.startsWith("..\\") || path.isAbsolute(within) ? null : real;
}

export function readSettings(root: string, deps: RuntimeDeps = defaultDeps()): Settings {
  const { fs, path } = deps;
  const result: Settings = { themeMode: "auto", note: null };
  const file = path.join(root, SETTINGS_FILE);
  let stat;
  try { stat = fs.lstatSync(file); } catch { return result; }
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 4096) return { ...result, note: "settings.json ignored (not a small regular file)" };
  const real = insideProject(root, file, deps);
  if (!real) return { ...result, note: "settings.json ignored (resolves outside the project)" };
  try {
    const parsed = JSON.parse(fs.readFileSync(real)) as { schemaVersion?: unknown; themeMode?: unknown } | null;
    if (parsed?.schemaVersion === 1 && ["auto", "fallback"].includes(parsed.themeMode as string)) return { themeMode: parsed.themeMode as string, note: null };
  } catch { /* fall through */ }
  return { ...result, note: "settings.json ignored (expected {schemaVersion:1, themeMode:'auto'|'fallback'})" };
}

function collect(root: string, deps: RuntimeDeps): { found: Record<Mode, Record<string, Found>>; sources: Source[]; rejected: Rejection[]; notes: string[] } {
  const { fs, path } = deps;
  const { files, skipped } = cssFiles(root, deps);
  const found: Record<Mode, Record<string, Found>> = { light: {}, dark: {} };
  const sources: Source[] = [];
  const rejected: Rejection[] = [];
  const notes = [...skipped];
  const reject = (entry: Rejection): void => { if (rejected.length < MAX_REJECTIONS) rejected.push(entry); };
  for (const relative of files) {
    const full = path.join(root, relative);
    let stat;
    try { stat = fs.lstatSync(full); } catch { continue; }
    if (stat.isSymbolicLink() || !stat.isFile()) continue;
    if (stat.size > MAX_FILE_BYTES) { notes.push(`${relative} skipped (larger than ${MAX_FILE_BYTES / 1024} KB)`); continue; }
    const real = path.relative(root, fs.realpathSync(full));
    if (real.startsWith("..") || path.isAbsolute(real)) continue;
    const text = fs.readFileSync(full);
    let recognised = false;
    const entries = declarations(text);
    const variables: Record<Mode, Map<string, string>> = { light: new Map(), dark: new Map() };
    for (const entry of entries) {
      const mode = modeOf(entry.chain);
      if (mode) variables[mode].set(entry.name, entry.value);
    }
    for (const { chain, name, value } of entries) {
      const mode = modeOf(chain);
      const token = TOKEN_BY_NAME[name];
      if (!mode || !token) continue;
      recognised = true;
      if (found[mode][token]?.css) continue; // earlier (shallower, then alphabetical) definition wins
      // Font declarations use the last value in this file/mode. Variables are one-hop,
      // same-file lookups; dark values may inherit the root/light definition.
      if (token === "fontSans" || token === "fontMono") {
        if (variables[mode].get(name) !== value) continue;
      }
      let fontValue = value;
      const reference = value.match(/^var\(\s*--([A-Za-z0-9_-]+)\s*\)$/);
      if (reference) fontValue = variables[mode].get(reference[1]) ?? (mode === "dark" ? variables.light.get(reference[1]) : undefined) ?? value;
      const parsed = COLOR_TOKENS.includes(token) ? parseColor(value) : token === "radius" ? parseLength(value) : parseFontFamily(fontValue, token === "fontMono" ? "monospace" : "sans-serif");
      if (parsed.css) found[mode][token] = { ...parsed, source: relative };
      else if (!found[mode][token]) { found[mode][token] = { reason: parsed.reason }; reject({ token, mode, file: relative, reason: parsed.reason }); }
    }
    if (recognised) sources.push({ path: relative, sha256: deps.crypto.sha256Hex(text) });
  }
  return { found, sources, rejected, notes };
}

function assemble(mode: Mode, found: Record<string, Found>, fallbacks: Fallback[]): Built {
  const fallback = FALLBACK[mode];
  const theme = { ...fallback };
  const provenance = Object.fromEntries(Object.keys(fallback).map((token) => [token, "fallback"]));
  const usable = (token: string): boolean => Boolean(found[token]?.css);
  const use = (token: string): void => { theme[token] = found[token].css; provenance[token] = "discovered"; };
  const groupFallback = (group: string, reason: string): void => { for (const token of GROUPS[group]) { theme[token] = fallback[token]; provenance[token] = "fallback"; } fallbacks.push({ scope: `${mode}.${group}`, reason }); };
  const missing = (group: string): string[] => GROUPS[group].filter((token) => !usable(token));

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

export function discoverTheme(root: string, options: { settings?: Settings } = {}, deps: RuntimeDeps = defaultDeps()): Theme {
  const { fs } = deps;
  // A raw ENOENT/EACCES message embeds the absolute path; keep only a fixed reason.
  try { root = fs.realpathSync(root); } catch { throw new Error("root does not exist or is not resolvable"); }
  const settings = options.settings || readSettings(root, deps);
  const fallbacks: Fallback[] = [];
  const forced = settings.themeMode === "fallback";
  const scan = forced ? { found: { light: {}, dark: {} } as Record<Mode, Record<string, Found>>, sources: [] as Source[], rejected: [] as Rejection[], notes: [] as string[] } : collect(root, deps);
  const built = {} as Record<Mode, Built>;
  for (const mode of ["light", "dark"] as Mode[]) {
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
export function themeChanges(root: string, theme: { sources: Source[] }, deps: RuntimeDeps = defaultDeps()): ThemeChanges {
  const { fs, path } = deps;
  let recorded: { sources?: unknown };
  try {
    const projectRoot = fs.realpathSync(root);
    const file = path.join(projectRoot, THEME_FILE);
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 256 * 1024) return { recorded: false, changed: [] };
    const real = insideProject(projectRoot, file, deps);
    if (!real) return { recorded: false, changed: [] };
    recorded = JSON.parse(fs.readFileSync(real)) as { sources?: unknown };
  } catch { return { recorded: false, changed: [] }; }
  const before = new Map((Array.isArray(recorded.sources) ? recorded.sources as Array<{ path?: unknown; sha256?: string } | null> : []).map((item): [string, string | undefined] => [String(item?.path), item?.sha256]));
  const now = new Map(theme.sources.map((item) => [item.path, item.sha256]));
  const changed: string[] = [];
  for (const [file, sha] of now) { if (!before.has(file)) changed.push(`${file} (added)`); else if (before.get(file) !== sha) changed.push(`${file} (changed)`); }
  for (const file of before.keys()) if (!now.has(file)) changed.push(`${file} (removed)`);
  return { recorded: true, changed: changed.sort() };
}
