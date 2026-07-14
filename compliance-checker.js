// compliance-checker.js
// Analyzes LaTeX source against style rules
// Returns { errors: [], warnings: [], fixes: [], stats: {} }

const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

// ── Dictionary-backed spell engine (lazy, cached, offline) ──
// Loads the Canadian English Hunspell dictionary once. Degrades gracefully:
// if anything fails to load, spell-checking is skipped rather than breaking
// the whole compliance run (important for a live demo).
let _spell = null;
let _spellTried = false;
function getSpell() {
  if (_spellTried) return _spell;
  _spellTried = true;
  try {
    const nspell = require('nspell');
    const dir = path.join(__dirname, 'node_modules', 'dictionary-en-ca');
    const aff = fs.readFileSync(path.join(dir, 'index.aff'));
    const dic = fs.readFileSync(path.join(dir, 'index.dic'));
    _spell = nspell(aff, dic);
  } catch {
    _spell = null;
  }
  return _spell;
}

// Strip LaTeX so only human-readable prose remains for spell-checking.
// Removes comments, math, control sequences, and the arguments of commands
// whose contents are never prose (labels, refs, citations, files, packages).
function stripLatexForProse(line) {
  let s = line;
  s = s.replace(/(^|[^\\])%.*$/, '$1');                 // drop comment tail
  s = s.replace(/\\[&%$#_{}]/g, ' ');                   // escaped specials
  s = s.replace(/\$[^$]*\$/g, ' ');                     // inline $...$ math
  s = s.replace(/\\\([^)]*?\\\)/g, ' ');                // \(...\) math
  s = s.replace(/\\\[[^\]]*?\\\]/g, ' ');               // \[...\] math
  s = s.replace(
    /\\(?:label|ref|eqref|cref|Cref|autoref|pageref|cite[a-zA-Z]*|nocite|includegraphics|usepackage|documentclass|input|include|bibliography|bibliographystyle|url|texttt|verb|newcommand|renewcommand|def|setlength|geometry|hypersetup|color|textcolor|pagestyle|thispagestyle|bibitem)\s*(?:\[[^\]]*\])?(?:\{[^{}]*\})?/g,
    ' '
  );                                                    // commands whose args aren't prose
  s = s.replace(/\\[a-zA-Z@]+\*?/g, ' ');               // remaining control words
  s = s.replace(/\\[^a-zA-Z]/g, ' ');                   // control symbols
  s = s.replace(/[{}[\]]/g, ' ');                       // braces/brackets
  return s;
}

