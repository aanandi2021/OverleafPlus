// build-boc-deck.js — Single BoC-facing deck: read-along overview + live-demo walkthrough.
// One deck the Bank of Canada can read on its own AND use to walk through the demo together.
const PptxGenJS = require('pptxgenjs');
const path = require('path');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = 'BoC LaTeX Compliance Workbench';

const N = '1a1a2e', B = '0078d4', G = '107c10', O = 'ff8c00', R = 'c4314b',
      GR = '888888', W = 'ffffff', LG = 'f0f0f0', D = '333333', P = '6b4fa2', T = '238b8e';

function header(s, title, kicker) {
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.05, fill: { color: N } });
  s.addText(title, { x: 0.5, y: 0.16, w: 12.3, h: 0.55, fontSize: 25, fontFace: 'Segoe UI', bold: true, color: W });
  if (kicker) s.addText(kicker, { x: 0.5, y: 0.68, w: 12.3, h: 0.3, fontSize: 13, fontFace: 'Segoe UI', color: B });
}
function bullets(s, items, x, y, w, h, fs) {
  s.addText(items.map((t) => ({ text: t, options: { bullet: { code: '2022' }, fontSize: fs || 15, color: D, paraSpaceAfter: 8 } })),
    { x, y, w, h, fontFace: 'Segoe UI', valign: 'top' });
}
function stepBadge(s, n, x, y, color) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w: 0.55, h: 0.55, fill: { color }, rectRadius: 0.27 });
  s.addText(String(n), { x, y, w: 0.55, h: 0.55, fontSize: 20, bold: true, color: W, align: 'center', valign: 'middle' });
}
// On-screen + say two-column layout used by the demo-step slides.
function demoStep(s, onLabel, onColor, onLines, sayText) {
  s.addText([
    { text: 'ON SCREEN\n', options: { bold: true, color: onColor, fontSize: 15 } },
    { text: onLines, options: { fontSize: 14, color: D } },
  ], { x: 0.5, y: 1.35, w: 6.1, h: 3.2, valign: 'top' });
  s.addShape(pptx.ShapeType.roundRect, { x: 6.9, y: 1.35, w: 5.9, h: 3.4, fill: { color: LG }, line: { color: onColor, width: 1.5 }, rectRadius: 0.08 });
  s.addText('SAY', { x: 7.1, y: 1.5, w: 5.5, h: 0.4, fontSize: 13, bold: true, color: onColor });
  s.addText(sayText, { x: 7.1, y: 1.95, w: 5.5, h: 2.6, fontSize: 15, color: D, valign: 'top' });
}

// ── S1: Title ──
const s1 = pptx.addSlide(); s1.background = { color: N };
s1.addText('LaTeX Compliance Workbench', { x: 0.8, y: 1.05, w: 11.7, h: 1.0, fontSize: 40, bold: true, color: W, fontFace: 'Segoe UI' });
s1.addText('Check-in / check-out between Overleaf and a Bank of Canada compliance agent', { x: 0.8, y: 2.2, w: 11.7, h: 0.7, fontSize: 19, color: B, fontFace: 'Segoe UI' });
s1.addText('Overview & live-demo walkthrough · Bank of Canada · July 2026', { x: 0.8, y: 3.1, w: 11.7, h: 0.5, fontSize: 15, color: GR, fontFace: 'Segoe UI' });
s1.addShape(pptx.ShapeType.roundRect, { x: 0.8, y: 4.15, w: 3.6, h: 0.5, fill: { color: R }, rectRadius: 0.06 });
s1.addText('PROTOTYPE + APPROACH', { x: 0.8, y: 4.15, w: 3.6, h: 0.5, fontSize: 12, bold: true, color: W, align: 'center', valign: 'middle' });
s1.addNotes('One deck for BoC: read it on its own, or use it to walk through the live demo together. Microsoft built a working prototype AND validated a development approach; BoC owns internal continuation, with a Microsoft CSA available to help productionise. Flow: problem → what we built → how it works → live demo → integration paths → governance → what BoC gets → next steps.');

