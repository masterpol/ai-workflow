import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_REF_BUDGET, deriveRefs, dropHubTargets, extractPathMentions, REF_HUB_LIMIT, stripFences } from "./graphify-refs.mts";
import { createTestDeps, tempFixture } from "./runtime/test-helpers.mts";

const deps = createTestDeps();

function withFixture(files: Record<string, string>, run: (root: string) => void): void {
  const root = tempFixture(deps, files);
  try { run(root); } finally { deps.fs.rmSync(root, { recursive: true, force: true }); }
}

test("prose and inline backtick mentions resolve; missing paths yield no edge and no error", () => {
  withFixture({
    "a.md": "See `ai-framework/workflow/p.md` and .claude/skills/ship/SKILL.md, also nope/missing.md.\n",
    "ai-framework/workflow/p.md": "x",
    ".claude/skills/ship/SKILL.md": "y",
  }, (root) => {
    const result = deriveRefs({ root, sources: ["a.md"], deps });
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.edges, [
      { from: "a.md", to: ".claude/skills/ship/SKILL.md" },
      { from: "a.md", to: "ai-framework/workflow/p.md" },
    ]);
  });
});

test("fenced code blocks are ignored, including tilde and longer fences; unclosed fence runs to end", () => {
  withFixture({
    "a.md": "```\nd/in-fence.md\n```\n~~~\nd/tilde.md\n~~~\n````\nd/long.md\n```\nd/still-in.md\n````\nd/out.md\n```\nd/unclosed.md\n",
    "d/in-fence.md": "", "d/tilde.md": "", "d/long.md": "", "d/still-in.md": "", "d/out.md": "", "d/unclosed.md": "",
  }, (root) => {
    assert.deepEqual(deriveRefs({ root, sources: ["a.md"], deps }).edges, [{ from: "a.md", to: "d/out.md" }]);
  });
  assert.equal(stripFences("a\n```\nb\n```\nc"), "a\nc");
});

test("canonicalOf redirects mirrors to the canonical file and null drops the mention", () => {
  withFixture({
    "a.md": "`.cursor/skills/x/SKILL.md` and .cursor/skills/gone/SKILL.md",
    ".cursor/skills/x/SKILL.md": "m", ".claude/skills/x/SKILL.md": "c", ".cursor/skills/gone/SKILL.md": "m",
  }, (root) => {
    const canonicalOf = (p: string): string | null => {
      if (p.startsWith(".cursor/skills/gone/")) return null;
      return p.startsWith(".cursor/") ? p.replace(".cursor/", ".claude/") : p;
    };
    assert.deepEqual(deriveRefs({ root, sources: ["a.md"], deps, canonicalOf }).edges, [{ from: "a.md", to: ".claude/skills/x/SKILL.md" }]);
  });
});

test("self-references collapse, including via canonicalization", () => {
  withFixture({ "d/a.md": "d/a.md d/a.md m/a.md", "m/a.md": "" }, (root) => {
    const canonicalOf = (p: string): string | null => (p === "m/a.md" ? "d/a.md" : p);
    assert.deepEqual(deriveRefs({ root, sources: ["d/a.md"], deps, canonicalOf }).edges, []);
  });
});

test("flood: a file mentioned 56 times from 30 sources yields exactly 30 edges", () => {
  const files: Record<string, string> = { "hub/target.md": "t" };
  const sources: string[] = [];
  for (let i = 0; i < 30; i++) {
    const name = `s/doc${String(i).padStart(2, "0")}.md`;
    sources.push(name);
    files[name] = i < 26 ? "hub/target.md\n".repeat(2) : "hub/target.md\n";
  }
  withFixture(files, (root) => {
    const result = deriveRefs({ root, sources, deps });
    assert.equal(result.edges.length, 30);
    assert.deepEqual(result.errors, []);
    assert.ok(result.edges.every((edge) => edge.to === "hub/target.md"));
  });
});

