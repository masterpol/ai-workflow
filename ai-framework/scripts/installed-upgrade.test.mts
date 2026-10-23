import assert from "node:assert/strict";
import { test } from "node:test";
import { createTestDeps, copyTree, listTree, spawnSync, tempFixture } from "./runtime/test-helpers.mts";
import { encodeData } from "./runtime/toon-data.mts";
import { SYNCED_DIRS } from "./bundle-sync.mts";
import { ownedPaths } from "./skill-sync.mts";
import { legacyEntries, INDEX_START } from "./done-work-index.mts";
import { buildGraph, overlayKnowledge, renderIndex } from "./graphify.mts";

const deps = createTestDeps();
const { fs, path } = deps;
const source = path.resolve(import.meta.dirname, "../..");
const BASE_REF = "b26b45b";
const SECRET = /(^|\/)(?:\.env(?:\.|$)|settings\.local\.json$|credentials\.json$)/i;
const flags = ["--experimental-strip-types", "--disable-warning=ExperimentalWarning"];

function write(root: string, relative: string, text: string): void {
  fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
  fs.writeFileSync(path.join(root, relative), text);
}
const read = (root: string, relative: string): string => fs.readFileSync(path.join(root, relative));
const exists = (root: string, relative: string): boolean => fs.existsSync(path.join(root, relative));

