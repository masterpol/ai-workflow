#!/usr/bin/env node
/** Classifies an installed project from file paths and metadata. */
import { readProjectText } from "./consolidation-migrate.mts";
import { runDirect } from "./runtime/cli.mts";
import { inferRoot } from "./runtime/entry.mts";
import type { RuntimeDeps, StatLike } from "./runtime/types.mts";

export type ProjectState = "empty" | "existing" | "unclear" | "resume";
export interface ProjectStateResult {
  schemaVersion: 1;
  state: ProjectState;
  reasons: string[];
  evidence: string[];
}

export const MAX_SCAN_ENTRIES = 4096;
export const MAX_SCAN_DEPTH = 32;
const MAX_RELATIVE_LENGTH = 4096;
const MAX_EVIDENCE = 32;
const MAX_EVIDENCE_LENGTH = 240;
const MAX_MANIFEST_BYTES = 256 * 1024;
const BUNDLE_ROOT = inferRoot(import.meta.filename);
const SHIPPED_MANIFEST = "ai-framework/templates/shipped-files.txt";
const TEMPLATE_ROOT = "ai-framework/templates/project";
const DRAFT = ".project/kickoff/draft.toon";

const HARNESS_ROOTS = new Set(["ai-framework", ".claude", ".agents", ".codex", ".cursor", ".opencode"]);
const SKIPPED_DIRECTORIES = new Set([
  ".git", // Version-control data is independent of whether the worktree has project files.
  ".opencode/node_modules", // Dependencies installed for the shipped harness do not describe the project.
]);
const IGNORED_FILES = new Set([
  ".git", // A linked Git worktree has a regular metadata pointer at this exact path.
  ".claude/settings.local.json", // Install instructions preserve these local harness preferences.
  "ai-workflow.toon", "ai_workflow_env.json", // Current and legacy workflow-only runtime settings.
  // OpenCode writes these itself and Git ignores them, so the shipped list cannot name them; SETUP.md copies package.json.
  ".opencode/package.json", ".opencode/package-lock.json", ".opencode/bun.lock", ".opencode/.gitignore",
  ".opencode/plugins/package.json",
]);
// The one exclusion by base name: operating systems write these reserved metadata files into any folder they open,
// including the bundle folders a person copies. No project file uses these names.
const OS_METADATA = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);

// These labels identify files by name alone. Unrecognized names stay ambiguous.
const PROJECT_FILENAMES = new Set([
  "readme", "license", "licence", "copying", "authors", "notice", "changelog", "contributing",
  "makefile", "gnumakefile", "justfile", "taskfile", "cmakelists.txt", "rakefile", "gemfile", "gemfile.lock",
  "package.json", "package-lock.json", "npm-shrinkwrap.json", "pnpm-lock.yaml", "pnpm-workspace.yaml",
  "yarn.lock", "bun.lock", "bun.lockb", "deno.json", "deno.jsonc", "deno.lock", "lerna.json", "nx.json", "turbo.json",
  "tsconfig.json", "jsconfig.json", "importmap.json", "angular.json", "go.mod", "go.sum", "go.work", "go.work.sum",
  "cargo.toml", "cargo.lock", "pyproject.toml", "pdm.lock", "poetry.lock", "uv.lock", "pipfile", "pipfile.lock",
  "build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts", "gradle.properties", "pom.xml",
  "composer.json", "composer.lock", "mix.exs", "mix.lock", "rebar.config", "rebar.lock",
  "pubspec.yaml", "pubspec.lock", "manifest.json", "project.toml", "manifest.toml",
  "dockerfile", "containerfile", "jenkinsfile", "vagrantfile", "procfile", "build", "build.bazel", "workspace",
  "workspace.bazel", "module.bazel", ".gitignore", ".gitattributes", ".editorconfig", ".dockerignore",
  "flake.nix", "netlify.toml", "vercel.json", "chart.yaml", "kustomization.yaml",
]);
const PROJECT_EXTENSIONS = new Set([
  // Application files and executable scripts.
  ".astro", ".bash", ".c", ".cc", ".clj", ".cljs", ".cmake", ".coffee", ".cpp", ".cs", ".css", ".cxx",
  ".dart", ".el", ".elm", ".erl", ".ex", ".exs", ".f", ".f90", ".fs", ".fsx", ".go", ".groovy", ".h", ".hpp",
  ".hrl", ".hs", ".html", ".java", ".jl", ".js", ".jsx", ".kt", ".kts", ".lua", ".m", ".mjs", ".cjs", ".ml",
  ".mm", ".mts", ".cts", ".nim", ".php", ".pl", ".pm", ".ps1", ".py", ".pyi", ".r", ".rb", ".res", ".rs",
  ".scala", ".scm", ".scss", ".sh", ".sol", ".svelte", ".swift", ".ts", ".tsx", ".v", ".vcxproj", ".vue", ".wasm", ".zig", ".zsh",
  // Infrastructure, build definitions, schema and query files.
  ".bicep", ".csproj", ".cue", ".fsproj", ".gql", ".gradle", ".graphql", ".hcl", ".jsonnet", ".nix", ".prisma",
  ".proto", ".sbt", ".sln", ".sql", ".star", ".tf", ".tfvars", ".tofu", ".vbproj", ".yaml", ".yml",
  // Notebooks and documents.
  ".adoc", ".asciidoc", ".doc", ".docx", ".ipynb", ".md", ".mdx", ".odt", ".pdf", ".qmd", ".rmd", ".rst", ".rtf",
  ".tex", ".text", ".txt", ".typ",
]);