// ── S2: The problem ──
const s2 = pptx.addSlide();
header(s2, 'The Problem', 'Compliance is manual, mechanical, and slow');
bullets(s2, [
  'BoC researchers write papers in Overleaf — their natural environment.',
  'Before publication, every paper must meet institutional standards: Canadian English, BoC acronyms, required sections, the standard disclaimer, formatting.',
  'Today an editor applies these rules by hand — hours per paper, and inconsistent across editors.',
  'The rules are known, documented, and mechanical — a perfect fit for automation.',
], 0.6, 1.4, 9.5, 3.5, 16);
s2.addShape(pptx.ShapeType.roundRect, { x: 10.4, y: 1.5, w: 2.5, h: 3.3, fill: { color: LG }, line: { color: O, width: 1.5 }, rectRadius: 0.1 });
s2.addText('Hours\n→\nMinutes', { x: 10.4, y: 2.4, w: 2.5, h: 1.5, fontSize: 26, bold: true, color: O, align: 'center' });
s2.addNotes('Frame the value in the researcher\'s and editor\'s time. The competitive insight: Overleaf has no compliance/style checking, and Grammarly doesn\'t understand LaTeX. Genuine gap.');

// ── S3: What we built ──
const s3 = pptx.addSlide();
header(s3, 'What We Built', 'A compliance workbench with a live Overleaf round-trip');
const built = [
  { t: 'Compliance engine', d: 'Canadian spelling, BoC acronyms, required sections, disclaimer — rules as a YAML config', c: O },
  { t: 'Live PDF preview', d: 'Local pdflatex renders the real document', c: P },
  { t: 'Side-by-side diff', d: 'Every fix shown; accept before it ships', c: T },
  { t: 'Check-in / check-out', d: 'Round-trip to Overleaf (native) or GitHub (PR)', c: G },
];
built.forEach((f, i) => {
  const x = 0.5 + (i % 2) * 6.4, y = 1.4 + Math.floor(i / 2) * 1.85;
  s3.addShape(pptx.ShapeType.roundRect, { x, y, w: 6.1, h: 1.65, fill: { color: W }, line: { color: f.c, width: 2 }, rectRadius: 0.08 });
  s3.addText(f.t, { x: x + 0.25, y: y + 0.15, w: 5.6, h: 0.4, fontSize: 17, bold: true, color: f.c });
  s3.addText(f.d, { x: x + 0.25, y: y + 0.65, w: 5.6, h: 0.9, fontSize: 13, color: D, valign: 'top' });
});
s3.addNotes('The compliance engine, preview, and diff already existed. The NEW capability delivered for this milestone is the check-in / check-out round-trip to Overleaf — the piece BoC asked for.');

// ── S4: How the round-trip works ──
const s4 = pptx.addSlide();
header(s4, 'How the Round-Trip Works', 'The researcher never leaves Overleaf');
const flow = [
  { t: 'Overleaf', d: 'Source of truth', c: T },
  { t: 'Check out', d: 'Pull main.tex', c: B },
  { t: 'Compliance', d: 'Fix + review diff', c: O },
  { t: 'Check in', d: 'Push corrected copy', c: G },
  { t: 'Overleaf', d: 'Appears live', c: T },
];
flow.forEach((f, i) => {
  const x = 0.5 + i * 2.55;
  s4.addShape(pptx.ShapeType.roundRect, { x, y: 2.0, w: 2.3, h: 2.2, fill: { color: W }, line: { color: f.c, width: 2 }, rectRadius: 0.1 });
  s4.addText(f.t, { x, y: 2.5, w: 2.3, h: 0.5, fontSize: 16, bold: true, color: f.c, align: 'center' });
  s4.addText(f.d, { x: x + 0.15, y: 3.05, w: 2.0, h: 0.9, fontSize: 12, color: D, align: 'center', valign: 'top' });
  if (i < flow.length - 1) s4.addText('▶', { x: x + 2.3, y: 2.85, w: 0.25, h: 0.5, fontSize: 16, color: GR, align: 'center' });
});
s4.addText('Compliance becomes a round-trip, not a new tool the researcher has to learn.', { x: 0.5, y: 4.6, w: 12.3, h: 0.5, fontSize: 14, italic: true, color: GR });
s4.addNotes('This is the core story. Emphasise the researcher\'s workflow is unchanged — they get a compliance-corrected copy back inside Overleaf.');