function command(root: string, executable: string, args: string[]): string {
  const result = deps.child.runSync(executable, args, { cwd: root, timeoutMs: 60000, maxBufferBytes: 32 * 1024 * 1024,
    env: { ...deps.proc.env, AI_WORKFLOW_RUNNER: "node", AI_WORKFLOW_ORCA_MULTI_AGENT: "false",
      GIT_AUTHOR_NAME: "Fixture", GIT_AUTHOR_EMAIL: "fixture@example.test", GIT_COMMITTER_NAME: "Fixture", GIT_COMMITTER_EMAIL: "fixture@example.test" } });
  assert.equal(result.status, 0, `${executable} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  assert.equal(result.signal, null);
  assert.equal(result.errorCode, undefined);
  return result.stdout;
}
const nodeExecutable = deps.runtime === "bun" ? command(source, "node", ["-p", "process.execPath"]).trim() : deps.proc.execPath;
const node = (root: string, entry: string, args: string[] = []): string => command(root, nodeExecutable, [...flags, entry, ...args]);
const git = (root: string, args: string[]): string => command(root, "git", ["-c", "core.hooksPath=/dev/null", ...args]);

/** Export only workflow/project inputs. Recovery archives, historical pitch folders and secrets are never read. */
function baseline(root: string): void {
  const files = git(source, ["ls-tree", "-r", "--name-only", BASE_REF]).trim().split("\n").filter(file => {
    if (SECRET.test(file) || file.startsWith(".project/compaction/archives/") || file.startsWith(".project/pitches/")) return file === ".project/pitches/_followups.md";
    return SYNCED_DIRS.some(dir => file.startsWith(`${dir}/`)) || file.startsWith(".project/") || file.startsWith("graphify-out/")
      || ["AGENTS.md", "CLAUDE.md", "README.md", ".gitignore", ".graphifyignore", ".opencode/opencode.json", ".codex/hooks.json", ".claude/settings.json", "VERSION", "CHANGELOG.md"].includes(file);
  });
  assert.ok(files.length > 100);
  assert.ok(!files.some(file => SECRET.test(file) || file.includes("compaction/archives/")));
  const archive = deps.child.runBytesSync("git", ["archive", BASE_REF, "--", ...files], { cwd: source, timeoutMs: 30000, maxBufferBytes: 64 * 1024 * 1024 });
  assert.equal(archive.status, 0);
  const extracted = spawnSync("tar", ["-x", "-C", root], { input: archive.stdout, timeout: 30000 });
  assert.equal(extracted.status, 0, String(extracted.stderr));
  assert.equal(legacyEntries(read(root, ".project/done-work.md")).size, 46);
  assert.equal(fs.readdirSync(path.join(root, ".project/compaction/ledgers")).filter(name => name.endsWith(".json")).length, 46);
}

/** Project-owned files excluded from sync and migration; template refreshes are checked separately. */
function durableHashes(root: string): Record<string, string> {
  const files = [".project/relations.toon"];
  for (const dir of [".project/compaction/ledgers", ".project/knowledge"]) {
    if (!exists(root, dir)) continue;
    files.push(...listTree(deps, path.join(root, dir)).map(name => `${dir}/${name}`).filter(file => fs.lstatSync(path.join(root, file)).isFile()));
  }
  return Object.fromEntries(files.filter(file => exists(root, file) && file !== ".project/knowledge/index.md"
    && file !== ".project/knowledge/README.md" && !file.startsWith(".project/knowledge/templates/"))
    .map(file => [file, deps.crypto.sha256Hex(fs.readBytesSync(path.join(root, file)))]));
}
const legacyText = (root: string): string => {
  const text = read(root, ".project/done-work.md");
  return text.slice(text.search(/^## [a-z0-9-]+ — shipped /m));
};

function localSkill(root: string): void {
  for (const relative of [".claude/skills/search/SKILL.md", ".agents/skills/search/SKILL.md", ".cursor/skills/search/SKILL.md", ".opencode/commands/search.md"]) {
    write(root, relative.replace(/search/g, "local-helper"), read(source, relative).replace(/search/g, "local-helper"));
  }
  const overlay = encodeData({ schemaVersion: 1, entries: [{ path: ".claude/skills/local-helper/SKILL.md", standalone: "Project-owned helper" }] });
  assert.equal(overlay.status, "encoded");
  if (overlay.status === "encoded") write(root, ".project/relations.toon", overlay.text);
}

function managedSkill(root: string, repository: string): void {
  write(repository, "skills/managed-helper/SKILL.md", "---\nname: managed-helper\ndescription: Fixture-managed helper\n---\nRead-only fixture instructions.\n");
  git(repository, ["init", "-b", "main"]);
  git(repository, ["add", "."]);
  git(repository, ["commit", "-m", "fixture skill"]);
  node(root, "ai-framework/scripts/add-skill.mts", ["install", "fixture/repo/managed-helper", "--repo", repository,
    "--path", "skills/managed-helper/SKILL.md", "--root", root, "--scope", "project", "--phases", "manual", "--apply"]);
}

function setupChecks(root: string): void {
  node(root, "ai-framework/scripts/graphify.mts", ["--check"]);
  node(root, "ai-framework/scripts/setup-validator.mts", ["--json"]);
}

test("installed b26b45b project upgrades in two passes, preserving legacy data and project-owned relations", { timeout: 180000 }, () => {
  const workspace = tempFixture(deps, {}), root = path.join(workspace, "project"), repository = path.join(workspace, "skill-source");
  fs.mkdirSync(root);
  try {
    baseline(root);
    assert.equal(exists(root, "ai-framework/workflow/relations.toon"), false);
    assert.equal(exists(root, "ai-framework/scripts/graphify-relations.mts"), false, "the new check cannot run before its scripts and manifest are synced");
    managedSkill(root, repository);
    localSkill(root);
    const originalEntries = legacyText(root), originalHashes = durableHashes(root);
    const beforeEntry = read(root, ".project/knowledge/templates/decision.md");
    const common = ["--source", source, "--base-ref", BASE_REF, "--json"];
    const dry = JSON.parse(node(root, "ai-framework/scripts/bundle-sync.mts", common));
    assert.ok(dry.new.some((entry: { path: string }) => entry.path === "ai-framework/scripts/consolidation-migrate.mts"));
    assert.equal(dry.nextSteps.some((step: { kind: string }) => step.kind === "consolidation"), false, "old tool cannot announce new next steps");
    assert.deepEqual(durableHashes(root), originalHashes);
    node(root, "ai-framework/scripts/bundle-sync.mts", [...common, "--apply"]); // old tool installs current code
    assert.ok(exists(root, "ai-framework/workflow/relations.toon"));
    assert.ok(exists(root, "ai-framework/scripts/graphify-relations.mts"));
    const secondDry = JSON.parse(node(root, "ai-framework/scripts/bundle-sync.mts", common));
    const next = secondDry.nextSteps.filter((step: { kind: string }) => step.kind === "consolidation");
    assert.equal(next.length, 1);
    assert.match(next[0].message, /46 legacy compacted pitch/);
    node(root, "ai-framework/scripts/bundle-sync.mts", [...common, "--apply"]);
    // Explicit missing-scaffold/config steps; this is not consolidation-migrate.
    node(root, "ai-framework/scripts/config-migrate.mts", ["--apply", "--root", "."]);
    node(root, "ai-framework/scripts/workflow-doctor.mts", ["--fix", "--json"]);
    setupChecks(root); // compatible without running the consolidation migration
    const snapshot = JSON.parse(node(root, "ai-framework/scripts/state-snapshot.mts", ["--json"]));
    assert.ok(snapshot.pitches.items.some((item: { value: { slug: string; phase: string } }) => item.value.slug === "token-time-report" && item.value.phase === "compacted"));
    assert.equal(read(root, ".project/knowledge/templates/decision.md"), beforeEntry, "doctor --fix never refreshes an existing template");
    assert.deepEqual(durableHashes(root), originalHashes);
    assert.equal(legacyText(root), originalEntries);
    const relations = JSON.parse(node(root, "ai-framework/scripts/graphify-relations.mts", ["--check", "--json"]));
    assert.equal(relations.overlayEntries, 1);
    assert.ok(relations.registryOwned.includes(".claude/skills/managed-helper/SKILL.md"));
    const migrated = JSON.parse(node(root, "ai-framework/scripts/consolidation-migrate.mts", ["--apply", "--json"]));
    assert.deepEqual(migrated.legacy, { ledgers: 46, entries: 46, decisions: 16 });
    assert.equal(read(root, ".project/knowledge/templates/decision.md"), read(source, "ai-framework/templates/project/knowledge/templates/decision.md"));
    assert.ok(read(root, ".project/done-work.md").includes(INDEX_START));
    assert.equal(legacyText(root), originalEntries);
    assert.deepEqual(durableHashes(root), originalHashes);
    const again = JSON.parse(node(root, "ai-framework/scripts/consolidation-migrate.mts", ["--apply", "--json"]));
    assert.ok(again.steps.every((step: { status: string }) => ["unchanged", "report"].includes(step.status)));
    setupChecks(root);
    // Once installed, a changed local manifest conflicts with changed upstream content, never overwrites it.
    const localManifest = `${read(root, "ai-framework/workflow/relations.toon")}\n# local customization\n`;
    write(root, "ai-framework/workflow/relations.toon", localManifest);
    const upstream = path.join(workspace, "changed-source");
    fs.mkdirSync(upstream);
    git(upstream, ["init", "-b", "main"]);
    write(upstream, "ai-framework/workflow/overview.md", "# Fixture source\n");
    write(upstream, "ai-framework/workflow/relations.toon", `${read(source, "ai-framework/workflow/relations.toon")}\n# upstream change\n`);
    const conflict = JSON.parse(node(root, "ai-framework/scripts/bundle-sync.mts", ["--source", upstream, "--apply", "--json"]));
    assert.ok(conflict.conflict.some((entry: { path: string }) => entry.path === "ai-framework/workflow/relations.toon"));
    assert.equal(read(root, "ai-framework/workflow/relations.toon"), localManifest);
    assert.deepEqual(durableHashes(root), originalHashes);
  } finally { fs.rmSync(workspace, { recursive: true, force: true }); }
});

