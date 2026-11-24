# Code review: orca-balanced-role-pools, audit cycle 1

Scope: requested files and tests, diff against main; pitch.md and plan.md as contract. Read-only review; only this report was written to the repository.

| severity | file:line | rule or check violated | concrete failure scenario with the command you ran and its output | suggested fix |
|---|---|---|---|---|
| should-fix (medium) | ai-framework/scripts/orca-dispatch.mts:261 | Plan P2: optimistic admission must recheck the chosen vendor inside reserve's mutation lock. | With no ledger directory, list() returns missing and admit stays undefined. Another dispatcher can finish a claim after this read and before reserve; the pending dispatch claims the now-busier vendor without the promised load-changed/re-pick. Ran the in-memory Bun reproduction below against unchanged production code, injecting a real competing claim immediately before the pending reserve starts. Output: concurrent claim claimed; pending route launched, vendor codex, final load [[codex,2]], while opencode remained at 0. This is a missing-admission branch, independent of the known nonblocking-lock deviation. | Treat a missing ledger as empty history when building admit; retain the callback so reserve rechecks its actual list after the directory exists. Add a first-dispatch missing-directory interleaving test. |
| should-fix (medium) | ai-framework/scripts/orca-ledger.test.mts:650 | testing.md Guards and Fixes: prove a guard with an actual mutant; plan P2 explicitly requires dropping admit to fail a test. | The test named “mutant: dropping the admit callback” only rewrites import paths and imports the intact reserve implementation; its final assertion expects the intact guard's load-changed outcome. Ran node --experimental-strip-types --disable-warning=ExperimentalWarning --test --test-name-pattern='mutant: dropping the admit' ai-framework/scripts/orca-ledger.test.mts; output: tests 1, pass 1, fail 0. Inspected the test block with node -e (below): guard-removal present: false. Consequently the reported green mutation test never demonstrates that dropping admit is detected. | Actually remove the admit condition, assert that the source changed, then verify that the normal guard assertion fails for the intended reason, as the other mutant tests do. |
| should-fix (low) | ai-framework/scripts/orca-dispatch.test.mts:1157 | coding-standards.md TypeScript rules: resolve referenced types through explicit type imports; testing.md: transpilation is not type verification. | The new ownership matrix uses LedgerRecord["state"] but this module neither imports nor declares LedgerRecord. Ran `rg -n 'import.*LedgerRecord\|interface LedgerRecord\|type LedgerRecord\|LedgerRecord' ai-framework/scripts/orca-dispatch.test.mts`; the only match is line 1157, the new reference. Type checking this module cannot resolve that name, although both requested runtime suites strip the type and pass; no tsc executable is installed here, so this is source evidence rather than a compiler run. | Add `import type { LedgerRecord } from "./orca-ledger.mts";`. |

## Checked, nothing found

- Both requested full commands exited 0:
  - `bun test ai-framework/scripts/orca-assign.test.mts ai-framework/scripts/orca-dispatch.test.mts ai-framework/scripts/orca-ledger.test.mts ai-framework/scripts/orca-run.test.mts ai-framework/scripts/orca-eval-grader.test.mts`: 226 pass, 0 fail, 5 files (22.46 seconds).
  - `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/orca-assign.test.mts ai-framework/scripts/orca-dispatch.test.mts ai-framework/scripts/orca-ledger.test.mts ai-framework/scripts/orca-run.test.mts ai-framework/scripts/orca-eval-grader.test.mts`: tests 226, pass 226, fail 0 (19.57 seconds).
- Picker ordering and tie-break: absent/empty/equal load preserves prior eligible-pool rotation; skip and reviewer exclusions apply before rotation; recorded owner wins; finite load supplied by loadOf.
- Run-scoped load follows the intended owning set, including settled-with-report and processOwnerPid; no-runId mode uses live records. reserve retains its prior ownership predicate; settled-with-report ownership remains protected by resolveAssignment.
- Existing-ledger admission reads the same reserve list as capacity and overlap. The re-pick makes only one unchecked second reservation, as explicitly planned; ownership/capacity/overlap checks still execute.
- Duplicated OpenCode resolution in the re-pick branch was traced: agentArg and gateOptions.agentId are updated for OpenCode and cleared when switching away; launchWorker still applies its final gate. No concrete functional failure found in this duplication.
- runId storage, immutable patch rejection, legacy record acceptance, CLI pass-through and invalid-input/unknown-key/duplicate-key exit-2 behavior. The top-level duplicate scan respects strings, nesting and escaped duplicate key names.
- dispatchInput export retains its explicit return type and direct-entry guard.
- Assignment documentation and the build pointer agree with their contract test.
- New executed eval case drives real load/picker functions; expected-value changes and ignoring-load mutants are detected. Counts agree: 9 executed, 1 parses-only, 3 live-only.

