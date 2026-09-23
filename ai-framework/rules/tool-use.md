# AI Tool Use Constraints & Enforcement

## Purpose

Ensure tool calls from AI models are enforced at API boundaries, not just prompt-level instructions. Tools with single-call-per-response semantics must be validated server-side.

## Core Rule

> **Enforce tool call constraints at the API server-side, not just through prompt instructions.**

When a tool should only be called once per response (e.g., `requestClarification`, `createSessionDraft`), add deduplication/validation logic at the response boundary to catch model violations before they reach the client.

## Why This Matters

- **Prompt instructions are soft contracts** — Models can hallucinate or violate instructions despite clear wording
- **Streaming makes duplicate detection harder** — Tool calls are emitted as generated; no global view exists at the client
- **API is the trust boundary** — Server-side validation is the only reliable enforcement point
- **Affects UX directly** — Duplicate tool calls = duplicate forms, wasted user effort, potential double-submission bugs

## Tools Requiring Single-Call Enforcement

Maintain a table like this for your own project's tools that must only be called once per
response (any tool that creates a resource, renders a form, or links records is a candidate):

### `<toolName>` (example: a clarification-form tool)
- **Rule**: Only one call per assistant message
- **Reason**: Prevents duplicate form rendering and user confusion
- **Enforcement**: Deduplication filter at your chat API route
- **Test**: Verify only one form appears when the model generates multiple calls

Add one entry per single-call-per-response tool your project defines, with its own rule/reason/
enforcement/status — don't leave this section as a placeholder once you have real tools.

## Implementation Pattern

When adding a new "single-call-per-response" tool:

### 1. Document in system prompt
```markdown
## Gathering Information
When you need specific details, use <toolName> once per response.
Never chain multiple calls to it.
```

### 2. Add server-side deduplication
```typescript
// In your chat API route handler

function deduplicateSingleCallTool(message: UIMessage, toolName: string): UIMessage {
  if (message.role !== "assistant") return message;

  const seenTool = new Set<string>();
  const filteredParts = message.parts.filter((part) => {
    if (!part.type.startsWith("tool-")) return true;

    const tp = part as unknown as { toolName?: string };
    if (tp.toolName === toolName) {
      if (seenTool.has(toolName)) {
        return false; // Filter out duplicate
      }
      seenTool.add(toolName);
    }
    return true;
  });

  return { ...message, parts: filteredParts };
}

// Apply at response boundary:
const response = result.toUIMessageStreamResponse();
// Intercept stream to filter messages...
```

### 3. Add tests
```typescript
test("should deduplicate consecutive [toolName] calls", async () => {
  const response = await POST(req);
  const messages = await parseUIMessages(response);

  const toolCalls = messages[messages.length - 1].parts.filter(
    p => p.toolName === "toolName"
  );

  expect(toolCalls).toHaveLength(1); // Only one should remain
});
```

### 4. Monitor and log
Log deduplication events during development:
```typescript
if (duplicatesRemoved > 0) {
  console.warn(`[chat] deduped ${duplicatesRemoved} ${toolName} calls`);
}
```

## Checklist

- [ ] Tool documented in system prompt with "once per response" instruction
- [ ] Server-side deduplication implemented at response boundary
- [ ] Tests added to verify single-call enforcement
- [ ] Deduplication logic is applied to all assistant messages
- [ ] No false negatives (single valid calls pass through)
- [ ] No false positives (legitimate multi-call scenarios not blocked)
- [ ] Monitoring/logging added for debugging
- [ ] Documented in this rule file

## Related Issues

Log the first real occurrence of a duplicate-tool-call bug in `.project/knowledge/issues/` and
link it here — that's what turns this from a template into a rule with teeth for your project.

## Notes

This rule addresses a class of bugs where models violate "call once" constraints in their instructions. By enforcing at the server boundary, we eliminate the entire class of duplicate-tool-call bugs before they reach users.
