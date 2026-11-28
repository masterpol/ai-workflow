# Round 4 security delta review

### High / ai-framework/scripts/setup-validator.mts:258

**Rule violated.** `ai-framework/rules/security.md:256` requires helper paths to resolve from the running bundle.

When a trusted validator checks a separate project root, it starts the doctor using a relative script path and the checked project as the subprocess working directory. A checked project that supplies its own doctor therefore controls the code the validator starts. If the target has no doctor copy, the relative invocation also fails even when the running bundle ships one. Graphify already receives an absolute path from `bundleScript`. Use the same resolution for the doctor. The Graphify failure hint at line 223 also directs the caller to the relative project copy, so the suggested retry should identify the trusted entry point.

Command, run with the test's injected child runner and no project helper execution:

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --test --test-reporter=spec --test-name-pattern='child checks run|child failures|child reports with non-numeric|long context file|install that kept|spawns children with execPath' ai-framework/scripts/setup-validator.test.mts
```

Output excerpt:

```text
✖ child checks run the running bundle's own scripts, never the checked project's copies
AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
+ actual - expected

  [
+   'ai-framework/scripts/workflow-doctor.mts'
-   '<scratch root>/ai-framework/scripts/workflow-doctor.mts'
  ]
ℹ tests 6
ℹ pass 5
ℹ fail 1
```

### Low / ai-framework/scripts/setup-validator.mts:226 and ai-framework/scripts/setup-validator.mts:262

**Rule violated.** `ai-framework/rules/security.md:259` requires validating untrusted data before re-emitting it.

The guards reject non-integers and strings but accept negative counts. A malformed successful Graphify report with a negative total and an empty problem list would record a pass with a negative entry count. A doctor report with a negative failure count would still fail, but print a nonsensical count. Graphify also treats a missing or null problem list as empty, so a malformed report can look healthy. Require nonnegative safe integers and validate the Graphify problem list before using it to determine status. The existing mock test confirms string counts are rejected. The negative-count behavior was established by inspecting the guard and checking the language primitive, without executing a malformed report through either child.

```sh
node -p 'JSON.stringify({minusOneIsSafeInteger:Number.isSafeInteger(-1), nullStatusText:`exit ${null}`})'
```

```text
{"minusOneIsSafeInteger":true,"nullStatusText":"exit null"}
```

### Low / ai-framework/scripts/setup-validator.mts:259

**Diagnostic defect.** Section 9's rule at `ai-framework/rules/security.md:264` to retain safe codes and omit raw error text remains satisfied. The new fallback loses an available safe signal.

If the doctor is terminated by a signal and the adapter supplies no separate error code, the validator reports `exit null`. The adapter returns the signal alongside the null status, and the validator already filters it through `safeCode` at line 142. Reuse the sanitized signal for this case. The command above confirmed the fallback renders `exit null`. The selected tests passed for spawn failure, numeric exit, and omission of child stderr. Signal behavior was checked by source review.

### Other scoped checks and limits

- Both bundle detections use the same exact first-line check after a bounded, guarded read. A direct check of the shared predicate returned `{"lf":true,"crlf":true,"custom":false,"missing":false}`. I reviewed the doctor's call site statically. Its filesystem fixture suite was unverified under the read-only task constraint.
- The revised placeholder pattern excludes either bracket inside the token. A direct check returned `{"placeholder":true,"unclosed":false}` for a normal placeholder and one MiB of opening brackets. The selected validator test also passed for a normal placeholder. The fixture-backed performance test was unverified under the read-only task constraint.
- The targeted run failed only on the doctor path assertion shown above. The run used argument capture and never started a target project's helper.
