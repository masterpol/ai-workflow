import assert from "node:assert/strict";
import { test } from "node:test";
import type { TestContext } from "node:test";

import { detectProjectState, main, MAX_SCAN_DEPTH, MAX_SCAN_ENTRIES } from "./project-state.mts";
import { captureIo, createTestDeps, listTree, runScript, stripTypes, tempFixture, urlPath } from "./runtime/test-helpers.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

const deps = createTestDeps();
const { fs, path } = deps;
const bundle = urlPath(new URL("../../", import.meta.url));
const script = urlPath(new URL("./project-state.mts", import.meta.url));
const manifest = "ai-framework/templates/shipped-files.txt";
const scaffold = "ai-framework/templates/project/";
const draft = ".project/kickoff/draft.toon";
const bundleSetup = path.join(bundle, "SETUP.md");
const skipOutsideBundle = fs.existsSync(bundleSetup) && fs.readFileSync(bundleSetup).includes("ai-workflow-portable")
  ? false : "not the ai-workflow-portable checkout";

function emptyFixture(t: TestContext): string {
  const root = tempFixture(deps, {});
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function installedFixture(t: TestContext): string {
  const root = emptyFixture(t);
  copyInstalledFiles(root);
  return root;
}

function copyInstalledFiles(root: string): void {
  for (const relative of fs.readFileSync(path.join(bundle, manifest)).trimEnd().split("\n")) {
    assert.ok(isStepOnePath(relative), "manifest entry must be in the Step 1 copy list");
    assert.ok(!relative.split("/").some((part) => /^(?:\.env|credentials\.json$|settings\.local\.json$)/i.test(part)));
    const source = path.join(bundle, relative);
    assert.ok(fs.lstatSync(source).isFile(), "fixture must copy a regular shipped file");
    const targets = relative.startsWith(scaffold) ? [relative, `.project/${relative.slice(scaffold.length)}`] : [relative];
    for (const target of targets) {
      const destination = path.join(root, target);
      fs.mkdirSync(path.dirname(destination));
      fs.copyFileSync(source, destination);
    }
  }
}

// SETUP.md Step 1 copies these trees and individual entry files. Cursor mirrors are
// represented by the checked-in .cursor/ paths, so tests never need to run the installer.
function isStepOnePath(relative: string): boolean {
  if (relative.split("/").some((part) => !part || part === "." || part === "..") || relative.includes("\\")) return false;
  return relative === "AGENTS.md" || relative === "CLAUDE.md"
    || ["ai-framework/", ".claude/", ".agents/", ".codex/", ".cursor/"].some((prefix) => relative.startsWith(prefix))
    || [".opencode/opencode.json", ".opencode/package.json"].includes(relative)
    || [".opencode/commands/", ".opencode/agents/", ".opencode/plugins/"].some((prefix) => relative.startsWith(prefix));
}

function addFile(root: string, relative: string, content = "fixture\n"): void {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target));
  fs.writeFileSync(target, content);
}

function snapshot(root: string): Map<string, string> {
  return new Map(listTree(deps, root).map((relative) => {
    const full = path.join(root, relative);
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) return [relative, `link ${fs.readlinkSync(full)}`];
    if (stat.isDirectory()) return [relative, `dir ${stat.mode}`];
    assert.ok(stat.isFile());
    return [relative, `file ${stat.mode} ${deps.crypto.sha256Hex(fs.readBytesSync(full))}`];
  }));
}

function assertState(root: string, state: string, overrides: RuntimeDeps = deps) {
  const result = detectProjectState(root, overrides);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.state, state, JSON.stringify(result));
  assert.ok(result.reasons.length > 0);
  assert.ok(result.reasons.every((reason) => !reason.includes(root)));
  assert.ok(result.evidence.every((relative) => !path.isAbsolute(relative)));
  return result;
}

function copySourceFolder(root: string, relative: string): void {
  const folder = path.join(root, relative);
  copyInstalledFiles(folder);
  fs.copyFileSync(bundleSetup, path.join(folder, "SETUP.md"));
  addFile(folder, ".DS_Store");
  addFile(folder, ".project/local.md");
  addFile(folder, ".00-local-data");
}

