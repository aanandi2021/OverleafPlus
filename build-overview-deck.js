// build-overview-deck.js — Customer-facing LaTeX Copilot presentation
const PptxGenJS = require('pptxgenjs');
const path = require('path');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = 'LaTeX Copilot - Prototype Overview';

const N='1a1a2e',B='0078d4',G='107c10',O='ff8c00',R='c4314b',GR='888888',W='ffffff',LG='f0f0f0',D='333333',P='6b4fa2',T='238b8e';
const t=(s,o)=>new PptxGenJS().addSlide; // unused, just for ref

// S1: Title
const s1=pptx.addSlide(); s1.background={color:N};
s1.addText('LaTeX Copilot',{x:0.8,y:1.2,w:11,h:1.2,fontSize:44,fontFace:'Segoe UI',bold:true,color:W});
s1.addText('AI-Powered Document Generation with Live Preview',{x:0.8,y:2.4,w:11,h:0.6,fontSize:20,fontFace:'Segoe UI',color:B});
s1.addText('Prototype Overview & Integration Options',{x:0.8,y:3.2,w:11,h:0.5,fontSize:16,fontFace:'Segoe UI',color:GR});
s1.addText('May 2026',{x:0.8,y:4.5,w:3,h:0.4,fontSize:14,fontFace:'Segoe UI',italic:true,color:GR});
s1.addShape(pptx.ShapeType.roundRect,{x:0.8,y:5.3,w:2.2,h:0.45,fill:{color:R},rectRadius:0.06});
s1.addText('PROTOTYPE',{x:0.8,y:5.3,w:2.2,h:0.45,fontSize:12,fontFace:'Segoe UI',bold:true,color:W,align:'center',valign:'middle'});
s1.addNotes(`SLIDE 1 — TITLE

Welcome everyone. Today I'm going to walk you through a prototype we've built called LaTeX Copilot.

KEY POINTS TO MAKE:
- This is a PROTOTYPE / proof of concept — not production software. We built it to explore the idea and validate the approach.
- The core idea is simple: describe the document you want in plain English, and AI generates professional LaTeX code that compiles to a real PDF.
- LaTeX is the gold standard for document formatting in academia, research, and technical writing — but it has a steep learning curve. This tool eliminates that barrier entirely.
- We'll cover what it does, how it's built, and most importantly — how it could integrate into your Teams environment for collaborative document creation.

CONTEXT:
- Built in May 2026 as an exploration of AI-powered document generation
- Uses GPT-4o (via GitHub Models) for natural language to LaTeX conversion
- Uses a cloud LaTeX compiler for real PDF output — full TeX Live, every package supported
- The prototype runs as a local web app, but the architecture is designed for easy deployment to Azure and Teams integration`);

