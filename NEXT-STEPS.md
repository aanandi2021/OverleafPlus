# Next Steps — Post-Handoff Engagement

The compliance workbench is a **working prototype and a validated development approach**. Microsoft's role in this engagement was to prove the pattern; the Bank of Canada owns internal continuation. This document outlines how to take it from prototype to a supported internal capability, with Microsoft help where useful.

---

## Recommended path: engage a Microsoft Cloud Solution Architect (CSA)

A CSA is a Microsoft technical resource who works alongside your team to design and stand up production Azure solutions. For this project a CSA-led follow-on would cover the gap between "runs on a laptop" and "supported BoC service."

### How to start
1. **Raise the ask with your Microsoft account team** (the account executive who owns this engagement). Request a CSA-led follow-on scoped to the LaTeX compliance workbench.
2. **Share the baseline:** this repository, plus `DESIGN.md` (phased architecture) and `COMPLIANCE-AGENT-DESIGN.md` (compliance agent design).
3. **Agree success criteria** up front (see below).

---

## Scope a CSA engagement could cover

| Workstream | Outcome |
|---|---|
| **Hosting** | A hosted test instance so Colin & Masoud can evaluate before BoC prepares its own environment. |
| **Azure reference architecture** | App Service (or Container Apps) + Key Vault for secrets + Entra ID auth, as a deployable IaC template. |
| **Sandboxed compilation** | `pdflatex` isolated in a container / restricted execution context (it runs on user-supplied source). |
| **LLM Layer 2** | Optional tone / style / jargon checks (per `COMPLIANCE-AGENT-DESIGN.md` Layer 2) with reasoning shown. |
| **Governance pack** | Component/dependency inventory, security review inputs for CRAF and SA&A, data-flow documentation. |
| **Support model** | A BoC-owned runbook: deploy, rotate tokens, update `boc-style-rules.yml`, monitor, and support. |

---

## What BoC can do in parallel (no Microsoft dependency)

- **Extend the rules** in `boc-style-rules.yml` — spelling, acronyms, required sections, disclaimer text.
- **Decide the integration shape** — native Overleaf (fast) vs. GitHub PR (governed), or both.
- **Prepare the target environment** — subscription, resource group, Entra ID app registration, network rules.
- **Confirm Overleaf licensing** — Professional/Premium for the git bridge, or a self-hosted Overleaf CE evaluation.

---

## Open items carried from prior discussions

- BoC deployment/governance path: **CRAF, SA&A, security review, support model.**
- **Repo/code transfer** mechanics into BoC's environment (this handoff repo is the transfer artifact).
- **Hosted test instance** for functional evaluation ahead of environment prep.