function checkCompliance(latexSource, rulesPath) {
  const rules = yaml.load(fs.readFileSync(rulesPath, 'utf8'));
  const results = {
    errors: [],    // must fix
    warnings: [],  // should fix
    fixes: [],     // auto-fixable { line, original, replacement, rule }
    stats: { totalChecks: 0, errors: 0, warnings: 0, autoFixed: 0 }
  };

  const lines = latexSource.split('\n');

  // --- Spelling (Canadian English) ---
  if (rules.spelling) {
    for (const [american, canadian] of Object.entries(rules.spelling)) {
      const regex = new RegExp(`(?<!\\\\)\\b${american}\\b`, 'gi');
      lines.forEach((line, i) => {
        if (line.trim().startsWith('%')) return;
        if (regex.test(line)) {
          results.fixes.push({
            line: i + 1,
            type: 'spelling',
            severity: 'warning',
            original: american,
            replacement: canadian,
            message: `Canadian English: "${american}" \u2192 "${canadian}"`,
            context: line.trim().substring(0, 80)
          });
          results.stats.autoFixed++;
        }
        regex.lastIndex = 0;
      });
    }
  }

  // --- Misspellings (dictionary-based, Canadian English) ---
  if (rules.spellcheck && rules.spellcheck.enabled) {
    const spell = getSpell();
    if (spell) {
      const cfg = rules.spellcheck;
      const minLen = cfg.min_length || 3;
      const maxSug = cfg.max_suggestions || 3;
      const ignore = new Set((cfg.ignore || []).map((w) => String(w).toLowerCase()));
      // Words already handled as Canadian-English auto-fixes — don't double-flag.
      const handled = new Set(Object.keys(rules.spelling || {}).map((w) => w.toLowerCase()));
      const seen = new Set();
      lines.forEach((line, i) => {
        if (line.trim().startsWith('%')) return;
        const prose = stripLatexForProse(line);
        const words = prose.match(/[A-Za-z][A-Za-z'\u2019-]*[A-Za-z]|[A-Za-z]/g) || [];
        for (const raw of words) {
          const word = raw.replace(/\u2019/g, "'");
          const lower = word.toLowerCase();
          if (word.length < minLen) continue;
          if (/\d/.test(word)) continue;
          if (/^[A-Z0-9]+$/.test(word)) continue;          // ALL-CAPS acronym
          if (ignore.has(lower) || handled.has(lower)) continue;
          if (seen.has(lower)) continue;                   // report each word once
          if (spell.correct(word) || spell.correct(lower)) continue;
          const cap = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          if (spell.correct(cap)) continue;                // sentence-start capitalisation
          seen.add(lower);
          const suggestions = spell.suggest(word).slice(0, maxSug);
          if (suggestions.length) {
            // Auto-fixable: offer the top suggestion (accept/reject in the UI).
            results.fixes.push({
              line: i + 1,
              type: 'misspelling',
              severity: 'warning',
              original: word,
              replacement: suggestions[0],
              message:
                `Possible misspelling: "${word}" \u2192 "${suggestions[0]}"` +
                (suggestions.length > 1
                  ? ` (also: ${suggestions.slice(1).map((s) => `"${s}"`).join(', ')})`
                  : ''),
              context: line.trim().substring(0, 80),
            });
            results.stats.autoFixed++;
          } else {
            // No confident suggestion — flag as a warning only.
            results.warnings.push({
              line: i + 1,
              type: 'misspelling',
              severity: 'warning',
              message: `Possible misspelling: "${word}" (no suggestion)`,
              context: line.trim().substring(0, 80),
            });
            results.stats.warnings++;
          }
        }
      });
    }
  }

  // --- Acronyms (first use must be expanded) ---
  if (rules.acronyms) {
    for (const [acronym, expansion] of Object.entries(rules.acronyms)) {
      const regex = new RegExp(`\\b${acronym}\\b`, 'g');
      let firstUseFound = false;
      lines.forEach((line, i) => {
        if (line.trim().startsWith('%')) return;
        const matches = line.match(regex);
        if (matches && !firstUseFound) {
          const expandedPattern = new RegExp(expansion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          if (!expandedPattern.test(line)) {
            const parenPattern = new RegExp(`\\(${acronym}\\)`, 'g');
            if (!parenPattern.test(line)) {
              results.warnings.push({
                line: i + 1,
                type: 'acronym',
                severity: 'warning',
                message: `First use of "${acronym}" should be expanded: "${expansion} (${acronym})"`,
                context: line.trim().substring(0, 80)
              });
              results.stats.warnings++;
            }
          }
          firstUseFound = true;
        }
      });
    }
  }

  // --- Required sections ---
  if (rules.required_sections) {
    for (const section of rules.required_sections) {
      const sectionRegex = new RegExp(`\\\\(?:section|begin)\\{${section.replace(/\s+/g, '\\s*')}`, 'i');
      const found = lines.some(line => sectionRegex.test(line));
      if (!found) {
        let altFound = false;
        if (section === 'Abstract') altFound = lines.some(l => /\\begin\{abstract\}/.test(l));
        if (section === 'References') altFound = lines.some(l => /\\begin\{thebibliography\}|\\bibliography\{/.test(l));
        if (section === 'JEL Classification') altFound = lines.some(l => /JEL|jel/i.test(l));

        if (!altFound) {
          results.errors.push({
            line: null,
            type: 'structure',
            severity: 'error',
            message: `Required section missing: "${section}"`,
          });
          results.stats.errors++;
        }
      }
    }
  }

  // --- Disclaimer ---
  if (rules.disclaimer_text) {
    const hasDisclaimer = latexSource.toLowerCase().includes('views expressed');
    if (!hasDisclaimer) {
      results.warnings.push({
        line: null,
        type: 'structure',
        severity: 'warning',
        message: 'Standard disclaimer not found. Add: "' + rules.disclaimer_text.substring(0, 60) + '..."',
      });
      results.stats.warnings++;
    }
  }

  // --- Double spaces ---
  lines.forEach((line, i) => {
    if (line.trim().startsWith('%')) return;
    if (/(?<!\\)  /.test(line) && !/\\\\/.test(line)) {
      results.fixes.push({
        line: i + 1,
        type: 'whitespace',
        severity: 'info',
        original: '  ',
        replacement: ' ',
        message: 'Double space detected',
        context: line.trim().substring(0, 80)
      });
      results.stats.autoFixed++;
    }
  });

  // --- Smart quotes ---
  lines.forEach((line, i) => {
    if (line.trim().startsWith('%')) return;
    if (/"[^"]*"/.test(line) && !/``|''/.test(line)) {
      results.fixes.push({
        line: i + 1,
        type: 'typography',
        severity: 'info',
        message: "Use LaTeX quotes: ``text'' instead of \"text\"",
        context: line.trim().substring(0, 80)
      });
      results.stats.autoFixed++;
    }
  });

  // --- Stats ---
  results.stats.totalChecks = results.errors.length + results.warnings.length + results.fixes.length;

  return results;
}

// Preserve the capitalisation of the original token when substituting.
function matchCase(src, tgt) {
  if (src === src.toUpperCase() && src !== src.toLowerCase()) return tgt.toUpperCase();
  if (src[0] === src[0].toUpperCase()) return tgt.charAt(0).toUpperCase() + tgt.slice(1);
  return tgt;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Apply auto-fixes to LaTeX source
function applyFixes(latexSource, fixes) {
  let result = latexSource;
  // Apply spelling fixes (Canadian English normalisation)
  const spellingFixes = fixes.filter(f => f.type === 'spelling');
  for (const fix of spellingFixes) {
    const regex = new RegExp(`(?<!\\\\)\\b${fix.original}\\b`, 'gi');
    result = result.replace(regex, fix.replacement);
  }
  // Apply misspelling fixes (dictionary suggestions), preserving capitalisation
  const misspellFixes = fixes.filter(f => f.type === 'misspelling' && f.original && f.replacement);
  for (const fix of misspellFixes) {
    const regex = new RegExp(`(?<!\\\\)\\b${escapeRegExp(fix.original)}\\b`, 'gi');
    result = result.replace(regex, (m) => matchCase(m, fix.replacement));
  }
  // Collapse multiple spaces *between words only* — never touch line-leading
  // indentation (preserves LaTeX structure) and never collapse after a
  // backslash (leaves escaped/control spaces intact).
  result = result.replace(/([^\s\\])  +/g, '$1 ');
  return result;
}

module.exports = { checkCompliance, applyFixes };