## Unverified

- Live Orca dispatch, OpenCode port cleanup on this host, and true concurrent processes: not launched by this read-only worker. Reproduction uses injected synchronous filesystem timing and a fake launch receipt, with a real production ledger claim.
- New eval case models assignment/resume/rotation with a synthetic ledger rather than driving resolveAssignment for each sequence step; production assignment behavior was checked separately in dispatch tests.
- Full-repository typecheck, full suite outside the five requested files, and project-wide validators were outside this role's requested verification.
- No new issue is claimed for the explicitly excluded stale-read test limitation, old task keys across Runs, pitch-level reviewer pools, or legacy records' Run exclusion.

## Reproduction for missing first-dispatch admission

Command executed (only existing helpers are transpiled in memory; production modules are imported unchanged, temporary fixture removed in finally):

```sh
bun -e '
import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
const file=path.resolve("ai-framework/scripts/orca-dispatch.test.mts");
const source=fs.readFileSync(file,"utf8");
let helpers=source.slice(0,source.indexOf('\''test("unsupported delegation'\''));
helpers+=source.slice(source.indexOf("function poolFixture("),source.indexOf("const done =",source.indexOf("function poolFixture(")));
helpers=helpers.replace('\''import { test } from "node:test";'\'',"").replaceAll("import.meta.dirname",JSON.stringify(path.dirname(file))).replace(/from "(\.\/[^"]+)"/g,(_,s)=>'\''from '\''+JSON.stringify(new URL(s,pathToFileURL(file)).href));
const repro = `
const cleanup=[]; const t={after:(fn)=>cleanup.push(fn)};
const root=poolFixture(t,{implementation:["codex","opencode"],review:["codex"],cap:4});
const orca=fakeOrca(); let checks=0; let injected=false;
const deps={...orca.deps,fs:{...orca.deps.fs,lstatSync:(file)=>{
 if(file===path.join(root,".project/metrics")) {
  checks++;
  if(checks===4) {
   injected=true;
   const claim=ledgerOf(root).reserve({attemptKey:attemptKeyOf("concurrent"),taskKey:taskKeyOf("concurrent"),vendor:"codex",state:"claimed",createdAt:1000,authorizedPaths:["concurrent.mjs"],runId:"run_abc123"},4);
   console.log("concurrent claim",claim.outcome);
  }
 }
 return orca.deps.fs.lstatSync(file);
}}};
try {
 const out=await dispatchScope({...assigned(root,deps,"fresh",{role:"implementation",planIndex:0}),runId:"run_abc123"});
 console.log(JSON.stringify({out,injected,checks,vendor:(ledgerOf(root).read(attemptKeyOf("fresh-a"))).record?.vendor,load:[...loadOf(ledgerOf(root).list().entries.map(e=>e.result.record),"run_abc123")]}));
} finally { for(const fn of cleanup)fn(); }
`;
const js=new Bun.Transpiler({loader:"ts"}).transformSync(helpers+repro);
await import("data:text/javascript;base64,"+Buffer.from(js).toString("base64"));
'
```

Output:

```text
concurrent claim claimed
{"out":{"route":"launched","reason":"launched","attemptKey":"attempt:fresh-a","dispatchId":"ctx_1"},"injected":true,"checks":13,"vendor":"codex","load":[["codex",2]]}
```

Mutation-test inspection command:

```sh
node -e 'const fs=require("fs"); const s=fs.readFileSync("ai-framework/scripts/orca-ledger.test.mts","utf8"); const b=s.slice(s.indexOf("test(\"mutant: dropping the admit"),s.indexOf("/** Imports mutated module")); console.log(b); console.log("guard-removal present:",b.includes("if (admit && !admit(records))"));'
```

Output includes the intact importMutant(absoluteImports) and final assert.equal(outcome.outcome, "load-changed"), followed by `guard-removal present: false`.

## Review summary

| Tier | Count |
|---|---|
| must-fix | 0 |
| should-fix | 3 |
| acknowledged | 0 |

Verdict: PASS — no must-fix findings; three should-fix findings require a fix or a recorded deferral.

