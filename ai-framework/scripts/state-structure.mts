/*
 * Project structure for the /state report: a bounded, names-only directory scan, a project-type
 * guess from names that are present, and a mapping from decision records to folders. File
 * contents of the scanned tree are never read (only directory listings and lstat); the only files
 * read are the decision records, through the caller's size-bounded, symlink-refusing reader.
 * Containment reuses insideProject() from state-theme.mts so an ancestor symlink is refused the
 * same way everywhere. See ai-framework/integrations/state-report.md.
 */
import { createNodeDeps } from "./runtime/node.mts";
import { insideProject } from "./state-theme.mts";

import type { RuntimeDeps } from "./runtime/types.mts";

export interface Fact<T = unknown> { value: T; status: string; evidence: string[]; note?: string }
export interface StructureHelpers {
  scrub: (text: unknown) => string;
  /** Size-bounded, symlink-refusing text reader (state-snapshot's readMarkdown). */
  readMarkdown: (root: string, relative: string) => { text?: string; missing?: boolean; error?: string };
}

export const MAX_DEPTH = 3;
export const MAX_ENTRIES = 500;
const MAX_VISITED = 5000;
const MAX_DECISION_FILES = 100;
const MAX_FOLDERS_PER_DECISION = 3;
const DECISION_DIRS = [".project/knowledge/decisions", ".project/design/decisions"];

// Dependency, VCS, cache and build-output directories carry no project structure.
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "out", ".next", ".nuxt", ".svelte-kit", ".turbo", ".cache", "coverage", "target", ".gradle", "Pods", "DerivedData", "__pycache__", ".venv", "venv", "vendor", ".idea"]);
// Names that look like secret material are not listed, even as a folder.
// The report writes into these; listing them would make the snapshot depend on its own output.
const SKIP_PATHS = new Set([".project/reports"]);
const SECRET_NAME = [/^\.env/i, /^credentials?/i, /^settings\.local\.json$/i, /secret/i, /\.(?:pem|key|p12|pfx|keystore|jks)$/i, /^id_(?:rsa|dsa|ecdsa|ed25519)/i, /^\.(?:npmrc|netrc|pypirc)$/i];
export const isSecretName = (name: string): boolean => SECRET_NAME.some((pattern) => pattern.test(name));

const COMMON_ROLES: Record<string, string> = {
  ".project": "workflow records (pitches, knowledge, status)", ".project/pitches": "pitch history", ".project/knowledge": "durable knowledge entries", ".project/rules": "stack rule companions",
  ".claude": "Claude Code adapters", ".claude/skills": "agent skills", ".claude/agents": "agent role prompts", ".cursor": "Cursor adapters", ".codex": "Codex adapters", ".agents": "Codex skills", ".opencode": "OpenCode adapters", ".github": "CI and repository automation",
  docs: "documentation", test: "tests", tests: "tests", __tests__: "tests", spec: "tests", scripts: "scripts", src: "source code", lib: "shared libraries", config: "configuration", "graphify-out": "generated knowledge graph",
};
const TEMPLATES: Record<string, Record<string, string>> = {
  "workflow-bundle": { "ai-framework": "workflow bundle (phases, rules, hooks, scripts)", "ai-framework/scripts": "Node tools and their tests", "ai-framework/rules": "coding and security rules", "ai-framework/workflow": "phase documents", "ai-framework/hooks": "hook scripts and wiring", "ai-framework/integrations": "harness and skill docs", "ai-framework/templates": "scaffold copied into projects" },
  web: { app: "routes and pages", pages: "routes and pages", components: "UI components", "src/components": "UI components", "src/app": "routes and pages", "src/pages": "routes and pages", public: "static assets", styles: "stylesheets", assets: "static assets", hooks: "UI hooks" },
  backend: { api: "HTTP API handlers", server: "server code", routes: "route definitions", controllers: "request controllers", services: "business services", models: "data models", migrations: "database migrations", prisma: "database schema", db: "database access", "src/api": "HTTP API handlers", "src/server": "server code" },
  mobile: { ios: "iOS app project", android: "Android app project" },
  "ai-prompts": { "lib/ai": "AI integration code", "lib/ai/prompts": "prompt templates and evals" },
};

