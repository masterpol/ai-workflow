# Deviations

- Audit tightened shortlist eligibility to bounded, regular graph files reached through a project path without symlinks. A graph configured outside the project or behind a symlink still uses native Graphify output.
- Deferred shared reader hardening for concurrent ancestor replacement. The pinned leaf protects against replacement after inspection, but Node path-based inspection cannot guarantee containment throughout an adversarial ancestor rename. Addressing the shared reader across supported platforms is outside this query fix.
