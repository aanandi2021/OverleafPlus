// ===== Editor — simple textarea (reliable, no CDN dependency) =====

// ===== State =====
let chatHistory = []; // { role, content } for LLM context
let editorTextarea = null;
let renderTimeout = null;
let lastComplianceResults = null;
let originalLatex = '';  // snapshot before fixes
let correctedLatex = ''; // after fixes

// ===== DOM elements =====
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const btnSend = document.getElementById('btn-send');
const btnRender = document.getElementById('btn-render');
const btnCopy = document.getElementById('btn-copy');
const btnCheck = document.getElementById('btn-check');
const btnNew = document.getElementById('btn-new');
const previewContainer = document.getElementById('preview-container');
const previewStatus = document.getElementById('preview-status');
const editorContainer = document.getElementById('editor-container');
const compliancePanel = document.getElementById('compliance-panel');
const pasteArea = document.getElementById('paste-area');
const btnLoadPaste = document.getElementById('btn-load-paste');

// Panel toggle buttons
const toggleChat = document.getElementById('btn-toggle-chat');
const toggleEditor = document.getElementById('btn-toggle-editor');
const togglePreview = document.getElementById('btn-toggle-preview');

// ===== Editor Setup =====

function initEditor() {
  const startDoc = '% Your LaTeX document will appear here\n';
  editorTextarea = document.createElement('textarea');
  editorTextarea.className = 'editor-fallback';
  editorTextarea.value = startDoc;
  editorTextarea.spellcheck = false;
  editorTextarea.addEventListener('input', () => scheduleRender());
  editorContainer.appendChild(editorTextarea);
}

function getEditorContent() {
  return editorTextarea ? editorTextarea.value : '';
}

function setEditorContent(text) {
  if (editorTextarea) {
    editorTextarea.value = text;
  }
}

// ===== Rendering with latex.js =====
function scheduleRender() {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => renderPreview(), 3000); // 3s debounce for cloud compile
}

async function renderPreview() {
  const latex = getEditorContent().trim();
  if (!latex || latex === '% Your LaTeX document will appear here') {
    previewContainer.innerHTML = `
      <div class="preview-placeholder">
        <p>Your rendered document will appear here.</p>
        <p class="muted">Type a prompt in the chat or edit LaTeX directly.</p>
      </div>`;
    previewStatus.textContent = '';
    previewStatus.className = 'preview-status';
    return;
  }

  previewStatus.textContent = '⏳ Compiling...';
  previewStatus.className = 'preview-status';

  try {
    const res = await fetch('/api/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latex })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Compilation failed' }));
      previewContainer.innerHTML = `
        <div class="preview-error">
          <strong>⚠ Compilation Error</strong>
          <pre>${escapeHtml(err.log || err.error || 'Unknown error')}</pre>
        </div>`;
      previewStatus.textContent = '✗ Error';
      previewStatus.className = 'preview-status error';
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    previewContainer.innerHTML = `<iframe src="${url}" class="pdf-preview" title="PDF Preview"></iframe>`;
    previewStatus.textContent = '✓ Compiled';
    previewStatus.className = 'preview-status ok';
  } catch (err) {
    console.warn('Compile error:', err);
    previewContainer.innerHTML = `
      <div class="preview-error">
        <strong>⚠ Compile Error</strong>
        ${escapeHtml(err.message)}
      </div>`;
    previewStatus.textContent = '✗ Error';
    previewStatus.className = 'preview-status error';
  }
}

