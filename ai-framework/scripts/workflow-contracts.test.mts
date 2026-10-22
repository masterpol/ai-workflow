// Cross-file instruction contracts: each topic has one owner, and every other file that mentions the topic must agree
// with it. These guard the conflicts recorded in .project/pitches/fix-instruction-conflicts/log.md. They read the
// shipped canonical files, so they hold in the bundle repo and in an installed project alike.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createTestDeps } from "./runtime/test-helpers.mts";

const { fs, path } = createTestDeps();
const ROOT = path.resolve(import.meta.dirname, "../..");
const read = (relative: string): string => fs.readFileSync(path.join(ROOT, relative));
const exists = (relative: string): boolean => fs.existsSync(path.join(ROOT, relative));
const orcaBlock = (text: string): string => text.match(/<!-- orca-multi-agent:begin -->([\s\S]*?)<!-- orca-multi-agent:end -->/)?.[1] ?? "";

test("A: no Orca section lets exit 3 (or any refusal) fall back to the normal path while Orca is requested", () => {
  const consumers = ["ai-framework/workflow/phases/2-build.md", "ai-framework/workflow/phases/3-audit.md", "ai-framework/workflow/phases/4-ship.md",
    ".claude/skills/build/SKILL.md", ".claude/skills/audit/SKILL.md", ".claude/skills/ship/SKILL.md"];
  const ownerPath = "ai-framework/integrations/orca-vendors.md", heading = "CLI, grader and live-smoke status";
  const files = Object.fromEntries([...consumers, ownerPath].map((file) => [file, read(file)]));
  const check = (tree: Record<string, string>): void => {
    const owner = tree[ownerPath];
    assert.ok(owner, "Orca owner exists");
    const section = owner.split(`## ${heading}\n`)[1]?.split("\n## ")[0];
    assert.ok(section, "Orca owner section exists");
    assert.match(section, /Exit code 3 alone never authorizes the normal path/);
    assert.match(section, /stop and ask/);
    assert.match(section, /Never continue on the single-agent path silently/);
    for (const file of consumers) {
      const text = tree[file];
      assert.ok(text, `required consumer exists: ${file}`);
      assert.doesNotMatch(text, /exits 3, continue|or the command exits 3/, `forbidden exit 3 fallback: ${file}`);
      const block = orcaBlock(text);
      if (text.includes("## Execute") || !block) {
        assert.ok(text.includes(ownerPath), `${file} names the Orca owner`);
        assert.ok(text.includes(heading), `${file} names the refusal section`);
        assert.match(text, /when[^\n]*enabled/i, `${file} states applicability`);
      } else {
        assert.match(block, /stop and ask/, file);
        assert.match(block, /Never fall back to the normal single-agent path above silently/, file);
      }
    }
  };
  check(files);
  for (const file of [...consumers, ownerPath]) {
    const missing = { ...files }; delete missing[file];
    assert.throws(() => check(missing), /exists/, `missing ${file} fails rather than shrinking the checked set`);
  }
  assert.throws(() => check({ ...files, [ownerPath]: files[ownerPath].replace(`## ${heading}`, "## Missing") }), /owner section/);
  assert.throws(() => check({ ...files, [consumers[0]]: `${files[consumers[0]]}\nor the command exits 3, continue` }), /forbidden exit 3 fallback/);
  assert.throws(() => check({ ...files, [ownerPath]: files[ownerPath].replaceAll("stop and ask", "continue") }), /stop and ask/);
});