function scanFromCopy(root: string, folder: string) {
  const before = snapshot(root);
  const command = path.join(root, folder, "ai-framework/scripts/project-state.mts");
  const result = runScript(deps, command, ["--root", ".", "--json"], {
    cwd: root,
    env: { ...deps.proc.env, AI_WORKFLOW_RUNNER: deps.runtime },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(snapshot(root), before);
  return JSON.parse(result.stdout);
}

test("checks the project before copying from a renamed source folder", { skip: skipOutsideBundle }, (t) => {
  const root = emptyFixture(t);
  const folder = "workflow download";
  copySourceFolder(root, folder);
  const empty = scanFromCopy(root, folder);
  assert.equal(empty.state, "empty", JSON.stringify(empty));
  assert.deepEqual(empty.evidence, []);

  addFile(root, "README.md");
  const starter = scanFromCopy(root, folder);
  assert.equal(starter.state, "unclear");
  assert.deepEqual(starter.reasons, ["The only project files are starter files."]);
  assert.deepEqual(starter.evidence, ["README.md"]);

  addFile(root, "src/app.ts");
  const existing = scanFromCopy(root, folder);
  assert.equal(existing.state, "existing", JSON.stringify(existing));
  assert.deepEqual(existing.evidence, ["README.md", "src/app.ts"]);
});

test("only the running source copy is skipped", { skip: skipOutsideBundle }, (t) => {
  const root = emptyFixture(t);
  copySourceFolder(root, "00-running-copy");
  copySourceFolder(root, "ai-workflow-portable");
  const result = scanFromCopy(root, "00-running-copy");
  assert.equal(result.state, "unclear");
  assert.ok(result.evidence.includes("ai-workflow-portable/.00-local-data"));
  assert.ok(result.evidence.every((relative: string) => relative.startsWith("ai-workflow-portable/")));
});

test("a source copy two levels down is still scanned", { skip: skipOutsideBundle }, (t) => {
  const root = emptyFixture(t);
  const folder = "downloads/ai-workflow-portable";
  copySourceFolder(root, folder);
  const result = scanFromCopy(root, folder);
  assert.equal(result.state, "unclear");
  assert.ok(result.evidence.includes(`${folder}/.00-local-data`));
});

test("an installed copy with its own setup title is still scanned from its parent", (t) => {
  const root = emptyFixture(t);
  const folder = "ai-workflow-portable";
  copyInstalledFiles(path.join(root, folder));
  addFile(root, `${folder}/SETUP.md`, "# Set up this application\n");
  addFile(root, `${folder}/src/app.ts`);
  const result = scanFromCopy(root, folder);
  assert.equal(result.state, "unclear");
  assert.ok(result.evidence.some((relative: string) => relative.startsWith(`${folder}/`)));
});

test("a linked setup file is refused as a source marker", { skip: skipOutsideBundle }, (t) => {
  const root = emptyFixture(t);
  const folder = "ai-workflow-portable";
  copySourceFolder(root, folder);
  const setup = path.join(root, folder, "SETUP.md");
  fs.unlinkSync(setup);
  fs.symlinkSync(bundleSetup, setup);
  const result = scanFromCopy(root, folder);
  assert.equal(result.state, "unclear");
  assert.ok(result.evidence.includes(`${folder}/SETUP.md`));
});

test("untouched Step 1 install and copied scaffold are empty and byte-identical after a scan", (t) => {
  const root = installedFixture(t);
  const before = snapshot(root);
  assert.deepEqual(assertState(root, "empty").evidence, []);
  assert.deepEqual(snapshot(root), before);
});

// The fixture above is built from the shipped list, so it cannot show a file the list lacks. These come with a copied folder
// but Git ignores them: OpenCode creates its own, and the file manager adds its metadata to any folder it opens.
test("local OpenCode files and file-manager metadata in a copied folder leave a fresh install empty", (t) => {
  const root = installedFixture(t);
  for (const relative of [".opencode/package.json", ".opencode/package-lock.json", ".opencode/bun.lock", ".opencode/.gitignore",
    ".opencode/plugins/package.json", ".DS_Store", "ai-framework/.DS_Store", "ai-framework/templates/.DS_Store", ".claude/.DS_Store",
    ".claude/skills/Thumbs.db", "docs/desktop.ini"]) addFile(root, relative);
  assert.deepEqual(assertState(root, "empty").evidence, []);
});

test("those local names are exact: the same OpenCode name elsewhere is still judged", (t) => {
  const root = installedFixture(t);
  addFile(root, "package.json", "{}\n");
  assert.deepEqual(assertState(root, "existing").evidence, ["package.json"]);
  addFile(root, ".codex/package.json", "{}\n");
  assert.deepEqual(assertState(root, "unclear").evidence, [".codex/package.json", "package.json"]);
});

test("[not-actually-empty] names source and manifest evidence without changing the installation", (t) => {
  const root = installedFixture(t);
  addFile(root, "apps/web/src/index.ts", "export const app = 1;\n");
  addFile(root, "package.json", '{"private":true}\n');
  const before = snapshot(root);
  assert.deepEqual(assertState(root, "existing").evidence, ["apps/web/src/index.ts", "package.json"]);
  assert.deepEqual(snapshot(root), before);
});

for (const [description, relative] of [
  ["nested monorepo code", "packages/service/src/index.ts"],
  ["SQL only", "db/migrations/001.sql"],
  ["notebook only", "analysis/model.ipynb"],
  ["infrastructure only", "deploy/Dockerfile"],
  ["a Kubernetes deployment only", "deploy/deployment.yaml"],
  ["documents only", "docs/README.md"],
  ["a nested license only", "docs/LICENSE"],
  ["a nested ignore file only", "app/.gitignore"],
  ["a root name that only ends like a starter file", "OLDREADME.md"],
  ["manifest only", "package.json"],
  ["a copy of a shipped basename elsewhere", "docs/AGENTS.md"],
]) {
  test(`a real install with ${description} is existing`, (t) => {
    const root = installedFixture(t);
    addFile(root, relative);
    assert.deepEqual(assertState(root, "existing").evidence, [relative]);
  });
}

for (const [description, relative] of [
  ["an unknown harness skill", ".claude/skills/local/SKILL.md"],
  ["a shipped basename at the wrong harness path", ".codex/extra/hooks.json"],
  ["a project file outside the scaffold", ".project/context/local.md"],
  ["an unclassifiable extensionless file", "local-data"],
]) {
  test(`a real install with ${description} is unclear`, (t) => {
    const root = installedFixture(t);
    addFile(root, relative);
    assert.deepEqual(assertState(root, "unclear").evidence, [relative]);
  });
}

for (const files of [
  ["README.md"],
  ["LICENSE"],
  [".gitignore"],
  [".gitignore", "LICENSE", "README.md"],
  ["Readme.txt", "licence.md"],
  [".GITIGNORE", "LICENCE.txt", "LICENSE.md", "README"],
]) {
  test(`reports unclear with only root starter files (${files.join(", ")})`, (t) => {
    const root = installedFixture(t);
    for (const relative of files) addFile(root, relative);
    const result = assertState(root, "unclear");
    assert.deepEqual(result.evidence, files);
    assert.deepEqual(result.reasons, ["The only project files are starter files."]);
  });
}

test("reports existing with a root starter file and source code", (t) => {
  const root = installedFixture(t);
  addFile(root, "README.md");
  addFile(root, "src/app.ts");
  assert.deepEqual(assertState(root, "existing").evidence, ["README.md", "src/app.ts"]);
});

for (const relative of [".gitattributes", "CHANGELOG.md", "COPYING", "README.rst"]) {
  test(`reports existing with ${relative} alone or beside a starter file`, (t) => {
    const root = installedFixture(t);
    addFile(root, relative);
    assert.deepEqual(assertState(root, "existing").evidence, [relative]);
    addFile(root, "README.md");
    assert.deepEqual(assertState(root, "existing").evidence, [relative, "README.md"].sort());
  });
}

test("reports the scan refusal when a starter file is beside an unrecognized file", (t) => {
  const root = installedFixture(t);
  addFile(root, "README.md");
  addFile(root, "local-data");
  const result = assertState(root, "unclear");
  assert.deepEqual(result.evidence, ["local-data", "README.md"]);
  assert.deepEqual(result.reasons, ["Found an unrecognized project file."]);
});

test("a symlink stays unclear, including when it occupies a shipped path", (t) => {
  const root = installedFixture(t);
  fs.unlinkSync(path.join(root, "CLAUDE.md"));
  fs.symlinkSync(path.join(root, "AGENTS.md"), path.join(root, "CLAUDE.md"));
  assert.deepEqual(assertState(root, "unclear").evidence, ["CLAUDE.md"]);
});

test("a symlink at a skipped directory path stays unclear", (t) => {
  const root = installedFixture(t);
  fs.symlinkSync(path.join(root, "ai-framework"), path.join(root, ".git"));
  assert.deepEqual(assertState(root, "unclear").evidence, [".git"]);
});

const INJECT_MUTATION = deps.proc.env.PROJECT_STATE_TEST_MUTANT === "1";

async function failOpenMutant(): Promise<typeof detectProjectState> {
  const source = fs.readFileSync(script);
  const guard = "if (scan.issues.length > 0)";
  assert.equal(source.split(guard).length, 2, "mutation must remove exactly one final guard");
  const scriptUrl = new URL("./project-state.mts", import.meta.url);
  const modified = source.replace(guard, "if (false)")
    .replaceAll("import.meta.url", JSON.stringify(scriptUrl.href))
    .replaceAll("import.meta.filename", JSON.stringify(script))
    .replace(/from "(\.\/[^"]+)"/g, (_match, relative: string) => `from "${new URL(relative, scriptUrl).href}"`);
  const loaded = await import(`data:text/javascript;base64,${Buffer.from(stripTypes(modified)).toString("base64")}`);
  return loaded.detectProjectState;
}

test("fail-closed: a refused directory stays unclear and preserves known evidence", async (t) => {
  const root = installedFixture(t);
  const denied = path.join(root, "z-private");
  fs.mkdirSync(denied);
  addFile(root, "src/app.ts");
  const scanDeps = {
    ...deps,
    fs: {
      ...fs,
      readdirSync(file: string) {
        if (file === denied) throw Object.assign(new Error(`could not read ${denied}`), { code: "EACCES" });
        return fs.readdirSync(file);
      },
    },
  };
  const detect = INJECT_MUTATION ? await failOpenMutant() : detectProjectState;
  const result = detect(root, scanDeps);
  assert.equal(result.state, "unclear");
  assert.deepEqual(result.evidence, ["z-private", "src/app.ts"]);
  assert.ok(result.reasons.some((reason) => reason.includes("EACCES")));
  assert.ok(!JSON.stringify(result).includes(denied));
});

test("a directory without read or search permission is unclear", { skip: deps.proc.platform === "win32" }, (t) => {
  const root = installedFixture(t);
  const denied = path.join(root, "private");
  fs.mkdirSync(denied, { mode: 0 });
  try {
    assert.deepEqual(assertState(root, "unclear").evidence, ["private"]);
  } finally {
    fs.chmodSync(denied, 0o700);
  }
});

test("an entry budget overrun is unclear even after finding source", (t) => {
  const root = installedFixture(t);
  addFile(root, "app.ts");
  fs.mkdirSync(path.join(root, "z-wide"));
  // Use the real scanned tree and inject the costly listing at the adapter boundary.
  const scanDeps = {
    ...deps,
    fs: {
      ...fs,
      readdirSync(file: string) {
        return file === path.join(root, "z-wide")
          ? Array.from({ length: MAX_SCAN_ENTRIES + 1 }, (_, index) => `entry-${index}`)
          : fs.readdirSync(file);
      },
      lstatSync(file: string) {
        assert.notEqual(path.dirname(file), path.join(root, "z-wide"), "must stop before inspecting an over-budget listing");
        return fs.lstatSync(file);
      },
    },
  };
  const result = assertState(root, "unclear", scanDeps);
  assert.deepEqual(result.evidence, ["z-wide", "app.ts"]);
  assert.ok(result.reasons.some((reason) => /budget/i.test(reason)));
});

test("a depth budget overrun is unclear", (t) => {
  const root = installedFixture(t);
  addFile(root, `${"d/".repeat(MAX_SCAN_DEPTH + 1)}app.ts`);
  const result = assertState(root, "unclear");
  assert.ok(result.reasons.some((reason) => /depth/i.test(reason)));
});

test("a regular draft wins before the shipped list or project scan is read", (t) => {
  const root = installedFixture(t);
  addFile(root, draft, "contents are irrelevant in part A\n");
  addFile(root, "src/app.ts");
  const refused = () => assert.fail("draft probe must use metadata only");
  const scanDeps = { ...deps, fs: { ...fs, openSync: refused, readdirSync: refused, readFileSync: refused } };
  assert.deepEqual(assertState(root, "resume", scanDeps).evidence, [draft]);
});

for (const kind of ["directory", "symlink", "symlinked ancestor"]) {
  test(`a draft with a ${kind} is unclear`, (t) => {
    const root = installedFixture(t);
    const leaf = path.join(root, draft);
    if (kind === "directory") fs.mkdirSync(leaf);
    if (kind === "symlink") {
      fs.mkdirSync(path.dirname(leaf));
      fs.symlinkSync(path.join(root, "AGENTS.md"), leaf);
    }
    if (kind === "symlinked ancestor") {
      addFile(root, `elsewhere/${path.basename(leaf)}`);
      fs.symlinkSync(path.join(root, "elsewhere"), path.dirname(leaf));
    }
    const result = assertState(root, "unclear");
    assert.ok(result.evidence.includes(draft));
  });
}

test("only exact workflow config, harness local settings, root litter and two owned directories are ignored", (t) => {
  const root = installedFixture(t);
  for (const relative of [
    ".claude/settings.local.json", "ai-workflow.toon", ".DS_Store", "Thumbs.db",
    ".git/refs/heads/demo", ".opencode/node_modules/application/index.js",
  ]) addFile(root, relative);
  assertState(root, "empty");
  addFile(root, "other/settings.local.json");
  assertState(root, "unclear");
});

test("production scans never open target file content or spawn a process", (t) => {
  const root = installedFixture(t);
  for (const relative of [".envrc", "service/.env.prod", "credentials.json", "src/app.ts"]) addFile(root, relative);
  const refused = () => assert.fail("project file read, filesystem mutation or process creation attempted");
  const scanDeps = {
    ...deps,
    fs: {
      ...fs,
      openSync(file: string, flags: string | number) {
        assert.equal(file, path.join(fs.realpathSync(bundle), manifest));
        assert.equal(flags, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0));
        return fs.openSync(file, flags);
      },
      readFileSync: refused,
      readBytesSync: refused,
      readFile: refused,
      writeFileSync: refused,
      writeFile: refused,
      mkdirSync: refused,
      rmSync: refused,
    },
    child: { run: refused, runSync: refused, runBytesSync: refused },
  };
  assert.ok(assertState(root, "unclear", scanDeps).evidence.includes("src/app.ts"));
});

