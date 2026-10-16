import { describe, test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { MAX_RANGE_LENGTH, compareVersions, parseRange, parseVersion, satisfies } from "./semver-range.mts";

const fixtures = JSON.parse(readFileSync(new URL("./semver-range.fixtures.json", import.meta.url), "utf8")) as
  { source: string; rows: [string, string, boolean][] };

describe("semver-range against npm semver fixtures", () => {
  test("fixture file is large enough to mean something", () => {
    assert.ok(fixtures.rows.length >= 150);
    assert.ok(fixtures.rows.some((row) => row[2]) && fixtures.rows.some((row) => !row[2]));
  });

  test("every row matches npm semver", () => {
    const wrong = fixtures.rows.filter(([range, version, expected]) => satisfies(version, range) !== expected);
    assert.deepStrictEqual(wrong.slice(0, 10), []);
  });

  test("grammar families are all present in the fixtures", () => {
    const ranges = new Set(fixtures.rows.map((row) => row[0]));
    for (const probe of ["1.4.224", "^1.4.223", "~1.4.223", ">=1.4.223", ">1.4.223 <1.6.0", "1.4.x", "1.x", "1.4.223 - 1.5.0", "1.2.3 || 4.5.6 || 7.8.9"])
      assert.ok(ranges.has(probe), probe);
  });
});

describe("parseRange rejections", () => {
  const bad: [string, string][] = [
    ["", "empty"], ["   ", "empty"], ["||", "empty"], ["1.2.3 ||", "empty"], ["|| 1.2.3", "empty"], ["1.2.3 | 4.5.6", "unexpected"],
    ["1.5.0-beta.1", "prerelease"], [">=1.5.0-rc.1", "prerelease"], ["1.5.0+build", "prerelease"],
    ["01.2.3", "leading zeros"], ["1.02.3", "leading zeros"], ["1234567.0.0", "digits"],
    ["!1.2.3", "unexpected"], ["=>1.2.3", "unknown operator"], ["==1.2.3", "unknown operator"], [">>1.2.3", "unknown operator"], ["~>1.2.3", "unknown operator"],
    ["^", "missing"], [">=", "missing"], [">= 1.2.3", "missing"], ["1.2.3.4", "too many"], ["1..2", "empty version part"], ["1.", "empty version part"],
    ["1.x.3", "wildcard"], ["a.b.c", "unexpected"], ["latest", "unexpected"], ["1.2.3 - ", "hyphen"], ["- 1.2.3", "hyphen"], [">=1.0.0 - 2.0.0", "operators"],
    ["1.2.3\t4.5.6", "unexpected"], ["1.2.3 - 2.0.0 - 3.0.0", "hyphen"],
  ];
  for (const [text, fragment] of bad) {
    test(`rejects ${JSON.stringify(text)}`, () => {
      const result = parseRange(text);
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.ok(result.error.message.includes(fragment), result.error.message);
        assert.ok(Number.isInteger(result.error.position) && result.error.position >= 0 && result.error.position <= text.length);
      }
    });
  }

  test("error position points at the offending character", () => {
    const result = parseRange(">=1.4.224 <1.6.0-beta");
    assert.ok(!result.ok);
    if (!result.ok) assert.strictEqual(result.error.position, ">=1.4.224 <1.6.0".length);
  });

  test("non-strings, oversize and too many alternatives are rejected", () => {
    for (const value of [undefined, null, 1, {}, ["1.2.3"]]) assert.strictEqual(parseRange(value).ok, false);
    assert.strictEqual(parseRange("1".repeat(MAX_RANGE_LENGTH + 1)).ok, false);
    assert.strictEqual(parseRange(Array.from({ length: 17 }, (_, i) => `1.0.${i}`).join(" || ")).ok, false);
    assert.strictEqual(parseRange(Array.from({ length: 17 }, () => ">=1.0.0").join(" ")).ok, false);
  });
});

describe("parseVersion and satisfies guards", () => {
  test("parseVersion accepts only canonical x.y.z", () => {
    assert.deepStrictEqual(parseVersion("1.4.224"), [1, 4, 224]);
    for (const bad of ["1.4", "1.4.x", "1.4.224-beta", "v1.4.224", "01.4.224", "1.4.224.1", " 1.4.224", "1.4.224\n", "1.4.1234567", "", 1, null, undefined])
      assert.strictEqual(parseVersion(bad), undefined, String(bad));
  });

  test("an invalid version or range is never satisfied", () => {
    assert.strictEqual(satisfies("1.4.224-beta", "*"), false);
    assert.strictEqual(satisfies("1.4.224", "not a range"), false);
    assert.strictEqual(satisfies("1.4.224", ">=1.4.224"), true);
    assert.strictEqual(satisfies("1.4.224", parseRange("^1.4.0").ok ? (parseRange("^1.4.0") as { range: never }).range : "x"), true);
  });
});

