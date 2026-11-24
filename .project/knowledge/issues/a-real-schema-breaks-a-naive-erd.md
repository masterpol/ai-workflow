---
id: a-real-schema-breaks-a-naive-erd
type: issue
created: 2026-11-24
updated: 2026-11-24
tags: [state-report, archify, erd, untrusted-input, validation]
related: [archify-renders-the-state-report, parse-untrusted-values-and-re-emit-them, allow-list-untrusted-labels-at-ingest-and-at-render]
source: state-project-depth
severity: high
resolved: true
---

# Issue: an ERD built straight from a real schema made Archify refuse the whole `/state` page

## What happened

The first project-depth draft passed `archify validate` on its own fixtures but failed on shapes that every real schema has.
Archify's ERD renderer (`renderers/erd/render-erd.mjs`) refuses the whole explainer when:

- a relationship connects an entity to itself, as a `parent_id` self-reference does;
- an attribute's `references` names a column that is not emitted. This happened when the target column had been truncated
  (labels are cut to 28 characters), when it fell beyond the attribute display cap, or when its table was not among the shown entities;
- two attributes of one entity have the same name, as happens when `a_b` and `a-b` both clean to `a-b`.

A failed `validate` is a failed `/state`, so one self-reference turned the report off for the whole project.

## Fix

- Count self-references and say so in the note; never draw them.
- Allocate emitted attribute names per entity, unique and dot-free, using a `~N` suffix on collision. Map raw name to emitted name once.
- Emit `references` only when both ends are drawn, using the mapped emitted name. Count the rest in the note.
- Test the awkward schema through the real `archify validate`, not only through structural asserts.

## Lesson

A renderer that validates its input strictly needs a fixture built from a real schema's awkward shapes (self-references, long and
colliding names, hidden targets), checked through the renderer itself. Hostile-name fixtures alone do not catch this.
See [[archify-renders-the-state-report]] and [[parse-untrusted-values-and-re-emit-them]].