// S2: What Is This
const s2=pptx.addSlide();
s2.addText('What Is LaTeX Copilot?',{x:0.5,y:0.3,w:12,h:0.6,fontSize:28,fontFace:'Segoe UI',bold:true,color:N});
s2.addText('Describe what you want in natural language. AI generates professional LaTeX. Real PDF rendered live.',{x:0.5,y:1.0,w:12,h:0.5,fontSize:15,fontFace:'Segoe UI',color:D});
const flow=[
  {icon:'Chat',title:'Describe',desc:'Natural language prompt',color:B},
  {icon:'AI',title:'Generate',desc:'GPT-4o produces LaTeX',color:G},
  {icon:'Build',title:'Compile',desc:'Full pdflatex in cloud',color:O},
  {icon:'PDF',title:'Preview',desc:'Real PDF inline',color:P},
];
flow.forEach((f,i)=>{
  const x=0.5+i*3.1;
  s2.addShape(pptx.ShapeType.roundRect,{x,y:1.8,w:2.8,h:2.8,fill:{color:W},line:{color:f.color,width:2},rectRadius:0.1});
  s2.addText(f.icon,{x,y:1.9,w:2.8,h:0.5,fontSize:16,fontFace:'Segoe UI',bold:true,color:f.color,align:'center'});
  s2.addText(f.title,{x:x+0.1,y:2.5,w:2.6,h:0.4,fontSize:18,fontFace:'Segoe UI',bold:true,color:f.color,align:'center'});
  s2.addText(f.desc,{x:x+0.15,y:3.0,w:2.5,h:1.2,fontSize:13,fontFace:'Segoe UI',color:D,align:'center',valign:'top'});
});
s2.addText('Conversational refinement: "Make it shorter" / "Add a TikZ diagram" / "Switch to IEEE format"',{x:0.5,y:5.0,w:12,h:0.4,fontSize:12,fontFace:'Segoe UI',italic:true,color:GR});
s2.addNotes(`SLIDE 2 — WHAT IS LATEX COPILOT?

WALK THROUGH THE 4-STEP FLOW:

1. DESCRIBE — You type in natural language what you want. "Create a two-column IEEE paper about climate change with an abstract, three sections, and a bibliography." That's it. No LaTeX knowledge needed.

2. GENERATE — GPT-4o takes your description and produces complete, compilable LaTeX code. Not a template — a full document with real content structure, proper package imports, formatting, everything. The AI understands LaTeX deeply — it knows when to use booktabs for tables, amsmath for equations, geometry for margins.

3. COMPILE — The LaTeX code is sent to a cloud compiler running full TeX Live (the complete LaTeX distribution). This means EVERY LaTeX package works — TikZ for diagrams, Beamer for presentations, biblatex for citations. No limitations. This is the same compiler that Overleaf uses under the hood.

4. PREVIEW — The compiled PDF is rendered inline in the browser. What you see is what you get — pixel-perfect, downloadable, print-ready.

THE KEY DIFFERENTIATOR: Conversational refinement. After the first generation, you can say things like:
- "Make the abstract shorter"
- "Add a comparison table in section 2"
- "Switch to IEEE two-column format"
- "Add a TikZ flowchart showing the methodology"

The AI maintains context from your previous messages, so each refinement builds on what came before. It's like having a LaTeX expert sitting next to you.

DEMO SUGGESTION: If we have time, I'd love to show you a live demo. Try asking for a document type relevant to your team.`);