test("B/C: reviewers report; the security reviewer is read-only on every vendor and always ends with the summary", () => {
  const security = read(".claude/agents/security-reviewer.md");
  const tools = security.match(/^tools:\s*(.+)$/m)?.[1] ?? "";
  assert.doesNotMatch(tools, /"Write"|"Edit"/, "security-reviewer must not hold Write/Edit");
  assert.doesNotMatch(security, /remediat/i, "reviewers inspect and report; the coordinator applies verified patches");
  assert.doesNotMatch(security, /output exactly/i, "a clean review still ends with the summary");
  assert.match(security, /## Security summary/);
  assert.match(security, /INCOMPLETE/, "a review that could not finish is never reported as PASS");
  for (const name of ["code-reviewer", "test-coverage-checker", "ux-reviewer", "i18n-checker", "skeptic", "architect"]) {
    const file = `.claude/agents/${name}.md`;
    assert.doesNotMatch(read(file).match(/^tools:\s*(.+)$/m)?.[1] ?? "", /"Write"|"Edit"/, `${name} reviews read-only`);
  }
  assert.match(read(".opencode/agents/security-reviewer.md"), /edit: deny/);
  assert.match(read(".codex/agents/security-reviewer.toml"), /sandbox_mode = "read-only"/);
});

test("D: one owner for file-size limits; the code reviewer points at it instead of its own number", () => {
  const reviewer = read(".claude/agents/code-reviewer.md");
  assert.doesNotMatch(reviewer, /800 lines|800 max|\(>800/, "no reviewer-private size default");
  assert.match(reviewer, /component-architecture\.md/, "the reviewer names the owning rule");
  const owner = read("ai-framework/rules/component-architecture.md");
  assert.match(owner, /150 lines/);
  assert.match(owner, /80 lines/);
  assert.match(owner, /cohesive/i, "the owner states the cohesive-unit exception");
  assert.match(read("ai-framework/rules/coding-standards.md"), /component-architecture\.md/, "the checklist defers to the owner");
});

const buildRequirements = (file: string): string => {
  const text = read(file);
  if (file !== ".claude/skills/build/SKILL.md" || !text.includes("## Execute")) return text;
  const owner = "ai-framework/workflow/phases/2-build.md";
  assert.ok(text.includes(owner), "build entry names its phase owner");
  assert.match(text, /Before the first scope, read/, "build entry loads requirements before acting");
  for (const section of ["Per-scope inner loop", "Verification-before-completion", "Adaptive gate"]) {
    assert.ok(text.includes(section), `build entry names ${section}`);
    assert.ok(read(owner).includes(`## ${section}`), `build owner contains ${section}`);
  }
  return read(owner);
};

test("E: the overview owns the gate matrix; build and audit agree with it and keep every gate", () => {
  const overview = read("ai-framework/workflow/overview.md");
  const row = (name: string): string[] => {
    const line = overview.split("\n").find((entry) => entry.startsWith(`| ${name} |`));
    assert.ok(line, `overview has a "${name}" row`);
    return line.split("|").slice(2, -1).map((cell) => cell.trim());
  };
  assert.deepEqual(row("/build end"), ["auto (flows into /audit)", "gated", "gated", "gated"]);
  assert.deepEqual(row("/build start"), ["auto", "gated", "gated", "gated + rollback"]);
  for (const file of [".claude/skills/build/SKILL.md", "ai-framework/workflow/phases/2-build.md"]) {
    const text = buildRequirements(file);
    assert.doesNotMatch(read(file), /Build-start gate|Confirmation gate \(big-batch only\)/, `${file} keeps the entry conflict guard`);
    assert.match(read(file), /\/build end/, `${file} names its gate row`);
    assert.doesNotMatch(text, /Build-start gate|Confirmation gate \(big-batch only\)/, `${file} has no conflicting gate wording`);
    assert.match(text, /\/build end/, `${file} names the overview row its confirmation gate follows`);
  }
  const audit = read("ai-framework/workflow/phases/3-audit.md");
  for (const appetite of ["small-batch", "bug-fix"]) {
    const line = audit.split("\n").find((entry) => entry.startsWith(`| ${appetite} |`));
    assert.ok(line, `audit has a ${appetite} row`);
    assert.match(line, /if zero must-fix/, `${appetite} must not advance with unresolved findings`);
    assert.match(line, /review.*complete|complete.*review/i, `${appetite} must not advance with an incomplete review`);
  }
});

test("F: the vendor docs describe both mirror mechanisms and how to refresh a differing Cursor copy", () => {
  const vendors = read("ai-framework/docs/vendors.md");
  assert.doesNotMatch(vendors, /A mirror is a pointer, never a fork/);
  assert.match(vendors, /byte cop/i);
  assert.match(vendors, /cursor-mirrors/);
});

test("G: entry files and the migrator agree with the mode-resolution owner", () => {
  for (const file of ["AGENTS.md", "CLAUDE.md"]) {
    const text = read(file);
    assert.match(text, /skills\.modes\.caveman/, `${file} names the toon setting for a persistent mode`);
    if (text.includes("full mirror")) assert.match(text, /@AGENTS\.md/, `${file} names the accepted @AGENTS.md import alongside the full mirror`);
  }
  assert.doesNotMatch(read("ai-framework/scripts/config-migrate.mts"), /modes\.json stays authoritative/, "a valid toon drops per-phase modes (d31)");
  assert.match(read("ai-framework/integrations/skill-defaults.md"), /only when no `ai-workflow\.toon` exists/);
});

test("H: AI-prompt scopes are defined by behavior once; triggers reference that definition, not one directory", () => {
  const shape = read("ai-framework/workflow/phases/0-shape.md");
  assert.match(shape, /### AI-prompt scope \(definition\)/);
  assert.match(shape, /wherever the files live/);
  for (const file of [".claude/skills/shape/SKILL.md", ".claude/skills/critique/SKILL.md", ".claude/agents/eval-runner.md", ".claude/skills/shape-lite/SKILL.md"]) {
    const text = read(file);
    assert.match(text, /AI-prompt scope/, `${file} uses the defined term`);
    for (const line of text.split("\n").filter((entry) => entry.includes("lib/ai/prompts/"))) {
      assert.match(line, /e\.g\.|for example|such as|one common layout/, `${file}: lib/ai/prompts/ appears only as an example`);
    }
  }
});

const auditRequirements = (file: string): string => {
  const text = read(file);
  if (file !== ".claude/skills/audit/SKILL.md" || !text.includes("## Execute")) return text;
  const owner = "ai-framework/workflow/phases/3-audit.md";
  assert.ok(text.includes(owner), "audit entry names its phase owner");
  for (const heading of ["Incomplete reviews", "Loop discipline", "Reviewer contract"]) {
    assert.ok(text.includes(heading), `audit entry names ${heading}`);
    assert.ok(read(owner).includes(`## ${heading}`), `audit owner contains ${heading}`);
  }
  assert.match(text, /Before triage\/synthesis, read/, "completion requirements load before synthesis");
  return read(owner);
};

test("I: incomplete reviewer reports keep audit open even with zero must-fix findings", () => {
  const phase = read("ai-framework/workflow/phases/3-audit.md");
  const completion = auditRequirements(".claude/skills/audit/SKILL.md").split("## Incomplete reviews")[1]?.split("\n## ")[0] ?? "";
  assert.match(completion, /INCOMPLETE/);
  assert.match(completion, /not-completed/);
  assert.match(completion, /retry once/i);
  assert.match(completion, /do not auto-advance/i);
  assert.match(read(".claude/skills/audit/SKILL.md"), /Incomplete reviews/, "the entry skill must load the completion contract");
  assert.match(read("ai-framework/workflow/overview.md"), /required reviews.*complete/i, "the gate owner requires completed reviews");
});

test("J: small-batch skip instructions cannot override critique for an AI-prompt scope", () => {
  const critique = read(".claude/skills/critique/SKILL.md");
  const skip = critique.split("\n").find((line) => line.includes("Skipped for"));
  assert.ok(skip);
  assert.match(skip, /non-AI small-batch/, "only non-AI small-batch work skips critique");
  assert.match(read("ai-framework/workflow/overview.md"), /critique.*skipped.*non-AI|non-AI.*critique.*skipped/i);
  assert.match(critique, /Bug-fix and hotfix.*direct workflows/, "the existing direct variants remain explicit");
  assert.match(critique, /skipping `\/shape` does not waive/, "direct variants retain required AI evaluation");
});

test("K: output-handling changes remain AI-prompt scopes in every shortened trigger", () => {
  const description = read(".claude/agents/eval-runner.md").match(/^description: (.+)$/m)?.[1] ?? "";
  assert.match(description, /model output/);
  const escalation = read(".claude/skills/shape-lite/SKILL.md").split("\n").find((line) => line.includes("is an AI-prompt scope:")) ?? "";
  assert.match(escalation, /model output/);
  const auditTrigger = read("ai-framework/workflow/phases/3-audit.md").split("## Eval gate (AI changes — hard)")[1]?.split("\n1.")[0] ?? "";
  assert.match(auditTrigger, /AI-prompt scope/, "the audit gate consumes the full behavior-based definition");
});

test("L: audit retries obey the appetite's cycle cap", () => {
  for (const file of [".claude/skills/audit/SKILL.md", "ai-framework/workflow/phases/3-audit.md"]) {
    const loop = auditRequirements(file).split("## Loop discipline")[1]?.split("\n## ")[0] ?? "";
    assert.match(loop, /applicable cycle cap/i, file);
    assert.doesNotMatch(loop, /After cycle 3/, `${file} must not grant every appetite three cycles`);
  }
});

test("M: build consumes the standalone lite card instead of requiring absent plan and hill files", () => {
  for (const file of [".claude/skills/build/SKILL.md", "ai-framework/workflow/phases/2-build.md"]) {
    const text = buildRequirements(file);
    assert.match(text, /Standalone `\/shape-lite`/, file);
    assert.match(text, /Exit check/, `${file} consumes the lite verification command`);
    // Every sentence that names plan.md or hill.md together with the lite card must waive them, never require them.
    const lite = text.split(/\n\s*\n/).find((paragraph) => paragraph.includes("Standalone `/shape-lite`")) ?? "";
    assert.match(lite, /(do not require|instead of requiring)[^.]*`plan\.md` or `hill\.md`/, `${file}: the lite paragraph waives plan.md and hill.md`);
    assert.doesNotMatch(lite, /(must|requires?) (a |the )?`?plan\.md/i, `${file}: the lite paragraph never requires plan.md`);
  }
});

test("N: residual owners — UI size, setup import, persistent off, ship retries — agree with their owners", () => {
  const ui = read(".claude/skills/ui-design/SKILL.md");
  for (const line of ui.split("\n").filter((entry) => /\b150\b/.test(entry))) assert.match(line, /component-architecture\.md|project's own limit/, `ui-design: ${line.trim()}`);
  assert.match(read("ai-framework/rules/component-architecture.md"), /must be split[^.]*unless it carries the recorded cohesive-unit exception/);
  const setup = read(".claude/skills/setup/SKILL.md");
  assert.match(setup.split("## Your Goal")[1]?.split("\n## ")[0] ?? "", /@AGENTS\.md` import/, "setup's goal accepts a valid import");
  assert.match(setup, /valid `@AGENTS\.md` import[^.]*keep it\s+unchanged/, "setup keeps a valid import during generation");
  assert.doesNotMatch(read("ai-framework/integrations/skill-defaults.md"), /^`enabled: false` is the only persistent disable/m);
  assert.match(read("ai-framework/integrations/skill-defaults.md"), /skills\.modes\.caveman: off/);
  for (const line of ui.split("\n").filter((entry) => /split it now/.test(entry))) assert.match(line, /cohesive-unit exception/, "ui-design honours the recorded exception");
  // Every place that checks or previews CLAUDE.md accepts the kept @AGENTS.md import, not only the mirror.
  for (const [file, pattern] of [["SETUP.md", /full\s+`?CLAUDE\.md`?\s+mirror/], [".claude/skills/setup/SKILL.md", /^\d+\. CLAUDE\.md/m]] as const) {
    if (!exists(file)) continue;
    const text = read(file);
    for (const match of text.matchAll(new RegExp(pattern.source, pattern.flags.includes("m") ? "gm" : "g"))) {
      const around = text.slice(match.index, match.index + 260);
      assert.match(around, /@AGENTS\.md` import|@AGENTS\.md import/, `${file}: "${match[0]}" must also accept the kept import`);
    }
  }
  assert.doesNotMatch(read("ai-framework/integrations/skill-defaults.md"), /every vendor mirror\s+already says/, "Cursor copies are byte copies, not pointers");
  for (const file of ["ai-framework/workflow/phases/4-ship.md", ".claude/skills/ship/SKILL.md"]) {
    const text = read(file);
    assert.doesNotMatch(text, /`\/audit` cycle 2/, `${file} must not grant a cycle beyond the appetite cap`);
    assert.match(text, /cycle cap/, `${file} routes a failed check under the appetite cycle cap`);
  }
});

test("mirrors: every Cursor copy of a canonical skill or agent touched by these contracts is byte-identical", () => {
  for (const file of ["agents/security-reviewer.md", "agents/code-reviewer.md", "agents/eval-runner.md", "skills/build/SKILL.md", "skills/audit/SKILL.md",
    "skills/ship/SKILL.md", "skills/shape/SKILL.md", "skills/critique/SKILL.md", "skills/shape-lite/SKILL.md", "skills/ui-design/SKILL.md",
    "skills/setup/SKILL.md"]) {
    assert.ok(exists(`.cursor/${file}`), `.cursor/${file} exists (Cursor copies are committed)`);
    assert.equal(read(`.cursor/${file}`), read(`.claude/${file}`), `.cursor/${file} matches its canonical file`);
  }
});