const FILESYSTEM_CODES = new Set([
  "EACCES", "EBUSY", "EILSEQ", "EINVAL", "EIO", "ELOOP", "EMFILE", "ENAMETOOLONG",
  "ENFILE", "ENOENT", "ENOTDIR", "EPERM", "ESTALE",
]);

function errorCode(error: unknown): string {
  const code = error !== null && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
  return typeof code === "string" && FILESYSTEM_CODES.has(code) ? code : "EIO";
}

function scanError(code: string): Error {
  return Object.assign(new Error(code), { code });
}

function safeComponent(name: string): boolean {
  return name !== "" && name !== "." && name !== ".." &&
    !name.includes("/") && !name.includes("\\") && !name.includes(":") && !name.includes("\0") && !name.includes("\uFFFD");
}

function evidencePath(relative: string): string {
  const safe = relative.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, "");
  // Removing controls could expose a leading slash when the first component has no visible characters.
  const displayed = safe.replace(/^\/+/, "./") || ".";
  return displayed.length > MAX_EVIDENCE_LENGTH ? `${displayed.slice(0, MAX_EVIDENCE_LENGTH - 1)}…` : displayed;
}

/** `paths` is sorted behind `first`, so the cap on evidence can never drop the paths that explain the state. */
function stateResult(state: ProjectState, reasons: string[], paths: string[] = [], first: string[] = []): ProjectStateResult {
  const relativePaths = [...new Set([...[...first].sort(), ...[...paths].sort()])];
  const evidence = relativePaths.slice(0, MAX_EVIDENCE).map(evidencePath);
  if (relativePaths.length > MAX_EVIDENCE) reasons.push(`Evidence capped at ${MAX_EVIDENCE} paths.`);
  return { schemaVersion: 1, state, reasons, evidence };
}

function checkedDirectory(absolute: string, deps: RuntimeDeps): StatLike {
  const stat = deps.fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) throw scanError("ELOOP");
  if (!stat.isDirectory()) throw scanError("ENOTDIR");
  if (deps.proc.platform !== "win32" && (!(stat.mode & 0o444) || !(stat.mode & 0o111))) throw scanError("EACCES");
  if (deps.fs.realpathSync(absolute) !== absolute) throw scanError("ELOOP");
  return stat;
}

function sameDirectory(before: StatLike, after: StatLike): boolean {
  return before.dev === after.dev && before.ino === after.ino && before.mtimeMs === after.mtimeMs;
}

/** Walks a known relative path using metadata. Only ENOENT means absent. */
function inspectRelative(root: string, relative: string, deps: RuntimeDeps): StatLike | undefined {
  let absolute = root;
  const parts = relative.split("/");
  for (const [index, part] of parts.entries()) {
    absolute = deps.path.join(absolute, part);
    try {
      if (index === parts.length - 1) return deps.fs.lstatSync(absolute);
      checkedDirectory(absolute, deps);
    } catch (error) {
      if (errorCode(error) === "ENOENT") return undefined;
      throw error;
    }
  }
  return undefined;
}