// S3: Architecture
const s3=pptx.addSlide();
s3.addText('Architecture (Prototype)',{x:0.5,y:0.3,w:12,h:0.6,fontSize:28,fontFace:'Segoe UI',bold:true,color:N});
// Browser
s3.addShape(pptx.ShapeType.roundRect,{x:0.5,y:1.1,w:5.5,h:3.2,fill:{color:LG},line:{color:B,width:1.5},rectRadius:0.1});
s3.addText('Browser (Single Page App)',{x:0.7,y:1.2,w:5,h:0.35,fontSize:13,fontFace:'Segoe UI',bold:true,color:B});
['Chat Panel','LaTeX Editor (textarea)','PDF Preview (iframe)','Vanilla JS, no build step'].forEach((t,i)=>{
  s3.addText('  '+t,{x:1.0,y:1.7+i*0.55,w:4.5,h:0.45,fontSize:12,fontFace:'Segoe UI',color:i===3?GR:D,italic:i===3});
});
// Server
s3.addShape(pptx.ShapeType.roundRect,{x:6.5,y:1.1,w:6,h:1.3,fill:{color:W},line:{color:G,width:1.5},rectRadius:0.1});
s3.addText('Express.js (port 5200)',{x:6.7,y:1.15,w:5.5,h:0.3,fontSize:13,fontFace:'Segoe UI',bold:true,color:G});
s3.addText('POST /api/generate  (LLM proxy)\nPOST /api/compile    (LaTeX compiler proxy)',{x:6.7,y:1.5,w:5.5,h:0.7,fontSize:11,fontFace:'Segoe UI',color:D});
// LLM
s3.addShape(pptx.ShapeType.roundRect,{x:6.5,y:2.7,w:2.8,h:1.0,fill:{color:W},line:{color:O,width:1.5},rectRadius:0.1});
s3.addText('GitHub Models (GPT-4o)',{x:6.6,y:2.75,w:2.6,h:0.3,fontSize:11,fontFace:'Segoe UI',bold:true,color:O});
s3.addText('Natural language to LaTeX',{x:6.6,y:3.1,w:2.6,h:0.4,fontSize:10,fontFace:'Segoe UI',color:D});
// Compiler
s3.addShape(pptx.ShapeType.roundRect,{x:9.7,y:2.7,w:2.8,h:1.0,fill:{color:W},line:{color:P,width:1.5},rectRadius:0.1});
s3.addText('LaTeX.Online (cloud)',{x:9.8,y:2.75,w:2.6,h:0.3,fontSize:11,fontFace:'Segoe UI',bold:true,color:P});
s3.addText('Full TeX Live, real PDF',{x:9.8,y:3.1,w:2.6,h:0.4,fontSize:10,fontFace:'Segoe UI',color:D});
s3.addNotes(`SLIDE 3 — ARCHITECTURE (PROTOTYPE)

IMPORTANT: Emphasize this is a PROTOTYPE architecture. Simple by design — meant to prove the concept, not to be production infrastructure.

WALK THROUGH THE COMPONENTS:

BROWSER (left):
- Single page app — vanilla JavaScript, no React, no build step. Intentionally simple.
- Three panels: Chat (where you describe), Editor (where the LaTeX appears), Preview (where the PDF renders)
- The editor is a plain textarea with monospace font. In a production version, we'd use CodeMirror with LaTeX syntax highlighting, autocomplete, error gutters — all proven technology from the Overleaf open-source project.

EXPRESS SERVER (top right):
- Lightweight Node.js/Express server — about 90 lines of code total.
- Two endpoints:
  - POST /api/generate — takes the conversation history, sends it to GPT-4o, returns LaTeX code
  - POST /api/compile — takes LaTeX source, sends it to the cloud compiler, returns a PDF
- The server is just a PROXY — it doesn't do any heavy lifting itself. This makes it trivially deployable to Azure App Service, Azure Functions, or any container platform.

GITHUB MODELS / GPT-4o (bottom left):
- We use the GitHub Models inference API — free tier, no Azure subscription needed for prototyping
- GPT-4o is excellent at LaTeX generation — it understands document structure, packages, and formatting conventions
- In production, this would be Azure OpenAI Service for SLA guarantees, data residency, and enterprise security

LATEX.ONLINE (bottom right):
- Free cloud compilation service running full TeX Live
- Accepts LaTeX source via GET request, returns compiled PDF
- In production, we'd self-host this using Docker with the TeX Live image (about 4GB) for reliability and security
- Alternatively, the Overleaf Community Edition compiler component could be used — it's the same technology

SECURITY NOTE FOR PRODUCTION:
- Currently, LaTeX source is sent to external services. For sensitive documents, self-hosting both the LLM (Azure OpenAI) and the compiler (Docker) keeps everything within the organization's boundary.
- The architecture makes this swap trivial — just change the endpoint URLs in the server config.`);

