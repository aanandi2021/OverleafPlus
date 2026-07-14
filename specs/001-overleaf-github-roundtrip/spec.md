# Feature Specification: BoC Overleaf/GitHub Compliance Round Trip

**Feature Branch**: `001-overleaf-github-roundtrip`
**Created**: 2026-07-13
**Status**: Draft
**Input**: Reverse engineered from the current `aanandi2021/OverleafPlus` working tree in `boc-overleaf-copilot`.

## User Scenarios & Testing

### Primary User Story

As a Bank of Canada document author or reviewer, I want to check a LaTeX paper out of an Overleaf-connected repository, run Bank of Canada compliance fixes, review exactly what changed, and check the corrected version back in so that Overleaf remains the authoring surface while the compliance workflow is auditable and repeatable.

### Acceptance Scenarios

1. **Overleaf native review copy**
   - Given the Overleaf git bridge is configured
   - When a user checks out the current paper, applies compliance fixes, and checks in using review-copy mode
   - Then the application writes a `_compliance.tex` sidecar file to `main`
   - And the original source remains untouched
   - And the user sees a commit, target file, branch, and change summary.

2. **Overleaf native overwrite**
   - Given the Overleaf git bridge is configured
   - When a user chooses overwrite mode and checks in fixes
   - Then the corrected LaTeX replaces the source `.tex` file on `main`
   - And the change is immediately visible in Overleaf after push.

3. **GitHub governed review**
   - Given a GitHub mirror repository is configured
   - When a user checks in corrected LaTeX with pull request creation enabled
   - Then the application pushes the corrected source to `compliance-fixes`
   - And opens a pull request against `main`
   - And reports the PR URL or a clear PR creation error.

4. **Compliance review before check-in**
   - Given a user has checked out a paper
   - When they run the compliance checker and open the diff view
   - Then the application shows before/after LaTeX side by side
   - And the user can apply the corrected version before check-in.

5. **Missing configuration**
   - Given a target remote is not configured
   - When the user opens the Repo tab or tries checkout/check-in
   - Then the UI reports the missing configuration without exposing secrets.

## Requirements

### Functional Requirements

- **FR-001**: The application MUST expose a Repo tab where users can choose either `Overleaf` or `GitHub` as the round-trip target.
- **FR-002**: The application MUST report whether each target is configured before checkout/check-in.
- **FR-003**: The application MUST support checkout from an Overleaf native git bridge remote.
- **FR-004**: The application MUST support checkout from a GitHub repository used as an Overleaf-synced mirror.
- **FR-005**: On checkout, the application MUST select the primary `.tex` file using this order: `main.tex`, first `.tex` containing `\documentclass`, then first `.tex` file.
- **FR-006**: On checkout, the application MUST load the selected LaTeX source into the editor and trigger preview rendering.
- **FR-007**: The application MUST support deterministic Bank of Canada compliance checks using `boc-style-rules.yml`.
- **FR-008**: The application MUST support automatic fixes for configured spelling and whitespace rules.
- **FR-009**: The application MUST preserve LaTeX indentation and escaped/control spaces when applying whitespace fixes.
- **FR-010**: The application MUST provide a side-by-side before/after diff for compliance fixes.
- **FR-011**: The application MUST allow users to apply the diff output back into the editor before check-in.
- **FR-012**: For Overleaf native check-in, the application MUST push only to `main`.
- **FR-013**: For Overleaf native check-in, the application MUST support a safe sidecar mode that writes `<source>_compliance.tex`.
- **FR-014**: For Overleaf native check-in, the application MUST support an overwrite mode that replaces the source `.tex` file.
- **FR-015**: For GitHub check-in, the application MUST push corrected source to a `compliance-fixes` branch.
- **FR-016**: For GitHub check-in, the application SHOULD open a pull request when requested.
- **FR-017**: The application MUST summarize changed, added, and removed LaTeX lines while ignoring whitespace-only differences.
- **FR-018**: The UI MUST mirror checkout/check-in events into both the Repo activity log and the chat panel.
- **FR-019**: The application MUST redact Overleaf and GitHub tokens from logs, API responses, and error messages.
- **FR-020**: The application MUST remove authenticated remote URLs from stored git config after clone.
- **FR-021**: The application MUST return explicit user-facing errors for missing target, missing LaTeX, missing remote configuration, git failures, and PR creation failures.

