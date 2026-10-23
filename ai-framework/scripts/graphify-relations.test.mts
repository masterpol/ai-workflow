import { describe, test } from "node:test";
import assert from "node:assert";
import { canonicalOf, checkRelations, isMirror, main, MANIFEST_FILE, MANIFEST_SCHEMA_VERSION, MAX_ENTRIES, MAX_TARGETS, OVERLAY_FILE, problemCodes, type RelationEntry } from "./graphify-relations.mts";
import { DATA_HEADER, encodeData } from "./runtime/toon-data.mts";
import { readData } from "./runtime/data-file.mts";
import { createTestDeps, tempFixture } from "./runtime/test-helpers.mts";

const deps = createTestDeps();
const { fs, path } = deps;

function toon(value: unknown): string {
  const encoded = encodeData(value);
  if (encoded.status === "refused") throw new Error(encoded.problem.text);
  return encoded.text;
}
function manifest(entries: RelationEntry[], schemaVersion: unknown = MANIFEST_SCHEMA_VERSION): string {
  return toon({ schemaVersion, entries });
}

const SKILL = ".claude/skills/ship/SKILL.md";
const AGENT = ".claude/agents/reviewer.md";
const RULE = "ai-framework/rules/security.md";
const PHASE = "ai-framework/workflow/phases/4-ship.md";
const BASE: Record<string, string> = {
  [SKILL]: "# ship\n",
  [AGENT]: "# reviewer\n",
  [RULE]: "# security\n",
  [PHASE]: "# ship phase\n",
};
const GOOD: RelationEntry[] = [
  { path: SKILL, phaseDoc: PHASE, dispatches: [AGENT] },
  { path: AGENT, reads: [RULE] },
  { path: PHASE, standalone: "owned by the ship skill" },
];