// ===== Chat =====
function addMessage(role, content) {
  const div = document.createElement('div');
  div.className = `message ${role}-message`;

  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = role === 'user' ? 'You' : 'Copilot';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = content;

  div.appendChild(label);
  div.appendChild(bubble);
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addLoadingMessage() {
  const div = document.createElement('div');
  div.className = 'message ai-message';
  div.id = 'loading-msg';

  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = 'Copilot';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = 'Generating<span class="loading-dots"></span>';

  div.appendChild(label);
  div.appendChild(bubble);
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeLoadingMessage() {
  const el = document.getElementById('loading-msg');
  if (el) el.remove();
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  // Show user message
  addMessage('user', text);
  chatInput.value = '';
  chatInput.style.height = 'auto';

  // Add to history
  chatHistory.push({ role: 'user', content: text });

  // Show loading
  addLoadingMessage();
  btnSend.disabled = true;

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory })
    });

    const data = await res.json();

    removeLoadingMessage();

    if (!res.ok) {
      addMessage('ai', `Error: ${data.error || 'Something went wrong'}`);
      return;
    }

    if (data.latex) {
      console.log('[app] Setting editor content, length:', data.latex.length);
      setEditorContent(data.latex);
      // Trigger immediate render
      clearTimeout(renderTimeout);
      renderPreview();
    } else {
      console.warn('[app] No latex field in response:', Object.keys(data));
    }

    const explanation = data.explanation || 'LaTeX document generated and loaded into the editor.';
    addMessage('ai', explanation);

    // Add AI response to history for context
    chatHistory.push({
      role: 'assistant',
      content: data.raw || `\`\`\`latex\n${data.latex}\n\`\`\`\n\n${explanation}`
    });

  } catch (err) {
    removeLoadingMessage();
    addMessage('ai', `Network error: ${err.message}. Is the server running?`);
  } finally {
    btnSend.disabled = false;
    chatInput.focus();
  }
}

// ===== Panel Toggles =====
function setupToggle(btn, panelId) {
  btn.addEventListener('click', () => {
    const panel = document.getElementById(panelId);
    panel.classList.toggle('hidden');
    btn.classList.toggle('active');
  });
}

// ===== Utility =====
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Escape a string for safe use inside a RegExp.
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Preserve the capitalisation of the matched token when substituting.
function matchCase(src, tgt) {
  if (src === src.toUpperCase() && src !== src.toLowerCase()) return tgt.toUpperCase();
  if (src[0] === src[0].toUpperCase()) return tgt.charAt(0).toUpperCase() + tgt.slice(1);
  return tgt;
}

// ===== Copy to clipboard =====
async function copyLatex() {
  const text = getEditorContent();
  try {
    await navigator.clipboard.writeText(text);
    btnCopy.textContent = '✓ Copied!';
    setTimeout(() => { btnCopy.textContent = '📋 Copy'; }, 2000);
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    btnCopy.textContent = '✓ Copied!';
    setTimeout(() => { btnCopy.textContent = '📋 Copy'; }, 2000);
  }
}

// ===== New Document =====
function newDocument() {
  chatHistory = [];
  chatMessages.innerHTML = `
    <div class="message system-message">
      <div class="message-bubble">
        Welcome! Describe the LaTeX document you'd like to create.
      </div>
    </div>`;
  setEditorContent('% Your LaTeX document will appear here\n');
  previewContainer.innerHTML = `
    <div class="preview-placeholder">
      <p>Your rendered document will appear here.</p>
      <p class="muted">Type a prompt in the chat or edit LaTeX directly.</p>
    </div>`;
  previewStatus.textContent = '';
  previewStatus.className = 'preview-status';
  chatInput.focus();
}

// ===== Event Listeners =====
btnSend.addEventListener('click', sendMessage);
btnRender.addEventListener('click', () => {
  clearTimeout(renderTimeout);
  renderPreview();
});
btnCopy.addEventListener('click', copyLatex);
btnNew.addEventListener('click', newDocument);
btnCheck.addEventListener('click', runComplianceCheck);

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});

setupToggle(toggleChat, 'panel-chat');
setupToggle(toggleEditor, 'panel-editor');
setupToggle(togglePreview, 'panel-preview');

// ===== Tab Switching =====
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
  });
});

