# System Specification: LaTeX Copilot — BoC Compliance Workbench

**Artifact type**: Reverse-engineered system specification (whole-repository)
**Repository**: `aanandi2021/OverleafPlus` (working tree: `boc-overleaf-copilot`)
**Version**: 3.0.0 (`package.json`)
**Created**: 2026-07-14
**Status**: Draft — grounded in the current implementation
**Method**: Reverse-engineered from source. Every requirement below cites the code, configuration, or document that evidences it, so the specification is defensible against the actual system rather than an aspiration.

> Scope note: This is the **system-level** specification. The Overleaf/GitHub round-trip
> feature has its own detailed spec at `specs/001-overleaf-github-roundtrip/spec.md`;
> this document subsumes and references it (see §4.5) rather than duplicating it.

---

## 1. Purpose & Context

Bank of Canada (BoC) researchers author papers in Overleaf. Before publication a paper must
comply with institutional rules that are **known, documented, and mechanical**: Canadian English
spelling, expanded acronyms on first use, required sections (Abstract, JEL Classification,
References), the standard disclaimer, and house typography (`COMPLIANCE-AGENT-DESIGN.md`).
Today an editor applies these by hand over hours.

**LaTeX Copilot** is an AI-first web tool that (a) drafts LaTeX from natural language, (b) runs a
**deterministic** BoC compliance check with one-click fixes, and (c) round-trips the corrected
document back to Overleaf or a governed GitHub review branch — keeping Overleaf as the authoring
surface while making the compliance step auditable and repeatable (`DESIGN.md`,
`COMPLIANCE-AGENT-DESIGN.md`).

### 1.1 Personas

- **Researcher / Author** — drafts and refines a paper; wants fast, low-friction correction.
- **Editor / Reviewer** — owns publication compliance; wants an auditable, reviewable change set.
- **Microsoft CSA (delivery)** — demonstrates the pattern and hands off a production path
  (`NEXT-STEPS.md`, `HANDOFF.md`).

---

## 2. Scope

### In scope (implemented)
- Conversational LaTeX generation via GitHub Models (gpt-4o) — `server.js` `/api/generate`.
- Editable LaTeX editor + live preview; local PDF compilation via `pdflatex` — `/api/compile`.
- Deterministic BoC compliance engine with auto-fixes — `compliance-checker.js`, `boc-style-rules.yml`.
- Dictionary-based misspelling detection with suggested one-click fixes (v3) — `compliance-checker.js` + `nspell`/`dictionary-en-ca`.
- Before/after diff review — `public/app.js`.
- Overleaf-native and GitHub round-trip (check-out → fix → check-in) — `repo-sync.js`, `/api/repo/*`.

### Out of scope (see §9)
Production auth/hosting, sandboxed compilation, multi-file project editing, in-browser merge
conflict resolution, and LLM-based subjective style reasoning beyond the deterministic rule set.

---

## 3. Architecture

Single-page browser client + Node/Express backend. No database; state is the editor buffer and
transient git clones.

```
Browser (public/index.html, app.js, style.css)
  ├─ Chat panel         → POST /api/generate     (AI draft)
  ├─ Editor (textarea)  → POST /api/compile       (PDF preview)
  ├─ Compliance tab     → POST /api/check-compliance, /api/apply-fixes
  ├─ Diff tab           → (client diff of before/after)
  └─ Repo tab           → GET /api/repo/status, POST /api/repo/checkout, /api/repo/checkin
        │
Express (server.js)
  ├─ GitHub Models proxy (gpt-4o)            [network]
  ├─ compliance-checker.js  (rules + spell)  [deterministic, offline]
  ├─ local pdflatex compile                  [local MiKTeX/TeX]
  └─ repo-sync.js  (git check-out / check-in)[git + optional gh CLI]
        │
Grounding / config
  └─ boc-style-rules.yml   (institution, spelling, acronyms, required_sections,
                            disclaimer_text, template, spellcheck)
```

### 3.1 Two-layer compliance model
- **Layer 1 — Deterministic rules** (implemented): mechanical, explainable, offline. Every finding
  traces to a rule in `boc-style-rules.yml`. This is the defensible core — it cannot hallucinate.
- **Layer 2 — Subjective reasoning** (out of scope): tone/clarity/jargon via LLM. Explicitly deferred
  (`specs/001-.../spec.md` Out of Scope) so the demo's correctness claims rest only on Layer 1.

---

## 4. Functional Requirements

Requirements use MUST/SHOULD/MAY. Evidence column cites the implementing code.

### 4.1 AI generation

