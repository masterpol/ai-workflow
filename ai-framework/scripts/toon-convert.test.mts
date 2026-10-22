import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { dataEquals } from "./runtime/toon-data.mts";
import { convertOne, main, measure, verdictOf } from "./toon-convert.mts";
import { readData } from "./runtime/data-file.mts";
import { createTestDeps, tempFixture } from "./runtime/test-helpers.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

/*
mutant-s3-apply-skipsReadBackFromDisk
mutant-s3-apply-replacesForeignToon
mutant-s3-dryRun-writesFile
mutant-s3-removeJson-withoutFlag
mutant-s3-report-claimsSavingWhenProxiesDisagree
*/

const deps = createTestDeps();
const { fs, path } = deps;
const REPO = path.resolve(decodeURIComponent(new URL(".", import.meta.url).pathname), "../..");
// Files this repository tracks. A sibling pitch's dataset is not listed: it can be absent on a clean checkout.
const REAL = [".project/evals/datasets/orca-vendor-orchestration.json", ".project/evals/datasets/toon-machine-data.json"];

function project(t: { after(fn: () => void): void }, files: Record<string, string>): string {
    const root = tempFixture(deps, files);
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    return root;
}
const exists = (root: string, rel: string): boolean => fs.existsSync(path.join(root, rel));
function run(argv: string[], root: string): { code: number; out: string; err: string } {
    let out = "", err = "";
    const io = { ...deps.io, stdout: { write: (s: string) => { out += s; }, isTTY: false }, stderr: { write: (s: string) => { err += s; }, isTTY: false } };
    const code = main(argv, { ...deps, io, proc: { ...deps.proc, cwd: () => root } } as RuntimeDeps);
    return { code, out, err };
}

const TABLE = JSON.stringify({ cases: Array.from({ length: 30 }, (_, i) => ({ id: `case-${i}`, status: "extracted", reason: "" })) }, null, 2);