// ===== Paste LaTeX =====
btnLoadPaste.addEventListener('click', () => {
  const pasted = pasteArea.value.trim();
  if (!pasted) return;
  setEditorContent(pasted);
  pasteArea.value = '';
  // Switch to editor tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-tab="editor"]').classList.add('active');
  document.getElementById('tab-editor').classList.add('active');
  // Compile
  clearTimeout(renderTimeout);
  renderPreview();
});

// ===== Compliance Check =====
async function runComplianceCheck() {
  const latex = getEditorContent().trim();
  if (!latex || latex === '% Your LaTeX document will appear here') {
    alert('No LaTeX to check. Write or paste a document first.');
    return;
  }

  // Switch to compliance tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-tab="compliance"]').classList.add('active');
  document.getElementById('tab-compliance').classList.add('active');

  compliancePanel.innerHTML = '<div class="compliance-loading">⏳ Checking compliance...</div>';

  try {
    const res = await fetch('/api/check-compliance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latex })
    });
    const data = await res.json();
    if (!res.ok) {
      compliancePanel.innerHTML = `<div class="compliance-error">Error: ${escapeHtml(data.error)}</div>`;
      return;
    }
    lastComplianceResults = data;
    renderComplianceResults(data);
  } catch (err) {
    compliancePanel.innerHTML = `<div class="compliance-error">Network error: ${escapeHtml(err.message)}</div>`;
  }
}

function renderComplianceResults(data) {
  const { errors, warnings, fixes, stats } = data;
  const total = errors.length + warnings.length + fixes.length;

  let html = `<div class="compliance-summary">
    <span class="summary-stat"><strong>${stats.totalChecks}</strong> issues found</span>
    <span class="summary-chip chip-error">${errors.length} errors</span>
    <span class="summary-chip chip-warning">${warnings.length} warnings</span>
    <span class="summary-chip chip-fix">${fixes.length} auto-fixable</span>`;
  if (fixes.length > 0) {
    html += `<button id="btn-apply-all" class="panel-btn primary apply-all-btn">✨ Apply All Fixes</button>`;
  }
  html += `</div><div class="compliance-items">`;

  if (total === 0) {
    html += '<div class="compliance-pass">✅ All checks passed! Document is compliant.</div>';
  }

  // Errors
  for (const item of errors) {
    html += `<div class="compliance-item item-error">
      <div class="item-header">
        <span class="item-badge badge-error">ERROR</span>
        <span class="item-type">${escapeHtml(item.type)}</span>
        ${item.line ? `<span class="item-line">Line ${item.line}</span>` : ''}
      </div>
      <div class="item-message">${escapeHtml(item.message)}</div>
      ${item.context ? `<div class="item-context"><code>${escapeHtml(item.context)}</code></div>` : ''}
    </div>`;
  }

  // Warnings
  for (const item of warnings) {
    html += `<div class="compliance-item item-warning">
      <div class="item-header">
        <span class="item-badge badge-warning">WARNING</span>
        <span class="item-type">${escapeHtml(item.type)}</span>
        ${item.line ? `<span class="item-line">Line ${item.line}</span>` : ''}
      </div>
      <div class="item-message">${escapeHtml(item.message)}</div>
      ${item.context ? `<div class="item-context"><code>${escapeHtml(item.context)}</code></div>` : ''}
    </div>`;
  }

  // Fixes
  for (let idx = 0; idx < fixes.length; idx++) {
    const item = fixes[idx];
    html += `<div class="compliance-item item-fix" id="fix-item-${idx}">
      <div class="item-header">
        <span class="item-badge badge-fix">FIX</span>
        <span class="item-type">${escapeHtml(item.type)}</span>
        ${item.line ? `<span class="item-line">Line ${item.line}</span>` : ''}
        <span class="item-actions">
          <button class="fix-btn fix-accept" data-idx="${idx}" title="Accept fix">✓</button>
          <button class="fix-btn fix-reject" data-idx="${idx}" title="Dismiss">✗</button>
        </span>
      </div>
      <div class="item-message">${escapeHtml(item.message)}</div>
      ${item.context ? `<div class="item-context"><code>${escapeHtml(item.context)}</code></div>` : ''}
    </div>`;
  }

  html += '</div>';
  compliancePanel.innerHTML = html;

  // Wire up Apply All Fixes
  const btnApplyAll = document.getElementById('btn-apply-all');
  if (btnApplyAll) {
    btnApplyAll.addEventListener('click', applyAllFixes);
  }

  // Wire up individual accept/reject
  compliancePanel.querySelectorAll('.fix-accept').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const fix = fixes[idx];
      if (fix && fix.original && fix.replacement && (fix.type === 'spelling' || fix.type === 'misspelling')) {
        let content = getEditorContent();
        const regex = new RegExp(`(?<!\\\\)\\b${escapeRegExp(fix.original)}\\b`, 'gi');
        content = fix.type === 'misspelling'
          ? content.replace(regex, (m) => matchCase(m, fix.replacement))
          : content.replace(regex, fix.replacement);
        setEditorContent(content);
        clearTimeout(renderTimeout);
        renderPreview();
      }
      const el = document.getElementById('fix-item-' + idx);
      if (el) el.classList.add('item-accepted');
    });
  });

  compliancePanel.querySelectorAll('.fix-reject').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const el = document.getElementById('fix-item-' + idx);
      if (el) el.classList.add('item-rejected');
    });
  });
}

