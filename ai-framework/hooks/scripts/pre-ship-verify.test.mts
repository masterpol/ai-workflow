import assert from "node:assert/strict";
import test from "node:test";

import { bunIsolationOptions } from '../../scripts/runtime/entry.mts';
import { createNodeDeps } from '../../scripts/runtime/node.mts';
import { encodeData } from '../../scripts/runtime/toon-data.mts';
import {
  buildChecks,
  isSensitivePath,
  loadManifest,
  main,
  packageCommand,
  runCheck,
} from './pre-ship-verify.mts';

import type { RunResult, RuntimeDeps, SpawnOptions } from '../../scripts/runtime/types.mts';
import { createTestDeps } from "../../scripts/runtime/test-helpers.mts";
const testDeps = createTestDeps();
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = testDeps.fs;
const tmpdir = (): string => testDeps.os.tmpdir();
const { join, posix, win32 } = testDeps.path;

interface Call {
  adapter: "sync" | "async";
  cwd?: string;
  maxBufferBytes?: number;
  command: string;
  args: string[];
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
  shell?: boolean;
  stdio?: "pipe" | "inherit" | "ignore";
}

/** Injected host: a virtual file set and scripted child results, so no real build or git command runs. */
function fakeHost(options: {
  files?: Record<string, string>;
  platform?: string;
  results?: (call: Call) => Partial<RunResult> | undefined;
}): { deps: RuntimeDeps; calls: Call[]; out: string[]; err: string[] } {
  const base = createNodeDeps();
  const files = options.files ?? {};
  const calls: Call[] = [];
  const out: string[] = [];
  const err: string[] = [];
  const childResult = (adapter: Call["adapter"], command: string, args: string[], spawn?: SpawnOptions): RunResult => {
    const call: Call = { adapter, command, args, cwd: spawn?.cwd, env: spawn?.env, timeoutMs: spawn?.timeoutMs, maxBufferBytes: spawn?.maxBufferBytes, shell: spawn?.shell, stdio: spawn?.stdio };
    calls.push(call);
    const scripted = options.results?.(call);
    return { status: 0, signal: null, stdout: "", stderr: "", ...scripted };
  };
  const deps: RuntimeDeps = {
    ...base,
    fs: {
      ...base.fs,
      existsSync: (file: string) => file in files,
      // The virtual project has no check manifest; manifest cases use a real temporary directory.
      realpathSync: (file: string) => file,
      lstatSync: () => { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); },
      readFileSync: (file: string) => {
        if (!(file in files)) throw new Error(`ENOENT ${file}`);
        return files[file];
      },
    },
    path: options.platform === 'win32' ? win32 : posix,
    proc: {
      ...base.proc,
      cwd: () => options.platform === 'win32' ? 'C:\\repo' : '/repo',
      env: { PATH: '/bin' },
      execPath: options.platform === 'win32' ? 'C:\\node.exe' : '/node',
      platform: options.platform ?? 'linux',
    },
    io: {
      ...base.io,
      stdout: { write: (text: string) => void out.push(text), isTTY: false },
      stderr: { write: (text: string) => void err.push(text), isTTY: false },
    },
    child: {
      ...base.child,
      runSync: (command, args, spawn) => {
        assert.equal(command, "git", "only read-only Git listings may use the synchronous adapter");
        assert.deepEqual(args.slice(0, 3), ["--no-pager", "-c", "core.fsmonitor=false"]);
        return childResult("sync", command, args, spawn);
      },
      run: async (command, args, spawn) => {
        assert.notEqual(command, "git", "build and test checks use the owned asynchronous adapter");
        return childResult("async", command, args, spawn);
      },
    },
  };
  return { deps, calls, out, err };
}

const pkg = (scripts: Record<string, string>, extra: Record<string, unknown> = {}): string =>
  JSON.stringify({ scripts, ...extra });

