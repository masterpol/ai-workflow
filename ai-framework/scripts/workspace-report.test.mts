import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { createTestDeps } from "./runtime/test-helpers.mts";
import type { RuntimeDeps } from "./runtime/types.mts";
import { main, workspaceReport } from "./workspace-report.mts";

const base = createTestDeps();
const { fs, path, proc } = base;
const gitEnv = {
  PATH: proc.env.PATH,
  HOME: proc.env.HOME,
  SystemRoot: proc.env.SystemRoot,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
};

function temp(t: TestContext): string {
  const root = fs.mkdtempSync(path.join(base.os.tmpdir(), "workspace-report-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return fs.realpathSync(root);
}

function git(root: string, ...args: string[]) {
  return base.child.runSync("git", ["-C", root, "-c", "core.excludesFile=/dev/null", ...args], { env: gitEnv, timeoutMs: 10_000 });
}

function gitOk(root: string, ...args: string[]) {
  const result = git(root, ...args);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function repo(t: TestContext) {
  const root = temp(t);
  gitOk(root, "init", "-q");
  return root;
}

function write(root: string, name: string, value: string) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file));
  fs.writeFileSync(file, value);
}

function capture(root: string, deps: RuntimeDeps = base, json = false) {
  let stdout = "", stderr = "";
  const io = {
    ...deps.io,
    stdout: { isTTY: false, write: (value: string) => { stdout += value; } },
    stderr: { isTTY: false, write: (value: string) => { stderr += value; } },
  };
  const exit = main(["--root", root, ...(json ? ["--json"] : [])], { ...deps, io });
  return { exit, stdout, stderr };
}

function complete(files: number, bytes: number) {
  return { files, bytes, status: "complete" };
}

function partial(files: number, bytes: number) {
  return { files, bytes, status: "incomplete" };
}

function area(report: ReturnType<typeof workspaceReport>, label: string) {
  const result = report.areas.find((row) => row.label === label);
  assert.ok(result, `missing ${label}`);
  return result;
}

test("reports exact per-area and project totals, including ignored and missing tracked files", (t) => {
  const root = repo(t);
  write(root, ".gitignore", ".project/skills/packages/\n");
  write(root, ".project/knowledge/a.md", "é");
  write(root, ".project/knowledge/sub/missing.md", "no longer on disk");
  write(root, ".project/skills/registry.json", "yes");
  write(root, ".project/skills/packages/example/doc", "four");
  write(root, ".project/status.md", "status");
  write(root, "graphify-out/graph.json", "seven!!");
  write(root, "ai-framework/bundle", "bundle");
  write(root, ".codex/hook", "5byte");
  write(root, "app/source", "ignored by scope");
  gitOk(root, "add", ".");
  fs.unlinkSync(path.join(root, ".project/knowledge/sub/missing.md"));
  write(root, ".project/evals/local.json", "local");
  const report = workspaceReport(root, base);
  // One tracked file was deleted: its size is unknown, so the tracked figures are not complete.
  assert.deepEqual(report.project, { disk: complete(5, 20), tracked: partial(4, 11) });
  for (const [label, disk, tracked] of [
    ["Knowledge", complete(1, 2), partial(2, 2)],
    ["Status", complete(1, 6), complete(1, 6)],
    ["Skill registry", complete(1, 3), complete(1, 3)],
    ["Skill packages", complete(1, 4), complete(0, 0)],
    ["Evals", complete(1, 5), complete(0, 0)],
    ["Knowledge graph", complete(1, 7), complete(1, 7)],
    ["Workflow bundle", complete(1, 6), complete(1, 6)],
    [".codex", complete(1, 5), complete(1, 5)],
  ] as const) {
    assert.deepEqual([area(report, label).disk, area(report, label).tracked], [disk, tracked], label);
  }
  assert.deepEqual(report.warnings, []);
  assert.match(report.scope, /Application code is outside/);
  gitOk(root, "add", "-f", ".project/skills/packages/example/doc");
  assert.equal(workspaceReport(root, base).warnings.length, 1);
});