| ID | Requirement | Evidence |
|----|-------------|----------|
| FR-G1 | The system MUST generate compilable LaTeX from a natural-language description via GitHub Models gpt-4o. | `server.js` `/api/generate`; `SYSTEM_PROMPT` |
| FR-G2 | The system MUST require `GITHUB_TOKEN`; absent, it MUST return a clear 500 error and not call the model. | `server.js` generate handler |
| FR-G3 | The system MUST extract the LaTeX body from the model reply, tolerating fence variants (```` ```latex ````, ```` ```tex ````, ```` ```LaTeX ````, bare ```` ``` ````) and MUST fall back to a raw `\documentclass … \end{document}` block. | `server.js` generate handler (hardened extractor) |
| FR-G4 | The system MUST return `{ latex, explanation, raw }` and MUST surface upstream model errors with status + details. | `server.js` generate handler |
| FR-G5 | The client MUST load returned LaTeX into the editor and trigger preview; on empty `latex` it MUST NOT clobber the editor. | `public/app.js` `sendMessage()` |
| FR-G6 | Chat MUST preserve conversation history so follow-up edits regenerate the whole document. | `public/app.js` `chatHistory` |

### 4.2 Editor, preview & compilation

| ID | Requirement | Evidence |
|----|-------------|----------|
| FR-E1 | The editor MUST be a dependency-free textarea (no CDN) so it works offline. | `public/app.js`, `public/index.html` |
| FR-E2 | The system MUST compile LaTeX to PDF locally via `pdflatex -interaction=nonstopmode` with a timeout. | `server.js` `/api/compile` |
| FR-E3 | Compilation MUST return the PDF when produced even if `pdflatex` exits non-zero on warnings; otherwise MUST return the tail of the `.log`. | `server.js` `/api/compile` catch/finally |
| FR-E4 | Compilation working files MUST be written to an isolated per-request temp dir and cleaned up. | `server.js` `/api/compile` (`crypto` id, cleanup) |
| FR-E5 | The UI MUST allow toggling Chat / Editor / Preview panels and pasting external LaTeX. | `public/index.html` tabs |

### 4.3 Deterministic compliance engine

| ID | Requirement | Evidence |
|----|-------------|----------|
| FR-C1 | The system MUST evaluate LaTeX against `boc-style-rules.yml` and return `{ errors, warnings, fixes, stats }`. | `compliance-checker.js` `checkCompliance`; `server.js` `/api/check-compliance` |
| FR-C2 | The system MUST flag American→Canadian spellings as auto-fixable, skipping LaTeX comment lines and not matching inside control sequences. | `compliance-checker.js` spelling block (`(?<!\\)\bword\b`) |
| FR-C3 | The system MUST warn when an acronym's first use is not expanded. | `compliance-checker.js` acronyms block |
| FR-C4 | The system MUST report missing `required_sections`, accepting equivalents (`abstract` env, `thebibliography`/`\bibliography`, any `JEL`). | `compliance-checker.js` required_sections block |
| FR-C5 | The system MUST warn when the standard disclaimer ("views expressed") is absent. | `compliance-checker.js` disclaimer block |
| FR-C6 | The system MUST offer whitespace (double-space) and typography (straight-quote → ``` ``…'' ```) fixes. | `compliance-checker.js` whitespace/smart-quote blocks |
| FR-C7 | `applyFixes` MUST apply spelling fixes globally and MUST preserve LaTeX indentation and control spaces (never collapse leading whitespace or post-backslash spaces). | `compliance-checker.js` `applyFixes` |

### 4.4 Dictionary spell-check (v3)

| ID | Requirement | Evidence |
|----|-------------|----------|
| FR-S1 | The system MUST detect misspellings against a Canadian-English Hunspell dictionary, controlled by `spellcheck.enabled` in the rules file. | `compliance-checker.js` misspelling block; `boc-style-rules.yml` `spellcheck` |
| FR-S2 | Spell-checking MUST be offline and deterministic (bundled `dictionary-en-ca`, loaded once and cached). | `compliance-checker.js` `getSpell()` |
| FR-S3 | If the dictionary fails to load, spell-checking MUST be skipped without failing the overall compliance run. | `compliance-checker.js` `getSpell()` try/catch |
| FR-S4 | The checker MUST strip LaTeX (comments, math, control sequences, and the arguments of `\label/\ref/\cite/\includegraphics/\usepackage/...`) before tokenizing prose. | `compliance-checker.js` `stripLatexForProse()` |
| FR-S5 | The checker MUST ignore ALL-CAPS acronyms, tokens with digits, words shorter than `min_length`, the `spellcheck.ignore` list, and words already covered by the Canadian-English rule (no double-flagging). | `compliance-checker.js` misspelling loop |
| FR-S6 | Each distinct misspelling MUST be reported once; when a suggestion exists it MUST be offered as an auto-fixable `fix` (top suggestion), else as a `warning`. | `compliance-checker.js` misspelling loop (`seen`, `fixes`/`warnings`) |
| FR-S7 | Applying a misspelling fix MUST preserve the original token's capitalization (`Seperate`→`Separate`) and MUST NOT touch text after a backslash. | `compliance-checker.js` `applyFixes` (`matchCase`, `(?<!\\)`); `public/app.js` accept handler |
| FR-S8 | The UI MUST render misspelling fixes in the accept/reject list and MUST include them in "Apply All Fixes". | `public/app.js` fix rendering + apply handler |

