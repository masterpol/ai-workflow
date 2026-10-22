import { describe, test } from "node:test";
import assert from "node:assert";
import { dataFileErrorCodes, readData, readDataFile, writeData } from "./data-file.mts";
import { DATA_HEADER, MAX_DATA_BYTES } from "./toon-data.mts";
import { createTestDeps, tempFixture } from "./test-helpers.mts";
import type { RuntimeDeps } from "./types.mts";

/*
mutant-s2-absent-refusalReturnedAsAbsent
mutant-s2-write-overwritesMalformedFile
mutant-s2-write-followsSymlink
mutant-s2-both-presentPrefersToon
mutant-s2-write-skipsRoundTripCheck
mutant-s2-path-dotDotAccepted
mutant-s2-write-siblingHidesUnreadableTarget
*/

const deps = createTestDeps();
const { fs, path } = deps;
const GOOD = `${DATA_HEADER}\ncases[2]{id,n}:\n  a,1\n  b,2\n`;
const VALUE = { cases: [{ id: "a", n: 1 }, { id: "b", n: 2 }] };

function withRoot(files: Record<string, string>, run: (root: string) => void): void {
    const root = tempFixture(deps, files);
    try { run(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

function leftovers(root: string, dir = ""): string[] {
    return fs.readdirSync(path.join(root, dir)).filter((name) => name.endsWith(".tmp"));
}

describe("readData outcomes", () => {
    test("parsed from .toon, from .json, and by bare stem", () => {
        withRoot({ "d/a.toon": GOOD, "d/b.json": JSON.stringify(VALUE) }, (root) => {
            const toon = readData(root, "d/a.toon", deps);
            assert.deepStrictEqual(toon.status === "parsed" && [toon.value, toon.format], [VALUE, "toon"]);
            const json = readData(root, "d/b.json", deps);
            assert.deepStrictEqual(json.status === "parsed" && [json.value, json.format], [VALUE, "json"]);
            assert.strictEqual((readData(root, "d/a", deps) as { format: string }).format, "toon");
            assert.strictEqual((readData(root, "d/b", deps) as { format: string }).format, "json");
        });
    });

    test("absent only for a missing file", () => {
        withRoot({ "d/x.txt": "x" }, (root) => {
            assert.deepStrictEqual(readData(root, "d/missing.toon", deps), { status: "absent" });
            assert.deepStrictEqual(readData(root, "nodir/missing.json", deps), { status: "absent" });
            assert.deepStrictEqual(readData(root, "d/missing", deps), { status: "absent" });
        });
    });

    test("a damaged or hostile file is refused, never absent", () => {
        withRoot({
            "bad/header.toon": "a: 1\n",
            "bad/count.toon": `${DATA_HEADER}\nr[2]: 1\n`,
            "bad/json.json": "{not json",
            "bad/array.json": "[1,2]",
            "bad/proto.json": '{"a":{"__proto__":{"x":1}}}',
            "bad/utf8.toon": { content: new Uint8Array([0x40, 0xff, 0xfe]) } as never,
            "bad/big.toon": `${DATA_HEADER}\n${"a: 1\n".repeat(MAX_DATA_BYTES / 4)}`,
            "real/target.toon": GOOD,
            "dir.toon/inner": "x",
        }, (root) => {
            fs.symlinkSync(path.join(root, "real/target.toon"), path.join(root, "bad/link.toon"));
            fs.symlinkSync(path.join(root, "real"), path.join(root, "linkdir"));
            const cases: Array<[string, string]> = [
                ["bad/header.toon", "DATA-HEADER"], ["bad/count.toon", "DATA-COUNT-MISMATCH"], ["bad/json.json", dataFileErrorCodes.json],
                ["bad/array.json", dataFileErrorCodes.jsonRoot], ["bad/proto.json", dataFileErrorCodes.forbiddenKey],
                ["bad/utf8.toon", dataFileErrorCodes.encoding], ["bad/big.toon", dataFileErrorCodes.oversize],
                ["bad/link.toon", dataFileErrorCodes.symlink], ["linkdir/target.toon", dataFileErrorCodes.symlink],
                ["dir.toon", dataFileErrorCodes.notFile],
            ];
            for (const [rel, code] of cases) {
                const result = readData(root, rel, deps);
                assert.strictEqual(result.status, "refused", rel);
                assert.strictEqual((result as { code: string }).code, code, rel);
            }
        });
    });

    test("each bad file yields exactly one refusal and no text from the file", () => {
        withRoot({ "a.toon": `${DATA_HEADER}\nsecret: "TOPSECRET`, "b.json": '{"TOPSECRET":', "c.toon": `${DATA_HEADER}\nr[9]: TOPSECRET\n` }, (root) => {
            for (const rel of ["a.toon", "b.json", "c.toon"]) {
                const result = readData(root, rel, deps);
                assert.strictEqual(result.status, "refused");
                assert.ok(!JSON.stringify(result).includes("TOPSECRET"));
            }
        });
    });

    test("both a .toon and a .json present is an error whichever name is asked for", () => {
        withRoot({ "d/s.toon": GOOD, "d/s.json": JSON.stringify(VALUE) }, (root) => {
            for (const rel of ["d/s", "d/s.toon", "d/s.json"]) {
                assert.strictEqual((readData(root, rel, deps) as { code: string }).code, dataFileErrorCodes.bothPresent, rel);
            }
        });
    });

    test("paths that leave the project root or are not plain relative paths are refused", () => {
        withRoot({ "d/a.toon": GOOD }, (root) => {
            for (const rel of ["../a.toon", "d/../a.toon", "/etc/passwd.json", "d//a.toon", "", "d\\a.toon", "d/a\0.toon", "./a.toon"]) {
                const result = readData(root, rel, deps);
                assert.strictEqual(result.status, "refused", JSON.stringify(rel));
                assert.strictEqual((result as { code: string }).code, dataFileErrorCodes.path);
            }
        });
    });
});

describe("writeData", () => {
    test("creates a new file, replaces a good one, leaves no temp file", () => {
        withRoot({ "d/keep.txt": "k" }, (root) => {
            const first = writeData(root, "d/n.toon", VALUE, deps);
            assert.strictEqual(first.status, "written");
            assert.deepStrictEqual((readData(root, "d/n.toon", deps) as { value: unknown }).value, VALUE);
            const second = writeData(root, "d/n.toon", { other: [1, 2] }, deps);
            assert.strictEqual(second.status, "written");
            assert.deepStrictEqual((readData(root, "d/n.toon", deps) as { value: unknown }).value, { other: [1, 2] });
            assert.deepStrictEqual(leftovers(root, "d"), []);
        });
    });

    test("never overwrites a file the reader refuses (hostile shapes)", () => {
        withRoot({ "d/mal.toon": `${DATA_HEADER}\nr[3]: 1\n`, "d/big.toon": `${DATA_HEADER}\n${"a: 1\n".repeat(MAX_DATA_BYTES / 4)}`, "real/t.toon": "ORIGINAL", "d/dir.toon/x": "x" }, (root) => {
            fs.symlinkSync(path.join(root, "real/t.toon"), path.join(root, "d/link.toon"));
            fs.symlinkSync(path.join(root, "real"), path.join(root, "linkdir"));
            const before = { mal: fs.readFileSync(path.join(root, "d/mal.toon")), real: fs.readFileSync(path.join(root, "real/t.toon")) };
            for (const rel of ["d/mal.toon", "d/big.toon", "d/link.toon", "linkdir/t.toon", "d/dir.toon", "nodir/new.toon"]) {
                const result = writeData(root, rel, VALUE, deps);
                assert.strictEqual(result.status, "refused", rel);
            }
            assert.strictEqual(fs.readFileSync(path.join(root, "d/mal.toon")), before.mal);
            assert.strictEqual(fs.readFileSync(path.join(root, "real/t.toon")), before.real);
            assert.strictEqual(fs.existsSync(path.join(root, "nodir")), false);
            assert.deepStrictEqual(leftovers(root, "d"), []);
        });
    });

    test("refuses a value the grammar cannot carry and writes nothing", () => {
        withRoot({ "d/keep.txt": "k" }, (root) => {
            for (const bad of [{ a: undefined }, { a: NaN }, JSON.parse('{"__proto__":{"x":1}}'), [], "text", { a: [[{ x: 1 }]] }]) {
                assert.strictEqual(writeData(root, "d/n.toon", bad, deps).status, "refused");
            }
            assert.strictEqual(fs.existsSync(path.join(root, "d/n.toon")), false);
        });
    });

    test("a value that would not read back identical is refused before anything is written", () => {
        withRoot({ "d/keep.txt": "k" }, (root) => {
            const bare = Object.create(null) as Record<string, unknown>;
            bare.a = 1;
            const result = writeData(root, "d/n.toon", { nested: bare }, deps);
            assert.strictEqual((result as { code: string }).code, dataFileErrorCodes.roundTrip);
            assert.strictEqual(fs.existsSync(path.join(root, "d/n.toon")), false);
        });
    });

    test("only .toon targets, and a .json sibling blocks the write unless the converter allows it", () => {
        withRoot({ "d/s.json": JSON.stringify(VALUE) }, (root) => {
            assert.strictEqual((writeData(root, "d/s.json", VALUE, deps) as { code: string }).code, dataFileErrorCodes.notToon);
            assert.strictEqual((writeData(root, "d/s.toon", VALUE, deps) as { code: string }).code, dataFileErrorCodes.bothPresent);
            assert.strictEqual(fs.existsSync(path.join(root, "d/s.toon")), false);
            assert.strictEqual(writeData(root, "d/s.toon", VALUE, deps, { allowJsonSibling: true }).status, "written");
        });
    });

    test("an unreadable existing target is not overwritten even when a .json sibling is allowed", () => {
        withRoot({ "d/n.toon": `${DATA_HEADER}\nr[3]: 1\n`, "d/n.json": "{}" }, (root) => {
            const before = fs.readFileSync(path.join(root, "d/n.toon"));
            const result = writeData(root, "d/n.toon", VALUE, deps, { allowJsonSibling: true });
            assert.strictEqual(result.status, "refused");
            assert.strictEqual(fs.readFileSync(path.join(root, "d/n.toon")), before);
        });
    });

    test("rejects escaping paths", () => {
        withRoot({ "d/a.toon": GOOD }, (root) => {
            for (const rel of ["../x.toon", "/tmp/x.toon", "d/../../x.toon"]) assert.strictEqual(writeData(root, rel, VALUE, deps).status, "refused");
        });
    });

    test("a failed write leaves the existing file intact", () => {
        withRoot({ "d/n.toon": GOOD }, (root) => {
            const broken = { ...deps, fs: { ...deps.fs, renameSync: () => { throw Object.assign(new Error("x"), { code: "EIO" }); } } } as typeof deps;
            const result = writeData(root, "d/n.toon", { z: 1 }, broken);
            assert.strictEqual(result.status, "refused");
            assert.strictEqual(fs.readFileSync(path.join(root, "d/n.toon")), GOOD);
            assert.deepStrictEqual(leftovers(root, "d"), []);
        });
    });
});

function withFs(overrides: Partial<RuntimeDeps["fs"]>): RuntimeDeps {
    return { ...deps, fs: { ...deps.fs, ...overrides } } as RuntimeDeps;
}

describe("audit cycle 1 regressions", () => {
    test("a lone surrogate is written escaped and reads back identical (the bytes are judged, not the string)", () => {
        withRoot({ "d/keep.txt": "k" }, (root) => {
            const value = { s: "ab\ud800cd", t: ["\udc00"] };
            assert.strictEqual(writeData(root, "d/n.toon", value, deps).status, "written");
            const read = readData(root, "d/n.toon", deps);
            assert.ok(read.status === "parsed" && read.value.s === "ab\ud800cd");
        });
    });

    test("a short write is continued, and a stalled write is refused without touching the existing file", () => {
        withRoot({ "d/n.toon": GOOD }, (root) => {
            const half = withFs({ writeSync: (fd: number, data: string | Uint8Array) => deps.fs.writeSync(fd, typeof data === "string" ? data.slice(0, 7) : data.subarray(0, 7)) });
            assert.strictEqual(writeData(root, "d/m.toon", VALUE, half).status, "written");
            assert.deepStrictEqual((readData(root, "d/m.toon", deps) as { value: unknown }).value, VALUE);
            const stalled = withFs({ writeSync: () => 0 });
            assert.strictEqual(writeData(root, "d/n.toon", { z: 1 }, stalled).status, "refused");
            assert.strictEqual(fs.readFileSync(path.join(root, "d/n.toon")), GOOD);
            assert.deepStrictEqual(leftovers(root, "d"), []);
        });
    });

    test("a file the reader would refuse that appears just before publishing is not overwritten", () => {
        withRoot({ "d/keep.txt": "k" }, (root) => {
            const planted = `${DATA_HEADER}\nr[3]: 1\n`;
            const racing = withFs({ fsyncSync: (fd: number) => { deps.fs.fsyncSync(fd); fs.writeFileSync(path.join(root, "d/n.toon"), planted); } });
            const result = writeData(root, "d/n.toon", VALUE, racing);
            assert.strictEqual(result.status, "refused");
            assert.strictEqual(fs.readFileSync(path.join(root, "d/n.toon")), planted);
            assert.deepStrictEqual(leftovers(root, "d"), []);
        });
    });

    test("an existing target replaced by another file before publishing is not overwritten", () => {
        withRoot({ "d/n.toon": GOOD }, (root) => {
            const swapped = `${DATA_HEADER}\nsomeone: else\n`;
            const racing = withFs({ fsyncSync: (fd: number) => { deps.fs.fsyncSync(fd); fs.unlinkSync(path.join(root, "d/n.toon")); fs.writeFileSync(path.join(root, "d/n.toon"), swapped); } });
            assert.strictEqual(writeData(root, "d/n.toon", { z: 1 }, racing).status, "refused");
            assert.strictEqual(fs.readFileSync(path.join(root, "d/n.toon")), swapped);
        });
    });

    test("an existing target edited in place before publishing is not overwritten", () => {
        withRoot({ "d/n.toon": GOOD }, (root) => {
            const edited = `${DATA_HEADER}\nr[3]: 1\n`;
            const racing = withFs({ fsyncSync: (fd: number) => { deps.fs.fsyncSync(fd); fs.writeFileSync(path.join(root, "d/n.toon"), edited); } });
            assert.strictEqual(writeData(root, "d/n.toon", { z: 1 }, racing).status, "refused");
            assert.strictEqual(fs.readFileSync(path.join(root, "d/n.toon")), edited);
        });
    });

    test("a successful write reports the identity of the file it published", () => {
        withRoot({ "d/keep.txt": "k" }, (root) => {
            const result = writeData(root, "d/n.toon", VALUE, deps);
            assert.ok(result.status === "written");
            const stat = fs.lstatSync(path.join(root, "d/n.toon"));
            assert.ok(result.status === "written" && result.dev === stat.dev && result.ino === stat.ino);
        });
    });

    test("a directory swapped for a symlink before publishing cannot move the write outside the root", () => {
        withRoot({ "d/keep.txt": "k", "outside/x.txt": "o" }, (root) => {
            const inner = path.join(root, "inner");
            fs.mkdirSync(inner);
            fs.writeFileSync(path.join(inner, "keep.txt"), "k");
            const outside = path.join(root, "outside");
            const racing = withFs({ fsyncSync: (fd: number) => { deps.fs.fsyncSync(fd); fs.renameSync(inner, `${inner}.orig`); fs.symlinkSync(outside, inner); } });
            assert.strictEqual(writeData(root, "inner/n.toon", VALUE, racing).status, "refused");
            assert.deepStrictEqual(fs.readdirSync(outside).sort(), ["x.txt"]);
        });
    });

    test("a new file is published with a link, so a file created in the last instant is never replaced", () => {
        withRoot({ "d/keep.txt": "k" }, (root) => {
            const planted = `${DATA_HEADER}\nsomeone: else\n`;
            const racing = withFs({ linkSync: (from: string, to: string) => { fs.writeFileSync(to, planted); deps.fs.linkSync(from, to); } });
            const result = writeData(root, "d/n.toon", VALUE, racing);
            assert.strictEqual(result.status, "refused");
            assert.strictEqual(fs.readFileSync(path.join(root, "d/n.toon")), planted);
            assert.deepStrictEqual(leftovers(root, "d"), []);
        });
    });

    test("createOnly never replaces an existing file and publishes a new one without leftovers", () => {
        withRoot({ "d/n.toon": GOOD }, (root) => {
            assert.strictEqual((writeData(root, "d/n.toon", { z: 1 }, deps, { createOnly: true }) as { code: string }).code, dataFileErrorCodes.exists);
            assert.strictEqual(fs.readFileSync(path.join(root, "d/n.toon")), GOOD);
            assert.strictEqual(writeData(root, "d/fresh.toon", VALUE, deps, { createOnly: true }).status, "written");
            assert.deepStrictEqual(leftovers(root, "d"), []);
        });
    });

    test("the open-time guards hold when the file is swapped after it was inspected", () => {
        const swapAndRead = (swap: (root: string, file: string) => void): ReturnType<typeof readData> => {
            let result: ReturnType<typeof readData> | undefined;
            withRoot({ "d/a.toon": GOOD, "d/other.toon": GOOD }, (root) => {
                const file = path.join(root, "d/a.toon");
                let done = false;
                const racing = withFs({ openSync: (target: string, flags: string | number, mode?: number) => { if (!done && target === file && typeof flags === "number") { done = true; swap(root, file); } return deps.fs.openSync(target, flags, mode); } });
                result = readData(root, "d/a.toon", racing);
            });
            return result as ReturnType<typeof readData>;
        };
        // A symlink to the very same inode passes the identity pin, so only O_NOFOLLOW stops it.
        const link = swapAndRead((root, file) => { fs.renameSync(file, `${file}.moved`); fs.symlinkSync(`${file}.moved`, file); });
        assert.strictEqual(link.status, "refused");
        // A different regular file at the same path is stopped by the identity pin.
        const replaced = swapAndRead((root, file) => { fs.unlinkSync(file); fs.writeFileSync(file, GOOD); });
        assert.strictEqual(replaced.status, "refused");
        assert.strictEqual((replaced as { code: string }).code, dataFileErrorCodes.changed);
    });

    test("a file that keeps producing bytes after it was measured is refused", () => {
        withRoot({ "d/a.toon": GOOD }, (root) => {
            const endless = withFs({ readSync: (_fd: number, buffer: Uint8Array, offset: number, length: number) => { buffer.fill(97, offset, offset + length); return length; } });
            const result = readData(root, "d/a.toon", endless);
            assert.strictEqual((result as { code: string }).code, dataFileErrorCodes.oversize);
        });
    });

    test("json nesting follows the TOON grammar: objects are limited to 32 levels, arrays alone do not use that budget", () => {
        const chain = (levels: number): string => `${"{\"k\":".repeat(levels)}1${"}".repeat(levels)}`;
        const mixed = (objectLevels: number): string => `${"{\"k\":[".repeat(objectLevels)}1${"]}".repeat(objectLevels)}`;
        withRoot({ "d/ok32.json": chain(31), "d/bad33.json": chain(33), "d/mixed20.json": mixed(20), "d/arrays.json": `{"a":${"[".repeat(500)}${"]".repeat(500)}}` }, (root) => {
            assert.strictEqual(readData(root, "d/ok32.json", deps).status, "parsed");
            assert.strictEqual((readData(root, "d/bad33.json", deps) as { code: string }).code, "DATA-DEPTH");
            assert.strictEqual(readData(root, "d/mixed20.json", deps).status, "parsed");
            assert.strictEqual((readData(root, "d/arrays.json", deps) as { code: string }).code, "DATA-DEPTH");
        });
    });

    test("readDataFile judges one file on its own, even when a sibling exists", () => {
        withRoot({ "d/s.toon": GOOD, "d/s.json": JSON.stringify(VALUE) }, (root) => {
            const toon = readDataFile(root, "d/s.toon", deps);
            assert.ok(toon.status === "parsed" && toon.format === "toon" && toon.text === GOOD);
            assert.ok(readDataFile(root, "d/s.json", deps).status === "parsed");
            assert.deepStrictEqual(readDataFile(root, "d/none.toon", deps), { status: "absent" });
            assert.strictEqual((readDataFile(root, "d/s", deps) as { code: string }).code, dataFileErrorCodes.path);
            assert.strictEqual(readData(root, "d/s", deps).status, "refused");
        });
    });
});