test("a project cannot override the shipped list beside the running detector", (t) => {
  const root = installedFixture(t);
  addFile(root, manifest, "src/app.ts\n");
  addFile(root, "src/app.ts");
  assert.deepEqual(assertState(root, "existing").evidence, ["src/app.ts"]);
});

test("a directory that changes during listing cannot produce empty", (t) => {
  const root = installedFixture(t);
  const dir = path.join(root, "app");
  const replacement = path.join(root, "replacement");
  fs.mkdirSync(dir);
  fs.mkdirSync(replacement);
  const scanDeps = {
    ...deps,
    fs: {
      ...fs,
      readdirSync(file: string) {
        const entries = fs.readdirSync(file);
        if (file === dir) {
          fs.rmdirSync(dir);
          fs.renameSync(replacement, dir);
        }
        return entries;
      },
    },
  };
  assert.ok(assertState(root, "unclear", scanDeps).evidence.includes("app"));
});

test("special entries remain unclear without opening them", (t) => {
  const root = installedFixture(t);
  addFile(root, "special.ts");
  const scanDeps = {
    ...deps,
    fs: {
      ...fs,
      lstatSync(file: string) {
        const info = fs.lstatSync(file);
        return file === path.join(root, "special.ts")
          ? { ...info, isFile: () => false, isDirectory: () => false, isSymbolicLink: () => false }
          : info;
      },
    },
  };
  assert.deepEqual(assertState(root, "unclear", scanDeps).evidence, ["special.ts"]);
});

