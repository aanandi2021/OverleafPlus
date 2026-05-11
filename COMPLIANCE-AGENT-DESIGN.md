# LaTeX Compliance Agent — Design Document

## The Real Problem

Bank of Canada researchers write papers in Overleaf. Before publication, those papers must comply with:

- **Institutional formatting** — BoC Staff Working Paper template, cover page, disclaimers
- **Canadian English** — "colour" not "color", "analyse" not "analyze", "centre" not "center"
- **BoC acronym standards** — first use expanded, consistent abbreviations (DSGE, NAIRU, CPI, etc.)
- **Writing style guide** — tone, voice, citation style, section structure conventions
- **Look and feel** — fonts, margins, headers/footers, figure/table numbering, branded elements

Today this is manual: a researcher finishes a draft in Overleaf, then an editor spends hours applying these rules. The rules are known, documented, and mechanical — perfect for an AI agent.

---

## The User Journey

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Researcher  │    │   Git Sync   │    │  Compliance  │    │  Researcher  │
│  writes in   │───▶│  Overleaf →  │───▶│  Agent runs  │───▶│  reviews in  │
│  Overleaf    │    │  GitHub repo │    │  on repo     │    │  web tool    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                               │                    │
                                               ▼                    ▼
                                        ┌──────────────┐    ┌──────────────┐
                                        │  Compiled    │    │  Push back   │
                                        │  PDF preview │    │  to Overleaf │
                                        │  with diffs  │    │  via git     │
                                        └──────────────┘    └──────────────┘
```

### Step by step:

1. **Researcher writes in Overleaf** — their natural environment, nothing changes
2. **Sync to GitHub** — Overleaf has native git sync (Premium) or the researcher pushes manually. The repo is the handoff point.
3. **Compliance Agent runs** — triggered by push (GitHub Action) or manually from the web tool. The agent:
   - Reads the LaTeX source
   - Loads the BoC style rules (a config file)
   - Identifies violations (Canadian English, acronyms, formatting, structure)
   - Applies fixes automatically where safe
   - Flags ambiguous cases for human review
   - Compiles to PDF with changes highlighted
4. **Researcher reviews in web tool** — sees the original vs. modified LaTeX side-by-side, compiled PDF with diff highlighting. Accepts/rejects each change.
5. **Push back to Overleaf** — accepted changes are committed to the git repo, which syncs back to Overleaf.

---

## What the Agent Does

### Layer 1: Deterministic Rules (no LLM needed)

These are regex/dictionary-based — fast, reliable, no API calls:

| Rule | Example | Implementation |
|------|---------|----------------|
| Canadian English spelling | color → colour, analyze → analyse, center → centre | Dictionary lookup (~200 words) |
| BoC acronyms | First use: "Dynamic Stochastic General Equilibrium (DSGE)" | Acronym registry + first-use tracker |
| Double spaces | "the  model" → "the model" | Regex |
| Oxford comma | "A, B and C" → "A, B, and C" | Regex (if BoC style requires it) |
| Quotation marks | "text" → ``text'' (LaTeX convention) | Regex |
| Figure/table numbering | \ref consistency | LaTeX parsing |
| Required sections | Check for Abstract, JEL codes, Disclaimer | Section scanner |
| Disclaimer text | Verify standard BoC disclaimer present | Template matching |

### Layer 2: LLM-Assisted (GPT-4o / Claude)

These need understanding of context:

| Rule | What the LLM does |
|------|-------------------|
| Tone & voice | Flag overly informal language, suggest academic alternatives |
| Passive voice | Identify and optionally convert (BoC may prefer passive in certain contexts) |
| Jargon consistency | Ensure terms are used consistently throughout ("interest rate" vs "policy rate") |
| Citation style | Check that citations follow BoC format |
| Abstract quality | Score abstract against BoC guidelines (length, structure, key elements) |
| Plain language check | Flag unnecessarily complex sentences |

### Layer 3: Structural Validation

| Check | What it does |
|-------|-------------|
| Template compliance | Verify document uses correct BoC documentclass/preamble |
| Metadata | Check title, author, date, JEL codes, keywords are present |
| Section order | Verify standard section ordering |
| Bibliography format | Check reference format consistency |
| Figure/table placement | Flag figures too far from their references |

---

## Architecture

### Option A: GitHub Action Agent (Simplest)

```yaml
# .github/workflows/compliance.yml
on: push
jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run BoC Compliance Agent
        run: node compliance-agent.js
      - name: Compile PDF
        run: pdflatex document.tex
      - name: Post results
        run: node post-results.js  # comment on PR or create issue
