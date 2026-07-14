// repo-sync.js
// Check-out / check-in LaTeX documents to/from a remote git repo.
// Two targets:
//   - "overleaf": Overleaf native git bridge (git.overleaf.com). Pushes to `main`
//                 ONLY (Overleaf rejects any other branch). Check-in can write a
//                 sidecar review file or overwrite the source file directly.
//   - "github":   A GitHub repo (Overleaf-synced mirror). Check-in pushes to a
//                 `compliance-fixes` branch and can open a PR for review.
//
// Secrets (OVERLEAF_GIT_TOKEN, GITHUB_TOKEN) come from .env and are NEVER written
// into .git/config or returned in responses — they are redacted from all output.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WORKSPACE_DIR = process.env.REPO_WORKSPACE_DIR || 'C:\\Users\\amitnandi\\overleaf-workspace';
const COMPLIANCE_BRANCH = 'compliance-fixes';

// ── helpers ────────────────────────────────────────────────────────────────

function redact(str) {
  let s = String(str == null ? '' : str);
  for (const t of [process.env.OVERLEAF_GIT_TOKEN, process.env.GITHUB_TOKEN, process.env.GITHUB_DEMO_TOKEN]) {
    if (t) s = s.split(t).join('***');
  }
  return s.replace(/olp_[A-Za-z0-9]+/g, 'olp_***').replace(/gh[ops]_[A-Za-z0-9]+/g, 'gh_***');
}

function git(cwd, args) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    }).trim();
  } catch (err) {
    const detail = redact((err.stderr || '') + (err.stdout || '') + (err.message || ''));
    const e = new Error(detail || 'git command failed');
    e.git = true;
    throw e;
  }
}

// Parse an Overleaf project reference (full git URL or a bare project ID) into a
// clean URL + project ID. The account-level olp_ token works for ANY project, so
// only the ID selects which project we target.
function parseOverleafProject(input) {
  const s = String(input == null ? '' : input).trim();
  if (!s) throw new Error('No Overleaf project URL or ID provided');
  let id;
  if (/overleaf\.com/i.test(s)) {
    const m = s.replace(/[#?].*$/, '').replace(/\/+$/, '').match(/([^/]+)$/);
    id = m ? m[1] : '';
  } else {
    id = s.replace(/^\/+|\/+$/g, '');
  }
  if (!/^[A-Za-z0-9]+$/.test(id)) {
    throw new Error(`Invalid Overleaf project ID: "${redact(s)}" — expected a project ID or git.overleaf.com URL`);
  }
  return { cleanUrl: `https://git.overleaf.com/${id}`, projectId: id };
}

// Resolve the target config: clean URL, authenticated URL, workspace dir, branch.
function resolveTarget(target, opts = {}) {
  if (target === 'overleaf') {
    const token = process.env.OVERLEAF_GIT_TOKEN;
    const raw = opts.projectUrl || process.env.OVERLEAF_PROJECT_URL;
    if (!token) throw new Error('Overleaf not configured — set OVERLEAF_GIT_TOKEN in .env');
    if (!raw) throw new Error('No Overleaf project — provide a project URL/ID or set OVERLEAF_PROJECT_URL in .env');
    const { cleanUrl: clean, projectId } = parseOverleafProject(raw);
    const authUrl = clean.replace('https://', `https://git:${token}@`);
    return {
      target, cleanUrl: clean, authUrl, projectId,
      branch: 'main',
      // Per-project clone dir so switching projects never clobbers another.
      dir: path.join(WORKSPACE_DIR, 'overleaf-projects', projectId),
      canBranch: false, // Overleaf git bridge only accepts pushes to main
    };
  }
  if (target === 'github') {
    const url = process.env.GITHUB_DEMO_REPO;
    const token = process.env.GITHUB_DEMO_TOKEN || process.env.GITHUB_TOKEN;
    if (!url) throw new Error('GitHub not configured — set GITHUB_DEMO_REPO in .env');
    if (!token) throw new Error('GITHUB_DEMO_TOKEN / GITHUB_TOKEN not set in .env');
    const clean = url.replace(/^https?:\/\/([^@/]+@)?/, 'https://').replace(/\.git$/, '') + '.git';
    const authUrl = clean.replace('https://', `https://${token}@`);
    return {
      target, cleanUrl: clean, authUrl,
      branch: 'main',
      dir: path.join(WORKSPACE_DIR, 'github'),
      canBranch: true,
    };
  }
  throw new Error(`Unknown target "${target}" (expected "overleaf" or "github")`);
}

// Clone if missing, otherwise fetch + hard-reset to the remote default branch.
function ensureClone(cfg) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  const isRepo = fs.existsSync(path.join(cfg.dir, '.git'));
  if (!isRepo) {
    if (fs.existsSync(cfg.dir)) fs.rmSync(cfg.dir, { recursive: true, force: true });
    git(WORKSPACE_DIR, ['clone', cfg.authUrl, cfg.dir]);
    // strip the token from stored config
    git(cfg.dir, ['remote', 'set-url', 'origin', cfg.cleanUrl]);
  } else {
    git(cfg.dir, ['remote', 'set-url', 'origin', cfg.cleanUrl]);
    git(cfg.dir, ['fetch', cfg.authUrl, cfg.branch]);
    git(cfg.dir, ['checkout', cfg.branch]);
    git(cfg.dir, ['reset', '--hard', 'FETCH_HEAD']);
    git(cfg.dir, ['clean', '-fd']);
  }
}

// Pick the primary .tex file: main.tex, else one containing \documentclass, else first .tex.
function pickTexFile(dir) {
  const texFiles = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.tex'));
  if (texFiles.length === 0) throw new Error('No .tex file found in repository');
  if (texFiles.includes('main.tex')) return 'main.tex';
  for (const f of texFiles) {
    const c = fs.readFileSync(path.join(dir, f), 'utf8');
    if (c.includes('\\documentclass')) return f;
  }
  return texFiles[0];
}

// True if there are staged changes to commit (git diff --cached exit 1 = changes).
function hasStagedChanges(dir) {
  try {
    execFileSync('git', ['diff', '--cached', '--quiet'], { cwd: dir, stdio: 'ignore' });
    return false; // exit 0 → no staged changes
  } catch {
    return true;  // exit 1 → staged changes present
  }
}

function currentCommit(dir) {
  return git(dir, ['log', '-1', '--pretty=%h %s']);
}

// Normalize to LF so check-ins don't show the whole file as changed (CRLF vs LF).
function normalizeEol(text) {
  let t = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!t.endsWith('\n')) t += '\n';
  return t;
}