test("evidence is capped, stripped of controls and length-bounded", (t) => {
  const root = installedFixture(t);
  const longName = `${"z".repeat(210)}\u202e.ts`;
  const longPath = `src/${"a".repeat(120)}/${longName}`;
  addFile(root, longPath);
  let result = assertState(root, "existing");
  assert.equal(result.evidence.length, 1);
  assert.ok(result.evidence[0].length < longPath.length);
  assert.ok(!result.evidence[0].includes("\u202e"));
  if (deps.proc.platform !== "win32") {
    addFile(root, "src/odd\x1b\nname.ts");
    result = assertState(root, "existing");
    assert.ok(result.evidence.includes("src/oddname.ts"));
  }
  for (let index = 0; index < 100; index++) addFile(root, `src/item-${index}.ts`);
  result = assertState(root, "existing");
  assert.ok(result.evidence.length < 100);
  assert.ok(result.reasons.some((reason) => /capped/i.test(reason)));
});

test("main writes a single JSON object for every state and defaults to the working directory", (t) => {
  const root = installedFixture(t);
  const run = (state: string, args: string[]) => {
    const io = captureIo({ ...deps, proc: { ...deps.proc, cwd: () => root } });
    assert.equal(main(args, io), 0);
    assert.equal(io.out.length, 1);
    assert.equal(io.err.length, 0);
    const result = JSON.parse(io.out.join(""));
    assert.deepEqual(Object.keys(result).sort(), ["evidence", "reasons", "schemaVersion", "state"]);
    assert.equal(result.state, state);
  };
  run("empty", ["--json"]);
  addFile(root, "package.json");
  run("existing", ["--root", root, "--json"]);
  addFile(root, ".agents/local.md");
  run("unclear", ["--json", "--root", root]);
  addFile(root, draft);
  run("resume", ["--json"]);
});