describe("conversion", () => {
    test("dry-run reports and writes nothing", (t) => {
        const root = project(t, { "d/a.json": TABLE });
        const result = run(["--dry-run", "--report", "d/a.json"], root);
        assert.equal(result.code, 0);
        assert.match(result.out, /would-convert d\/a\.json/);
        assert.match(result.out, /proxies, not a tokenizer/);
        assert.equal(exists(root, "d/a.toon"), false);
        assert.equal(fs.readFileSync(path.join(root, "d/a.json")), TABLE);
    });

    test("default mode is dry-run", (t) => {
        const root = project(t, { "d/a.json": TABLE });
        assert.equal(run(["d/a.json"], root).code, 0);
        assert.equal(exists(root, "d/a.toon"), false);
    });

    test("--apply writes the toon, keeps the json, and then both present is an error for readers", (t) => {
        const root = project(t, { "d/a.json": TABLE });
        const result = run(["--apply", "d/a.json"], root);
        assert.equal(result.code, 0);
        assert.match(result.out, /converted d\/a\.json/);
        assert.equal(exists(root, "d/a.json"), true);
        assert.equal(exists(root, "d/a.toon"), true);
        const read = readData(root, "d/a", deps);
        assert.equal(read.status, "refused");
    });

    test("--remove-json converts, verifies from disk, and removes the json; the data reads back identical", (t) => {
        const root = project(t, { "d/a.json": TABLE });
        const result = run(["--remove-json", "d/a.json"], root);
        assert.equal(result.code, 0);
        assert.equal(exists(root, "d/a.json"), false);
        const read = readData(root, "d/a", deps);
        assert.ok(read.status === "parsed" && read.format === "toon" && dataEquals(read.value, JSON.parse(TABLE)));
    });

    test("never replaces a .toon it did not write", (t) => {
        const root = project(t, { "d/a.json": TABLE, "d/a.toon": "HAND WRITTEN" });
        const result = run(["--remove-json", "d/a.json"], root);
        assert.equal(result.code, 1);
        assert.equal(fs.readFileSync(path.join(root, "d/a.toon")), "HAND WRITTEN");
        assert.equal(exists(root, "d/a.json"), true);
    });

    test("never replaces a valid .toon it did not write either", (t) => {
        const foreign = "@toon-data 1\nmine: true\n";
        const root = project(t, { "d/a.json": TABLE, "d/a.toon": foreign });
        assert.equal(run(["--apply", "d/a.json"], root).code, 1);
        assert.equal(fs.readFileSync(path.join(root, "d/a.toon")), foreign);
    });

    test("a write that lands corrupted on disk is detected, removed and the json is kept", (t) => {
        const root = project(t, { "d/a.json": TABLE });
        const bytes = new TextEncoder().encode("@toon-data 1\nr[9]: 1\n");
        const corrupting = { ...deps, fs: { ...deps.fs, writeSync: (fd: number) => deps.fs.writeSync(fd, bytes) } } as RuntimeDeps;
        const result = convertOne(root, "d/a.json", { apply: true, removeJson: true }, corrupting);
        assert.equal(result.status, "refused");
        assert.equal(exists(root, "d/a.toon"), false);
        assert.equal(fs.readFileSync(path.join(root, "d/a.json")), TABLE);
    });

    test("a json edited after it was read is kept, with its new content, and the toon is not left claiming otherwise", (t) => {
        const root = project(t, { "d/a.json": TABLE });
        const edited = JSON.stringify({ edited: true });
        let once = false;
        const racing = { ...deps, fs: { ...deps.fs, linkSync: (from: string, to: string) => { deps.fs.linkSync(from, to); if (!once) { once = true; fs.writeFileSync(path.join(root, "d/a.json"), edited); } } } } as RuntimeDeps;
        const result = convertOne(root, "d/a.json", { apply: true, removeJson: true }, racing);
        assert.equal(result.status, "refused");
        assert.match(result.reason ?? "", /changed during conversion/);
        assert.equal(fs.readFileSync(path.join(root, "d/a.json")), edited);
    });

    test("a json that was only reformatted after it was read is still kept, not deleted", (t) => {
        const root = project(t, { "d/a.json": TABLE });
        let once = false;
        const reformatted = JSON.stringify(JSON.parse(TABLE));
        const racing = { ...deps, fs: { ...deps.fs, linkSync: (from: string, to: string) => { deps.fs.linkSync(from, to); if (!once) { once = true; fs.writeFileSync(path.join(root, "d/a.json"), reformatted); } } } } as RuntimeDeps;
        const result = convertOne(root, "d/a.json", { apply: true, removeJson: true }, racing);
        assert.equal(result.status, "refused");
        assert.equal(fs.readFileSync(path.join(root, "d/a.json")), reformatted);
    });

    test("a valid toon that appears after the pair check is not replaced", (t) => {
        const root = project(t, { "d/a.json": TABLE });
        const foreign = "@toon-data 1\nmine: true\n";
        let seen = 0;
        const racing = { ...deps, fs: { ...deps.fs, lstatSync: (target: string) => { if (target.endsWith("d/a.toon") && ++seen === 2) fs.writeFileSync(target, foreign); return deps.fs.lstatSync(target); } } } as RuntimeDeps;
        const result = convertOne(root, "d/a.json", { apply: true, removeJson: true }, racing);
        assert.equal(result.status, "refused");
        assert.equal(fs.readFileSync(path.join(root, "d/a.toon")), foreign);
        assert.equal(fs.readFileSync(path.join(root, "d/a.json")), TABLE);
    });

    test("a foreign toon that replaced the published one is not deleted by the cleanup", (t) => {
        const root = project(t, { "d/a.json": TABLE });
        const foreign = "@toon-data 1\nmine: true\n";
        let once = false;
        const racing = { ...deps, fs: { ...deps.fs, linkSync: (from: string, to: string) => { deps.fs.linkSync(from, to); if (!once) { once = true; fs.unlinkSync(to); fs.writeFileSync(to, foreign); } } } } as RuntimeDeps;
        const result = convertOne(root, "d/a.json", { apply: true, removeJson: true }, racing);
        assert.equal(result.status, "refused");
        assert.match(result.reason ?? "", /left alone/);
        assert.equal(fs.readFileSync(path.join(root, "d/a.toon")), foreign);
        assert.equal(fs.readFileSync(path.join(root, "d/a.json")), TABLE);
    });

    test("a toon that disappears after it was written leaves the json in place", (t) => {
        const root = project(t, { "d/a.json": TABLE });
        const racing = { ...deps, fs: { ...deps.fs, linkSync: (from: string, to: string) => { deps.fs.linkSync(from, to); fs.unlinkSync(to); } } } as RuntimeDeps;
        const result = convertOne(root, "d/a.json", { apply: true, removeJson: true }, racing);
        assert.equal(result.status, "refused");
        assert.equal(fs.readFileSync(path.join(root, "d/a.json")), TABLE);
    });

    test("a file the grammar cannot carry stays JSON and is reported as skipped, not as a failure to hide", (t) => {
        const hard = JSON.stringify({ deep: [[{ x: 1 }]] });
        const root = project(t, { "d/h.json": hard });
        const result = run(["--remove-json", "d/h.json"], root);
        assert.match(result.out, /skipped d\/h\.json: stays JSON/);
        assert.equal(result.code, 0);
        assert.equal(fs.readFileSync(path.join(root, "d/h.json")), hard);
        assert.equal(exists(root, "d/h.toon"), false);
    });

    test("hostile json is refused with nothing written", (t) => {
        const root = project(t, { "d/p.json": '{"__proto__":{"x":1}}', "d/bad.json": "{nope", "d/arr.json": "[1]", "real/t.json": "{}" });
        fs.symlinkSync(path.join(root, "real/t.json"), path.join(root, "d/link.json"));
        for (const rel of ["d/p.json", "d/bad.json", "d/arr.json", "d/link.json", "d/missing.json", "d/notjson.txt"]) {
            const result = run(["--remove-json", rel], root);
            assert.equal(result.code, 1, rel);
            assert.equal(exists(root, rel.replace(/\.json$/, ".toon")), false, rel);
        }
        assert.equal(exists(root, "d/p.json"), true);
    });

    test("usage errors exit 2", (t) => {
        const root = project(t, {});
        for (const argv of [[], ["--bogus", "a.json"], ["--dry-run", "--apply", "a.json"], ["--root"]]) {
            assert.equal(run(argv, root).code, 2, argv.join(" "));
        }
    });
});

