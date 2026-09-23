#!/usr/bin/env node
/*
 * Verifies that the portable workflow is complete after installation. Checks
 * run concurrently and report as they finish. --fix restores only missing
 * files from an existing .project scaffold; it never overwrites project data.
 */

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = process.cwd();
const fix = process.argv.includes("--fix");
const json = process.argv.includes("--json");
const color = !json && !process.argv.includes("--no-color") && !process.env.NO_COLOR;
const results = [];

const colors = {
  pass: "\u001b[32m",
  fixed: "\u001b[36m",
  info: "\u001b[34m",
  warn: "\u001b[33m",
  fail: "\u001b[31m",
  reset: "\u001b[0m",
  heading: "\u001b[35m",
};

// Single source of truth: every profile below is DERIVED from the canonical file's own
// declared model/profile, never hardcoded per agent or skill name. That's what keeps this
// doctor honest as agents/skills are added — a new one is checked automatically, not only
// once someone remembers to register it here.

// No Anthropic route in the OpenCode adapters for now — some installations only have
// OpenAI/OpenCode Zen connected, and an Anthropic route there errors instead of falling back.
// Prefer the more capable option over the free one once a task earns `standard` or above.
//
// Use a *named* 5.6-tier model (luna/sol/terra), never bare "openai/gpt-5.6" — confirmed via
// `opencode models openai --verbose`: the bare id is a stub catalog entry
// (reasoning: false, context: 0, empty variants) despite accepting a reasoningEffort option,
// which is exactly what broke a real /plan run. The named siblings are the real, fully-specified
// models (reasoning: true, 400k context, full none/low/medium/high/xhigh/max variants) — pick
// whichever named variant you like, they're identical in capability, just don't use the bare id.
const opencodeModels = {
  fast: "opencode/mimo-v2.5-free",
  standard: "openai/gpt-5.6-terra",
  deep: "openai/gpt-5.6-terra",
};

// .claude/agents/*.md declare a concrete Claude model, not an abstract profile name — this
// reverses that into fast/standard/deep so the OpenCode/Codex mirrors can be checked against it.
const agentProfileByModelPrefix = [
  [/^claude-haiku-/, "fast"],
  [/^claude-sonnet-/, "standard"],
  [/^claude-opus-/, "deep"],
];

// .claude/skills/*/SKILL.md declare their profile in a "> **Recommended capability profile:**
// `X`" line — this is the single source of truth for skill profiles. Two kinds of skill can't
// be derived purely by regex, and are named here instead of duplicating a model:
//   - critique: a fan-out with a distinct profile per perspective (see its own dispatch table),
//     not one command-level profile. Its command model is critique's own synthesis step.
//   - fix / test-strategy: their declared line names two profiles ("fast for X; standard for
//     Y") — the command defaults to the lighter one; the skill's own text documents escalation.
const skillProfileOverrides = {
  critique: "standard",
  fix: "fast",
  plan: "standard",
  "test-strategy": "fast",
};

// Most OpenCode command models derive directly from their canonical capability profile. The
// doctor and setup-validator read broad project configuration, so they use a paid OpenAI route
// instead of the free route reserved for non-sensitive mechanical tasks (no Anthropic route for
// now — see the opencodeModels comment above).
const skillModelOverrides = {
  "workflow-doctor": "openai/gpt-5.6-luna",
  "setup-validator": "openai/gpt-5.6-luna",
};

// Almost every skill mirror says "Load `.claude/skills/<name>/SKILL.md` and follow it exactly."
// workflow-doctor is the one exception: its behavior lives entirely in a script, so its mirrors
// correctly point at that script instead of re-reading prose. Named here rather than forcing a
// mismatched pattern onto an otherwise-correct file.
const skillReferencePatternOverrides = {
  "workflow-doctor": /ai-framework\/scripts\/workflow-doctor\.js/,
  "setup-validator": /ai-framework\/scripts\/setup-validator\.js/,
};

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function paint(status, text) {
  return color ? `${colors[status] || ""}${text}${colors.reset}` : text;
}

function record(status, name, detail) {
  const result = { status, name, detail };
  results.push(result);
  if (!json) {
    process.stdout.write(`${paint(status, status.toUpperCase().padEnd(5))} ${name}: ${detail}\n`);
  }
}

async function exists(target) {
  try {
    await fsp.access(target);
    return true;
  } catch {
    return false;
  }
}

