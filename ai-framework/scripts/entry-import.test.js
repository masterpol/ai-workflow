const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { resolveClaudeEntry } = require("./entry-import");

const AGENTS_OK = "# Agents\n\n## Project specifics\n\nReal content.\n\n## Response style (caveman mode)\n\nbrief\n";

function project(t, files) {
  // realpath: macOS tmpdir is a /var -> /private/var alias that breaks path assertions
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "entry-import-")));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), body);
  return dir;
}

test("a plain CLAUDE.md is returned unchanged", async (t) => {
  const dir = project(t, { "AGENTS.md": AGENTS_OK });
  const result = await resolveClaudeEntry(dir, "# Mine\n\n## Project specifics\n");
  assert.equal(result.kind, "none");
});

test("@AGENTS.md (and ./AGENTS.md) loads the local target and exposes its content", async (t) => {
  const dir = project(t, { "AGENTS.md": AGENTS_OK });
  for (const line of ["@AGENTS.md", "@./AGENTS.md", "@AGENTS.md  "]) {
    const result = await resolveClaudeEntry(dir, `# Claude\n\n${line}\n`);
    assert.equal(result.kind, "import", line);
    assert.match(result.content, /## Project specifics/);
  }
});

test("malformed, foreign, and fenced directives are rejected or ignored as appropriate", async (t) => {
  const dir = project(t, { "AGENTS.md": AGENTS_OK });
  for (const line of ["@AGENTS.md extra", "@AGENTS.md.bak", "@ AGENTS.md", "@../AGENTS.md", "@/etc/AGENTS.md", "@~/AGENTS.md", "@docs/AGENTS.md"]) {
    const result = await resolveClaudeEntry(dir, `${line}\n`);
    assert.notEqual(result.kind, "import", line);
  }
  for (const line of ["@AGENTS.md extra", "@AGENTS.md.bak", "@../AGENTS.md", "@docs/AGENTS.md"]) {
    assert.equal((await resolveClaudeEntry(dir, `${line}\n`)).kind, "invalid", line);
  }
  // an import inside a code fence or inline code is documentation, not a directive
  assert.equal((await resolveClaudeEntry(dir, "```\n@AGENTS.md\n```\n")).kind, "none");
  assert.equal((await resolveClaudeEntry(dir, "Use `@AGENTS.md` to import.\n")).kind, "none");
  // a mention of some other file is ordinary prose
  assert.equal((await resolveClaudeEntry(dir, "@someone please look\n")).kind, "none");
});

test("a missing or symlinked target is rejected", async (t) => {
  const missing = project(t, {});
  assert.match((await resolveClaudeEntry(missing, "@AGENTS.md\n")).detail, /missing/);
  const linked = project(t, { "real.md": AGENTS_OK });
  fs.symlinkSync(path.join(linked, "real.md"), path.join(linked, "AGENTS.md"));
  const result = await resolveClaudeEntry(linked, "@AGENTS.md\n");
  assert.equal(result.kind, "invalid");
  assert.match(result.detail, /symbolic link/);
});

test("fences follow CommonMark closely: longer fences, indented fences, unclosed fences, CRLF, BOM", async (t) => {
  const dir = project(t, { "AGENTS.md": AGENTS_OK });
  for (const text of ["````\n@AGENTS.md\n````\n", "```\n@AGENTS.md\n", "  ```\n@AGENTS.md\n  ```\n", "```\r\n@AGENTS.md\r\n```\r\n", "~~~\n@AGENTS.md\n~~~\n", "``a`` `@AGENTS.md`\n"]) {
    assert.equal((await resolveClaudeEntry(dir, text)).kind, "none", JSON.stringify(text));
  }
  for (const text of ["```\nx\n```\n@AGENTS.md\n", "@AGENTS.md\r\n", "\uFEFF@AGENTS.md\n", "```\n~~~\n```\n@AGENTS.md\n"]) {
    assert.equal((await resolveClaudeEntry(dir, text)).kind, "import", JSON.stringify(text));
  }
});

test("a directive is judged on its raw line: code spans neither create nor rescue an import", async (t) => {
  const dir = project(t, { "AGENTS.md": AGENTS_OK });
  assert.equal((await resolveClaudeEntry(dir, "`a`@AGENTS.md\n")).kind, "none");
  assert.equal((await resolveClaudeEntry(dir, "@AGENTS.md`x`\n")).kind, "invalid");
  assert.equal((await resolveClaudeEntry(dir, "~~~\nx\n```\n@AGENTS.md\n```\n~~~\n")).kind, "none");
});

test("a pathological unclosed-fence file is scanned in linear time", async (t) => {
  const dir = project(t, { "AGENTS.md": AGENTS_OK });
  const started = Date.now();
  await resolveClaudeEntry(dir, "~~~x\n".repeat(200000));
  assert.ok(Date.now() - started < 2000, "scan must not be quadratic");
});

test("missing target reports kind invalid; a directory or oversized AGENTS.md is rejected; two imports load once", async (t) => {
  assert.equal((await resolveClaudeEntry(project(t, {}), "@AGENTS.md\n")).kind, "invalid");
  const dirTarget = project(t, {});
  fs.mkdirSync(path.join(dirTarget, "AGENTS.md"));
  assert.match((await resolveClaudeEntry(dirTarget, "@AGENTS.md\n")).detail, /not a regular file/);
  const big = project(t, { "AGENTS.md": "x".repeat(1024 * 1024 + 1) });
  assert.match((await resolveClaudeEntry(big, "@AGENTS.md\n")).detail, /larger than 1 MiB/);
  const twice = await resolveClaudeEntry(project(t, { "AGENTS.md": AGENTS_OK }), "@AGENTS.md\n@./AGENTS.md\n");
  assert.equal(twice.kind, "import");
  assert.equal(twice.content.split("## Project specifics").length - 1, 1);
});

function validatorEntry(dir) {
  const script = path.join(__dirname, "setup-validator.js");
  fs.mkdirSync(path.join(dir, ".project"), { recursive: true }); // the validator stops early without it
  const out = spawnSync(process.execPath, [script, "--json"], { cwd: dir, encoding: "utf8" });
  const report = JSON.parse(out.stdout);
  return report.results.filter((item) => item.name === "CLAUDE.md" && item.detail !== "present");
}

test("setup-validator accepts a complete @AGENTS.md CLAUDE.md and keeps the earlier shapes", (t) => {
  const viaImport = validatorEntry(project(t, { "AGENTS.md": AGENTS_OK, "CLAUDE.md": "@AGENTS.md\n" }));
  assert.ok(viaImport.some((item) => item.status === "pass" && /@AGENTS\.md/.test(item.detail)), JSON.stringify(viaImport));
  assert.ok(!viaImport.some((item) => item.status === "fail"), JSON.stringify(viaImport));
  const mirror = validatorEntry(project(t, { "AGENTS.md": AGENTS_OK, "CLAUDE.md": "# C\n\n## Project specifics\n" }));
  assert.ok(mirror.some((item) => item.status === "pass"));
  const merged = validatorEntry(project(t, { "AGENTS.md": AGENTS_OK, "CLAUDE.md": "# Mine\n\n## AI Workflow (ai-workflow-portable)\n" }));
  assert.ok(merged.some((item) => item.status === "pass"));
});

test("setup-validator rejects incomplete, foreign, symlinked, and malformed imports", (t) => {
  const incomplete = validatorEntry(project(t, { "AGENTS.md": "# Agents\n\nFill this in during Step 4\n", "CLAUDE.md": "@AGENTS.md\n" }));
  assert.ok(incomplete.some((item) => item.status === "fail"), JSON.stringify(incomplete));
  const foreign = validatorEntry(project(t, { "AGENTS.md": AGENTS_OK, "CLAUDE.md": "@docs/AGENTS.md\n" }));
  assert.ok(foreign.some((item) => item.status === "fail"));
  const malformed = validatorEntry(project(t, { "AGENTS.md": AGENTS_OK, "CLAUDE.md": "@AGENTS.md extra\n" }));
  assert.ok(malformed.some((item) => item.status === "fail"));
  const linked = project(t, { "real.md": AGENTS_OK, "CLAUDE.md": "@AGENTS.md\n" });
  fs.symlinkSync(path.join(linked, "real.md"), path.join(linked, "AGENTS.md"));
  assert.ok(validatorEntry(linked).some((item) => item.status === "fail" && /symbolic/.test(item.detail)));
  const stub = validatorEntry(project(t, { "AGENTS.md": AGENTS_OK, "CLAUDE.md": "Bootstrap file shipped\n@AGENTS.md\n" }));
  assert.ok(stub.some((item) => item.status === "fail"));
});