test("labels unknown directories safely and never emits filenames or contents", (t) => {
  const root = temp(t);
  const hostile = `weird\n\r\x1b[2J\u202e\u2028${"x".repeat(120)}`;
  write(root, `.project/${hostile}/private-file-name`, "hidden value");
  write(root, ".project/.env.example", "placeholder");
  write(root, ".project/knowledge/credentials.json", "{}");
  const reads: unknown[] = [];
  const refuse = (...args: unknown[]) => { reads.push(args[0]); throw new Error("report attempted a file read"); };
  const deps = { ...base, fs: {
    ...fs, readFileSync: refuse, readBytesSync: refuse, readFile: refuse, openSync: refuse, readSync: refuse,
  } };
  const text = capture(root, deps);
  const json = capture(root, deps, true);
  for (const result of [text, json]) {
    assert.equal(result.exit, 0, result.stderr);
    assert.match(result.stdout, /Folder weird\?\?\?\?2J\?\?x+…/);
    assert.doesNotMatch(result.stdout, /private-file-name|credentials\.json|\.env|hidden value|\x1b|\u202e|\u2028|safe to (?:delete|remove)/);
    assert.match(result.stdout, /ask before removing/);
  }
  assert.deepEqual(reads, [], "no file was opened, even by code that would swallow the error");
  const report = JSON.parse(json.stdout);
  assert.deepEqual(report.project.disk, complete(3, 25));
  const unknown = report.areas.find((row: { label: string }) => row.label.startsWith("Folder weird"));
  assert.equal(unknown.kind, "unrecognised");
  assert.equal(unknown.label.length, "Folder ".length + 81);
});

test("counts symlinked files, folders and scan roots without following them or their children", { skip: path.sep === "\\" }, (t) => {
  const root = repo(t), outside = temp(t);
  write(outside, "external", "external contents");
  write(outside, "packages/should-not-scan", "large outside package");
  write(root, ".project/knowledge/plain", "hello");
  const links = [
    [path.join(outside, "external"), ".project/knowledge/file-link"],
    [outside, ".project/knowledge/folder-link"],
    [outside, ".project/skills"],
    [outside, "graphify-out"],
  ];
  for (const [target, relative] of links) fs.symlinkSync(target, path.join(root, relative));
  gitOk(root, "add", ".");
  const report = workspaceReport(root, base);
  const linkBytes = (relative: string) => fs.lstatSync(path.join(root, relative)).size;
  const knowledge = complete(3, 5 + linkBytes(links[0][1]) + linkBytes(links[1][1]));
  assert.deepEqual(area(report, "Knowledge").disk, knowledge);
  assert.deepEqual(area(report, "Knowledge").tracked, knowledge);
  assert.deepEqual(area(report, "Skill registry").disk, complete(1, linkBytes(".project/skills")));
  assert.deepEqual(area(report, "Skill packages").disk, complete(0, 0));
  assert.deepEqual(area(report, "Knowledge graph").disk, complete(1, linkBytes("graphify-out")));
  const second = temp(t);
  fs.symlinkSync(outside, path.join(second, ".project"));
  assert.deepEqual(workspaceReport(second, base).project.disk, complete(1, fs.lstatSync(path.join(second, ".project")).size));
  assert.equal(capture(path.join(second, ".project")).exit, 1);
  assert.equal(capture(path.join(second, ".project", "packages")).exit, 1);
});

test("refuses a directory whose resolved location changed between metadata and listing", (t) => {
  const root = temp(t), outside = temp(t);
  write(root, ".project/knowledge/note", "note");
  const directory = path.join(root, ".project/knowledge");
  const deps = { ...base, fs: {
    ...fs, realpathSync: (name: string) => name === directory ? outside : fs.realpathSync(name),
  } };
  const report = workspaceReport(root, deps);
  assert.deepEqual(area(report, "Knowledge").disk, { files: 0, bytes: 0, status: "incomplete" });
});

test("stops at the depth bound and marks partial results incomplete", (t) => {
  const root = temp(t);
  write(root, `.project/knowledge/${"a/".repeat(38)}inside`, "1");
  write(root, `.project/knowledge/${"a/".repeat(39)}outside`, "2");
  const report = workspaceReport(root, base);
  assert.deepEqual(area(report, "Knowledge").disk, { files: 1, bytes: 1, status: "incomplete" });
  assert.equal(report.project.disk.status, "incomplete");
});