function bindStateStructure(deps: RuntimeDeps) {
  const { fs, path } = deps;

  // A real directory: no symlink at any component, and the resolved path stays inside the project.
  function realDir(root: string, relative: string): boolean {
    let current = root;
    for (const part of relative.split("/").filter(Boolean)) {
      current = path.join(current, part);
      let stat;
      try { stat = fs.lstatSync(current); } catch { return false; }
      if (stat.isSymbolicLink() || !stat.isDirectory()) return false;
    }
    return insideProject(root, current, deps) !== null;
  }
  function realFile(root: string, relative: string): boolean {
    const full = path.join(root, relative);
    try { const stat = fs.lstatSync(full); return stat.isFile() && !stat.isSymbolicLink() && insideProject(root, full, deps) !== null; } catch { return false; }
  }

  // Name-only detection of each project type, with the names that triggered it as evidence.
  function detect(root: string): Array<{ type: string; evidence: string[] }> {
    const dirs = (names: string[]) => names.filter((name) => !isSecretName(name) && realDir(root, name));
    const files = (names: string[]) => names.filter((name) => !isSecretName(name) && realFile(root, name));
    const found: Array<{ type: string; evidence: string[] }> = [];
    const add = (type: string, evidence: string[]) => { if (evidence.length) found.push({ type, evidence }); };
    add("workflow-bundle", dirs(["ai-framework"]));
    const frontendConfig = ["next.config.js", "next.config.mjs", "next.config.ts", "vite.config.js", "vite.config.ts", "vite.config.mts", "astro.config.mjs", "astro.config.ts", "svelte.config.js", "nuxt.config.ts", "nuxt.config.js", "angular.json"];
    const webDirs = !realFile(root, "package.json") ? [] : dirs(["app", "pages", "components", "public", "src/components", "src/app", "src/pages"]);
    const frontend = files(frontendConfig);
    add("web", frontend.length || webDirs.length ? [...frontend, ...(realFile(root, "package.json") && webDirs.length ? ["package.json"] : []), ...webDirs] : []);
    add("backend", [...dirs(["api", "server", "routes", "controllers", "migrations", "prisma", "src/api", "src/server"]), ...files(["manage.py", "go.mod", "pom.xml", "Gemfile", "composer.json"])]);
    add("mobile", dirs(["ios", "android"]));
    add("ai-prompts", dirs(["lib/ai/prompts"]));
    return found;
  }

  function roleFor(relative: string, types: string[]): string {
    for (const type of types) { const role = TEMPLATES[type]?.[relative]; if (role) return role; }
    if (COMMON_ROLES[relative]) return COMMON_ROLES[relative];
    const base = relative.split("/").pop() as string;
    for (const type of types) { const role = TEMPLATES[type]?.[base]; if (role) return role; }
    return COMMON_ROLES[base] || "unclassified";
  }

  // Breadth-first so a cap keeps the shallow, most informative folders. Only directory names are read.
  function scanTree(root: string, types: string[], scrub: (text: unknown) => string) {
    const tree: Array<{ path: string; kind: "dir"; role: string; depth: number }> = [];
    let visited = 0;
    let truncated = false;
    let queue = [{ relative: "", depth: 0 }];
    while (queue.length && !truncated) {
      const next: typeof queue = [];
      for (const { relative, depth } of queue) {
        if (depth >= MAX_DEPTH) continue;
        let entries;
        try { entries = fs.readdirEntriesSync(relative ? path.join(root, relative) : root); } catch { continue; }
        entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
        for (const entry of entries) {
          if (++visited > MAX_VISITED) { truncated = true; break; }
          if (entry.isSymbolicLink() || !entry.isDirectory() || SKIP_DIRS.has(entry.name) || isSecretName(entry.name)) continue;
          const child = relative ? `${relative}/${entry.name}` : entry.name;
          // Re-check the real path: Dirent types can lie across a race, and an ancestor can be a link.
          if (SKIP_PATHS.has(child) || !realDir(root, child)) continue;
          // A name the scrubber would change is credential-shaped or hostile; it is omitted, not rewritten.
          if (scrub(child) !== child) continue;
          if (tree.length >= MAX_ENTRIES) { truncated = true; break; }
          tree.push({ path: child, kind: "dir", role: scrub(roleFor(child, types)), depth: depth + 1 });
          next.push({ relative: child, depth: depth + 1 });
        }
        if (truncated) break;
      }
      queue = next;
    }
    return { tree, truncated };
  }

  function mapDecisions(root: string, tree: Array<{ path: string }>, helpers: StructureHelpers) {
    const { scrub, readMarkdown } = helpers;
    const folders = new Set(tree.map((item) => item.path));
    const topLevel = new Map(tree.filter((item) => !item.path.includes("/")).map((item) => [item.path.toLowerCase(), item.path]));
    const out: Array<Fact<{ path: string; id: string; title: string }>> = [];
    for (const dir of DECISION_DIRS) {
      if (!realDir(root, dir)) continue;
      let names: string[] = [];
      try { names = fs.readdirSync(path.join(root, dir)); } catch { continue; }
      names = names.filter((name) => !isSecretName(name) && /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}\.md$/.test(name) && !/^(README|index|template)\.md$/i.test(name)).sort().slice(0, MAX_DECISION_FILES);
      for (const name of names) {
        const relative = `${dir}/${name}`;
        const source = readMarkdown(root, relative);
        if (typeof source.text !== "string") continue;
        const text = source.text;
        const id = scrub(text.match(/^id:[ \t]*([A-Za-z0-9._-]+)/m)?.[1] || name.replace(/\.md$/, ""));
        const title = scrub(text.match(/^#[ \t]+(?:Decision:[ \t]*)?(.+)$/m)?.[1] || id);
        const matched: string[] = [];
        const take = (folder: string | undefined) => { if (folder && !matched.includes(folder) && matched.length < MAX_FOLDERS_PER_DECISION) matched.push(folder); };
        for (const match of text.matchAll(/(?<![\w.\/:-])((?:\.?[A-Za-z0-9_-][A-Za-z0-9_.-]*\/)+[A-Za-z0-9_.-]*)/g)) {
          const parts = match[1].split("/").filter(Boolean);
          for (let length = Math.min(MAX_DEPTH, parts.length); length >= 1; length--) {
            const prefix = parts.slice(0, length).join("/");
            if (folders.has(prefix)) { take(prefix); break; }
          }
        }
        for (const tag of (text.match(/^tags:[ \t]*\[([^\]\n]*)\]/m)?.[1] || "").split(",")) take(topLevel.get(tag.trim().toLowerCase()));
        for (const folder of matched) out.push({ value: { path: folder, id, title }, status: "observed", evidence: [relative] });
        if (out.length >= MAX_ENTRIES) return out.slice(0, MAX_ENTRIES);
      }
    }
    return out;
  }

  /** Builds `structure`: { projectType, detectedTypes, limits, tree, decisions }, each a fact or an array of facts. */
  function scanStructure(root: string, helpers: StructureHelpers) {
    const { scrub } = helpers;
    const detected = detect(root);
    const types = detected.map((item) => item.type);
    const projectType: Fact<string> = types.length === 0
      ? { value: "unknown", status: "unconfigured", evidence: [], note: "no recognized layout names are present; the type is not guessed" }
      : { value: types.length === 1 ? types[0] : "mixed", status: "observed", evidence: detected.flatMap((item) => item.evidence).map(scrub).slice(0, 12), ...(types.length > 1 ? { note: `detected: ${types.join(", ")}` } : {}) };
    const { tree, truncated } = scanTree(root, types, scrub);
    const detectedTypes: Fact<string[]> = { value: types, status: types.length ? "observed" : "unconfigured", evidence: projectType.evidence, note: "from directory and file names only; contents are never read" };
    const limits: Fact<{ entries: number; truncated: boolean; maxDepth: number; maxEntries: number }> = { value: { entries: tree.length, truncated, maxDepth: MAX_DEPTH, maxEntries: MAX_ENTRIES }, status: truncated ? "stale" : "observed", evidence: [], note: truncated ? `scan stopped at the ${MAX_ENTRIES}-entry or ${MAX_VISITED}-visit limit; deeper folders are not listed` : `directories only, up to depth ${MAX_DEPTH}, skipping dependency, build and secret-shaped names` };
    let decisions: Array<Fact<{ path: string; id: string; title: string }>> | Fact<null>;
    try { decisions = mapDecisions(root, tree, helpers); } catch { decisions = { value: null, status: "unavailable", evidence: [], note: "decision records could not be read" }; }
    return {
      projectType, detectedTypes, limits,
      tree: tree.map((item): Fact<typeof item> => ({ value: item, status: "observed", evidence: [item.path] })),
      decisions,
    };
  }

  /** Base skills: the bundle's own `.claude/skills` directory, keyed by skill id (directory names only). */
  function baseSkills(root: string, scrub: (text: unknown) => string): Array<Fact<{ id: string; enabled: boolean; phases: string[]; scope: string }>> | Fact<null> {
    const dir = ".claude/skills";
    if (!realDir(root, dir)) return { value: null, status: "unconfigured", evidence: [], note: "no .claude/skills directory (not a workflow bundle checkout)" };
    const ids: string[] = [];
    for (const entry of fs.readdirEntriesSync(path.join(root, dir)).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (ids.length >= 200) break;
      if (entry.isSymbolicLink() || !entry.isDirectory() || isSecretName(entry.name) || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/.test(entry.name) || scrub(entry.name) !== entry.name) continue;
      if (realDir(root, `${dir}/${entry.name}`)) ids.push(entry.name);
    }
    return ids.map((id) => ({ value: { id, enabled: true, phases: [], scope: "base" }, status: "observed", evidence: [`${dir}/${id}`], note: "present in the bundle skill directory; phases and enablement come from the bundle, not a registry" }));
  }

  return { scanStructure, baseSkills, detect, realDir };
}

let nodeDeps: RuntimeDeps | undefined;
function defaultDeps(): RuntimeDeps { return (nodeDeps ??= createNodeDeps()); }
export function createStateStructure(deps: RuntimeDeps): ReturnType<typeof bindStateStructure> { return bindStateStructure(deps); }
export function scanStructure(root: string, helpers: StructureHelpers, deps: RuntimeDeps = defaultDeps()) { return createStateStructure(deps).scanStructure(root, helpers); }
export function baseSkills(root: string, scrub: (text: unknown) => string, deps: RuntimeDeps = defaultDeps()) { return createStateStructure(deps).baseSkills(root, scrub); }