// S4: Full LaTeX Support
const s4=pptx.addSlide();
s4.addText('Full LaTeX Support',{x:0.5,y:0.3,w:12,h:0.6,fontSize:28,fontFace:'Segoe UI',bold:true,color:N});
const caps=[
  {cat:'Document Types',color:B,items:['Academic papers (IEEE, ACM)','Beamer presentations','Letters & memos','Resumes & CVs','Reports & theses']},
  {cat:'Packages & Features',color:G,items:['geometry, hyperref, graphicx','TikZ diagrams & pgfplots','amsmath (full math)','booktabs (tables)','listings (code blocks)']},
  {cat:'Languages & Engines',color:O,items:['Multilingual support','fontspec + custom fonts','XeLaTeX / LuaLaTeX','Unicode, CJK, Arabic','Full TeX Live distribution']},
];
caps.forEach((c,i)=>{
  const x=0.5+i*4.2;
  s4.addShape(pptx.ShapeType.roundRect,{x,y:1.2,w:3.8,h:3.8,fill:{color:W},line:{color:c.color,width:1.5},rectRadius:0.1});
  s4.addText(c.cat,{x:x+0.15,y:1.3,w:3.5,h:0.4,fontSize:15,fontFace:'Segoe UI',bold:true,color:c.color});
  c.items.forEach((item,j)=>{s4.addText('  '+item,{x:x+0.2,y:1.8+j*0.5,w:3.4,h:0.45,fontSize:12,fontFace:'Segoe UI',color:D,valign:'top'});});
});
s4.addNotes(`SLIDE 4 — FULL LATEX SUPPORT

This is a critical point: because we use a real cloud-based pdflatex compiler (not a browser approximation), we have FULL LaTeX support. Every package in the TeX Live distribution is available.

DOCUMENT TYPES:
- Academic papers in any format — IEEE, ACM, Springer, Nature, custom journal styles. The AI knows these formats and generates the correct documentclass and package imports automatically.
- Beamer presentations — full slide decks with themes, transitions, overlays. Just say "Create a 10-slide presentation about X" and you get a complete .pdf slide deck.
- Letters, memos, reports, theses, books — every standard LaTeX document class is supported.
- Resumes and CVs — multiple professional styles. LaTeX resumes are considered the gold standard in tech and academia.

PACKAGES & FEATURES:
- TikZ — this is the big one. TikZ is LaTeX's diagramming language. You can say "Draw a flowchart of the software development lifecycle" and get a real vector diagram rendered in the PDF. pgfplots for data visualization, circuit diagrams, molecular structures — all supported.
- amsmath — the full American Mathematical Society package. Perfect mathematical typesetting. Try "Write the proof of the Pythagorean theorem" and see the difference vs. Word equation editor.
- booktabs for publication-quality tables, listings for code blocks, hyperref for clickable links.

LANGUAGES & ENGINES:
- Full Unicode support including CJK (Chinese, Japanese, Korean), Arabic, Cyrillic
- XeLaTeX and LuaLaTeX engines available for advanced font handling
- Custom fonts via fontspec — use any TrueType or OpenType font
- This is relevant for organizations with multilingual document requirements

WHY THIS MATTERS vs. Word/Google Docs:
- LaTeX produces typographically superior output — it was designed by a mathematician (Donald Knuth) specifically for beautiful document formatting
- Perfect mathematical notation — no comparison to equation editors
- Consistent formatting across hundreds of pages (theses, reports)
- Vector graphics via TikZ — infinitely scalable, no pixelation
- The AI removes the learning curve, which was the only barrier to adoption`);