// Line-level change summary between the checked-out source and the new content.
// Whitespace-only differences (e.g. indentation) are ignored so the summary shows
// genuine content changes. Returns { changedLines, added, removed, samples:[{from,to}] }.
function summarizeChanges(before, after) {
  const a = normalizeEol(before).split('\n');
  const b = normalizeEol(after).split('\n');
  const key = (s) => s.replace(/\s+/g, ' ').trim();
  const ka = a.map(key), kb = b.map(key);
  const n = ka.length, m = kb.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = ka[i] === kb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const removed = [], added = [];
  let i = 0, j = 0;
  const keep = (arr, s) => { if (s.trim()) arr.push(s.trim().slice(0, 100)); };
  while (i < n && j < m) {
    if (ka[i] === kb[j]) { i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { keep(removed, a[i]); i++; }
    else { keep(added, b[j]); j++; }
  }
  while (i < n) { keep(removed, a[i]); i++; }
  while (j < m) { keep(added, b[j]); j++; }
  const samples = [];
  for (let k = 0; k < Math.min(removed.length, added.length, 6); k++) {
    samples.push({ from: removed[k], to: added[k] });
  }
  return { changedLines: Math.max(removed.length, added.length), added: added.length, removed: removed.length, samples };
}

// ── public API ───────────────────────────────────────────────────────────────

// Check out the latest source from the remote.
//   opts.projectUrl – (overleaf) target a specific project URL/ID; else uses .env default
function checkout(target, opts = {}) {
  const cfg = resolveTarget(target, opts);
  ensureClone(cfg);
  const file = pickTexFile(cfg.dir);
  const latex = fs.readFileSync(path.join(cfg.dir, file), 'utf8');
  return {
    target,
    file,
    branch: cfg.branch,
    commit: currentCommit(cfg.dir),
    remote: cfg.cleanUrl,
    latex,
  };
}

// Check in corrected LaTeX.
//   opts.latex   – corrected source (required)
//   opts.message – commit message
//   opts.mode    – "sidecar" (default, safe review copy) | "overwrite"
//   opts.openPr  – github only: open a PR after pushing the branch
//   opts.projectUrl – (overleaf) target a specific project URL/ID; else .env default
function checkin(target, opts = {}) {
  const { latex, message, mode = 'sidecar', openPr = false } = opts;
  if (!latex) throw new Error('No LaTeX provided for check-in');
  const cfg = resolveTarget(target, opts);
  ensureClone(cfg);

  const sourceFile = pickTexFile(cfg.dir);
  const commitMsg = message || 'Apply Bank of Canada compliance fixes';
  const content = normalizeEol(latex);
  const before = fs.readFileSync(path.join(cfg.dir, sourceFile), 'utf8');
  const summary = summarizeChanges(before, content);

  git(cfg.dir, ['config', 'user.name', 'BoC Compliance Agent']);
  git(cfg.dir, ['config', 'user.email', 'compliance-agent@boc.local']);

  if (target === 'overleaf') {
    // Overleaf only accepts pushes to main. Default = non-destructive sidecar file.
    let targetFile;
    if (mode === 'overwrite') {
      targetFile = sourceFile;
    } else {
      targetFile = sourceFile.replace(/\.tex$/i, '') + '_compliance.tex';
    }
    fs.writeFileSync(path.join(cfg.dir, targetFile), content);
    git(cfg.dir, ['add', '-A']);
    if (!hasStagedChanges(cfg.dir)) {
      return {
        target, mode, file: targetFile, branch: 'main', summary,
        commit: currentCommit(cfg.dir), remote: cfg.cleanUrl, noChanges: true,
        note: `No changes to check in — ${targetFile} already matches the corrected source on main.`,
      };
    }
    git(cfg.dir, ['commit', '-m', commitMsg]);
    git(cfg.dir, ['push', cfg.authUrl, 'main:main']);
    return {
      target, mode, file: targetFile, branch: 'main', summary,
      commit: currentCommit(cfg.dir), remote: cfg.cleanUrl,
      note: mode === 'overwrite'
        ? `Overwrote ${sourceFile} on main — live in Overleaf now.`
        : `Wrote review copy ${targetFile} on main — open it beside ${sourceFile} in Overleaf to accept.`,
    };
  }

  // GitHub: push corrected source onto a review branch, optionally open a PR.
  fs.writeFileSync(path.join(cfg.dir, sourceFile), content);
  git(cfg.dir, ['checkout', '-B', COMPLIANCE_BRANCH]);
  git(cfg.dir, ['add', '-A']);
  if (!hasStagedChanges(cfg.dir)) {
    git(cfg.dir, ['checkout', cfg.defaultBranch || 'main']);
    return {
      target, mode: 'branch', file: sourceFile, branch: COMPLIANCE_BRANCH, summary,
      commit: currentCommit(cfg.dir), remote: cfg.cleanUrl, noChanges: true,
      note: `No changes to check in — ${sourceFile} already matches the corrected source.`,
    };
  }
  git(cfg.dir, ['commit', '-m', commitMsg]);
  git(cfg.dir, ['push', '--force', cfg.authUrl, `${COMPLIANCE_BRANCH}:${COMPLIANCE_BRANCH}`]);

  const result = {
    target, mode: 'branch', file: sourceFile, branch: COMPLIANCE_BRANCH, summary,
    commit: currentCommit(cfg.dir), remote: cfg.cleanUrl,
    note: `Pushed to branch ${COMPLIANCE_BRANCH} on GitHub.`,
  };

  if (openPr) {
    try {
      const slug = cfg.cleanUrl.replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '');
      const out = execFileSync('gh', [
        'pr', 'create', '--repo', slug, '--head', COMPLIANCE_BRANCH, '--base', cfg.branch,
        '--title', 'BoC compliance fixes', '--body', 'Automated Bank of Canada style/compliance corrections. Review and merge to sync back to Overleaf.',
      ], { encoding: 'utf8', env: { ...process.env, GH_TOKEN: process.env.GITHUB_DEMO_TOKEN || process.env.GITHUB_TOKEN } }).trim();
      result.pr = out;
      result.note += ' Opened PR: ' + out;
    } catch (err) {
      result.prError = redact((err.stderr || err.message || '').toString());
    }
  }
  return result;
}

function status() {
  const out = { overleaf: null, github: null };
  try {
    const cfg = resolveTarget('overleaf');
    out.overleaf = { configured: true, remote: cfg.cleanUrl, projectId: cfg.projectId,
      branch: 'main', canBranch: false, tokenScope: 'account (works for any project you can access)' };
  } catch (e) {
    // Token may be set even without a default project — surface that distinctly.
    const hasToken = !!process.env.OVERLEAF_GIT_TOKEN;
    out.overleaf = { configured: hasToken, needsProject: hasToken, reason: redact(e.message),
      tokenScope: 'account (works for any project you can access)' };
  }
  try {
    const cfg = resolveTarget('github');
    out.github = { configured: true, remote: cfg.cleanUrl, branch: 'main', canBranch: true };
  } catch (e) { out.github = { configured: false, reason: redact(e.message) }; }
  return out;
}

module.exports = { checkout, checkin, status, redact };
