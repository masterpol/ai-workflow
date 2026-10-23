# Source-review supplement: readme-split

Prepared 2026-10-22 from the verified recovery source. This supplements the unchanged [compact record](../pitch-compression/readme-split.md) for the 2026-10-08 release 2.11.0. Historical limitations and review results below are not a new runtime certification.

## Checker limits and review provenance

The original audit acknowledged a bounded supported subset: inline Markdown links and ATX-heading anchors. Reference-style links, HTML links/anchors, setext headings, percent-encoded anchors and query strings were outside that audit's supported subset. The README topic-coverage check used substring presence of a topic path; it did not prove that occurrence was a navigable Markdown link. The original closure also recorded no dedicated doctor test, and reviewers were not canary-tested: independence was no.

The ship-time missed changelog-skill reference to the old README section was repaired in both mirrors. [Current checker code](../../../ai-framework/scripts/docs-links.mts) and [doctor guidance](../../../ai-framework/docs/workflow-doctor.md) remain the implementation and usage references; this historical note does not expand their supported behavior.

## Audit evidence and exclusions

Six should-fix issues were repaired: malformed URI escapes became reported failures; the link regex and prose-line cap bounded pathological input; directory collection refused symlink traversal and guarded unreadable listings; doctor link-check exceptions became failures; heading slugs retained underscores; and CLI/error/duplicate-anchor tests were added. Cross-pitch must-fix claims were refuted using disjoint diff hunks. The verbatim-move check remained author-run, and the coding/testing checklist walk was not fully verified by reviewers. The compact record retains the final 514-test and link-check results, not a claim that this source-review reran them.

## Documentation ownership

Bundle documentation lives under ai-framework/docs to avoid colliding with a receiving project's docs directory. SETUP.md and the setup topic own setup guidance; the README retains quick steps and pointers. Separate purpose lines were omitted because the existing first paragraph served that purpose. The documentation-check wording for --fix was retargeted to the workflow-doctor topic. The bundle-only guard, sync registration and negative heading check remain in their owning implementation and retained closure evidence. No dependency, docs-site generator, translation or general prose rewrite was part of the shipped scope.