// S5: Teams Integration Options
const s5=pptx.addSlide();
s5.addText('Integration Options for Microsoft Teams',{x:0.5,y:0.3,w:12,h:0.6,fontSize:28,fontFace:'Segoe UI',bold:true,color:N});
const opts=[
  {n:'1',title:'Copilot Studio Agent',effort:'~2 hours',color:G,rec:true,items:['Custom agent in Copilot Studio','Calls our existing API endpoints','Lives natively in Teams chat','Returns PDF as file card','Thread replies for refinement','Zero code changes needed']},
  {n:'2',title:'Teams Tab App',effort:'~1 day',color:B,rec:false,items:['Embed web app as Teams tab','Full three-panel experience','Teams SSO for auth','Documents in SharePoint','Pinnable to any channel','Familiar web UX']},
  {n:'3',title:'Bot + Adaptive Cards',effort:'~2-3 days',color:P,rec:false,items:['Bot Framework in Teams','Adaptive cards with preview','Edit/Refine/Download buttons','Collaborative refinement','Conversation history per doc','Richest Teams experience']},
];
opts.forEach((o,i)=>{
  const x=0.5+i*4.2;
  s5.addShape(pptx.ShapeType.roundRect,{x,y:1.0,w:3.8,h:4.8,fill:{color:W},line:{color:o.color,width:2},rectRadius:0.1});
  s5.addShape(pptx.ShapeType.ellipse,{x:x+0.15,y:1.1,w:0.5,h:0.5,fill:{color:o.color}});
  s5.addText(o.n,{x:x+0.15,y:1.1,w:0.5,h:0.5,fontSize:18,fontFace:'Segoe UI',bold:true,color:W,align:'center',valign:'middle'});
  s5.addText(o.title,{x:x+0.8,y:1.15,w:2.8,h:0.4,fontSize:14,fontFace:'Segoe UI',bold:true,color:o.color});
  s5.addText(o.effort,{x:x+0.8,y:1.55,w:1.2,h:0.25,fontSize:10,fontFace:'Segoe UI',color:GR});
  if(o.rec){s5.addText('RECOMMENDED',{x:x+2.1,y:1.55,w:1.5,h:0.25,fontSize:8,fontFace:'Segoe UI',bold:true,color:G});}
  o.items.forEach((item,j)=>{s5.addText('  '+item,{x:x+0.2,y:2.0+j*0.5,w:3.4,h:0.45,fontSize:11,fontFace:'Segoe UI',color:D,valign:'top'});});
});
s5.addNotes("SLIDE 5 -- TEAMS INTEGRATION OPTIONS\n\nThis is the 'so what' slide -- how does this get into the hands of your users?\n\nOPTION 1: COPILOT STUDIO AGENT (Recommended, ~2 hours)\n- Fastest path. Copilot Studio lets you create custom AI agents inside Teams.\n- Agent calls our two API endpoints (/api/generate and /api/compile).\n- User chats with agent in Teams: 'Create a project proposal for Q3' -> PDF posted as file card.\n- Refinement via thread replies. Zero code changes to our app.\n- Prerequisite: Copilot Studio license (included in M365 E3/E5) and API deployed to Azure.\n\nOPTION 2: TEAMS TAB APP (~1 day)\n- Embed web app as a tab in any Teams channel. Full three-panel experience inside Teams.\n- Uses Teams SSO. Documents stored in SharePoint.\n\nOPTION 3: BOT + ADAPTIVE CARDS (~2-3 days)\n- Most Teams-native. Rich adaptive cards with PDF thumbnails and action buttons.\n- Anyone in channel can click Refine. Full conversation history per document.\n\nRECOMMENDATION: Start with Option 1. Proves the concept in 2 hours. Upgrade later if team loves it.\n\nIMPORTANT: All options require API deployed to Azure (not localhost). About 30 min of work.");