// ── S5: Live demo — the loop (walk through together) ──
const s5 = pptx.addSlide();
header(s5, 'Live Demo — Walk Through Together', 'Four clicks in the workbench · http://localhost:5200 → 🔗 Repo tab');
const loop = [
  { t: 'Check out', d: 'Pull main.tex live from Overleaf', c: B },
  { t: 'Check', d: 'Run BoC compliance rules', c: O },
  { t: 'Review', d: 'Side-by-side diff of fixes', c: P },
  { t: 'Check in', d: 'Push corrected copy back', c: G },
  { t: 'Live in Overleaf', d: 'Change appears instantly', c: T },
];
loop.forEach((f, i) => {
  const x = 0.5 + i * 2.55;
  s5.addShape(pptx.ShapeType.roundRect, { x, y: 2.0, w: 2.3, h: 2.4, fill: { color: W }, line: { color: f.c, width: 2 }, rectRadius: 0.1 });
  stepBadge(s5, i + 1, x + 0.9, 2.2, f.c);
  s5.addText(f.t, { x, y: 2.95, w: 2.3, h: 0.5, fontSize: 16, bold: true, color: f.c, align: 'center' });
  s5.addText(f.d, { x: x + 0.15, y: 3.45, w: 2.0, h: 0.9, fontSize: 12, color: D, align: 'center', valign: 'top' });
  if (i < loop.length - 1) s5.addText('▶', { x: x + 2.3, y: 2.9, w: 0.25, h: 0.5, fontSize: 16, color: GR, align: 'center' });
});
s5.addText('The next four slides walk each click, with what appears on screen and what to say.', { x: 0.5, y: 4.8, w: 12.3, h: 0.5, fontSize: 13, italic: true, color: GR });
s5.addNotes('Set expectations before clicking: "You\'ll watch a paper leave Overleaf, get compliance-corrected, and come back — without the researcher changing how they work." If short on time, do Step 1 + Step 4 only (check out → check in live); that is the whole story.');

// ── S6: Demo step 1 — Check out ──
const d1 = pptx.addSlide();
header(d1, 'Demo · Step 1 — Check out from Overleaf', 'Workbench → 🔗 Repo tab → Overleaf → ⬇ Check out');
demoStep(d1, 'ON', B,
  '• Repo tab, target = 📄 Overleaf (native git bridge)\n• Click ⬇ Check out\n• main.tex loads into the editor; live preview compiles the real PDF\n• Activity log: "Checked out main.tex @ <commit>"',
  '"This is a real Bank of Canada-style paper living in Overleaf. I click Check out and the workbench pulls the live source straight from Overleaf\'s own git — no copy-paste, no export."');
d1.addNotes('Click ⬇ Check out on the Overleaf target. While the PDF renders, note this is Overleaf\'s native git bridge (the mechanism Overleaf Premium exposes). Source of truth is untouched; we only pulled a copy.');

// ── S7: Demo step 2 — Compliance + diff ──
const d2 = pptx.addSlide();
header(d2, 'Demo · Step 2 — Run compliance & review the diff', 'Editor → 🔍 Check → ✅ Compliance → ⇔ Diff');
demoStep(d2, 'ON', O,
  '• Click 🔍 Check — rules run against the checked-out source\n• Compliance panel: Canadian spelling, acronyms, structure, disclaimer\n• Click ⇔ Diff — original vs. corrected, side by side\n• Auto-fixes applied; indentation and structure preserved',
  '"The rules are the institutional style guide, encoded once in a config file. Every fix is visible and reviewable — nothing is silent."');