describe("boundaries", () => {
  test("compareVersions orders by major, then minor, then patch", () => {
    assert.strictEqual(compareVersions([1, 4, 224], [1, 4, 224]), 0);
    assert.strictEqual(compareVersions([1, 4, 224], [1, 4, 225]), -1);
    assert.strictEqual(compareVersions([1, 5, 0], [1, 4, 999999]), 1);
    assert.strictEqual(compareVersions([2, 0, 0], [1, 999999, 999999]), 1);
  });

  test("exactly six digits are accepted, seven are not", () => {
    assert.deepStrictEqual(parseVersion("999999.999999.999999"), [999999, 999999, 999999]);
    assert.strictEqual(parseVersion("1000000.0.0"), undefined);
    assert.strictEqual(parseRange("<=999999.0.0").ok, true);
    assert.strictEqual(parseRange("<=1000000.0.0").ok, false);
  });

  test("a version longer than the version cap is rejected whatever it contains", () => {
    assert.strictEqual(parseVersion(`1.4.${"0".repeat(70)}`), undefined);
  });

  test("errors report the position of each problem", () => {
    for (const [text, position] of [["^^1", 0], ["1.2.3 || 4.x.5", 13], ["1.2.3 || ", 8], [">=1.0.0 ~", 9], ["1.2.3 - 2.0.0 - 3.0.0", 6]] as const) {
      const result = parseRange(text);
      assert.ok(!result.ok, text);
      if (!result.ok) assert.strictEqual(result.error.position, position, text);
    }
  });
});

describe("hostile input stays linear", () => {
  const FAST_MS = 50;
  const timed = (fn: () => unknown): number => { const start = performance.now(); fn(); return performance.now() - start; };
  const inputs: string[] = [
    "1.".repeat(50_000), "<".repeat(100_000), " ".repeat(100_000) + "1.2.3", "||".repeat(50_000), "1.2.3 - ".repeat(10_000), "^".repeat(100_000) + "1",
  ];
  for (const [i, input] of inputs.entries()) {
    test(`hostile range ${i} returns quickly`, () => {
      assert.ok(timed(() => parseRange(input)) < FAST_MS);
      assert.ok(timed(() => satisfies("1.4.224", input)) < FAST_MS);
    });
    test(`hostile version ${i} returns quickly`, () => {
      assert.ok(timed(() => parseVersion(input)) < FAST_MS);
      assert.ok(timed(() => satisfies(input, ">=1.0.0")) < FAST_MS);
    });
  }
});

// Guard proof: mutate a copy of the module source in memory and require the fixture check to notice.
describe("fixtures catch an in-memory mutant", () => {
  const source = readFileSync(new URL("./semver-range.mts", import.meta.url), "utf8");
  const mutants: [string, string, string][] = [
    ["greater-or-equal becomes greater", "case \">=\": return order >= 0;", "case \">=\": return order > 0;"],
    ["caret on zero major loses its ceiling", "else if (minor > 0 || p.count === 2) ceiling = [0, minor + 1, 0];", "else if (minor > 0 || p.count === 2) ceiling = [major + 1, 0, 0];"],
    ["tilde ignores the minor", "[lo[0], lo[1] + 1, 0]", "[lo[0] + 1, 0, 0]"],
  ];
  for (const [name, from, to] of mutants) {
    test(`mutant: ${name}`, async () => {
      assert.ok(source.includes(from), "mutation anchor must exist in the source");
      const mutated = source.replace(from, to);
      // Type annotations make the .mts source unloadable as a data: URL, so strip types with Node's own transformer.
      const { stripTypeScriptTypes } = await import("node:module") as unknown as { stripTypeScriptTypes?: (code: string) => string };
      assert.ok(stripTypeScriptTypes, "node:module.stripTypeScriptTypes is required for the mutant proof");
      const js = stripTypeScriptTypes(mutated);
      const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`) as { satisfies: typeof satisfies };
      const wrong = fixtures.rows.filter(([range, version, expected]) => mod.satisfies(version, range) !== expected);
      assert.ok(wrong.length > 0, `fixtures did not notice mutant: ${name}`);
    });
  }
});
