# Project-Specific Rules

`ai-framework/rules/` ships stack-agnostic — universal principles with placeholders (e.g.
`<backend-workspace>`, `<ext>`, `<build-command>`) instead of a specific framework or vendor.

This directory holds the **concrete, stack-specific companions** that `/setup` generates from
those placeholders after scanning your actual project. Expect files like:

- `frontend-framework.md` — your actual framework's component/rendering conventions (fills in
  `ai-framework/rules/component-architecture.md`'s placeholders)
- `styling.md` — your actual styling system's conventions
- `backend.md` — your actual backend/ORM's patterns (auth guards, validators, schema evolution)
- `mobile.md` — only if a mobile app target was detected
- `ai-structured-output.md` — only if the project makes LLM calls

`/setup` only creates the files relevant to what it actually finds — it does not assume any of
these exist. If `/setup` hasn't run yet, or your stack doesn't need one of these, the file
simply won't be here.

Load these alongside `ai-framework/rules/` — the generic rule explains the *why*, the file here
gives the concrete *how* for this codebase. See `ai-framework/rules/context-management.md` §
"Rule Filtering Logic".
