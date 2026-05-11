# LaTeX Copilot — Design Document

## Vision

A web-based tool where users describe documents in natural language and get live-rendered LaTeX output. The core loop: **Describe → Generate → Preview → Refine**.

This is NOT a full Overleaf replacement. It's a **copilot for LaTeX** — an AI-first interface where the document structure and content are driven by conversation, with the LaTeX editor as a secondary (but editable) artifact.

---

## Architecture

### Phase 1: Client-Side Rendering (Current)

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (single page)                                       │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  Chat     │  │  CodeMirror  │  │  latex.js Preview  │    │
│  │  Panel    │  │  Editor      │  │  (HTML rendering)  │    │
│  │           │  │              │  │                    │    │
│  │  User     │──│  LaTeX code  │──│  Live rendered     │    │
│  │  prompts  │  │  (editable)  │  │  document          │    │
│  └──────────┘  └──────────────┘  └────────────────────┘    │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────────────┐                                       │
│  │  Express Server   │                                       │
│  │  (proxy to LLM)   │                                       │
│  │  POST /api/generate│                                      │
│  └────────┬─────────┘                                       │
│           │                                                  │
└───────────┼──────────────────────────────────────────────────┘
            │
            ▼
   GitHub Models API (GPT-4o)
```

**Strengths:**
- Zero infrastructure — runs in browser
- Instant preview — no compilation step
- Simple deployment — static files + thin API proxy

**Limitations:**
- latex.js supports ~70% of LaTeX — no TikZ, no BibTeX, no custom fonts
- No real PDF output — HTML approximation
- Not suitable for complex academic papers with specialized packages

### Phase 2: Server-Side Compilation (Future)

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  Chat     │  │  CodeMirror  │  │  PDF.js Viewer     │    │
│  │  Panel    │  │  Editor      │  │  (real PDF)        │    │
│  └──────────┘  └──────────────┘  └────────────────────┘    │
└───────────┬──────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────┐
│  Server                                                        │
│  ┌──────────────┐  ┌──────────────────────────────────────┐  │
│  │  Express API  │  │  LaTeX Compiler (Docker)              │  │
│  │               │  │  ┌─────────────────────────────────┐  │  │
│  │  /api/generate│  │  │  TeX Live 2025                   │  │  │
│  │  /api/compile │──│  │  pdflatex / xelatex / lualatex   │  │  │
│  │  /api/preview │  │  │  Full package support             │  │  │
│  │               │  │  │  Sandboxed execution              │  │  │
│  └──────────────┘  │  └─────────────────────────────────┘  │  │
│                     └──────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

**Strengths:**
- Full LaTeX support — every package, every class
- Real PDF output — pixel-perfect
- Production-grade — suitable for academic use

**New capabilities unlocked:**
- TikZ diagrams from natural language ("Draw a flowchart of the water cycle")
- BibTeX / Zotero integration ("Add citations from my Zotero library")
- Beamer presentations with actual PDF slides
- Multi-file projects (main.tex + chapters)

**Infrastructure needed:**
- Docker with TeX Live image (~4GB)
- File system for project management
- Queue for compilation jobs
- PDF storage + streaming

---

## Integration Angles

### 1. Standalone Web App (Phase 1 — NOW)
- What we're building. Browser-based, LLM-powered, instant preview.
- Demo-ready for showing the concept.

### 2. Copilot Studio Agent
- Build a custom Copilot agent that generates LaTeX
- Deployable in Teams — users chat with the agent, get LaTeX documents
- Agent could push to Overleaf via git integration
- **Best for:** Teams-first organizations, collaborative review workflows

### 3. VS Code Extension
- LaTeX generation sidebar in VS Code
- Works with the LaTeX Workshop extension (already popular)
- Uses GitHub Copilot's infrastructure
- **Best for:** Developers and power users already in VS Code

### 4. Overleaf Plugin / Fork
- Since Overleaf CE is open source (AGPL-3.0), we could:
  - Fork and add an AI sidebar (like OverleafCopilot but native)
  - Build an MCP server that gives Copilot access to Overleaf projects
  - Create a Teams integration that mirrors Overleaf activity
- **Best for:** Universities and research institutions already on Overleaf

### 5. Microsoft Teams Integration
- Bot in Teams that:
  - Accepts document descriptions
  - Generates LaTeX + PDF
  - Posts preview in the channel
  - Allows collaborative refinement via thread replies
- Could combine with Copilot Studio for richer interaction
- **Best for:** Non-technical users who want documents without touching LaTeX

---

## User Scenarios

### Scenario 1: Quick Document
> "I need a one-page project proposal for a grant application about urban heat islands"
- AI generates article-class LaTeX with title, abstract, sections, references
- User refines: "Add a budget table" → "Make the methodology section more detailed"
- Export as PDF

### Scenario 2: Academic Paper
> "Create an IEEE two-column paper about transformer architectures in NLP"
- Needs Phase 2 (server-side) for full IEEE class support
- AI generates structure, user fills in content iteratively
- BibTeX integration for citations

### Scenario 3: Presentation
> "Make a 10-slide Beamer presentation about the City of Ottawa's AI strategy"
- Beamer class with frames, bullet points, section slides
- Phase 1 can generate the LaTeX; Phase 2 needed for PDF preview

### Scenario 4: Resume / CV
> "Create a modern CV for a data scientist with 5 years of experience"
- Article class with custom formatting
- AI generates structure and placeholder content
- User fills in real details conversationally

---

## Technology Choices

| Component | Phase 1 | Phase 2 |
|-----------|---------|---------|
| Editor | CodeMirror 6 (CDN) | Same |
| Rendering | latex.js (client-side) | pdflatex in Docker + PDF.js |
| LLM | GPT-4o via GitHub Models | Same, or Azure OpenAI |
| Server | Express.js (thin proxy) | Express.js + compile queue |
| Storage | Browser localStorage | File system + DB |
| Auth | None | OAuth2 / Entra ID |
| Collaboration | None | Socket.io (like Overleaf) |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| latex.js package limitations | Can't render complex docs | Clear UI messaging; Phase 2 fallback |
| LLM generates invalid LaTeX | Preview fails | Error display + "Fix this" button that sends error back to LLM |
| Token limits for large docs | Truncation | Chunk updates; only send changed sections |
| Overleaf licensing (AGPL-3.0) | Fork obligations | Phase 1 is independent; evaluate AGPL for Phase 2 |

---

## Roadmap

1. **Phase 1 (this week):** Working prototype — chat → LaTeX → live preview
2. **Phase 1.5:** Add templates (resume, paper, letter, presentation), export as .tex file
3. **Phase 2:** Server-side compilation with Docker, real PDF output
4. **Phase 2.5:** Multi-file projects, BibTeX support, image uploads
5. **Phase 3:** Teams integration via Copilot Studio agent
6. **Phase 4:** Overleaf CE fork with native AI integration

---

*Document created: May 11, 2026*