async function applyAllFixes() {
  const latex = getEditorContent().trim();
  try {
    const res = await fetch('/api/apply-fixes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latex })
    });
    const data = await res.json();
    if (data.latex) {
      setEditorContent(data.latex);
      // Switch to editor tab and re-render
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.querySelector('[data-tab="editor"]').classList.add('active');
      document.getElementById('tab-editor').classList.add('active');
      clearTimeout(renderTimeout);
      renderPreview();
    }
  } catch (err) {
    alert('Failed to apply fixes: ' + err.message);
  }
}

// ===== Diff View =====
function computeDiff(before, after) {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const maxLen = Math.max(beforeLines.length, afterLines.length);
  const diff = [];
  for (let i = 0; i < maxLen; i++) {
    const bLine = beforeLines[i] || '';
    const aLine = afterLines[i] || '';
    if (bLine === aLine) {
      diff.push({ type: 'same', before: bLine, after: aLine, line: i + 1 });
    } else {
      diff.push({ type: 'changed', before: bLine, after: aLine, line: i + 1 });
    }
  }
  return diff;
}

function renderDiffView() {
  const diffBefore = document.getElementById('diff-before');
  const diffAfter = document.getElementById('diff-after');
  const placeholder = document.getElementById('diff-placeholder');

  if (!originalLatex || !correctedLatex) {
    // Generate the corrected version now
    originalLatex = getEditorContent();
    fetch('/api/apply-fixes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latex: originalLatex })
    }).then(r => r.json()).then(data => {
      correctedLatex = data.latex || originalLatex;
      showDiff();
    }).catch(() => {
      correctedLatex = originalLatex;
      showDiff();
    });
    return;
  }
  showDiff();

  function showDiff() {
    if (placeholder) placeholder.style.display = 'none';
    const diff = computeDiff(originalLatex, correctedLatex);
    const changedCount = diff.filter(d => d.type === 'changed').length;

    let beforeHtml = '';
    let afterHtml = '';
    for (const d of diff) {
      const ln = `<span class="diff-linenum">${String(d.line).padStart(4)}</span>`;
      if (d.type === 'same') {
        beforeHtml += `<div class="diff-line">${ln}${escapeHtml(d.before)}</div>`;
        afterHtml += `<div class="diff-line">${ln}${escapeHtml(d.after)}</div>`;
      } else {
        beforeHtml += `<div class="diff-line diff-removed">${ln}${escapeHtml(d.before)}</div>`;
        afterHtml += `<div class="diff-line diff-added">${ln}${escapeHtml(d.after)}</div>`;
      }
    }

    diffBefore.innerHTML = beforeHtml || '<div class="diff-line">No content</div>';
    diffAfter.innerHTML = afterHtml || '<div class="diff-line">No content</div>';

    // Sync scroll between panes
    diffBefore.onscroll = () => { diffAfter.scrollTop = diffBefore.scrollTop; };
    diffAfter.onscroll = () => { diffBefore.scrollTop = diffAfter.scrollTop; };
  }
}