test("caps metadata visits at 200,000 even in a wide directory", (t) => {
  const root = temp(t);
  write(root, ".project/knowledge/file", "a");
  const dir = path.join(root, ".project/knowledge");
  const stat = fs.lstatSync(path.join(dir, "file"));
  let lstatCalls = 0, listed = 0;
  const names = Array<string>(200_000);
  names[Symbol.iterator] = function* () {
    for (let i = 0; i < names.length; i++) {
      listed++;
      yield "file";
    }
  };
  const deps = { ...createTestDeps({ PATH: "" }), fs: {
    ...fs,
    readdirSync: (name: string) => name === dir ? names : fs.readdirSync(name),
    lstatSync: (name: string) => {
      if (name !== path.join(dir, "file")) return fs.lstatSync(name);
      lstatCalls++;
      return stat;
    },
  } };
  const report = workspaceReport(root, deps);
  assert.equal(lstatCalls, 199_998);
  assert.equal(listed, 199_999);
  assert.deepEqual(area(report, "Knowledge").disk, { files: 199_998, bytes: 199_998, status: "incomplete" });
  assert.equal(area(report, "Workflow bundle").disk.status, "incomplete");
});

test("unreadable areas have incomplete disk and tracked figures without leaking error text", (t) => {
  const root = repo(t);
  write(root, ".project/knowledge/note", "contents");
  gitOk(root, "add", ".");
  const directory = path.join(root, ".project/knowledge");
  const deps = { ...base, fs: {
    ...fs, readdirSync: (name: string) => {
      if (name === directory) throw new Error("sensitive error details");
      return fs.readdirSync(name);
    },
  } };
  const report = workspaceReport(root, deps);
  assert.deepEqual(area(report, "Knowledge").disk, { files: 0, bytes: 0, status: "incomplete" });
  assert.deepEqual(area(report, "Knowledge").tracked, { files: 1, bytes: 0, status: "incomplete" });
  const result = capture(root, deps);
  assert.equal(result.exit, 0);
  assert.match(result.stdout, /incomplete/);
  assert.doesNotMatch(result.stdout + result.stderr, /sensitive error details/);
});

test("cannot trust failed, truncated or redirected Git listings", (t) => {
  const root = repo(t);
  write(root, ".project/status.md", "status");
  const other = temp(t);
  for (const result of [
    { status: 1, stdout: ".project/status.md\0" },
    { errorCode: "ETIMEDOUT", status: 0, stdout: ".project/status.md\0" },
    { errorCode: "ENOBUFS", status: 0, stdout: ".project/status.md\0" },
    { signal: "SIGKILL", status: 0, stdout: ".project/status.md\0" },
    { status: 0, stdout: ".project/status.md" },
    new Error("private Git failure"),
  ]) {
    const deps = { ...base, child: {
      ...base.child, runSync(command: string, args: string[], options?: Parameters<RuntimeDeps["child"]["runSync"]>[2]) {
        if (!args.includes("ls-files")) return base.child.runSync(command, args, options);
        if (result instanceof Error) throw result;
        return { signal: null, stderr: "private Git failure", ...result };
      },
    } };
    const report = workspaceReport(root, deps);
    assert.deepEqual(report.project.disk, complete(1, 6));
    assert.equal(report.project.tracked, "unknown");
    for (const json of [false, true]) {
      const printed = capture(root, deps, json);
      assert.equal(printed.exit, 0);
      assert.doesNotMatch(printed.stdout + printed.stderr, /private Git failure/);
    }
  }
  assert.equal(workspaceReport(other, base).project.tracked, "unknown");
  assert.equal(workspaceReport(path.join(root, ".project"), base).project.tracked, "unknown");
  const deps = { ...base, child: {
    ...base.child, runSync: (_command: string, args: string[]) => ({
      status: 0, signal: null, stderr: "",
      stdout: args.includes("rev-parse") ? `${path.relative(proc.cwd(), root)}\n` : ".project/status.md\0",
    }),
  } };
  assert.equal(workspaceReport(root, deps).project.tracked, "unknown", "Git must return an absolute root");
});