### Non-Functional Requirements

- **NFR-001 Security**: Secrets MUST be supplied only through environment variables or a production secret store.
- **NFR-002 Security**: Production deployment MUST sandbox LaTeX compilation because `pdflatex` runs on user-supplied source.
- **NFR-003 Governance**: The GitHub path MUST provide an auditable review gate through branch and pull request workflow.
- **NFR-004 Reliability**: Checkout MUST reset the local workspace to the remote source of truth before reading the paper.
- **NFR-005 Usability**: The Repo tab MUST make the Overleaf branch limitation visible to users before check-in.
- **NFR-006 Portability**: The prototype SHOULD run locally with Node.js 18+, git, and a local LaTeX distribution.
- **NFR-007 Deployment**: A production path SHOULD support Azure App Service or Azure Container Apps, Key Vault/App Settings, and Entra ID authentication.

## Key Entities

- **Repository Target**: A configured remote endpoint; either Overleaf native git bridge or GitHub mirror.
- **LaTeX Source File**: The selected `.tex` file loaded from the target repository.
- **Compliance Rule Set**: Versioned Bank of Canada style and structure rules in `boc-style-rules.yml`.
- **Compliance Result**: Errors, warnings, auto-fixes, and stats produced by the checker.
- **Correction Diff**: Before/after representation of changes between checked-out and corrected source.
- **Check-in Mode**: `sidecar`, `overwrite`, or GitHub branch/PR.
- **Review Artifact**: `_compliance.tex` sidecar file or GitHub pull request.

## Integration Constraints

- Overleaf native git bridge requires a paid Overleaf plan with git integration enabled.
- Overleaf native git bridge accepts pushes only to `main`; it rejects new branches.
- GitHub mirror mode assumes Overleaf can pull from or synchronize with the GitHub repository.
- The application currently uses a local scratch workspace for clones.
- GitHub PR creation depends on authenticated `gh` CLI availability.

## Out of Scope

- Full production authentication and authorization.
- Hosted Azure reference deployment.
- Containerized/sandboxed LaTeX compilation.
- Multi-file LaTeX project editing beyond selecting a primary `.tex` file.
- Merge conflict resolution inside the browser.
- Self-hosted Overleaf Community Edition deployment.
- LLM-based Layer 2 tone, clarity, or jargon reasoning beyond deterministic rules.

## Success Metrics

- A user can complete `checkout -> compliance check -> diff review -> check-in` from the browser without manual git commands.
- Overleaf sidecar mode never overwrites the original document.
- GitHub mode produces a reviewable branch and, when configured, a pull request.
- No access token appears in UI text, API JSON, server logs, or `.git/config`.
- The handoff artifact is clear enough for BoC to choose between fast Overleaf-native review and governed GitHub PR review.

## Open Questions

- Which integration path should BoC standardize on: Overleaf-native sidecar, GitHub PR, or both?
- Should production check-in require explicit reviewer approval before push?
- Should the app support multi-file LaTeX projects with includes, bibliographies, and assets?
- What is the BoC target hosting environment and required CRAF/SA&A evidence pack?
- Should compliance rules be editable by non-developers through an admin UI?
- Should the change summary be computed with a true line-diff algorithm in the browser, server, or both?

## Evidence from Current Implementation

- `repo-sync.js` implements checkout/check-in for `overleaf` and `github`.
- `server.js` exposes `/api/repo/status`, `/api/repo/checkout`, and `/api/repo/checkin`.
- `public/index.html` adds the Repo tab and target-specific controls.
- `public/app.js` wires repo status, checkout, check-in, change summary, and chat mirroring.
- `public/style.css` adds Repo tab and summary styling.
- `HANDOFF.md` and `NEXT-STEPS.md` document customer handoff, integration options, and CSA continuation.
- Existing commits show the prior baseline: LaTeX generator, compliance checker, and side-by-side diff view.