test('package manager comes from the declaration, then lockfiles, and Windows uses the JS CLI', () => {
  const declared = fakeHost({ files: {} }).deps;
  assert.deepEqual(packageCommand({ packageManager: 'pnpm@10.34.5' }, declared), { command: 'pnpm', prefix: [] });
  const locked = fakeHost({ files: { '/repo/yarn.lock': '' } }).deps;
  assert.equal(packageCommand({}, locked).command, 'yarn');
  assert.equal(packageCommand({}, fakeHost({ files: {} }).deps).command, 'npm');
  assert.throws(() => packageCommand({ packageManager: 'rush@5' }, declared), /Unsupported package manager: rush/);
  const windows = fakeHost({ files: { 'C:\\repo\\node_modules\\pnpm\\bin\\pnpm.cjs': '' }, platform: 'win32' }).deps;
  assert.deepEqual(packageCommand({ packageManager: 'pnpm@10' }, windows), {
    command: 'C:\\node.exe',
    prefix: ['C:\\repo\\node_modules\\pnpm\\bin\\pnpm.cjs'],
  });
  assert.throws(
    () => packageCommand({ packageManager: 'pnpm@10' }, fakeHost({ files: {}, platform: 'win32' }).deps),
    /WORKFLOW_PACKAGE_MANAGER_CLI/,
  );
});

test('a packageManager outside npm, pnpm, yarn and bun is refused before anything runs', async () => {
  for (const declared of ['touch INJECTED; echo@1.0.0', 'true@1', 'node@22', 42]) {
    const host = fakeHost({ files: { '/repo/package.json': pkg({ build: 'b' }, { packageManager: declared }) } });
    assert.equal(await main([], host.deps), 1, String(declared));
    assert.equal(host.calls.length, 0);
    assert.match(host.err.join(''), /Unsupported package manager/);
  }
});

test('checks come from the recognised scripts, with verify:base first and the document checks after it', () => {
  const plain = fakeHost({ files: { '/repo/package.json': pkg({ build: 'x', lint: 'x', test: 'x', other: 'x' }) } }).deps;
  const list = buildChecks({ scripts: { build: 'x', lint: 'x', test: 'x', other: 'x' } }, plain);
  assert.deepEqual(
    list.map((check) => [check.name, check.required]),
    [['build', true], ['lint', false], ['test', true]],
  );
  assert.deepEqual(list[0].args, ['run', 'build']);

  const viewer = fakeHost({ files: { '/repo/tools/viewer/verify-all.ts': '' } }).deps;
  const base = buildChecks({ scripts: { 'verify:base': 'x' } }, viewer);
  assert.deepEqual(
    base.map((check) => check.name),
    ['verify:base', 'workflow setup', 'documentación: documentos', 'documentación: integridad', 'visor HTML sin conexión'],
  );
  assert.equal(base[0].timeout, 1_200_000);
  assert.ok(base[1].args.includes('ai-framework/scripts/setup-validator.mts'));

  // The workflow's own validator is isolated under Bun; the project's viewer scripts keep the project's settings.
  const underBun = buildChecks({ scripts: { 'verify:base': 'x' } }, { ...viewer, runtime: 'bun' });
  assert.deepEqual(underBun[1].args, [...bunIsolationOptions(), 'ai-framework/scripts/setup-validator.mts', '--json']);
  assert.deepEqual(underBun.slice(2).map((check) => check.args), base.slice(2).map((check) => check.args));

  assert.throws(() => buildChecks({ scripts: {} }, plain), /no recognized checks/);
  assert.throws(() => buildChecks(null, fakeHost({ files: {} }).deps), /no checks configured/);
});

test('a green run executes each check with CI=1 and reports Git as unavailable when it is', async () => {
  const host = fakeHost({
    files: { '/repo/package.json': pkg({ build: 'x' }) },
    results: (call) => (call.command === 'git' ? { status: 128, stderr: 'fatal: not a git repository' } : undefined),
  });
  assert.equal(await main([], host.deps), 0);
  assert.equal(host.calls[0].env?.CI, '1');
  assert.ok(host.out.join('').includes('required checks passed; Git diff comparison unavailable'));
});

test('a failing required check stops the run, an optional one only warns', async () => {
  const required = fakeHost({
    files: { '/repo/package.json': pkg({ build: 'x', test: 'x' }) },
    results: (call) => (call.args.includes('build') ? { status: 3 } : undefined),
  });
  assert.equal(await main([], required.deps), 1);
  assert.ok(required.err.join('').includes('build failed (exit 3)'));
  assert.equal(required.calls.filter((call) => call.args.includes('test')).length, 0);

  const optional = fakeHost({
    files: { '/repo/package.json': pkg({ lint: 'x', build: 'x' }) },
    results: (call) =>
      call.command === 'git' ? { status: 128, stderr: 'not a git repository' } : call.args.includes('lint') ? { status: 1 } : undefined,
  });
  assert.equal(await main([], optional.deps), 0);
  assert.ok(optional.err.join('').includes('WARN lint failed (optional check)'));
});

