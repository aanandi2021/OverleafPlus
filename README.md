# LaTeX Copilot

A web-based LaTeX document generator powered by AI. Describe what you want in natural language, get LaTeX code generated, and see it rendered live in the browser.

## Layout

Three-panel interface:
- **Chat** (left) — Describe your document in natural language
- **Editor** (center) — CodeMirror 6 with LaTeX syntax highlighting
- **Preview** (right) — Live rendering via latex.js

## Setup

```bash
npm install
npm start
```

Open http://localhost:5200

## Configuration

Create a `.env` file with your GitHub token:

```
GITHUB_TOKEN=your_github_pat_here
```

The token is used to call the GitHub Models API (gpt-4o) for LaTeX generation.

## Sample Prompts

- "Create a simple one-page resume for a software engineer"
- "Write a two-column paper about machine learning"
- "Create a mathematical proof of the Pythagorean theorem"
- "Create a table comparing 5 programming languages"
- "Write a letter to a university admissions office"

## Tech Stack

- **Frontend**: Vanilla JS, CodeMirror 6, latex.js
- **Backend**: Express.js (port 5200)
- **LLM**: GitHub Models API (gpt-4o)

## Overleaf / GitHub check-in — check-out

The **🔗 Repo** tab checks a LaTeX paper out of a synced repository, lets you run Bank of Canada
compliance fixes, and checks the corrected version back in — via **Overleaf's native git bridge** or a
**GitHub** review branch/PR.

See **[HANDOFF.md](HANDOFF.md)** for full setup, the two integration paths, the Overleaf token steps,
and BoC internal-continuation guidance. See **[NEXT-STEPS.md](NEXT-STEPS.md)** for the Microsoft CSA
engagement outline. Copy `.env.example` to `.env` and fill in tokens before starting.
