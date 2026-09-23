# UI/UX Review Standards

## Purpose

Ensure user interfaces are **usable, simple, and follow this project's design patterns**. This rule enforces Nielsen's 10 Usability Heuristics + project-specific guidelines to prevent overly complex UIs that confuse users.

**Run this review after development for any UI feature.** Use the `/ui-review` command or manual evaluation.

---

## Nielsen's 10 Usability Heuristics for Evaluation

### H1: Visibility of System Status
The system should always keep users informed through real-time feedback.

**Check:**
- [ ] Session/task progress is visible without clicking extra controls
- [ ] User knows which step they're on (no hidden state)
- [ ] Loading states show progress (spinners, skeleton screens, percentage)
- [ ] Errors are visible immediately; users don't guess what went wrong
- [ ] Status indicators (active, pending, complete) are clear with colors + text (not color alone)

**Violations to Catch:**
- Data loading with no loading state → user thinks it's broken
- Guidance panel hidden by default → user doesn't know help exists
- Steps progress unclear → user confused about where they are

---

### H2: Match Between System and Real World
Use language, concepts, and patterns from the user's world.

**Check:**
- [ ] Use user-familiar language ("Step 1 of 5" not "Panel 3 of 8")
- [ ] No implementation jargon leaking into end-user UI (no "mutation", "schema", "endpoint")
- [ ] Visual metaphors align with the task (pen for writing, target for goal, chat for discussion)
- [ ] Navigation mirrors the user's mental model (left-to-right flow, top-to-bottom scanning)
- [ ] Button labels are action words ("Start Step", "Get Hint", not "Confirm", "Execute")

**Violations to Catch:**
- Mixed audience language (admin + end-user UI in one screen)
- Technical terms in user-facing text
- Icons don't match user expectations

---

### H3: User Control & Freedom
Users should be able to undo, exit, and recover from mistakes.

**Check:**
- [ ] Can exit a flow at any time (close button visible, no hidden exit)
- [ ] Can go back to previous steps (if design allows it)
- [ ] Destructive actions require confirmation (delete, submit final answer)
- [ ] No "trap" modals that force an action before proceeding
- [ ] If a session/flow is paused, it can be resumed from where they left off
- [ ] Accidental clicks don't break state (input resets, not lost)

**Violations to Catch:**
- Submit button at top of long form (user must scroll to confirm, easy to miss)
- "Are you sure?" dialogs on non-destructive actions (noise)
- No way to cancel an in-progress action
- Hidden "back" navigation

---

### H4: Consistency & Standards
Design should follow patterns within this project and match user expectations.

**Check:**
- [ ] All sessions use the same layout (header, content, footer)
- [ ] All buttons use the same style (same size, color scheme, hover state)
- [ ] All forms use the same structure (label above field, help text below)
- [ ] App shell layout consistent across web + mobile (if both exist)
- [ ] Color meanings consistent: red=error, green=success, blue=info, yellow=warning
- [ ] Icons reused (same icon for same concept everywhere)
- [ ] Typography hierarchy consistent (headings, body, labels all same style)

**Violations to Catch:**
- Some buttons use `size-10`, others `size-11`
- Session layout changes between pages
- Same icon used for different actions
- Inconsistent spacing between components
- Form styling differs between pages

---

### H5: Error Prevention
Better to prevent problems than fix them after.

**Check:**
- [ ] Form validation happens as user types (not just on submit)
- [ ] Required fields marked clearly (not just in HTML)
- [ ] Disable submit button while loading (prevents double-submit)
- [ ] Confirm before destructive actions (end session, delete attempt, etc.)
- [ ] Prevent invalid state (e.g., submit disabled if required fields empty)
- [ ] Clear error messages say **what's wrong** + **how to fix it**

**Violations to Catch:**
- Error only shows on submit (too late)
- "Invalid input" without saying why
- No indication that a field is required
- Can submit form multiple times

---

### H6: Recognition vs Recall
Make things visible; don't make users remember.