```

- Agent runs on every push
- Results posted as PR comment or GitHub Issue
- Researcher reviews in GitHub, merges to sync back to Overleaf
- **Pros:** Zero infrastructure, free, familiar workflow
- **Cons:** No real-time preview, requires GitHub familiarity

### Option B: Web Tool (What We've Built + More)

Build on our existing LaTeX Web App:

```
┌─────────────────────────────────────────────────────────────┐
│  LaTeX Compliance Workbench (browser)                        │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  Source   │  │  Compliance  │  │  PDF Preview       │    │
│  │  Editor   │  │  Panel       │  │  (with diff        │    │
│  │  (LaTeX)  │  │  ▸ 3 errors  │  │   highlighting)    │    │
│  │           │  │  ▸ 7 warnings│  │                    │    │
│  │  original │  │  ▸ 12 fixed  │  │  [Original] [Fixed]│    │
│  │  + diffs  │  │              │  │                    │    │
│  └──────────┘  │  [Accept All] │  └────────────────────┘    │
│                 │  [Review Each]│                             │
│                 └──────────────┘                             │
└──────────────────────────────────────────────────────────────┘
```

- Researcher pastes LaTeX or connects to GitHub repo
- Agent runs client-side (deterministic) + server-side (LLM)
- Side-by-side diff view: original vs. corrected
- PDF preview of both versions
- Accept/reject each change individually
- Export corrected LaTeX back to repo/Overleaf
- **Pros:** Rich UX, real-time, no git knowledge needed
- **Cons:** More to build

### Option C: Overleaf Plugin (Future — Best UX)

If Overleaf CE is self-hosted:

- Add a "Compliance Check" button to the Overleaf toolbar
- Agent runs server-side, results appear inline in the editor
- Changes shown as tracked changes (Overleaf CE supports this)
- Researcher accepts/rejects in their familiar environment
- **Pros:** Zero context switching, native experience
- **Cons:** Requires self-hosted Overleaf CE, AGPL implications

---

## What We've Already Built (Reusable)

| Component | Reuse for Compliance Agent |
|-----------|---------------------------|
| Express server (server.js) | Add `/api/check-compliance` endpoint |
| Local pdflatex (MiKTeX) | Compile original + corrected, generate diff PDF |
| LLM integration (GPT-4o) | Power Layer 2 (tone, style, jargon) |
| Three-panel web UI | Source / Compliance Panel / Preview layout |
| Chat interface | "What does this acronym mean?" / "Why was this flagged?" |

The existing LaTeX Web App becomes the **Compliance Workbench** with relatively minor additions.

---

## The Style Rules Config

The BoC-specific rules would live in a YAML config:

```yaml
# boc-style-rules.yml
institution: Bank of Canada
language: en-CA

spelling:
  # American → Canadian
  color: colour
  analyze: analyse
  center: centre
  defense: defence
  favor: favour
  honor: honour
  labor: labour
  modeling: modelling
  program: programme  # except "computer program"
  recognize: recognise

acronyms:
  DSGE: Dynamic Stochastic General Equilibrium
  NAIRU: Non-Accelerating Inflation Rate of Unemployment
  CPI: Consumer Price Index
  GDP: Gross Domestic Product
  BoC: Bank of Canada
  CBDC: Central Bank Digital Currency
  QE: Quantitative Easing
  MPR: Monetary Policy Report
  FSR: Financial System Review

required_sections:
  - Abstract
  - JEL Classification
  - Keywords
  - Disclaimer

disclaimer_text: |
  The views expressed in this paper are those of the authors
  and do not necessarily reflect those of the Bank of Canada.

template:
  documentclass: article  # or custom BoC class
  font: Times New Roman
  margins: "1in"
  line_spacing: 1.5
  
tone:
  formality: high
  voice: prefer_active  # or prefer_passive
  max_sentence_length: 40  # words
```

Any institution could create their own config. Universities, government agencies, journals — each has their own style rules.

---

## Prototype Plan

### Phase 1: Deterministic Checker (1-2 days)
- Build the spelling/acronym/structure checker
- Add to existing web tool as a "Check Compliance" button
- Show results in a panel: errors, warnings, auto-fixes
- Use the BoC style config YAML

### Phase 2: LLM-Assisted Checks (1 day)
- Add tone/style/jargon checks via GPT-4o
- Each LLM suggestion shows the reasoning
- Researcher can accept, reject, or ask "why?"

### Phase 3: Git Integration (1 day)
- Connect to a GitHub repo (OAuth or PAT)
- Pull LaTeX, run checks, push corrected version
- Create a PR with the changes for review

### Phase 4: Overleaf Sync (2 days)
- Overleaf git sync → GitHub → Agent → GitHub → Overleaf
- Or: direct Overleaf API (if available on their instance)

---

## Why This Matters

1. **Researcher time** — hours of manual compliance checking → minutes
2. **Consistency** — every paper follows the same rules, no human variation
3. **Onboarding** — new researchers don't need to learn the style guide
4. **Quality** — catches issues that humans miss (inconsistent acronyms, spelling drift)
5. **Scalable** — works for 5 papers or 500 papers per year
6. **Institutional** — the config file IS the institutional knowledge, version-controlled and auditable

The competitive insight: **Overleaf has no compliance/style checking.** Grammarly doesn't understand LaTeX. This is a genuine gap in the market, and BoC would be the proving ground.

---

*Document created: May 11, 2026*
*Based on customer feedback and prototype exploration*