describe("real files, read only (a stub parser cannot pass this)", () => {
    test("each real dataset converts in a temp copy and reads back deep-equal", (t) => {
        const files: Record<string, string> = {};
        for (const rel of REAL) files[rel] = fs.readFileSync(path.join(REPO, rel));
        const root = project(t, files);
        for (const rel of REAL) {
            const result = convertOne(root, rel, { apply: true, removeJson: true }, deps);
            assert.equal(result.status, "converted", `${rel}: ${result.reason}`);
            const back = readData(root, rel.replace(/\.json$/, ""), deps);
            assert.ok(back.status === "parsed" && back.format === "toon" && dataEquals(back.value, JSON.parse(files[rel])), rel);
        }
    });

    test("the repository's own files were not touched by the run above", () => {
        for (const rel of REAL) assert.equal(fs.existsSync(path.join(REPO, rel.replace(/\.json$/, ".toon"))), false);
    });
});

describe("report honesty", () => {
    test("names its method and reports a no-saving or larger result instead of hiding it", (t) => {
        const tiny = JSON.stringify({ a: 1 });
        const root = project(t, { "d/t.json": tiny });
        const result = run(["--dry-run", "--report", "d/t.json"], root);
        assert.match(result.out, /note: (larger|no saving|mixed)/);
        assert.match(result.out, /chars\/4/);
        assert.match(result.out, /lexemes/);
        assert.doesNotMatch(result.out, /tokens saved/i);
    });

    test("when the two proxies disagree the verdict is mixed, never smaller", () => {
        const m = (chars4: number, lexemes: number) => ({ bytes: 0, chars4, lexemes });
        assert.equal(verdictOf(m(10, 5), m(20, 20)), "smaller");
        assert.equal(verdictOf(m(30, 5), m(20, 20)), "mixed");
        assert.equal(verdictOf(m(10, 30), m(20, 20)), "mixed");
        assert.equal(verdictOf(m(30, 30), m(20, 20)), "larger");
        assert.equal(verdictOf(m(20, 20), m(20, 20)), "no saving");
        assert.equal(verdictOf(m(20, 10), m(20, 20)), "smaller");
    });

    test("a tie on one proxy with a drop on the other is smaller; a rise on either is never smaller", () => {
        const m = (chars4: number, lexemes: number) => ({ bytes: 0, chars4, lexemes });
        assert.equal(verdictOf(m(20, 10), m(20, 20)), "smaller");
        assert.equal(verdictOf(m(21, 10), m(20, 20)), "mixed");
    });

    test("measure counts words and punctuation runs, not whitespace", () => {
        assert.equal(measure("a b").lexemes, 2);
        assert.equal(measure('{"a":1}').lexemes, 7);
        assert.equal(measure("    ").lexemes, 0);
        assert.equal(measure("abcdefgh").chars4, 2);
    });
});
