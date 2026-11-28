# Security and correctness re-check

Reviewed the detector's read-access check and runtime adapter, the two setup playbooks, and the manual installer handoff.

## Findings

### Medium / .claude/skills/setup/SKILL.md:89 and .cursor/skills/setup/SKILL.md:89 / ai-framework/rules/security.md:259

The choice-note procedure specifies four spaces before each untrusted pathname but omits the blank line needed before an indented Markdown code block that follows a paragraph. If an installer places the first evidence line directly after the choice sentence, a pathname such as `**sample.md**` becomes active markup in the saved status note. Specify a standalone, top-level code block with a blank line between the choice paragraph and the first evidence line.

Command:

~~~sh
ruby -rrdoc -e 'html = RDoc::Markup::ToHtml.new(RDoc::Options.new); ["Choice: Existing project\n    **sample.md**\n", "Choice: Existing project\n\n    **sample.md**\n"].each { |note| puts html.convert(RDoc::Markdown.parse(note)) }'
~~~

Output:

~~~html
<p>Choice: Existing project <strong>sample.md</strong></p>

<p>Choice: Existing project</p>

<pre>**sample.md**</pre>
~~~

### Low / ai-framework/scripts/project-state.mts:252 / ai-framework/rules/security.md:249 and the detector's refusal contract

The access-denied branch records the refusal and then passes the same entry to ordinary classification. The prior implementation stopped after recording the unreadable-file reason. For an unreadable extensionless or unknown file, the output now reports unreadability and an independent classification reason for the same entry. The state still fails closed as `unclear`. Return to the directory loop after recording the access failure to preserve the refusal behavior.

Command:

~~~sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --input-type=module <<'JS'
import { detectProjectState } from "./ai-framework/scripts/project-state.mts";
import { createTestDeps } from "./ai-framework/scripts/runtime/test-helpers.mts";

const deps = createTestDeps();
const root = process.cwd();
const denied = deps.path.join(root, "DELTA.patch");
const result = detectProjectState(root, {
  ...deps,
  fs: {
    ...deps.fs,
    readdirSync: (path) => path === root ? ["DELTA.patch"] : deps.fs.readdirSync(path),
    accessSync(path, mode) {
      if (path === denied) throw Object.assign(new Error("denied"), { code: "EACCES" });
      deps.fs.accessSync(path, mode);
    },
  },
});
console.log(JSON.stringify(result));
JS
~~~

Output:

~~~json
{"schemaVersion":1,"state":"unclear","reasons":["Found an unreadable file (EACCES).","Found an unrecognized project file."],"evidence":["DELTA.patch"]}
~~~

## Verification

The named project-state suite passed all 42 selected tests. The local Node 22.11.0 required explicit type stripping after the initial command failed with `ERR_UNKNOWN_FILE_EXTENSION`. Temporary fixtures were confined to the scratch copy.

~~~sh
TMPDIR="$PWD" PROJECT_STATE_TEST_MUTANT=0 UPDATE_SHIPPED_FILES=0 node --experimental-strip-types --disable-warning=ExperimentalWarning --test --test-skip-pattern='the shipped manifest matches Git' ai-framework/scripts/project-state.test.mts
~~~

The suite reported `# pass 42` and `# fail 0`. The setup procedure was reviewed in source and the note format was checked with an isolated renderer invocation.
