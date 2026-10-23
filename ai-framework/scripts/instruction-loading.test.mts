// Instruction-loading proof (S1). Static tests prove the loading contract: each phase has named owner files with their
// required sections, every native wrapper points at the canonical skill, and Cursor copies are byte-identical. They do
// NOT prove model behavior. The live-evidence validator checks independently scored evidence integrity, not its truth.
// It runs only when
// IC_EVAL_REQUIRED=1 (baseline: IC_PHASE=baseline + IC_EVAL_REPORT; candidate: IC_PHASE=build|audit|ship + IC_EVAL_BASELINE
// + IC_EVAL_REPORT). The approved remaining-policy selector is scoped to baseline/audit/ship; it does not extend S1 implicitly.
// IC_EVAL_POLICY=s1-approved-2026-10-18 (baseline/build only) accepts the pinned known baseline scores. Required mode never skips: a missing input fails. Criterion ids are 0-based: expected:0, forbidden:0.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createTestDeps, spawnSync, tempFixture, urlPath } from "./runtime/test-helpers.mts";
import { NODE_FLAGS } from "./runtime/entry.mts";

const deps = createTestDeps();
const { fs, path } = deps;
const ROOT = path.resolve(import.meta.dirname, "../..");
const PHASES = ["build", "audit", "ship"] as const;
const OWNERS: Record<string, Record<string, string[]>> = {
  build: { "ai-framework/workflow/phases/2-build.md": ["## Per-scope inner loop", "## Adaptive gate", "## Verification-before-completion (hard rule)"] },
  audit: { "ai-framework/workflow/phases/3-audit.md": ["## Incomplete reviews", "## Loop discipline", "## Adaptive gate", "## Finding contract (every subagent)", "## Reviewer contract (every dispatch)", "## Evidence rule (same as /build)"] },
  ship: { "ai-framework/workflow/phases/4-ship.md": ["## Activities (in order)", "## Confirmation gate", "## Optional Orca multi-agent (off by default)"] },
};
const LEGACY_HEADINGS: Record<string, string[]> = { build: ["## Activities", "## Adaptive gate"], audit: ["## Loop discipline", "## Adaptive gate"], ship: ["## Activities (in order)", "## Confirmation gate"] };
const BANNER_SHA = "8e1a549955555052bfc49714f38e28d4088cafdad793827e6eeb538583c6f679";
const wrappers = (phase: string): string[] => [`.agents/skills/${phase}/SKILL.md`, `.opencode/commands/${phase}.md`];
const cursor = (phase: string): string => `.cursor/skills/${phase}/SKILL.md`;
const orcaBlock = (text: string): string => text.match(/<!-- orca-multi-agent:begin -->([\s\S]*?)<!-- orca-multi-agent:end -->/)?.[1] ?? "";
type Files = Record<string, string | undefined>;

/** Problems in a file map (relative path -> text). Mutants are copies of the map, so nothing on disk changes. */
function loadingProblems(files: Files): string[] {
  const problems: string[] = [];
  for (const phase of PHASES) {
    for (const [owner, headings] of Object.entries(OWNERS[phase])) {
      const text = files[owner];
      if (text === undefined) { problems.push(`absent owner ${owner}`); continue; }
      for (const heading of headings) if (!text.split("\n").includes(heading)) problems.push(`${owner} lacks heading ${heading}`);
      if (phase === "audit" && (!text.includes("**concrete failure scenario**") || !text.includes("**file:line**"))) problems.push(`${owner} lacks finding evidence`);
      if (phase === "audit" && !text.includes("At the applicable cycle cap, stop retrying")) problems.push(`${owner} weakens cycle cap`);
      if (phase === "build" && (!text.includes("Standalone `/shape-lite`") || !text.includes("Exit check") || !/instead of requiring absent `plan\.md` or `hill\.md`/.test(text))) problems.push(`${owner} lacks lite-card handling`);
      if (/exits 3, continue|or the command exits 3/.test(orcaBlock(text))) problems.push(`${owner} lets exit 3 fall back`);
    }
    const canonical = files[`.claude/skills/${phase}/SKILL.md`];
    if (canonical === undefined) problems.push(`absent canonical skill ${phase}`);
    else {
      const banner = canonical.split("\n").find((line) => line.includes("**Caveman mode:**")) ?? "";
      if (deps.crypto.sha256Hex(banner.replace(`--phase ${phase}`, "--phase PHASE")) !== BANNER_SHA) problems.push(`${phase}: caveman banner changed`);
      const owner = Object.keys(OWNERS[phase])[0];
      if (!canonical.includes(owner)) problems.push(`${phase}: missing phase-owner pointer`);
      if (canonical.includes("## Execute")) {
        if (phase === "audit" && !canonical.includes("If missing, stop and report")) problems.push(`${phase}: missing required-owner failure guard`);
        for (const heading of OWNERS[phase][owner]) if (!canonical.includes(heading.slice(3))) problems.push(`${phase}: missing applicable section ${heading}`);
        if (!/before[^\n]*read/i.test(canonical) || !canonical.includes("Adaptive confirmation gate") || !canonical.includes("ai-framework/workflow/overview.md")) problems.push(`${phase}: missing applicability/gate pointer`);
        if (!/when[^\n]*enabled/i.test(canonical) || !canonical.includes("ai-framework/integrations/orca-vendors.md") || !canonical.includes(phase === "build" ? "Dispatch core" : "Reconcile core")) problems.push(`${phase}: missing conditional Orca pointer`);
      } else for (const heading of LEGACY_HEADINGS[phase]) if (!canonical.split("\n").includes(heading)) problems.push(`${phase}: missing legacy requirement ${heading}`);
      if (/exits 3, continue|or the command exits 3/.test(orcaBlock(canonical))) problems.push(`${phase}: lets exit 3 fall back`);
    }
    for (const wrapper of wrappers(phase)) {
      if (files[wrapper] === undefined) problems.push(`absent wrapper ${wrapper}`);
      else if (!files[wrapper]!.includes(`.claude/skills/${phase}/SKILL.md`)) problems.push(`${wrapper} lacks pointer to the canonical skill`);
    }
    if (files[cursor(phase)] === undefined) problems.push(`absent Cursor copy ${cursor(phase)}`);
    else if (files[cursor(phase)] !== canonical) problems.push(`${cursor(phase)} differs from canonical`);
  }
  return problems;
}
const diskFiles = (root = ROOT): Files => {
  const files: Files = {};
  const paths = PHASES.flatMap((p) => [`.claude/skills/${p}/SKILL.md`, ...Object.keys(OWNERS[p]), ...wrappers(p), cursor(p)]);
  for (const rel of paths) files[rel] = fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel)) : undefined;
  return files;
};
const LEGACY = diskFiles();
const mutate = (change: (files: Files) => void): string[] => { const copy = { ...LEGACY }; change(copy); return loadingProblems(copy); };

