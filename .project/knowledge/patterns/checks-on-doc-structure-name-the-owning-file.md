---
id: checks-on-doc-structure-name-the-owning-file
type: pattern
created: 2026-10-07
updated: 2026-10-07
tags: [documentation, workflow-doctor, bundle-sync, links, refactor]
related: [opt-in-before-runtime-discovery, guard-tests-can-fail-for-the-wrong-reason]
source: readme-split
confidence: low
---

# Pattern: structure checks on documentation name the file that owns each heading

`workflow-doctor.js` grepped `README.md` for section headings, and `bundle-sync` copies only an
allowlist of directories. Splitting the README therefore needed three coupled changes: each
check names its owning doc (`[doc, regex, detail]`), the new docs directory joins the sync
allowlist (and the duplicated list in its test), and a link check proves the index still
reaches every doc.

Before moving documented text, grep scripts and skills for the headings and for
"README's ..." prose references. Patch the guard first, then prove it fails by renaming one
heading in a scratch copy. A link checker must not crash on malformed escapes, symlinks or
long lines: it runs on repository content nobody has reviewed.