test('an invalid package.json fails with the parse message', async () => {
  const host = fakeHost({ files: { '/repo/package.json': '{' } });
  assert.equal(await main([], host.deps), 1);
  assert.match(host.err.join(''), /FAILED:/);
});

test('diff-sanity blocks sensitive paths and debug logging in application source only', async () => {
  const listing = (files: string[]) => (call: Call) =>
    call.command === 'git' && call.args.includes('diff') && !call.args.includes('--cached')
      ? { stdout: files.join('\0') + '\0' }
      : undefined;
  const sensitive = fakeHost({
    files: { '/repo/package.json': pkg({ build: 'x' }) },
    results: listing(['apps/api/.env']),
  });
  assert.equal(await main([], sensitive.deps), 1);
  assert.ok(sensitive.err.join('').includes('sensitive/debug paths changed: apps/api/.env'));

  const debug = fakeHost({
    files: { '/repo/package.json': pkg({ build: 'x' }), '/repo/apps/web/a.ts': 'console.log(1)' },
    results: listing(['apps/web/a.ts']),
  });
  assert.equal(await main([], debug.deps), 1);
  assert.ok(debug.err.join('').includes('console.log in changed application code'));

  const tool = fakeHost({
    files: { '/repo/package.json': pkg({ build: 'x' }), '/repo/tools/dev/a.ts': 'console.log(1)' },
    results: listing(['tools/dev/a.ts']),
  });
  assert.equal(await main([], tool.deps), 0);
});

test('pre-ship allows the documented root environment template and ordinary source paths', () => {
  for (const file of [
    '.env.example',
    'tools/dev/database.ts',
    'apps/api/src/main.ts',
    'verification/stage-1/DB04/README.md',
  ])
    assert.equal(isSensitivePath(file), false, file);
});

test('pre-ship still rejects actual environment, credential, personal-setting and debug paths', () => {
  for (const file of [
    '.env',
    '.env.local',
    '.env.production',
    '.env.example.local',
    '.ENV.EXAMPLE',
    'apps/api/.env',
    'apps/api/.env.example',
    'apps/mobile/.env.local',
    'credentials.json',
    'nested/credentials.json',
    'settings.local.json',
    'nested/settings.local.json',
    'nested/debug.log',
  ])
    assert.equal(isSensitivePath(file), true, file);
});

test('checks run without a shell with CI=1 on top of the environment', async () => {
  const host = fakeHost({ files: { '/repo/package.json': pkg({ test: 'x' }) } });
  await main([], host.deps);
  const check = host.calls.find((c) => c.adapter === 'async');
  assert.ok(check);
  assert.equal(check.command, 'npm');
  assert.deepEqual(check.args, ['run', 'test']);
  assert.equal(check.env?.CI, '1');
  assert.equal(check.shell, undefined);
});

test('main awaits every check and forwards its timeout, output cap and CI environment', async () => {
  const host = fakeHost({
    files: { '/repo/package.json': pkg({ 'verify:base': 'x' }), '/repo/tools/viewer/verify-all.ts': '' },
    results: (call) => call.command === 'git' ? { status: 128, stderr: 'not a git repository' } : undefined,
  });
  const ordinaryRun = host.deps.child.run;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  host.deps.child.run = async (...args) => {
    const result = await ordinaryRun(...args);
    await pending;
    return result;
  };
  const execution = main([], host.deps);
  await Promise.resolve();
  assert.equal(host.calls.length, 1, 'the next check cannot start before completion');
  assert.doesNotMatch(host.out.join(''), /required checks passed/);
  release();
  assert.equal(await execution, 0);
  const checks = host.calls.filter(call => call.adapter === 'async');
  assert.equal(checks.length, 5);
  assert.equal(checks[0].timeoutMs, 1_200_000);
  for (const [index, call] of checks.entries()) {
    assert.equal(call.cwd, '/repo');
    assert.equal(call.env?.CI, '1');
    assert.equal(call.maxBufferBytes, 4 * 1024 * 1024);
    assert.equal(call.shell, undefined);
    if (index > 0) assert.equal(call.timeoutMs, 60_000);
  }
  assert.ok(host.calls.filter(call => call.command === 'git').every(call => call.adapter === 'sync'));
});