test("per-file budget breach reports an error and drops no edge", () => {
  const files: Record<string, string> = {};
  const mentions: string[] = [];
  for (let i = 0; i < 5; i++) { files[`t/f${i}.md`] = ""; mentions.push(`t/f${i}.md`); }
  files["a.md"] = mentions.join(" ");
  withFixture(files, (root) => {
    const result = deriveRefs({ root, sources: ["a.md"], deps, budget: { perFile: 3, total: 100 } });
    assert.equal(result.edges.length, 5);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0], /^a\.md: 5 .*per-file budget 3/);
  });
});

test("total budget breach reports an error naming total and drops no edge", () => {
  withFixture({ "a.md": "t/x.md", "b.md": "t/x.md", "c.md": "t/x.md", "t/x.md": "" }, (root) => {
    const result = deriveRefs({ root, sources: ["a.md", "b.md", "c.md"], deps, budget: { perFile: 5, total: 2 } });
    assert.equal(result.edges.length, 3);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0], /^total: 3 .*total budget 2/);
  });
});

test("edges are sorted by (from, to) regardless of source order", () => {
  withFixture({ "b.md": "z/2.md z/1.md", "a.md": "z/2.md", "z/1.md": "", "z/2.md": "" }, (root) => {
    assert.deepEqual(deriveRefs({ root, sources: ["b.md", "a.md"], deps }).edges, [
      { from: "a.md", to: "z/2.md" }, { from: "b.md", to: "z/1.md" }, { from: "b.md", to: "z/2.md" },
    ]);
  });
});

test("unsafe mentions are ignored: parent traversal, absolute, backslash, NUL", () => {
  withFixture({
    "sub/a.md": "../outside/o.md /abs/ok/a.md w\\in/x.md n\0ul/y.md sub/../ok/b.md",
    "outside/o.md": "", "ok/b.md": "", "w/in/x.md": "", "nul/y.md": "",
  }, (root) => {
    const result = deriveRefs({ root, sources: ["sub/a.md"], deps });
    assert.deepEqual(result.edges, []);
    assert.deepEqual(extractPathMentions("../x/y.md /a/b.md c\\d/e.md ok/f.md"), ["ok/f.md"]);
  });
});

test("symlinked targets, symlinked directories and symlinked sources are never followed", () => {
  withFixture({ "real/r.md": "r", "a.md": "link.md linkdir/r.md real/r.md", "other.md": "real/r.md" }, (root) => {
    deps.fs.symlinkSync(deps.path.join(root, "real/r.md"), deps.path.join(root, "link.md"));
    deps.fs.symlinkSync(deps.path.join(root, "real"), deps.path.join(root, "linkdir"));
    deps.fs.symlinkSync(deps.path.join(root, "other.md"), deps.path.join(root, "src-link.md"));
    const result = deriveRefs({ root, sources: ["a.md", "src-link.md"], deps });
    assert.deepEqual(result.edges, [{ from: "a.md", to: "real/r.md" }]);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0], /^src-link\.md:/);
  });
});

test("oversized sources are skipped with an error entry", () => {
  withFixture({ "big.md": `t/x.md ${"a".repeat(1024 * 1024 + 1)}`, "t/x.md": "" }, (root) => {
    const result = deriveRefs({ root, sources: ["big.md"], deps });
    assert.deepEqual(result.edges, []);
    assert.match(result.errors[0], /^big\.md: larger than/);
  });
});

test("default budget is exported with sane numbers", () => {
  assert.deepEqual(DEFAULT_REF_BUDGET, { perFile: 20, total: 400 });
});

test("a target named by more than REF_HUB_LIMIT sources is boilerplate: its edges are dropped and reported, others stay", () => {
  const edges = Array.from({ length: REF_HUB_LIMIT + 1 }, (_, i) => ({ from: `s${i}.md`, to: "hub.md" }));
  edges.push({ from: "s0.md", to: "ordinary.md" });
  const result = dropHubTargets(edges);
  assert.deepEqual(result.hubs, [{ target: "hub.md", sources: REF_HUB_LIMIT + 1 }]);
  assert.deepEqual(result.edges, [{ from: "s0.md", to: "ordinary.md" }]);
  assert.deepEqual(dropHubTargets(edges.slice(0, REF_HUB_LIMIT)).hubs, [], "exactly at the limit is still a relation");
});

