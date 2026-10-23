import { describe, test } from "node:test";
import assert from "node:assert";
import { accountFiles, bodyHashOf, destinationPath, destinationRefusal, groupHashOf, HASH_PATTERN, isGroupPath, MAX_PITCH_FILES, validateLedgerShape } from "./ledger-schema.mts";
import { createTestDeps } from "./runtime/test-helpers.mts";

const deps = createTestDeps();
const { fs, path } = deps;

describe("ledger schema", () => {
  test("bodyHashOf ignores line endings and trailing whitespace but not content", () => {
    const digest = (data: string): string => deps.crypto.sha256Hex(data);
    assert.match(bodyHashOf("a\nb", digest), HASH_PATTERN);
    assert.strictEqual(bodyHashOf("a\r\nb\n\n", digest), bodyHashOf("a\nb", digest));
    assert.notStrictEqual(bodyHashOf("a\nb", digest), bodyHashOf("a\nc", digest));
  });

  test("destinations must be plain relative paths, and kept behavior and decisions cannot live in the index or outcome record", () => {
    for (const bad of ["", "/etc/passwd", "../x.md", "a/../b.md", "a//b.md", "a\\b.md", "./a.md", "a\0b.md"]) assert.strictEqual(destinationPath(bad), null, JSON.stringify(bad));
    assert.strictEqual(destinationPath("docs/a.md#anchor"), "docs/a.md");
    assert.match(destinationRefusal(".project/pitches/x/notes.md#a") ?? "", /not a lasting home/);
    assert.match(destinationRefusal(".project/done-work.md", "behavior") ?? "", /owning document/);
    assert.match(destinationRefusal(".project/records/shipped/x.md", "decision") ?? "", /owning document/);
    assert.strictEqual(destinationRefusal(".project/done-work.md", "limit"), null);
    assert.strictEqual(destinationRefusal("docs/product.md", "behavior"), null);
  });

  test("every committed v1 ledger in this project is still readable (skipped when the project has none)", () => {
    const dir = path.join(path.dirname(path.dirname(import.meta.dirname)), ".project/compaction/ledgers");
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir).filter((file) => file.endsWith(".json") && !file.endsWith(".v1.json"))) {
      const shape = validateLedgerShape(JSON.parse(fs.readFileSync(path.join(dir, name))), name.slice(0, -".json".length));
      assert.deepStrictEqual(shape.problems, [], name);
    }
  });
});

describe("destinations are compared case-folded", () => {
  test("a differently-cased pitch folder, done-work file or record folder is refused like the exact spelling", () => {
    assert.match(destinationRefusal(".project/Pitches/x/notes.md") ?? "", /not a lasting home/);
    assert.match(destinationRefusal(".PROJECT/PITCHES/X/NOTES.md") ?? "", /not a lasting home/);
    assert.match(destinationRefusal(".project/Done-Work.md", "behavior") ?? "", /owning document/);
    assert.match(destinationRefusal(".project/Records/Shipped/x.md", "decision") ?? "", /owning document/);
    assert.strictEqual(destinationRefusal("docs/Pitches.md", "behavior"), null);
  });
});

