# Code review · greenfield-kickoff part A

## Findings

1. **High / `ai-framework/scripts/project-state.mts:219` / A1 entry budget and fail-closed contract.** The guard tests `names.length > remaining * 2` and then subtracts the full count. A flat project of 4,097 or 8,192 TypeScript files completes as `existing` after inspecting all entries. Only 8,193 files trigger the reason that claims the limit is 4,096. The test at `ai-framework/scripts/project-state.test.mts:201` already specifies refusal before inspecting an oversized listing. The read-only adapter command below returned:

   ```text
   width 4096: existing, inspected=4096
   width 4097: existing, inspected=4097
   width 8192: existing, inspected=8192
   width 8193: unclear, inspected=0, Scan entry budget exceeded 4096.
   ```

   A separate resource issue exists at line 212. `readdirSync` materializes the entire listing before the check, so a directory of arbitrary width still allocates the full set. Security §9 applies bounded guarded reads to directory listings. Correcting the arithmetic addresses the classification bug. Addressing allocation requires incremental enumeration and stopping at the first entry over the budget.

2. **High / `SETUP.md:223` / A2 first-time routing, once and before setup writes alter the evidence.** Step 1 invokes the detector and asks for a choice when it reports `unclear`. Step 3 writes the backlog and graph files, with no context docs yet. Step 4 tells Claude to invoke `/setup`, whose Step 0 at `.claude/skills/setup/SKILL.md:66` and `.cursor/skills/setup/SKILL.md:66` runs the detector again because context docs still do not exist. A first-time Claude installer can therefore ask twice and record the second choice with workflow-generated evidence. A saved draft is the independent early-return case. This is a static finding. The commands `nl -ba SETUP.md | sed -n '104,111p;193,201p;218,230p'` and `nl -ba .claude/skills/setup/SKILL.md | sed -n '66,100p'` showed the two unconditional first-time calls, the intervening writes, and no handoff of the earlier result. The live host execution remains unverified.

3. **Medium / `ai-framework/scripts/project-state.mts:244` / A1 unreadable-file state.** The regular-file branch never checks read permission. With mode `000` on POSIX, an app file still counts as `existing` and a shipped file disappears into `empty`. The latter incorrectly asserts that the tree was judged. An analogous directory is refused by the existing permission check. The adapter command returned:

   ```text
   locked source: existing, evidence=["app.ts"]
   locked shipped file: empty, evidence=[]
   locked directory: unclear, evidence=["private"], Cannot list directory safely (EACCES).
   ```

   This can be reproduced using metadata alone. Checking the absence of read permission bits before classifying ordinary files would handle the demonstrated case without opening target content.

4. **Medium / `ai-framework/scripts/project-state.mts:161` / A1 manifest-only state.** The name table recognizes adjacent formats like `.csproj` and `.sln`, but a valid Visual C++ project manifest alone is treated as ambiguous. The setup skill also explicitly scans `angular.json` as framework config, yet the detector calls it unrecognized when it is the sole project file. The adapter command returned:

   ```text
   Angular workspace only: unclear, evidence=["angular.json"], Found an unrecognized project file.
   Visual C++ project only: unclear, evidence=["windows/app.vcxproj"], Found an unrecognized project file.
   ```

5. **Medium / `ai-framework/scripts/project-state.mts:102` / A1 existing evidence and A2 unclear-choice evidence.** The 32-path cap silently omits named project files beyond the first 32 from the `existing` evidence required by the contract. The cap is disclosed in a reason, but the omitted names are unavailable. For `unclear`, sorting both path types together also allows 32 ordinary source files to displace the only path that caused refusal. The setup agent has to ask the user to choose while showing evidence that cannot locate the refused directory. The adapter command returned:

   ```text
   width 33: existing, evidenceCount=32, first=file-0000.ts, last=file-0031.ts, Evidence capped at 32 paths.
   hidden refusal: unclear, evidenceCount=32, first=app-0.ts, last=app-9.ts, Cannot list directory safely (EACCES).
   ```

   Preserve refusal evidence first when the overall state is `unclear`. The all-files evidence contract and the cap tested at `ai-framework/scripts/project-state.test.mts:345` also need reconciliation.

6. **Low / `ai-framework/scripts/project-state.mts:173` / Coding Standards code organization and Component Size Rules.** The detector utility spans 323 lines and the `scanProject` function spans 87 lines. The default limits are 80 for a utility and 50 for a function. `awk 'END { print "detector lines:", NR }' ai-framework/scripts/project-state.mts` printed `detector lines: 323`. The plan estimates the size of A1 and the log records the resulting size. Neither the plan nor the deviations records the cohesive-unit exception, shared state, or alternative required by the rule. A future change to scanning therefore has no documented basis for distinguishing cohesive traversal logic from separable CLI or manifest logic.

## Checklist