import { deriveOutcomeRefs } from "./graphify-refs.mts";
import { MAX_LINKS_PER_FIELD, OUTCOME_FIELDS, MAX_RECORD_BYTES } from "./outcome-record.mts";

const outcome = (slug: string, fields: Record<string, string>): string => ["---", `slug: ${slug}`, "shipped: 2026-10-08", "schemaVersion: 1", "---", `# ${slug}`, "", "The change shipped.", "Read its owning files.", "Verification is historical.", "", ...OUTCOME_FIELDS.map(field => `- ${field}: ${fields[field] ?? (field === "outcome" ? "Changed it." : "none")}`), ""].join("\n");

test("outcome links accept every producer-supported link field at its maximum count", () => {
  const files: Record<string, string> = {}, fields: Record<string, string> = {};
  let index = 0;
  for (const field of OUTCOME_FIELDS.filter(field => field !== "outcome")) {
    const links: string[] = [];
    for (let i = 0; i < MAX_LINKS_PER_FIELD; i++) { const file = `t/${index++}.md`; files[file] = "x"; links.push(`[x](${file})`); }
    fields[field] = links.join(", ");
  }
  files[".project/records/shipped/alpha.md"] = outcome("alpha", fields);
  assert.ok(new TextEncoder().encode(files[".project/records/shipped/alpha.md"]).length <= MAX_RECORD_BYTES);
  withFixture(files, root => { const result = deriveOutcomeRefs(root, deps); assert.deepEqual(result.errors, []); assert.equal(result.edges.length, index); });
});

test("outcome link parsing ignores comment-only targets and keeps root filenames and anchor deduplication", () => {
  const record = outcome("alpha", { docs: "[first](README.md), [second](./README.md#section), [guide](docs//guide.md)" }) + "<!--\n- docs: [hidden](.project/compaction/private.json)\n-->\n";
  withFixture({ ".project/records/shipped/alpha.md": record, "README.md": "# Docs\n", "docs/guide.md": "# Guide\n" }, root => {
    assert.deepEqual(deriveOutcomeRefs(root, deps), { edges: [{ from: ".project/records/shipped/alpha.md", to: "README.md" }, { from: ".project/records/shipped/alpha.md", to: "docs/guide.md" }], errors: [] });
  });
});

for (const target of [".project/compaction/private.json", ".env", "../outside.md"]) test(`outcome references refuse protected or unsafe target ${target} before target I/O`, () => {
  withFixture({ ".project/records/shipped/alpha.md": outcome("alpha", { docs: `[bad](${target})` }) }, root => {
    let privateInspections = 0;
    const local = { ...deps, fs: { ...deps.fs, lstatSync: (file: string) => { if (file.includes("/.project/compaction") || file.endsWith("/.env") || file.endsWith("/outside.md")) privateInspections++; return deps.fs.lstatSync(file); } } };
    const result = deriveOutcomeRefs(root, local); assert.equal(result.errors.length, 1); assert.deepEqual(result.edges, []);
    assert.equal(privateInspections, 0, "private target was inspected");
  });
});

test("invalid, oversized and linked outcome records refuse instead of creating partial navigation", () => {
  for (const text of ["invalid", "x".repeat(MAX_RECORD_BYTES + 1)]) withFixture({ ".project/records/shipped/alpha.md": text }, root => { assert.equal(deriveOutcomeRefs(root, deps).errors.length, 1); });
  withFixture({ "outside.md": outcome("alpha", { docs: "[docs](README.md)" }), "README.md": "docs", ".project/records/shipped/_template.md": "ignored" }, root => {
    deps.fs.symlinkSync(deps.path.join(root, "outside.md"), deps.path.join(root, ".project/records/shipped/alpha.md"));
    assert.equal(deriveOutcomeRefs(root, deps).errors.length, 1);
  });
});