test('uncertain cleanup stops even optional checks and preserves the pending owner in diagnostics', async () => {
  const host = fakeHost({
    files: { '/repo/package.json': pkg({ lint: 'x', test: 'x' }) },
    results: () => { throw Object.assign(new Error('tree close was not confirmed'), { code: 'EPROCESSCLEANUP', ownerPid: 321 }); },
  });
  assert.equal(await main([], host.deps), 1);
  assert.equal(host.calls.length, 1, 'no later check, Git listing or retry can run');
  assert.equal(host.calls[0].adapter, 'async');
  assert.ok(host.calls[0].args.includes('lint'));
  assert.match(host.err.join(''), /EPROCESSCLEANUP: ownership pending \(PID 321\)/);
  assert.match(host.err.join(''), /termination is unconfirmed/);
  assert.doesNotMatch(host.err.join(''), /WARN lint/);
  assert.doesNotMatch(host.out.join(''), /required checks passed/);
});

test('timeout or output-cap results never pass solely because a wrapper reports exit zero', async () => {
  for (const errorCode of ['ETIMEDOUT', 'ENOBUFS']) {
    const host = fakeHost({
      files: { '/repo/package.json': pkg({ build: 'x', test: 'x' }) },
      results: () => ({ status: 0, errorCode }),
    });
    assert.equal(await main([], host.deps), 1);
    assert.equal(host.calls.length, 1);
    assert.ok(host.err.join('').includes(errorCode));
    assert.doesNotMatch(host.out.join(''), /required checks passed/);
  }
});

test('verify:base without the document viewer is the whole list; the viewer keeps its four checks', () => {
  const bare = fakeHost({ files: {} }).deps;
  assert.deepEqual(buildChecks({ scripts: { 'verify:base': 'x', test: 'x' } }, bare).map((c) => [c.name, c.source]), [['verify:base', 'verify:base']]);
  const viewer = fakeHost({ files: { '/repo/tools/viewer/verify-all.ts': '' } }).deps;
  assert.deepEqual(
    buildChecks({ scripts: { 'verify:base': 'x' } }, viewer).map((c) => c.source),
    ['verify:base', 'document viewer', 'document viewer', 'document viewer', 'document viewer'],
  );
  assert.equal(buildChecks(null, viewer).length, 4);
});

test('recognised test scripts get the long timeout; other scripts keep the default', async () => {
  const scripts = { build: 'x', 'test:ci': 'x', test: 'x', 'test:unit': 'x' };
  const host = fakeHost({ files: { '/repo/package.json': pkg(scripts) } });
  assert.equal(await main([], host.deps), 0);
  assert.deepEqual(
    host.calls.filter((c) => c.adapter === 'async').map((c) => [c.args[1], c.timeoutMs]),
    [['build', 60_000], ['test:ci', 1_200_000], ['test', 1_200_000], ['test:unit', 1_200_000]],
  );
});

test('with nothing to run the failure names the manifest path and its shape, and runs nothing', async () => {
  const cases: Array<Record<string, string>> = [{}, { '/repo/package.json': pkg({ other: 'x' }) }];
  for (const files of cases) {
    const host = fakeHost({ files });
    assert.equal(await main([], host.deps), 1);
    assert.equal(host.calls.length, 0);
    const text = host.err.join('');
    assert.match(text, /no checks configured/);
    assert.ok(text.includes('.project/context/checks.toon'));
    assert.match(text, /schemaVersion: 1/);
  }
});

test('the success output lists every check with its source and result', async () => {
  const host = fakeHost({
    files: { '/repo/package.json': pkg({ lint: 'x', test: 'x' }) },
    results: (call) => call.command === 'git' ? { status: 128, stderr: 'not a git repository' } : call.args.includes('lint') ? { status: 1 } : undefined,
  });
  assert.equal(await main([], host.deps), 0);
  const text = host.out.join('');
  assert.match(text, /running lint \(source: scripts\)/);
  assert.match(text, /result: lint \[scripts\] optional failure/);
  assert.match(text, /result: test \[scripts\] passed/);
  assert.match(text, /result: diff-sanity \[built-in\] skipped/);
});