test("legacy wrappers and owners satisfy the loading contract", () => assert.deepEqual(loadingProblems(LEGACY), []));

test("disposable installed layout loads without local evals, registry or external packages", () => {
  const files: Record<string, string> = {};
  for (const [rel, content] of Object.entries(LEGACY)) if (content !== undefined) files[rel] = content;
  const root = tempFixture(deps, files);
  try {
    assert.equal(fs.existsSync(path.join(root, ".project")), false);
    assert.deepEqual(loadingProblems(diskFiles(root)), []);
    fs.unlinkSync(path.join(root, cursor("build")));
    assert.match(loadingProblems(diskFiles(root)).join("\n"), /absent Cursor copy/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("compressed wrappers coexist with legacy ones when they keep the canonical pointer", () => {
  const mixed = { ...LEGACY };
  const phase = "build", owner = Object.keys(OWNERS[phase])[0];
  const banner = mixed[`.claude/skills/${phase}/SKILL.md`]!.split("\n").find((line) => line.includes("**Caveman mode:**"));
  mixed[`.claude/skills/${phase}/SKILL.md`] = `${banner}\n## Execute\nBefore phase decisions, read ${owner}: ${OWNERS[phase][owner].map((h) => h.slice(3)).join(", ")}.\nBefore gates, read ai-framework/workflow/overview.md: Adaptive confirmation gate.\nWhen Orca is enabled, before dispatch read ai-framework/integrations/orca-vendors.md: Dispatch core.`;
  mixed[cursor(phase)] = mixed[`.claude/skills/${phase}/SKILL.md`];
  assert.deepEqual(loadingProblems(mixed), [], "a compressed canonical build skill passes beside original audit/ship skills");
  const good = mixed[`.claude/skills/${phase}/SKILL.md`]!;
  mixed[`.claude/skills/${phase}/SKILL.md`] = good.replace("Per-scope inner loop", "Steps");
  mixed[cursor(phase)] = mixed[`.claude/skills/${phase}/SKILL.md`];
  assert.match(loadingProblems(mixed).join("\n"), /missing applicable section/);
  mixed[`.claude/skills/${phase}/SKILL.md`] = good; mixed[cursor(phase)] = good;
  for (const phase of PHASES) mixed[wrappers(phase)[1]] = "Use the phase skill.";
  assert.equal(loadingProblems(mixed).length, PHASES.length, "a wrapper that drops the pointer fails whichever style it has");
});

test("negative mutants: each broken loading contract is reported", () => {
  const [owner] = Object.keys(OWNERS.build);
  assert.match(mutate((f) => { f[owner] = undefined; }).join("\n"), /absent owner ai-framework\/workflow\/phases\/2-build/);
  assert.match(mutate((f) => { f[owner] = f[owner]!.replace("Standalone `/shape-lite`", "Standalone task"); }).join("\n"), /lacks lite-card handling/);
  assert.match(mutate((f) => { f[owner] = f[owner]!.replace("## Per-scope inner loop", "## Steps"); }).join("\n"), /lacks heading ## Per-scope inner loop/);
  assert.match(mutate((f) => { f[".claude/skills/build/SKILL.md"] = f[".claude/skills/build/SKILL.md"]!.replace(owner, "missing.md"); }).join("\n"), /missing phase-owner pointer/);
  assert.match(mutate((f) => { f[".agents/skills/audit/SKILL.md"] = "Run an audit."; }).join("\n"), /lacks pointer/);
  assert.match(mutate((f) => { f[cursor("ship")] = undefined; }).join("\n"), /absent Cursor copy/);
  assert.match(mutate((f) => { f[cursor("ship")] += " "; }).join("\n"), /differs from canonical/);
  const forbidden = "<!-- orca-multi-agent:begin -->\nIf the command exits 3, continue normally.\n<!-- orca-multi-agent:end -->";
  assert.match(mutate((f) => { f[owner] = `${forbidden}\n${f[owner]}`; }).join("\n"), /lets exit 3 fall back/);
  const entry = ".claude/skills/build/SKILL.md";
  assert.match(mutate((f) => { f[entry] = undefined; }).join("\n"), /absent canonical skill/);
  assert.match(mutate((f) => { f[entry] = f[entry]!.replace("**Caveman mode:**", "Mode:"); }).join("\n"), /caveman banner changed/);
  assert.match(mutate((f) => { f[entry] = f[entry]!.replaceAll("ai-framework/workflow/overview.md", "missing.md"); }).join("\n"), /missing applicability\/gate pointer/);
  assert.match(mutate((f) => { f[entry] = f[entry]!.replaceAll("ai-framework/integrations/orca-vendors.md", "missing.md"); }).join("\n"), /missing conditional Orca pointer/);
  assert.match(mutate((f) => { const p = ".claude/skills/ship/SKILL.md"; f[p] = f[p]!.replace("## Activities (in order)", "## Steps"); }).join("\n"), /missing legacy requirement/);
  assert.match(mutate((f) => { f[entry] = f[entry]!.replace("<!-- orca-multi-agent:begin -->", "<!-- orca-multi-agent:begin -->\nor the command exits 3, continue"); }).join("\n"), /lets exit 3 fall back/);
  assert.match(mutate((f) => { f[wrappers("build")[0]] = undefined; }).join("\n"), /absent wrapper/);
});

test("audit mutations preserve incomplete-review loading, evidence and cycle limits", () => {
  const owner = "ai-framework/workflow/phases/3-audit.md", entry = ".claude/skills/audit/SKILL.md";
  assert.match(mutate((f) => { f[entry] = f[entry]!.replace("**Incomplete reviews**", "completion notes"); f[cursor("audit")] = f[entry]; }).join("\n"), /missing applicable section/);
  assert.match(mutate((f) => { f[entry] = f[entry]!.replace("If missing, stop and report", "Proceed anyway"); f[cursor("audit")] = f[entry]; }).join("\n"), /required-owner failure guard/);
  assert.match(mutate((f) => { f[owner] = f[owner]!.replace("**concrete failure scenario**", "opinion"); }).join("\n"), /lacks finding evidence/);
  assert.match(mutate((f) => { f[owner] = f[owner]!.replace("## Reviewer contract (every dispatch)", "## Notes"); }).join("\n"), /lacks heading ## Reviewer contract/);
  assert.match(mutate((f) => { f[owner] = f[owner]!.replace("At the applicable cycle cap, stop retrying", "Keep retrying"); }).join("\n"), /weakens cycle cap/);
  assert.match(mutate((f) => { f[cursor("audit")] = undefined; }).join("\n"), /absent Cursor copy/);
  assert.match(mutate((f) => { f[cursor("audit")] += " "; }).join("\n"), /differs from canonical/);
});

// ---- live evidence validator -------------------------------------------------------------------------------------
interface CaseSpec { id: string; input: string; expected: string[]; forbidden: string[] }
interface Dataset { protocol: { vendors: string[] }; cases: CaseSpec[] }
interface Criterion { id: string; score: number | null }
interface Evidence { path: string; sha256: string }
interface Row { id: string; inputSha256: string; status: string; rationale: string; criteria: Criterion[]; evidence: Evidence[] }
interface Vendor { vendor: string; status: string; nativeEntry: string; model: string; cases: Row[] }
interface Report { schemaVersion: number; stage: string; scope: string; datasetSha256: string; sourceManifestSha256: string; scorerId: string; promptEditorId: string; vendors: Vendor[] }
type Json = Record<string, unknown>;
const object = (value: unknown): value is Json => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string";
function reportShape(value: unknown): value is Report {
  return object(value) && typeof value.schemaVersion === "number" && ["stage", "scope", "datasetSha256", "sourceManifestSha256", "scorerId", "promptEditorId"].every((key) => text(value[key]))
    && Array.isArray(value.vendors) && value.vendors.every((v: unknown) => object(v) && ["vendor", "status", "nativeEntry", "model"].every((key) => text(v[key]))
      && Array.isArray(v.cases) && v.cases.every((r: unknown) => object(r) && ["id", "inputSha256", "status", "rationale"].every((key) => text(r[key]))
        && Array.isArray(r.criteria) && r.criteria.every((c: unknown) => object(c) && text(c.id) && (c.score === null || typeof c.score === "number"))
        && Array.isArray(r.evidence) && r.evidence.every((e: unknown) => object(e) && text(e.path) && text(e.sha256))));
}
const MAX_EVIDENCE_BYTES = 1 << 20;
const sha = (data: string | Uint8Array): string => deps.crypto.sha256Hex(data);
const HEX = /^[0-9a-f]{64}$/;
const VENDOR_STATUS = ["executed", "unverified", "unavailable"];
const CASE_STATUS = ["pass", "fail", "unverified", "not-run"];

/** Reads `rel` beneath `dir`: relative, no `..`, no symlink component, regular file, bounded size. Throws otherwise. */
function readBounded(dir: string, rel: string): Uint8Array {
  const parts = typeof rel === "string" ? rel.split(/[\\/]/) : [];
  if (!parts.length || path.isAbsolute(rel) || parts.some((p) => !p || p === "." || p === "..") || /[\u0000-\u001f]/.test(rel)) throw new Error("evidence path escapes");
  if (parts.some((p) => /^(\.env.*|credentials.*|settings\.local\.json)$/i.test(p))) throw new Error("secret evidence path refused");
  const base = fs.realpathSync(dir);
  let current = base;
  for (const part of rel.split(/[\\/]/)) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`evidence path crosses a symlink: ${rel}`);
  }
  if (!fs.realpathSync(current).startsWith(`${base}${path.sep}`)) throw new Error(`evidence path escapes: ${rel}`);
  const stat = fs.lstatSync(current);
  if (!stat.isFile()) throw new Error(`evidence is not a regular file: ${rel}`);
  if (stat.size > MAX_EVIDENCE_BYTES) throw new Error(`evidence too large: ${rel}`);
  return fs.readBytesSync(current);
}

interface Context { dataset: Dataset; datasetSha: string; manifestSha: string; reportDir: string; stage: "baseline" | "candidate"; scope: string; baseline?: Report; policy?: { executed: string[]; vector: string } }
const S1_POLICY = "s1-approved-2026-10-18";
const REMAINING_POLICY = "remaining-approved-2026-10-18";
const S1_PIN = { executed: ["claude", "opencode"], vector: "0de3a3e2fd89904ec23e553fdfad01e2c60b111ad781b8f4adbf3c796e92b568" };
const vectorSha = (r: Report): string => sha(`${r.vendors.flatMap((v) => v.cases.flatMap((c) => c.criteria.map((k) => `${v.vendor}/${c.id}/${k.id}=${k.score}`))).join("\n")}\n${r.datasetSha256}`);
const criteriaOf = (c: CaseSpec): string[] => [...c.expected.map((_, i) => `expected:${i}`), ...c.forbidden.map((_, i) => `forbidden:${i}`)];

/** Every problem found in one report; an empty list means the report is acceptable. `passed`/`unverified` count criteria separately. */
function validateReport(report: unknown, ctx: Context): { problems: string[]; passed: number; unverified: number } {
  const problems: string[] = [];
  const bad = (message: string): void => { problems.push(message); };
  let passed = 0, unverified = 0;
  if (!reportShape(report)) return { problems: ["invalid report shape"], passed, unverified };
  if (report?.schemaVersion !== 1) bad("schemaVersion must be 1");
  if (report?.stage !== ctx.stage) bad(`stage must be ${ctx.stage}`);
  if (report?.scope !== ctx.scope) bad(`scope must be ${ctx.scope}`);
  if (report?.datasetSha256 !== ctx.datasetSha) bad("stale datasetSha256");
  if (report.sourceManifestSha256 !== ctx.manifestSha) bad("stale sourceManifestSha256");
  if (!HEX.test(report?.sourceManifestSha256 ?? "")) bad("sourceManifestSha256 must be sha256 hex");
  if (typeof report?.scorerId !== "string" || !report.scorerId || typeof report?.promptEditorId !== "string" || !report.promptEditorId) bad("scorerId and promptEditorId are required");
  else if (report.scorerId === report.promptEditorId) bad("scorerId must be independent of promptEditorId");
  const vendors = report.vendors;
  const expectedVendors: string[] = ctx.dataset.protocol.vendors;
  if (vendors.map((v) => v.vendor).sort().join() !== [...expectedVendors].sort().join()) bad("vendors must match the dataset protocol exactly");
  if (!vendors.some((v) => v.status === "executed")) bad("at least one executed vendor is required");
  for (const vendor of vendors) {
    const tag = `vendor ${vendor.vendor}`;
    if (!VENDOR_STATUS.includes(vendor.status)) bad(`${tag}: bad status`);
    if (vendor.status === "executed" && (typeof vendor.nativeEntry !== "string" || !vendor.nativeEntry || typeof vendor.model !== "string" || !vendor.model)) bad(`${tag}: executed needs nativeEntry and model`);
    if (report?.scorerId === vendor.model) bad(`${tag}: scorerId must not be the evaluated model`);
    const rows = vendor.cases;
    const ids = rows.map((r) => r.id);
    if (ids.length !== ctx.dataset.cases.length || ids.join() !== ctx.dataset.cases.map((c) => c.id).join() || new Set(ids).size !== ids.length) bad(`${tag}: cases must match the dataset exactly (missing, extra or reordered rows)`);
    for (const row of rows) {
      const spec = ctx.dataset.cases.find((c) => c.id === row.id);
      if (!spec) continue;
      const at = `${tag} ${row.id}`;
      if (row.inputSha256 !== sha(spec.input)) bad(`${at}: stale inputSha256`);
      if (!CASE_STATUS.includes(row.status)) bad(`${at}: bad status`);
      const wanted = criteriaOf(spec);
      const got = row.criteria;
      if (got.map((c) => c.id).join() !== wanted.join()) bad(`${at}: criteria must match the dataset exactly`);
      const scores = got.map((c) => c.score);
      if (scores.some((s) => s !== 0 && s !== 1 && s !== null)) bad(`${at}: score must be 0, 1 or null`);
      if (typeof row.rationale !== "string" || !row.rationale.trim()) bad(`${at}: rationale required`);
      if (vendor.status !== "executed" && ["pass", "fail"].includes(row.status)) bad(`${at}: ${vendor.status} vendor cannot report ${row.status}`);
      if (vendor.status === "executed" && !["pass", "fail"].includes(row.status) && !(ctx.policy && row.status === "unverified")) bad(`${at}: executed vendor must observe pass or fail`);
      if (vendor.status === "executed" && !ctx.policy && (row.status !== "pass" || scores.some((score) => score !== 1))) bad(`${at}: required executed criteria must all pass`);
      if (row.status === "pass" && !scores.every((s) => s === 1)) bad(`${at}: pass needs every criterion scored 1`);
      if (row.status === "fail" && !scores.includes(0)) bad(`${at}: fail needs a criterion scored 0`);
      if (["unverified", "not-run"].includes(row.status) && (ctx.policy && vendor.status === "executed" ? scores.includes(0) : !scores.every((s) => s === null))) bad(`${at}: unobserved case must score null`);
      const evidence = row.evidence;
      if ((["pass", "fail"].includes(row.status) || scores.some((score) => score !== null)) && !evidence.length) bad(`${at}: observed case needs bounded evidence`);
      for (const item of evidence) {
        try { if (sha(readBounded(ctx.reportDir, item.path)) !== item.sha256) bad(`${at}: evidence hash mismatch ${item.path}`); }
        catch { bad(`${at}: evidence refused`); }
      }
      passed += scores.filter((score) => score === 1).length;
      unverified += scores.filter((score) => score === null).length;
    }
  }
  if (ctx.policy) {
    if (vendors.filter((v) => v.status === "executed").map((v) => v.vendor).sort().join() !== ctx.policy.executed.join()) bad("policy executed vendors changed");
    if (ctx.stage === "baseline" && vectorSha(report) !== ctx.policy.vector) bad("baseline score vector changed");
  }
  if (ctx.stage === "candidate" && !ctx.baseline) bad("candidate requires baseline");
  if (ctx.stage === "candidate" && ctx.baseline) {
    if (!reportShape(ctx.baseline)) return { problems: [...problems, "invalid baseline shape"], passed, unverified };
    const before = validateReport(ctx.baseline, { ...ctx, stage: "baseline", scope: "baseline", manifestSha: ctx.baseline.sourceManifestSha256, baseline: undefined });
    if (before.problems.length) bad("baseline failed validation");
    const base = new Map<string, number | null>();
    for (const v of ctx.baseline.vendors ?? []) for (const r of v.cases ?? []) for (const c of r.criteria ?? []) base.set(`${v.vendor}/${r.id}/${c.id}`, c.score);
    for (const v of vendors) for (const r of v.cases ?? []) for (const c of r.criteria ?? []) {
      const before = base.get(`${v.vendor}/${r.id}/${c.id}`);
      if (ctx.policy ? before === undefined || (c.score !== 1 && c.score !== before) : typeof before === "number" && (c.score === null || before - c.score > 0.3)) bad(`criterion regression ${v.vendor}/${r.id}/${c.id}`);
    }
    if (ctx.baseline.datasetSha256 !== report?.datasetSha256) bad("candidate must use the baseline's dataset");
  }
  return { problems, passed, unverified };
}

// Synthetic fixtures: a tiny dataset, a good report with real evidence files, and adversarial edits of it.
const dataset: Dataset = { protocol: { vendors: ["claude", "codex"] }, cases: [{ id: "c1", input: "state A", expected: ["do x"], forbidden: ["do y"] }, { id: "c2", input: "state B", expected: ["do z"], forbidden: [] }] };
function fixture(): { dir: string; ctx: Context; report: Report } {
  const dir = deps.fs.realpathSync(deps.fs.mkdtempSync(`${deps.os.tmpdir()}/ic-live-`));
  fs.writeFileSync(path.join(dir, "ev.txt"), "tool observations");
  const cases = (observed: boolean): Row[] => dataset.cases.map((c) => ({
    id: c.id, inputSha256: sha(c.input), status: observed ? "pass" : "unverified", rationale: "ok",
    criteria: criteriaOf(c).map((id) => ({ id, score: observed ? 1 : null })), evidence: observed ? [{ path: "ev.txt", sha256: sha("tool observations") }] : [],
  }));
  const report = { schemaVersion: 1, stage: "baseline", scope: "baseline", datasetSha256: sha(JSON.stringify(dataset)), sourceManifestSha256: "a".repeat(64), scorerId: "scorer-1", promptEditorId: "editor-1",
    vendors: [{ vendor: "claude", status: "executed", nativeEntry: "/build", model: "m", cases: cases(true) }, { vendor: "codex", status: "unavailable", nativeEntry: "n/a", model: "n/a", cases: cases(false) }] };
  return { dir, report, ctx: { dataset, datasetSha: report.datasetSha256, manifestSha: report.sourceManifestSha256, reportDir: dir, stage: "baseline", scope: "baseline" } };
}
const problemsAfter = (edit: (report: Report, fx: ReturnType<typeof fixture>) => void, candidate = false): string => {
  const fx = fixture();
  try {
    if (candidate) { fx.ctx.stage = "candidate"; fx.ctx.scope = "build"; fx.ctx.baseline = structuredClone(fx.report); fx.report.stage = "candidate"; fx.report.scope = "build"; }
    edit(fx.report, fx);
    return validateReport(fx.report, fx.ctx).problems.join("\n");
  } finally { fs.rmSync(fx.dir, { recursive: true, force: true }); }
};

test("live validator accepts good evidence and counts unverified vendors separately", () => {
  const fx = fixture();
  try {
    assert.deepEqual(validateReport(fx.report, fx.ctx), { problems: [], passed: 3, unverified: 3 });
    fx.ctx.stage = "candidate"; fx.ctx.scope = "ship"; fx.ctx.baseline = structuredClone(fx.report); fx.report.stage = "candidate"; fx.report.scope = "ship";
    assert.deepEqual(validateReport(fx.report, fx.ctx).problems, []);
  } finally { fs.rmSync(fx.dir, { recursive: true, force: true }); }
});

test("live validator rejects adversarial evidence", () => {
  const cases: Array<[RegExp, (r: Report, fx: ReturnType<typeof fixture>) => void, boolean?]> = [
    [/schemaVersion must be 1/, (r) => { r.schemaVersion = 2; }],
    [/scope must be baseline/, (r) => { r.scope = "wrong"; }],
    [/vendors must match the dataset protocol exactly/, (r) => { r.vendors.pop(); }],
    [/bad status/, (r) => { r.vendors[1].status = "unknown"; }],
    [/executed needs nativeEntry and model/, (r) => { r.vendors[0].model = ""; }],
    [/score must be 0, 1 or null/, (r) => { r.vendors[0].cases[0].criteria[0].score = 0.5; }],
    [/rationale required/, (r) => { r.vendors[0].cases[0].rationale = ""; }],
    [/fail needs a criterion scored 0/, (r) => { r.vendors[0].cases[0].status = "fail"; }],
    [/unobserved case must score null/, (r) => { r.vendors[1].cases[0].criteria[0].score = 1; }],
    [/evidence refused/, (r) => { r.vendors[0].cases[0].evidence[0].path = "missing-evidence.txt"; }],
    [/invalid baseline shape/, (_r, fx) => { Object.assign(fx.ctx.baseline!, { vendors: null }); }, true],
    [/cases must match the dataset exactly/, (r) => { r.vendors[0].cases.pop(); }],
    [/cases must match the dataset exactly/, (r) => { r.vendors[0].cases.push({ ...r.vendors[0].cases[0], id: "extra" }); }],
    [/criteria must match/, (r) => { r.vendors[0].cases[0].criteria.pop(); }],
    [/stale inputSha256/, (r) => { r.vendors[0].cases[0].inputSha256 = sha("old"); }],
    [/stale datasetSha256/, (r) => { r.datasetSha256 = sha("old"); }],
    [/stale sourceManifestSha256/, (r) => { r.sourceManifestSha256 = "b".repeat(64); }, true],
    [/needs bounded evidence/, (r) => { r.vendors[0].cases[0].evidence = []; }],
    [/evidence hash mismatch/, (r) => { r.vendors[0].cases[0].evidence[0].sha256 = sha("forged"); }],
    [/independent/, (r) => { r.scorerId = r.promptEditorId; }],
    [/scorerId must not be the evaluated model/, (r) => { r.scorerId = r.vendors[0].model; }],
    [/unavailable vendor cannot report pass/, (r) => { Object.assign(r.vendors[1].cases[0], { status: "pass" }); }],
    [/executed vendor must observe/, (r) => { Object.assign(r.vendors[0].cases[0], { status: "unverified" }); }],
    [/pass needs every criterion scored 1/, (r) => { r.vendors[0].cases[0].criteria[1].score = 0; }],
    [/criterion regression/, (r) => { Object.assign(r.vendors[0].cases[0], { status: "fail" }); r.vendors[0].cases[0].criteria[0].score = 0; }, true],
    [/candidate must use the baseline's dataset/, (r, fx) => { fx.ctx.baseline!.datasetSha256 = sha("other"); }, true],
    [/at least one executed vendor/, (r) => { r.vendors[0] = structuredClone(r.vendors[1]); r.vendors[0].vendor = "claude"; }],
    [/required executed criteria must all pass/, (r) => { r.vendors[0].cases[0].status = "fail"; r.vendors[0].cases[0].criteria[0].score = 0; }],
    [/baseline failed validation/, (_r, fx) => { fx.ctx.baseline!.vendors[0].cases.pop(); }, true],
    [/candidate requires baseline/, (_r, fx) => { fx.ctx.baseline = undefined; }, true],
  ];
  for (const [pattern, edit, candidate] of cases) assert.match(problemsAfter(edit, candidate), pattern);
  const fx = fixture();
  try { assert.match(validateReport(null, fx.ctx).problems.join(), /invalid report shape/); }
  finally { fs.rmSync(fx.dir, { recursive: true, force: true }); }
});

test("S1 policy accepts only the pinned known baseline and rejects new or hidden loss", () => {
  const known = (r: Report): void => { // claude: c1 failed expected:0 (kept 0), c2 unverified
    Object.assign(r.vendors[0].cases[0], { status: "fail" }); r.vendors[0].cases[0].criteria[0].score = 0;
    Object.assign(r.vendors[0].cases[1], { status: "unverified", evidence: [] }); r.vendors[0].cases[1].criteria[0].score = null;
  };
  const run = (edit: (r: Report) => void, candidate: boolean, pinned = true): string => {
    const fx = fixture();
    try {
      known(fx.report);
      const policy = { executed: ["claude"], vector: pinned ? vectorSha(fx.report) : "0".repeat(64) };
      fx.ctx.policy = policy;
      if (candidate) { fx.ctx.stage = "candidate"; fx.ctx.scope = "build"; fx.ctx.baseline = structuredClone(fx.report); fx.report.stage = "candidate"; fx.report.scope = "build"; }
      edit(fx.report);
      return validateReport(fx.report, fx.ctx).problems.join("\n");
    } finally { fs.rmSync(fx.dir, { recursive: true, force: true }); }
  };
  const claude = (r: Report) => r.vendors[0].cases;
  const fx = fixture();
  try { known(fx.report); assert.match(validateReport(fx.report, fx.ctx).problems.join(), /required executed criteria must all pass/, "strict default still rejects known failures"); }
  finally { fs.rmSync(fx.dir, { recursive: true, force: true }); }
  assert.equal(run(() => {}, false), "", "pinned baseline accepted");
  assert.match(run(() => {}, false, false), /baseline score vector changed/);
  assert.match(run((r) => { claude(r)[0].criteria[1].score = 0; }, false), /baseline score vector changed/);
  assert.equal(run((r) => { claude(r)[0].criteria[0].score = 1; Object.assign(claude(r)[0], { status: "pass" }); Object.assign(claude(r)[1], { status: "pass", evidence: claude(r)[0].evidence }); claude(r)[1].criteria[0].score = 1; }, true), "", "0 and null may improve to 1");
  assert.equal(run(() => {}, true), "", "known failures may be retained");
  assert.match(run((r) => { r.vendors[1].status = "executed"; }, true), /policy executed vendors changed/);
  assert.match(run((r) => { claude(r)[0].evidence = []; }, true), /needs bounded evidence/);
  const regress: Array<(r: Report) => void> = [
    (r) => { claude(r)[0].criteria[1].score = 0; }, // new failure
    (r) => { claude(r)[0].criteria[1].score = null; }, // lost verified criterion
    (r) => { claude(r)[0].criteria[0].score = null; }, // known zero hidden as null
    (r) => { Object.assign(claude(r)[1], { status: "fail" }); claude(r)[1].criteria[0].score = 0; }, // null becomes a zero
  ];
  for (const edit of regress) assert.match(run(edit, true), /criterion regression/);
});

test("bounded evidence reader rejects oversized, escaping, symlink and non-regular paths", () => {
  const dir = deps.fs.realpathSync(deps.fs.mkdtempSync(`${deps.os.tmpdir()}/ic-read-`));
  const outside = deps.fs.realpathSync(deps.fs.mkdtempSync(`${deps.os.tmpdir()}/ic-out-`));
  try {
    fs.writeFileSync(path.join(outside, "secret.txt"), "secret");
    fs.writeFileSync(path.join(dir, "ok.txt"), "ok");
    fs.writeFileSync(path.join(dir, "big.bin"), new Uint8Array(MAX_EVIDENCE_BYTES + 1));
    fs.mkdirSync(path.join(dir, "folder"));
    fs.symlinkSync(path.join(outside, "secret.txt"), path.join(dir, "link.txt"));
    fs.symlinkSync(outside, path.join(dir, "linkdir"));
    assert.equal(new TextDecoder().decode(readBounded(dir, "ok.txt")), "ok");
    for (const rel of [".env", ".env.local", "credentials.json", "settings.local.json"]) {
      assert.throws(() => readBounded(dir, rel), /secret evidence path refused/, rel);
    }
    for (const [rel, message] of [["../x", /escapes/], [path.join(outside, "secret.txt"), /escapes/], ["big.bin", /too large/], ["folder", /not a regular file/],
      ["link.txt", /symlink/], ["linkdir/secret.txt", /symlink/], ["missing.txt", /ENOENT|no such/i]] as const) {
      assert.throws(() => readBounded(dir, rel), message, rel);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true }); }
});

// ---- required live mode (IC_EVAL_REQUIRED=1 only) ----------------------------------------------------------------
const required = process.env.IC_EVAL_REQUIRED === "1";
const need = (name: string): string => { const value = process.env[name]; assert.ok(value, `${name} is required when IC_EVAL_REQUIRED=1`); return value; };
const parse = (bytes: Uint8Array): unknown => { try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error("invalid evidence JSON"); } };
const loadReport = (file: string): Report => {
  const value = parse(readBounded(ROOT, path.relative(ROOT, path.resolve(file))));
  assert.ok(reportShape(value), "invalid report shape"); return value;
};

test("required mode: baseline or candidate live evidence validates against the golden dataset", { skip: !required && "set IC_EVAL_REQUIRED=1" }, () => {
  const phase = need("IC_PHASE");
  assert.ok(["baseline", ...PHASES].includes(phase), "IC_PHASE must be baseline|build|audit|ship");
  const policy = process.env.IC_EVAL_POLICY;
  if (policy === S1_POLICY) assert.ok(phase === "baseline" || phase === "build", `${S1_POLICY}: only baseline or build`);
  else if (policy !== undefined) assert.ok(policy === REMAINING_POLICY && ["baseline", "audit", "ship"].includes(phase), `${REMAINING_POLICY}: only baseline, audit or ship`);
  const reportFile = path.resolve(need("IC_EVAL_REPORT"));
  const datasetBytes = readBounded(ROOT, ".project/evals/datasets/instruction-compression.json"), spec = parse(datasetBytes);
  assert.ok(object(spec) && object(spec.protocol) && Array.isArray(spec.protocol.vendors) && spec.protocol.vendors.every(text) && Array.isArray(spec.cases));
  assert.ok(spec.cases.every((c: unknown) => object(c) && text(c.id) && text(c.input) && Array.isArray(c.expected) && c.expected.every(text) && Array.isArray(c.forbidden) && c.forbidden.every(text)), "invalid dataset shape");
  const dataset = spec as unknown as Dataset;
  const manifest = PHASES.flatMap((p) => [`.claude/skills/${p}/SKILL.md`, ...Object.keys(OWNERS[p])]).sort().map((rel) => `${rel} ${sha(fs.readFileSync(path.join(ROOT, rel)))}`).join("\n");
  const candidate = phase !== "baseline";
  const ctx: Context = { dataset, datasetSha: sha(datasetBytes), manifestSha: sha(manifest), reportDir: path.dirname(reportFile),
    stage: candidate ? "candidate" : "baseline", scope: phase, baseline: candidate ? loadReport(need("IC_EVAL_BASELINE")) : undefined, policy: policy ? S1_PIN : undefined };
  const result = validateReport(loadReport(reportFile), ctx);
  assert.deepEqual(result.problems, []);
});

test("required mode fails (not skips) without reports, proven in a child process", { skip: process.env.IC_CHILD === "1" && "child" }, () => {
  const self = urlPath(import.meta.url);
  for (const [extra, message] of [[{}, /IC_EVAL_REPORT is required/], [{ IC_PHASE: "unknown" }, /IC_PHASE must be/], [{ IC_EVAL_POLICY: S1_POLICY }, /IC_EVAL_REPORT is required/], [{ IC_EVAL_POLICY: S1_POLICY, IC_PHASE: "audit" }, /only baseline or build/], [{ IC_EVAL_POLICY: REMAINING_POLICY, IC_PHASE: "audit" }, /IC_EVAL_REPORT is required/], [{ IC_EVAL_POLICY: REMAINING_POLICY, IC_PHASE: "build" }, /only baseline, audit or ship/]] as const) {
    const env = { ...process.env, NODE_TEST_CONTEXT: undefined, IC_CHILD: "1", IC_EVAL_REQUIRED: "1", IC_PHASE: "baseline", IC_EVAL_REPORT: "", ...extra };
    const result = spawnSync(process.execPath, process.versions.bun ? ["test", self] : [...NODE_FLAGS, "--test", self], { env });
    assert.notEqual(result.status, 0, "required mode without a report must exit non-zero");
    assert.match(`${result.stdout}${result.stderr}`, message);
  }
});