d2.addNotes('Point at concrete fixes (e.g. "modeling → modelling"). Stress that the rules live in boc-style-rules.yml — BoC owns and edits that file; it IS the institutional knowledge, version-controlled and auditable. The fixer only touches content, not LaTeX indentation, so committed diffs stay clean.');

// ── S8: Demo step 3 — Check in, live ──
const d3 = pptx.addSlide();
header(d3, 'Demo · Step 3 — Check in → appears live in Overleaf', 'Repo tab → ⬆ Check in → switch to the Overleaf browser tab');
demoStep(d3, 'ON', G,
  '• Overleaf mode = "Review copy" (sidecar)\n• Click ⬆ Check in\n• Log + chat: "changes since checkout" summary\n• Switch to Overleaf → refresh files → main_compliance.tex is there',
  '"I check the fixes back in — and here they are, live in Overleaf, next to the original. The researcher opens the review copy, accepts what they want, and never left Overleaf."');
d3.addText('Why a sidecar file? Overleaf\'s git bridge only accepts pushes to main — so the review copy IS the safe review gate.', { x: 0.5, y: 4.85, w: 12.3, h: 0.45, fontSize: 12, italic: true, color: R });
d3.addNotes('THE MONEY MOMENT. After Check in, switch to the Overleaf browser tab and refresh so they SEE main_compliance.tex appear. The activity log and left chat panel show a whitespace-agnostic summary of exactly what changed. Explain the Overleaf-only-main constraint honestly — it\'s a real technical finding.');

// ── S9: Demo step 4 — GitHub PR path ──
const d4 = pptx.addSlide();
header(d4, 'Demo · Step 4 — The GitHub path (governance & review)', 'Repo tab → target = 🐙 GitHub → ⬆ Check in → PR opens');
demoStep(d4, 'ON', P,
  '• Switch target to 🐙 GitHub, "Open a pull request" checked\n• ⬆ Check in\n• Log: "Pushed to compliance-fixes · Opened PR"\n• Open the PR in GitHub — full reviewable diff',
  '"For teams that want a formal review gate, the same fixes go to a GitHub branch as a pull request — an audit trail your governance process can approve before it syncs back to Overleaf."');
d4.addNotes('This directly answers the BoC governance concern (CRAF, SA&A, security review). Two integration shapes: native Overleaf (fast, one-hop) and GitHub PR (reviewable, auditable). Same engine; the target is just config.');

// ── S10: Two integration paths ──
const s10 = pptx.addSlide();
header(s10, 'Two Integration Paths', 'Speed vs. governance — same engine, target is config');
s10.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.35, w: 6.0, h: 3.6, fill: { color: W }, line: { color: T, width: 2 }, rectRadius: 0.1 });
s10.addText('Path A — Overleaf native', { x: 0.75, y: 1.55, w: 5.5, h: 0.4, fontSize: 18, bold: true, color: T });
bullets(s10, [
  'Direct to Overleaf\'s git bridge (git.overleaf.com)',
  'One hop — appears live in Overleaf instantly',
  'Pushes to main only (Overleaf constraint)',
  'Review via a sidecar _compliance.tex file',
  'Best for: speed, fewest moving parts',
], 0.9, 2.05, 5.4, 2.8, 13);
s10.addShape(pptx.ShapeType.roundRect, { x: 6.8, y: 1.35, w: 6.0, h: 3.6, fill: { color: W }, line: { color: P, width: 2 }, rectRadius: 0.1 });
s10.addText('Path B — GitHub', { x: 7.05, y: 1.55, w: 5.5, h: 0.4, fontSize: 18, bold: true, color: P });
bullets(s10, [
  'To a GitHub repo (Overleaf-synced mirror)',
  'Pushes to a compliance-fixes branch + PR',
  'Full reviewable diff and audit trail',
  'Researcher pulls into Overleaf when approved',
  'Best for: governance, review, sign-off',
], 7.2, 2.05, 5.4, 2.8, 13);
s10.addNotes('Directly answers the governance concern. Native = fast; GitHub PR = auditable. BoC can use either or both. Note honestly: Overleaf\'s git bridge rejects non-main branches — a real technical finding that shaped Path A\'s sidecar design.');

