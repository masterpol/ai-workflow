// The ship phase is started by the `ship-pitch` command: the host's built-in `/ship` shadows a workflow command of that name.
// This guard fails when bundle-owned text tells anyone to use the old command or path again, or when an old adapter comes back.
// The PHASE is still called ship (--phase ship, metrics, SHIPPED.md, records/shipped, 4-ship.md): only command forms are refused.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createTestDeps, tempFixture, urlPath } from "./runtime/test-helpers.mts";

const deps = createTestDeps();
const ROOT = urlPath(new URL("../..", import.meta.url));
// Built from parts so that this file does not match its own rules.
const OLD = "sh" + "ip";
const RULES: readonly RegExp[] = [
  new RegExp(`[/$]${OLD}(?![-a-zA-Z0-9_/]|\\.[a-zA-Z0-9])`),
  new RegExp(`skills/${OLD}/`),
  new RegExp(`commands/${OLD}\\.md`),
];
const OLD_ADAPTERS = [`.claude/skills/${OLD}`, `.cursor/skills/${OLD}`, `.agents/skills/${OLD}`, `.opencode/commands/${OLD}.md`];
// bundle-sync names the old paths on purpose: it tells installed projects to remove them.
const ALLOWED = new Set(["ai-framework/scripts/bundle-sync.mts"]);
const BUNDLE_DIRS = ["ai-framework", ".claude", ".cursor", ".codex", ".agents", ".opencode"];
// Never opened (secrets and local settings), and trees that are not bundle text.
const NEVER_READ = /^(\.env.*|credentials\.json|settings\.local\.json)$/;
const SKIP_DIRS = new Set(["node_modules", "worktrees"]);
const ENTRY_FILES = ["AGENTS.md", "CLAUDE.md", "README.md", "SETUP.md"];
const TEXT = /\.(md|mts|ts|json|toon|toml|yml|yaml)$/;

/** Every old-command hit under `root`. In an installed project only the bundle's own `ai-framework/` is judged: skills and entry files there are the project's. */
function offenders(root: string): string[] {
  const { fs, path } = deps;
  const installed = fs.existsSync(path.join(root, ".project/.bundle-sync.json"));
  const found: string[] = [];
  const check = (relative: string): void => {
    if (ALLOWED.has(relative) || relative.endsWith(".test.mts") || !TEXT.test(relative) || NEVER_READ.test(relative.slice(relative.lastIndexOf("/") + 1))) return;
    fs.readFileSync(path.join(root, relative)).split("\n").forEach((line, index) => {
      if (RULES.some((rule) => rule.test(line))) found.push(`${relative}:${index + 1}`);
    });
  };
  const walk = (relative: string): void => {
    const full = path.join(root, relative);
    if (!fs.existsSync(full)) return;
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) return;
    if (stat.isDirectory()) { for (const name of fs.readdirSync(full)) if (!SKIP_DIRS.has(name)) walk(`${relative}/${name}`); return; }
    check(relative);
  };
  for (const directory of installed ? ["ai-framework"] : BUNDLE_DIRS) walk(directory);
  if (!installed) {
    for (const file of ENTRY_FILES) if (fs.existsSync(path.join(root, file))) check(file);
    for (const adapter of OLD_ADAPTERS) if (fs.existsSync(path.join(root, adapter))) found.push(adapter);
  }
  return found;
}

test("no bundle-owned file uses the old ship command or path, and no old adapter exists", () => {
  assert.deepEqual(offenders(ROOT), []);
});

test("the guard refuses each old form and leaves the phase name alone", (t) => {
  const bad = [`run /${OLD} now`, `type $${OLD}`, `/audit → /${OLD}`, `see .claude/skills/${OLD}/SKILL.md`, `.opencode/commands/${OLD}.md`, `\`/${OLD}\`'s steps`, `then /${OLD}.`];
  const fine = ["--phase ship", "the ship phase", "SHIPPED.md and records/shipped/", "pre-ship-verify.mts", "workflow/phases/4-ship.md", "/ship-pitch", "skills/ship-pitch/SKILL.md", "| ship | reconcile |"];
  const root = tempFixture(deps, { "ai-framework/bad.md": bad.join("\n"), "ai-framework/fine.md": fine.join("\n") });
  t.after(() => deps.fs.rmSync(root, { recursive: true, force: true }));
  assert.deepEqual(offenders(root), bad.map((_, index) => `ai-framework/bad.md:${index + 1}`));
});

test("in an installed project the project's own entry files and skills are not judged, and an old adapter is not an error", (t) => {
  const files = { ".project/.bundle-sync.json": "{}", "AGENTS.md": `use /${OLD}`, [`.claude/skills/${OLD}/SKILL.md`]: "custom", "ai-framework/ok.md": "fine" };
  const root = tempFixture(deps, files);
  t.after(() => deps.fs.rmSync(root, { recursive: true, force: true }));
  assert.deepEqual(offenders(root), []);
  deps.fs.rmSync(deps.path.join(root, ".project/.bundle-sync.json"));
  assert.deepEqual(offenders(root), ["AGENTS.md:1", `.claude/skills/${OLD}`]);
});

test("every bundle root is scanned at every level, and secret-bearing files are never opened", (t) => {
  const places = [".claude/x.md", ".agents/x.md", ".opencode/x.md", ".cursor/x.md", ".codex/x.toml", "ai-framework/deep/er/x.md"];
  const files: Record<string, string> = Object.fromEntries(places.map((place) => [place, `run /${OLD} now`]));
  files[".claude/settings.local.json"] = `"/${OLD}"`;
  const root = tempFixture(deps, files);
  t.after(() => deps.fs.rmSync(root, { recursive: true, force: true }));
  assert.deepEqual(offenders(root).sort(), places.map((place) => `${place}:1`).sort());
});