### 4.5 Overleaf / GitHub round-trip

Governed by the detailed feature spec `specs/001-overleaf-github-roundtrip/spec.md` (FR-001…FR-021).
Summary of binding requirements:

| ID | Requirement | Evidence |
|----|-------------|----------|
| FR-R1 | The system MUST support check-out and check-in against `overleaf` (native git bridge) and `github` (mirror) targets. | `repo-sync.js` `checkout`/`checkin`; `server.js` `/api/repo/*` |
| FR-R2 | On check-out the primary `.tex` MUST be selected as `main.tex` → first file with `\documentclass` → first `.tex`. | `repo-sync.js` `pickTexFile()` |
| FR-R3 | Overleaf check-in MUST push only to `main`; it MUST default to a non-destructive `<source>_compliance.tex` sidecar, with an explicit overwrite mode. | `repo-sync.js` `checkin` (overleaf branch) |
| FR-R4 | GitHub check-in MUST push to a `compliance-fixes` branch and SHOULD open a PR when requested (via `gh`). | `repo-sync.js` `checkin` (github branch), `openPr` |
| FR-R5 | Check-in MUST return a whitespace-insensitive change summary (changed/added/removed + samples). | `repo-sync.js` `summarizeChanges()` |
| FR-R6 | The status endpoint MUST report per-target configuration without leaking secrets. | `repo-sync.js` `status()` |

---

## 5. External Interfaces (API contract)

| Method & path | Request | Response | Notes |
|---------------|---------|----------|-------|
| `POST /api/generate` | `{ messages: [{role,content}] }` | `{ latex, explanation, raw }` or `{ error, details }` | Requires `GITHUB_TOKEN`. |
| `POST /api/compile` | `{ latex }` | `application/pdf` or `{ error, log }` | Local `pdflatex`. |
| `POST /api/check-compliance` | `{ latex }` | `{ errors[], warnings[], fixes[], stats }` | Deterministic; needs `boc-style-rules.yml`. |
| `POST /api/apply-fixes` | `{ latex }` | `{ latex, fixes }` | Applies spelling + misspelling + whitespace fixes. |
| `GET /api/repo/status` | — | `{ overleaf, github }` | Secrets redacted. |
| `POST /api/repo/checkout` | `{ target, projectUrl? }` | `{ target, file, branch, commit, remote, latex }` | |
| `POST /api/repo/checkin` | `{ target, latex, message?, mode?, openPr?, projectUrl? }` | `{ target, mode, file, branch, commit, remote, summary, note, pr? }` | |

**Finding object shapes** (`compliance-checker.js`):
- `error/warning`: `{ line, type, severity, message, context? }`
- `fix`: `{ line, type, severity, original, replacement, message, context }`
- `stats`: `{ totalChecks, errors, warnings, autoFixed }`

---

## 6. Configuration & Grounding

`boc-style-rules.yml` is the versioned rule set and the single source of compliance truth:

- `institution`, `language: en-CA`
- `spelling`: American→Canadian map (auto-fix)
- `acronyms`: acronym→expansion (first-use warning)
- `required_sections`: Abstract, JEL Classification, References
- `disclaimer_text`: the mandatory "views expressed…" statement
- `template`: documentclass / required packages / font size
- `spellcheck`: `enabled`, `min_length`, `max_suggestions`, `ignore[]` (v3)

Environment (`.env`, never committed — `.gitignore`; template in `.env.example`):
`GITHUB_TOKEN`, `OVERLEAF_PROJECT_URL`, `OVERLEAF_GIT_TOKEN`, `GITHUB_DEMO_REPO`,
`GITHUB_DEMO_TOKEN`, optional `REPO_WORKSPACE_DIR`.

---