test("main handles usage errors and prints a short human form", (t) => {
  const root = installedFixture(t);
  for (const args of [["--root"], ["--root", "--json"], ["--unknown"], ["--json", "--json"], ["--root", ""]]) {
    const io = captureIo(deps);
    assert.equal(main(args, io), 2);
    assert.equal(io.out.length, 0);
    assert.match(io.err.join(""), /usage/i);
  }
  const io = captureIo(deps);
  assert.equal(main(["--root", root], io), 0);
  assert.match(io.out.join(""), /empty/);
});

test("direct entry reports a state, and an invalid runner setting is refused like in every script", (t) => {
  const root = installedFixture(t);
  const installedScript = path.join(root, "ai-framework/scripts/project-state.mts");
  const result = runScript(deps, installedScript, ["--root", root, "--json"], {
    cwd: root,
    env: { ...deps.proc.env, AI_WORKFLOW_RUNNER: deps.runtime },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).state, "empty");
  assert.equal(result.stderr, "");
  const invalidRunner = deps.child.runSync(deps.proc.execPath,
    [...(deps.runtime === "node" ? ["--experimental-strip-types", "--disable-warning=ExperimentalWarning"] : []), script, "--root", root, "--json"],
    { cwd: root, env: { ...deps.proc.env, AI_WORKFLOW_RUNNER: "invalid-runner" } });
  assert.equal(invalidRunner.status, 1);
  assert.equal(invalidRunner.stdout, "");
  assert.match(invalidRunner.stderr, /AI_WORKFLOW_RUNNER must be "bun" or unset/);
});