// ── S11: Governance & security ──
const s11 = pptx.addSlide();
header(s11, 'Governance & Security', 'Built with BoC\'s deployment path in mind');
bullets(s11, [
  'Rules as code — boc-style-rules.yml IS the institutional style guide: version-controlled, auditable, BoC-owned.',
  'Review gate — the GitHub PR path gives CRAF / SA&A / security review a natural approval step before anything reaches a live project.',
  'Secrets — tokens are environment-only, never written into git config, and redacted from all logs and responses.',
  'Deployment — thin Express app; deploys to Azure App Service with Key Vault for secrets and Entra ID for auth.',
  'Hardening needed before production — sandbox the pdflatex compile step (runs on user-supplied source).',
], 0.6, 1.4, 12.1, 3.7, 15);
s11.addNotes('Speak to the BoC concerns raised: components, dependencies, upgrade/support model, CRAF approval. Be candid about what still needs hardening (sandboxed compilation, hosted instance).');

// ── S12: What BoC receives ──
const s12 = pptx.addSlide();
header(s12, 'What BoC Receives', 'Everything needed to run and continue internally');
bullets(s12, [
  'Working prototype — the full round-trip, demoed live against a real Overleaf project.',
  'Handoff repository — all source, with .env.example (no secrets) and .gitignore.',
  'Documentation — HANDOFF.md (setup, paths, API, token steps) and NEXT-STEPS.md (CSA engagement).',
  'The rules config — boc-style-rules.yml to extend with BoC\'s full style guide.',
  'This deck — read-along overview plus the live-demo walkthrough for internal sessions.',
], 0.6, 1.4, 12.1, 3.7, 15);
s12.addNotes('Reinforce: this is a transferable artifact, not a black box. BoC can clone, configure, run, and extend it today.');

// ── S13: Next steps ──
const s13 = pptx.addSlide(); s13.background = { color: N };
s13.addText('Next Steps', { x: 0.8, y: 0.7, w: 11.7, h: 0.7, fontSize: 30, bold: true, color: W });
const steps = [
  ['BoC — extend the rules', 'Fill out boc-style-rules.yml with the full style guide'],
  ['BoC — prepare environment', 'Subscription, Entra ID app, network path; confirm Overleaf Premium'],
  ['Microsoft — engage a CSA', 'Scope a follow-on: hosting, Azure reference architecture, security pack'],
  ['Together — hosted test instance', 'Stand up an instance for Colin & Masoud to evaluate'],
  ['Together — governance sign-off', 'CRAF, SA&A, security review, support runbook'],
];
steps.forEach((t, i) => {
  const y = 1.7 + i * 0.72;
  s13.addText('→', { x: 0.9, y, w: 0.5, h: 0.5, fontSize: 20, bold: true, color: B });
  s13.addText(t[0], { x: 1.5, y, w: 4.6, h: 0.5, fontSize: 16, bold: true, color: W, valign: 'middle' });
  s13.addText(t[1], { x: 6.2, y, w: 6.6, h: 0.5, fontSize: 13, color: LG, valign: 'middle' });
});
s13.addText('Engage your Microsoft account team to scope the CSA-led follow-on. See NEXT-STEPS.md.', { x: 0.9, y: 5.5, w: 11.5, h: 0.4, fontSize: 13, italic: true, color: B });
s13.addNotes('Close on ownership: BoC drives internal continuation; Microsoft\'s CSA provides productionisation support through the account team. Point to NEXT-STEPS.md for the detailed engagement outline.');

const out = path.join(__dirname, 'BoC-LaTeX-Compliance-Workbench.pptx');
pptx.writeFile({ fileName: out }).then(() => console.log('Wrote', out));