## 7. Non-Functional Requirements

| ID | Category | Requirement | Evidence |
|----|----------|-------------|----------|
| NFR-1 | Security | Secrets MUST come only from env vars and MUST be redacted from all logs, responses, and errors. | `repo-sync.js` `redact()`, `git()` error path |
| NFR-2 | Security | Authenticated remote URLs MUST be stripped from stored git config after clone. | `repo-sync.js` `ensureClone()` `remote set-url` |
| NFR-3 | Security | Production MUST sandbox `pdflatex` (runs user-supplied source) — **known gap** in the prototype. | `server.js` `/api/compile`; `specs/001` NFR-002 |
| NFR-4 | Determinism | The compliance layer MUST NOT depend on network or an LLM; identical input yields identical findings. | `compliance-checker.js` (pure functions + local dict) |
| NFR-5 | Reliability | Check-out MUST hard-reset the local clone to the remote source of truth before reading. | `repo-sync.js` `ensureClone()` fetch/reset/clean |
| NFR-6 | Resilience | A spell-dictionary load failure MUST degrade gracefully, not break compliance. | `compliance-checker.js` `getSpell()` |
| NFR-7 | Portability | The prototype SHOULD run on Node 18+, git, and a local TeX distribution. | `package.json`; `README.md` |
| NFR-8 | Auditability | The GitHub path MUST provide a reviewable branch/PR gate. | `repo-sync.js` `checkin` github branch |

---

## 8. Key Entities

- **Compliance Rule Set** — `boc-style-rules.yml`; versioned grounding.
- **Compliance Result** — errors / warnings / fixes / stats.
- **Fix** — an auto-applicable correction (`original`→`replacement`) accepted/rejected individually or in bulk.
- **Repository Target** — `overleaf` (bridge, `main`-only) or `github` (mirror, branchable).
- **Check-in Mode** — `sidecar` | `overwrite` (Overleaf) or `branch`/PR (GitHub).
- **Review Artifact** — `_compliance.tex` sidecar or `compliance-fixes` branch/PR.

---

## 9. Out of Scope

Production authentication/authorization; hosted Azure reference deployment; sandboxed/containerized
LaTeX compilation; multi-file LaTeX projects (includes/bib/assets) beyond selecting one primary
`.tex`; in-browser merge-conflict resolution; self-hosted Overleaf CE; and LLM-based Layer-2 tone/
clarity/jargon reasoning (`specs/001-.../spec.md` Out of Scope; `COMPLIANCE-AGENT-DESIGN.md`).

---

## 10. Risks & Known Limitations

- **R1 — Unsandboxed compile**: `pdflatex` executes arbitrary user LaTeX locally (shell-escape/file
  access risk). Must be sandboxed before any multi-user deployment (NFR-3).
- **R2 — Suggestion quality**: spell suggestions are edit-distance ranked, so the top pick can be
  imperfect (e.g. `teh`→`ten`); mitigated by the human accept/reject gate and shown alternates.
- **R3 — Model availability / rate limits**: GitHub Models (free tier) can throttle under demo load;
  the deterministic compliance path is unaffected and remains fully functional offline.
- **R4 — Overleaf plan dependency**: native git bridge requires a paid Overleaf plan; GitHub mirror
  is the fallback governance path.
- **R5 — Single-file assumption**: only one primary `.tex` is round-tripped.

---

## 11. Traceability Summary

| Capability | Primary code | Config/tests |
|-----------|--------------|--------------|
| AI generation | `server.js` `/api/generate` | `GITHUB_TOKEN` |
| Compile/preview | `server.js` `/api/compile`, `public/app.js` | local TeX |
| Compliance engine | `compliance-checker.js` | `boc-style-rules.yml` |
| Spell-check (v3) | `compliance-checker.js`, `public/app.js` | `nspell`, `dictionary-en-ca`, `spellcheck.*` |
| Diff review | `public/app.js` | — |
| Round-trip | `repo-sync.js`, `server.js` `/api/repo/*` | `.env` targets; `specs/001` |
| Sanity checks | `sanity.test.js` (`@playwright/test`) | — |

---

## 12. Open Questions

Inherited from `specs/001-.../spec.md` plus system-level:
1. Standardize on Overleaf-native sidecar, GitHub PR, or both?
2. Should production check-in require explicit reviewer approval before push?
3. Should the misspelling dictionary carry a BoC domain word-list (governors, models, datasets)
   maintained by editors rather than developers?
4. Target hosting (Azure App Service / Container Apps) and the required security evidence pack?
5. Should compliance rules be editable by non-developers via an admin UI?