for (const [description, relative] of [["a project file", "src/locked.ts"], ["a shipped file", "AGENTS.md"]]) {
  test(`an unreadable regular file (${description}) is unclear, not judged by its name`, { skip: deps.proc.platform === "win32" }, (t) => {
    const root = installedFixture(t);
    const locked = path.join(root, relative);
    if (!fs.existsSync(locked)) addFile(root, relative);
    fs.chmodSync(locked, 0o000);
    try {
      assert.deepEqual(assertState(root, "unclear").evidence, [relative]);
    } finally { fs.chmodSync(locked, 0o644); }
  });
}

// Permission bits can say "readable" while this user still cannot read the file (another class holds the bit, or an ACL denies it).
test("a file the access check refuses is unclear even when its permission bits allow reading", (t) => {
  const root = installedFixture(t);
  addFile(root, "angular.json", "{}\n");
  const denied = path.join(root, "angular.json");
  const scanDeps = { ...deps, fs: { ...fs, accessSync(file: string, mode?: number) {
    // A missing constant would silently turn this into an existence check.
    assert.equal(mode, 4, "the check must ask for read access (R_OK)");
    if (file === denied) throw Object.assign(new Error(`denied ${denied}`), { code: "EACCES" });
    fs.accessSync(file, mode);
  } } };
  const result = assertState(root, "unclear", scanDeps);
  assert.deepEqual(result.evidence, ["angular.json"]);
  assert.ok(result.reasons.includes("Found an unreadable file (EACCES)."));
});