function run(files: Record<string, string>, check: (root: string, result: ReturnType<typeof checkRelations>) => void, owned?: Set<string>): void {
  const root = tempFixture(deps, files);
  try { check(root, checkRelations(root, deps, owned ? { owned } : { owned: new Set() })); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
const codes = (result: ReturnType<typeof checkRelations>): string[] => result.problems.map((problem) => problem.code).sort();

describe("bundle manifest", () => {
  test("a valid manifest parses and yields declared and mirror edges", () => {
    run({ ...BASE, [MANIFEST_FILE]: manifest(GOOD), ".cursor/skills/ship/SKILL.md": "x", ".opencode/agents/reviewer.md": "x" }, (_root, result) => {
      assert.deepStrictEqual(codes(result), []);
      assert.strictEqual(result.entries, 3);
      const edges = result.edges.map((edge) => `${edge.relation} ${edge.from} -> ${edge.to}`);
      assert.ok(edges.includes(`phase-doc ${SKILL} -> ${PHASE}`));
      assert.ok(edges.includes(`dispatches ${SKILL} -> ${AGENT}`));
      assert.ok(edges.includes(`reads ${AGENT} -> ${RULE}`));
      assert.ok(edges.includes(`mirrors .cursor/skills/ship/SKILL.md -> ${SKILL}`));
      assert.ok(edges.includes(`mirrors .opencode/agents/reviewer.md -> ${AGENT}`));
    });
  });

  test("absent and refused are different outcomes, and a refused file is never rewritten", () => {
    run(BASE, (_root, result) => assert.deepStrictEqual(codes(result), [problemCodes.absent]));
    const damaged = `${DATA_HEADER}\nentries[2]:\n  - path: broken`;
    run({ ...BASE, [MANIFEST_FILE]: damaged }, (root, result) => {
      assert.deepStrictEqual(codes(result), [problemCodes.refused]);
      assert.strictEqual(result.edges.length, 0);
      assert.strictEqual(fs.readFileSync(path.join(root, MANIFEST_FILE)), damaged);
    });
  });

  test("a newer or missing schemaVersion is a refusal that names it and says to sync the scripts", () => {
    run({ ...BASE, [MANIFEST_FILE]: manifest(GOOD, 2) }, (_root, result) => {
      assert.deepStrictEqual(codes(result), [problemCodes.version]);
      assert.match(result.problems[0].text, /schemaVersion 2/);
      assert.match(result.problems[0].text, /sync the bundle scripts/);
      assert.strictEqual(result.edges.length, 0);
    });
    run({ ...BASE, [MANIFEST_FILE]: toon({ entries: [] }) }, (_root, result) => assert.deepStrictEqual(codes(result), [problemCodes.version]));
  });

  test("unknown relation kind, missing target, no edges, unlisted canonical file are distinct errors", () => {
    run({ ...BASE, [MANIFEST_FILE]: manifest([{ ...GOOD[0], extends: AGENT } as RelationEntry, GOOD[1], GOOD[2]]) }, (_r, result) => {
      assert.deepStrictEqual(codes(result), [problemCodes.unknownField]);
      assert.match(result.problems[0].text, /unknown relation kind "extends"/);
    });
    run({ ...BASE, [MANIFEST_FILE]: manifest([{ path: SKILL, phaseDoc: PHASE, dispatches: [".claude/agents/ghost.md"] }, GOOD[1], GOOD[2]]) }, (_r, result) => {
      assert.deepStrictEqual(codes(result), [problemCodes.targetMissing]);
      assert.match(result.problems[0].text, /ghost/);
    });
    run({ ...BASE, [MANIFEST_FILE]: manifest([GOOD[0], GOOD[1], { path: PHASE }]) }, (_r, result) => assert.deepStrictEqual(codes(result), [problemCodes.noEdges]));
    run({ ...BASE, ".claude/skills/other/SKILL.md": "x", [MANIFEST_FILE]: manifest(GOOD) }, (_r, result) => {
      assert.deepStrictEqual(codes(result), [problemCodes.unlisted]);
      assert.match(result.problems[0].text, /relations\.toon/);
    });
  });

  test("a canonical file is covered by an inbound edge alone, a listed path that is not a file fails", () => {
    run({ ...BASE, [MANIFEST_FILE]: manifest([GOOD[0], { path: AGENT, reads: [RULE] }]) }, (_r, result) => assert.deepStrictEqual(codes(result), []));
    run({ ...BASE, [MANIFEST_FILE]: manifest([...GOOD, { path: ".claude/skills/gone/SKILL.md", standalone: "x" }]) }, (_r, result) => assert.deepStrictEqual(codes(result), [problemCodes.targetMissing]));
  });

  test("duplicates, bad paths, a mirror as a target and over-limit lists are rejected", () => {
    run({ ...BASE, [MANIFEST_FILE]: manifest([...GOOD, GOOD[1]]) }, (_r, result) => assert.ok(codes(result).includes(problemCodes.duplicate)));
    run({ ...BASE, [MANIFEST_FILE]: manifest([{ path: "../escape.md", standalone: "x" }, ...GOOD]) }, (_r, result) => assert.ok(codes(result).includes(problemCodes.path)));
    run({ ...BASE, ".cursor/skills/ship/SKILL.md": "x", [MANIFEST_FILE]: manifest([{ path: AGENT, reads: [".cursor/skills/ship/SKILL.md", RULE] }, GOOD[0], GOOD[2]]) }, (_r, result) => {
      assert.ok(codes(result).includes(problemCodes.targetMirror));
      assert.match(result.problems.find((p) => p.code === problemCodes.targetMirror)!.text, /\.claude\/skills\/ship\/SKILL\.md/);
    });
    const many = Array.from({ length: MAX_TARGETS + 1 }, (_, i) => `ai-framework/rules/r${i}.md`);
    run({ ...BASE, [MANIFEST_FILE]: manifest([{ path: AGENT, reads: many }, GOOD[0], GOOD[2]]) }, (_r, result) => assert.ok(codes(result).includes(problemCodes.tooMany)));
    const lots = Array.from({ length: MAX_ENTRIES + 1 }, (_, i) => ({ path: `ai-framework/rules/e${i}.md`, standalone: "x" }));
    run({ ...BASE, [MANIFEST_FILE]: manifest(lots) }, (_r, result) => assert.deepStrictEqual(codes(result), [problemCodes.tooMany]));
  });

  test("a manifest at the maximum supported size is read back through the reader", () => {
    const files: Record<string, string> = { ...BASE };
    const entries: RelationEntry[] = [];
    for (let i = 0; i < MAX_ENTRIES; i++) {
      const file = `ai-framework/rules/r${i}.md`;
      files[file] = "x";
      entries.push({ path: file, standalone: "bound test" });
    }
    run({ ...files, [MANIFEST_FILE]: manifest(entries) }, (_r, result) => {
      assert.strictEqual(result.entries, MAX_ENTRIES);
      assert.ok(!codes(result).includes(problemCodes.tooMany), "the writer's maximum is within the reader's bound");
    });
  });
});

describe("mirror derivation", () => {
  test("every vendor adapter maps to the canonical .claude file and never to a mirror", () => {
    const cases: Record<string, string> = {
      ".opencode/agents/x.md": ".claude/agents/x.md",
      ".opencode/commands/x.md": ".claude/skills/x/SKILL.md",
      ".codex/agents/x.toml": ".claude/agents/x.md",
      ".agents/skills/x/SKILL.md": ".claude/skills/x/SKILL.md",
      ".cursor/agents/x.md": ".claude/agents/x.md",
      ".cursor/skills/x/SKILL.md": ".claude/skills/x/SKILL.md",
      ".opencode/skills/x/SKILL.md": ".claude/skills/x/SKILL.md",
    };
    for (const [adapter, canonical] of Object.entries(cases)) {
      assert.strictEqual(canonicalOf(adapter), canonical, adapter);
      assert.ok(isMirror(adapter));
      assert.ok(!isMirror(canonical));
      assert.strictEqual(canonicalOf(canonical), canonical);
    }
    assert.strictEqual(canonicalOf("ai-framework/rules/security.md"), "ai-framework/rules/security.md");
    assert.strictEqual(canonicalOf(".opencode/agents/nested/x.md"), ".opencode/agents/nested/x.md");
  });

  test("an adapter whose canonical is missing fails, unless the skill registry owns it", () => {
    const files = { ...BASE, [MANIFEST_FILE]: manifest(GOOD), ".codex/agents/orphan.toml": "x", ".cursor/skills/caveman/SKILL.md": "x" };
    run(files, (_r, result) => {
      assert.deepStrictEqual(codes(result), [problemCodes.adapterNoCanonical, problemCodes.adapterNoCanonical]);
    });
    run(files, (_r, result) => {
      assert.deepStrictEqual(codes(result), [problemCodes.adapterNoCanonical]);
      assert.match(result.problems[0].text, /orphan/);
    }, new Set([".cursor/skills/caveman/skill.md"]));
  });
});

describe("project overlay and registry-owned skills", () => {
  const LOCAL_SKILL = ".claude/skills/local/SKILL.md";
  test("the overlay lists a project's own skill with the same validation", () => {
    const files = { ...BASE, [LOCAL_SKILL]: "x", [MANIFEST_FILE]: manifest(GOOD) };
    run(files, (_r, result) => {
      assert.deepStrictEqual(codes(result), [problemCodes.unlisted]);
      assert.match(result.problems[0].text, /\.project\/relations\.toon/);
    });
    run({ ...files, [OVERLAY_FILE]: manifest([{ path: LOCAL_SKILL, dispatches: [AGENT] }]) }, (_r, result) => {
      assert.deepStrictEqual(codes(result), []);
      assert.strictEqual(result.overlayEntries, 1);
      assert.ok(result.edges.some((edge) => edge.from === LOCAL_SKILL && edge.relation === "dispatches"));
    });
    run({ ...files, [OVERLAY_FILE]: manifest([{ path: LOCAL_SKILL, dispatches: [".claude/agents/ghost.md"] }]) }, (_r, result) => assert.deepStrictEqual(codes(result), [problemCodes.targetMissing]));
  });

  test("an overlay entry that shadows a bundle entry is an error", () => {
    run({ ...BASE, [MANIFEST_FILE]: manifest(GOOD), [OVERLAY_FILE]: manifest([{ path: AGENT, reads: [RULE] }]) }, (_r, result) => assert.deepStrictEqual(codes(result), [problemCodes.overlayShadow]));
  });

  test("a refused overlay or an overlay from a newer version stops the check without being rewritten", () => {
    const bad = `${DATA_HEADER}\nentries[1`;
    run({ ...BASE, [MANIFEST_FILE]: manifest(GOOD), [OVERLAY_FILE]: bad }, (root, result) => {
      assert.deepStrictEqual(codes(result), [problemCodes.refused]);
      assert.strictEqual(fs.readFileSync(path.join(root, OVERLAY_FILE)), bad);
    });
    run({ ...BASE, [MANIFEST_FILE]: manifest(GOOD), [OVERLAY_FILE]: manifest([], 9) }, (_r, result) => assert.deepStrictEqual(codes(result), [problemCodes.version]));
  });

  test("a registry-owned skill needs no entry and is reported as registry-owned, not as an orphan", () => {
    const caveman = ".claude/skills/caveman/SKILL.md";
    run({ ...BASE, [caveman]: "x", ".opencode/skills/caveman/SKILL.md": "x", [MANIFEST_FILE]: manifest(GOOD) }, (_r, result) => {
      assert.deepStrictEqual(codes(result), []);
      assert.deepStrictEqual(result.registryOwned, [caveman]);
    }, new Set([caveman.toLowerCase()]));
  });

  test("a project with no overlay and no extra skills passes", () => {
    run({ ...BASE, [MANIFEST_FILE]: manifest(GOOD) }, (_r, result) => assert.deepStrictEqual(codes(result), []));
  });
});

describe("source hygiene", () => {
  test("manifest input never goes through JSON.parse", () => {
    const text = fs.readFileSync(path.join(import.meta.dirname, "graphify-relations.mts"));
    assert.ok(!text.includes("JSON.parse("), "manifest input is read with readData");
    assert.ok(text.includes("readData("));
  });
});

describe("audit cycle 1: symlinks, duplicates, the CLI and the real manifest", () => {
  test("a symlinked .claude directory is not followed: its files do not count as files of the project", () => {
    const outside = tempFixture(deps, { "skills/ship/SKILL.md": "# outside\n", "agents/reviewer.md": "# outside\n" });
    const root = tempFixture(deps, { [MANIFEST_FILE]: manifest([{ path: SKILL, dispatches: [AGENT] }]) });
    try {
      fs.symlinkSync(outside, path.join(root, ".claude"));
      const result = checkRelations(root, deps, { owned: new Set() });
      assert.ok(codes(result).includes(problemCodes.targetMissing), "the entry and its target are reported as not files");
      assert.strictEqual(result.edges.length, 0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  test("a target listed twice in one list yields one edge", () => {
    run({ ...BASE, [MANIFEST_FILE]: manifest([{ path: SKILL, phaseDoc: PHASE, dispatches: [AGENT, AGENT] }, { path: AGENT, reads: [RULE, RULE] }, GOOD[2]]) }, (_r, result) => {
      assert.strictEqual(result.edges.filter((edge) => edge.relation === "dispatches").length, 1);
      assert.strictEqual(result.edges.filter((edge) => edge.relation === "reads").length, 1);
    });
  });

  test("the CLI exits 0 and prints counts when clean, exits 1 with each problem code when not, and --json is one object", () => {
    const run2 = (files: Record<string, string>, ...args: string[]): { code: number; out: string; err: string } => {
      const root = tempFixture(deps, files);
      try {
        const out: string[] = [];
        const err: string[] = [];
        const local = { ...deps, proc: { ...deps.proc, cwd: () => root }, io: { stdout: { write: (t: string) => { out.push(t); } }, stderr: { write: (t: string) => { err.push(t); } } } } as typeof deps;
        return { code: main(args, local), out: out.join(""), err: err.join("") };
      } finally { fs.rmSync(root, { recursive: true, force: true }); }
    };
    const clean = run2({ ...BASE, [MANIFEST_FILE]: manifest(GOOD) });
    assert.strictEqual(clean.code, 0);
    assert.match(clean.out, /relations: 3 entries, .*0 problem\(s\)/);
    const bad = run2({ ...BASE, ".claude/skills/other/SKILL.md": "x", [MANIFEST_FILE]: manifest(GOOD) });
    assert.strictEqual(bad.code, 1);
    assert.match(bad.err, /REL-UNLISTED/);
    const json = JSON.parse(run2({ ...BASE, [MANIFEST_FILE]: manifest(GOOD) }, "--json").out);
    assert.deepStrictEqual([json.ok, json.entries, Object.keys(json.edges).sort()], [true, 3, ["dispatches", "phase-doc", "reads"]]);
  });

  test("the shipped manifest stays within its caps: size, reads per entry, schema version", () => {
    const real = path.join(path.dirname(path.dirname(import.meta.dirname)), MANIFEST_FILE);
    if (!fs.existsSync(real)) return;
    assert.ok(fs.readFileSync(real).length <= 16 * 1024, "relations.toon is at most 16 KiB");
    const read = readData(path.dirname(path.dirname(path.dirname(real))), MANIFEST_FILE, deps);
    assert.strictEqual(read.status, "parsed");
    if (read.status !== "parsed") return;
    assert.strictEqual(read.value.schemaVersion, MANIFEST_SCHEMA_VERSION);
    const entries = read.value.entries as RelationEntry[];
    assert.ok(entries.length <= MAX_ENTRIES);
    for (const entry of entries) assert.ok((entry.reads ?? []).length <= 6, `${entry.path} reads at most 6 rules`);
  });
});

test("the CLI never writes a control character from a project path to the terminal", () => {
  const root = tempFixture(deps, { ...BASE, [MANIFEST_FILE]: manifest(GOOD), [`.claude/skills/x\u001b[31mRED/SKILL.md`]: "x" });
  try {
    const err: string[] = [];
    const local = { ...deps, proc: { ...deps.proc, cwd: () => root }, io: { stdout: { write: () => undefined }, stderr: { write: (t: string) => { err.push(t); } } } } as typeof deps;
    assert.strictEqual(main([], local), 1);
    assert.ok(err.join("").includes("REL-UNLISTED"));
    assert.ok(!/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/.test(err.join("").replace(/\n/g, "")), "no control character in the output");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