test("Git receives only allowed commands, filtered search paths, a fresh environment and subprocess bounds", { skip: path.sep === "\\" }, (t) => {
  const root = repo(t), outside = temp(t);
  const inProject = path.join(root, "bin");
  const inProjectAlias = path.join(outside, "alias-in");
  const outOfProjectAlias = path.join(root, "alias-out");
  const splitTarget = path.join(outside, "part:relative");
  const splitAlias = path.join(outside, "alias-split");
  fs.mkdirSync(inProject);
  fs.mkdirSync(splitTarget);
  fs.symlinkSync(inProject, inProjectAlias);
  fs.symlinkSync(outside, outOfProjectAlias);
  fs.symlinkSync(splitTarget, splitAlias);
  const deps = createTestDeps({
    ...proc.env,
    PATH: ["", ".", "relative", inProject, inProjectAlias, outOfProjectAlias, splitAlias, proc.env.PATH].join(path.delimiter),
    GIT_DIR: path.join(outside, ".git"),
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "core.fsmonitor",
    GIT_CONFIG_VALUE_0: "hostile",
    GIT_TRACE: "1",
  });
  const resolvedPaths: string[] = [];
  deps.fs = { ...fs, realpathSync: (name) => {
    resolvedPaths.push(name);
    return fs.realpathSync(name);
  } };
  const calls: string[][] = [];
  const run = deps.child.runSync;
  deps.child.runSync = (command, args, options) => {
    calls.push(args.slice(6));
    assert.ok(path.isAbsolute(command));
    assert.deepEqual(args.slice(0, 6), ["-C", root, "-c", "core.fsmonitor=false", "-c", "core.hooksPath=/dev/null"]);
    assert.equal(options?.timeoutMs, 20_000);
    assert.equal(options?.maxBufferBytes, 16 * 1024 * 1024);
    const env = options?.env;
    assert.ok(env);
    assert.deepEqual(Object.keys(env).sort(), [
      "GIT_CONFIG_GLOBAL", "GIT_CONFIG_NOSYSTEM", "GIT_OPTIONAL_LOCKS", "GIT_NO_LAZY_FETCH",
      "GIT_TERMINAL_PROMPT", "HOME", "PATH", "SystemRoot",
    ].filter((key) => !["HOME", "SystemRoot"].includes(key) || deps.proc.env[key] !== undefined).sort());
    assert.deepEqual([env.GIT_CONFIG_GLOBAL, env.GIT_CONFIG_NOSYSTEM, env.GIT_OPTIONAL_LOCKS, env.GIT_NO_LAZY_FETCH, env.GIT_TERMINAL_PROMPT],
      ["/dev/null", "1", "0", "1", "0"]);
    const search = env.PATH!.split(path.delimiter);
    assert.ok(search.every(path.isAbsolute));
    for (const name of [inProject, inProjectAlias, outOfProjectAlias, outside, splitTarget]) assert.ok(!search.includes(name), name);
    return run(command, args, options);
  };
  assert.deepEqual(workspaceReport(root, deps).project.tracked, complete(0, 0));
  assert.deepEqual(calls, [
    ["rev-parse", "--show-toplevel"],
    ["rev-parse", "--git-dir"],
    ["ls-files", "-z", "--", ".project", "graphify-out", "ai-framework", ".claude", ".agents", ".cursor", ".opencode", ".codex"],
  ]);
  assert.ok(resolvedPaths.every(path.isAbsolute));
});

test("an empty or unsafe executable search never launches project Git", { skip: path.sep === "\\" }, (t) => {
  const root = temp(t), outside = temp(t);
  const fake = path.join(root, "git");
  write(root, "git", "#!/bin/sh\nexit 0\n");
  fs.chmodSync(fake, 0o755);
  fs.symlinkSync(fake, path.join(outside, "git"));
  const nonExecutable = temp(t), directory = temp(t);
  write(nonExecutable, "git", "not executable");
  fs.chmodSync(path.join(nonExecutable, "git"), 0o644);
  fs.mkdirSync(path.join(directory, "git"));
  for (const search of ["", ".", root, outside, nonExecutable, directory]) {
    const deps = createTestDeps({ PATH: search });
    let calls = 0;
    deps.child.runSync = () => {
      calls++;
      return { status: 0, stdout: `${root}\n`, stderr: "", signal: null };
    };
    assert.equal(workspaceReport(root, deps).project.tracked, "unknown");
    assert.equal(calls, 0);
  }
});

function shellQuote(value: string) {
  return "'" + value.replaceAll("'", "'\\''") + "'";
}

