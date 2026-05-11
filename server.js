require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5200;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_PROMPT = `You are a LaTeX document generator. When the user describes a document, generate complete, compilable LaTeX code.

You have FULL LaTeX support — all packages are available (geometry, hyperref, graphicx, xcolor, fancyhdr, tikz, amsmath, booktabs, enumitem, beamer, etc.). Use whatever packages are appropriate.

Guidelines:
- Generate complete, compilable documents with \\documentclass, \\usepackage, \\begin{document}...\\end{document}
- Use modern LaTeX best practices (geometry for margins, hyperref for links, booktabs for tables)
- For presentations, use \\documentclass{beamer} with proper frames
- For math, use amsmath
- For bibliographies, use \\begin{thebibliography} (keep it self-contained, no external .bib files)
- Keep documents self-contained — no external image files
- For diagrams, use TikZ
- Make documents look professional and polished

Return your response in this format:
1. The complete LaTeX code inside a \`\`\`latex code fence
2. After the fence, a brief 1-2 sentence explanation of what you generated

For follow-up requests, output the COMPLETE updated document (not just the changed parts).`;

app.post('/api/generate', async (req, res) => {
  const { messages } = req.body;
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not configured in .env' });
  }

  const apiMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages
  ];

  try {
    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LLM API error:', response.status, errorText);
      return res.status(response.status).json({
        error: `LLM API error (${response.status})`,
        details: errorText
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Extract LaTeX from code fence
    const latexMatch = content.match(/```latex\s*\n([\s\S]*?)```/);
    const latex = latexMatch ? latexMatch[1].trim() : '';

    // Extract explanation (everything after the code fence)
    const explanation = content.replace(/```latex\s*\n[\s\S]*?```/, '').trim();

    res.json({ latex, explanation, raw: content });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Failed to call LLM', details: err.message });
  }
});

// ── Compile LaTeX to PDF (LOCAL via MiKTeX) ──
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');

app.post('/api/compile', async (req, res) => {
  const { latex } = req.body;
  if (!latex) return res.status(400).json({ error: 'No LaTeX source provided' });

  const id = crypto.randomBytes(8).toString('hex');
  const tmpDir = path.join('C:\\Users\\amitnandi\\latex-tmp', id);

  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    const texFile = path.join(tmpDir, 'document.tex');
    fs.writeFileSync(texFile, latex);

    console.log(`[compile] Local pdflatex on ${latex.length} chars...`);
    execSync(
      `pdflatex -interaction=nonstopmode -output-directory="${tmpDir}" "${texFile}"`,
      { timeout: 30000, stdio: 'pipe', env: { ...process.env, PATH: process.env.PATH } }
    );

    const pdfFile = path.join(tmpDir, 'document.pdf');
    if (!fs.existsSync(pdfFile)) {
      const log = fs.existsSync(path.join(tmpDir, 'document.log'))
        ? fs.readFileSync(path.join(tmpDir, 'document.log'), 'utf8').slice(-2000)
        : 'No log file';
      return res.status(400).json({ error: 'Compilation failed', log });
    }

    const pdf = fs.readFileSync(pdfFile);
    console.log(`[compile] PDF: ${pdf.length} bytes`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="output.pdf"');
    res.send(pdf);
  } catch (err) {
    const logFile = path.join(tmpDir, 'document.log');
    const log = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').slice(-2000) : err.message;
    // pdflatex returns non-zero even on warnings — check if PDF was created
    const pdfFile = path.join(tmpDir, 'document.pdf');
    if (fs.existsSync(pdfFile)) {
      const pdf = fs.readFileSync(pdfFile);
      console.log(`[compile] PDF with warnings: ${pdf.length} bytes`);
      res.setHeader('Content-Type', 'application/pdf');
      res.send(pdf);
    } else {
      console.error('[compile] Failed:', log.substring(0, 200));
      res.status(400).json({ error: 'Compilation failed', log });
    }
  } finally {
    // Cleanup after a delay
    setTimeout(() => { try { fs.rmSync(tmpDir, { recursive: true }); } catch {} }, 5000);
  }
});

// ── Compliance Checker ──
const { checkCompliance, applyFixes } = require('./compliance-checker');

app.post('/api/check-compliance', (req, res) => {
  const { latex } = req.body;
  if (!latex) return res.status(400).json({ error: 'No LaTeX source' });

  const rulesPath = path.join(__dirname, 'boc-style-rules.yml');
  if (!fs.existsSync(rulesPath)) {
    return res.status(500).json({ error: 'Style rules file not found' });
  }

  const results = checkCompliance(latex, rulesPath);
  res.json(results);
});

app.post('/api/apply-fixes', (req, res) => {
  const { latex } = req.body;
  if (!latex) return res.status(400).json({ error: 'No LaTeX source' });

  const rulesPath = path.join(__dirname, 'boc-style-rules.yml');
  const results = checkCompliance(latex, rulesPath);
  const fixed = applyFixes(latex, results.fixes);
  res.json({ latex: fixed, fixes: results.fixes });
});

app.listen(PORT, () => {
  console.log(`LaTeX Copilot server running at http://localhost:${PORT}`);
});