// Wire up diff tab — render when clicked
document.querySelector('[data-tab="diff"]')?.addEventListener('click', () => {
  originalLatex = getEditorContent();
  correctedLatex = '';  // force re-fetch
  renderDiffView();
});

// Wire up Apply Changes button in diff view
document.getElementById('btn-apply-diff')?.addEventListener('click', () => {
  if (correctedLatex) {
    setEditorContent(correctedLatex);
    clearTimeout(renderTimeout);
    renderPreview();
    // Switch back to editor tab
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-tab="editor"]').classList.add('active');
    document.getElementById('tab-editor').classList.add('active');
  }
});

// ===== Init =====
initEditor();
chatInput.focus();

// ===== Repo: check-out / check-in (Overleaf native + GitHub) =====
let repoStatus = null;

function getRepoTarget() {
  const el = document.querySelector('input[name="repo-target"]:checked');
  return el ? el.value : 'overleaf';
}

function repoLog(msg, type) {
  const log = document.getElementById('repo-log');
  if (!log) return;
  if (log.querySelector('.muted')) log.innerHTML = '';
  const entry = document.createElement('div');
  entry.className = 'repo-log-entry' + (type ? ' ' + type : '');
  const time = new Date().toLocaleTimeString();
  entry.innerHTML = `<span class="repo-log-time">${time}</span> ${msg}`;
  log.prepend(entry);
}