function marker(t: TestContext, directory: string, programName = "marker-program") {
  const output = path.join(temp(t), "program-ran");
  const program = path.join(directory, programName);
  write(directory, programName, `#!/bin/sh\n: > ${shellQuote(output)}\nexit 0\n`);
  fs.chmodSync(program, 0o755);
  return { program, fired: () => fs.existsSync(output) };
}

test("Git fsmonitor never runs for the report, and runs for plain Git", { skip: path.sep === "\\" }, (t) => {
  const root = repo(t);
  write(root, ".project/status.md", "status");
  gitOk(root, "add", ".");
  const { program, fired } = marker(t, root);
  gitOk(root, "config", "core.fsmonitor", shellQuote(program));
  assert.deepEqual(workspaceReport(root, base).project.tracked, complete(1, 6));
  assert.equal(fired(), false);
  gitOk(root, "ls-files", "-z");
  assert.equal(fired(), true, "plain Git must actually invoke the marker");
});

test("report leaves a configured filter process and file hook idle, with positive controls", { skip: path.sep === "\\" }, (t) => {
  const root = repo(t);
  write(root, ".project/status.md", "status");
  gitOk(root, "add", ".");
  const filter = marker(t, root, "filter-marker");
  const hook = marker(t, path.join(root, ".git/hooks"), "pre-commit");
  write(root, ".gitattributes", ".project/status.md filter=marker\n");
  write(root, ".project/status.md", "changed");
  gitOk(root, "config", "filter.marker.process", shellQuote(filter.program));
  assert.deepEqual(workspaceReport(root, base).project.tracked, complete(1, 7));
  assert.equal(filter.fired(), false);
  assert.equal(hook.fired(), false);
  git(root, "add", ".project/status.md");
  assert.equal(filter.fired(), true);
  gitOk(root, "hook", "run", "pre-commit");
  assert.equal(hook.fired(), true);
});

test("read-only scan preserves files, modification and change times, and the index", (t) => {
  const root = repo(t);
  write(root, ".project/knowledge/first", "tracked");
  gitOk(root, "add", ".");
  write(root, ".project/knowledge/second", "local");
  const snapshot = () => {
    const contents: Record<string, unknown> = {};
    function walk(relative: string) {
      const full = path.join(root, relative);
      const stat = fs.lstatSync(full);
      // Check ctime too: a write followed by a restore of mtime would still change ctime.
      const changeTime = (stat as typeof stat & { ctimeMs: number }).ctimeMs;
      contents[relative] = [stat.mtimeMs, changeTime, stat.mode, stat.ino, stat.isFile() ? fs.readBytesSync(full) : null];
      if (stat.isDirectory()) for (const name of fs.readdirSync(full)) walk(path.join(relative, name));
    }
    walk(".");
    return contents;
  };
  const before = snapshot();
  assert.equal(capture(root, base, true).exit, 0);
  assert.deepEqual(snapshot(), before);
});

test("reports fixed CLI errors without echoing user paths", (t) => {
  const root = temp(t);
  const result = capture(path.join(root, "private-missing-dir"));
  assert.deepEqual(result, { exit: 1, stdout: "", stderr: "workspace-report: unable to report on workspace\n" });
});

test("areas that nothing can act on yet say so, and no next step names an unbuilt pitch", (t: TestContext) => {
  const report = workspaceReport(temp(t), base);
  for (const label of ["Runs", "Records", "Compaction", "Evals", "Metrics", "Reports", "Analysis"]) {
    assert.equal(report.areas.find((area) => area.label === label)?.nextStep, "no supported action yet", label);
  }
  assert.ok(report.areas.every((area) => !/workspace-recovery|safe to (delete|remove)/i.test(area.nextStep)));
});