function probeDraft(root: string, deps: RuntimeDeps): ProjectStateResult | undefined {
  try {
    const stat = inspectRelative(root, DRAFT, deps);
    if (!stat) return undefined;
    if (stat.isFile()) return stateResult("resume", ["A saved kickoff draft exists."], [DRAFT]);
    return stateResult("unclear", ["The kickoff draft is not a regular file."], [DRAFT]);
  } catch (error) {
    return stateResult("unclear", [`Cannot inspect the kickoff draft (${errorCode(error)}).`], [DRAFT]);
  }
}

function readShippedPaths(bundle: string, deps: RuntimeDeps): Set<string> {
  // The shared reader refuses symlinks and checks the opened descriptor against the inspected file.
  const text = readProjectText(bundle, SHIPPED_MANIFEST, MAX_MANIFEST_BYTES, deps);
  if (text === null) throw scanError("ENOENT");
  const entries = text.replace(/\r\n/g, "\n").split("\n");
  if (entries.at(-1) === "") entries.pop();
  if (!entries.includes(SHIPPED_MANIFEST) || entries.some((entry, index) =>
    entry.length > MAX_RELATIVE_LENGTH || !entry.split("/").every(safeComponent) || (index > 0 && entry <= entries[index - 1]))) {
    throw scanError("EINVAL");
  }
  return new Set(entries);
}

function isProjectFile(name: string, path: RuntimeDeps["path"]): boolean {
  const lower = name.toLowerCase();
  if (lower.startsWith(".env") || lower === "credentials.json" || lower === "settings.local.json") return false;
  return PROJECT_FILENAMES.has(lower) || PROJECT_EXTENSIONS.has(path.extname(lower))
    || lower.startsWith("dockerfile.") || lower.startsWith("containerfile.");
}

interface Scan {
  files: string[];
  issues: Array<{ relative: string; reason: string }>;
}

function scanProject(root: string, bundle: string, shipped: Set<string>, deps: RuntimeDeps): Scan {
  const { fs, path } = deps;
  const files: string[] = [];
  const issues: Scan["issues"] = [];
  let remaining = MAX_SCAN_ENTRIES;
  let entryBudgetExceeded = false;
  const refuse = (relative: string, reason: string): void => { issues.push({ relative: relative || ".", reason }); };

  function classifyFile(relative: string, name: string): void {
    if (shipped.has(relative) || IGNORED_FILES.has(relative) || OS_METADATA.has(name)) return;
    if (relative.startsWith(".project/")) {
      try {
        const template = `${TEMPLATE_ROOT}/${relative.slice(".project/".length)}`;
        if (inspectRelative(bundle, template, deps)?.isFile()) return;
      } catch (error) {
        refuse(relative, `Cannot inspect the scaffold (${errorCode(error)}).`);
        return;
      }
      refuse(relative, "Found a workflow file outside the bundled scaffold.");
    } else if (HARNESS_ROOTS.has(relative.split("/", 1)[0])) {
      refuse(relative, "Found a file outside the shipped list in a workflow or harness directory.");
    } else if (isProjectFile(name, path)) {
      files.push(relative);
    } else {
      refuse(relative, "Found an unrecognized project file.");
    }
  }

  function visitDirectory(absolute: string, relative: string, depth: number, observed?: StatLike): void {
    if (entryBudgetExceeded) return;
    if (depth > MAX_SCAN_DEPTH) {
      refuse(relative, `Scan depth exceeded ${MAX_SCAN_DEPTH}.`);
      return;
    }
    let names: string[];
    let before: StatLike;
    try {
      before = checkedDirectory(absolute, deps);
      if (observed && !sameDirectory(observed, before)) throw scanError("ESTALE");
      names = fs.readdirSync(absolute);
      if (!sameDirectory(before, checkedDirectory(absolute, deps))) throw scanError("ESTALE");
    } catch (error) {
      refuse(relative, `Cannot list directory safely (${errorCode(error)}).`);
      return;
    }
    // RuntimeDeps returns a whole directory listing. Charge it before sorting or inspecting children.
    if (names.length > remaining) {
      refuse(relative, `Scan entry budget exceeded ${MAX_SCAN_ENTRIES}.`);
      entryBudgetExceeded = true;
      return;
    }
    remaining -= names.length;
    for (const name of names.sort()) {
      if (entryBudgetExceeded) break;
      const child = relative ? `${relative}/${name}` : name;
      if (child.length > MAX_RELATIVE_LENGTH || !safeComponent(name)) {
        refuse(relative, "Found an unsafe or overlong path.");
        continue;
      }
      const target = path.join(absolute, name);
      let stat: StatLike;
      try {
        stat = fs.lstatSync(target);
      } catch (error) {
        refuse(child, `Cannot inspect entry (${errorCode(error)}).`);
        continue;
      }
      if (stat.isSymbolicLink()) {
        refuse(child, "Found a symbolic link.");
      } else if (stat.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(child)) visitDirectory(target, child, depth + 1, stat);
      } else if (stat.isFile()) {
        // An access check asks whether this user may read the file without opening it.
        try {
          fs.accessSync(target, fs.constants.R_OK);
        } catch (error) {
          refuse(child, `Found an unreadable file (${errorCode(error)}).`);
          continue;
        }
        classifyFile(child, name);
      } else {
        refuse(child, "Found a special filesystem entry.");
      }
    }
    try {
      if (!sameDirectory(before, checkedDirectory(absolute, deps))) throw scanError("ESTALE");
    } catch (error) {
      refuse(relative, `Directory changed during the scan (${errorCode(error)}).`);
    }
  }

  visitDirectory(root, "", 0);
  return { files, issues };
}