**Check:**
- [ ] Next action is obvious (not "Figure out what to do next")
- [ ] Available options are visible (don't hide in menus if they fit on screen)
- [ ] Instructions are on the page (not only in help docs)
- [ ] User can see their progress at a glance (progress bar, checkmarks)
- [ ] Hint/help button always visible (not buried in a menu)
- [ ] Context is clear (user knows what session/task they're in)

**Violations to Catch:**
- "Click next to continue" but next button hidden below fold
- Help only accessible from a menu icon
- Progress hidden in a drawer
- Empty state with no guidance on what to do

---

### H7: Flexibility & Efficiency
Support both novices and power users.

**Check:**
- [ ] Keyboard shortcuts work (Tab, Enter, Escape, arrow keys)
- [ ] Screen readers can navigate (semantic HTML, ARIA labels)
- [ ] Can reach main actions without scrolling on mobile (360px viewport)
- [ ] Shortcuts/accelerators exist for frequent actions (optional; don't clutter UI)
- [ ] Touch targets are 44×44px minimum (mobile friendly)
- [ ] Responsive: works at 360px, 768px, 1920px (not just one breakpoint)

**Violations to Catch:**
- Keyboard nav doesn't work (no tabindex, no focus styles)
- Touch button is 32px (too small)
- Mobile layout requires horizontal scrolling
- No way to accomplish a task without mouse

---

### H8: Aesthetic & Minimalist Design
Remove noise. Every element should serve a purpose.

**Check:**
- [ ] **Main content is not crowded** (max 2-3 major sections per screen)
- [ ] Whitespace used to group related items (spacing > 16px between groups)
- [ ] No decorative animations (animations only for state changes: load, open, highlight)
- [ ] Sidebar/panels not always expanded (collapse by default on mobile)
- [ ] Information hierarchy clear: most important at top, secondary below
- [ ] "Nice-to-have" features hidden behind progressive disclosure (expandable sections)
- [ ] No duplicate information (don't show the same data in 2 places)

**Project-Specific:**
- [ ] App shell: 1 main task + 1 guidance panel max (not 3+ panels)
- [ ] Session: Step content takes 70%+ of screen, controls don't dominate
- [ ] Guidance: Shown when needed, not forcing attention away from task
- [ ] Forms: 1 question per screen (not 5 questions on one form)

---

### H9: Error Recovery
When errors happen, help users fix them.

**Check:**
- [ ] Error messages are specific (e.g., "Saved successfully" not "Done")
- [ ] Errors suggest a fix (e.g., "Invalid email. Did you mean example@gmail.com?")
- [ ] No error codes without explanation
- [ ] User can retry/recover without starting over
- [ ] Data isn't lost on error (form content preserved)
- [ ] Server errors have a retry button

**Violations to Catch:**
- "Error" with no context
- Form data cleared after error
- No retry option for network failures
- Cryptic error codes

---

### H10: Help & Documentation
Provide context-sensitive help, not dense manuals.

**Check:**
- [ ] Help is inline, not a separate doc
- [ ] Tooltips explain what buttons do (hover or long-press on mobile)
- [ ] Empty states have guidance ("No sessions yet. Create one to start.")
- [ ] Complex features have an intro (onboarding, guided tour, or info card)
- [ ] No "FAQ" instead of fixing the UI (if it needs FAQs, redesign it)

**Violations to Catch:**
- "Click here for instructions" (instructions should be visible)
- Help icon without any visible help
- Dense text block explaining how to use the page
- No guidance for empty state

---

## Project-Specific Patterns

### Pattern: Progressive Disclosure
Hide complexity by default. Reveal advanced options only when needed.

```
✅ Good: Main action obvious, details hidden
┌────────────────────────────────┐
│ Start Session                  │
│ [Big blue button]              │
├────────────────────────────────┤
│ ⊕ Advanced Options             │
│ └─ Session duration: [input]   │
│ └─ Allow hints: [toggle]       │
└────────────────────────────────┘

❌ Bad: All options visible
┌────────────────────────────────┐
│ Session name: [input]          │
│ Duration: [input]              │
│ Allow hints: [toggle]          │
│ Enable timer: [toggle]         │
│ Show progress bar: [toggle]    │
│ [Start] [Cancel] [Reset]       │
└────────────────────────────────┘
```

### Pattern: Clarity Over Cleverness
Don't use space-saving tricks if they hide meaning.

```
✅ Clear
[Tab 1: Sessions]  [Tab 2: Archive]

❌ Clever but confusing
[●] [◯]     ← What do these dots mean?
```

### Pattern: Task-Focused Sidebars
Keep guidance panels secondary to the main task.

```
┌─────────────────────────────┬──────────┐
│ Session: Algebra            │ Guidance │
│                             │ ─────── │
│ [Main task takes 70%]       │ Hint:   │
│                             │ Focus   │
│                             │ on...   │
│                             │          │
└─────────────────────────────┴──────────┘

NOT:
┌──────────┬─────────────────────┬──────────┐
│ Nav      │ Content             │ Guidance │
│ ─────    │ ─────────────────── │ ─────   │
│ [tiny]   │ [crowded]           │ [tiny]  │
└──────────┴─────────────────────┴──────────┘
```

### Pattern: Cognitive Load Limit
Max 2-3 decisions per screen. More = overwhelm.

```
✅ One decision
[Step 1 of 5: Write an essay]
[Text editor]
[Next]

❌ Too many decisions
[Which topic?] [Solo or pair?] [Time limit?] [Hints on/off?]
[Submit early?] [Save draft?] [See rubric?] [Show examples?]
[Next] [Back] [Skip] [Help] [Settings]
```

### Pattern: Responsive Sidebar → Sheet
On mobile, move sidebar to a bottom sheet (not always expanded).

```
Desktop (≥768px):
┌─────────────────┬──────────┐
│ Content (70%)   │ Guide    │
│                 │ (30%)    │
└─────────────────┴──────────┘

Mobile (<768px):
┌─────────────────┐
│ Content (100%)  │
│ [?] Help button │
└─────────────────┘
  ↓ (user taps ?)
┌─────────────────┐
│ ⬆ Guidance      │
│ ─────────────   │
│ Hint, tips...   │
└─────────────────┘
```

---

## Review Checklist

Use this checklist when reviewing UI features:

### Visibility & Status
- [ ] Progress is visible without scrolling
- [ ] Loading states are clear (spinner, skeleton, percentage)
- [ ] User always knows what they can do next
- [ ] Errors are obvious and actionable

### Language & Concepts
- [ ] User-appropriate language (no jargon)
- [ ] Button labels are verbs (Start, Submit, Get Hint)
- [ ] Icons match expectations
- [ ] No mixed-audience content on one screen

### Control & Freedom
- [ ] Can exit/escape at any time
- [ ] Destructive actions ask for confirmation
- [ ] No trap dialogs or hidden exits
- [ ] Can undo/recover from mistakes

### Consistency
- [ ] Layout consistent with other sessions
- [ ] Button styles unified
- [ ] Color meanings consistent
- [ ] Icons reused for same concepts

### Error Handling
- [ ] Validation happens early (as user types)
- [ ] Required fields marked clearly
- [ ] Error messages say **what + how to fix**
- [ ] Errors don't lose user's data

### Recognition
- [ ] Next action obvious
- [ ] Help always visible
- [ ] Context clear (what session is this?)
- [ ] Progress visible at a glance

### Efficiency
- [ ] Keyboard nav works
- [ ] Touch targets ≥44px
- [ ] Works at 360px, 768px, 1920px
- [ ] No unnecessary scrolling

### **Simplicity** ⚠️ **PRIORITY**
- [ ] **No more than 2-3 sections per screen**
- [ ] **Main content takes 60-70% of space**
- [ ] **Sidebar/panels collapsed by default on mobile**
- [ ] **No decorative animations**
- [ ] **Whitespace separates sections (spacing ≥16px)**
- [ ] **Complex options hidden (progressive disclosure)**

### Recovery
- [ ] Specific error messages with fixes
- [ ] Data preserved on error
- [ ] Retry button for network failures
- [ ] No cryptic error codes

### Help
- [ ] Inline help, not separate docs
- [ ] Tooltips explain actions
- [ ] Empty states have guidance
- [ ] No need for FAQ (UI should be self-explanatory)

---

## Scoring Rubric (0–3 scale)

**Rate each heuristic:**
- **3** — Fully compliant. User would not struggle.
- **2** — Mostly compliant. Minor UX friction.
- **1** — Partially compliant. User will struggle.
- **0** — Not addressed. Major usability issue.

**Feature passes if:**
- All 10 heuristics score ≥2
- **Simplicity (H8) scores ≥3** (non-negotiable)
- Project-specific UI patterns followed

---

## When to Use This Rule

✅ **Use for:**
- New session screens
- End-user-facing UI changes
- Forms, dialogs, panels
- Guidance / help systems
- Mobile-specific screens

❌ **Skip for:**
- Pure backend changes
- Internal admin tools (use common sense instead)
- Library/utility code
- Database schema changes

---

## References

- [Nielsen's 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- Component architecture: `ai-framework/rules/component-architecture.md`
- Styling standards: your project's generated styling rule (if `/setup` created one)
- Responsive design: `ai-framework/rules/component-architecture.md#mobile-first-design-principle`