test("a root below the repository top cannot take git from anywhere in that repository", { skip: path.sep === "\\" }, (t) => {
  const root = repo(t), marker = path.join(temp(t), "ran");
  write(root, "sub/.project/status.md", "s");
  const bin = path.join(root, "tools-bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "git"), `#!/bin/sh\n: > "${marker}"\nexit 1\n`);
  fs.chmodSync(path.join(bin, "git"), 0o755);
  workspaceReport(path.join(root, "sub"), createTestDeps({ ...proc.env, PATH: `${bin}${path.delimiter}${proc.env.PATH}` }));
  assert.equal(fs.existsSync(marker), false);
  base.child.runSync("git", ["--version"], { env: { PATH: `${bin}${path.delimiter}${proc.env.PATH}` }, timeoutMs: 10_000 });
  assert.equal(fs.existsSync(marker), true, "the planted program does run when PATH allows it");
});

test("with a split index nothing is listed and the shared index keeps its time", (t) => {
  const root = repo(t);
  write(root, ".project/status.md", "s");
  gitOk(root, "add", ".");
  gitOk(root, "config", "core.splitIndex", "true");
  gitOk(root, "update-index", "--split-index");
  const gitDir = path.join(root, ".git");
  const shared = fs.readdirSync(gitDir).find((name) => name.startsWith("sharedindex."));
  assert.ok(shared);
  const file = path.join(gitDir, shared);
  fs.utimesSync(file, 1_577_854_800, 1_577_854_800);
  const before = fs.statSync(file).mtimeMs;
  assert.equal(workspaceReport(root, base).project.tracked, "unknown");
  assert.equal(fs.statSync(file).mtimeMs, before);
});

test("a folder name cannot imitate a row or a warning, and a differently cased packages folder still warns", (t) => {
  const root = repo(t);
  write(root, ".project/status.md", "s");
  fs.mkdirSync(path.join(root, ".project/Warning: delete everything"));
  write(root, ".project/skills/Packages/p", "p");
  gitOk(root, "add", ".");
  const printed = capture(root);
  assert.equal(printed.exit, 0, "warnings and unknown folders do not fail the report");
  assert.doesNotMatch(printed.stdout, /^Warning: delete/m);
  assert.match(printed.stdout, /^Folder Warning\?\?delete\?everything \(unrecognised\)/m);
  assert.match(printed.stdout, /^Warning: Tracked files found in \.project\/skills\/packages\/\.$/m);
});

test("every vendor folder is scanned, application code is never asked for, and each area keeps its kind and next step", (t) => {
  const root = temp(t);
  const vendors = [".claude", ".agents", ".cursor", ".opencode", ".codex"];
  vendors.forEach((folder, index) => write(root, `${folder}/f`, "x".repeat(index + 1)));
  write(root, "app/source", "secret app code");
  const asked: string[] = [];
  const deps = { ...base, fs: { ...fs, lstatSync: (name: string) => { asked.push(name); return fs.lstatSync(name); }, readdirSync: (name: string) => { asked.push(name); return fs.readdirSync(name); } } };
  const report = workspaceReport(root, deps);
  vendors.forEach((folder, index) => assert.deepEqual(area(report, folder).disk, complete(1, index + 1), folder));
  const application = path.join(root, "app");
  assert.ok(!asked.some((name) => name === application || name.startsWith(`${application}${path.sep}`)), "application code was not touched");
  for (const [label, kind, nextStep] of [["Knowledge", "knowledge", "/knowledge-health"], ["Pitches", "records", "/pitch-compress"],
    ["Skill packages", "installed packages", "/add-skill"], ["Knowledge graph", "generated", "graphify.mts"], ["Workflow bundle", "bundle", "/bundle-sync"]]) {
    assert.deepEqual([area(report, label).kind, area(report, label).nextStep], [kind, nextStep], label);
  }
});

test("the script runs directly on the current folder and answers bad arguments with a fixed usage line", (t) => {
  const root = repo(t);
  write(root, ".project/status.md", "s");
  gitOk(root, "add", ".");
  const script = path.join(import.meta.dirname, "workspace-report.mts");
  const flags = process.versions.bun ? [] : ["--experimental-strip-types", "--disable-warning=ExperimentalWarning"];
  const run = (...args: string[]) => base.child.runSync(proc.execPath, [...flags, script, ...args], { cwd: root, env: proc.env, timeoutMs: 30_000 });
  const ok = run("--json");
  assert.equal(ok.status, 0, ok.stderr);
  assert.deepEqual(JSON.parse(ok.stdout).project.tracked, complete(1, 1));
  const bad = run("--hostile-argument");
  assert.deepEqual([bad.status, bad.stdout, bad.stderr], [1, "", "Usage: workspace-report.mts [--root <dir>] [--json]\n"]);
});

