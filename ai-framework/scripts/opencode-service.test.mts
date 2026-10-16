import assert from "node:assert/strict";
import { test } from "node:test";

import { freeOpencodePort, listeners, main, servicePort } from "./opencode-service.mts";
import { createNodeDeps } from "./runtime/node.mts";
import type { RunResult, RuntimeDeps } from "./runtime/types.mts";

interface Proc { pid: number; port: number; command: string; ignoresTerm?: boolean; survivesKill?: boolean; stopRemoves?: boolean }

/** A fake host: `lsof`, `ps` and `opencode service stop` read and change `procs`; kill() records signals. */
function host(procs: Proc[], options: { servicePort?: number; lsof?: "missing" | "error"; platform?: string } = {}) {
  const calls: string[] = [];
  const signals: Array<[number, string]> = [];
  const ok = (stdout: string, status = 0): RunResult => ({ status, signal: null, stdout, stderr: "" });
  const base = createNodeDeps({});
  const deps: RuntimeDeps = {
    ...base,
    fs: { ...base.fs, readFileSync: (file: string) => {
      if (options.servicePort !== undefined && file === "/home/u/.local/state/opencode/service.json") return JSON.stringify({ url: `http://127.0.0.1:${options.servicePort}`, pid: 1, password: "SECRET" });
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    } },
    child: { ...base.child, runSync: (command: string, args: string[]) => {
      calls.push([command, ...args].join(" "));
      if (command === "lsof") {
        if (options.lsof === "missing") throw Object.assign(new Error("spawn lsof ENOENT"), { code: "ENOENT" });
        if (options.lsof === "error") return ok("", 2);
        if (procs.length === 0) return ok("", 1);
        return ok(procs.map((p) => `p${p.pid}\nf7\nn127.0.0.1:${p.port}`).join("\n") + "\n");
      }
      if (command === "ps") return ok(`${procs.find((p) => String(p.pid) === args[args.length - 1])?.command ?? ""}\n`);
      if (command === "opencode") {
        for (const p of [...procs]) if (p.stopRemoves) procs.splice(procs.indexOf(p), 1);
        return ok("");
      }
      throw new Error(`unexpected command ${command}`);
    } },
    clock: { ...base.clock, sleep: async () => {} },
    proc: { ...base.proc, platform: options.platform ?? "darwin", env: { HOME: "/home/u" }, kill: (pid: number, name: string | number) => {
      const target = procs.find((p) => p.pid === pid);
      if (!target) throw Object.assign(new Error("ESRCH"), { code: "ESRCH" });
      signals.push([pid, String(name)]);
      if ((name === "SIGTERM" && !target.ignoresTerm) || (name === "SIGKILL" && !target.survivesKill)) procs.splice(procs.indexOf(target), 1);
    } },
  };
  return { deps, calls, signals, procs };
}

const SERVE = "/opt/homebrew/Cellar/opencode-v2/2.0.29/bin/opencode serve --service";

test("no listener: nothing is stopped or signalled", async () => {
  const h = host([], { servicePort: 49374 });
  assert.deepEqual(await freeOpencodePort(h.deps), { status: "free", stopped: false, signalled: [], remaining: [] });
  assert.ok(!h.calls.some((call) => call.startsWith("opencode")));
  assert.deepEqual(h.signals, []);
});

test("a service that stops cleanly is never signalled", async () => {
  const h = host([{ pid: 13944, port: 49374, command: SERVE, stopRemoves: true }], { servicePort: 49374 });
  const result = await freeOpencodePort(h.deps);
  assert.deepEqual([result.status, result.stopped, result.signalled], ["free", true, []]);
  assert.ok(h.calls.includes("opencode service stop"));
  assert.deepEqual(h.signals, []);
});

test("an opencode serve listener without a state file survives stop and is ended with SIGTERM", async () => {
  const h = host([{ pid: 37137, port: 49374, command: SERVE }]);
  const result = await freeOpencodePort(h.deps);
  assert.deepEqual([result.status, result.signalled], ["free", [37137]]);
  assert.deepEqual(h.signals, [[37137, "SIGTERM"]]);
});

test("SIGTERM is escalated to SIGKILL; a survivor is reported as held", async () => {
  const stubborn = host([{ pid: 5, port: 49374, command: SERVE, ignoresTerm: true }]);
  assert.equal((await freeOpencodePort(stubborn.deps)).status, "free");
  assert.deepEqual(stubborn.signals, [[5, "SIGTERM"], [5, "SIGKILL"]]);
  const immortal = host([{ pid: 6, port: 49374, command: SERVE, ignoresTerm: true, survivesKill: true }]);
  const result = await freeOpencodePort(immortal.deps);
  assert.equal(result.status, "held");
  assert.deepEqual(result.remaining.map((item) => item.pid), [6]);
});

test("another program on the service port, the opencode TUI and unrelated listeners are never signalled", async () => {
  const h = host([
    { pid: 7, port: 49374, command: "/usr/bin/python3 -m http.server 49374" },
    { pid: 8, port: 51000, command: "opencode" },
    { pid: 9, port: 5432, command: "postgres -D /var/db" },
  ], { servicePort: 49374 });
  const result = await freeOpencodePort(h.deps);
  assert.equal(result.status, "foreign");
  assert.deepEqual(result.remaining.map((item) => item.pid), [7]);
  assert.deepEqual(h.signals, []);
  assert.ok(!h.calls.includes("opencode service stop"), "stop is not run when no opencode serve listens");
  assert.ok(!JSON.stringify(result).includes("SECRET"));
});

test("missing or failing lsof is unverified, and Windows is unsupported, with no signals", async () => {
  for (const lsof of ["missing", "error"] as const) {
    const h = host([{ pid: 1, port: 49374, command: SERVE }], { lsof });
    assert.equal((await freeOpencodePort(h.deps)).status, "unverified");
    assert.deepEqual(h.signals, []);
  }
  const win = host([{ pid: 1, port: 49374, command: SERVE }], { platform: "win32" });
  assert.equal((await freeOpencodePort(win.deps)).status, "unsupported");
  assert.deepEqual(win.calls, []);
});

test("servicePort reads only a valid port from the state file; listeners parses lsof -F output", () => {
  assert.equal(servicePort(host([], { servicePort: 49374 }).deps), 49374);
  assert.equal(servicePort(host([]).deps), undefined);
  assert.deepEqual(listeners(host([{ pid: 3, port: 80, command: "nginx" }]).deps), [{ pid: 3, port: 80, command: "nginx" }]);
});

test("main: free prints the status, --json the result; exit 1 unless free; usage errors exit 2", async () => {
  const out: string[] = [];
  const err: string[] = [];
  const h = host([{ pid: 4, port: 49374, command: SERVE }]);
  const deps = { ...h.deps, io: { ...h.deps.io, stdout: { write: (text: string) => { out.push(text); }, isTTY: false }, stderr: { write: (text: string) => { err.push(text); }, isTTY: false } } };
  assert.equal(await main(["free", "--json"], deps), 0);
  assert.equal(JSON.parse(out[0]).status, "free");
  assert.equal(await main(["stop"], deps), 2);
  assert.match(err[0], /usage/);
  const held = host([{ pid: 7, port: 49374, command: "python3" }], { servicePort: 49374 });
  assert.equal(await main(["free"], { ...held.deps, io: deps.io }), 1);
});
