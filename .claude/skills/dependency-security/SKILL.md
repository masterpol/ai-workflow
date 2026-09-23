---
name: dependency-security
description: Audit project dependencies for known vulnerabilities and security-relevant updates without changing manifests or lockfiles.
---

# Dependency Security

> **Recommended capability profile:** `standard` — vulnerability triage and upgrade-risk judgment. Select an available model using `ai-framework/integrations/harnesses.md`.

Audit dependencies for known vulnerabilities and security-relevant updates. This skill is read-only
until the user explicitly approves a remediation plan.

## Safety Rules

- Never read `.env`, `.env.local`, credentials, or local harness settings.
- Never run an install, update, audit fix, or lockfile rewrite during the audit.
- Do not report an outdated package as a vulnerability without evidence from the audit output or a
  linked advisory.
- Do not recommend a major-version upgrade as an automatic security fix; describe migration risk
  and the smallest supported remediation.

## Procedure

1. **Detect the dependency surface.** Read only package manifests, lockfiles, and documented
   dependency configuration. Identify ecosystems actually present, for example `package.json` /
   `pnpm-lock.yaml`, `pyproject.toml` / `requirements*.txt`, `Gemfile.lock`, `go.mod`, or
   `Cargo.lock`.
2. **Run the installed ecosystem's read-only audit.** Prefer commands already available in the
   project; do not install audit tooling just to perform a scan.

   | Ecosystem | Vulnerability audit | Update inventory |
   |---|---|---|
   | npm | `npm audit --json` | `npm outdated --json` |
   | pnpm | `pnpm audit --json` | `pnpm outdated --format json` |
   | Yarn Berry | `yarn npm audit --all --json` | `yarn outdated --json` |
   | Yarn Classic | `yarn audit --json` | `yarn outdated --json` |
   | Bun | `bun audit` when available | `bun outdated` when available |
   | Python | `pip-audit -r <requirements-file>` or `pip-audit --locked` when already installed | `pip list --outdated` only in a confirmed project virtual environment |
   | Ruby | `bundle-audit check` when already installed | `bundle outdated` |
   | Rust | `cargo audit` when already installed | `cargo outdated` when already installed |
   | Go | `govulncheck ./...` when already installed | `go list -m -u all` |

   For Python, do not run a bare `pip-audit` or `pip list --outdated` against an arbitrary active
   environment. Bind the audit to the detected requirements file or project lock; when no such
   input is available, report Python coverage as incomplete. If a relevant tool is unavailable,
   report that fact and give the exact optional command to install or run it later. Do not treat
   unavailable tooling as a clean audit.
3. **Triage findings.** Separate direct from transitive dependencies and production from
   development-only exposure. For each verified vulnerability, capture advisory/CVE identifier,
   affected installed version, fixed version, severity, reachability or exposure notes, and the
   smallest remediation. Treat package-manager audit severities as input, not proof of exploitability.
4. **Assess update risk.** Use the update inventory only to find security-relevant fixed versions.
   Flag major upgrades, peer-dependency changes, lockfile churn, and packages without a compatible
   patched release as risks requiring a plan.
5. **Report and gate.** Present the findings and a minimal remediation plan. Do not modify files
   until the user selects **Approve / Revise / Back / Stop**.

## Output

```markdown
## Dependency Security Report

### Coverage
| Ecosystem | Manifest / Lockfile | Audit | Update inventory | Status |
|---|---|---|---|---|

### Verified Vulnerabilities
| Tier | Package | Direct? | Advisory | Installed → Fixed | Exposure / Remediation |
|---|---|---|---|---|---|

### Security-Relevant Updates
| Package | Current → Target | Reason | Upgrade Risk |
|---|---|---|---|

### Unavailable Checks
- `<tool>` was not installed; not treated as a passing audit.

### Recommendation
- `PASS` — no verified vulnerabilities in the completed audits.
- `PLAN REQUIRED` — remediation needs approval before dependency changes.
- `MANUAL REVIEW` — incomplete audit coverage or no compatible fixed version.

Options: **Approve remediation plan / Revise / Back / Stop**
```

## After Approved Remediation

Use the normal `/build → /audit → /ship` flow for dependency changes. Re-run the same audit,
the project build, and its tests after updating manifests or lockfiles. Record a non-trivial CVE
or upgrade lesson in `.project/knowledge/issues/` only when it will help a future task, then run
`node ai-framework/scripts/graphify.js`.