// Mirror a repo event into the left-hand chat panel.
function addRepoMessage(html) {
  const div = document.createElement('div');
  div.className = 'message ai-message repo-chat-message';
  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = '🔗 Repo';
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = html;
  div.appendChild(label);
  div.appendChild(bubble);
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Render a change summary (from repo-sync) as HTML.
function formatSummary(summary) {
  if (!summary) return '';
  const n = summary.changedLines || 0;
  if (n === 0) return '<div class="repo-summary">No content changes — the checked-in file matches the source.</div>';
  let html = `<div class="repo-summary"><strong>${n} change${n === 1 ? '' : 's'} since checkout</strong>`;
  if (summary.samples && summary.samples.length) {
    html += '<ul class="repo-summary-list">';
    for (const s of summary.samples) {
      html += `<li><span class="repo-del">${escapeHtml(s.from)}</span> → <span class="repo-add">${escapeHtml(s.to)}</span></li>`;
    }
    html += '</ul>';
    if (n > summary.samples.length) html += `<span class="muted">…and ${n - summary.samples.length} more.</span>`;
  }
  html += '</div>';
  return html;
}

function getRepoProjectUrl() {
  const v = (document.getElementById('repo-project-url')?.value || '').trim();
  return v || undefined;
}

function updateRepoTargetUI() {
  const target = getRepoTarget();
  document.getElementById('repo-overleaf-opts').style.display = target === 'overleaf' ? '' : 'none';
  document.getElementById('repo-github-opts').style.display = target === 'github' ? '' : 'none';
  document.getElementById('repo-project-field').style.display = target === 'overleaf' ? '' : 'none';
  const remoteEl = document.getElementById('repo-remote');
  if (repoStatus && repoStatus[target]) {
    const s = repoStatus[target];
    remoteEl.textContent = s.configured ? s.remote : `Not configured — ${s.reason || ''}`;
    remoteEl.className = 'repo-remote ' + (s.configured ? 'ok' : 'error');
    // Prefill the Overleaf project field placeholder with the .env default.
    if (target === 'overleaf') {
      const inp = document.getElementById('repo-project-url');
      if (inp && s.projectId) inp.placeholder = `default: ${s.projectId} (from .env) — or paste another project URL/ID`;
    }
  } else {
    remoteEl.textContent = '—';
    remoteEl.className = 'repo-remote muted';
  }
}

async function loadRepoStatus() {
  try {
    const res = await fetch('/api/repo/status');
    repoStatus = await res.json();
  } catch (e) {
    repoStatus = null;
  }
  updateRepoTargetUI();
}

document.querySelectorAll('input[name="repo-target"]').forEach((r) =>
  r.addEventListener('change', updateRepoTargetUI)
);

document.getElementById('btn-repo-checkout')?.addEventListener('click', async () => {
  const target = getRepoTarget();
  const btn = document.getElementById('btn-repo-checkout');
  btn.disabled = true;
  repoLog(`⬇ Checking out from <strong>${target}</strong>…`);
  try {
    const res = await fetch('/api/repo/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, projectUrl: getRepoProjectUrl() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Checkout failed');
    setEditorContent(data.latex);
    originalLatex = data.latex;
    repoLog(`✅ Checked out <code>${data.file}</code> @ <code>${data.commit}</code> (${data.latex.length} chars)`, 'ok');
    addRepoMessage(`⬇ <strong>Checked out</strong> <code>${data.file}</code> from <strong>${target}</strong> @ <code>${data.commit}</code>.<br>Run <strong>🔍 Check</strong>, apply fixes, then <strong>⬆ Check in</strong> to complete the round-trip.`);
    // jump to editor + render
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    document.querySelector('[data-tab="editor"]').classList.add('active');
    document.getElementById('tab-editor').classList.add('active');
    clearTimeout(renderTimeout);
    renderPreview();
  } catch (e) {
    repoLog(`❌ ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('btn-repo-checkin')?.addEventListener('click', async () => {
  const target = getRepoTarget();
  const latex = getEditorContent().trim();
  if (!latex || latex === '% Your LaTeX document will appear here') {
    repoLog('❌ Nothing to check in — the editor is empty.', 'error');
    return;
  }
  const message = document.getElementById('repo-message').value.trim();
  const mode = (document.querySelector('input[name="repo-mode"]:checked') || {}).value || 'sidecar';
  const openPr = document.getElementById('repo-open-pr')?.checked;
  const btn = document.getElementById('btn-repo-checkin');
  btn.disabled = true;
  repoLog(`⬆ Checking in to <strong>${target}</strong>…`);
  try {
    const res = await fetch('/api/repo/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, latex, message, mode, openPr, projectUrl: getRepoProjectUrl() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Check-in failed');
    const summaryHtml = formatSummary(data.summary);
    repoLog(`✅ ${data.note || 'Checked in.'} (<code>${data.file}</code> → <code>${data.branch}</code> @ <code>${data.commit}</code>)`, 'ok');
    if (summaryHtml) repoLog(summaryHtml, 'ok');
    if (data.pr) repoLog(`🔗 PR: <a href="${data.pr}" target="_blank">${data.pr}</a>`, 'ok');
    if (data.prError) repoLog(`⚠ PR not opened: ${data.prError}`, 'warn');
    // Mirror the round-trip result into the chat
    let chat = `⬆ <strong>Checked in</strong> to <strong>${target}</strong> — <code>${data.file}</code> on <code>${data.branch}</code> @ <code>${data.commit}</code>.<br>${data.note || ''}`;
    chat += summaryHtml;
    if (data.pr) chat += `<br>🔗 <a href="${data.pr}" target="_blank">View pull request diff</a>`;
    addRepoMessage(chat);
  } catch (e) {
    repoLog(`❌ ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
  }
});

loadRepoStatus();
