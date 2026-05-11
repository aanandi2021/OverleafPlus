// ===== Editor — simple textarea (reliable, no CDN dependency) =====

// ===== State =====
let chatHistory = []; // { role, content } for LLM context
let editorTextarea = null;
let renderTimeout = null;

// ===== DOM elements =====
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const btnSend = document.getElementById('btn-send');
const btnRender = document.getElementById('btn-render');
const btnCopy = document.getElementById('btn-copy');
const btnNew = document.getElementById('btn-new');
const previewContainer = document.getElementById('preview-container');
const previewStatus = document.getElementById('preview-status');
const editorContainer = document.getElementById('editor-container');

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

// ===== Init =====
initEditor();
chatInput.focus();