// S6: Roadmap
const s6=pptx.addSlide();
s6.addText('Roadmap',{x:0.5,y:0.3,w:12,h:0.6,fontSize:28,fontFace:'Segoe UI',bold:true,color:N});
const phases=[
  {title:'Phase 1: Prototype',status:'COMPLETE',color:G,items:['Chat to LaTeX to PDF','GPT-4o generation','Cloud compilation','Three-panel web UI']},
  {title:'Phase 2: Polish',status:'NEXT',color:B,items:['Syntax highlighting editor','Template gallery','Download as .tex/.pdf','Error recovery via LLM']},
  {title:'Phase 3: Teams',status:'PLANNED',color:O,items:['Copilot Studio agent','Deploy API to Azure','Teams tab or cards','SharePoint storage']},
  {title:'Phase 4: Production',status:'FUTURE',color:P,items:['Self-hosted Docker compile','Multi-file projects','Zotero integration','Collaboration features']},
];
phases.forEach((p,i)=>{
  const x=0.3+i*3.15;
  s6.addShape(pptx.ShapeType.roundRect,{x,y:1.1,w:2.9,h:4.0,fill:{color:W},line:{color:p.color,width:1.5},rectRadius:0.1});
  s6.addText(p.title,{x:x+0.1,y:1.2,w:2.7,h:0.35,fontSize:12,fontFace:'Segoe UI',bold:true,color:p.color});
  s6.addShape(pptx.ShapeType.roundRect,{x:x+0.1,y:1.6,w:1.6,h:0.25,fill:{color:p.status==='COMPLETE'?G:LG},rectRadius:0.04});
  s6.addText(p.status,{x:x+0.1,y:1.6,w:1.6,h:0.25,fontSize:9,fontFace:'Segoe UI',bold:true,color:p.status==='COMPLETE'?W:GR,align:'center',valign:'middle'});
  p.items.forEach((item,j)=>{s6.addText('  '+item,{x:x+0.15,y:2.0+j*0.5,w:2.6,h:0.45,fontSize:11,fontFace:'Segoe UI',color:D,valign:'top'});});
});
s6.addNotes("SLIDE 6 -- ROADMAP\n\nPHASE 1: PROTOTYPE (COMPLETE)\n- This is what we have today. Chat-to-LaTeX-to-PDF pipeline works end to end.\n- GPT-4o generates high-quality LaTeX. Cloud compiler produces real PDFs.\n- Three-panel web UI: chat, editor, preview.\n- Validated the core concept -- AI can reliably generate compilable LaTeX from natural language.\n\nPHASE 2: POLISH (NEXT)\n- Syntax highlighting in the editor using CodeMirror 6 (same technology Overleaf uses).\n- Template gallery -- one-click starting points for common document types (IEEE paper, Beamer deck, resume, letter).\n- Download buttons for .tex source and compiled .pdf.\n- Error recovery -- if the LaTeX fails to compile, automatically send the error log back to the LLM and ask it to fix the code. Self-healing documents.\n\nPHASE 3: TEAMS INTEGRATION (PLANNED)\n- Deploy API to Azure App Service.\n- Set up Copilot Studio agent (Option 1 from previous slide).\n- Optionally build Teams tab for richer in-Teams experience.\n- SharePoint integration for document storage and sharing.\n\nPHASE 4: PRODUCTION (FUTURE)\n- Self-hosted Docker-based LaTeX compilation for security and reliability.\n- Multi-file projects (main.tex + chapters + bibliography + images).\n- Zotero/Mendeley integration for academic citation management.\n- Real-time collaboration features -- multiple users editing the same document. This is where Overleaf Community Edition (open source, AGPL-3.0) becomes relevant as a foundation.\n\nTIMELINE NOTE: Phases 1-2 are days of work. Phase 3 is about a week. Phase 4 is a larger investment that depends on the collaboration requirements.");

// S7: Use Cases
const s7=pptx.addSlide();
s7.addText('Use Cases',{x:0.5,y:0.3,w:12,h:0.6,fontSize:28,fontFace:'Segoe UI',bold:true,color:N});
const cases=[
  {title:'Academic Papers',desc:'IEEE, ACM, Springer from outlines',user:'Researchers'},
  {title:'Presentations',desc:'Beamer decks from bullet points',user:'Anyone presenting'},
  {title:'Technical Reports',desc:'Tables, equations, TikZ diagrams',user:'Engineers'},
  {title:'Resumes & CVs',desc:'Professional LaTeX from descriptions',user:'Job seekers'},
  {title:'Math & Proofs',desc:'Perfect mathematical notation',user:'Mathematicians'},
  {title:'Letters & Proposals',desc:'Formal docs, grant proposals',user:'Administrators'},
];
cases.forEach((c,i)=>{
  const col=i%3,row=Math.floor(i/3),x=0.5+col*4.2,y=1.0+row*2.4;
  s7.addShape(pptx.ShapeType.roundRect,{x,y,w:3.8,h:2.0,fill:{color:W},line:{color:B,width:1},rectRadius:0.08});
  s7.addText(c.title,{x:x+0.15,y:y+0.1,w:3.5,h:0.35,fontSize:14,fontFace:'Segoe UI',bold:true,color:N});
  s7.addText(c.desc,{x:x+0.15,y:y+0.5,w:3.5,h:0.6,fontSize:12,fontFace:'Segoe UI',color:D});
  s7.addText(c.user,{x:x+0.15,y:y+1.3,w:3.5,h:0.3,fontSize:10,fontFace:'Segoe UI',italic:true,color:GR});
});
s7.addNotes("SLIDE 7 -- USE CASES\n\nThese are the document types we've validated work well with the prototype. Each one has been tested.\n\nACADEMIC PAPERS:\n- IEEE, ACM, Springer format papers from a topic description\n- The AI structures sections, generates proper bibliography entries, handles two-column layout\n- Real example: 'Create an IEEE paper about transformer architectures' produces a compilable 4-page paper with abstract, introduction, methodology, results, references\n\nPRESENTATIONS:\n- Full Beamer slide decks with themes, section slides, bullet points, math\n- 'Create 10 slides about our Q3 results' produces a complete PDF presentation\n- Can specify Beamer themes: Madrid, Berlin, Warsaw, etc.\n\nTECHNICAL REPORTS:\n- Tables with proper formatting (booktabs), equations (amsmath), TikZ diagrams\n- Complex multi-section documents with table of contents, appendices\n\nRESUMES & CVs:\n- Multiple professional styles. LaTeX resumes are considered the gold standard in tech hiring.\n- 'Create a resume for a data scientist with 8 years experience' produces a polished, ATS-friendly PDF\n\nMATH & PROOFS:\n- Perfect mathematical typesetting -- LaTeX was literally invented for this\n- Proofs, theorem environments, equation arrays, matrices -- all rendered beautifully\n\nLETTERS & PROPOSALS:\n- Formal business letters, grant proposals, project plans\n- Proper letterhead, signature blocks, page numbering\n\nASK THE AUDIENCE: Which of these would be most valuable for your team? That helps us prioritize the template gallery in Phase 2.");