const MANIFEST = '.project/context/checks.toon';

interface Entry { name?: unknown; argv?: unknown; required?: unknown; timeoutMs?: unknown; [key: string]: unknown }
const entry = (over: Entry = {}): Entry => ({ name: 'tests', argv: ['node', '--test'], required: true, timeoutMs: 5_000, ...over });
const toon = (value: Record<string, unknown>): string => {
  const encoded = encodeData(value);
  assert.equal(encoded.status, 'encoded');
  return (encoded as { text: string }).text;
};

/** A real temporary project (the shared reader opens real files); check commands are recorded, not run. */
function project(files: Record<string, string>): { root: string; deps: RuntimeDeps; ran: Call[]; out: string[]; err: string[] } {
  const root = mkdtempSync(join(tmpdir(), 'pre-ship-manifest-'));
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(testDeps.path.dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
  const base = createNodeDeps();
  const ran: Call[] = [];
  const out: string[] = [];
  const err: string[] = [];
  const deps: RuntimeDeps = {
    ...base,
    proc: { ...base.proc, cwd: () => root },
    io: {
      ...base.io,
      stdout: { write: (text: string) => void out.push(text), isTTY: false },
      stderr: { write: (text: string) => void err.push(text), isTTY: false },
    },
    child: {
      ...base.child,
      runSync: () => ({ status: 128, signal: null, stdout: '', stderr: 'not a git repository' }),
      run: async (command, args, spawn) => {
        ran.push({ adapter: 'async', command, args, cwd: spawn?.cwd, env: spawn?.env, timeoutMs: spawn?.timeoutMs, shell: spawn?.shell });
        return { status: 0, signal: null, stdout: '', stderr: '' };
      },
    },
  };
  return { root, deps, ran, out, err };
}

test('a valid manifest is the whole check list, in order, even beside a package.json', async (t) => {
  const host = project({
    'package.json': '{ not even json',
    [MANIFEST]: toon({ schemaVersion: 1, checks: [entry(), entry({ name: 'graph', argv: ['node', 'a b;c', '$(x)'], required: false, timeoutMs: 1_000 })] }),
  });
  t.after(() => rmSync(host.root, { recursive: true, force: true }));
  assert.equal(await main([], host.deps), 0, host.err.join(''));
  assert.deepEqual(host.ran.map((c) => [c.command, c.args, c.timeoutMs]), [['node', ['--test'], 5_000], ['node', ['a b;c', '$(x)'], 1_000]]);
  assert.ok(host.ran.every((c) => c.cwd === host.root && c.env?.CI === '1' && c.shell === undefined));
  assert.match(host.out.join(''), /result: tests \[manifest\] passed[\s\S]*result: graph \[manifest\] passed[\s\S]*result: diff-sanity/);
});

test('the shape shown for a project with no checks is itself a valid manifest', async (t) => {
  const empty = project({});
  t.after(() => rmSync(empty.root, { recursive: true, force: true }));
  assert.equal(await main([], empty.deps), 1);
  const text = empty.err.join('');
  const host = project({ [MANIFEST]: text.slice(text.indexOf('@toon-data')).trimEnd() + '\n' });
  t.after(() => rmSync(host.root, { recursive: true, force: true }));
  assert.equal(loadManifest(host.deps)?.length, 1);
});

test('a present but unusable manifest fails, runs nothing and never falls back to package.json', async (t) => {
  const fallback = { 'package.json': pkg({ test: 'x' }) };
  const of = (...checks: Entry[]): string => toon({ schemaVersion: 1, checks });
  const bad: Array<[string, Record<string, string>, RegExp]> = [
    ['parse error', { [MANIFEST]: 'checks: nope\n' }, /DATA-HEADER: .* at line \d+, column \d+/],
    ['both twins', { [MANIFEST]: of(entry()), '.project/context/checks.json': '{}' }, /DATA-FILE-BOTH-PRESENT/],
    ['broken json twin alone', { '.project/context/checks.json': '{' }, /DATA-FILE-JSON/],
    ['schema version', { [MANIFEST]: toon({ schemaVersion: 2, checks: [entry()] }) }, /schemaVersion must be 1/],
    ['unknown top key', { [MANIFEST]: toon({ schemaVersion: 1, checks: [entry()], extra: 1 }) }, /only schemaVersion and checks/],
    ['empty list', { [MANIFEST]: toon({ schemaVersion: 1, checks: [] }) }, /non-empty list/],
    ['unknown entry key', { [MANIFEST]: of(entry({ shell: true })) }, /needs exactly/],
    ['missing entry key', { [MANIFEST]: of({ name: 'a', argv: ['node'], required: true }) }, /needs exactly/],
    ['command string', { [MANIFEST]: of(entry({ argv: 'node --test' })) }, /argv must be/],
    ['empty argv', { [MANIFEST]: of(entry({ argv: [] })) }, /argv must be/],
    ['empty argument', { [MANIFEST]: of(entry({ argv: ['node', ''] })) }, /argv must be/],
    ['empty name', { [MANIFEST]: of(entry({ name: '' })) }, /name must be/],
    ...['a\nb', 'a\u007fb', 'a\u009bb', 'a\u202eb', 'a\u2028b', 'a\u0000b'].map(
      (name): [string, Record<string, string>, RegExp] => [`unsafe name ${name.charCodeAt(1)}`, { [MANIFEST]: of(entry({ name })) }, /name must be/],
    ),
    ['NUL argument', { [MANIFEST]: of(entry({ argv: ['node', 'a\u0000'] })) }, /argv must be/],
    ['duplicate name', { [MANIFEST]: of(entry(), entry()) }, /already used or reserved/],
    ['reserved name', { [MANIFEST]: of(entry({ name: 'diff-sanity' })) }, /already used or reserved/],
    ['required text', { [MANIFEST]: of(entry({ required: 'yes' })) }, /required must be/],
    ['short timeout', { [MANIFEST]: of(entry({ timeoutMs: 999 })) }, /timeoutMs must be/],
    ['long timeout', { [MANIFEST]: of(entry({ timeoutMs: 3_600_001 })) }, /timeoutMs must be/],
    ['fractional timeout', { [MANIFEST]: of(entry({ timeoutMs: 1_000.5 })) }, /timeoutMs must be/],
    ['nothing required', { [MANIFEST]: of(entry({ required: false })) }, /at least one check must be required/],
    ['bad entry after a good one', { [MANIFEST]: of(entry(), entry({ name: 'b', argv: [] })) }, /checks\[1\]/],
  ];
  // Collect every mismatch, so one broken refusal cannot hide the cases after it.
  const wrong: string[] = [];
  for (const [label, files, expected] of bad) {
    const host = project({ ...fallback, ...files });
    t.after(() => rmSync(host.root, { recursive: true, force: true }));
    const code = await main([], host.deps);
    if (code !== 1 || host.ran.length !== 0 || !expected.test(host.err.join(''))) wrong.push(label);
  }
  assert.deepEqual(wrong, []);
});

test('a symlinked manifest is refused', async (t) => {
  const host = project({ 'real.toon': toon({ schemaVersion: 1, checks: [entry()] }), 'package.json': pkg({ test: 'x' }) });
  t.after(() => rmSync(host.root, { recursive: true, force: true }));
  mkdirSync(join(host.root, '.project/context'), { recursive: true });
  testDeps.fs.symlinkSync(join(host.root, 'real.toon'), join(host.root, MANIFEST));
  assert.equal(await main([], host.deps), 1);
  assert.equal(host.ran.length, 0);
  assert.match(host.err.join(''), /DATA-FILE-SYMLINK/);
});

test('a missing executable fails a required manifest check and only warns for an optional one', async (t) => {
  const missing = { argv: ['workflow-no-such-executable'] };
  for (const [required, code] of [[true, 1], [false, 0]] as const) {
    const checks = [entry({ ...missing, name: 'absent', required }), entry({ name: 'present', argv: [testDeps.proc.execPath, '--version'] })];
    const host = project({ [MANIFEST]: toon({ schemaVersion: 1, checks }) });
    t.after(() => rmSync(host.root, { recursive: true, force: true }));
    // The real adapter: it is the one that throws for a missing executable.
    host.deps.child.run = createNodeDeps().child.run;
    assert.equal(await main([], host.deps), code, host.err.join(''));
    assert.match(host.err.join(''), /absent: executable not found/);
    if (required) assert.match(host.err.join(''), /absent failed \(ENOENT\)/);
    else assert.match(host.out.join(''), /result: absent \[manifest\] optional failure/);
  }
});

test("this repository's own manifest loads", (t) => {
  const root = testDeps.path.resolve(import.meta.dirname, '../../..');
  if (!testDeps.fs.existsSync(join(root, 'VERSION'))) { t.skip('bundle-repo manifest; an install owns its own'); return; }
  const base = createNodeDeps();
  const checks = loadManifest({ ...base, proc: { ...base.proc, cwd: () => root } });
  assert.deepEqual(checks?.map((check) => [check.name, check.required, check.timeout]), [
    ['tests', true, 600_000], ['setup-validator', true, 60_000], ['knowledge-graph', true, 60_000],
    ['process-relations', true, 60_000], ['workflow-doctor', true, 60_000],
  ]);
  assert.deepEqual([checks?.[0].command, ...(checks?.[0].args ?? [])], ['node', '--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--test']);
});

test('every recognised script is selected, in order, with its required flag', () => {
  const expected: Array<[string, boolean]> = [
    ['build', true], ['build:web', true], ['typecheck', true], ['typecheck:web', true], ['typecheck:mobile', true],
    ['lint', false], ['test:ci', true], ['test', true], ['test:unit', true], ['i18n:check', false],
  ];
  const scripts = Object.fromEntries([...expected].reverse().map(([name]) => [name, 'x']));
  assert.deepEqual(buildChecks({ scripts }, fakeHost({ files: {} }).deps).map((c) => [c.name, c.required]), expected);
});

test('only a missing executable of a manifest check is downgraded; other launch failures stop the run', async (t) => {
  const checks = [entry({ name: 'optional', required: false }), entry({ name: 'gate' })];
  for (const code of ['EPROCESSCLEANUP', 'EACCES']) {
    const host = project({ [MANIFEST]: toon({ schemaVersion: 1, checks }) });
    t.after(() => rmSync(host.root, { recursive: true, force: true }));
    let launches = 0;
    host.deps.child.run = async () => { launches += 1; throw Object.assign(new Error(`spawn ${code}`), { code }); };
    assert.equal(await main([], host.deps), 1, code);
    assert.equal(launches, 1, code);
    assert.match(host.err.join(''), /optional: check did not complete/);
    assert.doesNotMatch(host.err.join(''), /executable not found|WARN/);
  }
  const scripts = fakeHost({
    files: { '/repo/package.json': pkg({ lint: 'x' }) },
    results: () => { throw Object.assign(new Error('spawn npm ENOENT'), { code: 'ENOENT' }); },
  });
  assert.equal(await main([], scripts.deps), 1);
  assert.doesNotMatch(scripts.out.join(''), /required checks passed/);
});

test('a check ended by a signal fails even with exit status zero', async () => {
  const host = fakeHost({ files: { '/repo/package.json': pkg({ build: 'x' }) }, results: () => ({ status: 0, signal: 'SIGTERM' }) });
  assert.equal(await main([], host.deps), 1);
  assert.match(host.err.join(''), /build failed \(SIGTERM\)/);
});

test('the largest timeout is accepted', (t) => {
  const host = project({ [MANIFEST]: toon({ schemaVersion: 1, checks: [entry({ timeoutMs: 3_600_000 })] }) });
  t.after(() => rmSync(host.root, { recursive: true, force: true }));
  assert.equal(loadManifest(host.deps)?.[0].timeout, 3_600_000);
});

test('a symlinked manifest directory is refused even without a manifest, not treated as absent', async (t) => {
  const host = project({ 'shared/README.md': '', 'package.json': pkg({ test: 'x' }) });
  t.after(() => rmSync(host.root, { recursive: true, force: true }));
  mkdirSync(join(host.root, '.project'), { recursive: true });
  testDeps.fs.symlinkSync(join(host.root, 'shared'), join(host.root, '.project/context'));
  assert.equal(await main([], host.deps), 1);
  assert.equal(host.ran.length, 0);
  assert.match(host.err.join(''), /unusable check manifest .*DATA-FILE-SYMLINK/);
});