test("capped evidence keeps the paths that caused unclear ahead of ordinary project files", (t) => {
  const root = installedFixture(t);
  for (let index = 0; index < 40; index++) addFile(root, `app-${String(index).padStart(2, "0")}.ts`);
  addFile(root, "zz/local-data");
  const result = assertState(root, "unclear");
  assert.equal(result.evidence.length, 32);
  assert.equal(result.evidence[0], "zz/local-data");
  assert.ok(result.reasons.some((reason) => reason.startsWith("Evidence capped")));
});

for (const relative of ["angular.json", "windows/app.vcxproj"]) {
  test(`a project with only ${relative} is existing`, (t) => {
    const root = installedFixture(t);
    addFile(root, relative);
    assert.deepEqual(assertState(root, "existing").evidence, [relative]);
  });
}

test("secret-style names with a project extension never count as project files", (t) => {
  const root = installedFixture(t);
  addFile(root, ".env.yaml");
  assertState(root, "unclear");
});

test("the shipped manifest matches Git", { skip: skipOutsideBundle }, () => {
  const result = deps.child.runSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--",
    "ai-framework/", ".claude/", ".agents/", ".codex/", ".cursor/", ".opencode/", "AGENTS.md", "CLAUDE.md"], { cwd: bundle });
  assert.equal(result.status, 0, "cannot list shipped paths from Git");
  const files = new Set(result.stdout.split("\0").filter(isStepOnePath));
  const destination = path.join(bundle, manifest);
  const update = deps.proc.env.UPDATE_SHIPPED_FILES === "1";
  // An explicit regeneration can create the manifest if it does not exist yet.
  if (update && !fs.existsSync(destination)) files.add(manifest);
  const expected = `${[...files].sort().join("\n")}\n`;
  if (update) {
    fs.writeFileSync(destination, expected);
  } else {
    assert.equal(fs.readFileSync(destination), expected, "regenerate via UPDATE_SHIPPED_FILES=1 and the manifest test");
  }
});