// S8: References (page 1)
const s8=pptx.addSlide();
s8.addText('References & Resources',{x:0.5,y:0.3,w:12,h:0.6,fontSize:28,fontFace:'Segoe UI',bold:true,color:N});
const refs=[
  ['LaTeX','The LaTeX Project','latex-project.org'],
  ['LaTeX','CTAN Comprehensive TeX Archive','ctan.org'],
  ['LaTeX','LaTeX Wikibook','en.wikibooks.org/wiki/LaTeX'],
  ['Overleaf','Community Edition (AGPL-3.0)','github.com/overleaf/overleaf'],
  ['Overleaf','Documentation & Tutorials','overleaf.com/learn'],
  ['Overleaf','OverleafCopilot Extension','overleafcopilot.com'],
  ['Overleaf','Extended CE (overleaf-cep)','github.com/yu-i-i/overleaf-cep'],
  ['Compile','LaTeX.Online Cloud API','latexonline.cc'],
  ['Compile','FormaTeX LaTeX to PDF','formatex.io'],
  ['Compile','TeX Live Distribution','tug.org/texlive'],
  ['AI','GitHub Models (GPT-4o)','github.com/marketplace/models'],
  ['AI','Azure OpenAI Service','azure.microsoft.com/openai-service'],
  ['AI','Microsoft Copilot Studio','microsoft.com/copilot-studio'],
  ['Teams','Teams App Platform','learn.microsoft.com/microsoftteams'],
  ['Teams','Copilot Studio + Teams','learn.microsoft.com/copilot-studio'],
  ['Teams','Bot Framework SDK','github.com/microsoft/botframework-sdk'],
  ['Teams','Adaptive Cards','adaptivecards.io'],
  ['Editor','CodeMirror 6','codemirror.net'],
  ['Editor','PDF.js (Mozilla)','mozilla.github.io/pdf.js'],
  ['Paper','OverleafCopilot (arxiv)','arxiv.org/html/2403.09733v1'],
  ['Guide','MCP + Copilot Studio','ariel-ibarra.medium.com'],
];
s8.addShape(pptx.ShapeType.rect,{x:0.5,y:0.95,w:12,h:0.3,fill:{color:N}});
s8.addText('Category',{x:0.6,y:0.95,w:1.3,h:0.3,fontSize:9,fontFace:'Segoe UI',bold:true,color:W,valign:'middle'});
s8.addText('Resource',{x:2.0,y:0.95,w:4.5,h:0.3,fontSize:9,fontFace:'Segoe UI',bold:true,color:W,valign:'middle'});
s8.addText('URL',{x:6.6,y:0.95,w:6,h:0.3,fontSize:9,fontFace:'Segoe UI',bold:true,color:W,valign:'middle'});
refs.forEach((r,i)=>{
  const y=1.3+i*0.24;
  const bg=i%2===0?W:LG;
  s8.addShape(pptx.ShapeType.rect,{x:0.5,y,w:12,h:0.24,fill:{color:bg}});
  s8.addText(r[0],{x:0.6,y,w:1.3,h:0.24,fontSize:8,fontFace:'Segoe UI',bold:true,color:N,valign:'middle'});
  s8.addText(r[1],{x:2.0,y,w:4.5,h:0.24,fontSize:8,fontFace:'Segoe UI',color:D,valign:'middle'});
  s8.addText(r[2],{x:6.6,y,w:6,h:0.24,fontSize:7.5,fontFace:'Segoe UI',color:B,valign:'middle'});
});
s8.addNotes("SLIDE 8 -- REFERENCES & RESOURCES\n\nThis slide provides all the references for the technologies discussed. Organized by category.\n\nLATEX REFERENCES:\n- The LaTeX Project (latex-project.org) -- official home of LaTeX\n- CTAN (ctan.org) -- the package repository, over 6,000 packages available\n- LaTeX Wikibook -- excellent free tutorial and reference\n\nOVERLEAF REFERENCES:\n- Overleaf Community Edition on GitHub -- the open source version (AGPL-3.0 license). This is the foundation we could build on for Phase 4 collaboration features.\n- OverleafCopilot -- an existing browser extension that adds AI to Overleaf. Academic paper on arxiv describes the approach. Our tool goes further by integrating the compiler and making it standalone.\n- overleaf-cep -- a community-extended version with LDAP, SAML, track changes. Shows what's possible with the CE codebase.\n\nCOMPILATION:\n- LaTeX.Online -- the free cloud API we use in the prototype. Good for demos, not suitable for production (no SLA, external service).\n- TeX Live -- the complete TeX distribution that runs inside the compiler. About 4GB, includes every package.\n\nAI/LLM:\n- GitHub Models -- free inference API we use for prototyping. GPT-4o model.\n- Azure OpenAI Service -- production path with SLA, data residency, enterprise security.\n- Copilot Studio -- the tool for building Teams agents (Option 1 integration).\n\nTEAMS:\n- Teams App Platform docs -- everything needed to build tabs, bots, and extensions.\n- Bot Framework SDK -- for Option 3 (adaptive cards bot).\n- Adaptive Cards designer -- visual tool for designing the card layouts.");