describe("ledger file groups", () => {
  const digest = (data: string): string => deps.crypto.sha256Hex(data);
  const h = (name: string): string => bodyHashOf(name, digest);
  const members = [{ path: "campaign/a.toon", hash: h("a") }, { path: "campaign/b.md", hash: h("b") }, { path: "campaign/sub/c.md", hash: h("c") }];

  test("a group is a folder prefix ending in a slash, and its tree hash binds paths and contents regardless of order", () => {
    assert.strictEqual(isGroupPath("campaign/"), true);
    assert.strictEqual(isGroupPath("campaign/a.toon"), false);
    const base = groupHashOf(members, digest);
    assert.match(base, HASH_PATTERN);
    assert.strictEqual(groupHashOf([...members].reverse(), digest), base, "order does not matter");
    assert.notStrictEqual(groupHashOf([{ ...members[0], hash: h("A") }, ...members.slice(1)], digest), base, "an edited member");
    assert.notStrictEqual(groupHashOf(members.slice(1), digest), base, "a dropped member");
    assert.notStrictEqual(groupHashOf([...members, { path: "campaign/d.md", hash: h("d") }], digest), base, "an added member");
    assert.notStrictEqual(groupHashOf([{ ...members[0], path: "campaign/z.toon" }, ...members.slice(1)], digest), base, "a renamed member");
  });

  test("accountFiles covers a group by prefix, count and tree hash, and reports every kind of doubt", () => {
    const live = [...members, { path: "pitch.md", hash: h("pitch") }];
    const group = { path: "campaign/", hash: groupHashOf(members, digest), count: 3 };
    const single = { path: "pitch.md", hash: h("pitch") };
    assert.deepStrictEqual(accountFiles(live, [group, single], digest), { unaccounted: [], absent: [], changed: [], overlapping: [] });
    assert.deepStrictEqual(accountFiles(live, [single], digest).unaccounted, members.map((member) => member.path), "files under no entry");
    assert.deepStrictEqual(accountFiles([...live, { path: "campaign/new.md", hash: h("n") }], [group, single], digest).changed, ["campaign/"], "a file added to the group");
    assert.deepStrictEqual(accountFiles(live.filter((file) => file.path !== "campaign/b.md"), [group, single], digest).changed, ["campaign/"], "a member removed");
    assert.deepStrictEqual(accountFiles([{ ...members[0], hash: h("A") }, ...live.slice(1)], [group, single], digest).changed, ["campaign/"], "a member edited");
    assert.deepStrictEqual(accountFiles(live, [{ ...group, count: 2 }, single], digest).changed, ["campaign/"], "a wrong count");
    assert.deepStrictEqual(accountFiles([single], [group, single], digest).absent, ["campaign/"], "a group with no files");
    assert.deepStrictEqual(accountFiles(live, [group, single, { path: "campaign/a.toon", hash: h("a") }], digest).overlapping, ["campaign/a.toon"], "a single entry under a group");
    const nested = { path: "campaign/sub/", hash: groupHashOf([members[2]], digest), count: 1 };
    assert.deepStrictEqual(accountFiles(live, [group, nested, single], digest).overlapping.sort(), ["campaign/", "campaign/sub/"], "nested groups");
  });

  test("the ledger shape accepts a well-formed group and refuses a malformed one", () => {
    const section = { source: "SHIPPED.md#x", class: "know-how", disposition: "extracted", destination: "docs/x.md", helps: "Explains x.", bodyHash: h("x") };
    const group = { path: "campaign/", disposition: "omitted", reason: "duplicate", hash: groupHashOf(members, digest), count: 3 };
    const shape = (otherFiles: unknown[]) => validateLedgerShape({ schemaVersion: 2, slug: "s", sections: [section], otherFiles }, "s").problems;
    assert.deepStrictEqual(shape([group]), []);
    assert.match(shape([{ ...group, count: undefined }]).join(";"), /file count/);
    assert.match(shape([{ ...group, count: 0 }]).join(";"), /file count/);
    assert.match(shape([{ ...group, count: MAX_PITCH_FILES + 1 }]).join(";"), /file count/);
    assert.match(shape([{ path: "pitch.md", disposition: "omitted", reason: "duplicate", hash: h("p"), count: 2 }]).join(";"), /only a group/);
    assert.match(shape([group, { path: "campaign/a.toon", disposition: "omitted", reason: "duplicate", hash: h("a") }]).join(";"), /overlaps the group/);
    assert.match(shape([group, { ...group, path: "campaign/sub/" }]).join(";"), /overlaps the group/);
    assert.match(shape([{ ...group, path: "../out/" }]).join(";"), /relative path/);
    assert.match(shape([{ ...group, path: "/" }]).join(";"), /relative path/);
    assert.match(shape([{ ...group, extra: 1 }]).join(";"), /unknown field/);
  });
});