async function requireFile(relativePath) {
  if (await exists(absolute(relativePath))) {
    record("pass", relativePath, "present");
    return true;
  }
  record("fail", relativePath, "missing");
  return false;
}

async function matches(relativePath, expression, message) {
  if (!(await requireFile(relativePath))) return;
  try {
    const content = await fsp.readFile(absolute(relativePath), "utf8");
    record(expression.test(content) ? "pass" : "fail", relativePath, message);
  } catch (error) {
    record("fail", relativePath, `could not read: ${error.message}`);
  }
}

async function parseJson(relativePath) {
  if (!(await requireFile(relativePath))) return;
  try {
    JSON.parse(await fsp.readFile(absolute(relativePath), "utf8"));
    record("pass", relativePath, "valid JSON");
  } catch (error) {
    record("fail", relativePath, `invalid JSON: ${error.message}`);
  }
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: root, ...options });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => child.kill(), options.timeout ?? 15000);
    child.stdout?.on("data", (chunk) => { stdout += chunk; });
    child.stderr?.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({ error, stdout, stderr });
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ code, stdout, stderr });
    });
  });
}

async function listDirNames(relativePath) {
  try {
    const entries = await fsp.readdir(absolute(relativePath), { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function listMdFileStems(relativePath) {
  try {
    const entries = await fsp.readdir(absolute(relativePath), { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name.replace(/\.md$/, ""))
      .sort();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSkillProfile(content, name) {
  if (skillProfileOverrides[name]) return skillProfileOverrides[name];
  const match = content.match(/Recommended capability profile:\*\*\s*`([a-z]+)`/);
  return match ? match[1] : null;
}

function extractAgentProfile(content) {
  const match = content.match(/^model:\s*(\S+)$/m);
  if (!match) return null;
  const found = agentProfileByModelPrefix.find(([prefix]) => prefix.test(match[1]));
  return found ? found[1] : null;
}

async function checkNode(relativePath) {
  if (!(await requireFile(relativePath))) return;
  if (process.versions.bun) {
    record("info", relativePath, "Node syntax check skipped under Bun; run with Node for parser validation");
    return;
  }
  const result = await runProcess(process.execPath, ["--check", absolute(relativePath)]);
  record(result.code === 0 ? "pass" : "fail", relativePath, result.code === 0 ? "valid Node.js syntax" : result.stderr.trim() || "invalid Node.js syntax");
}

async function statOrNull(target) {
  try {
    return await fsp.lstat(target);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function isSafeProjectPath(project, target) {
  const relative = path.relative(project, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    record("fail", path.relative(root, target), "repair path escapes .project");
    return false;
  }
  let current = project;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    if ((await statOrNull(current))?.isSymbolicLink()) {
      record("fail", path.relative(root, current), "repair refuses symbolic links");
      return false;
    }
    current = path.join(current, part);
  }
  if ((await statOrNull(current))?.isSymbolicLink()) {
    record("fail", path.relative(root, current), "repair refuses symbolic links");
    return false;
  }
  return true;
}

async function templatePaths(directory, relative = "") {
  const entries = await fsp.readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(entries.filter((entry) => entry.name !== ".DS_Store").map(async (entry) => {
    const child = path.join(directory, entry.name);
    const childRelative = path.join(relative, entry.name);
    return entry.isDirectory() ? [childRelative, ...(await templatePaths(child, childRelative))] : [childRelative];
  }));
  return paths.flat();
}

async function copyMissing(source, destination, project) {
  const entries = await fsp.readdir(source, { withFileTypes: true });
  await Promise.all(entries.filter((entry) => entry.name !== ".DS_Store").map(async (entry) => {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (!(await isSafeProjectPath(project, to))) return;
    if (entry.isDirectory()) {
      if (!(await exists(to))) {
        await fsp.mkdir(to, { recursive: true });
        record("fixed", path.relative(root, to), "created directory from template");
      }
      await copyMissing(from, to, project);
    } else if (!(await exists(to))) {
      await fsp.copyFile(from, to);
      record("fixed", path.relative(root, to), "restored missing template file");
    }
  }));
}

async function checkProjectScaffold() {
  const project = absolute(".project");
  const template = absolute("ai-framework/templates/project");
  const scaffoldPaths = await templatePaths(template);
  await Promise.all(scaffoldPaths.map((item) => requireFile(`ai-framework/templates/project/${item}`)));
  if (!(await exists(project))) {
    record("info", ".project", "not installed; scaffold template is ready for approved setup");
    return;
  }
  if ((await statOrNull(project))?.isSymbolicLink()) {
    record("fail", ".project", "repair refuses a symbolic-link project directory");
    return;
  }
  if (fix) await copyMissing(template, project, project);
  await Promise.all(scaffoldPaths.map((item) => requireFile(`.project/${item}`)));

  const followups = absolute(".project/pitches/_followups.md");
  if (!(await exists(followups)) && fix) {
    if (!(await isSafeProjectPath(project, followups))) return;
    await fsp.mkdir(path.dirname(followups), { recursive: true });
    await fsp.writeFile(followups, "# Followups\n");
    record("fixed", ".project/pitches/_followups.md", "created empty backlog");
  }
  await requireFile(".project/pitches/_followups.md");
}

async function checkOpenCodeResolution() {
  if (process.versions.bun) {
    record("info", "OpenCode", "static adapter checks completed; run with Node to resolve live OpenCode config");
    return;
  }
  const result = await runProcess("opencode", ["debug", "config"]);
  if (result.error?.code === "ENOENT") {
    record("info", "OpenCode", "not installed; static adapter checks completed");
    return;
  }
  if (result.code !== 0) {
    record("warn", "OpenCode", result.stderr.trim() || "could not resolve config");
    return;
  }
  try {
    JSON.parse(result.stdout);
    record("pass", "OpenCode", "debug config resolves");
  } catch {
    record("fail", "OpenCode", "debug config did not return JSON");
  }
}

async function checkKnowledgeGraph() {
  const knowledge = absolute(".project/knowledge");
  if (!(await exists(knowledge))) {
    record("info", "Knowledge graph", "knowledge scaffold not installed; templates and graph generator were validated");
    return;
  }

  const graphify = absolute("ai-framework/scripts/graphify.js");
  const report = await runProcess(process.execPath, [graphify, "--check", "--json"]);
  if (report.code !== 0) {
    record("fail", "Knowledge graph", report.stderr.trim() || "graphify reported invalid knowledge entries");
    return;
  }

  let graphReport;
  try {
    graphReport = JSON.parse(report.stdout);
    const warnings = graphReport.problems?.filter((problem) => problem.level === "warn") ?? [];
    record(warnings.length > 0 ? "warn" : "pass", "Knowledge graph", warnings.length > 0 ? `graphify found ${warnings.length} warning(s)` : `graphify validated ${graphReport.stats.total} entry(ies)`);
  } catch {
    record("fail", "Knowledge graph", "graphify did not return JSON");
    return;
  }

  const graphPath = path.join(knowledge, "graph.json");
  const indexPath = path.join(knowledge, "index.md");
  if (!(await exists(graphPath)) || !(await exists(indexPath))) {
    record("warn", "Knowledge graph", "derived graph.json or index.md is missing; run node ai-framework/scripts/graphify.js");
    return;
  }

  try {
    const graph = JSON.parse(await fsp.readFile(graphPath, "utf8"));
    const ids = new Set(graph.nodes?.map((node) => node.id));
    const edgesValid = Array.isArray(graph.edges) && graph.edges.every((edge) => ids.has(edge.from) && ids.has(edge.to));
    const tagsValid = graph.tagIndex && Object.values(graph.tagIndex).every((entries) => Array.isArray(entries) && entries.every((id) => ids.has(id)));
    const statsValid = graph.stats?.total === graph.nodes?.length;
    const index = await fsp.readFile(indexPath, "utf8");
    const indexValid = index.startsWith("# Knowledge Index");
    record(edgesValid && tagsValid && statsValid && indexValid ? "pass" : "fail", "Knowledge graph", edgesValid && tagsValid && statsValid && indexValid ? "derived graph and index are structurally consistent" : "derived graph or index is structurally inconsistent; rerun graphify");
  } catch (error) {
    record("fail", "Knowledge graph", `could not read derived artifacts: ${error.message}`);
  }
}

async function checkSkill(name) {
  const canonical = `.claude/skills/${name}/SKILL.md`;
  if (!(await requireFile(canonical))) return;
  const content = await fsp.readFile(absolute(canonical), "utf8");
  const referencePattern =
    skillReferencePatternOverrides[name] ?? new RegExp(`\\.claude/skills/${escapeRegExp(name)}/SKILL\\.md`);

  const codexSkill = `.agents/skills/${name}/SKILL.md`;
  await requireFile(codexSkill);
  await matches(codexSkill, referencePattern, "loads canonical skill");

  const profile = extractSkillProfile(content, name);
  if (!profile) {
    record(
      "warn",
      canonical,
      'no declared capability profile — add a "> **Recommended capability profile:** `fast|standard|deep`" line, or register an override in workflow-doctor.js if it genuinely has more than one'
    );
    return;
  }

  const command = `.opencode/commands/${name}.md`;
  const expectedModel = skillModelOverrides[name] ?? opencodeModels[profile];
  await requireFile(command);
  await matches(command, new RegExp(`^model: ${escapeRegExp(expectedModel)}$`, "m"), `expected OpenCode model (${profile} profile)`);
  await matches(command, referencePattern, "loads canonical skill");
  if (profile === "deep") {
    // The opencode.json provider default is a moderate effort shared by every gpt-5.6 use, so a
    // deep-profile command must declare its own xhigh override — it can't just inherit the model.
    await matches(command, /^reasoningEffort: xhigh$/m, "uses xhigh reasoning");
  }
}

async function checkAgent(name) {
  const claude = `.claude/agents/${name}.md`;
  if (!(await requireFile(claude))) return;
  const content = await fsp.readFile(absolute(claude), "utf8");

  await matches(claude, /^model: .+$/m, "declares a Claude model");
  await matches(claude, /Sub-agent dispatch:/, "documents nested sub-agent dispatch");

  const profile = extractAgentProfile(content);
  if (!profile) {
    record(
      "warn",
      claude,
      'model doesn\'t match a known claude-haiku-/claude-sonnet-/claude-opus- prefix — cannot derive its fast/standard/deep profile to validate mirrors'
    );
    return;
  }

  const opencode = `.opencode/agents/${name}.md`;
  const codex = `.codex/agents/${name}.toml`;
  await matches(opencode, new RegExp(`^model: ${escapeRegExp(opencodeModels[profile])}$`, "m"), `expected OpenCode model (${profile} profile)`);
  await matches(opencode, new RegExp(`\\.claude/agents/${escapeRegExp(name)}\\.md`), "loads canonical role prompt");
  await matches(codex, /^model = ".+"$/m, "declares a Codex model");
  if (profile === "deep") {
    await matches(opencode, /^reasoningEffort: xhigh$/m, "uses xhigh reasoning");
    await matches(codex, /^model_reasoning_effort = "xhigh"$/m, "uses xhigh reasoning");
  }
}

async function validate() {
  const [skillNames, agentFiles, phaseFiles, ruleFiles] = await Promise.all([
    listDirNames(".claude/skills"),
    listMdFileStems(".claude/agents"),
    listMdFileStems("ai-framework/workflow/phases"),
    listMdFileStems("ai-framework/rules"),
  ]);

  // SETUP.md and README.md's *content* (the readmeChecks below) belong to the portable bundle
  // repo itself, not to a target project it's installed into — SETUP.md is intentionally not
  // copied per its own Step 1, and an installed project's README.md is that project's own,
  // unrelated file. Detect which context this run is in so those two checks don't misfire
  // against a real target project (found by testing this doctor against one).
  const inPortableBundleRepo = await exists(absolute("SETUP.md"));

  const coreFiles = ["AGENTS.md", "CLAUDE.md", "README.md", "ai-framework/workflow/overview.md", "ai-framework/integrations/harnesses.md", "ai-framework/rules/model-routing.md", "ai-framework/hooks/hooks.json"];
  if (inPortableBundleRepo) coreFiles.push("SETUP.md");
  const scripts = [".claude/hooks/post-edit-check.js", "ai-framework/hooks/scripts/pre-ship-verify.js", "ai-framework/hooks/scripts/stuck-uphill-detector.js", "ai-framework/scripts/graphify.js", "ai-framework/scripts/workflow-doctor.js", "ai-framework/scripts/setup-validator.js"];
  // These scripts use CommonJS require(). A target project's own package.json may declare
  // "type": "module" (found by testing against a real Bun/ESM project) — without a scoped
  // override, plain `node` crashes with "require is not defined in ES module scope" the moment
  // this bundle is copied into such a project. Node resolves "type" from the nearest ancestor
  // package.json, so one override file per script directory is enough.
  const cjsOverrides = [".claude/hooks/package.json", "ai-framework/hooks/scripts/package.json", "ai-framework/scripts/package.json"];
  const readmeChecks = [
    [/^## Set up$/m, "documents setup"],
    [/^## Workflow Doctor$/m, "documents workflow diagnostics"],
    [/workflow-doctor\.js --fix/, "documents safe repair"],
    [/--json/, "documents machine-readable diagnostics"],
    [/--no-color/, "documents plain-text diagnostics"],
    [/^## Knowledge Graph$/m, "documents knowledge graph"],
    [/graphify\.js --check/, "documents knowledge dry run"],
    [/OpenCode model setup/, "documents OpenCode provider setup"],
    [/^## One source, every vendor$/m, "documents the canonical/mirror architecture"],
    [/^## How to improve this flow$/m, "documents workflow extension"],
  ];

  // Generated `.project/rules/*.md` companions are only useful if something in the pipeline
  // actually tells an agent to read them — found by testing on a real project where /setup had
  // generated them correctly but every phase only ever named the generic ai-framework/rules/.
  // These four are where code actually gets written or reviewed; keep them honest.
  const rulesConsumers = [
    ".claude/skills/shape/SKILL.md",
    ".claude/skills/plan/SKILL.md",
    ".claude/skills/build/SKILL.md",
    ".claude/skills/audit/SKILL.md",
  ];

  await Promise.all([
    ...coreFiles.map(requireFile),
    ...(inPortableBundleRepo ? readmeChecks.map(([expression, detail]) => matches("README.md", expression, detail)) : []),
    ...phaseFiles.map((phase) => requireFile(`ai-framework/workflow/phases/${phase}.md`)),
    ...ruleFiles.map((rule) => requireFile(`ai-framework/rules/${rule}.md`)),
    ...cjsOverrides.map((file) => matches(file, /"type":\s*"commonjs"/, "declares commonjs for its directory")),
    ...rulesConsumers.map((file) => matches(file, /\.project\/rules/, "references the generated .project/rules companions")),
    ...skillNames.map(checkSkill),
    ...agentFiles.map(checkAgent),
    parseJson(".opencode/opencode.json"),
    parseJson("ai-framework/hooks/hooks.json"),
    ...scripts.map(checkNode),
    checkOpenCodeResolution(),
  ]);
  await checkProjectScaffold();
  await checkKnowledgeGraph();
}

async function main() {
  if (!json) process.stdout.write(`${paint("heading", "Workflow doctor: running checks concurrently...\n")}`);
  await validate();
  const failures = results.filter((result) => result.status === "fail");
  const fixed = results.filter((result) => result.status === "fixed");
  const warnings = results.filter((result) => result.status === "warn");
  if (json) {
    process.stdout.write(`${JSON.stringify({ results, failures: failures.length, fixed: fixed.length }, null, 2)}\n`);
  } else {
    if (failures.length > 0) {
      process.stdout.write(`\n${paint("fail", `Workflow status: NEEDS ATTENTION (${failures.length} blocking issue(s))`)}\n`);
      process.stdout.write("Next: fix the listed workflow artifacts, then run the doctor again. Use --fix only to restore missing files in an existing .project scaffold.\n");
    } else if (warnings.length > 0) {
      process.stdout.write(`\n${paint("warn", `Workflow status: READY WITH WARNINGS (${warnings.length})`)}\n`);
      process.stdout.write("Next: review the warnings before relying on the affected harness integration.\n");
    } else {
      process.stdout.write(`\n${paint("pass", "Workflow status: READY")}\n`);
      process.stdout.write("All workflow contracts, adapters, hooks, model routes, and scaffold templates passed.\n");
    }
    if (fixed.length > 0) process.stdout.write(`${paint("fixed", `Repairs: restored ${fixed.length} missing scaffold artifact(s).`)} Run the doctor again to confirm a clean state.\n`);
    if (results.some((result) => result.name === ".project" && result.status === "info")) {
      process.stdout.write("Setup: no .project is installed yet. Run /setup in the target application and approve its generated context files before starting the pipeline.\n");
    }
    process.stdout.write(`Validated ${results.filter((result) => result.status === "pass").length} checks. Use --json for machine-readable output or --no-color for plain text.\n`);
  }
  process.exitCode = failures.length > 0 ? 1 : 0;
}

main().catch((error) => {
  process.stderr.write(`Workflow doctor failed unexpectedly: ${error.stack || error.message}\n`);
  process.exitCode = 2;
});