// S9: Next Steps
const s9=pptx.addSlide(); s9.background={color:N};
s9.addText('Next Steps',{x:0.8,y:0.8,w:11,h:0.8,fontSize:36,fontFace:'Segoe UI',bold:true,color:W});
const next=[
  {n:'1',t:'Try the prototype',d:'Describe any document, see it compiled to real PDF live'},
  {n:'2',t:'Identify priority use case',d:'Which document type saves the most time for your team?'},
  {n:'3',t:'Choose integration path',d:'Copilot Studio agent (fastest) or Teams tab (richest)?'},
  {n:'4',t:'Deploy to Azure',d:'Move from localhost to hosted, enables Teams integration'},
  {n:'5',t:'Pilot with a team',d:'Small group trial, gather feedback, iterate'},
];
next.forEach((n,i)=>{
  const y=2.0+i*0.85;
  s9.addShape(pptx.ShapeType.ellipse,{x:0.8,y:y+0.05,w:0.5,h:0.5,fill:{color:B}});
  s9.addText(n.n,{x:0.8,y:y+0.05,w:0.5,h:0.5,fontSize:18,fontFace:'Segoe UI',bold:true,color:W,align:'center',valign:'middle'});
  s9.addText(n.t,{x:1.5,y,w:10,h:0.35,fontSize:16,fontFace:'Segoe UI',bold:true,color:W});
  s9.addText(n.d,{x:1.5,y:y+0.35,w:10,h:0.3,fontSize:12,fontFace:'Segoe UI',color:GR});
});

const outPath = path.join(__dirname, 'LaTeX-Copilot-Overview.pptx');
pptx.writeFile({fileName:outPath}).then(()=>console.log('Created: '+outPath)).catch(e=>console.error(e));
