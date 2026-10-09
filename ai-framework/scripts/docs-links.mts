import { runDirect } from "./runtime/cli.mts";
/**
 * docs-links - verify relative Markdown links and #anchors resolve.
 *
 * Usage: node ai-framework/scripts/docs-links.mts <file-or-dir>... [--json]
 *
 * Directories are scanned recursively for .md files. External URLs, mailto: links and fenced
 * code blocks are ignored. Anchors use GitHub-style slugs. Exit 1 when any link is broken.
 */
import { createNodeDeps } from "./runtime/node.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

export interface BrokenLink { file: string; line: number; target: string; reason: string }
export interface LinkReport { checked: number; broken: BrokenLink[] }

let nodeDeps: RuntimeDeps | undefined;
const defaultDeps = (): RuntimeDeps => (nodeDeps ??= createNodeDeps());

export function slug(heading: string): string {
  return heading
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*~]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

function stripFences(text: string): string {
  let fence: string | null = null;
  return text.split("\n").map((line) => {
    const match = /^\s*(`{3,}|~{3,})/.exec(line);
    if (match) {
      if (!fence) fence = match[1][0];
      else if (match[1][0] === fence) fence = null;
      return "";
    }
    return fence ? "" : line;
  }).join("\n");
}

function anchorsOf(text: string): Set<string> {
  const seen = new Map<string, number>();
  const anchors = new Set<string>();
  for (const line of stripFences(text).split("\n")) {
    const match = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const base = slug(match[1]);
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    anchors.add(count ? `${base}-${count}` : base);
  }
  return anchors;
}

// A line this long is not prose; skipping it keeps the link regex from going quadratic on garbage.
const MAX_LINE = 10000;

function linksOf(text: string): Array<{ target: string; line: number }> {
  const links: Array<{ target: string; line: number }> = [];
  const lines = stripFences(text).split("\n");
  lines.forEach((line, index) => {
    const code = line.replace(/`[^`]*`/g, (span) => " ".repeat(span.length));
    if (code.length > MAX_LINE) return;
    for (const match of code.matchAll(/!?\[[^\][]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) links.push({ target: match[1], line: index + 1 });
  });
  return links;
}

function collect(inputs: string[], deps: RuntimeDeps): string[] {
  const { fs, path } = deps;
  const files: string[] = [];
  const visit = (entry: string): void => {
    // lstat, not stat: a symlink is never followed, so loops and links out of the tree are skipped.
    const stat = fs.lstatSync(entry);
    if (stat.isSymbolicLink()) return;
    if (stat.isDirectory()) {
      let names: string[];
      try { names = fs.readdirSync(entry).sort(); } catch { return; }
      for (const name of names) visit(path.join(entry, name));
    } else if (entry.endsWith(".md")) files.push(entry);
  };
  for (const input of inputs) visit(input);
  return files;
}

export function checkLinks(inputs: string[], deps: RuntimeDeps = defaultDeps()): LinkReport {
  const { fs, path } = deps;
  const cache = new Map<string, Set<string>>();
  const anchorsFor = (file: string): Set<string> => {
    let anchors = cache.get(file);
    if (!anchors) { anchors = anchorsOf(fs.readFileSync(file)); cache.set(file, anchors); }
    return anchors;
  };
  const broken: BrokenLink[] = [];
  const files = collect(inputs, deps);
  for (const file of files) {
    for (const { target, line } of linksOf(fs.readFileSync(file))) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      const [rawPath, rawAnchor] = target.split("#");
      let resolved = file;
      if (rawPath) {
        let decoded: string;
        try { decoded = decodeURI(rawPath); } catch { broken.push({ file, line, target, reason: "malformed escape" }); continue; }
        resolved = path.resolve(path.dirname(file), decoded);
        if (!fs.existsSync(resolved)) { broken.push({ file, line, target, reason: "missing file" }); continue; }
      }
      if (rawAnchor && resolved.endsWith(".md") && fs.statSync(resolved).isFile() && !anchorsFor(resolved).has(rawAnchor.toLowerCase())) {
        broken.push({ file, line, target, reason: "missing anchor" });
      }
    }
  }
  return { checked: files.length, broken };
}

export function main(argv: string[], deps: RuntimeDeps = defaultDeps()): number {
  const json = argv.includes("--json");
  const inputs = argv.filter((arg) => arg !== "--json");
  if (!inputs.length) { deps.io.stderr.write("usage: docs-links.mts <file-or-dir>... [--json]\n"); return 2; }
  const missing = inputs.filter((input) => !deps.fs.existsSync(input));
  if (missing.length) { deps.io.stderr.write(`not found: ${missing.join(", ")}\n`); return 2; }
  const result = checkLinks(inputs, deps);
  if (json) deps.io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else {
    for (const item of result.broken) deps.io.stdout.write(`${item.file}:${item.line}  ${item.target}  (${item.reason})\n`);
    deps.io.stdout.write(`${result.checked} file(s) checked, ${result.broken.length} broken link(s)\n`);
  }
  return result.broken.length ? 1 : 0;
}

runDirect(import.meta.url, main);