- **Contract and amendments:** Read the A1 and A2 contract, deviations and build log. The four previously recorded behaviors were excluded from findings.
- **`resume`:** The adapter returned `resume` with draft evidence even with another symlink present, and `unclear` when the draft was a symlink. The probe precedes the shipped-list read and only uses metadata.
- **`empty`:** A file-free virtual root and a tree with only `.project/status.md` returned `empty`; no app evidence. The unreadable shipped-file case is above.
- **`existing`:** A sole SQL file returned `existing` with `main.sql` as evidence. Reviewed source, config, infrastructure, notebook and document classification, including the two manifest gaps and evidence truncation.
- **`unclear`:** A symlink mixed with real source, a special filesystem entry, a denied directory and an extra harness file produced `unclear`. Confirmed that reason text uses fixed wording and sanitized filesystem codes. Findings cover unreadable regular files and omitted refusal evidence.
- **Budgets:** The 33rd nested directory produced `unclear` and `Scan depth exceeded 32.` Manifest reads are byte bounded, path length is tested before sorting evidence or using names as paths, and displayed evidence is length bounded and stripped of controls. The entry-count and directory-allocation findings are above.
- **Architecture and read boundaries:** Reviewed bundle-local imports, metadata-only target scanning, the shared guarded manifest read, descriptor validation and the approved runner bootstrap. The detector imports no code from its `--root` target and performs no target writes. Production behavior under concurrent mutation was reviewed statically; I did not independently run the replacement or byte-identical fixture tests.
- **CLI:** With strip-types flags, a valid `--root ai-framework/templates/project --json` printed one schema-version-1 `unclear` object, exit 0. `--root --json` printed one usage line and exited 2. A nonexistent root printed one `unclear` object with `ENOENT` and exited 0. Reviewed working-directory default and duplicate/unknown option handling in source and tests.
- **Manifest and tests:** Read both new files in full. `LC_ALL=C sort -cu ai-framework/templates/shipped-files.txt` exited 0 and the manifest has 427 entries. Reviewed the Git drift assertion, Step 1 fixtures, golden case, mutation hook, read-only assertion and doctor registration. Full Git drift, official test results and mutation proof remain unverified in this scratch copy.
- **Setup instructions:** `git apply --check --reverse CHANGE.patch` exited 0. The specified Claude/Cursor mirror diff exited 0 with no output. The detector appears once in the skill and once in `SETUP.md`. The setup skill routes the four states, carries the evidence into the approved status note, preserves the draft and definition, and uses `open` for unsupported fields on the postponed-kickoff route. The setup summary agrees on routing and re-run preservation. The double invocation on the guided installer path is above. The owner live smoke and definition golden case remain unverified.

## Commands and limits

The first direct CLI and adapter attempts used bare `node`. Local Node v22.11.0 returned `ERR_UNKNOWN_FILE_EXTENSION` for `.mts` and exited 1. Retrying with `--experimental-strip-types --disable-warning=ExperimentalWarning` succeeded. That runtime skew was not counted as a finding. I did not run the named test suite because `installedFixture` calls `tempFixture`, which writes under the OS temporary directory, and the task permits only the report write. I did not run the Git manifest test. The earlier manifest source print was truncated by the tool, so I read it again in two ranges. Both ranges were returned in full.

The read-only command for detector findings used the real installed bundle reader with a virtual target filesystem. Output excerpts above abbreviate the printed JSON. The detector was never given a real target containing sensitive files.

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --input-type=module <<'NODE'
import {detectProjectState} from "./ai-framework/scripts/project-state.mts";
import {createNodeDeps} from "./ai-framework/scripts/runtime/node.mts";
const deps=createNodeDeps(), root=deps.path.resolve("virtual-audit-fixture");
const stat=(kind="file",mode=0o755)=>({isFile:()=>kind==="file",isDirectory:()=>kind==="dir",isSymbolicLink:()=>kind==="link",mode,dev:1,ino:1,mtimeMs:0});
function run(label,entries){
  const children=new Map([[root,[]]]), stats=new Map([[root,stat("dir")]]);
  let inspected=0;
  for(const [rel,info=stat()] of entries){
    const name=deps.path.join(root,rel), parent=deps.path.dirname(name);
    if(!children.has(parent)) children.set(parent,[]);
    children.get(parent).push(deps.path.basename(name)); stats.set(name,info);
  }
  const virtual=(name)=>name===root||name.startsWith(root+"/");
  const fs={...deps.fs,
    lstatSync(name){
      if(!virtual(name)) return deps.fs.lstatSync(name);
      if(!stats.has(name)) throw Object.assign(new Error("missing"),{code:"ENOENT"});
      inspected+=Number(name!==root); return stats.get(name);
    },
    readdirSync:(name)=>virtual(name)?children.get(name)??[]:deps.fs.readdirSync(name),
    realpathSync:(name)=>virtual(name)?name:deps.fs.realpathSync(name),
  };
  const {state,evidence,reasons}=detectProjectState(root,{...deps,fs});
  console.log(JSON.stringify({label,state,inspected,evidenceCount:evidence.length,first:evidence[0],last:evidence.at(-1),reasons}));
}
run("empty",[]);
run("existing",[["main.sql"]]);
run("mixed symlink",[["app.ts"],["link",stat("link")]]);
run("special entry",[["pipe.sql",stat("other")]]);
run("locked source",[["app.ts",stat("file",0)]]);
run("locked shipped file",[["AGENTS.md",stat("file",0)]]);
run("locked directory",[["private",stat("dir",0)]]);
run("non-shipped harness file",[[".claude",stat("dir")],[".claude/local.md"]]);
run("scaffold",[[".project",stat("dir")],[".project/status.md"]]);
const draft=[[".project",stat("dir")],[".project/kickoff",stat("dir")]];
run("draft",[...draft,[".project/kickoff/draft.toon"],["link",stat("link")]]);
run("invalid draft",[...draft,[".project/kickoff/draft.toon",stat("link")]]);
run("depth",Array.from({length:33},(_,i)=>["d/".repeat(i)+"d",stat("dir")]));
for(const n of [33,4096,4097,8192,8193]) run("width "+n,Array.from({length:n},(_,i)=>["file-"+String(i).padStart(4,"0")+".ts"]));
// These three invocations ran in a second process with the same adapter.
run("Angular workspace only",[["angular.json"]]);
run("Visual C++ project only",[["windows/app.vcxproj"],["windows",stat("dir")]]);
run("hidden refusal",[["z-private",stat("dir",0)],...Array.from({length:32},(_,i)=>["app-"+i+".ts"])]);
NODE
```
