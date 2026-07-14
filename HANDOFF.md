# Handoff — BoC LaTeX Compliance Workbench

A web tool that checks a LaTeX paper out of Overleaf, applies **Bank of Canada** style/compliance rules, and checks the corrected version back in — through **Overleaf's native git** or a **GitHub** review branch.

Prepared for the Bank of Canada team to run, evaluate, and continue internally.

---

## 1. What it does

**Round-trip:** `Overleaf → check out → compliance fixes → review → check in → Overleaf`

- **Compliance engine** (`compliance-checker.js` + `boc-style-rules.yml`) — Canadian English spelling, BoC acronym expansion, required sections (Abstract, JEL, Keywords, Disclaimer), and structural checks. Deterministic and auto-fixable; every change is shown in a side-by-side diff.
- **AI drafting** (optional, `/api/generate`) — GPT-4o via GitHub Models turns a plain-English description into LaTeX.
- **Live preview** (`/api/compile`) — local `pdflatex` renders a real PDF.
- **Repo sync** (`repo-sync.js`) — the new check-in / check-out layer described below.

---

## 2. The two integration paths

| | **Path A — Overleaf native** | **Path B — GitHub** |
|---|---|---|
| Remote | `git.overleaf.com/<project-id>` | A GitHub repo (Overleaf-synced mirror) |
| Check-in target | **`main` only** (Overleaf constraint) | `compliance-fixes` **branch** + optional PR |
| Review gate | Sidecar file `..._compliance.tex` on `main` | Pull request diff |
| Round-trip | One hop — appears live in Overleaf instantly | Researcher clicks *pull* in Overleaf to sync |
| Best for | Speed, fewest moving parts | Formal review / governance / audit trail |

> **Key technical finding:** Overleaf's git bridge **rejects any push to a branch other than `main`** (`"You can't push any new branches. Please use the main branch."`). That is why the native path uses a **sidecar review file** instead of a review branch. The GitHub path has no such limit and supports branches + PRs.

---

## 3. Prerequisites

- **Node.js 18+** (uses global `fetch`).
- **A LaTeX distribution** with `pdflatex` on `PATH` (e.g. MiKTeX or TeX Live) for live PDF preview.
- **`git`** and (for the GitHub PR feature) the **GitHub CLI `gh`**, authenticated.
- **Overleaf Professional (Premium)** plan for the native git bridge — the git bridge is a paid feature (not on Free). See §6.

---

## 4. Setup

```bash
npm install
cp .env.example .env    # then fill in the values
node server.js          # http://localhost:5200
```

### Environment variables (`.env`)

| Key | Purpose | Required for |
|---|---|---|
| `GITHUB_TOKEN` | GitHub Models API (GPT-4o generation) | AI drafting |
| `OVERLEAF_PROJECT_URL` | `https://git.overleaf.com/<project-id>` — the **default** project | Path A |
| `OVERLEAF_GIT_TOKEN` | Overleaf git personal access token (`olp_…`) — **account-level**, works for any project | Path A |
| `GITHUB_DEMO_REPO` | `https://github.com/<owner>/<repo>.git` | Path B |
| `GITHUB_DEMO_TOKEN` | GitHub PAT with `repo` scope (push + PR) | Path B |
| `REPO_WORKSPACE_DIR` | Local scratch dir for clones (default `C:\Users\<you>\overleaf-workspace`) | optional |

`.env` is git-ignored. Tokens are **never** written into `.git/config` (the remote URL is stripped after clone) and are **redacted** from all API responses and logs.

---

## 5. Using the workbench

1. Open **http://localhost:5200** → **🔗 Repo** tab. Both configured remotes show green.
2. Pick a target (**Overleaf** or **GitHub**) → **⬇ Check out**. The paper loads into the editor and previews.
   - **Overleaf:** the *Overleaf project* field targets any project — paste a project URL or ID, or leave it blank to use the `OVERLEAF_PROJECT_URL` default. The same `olp_` token works for all of them.
3. **🔍 Check** → **✅ Compliance** → **⇔ Diff** to review fixes.
4. **⬆ Check in fixes**:
   - **Overleaf:** choose *Review copy* (sidecar, safe) or *Overwrite* (one-hop live).
   - **GitHub:** pushes to `compliance-fixes`; tick *Open a pull request* for a review gate.

### API (for scripting / integration)

| Route | Body | Returns |
|---|---|---|
| `GET /api/repo/status` | — | which remotes are configured |
| `POST /api/repo/checkout` | `{ target, projectUrl? }` | `{ file, branch, commit, latex }` |
| `POST /api/repo/checkin` | `{ target, latex, message, mode, openPr, projectUrl? }` | `{ file, branch, commit, note, pr? }` |

`target` = `"overleaf"` \| `"github"`; `mode` = `"sidecar"` \| `"overwrite"` (Overleaf only). `projectUrl` (Overleaf only, optional) targets a specific project by URL or ID; omit it to use the `.env` default. The account-level `olp_` token authenticates every project — only the ID selects which one.

---

## 6. Getting the Overleaf git token (Path A)

1. Sign in at **overleaf.com** and upgrade to a **Professional (Premium)** individual plan (the git bridge is off on Free).
2. **Account Settings → Git Integration → Generate token** → copy the `olp_…` token (shown once).
3. Open the project → **Menu → Git** → copy the clone URL `https://git.overleaf.com/<project-id>`.
4. Put both in `.env` as `OVERLEAF_PROJECT_URL` / `OVERLEAF_GIT_TOKEN`. The token is **account-level** — you set it once, then target any project by pasting its URL/ID in the Repo tab (the `.env` project is just the default).

*(GitHub sync alternative: in an Overleaf project, **Menu → Integrations → GitHub**. Note Overleaf can only create the repo from the project — you cannot attach an existing non-empty repo.)*

---

## 7. Taking it internal (BoC continuation)

- **Own the rules:** `boc-style-rules.yml` is the institutional style guide as code. Extend spelling, acronyms, required sections, and the disclaimer there — it's version-controlled and auditable.
- **Deployment path:** the app is a thin Express server + static front end. It deploys cleanly to Azure App Service; secrets belong in Key Vault / App settings, auth behind Entra ID.
- **Governance:** the GitHub PR path gives CRAF / SA&A / security review a natural approval gate before anything reaches a live Overleaf project.
- **Security notes:** tokens are env-only and redacted; `pdflatex` runs on server-supplied source, so sandbox the compile step (container / restricted shell) before production.

---

## 8. Next steps — engage a Microsoft CSA

This prototype proves the **approach**. To productionise it (hardening, Azure deployment, Entra ID auth, sandboxed compilation, LLM-assisted Layer-2 checks, and support model), the recommended path is to **engage a Microsoft Cloud Solution Architect (CSA)** through your Microsoft account team:

1. Raise the ask with your Microsoft account executive (this engagement's owner) to scope a CSA-led follow-on.
2. Provide this repo + `DESIGN.md` + `COMPLIANCE-AGENT-DESIGN.md` as the technical baseline.
3. Target outcomes: hosted test instance for Colin & Masoud, Azure reference architecture, security/governance sign-off pack, and a BoC-owned support runbook.

See `NEXT-STEPS.md` for the detailed engagement outline.
