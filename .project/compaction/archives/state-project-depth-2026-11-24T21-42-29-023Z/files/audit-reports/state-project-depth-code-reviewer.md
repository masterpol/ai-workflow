# Code review: state-project-depth, audit cycle 1

Read-only review of the dispatched source, tests, playbooks and pitch contracts. The only review artifact created is this report. Known exclusions from the dispatch are not findings.

| severity | file:line | rule or check violated | concrete failure scenario with the command you ran and its output | suggested fix |
|---|---|---|---|---|
| must-fix | ai-framework/scripts/facts-gather.mts:389 | Reviewer hard rule: recheck ownership at the destructive step; pitch S1: regeneration never replaces an unowned file. | Reproduction B below runs `bun run -` with an in-memory filesystem. A delivered draft passes the receipt check, then an editor changes it while the temporary file is written. The subsequent unconditional rename overwrites the edit. Output: `{"concurrentEdit":true,"finalDraft":"regenerated"}`. The same missing final check also permits a destination that was absent initially to appear before the rename. | Pin the reports directory identity and destination state, then recheck paths, identity and ownership immediately before replacement. Refuse if the destination appeared or changed. Add an injected edit/appearance regression test; consider an exclusive publication strategy for an initially absent destination. |
| should-fix | ai-framework/scripts/facts-gather.mts:250 | A2 native-diagram validity and raw-name relationship resolution. | Reproduction A runs the actual pinned Archify ERD renderer in `--layout-json` mode without writing an artifact. A target column named `long_column_name_abcdefghijklmnopqrstuvwxyz` renders as `long-column-name-abcdefghij…`, but the FK references its unshortened name. Exit 1: `references unknown attribute "e1.long-column-name-abcdefghijklmnopqrstuvwxyz"`. A foreign key to column 16 also exits 1: `references unknown attribute "e1.c15"`, because only 15 attributes are emitted. Dotted names likewise differ between references and attributes; a pruned target entity can produce `x.<column>`. | Build a mapping from raw entity/column identity to the exact emitted attribute name after entity and attribute selection. Emit FK metadata only when both target entity and attribute exist, using that mapping. Count omitted references in the panel note. Cover long/dotted columns, omitted columns and omitted entities through real validation. |
| should-fix | ai-framework/scripts/facts-gather.mts:260 | A2 hostile-name validity; distinct source fields must remain representable after sanitization. | Reproduction A supplies the valid distinct columns `a_b` and `a-b` in one table. Both become attribute name `a-b`. The actual pinned renderer exits 1 with `Entity "e1" declares attribute "a-b" twice.` This aborts rendering of the complete project report. Truncation and redaction can cause the same collision. | Allocate unique, bounded, inert attribute names per entity using deterministic suffixes or generated field identities. Reuse the mapping for FK references. Test underscore/dash, truncation and redaction collisions within the same table. |

## Reproduction A: native ERD validation

Command run from the repository root (all fixture data stays in memory; `--layout-json` does not write the named HTML output):

```sh
bun run - <<'JS'
import {createFactsGather} from './ai-framework/scripts/facts-gather.mts';
import {createTestDeps,memoryFs} from './ai-framework/scripts/runtime/test-helpers.mts';
import {spawnSync} from 'node:child_process';
const base=createTestDeps();
const api=createFactsGather({...base,fs:{...base.fs,...memoryFs({'/p/VERSION':'1'})}});
const fact=value=>({value,status:'observed',evidence:[]});
const entity=(name,cols)=>({name,columns:cols.map(name=>({name,type:'text'})),unique:[]});
const facts=api.gather('/p');
const cases=[
 {name:'long referenced column',entities:[entity('users',['long_column_name_abcdefghijklmnopqrstuvwxyz']),entity('posts',['ref'])],relationships:[{from:'posts',fromColumns:['ref'],to:'users',toColumns:['long_column_name_abcdefghijklmnopqrstuvwxyz']}]},
 {name:'colliding columns',entities:[entity('users',['a_b','a-b'])],relationships:[]},
 {name:'attribute display cap',entities:[entity('users',Array.from({length:16},(_,i)=>`c${i}`)),entity('posts',['ref'])],relationships:[{from:'posts',fromColumns:['ref'],to:'users',toColumns:['c15']}]},
];
for(const c of cases){
 facts.project={database:fact({...c,total:{entities:c.entities.length,relationships:c.relationships.length}}),structure:fact(null),stack:fact(null)};
 const spec=api.explainer(facts,'p','t').panels.find(p=>p.id==='database').blocks[0].spec;
 const result=spawnSync('node',['.project/skills/packages/tt-a1i/archify/archify/renderers/erd/render-erd.mjs','/dev/stdin','/tmp/state-review-unused.html','--layout-json'],{input:JSON.stringify(spec),encoding:'utf8',timeout:5000});
 console.log(c.name,JSON.stringify({status:result.status,output:(result.stderr||result.stdout).slice(0,1600)}));
}
JS
```