export function detectProjectState(root: string, deps: RuntimeDeps): ProjectStateResult {
  let resolved: string;
  try {
    const absolute = deps.path.resolve(root);
    const before = deps.fs.lstatSync(absolute);
    if (before.isSymbolicLink()) throw scanError("ELOOP");
    if (!before.isDirectory()) throw scanError("ENOTDIR");
    resolved = deps.fs.realpathSync(absolute);
    if (!sameDirectory(before, checkedDirectory(resolved, deps))) throw scanError("ESTALE");
  } catch (error) {
    return stateResult("unclear", [`Cannot inspect the project root (${errorCode(error)}).`], ["."]);
  }

  const draft = probeDraft(resolved, deps);
  if (draft) return draft;

  let bundle: string;
  let shipped: Set<string>;
  try {
    bundle = deps.fs.realpathSync(BUNDLE_ROOT);
    shipped = readShippedPaths(bundle, deps);
  } catch (error) {
    return stateResult("unclear", [`Cannot read the bundled shipped-path list (${errorCode(error)}).`]);
  }

  const scan = scanProject(resolved, bundle, shipped, deps);
  // Unclassified entries and incomplete scans take precedence over project files.
  // Keep confirmed files in evidence so a person can make the routing choice.
  if (scan.issues.length > 0) {
    return stateResult("unclear", [...new Set(scan.issues.map(({ reason }) => reason))],
      scan.files, scan.issues.map(({ relative }) => relative));
  }
  if (scan.files.length > 0) return stateResult("existing", ["The scan found project files."], scan.files);
  return stateResult("empty", ["The completed scan found only workflow, scaffold, or incidental files."]);
}

export function main(argv: string[], deps: RuntimeDeps): number {
  const usage = (): number => {
    deps.io.stderr.write("Usage: node ai-framework/scripts/project-state.mts [--root <dir>] [--json]\n");
    return 2;
  };
  let json = false;
  let root: string | undefined;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--json" && !json) {
      json = true;
    } else if (arg === "--root" && root === undefined) {
      root = argv[++index];
      if (!root || root.startsWith("--") || root.includes("\0")) return usage();
    } else {
      return usage();
    }
  }

  const result = detectProjectState(root ?? deps.proc.cwd(), deps);
  const message = json ? JSON.stringify(result) :
    `Project state: ${result.state}\n${[...result.reasons, ...result.evidence.map((file) => `  ${file}`)].join("\n")}`;
  deps.io.stdout.write(`${message}\n`);
  return 0;
}

runDirect(import.meta.url, main);