function bundleFilter(root: string, owned: Set<string>): (file: string) => boolean {
  const ownedSkillDirectories = new Set([...owned].filter(file => file.endsWith("/skill.md")).map(file => path.posix.dirname(file)));
  return (file: string): boolean => {
    const relative = path.relative(root, file).replace(/\\/g, "/");
    return !SECRET.test(relative) && !owned.has(relative.toLowerCase()) && !ownedSkillDirectories.has(relative.toLowerCase());
  };
}

test("fresh-copy filtering excludes installed skill directories as well as their owned files", () => {
  const root = tempFixture(deps, { "from/.claude/skills/managed/SKILL.md": "installed", "from/.claude/skills/canonical/SKILL.md": "bundle" });
  try {
    const from = path.join(root, "from"), to = path.join(root, "to");
    copyTree(deps, path.join(from, ".claude"), path.join(to, ".claude"), bundleFilter(from, new Set([".claude/skills/managed/skill.md"])));
    assert.equal(exists(to, ".claude/skills/managed"), false, "no empty orphan directory remains");
    assert.equal(read(to, ".claude/skills/canonical/SKILL.md"), "bundle");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("fresh setup gets consolidation scaffold and passes verification without migration", { timeout: 90000 }, () => {
  const root = tempFixture(deps, {});
  try {
    const owned = ownedPaths(source, deps);
    const filter = bundleFilter(source, owned);
    for (const dir of SYNCED_DIRS) if (exists(source, dir)) copyTree(deps, path.join(source, dir), path.join(root, dir), filter);
    for (const file of ["AGENTS.md", "CLAUDE.md", "README.md", ".gitignore", ".graphifyignore", ".opencode/opencode.json", ".codex/hooks.json", ".claude/settings.json"]) {
      write(root, file, read(source, file));
    }
    copyTree(deps, path.join(source, "ai-framework/templates/project"), path.join(root, ".project"));
    write(root, "ai-workflow.toon", read(source, "ai-framework/templates/ai-workflow.example.toon"));
    for (const file of ["product", "architecture", "stack"]) write(root, `.project/context/${file}.md`, `# Fixture ${file}\n\nThis temporary project models a completed workflow installation with generated context and no application build. It is used only for the installed-upgrade acceptance checks.\n`);
    // Setup generates the backlog/index after copying templates. Use the real knowledge renderer/overlay;
    // P1 separately proves the full Graphify extraction/build route.
    write(root, ".project/pitches/_followups.md", "# Followups\n");
    const { graph, problems } = buildGraph(root, deps);
    assert.equal(problems.length, 0);
    write(root, ".project/knowledge/index.md", renderIndex(graph, root, deps));
    write(root, "graphify-out/graph.json", JSON.stringify(overlayKnowledge({ nodes: [], links: [] }, graph)));
    assert.ok(exists(root, ".project/records/shipped/_template.md"));
    assert.ok(exists(root, "ai-framework/workflow/relations.toon"));
    assert.ok(read(root, ".project/done-work.md").includes(INDEX_START));
    assert.match(read(root, ".project/knowledge/templates/decision.md"), /^status: accepted$/m);
    const before = durableHashes(root);
    setupChecks(root);
    assert.deepEqual(durableHashes(root), before);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