All three cases returned `status: 1` with the diagnostics quoted in the findings. The pinned renderer independently checks target column existence and duplicate attribute names at `renderers/erd/render-erd.mjs:1222` and `:1282`.

## Reproduction B: ownership changes before publication

```sh
bun run - <<'JS'
import {createFactsGather} from './ai-framework/scripts/facts-gather.mts';
import {createTestDeps,memoryFs} from './ai-framework/scripts/runtime/test-helpers.mts';
const base=createTestDeps(); const root='/p';
const draft='/p/.project/reports/state.explainer.json';
const receipt='/p/.project/reports/state.delivery.json';
const mem=memoryFs({[draft]:'delivered',[receipt]:JSON.stringify({specification:{sha256:base.crypto.sha256Hex('delivered')}})});
let concurrentEdit=false;
const runtime={...base,fs:{...base.fs,...mem,realpathSync:p=>p,mkdirSync:()=>{},rmSync:()=>{},writeFileSync:(file,data,options)=>{
 if(file.includes('.tmp-')){mem.writeFileSync(draft,'human edit after ownership check'); concurrentEdit=true;}
 return mem.writeFileSync(file,data,options);
}}};
const api=createFactsGather(runtime);
api.writeReport(root,'state.explainer.json','regenerated');
console.log(JSON.stringify({concurrentEdit,finalDraft:mem.readFileSync(draft)}));
JS
```

Output: `{"concurrentEdit":true,"finalDraft":"regenerated"}`. No real files are written by this reproduction.

## Checked, nothing found

- Ran `bun test ai-framework/scripts/facts-project.test.mts ai-framework/scripts/facts-gather.test.mts ai-framework/scripts/bundle-sync.test.mts`: **100 pass, 0 fail**, 3 files, 33.01 seconds total. The command was observed through short asynchronous calls. All three installed Archify validation cases ran and passed.
- A1 interface: the exported budgets and factory signature match the plan; database, structure and stack produce the required fact shapes; raw labels stay available for renderer resolution. Per-reader failure wrappers isolate errors.
- Independently injected an invalid `package.json` with valid Drizzle metadata and a structure fixture: `section isolation {"database":"observed","structure":"observed","stack":"unavailable"}`.
- Simple depth: reviewed the diff and passing captured-golden assertion; existing panels and summary construction are unchanged when project facts are absent. Automatic depth selection and explicit overrides are covered.
- Collector behavior: newest snapshot selection, journal staleness, primary/unique/foreign keys, prototype-shaped names, directory exclusions, depth and discovery limits, lockfile inference, script names without bodies, fixed failure text, and no child/network/database calls are covered by the passing tests.
- Reset interaction: reviewed `git diff main -- ai-framework/scripts/bundle-sync.mts`; matching hashes, edited files, bounded receipt/target reads, dry runs, symlink refusals, directory identity changes, missing targets, legacy pages and other project records are exercised by the passing tests.
- Receipt format: inspected the installed pinned Archify delivery producer. `specification.sha256` hashes the original specification and `artifact.sha256` hashes the artifact; the collector/reset use these fields, rather than `explainer.preparedSha256`.
- Archify pin guidance: anchored bounded source-row parsing, installed revision comparison and printed install command agree with the updated docs and passing tests.
- Doctor change adds both project-reader files to its syntax-check list. Updated state and bundle-sync docs describe the implemented depth and receipt behavior, subject to the findings above.
- Ran scoped `git diff --check` over the three implementation files: exit 0, no output.

## Unverified

- Full-suite, setup-validator, workflow-doctor, graph consistency, mirror parity and release checks were outside this bounded reviewer assignment; only the three requested test files were run.
- No live LAH collection/delivery or visual inspection was performed. Installed Archify validation and the direct native renderer checks establish validation behavior, not visual readability across every schema.
- Did not mutate every security guard or bound. Existing tests demonstrate named cases but do not independently establish mutation sensitivity for every guard, as required by `testing.md` Guards and Fixes. The two new validation reproductions and ownership interleaving expose concrete missing coverage.
- Ownership interleaving was reproduced deterministically through injected runtime dependencies; no real concurrent-process or directory substitution stress test was run.
- No static typecheck was run. The new A1 tests use multiple `any` casts; their passing runtime assertions do not prove compile-time conformance of every fact shape.

## Review summary

| Tier | Count |
|---|---|
| must-fix | 1 |
| should-fix | 2 |
| acknowledged | 0 |

Verdict: **BLOCK — 1 must-fix finding requires resolution before merge.**
